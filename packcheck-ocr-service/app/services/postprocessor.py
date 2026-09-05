"""
PackCheck AI - OCR Postprocessor & Result Mapper Service.
Transforms raw PaddleOCR output and scale factors into the canonical TypeScript-compatible
OCRResponse and OCRResult Pydantic schema contracts defined in lib/types/ocr.ts.
"""

import re
import time
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from app.core.ocr_engine import RawOCRResult, RawOCRDetection
from app.schemas.common import (
    ProcessingStatus,
    ConfidenceLevel,
    BoundingBoxTuple,
    BoundingBox,
)
from app.schemas.response import (
    OCRTextItem,
    OCRTextBlock,
    OCRResponse,
    OCRResult,
)
from app.utils.logger import logger


class PostprocessorService:
    """Postprocessing and Contract Mapping Service."""

    def determine_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Categorizes numeric float confidence into canonical ConfidenceLevel enum."""
        if confidence >= 0.85:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.60:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW

    def classify_block_type(self, text: str) -> str:
        """Classifies detected text segment as NUMERIC, BARCODE, or TEXT based on regex rules."""
        clean = text.strip()
        if not clean:
            return "TEXT"

        # Check for barcode / GTIN patterns
        if re.fullmatch(r"\d{8,14}", clean):
            return "BARCODE"

        # Check for numeric, monetary, quantity, or price patterns (e.g. ₹650.00, 1L, 500g, MRP ₹100, 1800-11-2233)
        if any(char.isdigit() for char in clean):
            if re.search(r"[₹$]|MRP|USP|\bRs\.?|\bINCL\.?\b|\bTAXES\b|\b[0-9]+[a-zA-Z%]*\b", clean, re.IGNORECASE):
                return "NUMERIC"

        return "TEXT"

    def polygon_to_bbox(
        self,
        polygon: List[tuple],
        scale_x: float = 1.0,
        scale_y: float = 1.0
    ) -> Tuple[BoundingBoxTuple, BoundingBox, List[Tuple[float, float]]]:
        """
        Re-projects polygon coordinates back to original unscaled coordinates using scale factors,
        and computes both canonical BoundingBoxTuple [x, y, w, h] and BoundingBox object.
        """
        if not polygon:
            bbox_tuple: BoundingBoxTuple = (0.0, 0.0, 0.0, 0.0)
            bbox_obj = BoundingBox(x=0.0, y=0.0, width=0.0, height=0.0)
            return bbox_tuple, bbox_obj, []

        # Re-project polygon vertices to unscaled original image coordinates
        unscaled_polygon: List[Tuple[float, float]] = [
            (round(float(pt[0]) * scale_x, 1), round(float(pt[1]) * scale_y, 1))
            for pt in polygon
        ]

        xs = [pt[0] for pt in unscaled_polygon]
        ys = [pt[1] for pt in unscaled_polygon]

        min_x = round(float(min(xs)), 1)
        min_y = round(float(min(ys)), 1)
        max_x = round(float(max(xs)), 1)
        max_y = round(float(max(ys)), 1)

        width = round(max(0.0, max_x - min_x), 1)
        height = round(max(0.0, max_y - min_y), 1)

        bbox_tuple: BoundingBoxTuple = (min_x, min_y, width, height)
        bbox_obj = BoundingBox(x=min_x, y=min_y, width=width, height=height)

        return bbox_tuple, bbox_obj, unscaled_polygon

    def map_to_ocr_result(
        self,
        raw_ocr_result: RawOCRResult,
        inspection_id: str,
        image_id: str,
        scale_x: float = 1.0,
        scale_y: float = 1.0,
        processing_time_ms: Optional[float] = None
    ) -> OCRResult:
        """
        Main Mapping Function: Converts raw PaddleOCR detection lists and scale factors
        into a fully populated, contract-compliant OCRResult Pydantic model.
        """
        start_time = time.perf_counter()

        detections = raw_ocr_result.detections or []
        detected_text_items: List[OCRTextItem] = []
        blocks: List[OCRTextBlock] = []
        raw_text_lines: List[str] = []
        total_confidence = 0.0

        for idx, det in enumerate(detections):
            text_str = det.text.strip()
            if not text_str:
                continue

            raw_text_lines.append(text_str)
            conf = round(float(det.confidence), 4)
            total_confidence += conf

            conf_level = self.determine_confidence_level(conf)
            block_type = self.classify_block_type(text_str)

            bbox_tuple, bbox_obj, unscaled_poly = self.polygon_to_bbox(
                det.polygon, scale_x=scale_x, scale_y=scale_y
            )

            item_id = f"{image_id}_item_{idx}"
            block_id = f"{image_id}_block_{idx}"

            text_item = OCRTextItem(
                id=item_id,
                text=text_str,
                confidence=conf,
                confidenceLevel=conf_level,
                boundingBox=bbox_tuple,
                lineIndex=idx,
                blockType=block_type,
            )

            text_block = OCRTextBlock(
                id=block_id,
                text=text_str,
                confidence=conf,
                confidenceLevel=conf_level,
                boundingBox=bbox_obj,
                polygonPoints=unscaled_poly,
                lineNumber=idx,
                blockType=block_type,
            )

            detected_text_items.append(text_item)
            blocks.append(text_block)

        # Compute concatenated rawText
        raw_text = "\n".join(raw_text_lines)

        # Compute overall confidence average
        item_count = len(detected_text_items)
        overall_confidence = round(total_confidence / item_count, 4) if item_count > 0 else 0.0

        total_ms = processing_time_ms if processing_time_ms is not None else raw_ocr_result.inference_time_ms
        processed_at_iso = datetime.now(timezone.utc).isoformat()

        result = OCRResult(
            inspectionId=inspection_id,
            imageId=image_id,
            id=f"ocr_{image_id}",
            engine=raw_ocr_result.engine_name,
            engineVersion=raw_ocr_result.engine_version,
            processingStatus=ProcessingStatus.COMPLETED,
            rawText=raw_text,
            overallConfidence=overall_confidence,
            averageConfidence=overall_confidence,
            detectedTextItems=detected_text_items,
            blocks=blocks,
            processingTimeMs=total_ms,
            detectedLanguages=["en"],
            processedAt=processed_at_iso,
        )

        logger.info(
            f"Mapped raw OCR detections ({len(detections)} items) to OCRResult contract (overallConfidence={overall_confidence}, text_len={len(raw_text)})",
            extra={
                "inspection_id": inspection_id,
                "image_id": image_id,
                "items_count": item_count,
                "overall_confidence": overall_confidence,
            }
        )

        return result


# Export singleton instance
postprocessor = PostprocessorService()
