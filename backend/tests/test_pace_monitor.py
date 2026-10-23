"""Tests for Progress Pace Monitor, Infeasible Deadlines, and Shortfall Alerts."""
import datetime
import pytest
from app.models.models import User, Program, Enrollment, TrainingLog, PaceAlert
from app.models.enums import RoleEnum, CategoryEnum, LogStatusEnum, PaceStatusEnum
from app.core.security import get_password_hash
from app.services.notification_service import get_notification_provider, MockNotificationProvider


@pytest.fixture
def pace_env(client, db_session):
    """Seed program with 200 required hours, 8h/day max, and 10h shortfall warning threshold."""
    prog = Program(
        code="TTC-PACE-TEST",
        name="Pace Tracking TTC Program",
        required_hours=200.0,
        daily_max_hours=8.0,
        backdating_window_hours=48,
        timezone="Asia/Kolkata",
        pace_warning_shortfall_hours=10.0,
    )
    db_session.add(prog)
    db_session.flush()

    faculty = User(
        email="faculty_pace@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty Mentor",
        role=RoleEnum.FACULTY,
        is_active=True,
    )
    s1 = User(
        email="student_ontrack@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="On Track Student",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    s2 = User(
        email="student_behind@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Behind Student",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([faculty, s1, s2])
    db_session.flush()

    today = datetime.date.today()
    # 100 days program: started 50 days ago, finishes in 50 days (expected progress = 100h)
    e_ontrack = Enrollment(
        student_id=s1.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=50),
        target_graduation_date=today + datetime.timedelta(days=50),
        status="active",
    )
    e_behind = Enrollment(
        student_id=s2.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=50),
        target_graduation_date=today + datetime.timedelta(days=50),
        status="active",
    )
    db_session.add_all([e_ontrack, e_behind])
    db_session.commit()

    def get_token(email):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "Pass123!"})
        return res.json()["data"]["access_token"]

    return {
        "faculty_token": get_token("faculty_pace@shailjayoga.com"),
        "s1_token": get_token("student_ontrack@shailjayoga.com"),
        "s1_id": s1.id,
        "e_ontrack_id": e_ontrack.id,
        "s2_token": get_token("student_behind@shailjayoga.com"),
        "s2_id": s2.id,
        "e_behind_id": e_behind.id,
    }


def test_student_on_track_pace(client, pace_env, db_session):
    """Test student with approved hours matching expected progress is ON_TRACK."""
    env = pace_env
    today = datetime.date.today()

    # Add 110 approved hours for student 1 (expected is 100h at day 50 of 100)
    log = TrainingLog(
        enrollment_id=env["e_ontrack_id"],
        student_id=env["s1_id"],
        practice_date=today,
        category=CategoryEnum.ASANA_PRACTICE,
        duration_minutes=6600,  # 110 hours
        reflection_journal="Intensive logged hours across past weeks.",
        status=LogStatusEnum.APPROVED,
    )
    db_session.add(log)
    db_session.commit()

    res = client.get("/api/v1/alerts/me", headers={"Authorization": f"Bearer {env['s1_token']}"})
    assert res.status_code == 200
    metrics = res.json()["data"]
    assert metrics["pace_status"] == "on_track"
    assert metrics["approved_hours"] == 110.0
    assert metrics["shortfall_hours"] == 0.0
    assert metrics["is_feasible"] is True


