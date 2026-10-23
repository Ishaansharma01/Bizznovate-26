"""Schemas for public alumni certificate verification."""
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict


class PublicCertificateResponse(BaseModel):
    """Sanitized, data-minimized public verification record.
    
    Invariants:
    1. Strictly NO emails, phone numbers, or passwords.
    2. Strictly NO private training logs or reflection journals.
    3. Strictly NO internal faculty review notes.
    4. Strictly NO server filesystem storage paths.
    """
    is_verified: bool
    certificate_id: str
    status: str  # "issued", "revoked", "superseded"
    student_name: str
    program_name: str
    program_code: str
    completion_date: str
    issue_date: str
    total_approved_hours: float
    category_hours: Dict[str, float]
    signature_digest: str
    revocation_reason: Optional[str] = None
    revoked_at: Optional[str] = None
    superseded_by: Optional[str] = None
    signatory_title: str
    has_pdf: bool

    model_config = ConfigDict(from_attributes=True)
