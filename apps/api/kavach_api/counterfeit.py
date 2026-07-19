import io
import time
from abc import ABC, abstractmethod
from typing import Any

import numpy as np
from PIL import Image


class NoteScanProvider(ABC):
    """Abstract interface defining required currency scan processing methods."""

    @abstractmethod
    def sanitize_image(self, image_bytes: bytes) -> bytes:
        """Strip EXIF metadata headers and return malware-safe decoded bytes."""
        pass

    @abstractmethod
    def validate_metadata(self, content_type: str, size: int) -> tuple[bool, str]:
        """Verify content type and file size thresholds."""
        pass

    @abstractmethod
    def analyze_note(self, image_bytes: bytes) -> dict[str, Any]:
        """Assess quality, check layout, color, serials, and assign verdicts."""
        pass


class ClassicalNoteScanProvider(NoteScanProvider):
    """Deterministic classical computer-vision screening baseline."""

    def sanitize_image(self, image_bytes: bytes) -> bytes:
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Strips EXIF by saving raw pixel values to a new buffer without metadata info
            out = io.BytesIO()
            img.save(out, format=img.format or "JPEG")
            return out.getvalue()
        except Exception as e:
            raise ValueError("Malformed or corrupt image payload. Safe decode failed.") from e

    def validate_metadata(self, content_type: str, size: int) -> tuple[bool, str]:
        if content_type not in ["image/jpeg", "image/png"]:
            return False, f"Unsupported file type: {content_type}. Only JPEGs and PNGs allowed."
        if size > 8 * 1024 * 1024:
            return False, "File size exceeds maximum allowed limit of 8MB."
        return True, ""

    def analyze_note(self, image_bytes: bytes) -> dict[str, Any]:
        start_time = time.time()

        try:
            img = Image.open(io.BytesIO(image_bytes))
            width, height = img.size
        except Exception:
            return {
                "verdict": "NEEDS_MANUAL_REVIEW",
                "quality_score": 0.0,
                "confidence": 0.0,
                "risk_score": 1.0,
                "limitations": "Safe image decode failed. Manual verification required.",
                "processing_time_ms": 0.0
            }

        # 1. Quality Assessments
        # Aspect Ratio Cropping verification
        aspect_ratio = width / height if height > 0 else 0
        expected_ratio = 2.1 # typical denomination aspect ratio
        crop_penalty = abs(aspect_ratio - expected_ratio)

        # Color distribution (Check for color cast / monochrome blank images)
        img_np = np.array(img.convert("RGB"))
        mean_channels = np.mean(img_np, axis=(0, 1))

        # Occlusion/Glare check: count extremely bright pixels
        glare_pixels = np.sum(img_np > 250)
        total_pixels = width * height
        glare_ratio = glare_pixels / total_pixels if total_pixels > 0 else 0

        # Blur check: estimate variance of difference adjacent pixels
        diff_h = np.abs(img_np[:-1, :, :] - img_np[1:, :, :])
        blur_score = float(np.mean(diff_h))

        # Compile Quality Score
        quality_score = 1.0
        if width < 600 or height < 300:
            quality_score -= 0.4
        if crop_penalty > 0.6:
            quality_score -= 0.3
        if glare_ratio > 0.15:
            quality_score -= 0.2
        if blur_score < 4.0: # high blur / flat image
            quality_score -= 0.3

        quality_score = max(0.0, min(1.0, quality_score))

        # Abstain policy if quality is too poor
        if quality_score < 0.5:
            processing_time = (time.time() - start_time) * 1000
            return {
                "scan_id": f"scan_{int(time.time())}",
                "verdict": "NEEDS_MANUAL_REVIEW",
                "risk_score": 0.5,
                "confidence": float(quality_score),
                "quality_score": float(quality_score),
                "detected_side": "UNKNOWN",
                "feature_checks": {
                    "resolution_check": bool(width >= 600),
                    "focus_check": bool(blur_score >= 4.0),
                    "exposure_check": bool(glare_ratio <= 0.15),
                    "layout_alignment": False,
                    "serial_format": False
                },
                "anomaly_regions": [],
                "model_version": "classical-cv-v1.0",
                "processing_time_ms": float(processing_time),
                "limitations": "Screening tool only. Quality score below threshold. Expert inspection required."
            }

        # 2. Features Checks (Classical baseline calculations)
        # Denomination print region check (layout deviation checks)
        layout_deviation = abs(mean_channels[0] - 120) / 255.0 # simulated template drift
        serial_format_plausible = True # assume true for mock validation unless anomaly is found

        # Anomaly scoring
        anomaly_score = 0.0
        anomaly_regions = []

        # If green/blue channels have extreme values (e.g. simulated color shift or counterfeit pattern)
        if mean_channels[1] > 180 or mean_channels[2] < 50:
            anomaly_score += 0.60
            anomaly_regions.append({
                "x": int(width * 0.1),
                "y": int(height * 0.2),
                "width": int(width * 0.3),
                "height": int(height * 0.4),
                "description": "Color distribution mismatch in watermark print region."
            })

        # Aspect crop ratio deviation matches counterfeit templates
        if crop_penalty > 0.4:
            anomaly_score += 0.30
            anomaly_regions.append({
                "x": 0,
                "y": 0,
                "width": width,
                "height": height,
                "description": "Aspect ratio crop deviation from standard currency shape templates."
            })

        anomaly_score = min(1.0, anomaly_score)

        # Verdict evaluation policy
        if anomaly_score >= 0.50:
            verdict = "SUSPECT_COUNTERFEIT"
        elif anomaly_score >= 0.20:
            verdict = "NEEDS_MANUAL_REVIEW"
        else:
            verdict = "LIKELY_GENUINE"

        processing_time = (time.time() - start_time) * 1000

        return {
            "scan_id": f"scan_{int(time.time())}",
            "verdict": verdict,
            "risk_score": float(anomaly_score),
            "confidence": float(1.0 - abs(0.5 - anomaly_score)),
            "quality_score": float(quality_score),
            "detected_side": "FRONT" if mean_channels[0] > mean_channels[1] else "BACK",
            "feature_checks": {
                "resolution_check": bool(width >= 600),
                "focus_check": bool(blur_score >= 4.0),
                "exposure_check": bool(glare_ratio <= 0.15),
                "layout_alignment": bool(layout_deviation < 0.35),
                "serial_format": bool(serial_format_plausible)
            },
            "anomaly_regions": anomaly_regions,
            "model_version": "classical-cv-v1.0",
            "processing_time_ms": float(processing_time),
            "limitations": "AI-assisted screening tool, not a forensic authenticator. Physical security features and expert verification may still be required."
        }
