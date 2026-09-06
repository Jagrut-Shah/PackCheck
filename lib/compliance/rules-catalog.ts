/**
 * PackCheck AI - Statutory Rules Catalog
 * Authoritative statutory definitions under the Legal Metrology (Packaged Commodities) Rules, 2011 (PCR 2011)
 * and Legal Metrology Act, 2009.
 */

export interface StatutoryRuleDefinition {
  ruleId: string;
  ruleNumber: string;
  title: string;
  category: "MANDATORY_DECLARATIONS" | "PRICING_MANDATES" | "QUANTITY_VERIFICATION" | "CONSUMER_PROTECTION" | "PDP_DIMENSIONS" | "REGULATORY_COMPLIANCE";
  criticality: "CRITICAL" | "HIGH" | "STANDARD";
  statutoryReference: string;
  requirementDescription: string;
  penaltySection: string;
  penaltySummary: string;
  legalContext: string;
}

export const CANONICAL_RULES: Record<string, StatutoryRuleDefinition> = {
  rule_6_1_a: {
    ruleId: "rule_6_1_a",
    ruleNumber: "Rule 6(1)(a)",
    title: "Manufacturer / Pre-Packer / Importer Identity & Complete Address",
    category: "MANDATORY_DECLARATIONS",
    criticality: "CRITICAL",
    statutoryReference: "Rule 6(1)(a) PCR, 2011 / Sec 36(1) LM Act, 2009",
    requirementDescription: "Full legal name and complete postal address including PIN code of the manufacturer, pre-packer, or importer.",
    penaltySection: "Section 36(1) LM Act, 2009",
    penaltySummary: "Fine up to ₹25,000 for first offence; up to ₹50,000 for second; or imprisonment up to 1 year.",
    legalContext: "Mandatory on all pre-packaged commodities to establish accountability and traceability under consumer protection law."
  },
  rule_6_1_b: {
    ruleId: "rule_6_1_b",
    ruleNumber: "Rule 6(1)(b)",
    title: "Generic or Common Commodity Name on Principal Display Panel",
    category: "MANDATORY_DECLARATIONS",
    criticality: "STANDARD",
    statutoryReference: "Rule 6(1)(b) PCR, 2011",
    requirementDescription: "Generic or common name of the commodity contained in the package conspicuously displayed on the Principal Display Panel (PDP).",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Compoundable fine up to ₹5,000 under Rule 32(1).",
    legalContext: "Prevents deceptive trade descriptions and ensures consumers readily recognize commodity identity before purchase."
  },
  rule_6_1_c: {
    ruleId: "rule_6_1_c",
    ruleNumber: "Rule 6(1)(c)",
    title: "Net Quantity Declarations in Standard Units (Metric System)",
    category: "QUANTITY_VERIFICATION",
    criticality: "CRITICAL",
    statutoryReference: "Rule 6(1)(c) & Sched II PCR, 2011 / Sec 30 LM Act",
    requirementDescription: "Net quantity in standard SI metric units (g, kg, ml, L, or N) with proper symbols, minimum letter height, and decimal representation.",
    penaltySection: "Section 30 LM Act, 2009",
    penaltySummary: "Penalty for non-standard units or non-declaration up to ₹25,000 fine.",
    legalContext: "Core metrological provision preventing short measure and ensuring uniform metric compliance across all interstate commerce."
  },
  rule_6_1_d: {
    ruleId: "rule_6_1_d",
    ruleNumber: "Rule 6(1)(d)",
    title: "Month and Year of Manufacture / Packing / Import",
    category: "MANDATORY_DECLARATIONS",
    criticality: "HIGH",
    statutoryReference: "Rule 6(1)(d) PCR, 2011",
    requirementDescription: "Month and year of manufacture or pre-packing in MM/YYYY or MM/YY format, or clear 'Best Before' date declaration.",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Fine up to ₹5,000 compoundable by Authorized Legal Metrology Officer.",
    legalContext: "Protects consumer right to freshness and prevents sale of expired or unidentifiable aged stock."
  },
  rule_6_1_e: {
    ruleId: "rule_6_1_e",
    ruleNumber: "Rule 6(1)(e)",
    title: "Maximum Retail Price (MRP) & Tax Inclusivity Declaration",
    category: "PRICING_MANDATES",
    criticality: "CRITICAL",
    statutoryReference: "Rule 6(1)(e) PCR, 2011 / Sec 36(1) LM Act, 2009",
    requirementDescription: "Maximum Retail Price in Indian Rupees (₹) explicitly stated as 'Inclusive of all taxes' with clear decimal formatting.",
    penaltySection: "Section 36(1) LM Act, 2009",
    penaltySummary: "Fine up to ₹25,000 for first offence; up to ₹50,000 for second; or imprisonment.",
    legalContext: "Stops overcharging and dual pricing; fundamental consumer economic right enforced by state metrology departments."
  },
  rule_6_1_f: {
    ruleId: "rule_6_1_f",
    ruleNumber: "Rule 6(1)(f)",
    title: "Consumer Care Details & Grievance Redressal Mechanism",
    category: "CONSUMER_PROTECTION",
    criticality: "HIGH",
    statutoryReference: "Rule 6(1)(f) PCR, 2011",
    requirementDescription: "Name, address, active telephone helpline number, and valid email address of the person/officer handling consumer complaints.",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Statutory notice issuance and compounding penalty up to ₹5,000.",
    legalContext: "Enforces consumer dispute resolution accessibility directly on packaging."
  },
  rule_6_1_g: {
    ruleId: "rule_6_1_g",
    ruleNumber: "Rule 6(1)(g)",
    title: "Country of Origin for Domestic & Imported Packages",
    category: "MANDATORY_DECLARATIONS",
    criticality: "HIGH",
    statutoryReference: "Rule 6(1)(g) PCR, 2011",
    requirementDescription: "Clear, unambiguous declaration of country of origin on the Principal Display Panel.",
    penaltySection: "Rule 32(1) PCR / Customs Act",
    penaltySummary: "Fine up to ₹5,000 under PCR 2011 plus potential seizure under import regulations.",
    legalContext: "Empowers consumer purchasing discretion and verifies domestic/foreign trade compliance."
  },
  rule_6_1_l: {
    ruleId: "rule_6_1_l",
    ruleNumber: "Rule 6(1)(l)",
    title: "Unit Sale Price (USP) Declaration (2022 Amendment)",
    category: "PRICING_MANDATES",
    criticality: "CRITICAL",
    statutoryReference: "Rule 6(1)(l) PCR (2022 Amendment)",
    requirementDescription: "Unit sale price declared in Rupees per gram/kg or per ml/liter on packages containing net quantity exceeding 1 kg or 1 liter.",
    penaltySection: "Section 36(1) LM Act, 2009",
    penaltySummary: "Fine up to ₹25,000 for first violation.",
    legalContext: "Allows instant price comparison across pack sizes, preventing shrinkflation."
  },
  rule_6_1_n: {
    ruleId: "rule_6_1_n",
    ruleNumber: "Rule 6(1)(n)",
    title: "Country of Manufacture / Origin for Imported Goods",
    category: "MANDATORY_DECLARATIONS",
    criticality: "HIGH",
    statutoryReference: "Rule 6(1)(n) PCR, 2011",
    requirementDescription: "Declaration of the name of the country of origin or manufacture or assembly in case of imported products.",
    penaltySection: "Rule 32(1) PCR / Customs Act",
    penaltySummary: "Fine up to ₹5,000 under PCR 2011 and border regulatory scrutiny.",
    legalContext: "Ensures full consumer traceability and customs alignment for imported pre-packaged commodities."
  },
  rule_7: {
    ruleId: "rule_7",
    ruleNumber: "Rule 7 & 8",
    title: "PDP Dimensions & Minimum Numeral/Letter Height",
    category: "PDP_DIMENSIONS",
    criticality: "HIGH",
    statutoryReference: "Rule 7 & 8 PCR, 2011 (Table I & II)",
    requirementDescription: "Statutory minimum font and numeral height based on Principal Display Panel area and net quantity bracket.",
    penaltySection: "Rule 7 Table I & II Penalty",
    penaltySummary: "Compoundable notice under Rule 32(1).",
    legalContext: "Ensures legibility and prevents fine-print concealment of critical declarations."
  },
  rule_8: {
    ruleId: "rule_8",
    ruleNumber: "Rule 8",
    title: "Declaration Placement on Principal Display Panel",
    category: "PDP_DIMENSIONS",
    criticality: "HIGH",
    statutoryReference: "Rule 8 PCR, 2011",
    requirementDescription: "Mandatory declarations must be grouped together and clearly visible on the Principal Display Panel.",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Compounding notice and fine up to ₹5,000.",
    legalContext: "Prevents scattering mandatory information across packaging panels."
  },
  rule_9: {
    ruleId: "rule_9",
    ruleNumber: "Rule 9",
    title: "Manner and Prominence of Statutory Declarations",
    category: "MANDATORY_DECLARATIONS",
    criticality: "STANDARD",
    statutoryReference: "Rule 9 PCR, 2011",
    requirementDescription: "Declarations must be legible, prominent, in definite contrast to the background, and indelible.",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Notice issuance and compoundable fine up to ₹5,000.",
    legalContext: "Guarantees visual contrast and durability of statutory disclosures."
  },
  rule_10: {
    ruleId: "rule_10",
    ruleNumber: "Rule 10",
    title: "Declaration of Quantity Standard Units",
    category: "QUANTITY_VERIFICATION",
    criticality: "CRITICAL",
    statutoryReference: "Rule 10 PCR, 2011",
    requirementDescription: "Quantity must be expressed in terms of the standard units specified under the First Schedule.",
    penaltySection: "Section 30 LM Act, 2009",
    penaltySummary: "Fine up to ₹25,000 for use of non-standard units.",
    legalContext: "Enforces strict metric SI compliance across all pre-packaged goods."
  },
  rule_18: {
    ruleId: "rule_18",
    ruleNumber: "Rule 18",
    title: "Wholesale Package Statutory Declarations",
    category: "REGULATORY_COMPLIANCE",
    criticality: "HIGH",
    statutoryReference: "Rule 18 PCR, 2011",
    requirementDescription: "Declarations required on packages intended for wholesale distribution and bulk transportation.",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Compoundable notice and statutory fine.",
    legalContext: "Regulates intermediate wholesale distribution chain compliance."
  },
  rule_23: {
    ruleId: "rule_23",
    ruleNumber: "Rule 23",
    title: "Prohibition on Deceptive or Non-Standard Packaging",
    category: "REGULATORY_COMPLIANCE",
    criticality: "CRITICAL",
    statutoryReference: "Rule 23 PCR, 2011 / Sec 36 LM Act",
    requirementDescription: "Prohibition on packaging sizes or dimensional deception intended to mislead the consumer.",
    penaltySection: "Section 36(1) LM Act, 2009",
    penaltySummary: "Penalty up to ₹25,000 and packaging seizure.",
    legalContext: "Protects consumers from slack-fill and deceptive packaging dimensions."
  },
  rule_27: {
    ruleId: "rule_27",
    ruleNumber: "Rule 27",
    title: "Packer / Manufacturer Registration Verification",
    category: "REGULATORY_COMPLIANCE",
    criticality: "CRITICAL",
    statutoryReference: "Rule 27 PCR, 2011 / State LM Registry",
    requirementDescription: "Verification of mandatory registration with the Controller of Legal Metrology within 90 days of commencement of pre-packing.",
    penaltySection: "Rule 27(1) Statutory Penalty",
    penaltySummary: "Statutory notice, inspection summons, and compoundable fine up to ₹25,000.",
    legalContext: "Establishes institutional registration of all packaging establishments in India."
  }
};

