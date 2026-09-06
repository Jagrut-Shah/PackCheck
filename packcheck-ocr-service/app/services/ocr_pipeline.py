"""
PackCheck AI - Full OCR Pipeline Orchestrator Service.
Connects image retrieval -> OpenCV preprocessing -> configured OCR provider -> postprocessing mapping
into a unified, end-to-end, resilient execution pipeline.
"""

import time
from typing import Optional

from app.schemas.request import OCRRequest
from app.schemas.response import OCRResult
from app.services.image_fetcher import image_fetcher, ImageFetcherService
from app.services.cv_preprocessor import cv_preprocessor, CVPreprocessorService
from app.core.ocr_engine import ocr_engine, OCREngineManager
from app.services.postprocessor import postprocessor, PostprocessorService
from app.utils.logger import logger
from app.core.exceptions import OCREception, OCRExecutionError


class OCRPipelineService:
    """End-to-End OCR Pipeline Orchestrator."""

    def __init__(
        self,
        fetcher: ImageFetcherService = image_fetcher,
        preprocessor: CVPreprocessorService = cv_preprocessor,
        engine: OCREngineManager = ocr_engine,
        mapper: PostprocessorService = postprocessor,
    ):
        self.fetcher = fetcher
        self.preprocessor = preprocessor
        self.engine = engine
        self.mapper = mapper

    async def process_ocr_request(self, request: OCRRequest) -> OCRResult:
        """
        Executes the complete 5-stage pipeline:
        1. Fetch image binary & decode to OpenCV Mat
        2. Apply OpenCV downscaling, CLAHE contrast, bilateral denoise, and deskew correction
        3. Run configured OCR provider text detection & recognition inference
        4. Re-project bounding boxes & map raw text to canonical OCRResult schema
        5. Return populated OCRResult response model
        """
        pipeline_start = time.perf_counter()

        logger.info(
            f"Starting OCR processing pipeline for inspection={request.inspectionId}, image={request.imageId}",
            extra={
                "inspection_id": request.inspectionId,
                "image_id": request.imageId,
                "location": request.imageLocation,
            }
        )

        try:
            # ----------------------------------------------------------------
            # STAGE 1: Image Fetching & Decoding
            # ----------------------------------------------------------------
            t0 = time.perf_counter()
            image_mat, image_fmt, size_bytes = await self.fetcher.fetch_and_decode(
                request.imageLocation
            )
            fetch_time_ms = round((time.perf_counter() - t0) * 1000, 2)

            # ----------------------------------------------------------------
            # STAGE 2: OpenCV Preprocessing (Downscaling, CLAHE, Denoise, Deskew)
            # ----------------------------------------------------------------
            t1 = time.perf_counter()
            prep_result = self.preprocessor.preprocess(
                image=image_mat,
                options=request.options
            )
            preprocess_time_ms = round((time.perf_counter() - t1) * 1000, 2)

            # ----------------------------------------------------------------
            # STAGE 3: PaddleOCR Neural Inference
            # ----------------------------------------------------------------
            t2 = time.perf_counter()
            lang = request.options.languages[0] if request.options and request.options.languages else "en"
            # OCR.space receives the original decoded image to avoid changing label detail;
            # PaddleOCR retains its existing preprocessed input and coordinate scaling.
            is_ocr_space = self.engine.provider_name == "ocr_space"
            raw_ocr_result = await self.engine.async_process_image(
                image=image_mat if is_ocr_space else prep_result.processed_image,
                lang=lang
            )
            inference_time_ms = round((time.perf_counter() - t2) * 1000, 2)

            # ----------------------------------------------------------------
            # STAGE 4: Postprocessing & Result Mapping
            # ----------------------------------------------------------------
            t3 = time.perf_counter()
            total_pipeline_ms = round((time.perf_counter() - pipeline_start) * 1000, 2)

            final_result = self.mapper.map_to_ocr_result(
                raw_ocr_result=raw_ocr_result,
                inspection_id=request.inspectionId,
                image_id=request.imageId,
                scale_x=1.0 if is_ocr_space else prep_result.scale_x,
                scale_y=1.0 if is_ocr_space else prep_result.scale_y,
                processing_time_ms=total_pipeline_ms
            )
            map_time_ms = round((time.perf_counter() - t3) * 1000, 2)

            logger.info(
                f"Successfully completed OCR pipeline for image {request.imageId} in {total_pipeline_ms}ms "
                f"(fetch={fetch_time_ms}ms, prep={preprocess_time_ms}ms, ocr={inference_time_ms}ms, map={map_time_ms}ms)",
                extra={
                    "inspection_id": request.inspectionId,
                    "image_id": request.imageId,
                    "items_count": len(final_result.detectedTextItems),
                    "overall_confidence": final_result.overallConfidence,
                    "timing_breakdown": {
                        "fetch_ms": fetch_time_ms,
                        "preprocess_ms": preprocess_time_ms,
                        "inference_ms": inference_time_ms,
                        "map_ms": map_time_ms,
                        "total_ms": total_pipeline_ms,
                    }
                }
            )

            return final_result

        except OCREception:
            # Re-raise domain-specific exceptions directly (handled by FastAPI exception handlers)
            raise

        except Exception as exc:
            logger.exception(
                f"Unexpected error executing OCR pipeline for image {request.imageId}: {str(exc)}",
                extra={
                    "inspection_id": request.inspectionId,
                    "image_id": request.imageId,
                }
            )
            raise OCRExecutionError(
                message=f"An unexpected internal error occurred during OCR pipeline execution: {str(exc)}",
                details={"error": str(exc)}
            )


# Export singleton pipeline instance
ocr_pipeline = OCRPipelineService()
