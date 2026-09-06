"""
PackCheck AI - Configurable OCR engine integration service.
Supports OCR.space and the existing PaddleOCR implementation while exposing one
provider-neutral raw detection contract.
"""

import os
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import httpx
import numpy as np

from app.config import settings
from app.utils.logger import logger
from app.core.exceptions import OCRExecutionError


@dataclass
class RawOCRDetection:
    """Internal structured representation of a single detected text polygon from PaddleOCR."""
    polygon: List[Tuple[float, float]]  # 4-corner polygon [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    text: str
    confidence: float


@dataclass
class RawOCRResult:
    """Aggregated raw detection output returned by an OCR provider."""
    detections: List[RawOCRDetection] = field(default_factory=list)
    engine_name: str = "PaddleOCR"
    engine_version: str = settings.PADDLE_OCR_MODEL_VERSION
    inference_time_ms: float = 0.0
    raw_text: Optional[str] = None


class OCRSpaceProvider:
    """OCR.space HTTP adapter using the server-side OCR_SPACE_API_KEY."""

    engine_name = "OCR.space"
    engine_version = "OCREngine 2"
    endpoint = "https://api.ocr.space/parse/image"
    max_upload_bytes = 950_000

    def __init__(self, client=None):
        self._client = client
        self._initialized = False

    def initialize(self) -> None:
        """Validate server-side configuration without making a network request."""
        if self._initialized:
            return
        if not (settings.OCR_SPACE_API_KEY or "").strip():
            raise OCRExecutionError(
                message="OCR.space API key is not configured on the FastAPI server.",
                details={"provider": "ocr_space", "configuration": "OCR_SPACE_API_KEY"},
            )
        self._initialized = True
        logger.info("OCR.space provider initialized.")

    @staticmethod
    def _word_polygon(word) -> List[Tuple[float, float]]:
        left = float(word.get("Left", 0) or 0)
        top = float(word.get("Top", 0) or 0)
        width = float(word.get("Width", 0) or 0)
        height = float(word.get("Height", 0) or 0)
        return [(left, top), (left + width, top), (left + width, top + height), (left, top + height)]

    def _line_detection(self, line) -> Optional[RawOCRDetection]:
        words = line.get("Words") or []
        text = str(line.get("LineText") or "").strip()
        if not text:
            text = " ".join(str(word.get("WordText") or "").strip() for word in words).strip()
        if not text:
            return None

        polygons = [self._word_polygon(word) for word in words if isinstance(word, dict)]
        points = [point for polygon in polygons for point in polygon]
        if not points:
            return None

        min_x = min(point[0] for point in points)
        min_y = min(point[1] for point in points)
        max_x = max(point[0] for point in points)
        max_y = max(point[1] for point in points)
        polygon = [(min_x, min_y), (max_x, min_y), (max_x, max_y), (min_x, max_y)]

        return RawOCRDetection(polygon=polygon, text=text, confidence=0.95)

    @staticmethod
    def _scale_detections(
        detections: List[RawOCRDetection],
        scale_x: float,
        scale_y: float,
    ) -> None:
        for detection in detections:
            detection.polygon = [
                (round(x * scale_x, 1), round(y * scale_y, 1))
                for x, y in detection.polygon
            ]

    def process_image(self, image: np.ndarray) -> RawOCRResult:
        """Send a size-bounded JPEG to OCR.space and normalize overlays."""
        start_time = time.perf_counter()

        if image is None or image.size == 0:
            raise OCRExecutionError(message="Cannot execute OCR on an empty or None image matrix.")
        if not self._initialized:
            raise OCRExecutionError(
                message="OCR.space provider is not initialized.",
                details={"provider": "ocr_space"},
            )

        try:
            import cv2
            original_height, original_width = image.shape[:2]
            upload_image = image
            encoded_ok, encoded_image = cv2.imencode(
                ".jpg", upload_image, [int(cv2.IMWRITE_JPEG_QUALITY), 88]
            )
            if not encoded_ok:
                raise OCRExecutionError(message="OCR.space could not encode the image.")

            # OCR.space can reject larger payloads with HTTP 413. Reduce only the
            # provider upload copy; coordinates are mapped back to original pixels.
            while len(encoded_image) > self.max_upload_bytes:
                height, width = upload_image.shape[:2]
                ratio = max(0.5, (self.max_upload_bytes / len(encoded_image)) ** 0.5)
                resized_width = max(1, int(width * ratio))
                resized_height = max(1, int(height * ratio))
                if resized_width == width and resized_height == height:
                    break
                upload_image = cv2.resize(
                    upload_image,
                    (resized_width, resized_height),
                    interpolation=cv2.INTER_AREA,
                )
                encoded_ok, encoded_image = cv2.imencode(
                    ".jpg", upload_image, [int(cv2.IMWRITE_JPEG_QUALITY), 88]
                )
                if not encoded_ok:
                    raise OCRExecutionError(message="OCR.space could not encode the image.")

            upload_scale_x = original_width / upload_image.shape[1]
            upload_scale_y = original_height / upload_image.shape[0]

            logger.info("Starting OCR.space request.")
            files = {"file": ("package.jpg", encoded_image.tobytes(), "image/jpeg")}
            data = {
                "apikey": settings.OCR_SPACE_API_KEY,
                "language": "eng",
                "OCREngine": "2",
                "isOverlayRequired": "true",
                "detectOrientation": "true",
                "scale": "true",
            }
            client = self._client or httpx.Client(timeout=httpx.Timeout(45.0, connect=10.0))
            try:
                response = client.post(self.endpoint, files=files, data=data)
            finally:
                if self._client is None:
                    client.close()
            logger.info(f"OCR.space response received with status {response.status_code}.")

            if response.status_code in (401, 403):
                raise OCRExecutionError(
                    message="OCR.space rejected the API key or account quota.",
                    details={"provider": "ocr_space", "upstream_status": response.status_code},
                )
            if response.status_code == 429:
                raise OCRExecutionError(
                    message="OCR.space rate limit exceeded.",
                    details={"provider": "ocr_space", "upstream_status": 429},
                )
            if response.status_code >= 400:
                raise OCRExecutionError(
                    message=f"OCR.space returned HTTP {response.status_code}.",
                    details={"provider": "ocr_space", "upstream_status": response.status_code},
                )

            try:
                payload = response.json()
            except ValueError as exc:
                raise OCRExecutionError(
                    message="OCR.space returned malformed JSON.",
                    details={"provider": "ocr_space"},
                ) from exc

            if not isinstance(payload, dict):
                raise OCRExecutionError(message="OCR.space returned an invalid response.", details={"provider": "ocr_space"})
            if payload.get("IsErroredOnProcessing"):
                error_message = payload.get("ErrorMessage") or payload.get("ErrorDetails") or "OCR.space processing failed."
                if isinstance(error_message, list):
                    error_message = "; ".join(str(item) for item in error_message)
                raise OCRExecutionError(
                    message=f"OCR.space processing failed: {error_message}",
                    details={"provider": "ocr_space"},
                )

            parsed_results = payload.get("ParsedResults")
            if not isinstance(parsed_results, list):
                raise OCRExecutionError(message="OCR.space response did not contain ParsedResults.", details={"provider": "ocr_space"})

            raw_text_parts: List[str] = []
            detections: List[RawOCRDetection] = []
            for parsed_result in parsed_results:
                if not isinstance(parsed_result, dict):
                    continue
                parsed_text = str(parsed_result.get("ParsedText") or "")
                if parsed_text:
                    raw_text_parts.append(parsed_text)
                overlay = parsed_result.get("TextOverlay") or {}
                for line in overlay.get("Lines") or []:
                    if isinstance(line, dict):
                        detection = self._line_detection(line)
                        if detection:
                            detections.append(detection)

            raw_text = "\n".join(raw_text_parts).strip()
            if not raw_text:
                raise OCRExecutionError(message="OCR.space returned no readable text.", details={"provider": "ocr_space"})
            if not detections:
                height, width = original_height, original_width
                detections.append(
                    RawOCRDetection(
                        polygon=[
                            (0.0, 0.0),
                            (float(width), 0.0),
                            (float(width), float(height)),
                            (0.0, float(height)),
                        ],
                        text=raw_text,
                        confidence=0.95,
                    )
                )
            else:
                self._scale_detections(detections, upload_scale_x, upload_scale_y)

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(f"OCR.space text extracted ({len(raw_text)} characters, {len(detections)} regions) in {elapsed_ms}ms.")
            return RawOCRResult(
                detections=detections,
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                inference_time_ms=elapsed_ms,
                raw_text=raw_text,
            )
        except OCRExecutionError:
            raise
        except httpx.TimeoutException as exc:
            raise OCRExecutionError(message="OCR.space request timed out.", details={"provider": "ocr_space"}) from exc
        except httpx.HTTPError as exc:
            raise OCRExecutionError(message="OCR.space network request failed.", details={"provider": "ocr_space"}) from exc
        except Exception as exc:
            raise OCRExecutionError(message=f"OCR.space OCR failed: {exc}", details={"provider": "ocr_space"}) from exc

    @property
    def is_ready(self) -> bool:
        return self._initialized


