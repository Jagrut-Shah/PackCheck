/**
 * PackCheck AI - OCR RawText Parser
 * Member 3 Extraction Module
 * Deterministic parser for Legal Metrology Rule 6 statutory fields from raw OCR text.
 */

import {
  ExtractedField,
  NetQuantityDeclaration,
  MRPDeclaration,
  DateDeclaration,
  ManufacturerPackerDeclaration,
  ConsumerCareDeclaration,
  UnitSalePriceDeclaration,
} from "@/lib/types/extraction";
import { CONFIDENCE_LEVEL } from "@/lib/types/common";

const STANDARD_UNITS = new Set([
  "g",
  "kg",
  "ml",
  "l",
  "m",
  "cm",
  "mm",
  "sq_m",
  "sq_cm",
  "pieces",
  "units",
  "n",
]);

export interface ParsedRawDeclarations {
  commodityName: ExtractedField<string>;
  manufacturerOrPacker: ExtractedField<ManufacturerPackerDeclaration>;
  netQuantity: ExtractedField<NetQuantityDeclaration>;
  manufacturingOrPackingDate: ExtractedField<DateDeclaration>;
  mrp: ExtractedField<MRPDeclaration>;
  unitSalePrice: ExtractedField<UnitSalePriceDeclaration>;
  consumerCare: ExtractedField<ConsumerCareDeclaration>;
  countryOfOrigin: ExtractedField<string>;
}

/**
 * Parses Commodity Name from OCR raw text.
 */
