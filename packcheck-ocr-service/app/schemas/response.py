"""
PackCheck AI - OCR Service Outbound Response Models.
Strictly mirrors lib/types/ocr.ts OCRResponse / OCRResult / OCRTextItem TypeScript contracts.
"""

from typing import List, Optional, Union, Tuple
from pydantic import BaseModel, Field, ConfigDict
from .common import (
    ProcessingStatus,
    ConfidenceLevel,
    BoundingBoxTuple,
    BoundingBox,
)


class OCRTextItem(BaseModel):
    """
    Single detected text token/line with canonical coordinates.
    Matches OCRTextItem interface in lib/types/ocr.ts.
    """
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(
        default=None,
        description="Unique token identifier"
    )
    text: str = Field(
        ...,
        description="Extracted text string"
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0",
        ge=0.0,
        le=1.0
    )
    confidenceLevel: Optional[ConfidenceLevel] = Field(
        default=None,
        description="Categorical confidence rating (HIGH, MEDIUM, LOW)"
    )
    boundingBox: Union[BoundingBoxTuple, BoundingBox] = Field(
        ...,
        description="Canonical tuple [x, y, width, height] or object BoundingBox"
    )
    lineIndex: Optional[int] = Field(
        default=None,
        description="0-indexed line position",
        ge=0
    )
    blockType: Optional[str] = Field(
        default="TEXT",
        description="Classification: TEXT, NUMERIC, BARCODE, QR, SYMBOL"
    )


class OCRTextBlock(BaseModel):
    """
    Backwards-compatible block structure for UI bounding-box rendering.
    Matches OCRTextBlock interface in lib/types/ocr.ts.
    """
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Unique block identifier")
    text: str = Field(..., description="Extracted block text")
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidenceLevel: ConfidenceLevel = Field(...)
    boundingBox: BoundingBox = Field(...)
    polygonPoints: Optional[List[Tuple[float, float]]] = Field(
        default=None,
        description="Raw 4-corner polygon coordinates [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]"
    )
    lineNumber: Optional[int] = Field(default=None, ge=0)
    blockType: Optional[str] = Field(default="TEXT")


class OCRResponse(BaseModel):
    """
    Outbound response contract returned by the OCR service to Next.js / AI Extraction engine.
    Matches OCRResponse interface in lib/types/ocr.ts.
    """
    model_config = ConfigDict(populate_by_name=True)

    inspectionId: str = Field(..., description="Inspection aggregate UUID")
    imageId: str = Field(..., description="Target image ID")
    engine: str = Field(default="PaddleOCR", description="OCR Engine name")
    engineVersion: str = Field(default="v2.7.3-PP-OCRv4", description="Engine version string")
    processingStatus: ProcessingStatus = Field(
        default=ProcessingStatus.COMPLETED,
        description="Status: COMPLETED | FAILED"
    )
    rawText: str = Field(
        ...,
        description="Full extracted raw text concatenated with newlines"
    )
    overallConfidence: float = Field(
        ...,
        description="Mean confidence score across all tokens",
        ge=0.0,
        le=1.0
    )
    detectedTextItems: List[OCRTextItem] = Field(
        default_factory=list,
        description="List of detected text tokens/lines with canonical coordinates"
    )

    # Optional & Backwards compatibility fields matching TypeScript contract
    id: Optional[str] = Field(default=None, description="Unique OCR result ID")
    blocks: Optional[List[OCRTextBlock]] = Field(default=None, description="UI bounding box blocks")
    averageConfidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    processingTimeMs: Optional[float] = Field(default=None, ge=0.0)
    detectedLanguages: Optional[List[str]] = Field(default_factory=lambda: ["en"])
    processedAt: Optional[str] = Field(default=None, description="ISO 8601 UTC timestamp")


class OCRResult(OCRResponse):
    """
    Alias for OCRResponse ensuring backwards compatibility with UI visualizer components.
    Matches OCRResult type alias in lib/types/ocr.ts.
    """
    id: str = Field(..., description="Unique OCR result ID")
    blocks: List[OCRTextBlock] = Field(
        default_factory=list,
        description="Mandatory blocks array for UI visualization"
    )
