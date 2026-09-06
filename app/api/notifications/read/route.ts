import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/types/common";
import { markAuthoritativeNotificationRead } from "@/lib/events/activity-event";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const notificationOrInspectionId = searchParams.get("id") || searchParams.get("inspection_id");
    const userId = searchParams.get("user_id") || undefined;

    if (!notificationOrInspectionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Notification or inspection ID required",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    await markAuthoritativeNotificationRead(notificationOrInspectionId, userId);

    return NextResponse.json(
      {
        success: true,
        data: { message: "Notification marked as read" },
      } as ApiResponse<any>,
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/notifications/read error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}