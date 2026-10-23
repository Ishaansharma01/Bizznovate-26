"""Tests for authentication and role-based access control."""
import pytest
from app.models.models import User
from app.models.enums import RoleEnum
from app.core.security import get_password_hash


@pytest.fixture
def test_users(db_session):
    """Seed test users in isolated test database."""
    users = [
        User(
            email="admin_test@shailjayoga.com",
            hashed_password=get_password_hash("TestPass123!"),
            full_name="Admin Test",
            role=RoleEnum.ADMIN,
            is_active=True,
        ),
        User(
            email="student_test@shailjayoga.com",
            hashed_password=get_password_hash("TestPass123!"),
            full_name="Student Test",
            role=RoleEnum.STUDENT,
            is_active=True,
        ),
        User(
            email="inactive_test@shailjayoga.com",
            hashed_password=get_password_hash("TestPass123!"),
            full_name="Inactive User",
            role=RoleEnum.STUDENT,
            is_active=False,
        ),
    ]
    for u in users:
        db_session.add(u)
    db_session.commit()
    return users


def test_login_success(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "student_test@shailjayoga.com", "password": "TestPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"
    assert data["data"]["user"]["email"] == "student_test@shailjayoga.com"
    assert data["data"]["user"]["role"] == "student"


def test_login_invalid_password(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "student_test@shailjayoga.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_login_nonexistent_user(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@shailjayoga.com", "password": "SomePassword123!"},
    )
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_login_inactive_user(client, test_users):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "inactive_test@shailjayoga.com", "password": "TestPass123!"},
    )
    assert response.status_code == 403
    assert response.json()["success"] is False


def test_get_me_authenticated(client, test_users):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "student_test@shailjayoga.com", "password": "TestPass123!"},
    )
    token = login_res.json()["data"]["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "student_test@shailjayoga.com"


def test_get_me_unauthenticated(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_tampered_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.tampered.token"},
    )
    assert response.status_code == 401
    assert response.json()["success"] is False
