"""Comprehensive tests for Core Hour Logging and Verification Engine."""
import datetime
import pytest
from app.models.models import User, Program, Enrollment, TrainingLog, AuditEvent
from app.models.enums import RoleEnum, CategoryEnum, LogStatusEnum
from app.core.security import get_password_hash


@pytest.fixture
def setup_log_environment(client, db_session):
    """Seed test program, students, and enrollments."""
    # Program: 200 required hours, 8 daily max, 48h backdating window
    prog = Program(
        code="TTC-LOG-TEST",
        name="TTC Hour Engine Program",
        required_hours=200.0,
        daily_max_hours=8.0,
        backdating_window_hours=48,
        timezone="Asia/Kolkata",
    )
    db_session.add(prog)
    db_session.flush()

    s1 = User(
        email="student_logger1@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Logger Student 1",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    s2 = User(
        email="student_logger2@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Logger Student 2",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([s1, s2])
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

    def get_token(email):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "Pass123!"})
        return res.json()["data"]["access_token"]

    return {
        "s1_token": get_token(s1.email),
        "s1_id": s1.id,
        "e1_id": e1.id,
        "s2_token": get_token(s2.email),
        "s2_id": s2.id,
        "e2_id": e2.id,
        "prog_id": prog.id,
    }


def test_valid_log_submission_pending_status(client, setup_log_environment, db_session):
    """Test valid log submission is recorded as PENDING with server-side audit."""
    today = datetime.date.today()
    env = setup_log_environment

    payload = {
        "enrollment_id": env["e1_id"],
        "practice_date": today.isoformat(),
        "category": "asana_practice",
        "duration_minutes": 120,
        "reflection_journal": "Practiced surya namaskar series A & B with deep ujjayi breathing.",
    }
    response = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json=payload,
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    log = res_data["data"]
    assert log["status"] == "pending"  # Crucial: pending, NOT approved
    assert log["duration_minutes"] == 120
    assert log["duration_hours"] == 2.0
    assert log["category"] == "asana_practice"

    # Verify audit event was created
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.entity_id == log["id"],
        AuditEvent.action == "SUBMIT_TRAINING_LOG",
    ).first()
    assert audit is not None
    assert audit.actor_id == env["s1_id"]


def test_future_dated_log_rejected(client, setup_log_environment):
    """Test future-dated log submission is rejected with 400."""
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    env = setup_log_environment

    payload = {
        "enrollment_id": env["e1_id"],
        "practice_date": tomorrow.isoformat(),
        "category": "anatomy",
        "duration_minutes": 60,
        "reflection_journal": "Trying to log future anatomy study sessions.",
    }
    response = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json=payload,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "future-dated" in data["error"]["message"].lower()


def test_expired_48_hour_backdating_rejected(client, setup_log_environment):
    """Test log submission older than 48-hour backdating window is rejected with 400."""
    old_date = datetime.date.today() - datetime.timedelta(days=4)
    env = setup_log_environment

    payload = {
        "enrollment_id": env["e1_id"],
        "practice_date": old_date.isoformat(),
        "category": "yoga_philosophy",
        "duration_minutes": 90,
        "reflection_journal": "Reflection on Patanjali's yoga sutras from last week.",
    }
    response = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json=payload,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "48-hour" in data["error"]["message"].lower() or "window" in data["error"]["message"].lower()


def test_invalid_category_rejected(client, setup_log_environment):
    """Test invalid non-canonical category is rejected by schema with 422."""
    today = datetime.date.today()
    env = setup_log_environment

    payload = {
        "enrollment_id": env["e1_id"],
        "practice_date": today.isoformat(),
        "category": "invented_meditation",
        "duration_minutes": 60,
        "reflection_journal": "Invalid category test.",
    }
    response = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json=payload,
    )
    assert response.status_code == 422


