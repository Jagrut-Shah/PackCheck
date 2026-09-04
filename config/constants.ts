/**
 * PackCheck AI - Application Constants & Single Source of Truth
 * Legal Metrology (Packaged Commodities) Rules, 2011 Standard Values.
 */

import {
  INSPECTION_STATUS,
  OVERALL_RESULT,
  IMAGE_QUALITY_STATUS,
  CONFIDENCE_LEVEL,
  InspectionStatus,
  OverallResult,
  ImageQualityStatus,
  ConfidenceLevel,
} from "@/types/common";

export {
  INSPECTION_STATUS,
  OVERALL_RESULT,
  IMAGE_QUALITY_STATUS,
  CONFIDENCE_LEVEL,
};

/**
 * Visual styling tokens and labels for status indicators.
 * Project Standard: Always use Icon + Text + Color (never color alone).
 */
export const STATUS_CONFIG: Record<
  InspectionStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  [INSPECTION_STATUS.DRAFT]: {
    label: "Draft Record",
    bgClass: "bg-[#F1F5F9]",
    textClass: "text-[#475569]",
    borderClass: "border-[#CBD5E1]",
  },
  [INSPECTION_STATUS.PROCESSING]: {
    label: "Processing",
    bgClass: "bg-[#E0F2FE]",
    textClass: "text-[#0369A1]",
    borderClass: "border-[#7DD3FC]",
  },
  [INSPECTION_STATUS.MANUAL_REVIEW]: {
    label: "Manual Review",
    bgClass: "bg-[#FEF3C7]",
    textClass: "text-[#92400E]",
    borderClass: "border-[#FCD34D]",
  },
  [INSPECTION_STATUS.COMPLETED]: {
    label: "Completed",
    bgClass: "bg-[#DCFCE7]",
    textClass: "text-[#166534]",
    borderClass: "border-[#86EFAC]",
  },
};

export const RESULT_CONFIG: Record<
  OverallResult,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  [OVERALL_RESULT.PASS]: {
    label: "Compliant (PASS)",
    bgClass: "bg-[#DCFCE7]",
    textClass: "text-[#166534]",
    borderClass: "border-[#86EFAC]",
  },
  [OVERALL_RESULT.POTENTIAL_NON_COMPLIANCE]: {
    label: "Potential Non-Compliance",
    bgClass: "bg-[#FEE2E2]",
    textClass: "text-[#991B1B]",
    borderClass: "border-[#FCA5A5]",
  },
  [OVERALL_RESULT.MANUAL_REVIEW]: {
    label: "Manual Review Required",
    bgClass: "bg-[#FEF3C7]",
    textClass: "text-[#92400E]",
    borderClass: "border-[#FCD34D]",
  },
};

export const QUALITY_CONFIG: Record<
  ImageQualityStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  [IMAGE_QUALITY_STATUS.PENDING]: {
    label: "Pending Quality Check",
    bgClass: "bg-[#F1F5F9]",
    textClass: "text-[#475569]",
  },
  [IMAGE_QUALITY_STATUS.PASSED]: {
    label: "Quality Verified",
    bgClass: "bg-[#DCFCE7]",
    textClass: "text-[#166534]",
  },
  [IMAGE_QUALITY_STATUS.RETAKE_REQUIRED]: {
    label: "Retake Required",
    bgClass: "bg-[#FEE2E2]",
    textClass: "text-[#991B1B]",
  },
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH_MIN: 0.85,
  MEDIUM_MIN: 0.65,
} as const;

/**
 * Statutory References under Legal Metrology (Packaged Commodities) Rules, 2011
 */
export const STATUTORY_REFERENCES = {
  ACT_NAME: "Legal Metrology Act, 2009",
  RULES_NAME: "Legal Metrology (Packaged Commodities) Rules, 2011",
  VERSION_TAG: "PCR-2011-AMENDED-2024",
  RULE_6_1_A: {
    rule: "Rule 6(1)(a)",
    title: "Name and address of manufacturer / packer / importer",
  },
  RULE_6_1_B: {
    rule: "Rule 6(1)(b)",
    title: "Common or generic name of commodity",
  },
  RULE_6_1_C: {
    rule: "Rule 6(1)(c)",
    title: "Net quantity in standard unit of weights/measures",
  },
  RULE_6_1_D: {
    rule: "Rule 6(1)(d)",
    title: "Month and year of manufacture or pre-packing",
  },
  RULE_6_1_E: {
    rule: "Rule 6(1)(e)",
    title: "Maximum Retail Price inclusive of all taxes",
  },
  RULE_6_1_F: {
    rule: "Rule 6(1)(f)",
    title: "Consumer care contact details",
  },
  RULE_6_10: {
    rule: "Rule 6(10)",
    title: "Country of origin for imported goods",
  },
  RULE_7: {
    rule: "Rule 7",
    title: "Principal Display Panel font height and numeral specifications",
  },
} as const;
