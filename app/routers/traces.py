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
    LatencyStats,
    TokenStats,
    ModelUsageStats,
    ModelPerformanceStats,
    ApiResponse,
)
from ..core.trace_storage import trace_storage
from ..core.database import mongodb

logger = logging.getLogger(__name__)

# Changed prefix to /api/v1/traces to match frontend expectations
router = APIRouter(prefix="/api/v1/traces", tags=["traces"])


# IMPORTANT: Specific routes MUST be defined BEFORE dynamic parameter routes
# Otherwise, "/statistics" would be caught by "/{trace_id}" as if "statistics" was a trace ID

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
        Aggregated statistics in frontend-compatible format
    """
    try:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        end_date = datetime.now(timezone.utc)
        
        # Build query filter
        query_filter = {
            "start_timestamp": {"$gte": start_date.isoformat()}
        }
        if session_id:
            query_filter["session_id"] = session_id
        if user_id:
            query_filter["user_id"] = user_id
        
        # Get all traces for statistics calculation
        traces = await mongodb.traces.find(query_filter).to_list(length=10000)
        
        total_traces = len(traces)
        if total_traces == 0:
            return TraceStatistics(
                total_traces=0,
                successful_traces=0,
                failed_traces=0,
                latency=LatencyStats(),
                tokens=TokenStats(),
                models_used=[],
                time_range={"start": start_date.isoformat(), "end": end_date.isoformat()}
            )
        
        # Calculate statistics
        successful_traces = sum(1 for t in traces if not t.get("has_errors", False))
        failed_traces = total_traces - successful_traces
        
        # Latency calculations
        latencies = [t.get("total_latency_ms", 0) or 0 for t in traces]
        latencies = [l for l in latencies if l > 0]  # Filter out zeros
        
        if latencies:
            latencies_sorted = sorted(latencies)
            n = len(latencies_sorted)
            latency_stats = LatencyStats(
                avg_ms=round(sum(latencies) / len(latencies), 2),
                min_ms=round(min(latencies), 2),
                max_ms=round(max(latencies), 2),
                p50_ms=round(latencies_sorted[int(n * 0.5)], 2),
                p95_ms=round(latencies_sorted[min(int(n * 0.95), n - 1)], 2),
                p99_ms=round(latencies_sorted[min(int(n * 0.99), n - 1)], 2)
            )
        else:
            latency_stats = LatencyStats()
        
        # Token calculations - safely handle None values
        total_prompt_tokens = sum(
            (t.get("total_token_usage") or {}).get("prompt_tokens", 0) or 0 
            for t in traces
        )
        total_completion_tokens = sum(
            (t.get("total_token_usage") or {}).get("completion_tokens", 0) or 0 
            for t in traces
        )
        total_tokens = total_prompt_tokens + total_completion_tokens
        avg_tokens_per_trace = round(total_tokens / total_traces, 2) if total_traces > 0 else 0
        
        token_stats = TokenStats(
            total=total_tokens,
            prompt=total_prompt_tokens,
            completion=total_completion_tokens,
            avg_per_trace=avg_tokens_per_trace
        )
        
        # Model usage calculations - safely handle None values
        model_usage = {}
        for trace in traces:
            for span in (trace.get("spans") or []):
                model_name = span.get("model_name")
                if model_name:
                    if model_name not in model_usage:
                        model_usage[model_name] = {
                            "call_count": 0,
                            "total_tokens": 0,
                            "total_latency": 0
                        }
                    model_usage[model_name]["call_count"] += 1
                    model_usage[model_name]["total_tokens"] += (
                        (span.get("token_usage") or {}).get("total_tokens", 0) or 0
                    )
                    model_usage[model_name]["total_latency"] += (
                        span.get("latency_ms", 0) or 0
                    )
        
        models_used = []
        for model_name, stats in model_usage.items():
            avg_latency = (
                round(stats["total_latency"] / stats["call_count"], 2)
                if stats["call_count"] > 0 else 0
            )
            models_used.append(ModelUsageStats(
                model=model_name,
                call_count=stats["call_count"],
                total_tokens=stats["total_tokens"],
                avg_latency_ms=avg_latency
            ))
        
        return TraceStatistics(
            total_traces=total_traces,
            successful_traces=successful_traces,
            failed_traces=failed_traces,
            latency=latency_stats,
            tokens=token_stats,
            models_used=models_used,
            time_range={"start": start_date.isoformat(), "end": end_date.isoformat()}
        )
    
    except Exception as e:
        logger.error(f"Error computing trace statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute statistics: {str(e)}"
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


@router.delete("/cleanup")
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


# IMPORTANT: Dynamic parameter route MUST be defined LAST
# Otherwise it would catch requests meant for /statistics, /models/performance, etc.
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