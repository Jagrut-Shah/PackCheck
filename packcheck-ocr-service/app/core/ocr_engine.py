"""
PackCheck AI - Configurable OCR engine integration service.
Supports Google Cloud Vision and the existing PaddleOCR implementation while exposing
one provider-neutral raw detection contract.
"""

import os
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Callable, List, Tuple, Optional
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


class GoogleVisionOCRProvider:
    """Google Cloud Vision document OCR adapter using Application Default Credentials."""

    engine_name = "Google Cloud Vision"
    engine_version = "DOCUMENT_TEXT_DETECTION"

    def __init__(
        self,
        client=None,
        image_factory: Optional[Callable[[bytes], object]] = None,
    ):
        self._client = client
        self._image_factory = image_factory
        self._initialized = client is not None and image_factory is not None

    def initialize(self) -> None:
        """Create the Vision client through ADC, without handling credential contents."""
        if self._initialized:
            return

        try:
            credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
            if not credentials_path or not os.path.isfile(credentials_path):
                raise OCRExecutionError(
                    message=(
                        "Google Cloud Vision credentials are unavailable. "
                        "Set GOOGLE_APPLICATION_CREDENTIALS to the mounted Render Secret File path."
                    ),
                    details={
                        "provider": "google_vision",
                        "credentials_configured": bool(credentials_path),
                        "credentials_file_exists": bool(credentials_path and os.path.isfile(credentials_path)),
                    },
                )

            from google.cloud import vision

            self._client = vision.ImageAnnotatorClient()
            self._image_factory = lambda content: vision.Image(content=content)
            self._initialized = True
            logger.info("Google Cloud Vision OCR client initialized.")
        except OCRExecutionError:
            raise
        except Exception as exc:
            raise OCRExecutionError(
                message=f"Google Cloud Vision failed to initialize: {exc}",
                details={"provider": "google_vision"},
            ) from exc

    @staticmethod
    def _vertices_to_polygon(bounding_box) -> List[Tuple[float, float]]:
        vertices = getattr(bounding_box, "vertices", []) or []
        return [
            (float(getattr(vertex, "x", 0) or 0), float(getattr(vertex, "y", 0) or 0))
            for vertex in vertices
        ]

    @staticmethod
    def _word_text(word) -> str:
        symbols = getattr(word, "symbols", []) or []
        return "".join(str(getattr(symbol, "text", "")) for symbol in symbols).strip()

    def _paragraph_detection(self, paragraph) -> Optional[RawOCRDetection]:
        words = getattr(paragraph, "words", []) or []
        text = " ".join(filter(None, (self._word_text(word) for word in words))).strip()
        if not text:
            return None

        confidence = float(getattr(paragraph, "confidence", 0.0) or 0.0)
        if confidence <= 0.0 and words:
            word_confidences = [float(getattr(word, "confidence", 0.0) or 0.0) for word in words]
            confidence = sum(word_confidences) / len(word_confidences)

        return RawOCRDetection(
            polygon=self._vertices_to_polygon(getattr(paragraph, "bounding_box", None)),
            text=text,
            confidence=round(max(0.0, min(1.0, confidence)), 4),
        )

    def process_image(self, image: np.ndarray) -> RawOCRResult:
        """Run DOCUMENT_TEXT_DETECTION and normalize paragraph geometry."""
        start_time = time.perf_counter()

        if image is None or image.size == 0:
            raise OCRExecutionError(message="Cannot execute OCR on an empty or None image matrix.")
        if not self._initialized or self._client is None or self._image_factory is None:
            raise OCRExecutionError(
                message="Google Cloud Vision OCR client is not initialized.",
                details={"provider": "google_vision"},
            )

        try:
            import cv2

            encoded_ok, encoded_image = cv2.imencode(".jpg", image)
            if not encoded_ok:
                raise OCRExecutionError(message="Google Cloud Vision could not encode the image.")

            response = self._client.document_text_detection(
                image=self._image_factory(encoded_image.tobytes())
            )
            api_error = getattr(response, "error", None)
            if api_error is not None and getattr(api_error, "message", ""):
                raise OCRExecutionError(
                    message=f"Google Cloud Vision OCR failed: {api_error.message}",
                    details={"provider": "google_vision"},
                )

            annotation = getattr(response, "full_text_annotation", None)
            raw_text = str(getattr(annotation, "text", "") or "")
            detections: List[RawOCRDetection] = []

            for page in getattr(annotation, "pages", []) or []:
                for block in getattr(page, "blocks", []) or []:
                    for paragraph in getattr(block, "paragraphs", []) or []:
                        detection = self._paragraph_detection(paragraph)
                        if detection:
                            detections.append(detection)

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return RawOCRResult(
                detections=detections,
                engine_name=self.engine_name,
                engine_version=self.engine_version,
                inference_time_ms=elapsed_ms,
                raw_text=raw_text,
            )
        except OCRExecutionError:
            raise
        except Exception as exc:
            raise OCRExecutionError(
                message=f"Google Cloud Vision OCR failed: {exc}",
                details={"provider": "google_vision"},
            ) from exc

    @property
    def is_ready(self) -> bool:
        return self._initialized and self._client is not None


class OCREngineManager:
    """
    Singleton manager for the configured OCR provider.
    Handles provider initialization and bounded thread pool inference.
    """

    _instance: Optional["OCREngineManager"] = None
    _engine = None
    _initialized: bool = False
    _executor: Optional[ThreadPoolExecutor] = None
    _google_provider: Optional[GoogleVisionOCRProvider] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCREngineManager, cls).__new__(cls)
            # Create dedicated bounded ThreadPoolExecutor for heavy OCR matrix operations
            cls._instance._executor = ThreadPoolExecutor(
                max_workers=settings.NUM_OCR_WORKERS,
                thread_name_prefix="ocr_worker"
            )
            cls._instance._google_provider = GoogleVisionOCRProvider()
        return cls._instance

    @property
    def provider_name(self) -> str:
        return settings.OCR_PROVIDER.strip().lower()

    def _require_supported_provider(self) -> str:
        provider = self.provider_name
        if provider not in {"google_vision", "paddleocr"}:
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

        if provider == "google_vision":
            if self._google_provider is None:
                self._google_provider = GoogleVisionOCRProvider()
            self._google_provider.initialize()
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
        if provider == "google_vision":
            return self._google_provider is not None and self._google_provider.is_ready
        return self._initialized and self._engine is not None

    def process_image(self, image: np.ndarray, lang: str = "en") -> RawOCRResult:
        """
        Synchronous OCR inference handler.
        Processes an OpenCV BGR numpy matrix and returns structured RawOCRResult.
        """
        start_time = time.perf_counter()

        provider = self._require_supported_provider()
        if provider == "google_vision":
            if self._google_provider is None:
                self._google_provider = GoogleVisionOCRProvider()
            return self._google_provider.process_image(image)

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
