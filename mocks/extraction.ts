/**
 * PackCheck AI - Mock Structured Extraction Data
 * Simulates LLM extraction + Zod schema validation outputs for Legal Metrology Rule 6.
 */

import { ExtractedDeclarations } from "@/types/extraction";
import { CONFIDENCE_LEVEL } from "@/types/common";

export const MOCK_EXTRACTION_AMUL_GHEE: ExtractedDeclarations = {
  commodityName: {
    value: "Pure Ghee",
    rawValue: "AMUL PURE GHEE",
    confidence: 0.98,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 30, width: 280, height: 40 },
  },
  brandName: {
    value: "Amul",
    rawValue: "AMUL",
    confidence: 0.99,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
  },
  manufacturerOrPacker: {
    value: {
      name: "Kaira District Co-operative Milk Producers' Union Ltd.",
      address: "Anand, Gujarat - 388001",
      pincode: "388001",
      role: "MANUFACTURED_AND_PACKED_BY",
      rawText: "Mfd & Pkd by: Kaira District Co-operative Milk Producers' Union Ltd., Anand 388001, Gujarat",
    },
    confidence: 0.94,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 120, width: 450, height: 35 },
  },
  netQuantity: {
    value: {
      declaredQuantity: 1,
      unit: "l",
      isStandardUnit: true,
      rawText: "1 L (905 g)",
    },
    confidence: 0.97,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 78, width: 140, height: 28 },
  },
  manufacturingOrPackingDate: {
    value: {
      month: 12,
      year: 2025,
      formattedText: "12/2025",
      declarationType: "MANUFACTURE",
    },
    confidence: 0.93,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 165, width: 320, height: 26 },
  },
  mrp: {
    value: {
      amountInRupees: 650.0,
      isInclusiveOfAllTaxes: true,
      rawText: "MRP ₹650.00 (INCL. OF ALL TAXES)",
      currencySymbol: "₹",
    },
    confidence: 0.97,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 200, width: 310, height: 30 },
  },
  unitSalePrice: {
    value: {
      amountInRupees: 0.65,
      unit: "ml",
      rawText: "USP ₹0.65 / ml",
      isDeclared: true,
    },
    confidence: 0.92,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 238, width: 150, height: 24 },
  },
  consumerCare: {
    value: {
      contactPersonOrDesignation: "Customer Care Cell",
      telephoneOrMobile: "1800 258 3333",
      email: "customercare@amul.coop",
      address: "Anand 388001, Gujarat",
      rawText: "Call Toll Free 1800 258 3333 or email customercare@amul.coop",
    },
    confidence: 0.91,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_amul_front_001",
    boundingBox: { x: 45, y: 270, width: 460, height: 28 },
  },
  countryOfOrigin: {
    value: "India",
    confidence: 0.98,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
  },
  extractedAt: "2026-09-03T11:21:00Z",
  modelUsed: "gemini-1.5-pro-structured-v2",
};

export const MOCK_EXTRACTION_NUTRIBITE: ExtractedDeclarations = {
  commodityName: {
    value: "High Protein Cookies",
    rawValue: "NUTRIBITE HIGH PROTEIN COOKIES",
    confidence: 0.92,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_nutribite_back_002",
    boundingBox: { x: 50, y: 40, width: 350, height: 42 },
  },
  brandName: {
    value: "NutriBite",
    rawValue: "NUTRIBITE",
    confidence: 0.95,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
  },
  manufacturerOrPacker: {
    value: {
      name: "NutriBite Foods Pvt Ltd",
      address: "Plot 14, Okhla Phase 3, New Delhi 110020",
      pincode: "110020",
      role: "MANUFACTURER",
      rawText: "Manufactured by: NutriBite Foods Pvt Ltd, Plot 14, Okhla Phase 3, New Delhi 110020",
    },
    confidence: 0.9,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_nutribite_back_002",
    boundingBox: { x: 50, y: 130, width: 480, height: 38 },
  },
  netQuantity: {
    value: {
      declaredQuantity: 250,
      unit: "g",
      isStandardUnit: true,
      rawText: "Net Wt: 250 g",
    },
    confidence: 0.91,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_nutribite_back_002",
    boundingBox: { x: 50, y: 90, width: 160, height: 28 },
  },
  manufacturingOrPackingDate: {
    value: {
      month: 8,
      year: 2026,
      formattedText: "08/2026",
      declarationType: "PACKING",
    },
    confidence: 0.88,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_nutribite_back_002",
    boundingBox: { x: 50, y: 180, width: 280, height: 28 },
  },
  expiryOrBestBeforeDate: {
    value: {
      month: 2,
      year: 2027,
      formattedText: "02/2027",
      declarationType: "BEST_BEFORE",
    },
    confidence: 0.87,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
  },
  mrp: {
    value: {
      amountInRupees: 180.0,
      isInclusiveOfAllTaxes: false, // VIOLATION: Missing "inclusive of all taxes"
      rawText: "MRP Rs 180/-",
      currencySymbol: "Rs",
    },
    confidence: 0.86,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
    sourceImageId: "img_nutribite_back_002",
    boundingBox: { x: 50, y: 220, width: 140, height: 30 },
  },
  unitSalePrice: {
    value: {
      amountInRupees: 0,
      unit: "g",
      rawText: "",
      isDeclared: false, // VIOLATION: Unit sale price mandatory for packages > 100g
    },
    confidence: 0.75,
    confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
  },
  consumerCare: {
    value: {
      email: "info@nutribitefoods.in",
      rawText: "Consumer complaints write to: info@nutribitefoods.in",
      // VIOLATION: Missing telephone or mobile number under Rule 6(1)(f)
    },
    confidence: 0.82,
    confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
    sourceImageId: "img_nutribite_back_002",
    boundingBox: { x: 50, y: 260, width: 420, height: 30 },
  },
  countryOfOrigin: {
    value: "India",
    confidence: 0.9,
    confidenceLevel: CONFIDENCE_LEVEL.HIGH,
  },
  extractedAt: "2026-09-03T14:16:00Z",
  modelUsed: "gemini-1.5-pro-structured-v2",
};
