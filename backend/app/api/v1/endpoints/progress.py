"""Authoritative progress endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Enrollment, User
from app.models.enums import RoleEnum
from app.schemas.response import ApiResponse
from app.schemas.progress import ProgressResponse
from app.core.security import get_current_user
from app.services.progress_service import calculate_enrollment_progress

router = APIRouter()


@router.get("/me", response_model=ApiResponse[ProgressResponse], summary="My Authoritative Verified Progress")
def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve verified progress, approved hours, remaining hours, and category breakdown for caller."""
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status == "active",
    ).first()
    
    if not enrollment:
        # Fall back to any enrollment
        enrollment = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No training enrollment found for your account.",
        )
    
    progress = calculate_enrollment_progress(db, enrollment.id)
    return ApiResponse.ok(data=ProgressResponse(**progress))


@router.get("/enrollment/{enrollment_id}", response_model=ApiResponse[ProgressResponse], summary="Get Enrollment Progress")
def get_enrollment_progress(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve authoritative verified progress for an enrollment. Prevents cross-student access."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with ID '{enrollment_id}' not found.",
        )
    
    # Enforce cross-student isolation on the server
    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot inspect another student's progress records.",
        )
    
    progress = calculate_enrollment_progress(db, enrollment_id)
    return ApiResponse.ok(data=ProgressResponse(**progress))
