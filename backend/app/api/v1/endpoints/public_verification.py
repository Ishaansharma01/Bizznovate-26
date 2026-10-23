"""Public alumni certificate verification endpoints."""
import os
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.rate_limiter import rate_limit_public_verifier
from app.database import get_db
from app.models.enums import CertificateStatusEnum
from app.models.models import Certificate, CertificateSnapshot
from app.schemas.public_verification import PublicCertificateResponse
from app.schemas.response import ApiResponse

router = APIRouter(dependencies=[Depends(rate_limit_public_verifier)])

# Safe regex pattern for Certificate IDs (e.g. SY-TTC200-2026-A1B2C3D4)
CERTIFICATE_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-_]{5,100}$")


@router.get(
    "/certificates/{certificate_id}",
    response_model=ApiResponse[PublicCertificateResponse],
    summary="Public Alumni Certificate Lookup",
)
def verify_certificate_public(
    certificate_id: str,
    db: Session = Depends(get_db),
):
    """Verify an issued graduation certificate by its unique Certificate ID.
    
    Security & Privacy Invariants:
    1. Returns strictly minimized public fields.
    2. Never exposes private journals, emails, phone numbers, or internal faculty notes.
    3. Never leaks server filesystem storage paths.
    4. Accurately reports current lifecycle status (Issued, Revoked, or Superseded).
    5. Rate-limited to prevent automated enumeration/scraping.
    """
    normalized_id = certificate_id.strip()

    # Input sanitization and validation
    if not CERTIFICATE_ID_PATTERN.match(normalized_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed certificate identifier. Certificate ID must be between 5 and 100 alphanumeric characters.",
        )

    # Database lookup by unique public certificate ID
    cert = db.query(Certificate).filter(
        Certificate.certificate_id == normalized_id
    ).first()

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate '{normalized_id}' not found in the official alumni registry. The credential may be invalid or unissued.",
        )

    # Retrieve snapshot for verification consistency
    snapshot = db.query(CertificateSnapshot).filter(CertificateSnapshot.certificate_id == cert.id).first()

    # Determine public graduate name disclosure
    if cert.enrollment and not cert.enrollment.is_public_name_visible:
        student_name = "[Name withheld by graduate request]"
    elif snapshot and "student_name" in snapshot.public_payload:
        student_name = snapshot.public_payload["student_name"]
    else:
        student_name = cert.student.full_name if cert.student else "Graduate"

    # Resolve superseding certificate ID if applicable
    superseded_by_code: Optional[str] = None
    if cert.status == CertificateStatusEnum.SUPERSEDED:
        if cert.superseded_by_id:
            successor = db.query(Certificate).filter(Certificate.id == cert.superseded_by_id).first()
            if successor:
                superseded_by_code = successor.certificate_id
        elif snapshot and "superseded_by" in snapshot.public_payload:
            superseded_by_code = snapshot.public_payload["superseded_by"]

    # Only active ISSUED certificates are considered currently verified
    is_verified = cert.status == CertificateStatusEnum.ISSUED
    has_pdf = bool(cert.pdf_file_path and os.path.exists(cert.pdf_file_path))

    response_data = PublicCertificateResponse(
        is_verified=is_verified,
        certificate_id=cert.certificate_id,
        status=cert.status.value,
        student_name=student_name,
        program_name=cert.program.name if cert.program else "200-Hour Yoga Teacher Training",
        program_code=cert.program.code if cert.program else "TTC-200",
        completion_date=str(cert.completion_date),
        issue_date=cert.issue_date.isoformat(),
        total_approved_hours=cert.total_approved_hours,
        category_hours=cert.category_hours_snapshot or {},
        signature_digest=cert.signature_digest,
        revocation_reason=cert.revocation_reason if cert.status == CertificateStatusEnum.REVOKED else None,
        revoked_at=cert.revoked_at.isoformat() if cert.revoked_at else None,
        superseded_by=superseded_by_code,
        signatory_title="Lead Faculty Director & E-RYT 500",
        has_pdf=has_pdf,
    )

    msg = "Certificate verified as authentic and valid."
    if cert.status == CertificateStatusEnum.REVOKED:
        msg = "Warning: This certificate has been officially REVOKED by the academy."
    elif cert.status == CertificateStatusEnum.SUPERSEDED:
        msg = f"Notice: This certificate has been SUPERSEDED by replacement credential {superseded_by_code or ''}."

    return ApiResponse.ok(data=response_data, message=msg)


@router.get(
    "/certificates/{certificate_id}/download",
    summary="Public Certificate PDF Download",
)
def download_public_certificate_pdf(
    certificate_id: str,
    db: Session = Depends(get_db),
):
    """Download official certificate PDF for verified credentials.
    
    Revoked credentials cannot be downloaded publicly. Server filesystem paths are never leaked.
    """
    normalized_id = certificate_id.strip()

    if not CERTIFICATE_ID_PATTERN.match(normalized_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed certificate identifier.",
        )

    cert = db.query(Certificate).filter(
        Certificate.certificate_id == normalized_id
    ).first()

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found in official registry.",
        )

    if cert.status == CertificateStatusEnum.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot download official PDF: This certificate has been revoked.",
        )

    if not cert.pdf_file_path or not os.path.exists(cert.pdf_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate artifact is not currently available.",
        )

    filename = f"ShailjaYoga_Certificate_{cert.certificate_id}.pdf"
    return FileResponse(
        path=cert.pdf_file_path,
        media_type="application/pdf",
        filename=filename,
    )
