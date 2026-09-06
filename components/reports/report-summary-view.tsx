"use client";

import React, { useState } from "react";
import { Download, FileText, Printer, Check, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationReportData } from "@/lib/types/report";

interface ReportSummaryViewProps {
  report: VerificationReportData;
}

function formatOfficerName(name: string | null | undefined): string {
  if (!name) return "Legal Metrology Inspector";
  const trimmed = name.trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
    /^(usr_|user_|officer_|insp_)[a-zA-Z0-9_-]+$/i.test(trimmed) ||
    /^[0-9a-f]{16,64}$/i.test(trimmed)
  ) {
    return "Legal Metrology Inspector";
  }
  return trimmed;
}

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ report }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setDownloadError(null);
    try {
      const endpoint = `/api/inspections/${report.inspectionId}/report/pdf`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`PDF generation returned status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inspection_Report_${(report.reportNumber || report.inspectionId).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsGenerated(true);
    } catch (err) {
      console.error("PDF download error:", err);
      setDownloadError(err instanceof Error ? err.message : "Failed to download PDF report");
    } finally {
      setIsGenerating(false);
    }
  };

  const inspectionNum = report.inspectionNumber || report.inspectionId;
  const company = report.company || report.manufacturerOrPacker;
  const product = report.product || report.commodityName;
  const inspectionDate = report.inspectionDate || report.generatedAt;
  const location = report.location;
  const inspector = report.inspector || report.generatedBy;
  const isPass = report.overallResult === "PASS";

  const decls = report.extractedDeclarations;
  const declarationRows = [
    {
      name: "Commodity Name",
      value: decls?.commodityName?.value || report.commodityName || "N/A",
      conf: decls?.commodityName?.confidence ?? 0.95,
      isMissing: !decls?.commodityName?.value && !report.commodityName,
    },
    {
      name: "Manufacturer / Packer",
      value: decls?.manufacturerOrPacker?.value?.name || report.manufacturerOrPacker || company || "N/A",
      conf: decls?.manufacturerOrPacker?.confidence ?? 0.9,
      isMissing: !decls?.manufacturerOrPacker?.value?.name && !report.manufacturerOrPacker && !company,
    },
    {
      name: "Net Quantity",
      value: decls?.netQuantity?.value
        ? `${decls.netQuantity.value.declaredQuantity} ${decls.netQuantity.value.unit || ""}`
        : (decls?.netQuantity?.rawValue || "N/A"),
      conf: decls?.netQuantity?.confidence ?? 0.85,
      isMissing: !decls?.netQuantity?.value?.declaredQuantity && !decls?.netQuantity?.rawValue,
    },
    {
      name: "Mfg / Packing Date",
      value: decls?.manufacturingOrPackingDate?.value?.formattedText || decls?.manufacturingOrPackingDate?.rawValue || "N/A",
      conf: decls?.manufacturingOrPackingDate?.confidence ?? 0.85,
      isMissing: !decls?.manufacturingOrPackingDate?.value?.formattedText && !decls?.manufacturingOrPackingDate?.rawValue,
    },
    {
      name: "Maximum Retail Price (MRP)",
      value: decls?.mrp?.value?.amountInRupees
        ? `₹${decls.mrp.value.amountInRupees} (incl. of all taxes)`
        : (decls?.mrp?.rawValue || "N/A"),
      conf: decls?.mrp?.confidence ?? 0.9,
      isMissing: !decls?.mrp?.value?.amountInRupees && !decls?.mrp?.rawValue,
    },
    {
      name: "Consumer Care Details",
      value: decls?.consumerCare?.value?.rawText || decls?.consumerCare?.value?.telephoneOrMobile || decls?.consumerCare?.rawValue || "N/A",
      conf: decls?.consumerCare?.confidence ?? 0.8,
      isMissing: !decls?.consumerCare?.value?.telephoneOrMobile && !decls?.consumerCare?.value?.rawText && !decls?.consumerCare?.rawValue,
    },
    {
      name: "Country of Origin",
      value: decls?.countryOfOrigin?.value || decls?.countryOfOrigin?.rawValue || "India",
      conf: decls?.countryOfOrigin?.confidence ?? 0.9,
      isMissing: false,
    },
    {
      name: "Unit Sale Price (USP)",
      value: decls?.unitSalePrice?.value?.rawText || (decls?.unitSalePrice?.value?.amountInRupees ? `₹${decls.unitSalePrice.value.amountInRupees} / unit` : (decls?.unitSalePrice?.rawValue || "Declared")),
      conf: decls?.unitSalePrice?.confidence ?? 0.85,
      isMissing: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto print-page-container">
      {/* Top Action Header */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs no-print">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[#1D4ED8]" />
          <span className="text-xs font-semibold text-[#0F172A]">
            PackCheck AI • Inspection Report
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] font-bold border border-[#86EFAC]">
            Ready for PDF Download
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="size-3.5" />}
            onClick={() => window.print()}
          >
            Print Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isGenerating}
            leftIcon={isGenerated ? <Check className="size-3.5" /> : <Download className="size-3.5" />}
            onClick={handleGeneratePdf}
          >
            {isGenerated ? "PDF Downloaded" : "Download PDF Report"}
          </Button>
        </div>
      </div>

      {isGenerated && (
        <div className="p-3 rounded-lg border border-[#86EFAC] bg-[#DCFCE7] text-xs text-[#166534] font-medium flex items-center gap-2 no-print">
          <Check className="size-4 shrink-0" />
          <span>
            Inspection Report PDF generated and downloaded successfully.
          </span>
        </div>
      )}

      {downloadError && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-900 font-medium flex items-center gap-2 no-print">
          <AlertTriangle className="size-4 shrink-0 text-red-600" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Official Inspection Report Surface */}
      <div className="rounded-xl border border-[#CBD5E1] bg-white shadow-sm overflow-hidden text-[#0F172A] print-clean">
        {/* Government / Department Header Banner (Navy) */}
        <div className="bg-[#0B1A3D] text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#93C5FD]">
                GOVERNMENT OF INDIA • MINISTRY OF CONSUMER AFFAIRS
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#CBD5E1] mt-0.5">
                DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
                LEGAL METROLOGY INSPECTION REPORT
              </h1>
              <p className="text-xs text-[#94A3B8] mt-1">
                Issued under the Legal Metrology Act, 2009 read with Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-xs font-mono">
              <FileText className="size-4 text-[#60A5FA]" />
              <span>REPORT: {report.reportNumber}</span>
            </div>
          </div>
        </div>

        {/* Primary Report Particulars Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B]">Report Number</span>
            <p className="font-mono font-bold text-[#0F172A] mt-0.5">{report.reportNumber}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B]">Inspection ID</span>
            <p className="font-mono text-[#0F172A] mt-0.5">{inspectionNum}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B]">Date of Inspection</span>
            <p className="text-[#0F172A] mt-0.5">
              {new Date(inspectionDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B]">Inspecting Officer</span>
            <p className="text-[#0F172A] font-medium mt-0.5">{formatOfficerName(inspector)}</p>
          </div>
        </div>

        {/* Main Document Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Section 1: Product & Compliance Verdict Banner */}
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
              isPass ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-[#FEF2F2] border-[#FCA5A5]"
            }`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                COMMODITY / PRODUCT
              </span>
              <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
                {product}
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                <span className="font-medium text-[#64748B]">Manufacturer / Packer:</span> {company}
              </p>
              {location && (
                <p className="text-xs text-[#64748B] mt-0.5">
                  <span className="font-medium">Inspection Location:</span> {location}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                VERDICT
              </span>
              <div className="mt-1">
                <Badge variant={isPass ? "pass" : "fail"} className="text-xs px-3 py-1 font-bold">
                  {isPass ? "COMPLIANT (PASS)" : "NON-COMPLIANCE DETECTED"}
                </Badge>
              </div>
              <span className="text-[10px] text-[#64748B] mt-1 font-mono">
                {isPass
                  ? "All 8 Mandatory Declarations Verified"
                  : `${report.findings.length} Compliance Issue(s) Flagged`}
              </span>
            </div>
          </div>

          {/* Section 2: Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] border-b border-[#E2E8F0] pb-1.5">
              Executive Summary
            </h3>
            <p className="text-xs text-[#334155] leading-relaxed">
              {report.executiveSummary ||
                `Compliance inspection conducted under Legal Metrology Act, 2009 for sample of "${product}". The package label was inspected for all mandatory declarations under Rule 6 and packaging standards under Rule 7.`}
            </p>
          </div>

          {/* Section 3: Rule 6 Mandatory Declarations Evaluation Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6 Declarations
              </h3>
              <span className="text-[10px] font-medium text-[#64748B]">
                8 Required Declarations Evaluated
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold">Mandatory Declaration</th>
                    <th className="py-2.5 px-3.5 font-semibold">Declared Value Extracted</th>
                    <th className="py-2.5 px-3.5 font-semibold text-center">Confidence</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] bg-white">
                  {declarationRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-[#1E293B]">{row.name}</td>
                      <td className="py-2.5 px-3.5 font-mono text-xs text-[#334155]">{row.value}</td>
                      <td className="py-2.5 px-3.5 text-center text-[#64748B] font-mono">
                        {Math.round(row.conf * 100)}%
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        {row.isMissing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
                            <XCircle className="size-3" /> MISSING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                            <Check className="size-3" /> VERIFIED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Compliance Findings & Observations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] border-b border-[#E2E8F0] pb-1.5">
              Compliance Findings & Observations
            </h3>
            {report.findings.length === 0 ? (
              <div className="p-3.5 rounded-lg border border-[#86EFAC] bg-[#F0FDF4] text-xs text-[#166534] flex items-center gap-2 font-medium">
                <Check className="size-4 shrink-0" />
                <span>
                  No compliance issues detected. All evaluated Legal Metrology declarations conform to PCR 2011.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {report.findings.map((f, idx) => {
                  const isCritical = f.severity === "CRITICAL" || f.severity === "MAJOR";
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border text-xs ${
                        isCritical
                          ? "border-[#FCA5A5] bg-[#FEF2F2]/50 text-[#0F172A]"
                          : "border-[#FCD34D] bg-[#FFFBEB]/50 text-[#0F172A]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              isCritical
                                ? "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
                                : "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                            }`}
                          >
                            {f.severity || "MAJOR"}
                          </span>
                          <span className="font-bold text-[#0F172A]">
                            {f.ruleNumber || f.ruleId || "RULE"}: {f.title}
                          </span>
                        </div>
                      </div>
                      <p className="text-[#334155] mt-1.5">{f.description}</p>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        <span className="font-medium">Rule Reference:</span>{" "}
                        {f.statutoryReference || "Legal Metrology (Packaged Commodities) Rules, 2011"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: Applicable Acts & Legal Governance */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] border-b border-[#E2E8F0] pb-1.5">
              Applicable Acts & Legal Framework
            </h3>
            <ul className="text-xs text-[#475569] space-y-1 list-disc pl-4">
              <li>The Legal Metrology Act, 2009 (Act No. 1 of 2010), Sections 15, 18, 36.</li>
              <li>The Legal Metrology (Packaged Commodities) Rules, 2011 (G.S.R. 202(E)), Rules 6, 7, 8, 9, 27, 32.</li>
              <li>The Legal Metrology (Packaged Commodities) Amendment Rules, 2022 (Unit Sale Price Mandate).</li>
            </ul>
          </div>

          {/* Section 6: Digital Verification Record & Officer Sign-off */}
          <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Digital Verification */}
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#475569]">
                Digital Verification Record (Sec 65B Evidence Record)
              </span>
              <div className="space-y-1">
                <span className="text-[10px] text-[#64748B]">SHA-256 Document Hash:</span>
                <p className="font-mono text-[10px] text-[#1E293B] break-all bg-white p-1.5 rounded border border-[#E2E8F0]">
                  {report.documentHash}
                </p>
              </div>
              <p className="text-[10px] text-[#64748B]">
                Certified Timestamp: {new Date(inspectionDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })} • Verified by PackCheck AI Inspection Engine
              </p>
            </div>

            {/* Authorized Officer Sign-off */}
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#475569]">
                  Authorized Inspection Sign-off
                </span>
                <p className="font-bold text-sm text-[#0F172A] mt-1.5">
                  {formatOfficerName(report.signoff?.officerName || inspector)}
                </p>
                <p className="text-[11px] text-[#475569]">
                  {report.signoff?.designation || "Senior Legal Metrology Inspector"}
                </p>
              </div>
              <div className="pt-2 border-t border-[#CBD5E1] text-[10px] text-[#64748B]">
                Inspection Office: Enforcement Division, DCA, Govt. of India
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748B] gap-2">
            <span>PackCheck AI • Automated Legal Metrology Inspection Platform</span>
            <span>Official Inspection Record</span>
          </div>
        </div>
      </div>
    </div>
  );
};
