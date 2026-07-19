import hashlib
import json
from datetime import datetime
from typing import Any

from kavach_domain.models import AuditEvent
from sqlalchemy import asc
from sqlalchemy.orm import Session


class AuditService:
    """Append-only Merkle-compatible event chain logging service."""

    @staticmethod
    def log_event(
        db: Session,
        actor_id: str,
        actor_role: str,
        action: str,
        resource: str,
        resource_id: str | None,
        status: str,
        details: dict[str, Any],
        ip_address: str = "127.0.0.1",
        correlation_id: str | None = None
    ) -> AuditEvent:
        # 1. Fetch latest event to chain hashes
        latest_event = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).first()
        prev_hash = latest_event.event_hash if latest_event else "0" * 64

        # 2. Compute payload canonical hash
        payload_str = json.dumps(details, sort_keys=True)
        payload_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

        # 3. Create AuditEvent record
        event = AuditEvent(
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            resource=resource,
            resource_id=resource_id,
            status=status,
            details_json=payload_str,
            ip_address=ip_address,
            correlation_id=correlation_id,
            previous_event_hash=prev_hash,
            canonical_payload_hash=payload_hash,
            timestamp=datetime.utcnow()
        )

        # 4. Compute unique block event hash
        block_content = f"{prev_hash}:{payload_hash}:{actor_id}:{action}:{event.timestamp.isoformat()}"
        event.event_hash = hashlib.sha256(block_content.encode("utf-8")).hexdigest()

        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def verify_chain(db: Session) -> bool:
        """Traverse the entire audit event log database to detect tampers or deletions."""
        events = db.query(AuditEvent).order_by(asc(AuditEvent.timestamp)).all()
        if not events:
            return True

        expected_prev_hash = "0" * 64

        for event in events:
            # Verify previous hash pointer
            if event.previous_event_hash != expected_prev_hash:
                return False

            # Verify canonical payload hash integrity
            payload_hash = hashlib.sha256(event.details_json.encode("utf-8")).hexdigest()
            if event.canonical_payload_hash != payload_hash:
                return False

            # Verify block event hash calculation
            block_content = f"{expected_prev_hash}:{payload_hash}:{event.actor_id}:{event.action}:{event.timestamp.isoformat()}"
            recalculated_hash = hashlib.sha256(block_content.encode("utf-8")).hexdigest()

            if event.event_hash != recalculated_hash:
                return False

            # Advance expected pointer hash
            expected_prev_hash = event.event_hash

        return True
