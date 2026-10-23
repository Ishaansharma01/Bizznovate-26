"""Schemas for progress pace monitoring and shortfall alerts."""
import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import PaceStatusEnum


class PaceAlertResponse(BaseModel):
    id: str
    enrollment_id: str
    shortfall_hours: float
    recommended_weekly_pace: float
    status: PaceStatusEnum
    is_resolved: bool
    notification_sent: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class PaceMetricsResponse(BaseModel):
    enrollment_id: str
    student_id: str
    student_name: str
    student_email: str
    program_id: str
    program_name: str
    required_hours: float
    approved_hours: float
    pending_hours: float
    remaining_hours: float
    start_date: str
    target_graduation_date: str
    days_elapsed: int
    days_remaining: int
    expected_progress_hours: float
    shortfall_hours: float
    shortfall_warning_threshold: float
    required_weekly_pace: Optional[float] = None
    realistic_daily_catchup_pace: Optional[float] = None
    daily_cap_hours: float
    is_feasible: bool
    pace_status: str
    status_message: str
    alert_created: Optional[bool] = False
    alert_id: Optional[str] = None
    active_alerts: Optional[List[PaceAlertResponse]] = None

    model_config = ConfigDict(from_attributes=True)
