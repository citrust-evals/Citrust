"""Check trace token usage"""
import httpx
import json

r = httpx.get("http://localhost:8000/api/v1/traces?limit=1")
data = r.json()
if data.get("traces"):
    trace = data["traces"][0]
    print(f"Trace: {trace['name']}")
    print(f"Total token usage: {trace.get('total_token_usage')}")
    print()
    for span in trace.get("spans", []):
        print(f"  Span: {span['name']}")
        print(f"    Token usage: {span.get('token_usage')}")
        print(f"    Model: {span.get('model_name')}")
else:
    print("No traces found")
