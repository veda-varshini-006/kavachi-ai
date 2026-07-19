import pytest
from sqlalchemy.orm import Session

from kavach_synthetic_data.generator import seed_db, GOLDEN_SESSION_ID, GOLDEN_CASE_ID
from kavach_domain.models import CommunicationSession, IncidentCase, ThreatVerdict, GeoEvent


def test_database_seeder(db_session: Session):
    # Wipe tables to avoid pollution from other tests
    from kavach_domain.models import Base
    from kavach_api.database import get_engine
    Base.metadata.drop_all(bind=get_engine())
    Base.metadata.create_all(bind=get_engine())

    # Retrieve URL from test engine
    url = str(db_session.bind.url)
    
    # Run seeder on test DB
    seed_db(db_url=url)
    
    # Verify records were inserted
    session = db_session.query(CommunicationSession).filter(CommunicationSession.id == GOLDEN_SESSION_ID).first()
    assert session is not None
    assert session.channel == "PHONE"
    assert session.citizen_identifier == "+91-98765-43210"

    case = db_session.query(IncidentCase).filter(IncidentCase.id == GOLDEN_CASE_ID).first()
    assert case is not None
    assert case.severity == "CRITICAL"
    assert case.status == "INVESTIGATING"

    verdict = db_session.query(ThreatVerdict).filter(ThreatVerdict.session_id == GOLDEN_SESSION_ID).first()
    assert verdict is not None
    assert verdict.verdict == "CRITICAL"

    geo_events = db_session.query(GeoEvent).all()
    assert len(geo_events) >= 3
