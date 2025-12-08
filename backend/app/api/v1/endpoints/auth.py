from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.models.models import User
from app.core.security import create_access_token, get_password_hash, verify_password
from app.utils.sql_protection import SQLInjectionProtection
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with enhanced security validation
    - Validates email format and checks for SQL injection
    - Validates username format (alphanumeric + underscore only)
    - Enforces password length limits for bcrypt
    """
    try:
        # Validate and sanitize email (protection against SQL injection)
        safe_email = SQLInjectionProtection.validate_email(user_data.email)
        
        # Validate username format (protection against SQL injection and XSS)
        safe_username = SQLInjectionProtection.validate_username(user_data.username)
        
        # Check if user already exists (using validated inputs)
        existing_user = db.query(User).filter(
            (User.email == safe_email) | (User.username == safe_username)
        ).first()
        
        if existing_user:
            # Log failed registration attempt
            logger.warning(f"Registration attempt with existing credentials: {safe_email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already registered"
            )
        
        # Enforce password max length (bcrypt limit is 72 bytes)
        password = user_data.password
        if isinstance(password, str):
            password_bytes = password.encode('utf-8')
            if len(password_bytes) > 72:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password must not exceed 72 bytes. Please use a shorter password."
                )
        
        # Hash password using bcrypt
        hashed_password = get_password_hash(password)
        
        # Create new user with validated data
        new_user = User(
            email=safe_email,
            username=safe_username,
            hashed_password=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Log successful registration
        logger.info(f"New user registered: {safe_username}")
        
        return new_user
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Registration failed: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return JWT token with enhanced security
    - Validates email format
    - Generic error messages (doesn't reveal if user exists)
    - Logs failed attempts for monitoring
    """
    try:
        # Validate email format (protection against SQL injection)
        safe_email = SQLInjectionProtection.validate_email(user_data.email)
        
        # Find user (using validated email)
        user = db.query(User).filter(User.email == safe_email).first()
        
        # Use constant-time comparison for password verification
        # Generic error message doesn't reveal if user exists
        if not user or not verify_password(user_data.password, user.hashed_password):
            # Log failed login attempt
            logger.warning(f"Failed login attempt for: {safe_email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user account is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {safe_email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is inactive. Please contact support."
            )
        
        # Create access token with user ID
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # Log successful login
        logger.info(f"Successful login: {safe_email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(lambda: None)  # TODO: Add proper token dependency
):
    """Get current user info"""
    # TODO: Implement token validation and user extraction
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
