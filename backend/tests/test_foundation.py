"""Foundation business invariants and data model tests."""
from app.config import settings
from app.models.enums import (
    CategoryEnum,
    RoleEnum,
    LogStatusEnum,
    ReviewDecisionEnum,
    CertificateStatusEnum,
    PaceStatusEnum,
)
from app.models.models import Program, User, Enrollment, TrainingLog


def test_canonical_category_codes():
    """Verify that canonical category codes strictly match non-negotiable specifications."""
    expected_categories = {
        "asana_practice",
        "anatomy",
        "yoga_philosophy",
        "practical_teaching",
    }
    actual_categories = {c.value for c in CategoryEnum}
    assert actual_categories == expected_categories


def test_log_status_enums():
    """Verify standard review lifecycle statuses."""
    expected_statuses = {"pending", "approved", "rejected", "correction_requested"}
    actual_statuses = {s.value for s in LogStatusEnum}
    assert actual_statuses == expected_statuses


def test_default_config_invariants():
    """Verify default business configuration values."""
    assert settings.DEFAULT_REQUIRED_HOURS == 200.0
    assert settings.DEFAULT_DAILY_MAX_HOURS == 8.0
    assert settings.DEFAULT_BACKDATING_WINDOW_HOURS == 48
    assert settings.PROGRAM_TIMEZONE == "Asia/Kolkata"


def test_orm_model_creation(db_session):
    """Verify ORM model creation and relational integrity in database."""
    program = Program(
        code="TTC-200-TEST",
        name="200-Hour Yoga Teacher Training",
        required_hours=200.0,
        daily_max_hours=8.0,
        backdating_window_hours=48,
        timezone="Asia/Kolkata",
    )
    db_session.add(program)
    db_session.commit()
    db_session.refresh(program)

    assert program.id is not None
    assert program.required_hours == 200.0
    assert program.category_quotas is None  # Quotas not invented
