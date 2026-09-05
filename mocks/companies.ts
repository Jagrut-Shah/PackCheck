/**
 * PackCheck AI - Mock Registered Packers & Companies Dataset
 * Represents entities registered under Rule 27 of Legal Metrology (Packaged Commodities) Rules, 2011.
 */

export interface RegisteredPacker {
  id: string;
  name: string;
  brand: string;
  registrationNumber: string; // Rule 27 registration
  registeredOffice: string;
  state: string;
  district: string;
  contactEmail: string;
  contactPhone: string;
  categories: string[];
  status: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";
  complianceRate: number; // percentage e.g. 98.4
  totalAudits: number;
  passedAudits: number;
  flaggedAudits: number;
  lastInspectionDate: string;
  registeredDate: string;
  repeatedFindings: string[];
  inspectionIds: string[];
}

export const MOCK_COMPANIES: RegisteredPacker[] = [
  {
    id: "comp_amul",
    name: "Kaira District Co-operative Milk Producers' Union Ltd.",
    brand: "Amul",
    registrationNumber: "LMR-GJ-2018-091",
    registeredOffice: "Amul Dairy Road, Anand, Gujarat - 388001",
    state: "Gujarat",
    district: "Anand",
    contactEmail: "customercare@amul.coop",
    contactPhone: "1800 258 3333",
    categories: ["Dairy Products", "Edible Oils", "Beverages", "Sweets"],
    status: "ACTIVE",
    complianceRate: 98.4,
    totalAudits: 64,
    passedAudits: 63,
    flaggedAudits: 1,
    lastInspectionDate: "2026-09-03",
    registeredDate: "2018-05-14",
    repeatedFindings: [],
    inspectionIds: ["ins_amul_ghee_001"],
  },
  {
    id: "comp_nutribite",
    name: "NutriBite Foods Pvt Ltd",
    brand: "NutriBite",
    registrationNumber: "LMR-DL-2023-441",
    registeredOffice: "Plot 14, Okhla Industrial Area Phase 3, New Delhi - 110020",
    state: "Delhi NCR",
    district: "South East Delhi",
    contactEmail: "info@nutribitefoods.in",
    contactPhone: "011 4988 2210",
    categories: ["Bakery & Biscuits", "Health Bars", "Protein Snacks"],
    status: "UNDER_REVIEW",
    complianceRate: 72.0,
    totalAudits: 25,
    passedAudits: 18,
    flaggedAudits: 7,
    lastInspectionDate: "2026-09-03",
    registeredDate: "2023-08-20",
    repeatedFindings: [
      "Rule 6(1)(e): Missing 'inclusive of all taxes' declaration on MRP",
      "Rule 6(1)(f): Incomplete consumer care contact telephone number",
      "Rule 6(1)(e) Proviso: Omission of Unit Sale Price (USP) for pack > 100g",
    ],
    inspectionIds: ["ins_nutribite_cookies_002"],
  },
  {
    id: "comp_pristine",
    name: "Pristine Bio Products Ltd",
    brand: "Pristine Hills",
    registrationNumber: "LMR-UK-2021-118",
    registeredOffice: "Industrial Estate, Pantnagar, Udham Singh Nagar, Uttarakhand - 263153",
    state: "Uttarakhand",
    district: "Udham Singh Nagar",
    contactEmail: "care@pristinebio.com",
    contactPhone: "05944 245019",
    categories: ["Honey & Natural Sweeteners", "Herbal Infusions", "Organic Spices"],
    status: "ACTIVE",
    complianceRate: 88.5,
    totalAudits: 16,
    passedAudits: 14,
    flaggedAudits: 2,
    lastInspectionDate: "2026-09-03",
    registeredDate: "2021-11-02",
    repeatedFindings: [
      "Rule 6(1)(d): Month and year declaration obscured or low font contrast",
    ],
    inspectionIds: ["ins_himalayan_honey_003"],
  },
  {
    id: "comp_adani",
    name: "Adani Wilmar Limited",
    brand: "Fortune",
    registrationNumber: "LMR-GJ-2015-012",
    registeredOffice: "Fortune House, Near Navrangpura Railway Crossing, Ahmedabad - 380009",
    state: "Gujarat",
    district: "Ahmedabad",
    contactEmail: "customercare@adaniwilmar.in",
    contactPhone: "1800 233 9999",
    categories: ["Edible Oils", "Basmati Rice", "Wheat Flour (Atta)", "Pulses & Grains"],
    status: "ACTIVE",
    complianceRate: 99.1,
    totalAudits: 112,
    passedAudits: 111,
    flaggedAudits: 1,
    lastInspectionDate: "2026-09-03",
    registeredDate: "2015-03-10",
    repeatedFindings: [],
    inspectionIds: ["ins_fortune_oil_004"],
  },
  {
    id: "comp_ltfoods",
    name: "LT Foods Ltd.",
    brand: "Daawat",
    registrationNumber: "LMR-HR-2016-554",
    registeredOffice: "Unit No. 134, 1st Floor, Rectangle-1, Saket District Centre, New Delhi - 110017",
    state: "Haryana / Delhi",
    district: "Sonipat",
    contactEmail: "ir@ltgroup.in",
    contactPhone: "0124 3055100",
    categories: ["Basmati Rice", "Ready to Cook", "Specialty Grains"],
    status: "ACTIVE",
    complianceRate: 96.8,
    totalAudits: 45,
    passedAudits: 43,
    flaggedAudits: 2,
    lastInspectionDate: "2026-09-04",
    registeredDate: "2016-09-18",
    repeatedFindings: [],
    inspectionIds: ["ins_daawat_rice_005"],
  },
];

export function getCompanyById(id: string): RegisteredPacker | undefined {
  return MOCK_COMPANIES.find((c) => c.id === id || c.registrationNumber === id);
}
