"""
PackCheck AI - Production Image Download & Validation Service.
Fetches image binaries from Supabase Storage / HTTP URLs or local paths,
validates SSRF security, domain allowlist, max size, magic bytes, and decodes into OpenCV matrices.
"""

import os
import time
import asyncio
import ipaddress
import fnmatch
from urllib.parse import urlparse
from typing import Tuple, Optional, List
from pathlib import Path

import httpx
import cv2
import numpy as np

from app.config import settings
from app.utils.logger import logger
from app.core.exceptions import (
    ImageDownloadError,
    InvalidImageFormatError,
    ImageTooLargeError,
)

# Restricted hostnames and metadata endpoints blocked for SSRF protection
RESTRICTED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",  # Cloud metadata endpoint
    "metadata.google.internal",
}

# Supported image MIME magic bytes signatures
MAGIC_BYTES_SIGNATURES = [
    (b"\xff\xd8\xff", "JPEG"),
    (b"\x89PNG\r\n\x1a\n", "PNG"),
    (b"RIFF", "WEBP"),  # WebP signature (starts with RIFF, bytes 8-11 are WEBP)
    (b"BM", "BMP"),
    (b"II*\x00", "TIFF"),
    (b"MM\x00*", "TIFF"),
]


class ImageFetcherService:
    """Production service for fetching, validating, and decoding package images."""

    def __init__(
        self,
        max_size_mb: int = settings.MAX_IMAGE_SIZE_MB,
        connect_timeout: float = 10.0,
        read_timeout: float = 30.0,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
        allow_local_file_access: bool = settings.ALLOW_LOCAL_FILE_ACCESS,
        allowed_http_domains: Optional[List[str]] = None,
    ):
        self.max_bytes = max_size_mb * 1024 * 1024
        self.timeout = httpx.Timeout(
            connect=connect_timeout,
            read=read_timeout,
            write=10.0,
            pool=10.0
        )
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.allow_local_file_access = allow_local_file_access
        self.allowed_http_domains = allowed_http_domains if allowed_http_domains is not None else settings.ALLOWED_HTTP_DOMAINS

    def validate_ssrf_and_domain(self, url: str) -> None:
        """
        Validates HTTP/HTTPS URL against SSRF attack vectors and domain allowlist.
        Blocks localhost, 127.0.0.1, 0.0.0.0, private IP subnets, and cloud metadata endpoints.
        """
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().strip()

        if not hostname:
            raise ImageDownloadError(
                message="Invalid image URL: Missing hostname.",
                details={"url": url}
            )

        # 1. Check RESTRICTED_HOSTNAMES
        if hostname in RESTRICTED_HOSTNAMES:
            raise ImageDownloadError(
                message=f"SSRF Protection: Access to restricted host '{hostname}' is blocked.",
                details={"url": url, "blocked_hostname": hostname}
            )

        # 2. Check IP address private/loopback/link-local/reserved ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_unspecified:
                raise ImageDownloadError(
                    message=f"SSRF Protection: Access to internal or private IP address '{hostname}' is blocked.",
                    details={"url": url, "blocked_ip": str(ip)}
                )
        except ValueError:
            # Hostname is a domain name (e.g. storage.supabase.co)
            pass

        # 3. Check Domain Allowlist
        if not self.is_domain_allowed(hostname):
            raise ImageDownloadError(
                message=f"Domain Allowlist Protection: Access to host '{hostname}' is not permitted.",
                details={"url": url, "hostname": hostname, "allowed_domains": self.allowed_http_domains}
            )

    def is_domain_allowed(self, hostname: str) -> bool:
        """Checks whether hostname matches configured domain allowlist patterns."""
        if "*" in self.allowed_http_domains or "*.*" in self.allowed_http_domains:
            return True

        for pattern in self.allowed_http_domains:
            pat = pattern.lower().strip()
            if pat.startswith("*."):
                suffix = pat[2:]
                if hostname == suffix or hostname.endswith("." + suffix):
                    return True
            elif fnmatch.fnmatch(hostname, pat):
                return True

        return False

    def validate_magic_bytes(self, buffer: bytes) -> str:
        """
        Validates raw binary stream headers against known image magic bytes signatures.
        Returns detected image format or raises InvalidImageFormatError.
        """
        if len(buffer) < 12:
            raise InvalidImageFormatError(
                message="Image buffer is too short to contain a valid header.",
                details={"buffer_length": len(buffer)}
            )

        for signature, fmt in MAGIC_BYTES_SIGNATURES:
            if fmt == "WEBP":
                if buffer.startswith(b"RIFF") and buffer[8:12] == b"WEBP":
                    return "WEBP"
            elif buffer.startswith(signature):
                return fmt

        raise InvalidImageFormatError(
            message="Unsupported or invalid image file signature. Expected JPEG, PNG, WEBP, BMP, or TIFF.",
            details={"header_hex": buffer[:16].hex()}
        )

    def decode_opencv_matrix(self, buffer: bytes, location: str) -> np.ndarray:
        """
        Converts raw byte array into an OpenCV numpy.ndarray BGR matrix.
        Validates matrix dimensions and channels.
        """
        np_arr = np.frombuffer(buffer, dtype=np.uint8)
        image_mat = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image_mat is None or image_mat.size == 0:
            raise InvalidImageFormatError(
                message="OpenCV failed to decode image buffer into a valid pixel matrix.",
                details={"location": location}
            )

        height, width = image_mat.shape[:2]
        if height == 0 or width == 0:
            raise InvalidImageFormatError(
                message="Decoded image has zero height or width.",
                details={"dimensions": [width, height]}
            )

        return image_mat

    async def fetch_from_http(self, url: str) -> bytes:
        """
        Downloads image from remote HTTP/HTTPS endpoint (e.g. Supabase Storage)
        with SSRF protection, retry backoff, and streaming max-size checks.
        """
        # Validate SSRF and domain allowlist before initiating connection
        self.validate_ssrf_and_domain(url)

        last_exception: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(
                    f"Fetching image from storage (attempt {attempt}/{self.max_retries}): {url}",
                    extra={"url": url, "attempt": attempt}
                )

                async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                    async with client.stream("GET", url) as response:
                        if response.status_code == 404:
                            raise ImageDownloadError(
                                message=f"Image not found at storage location (404 Not Found).",
                                details={"url": url}
                            )
                        if response.status_code == 403:
                            raise ImageDownloadError(
                                message=f"Access forbidden to storage image (403 Forbidden).",
                                details={"url": url}
                            )

                        response.raise_for_status()

                        # Check Content-Length header if provided
                        content_length = response.headers.get("content-length")
                        if content_length and int(content_length) > self.max_bytes:
                            raise ImageTooLargeError(
                                message=f"Image size exceeds maximum limit of {settings.MAX_IMAGE_SIZE_MB}MB.",
                                details={
                                    "content_length_bytes": int(content_length),
                                    "max_allowed_bytes": self.max_bytes
                                }
                            )

                        # Stream content and enforce size limits
                        chunks = []
                        downloaded_bytes = 0
                        async for chunk in response.aiter_bytes():
                            downloaded_bytes += len(chunk)
                            if downloaded_bytes > self.max_bytes:
                                raise ImageTooLargeError(
                                    message=f"Image download stream exceeded max limit of {settings.MAX_IMAGE_SIZE_MB}MB.",
                                    details={
                                        "downloaded_bytes": downloaded_bytes,
                                        "max_allowed_bytes": self.max_bytes
                                    }
                                )
                            chunks.append(chunk)

                        buffer = b"".join(chunks)
                        return buffer

            except (ImageDownloadError, ImageTooLargeError, InvalidImageFormatError):
                # Don't retry client domain/SSRF errors (404, 403, size errors, SSRF blocks)
                raise

            except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as exc:
                last_exception = exc
                logger.warning(
                    f"Storage download error on attempt {attempt}/{self.max_retries}: {str(exc)}",
                    extra={"url": url, "attempt": attempt, "error": str(exc)}
                )

                if attempt < self.max_retries:
                    sleep_time = self.backoff_factor * (2 ** (attempt - 1))
                    await asyncio.sleep(sleep_time)

        raise ImageDownloadError(
            message=f"Failed to fetch image after {self.max_retries} attempts.",
            details={"url": url, "last_error": str(last_exception)}
        )

    async def fetch_from_local_file(self, file_path: str) -> bytes:
        """Reads image binary from local filesystem path (sandboxed for dev/test environments)."""
        if not self.allow_local_file_access:
            raise ImageDownloadError(
                message="Local file access is disabled in production environments.",
                details={"file_path": file_path}
            )

        path = Path(file_path)
        if not path.is_file():
            raise ImageDownloadError(
                message=f"Local image file does not exist: {file_path}",
                details={"file_path": file_path}
            )

        file_size = path.stat().st_size
        if file_size > self.max_bytes:
            raise ImageTooLargeError(
                message=f"Local image file size ({file_size} bytes) exceeds limit of {settings.MAX_IMAGE_SIZE_MB}MB.",
                details={"file_size": file_size, "max_allowed_bytes": self.max_bytes}
            )

        try:
            return path.read_bytes()
        except Exception as exc:
            raise ImageDownloadError(
                message=f"Failed to read local image file: {str(exc)}",
                details={"file_path": file_path}
            )

    async def fetch_and_decode(self, image_location: str) -> Tuple[np.ndarray, str, int]:
        """
        Main entrypoint: Fetches binary from HTTP/HTTPS URL or local path,
        validates magic bytes, decodes into OpenCV Mat, and returns tuple of:
        (cv2_image_matrix, detected_format, buffer_size_bytes)
        """
        start_time = time.perf_counter()

        clean_location = image_location.strip()
        if not clean_location:
            raise InvalidImageFormatError(
                message="imageLocation parameter cannot be empty."
            )

        # 1. Fetch raw binary stream
        if clean_location.startswith(("http://", "https://")):
            buffer = await self.fetch_from_http(clean_location)
        else:
            buffer = await self.fetch_from_local_file(clean_location)

        # 2. Validate Magic Bytes Header
        detected_format = self.validate_magic_bytes(buffer)

        # 3. Decode into OpenCV Mat
        image_mat = self.decode_opencv_matrix(buffer, clean_location)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        height, width = image_mat.shape[:2]

        logger.info(
            f"Successfully downloaded and decoded image ({width}x{height} {detected_format}, {len(buffer)} bytes) in {elapsed_ms}ms",
            extra={
                "location": clean_location,
                "format": detected_format,
                "width": width,
                "height": height,
                "size_bytes": len(buffer),
                "duration_ms": elapsed_ms
            }
        )

        return image_mat, detected_format, len(buffer)


# Export singleton service instance
image_fetcher = ImageFetcherService()
