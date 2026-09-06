import React from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, ExternalLink } from "lucide-react";
import { RuleEvaluationResult } from "@/lib/types/compliance";

interface RuleChecklistItemProps {
  result: RuleEvaluationResult;
  inspectionId?: string;
}

function cleanText(text?: string): string {
  if (!text) return "";
  return text
    .replace(/\bstatutory\s+infraction\(s\)/gi, "compliance issue(s)")
    .replace(/\bstatutory\s+infractions\b/gi, "compliance issues")
    .replace(/\bstatutory\s+infraction\b/gi, "compliance issue")
    .replace(/\binfraction\(s\)/gi, "issue(s)")
    .replace(/\binfractions\b/gi, "compliance issues")
    .replace(/\binfraction\b/gi, "compliance issue")
    .replace(/\bstatutory\s+evaluation\b/gi, "compliance evaluation")
    .replace(/\bstatutory\s+standards\b/gi, "metrology standards")
    .replace(/\bstatutory\s+declarations\b/gi, "mandatory declarations")
    .replace(/\bstatutory\s+declaration\b/gi, "mandatory declaration")
    .replace(/\bstatutory\s+criteria\b/gi, "compliance criteria")
    .replace(/\bstatutory\s+verdict\b/gi, "compliance verdict")
    .replace(/\bstatutory\s+wording\b/gi, "mandatory wording")
    .replace(/\bstatutory\s+clause\b/gi, "mandatory clause")
    .replace(/\bstatutory\s+tax\s+notice\b/gi, "mandatory tax notice")
    .replace(/\bstatutory\b/gi, "legal");
}

export const RuleChecklistItem: React.FC<RuleChecklistItemProps> = ({ result, inspectionId }) => {
  const verdict = String(result.result || result.status || "");

  const getStatusBadge = () => {
    if (verdict === "PASS") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
          <CheckCircle2 className="size-3.5" />
          PASS
        </span>
      );
    }
    if (verdict === "FAIL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
          <XCircle className="size-3.5" />
          FAIL
        </span>
      );
    }
    if (verdict === "MANUAL_REVIEW" || verdict === "WARNING" || verdict === "MANUAL_REVIEW_REQUIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
          <AlertCircle className="size-3.5" />
          REVIEW
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
        <HelpCircle className="size-3" />
        N/A
      </span>
    );
  };

  const compat = result as unknown as { ruleName?: string; ruleCode?: string };
  const observed = String(result.observedValue || result.detectedValue || "");
  const expected = result.expectedRequirement || result.expectedCondition;
  const rationale = result.explanation || result.rationale;
  const source = result.statutoryReference || result.sourceReference;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] transition-colors shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#F1F5F9] pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#0F172A]">
              {cleanText(result.ruleTitle || compat.ruleName || result.ruleId)}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
              {result.ruleNumber || compat.ruleCode || result.ruleId}
            </span>
          </div>
          {source && (
            <p className="text-[11px] text-[#1D4ED8] font-medium mt-0.5">
              {cleanText(source)}
            </p>
          )}
        </div>

        <div className="shrink-0 self-start sm:self-center">
          {getStatusBadge()}
        </div>
      </div>

      <p className="text-xs text-[#0F172A] leading-relaxed">
        {cleanText(rationale)}
      </p>

      {/* Observed vs Expected Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#475569]">Observed on Package</span>
          <p className="font-mono text-[#0F172A] font-semibold mt-0.5 break-words">
            {cleanText(observed) || <span className="text-[#94A3B8] italic">Not observed on package</span>}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-[#475569]">Legal Requirement</span>
          <p className="text-[#0F172A] font-medium mt-0.5">
            {cleanText(expected) || "Compliant with Legal Metrology (Packaged Commodities) Rules, 2011"}
          </p>
        </div>
      </div>
    </div>
  );
};
