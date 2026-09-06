/**
 * PackCheck AI — Company Name Normalization & Deduplication
 * Provides conservative legal entity normalization to avoid creating duplicate
 * registered packer entries from minor OCR variances (punctuation, casing, corporate abbreviations).
 */

export function normalizeCompanyName(name: string): string {
  if (!name) return "";

  let cleaned = name
    .toLowerCase()
    .trim()
    // Replace common punctuation with space
    .replace(/[.,\-_/\\()&+'"]/g, " ")
    // Collapse multiple whitespace
    .replace(/\s+/g, " ");

  // Standardize corporate suffixes (order matters: longer tokens first)
  cleaned = cleaned
    .replace(/\bprivate\s+limited\b/g, "pvt ltd")
    .replace(/\bpvt\s+ltd\b/g, "pvt ltd")
    .replace(/\bprivate\b/g, "pvt")
    .replace(/\blimited\b/g, "ltd")
    .replace(/\bcorporation\b/g, "corp")
    .replace(/\bcompany\b/g, "co")
    .replace(/\bcooperative\b/g, "coop")
    .replace(/\bco-operative\b/g, "coop");

  return cleaned.trim().replace(/\s+/g, " ");
}

export function normalizeRegistrationNumber(regNo: string): string {
  if (!regNo) return "";
  return regNo.toUpperCase().trim().replace(/\s+/g, "-");
}

export interface MatchCandidate {
  id: string;
  name: string;
  normalized_name: string;
  registration_number: string;
  brand?: string | null;
}

/**
 * Checks if a candidate company matches an incoming name or registration number.
 * Conservative: requires exact normalized match or exact registration number match.
 */
export function isCompanyMatch(
  candidate: MatchCandidate,
  targetNameOrReg: string,
  targetBrand?: string
): boolean {
  if (!targetNameOrReg) return false;

  const cleanTarget = normalizeCompanyName(targetNameOrReg);
  const cleanReg = normalizeRegistrationNumber(targetNameOrReg);

  // 1. Exact registration number match
  if (
    cleanReg &&
    normalizeRegistrationNumber(candidate.registration_number) === cleanReg
  ) {
    return true;
  }

  // 2. Exact normalized entity name match
  if (cleanTarget && candidate.normalized_name === cleanTarget) {
    return true;
  }

  // 3. Brand match with entity brand (if provided and long enough)
  if (
    targetBrand &&
    candidate.brand &&
    candidate.brand.trim().length >= 3 &&
    candidate.brand.trim().toLowerCase() === targetBrand.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
}
