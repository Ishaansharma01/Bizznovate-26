"""Seed script to provision test users, programs, and enrollments for development."""
import os
import sys
import datetime

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models.models import User, Program, Enrollment
from app.models.enums import RoleEnum
from app.core.security import get_password_hash


def seed_database():
    """Populate database with development test data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        print("[INFO] Seeding database with development roles and test accounts...")

        users_data = [
            ("admin@shailjayoga.com", "AdminPass123!", "Master Admin", RoleEnum.ADMIN),
            ("faculty@shailjayoga.com", "FacultyPass123!", "Acharya Ramesh (Faculty)", RoleEnum.FACULTY),
            ("student1@shailjayoga.com", "StudentPass123!", "Ananya Sharma (Student 1)", RoleEnum.STUDENT),
            ("student2@shailjayoga.com", "StudentPass123!", "Dev Patel (Student 2)", RoleEnum.STUDENT),
            ("issuer@shailjayoga.com", "IssuerPass123!", "Director Shailja (Issuer)", RoleEnum.CERTIFICATE_ISSUER),
        ]

        created_users = {}
        for email, password, name, role in users_data:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                user = User(
                    email=email,
                    hashed_password=get_password_hash(password),
                    full_name=name,
                    role=role,
                    is_active=True,
                )
                db.add(user)
                db.flush()
                created_users[email] = user
                print(f"  [+] Created {role.value.upper()}: {email} (Password: {password})")
            else:
                created_users[email] = existing
                print(f"  [-] User {email} already exists")

        # 2. Seed Default Program
        prog_code = "TTC-200-2026"
        program = db.query(Program).filter(Program.code == prog_code).first()
        if not program:
            program = Program(
                code=prog_code,
                name="200-Hour Yoga Teacher Training Certification",
                required_hours=200.0,
                daily_max_hours=8.0,
                backdating_window_hours=48,
                timezone="Asia/Kolkata",
                category_quotas=None,  # Quotas intentionally unconfigured per spec
                pace_warning_shortfall_hours=10.0,
                is_active=True,
            )
            db.add(program)
            db.flush()
            print(f"  [+] Created Program: {prog_code} (200h required, 8h/day max, category_quotas=None)")
        else:
            print(f"  [-] Program {prog_code} already exists")

        # 3. Seed Enrollment for Student 1
        student1 = created_users.get("student1@shailjayoga.com")
        if student1 and program:
            existing_enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == student1.id,
                Enrollment.program_id == program.id,
            ).first()
            if not existing_enrollment:
                today = datetime.date.today()
                enrollment = Enrollment(
                    student_id=student1.id,
                    program_id=program.id,
                    enrollment_date=today - datetime.timedelta(days=30),
                    target_graduation_date=today + datetime.timedelta(days=90),
                    status="active",
                    is_public_name_visible=True,
                    final_faculty_signoff=False,
                )
                db.add(enrollment)
                print(f"  [+] Enrolled {student1.full_name} in {program.name}")
            else:
                print(f"  [-] Enrollment for {student1.full_name} already exists")

        db.commit()
        print("[SUCCESS] Database seeding complete.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
