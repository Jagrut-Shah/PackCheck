import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { processImageOCR, OcrServiceError } from "@/lib/ocr";
import { OCRResult } from "@/lib/types/ocr";
import { ApiResponse } from "@/lib/types/common";
import { recordActivityEvent } from "@/lib/events/activity-event";
import { requireAuth, verifyInspectionOwnership } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-side route executing OCR via the FastAPI PaddleOCR microservice.
 * Communicates using internal OCR_SERVICE_URL and OCR_SERVICE_API_KEY.
 * Persists raw OCR output and bounding boxes to Supabase.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const routeStartTime = Date.now();
  const db = supabaseAdmin || supabase;
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { id: inspectionId } = await context.params;

    if (!inspectionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Inspection ID is required in URL path",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Verify ownership
    const ownership = await verifyInspectionOwnership(inspectionId, user.id);
    if (!ownership.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSPECTION_NOT_FOUND",
            message: ownership.errorMessage || `Inspection ${inspectionId} not found`,
          },
        } as ApiResponse<null>,
        { status: ownership.errorStatus || 404 }
      );
    }

    // 1. Fetch inspection details
    const { data: inspection, error: inspectionError } = await db
      .from("inspections")
      .select("*")
      .eq("id", inspectionId)
      .eq("inspector_id", user.id)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSPECTION_NOT_FOUND",
            message: `Inspection ${inspectionId} not found`,
          },
        } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // 2. Fetch associated images (ordered by created_at DESC for latest image)
    const body = await request.json().catch(() => ({}));
    const requestedImageId = body.imageId;

    let imageQuery = db
      .from("inspection_images")
      .select("*")
      .eq("inspection_id", inspectionId);

    if (requestedImageId) {
      imageQuery = imageQuery.eq("id", requestedImageId);
    }

    const { data: images } = await imageQuery.order("created_at", { ascending: false });

    // Determine primary image candidate
    const primary = images && images.length > 0 ? images[0] : null;
    const hasImageRecord = Boolean(
      primary || inspection.image_url || inspection.image_path || body.imageLocation
    );

    // If no image record exists anywhere in DB
    if (!hasImageRecord) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "IMAGE_NOT_FOUND",
            message: "No image uploaded for this inspection.",
          },
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 3. Resolve target image reference and validate storage retrieval
    const targetImageId = requestedImageId || primary?.id || `img_${inspectionId}`;
    const rawStoragePath = primary?.image_path || inspection.image_path || "";
    const rawImageUrl = primary?.image_url || inspection.image_url || body.imageLocation || "";
    const bucketName = "product-images";

    // Strip bucket prefix if present in the stored path
    const objectKey = rawStoragePath.replace(/^product-images\//, "");

    let targetImageLocation = "";
    let resolvedSourceType = "storage_public";
    let isRetrievalSuccess = false;
    let contentType = "image/jpeg";
    let byteLength = primary?.file_size || 0;
    let retrievalErrorDetails: string | null = null;

    if (objectKey) {
      try {
        // Download and validate actual image bytes via server-side Supabase Storage client
        const { data: fileData, error: downloadError } = await db.storage
          .from(bucketName)
          .download(objectKey);

        if (downloadError || !fileData) {
          isRetrievalSuccess = false;
          retrievalErrorDetails = downloadError?.message || "Object not found in storage bucket";
        } else {
          isRetrievalSuccess = true;
          byteLength = fileData.size;
          contentType = fileData.type || "image/jpeg";

          // Generate temporary signed URL with 1-hour expiration
          const { data: signedData, error: signError } = await db.storage
            .from(bucketName)
            .createSignedUrl(objectKey, 3600);

          if (!signError && signedData?.signedUrl) {
            targetImageLocation = signedData.signedUrl;
            resolvedSourceType = "storage_signed";
          } else if (rawImageUrl && rawImageUrl.startsWith("http")) {
            targetImageLocation = rawImageUrl;
            resolvedSourceType = "storage_public";
          } else {
            const { data: pubData } = db.storage.from(bucketName).getPublicUrl(objectKey);
            targetImageLocation = pubData.publicUrl;
            resolvedSourceType = "storage_public";
          }
        }
      } catch (stErr) {
        isRetrievalSuccess = false;
        retrievalErrorDetails = stErr instanceof Error ? stErr.message : "Storage access exception";
      }
    } else if (rawImageUrl && rawImageUrl.startsWith("http")) {
      // Remote HTTP URL without storage object key
      targetImageLocation = rawImageUrl;
      resolvedSourceType = "http_direct";
      try {
        const headRes = await fetch(rawImageUrl, { method: "HEAD" });
        if (headRes.ok) {
          isRetrievalSuccess = true;
          contentType = headRes.headers.get("content-type") || "image/jpeg";
          const len = headRes.headers.get("content-length");
          if (len) byteLength = parseInt(len, 10);
        } else {
          isRetrievalSuccess = false;
          retrievalErrorDetails = `HTTP probe returned status ${headRes.status} (${headRes.statusText})`;
        }
      } catch (fetchErr) {
        isRetrievalSuccess = false;
        retrievalErrorDetails = fetchErr instanceof Error ? fetchErr.message : "HTTP reachability failed";
      }
    }

    // SAFE DIAGNOSTIC LOGGING (strictly omits API keys, service-role keys, and tokens)
    console.log("[OCR_DIAGNOSTICS]", {
      inspection_id: inspectionId,
      image_id: targetImageId,
      bucket: bucketName,
      storage_path: rawStoragePath || "N/A",
      resolved_source_type: resolvedSourceType,
      retrieval: isRetrievalSuccess ? "success" : "failure",
      content_type: contentType,
      bytes: byteLength,
    });

    // Validate retrieval success and non-empty byte payload
    if (!isRetrievalSuccess || !targetImageLocation || byteLength === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "IMAGE_RETRIEVAL_FAILED",
            message: "Inspection image exists, but the OCR service could not retrieve it from storage.",
            details: retrievalErrorDetails || `Storage object ${rawStoragePath} is empty or inaccessible.`,
          },
        } as ApiResponse<null>,
        { status: 502 }
      );
    }

    // 4. Call PaddleOCR FastAPI microservice with function deadline guard
    // Race against 58s deadline to ensure Next.js returns a clean JSON error before Vercel/proxies send raw 504 HTML
    const routeDeadlineMs = 58000;
    let timeoutHandle: NodeJS.Timeout | null = null;
    const deadlinePromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new OcrServiceError(
            "Vercel function timeout: OCR processing pipeline reached the 58-second execution deadline.",
            "VERCEL_FUNCTION_TIMEOUT",
            504,
            { routeDeadlineMs, stage: "PaddleOCR Processing" }
          )
        );
      }, routeDeadlineMs);
    });

    let ocrResult: OCRResult;
    try {
      ocrResult = await Promise.race([
        processImageOCR({
          inspectionId,
          imageId: targetImageId,
          imageLocation: targetImageLocation,
          options: body.options || {
            deskew: true,
            denoise: true,
            contrastEnhancement: true,
            languages: ["en"],
          },
        }),
        deadlinePromise,
      ]);
    } catch (ocrErr: any) {
      const errMsg = ocrErr?.message || "";
      const isRetrievalFailure =
        errMsg.includes("ImageDownloadError") ||
        errMsg.includes("404") ||
        errMsg.includes("not found") ||
        errMsg.includes("fetch image");

      if (isRetrievalFailure) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "IMAGE_RETRIEVAL_FAILED",
              message: "Inspection image exists, but the OCR service could not retrieve it from storage.",
              details: errMsg,
            },
          } as ApiResponse<null>,
          { status: 502 }
        );
      }
      throw ocrErr;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }

    // 5. Persist OCR result in Supabase
    try {
      const { error: insertError } = await db.from("ocr_results").insert([
        {
          inspection_id: inspectionId,
          image_id: targetImageId.startsWith("img_") ? null : targetImageId,
          engine: ocrResult.engine || "PaddleOCR",
          engineVersion: ocrResult.engineVersion || "v2.7.3",
          raw_text: ocrResult.rawText,
          overall_confidence: ocrResult.overallConfidence,
          detected_text_items: ocrResult.detectedTextItems,
          blocks: ocrResult.blocks,
        },
      ]);

      if (insertError) {
        console.warn("Could not persist to ocr_results table (schema might be missing table):", insertError.message);
      }
    } catch (dbErr) {
      console.warn("Error inserting ocr_results:", dbErr);
    }

    // 5. Update inspection status to PROCESSING if currently PENDING
    if (inspection.status === "PENDING") {
      await db
        .from("inspections")
        .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
        .eq("id", inspectionId);
    }

    // 6. Record OCR_COMPLETED activity event
    try {
      await recordActivityEvent({
        action: "OCR_COMPLETED",
        actionLabel: "OCR Processing Completed",
        inspectionId,
        commodityName: inspection.product_type || "Packaged Commodity",
        actorId: inspection.inspector_id || "officer_enforcement",
        actorName: "Automated OCR Pipeline",
        category: "PIPELINE",
        details: `Processed package typography via ${ocrResult.engine || "PaddleOCR"}. Structured detected items with overall confidence ${Math.round((ocrResult.overallConfidence || 0) * 100)}%.`,
        metadata: {
          overall_confidence: ocrResult.overallConfidence,
          detected_items_count: ocrResult.detectedTextItems?.length || 0,
        },
      });
    } catch (eventErr) {
      console.warn("Non-blocking activity event recording error:", eventErr);
    }

    const totalDurationMs = Date.now() - routeStartTime;
    console.log(`[OCR_ROUTE_SUCCESS] Inspection ${inspectionId} OCR completed successfully in ${totalDurationMs}ms.`);

    return NextResponse.json(
      {
        success: true,
        data: ocrResult,
      } as ApiResponse<OCRResult>,
      { status: 200 }
    );
  } catch (err: any) {
    const elapsedMs = Date.now() - routeStartTime;

    // Distinguish and categorize all 7 failure modes
    let errorCode = "OCR_PROCESSING_FAILED";
    let errorStatus = 500;
    let errorMessage = "Failed to execute OCR processing pipeline.";
    let errorDetails: unknown = err instanceof Error ? err.message : "Unknown error";

    if (err instanceof OcrServiceError) {
      errorCode = err.code;
      errorStatus = err.statusCode;
      errorMessage = err.message;
      errorDetails = err.details || err.message;
    } else if (err instanceof Error) {
      const msg = err.message || "";
      if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
        errorCode = "FASTAPI_CONNECTION_FAILURE";
        errorStatus = 503;
        errorMessage = "FastAPI connection failure: Could not connect to PaddleOCR microservice. Ensure the microservice is running.";
      } else if (msg.includes("PADDLEOCR_PROCESSING_TIMEOUT") || msg.includes("PaddleOCR processing timeout")) {
        errorCode = "PADDLEOCR_PROCESSING_TIMEOUT";
        errorStatus = 504;
        errorMessage = "PaddleOCR processing timeout: OCR inference took longer than allowed.";
      } else if (msg.includes("FASTAPI_TIMEOUT") || msg.includes("timeout") || msg.includes("504")) {
        errorCode = "FASTAPI_TIMEOUT";
        errorStatus = 504;
        errorMessage = "FastAPI timeout: The OCR microservice timed out while processing.";
      } else if (msg.includes("MALFORMED_OCR_RESPONSE") || msg.includes("JSON") || msg.includes("Unexpected token")) {
        errorCode = "MALFORMED_OCR_RESPONSE";
        errorStatus = 502;
        errorMessage = "Malformed response: Upstream OCR service returned non-JSON data.";
      } else if (msg.includes("GEMINI") || msg.includes("Gemini")) {
        errorCode = "DOWNSTREAM_GEMINI_TIMEOUT";
        errorStatus = 504;
        errorMessage = "Downstream Gemini API timeout during extraction enrichment.";
      } else if (msg.includes("VERCEL_FUNCTION_TIMEOUT")) {
        errorCode = "VERCEL_FUNCTION_TIMEOUT";
        errorStatus = 504;
        errorMessage = "Vercel function timeout: OCR pipeline reached maximum execution limit.";
      } else if (msg.includes("IMAGE_RETRIEVAL_FAILED") || msg.includes("ImageDownloadError")) {
        errorCode = "IMAGE_RETRIEVAL_FAILED";
        errorStatus = 502;
        errorMessage = "Inspection image exists, but the OCR service could not retrieve it from storage.";
      } else {
        errorCode = "UNEXPECTED_SERVER_EXCEPTION";
        errorStatus = 500;
        errorMessage = `Internal server error during OCR processing: ${msg}`;
      }
    }

    console.error(`[OCR_ROUTE_CATEGORIZED_ERROR] [${errorCode}] (HTTP ${errorStatus}, ${elapsedMs}ms):`, {
      code: errorCode,
      status: errorStatus,
      message: errorMessage,
      details: errorDetails,
      elapsedMs,
    });

    try {
      const { id: inspectionId } = await context.params;
      await recordActivityEvent({
        action: "OCR_FAILED",
        actionLabel: "OCR Processing Failed",
        inspectionId,
        category: "PIPELINE",
        details: `OCR processing failed (${errorCode}): ${errorMessage}`,
        notification: {
          targetUserId: userId || "officer",
          type: "CRITICAL",
          title: "OCR Processing Failed",
          message: `OCR processing failed for inspection ${inspectionId.slice(0, 8).toUpperCase()}: ${errorMessage}`,
          actionUrl: `/inspections/${inspectionId}/processing`,
        },
      });
    } catch (eventErr) {
      console.warn("Non-blocking activity event recording error:", eventErr);
    }

    // Always return valid JSON ApiResponse
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
        },
      } as ApiResponse<null>,
      { status: errorStatus }
    );
  }
}
