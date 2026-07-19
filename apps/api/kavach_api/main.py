import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from kavach_config.settings import get_settings
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

from kavach_api.database import init_db, get_engine

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    settings = get_settings()
    logger.info("kavach_api.startup", version="0.1.0", db_url=settings.effective_database_url)
    init_db()
    
    from kavach_api.events.bus import bus
    from kavach_api.events.handlers import register_all_handlers
    register_all_handlers()
    bus.start_polling()
    
    yield
    
    bus.stop_polling()
    logger.info("kavach_api.shutdown")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Kavach AI API",
        description=(
            "Multi-source digital public-safety intelligence for detecting scam coercion, "
            "screening suspect currency, linking fraud networks, and coordinating geospatial response."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS (Strict for Prototype)
    origins = settings.cors_origins.split(",") if settings.cors_origins else ["http://localhost:3000"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Rate Limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Secure Headers & Payload Limits Middleware
    @app.middleware("http")
    async def secure_headers_middleware(request: Request, call_next):
        # Optional: Add simple request size check here if needed (FastAPI normally handles via limits)
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

    # Request ID and Correlation Logger Middleware
    @app.middleware("http")
    async def add_request_id_and_latency(request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.monotonic()

        response = await call_next(request)

        duration_ms = (time.monotonic() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Duration-MS"] = f"{duration_ms:.2f}"
        return response

    # Global Exception Handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_exception", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": str(exc),
                "request_id": getattr(request.state, "request_id", "unknown"),
            },
        )

    # Include Routes
    from kavach_api.routes import audit, cases, counterfeit, dev, health, intelligence, ops, sessions, privacy

    app.include_router(health.router, prefix="/api/v1", tags=["Health"])
    app.include_router(dev.router, prefix="/api/v1", tags=["Developer"])
    app.include_router(sessions.router, prefix="/api/v1", tags=["Sessions"])
    app.include_router(cases.router, prefix="/api/v1", tags=["Cases"])
    app.include_router(intelligence.router, prefix="/api/v1", tags=["Intelligence"])
    app.include_router(audit.router, prefix="/api/v1", tags=["Audit"])
    app.include_router(privacy.router, prefix="/api/v1", tags=["Privacy"])
    app.include_router(counterfeit.router, prefix="/api/v1", tags=["Counterfeit"])
    app.include_router(ops.router, prefix="/api/v1", tags=["Operations"])

    # Observability
    Instrumentator().instrument(app).expose(app, include_in_schema=False, should_gzip=True)

    # OpenTelemetry
    trace.set_tracer_provider(TracerProvider())
    # Note: Using ConsoleSpanExporter for local demo. In real prod, this goes to Jaeger/OTLP.
    trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    
    FastAPIInstrumentor.instrument_app(app)
    # SQLAlchemyInstrumentor().instrument(engine=get_engine()) # Can instrument engine if initialized

    return app


app = create_app()
