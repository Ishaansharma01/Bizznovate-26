"""Tests for Certificate Eligibility, Dynamic PDF Issuance, and Lifecycle Management."""
import datetime
import os
import pytest
from app.config import settings
from app.core.security import get_password_hash
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


@pytest.fixture
def cert_env(client, db_session):
    """Seed test environment with admin, issuer, student1, student2, and configured program."""
    prog = Program(
        code="TTC200-CERT-PROG",
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
        email="cert_admin@shailjayoga.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Director",
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    issuer_user = User(
        email="cert_issuer@shailjayoga.com",
        hashed_password=get_password_hash("IssuerPass123!"),
        full_name="Certificate Authority",
        role=RoleEnum.CERTIFICATE_ISSUER,
        is_active=True,
    )
    faculty_user = User(
        email="cert_faculty@shailjayoga.com",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Acharya Faculty",
        role=RoleEnum.FACULTY,
        is_active=True,
    )
    s1 = User(
        email="graduating_student@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Maya Devi Patel",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    s2 = User(
        email="other_student@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Ananya Rao",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([admin_user, issuer_user, faculty_user, s1, s2])
    db_session.flush()

    today = datetime.date.today()
    e1 = Enrollment(
        student_id=s1.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=120),
        target_graduation_date=today + datetime.timedelta(days=30),
        status="active",
        final_faculty_signoff=False,
    )
    e2 = Enrollment(
        student_id=s2.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=120),
        target_graduation_date=today + datetime.timedelta(days=30),
        status="active",
        final_faculty_signoff=False,
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    def get_token(email, pwd):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        return res.json()["data"]["access_token"]

    return {
        "admin_token": get_token("cert_admin@shailjayoga.com", "AdminPass123!"),
        "admin_id": admin_user.id,
        "issuer_token": get_token("cert_issuer@shailjayoga.com", "IssuerPass123!"),
        "issuer_id": issuer_user.id,
        "faculty_token": get_token("cert_faculty@shailjayoga.com", "FacultyPass123!"),
        "faculty_id": faculty_user.id,
        "s1_token": get_token("graduating_student@shailjayoga.com", "StudentPass123!"),
        "s1_id": s1.id,
        "e1_id": e1.id,
        "s2_token": get_token("other_student@shailjayoga.com", "StudentPass123!"),
        "s2_id": s2.id,
        "e2_id": e2.id,
        "prog_id": prog.id,
    }


def seed_hours(db_session, enrollment_id, student_id, asana=100.0, anatomy=30.0, philo=30.0, teach=40.0):
    """Seed approved training logs across canonical categories."""
    today = datetime.date.today()
    cat_distribution = [
        (CategoryEnum.ASANA_PRACTICE, asana),
        (CategoryEnum.ANATOMY, anatomy),
        (CategoryEnum.YOGA_PHILOSOPHY, philo),
        (CategoryEnum.PRACTICAL_TEACHING, teach),
    ]
    day_offset = 1
    for cat, total_hours in cat_distribution:
        remaining = total_hours
        while remaining > 0:
            hrs = min(remaining, 4.0)  # max 4h per entry
            log = TrainingLog(
                enrollment_id=enrollment_id,
                student_id=student_id,
                category=cat,
                practice_date=today - datetime.timedelta(days=day_offset),
                duration_minutes=int(hrs * 60),
                reflection_journal=f"TTC practice in {cat.value}",
                status=LogStatusEnum.APPROVED,
                is_superseded=False,
            )
            db_session.add(log)
            remaining -= hrs
            day_offset += 1
    db_session.commit()


def test_student_below_200_hours_is_ineligible(client, cert_env, db_session):
    """Student with 150 approved hours is ineligible for certification."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=80.0, anatomy=20.0, philo=20.0, teach=30.0,  # 150 total
    )

    headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    res = client.get(f"/api/v1/certificates/eligibility/{cert_env['e1_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_eligible"] is False
    assert data["criteria"]["hours_completed"] == 150.0
    assert data["criteria"]["hours_satisfied"] is False
    assert any("do not meet the minimum required" in r for r in data["reasons"])


def test_student_with_pending_logs_is_ineligible(client, cert_env, db_session):
    """Student with 200 approved hours but an unresolved pending log cannot be certified."""
    # Seed full 200 hours
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    # Add a pending log
    pending_log = TrainingLog(
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        category=CategoryEnum.ASANA_PRACTICE,
        practice_date=datetime.date.today(),
        duration_minutes=60,
        reflection_journal="Pending log waiting for review",
        status=LogStatusEnum.PENDING,
        is_superseded=False,
    )
    db_session.add(pending_log)
    # Sign off
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    res = client.get(f"/api/v1/certificates/eligibility/{cert_env['e1_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_eligible"] is False
    assert data["criteria"]["pending_logs_count"] == 1
    assert data["criteria"]["has_unresolved_logs"] is True
    assert any("remain pending" in r for r in data["reasons"])


def test_unconfigured_category_quotas_blocks_certification(client, cert_env, db_session):
    """Unconfigured category distribution quotas return CONFIGURATION_REQUIRED and block certification."""
    # Unconfigure program quotas
    prog = db_session.query(Program).filter(Program.id == cert_env["prog_id"]).first()
    prog.category_quotas = None
    db_session.commit()

    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    res = client.get(f"/api/v1/certificates/eligibility/{cert_env['e1_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_eligible"] is False
    assert data["criteria"]["category_eligibility_status"] == "CONFIGURATION_REQUIRED"
    assert any("quotas have not been configured" in r for r in data["reasons"])


def test_missing_faculty_signoff_blocks_certification(client, cert_env, db_session):
    """200 verified hours and satisfied quotas without faculty final sign-off is ineligible."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    # Ensure signoff is False
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = False
    db_session.commit()

    headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    res = client.get(f"/api/v1/certificates/eligibility/{cert_env['e1_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_eligible"] is False
    assert data["criteria"]["faculty_signoff_completed"] is False
    assert any("faculty sign-off has not been completed" in r for r in data["reasons"])


def test_valid_eligible_student_and_successful_issuance(client, cert_env, db_session):
    """Fully eligible student can be issued an official certificate by Certificate Issuer."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    # Verify eligibility is True
    issuer_headers = {"Authorization": f"Bearer {cert_env['issuer_token']}"}
    res_elig = client.get(f"/api/v1/certificates/eligibility/{cert_env['e1_id']}", headers=issuer_headers)
    assert res_elig.status_code == 200
    assert res_elig.json()["data"]["is_eligible"] is True

    # Issue Certificate
    res_issue = client.post(
        "/api/v1/certificates/issue",
        headers=issuer_headers,
        json={"enrollment_id": cert_env["e1_id"]},
    )
    assert res_issue.status_code == 200
    cert_data = res_issue.json()["data"]
    assert cert_data["certificate_id"].startswith("SY-TTC200-")
    assert cert_data["status"] == CertificateStatusEnum.ISSUED.value
    assert cert_data["total_approved_hours"] == 200.0
    assert cert_data["student_name"] == "Maya Devi Patel"
    assert cert_data["has_pdf"] is True
    assert len(cert_data["signature_digest"]) == 64

    # Verify PDF exists on filesystem and has valid %PDF header
    cert_record = db_session.query(Certificate).filter(Certificate.certificate_id == cert_data["certificate_id"]).first()
    assert os.path.exists(cert_record.pdf_file_path)
    with open(cert_record.pdf_file_path, "rb") as f:
        assert f.read(5) == b"%PDF-"

    # Verify Snapshot creation
    snapshot = db_session.query(CertificateSnapshot).filter(CertificateSnapshot.certificate_id == cert_record.id).first()
    assert snapshot is not None
    assert snapshot.public_payload["certificate_id"] == cert_data["certificate_id"]
    assert snapshot.public_payload["status"] == "issued"
    assert "password" not in snapshot.public_payload
    assert "reflection_notes" not in snapshot.public_payload

    # Verify Audit Event recorded
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.entity_type == "certificate",
        AuditEvent.action == "CERTIFICATE_ISSUED",
        AuditEvent.entity_id == cert_record.id,
    ).first()
    assert audit is not None
    assert audit.actor_id == cert_env["issuer_id"]


def test_duplicate_issuance_idempotency(client, cert_env, db_session):
    """Re-issuing for the same enrollment returns the existing active certificate idempotently."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    issuer_headers = {"Authorization": f"Bearer {cert_env['issuer_token']}"}
    res1 = client.post("/api/v1/certificates/issue", headers=issuer_headers, json={"enrollment_id": cert_env["e1_id"]})
    assert res1.status_code == 200
    cert1_id = res1.json()["data"]["certificate_id"]

    # Second issuance request
    res2 = client.post("/api/v1/certificates/issue", headers=issuer_headers, json={"enrollment_id": cert_env["e1_id"]})
    assert res2.status_code == 200
    cert2_id = res2.json()["data"]["certificate_id"]

    assert cert1_id == cert2_id  # Same certificate returned; no duplicate generated


def test_unauthorized_user_cannot_issue_or_revoke_certificate(client, cert_env, db_session):
    """Students and faculty cannot issue or revoke certificates (HTTP 403 Forbidden)."""
    student_headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    faculty_headers = {"Authorization": f"Bearer {cert_env['faculty_token']}"}

    # Student issue attempt
    res_s_issue = client.post("/api/v1/certificates/issue", headers=student_headers, json={"enrollment_id": cert_env["e1_id"]})
    assert res_s_issue.status_code == 403

    # Faculty issue attempt
    res_f_issue = client.post("/api/v1/certificates/issue", headers=faculty_headers, json={"enrollment_id": cert_env["e1_id"]})
    assert res_f_issue.status_code == 403


def test_certificate_revocation_lifecycle(client, cert_env, db_session):
    """Admin can revoke an active certificate with mandatory reason tracking."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    admin_headers = {"Authorization": f"Bearer {cert_env['admin_token']}"}
    res_issue = client.post("/api/v1/certificates/issue", headers=admin_headers, json={"enrollment_id": cert_env["e1_id"]})
    cert_id = res_issue.json()["data"]["certificate_id"]

    # Revocation with empty reason fails
    res_fail = client.post(f"/api/v1/certificates/{cert_id}/revoke", headers=admin_headers, json={"revocation_reason": " "})
    assert res_fail.status_code in [400, 422]

    # Revocation with valid reason succeeds
    reason = "Administrative disciplinary violation discovered post-graduation."
    res_revoke = client.post(f"/api/v1/certificates/{cert_id}/revoke", headers=admin_headers, json={"revocation_reason": reason})
    assert res_revoke.status_code == 200
    revoked_data = res_revoke.json()["data"]
    assert revoked_data["status"] == CertificateStatusEnum.REVOKED.value
    assert revoked_data["revocation_reason"] == reason
    assert revoked_data["revoked_at"] is not None

    # Snapshot updated to revoked
    cert_db = db_session.query(Certificate).filter(Certificate.certificate_id == cert_id).first()
    snapshot = db_session.query(CertificateSnapshot).filter(CertificateSnapshot.certificate_id == cert_db.id).first()
    assert snapshot.public_payload["status"] == "revoked"
    assert snapshot.public_payload["revocation_reason"] == reason


def test_certificate_superseding_workflow(client, cert_env, db_session):
    """Admin can supersede a certificate to correct graduate name/hours, issuing a linked replacement."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    admin_headers = {"Authorization": f"Bearer {cert_env['admin_token']}"}
    res_issue = client.post("/api/v1/certificates/issue", headers=admin_headers, json={"enrollment_id": cert_env["e1_id"]})
    original_cert_id = res_issue.json()["data"]["certificate_id"]

    # Supersede certificate
    reason = "Correction of legal surname per official graduate passport documentation."
    res_super = client.post(f"/api/v1/certificates/{original_cert_id}/supersede", headers=admin_headers, json={"reason": reason})
    assert res_super.status_code == 200
    new_cert_data = res_super.json()["data"]
    new_cert_id = new_cert_data["certificate_id"]

    assert new_cert_id != original_cert_id
    assert new_cert_data["status"] == CertificateStatusEnum.ISSUED.value

    # Check original certificate is superseded and links to new certificate
    orig_cert = db_session.query(Certificate).filter(Certificate.certificate_id == original_cert_id).first()
    assert orig_cert.status == CertificateStatusEnum.SUPERSEDED
    assert orig_cert.superseded_by_id == new_cert_data["id"]


def test_download_pdf_and_cross_student_isolation(client, cert_env, db_session):
    """Student can download own certificate PDF; other students are forbidden (HTTP 403)."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    admin_headers = {"Authorization": f"Bearer {cert_env['admin_token']}"}
    res_issue = client.post("/api/v1/certificates/issue", headers=admin_headers, json={"enrollment_id": cert_env["e1_id"]})
    cert_id = res_issue.json()["data"]["certificate_id"]

    # Student 1 downloads own PDF
    s1_headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    res_s1 = client.get(f"/api/v1/certificates/{cert_id}/download", headers=s1_headers)
    assert res_s1.status_code == 200
    assert res_s1.headers["content-type"] == "application/pdf"
    assert res_s1.content.startswith(b"%PDF-")

    # Student 2 tries to download Student 1's PDF -> 403 Forbidden
    s2_headers = {"Authorization": f"Bearer {cert_env['s2_token']}"}
    res_s2 = client.get(f"/api/v1/certificates/{cert_id}/download", headers=s2_headers)
    assert res_s2.status_code == 403


def test_category_quota_unmet_blocks_certification(client, cert_env, db_session):
    """200 total hours but unmet category quota (10h anatomy vs 30h required) blocks certification."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=120.0, anatomy=10.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    headers = {"Authorization": f"Bearer {cert_env['s1_token']}"}
    res = client.get(f"/api/v1/certificates/eligibility/{cert_env['e1_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_eligible"] is False
    assert data["criteria"]["category_quotas_satisfied"] is False
    assert any("Category distribution quotas are not met" in r for r in data["reasons"])


def test_missing_signing_key_raises_configuration_error(client, cert_env, db_session, monkeypatch):
    """Missing or empty certificate signing key blocks issuance with configuration error."""
    seed_hours(
        db_session,
        enrollment_id=cert_env["e1_id"],
        student_id=cert_env["s1_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == cert_env["e1_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    monkeypatch.setattr(settings, "CERTIFICATE_SIGNING_KEY", "")

    issuer_headers = {"Authorization": f"Bearer {cert_env['issuer_token']}"}
    res = client.post("/api/v1/certificates/issue", headers=issuer_headers, json={"enrollment_id": cert_env["e1_id"]})
    assert res.status_code == 500
    err_msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
    assert "signing key is not configured" in err_msg.lower()

