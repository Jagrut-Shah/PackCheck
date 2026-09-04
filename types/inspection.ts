/**
 * PackCheck AI - Inspection Aggregate Contract
 * Core data structure tracking the full inspection lifecycle across all micro-services.
 * The inspection is the main aggregate connecting Image Ingestion, OCR, Extraction, Compliance, and Reporting.
 */

import { InspectionStatus, OverallResult } from "./common";
import { InspectionImage, PackageImage } from "./image";
import { OCRResult } from "./ocr";
import { ExtractedDeclarations } from "./extraction";
import { ComplianceEvaluation, ComplianceRun } from "./compliance";
import { ComplianceFinding, Finding } from "./finding";

export type CommodityCategory =
  | "FOOD_AND_BEVERAGES"
  | "EDIBLE_OILS"
  | "PHARMACEUTICALS_AND_HEALTH"
  | "COSMETICS_AND_PERSONAL_CARE"
  | "ELECTRONICS_AND_APPLIANCES"
  | "CLEANING_AND_HOUSEHOLD"
  | "APPAREL_AND_TEXTILES"
  | "GENERAL_COMMODITY";

export type InspectionType =
  | "ROUTINE_MARKET_SURVEILLANCE"
  | "CONSUMER_GRIEVANCE_AUDIT"
  | "FACTORY_PRE_PACK_INSPECTION"
  | "CUSTOMS_IMPORT_CLEARANCE";

export interface CommodityMetadata {
  commodityName: string;
  brandName?: string;
  category: CommodityCategory;
  declaredNetQuantity?: string;
  declaredMRP?: number;
  manufacturerName?: string;
  barcodeNumber?: string;
  batchNumber?: string;
}

/**
 * Main Canonical Inspection Aggregate.
 */
export interface InspectionRecord {
  id: string;
  inspectionNumber: string; // e.g. "INS-2026-0891"
  company: string;          // Manufacturer / Pre-Packer / Importer name
  product: string;          // Commodity / Generic trade name
  productCategory: CommodityCategory;
  inspectionDate: string;   // ISO 8601
  location: string;         // Retail / Warehouse inspection premises
  inspectionType: InspectionType | string;
  inspector: string;        // Inspector Name or ID
  department: string;       // Department / Enforcement Wing
  status: InspectionStatus;
  overallResult?: OverallResult;
  images: InspectionImage[];
  extractedFields?: ExtractedDeclarations;
  complianceSummary?: ComplianceRun;
  findings: Finding[];
  timestamps: {
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  };

  // Backwards compatibility properties for existing UI components
  createdAt: string;
  updatedAt: string;
  inspectorId: string;
  inspectorName: string;
  jurisdiction: string;
  commodity: CommodityMetadata;
  ocrResults: OCRResult[];
  extractedDeclarations?: ExtractedDeclarations;
  complianceEvaluation?: ComplianceEvaluation;
  reportId?: string;
  inspectorNotes?: string;
}

export interface CreateInspectionInput {
  commodityName: string;
  brandName?: string;
  category: CommodityCategory;
  manufacturerName?: string;
  notes?: string;
  location?: string;
  inspectionType?: InspectionType | string;
}

export interface InspectionFilterParams {
  status?: InspectionStatus;
  result?: OverallResult;
  category?: CommodityCategory;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}
