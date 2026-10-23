# API Contract Specification: Shailja Yoga Certification Platform

## 1. Global API Conventions

- **Base URL Prefix:** All endpoints reside under `/api/v1`.
- **Content Type:** `application/json` (unless downloading generated PDF artifacts).
- **Date & Time Standards:**
  - Dates: ISO 8601 strings (`YYYY-MM-DD`).
  - Timestamps: ISO 8601 UTC strings (`YYYY-MM-DDTHH:MM:SS.fZ`).
- **Duration Unit:** Internally stored as integer minutes; exposed with both `duration_minutes` (int) and `duration_hours` (float) for frontend clarity.

---

## 2. Standard Response Envelopes

### 2.1 Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### 2.2 Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Log submission violates 8-hour daily limit across all categories.",
    "details": {
      "practice_date": "2026-10-23",
      "existing_hours_today": 6.5,
      "attempted_hours": 2.0,
      "daily_cap": 8.0
    }
  }
}
```

### 2.3 HTTP Status Codes
| Code | Name | Usage |
| :--- | :--- | :--- |
| `200 OK` | Standard Success | Successful retrieval or idempotent operation |
| `201 Created` | Resource Created | Successful log submission, enrollment, or certificate issuance |
| `400 Bad Request` | Business Rule Violation | Exceeding 8-hour limit, outside 48-hour window, non-positive duration |
| `401 Unauthorized` | Missing / Invalid Auth | Unauthenticated request or expired JWT |
| `403 Forbidden` | Access Denied | Student attempting faculty actions, cross-student access |
| `404 Not Found` | Resource Not Found | Unknown certificate ID, log ID, or enrollment |
| `409 Conflict` | Concurrency / Duplicate | Simultaneous duplicate submission or certificate already issued |
| `422 Unprocessable` | Schema Error | Pydantic validation failure (malformed JSON, invalid types) |
| `500 Server Error` | Internal Failure | Unexpected failure (safe sanitized error returned to client) |

---

## 3. Core Endpoints Summary

### 3.1 Health Check
- **`GET /api/v1/health`**
  - **Auth:** Public
  - **Response 200:**
    ```json
    {
      "success": true,
      "data": {
        "status": "healthy",
        "database": "connected",
        "app_name": "Shailja Yoga Hours Verification & Certification Platform",
        "version": "1.0.0",
        "timezone": "Asia/Kolkata",
        "timestamp": "2026-10-23T10:37:00Z"
      }
    }
    ```

### 3.2 Authentication (`/api/v1/auth`)
- **`POST /api/v1/auth/login`**: Authenticate user and return Bearer JWT token.
- **`POST /api/v1/auth/logout`**: Terminate session / invalidate token client-side.
- **`GET /api/v1/auth/me`**: Return currently authenticated user profile, role, and active enrollments.

### 3.3 Programs & Configuration (`/api/v1/programs`)
- **`GET /api/v1/programs`**: List active training programs.
- **`POST /api/v1/programs`** *(Admin only)*: Create program with configurable hours (default 200), daily cap (default 8), 48h window, and category quotas.
- **`GET /api/v1/programs/{program_id}`**: Get program configuration and rules.
- **`PATCH /api/v1/programs/{program_id}`** *(Admin only)*: Update program parameters (e.g. category quotas).

### 3.4 Enrollments (`/api/v1/enrollments`)
- **`POST /api/v1/enrollments`** *(Admin only)*: Enroll student into program with start and target graduation dates.
- **`GET /api/v1/enrollments/me`** *(Student)*: Retrieve caller's enrollments.

### 3.5 Training Logs (`/api/v1/logs`)
- **`POST /api/v1/logs`** *(Student)*: Submit training log.
  - **Request Body:**
    ```json
    {
      "enrollment_id": "uuid",
      "practice_date": "2026-10-22",
      "category": "asana_practice",
      "duration_minutes": 120,
      "reflection_journal": "Focused on standing alignment and pranayama transitions."
    }
    ```
  - **Validations Enforced:**
    1. Caller owns enrollment.
    2. Practice date not in future.
    3. Practice date within 48 hours of server time.
    4. Duration > 0.
    5. Existing practice on date + duration <= 8.0 hours (480 minutes).
    6. Category is one of canonical 4 values.
- **`GET /api/v1/logs/me`** *(Student)*: List caller's logs with status, category, duration, and review feedback.
- **`GET /api/v1/logs/{log_id}`** *(Student owner / Faculty / Admin)*: Detailed log view.

### 3.6 Faculty Review Queue (`/api/v1/faculty/reviews`)
- **`GET /api/v1/faculty/reviews`** *(Faculty/Admin)*: Pending queue of submitted logs with category, student name, duration, and journal.
- **`POST /api/v1/logs/{log_id}/review`** *(Faculty/Admin)*:
  - **Request Body:**
    ```json
    {
      "decision": "approve",
      "feedback_reason": "Excellent reflections on alignment and breath."
    }
    ```
  - *Invariant:* Rejection or request_correction requires non-empty `feedback_reason`.

### 3.7 Authoritative Progress (`/api/v1/progress`)
- **`GET /api/v1/progress/me`** *(Student)* / **`GET /api/v1/progress/enrollment/{enrollment_id}`** *(Faculty/Admin)*:
  - **Response 200:**
    ```json
    {
      "success": true,
      "data": {
        "required_hours": 200.0,
        "approved_hours": 142.5,
        "pending_hours": 6.0,
        "rejected_hours": 2.0,
        "remaining_hours": 57.5,
        "completion_percentage": 71.25,
        "category_totals": {
          "asana_practice": 60.0,
          "anatomy": 30.0,
          "yoga_philosophy": 32.5,
          "practical_teaching": 20.0
        },
        "category_quotas_configured": false,
        "category_eligibility_status": "CONFIGURATION_REQUIRED"
      }
    }
    ```

### 3.8 Pace Monitor & Alerts (`/api/v1/alerts`)
- **`GET /api/v1/alerts/me`** *(Student)*: Returns pace status, days remaining, required weekly pace, expected cumulative progress, shortfall, and safe catch-up pace (capped at 8h/day).

### 3.9 Journal Summarization (`/api/v1/logs/{log_id}/summary`)
- **`GET /api/v1/logs/{log_id}/summary`** *(Faculty/Admin)*: Returns structured AI summary (`key_learning`, `practice_reflection`, `topics_for_review`). Does not alter verified hours or status.

### 3.10 Certificates & Lifecycle (/api/v1/certificates)
- **GET /api/v1/certificates/eligibility/{enrollment_id}** *(Student [self] / Faculty / Admin / Issuer)*:
  - Authoritative evaluation of all 6 non-negotiable graduation certification criteria:
    1. Minimum 200 approved hours (or configured program requirement).
    2. Satisfied category distribution quotas (blocks with CONFIGURATION_REQUIRED if unconfigured).
    3. Zero unresolved logs (no pending or correction_requested submissions).
    4. Mandatory faculty final sign-off completed.
    5. Active student account and active program standing.
    6. No existing active certificate (prevents duplicate generation).
- **POST /api/v1/certificates/issue** *(Certificate Issuer / Admin)*:
  - Idempotently creates certificate, computes HMAC-SHA256 tamper-evident digest, renders high-resolution landscape PDF with QR code, inserts immutable public snapshot, marks enrollment as graduated, and logs an audit event.
- **GET /api/v1/certificates/{certificate_id}** *(Student [self] / Faculty / Admin / Issuer)*:
  - Retrieve detailed certificate record and status. Cross-student access blocked with HTTP 403.
- **GET /api/v1/certificates/{certificate_id}/download** *(Student [self] / Faculty / Admin / Issuer)*:
  - Streams official certificate PDF file. Private server filesystem paths are never leaked to client.
- **POST /api/v1/certificates/{certificate_id}/revoke** *(Certificate Issuer / Admin)*:
  - Revokes active certificate with mandatory reason tracking (min 5 chars). Updates snapshot and preserves historical audit records.
- **POST /api/v1/certificates/{certificate_id}/supersede** *(Certificate Issuer / Admin)*:
  - Retires prior certificate (SUPERSEDED status) and generates a corrected replacement certificate (ISSUED status) linked to the original.
- **GET /api/v1/certificates/enrollment/{enrollment_id}** *(Student [self] / Faculty / Admin / Issuer)*:
  - List all active, revoked, and superseded certificates for an enrollment.

### 3.11 Public Verification (`/api/v1/public/certificates/{certificate_id}`)
- **`GET /api/v1/public/certificates/{certificate_id}`**
  - **Auth:** Public
  - **Response 200 (Verified):**
    ```json
    {
      "success": true,
      "data": {
        "is_verified": true,
        "certificate_id": "SY-TTC200-2026-X8A29F",
        "student_name": "Priya Sharma",
        "program_name": "200-Hour Yoga Teacher Training Certification",
        "completion_date": "2026-10-20",
        "issue_date": "2026-10-21T09:30:00Z",
        "status": "issued",
        "total_approved_hours": 200.0,
        "category_hours": {
          "asana_practice": 100.0,
          "anatomy": 40.0,
          "yoga_philosophy": 30.0,
          "practical_teaching": 30.0
        }
      }
    }
    ```
  - *Privacy Protection:* No private journals, emails, phone numbers, or faculty review notes are ever exposed.
