/**
 * PackCheck AI - Reports API Client Layer
 * Mock-first async service abstraction for statutory verification report retrieval.
 */

import { VerificationReportData } from "@/types/report";
import { MOCK_REPORTS, getReportById as findReportById } from "@/mocks/reports";
import { getInspectionById } from "./inspections";

export interface ReportFilterParams {
  searchQuery?: string;
}

export async function getReports(params?: ReportFilterParams): Promise<VerificationReportData[]> {
  await new Promise((resolve) => setTimeout(resolve, 40));

  let results = [...MOCK_REPORTS];

  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase().trim();
    results = results.filter(
      (r) =>
        r.reportNumber.toLowerCase().includes(q) ||
        r.inspectionId.toLowerCase().includes(q) ||
        r.commodityName.toLowerCase().includes(q) ||
        (r.brandName && r.brandName.toLowerCase().includes(q)) ||
        r.manufacturerOrPacker.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function getReportById(id: string): Promise<VerificationReportData | null> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const found = findReportById(id);
  if (found) return { ...found };

  // If report not pre-seeded in MOCK_REPORTS, try generating from stored inspection record
  const inspection = await getInspectionById(id);
  if (inspection) {
    return {
      reportId: `rep_${inspection.id}`,
      reportNumber: `LM-DEL-2026-0${Math.floor(100 + Math.random() * 900)}`,
      inspectionId: inspection.id,
      inspectionNumber: inspection.inspectionNumber,
      generatedAt: new Date().toISOString(),
      generatedBy: inspection.inspectorName,
      statutoryAct: "Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011",
      commodityName: inspection.commodity?.commodityName || inspection.product,
      brandName: inspection.commodity?.brandName,
      manufacturerOrPacker: inspection.commodity?.manufacturerName || inspection.company,
      overallResult: inspection.overallResult || "PASS",
      findings: inspection.findings || [],
      extractedDeclarations: inspection.extractedDeclarations!,
      signoff: {
        officerId: inspection.inspectorId,
        officerName: inspection.inspectorName,
        designation: "Legal Metrology Inspector",
        badgeNumber: "LM-DEL-4821",
        signedAt: new Date().toISOString(),
        digitalSignatureHash: "SHA256:7b1d4ef26a9c339a11005b6e4d28f89a9c1e0a2b8e3a7c6f",
      },
      documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };
  }

  return null;
}
