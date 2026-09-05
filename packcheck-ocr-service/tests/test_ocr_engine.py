"""
PackCheck AI - Unit Tests for OCREngineManager.
Tests singleton instantiation, image processing, polygon/text/confidence extraction,
empty matrix error handling, and thread-pool asynchronous execution.
"""

import pytest
import cv2
import numpy as np

from app.core.ocr_engine import OCREngineManager, ocr_engine, RawOCRResult, RawOCRDetection
from app.core.exceptions import OCRExecutionError


@pytest.fixture
def sample_text_image():
    """Generates a simple BGR test image with text."""
    img = np.full((150, 400, 3), 255, dtype=np.uint8)
    cv2.putText(img, "AMUL GHEE 1L", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    return img


def test_singleton_instance():
    instance1 = OCREngineManager()
    instance2 = OCREngineManager()
    assert instance1 is instance2
    assert instance1 is ocr_engine


def test_process_image_empty_matrix_raises_error():
    empty_img = np.array([], dtype=np.uint8)
    with pytest.raises(OCRExecutionError):
        ocr_engine.process_image(empty_img)


def test_process_image_returns_valid_raw_ocr_result(sample_text_image):
    result = ocr_engine.process_image(sample_text_image)
    assert isinstance(result, RawOCRResult)
    assert isinstance(result.engine_name, str)
    assert isinstance(result.engine_version, str)
    assert result.inference_time_ms >= 0.0
    assert isinstance(result.detections, list)
    assert len(result.detections) > 0


def test_raw_ocr_detection_field_types(sample_text_image):
    result = ocr_engine.process_image(sample_text_image)
    detection = result.detections[0]

    assert isinstance(detection, RawOCRDetection)
    assert isinstance(detection.text, str)
    assert len(detection.text) > 0
    assert isinstance(detection.confidence, float)
    assert 0.0 <= detection.confidence <= 1.0
    assert isinstance(detection.polygon, list)
    assert len(detection.polygon) == 4
    for point in detection.polygon:
        assert isinstance(point, tuple)
        assert len(point) == 2
        assert isinstance(point[0], float)
        assert isinstance(point[1], float)


@pytest.mark.anyio
async def test_async_process_image(sample_text_image):
    result = await ocr_engine.async_process_image(sample_text_image)
    assert isinstance(result, RawOCRResult)
    assert len(result.detections) > 0
