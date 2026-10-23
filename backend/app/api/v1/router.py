"""Central API v1 router definition."""
from fastapi import APIRouter
from app.api.v1.endpoints import health

api_router = APIRouter(prefix="/api/v1")

# Mount endpoints
api_router.include_router(health.router, tags=["Health"])
