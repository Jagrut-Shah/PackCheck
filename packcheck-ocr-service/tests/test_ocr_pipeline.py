"""
PackCheck AI - Unit and Integration Tests for OCR Pipeline & API Endpoints.
Tests end-to-end execution flow: HTTP request -> fetch -> preprocess -> PaddleOCR -> postprocess -> HTTP response.
"""

import pytest
import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import OCRRequest, OCRResult, OCROptions
from app.services.ocr_pipeline import ocr_pipeline, OCRPipelineService

client = TestClient(app)


@pytest.fixture
def sample_local_image_file(tmp_path):
    """Generates a sample local image file for testing the pipeline."""
    img = np.full((300, 600, 3), 255, dtype=np.uint8)
    cv2.putText(img, "NET QTY: 1L", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
    cv2.putText(img, "MRP RS 450.00", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)

    file_path = tmp_path / "sample_package.jpg"
    success, buffer = cv2.imencode(".jpg", img)
    assert success
    file_path.write_bytes(buffer.tobytes())
    return str(file_path)


@pytest.mark.anyio
async def test_ocr_pipeline_end_to_end(sample_local_image_file):
    request = OCRRequest(
        inspectionId="ins_pipeline_test_001",
        imageId="img_pipeline_test_001",
        imageLocation=sample_local_image_file,
        options=OCROptions(
            deskew=True,
            denoise=True,
            contrastEnhancement=True,
        )
    )

    result = await ocr_pipeline.process_ocr_request(request)

    assert isinstance(result, OCRResult)
    assert result.inspectionId == "ins_pipeline_test_001"
    assert result.imageId == "img_pipeline_test_001"
    assert result.engine.startswith("PaddleOCR")
    assert result.processingStatus == "COMPLETED"
    assert len(result.detectedTextItems) > 0
    assert len(result.blocks) > 0
    assert result.overallConfidence >= 0.0
    assert result.processingTimeMs > 0.0


def test_post_ocr_api_endpoint_success(sample_local_image_file):
    payload = {
        "inspectionId": "ins_api_test_001",
        "imageId": "img_api_test_001",
        "imageLocation": sample_local_image_file,
        "options": {
            "deskew": True,
            "denoise": True,
            "contrastEnhancement": True,
            "languages": ["en"]
        }
    }

    response = client.post("/ocr", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["inspectionId"] == "ins_api_test_001"
    assert data["imageId"] == "img_api_test_001"
    assert data["engine"].startswith("PaddleOCR")
    assert data["processingStatus"] == "COMPLETED"
    assert "rawText" in data
    assert "detectedTextItems" in data
    assert "blocks" in data
    assert isinstance(data["detectedTextItems"], list)


def test_post_ocr_api_endpoint_invalid_file():
    payload = {
        "inspectionId": "ins_api_test_002",
        "imageId": "img_api_test_002",
        "imageLocation": "invalid_non_existent_file_path_12345.jpg",
    }

    response = client.post("/ocr", json=payload)
    assert response.status_code == 502  # ImageDownloadError maps to 502 Bad Gateway

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "IMAGE_DOWNLOAD_FAILED"
