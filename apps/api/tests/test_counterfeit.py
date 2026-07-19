import pytest
import io
import os
from PIL import Image
from kavach_api.counterfeit import ClassicalNoteScanProvider
from kavach_domain.models import NoteScan

def test_classical_scan_provider_pipeline():
    provider = ClassicalNoteScanProvider()

    # 1. Create a dummy test image
    img = Image.new("RGB", (1200, 570), color=(120, 150, 180))
    # Add dummy EXIF metadata info dictionary
    exif_data = img.getexif()
    exif_data[271] = "Camera Prototype Vendor" # Make and model tag
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_data)
    img_bytes = buf.getvalue()

    # 2. Test metadata validation
    valid, err = provider.validate_metadata("image/jpeg", len(img_bytes))
    assert valid is True

    # 3. Test EXIF stripping
    sanitized = provider.sanitize_image(img_bytes)
    sanitized_img = Image.open(io.BytesIO(sanitized))
    # Assert EXIF tags are stripped and no longer present
    assert not sanitized_img.getexif()

    # 4. Test note analysis
    result = provider.analyze_note(sanitized)
    assert result["quality_score"] > 0.6
    assert result["verdict"] in ["LIKELY_GENUINE", "SUSPECT_COUNTERFEIT", "NEEDS_MANUAL_REVIEW"]


def test_quality_abstention_gate():
    provider = ClassicalNoteScanProvider()

    # Create a tiny 50x50 pixel image (low resolution blur)
    img = Image.new("RGB", (50, 50), color=(120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    result = provider.analyze_note(img_bytes)
    # Poor quality must route to manual review
    assert result["verdict"] == "NEEDS_MANUAL_REVIEW"
    assert result["quality_score"] < 0.5


def test_scan_unsupported_type_validation(client):
    # Upload unsupported format
    files = {"file": ("test.txt", b"plain text content", "text/plain")}
    res = client.post("/api/v1/counterfeit/scan", files=files)
    assert res.status_code == 400
    assert "Unsupported file type" in res.json()["detail"]


def test_scan_oversized_validation(client):
    # Upload file exceeding 8MB limit
    oversized_data = b"0" * (8 * 1024 * 1024 + 100)
    files = {"file": ("large.jpg", oversized_data, "image/jpeg")}
    res = client.post("/api/v1/counterfeit/scan", files=files)
    assert res.status_code == 400
    assert "exceeds maximum allowed limit" in res.json()["detail"]


def test_scan_image_deletion_privacy(client, db_session):
    img = Image.new("RGB", (800, 400), color=(120, 120, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    # Upload suspect note
    files = {"file": ("suspect.jpg", img_bytes, "image/jpeg")}
    res1 = client.post("/api/v1/counterfeit/scan", files=files)
    assert res1.status_code == 200
    
    scan_id = res1.json()["scan"]["scan_id"]
    image_path = res1.json()["image_path"]
    
    # Assert file is created on disk
    assert os.path.exists(image_path) is True

    # Delete original image
    res2 = client.delete(f"/api/v1/counterfeit/scan/{scan_id}/original")
    assert res2.status_code == 200

    # Assert image file is hard-deleted from disk
    assert os.path.exists(image_path) is False

    # Assert database path column is cleared
    scan_record = db_session.query(NoteScan).filter(NoteScan.id == scan_id).first()
    assert scan_record.image_path is None


def test_evaluation_splits_metrics(client):
    res = client.get("/api/v1/counterfeit/evaluation")
    assert res.status_code == 200
    data = res.json()
    assert "metrics_summary" in data
    assert "synthetic_perturbations_performance" in data["performance_splits"]
