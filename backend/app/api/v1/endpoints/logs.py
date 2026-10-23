"""Training log submission and query endpoints."""
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import TrainingLog, Enrollment, User
from app.models.enums import RoleEnum, LogStatusEnum, CategoryEnum
from app.schemas.response import ApiResponse
from app.schemas.log import (
    TrainingLogCreateRequest,
    TrainingLogResponse,
    DailyCapStatusResponse,
)
from app.core.security import get_current_user, require_roles
from app.services.validation_service import (
    validate_backdating_window,
    get_existing_day_minutes,
    validate_daily_cap,
    check_duplicate_submission,
)
from app.services.audit_service import record_audit_event

router = APIRouter()


@router.post("", response_model=ApiResponse[TrainingLogResponse], summary="Submit Daily Training Log")
def submit_training_log(
    log_in: TrainingLogCreateRequest,
    current_user: User = Depends(require_roles(RoleEnum.STUDENT, RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    """Submit a daily training log entry subject to server-side business verification.
    
    Invariants enforced:
    1. Caller owns enrollment.
    2. Future dates rejected.
    3. Maximum 48-hour submission window from practice date.
    4. Maximum 8 hours daily cap across all categories combined.
    5. Duration must be positive (checked by schema & db).
    6. Exact duplicate entries detected and rejected.
    7. Log saved as PENDING for faculty review.
    """
    # 1. Fetch enrollment and verify ownership
    enrollment = db.query(Enrollment).filter(Enrollment.id == log_in.enrollment_id).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with ID '{log_in.enrollment_id}' not found.",
        )
    
    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only submit logs for your own active enrollments.",
        )
    
    if enrollment.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit logs to enrollment with status '{enrollment.status}'.",
        )
    
    program = enrollment.program
    if not program or not program.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The associated training program is inactive or unavailable.",
        )

    # 2. Concurrency Safety: Lock enrollment row to prevent race conditions exceeding 8h cap
    try:
        # SQLite ignores with_for_update; PostgreSQL enforces row lock
        if not settings.DATABASE_URL.startswith("sqlite"):
            db.query(Enrollment).filter(Enrollment.id == enrollment.id).with_for_update().first()
    except Exception:
        pass

    # 3. Enforce 48-hour backdating & future date invariants
    validate_backdating_window(
        practice_date=log_in.practice_date,
        program_timezone=program.timezone,
        backdating_window_hours=program.backdating_window_hours,
        policy=settings.BACKDATING_BOUNDARY_POLICY,
        session_end_time=log_in.session_end_time,
    )

    # 4. Check for duplicate submissions
    check_duplicate_submission(
        db=db,
        enrollment_id=enrollment.id,
        practice_date=log_in.practice_date,
        category=log_in.category,
        duration_minutes=log_in.duration_minutes,
    )

    # 5. Enforce 8-hour daily cap across all categories combined
    existing_minutes = get_existing_day_minutes(
        db=db,
        student_id=enrollment.student_id,
        practice_date=log_in.practice_date,
    )
    validate_daily_cap(
        existing_minutes=existing_minutes,
        new_duration_minutes=log_in.duration_minutes,
        daily_max_hours=program.daily_max_hours,
        practice_date=log_in.practice_date,
    )

    # 6. Persist valid log as PENDING with authoritative server timestamp
    server_now = datetime.datetime.now(datetime.timezone.utc)
    new_log = TrainingLog(
        enrollment_id=enrollment.id,
        student_id=enrollment.student_id,
        practice_date=log_in.practice_date,
        category=log_in.category,
        duration_minutes=log_in.duration_minutes,
        reflection_journal=log_in.reflection_journal.strip(),
        session_start_time=log_in.session_start_time,
        session_end_time=log_in.session_end_time,
        status=LogStatusEnum.PENDING,  # Always saved as pending
        submitted_at=server_now,
        is_superseded=False,
    )
    db.add(new_log)
    db.flush()

    # 7. Record immutable audit event
    record_audit_event(
        db=db,
        entity_type="training_log",
        entity_id=new_log.id,
        action="SUBMIT_TRAINING_LOG",
        actor_id=current_user.id,
        payload={
            "practice_date": str(new_log.practice_date),
            "category": new_log.category.value,
            "duration_minutes": new_log.duration_minutes,
            "duration_hours": round(new_log.duration_minutes / 60.0, 2),
            "status": new_log.status.value,
        },
    )

    db.commit()
    db.refresh(new_log)

    return ApiResponse.ok(
        data=TrainingLogResponse.from_orm_model(new_log),
        message="Training log submitted successfully and queued for faculty review.",
    )


@router.get("/me", response_model=ApiResponse[List[TrainingLogResponse]], summary="Get My Training Logs")
def get_my_logs(
    status_filter: Optional[LogStatusEnum] = Query(None, alias="status"),
    category_filter: Optional[CategoryEnum] = Query(None, alias="category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve caller's training logs with optional status and category filtering."""
    query = db.query(TrainingLog).filter(
        TrainingLog.student_id == current_user.id,
        TrainingLog.is_superseded == False,
    )
    if status_filter:
        query = query.filter(TrainingLog.status == status_filter)
    if category_filter:
        query = query.filter(TrainingLog.category == category_filter)
    
    logs = query.order_by(TrainingLog.practice_date.desc(), TrainingLog.submitted_at.desc()).all()
    results = [TrainingLogResponse.from_orm_model(log) for log in logs]
    return ApiResponse.ok(data=results)


@router.get("/daily-capacity", response_model=ApiResponse[DailyCapStatusResponse], summary="Check Daily Log Capacity")
def get_daily_capacity(
    enrollment_id: str = Query(...),
    practice_date: datetime.date = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check existing hours and remaining allowance for a given student date (helpful for UI)."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    
    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    program = enrollment.program
    daily_max_hours = program.daily_max_hours if program else 8.0
    max_minutes = int(daily_max_hours * 60)

    existing_minutes = get_existing_day_minutes(db, enrollment.student_id, practice_date)
    remaining_minutes = max(max_minutes - existing_minutes, 0)

    return ApiResponse.ok(
        data=DailyCapStatusResponse(
            practice_date=practice_date,
            existing_minutes=existing_minutes,
            existing_hours=round(existing_minutes / 60.0, 2),
            daily_max_hours=daily_max_hours,
            remaining_minutes=remaining_minutes,
            remaining_hours=round(remaining_minutes / 60.0, 2),
        )
    )


@router.get("/{log_id}", response_model=ApiResponse[TrainingLogResponse], summary="Get Training Log Details")
def get_training_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve detailed log entry. Prevents cross-student access."""
    log = db.query(TrainingLog).filter(TrainingLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training log with ID '{log_id}' not found.",
        )
    
    # Enforce isolation: students can only see their own logs
    if current_user.role == RoleEnum.STUDENT and log.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot inspect another student's training logs.",
        )
    
    return ApiResponse.ok(data=TrainingLogResponse.from_orm_model(log))
