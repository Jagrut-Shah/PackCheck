import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/types/common";
import {
  getAuthoritativeNotifications,
  markAuthoritativeNotificationRead,
  recordActivityEvent,
} from "@/lib/events/activity-event";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const { notifications, unreadCount } = await getAuthoritativeNotifications({
      userId,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
      },
      message: "Notifications retrieved successfully",
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error fetching notifications",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id") || undefined;

    await markAuthoritativeNotificationRead("all", userId);

    // Record audit event for notification acknowledgement
    await recordActivityEvent({
      action: "NOTIFICATION_READ",
      actionLabel: "Notifications Cleared",
      actorId: userId || "officer_enforcement",
      actorName: "Legal Metrology Inspector",
      details: "Inspector acknowledged and marked all notifications as read.",
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
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error marking notifications as read",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}