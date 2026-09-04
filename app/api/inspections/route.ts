import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse, PaginatedApiResponse } from '@/lib/types/common'

interface UploadResponse {
  inspection_id: string
  image_url: string
  status: string
}

interface InspectionHistoryItem {
  inspection_id: string
  product_type: string
  status: string
  violation_count: number
  created_at: string
}

interface HistoryResponse {
  inspections: InspectionHistoryItem[]
  total: number
  limit: number
  offset: number
}

// ============= POST UPLOAD =============
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const productType = formData.get('product_type') as string
    const inspectorId = formData.get('inspector_id') as string

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'File is required'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File must be smaller than 10MB'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    if (!productType || !inspectorId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'product_type and inspector_id are required'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filePath = `product-images/${filename}`

    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORAGE_UPLOAD_FAILED',
            message: 'Failed to upload image',
            details: storageError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filename)

    const imageUrl = publicUrlData.publicUrl

    const { data: inspectionData, error: dbError } = await supabase
      .from('inspections')
      .insert([
        {
          inspector_id: inspectorId,
          product_type: productType,
          image_url: imageUrl,
          image_path: filePath,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (dbError) {
      console.error('DB insert error:', dbError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_INSERT_FAILED',
            message: 'Failed to create inspection record',
            details: dbError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          inspection_id: inspectionData.id,
          image_url: imageUrl,
          status: 'PENDING'
        } as UploadResponse
      } as ApiResponse<UploadResponse>,
      { status: 201 }
    )
  } catch (err) {
    console.error('Upload error:', err)
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

// ============= GET HISTORY =============
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    let query = supabase.from('inspections').select('*')

    if (status) {
      query = query.eq('status', status)
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('inspections')
      .select('*', { count: 'exact' })

    // Get paginated results
    const { data: inspections, error: inspectionError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (inspectionError) {
      console.error('Query error:', inspectionError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_QUERY_FAILED',
            message: 'Failed to fetch inspections',
            details: inspectionError.message
          }
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // Get violation counts for each inspection
    const historyItems: InspectionHistoryItem[] = await Promise.all(
      inspections.map(async (inspection: any) => {
        const { count: violationCount } = await supabase
          .from('compliance_findings')
          .select('*', { count: 'exact' })
          .eq('inspection_id', inspection.id)

        return {
          inspection_id: inspection.id,
          product_type: inspection.product_type,
          status: inspection.status,
          violation_count: violationCount || 0,
          created_at: inspection.created_at
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          inspections: historyItems,
          total: totalCount || 0,
          limit,
          offset
        } as HistoryResponse
      } as ApiResponse<HistoryResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error('Get history error:', err)
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