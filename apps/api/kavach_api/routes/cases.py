import hashlib
import json
import re

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from kavach_api.audit import AuditService
from kavach_api.database import get_db
from kavach_domain.models import (
    AnalystNote,
    CommunicationSession,
    EvidencePackage,
    IncidentCase,
    TranscriptSegment,
)
from kavach_domain.schemas import (
    AnalystNoteCreate,
    AnalystNoteSchema,
    CaseStatus,
    EvidencePackageSchema,
    IncidentCaseCreate,
    IncidentCaseFeedbackSubmit,
    IncidentCaseSchema,
    Severity,
    TranscriptSegmentSchema,
)
from kavach_api.auth import require_role
from sqlalchemy import desc
from sqlalchemy.orm import Session

logger = structlog.get_logger()
router = APIRouter(
    prefix="/cases",
    dependencies=[Depends(require_role(["Analyst", "Supervisor", "Admin"]))]
)

VALID_TRANSITIONS = {
    "NEW": ["TRIAGE", "CLOSED", "RESOLVED-BENIGN", "INVESTIGATING", "ESCALATED", "DISMISSED"],
    "TRIAGE": ["MONITORING", "ESCALATED", "CLOSED", "RESOLVED-BENIGN", "RESOLVED-SUSPICIOUS"],
    "MONITORING": ["ESCALATED", "RESOLVED-SUSPICIOUS", "RESOLVED-BENIGN", "CLOSED"],
    "ESCALATED": ["RESOLVED-SUSPICIOUS", "CLOSED", "RESOLVED-BENIGN"],
    "RESOLVED-SUSPICIOUS": ["CLOSED"],
    "RESOLVED-BENIGN": ["CLOSED"],
    "CLOSED": ["NEW"],
    "INVESTIGATING": ["ESCALATED", "RESOLVED", "DISMISSED", "TRIAGE", "MONITORING"],
    "RESOLVED": ["CLOSED"],
    "DISMISSED": ["CLOSED"]
}


