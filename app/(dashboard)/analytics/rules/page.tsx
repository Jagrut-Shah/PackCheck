"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  Package,
  Eye,
  ExternalLink,
  Building2,
  Calendar,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { UserProfile } from "@/lib/types/user";
import {
  getRuleAnalytics,
  RulePerformanceItem,
  RuleAnalyticsResponseData,
} from "@/lib/api/analytics";

// Plain English mapping for all standard packaging checks
const FRIENDLY_RULE_GUIDE: Record<
  string,
  {
    shortTitle: string;
    simpleDescription: string;
    simpleCategory: string;
    whatIsRequired: string;
  }
> = {
  rule_6_1_a: {
    shortTitle: "Manufacturer & Packer Address",
    simpleDescription: "Full company name and complete postal address with PIN code.",
    simpleCategory: "Label Details",
    whatIsRequired:
      "Packages must clearly state the full business name and complete postal address (including PIN code) of the manufacturer, packer, or importer so consumers and officers can contact them.",
  },
  rule_6_1_b: {
    shortTitle: "Commodity Name",
    simpleDescription: "Common or generic product name on front display.",
    simpleCategory: "Label Details",
    whatIsRequired:
      "The common or generic name of what is inside the package must be prominently displayed on the front panel so buyers know what they are purchasing.",
  },
  rule_6_1_c: {
    shortTitle: "Net Quantity & Weight",
    simpleDescription: "Weight, volume, or count in standard units (g, kg, ml, L).",
    simpleCategory: "Weight & Quantity",
    whatIsRequired:
      "Net content must be declared using standard metric units (g, kg, ml, L, or piece count) with correct letter sizing and no confusing symbols.",
  },
  rule_6_1_d: {
    shortTitle: "Packaging or Expiry Date",
    simpleDescription: "Month and year of manufacture, packing, or 'Best Before'.",
    simpleCategory: "Dates & Freshness",
    whatIsRequired:
      "Every product must clearly declare the month and year it was manufactured/packaged (MM/YYYY) or provide a clear 'Best Before / Use By' date.",
  },
  rule_6_1_e: {
    shortTitle: "MRP & Taxes",
    simpleDescription: "Maximum Retail Price in ₹ with 'Inclusive of all taxes'.",
    simpleCategory: "Pricing & MRP",
    whatIsRequired:
      "The Maximum Retail Price (MRP) must be clearly printed in Indian Rupees (₹) and must explicitly include the words 'Inclusive of all taxes'.",
  },
  rule_6_1_f: {
    shortTitle: "Customer Care Contacts",
    simpleDescription: "Phone number, email, and address for customer complaints.",
    simpleCategory: "Customer Support",
    whatIsRequired:
      "The package must provide working contact details (phone helpline, email, and address) of the person or department handling customer grievances.",
  },
  rule_6_1_g: {
    shortTitle: "Country of Origin",
    simpleDescription: "Country where the product was manufactured or packed.",
    simpleCategory: "Origin & Import",
    whatIsRequired:
      "Must state clearly where the product was made or imported from, giving consumers transparency on product source.",
  },
  rule_6_1_l: {
    shortTitle: "Unit Sale Price (per g/ml)",
    simpleDescription: "Price per unit (₹/g, ₹/kg, ₹/ml) for easy price comparison.",
    simpleCategory: "Pricing & MRP",
    whatIsRequired:
      "Products over 1kg or 1L must display the cost per unit (e.g. ₹ per gram or ₹ per ml) so shoppers can easily compare value across package sizes.",
  },
  rule_7: {
    shortTitle: "Font Size & Readability",
    simpleDescription: "Text and numbers meet minimum readable letter height.",
    simpleCategory: "Display & Font",
    whatIsRequired:
      "All required information must be printed in a readable font size that meets the minimum statutory height based on the package size.",
  },
  rule_27: {
    shortTitle: "Packer Registration Certificate",
    simpleDescription: "Active registration with the Legal Metrology Department.",
    simpleCategory: "Registration",
    whatIsRequired:
      "Every commercial pre-packer must be registered with the Legal Metrology Controller under Rule 27 within 90 days of starting operations.",
  },
};

function getFriendlyRule(rule: RulePerformanceItem) {
  const custom = FRIENDLY_RULE_GUIDE[rule.ruleId];
  if (custom) return custom;

  return {
    shortTitle: rule.title.replace(/Declaration|Mandate|Verification/gi, "").trim() || rule.title,
    simpleDescription: rule.requirementDescription,
    simpleCategory: "Standard Check",
    whatIsRequired: rule.requirementDescription,
  };
}

