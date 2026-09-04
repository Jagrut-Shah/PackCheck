/**
 * PackCheck AI - Common Type System & Shared Status Enums
 * Single Source of Truth for core lifecycle states across Frontend, Backend, OCR, AI Extraction, Compliance, and Reporting.
 */

// ============================================================================
// SHARED STATUS CONSTANTS & ENUMS
// ============================================================================

/**
 * Inspection aggregate lifecycle states.
 */
export const INSPECTION_STATUS = {
  DRAFT: "DRAFT",
  PROCESSING: "PROCESSING",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  COMPLETED: "COMPLETED",
} as const;

export type InspectionStatus = (typeof INSPECTION_STATUS)[keyof typeof INSPECTION_STATUS];

/**
 * Overall statutory compliance verdict for packaged commodities under
 * Legal Metrology (Packaged Commodities) Rules, 2011.
 * Determined deterministically by the Compliance Engine.
 */
export const OVERALL_RESULT = {
  PASS: "PASS",
  POTENTIAL_NON_COMPLIANCE: "POTENTIAL_NON_COMPLIANCE",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;

export type OverallResult = (typeof OVERALL_RESULT)[keyof typeof OVERALL_RESULT];

/**
 * Async processing pipeline stage status (OCR, AI extraction, compliance execution).
 * Distinct from InspectionStatus.
 */
export const PROCESSING_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;

export type ProcessingStatus = (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

/**
 * Image quality assessment status before OCR ingestion.
 */
export const IMAGE_QUALITY_STATUS = {
  PENDING: "PENDING",
  PASSED: "PASSED",
  RETAKE_REQUIRED: "RETAKE_REQUIRED",
} as const;

export type ImageQualityStatus = (typeof IMAGE_QUALITY_STATUS)[keyof typeof IMAGE_QUALITY_STATUS];

/**
 * Confidence level categories used across OCR, LLM Extraction, and Rule Matching.
 */
export const CONFIDENCE_LEVEL = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVEL)[keyof typeof CONFIDENCE_LEVEL];

// ============================================================================
// DATA CONVENTIONS: BOUNDING BOX, MONEY, QUANTITY
// ============================================================================

/**
 * Canonical Bounding Box tuple: [x, y, width, height]
 * Standardized across OpenCV, PaddleOCR, AI Extraction, Evidence, and Reporting.
 */
export type BoundingBoxTuple = [x: number, y: number, width: number, height: number];

/**
 * Object representation of bounding box (for backwards compatibility).
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Helper to convert object BoundingBox to canonical tuple [x, y, width, height]
 */
export function toBoundingBoxTuple(box: BoundingBox): BoundingBoxTuple {
  return [box.x, box.y, box.width, box.height];
}

/**
 * Helper to convert canonical tuple [x, y, width, height] to object BoundingBox
 */
export function fromBoundingBoxTuple(tuple: BoundingBoxTuple): BoundingBox {
  return {
    x: tuple[0],
    y: tuple[1],
    width: tuple[2],
    height: tuple[3],
  };
}

/**
 * Canonical Money structure.
 * Prevents UI formatted strings from being passed as canonical data.
 */
export interface MonetaryAmount {
  amount: number;
  currency: "INR" | string;
}

/**
 * Canonical Quantity structure with SI standard units.
 */
export interface CommodityQuantity {
  value: number;
  unit: string;
}

// ============================================================================
// API RESPONSE & PAGINATION CONTRACTS
// ============================================================================

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standard unified API Response envelope.
 * No internal stack traces or database connection details may be exposed.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiErrorPayload;
  metadata?: {
    timestamp: string;
    requestId?: string;
    processingTimeMs?: number;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}
