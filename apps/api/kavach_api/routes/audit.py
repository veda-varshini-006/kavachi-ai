from fastapi import APIRouter, Depends
from kavach_api.database import get_db
from kavach_domain.models import AuditEvent
from kavach_domain.schemas import AuditEventSchema
from sqlalchemy import desc
from sqlalchemy.orm import Session
from kavach_api.auth import require_role

router = APIRouter(
    prefix="/audit",
    dependencies=[Depends(require_role(["Analyst", "Supervisor", "Admin"]))]
)


@router.get("/events", response_model=dict)
def get_audit_logs(
    page: int = 1,
    page_size: int = 10,
    actor_id: str | None = None,
    action: str | None = None,
    db: Session = Depends(get_db)
):
    """Retrieve audit events logs with pagination."""
    query = db.query(AuditEvent)
    if actor_id:
        query = query.filter(AuditEvent.actor_id == actor_id)
    if action:
        query = query.filter(AuditEvent.action == action)

    total = query.count()
    events = query.order_by(desc(AuditEvent.timestamp)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [AuditEventSchema.model_validate(e) for e in events],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": total > page * page_size
    }
