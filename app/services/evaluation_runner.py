"""
Evaluation Runner Service

Handles running evaluations on test sets with multiple models.
"""
import asyncio
import logging
import time
import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid

from ..core.database import mongodb
from ..models.evaluation_schemas import (
    CampaignStatus,
    MetricType,
    TestCaseResult,
    MetricScore,
    RubricScore,
    TestCase,
    TestSet,
)
from ..config import settings
from ..services.model_client import ModelClient

logger = logging.getLogger(__name__)

def _normalize_text(text: str) -> str:
    """Helper to normalize text by lowercasing and removing punctuation"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip()

class EvaluationRunner:
    """Runs evaluations on test sets"""
    
    def __init__(self, campaign_id: str, campaign: dict, test_set: dict):
        self.campaign_id = campaign_id
        self.campaign = campaign
        self.test_set = test_set
        self.model_clients: Dict[str, ModelClient] = {}
        
    async def run(self):
        """Run evaluation (async with progress updates)"""
        try:
            test_cases = self.test_set.get("test_cases", [])
            model_configs = self.campaign.get("model_configs", [])
            
            total_tests = len(test_cases) * len(model_configs)
            completed = 0
            
            for model_config in model_configs:
                model_name = model_config.get("model_name")
                
                # Initialize model client
                client = ModelClient(
                    model_name=model_name,
                    provider=model_config.get("provider", "google"),
                    temperature=model_config.get("temperature", 0.7),
                    max_tokens=model_config.get("max_tokens", 2000)
                )
                self.model_clients[model_name] = client
                
                for test_case in test_cases:
                    try:
                        result = await self._evaluate_test_case(
                            test_case=test_case,
                            model_name=model_name,
                            client=client
                        )
                        
                        # Store result
                        await self._store_result(result)
                        
                    except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id)}: {e}")
                        # Add a failed result for tracking if _evaluate_test_case fails completely
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        await self._store_result(failed_result)

                    
                    completed += 1
                    
                    # Update progress
                    progress = (completed / total_tests) * 100
                    await mongodb.evaluation_campaigns.update_one(
                        {"id": self.campaign_id},
                        {"$set": {"progress": progress}}
                    )
            
            # Aggregate results to calculate model_scores
            cursor = mongodb.evaluation_results.find({"campaign_id": self.campaign_id})
            results = await cursor.to_list(length=10000)
            
            model_scores = {}
            for res in results:
                model_name = res.get("model_name")
                if not model_name:
                    continue
                if model_name not in model_scores:
                    model_scores[model_name] = {
                        "model_name": model_name,
                        "total_tests": 0,
                        "passed_tests": 0,
                        "pass_rate": 0.0,
                        "avg_latency_ms": 0.0,
                        "total_tokens": 0,
                        "avg_score": 0.0,
                        "metric_averages": {},
                        "rubric_averages": {}
                    }
                
                ms = model_scores[model_name]
                ms["total_tests"] += 1
                if res.get("passed"):
                    ms["passed_tests"] += 1
                ms["avg_latency_ms"] += res.get("latency_ms", 0)
                ms["total_tokens"] += res.get("token_count", 0)
                
                # Aggregate metrics
                for metric in res.get("metric_scores", []):
                    m_name = metric.get("metric_name")
                    m_score = metric.get("score", 0)
                    if m_name not in ms["metric_averages"]:
                        ms["metric_averages"][m_name] = {"total": 0, "count": 0}
                    ms["metric_averages"][m_name]["total"] += m_score
                    ms["metric_averages"][m_name]["count"] += 1
            
            # Finalize averages
            for ms in model_scores.values():
                if ms["total_tests"] > 0:
                    ms["pass_rate"] = ms["passed_tests"] / ms["total_tests"]
                    ms["avg_latency_ms"] /= ms["total_tests"]
                for m_name, m_data in list(ms["metric_averages"].items()):
                    ms["metric_averages"][m_name] = m_data["total"] / m_data["count"] if m_data["count"] > 0 else 0

            # Mark as completed and save model_scores
            await mongodb.evaluation_campaigns.update_one(
                {"id": self.campaign_id},
                {
                    "$set": {
                        "status": CampaignStatus.COMPLETED.value,
                        "progress": 100.0,
                        "completed_test_cases": completed,
                        "model_scores": model_scores,
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            logger.info(f"Evaluation {self.campaign_id} completed")
            
        except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id)}: {e}")
                        # Add a failed result for tracking if _evaluate_test_case fails completely
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        await self._store_result(failed_result)

            await mongodb.evaluation_campaigns.update_one(
                {"id": self.campaign_id},
                {
                    "$set": {
                        "status": CampaignStatus.FAILED.value,
                        "error_message": str(e),
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
            raise
    
    async def run_sync(self) -> Dict[str, List[dict]]:
        """Run evaluation synchronously and return results"""
        results: Dict[str, List[dict]] = {}
        
        try:
            test_cases = self.test_set.get("test_cases", [])
            model_configs = self.campaign.get("model_configs", [])
            
            for model_config in model_configs:
                model_name = model_config.get("model_name")
                results[model_name] = []
                
                # Initialize model client
                client = ModelClient(
                    model_name=model_name,
                    provider=model_config.get("provider", "google"),
                    temperature=model_config.get("temperature", 0.7),
                    max_tokens=model_config.get("max_tokens", 2000)
                )
                self.model_clients[model_name] = client
                
                for test_case in test_cases:
                    try:
                        result = await self._evaluate_test_case(
                            test_case=test_case,
                            model_name=model_name,
                            client=client
                        )
                        results[model_name].append(result.model_dump())
                        
                        # Store result
                        await self._store_result(result)
                        
                    except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id)}: {e}")
                        # Add a failed result for tracking if _evaluate_test_case fails completely
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        await self._store_result(failed_result)

            
            return results
            
        except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id)}: {e}")
                        # Add a failed result for tracking if _evaluate_test_case fails completely
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        await self._store_result(failed_result)

            raise
    
    async def _evaluate_test_case(
        self,
        test_case: dict,
        model_name: str,
        client: ModelClient
    ) -> TestCaseResult:
        """Evaluate a single test case"""
        start_time = time.time()
        
        input_data = test_case.get("input", {})
        prompt = input_data.get("prompt", "")
        
        # Get model response
        response = ""
        error = None
        try:
            response = await client.generate(prompt)
        except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id)}: {e}")
                        # Add a failed result for tracking if _evaluate_test_case fails completely
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        await self._store_result(failed_result)

            logger.error(f"Model generation error: {e}")
        
        latency_ms = (time.time() - start_time) * 1000
        token_count = len(response.split()) * 4 // 3  # Approximate
        
        # Calculate metrics
        metric_scores = []
        output_data = test_case.get("output", {})
        expected_response = output_data.get("expected_response")
        
        # Exact match & NLP Metrics
        if expected_response:
            norm_expected = _normalize_text(expected_response)
            norm_actual = _normalize_text(response)
            
            # Exact match (normalized substring or direct match)
            exact_match = 1.0 if norm_expected in norm_actual else 0.0
            
            metric_scores.append(MetricScore(
                metric_name="exact_match",
                metric_type=MetricType.EXACT_MATCH,
                score=exact_match,
                details={"expected": expected_response, "actual": response[:100]}
            ))
            
            # F1 score (simple word overlap)
            expected_words = set(norm_expected.split())
            actual_words = set(norm_actual.split())
            
            # Rouge-1 (Recall)
            rouge_1 = len(expected_words & actual_words) / len(expected_words) if expected_words else 0.0
            
            # BLEU-1 (Precision)
            bleu_1 = len(expected_words & actual_words) / len(actual_words) if actual_words else 0.0
            
            if expected_words or actual_words:
                f1 = 2 * len(expected_words & actual_words) / (len(expected_words) + len(actual_words))
            else:
                f1 = 0.0
                
            metric_scores.append(MetricScore(
                metric_name="f1_score",
                metric_type=MetricType.F1,
                score=f1,
                details={"expected": expected_response, "actual": response[:100]}
            ))
            
            metric_scores.append(MetricScore(
                metric_name="rouge",
                metric_type=MetricType.CUSTOM,
                score=rouge_1,
                details={"note": "Rouge-1 Recall"}
            ))
            
            metric_scores.append(MetricScore(
                metric_name="bleu",
                metric_type=MetricType.CUSTOM,
                score=bleu_1,
                details={"note": "BLEU-1 Precision"}
            ))
        
        # Latency metric
        metric_scores.append(MetricScore(
            metric_name="latency",
            metric_type=MetricType.LATENCY,
            score=latency_ms,
            details={"unit": "ms"}
        ))
        
        # Token count metric
        metric_scores.append(MetricScore(
            metric_name="token_count",
            metric_type=MetricType.TOKEN_COUNT,
            score=token_count,
            details={"approximate": True}
        ))
        
        # Determine pass/fail
        passed = any(
            m.metric_name in ["exact_match", "f1_score", "rouge", "bleu"] and m.score >= 0.5
            for m in metric_scores
        ) if expected_response else (response and not error)
        
        return TestCaseResult(
            id=str(uuid.uuid4()),
            test_case_id=test_case.get("id", ""),
            test_case_name=test_case.get("name", ""),
            model_name=model_name,
            input_prompt=prompt,
            model_response=response,
            expected_response=expected_response,
            metric_scores=metric_scores,
            rubric_scores=[],
            latency_ms=latency_ms,
            token_count=token_count,
            error=error,
            passed=bool(passed),
            created_at=datetime.now(timezone.utc)
        )
    
    async def _store_result(self, result: TestCaseResult):
        """Store evaluation result"""
        result_dict = result.model_dump()
        result_dict["campaign_id"] = self.campaign_id
        await mongodb.evaluation_results.insert_one(result_dict)
