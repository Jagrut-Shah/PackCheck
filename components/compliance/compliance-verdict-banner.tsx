import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Scale } from "lucide-react";
import { OverallResult } from "@/lib/types/common";
import { RESULT_CONFIG } from "@/config/constants";

interface ComplianceVerdictBannerProps {
  verdict: OverallResult;
  passedCount: number;
  failedCount: number;
  reviewCount: number;
  summaryNotes?: string;
  ruleEngineVersion?: string;
}

export const ComplianceVerdictBanner: React.FC<ComplianceVerdictBannerProps> = ({
  verdict,
  passedCount,
  failedCount,
  reviewCount,
  summaryNotes,
  ruleEngineVersion = "PCR-2011-AMENDED-2024.1",
}) => {
  const config = RESULT_CONFIG[verdict];

  const getVerdictIcon = () => {
    switch (verdict) {
      case "PASS":
        return <CheckCircle2 className="size-6 text-[#166534] shrink-0" />;
      case "POTENTIAL_NON_COMPLIANCE":
        return <XCircle className="size-6 text-[#991B1B] shrink-0" />;
      case "MANUAL_REVIEW":
        return <AlertTriangle className="size-6 text-[#92400E] shrink-0" />;
    }
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-2xs ${config.borderClass} ${config.bgClass}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-white shadow-2xs flex items-center justify-center">
            {getVerdictIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#475569]">
                Statutory Determination
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#475569] border border-black/10">
                {ruleEngineVersion}
              </span>
            </div>
            <h2 className={`text-base sm:text-lg font-bold ${config.textClass}`}>
              {config.label}
            </h2>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-2.5 py-1 rounded bg-white text-[#166534] border border-[#86EFAC]">
            {passedCount} Passed
          </span>
          {failedCount > 0 && (
            <span className="px-2.5 py-1 rounded bg-white text-[#991B1B] border border-[#FCA5A5]">
              {failedCount} Infractions
            </span>
          )}
          {reviewCount > 0 && (
            <span className="px-2.5 py-1 rounded bg-white text-[#92400E] border border-[#FCD34D]">
              {reviewCount} Under Review
            </span>
          )}
        </div>
      </div>

      {summaryNotes && (
        <p className="text-xs text-[#0F172A] mt-3 leading-relaxed">
          {summaryNotes}
        </p>
      )}

      <div className="flex items-center gap-2 text-[11px] text-[#475569] mt-3 pt-3 border-t border-black/5">
        <Scale className="size-3.5 text-[#1D4ED8] shrink-0" />
        <span>
          Evaluated strictly under Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011.
        </span>
      </div>
    </div>
  );
};
