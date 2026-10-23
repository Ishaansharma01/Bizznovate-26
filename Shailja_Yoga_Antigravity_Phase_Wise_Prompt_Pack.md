  # Problem 23 — Shailja Yoga
## Antigravity Phase-Wise Development Prompt Pack

**Purpose:** This document divides the complete Shailja Yoga Yoga Teacher Training Verification and Hours Logger into coordinated phases. Each phase includes a copy-ready prompt for Google Antigravity. The prompts are designed to be assigned to different teammates while keeping the whole application connected.

**Important:** These are implementation prompts, not permission to invent requirements. The original problem statement and the shared project contract in this document are the source of truth.

---

# 1. Project objective

Build one integrated web platform for Shailja Yoga's certified **200-hour Yoga Teacher Training Certification (TTC)** program.

The platform must include:

1. Core Hour Verification Engine
2. Progress Pace Monitor
3. Practice Summary Generator
4. Public Alumni Certificate Verifier
5. Dynamic Certificate Exporter

Supporting requirements include authentication, roles and permissions, enrollment, configurable program rules, faculty review, audit history, notifications, security, error handling, and testing.

## 1.1 Non-negotiable business rules

- Certification requires at least **200 faculty-approved hours**.
- Only approved hours count as verified hours. Pending and rejected hours do not count.
- The daily limit is **8 hours total per student per program-local calendar day**, across all categories and entries combined.
- Entries submitted more than **48 hours after the practice date** must be rejected. The product owner must confirm whether the 48-hour boundary is elapsed-time based or calendar-day based. Implement the boundary as a clearly named, configurable policy; document the selected default.
- Reject future-dated entries, non-positive durations, invalid categories, and unauthorized submissions.
- The four core categories are:
  - `asana_practice` — Asana Practice
  - `anatomy` — Anatomy
  - `yoga_philosophy` — Yoga Philosophy
  - `practical_teaching` — Practical Teaching
- Category quotas were not specified in the problem statement. Do not invent or hard-code quotas. Make them configurable per program. Until quotas are configured and approved, the system must clearly indicate that category-distribution eligibility cannot be fully verified.
- Faculty must review submitted valid logs before hours count.
- The server, not the frontend, is authoritative for validation, approval, progress, and certificate eligibility.
- AI summaries assist faculty; they never approve hours or determine certification eligibility.
- Certificates may be issued only after all required completion conditions and sign-offs are satisfied.
- Certificate issuance must be idempotent and auditable.
- Public certificate verification must not reveal private journals, contact details, internal faculty notes, or the complete private log history.
- Certificate corrections, revocations, and superseding issuance must preserve the audit trail.
- Timestamps and audit logs improve accountability but do not independently prove physical attendance.

## 1.2 Agreed technical direction

Use the following stack unless the existing repository already has a functioning, documented equivalent. Do not replace a working stack just for preference.

- **Frontend:** React + TypeScript
- **Backend:** Python + FastAPI + Pydantic
- **Database:** PostgreSQL
- **ORM/migrations:** SQLAlchemy + Alembic
- **Authentication:** secure session or token-based authentication, with server-side role authorization
- **NLP:** a replaceable summarization-service interface
- **PDF generation:** ReportLab or another existing, suitable template-based PDF library
- **Background jobs:** a suitable job runner or scheduler for pace checks, notifications, and retries
- **Storage:** private storage for certificate artifacts; do not expose private file paths
- **API style:** REST JSON APIs under a consistent `/api/v1` prefix
- **Testing:** backend unit/integration tests and frontend tests for important workflows

If the repository already has a compatible structure, inspect and reuse it. Do not create a second frontend, backend, database, or competing implementation.

---

# 2. How the team should work

## 2.1 One shared repository

All teammates must work in the same Git repository and use the same agreed project structure. Each teammate should use a separate feature branch and merge through review. Do not let multiple Antigravity agents independently rewrite shared files on the main branch.

Recommended branches:

- `main` — stable, integrated application
- `feature/foundation-auth`
- `feature/hour-logging`
- `feature/faculty-review`
- `feature/progress-monitor`
- `feature/journal-summary`
- `feature/certificates`
- `feature/public-verification`
- `feature/integration-qa`

Adapt names to the team's actual workflow.

## 2.2 Required shared project documents

Create and maintain these files in the repository:

- `README.md` — setup, architecture, environment variables, run and test commands
- `docs/REQUIREMENTS.md` — this problem's business rules and confirmed open decisions
- `docs/ARCHITECTURE.md` — component boundaries and data flow
- `docs/API_CONTRACT.md` — endpoint, request, response, and error contracts
- `docs/DATA_MODEL.md` — shared entities, relationships, enums, and constraints
- `docs/INTEGRATION_STATUS.md` — phase status, implemented features, blockers, and test results
- `.env.example` — names and safe placeholders for required configuration; never real secrets

If these files already exist, update them instead of creating conflicting duplicates.

## 2.3 Rules for every teammate

Every phase prompt must follow these rules:

