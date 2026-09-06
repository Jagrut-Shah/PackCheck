"""
PackCheck AI - PaddleOCR Neural Engine Integration Service.
Encapsulates PaddleOCR initialization, inference execution, and raw detection extraction.
Uses a dedicated bounded ThreadPoolExecutor to prevent thread explosion under high concurrency.
"""

import os
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
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
    """Aggregated raw detection output returned by PaddleOCR engine."""
    detections: List[RawOCRDetection] = field(default_factory=list)
    engine_name: str = "PaddleOCR"
    engine_version: str = settings.PADDLE_OCR_MODEL_VERSION
    inference_time_ms: float = 0.0


class OCREngineManager:
    """
    Singleton Manager for PaddleOCR Neural Network Engine.
    Handles model weight loading, GPU/CPU configuration, and bounded thread pool inference.
    """

    _instance: Optional["OCREngineManager"] = None
    _engine = None
    _initialized: bool = False
    _executor: Optional[ThreadPoolExecutor] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCREngineManager, cls).__new__(cls)
            # Create dedicated bounded ThreadPoolExecutor for heavy OCR matrix operations
            cls._instance._executor = ThreadPoolExecutor(
                max_workers=settings.NUM_OCR_WORKERS,
                thread_name_prefix="paddle_ocr_worker"
            )
        return cls._instance

    def initialize_engine(self, lang: str = "en", use_gpu: bool = settings.USE_GPU) -> None:
        """
        Pre-warms PaddleOCR neural network model weights into memory during app startup.
        """
        if self._initialized and self._engine is not None:
            return

        start_time = time.perf_counter()
        logger.info(
            f"Initializing PaddleOCR engine (version={settings.PADDLE_OCR_MODEL_VERSION}, lang={lang}, gpu={use_gpu}, workers={settings.NUM_OCR_WORKERS})..."
        )

        try:
            # Set environment flags to prevent hoster check stalls
            os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

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
                use_textline_orientation=True
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
        return self._initialized and self._engine is not None

    def process_image(self, image: np.ndarray, lang: str = "en") -> RawOCRResult:
        """
        Synchronous OCR inference handler.
        Processes an OpenCV BGR numpy matrix and returns structured RawOCRResult.
        """
        start_time = time.perf_counter()

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
