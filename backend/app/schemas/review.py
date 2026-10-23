"""Schemas for faculty review decisions and feedback."""
import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.models.enums import ReviewDecisionEnum


class ReviewSubmissionRequest(BaseModel):
    decision: ReviewDecisionEnum
    feedback_reason: Optional[str] = Field(
        default=None,
        description="Mandatory reason and feedback when rejecting or requesting correction.",
    )

    @model_validator(mode="after")
    def validate_reason_requirement(self):
        if self.decision in (ReviewDecisionEnum.REJECT, ReviewDecisionEnum.REQUEST_CORRECTION):
            if not self.feedback_reason or not self.feedback_reason.strip():
                raise ValueError(
                    f"A clear feedback reason is mandatory when decision is '{self.decision.value}'."
                )
        return self


class ReviewResponse(BaseModel):
    id: str
    log_id: str
    reviewer_id: str
    reviewer_name: str
    decision: ReviewDecisionEnum
    feedback_reason: Optional[str] = None
    reviewed_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
