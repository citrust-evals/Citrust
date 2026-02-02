"""
Evaluation and chat endpoints for Citrus AI
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import List, Dict, Any, AsyncGenerator
import logging
import uuid
import json
import asyncio

from ..models.schemas import (
    DualResponseRequest,
    DualResponseResult,
    PreferenceSubmission,
    ApiResponse,
    ChatMessage,
)
from ..core.database import mongodb
from ..services.graph import generate_dual_responses, MODEL_1_NAME, MODEL_2_NAME
from ..core.tracing import start_trace, finish_trace
from ..core.trace_storage import trace_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["evaluations"])


async def sse_event(data: dict) -> str:
    """Format data as SSE event"""
    return f"data: {json.dumps(data)}\n\n"


async def generate_sse_stream(request: DualResponseRequest) -> AsyncGenerator[str, None]:
    """Generate SSE stream for dual responses"""
    session_id = request.session_id or str(uuid.uuid4())
    
    try:
        # Start a trace for this request
        with start_trace(
            name="dual_response_generation",
            session_id=session_id,
            user_id=request.user_id,
            metadata={
                "model_1": MODEL_1_NAME,
                "model_2": MODEL_2_NAME,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens
            },
            tags=["dual_response", "chat", "streaming"]
        ) as trace:
            # Send trace info first
            yield await sse_event({
                "type": "trace_info",
                "trace_id": trace.id,
                "session_id": session_id
            })
            
            # Generate responses (this runs the LangGraph)
            result = await generate_dual_responses(
                user_message=request.user_message,
                chat_history=request.chat_history,
                session_id=session_id,
                user_id=request.user_id
            )
            
            # Stream response 1 content
            response_1 = result.get("response_1", "Error generating response")
            yield await sse_event({
                "type": "content",
                "response_id": 1,
                "content": response_1,
                "model": MODEL_1_NAME,
                "done": True
            })
            
            # Small delay for smoother UI
            await asyncio.sleep(0.1)
            
            # Stream response 2 content
            response_2 = result.get("response_2", "Error generating response")
            yield await sse_event({
                "type": "content",
                "response_id": 2,
                "content": response_2,
                "model": MODEL_2_NAME,
                "done": True
            })
            
            # Send completion event
            yield await sse_event({
                "type": "streams_complete",
                "session_id": session_id,
                "trace_id": trace.id
            })
            
            # Store the trace
            try:
                await trace_storage.store_trace(trace)
                logger.info(f"Stored trace {trace.id} for session {session_id}")
            except Exception as e:
                logger.error(f"Failed to store trace: {e}")
    
    except Exception as e:
        logger.error(f"Error in generate_sse_stream: {e}")
        yield await sse_event({
            "type": "error",
            "error": str(e)
        })


@router.post("/dual-responses")
async def get_dual_responses(request: DualResponseRequest):
    """
    Generate two responses to a user message for comparison (SSE streaming)
    
    Args:
        request: The dual response request
        
    Returns:
        SSE stream with both responses
    """
    return StreamingResponse(
        generate_sse_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/store-preference", response_model=ApiResponse)
async def store_preference(preference: PreferenceSubmission):
    """
    Store user's preference between two responses
    
    Args:
        preference: The user's preference submission
        
    Returns:
        Success response
    """
    try:
        # Prepare preference data
        preference_data = {
            "session_id": preference.session_id,
            "user_message": preference.user_message,
            "response_1": preference.response_1,
            "response_2": preference.response_2,
            "choice": preference.choice.value,
            "reasoning": preference.reasoning,
            "user_id": preference.user_id,
            "timestamp": (
                preference.timestamp or datetime.now(timezone.utc)
            ).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in MongoDB
        result = await mongodb.preferences.insert_one(preference_data)
        
        logger.info(
            f"Stored preference for session {preference.session_id}: "
            f"{preference.choice.value}"
        )
        
        return ApiResponse(
            success=True,
            message="Preference stored successfully",
            data={"preference_id": str(result.inserted_id)},
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error storing preference: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store preference: {str(e)}"
        )


@router.get("/preferences/{session_id}")
async def get_session_preferences(session_id: str):
    """
    Get all preferences for a session
    
    Args:
        session_id: The session ID
        
    Returns:
        List of preferences
    """
    try:
        cursor = mongodb.preferences.find(
            {"session_id": session_id}
        ).sort("timestamp", -1)
        
        preferences = await cursor.to_list(length=100)
        
        # Convert ObjectId to string
        for pref in preferences:
            pref["_id"] = str(pref["_id"])
        
        return ApiResponse(
            success=True,
            data=preferences,
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error retrieving preferences: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve preferences: {str(e)}"
        )


@router.get("/stats")
async def get_stats():
    """
    Get overall statistics
    
    Returns:
        Platform statistics
    """
    try:
        # Count documents in collections
        total_evaluations = await mongodb.evaluations.count_documents({})
        total_preferences = await mongodb.preferences.count_documents({})
        total_traces = await mongodb.traces.count_documents({})
        
        # Get recent activity
        recent_prefs = await mongodb.preferences.find().sort(
            "timestamp", -1
        ).limit(10).to_list(10)
        
        return ApiResponse(
            success=True,
            data={
                "total_evaluations": total_evaluations,
                "total_preferences": total_preferences,
                "total_traces": total_traces,
                "recent_activity": len(recent_prefs),
                "generated_at": datetime.now(timezone.utc).isoformat()
            },
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get statistics: {str(e)}"
        )


@router.post("/chat/send")
async def send_chat_message(request: DualResponseRequest):
    """
    Send a chat message and get a single response (not dual)
    
    Args:
        request: The chat request
        
    Returns:
        Single response
    """
    try:
        session_id = request.session_id or str(uuid.uuid4())
        
        # Generate responses using dual response system
        result = await generate_dual_responses(
            user_message=request.user_message,
            chat_history=request.chat_history,
            session_id=session_id,
            user_id=request.user_id
        )
        
        # Return just the first response for regular chat
        return ApiResponse(
            success=True,
            data={
                "response": result.get("response_1", "Error generating response"),
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send message: {str(e)}"
        )