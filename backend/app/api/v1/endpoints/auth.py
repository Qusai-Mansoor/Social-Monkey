from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.models.models import User
from app.core.security import create_access_token, get_password_hash, verify_password

router = APIRouter()


# @router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
# async def register(user_data: UserCreate, db: Session = Depends(get_db)):
#     """Register a new user"""
#     # Check if user already exists
#     existing_user = db.query(User).filter(
#         (User.email == user_data.email) | (User.username == user_data.username)
#     ).first()
    
#     if existing_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email or username already registered"
#         )
    
#     # Create new user
#     hashed_password = get_password_hash(user_data.password)
#     new_user = User(
#         email=user_data.email,
#         username=user_data.username,
#         hashed_password=hashed_password
#     )
    
#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)
    
#     return new_user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    try:
        # Enforce password max length (bcrypt limit is 72 bytes)
        password = user_data.password
        if isinstance(password, str):
            password_bytes = password.encode('utf-8')
            if len(password_bytes) > 72:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password must not exceed 72 bytes. Please use a shorter password."
                )
        hashed_password = get_password_hash(password)
        new_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )



@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    # Find user
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(lambda: None)  # TODO: Add proper token dependency
):
    """Get current user info"""
    # TODO: Implement token validation and user extraction
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
