"""Certificate eligibility, issuance, dynamic download, and lifecycle endpoints."""
import os
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.enums import RoleEnum
from app.models.models import Certificate, Enrollment, User
from app.schemas.certificate import (
    CertificateEligibilityResponse,
    CertificateIssueRequest,
    CertificateResponse,
    CertificateRevokeRequest,
    CertificateSupersedeRequest,
)
from app.schemas.response import ApiResponse
from app.services.certificate_service import (
    check_eligibility,
    issue_certificate,
    revoke_certificate,
    supersede_certificate,
)

router = APIRouter()


def format_cert_response(cert: Certificate) -> CertificateResponse:
    """Format ORM Certificate model into standard response schema."""
    has_pdf = bool(cert.pdf_file_path and os.path.exists(cert.pdf_file_path))
    verification_url = f"{settings.PUBLIC_VERIFIER_URL}/{cert.certificate_id}"
    return CertificateResponse(
        id=cert.id,
        certificate_id=cert.certificate_id,
        enrollment_id=cert.enrollment_id,
        student_id=cert.student_id,
        student_name=cert.student.full_name if cert.student else "Unknown",
        program_id=cert.program_id,
        program_name=cert.program.name if cert.program else "Unknown",
        completion_date=cert.completion_date,
        issue_date=cert.issue_date,
        status=cert.status.value,
        total_approved_hours=cert.total_approved_hours,
        category_hours=cert.category_hours_snapshot or {},
        signature_digest=cert.signature_digest,
        revocation_reason=cert.revocation_reason,
        revoked_at=cert.revoked_at,
        superseded_by_id=cert.superseded_by_id,
        verification_url=verification_url,
        has_pdf=has_pdf,
    )


@router.get(
    "/eligibility/{enrollment_id}",
    response_model=ApiResponse[CertificateEligibilityResponse],
    summary="Check Student Certificate Eligibility",
)
def get_student_eligibility(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check whether a student enrollment meets all 6 graduation certification criteria.
    
    Cross-student access is prohibited.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    # Isolation: students can only check their own eligibility
    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view certification eligibility for another student.",
        )

    eligibility = check_eligibility(db, enrollment_id)
    return ApiResponse.ok(
        data=CertificateEligibilityResponse(**eligibility),
        message="Eligibility evaluation completed.",
    )


@router.post(
    "/issue",
    response_model=ApiResponse[CertificateResponse],
    summary="Issue Graduation Certificate",
)
def issue_student_certificate(
    req: CertificateIssueRequest,
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.CERTIFICATE_ISSUER)),
    db: Session = Depends(get_db),
):
    """Authoritative certificate issuance. Restricted to Admin and Certificate Issuer roles.
    
    Verifies all 6 criteria on the server, generates a personalized tamper-evident PDF,
    creates an immutable public snapshot, and records an append-only audit event.
    """
    cert = issue_certificate(
        db=db,
        enrollment_id=req.enrollment_id,
        issued_by_id=current_user.id,
        idempotency_key=req.idempotency_key,
    )
    return ApiResponse.ok(
        data=format_cert_response(cert),
        message=f"Certificate {cert.certificate_id} issued successfully.",
    )


@router.get(
    "/{certificate_id}",
    response_model=ApiResponse[CertificateResponse],
    summary="Get Certificate Details",
)
def get_certificate_detail(
    certificate_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full certificate details. Cross-student access is prohibited."""
    cert = db.query(Certificate).filter(
        (Certificate.certificate_id == certificate_id) | (Certificate.id == certificate_id)
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    if current_user.role == RoleEnum.STUDENT and cert.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view certificates belonging to another student.",
        )

    return ApiResponse.ok(data=format_cert_response(cert))


@router.get(
    "/{certificate_id}/download",
    summary="Download Official Certificate PDF",
)
def download_certificate_pdf(
    certificate_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream official certificate PDF. Private server filesystem paths are never leaked."""
    cert = db.query(Certificate).filter(
        (Certificate.certificate_id == certificate_id) | (Certificate.id == certificate_id)
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    if current_user.role == RoleEnum.STUDENT and cert.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot download certificates belonging to another student.",
        )

    if not cert.pdf_file_path or not os.path.exists(cert.pdf_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate PDF file is missing or has not been generated yet.",
        )

    filename = f"ShailjaYoga_Certificate_{cert.certificate_id}.pdf"
    return FileResponse(
        path=cert.pdf_file_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.post(
    "/{certificate_id}/revoke",
    response_model=ApiResponse[CertificateResponse],
    summary="Revoke Certificate",
)
def revoke_existing_certificate(
    certificate_id: str,
    req: CertificateRevokeRequest,
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.CERTIFICATE_ISSUER)),
    db: Session = Depends(get_db),
):
    """Revoke an active certificate with mandatory reason tracking.
    
    Restricted to Admin and Certificate Issuer roles.
    """
    cert = revoke_certificate(
        db=db,
        certificate_id=certificate_id,
        actor_id=current_user.id,
        revocation_reason=req.revocation_reason,
    )
    return ApiResponse.ok(
        data=format_cert_response(cert),
        message=f"Certificate {cert.certificate_id} has been revoked.",
    )


@router.post(
    "/{certificate_id}/supersede",
    response_model=ApiResponse[CertificateResponse],
    summary="Supersede Certificate",
)
def supersede_existing_certificate(
    certificate_id: str,
    req: CertificateSupersedeRequest,
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.CERTIFICATE_ISSUER)),
    db: Session = Depends(get_db),
):
    """Issue a corrected superseding certificate and retire the prior certificate.
    
    Restricted to Admin and Certificate Issuer roles.
    """
    new_cert = supersede_certificate(
        db=db,
        certificate_id=certificate_id,
        actor_id=current_user.id,
        supersede_reason=req.reason,
    )
    return ApiResponse.ok(
        data=format_cert_response(new_cert),
        message=f"New superseding certificate {new_cert.certificate_id} issued successfully.",
    )


@router.get(
    "/enrollment/{enrollment_id}",
    response_model=ApiResponse[List[CertificateResponse]],
    summary="List Certificates by Enrollment",
)
def get_enrollment_certificates(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all certificates associated with an enrollment."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    if current_user.role == RoleEnum.STUDENT and enrollment.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view certificates for another student.",
        )

    certs = db.query(Certificate).filter(
        Certificate.enrollment_id == enrollment_id
    ).order_by(Certificate.issue_date.desc()).all()

    return ApiResponse.ok(data=[format_cert_response(c) for c in certs])
