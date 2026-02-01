"""
Pydantic models for Trace API requests and responses
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
from enum import Enum


class SpanTypeEnum(str, Enum):
    """Types of spans"""
    AGENT = "agent"
    LLM = "llm"
    TOOL = "tool"
    CHAIN = "chain"
    RETRIEVER = "retriever"
    EMBEDDING = "embedding"
    GENERIC = "generic"


class SpanStatusEnum(str, Enum):
    """Status of a span"""
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


# ============================================================================
# Response Models
# ============================================================================

class TokenUsageModel(BaseModel):
    """Token usage statistics"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class SpanModel(BaseModel):
    """Individual span within a trace"""
    id: str
    trace_id: str
    parent_id: Optional[str] = None
    name: str
    span_type: str
    status: str
    start_timestamp: str
    end_timestamp: Optional[str] = None
    latency_ms: Optional[float] = None
    
    model_name: Optional[str] = None
    model_provider: Optional[str] = None
    system_instruction: Optional[str] = None
    
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Any] = None
    token_usage: Optional[TokenUsageModel] = None
    
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    error: Optional[str] = None
    error_type: Optional[str] = None
    
    # For tree structure
    children: Optional[List["SpanModel"]] = None
    
    class Config:
        from_attributes = True


class TraceModel(BaseModel):
    """Complete trace response"""
    id: str
    name: str
    start_timestamp: str
    end_timestamp: Optional[str] = None
    total_latency_ms: Optional[float] = None
    status: str
    
    total_token_usage: Optional[TokenUsageModel] = None
    
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    chat_id: Optional[str] = None
    
    spans: List[SpanModel] = Field(default_factory=list)
    span_tree: Optional[List[SpanModel]] = None  # Hierarchical view
    
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    has_errors: bool = False
    error_count: int = 0
    
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class TraceListResponse(BaseModel):
    """Response for listing traces"""
    success: bool = True
    total: int
    limit: int
    skip: int
    traces: List[TraceModel]


class TraceSingleResponse(BaseModel):
    """Response for single trace retrieval"""
    success: bool = True
    trace: Optional[TraceModel] = None
    message: Optional[str] = None


# ============================================================================
# Statistics Models
# ============================================================================

class LatencyStats(BaseModel):
    """Latency statistics"""
    avg_ms: float
    max_ms: float
    min_ms: float


class TokenStats(BaseModel):
    """Token usage statistics"""
    total_prompt: int
    total_completion: int
    total: int


class ErrorStats(BaseModel):
    """Error statistics"""
    total_error_count: int
    traces_with_errors: int
    error_rate: float = Field(description="Percentage of traces with errors")


class ModelUsageStats(BaseModel):
    """Per-model usage statistics"""
    model: str
    call_count: int
    total_tokens: int


class TraceStatisticsResponse(BaseModel):
    """Aggregated trace statistics"""
    success: bool = True
    total_traces: int
    latency: Optional[LatencyStats] = None
    tokens: Optional[TokenStats] = None
    errors: Optional[ErrorStats] = None
    by_status: Dict[str, int] = Field(default_factory=dict)
    by_name: Dict[str, int] = Field(default_factory=dict)
    models_used: List[ModelUsageStats] = Field(default_factory=list)


# ============================================================================
# Query Models
# ============================================================================

class TraceQueryParams(BaseModel):
    """Query parameters for trace listing"""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    chat_id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[SpanStatusEnum] = None
    has_errors: Optional[bool] = None
    model_name: Optional[str] = None
    span_type: Optional[SpanTypeEnum] = None
    tags: Optional[List[str]] = None
    start_after: Optional[datetime] = None
    start_before: Optional[datetime] = None
    min_latency_ms: Optional[float] = None
    max_latency_ms: Optional[float] = None
    limit: int = Field(default=100, le=500)
    skip: int = Field(default=0, ge=0)
    sort_by: str = "start_timestamp"
    sort_order: Literal["asc", "desc"] = "desc"


# ============================================================================
# Deletion Response
# ============================================================================

class DeleteTraceResponse(BaseModel):
    """Response for trace deletion"""
    success: bool
    message: str
    deleted_count: Optional[int] = None
