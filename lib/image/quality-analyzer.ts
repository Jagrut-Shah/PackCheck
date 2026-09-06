/**
 * PackCheck AI - Image Quality Analyzer
 * Evaluates photographic packaging evidence for clarity, lighting, glare, and resolution
 * before OCR processing. Runs client-side on raw pixel data using an off-screen HTML5 Canvas.
 */

import { ImageQualityMetrics } from "@/lib/types/image";

export type ImageQualityRating = "CHECKING" | "GOOD" | "BORDERLINE" | "POOR" | "UNAVAILABLE";

export interface ImageQualityAnalysisResult {
  status: "GOOD" | "BORDERLINE" | "POOR" | "UNAVAILABLE";
  score: number; // 0.0 to 1.0 normalized
  reasons: string[]; // Plain-English friendly explanations
  metrics: ImageQualityMetrics;
}

/**
 * Pure pixel-level analysis on RGBA buffer.
 * Can be run in both browser Canvas context and Node.js environments.
 */
export function analyzePixelData(
  rgba: Uint8ClampedArray | Buffer | number[],
  width: number,
  height: number
): ImageQualityAnalysisResult {
  try {
    const totalPixels = width * height;
    if (totalPixels === 0 || rgba.length < totalPixels * 4) {
      return {
        status: "UNAVAILABLE",
        score: 0,
        reasons: ["Unable to analyze image data."],
        metrics: { blur: 0, brightness: 0, glare: 0, resolution: 0, readability: 0 },
      };
    }

    const reasons: string[] = [];

    // ------------------------------------------------------------------------
    // 1. RESOLUTION ASSESSMENT
    // ------------------------------------------------------------------------
    let resolutionScore = 1.0;
    if (totalPixels < 640 * 480) {
      resolutionScore = 0.35;
      reasons.push("Image resolution is too low.");
    } else if (totalPixels < 1200 * 900) {
      resolutionScore = 0.7;
    } else {
      resolutionScore = 0.98;
    }

    // ------------------------------------------------------------------------
    // 2. BRIGHTNESS & GLARE ASSESSMENT
    // ------------------------------------------------------------------------
    let totalLuminance = 0;
    let saturatedHighlightCount = 0;
    let darkPixelCount = 0;

    // Luminance distribution bucket array (0 to 255)
    const luminanceBuckets = new Uint32Array(256);

    // Stride optimization for high-res images (up to 1 sample every 2 pixels if large)
    const stride = totalPixels > 250000 ? 2 : 1;
    let sampledCount = 0;

    // Grayscale grid for Laplacian blur check
    // We sample a grid of up to 300 x 300 for sharpness calculation
    const gridW = Math.min(width, 300);
    const gridH = Math.min(height, 300);
    const stepX = width / gridW;
    const stepY = height / gridH;
    const grayGrid = new Float32Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      const srcY = Math.floor(gy * stepY);
      for (let gx = 0; gx < gridW; gx++) {
        const srcX = Math.floor(gx * stepX);
        const idx = (srcY * width + srcX) * 4;
        const r = rgba[idx];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        grayGrid[gy * gridW + gx] = lum;
      }
    }

    // Measure overall luminance & glare across sampled image
    for (let i = 0; i < totalPixels; i += stride) {
      const idx = i * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      totalLuminance += lum;
      luminanceBuckets[Math.min(255, lum)]++;

      if (r > 248 && g > 248 && b > 248) {
        saturatedHighlightCount++;
      }
      if (lum < 30) {
        darkPixelCount++;
      }
      sampledCount++;
    }

    const avgLuminance = sampledCount > 0 ? totalLuminance / sampledCount : 128;
    const glareFraction = sampledCount > 0 ? saturatedHighlightCount / sampledCount : 0;
    const darkFraction = sampledCount > 0 ? darkPixelCount / sampledCount : 0;

    // Brightness score
    let brightnessScore = 1.0;
    if (avgLuminance < 45 || darkFraction > 0.6) {
      brightnessScore = Math.max(0.2, (avgLuminance / 45) * 0.5);
      reasons.push("Image is too dark.");
    } else if (avgLuminance > 225) {
      brightnessScore = 0.4;
      reasons.push("Image is washed out or overexposed.");
    } else if (avgLuminance < 65) {
      brightnessScore = 0.68;
    } else {
      brightnessScore = 0.95;
    }

    // Glare score
    let glareScore = 1.0;
    if (glareFraction > 0.08) {
      glareScore = 0.35;
      reasons.push("Important package details are obscured by glare.");
    } else if (glareFraction > 0.04) {
      glareScore = 0.65;
      reasons.push("Moderate glare detected on package surface.");
    } else {
      glareScore = 0.96;
    }

    // ------------------------------------------------------------------------
    // 3. BLUR & EDGE SHARPNESS (Discrete Laplacian Operator Variance)
    // ------------------------------------------------------------------------
    let laplacianSum = 0;
    let laplacianSqSum = 0;
    let edgeCount = 0;

    for (let y = 1; y < gridH - 1; y++) {
      const rowOffset = y * gridW;
      const prevRowOffset = (y - 1) * gridW;
      const nextRowOffset = (y + 1) * gridW;

      for (let x = 1; x < gridW - 1; x++) {
        // Standard 2D discrete 5-point Laplacian kernel:
        // [  0, -1,  0 ]
        // [ -1,  4, -1 ]
        // [  0, -1,  0 ]
        const center = grayGrid[rowOffset + x];
        const top = grayGrid[prevRowOffset + x];
        const bottom = grayGrid[nextRowOffset + x];
        const left = grayGrid[rowOffset + (x - 1)];
        const right = grayGrid[rowOffset + (x + 1)];

        const lap = 4 * center - (top + bottom + left + right);
        laplacianSum += lap;
        laplacianSqSum += lap * lap;
        edgeCount++;
      }
    }

    let laplacianVariance = 0;
    if (edgeCount > 0) {
      const meanLap = laplacianSum / edgeCount;
      laplacianVariance = laplacianSqSum / edgeCount - meanLap * meanLap;
    }

    let blurScore = 1.0;
    if (laplacianVariance < 55) {
      blurScore = Math.max(0.2, (laplacianVariance / 55) * 0.5);
      reasons.push("Image is too blurry.");
    } else if (laplacianVariance < 110) {
      blurScore = 0.68;
      if (!reasons.some((r) => r.includes("blurry"))) {
        reasons.push("Package details are difficult to read.");
      }
    } else {
      blurScore = 0.95;
    }

    // ------------------------------------------------------------------------
    // 4. READABILITY & CONTRAST
    // ------------------------------------------------------------------------
    let p5 = 0;
    let p95 = 255;
    let acc = 0;
    const target5 = sampledCount * 0.05;
    const target95 = sampledCount * 0.95;

    for (let b = 0; b < 256; b++) {
      acc += luminanceBuckets[b];
      if (p5 === 0 && acc >= target5) p5 = b;
      if (p95 === 255 && acc >= target95) {
        p95 = b;
        break;
      }
    }

    const dynamicRange = p95 - p5;
    let readabilityScore = 1.0;
    if (dynamicRange < 55) {
      readabilityScore = 0.4;
      if (!reasons.some((r) => r.includes("difficult to read") || r.includes("dark"))) {
        reasons.push("Package details are difficult to read.");
      }
    } else if (dynamicRange < 90) {
      readabilityScore = 0.72;
    } else {
      readabilityScore = 0.96;
    }

    // ------------------------------------------------------------------------
    // 5. AGGREGATE WEIGHTED SCORE & STATUS CLASSIFICATION
    // ------------------------------------------------------------------------
    const compositeScore =
      0.35 * blurScore +
      0.25 * brightnessScore +
      0.20 * glareScore +
      0.20 * resolutionScore;

    const roundedScore = Math.round(compositeScore * 100) / 100;

    let status: "GOOD" | "BORDERLINE" | "POOR";

    if (
      compositeScore >= 0.75 &&
      blurScore >= 0.55 &&
      brightnessScore >= 0.55 &&
      glareScore >= 0.55 &&
      resolutionScore >= 0.55
    ) {
      status = "GOOD";
      reasons.length = 0; // Clear mild reasons if overall high grade
    } else if (
      compositeScore >= 0.55 &&
      blurScore >= 0.35 &&
      brightnessScore >= 0.35 &&
      glareScore >= 0.35
    ) {
      status = "BORDERLINE";
    } else {
      status = "POOR";
    }

    // Deduplicate reasons
    const uniqueReasons = Array.from(new Set(reasons));

    return {
      status,
      score: roundedScore,
      reasons: uniqueReasons,
      metrics: {
        blur: Math.round(blurScore * 100) / 100,
        brightness: Math.round(brightnessScore * 100) / 100,
        glare: Math.round(glareScore * 100) / 100,
        resolution: Math.round(resolutionScore * 100) / 100,
        readability: Math.round(readabilityScore * 100) / 100,
        issuesDetected: uniqueReasons,
      },
    };
  } catch (err) {
    console.error("Error analyzing image pixel data:", err);
    return {
      status: "UNAVAILABLE",
      score: 0,
      reasons: ["Quality check could not be completed."],
      metrics: { blur: 0, brightness: 0, glare: 0, resolution: 0, readability: 0 },
    };
  }
}

