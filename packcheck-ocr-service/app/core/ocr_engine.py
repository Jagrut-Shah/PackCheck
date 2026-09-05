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
            from paddleocr import PaddleOCR
            self._engine = PaddleOCR(
                use_angle_cls=True,
                lang=lang,
                use_gpu=use_gpu,
                show_log=False
            )
            self._initialized = True
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(f"PaddleOCR engine successfully initialized in {elapsed_ms}ms.")
        except Exception as exc:
            logger.warning(
                f"Native PaddleOCR engine failed to initialize ({str(exc)}). Operating in fallback detection mode."
            )
            self._engine = None
            self._initialized = False

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
            # Fallback mock detector for lightweight CI/CD or uninitialized runtime
            return self._mock_fallback_detection(image, start_time)

        try:
            # Execute PaddleOCR inference
            ocr_output = self._engine.ocr(image, cls=True)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            detections: List[RawOCRDetection] = []

            # Handle case where no text is detected (ocr_output is None or [None])
            if ocr_output and len(ocr_output) > 0 and ocr_output[0] is not None:
                for line in ocr_output[0]:
                    polygon_coords_raw, (text_str, conf_score) = line

                    # Format polygon coordinates as list of float tuples [(x1,y1), (x2,y2), ...]
                    polygon: List[Tuple[float, float]] = [
                        (float(pt[0]), float(pt[1])) for pt in polygon_coords_raw
                    ]

                    detections.append(
                        RawOCRDetection(
                            polygon=polygon,
                            text=str(text_str).strip(),
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
                engine_version=settings.PADDLE_OCR_MODEL_VERSION,
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
