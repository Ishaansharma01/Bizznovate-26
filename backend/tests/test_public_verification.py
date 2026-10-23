"""Tests for Public Alumni Certificate Verification, Data Minimization, and Rate Limiting."""
import datetime
import os
import pytest
from app.core.rate_limiter import public_verifier_limiter
from app.core.security import get_password_hash
from app.models.enums import CategoryEnum, CertificateStatusEnum, LogStatusEnum, RoleEnum
from app.models.models import Enrollment, Program, TrainingLog, User
from app.services.certificate_service import issue_certificate, revoke_certificate, supersede_certificate


@pytest.fixture
def public_env(client, db_session):
    """Seed test environment with admin, student with visible name, student with private name, and program."""
    public_verifier_limiter.reset()

    prog = Program(
        code="TTC200-PUBLIC-TEST",
        name="200-Hour Yoga Teacher Training",
        required_hours=200.0,
        daily_max_hours=8.0,
        backdating_window_hours=48,
        timezone="Asia/Kolkata",
        category_quotas={
            CategoryEnum.ASANA_PRACTICE.value: 100.0,
            CategoryEnum.ANATOMY.value: 30.0,
            CategoryEnum.YOGA_PHILOSOPHY.value: 30.0,
            CategoryEnum.PRACTICAL_TEACHING.value: 40.0,
        },
    )
    db_session.add(prog)
    db_session.flush()

    admin_user = User(
        email="public_cert_admin@shailjayoga.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Director",
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    s_public = User(
        email="public_maya@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Maya Devi Patel",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    s_private = User(
        email="private_ananya@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Ananya Rao",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([admin_user, s_public, s_private])
    db_session.flush()

    today = datetime.date.today()
    e_public = Enrollment(
        student_id=s_public.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=120),
        target_graduation_date=today + datetime.timedelta(days=30),
        status="active",
        is_public_name_visible=True,
        final_faculty_signoff=True,
    )
    e_private = Enrollment(
        student_id=s_private.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=120),
        target_graduation_date=today + datetime.timedelta(days=30),
        status="active",
        is_public_name_visible=False,  # Private name disclosure
        final_faculty_signoff=True,
    )
    db_session.add_all([e_public, e_private])
    db_session.commit()

    # Seed 200 hours for both enrollments
    for e, s in [(e_public, s_public), (e_private, s_private)]:
        for cat, hrs in [
            (CategoryEnum.ASANA_PRACTICE, 100),
            (CategoryEnum.ANATOMY, 30),
            (CategoryEnum.YOGA_PHILOSOPHY, 30),
            (CategoryEnum.PRACTICAL_TEACHING, 40),
        ]:
            db_session.add(
                TrainingLog(
                    enrollment_id=e.id,
                    student_id=s.id,
                    category=cat,
                    practice_date=today - datetime.timedelta(days=10),
                    duration_minutes=int(hrs * 60),
                    reflection_journal=f"Private journal notes for {cat.value}. Trainee personal reflections.",
                    status=LogStatusEnum.APPROVED,
                    is_superseded=False,
                )
            )
    db_session.commit()

    return {
        "admin_id": admin_user.id,
        "e_public_id": e_public.id,
        "e_private_id": e_private.id,
        "s_public_name": s_public.full_name,
    }


def test_public_verify_valid_certificate(client, public_env, db_session):
    """Unauthenticated public lookup of a valid certificate returns verified status and public fields."""
    cert = issue_certificate(db_session, public_env["e_public_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    # Public request with NO auth headers
    res = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert res.status_code == 200
    data = res.json()["data"]

    assert data["is_verified"] is True
    assert data["certificate_id"] == cert_id
    assert data["status"] == "issued"
    assert data["student_name"] == "Maya Devi Patel"
    assert data["program_name"] == "200-Hour Yoga Teacher Training"
    assert data["total_approved_hours"] == 200.0
    assert data["category_hours"]["asana_practice"] == 100.0
    assert data["has_pdf"] is True
    assert "authentic and valid" in res.json()["message"].lower()


def test_public_verify_unknown_certificate_returns_404(client, public_env):
    """Unknown certificate ID returns 404 and does not imply validity."""
    res = client.get("/api/v1/public/certificates/SY-TTC200-2026-UNKNOWN999")
    assert res.status_code == 404
    err_body = res.json()
    err_msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "not found" in err_msg.lower()


def test_public_verify_malformed_input(client, public_env):
    """Malformed or invalid certificate IDs return 400 Bad Request."""
    res = client.get("/api/v1/public/certificates/!!bad@id##")
    assert res.status_code == 400
    err_body = res.json()
    err_msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "malformed" in err_msg.lower()


def test_public_verify_revoked_certificate(client, public_env, db_session):
    """Public lookup of a revoked certificate clearly indicates REVOKED status and shows official reason."""
    cert = issue_certificate(db_session, public_env["e_public_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    reason = "Academic integrity violation: Falsified attendance records discovered."
    revoke_certificate(db_session, cert_id, public_env["admin_id"], reason)

    res = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert res.status_code == 200
    data = res.json()["data"]

    assert data["is_verified"] is False
    assert data["status"] == "revoked"
    assert data["revocation_reason"] == reason
    assert "warning" in res.json()["message"].lower()


def test_public_verify_superseded_certificate(client, public_env, db_session):
    """Public lookup of a superseded certificate indicates SUPERSEDED status and links to successor ID."""
    cert = issue_certificate(db_session, public_env["e_public_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    reason = "Legal name correction per government passport documentation."
    new_cert = supersede_certificate(db_session, cert_id, public_env["admin_id"], reason)

    res = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert res.status_code == 200
    data = res.json()["data"]

    assert data["is_verified"] is False
    assert data["status"] == "superseded"
    assert data["superseded_by"] == new_cert.certificate_id


def test_strict_data_minimization_and_no_leakage(client, public_env, db_session):
    """Ensure response strictly omits private journals, emails, phone numbers, and storage file paths."""
    cert = issue_certificate(db_session, public_env["e_public_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    res = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert res.status_code == 200
    raw_text = res.text.lower()

    # Confirm sensitive strings from models and seed data are NEVER leaked
    assert "private journal notes" not in raw_text
    assert "trainee personal reflections" not in raw_text
    assert "email" not in raw_text
    assert "password" not in raw_text
    assert "storage/certificates" not in raw_text
    assert ".pdf" not in raw_text or "has_pdf" in raw_text  # only boolean flag allowed


def test_public_name_withheld_if_policy_set(client, public_env, db_session):
    """Graduate requesting name non-disclosure has name replaced with confidential placeholder."""
    cert = issue_certificate(db_session, public_env["e_private_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    res = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["student_name"] == "[Name withheld by graduate request]"
    assert "ananya" not in res.text.lower()


def test_public_verifier_rate_limiting(client, public_env, db_session):
    """Excessive rapid requests trigger HTTP 429 Too Many Requests."""
    cert = issue_certificate(db_session, public_env["e_public_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    # Set rate limiter limit low for test
    public_verifier_limiter.max_requests = 5
    public_verifier_limiter.reset()

    # First 5 requests succeed
    for _ in range(5):
        r = client.get(f"/api/v1/public/certificates/{cert_id}")
        assert r.status_code == 200

    # 6th request triggers rate limit
    blocked = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert blocked.status_code == 429
    err_body = blocked.json()
    err_msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "rate limit exceeded" in err_msg.lower()

    # Reset limiter for subsequent test isolation
    public_verifier_limiter.max_requests = 30
    public_verifier_limiter.reset()


def test_public_certificate_pdf_download(client, public_env, db_session):
    """Valid certificate PDF is downloadable publicly; revoked certificate download is blocked."""
    cert = issue_certificate(db_session, public_env["e_public_id"], public_env["admin_id"])
    cert_id = cert.certificate_id

    # 1. Download valid certificate PDF
    res_dl = client.get(f"/api/v1/public/certificates/{cert_id}/download")
    assert res_dl.status_code == 200
    assert res_dl.headers["content-type"] == "application/pdf"
    assert res_dl.content.startswith(b"%PDF-")

    # 2. Revoke certificate
    revoke_certificate(db_session, cert_id, public_env["admin_id"], "Administrative cancellation")

    # 3. Attempt download of revoked certificate -> 400 Bad Request
    res_revoked_dl = client.get(f"/api/v1/public/certificates/{cert_id}/download")
    assert res_revoked_dl.status_code == 400
    err_body = res_revoked_dl.json()
    err_msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "revoked" in err_msg.lower()
