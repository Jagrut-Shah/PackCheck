/**
 * PackCheck AI — Companies API Client Layer
 * Connects frontend directly to server routes /api/companies and /api/companies/[id].
 */

import { apiClient, ApiClientError } from "./client";

export interface RegisteredPacker {
  id: string;
  name: string;
  brand: string;
  registrationNumber: string;
  registeredOffice: string;
  state: string;
  district: string;
  contactEmail: string;
  contactPhone: string;
  categories: string[];
  status: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";
  complianceRate: number;
  totalAudits: number;
  passedAudits: number;
  flaggedAudits: number;
  pendingAudits?: number;
  lastInspectionDate: string;
  registeredDate: string;
  repeatedFindings?: string[];
  inspectionIds?: string[];
}

export interface CompanyFilterParams {
  searchQuery?: string;
  state?: string;
}

export interface RegisterCompanyInput {
  name: string;
  registrationNumber: string;
  brand?: string;
  registeredOffice: string;
  state: string;
  district: string;
  contactEmail?: string;
  contactPhone?: string;
  categories?: string[];
  status?: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";
}

export interface CompanyDetailData {
  packer: RegisteredPacker;
  inspections: Array<{
    id: string;
    inspectionNumber: string;
    product: string;
    status: string;
    overallResult: string;
    createdAt: string;
  }>;
  findings: Array<{
    id: string;
    inspection_id: string;
    rule_id: string;
    rule_name: string;
    severity: string;
    message: string;
    evidence: string | null;
    created_at: string;
  }>;
  auditLogs: Array<{
    id: string;
    inspection_id: string;
    action: string;
    action_label: string;
    category: string;
    actor_name: string;
    details: string;
    created_at: string;
  }>;
}

/**
 * Fetch list of registered packers from real backend GET /api/companies
 */
export async function getCompanies(
  params?: CompanyFilterParams
): Promise<RegisteredPacker[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.searchQuery) {
      searchParams.set("searchQuery", params.searchQuery);
    }
    if (params?.state && params.state !== "ALL") {
      searchParams.set("state", params.state);
    }
    const qs = searchParams.toString();
    const url = qs ? `/api/companies?${qs}` : "/api/companies";

    const res = await apiClient.get<RegisteredPacker[]>(url);
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.error("Failed to fetch companies from backend:", err);
    return [];
  }
}

/**
 * Fetch detailed company record with linked inspections, findings, and audit trail
 */
export async function getCompanyDetail(
  id: string
): Promise<CompanyDetailData | null> {
  try {
    const res = await apiClient.get<CompanyDetailData>(`/api/companies/${id}`);
    return res || null;
  } catch (err) {
    console.error(`Failed to fetch company detail for ${id}:`, err);
    return null;
  }
}

/**
 * Backwards-compatible getCompanyById returning just the packer record
 */
export async function getCompanyById(
  id: string
): Promise<RegisteredPacker | null> {
  const detail = await getCompanyDetail(id);
  return detail ? detail.packer : null;
}

/**
 * Register a new manufacturer or pre-packer under Rule 27
 */
export async function registerCompany(
  input: RegisterCompanyInput
): Promise<RegisteredPacker> {
  const res = await apiClient.post<RegisteredPacker>("/api/companies", input);
  return res;
}
