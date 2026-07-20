import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import os
from kavach_config.settings import get_settings
from kavach_domain.models import Base
import kavach_domain.models
from kavach_api.database import get_db
from kavach_api.main import app
@pytest.fixture(scope="session", autouse=True)
def setup_test_settings():
    # Force use of a separate test file database for tests
    settings = get_settings()
    settings.database_url = "sqlite:///data/kavach_test.db"
    
    # Delete the test DB file if it already exists
    test_db_path = settings.data_root / "kavach_test.db"
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except OSError:
            pass
        
    yield
    
    # Clean up after test run
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except OSError:
            pass


@pytest.fixture(scope="function")
def db_session():
    """Create a clean file database and yield a session for a test function."""
    settings = get_settings()
    url = settings.effective_database_url
    engine = create_engine(url, connect_args={"check_same_thread": False})
    
    # Recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Provides a TestClient with overridden database dependency."""
    def _get_db_override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_db_override
    # Provide a default role so tests don't fail with 403 Forbidden
    with TestClient(app, headers={"X-Demo-Role": "Admin"}) as test_client:
        yield test_client
    app.dependency_overrides.clear()
