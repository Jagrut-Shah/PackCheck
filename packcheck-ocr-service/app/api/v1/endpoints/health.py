"""
PackCheck AI - Health and Readiness Check Endpoint.
Used by Kubernetes probes, Docker healthchecks, and Next.js backend status monitoring.
"""

from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, status
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health check probe",
    description="Returns microservice health status, uptime readiness, and configuration flags."
)
async def health_check() -> Dict[str, Any]:
    """Returns microservice operational status."""
    return {
        "success": True,
        "data": {
            "status": "HEALTHY",
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "engine": "PaddleOCR",
            "engineVersion": settings.PADDLE_OCR_MODEL_VERSION,
            "gpuEnabled": settings.USE_GPU,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
