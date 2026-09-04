"use client";

import React, { useState, useEffect, use } from "react";
import { InspectionHeader } from "@/components/inspections/inspection-header";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { ReportSummaryView } from "@/components/reports/report-summary-view";
import { getInspectionById } from "@/lib/api/inspections";
import { getReportById } from "@/lib/api/reports";
import { InspectionRecord } from "@/types/inspection";
import { VerificationReportData } from "@/types/report";

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

  if (isLoading || !inspection || !report) {
    return (
      <div className="p-12 text-center text-xs text-[#475569]">
        Loading statutory verification report...
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
