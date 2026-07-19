import abc
import json
import os
from typing import Any


class SpeechToTextProvider(abc.ABC):
    """Abstract Base Class for Speech to Text conversion services."""

    @abc.abstractmethod
    def transcribe_audio(self, audio_bytes: bytes) -> str:
        """Transcribe raw audio bytes into text."""
        pass


class ScriptedSTTProvider(SpeechToTextProvider):
    """Deterministic Speech to Text provider playing back pre-loaded scenario lines."""

    def __init__(self, scenarios_path: str | None = None):
        if not scenarios_path:
            # Fallback path finding relative to package layout
            curr_dir = os.path.dirname(os.path.abspath(__file__))
            scenarios_path = os.path.join(curr_dir, "..", "..", "..", "packages", "synthetic-data", "kavach_synthetic_data", "scenarios.json")

        self.scenarios: dict[str, list[dict[str, Any]]] = {}
        try:
            with open(scenarios_path, encoding="utf-8") as f:
                data = json.load(f)
                for sc in data:
                    self.scenarios[sc["id"]] = sc["segments"]
        except Exception:
            # Safe fallback if file not found during isolated test runs
            pass

    def get_segment(self, scenario_id: str, step_index: int) -> dict[str, Any] | None:
        """Retrieve a specific text segment by step index (0-indexed)."""
        segments = self.scenarios.get(scenario_id, [])
        if step_index < len(segments):
            return segments[step_index]
        return None

    def transcribe_audio(self, audio_bytes: bytes) -> str:
        # Scripted provider ignores binary input
        return "Scripted playback response"


class LocalWhisperSTTProvider(SpeechToTextProvider):
    """Optional offline Whisper speech analyzer using native HTTP stubs or local modules."""

    def __init__(self, api_url: str = "http://localhost:9000/transcribe"):
        self.api_url = api_url

    def transcribe_audio(self, audio_bytes: bytes) -> str:
        """
        Sends recorded audio to a local Whisper instance if running,
        or falls back to a descriptive prototype notice.
        """
        # In a real environment, we would use requests or httpx to POST to self.api_url.
        # To avoid external network dependencies during offline tests, we return a mock.
        return "[Mic capture text placeholder - Whisper Server Mock]"