def test_zero_or_negative_duration_rejected(client, setup_log_environment):
    """Test non-positive duration is rejected with 422."""
    today = datetime.date.today()
    env = setup_log_environment

    for bad_duration in [0, -45]:
        payload = {
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "anatomy",
            "duration_minutes": bad_duration,
            "reflection_journal": "Non positive duration test.",
        }
        response = client.post(
            "/api/v1/logs",
            headers={"Authorization": f"Bearer {env['s1_token']}"},
            json=payload,
        )
        assert response.status_code == 422


def test_daily_8_hour_cap_across_categories(client, setup_log_environment):
    """Test the daily 8-hour limit is enforced across all categories combined."""
    today = datetime.date.today()
    env = setup_log_environment

    # 1. Submit 4 hours (240 mins) of Asana Practice -> Should succeed
    res1 = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "asana_practice",
            "duration_minutes": 240,
            "reflection_journal": "Morning 4-hour intensive asana practice.",
        },
    )
    assert res1.status_code == 200

    # 2. Submit another 4 hours (240 mins) of Anatomy on same date -> Total 8h -> Should succeed
    res2 = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "anatomy",
            "duration_minutes": 240,
            "reflection_journal": "Afternoon 4-hour biomechanics and spine anatomy session.",
        },
    )
    assert res2.status_code == 200

    # 3. Attempt to submit a 9th hour (60 mins) of Yoga Philosophy on same date -> Must fail with 400!
    res3 = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "yoga_philosophy",
            "duration_minutes": 60,
            "reflection_journal": "Evening philosophy discussion on Yamas and Niyamas.",
        },
    )
    assert res3.status_code == 400
    err = res3.json()["error"]
    assert "daily cap" in err["message"].lower()
    assert err["details"]["existing_logged_hours"] == 8.0
    assert err["details"]["attempted_hours"] == 1.0


def test_duplicate_submission_detection(client, setup_log_environment):
    """Test duplicate entries with same date, category, and duration are rejected."""
    yesterday = datetime.date.today() - datetime.timedelta(days=1)
    env = setup_log_environment

    payload = {
        "enrollment_id": env["e1_id"],
        "practice_date": yesterday.isoformat(),
        "category": "practical_teaching",
        "duration_minutes": 60,
        "reflection_journal": "Peer teaching practicum on warrior series cues.",
    }
    # First submission -> succeeds
    res1 = client.post("/api/v1/logs", headers={"Authorization": f"Bearer {env['s1_token']}"}, json=payload)
    assert res1.status_code == 200

    # Duplicate submission -> rejected with 400
    res2 = client.post("/api/v1/logs", headers={"Authorization": f"Bearer {env['s1_token']}"}, json=payload)
    assert res2.status_code == 400
    assert "duplicate" in res2.json()["error"]["message"].lower()


def test_cross_student_log_isolation(client, setup_log_environment):
    """Test that Student 2 cannot submit for or inspect Student 1's logs."""
    today = datetime.date.today()
    env = setup_log_environment

    # Student 1 submits a log
    res_s1 = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s1_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "asana_practice",
            "duration_minutes": 60,
            "reflection_journal": "Private reflection on balance postures.",
        },
    )
    assert res_s1.status_code == 200
    s1_log_id = res_s1.json()["data"]["id"]

    # 1. Student 2 attempts to submit a log targeting Student 1's enrollment -> 403 Forbidden
    res_unauthorized_submit = client.post(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {env['s2_token']}"},
        json={
            "enrollment_id": env["e1_id"],
            "practice_date": today.isoformat(),
            "category": "anatomy",
            "duration_minutes": 60,
            "reflection_journal": "Unauthorized submission attempt.",
        },
    )
    assert res_unauthorized_submit.status_code == 403

    # 2. Student 2 attempts to inspect Student 1's log details -> 403 Forbidden
    res_unauthorized_read = client.get(
        f"/api/v1/logs/{s1_log_id}",
        headers={"Authorization": f"Bearer {env['s2_token']}"},
    )
    assert res_unauthorized_read.status_code == 403
