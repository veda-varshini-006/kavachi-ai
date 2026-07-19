import pytest
from pydantic import ValidationError
from datetime import datetime

from kavach_domain.schemas import ThreatVerdictSchema, EntitySchema, ThreatVerdictValue, EntityType


def test_threat_verdict_risk_validation():
    # Valid risk score
    v = ThreatVerdictSchema(
        id="550e8400-e29b-41d4-a716-446655440000",
        session_id="550e8400-e29b-41d4-a716-446655440000",
        verdict=ThreatVerdictValue.CRITICAL,
        scam_type="IMPERSONATION",
        confidence=0.95,
        normalized_risk_score=0.85,  # Valid 0.0 - 1.0
        triggered_indicators_json="[]",
        evidence_snippets_json="[]",
        timestamp=datetime.utcnow()
    )
    assert v.normalized_risk_score == 0.85

    # Invalid risk score (too high)
    with pytest.raises(ValidationError) as exc:
        ThreatVerdictSchema(
            id="550e8400-e29b-41d4-a716-446655440000",
            session_id="550e8400-e29b-41d4-a716-446655440000",
            verdict=ThreatVerdictValue.CRITICAL,
            scam_type="IMPERSONATION",
            confidence=0.95,
            normalized_risk_score=1.5,  # Invalid
            triggered_indicators_json="[]",
            evidence_snippets_json="[]",
            timestamp=datetime.utcnow()
        )
    assert "risk score must be between 0.0 and 1.0" in str(exc.value)


def test_entity_risk_validation():
    # Valid risk score (0-100)
    ent = EntitySchema(
        id="e11e8400-e29b-41d4-a716-446655440001",
        type=EntityType.PHONE,
        value="+91-99999-88888",
        risk_score=50.0
    )
    assert ent.risk_score == 50.0

    # Invalid risk score (too low)
    with pytest.raises(ValidationError) as exc:
        EntitySchema(
            id="e11e8400-e29b-41d4-a716-446655440001",
            type=EntityType.PHONE,
            value="+91-99999-88888",
            risk_score=-5.0  # Invalid
        )
    assert "risk score must be between 0.0 and 100.0" in str(exc.value)
