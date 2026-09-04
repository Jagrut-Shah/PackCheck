"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Filter,
  Eye,
  MoreVertical,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { InspectionRecord } from "@/lib/types/inspection";
import { getInspections, getInspectionStatistics } from "@/lib/api/inspections";

export function DashboardView() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pass: 0,
    nonCompliant: 0,
    manualReview: 0,
    processing: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [records, statistics] = await Promise.all([
          getInspections(),
          getInspectionStatistics(),
        ]);
        setInspections(records);
        setStats(statistics);
      } catch (err) {
        console.error("Error loading dashboard inspections", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Filter inspections for table
  const filteredRecords = inspections.filter(
    (record) =>
      (record.product || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.commodity?.commodityName &&
        record.commodity.commodityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.company && record.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.inspectionNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Items needing immediate attention (manual reviews & potential non-compliances)
  const attentionRecords = inspections.filter(
    (r) =>
      r.status === "MANUAL_REVIEW" ||
      r.overallResult === "POTENTIAL_NON_COMPLIANCE" ||
      r.overallResult === "MANUAL_REVIEW"
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Quiet Dashboard Header */}
      <PageHeader
        title="Inspector Dashboard"
        description="Legal Metrology (Packaged Commodities) Rules, 2011 compliance verification & audit oversight."
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
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="size-3.5" />}
              >
                New Inspection
              </Button>
            </Link>
          </div>
        }
      />

      {/* Metric Overview: Single Clean Horizontal Surface */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F1F5F9] gap-4 sm:gap-0">
          <div className="flex flex-col gap-1 pr-0 sm:pr-6 pt-2 sm:pt-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              TOTAL AUDITED PACKAGES
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-[#0F172A]">
                {isLoading ? "..." : stats.total}
              </span>
              <span className="text-xs font-medium text-[#64748B]">FY 2026-27</span>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-normal mt-0.5">
              Cumulative market audits
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:px-6 pt-2 sm:pt-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              COMPLIANT (PASS)
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-[#15803D]">
                {isLoading ? "..." : stats.pass}
              </span>
              <span className="text-xs font-bold text-[#15803D]">
                {stats.total > 0 ? `${Math.round((stats.pass / stats.total) * 100)}%` : "0%"}
              </span>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-normal mt-0.5">
              Full statutory compliance
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:px-6 pt-2 sm:pt-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              POTENTIAL NON-COMPLIANCE
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-[#B91C1C]">
                {isLoading ? "..." : stats.nonCompliant}
              </span>
              <span className="text-xs font-bold text-[#B91C1C]">Violations</span>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-normal mt-0.5">
              Mandatory notice recommended
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:pl-6 pt-2 sm:pt-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              MANUAL REVIEW REQUIRED
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-2xl font-bold tracking-tight text-[#B45309]">
                {isLoading ? "..." : stats.manualReview}
              </span>
              <span className="text-xs font-bold text-[#B45309]">Action needed</span>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-normal mt-0.5">
              Blur or low confidence flag
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Focus Area: Items Requiring Officer Attention */}
      {attentionRecords.length > 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#B45309]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Requires Inspector Action ({attentionRecords.length})
              </h2>
            </div>
            <span className="text-[11px] text-[#64748B]">
              Unresolved infractions and blurry label flags
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attentionRecords.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#0F172A]">
                      {rec.inspectionNumber}
                    </span>
                    <StatusBadge result={rec.overallResult} status={rec.status} />
                  </div>
                  <h3 className="text-xs font-semibold text-[#0F172A] truncate">
                    {rec.product || rec.commodity?.commodityName}
                  </h3>
                  <p className="text-[11px] text-[#64748B] truncate">
                    {rec.inspectorNotes || "Review mandatory declarations under Rule 6."}
                  </p>
                </div>

                <Link href={`/inspections/${rec.id}`}>
                  <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="size-3" />}>
                    Inspect
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulatory Guidance Strip */}
      <div className="flex items-center gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3.5 px-4 text-xs text-[#0F172A]">
        <Info className="size-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
        <p className="flex-1 leading-relaxed">
          <span className="font-semibold text-[#0F172A]">Legal Metrology (Packaged Commodities) Rules, 2011:</span> Every packaged commodity must bear statutory declarations including Manufacturer/Packer Name & Address, Net Quantity, Country of Origin, and Maximum Retail Price (MRP inclusive of all taxes).
        </p>
      </div>

      {/* Operational Inspections Table Surface */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
        {/* Table Header Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[#0F172A]">
              Recent Commodity Inspections
            </h2>
            <p className="text-xs text-[#475569]">
              Audits performed under Legal Metrology enforcement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
              <Input
                placeholder="Filter inspections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white"
              />
            </div>
            <Link href="/inspections">
              <Button variant="secondary" size="sm" leftIcon={<Filter className="size-3.5" />}>
                Full List
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                <TableHead className="text-[11px] font-semibold text-[#475569]">INSPECTION NO</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">COMMODITY & BRAND</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">MANUFACTURER / PACKER</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">STATUS</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">VERDICT</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">DATE</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569] text-right">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-[#475569]">
                    Loading inspection records...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-[#475569]">
                    No inspection records found matching &quot;{searchQuery}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow
                    key={record.id}
                    onClick={() => router.push(`/inspections/${record.id}`)}
                    className="hover:bg-[#F1F5F9] cursor-pointer transition-colors border-[#E2E8F0]"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-[#0F172A]">
                      {record.inspectionNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-[#0F172A]">
                          {record.product || record.commodity?.commodityName}
                        </span>
                        <span className="text-[11px] text-[#475569]">
                          {record.commodity?.brandName ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#475569] max-w-[200px] truncate">
                      {record.company || record.commodity?.manufacturerName || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>
                      {record.overallResult ? (
                        <StatusBadge result={record.overallResult} />
                      ) : (
                        <span className="text-[11px] text-[#94A3B8] font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#475569] whitespace-nowrap">
                      {new Date(record.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/inspections/${record.id}`}>
                          <Button variant="ghost" size="icon" title="View Inspection">
                            <Eye className="size-4" />
                          </Button>
                        </Link>
                        <Dropdown
                          trigger={
                            <button
                              type="button"
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          }
                          align="right"
                          items={[
                            {
                              label: "View Overview",
                              icon: <Eye className="size-3.5" />,
                              onClick: () => router.push(`/inspections/${record.id}`),
                            },
                            {
                              label: "Review Data",
                              icon: <CheckCircle2 className="size-3.5" />,
                              onClick: () => router.push(`/inspections/${record.id}/review`),
                            },
                            {
                              label: "View Report",
                              icon: <Download className="size-3.5" />,
                              onClick: () => router.push(`/inspections/${record.id}/report`),
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Record Quick View Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRecord ? `Inspection Summary: ${selectedRecord.inspectionNumber}` : "Inspection Record"}
        description="Statutory Legal Metrology verification details"
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Commodity</span>
                <p className="font-semibold text-[#0F172A] mt-0.5">{selectedRecord.product || selectedRecord.commodity?.commodityName}</p>
                <p className="text-[#475569]">{selectedRecord.commodity?.brandName ?? "—"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Manufacturer</span>
                <p className="font-semibold text-[#0F172A] mt-0.5">{selectedRecord.company || selectedRecord.commodity?.manufacturerName || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Declared MRP</span>
                <p className="font-semibold text-[#0F172A] mt-0.5">
                  {selectedRecord.commodity?.declaredMRP ? `₹${selectedRecord.commodity.declaredMRP}` : "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#475569]">Declared Net Qty</span>
                <p className="font-semibold text-[#0F172A] mt-0.5">
                  {selectedRecord.commodity?.declaredNetQuantity ?? "—"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
              <Link href={`/inspections/${selectedRecord.id}`}>
                <Button variant="primary" size="sm">
                  Full Inspection Workflow
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
