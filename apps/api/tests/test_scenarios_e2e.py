import pytest
import asyncio
from kavach_api.services.replay import ScenarioReplayService
from kavach_api.database import get_session_factory, init_db
from kavach_domain.models import CommunicationSession, TranscriptSegment, ThreatVerdict, IncidentCase

@pytest.fixture
def db():
    init_db()
    SessionLocal = get_session_factory()
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.mark.asyncio
async def test_digital_arrest_scenario_e2e(db):
    session_id = await ScenarioReplayService.run_scenario("digital-arrest", db)
    assert session_id is not None
    
    session = db.query(CommunicationSession).filter_by(id=session_id).first()
    assert session is not None
    
    segments = db.query(TranscriptSegment).filter_by(session_id=session_id).all()
    assert len(segments) > 0
    
    # Verdict should be CRITICAL
    verdict = db.query(ThreatVerdict).filter_by(session_id=session_id).order_by(ThreatVerdict.created_at.desc()).first()
    assert verdict is not None
    assert verdict.verdict == "CRITICAL"

@pytest.mark.asyncio
async def test_campaign_scenario_e2e(db):
    res = await ScenarioReplayService.run_campaign_scenario(db)
    
    session1 = db.query(CommunicationSession).filter_by(id=res["session1"]).first()
    session2 = db.query(CommunicationSession).filter_by(id=res["session2"]).first()
    
    assert session1 is not None
    assert session2 is not None
    
    # Should share suspect identifier
    assert session1.suspect_identifier == session2.suspect_identifier
