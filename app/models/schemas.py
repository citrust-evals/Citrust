"""
Pydantic schemas for Citrus LLM Evaluation Platform
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    """Chat message roles"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """A single chat message"""
    role: MessageRole
    content: str
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class DualResponseRequest(BaseModel):
    """Request for dual response generation"""
    user_message: str = Field(..., description="The user's message")
    chat_history: List[ChatMessage] = Field(
        default_factory=list,
        description="Previous chat history"
    )
    session_id: Optional[str] = Field(None, description="Session ID for tracking")
    user_id: Optional[str] = Field(None, description="User ID")
    model: Optional[str] = Field(None, description="Model to use")
    temperature: Optional[float] = Field(0.7, ge=0, le=2)
    max_tokens: Optional[int] = Field(2000, ge=1, le=8000)


class DualResponseResult(BaseModel):
    """Response containing two model outputs"""
    response_1: str
    response_2: str
    session_id: Optional[str] = None
    trace_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PreferenceChoice(str, Enum):
    """User's preference choice"""
    RESPONSE_1 = "response_1"
    RESPONSE_2 = "response_2"
    BOTH_GOOD = "both_good"
    BOTH_BAD = "both_bad"
    UNCLEAR = "unclear"


class PreferenceSubmission(BaseModel):
    """User preference submission"""
    session_id: str
    user_message: str
    response_1: str
    response_2: str
    choice: PreferenceChoice
    reasoning: Optional[str] = None
    user_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class EvaluationMetrics(BaseModel):
    """Evaluation metrics"""
    accuracy: Optional[float] = Field(None, ge=0, le=1)
    f1_score: Optional[float] = Field(None, ge=0, le=1)
    precision: Optional[float] = Field(None, ge=0, le=1)
    recall: Optional[float] = Field(None, ge=0, le=1)
    latency_ms: Optional[float] = Field(None, ge=0)
    tokens_used: Optional[int] = Field(None, ge=0)
    cost_usd: Optional[float] = Field(None, ge=0)


class EvaluationRequest(BaseModel):
    """Request to create an evaluation"""
    model_name: str
    test_set_id: str
    config: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class EvaluationResult(BaseModel):
    """Result of an evaluation run"""
    evaluation_id: str
    model_name: str
    metrics: EvaluationMetrics
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    error: Optional[str] = None


class ModelInfo(BaseModel):
    """Information about a model"""
    model_id: str
    model_name: str
    provider: str  # openai, google, anthropic, custom
    version: Optional[str] = None
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    pricing: Optional[Dict[str, float]] = None
    context_window: Optional[int] = None
    max_output_tokens: Optional[int] = None
    created_at: Optional[datetime] = None


class AnalyticsTimeRange(str, Enum):
    """Time range for analytics"""
    HOUR = "1h"
    DAY = "24h"
    WEEK = "7d"
    MONTH = "30d"
    CUSTOM = "custom"


class AnalyticsQuery(BaseModel):
    """Query for analytics data"""
    time_range: AnalyticsTimeRange = AnalyticsTimeRange.DAY
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    model_name: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metrics: Optional[List[str]] = None


class AnalyticsDataPoint(BaseModel):
    """A single analytics data point"""
    timestamp: datetime
    value: float
    label: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AnalyticsResponse(BaseModel):
    """Response containing analytics data"""
    query: AnalyticsQuery
    data_points: List[AnalyticsDataPoint]
    summary: Dict[str, Any]
    generated_at: datetime


class TraceSpan(BaseModel):
    """A trace span"""
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
    token_usage: Optional[Dict[str, int]] = None
    input_data: Optional[Any] = None
    output_data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class Trace(BaseModel):
    """A complete trace"""
    id: str
    name: str
    start_timestamp: str
    end_timestamp: Optional[str] = None
    total_latency_ms: Optional[float] = None
    status: str
    total_token_usage: Optional[Dict[str, int]] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    spans: List[TraceSpan]
    has_errors: bool = False
    error_count: int = 0
    metadata: Optional[Dict[str, Any]] = None


class LatencyStats(BaseModel):
    """Latency statistics with percentiles"""
    avg_ms: float = 0
    min_ms: float = 0
    max_ms: float = 0
    p50_ms: float = 0
    p95_ms: float = 0
    p99_ms: float = 0


class TokenStats(BaseModel):
    """Token usage statistics"""
    total: int = 0
    prompt: int = 0
    completion: int = 0
    avg_per_trace: float = 0


class ModelUsageStats(BaseModel):
    """Statistics for a specific model"""
    model: str
    call_count: int = 0
    total_tokens: int = 0
    avg_latency_ms: float = 0


class TraceStatistics(BaseModel):
    """Aggregated trace statistics - matches frontend TraceStatistics interface"""
    total_traces: int = 0
    successful_traces: int = 0
    failed_traces: int = 0
    latency: LatencyStats = Field(default_factory=LatencyStats)
    tokens: TokenStats = Field(default_factory=TokenStats)
    models_used: List[ModelUsageStats] = Field(default_factory=list)
    time_range: Optional[Dict[str, str]] = None


class ModelPerformanceStats(BaseModel):
    """Performance statistics for a model"""
    model_name: str
    total_calls: int
    avg_latency_ms: float
    error_count: int
    error_rate: float
    total_tokens: int
    avg_tokens_per_call: float
    
    @validator('avg_tokens_per_call', always=True)
    def calculate_avg_tokens(cls, v, values):
        """Calculate average tokens per call"""
        if 'total_calls' in values and values['total_calls'] > 0:
            return round(
                values.get('total_tokens', 0) / values['total_calls'],
                2
            )
        return 0.0


class HealthStatus(BaseModel):
    """API health status"""
    status: str  # healthy, degraded, unhealthy
    database: str  # connected, disconnected, error
    version: str
    uptime_seconds: Optional[float] = None
    timestamp: datetime


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
    timestamp: datetime


# Response models for API endpoints
class ApiResponse(BaseModel):
    """Generic API response wrapper"""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)