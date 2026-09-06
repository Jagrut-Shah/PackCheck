import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { getPackerById, getAllInspectionCompanyLinks } from "@/lib/companies/storage";
import { isCompanyMatch } from "@/lib/companies/normalization";
import { getAuthoritativeAuditLogs } from "@/lib/events/activity-event";
import { ApiResponse } from "@/lib/types/common";
import { requireAuth } from "@/lib/auth/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { id: companyId } = await context.params;

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Company ID is required in URL path",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 1. Fetch packer entity
    const packer = await getPackerById(companyId);
    if (!packer || (packer.user_id && packer.user_id !== user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Registered packer with ID '${companyId}' was not found.`,
          },
        } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const db = supabaseAdmin || supabase;

    // 2. Fetch all inspections from Supabase strictly for this user
    let allInspections: any[] = [];
    const { data: primaryInspections, error: primaryErr } = await db
      .from("inspections")
      .select("id, product_type, company_id, company_name, status, created_at, updated_at")
      .eq("inspector_id", user.id)
      .order("created_at", { ascending: false });

    if (primaryErr || !primaryInspections) {
      const { data: fallbackInspections } = await db
        .from("inspections")
        .select("id, product_type, status, created_at, updated_at")
        .eq("inspector_id", user.id)
        .order("created_at", { ascending: false });
      allInspections = fallbackInspections || [];
    } else {
      allInspections = primaryInspections;
    }

    // 3. Fetch extracted manufacturer declarations for unassigned inspections
    const { data: mfrFields } = await db
      .from("extracted_fields")
      .select("inspection_id, field_name, extracted_value")
      .in("field_name", ["manufacturer", "packer"]);

    const mfrMap = new Map<string, string>();
    if (mfrFields) {
      for (const row of mfrFields) {
        if (row.extracted_value && !mfrMap.has(row.inspection_id)) {
          mfrMap.set(row.inspection_id, row.extracted_value);
        }
      }
    }

    const localLinks = getAllInspectionCompanyLinks();

    // 4. Match inspections belonging to this company
    const linkedInspections = (allInspections || []).filter((ins) => {
      if (ins.company_id && ins.company_id === packer.id) return true;
      const link = localLinks[ins.id];
      if (link) {
        if (link.companyId === packer.id) return true;
        if (link.companyName && isCompanyMatch(packer, link.companyName)) return true;
      }
      if (ins.company_name && isCompanyMatch(packer, ins.company_name)) return true;
      const extractedMfr = mfrMap.get(ins.id);
      if (extractedMfr && isCompanyMatch(packer, extractedMfr)) return true;
      return false;
    });

    const inspectionIds = linkedInspections.map((i) => i.id);

    // 5. Fetch final compliance results for linked inspections
    const { data: finalResults } = await db
      .from("final_results")
      .select("inspection_id, status, total_violations_count")
      .in("inspection_id", inspectionIds.length > 0 ? inspectionIds : ["00000000-0000-0000-0000-000000000000"]);

    const verdictMap = new Map<string, { status: string; violations: number }>();
    if (finalResults) {
      for (const r of finalResults) {
        verdictMap.set(r.inspection_id, {
          status: r.status,
          violations: r.total_violations_count || 0,
        });
      }
    }

    // 6. Fetch compliance findings for linked inspections
    const { data: findings } = await db
      .from("compliance_findings")
      .select("id, inspection_id, rule_id, rule_name, severity, message, evidence, created_at")
      .in("inspection_id", inspectionIds.length > 0 ? inspectionIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false });

    // Group repeated findings
    const findingCounts = new Map<string, number>();
    const repeatedFindingsList: string[] = [];
    if (findings) {
      for (const f of findings) {
        const text = `${f.rule_id}: ${f.message}`;
        findingCounts.set(text, (findingCounts.get(text) || 0) + 1);
      }
      for (const [findingText, count] of findingCounts.entries()) {
        repeatedFindingsList.push(
          count > 1 ? `${findingText} (${count} occurrences)` : findingText
        );
      }
    }

    // 7. Fetch authoritative audit logs (database + resilient in-memory buffer)
    let companyAuditLogs: Array<{
      id: string;
      inspection_id: string;
      action: string;
      action_label: string;
      category: string;
      actor_name: string;
      details: string;
      created_at: string;
    }> = [];

    try {
      const allLogs = await getAuthoritativeAuditLogs({ userId: user.id });
      companyAuditLogs = allLogs
        .filter((log) => {
          if (log.inspectionId && inspectionIds.includes(log.inspectionId)) return true;
          if (log.metadata?.company_id && log.metadata.company_id === packer.id) return true;
          if (log.metadata?.registration_number && log.metadata.registration_number === packer.registration_number) return true;
          if (
            log.action === "PACKER_REGISTERED" &&
            (log.details?.includes(packer.registration_number) || log.details?.includes(packer.name))
          ) {
            return true;
          }
          return false;
        })
        .map((l) => ({
          id: l.id,
          inspection_id: l.inspectionId,
          action: l.action,
          action_label: l.actionLabel,
          category: l.category,
          actor_name: l.officerName,
          details: l.details,
          created_at: l.timestamp,
        }));
    } catch (auditErr) {
      console.warn("Notice: Failed querying authoritative audit logs:", auditErr);
    }

    // Compute metrics
    const totalAudits = linkedInspections.length;
    let passedAudits = 0;
    let flaggedAudits = 0;
    let pendingAudits = 0;

    const formattedInspections = linkedInspections.map((ins) => {
      const v = verdictMap.get(ins.id);
      let verdict = v?.status;
      if (verdict === "FAIL") {
        verdict = "POTENTIAL_NON_COMPLIANCE";
      }
      if (!verdict && ins.status === "COMPLETED") {
        verdict = "PASS";
      }

      if (verdict === "PASS") {
        passedAudits++;
      } else if (verdict === "POTENTIAL_NON_COMPLIANCE" || verdict === "FAIL" || (v && v.violations > 0)) {
        flaggedAudits++;
      } else {
        pendingAudits++;
      }

      return {
        id: ins.id,
        inspectionNumber: `INS-${ins.id.substring(0, 8).toUpperCase()}`,
        product: ins.product_type,
        status: ins.status,
        overallResult: verdict || "MANUAL_REVIEW",
        createdAt: ins.created_at,
      };
    });

    const complianceRate =
      totalAudits > 0
        ? Math.round(((passedAudits) / totalAudits) * 1000) / 10
        : 100;

    return NextResponse.json({
      success: true,
      data: {
        packer: {
          id: packer.id,
          name: packer.name,
          brand: packer.brand || "",
          registrationNumber: packer.registration_number,
          registeredOffice: packer.registered_office,
          state: packer.state,
          district: packer.district,
          contactEmail: packer.contact_email || "",
          contactPhone: packer.contact_phone || "",
          categories: packer.categories,
          status: packer.status,
          complianceRate,
          totalAudits,
          passedAudits,
          flaggedAudits,
          pendingAudits,
          lastInspectionDate:
            linkedInspections.length > 0
              ? linkedInspections[0].created_at
              : packer.updated_at || packer.created_at,
          registeredDate: packer.created_at?.split("T")[0] || "2024-01-01",
          repeatedFindings: repeatedFindingsList,
        },
        inspections: formattedInspections,
        findings: findings || [],
        auditLogs: companyAuditLogs,
      },
    });
  } catch (err) {
    console.error("GET /api/companies/[id] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve company details.",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
