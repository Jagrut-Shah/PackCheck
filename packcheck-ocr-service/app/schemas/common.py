"""
PackCheck AI - Shared Status Enums and Common Models for Python OCR Service.
Strictly mirrors lib/types/common.ts TypeScript contracts.
"""

from enum import Enum
from typing import Tuple
from pydantic import BaseModel, Field, ConfigDict


class ProcessingStatus(str, Enum):
    """Async processing pipeline stage status."""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class ConfidenceLevel(str, Enum):
    """Categorical confidence rating used across OCR, LLM, and Rules Engine."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# Canonical Bounding Box tuple: [x, y, width, height]
BoundingBoxTuple = Tuple[float, float, float, float]


class BoundingBox(BaseModel):
    """Object representation of bounding box (for UI rendering)."""
    model_config = ConfigDict(populate_by_name=True)

    x: float = Field(..., description="Top-left X coordinate in pixels")
    y: float = Field(..., description="Top-left Y coordinate in pixels")
    width: float = Field(..., description="Bounding box width in pixels", ge=0)
    height: float = Field(..., description="Bounding box height in pixels", ge=0)
