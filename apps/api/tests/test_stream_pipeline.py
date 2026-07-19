import pytest
import json
from kavach_domain.models import TranscriptSegment, CommunicationSession
from kavach_domain.schemas import ThreatVerdictValue

def test_websocket_heartbeat(client, db_session):
    # Register session
    session = CommunicationSession(
        id="test-session-123",
        channel="PHONE",
        citizen_identifier="+91-99999-88888",
        suspect_identifier="+91-11111-22222",
        status="ACTIVE"
    )
    db_session.add(session)
    db_session.commit()

    with client.websocket_connect("/api/v1/sessions/test-session-123/stream") as websocket:
        websocket.send_json({"command": "ping"})
        data = websocket.receive_json()
        assert data["event_type"] == "pong"


def test_websocket_duplicate_suppression(client, db_session):
    session = CommunicationSession(
        id="test-session-dup",
        channel="PHONE",
        citizen_identifier="+91-99999-88888",
        suspect_identifier="+91-11111-22222",
        status="ACTIVE"
    )
    db_session.add(session)
    db_session.commit()

    with client.websocket_connect("/api/v1/sessions/test-session-dup/stream") as websocket:
        # Send first segment
        websocket.send_json({
            "command": "simulate_next",
            "seq": 0,
            "client_timestamp": 1700000000.0,
            "idempotency_key": "idemp-dup-123",
            "scenario_id": "digital-arrest",
            "step": 1
        })
        # Wait for responses
        data1 = websocket.receive_json()
        assert data1["event_type"] == "transcript_segment"

        # Try sending duplicate segment
        websocket.send_json({
            "command": "simulate_next",
            "seq": 0,
            "client_timestamp": 1700000000.0,
            "idempotency_key": "idemp-dup-123",
            "scenario_id": "digital-arrest",
            "step": 1
        })

    # Assert only 1 segment exists in the database
    segs = db_session.query(TranscriptSegment).filter(TranscriptSegment.session_id == "test-session-dup").all()
    assert len(segs) == 1


def test_websocket_reconnect_replay(client, db_session):
    session = CommunicationSession(
        id="test-session-rec",
        channel="PHONE",
        citizen_identifier="+91-99999-88888",
        suspect_identifier="+91-11111-22222",
        status="ACTIVE"
    )
    db_session.add(session)
    db_session.commit()

    # Pre-seed segments seq 0, 1, 2
    for i in range(3):
        seg = TranscriptSegment(
            session_id="test-session-rec",
            speaker="SUSPECT",
            text=f"Test line {i}",
            confidence=0.98,
            sequence_number=i,
            idempotency_key=f"idemp-rec-{i}"
        )
        db_session.add(seg)
    db_session.commit()

    with client.websocket_connect("/api/v1/sessions/test-session-rec/stream") as websocket:
        # Consume the automatic initial sync stream
        for _ in range(3):
            data = websocket.receive_json()
            assert data["event_type"] == "transcript_segment"

        # Send reconnect command starting from seq 1 (requesting missed seq 2)
        websocket.send_json({
            "command": "reconnect",
            "last_sequence": 1
        })
        replay = websocket.receive_json()
        assert replay["event_type"] == "transcript_segment"
        assert replay["seq"] == 2


def test_websocket_telemetry(client, db_session):
    session = CommunicationSession(
        id="test-session-tel",
        channel="PHONE",
        citizen_identifier="+91-99999-88888",
        suspect_identifier="+91-11111-22222",
        status="ACTIVE"
    )
    db_session.add(session)
    db_session.commit()

    with client.websocket_connect("/api/v1/sessions/test-session-tel/stream") as websocket:
        websocket.send_json({
            "command": "simulate_next",
            "seq": 0,
            "client_timestamp": 1700000000.0,
            "idempotency_key": "idemp-tel-123",
            "scenario_id": "digital-arrest",
            "step": 1
        })
        websocket.receive_json()

    # Assert database telemetry columns are computed
    seg = db_session.query(TranscriptSegment).filter(TranscriptSegment.session_id == "test-session-tel").first()
    assert seg.client_timestamp == 1700000000.0
    assert seg.ingest_latency_ms is not None
    assert seg.processing_latency_ms is not None
