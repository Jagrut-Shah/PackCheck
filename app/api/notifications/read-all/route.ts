import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user
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

    // Mark all COMPLETED inspections as viewed
    const { error: updateError } = await supabase
      .from('inspections')
      .update({
        viewed_at: new Date().toISOString()
      })
      .eq('inspector_id', user.id)
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