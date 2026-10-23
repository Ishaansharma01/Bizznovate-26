"""Authoritative verified progress service for student training hours."""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import TrainingLog, Enrollment, Program
from app.models.enums import LogStatusEnum, CategoryEnum
from app.core.exceptions import ResourceNotFoundException


def calculate_enrollment_progress(db: Session, enrollment_id: str) -> Dict[str, Any]:
    """Calculate authoritative progress metrics for an enrollment.
    
    Invariants:
    1. Only faculty-approved logs count toward verified progress.
    2. Pending and rejected logs are reported separately and NEVER count toward the 200 hours.
    3. Category quotas are evaluated if configured; if unconfigured, returns CONFIGURATION_REQUIRED.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise ResourceNotFoundException("Enrollment", enrollment_id)
    
    program: Program = enrollment.program
    required_hours = float(program.required_hours if program else 200.0)

    # 1. Calculate approved minutes (total and per canonical category)
    approved_query = db.query(
        TrainingLog.category,
        func.coalesce(func.sum(TrainingLog.duration_minutes), 0).label("minutes")
    ).filter(
        TrainingLog.enrollment_id == enrollment.id,
        TrainingLog.status == LogStatusEnum.APPROVED,
        TrainingLog.is_superseded == False,
    ).group_by(TrainingLog.category).all()

    category_approved_minutes = {c.value: 0 for c in CategoryEnum}
    for cat, minutes in approved_query:
        if cat in category_approved_minutes:
            category_approved_minutes[cat] = minutes

    total_approved_minutes = sum(category_approved_minutes.values())
    approved_hours = round(total_approved_minutes / 60.0, 2)

    category_totals_hours = {
        cat: round(mins / 60.0, 2)
        for cat, mins in category_approved_minutes.items()
    }

    # 2. Calculate pending minutes
    pending_minutes = db.query(
        func.coalesce(func.sum(TrainingLog.duration_minutes), 0)
    ).filter(
        TrainingLog.enrollment_id == enrollment.id,
        TrainingLog.status == LogStatusEnum.PENDING,
        TrainingLog.is_superseded == False,
    ).scalar() or 0
    pending_hours = round(pending_minutes / 60.0, 2)

    # 3. Calculate rejected minutes
    rejected_minutes = db.query(
        func.coalesce(func.sum(TrainingLog.duration_minutes), 0)
    ).filter(
        TrainingLog.enrollment_id == enrollment.id,
        TrainingLog.status == LogStatusEnum.REJECTED,
        TrainingLog.is_superseded == False,
    ).scalar() or 0
    rejected_hours = round(rejected_minutes / 60.0, 2)

    # 4. Remaining hours & completion percentage
    remaining_hours = max(round(required_hours - approved_hours, 2), 0.0)
    completion_percentage = min(round((approved_hours / required_hours) * 100, 2), 100.0) if required_hours > 0 else 0.0
    is_hours_requirement_met = approved_hours >= required_hours

    # 5. Evaluate Category Quotas
    category_quotas_configured = bool(program.category_quotas)
    category_quota_details = {}
    category_eligibility_status = "CONFIGURATION_REQUIRED"

    if category_quotas_configured:
        all_quotas_met = True
        for cat_code in [c.value for c in CategoryEnum]:
            quota_required = program.category_quotas.get(cat_code, 0.0)
            actual_hours = category_totals_hours.get(cat_code, 0.0)
            is_met = actual_hours >= quota_required
            if not is_met:
                all_quotas_met = False
            category_quota_details[cat_code] = {
                "required_hours": quota_required,
                "completed_hours": actual_hours,
                "is_met": is_met,
            }
        category_eligibility_status = "SATISFIED" if all_quotas_met else "INCOMPLETE"
    else:
        for cat_code in [c.value for c in CategoryEnum]:
            category_quota_details[cat_code] = {
                "required_hours": None,
                "completed_hours": category_totals_hours.get(cat_code, 0.0),
                "is_met": False,
            }

    return {
        "enrollment_id": enrollment.id,
        "student_id": enrollment.student_id,
        "student_name": enrollment.student.full_name if enrollment.student else "Unknown",
        "program_id": enrollment.program_id,
        "program_code": program.code if program else "Unknown",
        "program_name": program.name if program else "Unknown",
        "required_hours": required_hours,
        "approved_hours": approved_hours,
        "pending_hours": pending_hours,
        "rejected_hours": rejected_hours,
        "remaining_hours": remaining_hours,
        "completion_percentage": completion_percentage,
        "is_hours_requirement_met": is_hours_requirement_met,
        "final_faculty_signoff": enrollment.final_faculty_signoff,
        "category_totals": category_totals_hours,
        "category_quotas_configured": category_quotas_configured,
        "category_eligibility_status": category_eligibility_status,
        "category_quota_details": category_quota_details,
    }