/**
 * Analyzes a File or Blob in the browser by loading it onto an off-screen canvas.
 */
export async function analyzeImageQuality(
  file: File | Blob
): Promise<ImageQualityAnalysisResult> {
  if (typeof window === "undefined") {
    return {
      status: "GOOD",
      score: 0.9,
      reasons: [],
      metrics: { blur: 0.9, brightness: 0.9, glare: 0.9, resolution: 0.9, readability: 0.9 },
    };
  }

  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new window.Image();

      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || 640;
          const naturalH = img.naturalHeight || 480;

          // Scale to a maximum canvas dimension of 500px for speed and consistency
          const maxDim = 500;
          let canvasW = naturalW;
          let canvasH = naturalH;
          if (canvasW > maxDim || canvasH > maxDim) {
            if (canvasW > canvasH) {
              canvasH = Math.round((canvasH * maxDim) / canvasW);
              canvasW = maxDim;
            } else {
              canvasW = Math.round((canvasW * maxDim) / canvasH);
              canvasH = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = canvasW;
          canvas.height = canvasH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (!ctx) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve({
              status: "UNAVAILABLE",
              score: 0,
              reasons: ["Canvas rendering is unavailable."],
              metrics: { blur: 0, brightness: 0, glare: 0, resolution: 0, readability: 0 },
            });
            return;
          }

          ctx.drawImage(img, 0, 0, canvasW, canvasH);
          const imageData = ctx.getImageData(0, 0, canvasW, canvasH);

          if (objectUrl) URL.revokeObjectURL(objectUrl);

          // Note: pass actual natural resolution for resolution scoring
          const result = analyzePixelData(imageData.data, naturalW, naturalH);
          resolve(result);
        } catch (e) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          console.error("Canvas pixel extraction failed:", e);
          resolve({
            status: "UNAVAILABLE",
            score: 0,
            reasons: ["Quality check could not be completed."],
            metrics: { blur: 0, brightness: 0, glare: 0, resolution: 0, readability: 0 },
          });
        }
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve({
          status: "UNAVAILABLE",
          score: 0,
          reasons: ["Image file could not be read or decoded."],
          metrics: { blur: 0, brightness: 0, glare: 0, resolution: 0, readability: 0 },
        });
      };

      img.src = objectUrl;
    } catch (err) {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
      console.error("analyzeImageQuality initialization error:", err);
      resolve({
        status: "UNAVAILABLE",
        score: 0,
        reasons: ["Image analysis failed."],
        metrics: { blur: 0, brightness: 0, glare: 0, resolution: 0, readability: 0 },
      });
    }
  });
}
