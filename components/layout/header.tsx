"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Check,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";

export interface HeaderProps {
  breadcrumbItems?: BreadcrumbItem[];
  onToggleMobileSidebar?: () => void;
  activeTitle?: string;
  onOpenCommandPalette?: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "CRITICAL" | "COMPLIANT" | "REVIEW" | "INFO";
  read: boolean;
  href?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Critical Non-Compliance Detected",
    description:
      "Amul Pure Ghee 1L (INSP-2024-001) flagged for missing consumer care helpline under Rule 6(1)(f).",
    time: "10m ago",
    type: "CRITICAL",
    read: false,
    href: "/inspections/INSP-2024-001/compliance",
  },
  {
    id: "notif-2",
    title: "Inspection Verified (PASS)",
    description:
      "Britannia Good Day Butter 600g (INSP-2024-002) passed all Rule 6 statutory checks.",
    time: "42m ago",
    type: "COMPLIANT",
    read: false,
    href: "/inspections/INSP-2024-002/compliance",
  },
  {
    id: "notif-3",
    title: "Manual Review Required",
    description:
      "Tata Salt 1kg (INSP-2024-003) MRP declaration requires inspector confirmation.",
    time: "2h ago",
    type: "REVIEW",
    read: false,
    href: "/inspections/INSP-2024-003/review",
  },
  {
    id: "notif-4",
    title: "OCR Pipeline Calibrated",
    description:
      "PaddleOCR engine synchronized with Legal Metrology 2024 metric specifications.",
    time: "4h ago",
    type: "INFO",
    read: true,
  },
];

export const Header: React.FC<HeaderProps> = ({
  breadcrumbItems = [{ label: "Inspection Portal" }, { label: "Dashboard" }],
  onToggleMobileSidebar,
  activeTitle = "Dashboard Overview",
  onOpenCommandPalette,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    if (item.href) {
      setIsOpen(false);
      router.push(item.href);
    }
  };

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "CRITICAL":
        return <XCircle className="size-4 text-[#991B1B] shrink-0" />;
      case "COMPLIANT":
        return <CheckCircle2 className="size-4 text-[#166534] shrink-0" />;
      case "REVIEW":
        return <AlertTriangle className="size-4 text-[#92400E] shrink-0" />;
      default:
        return <Clock className="size-4 text-[#0369A1] shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:px-6">
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex size-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] transition-all duration-200 cursor-pointer active:scale-95 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-4" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <div className="sm:hidden text-xs font-semibold text-[#0F172A]">
          {activeTitle}
        </div>
      </div>

      {/* Right side: Search & Notifications */}
      <div className="flex items-center gap-3">
        {/* Interactive Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group relative hidden md:flex items-center h-8 w-64 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#BFDBFE] hover:shadow-2xs pl-8 pr-2.5 text-xs text-[#94A3B8] hover:text-[#0F172A] transition-all duration-150 cursor-pointer"
        >
          <Search className="absolute left-2.5 size-3.5 text-[#94A3B8] group-hover:text-[#1D4ED8] transition-colors" />
          <span className="truncate">Search inspections, rules...</span>
          <kbd className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] group-hover:bg-[#EFF6FF] border border-[#CBD5E1] px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Popover Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="true"
            className={`relative flex size-8 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
              isOpen
                ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] shadow-xs"
                : "border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] hover:shadow-2xs"
            }`}
            aria-label={`View notifications (${unreadCount} unread)`}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white ring-2 ring-white shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#E2E8F0] bg-white shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3 bg-[#F8FAFC] rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0F172A]">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D4ED8] hover:underline cursor-pointer transition-colors"
                    >
                      <Check className="size-3" />
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="p-1 text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEE2E2] rounded-md transition-all duration-150 cursor-pointer active:scale-90"
                      title="Clear all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="mx-auto size-6 text-[#94A3B8] opacity-40 mb-2" />
                    <p className="text-xs font-medium text-[#475569]">
                      No notifications
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      You are all caught up on regulatory alerts.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`flex items-start gap-3 p-3 text-left transition-all duration-150 cursor-pointer hover:bg-[#F8FAFC] hover:pl-3.5 ${
                        !item.read ? "bg-[#EFF6FF]/60" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs ${
                              !item.read ? "font-bold text-[#0F172A]" : "font-medium text-[#475569]"
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-[#94A3B8] shrink-0">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                        {item.href && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1D4ED8] mt-1.5 hover:underline">
                            <span>Open Inspection</span>
                            <ExternalLink className="size-2.5" />
                          </span>
                        )}
                      </div>
                      {!item.read && (
                        <span className="size-1.5 rounded-full bg-[#1D4ED8] shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[#F1F5F9] p-2.5 text-center bg-[#F8FAFC] rounded-b-xl">
                <Link
                  href="/audit-history"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  View Full Audit Log →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Identity Snippet */}
        <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-3">
          <div className="size-7 rounded-full bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
            LM
          </div>
          <span className="hidden sm:block text-xs font-medium text-[#0F172A]">Senior Inspector</span>
        </div>
      </div>
    </header>
  );
};
