import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

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
  try {
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

    // Verify inspection exists
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id')
      .eq('id', inspectionId)
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

    // Fetch extracted fields
    const { data: fields, error: fieldsError } = await supabase
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
  try {
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

    // Verify inspection exists
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id')
      .eq('id', inspectionId)
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

    // Insert fields
    const fieldsToInsert = body.fields.map((field) => ({
      inspection_id: inspectionId,
      field_name: field.field_name,
      extracted_value: field.extracted_value,
      confidence_score: field.confidence_score,
      source: field.source,
      created_at: new Date().toISOString()
    }))

    const { error: fieldsError } = await supabase
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