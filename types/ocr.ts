/**
 * PackCheck AI - OCR Service Integration Contracts
 * Explicit interface between Image Ingestion and the OCR Service (PaddleOCR / Vision Pipeline).
 */

import { BoundingBox, BoundingBoxTuple, ConfidenceLevel, ProcessingStatus } from "./common";

/**
 * Single detected text token/line with canonical coordinates.
 */
export interface OCRTextItem {
  id?: string;
  text: string;
  confidence: number; // 0.0 - 1.0
  confidenceLevel?: ConfidenceLevel;
  /**
   * Canonical bounding box tuple format: [x, y, width, height]
   */
  boundingBox: BoundingBoxTuple | BoundingBox;
  lineIndex?: number;
  blockType?: "TEXT" | "NUMERIC" | "BARCODE" | "QR" | "SYMBOL" | string;
}

/**
 * Backwards-compatible block structure for UI bounding-box rendering.
 */
export interface OCRTextBlock {
  id: string;
  text: string;
  confidence: number; // 0.0 - 1.0
  confidenceLevel: ConfidenceLevel;
  boundingBox: BoundingBox;
  polygonPoints?: [number, number][];
  lineNumber?: number;
  blockType?: "TEXT" | "NUMERIC" | "BARCODE" | "QR" | "SYMBOL";
}

/**
 * Inbound request contract sent to OCR service.
 */
export interface OCRRequest {
  inspectionId: string;
  imageId: string;
  imageLocation: string; // Storage URL, file path, or object key
  options?: {
    deskew?: boolean;
    denoise?: boolean;
    contrastEnhancement?: boolean;
    languages?: string[];
  };
}

export type OCRProcessingRequest = OCRRequest;

/**
 * Outbound response contract returned by the OCR service.
 * Consumed by the AI Extraction module.
 */
export interface OCRResponse {
  inspectionId: string;
  imageId: string;
  engine: string;           // e.g. "PaddleOCR"
  engineVersion: string;    // e.g. "v2.7.3"
  processingStatus: ProcessingStatus;
  rawText: string;
  overallConfidence: number; // 0.0 to 1.0
  detectedTextItems: OCRTextItem[];

  // Backwards compatibility properties
  id?: string;
  blocks?: OCRTextBlock[];
  averageConfidence?: number;
  processingTimeMs?: number;
  detectedLanguages?: string[];
  processedAt?: string;
}

/**
 * Alias for OCRResponse ensuring backwards compatibility with existing UI components.
 */
export type OCRResult = OCRResponse & {
  id: string;
  blocks: OCRTextBlock[];
};
