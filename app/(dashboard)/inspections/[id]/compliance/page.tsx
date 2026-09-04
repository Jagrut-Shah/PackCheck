"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Award, ShieldCheck, Scale, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InspectionHeader } from "@/components/inspections/inspection-header";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { ComplianceVerdictBanner } from "@/components/compliance/compliance-verdict-banner";
import { ComplianceFindingCard } from "@/components/compliance/compliance-finding-card";
import { RuleChecklistItem } from "@/components/compliance/rule-checklist-item";
import { getInspectionById } from "@/lib/api/inspections";
import { InspectionRecord } from "@/lib/types/inspection";
import { MOCK_COMPLIANCE_AMUL_GHEE, MOCK_COMPLIANCE_NUTRIBITE } from "@/mocks/compliance";

interface CompliancePageProps {
  params: Promise<{ id: string }>;
}

export default function CompliancePage({ params }: CompliancePageProps) {
  const resolvedParams = use(params);
  const inspectionId = resolvedParams.id;

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getInspectionById(inspectionId);
      if (data) {
        setInspection(data);
      }
    }
    load();
  }, [inspectionId]);

  if (!inspection) {
    return (
      <div className="p-8 text-center text-xs text-[#475569]">
        Loading statutory compliance evaluation...
      </div>
    );
  }

  const compliance =
    inspection.complianceEvaluation ||
    (inspection.overallResult === "POTENTIAL_NON_COMPLIANCE"
      ? MOCK_COMPLIANCE_NUTRIBITE
      : MOCK_COMPLIANCE_AMUL_GHEE);

  const notApplicableCount =
    compliance.results.filter((r) => (r.result || r.status) === "NOT_APPLICABLE").length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <InspectionHeader inspection={inspection} />

      <InspectionStepper inspectionId={inspection.id} />

      {/* Statutory Determination Verdict Banner */}
      <ComplianceVerdictBanner
        verdict={compliance.overallResult}
        passedCount={compliance.passedCount ?? compliance.rulesPassed}
        failedCount={compliance.failedCount ?? compliance.rulesFailed}
        reviewCount={compliance.reviewCount ?? compliance.rulesManualReview}
        summaryNotes={compliance.summaryNotes}
        ruleEngineVersion={compliance.engineVersion || compliance.ruleEngineVersion}
      />

      {/* Evaluated Rules Summary Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[#475569]">Evaluated Rules</span>
          <span className="text-lg font-bold text-[#0F172A] mt-0.5">
            {compliance.rulesEvaluated || compliance.results.length}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[#166534]">Passed</span>
          <span className="text-lg font-bold text-[#166534] mt-0.5">
            {compliance.passedCount ?? compliance.rulesPassed}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[#991B1B]">Failed</span>
          <span className="text-lg font-bold text-[#991B1B] mt-0.5">
            {compliance.failedCount ?? compliance.rulesFailed}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[#92400E]">Manual Review</span>
          <span className="text-lg font-bold text-[#92400E] mt-0.5">
            {compliance.reviewCount ?? compliance.rulesManualReview}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[#475569]">Not Applicable</span>
          <span className="text-lg font-bold text-[#475569] mt-0.5">
            {notApplicableCount}
          </span>
        </div>
      </div>

      {/* Section: Non-Compliance Findings & Infractions */}
      {inspection.findings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
              Statutory Infractions & Observations ({inspection.findings.length})
            </h2>
            <span className="text-[11px] text-[#475569]">
              Direct Legal Metrology Act, 2009 citations
            </span>
          </div>

          <div className="space-y-3">
            {inspection.findings.map((finding) => (
              <ComplianceFindingCard
                key={finding.id}
                finding={finding}
                inspectionId={inspection.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section: Itemized Rules Evaluation Checklist */}
      <Card className="border-[#E2E8F0] bg-white shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Statutory Rules Evaluation Checklist
            </CardTitle>
            <p className="text-xs text-[#475569]">
              Deterministic rule execution under PCR-2011 Rule 6, 7 & Schedule II
            </p>
          </div>
          <span className="text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-2.5 py-1 rounded-md border border-[#BFDBFE]">
            {compliance.results.length} Rules Verified
          </span>
        </CardHeader>

        <CardContent className="p-6 space-y-3">
          {compliance.results.map((result) => (
            <RuleChecklistItem
              key={result.ruleId}
              result={result}
              inspectionId={inspection.id}
            />
          ))}
        </CardContent>

        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl flex items-center justify-between">
          <Link href={`/inspections/${inspection.id}/review`}>
            <Button variant="secondary" size="sm">
              Back to Review
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/inspections/${inspection.id}/evidence`}>
              <Button variant="secondary" size="sm" leftIcon={<ImageIcon className="size-3.5" />}>
                Photographic Evidence
              </Button>
            </Link>

            <Link href={`/inspections/${inspection.id}/report`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                Proceed to Verification Report
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
