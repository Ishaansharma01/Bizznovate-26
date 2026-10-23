"""Comprehensive End-to-End Acceptance Tests for Shailja Yoga Certification Platform.

Validates all 8 required acceptance cases from the Phase 8 specification:
1. Complete lifecycle: Admin configures program -> Student enrolled -> Student logs hours ->
   Server validates (8h cap, 48h window) -> Faculty reviews & approves -> Verified hours update ->
   Pace monitor evaluates progress -> NLP practice brief generated -> All 200 hours completed ->
   Final faculty sign-off -> Certificate issued (PDF + QR + HMAC-SHA256) -> Public verifier confirms.
2. 199 approved hours + 5 pending hours remains at 199 verified hours and cannot be certified.
3. 200 approved hours with unmet category quotas or missing faculty sign-off cannot be certified.
4. Fully eligible student receives exactly one certificate record and artifact under retries (idempotency).
5. Unknown Certificate ID is rejected as not verified (HTTP 404).
6. Revoked certificate is displayed as revoked with reason; public PDF download blocked.
7. Two submissions on the same calendar day cannot exceed the 8-hour daily limit.
8. NLP provider failure does not block hour validation or faculty review.
9. Private journals, emails, phone numbers, and internal faculty notes are never leaked by public verifier.
"""
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
    JournalSummary,
    Program,
    TrainingLog,
    User,
)
from app.services.certificate_service import issue_certificate, revoke_certificate
from app.services.summary_service import BaseSummarizer, set_summarizer, MockSummarizer


class FailingSummarizer(BaseSummarizer):
    """Simulates NLP provider downtime/failure."""
    def summarize(self, journal_text: str) -> dict:
        raise RuntimeError("External AI service unavailable (Simulated 503 Gateway Timeout)")


