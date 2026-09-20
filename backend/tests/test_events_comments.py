import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_BOB_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_create_comment(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post(
        f"/api/v1/events/{owned.id}/comments",
        headers=auth_headers(token),
        json={"body": "New comment"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["body"] == "New comment"
    assert body["author"]["display_name"] == "Alice"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_own_comment(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)
    comments = db_client.get(f"/api/v1/events/{owned.id}/comments", headers=auth_headers(token)).json()
    comment_id = comments["items"][0]["id"]

    response = db_client.patch(
        f"/api/v1/events/{owned.id}/comments/{comment_id}",
        headers=auth_headers(token),
        json={"body": "Edited comment"},
    )

    assert response.status_code == 200
    assert response.json()["body"] == "Edited comment"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_delete_own_comment(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)
    comments = db_client.get(f"/api/v1/events/{owned.id}/comments", headers=auth_headers(token)).json()
    comment_id = comments["items"][0]["id"]

    response = db_client.delete(
        f"/api/v1/events/{owned.id}/comments/{comment_id}",
        headers=auth_headers(token),
    )

    assert response.status_code == 204


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_websocket_broadcasts_comment_created(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    with db_client.websocket_connect(f"/ws/events/{owned.id}?token={token}") as ws:
        response = db_client.post(
            f"/api/v1/events/{owned.id}/comments",
            headers=auth_headers(token),
            json={"body": "Realtime comment"},
        )
        assert response.status_code == 201
        message = ws.receive_json()
        assert message["type"] == "comment.created"
        assert message["payload"]["body"] == "Realtime comment"
