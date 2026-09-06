import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'
import { recordActivityEvent } from '@/lib/events/activity-event'
import { requireAuth, verifyInspectionOwnership } from '@/lib/auth/server'

interface CorrectionInput {
  field_name: string
  original_value: string
  corrected_value: string
}

interface StoreCorrectionsRequest {
  corrections: CorrectionInput[]
}

interface StoreCorrectionsResponse {
  message: string
  count: number
  inspection_id: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Verify inspection exists and belongs to this user
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

    const body = (await request.json()) as StoreCorrectionsRequest

    if (!body.corrections || !Array.isArray(body.corrections) || body.corrections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'corrections array is required and cannot be empty'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // Validate correction items
    for (const item of body.corrections) {
      if (!item.field_name || item.original_value === undefined || item.corrected_value === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Each correction must include field_name, original_value, and corrected_value'
            }
          } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    const inspection = ownership.inspection;

    // Insert corrections
    const correctionsToInsert = body.corrections.map((correction) => ({
      inspection_id: inspectionId,
      field_name: correction.field_name,
      original_value: correction.original_value,
      corrected_value: correction.corrected_value,
      timestamp: new Date().toISOString()
    }))

    const { error: correctionsError } = await supabase
      .from('inspector_corrections')
      .insert(correctionsToInsert)

    if (correctionsError) {
      console.error('Corrections insert error:', correctionsError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_INSERT_FAILED',
            message: 'Failed to store corrections',
            details: correctionsError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }


    // ============================================================
    // AUTO-TRIGGER RE-EVALUATION (NEW FIX #4)
    // ============================================================
    // After corrections are stored, automatically re-evaluate
    // compliance with the corrected data
    
    try {
      const authHeader = request.headers.get('authorization') || '';
      const forwardHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) {
        forwardHeaders['Authorization'] = authHeader;
      }

      const reEvalResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inspections/${inspectionId}/re-evaluate`,
        {
          method: 'POST',
          headers: forwardHeaders,
          body: JSON.stringify({}),
        }
      );

      if (!reEvalResponse.ok) {
        const reEvalError = await reEvalResponse.text();
        console.warn('[AUTO_RE_EVAL] Re-evaluation failed:', reEvalError);
        // Don't fail the correction response, just log the warning
      } else {
        const reEvalData = await reEvalResponse.json();
        console.info(
          '[AUTO_RE_EVAL] Success:',
          reEvalData.data?.message
        );
      }
    } catch (reEvalErr) {
      console.error('[AUTO_RE_EVAL] Unexpected error:', reEvalErr);
      // Don't fail correction response
    }


    // Record FIELD_CORRECTED events
    try {
      for (const item of body.corrections) {
        await recordActivityEvent({
          action: "FIELD_CORRECTED",
          actionLabel: "Field Correction Overridden",
          inspectionId,
          commodityName: inspection.product_type || "Packaged Commodity",
          actorId: user.id,
          actorName: "Legal Metrology Inspector",
          category: "USER_ACTION",
          details: `Inspector manually verified declaration '${item.field_name}': altered value from '${item.original_value || "null"}' to '${item.corrected_value}'.`,
          notification: {
            targetUserId: user.id,
            type: "REVIEW",
            title: "Field Declaration Overridden",
            message: `Declaration '${item.field_name}' overridden to '${item.corrected_value}' for ${inspectionId.slice(0, 8).toUpperCase()}.`,
            actionUrl: `/inspections/${inspectionId}/review`,
          },
          metadata: {
            field_name: item.field_name,
            original_value: item.original_value,
            corrected_value: item.corrected_value,
          },
        });
      }
    } catch (eventErr) {
      console.warn("Non-blocking activity event recording error:", eventErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Corrections stored successfully',
          count: body.corrections.length,
          inspection_id: inspectionId
        } as StoreCorrectionsResponse
      } as ApiResponse<StoreCorrectionsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Store corrections error:', err)
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
