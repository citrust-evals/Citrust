"""
Services module for Citrus LLM Evaluation Platform
"""
from .graph import graph, generate_dual_responses, get_llm_1, get_llm_2, MODEL_1_NAME, MODEL_2_NAME

__all__ = [
    "graph",
    "generate_dual_responses",
    "get_llm_1",
    "get_llm_2",
    "MODEL_1_NAME",
    "MODEL_2_NAME",
]