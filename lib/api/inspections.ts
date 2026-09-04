/**
 * PackCheck AI - Inspection API Client Layer
 * Mock-first async service abstraction with client-side localStorage state persistence.
 * Ensures the entire inspector workflow (new -> processing -> review -> compliance -> evidence -> report)
 * preserves inspection state across navigation and browser reloads.
 */

import {
  InspectionRecord,
  CreateInspectionInput,
  InspectionFilterParams,
} from "@/types/inspection";
import { InspectionStatus, OverallResult, INSPECTION_STATUS, OVERALL_RESULT } from "@/types/common";
import { FieldCorrection } from "@/types/extraction";
import { InspectionImage } from "@/types/image";
import { MOCK_INSPECTIONS } from "@/mocks/inspections";
import { MOCK_EXTRACTION_AMUL_GHEE } from "@/mocks/extraction";
import { MOCK_COMPLIANCE_AMUL_GHEE } from "@/mocks/compliance";
import { CURRENT_MOCK_USER } from "@/mocks/users";

const STORAGE_KEY = "packcheck_mock_inspections_v1";

/**
 * Initialize inspections from localStorage if available, or seed from MOCK_INSPECTIONS.
 */
function getStoredInspections(): InspectionRecord[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not read mock inspections from localStorage", e);
    }
  }
  return [...MOCK_INSPECTIONS];
}

function saveStoredInspections(inspections: InspectionRecord[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));
    } catch (e) {
      console.warn("Could not persist mock inspections to localStorage", e);
    }
  }
}

/**
 * Fetch all inspections with optional filtering
 */
