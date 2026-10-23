"""Health check and foundational API tests."""
def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "healthy"
    assert payload["data"]["database"] == "connected"
    assert payload["data"]["version"] == "1.0.0"
    assert payload["data"]["timezone"] == "Asia/Kolkata"


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    payload = response.json()
    assert "health" in payload
    assert payload["health"] == "/api/v1/health"
