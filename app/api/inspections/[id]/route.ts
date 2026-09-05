import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

interface InspectionDetailResponse {
  id: string
  inspector_id: string
  product_type: string
  image_url: string
  image_path: string
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

    // Fetch inspection record
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('*')
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

    // Fetch related data in parallel
    const [fieldsRes, correctionsRes, findingsRes, finalResultRes] = await Promise.all([
      supabase
        .from('extracted_fields')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: true }),
      supabase
        .from('inspector_corrections')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('timestamp', { ascending: true }),
      supabase
        .from('compliance_findings')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: true }),
      supabase
        .from('final_results')
        .select('*')
        .eq('inspection_id', inspectionId)
        .maybeSingle()
    ])

    const inspectionData: InspectionDetailResponse = {
      id: inspection.id,
      inspector_id: inspection.inspector_id,
      product_type: inspection.product_type,
      image_url: inspection.image_url,
      image_path: inspection.image_path,
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