@router.get("", response_model=dict)
def list_cases(
    page: int = 1,
    page_size: int = 10,
    severity: Severity | None = None,
    status: CaseStatus | None = None,
    db: Session = Depends(get_db)
):
    """Retrieve a paginated list of cases with sorting and filtering options."""
    query = db.query(IncidentCase)
    if severity:
        query = query.filter(IncidentCase.severity == severity.value)
    if status:
        query = query.filter(IncidentCase.status == status.value)

    total = query.count()
    cases = query.order_by(desc(IncidentCase.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [IncidentCaseSchema.model_validate(c) for c in cases],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": total > page * page_size
    }


@router.post("", response_model=IncidentCaseSchema)
def create_case(data: IncidentCaseCreate, db: Session = Depends(get_db)):
    """Create a new incident case."""
    case = IncidentCase(
        title=data.title,
        description=data.description,
        severity=data.severity.value,
        status=data.status.value if data.status else "NEW",
        assigned_to=data.assigned_to,
        session_id=data.session_id
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return IncidentCaseSchema.model_validate(case)


@router.get("/{case_id}", response_model=dict)
def get_case(case_id: str, db: Session = Depends(get_db)):
    """Get complete case details, including notes and evidence packages."""
    case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    notes = db.query(AnalystNote).filter(AnalystNote.case_id == case_id).all()
    evidence = db.query(EvidencePackage).filter(EvidencePackage.case_id == case_id).all()

    # Load session info and transcript segments if available
    session_info = None
    segments_info = []
    if case.session_id:
        session = db.query(CommunicationSession).filter(CommunicationSession.id == case.session_id).first()
        if session:
            session_info = {
                "id": session.id,
                "channel": session.channel,
                "citizen_identifier": session.citizen_identifier,
                "suspect_identifier": session.suspect_identifier,
                "status": session.status,
                "metadata_json": session.metadata_json
            }
            segments = db.query(TranscriptSegment).filter(TranscriptSegment.session_id == case.session_id).order_by(TranscriptSegment.timestamp).all()
            segments_info = [TranscriptSegmentSchema.model_validate(s) for s in segments]

    return {
        "case": IncidentCaseSchema.model_validate(case),
        "notes": [AnalystNoteSchema.model_validate(n) for n in notes],
        "evidence": [EvidencePackageSchema.model_validate(e) for e in evidence],
        "session": session_info,
        "segments": segments_info
    }


@router.post("/{case_id}/notes", response_model=AnalystNoteSchema)
def add_case_note(
    case_id: str,
    data: AnalystNoteCreate,
    db: Session = Depends(get_db)
):
    """Add a new analyst note to a case."""
    case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    note = AnalystNote(
        case_id=case_id,
        author=data.author,
        note_text=data.note_text
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return AnalystNoteSchema.model_validate(note)


@router.post("/{case_id}/evidence", response_model=EvidencePackageSchema)
async def upload_case_evidence(
    case_id: str,
    name: str = Form(...),
    description: str = Form(...),
    created_by: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload/link an evidence package for a case."""
    case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Read file content to generate synthetic hash
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # In a real system, the file would be saved to disk/S3.
    # Here we mock the save by storing a synthetic path reference.
    synthetic_file_path = f"/evidence/{case_id}/{file.filename}"

    evidence = EvidencePackage(
        case_id=case_id,
        name=name,
        description=description,
        file_path=synthetic_file_path,
        file_hash=file_hash,
        created_by=created_by
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return EvidencePackageSchema.model_validate(evidence)


@router.post("/{case_id}/feedback", response_model=IncidentCaseSchema)
def submit_case_feedback(
    case_id: str,
    data: IncidentCaseFeedbackSubmit,
    db: Session = Depends(get_db)
):
    """Submit analyst review feedback for a case."""
    case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.analyst_verdict = data.analyst_verdict
    case.feedback_notes = data.feedback_notes

    note = AnalystNote(
        case_id=case_id,
        author="System Audit",
        note_text=f"Analyst updated verdict to: {data.analyst_verdict}. Feedback: {data.feedback_notes or 'No notes provided'}"
    )
    db.add(note)

    db.commit()
    db.refresh(case)
    return IncidentCaseSchema.model_validate(case)


@router.patch("/{case_id}/status", response_model=IncidentCaseSchema)
def update_case_status(
    case_id: str,
    new_status: str,
    actor: str = "analyst",
    db: Session = Depends(get_db)
):
    """Update case status enforcing valid state machine transitions."""
    case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = case.status

    allowed = VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed and old_status != new_status:
        raise HTTPException(
            status_code=400,
            detail=f"Illegal state transition from {old_status} to {new_status}."
        )

    case.status = new_status

    AuditService.log_event(
        db, actor_id=actor, actor_role="analyst",
        action="TRANSITION_CASE_STATUS", resource="case",
        resource_id=case_id, status="SUCCESS",
        details={"old_status": old_status, "new_status": new_status}
    )

    note = AnalystNote(
        case_id=case_id,
        author="System Audit",
        note_text=f"Case transitioned status from {old_status} to {new_status}."
    )
    db.add(note)

    db.commit()
    db.refresh(case)
    return IncidentCaseSchema.model_validate(case)


@router.get("/{case_id}/evidence-package", response_model=dict)
def get_evidence_package(
    case_id: str,
    reveal_sensitive: bool = False,
    db: Session = Depends(get_db)
):
    """Retrieve comprehensive machine-readable evidence package with selective redaction."""
    from kavach_api.audit import AuditService
    from kavach_api.redaction import redact_field
    from kavach_domain.models import InterventionAction, ThreatVerdict, TranscriptSegment

    case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    session_id = case.session_id
    segments = []
    verdicts = []
    actions = []

    if session_id:
        db_segs = db.query(TranscriptSegment).filter(TranscriptSegment.session_id == session_id).order_by(TranscriptSegment.sequence_number).all()
        for s in db_segs:
            masked_text = s.text
            if not reveal_sensitive:
                masked_text = re.sub(r"\b\d{10}\b", "[REDACTED PHONE]", masked_text)
                masked_text = re.sub(r"\b[\w\.-]+@[\w\.-]+\b", "[REDACTED UPI/EMAIL]", masked_text)

            segments.append({
                "sequence_number": s.sequence_number,
                "speaker": s.speaker,
                "text": masked_text,
                "timestamp": s.timestamp.isoformat(),
                "confidence": s.confidence
            })

        db_verdicts = db.query(ThreatVerdict).filter(ThreatVerdict.session_id == session_id).order_by(ThreatVerdict.timestamp.desc()).all()
        for v in db_verdicts:
            verdicts.append({
                "verdict": v.verdict,
                "scam_type": v.scam_type,
                "normalized_risk_score": v.normalized_risk_score,
                "triggered_indicators": json.loads(v.triggered_indicators_json),
                "timestamp": v.timestamp.isoformat()
            })

        db_actions = db.query(InterventionAction).filter(InterventionAction.session_id == session_id).all()
        for a in db_actions:
            actions.append({
                "action_type": a.action_type,
                "status": a.status,
                "authorized_by": a.authorized_by,
                "policy_version": a.policy_version,
                "reason": a.reason,
                "timestamp": a.timestamp.isoformat()
            })

    audit_chain_valid = AuditService.verify_chain(db)

    citizen_phone = redact_field(case.session.citizen_identifier, "phone", enabled=not reveal_sensitive) if case.session else None
    suspect_phone = redact_field(case.session.suspect_identifier, "phone", enabled=not reveal_sensitive) if case.session else None

    package = {
        "title": "prototype evidence package for analyst review",
        "case_id": case.id,
        "case_title": case.title,
        "case_description": case.description,
        "severity": case.severity,
        "status": case.status,
        "assigned_to": case.assigned_to,
        "created_at": case.created_at.isoformat(),
        "session": {
            "session_id": session_id,
            "citizen_identifier": citizen_phone,
            "suspect_identifier": suspect_phone
        } if session_id else None,
        "transcript_timeline": segments,
        "threat_verdicts_history": verdicts,
        "policy_decisions": actions,
        "audit_verification": {
            "verification_status": "VALID" if audit_chain_valid else "TAMPERED",
            "chain_verified": audit_chain_valid
        },
        "system_limitations": "Prototype evidence package for analyst decision-support review only. Not court-admissible."
    }

    return package
