"""
MongoDB database connection and operations
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from typing import Optional
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager with async support"""
    
    def __init__(self):
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._is_connected = False
    
    async def connect(self) -> None:
        """
        Connect to MongoDB with connection pooling
        
        Raises:
            ConnectionFailure: If connection fails
        """
        try:
            self._client = AsyncIOMotorClient(
                settings.mongodb_url,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=30000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
            )
            
            # Test the connection
            await self._client.admin.command('ping')
            
            self._db = self._client[settings.database_name]
            self._is_connected = True
            
            # Initialize collections and indexes
            await self._ensure_indexes()
            
            logger.info(
                f"✓ Successfully connected to MongoDB: {settings.database_name}"
            )
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"✗ Failed to connect to MongoDB: {e}")
            self._is_connected = False
            raise
        except Exception as e:
            logger.error(f"✗ Unexpected error connecting to MongoDB: {e}")
            self._is_connected = False
            raise
    
    async def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self._client:
            self._client.close()
            self._is_connected = False
            logger.info("MongoDB connection closed")
    
    async def _ensure_indexes(self) -> None:
        """Create necessary indexes for optimal performance"""
        try:
            # Evaluations collection indexes
            evaluations = self._db[settings.evaluations_collection]
            await evaluations.create_index("session_id")
            await evaluations.create_index("timestamp")
            await evaluations.create_index([("timestamp", -1)])
            
            # Traces collection indexes
            traces = self._db[settings.traces_collection]
            await traces.create_index("trace_id")
            await traces.create_index("session_id")
            await traces.create_index([("start_time", -1)])
            await traces.create_index("span_type")
            await traces.create_index("model_name")
            
            # Preferences collection indexes
            preferences = self._db[settings.preferences_collection]
            await preferences.create_index("session_id")
            await preferences.create_index([("timestamp", -1)])
            
            # Analytics collection indexes
            analytics = self._db[settings.analytics_collection]
            await analytics.create_index([("timestamp", -1)])
            await analytics.create_index("model_name")
            await analytics.create_index("event_type")
            
            # Models collection indexes
            models = self._db[settings.models_collection]
            await models.create_index("model_id", unique=True)
            await models.create_index("model_name")
            
            # Users collection indexes
            users = self._db[settings.users_collection]
            await users.create_index("email", unique=True)
            await users.create_index([("created_at", -1)])
            
            # OTP records collection indexes
            otp_records = self._db[settings.otp_collection]
            await otp_records.create_index("email")
            await otp_records.create_index("expires_at", expireAfterSeconds=0)  # TTL index
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Failed to create some indexes: {e}")
    
    @property
    def is_connected(self) -> bool:
        """Check if database is connected"""
        return self._is_connected
    
    @property
    def database(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if not self._is_connected or self._db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._db
    
    # Collection getters
    @property
    def evaluations(self):
        """Get evaluations collection"""
        return self.database[settings.evaluations_collection]
    
    @property
    def traces(self):
        """Get traces collection"""
        return self.database[settings.traces_collection]
    
    @property
    def preferences(self):
        """Get preferences collection"""
        return self.database[settings.preferences_collection]
    
    @property
    def analytics(self):
        """Get analytics collection"""
        return self.database[settings.analytics_collection]
    
    @property
    def models(self):
        """Get models collection"""
        return self.database[settings.models_collection]
    
    @property
    def users(self):
        """Get users collection"""
        return self.database[settings.users_collection]
    
    @property
    def otp_records(self):
        """Get OTP records collection"""
        return self.database[settings.otp_collection]
    
    @property
    def db(self):
        """Get database instance (alias for database property)"""
        return self.database
    
    async def health_check(self) -> dict:
        """
        Check database health
        
        Returns:
            dict: Health status information
        """
        try:
            if not self._is_connected:
                return {
                    "status": "disconnected",
                    "message": "Database not connected"
                }
            
            # Ping the database
            await self._client.admin.command('ping')
            
            # Get database stats
            stats = await self._db.command("dbStats")
            
            return {
                "status": "connected",
                "database": settings.database_name,
                "collections": stats.get("collections", 0),
                "data_size_mb": round(stats.get("dataSize", 0) / 1024 / 1024, 2),
                "storage_size_mb": round(stats.get("storageSize", 0) / 1024 / 1024, 2)
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }


# Global database instance
mongodb = MongoDB()


async def get_database() -> AsyncIOMotorDatabase:
    """
    Dependency injection for database
    
    Usage in FastAPI:
        @app.get("/endpoint")
        async def endpoint(db: AsyncIOMotorDatabase = Depends(get_database)):
            # Use db here
    """
    return mongodb.database