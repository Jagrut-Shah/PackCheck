import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'
import { requireAuth } from '@/lib/auth/server'

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
  const { user, errorResponse } = await requireAuth(request)
  if (errorResponse) {
    return errorResponse
  }
  const db = supabaseAdmin || supabase

  try {
    const searchParams = request.nextUrl.searchParams
    const requestedGroupBy = searchParams.get('group_by')
    const groupBy: keyof Inspection =
      requestedGroupBy === 'id' || requestedGroupBy === 'status' || requestedGroupBy === 'product_type'
        ? requestedGroupBy
        : 'product_type'

    // Get inspections belonging strictly to this user
    const { data: inspections, error: inspectionsError } = await db
      .from('inspections')
      .select('id, status, product_type')
      .eq('inspector_id', user.id)

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

    if (!inspections || inspections.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            data: [],
            group_by: groupBy
          } as AnalyticsResponse
        } as ApiResponse<AnalyticsResponse>,
        { status: 200 }
      )
    }

    const userInspectionIds = inspections.map((i: any) => i.id)

    // Get findings only for this user's inspections
    const { data: findings, error: findingsError } = await db
      .from('compliance_findings')
      .select('inspection_id')
      .in('inspection_id', userInspectionIds)

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

    // Get final results only for this user's inspections
    const { data: finalResults } = await db
      .from('final_results')
      .select('inspection_id, status')
      .in('inspection_id', userInspectionIds)

    // Aggregate by groupBy field
    const aggregated: { [key: string]: { pass: number; fail: number; violations: number } } = {}

    inspections.forEach((inspection: Inspection) => {
      const key = inspection[groupBy] || 'Unknown'
      if (!aggregated[key]) {
        aggregated[key] = { pass: 0, fail: 0, violations: 0 }
      }

      const result = finalResults?.find((r: any) => r.inspection_id === inspection.id)
      const outcome = result?.status || inspection.status

      if (outcome === 'PASS') {
        aggregated[key].pass += 1
      } else if (outcome === 'FAIL' || outcome === 'POTENTIAL_NON_COMPLIANCE') {
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