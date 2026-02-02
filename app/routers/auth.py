"""
Authentication Router with Email OTP for Citrus LLM Evaluation Platform
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import jwt
from bson import ObjectId

from ..models.user_schemas import (
    OTPRequest, 
    OTPVerifyRequest, 
    UserRegistrationRequest,
    UserResponse,
    UserInDB,
    OTPRecord,
    AuthResponse,
    UserRole
)
from ..core.database import mongodb
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Constants
OTP_EXPIRY_MINUTES = 10
MAX_OTP_ATTEMPTS = 5
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def hash_otp(otp: str) -> str:
    """Hash OTP for secure storage"""
    return hashlib.sha256(otp.encode()).hexdigest()


def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)


def generate_jwt_token(user_id: str, email: str) -> str:
    """Generate JWT token for authenticated user"""
    expiry = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expiry
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def send_otp_email(email: str, otp: str) -> bool:
    """Send OTP via email"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🍋 Citrus AI - Your Verification Code'
        msg['From'] = settings.smtp_from_email
        msg['To'] = email
        
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0A0E12; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
                .card {{ background: linear-gradient(145deg, #161810, #1a1f12); border-radius: 20px; padding: 40px; border: 1px solid rgba(202, 255, 97, 0.2); }}
                .logo {{ text-align: center; margin-bottom: 30px; }}
                .logo-text {{ font-size: 32px; font-weight: bold; color: #caff61; }}
                .title {{ color: #ffffff; font-size: 24px; text-align: center; margin-bottom: 10px; }}
                .subtitle {{ color: #9ca3af; font-size: 16px; text-align: center; margin-bottom: 30px; }}
                .otp-container {{ background: rgba(202, 255, 97, 0.1); border-radius: 12px; padding: 25px; text-align: center; border: 1px solid rgba(202, 255, 97, 0.3); }}
                .otp-code {{ font-size: 36px; font-weight: bold; color: #caff61; letter-spacing: 8px; font-family: 'Courier New', monospace; }}
                .expiry {{ color: #9ca3af; font-size: 14px; text-align: center; margin-top: 20px; }}
                .footer {{ color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <div class="logo">
                        <span class="logo-text">🍋 Citrus AI</span>
                    </div>
                    <h1 class="title">Verify Your Email</h1>
                    <p class="subtitle">Enter this code to sign in to Citrus AI</p>
                    <div class="otp-container">
                        <span class="otp-code">{otp}</span>
                    </div>
                    <p class="expiry">This code expires in {OTP_EXPIRY_MINUTES} minutes</p>
                    <p class="footer">If you didn't request this code, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Citrus AI - Verification Code
        
        Your verification code is: {otp}
        
        This code expires in {OTP_EXPIRY_MINUTES} minutes.
        
        If you didn't request this code, please ignore this email.
        """
        
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, email, msg.as_string())
        
        logger.info(f"OTP email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False


@router.post("/send-otp", response_model=AuthResponse)
async def send_otp(request: OTPRequest):
    """
    Send OTP to user's email address
    """
    try:
        db = mongodb.db
        otp_collection = db["otp_records"]
        
        # Rate limiting: Check if there's a recent OTP request
        recent_otp = await otp_collection.find_one({
            "email": request.email,
            "created_at": {"$gte": datetime.utcnow() - timedelta(minutes=1)}
        })
        
        if recent_otp:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another OTP"
            )
        
        # Generate OTP
        otp = generate_otp()
        otp_hash = hash_otp(otp)
        
        # Delete any existing OTP for this email
        await otp_collection.delete_many({"email": request.email})
        
        # Store OTP record
        otp_record = {
            "email": request.email,
            "otp_hash": otp_hash,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
            "attempts": 0,
            "is_verified": False
        }
        await otp_collection.insert_one(otp_record)
        
        # Send OTP email
        email_sent = await send_otp_email(request.email, otp)
        
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP email. Please try again."
            )
        
        return AuthResponse(
            success=True,
            message="OTP sent successfully to your email"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while sending OTP"
        )


@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(request: OTPVerifyRequest):
    """
    Verify OTP and check if user exists
    Returns whether user is new or existing
    """
    try:
        db = mongodb.db
        otp_collection = db["otp_records"]
        users_collection = db["users"]
        
        # Find OTP record
        otp_record = await otp_collection.find_one({"email": request.email})
        
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found for this email. Please request a new OTP."
            )
        
        # Check if OTP has expired
        if datetime.utcnow() > otp_record["expires_at"]:
            await otp_collection.delete_one({"email": request.email})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new OTP."
            )
        
        # Check attempts
        if otp_record["attempts"] >= MAX_OTP_ATTEMPTS:
            await otp_collection.delete_one({"email": request.email})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum attempts exceeded. Please request a new OTP."
            )
        
        # Verify OTP
        if hash_otp(request.otp) != otp_record["otp_hash"]:
            # Increment attempts
            await otp_collection.update_one(
                {"email": request.email},
                {"$inc": {"attempts": 1}}
            )
            remaining = MAX_OTP_ATTEMPTS - otp_record["attempts"] - 1
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining} attempts remaining."
            )
        
        # OTP verified - generate session token
        session_token = generate_session_token()
        
        # Update OTP record with session token
        await otp_collection.update_one(
            {"email": request.email},
            {
                "$set": {
                    "is_verified": True,
                    "session_token": session_token
                }
            }
        )
        
        # Check if user exists
        existing_user = await users_collection.find_one({"email": request.email})
        
        if existing_user:
            # Existing user - generate JWT and return
            user_id = str(existing_user["_id"])
            token = generate_jwt_token(user_id, request.email)
            
            # Update last login
            await users_collection.update_one(
                {"email": request.email},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            # Delete OTP record
            await otp_collection.delete_one({"email": request.email})
            
            user_response = UserResponse(
                id=user_id,
                email=existing_user["email"],
                name=existing_user["name"],
                country_code=existing_user["country_code"],
                phone_number=existing_user["phone_number"],
                role=existing_user.get("role", UserRole.USER),
                created_at=existing_user["created_at"],
                last_login=datetime.utcnow(),
                is_active=existing_user.get("is_active", True)
            )
            
            return AuthResponse(
                success=True,
                message="Login successful",
                user=user_response,
                token=token,
                is_new_user=False
            )
        else:
            # New user - return session token for registration
            return AuthResponse(
                success=True,
                message="OTP verified. Please complete registration.",
                is_new_user=True,
                session_token=session_token
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while verifying OTP"
        )


@router.post("/register", response_model=AuthResponse)
async def register_user(request: UserRegistrationRequest):
    """
    Register a new user after OTP verification
    """
    try:
        db = mongodb.db
        otp_collection = db["otp_records"]
        users_collection = db["users"]
        
        # Verify session token
        otp_record = await otp_collection.find_one({
            "email": request.email,
            "session_token": request.session_token,
            "is_verified": True
        })
        
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired session. Please verify OTP again."
            )
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": request.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        # Create user
        user_data = {
            "email": request.email,
            "name": request.name,
            "country_code": request.country_code,
            "phone_number": request.phone_number,
            "role": UserRole.USER.value,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": datetime.utcnow(),
            "is_active": True
        }
        
        result = await users_collection.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        # Generate JWT token
        token = generate_jwt_token(user_id, request.email)
        
        # Delete OTP record
        await otp_collection.delete_one({"email": request.email})
        
        user_response = UserResponse(
            id=user_id,
            email=request.email,
            name=request.name,
            country_code=request.country_code,
            phone_number=request.phone_number,
            role=UserRole.USER,
            created_at=user_data["created_at"],
            last_login=user_data["last_login"],
            is_active=True
        )
        
        return AuthResponse(
            success=True,
            message="Registration successful",
            user=user_response,
            token=token,
            is_new_user=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while registering"
        )


@router.get("/me", response_model=AuthResponse)
async def get_current_user(token: str):
    """
    Get current user from JWT token
    """
    try:
        payload = verify_jwt_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        db = mongodb.db
        users_collection = db["users"]
        
        user = await users_collection.find_one({"_id": ObjectId(payload["user_id"])})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_response = UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            country_code=user["country_code"],
            phone_number=user["phone_number"],
            role=user.get("role", UserRole.USER),
            created_at=user["created_at"],
            last_login=user.get("last_login"),
            is_active=user.get("is_active", True)
        )
        
        return AuthResponse(
            success=True,
            message="User retrieved successfully",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred"
        )


@router.post("/logout", response_model=AuthResponse)
async def logout():
    """
    Logout user (client should remove token)
    """
    return AuthResponse(
        success=True,
        message="Logged out successfully"
    )
