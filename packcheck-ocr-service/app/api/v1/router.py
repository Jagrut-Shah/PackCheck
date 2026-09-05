"""
PackCheck AI - API Router Aggregator.
Combines all endpoints under the /api/v1 prefix and root paths.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import health, ocr

api_router = APIRouter()

# Register health check probe
api_router.include_router(health.router)

# Register OCR processing route
api_router.include_router(ocr.router)
