/**
 * PackCheck AI - Structured Extraction Module
 * Owner: Member 3 (LLM Extraction + Compliance Rules Engine)
 * Purpose: Transforms raw OCR output into Legal Metrology Rule 6 declarations using LLM + Zod schema validation.
 */

import { OCRResult } from "@/lib/types/ocr";
import { ExtractedDeclarations } from "@/lib/types/extraction";
import { CONFIDENCE_LEVEL } from "@/lib/types/common";
import { MOCK_EXTRACTION_AMUL_GHEE, MOCK_EXTRACTION_NUTRIBITE } from "@/mocks/extraction";
import { parseOCRRawText } from "./parser";
import { enrichMissingFieldsWithGemini } from "./gemini";
import { getDailyGeminiUsage } from "./budget";

export interface ExtractionContext {
  productName?: string;
  brandName?: string;
  manufacturerName?: string;
  category?: string;
}

export function createDynamicDeclarations(context?: ExtractionContext): ExtractedDeclarations {
  const prod = context?.productName?.trim() || "";

  return {
    commodityName: {
      value: prod,
      rawValue: prod.toUpperCase(),
      confidence: prod ? 0.98 : 0,
      confidenceLevel: prod ? CONFIDENCE_LEVEL.HIGH : CONFIDENCE_LEVEL.LOW,
    },
    brandName: {
      value: context?.brandName?.trim() || "",
      rawValue: (context?.brandName || "").toUpperCase(),
      confidence: context?.brandName ? 0.96 : 0,
      confidenceLevel: context?.brandName ? CONFIDENCE_LEVEL.HIGH : CONFIDENCE_LEVEL.LOW,
    },
    manufacturerOrPacker: {
      value: {
        name: context?.manufacturerName?.trim() || "",
        address: "",
        role: "MANUFACTURED_AND_PACKED_BY",
        rawText: "",
      },
      confidence: context?.manufacturerName ? 0.94 : 0,
      confidenceLevel: context?.manufacturerName ? CONFIDENCE_LEVEL.HIGH : CONFIDENCE_LEVEL.LOW,
    },
    netQuantity: {
      value: {
        declaredQuantity: 0,
        unit: "",
        isStandardUnit: false,
        rawText: "",
      },
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    manufacturingOrPackingDate: {
      value: {
        month: 0,
        year: 0,
        formattedText: "",
        declarationType: "MANUFACTURE",
      },
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    expiryOrBestBeforeDate: {
      value: {
        formattedText: "",
        declarationType: "BEST_BEFORE",
      },
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    mrp: {
      value: {
        amountInRupees: 0,
        isInclusiveOfAllTaxes: false,
        currencySymbol: "",
        rawText: "",
      },
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    consumerCare: {
      value: {
        rawText: "",
      },
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    countryOfOrigin: {
      value: "",
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    unitSalePrice: {
      value: {
        amountInRupees: 0,
        unit: "",
        rawText: "",
        isDeclared: false,
      },
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    sizesOrDimensions: {
      value: "",
      confidence: 0,
      confidenceLevel: CONFIDENCE_LEVEL.LOW,
    },
    extractedAt: new Date().toISOString(),
    modelUsed: "Legal Metrology OCR Parser v1.0",
  };
}

export async function extractDeclarationsFromOCR(
  ocrResult: OCRResult,
  context?: ExtractionContext
): Promise<ExtractedDeclarations> {
  const rawText = ocrResult?.rawText || "";
  const name = context?.productName?.toLowerCase() || "";

  // Fall back to legacy demo mocks ONLY if rawText is completely empty
  if (!rawText) {
    if (name.includes("ghee") || name.includes("amul")) {
      return MOCK_EXTRACTION_AMUL_GHEE;
    }
    if (name.includes("cookie") || name.includes("nutribite")) {
      return MOCK_EXTRACTION_NUTRIBITE;
    }
  }

  const baseDeclarations = createDynamicDeclarations(context);

  // Step 1: Run deterministic parseOCRRawText FIRST
  const parsed = parseOCRRawText(rawText, context?.productName);

  const initialDeclarations: ExtractedDeclarations = {
    ...baseDeclarations,
    commodityName: parsed.commodityName.confidence > 0 ? parsed.commodityName : baseDeclarations.commodityName,
    manufacturerOrPacker:
      parsed.manufacturerOrPacker.confidence > 0 ? parsed.manufacturerOrPacker : baseDeclarations.manufacturerOrPacker,
    netQuantity: parsed.netQuantity,
    manufacturingOrPackingDate: parsed.manufacturingOrPackingDate,
    mrp: parsed.mrp,
    unitSalePrice: parsed.unitSalePrice,
    consumerCare: parsed.consumerCare,
    countryOfOrigin: parsed.countryOfOrigin,
  };

  if (!rawText) {
    return initialDeclarations;
  }

  // Step 2: Identify fields with confidence === 0 or < 0.5 requiring enrichment
  const missingFields: string[] = [];
  if (initialDeclarations.commodityName.confidence < 0.5) missingFields.push("commodityName");
  if (initialDeclarations.manufacturerOrPacker.confidence < 0.5) missingFields.push("manufacturerOrPacker");
  if (initialDeclarations.netQuantity.confidence < 0.5) missingFields.push("netQuantity");
  if (initialDeclarations.manufacturingOrPackingDate.confidence < 0.5) missingFields.push("manufacturingOrPackingDate");
  if (initialDeclarations.mrp.confidence < 0.5) missingFields.push("mrp");
  if (initialDeclarations.consumerCare.confidence < 0.5) missingFields.push("consumerCare");
  if (!initialDeclarations.countryOfOrigin || initialDeclarations.countryOfOrigin.confidence < 0.5)
    missingFields.push("countryOfOrigin");
  if (initialDeclarations.unitSalePrice && initialDeclarations.unitSalePrice.confidence < 0.5)
    missingFields.push("unitSalePrice");

  // Step 3: If no fields require enrichment, SKIP Gemini completely
  if (missingFields.length === 0) {
    return initialDeclarations;
  }

  // Step 4: Check application budget before calling Gemini
  const { remaining, count, limit } = getDailyGeminiUsage();
  if (remaining <= 0) {
    console.warn(`[Extraction] Gemini enrichment skipped: daily budget exhausted (${count}/${limit} requests used today). Preserving deterministic extraction.`);
    initialDeclarations.modelUsed = "Deterministic OCR Parser (Gemini skipped: daily budget exhausted)";
    return initialDeclarations;
  }

  // Step 5: Call Gemini ONLY for missing/low-confidence fields
  const geminiEnriched = await enrichMissingFieldsWithGemini(rawText, missingFields, context?.productName);

  if (!geminiEnriched) {
    initialDeclarations.modelUsed = "Deterministic OCR Parser (Gemini fallback)";
    return initialDeclarations;
  }

  // Step 6: Merge validated Gemini values ONLY into missing/low-confidence fields (NEVER overwrite confidence >= 0.5)
  const finalDeclarations: ExtractedDeclarations = { ...initialDeclarations };

  if (missingFields.includes("commodityName") && geminiEnriched.commodityName) {
    finalDeclarations.commodityName = geminiEnriched.commodityName;
  }
  if (missingFields.includes("manufacturerOrPacker") && geminiEnriched.manufacturerOrPacker) {
    finalDeclarations.manufacturerOrPacker = geminiEnriched.manufacturerOrPacker;
  }
  if (missingFields.includes("netQuantity") && geminiEnriched.netQuantity) {
    finalDeclarations.netQuantity = geminiEnriched.netQuantity;
  }
  if (missingFields.includes("manufacturingOrPackingDate") && geminiEnriched.manufacturingOrPackingDate) {
    finalDeclarations.manufacturingOrPackingDate = geminiEnriched.manufacturingOrPackingDate;
  }
  if (missingFields.includes("mrp") && geminiEnriched.mrp) {
    finalDeclarations.mrp = geminiEnriched.mrp;
  }
  if (missingFields.includes("consumerCare") && geminiEnriched.consumerCare) {
    finalDeclarations.consumerCare = geminiEnriched.consumerCare;
  }
  if (missingFields.includes("countryOfOrigin") && geminiEnriched.countryOfOrigin) {
    finalDeclarations.countryOfOrigin = geminiEnriched.countryOfOrigin;
  }
  if (missingFields.includes("unitSalePrice") && geminiEnriched.unitSalePrice) {
    finalDeclarations.unitSalePrice = geminiEnriched.unitSalePrice;
  }

  finalDeclarations.modelUsed = "Deterministic OCR Parser + Gemini AI 3.8 Flash Hybrid";

  return finalDeclarations;
}
