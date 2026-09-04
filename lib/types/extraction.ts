/**
 * PackCheck AI - AI Structured Extraction Contracts & Inspector Correction
 * Explicit interface for transforming raw OCR outputs into Legal Metrology statutory fields.
 * Produced by AI extraction service; consumed by Inspector Review and Compliance Engine.
 */

import { BoundingBox, BoundingBoxTuple, ConfidenceLevel } from "./common";

/**
 * Standardized declaration field names recognized under Legal Metrology Rules, 2011.
 */
export type StatutoryFieldName =
  | "productName"
  | "manufacturer"
  | "packer"
  | "importer"
  | "address"
  | "countryOfOrigin"
  | "netQuantity"
  | "netQuantityUnit"
  | "mrp"
  | "mrpIncludesTaxes"
  | "manufacturingDate"
  | "packingDate"
  | "importDate"
  | "bestBefore"
  | "useBy"
  | "consumerCare"
  | "unitSalePrice"
  | "dimensions";

/**
 * Generic canonical extracted declaration field contract.
 */
export interface ExtractedField<T = unknown> {
  field?: StatutoryFieldName | string;
  fieldName?: StatutoryFieldName | string;
  value: T;
  rawValue?: string;
  normalizedValue?: T;
  unit?: string;
  confidence: number;            // 0.0 - 1.0 (alias)
  confidenceScore?: number;       // 0.0 - 1.0
  confidenceLevel: ConfidenceLevel;
  sourceImageId?: string;
  sourceBoundingBox?: BoundingBoxTuple | BoundingBox;
  boundingBox?: BoundingBox;      // backwards compatibility
  sourceType?: "OCR_TEXT" | "BARCODE" | "QR_CODE" | "TABLE" | "IMAGE_REGION" | string;
  verified?: boolean;
  isInspectorOverridden?: boolean;
  originalExtractedValue?: T;
  overrideNotes?: string;
}

// ============================================================================
// TYPED DECLARATION PAYLOADS
// ============================================================================

export interface NetQuantityDeclaration {
  declaredQuantity: number;
  unit: "g" | "kg" | "ml" | "l" | "m" | "cm" | "mm" | "sq_m" | "sq_cm" | "pieces" | "units" | "N" | string;
  isStandardUnit: boolean;
  rawText: string;
}

export interface DateDeclaration {
  month?: number;
  year?: number;
  formattedText: string;
  declarationType: "MANUFACTURE" | "PACKING" | "IMPORT" | "BEST_BEFORE" | "USE_BY";
}

export interface MRPDeclaration {
  amountInRupees: number;
  isInclusiveOfAllTaxes: boolean;
  rawText: string;
  currencySymbol: "₹" | "Rs" | "INR" | string;
}

export interface UnitSalePriceDeclaration {
  amountInRupees: number;
  unit: string;
  rawText: string;
  isDeclared: boolean;
}

export interface ConsumerCareDeclaration {
  contactPersonOrDesignation?: string;
  address?: string;
  telephoneOrMobile?: string;
  email?: string;
  website?: string;
  rawText: string;
}

export interface ManufacturerPackerDeclaration {
  name: string;
  address: string;
  pincode?: string;
  role: "MANUFACTURER" | "PACKER" | "IMPORTER" | "MANUFACTURED_AND_PACKED_BY";
  rawText: string;
}

/**
 * Complete set of structured package declarations under Rule 6.
 */
export interface ExtractedDeclarations {
  commodityName: ExtractedField<string>;
  brandName?: ExtractedField<string>;
  manufacturerOrPacker: ExtractedField<ManufacturerPackerDeclaration>;
  netQuantity: ExtractedField<NetQuantityDeclaration>;
  manufacturingOrPackingDate: ExtractedField<DateDeclaration>;
  expiryOrBestBeforeDate?: ExtractedField<DateDeclaration>;
  mrp: ExtractedField<MRPDeclaration>;
  unitSalePrice?: ExtractedField<UnitSalePriceDeclaration>;
  consumerCare: ExtractedField<ConsumerCareDeclaration>;
  countryOfOrigin?: ExtractedField<string>;
  sizesOrDimensions?: ExtractedField<string>;
  rawExtractedJson?: Record<string, unknown>;
  extractedAt: string; // ISO 8601
  modelUsed?: string;
}

// ============================================================================
// INSPECTOR CORRECTION CONTRACT
// ============================================================================

/**
 * Statutory correction payload submitted by an authorized Inspector.
 * Corrected values override AI extraction and trigger deterministic re-evaluation.
 */
export interface FieldCorrection {
  fieldId: string;
  inspectionId: string;
  fieldName: StatutoryFieldName | string;
  oldValue: unknown;
  newValue: unknown;
  correctedBy: string;       // Inspector ID or Officer Badge Number
  correctionReason: string;  // Inspector justification
  correctedTimestamp: string; // ISO 8601
}

export type InspectorCorrectionInput = FieldCorrection;
