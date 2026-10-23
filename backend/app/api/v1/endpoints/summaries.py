"""Practice summary generator endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import TrainingLog, JournalSummary, User
from app.models.enums import RoleEnum
from app.schemas.response import ApiResponse
from app.schemas.summary import JournalSummaryResponse
from app.core.security import get_current_user
from app.services.summary_service import generate_log_summary

router = APIRouter()


@router.post("/logs/{log_id}/summary", response_model=ApiResponse[JournalSummaryResponse], summary="Generate AI Practice Brief")
def create_or_regenerate_summary(
    log_id: str,
    force_regenerate: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate or refresh a structured, grounded practice brief from student journal reflection.
    
    Invariants:
    1. AI summary is strictly decision support. It NEVER approves/rejects logs or alters verified hours.
    2. Grounded strictly in trainee reflection notes.
    3. Failure of AI service does not halt review workflow.
    4. Cross-student access is prohibited.
    """
    log = db.query(TrainingLog).filter(TrainingLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training log with ID '{log_id}' not found.",
        )
    
    # Check access: student owner or faculty/admin
    if current_user.role == RoleEnum.STUDENT and log.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot generate or view summaries for another student's logs.",
        )
    
    summary = generate_log_summary(db, log.id, force_regenerate=force_regenerate)
    return ApiResponse.ok(
        data=JournalSummaryResponse.model_validate(summary),
        message="AI practice brief generated successfully.",
    )


@router.get("/logs/{log_id}/summary", response_model=ApiResponse[JournalSummaryResponse], summary="Get AI Practice Brief")
def get_log_summary(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve existing practice brief for a log (generates if not yet cached)."""
    log = db.query(TrainingLog).filter(TrainingLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training log with ID '{log_id}' not found.",
        )
    
    if current_user.role == RoleEnum.STUDENT and log.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You cannot view another student's practice summary.",
        )
    
    summary = generate_log_summary(db, log.id, force_regenerate=False)
    return ApiResponse.ok(data=JournalSummaryResponse.model_validate(summary))
