"""
State management for LangGraph workflows
"""
from typing import TypedDict, List, Optional, Dict, Any
from .schemas import ChatMessage


class DualResponseState(TypedDict):
    """State for dual response generation workflow"""
    user_message: str
    chat_history: List[ChatMessage]
    session_id: Optional[str]
    user_id: Optional[str]
    response_1: Optional[str]
    response_2: Optional[str]
    trace_id: Optional[str]
    metadata: Optional[Dict[str, Any]]
    error: Optional[str]