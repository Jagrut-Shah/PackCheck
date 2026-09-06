"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  History,
  FileText,
  Settings,
  User,
  Scale,
  Building2,
  Package,
  CornerDownLeft,
} from "lucide-react";
import { getInspections } from "@/lib/api/inspections";
import { InspectionRecord } from "@/lib/types/inspection";
import { MOCK_COMPANIES } from "@/mocks/companies";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Actions" | "Inspections" | "Companies" | "Inspection Rules";
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

const INSPECTION_RULES = [
  {
    id: "rule-6-1-a",
    title: "Rule 6(1)(a) — Manufacturer / Packer Details",
    subtitle: "Complete address and contact particulars of manufacturer, packer, or importer.",
    href: "/analytics/rules",
    badge: "Mandatory",
  },
  {
    id: "rule-6-1-b",
    title: "Rule 6(1)(b) — Common / Generic Name",
    subtitle: "Generic name of pre-packaged commodity declared on Principal Display Panel.",
    href: "/analytics/rules",
    badge: "Mandatory",
  },
  {
    id: "rule-6-1-c",
    title: "Rule 6(1)(c) — Net Quantity & Tolerances",
    subtitle: "Standard units of weight, measure, or number under Schedule II.",
    href: "/analytics/rules",
    badge: "Critical",
  },
  {
    id: "rule-6-1-d",
    title: "Rule 6(1)(d) — Date of Manufacture / Packaging",
    subtitle: "Month and year of manufacture or pre-packing.",
    href: "/analytics/rules",
    badge: "Mandatory",
  },
  {
    id: "rule-6-1-e",
    title: "Rule 6(1)(e) — Maximum Retail Price & USP",
    subtitle: "Inclusive of all taxes; mandatory Unit Sale Price (USP) for items > 1kg/1L.",
    href: "/analytics/rules",
    badge: "High Violation",
  },
  {
    id: "rule-6-1-f",
    title: "Rule 6(1)(f) — Consumer Grievance Care Contact",
    subtitle: "Name, postal address, telephone number, and email of redressal officer.",
    href: "/analytics/rules",
    badge: "Mandatory",
  },
  {
    id: "rule-7",
    title: "Rule 7 & 8 — PDP Typography Minimum Height",
    subtitle: "Principal Display Panel letter and numeral height area ratio mandates.",
    href: "/analytics/rules",
    badge: "Table I/II",
  },
  {
    id: "rule-27",
    title: "Rule 27 — Manufacturer / Packer Registration",
    subtitle: "Official registration certificate with State or Central Controller.",
    href: "/analytics/rules",
    badge: "Registry",
  },
];

