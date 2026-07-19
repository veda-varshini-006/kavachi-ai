import json
import structlog
from datetime import datetime

from sqlalchemy.orm import Session
from kavach_domain.models import (
    CommunicationSession,
    IncidentCase,
    ThreatVerdict,
    TranscriptSegment,
)
from kavach_api.engine import KavachRiskEngine
from kavach_api.policy import InterventionPolicyEngine
from kavach_api.events.bus import bus, EventEnvelope

logger = structlog.get_logger()
risk_engine = KavachRiskEngine()
policy_engine = InterventionPolicyEngine()

async def handle_transcript_received(payload: dict, correlation_id: str, causation_id: str, db: Session):
    session_id = payload.get("session_id")
    segment_id = payload.get("segment_id")
    
    logger.info("handler.transcript_received", session_id=session_id, segment_id=segment_id)
    
    # 1. Fetch all segments for the session
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.session_id == session_id
    ).order_by(TranscriptSegment.sequence_number).all()
    
    if not segments:
        return
        
    # 2. Evaluate rules
    result = risk_engine.evaluate_session(segments)
    
    verdict_val = result["verdict"]
    scam_type = result["scam_type"]
    confidence = result["confidence"]
    risk_score = result["normalized_risk_score"]
    triggered = [ind["code"] for ind in result["triggered_indicators"]]
    evidence = [ind["matched_text"] for ind in result["triggered_indicators"]]
    action = result["recommended_action"]
    
    # Check if verdict already exists with this exact data (idempotency check)
    existing_verdict = db.query(ThreatVerdict).filter(
        ThreatVerdict.session_id == session_id
    ).order_by(ThreatVerdict.created_at.desc()).first()
    
    # We only create a new verdict if risk score or stage changed
    if existing_verdict and existing_verdict.normalized_risk_score == risk_score and existing_verdict.verdict == verdict_val.value:
        return
        
    # Save new Verdict
    verdict = ThreatVerdict(
        session_id=session_id,
        verdict=verdict_val.value,
        scam_type=scam_type,
        confidence=confidence,
        normalized_risk_score=risk_score,
        triggered_indicators_json=json.dumps(triggered),
        evidence_snippets_json=json.dumps(evidence),
        recommended_action=action,
        timestamp=datetime.utcnow()
    )
    db.add(verdict)
    
    # Publish verdict_changed event
    bus.publish_sync(db, EventEnvelope(
        event_type="verdict_changed",
        payload={
            "session_id": session_id,
            "verdict_id": verdict.id,
            "verdict": verdict_val.value,
            "risk_score": risk_score,
            "scam_type": scam_type
        },
        correlation_id=correlation_id,
        causation_id=segment_id
    ))
    
    # Trigger entities extraction
    # This is a bit simplified, but let's extract entities based on the new text
    segment = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if segment:
        bus.publish_sync(db, EventEnvelope(
            event_type="entity_extracted",
            payload={
                "session_id": session_id,
                "text": segment.text,
                "segment_id": segment.id
            },
            correlation_id=correlation_id,
            causation_id=segment_id
        ))

async def handle_verdict_changed(payload: dict, correlation_id: str, causation_id: str, db: Session):
    session_id = payload.get("session_id")
    verdict = payload.get("verdict")
    risk_score = payload.get("risk_score")
    
    logger.info("handler.verdict_changed", session_id=session_id, verdict=verdict)
    
    # Create incident case if critical and doesn't exist
    if verdict == "CRITICAL" or risk_score >= 0.8:
        existing_case = db.query(IncidentCase).filter(IncidentCase.session_id == session_id).first()
        if not existing_case:
            case = IncidentCase(
                title=f"Critical {payload.get('scam_type', 'Scam')} Detection",
                description=f"Auto-generated incident for session {session_id}.",
                severity="CRITICAL",
                status="NEW",
                session_id=session_id
            )
            db.add(case)
            bus.publish_sync(db, EventEnvelope(
                event_type="case_created",
                payload={"case_id": case.id, "session_id": session_id},
                correlation_id=correlation_id,
                causation_id=payload.get("verdict_id")
            ))

async def handle_entity_extracted(payload: dict, correlation_id: str, causation_id: str, db: Session):
    from kavach_api.services.extraction import ExtractionService
    session_id = payload.get("session_id")
    text = payload.get("text")
    
    if not text:
        return
        
    extracted_entities = ExtractionService.extract_entities_from_text(text)
    if not extracted_entities:
        return
        
    # Get session to link entities to citizen/suspect
    session = db.query(CommunicationSession).filter(CommunicationSession.id == session_id).first()
    if not session:
        return
        
    for entity_data in extracted_entities:
        # Create or get entity
        from kavach_domain.models import Entity, Relationship
        
        ent = db.query(Entity).filter(
            Entity.type == entity_data["type"].value,
            Entity.value == entity_data["value"]
        ).first()
        
        if not ent:
            ent = Entity(
                type=entity_data["type"].value,
                value=entity_data["value"],
                risk_score=entity_data["risk_score"]
            )
            db.add(ent)
            db.flush() # Need ID
            
        # Link to session
        # For simplicity, we create a generic 'session' entity and link them, 
        # or we link them to the suspect identifier.
        suspect_ent = db.query(Entity).filter(Entity.value == session.suspect_identifier).first()
        if not suspect_ent:
            suspect_ent = Entity(type="PHONE", value=session.suspect_identifier, risk_score=50.0)
            db.add(suspect_ent)
            db.flush()
            
        rel = db.query(Relationship).filter(
            Relationship.source_entity_id == suspect_ent.id,
            Relationship.target_entity_id == ent.id
        ).first()
        
        if not rel and suspect_ent.id != ent.id:
            rel = Relationship(
                source_entity_id=suspect_ent.id,
                target_entity_id=ent.id,
                type="USED_IN",
                confidence=entity_data["confidence"]
            )
            db.add(rel)
            
            bus.publish_sync(db, EventEnvelope(
                event_type="relationship_suggested",
                payload={"source": suspect_ent.id, "target": ent.id},
                correlation_id=correlation_id,
                causation_id=causation_id
            ))


def register_all_handlers():
    bus.register("transcript_received", handle_transcript_received)
    bus.register("verdict_changed", handle_verdict_changed)
    bus.register("entity_extracted", handle_entity_extracted)
