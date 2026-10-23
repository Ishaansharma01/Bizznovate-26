"""Schemas for Program configuration and rules."""
import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.models.enums import CategoryEnum


class ProgramCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, examples=["TTC-200-2026"])
    name: str = Field(..., min_length=3, max_length=255, examples=["200-Hour Yoga Teacher Training Certification"])
    required_hours: float = Field(default=200.0, gt=0, description="Certification minimum requirement (default 200)")
    daily_max_hours: float = Field(default=8.0, gt=0, le=24, description="Daily limit across all categories (default 8)")
    backdating_window_hours: int = Field(default=48, ge=0, description="Submission backdating window in hours (default 48)")
    timezone: str = Field(default="Asia/Kolkata", description="Authoritative program timezone")
    category_quotas: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional hour quotas per category. If null, distribution is marked unconfigured."
    )
    pace_warning_shortfall_hours: float = Field(default=10.0, ge=0)

    @field_validator("category_quotas")
    @classmethod
    def validate_category_keys(cls, v: Optional[Dict[str, float]]):
        if v is not None:
            valid_keys = {c.value for c in CategoryEnum}
            for key, val in v.items():
                if key not in valid_keys:
                    raise ValueError(f"Invalid category key '{key}'. Must be one of: {sorted(list(valid_keys))}")
                if val < 0:
                    raise ValueError(f"Category quota for '{key}' must be non-negative.")
        return v


class ProgramUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    required_hours: Optional[float] = Field(None, gt=0)
    daily_max_hours: Optional[float] = Field(None, gt=0, le=24)
    backdating_window_hours: Optional[int] = Field(None, ge=0)
    timezone: Optional[str] = None
    category_quotas: Optional[Dict[str, float]] = None
    pace_warning_shortfall_hours: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None

    @field_validator("category_quotas")
    @classmethod
    def validate_category_keys(cls, v: Optional[Dict[str, float]]):
        if v is not None:
            valid_keys = {c.value for c in CategoryEnum}
            for key, val in v.items():
                if key not in valid_keys:
                    raise ValueError(f"Invalid category key '{key}'. Must be one of: {sorted(list(valid_keys))}")
                if val < 0:
                    raise ValueError(f"Category quota for '{key}' must be non-negative.")
        return v


class ProgramResponse(BaseModel):
    id: str
    code: str
    name: str
    required_hours: float
    daily_max_hours: float
    backdating_window_hours: int
    timezone: str
    category_quotas: Optional[Dict[str, float]] = None
    category_quotas_configured: bool = False
    pace_warning_shortfall_hours: float
    is_active: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, p):
        return cls(
            id=p.id,
            code=p.code,
            name=p.name,
            required_hours=p.required_hours,
            daily_max_hours=p.daily_max_hours,
            backdating_window_hours=p.backdating_window_hours,
            timezone=p.timezone,
            category_quotas=p.category_quotas,
            category_quotas_configured=bool(p.category_quotas),
            pace_warning_shortfall_hours=p.pace_warning_shortfall_hours,
            is_active=p.is_active,
            created_at=p.created_at,
        )
