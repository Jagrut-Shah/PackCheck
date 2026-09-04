"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  FileCheck,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: "FIELD_OVERRIDE" | "CERTIFICATE_GENERATED" | "OCR_INGESTION" | "VERDICT_CONFIRMED" | "INSPECTION_CREATED";
  actionLabel: string;
  inspectionNumber: string;
  inspectionId: string;
  commodityName: string;
  officerName: string;
  officerId: string;
  details: string;
  verificationHash: string;
  ipAddress: string;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud_001",
    timestamp: "2026-09-04T07:15:22Z",
    action: "CERTIFICATE_GENERATED",
    actionLabel: "Statutory Certificate Signed",
    inspectionNumber: "INS-2026-0101",
    inspectionId: "ins_amul_ghee_001",
    commodityName: "Pure Ghee 1L Tin",
    officerName: "Rajesh Kumar Sharma",
    officerId: "usr_delhi_001",
    details: "Generated tamper-evident certificate with QR hash under Section 15 Legal Metrology Act.",
    verificationHash: "sha256:e89f471b384a22c109dfbc56e729a1b4",
    ipAddress: "10.42.18.91 (Enforcement Terminal)",
  },
  {
    id: "aud_002",
    timestamp: "2026-09-04T06:48:10Z",
    action: "FIELD_OVERRIDE",
    actionLabel: "Manual Field Override",
    inspectionNumber: "INS-2026-0102",
    inspectionId: "ins_nutribite_002",
    commodityName: "NutriBite Multigrain Cookies",
    officerName: "Rajesh Kumar Sharma",
    officerId: "usr_delhi_001",
    details: "Confirmed missing Unit Sale Price (USP). Overrode system draft from REVIEW to NON_COMPLIANT.",
    verificationHash: "sha256:91c7a884f2bb41daee012bc556e4210a",
    ipAddress: "10.42.18.91 (Enforcement Terminal)",
  },
  {
    id: "aud_003",
    timestamp: "2026-09-03T16:30:00Z",
    action: "VERDICT_CONFIRMED",
    actionLabel: "Compliance Verdict Approved",
    inspectionNumber: "INS-2026-0101",
    inspectionId: "ins_amul_ghee_001",
    commodityName: "Pure Ghee 1L Tin",
    officerName: "Rajesh Kumar Sharma",
    officerId: "usr_delhi_001",
    details: "All 8 statutory declarations evaluated and passed under PCR 2011.",
    verificationHash: "sha256:4f3a9e227189c4ad1b7829acdf41920e",
    ipAddress: "10.42.18.91 (Enforcement Terminal)",
  },
  {
    id: "aud_004",
    timestamp: "2026-09-03T11:21:28Z",
    action: "OCR_INGESTION",
    actionLabel: "Multi-Angle OCR Extraction",
    inspectionNumber: "INS-2026-0101",
    inspectionId: "ins_amul_ghee_001",
    commodityName: "Pure Ghee 1L Tin",
    officerName: "System Automated Engine",
    officerId: "engine_ocr_v2",
    details: "Processed 3 package angles (PDP, Back, Base). Extracted 8 mandatory declarations with 94.2% mean confidence.",
    verificationHash: "sha256:a1c890ef22b7d41a80c94833bb175e3a",
    ipAddress: "127.0.0.1 (Local AI Pipeline)",
  },
  {
    id: "aud_005",
    timestamp: "2026-09-03T11:15:00Z",
    action: "INSPECTION_CREATED",
    actionLabel: "Inspection Record Initialized",
    inspectionNumber: "INS-2026-0101",
    inspectionId: "ins_amul_ghee_001",
    commodityName: "Pure Ghee 1L Tin",
    officerName: "Rajesh Kumar Sharma",
    officerId: "usr_delhi_001",
    details: "Initiated routine market surveillance at Connaught Place Supermarket, Delhi NCR.",
    verificationHash: "sha256:7bc3081e649033df09e1cba58213aa99",
    ipAddress: "10.42.18.91 (Enforcement Terminal)",
  },
];

