/**
 * PackCheck AI - Application Settings & Navigation Config
 */

export const APP_CONFIG = {
  name: "PackCheck AI",
  tagline: "Legal Metrology Compliance & Inspection System",
  statutoryAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
  version: "1.0.0-hackathon",
  apiVersion: "v1",
  supportEmail: "support@packcheck.gov.in",
  defaultJurisdiction: "Legal Metrology Department, HQ New Delhi",
  maxUploadImagesPerInspection: 10,
  maxFileSizeMB: 15,
  allowedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export {
  CENTRAL_NAVIGATION,
  type NavigationItem,
} from "@/config/navigation";

export interface NavItem {
  name: string;
  href: string;
  iconName: string;
  badge?: string;
  group: "INSPECTION" | "RESOURCES" | "SYSTEM" | "MANAGEMENT";
}

export const MAIN_NAVIGATION: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    iconName: "LayoutDashboard",
    group: "INSPECTION",
  },
  {
    name: "Inspections",
    href: "/inspections",
    iconName: "ClipboardCheck",
    group: "INSPECTION",
  },
  {
    name: "Audit History",
    href: "/audit-history",
    iconName: "History",
    group: "INSPECTION",
  },
  {
    name: "Registered Packers",
    href: "/companies",
    iconName: "Building2",
    group: "INSPECTION",
  },
  {
    name: "Compliance Reports",
    href: "/reports",
    iconName: "FileSpreadsheet",
    group: "INSPECTION",
  },
  {
    name: "Rule Analytics",
    href: "/analytics/rules",
    iconName: "BarChart3",
    group: "INSPECTION",
  },
  {
    name: "Officer Profile",
    href: "/profile",
    iconName: "User",
    group: "MANAGEMENT",
  },
];
