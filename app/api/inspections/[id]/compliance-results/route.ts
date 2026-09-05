import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse, toBackendComplianceStatus } from '@/lib/types/common'

interface FindingInput {
  rule_id: string
  rule_name: string
  violation_type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
}

interface ComplianceResultsRequest {
  status: 'PASS' | 'FAIL' | 'MANUAL_REVIEW' | 'POTENTIAL_NON_COMPLIANCE'
  findings: FindingInput[]
}

interface ComplianceResultsResponse {
  message: string
  final_status: string
  violations: number
  inspection_id: string
}

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

    const body = (await request.json()) as ComplianceResultsRequest

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'status is required'
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

    // Insert findings
    if (body.findings && body.findings.length > 0) {
      const findingsToInsert = body.findings.map((finding) => ({
        inspection_id: inspectionId,
        rule_id: finding.rule_id,
        rule_name: finding.rule_name,
        violation_type: finding.violation_type,
        severity: finding.severity,
        message: finding.message,
        evidence: null,
        created_at: new Date().toISOString()
      }))

      const { error: findingsError } = await supabase
        .from('compliance_findings')
        .insert(findingsToInsert)

      if (findingsError) {
        console.error('Findings insert error:', findingsError)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DB_INSERT_FAILED',
              message: 'Failed to store findings',
              details: findingsError.message
            }
          } as ApiResponse<null>,
          { status: 500 }
        )
      }
    }

    // Insert final result
    const normalizedStatus = toBackendComplianceStatus(body.status)
    const highSeverityCount = (body.findings || []).filter((f) => f.severity === 'HIGH').length

    const { error: resultError } = await supabase
      .from('final_results')
      .insert([
        {
          inspection_id: inspectionId,
          status: normalizedStatus,
          total_violations_count: (body.findings || []).length,
          high_severity_count: highSeverityCount,
          findings_json: body.findings || [],
          created_at: new Date().toISOString()
        }
      ])

    if (resultError) {
      console.error('Result insert error:', resultError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_INSERT_FAILED',
            message: 'Failed to store final result',
            details: resultError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Update inspection status
    const { error: updateError } = await supabase
      .from('inspections')
      .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', inspectionId)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Compliance results stored',
          final_status: body.status,
          violations: (body.findings || []).length,
          inspection_id: inspectionId
        } as ComplianceResultsResponse
      } as ApiResponse<ComplianceResultsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Store results error:', err)
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
