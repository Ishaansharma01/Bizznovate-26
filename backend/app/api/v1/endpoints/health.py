"""Health check API endpoint."""
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings
from app.schemas.response import ApiResponse
from app.schemas.health import HealthData

router = APIRouter()


@router.get("/health", response_model=ApiResponse[HealthData], summary="System Health & DB Connectivity")
def get_system_health(db: Session = Depends(get_db)):
    """Health check endpoint verifying application and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    health_info = HealthData(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        app_name=settings.APP_NAME,
        version="1.0.0",
        timezone=settings.PROGRAM_TIMEZONE,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
    return ApiResponse.ok(data=health_info, message="System is operational")
