from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from kavach_api.database import get_db
from kavach_api.auth import require_role
from kavach_domain.models import CommunicationSession, PrivacyAudit, ConsentRecord
from pydantic import BaseModel
from fastapi import Request

router = APIRouter(
    prefix="/privacy",
    dependencies=[Depends(require_role(["Admin"]))]
)

class DataExportRequest(BaseModel):
    citizen_identifier: str

@router.post("/export")
def export_citizen_data(req: DataExportRequest, db: Session = Depends(get_db)):
    """Export all data related to a citizen identifier."""
    sessions = db.query(CommunicationSession).filter(
        CommunicationSession.citizen_identifier == req.citizen_identifier
    ).all()
    
    export_data = {
        "citizen": req.citizen_identifier,
        "sessions": []
    }
    
    for s in sessions:
        session_data = {
            "id": s.id,
            "channel": s.channel,
            "created_at": s.created_at.isoformat(),
            "status": s.status,
            "transcripts": [{"speaker": ts.speaker, "text": ts.text, "timestamp": ts.timestamp.isoformat()} for ts in s.segments]
        }
        export_data["sessions"].append(session_data)
        
    audit = PrivacyAudit(
        actor_id="admin_system",
        actor_role="Admin",
        action="EXPORT_DATA",
        resource="citizen_data",
        resource_id=req.citizen_identifier,
        pii_fields_accessed="all_session_data,transcripts",
        justification="Subject Access Request"
    )
    db.add(audit)
    db.commit()
    
    return {"status": "success", "data": export_data}

@router.delete("/purge/{citizen_identifier}")
def purge_citizen_data(citizen_identifier: str, db: Session = Depends(get_db)):
    """Delete all data related to a citizen identifier."""
    sessions = db.query(CommunicationSession).filter(
        CommunicationSession.citizen_identifier == citizen_identifier
    ).all()
    
    count = len(sessions)
    for s in sessions:
        db.delete(s)
        
    audit = PrivacyAudit(
        actor_id="admin_system",
        actor_role="Admin",
        action="PURGE_DATA",
        resource="citizen_data",
        resource_id=citizen_identifier,
        pii_fields_accessed="all_session_data,transcripts",
        justification="Right to be Forgotten"
    )
    db.add(audit)
    db.commit()
    
    return {"status": "success", "sessions_deleted": count}

class ConsentRequest(BaseModel):
    citizen_identifier: str
    consent_type: str
    granted: bool

@router.post("/consent")
def record_consent(req: ConsentRequest, request: Request, db: Session = Depends(get_db)):
    """Record a citizen's consent for microphone/image capture."""
    record = ConsentRecord(
        citizen_identifier=req.citizen_identifier,
        consent_type=req.consent_type,
        granted=req.granted,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(record)
    
    # Audit log
    audit = PrivacyAudit(
        actor_id=req.citizen_identifier,
        actor_role="Citizen",
        action="GRANT_CONSENT" if req.granted else "REVOKE_CONSENT",
        resource="device_sensor",
        resource_id=req.consent_type,
        pii_fields_accessed="none",
        justification="Citizen self-service consent."
    )
    db.add(audit)
    db.commit()
    
    return {"status": "success"}
