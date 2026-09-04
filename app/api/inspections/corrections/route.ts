import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

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
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const inspectionId = params.id
    const body = (await request.json()) as StoreCorrectionsRequest

    if (!body.corrections || body.corrections.length === 0) {
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