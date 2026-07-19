import asyncio
import json
import traceback
from collections import defaultdict
from datetime import datetime
from typing import Callable, Coroutine, Dict, List

import structlog
from kavach_api.database import get_session_factory
from kavach_domain.models import DeadLetter, EventOutbox
from kavach_domain.schemas import EventEnvelope
from sqlalchemy.orm import Session

logger = structlog.get_logger()

# Handler type: async def handler(payload: dict, correlation_id: str, causation_id: str, db: Session)
EventHandler = Callable[[dict, str, str, Session], Coroutine]

class EventBus:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.handlers = defaultdict(list)
            cls._instance.is_polling = False
        return cls._instance

    def register(self, event_type: str, handler: EventHandler):
        """Register an async handler for a specific event type."""
        self.handlers[event_type].append(handler)
        logger.info("event_bus.handler_registered", event_type=event_type, handler=handler.__name__)

    def publish_sync(self, db: Session, envelope: EventEnvelope):
        """
        Publishes an event synchronously by inserting it into the Outbox table.
        This ensures transactional outbox consistency: if the DB transaction rolls back, 
        the event is not sent.
        """
        outbox_event = EventOutbox(
            event_type=envelope.event_type,
            payload_json=json.dumps(envelope.payload),
            correlation_id=envelope.correlation_id,
            causation_id=envelope.causation_id,
            published=False,
            retry_count=envelope.retry_count
        )
        db.add(outbox_event)
        logger.debug("event_bus.published_to_outbox", event_type=envelope.event_type)

    async def _process_outbox(self):
        """Background task that polls the Outbox table and dispatches events."""
        while self.is_polling:
            try:
                SessionLocal = get_session_factory()
                with SessionLocal() as db:
                    # Fetch unpublished events
                    pending_events = db.query(EventOutbox).filter(
                        EventOutbox.published == False
                    ).order_by(EventOutbox.created_at).limit(10).all()

                    for event in pending_events:
                        await self._dispatch(db, event)

            except Exception as e:
                logger.error("event_bus.poller_error", error=str(e), exc_info=True)

            await asyncio.sleep(1.0) # Poll interval

    async def _dispatch(self, db: Session, event: EventOutbox):
        """Dispatch a single outbox event to its handlers."""
        handlers = self.handlers.get(event.event_type, [])
        if not handlers:
            # Mark published if no handlers are registered to prevent infinite loops
            event.published = True
            db.commit()
            return

        payload = json.loads(event.payload_json)
        
        try:
            for handler in handlers:
                # We execute sequentially in the context of one DB transaction per handler
                # but for simplicity, we pass the same DB session
                await handler(
                    payload=payload,
                    correlation_id=event.correlation_id,
                    causation_id=event.causation_id,
                    db=db
                )
            
            event.published = True
            db.commit()
            logger.info("event_bus.dispatched", event_type=event.event_type, id=event.id)
            
        except Exception as e:
            logger.error("event_bus.dispatch_failed", event_type=event.event_type, error=str(e))
            db.rollback()
            
            event.retry_count += 1
            event.last_error = str(e)
            
            if event.retry_count >= 3:
                # Move to DeadLetter queue
                logger.error("event_bus.dead_letter", event_type=event.event_type, id=event.id)
                dead_letter = DeadLetter(
                    event_type=event.event_type,
                    payload_json=event.payload_json,
                    correlation_id=event.correlation_id,
                    causation_id=event.causation_id,
                    error_reason=f"Failed after 3 retries. Last error: {str(e)}\n{traceback.format_exc()}"
                )
                db.add(dead_letter)
                db.delete(event)
                
            db.commit()

    def start_polling(self):
        """Start the background outbox poller."""
        if not self.is_polling:
            self.is_polling = True
            asyncio.create_task(self._process_outbox())
            logger.info("event_bus.poller_started")

    def stop_polling(self):
        """Stop the background outbox poller."""
        self.is_polling = False
        logger.info("event_bus.poller_stopped")

bus = EventBus()
