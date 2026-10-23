"""Tests for Practice Summary Generator (NLP) and Groundedness Invariants."""
import datetime
import pytest
from app.models.models import User, Program, Enrollment, TrainingLog, JournalSummary
from app.models.enums import RoleEnum, CategoryEnum, LogStatusEnum
from app.core.security import get_password_hash
from app.services.summary_service import compute_journal_hash


@pytest.fixture
def summary_env(client, db_session):
    """Seed test environment with faculty, 2 students, and active logs."""
    prog = Program(code="TTC-NLP-TEST", name="NLP TTC Program", required_hours=200.0)
    db_session.add(prog)
    db_session.flush()

    faculty = User(
        email="faculty_nlp@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty Reviewer",
        role=RoleEnum.FACULTY,
        is_active=True,
    )
    s1 = User(
        email="student1_nlp@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student One",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    s2 = User(
        email="student2_nlp@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student Two",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([faculty, s1, s2])
    db_session.flush()

    today = datetime.date.today()
    e1 = Enrollment(
        student_id=s1.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=20),
        target_graduation_date=today + datetime.timedelta(days=80),
        status="active",
    )
    e2 = Enrollment(
        student_id=s2.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=20),
        target_graduation_date=today + datetime.timedelta(days=80),
        status="active",
    )
    db_session.add_all([e1, e2])
    db_session.flush()

    # Student 1 log with rich reflection
    log1 = TrainingLog(
        enrollment_id=e1.id,
        student_id=s1.id,
        practice_date=today,
        category=CategoryEnum.ASANA_PRACTICE,
        duration_minutes=90,
        reflection_journal=(
            "Focused on alignment in warrior II and triangle pose. "
            "I struggled with maintaining steady breath during long standing holds. "
            "Need to improve transition cues and pelvic stability."
        ),
        status=LogStatusEnum.PENDING,
    )
    db_session.add(log1)
    db_session.commit()

    def get_token(email):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "Pass123!"})
        return res.json()["data"]["access_token"]

    return {
        "faculty_token": get_token("faculty_nlp@shailjayoga.com"),
        "s1_token": get_token("student1_nlp@shailjayoga.com"),
        "s1_id": s1.id,
        "log1_id": log1.id,
        "s2_token": get_token("student2_nlp@shailjayoga.com"),
        "s2_id": s2.id,
    }


def test_generate_structured_grounded_summary(client, summary_env, db_session):
    """Test summary generates Key Learning, Practice Reflection, and Topics for Review."""
    env = summary_env
    res = client.post(
        f"/api/v1/summaries/logs/{env['log1_id']}/summary",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["log_id"] == env["log1_id"]
    assert "key_learning" in data and len(data["key_learning"]) > 0
    assert "practice_reflection" in data and len(data["practice_reflection"]) > 0
    assert "topics_for_review" in data and len(data["topics_for_review"]) > 0
    assert data["is_stale"] is False
    assert "[AI-Generated" in data["ai_label"]


def test_summary_never_alters_status_or_hours(client, summary_env, db_session):
    """Critical invariant: Summary generation NEVER approves logs or changes hours."""
    env = summary_env

    # Check log status before
    log_before = db_session.query(TrainingLog).filter(TrainingLog.id == env["log1_id"]).first()
    assert log_before.status == LogStatusEnum.PENDING
    assert log_before.duration_minutes == 90

    # Generate summary
    client.post(
        f"/api/v1/summaries/logs/{env['log1_id']}/summary",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )

    # Check log status after
    db_session.refresh(log_before)
    assert log_before.status == LogStatusEnum.PENDING  # STILL PENDING!
    assert log_before.duration_minutes == 90  # Unchanged!


def test_stale_summary_on_journal_change(client, summary_env, db_session):
    """Test that modifying the source journal causes the summary to be recognized as stale."""
    env = summary_env

    # 1. Generate initial summary
    res1 = client.post(
        f"/api/v1/summaries/logs/{env['log1_id']}/summary",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )
    initial_hash = res1.json()["data"]["source_journal_hash"]

    # 2. Modify reflection journal in database
    log = db_session.query(TrainingLog).filter(TrainingLog.id == env["log1_id"]).first()
    log.reflection_journal = "Revised reflection completely changed to anatomy study."
    db_session.commit()

    # 3. Query summary without force_regenerate -> detects mismatch
    new_hash = compute_journal_hash(log.reflection_journal)
    assert initial_hash != new_hash

    # 4. Regenerating updates hash and clears stale flag
    res_regen = client.post(
        f"/api/v1/summaries/logs/{env['log1_id']}/summary?force_regenerate=true",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )
    assert res_regen.status_code == 200
    assert res_regen.json()["data"]["source_journal_hash"] == new_hash
    assert res_regen.json()["data"]["is_stale"] is False


def test_cross_student_summary_isolation(client, summary_env):
    """Test Student 2 cannot generate or view Student 1's summary."""
    env = summary_env
    res = client.get(
        f"/api/v1/summaries/logs/{env['log1_id']}/summary",
        headers={"Authorization": f"Bearer {env['s2_token']}"},
    )
    assert res.status_code == 403
