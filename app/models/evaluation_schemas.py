"""
Evaluation System Schemas for Citrus AI

Models for:
- Evaluation Campaigns
- Test Sets and Test Cases
- Evaluation Results
- Metrics and Scoring
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import uuid


class EvaluationType(str, Enum):
    """Types of evaluations"""
    SIDE_BY_SIDE = "side_by_side"       # Compare two models
    SINGLE_MODEL = "single_model"       # Evaluate one model
    MULTI_MODEL = "multi_model"        # Compare 3+ models
    PREFERENCE = "preference"           # Human preference voting
    RUBRIC = "rubric"                  # Score on criteria
    GROUND_TRUTH = "ground_truth"       # Compare against expected


class CampaignStatus(str, Enum):
    """Status of evaluation campaign"""
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MetricType(str, Enum):
    """Types of metrics"""
    EXACT_MATCH = "exact_match"
    BLEU = "bleu"
    ROUGE = "rouge"
    F1 = "f1"
    LATENCY = "latency"
    TOKEN_COUNT = "token_count"
    TOKEN_COST = "token_cost"
    RESPONSE_LENGTH = "response_length"
    CUSTOM = "custom"
    RUBRIC = "rubric"
    PREFERENCE = "preference"


# =============================================================================
# Test Set & Test Case Models
# =============================================================================

class TestCaseInput(BaseModel):
    """Input for a test case"""
    prompt: str
    context: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TestCaseOutput(BaseModel):
    """Expected output for a test case"""
    expected_response: Optional[str] = None
    acceptable_responses: Optional[List[str]] = None
    reference_summary: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TestCase(BaseModel):
    """Individual test case"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    input: TestCaseInput
    output: Optional[TestCaseOutput] = None
    tags: List[str] = Field(default_factory=list)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    category: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Math Addition Test",
                "description": "Test basic arithmetic",
                "input": {"prompt": "What is 2 + 2?"},
                "output": {"expected_response": "4"},
                "tags": ["math", "arithmetic"],
                "difficulty": "easy"
            }
        }


class TestSet(BaseModel):
    """Collection of test cases"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    test_cases: List[TestCase] = Field(default_factory=list)
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def test_case_count(self) -> int:
        return len(self.test_cases)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "General Knowledge QA",
                "description": "Basic general knowledge questions",
                "test_cases": [],
                "tags": ["qa", "general"]
            }
        }


class TestSetCreate(BaseModel):
    """Schema for creating a test set (without auto-generated fields)"""
    name: str
    description: Optional[str] = None
    test_cases: List[TestCase] = Field(default_factory=list)
    is_public: bool = False
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# Model Configuration
# =============================================================================

class ModelConfig(BaseModel):
    """Configuration for a model in evaluation"""
    model_name: str
    provider: Literal["google", "openai", "anthropic", "custom"] = "google"
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=2000, ge=1, le=32000)
    system_prompt: Optional[str] = None
    api_key: Optional[str] = None  # Optional override
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvaluationConfig(BaseModel):
    """Configuration for an evaluation run"""
    evaluation_type: EvaluationType
    models: List[ModelConfig]
    test_set_id: str
    metrics: List[str] = Field(default_factory=list)  # Metric names
    rubrics: Optional[List[Dict[str, Any]]] = None
    max_concurrent: int = Field(default=5, ge=1, le=20)
    timeout_seconds: int = Field(default=120, ge=10, le=600)
    metadata: Dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# Rubric & Scoring
# =============================================================================

class RubricCriterion(BaseModel):
    """A criterion in a rubric"""
    name: str
    description: str
    weight: float = 1.0
    scale_min: int = 1
    scale_max: int = 5


class Rubric(BaseModel):
    """Scoring rubric"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    criteria: List[RubricCriterion]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RubricScore(BaseModel):
    """Score for a rubric evaluation"""
    criterion_name: str
    score: float
    feedback: Optional[str] = None


# =============================================================================
# Metric Definitions
# =============================================================================

