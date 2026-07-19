import re
from typing import Any

from kavach_domain.models import TranscriptSegment
from kavach_domain.schemas import ThreatVerdictValue

# Threat indicators metadata definition
INDICATORS_METADATA = {
    "authority_claim": {"name": "Authority Impersonation Claim", "severity": "HIGH", "desc": "Claiming official status like Police, Customs, or CBI."},
    "fabricated_case": {"name": "Fabricated Case Accusation", "severity": "HIGH", "desc": "Accusing target of drug trafficking or contraband smuggling."},
    "secrecy_instruction": {"name": "Secrecy Instruction", "severity": "HIGH", "desc": "Ordering target not to discuss the call with family or bank."},
    "isolation_instruction": {"name": "Isolation / Lockup demand", "severity": "HIGH", "desc": "Ordering target to lock doors or go to a private room."},
    "continuous_video_control": {"name": "Continuous Video Surveillance", "severity": "CRITICAL", "desc": "Demanding Skype / Zoom video call keep camera active."},
    "urgency_pressure": {"name": "Extreme Urgency Pressure", "severity": "HIGH", "desc": "Demanding compliance within minutes to avoid arrest."},
    "payment_demand": {"name": "Coercive Payment Demand", "severity": "CRITICAL", "desc": "Instructing target to transfer money immediately."},
    "safe_account_claim": {"name": "Safe Verification Account Claim", "severity": "CRITICAL", "desc": "Asserting the destination account is a safe government vault."},
    "remote_app_request": {"name": "Remote Access Request", "severity": "CRITICAL", "desc": "Instructing user to download AnyDesk / RustDesk software."},
    "credential_request": {"name": "Sensitive Credential Request", "severity": "CRITICAL", "desc": "Demanding password, credit card number, or OTP codes."},
    "threat_of_arrest": {"name": "Threat of Arrest / Action", "severity": "CRITICAL", "desc": "Threatening digital arrest or jail time if citizen hangs up."},
    "family_contact_prevention": {"name": "Family Contact Prevention", "severity": "HIGH", "desc": "Instructing target not to contact relatives or colleagues."}
}

# Regex pattern mapping for multilingual detection
LEXICONS = {
    "authority_claim": [
        r"\bcbi\b", r"\bpolice\b", r"\bcustoms\b", r"\binspector\b", r"\bofficer\b",
        r"\bcyber cell\b", r"\bhq delhi\b", r"dhara\b", r"\bheadquarters\b"
    ],
    "fabricated_case": [
        r"\bdrug\b", r"\bparcel\b", r"\bmoney laundering\b", r"\bpassport\b",
        r"\bcontraband\b", r"\billegal\b", r"maadak padarth\b"
    ],
    "secrecy_instruction": [
        r"\bsecrecy\b", r"\bgopaniya\b", r"\bkisi ko bataya\b", r"\bdont tell anyone\b",
        r"\bdont disclose\b", r"\bgopniya\b"
    ],
    "isolation_instruction": [
        r"\block\b", r"\bprivate room\b", r"\bkamra\b", r"\b दरवाजा band\b", r"\bdoor\b"
    ],
    "continuous_video_control": [
        r"\bskype\b", r"\bzoom\b", r"\bcamera\b", r"\bvideo call\b", r"\bvedio\b"
    ],
    "urgency_pressure": [
        r"\b10 minutes\b", r"\b15 minutes\b", r"\bventane\b", r"\binikey\b", r"\bjaldi\b",
        r"\bimmediately\b", r"\bnow\b", r"\bhurry\b"
    ],
    "payment_demand": [
        r"\btransfer\b", r"\bpay\b", r"\bupi\b", r"\bdeposit\b", r"\bpampinchandi\b",
        r"\bsend\b", r"\btransacted\b"
    ],
    "safe_account_claim": [
        r"\bsafe\b", r"\bclearance\b", r"\bverification\b", r"\bgovernment account\b",
        r"\bsuraksha\b"
    ],
    "remote_app_request": [
        r"\banydesk\b", r"\brustdesk\b", r"\bteamviewer\b", r"\bremote\b"
    ],
    "credential_request": [
        r"\botp\b", r"\bpassword\b", r"\bcvv\b", r"\bpin\b", r"\bcard details\b"
    ],
    "threat_of_arrest": [
        r"\barrest\b", r"\bwarrant\b", r"\bjail\b", r"\bdigital arrest\b", r"\bpolice station\b"
    ],
    "family_contact_prevention": [
        r"\bdont call family\b", r"\bghar walo\b", r"\bphone mat katna\b"
    ]
}

# De-escalation signal patterns (Benign queries that suppress severity)
COUNTER_EVIDENCE = {
    "physical_visit_check": [
        r"\bpolice station aa jata hoon\b", r"\bwill visit the branch\b",
        r"\bvisit in person\b", r"\bdirectly go to office\b"
    ],
    "standard_balance_query": [
        r"\bcheck my balance\b", r"\bhow many points\b", r"\bgrace period\b"
    ],
    "official_support_portal": [
        r"\bofficial app\b", r"\bofficial website\b", r"\bvalid support portal\b"
    ]
}


