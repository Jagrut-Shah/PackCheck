/**
 * PackCheck AI - Centralized Application Navigation Configuration
 * Single source of truth for all authenticated navigation items across the application shell.
 */

import { PermissionAction } from "@/config/permissions";
import { UserRole } from "@/types/user";

export type NavGroup = "INSPECTION" | "MANAGEMENT";

export interface NavigationItem {
  id: string;
  label: string;
  route: string;
  iconName:
    | "LayoutDashboard"
    | "ClipboardCheck"
    | "History"
    | "Building2"
    | "FileSpreadsheet"
    | "BarChart3"
    | "User"
    | "Settings";
  badge?: string;
  group: NavGroup;
  permission?: PermissionAction;
  roles?: UserRole[];
  matchMode: "exact" | "prefix";
}

export const CENTRAL_NAVIGATION: NavigationItem[] = [
  // Inspection & Regulatory Operations Group
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    iconName: "LayoutDashboard",
    group: "INSPECTION",
    matchMode: "exact",
  },
  {
    id: "inspections",
    label: "Inspections",
    route: "/inspections",
    iconName: "ClipboardCheck",
    badge: "Active",
    group: "INSPECTION",
    matchMode: "prefix",
  },
  {
    id: "history",
    label: "Audit History",
    route: "/audit-history",
    iconName: "History",
    group: "INSPECTION",
    matchMode: "prefix",
  },
  {
    id: "packers",
    label: "Registered Packers",
    route: "/companies",
    iconName: "Building2",
    group: "INSPECTION",
    matchMode: "prefix",
  },
  {
    id: "reports",
    label: "Compliance Reports",
    route: "/reports",
    iconName: "FileSpreadsheet",
    group: "INSPECTION",
    matchMode: "prefix",
  },
  {
    id: "analytics",
    label: "Rule Analytics",
    route: "/analytics/rules",
    iconName: "BarChart3",
    group: "INSPECTION",
    matchMode: "prefix",
  },

  // Officer Profile & System Administration Group
  {
    id: "profile",
    label: "Officer Profile",
    route: "/profile",
    iconName: "User",
    group: "MANAGEMENT",
    matchMode: "prefix",
  },
  {
    id: "settings",
    label: "System Settings",
    route: "/settings",
    iconName: "Settings",
    group: "MANAGEMENT",
    matchMode: "prefix",
  },
];

export const INSPECTION_NAV_ITEMS = CENTRAL_NAVIGATION.filter(
  (item) => item.group === "INSPECTION"
);

export const MANAGEMENT_NAV_ITEMS = CENTRAL_NAVIGATION.filter(
  (item) => item.group === "MANAGEMENT"
);
