"""
PackCheck AI - Structured Logging Configuration.
Provides unified JSON structured logging for production observability.
"""

import sys
import logging
from typing import Any, Dict
from app.config import settings


class JSONFormatter(logging.Formatter):
    """Simple, efficient JSON log formatter without external overhead."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "service": settings.APP_NAME,
            "message": record.getMessage(),
        }

        if hasattr(record, "inspection_id"):
            log_data["inspection_id"] = getattr(record, "inspection_id")
        if hasattr(record, "image_id"):
            log_data["image_id"] = getattr(record, "image_id")
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = getattr(record, "duration_ms")

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        import json
        return json.dumps(log_data)


def setup_logger() -> logging.Logger:
    """Configures root logger with structured JSON output."""
    logger = logging.getLogger(settings.APP_NAME)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)

    return logger


logger = setup_logger()