export async function getInspections(
  params?: InspectionFilterParams
): Promise<InspectionRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  const inspections = getStoredInspections();

  let results = [...inspections];

  if (params?.status && params.status !== ("ALL" as unknown)) {
    results = results.filter((r) => r.status === params.status);
  }

  if (params?.result && params.result !== ("ALL" as unknown)) {
    results = results.filter((r) => r.overallResult === params.result);
  }

  if (params?.category && params.category !== ("ALL" as unknown)) {
    results = results.filter(
      (r) => r.productCategory === params.category || r.commodity?.category === params.category
    );
  }

  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase().trim();
    results = results.filter(
      (r) =>
        r.inspectionNumber.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        (r.commodity?.commodityName && r.commodity.commodityName.toLowerCase().includes(q)) ||
        r.company.toLowerCase().includes(q) ||
        (r.commodity?.manufacturerName && r.commodity.manufacturerName.toLowerCase().includes(q)) ||
        (r.commodity?.brandName && r.commodity.brandName.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Fetch a single inspection by unique ID or inspection number
 */
export async function getInspectionById(id: string): Promise<InspectionRecord | null> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const inspections = getStoredInspections();
  const found = inspections.find((r) => r.id === id || r.inspectionNumber === id);
  return found ? { ...found } : null;
}

/**
 * Initialize a new inspection draft conforming strictly to InspectionRecord
 */
export async function createInspection(
  input: CreateInspectionInput,
  images?: InspectionImage[]
): Promise<InspectionRecord> {
  await new Promise((resolve) => setTimeout(resolve, 60));

  const inspections = getStoredInspections();
  const newId = `ins_${Date.now()}`;
  const inspectionNumber = `INS-2026-0${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  // Create deep clone of default extracted declarations as initial template
  const initialDeclarations = JSON.parse(JSON.stringify(MOCK_EXTRACTION_AMUL_GHEE));
  initialDeclarations.commodityName.value = input.commodityName;
  initialDeclarations.commodityName.rawValue = input.commodityName.toUpperCase();
  if (input.brandName) {
    initialDeclarations.brandName = {
      value: input.brandName,
      rawValue: input.brandName.toUpperCase(),
      confidence: 0.98,
      confidenceLevel: "HIGH",
    };
  }
  if (input.manufacturerName) {
    initialDeclarations.manufacturerOrPacker.value.name = input.manufacturerName;
    initialDeclarations.manufacturerOrPacker.value.rawText = `Mfd by: ${input.manufacturerName}`;
  }

  const newRecord: InspectionRecord = {
    id: newId,
    inspectionNumber,
    company: input.manufacturerName || "Pre-Packer Not Registered",
    product: input.commodityName,
    productCategory: input.category,
    inspectionDate: now,
    location: input.location || CURRENT_MOCK_USER.jurisdictionDistrict || "Central Delhi Zone",
    inspectionType: input.inspectionType || "ROUTINE_MARKET_SURVEILLANCE",
    inspector: CURRENT_MOCK_USER.fullName,
    department: CURRENT_MOCK_USER.department || "Department of Consumer Affairs, Legal Metrology Wing",
    status: INSPECTION_STATUS.PROCESSING,
    createdAt: now,
    updatedAt: now,
    timestamps: {
      createdAt: now,
      updatedAt: now,
    },
    inspectorId: CURRENT_MOCK_USER.id,
    inspectorName: CURRENT_MOCK_USER.fullName,
    jurisdiction: CURRENT_MOCK_USER.jurisdictionDistrict || "Central Delhi Zone",
    commodity: {
      commodityName: input.commodityName,
      brandName: input.brandName,
      category: input.category,
      manufacturerName: input.manufacturerName,
    },
    images: images && images.length > 0 ? images : [
      {
        id: `img_${Date.now()}_0`,
        inspectionId: newId,
        filename: "package_sample_pdp.jpg",
        fileName: "package_sample_pdp.jpg",
        storagePath: "/mock-images/amul-ghee-front.jpg",
        url: "/mock-images/amul-ghee-front.jpg",
        imageType: "PRINCIPAL_DISPLAY_PANEL",
        angle: "PRINCIPAL_DISPLAY_PANEL",
        fileSize: 2150000,
        fileSizeBytes: 2150000,
        mimeType: "image/jpeg",
        qualityStatus: "PASSED",
        qualityScore: 0.94,
        qualityMetrics: {
          blur: 0.95,
          brightness: 0.91,
          glare: 0.93,
          resolution: 0.97,
          readability: 0.94,
        },
        uploadedAt: now,
      },
    ],
    ocrResults: [],
    extractedFields: initialDeclarations,
    extractedDeclarations: initialDeclarations,
    complianceSummary: JSON.parse(JSON.stringify(MOCK_COMPLIANCE_AMUL_GHEE)),
    complianceEvaluation: JSON.parse(JSON.stringify(MOCK_COMPLIANCE_AMUL_GHEE)),
    findings: [],
    inspectorNotes: input.notes,
  };

  const updatedInspections = [newRecord, ...inspections];
  saveStoredInspections(updatedInspections);
  return newRecord;
}

/**
 * Update inspection status or compliance verdict
 */
export async function updateInspectionStatus(
  id: string,
  status: InspectionStatus,
  result?: OverallResult
): Promise<InspectionRecord> {
  await new Promise((resolve) => setTimeout(resolve, 40));

  const inspections = getStoredInspections();
  const index = inspections.findIndex((r) => r.id === id || r.inspectionNumber === id);
  if (index === -1) {
    throw new Error(`Inspection not found: ${id}`);
  }

  const now = new Date().toISOString();
  const updated: InspectionRecord = {
    ...inspections[index],
    status,
    overallResult: result ?? inspections[index].overallResult,
    updatedAt: now,
    timestamps: {
      ...inspections[index].timestamps,
      updatedAt: now,
      ...(status === "COMPLETED" ? { completedAt: now } : {}),
    },
  };

  inspections[index] = updated;
  saveStoredInspections(inspections);
  return updated;
}

/**
 * Record an inspector statutory field correction
 */
export async function updateInspectionField(
  inspectionId: string,
  correction: FieldCorrection
): Promise<InspectionRecord> {
  await new Promise((resolve) => setTimeout(resolve, 40));

  const inspections = getStoredInspections();
  const index = inspections.findIndex((r) => r.id === inspectionId || r.inspectionNumber === inspectionId);
  if (index === -1) {
    throw new Error(`Inspection not found: ${inspectionId}`);
  }

  const current = inspections[index];
  const now = new Date().toISOString();

  // Update in extractedDeclarations
  const decl = current.extractedDeclarations ? { ...current.extractedDeclarations } : null;
  if (decl) {
    const key = correction.fieldName as keyof typeof decl;
    if (decl[key] && typeof decl[key] === "object") {
      const fieldObj = decl[key] as unknown as {
        value: unknown;
        isInspectorOverridden?: boolean;
        originalExtractedValue?: unknown;
        overrideNotes?: string;
      };
      fieldObj.originalExtractedValue = fieldObj.value;
      fieldObj.value = correction.newValue;
      fieldObj.isInspectorOverridden = true;
      fieldObj.overrideNotes = correction.correctionReason;
    }
  }

  const updated: InspectionRecord = {
    ...current,
    extractedDeclarations: decl || current.extractedDeclarations,
    extractedFields: decl || current.extractedFields,
    updatedAt: now,
    timestamps: {
      ...current.timestamps,
      updatedAt: now,
    },
  };

  inspections[index] = updated;
  saveStoredInspections(inspections);
  return updated;
}

/**
 * Get aggregated dashboard statistics
 */
export async function getInspectionStatistics(): Promise<{
  total: number;
  pass: number;
  nonCompliant: number;
  manualReview: number;
  processing: number;
}> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const inspections = getStoredInspections();

  return {
    total: inspections.length,
    pass: inspections.filter((r) => r.overallResult === OVERALL_RESULT.PASS).length,
    nonCompliant: inspections.filter(
      (r) => r.overallResult === OVERALL_RESULT.POTENTIAL_NON_COMPLIANCE
    ).length,
    manualReview: inspections.filter(
      (r) => r.overallResult === OVERALL_RESULT.MANUAL_REVIEW || r.status === INSPECTION_STATUS.MANUAL_REVIEW
    ).length,
    processing: inspections.filter((r) => r.status === INSPECTION_STATUS.PROCESSING).length,
  };
}
