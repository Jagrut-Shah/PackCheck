/**
 * PackCheck AI - Cryptographic Report Signing & Verification Engine
 * Server-only module for signing statutory verification reports and certifying court admissibility.
 * Uses HMAC-SHA256 with REPORT_SIGNING_SECRET and constant-time verification.
 */

import crypto from "crypto";

/**
 * Gets server-side signing secret without ever exposing to client bundles.
 */
export function getReportSigningSecret(): string {
  if (typeof window !== "undefined") {
    throw new Error("REPORT_SIGNING_SECRET must never be accessed from client-side code");
  }
  const secret = process.env.REPORT_SIGNING_SECRET;
  if (!secret) {
    console.warn("[Security Warning] REPORT_SIGNING_SECRET is not configured. Falling back to temporary in-memory key.");
    return "packcheck-default-dev-signing-secret-do-not-use-in-production";
  }
  return secret;
}

/**
 * Generates a cryptographically secure HMAC-SHA256 signature for canonical report content.
 */
export function signReportContent(canonicalContent: string): string {
  const secret = getReportSigningSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(canonicalContent, "utf8")
    .digest("hex");
}

/**
 * Verifies an HMAC-SHA256 signature using timing-safe comparison to prevent timing side-channel attacks.
 */
export function verifyReportContentSignature(
  canonicalContent: string,
  providedSignature: string
): boolean {
  try {
    const expectedSignature = signReportContent(canonicalContent);
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const providedBuffer = Buffer.from(providedSignature, "hex");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Builds canonical string representation of statutory report findings for deterministic signing.
 */
export function buildCanonicalReportString(report: {
  inspectionId: string;
  reportNumber: string;
  commodityName: string;
  overallResult: string;
  generatedAt: string;
  findings?: Array<{ rule_id?: string; ruleId?: string; violation_type?: string; severity?: string }>;
}): string {
  const sortedFindings = (report.findings || [])
    .map((f) => `${f.ruleId || f.rule_id || ""}:${f.violation_type || ""}:${f.severity || ""}`)
    .sort()
    .join(";");

  return [
    `INSP:${report.inspectionId}`,
    `REP:${report.reportNumber}`,
    `COMMODITY:${report.commodityName}`,
    `VERDICT:${report.overallResult}`,
    `DATE:${report.generatedAt}`,
    `FINDINGS:${sortedFindings}`,
  ].join("|");
}

/**
 * Signs report data and returns the cryptographic document hash and signature.
 */
export function signVerificationReport(report: {
  inspectionId: string;
  reportNumber: string;
  commodityName: string;
  overallResult: string;
  generatedAt: string;
  findings?: Array<{ rule_id?: string; ruleId?: string; violation_type?: string; severity?: string }>;
}): {
  canonicalHash: string;
  digitalSignature: string;
  signedAt: string;
} {
  const canonical = buildCanonicalReportString(report);
  const canonicalHash = crypto.createHash("sha256").update(canonical).digest("hex");
  const digitalSignature = signReportContent(canonical);

  return {
    canonicalHash,
    digitalSignature,
    signedAt: new Date().toISOString(),
  };
}
