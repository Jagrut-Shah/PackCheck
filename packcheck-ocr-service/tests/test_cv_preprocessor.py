"""
PackCheck AI - Unit Tests for CVPreprocessorService.
Tests resolution downscaling, scale factor calculation, CLAHE contrast enhancement,
bilateral denoising, deskew angle correction, and full pipeline execution.
"""

import pytest
import cv2
import numpy as np

from app.services.cv_preprocessor import CVPreprocessorService, PreprocessedImageResult
from app.schemas.request import OCROptions


@pytest.fixture
def preprocessor():
    return CVPreprocessorService(max_dimension=2048)


@pytest.fixture
def sample_small_image():
    """Generates a simple 800x600 BGR test image."""
    img = np.full((600, 800, 3), 128, dtype=np.uint8)
    cv2.putText(img, "LEGAL METROLOGY TEST", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3)
    return img


@pytest.fixture
def sample_large_image():
    """Generates a large 4000x3000 BGR test image exceeding 2048px limit."""
    img = np.full((3000, 4000, 3), 200, dtype=np.uint8)
    cv2.putText(img, "HIGH RESOLUTION PACKAGING PHOTO", (200, 1500), cv2.FONT_HERSHEY_SIMPLEX, 4.0, (0, 0, 0), 8)
    return img


def test_downscale_small_image_preserves_dimensions(preprocessor, sample_small_image):
    scaled, scale_x, scale_y = preprocessor.downscale_resolution(sample_small_image)
    assert scaled.shape == (600, 800, 3)
    assert scale_x == 1.0
    assert scale_y == 1.0


def test_downscale_large_image_resizes_to_max_dimension(preprocessor, sample_large_image):
    scaled, scale_x, scale_y = preprocessor.downscale_resolution(sample_large_image)
    h, w = scaled.shape[:2]

    assert w == 2048
    assert h == 1536
    assert abs(scale_x - (4000 / 2048)) < 1e-4
    assert abs(scale_y - (3000 / 1536)) < 1e-4


def test_enhance_contrast_clahe(preprocessor, sample_small_image):
    enhanced = preprocessor.enhance_contrast_clahe(sample_small_image)
    assert enhanced.shape == sample_small_image.shape
    assert enhanced.dtype == np.uint8
    # CLAHE modifies pixel intensity values
    assert not np.array_equal(enhanced, sample_small_image)


def test_denoise_bilateral(preprocessor, sample_small_image):
    denoised = preprocessor.denoise_bilateral(sample_small_image)
    assert denoised.shape == sample_small_image.shape
    assert denoised.dtype == np.uint8


def test_deskew_correction_straight_image(preprocessor, sample_small_image):
    straight, angle = preprocessor.deskew_correction(sample_small_image)
    assert straight.shape == sample_small_image.shape
    assert abs(angle) < 0.5


def test_full_preprocess_pipeline(preprocessor, sample_large_image):
    options = OCROptions(
        deskew=True,
        denoise=True,
        contrastEnhancement=True,
    )

    result = preprocessor.preprocess(sample_large_image, options)

    assert isinstance(result, PreprocessedImageResult)
    assert result.original_width == 4000
    assert result.original_height == 3000
    assert result.processed_width == 2048
    assert result.processed_height == 1536
    assert abs(result.scale_x - (4000 / 2048)) < 1e-4
    assert abs(result.scale_y - (3000 / 1536)) < 1e-4
    assert isinstance(result.processed_image, np.ndarray)
