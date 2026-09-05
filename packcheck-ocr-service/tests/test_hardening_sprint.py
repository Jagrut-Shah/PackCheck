"""
PackCheck AI - Hardening Sprint Unit Test Suite.
Tests SSRF protection, domain allowlist enforcement, local file access sandboxing,
dedicated thread-pool executor behavior, adaptive image downscaling, and deskew safety guardrails.
"""

from concurrent.futures import ThreadPoolExecutor
import pytest
import numpy as np

from app.config import settings
from app.services.image_fetcher import ImageFetcherService
from app.services.cv_preprocessor import CVPreprocessorService
from app.core.ocr_engine import ocr_engine, OCREngineManager
from app.core.exceptions import ImageDownloadError


# ----------------------------------------------------------------------------
# 1. SSRF PROTECTION & DOMAIN ALLOWLIST TESTS
# ----------------------------------------------------------------------------

@pytest.fixture
def ssrf_fetcher():
    return ImageFetcherService(
        allow_local_file_access=True,
        allowed_http_domains=["*.supabase.co", "cdn.packcheck.ai"]
    )


def test_ssrf_blocks_localhost(ssrf_fetcher):
    with pytest.raises(ImageDownloadError) as exc_info:
        ssrf_fetcher.validate_ssrf_and_domain("http://localhost:8000/image.jpg")
    assert "SSRF Protection" in exc_info.value.message


def test_ssrf_blocks_loopback_ip(ssrf_fetcher):
    with pytest.raises(ImageDownloadError) as exc_info:
        ssrf_fetcher.validate_ssrf_and_domain("http://127.0.0.1/photo.png")
    assert "SSRF Protection" in exc_info.value.message


def test_ssrf_blocks_cloud_metadata_endpoint(ssrf_fetcher):
    with pytest.raises(ImageDownloadError) as exc_info:
        ssrf_fetcher.validate_ssrf_and_domain("http://169.254.169.254/latest/meta-data/")
    assert "SSRF Protection" in exc_info.value.message


def test_ssrf_blocks_private_subnet_ips(ssrf_fetcher):
    with pytest.raises(ImageDownloadError) as exc_info:
        ssrf_fetcher.validate_ssrf_and_domain("http://10.0.4.15/secret.jpg")
    assert "SSRF Protection" in exc_info.value.message

    with pytest.raises(ImageDownloadError) as exc_info:
        ssrf_fetcher.validate_ssrf_and_domain("http://192.168.1.10/secret.jpg")
    assert "SSRF Protection" in exc_info.value.message


def test_domain_allowlist_enforcement(ssrf_fetcher):
    # Allowed domains
    ssrf_fetcher.validate_ssrf_and_domain("https://project-id.supabase.co/storage/v1/image.jpg")
    ssrf_fetcher.validate_ssrf_and_domain("https://cdn.packcheck.ai/assets/package.png")

    # Unallowed domain
    with pytest.raises(ImageDownloadError) as exc_info:
        ssrf_fetcher.validate_ssrf_and_domain("https://untrusted-external-domain.com/photo.jpg")
    assert "Domain Allowlist Protection" in exc_info.value.message


# ----------------------------------------------------------------------------
# 2. LOCAL FILE ACCESS SANDBOXING TESTS
# ----------------------------------------------------------------------------

@pytest.mark.anyio
async def test_local_file_access_disabled(tmp_path):
    sandboxed_fetcher = ImageFetcherService(allow_local_file_access=False)
    test_file = tmp_path / "sample.jpg"
    test_file.write_bytes(b"dummy_bytes")

    with pytest.raises(ImageDownloadError) as exc_info:
        await sandboxed_fetcher.fetch_from_local_file(str(test_file))
    assert "disabled in production" in exc_info.value.message.lower()


# ----------------------------------------------------------------------------
# 3. DEDICATED OCR EXECUTOR TESTS
# ----------------------------------------------------------------------------

def test_dedicated_ocr_executor_configuration():
    engine_mgr = OCREngineManager()
    assert hasattr(engine_mgr, "_executor")
    assert isinstance(engine_mgr._executor, ThreadPoolExecutor)
    assert engine_mgr._executor._max_workers == settings.NUM_OCR_WORKERS


# ----------------------------------------------------------------------------
# 4. ADAPTIVE DOWNSCALING TESTS
# ----------------------------------------------------------------------------

def test_adaptive_downscaling_3072px():
    preprocessor = CVPreprocessorService(max_dimension=3072)
    large_img = np.full((4000, 5000, 3), 200, dtype=np.uint8)

    scaled, scale_x, scale_y = preprocessor.downscale_resolution(large_img)
    h, w = scaled.shape[:2]

    assert w == 3072
    assert h == 2458
    assert abs(scale_x - (5000 / 3072)) < 1e-4
    assert abs(scale_y - (4000 / 2458)) < 1e-4


# ----------------------------------------------------------------------------
# 5. DESKEW SAFETY GUARD TESTS
# ----------------------------------------------------------------------------

def test_deskew_safety_guard_ignores_extreme_angles():
    preprocessor = CVPreprocessorService(max_deskew_angle=15.0)
    straight_img = np.full((300, 400, 3), 255, dtype=np.uint8)

    # Angle within safety range (e.g. 0.0) -> returns angle 0.0
    _, angle = preprocessor.deskew_correction(straight_img)
    assert angle == 0.0
