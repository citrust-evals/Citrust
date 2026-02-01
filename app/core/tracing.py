"""
Model-Agnostic Agent Tracing System for Citrus AI

Provides context-managed tracing for any LLM with thread-safe nested span tracking.
"""
import contextlib
import time
import uuid
import asyncio
from contextvars import ContextVar
from typing import Any, Dict, Optional, List
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class SpanType(str, Enum):
    """Types of spans for categorization"""
    AGENT = "agent"
    LLM = "llm"
    TOOL = "tool"
    CHAIN = "chain"
    RETRIEVER = "retriever"
    EMBEDDING = "embedding"
    GENERIC = "generic"


class SpanStatus(str, Enum):
    """Status of a span"""
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


@dataclass
class TokenUsage:
    """Token consumption tracking"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    
    def to_dict(self) -> Dict[str, int]:
        return asdict(self)


@dataclass
class SpanData:
    """Complete span data structure"""
    id: str
    trace_id: str
    parent_id: Optional[str]
    name: str
    span_type: SpanType
    status: SpanStatus
    start_timestamp: float
    end_timestamp: Optional[float] = None
    latency_ms: Optional[float] = None
    
    # LLM-specific fields
    model_name: Optional[str] = None
    model_provider: Optional[str] = None
    system_instruction: Optional[str] = None
    
    # Input/Output
    input_data: Optional[Any] = None
    output_data: Optional[Any] = None
    
    # Token tracking
    token_usage: Optional[TokenUsage] = None
    
    # Metadata and tags
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    
    # Error tracking
    error: Optional[str] = None
    error_type: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "trace_id": self.trace_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "span_type": self.span_type.value,
            "status": self.status.value,
            "start_timestamp": datetime.fromtimestamp(
                self.start_timestamp, tz=timezone.utc
            ).isoformat(),
            "end_timestamp": datetime.fromtimestamp(
                self.end_timestamp, tz=timezone.utc
            ).isoformat() if self.end_timestamp else None,
            "latency_ms": self.latency_ms,
            "model_name": self.model_name,
            "model_provider": self.model_provider,
            "system_instruction": self.system_instruction,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "token_usage": self.token_usage.to_dict() if self.token_usage else None,
            "metadata": self.metadata,
            "tags": self.tags,
            "error": self.error,
            "error_type": self.error_type,
        }


@dataclass
class TraceData:
    """Complete trace containing multiple spans"""
    id: str
    name: str
    start_timestamp: float
    end_timestamp: Optional[float] = None
    total_latency_ms: Optional[float] = None
    status: SpanStatus = SpanStatus.RUNNING
    
    # Aggregated token usage
    total_token_usage: Optional[TokenUsage] = None
    
    # User/Session context
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    chat_id: Optional[str] = None
    
    # All spans in this trace
    spans: List[SpanData] = field(default_factory=list)
    
    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    
    # Error summary
    has_errors: bool = False
    error_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "name": self.name,
            "start_timestamp": datetime.fromtimestamp(
                self.start_timestamp, tz=timezone.utc
            ).isoformat(),
            "end_timestamp": datetime.fromtimestamp(
                self.end_timestamp, tz=timezone.utc
            ).isoformat() if self.end_timestamp else None,
            "total_latency_ms": self.total_latency_ms,
            "status": self.status.value,
            "total_token_usage": self.total_token_usage.to_dict() 
                if self.total_token_usage else None,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "chat_id": self.chat_id,
            "spans": [span.to_dict() for span in self.spans],
            "metadata": self.metadata,
            "tags": self.tags,
            "has_errors": self.has_errors,
            "error_count": self.error_count,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }


# Context Variables for Thread-Safe State Management
_current_span_id: ContextVar[Optional[str]] = ContextVar(
    "current_span_id", default=None
)
_current_trace_id: ContextVar[Optional[str]] = ContextVar(
    "current_trace_id", default=None
)

# In-memory storage for active traces
_active_traces: Dict[str, TraceData] = {}
_active_spans: Dict[str, SpanData] = {}


# Token Counting Utilities
def count_tokens(text: str, model_name: Optional[str] = None) -> int:
    """
    Estimate token count for any model
    
    Args:
        text: The text to count tokens for
        model_name: Optional model name for specific tokenizer
        
    Returns:
        Estimated token count
    """
    if not text:
        return 0
    
    model_lower = (model_name or "").lower()
    
    # Try OpenAI tiktoken for GPT models
    if any(x in model_lower for x in ["gpt", "text-davinci", "text-embedding"]):
        try:
            import tiktoken
            try:
                encoding = tiktoken.encoding_for_model(model_name)
            except KeyError:
                encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except (ImportError, Exception):
            pass
    
    # Fallback: Character-based approximation
    # Average ~4 characters per token for English text
    return max(1, len(text) // 4)


def estimate_token_usage(
    prompt: str,
    completion: str,
    model_name: Optional[str] = None,
    system_prompt: Optional[str] = None
) -> TokenUsage:
    """
    Estimate token usage for a prompt/completion pair
    
    Args:
        prompt: The input prompt
        completion: The model's response
        model_name: Optional model name for accurate counting
        system_prompt: Optional system instruction
        
    Returns:
        TokenUsage object with counts
    """
    full_prompt = prompt
    if system_prompt:
        full_prompt = system_prompt + "\n" + prompt
    
    prompt_tokens = count_tokens(full_prompt, model_name)
    completion_tokens = count_tokens(completion, model_name)
    
    return TokenUsage(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens
    )


# Core Tracing Functions
def get_current_trace_id() -> Optional[str]:
    """Get the current trace ID from context"""
    return _current_trace_id.get()


def get_current_span_id() -> Optional[str]:
    """Get the current span ID from context"""
    return _current_span_id.get()


def get_active_trace(trace_id: str) -> Optional[TraceData]:
    """Get an active trace by ID"""
    return _active_traces.get(trace_id)


def get_active_span(span_id: str) -> Optional[SpanData]:
    """Get an active span by ID"""
    return _active_spans.get(span_id)


@contextlib.contextmanager
def start_trace(
    name: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    chat_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None
):
    """
    Start a new trace grouping multiple spans together
    
    Args:
        name: Name of the trace
        user_id: Optional user identifier
        session_id: Optional session identifier
        chat_id: Optional chat identifier
        metadata: Additional metadata
        tags: Tags for filtering
        
    Yields:
        TraceData object that can be modified during execution
    """
    trace_id = str(uuid.uuid4())
    start_time = time.time()
    
    trace = TraceData(
        id=trace_id,
        name=name,
        start_timestamp=start_time,
        user_id=user_id,
        session_id=session_id,
        chat_id=chat_id,
        metadata=metadata or {},
        tags=tags or []
    )
    
    _active_traces[trace_id] = trace
    token = _current_trace_id.set(trace_id)
    
    try:
        yield trace
        trace.status = SpanStatus.SUCCESS
    except Exception as e:
        trace.status = SpanStatus.ERROR
        trace.has_errors = True
        trace.error_count += 1
        logger.error(f"Trace '{name}' failed: {e}")
        raise
    finally:
        # Finalize trace
        trace.end_timestamp = time.time()
        trace.total_latency_ms = (
            trace.end_timestamp - trace.start_timestamp
        ) * 1000
        
        # Aggregate token usage
        total_usage = TokenUsage()
        for span in trace.spans:
            if span.token_usage:
                total_usage.prompt_tokens += span.token_usage.prompt_tokens
                total_usage.completion_tokens += span.token_usage.completion_tokens
                total_usage.total_tokens += span.token_usage.total_tokens
        
        if total_usage.total_tokens > 0:
            trace.total_token_usage = total_usage
        
        # Count errors
        trace.error_count = sum(
            1 for s in trace.spans if s.status == SpanStatus.ERROR
        )
        trace.has_errors = trace.error_count > 0
        
        _current_trace_id.reset(token)
        
        logger.debug(
            f"Trace '{name}' completed in {trace.total_latency_ms:.2f}ms "
            f"with {len(trace.spans)} spans"
        )


@contextlib.contextmanager
def trace_span(
    name: str,
    span_type: SpanType = SpanType.GENERIC,
    model_name: Optional[str] = None,
    model_provider: Optional[str] = None,
    system_instruction: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None
):
    """
    Create a span within the current trace
    
    Args:
        name: Name of the span
        span_type: Type of span (LLM, TOOL, AGENT, etc.)
        model_name: Model being used (for LLM spans)
        model_provider: Provider (openai, google, anthropic, custom)
        system_instruction: System prompt if applicable
        metadata: Additional metadata
        tags: Tags for filtering
        
    Yields:
        SpanData object that can be modified during execution
    """
    span_id = str(uuid.uuid4())
    trace_id = _current_trace_id.get()
    parent_id = _current_span_id.get()
    start_time = time.time()
    
    span = SpanData(
        id=span_id,
        trace_id=trace_id or "orphan",
        parent_id=parent_id,
        name=name,
        span_type=span_type,
        status=SpanStatus.RUNNING,
        start_timestamp=start_time,
        model_name=model_name,
        model_provider=model_provider,
        system_instruction=system_instruction,
        metadata=metadata or {},
        tags=tags or []
    )
    
    _active_spans[span_id] = span
    token = _current_span_id.set(span_id)
    
    try:
        yield span
        span.status = SpanStatus.SUCCESS
    except Exception as e:
        span.status = SpanStatus.ERROR
        span.error = str(e)
        span.error_type = type(e).__name__
        logger.error(f"Span '{name}' failed: {e}")
        raise
    finally:
        # Finalize span
        span.end_timestamp = time.time()
        span.latency_ms = (span.end_timestamp - span.start_timestamp) * 1000
        
        # Add to parent trace if it exists
        if trace_id and trace_id in _active_traces:
            _active_traces[trace_id].spans.append(span)
        
        # Cleanup
        _active_spans.pop(span_id, None)
        _current_span_id.reset(token)
        
        logger.debug(f"Span '{name}' completed in {span.latency_ms:.2f}ms")


@contextlib.asynccontextmanager
async def async_trace_span(
    name: str,
    span_type: SpanType = SpanType.GENERIC,
    model_name: Optional[str] = None,
    model_provider: Optional[str] = None,
    system_instruction: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None
):
    """
    Async version of trace_span
    
    Args:
        name: Name of the span
        span_type: Type of span
        model_name: Model being used
        model_provider: Provider name
        system_instruction: System prompt if applicable
        metadata: Additional metadata
        tags: Tags for filtering
        
    Yields:
        SpanData object that can be modified during execution
    """
    span_id = str(uuid.uuid4())
    trace_id = _current_trace_id.get()
    parent_id = _current_span_id.get()
    start_time = time.time()
    
    span = SpanData(
        id=span_id,
        trace_id=trace_id or "orphan",
        parent_id=parent_id,
        name=name,
        span_type=span_type,
        status=SpanStatus.RUNNING,
        start_timestamp=start_time,
        model_name=model_name,
        model_provider=model_provider,
        system_instruction=system_instruction,
        metadata=metadata or {},
        tags=tags or []
    )
    
    _active_spans[span_id] = span
    token = _current_span_id.set(span_id)
    
    try:
        yield span
        span.status = SpanStatus.SUCCESS
    except Exception as e:
        span.status = SpanStatus.ERROR
        span.error = str(e)
        span.error_type = type(e).__name__
        logger.error(f"Async span '{name}' failed: {e}")
        raise
    finally:
        # Finalize span
        span.end_timestamp = time.time()
        span.latency_ms = (span.end_timestamp - span.start_timestamp) * 1000
        
        # Add to parent trace if it exists
        if trace_id and trace_id in _active_traces:
            _active_traces[trace_id].spans.append(span)
        
        # Cleanup
        _active_spans.pop(span_id, None)
        _current_span_id.reset(token)
        
        logger.debug(f"Async span '{name}' completed in {span.latency_ms:.2f}ms")


def finish_trace(trace_id: str) -> Optional[TraceData]:
    """
    Finish and remove a trace from active traces
    
    Args:
        trace_id: ID of the trace to finish
        
    Returns:
        The finished TraceData object, or None if not found
    """
    return _active_traces.pop(trace_id, None)


def clear_all_traces():
    """Clear all active traces and spans (useful for testing)"""
    _active_traces.clear()
    _active_spans.clear()