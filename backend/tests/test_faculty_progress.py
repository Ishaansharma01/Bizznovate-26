"""Tests for Faculty Review, Audit Trail, and Verified Progress Service."""
import datetime
import pytest
from app.models.models import User, Program, Enrollment, TrainingLog, LogReview, AuditEvent
from app.models.enums import RoleEnum, CategoryEnum, LogStatusEnum, ReviewDecisionEnum
from app.core.security import get_password_hash


@pytest.fixture
def faculty_env(client, db_session):
    """Seed test environment with faculty, 2 students, program, and active enrollments."""
    prog = Program(
        code="TTC-FACULTY-TEST",
        name="Faculty Review Program",
        required_hours=200.0,
        daily_max_hours=8.0,
        backdating_window_hours=48,
        timezone="Asia/Kolkata",
        category_quotas=None,  # Unconfigured quotas
    )
    db_session.add(prog)
    db_session.flush()

    faculty_user = User(
        email="acharya_ramesh@shailjayoga.com",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Acharya Ramesh",
        role=RoleEnum.FACULTY,
        is_active=True,
    )
    s1 = User(
        email="trainee1@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Trainee One",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    s2 = User(
        email="trainee2@shailjayoga.com",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Trainee Two",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([faculty_user, s1, s2])
    db_session.flush()

    today = datetime.date.today()
    e1 = Enrollment(
        student_id=s1.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=30),
        target_graduation_date=today + datetime.timedelta(days=90),
        status="active",
    )
    e2 = Enrollment(
        student_id=s2.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=30),
        target_graduation_date=today + datetime.timedelta(days=90),
        status="active",
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    def get_token(email, pwd):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        return res.json()["data"]["access_token"]

    return {
        "faculty_token": get_token("acharya_ramesh@shailjayoga.com", "FacultyPass123!"),
        "faculty_id": faculty_user.id,
        "s1_token": get_token("trainee1@shailjayoga.com", "StudentPass123!"),
        "s1_id": s1.id,
        "e1_id": e1.id,
        "s2_token": get_token("trainee2@shailjayoga.com", "StudentPass123!"),
        "s2_id": s2.id,
        "e2_id": e2.id,
        "prog_id": prog.id,
    }


def test_authorized_faculty_approval(client, faculty_env, db_session):
    """Test authorized faculty approval marks log as approved and updates verified progress."""
    today = datetime.date.today()
    env = faculty_env

    # 1. Student submits log
    sub_res = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "asana_practice",
            "duration_minutes": 180,  # 3.0 hours
            "reflection_journal": "In-depth practice of standing postures and forward folds.",
        },
    )
    assert sub_res.status_code == 200
    log_id = sub_res.json()["data"]["id"]

    # 2. Check Faculty Review Queue contains the pending log
    queue_res = client.get(
        "/api/v1/faculty/reviews",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )
    assert queue_res.status_code == 200
    queue_logs = queue_res.json()["data"]
    assert any(l["id"] == log_id for l in queue_logs)

    # 3. Faculty approves the log
    approve_res = client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
        json={
            "decision": "approve",
            "feedback_reason": "Excellent attention to breath alignment.",
        },
    )
    assert approve_res.status_code == 200
    approved_data = approve_res.json()["data"]
    assert approved_data["status"] == "approved"
    assert approved_data["review_feedback"] == "Excellent attention to breath alignment."

    # 4. Verify review record and audit event in DB
    review_rec = db_session.query(LogReview).filter(LogReview.log_id == log_id).first()
    assert review_rec is not None
    assert review_rec.reviewer_id == env["faculty_id"]
    assert review_rec.decision == ReviewDecisionEnum.APPROVE

    audit_rec = db_session.query(AuditEvent).filter(
        AuditEvent.entity_id == log_id,
        AuditEvent.action == "REVIEW_TRAINING_LOG",
    ).first()
    assert audit_rec is not None

    # 5. Check that Verified Progress now reflects 3.0 approved hours
    prog_res = client.get(
        "/api/v1/progress/me",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
    )
    assert prog_res.status_code == 200
    progress = prog_res.json()["data"]
    assert progress["approved_hours"] == 3.0
    assert progress["remaining_hours"] == 197.0
    assert progress["category_totals"]["asana_practice"] == 3.0
    assert progress["completion_percentage"] == 1.5


def test_student_cannot_review_logs(client, faculty_env):
    """Test students cannot call review endpoints (403 Forbidden)."""
    today = datetime.date.today()
    env = faculty_env

    # Student 1 submits a log
    sub_res = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "anatomy",
            "duration_minutes": 60,
            "reflection_journal": "Anatomy review on skeletal structure.",
        },
    )
    log_id = sub_res.json()["data"]["id"]

    # Student attempts to self-approve
    review_res = client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={"decision": "approve"},
    )
    assert review_res.status_code == 403


def test_rejection_requires_mandatory_feedback_reason(client, faculty_env):
    """Test rejecting or requesting correction without reason fails."""
    today = datetime.date.today()
    env = faculty_env

    sub_res = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "yoga_philosophy",
            "duration_minutes": 60,
            "reflection_journal": "Short reflection for testing rejection validation.",
        },
    )
    log_id = sub_res.json()["data"]["id"]

    # 1. Reject without reason -> Should fail with 422
    fail_res = client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
        json={"decision": "reject", "feedback_reason": ""},
    )
    assert fail_res.status_code == 422

    # 2. Reject with valid reason -> Succeeds
    success_res = client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
        json={"decision": "reject", "feedback_reason": "Reflection does not meet required philosophical depth."},
    )
    assert success_res.status_code == 200
    assert success_res.json()["data"]["status"] == "rejected"

    # 3. Verify rejected hours are strictly excluded from verified progress!
    prog_res = client.get(
        "/api/v1/progress/me",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
    )
    assert prog_res.json()["data"]["rejected_hours"] == 1.0
    # Approved hours must NOT have incremented
    assert prog_res.json()["data"]["category_totals"]["yoga_philosophy"] == 0.0


def test_cannot_overwrite_already_decided_log(client, faculty_env):
    """Test two reviewers cannot silently overwrite an already approved/rejected log."""
    today = datetime.date.today()
    env = faculty_env

    sub_res = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "practical_teaching",
            "duration_minutes": 60,
            "reflection_journal": "Teaching sun salutations with verbal adjustments.",
        },
    )
    log_id = sub_res.json()["data"]["id"]

    # First review -> approves
    client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
        json={"decision": "approve"},
    )

    # Attempting to review again fails with 400
    second_res = client.post(
        f"/api/v1/faculty/logs/{log_id}/review",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
        json={"decision": "reject", "feedback_reason": "Trying to overwrite approval."},
    )
    assert second_res.status_code == 400
    assert "already been reviewed" in second_res.json()["error"]["message"].lower()


def test_cross_student_progress_isolation(client, faculty_env):
    """Test that Student 2 cannot inspect Student 1's progress."""
    env = faculty_env
    cross_res = client.get(
        f"/api/v1/progress/enrollment/{env['e1_id']}",
        headers={"Authorization": f"Bearer {env['s2_token']}"},
    )
    assert cross_res.status_code == 403


def test_category_quota_unconfigured_policy(client, faculty_env):
    """Test progress service returns CONFIGURATION_REQUIRED when program quotas are null."""
    env = faculty_env
    prog_res = client.get(
        "/api/v1/progress/me",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
    )
    assert prog_res.status_code == 200
    data = prog_res.json()["data"]
    assert data["category_quotas_configured"] is False
    assert data["category_eligibility_status"] == "CONFIGURATION_REQUIRED"
