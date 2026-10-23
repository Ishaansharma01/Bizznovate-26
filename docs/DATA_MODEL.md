# Data Model Specification: Shailja Yoga Certification Platform

## 1. Canonical Enums

### 1.1 Canonical Category Enum (`CategoryEnum`)
```python
class CategoryEnum(str, Enum):
    ASANA_PRACTICE = "asana_practice"         # Asana Practice
    ANATOMY = "anatomy"                       # Anatomy & Physiology
    YOGA_PHILOSOPHY = "yoga_philosophy"       # Yoga Philosophy, Lifestyle & Ethics
    PRACTICAL_TEACHING = "practical_teaching" # Practical Teaching & Methodology
```

### 1.2 User Roles (`RoleEnum`)
```python
class RoleEnum(str, Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"
    CERTIFICATE_ISSUER = "certificate_issuer"
```

### 1.3 Training Log Status (`LogStatusEnum`)
```python
class LogStatusEnum(str, Enum):
    PENDING = "pending"                             # Awaiting faculty review
    APPROVED = "approved"                           # Verified by faculty; counts toward 200 hours
    REJECTED = "rejected"                           # Rejected by faculty; does not count
    CORRECTION_REQUESTED = "correction_requested"   # Returned to student for correction
```

### 1.4 Review Decisions (`ReviewDecisionEnum`)
```python
class ReviewDecisionEnum(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CORRECTION = "request_correction"
```

### 1.5 Certificate Status (`CertificateStatusEnum`)
```python
class CertificateStatusEnum(str, Enum):
    ISSUED = "issued"         # Valid, active certificate
    REVOKED = "revoked"       # Revoked due to administrative/academic invalidation
    SUPERSEDED = "superseded" # Replaced by an updated/corrected certificate
```

### 1.6 Pace Status (`PaceStatusEnum`)
```python
class PaceStatusEnum(str, Enum):
    ON_TRACK = "on_track"
    BEHIND = "behind"
    CRITICAL_SHORTFALL = "critical_shortfall"
    OVERDUE = "overdue"
    COMPLETED = "completed"
```

---

## 2. Shared Relational Entities & Constraints

### 2.1 `User` (`users`)
- `id`: UUID / Integer (Primary Key)
- `email`: String (Unique, Indexed, Non-null)
- `hashed_password`: String (Non-null)
- `full_name`: String (Non-null)
- `role`: `RoleEnum` (Non-null, Default: `student`)
- `is_active`: Boolean (Default: `True`)
- `created_at`: DateTime UTC (Non-null)
- `updated_at`: DateTime UTC (Non-null)

### 2.2 `Program` (`programs`)
- `id`: UUID / Integer (Primary Key)
- `code`: String (Unique, e.g., "TTC-200-2026")
- `name`: String (e.g., "200-Hour Yoga Teacher Training Certification")
- `required_hours`: Float (Default: `200.0`)
- `daily_max_hours`: Float (Default: `8.0`)
- `backdating_window_hours`: Integer (Default: `48`)
- `timezone`: String (Default: `"Asia/Kolkata"`)
- `category_quotas`: JSON / Text (Nullable; stores dictionary like `{"asana_practice": 100, ...}`)
- `pace_warning_shortfall_hours`: Float (Default: `10.0`)
- `is_active`: Boolean (Default: `True`)
- `created_at`: DateTime UTC (Non-null)

### 2.3 `Enrollment` (`enrollments`)
- `id`: UUID / Integer (Primary Key)
- `student_id`: Foreign Key (`users.id`, Non-null)
- `program_id`: Foreign Key (`programs.id`, Non-null)
- `enrollment_date`: Date (Non-null)
- `target_graduation_date`: Date (Non-null)
- `status`: String (Enum: `active`, `graduated`, `withdrawn`, `suspended`)
- `is_public_name_visible`: Boolean (Default: `True`)
- `final_faculty_signoff`: Boolean (Default: `False`)
- `final_signoff_by_id`: Foreign Key (`users.id`, Nullable)
- `final_signoff_at`: DateTime UTC (Nullable)
- `created_at`: DateTime UTC (Non-null)
- *Constraint:* Unique constraint on `(student_id, program_id)`.

