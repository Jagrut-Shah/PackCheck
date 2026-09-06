import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/types/common";
import { markAuthoritativeNotificationRead, recordActivityEvent } from "@/lib/events/activity-event";
import { requireAuth } from "@/lib/auth/server";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    await markAuthoritativeNotificationRead("all", user.id);

    await recordActivityEvent({
      action: "NOTIFICATION_READ",
      actionLabel: "Notifications Cleared",
      actorId: user.id,
      actorName: "Legal Metrology Inspector",
      details: "Inspector cleared and acknowledged all unread notifications.",
      category: "USER_ACTION",
    });

    return NextResponse.json(
      {
        success: true,
        data: { message: "All notifications marked as read" },
      } as ApiResponse<any>,
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/notifications/read-all error:", err);
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