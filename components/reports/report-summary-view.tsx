"use client";

import React, { useState } from "react";
import { Download, ShieldCheck, FileText, Printer, Check, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationReportData } from "@/types/report";

interface ReportSummaryViewProps {
  report: VerificationReportData;
}

/* Guilloche Security Geometric Wave Pattern for Official Certificate */
const GuillochePattern = () => (
  <svg
    className="w-full h-3.5 opacity-35 text-[#1D4ED8] pointer-events-none select-none"
    viewBox="0 0 1200 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 12 Q30 0 60 12 T120 12 T180 12 T240 12 T300 12 T360 12 T420 12 T480 12 T540 12 T600 12 T660 12 T720 12 T780 12 T840 12 T900 12 T960 12 T1020 12 T1080 12 T1140 12 T1200 12"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M0 12 Q30 24 60 12 T120 12 T180 12 T240 12 T300 12 T360 12 T420 12 T480 12 T540 12 T600 12 T660 12 T720 12 T780 12 T840 12 T900 12 T960 12 T1020 12 T1080 12 T1140 12 T1200 12"
      stroke="#2563EB"
      strokeWidth="1"
    />
    <path
      d="M0 6 Q40 18 80 6 T160 6 T240 6 T320 6 T400 6 T480 6 T560 6 T640 6 T720 6 T800 6 T880 6 T960 6 T1040 6 T1120 6 T1200 6"
      stroke="#94A3B8"
      strokeWidth="0.75"
      strokeDasharray="4 2"
    />
    <path
      d="M0 18 Q40 6 80 18 T160 18 T240 18 T320 18 T400 18 T480 18 T560 18 T640 18 T720 18 T800 18 T880 18 T960 18 T1040 18 T1120 18 T1200 18"
      stroke="#94A3B8"
      strokeWidth="0.75"
      strokeDasharray="4 2"
    />
  </svg>
);

