/**
 * PackCheck AI - Compliance Engine Contracts
 * Deterministic, versioned rule contracts for Legal Metrology (Packaged Commodities) Rules, 2011.
 * Produced strictly by the Compliance Engine; consumed by Frontend, Findings, and Reporting.
 */

import { OverallResult } from "./common";

export type RuleCategory =
  | "MANDATORY_DECLARATIONS"
  | "MRP_STANDARDS"
  | "NET_QUANTITY_STANDARDS"
  | "UNIT_SALE_PRICE"
  | "CONSUMER_CARE"
  | "DATE_DECLARATION"
  | "FONT_SIZE_AND_DISPLAY"
  | "COUNTRY_OF_ORIGIN"
  | "E_COMMERCE_COMPLIANCE"
  | "SCHEDULE_II_SPECIFICATIONS";

export type IndividualRuleResult = "PASS" | "FAIL" | "MANUAL_REVIEW" | "NOT_APPLICABLE";

export type RuleStatus = IndividualRuleResult | "WARNING" | "MANUAL_REVIEW_REQUIRED";

export type ViolationSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "ADVISORY";

export type ValidationType =
  | "DETERMINISTIC"
  | "REGEX"
  | "RANGE_CHECK"
  | "VOCABULARY_CHECK"
  | "THRESHOLD_EVALUATION"
  | "RULE_CROSS_CHECK";

/**
 * Canonical Compliance Rule specification.
 */
export interface ComplianceRule {
  ruleId: string;
  ruleCode: string;          // e.g., "RULE_6_1_E"
  ruleName: string;          // e.g., "MRP Declaration with Tax Inclusivity"
  category: RuleCategory;
  description: string;
  requirement: string;
  severity: ViolationSeverity;
  validationType: ValidationType;
  ruleSetVersion: string;    // e.g., "PCR-2011-AMENDED-2024.1"
  statutorySource: string;   // e.g., "Legal Metrology (Packaged Commodities) Rules, 2011"
  sourceDocument: string;    // e.g., "Gazette Notification G.S.R. 571(E)"
  sourceUrl?: string;
  sourcePageOrSection: string; // e.g., "Rule 6, Sub-rule (1), Clause (e)"

  // Compatibility properties
  id?: string;
  ruleNumber?: string;
  title?: string;
  legalActCitation?: string;
  severityOnFailure?: ViolationSeverity;
  version?: string;
  isActive?: boolean;
}

export type StatutoryRule = ComplianceRule;

/**
 * Result of evaluating a single rule against extracted package declarations.
 */
export interface ComplianceRuleResult {
  ruleId: string;
  ruleVersion: string;
  fieldEvaluated: string;
  observedValue: unknown;
  expectedRequirement: string;
  result: IndividualRuleResult;
  explanation: string;
  evidenceReference?: string;
  sourceReference?: string;
  statutoryReference?: string;

  // Compatibility properties for UI components
  status?: RuleStatus;
  ruleNumber?: string;
  ruleTitle?: string;
  category?: RuleCategory;
  rationale?: string;
  detectedValue?: string | number | boolean | null;
  expectedCondition?: string;
  suggestedAction?: string;
}

export type RuleEvaluationResult = ComplianceRuleResult;

/**
 * Canonical Compliance Run execution contract.
 * Aggregates all evaluated rules and assigns the final deterministic statutory verdict.
 */
export interface ComplianceRun {
  inspectionId: string;
  ruleSetId: string;
  engineVersion: string;
  ruleEngineVersion?: string; // alias
  startedAt: string;          // ISO 8601
  completedAt: string;        // ISO 8601
  overallResult: OverallResult;
  rulesEvaluated: number;
  rulesPassed: number;
  rulesFailed: number;
  rulesManualReview: number;
  passedCount: number;
  failedCount: number;
  warningCount?: number;
  reviewCount: number;
  score?: number;             // Optional compliance index (0 to 100)
  scoreMethodVersion?: string;
  results: ComplianceRuleResult[];
  summaryNotes?: string;

  // Backwards compatibility properties
  evaluatedAt?: string;
}

export type ComplianceEvaluation = ComplianceRun;
