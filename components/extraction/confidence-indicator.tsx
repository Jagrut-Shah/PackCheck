import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, CheckCheck } from "lucide-react";
import { ConfidenceLevel } from "@/lib/types/common";

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  score?: number; // 0.0 to 1.0
  isOverridden?: boolean; // officer has corrected this field
  className?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  level,
  score,
  isOverridden,
  className = "",
}) => {
  // If officer has corrected this field, always show RESOLVED badge
  if (isOverridden) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] ${className}`}
        title="This field was corrected by the inspecting officer and is now verified."
      >
        <CheckCheck className="size-3.5 shrink-0" />
        Resolved
      </span>
    );
  }

  switch (level) {
    case "HIGH":
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] ${className}`}
          title={`System confidence: ${score !== undefined ? Math.round(score * 100) : 95}%. The system is confident it read this label correctly. No action needed.`}
        >
          <CheckCircle2 className="size-3.5 shrink-0" />
          Verified
        </span>
      );
    case "MEDIUM":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] ${className}`}
          title={`System confidence: ${score !== undefined ? Math.round(score * 100) : 70}%. The system may have partially read this field. Please visually confirm the value matches the package.`}
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          Please Review
        </span>
      );
    case "LOW":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] ${className}`}
          title="This field could not be read from the label. You must click the edit (✏️) icon and enter the correct value from the physical package."
        >
          <XCircle className="size-3.5 shrink-0" />
          Action Needed
        </span>
      );
    default:
      return null;
  }
};
