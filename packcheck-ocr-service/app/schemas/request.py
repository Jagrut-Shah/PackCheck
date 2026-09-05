"""
PackCheck AI - OCR Service Inbound Request Models.
Strictly mirrors lib/types/ocr.ts OCRRequest / OCRProcessingRequest TypeScript contracts.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class OCROptions(BaseModel):
    """Computer vision preprocessing and language options."""
    model_config = ConfigDict(populate_by_name=True)

    deskew: Optional[bool] = Field(
        default=True,
        description="Whether to perform OpenCV image rotation deskewing pre-step"
    )
    denoise: Optional[bool] = Field(
        default=True,
        description="Whether to perform OpenCV bilateral noise filter"
    )
    contrastEnhancement: Optional[bool] = Field(
        default=True,
        description="Whether to apply CLAHE contrast enhancement"
    )
    languages: Optional[List[str]] = Field(
        default_factory=lambda: ["en"],
        description="Target languages for PaddleOCR text detection"
    )


class OCRRequest(BaseModel):
    """
    Inbound request payload contract sent by Next.js backend to OCR microservice.
    Matches OCRRequest interface in lib/types/ocr.ts.
    """
    model_config = ConfigDict(populate_by_name=True)

    inspectionId: str = Field(
        ...,
        description="Unique inspection aggregate UUID",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    imageId: str = Field(
        ...,
        description="Unique image identifier or filename",
        examples=["img_1725530000_0"]
    )
    imageLocation: str = Field(
        ...,
        description="Public HTTP URL (e.g. Supabase Storage) or accessible file path",
        examples=["https://project.supabase.co/storage/v1/object/public/product-images/1725530000_0_pouch.jpg"]
    )
    options: Optional[OCROptions] = Field(
        default_factory=OCROptions,
        description="Preprocessing and language parameters"
    )


# Alias for backward compatibility matching lib/types/ocr.ts
OCRProcessingRequest = OCRRequest
