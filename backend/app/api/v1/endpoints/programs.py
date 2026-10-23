"""Program configuration and rules endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Program, User
from app.models.enums import RoleEnum
from app.schemas.response import ApiResponse
from app.schemas.program import ProgramCreateRequest, ProgramUpdateRequest, ProgramResponse
from app.core.security import require_roles, get_current_user

router = APIRouter()


@router.get("", response_model=ApiResponse[List[ProgramResponse]], summary="List Training Programs")
def list_programs(db: Session = Depends(get_db)):
    """Retrieve all active yoga teacher training programs and their rule configurations."""
    programs = db.query(Program).filter(Program.is_active == True).all()
    results = [ProgramResponse.from_orm_model(p) for p in programs]
    return ApiResponse.ok(data=results)


@router.post("", response_model=ApiResponse[ProgramResponse], summary="Create Program (Admin only)")
def create_program(
    program_in: ProgramCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Create a new training program with required hours, daily cap, 48h limit, and optional category quotas."""
    existing = db.query(Program).filter(Program.code == program_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Program with code '{program_in.code}' already exists.",
        )
    
    new_program = Program(
        code=program_in.code.strip().upper(),
        name=program_in.name.strip(),
        required_hours=program_in.required_hours,
        daily_max_hours=program_in.daily_max_hours,
        backdating_window_hours=program_in.backdating_window_hours,
        timezone=program_in.timezone,
        category_quotas=program_in.category_quotas,
        pace_warning_shortfall_hours=program_in.pace_warning_shortfall_hours,
        is_active=True,
    )
    db.add(new_program)
    db.commit()
    db.refresh(new_program)
    
    return ApiResponse.ok(
        data=ProgramResponse.from_orm_model(new_program),
        message=f"Program '{new_program.code}' created successfully.",
    )


@router.get("/{program_id}", response_model=ApiResponse[ProgramResponse], summary="Get Program Details")
def get_program(program_id: str, db: Session = Depends(get_db)):
    """Retrieve configuration details for a specific training program."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Program with ID '{program_id}' not found.",
        )
    return ApiResponse.ok(data=ProgramResponse.from_orm_model(program))


@router.patch("/{program_id}", response_model=ApiResponse[ProgramResponse], summary="Update Program (Admin only)")
def update_program(
    program_id: str,
    program_update: ProgramUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Update program configuration parameters, including category distribution rules."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Program with ID '{program_id}' not found.",
        )
    
    update_data = program_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(program, field, value)
    
    db.commit()
    db.refresh(program)
    return ApiResponse.ok(
        data=ProgramResponse.from_orm_model(program),
        message="Program rules updated successfully.",
    )