class MetricDefinition(BaseModel):
    """Definition of a custom metric"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    metric_type: MetricType
    config: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Contains Keyword",
                "description": "Check if response contains specific keyword",
                "metric_type": "custom",
                "config": {"keyword": "important"}
            }
        }


# =============================================================================
# Evaluation Results
# =============================================================================

class MetricScore(BaseModel):
    """Score for a single metric"""
    metric_name: str
    metric_type: MetricType
    score: float
    details: Optional[Dict[str, Any]] = None


class TestCaseResult(BaseModel):
    """Result for a single test case"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_case_id: str
    test_case_name: str
    model_name: str
    input_prompt: str
    model_response: str
    expected_response: Optional[str] = None
    metric_scores: List[MetricScore] = Field(default_factory=list)
    rubric_scores: List[RubricScore] = Field(default_factory=list)
    latency_ms: Optional[float] = None
    token_count: Optional[int] = None
    error: Optional[str] = None
    passed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ModelScore(BaseModel):
    """Aggregated scores for a model"""
    model_name: str
    total_tests: int = 0
    passed_tests: int = 0
    pass_rate: float = 0.0
    avg_latency_ms: float = 0.0
    total_tokens: int = 0
    avg_score: float = 0.0
    metric_averages: Dict[str, float] = Field(default_factory=dict)
    rubric_averages: Dict[str, float] = Field(default_factory=dict)


# =============================================================================
# Evaluation Campaign
# =============================================================================

class CampaignBase(BaseModel):
    """Base campaign model"""
    name: str
    description: Optional[str] = None
    evaluation_type: EvaluationType
    test_set_id: str
    model_configs: List[ModelConfig]
    metric_names: List[str] = Field(default_factory=list)
    rubrics: Optional[List[Rubric]] = None


class CampaignCreate(CampaignBase):
    """Campaign creation request"""
    status: CampaignStatus = CampaignStatus.DRAFT


class Campaign(CampaignBase):
    """Complete campaign model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: CampaignStatus = CampaignStatus.DRAFT
    progress: float = 0.0
    total_test_cases: int = 0
    completed_test_cases: int = 0
    results: List[TestCaseResult] = Field(default_factory=list)
    model_scores: Dict[str, ModelScore] = Field(default_factory=dict)
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def is_completed(self) -> bool:
        return self.status == CampaignStatus.COMPLETED

    @property
    def duration_seconds(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


# =============================================================================
# API Response Models
# =============================================================================

class CampaignListResponse(BaseModel):
    """Response for listing campaigns"""
    success: bool = True
    campaigns: List[Campaign]
    total: int
    skip: int = 0
    limit: int = 100


class CampaignResponse(BaseModel):
    """Response for single campaign"""
    success: bool = True
    campaign: Optional[Campaign] = None
    message: Optional[str] = None


class EvaluationRunResponse(BaseModel):
    """Response for starting an evaluation"""
    success: bool = True
    campaign_id: str
    message: str
    estimated_duration_seconds: Optional[float] = None


class TestSetListResponse(BaseModel):
    """Response for listing test sets"""
    success: bool = True
    test_sets: List[TestSet]
    total: int
    skip: int = 0
    limit: int = 100


class TestSetResponse(BaseModel):
    """Response for single test set"""
    success: bool = True
    test_set: Optional[TestSet] = None
    message: Optional[str] = None


class ComparisonResponse(BaseModel):
    """Response for model comparison"""
    success: bool = True
    test_set_name: str
    models_compared: List[str]
    comparison_metrics: List[str]
    model_scores: Dict[str, ModelScore]
    winner: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class AvailableModel(BaseModel):
    """Information about an available model"""
    model_name: str
    provider: str
    context_window: int
    max_output_tokens: int
    capabilities: List[str]
    is_available: bool = True


class ModelsListResponse(BaseModel):
    """Response for listing available models"""
    success: bool = True
    models: List[AvailableModel]
