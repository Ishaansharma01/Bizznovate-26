"""Authentication and account endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.response import ApiResponse
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, UserCreateRequest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)

router = APIRouter()


@router.post("/login", response_model=ApiResponse[TokenResponse], summary="User Login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning a JWT Bearer token."""
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your administrator.",
        )
    
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    token_resp = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
    return ApiResponse.ok(data=token_resp, message=f"Welcome back, {user.full_name}")


@router.post("/register", response_model=ApiResponse[UserResponse], summary="User Registration")
def register_user(user_in: UserCreateRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )
    
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return ApiResponse.ok(
        data=UserResponse.model_validate(new_user),
        message="User account created successfully",
    )


@router.get("/me", response_model=ApiResponse[UserResponse], summary="Current User Profile")
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile and role information for currently authenticated user."""
    return ApiResponse.ok(data=UserResponse.model_validate(current_user))
