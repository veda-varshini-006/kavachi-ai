import uuid
from typing import Any

from kavach_domain.models import InterventionAction
from sqlalchemy.orm import Session


class InterventionPolicyEngine:
    """Policy validation engine separating threat engine outputs from intervention authorization."""

    def __init__(self):
        self.policy_version = "3.2.0"
        self.authorized_by = "policy_engine_v3"

    def evaluate_verdict_and_authorize(
        self,
        db: Session,
        session_id: str,
        verdict: dict[str, Any],
        actor: str = "threat_engine"
    ) -> list[InterventionAction]:
        """
        Evaluate threat verdict parameters and authorize simulated actions.
        Enforces separate policy gating logic before committing actions.
        """
        authorized_actions = []

        risk_score = verdict["normalized_risk_score"]
        stage = verdict["stage"]
        triggered_codes = [ind["code"] for ind in verdict["triggered_indicators"]]

        # 1. SOC Alert Policy: Triggered for SUSPICIOUS or CRITICAL verdicts
        if risk_score >= 0.40 or len(triggered_codes) >= 1:
            soc_action = self._create_or_find_action(
                db, session_id, "ALERT_SOC",
                reason=f"Risk score {risk_score} above warning threshold.",
                verdict_val=verdict["verdict"].value,
                actor=actor
            )
            if soc_action:
                authorized_actions.append(soc_action)

        # 2. Citizen Warning Policy: Triggered if score >= 0.50
        if risk_score >= 0.50:
            warn_action = self._create_or_find_action(
                db, session_id, "ALERT_CITIZEN",
                reason=f"High coercion markers: {', '.join(triggered_codes)}.",
                verdict_val=verdict["verdict"].value,
                actor=actor
            )
            if warn_action:
                authorized_actions.append(warn_action)

        # 3. Simulated UPI Outflow Hold Policy: Triggered ONLY on CRITICAL stage/score
        # Requires either stage FINANCIAL_ACTION OR risk score >= 0.80 OR severe-indicator presence
        has_severe_indicator = any(c in triggered_codes for c in ["threat_of_arrest", "continuous_video_control"])

        if stage == "FINANCIAL_ACTION" or risk_score >= 0.80 or (risk_score >= 0.60 and has_severe_indicator):
            upi_action = self._create_or_find_action(
                db, session_id, "BLOCK_UPI",
                reason="Simulated UPI Outflow Hold: extreme coercion risk detected.",
                verdict_val=verdict["verdict"].value,
                actor=actor
            )
            if upi_action:
                authorized_actions.append(upi_action)

        return authorized_actions

    def _create_or_find_action(
        self,
        db: Session,
        session_id: str,
        action_type: str,
        reason: str,
        verdict_val: str,
        actor: str
    ) -> InterventionAction | None:
        """Helper to create and authorize a new InterventionAction safely."""
        # Prevent duplicates for the same session and type unless reversed
        existing = db.query(InterventionAction).filter(
            InterventionAction.session_id == session_id,
            InterventionAction.action_type == action_type,
            InterventionAction.status != "REVERSED"
        ).first()

        if existing:
            return existing

        action = InterventionAction(
            session_id=session_id,
            action_type=action_type,
            status="COMPLETED", # "COMPLETED" is mock-exec state
            requested_by=actor,
            authorized_by=self.authorized_by,
            policy_version=self.policy_version,
            trigger_verdict=verdict_val,
            idempotency_key=str(uuid.uuid4()),
            reason=reason,
            reversal_link=f"/api/v1/sessions/{session_id}/reversals/{action_type}"
        )
        db.add(action)
        db.commit()
        db.refresh(action)
        return action
