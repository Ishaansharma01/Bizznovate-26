"""Authoritative business validation engine for training log submissions."""
import datetime
from typing import Optional
from dateutil import tz
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.models.models import TrainingLog
from app.models.enums import LogStatusEnum, CategoryEnum
from app.core.exceptions import BusinessRuleViolationException


def get_program_local_now(timezone_str: str = "Asia/Kolkata") -> datetime.datetime:
    """Return authoritative current server time converted to program timezone."""
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    target_tz = tz.gettz(timezone_str) or tz.gettz("Asia/Kolkata")
    return utc_now.astimezone(target_tz)


def validate_backdating_window(
    practice_date: datetime.date,
    program_timezone: str = "Asia/Kolkata",
    backdating_window_hours: int = 48,
    policy: str = "elapsed_hours",
    session_end_time: Optional[datetime.time] = None,
) -> None:
    """Enforce backdating window policy against authoritative server time.
    
    Future dates are rejected.
    Dates submitted older than backdating_window_hours (48h) are rejected.
    """
    local_now = get_program_local_now(program_timezone)
    today_local = local_now.date()

    # 1. Reject future-dated entries
    if practice_date > today_local:
        raise BusinessRuleViolationException(
            f"Future-dated logs are strictly prohibited. Practice date {practice_date} is after program date {today_local}.",
            details={"practice_date": str(practice_date), "program_local_date": str(today_local)}
        )

    # 2. Check 48-hour backdating window
    if policy == "calendar_days":
        calendar_diff = (today_local - practice_date).days
        max_days = backdating_window_hours // 24
        if calendar_diff > max_days:
            raise BusinessRuleViolationException(
                f"Log submission exceeds permitted {backdating_window_hours}-hour window ({calendar_diff} calendar days old).",
                details={
                    "practice_date": str(practice_date),
                    "days_old": calendar_diff,
                    "max_permitted_days": max_days,
                    "policy": "calendar_days",
                }
            )
    else:  # "elapsed_hours" (default)
        target_tz = tz.gettz(program_timezone) or tz.gettz("Asia/Kolkata")
        # If student provided a session end time, deadline is exact elapsed hours from session end
        # Otherwise, deadline is backdating_window_hours from end of practice day (23:59:59)
        if session_end_time:
            practice_dt = datetime.datetime.combine(practice_date, session_end_time, tzinfo=target_tz)
        else:
            practice_dt = datetime.datetime.combine(practice_date, datetime.time(23, 59, 59), tzinfo=target_tz)
        
        deadline = practice_dt + datetime.timedelta(hours=backdating_window_hours)
        if local_now > deadline:
            elapsed_hours = round((local_now - practice_dt).total_seconds() / 3600.0, 2)
            raise BusinessRuleViolationException(
                f"Log submission exceeds permitted {backdating_window_hours}-hour window ({elapsed_hours}h elapsed since practice deadline).",
                details={
                    "practice_date": str(practice_date),
                    "elapsed_hours": elapsed_hours,
                    "max_hours": backdating_window_hours,
                    "policy": "elapsed_hours",
                }
            )


def get_existing_day_minutes(
    db: Session,
    student_id: str,
    practice_date: datetime.date,
    exclude_log_id: Optional[str] = None,
) -> int:
    """Sum existing logged minutes for student on practice date across all categories.
    
    Pending, approved, and correction_requested logs count toward the 8-hour daily cap.
    Rejected logs do not consume daily allowance.
    """
    query = db.query(func.coalesce(func.sum(TrainingLog.duration_minutes), 0)).filter(
        TrainingLog.student_id == student_id,
        TrainingLog.practice_date == practice_date,
        TrainingLog.status.in_([
            LogStatusEnum.PENDING,
            LogStatusEnum.APPROVED,
            LogStatusEnum.CORRECTION_REQUESTED,
        ]),
        TrainingLog.is_superseded == False,
    )
    if exclude_log_id:
        query = query.filter(TrainingLog.id != exclude_log_id)
    return query.scalar() or 0


def validate_daily_cap(
    existing_minutes: int,
    new_duration_minutes: int,
    daily_max_hours: float = 8.0,
    practice_date: Optional[datetime.date] = None,
) -> None:
    """Enforce daily limit (8 hours = 480 minutes) across all categories combined."""
    max_minutes = int(daily_max_hours * 60)
    total_minutes = existing_minutes + new_duration_minutes
    if total_minutes > max_minutes:
        existing_hours = round(existing_minutes / 60.0, 2)
        new_hours = round(new_duration_minutes / 60.0, 2)
        remaining_hours = max(round((max_minutes - existing_minutes) / 60.0, 2), 0.0)
        raise BusinessRuleViolationException(
            f"Daily cap of {daily_max_hours} hours exceeded for {practice_date or 'selected date'}. "
            f"Existing logged: {existing_hours}h, Attempted: {new_hours}h. "
            f"Remaining capacity: {remaining_hours}h.",
            details={
                "daily_cap_hours": daily_max_hours,
                "existing_logged_hours": existing_hours,
                "attempted_hours": new_hours,
                "remaining_capacity_hours": remaining_hours,
                "practice_date": str(practice_date) if practice_date else None,
            }
        )


def check_duplicate_submission(
    db: Session,
    enrollment_id: str,
    practice_date: datetime.date,
    category: CategoryEnum,
    duration_minutes: int,
) -> None:
    """Detect exact duplicate submissions for the same student on the same date and category."""
    existing = db.query(TrainingLog).filter(
        TrainingLog.enrollment_id == enrollment_id,
        TrainingLog.practice_date == practice_date,
        TrainingLog.category == category,
        TrainingLog.duration_minutes == duration_minutes,
        TrainingLog.status.in_([LogStatusEnum.PENDING, LogStatusEnum.APPROVED]),
        TrainingLog.is_superseded == False,
    ).first()
    if existing:
        raise BusinessRuleViolationException(
            "Duplicate log submission detected. An active entry with the same date, category, and duration already exists.",
            details={
                "existing_log_id": existing.id,
                "practice_date": str(practice_date),
                "category": category.value,
                "duration_minutes": duration_minutes,
            }
        )
