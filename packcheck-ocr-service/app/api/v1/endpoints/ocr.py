"""
PackCheck AI - OCR Processing API Endpoint.
Receives image payload references and returns structured OCR bounding box metadata.
"""

from fastapi import APIRouter, status
from app.schemas import OCRRequest, OCRResult
from app.services.ocr_pipeline import ocr_pipeline

router = APIRouter(tags=["OCR Processing"])


@router.post(
    "/ocr",
    response_model=OCRResult,
    status_code=status.HTTP_200_OK,
    summary="Process Package Image OCR",
    description="Accepts an OCRRequest payload, fetches image, preprocesses via OpenCV, executes PaddleOCR inference, and returns canonical OCR results."
)
async def process_ocr(request: OCRRequest) -> OCRResult:
    """
    Main OCR processing endpoint.
    Orchestrates: Download -> OpenCV Preprocessing -> PaddleOCR Inference -> Result Mapping.
    """
    return await ocr_pipeline.process_ocr_request(request)
