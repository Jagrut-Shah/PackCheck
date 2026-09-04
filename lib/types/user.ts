/**
 * PackCheck AI - User & Role Contracts
 * Legal Metrology Officers, Inspectors, and System Administration Roles.
 */

export type UserRole =
  | "INSPECTOR"
  | "SENIOR_OFFICER"
  | "SENIOR_LEGAL_METROLOGY_OFFICER"
  | "CONTROLLER"
  | "ADMIN";

/**
 * Canonical User Contract.
 */
export interface UserContract {
  id: string;
  fullName: string;
  employeeCode: string; // Official departmental badge number
  email: string;
  role: UserRole;
  organizationId: string;
  departmentId: string;
  isActive: boolean;

  // Compatibility properties for UI display
  designation?: string;
  badgeNumber?: string;
  department?: string;
  jurisdictionState?: string;
  jurisdictionDistrict?: string;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export type UserProfile = UserContract;

export interface AuthSession {
  user: UserProfile | null;
  token?: string;
  isAuthenticated: boolean;
}
