"""
PackCheck AI - Pydantic Schemas Package.
Exposes all request, response, and common data contracts.
"""

from .common import (
    ProcessingStatus,
    ConfidenceLevel,
    BoundingBoxTuple,
    BoundingBox,
)
from .request import (
    OCROptions,
    OCRRequest,
    OCRProcessingRequest,
)
from .response import (
    OCRTextItem,
    OCRTextBlock,
    OCRResponse,
    OCRResult,
)

__all__ = [
    "ProcessingStatus",
    "ConfidenceLevel",
    "BoundingBoxTuple",
    "BoundingBox",
    "OCROptions",
    "OCRRequest",
    "OCRProcessingRequest",
    "OCRTextItem",
    "OCRTextBlock",
    "OCRResponse",
    "OCRResult",
]