### 2.4 `TrainingLog` (`training_logs`)
- `id`: UUID / Integer (Primary Key)
- `enrollment_id`: Foreign Key (`enrollments.id`, Non-null, Indexed)
- `student_id`: Foreign Key (`users.id`, Non-null, Indexed)
- `practice_date`: Date (Non-null, Indexed)
- `category`: `CategoryEnum` (Non-null)
- `duration_minutes`: Integer (Non-null, Check: `duration_minutes > 0`)
- `reflection_journal`: Text (Non-null)
- `session_start_time`: Time (Nullable)
- `session_end_time`: Time (Nullable)
- `status`: `LogStatusEnum` (Non-null, Default: `pending`, Indexed)
- `submitted_at`: DateTime UTC (Non-null)
- `is_superseded`: Boolean (Default: `False`)
- *Check Constraint:* Duration in minutes must be positive. Daily cap evaluated at application & transactional level.

### 2.5 `LogReview` (`log_reviews`)
- `id`: UUID / Integer (Primary Key)
- `log_id`: Foreign Key (`training_logs.id`, Non-null, Indexed)
- `reviewer_id`: Foreign Key (`users.id`, Non-null)
- `decision`: `ReviewDecisionEnum` (Non-null)
- `feedback_reason`: Text (Non-null for rejection / correction)
- `reviewed_at`: DateTime UTC (Non-null)

### 2.6 `JournalSummary` (`journal_summaries`)
- `id`: UUID / Integer (Primary Key)
- `log_id`: Foreign Key (`training_logs.id`, Non-null, Unique)
- `key_learning`: Text (Non-null)
- `practice_reflection`: Text (Non-null)
- `topics_for_review`: Text (Non-null)
- `source_journal_hash`: String (SHA-256 of reflection text)
- `is_stale`: Boolean (Default: `False`)
- `provider`: String (e.g. `mock`, `gemini-1.5`, `gpt-4o`)
- `generated_at`: DateTime UTC (Non-null)

### 2.7 `Certificate` (`certificates`)
- `id`: UUID / Integer (Primary Key)
- `certificate_id`: String (Unique, Indexed, Non-null, e.g. "SY-TTC200-2026-X8A29F")
- `enrollment_id`: Foreign Key (`enrollments.id`, Non-null, Indexed)
- `student_id`: Foreign Key (`users.id`, Non-null)
- `program_id`: Foreign Key (`programs.id`, Non-null)
- `issued_by_id`: Foreign Key (`users.id`, Non-null)
- `completion_date`: Date (Non-null)
- `issue_date`: DateTime UTC (Non-null)
- `status`: `CertificateStatusEnum` (Default: `issued`)
- `total_approved_hours`: Float (Non-null)
- `category_hours_snapshot`: JSON (Non-null)
- `pdf_file_path`: String (Non-null; private storage path)
- `signature_digest`: String (SHA-256 integrity hash)
- `revocation_reason`: Text (Nullable)
- `revoked_at`: DateTime UTC (Nullable)
- `superseded_by_id`: Foreign Key (`certificates.id`, Nullable)
- *Constraint:* Idempotent issuance constraint on `(enrollment_id, status)` where status = 'issued'.

### 2.8 `CertificateSnapshot` (`certificate_snapshots`)
- `id`: UUID / Integer (Primary Key)
- `certificate_id`: Foreign Key (`certificates.id`, Non-null, Unique)
- `public_payload`: JSON (Immutable snapshot of approved public fields returned by the verifier)
- `created_at`: DateTime UTC (Non-null)

### 2.9 `AuditEvent` (`audit_events`)
- `id`: UUID / Integer (Primary Key)
- `entity_type`: String (e.g. `training_log`, `certificate`, `enrollment`)
- `entity_id`: String (Non-null)
- `actor_id`: Foreign Key (`users.id`, Nullable)
- `action`: String (e.g. `SUBMIT_LOG`, `APPROVE_LOG`, `REJECT_LOG`, `ISSUE_CERTIFICATE`, `REVOKE_CERTIFICATE`)
- `payload`: JSON (Before/After snapshot)
- `ip_address`: String (Nullable)
- `timestamp`: DateTime UTC (Non-null)

### 2.10 `PaceAlert` (`pace_alerts`)
- `id`: UUID / Integer (Primary Key)
- `enrollment_id`: Foreign Key (`enrollments.id`, Non-null, Indexed)
- `shortfall_hours`: Float (Non-null)
- `recommended_weekly_pace`: Float (Non-null)
- `status`: `PaceStatusEnum` (Non-null)
- `is_resolved`: Boolean (Default: `False`)
- `notification_sent`: Boolean (Default: `False`)
- `created_at`: DateTime UTC (Non-null)
