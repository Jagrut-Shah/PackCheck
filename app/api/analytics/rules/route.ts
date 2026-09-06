import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  CANONICAL_RULES,
  CORE_STATUTORY_RULE_IDS,
  getRuleDefinition,
  normalizeRuleId,
  StatutoryRuleDefinition,
} from "@/lib/compliance/rules-catalog";
import { ApiResponse } from "@/lib/types/common";

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
  failedCount: number; // distinct affected inspections
  totalFindings: number; // total violations recorded for this rule
  complianceRate: number; // percentage (0.0 to 100.0)
  failureRate: number; // percentage (0.0 to 100.0)
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const db = supabaseAdmin || supabase;

    // 1. Fetch all inspections
    const { data: inspections, error: inspectionsError } = await db
      .from("inspections")
      .select("id, product_type, status, created_at")
      .order("created_at", { ascending: false });

    if (inspectionsError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DB_QUERY_FAILED",
            message: "Failed to fetch inspections",
            details: inspectionsError.message,
          },
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    const allInspections = inspections || [];
    const inspectionMap = new Map<string, { id: string; product_type: string; status: string; created_at: string }>();
    allInspections.forEach((insp) => {
      inspectionMap.set(insp.id, insp);
    });

    // 2. Fetch all final results (ordered newest first)
    const { data: finalResults, error: resultsError } = await db
      .from("final_results")
      .select("id, inspection_id, status, total_violations_count, high_severity_count, findings_json, created_at")
      .order("created_at", { ascending: false });

    if (resultsError) {
      console.warn("Could not fetch final_results:", resultsError.message);
    }

    // Pick latest authoritative final result per inspection_id
    const latestResultByInspection = new Map<string, any>();
    (finalResults || []).forEach((res) => {
      if (!latestResultByInspection.has(res.inspection_id)) {
        latestResultByInspection.set(res.inspection_id, res);
      }
    });

    // 3. Fetch all compliance findings
    const { data: findings, error: findingsError } = await db
      .from("compliance_findings")
      .select("id, inspection_id, rule_id, rule_name, severity, message, created_at")
      .order("created_at", { ascending: false });

    if (findingsError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DB_QUERY_FAILED",
            message: "Failed to fetch compliance findings",
            details: findingsError.message,
          },
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    const allFindings = findings || [];

    // 4. Fetch extracted manufacturer/packer details for findings display
    const affectedInspectionIds = Array.from(new Set(allFindings.map((f) => f.inspection_id)));
    const packerNameMap = new Map<string, string>();

    if (affectedInspectionIds.length > 0) {
      const { data: extractedFields } = await db
        .from("extracted_fields")
        .select("inspection_id, field_name, extracted_value")
        .in("inspection_id", affectedInspectionIds)
        .in("field_name", ["manufacturer", "packer", "brand", "company_name", "productName"]);

      (extractedFields || []).forEach((ef) => {
        if (
          (ef.field_name === "manufacturer" || ef.field_name === "packer" || ef.field_name === "brand") &&
          ef.extracted_value &&
          !packerNameMap.has(ef.inspection_id)
        ) {
          packerNameMap.set(ef.inspection_id, ef.extracted_value);
        }
      });
    }

    // Index findings by inspection_id
    const findingsByInspection = new Map<string, any[]>();
    allFindings.forEach((f) => {
      if (!findingsByInspection.has(f.inspection_id)) {
        findingsByInspection.set(f.inspection_id, []);
      }
      findingsByInspection.get(f.inspection_id)!.push(f);
    });

    // ============================================================
    // COMPUTE OVERVIEW METRICS & TRACK EVALUATED RULES PER INSPECTION
    // ============================================================
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let pendingReviewCount = 0;

    // Track which inspections evaluated which rules: Map<ruleId, Set<inspectionId>>
    const ruleEvaluatedInspections = new Map<string, Set<string>>();

    allInspections.forEach((insp) => {
      const latestResult = latestResultByInspection.get(insp.id);
      let isEvaluated = false;

      if (latestResult) {
        isEvaluated = true;
        const isPass = latestResult.status === "PASS" || latestResult.status === "COMPLIANT";
        const hasViolations = (latestResult.total_violations_count || 0) > 0;

        if (isPass && !hasViolations) {
          compliantCount += 1;
        } else {
          nonCompliantCount += 1;
        }
      } else {
        if (insp.status === "COMPLETED") {
          isEvaluated = true;
          compliantCount += 1;
        } else {
          pendingReviewCount += 1;
        }
      }

      if (isEvaluated) {
        // Collect all rule IDs that were evaluated for this inspection
        const evaluatedRulesThisInsp = new Set<string>();

        // Check if explicit evaluated_rules are stored in findings_json
        if (latestResult && latestResult.findings_json) {
          const fj = latestResult.findings_json;
          if (typeof fj === "object" && !Array.isArray(fj) && Array.isArray(fj.evaluated_rules) && fj.evaluated_rules.length > 0) {
            fj.evaluated_rules.forEach((er: any) => {
              if (er && er.rule_id) {
                evaluatedRulesThisInsp.add(normalizeRuleId(er.rule_id));
              }
            });
          }
        }

        // If no explicit evaluated_rules were stored (historical completed inspections),
        // use the core statutory checks evaluated by the compliance engine
        if (evaluatedRulesThisInsp.size === 0) {
          CORE_STATUTORY_RULE_IDS.forEach((cid) => evaluatedRulesThisInsp.add(cid));
        }

        // Also ensure any rule that has a finding for this inspection is included in evaluated rules
        const findingsForInsp = findingsByInspection.get(insp.id) || [];
        findingsForInsp.forEach((f) => {
          evaluatedRulesThisInsp.add(normalizeRuleId(f.rule_id));
        });

        // Register each evaluated rule for this inspection
        evaluatedRulesThisInsp.forEach((ruleId) => {
          if (!ruleEvaluatedInspections.has(ruleId)) {
            ruleEvaluatedInspections.set(ruleId, new Set<string>());
          }
          ruleEvaluatedInspections.get(ruleId)!.add(insp.id);
        });
      }
    });

    const totalInspections = allInspections.length;
    const evaluatedInspections = compliantCount + nonCompliantCount;
    const overallComplianceRate =
      evaluatedInspections > 0 ? Number(((compliantCount / evaluatedInspections) * 100).toFixed(1)) : 100.0;

    // ============================================================
    // GROUP FINDINGS BY STATUTORY RULE & COLLECT VIOLATIONS
    // ============================================================
    const ruleViolatedInspections = new Map<string, Set<string>>();
    const ruleFindingsList = new Map<string, RuleRecentFinding[]>();
    const severityCounts: SeverityBreakdown = { critical: 0, high: 0, standard: 0 };

    allFindings.forEach((finding) => {
      const normRuleId = normalizeRuleId(finding.rule_id);
      if (!ruleViolatedInspections.has(normRuleId)) {
        ruleViolatedInspections.set(normRuleId, new Set<string>());
      }
      ruleViolatedInspections.get(normRuleId)!.add(finding.inspection_id);

      // Ensure the rule is marked evaluated for this inspection
      if (!ruleEvaluatedInspections.has(normRuleId)) {
        ruleEvaluatedInspections.set(normRuleId, new Set<string>());
      }
      ruleEvaluatedInspections.get(normRuleId)!.add(finding.inspection_id);

      if (!ruleFindingsList.has(normRuleId)) {
        ruleFindingsList.set(normRuleId, []);
      }

      const inspectionObj = inspectionMap.get(finding.inspection_id);
      const inspectionNumber = `INSP-${(finding.inspection_id || "").slice(0, 8).toUpperCase()}`;
      const productType = inspectionObj?.product_type || "Packaged Commodity";
      const packerName = packerNameMap.get(finding.inspection_id) || "Registered Pre-Packer";

      ruleFindingsList.get(normRuleId)!.push({
        id: finding.id,
        inspectionId: finding.inspection_id,
        inspectionNumber,
        productType,
        packerName,
        severity: finding.severity || "HIGH",
        message: finding.message || "Statutory packaging non-compliance detected.",
        createdAt: finding.created_at,
      });

      // Severity aggregation
      const sev = (finding.severity || "").toUpperCase();
      if (sev === "CRITICAL") {
        severityCounts.critical += 1;
      } else if (sev === "HIGH" || sev === "MAJOR") {
        severityCounts.high += 1;
      } else {
        severityCounts.standard += 1;
      }
    });

    // ============================================================
    // BUILD RULE PERFORMANCE ITEMS (ONLY RULES ACTUALLY USED)
    // ============================================================
    // Gather all rule IDs that were ACTUALLY used/evaluated in at least one inspection
    const allUsedRuleIds = new Set<string>();
    for (const [ruleId, inspSet] of ruleEvaluatedInspections.entries()) {
      if (inspSet.size > 0) {
        allUsedRuleIds.add(ruleId);
      }
    }
    for (const [ruleId, inspSet] of ruleViolatedInspections.entries()) {
      if (inspSet.size > 0) {
        allUsedRuleIds.add(ruleId);
      }
    }

    const rulePerformanceList: RulePerformanceItem[] = [];

    allUsedRuleIds.forEach((ruleId) => {
      const def = getRuleDefinition(ruleId);
      const totalEvaluated = ruleEvaluatedInspections.get(ruleId)?.size || 0;
      const failedCount = ruleViolatedInspections.get(ruleId)?.size || 0;
      const passedCount = Math.max(0, totalEvaluated - failedCount);
      const findingsForRule = ruleFindingsList.get(ruleId) || [];
      const totalFindings = findingsForRule.length;

      const complianceRate =
        totalEvaluated > 0 ? Number(((passedCount / totalEvaluated) * 100).toFixed(1)) : 100.0;
      const failureRate =
        totalEvaluated > 0 ? Number(((failedCount / totalEvaluated) * 100).toFixed(1)) : 0.0;

      rulePerformanceList.push({
        ruleId: def.ruleId,
        ruleNumber: def.ruleNumber,
        title: def.title,
        category: def.category,
        criticality: def.criticality,
        totalEvaluated,
        passedCount,
        failedCount,
        totalFindings,
        complianceRate,
        failureRate,
        statutoryReference: def.statutoryReference,
        requirementDescription: def.requirementDescription,
        penaltySection: def.penaltySection,
        penaltySummary: def.penaltySummary,
        legalContext: def.legalContext,
        recentFindings: findingsForRule,
      });
    });

    // Sort rules:
    // 1. Rules with violations first (failedCount desc)
    // 2. Criticality (CRITICAL > HIGH > STANDARD)
    // 3. Alphabetical ruleNumber
    const criticalityOrder: Record<string, number> = { CRITICAL: 3, HIGH: 2, STANDARD: 1 };
    rulePerformanceList.sort((a, b) => {
      if (b.failedCount !== a.failedCount) {
        return b.failedCount - a.failedCount;
      }
      const critDiff = (criticalityOrder[b.criticality] || 0) - (criticalityOrder[a.criticality] || 0);
      if (critDiff !== 0) return critDiff;
      return a.ruleNumber.localeCompare(b.ruleNumber);
    });

    // Determine Top Violation Area
    let topViolationArea: OverviewMetrics["topViolationArea"] = null;
    const worstRule = rulePerformanceList.find((r) => r.failedCount > 0);
    if (worstRule) {
      topViolationArea = {
        ruleId: worstRule.ruleId,
        ruleNumber: worstRule.ruleNumber,
        title: worstRule.title,
        failureRate: worstRule.failureRate,
        failedCount: worstRule.failedCount,
        totalFindings: worstRule.totalFindings,
      };
    }

    const uniqueProductsCount = new Set(
      allInspections.map((i) => (i.product_type || "").trim().toLowerCase()).filter(Boolean)
    ).size;

    const responseData: RuleAnalyticsResponseData = {
      overview: {
        totalInspections,
        uniqueProductsCount,
        evaluatedInspections,
        compliantCount,
        nonCompliantCount,
        pendingReviewCount,
        complianceRate: overallComplianceRate,
        totalFindingsCount: allFindings.length,
        totalMonitoredRules: rulePerformanceList.length,
        topViolationArea,
        severityDistribution: severityCounts,
      },
      rules: rulePerformanceList,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      } as ApiResponse<RuleAnalyticsResponseData>,
      { status: 200 }
    );
  } catch (err) {
    console.error("Rule Analytics API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error calculating rule analytics",
          details: err instanceof Error ? err.message : "Unknown error",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
