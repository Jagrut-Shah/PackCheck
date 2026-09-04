import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'

interface UploadedImageInfo {
  filename: string
  storage_path: string
  image_url: string
}

interface UploadResponse {
  inspection_id: string
  image_url: string
  image_urls: string[]
  images: UploadedImageInfo[]
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

// ============= POST CREATE INSPECTION & UPLOAD =============
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type must be multipart/form-data'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const formData = await request.formData()

    // Collect all uploaded files (supports both single 'file' and multiple 'files' / 'file')
    const files: File[] = []
    const multipleFiles = formData.getAll('files') as File[]
    if (multipleFiles && multipleFiles.length > 0) {
      for (const f of multipleFiles) {
        if (f && typeof f !== 'string' && f.size > 0) files.push(f)
      }
    }
    const singleFiles = formData.getAll('file') as File[]
    if (singleFiles && singleFiles.length > 0) {
      for (const f of singleFiles) {
        if (f && typeof f !== 'string' && f.size > 0 && !files.includes(f)) files.push(f)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'At least one image file is required'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // Validate size of each file
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File ${file.name} exceeds the 10MB limit`
            }
          } as ApiResponse<null>,
          { status: 400 }
        )
      }
    }

    // Validate inspector_id
    const inspectorId = (formData.get('inspector_id') as string)?.trim()
    if (!inspectorId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_INSPECTOR_ID',
            message: 'inspector_id is required. Authenticated-user-derived inspector_id will be linked during authentication integration.'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // Validate product_type (accepts product_type, category, or commodity_name)
    const productType = (
      (formData.get('product_type') as string) ||
      (formData.get('category') as string) ||
      (formData.get('commodity_name') as string) ||
      (formData.get('commodityName') as string)
    )?.trim()

    if (!productType) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'product_type (or category/commodity_name) is required'
          }
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // Upload files to Supabase Storage bucket 'product-images'
    const storageClient = supabaseAdmin?.storage || supabase.storage
    const uploadedImages: UploadedImageInfo[] = []

    for (const file of files) {
      const timestamp = Date.now()
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}-${cleanName}`
      const filePath = `product-images/${filename}`

      const { error: storageError } = await storageClient
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
              message: `Failed to upload image ${file.name}`,
              details: storageError.message
            }
          } as ApiResponse<null>,
          { status: 500 }
        )
      }

      const { data: publicUrlData } = storageClient
        .from('product-images')
        .getPublicUrl(filename)

      uploadedImages.push({
        filename: file.name,
        storage_path: filePath,
        image_url: publicUrlData.publicUrl
      })
    }

    const primaryImageUrl = uploadedImages[0].image_url
    const primaryImagePath = uploadedImages[0].storage_path

    // Insert record into Supabase 'inspections' table
    // Only existing schema columns are persisted to prevent Postgres column errors
    const { data: inspectionData, error: dbError } = await supabase
      .from('inspections')
      .insert([
        {
          inspector_id: inspectorId,
          product_type: productType,
          image_url: primaryImageUrl,
          image_path: primaryImagePath,
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
          image_url: primaryImageUrl,
          image_urls: uploadedImages.map((img) => img.image_url),
          images: uploadedImages,
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

// ============= GET INSPECTIONS HISTORY =============
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    let query = supabase.from('inspections').select('*')
    let countQuery = supabase.from('inspections').select('*', { count: 'exact', head: true })

    if (status) {
      query = query.eq('status', status)
      countQuery = countQuery.eq('status', status)
    }

    // Get total count
    const { count: totalCount } = await countQuery

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

    const inspectionList = inspections || []

    // Get violation counts for each inspection
    const historyItems: InspectionHistoryItem[] = await Promise.all(
      inspectionList.map(async (inspection: any) => {
        const { count: violationCount } = await supabase
          .from('compliance_findings')
          .select('*', { count: 'exact', head: true })
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