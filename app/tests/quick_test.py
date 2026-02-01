"""Detailed test for dual response with tracing"""
import httpx
import json
import time

payload = {
    "chat_history": [{"role": "user", "content": "Hi"}],
    "user_message": "What is 2+2? Reply in one word.",
    "user_id": "test_user",
    "session_id": "test_session",
    "chat_id": "test_chat"
}

trace_id = None

print("Sending request...")
with httpx.Client(timeout=120.0) as client:
    with client.stream("POST", "http://localhost:8000/api/dual-responses", json=payload) as r:
        print(f"Status: {r.status_code}")
        for line in r.iter_lines():
            if line and line.startswith("data:"):
                data = json.loads(line[6:])
                print(f"Event: {data}")
                if data.get("type") == "trace_info":
                    trace_id = data.get("trace_id")

print(f"\nTrace ID: {trace_id}")
print("Waiting 3 seconds for async storage...")
time.sleep(3)

# Check trace
if trace_id:
    with httpx.Client() as client:
        r = client.get(f"http://localhost:8000/api/v1/traces/{trace_id}")
        print(f"\nTrace fetch status: {r.status_code}")
        data = r.json()
        if data.get("success"):
            trace = data["trace"]
            print(f"Trace found: {trace['name']}")
            print(f"Spans: {len(trace.get('spans', []))}")
            print(f"Latency: {trace.get('total_latency_ms')}ms")
            for span in trace.get("spans", []):
                print(f"  - {span['name']}: {span.get('latency_ms', 0):.0f}ms")
        else:
            print(f"Trace not found: {data}")
    
    # Check statistics with new client
    with httpx.Client() as client2:
        r = client2.get("http://localhost:8000/api/v1/traces/statistics")
        stats = r.json()
        print(f"\nStatistics:")
        print(f"  Total traces: {stats.get('total_traces')}")
        print(f"  Total tokens: {stats.get('tokens', {}).get('total')}")
