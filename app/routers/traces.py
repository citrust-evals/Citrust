"""
Trace viewing and analytics endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import logging

from ..models.schemas import (
    Trace,
    TraceStatistics,
    ModelPerformanceStats,
    ApiResponse,
)
from ..core.trace_storage import trace_storage
from ..core.database import mongodb

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["traces"])


@router.get("/{trace_id}", response_model=Trace)
async def get_trace(trace_id: str):
    """
    Get a specific trace by ID
    
    Args:
        trace_id: The trace ID
        
    Returns:
        The complete trace with all spans
    """
    try:
        trace = await trace_storage.get_trace(trace_id)
        
        if not trace:
            raise HTTPException(
                status_code=404,
                detail=f"Trace {trace_id} not found"
            )
        
        # Convert MongoDB document to response model
        trace.pop("_id", None)
        return Trace(**trace)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving trace {trace_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve trace: {str(e)}"
        )


@router.get("/", response_model=List[Trace])
async def get_traces(
    session_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    errors_only: Optional[bool] = None
):
    """
    Get traces with optional filtering
    
    Args:
        session_id: Optional session ID filter
        limit: Maximum number of traces to return
        skip: Number of traces to skip
        errors_only: If True, only return traces with errors
        
    Returns:
        List of traces
    """
    try:
        if session_id:
            traces = await trace_storage.get_traces_by_session(
                session_id=session_id,
                limit=limit,
                skip=skip
            )
        else:
            traces = await trace_storage.get_recent_traces(
                limit=limit,
                skip=skip,
                filter_errors=errors_only
            )
        
        # Convert MongoDB documents to response models
        result = []
        for trace in traces:
            trace.pop("_id", None)
            result.append(Trace(**trace))
        
        return result
    
    except Exception as e:
        logger.error(f"Error retrieving traces: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve traces: {str(e)}"
        )


@router.get("/statistics", response_model=TraceStatistics)
async def get_trace_statistics(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    days: int = Query(7, ge=1, le=90)
):
    """
    Get aggregated trace statistics
    
    Args:
        session_id: Optional session ID filter
        user_id: Optional user ID filter
        days: Number of days to look back (default 7)
        
    Returns:
        Aggregated statistics
    """
    try:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        stats = await trace_storage.get_trace_statistics(
            session_id=session_id,
            user_id=user_id,
            start_date=start_date
        )
        
        # Ensure all required fields are present
        stats.setdefault("total_traces", 0)
        stats.setdefault("error_count", 0)
        stats.setdefault("avg_latency_ms", 0)
        stats.setdefault("total_prompt_tokens", 0)
        stats.setdefault("total_completion_tokens", 0)
        stats.setdefault("total_tokens", 0)
        
        # Calculate error rate
        if stats["total_traces"] > 0:
            stats["error_rate"] = round(
                (stats["error_count"] / stats["total_traces"]) * 100,
                2
            )
        else:
            stats["error_rate"] = 0.0
        
        return TraceStatistics(**stats)
    
    except Exception as e:
        logger.error(f"Error computing trace statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute statistics: {str(e)}"
        )


@router.get("/models/performance")
async def get_model_performance(
    days: int = Query(7, ge=1, le=90)
):
    """
    Get performance statistics for all models
    
    Args:
        days: Number of days to look back
        
    Returns:
        Dictionary of model performance stats
    """
    try:
        stats = await trace_storage.get_model_performance_stats(days=days)
        
        return ApiResponse(
            success=True,
            data=stats,
            message=f"Model performance for last {days} days",
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error computing model performance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute model performance: {str(e)}"
        )


@router.get("/analytics/realtime")
async def get_realtime_analytics(
    minutes: int = Query(60, ge=5, le=1440)
):
    """
    Get real-time analytics for the dashboard
    
    Args:
        minutes: Time window in minutes
        
    Returns:
        Real-time metrics
    """
    try:
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        
        # Get recent traces
        pipeline = [
            {
                "$match": {
                    "start_timestamp": {"$gte": cutoff_time.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_requests": {"$sum": 1},
                    "avg_latency": {"$avg": "$total_latency_ms"},
                    "error_count": {
                        "$sum": {"$cond": ["$has_errors", 1, 0]}
                    },
                    "total_tokens": {"$sum": "$total_token_usage.total_tokens"}
                }
            }
        ]
        
        result = await mongodb.traces.aggregate(pipeline).to_list(1)
        
        if result:
            data = result[0]
            data.pop("_id", None)
            data["avg_latency"] = round(data.get("avg_latency", 0), 2)
            data["error_rate"] = (
                round((data["error_count"] / data["total_requests"]) * 100, 2)
                if data["total_requests"] > 0
                else 0
            )
            data["requests_per_minute"] = round(
                data["total_requests"] / minutes,
                2
            )
        else:
            data = {
                "total_requests": 0,
                "avg_latency": 0,
                "error_count": 0,
                "error_rate": 0,
                "total_tokens": 0,
                "requests_per_minute": 0
            }
        
        data["time_window_minutes"] = minutes
        data["generated_at"] = datetime.now(timezone.utc).isoformat()
        
        return ApiResponse(
            success=True,
            data=data,
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error computing realtime analytics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute analytics: {str(e)}"
        )


@router.get("/analytics/class-balance")
async def get_class_balance():
    """
    Get class balance data for the dashboard
    
    Returns:
        Class distribution data
    """
    try:
        # This is mock data for demonstration
        # In production, you would calculate from actual data
        data = {
            "neutral": {"count": 450, "percentage": 45},
            "positive": {"count": 320, "percentage": 32},
            "negative": {"count": 150, "percentage": 15},
            "unclassified": {"count": 80, "percentage": 8}
        }
        
        return ApiResponse(
            success=True,
            data=data,
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error computing class balance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute class balance: {str(e)}"
        )


@router.delete("/traces/cleanup")
async def cleanup_old_traces(
    days: int = Query(30, ge=7, le=365)
):
    """
    Delete traces older than specified days
    
    Args:
        days: Keep traces from last N days
        
    Returns:
        Number of deleted traces
    """
    try:
        deleted_count = await trace_storage.delete_old_traces(days=days)
        
        return ApiResponse(
            success=True,
            data={"deleted_count": deleted_count},
            message=f"Deleted {deleted_count} traces older than {days} days",
            timestamp=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"Error cleaning up traces: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup traces: {str(e)}"
        )