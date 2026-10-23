"""Student enrollment and program membership endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Enrollment, User, Program
from app.models.enums import RoleEnum
from app.schemas.response import ApiResponse
from app.schemas.enrollment import EnrollmentCreateRequest, EnrollmentResponse
from app.core.security import get_current_user, require_roles

router = APIRouter()


@router.post("", response_model=ApiResponse[EnrollmentResponse], summary="Enroll Student in Program (Admin only)")
def create_enrollment(
    enrollment_in: EnrollmentCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Enroll a student in a yoga training program with validated start and target graduation dates."""
    # Validate student
    student = db.query(User).filter(User.id == enrollment_in.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student user with ID '{enrollment_in.student_id}' does not exist.",
        )
    
    # Validate program
    program = db.query(Program).filter(Program.id == enrollment_in.program_id, Program.is_active == True).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active program with ID '{enrollment_in.program_id}' does not exist.",
        )
    
    # Check for existing enrollment
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.program_id == program.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student '{student.full_name}' is already enrolled in program '{program.code}'.",
        )
    
    new_enrollment = Enrollment(
        student_id=student.id,
        program_id=program.id,
        enrollment_date=enrollment_in.enrollment_date,
        target_graduation_date=enrollment_in.target_graduation_date,
        is_public_name_visible=enrollment_in.is_public_name_visible,
        status="active",
        final_faculty_signoff=False,
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    
    return ApiResponse.ok(
        data=EnrollmentResponse.from_orm_model(new_enrollment),
        message=f"Student successfully enrolled in {program.name}",
    )


@router.get("/me", response_model=ApiResponse[List[EnrollmentResponse]], summary="Get Caller's Enrollments")
def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all training program enrollments belonging to the authenticated caller."""
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    results = [EnrollmentResponse.from_orm_model(e) for e in enrollments]
    return ApiResponse.ok(data=results)


@router.get("", response_model=ApiResponse[List[EnrollmentResponse]], summary="List Enrollments (Faculty/Admin)")
def list_enrollments(
    program_id: Optional[str] = None,
    db: Session = Depends(get_db),
    authorized_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.FACULTY)),
):
    """List program enrollments with optional program filtering."""
    query = db.query(Enrollment)
    if program_id:
        query = query.filter(Enrollment.program_id == program_id)
    enrollments = query.all()
    results = [EnrollmentResponse.from_orm_model(e) for e in enrollments]
    return ApiResponse.ok(data=results)


@router.get("/{enrollment_id}", response_model=ApiResponse[EnrollmentResponse], summary="Get Enrollment Details")
def get_enrollment(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve enrollment details. Prevents cross-student access for non-faculty/admin users."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with ID '{enrollment_id}' not found.",
        )
    
    # Enforce strict cross-student isolation on the server
    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot inspect or access another student's enrollment records.",
        )
    
    return ApiResponse.ok(data=EnrollmentResponse.from_orm_model(enrollment))
