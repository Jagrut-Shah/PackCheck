"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";
import { UserProfile } from "@/lib/types/user";
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardCheck,
  History,
  Building2,
  FileSpreadsheet,
  BarChart3,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INSPECTION_NAV_ITEMS,
  MANAGEMENT_NAV_ITEMS,
  NavigationItem,
} from "@/config/navigation";

export interface SidebarProps {
  activeTab?: string;
  onTabSelect?: (id: string) => void;
  className?: string;
  onCloseMobile?: () => void;
}

const ICON_MAP: Record<
  NavigationItem["iconName"],
  React.ComponentType<{ className?: string }>
> = {
  LayoutDashboard,
  ClipboardCheck,
  History,
  Building2,
  FileSpreadsheet,
  BarChart3,
  User,
  Settings,
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  className,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await getCurrentUser();
        if (u) setCurrentUser(u);
      } catch (err) {
        console.warn("Could not load current user session", err);
      }
    }
    loadUser();
  }, []);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } finally {
      router.push("/login");
    }
  };

  const isItemActive = (item: NavigationItem): boolean => {
    if (activeTab) {
      return item.id === activeTab;
    }
    if (!pathname) return false;

    if (item.matchMode === "exact") {
      return pathname === item.route;
    }
    return pathname === item.route || pathname.startsWith(item.route + "/");
  };

  const renderNavList = (items: NavigationItem[]) => (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = isItemActive(item);
        const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;

        return (
          <Link
            key={item.id}
            href={item.route}
            onClick={() => {
              onTabSelect?.(item.id);
              onCloseMobile?.();
            }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-out text-left relative group cursor-pointer active:scale-[0.98]",
              isActive
                ? "bg-[#EFF6FF] text-[#1D4ED8] font-bold shadow-2xs border border-[#BFDBFE]"
                : "text-[#475569] hover:text-[#1D4ED8] hover:bg-[#E2E8F0]/70 hover:shadow-2xs"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#1D4ED8]" />
            )}
            <span
              className={cn(
                "transition-colors",
                isActive
                  ? "text-[#1D4ED8]"
                  : "text-[#64748B] group-hover:text-[#0F172A]"
              )}
            >
              <IconComponent className="size-4" />
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E2E8F0] text-[#0F172A]">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-64 bg-[#F1F5F9] text-[#0F172A] border-r border-[#E2E8F0] select-none shrink-0",
        className
      )}
    >
      {/* Brand Header */}
      <Link
        href="/dashboard"
        onClick={onCloseMobile}
        className="flex items-center gap-2.5 px-5 py-4 border-b border-[#E2E8F0] hover:bg-white/60 transition-colors"
      >
        <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white shadow-xs">
          <ShieldCheck className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-wider text-[#0F172A] uppercase">
            PACKCHECK AI
          </span>
          <span className="text-[10px] text-[#64748B] font-medium">
            Legal Metrology Portal
          </span>
        </div>
      </Link>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
        {/* Inspection Group */}
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
            INSPECTION
          </span>
          {renderNavList(INSPECTION_NAV_ITEMS)}
        </div>

        {/* Management Group */}
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
            MANAGEMENT
          </span>
          {renderNavList(MANAGEMENT_NAV_ITEMS)}
        </div>
      </div>

      {/* Light User Profile Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs">
          <Link
            href="/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
            title={currentUser?.email ? `${currentUser.fullName} (${currentUser.email})` : "View Profile"}
          >
            <div className="size-7 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-bold text-[#1D4ED8] shrink-0">
              {currentUser?.fullName
                ? currentUser.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "LM"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#0F172A] truncate">
                {currentUser?.fullName || "Senior Inspector"}
              </span>
              <span className="text-[10px] text-[#64748B] truncate">
                {currentUser?.department || currentUser?.role || "Legal Metrology Dept"}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1 rounded text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
