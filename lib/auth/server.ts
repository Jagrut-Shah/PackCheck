import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { ApiResponse } from "@/lib/types/common";

/**
 * Extracts and verifies the authenticated Supabase user from incoming NextRequest.
 * Authoritative source: Supabase Auth server verification of the Bearer access token.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const authClient = supabaseAdmin || supabase;
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    console.error("Error verifying authenticated user token:", err);
    return null;
  }
}

/**
 * Enforces that a request has a valid authenticated session.
 * If unauthenticated, returns a 401 Unauthorized NextResponse.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: User; errorResponse?: never } | { user?: never; errorResponse: NextResponse }> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in.",
          },
        } as ApiResponse<null>,
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Verifies that the specified inspection exists AND belongs to the authenticated user.
 * Prevents cross-account data discovery or unauthorized operations on child records.
 */
export async function verifyInspectionOwnership(
  inspectionId: string,
  userId: string
): Promise<{ authorized: boolean; inspection?: any; errorStatus?: number; errorMessage?: string }> {
  const db = supabaseAdmin || supabase;
  try {
    const { data: inspection, error } = await db
      .from("inspections")
      .select("id, inspector_id, product_type, status, created_at, updated_at")
      .eq("id", inspectionId)
      .single();

    if (error || !inspection) {
      return { authorized: false, errorStatus: 404, errorMessage: `Inspection ${inspectionId} not found` };
    }

    if (inspection.inspector_id !== userId) {
      // Return 404 to avoid leaking existence of other users' inspections
      return { authorized: false, errorStatus: 404, errorMessage: `Inspection ${inspectionId} not found` };
    }

    return { authorized: true, inspection };
  } catch (err) {
    console.error(`Error verifying inspection ownership for ${inspectionId}:`, err);
    return { authorized: false, errorStatus: 500, errorMessage: "Internal error checking inspection ownership" };
  }
}
