"""
PackCheck AI - OCR Service Security & Authentication.
Validates X-API-Key header against configured OCR_SERVICE_API_KEY.
"""

import secrets
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Validates X-API-Key header against settings.OCR_SERVICE_API_KEY.
    Raises 401 Unauthorized if invalid or missing using timing-safe comparison.
    """
    expected_key = settings.OCR_SERVICE_API_KEY
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OCR service API key is not configured on server",
        )

    if not api_key or not secrets.compare_digest(api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key authentication header",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return api_key
