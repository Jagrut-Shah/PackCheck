import { NextRequest, NextResponse } from "next/server";
import { getAuthoritativeAuditLogs, recordActivityEvent } from "@/lib/events/activity-event";
import { requireAuth, verifyInspectionOwnership } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const inspectionIdFilter =
      searchParams.get("inspection_id") || searchParams.get("inspectionId") || undefined;
    const actionFilter = searchParams.get("action");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim() || undefined;

    if (inspectionIdFilter) {
      const isOwner = await verifyInspectionOwnership(inspectionIdFilter, user.id);
      if (!isOwner) {
        return NextResponse.json({
          success: true,
          data: {
            total: 0,
            logs: [],
          },
          message: "Audit logs retrieved successfully",
        });
      }
    }

    const logs = await getAuthoritativeAuditLogs({
      userId: user.id,
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
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();

    if (body.inspectionId) {
      const isOwner = await verifyInspectionOwnership(body.inspectionId, user.id);
      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Inspection not found or unauthorized",
            },
          },
          { status: 404 }
        );
      }
    }

    const result = await recordActivityEvent({
      ...body,
      actorId: user.id,
    });

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
