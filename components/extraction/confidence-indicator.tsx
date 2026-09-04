import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { ConfidenceLevel } from "@/types/common";

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  score?: number; // 0.0 to 1.0
  className?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  level,
  score,
  className = "",
}) => {
  const percentage = score !== undefined ? `${Math.round(score * 100)}%` : "";

  switch (level) {
    case "HIGH":
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono text-[#166534] font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] border border-[#86EFAC] ${className}`}
          title="High OCR / Extraction Confidence"
        >
          <span className="size-1.5 rounded-full bg-[#166534]" aria-hidden="true" />
          <span>{percentage || "95%+"}</span>
        </span>
      );
    case "MEDIUM":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] ${className}`}
          title="Medium Confidence - Review Suggested"
        >
          <AlertCircle className="size-3 shrink-0" />
          <span>MED {percentage && `(${percentage})`}</span>
        </span>
      );
    case "LOW":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] ${className}`}
          title="Low Confidence - Manual Verification Required"
        >
          <AlertTriangle className="size-3 shrink-0" />
          <span>LOW {percentage && `(${percentage})`}</span>
        </span>
      );
    default:
      return null;
  }
};
