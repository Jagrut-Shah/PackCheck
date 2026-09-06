import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ApiResponse } from '@/lib/types/common'
import { recordActivityEvent } from '@/lib/events/activity-event'
import {
  ensurePackerForInspection,
  recordInspectionCompanyLink,
  getAllInspectionCompanyLinks
} from '@/lib/companies/storage'

import { processImageOCR } from '@/lib/ocr'

const FILE_SIZE_LIMIT_BYTES = 15 * 1024 * 1024 // 15 MB

interface UploadedImageInfo {
  filename: string
  storage_path: string
  image_url: string
  image_type: string
  file_size: number
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
  company_id?: string
  company_name?: string
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

// ============================================================
// POST - CREATE INSPECTION + UPLOAD IMAGES
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const uploadedStoragePaths: string[] = []

  try {
    // --------------------------------------------------------
    // 1. Validate content type
    // --------------------------------------------------------

    const contentType = request.headers.get('content-type') || ''

    if (
      !contentType.includes('multipart/form-data') &&
      !contentType.includes('application/x-www-form-urlencoded')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type must be multipart/form-data',
          },
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    const formData = await request.formData()

    // --------------------------------------------------------
    // 2. Collect all uploaded files
    //
    // Supports both:
    //   files
    //   file
    // --------------------------------------------------------

    const files: File[] = []

    for (const value of formData.getAll('files')) {
      if (
        value instanceof File &&
        value.size > 0
      ) {
        files.push(value)
      }
    }

    for (const value of formData.getAll('file')) {
      if (
        value instanceof File &&
        value.size > 0 &&
        !files.includes(value)
      ) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'At least one image file is required',
          },
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // --------------------------------------------------------
    // 3. Validate file sizes
    // --------------------------------------------------------

    const oversizedFiles = files.filter(
      (file) => file.size > FILE_SIZE_LIMIT_BYTES
    )

    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File(s) exceed the 15MB limit: ${oversizedFiles
              .map((file) => file.name)
              .join(', ')}`,
          },
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // --------------------------------------------------------
    // 4. Validate inspector_id
    // --------------------------------------------------------

    const inspectorId = (
      formData.get('inspector_id') as string
    )?.trim()

    if (!inspectorId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_INSPECTOR_ID',
            message: 'inspector_id is required.',
          },
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // --------------------------------------------------------
    // 5. Validate product_type
    //
    // Supports the existing aliases from your frontend.
    // --------------------------------------------------------

    const productType = (
      (
        (formData.get('product_type') as string) ||
        (formData.get('category') as string) ||
        (formData.get('commodity_name') as string) ||
        (formData.get('commodityName') as string)
      )?.trim()
    )

    const manufacturerName = (
      (formData.get('manufacturer_name') as string) ||
      (formData.get('manufacturerName') as string) ||
      (formData.get('company_name') as string) ||
      (formData.get('company') as string)
    )?.trim()

    const brandName = (
      (formData.get('brand_name') as string) ||
      (formData.get('brandName') as string) ||
      (formData.get('brand') as string)
    )?.trim()

    if (!productType) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message:
              'product_type (or category/commodity_name) is required',
          },
        } as ApiResponse<null>,
        { status: 400 }
      )
    }

    // --------------------------------------------------------
    // 6. Storage client
    // --------------------------------------------------------

    const storageClient = supabaseAdmin?.storage ?? supabase.storage

    // --------------------------------------------------------
    // 7. Upload all images to Supabase Storage
    // --------------------------------------------------------

    const uploadResults = await Promise.allSettled(
      files.map(async (file, index) => {
        const timestamp = Date.now()

        const cleanName = file.name.replace(
          /[^a-zA-Z0-9.-]/g,
          '_'
        )

        const storageFilename =
          `${timestamp}_${index}_${cleanName}`

        const { error: storageError } = await storageClient
          .from('product-images')
          .upload(
            storageFilename,
            file,
            {
              cacheControl: '3600',
              upsert: false,
            }
          )

        if (storageError) {
          throw new Error(
            `Storage upload failed for ${file.name}: ${storageError.message}`
          )
        }

        // Keep track of uploaded paths so we can clean them up
        // if a later database operation fails.
        uploadedStoragePaths.push(storageFilename)

        const { data: publicUrlData } =
          storageClient
            .from('product-images')
            .getPublicUrl(storageFilename)

        if (!publicUrlData?.publicUrl) {
          throw new Error(
            `Could not generate public URL for ${file.name}`
          )
        }

        return {
          filename: file.name,
          storage_path: `product-images/${storageFilename}`,
          image_url: publicUrlData.publicUrl,

          // First image is treated as the principal image
          // based on your existing application logic.
          image_type:
            index === 0
              ? 'PRINCIPAL_DISPLAY_PANEL'
              : 'OTHER',

          file_size: file.size,
        } satisfies UploadedImageInfo
      })
    )

    // --------------------------------------------------------
    // 8. Collect successful uploads
    // --------------------------------------------------------

    const uploadedImages: UploadedImageInfo[] = []
    const uploadErrors: string[] = []

    for (const result of uploadResults) {
      if (result.status === 'fulfilled') {
        uploadedImages.push(result.value)
      } else {
        uploadErrors.push(
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown upload error'
        )
      }
    }

    // If none of the images uploaded, fail.
    if (uploadedImages.length === 0) {
      console.error(
        'All storage uploads failed:',
        uploadErrors
      )

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORAGE_UPLOAD_FAILED',
            message:
              'All image uploads failed. Check Supabase Storage bucket permissions.',
            details: uploadErrors.join('; '),
          },
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // If some images failed, continue with the successful ones.
    if (uploadErrors.length > 0) {
      console.warn(
        'Some image uploads failed:',
        uploadErrors
      )
    }

    // --------------------------------------------------------
    // 9. Create ONE inspection
    //
    // IMPORTANT:
    // Do NOT put image_url/image_path here.
    // Images belong in inspection_images.
    // --------------------------------------------------------

    const now = new Date().toISOString()

    let linkedPackerId: string | null = null
    let linkedCompanyName: string | null = null

    if (manufacturerName) {
      try {
        const packer = await ensurePackerForInspection(manufacturerName, brandName)
        if (packer) {
          linkedPackerId = packer.id
          linkedCompanyName = packer.name
        }
      } catch (pErr) {
        console.warn('Could not auto-link packer entity for inspection:', pErr)
      }
    }

    const insertPayload: Record<string, any> = {
      inspector_id: inspectorId,
      product_type: productType,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
    }
    if (linkedPackerId) insertPayload.company_id = linkedPackerId
    if (linkedCompanyName || manufacturerName) {
      insertPayload.company_name = linkedCompanyName || manufacturerName
    }

    let inspectionData: any = null
    let inspectionError: any = null

    const primaryInsert = await supabase
      .from('inspections')
      .insert([insertPayload])
      .select()
      .single()

    if (primaryInsert.error && primaryInsert.error.message?.includes('company_')) {
      const fallbackInsert = await supabase
        .from('inspections')
        .insert([
          {
            inspector_id: inspectorId,
            product_type: productType,
            status: 'PENDING',
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single()
      inspectionData = fallbackInsert.data
      inspectionError = fallbackInsert.error
    } else {
      inspectionData = primaryInsert.data
      inspectionError = primaryInsert.error
    }

    if (inspectionData && (linkedPackerId || linkedCompanyName || manufacturerName)) {
      recordInspectionCompanyLink(
        inspectionData.id,
        linkedPackerId || "",
        linkedCompanyName || manufacturerName || ""
      );
    }

    if (inspectionError || !inspectionData) {
      console.error(
        'Inspection creation error:',
        inspectionError
      )

      // Clean up Storage files because the inspection
      // could not be created.
      if (uploadedStoragePaths.length > 0) {
        const { error: cleanupError } =
          await storageClient
            .from('product-images')
            .remove(uploadedStoragePaths)

        if (cleanupError) {
          console.error(
            'Storage cleanup failed:',
            cleanupError
          )
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_INSERT_FAILED',
            message: 'Failed to create inspection record',
            details:
              inspectionError?.message ??
              'Inspection was not created',
          },
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    // --------------------------------------------------------
    // 10. Create ONE inspection_images row per uploaded image
    //
    // Current schema:
    //
    // id
    // inspection_id
    // image_url
    // image_path
    // image_type
    // file_size
    // created_at
    // --------------------------------------------------------

    const imagesToInsert = uploadedImages.map((image) => ({
      inspection_id: inspectionData.id,
      image_url: image.image_url,
      image_path: image.storage_path,
      image_type: image.image_type,
      file_size: image.file_size,
      created_at: now,
    }))

    const {
      data: imageRecords,
      error: imageInsertError,
    } = await supabase
      .from('inspection_images')
      .insert(imagesToInsert)
      .select()

    // --------------------------------------------------------
    // 11. If image DB insert fails, clean up
    // --------------------------------------------------------

    if (imageInsertError || !imageRecords) {
      console.error(
        'inspection_images insert error:',
        imageInsertError
      )

      // Remove Storage files
      if (uploadedStoragePaths.length > 0) {
        const { error: cleanupError } =
          await storageClient
            .from('product-images')
            .remove(uploadedStoragePaths)

        if (cleanupError) {
          console.error(
            'Storage cleanup failed after image DB failure:',
            cleanupError
          )
        }
      }

      // Remove the inspection we just created.
      const { error: inspectionCleanupError } =
        await supabase
          .from('inspections')
          .delete()
          .eq('id', inspectionData.id)

      if (inspectionCleanupError) {
        console.error(
          'Inspection cleanup failed:',
          inspectionCleanupError
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'IMAGE_RECORD_INSERT_FAILED',
            message:
              'Images were uploaded, but image records could not be created.',
            details:
              imageInsertError?.message ??
              'Unknown inspection_images insert error',
          },
        } as ApiResponse<null>,
        { status: 500 }
      )
    }
    
    //     // ============================================================
    // // 11.5 AUTO-TRIGGER OCR FOR ALL IMAGES (NEW FIX #1)
    // // ============================================================
    // // Fire-and-forget: OCR processes asynchronously
    // // Don't block upload response on OCR completion
    
    // if (imageRecords && imageRecords.length > 0) {
    //   const ocrPromises = imageRecords.map((imgRecord) => {
    //     return processImageOCR({
    //       inspectionId: inspectionData.id,
    //       imageId: imgRecord.id,
    //       imageLocation: imgRecord.image_url,
    //       options: {
    //         deskew: true,
    //         denoise: true,
    //         contrastEnhancement: true,
    //         languages: ["en"],
    //       },
    //     }).catch((err) => {
    //       // Log OCR error but don't fail upload
    //       console.warn(
    //         `[AUTO_OCR] Failed for image ${imgRecord.id}:`,
    //         err instanceof Error ? err.message : err
    //       );
    //       return null; // Indicate failure but continue
    //     });
    //   });

    //   // Wait for all OCR attempts (success or failure)
    //   // Timeout after 60 seconds to avoid blocking upload indefinitely
    //   Promise.allSettled(ocrPromises)
    //     .then((results) => {
    //       const successCount = results.filter(
    //         (r) => r.status === "fulfilled" && r.value !== null
    //       ).length;
    //       const failCount = imageRecords.length - successCount;
          
    //       if (failCount > 0) {
    //         console.warn(
    //           `[AUTO_OCR] Completed: ${successCount} succeeded, ${failCount} failed`
    //         );
    //       } else {
    //         console.info(
    //           `[AUTO_OCR] All ${successCount} images processed successfully`
    //         );
    //       }
    //     })
    //     .catch((err) => {
    //       console.error("[AUTO_OCR] Promise.allSettled error:", err);
    //     });
    // }


    // --------------------------------------------------------
    // 12. Record Authoritative Activity Events & Notifications
    // --------------------------------------------------------
    try {
      await recordActivityEvent({
        action: 'INSPECTION_CREATED',
        actionLabel: 'Inspection Initialized',
        inspectionId: inspectionData.id,
        commodityName: productType,
        actorId: inspectorId,
        actorName: 'Legal Metrology Inspector',
        category: 'USER_ACTION',
        details: `Initiated statutory market surveillance inspection for ${productType}. Initial status: PENDING.`,
        notification: {
          targetUserId: inspectorId,
          type: 'INFO',
          title: 'Inspection Initialized',
          message: `Market surveillance inspection initialized for ${productType} (${inspectionData.id.slice(0, 8).toUpperCase()}).`,
          actionUrl: `/inspections/${inspectionData.id}/processing`,
          metadata: {
            product_type: productType,
            status: 'PENDING',
            violation_count: 0,
          },
        },
        metadata: {
          product_type: productType,
          status: 'PENDING',
          images_count: uploadedImages.length,
        },
      });

      await recordActivityEvent({
        action: 'IMAGE_UPLOADED',
        actionLabel: 'Photograph Evidence Ingested',
        inspectionId: inspectionData.id,
        commodityName: productType,
        actorId: inspectorId,
        actorName: 'Legal Metrology Inspector',
        category: 'PIPELINE',
        details: `Captured and securely ingested ${uploadedImages.length} photographic evidence file(s) into statutory storage.`,
        metadata: {
          images_count: uploadedImages.length,
          primary_image: uploadedImages[0]?.image_url,
        },
      });
    } catch (eventErr) {
      console.warn('Non-blocking activity event recording error:', eventErr);
    }

    // --------------------------------------------------------
    // 13. Return successful response
    // --------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        data: {
          inspection_id: inspectionData.id,

          // Backwards-compatible primary image
          image_url: uploadedImages[0].image_url,

          // All image URLs
          image_urls: uploadedImages.map(
            (image) => image.image_url
          ),

          // Full uploaded image information
          images: uploadedImages,

          status: inspectionData.status,
        } as UploadResponse,
      } as ApiResponse<UploadResponse>,
      { status: 201 }
    )
  } catch (err) {
    console.error('Create inspection/upload error:', err)

    // Best-effort cleanup for unexpected failures.
    if (uploadedStoragePaths.length > 0) {
      try {
        const storageClient =
          supabaseAdmin?.storage ?? supabase.storage

        const { error: cleanupError } =
          await storageClient
            .from('product-images')
            .remove(uploadedStoragePaths)

        if (cleanupError) {
          console.error(
            'Unexpected-error storage cleanup failed:',
            cleanupError
          )
        }
      } catch (cleanupErr) {
        console.error(
          'Unexpected-error cleanup exception:',
          cleanupErr
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
          details:
            err instanceof Error
              ? err.message
              : 'Unknown error',
        },
      } as ApiResponse<null>,
      { status: 500 }
    )
  }
}

// ============================================================
// GET - INSPECTIONS HISTORY
// ============================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const searchParams =
      request.nextUrl.searchParams

    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    )

    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0'),
      0
    )

    const status =
      searchParams.get('status')

    let query =
      supabase
        .from('inspections')
        .select('*')

    let countQuery =
      supabase
        .from('inspections')
        .select('*', {
          count: 'exact',
          head: true,
        })

    if (status) {
      query = query.eq('status', status)
      countQuery = countQuery.eq('status', status)
    }

    const [
      { count: totalCount },
      {
        data: inspections,
        error: inspectionError,
      },
    ] = await Promise.all([
      countQuery,

      query
        .order('created_at', {
          ascending: false,
        })
        .range(
          offset,
          offset + limit - 1
        ),
    ])

    if (inspectionError) {
      console.error(
        'Query error:',
        inspectionError
      )

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_QUERY_FAILED',
            message:
              'Failed to fetch inspections',
            details:
              inspectionError.message,
          },
        } as ApiResponse<null>,
        { status: 500 }
      )
    }

    const inspectionList =
      inspections || []

    // --------------------------------------------------------
    // Fetch violation counts in one query
    // --------------------------------------------------------

    const inspectionIds =
      inspectionList.map(
        (inspection: { id: string }) =>
          inspection.id
      )

    const violationsByInspection:
      Record<string, number> = {}

    if (inspectionIds.length > 0) {
      const { data: findings } =
        await supabase
          .from('compliance_findings')
          .select('inspection_id')
          .in(
            'inspection_id',
            inspectionIds
          )

      for (const finding of findings || []) {
        const id =
          (
            finding as {
              inspection_id: string
            }
          ).inspection_id

        violationsByInspection[id] =
          (violationsByInspection[id] || 0) + 1
      }
    }

    // --------------------------------------------------------
    // Build history response
    // --------------------------------------------------------

    const companyLinks = getAllInspectionCompanyLinks();

    const historyItems:
      InspectionHistoryItem[] =
      inspectionList.map(
        (inspection: {
          id: string
          product_type: string
          company_id?: string
          company_name?: string
          status: string
          created_at: string
        }) => {
          const link = companyLinks[inspection.id];
          const companyName = inspection.company_name || link?.companyName || "";
          const companyId = inspection.company_id || link?.companyId || "";

          return {
            inspection_id:
              inspection.id,

            product_type:
              inspection.product_type,

            company_id:
              companyId,

            company_name:
              companyName,

            status:
              inspection.status,

            violation_count:
              violationsByInspection[
                inspection.id
              ] || 0,

            created_at:
              inspection.created_at,
          };
        }
      )

    return NextResponse.json(
      {
        success: true,
        data: {
          inspections:
            historyItems,

          total:
            totalCount || 0,

          limit,
          offset,
        } as HistoryResponse,
      } as ApiResponse<HistoryResponse>,
      { status: 200 }
    )
  } catch (err) {
    console.error(
      'Get history error:',
      err
    )

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message:
            'Internal server error',
          details:
            err instanceof Error
              ? err.message
              : 'Unknown error',
        },
      } as ApiResponse<null>,
      { status: 500 }
    )
  }
}