"""Schemas for Training Logs submission and queries."""
import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import CategoryEnum, LogStatusEnum


class TrainingLogCreateRequest(BaseModel):
    enrollment_id: str
    practice_date: datetime.date
    category: CategoryEnum
    duration_minutes: int = Field(
        ...,
        gt=0,
        le=480,
        description="Duration in positive integer minutes (1 to 480 minutes, maximum 8 hours)",
    )
    reflection_journal: str = Field(
        ...,
        min_length=10,
        description="Detailed practice reflection and learning notes",
    )
    session_start_time: Optional[datetime.time] = None
    session_end_time: Optional[datetime.time] = None


class TrainingLogResponse(BaseModel):
    id: str
    enrollment_id: str
    student_id: str
    student_name: str
    practice_date: datetime.date
    category: CategoryEnum
    duration_minutes: int
    duration_hours: float
    reflection_journal: str
    session_start_time: Optional[datetime.time] = None
    session_end_time: Optional[datetime.time] = None
    status: LogStatusEnum
    submitted_at: datetime.datetime
    review_feedback: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, log):
        # Extract latest review if present
        latest_review = log.reviews[-1] if log.reviews else None
        return cls(
            id=log.id,
            enrollment_id=log.enrollment_id,
            student_id=log.student_id,
            student_name=log.student.full_name if log.student else "Unknown",
            practice_date=log.practice_date,
            category=log.category,
            duration_minutes=log.duration_minutes,
            duration_hours=round(log.duration_minutes / 60.0, 2),
            reflection_journal=log.reflection_journal,
            session_start_time=log.session_start_time,
            session_end_time=log.session_end_time,
            status=log.status,
            submitted_at=log.submitted_at,
            review_feedback=latest_review.feedback_reason if latest_review else None,
            reviewed_by=latest_review.reviewer.full_name if latest_review and latest_review.reviewer else None,
            reviewed_at=latest_review.reviewed_at if latest_review else None,
        )


class DailyCapStatusResponse(BaseModel):
    practice_date: datetime.date
    existing_minutes: int
    existing_hours: float
    daily_max_hours: float
    remaining_minutes: int
    remaining_hours: float
