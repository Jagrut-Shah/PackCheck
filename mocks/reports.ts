/**
 * PackCheck AI - Mock Reports Dataset
 * Represents generated statutory verification reports conforming strictly to ReportContract.
 */

import { VerificationReportData } from "@/lib/types/report";
import { OVERALL_RESULT } from "@/lib/types/common";
import { MOCK_EXTRACTION_AMUL_GHEE, MOCK_EXTRACTION_NUTRIBITE } from "./extraction";
import { MOCK_FINDINGS_NUTRIBITE, MOCK_COMPLIANCE_AMUL_GHEE, MOCK_COMPLIANCE_NUTRIBITE } from "./compliance";

export const MOCK_REPORTS: VerificationReportData[] = [
  {
    reportId: "rep_amul_001",
    inspectionId: "ins_amul_ghee_001",
    inspectionNumber: "INS-2026-0101",
    reportNumber: "LM-DEL-2026-0811",
    company: "Kaira District Co-operative Milk Producers' Union Ltd.",
    product: "Pure Ghee 1L Tin",
    inspectionDate: "2026-09-03T11:15:00Z",
    location: "Connaught Place Supermarket, Delhi NCR",
    inspector: "Rajesh Kumar Sharma",
    overallResult: OVERALL_RESULT.PASS,
    executiveSummary:
      "Commodity label complies with all statutory requirements under Legal Metrology (Packaged Commodities) Rules, 2011. Zero non-compliance findings detected.",
    extractedDeclarations: MOCK_EXTRACTION_AMUL_GHEE,
    complianceResults: MOCK_COMPLIANCE_AMUL_GHEE.results,
    findings: [],
    ruleSources: [
      "Legal Metrology Act, 2009",
      "Legal Metrology (Packaged Commodities) Rules, 2011",
      "Schedule II Standard Quantities Specifications",
    ],
    engineVersion: "PCR-2011-AMENDED-2024.1",
    ruleSetVersion: "PCR-2011-v2024.1",
    reportVersion: "1.0",
    generatedTimestamp: "2026-09-03T11:25:00Z",
    generatedAt: "2026-09-03T11:25:00Z",
    generatedBy: "Rajesh Kumar Sharma",
    statutoryAct: "Legal Metrology Act, 2009 read with Legal Metrology (Packaged Commodities) Rules, 2011",
    commodityName: "Pure Ghee 1L Tin",
    brandName: "Amul",
    manufacturerOrPacker: "Kaira District Co-operative Milk Producers' Union Ltd., Anand 388001",
    signoff: {
      officerId: "usr_delhi_001",
      officerName: "Rajesh Kumar Sharma",
      designation: "Legal Metrology Inspector",
      badgeNumber: "LM-DEL-4821",
      signedAt: "2026-09-03T11:25:00Z",
      digitalSignatureHash: "SHA256:7b1d4ef26a9c339a11005b6e4d28f89a9c1e0a2b8e3a7c6f",
      remarks: "Sample fully conforms with Rule 6 mandatory declarations and Schedule II standards.",
    },
    qrVerificationUrl: "https://packcheck.gov.in/verify/LM-DEL-2026-0811",
    documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    reportId: "rep_nutribite_002",
    inspectionId: "ins_nutribite_cookies_002",
    inspectionNumber: "INS-2026-0102",
    reportNumber: "LM-DEL-2026-0812",
    company: "NutriBite Foods Pvt Ltd",
    product: "High Protein Cookies 250g",
    inspectionDate: "2026-09-03T14:10:00Z",
    location: "Okhla Phase 3 Warehouse, Delhi NCR",
    inspector: "Rajesh Kumar Sharma",
    overallResult: OVERALL_RESULT.POTENTIAL_NON_COMPLIANCE,
    executiveSummary:
      "Commodity label exhibits 3 statutory infractions under Rule 6(1)(e) (missing tax inclusivity statement), Rule 6(1)(f) (missing consumer care phone), and Unit Sale Price requirements.",
    extractedDeclarations: MOCK_EXTRACTION_NUTRIBITE,
    complianceResults: MOCK_COMPLIANCE_NUTRIBITE.results,
    findings: MOCK_FINDINGS_NUTRIBITE,
    ruleSources: [
      "Legal Metrology Act, 2009 (Section 36)",
      "Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6)",
    ],
    engineVersion: "PCR-2011-AMENDED-2024.1",
    ruleSetVersion: "PCR-2011-v2024.1",
    reportVersion: "1.0",
    generatedTimestamp: "2026-09-03T14:22:00Z",
    generatedAt: "2026-09-03T14:22:00Z",
    generatedBy: "Rajesh Kumar Sharma",
    statutoryAct: "Legal Metrology Act, 2009 read with Legal Metrology (Packaged Commodities) Rules, 2011",
    commodityName: "High Protein Cookies 250g",
    brandName: "NutriBite",
    manufacturerOrPacker: "NutriBite Foods Pvt Ltd, Plot 14, Okhla Phase 3, New Delhi 110020",
    signoff: {
      officerId: "usr_delhi_001",
      officerName: "Rajesh Kumar Sharma",
      designation: "Legal Metrology Inspector",
      badgeNumber: "LM-DEL-4821",
      signedAt: "2026-09-03T14:22:00Z",
      digitalSignatureHash: "SHA256:8f3c1a998e6b4d22105a7f9c88210344b5a2e1d0f8c7e9a1",
      remarks: "Notice recommended under Section 36 of the Legal Metrology Act, 2009.",
    },
    qrVerificationUrl: "https://packcheck.gov.in/verify/LM-DEL-2026-0812",
    documentHash: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  },
];

export function getReportById(id: string): VerificationReportData | undefined {
  return MOCK_REPORTS.find((r) => r.reportId === id || r.reportNumber === id || r.inspectionId === id);
}
