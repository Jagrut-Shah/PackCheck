/**
 * PackCheck AI - Mock OCR Results
 * Realistic OCR payloads from PaddleOCR service conforming strictly to OCRResponse contract.
 */

import { OCRResult } from "@/types/ocr";
import { CONFIDENCE_LEVEL, PROCESSING_STATUS } from "@/types/common";

export const MOCK_OCR_AMUL_GHEE: OCRResult = {
  id: "ocr_amul_001",
  imageId: "img_amul_front_001",
  inspectionId: "ins_amul_ghee_001",
  engine: "PaddleOCR",
  engineVersion: "v2.7.3-PP-OCRv4",
  processingStatus: PROCESSING_STATUS.COMPLETED,
  rawText: `AMUL PURE GHEE
1 L (905 g)
Mfd & Pkd by: Kaira District Co-operative Milk Producers' Union Ltd., Anand 388001, Gujarat
For feedback: Call Toll Free 1800 258 3333 or email customercare@amul.coop
Mfg Date: 12/2025  Batch No: AG-841
MRP ₹650.00 (INCL. OF ALL TAXES)
USP ₹0.65 / ml`,
  overallConfidence: 0.94,
  averageConfidence: 0.94,
  processingTimeMs: 420,
  detectedLanguages: ["en", "hi"],
  processedAt: "2026-09-03T11:20:00Z",
  detectedTextItems: [
    {
      id: "blk_1",
      text: "AMUL PURE GHEE",
      confidence: 0.98,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 30, 280, 40],
      lineIndex: 1,
      blockType: "TEXT",
    },
    {
      id: "blk_2",
      text: "1 L (905 g)",
      confidence: 0.96,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 78, 140, 28],
      lineIndex: 2,
      blockType: "NUMERIC",
    },
    {
      id: "blk_3",
      text: "Mfd & Pkd by: Kaira District Co-operative Milk Producers' Union Ltd., Anand 388001, Gujarat",
      confidence: 0.92,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 120, 450, 35],
      lineIndex: 3,
      blockType: "TEXT",
    },
    {
      id: "blk_4",
      text: "Mfg Date: 12/2025  Batch No: AG-841",
      confidence: 0.91,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 165, 320, 26],
      lineIndex: 4,
      blockType: "TEXT",
    },
    {
      id: "blk_5",
      text: "MRP ₹650.00 (INCL. OF ALL TAXES)",
      confidence: 0.97,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 200, 310, 30],
      lineIndex: 5,
      blockType: "TEXT",
    },
    {
      id: "blk_6",
      text: "USP ₹0.65 / ml",
      confidence: 0.93,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 238, 150, 24],
      lineIndex: 6,
      blockType: "TEXT",
    },
    {
      id: "blk_7",
      text: "For feedback: Call Toll Free 1800 258 3333 or email customercare@amul.coop",
      confidence: 0.89,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [45, 270, 460, 28],
      lineIndex: 7,
      blockType: "TEXT",
    },
  ],
  blocks: [
    {
      id: "blk_1",
      text: "AMUL PURE GHEE",
      confidence: 0.98,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 30, width: 280, height: 40 },
    },
    {
      id: "blk_2",
      text: "1 L (905 g)",
      confidence: 0.96,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 78, width: 140, height: 28 },
    },
    {
      id: "blk_3",
      text: "Mfd & Pkd by: Kaira District Co-operative Milk Producers' Union Ltd., Anand 388001, Gujarat",
      confidence: 0.92,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 120, width: 450, height: 35 },
    },
    {
      id: "blk_4",
      text: "Mfg Date: 12/2025  Batch No: AG-841",
      confidence: 0.91,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 165, width: 320, height: 26 },
    },
    {
      id: "blk_5",
      text: "MRP ₹650.00 (INCL. OF ALL TAXES)",
      confidence: 0.97,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 200, width: 310, height: 30 },
    },
    {
      id: "blk_6",
      text: "USP ₹0.65 / ml",
      confidence: 0.93,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 238, width: 150, height: 24 },
    },
    {
      id: "blk_7",
      text: "For feedback: Call Toll Free 1800 258 3333 or email customercare@amul.coop",
      confidence: 0.89,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 45, y: 270, width: 460, height: 28 },
    },
  ],
};

