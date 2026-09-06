import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'
import { requireAuth, verifyInspectionOwnership } from '@/lib/auth/server'

interface ReportDataResponse {
  inspection: any
  extracted_fields: any[]
  corrections: any[]
  findings: any[]
  final_result: any
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

    // Fetch inspection
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

    // Fetch extracted fields
    const { data: extractedFields, error: fieldsError } = await db
      .from('extracted_fields')
      .select('*')
      .eq('inspection_id', inspectionId)

    if (fieldsError) {
      console.error('Fetch extracted fields error:', fieldsError)
    }

    // Fetch corrections
    const { data: corrections, error: correctionsError } = await db
      .from('inspector_corrections')
      .select('*')
      .eq('inspection_id', inspectionId)

    if (correctionsError) {
      console.error('Fetch corrections error:', correctionsError)
    }

    // Fetch findings
    const { data: findings, error: findingsError } = await db
      .from('compliance_findings')
      .select('*')
      .eq('inspection_id', inspectionId)

    if (findingsError) {
      console.error('Fetch findings error:', findingsError)
    }

    // Fetch final result
    const { data: finalResult, error: resultError } = await db
      .from('final_results')
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle()

    if (resultError) {
      console.error('Fetch final result error:', resultError)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          inspection: inspection,
          extracted_fields: extractedFields || [],
          corrections: corrections || [],
          findings: findings || [],
          final_result: finalResult || null
        } as ReportDataResponse
      } as ApiResponse<ReportDataResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Get report data error:', err)
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
