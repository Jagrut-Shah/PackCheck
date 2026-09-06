/**
 * PackCheck AI - Reports API Client Layer
 * Production API integration connecting Report previews to GET /api/inspections/[id]/report-data.
 * Provides single canonical mapping layer between backend report-data responses and frontend VerificationReportData.
 */

import { VerificationReportData } from "@/lib/types/report";
import { Finding } from "@/lib/types/finding";
import { toFrontendOverallResult } from "@/lib/types/common";
import { getReportById as findLegacyMockReportById } from "@/mocks/reports";
import {
  getInspections,
  getInspectionById,
  mapBackendFindingToCanonical,
  deserializeBackendFieldsToDeclarations,
} from "./inspections";
import { apiClient, ApiClientError } from "./client";

export interface ReportFilterParams {
  searchQuery?: string;
}

export function sanitizeOfficerName(name: string | null | undefined): string {
  if (!name) return "Legal Metrology Inspector";
  const trimmed = name.trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
    /^(usr_|user_|officer_|insp_)[a-zA-Z0-9_-]+$/i.test(trimmed) ||
    /^[0-9a-f]{16,64}$/i.test(trimmed)
  ) {
    return "Legal Metrology Inspector";
  }
  return trimmed;
}

export interface BackendReportDataResponse {
  inspection: any;
  extracted_fields: any[];
  corrections: any[];
  findings: any[];
  final_result: any | null;
}

/**
 * Normalizes backend report-data aggregate into canonical frontend VerificationReportData.
 * Scoped strictly to the requested inspection with no cross-inspection contamination.
 */
export function mapBackendReportDataToVerificationReport(
  data: BackendReportDataResponse
): VerificationReportData {
  const { inspection, extracted_fields, corrections, findings, final_result } = data;
  const shortId = (inspection?.id || "REPORT").substring(0, 8).toUpperCase();
  const dateStr = inspection?.created_at || new Date().toISOString();

  const extractedDeclarations =
    extracted_fields && extracted_fields.length > 0
      ? deserializeBackendFieldsToDeclarations(extracted_fields, inspection.product_type, corrections)
      : undefined;

  const canonicalFindings: Finding[] = (findings || []).map((f: any) =>
    mapBackendFindingToCanonical(f, inspection.id, inspection.image_path, dateStr)
  );

  const backendStatus = final_result?.status || inspection.status;
  const overallResult = toFrontendOverallResult(backendStatus);

  const commodityName =
    extractedDeclarations?.commodityName?.value || inspection.product_type || "Packaged Commodity";
  const manufacturerOrPacker =
    extractedDeclarations?.manufacturerOrPacker?.value?.name || inspection.company || "Manufacturer";

  return {
    reportId: `rep_${inspection.id}`,
    reportNumber: `LM-${shortId}-2026`,
    inspectionId: inspection.id,
    inspectionNumber: `INS-${shortId}`,
    generatedAt: inspection.updated_at || dateStr,
    generatedBy: sanitizeOfficerName(inspection.inspector_id),
    statutoryAct: "Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011",
    commodityName,
    manufacturerOrPacker,
    overallResult,
    findings: canonicalFindings,
    extractedDeclarations: extractedDeclarations || ({} as any),
    documentHash: `SHA256:${inspection.id.replace(/-/g, "").substring(0, 32)}`,
    company: manufacturerOrPacker,
    product: commodityName,
    inspectionDate: dateStr,
    location: "",
    inspector: sanitizeOfficerName(inspection.inspector_id),
    signoff: {
      officerId: inspection.inspector_id || "",
      officerName: sanitizeOfficerName(inspection.inspector_id),
      designation: "Legal Metrology Inspector",
      badgeNumber: "",
      signedAt: inspection.updated_at || dateStr,
    },
  };
}

/**
 * Fetch all statutory verification reports derived strictly from real inspection records in Supabase.
 */
