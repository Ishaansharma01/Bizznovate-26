# Requirements Specification: Shailja Yoga 200-Hour TTC Verification & Hours Logger

## 1. Executive Summary & Objective
Build an integrated, enterprise-grade web platform for Shailja Yoga's certified **200-hour Yoga Teacher Training Certification (TTC)** program.

The platform encompasses five core modules:
1. **Core Hour Verification Engine:** Daily student log submissions with strict server-side business validation.
2. **Faculty Review & Progress Tracker:** Review queue for faculty, audit history, decision justifications, and calculation of verified progress.
3. **Progress Pace Monitor & Alerts:** Weekly pace calculation against target graduation dates, shortfall detection, and safe catch-up pace recommendations under daily caps.
4. **Practice Summary Generator (NLP):** Replaceable NLP interface summarizing student reflections into structured faculty briefs without altering hours or review status.
5. **Dynamic Certificate Issuance & Public Verifier:** Tamper-evident PDF certificate generation with verification codes, issuance snapshots, lifecycle management (revocation/superseding), and public verification page.

---

## 2. Non-Negotiable Business Invariants

1. **Faculty Approval Required:**
   - Certification requires at least **200 faculty-approved hours**.
   - Only approved hours count toward verified completion. `pending`, `rejected`, and `correction_requested` logs **never** count.
2. **Daily Cap:**
   - Maximum **8 hours total per student per program-local calendar day**, combining all categories and entries.
   - Concurrency protection must enforce this limit across simultaneous submissions.
3. **48-Hour Backdating Window:**
   - Logs submitted more than 48 hours after the practice date must be rejected.
   - Evaluated server-side against authoritative server submission timestamps.
4. **Rejection of Invalid Submissions:**
   - Submissions with future dates, non-positive durations (duration <= 0), unapproved categories, or unauthorized user roles must be rejected.
5. **Canonical Categories:**
   - `asana_practice` (Asana Practice)
   - `anatomy` (Anatomy)
   - `yoga_philosophy` (Yoga Philosophy)
   - `practical_teaching` (Practical Teaching)
6. **No Invented Quotas:**
   - Category distribution quotas are configurable per program. If quotas are not configured, the system must explicitly show that category distribution eligibility cannot be verified. Fixed category hour quotas must not be hardcoded.
7. **Authoritative Server Validation:**
   - The server is the single source of truth for validation, approval, progress metrics, and certification eligibility. The frontend must never dictate eligibility.
8. **Role of AI / NLP:**
   - AI summaries assist faculty reviewers. AI **never** approves hours, rejects hours, or alters certification eligibility.
   - Failure of the NLP service must never block hour logging or faculty review.
9. **Certificate Lifecycle & Idempotency:**
   - Certificates may be issued only when all completion conditions, category distribution checks, and faculty sign-offs are satisfied.
   - Certificate issuance must be idempotent; retry or concurrent attempts must never create duplicate certificates.
   - Revocation and superseding issuance must preserve complete audit trails.
10. **Data Privacy in Public Verification:**
    - The public certificate verifier must only reveal approved public fields (e.g., Certificate ID, graduate name [subject to policy], program name, completion date, approved hours total, category totals, issue date, status).
    - Private student reflections, emails, phone numbers, internal faculty notes, and raw logs must **never** be exposed.

---

## 3. System Roles & Access Control
- **Student:** Can submit daily logs for enrolled programs, view own logs, view own verified progress and pace warnings. Cannot approve own logs or access other students' logs.
- **Faculty:** Can view the pending review queue for assigned programs, approve/reject/request corrections on logs with mandatory feedback, view AI practice summaries, and complete final certification sign-offs.
- **Administrator:** Can configure programs, configure category quotas, manage enrollments, manage users and roles, and view system audit logs.
- **Certificate Issuer:** Authorized role (Administrator or designated Lead Faculty) who can trigger final certificate issuance and manage revocation/superseding actions.

---

## 4. Open Product Decisions & Implementation Policies

| Decision Item | Problem Statement Context | Implementation Policy in Codebase |
| :--- | :--- | :--- |
| **Category Quotas** | Not specified in problem statement. | Configurable per program via `category_quotas` JSON. Until configured and approved, category eligibility status returns `CONFIGURATION_REQUIRED`. |
| **48-Hour Boundary** | Boundary interpretation (elapsed hours vs calendar days) unspecified. | Implemented via `BACKDATING_BOUNDARY_POLICY` (`elapsed_hours` [default: 48.0 hrs from practice date/time] vs `calendar_days` [within 2 calendar days]). |
| **Authoritative Timezone** | Program timezone dictates calendar day boundaries. | Configurable per program (default `Asia/Kolkata`). All database timestamps stored in UTC; day boundary evaluated in program timezone. |
| **Attendance Evidence** | Problem notes timestamps do not prove physical attendance. | Schema supports optional `session_start_time`, `session_end_time`, and reflection journal. Duration in minutes is the primary authoritative unit. |
| **Faculty Sign-Off Policy** | Requirement for single vs dual sign-off. | Configurable policy: Requires faculty approval of all logs + explicit final program completion sign-off flag by authorized faculty. |
| **Public Name Disclosure** | Privacy of student name on public verification. | Configurable disclosure flag `is_public_name_visible` on enrollment/certificate. Default: True (displays full graduate name). |
| **Digital Signature Method** | Signature format on PDF certificates. | Supports cryptographic verification hash, SHA-256 integrity digest, and QR code pointing to `/verify/{certificate_id}`. Real private keys must be provided via environment variables. |
| **Pace Warning Thresholds** | Frequency & shortfall trigger. | Configurable threshold (default: shortfall >= 10 approved hours behind linear pace). Configurable catch-up calculation capped at 8 hrs/day. |
