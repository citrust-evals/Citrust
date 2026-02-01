"""
Trace Storage - Persist tracing data to MongoDB
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorCollection
import logging

from .tracing import TraceData, SpanData

logger = logging.getLogger(__name__)


class TraceStorage:
    """Manages storage and retrieval of traces from MongoDB"""
    
    def __init__(self):
        self._collection: Optional[AsyncIOMotorCollection] = None
        self._initialized = False
    
    async def initialize(self, collection: AsyncIOMotorCollection):
        """
        Initialize the storage with a MongoDB collection
        
        Args:
            collection: MongoDB collection for traces
        """
        self._collection = collection
        self._initialized = True
        logger.info("Trace storage initialized")

        await self.ensure_indexes()
    
    async def ensure_indexes(self):
        """Create indexes for optimal query performance"""
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            # Create indexes for common query patterns
            await self._collection.create_index("trace_id", unique=True)
            await self._collection.create_index("session_id")
            await self._collection.create_index([("start_timestamp", -1)])
            await self._collection.create_index("user_id")
            await self._collection.create_index("status")
            await self._collection.create_index("has_errors")
            await self._collection.create_index("tags")
            
            # Compound indexes for analytics
            await self._collection.create_index([
                ("session_id", 1),
                ("start_timestamp", -1)
            ])
            
            await self._collection.create_index([
                ("user_id", 1),
                ("start_timestamp", -1)
            ])
            
            logger.info("Trace indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create trace indexes: {e}")
    
    async def store_trace(self, trace: TraceData) -> str:
        """
        Store a trace in MongoDB
        
        Args:
            trace: The trace to store
            
        Returns:
            The trace ID
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            trace_dict = trace.to_dict()
            await self._collection.insert_one(trace_dict)
            logger.debug(f"Stored trace {trace.id} with {len(trace.spans)} spans")
            return trace.id
        except Exception as e:
            logger.error(f"Failed to store trace {trace.id}: {e}")
            raise
    
    async def get_trace(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a trace by ID
        
        Args:
            trace_id: The trace ID
            
        Returns:
            The trace data as a dictionary, or None if not found
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            trace = await self._collection.find_one({"id": trace_id})
            return trace
        except Exception as e:
            logger.error(f"Failed to retrieve trace {trace_id}: {e}")
            return None
    
    async def get_traces_by_session(
        self,
        session_id: str,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get all traces for a session
        
        Args:
            session_id: The session ID
            limit: Maximum number of traces to return
            skip: Number of traces to skip
            
        Returns:
            List of trace dictionaries
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            cursor = self._collection.find(
                {"session_id": session_id}
            ).sort("start_timestamp", -1).skip(skip).limit(limit)
            
            traces = await cursor.to_list(length=limit)
            return traces
        except Exception as e:
            logger.error(f"Failed to retrieve traces for session {session_id}: {e}")
            return []
    
    async def get_recent_traces(
        self,
        limit: int = 100,
        skip: int = 0,
        filter_errors: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent traces
        
        Args:
            limit: Maximum number of traces to return
            skip: Number of traces to skip
            filter_errors: If True, only errors; if False, only success; if None, all
            
        Returns:
            List of trace dictionaries
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            query = {}
            if filter_errors is not None:
                query["has_errors"] = filter_errors
            
            cursor = self._collection.find(query).sort(
                "start_timestamp", -1
            ).skip(skip).limit(limit)
            
            traces = await cursor.to_list(length=limit)
            return traces
        except Exception as e:
            logger.error(f"Failed to retrieve recent traces: {e}")
            return []
    
    async def get_trace_statistics(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated trace statistics
        
        Args:
            session_id: Optional filter by session
            user_id: Optional filter by user
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            Dictionary containing statistics
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            # Build filter query
            match_query = {}
            if session_id:
                match_query["session_id"] = session_id
            if user_id:
                match_query["user_id"] = user_id
            if start_date:
                match_query["start_timestamp"] = {
                    "$gte": start_date.isoformat()
                }
            if end_date:
                if "start_timestamp" in match_query:
                    match_query["start_timestamp"]["$lte"] = end_date.isoformat()
                else:
                    match_query["start_timestamp"] = {
                        "$lte": end_date.isoformat()
                    }
            
            # Aggregation pipeline
            pipeline = [
                {"$match": match_query} if match_query else {"$match": {}},
                {
                    "$group": {
                        "_id": None,
                        "total_traces": {"$sum": 1},
                        "error_count": {
                            "$sum": {"$cond": ["$has_errors", 1, 0]}
                        },
                        "avg_latency_ms": {"$avg": "$total_latency_ms"},
                        "total_prompt_tokens": {
                            "$sum": "$total_token_usage.prompt_tokens"
                        },
                        "total_completion_tokens": {
                            "$sum": "$total_token_usage.completion_tokens"
                        },
                        "total_tokens": {
                            "$sum": "$total_token_usage.total_tokens"
                        }
                    }
                }
            ]
            
            result = await self._collection.aggregate(pipeline).to_list(1)
            
            if result:
                stats = result[0]
                stats.pop("_id", None)
                return stats
            else:
                return {
                    "total_traces": 0,
                    "error_count": 0,
                    "avg_latency_ms": 0,
                    "total_prompt_tokens": 0,
                    "total_completion_tokens": 0,
                    "total_tokens": 0
                }
                
        except Exception as e:
            logger.error(f"Failed to compute trace statistics: {e}")
            return {
                "error": str(e)
            }
    
    async def get_model_performance_stats(
        self,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Get performance statistics grouped by model
        
        Args:
            days: Number of days to look back
            
        Returns:
            Dictionary mapping model names to their stats
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            pipeline = [
                {
                    "$match": {
                        "start_timestamp": {"$gte": cutoff_date.isoformat()}
                    }
                },
                {"$unwind": "$spans"},
                {
                    "$match": {
                        "spans.model_name": {"$exists": True, "$ne": None}
                    }
                },
                {
                    "$group": {
                        "_id": "$spans.model_name",
                        "total_calls": {"$sum": 1},
                        "avg_latency_ms": {"$avg": "$spans.latency_ms"},
                        "error_count": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$spans.status", "error"]},
                                    1,
                                    0
                                ]
                            }
                        },
                        "total_tokens": {
                            "$sum": "$spans.token_usage.total_tokens"
                        }
                    }
                },
                {"$sort": {"total_calls": -1}}
            ]
            
            results = await self._collection.aggregate(pipeline).to_list(None)
            
            return {
                result["_id"]: {
                    "total_calls": result["total_calls"],
                    "avg_latency_ms": round(result["avg_latency_ms"], 2),
                    "error_count": result["error_count"],
                    "error_rate": round(
                        result["error_count"] / result["total_calls"] * 100, 2
                    ) if result["total_calls"] > 0 else 0,
                    "total_tokens": result["total_tokens"]
                }
                for result in results
            }
            
        except Exception as e:
            logger.error(f"Failed to compute model performance stats: {e}")
            return {}
    
    async def delete_old_traces(self, days: int = 30) -> int:
        """
        Delete traces older than specified days
        
        Args:
            days: Number of days to keep
            
        Returns:
            Number of deleted traces
        """
        if not self._initialized or self._collection is None:
            raise RuntimeError("TraceStorage not initialized")
        
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            result = await self._collection.delete_many({
                "start_timestamp": {"$lt": cutoff_date.isoformat()}
            })
            
            logger.info(f"Deleted {result.deleted_count} old traces")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete old traces: {e}")
            return 0


# Global trace storage instance
trace_storage = TraceStorage()