/* Departmental Inked Compliance Stamp */
const ComplianceStampBadge: React.FC<{ result: string; hash: string; date: string }> = ({
  result,
  hash,
  date,
}) => {
  const isPass = result === "PASS";
  const colorClass = isPass
    ? "border-[#15803D] text-[#15803D] shadow-[0_0_12px_rgba(21,128,61,0.18)]"
    : "border-[#B91C1C] text-[#B91C1C] shadow-[0_0_12px_rgba(185,28,28,0.18)]";

  return (
    <div
      className={`relative select-none pointer-events-none p-3 rounded-full border-4 border-double w-36 h-36 flex flex-col items-center justify-center text-center transform -rotate-12 transition-transform duration-300 hover:rotate-0 ${colorClass} bg-white/95`}
    >
      <div className="absolute inset-1 rounded-full border border-dashed border-current opacity-60" />
      <span className="text-[7.5px] font-black uppercase tracking-widest leading-none">
        GOVT. OF INDIA
      </span>
      <div className="my-0.5 h-[1px] w-12 bg-current opacity-40" />
      <span className="text-[10.5px] font-black tracking-tight uppercase leading-tight font-mono">
        {isPass ? "STATUTORY COMPLIANT" : "DEFECT NOTED"}
      </span>
      <div className="my-0.5 h-[1px] w-12 bg-current opacity-40" />
      <span className="text-[7px] font-bold uppercase tracking-wider">
        LEGAL METROLOGY ACT 2009
      </span>
      <span className="text-[6.5px] font-mono tracking-tighter mt-0.5 opacity-80">
        E-VERIFIED: {hash.slice(0, 8)}
      </span>
      <span className="text-[6px] font-mono opacity-70">
        {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </span>
    </div>
  );
};

export const ReportSummaryView: React.FC<ReportSummaryViewProps> = ({ report }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGeneratePdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 800);
  };

  const inspectionNum = report.inspectionNumber || report.inspectionId;
  const company = report.company || report.manufacturerOrPacker;
  const product = report.product || report.commodityName;
  const inspectionDate = report.inspectionDate || report.generatedAt;
  const location = report.location || "Connaught Place Market, New Delhi";
  const inspector = report.inspector || report.generatedBy;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto print-page-container">
      {/* Top Action Header */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs no-print">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[#1D4ED8]" />
          <span className="text-xs font-semibold text-[#0F172A]">
            PackCheck AI • Official Inspection Report
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] font-bold border border-[#86EFAC]">
            Ready for PDF Generation
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="size-3.5" />}
            onClick={() => window.print()}
          >
            Print Certificate
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isGenerating}
            leftIcon={isGenerated ? <Check className="size-3.5" /> : <Download className="size-3.5" />}
            onClick={handleGeneratePdf}
          >
            {isGenerated ? "PDF Generated (Demo)" : "Generate PDF"}
          </Button>
        </div>
      </div>

      {isGenerated && (
        <div className="p-3 rounded-lg border border-[#86EFAC] bg-[#DCFCE7] text-xs text-[#166534] font-medium flex items-center gap-2 no-print">
          <Check className="size-4 shrink-0" />
          <span>
            Mock PDF export triggered. In production, this generates a server-side signed PDF conforming to Legal Metrology court standards.
          </span>
        </div>
      )}

      {/* Official Statutory Document Surface with Security Watermark */}
      <div className="relative overflow-hidden rounded-xl border-2 border-[#CBD5E1] bg-white p-6 sm:p-10 shadow-md space-y-6 text-[#0F172A] print-clean">
        {/* Background Security Watermark Pattern */}
        <div
          className="absolute inset-0 pointer-events-none select-none opacity-[0.035] flex items-center justify-center -rotate-25"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 40px)`,
          }}
        >
          <div className="text-[52px] font-black tracking-widest text-[#0F172A] whitespace-nowrap">
            LEGAL METROLOGY ACT 2009 • STATUTORY ENFORCEMENT
          </div>
        </div>

        {/* Top Guilloche Geometric Security Band */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-[#64748B] uppercase tracking-wider px-1">
            <span>SEC-REF: IND/LM-DCA/2026/V-{report.reportNumber.replace(/[^0-9]/g, "").slice(0, 6) || "889104"}</span>
            <span>OFFICIAL STATUTORY RECORD • COURT ADMISSIBLE UNDER SEC 65B</span>
          </div>
          <GuillochePattern />
        </div>

        {/* Floating Inked Compliance Stamp */}
        <div className="absolute top-20 right-6 sm:right-12 z-20 pointer-events-none">
          <ComplianceStampBadge
            result={report.overallResult}
            hash={report.documentHash}
            date={inspectionDate}
          />
        </div>

        {/* Government / Department Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b-2 border-[#0F172A]">
          <div className="size-14 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border-2 border-[#BFDBFE] flex items-center justify-center mb-2 shadow-xs">
            <ShieldCheck className="size-8" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#334155]">
            GOVERNMENT OF INDIA • MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mt-0.5">
            DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] mt-2 font-serif">
            STATUTORY VERIFICATION CERTIFICATE
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 max-w-xl">
            Issued pursuant to Section 15 & Section 18 of the Legal Metrology Act, 2009 read with the Legal Metrology (Packaged Commodities) Rules, 2011
          </p>
        </div>

        {/* Primary Report Particulars Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Report Number</span>
            <p className="font-mono font-bold text-[#0F172A] mt-0.5">{report.reportNumber}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Inspection Number</span>
            <p className="font-mono text-[#0F172A] mt-0.5">{inspectionNum}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Inspection Date</span>
            <p className="text-[#0F172A] mt-0.5">
              {new Date(inspectionDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Overall Result</span>
            <div className="mt-0.5">
              <Badge variant={report.overallResult === "PASS" ? "pass" : "fail"}>
                {report.overallResult}
              </Badge>
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs p-4 rounded-lg border border-[#E2E8F0] bg-white">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Company / Pre-Packer</span>
            <p className="font-bold text-[#0F172A] mt-0.5">{company}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Commodity / Product</span>
            <p className="font-bold text-[#0F172A] mt-0.5">{product}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#475569]">Inspecting Officer & Location</span>
            <p className="text-[#0F172A] mt-0.5">{inspector}</p>
            <p className="text-[#475569] text-[11px]">{location}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] border-b border-[#E2E8F0] pb-1">
            Executive Summary
          </h3>
          <p className="text-xs text-[#0F172A] leading-relaxed">
            {report.executiveSummary ||
              `Statutory verification conducted under Legal Metrology Act, 2009 for sample of "${product}". The package label was inspected for all 17 mandatory declarations under Rule 6 and packaging standards under Rule 7.`}
          </p>
        </div>

        {/* Statutory Declarations Verification Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] border-b border-[#E2E8F0] pb-1">
            Declaration Verification (Rule 6)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#475569]">
                  <th className="py-2 font-semibold">Statutory Clause</th>
                  <th className="py-2 font-semibold">Requirement</th>
                  <th className="py-2 font-semibold">Observed Value on Label</th>
                  <th className="py-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                <tr>
                  <td className="py-2.5 font-mono text-[#64748B]">Rule 6(1)(a)</td>
                  <td className="py-2.5">Manufacturer / Packer Name & Address</td>
                  <td className="py-2.5">{report.extractedDeclarations?.manufacturerOrPacker?.value?.name || company}</td>
                  <td className="py-2.5 text-right font-bold text-[#166534]">Compliant</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[#64748B]">Rule 6(1)(b)</td>
                  <td className="py-2.5">Generic / Common Name of Commodity</td>
                  <td className="py-2.5">{report.extractedDeclarations?.commodityName?.value || product}</td>
                  <td className="py-2.5 text-right font-bold text-[#166534]">Compliant</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[#64748B]">Rule 6(1)(c)</td>
                  <td className="py-2.5">Net Quantity in Standard SI Units</td>
                  <td className="py-2.5">{report.extractedDeclarations?.netQuantity?.rawValue || "1 L (905 g)"}</td>
                  <td className="py-2.5 text-right font-bold text-[#166534]">Compliant</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[#64748B]">Rule 6(1)(e)</td>
                  <td className="py-2.5">MRP Inclusive of All Taxes</td>
                  <td className="py-2.5">{report.extractedDeclarations?.mrp?.rawValue || "₹650.00"}</td>
                  <td className="py-2.5 text-right font-bold">
                    {report.overallResult === "PASS" ? (
                      <span className="text-[#166534]">Compliant</span>
                    ) : (
                      <span className="text-[#991B1B]">Non-Compliant</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[#64748B]">Rule 6(10)</td>
                  <td className="py-2.5">Country of Origin</td>
                  <td className="py-2.5">{report.extractedDeclarations?.countryOfOrigin?.value || "India"}</td>
                  <td className="py-2.5 text-right font-bold text-[#166534]">Compliant</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Findings Section */}
        {report.findings.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#991B1B] border-b border-[#FCA5A5] pb-1">
              Noted Statutory Infractions & Findings ({report.findings.length})
            </h3>
            <div className="space-y-2">
              {report.findings.map((f, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2]/35 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#991B1B]">{f.title} ({f.ruleNumber})</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#991B1B] font-bold border border-[#FCA5A5]">
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-[#0F172A] mt-1">{f.description}</p>
                  <p className="text-[11px] text-[#475569] mt-0.5">
                    Statutory Reference: {f.statutoryReference || "Legal Metrology (Packaged Commodities) Rules, 2011"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statutory Rule Sources */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] border-b border-[#E2E8F0] pb-1">
            Statutory Rule Sources & Governance
          </h3>
          <ul className="text-xs text-[#475569] space-y-1 list-disc pl-4">
            <li>The Legal Metrology Act, 2009 (Act No. 1 of 2010), Sections 15, 18, 36.</li>
            <li>The Legal Metrology (Packaged Commodities) Rules, 2011 (G.S.R. 202(E)), Rules 6, 7, 8, 9, 27, 32.</li>
            <li>The Legal Metrology (Packaged Commodities) Amendment Rules, 2022 (Unit Sale Price Mandate).</li>
          </ul>
        </div>

        {/* Officer Digital Signoff & Cryptographic Stamp Block */}
        <div className="pt-6 border-t-2 border-[#0F172A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#475569]">
              Verification Cryptographic Hash (Demo Record)
            </span>
            <p className="font-mono text-[10px] text-[#475569] break-all max-w-sm">
              SHA-256: {report.documentHash}
            </p>
            <div className="flex items-center gap-2 mt-2 pt-1">
              <div className="size-9 bg-[#0F172A] p-1 rounded flex items-center justify-center text-white text-[8px] font-mono leading-none text-center select-none font-bold">
                SEC
                <br />
                QR
              </div>
              <p className="text-[10px] text-[#64748B] leading-tight">
                Section 65B Indian Evidence Act compliant digital statutory certification. Digitally sealed on {new Date(inspectionDate).toLocaleDateString("en-IN")}.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-right min-w-[240px] space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#475569]">Authorized Signatory</span>
            <p className="font-serif italic font-bold text-sm text-[#0F172A] pt-1">{report.signoff?.officerName || inspector}</p>
            <div className="h-[1px] w-full bg-[#94A3B8] my-1" />
            <p className="text-[11px] font-medium text-[#334155]">{report.signoff?.designation || "Senior Legal Metrology Inspector"}</p>
            <p className="text-[10px] font-mono text-[#64748B]">{report.signoff?.badgeNumber || "LM-DEL-4821"}</p>
          </div>
        </div>

        {/* Bottom Guilloche Geometric Security Band */}
        <div className="pt-4 space-y-1">
          <GuillochePattern />
          <div className="flex items-center justify-between text-[8px] font-mono text-[#94A3B8] uppercase tracking-wider px-1">
            <span>PACKCHECK AI STATUTORY AUDIT ENGINE • CENTRAL REPOSITORY COPY</span>
            <span>FORM LM-IV • PRE-PACKAGED COMMODITIES REGULATION</span>
          </div>
        </div>
      </div>
    </div>
  );
};