1. Inspect the current repository before coding. Identify the existing stack, file structure, current implementation, and tests.
2. Read `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, and `docs/DATA_MODEL.md` before implementing dependent functionality. If a document does not yet exist, create it only as part of the foundation phase or ask the integration lead to establish the contract.
3. Implement the assigned phase in the existing application. Do not create a standalone demo or unrelated application.
4. Preserve existing working features and avoid unnecessary rewrites.
5. Reuse shared database models, authentication, API response conventions, UI components, and error handling.
6. Do not silently change shared API contracts or database models. Propose a documented change and coordinate it with the integration lead.
7. Do not create mock data as a substitute for a working feature. Development seed data may be provided separately and clearly marked.
8. Never put credentials, API keys, signing keys, or secrets in source code or commit them to Git.
9. Enforce security-sensitive rules on the server, not only in the UI.
10. Add or update tests for every significant business rule.
11. Run the available tests, type checks, linting, and build commands. Report actual results; never claim a check passed if it was not run.
12. Update the documentation and `docs/INTEGRATION_STATUS.md`.
13. End with a handoff report listing changed files, implemented behavior, APIs/data models added or changed, tests run and results, environment requirements, known limitations, and the next phase's dependencies.
14. If a business rule is unspecified, do not invent a hard-coded answer. Document it as an open decision and implement a safe configurable policy where possible.
15. Do not mark a phase complete while leaving buttons inert, forms disconnected, endpoints unimplemented, or important paths as TODO placeholders.

---

# 3. Recommended phase division and team allocation

The phase order below minimizes conflicts. Some phases can be developed in parallel only after the shared contracts and foundation have been merged.

| Phase | Name | Main owner | Depends on | Main deliverable |
|---|---|---|---|---|
| 0 | Repository audit and shared foundation | Integration lead | None | Project structure, contracts, base app, database and setup |
| 1 | Authentication, roles, programs and enrollment | Teammate A | Phase 0 | Secure access, program rules, student enrollment |
| 2 | Core hour logging and validation engine | Teammate B | Phases 0–1 | Daily logs, server-side rules, pending queue |
| 3 | Faculty review and verified progress | Teammate C | Phases 0–2 | Review queue, decisions, audit trail, approved totals |
| 4 | Progress pace monitor and notifications | Teammate D | Phases 0–3 | Weekly pace, expected progress, alerts |
| 5 | Practice summary generator | Teammate E | Phases 0–2; faculty UI integration after Phase 3 | Journal summarization service and faculty summary view |
| 6 | Certificate eligibility, PDF issuance and lifecycle | Teammate F | Phases 0–3; program rules from Phase 1 | Eligibility service, signed PDF workflow, issuance record |
| 7 | Public alumni certificate verification | Teammate G or certificate owner | Phase 6 contract; may build UI shell earlier | Public lookup and status verification |
| 8 | Full integration, security and QA | Integration lead + all teammates | All relevant phases | Integrated, tested, documented release |

**Team-size note:** If there are fewer teammates, combine Phases 4 and 5 or Phases 6 and 7. Do not combine ownership in a way that creates separate versions of shared models or validation rules.

**Parallel work:** Phase 5 can build its service interface and tests while Phase 3 is being completed, but it must not invent a separate log or journal schema. Phase 7 can build its public page shell while Phase 6 establishes the final certificate API contract, but it must use the agreed contract before integration.

---

# 4. Copy-ready prompts for Antigravity

Each prompt below is intended to be copied into Antigravity. Give the teammate the relevant repository branch and tell them which phase they own. The prompts refer to the shared project contract above; keep this document in the repository so every agent can read it.

---

## PHASE 0 — Repository Audit, Shared Foundation and Contracts

**Assign to:** Integration lead  
**Goal:** Establish the shared architecture and contracts before parallel implementation begins.

### Prompt to paste into Antigravity

> You are the integration lead for Problem 23: Shailja Yoga — Yoga Teacher Training Verification and Hours Logger.
>
> First inspect the entire existing repository. Do not start by generating a new app. Identify the current frontend, backend, database setup, dependencies, routes, shared components, tests, and existing functionality. Preserve useful working code.
>
> Read the project specification in `docs/REQUIREMENTS.md` if it exists. If it does not, create it using the agreed requirements from this prompt pack. The product is one integrated platform for Shailja Yoga's 200-hour TTC program with five modules: core hour verification, progress pace monitoring, journal summarization, public alumni certificate verification, and dynamic PDF certificate issuance.
>
> **Your tasks:**
>
> 1. Establish or align the repository structure for React + TypeScript, FastAPI, PostgreSQL, SQLAlchemy, Alembic, tests, and documentation. Reuse the current compatible stack if it already exists.
> 2. Create/update `README.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `docs/INTEGRATION_STATUS.md`, and `.env.example`.
> 3. Define consistent API conventions under `/api/v1`, including validation errors, authorization errors, not-found responses, pagination if needed, and a predictable JSON response format.
> 4. Define the shared entities and relationships for users, roles, programs, enrollments, training logs, log reviews, audit events, pace alerts, journal summaries, certificates, certificate snapshots, and notifications.
> 5. Define canonical category codes: `asana_practice`, `anatomy`, `yoga_philosophy`, `practical_teaching`. Display labels may be user-friendly, but internal values must be consistent.
> 6. Define common log statuses and review decisions. Avoid separate, incompatible status enums in different modules.
> 7. Define the authoritative time-zone policy and represent timestamps consistently. Record submission timestamps on the server.
> 8. Define configuration fields for required program hours (200 by default for this program), daily maximum (8 hours), backdating window (48 hours), category distribution rules, graduation dates, and pace-warning thresholds. Do not invent category quotas.
> 9. Establish safe environment-variable handling, database migrations, error handling, logging, and a test setup.
> 10. Add a minimal health-check endpoint and a minimal frontend/backend integration path only if the repository needs it.
> 11. Ensure certificate signing credentials and other secrets are never stored in source code. Add placeholders to `.env.example`, not real secrets.
> 12. Record open product decisions: category quotas; exact 48-hour boundary interpretation; program time zone/daily-cap policy; faculty final sign-off policy; attendance evidence; public name-disclosure policy; digital-signature method; pace-warning thresholds and channels.
>
> **Business invariants:** only faculty-approved hours count; the 8-hour limit is across all categories combined; logs older than the permitted 48-hour window are rejected; AI summaries never approve hours; certificate eligibility is checked on the server; public verification must not expose private journals or internal notes.
>
> **Do not** implement the five full feature modules in this phase, replace working code unnecessarily, add blockchain, or invent category quotas. Prepare the shared foundation so teammates can build against one contract.
>
> **Acceptance criteria:**
>
> - A new developer can follow the README to configure and run the project.
> - Database configuration and migrations work in the documented environment.
> - Shared models, enums, API conventions, and architecture are documented.
> - Tests and build commands are documented and runnable.
> - The integration status lists completed foundation tasks and open decisions.
>
> Run the checks that are available and report exact results. Finish with a handoff report and identify the precise contract that Phases 1–7 must follow.

