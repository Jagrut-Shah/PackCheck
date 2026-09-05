"""
PackCheck AI - Unit Tests for ImageFetcherService.
Tests HTTP fetching, size limit enforcement, magic bytes validation, and OpenCV matrix decoding.
"""

import pytest
import cv2
import numpy as np
from app.services.image_fetcher import ImageFetcherService
from app.core.exceptions import (
    ImageDownloadError,
    InvalidImageFormatError,
    ImageTooLargeError,
)


@pytest.fixture
def image_fetcher():
    return ImageFetcherService(max_size_mb=1, max_retries=2)


@pytest.fixture
def sample_jpg_bytes():
    """Generates a real valid 100x100 white JPEG image in memory."""
    img = np.full((100, 100, 3), 255, dtype=np.uint8)
    success, buffer = cv2.imencode(".jpg", img)
    assert success
    return buffer.tobytes()


def test_magic_bytes_validation_jpg(image_fetcher, sample_jpg_bytes):
    fmt = image_fetcher.validate_magic_bytes(sample_jpg_bytes)
    assert fmt == "JPEG"


def test_magic_bytes_validation_invalid(image_fetcher):
    with pytest.raises(InvalidImageFormatError):
        image_fetcher.validate_magic_bytes(b"INVALID_HEADER_BYTES")


def test_decode_opencv_matrix_success(image_fetcher, sample_jpg_bytes):
    mat = image_fetcher.decode_opencv_matrix(sample_jpg_bytes, "test_image.jpg")
    assert isinstance(mat, np.ndarray)
    assert mat.shape == (100, 100, 3)


def test_decode_opencv_matrix_corrupted(image_fetcher):
    with pytest.raises(InvalidImageFormatError):
        image_fetcher.decode_opencv_matrix(b"\xff\xd8\xffCORRUPTED_BYTES", "corrupted.jpg")


@pytest.mark.anyio
async def test_fetch_from_local_file(image_fetcher, tmp_path, sample_jpg_bytes):
    file_path = tmp_path / "test.jpg"
    file_path.write_bytes(sample_jpg_bytes)

    mat, fmt, size = await image_fetcher.fetch_and_decode(str(file_path))
    assert fmt == "JPEG"
    assert mat.shape == (100, 100, 3)
    assert size == len(sample_jpg_bytes)
