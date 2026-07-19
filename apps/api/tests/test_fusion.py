import pytest
from kavach_api.services.fusion import FusionService
from kavach_domain.models import IncidentCase, ThreatVerdict, CommunicationSession, Entity, Relationship
from kavach_api.database import get_session_factory, init_db
import json

@pytest.fixture
def db():
    init_db()
    SessionLocal = get_session_factory()
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

def test_fusion_summary_generation(db):
    # Setup test data
    session = CommunicationSession(channel="PHONE", citizen_identifier="test", suspect_identifier="suspect-test")
    db.add(session)
    db.commit()
    
    case = IncidentCase(title="Test Case", description="Test", severity="CRITICAL", status="NEW", session_id=session.id)
    db.add(case)
    
    verdict = ThreatVerdict(session_id=session.id, verdict="CRITICAL", scam_type="KYC", confidence=0.9, normalized_risk_score=0.9, evidence_snippets_json=json.dumps(["test snippet"]))
    db.add(verdict)
    
    db.commit()
    
    summary = FusionService.generate_case_summary(db, case.id)
    assert summary is not None
    assert summary["risk_band"] == "CRITICAL"
    assert len(summary["key_evidence"]) > 0
    assert len(summary["contradictions"]) > 0
    assert "no known campaigns linked" in summary["contradictions"][0]
