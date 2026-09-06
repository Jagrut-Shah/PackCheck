/**
 * PackCheck AI — Analytics API Client
 * Connects frontend directly to server routes:
 * - /api/analytics/rules (Statutory PCR 2011 rule-level intelligence & metrics)
 * - /api/analytics/violations (Category/commodity aggregations)
 */

import { apiClient } from "./client";

export interface RuleRecentFinding {
  id: string;
  inspectionId: string;
  inspectionNumber: string;
  productType: string;
  packerName: string;
  severity: string;
  message: string;
  createdAt: string;
}

export interface RulePerformanceItem {
  ruleId: string;
  ruleNumber: string;
  title: string;
  category: string;
  criticality: "CRITICAL" | "HIGH" | "STANDARD";
  totalEvaluated: number;
  passedCount: number;
  failedCount: number;
  totalFindings: number;
  complianceRate: number;
  failureRate: number;
  statutoryReference: string;
  requirementDescription: string;
  penaltySection: string;
  penaltySummary: string;
  legalContext: string;
  recentFindings: RuleRecentFinding[];
}

export interface SeverityBreakdown {
  critical: number;
  high: number;
  standard: number;
}

export interface OverviewMetrics {
  totalInspections: number;
  uniqueProductsCount: number;
  evaluatedInspections: number;
  compliantCount: number;
  nonCompliantCount: number;
  pendingReviewCount: number;
  complianceRate: number;
  totalFindingsCount: number;
  totalMonitoredRules: number;
  topViolationArea: {
    ruleId: string;
    ruleNumber: string;
    title: string;
    failureRate: number;
    failedCount: number;
    totalFindings: number;
  } | null;
  severityDistribution: SeverityBreakdown;
}

export interface RuleAnalyticsResponseData {
  overview: OverviewMetrics;
  rules: RulePerformanceItem[];
}

/**
 * Fetch real statutory rule analytics derived directly from persisted inspections & findings.
 */
export async function getRuleAnalytics(): Promise<RuleAnalyticsResponseData> {
  return apiClient.get<RuleAnalyticsResponseData>("/api/analytics/rules");
}
