"""
Configuration settings for the Citrus LLM Evaluation Platform
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # MongoDB Configuration
    mongodb_url: str = os.getenv(
        "MONGODB_URL",
        "mongodb://localhost:27017"  
    )
    database_name: str = "citrus"
    
    # Collection Names
    evaluations_collection: str = "evaluations"
    preferences_collection: str = "preference_responses"
    traces_collection: str = "traces"
    analytics_collection: str = "analytics"
    models_collection: str = "models"
    
    # API Configuration
    app_name: str = "Citrus - LLM Evaluation Platform"
    app_version: str = "2.4.0"
    api_prefix: str = "/api/v1"
    
    # LLM Configuration
    google_api_key: str = os.getenv("GEMINI_API_KEY")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY")
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    # Model Defaults
    default_model: str = "gemini-3-flash"
    default_temperature: float = 0.7
    default_max_tokens: int = 2000
    
    # Security
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    api_key_required: bool = False
    api_keys: list[str] = []
    
    # Performance
    max_concurrent_requests: int = 100
    request_timeout: int = 300  # seconds
    
    # Tracing Configuration
    enable_tracing: bool = True
    trace_sampling_rate: float = 1.0  # 100% sampling by default
    max_trace_depth: int = 10
    
    # Analytics
    analytics_batch_size: int = 100
    analytics_flush_interval: int = 60  # seconds
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


# Validation
def validate_settings():
    """Validate critical settings"""
    if not settings.mongodb_url:
        raise ValueError("MONGODB_URL is required")
    
    if settings.api_key_required and not settings.api_keys:
        raise ValueError("API keys required but none configured")
    
    # Check for at least one LLM API key
    if not any([
        settings.google_api_key,
        settings.gemini_api_key,
        settings.openai_api_key,
        settings.anthropic_api_key
    ]):
        print("WARNING: No LLM API keys configured. Some features will be unavailable.")


# Run validation on import
validate_settings()