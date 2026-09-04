"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { getCompanyById } from "@/lib/api/companies";
import { getInspections } from "@/lib/api/inspections";
import { RegisteredPacker } from "@/mocks/companies";
import { InspectionRecord } from "@/types/inspection";

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const resolvedParams = use(params);
  const companyId = resolvedParams.id;

  const [company, setCompany] = useState<RegisteredPacker | null>(null);
  const [associatedInspections, setAssociatedInspections] = useState<InspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [compData, allInspections] = await Promise.all([
          getCompanyById(companyId),
          getInspections(),
        ]);
        setCompany(compData);

        if (compData) {
          const linked = allInspections.filter(
            (ins) =>
              ins.company.toLowerCase().includes(compData.name.toLowerCase()) ||
              (ins.commodity?.manufacturerName &&
                ins.commodity.manufacturerName.toLowerCase().includes(compData.name.toLowerCase())) ||
              (ins.commodity?.brandName &&
                ins.commodity.brandName.toLowerCase() === compData.brand.toLowerCase())
          );
          setAssociatedInspections(linked);
        }
      } catch (err) {
        console.error("Error loading company details", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [companyId]);

  if (isLoading || !company) {
    return (
      <div className="p-12 text-center text-xs text-[#475569]">
        Loading registered company record...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/companies">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />}>
            All Registered Packers
          </Button>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
            <Building2 className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[#0F172A]">{company.name}</h1>
              <Badge variant={company.status === "ACTIVE" ? "pass" : "review"}>
                {company.status === "ACTIVE" ? "Active License" : "Under Investigation"}
              </Badge>
            </div>
            <p className="text-xs text-[#475569] mt-0.5 font-medium">
              Brand: <span className="text-[#1D4ED8] font-bold">{company.brand}</span> • Rule 27 Reg:{" "}
              <span className="font-mono text-[#0F172A]">{company.registrationNumber}</span>
            </p>
          </div>
        </div>

        <div className="text-right sm:border-l sm:border-[#F1F5F9] sm:pl-5">
          <span className="text-[10px] uppercase font-bold text-[#475569]">Compliance Rating</span>
          <p className="text-xl font-extrabold text-[#166534]">{company.complianceRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Contact & Registered Office */}
        <Card className="border-[#E2E8F0] bg-white shadow-2xs md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Registration Particulars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#475569]">Registered Office</span>
              <p className="text-[#0F172A] font-medium mt-0.5">{company.registeredOffice}</p>
            </div>
            <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
              <div className="flex items-center gap-2 text-[#475569]">
                <Mail className="size-3.5 text-[#1D4ED8]" />
                <span className="truncate">{company.contactEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-[#475569]">
                <Phone className="size-3.5 text-[#1D4ED8]" />
                <span>{company.contactPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-[#475569]">
                <Shield className="size-3.5 text-[#1D4ED8]" />
                <span>Since {company.registeredDate}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9]">
              <span className="text-[10px] uppercase font-bold text-[#475569]">Commodity Categories</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {company.categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[10px] text-[#475569] font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 2 Cols: Repeated Findings & Associated Inspections */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Repeated Findings Card */}
          {company.repeatedFindings.length > 0 && (
            <Card className="border-[#FCA5A5] bg-[#FEE2E2]/35 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#991B1B] flex items-center gap-1.5">
                  <AlertTriangle className="size-4" />
                  <span>Repeated Non-Compliance Observations ({company.repeatedFindings.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {company.repeatedFindings.map((finding, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#FCA5A5] text-xs">
                    <p className="text-[#991B1B] font-medium leading-relaxed">{finding}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Inspection History Table */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Recent Audit Inspections ({associatedInspections.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {associatedInspections.length === 0 ? (
                <p className="text-xs text-[#94A3B8] p-5 text-center">
                  No direct audits linked to this company yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                      <TableHead className="text-[11px] font-semibold text-[#475569]">INSPECTION NO</TableHead>
                      <TableHead className="text-[11px] font-semibold text-[#475569]">COMMODITY</TableHead>
                      <TableHead className="text-[11px] font-semibold text-[#475569]">STATUS</TableHead>
                      <TableHead className="text-[11px] font-semibold text-[#475569]">VERDICT</TableHead>
                      <TableHead className="text-[11px] font-semibold text-[#475569] text-right">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {associatedInspections.map((ins) => (
                      <TableRow key={ins.id} className="border-[#E2E8F0] hover:bg-[#F1F5F9]">
                        <TableCell className="font-mono text-xs font-semibold">{ins.inspectionNumber}</TableCell>
                        <TableCell className="text-xs font-medium">{ins.product || ins.commodity?.commodityName}</TableCell>
                        <TableCell>
                          <StatusBadge status={ins.status} />
                        </TableCell>
                        <TableCell>
                          {ins.overallResult ? <StatusBadge result={ins.overallResult} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/inspections/${ins.id}`}>
                            <Button variant="secondary" size="sm">
                              View Audit
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
