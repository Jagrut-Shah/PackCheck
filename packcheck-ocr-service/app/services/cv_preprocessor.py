"""
PackCheck AI - OpenCV Preprocessing Service.
Provides adaptive resolution downscaling, CLAHE contrast enhancement, bilateral denoising,
and deskew angle rotation correction with spatial scale tracking.
"""

import time
from dataclasses import dataclass
from typing import Tuple

import cv2
import numpy as np

from app.config import settings
from app.schemas.request import OCROptions
from app.utils.logger import logger


@dataclass
class PreprocessedImageResult:
    """Dataclass holding preprocessed matrix and coordinate scaling factors."""
    processed_image: np.ndarray
    original_width: int
    original_height: int
    processed_width: int
    processed_height: int
    scale_x: float  # original_width / processed_width
    scale_y: float  # original_height / processed_height
    skew_angle_deg: float


class CVPreprocessorService:
    """Computer Vision Preprocessing Engine powered by OpenCV."""

    def __init__(
        self,
        max_dimension: int = settings.MAX_IMAGE_DIMENSION,
        max_deskew_angle: float = settings.MAX_DESKEW_ANGLE_DEG,
        clahe_clip_limit: float = 2.0,
        clahe_tile_grid_size: Tuple[int, int] = (8, 8),
        denoise_d: int = 5,
        denoise_sigma_color: float = 75.0,
        denoise_sigma_space: float = 75.0,
    ):
        self.max_dimension = max_dimension
        self.max_deskew_angle = max_deskew_angle
        self.clahe_clip_limit = clahe_clip_limit
        self.clahe_tile_grid_size = clahe_tile_grid_size
        self.denoise_d = denoise_d
        self.denoise_sigma_color = denoise_sigma_color
        self.denoise_sigma_space = denoise_sigma_space

    def downscale_resolution(self, image: np.ndarray) -> Tuple[np.ndarray, float, float]:
        """
        Adaptive resolution downscaler.
        Downscales image resolution if max dimension exceeds self.max_dimension (3072px default).
        Preserves fine-print readability and aspect ratio, returning (scaled_image, scale_x, scale_y).
        """
        orig_h, orig_w = image.shape[:2]

        if max(orig_w, orig_h) <= self.max_dimension:
            return image, 1.0, 1.0

        if orig_w >= orig_h:
            new_w = self.max_dimension
            new_h = int(round(orig_h * (self.max_dimension / orig_w)))
        else:
            new_h = self.max_dimension
            new_w = int(round(orig_w * (self.max_dimension / orig_h)))

        # Ensure dimensions are at least 1 pixel
        new_w = max(1, new_w)
        new_h = max(1, new_h)

        scaled_image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        scale_x = orig_w / new_w
        scale_y = orig_h / new_h

        return scaled_image, scale_x, scale_y

    def enhance_contrast_clahe(self, image: np.ndarray) -> np.ndarray:
        """
        Applies Contrast Limited Adaptive Histogram Equalization (CLAHE)
        to the L (lightness) channel in LAB color space to enhance text contrast.
        """
        if len(image.shape) == 2:
            # Grayscale image
            clahe = cv2.createCLAHE(
                clipLimit=self.clahe_clip_limit,
                tileGridSize=self.clahe_tile_grid_size
            )
            return clahe.apply(image)

        # Color image (BGR)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        clahe = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit,
            tileGridSize=self.clahe_tile_grid_size
        )
        l_enhanced = clahe.apply(l_channel)

        enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        return enhanced_bgr

    def denoise_bilateral(self, image: np.ndarray) -> np.ndarray:
        """
        Applies OpenCV bilateral filter to smooth background noise while preserving sharp text edges.
        """
        return cv2.bilateralFilter(
            image,
            d=self.denoise_d,
            sigmaColor=self.denoise_sigma_color,
            sigmaSpace=self.denoise_sigma_space
        )

    def deskew_correction(self, image: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Detects image skew angle using minAreaRect on binary text contours.
        Applies affine rotation correction strictly within safety guardrails (0.5° <= |angle| <= 15.0°).
        Ignores extreme angles (> 15.0°) to prevent distorting curved packaging or non-rectangular labels.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Otsu thresholding to separate text foreground
        _, thresh = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # Find non-zero foreground pixel coordinates
        coords = np.column_stack(np.where(thresh > 0))
        if coords.shape[0] < 50:
            # Not enough text pixels detected to compute skew
            return image, 0.0

        # Compute minimum area bounding box enclosing text pixels
        angle = cv2.minAreaRect(coords)[-1]

        # Normalize angle output from minAreaRect [-90, 0]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Safety Guard: Ignore insignificant noise (<0.5°) or extreme angles (>15.0°) that warp curved packaging
        if abs(angle) < 0.5 or abs(angle) > self.max_deskew_angle:
            return image, 0.0

        # Rotate matrix around center point
        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)

        rotated_image = cv2.warpAffine(
            image,
            rotation_matrix,
            (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )

        return rotated_image, round(float(angle), 2)

    def preprocess(
        self,
        image: np.ndarray,
        options: OCROptions = None
    ) -> PreprocessedImageResult:
        """
        Main pipeline orchestrator executing downscaling, CLAHE, denoising,
        and deskew correction based on OCROptions.
        """
        start_time = time.perf_counter()
        if options is None:
            options = OCROptions()

        orig_h, orig_w = image.shape[:2]

        # Stage 1: Adaptive resolution downscaling (always checked)
        processed, scale_x, scale_y = self.downscale_resolution(image)

        # Stage 2: CLAHE Contrast Enhancement
        if options.contrastEnhancement:
            processed = self.enhance_contrast_clahe(processed)

        # Stage 3: Bilateral Denoising
        if options.denoise:
            processed = self.denoise_bilateral(processed)

        # Stage 4: Deskew Rotation Correction with Safety Guardrails
        skew_angle = 0.0
        if options.deskew:
            processed, skew_angle = self.deskew_correction(processed)

        proc_h, proc_w = processed.shape[:2]
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            f"Preprocessed image ({orig_w}x{orig_h} -> {proc_w}x{proc_h}, scale_x={scale_x:.3f}, scale_y={scale_y:.3f}, skew={skew_angle}°) in {elapsed_ms}ms",
            extra={
                "orig_w": orig_w,
                "orig_h": orig_h,
                "proc_w": proc_w,
                "proc_h": proc_h,
                "scale_x": scale_x,
                "scale_y": scale_y,
                "skew_angle": skew_angle,
                "duration_ms": elapsed_ms,
            }
        )

        return PreprocessedImageResult(
            processed_image=processed,
            original_width=orig_w,
            original_height=orig_h,
            processed_width=proc_w,
            processed_height=proc_h,
            scale_x=scale_x,
            scale_y=scale_y,
            skew_angle_deg=skew_angle,
        )


# Export singleton preprocessor instance
cv_preprocessor = CVPreprocessorService()