export const MOCK_OCR_NUTRIBITE_COOKIES: OCRResult = {
  id: "ocr_nutribite_002",
  imageId: "img_nutribite_back_002",
  inspectionId: "ins_nutribite_cookies_002",
  engine: "PaddleOCR",
  engineVersion: "v2.7.3-PP-OCRv4",
  processingStatus: PROCESSING_STATUS.COMPLETED,
  rawText: `NUTRIBITE HIGH PROTEIN COOKIES
Net Wt: 250 g
Manufactured by: NutriBite Foods Pvt Ltd, Plot 14, Okhla Phase 3, New Delhi 110020
PKD: 08/2026  EXP: 02/2027
MRP Rs 180/-
Consumer complaints write to: info@nutribitefoods.in`,
  overallConfidence: 0.86,
  averageConfidence: 0.86,
  processingTimeMs: 510,
  detectedLanguages: ["en"],
  processedAt: "2026-09-03T14:15:00Z",
  detectedTextItems: [
    {
      id: "nb_blk_1",
      text: "NUTRIBITE HIGH PROTEIN COOKIES",
      confidence: 0.95,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [50, 40, 350, 42],
      lineIndex: 1,
      blockType: "TEXT",
    },
    {
      id: "nb_blk_2",
      text: "Net Wt: 250 g",
      confidence: 0.92,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [50, 90, 160, 28],
      lineIndex: 2,
      blockType: "NUMERIC",
    },
    {
      id: "nb_blk_3",
      text: "Manufactured by: NutriBite Foods Pvt Ltd, Plot 14, Okhla Phase 3, New Delhi 110020",
      confidence: 0.88,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [50, 130, 480, 38],
      lineIndex: 3,
      blockType: "TEXT",
    },
    {
      id: "nb_blk_4",
      text: "PKD: 08/2026  EXP: 02/2027",
      confidence: 0.89,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: [50, 180, 280, 28],
      lineIndex: 4,
      blockType: "TEXT",
    },
    {
      id: "nb_blk_5",
      text: "MRP Rs 180/-",
      confidence: 0.84,
      confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
      boundingBox: [50, 220, 140, 30],
      lineIndex: 5,
      blockType: "TEXT",
    },
    {
      id: "nb_blk_6",
      text: "Consumer complaints write to: info@nutribitefoods.in",
      confidence: 0.81,
      confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
      boundingBox: [50, 260, 420, 30],
      lineIndex: 6,
      blockType: "TEXT",
    },
  ],
  blocks: [
    {
      id: "nb_blk_1",
      text: "NUTRIBITE HIGH PROTEIN COOKIES",
      confidence: 0.95,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 50, y: 40, width: 350, height: 42 },
    },
    {
      id: "nb_blk_2",
      text: "Net Wt: 250 g",
      confidence: 0.92,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 50, y: 90, width: 160, height: 28 },
    },
    {
      id: "nb_blk_3",
      text: "Manufactured by: NutriBite Foods Pvt Ltd, Plot 14, Okhla Phase 3, New Delhi 110020",
      confidence: 0.88,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 50, y: 130, width: 480, height: 38 },
    },
    {
      id: "nb_blk_4",
      text: "PKD: 08/2026  EXP: 02/2027",
      confidence: 0.89,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      boundingBox: { x: 50, y: 180, width: 280, height: 28 },
    },
    {
      id: "nb_blk_5",
      text: "MRP Rs 180/-",
      confidence: 0.84,
      confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
      boundingBox: { x: 50, y: 220, width: 140, height: 30 },
    },
    {
      id: "nb_blk_6",
      text: "Consumer complaints write to: info@nutribitefoods.in",
      confidence: 0.81,
      confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
      boundingBox: { x: 50, y: 260, width: 420, height: 30 },
    },
  ],
};
