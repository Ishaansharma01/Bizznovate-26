"""Progress pace calculation, shortfall evaluation, and alert engine."""
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import Enrollment, Program, PaceAlert
from app.models.enums import PaceStatusEnum
from app.services.progress_service import calculate_enrollment_progress
from app.services.validation_service import get_program_local_now
from app.services.notification_service import get_notification_provider
from app.services.audit_service import record_audit_event
from app.core.exceptions import ResourceNotFoundException


def calculate_pace_metrics(db: Session, enrollment_id: str) -> Dict[str, Any]:
    """Calculate weekly pace, expected cumulative progress, shortfall, and feasibility.
    
    Invariants:
    1. Consumes authoritative approved hours (pending and rejected hours never count).
    2. Feasibility respects the non-negotiable 8-hour daily cap.
    3. Handles overdue targets, zero days remaining, and edge cases safely without division by zero.
    4. Never presents pace estimates as a completion guarantee.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise ResourceNotFoundException("Enrollment", enrollment_id)

    program: Program = enrollment.program
    progress = calculate_enrollment_progress(db, enrollment_id)

    required_hours = float(progress["required_hours"])
    approved_hours = float(progress["approved_hours"])
    pending_hours = float(progress["pending_hours"])
    remaining_hours = float(progress["remaining_hours"])
    daily_cap = float(program.daily_max_hours if program else 8.0)
    shortfall_threshold = float(program.pace_warning_shortfall_hours if program else 10.0)

    # Date and calendar calculations in program timezone
    local_now = get_program_local_now(program.timezone if program else "Asia/Kolkata")
    today_local = local_now.date()

    start_date = enrollment.enrollment_date
    target_date = enrollment.target_graduation_date

    total_program_days = max((target_date - start_date).days, 1)
    days_elapsed = max((today_local - start_date).days, 0)
    days_remaining = (target_date - today_local).days

    # Linear expected progress
    if approved_hours >= required_hours:
        expected_progress_hours = required_hours
    elif days_elapsed <= 0:
        expected_progress_hours = 0.0
    elif days_elapsed >= total_program_days:
        expected_progress_hours = required_hours
    else:
        expected_progress_hours = round((days_elapsed / total_program_days) * required_hours, 2)

    # Shortfall calculation: gap between expected and approved hours
    shortfall_hours = max(round(expected_progress_hours - approved_hours, 2), 0.0)

    # Feasibility and catch-up pace respecting 8h daily limit
    max_possible_remaining_hours = max(days_remaining, 0) * daily_cap
    is_feasible = True
    realistic_daily_catchup_pace = 0.0
    required_weekly_pace = 0.0

    if remaining_hours == 0:
        required_weekly_pace = 0.0
        realistic_daily_catchup_pace = 0.0
        is_feasible = True
    elif days_remaining <= 0:
        is_feasible = False
        required_weekly_pace = None  # Deadline has passed
        realistic_daily_catchup_pace = None
    else:
        required_weekly_pace = round(remaining_hours / (days_remaining / 7.0), 2)
        if remaining_hours > max_possible_remaining_hours:
            # Infeasible: student would need to exceed 8 hours per day to finish before deadline
            is_feasible = False
            realistic_daily_catchup_pace = daily_cap  # Capped at 8h/day max
        else:
            is_feasible = True
            realistic_daily_catchup_pace = min(round(remaining_hours / days_remaining, 2), daily_cap)

    # Determine status
    if approved_hours >= required_hours:
        pace_status = PaceStatusEnum.COMPLETED
        status_message = "Certification requirement of 200 hours completed."
    elif days_remaining <= 0:
        pace_status = PaceStatusEnum.OVERDUE
        status_message = f"Target graduation deadline passed ({abs(days_remaining)} days ago). Remaining hours: {remaining_hours}h."
    elif not is_feasible:
        pace_status = PaceStatusEnum.CRITICAL_SHORTFALL
        status_message = (
            f"Completion infeasible before deadline: {remaining_hours}h remaining across only {days_remaining} days. "
            f"Would require exceeding the strict {daily_cap}h daily cap."
        )
    elif shortfall_hours >= shortfall_threshold:
        pace_status = PaceStatusEnum.BEHIND
        status_message = f"Trainee is behind linear schedule by {shortfall_hours}h (threshold: {shortfall_threshold}h)."
    else:
        pace_status = PaceStatusEnum.ON_TRACK
        status_message = "Trainee is progressing on track toward graduation target."

    return {
        "enrollment_id": enrollment.id,
        "student_id": enrollment.student_id,
        "student_name": enrollment.student.full_name if enrollment.student else "Unknown",
        "student_email": enrollment.student.email if enrollment.student else "Unknown",
        "program_id": enrollment.program_id,
        "program_name": program.name if program else "Unknown",
        "required_hours": required_hours,
        "approved_hours": approved_hours,
        "pending_hours": pending_hours,
        "remaining_hours": remaining_hours,
        "start_date": str(start_date),
        "target_graduation_date": str(target_date),
        "days_elapsed": days_elapsed,
        "days_remaining": days_remaining,
        "expected_progress_hours": expected_progress_hours,
        "shortfall_hours": shortfall_hours,
        "shortfall_warning_threshold": shortfall_threshold,
        "required_weekly_pace": required_weekly_pace,
        "realistic_daily_catchup_pace": realistic_daily_catchup_pace,
        "daily_cap_hours": daily_cap,
        "is_feasible": is_feasible,
        "pace_status": pace_status.value,
        "status_message": status_message,
    }


def evaluate_enrollment_pace(db: Session, enrollment_id: str, send_notification: bool = True) -> Dict[str, Any]:
    """Evaluate pace, generate alert if condition met, deduplicate, and dispatch notification."""
    metrics = calculate_pace_metrics(db, enrollment_id)
    pace_status_str = metrics["pace_status"]

    alert_created = False
    alert_record = None

    # Check if an alert condition is triggered
    if pace_status_str in (
        PaceStatusEnum.BEHIND.value,
        PaceStatusEnum.CRITICAL_SHORTFALL.value,
        PaceStatusEnum.OVERDUE.value,
    ):
        # Deduplication check: Avoid sending repeated duplicate alerts for the same condition
        existing_alert = db.query(PaceAlert).filter(
            PaceAlert.enrollment_id == enrollment_id,
            PaceAlert.status == PaceStatusEnum(pace_status_str),
            PaceAlert.is_resolved == False,
        ).first()

        if not existing_alert:
            notification_sent = False
            if send_notification:
                provider = get_notification_provider()
                notification_sent = provider.send_pace_alert(
                    recipient_email=metrics["student_email"],
                    student_name=metrics["student_name"],
                    program_name=metrics["program_name"],
                    shortfall_hours=metrics["shortfall_hours"],
                    recommended_weekly_pace=metrics["required_weekly_pace"] or 0.0,
                    target_graduation_date=metrics["target_graduation_date"],
                )

            alert_record = PaceAlert(
                enrollment_id=enrollment_id,
                shortfall_hours=metrics["shortfall_hours"],
                recommended_weekly_pace=metrics["required_weekly_pace"] or 0.0,
                status=PaceStatusEnum(pace_status_str),
                is_resolved=False,
                notification_sent=notification_sent,
            )
            db.add(alert_record)
            db.flush()

            record_audit_event(
                db=db,
                entity_type="pace_alert",
                entity_id=alert_record.id,
                action="TRIGGER_PACE_ALERT",
                payload={
                    "pace_status": pace_status_str,
                    "shortfall_hours": metrics["shortfall_hours"],
                    "days_remaining": metrics["days_remaining"],
                    "notification_sent": notification_sent,
                },
            )
            db.commit()
            db.refresh(alert_record)
            alert_created = True

    metrics["alert_created"] = alert_created
    metrics["alert_id"] = alert_record.id if alert_record else None
    return metrics
