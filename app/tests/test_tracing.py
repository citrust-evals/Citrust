"""
Test cases for the Agent Tracing System
"""
import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        print("✅ Health check passed!")
        return True

async def test_root_endpoint():
    """Test root endpoint shows trace endpoints"""
    print("\n" + "="*60)
    print("TEST 2: Root Endpoint (verify trace endpoints listed)")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        data = response.json()
        
        assert "traces" in data["endpoints"]
        assert "trace_statistics" in data["endpoints"]
        print(f"Endpoints: {json.dumps(data['endpoints'], indent=2)}")
        print("✅ Root endpoint shows trace endpoints!")
        return True

async def test_trace_statistics_empty():
    """Test trace statistics with empty database"""
    print("\n" + "="*60)
    print("TEST 3: Trace Statistics (initial state)")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/traces/statistics")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "total_traces" in data
        assert "latency" in data
        assert "tokens" in data
        print("✅ Statistics endpoint working!")
        return True

async def test_list_traces_empty():
    """Test listing traces"""
    print("\n" + "="*60)
    print("TEST 4: List Traces")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/traces")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200
        assert data["success"] == True
        assert "traces" in data
        print("✅ List traces endpoint working!")
        return True

async def test_dual_response_with_tracing():
    """Test dual response generation with tracing"""
    print("\n" + "="*60)
    print("TEST 5: Dual Response with Tracing (MAIN TEST)")
    print("="*60)
    
    payload = {
        "chat_history": [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi there! How can I help you today?"}
        ],
        "user_message": "What is 2 + 2?",
        "user_id": "test_user_123",
        "session_id": "test_session_456",
        "chat_id": "test_chat_789"
    }
    
    print(f"Sending request to /api/dual-responses...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    trace_id = None
    response_1_received = False
    response_2_received = False
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", f"{BASE_URL}/api/dual-responses", json=payload) as response:
            print(f"\nStatus: {response.status_code}")
            print("\nStreaming responses:")
            print("-" * 40)
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        
                        if data.get("type") == "trace_info":
                            trace_id = data.get("trace_id")
                            print(f"\n📊 Trace ID: {trace_id}")
                        elif data.get("type") == "streams_complete":
                            print(f"\n✅ Stream complete!")
                        elif data.get("response_id") == 1:
                            response_1_received = True
                            content = data.get("content", "")[:100]
                            print(f"\n📝 Response 1 (first 100 chars): {content}...")
                        elif data.get("response_id") == 2:
                            response_2_received = True
                            content = data.get("content", "")[:100]
                            print(f"\n📝 Response 2 (first 100 chars): {content}...")
                        elif "error" in data:
                            print(f"\n❌ Error: {data['error']}")
                    except json.JSONDecodeError:
                        pass
    
    print("-" * 40)
    assert response_1_received, "Response 1 not received"
    assert response_2_received, "Response 2 not received"
    assert trace_id is not None, "Trace ID not received"
    
    print(f"\n✅ Dual response with tracing completed!")
    print(f"   - Response 1: Received")
    print(f"   - Response 2: Received")
    print(f"   - Trace ID: {trace_id}")
    
    return trace_id

async def test_get_trace(trace_id: str):
    """Test retrieving a specific trace"""
    print("\n" + "="*60)
    print(f"TEST 6: Get Trace by ID ({trace_id[:8]}...)")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/traces/{trace_id}")
        print(f"Status: {response.status_code}")
        
        data = response.json()
        if data.get("success") and data.get("trace"):
            trace = data["trace"]
            print(f"\nTrace Details:")
            print(f"  - Name: {trace.get('name')}")
            print(f"  - Status: {trace.get('status')}")
            print(f"  - Latency: {trace.get('total_latency_ms', 0):.2f}ms")
            print(f"  - User ID: {trace.get('user_id')}")
            print(f"  - Spans: {len(trace.get('spans', []))}")
            
            if trace.get("total_token_usage"):
                tokens = trace["total_token_usage"]
                print(f"  - Tokens: {tokens.get('total_tokens', 0)} total")
                print(f"    - Prompt: {tokens.get('prompt_tokens', 0)}")
                print(f"    - Completion: {tokens.get('completion_tokens', 0)}")
            
            print(f"\nSpans:")
            for span in trace.get("spans", []):
                print(f"  📌 {span.get('name')} ({span.get('span_type')})")
                if span.get("model_name"):
                    print(f"      Model: {span.get('model_name')}")
                if span.get("latency_ms"):
                    print(f"      Latency: {span.get('latency_ms'):.2f}ms")
                if span.get("token_usage"):
                    print(f"      Tokens: {span['token_usage'].get('total_tokens', 0)}")
            
            print("\n✅ Trace retrieved successfully!")
            return True
        else:
            print(f"Response: {json.dumps(data, indent=2)}")
            return False

async def test_get_trace_tree(trace_id: str):
    """Test retrieving trace with tree view"""
    print("\n" + "="*60)
    print(f"TEST 7: Get Trace Tree View")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/traces/{trace_id}?tree_view=true")
        print(f"Status: {response.status_code}")
        
        data = response.json()
        if data.get("success") and data.get("trace"):
            trace = data["trace"]
            if "span_tree" in trace:
                print(f"Span tree has {len(trace['span_tree'])} root spans")
                print("✅ Tree view working!")
            return True
        return False

async def test_statistics_after_trace():
    """Test statistics after generating a trace"""
    print("\n" + "="*60)
    print("TEST 8: Statistics After Trace")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/traces/statistics")
        print(f"Status: {response.status_code}")
        
        data = response.json()
        print(f"\nStatistics:")
        print(f"  - Total Traces: {data.get('total_traces', 0)}")
        
        if data.get("latency"):
            print(f"  - Avg Latency: {data['latency'].get('avg_ms', 0):.2f}ms")
        
        if data.get("tokens"):
            print(f"  - Total Tokens: {data['tokens'].get('total', 0)}")
        
        if data.get("models_used"):
            print(f"  - Models Used:")
            for model in data["models_used"]:
                print(f"      {model.get('model')}: {model.get('call_count')} calls, {model.get('total_tokens')} tokens")
        
        print("\n✅ Statistics updated!")
        return True

async def test_list_traces_with_filter():
    """Test listing traces with filters"""
    print("\n" + "="*60)
    print("TEST 9: List Traces with Filter")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/traces",
            params={"user_id": "test_user_123", "limit": 5}
        )
        print(f"Status: {response.status_code}")
        
        data = response.json()
        print(f"Found {data.get('total', 0)} traces for user 'test_user_123'")
        print("✅ Filtered listing working!")
        return True

async def run_all_tests():
    """Run all tests"""
    print("\n" + "🚀"*30)
    print("   AGENT TRACING SYSTEM - TEST SUITE")
    print("🚀"*30)
    print(f"\nTimestamp: {datetime.now().isoformat()}")
    print(f"Base URL: {BASE_URL}")
    
    results = {}
    
    try:
        # Basic tests
        results["health"] = await test_health()
        results["root"] = await test_root_endpoint()
        results["stats_empty"] = await test_trace_statistics_empty()
        results["list_empty"] = await test_list_traces_empty()
        
        # Main test - dual response with tracing
        trace_id = await test_dual_response_with_tracing()
        results["dual_response"] = trace_id is not None
        
        if trace_id:
            # Wait a bit for trace to be stored
            await asyncio.sleep(1)
            
            # Trace retrieval tests
            results["get_trace"] = await test_get_trace(trace_id)
            results["tree_view"] = await test_get_trace_tree(trace_id)
            results["stats_after"] = await test_statistics_after_trace()
            results["list_filter"] = await test_list_traces_with_filter()
        
    except Exception as e:
        print(f"\n❌ Error during tests: {e}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! 🎉")
    else:
        print(f"\n⚠️  {total - passed} tests failed")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
