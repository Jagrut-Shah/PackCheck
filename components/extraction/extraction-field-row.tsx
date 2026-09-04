import React from "react";
import { Edit3, CheckCheck, Image as ImageIcon } from "lucide-react";
import { ConfidenceIndicator } from "./confidence-indicator";
import { ConfidenceLevel } from "@/types/common";
import { cn } from "@/lib/utils";

interface ExtractionFieldRowProps {
  label: string;
  ruleReference: string;
  value: string;
  rawValue?: string;
  confidenceLevel: ConfidenceLevel;
  confidenceScore?: number;
  sourceImageAngle?: string;
  isOverridden?: boolean;
  onEdit: () => void;
}

export const ExtractionFieldRow: React.FC<ExtractionFieldRowProps> = ({
  label,
  ruleReference,
  value,
  rawValue,
  confidenceLevel,
  confidenceScore,
  sourceImageAngle,
  isOverridden,
  onEdit,
}) => {
  const isLow = confidenceLevel === "LOW";
  const isMed = confidenceLevel === "MEDIUM";

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-lg border bg-white transition-colors",
        isLow
          ? "border-[#FCA5A5] bg-[#FEE2E2]/30 hover:border-[#991B1B]"
          : isMed
          ? "border-[#FCD34D] bg-[#FEF3C7]/25 hover:border-[#92400E]"
          : isOverridden
          ? "border-[#86EFAC] bg-[#DCFCE7]/25 hover:border-[#166534]"
          : "border-[#E2E8F0] hover:border-[#CBD5E1]"
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#0F172A]">{label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
            {ruleReference}
          </span>
          {isOverridden && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#166534] bg-[#DCFCE7] px-1.5 py-0.5 rounded border border-[#86EFAC]">
              <CheckCheck className="size-3" />
              Inspector Corrected
            </span>
          )}
        </div>

        <p className="text-xs text-[#0F172A] font-medium leading-relaxed mt-1">
          {value || <span className="text-[#94A3B8] italic">Not detected on package</span>}
        </p>

        {rawValue && rawValue !== value && (
          <p className="text-[11px] text-[#94A3B8] font-mono truncate">
            Raw OCR: {rawValue}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
        {sourceImageAngle && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#475569] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
            <ImageIcon className="size-3 text-[#94A3B8]" />
            {sourceImageAngle}
          </span>
        )}

        <ConfidenceIndicator level={confidenceLevel} score={confidenceScore} />

        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-[#64748B] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer border border-transparent hover:border-[#BFDBFE]"
          title="Correct extracted declaration"
        >
          <Edit3 className="size-3.5" />
        </button>
      </div>
    </div>
  );
};
