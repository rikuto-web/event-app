import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_participation(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.put(
        f"/api/v1/events/{owned.id}/participation",
        headers=auth_headers(token),
        json={"status": "not_going"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["my_participation"] == "not_going"
    assert body["participation_summary"]["going"] == 0


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_websocket_broadcasts_participation_updated(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    with db_client.websocket_connect(f"/ws/events/{owned.id}?token={token}") as ws:
        response = db_client.put(
            f"/api/v1/events/{owned.id}/participation",
            headers=auth_headers(token),
            json={"status": "maybe"},
        )
        assert response.status_code == 200
        message = ws.receive_json()
        assert message["type"] == "participation.updated"
        assert message["payload"]["status"] == "maybe"
