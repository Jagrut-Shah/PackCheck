"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { InspectionHeader } from "@/components/inspections/inspection-header";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { EvidenceViewer } from "@/components/evidence/evidence-viewer";
import { getInspectionById } from "@/lib/api/inspections";
import { InspectionRecord } from "@/lib/types/inspection";
import { MOCK_OCR_AMUL_GHEE, MOCK_OCR_NUTRIBITE_COOKIES } from "@/mocks/ocr";

interface EvidencePageProps {
  params: Promise<{ id: string }>;
}

export default function EvidencePage({ params }: EvidencePageProps) {
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
        Loading photographic evidence...
      </div>
    );
  }

  // Use real ocrResults when OCR service is integrated.
  // For now, fall back to mock OCR overlays matched by product name.
  // NOTE: The IMAGE shown in the viewport is the real Supabase Storage photo.
  const isLegacyMock =
    inspection.id.startsWith("ins_") ||
    inspection.id.startsWith("INSP-") ||
    inspection.id === "insp_amul_ghee";

  const productHint = (
    inspection.product ||
    inspection.commodity?.commodityName ||
    ""
  ).toLowerCase();

  const fallbackOcr =
    productHint.includes("nutribite") || productHint.includes("cookie")
      ? MOCK_OCR_NUTRIBITE_COOKIES
      : MOCK_OCR_AMUL_GHEE;

  const ocrResults =
    inspection.ocrResults && inspection.ocrResults.length > 0
      ? inspection.ocrResults
      : isLegacyMock
      ? [fallbackOcr]
      : [];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <InspectionHeader inspection={inspection} />

      <InspectionStepper inspectionId={inspection.id} />

      <PageHeader
        title="Photographic Evidence & OCR Coordinate Verification"
        description="Inspect high-resolution package label captures with localized bounding boxes and optical character recognition blocks."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/inspections/${inspection.id}/compliance`}>
              <Button variant="secondary" size="sm">
                Back to Compliance
              </Button>
            </Link>
            <Link href={`/inspections/${inspection.id}/report`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                Verification Report
              </Button>
            </Link>
          </div>
        }
      />

      <EvidenceViewer
        images={inspection.images}
        ocrResults={ocrResults}
        findings={inspection.findings}
        inspectionId={inspection.id}
      />
    </div>
  );
}
