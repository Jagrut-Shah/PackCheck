/**
 * PackCheck AI - Companies API Client Layer
 * Mock-first async service abstraction for Rule 27 registered pre-packers & manufacturers.
 */

import { RegisteredPacker, MOCK_COMPANIES, getCompanyById as findCompanyById } from "@/mocks/companies";

export interface CompanyFilterParams {
  searchQuery?: string;
  state?: string;
}

export async function getCompanies(params?: CompanyFilterParams): Promise<RegisteredPacker[]> {
  await new Promise((resolve) => setTimeout(resolve, 40));

  let results = [...MOCK_COMPANIES];

  if (params?.state && params.state !== "ALL") {
    results = results.filter((c) => c.state.includes(params.state!));
  }

  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase().trim();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.registrationNumber.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function getCompanyById(id: string): Promise<RegisteredPacker | null> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  const found = findCompanyById(id);
  return found ? { ...found } : null;
}