/**
 * Standard statutory declaration rules evaluated during every automated pre-pack inspection.
 */
export const CORE_STATUTORY_RULE_IDS = [
  "rule_6_1_a",
  "rule_6_1_b",
  "rule_6_1_c",
  "rule_6_1_d",
  "rule_6_1_e",
  "rule_6_1_f",
  "rule_6_1_g",
  "rule_6_1_l",
] as const;

/**
 * Normalize any legacy, case-variant, or raw rule ID into a canonical rule ID.
 */
export function normalizeRuleId(rawId: string | null | undefined): string {
  if (!rawId) return "other";
  
  const cleaned = rawId.trim().toLowerCase().replace(/[\s\-_]+/g, "_");

  if (cleaned.includes("6_1_a") || cleaned === "rule_6_1_a") return "rule_6_1_a";
  if (cleaned.includes("6_1_b") || cleaned === "rule_6_1_b") return "rule_6_1_b";
  if (cleaned.includes("6_1_c") || cleaned === "rule_6_1_c") return "rule_6_1_c";
  if (cleaned.includes("6_1_d") || cleaned === "rule_6_1_d") return "rule_6_1_d";
  if (cleaned.includes("6_1_e_usp")) return "rule_6_1_l";
  if (cleaned.includes("6_1_e") || cleaned === "rule_6_1_e") return "rule_6_1_e";
  if (cleaned.includes("6_1_f") || cleaned === "rule_6_1_f") return "rule_6_1_f";
  if (cleaned.includes("6_1_g") || cleaned === "rule_6_1_g") return "rule_6_1_g";
  if (cleaned.includes("6_1_l") || cleaned === "rule_6_1_l") return "rule_6_1_l";
  if (cleaned.includes("6_1_n") || cleaned === "rule_6_1_n") return "rule_6_1_n";
  if (cleaned.startsWith("rule_7") || cleaned.includes("numeral") || cleaned.includes("font") || cleaned.includes("dimension")) return "rule_7";
  if (cleaned.startsWith("rule_8")) return "rule_8";
  if (cleaned.startsWith("rule_9")) return "rule_9";
  if (cleaned.startsWith("rule_10")) return "rule_10";
  if (cleaned.startsWith("rule_18")) return "rule_18";
  if (cleaned.startsWith("rule_23")) return "rule_23";
  if (cleaned.startsWith("rule_27") || cleaned.includes("registration")) return "rule_27";

  return cleaned;
}

