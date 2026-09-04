/**
 * PackCheck AI - Mock Users & Inspectors
 * Realistic Legal Metrology Officers conforming strictly to UserContract.
 */

import { UserContract } from "@/lib/types/user";

export const MOCK_USERS: UserContract[] = [
  {
    id: "usr_delhi_001",
    email: "rajesh.kumar@gov.in",
    fullName: "Rajesh Kumar Sharma",
    employeeCode: "LM-DEL-4821",
    role: "INSPECTOR",
    organizationId: "org_dca_india",
    departmentId: "dept_lm_delhi_central",
    isActive: true,
    designation: "Legal Metrology Inspector",
    badgeNumber: "LM-DEL-4821",
    department: "Department of Consumer Affairs, Legal Metrology Wing",
    jurisdictionState: "Delhi NCR",
    jurisdictionDistrict: "Central Delhi & Connaught Place Zone",
    avatarUrl: "/avatars/officer-1.jpg",
    createdAt: "2025-04-12T09:00:00Z",
    lastLoginAt: "2026-09-04T08:30:00Z",
  },
  {
    id: "usr_mh_002",
    email: "priya.deshmukh@gov.in",
    fullName: "Priya Deshmukh",
    employeeCode: "LM-MH-1092",
    role: "SENIOR_OFFICER",
    organizationId: "org_fcs_maharashtra",
    departmentId: "dept_lm_mumbai",
    isActive: true,
    designation: "Senior Legal Metrology Officer",
    badgeNumber: "LM-MH-1092",
    department: "Food & Civil Supplies Department, Maharashtra",
    jurisdictionState: "Maharashtra",
    jurisdictionDistrict: "Mumbai Suburban",
    avatarUrl: "/avatars/officer-2.jpg",
    createdAt: "2024-01-15T10:00:00Z",
    lastLoginAt: "2026-09-03T16:45:00Z",
  },
  {
    id: "usr_admin_003",
    email: "admin.legalmetrology@nic.in",
    fullName: "Dr. Vikramaditya Sen",
    employeeCode: "LM-ADMIN-0001",
    role: "ADMIN",
    organizationId: "org_dca_india",
    departmentId: "dept_lm_hq",
    isActive: true,
    designation: "System Administrator & Technical Director",
    badgeNumber: "LM-ADMIN-0001",
    department: "National Legal Metrology Informatics Division",
    jurisdictionState: "National HQ",
    jurisdictionDistrict: "New Delhi",
    createdAt: "2023-08-01T10:00:00Z",
  },
];

export const CURRENT_MOCK_USER = MOCK_USERS[0];
