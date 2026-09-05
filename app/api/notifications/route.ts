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


export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    console.log('Marking all as read for user:', userId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'User ID required'
          }
        } as ApiResponse<null>,
        { status: 401 }
      )
    }

    // Mark all COMPLETED inspections as viewed
    const { error: updateError } = await supabase
      .from('inspections')
      .update({
        viewed_at: new Date().toISOString()
      })
      .eq('inspector_id', userId)
      .eq('status', 'COMPLETED')
      .is('viewed_at', null)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_UPDATE_FAILED',
            message: 'Failed to mark notifications as read'
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { message: 'All notifications marked as read' }
      } as ApiResponse<any>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      } as ApiResponse<null>,
      { status: 500 }
    )
  }
}