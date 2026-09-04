"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
  ArrowRight,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface StatutoryRuleMetric {
  ruleId: string;
  ruleNumber: string;
  title: string;
  category: string;
  totalEvaluated: number;
  passedCount: number;
  failedCount: number;
  complianceRate: number;
  criticality: "CRITICAL" | "HIGH" | "STANDARD";
  penaltySection: string;
}

const STATUTORY_RULES_METRICS: StatutoryRuleMetric[] = [
  {
    ruleId: "rule_6_1_e",
    ruleNumber: "Rule 6(1)(e)",
    title: "Unit Sale Price (USP) & MRP Declaration (Incl. of All Taxes)",
    category: "PRICING_MANDATES",
    totalEvaluated: 148,
    passedCount: 92,
    failedCount: 56,
    complianceRate: 62.2,
    criticality: "CRITICAL",
    penaltySection: "Section 36(1) LM Act, 2009",
  },
  {
    ruleId: "rule_6_1_a",
    ruleNumber: "Rule 6(1)(a)",
    title: "Manufacturer / Pre-Packer / Importer Identity & Complete Address with PIN",
    category: "MANDATORY_DECLARATIONS",
    totalEvaluated: 148,
    passedCount: 114,
    failedCount: 34,
    complianceRate: 77.0,
    criticality: "CRITICAL",
    penaltySection: "Rule 32(1) PCR, 2011",
  },
  {
    ruleId: "rule_6_1_c",
    ruleNumber: "Rule 6(1)(c)",
    title: "Consumer Care Details (Official Helpline, Name & Postal/Email Address)",
    category: "CONSUMER_PROTECTION",
    totalEvaluated: 148,
    passedCount: 122,
    failedCount: 26,
    complianceRate: 82.4,
    criticality: "HIGH",
    penaltySection: "Rule 32(1) PCR, 2011",
  },
  {
    ruleId: "rule_6_1_d",
    ruleNumber: "Rule 6(1)(d)",
    title: "Net Quantity Declarations in Standard Units (Metric System Schedule II)",
    category: "QUANTITY_VERIFICATION",
    totalEvaluated: 148,
    passedCount: 135,
    failedCount: 13,
    complianceRate: 91.2,
    criticality: "CRITICAL",
    penaltySection: "Section 30 LM Act, 2009",
  },
  {
    ruleId: "rule_6_1_f",
    ruleNumber: "Rule 6(1)(f)",
    title: "Month and Year of Manufacture / Packing / Import Format (MM/YYYY)",
    category: "MANDATORY_DECLARATIONS",
    totalEvaluated: 148,
    passedCount: 138,
    failedCount: 10,
    complianceRate: 93.2,
    criticality: "HIGH",
    penaltySection: "Rule 32(1) PCR, 2011",
  },
  {
    ruleId: "rule_6_1_b",
    ruleNumber: "Rule 6(1)(b)",
    title: "Generic or Common Commodity Name on Principal Display Panel",
    category: "MANDATORY_DECLARATIONS",
    totalEvaluated: 148,
    passedCount: 144,
    failedCount: 4,
    complianceRate: 97.3,
    criticality: "STANDARD",
    penaltySection: "Rule 6(1)(b) PCR, 2011",
  },
  {
    ruleId: "rule_6_1_g",
    ruleNumber: "Rule 6(1)(g)",
    title: "Country of Origin for Imported Pre-Packaged Goods",
    category: "MANDATORY_DECLARATIONS",
    totalEvaluated: 62,
    passedCount: 57,
    failedCount: 5,
    complianceRate: 91.9,
    criticality: "CRITICAL",
    penaltySection: "Customs & Rule 6(1)(g)",
  },
  {
    ruleId: "rule_7_numeral_size",
    ruleNumber: "Rule 7 & 8",
    title: "Minimum Height of Numerals & Letters on Principal Display Panel",
    category: "PDP_DIMENSIONS",
    totalEvaluated: 148,
    passedCount: 129,
    failedCount: 19,
    complianceRate: 87.2,
    criticality: "HIGH",
    penaltySection: "Rule 7 Table I & II",
  },
  {
    ruleId: "rule_27_registration",
    ruleNumber: "Rule 27",
    title: "Packer Registration Number Verification with Central / State Registry",
    category: "REGULATORY_COMPLIANCE",
    totalEvaluated: 148,
    passedCount: 132,
    failedCount: 16,
    complianceRate: 89.2,
    criticality: "CRITICAL",
    penaltySection: "Rule 27(1) Penalty",
  },
];

