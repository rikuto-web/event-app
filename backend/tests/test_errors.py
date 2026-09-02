from fastapi.testclient import TestClient


def test_not_found_returns_standard_error_json(client: TestClient) -> None:
    response = client.get("/api/v1/unknown-endpoint")

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "HTTP_ERROR"
    assert body["error"]["message"]
    assert body["error"]["details"] == []
