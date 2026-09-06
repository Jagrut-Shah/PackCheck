"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { CommandPalette } from "@/components/common/command-palette";
import { ToastProvider } from "@/components/common/toast";

export interface AppShellProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabSelect?: (id: string) => void;
  breadcrumbItems?: BreadcrumbItem[];
  title?: string;
}

function getDefaultNavigationMeta(pathname: string): {
  breadcrumbItems: BreadcrumbItem[];
  title: string;
} {
  if (pathname.startsWith("/inspections/new")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Inspections", href: "/inspections" },
        { label: "New Inspection" },
      ],
      title: "New Verification Record",
    };
  }
  if (pathname.startsWith("/inspections/")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Inspections", href: "/inspections" },
        { label: "Inspection Verification" },
      ],
      title: "Inspection Verification Workspace",
    };
  }
  if (pathname.startsWith("/inspections")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Inspections" },
      ],
      title: "Enforcement Inspections",
    };
  }
  if (pathname.startsWith("/audit-history") || pathname.startsWith("/history")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Audit History" },
      ],
      title: "Regulatory Audit History",
    };
  }
  if (pathname.startsWith("/companies")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Registered Packers" },
      ],
      title: "Registered Packers (Rule 27)",
    };
  }
  if (pathname.startsWith("/reports")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Verification Reports" },
      ],
      title: "Statutory Verification Reports",
    };
  }
  if (pathname.startsWith("/analytics/rules")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Statutory Rule Performance" },
      ],
      title: "Rule Performance & Penalties",
    };
  }
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) {
    return {
      breadcrumbItems: [
        { label: "Inspection Portal", href: "/dashboard" },
        { label: "Officer Profile" },
      ],
      title: "Officer Profile",
    };
  }

  return {
    breadcrumbItems: [
      { label: "Inspection Portal", href: "/dashboard" },
      { label: "Dashboard" },
    ],
    title: "Dashboard Overview",
  };
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  onTabSelect,
  breadcrumbItems,
  title,
}) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const pathname = usePathname() || "";

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const defaultMeta = getDefaultNavigationMeta(pathname);
  const resolvedBreadcrumbItems = breadcrumbItems || defaultMeta.breadcrumbItems;
  const resolvedTitle = title || defaultMeta.title;

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans">
        {/* Desktop Left Light Sidebar */}
        <div className="hidden lg:flex h-full">
          <Sidebar activeTab={activeTab} onTabSelect={onTabSelect} />
        </div>

        {/* Mobile Drawer Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="relative z-10 flex w-64 h-full animate-in slide-in-from-left duration-200">
              <Sidebar
                activeTab={activeTab}
                onTabSelect={onTabSelect}
                onCloseMobile={() => setIsMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Workspace Area */}
        <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
          <Header
            activeTitle={resolvedTitle}
            breadcrumbItems={resolvedBreadcrumbItems}
            onToggleMobileSidebar={() => setIsMobileOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>

        {/* Global Command Palette Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </ToastProvider>
  );
};
