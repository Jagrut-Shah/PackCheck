"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import { getInspectionById, updateInspectionStatus } from "@/lib/api/inspections";
import { InspectionRecord } from "@/types/inspection";

interface ProcessingPageProps {
  params: Promise<{ id: string }>;
}

interface PipelineStage {
  id: number;
  name: string;
  description: string;
  status: "COMPLETED" | "PROCESSING" | "PENDING";
}

export default function ProcessingPage({ params }: ProcessingPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const inspectionId = resolvedParams.id;

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [activeStage, setActiveStage] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "10:42:01.120 [INGESTION] Package photograph payload received. Checksum: SHA-256 (3 files validated).",
  ]);

  useEffect(() => {
    async function load() {
      const data = await getInspectionById(inspectionId);
      if (data) {
        setInspection(data);
      }
    }
    load();
  }, [inspectionId]);

  // 7 Stages as explicitly specified
  const stages: PipelineStage[] = [
    {
      id: 1,
      name: "Images received",
      description: "Package photograph payloads received, stored, and checksum validated.",
      status: activeStage > 1 ? "COMPLETED" : activeStage === 1 ? "PROCESSING" : "PENDING",
    },
    {
      id: 2,
      name: "Image preparation",
      description: "OpenCV deskewing, noise reduction, and contrast enhancement.",
      status: activeStage > 2 ? "COMPLETED" : activeStage === 2 ? "PROCESSING" : "PENDING",
    },
    {
      id: 3,
      name: "Text extraction",
      description: "PaddleOCR optical character recognition & pixel coordinate mapping.",
      status: activeStage > 3 ? "COMPLETED" : activeStage === 3 ? "PROCESSING" : "PENDING",
    },
    {
      id: 4,
      name: "Declaration identification",
      description: "Legal Metrology Rule 6 statutory field classification.",
      status: activeStage > 4 ? "COMPLETED" : activeStage === 4 ? "PROCESSING" : "PENDING",
    },
    {
      id: 5,
      name: "Data normalization",
      description: "SI units standardization, date formatting, and MRP tax validation.",
      status: activeStage > 5 ? "COMPLETED" : activeStage === 5 ? "PROCESSING" : "PENDING",
    },
    {
      id: 6,
      name: "Compliance assessment",
      description: "Deterministic evaluation against Legal Metrology Rules, 2011.",
      status: activeStage > 6 ? "COMPLETED" : activeStage === 6 ? "PROCESSING" : "PENDING",
    },
    {
      id: 7,
      name: "Result preparation",
      description: "Findings aggregation, evidentiary bounding boxes, and draft report.",
      status: activeStage > 7 ? "COMPLETED" : activeStage === 7 ? "PROCESSING" : "PENDING",
    },
  ];

  const logMessages: Record<number, string> = {
    2: "10:42:01.780 [OPENCV] Deskew matrix calculated. Contrast enhanced (gamma=1.2). 3 panels prepped.",
    3: "10:42:02.430 [PADDLE_OCR] Text detection completed. 48 bounding boxes mapped with avg conf 94.8%.",
    4: "10:42:03.110 [FIELD_CLASSIFIER] Rule 6 declarations matched: 17/17 mandatory fields classified.",
    5: "10:42:03.750 [NORMALIZER] Units normalized to standard SI (L / ml). Date formatted to MM/YYYY.",
    6: "10:42:04.390 [RULES_ENGINE] Evaluated 17 statutory checks against PCR-2011 amendment 2024.",
    7: "10:42:05.020 [REPORT_BUILDER] Verification package assembled with cryptographic hash.",
  };

  // Controlled timed simulation
  useEffect(() => {
    if (isAborted) return;

    if (activeStage <= 7) {
      const timer = setTimeout(() => {
        if (activeStage === 7) {
          setIsCompleted(true);
          updateInspectionStatus(inspectionId, "MANUAL_REVIEW");
        } else {
          setActiveStage((prev) => {
            const next = prev + 1;
            if (logMessages[next]) {
              setLogs((l) => [...l, logMessages[next]]);
            }
            return next;
          });
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [activeStage, inspectionId, isAborted]);

  const progressPercent = Math.min(100, Math.round((activeStage / 7) * 100));
  const estSecondsRemaining = Math.max(0, (7 - activeStage) * 0.7).toFixed(1);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Verification Pipeline: ${inspection?.inspectionNumber || inspectionId}`}
        description="Automated statutory label processing pipeline executing under Legal Metrology calibration standards."
        actions={
          !isCompleted && !isAborted ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAborted(true);
                router.push(`/inspections/${inspectionId}`);
              }}
            >
              Abort Run
            </Button>
          ) : undefined
        }
      />

      <InspectionStepper inspectionId={inspectionId} />

      {/* Progress & Timing Bar */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F172A]">
              Pipeline Progress: {progressPercent}%
            </span>
            <span className="text-[#475569]">
              ({isCompleted ? "7 of 7 stages completed" : `Stage ${activeStage} of 7 active`})
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#475569]">
            {isCompleted ? "Finished in 4.9s" : `Est. remaining: ~${estSecondsRemaining}s`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Optical Scanning HUD View with Laser Sweep */}
        <div className="lg:col-span-5 rounded-xl border border-[#0F172A] bg-[#0B1329] p-5 text-white shadow-sm flex flex-col justify-between overflow-hidden relative min-h-[420px]">
          {/* HUD Top Bar */}
          <div className="flex items-center justify-between z-10 text-[10px] font-mono text-[#94A3B8] border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isCompleted ? "bg-[#22C55E]" : "bg-[#3B82F6]"} opacity-75`} />
                <span className={`relative inline-flex rounded-full size-2 ${isCompleted ? "bg-[#22C55E]" : "bg-[#3B82F6]"}`} />
              </span>
              <span className="font-bold text-white uppercase tracking-wider">
                {isCompleted ? "SCAN COMPLETE" : "OPTICAL SWEEP ACTIVE"}
              </span>
            </div>
            <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] font-mono text-[#93C5FD]">
              300 DPI • CALIBRATED
            </span>
          </div>

          {/* HUD Scanning Viewport with Holographic Reticle */}
          <div className="relative flex-1 my-3 rounded-lg bg-[#030712] border border-[#1E293B] overflow-hidden flex items-center justify-center p-4 min-h-[260px]">
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #3B82F6 1px, transparent 1px), linear-gradient(to bottom, #3B82F6 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />

            {/* Reticle Target Corner Marks */}
            <div className="absolute top-2.5 left-2.5 size-3.5 border-t-2 border-l-2 border-[#38BDF8]" />
            <div className="absolute top-2.5 right-2.5 size-3.5 border-t-2 border-r-2 border-[#38BDF8]" />
            <div className="absolute bottom-2.5 left-2.5 size-3.5 border-b-2 border-l-2 border-[#38BDF8]" />
            <div className="absolute bottom-2.5 right-2.5 size-3.5 border-b-2 border-r-2 border-[#38BDF8]" />

            {/* Optical Center Crosshair */}
            <div className="absolute size-6 pointer-events-none opacity-40">
              <div className="w-full h-px bg-[#38BDF8] absolute top-1/2 -translate-y-1/2" />
              <div className="h-full w-px bg-[#38BDF8] absolute left-1/2 -translate-x-1/2" />
            </div>

            {/* Package Label Silhouette */}
            <div className="relative w-48 h-56 rounded border border-dashed border-[#3B82F6]/50 bg-[#0F172A]/80 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="w-20 h-2 bg-[#60A5FA]/40 rounded animate-pulse" />
                  <div className="w-12 h-1.5 bg-[#60A5FA]/20 rounded" />
                </div>
                <div className="text-[8px] font-mono text-[#38BDF8] border border-[#38BDF8]/40 px-1 py-0.5 rounded bg-[#0284C7]/20">
                  PDP PANEL
                </div>
              </div>

              {/* Dynamic OCR Bounding Boxes Unlocked per Stage */}
              <div className="space-y-2 py-1">
                <div
                  className={`p-1 rounded border transition-all duration-300 text-[8.5px] font-mono leading-tight ${
                    activeStage >= 3
                      ? "border-[#22C55E] bg-[#22C55E]/15 text-[#86EFAC]"
                      : "border-transparent text-transparent"
                  }`}
                >
                  [COMMODITY: {inspection?.product || "Pure Ghee 1L Tin"}]
                </div>
                <div
                  className={`p-1 rounded border transition-all duration-300 text-[8.5px] font-mono leading-tight ${
                    activeStage >= 4
                      ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#BAE6FD]"
                      : "border-transparent text-transparent"
                  }`}
                >
                  [NET QUANTITY: 1 L (905 g)]
                </div>
                <div
                  className={`p-1 rounded border transition-all duration-300 text-[8.5px] font-mono leading-tight ${
                    activeStage >= 5
                      ? "border-[#F59E0B] bg-[#F59E0B]/15 text-[#FDE68A]"
                      : "border-transparent text-transparent"
                  }`}
                >
                  [MRP: ₹650.00 INCL OF ALL TAXES]
                </div>
              </div>

              <div className="flex justify-between items-end text-[7.5px] font-mono text-[#64748B]">
                <span>RULE 6(1) PDP</span>
                <span className="text-[#38BDF8]">
                  {activeStage >= 6 ? "VERIFIED (17/17)" : `EXTRACTING...`}
                </span>
              </div>

              {/* Laser Sweep Line */}
              {!isCompleted && !isAborted && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#60A5FA] to-transparent shadow-[0_0_12px_#3B82F6,0_0_24px_#2563EB] pointer-events-none scan-laser-line z-20">
                  <div className="absolute right-1 -top-3 text-[7px] font-mono font-bold text-[#93C5FD] bg-[#1E3A8A] px-1 rounded shadow-xs">
                    SCAN BEAM
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* HUD Footer Status */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] pt-1">
            <span>ENGINE: PaddleOCR v2.6</span>
            <span className="text-[#38BDF8] font-bold">
              {isCompleted ? "READY FOR VERIFICATION" : `STAGE ${activeStage}/7: ${stages[activeStage - 1]?.name}`}
            </span>
          </div>
        </div>

        {/* Pipeline Execution Sequence & Logs */}
        <div className="lg:col-span-7">
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <CardTitle className="text-sm font-bold text-[#0F172A]">
                  Pipeline Execution Sequence
                </CardTitle>
                <p className="text-xs text-[#475569]">
                  Sequential validation stages: Ingestion → OCR → Structuring → Compliance
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                    <CheckCircle2 className="size-3.5" />
                    Pipeline Completed
                  </span>
                ) : isAborted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
                    Pipeline Aborted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]">
                    <Loader2 className="size-3.5 animate-spin" />
                    Executing Stages
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <ol className="space-y-2.5">
                {stages.map((stg) => (
                  <li
                    key={stg.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                      stg.status === "COMPLETED"
                        ? "border-[#86EFAC] bg-[#DCFCE7]/35"
                        : stg.status === "PROCESSING"
                        ? "border-[#2563EB] bg-[#EFF6FF] shadow-xs ring-1 ring-[#2563EB]"
                        : "border-[#E2E8F0] bg-[#F8FAFC] opacity-60"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {stg.status === "COMPLETED" ? (
                        <CheckCircle2 className="size-4 text-[#166534]" />
                      ) : stg.status === "PROCESSING" ? (
                        <Loader2 className="size-4 text-[#1D4ED8] animate-spin" />
                      ) : (
                        <Circle className="size-4 text-[#94A3B8]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">
                          Stage {stg.id}: {stg.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#475569]">
                          {stg.status === "COMPLETED"
                            ? "Completed"
                            : stg.status === "PROCESSING"
                            ? "Running"
                            : "Pending"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5">{stg.description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Execution Log Stream */}
              <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-3 text-[11px] font-mono text-[#F8FAFC] space-y-1 max-h-36 overflow-y-auto">
                <div className="text-[10px] uppercase font-bold text-[#94A3B8] pb-1 border-b border-white/10 flex justify-between">
                  <span>Execution Log Stream</span>
                  <span>ENGINE: PaddleOCR v2.6.0</span>
                </div>
                {logs.map((lg, i) => (
                  <p key={i} className="leading-relaxed opacity-90">{lg}</p>
                ))}
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <span className="text-xs text-[#475569]">
                  {isCompleted
                    ? "All 7 stages evaluated. Proceed to verify extracted statutory declarations."
                    : "Processing package evidence..."}
                </span>

                <Button
                  variant="primary"
                  size="md"
                  disabled={!isCompleted}
                  onClick={() => router.push(`/inspections/${inspectionId}/review`)}
                  rightIcon={<ArrowRight className="size-4" />}
                >
                  Review Extracted Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
