"""Schemas for health check endpoint."""
from pydantic import BaseModel


class HealthData(BaseModel):
    status: str
    database: str
    app_name: str
    version: str
    timezone: str
    timestamp: str