/**
 * Returns a canonical statutory definition for a rule, or dynamically creates one
 * with friendly titles and references if outside the predefined catalog.
 */
export function getRuleDefinition(rawRuleId: string, ruleName?: string): StatutoryRuleDefinition {
  const normId = normalizeRuleId(rawRuleId);
  if (CANONICAL_RULES[normId]) {
    return CANONICAL_RULES[normId];
  }

  // Format a friendly rule number and title from raw ID (e.g. rule_6_1_n -> Rule 6(1)(n))
  let ruleNumber = normId.toUpperCase().replace(/_/g, " ");
  if (normId.startsWith("rule_")) {
    const parts = normId.replace(/^rule_/, "").split("_");
    if (parts.length >= 2) {
      ruleNumber = `Rule ${parts[0]}(${parts.slice(1).join(")(")})`;
    } else {
      ruleNumber = `Rule ${parts[0]}`;
    }
  }

  return {
    ruleId: normId,
    ruleNumber,
    title: ruleName || `Statutory Check (${ruleNumber})`,
    category: "MANDATORY_DECLARATIONS",
    criticality: "STANDARD",
    statutoryReference: "Legal Metrology (Packaged Commodities) Rules, 2011",
    requirementDescription: "Mandatory statutory packaging compliance requirement.",
    penaltySection: "Rule 32(1) PCR, 2011",
    penaltySummary: "Statutory notice and compoundable fine under Rule 32(1).",
    legalContext: "Legal Metrology Enforcement Provision."
  };
}
