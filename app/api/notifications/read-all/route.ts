import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/types/common";
import { markAuthoritativeNotificationRead, recordActivityEvent } from "@/lib/events/activity-event";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    let userId = searchParams.get("user_id");

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    await markAuthoritativeNotificationRead("all", userId || undefined);

    await recordActivityEvent({
      action: "NOTIFICATION_READ",
      actionLabel: "Notifications Cleared",
      actorId: userId || "officer_enforcement",
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