import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
import os

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "degraded", "unhealthy"]
    assert "database" in data
    assert data["database"] in ["connected", "disconnected", "error", "unknown"]

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "endpoints" in data

def test_create_test_set(client):
    payload = {
        "name": "Test Set Creation",
        "description": "A test set for unit testing",
        "test_cases": [
            {
                "name": "Test Case 1",
                "input": {"prompt": "Hello"},
                "output": {"expected_response": "Hi"},
                "difficulty": "easy",
                "category": "greeting"
            }
        ],
        "tags": ["test"]
    }
    response = client.post("/api/v1/evaluations/test-sets", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "test_set" in data
    assert data["test_set"]["name"] == "Test Set Creation"

def test_store_preference(client):
    payload = {
        "session_id": "test_session_2",
        "user_message": "Tell me more.",
        "response_1": "It scatters short waves.",
        "response_2": "Blue light is scattered more.",
        "choice": "response_1",
        "user_id": "test_user_2"
    }
    response = client.post("/api/store-preference", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "preference_id" in data["data"]

# Optional: Test Dual Response if API Key is present
@pytest.mark.asyncio
async def test_dual_responses_structure(client):
    # This tests input validation, not the full stream without API key
    payload = {
        "chat_history": [
            {"role": "user", "content": "Hello"}
        ],
        "user_message": "Tell me a joke",
        "user_id": "test_user_3",
        "session_id": "test_session_3",
        "chat_id": "test_chat_3"
    }
    
    if not os.getenv("GOOGLE_API_KEY") and not settings.google_api_key:
         pytest.skip("GOOGLE_API_KEY not set")

    # Note: TestClient.stream returns a context manager
    with client.stream("POST", "/api/dual-responses", json=payload) as response:
        assert response.status_code == 200
        # We can try to read the first chunk
        for line in response.iter_lines():
            if line:
                assert line.startswith("data: ")
                break
