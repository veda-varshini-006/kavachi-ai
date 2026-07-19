import asyncio
import json
import time
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from kavach_api.audit import AuditService
from kavach_api.database import get_db
from kavach_api.engine import KavachRiskEngine
from kavach_api.policy import InterventionPolicyEngine
from kavach_api.stt import ScriptedSTTProvider
from kavach_domain.models import (
    CommunicationSession,
    IncidentCase,
    ThreatVerdict,
    TranscriptSegment,
)
from kavach_api.events.bus import bus, EventEnvelope
from kavach_domain.schemas import (
    CommunicationSessionCreate,
    CommunicationSessionSchema,
    ThreatVerdictSchema,
    ThreatVerdictValue,
    TranscriptSegmentCreate,
    TranscriptSegmentSchema,
)
from sqlalchemy import desc
from sqlalchemy.orm import Session

logger = structlog.get_logger()
stt_provider = ScriptedSTTProvider()
risk_engine = KavachRiskEngine()
policy_engine = InterventionPolicyEngine()
from kavach_api.auth import require_role

router = APIRouter(prefix="/sessions")


@router.get("", response_model=dict, dependencies=[Depends(require_role(["Analyst", "Supervisor", "Admin"]))])
def list_sessions(
    page: int = 1,
    page_size: int = 10,
    channel: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db)
):
    """Retrieve a paginated list of communication sessions."""
    query = db.query(CommunicationSession)
    if channel:
        query = query.filter(CommunicationSession.channel == channel)
    if status:
        query = query.filter(CommunicationSession.status == status)

    total = query.count()
    sessions = query.order_by(desc(CommunicationSession.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [CommunicationSessionSchema.model_validate(s) for s in sessions],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": total > page * page_size
    }


@router.post("", response_model=CommunicationSessionSchema, dependencies=[Depends(require_role(["Citizen", "Analyst", "Supervisor", "Admin"]))])
def create_session(data: CommunicationSessionCreate, db: Session = Depends(get_db)):
    """Create a new communication session."""
    session = CommunicationSession(
        channel=data.channel,
        citizen_identifier=data.citizen_identifier,
        suspect_identifier=data.suspect_identifier,
        status=data.status or "ACTIVE",
        metadata_json=data.metadata_json or "{}"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Log Audit Event
    AuditService.log_event(
        db, actor_id="analyst", actor_role="analyst",
        action="CREATE_SESSION", resource="session",
        resource_id=session.id, status="SUCCESS",
        details={"channel": session.channel}
    )

    return CommunicationSessionSchema.model_validate(session)


@router.get("/{session_id}", response_model=CommunicationSessionSchema, dependencies=[Depends(require_role(["Citizen", "Analyst", "Supervisor", "Admin"]))])
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get details of a single communication session."""
    session = db.query(CommunicationSession).filter(CommunicationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return CommunicationSessionSchema.model_validate(session)


@router.post("/{session_id}/transcript", response_model=TranscriptSegmentSchema, dependencies=[Depends(require_role(["Citizen", "Analyst", "Supervisor", "Admin"]))])
def add_transcript_segment(
    session_id: str,
    data: TranscriptSegmentCreate,
    db: Session = Depends(get_db)
):
    """Ingest a new transcript segment and dynamically trigger risk analysis."""
    session = db.query(CommunicationSession).filter(CommunicationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    segment = TranscriptSegment(
        session_id=session_id,
        speaker=data.speaker,
        text=data.text,
        confidence=data.confidence
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    # Evaluate dynamic threat risk assessment rules (mocked evaluation)
    evaluate_rules_and_update_verdict(session_id, db)

    return TranscriptSegmentSchema.model_validate(segment)


@router.get("/{session_id}/verdict", response_model=ThreatVerdictSchema, dependencies=[Depends(require_role(["Citizen", "Analyst", "Supervisor", "Admin"]))])
def get_session_verdict(session_id: str, db: Session = Depends(get_db)):
    """Get the latest threat verdict for a session."""
    verdict = db.query(ThreatVerdict).filter(ThreatVerdict.session_id == session_id).order_by(desc(ThreatVerdict.created_at)).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="No threat verdict generated for this session.")
    return ThreatVerdictSchema.model_validate(verdict)


# Helper function to mock real-time threat rule checks
def evaluate_rules_and_update_verdict(session_id: str, db: Session):
    segments = db.query(TranscriptSegment).filter(TranscriptSegment.session_id == session_id).order_by(TranscriptSegment.sequence_number).all()

    # Run the risk engine evaluation
    result = risk_engine.evaluate_session(segments)

    verdict_val = result["verdict"]
    scam_type = result["scam_type"]
    confidence = result["confidence"]
    risk_score = result["normalized_risk_score"]
    triggered = [ind["code"] for ind in result["triggered_indicators"]]
    evidence = [ind["matched_text"] for ind in result["triggered_indicators"]]
    action = result["recommended_action"]

    # Save to Database
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

    # Publish verdict_changed to EventBus
    bus.publish_sync(db, EventEnvelope(
        event_type="verdict_changed",
        payload={
            "session_id": session_id,
            "verdict_id": verdict.id,
            "verdict": verdict_val.value,
            "risk_score": risk_score,
            "scam_type": scam_type
        },
        correlation_id=session_id
    ))

    db.commit()
    return result


# ---------------------------------------------------------------------------
# WebSocket Session Event Stream
# ---------------------------------------------------------------------------

@router.websocket("/{session_id}/stream")
async def session_websocket_stream(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint that accepts a connection and streams rolling transcript
    segments, risk evaluation verdicts, and simulated intervention alerts.
    Supports sequence synchronization, heartbeats, deduplication, and latency logging.
    """
    await websocket.accept()
    logger.info("websocket.connected", session_id=session_id)

    db_factory = get_db()
    db = next(db_factory)

    # In-memory deduplication set for this connection instance
    seen_idempotency_keys = set()

    try:
        # Load current session
        session = db.query(CommunicationSession).filter(CommunicationSession.id == session_id).first()
        if not session:
            await websocket.send_json({
                "event_type": "error",
                "payload": {"message": "Session not found."}
            })
            await websocket.close()
            return

        # Stream existing segments first (initial sync)
        existing_segments = db.query(TranscriptSegment).filter(TranscriptSegment.session_id == session_id).order_by(TranscriptSegment.sequence_number).all()
        for seg in existing_segments:
            await websocket.send_json({
                "event_type": "transcript_segment",
                "seq": seg.sequence_number,
                "idempotency_key": seg.idempotency_key,
                "payload": {
                    "id": seg.id,
                    "speaker": seg.speaker,
                    "text": seg.text,
                    "timestamp": seg.timestamp.isoformat(),
                    "confidence": seg.confidence,
                    "sequence_number": seg.sequence_number,
                    "client_timestamp": seg.client_timestamp,
                    "ingest_latency_ms": seg.ingest_latency_ms,
                    "processing_latency_ms": seg.processing_latency_ms,
                    "render_latency_ms": seg.render_latency_ms,
                    "idempotency_key": seg.idempotency_key
                }
            })
            if seg.idempotency_key:
                seen_idempotency_keys.add(seg.idempotency_key)
            await asyncio.sleep(0.05)

        # Stream current verdict if available
        verdict = db.query(ThreatVerdict).filter(ThreatVerdict.session_id == session_id).order_by(desc(ThreatVerdict.created_at)).first()
        if verdict:
            result = risk_engine.evaluate_session(existing_segments)
            await websocket.send_json({
                "event_type": "threat_verdict",
                "payload": {
                    "verdict": result["verdict"].value,
                    "scam_type": result["scam_type"],
                    "confidence": result["confidence"],
                    "normalized_risk_score": result["normalized_risk_score"],
                    "stage": result["stage"],
                    "triggered_indicators": [ind["code"] for ind in result["triggered_indicators"]],
                    "evidence_snippets": [ind["matched_text"] for ind in result["triggered_indicators"]],
                    "recommended_action": result["recommended_action"],
                    "detailed_indicators": result["triggered_indicators"]
                }
            })

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            command = message.get("command")

            # Heartbeat ping command
            if command == "ping":
                await websocket.send_json({"event_type": "pong"})
                continue

            # Reconnect sync command
            elif command == "reconnect":
                last_seq = message.get("last_sequence", -1)
                logger.info("websocket.reconnect_sync", session_id=session_id, last_sequence=last_seq)
                missed_segments = db.query(TranscriptSegment).filter(
                    TranscriptSegment.session_id == session_id,
                    TranscriptSegment.sequence_number > last_seq
                ).order_by(TranscriptSegment.sequence_number).all()

                for seg in missed_segments:
                    await websocket.send_json({
                        "event_type": "transcript_segment",
                        "seq": seg.sequence_number,
                        "idempotency_key": seg.idempotency_key,
                        "payload": {
                            "id": seg.id,
                            "speaker": seg.speaker,
                            "text": seg.text,
                            "timestamp": seg.timestamp.isoformat(),
                            "confidence": seg.confidence,
                            "sequence_number": seg.sequence_number,
                            "client_timestamp": seg.client_timestamp,
                            "ingest_latency_ms": seg.ingest_latency_ms,
                            "processing_latency_ms": seg.processing_latency_ms,
                            "render_latency_ms": seg.render_latency_ms,
                            "idempotency_key": seg.idempotency_key
                        }
                    })
                continue

            # Scripted simulation command or direct transcript segment ingestion
            elif command in ("simulate_next", "transcript_segment"):
                seq = message.get("seq", 0)
                client_ts = message.get("client_timestamp")
                idemp_key = message.get("idempotency_key") or f"idemp-{session_id}-{seq}"

                # Duplicate suppression
                if idemp_key in seen_idempotency_keys:
                    logger.warning("websocket.duplicate_suppressed", idempotency_key=idemp_key)
                    continue

                # Query database for existing idempotency key to prevent duplicates
                existing_seg = db.query(TranscriptSegment).filter(TranscriptSegment.idempotency_key == idemp_key).first()
                if existing_seg:
                    logger.warning("websocket.db_duplicate_suppressed", idempotency_key=idemp_key)
                    seen_idempotency_keys.add(idemp_key)
                    continue

                server_receive_time = time.time()
                ingest_latency_ms = None
                if client_ts:
                    ingest_latency_ms = (server_receive_time - client_ts) * 1000.0

                # Resolve text and speaker
                if command == "simulate_next":
                    scenario_id = message.get("scenario_id", "digital-arrest")
                    step_idx = message.get("step", 1) - 1
                    seg_data = stt_provider.get_segment(scenario_id, step_idx)
                    if not seg_data:
                        logger.warning("websocket.scenario_end", scenario_id=scenario_id, step=step_idx)
                        continue
                    text = seg_data["text"]
                    speaker = seg_data["speaker"]
                    confidence = 0.98
                else:
                    # Ingestion from audio recording path
                    payload = message.get("payload", {})
                    text = payload.get("text", "")
                    speaker = payload.get("speaker", "CITIZEN")
                    confidence = payload.get("confidence", 1.0)

                proc_start = time.time()

                segment = TranscriptSegment(
                    session_id=session_id,
                    speaker=speaker,
                    text=text,
                    confidence=confidence,
                    sequence_number=seq,
                    client_timestamp=client_ts,
                    ingest_latency_ms=ingest_latency_ms,
                    idempotency_key=idemp_key
                )
                db.add(segment)

                bus.publish_sync(db, EventEnvelope(
                    event_type="transcript_received",
                    payload={
                        "session_id": session_id,
                        "segment_id": segment.id,
                        "text": text,
                        "speaker": speaker
                    },
                    correlation_id=session_id,
                    causation_id=idemp_key
                ))

                db.commit()
                db.refresh(segment)

                # Process rules and evaluate threat verdict
                result = evaluate_rules_and_update_verdict(session_id, db)
                proc_end = time.time()
                proc_latency_ms = (proc_end - proc_start) * 1000.0

                # Update processing latency on the segment record
                segment.processing_latency_ms = proc_latency_ms
                db.commit()

                # Add to seen keys
                seen_idempotency_keys.add(idemp_key)

                # Stream the segment back
                await websocket.send_json({
                    "event_type": "transcript_segment",
                    "seq": seq,
                    "idempotency_key": idemp_key,
                    "payload": {
                        "id": segment.id,
                        "speaker": segment.speaker,
                        "text": segment.text,
                        "timestamp": segment.timestamp.isoformat(),
                        "confidence": segment.confidence,
                        "sequence_number": seq,
                        "client_timestamp": client_ts,
                        "ingest_latency_ms": ingest_latency_ms,
                        "processing_latency_ms": proc_latency_ms,
                        "render_latency_ms": None,
                        "idempotency_key": idemp_key
                    }
                })

                # Stream threat verdict
                if result:
                    await websocket.send_json({
                        "event_type": "threat_verdict",
                        "payload": {
                            "verdict": result["verdict"].value,
                            "scam_type": result["scam_type"],
                            "confidence": result["confidence"],
                            "normalized_risk_score": result["normalized_risk_score"],
                            "stage": result["stage"],
                            "triggered_indicators": [ind["code"] for ind in result["triggered_indicators"]],
                            "evidence_snippets": [ind["matched_text"] for ind in result["triggered_indicators"]],
                            "recommended_action": result["recommended_action"],
                            "detailed_indicators": result["triggered_indicators"]
                        }
                    })

            elif command == "trigger_upi_transfer":
                result = risk_engine.evaluate_session(
                    db.query(TranscriptSegment).filter(TranscriptSegment.session_id == session_id).all()
                )
                result["stage"] = "FINANCIAL_ACTION"

                actions = policy_engine.evaluate_verdict_and_authorize(db, session_id, result, actor="citizen")
                blocked = any(a.action_type == "BLOCK_UPI" for a in actions)

                if blocked:
                    # Log Audit Event
                    AuditService.log_event(
                        db, actor_id="policy_engine", actor_role="system",
                        action="SIMULATED_UPI_OUTFLOW_HOLD", resource="payment_rail",
                        resource_id=session_id, status="SUCCESS",
                        details={"amount": 50000, "message": "Simulated UPI Outflow Hold triggered by policy engine."}
                    )

                    await websocket.send_json({
                        "event_type": "intervention_triggered",
                        "payload": {
                            "action_type": "BLOCK_UPI",
                            "status": "COMPLETED",
                            "details": {
                                "upi_id": "clearance-depot@paytm",
                                "message": "SIMULATED UPI OUTFLOW HOLD: Coercive scam pattern detected. No real account or payment rail is connected."
                            }
                        }
                    })

    except WebSocketDisconnect:
        logger.info("websocket.disconnected", session_id=session_id)
    finally:
        db.close()


@router.delete("/{session_id}", response_model=dict, dependencies=[Depends(require_role(["Admin", "Supervisor"]))])
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a communication session and all linked data."""
    session = db.query(CommunicationSession).filter(CommunicationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Log Audit Event Tombstone
    AuditService.log_event(
        db, actor_id="analyst", actor_role="analyst",
        action="DELETE_SESSION", resource="session",
        resource_id=session_id, status="SUCCESS",
        details={"tombstone": True, "session_id": session_id}
    )

    db.delete(session)
    db.commit()
    return {"status": "success", "message": f"Session {session_id} successfully deleted."}
