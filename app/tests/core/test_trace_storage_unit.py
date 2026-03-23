import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, AsyncMock, patch
from app.core.trace_storage import TraceStorage
from app.core.tracing import TraceData, SpanData, SpanType, SpanStatus


@pytest.mark.asyncio
async def test_trace_storage_basic():
    """Test basic trace storage without PII redaction"""
    # Mock MongoDB collection
    mock_collection = AsyncMock()
    mock_collection.insert_one = AsyncMock()
    mock_collection.find_one = AsyncMock(return_value={
        "id": "test-trace-1",
        "name": "test_operation"
    })
    mock_collection.create_index = AsyncMock()
    
    storage = TraceStorage()
    
    # Mock config settings to disable PII redaction
    with patch('app.config.settings') as mock_settings:
        mock_settings.vault_enabled = False
        mock_settings.pii_redaction_enabled = False
        
        await storage.initialize(mock_collection)
    
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
    
    # Verify insert_one was called
    assert mock_collection.insert_one.called


@pytest.mark.asyncio
async def test_trace_storage_with_pii_redaction():
    """Test that PII redaction is applied when enabled"""
    # Mock MongoDB collection
    mock_collection = AsyncMock()
    mock_collection.insert_one = AsyncMock()
    mock_collection.create_index = AsyncMock()
    
    # Mock Vault client
    mock_vault_client = AsyncMock()
    mock_vault_client.initialize = AsyncMock()
    mock_vault_client.encrypt = AsyncMock(return_value="vault:v1:encrypted_data")
    
    # Mock PII redactor
    mock_redactor = AsyncMock()
    mock_redactor.initialize = AsyncMock()
    async def mock_redact(text):
        if "John Doe" in text or "john@example.com" in text:
            return text.replace("John Doe", "[PERSON:vault:v1:xxx]").replace("john@example.com", "[EMAIL_ADDRESS:vault:v1:yyy]")
        return text
    mock_redactor.redact = mock_redact
    
    storage = TraceStorage()
    
    # Manually set up mocked components
    with patch('app.core.trace_storage.VaultClient', return_value=mock_vault_client), \
         patch('app.core.trace_storage.PIIRedactor', return_value=mock_redactor), \
         patch('app.core.trace_storage.settings') as mock_settings:
        
        mock_settings.vault_enabled = True
        mock_settings.pii_redaction_enabled = True
        mock_settings.vault_url = "http://127.0.0.1:8200"
        mock_settings.vault_token = "dev-token"
        mock_settings.vault_transit_key = "test-key"
        
        await storage.initialize(mock_collection)
        
        # Manually set redactor after initialization
        storage.pii_redactor = mock_redactor
    
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
        input_data={"message": "My name is John Doe"},
        output_data={"response": "Hello John Doe!"},
        metadata={"user_email": "john@example.com"}
    )
    
    trace.spans.append(span)
    trace.end_timestamp = datetime.now(timezone.utc).timestamp()
    trace.status = SpanStatus.SUCCESS
    
    # Store trace (should redact PII)
    trace_id = await storage.store_trace(trace)
    assert trace_id == "test-trace-pii"
    
    # Verify insert_one was called
    assert mock_collection.insert_one.called
    
    # Get the stored data from the mock call
    stored_data = mock_collection.insert_one.call_args[0][0]
    
    # Verify PII was redacted
    stored_str = str(stored_data)
    assert "vault:v1:" in stored_str
    assert "[PERSON:" in stored_str or "[EMAIL_ADDRESS:" in stored_str


@pytest.mark.asyncio
async def test_trace_storage_graceful_degradation():
    """Test that storage works even if PII redaction fails to initialize"""
    # Mock MongoDB collection
    mock_collection = AsyncMock()
    mock_collection.insert_one = AsyncMock()
    mock_collection.create_index = AsyncMock()
    
    storage = TraceStorage()
    
    # Mock settings with PII enabled but make initialization fail
    with patch('app.core.trace_storage.VaultClient') as mock_vault_class, \
         patch('app.core.trace_storage.settings') as mock_settings:
        
        mock_settings.vault_enabled = True
        mock_settings.pii_redaction_enabled = True
        mock_settings.vault_url = "http://127.0.0.1:8200"
        mock_settings.vault_token = "dev-token"
        mock_settings.vault_transit_key = "test-key"
        
        # Make VaultClient initialization fail
        mock_vault_class.side_effect = Exception("Vault not available")
        
        # Should not raise exception, just log warning
        await storage.initialize(mock_collection)
    
    # Verify that storage initialized but without PII redaction
    assert storage._initialized
    assert storage.pii_redactor is None
    
    # Should still be able to store traces
    trace = TraceData(
        id="test-trace-no-vault",
        name="test",
        start_timestamp=datetime.now(timezone.utc).timestamp()
    )
    
    trace_id = await storage.store_trace(trace)
    assert trace_id == "test-trace-no-vault"
