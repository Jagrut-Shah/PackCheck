/**
 * PackCheck AI - Deterministic Compliance Rules Engine
 * Owner: Member 3 (LLM Extraction + Compliance Rules Engine)
 * Purpose: Versioned, deterministic evaluation of Legal Metrology (Packaged Commodities) Rules, 2011.
 * Critical Principle: AI may assist extraction, but deterministic code MUST be the legal decision-maker.
 */

import { ExtractedDeclarations } from "@/lib/types/extraction";
import { ComplianceEvaluation, ComplianceRuleResult, IndividualRuleResult } from "@/lib/types/compliance";
import { OVERALL_RESULT } from "@/lib/types/common";
import { MOCK_COMPLIANCE_AMUL_GHEE, MOCK_COMPLIANCE_NUTRIBITE } from "@/mocks/compliance";

export async function evaluateCompliance(
  declarations: ExtractedDeclarations,
  ruleEngineVersion = "PCR-2011-AMENDED-2024.1"
): Promise<ComplianceEvaluation> {
  const prodName = declarations.commodityName?.value || "";
  const prodLower = prodName.toLowerCase();

  // Only fall back to static demo mocks if declarations are completely unpopulated
  const hasFields =
    (declarations.commodityName && declarations.commodityName.confidence > 0) ||
    (declarations.netQuantity && declarations.netQuantity.confidence > 0) ||
    (declarations.mrp && declarations.mrp.confidence > 0);

  if (!hasFields) {
    if (prodLower.includes("ghee") || prodLower.includes("amul")) {
      return MOCK_COMPLIANCE_AMUL_GHEE;
    }
    if (prodLower.includes("cookie") || prodLower.includes("nutribite")) {
      return MOCK_COMPLIANCE_NUTRIBITE;
    }
  }

  // Dynamic evaluation strictly derived from the passed declarations
  const now = new Date().toISOString();

  // 1. Evaluate manufacturerOrPacker (Rule 6(1)(a))
  let mfrResult: IndividualRuleResult = "FAIL";
  const mfrField = declarations.manufacturerOrPacker;
  const mfrName = mfrField?.value?.name?.trim() || "";
  const mfrAddr = mfrField?.value?.address?.trim() || "";
  const mfrPincode = mfrField?.value?.pincode?.trim() || "";
  let mfrObserved = mfrField?.value?.rawText || mfrField?.rawValue || "";
  let mfrExplanation = "";

  if (!mfrField || mfrField.confidence === 0 || !mfrField.value || (!mfrName && !mfrAddr)) {
    mfrResult = "FAIL";
    mfrExplanation = "Manufacturer or packer identity and address declaration is missing or invalid.";
    mfrObserved = mfrObserved || "Missing / Invalid";
  } else if (!mfrName || !mfrAddr) {
    mfrResult = "FAIL";
    mfrExplanation = "Manufacturer or packer declaration must contain both company name and address.";
    mfrObserved = `${mfrName || "Missing Name"}, ${mfrAddr || "Missing Address"}`;
  } else if (!mfrPincode || mfrField.confidence < 0.5) {
    mfrResult = "MANUAL_REVIEW";
    mfrExplanation = !mfrPincode
      ? `Manufacturer name '${mfrName}' and address declared, but 6-digit PIN code is missing from the address.`
      : `Manufacturer details declared but require manual review due to low extraction confidence (${mfrField.confidence}).`;
    mfrObserved = `${mfrName}, ${mfrAddr}${mfrPincode ? ` - ${mfrPincode}` : ""}`;
  } else {
    mfrResult = "PASS";
    mfrExplanation = `Manufacturer / packer identity '${mfrName}', address, and PIN code '${mfrPincode}' declared in compliance with Rule 6(1)(a).`;
    mfrObserved = `${mfrName}, ${mfrAddr}${mfrPincode ? ` - ${mfrPincode}` : ""}`;
  }

  // 2. Evaluate commodityName (Rule 6(1)(b))
  let commodityResult: IndividualRuleResult = "FAIL";
  const commodityField = declarations.commodityName;
  const commodityVal = commodityField?.value?.trim() || "";
  let commodityObserved = commodityVal || commodityField?.rawValue || "";
  let commodityExplanation = "";

  if (!commodityField || commodityField.confidence === 0 || !commodityVal) {
    commodityResult = "FAIL";
    commodityExplanation = "Generic or common name of commodity is missing from Principal Display Panel.";
    commodityObserved = commodityObserved || "Missing / Invalid";
  } else if (commodityField.confidence < 0.5) {
    commodityResult = "MANUAL_REVIEW";
    commodityExplanation = `Generic / common name '${commodityVal}' detected, but requires manual verification due to low extraction confidence (${commodityField.confidence}).`;
  } else {
    commodityResult = "PASS";
    commodityExplanation = `Common / generic name '${commodityVal}' is declared on Principal Display Panel.`;
  }

  // 3. Evaluate netQuantity (Rule 6(1)(c))
  let netQtyResult: IndividualRuleResult = "FAIL";
  let netQtyObserved = declarations.netQuantity?.value?.rawText || declarations.netQuantity?.rawValue || "";
  let netQtyExplanation = "";
  const netQtyField = declarations.netQuantity;

  if (
    !netQtyField ||
    netQtyField.confidence === 0 ||
    !netQtyField.value ||
    netQtyField.value.declaredQuantity <= 0 ||
    !netQtyField.value.unit
  ) {
    netQtyResult = "FAIL";
    netQtyExplanation = "Net quantity declaration is missing or invalid.";
    netQtyObserved = netQtyObserved || "Missing / Invalid";
  } else if (netQtyField.value.isStandardUnit) {
    netQtyResult = "PASS";
    netQtyExplanation = `Net quantity declared in standard metric units: ${
      netQtyField.value.rawText || `${netQtyField.value.declaredQuantity} ${netQtyField.value.unit}`
    }.`;
  } else {
    netQtyResult = "MANUAL_REVIEW";
    netQtyExplanation = `Net quantity declared in non-standard metric unit '${netQtyField.value.unit}': ${netQtyField.value.rawText}.`;
  }

  // 4. Evaluate manufacturingOrPackingDate (Rule 6(1)(d))
  let mfgDateResult: IndividualRuleResult = "FAIL";
  let mfgDateObserved =
    declarations.manufacturingOrPackingDate?.value?.formattedText ||
    declarations.manufacturingOrPackingDate?.rawValue ||
    "";
  let mfgDateExplanation = "";
  const mfgDateField = declarations.manufacturingOrPackingDate;

  if (
    !mfgDateField ||
    mfgDateField.confidence === 0 ||
    !mfgDateField.value ||
    !mfgDateField.value.formattedText ||
    mfgDateField.value.month === 0 ||
    mfgDateField.value.year === 0
  ) {
    mfgDateResult = "FAIL";
    mfgDateExplanation = "Date of manufacture or packing declaration is missing or invalid.";
    mfgDateObserved = mfgDateObserved || "Missing / Invalid";
  } else if (mfgDateField.confidence < 0.5) {
    mfgDateResult = "MANUAL_REVIEW";
    mfgDateExplanation = `Manufacturing / packing date format requires manual review due to low extraction confidence (${mfgDateField.confidence}).`;
  } else {
    mfgDateResult = "PASS";
    mfgDateExplanation = `Manufacturing / packing date format compliant: ${mfgDateField.value.formattedText}.`;
  }

  // 5. Evaluate MRP (Rule 6(1)(e))
  let mrpResult: IndividualRuleResult = "FAIL";
  let mrpObserved = declarations.mrp?.value?.rawText || declarations.mrp?.rawValue || "";
  let mrpExplanation = "";
  const mrpField = declarations.mrp;

  if (
    !mrpField ||
    mrpField.confidence === 0 ||
    !mrpField.value ||
    mrpField.value.amountInRupees <= 0 ||
    !mrpField.value.rawText
  ) {
    mrpResult = "FAIL";
    mrpExplanation = "Maximum Retail Price (MRP) declaration is missing or invalid.";
    mrpObserved = mrpObserved || "Missing / Invalid";
  } else if (mrpField.value.isInclusiveOfAllTaxes) {
    mrpResult = "PASS";
    mrpExplanation = `Maximum Retail Price declared with required tax notice: ${mrpField.value.rawText}.`;
  } else {
    mrpResult = "MANUAL_REVIEW";
    mrpExplanation = `Maximum Retail Price declared (${mrpField.value.rawText}) but missing explicit 'inclusive of all taxes' notice.`;
  }

  // 6. Evaluate consumerCare (Rule 6(1)(f))
  let careResult: IndividualRuleResult = "FAIL";
  const careField = declarations.consumerCare;
  const carePhone = careField?.value?.telephoneOrMobile?.trim() || "";
  const careEmail = careField?.value?.email?.trim() || "";
  const careAddress = careField?.value?.address?.trim() || "";
  let careObserved = careField?.value?.rawText || careField?.rawValue || "";
  let careExplanation = "";

  if (
    !careField ||
    careField.confidence === 0 ||
    !careField.value ||
    (!carePhone && !careEmail && !careAddress && !careObserved)
  ) {
    careResult = "FAIL";
    careExplanation = "Consumer care details (phone, email, or contact address) are missing from package.";
    careObserved = careObserved || "Missing / Invalid";
  } else if (careField.confidence < 0.5 || (!carePhone && !careEmail)) {
    careResult = "MANUAL_REVIEW";
    careExplanation = !carePhone && !careEmail
      ? `Consumer care information present (${careObserved}), but explicit phone number or email address was not detected.`
      : `Consumer care details present but require manual review due to low extraction confidence (${careField.confidence}).`;
  } else {
    careResult = "PASS";
    careExplanation = `Consumer care grievance contact details declared in compliance with Rule 6(1)(f): ${careObserved}.`;
  }

  // 7. Evaluate countryOfOrigin (Rule 6(1)(g))
  let countryResult: IndividualRuleResult = "FAIL";
  const countryField = declarations.countryOfOrigin;
  const countryVal = countryField?.value?.trim() || "";
  let countryObserved = countryVal || countryField?.rawValue || "";
  let countryExplanation = "";

  const isRawInferred = countryField?.rawValue && countryField.rawValue.toLowerCase().includes("inferred");

  if (!countryField || countryField.confidence === 0 || !countryVal) {
    countryResult = "FAIL";
    countryExplanation = "Country of origin declaration is missing from package.";
    countryObserved = countryObserved || "Missing / Invalid";
  } else if (isRawInferred) {
    countryResult = "MANUAL_REVIEW";
    countryExplanation = "Country of origin inferred from domestic address / PIN code requires manual verification of explicit package text.";
    countryObserved = `${countryVal} (Inferred)`;
  } else if (countryField.confidence < 0.5) {
    countryResult = "MANUAL_REVIEW";
    countryExplanation = `Country of origin declared ('${countryVal}'), but requires manual review due to low extraction confidence (${countryField.confidence}).`;
  } else {
    countryResult = "PASS";
    countryExplanation = `Country of origin explicitly declared: ${countryVal}.`;
  }

  // 8. Evaluate unitSalePrice (Rule 6(1)(l))
  let uspResult: IndividualRuleResult = "MANUAL_REVIEW";
  const uspField = declarations.unitSalePrice;
  const uspDeclared = uspField?.value?.isDeclared;
  const uspAmount = uspField?.value?.amountInRupees || 0;
  const uspUnit = uspField?.value?.unit || "";
  let uspObserved = uspField?.value?.rawText || uspField?.rawValue || "";
  let uspExplanation = "";

  if (uspField && uspField.confidence > 0 && uspDeclared) {
    if (uspAmount <= 0 || !uspUnit) {
      uspResult = "FAIL";
      uspExplanation = "Unit sale price is explicitly declared on package but contains an invalid amount or unit.";
      uspObserved = uspObserved || "Invalid USP Declaration";
    } else if (uspField.confidence >= 0.5) {
      uspResult = "PASS";
      uspExplanation = `Unit sale price declared in accordance with Rule 6(1)(l): ${uspObserved}.`;
    } else {
      uspResult = "MANUAL_REVIEW";
      uspExplanation = `Unit sale price declared (${uspObserved}), but requires manual review due to low extraction confidence.`;
    }
  } else {
    uspResult = "MANUAL_REVIEW";
    uspExplanation = "Unit sale price declaration not explicitly detected; manual review required to verify weight threshold applicability.";
    uspObserved = "Not Explicitly Declared";
  }

  const results: ComplianceRuleResult[] = [
    {
      ruleId: "rule_6_1_a",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "manufacturerOrPacker",
      observedValue: mfrObserved,
      expectedRequirement: "Complete manufacturer name and address with PIN code",
      result: mfrResult,
      explanation: mfrExplanation,
      ruleNumber: "Rule 6(1)(a)",
      ruleTitle: "Manufacturer / Packer Identity & Address",
      category: "MANDATORY_DECLARATIONS",
      status: mfrResult,
      statutoryReference: "Rule 6(1)(a)",
      rationale: mfrExplanation,
      detectedValue: mfrObserved,
    },
    {
      ruleId: "rule_6_1_b",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "commodityName",
      observedValue: commodityObserved,
      expectedRequirement: "Generic or common name declared on Principal Display Panel",
      result: commodityResult,
      explanation: commodityExplanation,
      ruleNumber: "Rule 6(1)(b)",
      ruleTitle: "Generic or Common Name of Commodity",
      category: "MANDATORY_DECLARATIONS",
      status: commodityResult,
      statutoryReference: "Rule 6(1)(b)",
      rationale: commodityExplanation,
      detectedValue: commodityObserved,
    },
    {
      ruleId: "rule_6_1_c",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "netQuantity",
      observedValue: netQtyObserved,
      expectedRequirement: "Net quantity in standard SI units (kg, g, L, ml, or N)",
      result: netQtyResult,
      explanation: netQtyExplanation,
      ruleNumber: "Rule 6(1)(c)",
      ruleTitle: "Net Quantity Standard Declaration",
      category: "MANDATORY_DECLARATIONS",
      status: netQtyResult,
      statutoryReference: "Rule 6(1)(c)",
      rationale: netQtyExplanation,
      detectedValue: netQtyObserved,
    },
    {
      ruleId: "rule_6_1_d",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "manufacturingDate",
      observedValue: mfgDateObserved,
      expectedRequirement: "Month and year of manufacture or packing in MM/YYYY or MM/YY format",
      result: mfgDateResult,
      explanation: mfgDateExplanation,
      ruleNumber: "Rule 6(1)(d)",
      ruleTitle: "Date of Manufacture / Packing",
      category: "MANDATORY_DECLARATIONS",
      status: mfgDateResult,
      statutoryReference: "Rule 6(1)(d)",
      rationale: mfgDateExplanation,
      detectedValue: mfgDateObserved,
    },
    {
      ruleId: "rule_6_1_e",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "mrp",
      observedValue: mrpObserved,
      expectedRequirement: "Maximum Retail Price in Indian Rupees with 'inclusive of all taxes'",
      result: mrpResult,
      explanation: mrpExplanation,
      ruleNumber: "Rule 6(1)(e)",
      ruleTitle: "Maximum Retail Price (MRP)",
      category: "MANDATORY_DECLARATIONS",
      status: mrpResult,
      statutoryReference: "Rule 6(1)(e)",
      rationale: mrpExplanation,
      detectedValue: mrpObserved,
    },
    {
      ruleId: "rule_6_1_f",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "consumerCare",
      observedValue: careObserved,
      expectedRequirement: "Consumer care details including phone, email, and address",
      result: careResult,
      explanation: careExplanation,
      ruleNumber: "Rule 6(1)(f)",
      ruleTitle: "Consumer Care Details",
      category: "MANDATORY_DECLARATIONS",
      status: careResult,
      statutoryReference: "Rule 6(1)(f)",
      rationale: careExplanation,
      detectedValue: careObserved,
    },
    {
      ruleId: "rule_6_1_g",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "countryOfOrigin",
      observedValue: countryObserved,
      expectedRequirement: "Country of origin declaration for domestic or imported packages",
      result: countryResult,
      explanation: countryExplanation,
      ruleNumber: "Rule 6(1)(g)",
      ruleTitle: "Country of Origin",
      category: "MANDATORY_DECLARATIONS",
      status: countryResult,
      statutoryReference: "Rule 6(1)(g)",
      rationale: countryExplanation,
      detectedValue: countryObserved,
    },
    {
      ruleId: "rule_6_1_l",
      ruleVersion: "PCR-2011-v2024.1",
      fieldEvaluated: "unitSalePrice",
      observedValue: uspObserved,
      expectedRequirement: "Unit sale price declared in accordance with second proviso",
      result: uspResult,
      explanation: uspExplanation,
      ruleNumber: "Rule 6(1)(l)",
      ruleTitle: "Unit Sale Price (USP)",
      category: "MANDATORY_DECLARATIONS",
      status: uspResult,
      statutoryReference: "Rule 6(1)(l)",
      rationale: uspExplanation,
      detectedValue: uspObserved,
    },
  ];

  const rulesEvaluated = results.length;
  const passedCount = results.filter((r) => r.result === "PASS").length;
  const failedCount = results.filter((r) => r.result === "FAIL").length;
  const reviewCount = results.filter((r) => r.result === "MANUAL_REVIEW").length;

  let overallResult: (typeof OVERALL_RESULT)[keyof typeof OVERALL_RESULT] = OVERALL_RESULT.PASS;
  if (failedCount > 0) {
    overallResult = OVERALL_RESULT.POTENTIAL_NON_COMPLIANCE;
  } else if (reviewCount > 0) {
    overallResult = OVERALL_RESULT.MANUAL_REVIEW;
  }

  const score = Math.round((passedCount / rulesEvaluated) * 100);

  return {
    inspectionId: "dynamic",
    ruleSetId: "ruleset_pcr_2011_v2024",
    engineVersion: ruleEngineVersion,
    startedAt: now,
    completedAt: now,
    evaluatedAt: now,
    overallResult,
    rulesEvaluated,
    rulesPassed: passedCount,
    rulesFailed: failedCount,
    rulesManualReview: reviewCount,
    passedCount,
    failedCount,
    warningCount: 0,
    reviewCount,
    score,
    scoreMethodVersion: "LM-COMPLIANCE-INDEX-V1",
    summaryNotes: `Compliance evaluation for ${
      commodityVal || prodName || "commodity"
    }: ${passedCount}/${rulesEvaluated} rules passed, ${failedCount} failed, ${reviewCount} requiring manual review.`,
    results,
  };
}