def test_student_behind_schedule_and_alert_deduplication(client, pace_env, db_session):
    """Test student lagging behind linear pace triggers alert, and subsequent calls deduplicate."""
    env = pace_env

    # Student 2 has 0 approved hours at day 50 of 100 (expected: 100h, shortfall: 100h >= 10h threshold)
    res = client.post(
        f"/api/v1/alerts/evaluate/{env['e_behind_id']}",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["pace_status"] in ("behind", "critical_shortfall")
    assert data["alert_created"] is True
    assert data["shortfall_hours"] == 100.0

    # Verify alert row in DB
    alerts_in_db = db_session.query(PaceAlert).filter(
        PaceAlert.enrollment_id == env["e_behind_id"]
    ).all()
    assert len(alerts_in_db) == 1
    assert alerts_in_db[0].notification_sent is True

    # 2. Re-evaluating pace should DEDUPLICATE and NOT create a second alert row
    res2 = client.post(
        f"/api/v1/alerts/evaluate/{env['e_behind_id']}",
        headers={"Authorization": f"Bearer {env['faculty_token']}"},
    )
    assert res2.status_code == 200
    assert res2.json()["data"]["alert_created"] is False
    alerts_after = db_session.query(PaceAlert).filter(
        PaceAlert.enrollment_id == env["e_behind_id"]
    ).all()
    assert len(alerts_after) == 1  # Deduplicated!


def test_pending_hours_excluded_from_pace(client, pace_env, db_session):
    """Critical invariant: Pending hours must NEVER count as verified progress in pace."""
    env = pace_env
    today = datetime.date.today()

    # Student 2 submits 100 pending hours
    log = TrainingLog(
        enrollment_id=env["e_behind_id"],
        student_id=env["s2_id"],
        practice_date=today,
        category=CategoryEnum.ASANA_PRACTICE,
        duration_minutes=6000,  # 100 hours
        reflection_journal="Unapproved practice reflection.",
        status=LogStatusEnum.PENDING,  # NOT approved
    )
    db_session.add(log)
    db_session.commit()

    res = client.get("/api/v1/alerts/me", headers={"Authorization": f"Bearer {env['s2_token']}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["approved_hours"] == 0.0  # Still 0 verified hours!
    assert data["pending_hours"] == 100.0
    assert data["shortfall_hours"] == 100.0  # Still behind because pending doesn't count


def test_overdue_target_date_safe_handling(client, pace_env, db_session):
    """Test students past graduation deadline are handled safely without division by zero."""
    today = datetime.date.today()
    prog = Program(code="TTC-OVERDUE", name="Overdue Program", required_hours=200.0)
    db_session.add(prog)
    db_session.flush()

    user = User(
        email="overdue@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Overdue Student",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    # Target date was 10 days ago!
    enrollment = Enrollment(
        student_id=user.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=100),
        target_graduation_date=today - datetime.timedelta(days=10),
        status="active",
    )
    db_session.add(enrollment)
    db_session.commit()

    login_res = client.post("/api/v1/auth/login", json={"email": "overdue@shailjayoga.com", "password": "Pass123!"})
    token = login_res.json()["data"]["access_token"]

    res = client.get("/api/v1/alerts/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["pace_status"] == "overdue"
    assert data["days_remaining"] < 0
    assert data["is_feasible"] is False


def test_infeasible_catchup_respects_8_hour_daily_cap(client, pace_env, db_session):
    """Test when remaining hours cannot be completed before deadline without exceeding 8h/day, status is critical_shortfall."""
    today = datetime.date.today()
    prog = Program(code="TTC-INFEASIBLE", name="Infeasible Program", required_hours=200.0, daily_max_hours=8.0)
    db_session.add(prog)
    db_session.flush()

    user = User(
        email="infeasible@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Infeasible Student",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    # 10 days remaining with 200 hours to complete! Max possible = 10 * 8 = 80h < 200h.
    enrollment = Enrollment(
        student_id=user.id,
        program_id=prog.id,
        enrollment_date=today - datetime.timedelta(days=80),
        target_graduation_date=today + datetime.timedelta(days=10),
        status="active",
    )
    db_session.add(enrollment)
    db_session.commit()

    login_res = client.post("/api/v1/auth/login", json={"email": "infeasible@shailjayoga.com", "password": "Pass123!"})
    token = login_res.json()["data"]["access_token"]

    res = client.get("/api/v1/alerts/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["pace_status"] == "critical_shortfall"
    assert data["is_feasible"] is False
    assert data["realistic_daily_catchup_pace"] == 8.0  # Capped at 8h/day max


def test_cross_student_pace_isolation(client, pace_env):
    """Test Student 2 cannot inspect Student 1's pace metrics."""
    env = pace_env
    res = client.get(
        f"/api/v1/alerts/enrollment/{env['e_ontrack_id']}",
        headers={"Authorization": f"Bearer {env['s2_token']}"},
    )
    assert res.status_code == 403
