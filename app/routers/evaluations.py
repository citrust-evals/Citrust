"""
Evaluation Router for Citrus AI

Provides endpoints for:
- Evaluation Campaigns (CRUD)
- Test Sets (CRUD)
- Running evaluations
- Model comparison
- Available models
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import List, Optional, AsyncGenerator
import uuid
import json
import asyncio
import logging

from ..models.evaluation_schemas import (
    EvaluationType,
    CampaignStatus,
    MetricType,
    TestCaseInput,
    TestCaseOutput,
    TestCase,
    TestSet,
    TestSetCreate,
    ModelConfig,
    Campaign,
    CampaignCreate,
    CampaignListResponse,
    CampaignResponse,
    EvaluationRunResponse,
    TestSetListResponse,
    TestSetResponse,
    ComparisonResponse,
    ModelScore,
    TestCaseResult,
    MetricScore,
    RubricScore,
    AvailableModel,
    ModelsListResponse,
    MetricDefinition,
)
from ..models.schemas import ApiResponse
from ..core.database import mongodb
from ..config import settings
from ..services.evaluation_runner import EvaluationRunner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/evaluations", tags=["evaluations"])

# =============================================================================
# Helper Functions
# =============================================================================

async def get_next_id(collection_name: str) -> str:
    """Generate sequential ID for collection"""
    counter_id = f"{collection_name}_counter"
    result = await mongodb.analytics.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return f"{collection_name[:3].upper()}{result['seq']:06d}"


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc:
        doc.pop("_id", None)
    return doc


# =============================================================================
# Test Sets Endpoints
# =============================================================================

@router.get("/test-sets", response_model=TestSetListResponse)
async def list_test_sets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None
):
    """List all test sets"""
    try:
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = mongodb.test_sets.find(query).sort("created_at", -1).skip(skip).limit(limit)
        test_sets = await cursor.to_list(length=limit)
        
        total = await mongodb.test_sets.count_documents(query)
        
        # Serialize
        for ts in test_sets:
            ts.pop("_id", None)
            if "test_cases" in ts:
                for tc in ts["test_cases"]:
                    tc.pop("_id", None) if "_id" in tc else None
        
        return TestSetListResponse(
            success=True,
            test_sets=[TestSet(**ts) for ts in test_sets],
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error listing test sets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-sets/{test_set_id}", response_model=TestSetResponse)
async def get_test_set(test_set_id: str):
    """Get a specific test set"""
    try:
        test_set = await mongodb.test_sets.find_one({"id": test_set_id})
        
        if not test_set:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        test_set.pop("_id", None)
        return TestSetResponse(
            success=True,
            test_set=TestSet(**test_set)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting test set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-sets", response_model=TestSetResponse)
async def create_test_set(test_set: TestSet):
    """Create a new test set"""
    try:
        test_set_dict = test_set.model_dump()
        test_set_dict["id"] = str(uuid.uuid4())
        test_set_dict["created_at"] = datetime.now(timezone.utc)
        test_set_dict["updated_at"] = datetime.now(timezone.utc)
        
        await mongodb.test_sets.insert_one(test_set_dict)
        
        return TestSetResponse(
            success=True,
            test_set=TestSet(**test_set_dict)
        )
    except Exception as e:
        logger.error(f"Error creating test set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/test-sets/{test_set_id}", response_model=TestSetResponse)
async def update_test_set(test_set_id: str, test_set: TestSet):
    """Update a test set"""
    try:
        existing = await mongodb.test_sets.find_one({"id": test_set_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        test_set_dict = test_set.model_dump()
        test_set_dict["updated_at"] = datetime.now(timezone.utc)
        
        await mongodb.test_sets.update_one(
            {"id": test_set_id},
            {"$set": test_set_dict}
        )
        
        return TestSetResponse(
            success=True,
            test_set=TestSet(**test_set_dict)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating test set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/test-sets/{test_set_id}")
async def delete_test_set(test_set_id: str):
    """Delete a test set"""
    try:
        result = await mongodb.test_sets.delete_one({"id": test_set_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        return ApiResponse(
            success=True,
            message="Test set deleted successfully",
            timestamp=datetime.now(timezone.utc)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting test set: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Campaigns Endpoints
# =============================================================================

@router.get("/campaigns", response_model=CampaignListResponse)
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[CampaignStatus] = None,
    search: Optional[str] = None
):
    """List all evaluation campaigns"""
    try:
        query = {}
        if status:
            query["status"] = status.value
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = mongodb.evaluation_campaigns.find(query).sort("created_at", -1).skip(skip).limit(limit)
        campaigns = await cursor.to_list(length=limit)
        
        total = await mongodb.evaluation_campaigns.count_documents(query)
        
        # Serialize
        for c in campaigns:
            c.pop("_id", None)
        
        return CampaignListResponse(
            success=True,
            campaigns=[Campaign(**c) for c in campaigns],
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error listing campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str):
    """Get a specific campaign"""
    try:
        campaign = await mongodb.evaluation_campaigns.find_one({"id": campaign_id})
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign.pop("_id", None)
        
        # Get results if campaign is completed
        results = []
        if campaign.get("status") == CampaignStatus.COMPLETED.value:
            cursor = mongodb.evaluation_results.find(
                {"campaign_id": campaign_id}
            ).sort("created_at", -1)
            results = await cursor.to_list(length=10000)
            for r in results:
                r.pop("_id", None)
        
        campaign["results"] = results
        
        return CampaignResponse(
            success=True,
            campaign=Campaign(**campaign)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(campaign: CampaignCreate):
    """Create a new evaluation campaign"""
    try:
        # Validate test set exists
        test_set = await mongodb.test_sets.find_one({"id": campaign.test_set_id})
        if not test_set:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        campaign_dict = campaign.model_dump()
        campaign_dict["id"] = str(uuid.uuid4())
        campaign_dict["status"] = CampaignStatus.DRAFT.value
        campaign_dict["progress"] = 0.0
        campaign_dict["total_test_cases"] = len(test_set.get("test_cases", []))
        campaign_dict["completed_test_cases"] = 0
        campaign_dict["results"] = []
        campaign_dict["model_scores"] = {}
        campaign_dict["created_at"] = datetime.now(timezone.utc)
        campaign_dict["started_at"] = None
        campaign_dict["completed_at"] = None
        
        await mongodb.evaluation_campaigns.insert_one(campaign_dict)
        
        return CampaignResponse(
            success=True,
            campaign=Campaign(**campaign_dict)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    try:
        # Also delete associated results
        await mongodb.evaluation_results.delete_many({"campaign_id": campaign_id})
        result = await mongodb.evaluation_campaigns.delete_one({"id": campaign_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return ApiResponse(
            success=True,
            message="Campaign deleted successfully",
            timestamp=datetime.now(timezone.utc)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Run Evaluation
# =============================================================================

@router.post("/run/{campaign_id}", response_model=EvaluationRunResponse)
async def run_evaluation(campaign_id: str):
    """
    Start an evaluation run for a campaign
    Uses SSE for progress updates
    """
    try:
        # Get campaign
        campaign = await mongodb.evaluation_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        if campaign["status"] == CampaignStatus.RUNNING.value:
            raise HTTPException(status_code=400, detail="Campaign is already running")
        
        # Get test set
        test_set = await mongodb.test_sets.find_one({"id": campaign["test_set_id"]})
        if not test_set:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        # Update campaign status
        await mongodb.evaluation_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": CampaignStatus.RUNNING.value,
                    "started_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Start evaluation in background
        asyncio.create_task(run_evaluation_async(campaign_id, campaign, test_set))
        
        return EvaluationRunResponse(
            success=True,
            campaign_id=campaign_id,
            message="Evaluation started",
            estimated_duration_seconds=len(test_set.get("test_cases", [])) * 10
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def run_evaluation_async(campaign_id: str, campaign: dict, test_set: dict):
    """Background task to run evaluation"""
    try:
        runner = EvaluationRunner(
            campaign_id=campaign_id,
            campaign=campaign,
            test_set=test_set
        )
        
        await runner.run()
        
    except Exception as e:
        logger.error(f"Error in evaluation run: {e}")
        # Update campaign status to failed
        await mongodb.evaluation_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": CampaignStatus.FAILED.value,
                    "error_message": str(e),
                    "completed_at": datetime.now(timezone.utc)
                }
            }
        )


# =============================================================================
# Compare Models
# =============================================================================

@router.post("/compare", response_model=ComparisonResponse)
async def compare_models(
    test_set_id: str,
    models: List[ModelConfig],
    metrics: List[str] = Query(default=[])
):
    """Compare multiple models on a test set"""
    try:
        # Validate test set exists
        test_set = await mongodb.test_sets.find_one({"id": test_set_id})
        if not test_set:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        # Create a temporary campaign for comparison
        campaign_data = {
            "id": str(uuid.uuid4()),
            "name": f"Comparison - {', '.join([m.model_name for m in models])}",
            "description": f"Model comparison on {test_set['name']}",
            "evaluation_type": EvaluationType.MULTI_MODEL.value,
            "test_set_id": test_set_id,
            "model_configs": [m.model_dump() for m in models],
            "metric_names": metrics,
            "status": CampaignStatus.RUNNING.value,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Run evaluation
        runner = EvaluationRunner(
            campaign_id=campaign_data["id"],
            campaign=campaign_data,
            test_set=test_set
        )
        
        results = await runner.run_sync()
        
        # Calculate model scores
        model_scores = {}
        for model_name, scores in results.items():
            passed = sum(1 for r in scores if r.get("passed", False))
            total = len(scores)
            
            model_scores[model_name] = ModelScore(
                model_name=model_name,
                total_tests=total,
                passed_tests=passed,
                pass_rate=passed / total if total > 0 else 0,
                avg_latency_ms=sum(r.get("latency_ms", 0) for r in scores) / total if total > 0 else 0,
                total_tokens=sum(r.get("token_count", 0) for r in scores)
            )
        
        # Determine winner
        winner = max(model_scores.items(), key=lambda x: x[1].pass_rate)[0] if model_scores else None
        
        return ComparisonResponse(
            success=True,
            test_set_name=test_set["name"],
            models_compared=[m.model_name for m in models],
            comparison_metrics=metrics,
            model_scores=model_scores,
            winner=winner
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Available Models
# =============================================================================

@router.get("/models", response_model=ModelsListResponse)
async def list_available_models():
    """List available models for evaluation"""
    models = [
        AvailableModel(
            model_name="gemini-3.1-pro-preview",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning", "code", "long-context"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-3-flash-preview",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-3.1-flash-lite-preview",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-2.5-pro",
            provider="google",
            context_window=2000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning", "code", "vision"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-2.5-flash",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-2.5-flash-lite",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-2.0-flash-exp",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning", "code"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-1.5-flash-latest",
            provider="google",
            context_window=1000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
        AvailableModel(
            model_name="gemini-1.5-pro-latest",
            provider="google",
            context_window=2000000,
            max_output_tokens=8192,
            capabilities=["chat", "reasoning", "code", "vision"],
            is_available=bool(settings.gemini_api_key or settings.google_api_key)
        ),
    ]
    
    # Add OpenAI if available
    if settings.openai_api_key:
        models.extend([
            AvailableModel(
                model_name="gpt-4o",
                provider="openai",
                context_window=128000,
                max_output_tokens=16384,
                capabilities=["chat", "reasoning", "code", "vision"],
                is_available=True
            ),
            AvailableModel(
                model_name="gpt-4o-mini",
                provider="openai",
                context_window=128000,
                max_output_tokens=16384,
                capabilities=["chat", "reasoning"],
                is_available=True
            ),
        ])
    
    # Add Anthropic if available
    if settings.anthropic_api_key:
        models.extend([
            AvailableModel(
                model_name="claude-3-5-sonnet-20241022",
                provider="anthropic",
                context_window=200000,
                max_output_tokens=8192,
                capabilities=["chat", "reasoning", "code"],
                is_available=True
            ),
        ])
    
    return ModelsListResponse(
        success=True,
        models=models
    )


# =============================================================================
# Evaluate Single Model
# =============================================================================

@router.post("/models/{model_name}/evaluate")
async def evaluate_single_model(
    model_name: str,
    test_set_id: str,
    model_config: Optional[ModelConfig] = None,
    metrics: List[str] = Query(default=["latency", "response_length"])
):
    """Evaluate a single model on a test set"""
    try:
        # Validate test set exists
        test_set = await mongodb.test_sets.find_one({"id": test_set_id})
        if not test_set:
            raise HTTPException(status_code=404, detail="Test set not found")
        
        # Create model config
        if model_config is None:
            model_config = ModelConfig(
                model_name=model_name,
                provider="google",
                temperature=0.7,
                max_tokens=2000
            )
        
        # Create campaign for this evaluation
        campaign_data = {
            "id": str(uuid.uuid4()),
            "name": f"Evaluation - {model_name}",
            "description": f"Single model evaluation on {test_set['name']}",
            "evaluation_type": EvaluationType.SINGLE_MODEL.value,
            "test_set_id": test_set_id,
            "model_configs": [model_config.model_dump()],
            "metric_names": metrics,
            "status": CampaignStatus.RUNNING.value,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Run evaluation
        runner = EvaluationRunner(
            campaign_id=campaign_data["id"],
            campaign=campaign_data,
            test_set=test_set
        )
        
        results = await runner.run_sync()
        
        # Get results for the model
        model_results = results.get(model_name, [])
        
        return ApiResponse(
            success=True,
            data={
                "model_name": model_name,
                "test_set_name": test_set["name"],
                "results": model_results,
                "total_tests": len(model_results),
                "passed": sum(1 for r in model_results if r.get("passed", False))
            },
            timestamp=datetime.now(timezone.utc)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Results Endpoints
# =============================================================================

@router.get("/results")
async def list_results(
    campaign_id: Optional[str] = None,
    model_name: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """List evaluation results"""
    try:
        query = {}
        if campaign_id:
            query["campaign_id"] = campaign_id
        if model_name:
            query["model_name"] = model_name
        
        cursor = mongodb.evaluation_results.find(query).sort("created_at", -1).skip(skip).limit(limit)
        results = await cursor.to_list(length=limit)
        
        total = await mongodb.evaluation_results.count_documents(query)
        
        for r in results:
            r.pop("_id", None)
        
        return ApiResponse(
            success=True,
            data={
                "results": results,
                "total": total,
                "skip": skip,
                "limit": limit
            },
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Error listing results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Seed Sample Data (for demo)
# =============================================================================

@router.post("/seed-sample-data")
async def seed_sample_data():
    """Seed sample test sets for demonstration"""
    try:
        # Check if data already exists
        existing = await mongodb.test_sets.count_documents({"name": {"$in": ["General Knowledge QA", "Math Word Problems", "Coding Tasks"]}})
        if existing > 0:
            return ApiResponse(
                success=True,
                message="Sample data already exists",
                timestamp=datetime.now(timezone.utc)
            )
        
        # Create sample test sets
        sample_test_sets = [
            TestSet(
                name="General Knowledge QA",
                description="Basic general knowledge questions for testing",
                test_cases=[
                    TestCase(
                        name="Capital of France",
                        description="Test knowledge of world capitals",
                        input=TestCaseInput(prompt="What is the capital of France?"),
                        output=TestCaseOutput(expected_response="Paris"),
                        difficulty="easy",
                        category="geography"
                    ),
                    TestCase(
                        name="Largest Planet",
                        description="Test knowledge of astronomy",
                        input=TestCaseInput(prompt="What is the largest planet in our solar system?"),
                        output=TestCaseOutput(expected_response="Jupiter"),
                        difficulty="easy",
                        category="science"
                    ),
                    TestCase(
                        name="Python Definition",
                        description="Test knowledge of programming",
                        input=TestCaseInput(prompt="What is Python?"),
                        output=TestCaseOutput(expected_response="Python is a high-level programming language"),
                        difficulty="medium",
                        category="programming"
                    ),
                ],
                tags=["qa", "general", "easy"]
            ),
            TestSet(
                name="Math Word Problems",
                description="Math word problems for testing reasoning",
                test_cases=[
                    TestCase(
                        name="Simple Addition",
                        description="Basic addition problem",
                        input=TestCaseInput(prompt="What is 25 + 17?"),
                        output=TestCaseOutput(expected_response="42"),
                        difficulty="easy",
                        category="math"
                    ),
                    TestCase(
                        name="Multiplication",
                        description="Basic multiplication",
                        input=TestCaseInput(prompt="What is 12 times 8?"),
                        output=TestCaseOutput(expected_response="96"),
                        difficulty="easy",
                        category="math"
                    ),
                ],
                tags=["math", "reasoning"]
            ),
            TestSet(
                name="Coding Tasks",
                description="Programming challenges",
                test_cases=[
                    TestCase(
                        name="Reverse String",
                        description="Write a function to reverse a string",
                        input=TestCaseInput(prompt="Write a Python function to reverse a string"),
                        output=TestCaseOutput(expected_response="def reverse_string(s): return s[::-1]"),
                        difficulty="medium",
                        category="coding"
                    ),
                ],
                tags=["coding", "programming"]
            )
        ]
        
        # Insert test sets
        for ts in sample_test_sets:
            ts_dict = ts.model_dump()
            ts_dict["created_at"] = datetime.now(timezone.utc)
            ts_dict["updated_at"] = datetime.now(timezone.utc)
            await mongodb.test_sets.insert_one(ts_dict)
        
        return ApiResponse(
            success=True,
            message=f"Created {len(sample_test_sets)} sample test sets",
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Error seeding sample data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Legacy / Chat Endpoints (for backward compatibility)
# =============================================================================

from ..models.schemas import (
    DualResponseRequest,
    PreferenceSubmission,
)


@router.post("/dual-responses")
async def get_dual_responses_legacy(request: DualResponseRequest):
    """
    Generate two responses to a user message for comparison (SSE streaming)
    This is the legacy endpoint - new evaluations use /campaigns
    """
    from fastapi.responses import StreamingResponse
    from ..services.graph import generate_dual_responses
    import asyncio
    
    session_id = request.session_id or str(uuid.uuid4())
    
    async def generate_sse_stream():
        try:
            from ..core.tracing import start_trace
            from ..core.trace_storage import trace_storage
            
            with start_trace(
                name="dual_response_generation",
                session_id=session_id,
                user_id=request.user_id,
                tags=["dual_response", "chat"]
            ) as trace:
                # Send trace info
                yield f"data: {json.dumps({'type': 'trace_info', 'trace_id': trace.id})}\n\n"
                
                # Generate responses
                result = await generate_dual_responses(
                    user_message=request.user_message,
                    chat_history=request.chat_history,
                    session_id=session_id,
                    user_id=request.user_id
                )
                
                # Send response 1
                response_1 = result.get("response_1", "Error")
                yield f"data: {json.dumps({'type': 'content', 'response_id': 1, 'content': response_1})}\n\n"
                
                await asyncio.sleep(0.1)
                
                # Send response 2
                response_2 = result.get("response_2", "Error")
                yield f"data: {json.dumps({'type': 'content', 'response_id': 2, 'content': response_2})}\n\n"
                
                yield f"data: {json.dumps({'type': 'streams_complete'})}\n\n"
                
            # Store trace after with block so it is finalized
            try:
                await trace_storage.store_trace(trace)
            except Exception as e:
                logger.error(f"Failed to store trace: {e}")
                    
        except Exception as e:
            logger.error(f"Error in dual responses: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_sse_stream(),
        media_type="text/event-stream"
    )


@router.post("/store-preference")
async def store_preference_legacy(preference: PreferenceSubmission):
    """Store user preference between two responses"""
    try:
        preference_data = {
            "session_id": preference.session_id,
            "user_message": preference.user_message,
            "response_1": preference.response_1,
            "response_2": preference.response_2,
            "choice": preference.choice.value,
            "reasoning": preference.reasoning,
            "user_id": preference.user_id,
            "timestamp": (preference.timestamp or datetime.now(timezone.utc)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await mongodb.preferences.insert_one(preference_data)
        
        return ApiResponse(
            success=True,
            message="Preference stored successfully",
            data={"preference_id": str(result.inserted_id)},
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Error storing preference: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferences/{session_id}")
async def get_preferences(session_id: str):
    """Get preferences for a session"""
    try:
        cursor = mongodb.preferences.find(
            {"session_id": session_id}
        ).sort("timestamp", -1).limit(100)
        
        preferences = await cursor.to_list(100)
        
        for p in preferences:
            p["_id"] = str(p["_id"])
        
        return ApiResponse(
            success=True,
            data=preferences,
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Error getting preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    """Get overall platform statistics"""
    try:
        total_evaluations = await mongodb.evaluations.count_documents({})
        total_preferences = await mongodb.preferences.count_documents({})
        total_traces = await mongodb.traces.count_documents({})
        total_campaigns = await mongodb.evaluation_campaigns.count_documents({})
        total_test_sets = await mongodb.test_sets.count_documents({})
        
        # Get recent preferences
        recent_prefs = await mongodb.preferences.find().sort("timestamp", -1).limit(10).to_list(10)
        
        return ApiResponse(
            success=True,
            data={
                "total_evaluations": total_evaluations,
                "total_preferences": total_preferences,
                "total_traces": total_traces,
                "total_campaigns": total_campaigns,
                "total_test_sets": total_test_sets,
                "recent_activity": len(recent_prefs),
                "generated_at": datetime.now(timezone.utc).isoformat()
            },
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Create a second router for legacy endpoints with /api prefix
legacy_router = APIRouter(prefix="/api", tags=["legacy"])


@legacy_router.post("/dual-responses")
async def legacy_dual_responses(request: DualResponseRequest):
    """Legacy endpoint - redirects to /api/v1/evaluations/dual-responses"""
    # Reuse the logic from above
    return await get_dual_responses_legacy(request)


@legacy_router.post("/store-preference")
async def legacy_store_preference(preference: PreferenceSubmission):
    """Legacy endpoint - redirects to /api/v1/evaluations/store-preference"""
    return await store_preference_legacy(preference)
