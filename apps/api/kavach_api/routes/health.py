from fastapi import APIRouter, Depends
from kavach_api.database import get_db
from sqlalchemy import text
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/health")
def health():
    """Simple API health check."""
    return {"status": "healthy", "service": "kavach-api"}


@router.get("/system/status")
def system_status(db: Session = Depends(get_db)):
    """Component status and connectivity checks."""
    db_status = "unreachable"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    return {
        "status": "operational",
        "components": {
            "api_server": "healthy",
            "database": db_status
        },
        "version": "0.1.0"
    }
