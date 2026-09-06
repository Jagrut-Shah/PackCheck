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
  month: z.number().int().min(0).max(12).nullish(),
  year: z.number().int().min(0).nullish(),
  formattedText: z.string().nullish(),
  declarationType: z.enum(["MANUFACTURE", "PACKING", "IMPORT", "BEST_BEFORE", "USE_BY"]).nullish(),
});

export const zodManufacturerSchema = z.object({
  name: z.string().nullish(),
  address: z.string().nullish(),
  pincode: z.string().nullish(),
  role: z.enum(["MANUFACTURER", "PACKER", "IMPORTER", "MANUFACTURED_AND_PACKED_BY"]).nullish(),
  rawText: z.string().nullish(),
});

export const zodConsumerCareSchema = z.object({
  contactPersonOrDesignation: z.string().nullish(),
  address: z.string().nullish(),
  telephoneOrMobile: z.string().nullish(),
  email: z.string().nullish(),
  website: z.string().nullish(),
  rawText: z.string().nullish(),
});

export const zodUnitSalePriceSchema = z.object({
  amountInRupees: z.number().nonnegative().nullish(),
  unit: z.string().nullish(),
  rawText: z.string().nullish(),
  isDeclared: z.boolean().nullish(),
});

export const zodPartialDeclarationsSchema = z.object({
  commodityName: z.string().nullable().optional(),
  manufacturerOrPacker: zodManufacturerSchema.partial().nullable().optional(),
  netQuantity: zodNetQuantitySchema.partial().nullable().optional(),
  manufacturingOrPackingDate: zodDateSchema.partial().nullable().optional(),
  mrp: zodMRPSchema.partial().nullable().optional(),
  consumerCare: zodConsumerCareSchema.partial().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  unitSalePrice: zodUnitSalePriceSchema.partial().nullable().optional(),
});

export type ZodPartialDeclarations = z.infer<typeof zodPartialDeclarationsSchema>;
