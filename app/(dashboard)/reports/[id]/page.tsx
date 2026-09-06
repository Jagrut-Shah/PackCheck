"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportSummaryView } from "@/components/reports/report-summary-view";
import { getReportById } from "@/lib/api/reports";
import { VerificationReportData } from "@/lib/types/report";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;

  const [report, setReport] = useState<VerificationReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await getReportById(reportId);
        setReport(data);
      } catch (err) {
        console.error("Error loading report", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [reportId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#475569]">
        Loading inspection report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">Report Not Found</h2>
        <p className="text-xs text-[#475569]">
          No compliance report exists with identifier &quot;{reportId}&quot;.
        </p>
        <Link href="/reports">
          <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />}>
            Back to Reports List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/reports">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="size-3.5" />}>
            All Reports
          </Button>
        </Link>
      </div>

      <ReportSummaryView report={report} />
    </div>
  );
}
