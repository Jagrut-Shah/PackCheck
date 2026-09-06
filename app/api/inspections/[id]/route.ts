import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'
import { recordActivityEvent } from '@/lib/events/activity-event'
import { getInspectionCompanyLink, getInspectionCompanyLinkAsync } from '@/lib/companies/storage'
import { requireAuth, verifyInspectionOwnership } from '@/lib/auth/server'

interface InspectionDetailResponse {
  id: string
  inspector_id: string
  product_type: string
  company_id?: string
  company_name?: string
  image_url: string
  image_path: string
  images?: any[]
  status: string
  created_at: string
  updated_at: string
  extracted_fields: any[]
  corrections: any[]
  findings: any[]
  final_result: any | null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const db = supabaseAdmin || supabase;
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { id: inspectionId } = await context.params

    if (!inspectionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Inspection ID is required in URL path'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // Verify ownership
    const ownership = await verifyInspectionOwnership(inspectionId, user.id);
    if (!ownership.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSPECTION_NOT_FOUND',
            message: ownership.errorMessage || `Inspection ${inspectionId} not found`
          }
        } as ApiResponse<null>,
        { status: ownership.errorStatus || 404 }
      )
    }

    // Fetch inspection record
    const { data: inspection, error: inspectionError } = await db
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .eq('inspector_id', user.id)
      .single()

    if (inspectionError || !inspection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSPECTION_NOT_FOUND',
            message: `Inspection ${inspectionId} not found`
          }
        } as ApiResponse<null>,
        { status: 404 }
      )
    }

    // Fetch related data in parallel including real uploaded images
    const [fieldsRes, correctionsRes, findingsRes, finalResultRes, imagesRes] = await Promise.all([
      db
        .from('extracted_fields')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: true }),
      db
        .from('inspector_corrections')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('timestamp', { ascending: true }),
      db
        .from('compliance_findings')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: true }),
      db
        .from('final_results')
        .select('*')
        .eq('inspection_id', inspectionId)
        .maybeSingle(),
      db
        .from('inspection_images')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: false })
    ])

    const localLink = await getInspectionCompanyLinkAsync(inspectionId);
    const companyId = inspection.company_id || localLink?.companyId;
    let companyName = inspection.company_name || localLink?.companyName;

    if (!companyName || companyName.trim() === ":") {
      const mf = fieldsRes.data?.find(
        (f: any) =>
          f.field_name === "manufacturer" &&
          f.extracted_value &&
          f.extracted_value.trim() !== ":" &&
          f.extracted_value.trim() !== ""
      );
      if (mf) {
        companyName = mf.extracted_value.trim();
      }
    }

    const primaryImage = imagesRes.data?.[0];
    const imageUrl = primaryImage?.image_url || inspection.image_url || '';
    const imagePath = primaryImage?.image_path || inspection.image_path || '';

    const inspectionData: InspectionDetailResponse = {
      id: inspection.id,
      inspector_id: inspection.inspector_id,
      product_type: inspection.product_type,
      company_id: companyId,
      company_name: companyName,
      image_url: imageUrl,
      image_path: imagePath,
      images: imagesRes.data || [],
      status: inspection.status,
      created_at: inspection.created_at,
      updated_at: inspection.updated_at,
      extracted_fields: fieldsRes.data || [],
      corrections: correctionsRes.data || [],
      findings: findingsRes.data || [],
      final_result: finalResultRes.data || null
    }

    return NextResponse.json(
      {
        success: true,
        data: inspectionData
      } as ApiResponse<InspectionDetailResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Get inspection error:', err)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
          details: err instanceof Error ? err.message : 'Unknown error'
        }
      } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const db = supabaseAdmin || supabase;
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { id: inspectionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { status } = body;

    if (!inspectionId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Inspection ID and status are required'
          }
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
            code: 'INSPECTION_NOT_FOUND',
            message: ownership.errorMessage || `Inspection ${inspectionId} not found`
          }
        } as ApiResponse<null>,
        { status: ownership.errorStatus || 404 }
      );
    }

    const { error } = await db
      .from('inspections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inspectionId)
      .eq('inspector_id', user.id);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: error.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Record STATUS_CHANGED activity event
    try {
      const isReview = status === "MANUAL_REVIEW";
      await recordActivityEvent({
        action: "STATUS_CHANGED",
        actionLabel: `Status Changed to ${status}`,
        inspectionId,
        actorId: user.id,
        actorName: "Legal Metrology Inspector",
        category: "USER_ACTION",
        details: `Inspection status updated to ${status}.`,
        notification: isReview
          ? {
              targetUserId: user.id,
              type: "REVIEW",
              title: "Manual Review Required",
              message: `Inspection ${inspectionId.slice(0, 8).toUpperCase()} was moved to manual review.`,
              actionUrl: `/inspections/${inspectionId}/review`,
            }
          : undefined,
        metadata: { status },
      });
    } catch (eventErr) {
      console.warn("Non-blocking activity event recording error:", eventErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: inspectionId, status }
      } as ApiResponse<{ id: string; status: string }>,
      { status: 200 }
    );
  } catch (err) {
    console.error('Patch inspection error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error updating inspection',
          details: err instanceof Error ? err.message : 'Unknown error'
        }
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
