import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'
import { recordActivityEvent } from '@/lib/events/activity-event'
import { ensurePackerForInspection } from '@/lib/companies/storage'
import { requireAuth, verifyInspectionOwnership } from '@/lib/auth/server'

interface ExtractedFieldInput {
  field_name: string
  extracted_value: string
  confidence_score: number
  source: 'OCR' | 'LLM'
}

interface StoreFieldsRequest {
  fields: ExtractedFieldInput[]
}

interface StoreFieldsResponse {
  message: string
  count: number
  inspection_id: string
}

interface ExtractedFieldRecord {
  id: string
  field_name: string
  extracted_value: string
  confidence_score: number
  source: string
  created_at: string
}

interface GetFieldsResponse {
  inspection_id: string
  count: number
  fields: ExtractedFieldRecord[]
}

// ============= GET EXTRACTED FIELDS =============
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

    // Fetch extracted fields
    const { data: fields, error: fieldsError } = await db
      .from('extracted_fields')
      .select('id, field_name, extracted_value, confidence_score, source, created_at')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true })

    if (fieldsError) {
      console.error('Fetch fields error:', fieldsError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_QUERY_FAILED',
            message: 'Failed to fetch extracted fields',
            details: fieldsError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    const fieldRecords = (fields || []) as ExtractedFieldRecord[]

    return NextResponse.json(
      {
        success: true,
        data: {
          inspection_id: inspectionId,
          count: fieldRecords.length,
          fields: fieldRecords
        } as GetFieldsResponse
      } as ApiResponse<GetFieldsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Get fields error:', err)
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

// ============= POST STORE EXTRACTED FIELDS =============
export async function POST(
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

    const body = (await request.json()) as StoreFieldsRequest

    if (!body.fields || body.fields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'fields array is required and cannot be empty'
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

    // Insert fields
    const fieldsToInsert = body.fields.map((field) => ({
      inspection_id: inspectionId,
      field_name: field.field_name,
      extracted_value: field.extracted_value,
      confidence_score: field.confidence_score,
      source: field.source,
      created_at: new Date().toISOString()
    }))

    const { error: fieldsError } = await db
      .from('extracted_fields')
      .insert(fieldsToInsert)

    if (fieldsError) {
      console.error('Fields insert error:', fieldsError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_INSERT_FAILED',
            message: 'Failed to store extracted fields',
            details: fieldsError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Update inspection status
    const { error: updateError } = await supabase
      .from('inspections')
      .update({ status: 'REVIEWING', updated_at: new Date().toISOString() })
      .eq('id', inspectionId)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    // Auto-link extracted manufacturer declaration to registered packer
    const mfrField = body.fields.find(
      (f) =>
        (f.field_name === 'manufacturer' || f.field_name === 'packer') &&
        f.extracted_value &&
        f.extracted_value.trim().length > 2
    )

    if (mfrField) {
      try {
        const addrField = body.fields.find((f) => f.field_name === 'address')
        const packer = await ensurePackerForInspection(
          mfrField.extracted_value.trim(),
          undefined,
          addrField?.extracted_value,
          user.id
        )
        if (packer) {
          await supabase
            .from('inspections')
            .update({
              company_id: packer.id,
              company_name: packer.name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', inspectionId)
            .eq('inspector_id', user.id)
        }
      } catch (linkErr) {
        console.warn('Could not auto-link extracted manufacturer to packer:', linkErr)
      }
    }

    // Record FIELDS_STORED & OCR_COMPLETED activity events
    try {
      await recordActivityEvent({
        action: 'FIELDS_STORED',
        actionLabel: 'Statutory Declarations Stored',
        inspectionId,
        commodityName: 'Packaged Commodity',
        actorId: user.id,
        actorName: 'Declarations Storage Engine',
        category: 'PIPELINE',
        details: `Stored ${body.fields.length} statutory declaration field(s) into verification record.`,
        metadata: {
          fields_count: body.fields.length,
          fields: body.fields.map((f) => f.field_name),
        },
      });

      await recordActivityEvent({
        action: 'OCR_COMPLETED',
        actionLabel: 'Declarations Ingested',
        inspectionId,
        commodityName: 'Packaged Commodity',
        actorId: user.id,
        actorName: 'Automated Pipeline Engine',
        category: 'PIPELINE',
        details: `Processed package typography. Successfully extracted and structured ${body.fields.length} statutory declarations under Legal Metrology Rule 6.`,
        metadata: {
          fields_count: body.fields.length,
        },
      });
    } catch (eventErr) {
      console.warn('Non-blocking activity event recording error:', eventErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Fields stored successfully',
          count: body.fields.length,
          inspection_id: inspectionId
        } as StoreFieldsResponse
      } as ApiResponse<StoreFieldsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Store fields error:', err)
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