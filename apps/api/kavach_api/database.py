from collections.abc import Generator

from kavach_config.settings import get_settings
from kavach_domain.models import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        url = settings.effective_database_url
        connect_args = {"check_same_thread": False} if "sqlite" in url else {}
        _engine = create_engine(url, connect_args=connect_args)
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Dependency for routes requiring db session."""
    session_local = get_session_factory()
    db = session_local()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables for SQLite smoke tests."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
