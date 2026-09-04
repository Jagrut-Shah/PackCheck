/**
 * PackCheck AI - Verification Report Contracts
 * Structured input consumed by the PDF Generation service and Report views.
 * The PDF generator consumes this data and performs ZERO compliance logic.
 */

import { OverallResult } from "./common";
import { Finding, Evidence } from "./finding";
import { ExtractedDeclarations } from "./extraction";
import { ComplianceRuleResult } from "./compliance";

export interface OfficerSignoff {
  officerId: string;
  officerName: string;
  designation: string;
  badgeNumber: string;
  signedAt: string;
  digitalSignatureHash?: string;
  remarks?: string;
}

/**
 * Canonical Structured Verification Report Contract.
 */
export interface VerificationReportData {
  reportId: string;
  reportNumber: string; // e.g. "LM-DEL-2026-00412"
  inspectionId: string;
  inspectionNumber?: string;
  generatedAt: string;
  generatedBy: string;
  statutoryAct: string;
  commodityName: string;
  brandName?: string;
  manufacturerOrPacker: string;
  overallResult: OverallResult;
  findings: Finding[];
  extractedDeclarations: ExtractedDeclarations;
  documentHash: string; // SHA-256 for tamper-proof digital verification

  // Extended Canonical fields
  company?: string;
  product?: string;
  inspectionDate?: string;
  location?: string;
  inspector?: string;
  executiveSummary?: string;
  complianceResults?: ComplianceRuleResult[];
  evidence?: Evidence[];
  ruleSources?: string[];
  engineVersion?: string;
  ruleSetVersion?: string;
  reportVersion?: string;
  generatedTimestamp?: string;
  signoff?: OfficerSignoff;
  qrVerificationUrl?: string;
}

export type ReportContract = VerificationReportData;
