"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, AlertCircle, Calendar } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { getInspections } from "@/lib/api/inspections";
import { InspectionRecord } from "@/lib/types/inspection";

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [verdictFilter, setVerdictFilter] = useState<string>("ALL");
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInspections = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getInspections();
      setInspections(data);
    } catch (e) {
      console.error("Failed to load inspections", e);
      setErrorMessage(e instanceof Error ? e.message : "Failed to load inspections from backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  // Unique list of companies for the company filter dropdown
  const availableCompanies = Array.from(
    new Set(
      inspections
        .map((i) => i.company || i.commodity?.manufacturerName)
        .filter((c): c is string => Boolean(c))
    )
  );

  const filteredInspections = inspections.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.inspectionNumber || "").toLowerCase().includes(q) ||
      (item.product || "").toLowerCase().includes(q) ||
      (item.commodity?.commodityName && item.commodity.commodityName.toLowerCase().includes(q)) ||
      (item.company && item.company.toLowerCase().includes(q)) ||
      (item.commodity?.manufacturerName && item.commodity.manufacturerName.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const matchesVerdict = verdictFilter === "ALL" || item.overallResult === verdictFilter;
    const matchesCompany =
      companyFilter === "ALL" ||
      item.company === companyFilter ||
      item.commodity?.manufacturerName === companyFilter;

    return matchesSearch && matchesStatus && matchesVerdict && matchesCompany;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commodity Inspections"
        description="Package label audits and compliance inspection records under Legal Metrology Rules, 2011."
        actions={
          <Link href="/inspections/new">
            <Button variant="primary" size="sm" leftIcon={<Plus className="size-3.5" />}>
              New Inspection
            </Button>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Search by commodity, company, or inspection number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ALL">All Companies</option>
            {availableCompanies.map((comp) => (
              <option key={comp} value={comp}>
                {comp.length > 25 ? `${comp.substring(0, 25)}...` : comp}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="MANUAL_REVIEW">Manual Review</option>
            <option value="PROCESSING">Processing</option>
            <option value="PENDING">Pending</option>
            <option value="DRAFT">Draft</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Verdict Filter */}
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ALL">All Verdicts</option>
            <option value="PASS">Pass (Compliant)</option>
            <option value="POTENTIAL_NON_COMPLIANCE">Potential Non-Compliance</option>
            <option value="MANUAL_REVIEW">Review Required</option>
          </select>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                <TableHead className="text-[11px] font-semibold text-[#475569]">INSPECTION</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">MANUFACTURER / PACKER</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">COMMODITY</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">DATE</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">RESULT</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569]">STATUS</TableHead>
                <TableHead className="text-[11px] font-semibold text-[#475569] text-right">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center text-xs text-[#475569]">
                    Loading inspection records...
                  </TableCell>
                </TableRow>
              ) : errorMessage ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center text-xs text-[#DC2626]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="size-6 text-[#DC2626]" />
                      <p className="font-semibold">{errorMessage}</p>
                      <Button variant="secondary" size="sm" onClick={loadInspections}>
                        Retry Request
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center text-xs text-[#475569]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="size-6 text-[#94A3B8]" />
                      <p className="font-medium">No inspection records match the active filter criteria.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("ALL");
                          setVerdictFilter("ALL");
                          setCompanyFilter("ALL");
                        }}
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInspections.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => router.push(`/inspections/${item.id}`)}
                    className="hover:bg-[#F1F5F9] cursor-pointer transition-colors border-[#E2E8F0]"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-[#0F172A]">
                      {item.inspectionNumber}
                    </TableCell>
                    <TableCell className="text-xs text-[#475569] max-w-[180px] truncate">
                      {item.company || item.commodity?.manufacturerName || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs text-[#0F172A]">{item.product || item.commodity?.commodityName}</span>
                    </TableCell>
                    <TableCell className="text-xs text-[#475569] whitespace-nowrap">
                      {new Date(item.inspectionDate || item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {item.overallResult ? (
                        <StatusBadge result={item.overallResult} />
                      ) : (
                        <span className="text-[11px] text-[#94A3B8] font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/inspections/${item.id}`}>
                        <Button variant="ghost" size="icon" title="View Inspection Details">
                          <Eye className="size-4 text-[#1D4ED8]" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