class KavachRiskEngine:
    """Multilingual streaming coercion detection rules engine."""

    def __init__(self):
        # Versioning settings
        self.rules_version = "1.2.0"
        self.engine_version = "2.1.0"
        # Configurable severity bounds
        self.threshold_suspicious = 0.40
        self.threshold_critical = 0.80

    def evaluate_session(self, segments: list[TranscriptSegment]) -> dict[str, Any]:
        """
        Evaluate full session rolling history.
        Detects combinations of indicators, processes counter-evidence,
        and outputs a calibrated threat verdict.
        """
        triggered_indicators: list[dict[str, Any]] = []
        counter_signals_found: list[str] = []

        # Find indicators across segments
        for seg in segments:
            text_lower = seg.text.lower()

            # 1. Match Threat Indicators
            for code, patterns in LEXICONS.items():
                for pat in patterns:
                    if re.search(pat, text_lower):
                        # Ensure we don't repeat the indicator for the same code
                        if not any(t["code"] == code for t in triggered_indicators):
                            meta = INDICATORS_METADATA[code]
                            triggered_indicators.append({
                                "code": code,
                                "name": meta["name"],
                                "severity": meta["severity"],
                                "matched_segment_id": seg.id,
                                "matched_text": seg.text,
                                "explanation": meta["desc"]
                            })
                        break

            # 2. Match De-escalation counter-evidence
            for code, patterns in COUNTER_EVIDENCE.items():
                for pat in patterns:
                    if re.search(pat, text_lower):
                        if code not in counter_signals_found:
                            counter_signals_found.append(code)
                        break

        # Calculate raw risk score based on triggered weights
        # Critical severity gets 0.4, High gets 0.25
        score = 0.0
        for ind in triggered_indicators:
            if ind["severity"] == "CRITICAL":
                score += 0.40
            else:
                score += 0.25

        # Apply counter-evidence de-escalation discount (subtract 0.35 per counter evidence)
        for _ in counter_signals_found:
            score -= 0.35

        score = max(0.0, min(1.0, score))

        # Determine state progression stage
        # Stage bounds: NORMAL -> CONCERN -> COERCION -> FINANCIAL_ACTION
        stage = "NORMAL"
        indicator_codes = [t["code"] for t in triggered_indicators]

        if len(triggered_indicators) > 0:
            stage = "CONCERN"

        # Check for coercion: severe indicators or 3+ indicators
        has_coercion_indicators = any(c in indicator_codes for c in ["threat_of_arrest", "continuous_video_control", "isolation_instruction"])
        if len(triggered_indicators) >= 3 or has_coercion_indicators:
            stage = "COERCION"

        # Check for financial action: active coercion + payment demand or safe account claim
        has_financial_indicators = any(c in indicator_codes for c in ["payment_demand", "safe_account_claim", "credential_request"])
        if stage == "COERCION" and has_financial_indicators:
            stage = "FINANCIAL_ACTION"

        # Assign verdict classification based on thresholds
        # Critical severity requires either stage FINANCIAL_ACTION or score >= threshold
        if stage == "FINANCIAL_ACTION" or score >= self.threshold_critical:
            verdict_val = ThreatVerdictValue.CRITICAL
            action = "BLOCK_UPI_TRANSACTION"
        elif score >= self.threshold_suspicious:
            verdict_val = ThreatVerdictValue.SUSPICIOUS
            action = "WARN_CITIZEN"
        else:
            verdict_val = ThreatVerdictValue.SAFE
            action = "NONE"

        # Resolve scam type classification based on dominant categories
        scam_type = "NONE"
        if verdict_val != ThreatVerdictValue.SAFE:
            if "continuous_video_control" in indicator_codes or "threat_of_arrest" in indicator_codes:
                scam_type = "DIGITAL_ARREST"
            elif "fabricated_case" in indicator_codes:
                scam_type = "COURIER_SCAM"
            elif "credential_request" in indicator_codes:
                scam_type = "KYC_FRAUD"
            else:
                scam_type = "UNKNOWN"

        # Calculate a placeholder calibrated confidence metric (separate from severity/score)
        # Driven by the count of indicators
        confidence = min(0.5 + (len(triggered_indicators) * 0.1), 1.0)
        if len(triggered_indicators) == 0:
            confidence = 1.0

        return {
            "verdict": verdict_val,
            "scam_type": scam_type,
            "confidence": confidence,
            "normalized_risk_score": score,
            "stage": stage,
            "triggered_indicators": triggered_indicators,
            "recommended_action": action,
            "rules_version": self.rules_version,
            "engine_version": self.engine_version,
            "counter_evidence_signals": counter_signals_found
        }