class OCREngineManager:
    """
    Singleton manager for the configured OCR provider.
    Handles provider initialization and bounded thread pool inference.
    """

    _instance: Optional["OCREngineManager"] = None
    _engine = None
    _initialized: bool = False
    _executor: Optional[ThreadPoolExecutor] = None
    _ocr_space_provider: Optional[OCRSpaceProvider] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCREngineManager, cls).__new__(cls)
            # Create dedicated bounded ThreadPoolExecutor for heavy OCR matrix operations
            cls._instance._executor = ThreadPoolExecutor(
                max_workers=settings.NUM_OCR_WORKERS,
                thread_name_prefix="ocr_worker"
            )
            cls._instance._ocr_space_provider = OCRSpaceProvider()
        return cls._instance

    @property
    def provider_name(self) -> str:
        return settings.OCR_PROVIDER.strip().lower()

    def _require_supported_provider(self) -> str:
        provider = self.provider_name
        if provider not in {"ocr_space", "paddleocr"}:
            raise OCRExecutionError(
                message=f"Unsupported OCR provider: {settings.OCR_PROVIDER}",
                details={"provider": settings.OCR_PROVIDER},
            )
        return provider

    def initialize_engine(self, lang: str = "en", use_gpu: bool = settings.USE_GPU) -> None:
        """
        Initializes the configured OCR provider during app startup.
        """
        provider = self._require_supported_provider()

        if provider == "ocr_space":
            if self._ocr_space_provider is None:
                self._ocr_space_provider = OCRSpaceProvider()
            self._ocr_space_provider.initialize()
            self._initialized = True
            return

        if self._initialized and self._engine is not None:
            return

        start_time = time.perf_counter()
        logger.info(
            f"Initializing PaddleOCR engine (version={settings.PADDLE_OCR_MODEL_VERSION}, lang={lang}, gpu={use_gpu}, workers={settings.NUM_OCR_WORKERS})..."
        )

        try:
            # Set environment flags to prevent hoster check stalls
            os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
            # PaddlePaddle 3.x CPU oneDNN can fail on PIR model attributes.
            os.environ["FLAGS_use_mkldnn"] = "0"

            # Apply safe predictor patch to prevent Windows PIR oneDNN instruction error on Windows only
            import sys
            if sys.platform == "win32":
                try:
                    import paddle.inference as pi
                    orig_create_predictor = pi.create_predictor
                    def safe_create_predictor(config):
                        if hasattr(config, "disable_onednn"):
                            config.disable_onednn()
                        if hasattr(config, "disable_mkldnn"):
                            config.disable_mkldnn()
                        return orig_create_predictor(config)
                    pi.create_predictor = safe_create_predictor
                except Exception as patch_exc:
                    logger.debug(f"Paddlex runner predictor patch note: {patch_exc}")

            from paddleocr import PaddleOCR
            self._engine = PaddleOCR(
                ocr_version="PP-OCRv4",
                lang=lang,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
            self._initialized = True
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(f"PaddleOCR engine successfully initialized in {elapsed_ms}ms.")
        except Exception as exc:
            logger.error(
                f"Native PaddleOCR engine failed to initialize: {str(exc)}"
            )
            self._engine = None
            self._initialized = False
            raise OCRExecutionError(
                message=f"PaddleOCR failed to initialize: {str(exc)}",
                details={"error": str(exc)}
            )

    def is_ready(self) -> bool:
        """Returns True if native PaddleOCR model is loaded in memory."""
        provider = self._require_supported_provider()
        if provider == "ocr_space":
            return self._ocr_space_provider is not None and self._ocr_space_provider.is_ready
        return self._initialized and self._engine is not None

    def process_image(self, image: np.ndarray, lang: str = "en") -> RawOCRResult:
        """
        Synchronous OCR inference handler.
        Processes an OpenCV BGR numpy matrix and returns structured RawOCRResult.
        """
        start_time = time.perf_counter()

        provider = self._require_supported_provider()
        if provider == "ocr_space":
            if self._ocr_space_provider is None:
                self._ocr_space_provider = OCRSpaceProvider()
            return self._ocr_space_provider.process_image(image)

        if image is None or image.size == 0:
            raise OCRExecutionError(
                message="Cannot execute OCR on an empty or None image matrix."
            )

        if not self._initialized or self._engine is None:
            raise OCRExecutionError(
                message="PaddleOCR engine is not initialized. Synthetic fallback is disabled."
            )

        try:
            # Execute real PaddleOCR inference
            raw_output = self._engine.predict(image)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            detections: List[RawOCRDetection] = []

            # Handle PaddleOCR 3.x dict format and classic list format
            for page in (raw_output or []):
                if isinstance(page, dict):
                    rec_texts = page.get("rec_texts", [])
                    rec_scores = page.get("rec_scores", [])
                    rec_polys = page.get("rec_polys", [])

                    for idx, text in enumerate(rec_texts):
                        clean_text = str(text).strip()
                        if not clean_text:
                            continue
                        score = float(rec_scores[idx]) if idx < len(rec_scores) else 0.95
                        poly = rec_polys[idx] if idx < len(rec_polys) else None
                        if poly is not None and hasattr(poly, "tolist"):
                            poly_list = [(float(pt[0]), float(pt[1])) for pt in poly.tolist()]
                        elif isinstance(poly, (list, tuple)):
                            poly_list = [(float(pt[0]), float(pt[1])) for pt in poly]
                        else:
                            h, w = image.shape[:2]
                            poly_list = [(0.0, 0.0), (float(w), 0.0), (float(w), float(h)), (0.0, float(h))]

                        detections.append(
                            RawOCRDetection(
                                polygon=poly_list,
                                text=clean_text,
                                confidence=round(score, 4)
                            )
                        )
                elif isinstance(page, (list, tuple)):
                    for line in page:
                        if line and len(line) == 2:
                            polygon_raw, text_info = line
                            text_str = text_info[0] if isinstance(text_info, (list, tuple)) else str(text_info)
                            clean_text = str(text_str).strip()
                            if not clean_text:
                                continue
                            conf_score = text_info[1] if isinstance(text_info, (list, tuple)) and len(text_info) > 1 else 0.95
                            polygon = [(float(pt[0]), float(pt[1])) for pt in polygon_raw]
                            detections.append(
                                RawOCRDetection(
                                    polygon=polygon,
                                    text=clean_text,
                                    confidence=round(float(conf_score), 4)
                                )
                            )

            logger.info(
                f"PaddleOCR processed image ({image.shape[1]}x{image.shape[0]}) -> detected {len(detections)} text items in {elapsed_ms}ms",
                extra={
                    "detected_items_count": len(detections),
                    "inference_time_ms": elapsed_ms,
                    "width": image.shape[1],
                    "height": image.shape[0],
                }
            )

            return RawOCRResult(
                detections=detections,
                engine_name="PaddleOCR",
                engine_version="PP-OCRv4",
                inference_time_ms=elapsed_ms
            )

        except Exception as exc:
            logger.exception(f"PaddleOCR inference execution failed: {str(exc)}")
            raise OCRExecutionError(
                message=f"OCR inference execution failed: {str(exc)}",
                details={"error": str(exc)}
            )

    async def async_process_image(self, image: np.ndarray, lang: str = "en") -> RawOCRResult:
        """
        Asynchronous wrapper executing heavy CPU/GPU OCR inference in the dedicated ThreadPoolExecutor.
        Prevents thread explosion and prevents blocking the Uvicorn asyncio event loop.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self.process_image, image, lang)

    def shutdown(self) -> None:
        """Shuts down dedicated ThreadPoolExecutor on application shutdown."""
        if self._executor:
            self._executor.shutdown(wait=False)

    def _mock_fallback_detection(self, image: np.ndarray, start_time: float) -> RawOCRResult:
        """
        Fallback synthetic detector used in lightweight test environments when PaddleOCR is uninitialized.
        """
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        h, w = image.shape[:2]

        fallback_detection = RawOCRDetection(
            polygon=[(10.0, 10.0), (float(w - 10), 10.0), (float(w - 10), float(h - 10)), (10.0, float(h - 10))],
            text="SYNTHETIC OCR TEXT DETECTED",
            confidence=0.95
        )

        return RawOCRResult(
            detections=[fallback_detection],
            engine_name="PaddleOCR-Fallback",
            engine_version=settings.PADDLE_OCR_MODEL_VERSION,
            inference_time_ms=elapsed_ms
        )


# Export singleton instance
ocr_engine = OCREngineManager()
