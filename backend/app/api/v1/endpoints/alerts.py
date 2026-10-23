"""Progress pace monitor and notification alert endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Enrollment, User, PaceAlert
from app.models.enums import RoleEnum
from app.schemas.response import ApiResponse
from app.schemas.pace import PaceMetricsResponse, PaceAlertResponse
from app.core.security import get_current_user, require_roles
from app.services.pace_service import calculate_pace_metrics, evaluate_enrollment_pace

router = APIRouter()


@router.get("/me", response_model=ApiResponse[PaceMetricsResponse], summary="My Progress Pace Analysis")
def get_my_pace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve weekly pace, expected cumulative progress, shortfall, and active alerts for caller."""
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status == "active",
    ).first()
    
    if not enrollment:
        enrollment = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No enrollment record found for your account.",
        )
    
    metrics = calculate_pace_metrics(db, enrollment.id)
    
    # Attach existing unresolved alerts
    active_alerts = db.query(PaceAlert).filter(
        PaceAlert.enrollment_id == enrollment.id,
        PaceAlert.is_resolved == False,
    ).order_by(PaceAlert.created_at.desc()).all()
    
    metrics["active_alerts"] = [PaceAlertResponse.model_validate(a) for a in active_alerts]
    return ApiResponse.ok(data=PaceMetricsResponse(**metrics))


@router.get("/enrollment/{enrollment_id}", response_model=ApiResponse[PaceMetricsResponse], summary="Get Enrollment Pace")
def get_enrollment_pace(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve pace metrics for an enrollment. Prevents cross-student access."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    
    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot view another student's pace metrics.",
        )
    
    metrics = calculate_pace_metrics(db, enrollment_id)
    active_alerts = db.query(PaceAlert).filter(
        PaceAlert.enrollment_id == enrollment.id,
        PaceAlert.is_resolved == False,
    ).order_by(PaceAlert.created_at.desc()).all()
    metrics["active_alerts"] = [PaceAlertResponse.model_validate(a) for a in active_alerts]
    return ApiResponse.ok(data=PaceMetricsResponse(**metrics))


@router.post("/evaluate/{enrollment_id}", response_model=ApiResponse[PaceMetricsResponse], summary="Trigger Pace Evaluation (Faculty/Admin)")
def evaluate_pace(
    enrollment_id: str,
    current_user: User = Depends(require_roles(RoleEnum.FACULTY, RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    """Evaluate trainee pace, create alert if behind threshold, and dispatch safe notification."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    
    metrics = evaluate_enrollment_pace(db, enrollment_id, send_notification=True)
    return ApiResponse.ok(
        data=PaceMetricsResponse(**metrics),
        message="Pace evaluation completed.",
    )