export default function RuleAnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const filteredRules = STATUTORY_RULES_METRICS.filter((rule) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      rule.ruleNumber.toLowerCase().includes(q) ||
      rule.title.toLowerCase().includes(q) ||
      rule.category.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "ALL" || rule.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const totalEvaluated = STATUTORY_RULES_METRICS.reduce((acc, r) => acc + r.totalEvaluated, 0);
  const totalPassed = STATUTORY_RULES_METRICS.reduce((acc, r) => acc + r.passedCount, 0);
  const overallRate = ((totalPassed / totalEvaluated) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Legal Metrology Rule Analytics"
        description="Enforcement intelligence, statutory compliance rates, and non-compliance distribution under Legal Metrology (Packaged Commodities) Rules, 2011."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileSpreadsheet className="size-3.5" />}
              >
                Verification Reports
              </Button>
            </Link>
            <Link href="/inspections/new">
              <Button variant="primary" size="sm" leftIcon={<ShieldCheck className="size-3.5" />}>
                New Inspection
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569]">Monitored Rules</p>
              <h3 className="text-2xl font-bold text-[#0F172A] mt-1">17</h3>
              <p className="text-[11px] text-[#1D4ED8] font-medium mt-1">
                PCR 2011 (As Amended)
              </p>
            </div>
            <div className="size-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
              <Scale className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569]">Overall Compliance</p>
              <h3 className="text-2xl font-bold text-[#15803D] mt-1">{overallRate}%</h3>
              <p className="text-[11px] text-[#475569] mt-1">1,118 checks passed</p>
            </div>
            <div className="size-10 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569]">Non-Compliances Flagged</p>
              <h3 className="text-2xl font-bold text-[#DC2626] mt-1">178</h3>
              <p className="text-[11px] text-[#DC2626] font-medium mt-1">
                Notice generation pending
              </p>
            </div>
            <div className="size-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569]">Top Violation Area</p>
              <h3 className="text-base font-bold text-[#0F172A] mt-1 truncate max-w-35">
                Unit Sale Price
              </h3>
              <p className="text-[11px] text-[#DC2626] font-medium mt-1">
                37.8% failure rate
              </p>
            </div>
            <div className="size-10 rounded-lg bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center">
              <BarChart3 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statutory Guidance Alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-xs">
        <Info className="size-4 text-[#1D4ED8] shrink-0 mt-0.5" />
        <div className="text-[#0F172A] leading-relaxed">
          <span className="font-semibold text-[#1D4ED8]">Enforcement Advisory: </span>
          The Legal Metrology (Packaged Commodities) Amendment Rules, 2022 mandate clear declaration of 
          <strong> Unit Sale Price (USP)</strong> on all pre-packaged commodities exceeding 1 kg or 1 liter.
          Surveillance data indicates this continues to represent the highest frequency of statutory violation.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Search rules, sections or requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs bg-[#F8FAFC] border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-[#475569]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
          >
            <option value="ALL">All Rule Categories</option>
            <option value="PRICING_MANDATES">Pricing Mandates (Rule 6(1)(e))</option>
            <option value="MANDATORY_DECLARATIONS">Mandatory Declarations</option>
            <option value="CONSUMER_PROTECTION">Consumer Protection (Rule 6(1)(c))</option>
            <option value="QUANTITY_VERIFICATION">Quantity Verification (Schedule II)</option>
            <option value="PDP_DIMENSIONS">PDP Dimensions (Rule 7 & 8)</option>
            <option value="REGULATORY_COMPLIANCE">Registration (Rule 27)</option>
          </select>
        </div>
      </div>

      {/* Statutory Rules Performance Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC] text-xs border-b border-[#E2E8F0]">
              <TableHead className="font-semibold text-[#475569]">Statutory Rule</TableHead>
              <TableHead className="font-semibold text-[#475569]">Requirement Description</TableHead>
              <TableHead className="font-semibold text-[#475569]">Criticality</TableHead>
              <TableHead className="font-semibold text-[#475569] text-center">Evaluated</TableHead>
              <TableHead className="font-semibold text-[#475569] text-center">Passed</TableHead>
              <TableHead className="font-semibold text-[#475569] text-center">Failed</TableHead>
              <TableHead className="font-semibold text-[#475569]">Compliance Rate</TableHead>
              <TableHead className="font-semibold text-[#475569]">Statutory Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map((rule) => (
              <TableRow key={rule.ruleId} className="text-xs hover:bg-[#F1F5F9]/60 transition-colors border-b border-[#E2E8F0]">
                <TableCell className="font-mono font-bold text-[#1D4ED8] whitespace-nowrap">
                  {rule.ruleNumber}
                </TableCell>
                <TableCell className="max-w-xs font-medium text-[#0F172A]">
                  {rule.title}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      rule.criticality === "CRITICAL"
                        ? "fail"
                        : rule.criticality === "HIGH"
                        ? "review"
                        : "neutral"
                    }
                  >
                    {rule.criticality}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-semibold text-[#0F172A]">
                  {rule.totalEvaluated}
                </TableCell>
                <TableCell className="text-center text-[#15803D] font-semibold">
                  {rule.passedCount}
                </TableCell>
                <TableCell className="text-center text-[#DC2626] font-semibold">
                  {rule.failedCount}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-25">
                    <div className="flex-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
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
                <TableCell className="text-[#475569] font-mono text-[11px] whitespace-nowrap">
                  {rule.penaltySection}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
