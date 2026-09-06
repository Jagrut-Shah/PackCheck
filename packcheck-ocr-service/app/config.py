

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Global application settings and environment defaults."""

    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "packcheck-ocr-service"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false" if os.getenv("ENVIRONMENT") == "production" else "true").lower() == "true"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = (
        ["https://packcheck.ai"]
        if os.getenv("ENVIRONMENT") == "production"
        else ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # Security settings
    OCR_SERVICE_API_KEY: Optional[str] = os.getenv(
        "OCR_SERVICE_API_KEY",
        "a3e7d5678af45055bcdb276fe1c304fff35375ee359373c67aed2234d6487057"
    )
    ALLOW_LOCAL_FILE_ACCESS: bool = (
        os.getenv("ALLOW_LOCAL_FILE_ACCESS", "false" if os.getenv("ENVIRONMENT") == "production" else "true").lower() == "true"
    )
    ALLOWED_HTTP_DOMAINS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    # OCR Engine & Preprocessor defaults
    USE_GPU: bool = False
    PADDLE_OCR_MODEL_VERSION: str = "v2.7.3-PP-OCRv4"
    PADDLE_OCR_LANGUAGES: List[str] = ["en"]
    MAX_IMAGE_SIZE_MB: int = 15
    MAX_IMAGE_DIMENSION: int = int(os.getenv("MAX_IMAGE_DIMENSION", "1600"))
    MAX_DESKEW_ANGLE_DEG: float = 15.0
    NUM_OCR_WORKERS: int = max(1, os.cpu_count() or 2)


settings = Settings()
