"""Pydantic schemas for certificate eligibility, issuance, and lifecycle."""
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CategoryCriteriaItem(BaseModel):
    category: str
    category_name: str
    required_hours: Optional[float]
    completed_hours: float
    is_met: bool


class EligibilityCriteria(BaseModel):
    hours_completed: float
    hours_required: float
    hours_satisfied: bool
    category_quotas_satisfied: bool
    category_eligibility_status: str  # "SATISFIED", "INCOMPLETE", "CONFIGURATION_REQUIRED"
    category_breakdown: Dict[str, Any]
    pending_logs_count: int
    has_unresolved_logs: bool
    faculty_signoff_completed: bool
    student_is_active: bool
    has_active_certificate: bool


class CertificateEligibilityResponse(BaseModel):
    enrollment_id: str
    student_id: str
    student_name: str
    program_id: str
    program_name: str
    is_eligible: bool
    reasons: List[str]
    criteria: EligibilityCriteria
    existing_certificate_id: Optional[str] = None


class CertificateIssueRequest(BaseModel):
    enrollment_id: str
    idempotency_key: Optional[str] = None


class CertificateRevokeRequest(BaseModel):
    revocation_reason: str = Field(..., min_length=5, description="Mandatory detailed reason for certificate revocation")


class CertificateSupersedeRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Mandatory reason for issuing a superseding certificate")


class CertificateResponse(BaseModel):
    id: str
    certificate_id: str
    enrollment_id: str
    student_id: str
    student_name: str
    program_id: str
    program_name: str
    completion_date: date
    issue_date: datetime
    status: str
    total_approved_hours: float
    category_hours: Dict[str, float]
    signature_digest: str
    revocation_reason: Optional[str] = None
    revoked_at: Optional[datetime] = None
    superseded_by_id: Optional[str] = None
    verification_url: str
    has_pdf: bool

    model_config = ConfigDict(from_attributes=True)


class CertificateSnapshotResponse(BaseModel):
    certificate_id: str
    public_payload: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
