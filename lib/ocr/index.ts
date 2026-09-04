/**
 * PackCheck AI - OCR Integration Client
 * Owner: Arwa (OCR / Computer Vision)
 * Purpose: Connects Next.js backend to Arwa's Python FastAPI PaddleOCR microservice.
 * Core Workflow: Image input -> Preprocessing -> PaddleOCR -> text, confidence, bounding boxes.
 */

import { OCRResult, OCRProcessingRequest } from "@/types/ocr";
import { MOCK_OCR_AMUL_GHEE } from "@/mocks/ocr";

export async function processImageOCR(
  _request: OCRProcessingRequest
): Promise<OCRResult> {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;

  // If OCR microservice is not configured, return realistic mock OCR result
  if (!ocrServiceUrl || ocrServiceUrl.includes("localhost:8000")) {
    return MOCK_OCR_AMUL_GHEE;
  }

  throw new Error("OCR Service connection to be implemented in integration phase.");
}
