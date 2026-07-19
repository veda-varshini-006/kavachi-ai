import structlog
from fastapi import APIRouter, Depends, HTTPException
from kavach_api.database import get_db
from kavach_config.settings import get_settings
from kavach_synthetic_data.generator import seed_db
from sqlalchemy.orm import Session

logger = structlog.get_logger()
from kavach_api.auth import require_role

router = APIRouter(
    prefix="/dev",
    dependencies=[Depends(require_role(["Admin"]))]
)


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    """Triggers the synthetic database seeder."""
    settings = get_settings()
    # Guard to prevent production DB wipes
    if not settings.debug and "sqlite" not in settings.effective_database_url:
        logger.warning("dev_seed.attempted_in_prod")
        raise HTTPException(
            status_code=403,
            detail="Seeding is only allowed in development mode or SQLite databases."
        )

    try:
        seed_db()
        logger.info("dev_seed.success")
        return {"status": "success", "message": "Database seeded successfully."}
    except Exception as e:
        logger.error("dev_seed.failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to seed database: {str(e)}") from e


@router.post("/reset")
def reset(db: Session = Depends(get_db)):
    """Wipes the database and reseeds from scratch."""
    settings = get_settings()
    if not settings.debug and "sqlite" not in settings.effective_database_url:
        logger.warning("dev_reset.attempted_in_prod")
        raise HTTPException(
            status_code=403,
            detail="Resetting is only allowed in development mode or SQLite databases."
        )

    try:
        # Wipe all tables (clean reset)
        seed_db()
        logger.info("dev_reset.success")
        return {"status": "success", "message": "Database reset and seeded successfully."}
    except Exception as e:
        logger.error("dev_reset.failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}") from e


import asyncio
@router.get("/fault/latency")
async def inject_latency(delay: float = 2.0):
    """Inject artificial latency for resilience testing."""
    await asyncio.sleep(delay)
    return {"status": "fault_injected", "delay": delay}