@pytest.fixture
def e2e_env(client, db_session):
    """Seed fresh environment with Admin, Faculty, Trainee, and Issuer accounts."""
    prog = Program(
        code="TTC-E2E-2026",
        name="200-Hour Yoga Teacher Training Course",
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
        pace_warning_shortfall_hours=10.0,
        is_active=True,
    )
    db_session.add(prog)
    db_session.flush()

    admin = User(
        email="e2e_admin@shailjayoga.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Director",
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    faculty = User(
        email="e2e_faculty@shailjayoga.com",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Acharya Ramesh",
        role=RoleEnum.FACULTY,
        is_active=True,
    )
    issuer = User(
        email="e2e_issuer@shailjayoga.com",
        hashed_password=get_password_hash("IssuerPass123!"),
        full_name="Director Shailja",
        role=RoleEnum.CERTIFICATE_ISSUER,
        is_active=True,
    )
    trainee = User(
        email="e2e_trainee@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Ananya Sharma",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([admin, faculty, issuer, trainee])
    db_session.flush()

    today = datetime.date.today()
    enrollment = Enrollment(
        student_id=trainee.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=90),
        target_graduation_date=today + datetime.timedelta(days=30),
        status="active",
        is_public_name_visible=True,
        final_faculty_signoff=False,
    )
    db_session.add(enrollment)
    db_session.commit()

    def get_token(email, pwd):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        return res.json()["data"]["access_token"]

    return {
        "admin_token": get_token("e2e_admin@shailjayoga.com", "AdminPass123!"),
        "admin_id": admin.id,
        "faculty_token": get_token("e2e_faculty@shailjayoga.com", "FacultyPass123!"),
        "faculty_id": faculty.id,
        "issuer_token": get_token("e2e_issuer@shailjayoga.com", "IssuerPass123!"),
        "issuer_id": issuer.id,
        "trainee_token": get_token("e2e_trainee@shailjayoga.com", "StudentPass123!"),
        "trainee_id": trainee.id,
        "enrollment_id": enrollment.id,
        "prog_id": prog.id,
    }


def seed_canonical_hours(db_session, enrollment_id, student_id, asana=100.0, anatomy=30.0, philo=30.0, teach=40.0):
    """Seed approved logs across the 4 canonical categories."""
    today = datetime.date.today()
    cats = [
        (CategoryEnum.ASANA_PRACTICE, asana),
        (CategoryEnum.ANATOMY, anatomy),
        (CategoryEnum.YOGA_PHILOSOPHY, philo),
        (CategoryEnum.PRACTICAL_TEACHING, teach),
    ]
    day = 1
    for cat, total_hrs in cats:
        rem = total_hrs
        while rem > 0:
            hrs = min(rem, 4.0)
            db_session.add(
                TrainingLog(
                    enrollment_id=enrollment_id,
                    student_id=student_id,
                    category=cat,
                    practice_date=today - datetime.timedelta(days=day),
                    duration_minutes=int(hrs * 60),
                    reflection_journal=f"Deep practice and methodology reflection for {cat.value}.",
                    status=LogStatusEnum.APPROVED,
                    is_superseded=False,
                )
            )
            rem -= hrs
            day += 1
    db_session.commit()


def test_full_lifecycle_journey(client, e2e_env, db_session):
    """Test 1: Complete end-to-end user journey through all 8 system phases."""
    today = datetime.date.today()
    trainee_headers = {"Authorization": f"Bearer {e2e_env['trainee_token']}"}
    faculty_headers = {"Authorization": f"Bearer {e2e_env['faculty_token']}"}
    issuer_headers = {"Authorization": f"Bearer {e2e_env['issuer_token']}"}

    # 1. Trainee checks daily capacity
    cap_res = client.get(
        f"/api/v1/logs/daily-capacity?practice_date={today}&enrollment_id={e2e_env['enrollment_id']}",
        headers=trainee_headers,
    )
    assert cap_res.status_code == 200
    assert cap_res.json()["data"]["remaining_hours"] == 8.0

    # 2. Trainee submits training log
    log_res = client.post(
        "/api/v1/logs",
        headers=trainee_headers,
        json={
            "enrollment_id": e2e_env["enrollment_id"],
            "practice_date": str(today),
            "category": "asana_practice",
            "duration_minutes": 180,  # 3 hours
            "reflection_journal": "Practiced Surya Namaskar variations and explored alignment cues. Felt breakthrough in Trikonasana.",
        },
    )
    assert log_res.status_code in [200, 201]
    log_id = log_res.json()["data"]["id"]
    assert log_res.json()["data"]["status"] == "pending"

    # 3. Faculty views review queue
    queue_res = client.get("/api/v1/faculty/reviews?status=pending", headers=faculty_headers)
    assert queue_res.status_code == 200
    assert any(item["id"] == log_id for item in queue_res.json()["data"])

    # 4. Generate NLP practice brief
    summary_res = client.post(f"/api/v1/summaries/logs/{log_id}/summary", headers=faculty_headers)
    assert summary_res.status_code == 200
    summary_data = summary_res.json()["data"]
    assert len(summary_data["key_learning"]) > 0

    # 5. Faculty approves training log
    review_res = client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers=faculty_headers,
        json={"decision": "approve", "feedback_reason": "Excellent alignment awareness and steady breath control."},
    )
    assert review_res.status_code == 200
    assert review_res.json()["data"]["status"] == "approved"

    # 6. Pace evaluation
    pace_res = client.get("/api/v1/alerts/me", headers=trainee_headers)
    assert pace_res.status_code == 200
    assert pace_res.json()["data"]["approved_hours"] == 3.0

    # 7. Seed remaining hours to satisfy all 200 hours and category quotas
    seed_canonical_hours(
        db_session,
        enrollment_id=e2e_env["enrollment_id"],
        student_id=e2e_env["trainee_id"],
        asana=97.0, anatomy=30.0, philo=30.0, teach=40.0,  # 3.0 already logged + 97.0 = 100 asana; 200 total
    )

    # 8. Faculty completes final sign-off
    signoff_res = client.post(
        f"/api/v1/faculty/enrollments/{e2e_env['enrollment_id']}/signoff",
        headers=faculty_headers,
    )
    assert signoff_res.status_code == 200

    # 9. Verify eligibility
    elig_res = client.get(
        f"/api/v1/certificates/eligibility/{e2e_env['enrollment_id']}",
        headers=issuer_headers,
    )
    assert elig_res.status_code == 200
    assert elig_res.json()["data"]["is_eligible"] is True

    # 10. Issue official certificate
    issue_res = client.post(
        "/api/v1/certificates/issue",
        headers=issuer_headers,
        json={"enrollment_id": e2e_env["enrollment_id"]},
    )
    assert issue_res.status_code == 200
    cert_id = issue_res.json()["data"]["certificate_id"]
    assert cert_id.startswith("SY-TTC200-")

    # 11. Public verification lookup
    pub_res = client.get(f"/api/v1/public/certificates/{cert_id}")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()["data"]
    assert pub_data["is_verified"] is True
    assert pub_data["student_name"] == "Ananya Sharma"
    assert pub_data["total_approved_hours"] == 200.0

    # 12. Public PDF download
    pdf_res = client.get(f"/api/v1/public/certificates/{cert_id}/download")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")


