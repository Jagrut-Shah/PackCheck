/**
 * PackCheck AI - AI Structured Extraction Zod Schemas
 * Member 3 Extraction Module
 * Validates Gemini AI JSON structured outputs against Legal Metrology Rule 6 payload types.
 */

import { z } from "zod";

export const zodNetQuantitySchema = z.object({
  declaredQuantity: z.number().nonnegative(),
  unit: z.string(),
  isStandardUnit: z.boolean(),
  rawText: z.string(),
});

export const zodMRPSchema = z.object({
  amountInRupees: z.number().nonnegative(),
  isInclusiveOfAllTaxes: z.boolean(),
  currencySymbol: z.string(),
  rawText: z.string(),
});

export const zodDateSchema = z.object({
  month: z.number().int().min(0).max(12).optional(),
  year: z.number().int().min(0).optional(),
  formattedText: z.string(),
  declarationType: z.enum(["MANUFACTURE", "PACKING", "IMPORT", "BEST_BEFORE", "USE_BY"]),
});

export const zodManufacturerSchema = z.object({
  name: z.string(),
  address: z.string(),
  pincode: z.string().optional(),
  role: z.enum(["MANUFACTURER", "PACKER", "IMPORTER", "MANUFACTURED_AND_PACKED_BY"]),
  rawText: z.string(),
});

export const zodConsumerCareSchema = z.object({
  contactPersonOrDesignation: z.string().optional(),
  address: z.string().optional(),
  telephoneOrMobile: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  rawText: z.string(),
});

export const zodUnitSalePriceSchema = z.object({
  amountInRupees: z.number().nonnegative(),
  unit: z.string(),
  rawText: z.string(),
  isDeclared: z.boolean(),
});

export const zodPartialDeclarationsSchema = z.object({
  commodityName: z.string().optional(),
  manufacturerOrPacker: zodManufacturerSchema.partial().optional(),
  netQuantity: zodNetQuantitySchema.partial().optional(),
  manufacturingOrPackingDate: zodDateSchema.partial().optional(),
  mrp: zodMRPSchema.partial().optional(),
  consumerCare: zodConsumerCareSchema.partial().optional(),
  countryOfOrigin: z.string().optional(),
  unitSalePrice: zodUnitSalePriceSchema.partial().optional(),
});

export type ZodPartialDeclarations = z.infer<typeof zodPartialDeclarationsSchema>;
