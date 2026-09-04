import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

interface Inspection {
  id: string
  status: string
  product_type: string
}

interface AnalyticsItem {
  category: string
  violation_count: number
  pass_count: number
  fail_count: number
  fail_rate: string
}

interface AnalyticsResponse {
  data: AnalyticsItem[]
  group_by: string
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedGroupBy = searchParams.get('group_by')
    const groupBy: keyof Inspection =
      requestedGroupBy === 'id' || requestedGroupBy === 'status' || requestedGroupBy === 'product_type'
        ? requestedGroupBy
        : 'product_type'

    // Get all inspections
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('id, status, product_type')

    if (inspectionsError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_QUERY_FAILED',
            message: 'Failed to fetch inspections',
            details: inspectionsError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Get all findings
    const { data: findings, error: findingsError } = await supabase
      .from('compliance_findings')
      .select('inspection_id')

    if (findingsError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_QUERY_FAILED',
            message: 'Failed to fetch findings',
            details: findingsError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Aggregate by groupBy field
    const aggregated: { [key: string]: { pass: number; fail: number; violations: number } } = {}

    inspections.forEach((inspection: Inspection) => {
      const key = inspection[groupBy] || 'Unknown'
      if (!aggregated[key]) {
        aggregated[key] = { pass: 0, fail: 0, violations: 0 }
      }

      if (inspection.status === 'COMPLETED') {
        aggregated[key].pass += 1
      } else if (inspection.status === 'COMPLETED') {
        aggregated[key].fail += 1
      }
    })

    // Count violations per key
    findings.forEach((finding: any) => {
      const inspection = inspections.find((i: Inspection) => i.id === finding.inspection_id)
      if (inspection) {
        const key = String(inspection[groupBy] || 'Unknown')
        if (aggregated[key]) {
          aggregated[key].violations += 1
        }
      }
    })

    // Format response
    const data: AnalyticsItem[] = Object.entries(aggregated).map(([category, stats]: any) => {
      const total = stats.pass + stats.fail
      const failRate = total > 0 ? ((stats.fail / total) * 100).toFixed(2) : '0.00'

      return {
        category,
        violation_count: stats.violations,
        pass_count: stats.pass,
        fail_count: stats.fail,
        fail_rate: `${failRate}%`
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          data: data.sort((a, b) => b.violation_count - a.violation_count),
          group_by: groupBy
        } as AnalyticsResponse
      } as ApiResponse<AnalyticsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Analytics error:', err)
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