export default function AuditHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);

  const filteredLogs = MOCK_AUDIT_LOGS.filter((entry) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      entry.inspectionNumber.toLowerCase().includes(q) ||
      entry.commodityName.toLowerCase().includes(q) ||
      entry.officerName.toLowerCase().includes(q) ||
      entry.details.toLowerCase().includes(q) ||
      entry.verificationHash.toLowerCase().includes(q);
    const matchesAction = actionFilter === "ALL" || entry.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Statutory audit log exported successfully as cryptographically signed CSV.");
    }, 800);
  };

  const getActionBadgeVariant = (action: AuditLogEntry["action"]) => {
    switch (action) {
      case "CERTIFICATE_GENERATED":
        return "pass";
      case "FIELD_OVERRIDE":
        return "review";
      case "VERDICT_CONFIRMED":
        return "pass";
      case "OCR_INGESTION":
        return "neutral";
      case "INSPECTION_CREATED":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Regulatory Audit History"
        description="Immutable, tamper-evident audit trail of officer actions, OCR extractions, field overrides, and certified statutory verdicts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="size-3.5" />}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export Audit Trail"}
            </Button>
            <Link href="/inspections/new">
              <Button variant="primary" size="sm" leftIcon={<ShieldCheck className="size-3.5" />}>
                New Inspection
              </Button>
            </Link>
          </div>
        }
      />

      {/* Security Assurance Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="size-8 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
          <Lock className="size-4" />
        </div>
        <div className="text-xs text-[#0F172A] leading-relaxed">
          <span className="font-semibold text-[#1D4ED8]">Cryptographic Chain of Custody: </span>
          Every regulatory action recorded in this portal is signed with a SHA-256 verification hash and 
          timestamped in accordance with statutory compliance procedures for Legal Metrology judicial enforcement.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Search by inspection #, officer, commodity, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs bg-[#F8FAFC] border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-[#475569]" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
          >
            <option value="ALL">All Audit Actions</option>
            <option value="CERTIFICATE_GENERATED">Statutory Certificates</option>
            <option value="FIELD_OVERRIDE">Manual Field Overrides</option>
            <option value="VERDICT_CONFIRMED">Verdict Approvals</option>
            <option value="OCR_INGESTION">OCR Extractions</option>
            <option value="INSPECTION_CREATED">Inspection Creations</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC] text-xs border-b border-[#E2E8F0]">
              <TableHead className="font-semibold text-[#475569]">Timestamp (IST)</TableHead>
              <TableHead className="font-semibold text-[#475569]">Action</TableHead>
              <TableHead className="font-semibold text-[#475569]">Inspection Record</TableHead>
              <TableHead className="font-semibold text-[#475569]">Officer / Actor</TableHead>
              <TableHead className="font-semibold text-[#475569]">Audit Description</TableHead>
              <TableHead className="font-semibold text-[#475569]">Integrity Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => {
              const date = new Date(log.timestamp);
              const formattedDate = date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const formattedTime = date.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });

              return (
                <TableRow key={log.id} className="text-xs hover:bg-[#F1F5F9]/60 transition-colors border-b border-[#E2E8F0]">
                  <TableCell className="whitespace-nowrap font-mono text-[11px] text-[#475569]">
                    <div>{formattedDate}</div>
                    <div className="text-[10px] text-[#94A3B8]">{formattedTime} IST</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.actionLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/inspections/${log.inspectionId}`}
                      className="group flex items-center gap-1.5 font-mono font-bold text-[#1D4ED8] hover:underline"
                    >
                      <span>{log.inspectionNumber}</span>
                      <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <div className="text-[11px] text-[#475569] truncate max-w-[140px]">
                      {log.commodityName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[#0F172A]">{log.officerName}</div>
                    <div className="text-[10px] text-[#475569] font-mono">{log.officerId}</div>
                  </TableCell>
                  <TableCell className="max-w-xs text-[#0F172A] leading-relaxed">
                    {log.details}
                  </TableCell>
                  <TableCell>
                    <div
                      className="font-mono text-[10px] text-[#475569] bg-[#F1F5F9] px-2 py-1 rounded border border-[#E2E8F0] max-w-[160px] truncate"
                      title={log.verificationHash}
                    >
                      {log.verificationHash}
                    </div>
                    <div className="text-[9px] text-[#94A3B8] mt-0.5">{log.ipAddress}</div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
