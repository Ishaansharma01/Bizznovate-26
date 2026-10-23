# Shailja Yoga — Yoga Teacher Training Verification & Hours Logger

An integrated, enterprise-grade web platform for Shailja Yoga's certified **200-hour Yoga Teacher Training Certification (TTC)** program.

The platform provides an authoritative, tamper-evident system for tracking student practice hours, faculty verification, pace monitoring, AI-assisted journal briefs, and dynamic certificate issuance with public cryptographic verification.

---

## 1. Architectural Highlights

- **Backend:** FastAPI (Python 3.12+ / 3.14 compatible) with Pydantic v2 schemas and SQLAlchemy 2.0 ORM.
- **Frontend:** React 18, TypeScript, Vite.
- **Database:** PostgreSQL in staging/production; automatic SQLite fallback for standalone local development.
- **Migrations:** Alembic database version control.
- **Security:** JWT authentication with role-based access control (Student, Faculty, Admin, Certificate Issuer).
- **PDF & Cryptography:** ReportLab dynamic PDF generation with SHA-256 integrity digests and QR verification codes.
- **NLP Summaries:** Grounded practice reflection briefs behind a replaceable provider interface.

---

## 2. Canonical Business Rules

1. **200 Faculty-Approved Hours:** Certification requires at least 200 faculty-approved hours. Pending and rejected hours **never** count.
2. **8-Hour Daily Limit:** Maximum 8 hours per student per program calendar day across all 4 categories combined.
3. **48-Hour Backdating Window:** Logs submitted more than 48 hours after practice date are rejected.
4. **Canonical Categories:**
   - `asana_practice`: Asana Practice
   - `anatomy`: Anatomy & Physiology
   - `yoga_philosophy`: Yoga Philosophy & Ethics
   - `practical_teaching`: Practical Teaching & Methodology
5. **Authoritative Server:** The server alone computes eligibility, daily caps, and progress.
6. **AI Decision Support:** AI reflections assist faculty but never approve hours or determine eligibility.
7. **Privacy in Public Verifier:** The public verification page never leaks personal journals, internal notes, or raw student logs.

---

## 3. Project Directory Structure

```
├── .env.example              # Environment variables template
├── pytest.ini                # Pytest configuration
├── README.md                 # Setup, architecture and running instructions
├── docs/                     # Shared architectural & requirements documentation
│   ├── REQUIREMENTS.md       # Problem business rules and open decisions
│   ├── ARCHITECTURE.md       # Component boundaries and data flow
│   ├── API_CONTRACT.md       # Endpoint specs, standard JSON envelopes & status codes
│   ├── DATA_MODEL.md         # Database entities, relationships & canonical enums
│   └── INTEGRATION_STATUS.md # Phase execution status and test results
├── backend/                  # FastAPI backend
│   ├── alembic.ini           # Alembic database migration config
│   ├── alembic/              # Database migration versions
│   ├── requirements.txt      # Python dependencies
│   ├── app/
│   │   ├── main.py           # FastAPI entry point & CORS configuration
│   │   ├── config.py         # Pydantic settings & environment configuration
│   │   ├── database.py       # SQLAlchemy engine & session management
│   │   ├── models/           # Canonical models & enums
│   │   ├── schemas/          # Standard response envelopes & DTOs
│   │   ├── core/             # Centralized exceptions & error handling
│   │   └── api/v1/           # API v1 endpoints (Health, Auth, Logs, etc.)
│   └── tests/                # Automated pytest suite
└── frontend/                 # React + TypeScript frontend
    ├── package.json          # Node dependencies and scripts
    ├── tsconfig.json         # TypeScript compiler configuration
    ├── vite.config.ts        # Vite dev server and API proxy setup
    ├── index.html            # Application entry HTML
    └── src/
        ├── App.tsx           # Foundation dashboard & status indicator
        ├── main.tsx          # React application root
        └── services/         # API integration client
```

---

## 4. Local Setup & Execution Guide

### 4.1 Backend Setup

1. **Clone and Navigate:**
   ```bash
   cd Bizznnovate2026
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies:**
   ```bash
   python -m pip install -r backend/requirements.txt
   ```

4. **Run Database Migrations:**
   ```bash
   python -m alembic -c backend/alembic.ini upgrade head
   ```

5. **Run Automated Tests:**
   ```bash
   python -m pytest backend/tests -v
   ```

6. **Start the API Server:**
   ```bash
   python -m uvicorn app.main:app --app-dir backend --reload --port 8000
   ```
   Interactive API docs are available at `http://127.0.0.1:8000/docs`.

### 4.2 Frontend Setup

1. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   cmd /c npm install
   ```

2. **Run Frontend Development Server:**
   ```bash
   cmd /c npm run dev
   ```
   Access the frontend interface at `http://localhost:5173`.

3. **Build Frontend for Production:**
   ```bash
   cmd /c npm run build
   ```

---

## 5. Development Phases Roadmap

- [x] **Phase 0:** Repository Audit, Shared Foundation and Contracts (Completed)
- [ ] **Phase 1:** Authentication, Roles, Program Configuration and Enrollment
- [ ] **Phase 2:** Core Hour Logging and Verification Engine
- [ ] **Phase 3:** Faculty Review, Audit Trail and Verified Progress
- [ ] **Phase 4:** Progress Pace Monitor and Notifications
- [ ] **Phase 5:** Practice Summary Generator (NLP)
- [ ] **Phase 6:** Certificate Eligibility, Dynamic PDF Issuance and Lifecycle
- [ ] **Phase 7:** Public Alumni Certificate Verification
- [ ] **Phase 8:** Full Integration, Security and QA
