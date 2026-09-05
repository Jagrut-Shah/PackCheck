/**
 * PackCheck AI - Server-Safe Gemini AI Extraction Client
 * Member 3 Extraction Module
 * Integrates Google GenAI JavaScript SDK (@google/genai) for structured statutory field extraction.
 * Server-only module: Accesses API key exclusively via process.env.
 */

import { GoogleGenAI } from "@google/genai";
import { CONFIDENCE_LEVEL } from "@/lib/types/common";
import { ExtractedDeclarations } from "@/lib/types/extraction";
import { zodPartialDeclarationsSchema, ZodPartialDeclarations } from "./schemas";

/**
 * Gets server-side Gemini API key without exposing to client bundles.
 */
function getApiKey(): string | undefined {
  if (typeof window !== "undefined") return undefined;
  return process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || process.env.GOOGLE_API_KEY;
}

/**
 * Enriches missing or low-confidence statutory fields using Gemini AI.
 * Called ONLY when missing/low-confidence fields are detected and an API key is configured.
 */
export async function enrichMissingFieldsWithGemini(
  rawText: string,
  missingFields: string[],
  contextProductName?: string
): Promise<Partial<ExtractedDeclarations> | null> {
  const apiKey = getApiKey();
  if (!apiKey || !rawText || missingFields.length === 0) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Legal Metrology (Packaged Commodities) Rules, 2011 statutory declaration extractor.
Extract ONLY the following statutory package fields from the raw OCR text below.
Requested Fields: ${missingFields.join(", ")}
${contextProductName ? `Product Name Hint: ${contextProductName}` : ""}

RAW OCR TEXT:
---
${rawText}
---

Return ONLY a valid JSON object strictly adhering to this schema structure (do not include markdown or explanations):
{
  "commodityName": string or null,
  "manufacturerOrPacker": { "name": string, "address": string, "pincode": string, "role": "MANUFACTURER" | "PACKER" | "IMPORTER" | "MANUFACTURED_AND_PACKED_BY", "rawText": string } or null,
  "netQuantity": { "declaredQuantity": number, "unit": string, "isStandardUnit": boolean, "rawText": string } or null,
  "manufacturingOrPackingDate": { "month": number, "year": number, "formattedText": "MM/YYYY", "declarationType": "MANUFACTURE" | "PACKING" } or null,
  "mrp": { "amountInRupees": number, "isInclusiveOfAllTaxes": boolean, "currencySymbol": string, "rawText": string } or null,
  "consumerCare": { "telephoneOrMobile": string, "email": string, "rawText": string } or null,
  "countryOfOrigin": string or null,
  "unitSalePrice": { "amountInRupees": number, "unit": string, "rawText": string, "isDeclared": boolean } or null
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return null;

    const parsedJson = JSON.parse(text);
    const validated: ZodPartialDeclarations = zodPartialDeclarationsSchema.parse(parsedJson);

    const enriched: Partial<ExtractedDeclarations> = {};

    if (missingFields.includes("commodityName") && validated.commodityName) {
      enriched.commodityName = {
        field: "commodityName",
        value: validated.commodityName,
        rawValue: validated.commodityName,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (missingFields.includes("manufacturerOrPacker") && validated.manufacturerOrPacker?.name) {
      enriched.manufacturerOrPacker = {
        field: "manufacturerOrPacker",
        value: {
          name: validated.manufacturerOrPacker.name || "",
          address: validated.manufacturerOrPacker.address || "",
          pincode: validated.manufacturerOrPacker.pincode,
          role: validated.manufacturerOrPacker.role || "MANUFACTURER",
          rawText:
            validated.manufacturerOrPacker.rawText ||
            `${validated.manufacturerOrPacker.name}, ${validated.manufacturerOrPacker.address}`,
        },
        rawValue: validated.manufacturerOrPacker.rawText || validated.manufacturerOrPacker.name,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (missingFields.includes("netQuantity") && validated.netQuantity?.declaredQuantity) {
      enriched.netQuantity = {
        field: "netQuantity",
        value: {
          declaredQuantity: validated.netQuantity.declaredQuantity,
          unit: validated.netQuantity.unit || "",
          isStandardUnit: Boolean(validated.netQuantity.isStandardUnit),
          rawText:
            validated.netQuantity.rawText ||
            `${validated.netQuantity.declaredQuantity} ${validated.netQuantity.unit}`,
        },
        rawValue:
          validated.netQuantity.rawText ||
          `${validated.netQuantity.declaredQuantity} ${validated.netQuantity.unit}`,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (missingFields.includes("manufacturingOrPackingDate") && validated.manufacturingOrPackingDate?.formattedText) {
      enriched.manufacturingOrPackingDate = {
        field: "manufacturingOrPackingDate",
        value: {
          month: validated.manufacturingOrPackingDate.month || 0,
          year: validated.manufacturingOrPackingDate.year || 0,
          formattedText: validated.manufacturingOrPackingDate.formattedText,
          declarationType: validated.manufacturingOrPackingDate.declarationType || "MANUFACTURE",
        },
        rawValue: validated.manufacturingOrPackingDate.formattedText,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (missingFields.includes("mrp") && validated.mrp?.amountInRupees) {
      enriched.mrp = {
        field: "mrp",
        value: {
          amountInRupees: validated.mrp.amountInRupees,
          isInclusiveOfAllTaxes: Boolean(validated.mrp.isInclusiveOfAllTaxes),
          currencySymbol: validated.mrp.currencySymbol || "₹",
          rawText: validated.mrp.rawText || `MRP ₹${validated.mrp.amountInRupees}`,
        },
        rawValue: validated.mrp.rawText || `MRP ₹${validated.mrp.amountInRupees}`,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (
      missingFields.includes("consumerCare") &&
      (validated.consumerCare?.telephoneOrMobile || validated.consumerCare?.email || validated.consumerCare?.rawText)
    ) {
      enriched.consumerCare = {
        field: "consumerCare",
        value: {
          telephoneOrMobile: validated.consumerCare?.telephoneOrMobile,
          email: validated.consumerCare?.email,
          rawText:
            validated.consumerCare?.rawText ||
            [validated.consumerCare?.telephoneOrMobile, validated.consumerCare?.email].filter(Boolean).join(" "),
        },
        rawValue: validated.consumerCare?.rawText || "",
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (missingFields.includes("countryOfOrigin") && validated.countryOfOrigin) {
      enriched.countryOfOrigin = {
        field: "countryOfOrigin",
        value: validated.countryOfOrigin,
        rawValue: `Explicit AI extracted: ${validated.countryOfOrigin}`,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    if (
      missingFields.includes("unitSalePrice") &&
      validated.unitSalePrice?.isDeclared &&
      validated.unitSalePrice.amountInRupees
    ) {
      enriched.unitSalePrice = {
        field: "unitSalePrice",
        value: {
          amountInRupees: validated.unitSalePrice.amountInRupees,
          unit: validated.unitSalePrice.unit || "",
          rawText:
            validated.unitSalePrice.rawText ||
            `USP ₹${validated.unitSalePrice.amountInRupees} / ${validated.unitSalePrice.unit}`,
          isDeclared: true,
        },
        rawValue:
          validated.unitSalePrice.rawText ||
          `USP ₹${validated.unitSalePrice.amountInRupees} / ${validated.unitSalePrice.unit}`,
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "LLM",
      };
    }

    return enriched;
  } catch (error) {
    console.error("[Gemini Extraction Error]:", error);
    return null;
  }
}
