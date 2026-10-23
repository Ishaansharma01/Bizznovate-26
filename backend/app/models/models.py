"""SQLAlchemy ORM models for the Shailja Yoga certification system."""
import datetime
import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    Date,
    Time,
    DateTime,
    Text,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
    UniqueConstraint,
    CheckConstraint,
    Index
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import (
    CategoryEnum,
    RoleEnum,
    LogStatusEnum,
    ReviewDecisionEnum,
    CertificateStatusEnum,
    PaceStatusEnum,
)


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class User(Base):
    """User account model for Students, Faculty, Admins, and Issuers."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.STUDENT, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="student", foreign_keys="Enrollment.student_id")
    training_logs = relationship("TrainingLog", back_populates="student")
    reviews_given = relationship("LogReview", back_populates="reviewer")
    certificates = relationship("Certificate", back_populates="student", foreign_keys="Certificate.student_id")


class Program(Base):
    """Training program configuration."""
    __tablename__ = "programs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    required_hours = Column(Float, default=200.0, nullable=False)
    daily_max_hours = Column(Float, default=8.0, nullable=False)
    backdating_window_hours = Column(Integer, default=48, nullable=False)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)
    
    # Category quotas stored as JSON, e.g. {"asana_practice": 100, ...}
    # Nullable because quotas are not invented and can be configured when established
    category_quotas = Column(JSON, nullable=True)
    pace_warning_shortfall_hours = Column(Float, default=10.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="program", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="program")


class Enrollment(Base):
    """Student enrollment in a specific program."""
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_date = Column(Date, nullable=False)
    target_graduation_date = Column(Date, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, graduated, withdrawn, suspended
    is_public_name_visible = Column(Boolean, default=True, nullable=False)
    
    # Faculty sign-off for final certification
    final_faculty_signoff = Column(Boolean, default=False, nullable=False)
    final_signoff_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    final_signoff_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "program_id", name="uq_student_program_enrollment"),
    )

    # Relationships
    student = relationship("User", back_populates="enrollments", foreign_keys=[student_id])
    final_signoff_by = relationship("User", foreign_keys=[final_signoff_by_id])
    program = relationship("Program", back_populates="enrollments")
    training_logs = relationship("TrainingLog", back_populates="enrollment", cascade="all, delete-orphan")
    pace_alerts = relationship("PaceAlert", back_populates="enrollment", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="enrollment")


class TrainingLog(Base):
    """Daily training log entry submitted by a student."""
    __tablename__ = "training_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    practice_date = Column(Date, nullable=False, index=True)
    category = Column(SQLEnum(CategoryEnum), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    reflection_journal = Column(Text, nullable=False)
    session_start_time = Column(Time, nullable=True)
    session_end_time = Column(Time, nullable=True)
    status = Column(SQLEnum(LogStatusEnum), default=LogStatusEnum.PENDING, nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    is_superseded = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="chk_positive_duration_minutes"),
        Index("ix_student_practice_date", "student_id", "practice_date"),
    )

    # Relationships
    enrollment = relationship("Enrollment", back_populates="training_logs")
    student = relationship("User", back_populates="training_logs")
    reviews = relationship("LogReview", back_populates="log", cascade="all, delete-orphan")
    summary = relationship("JournalSummary", back_populates="log", uselist=False, cascade="all, delete-orphan")


class LogReview(Base):
    """Review decision recorded by faculty on a student's training log."""
    __tablename__ = "log_reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    log_id = Column(String(36), ForeignKey("training_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    decision = Column(SQLEnum(ReviewDecisionEnum), nullable=False)
    feedback_reason = Column(Text, nullable=True)  # Mandatory for REJECT and REQUEST_CORRECTION
    reviewed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    log = relationship("TrainingLog", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews_given")


class JournalSummary(Base):
    """AI-assisted practice brief generated from student's reflection journal."""
    __tablename__ = "journal_summaries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    log_id = Column(String(36), ForeignKey("training_logs.id", ondelete="CASCADE"), unique=True, nullable=False)
    key_learning = Column(Text, nullable=False)
    practice_reflection = Column(Text, nullable=False)
    topics_for_review = Column(Text, nullable=False)
    source_journal_hash = Column(String(64), nullable=False)
    is_stale = Column(Boolean, default=False, nullable=False)
    provider = Column(String(50), default="mock", nullable=False)
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    log = relationship("TrainingLog", back_populates="summary")


class Certificate(Base):
    """Issued graduation certificate and lifecycle record."""
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    certificate_id = Column(String(100), unique=True, nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="RESTRICT"), nullable=False, index=True)
    issued_by_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    completion_date = Column(Date, nullable=False)
    issue_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    status = Column(SQLEnum(CertificateStatusEnum), default=CertificateStatusEnum.ISSUED, nullable=False, index=True)
    total_approved_hours = Column(Float, nullable=False)
    category_hours_snapshot = Column(JSON, nullable=False)
    pdf_file_path = Column(String(500), nullable=False)
    signature_digest = Column(String(128), nullable=False)
    revocation_reason = Column(Text, nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    superseded_by_id = Column(String(36), ForeignKey("certificates.id"), nullable=True)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="certificates")
    student = relationship("User", back_populates="certificates", foreign_keys=[student_id])
    program = relationship("Program", back_populates="certificates")
    issued_by = relationship("User", foreign_keys=[issued_by_id])
    snapshot = relationship("CertificateSnapshot", back_populates="certificate", uselist=False, cascade="all, delete-orphan")


class CertificateSnapshot(Base):
    """Immutable public snapshot of certificate data for public verifier."""
    __tablename__ = "certificate_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    certificate_id = Column(String(36), ForeignKey("certificates.id", ondelete="CASCADE"), unique=True, nullable=False)
    public_payload = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    certificate = relationship("Certificate", back_populates="snapshot")


class AuditEvent(Base):
    """Append-only audit trail recording system transitions."""
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(50), nullable=False, index=True)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class PaceAlert(Base):
    """Pace tracking alert for students falling behind target graduation schedule."""
    __tablename__ = "pace_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    shortfall_hours = Column(Float, nullable=False)
    recommended_weekly_pace = Column(Float, nullable=False)
    status = Column(SQLEnum(PaceStatusEnum), nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    notification_sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    enrollment = relationship("Enrollment", back_populates="pace_alerts")
