import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from kavach_synthetic_data.generator import seed_db, GOLDEN_SESSION_ID, GOLDEN_CASE_ID


def test_health_check(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_system_status(client: TestClient):
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"
    assert "components" in response.json()


def test_api_seeding_and_crud(client: TestClient, db_session: Session):
    # Seed DB via dev route
    seed_res = client.post("/api/v1/dev/seed")
    assert seed_res.status_code == 200

    case_res = client.get("/api/v1/cases", headers={"X-Demo-Role": "Analyst"})
    assert case_res.status_code == 200

    # Get session details
    session_res = client.get(f"/api/v1/sessions/{GOLDEN_SESSION_ID}")
    assert session_res.status_code == 200
    assert session_res.json()["citizen_identifier"] == "+91-98765-43210"

    # Get case details
    case_res = client.get(f"/api/v1/cases/{GOLDEN_CASE_ID}", headers={"X-Demo-Role": "Analyst"})
    assert case_res.status_code == 200
    assert case_res.json()["case"]["title"] == "Active Bank Impersonation Scam Case"

    # Get graph
    graph_res = client.get("/api/v1/intelligence/graph")
    assert graph_res.status_code == 200
    assert len(graph_res.json()["nodes"]) >= 5
    assert len(graph_res.json()["links"]) >= 4

    # Get map
    map_res = client.get("/api/v1/intelligence/map")
    assert map_res.status_code == 200
    assert len(map_res.json()) >= 3
