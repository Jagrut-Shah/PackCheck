"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InspectionHeader } from "@/components/inspections/inspection-header";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { ReportSummaryView } from "@/components/reports/report-summary-view";
import { getInspectionById } from "@/lib/api/inspections";
import { getReportById } from "@/lib/api/reports";
import { InspectionRecord } from "@/lib/types/inspection";
import { VerificationReportData } from "@/lib/types/report";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default function InspectionReportPage({ params }: ReportPageProps) {
  const resolvedParams = use(params);
  const inspectionId = resolvedParams.id;

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [report, setReport] = useState<VerificationReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [inspData, repData] = await Promise.all([
          getInspectionById(inspectionId),
          getReportById(inspectionId),
        ]);
        setInspection(inspData);
        setReport(repData);
      } catch (err) {
        console.error("Error loading inspection report", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [inspectionId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#475569]">
        Loading inspection report...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">Inspection Not Found</h2>
        <p className="text-xs text-[#475569]">
          No inspection record exists with identifier &quot;{inspectionId}&quot;.
        </p>
        <Link href="/inspections">
          <Button variant="primary" size="sm">
            Back to Inspections List
          </Button>
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <InspectionHeader inspection={inspection} />
        <InspectionStepper inspectionId={inspection.id} />
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center space-y-4 shadow-2xs">
          <h3 className="text-base font-bold text-[#0F172A]">Verification Report Not Generated Yet</h3>
          <p className="text-xs text-[#475569] max-w-md mx-auto">
            The compliance report is generated after evaluating required Rule 6 declarations.
          </p>
          <Link href={`/inspections/${inspection.id}/compliance`}>
            <Button variant="primary" size="sm">
              Proceed to Compliance Checks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <InspectionHeader inspection={inspection} />

      <InspectionStepper inspectionId={inspection.id} />

      <ReportSummaryView report={report} />
    </div>
  );
}
