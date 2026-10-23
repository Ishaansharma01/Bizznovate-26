"""Custom exceptions and centralized error handling."""
from typing import Any, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.schemas.response import ApiResponse


class ShailjaYogaException(Exception):
    """Base application exception."""
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Any] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class BusinessRuleViolationException(ShailjaYogaException):
    """Raised when a core yoga certification rule is violated (e.g. daily cap, 48h limit)."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="BUSINESS_RULE_VIOLATION",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class AuthorizationException(ShailjaYogaException):
    """Raised when an unauthorized action is attempted."""
    def __init__(self, message: str = "Permission denied", details: Optional[Any] = None):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ResourceNotFoundException(ShailjaYogaException):
    """Raised when an entity is not found."""
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} '{identifier}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier},
        )


async def app_exception_handler(request: Request, exc: ShailjaYogaException):
    response = ApiResponse.fail(code=exc.code, message=exc.message, details=exc.details)
    return JSONResponse(status_code=exc.status_code, content=response.model_dump())


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    response = ApiResponse.fail(
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details=errors,
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=response.model_dump())


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code_map = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        500: "INTERNAL_SERVER_ERROR",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    response = ApiResponse.fail(code=code, message=str(exc.detail))
    return JSONResponse(status_code=exc.status_code, content=response.model_dump())


async def global_exception_handler(request: Request, exc: Exception):
    response = ApiResponse.fail(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred. Please contact system support.",
        details=str(exc) if False else None,  # Hide raw traces in prod
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=response.model_dump())
