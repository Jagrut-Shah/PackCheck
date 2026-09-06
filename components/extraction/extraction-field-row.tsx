import React from "react";
import { Edit3, CheckCheck, Image as ImageIcon, AlertTriangle, XCircle } from "lucide-react";
import { ConfidenceIndicator } from "./confidence-indicator";
import { ConfidenceLevel } from "@/lib/types/common";
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
  const isResolved = isOverridden === true;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-lg border bg-white transition-colors",
        isResolved
          ? "border-[#86EFAC] bg-[#DCFCE7]/20"
          : isLow
          ? "border-[#FCA5A5] bg-[#FEE2E2]/40 hover:border-[#991B1B]"
          : isMed
          ? "border-[#FCD34D] bg-[#FEF3C7]/30 hover:border-[#92400E]"
          : "border-[#E2E8F0] hover:border-[#CBD5E1]"
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#0F172A]">{label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
            {ruleReference}
          </span>
          {isResolved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#166534] bg-[#DCFCE7] px-1.5 py-0.5 rounded border border-[#86EFAC]">
              <CheckCheck className="size-3" />
              Officer Corrected
            </span>
          )}
          {!isResolved && isLow && !value && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#991B1B] bg-[#FEE2E2] px-1.5 py-0.5 rounded border border-[#FCA5A5]">
              <XCircle className="size-3" />
              Click ✏️ to enter this value
            </span>
          )}
          {!isResolved && isMed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#FCD34D]">
              <AlertTriangle className="size-3" />
              Confirm this matches the package
            </span>
          )}
        </div>

        <p className="text-xs text-[#0F172A] font-medium leading-relaxed mt-1">
          {value || <span className="text-[#94A3B8] italic">Not detected — please enter manually</span>}
        </p>

        {rawValue && rawValue !== value && (
          <p className="text-[11px] text-[#94A3B8] font-mono truncate">
            Scanned text: {rawValue}
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

        <ConfidenceIndicator
          level={isResolved ? "HIGH" : confidenceLevel}
          score={confidenceScore}
          isOverridden={isResolved}
        />

        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "p-1.5 rounded-md transition-all duration-150 cursor-pointer border",
            isResolved
              ? "text-[#166534] hover:text-[#14532D] hover:bg-[#DCFCE7] border-transparent hover:border-[#86EFAC]"
              : isLow
              ? "text-[#991B1B] hover:text-[#7F1D1D] hover:bg-[#FEE2E2] border border-[#FCA5A5] animate-pulse hover:animate-none"
              : "text-[#64748B] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] hover:scale-105 active:scale-95 border-transparent hover:border-[#BFDBFE]"
          )}
          title={isLow ? "This field needs your input — click to enter the value" : "Edit this extracted declaration"}
        >
          <Edit3 className="size-3.5" />
        </button>
      </div>
    </div>
  );
};
