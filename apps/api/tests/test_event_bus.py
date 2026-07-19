import pytest
import asyncio
from kavach_api.events.bus import EventBus
from kavach_domain.schemas import EventEnvelope
from kavach_domain.models import EventOutbox, DeadLetter
from kavach_api.database import get_session_factory, init_db

@pytest.fixture
def clean_db():
    init_db()
    SessionLocal = get_session_factory()
    db = SessionLocal()
    db.query(EventOutbox).delete()
    db.query(DeadLetter).delete()
    db.commit()
    yield db
    db.query(EventOutbox).delete()
    db.query(DeadLetter).delete()
    db.commit()
    db.close()

@pytest.mark.asyncio
async def test_event_bus_delivery_and_dead_letter(clean_db):
    bus = EventBus()
    # Reset handlers for test
    from collections import defaultdict
    bus.handlers = defaultdict(list)
    
    handled_events = []
    
    async def mock_handler(payload, correlation_id, causation_id, db):
        if payload.get("fail"):
            raise Exception("Simulated failure")
        handled_events.append(payload)

    bus.register("test_event", mock_handler)
    
    # 1. Successful Delivery
    env = EventEnvelope(event_type="test_event", payload={"success": True})
    bus.publish_sync(clean_db, env)
    clean_db.commit()
    
    outbox = clean_db.query(EventOutbox).filter_by(event_type="test_event").first()
    assert outbox is not None
    assert outbox.published is False
    
    # Manually dispatch for test
    await bus._dispatch(clean_db, outbox)
    
    assert len(handled_events) == 1
    assert outbox.published is True
    
    # 2. Failure and Dead Letter Queue
    env2 = EventEnvelope(event_type="test_event", payload={"fail": True})
    bus.publish_sync(clean_db, env2)
    clean_db.commit()
    
    outbox_fail = clean_db.query(EventOutbox).filter_by(published=False).first()
    
    # Retry 3 times
    for _ in range(3):
        await bus._dispatch(clean_db, outbox_fail)
        
    # Should be removed from outbox and moved to DeadLetter
    assert clean_db.query(EventOutbox).filter_by(id=outbox_fail.id).first() is None
    dead_letters = clean_db.query(DeadLetter).all()
    assert len(dead_letters) == 1
    assert "Simulated failure" in dead_letters[0].error_reason
