"""
PackCheck AI - OCR Service Application Configuration.
Uses pydantic-settings to manage environment variables cleanly.
"""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings and environment defaults."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "packcheck-ocr-service"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["*"]

    # Security settings
    ALLOW_LOCAL_FILE_ACCESS: bool = os.getenv("ALLOW_LOCAL_FILE_ACCESS", "true").lower() == "true"
    ALLOWED_HTTP_DOMAINS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    # OCR Engine & Preprocessor defaults
    USE_GPU: bool = False
    PADDLE_OCR_MODEL_VERSION: str = "v2.7.3-PP-OCRv4"
    PADDLE_OCR_LANGUAGES: List[str] = ["en"]
    MAX_IMAGE_SIZE_MB: int = 15
    MAX_IMAGE_DIMENSION: int = 3072
    MAX_DESKEW_ANGLE_DEG: float = 15.0
    NUM_OCR_WORKERS: int = max(1, os.cpu_count() or 2)


settings = Settings()
