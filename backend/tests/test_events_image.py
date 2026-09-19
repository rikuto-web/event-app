import io

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login

MINIMAL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_upload_event_image(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post(
        f"/api/v1/events/{owned.id}/image",
        headers=auth_headers(token),
        files={"file": ("test.png", io.BytesIO(MINIMAL_PNG), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["image_url"] is not None
    assert body["image_url"].startswith("http")


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_upload_event_image_rejects_large_file(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)
    large = b"x" * (5 * 1024 * 1024 + 1)

    response = db_client.post(
        f"/api/v1/events/{owned.id}/image",
        headers=auth_headers(token),
        files={"file": ("large.png", io.BytesIO(large), "image/png")},
    )

    assert response.status_code == 422
