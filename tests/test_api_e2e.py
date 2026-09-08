from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

# The application creates its PostgreSQL engine during import. Keep collection
# explicit when a developer has not installed the backend requirements yet.
pytest.importorskip("psycopg")

from app.api.routers import admin_fetch_tickets
from app.database.postgres.database import get_db
from app.main import app
from app.services.oauth2 import get_current_admin


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return self.rows


class FakeDatabase:
    def __init__(self, rows):
        self.rows = rows

    def query(self, *args, **kwargs):
        return FakeQuery(self.rows)


@pytest.fixture
def admin_client():
    admin = SimpleNamespace(id=1, role="Admin")
    app.dependency_overrides[get_current_admin] = lambda: admin
    app.dependency_overrides[get_db] = lambda: FakeDatabase([])
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_health_endpoint_is_available(admin_client):
    response = admin_client.get("/model/health")

    assert response.status_code == 200
    assert response.json()["status"] in {"Healthy", "Unavailable"}


def test_analyze_incidents_returns_empty_result_without_tickets(admin_client):
    response = admin_client.get("/admin/tickets/analyze_incidents")

    assert response.status_code == 200
    assert response.json() == {
        "potential_incidents_detected": False,
        "clusters": [],
    }


def test_analyze_incidents_returns_structured_huggingface_result(admin_client, monkeypatch):
    ticket = SimpleNamespace(
        id=42,
        status="QUEUED",
        subject="API unavailable",
        body="Requests return 503",
        user_id=7,
    )
    app.dependency_overrides[get_db] = lambda: FakeDatabase([ticket])

    fake_response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content='{"potential_incidents_detected": true, "clusters": [{"incident_title": "API outage", "description": "Shared 503 errors", "affected_regions": ["Unknown"], "ticket_ids": [42]}]}'
                )
            )
        ]
    )
    monkeypatch.setattr(
        admin_fetch_tickets.hf_client,
        "chat_completion",
        lambda **kwargs: fake_response,
    )

    response = admin_client.get("/admin/tickets/analyze_incidents")

    assert response.status_code == 200
    assert response.json()["clusters"][0]["ticket_ids"] == [42]


def test_analyze_incidents_exposes_inference_failure_as_http_500(admin_client, monkeypatch):
    ticket = SimpleNamespace(
        id=43,
        status="QUEUED",
        subject="API unavailable",
        body="Requests return 503",
        user_id=8,
    )
    app.dependency_overrides[get_db] = lambda: FakeDatabase([ticket])
    monkeypatch.setattr(
        admin_fetch_tickets.hf_client,
        "chat_completion",
        lambda **kwargs: (_ for _ in ()).throw(RuntimeError("provider unavailable")),
    )

    response = admin_client.get("/admin/tickets/analyze_incidents")

    assert response.status_code == 500
    assert "provider unavailable" in response.json()["detail"]


def test_processed_ticket_payload_contains_cache_summary():
    ticket = SimpleNamespace(
        id=80,
        thread_id="ticket_thread_80",
        user_id=7,
        subject="Cannot access API",
        body="The API returns 503.",
        account_tier="Standard",
        status="PROCESSED",
        department="IT Support",
        confidence=0.965,
        priority="High",
        retrieved_docs=[],
        retries=0,
        eval_confidence=None,
        has_hallucinations=False,
        grounding_source_ids=[],
        eval_feedback=None,
        tags=["api", "outage"],
        extracted_keywords=[],
        telemetry_data={
            "semantic_cache": {
                "cache_hit": True,
                "matched_ticket_id": 123,
                "similarity_score": 0.965,
                "department": "IT Support",
                "tags": ["api", "outage"],
                "resolution": "Restart the API gateway.",
            }
        },
        ai_draft={"resolution": "Restart the API gateway."},
        human_decision="CACHE_HIT",
        human_edited_text=None,
        created_at=None,
        updated_at=None,
        initial_latency=None,
        total_latency=None,
        latency=None,
        final_response_text="Restart the API gateway.",
        resolved_by=None,
        troubleshooting_steps=[],
        solution=None,
        root_cause=None,
        owner=SimpleNamespace(
            id=7,
            email="customer@example.com",
            name="Customer",
            business_name="Example Co",
            account_tier="Standard",
        ),
    )

    payload = admin_fetch_tickets._serialize_admin_ticket(ticket)

    assert payload["status"] == "PROCESSED"
    assert payload["cache_hit"] is True
    assert payload["semantic_cache"]["matched_ticket_id"] == 123
    assert payload["semantic_cache"]["similarity_score"] == 0.965
    assert payload["semantic_cache"]["resolution"] == "Restart the API gateway."
