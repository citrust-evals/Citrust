"""
LangGraph workflow for dual response generation
"""
import os
import logging
from typing import List, Dict, Any
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ..models.state import DualResponseState
from ..models.schemas import ChatMessage
from ..core.tracing import (
    trace_span,
    SpanType,
    TokenUsage,
    estimate_token_usage,
    start_trace
)
from ..config import settings

logger = logging.getLogger(__name__)

# Model configuration - using two different models for comparison
MODEL_1_NAME = settings.model_1  # First model for response 1
MODEL_2_NAME = settings.model_2  # Second model for response 2
MODEL_PROVIDER = "google"

# Initialize LLMs - separate instances for each model
_llm_1_instance = None
_llm_2_instance = None


def get_llm_1():
    """Get or create LLM instance for first response (model_1)"""
    global _llm_1_instance
    
    if _llm_1_instance is None:
        api_key = settings.gemini_api_key or settings.google_api_key
        
        if not api_key:
            raise ValueError(
                "No Google API key configured. Set GEMINI_API_KEY or "
                "GOOGLE_API_KEY in environment"
            )
        
        _llm_1_instance = ChatGoogleGenerativeAI(
            model=MODEL_1_NAME,
            google_api_key=api_key,
            temperature=settings.default_temperature,
            max_output_tokens=settings.default_max_tokens,
            streaming=True
        )
        logger.info(f"Initialized LLM 1: {MODEL_1_NAME}")
    
    return _llm_1_instance


def get_llm_2():
    """Get or create LLM instance for second response (model_2)"""
    global _llm_2_instance
    
    if _llm_2_instance is None:
        api_key = settings.gemini_api_key or settings.google_api_key
        
        if not api_key:
            raise ValueError(
                "No Google API key configured. Set GEMINI_API_KEY or "
                "GOOGLE_API_KEY in environment"
            )
        
        _llm_2_instance = ChatGoogleGenerativeAI(
            model=MODEL_2_NAME,
            google_api_key=api_key,
            temperature=settings.default_temperature,
            max_output_tokens=settings.default_max_tokens,
            streaming=True
        )
        logger.info(f"Initialized LLM 2: {MODEL_2_NAME}")
    
    return _llm_2_instance



def build_messages(state: DualResponseState) -> List[Any]:
    """
    Build message list from state
    
    Args:
        state: Current state
        
    Returns:
        List of LangChain messages
    """
    messages = []
    
    # Add chat history
    for msg in state.get("chat_history", []):
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            messages.append(SystemMessage(content=msg.content))
    
    # Add current user message
    user_msg = state.get("user_message", "")
    if user_msg:
        messages.append(HumanMessage(content=user_msg))
    
    return messages


def get_prompt_text(messages: List[Any]) -> str:
    """
    Extract text from messages for token counting
    
    Args:
        messages: List of messages
        
    Returns:
        Combined text
    """
    return " ".join([msg.content for msg in messages if hasattr(msg, 'content')])


def validate_input(state: DualResponseState) -> DualResponseState:
    """
    Validate and prepare input
    
    Args:
        state: Current state
        
    Returns:
        Updated state
    """
    with trace_span(
        name="validate_input",
        span_type=SpanType.CHAIN,
        metadata={
            "chat_history_length": len(state.get("chat_history", [])),
            "user_message_length": len(state.get("user_message", ""))
        }
    ) as span:
        # Trim history if too long (keep last 20 messages)
        chat_history = state.get("chat_history", [])
        if len(chat_history) > 20:
            state["chat_history"] = chat_history[-20:]
            span.metadata["trimmed_history"] = True
        
        span.output_data = "Input validated successfully"
        return state


def gemini_response_1(state: DualResponseState) -> DualResponseState:
    """
    Generate first response
    
    Args:
        state: Current state
        
    Returns:
        State with response_1 populated
    """
    messages = build_messages(state)
    prompt_text = get_prompt_text(messages)
    full_response = ""
    
    with trace_span(
        name="gemini_response_1",
        span_type=SpanType.LLM,
        model_name=MODEL_1_NAME,
        model_provider=MODEL_PROVIDER,
        metadata={
            "temperature": settings.default_temperature,
            "max_output_tokens": settings.default_max_tokens,
            "response_index": 1
        }
    ) as span:
        try:
            # Capture input
            span.input_data = {
                "user_message": state.get("user_message", ""),
                "message_count": len(messages)
            }
            
            # Stream response using model 1
            for chunk in get_llm_1().stream(messages):
                full_response += chunk.content or ""
            
            # Capture output and token usage
            span.output_data = (
                full_response[:500] + "..."
                if len(full_response) > 500
                else full_response
            )
            span.token_usage = estimate_token_usage(
                prompt=prompt_text,
                completion=full_response,
                model_name=MODEL_1_NAME
            )
            
            logger.debug(
                f"Response 1 generated: {len(full_response)} chars, "
                f"{span.token_usage.total_tokens} tokens"
            )
            
        except Exception as e:
            full_response = f"Error generating response 1: {str(e)}"
            span.error = str(e)
            span.error_type = type(e).__name__
            logger.error(f"Error in gemini_response_1: {e}")
    
    state["response_1"] = full_response
    return state