const QUICK_ACTIONS = [
  {
    id: "act-new-inspection",
    title: "Start New Inspection",
    subtitle: "Upload package photos and start compliance check",
    category: "Actions" as const,
    icon: <Plus className="size-4 text-[#1D4ED8]" />,
    href: "/inspections/new",
  },
  {
    id: "act-audit-history",
    title: "Cryptographic Audit Trail",
    subtitle: "Immutable SHA-256 chain of custody enforcement records",
    category: "Actions" as const,
    icon: <History className="size-4 text-[#1D4ED8]" />,
    href: "/audit-history",
  },
  {
    id: "act-reports",
    title: "Inspection Reports",
    subtitle: "Browse generated inspection reports and compliance records",
    category: "Actions" as const,
    icon: <FileText className="size-4 text-[#1D4ED8]" />,
    href: "/reports",
  },
  {
    id: "act-companies",
    title: "Pre-Packer & Manufacturer Registry",
    subtitle: "Search registered companies under Rule 27",
    category: "Actions" as const,
    icon: <Building2 className="size-4 text-[#1D4ED8]" />,
    href: "/companies",
  },
  {
    id: "act-profile",
    title: "Officer Profile",
    subtitle: "Department credentials, assigned jurisdiction, and enforcement authority",
    category: "Actions" as const,
    icon: <User className="size-4 text-[#1D4ED8]" />,
    href: "/profile",
  },
];

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [realInspections, setRealInspections] = useState<InspectionRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input and load real inspections when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      getInspections()
        .then((records) => setRealInspections(records))
        .catch((err) => console.warn("Failed to load inspections for command palette:", err));
    }
  }, [isOpen]);

  // Compute filtered items
  const filteredItems = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    // 1. Actions
    const matchedActions: CommandItem[] = QUICK_ACTIONS.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );

    // 2. Inspections (from real backend inspections)
    const matchedInspections: CommandItem[] = realInspections
      .filter(
        (ins) =>
          !q ||
          ins.inspectionNumber.toLowerCase().includes(q) ||
          (ins.product && ins.product.toLowerCase().includes(q)) ||
          (ins.company && ins.company.toLowerCase().includes(q)) ||
          (ins.commodity?.commodityName && ins.commodity.commodityName.toLowerCase().includes(q)) ||
          (ins.commodity?.brandName && ins.commodity.brandName.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map((ins) => ({
        id: `ins-${ins.id}`,
        title: `${ins.inspectionNumber} — ${ins.product || ins.commodity?.commodityName || "Package Sample"}`,
        subtitle: `${ins.company || ins.commodity?.manufacturerName || "Surveillance Item"} • ${ins.location || "Enforcement Inspection"}`,
        category: "Inspections",
        icon: <Package className="size-4 text-[#1D4ED8]" />,
        href: `/inspections/${ins.id}`,
        badge: ins.overallResult,
      }));

    // 3. Companies
    const matchedCompanies: CommandItem[] = MOCK_COMPANIES.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.registrationNumber.toLowerCase().includes(q)
    )
      .slice(0, 4)
      .map((c) => ({
        id: `comp-${c.id}`,
        title: c.name,
        subtitle: `${c.registrationNumber} • ${c.state}`,
        category: "Companies",
        icon: <Building2 className="size-4 text-[#1D4ED8]" />,
        href: `/companies/${c.id}`,
        badge: c.brand,
      }));

    // 4. Rules
    const matchedRules: CommandItem[] = INSPECTION_RULES.filter(
      (r) => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
    ).map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      category: "Inspection Rules",
      icon: <Scale className="size-4 text-[#1D4ED8]" />,
      href: r.href,
      badge: r.badge,
    }));

    return [...matchedActions, ...matchedInspections, ...matchedCompanies, ...matchedRules];
  }, [query]);

  // Adjust selection bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      const target = filteredItems[selectedIndex];
      onClose();
      router.push(target.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      const activeEl = list.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#0F172A]/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8F0] bg-white">
          <Search className="size-5 text-[#94A3B8] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search inspections, rules, companies, or actions..."
            className="flex-1 text-sm bg-transparent outline-none text-[#0F172A] placeholder:text-[#94A3B8]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-[#94A3B8] hover:text-[#0F172A] px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-[#F1F5F9]"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#475569]">
              <Search className="size-6 text-[#94A3B8] mx-auto mb-2 opacity-50" />
              No results found for &ldquo;<span className="font-semibold text-[#0F172A]">{query}</span>&rdquo;.
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Try searching for &quot;Rule 6&quot;, &quot;Ghee&quot;, or &quot;Amul&quot;.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => {
                    onClose();
                    router.push(item.href);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-100 ${
                    isSelected
                      ? "bg-[#EFF6FF] border-l-4 border-[#1D4ED8] text-[#0F172A] pl-3"
                      : "hover:bg-[#F8FAFC] text-[#0F172A]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-white text-[#1D4ED8] shadow-xs"
                          : "bg-[#F1F5F9] text-[#475569]"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-[#0F172A]">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              item.badge === "PASS"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : item.badge === "FAIL" || item.badge === "POTENTIAL_NON_COMPLIANCE"
                                ? "bg-[#FEE2E2] text-[#B91C1C]"
                                : "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-[#475569] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[#1D4ED8] shrink-0 ml-2">
                      <span>Jump</span>
                      <CornerDownLeft className="size-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-white border border-[#CBD5E1] px-1 rounded text-[10px]">↑</kbd>
              <kbd className="font-mono bg-white border border-[#CBD5E1] px-1 rounded text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-white border border-[#CBD5E1] px-1 rounded text-[10px]">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="text-[10px] text-[#94A3B8]">
            PackCheck AI Quick-Navigator
          </span>
        </div>
      </div>
    </div>
  );
}
