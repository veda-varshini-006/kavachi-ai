import pytest
import json
from kavach_api.policy import InterventionPolicyEngine
from kavach_api.audit import AuditService
from kavach_api.redaction import redact_field
from kavach_domain.models import CommunicationSession, AuditEvent, IncidentCase, InterventionAction
from kavach_domain.schemas import ThreatVerdictValue

def test_intervention_policy_engine(db_session):
    policy = InterventionPolicyEngine()
    
    # 1. Evaluate normal threat verdict (low risk)
    verdict1 = {
        "normalized_risk_score": 0.10,
        "stage": "NORMAL",
        "verdict": ThreatVerdictValue.SAFE,
        "triggered_indicators": []
    }
    actions1 = policy.evaluate_verdict_and_authorize(db_session, "session-low", verdict1)
    assert len(actions1) == 0

    # 2. Evaluate suspicious threat verdict (medium risk)
    verdict2 = {
        "normalized_risk_score": 0.50,
        "stage": "CONCERN",
        "verdict": ThreatVerdictValue.SUSPICIOUS,
        "triggered_indicators": [{"code": "authority_claim"}]
    }
    actions2 = policy.evaluate_verdict_and_authorize(db_session, "session-med", verdict2)
    types2 = [a.action_type for a in actions2]
    assert "ALERT_SOC" in types2
    assert "ALERT_CITIZEN" in types2
    assert "BLOCK_UPI" not in types2

    # 3. Evaluate critical threat verdict (high risk holding block)
    verdict3 = {
        "normalized_risk_score": 0.85,
        "stage": "FINANCIAL_ACTION",
        "verdict": ThreatVerdictValue.CRITICAL,
        "triggered_indicators": [{"code": "authority_claim"}, {"code": "payment_demand"}]
    }
    actions3 = policy.evaluate_verdict_and_authorize(db_session, "session-high", verdict3)
    types3 = [a.action_type for a in actions3]
    assert "BLOCK_UPI" in types3


def test_merkle_audit_chain_verification(db_session):
    # Clear preexisting events for verification test isolation
    db_session.query(AuditEvent).delete()
    db_session.commit()

    # 1. Log sequential actions
    AuditService.log_event(db_session, "analyst-01", "ANALYST", "CREATE_CASE", "case", "c-001", "SUCCESS", {"title": "Incident A"})
    AuditService.log_event(db_session, "analyst-01", "ANALYST", "ADD_NOTE", "note", "n-001", "SUCCESS", {"text": "Note content"})
    AuditService.log_event(db_session, "analyst-02", "ANALYST", "CLOSE_CASE", "case", "c-001", "SUCCESS", {"resolution": "Benign"})

    # Verify chain passes integrity validation
    assert AuditService.verify_chain(db_session) is True

    # 2. Deliberately tamper with the middle event payload details in the database
    middle_event = db_session.query(AuditEvent).filter(AuditEvent.action == "ADD_NOTE").first()
    middle_event.details_json = json.dumps({"text": "TAMPERED DATA DETAILS"})
    db_session.commit()

    # Verify Merkle chain validation detects tamper failure
    assert AuditService.verify_chain(db_session) is False


def test_session_deletion_tombstone(client, db_session):
    # Log session
    session = CommunicationSession(
        id="session-tombstone-1",
        channel="PHONE",
        citizen_identifier="+91-88888-99999",
        suspect_identifier="+91-22222-33333",
        status="ACTIVE"
    )
    db_session.add(session)
    db_session.commit()

    # Delete session via REST API
    res = client.delete("/api/v1/sessions/session-tombstone-1")
    assert res.status_code == 200

    # Assert tombstone log was emitted
    tombstone = db_session.query(AuditEvent).filter(
        AuditEvent.action == "DELETE_SESSION",
        AuditEvent.resource_id == "session-tombstone-1"
    ).first()
    assert tombstone is not None
    details = json.loads(tombstone.details_json)
    assert details["tombstone"] is True


def test_redaction_utility():
    # Mask phone
    assert redact_field("+91-99999-88888", "phone", enabled=True) == "+91-99999-XX888"
    assert redact_field("+91-99999-88888", "phone", enabled=False) == "+91-99999-88888"

    # Mask UPI
    assert redact_field("hacker@paytm", "upi", enabled=True) == "h***@paytm"
    
    # Mask Account
    assert redact_field("1234567890", "account", enabled=True) == "******7890"


def test_case_transitions(client, db_session):
    case = IncidentCase(
        id="case-transition-test",
        title="Test Transition Case",
        description="Verification transition checks.",
        severity="MEDIUM",
        status="NEW"
    )
    db_session.add(case)
    db_session.commit()

    # Legal transition NEW -> TRIAGE
    # Legal transition NEW -> TRIAGE
    res1 = client.patch("/api/v1/cases/case-transition-test/status?new_status=TRIAGE", headers={"X-Demo-Role": "Analyst"})
    assert res1.status_code == 200
    assert res1.json()["status"] == "TRIAGE"

    # Legal transition TRIAGE -> CLOSED
    res1b = client.patch("/api/v1/cases/case-transition-test/status?new_status=CLOSED", headers={"X-Demo-Role": "Analyst"})
    assert res1b.status_code == 200
    assert res1b.json()["status"] == "CLOSED"

    # Illegal transition CLOSED -> ESCALATED
    res2 = client.patch("/api/v1/cases/case-transition-test/status?new_status=ESCALATED", headers={"X-Demo-Role": "Analyst"})
    assert res2.status_code == 400
    assert "Illegal state transition" in res2.json()["detail"]
