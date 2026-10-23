"""Standard API response envelopes for Shailja Yoga."""
from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: Optional[DataT] = None
    message: Optional[str] = "Operation completed successfully"
    error: Optional[ErrorDetail] = None

    @classmethod
    def ok(cls, data: DataT, message: str = "Operation completed successfully"):
        return cls(success=True, data=data, message=message, error=None)

    @classmethod
    def fail(cls, code: str, message: str, details: Optional[Any] = None):
        return cls(
            success=False,
            data=None,
            message=message,
            error=ErrorDetail(code=code, message=message, details=details),
        )