def gemini_response_2(state: DualResponseState) -> DualResponseState:
    """
    Generate second response
    
    Args:
        state: Current state
        
    Returns:
        State with response_2 populated
    """
    messages = build_messages(state)
    prompt_text = get_prompt_text(messages)
    full_response = ""
    
    with trace_span(
        name="gemini_response_2",
        span_type=SpanType.LLM,
        model_name=MODEL_2_NAME,
        model_provider=MODEL_PROVIDER,
        metadata={
            "temperature": settings.default_temperature,
            "max_output_tokens": settings.default_max_tokens,
            "response_index": 2
        }
    ) as span:
        try:
            # Capture input
            span.input_data = {
                "user_message": state.get("user_message", ""),
                "message_count": len(messages)
            }
            
            # Stream response using model 2
            for chunk in get_llm_2().stream(messages):
                full_response += chunk.content or ""
            
            # Capture output and token usage
            span.output_data = (
                full_response[:500] + "..."
                if len(full_response) > 500
                else full_response
            )
            span.token_usage = estimate_token_usage(
                prompt=prompt_text,
                completion=full_response,
                model_name=MODEL_2_NAME
            )
            
            logger.debug(
                f"Response 2 generated: {len(full_response)} chars, "
                f"{span.token_usage.total_tokens} tokens"
            )
            
        except Exception as e:
            full_response = f"Error generating response 2: {str(e)}"
            span.error = str(e)
            span.error_type = type(e).__name__
            logger.error(f"Error in gemini_response_2: {e}")
    
    state["response_2"] = full_response
    return state


def merge_responses(state: DualResponseState) -> DualResponseState:
    """
    Finalize and merge responses
    
    Args:
        state: Current state
        
    Returns:
        Final state
    """
    with trace_span(
        name="merge_responses",
        span_type=SpanType.CHAIN,
        metadata={
            "response_1_length": len(state.get("response_1", "")),
            "response_2_length": len(state.get("response_2", ""))
        }
    ) as span:
        span.output_data = "Responses merged successfully"
        return state


def build_dual_response_graph():
    """
    Build the LangGraph workflow
    
    Returns:
        Compiled graph
    """
    graph = StateGraph(DualResponseState)
    
    # Add nodes
    graph.add_node("validate_input", validate_input)
    graph.add_node("gemini_response_1", gemini_response_1)
    graph.add_node("gemini_response_2", gemini_response_2)
    graph.add_node("merge_responses", merge_responses)
    
    # Build flow (sequential for proper tracing)
    graph.add_edge(START, "validate_input")
    graph.add_edge("validate_input", "gemini_response_1")
    graph.add_edge("gemini_response_1", "gemini_response_2")
    graph.add_edge("gemini_response_2", "merge_responses")
    graph.add_edge("merge_responses", END)
    
    return graph.compile()


# Create graph instance
graph = build_dual_response_graph()


async def generate_dual_responses(
    user_message: str,
    chat_history: List[ChatMessage],
    session_id: str = None,
    user_id: str = None
) -> DualResponseState:
    """
    Generate two responses to a user message
    
    Args:
        user_message: The user's input
        chat_history: Previous conversation
        session_id: Session identifier
        user_id: User identifier
        
    Returns:
        State containing both responses
    """
    initial_state: DualResponseState = {
        "user_message": user_message,
        "chat_history": chat_history,
        "session_id": session_id,
        "user_id": user_id,
        "response_1": None,
        "response_2": None,
        "trace_id": None,
        "metadata": {},
        "error": None
    }
    
    try:
        # Run the graph
        final_state = graph.invoke(initial_state)
        logger.info(
            f"Dual responses generated for session {session_id}: "
            f"R1={len(final_state.get('response_1', ''))} chars, "
            f"R2={len(final_state.get('response_2', ''))} chars"
        )
        return final_state
    
    except Exception as e:
        logger.error(f"Error in generate_dual_responses: {e}")
        initial_state["error"] = str(e)
        initial_state["response_1"] = f"Error: {str(e)}"
        initial_state["response_2"] = f"Error: {str(e)}"
        return initial_state