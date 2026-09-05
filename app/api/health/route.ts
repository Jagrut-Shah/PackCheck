import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Simple query to test connection
    const { error } = await supabase
      .from('inspections')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_CONNECTION_FAILED',
            message: 'Failed to connect to Supabase',
            details: error.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: null,
        message: 'Connected to Supabase'
      } as ApiResponse<null>,
      { status: 200 }
    )
  } catch (err) {
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