export function parseCommodityName(rawText: string, contextProductName?: string): ExtractedField<string> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const labelRegex = /(?:commodity(?:\s*name)?|product(?:\s*name)?|item(?:\s*name)?)[:\s]+(.+)/i;
  for (const line of lines) {
    const match = line.match(labelRegex);
    if (match) {
      const name = match[1].trim();
      return {
        field: "commodityName",
        value: name,
        rawValue: line,
        confidence: 0.95,
        confidenceLevel: CONFIDENCE_LEVEL.HIGH,
        sourceType: "OCR_TEXT",
      };
    }
  }

  const skipKeywords = /(?:mfd|mfg|manufactured|pkd|packed|mrp|m\.r\.p|net\s*wt|net\s*qty|batch|exp|call|for\s*feedback|consumer|usp)/i;
  if (lines.length > 0 && !skipKeywords.test(lines[0])) {
    const titleCandidate = lines[0];
    return {
      field: "commodityName",
      value: titleCandidate,
      rawValue: titleCandidate,
      confidence: 0.9,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      sourceType: "OCR_TEXT",
    };
  }

  return {
    field: "commodityName",
    value: contextProductName || "",
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Parses Manufacturer / Packer Identity & Address from OCR raw text.
 */
export function parseManufacturerOrPacker(rawText: string): ExtractedField<ManufacturerPackerDeclaration> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const mfrRegex = /(?:mfd|mfg|manufactured|pkd|packed|importer|marketed)(?:\s*&\s*(?:pkd|packed))?\s*by[:\s]*(.+)/i;

  for (const line of lines) {
    const match = line.match(mfrRegex);
    if (match) {
      const fullText = match[1].trim();
      const rawTextLine = line;

      let role: ManufacturerPackerDeclaration["role"] = "MANUFACTURER";
      if (/mfd.*pkd|manufactured.*packed/i.test(line)) {
        role = "MANUFACTURED_AND_PACKED_BY";
      } else if (/pkd|packed/i.test(line)) {
        role = "PACKER";
      } else if (/importer/i.test(line)) {
        role = "IMPORTER";
      }

      const pinMatch = line.match(/\b(\d{6})\b/);
      const pincode = pinMatch ? pinMatch[1] : undefined;

      let name = fullText;
      let address = fullText;
      const parts = fullText.split(",");

      if (parts.length > 1) {
        name = parts[0].trim();
        address = parts.slice(1).join(",").trim();
      } else {
        name = fullText;
        address = fullText;
      }

      return {
        field: "manufacturerOrPacker",
        value: {
          name,
          address,
          pincode,
          role,
          rawText: rawTextLine,
        },
        rawValue: rawTextLine,
        confidence: 0.92,
        confidenceLevel: CONFIDENCE_LEVEL.HIGH,
        sourceType: "OCR_TEXT",
      };
    }
  }

  return {
    field: "manufacturerOrPacker",
    value: {
      name: "",
      address: "",
      role: "MANUFACTURER",
      rawText: "",
    },
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Parses Net Quantity from OCR raw text.
 */
export function parseNetQuantity(rawText: string): ExtractedField<NetQuantityDeclaration> {
  const lines = rawText.split("\n");

  const regex = /(?:net\s*(?:qty|quantity|wt|weight)?[:\s]*)?(\d+(?:\.\d+)?)\s*(g|kg|ml|l|m|cm|mm|sq_m|sq_cm|pieces|units|n)\b/i;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const declaredQuantity = parseFloat(match[1]);
      const rawUnit = match[2];
      const unitLower = rawUnit.toLowerCase();
      const canonicalUnit = unitLower === "l" ? "L" : unitLower === "n" ? "N" : rawUnit;
      const isStandardUnit = STANDARD_UNITS.has(unitLower);

      return {
        field: "netQuantity",
        value: {
          declaredQuantity,
          unit: canonicalUnit,
          isStandardUnit,
          rawText: line.trim(),
        },
        rawValue: line.trim(),
        confidence: 0.95,
        confidenceLevel: CONFIDENCE_LEVEL.HIGH,
        sourceType: "OCR_TEXT",
      };
    }
  }

  return {
    field: "netQuantity",
    value: {
      declaredQuantity: 0,
      unit: "",
      isStandardUnit: false,
      rawText: "",
    },
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Parses MRP from OCR raw text.
 */
export function parseMRP(rawText: string): ExtractedField<MRPDeclaration> {
  const lines = rawText.split("\n");

  const mrpLineRegex = /(?:mrp|m\.r\.p\.)/i;
  const priceRegex = /([₹]|rs\.?|inr)?\s*(\d+(?:\.\d+)?)(?:\/-)?/i;

  for (const line of lines) {
    if (mrpLineRegex.test(line)) {
      const match = line.match(priceRegex);
      if (match) {
        let symbol = match[1] || "₹";
        if (symbol.toLowerCase().startsWith("rs")) symbol = "Rs";
        if (symbol.toLowerCase() === "inr") symbol = "INR";

        const amountInRupees = parseFloat(match[2]);
        const isInclusiveOfAllTaxes = /(?:incl|inclusive).*tax/i.test(line);

        return {
          field: "mrp",
          value: {
            amountInRupees,
            isInclusiveOfAllTaxes,
            currencySymbol: symbol,
            rawText: line.trim(),
          },
          rawValue: line.trim(),
          confidence: 0.95,
          confidenceLevel: CONFIDENCE_LEVEL.HIGH,
          sourceType: "OCR_TEXT",
        };
      }
    }
  }

  const genericPriceRegex = /(?:[₹]|rs\.?\s*|inr\s*)(\d+(?:\.\d+)?)(?:\/-)?/i;
  for (const line of lines) {
    const match = line.match(genericPriceRegex);
    if (match) {
      const amountInRupees = parseFloat(match[1]);
      let symbol = "₹";
      if (/rs/i.test(line)) symbol = "Rs";

      return {
        field: "mrp",
        value: {
          amountInRupees,
          isInclusiveOfAllTaxes: /(?:incl|inclusive).*tax/i.test(line),
          currencySymbol: symbol,
          rawText: line.trim(),
        },
        rawValue: line.trim(),
        confidence: 0.85,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "OCR_TEXT",
      };
    }
  }

  return {
    field: "mrp",
    value: {
      amountInRupees: 0,
      isInclusiveOfAllTaxes: false,
      currencySymbol: "",
      rawText: "",
    },
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Month string to 1-indexed number lookup.
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Parses Manufacturing or Packing Date from OCR raw text.
 */
export function parseManufacturingOrPackingDate(rawText: string): ExtractedField<DateDeclaration> {
  const lines = rawText.split("\n");

  const dateNumericRegex = /(0[1-9]|1[0-2])\s*[\/\.-]\s*(20\d{2}|\d{2})/;
  const dateMonthNameRegex = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\/\.-]+(20\d{2}|\d{2})/i;

  const mfgKeywordRegex = /(?:mfg|mfd|manufactur)/i;
  const pkdKeywordRegex = /(?:pkd|packed|packing)/i;

  for (const line of lines) {
    const isMfg = mfgKeywordRegex.test(line);
    const isPkd = pkdKeywordRegex.test(line);

    if (isMfg || isPkd) {
      const matchNum = line.match(dateNumericRegex);
      if (matchNum) {
        const month = parseInt(matchNum[1], 10);
        let year = parseInt(matchNum[2], 10);
        if (year < 100) year += 2000;

        const formattedText = `${String(month).padStart(2, "0")}/${year}`;
        const declarationType = isPkd ? "PACKING" : "MANUFACTURE";

        return {
          field: "manufacturingOrPackingDate",
          value: {
            month,
            year,
            formattedText,
            declarationType,
          },
          rawValue: line.trim(),
          confidence: 0.93,
          confidenceLevel: CONFIDENCE_LEVEL.HIGH,
          sourceType: "OCR_TEXT",
        };
      }

      const matchName = line.match(dateMonthNameRegex);
      if (matchName) {
        const month = MONTH_NAMES[matchName[1].toLowerCase()] || 1;
        let year = parseInt(matchName[2], 10);
        if (year < 100) year += 2000;

        const formattedText = `${String(month).padStart(2, "0")}/${year}`;
        const declarationType = isPkd ? "PACKING" : "MANUFACTURE";

        return {
          field: "manufacturingOrPackingDate",
          value: {
            month,
            year,
            formattedText,
            declarationType,
          },
          rawValue: line.trim(),
          confidence: 0.9,
          confidenceLevel: CONFIDENCE_LEVEL.HIGH,
          sourceType: "OCR_TEXT",
        };
      }
    }
  }

  for (const line of lines) {
    const matchNum = line.match(dateNumericRegex);
    if (matchNum) {
      const month = parseInt(matchNum[1], 10);
      let year = parseInt(matchNum[2], 10);
      if (year < 100) year += 2000;

      const formattedText = `${String(month).padStart(2, "0")}/${year}`;

      return {
        field: "manufacturingOrPackingDate",
        value: {
          month,
          year,
          formattedText,
          declarationType: "MANUFACTURE",
        },
        rawValue: line.trim(),
        confidence: 0.8,
        confidenceLevel: CONFIDENCE_LEVEL.MEDIUM,
        sourceType: "OCR_TEXT",
      };
    }
  }

  return {
    field: "manufacturingOrPackingDate",
    value: {
      month: 0,
      year: 0,
      formattedText: "",
      declarationType: "MANUFACTURE",
    },
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Parses Unit Sale Price (USP) from OCR raw text.
 */
export function parseUnitSalePrice(rawText: string): ExtractedField<UnitSalePriceDeclaration> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const uspPrefixRegex = /(?:usp|unit\s*sale\s*price|unit\s*price|u\.s\.p\.)/i;
  const uspPriceRegex = /(?:usp|unit\s*sale\s*price|unit\s*price|u\.s\.p\.)[:\s]*([₹]|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)\s*([a-zA-Z]+|n)\b/i;

  for (const line of lines) {
    if (uspPrefixRegex.test(line)) {
      const match = line.match(uspPriceRegex);
      if (match) {
        const amountInRupees = parseFloat(match[2]);
        const rawUnit = match[3];
        const unitLower = rawUnit.toLowerCase();
        const canonicalUnit = unitLower === "l" ? "L" : unitLower === "n" ? "N" : rawUnit;

        return {
          field: "unitSalePrice",
          value: {
            amountInRupees,
            unit: canonicalUnit,
            rawText: line,
            isDeclared: true,
          },
          rawValue: line,
          confidence: 0.93,
          confidenceLevel: CONFIDENCE_LEVEL.HIGH,
          sourceType: "OCR_TEXT",
        };
      }
    }
  }

  for (const line of lines) {
    if (uspPrefixRegex.test(line)) {
      const match = line.match(/([₹]|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)\s*([a-zA-Z]+|n)\b/i);
      if (match) {
        const amountInRupees = parseFloat(match[2]);
        const rawUnit = match[3];
        const unitLower = rawUnit.toLowerCase();
        const canonicalUnit = unitLower === "l" ? "L" : unitLower === "n" ? "N" : rawUnit;

        return {
          field: "unitSalePrice",
          value: {
            amountInRupees,
            unit: canonicalUnit,
            rawText: line,
            isDeclared: true,
          },
          rawValue: line,
          confidence: 0.88,
          confidenceLevel: CONFIDENCE_LEVEL.HIGH,
          sourceType: "OCR_TEXT",
        };
      }
    }
  }

  return {
    field: "unitSalePrice",
    value: {
      amountInRupees: 0,
      unit: "",
      rawText: "",
      isDeclared: false,
    },
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Parses Consumer Care details from OCR raw text.
 */
export function parseConsumerCare(rawText: string): ExtractedField<ConsumerCareDeclaration> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const phoneRegex = /\b(?:1800[-\s]?\d{2,3}[-\s]?\d{3,4}|\d{10,11})\b/;
  const careKeywordRegex = /(?:consumer|customer|feedback|grievance|complaint|care|contact|toll\s*free)/i;

  for (const line of lines) {
    if (careKeywordRegex.test(line) || emailRegex.test(line) || phoneRegex.test(line)) {
      const emailMatch = line.match(emailRegex);
      const phoneMatch = line.match(phoneRegex);

      const email = emailMatch ? emailMatch[0] : undefined;
      const telephoneOrMobile = phoneMatch ? phoneMatch[0] : undefined;

      return {
        field: "consumerCare",
        value: {
          telephoneOrMobile,
          email,
          rawText: line,
        },
        rawValue: line,
        confidence: 0.94,
        confidenceLevel: CONFIDENCE_LEVEL.HIGH,
        sourceType: "OCR_TEXT",
      };
    }
  }

  return {
    field: "consumerCare",
    value: {
      rawText: "",
    },
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Parses Country of Origin from OCR raw text.
 */
export function parseCountryOfOrigin(rawText: string): ExtractedField<string> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const countryLabelRegex = /(?:country\s*of\s*origin|made\s*in|product\s*of|origin)[:\s]+([A-Za-z\s]+)/i;
  for (const line of lines) {
    const match = line.match(countryLabelRegex);
    if (match) {
      const country = match[1].trim();
      return {
        field: "countryOfOrigin",
        value: country,
        rawValue: line,
        confidence: 0.95,
        confidenceLevel: CONFIDENCE_LEVEL.HIGH,
        sourceType: "OCR_TEXT",
      };
    }
  }

  if (/india|gujarat|delhi|mumbai|maharashtra|karnataka|tamil\s*nadu|\b\d{6}\b/i.test(rawText)) {
    return {
      field: "countryOfOrigin",
      value: "India",
      rawValue: "Inferred from domestic address / PIN code",
      confidence: 0.9,
      confidenceLevel: CONFIDENCE_LEVEL.HIGH,
      sourceType: "OCR_TEXT",
    };
  }

  return {
    field: "countryOfOrigin",
    value: "",
    rawValue: "",
    confidence: 0,
    confidenceLevel: CONFIDENCE_LEVEL.LOW,
    sourceType: "OCR_TEXT",
  };
}

/**
 * Main entry point for parsing OCR raw text into target statutory declarations.
 */
export function parseOCRRawText(rawText: string, contextProductName?: string): ParsedRawDeclarations {
  const text = rawText || "";
  return {
    commodityName: parseCommodityName(text, contextProductName),
    manufacturerOrPacker: parseManufacturerOrPacker(text),
    netQuantity: parseNetQuantity(text),
    manufacturingOrPackingDate: parseManufacturingOrPackingDate(text),
    mrp: parseMRP(text),
    unitSalePrice: parseUnitSalePrice(text),
    consumerCare: parseConsumerCare(text),
    countryOfOrigin: parseCountryOfOrigin(text),
  };
}
