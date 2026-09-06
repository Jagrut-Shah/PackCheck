/**
 * PackCheck AI - Re-Evaluation Endpoint
 * 
 * Purpose: Re-evaluate compliance after inspector corrections
 * 
 * Flow:
 * 1. Fetch extracted_fields from database
 * 2. Fetch inspector_corrections from database
 * 3. Reconstruct ExtractedDeclarations from extracted_fields
 * 4. Merge corrections with extracted declarations
 * 5. Call evaluateCompliance() with merged data
 * 6. Store updated findings in compliance_findings
 * 7. Update final_results with new status
 * 8. Return new ComplianceEvaluation
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { ApiResponse } from "@/lib/types/common";
import { evaluateCompliance } from "@/lib/compliance";
import { mergeCorrectionsWithExtraction, reconstructDeclarationsFromFields } from "@/lib/compliance/merge-corrections";
import { recordActivityEvent } from "@/lib/events/activity-event";
import { ExtractedDeclarations } from "@/lib/types/extraction";
import { requireAuth, verifyInspectionOwnership } from "@/lib/auth/server";

export const maxDuration = 60; // 60 second timeout

interface ReEvaluateResponse {
  message: string;
  inspection_id: string;
  previous_status: string;
  new_status: string;
  corrections_applied: number;
  previous_violations: number;
  new_violations: number;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const db = supabaseAdmin || supabase;
  
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { id: inspectionId } = await context.params;

    if (!inspectionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Inspection ID is required in URL path",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Verify ownership
    const ownership = await verifyInspectionOwnership(inspectionId, user.id);
    if (!ownership.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSPECTION_NOT_FOUND",
            message: ownership.errorMessage || `Inspection ${inspectionId} not found`,
          },
        } as ApiResponse<null>,
        { status: ownership.errorStatus || 404 }
      );
    }

    // ============================================================
    // 1. Fetch inspection record
    // ============================================================
    const { data: inspection, error: inspectionError } = await db
      .from("inspections")
      .select("id, product_type, inspector_id, status")
      .eq("id", inspectionId)
      .eq("inspector_id", user.id)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSPECTION_NOT_FOUND",
            message: `Inspection ${inspectionId} not found`,
          },
        } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // ============================================================
    // 2. Fetch extracted fields
    // ============================================================
    const { data: extractedFieldsRecords, error: fieldsError } = await db
      .from("extracted_fields")
      .select("*")
      .eq("inspection_id", inspectionId);

    if (fieldsError || !extractedFieldsRecords || extractedFieldsRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_EXTRACTION",
            message: `No extracted fields found for inspection ${inspectionId}`,
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // ============================================================
    // 3. Fetch inspector corrections
    // ============================================================
    const { data: corrections, error: correctionsError } = await db
      .from("inspector_corrections")
      .select("*")
      .eq("inspection_id", inspectionId);

    if (correctionsError) {
      console.warn("Could not fetch corrections:", correctionsError);
    }

    const correctionCount = corrections?.length || 0;

    if (correctionCount === 0) {
      console.warn(
        `[RE-EVAL] No corrections found for ${inspectionId}. Re-evaluation unnecessary.`
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_CORRECTIONS",
            message: "No corrections found. Re-evaluation not needed.",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // ============================================================
    // 4. Reconstruct ExtractedDeclarations from database records
    // ============================================================
    let declarations: ExtractedDeclarations;
    try {
      declarations = reconstructDeclarationsFromFields(extractedFieldsRecords);
    } catch (reconstructErr) {
      console.error("[RE-EVAL] Failed to reconstruct declarations:", reconstructErr);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RECONSTRUCTION_FAILED",
            message: "Could not reconstruct declarations from extracted fields",
          },
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // ============================================================
    // 5. Merge corrections with extracted declarations
    // ============================================================
    let mergedDeclarations: ExtractedDeclarations;
    try {
      mergedDeclarations = mergeCorrectionsWithExtraction(declarations, corrections || []);
      console.log(
        `[RE-EVAL] Merged ${correctionCount} corrections for inspection ${inspectionId}`
      );
    } catch (mergeErr) {
      console.error("[RE-EVAL] Failed to merge corrections:", mergeErr);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MERGE_FAILED",
            message: "Could not merge corrections with extracted data",
          },
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // ============================================================
    // 6. Fetch previous compliance findings (for comparison)
    // ============================================================
    const { data: previousFindings } = await db
      .from("compliance_findings")
      .select("*")
      .eq("inspection_id", inspectionId);

    const previousViolationCount = previousFindings?.length || 0;

    // ============================================================
    // 7. Re-evaluate compliance with merged data
    // ============================================================
    let evaluation;
    try {
      evaluation = await evaluateCompliance(mergedDeclarations);
      console.log(
        `[RE-EVAL] Compliance check: ${evaluation.overallResult} (${evaluation.results.filter(r => r.result === "FAIL").length} failures)`
      );
    } catch (evalErr) {
      console.error("[RE-EVAL] Compliance evaluation failed:", evalErr);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EVALUATION_FAILED",
            message: "Compliance re-evaluation failed",
            details: evalErr instanceof Error ? evalErr.message : "Unknown error",
          },
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // ============================================================
    // 8. Delete previous compliance findings (clean slate)
    // ============================================================
    const { error: deleteError } = await db
      .from("compliance_findings")
      .delete()
      .eq("inspection_id", inspectionId);

    if (deleteError) {
      console.error("[RE-EVAL] Failed to delete previous findings:", deleteError);
      // Don't fail, proceed with insert
    }

    // ============================================================
    // 9. Store new compliance findings
    // ============================================================
    const newFindings = evaluation.results
      .filter((r) => r.result === "FAIL")
      .map((result, index) => ({
        inspection_id: inspectionId,
        rule_id: result.ruleId,
        rule_name: result.ruleTitle,
        severity: result.status || "MEDIUM",
        message: result.explanation,
        evidence: result.observedValue || null,
        created_at: new Date().toISOString(),
      }));

    if (newFindings.length > 0) {
      const { error: findingsError } = await db
        .from("compliance_findings")
        .insert(newFindings);

      if (findingsError) {
        console.error("[RE-EVAL] Failed to insert new findings:", findingsError);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DB_INSERT_FAILED",
              message: "Could not store compliance findings",
            },
          } as ApiResponse<null>,
          { status: 500 }
        );
      }
    }

    // ============================================================
    // 10. Delete previous final_results
    // ============================================================
    await db.from("final_results").delete().eq("inspection_id", inspectionId);

    // ============================================================
    // 11. Store new final_results
    // ============================================================
    const highSeverityCount = newFindings.filter((f) => f.severity === "HIGH").length;

    const { error: resultError } = await db
      .from("final_results")
      .insert([
        {
          inspection_id: inspectionId,
          status: evaluation.overallResult === "PASS" ? "PASS" : "FAIL",
          total_violations_count: newFindings.length,
          high_severity_count: highSeverityCount,
          findings_json: {
            overallResult: evaluation.overallResult,
            results: evaluation.results,
          },
          created_at: new Date().toISOString(),
        },
      ]);

    if (resultError) {
      console.error("[RE-EVAL] Failed to insert final_results:", resultError);
      // Don't fail entirely, but log it
    }

    // ============================================================
    // 12. Update inspection status if needed
    // ============================================================
    if (evaluation.overallResult === "PASS") {
      await db
        .from("inspections")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("id", inspectionId)
        .eq("inspector_id", user.id);
    }

    // ============================================================
    // 13. Record activity event
    // ============================================================
    try {
      await recordActivityEvent({
        action: "COMPLIANCE_RE_EVALUATED",
        actionLabel: "Compliance Re-Assessment with Corrections",
        inspectionId,
        commodityName: inspection.product_type || "Packaged Commodity",
        actorId: user.id,
        actorName: "Compliance Re-Evaluation Engine",
        category: "PIPELINE",
        details: `Compliance re-evaluated after ${correctionCount} field correction(s). Previous status: ${previousViolationCount} violations → New status: ${newFindings.length} violations.`,
        metadata: {
          corrections_applied: correctionCount,
          previous_violations: previousViolationCount,
          new_violations: newFindings.length,
          new_overall_result: evaluation.overallResult,
        },
      });
    } catch (eventErr) {
      console.warn("[RE-EVAL] Could not record activity event:", eventErr);
    }

    // ============================================================
    // 14. Return response
    // ============================================================
    return NextResponse.json(
      {
        success: true,
        data: {
          message: `Compliance re-evaluated successfully with ${correctionCount} correction(s)`,
          inspection_id: inspectionId,
          previous_status: inspection.status,
          new_status: evaluation.overallResult === "PASS" ? "COMPLETED" : "MANUAL_REVIEW",
          corrections_applied: correctionCount,
          previous_violations: previousViolationCount,
          new_violations: newFindings.length,
        } as ReEvaluateResponse,
      } as ApiResponse<ReEvaluateResponse>,
      { status: 200 }
    );
  } catch (err) {
    console.error("[RE-EVAL] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error during re-evaluation",
          details: err instanceof Error ? err.message : "Unknown error",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
