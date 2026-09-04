/**
 * PackCheck AI - Findings & Evidence Contracts
 * Connects detected statutory non-compliances, photographic regions, and Legal Metrology rule citations.
 */

import { BoundingBox, BoundingBoxTuple } from "./common";
import { ViolationSeverity } from "./compliance";

/**
 * Shared Evidence Contract connecting:
 * Image + Bounding region + Extracted value + Finding + Rule
 */
export interface Evidence {
  imageId: string;
  /**
   * Canonical bounding box tuple: [x, y, width, height]
   */
  boundingBox?: BoundingBoxTuple | BoundingBox;
  extractedValue?: string;
  fieldName?: string;
  findingId?: string;
  ruleId?: string;
  imageAngle?: string;
  snippetUrl?: string;
  ocrSnippetText?: string;
}

export type FindingEvidence = Evidence;

export type FindingStatus = "OPEN" | "VERIFIED" | "DISMISSED" | "RESOLVED";

/**
 * Canonical Finding Contract.
 * Represents a discrete statutory infraction evaluated by the Compliance Engine.
 */
export interface Finding {
  id: string;
  findingId?: string;
  inspectionId: string;
  complianceRunId?: string;
  ruleId: string;
  ruleNumber: string;
  fieldName?: string;
  severity: ViolationSeverity;
  status?: FindingStatus;
  title: string;
  description: string;
  observedValue?: string;
  detectedValue?: string;
  expectedValue?: string;
  expectedRequirement: string;
  statutoryReference: string;
  evidence: Evidence[];
  evidenceImageId?: string;
  evidenceBoundingBox?: BoundingBoxTuple;
  recommendation?: string;
  ruleSource?: string;
  timestamps?: {
    createdAt: string;
    updatedAt: string;
  };
  isVerifiedByInspector?: boolean;
  inspectorNotes?: string;
  createdAt?: string;
}

export type ComplianceFinding = Finding;
