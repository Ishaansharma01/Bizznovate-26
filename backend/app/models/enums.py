"""Canonical enums for Shailja Yoga certification system."""
from enum import Enum


class CategoryEnum(str, Enum):
    """Canonical training categories for the 200-hour TTC program.
    
    Internal values MUST remain invariant across database, API, and frontend.
    Display labels may be user-friendly.
    """
    ASANA_PRACTICE = "asana_practice"         # Asana Practice
    ANATOMY = "anatomy"                       # Anatomy & Physiology
    YOGA_PHILOSOPHY = "yoga_philosophy"       # Yoga Philosophy, Lifestyle & Ethics
    PRACTICAL_TEACHING = "practical_teaching" # Practical Teaching & Methodology


class RoleEnum(str, Enum):
    """User authorization roles."""
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"
    CERTIFICATE_ISSUER = "certificate_issuer"


class LogStatusEnum(str, Enum):
    """Authoritative status of a training log entry."""
    PENDING = "pending"                             # Awaiting faculty review
    APPROVED = "approved"                           # Verified by faculty; counts toward 200 hours
    REJECTED = "rejected"                           # Rejected by faculty; does not count
    CORRECTION_REQUESTED = "correction_requested"   # Returned to student for revision


class ReviewDecisionEnum(str, Enum):
    """Decisions available during faculty review."""
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CORRECTION = "request_correction"


class CertificateStatusEnum(str, Enum):
    """Lifecycle status of an issued certificate."""
    ISSUED = "issued"         # Active valid certificate
    REVOKED = "revoked"       # Revoked certificate
    SUPERSEDED = "superseded" # Replaced by an updated/corrected certificate


class PaceStatusEnum(str, Enum):
    """Progress pace evaluation status."""
    ON_TRACK = "on_track"
    BEHIND = "behind"
    CRITICAL_SHORTFALL = "critical_shortfall"
    OVERDUE = "overdue"
    COMPLETED = "completed"
