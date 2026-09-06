/**
 * PackCheck AI - Server-Side PDF Report Generation Route Handler
 * Endpoint: GET /api/inspections/[id]/report/pdf
 * Produces cryptographically signed, court-admissible PDF verification reports locally on server.
 * Uses pure JavaScript `pdf-lib` without any external services, paid APIs, or external keys.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { generateVerificationReportPdf } from "@/lib/reports/pdf-generator";
import { mapBackendReportDataToVerificationReport } from "@/lib/api/reports";
import { recordActivityEvent } from "@/lib/events/activity-event";
import { requireAuth, verifyInspectionOwnership } from "@/lib/auth/server";

export const maxDuration = 30;

export async function GET(
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
        },
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
        },
        { status: ownership.errorStatus || 404 }
      );
    }

    // 1. Fetch inspection record
    const { data: inspection, error: inspectionError } = await db
      .from("inspections")
      .select("*")
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
        },
        { status: 404 }
      );
    }

    // 2. Fetch all related verification records in parallel
    const [extractedRes, correctionsRes, findingsRes, finalResultRes] = await Promise.all([
      db.from("extracted_fields").select("*").eq("inspection_id", inspectionId),
      db.from("inspector_corrections").select("*").eq("inspection_id", inspectionId),
      db.from("compliance_findings").select("*").eq("inspection_id", inspectionId),
      db.from("final_results").select("*").eq("inspection_id", inspectionId).maybeSingle(),
    ]);

    // 3. Map into canonical report contract
    const reportData = mapBackendReportDataToVerificationReport({
      inspection,
      extracted_fields: extractedRes.data || [],
      corrections: correctionsRes.data || [],
      findings: findingsRes.data || [],
      final_result: finalResultRes.data || null,
    });

    // 4. Generate signed PDF in-memory using pure JS pdf-lib
    const pdfBytes = await generateVerificationReportPdf(reportData);

    const safeReportNum = (reportData.reportNumber || `LM-${inspectionId.slice(0, 8)}`).replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

    // 5. Record REPORT_SIGNED activity event & notification
    try {
      await recordActivityEvent({
        action: "REPORT_SIGNED",
        actionLabel: "Inspection Report Generated",
        inspectionId,
        commodityName: inspection.product_type || "Packaged Commodity",
        actorId: user.id,
        actorName: "Legal Metrology Inspector",
        category: "COMPLIANCE",
        details: `Generated cryptographically signed report (${safeReportNum}) under Section 15 & 65B Indian Evidence Act.`,
        notification: {
          targetUserId: user.id,
          type: "COMPLIANT",
          title: "Report Generated",
          message: `Inspection report generated for ${inspection.product_type || "commodity"} (${inspectionId.slice(0, 8).toUpperCase()}).`,
          actionUrl: `/inspections/${inspectionId}/report`,
        },
        metadata: {
          reportNumber: safeReportNum,
          fileSize: pdfBytes.byteLength,
        },
      });
    } catch (eventErr) {
      console.warn("Non-blocking activity event recording error:", eventErr);
    }

    // 6. Stream PDF binary response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Verification_Report_${safeReportNum}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Length": String(pdfBytes.byteLength),
      },
    });
  } catch (err) {
    console.error("PDF generation server error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PDF_GENERATION_FAILED",
          message: "Failed to generate verification report PDF",
          details: err instanceof Error ? err.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
