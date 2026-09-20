import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_BOB_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_websocket_rejects_non_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    with pytest.raises(Exception):
        with db_client.websocket_connect(f"/ws/events/{owned.id}?token={token}"):
            pass


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_websocket_accepts_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    with db_client.websocket_connect(f"/ws/events/{owned.id}?token={token}") as ws:
        ws.send_text("ping")


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_websocket_broadcasts_event_updated(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    with db_client.websocket_connect(f"/ws/events/{owned.id}?token={token}") as ws:
        response = db_client.put(
            f"/api/v1/events/{owned.id}",
            headers=auth_headers(token),
            json={
                "title": "WS Updated",
                "starts_at": "2026-09-10T10:00:00Z",
                "ends_at": "2026-09-10T12:00:00Z",
            },
        )
        assert response.status_code == 200
        message = ws.receive_json()
        assert message["type"] == "event.updated"
        assert message["payload"]["title"] == "WS Updated"
