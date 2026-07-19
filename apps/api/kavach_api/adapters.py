import abc
import re
from typing import Any

# Regex signatures for prompt injection detection
INJECTION_SIGNATURES = [
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"forget\s+(?:your\s+)?rules",
    r"you\s+are\s+now\s+a\s+helpful\s+assistant",
    r"change\s+(?:your\s+)?system\s+prompt",
    r"override\s+(?:the\s+)?formatting",
    r"expose\s+(?:your\s+)?secrets",
    r"delete\s+all\s+database\s+tables"
]


class ThreatModelProvider(abc.ABC):
    """Abstract interface for optional large language models (LLM) risk reasoners."""

    @abc.abstractmethod
    def evaluate_text(self, text: str) -> dict[str, Any] | None:
        """Evaluate text transcript and return structured risk json."""
        pass


class LocalLLMThreatModelProvider(ThreatModelProvider):
    """Local reasoning adapter model with built-in prompt injection filters."""

    def __init__(self, model_name: str = "mock-reasoner-v1"):
        self.model_name = model_name

    def check_injection(self, text: str) -> bool:
        """Scan transcript text for malicious prompt injection commands."""
        text_lower = text.lower()
        return any(re.search(sig, text_lower) for sig in INJECTION_SIGNATURES)

    def evaluate_text(self, text: str) -> dict[str, Any] | None:
        """Evaluate clean transcript text segment."""
        if self.check_injection(text):
            # Injection detected - return validation block to drop it safely
            return {
                "injected": True,
                "verdict": "SAFE",
                "scam_type": "NONE",
                "risk_score": 0.0,
                "explanation": "Malicious command injection attempt blocked."
            }

        # Safe mock response conforming to schema
        return {
            "injected": False,
            "verdict": "SAFE",
            "scam_type": "NONE",
            "risk_score": 0.1,
            "explanation": "Text analysed clean by Local LLM."
        }
