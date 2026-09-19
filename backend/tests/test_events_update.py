import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_BOB_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_event_requires_auth(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    response = db_client.put(
        f"/api/v1/events/{owned.id}",
        json={
            "title": "Updated",
            "starts_at": "2026-09-10T10:00:00Z",
            "ends_at": "2026-09-10T12:00:00Z",
        },
    )
    assert response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_event_as_owner(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.put(
        f"/api/v1/events/{owned.id}",
        headers=auth_headers(token),
        json={
            "title": "Updated Title",
            "description": "New desc",
            "starts_at": "2026-09-10T10:00:00Z",
            "ends_at": "2026-09-10T12:00:00Z",
            "location": "会議室",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Updated Title"
    assert body["description"] == "New desc"
    assert body["location"] == "会議室"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_event_as_editor(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.put(
        f"/api/v1/events/{invited.id}",
        headers=auth_headers(token),
        json={
            "title": "Editor Update",
            "starts_at": "2026-09-15T18:00:00Z",
            "ends_at": "2026-09-15T20:00:00Z",
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Editor Update"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_event_forbidden_for_viewer(db_client: TestClient, sample_events: dict, db) -> None:
    from tests.conftest import _create_invited_event, _create_user

    charlie = _create_user(db, email="charlie@example.com", display_name="Charlie")
    bob = sample_events["bob"]
    event = _create_invited_event(
        db,
        owner=bob,
        invitee=charlie,
        title="Viewer Event",
        starts_at=sample_events["owned"].starts_at,
        ends_at=sample_events["owned"].ends_at,
        invitee_role="viewer",
    )
    token = login(db_client, email="charlie@example.com", password=TEST_USER_PASSWORD)

    response = db_client.put(
        f"/api/v1/events/{event.id}",
        headers=auth_headers(token),
        json={
            "title": "Blocked",
            "starts_at": "2026-09-10T10:00:00Z",
            "ends_at": "2026-09-10T12:00:00Z",
        },
    )

    assert response.status_code == 403


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_event_returns_404_for_non_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.put(
        f"/api/v1/events/{owned.id}",
        headers=auth_headers(token),
        json={
            "title": "Blocked",
            "starts_at": "2026-09-10T10:00:00Z",
            "ends_at": "2026-09-10T12:00:00Z",
        },
    )

    assert response.status_code == 404
