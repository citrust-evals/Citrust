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
    assert data["status"] == "healthy"
    assert data["database_sync"] == "connected"
    # Async might not be fully reflected in health check if not awaited properly in lifespan 
    # but TestClient lifespan support handles async startup.
    assert data["database_async"] == "connected"

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "endpoints" in data

def test_submit_evaluation(client):
    payload = {
        "chat_history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"}
        ],
        "exact_turn": "Hi there",
        "thumbs": "up",
        "user_id": "test_user_1",
        "session_id": "test_session_1",
        "chat_id": "test_chat_1"
    }
    response = client.post("/api/v1/evaluation", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "evaluation_id" in data

def test_store_preference(client):
    payload = {
        "user_id": "test_user_2",
        "session_id": "test_session_2",
        "chat_id": "test_chat_2",
        "chat_history": [
            {"role": "user", "content": "Why is the sky blue?"},
            {"role": "assistant", "content": "Rayleigh scattering."}
        ],
        "user_message": "Tell me more.",
        "response_1": "It scatters short waves.",
        "response_2": "Blue light is scattered more.",
        "selected_response_id": 1
    }
    response = client.post("/api/store-preference", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "preference_id" in data

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