export default function RuleAnalyticsPage() {
  const [data, setData] = useState<RuleAnalyticsResponseData | null>(null);
  const [officer, setOfficer] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeTab, setOutcomeTab] = useState<"ALL" | "ISSUES" | "PASSED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedRule, setSelectedRule] = useState<RulePerformanceItem | null>(null);

  async function loadData() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [analyticsRes, userProfile] = await Promise.all([
        getRuleAnalytics(),
        getCurrentUser().catch(() => null),
      ]);
      setData(analyticsRes);
      if (userProfile) setOfficer(userProfile);
    } catch (err) {
      console.error("Failed to load rule analytics:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load inspection analytics from database."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Rules List
  const filteredRules = useMemo(() => {
    if (!data?.rules) return [];

    return data.rules.filter((rule) => {
      const friendly = getFriendlyRule(rule);
      const q = searchQuery.toLowerCase().trim();

      const matchesQuery =
        !q ||
        rule.ruleNumber.toLowerCase().includes(q) ||
        friendly.shortTitle.toLowerCase().includes(q) ||
        friendly.simpleDescription.toLowerCase().includes(q) ||
        friendly.simpleCategory.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "ALL" || friendly.simpleCategory === categoryFilter;

      let matchesTab = true;
      if (outcomeTab === "ISSUES") {
        matchesTab = rule.failedCount > 0;
      } else if (outcomeTab === "PASSED") {
        matchesTab = rule.failedCount === 0;
      }

      return matchesQuery && matchesCategory && matchesTab;
    });
  }, [data?.rules, searchQuery, categoryFilter, outcomeTab]);

  const overview = data?.overview;

  const rulesWithIssues = useMemo(() => {
    return (data?.rules || []).filter((r) => r.failedCount > 0);
  }, [data?.rules]);

  // Categories list for filter dropdown
  const availableCategories = useMemo(() => {
    if (!data?.rules) return [];
    const set = new Set<string>();
    data.rules.forEach((r) => set.add(getFriendlyRule(r).simpleCategory));
    return Array.from(set);
  }, [data?.rules]);

  const officerName = officer?.fullName || "Jagrut Shah";
  const officerZone = officer?.jurisdictionDistrict?.split("—")[0]?.trim() || "Delhi Zone";

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              Inspection Rules & Insights
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
              <User className="size-3" />
              Inspector: {officerName}
            </span>
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Real inspection results and common packaging issues found across your audits in {officerZone}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />}
            onClick={loadData}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Link href="/inspections/new">
            <Button variant="primary" size="sm" leftIcon={<ShieldCheck className="size-3.5" />}>
              New Inspection
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-[#E2E8F0] p-4 bg-white">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && !isLoading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Content */}
      {data && overview && (
        <>
          {/* Statutory Scope Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-xs">
            <div className="flex items-center gap-2.5">
              <div className="size-2 rounded-full bg-[#2563EB]" />
              <span className="text-[#1E3A8A]">
                <strong>Legal Metrology Statutory Checklist:</strong> Covers <strong>{data.rules.length} active statutory package declarations</strong> evaluated under the Legal Metrology (Packaged Commodities) Rules, 2011.
              </span>
            </div>
            <span className="text-[11px] text-[#1D4ED8] font-semibold hidden sm:inline">
              PCR 2011 Mandatory Standard
            </span>
          </div>

          {/* 4 Simple Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Audits */}
            <Card className="border-[#E2E8F0] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#475569] font-medium">Total Audits Conducted</p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                    {overview.totalInspections}
                  </h3>
                  <p className="text-[11px] text-[#2563EB] font-medium mt-1">
                    Across {overview.uniqueProductsCount ?? 0} unique commodities
                  </p>
                </div>
                <div className="size-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Package className="size-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Overall Pass Rate */}
            <Card className="border-[#E2E8F0] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#475569] font-medium">Overall Pass Rate</p>
                  <h3
                    className={`text-2xl font-bold mt-1 ${
                      overview.complianceRate >= 85
                        ? "text-[#15803D]"
                        : overview.complianceRate >= 70
                        ? "text-[#D97706]"
                        : "text-[#DC2626]"
                    }`}
                  >
                    {overview.complianceRate}%
                  </h3>
                  <p className="text-[11px] text-[#475569] mt-1">
                    {overview.compliantCount} of {overview.evaluatedInspections} audits passed
                  </p>
                </div>
                <div className="size-10 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                  <CheckCircle2 className="size-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Audits with Issues */}
            <Card className="border-[#E2E8F0] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#475569] font-medium">Audits with Issues</p>
                  <h3 className="text-2xl font-bold text-[#DC2626] mt-1">
                    {overview.nonCompliantCount}
                  </h3>
                  <p className="text-[11px] text-[#DC2626] font-medium mt-1">
                    {overview.totalFindingsCount} labeling issues spotted
                  </p>
                </div>
                <div className="size-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center">
                  <AlertTriangle className="size-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Most Common Issue */}
            <Card className="border-[#E2E8F0] bg-white shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs text-[#475569] font-medium">Top Issue Spotted</p>
                  <h3 className="text-sm font-bold text-[#0F172A] mt-1 truncate">
                    {overview.topViolationArea
                      ? FRIENDLY_RULE_GUIDE[overview.topViolationArea.ruleId]?.shortTitle ||
                        overview.topViolationArea.ruleNumber
                      : "None"}
                  </h3>
                  <p className="text-[11px] text-[#DC2626] font-medium mt-1 truncate">
                    {overview.topViolationArea
                      ? `${overview.topViolationArea.failedCount} audit${
                          overview.topViolationArea.failedCount !== 1 ? "s" : ""
                        } flagged`
                      : "Zero issues recorded"}
                  </p>
                </div>
                <div className="size-10 rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <TrendingUp className="size-5 text-[#475569]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Two Clean Highlight Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Card: Most Common Issues Spotted */}
            <Card className="lg:col-span-2 border-[#E2E8F0] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#0F172A]">
                      Most Common Labeling Issues
                    </CardTitle>
                    <CardDescription className="text-xs text-[#475569] mt-0.5">
                      Checks where products failed to meet packaging requirements
                    </CardDescription>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
                    {rulesWithIssues.length} Check{rulesWithIssues.length !== 1 ? "s" : ""} Flagged
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {rulesWithIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="size-10 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-2">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <p className="text-xs font-bold text-[#0F172A]">All Checks Clean</p>
                    <p className="text-[11px] text-[#475569] mt-1 max-w-sm">
                      None of the inspected products have any recorded issues.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rulesWithIssues.map((rule) => {
                      const friendly = getFriendlyRule(rule);
                      return (
                        <div
                          key={rule.ruleId}
                          className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors cursor-pointer"
                          onClick={() => setSelectedRule(rule)}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-[#1D4ED8] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                                {rule.ruleNumber}
                              </span>
                              <span className="font-semibold text-[#0F172A]">
                                {friendly.shortTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#DC2626] font-semibold text-xs">
                                {rule.failedCount} product{rule.failedCount !== 1 ? "s" : ""} failed
                              </span>
                              <span className="text-[11px] text-[#64748B]">
                                ({rule.complianceRate}% passed)
                              </span>
                            </div>
                          </div>

                          {/* Clean Visual Bar */}
                          <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden flex">
                            <div
                              className="bg-[#15803D] h-full"
                              style={{ width: `${rule.complianceRate}%` }}
                              title={`Passed: ${rule.passedCount}`}
                            />
                            <div
                              className="bg-[#DC2626] h-full"
                              style={{ width: `${rule.failureRate}%` }}
                              title={`Failed: ${rule.failedCount}`}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#475569] mt-1.5">
                            <span>{friendly.simpleDescription}</span>
                            <span className="text-[#1D4ED8] font-medium hover:underline flex items-center gap-1 shrink-0">
                              View {rule.recentFindings.length} issue
                              {rule.recentFindings.length !== 1 ? "s" : ""} <Eye className="size-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Card: Inspection Outcomes Summary */}
            <Card className="border-[#E2E8F0] bg-white shadow-2xs flex flex-col">
              <CardHeader className="pb-3 border-b border-[#F1F5F9]">
                <CardTitle className="text-sm font-bold text-[#0F172A]">
                  Inspection Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-[#475569] mt-0.5">
                  Summary of your {overview.totalInspections} inspected products
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                {/* Visual Proportion Bar */}
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-[#F1F5F9] overflow-hidden flex border border-[#E2E8F0]">
                    {overview.compliantCount > 0 && (
                      <div
                        className="bg-[#15803D] h-full"
                        style={{
                          width: `${(overview.compliantCount / overview.totalInspections) * 100}%`,
                        }}
                        title={`Passed: ${overview.compliantCount}`}
                      />
                    )}
                    {overview.nonCompliantCount > 0 && (
                      <div
                        className="bg-[#DC2626] h-full"
                        style={{
                          width: `${(overview.nonCompliantCount / overview.totalInspections) * 100}%`,
                        }}
                        title={`Has Issues: ${overview.nonCompliantCount}`}
                      />
                    )}
                    {overview.pendingReviewCount > 0 && (
                      <div
                        className="bg-[#94A3B8] h-full"
                        style={{
                          width: `${(overview.pendingReviewCount / overview.totalInspections) * 100}%`,
                        }}
                        title={`Pending: ${overview.pendingReviewCount}`}
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[#475569] text-center">
                    {overview.evaluatedInspections} of {overview.totalInspections} inspections completed
                  </p>
                </div>

                {/* Friendly Breakdown List */}
                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#15803D]" />
                      <span className="font-semibold text-[#166534]">Passed All Checks</span>
                    </div>
                    <span className="font-bold text-[#166534]">
                      {overview.compliantCount} product
                      {overview.compliantCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-[#DC2626]" />
                      <span className="font-semibold text-[#991B1B]">Has Labeling Issues</span>
                    </div>
                    <span className="font-bold text-[#991B1B]">
                      {overview.nonCompliantCount} product
                      {overview.nonCompliantCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-3.5 rounded-full bg-[#94A3B8]" />
                      <span className="font-semibold text-[#475569]">Under Review</span>
                    </div>
                    <span className="font-bold text-[#475569]">
                      {overview.pendingReviewCount} product
                      {overview.pendingReviewCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-center">
                  <span className="text-[11px] text-[#64748B]">
                    Inspected under Legal Metrology Rules, 2011
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search, Tabs, and Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
              <Input
                placeholder="Search check (e.g. MRP, weight, date)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white"
              />
            </div>

            {/* Friendly Tabs & Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tabs */}
              <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                <button
                  type="button"
                  onClick={() => setOutcomeTab("ALL")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    outcomeTab === "ALL"
                      ? "bg-white text-[#0F172A] shadow-2xs font-semibold"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  All Checks ({data.rules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeTab("ISSUES")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    outcomeTab === "ISSUES"
                      ? "bg-white text-[#DC2626] shadow-2xs font-semibold"
                      : "text-[#64748B] hover:text-[#DC2626]"
                  }`}
                >
                  Has Issues ({rulesWithIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeTab("PASSED")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    outcomeTab === "PASSED"
                      ? "bg-white text-[#15803D] shadow-2xs font-semibold"
                      : "text-[#64748B] hover:text-[#15803D]"
                  }`}
                >
                  100% Passed ({data.rules.length - rulesWithIssues.length})
                </button>
              </div>

              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                <option value="ALL">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Friendly Rules Checklist Table */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
            {filteredRules.length === 0 ? (
              <EmptyState
                title="No Checks Found"
                description="No rule checks match your current filter. Try resetting your search or filters."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("ALL");
                      setOutcomeTab("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC] text-xs border-b border-[#E2E8F0]">
                    <TableHead className="font-semibold text-[#475569]">CHECK / RULE</TableHead>
                    <TableHead className="font-semibold text-[#475569]">WHAT IT CHECKS</TableHead>
                    <TableHead className="font-semibold text-[#475569]">CATEGORY</TableHead>
                    <TableHead className="font-semibold text-[#475569] text-center">CHECKED</TableHead>
                    <TableHead className="font-semibold text-[#475569] text-center">PASSED</TableHead>
                    <TableHead className="font-semibold text-[#475569] text-center">ISSUES</TableHead>
                    <TableHead className="font-semibold text-[#475569]">PASS RATE</TableHead>
                    <TableHead className="font-semibold text-[#475569] text-right">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => {
                    const friendly = getFriendlyRule(rule);
                    return (
                      <TableRow
                        key={rule.ruleId}
                        className="text-xs hover:bg-[#F1F5F9] transition-colors border-b border-[#E2E8F0] cursor-pointer"
                        onClick={() => setSelectedRule(rule)}
                      >
                        {/* Check / Rule Name */}
                        <TableCell className="font-medium text-[#0F172A] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#1D4ED8] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                              {rule.ruleNumber}
                            </span>
                            <span className="font-semibold">{friendly.shortTitle}</span>
                          </div>
                        </TableCell>

                        {/* What It Checks */}
                        <TableCell className="max-w-xs text-[#475569] truncate">
                          {friendly.simpleDescription}
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                            {friendly.simpleCategory}
                          </span>
                        </TableCell>

                        {/* Total Checked */}
                        <TableCell className="text-center font-semibold text-[#0F172A]">
                          {rule.totalEvaluated}
                        </TableCell>

                        {/* Passed */}
                        <TableCell className="text-center text-[#15803D] font-semibold">
                          {rule.passedCount}
                        </TableCell>

                        {/* Issues Found */}
                        <TableCell className="text-center font-semibold">
                          {rule.failedCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
                              {rule.failedCount}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">0</span>
                          )}
                        </TableCell>

                        {/* Pass Rate Progress Bar */}
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-28">
                            <div className="flex-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  rule.complianceRate >= 90
                                    ? "bg-[#15803D]"
                                    : rule.complianceRate >= 75
                                    ? "bg-[#D97706]"
                                    : "bg-[#DC2626]"
                                }`}
                                style={{ width: `${rule.complianceRate}%` }}
                              />
                            </div>
                            <span className="font-semibold text-[#0F172A] w-10 text-right">
                              {rule.complianceRate}%
                            </span>
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Eye className="size-3" />}
                            onClick={() => setSelectedRule(rule)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Simple, Friendly Rule Detail Popup */}
          {selectedRule && (
            <Dialog
              isOpen={!!selectedRule}
              onClose={() => setSelectedRule(null)}
              title={`${selectedRule.ruleNumber}: ${getFriendlyRule(selectedRule).shortTitle}`}
              description={getFriendlyRule(selectedRule).simpleCategory}
              size="lg"
              footer={
                <div className="flex items-center justify-end w-full">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedRule(null)}>
                    Close
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                {/* 4 Stat Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <p className="text-[11px] text-[#475569]">Products Checked</p>
                    <p className="text-lg font-bold text-[#0F172A] mt-0.5">
                      {selectedRule.totalEvaluated}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7]">
                    <p className="text-[11px] text-[#166534]">Passed</p>
                    <p className="text-lg font-bold text-[#166534] mt-0.5">
                      {selectedRule.passedCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FEE2E2]">
                    <p className="text-[11px] text-[#991B1B]">Products with Issues</p>
                    <p className="text-lg font-bold text-[#991B1B] mt-0.5">
                      {selectedRule.failedCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                    <p className="text-[11px] text-[#1D4ED8]">Pass Rate</p>
                    <p className="text-lg font-bold text-[#1D4ED8] mt-0.5">
                      {selectedRule.complianceRate}%
                    </p>
                  </div>
                </div>

                {/* What's Required Box */}
                <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                  <h4 className="text-xs font-bold text-[#0F172A]">What is required on the package</h4>
                  <p className="text-xs text-[#334155] leading-relaxed">
                    {getFriendlyRule(selectedRule).whatIsRequired}
                  </p>
                  <p className="text-[11px] text-[#64748B] pt-1">
                    Statutory basis: {selectedRule.statutoryReference}
                  </p>
                </div>

                {/* Products Where Issues Were Found */}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] mb-2">
                    Products with Issues ({selectedRule.recentFindings.length})
                  </h4>

                  {selectedRule.recentFindings.length === 0 ? (
                    <div className="p-5 text-center rounded-xl border border-dashed border-[#86EFAC] bg-[#F0FDF4]">
                      <CheckCircle2 className="size-7 text-[#15803D] mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-[#166534]">100% Clean</p>
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        Every product inspected by you met this requirement without issues.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedRule.recentFindings.map((finding) => (
                        <div
                          key={finding.id}
                          className="p-3 rounded-lg border border-[#FEE2E2] bg-white hover:border-[#FCA5A5] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/inspections/${finding.inspectionId}`}
                                className="font-mono text-xs font-bold text-[#1D4ED8] hover:underline flex items-center gap-1"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {finding.inspectionNumber}
                                <ExternalLink className="size-3" />
                              </Link>
                              <span className="text-[#CBD5E1]">·</span>
                              <span className="text-xs font-semibold text-[#0F172A]">
                                {finding.productType}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-[#DC2626] border border-red-200">
                              Issue Found
                            </span>
                          </div>

                          <p className="text-xs text-[#991B1B] font-medium mt-1">
                            {finding.message}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#F8FAFC] text-[10px] text-[#64748B]">
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <Building2 className="size-3" />
                              {finding.packerName || "Unknown Manufacturer"}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar className="size-3" />
                              {finding.createdAt
                                ? new Date(finding.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Recent"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}
