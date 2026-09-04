import React from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, XCircle, ExternalLink, Image as ImageIcon } from "lucide-react";
import { ComplianceFinding } from "@/types/finding";

interface ComplianceFindingCardProps {
  finding: ComplianceFinding;
  inspectionId: string;
}

export const ComplianceFindingCard: React.FC<ComplianceFindingCardProps> = ({
  finding,
  inspectionId,
}) => {
  const getSeverityBadge = () => {
    switch (finding.severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
            <XCircle className="size-3" aria-hidden="true" />
            CRITICAL
          </span>
        );
      case "MAJOR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
            <AlertTriangle className="size-3" aria-hidden="true" />
            MAJOR
          </span>
        );
      case "MINOR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]">
            <AlertCircle className="size-3" aria-hidden="true" />
            MINOR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
            <Info className="size-3" aria-hidden="true" />
            ADVISORY
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#FCA5A5] bg-[#FEE2E2]/35 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="size-4 text-[#991B1B] shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-[#991B1B]">{finding.title}</h3>
              {getSeverityBadge()}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#475569] border border-[#CBD5E1]">
                {finding.ruleNumber}
              </span>
            </div>
            <p className="text-xs text-[#0F172A] mt-1 leading-relaxed">
              {finding.description}
            </p>
          </div>
        </div>

        <Link
          href={`/inspections/${inspectionId}/evidence`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-[#EFF6FF] px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer active:scale-95 border border-transparent hover:border-[#BFDBFE] shrink-0"
        >
          <span>View Evidence</span>
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Observed vs Statutory Requirement comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#475569]">Observed Package Declaration</span>
          <p className="font-mono text-[#991B1B] font-bold mt-0.5">
            {finding.observedValue || finding.detectedValue || "Not Detected"}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-[#475569]">Statutory Requirement</span>
          <p className="text-[#0F172A] font-medium mt-0.5">
            {finding.expectedRequirement}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1">
        <span>{finding.statutoryReference}</span>
        {finding.evidence.length > 0 && (
          <span className="flex items-center gap-1">
            <ImageIcon className="size-3" />
            {finding.evidence.length} photographic bounding box reference(s)
          </span>
        )}
      </div>
    </div>
  );
};
