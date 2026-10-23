"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
from app.api.v1.router import api_router
from app.core.exceptions import (
    ShailjaYogaException,
    app_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    global_exception_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables automatically on startup for local development / testing
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="One integrated web platform for Shailja Yoga's certified 200-hour Yoga Teacher Training Certification (TTC) program.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(ShailjaYogaException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include v1 router
app.include_router(api_router)


@app.get("/", tags=["Root"])
def root_redirect():
    return {
        "message": "Welcome to Shailja Yoga 200-Hour TTC Verification API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
