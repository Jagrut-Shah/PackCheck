import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const inspectionId = params.id

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

    // Mark inspection as viewed
    const { error: updateError } = await supabase
      .from('inspections')
      .update({
        viewed_at: new Date().toISOString()
      })
      .eq('id', inspectionId)
      .eq('inspector_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_UPDATE_FAILED',
            message: 'Failed to mark notification as read'
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Notification marked as read' }
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