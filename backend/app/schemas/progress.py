"""Schemas for Authoritative Verified Progress."""
from typing import Dict, Any, Optional
from pydantic import BaseModel, ConfigDict


class ProgressResponse(BaseModel):
    enrollment_id: str
    student_id: str
    student_name: str
    program_id: str
    program_code: str
    program_name: str
    required_hours: float
    approved_hours: float
    pending_hours: float
    rejected_hours: float
    remaining_hours: float
    completion_percentage: float
    is_hours_requirement_met: bool
    final_faculty_signoff: bool
    category_totals: Dict[str, float]
    category_quotas_configured: bool
    category_eligibility_status: str
    category_quota_details: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)
