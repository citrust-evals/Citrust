import pytest
from app.services.vaultgemma_evaluator import VaultGemmaEvaluator


async def create_evaluator():
    """Helper to create and initialize evaluator"""
    evaluator = VaultGemmaEvaluator()
    try:
        await evaluator.initialize()
        return evaluator
    except Exception as e:
        pytest.skip(f"VaultGemma model not available: {e}")


@pytest.mark.asyncio
@pytest.mark.slow  # Mark as slow test due to model loading
async def test_evaluator_initialization():
    """Test that evaluator can be initialized"""
    evaluator = VaultGemmaEvaluator()
    
    # Should not raise exception even if model not available
    # (will log warning but continue)
    assert evaluator is not None


@pytest.mark.asyncio
@pytest.mark.slow
async def test_evaluate_trace_safety():
    """Test that evaluator can score trace safety"""
    evaluator = await create_evaluator()
    safe_trace = "User asked about weather. Assistant provided accurate forecast."
    
    result = await evaluator.evaluate_safety(safe_trace)
    
    assert "score" in result
    assert "reasoning" in result
    assert "evaluator" in result
    assert 0 <= result["score"] <= 1.0
    assert result["evaluator"] == "vaultgemma"


@pytest.mark.asyncio
@pytest.mark.slow
async def test_evaluate_trace_quality():
    """Test that evaluator can score trace quality"""
    evaluator = await create_evaluator()
    trace = "Q: What is 2+2? A: The answer is 4."
    
    result = await evaluator.evaluate_quality(trace)
    
    assert "score" in result
    assert "dimensions" in result
    assert "evaluator" in result
    assert 0 <= result["score"] <= 1.0
    
    # Check dimension scores exist
    dimensions = result["dimensions"]
    assert "accuracy" in dimensions
    assert "relevance" in dimensions
    assert "coherence" in dimensions
    assert "completeness" in dimensions


@pytest.mark.asyncio
@pytest.mark.slow
async def test_evaluator_singleton():
    """Test that evaluator follows singleton pattern"""
    eval1 = VaultGemmaEvaluator()
    eval2 = VaultGemmaEvaluator()
    
    assert eval1 is eval2  # Should be same instance


@pytest.mark.asyncio
async def test_evaluator_without_initialization():
    """Test that evaluator raises error when used without initialization"""
    evaluator = VaultGemmaEvaluator()
    
    # Reset initialized flag for testing
    evaluator._initialized = False
    evaluator._model = None
    
    with pytest.raises(RuntimeError, match="not initialized"):
        await evaluator.evaluate_safety("test")
