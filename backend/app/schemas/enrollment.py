"""Schemas for student enrollment in programs."""
import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator, ConfigDict


class EnrollmentCreateRequest(BaseModel):
    student_id: str
    program_id: str
    enrollment_date: datetime.date
    target_graduation_date: datetime.date
    is_public_name_visible: bool = True

    @model_validator(mode="after")
    def validate_dates(self):
        if self.target_graduation_date < self.enrollment_date:
            raise ValueError("Target graduation date cannot precede enrollment start date.")
        return self


class EnrollmentResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    program_id: str
    program_name: str
    program_code: str
    enrollment_date: datetime.date
    target_graduation_date: datetime.date
    status: str
    is_public_name_visible: bool
    final_faculty_signoff: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, e):
        return cls(
            id=e.id,
            student_id=e.student_id,
            student_name=e.student.full_name if e.student else "Unknown",
            student_email=e.student.email if e.student else "Unknown",
            program_id=e.program_id,
            program_name=e.program.name if e.program else "Unknown",
            program_code=e.program.code if e.program else "Unknown",
            enrollment_date=e.enrollment_date,
            target_graduation_date=e.target_graduation_date,
            status=e.status,
            is_public_name_visible=e.is_public_name_visible,
            final_faculty_signoff=e.final_faculty_signoff,
            created_at=e.created_at,
        )
