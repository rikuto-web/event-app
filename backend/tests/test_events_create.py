import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import Event, EventMember
from tests.conftest import TEST_ALICE_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login

CREATE_PAYLOAD = {
    "title": "新しい勉強会",
    "description": "SolidJS 入門",
    "starts_at": "2026-09-10T10:00:00Z",
    "ends_at": "2026-09-10T12:00:00Z",
    "location": "オンライン",
}


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_create_event_requires_auth(db_client: TestClient) -> None:
    response = db_client.post("/api/v1/events", json=CREATE_PAYLOAD)

    assert response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_create_event_returns_201_with_owner_role(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post("/api/v1/events", json=CREATE_PAYLOAD, headers=auth_headers(token))

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == CREATE_PAYLOAD["title"]
    assert body["description"] == CREATE_PAYLOAD["description"]
    assert body["location"] == CREATE_PAYLOAD["location"]
    assert body["my_role"] == "owner"
    assert "id" in body


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_create_event_persists_owner_membership(db_client: TestClient, db, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)
    alice = sample_events["alice"]

    response = db_client.post("/api/v1/events", json=CREATE_PAYLOAD, headers=auth_headers(token))

    assert response.status_code == 201
    event_id = response.json()["id"]

    event = db.get(Event, event_id)
    assert event is not None
    assert event.owner_id == alice.id

    membership = db.execute(
        select(EventMember).where(
            EventMember.event_id == event_id,
            EventMember.user_id == alice.id,
        )
    ).scalar_one()
    assert membership.role == "owner"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_create_event_returns_422_when_ends_before_starts(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post(
        "/api/v1/events",
        json={
            **CREATE_PAYLOAD,
            "starts_at": "2026-09-10T12:00:00Z",
            "ends_at": "2026-09-10T10:00:00Z",
        },
        headers=auth_headers(token),
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_create_event_appears_in_list(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    create_response = db_client.post("/api/v1/events", json=CREATE_PAYLOAD, headers=auth_headers(token))
    assert create_response.status_code == 201

    list_response = db_client.get("/api/v1/events?role=owner", headers=auth_headers(token))
    titles = {item["title"] for item in list_response.json()["items"]}
    assert CREATE_PAYLOAD["title"] in titles
