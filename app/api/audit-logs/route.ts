import { NextRequest, NextResponse } from "next/server";
import { getAuthoritativeAuditLogs, recordActivityEvent } from "@/lib/events/activity-event";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inspectionIdFilter =
      searchParams.get("inspection_id") || searchParams.get("inspectionId") || undefined;
    const actionFilter = searchParams.get("action");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim() || undefined;

    const logs = await getAuthoritativeAuditLogs({
      inspectionId: inspectionIdFilter,
      action: actionFilter && actionFilter !== "ALL" ? actionFilter : undefined,
      search: searchQuery,
    });

    return NextResponse.json({
      success: true,
      data: {
        total: logs.length,
        logs,
      },
      message: "Audit logs retrieved successfully",
    });
  } catch (err) {
    console.error("GET /api/audit-logs exception:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error fetching audit trail",
          details: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await recordActivityEvent(body);
    return NextResponse.json({
      success: true,
      data: result,
      message: "Audit log recorded successfully",
    });
  } catch (err) {
    console.error("POST /api/audit-logs exception:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RECORD_FAILED",
          message: "Failed to record audit log",
        },
      },
      { status: 500 }
    );
  }
}
