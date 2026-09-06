/**
 * PackCheck AI - Correction Merging Module
 * Purpose: Merge inspector corrections with extracted declarations
 * for re-evaluation of compliance after manual field corrections
 */

import { ExtractedDeclarations, ExtractedField } from "@/lib/types/extraction";

export interface InspectorCorrection {
  id?: string;
  inspection_id?: string;
  field_name: string;
  original_value: string;
  corrected_value: string;
  timestamp?: string;
}

/**
 * Maps review page field names to extraction declaration keys
 * Example: "productName" → "commodityName"
 */
const FIELD_NAME_MAPPING: Record<string, keyof ExtractedDeclarations> = {
  // Product information
  "productName": "commodityName",
  "brandName": "brandName",
  
  // Manufacturer information
  "manufacturer": "manufacturerOrPacker",
  "manufacturerName": "manufacturerOrPacker",
  "packer": "manufacturerOrPacker",
  
  // Quantity and units
  "netQuantity": "netQuantity",
  "quantity": "netQuantity",
  
  // Pricing
  "mrp": "mrp",
  "price": "mrp",
  "unitSalePrice": "unitSalePrice",
  
  // Dates
  "manufacturingDate": "manufacturingOrPackingDate",
  "packingDate": "manufacturingOrPackingDate",
  "bestBefore": "expiryOrBestBeforeDate",
  "useBy": "expiryOrBestBeforeDate",
  
  // Origin and location
  "countryOfOrigin": "countryOfOrigin",
  "address": "manufacturerOrPacker", // Nested in manufacturerOrPacker.value.address
  
  // Consumer care
  "consumerCare": "consumerCare",
  
  // Other
  "dimensions": "sizesOrDimensions",
  "importDate": "manufacturingOrPackingDate", // Approximate mapping
};

/**
 * Merge inspector corrections with extracted declarations
 * 
 * @param extracted - Original extracted declarations from OCR + LLM
 * @param corrections - Array of inspector manual corrections
 * @returns - Merged declarations with corrections applied
 * 
 * @example
 * ```typescript
 * const corrections = [
 *   { field_name: "mrp", original_value: "₹650", corrected_value: "₹699" }
 * ];
 * const merged = mergeCorrectionsWithExtraction(extracted, corrections);
 * // Now compliance evaluation can run on merged data
 * ```
 */
export function mergeCorrectionsWithExtraction(
  extracted: ExtractedDeclarations,
  corrections: InspectorCorrection[]
): ExtractedDeclarations {
  // Start with deep copy to avoid mutating original
  const merged = JSON.parse(JSON.stringify(extracted)) as ExtractedDeclarations;

  // Apply each correction
  for (const correction of corrections) {
    const declarationKey = FIELD_NAME_MAPPING[correction.field_name];
    
    if (!declarationKey) {
      console.warn(
        `[MERGE] Unknown correction field: ${correction.field_name}. Skipping.`
      );
      continue;
    }

    const field = merged[declarationKey] as any;
    if (!field) {
      console.warn(
        `[MERGE] Field not found in declarations: ${declarationKey}. Skipping.`
      );
      continue;
    }

    // Handle different field structures
    if (typeof field.value === "string" || typeof field.value === "number") {
      // Simple value field (e.g., "commodityName", "countryOfOrigin")
      field.value = correction.corrected_value;
    } else if (typeof field.value === "object" && field.value !== null) {
      // Complex object field (e.g., "manufacturerOrPacker" with nested address)
      if ("rawText" in field.value) {
        field.value.rawText = correction.corrected_value;
      } else if ("name" in field.value) {
        // Could be name or other string property
        const stringProps = Object.keys(field.value).filter(
          (k) => typeof field.value[k] === "string"
        );
        if (stringProps.length > 0) {
          field.value[stringProps[0]] = correction.corrected_value;
        }
      }
    }

    // Mark as inspector-overridden
    field.isInspectorOverridden = true;
    field.originalExtractedValue = field.value; // Preserve original before override

    console.log(
      `[MERGE] Applied correction: ${declarationKey} = ${correction.corrected_value}`
    );
  }

  return merged;
}

/**
 * Reconstruct ExtractedDeclarations from backend extracted_fields table
 * 
 * Used to rebuild the declaration object from database records
 * for merging with corrections before re-evaluation
 */
export function reconstructDeclarationsFromFields(
  fields: Array<{
    field_name: string;
    extracted_value: string;
    confidence_score: number;
    source: string;
  }>
): ExtractedDeclarations {
  const reconstructed: Partial<ExtractedDeclarations> = {};

  for (const field of fields) {
    const key = FIELD_NAME_MAPPING[field.field_name] || field.field_name;
    
    // Build field with basic structure
    (reconstructed as any)[key] = {
      value: field.extracted_value,
      confidence: field.confidence_score,
      source: field.source,
      rawValue: field.extracted_value,
    };
  }

  return reconstructed as ExtractedDeclarations;
}

/**
 * Get human-readable summary of corrections applied
 */
export function getSummaryOfMergedCorrections(
  corrections: InspectorCorrection[]
): string {
  if (corrections.length === 0) return "No corrections applied";
  
  const summary = corrections
    .map((c) => `${c.field_name}: "${c.original_value}" → "${c.corrected_value}"`)
    .join("; ");
  
  return `${corrections.length} correction(s): ${summary}`;
}
