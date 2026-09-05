import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

interface NotificationItem {
  id: string
  inspection_id: string
  product_type: string
  status: string
  violation_count: number
  created_at: string
}

interface NotificationsResponse {
  notifications: NotificationItem[]
  unread_count: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user from auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'User authentication required'
          }
        } as ApiResponse<null>,
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    // Build query: Get inspections that are COMPLETED
    let query = supabase
      .from('inspections')
      .select('id, product_type, status, created_at, updated_at, viewed_at')
      .eq('inspector_id', user.id)
      .eq('status', 'COMPLETED')
      .order('updated_at', { ascending: false })

    if (unreadOnly) {
      query = query.is('viewed_at', null) // unread = viewed_at is NULL
    }

    const { data: inspections, error: inspectionsError } = await query.limit(limit)

    if (inspectionsError) {
      console.error('Inspections fetch error:', inspectionsError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_QUERY_FAILED',
            message: 'Failed to fetch notifications',
            details: inspectionsError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Get violation count for each inspection
    const notificationsWithViolations: NotificationItem[] = await Promise.all(
      inspections.map(async (inspection: any) => {
        const { count: violationCount } = await supabase
          .from('compliance_findings')
          .select('*', { count: 'exact' })
          .eq('inspection_id', inspection.id)

        return {
          id: inspection.id,
          inspection_id: inspection.id,
          product_type: inspection.product_type,
          status: inspection.status,
          violation_count: violationCount || 0,
          created_at: inspection.created_at
        }
      })
    )

    // Count unread (where viewed_at IS NULL)
    const { count: unreadCount } = await supabase
      .from('inspections')
      .select('*', { count: 'exact' })
      .eq('inspector_id', user.id)
      .eq('status', 'COMPLETED')
      .is('viewed_at', null)

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications: notificationsWithViolations,
          unread_count: unreadCount || 0
        } as NotificationsResponse
      } as ApiResponse<NotificationsResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Get notifications error:', err)
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