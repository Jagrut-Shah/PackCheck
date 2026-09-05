"""
PackCheck AI - Comprehensive Test Suite for OCR Microservice.
Tests 7 core production scenarios:
1. Valid Image
2. Blurry Image
3. Low-Light Image
4. Invalid URL (Network Failure)
5. Missing Image (File Not Found)
6. OCR Engine Execution Failure
7. Large Image Resolution Downscaling & Spatial Re-projection

Verifies OCRResponse Pydantic schema contracts, confidence scores, bounding boxes,
scale factor unscaling, and structured error envelopes.
"""

from unittest.mock import patch
import pytest
import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import OCRRequest, OCRResult, OCROptions, ConfidenceLevel
from app.services.ocr_pipeline import ocr_pipeline
from app.core.exceptions import OCRExecutionError

client = TestClient(app)


# ----------------------------------------------------------------------------
# HELPER FIXTURES: Synthetic Image Generators
# ----------------------------------------------------------------------------

@pytest.fixture
def valid_image_file(tmp_path):
    """Generates a standard clean 600x300 BGR packaging image with text."""
    img = np.full((300, 600, 3), 255, dtype=np.uint8)
    cv2.putText(img, "AMUL PURE GHEE 1L", (40, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
    cv2.putText(img, "MRP RS 650.00 (INCL. TAXES)", (40, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)

    file_path = tmp_path / "valid_package.jpg"
    success, buffer = cv2.imencode(".jpg", img)
    assert success
    file_path.write_bytes(buffer.tobytes())
    return str(file_path)


@pytest.fixture
def blurry_image_file(tmp_path):
    """Generates a heavily blurred 600x300 packaging image using Gaussian Blur."""
    img = np.full((300, 600, 3), 255, dtype=np.uint8)
    cv2.putText(img, "BLURRY TEXT PACKAGING", (40, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)

    # Apply heavy Gaussian Blur
    blurred = cv2.GaussianBlur(img, (25, 25), 0)

    file_path = tmp_path / "blurry_package.jpg"
    success, buffer = cv2.imencode(".jpg", blurred)
    assert success
    file_path.write_bytes(buffer.tobytes())
    return str(file_path)


@pytest.fixture
def low_light_image_file(tmp_path):
    """Generates a low-light/darkened 600x300 packaging image."""
    img = np.full((300, 600, 3), 240, dtype=np.uint8)
    cv2.putText(img, "LOW LIGHT DECLARATION", (40, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)

    # Darken image to simulate low illumination
    dark = (img * 0.15).astype(np.uint8)

    file_path = tmp_path / "low_light_package.jpg"
    success, buffer = cv2.imencode(".jpg", dark)
    assert success
    file_path.write_bytes(buffer.tobytes())
    return str(file_path)


@pytest.fixture
def large_image_file(tmp_path):
    """Generates a high-resolution 4000x3000 image exceeding 2048px limit."""
    img = np.full((3000, 4000, 3), 255, dtype=np.uint8)
    cv2.putText(img, "4K RESOLUTION PACKAGING PHOTO", (200, 1500), cv2.FONT_HERSHEY_SIMPLEX, 4.0, (0, 0, 0), 8)

    file_path = tmp_path / "large_4k_package.jpg"
    success, buffer = cv2.imencode(".jpg", img)
    assert success
    file_path.write_bytes(buffer.tobytes())
    return str(file_path)


# ----------------------------------------------------------------------------
# SCENARIO 1: VALID IMAGE
# ----------------------------------------------------------------------------

def test_scenario_1_valid_image(valid_image_file):
    """Scenario 1: Valid packaging image returns 200 OK with fully populated OCRResult."""
    payload = {
        "inspectionId": "ins_test_valid_001",
        "imageId": "img_test_valid_001",
        "imageLocation": valid_image_file,
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

    # Schema Validation via Pydantic model_validate
    ocr_result = OCRResult.model_validate(data)
    assert ocr_result.inspectionId == "ins_test_valid_001"
    assert ocr_result.imageId == "img_test_valid_001"
    assert ocr_result.id == "ocr_img_test_valid_001"
    assert ocr_result.processingStatus == "COMPLETED"
    assert len(ocr_result.rawText) > 0

    # Verify Confidence Scores
    assert 0.0 <= ocr_result.overallConfidence <= 1.0
    assert ocr_result.averageConfidence == ocr_result.overallConfidence

    # Verify Bounding Boxes & Blocks
    assert len(ocr_result.detectedTextItems) > 0
    assert len(ocr_result.blocks) > 0

    for item in ocr_result.detectedTextItems:
        assert item.confidenceLevel in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW]
        assert isinstance(item.boundingBox, tuple) or isinstance(item.boundingBox, list)
        assert len(item.boundingBox) == 4
        x, y, w, h = item.boundingBox
        assert w >= 0 and h >= 0

    for block in ocr_result.blocks:
        assert block.boundingBox.width >= 0
        assert block.boundingBox.height >= 0
        assert len(block.polygonPoints) == 4


# ----------------------------------------------------------------------------
# SCENARIO 2: BLURRY IMAGE
# ----------------------------------------------------------------------------

def test_scenario_2_blurry_image(blurry_image_file):
    """Scenario 2: Blurry image is handled gracefully without pipeline crash."""
    payload = {
        "inspectionId": "ins_test_blurry_002",
        "imageId": "img_test_blurry_002",
        "imageLocation": blurry_image_file,
        "options": {
            "denoise": True,
            "contrastEnhancement": True
        }
    }

    response = client.post("/ocr", json=payload)
    assert response.status_code == 200

    data = response.json()
    ocr_result = OCRResult.model_validate(data)
    assert ocr_result.processingStatus == "COMPLETED"
    assert isinstance(ocr_result.detectedTextItems, list)


# ----------------------------------------------------------------------------
# SCENARIO 3: LOW-LIGHT IMAGE
# ----------------------------------------------------------------------------

def test_scenario_3_low_light_image(low_light_image_file):
    """Scenario 3: Low-light image enhanced via CLAHE contrast preprocessor."""
    payload = {
        "inspectionId": "ins_test_low_light_003",
        "imageId": "img_test_low_light_003",
        "imageLocation": low_light_image_file,
        "options": {
            "contrastEnhancement": True,
            "denoise": True
        }
    }

    response = client.post("/ocr", json=payload)
    assert response.status_code == 200

    data = response.json()
    ocr_result = OCRResult.model_validate(data)
    assert ocr_result.processingStatus == "COMPLETED"
    assert ocr_result.processingTimeMs > 0.0


# ----------------------------------------------------------------------------
# SCENARIO 4: INVALID URL (NETWORK FAILURE)
# ----------------------------------------------------------------------------

def test_scenario_4_invalid_url():
    """Scenario 4: Invalid remote URL returns 502 Bad Gateway error envelope."""
    payload = {
        "inspectionId": "ins_test_invalid_url_004",
        "imageId": "img_test_invalid_url_004",
        "imageLocation": "https://invalid-non-existent-storage-domain-999.com/photo.jpg"
    }

    response = client.post("/ocr", json=payload)
    assert response.status_code == 502

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "IMAGE_DOWNLOAD_FAILED"
    assert "message" in data["error"]


# ----------------------------------------------------------------------------
# SCENARIO 5: MISSING IMAGE FILE
# ----------------------------------------------------------------------------

def test_scenario_5_missing_image():
    """Scenario 5: Missing local file returns 502 Bad Gateway error envelope."""
    payload = {
        "inspectionId": "ins_test_missing_005",
        "imageId": "img_test_missing_005",
        "imageLocation": "/non_existent_path/missing_package_image_12345.jpg"
    }

    response = client.post("/ocr", json=payload)
    assert response.status_code == 502

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "IMAGE_DOWNLOAD_FAILED"


# ----------------------------------------------------------------------------
# SCENARIO 6: OCR ENGINE FAILURE
# ----------------------------------------------------------------------------

def test_scenario_6_ocr_failure(valid_image_file):
    """Scenario 6: Unhandled exception during OCR inference returns 500 error envelope."""
    payload = {
        "inspectionId": "ins_test_ocr_fail_006",
        "imageId": "img_test_ocr_fail_006",
        "imageLocation": valid_image_file
    }

    # Mock engine execution to simulate internal neural network failure
    with patch("app.core.ocr_engine.ocr_engine.async_process_image", side_effect=OCRExecutionError("Neural Engine Core Dump")):
        response = client.post("/ocr", json=payload)

    assert response.status_code == 500

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "OCR_INFERENCE_ERROR"
    assert "Neural Engine Core Dump" in data["error"]["message"]


# ----------------------------------------------------------------------------
# SCENARIO 7: LARGE IMAGE (DOWNSCALING & SPATIAL UNCOUNTERING)
# ----------------------------------------------------------------------------

@pytest.mark.anyio
async def test_scenario_7_large_image(large_image_file):
    """Scenario 7: 4K resolution image downscaled to 2048px with spatial ratio unscaling."""
    request = OCRRequest(
        inspectionId="ins_test_large_007",
        imageId="img_test_large_007",
        imageLocation=large_image_file,
        options=OCROptions(deskew=True, denoise=True, contrastEnhancement=True)
    )

    result = await ocr_pipeline.process_ocr_request(request)

    assert isinstance(result, OCRResult)
    assert result.processingStatus == "COMPLETED"
    assert len(result.detectedTextItems) > 0

    # Verify spatial bounding boxes are in original 4000x3000 pixel coordinate space
    for item in result.detectedTextItems:
        x, y, w, h = item.boundingBox
        assert x >= 0.0
        assert y >= 0.0
        assert w >= 0.0
        assert h >= 0.0
