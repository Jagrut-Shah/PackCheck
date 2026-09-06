"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  AlertTriangle,
  Shield,
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MapPin,
  Calendar,
  History,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/status-badge";
import { getCompanyDetail, CompanyDetailData } from "@/lib/api/companies";

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const resolvedParams = use(params);
  const companyId = resolvedParams.id;

  const [detailData, setDetailData] = useState<CompanyDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inspections");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await getCompanyDetail(companyId);
        setDetailData(data);
      } catch (err) {
        console.error("Error loading company details:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
        <div className="size-8 rounded-full border-2 border-[#1D4ED8] border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-[#475569]">Loading registered packer profile and audit records...</p>
      </div>
    );
  }

  if (!detailData || !detailData.packer) {
    return (
      <div className="flex flex-col items-center justify-center p-16 max-w-md mx-auto text-center gap-4 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="size-12 rounded-full bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#0F172A]">Packer Not Found</h2>
          <p className="text-xs text-[#64748B] mt-1">
            The requested packer profile could not be found or has not been registered under Rule 27.
          </p>
        </div>
        <Link href="/companies">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />}>
            Back to Registered Packers
          </Button>
        </Link>
      </div>
    );
  }

  const { packer, inspections, findings, auditLogs } = detailData;
  const pendingCount =
    packer.pendingAudits ??
    Math.max(0, packer.totalAudits - packer.passedAudits - packer.flaggedAudits);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Navigation & Header Actions */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/companies">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />}>
            All Registered Packers
          </Button>
        </Link>
        <span className="text-[11px] font-mono text-[#64748B]">
          ID: {packer.id.substring(0, 13)}...
        </span>
      </div>

      {/* Hero Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="flex items-start sm:items-center gap-4">
          <div className="size-14 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-[#DBEAFE]">
            <Building2 className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{packer.name}</h1>
              <Badge
                variant={
                  packer.status === "ACTIVE"
                    ? "pass"
                    : packer.status === "SUSPENDED"
                    ? "fail"
                    : "review"
                }
              >
                {packer.status === "ACTIVE"
                  ? "Active License"
                  : packer.status === "SUSPENDED"
                  ? "License Suspended"
                  : "Under Investigation"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#475569] mt-1.5 flex-wrap">
              {packer.brand && (
                <span>
                  Brand: <strong className="text-[#1D4ED8] font-bold">{packer.brand}</strong>
                </span>
              )}
              <span className="text-[#CBD5E1]">•</span>
              <span>
                Rule 27 Reg: <span className="font-mono font-semibold text-[#0F172A]">{packer.registrationNumber}</span>
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="flex items-center gap-1 text-[#64748B]">
                <MapPin className="size-3 text-[#94A3B8]" />
                {packer.district}, {packer.state}
              </span>
            </div>
          </div>
        </div>

        {/* Right Metric Pillar */}
        <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-[#F1F5F9] pt-4 lg:pt-0 lg:pl-6 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#64748B]">
              Compliance Rating
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              {packer.totalAudits > 0 ? (
                <>
                  <span
                    className={`text-2xl font-extrabold ${
                      packer.complianceRate >= 80
                        ? "text-[#166534]"
                        : packer.complianceRate >= 50
                        ? "text-[#B45309]"
                        : "text-[#991B1B]"
                    }`}
                  >
                    {packer.complianceRate}%
                  </span>
                  <span className="text-[11px] text-[#64748B] font-medium">rate</span>
                </>
              ) : (
                <span className="text-xl font-bold text-[#94A3B8]">N/A</span>
              )}
            </div>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              {packer.totalAudits > 0
                ? `Based on ${packer.totalAudits} ${packer.totalAudits === 1 ? "audit" : "audits"}`
                : "No inspections yet"}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                Total Audits
              </p>
              <p className="text-2xl font-bold text-[#0F172A] mt-1">{packer.totalAudits}</p>
              <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                {packer.totalAudits === 0 ? "No inspections" : "1 inspection = 1 audit"}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-[#F8FAFC] text-[#475569] flex items-center justify-center border border-[#E2E8F0]">
              <FileCheck2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#166534] tracking-wider">
                Compliant
              </p>
              <p className="text-2xl font-bold text-[#166534] mt-1">{packer.passedAudits}</p>
              <p className="text-[10px] text-[#166534]/80 mt-0.5 font-medium">
                {packer.totalAudits > 0
                  ? `${Math.round((packer.passedAudits / packer.totalAudits) * 100)}% pass rate`
                  : "0 pass records"}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center border border-[#BBF7D0]">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#991B1B] tracking-wider">
                Non-Compliant
              </p>
              <p className="text-2xl font-bold text-[#991B1B] mt-1">{packer.flaggedAudits}</p>
              <p className="text-[10px] text-[#991B1B]/80 mt-0.5 font-medium">
                {packer.flaggedAudits === 0 ? "Zero violations" : `${packer.flaggedAudits} flagged issues`}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center border border-[#FECACA]">
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider">
                Pending Review
              </p>
              <p className="text-2xl font-bold text-[#B45309] mt-1">{pendingCount}</p>
              <p className="text-[10px] text-[#B45309]/80 mt-0.5 font-medium">
                Awaiting officer review
              </p>
            </div>
            <div className="size-10 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center border border-[#FDE68A]">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Left Details + Right Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Registration Details & Particulars */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Shield className="size-4 text-[#1D4ED8]" />
                <span>Registration Particulars</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#64748B]">Registered Office</span>
                <p className="text-[#0F172A] font-medium mt-1 leading-relaxed">{packer.registeredOffice}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">State</span>
                  <p className="text-[#0F172A] font-medium mt-0.5">{packer.state}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">District</span>
                  <p className="text-[#0F172A] font-medium mt-0.5">{packer.district}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9] space-y-2.5">
                <div className="flex items-center gap-2 text-[#475569]">
                  <Mail className="size-3.5 text-[#1D4ED8] shrink-0" />
                  <span className="truncate">{packer.contactEmail || "No email on record"}</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <Phone className="size-3.5 text-[#1D4ED8] shrink-0" />
                  <span>{packer.contactPhone || "No phone on record"}</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <Calendar className="size-3.5 text-[#1D4ED8] shrink-0" />
                  <span>Registered since {packer.registeredDate}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9]">
                <span className="text-[10px] uppercase font-bold text-[#64748B]">
                  Licensed Commodity Categories
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {packer.categories && packer.categories.length > 0 ? (
                    packer.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[10px] text-[#475569] font-semibold border border-[#E2E8F0]"
                      >
                        {cat}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#94A3B8]">General Packaged Commodities</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Status Callout Card */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="pb-2 border-b border-[#F1F5F9]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Info className="size-4 text-[#1D4ED8]" />
                <span>Compliance Standing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-xs space-y-2">
              {packer.totalAudits === 0 ? (
                <p className="text-[#64748B] leading-relaxed">
                  No compliance inspections have been conducted on packages under this registration yet. Once field
                  inspections occur, all compliance checks will automatically aggregate here.
                </p>
              ) : packer.flaggedAudits > 0 ? (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs leading-relaxed">
                  <strong>Notice:</strong> This packer has {packer.flaggedAudits} flagged non-compliance
                  observation(s). Pre-packaged commodities under this license should undergo heightened scrutiny.
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs leading-relaxed">
                  <strong>Compliant:</strong> All completed inspections for this packer currently satisfy Rule 6
                  mandatory declarations and net quantity standards.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabbed Views (Audits, Violations, Audit Trail) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Repeated Findings Banner if any */}
          {packer.repeatedFindings && packer.repeatedFindings.length > 0 && (
            <Card className="border-[#FCA5A5] bg-[#FEE2E2]/40 shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#991B1B] flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Repeated Non-Compliance Observations ({packer.repeatedFindings.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs pt-1">
                {packer.repeatedFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white border border-[#FECACA] text-xs shadow-2xs"
                  >
                    <p className="text-[#991B1B] font-medium leading-relaxed">{finding}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Main Tabbed Area */}
          <Tabs defaultValue="inspections" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-lg">
              <TabsTrigger
                value="inspections"
                icon={<FileCheck2 className="size-3.5" />}
              >
                Recent Audits ({inspections.length})
              </TabsTrigger>
              <TabsTrigger
                value="violations"
                icon={<AlertTriangle className="size-3.5" />}
              >
                Compliance Violations ({findings.length})
              </TabsTrigger>
              <TabsTrigger
                value="audit_trail"
                icon={<History className="size-3.5" />}
              >
                Audit Trail ({auditLogs.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Recent Inspections Table */}
            <TabsContent value="inspections">
              <Card className="border-[#E2E8F0] bg-white shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                    Associated Inspections
                  </CardTitle>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {inspections.length} recorded
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  {inspections.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                      <div className="size-10 rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center">
                        <FileCheck2 className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-[#0F172A]">No inspection audits linked yet</p>
                      <p className="text-[11px] text-[#64748B] max-w-sm">
                        When an inspection is conducted for this manufacturer or brand, it will be automatically
                        linked to this registered packer profile.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                            <TableHead className="text-[11px] font-semibold text-[#475569]">
                              INSPECTION NO
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#475569]">
                              COMMODITY
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#475569]">
                              AUDIT DATE
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#475569]">
                              STATUS
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#475569]">
                              VERDICT
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#475569] text-right">
                              ACTION
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inspections.map((ins) => (
                            <TableRow key={ins.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                              <TableCell className="font-mono text-xs font-bold text-[#1D4ED8]">
                                {ins.inspectionNumber}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-[#0F172A]">
                                {ins.product || "Packaged Commodity"}
                              </TableCell>
                              <TableCell className="text-xs text-[#64748B]">
                                {ins.createdAt ? new Date(ins.createdAt).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={ins.status as any} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge result={ins.overallResult as any} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Link href={`/inspections/${ins.id}`}>
                                  <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="size-3" />}>
                                    View Audit
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Compliance Violations */}
            <TabsContent value="violations">
              <Card className="border-[#E2E8F0] bg-white shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                    Rule Discrepancies & Violations
                  </CardTitle>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {findings.length} findings
                  </span>
                </CardHeader>
                <CardContent className="p-4">
                  {findings.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                      <div className="size-10 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                        <ShieldCheck className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-[#0F172A]">Zero Violations Recorded</p>
                      <p className="text-[11px] text-[#64748B] max-w-sm">
                        This registered packer has maintained full compliance across all documented inspections.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {findings.map((finding) => (
                        <div
                          key={finding.id}
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] transition-all flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#F1F5F9] font-mono text-[11px] font-bold text-[#0F172A]">
                                {finding.rule_id}
                              </span>
                              <span className="text-xs font-semibold text-[#0F172A]">
                                {finding.rule_name || "Rule Requirement"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  finding.severity === "CRITICAL" || finding.severity === "HIGH"
                                    ? "fail"
                                    : "review"
                                }
                              >
                                {finding.severity}
                              </Badge>
                              <span className="text-[10px] text-[#64748B]">
                                {finding.created_at ? new Date(finding.created_at).toLocaleDateString() : ""}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-[#475569] leading-relaxed">
                            {finding.message}
                          </p>

                          {finding.evidence && (
                            <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-mono text-[#334155]">
                              <strong>Evidence:</strong> {finding.evidence}
                            </div>
                          )}

                          <div className="pt-2 border-t border-[#F1F5F9] flex justify-end">
                            <Link
                              href={`/inspections/${finding.inspection_id}`}
                              className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1"
                            >
                              <span>View Associated Inspection</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Audit Trail */}
            <TabsContent value="audit_trail">
              <Card className="border-[#E2E8F0] bg-white shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                    Chronological Audit Trail
                  </CardTitle>
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {auditLogs.length} events logged
                  </span>
                </CardHeader>
                <CardContent className="p-4">
                  {auditLogs.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                      <div className="size-10 rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center">
                        <History className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-[#0F172A]">No Audit Trail Records</p>
                      <p className="text-[11px] text-[#64748B] max-w-sm">
                        Audit events for registrations, inspection submissions, and officer actions will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0F172A]">
                                {log.action_label || log.action}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-white text-[10px] text-[#64748B] border border-[#E2E8F0]">
                                {log.category || "SYSTEM"}
                              </span>
                            </div>
                            <p className="text-[#475569] text-xs">{log.details || "Action recorded"}</p>
                            <p className="text-[10px] text-[#64748B]">
                              Actor: <span className="font-medium text-[#0F172A]">{log.actor_name}</span>
                            </p>
                          </div>
                          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-[#64748B]">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                            </span>
                            {log.inspection_id && (
                              <Link
                                href={`/inspections/${log.inspection_id}`}
                                className="text-[11px] font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1"
                              >
                                <span>Inspection</span>
                                <ExternalLink className="size-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
