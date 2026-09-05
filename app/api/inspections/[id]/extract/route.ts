import { NextRequest, NextResponse } from "next/server";
import { extractDeclarationsFromOCR, ExtractionContext } from "@/lib/extraction";
import { OCRResult } from "@/lib/types/ocr";
import { ExtractedDeclarations } from "@/lib/types/extraction";
import { ApiResponse, PROCESSING_STATUS } from "@/lib/types/common";

interface ExtractDeclarationsRequestBody {
  rawText?: string;
  ocrResult?: Partial<OCRResult>;
  context?: ExtractionContext;
}

/**
 * Server-side extraction route for Member 3 Legal Metrology declarations.
 * Executes OCR rawText parsing and server-only Gemini AI enrichment without exposing
 * API keys to client JavaScript bundles.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
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

    const body = (await request.json().catch(() => ({}))) as ExtractDeclarationsRequestBody;
    const rawText = body.rawText ?? body.ocrResult?.rawText ?? "";

    const ocrPayload: OCRResult = {
      id: body.ocrResult?.id || `ocr_${inspectionId}`,
      imageId: body.ocrResult?.imageId || `img_${inspectionId}`,
      inspectionId,
      engine: body.ocrResult?.engine || "PaddleOCR",
      engineVersion: body.ocrResult?.engineVersion || "v2.7.3",
      processingStatus: body.ocrResult?.processingStatus || PROCESSING_STATUS.COMPLETED,
      rawText,
      overallConfidence: body.ocrResult?.overallConfidence ?? 0.9,
      averageConfidence: body.ocrResult?.averageConfidence ?? 0.9,
      processingTimeMs: body.ocrResult?.processingTimeMs ?? 250,
      detectedLanguages: body.ocrResult?.detectedLanguages ?? ["en"],
      processedAt: body.ocrResult?.processedAt || new Date().toISOString(),
      detectedTextItems: body.ocrResult?.detectedTextItems || [],
      blocks: body.ocrResult?.blocks || [],
    };

    const extractionCtx: ExtractionContext = {
      productName: body.context?.productName,
      brandName: body.context?.brandName,
      manufacturerName: body.context?.manufacturerName,
    };

    // Execute extractDeclarationsFromOCR on Node.js Server
    const declarations: ExtractedDeclarations = await extractDeclarationsFromOCR(
      ocrPayload,
      extractionCtx
    );

    return NextResponse.json(
      {
        success: true,
        data: declarations,
      } as ApiResponse<ExtractedDeclarations>,
      { status: 200 }
    );
  } catch (err) {
    console.error("Server extraction route error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Internal server error during declaration extraction",
          details: err instanceof Error ? err.message : "Unknown error",
        },
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
