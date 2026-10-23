"""Central API v1 router definition."""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    programs,
    enrollments,
    logs,
    faculty,
    progress,
)

api_router = APIRouter(prefix="/api/v1")

# Mount endpoints
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(programs.router, prefix="/programs", tags=["Programs & Rules"])
api_router.include_router(enrollments.router, prefix="/enrollments", tags=["Enrollments"])
api_router.include_router(logs.router, prefix="/logs", tags=["Training Logs"])
api_router.include_router(faculty.router, prefix="/faculty", tags=["Faculty Review"])
api_router.include_router(progress.router, prefix="/progress", tags=["Verified Progress"])
