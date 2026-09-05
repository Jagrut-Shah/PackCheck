"""
PackCheck AI - Core Exception Hierarchy and Global FastAPI Exception Handlers.
Ensures errors strictly format to PackCheck ApiResponse error envelope contracts.
"""

from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.utils.logger import logger


class OCREception(Exception):
    """Base domain exception for OCR Microservice."""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ImageDownloadError(OCREception):
    """Raised when fetching image from storage fails."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="IMAGE_DOWNLOAD_FAILED",
            message=message,
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )


class InvalidImageFormatError(OCREception):
    """Raised when uploaded file is not a valid image format."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="INVALID_IMAGE_FORMAT",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class ImageTooLargeError(OCREception):
    """Raised when downloaded image exceeds maximum allowed payload size."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="IMAGE_TOO_LARGE",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class OCRExecutionError(OCREception):
    """Raised when OCR engine inference execution fails."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="OCR_INFERENCE_ERROR",
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


def format_error_response(code: str, message: str, status_code: int, details: Optional[Any] = None) -> JSONResponse:
    """Formats standard JSON error envelope matching PackCheck ApiResponse format."""
    payload: Dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details:
        payload["error"]["details"] = details

    return JSONResponse(status_code=status_code, content=payload)


async def domain_exception_handler(request: Request, exc: OCREception) -> JSONResponse:
    """Handles domain-specific OCR exceptions."""
    logger.error(
        f"Domain exception: {exc.code} - {exc.message}",
        extra={"details": exc.details}
    )
    return format_error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handles Pydantic request body validation errors."""
    logger.warning(f"Request validation error on {request.url.path}: {exc.errors()}")
    return format_error_response(
        code="INVALID_REQUEST_BODY",
        message="Request payload validation failed",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=exc.errors()
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled internal server exceptions."""
    logger.exception(f"Unhandled internal server error on {request.url.path}: {str(exc)}")
    return format_error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred during OCR processing.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details=str(exc) if request.app.debug else None
    )
