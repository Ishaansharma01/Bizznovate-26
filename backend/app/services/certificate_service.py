"""Authoritative Certificate Service: Eligibility, Dynamic Issuance & Lifecycle Management."""
from datetime import datetime, timezone, date
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.models.enums import CategoryEnum, CertificateStatusEnum, LogStatusEnum, RoleEnum
from app.models.models import (
    AuditEvent,
    Certificate,
    CertificateSnapshot,
    Enrollment,
    Program,
    TrainingLog,
    User,
)
from app.services.audit_service import record_audit_event
from app.services.pdf_generator import generate_certificate_pdf
from app.services.progress_service import calculate_enrollment_progress


def check_eligibility(db: Session, enrollment_id: str) -> Dict[str, Any]:
    """Authoritative server-side evaluation of student certification eligibility.
    
    Invariants enforced:
    1. At least 200 eligible, faculty-approved hours (or program requirement).
    2. Category distribution rules satisfied. If unconfigured, block certification.
    3. Zero unresolved training logs (no pending or correction_requested logs).
    4. Mandatory faculty final sign-off is completed.
    5. Student and program are active.
    6. No active certificate already exists.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment record not found.")

    student = enrollment.student
    program = enrollment.program
    if not student or not program:
        raise HTTPException(status_code=404, detail="Student or program record not found.")

    # 1. Authoritative Verified Progress
    progress = calculate_enrollment_progress(db, enrollment_id)
    approved_hours = progress["approved_hours"]
    required_hours = progress["required_hours"]
    hours_satisfied = progress["is_hours_requirement_met"]

    # 2. Category Quotas
    category_quotas_configured = progress["category_quotas_configured"]
    category_eligibility_status = progress["category_eligibility_status"]
    category_quotas_satisfied = category_eligibility_status == "SATISFIED"

    # 3. Unresolved Logs Check
    pending_logs_count = db.query(TrainingLog).filter(
        TrainingLog.enrollment_id == enrollment.id,
        TrainingLog.status.in_([LogStatusEnum.PENDING, LogStatusEnum.CORRECTION_REQUESTED]),
        TrainingLog.is_superseded == False,
    ).count()
    has_unresolved_logs = pending_logs_count > 0

    # 4. Mandatory Faculty Final Sign-Off
    faculty_signoff_completed = bool(enrollment.final_faculty_signoff)

    # 5. Student and Program Active Status
    student_is_active = bool(student.is_active)
    program_is_active = bool(program.is_active)

    # 6. Existing Active Certificate
    active_cert = db.query(Certificate).filter(
        Certificate.enrollment_id == enrollment.id,
        Certificate.status == CertificateStatusEnum.ISSUED,
    ).first()
    has_active_certificate = active_cert is not None
    existing_certificate_id = active_cert.certificate_id if active_cert else None

    # Compile Reasons if Ineligible
    reasons: List[str] = []
    if not student_is_active:
        reasons.append("Student account is inactive.")
    if not program_is_active:
        reasons.append("Training program is inactive.")
    if not hours_satisfied:
        reasons.append(
            f"Approved hours ({approved_hours:.1f}h) do not meet the minimum required ({required_hours:.1f}h). "
            f"Shortfall: {max(round(required_hours - approved_hours, 2), 0.0):.1f} hours."
        )
    if not category_quotas_configured:
        reasons.append(
            "Program category distribution quotas have not been configured. "
            "Distribution requirements must be formally configured by an administrator before certification."
        )
    elif not category_quotas_satisfied:
        unmet_cats = [
            f"{c}: {d['completed_hours']:.1f}/{d['required_hours']:.1f}h"
            for c, d in progress["category_quota_details"].items()
            if not d.get("is_met", False)
        ]
        reasons.append(
            f"Category distribution quotas are not met. Remaining requirements: {', '.join(unmet_cats)}."
        )
    if has_unresolved_logs:
        reasons.append(
            f"{pending_logs_count} training log(s) remain pending or under correction review. "
            "All submitted logs must be finalized by faculty before graduation."
        )
    if not faculty_signoff_completed:
        reasons.append("Mandatory final faculty sign-off has not been completed for this trainee.")
    if has_active_certificate:
        reasons.append(
            f"An active graduation certificate ({existing_certificate_id}) has already been issued for this trainee."
        )

    is_eligible = (
        student_is_active
        and program_is_active
        and hours_satisfied
        and category_quotas_satisfied
        and not has_unresolved_logs
        and faculty_signoff_completed
        and not has_active_certificate
    )

    return {
        "enrollment_id": enrollment.id,
        "student_id": student.id,
        "student_name": student.full_name,
        "program_id": program.id,
        "program_name": program.name,
        "is_eligible": is_eligible,
        "reasons": reasons,
        "criteria": {
            "hours_completed": approved_hours,
            "hours_required": required_hours,
            "hours_satisfied": hours_satisfied,
            "category_quotas_satisfied": category_quotas_satisfied,
            "category_eligibility_status": category_eligibility_status,
            "category_breakdown": progress["category_quota_details"],
            "pending_logs_count": pending_logs_count,
            "has_unresolved_logs": has_unresolved_logs,
            "faculty_signoff_completed": faculty_signoff_completed,
            "student_is_active": student_is_active,
            "has_active_certificate": has_active_certificate,
        },
        "existing_certificate_id": existing_certificate_id,
    }


def compute_signature_digest(
    signing_key: str,
    certificate_id: str,
    student_id: str,
    program_id: str,
    completion_date_str: str,
    total_approved_hours: float,
    category_hours: Dict[str, float],
    issue_date_iso: str,
) -> str:
    """Compute an immutable, tamper-evident HMAC-SHA256 verification digest over canonical certificate fields."""
    if not signing_key or not signing_key.strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Certificate signing key is not configured. Issuance cannot proceed.",
        )
    
    sorted_cat_str = json.dumps(category_hours, sort_keys=True)
    payload = f"{certificate_id}|{student_id}|{program_id}|{completion_date_str}|{total_approved_hours:.2f}|{sorted_cat_str}|{issue_date_iso}"
    return hmac.new(signing_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def issue_certificate(
    db: Session,
    enrollment_id: str,
    issued_by_id: str,
    idempotency_key: Optional[str] = None,
) -> Certificate:
    """Authoritative issuance of a verifiable graduation certificate.
    
    Invariants:
    1. Server authoritative: Evaluates all 6 non-negotiable eligibility criteria.
    2. Idempotent: If an active certificate already exists, returns it on retry.
    3. Tamper-evident: Generates an HMAC-SHA256 cryptographic verification digest.
    4. Immutable Snapshot: Stores a minimal public snapshot for the verification registry.
    5. Artifact storage: Stores the dynamic PDF in private storage without exposing filesystem paths.
    """
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    # Check for existing active certificate (Idempotency)
    existing_cert = db.query(Certificate).filter(
        Certificate.enrollment_id == enrollment.id,
        Certificate.status == CertificateStatusEnum.ISSUED,
    ).first()

    if existing_cert:
        # Idempotent response: return already issued certificate
        return existing_cert

    # Run Authoritative Eligibility Check
    eligibility = check_eligibility(db, enrollment_id)
    if not eligibility["is_eligible"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Student is not eligible for graduation certification.",
                "reasons": eligibility["reasons"],
            },
        )

    # Validate signing configuration
    signing_key = settings.CERTIFICATE_SIGNING_KEY
    if not signing_key or not signing_key.strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Certificate signing key is not configured. Issuance cannot proceed.",
        )

    student = enrollment.student
    program = enrollment.program
    progress = calculate_enrollment_progress(db, enrollment_id)
    total_approved_hours = progress["approved_hours"]
    category_hours = progress["category_totals"]

    # Determine completion date (latest approved log date or today)
    latest_log_date = db.query(func.max(TrainingLog.practice_date)).filter(
        TrainingLog.enrollment_id == enrollment.id,
        TrainingLog.status == LogStatusEnum.APPROVED,
    ).scalar()
    completion_date = latest_log_date if latest_log_date else date.today()

    # Generate Unique, Non-Sequential Certificate ID
    now_utc = datetime.now(timezone.utc)
    cert_id = f"SY-TTC200-{now_utc.year}-{secrets.token_hex(4).upper()}"

    # Compute Cryptographic Digest
    completion_date_str = str(completion_date)
    issue_date_iso = now_utc.isoformat()
    signature_digest = compute_signature_digest(
        signing_key=signing_key,
        certificate_id=cert_id,
        student_id=student.id,
        program_id=program.id,
        completion_date_str=completion_date_str,
        total_approved_hours=total_approved_hours,
        category_hours=category_hours,
        issue_date_iso=issue_date_iso,
    )

    # Dynamic PDF Generation
    storage_dir = Path(settings.CERTIFICATE_STORAGE_DIR)
    storage_dir.mkdir(parents=True, exist_ok=True)
    pdf_filename = f"{cert_id}.pdf"
    pdf_full_path = str(storage_dir / pdf_filename)
    verification_url = f"{settings.PUBLIC_VERIFIER_URL}/{cert_id}"

    try:
        generate_certificate_pdf(
            output_path=pdf_full_path,
            certificate_id=cert_id,
            student_name=student.full_name,
            program_name=program.name,
            completion_date_str=completion_date_str,
            issue_date_str=str(now_utc.date()),
            total_approved_hours=total_approved_hours,
            category_hours=category_hours,
            verification_url=verification_url,
            signature_digest=signature_digest,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Certificate PDF generation failed: {str(exc)}",
        )

    # Create Certificate Record
    new_cert = Certificate(
        certificate_id=cert_id,
        enrollment_id=enrollment.id,
        student_id=student.id,
        program_id=program.id,
        issued_by_id=issued_by_id,
        completion_date=completion_date,
        issue_date=now_utc,
        status=CertificateStatusEnum.ISSUED,
        total_approved_hours=total_approved_hours,
        category_hours_snapshot=category_hours,
        pdf_file_path=pdf_full_path,
        signature_digest=signature_digest,
    )
    db.add(new_cert)
    db.flush()

    # Create Immutable Certificate Snapshot for Public Verifier
    public_name = student.full_name if enrollment.is_public_name_visible else "[Name withheld by graduate request]"
    public_payload = {
        "certificate_id": cert_id,
        "student_name": public_name,
        "program_name": program.name,
        "program_code": program.code,
        "completion_date": completion_date_str,
        "issue_date": issue_date_iso,
        "status": CertificateStatusEnum.ISSUED.value,
        "total_approved_hours": total_approved_hours,
        "category_hours": category_hours,
        "signature_digest": signature_digest,
        "verification_url": verification_url,
        "signatory_title": "Lead Faculty Director & E-RYT 500",
    }
    snapshot = CertificateSnapshot(
        certificate_id=new_cert.id,
        public_payload=public_payload,
        created_at=now_utc,
    )
    db.add(snapshot)

    # Update enrollment status to graduated
    enrollment.status = "graduated"

    # Record Immutable Audit Event
    record_audit_event(
        db=db,
        entity_type="certificate",
        entity_id=new_cert.id,
        action="CERTIFICATE_ISSUED",
        actor_id=issued_by_id,
        payload={
            "certificate_id": cert_id,
            "enrollment_id": enrollment.id,
            "student_id": student.id,
            "total_hours": total_approved_hours,
            "signature_digest": signature_digest,
        },
    )

    db.commit()
    db.refresh(new_cert)
    return new_cert


def revoke_certificate(
    db: Session,
    certificate_id: str,
    actor_id: str,
    revocation_reason: str,
) -> Certificate:
    """Revoke an active certificate with mandatory reason tracking.
    
    Preserves existing records and PDF artifacts for historical audit integrity.
    """
    cert = db.query(Certificate).filter(
        (Certificate.certificate_id == certificate_id) | (Certificate.id == certificate_id)
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate record not found.")

    if cert.status == CertificateStatusEnum.REVOKED:
        raise HTTPException(status_code=400, detail="Certificate is already revoked.")
    if cert.status == CertificateStatusEnum.SUPERSEDED:
        raise HTTPException(status_code=400, detail="Cannot revoke a certificate that has already been superseded.")

    if not revocation_reason or len(revocation_reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A mandatory, detailed revocation reason is required (min 5 chars).")

    now_utc = datetime.now(timezone.utc)
    cert.status = CertificateStatusEnum.REVOKED
    cert.revoked_at = now_utc
    cert.revocation_reason = revocation_reason.strip()

    # Update Snapshot public state
    snapshot = db.query(CertificateSnapshot).filter(CertificateSnapshot.certificate_id == cert.id).first()
    if snapshot:
        payload = dict(snapshot.public_payload)
        payload["status"] = CertificateStatusEnum.REVOKED.value
        payload["revoked_at"] = now_utc.isoformat()
        payload["revocation_reason"] = cert.revocation_reason
        snapshot.public_payload = payload

    # Revert enrollment status if needed
    if cert.enrollment and cert.enrollment.status == "graduated":
        cert.enrollment.status = "active"

    # Record Audit Event
    record_audit_event(
        db=db,
        entity_type="certificate",
        entity_id=cert.id,
        action="CERTIFICATE_REVOKED",
        actor_id=actor_id,
        payload={
            "certificate_id": cert.certificate_id,
            "reason": cert.revocation_reason,
            "revoked_at": now_utc.isoformat(),
        },
    )

    db.commit()
    db.refresh(cert)
    return cert


def supersede_certificate(
    db: Session,
    certificate_id: str,
    actor_id: str,
    supersede_reason: str,
) -> Certificate:
    """Issue a corrected superseding certificate, retiring the prior certificate record."""
    original_cert = db.query(Certificate).filter(
        (Certificate.certificate_id == certificate_id) | (Certificate.id == certificate_id)
    ).first()
    if not original_cert:
        raise HTTPException(status_code=404, detail="Certificate record not found.")

    if original_cert.status != CertificateStatusEnum.ISSUED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot supersede a certificate with status '{original_cert.status.value}'. Only active issued certificates can be superseded.",
        )

    if not supersede_reason or len(supersede_reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A mandatory, detailed reason is required for superseding (min 5 chars).")

    enrollment = original_cert.enrollment
    student = original_cert.student
    program = original_cert.program
    signing_key = settings.CERTIFICATE_SIGNING_KEY

    # Generate New Certificate ID
    now_utc = datetime.now(timezone.utc)
    new_cert_id = f"SY-TTC200-{now_utc.year}-{secrets.token_hex(4).upper()}"

    # Fresh progress snapshot
    progress = calculate_enrollment_progress(db, enrollment.id)
    total_approved_hours = progress["approved_hours"]
    category_hours = progress["category_totals"]
    completion_date_str = str(original_cert.completion_date)
    issue_date_iso = now_utc.isoformat()

    signature_digest = compute_signature_digest(
        signing_key=signing_key,
        certificate_id=new_cert_id,
        student_id=student.id,
        program_id=program.id,
        completion_date_str=completion_date_str,
        total_approved_hours=total_approved_hours,
        category_hours=category_hours,
        issue_date_iso=issue_date_iso,
    )

    storage_dir = Path(settings.CERTIFICATE_STORAGE_DIR)
    pdf_filename = f"{new_cert_id}.pdf"
    pdf_full_path = str(storage_dir / pdf_filename)
    verification_url = f"{settings.PUBLIC_VERIFIER_URL}/{new_cert_id}"

    generate_certificate_pdf(
        output_path=pdf_full_path,
        certificate_id=new_cert_id,
        student_name=student.full_name,
        program_name=program.name,
        completion_date_str=completion_date_str,
        issue_date_str=str(now_utc.date()),
        total_approved_hours=total_approved_hours,
        category_hours=category_hours,
        verification_url=verification_url,
        signature_digest=signature_digest,
    )

    # 1. Create New Certificate
    new_cert = Certificate(
        certificate_id=new_cert_id,
        enrollment_id=enrollment.id,
        student_id=student.id,
        program_id=program.id,
        issued_by_id=actor_id,
        completion_date=original_cert.completion_date,
        issue_date=now_utc,
        status=CertificateStatusEnum.ISSUED,
        total_approved_hours=total_approved_hours,
        category_hours_snapshot=category_hours,
        pdf_file_path=pdf_full_path,
        signature_digest=signature_digest,
    )
    db.add(new_cert)
    db.flush()

    # 2. Retire Original Certificate
    original_cert.status = CertificateStatusEnum.SUPERSEDED
    original_cert.superseded_by_id = new_cert.id

    # Update Original Snapshot
    old_snapshot = db.query(CertificateSnapshot).filter(CertificateSnapshot.certificate_id == original_cert.id).first()
    if old_snapshot:
        old_payload = dict(old_snapshot.public_payload)
        old_payload["status"] = CertificateStatusEnum.SUPERSEDED.value
        old_payload["superseded_by"] = new_cert_id
        old_payload["supersede_reason"] = supersede_reason.strip()
        old_snapshot.public_payload = old_payload

    # Create Snapshot for New Certificate
    public_name = student.full_name if enrollment.is_public_name_visible else "[Name withheld by graduate request]"
    new_payload = {
        "certificate_id": new_cert_id,
        "student_name": public_name,
        "program_name": program.name,
        "program_code": program.code,
        "completion_date": completion_date_str,
        "issue_date": issue_date_iso,
        "status": CertificateStatusEnum.ISSUED.value,
        "total_approved_hours": total_approved_hours,
        "category_hours": category_hours,
        "signature_digest": signature_digest,
        "verification_url": verification_url,
        "signatory_title": "Lead Faculty Director & E-RYT 500",
        "supersedes_certificate_id": original_cert.certificate_id,
    }
    db.add(CertificateSnapshot(certificate_id=new_cert.id, public_payload=new_payload, created_at=now_utc))

    # Audit Events
    record_audit_event(
        db=db,
        entity_type="certificate",
        entity_id=original_cert.id,
        action="CERTIFICATE_SUPERSEDED",
        actor_id=actor_id,
        payload={"superseded_by": new_cert_id, "reason": supersede_reason.strip()},
    )
    record_audit_event(
        db=db,
        entity_type="certificate",
        entity_id=new_cert.id,
        action="CERTIFICATE_ISSUED_SUPERSEDING",
        actor_id=actor_id,
        payload={"replaces": original_cert.certificate_id, "reason": supersede_reason.strip()},
    )

    db.commit()
    db.refresh(new_cert)
    return new_cert
