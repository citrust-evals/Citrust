"""
FastAPI application for Citrus LLM Evaluation Platform
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import time
import logging

from .core.database import mongodb
from .core.trace_storage import trace_storage
from .config import settings
from .routers import evaluations, traces, auth
from .models.schemas import HealthStatus, ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Application start time for uptime tracking
_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler for startup and shutdown
    
    Handles:
    - Database connection initialization
    - Trace storage setup
    - Graceful shutdown
    """
    # Startup
    logger.info("🚀 Starting Citrus LLM Evaluation Platform...")
    logger.info(f"Version: {settings.app_version}")
    logger.info(f"Environment: {settings.mongodb_url[:20]}...")
    
    try:
        # Connect to MongoDB
        await mongodb.connect()
        logger.info("✓ Database connected successfully")
        
        # Initialize trace storage
        await trace_storage.initialize(mongodb.traces)
        logger.info("✓ Trace storage initialized")
        
        logger.info("✓ Citrus Platform ready!")
        
    except Exception as e:
        logger.error(f"✗ Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Citrus Platform...")
    await mongodb.disconnect()
    logger.info("✓ Database disconnected")
    logger.info("👋 Citrus Platform stopped")


# Initialize FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Citrus - Professional LLM Evaluation Platform. "
        "Compare models, analyze performance, and build better AI systems."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add response time header to all requests"""
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # Convert to ms
    response.headers["X-Process-Time-Ms"] = str(round(process_time, 2))
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal Server Error",
            detail=str(exc) if settings.app_version.endswith("-dev") else None,
            code="INTERNAL_ERROR",
            timestamp=datetime.now(timezone.utc)
        ).dict()
    )


# Include routers
app.include_router(auth.router)
app.include_router(evaluations.router)
app.include_router(traces.router)


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with API information
    
    Returns:
        API information and available endpoints
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
        "message": "Welcome to Citrus - LLM Evaluation Platform",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc",
            "chat": {
                "dual_responses": "/api/v1/dual-responses",
                "store_preference": "/api/v1/store-preference",
                "send_message": "/api/v1/chat/send"
            },
            "analytics": {
                "stats": "/api/v1/stats",
                "traces": "/api/v1/traces",
                "trace_statistics": "/api/v1/statistics",
                "model_performance": "/api/v1/models/performance",
                "realtime": "/api/v1/analytics/realtime"
            }
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/health", response_model=HealthStatus)
async def health_check():
    """
    Health check endpoint
    
    Returns:
        Current health status of the platform
    """
    uptime = time.time() - _start_time
    
    # Check database health
    db_health = await mongodb.health_check()
    
    # Determine overall status
    if db_health.get("status") == "connected":
        status = "healthy"
    elif db_health.get("status") == "disconnected":
        status = "unhealthy"
    else:
        status = "degraded"
    
    return HealthStatus(
        status=status,
        database=db_health.get("status", "unknown"),
        version=settings.app_version,
        uptime_seconds=round(uptime, 2),
        timestamp=datetime.now(timezone.utc)
    )


@app.get("/api/info")
async def api_info():
    """
    Get detailed API information
    
    Returns:
        Detailed platform information
    """
    return {
        "platform": "Citrus AI",
        "version": settings.app_version,
        "features": [
            "Dual Response Generation",
            "Preference Learning",
            "Model Performance Analytics",
            "Real-time Tracing",
            "Multi-model Support"
        ],
        "supported_models": [
            "Gemini 1.5 Pro",
            "GPT-4",
            "Claude 3",
            "Custom Models"
        ],
        "capabilities": {
            "chat": True,
            "evaluations": True,
            "analytics": True,
            "tracing": True,
            "preferences": True
        },
        "limits": {
            "max_message_length": 10000,
            "max_chat_history": 20,
            "max_concurrent_requests": settings.max_concurrent_requests,
            "request_timeout_seconds": settings.request_timeout
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        loop="uvloop",
        http="httptools"
    )