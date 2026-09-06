"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Image as ImageIcon,
  FileText,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InspectionHeader } from "@/components/inspections/inspection-header";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { StatusBadge } from "@/components/common/status-badge";
import { getInspectionById } from "@/lib/api/inspections";
import { InspectionRecord } from "@/lib/types/inspection";

interface InspectionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InspectionDetailPage({ params }: InspectionDetailPageProps) {
  const resolvedParams = use(params);
  const inspectionId = resolvedParams.id;

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await getInspectionById(inspectionId);
        setInspection(data);
      } catch (err) {
        console.error("Error loading inspection detail", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [inspectionId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#475569]">
        Loading inspection overview...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">Inspection Not Found</h2>
        <p className="text-xs text-[#475569]">
          No inspection record exists with identifier &quot;{inspectionId}&quot;.
        </p>
        <Link href="/inspections">
          <Button variant="primary" size="sm">
            Back to Inspections List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <InspectionHeader
        inspection={inspection}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/inspections/${inspection.id}/review`}>
              <Button variant="secondary" size="sm" leftIcon={<CheckSquare className="size-3.5" />}>
                Review Data
              </Button>
            </Link>
            <Link href={`/inspections/${inspection.id}/compliance`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                Compliance Checks
              </Button>
            </Link>
          </div>
        }
      />

      {/* Workflow Navigation Stepper */}
      <InspectionStepper inspectionId={inspection.id} />

      {/* Main Inspection Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Declarations, Compliance, Findings */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Required Declarations Overview Card */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Legal Metrology Rule 6 Declarations
              </CardTitle>
              <Link
                href={`/inspections/${inspection.id}/review`}
                className="text-xs text-[#1D4ED8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Edit / Review</span>
                <ExternalLink className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569]">Commodity</span>
                  <p className="font-bold text-[#0F172A] mt-0.5">
                    {inspection.product || inspection.commodity?.commodityName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569]">Manufacturer / Packer</span>
                  <p className="font-medium text-[#0F172A] mt-0.5 truncate">
                    {inspection.company || inspection.commodity?.manufacturerName || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569]">Declared MRP</span>
                  <p className="font-bold text-[#0F172A] mt-0.5">
                    {inspection.extractedDeclarations?.mrp?.value?.rawText ||
                      (inspection.commodity?.declaredMRP ? `₹${inspection.commodity.declaredMRP}` : "—")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#475569]">Declared Net Quantity</span>
                  <p className="font-bold text-[#0F172A] mt-0.5">
                    {inspection.extractedDeclarations?.netQuantity?.value?.rawText ||
                      inspection.commodity?.declaredNetQuantity || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Findings Overview Card */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Compliance Result & Findings
              </CardTitle>
              <Link
                href={`/inspections/${inspection.id}/compliance`}
                className="text-xs text-[#1D4ED8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Full Evaluation</span>
                <ExternalLink className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {inspection.findings.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] font-medium flex items-center justify-between">
                  <span>No compliance issues detected. Commodity is fully compliant.</span>
                  <StatusBadge result="PASS" />
                </div>
              ) : (
                <div className="space-y-2">
                  {inspection.findings.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2]/35"
                    >
                      <div>
                        <span className="font-bold text-[#991B1B]">{f.title}</span>
                        <p className="text-[#475569] text-[11px] mt-0.5">{f.ruleNumber} • {f.description}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#991B1B] border border-[#FCA5A5] shrink-0">
                        {f.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Package Images & Verification Report Quick Action */}
        <div className="flex flex-col gap-6">
          {/* Photographic Evidence Card */}
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Package Photos ({inspection.images.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {inspection.images.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center p-4">No package photos attached.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {inspection.images.map((img) => (
                    <div
                      key={img.id}
                      className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col items-center text-center gap-1"
                    >
                      <div className="size-16 rounded bg-[#F1F5F9] flex items-center justify-center overflow-hidden">
                        {img.url && !img.url.startsWith("/mock-images") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img.url} alt={img.fileName} className="size-full object-cover" />
                        ) : (
                          <ImageIcon className="size-6 text-[#94A3B8]" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold truncate max-w-27.5">{img.fileName}</span>
                      <span className="text-[9px] text-[#475569] font-mono">{img.angle}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Report Card */}
          <Card className="border-[#E2E8F0] bg-[#F8FAFC] shadow-2xs">
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[#1D4ED8]" />
                <h3 className="font-bold text-[#0F172A]">Inspection Report</h3>
              </div>
              <p className="text-[#475569] text-[11px] leading-relaxed">
                Inspection report and compliance findings under Legal Metrology Rules, 2011.
              </p>
              <Link href={`/inspections/${inspection.id}/report`} className="block w-full">
                <Button variant="primary" size="sm" className="w-full">
                  Generate / View Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
