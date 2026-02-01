"""
Quick test script for Citrus API
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"✓ Health check: {response.status_code}")
        print(f"  Status: {response.json().get('status')}")
        print(f"  Database: {response.json().get('database')}")
        return True
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False


def test_root():
    """Test root endpoint"""
    print("\nTesting root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        data = response.json()
        print(f"✓ Root: {response.status_code}")
        print(f"  Name: {data.get('name')}")
        print(f"  Version: {data.get('version')}")
        return True
    except Exception as e:
        print(f"✗ Root endpoint failed: {e}")
        return False


def test_dual_responses():
    """Test dual response generation"""
    print("\nTesting dual response generation...")
    try:
        payload = {
            "user_message": "What is 2+2?",
            "chat_history": [],
            "session_id": "test-session",
            "temperature": 0.7
        }
        
        print("  Sending request...")
        response = requests.post(
            f"{BASE_URL}/api/dual-responses",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Dual responses: {response.status_code}")
            print(f"  Response 1 length: {len(data.get('response_1', ''))}")
            print(f"  Response 2 length: {len(data.get('response_2', ''))}")
            print(f"  Session ID: {data.get('session_id')}")
            print(f"  Trace ID: {data.get('trace_id')}")
            return True
        else:
            print(f"✗ Dual responses failed: {response.status_code}")
            print(f"  Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Dual responses failed: {e}")
        return False


def test_stats():
    """Test stats endpoint"""
    print("\nTesting stats endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/stats", timeout=5)
        data = response.json()
        print(f"✓ Stats: {response.status_code}")
        if data.get("success"):
            stats = data.get("data", {})
            print(f"  Total traces: {stats.get('total_traces')}")
            print(f"  Total preferences: {stats.get('total_preferences')}")
        return True
    except Exception as e:
        print(f"✗ Stats failed: {e}")
        return False


def test_analytics():
    """Test analytics endpoint"""
    print("\nTesting analytics endpoint...")
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/analytics/realtime?minutes=60",
            timeout=5
        )
        data = response.json()
        print(f"✓ Analytics: {response.status_code}")
        if data.get("success"):
            metrics = data.get("data", {})
            print(f"  Total requests: {metrics.get('total_requests')}")
            print(f"  Avg latency: {metrics.get('avg_latency')}ms")
        return True
    except Exception as e:
        print(f"✗ Analytics failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 50)
    print("🍋 Citrus API Test Suite")
    print("=" * 50)
    print()
    
    # Check if server is running
    try:
        requests.get(BASE_URL, timeout=2)
    except Exception:
        print("✗ Server not running!")
        print(f"  Please start the server first:")
        print(f"  uvicorn app.main:app --reload")
        return
    
    # Run tests
    results = []
    results.append(("Health Check", test_health()))
    results.append(("Root Endpoint", test_root()))
    results.append(("Stats", test_stats()))
    results.append(("Analytics", test_analytics()))
    results.append(("Dual Responses", test_dual_responses()))
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 50)


if __name__ == "__main__":
    main()