---

## PHASE 1 — Authentication, Roles, Program Configuration and Enrollment

**Assign to:** Teammate A  
**Depends on:** Phase 0

### Prompt to paste into Antigravity

> Implement Phase 1 of Problem 23: Shailja Yoga — Yoga Teacher Training Verification and Hours Logger, in the existing shared repository.
>
> Before coding, inspect the repository and read `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, and `docs/DATA_MODEL.md`. Follow their contracts. Do not create a second application or duplicate shared models.
>
> **Scope:**
>
> 1. Implement secure authentication using the existing agreed approach. Provide sign-in/sign-out and any required account setup flow. Store passwords only as secure hashes if password authentication is used. Never store plain-text passwords.
> 2. Implement server-side role-based authorization for at least Student, Faculty, Administrator, and authorized Certificate Issuer roles. Enforce permissions in backend routes and services, not only by hiding frontend controls.
> 3. Implement program configuration for required hours, daily cap, backdating window, program time zone, category distribution rules, and pace-warning configuration. Default values for this problem are 200 required hours, 8 daily hours, and a 48-hour backdating window.
> 4. Make category quotas configurable. The source specification does not supply the number of hours required in each category. Do not create invented fixed quotas. If quotas are not configured, clearly show that category-distribution eligibility is not fully configured.
> 5. Implement student enrollment with program ID, enrollment date, target graduation date, and enrollment status. Validate that target dates are sensible and that the enrollment belongs to the correct program.
> 6. Provide the minimal UI needed for login and the appropriate role-specific entry points. A user must not be able to access another student's private records by changing an ID in a URL or API request.
> 7. Add authorization and validation tests, including attempts to access unauthorized roles and another student's records.
> 8. Document how an administrator and test users can be provisioned safely in development without committing production credentials.
>
> **Integration rules:** Use the shared `users`, `roles`, `programs`, and `enrollments` models and agreed API response conventions. Coordinate any schema or API changes with the integration lead. Do not implement the log engine, NLP, pace monitor, or certificates in this phase.
>
> **Acceptance criteria:**
>
> - Users can authenticate using the documented approach.
> - Roles are enforced on the server.
> - Authorized administrators can configure a program and its rules.
> - A student can be enrolled with enrollment and target graduation dates.
> - Quotas are configurable and are not invented.
> - Tests cover authentication, authorization, and enrollment validation.
> - README and integration status are updated with actual test results.
>
> Do not leave decorative buttons disconnected. Run available tests and report changed files, APIs, schema changes, setup requirements, and unresolved decisions.

---

## PHASE 2 — Core Hour Logging and Verification Engine

**Assign to:** Teammate B  
**Depends on:** Phases 0 and 1

### Prompt to paste into Antigravity

> Implement Phase 2: the Core Hour Verification Engine for Problem 23: Shailja Yoga in the existing repository.
>
> Read the shared requirements, architecture, API contract, and data model before coding. Reuse the enrollment, user, program, category, and status definitions already established. Do not create a parallel logging system.
>
> **Student logging UI:**
>
> - Create a daily training-log form with practice date, category, duration, and reflection journal.
> - Use the four canonical category codes: `asana_practice`, `anatomy`, `yoga_philosophy`, and `practical_teaching`.
> - Use a consistent duration unit, preferably integer minutes in storage, with a user-friendly hours/minutes input.
> - Show validation errors clearly and preserve form data when a recoverable error occurs.
> - Show the student's own logs with date, category, duration, status, and review feedback where authorized.
>
> **Backend validation:**
>
> 1. Confirm the authenticated user is an enrolled student in an eligible program.
> 2. Validate practice date, positive duration, category, and enrollment/program relationship.
> 3. Reject future-dated logs.
> 4. Enforce the 48-hour backdating window using the server's authoritative submission timestamp and the configured boundary policy.
> 5. Calculate the student's existing accepted/logged hours for the same program-local calendar day across all categories and entries. Reject an entry if it would exceed 8 hours total.
> 6. Detect exact duplicate submissions and suspicious repetitions. If start/end times are part of the agreed schema, detect overlapping intervals. If the schema stores only duration, do not claim all overlaps can be detected.
> 7. Save a valid submission as `pending`, not approved.
> 8. Record server-side creation and submission timestamps. Do not trust timestamps supplied by the client.
> 9. Prevent race conditions: concurrent submissions must not both pass validation if their combined total exceeds the daily cap. Use suitable transactions, locking, or another documented safe strategy.
> 10. Create audit events for important submission and correction actions using the shared audit mechanism.
>
> **Important distinctions:**
>
> - The daily cap is 8 hours across all categories combined.
> - A valid log is pending until faculty approves it.
> - Pending and rejected hours do not count as verified hours.
> - Students cannot approve their own logs or edit another student's logs.
> - Approved-log changes must use a controlled correction process and preserve history.
>
> **APIs:** Implement the endpoints needed to create a log, list the current student's logs, and retrieve authorized log details. Follow `/api/v1` and the shared error response conventions. Document request/response examples in `docs/API_CONTRACT.md`.
>
> **Tests must cover:** valid submission; future date; invalid category; zero/negative duration; more than 48 hours old; exact 48-hour boundary according to the configured policy; exactly 8 hours; attempted ninth hour across different categories; duplicate submissions; unauthorized access; and simultaneous submissions that would exceed the cap.
>
> Do not implement faculty approval, pace alerts, NLP summaries, or certificate issuance beyond the interfaces needed for future integration.
>
> Run tests and report exact results. Update `docs/INTEGRATION_STATUS.md` and provide a handoff report.

---

## PHASE 3 — Faculty Review, Audit Trail and Verified Progress

**Assign to:** Teammate C  
**Depends on:** Phases 0–2

### Prompt to paste into Antigravity

> Implement Phase 3: Faculty Review and Verified Progress for Problem 23: Shailja Yoga in the shared repository.
>
> First inspect the current implementation and read all shared contract documents. Use the same `training_logs`, users, roles, enrollments, program rules, and audit events as the logging engine. Do not create a separate log model or a different definition of verified hours.
>
> **Faculty dashboard:**
>
> 1. Build a review queue for valid logs in `pending` status, with useful filtering and pagination if appropriate.
> 2. Show practice date, student identity as permitted, category, duration, journal reflection, submission timestamp, current status, and relevant student progress.
> 3. Provide Approve, Reject, and Request Correction actions according to the agreed status model.
> 4. Require a reason when rejecting or requesting a correction.
> 5. Record the reviewer identity, decision, reason, and server-side review timestamp.
> 6. Enforce faculty authorization on the backend. Students must never be able to call a review endpoint, and faculty should only access records within their authorized scope.
> 7. Prevent unauthorized duplicate or contradictory decisions. Revalidate status when applying a review so two reviewers cannot silently overwrite each other's decision.
> 8. Preserve original values and audit history for authorized corrections. Do not silently edit approved hours.
>
> **Verified progress service:**
>
> - Calculate approved total hours from the authoritative log/review records.
> - Show pending and rejected totals separately.
> - Calculate remaining hours to the 200-hour target and percentage completed.
> - Calculate approved hours per category.
> - Never count pending or rejected entries as verified.
> - Use the same shared progress service or query logic that the pace monitor and certificate eligibility service will consume.
> - If category quotas are not configured, show category totals but do not claim distribution eligibility is satisfied.
>
> **Integration:** Publish the agreed progress response/service contract in `docs/API_CONTRACT.md`. Coordinate any schema changes with the integration lead. Ensure approval triggers the appropriate progress recalculation or invalidation mechanism.
>
> **Tests:** authorized approval; unauthorized student review attempt; rejection requires a reason; request-correction flow; duplicate/concurrent review; rejected hours excluded; pending hours excluded; approved hours included exactly once; category totals; audit record created; cross-student access blocked.
>
> Do not implement pace notifications, NLP generation, or PDF issuance in this phase. Provide the approved-hours and review-state contract those modules need.
>
> Run tests, update documentation and integration status, and provide a handoff report with changed files and exact test results.

---

## PHASE 4 — Progress Pace Monitor and Notifications

**Assign to:** Teammate D  
**Depends on:** Phases 0–3

### Prompt to paste into Antigravity

> Implement Phase 4: Progress Pace Monitor and Notifications for Problem 23: Shailja Yoga in the existing shared repository.
>
> Read the shared contract documents. Use the authoritative approved-hours service from Phase 3. Do not count pending or rejected hours as verified progress and do not duplicate or redefine the hour-verification rules.
>
> **Calculations:**
>
> - Required total hours: the configured program requirement, 200 hours by default.
> - `approved_hours`: sum of faculty-approved eligible logs.
> - `remaining_hours = max(required_hours - approved_hours, 0)`.
> - `days_remaining`: days until the student's target graduation date, following the documented date/time-zone policy.
> - When days remaining is positive, calculate `required_weekly_pace = remaining_hours / (days_remaining / 7)`.
> - Calculate expected cumulative progress using enrollment date, target graduation date, and required total hours. Compare expected progress with approved hours.
> - Handle missing dates, invalid date ranges, zero days remaining, and overdue students without division-by-zero or misleading values.
>
> **Dashboard:**
>
> - Show approved hours, pending hours separately, remaining hours, target graduation date, days remaining, required weekly pace, expected-versus-actual progress, and a projected status.
> - Show a clear warning when the student falls below a configurable threshold.
> - Include the size of the shortfall and a realistic catch-up pace that respects the 8-hour daily cap.
> - If the deadline is no longer feasible, show an overdue/infeasible state rather than a negative or infinite pace.
> - Never present a pace estimate as a guarantee of completion.
>
> **Alerts and background work:**
>
> - Implement a scheduled or event-triggered check using the existing project infrastructure.
> - Create an alert only when the configured warning condition is met.
> - Avoid sending repeated duplicate alerts for the same condition and period.
> - Track alert creation and delivery status.
> - Use the configured notification channel. If email or SMS credentials are unavailable, implement a safe provider interface and a development/test adapter; do not pretend a real message was delivered.
> - Do not put sensitive journal content into notifications.
>
> **Configurable policy:** The brief does not specify the precise “falling behind” threshold or notification frequency. Make these settings configurable and document the default chosen for development; do not represent the default as an original business requirement.
>
> **Tests:** student on pace; student behind; pending hours not counted as verified; no time remaining; invalid dates; no duplicate alerts; notification provider failure/retry; daily cap reflected in catch-up guidance; user cannot view another student's alerts.
>
> Integrate with existing models and APIs. Update documentation and integration status, run tests, and provide a handoff report with exact results.

---

## PHASE 5 — Practice Summary Generator (NLP)

**Assign to:** Teammate E  
**Depends on:** Shared foundation and Phase 2; faculty UI integration with Phase 3

### Prompt to paste into Antigravity

> Implement Phase 5: Practice Summary Generator for Problem 23: Shailja Yoga in the existing repository.
>
> Read the shared requirements, architecture, API contract, and data model. Use the existing training-log journal field. Do not create a separate journal or hour-log system.
>
> **Required behavior:**
>
> 1. Build a summarization service behind a replaceable interface so the app is not tied to one AI provider.
> 2. Accept the journal text associated with an existing training log and generate a concise, bulleted faculty brief.
> 3. Use this structure when supported by the source: Key Learning, Practice Reflection, Topics for Review.
> 4. Ground every summary point in the original journal. Do not invent learning outcomes, attendance, facts, or health observations that the student did not state.
> 5. Store the summary linked to the log, source journal version or hash, generation timestamp, and model/provider metadata where available.
> 6. If the journal changes, mark the summary stale or regenerate it according to a documented policy. Preserve the original journal.
> 7. Clearly label AI-generated content and keep faculty-authored notes separate.
> 8. Allow authorized faculty to view the summary beside the original journal.
> 9. Keep the summary optional for workflow continuity. If the NLP provider is unavailable or returns an error, preserve the journal and allow hour validation and faculty review to continue.
> 10. Protect journal content with the same access rules as the underlying log. Do not send private journals to unapproved external services.
>
> **Important:** The summarizer is decision support only. It must never approve or reject logs, change hours, or determine certification eligibility.
>
> **Provider and configuration:** Read provider credentials from environment variables. Never hard-code keys. If no provider is configured, provide a clearly labelled development/test adapter or a safe “summary unavailable” state; do not falsely claim a real AI summary was generated.
>
> **Tests:** concise summary output; source-grounding guardrails where testable; no summary available/provider error; stale summary after journal change; access control; source journal preserved; summary cannot alter log status or verified hours.
>
> Integrate with the existing faculty review view without redesigning unrelated pages. Document configuration and limitations. Update integration status, run tests, and provide a handoff report.

---

## PHASE 6 — Certificate Eligibility, Dynamic PDF Issuance and Lifecycle

**Assign to:** Teammate F  
**Depends on:** Phases 0–3

### Prompt to paste into Antigravity

> Implement Phase 6: Certificate Eligibility, Dynamic PDF Issuance, and Certificate Lifecycle for Problem 23: Shailja Yoga.
>
> Read all shared contract documents. Use the authoritative approved-hours and category-progress service from Phase 3, the program rules from Phase 1, and the shared audit mechanism. Do not create a separate source of truth for hours or category totals.
>
> **Eligibility service:**
>
> A student may become eligible only when all of these are true:
>
> 1. At least 200 eligible, faculty-approved hours have been completed, or the configured required-hours value for the program is met.
> 2. Configured category-distribution rules are satisfied. If quotas have not been configured, do not silently assume distribution requirements are met; block final certification or return a clear “configuration required” status according to the agreed policy.
> 3. No required log/review remains unresolved.
> 4. All mandatory faculty and final certification sign-offs are complete.
> 5. Student and program records are valid and eligible.
> 6. No active certificate already exists for the same program completion.
>
> Keep eligibility calculation on the server. The frontend cannot request a certificate merely by sending `hours=200`.
>
> **PDF generation:**
>
> - Generate a personalized, high-resolution PDF from a controlled template.
> - Include graduate name, program name, completion date, unique Certificate ID, authorized signatory information, and a verification code or QR code pointing to the public verification page.
> - Use ReportLab or the compatible PDF library already in the project.
> - Store the final PDF in private or controlled storage; do not expose a server file path.
> - Record the issue timestamp, completion date, approved total, approved category totals, template/version metadata, artifact reference, signature metadata, and current status.
> - Create an issuance snapshot so the public verification record can be checked against what was actually issued.
>
> **Signing and security:**
>
> - Never invent an authorized signatory or forge a real person's signature.
> - Use a configured, authorized signing method when available.
> - Do not claim that a typed name or signature image is a cryptographic digital signature.
> - Keep private signing keys outside the repository and load them through secure configuration/secrets management.
> - If signing configuration is missing, expose a clear configuration error and do not falsely label an unsigned PDF as cryptographically signed.
>
> **Idempotency and lifecycle:**
>
> - Prevent duplicate issuance on retries, simultaneous approvals, or worker restarts.
> - Use database constraints/transactions and an idempotent issuance key or equivalent mechanism.
> - Provide authorized correction, revocation, and superseding-certificate workflows.
> - Preserve previous issuance records and audit events; never silently overwrite a certificate.
> - Ensure the public verifier can later show valid, revoked, or superseded status.
>
> **Tests:** below 200 hours; 200 hours with pending logs; category rules not configured; category quota unmet; required sign-off outstanding; valid eligible student; duplicate issue request; simultaneous issuance attempts; PDF failure/retry; signing key unavailable; unauthorized issue/revoke; audit trail and snapshot integrity.
>
> Document the certificate API and public verification contract in `docs/API_CONTRACT.md`. Coordinate with the Phase 7 owner. Update integration status, run tests, and provide a handoff report.

---

## PHASE 7 — Public Alumni Certificate Verification

**Assign to:** Teammate G or Phase 6 owner  
**Depends on:** Certificate API and data contract from Phase 6

### Prompt to paste into Antigravity

> Implement Phase 7: Public Alumni Certificate Verification for Problem 23: Shailja Yoga in the existing repository.
>
> Read the shared contract documents and coordinate with the certificate owner. Use the same certificate ID, issuance snapshot, and status data created by Phase 6. Do not build a separate certificate registry or trust client-provided certificate details.
>
> **Public UI:**
>
> - Create a responsive public page where anyone can enter a Certificate ID.
> - Display a clear verified/not-verified result.
> - For a matching issued certificate, show only the approved public fields: Certificate ID, graduate name if permitted by the disclosure policy, program name, completion date, total approved hours, approved hours by category, issue date, and current status.
> - Clearly mark revoked or superseded certificates.
> - Do not expose private journals, phone numbers, email addresses, internal faculty notes, authentication details, private logs, or private file-storage paths.
> - Provide an accessible loading state, empty state, invalid-ID state, and service-error state.
> - Do not imply that an unknown certificate is valid.
>
> **Backend/security:**
>
> - Use the server-side certificate record and issuance snapshot as the source of truth.
> - Use cryptographically secure, non-sequential IDs established by the certificate service.
> - Add rate limiting and monitoring to reduce enumeration and abuse.
> - Return minimal data and avoid exposing whether unrelated private student records exist.
> - Validate and normalize the input safely.
> - Keep private certificate PDF downloads protected. If a public download is allowed, serve it through an intentional, authorized verification/download mechanism rather than exposing a storage path.
> - Ensure the displayed record matches the issued snapshot and current lifecycle status.
>
> **Integration:** Follow the Phase 6 API contract. If the certificate endpoint is not yet merged, build against the documented interface and a clearly labelled local test adapter only for development. Remove or disable the adapter in production.
>
> **Tests:** valid ID; unknown ID; malformed input; revoked certificate; superseded certificate; no leakage of private fields; rate limiting; backend unavailable; snapshot/status mismatch.
>
> Update documentation, test the full public lookup flow, update integration status, and provide a handoff report with actual test results.

---

## PHASE 8 — Integration, Security Review, End-to-End QA and Release

**Assign to:** Integration lead with all teammates  
**Depends on:** All feature phases

### Prompt to paste into Antigravity

> You are the integration lead completing Problem 23: Shailja Yoga — Yoga Teacher Training Verification and Hours Logger. Integrate the existing implementations; do not replace them with a fresh scaffold.
>
> Inspect the repository, Git branches/merged work, API contracts, database migrations, current test results, and `docs/INTEGRATION_STATUS.md`. Identify missing or conflicting implementations before changing code.
>
> **Integration tasks:**
>
> 1. Confirm there is one frontend, one backend, one authoritative database schema, one shared category enum, one shared log-status model, and one approved-hours calculation source.
> 2. Resolve API or schema mismatches with minimal changes and document them.
> 3. Confirm authentication and role-based authorization protect every private endpoint and action.
> 4. Test the end-to-end flow: administrator configures program → student is enrolled → student submits a log → validation runs → faculty reviews → approved hours update → pace monitor evaluates progress → journal summary appears for faculty → eligibility is evaluated → PDF is issued when eligible → public verifier checks the certificate.
> 5. Verify the 8-hour daily cap across categories, the 48-hour backdating rule, future-date rejection, and transaction safety under concurrent submissions.
> 6. Verify that only approved hours count; pending and rejected hours never count toward 200.
> 7. Verify category quota behavior. If quotas are not configured, show that category eligibility is not fully verified and do not falsely claim all distribution requirements are satisfied.
> 8. Verify pace calculations for on-track, behind-schedule, deadline-passed, invalid-date, and infeasible cases.
> 9. Verify the summarizer never changes review status or hours, source journals remain accessible to authorized reviewers, and provider failure does not block logging.
> 10. Verify certificate eligibility, one-time/idempotent issuance, PDF failure recovery, signature configuration, issuance snapshots, revocation/superseding behavior, and audit history.
> 11. Verify the public lookup returns minimal public fields, never leaks journals or internal data, and handles unknown, revoked, and superseded IDs.
> 12. Test frontend forms and buttons to ensure they are wired to real APIs and show loading, success, and failure states.
> 13. Run backend tests, frontend tests, lint/type checks, migrations, and production builds that the repository supports.
> 14. Review secrets handling, CORS, authentication/session settings, rate limiting, database permissions, error messages, logging, backups, and private certificate storage.
> 15. Update README setup steps, `.env.example`, architecture/API/data-model docs, and integration status. Document any feature that cannot be completed due to missing external credentials or unresolved business decisions.
>
> **Required end-to-end acceptance cases:**
>
> - A student with 199 approved hours and 5 pending hours is still at 199 verified hours and cannot be certified.
> - A student with 200 approved hours but unmet category requirements or a required sign-off cannot be certified.
> - A fully eligible student receives one certificate record and one verifiable artifact, even if the issue request is retried.
> - An unknown Certificate ID is not verified.
> - A revoked certificate is displayed as revoked.
> - Two concurrent submissions cannot exceed the daily cap.
> - Failure of the NLP provider does not prevent hour validation or faculty review.
> - Private journals and internal faculty notes are never returned by the public verifier.
>
> Do not hide failing tests or claim untested features are complete. Do not add unrelated features. Finish with a release report listing completed requirements, test commands and actual results, remaining blockers, configuration requirements, and unresolved decisions.

---

# 5. Shared API and data contract checklist

The exact endpoint names should be finalized by Phase 0, then used consistently. The following is a suggested minimum contract; adjust it only through documented team agreement.

| Area | Suggested endpoints |
|---|---|
| Authentication | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| Programs | `GET /api/v1/programs`, `POST /api/v1/programs`, `GET /api/v1/programs/{program_id}`, `PATCH /api/v1/programs/{program_id}` |
| Enrollments | `POST /api/v1/enrollments`, `GET /api/v1/enrollments/me`, authorized admin/faculty enrollment queries |
| Training logs | `POST /api/v1/logs`, `GET /api/v1/logs/me`, authorized `GET /api/v1/logs/{log_id}` |
| Faculty review | `GET /api/v1/faculty/reviews`, `POST /api/v1/logs/{log_id}/review` |
| Progress | `GET /api/v1/progress/me`, authorized student progress endpoint |
| Pace alerts | `GET /api/v1/alerts/me`, internal/scheduled pace evaluation service |
| Journal summaries | `POST /api/v1/logs/{log_id}/summary` or an agreed background-generation mechanism; `GET /api/v1/logs/{log_id}/summary` |
| Certificates | `GET /api/v1/certificates/eligibility/{enrollment_id}`, authorized issue endpoint, authorized lifecycle actions |
| Public verification | `GET /api/v1/public/certificates/{certificate_id}` |
| Health | `GET /api/v1/health` |

These are proposed names, not a reason to break an existing API. Phase 0 should finalize the contract and publish example requests, responses, status codes, and authorization requirements.

### Shared record rules

- Store duration consistently, preferably as integer minutes.
- Store timestamps in a consistent format and retain the authoritative server submission timestamp.
- Store the practice date in a way that supports the program's defined time zone and daily-cap policy.
- Use canonical category codes across frontend, backend, database, tests, and reports.
- Derive approved hours from authoritative approved log records, not a freely editable total field.
- Store certificate issuance snapshots separately from mutable current progress.
- Record who made review, correction, revocation, and administrative changes.
- Never expose internal database IDs or private fields unnecessarily in the public verification response.

---

# 6. Shared definition of done for every phase

A phase is **not complete** just because a page looks finished. The owner must provide all of the following:

- [ ] Feature implemented in the existing shared application.
- [ ] Shared API and data contracts followed.
- [ ] Server-side authorization and validation added where needed.
- [ ] Loading, empty, success, and error states handled for relevant UI flows.
- [ ] Tests added for the important happy path and failure/security cases.
- [ ] Tests/build/lint commands run, with actual results documented.
- [ ] No secrets committed; required configuration documented.
- [ ] No important button, form, or endpoint left as a nonfunctional placeholder.
- [ ] Relevant README/docs updated.
- [ ] `docs/INTEGRATION_STATUS.md` updated.
- [ ] Handoff report lists changed files, API/schema changes, tests and results, blockers, and next-phase dependencies.
- [ ] Changes committed to the assigned feature branch and submitted for integration review.

---

# 7. Integration sequence and handoff rules

1. **Phase 0 merges first.** No teammate should invent their own schemas or API conventions.
2. **Phase 1 merges next.** Enrollment and program configuration are prerequisites for trustworthy logs.
3. **Phase 2 merges before Phase 3.** Faculty review must use the real shared log model.
4. **Phase 3 provides the authoritative approved-hours service.** Pace and certificate modules must consume it.
5. **Phases 4 and 5 can proceed in parallel** after their required contracts are stable.
6. **Phase 6 owns certificate issuance and lifecycle rules.** Phase 7 must use its public verification contract.
7. **Phase 8 validates the whole workflow** and resolves integration defects.
8. Merge only after reviewing tests and contract changes. Do not merge conflicting migrations without reconciling them.
9. If a phase needs a new field or endpoint, its owner must propose the change in `docs/API_CONTRACT.md` or `docs/DATA_MODEL.md`, coordinate it with the integration lead, and notify affected teammates.
10. Keep a single source of truth for requirements, models, and calculations. Never let separate agents implement their own versions of “approved hours” or “certificate eligible.”

---

# 8. Open decisions to resolve with Shailja Yoga

These decisions were not fully specified in the problem statement and must not be silently invented by the development team:

1. Minimum hour quotas for Asana Practice, Anatomy, Yoga Philosophy, and Practical Teaching.
2. Whether 48 hours means elapsed time or calendar-day boundaries, including exact-boundary behavior.
3. Which time zone defines the daily 8-hour cap.
4. Whether students must provide session start/end times or other attendance evidence.
5. Whether one faculty member can approve logs and perform final certification sign-off.
6. The approved digital-signature method and authorized signatories.
7. Which graduate details can be displayed publicly.
8. The threshold and frequency for pace warnings.
9. The notification channels to use in production.
10. Record-retention and certificate-revocation policies.

Use safe, documented, configurable behavior where possible. Do not falsely present a development default as an approved business rule.

---

# 9. Final project completion checklist

The application is ready for final demonstration only when the integrated system can demonstrate all of the following:

- [ ] Secure login and role-based access.
- [ ] Program configuration and student enrollment.
- [ ] Daily log submission with date, category, duration, and reflection.
- [ ] Server-side 8-hour daily cap across all categories.
- [ ] Server-side 48-hour backdating validation.
- [ ] Future-date, invalid-duration, and invalid-category rejection.
- [ ] Pending, approved, rejected, and correction workflow as defined by the shared status model.
- [ ] Faculty review with decision reasons and audit history.
- [ ] Approved totals and category totals that remain consistent across dashboards.
- [ ] Pace calculations, behind-schedule warnings, and safe handling of overdue targets.
- [ ] Journal summaries grounded in original reflections and optional during service failure.
- [ ] Certificate eligibility based on approved hours, category rules, and sign-offs.
- [ ] Personalized PDF generation with a unique ID and verification code/QR.
- [ ] Idempotent certificate issuance and controlled revocation/correction.
- [ ] Public verification of valid, unknown, revoked, and superseded certificates.
- [ ] No leakage of private journals or internal faculty data.
- [ ] Tests for business logic, permissions, concurrency, failure handling, and full integration.
- [ ] Setup, environment variables, architecture, API contracts, and known limitations documented.

## Final instruction to the team

Build **one cohesive certification platform**. Each teammate owns a phase, but no phase is allowed to redefine the business rules, create competing data models, or work around the shared API contracts. If something is unspecified, document it and make it configurable instead of inventing a permanent rule. The integration lead is responsible for resolving contract conflicts and verifying the complete end-to-end workflow.
