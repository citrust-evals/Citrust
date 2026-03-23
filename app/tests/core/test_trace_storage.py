import pytest
from datetime import datetime, timezone
from app.core.trace_storage import TraceStorage
from app.core.tracing import TraceData, SpanData, SpanType, SpanStatus, TokenUsage
from app.core.vault_client import VaultClient
from app.core.pii_redaction import PIIRedactor
from motor.motor_asyncio import AsyncIOMotorClient


@pytest.fixture
async def mongodb_collection():
    """Fixture providing a test MongoDB collection"""
    # Use a test database
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_citrus_privacy"]
    collection = db["test_traces"]
    
    # Clean up before test
    await collection.delete_many({})
    
    yield collection
    
    # Clean up after test
    await collection.delete_many({})
    client.close()


@pytest.mark.asyncio
async def test_trace_storage_basic(mongodb_collection):
    """Test basic trace storage without PII redaction"""
    storage = TraceStorage()
    await storage.initialize(mongodb_collection)
    
    # Create a simple trace
    trace = TraceData(
        id="test-trace-1",
        name="test_operation",
        start_timestamp=datetime.now(timezone.utc).timestamp(),
        session_id="test-session",
        user_id="test-user"
    )
    
    span = SpanData(
        id="span-1",
        trace_id=trace.id,
        parent_id=None,
        name="test_span",
        span_type=SpanType.LLM,
        status=SpanStatus.SUCCESS,
        start_timestamp=datetime.now(timezone.utc).timestamp(),
        end_timestamp=datetime.now(timezone.utc).timestamp(),
        latency_ms=100.0,
        input_data={"message": "Hello world"},
        output_data={"response": "Hi there"}
    )
    
    trace.spans.append(span)
    trace.end_timestamp = datetime.now(timezone.utc).timestamp()
    trace.status = SpanStatus.SUCCESS
    
    # Store trace
    trace_id = await storage.store_trace(trace)
    assert trace_id == "test-trace-1"
    
    # Retrieve trace
    stored_trace = await storage.get_trace(trace_id)
    assert stored_trace is not None
    assert stored_trace["id"] == trace_id


@pytest.mark.asyncio
async def test_trace_storage_redacts_pii(mongodb_collection):
    """Test that traces with PII are automatically redacted"""
    storage = TraceStorage()
    
    # Initialize with Vault and PII redaction enabled
    try:
        # Try to set up Vault
        vault_client = VaultClient(
            vault_url="http://127.0.0.1:8200",
            vault_token="dev-root-token"
        )
        await vault_client.initialize()
        
        # Set up PII redactor
        pii_redactor = PIIRedactor(vault_client=vault_client)
        await pii_redactor.initialize()
        
        # Manually attach to storage
        storage.vault_client = vault_client
        storage.pii_redactor = pii_redactor
        
    except Exception as e:
        pytest.skip(f"Vault or Presidio not available: {e}")
    
    await storage.initialize(mongodb_collection)
    
    # Create a trace with PII
    trace = TraceData(
        id="test-trace-pii",
        name="chat_interaction",
        start_timestamp=datetime.now(timezone.utc).timestamp(),
        session_id="test-session",
        user_id="test-user"
    )
    
    span = SpanData(
        id="span-pii",
        trace_id=trace.id,
        parent_id=None,
        name="llm_call",
        span_type=SpanType.LLM,
        status=SpanStatus.SUCCESS,
        start_timestamp=datetime.now(timezone.utc).timestamp(),
        end_timestamp=datetime.now(timezone.utc).timestamp(),
        latency_ms=200.0,
        input_data={"message": "My name is John Doe and email is john@example.com"},
        output_data={"response": "Hello John Doe!"},
        metadata={"user_info": "Contact: jane@test.com"}
    )
    
    trace.spans.append(span)
    trace.end_timestamp = datetime.now(timezone.utc).timestamp()
    trace.status = SpanStatus.SUCCESS
    trace.metadata = {"session_info": "User phone: +1-555-0123"}
    
    # Store trace (should redact PII automatically)
    trace_id = await storage.store_trace(trace)
    
    # Retrieve stored trace
    stored_trace = await storage.get_trace(trace_id)
    
    # Verify PII is redacted in storage
    assert stored_trace is not None
    
    # Check that PII is NOT present in stored data
    stored_str = str(stored_trace)
    assert "John Doe" not in stored_str
    assert "john@example.com" not in stored_str
    assert "jane@test.com" not in stored_str
    assert "+1-555-0123" not in stored_str
    
    # Check that encrypted tokens ARE present
    assert "vault:v1:" in stored_str


@pytest.mark.asyncio  
async def test_trace_storage_without_pii_redaction(mongodb_collection):
    """Test that storage works when PII redaction is not enabled"""
    storage = TraceStorage()
    await storage.initialize(mongodb_collection)
    
    # Create trace with PII but no redaction
    trace = TraceData(
        id="test-trace-no-redact",
        name="test_op",
        start_timestamp=datetime.now(timezone.utc).timestamp(),
        session_id="test-session",
        user_id="test-user"
    )
    
    span = SpanData(
        id="span-no-redact",
        trace_id=trace.id,
        parent_id=None,
        name="test",
        span_type=SpanType.GENERIC,
        status=SpanStatus.SUCCESS,
        start_timestamp=datetime.now(timezone.utc).timestamp(),
        end_timestamp=datetime.now(timezone.utc).timestamp(),
        input_data={"text": "Some regular text without PII"}
    )
    
    trace.spans.append(span)
    trace.end_timestamp = datetime.now(timezone.utc).timestamp()
    
    # Should store successfully even without PII redaction
    trace_id = await storage.store_trace(trace)
    stored = await storage.get_trace(trace_id)
    
    assert stored is not None
    assert stored["id"] == trace_id
