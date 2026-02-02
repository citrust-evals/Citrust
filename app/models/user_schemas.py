"""
User and Authentication Schemas for Citrus LLM Evaluation Platform
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime
from enum import Enum
import re


class UserRole(str, Enum):
    """User roles"""
    USER = "user"
    ADMIN = "admin"


class OTPRequest(BaseModel):
    """Request to send OTP to email"""
    email: EmailStr = Field(..., description="User's email address")


class OTPVerifyRequest(BaseModel):
    """Request to verify OTP"""
    email: EmailStr = Field(..., description="User's email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
    
    @validator('otp')
    def validate_otp(cls, v):
        if not v.isdigit():
            raise ValueError('OTP must contain only digits')
        return v


class UserRegistrationRequest(BaseModel):
    """Request to register a new user after OTP verification"""
    email: EmailStr = Field(..., description="User's email address")
    name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    country_code: str = Field(..., min_length=1, max_length=5, description="Country code (e.g., +1, +91)")
    phone_number: str = Field(..., min_length=6, max_length=15, description="Phone number")
    session_token: str = Field(..., description="Session token from OTP verification")
    
    @validator('country_code')
    def validate_country_code(cls, v):
        if not re.match(r'^\+?\d{1,4}$', v):
            raise ValueError('Invalid country code format')
        if not v.startswith('+'):
            v = '+' + v
        return v
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        # Remove any spaces or dashes
        v = re.sub(r'[\s\-]', '', v)
        if not v.isdigit():
            raise ValueError('Phone number must contain only digits')
        return v


class UserResponse(BaseModel):
    """User response model"""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User's email")
    name: str = Field(..., description="User's name")
    country_code: str = Field(..., description="Country code")
    phone_number: str = Field(..., description="Phone number")
    role: UserRole = Field(default=UserRole.USER, description="User role")
    created_at: datetime = Field(..., description="Account creation time")
    last_login: Optional[datetime] = Field(None, description="Last login time")
    is_active: bool = Field(default=True, description="Whether user is active")


class UserInDB(BaseModel):
    """User model as stored in database"""
    email: EmailStr
    name: str
    country_code: str
    phone_number: str
    role: UserRole = UserRole.USER
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        use_enum_values = True


class OTPRecord(BaseModel):
    """OTP record stored in database"""
    email: EmailStr
    otp_hash: str  # Store hashed OTP for security
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    attempts: int = 0
    is_verified: bool = False
    session_token: Optional[str] = None  # Generated after successful verification


class AuthResponse(BaseModel):
    """Authentication response"""
    success: bool
    message: str
    user: Optional[UserResponse] = None
    token: Optional[str] = None
    is_new_user: bool = False
    session_token: Optional[str] = None


class TokenData(BaseModel):
    """Token payload data"""
    user_id: str
    email: str
    exp: datetime
