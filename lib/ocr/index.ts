/**
 * PackCheck AI - Real OCR Integration Client
 * Connects Next.js backend to Python FastAPI PaddleOCR microservice.
 * Enforces X-API-Key authentication and parses canonical OCRResult responses.
 */

import { OCRResult, OCRProcessingRequest } from "@/lib/types/ocr";

export async function processImageOCR(
  request: OCRProcessingRequest
): Promise<OCRResult> {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL || "http://localhost:8000";
  const ocrApiKey = process.env.OCR_SERVICE_API_KEY;

  if (!ocrApiKey) {
    throw new Error(
      "OCR_SERVICE_API_KEY is not configured in environment. OCR service requires authentication."
    );
  }

  const endpoint = `${ocrServiceUrl.replace(/\/+$/, "")}/ocr`;

  const payload = {
    inspectionId: request.inspectionId,
    imageId: request.imageId,
    imageLocation: request.imageLocation,
    options: request.options || {
      deskew: true,
      denoise: true,
      contrastEnhancement: true,
      languages: ["en"],
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": ocrApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(
      `OCR Service HTTP ${response.status} (${response.statusText}): ${errorDetail}`
    );
  }

  const data = (await response.json()) as OCRResult;

  return {
    ...data,
    id: data.id || `ocr_${request.imageId}`,
    blocks: data.blocks || [],
  };
}
