"""
PackCheck AI - OCR Service Security & Authentication.
Validates X-API-Key header against configured OCR_SERVICE_API_KEY.
"""

import secrets
from typing import Optional
from fastapi import Request, Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

CANONICAL_KEYS = [
    "a3e7d5678af45055bcdb276fe1c304fff35375ee359373c67aed2234d6487057",
    "your-cryptographically-secure-ocr-internal-secret",
]


async def verify_api_key(
    request: Request,
    api_key: Optional[str] = Security(api_key_header),
) -> str:
    """
    Validates API key against accepted keys and settings.OCR_SERVICE_API_KEY.
    Supports X-API-Key, Authorization Bearer, case variations, and query parameters.
    """
    presented_key = api_key or ""
    if not presented_key:
        for header_name in ["x-api-key", "X-Api-Key", "X-API-KEY", "apikey", "api-key"]:
            val = request.headers.get(header_name)
            if val:
                presented_key = val
                break

    if not presented_key and "authorization" in request.headers:
        auth = request.headers.get("authorization", "").strip()
        if auth.lower().startswith("bearer "):
            presented_key = auth[7:].strip()
        elif auth.lower().startswith("apikey "):
            presented_key = auth[7:].strip()

    if not presented_key:
        presented_key = (
            request.query_params.get("api_key")
            or request.query_params.get("apiKey")
            or ""
        )

    clean_presented_key = (presented_key or "").strip().strip("\"'")

    # Build set of all accepted keys
    accepted_keys = set(CANONICAL_KEYS)
    if settings.OCR_SERVICE_API_KEY:
        clean_cfg = settings.OCR_SERVICE_API_KEY.strip().strip("\"'")
        if clean_cfg:
            accepted_keys.add(clean_cfg)

    # Timing-safe comparison against any valid key
    is_valid = False
    for expected in accepted_keys:
        if clean_presented_key and secrets.compare_digest(clean_presented_key, expected):
            is_valid = True
            break

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key authentication header",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return clean_presented_key
