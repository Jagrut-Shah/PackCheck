"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  Search,
  Check,
  Trash2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getCurrentUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/types/user";
import { supabase } from "@/lib/supabase";

interface HeaderProps {
  breadcrumbItems?: { label: string }[];
  onToggleMobileSidebar: () => void;
  activeTitle?: string;
  onOpenCommandPalette: () => void;
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

interface ApiNotification {
  id: string;
  inspection_id: string;
  product_type: string;
  status: string;
  violation_count: number;
  created_at: string;
}

// Helper to format time relative to now
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Helper to convert API notifications to UI format
function transformNotifications(apiNotifications: ApiNotification[]): NotificationItem[] {
  return apiNotifications.map((notif) => {
    let type: "CRITICAL" | "COMPLIANT" | "REVIEW" | "INFO" = "INFO";
    let title = "";
    let description = "";

    if (notif.violation_count > 0) {
      type = "CRITICAL";
      title = `Non-Compliance Detected`;
      description = `${notif.product_type} (${notif.inspection_id}) flagged with ${notif.violation_count} violation${notif.violation_count > 1 ? "s" : ""}.`;
    } else if (notif.status === "COMPLETED") {
      type = "COMPLIANT";
      title = `Inspection Verified (PASS)`;
      description = `${notif.product_type} (${notif.inspection_id}) passed all statutory compliance checks.`;
    } else if (notif.status === "MANUAL_REVIEW") {
      type = "REVIEW";
      title = `Manual Review Required`;
      description = `${notif.product_type} (${notif.inspection_id}) requires inspector confirmation.`;
    }

    return {
      id: notif.id,
      title,
      description,
      time: formatTimeAgo(notif.created_at),
      type,
      read: false, // Will be updated based on viewed_at
      href: `/inspections/${notif.id}/compliance`,
    };
  });
}

export const Header: React.FC<HeaderProps> = ({
  breadcrumbItems = [{ label: "Inspection Portal" }, { label: "Dashboard" }],
  onToggleMobileSidebar,
  activeTitle = "Dashboard Overview",
  onOpenCommandPalette,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load current user
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

  // Fetch notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setIsLoadingNotifications(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user ID:', user?.id);

        if (!user) {
          console.log('No authenticated user');
          setIsLoadingNotifications(false);
          return;
        }

        // Pass user ID as query param
        const response = await fetch(`/api/notifications?limit=20&user_id=${user.id}`);
        console.log('API Response status:', response.status);

        if (!response.ok) {
          console.error("Failed to fetch notifications");
          return;
        }

        const data = await response.json();
        console.log('API Response data:', data);

        if (data.success) {
          const transformed = transformNotifications(data.data.notifications);
          console.log('Transformed notifications:', transformed);
          setNotifications(transformed);
          setUnreadCount(data.data.unread_count);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setIsLoadingNotifications(false);
      }
    }

    fetchNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);


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


  // Clear all notifications (local only, no API call needed)
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Get notification icon by type
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

  // Mark all as read
const markAllAsRead = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const response = await fetch(`/api/notifications/read-all?user_id=${user.id}`, {
      method: "PATCH",
    });

    if (response.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  } catch (err) {
    console.error("Error marking all as read:", err);
  }
};

// Handle notification click
const handleNotificationClick = async (item: NotificationItem) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const response = await fetch(`/api/notifications/${item.id}/read?user_id=${user.id}`, {
      method: "PATCH",
    });

    if (response.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }

  if (item.href) {
    setIsOpen(false);
    router.push(item.href);
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
            className={`relative flex size-8 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${isOpen
                ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] shadow-xs"
                : "border-[#E2E8F0] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] hover:shadow-2xs"
              }`}
            aria-label={`View notifications (${unreadCount} unread)`}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white ring-2 ring-white shadow-xs animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
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
                {isLoadingNotifications ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-[#E2E8F0] border-t-[#1D4ED8]" />
                    <p className="text-xs font-medium text-[#475569] mt-2">
                      Loading notifications...
                    </p>
                  </div>
                ) : notifications.length === 0 ? (
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
                      className={`flex items-start gap-3 p-3 text-left transition-all duration-150 cursor-pointer hover:bg-[#F8FAFC] hover:pl-3.5 ${!item.read ? "bg-[#EFF6FF]/60" : ""
                        }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs ${!item.read
                                ? "font-bold text-[#0F172A]"
                                : "font-medium text-[#475569]"
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
        <Link
          href="/profile"
          className="flex items-center gap-2 border-l border-[#E2E8F0] pl-3 hover:opacity-90 transition-opacity"
          title={
            currentUser?.email
              ? `${currentUser.fullName} (${currentUser.email})`
              : "View Profile"
          }
        >
          <div className="size-7 rounded-full bg-linear-to-b from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
            {currentUser?.fullName
              ? currentUser.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
              : "LM"}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#0F172A] leading-tight">
              {currentUser?.fullName || "Senior Inspector"}
            </span>
            <span className="text-[10px] text-[#64748B] leading-tight">
              {currentUser?.role || currentUser?.email || "Legal Metrology"}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};
