import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from kavach_api.main import app
from kavach_api.services.geospatial import GeospatialService
from kavach_domain.models import GeoEvent

client = TestClient(app)

def test_jitter_coordinates():
    lat = 28.6273
    lon = 77.3725
    
    j_lat, j_lon = GeospatialService.jitter_coordinates(lat, lon, amount=0.01)
    
    assert j_lat != lat
    assert j_lon != lon
    assert abs(j_lat - lat) <= 0.01
    assert abs(j_lon - lon) <= 0.01

def test_snap_to_grid():
    lat = 28.627341
    lon = 77.372589
    
    c_lat, c_lon = GeospatialService.snap_to_grid(lat, lon, precision=2)
    
    assert c_lat == 28.63
    assert c_lon == 77.37

def test_apply_privacy_transformation():
    # Coarsened
    event = GeoEvent(
        id="123",
        title="Test",
        description="Test",
        event_type="CALL_THREAT",
        latitude=28.6273,
        longitude=77.3725,
        timestamp=datetime.utcnow(),
        privacy_transformation="COARSENED",
        aggregation_level="WARD"
    )
    
    res = GeospatialService.apply_privacy_transformation(event)
    assert res["latitude"] == 28.63
    assert res["longitude"] == 77.37
    
    # None
    event2 = GeoEvent(
        id="456",
        title="Test",
        description="Test",
        event_type="NOTE_SCAN",
        latitude=28.6273,
        longitude=77.3725,
        timestamp=datetime.utcnow(),
        privacy_transformation="NONE",
        aggregation_level="RAW"
    )
    
    res2 = GeospatialService.apply_privacy_transformation(event2)
    assert res2["latitude"] == 28.6273
    assert res2["longitude"] == 77.3725

def test_api_map_events_endpoint(client, db_session):
    # Seed data for test
    event = GeoEvent(
        title="Test Threat",
        description="Test",
        event_type="CALL_THREAT",
        latitude=28.6,
        longitude=77.3,
        timestamp=datetime.utcnow()
    )
    db_session.add(event)
    db_session.commit()

    now = datetime.utcnow().timestamp()
    start_time = now - 3600*24 # 24h ago
    
    response = client.get(f"/api/v1/intelligence/map?start_time={start_time}&end_time={now}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Check fields
    first = data[0]
    assert "latitude" in first
    assert "longitude" in first
    assert "privacy_transformation" in first

def test_api_map_hotspots_endpoint(client, db_session):
    # Seed enough events to pass the MINIMUM_COUNT_THRESHOLD (3)
    for i in range(4):
        event = GeoEvent(
            title=f"Test Threat {i}",
            description="Test",
            event_type="CALL_THREAT",
            latitude=28.6273,
            longitude=77.3725,
            timestamp=datetime.utcnow()
        )
        db_session.add(event)
    db_session.commit()

    now = datetime.utcnow().timestamp()
    start_time = now - 3600*24
    
    response = client.get(f"/api/v1/intelligence/map/hotspots?start_time={start_time}&end_time={now}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    
    # Should have event_count, score, and explanation
    if len(data) > 0:
        first = data[0]
        assert "event_count" in first
        assert first["event_count"] >= GeospatialService.MINIMUM_COUNT_THRESHOLD
        assert "hotspot_score" in first
        assert "explanation" in first
