"""Tests for Program configuration, configurable quotas, and student enrollment."""
import datetime
import pytest
from app.models.models import User, Program, Enrollment
from app.models.enums import RoleEnum
from app.core.security import get_password_hash


@pytest.fixture
def auth_tokens(client, db_session):
    """Create and authenticate admin, student 1, and student 2."""
    admin = User(
        email="admin_prog@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Admin User",
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    student1 = User(
        email="s1_prog@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student One",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    student2 = User(
        email="s2_prog@shailjayoga.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student Two",
        role=RoleEnum.STUDENT,
        is_active=True,
    )
    db_session.add_all([admin, student1, student2])
    db_session.commit()

    def get_token(email):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "Pass123!"})
        return res.json()["data"]["access_token"]

    return {
        "admin_token": get_token("admin_prog@shailjayoga.com"),
        "admin_id": admin.id,
        "s1_token": get_token("s1_prog@shailjayoga.com"),
        "s1_id": student1.id,
        "s2_token": get_token("s2_prog@shailjayoga.com"),
        "s2_id": student2.id,
    }


def test_program_creation_and_quota_rules(client, auth_tokens):
    # 1. Non-admin student cannot create program (403 Forbidden)
    res_student = client.post(
        "/api/v1/programs",
        headers={"Authorization": f"Bearer {auth_tokens['s1_token']}"},
        json={
            "code": "TTC-FAIL",
            "name": "Unauthorized Program",
            "required_hours": 200.0,
            "daily_max_hours": 8.0,
        },
    )
    assert res_student.status_code == 403

    # 2. Admin creates valid program without quotas (category_quotas_configured should be False)
    res_admin = client.post(
        "/api/v1/programs",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={
            "code": "TTC-200-TEST",
            "name": "200-Hour TTC Program",
            "required_hours": 200.0,
            "daily_max_hours": 8.0,
            "backdating_window_hours": 48,
            "timezone": "Asia/Kolkata",
            "category_quotas": None,
        },
    )
    assert res_admin.status_code == 200
    prog_data = res_admin.json()["data"]
    prog_id = prog_data["id"]
    assert prog_data["code"] == "TTC-200-TEST"
    assert prog_data["category_quotas_configured"] is False
    assert prog_data["category_quotas"] is None

    # 3. Reject invalid category quota key (422)
    res_invalid_quota = client.patch(
        f"/api/v1/programs/{prog_id}",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={"category_quotas": {"invented_category": 50}},
    )
    assert res_invalid_quota.status_code == 422

    # 4. Valid category quota configuration succeeds
    res_valid_quota = client.patch(
        f"/api/v1/programs/{prog_id}",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={
            "category_quotas": {
                "asana_practice": 100.0,
                "anatomy": 30.0,
                "yoga_philosophy": 35.0,
                "practical_teaching": 35.0,
            }
        },
    )
    assert res_valid_quota.status_code == 200
    updated_data = res_valid_quota.json()["data"]
    assert updated_data["category_quotas_configured"] is True
    assert updated_data["category_quotas"]["asana_practice"] == 100.0


def test_enrollment_validation_and_cross_student_isolation(client, auth_tokens):
    # Setup program
    res_prog = client.post(
        "/api/v1/programs",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={
            "code": "TTC-200-ENROLL",
            "name": "Enrollment Test Program",
            "required_hours": 200.0,
        },
    )
    prog_id = res_prog.json()["data"]["id"]

    today = datetime.date.today()

    # 1. Reject enrollment with target date preceding enrollment date (422)
    res_bad_dates = client.post(
        "/api/v1/enrollments",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={
            "student_id": auth_tokens["s1_id"],
            "program_id": prog_id,
            "enrollment_date": today.isoformat(),
            "target_graduation_date": (today - datetime.timedelta(days=10)).isoformat(),
        },
    )
    assert res_bad_dates.status_code == 422

    # 2. Valid enrollment succeeds
    res_enroll = client.post(
        "/api/v1/enrollments",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={
            "student_id": auth_tokens["s1_id"],
            "program_id": prog_id,
            "enrollment_date": today.isoformat(),
            "target_graduation_date": (today + datetime.timedelta(days=90)).isoformat(),
        },
    )
    assert res_enroll.status_code == 200
    enroll_id = res_enroll.json()["data"]["id"]
    assert res_enroll.json()["data"]["student_id"] == auth_tokens["s1_id"]

    # 3. Reject duplicate enrollment (400)
    res_dup = client.post(
        "/api/v1/enrollments",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
        json={
            "student_id": auth_tokens["s1_id"],
            "program_id": prog_id,
            "enrollment_date": today.isoformat(),
            "target_graduation_date": (today + datetime.timedelta(days=90)).isoformat(),
        },
    )
    assert res_dup.status_code == 400

    # 4. Student 1 can retrieve their own enrollment
    res_s1_me = client.get(
        "/api/v1/enrollments/me",
        headers={"Authorization": f"Bearer {auth_tokens['s1_token']}"},
    )
    assert res_s1_me.status_code == 200
    s1_enrollments = res_s1_me.json()["data"]
    assert len(s1_enrollments) == 1
    assert s1_enrollments[0]["id"] == enroll_id

    # 5. Cross-student access protection: Student 2 attempting to view Student 1's enrollment is FORBIDDEN (403)
    res_cross = client.get(
        f"/api/v1/enrollments/{enroll_id}",
        headers={"Authorization": f"Bearer {auth_tokens['s2_token']}"},
    )
    assert res_cross.status_code == 403
    assert "cross-student" in res_cross.json()["error"]["message"].lower() or "denied" in res_cross.json()["error"]["message"].lower()

    # 6. Admin can view Student 1's enrollment (200)
    res_admin_view = client.get(
        f"/api/v1/enrollments/{enroll_id}",
        headers={"Authorization": f"Bearer {auth_tokens['admin_token']}"},
    )
    assert res_admin_view.status_code == 200
    assert res_admin_view.json()["data"]["id"] == enroll_id
