"""Faculty review queue and log decision endpoints."""
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import TrainingLog, LogReview, Enrollment, User
from app.models.enums import RoleEnum, LogStatusEnum, CategoryEnum, ReviewDecisionEnum
from app.schemas.response import ApiResponse
from app.schemas.log import TrainingLogResponse
from app.schemas.review import ReviewSubmissionRequest, ReviewResponse
from app.core.security import require_roles
from app.services.audit_service import record_audit_event

router = APIRouter()


@router.get("/reviews", response_model=ApiResponse[List[TrainingLogResponse]], summary="Faculty Review Queue")
def get_review_queue(
    status_filter: LogStatusEnum = Query(LogStatusEnum.PENDING, alias="status"),
    program_id: Optional[str] = Query(None),
    category_filter: Optional[CategoryEnum] = Query(None, alias="category"),
    current_user: User = Depends(require_roles(RoleEnum.FACULTY, RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    """Retrieve training logs queued for faculty review with filtering options."""
    query = db.query(TrainingLog).join(Enrollment).filter(
        TrainingLog.status == status_filter,
        TrainingLog.is_superseded == False,
    )
    if program_id:
        query = query.filter(Enrollment.program_id == program_id)
    if category_filter:
        query = query.filter(TrainingLog.category == category_filter)
    
    logs = query.order_by(TrainingLog.submitted_at.asc()).all()
    results = [TrainingLogResponse.from_orm_model(log) for log in logs]
    return ApiResponse.ok(data=results, message=f"Retrieved {len(results)} logs for review")


@router.post("/logs/{log_id}/review", response_model=ApiResponse[TrainingLogResponse], summary="Submit Review Decision")
def review_training_log(
    log_id: str,
    review_in: ReviewSubmissionRequest,
    current_user: User = Depends(require_roles(RoleEnum.FACULTY, RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    """Review and decide on a submitted student training log (Approve, Reject, or Request Correction).
    
    Invariants:
    1. Only authorized Faculty or Admin can review. Students cannot call this endpoint.
    2. Rejections and correction requests require mandatory feedback.
    3. Status transition is atomic and recorded in audit trail.
    4. Two reviewers cannot silently overwrite an already decided log.
    """
    log = db.query(TrainingLog).filter(TrainingLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training log with ID '{log_id}' not found.",
        )
    
    # Check that log is in an actionable state (PENDING or CORRECTION_REQUESTED)
    if log.status not in (LogStatusEnum.PENDING, LogStatusEnum.CORRECTION_REQUESTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Log has already been reviewed with status '{log.status.value}'. Cannot overwrite decision.",
        )
    
    prev_status = log.status.value

    # Map decision to authoritative status
    if review_in.decision == ReviewDecisionEnum.APPROVE:
        log.status = LogStatusEnum.APPROVED
    elif review_in.decision == ReviewDecisionEnum.REJECT:
        log.status = LogStatusEnum.REJECTED
    elif review_in.decision == ReviewDecisionEnum.REQUEST_CORRECTION:
        log.status = LogStatusEnum.CORRECTION_REQUESTED
    
    review_now = datetime.datetime.now(datetime.timezone.utc)
    review_record = LogReview(
        log_id=log.id,
        reviewer_id=current_user.id,
        decision=review_in.decision,
        feedback_reason=review_in.feedback_reason.strip() if review_in.feedback_reason else None,
        reviewed_at=review_now,
    )
    db.add(review_record)

    # Record immutable audit event
    record_audit_event(
        db=db,
        entity_type="training_log",
        entity_id=log.id,
        action="REVIEW_TRAINING_LOG",
        actor_id=current_user.id,
        payload={
            "decision": review_in.decision.value,
            "previous_status": prev_status,
            "new_status": log.status.value,
            "feedback_reason": review_record.feedback_reason,
            "student_id": log.student_id,
            "duration_minutes": log.duration_minutes,
        },
    )

    db.commit()
    db.refresh(log)

    return ApiResponse.ok(
        data=TrainingLogResponse.from_orm_model(log),
        message=f"Log successfully updated to '{log.status.value}' by {current_user.full_name}.",
    )


@router.post("/enrollments/{enrollment_id}/signoff", response_model=ApiResponse[dict], summary="Final Faculty Sign-Off")
def faculty_final_signoff(
    enrollment_id: str,
    current_user: User = Depends(require_roles(RoleEnum.FACULTY, RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    """Complete mandatory faculty sign-off for a graduating trainee."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    
    enrollment.final_faculty_signoff = True
    enrollment.final_signoff_by_id = current_user.id
    enrollment.final_signoff_at = datetime.datetime.now(datetime.timezone.utc)

    record_audit_event(
        db=db,
        entity_type="enrollment",
        entity_id=enrollment.id,
        action="FINAL_FACULTY_SIGNOFF",
        actor_id=current_user.id,
        payload={"student_id": enrollment.student_id, "program_id": enrollment.program_id},
    )

    db.commit()
    return ApiResponse.ok(
        data={"enrollment_id": enrollment.id, "final_faculty_signoff": True},
        message=f"Final faculty sign-off completed by {current_user.full_name}.",
    )
