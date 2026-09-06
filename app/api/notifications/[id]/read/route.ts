import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/types/common";
import { markAuthoritativeNotificationRead } from "@/lib/events/activity-event";
import { requireAuth } from "@/lib/auth/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { id: notificationOrInspectionId } = await context.params;

    await markAuthoritativeNotificationRead(notificationOrInspectionId, user.id);

    return NextResponse.json(
      {
        success: true,
        data: { message: "Notification marked as read" },
      } as ApiResponse<any>,
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/notifications/[id]/read error:", err);
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
