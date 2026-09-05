"""
PackCheck AI - Unit Tests for PostprocessorService.
Tests confidence categorization, block type classification, polygon-to-bbox coordinate unscaling,
and complete mapping from RawOCRResult to OCRResult Pydantic schema contracts.
"""

import pytest
from app.core.ocr_engine import RawOCRResult, RawOCRDetection
from app.schemas.common import ConfidenceLevel, ProcessingStatus
from app.schemas.response import OCRResult, OCRTextItem, OCRTextBlock
from app.services.postprocessor import PostprocessorService, postprocessor


@pytest.fixture
def sample_raw_ocr_result():
    detection1 = RawOCRDetection(
        polygon=[(100.0, 50.0), (300.0, 50.0), (300.0, 90.0), (100.0, 90.0)],
        text="PURE GHEE 1L TIN",
        confidence=0.98,
    )
    detection2 = RawOCRDetection(
        polygon=[(105.0, 100.0), (350.0, 100.0), (350.0, 140.0), (105.0, 140.0)],
        text="MRP ₹650.00 (INCL. TAXES)",
        confidence=0.92,
    )
    return RawOCRResult(
        detections=[detection1, detection2],
        engine_name="PaddleOCR",
        engine_version="v2.7.3-PP-OCRv4",
        inference_time_ms=150.0,
    )


def test_determine_confidence_level():
    service = PostprocessorService()
    assert service.determine_confidence_level(0.95) == ConfidenceLevel.HIGH
    assert service.determine_confidence_level(0.85) == ConfidenceLevel.HIGH
    assert service.determine_confidence_level(0.84) == ConfidenceLevel.MEDIUM
    assert service.determine_confidence_level(0.60) == ConfidenceLevel.MEDIUM
    assert service.determine_confidence_level(0.59) == ConfidenceLevel.LOW
    assert service.determine_confidence_level(0.0) == ConfidenceLevel.LOW


def test_classify_block_type():
    service = PostprocessorService()
    assert service.classify_block_type("AMUL PURE GHEE") == "TEXT"
    assert service.classify_block_type("MRP ₹650.00 INCL TAXES") == "NUMERIC"
    assert service.classify_block_type("8901234567890") == "BARCODE"
    assert service.classify_block_type("NET QTY: 1L") == "NUMERIC"


def test_polygon_to_bbox_unscaling():
    service = PostprocessorService()
    polygon = [(100.0, 50.0), (300.0, 50.0), (300.0, 90.0), (100.0, 90.0)]
    scale_x = 2.0
    scale_y = 1.5

    bbox_tuple, bbox_obj, unscaled_poly = service.polygon_to_bbox(
        polygon, scale_x=scale_x, scale_y=scale_y
    )

    # Expected: x = 100*2 = 200, y = 50*1.5 = 75, w = (300-100)*2 = 400, h = (90-50)*1.5 = 60
    assert bbox_tuple == (200.0, 75.0, 400.0, 60.0)
    assert bbox_obj.x == 200.0
    assert bbox_obj.y == 75.0
    assert bbox_obj.width == 400.0
    assert bbox_obj.height == 60.0
    assert unscaled_poly[0] == (200.0, 75.0)


def test_map_to_ocr_result_full(sample_raw_ocr_result):
    result = postprocessor.map_to_ocr_result(
        raw_ocr_result=sample_raw_ocr_result,
        inspection_id="ins_12345",
        image_id="img_67890",
        scale_x=2.0,
        scale_y=2.0,
        processing_time_ms=180.5,
    )

    assert isinstance(result, OCRResult)
    assert result.inspectionId == "ins_12345"
    assert result.imageId == "img_67890"
    assert result.id == "ocr_img_67890"
    assert result.engine == "PaddleOCR"
    assert result.processingStatus == ProcessingStatus.COMPLETED

    # Verify rawText
    assert result.rawText == "PURE GHEE 1L TIN\nMRP ₹650.00 (INCL. TAXES)"

    # Verify overallConfidence mean ((0.98 + 0.92) / 2 = 0.95)
    assert result.overallConfidence == 0.95
    assert result.averageConfidence == 0.95

    # Verify detectedTextItems
    assert len(result.detectedTextItems) == 2
    item1 = result.detectedTextItems[0]
    assert item1.text == "PURE GHEE 1L TIN"
    assert item1.confidence == 0.98
    assert item1.confidenceLevel == ConfidenceLevel.HIGH
    assert item1.boundingBox == (200.0, 100.0, 400.0, 80.0)

    # Verify blocks
    assert len(result.blocks) == 2
    block1 = result.blocks[0]
    assert block1.text == "PURE GHEE 1L TIN"
    assert block1.boundingBox.x == 200.0
    assert block1.boundingBox.y == 100.0
    assert block1.boundingBox.width == 400.0
    assert block1.boundingBox.height == 80.0
    assert block1.polygonPoints[0] == (200.0, 100.0)