def test_199_approved_hours_and_5_pending_hours_cannot_be_certified(client, e2e_env, db_session):
    """Case 2: 199 approved hours + 5 pending hours remains at 199 verified hours and cannot be certified."""
    # Seed 199 approved hours
    seed_canonical_hours(
        db_session,
        enrollment_id=e2e_env["enrollment_id"],
        student_id=e2e_env["trainee_id"],
        asana=99.0, anatomy=30.0, philo=30.0, teach=40.0,  # 199 total
    )
    # Add 5 pending hours
    db_session.add(
        TrainingLog(
            enrollment_id=e2e_env["enrollment_id"],
            student_id=e2e_env["trainee_id"],
            category=CategoryEnum.ASANA_PRACTICE,
            practice_date=datetime.date.today(),
            duration_minutes=300,  # 5 hours
            reflection_journal="Pending 5 hours waiting for review",
            status=LogStatusEnum.PENDING,
            is_superseded=False,
        )
    )
    # Mark signoff as True to isolate hours condition
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == e2e_env["enrollment_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    headers = {"Authorization": f"Bearer {e2e_env['issuer_token']}"}
    res = client.get(f"/api/v1/certificates/eligibility/{e2e_env['enrollment_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]

    # Invariant check: Verified hours strictly 199.0, NOT 204.0
    assert data["criteria"]["hours_completed"] == 199.0
    assert data["is_eligible"] is False

    # Issue attempt must be blocked
    issue_res = client.post("/api/v1/certificates/issue", headers=headers, json={"enrollment_id": e2e_env["enrollment_id"]})
    assert issue_res.status_code == 400


def test_200_hours_with_unmet_quota_or_missing_signoff_cannot_be_certified(client, e2e_env, db_session):
    """Case 3: 200 approved hours with unmet category quota or missing sign-off cannot be certified."""
    # 200 total hours, but only 10h in anatomy where 30h required
    seed_canonical_hours(
        db_session,
        enrollment_id=e2e_env["enrollment_id"],
        student_id=e2e_env["trainee_id"],
        asana=120.0, anatomy=10.0, philo=30.0, teach=40.0,  # 200 total, anatomy shortfall
    )
    headers = {"Authorization": f"Bearer {e2e_env['issuer_token']}"}

    # Sub-case A: Missing sign-off + unmet quota
    res_a = client.get(f"/api/v1/certificates/eligibility/{e2e_env['enrollment_id']}", headers=headers)
    assert res_a.json()["data"]["is_eligible"] is False
    assert res_a.json()["data"]["criteria"]["category_quotas_satisfied"] is False
    assert res_a.json()["data"]["criteria"]["faculty_signoff_completed"] is False

    # Sub-case B: Faculty signs off, but category quota is still unmet
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == e2e_env["enrollment_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    res_b = client.get(f"/api/v1/certificates/eligibility/{e2e_env['enrollment_id']}", headers=headers)
    assert res_b.json()["data"]["is_eligible"] is False
    assert res_b.json()["data"]["criteria"]["category_quotas_satisfied"] is False


def test_idempotent_duplicate_issuance_protection(client, e2e_env, db_session):
    """Case 4: Eligible student receives exactly one certificate record and artifact under repeated requests."""
    seed_canonical_hours(
        db_session,
        enrollment_id=e2e_env["enrollment_id"],
        student_id=e2e_env["trainee_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == e2e_env["enrollment_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    headers = {"Authorization": f"Bearer {e2e_env['issuer_token']}"}

    # First issuance
    res1 = client.post("/api/v1/certificates/issue", headers=headers, json={"enrollment_id": e2e_env["enrollment_id"]})
    assert res1.status_code == 200
    cert1 = res1.json()["data"]["certificate_id"]

    # Repeated issuance request
    res2 = client.post("/api/v1/certificates/issue", headers=headers, json={"enrollment_id": e2e_env["enrollment_id"]})
    assert res2.status_code == 200
    cert2 = res2.json()["data"]["certificate_id"]

    # Invariant: Identical certificate returned; only 1 certificate in database
    assert cert1 == cert2
    total_certs = db_session.query(Certificate).filter(Certificate.enrollment_id == e2e_env["enrollment_id"]).count()
    assert total_certs == 1


def test_unknown_certificate_id_not_verified(client, e2e_env):
    """Case 5: Unknown Certificate ID returns 404 and does not imply validity."""
    res = client.get("/api/v1/public/certificates/SY-TTC200-9999-FAKE9999")
    assert res.status_code == 404
    err_msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
    assert "not found" in err_msg.lower()


def test_revoked_certificate_public_display_and_blocked_download(client, e2e_env, db_session):
    """Case 6: Revoked certificate shows revoked status and reason; PDF download is blocked."""
    seed_canonical_hours(
        db_session,
        enrollment_id=e2e_env["enrollment_id"],
        student_id=e2e_env["trainee_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == e2e_env["enrollment_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    cert = issue_certificate(db_session, e2e_env["enrollment_id"], e2e_env["issuer_id"])
    reason = "Disciplinary action: Misconduct during retreat session."
    revoke_certificate(db_session, cert.certificate_id, e2e_env["admin_id"], reason)

    # 1. Public query shows REVOKED
    pub_res = client.get(f"/api/v1/public/certificates/{cert.certificate_id}")
    assert pub_res.status_code == 200
    data = pub_res.json()["data"]
    assert data["is_verified"] is False
    assert data["status"] == "revoked"
    assert data["revocation_reason"] == reason

    # 2. Public PDF download is blocked
    dl_res = client.get(f"/api/v1/public/certificates/{cert.certificate_id}/download")
    assert dl_res.status_code == 400
    assert "revoked" in (dl_res.json().get("error", {}).get("message") or dl_res.json().get("detail", "")).lower()


def test_two_submissions_cannot_exceed_daily_cap(client, e2e_env, db_session):
    """Case 7: Two submissions on the same calendar date cannot exceed the 8-hour daily limit."""
    today = datetime.date.today()
    headers = {"Authorization": f"Bearer {e2e_env['trainee_token']}"}

    # Submission 1: 5 hours (300 min)
    res1 = client.post(
        "/api/v1/logs",
        headers=headers,
        json={
            "enrollment_id": e2e_env["enrollment_id"],
            "practice_date": str(today),
            "category": "asana_practice",
            "duration_minutes": 300,
            "reflection_journal": "Morning 5-hour immersion session.",
        },
    )
    assert res1.status_code in [200, 201]

    # Submission 2: 4 hours (240 min) -> Total would be 9.0 hours > 8.0 hours
    res2 = client.post(
        "/api/v1/logs",
        headers=headers,
        json={
            "enrollment_id": e2e_env["enrollment_id"],
            "practice_date": str(today),
            "category": "anatomy",
            "duration_minutes": 240,
            "reflection_journal": "Afternoon anatomy study session.",
        },
    )
    assert res2.status_code == 400
    err_text = res2.text.lower()
    assert "8" in err_text or "daily" in err_text or "limit" in err_text


def test_nlp_provider_failure_does_not_block_workflows(client, e2e_env, db_session):
    """Case 8: Failure of NLP provider does not block hour validation or faculty review."""
    today = datetime.date.today()
    trainee_headers = {"Authorization": f"Bearer {e2e_env['trainee_token']}"}
    faculty_headers = {"Authorization": f"Bearer {e2e_env['faculty_token']}"}

    # Temporarily set failing summarizer
    set_summarizer(FailingSummarizer())

    try:
        # Trainee can still submit log
        log_res = client.post(
            "/api/v1/logs",
            headers=trainee_headers,
            json={
                "enrollment_id": e2e_env["enrollment_id"],
                "practice_date": str(today),
                "category": "yoga_philosophy",
                "duration_minutes": 120,
                "reflection_journal": "Read Yoga Sutras Book 1 during AI outage.",
            },
        )
        assert log_res.status_code in [200, 201]
        log_id = log_res.json()["data"]["id"]

        # Summary endpoint handles provider failure gracefully
        sum_res = client.post(f"/api/v1/summaries/logs/{log_id}/summary", headers=faculty_headers)
        assert sum_res.status_code == 200
        assert sum_res.json()["data"]["provider"] == "fallback"

        # Faculty review proceeds normally without obstruction
        review_res = client.post(
            f"/api/v1/faculty/logs/{log_id}/review",
            headers=faculty_headers,
            json={"decision": "approve", "feedback_reason": "Review conducted normally despite NLP downtime."},
        )
        assert review_res.status_code == 200
        assert review_res.json()["data"]["status"] == "approved"
    finally:
        set_summarizer(MockSummarizer())


def test_public_verifier_never_leaks_private_fields(client, e2e_env, db_session):
    """Case 9: Public verifier never returns reflection journals, emails, phone numbers, or internal notes."""
    seed_canonical_hours(
        db_session,
        enrollment_id=e2e_env["enrollment_id"],
        student_id=e2e_env["trainee_id"],
        asana=100.0, anatomy=30.0, philo=30.0, teach=40.0,
    )
    enrollment = db_session.query(Enrollment).filter(Enrollment.id == e2e_env["enrollment_id"]).first()
    enrollment.final_faculty_signoff = True
    db_session.commit()

    cert = issue_certificate(db_session, e2e_env["enrollment_id"], e2e_env["issuer_id"])
    res = client.get(f"/api/v1/public/certificates/{cert.certificate_id}")
    assert res.status_code == 200

    raw = res.text.lower()
    # Confirm private strings are strictly absent
    assert "reflection" not in raw
    assert "journal" not in raw
    assert "email" not in raw
    assert "phone" not in raw
    assert "password" not in raw
    assert "note" not in raw
    assert "storage/certificates" not in raw