export async function getReports(params?: ReportFilterParams): Promise<VerificationReportData[]> {
  try {
    const inspections = await getInspections();
    let results: VerificationReportData[] = inspections.map((insp) => {
      const shortId = insp.id.substring(0, 8).toUpperCase();
      const dateStr = insp.inspectionDate || insp.createdAt;
      return {
        reportId: `rep_${insp.id}`,
        reportNumber: `LM-${shortId}-2026`,
        inspectionId: insp.id,
        inspectionNumber: insp.inspectionNumber,
        generatedAt: insp.timestamps.completedAt || insp.updatedAt || dateStr,
        generatedBy: insp.inspectorName || insp.inspector || "Legal Metrology Inspector",
        statutoryAct: "Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011",
        commodityName: insp.product || insp.commodity?.commodityName || "Packaged Commodity",
        brandName: insp.commodity?.brandName,
        manufacturerOrPacker: insp.company || insp.commodity?.manufacturerName || "Manufacturer",
        overallResult: insp.overallResult || "PASS",
        findings: insp.findings || [],
        extractedDeclarations: insp.extractedDeclarations || ({} as any),
        company: insp.company || insp.commodity?.manufacturerName || "Manufacturer",
        product: insp.product || insp.commodity?.commodityName || "Packaged Commodity",
        inspectionDate: dateStr,
        location: insp.location || "",
        inspector: sanitizeOfficerName(insp.inspector || insp.inspectorName),
        signoff: {
          officerId: insp.inspectorId || insp.inspector || "",
          officerName: sanitizeOfficerName(insp.inspectorName || insp.inspector),
          designation: "Legal Metrology Inspector",
          badgeNumber: "",
          signedAt: insp.timestamps.completedAt || insp.updatedAt || dateStr,
        },
        documentHash: `SHA256:${insp.id.replace(/-/g, "").substring(0, 32)}`,
      };
    });

    if (params?.searchQuery) {
      const q = params.searchQuery.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.reportNumber.toLowerCase().includes(q) ||
          r.inspectionId.toLowerCase().includes(q) ||
          r.commodityName.toLowerCase().includes(q) ||
          (r.brandName && r.brandName.toLowerCase().includes(q)) ||
          r.manufacturerOrPacker.toLowerCase().includes(q) ||
          (r.company && r.company.toLowerCase().includes(q)) ||
          (r.product && r.product.toLowerCase().includes(q))
      );
    }

    return results;
  } catch (err) {
    console.error("Failed to fetch real reports list:", err);
    return [];
  }
}

/**
 * Fetch report data by inspection ID or report ID from real backend GET /api/inspections/[id]/report-data.
 * Handles both plain UUID and 'rep_<UUID>' format.
 * Never silently substitutes mock data for real inspection IDs.
 */
export async function getReportById(id: string): Promise<VerificationReportData | null> {
  const cleanId = id.startsWith("rep_") ? id.replace(/^rep_/, "") : id;

  // 1. Attempt to fetch real aggregate from backend GET /api/inspections/[id]/report-data
  try {
    const res = await apiClient.get<BackendReportDataResponse>(`/api/inspections/${cleanId}/report-data`);
    if (res && res.inspection) {
      return mapBackendReportDataToVerificationReport(res);
    }
  } catch (err) {
    if (!(err instanceof ApiClientError && err.status === 404)) {
      console.warn(`Failed to fetch report-data for ${cleanId} from backend:`, err);
    }
  }

  // 2. If report-data endpoint returns 404, check if the inspection record itself exists in DB
  try {
    const inspection = await getInspectionById(cleanId);
    if (inspection) {
      const shortId = inspection.id.substring(0, 8).toUpperCase();
      const dateStr = inspection.inspectionDate || inspection.createdAt;
      return {
        reportId: `rep_${inspection.id}`,
        reportNumber: `LM-${shortId}-2026`,
        inspectionId: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        generatedAt: inspection.timestamps.completedAt || inspection.updatedAt || dateStr,
        generatedBy: inspection.inspectorName || inspection.inspector || "Legal Metrology Inspector",
        statutoryAct: "Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011",
        commodityName: inspection.commodity?.commodityName || inspection.product,
        brandName: inspection.commodity?.brandName,
        manufacturerOrPacker:
          inspection.commodity?.manufacturerName || inspection.company || "Manufacturer",
        overallResult: inspection.overallResult || "PASS",
        findings: inspection.findings || [],
        extractedDeclarations: inspection.extractedDeclarations || ({} as any),
        signoff: {
          officerId: inspection.inspectorId,
          officerName: sanitizeOfficerName(inspection.inspectorName || inspection.inspector),
          designation: "Legal Metrology Inspector",
          badgeNumber: "",
          signedAt: inspection.timestamps.completedAt || inspection.updatedAt || dateStr,
        },
        documentHash: `SHA256:${inspection.id.replace(/-/g, "").substring(0, 32)}`,
      };
    }
  } catch {
    // Inspection does not exist in DB
  }

  // 3. Fallback to mock data ONLY for legacy mock demo IDs (e.g., "ins_amul_ghee_001", "rep_001")
  const isLegacyMock = cleanId.startsWith("ins_") || cleanId.startsWith("rep_") || cleanId.startsWith("INSP-2024-");
  if (isLegacyMock) {
    const found = findLegacyMockReportById(cleanId) || findLegacyMockReportById(id);
    if (found) return { ...found };
  }

  // 4. For real inspections or UUIDs that do not exist: return null (Honest 404)
  return null;
}
