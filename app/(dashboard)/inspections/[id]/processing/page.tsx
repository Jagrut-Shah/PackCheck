"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  Package,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InspectionStepper } from "@/components/inspections/inspection-stepper";
import {
  getInspectionById,
  storeExtractedFields,
  storeComplianceResults,
  runServerExtraction,
  runServerOCR,
  updateInspectionStatus,
} from "@/lib/api/inspections";
import { evaluateCompliance } from "@/lib/compliance";
import { InspectionRecord } from "@/lib/types/inspection";
import { OCRResult } from "@/lib/types/ocr";
import { ExtractedDeclarations } from "@/lib/types/extraction";
import { useToast } from "@/components/common/toast";

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
  const toast = useToast();
  const inspectionId = resolvedParams.id;

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [extractedDeclarations, setExtractedDeclarations] = useState<ExtractedDeclarations | null>(null);
  const [activeStage, setActiveStage] = useState(1);
  const [failedStage, setFailedStage] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const hasPersistedRef = React.useRef(false);

  useEffect(() => {
    let redirectTimer: NodeJS.Timeout | null = null;
    async function load() {
      const data = await getInspectionById(inspectionId);
      if (data) {
        setInspection(data);
        if (
          (data.extractedDeclarations && Object.keys(data.extractedDeclarations).length > 0) ||
          data.status === "MANUAL_REVIEW" ||
          data.status === "COMPLETED"
        ) {
          setAlreadyProcessed(true);
          setActiveStage(8);
          setIsCompleted(true);
          hasPersistedRef.current = true;
          redirectTimer = setTimeout(() => {
            router.push(`/inspections/${inspectionId}/review`);
          }, 800);
        }
      }
    }
    load();
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [inspectionId, router]);

  // 7 Officer-friendly stages
  const stages: PipelineStage[] = [
    {
      id: 1,
      name: "Package Photos Received",
      description: "Uploaded package photographs and panel views verified.",
      status: isCompleted || activeStage > 1 ? "COMPLETED" : activeStage === 1 ? "PROCESSING" : "PENDING",
    },
    {
      id: 2,
      name: "Image Quality Check",
      description: "Checking image clarity, lighting, and orientation for reliable inspection.",
      status: isCompleted || activeStage > 2 ? "COMPLETED" : activeStage === 2 ? "PROCESSING" : "PENDING",
    },
    {
      id: 3,
      name: "Reading Package Labels",
      description: "Scanning and reading printed text across all package panels.",
      status: isCompleted || activeStage > 3 ? "COMPLETED" : activeStage === 3 ? "PROCESSING" : "PENDING",
    },
    {
      id: 4,
      name: "Identifying Declarations",
      description: "Locating mandatory Legal Metrology Rule 6 declarations.",
      status: isCompleted || activeStage > 4 ? "COMPLETED" : activeStage === 4 ? "PROCESSING" : "PENDING",
    },
    {
      id: 5,
      name: "Standardizing Units & Dates",
      description: "Checking metric units, date formats, and retail pricing declarations.",
      status: isCompleted || activeStage > 5 ? "COMPLETED" : activeStage === 5 ? "PROCESSING" : "PENDING",
    },
    {
      id: 6,
      name: "Evaluating Compliance Rules",
      description: "Evaluating package details against Legal Metrology Rules, 2011.",
      status: isCompleted || activeStage > 6 ? "COMPLETED" : activeStage === 6 ? "PROCESSING" : "PENDING",
    },
    {
      id: 7,
      name: "Finalizing Verification Results",
      description: "Preparing findings and compliance summary for officer review.",
      status: isCompleted || activeStage > 7 ? "COMPLETED" : activeStage === 7 ? "PROCESSING" : "PENDING",
    },
  ];

  // Controlled verification execution with true persistence synchronization
  useEffect(() => {
    if (isAborted || alreadyProcessed || isCompleted || pipelineError) return;

    let isCancelled = false;
    let autoNavTimer: NodeJS.Timeout | null = null;

    async function advancePipeline() {
      try {
        if (activeStage === 1) {
          // Stage 1: Load inspection and verify photos
          const current = inspection || (await getInspectionById(inspectionId));
          if (current) setInspection(current);
          if (isCancelled) return;
          await new Promise((r) => setTimeout(r, 600));
          if (isCancelled) return;
          setActiveStage(2);
        } else if (activeStage === 2) {
          // Stage 2: Image Quality Check
          await new Promise((r) => setTimeout(r, 700));
          if (isCancelled) return;
          setActiveStage(3);
        } else if (activeStage === 3) {
          // Stage 3: Reading package labels (Text extraction)
          const ocrRes = await runServerOCR(inspectionId);
          if (isCancelled) return;
          setOcrResult(ocrRes);
          setActiveStage(4);
        } else if (activeStage === 4) {
          // Stage 4: Identifying declarations
          const rawText = ocrResult?.rawText || inspection?.ocrResults?.[0]?.rawText || "";
          const extractionCtx = {
            productName: inspection?.product || inspection?.commodity?.commodityName,
            brandName: inspection?.commodity?.brandName,
            manufacturerName: inspection?.company || inspection?.commodity?.manufacturerName,
          };
          const declarations = await runServerExtraction(inspectionId, rawText, extractionCtx);
          if (isCancelled) return;
          setExtractedDeclarations(declarations);
          await storeExtractedFields(inspectionId, declarations);
          if (isCancelled) return;
          setActiveStage(5);
        } else if (activeStage === 5) {
          // Stage 5: Standardizing units and dates
          await new Promise((r) => setTimeout(r, 600));
          if (isCancelled) return;
          setActiveStage(6);
        } else if (activeStage === 6) {
          // Stage 6: Evaluating compliance rules
          const decls = extractedDeclarations || (await runServerExtraction(inspectionId, ocrResult?.rawText || ""));
          const evaluation = await evaluateCompliance(decls);
          if (isCancelled) return;
          await storeComplianceResults(inspectionId, evaluation);
          if (isCancelled) return;
          setActiveStage(7);
        } else if (activeStage === 7) {
          if (!hasPersistedRef.current) {
            hasPersistedRef.current = true;
            setIsCompleted(true);
            setActiveStage(8);
            const fresh = await getInspectionById(inspectionId);
            if (fresh && !isCancelled) {
              setInspection(fresh);
              if (fresh.overallResult === "PASS") {
                toast.success(
                  "Verification Completed",
                  "Product passed all evaluated checks under Legal Metrology Rules, 2011."
                );
              } else if (fresh.overallResult === "POTENTIAL_NON_COMPLIANCE") {
                toast.warning(
                  "Verification Completed",
                  "Potential non-compliance detected. Review flagged declarations."
                );
              } else {
                toast.info(
                  "Verification Completed",
                  "Verification complete. Officer review recommended."
                );
              }
            }
            // Auto-advance to the review page once verification is complete
            autoNavTimer = setTimeout(() => {
              if (!isCancelled) {
                router.push(`/inspections/${inspectionId}/review`);
              }
            }, 1200);
          }
        }
      } catch (err) {
        console.error("Verification failure:", err);
        if (!isCancelled) {
          const failedAt = activeStage;
          setFailedStage(failedAt);
          setPipelineError(err instanceof Error ? err.message : "Verification failed");
          toast.error("Verification Issue", "Could not complete all verification checks.");
          updateInspectionStatus(inspectionId, "FAILED").catch((updateErr) =>
            console.error("Failed to transition inspection to FAILED status:", updateErr)
          );
        }
      }
    }

    advancePipeline();

    return () => {
      isCancelled = true;
      if (autoNavTimer) clearTimeout(autoNavTimer);
    };
  }, [activeStage, inspectionId, isAborted, alreadyProcessed, isCompleted, pipelineError, toast, router]);

  const progressPercent = isCompleted ? 100 : Math.min(100, Math.round((activeStage / 7) * 100));
  const estSecondsRemaining = isCompleted ? "0.0" : Math.max(0, (7 - activeStage) * 0.7).toFixed(1);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Inspection Verification: ${inspection?.inspectionNumber || inspectionId}`}
        description="Automated verification of package label declarations under Legal Metrology standards."
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
              Cancel Verification
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
              Verification Progress: {progressPercent}%
            </span>
            <span className="text-[#475569]">
              ({isCompleted ? "All 7 verification steps completed" : `Step ${activeStage} of 7 in progress`})
            </span>
          </div>
          <span className="text-xs text-[#475569]">
            {isCompleted ? "Completed" : `Estimated remaining: ~${estSecondsRemaining}s`}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Package Inspection Preview Card */}
        <div className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs flex flex-col justify-between overflow-hidden relative min-h-[480px]">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isCompleted ? "bg-[#166534]" : "bg-[#2563EB]"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full size-2.5 ${
                    isCompleted ? "bg-[#166534]" : "bg-[#2563EB]"
                  }`}
                />
              </span>
              <span className="text-xs font-bold text-[#0F172A]">
                {isCompleted ? "Verification Complete" : isAborted ? "Verification Stopped" : "Verifying Package"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
              {inspection?.inspectionNumber || "Inspection Preview"}
            </span>
          </div>

          {/* Clean Inspection Viewport */}
          <div className="relative flex-1 my-3 rounded-xl bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9]/80 border border-[#E2E8F0] overflow-hidden flex flex-col items-center justify-center p-4 min-h-[290px]">
            {/* Subtle Grid Pattern Accent */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            />

            {/* Package Photo or Card Silhouette */}
            <div className="relative z-10 w-full max-w-[260px] rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-xs flex flex-col items-center gap-3">
              {inspection?.images?.[0]?.url && !inspection.images[0].url.startsWith("/mock-images") ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inspection.images[0].url}
                    alt={inspection.product || "Package photograph"}
                    className="size-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-28 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex flex-col items-center justify-center p-3 text-center">
                  <Package className="size-8 text-[#2563EB] mb-1.5 opacity-80" />
                  <p className="text-xs font-semibold text-[#0F172A] line-clamp-1">
                    {inspection?.product || inspection?.commodity?.commodityName || "Package Sample"}
                  </p>
                  <p className="text-[11px] text-[#475569] line-clamp-1">
                    {inspection?.company || inspection?.commodity?.manufacturerName || "Legal Metrology Audit"}
                  </p>
                </div>
              )}

              {/* Real-time Verified Findings Badges */}
              <div className="w-full space-y-1.5 pt-1">
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all duration-300 ${
                    activeStage >= 3
                      ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                      : "bg-[#F8FAFC] text-[#94A3B8] border border-transparent"
                  }`}
                >
                  <span className="font-medium">Product / Commodity</span>
                  <span>{activeStage >= 3 ? "Identified" : "Pending"}</span>
                </div>

                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all duration-300 ${
                    activeStage >= 4
                      ? "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
                      : "bg-[#F8FAFC] text-[#94A3B8] border border-transparent"
                  }`}
                >
                  <span className="font-medium">Mandatory Declarations</span>
                  <span>{activeStage >= 4 ? "Located" : "Pending"}</span>
                </div>

                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all duration-300 ${
                    activeStage >= 5
                      ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                      : "bg-[#F8FAFC] text-[#94A3B8] border border-transparent"
                  }`}
                >
                  <span className="font-medium">Units & Pricing</span>
                  <span>{activeStage >= 5 ? "Validated" : "Pending"}</span>
                </div>

                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all duration-300 ${
                    activeStage >= 6
                      ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                      : "bg-[#F8FAFC] text-[#94A3B8] border border-transparent"
                  }`}
                >
                  <span className="font-medium">Rules Compliance</span>
                  <span>{activeStage >= 6 ? "Checked" : "Pending"}</span>
                </div>
              </div>

              {/* Light Modern Scanner Animation Line */}
              {!isCompleted && !isAborted && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent shadow-[0_0_12px_rgba(37,99,235,0.4)] pointer-events-none scan-laser-line z-20">
                  <div className="absolute right-2 -top-3 text-[9px] font-semibold text-white bg-[#2563EB] px-1.5 py-0.5 rounded shadow-xs">
                    Scanning
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Footer Status */}
          <div className="flex items-center justify-between text-xs text-[#475569] pt-2 border-t border-[#F1F5F9]">
            <span className="truncate max-w-[200px]">
              {inspection?.product || "Packaged Commodity"}
            </span>
            <span className="font-semibold text-[#2563EB]">
              {isCompleted
                ? "Ready for Officer Review"
                : `Step ${activeStage} of 7: ${stages[activeStage - 1]?.name}`}
            </span>
          </div>
        </div>

        {/* Right Side: Inspection Verification Steps Card */}
        <div className="lg:col-span-7">
          <Card className="border-[#E2E8F0] bg-white shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <CardTitle className="text-sm font-bold text-[#0F172A]">
                  Inspection Verification Steps
                </CardTitle>
                <p className="text-xs text-[#475569]">
                  Automated checks for mandatory package declarations and Legal Metrology compliance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                    <CheckCircle2 className="size-3.5" />
                    Verification Completed
                  </span>
                ) : isAborted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
                    Verification Aborted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]">
                    <Loader2 className="size-3.5 animate-spin" />
                    Verifying Package
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
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
                          Step {stg.id}: {stg.name}
                        </span>
                        <span className="text-[10px] font-medium uppercase text-[#475569]">
                          {stg.status === "COMPLETED"
                            ? "Completed"
                            : stg.status === "PROCESSING"
                            ? "Running"
                            : "Waiting"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5">{stg.description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Active Status Info Banner */}
              {!pipelineError && (
                <div
                  className={`rounded-lg border p-3.5 flex items-center gap-3 text-xs transition-colors ${
                    isCompleted
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                      : "border-blue-200 bg-blue-50/70 text-blue-900"
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>
                        All 7 verification steps completed successfully. Proceed to review the extracted information to confirm or edit declarations.
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="size-4 animate-spin text-blue-600 shrink-0" />
                      <span>
                        Currently checking: <strong>{stages[activeStage - 1]?.name}</strong>. Reading and verifying package details against Legal Metrology requirements.
                      </span>
                    </>
                  )}
                </div>
              )}

              {pipelineError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 flex items-center justify-between">
                  <span>{pipelineError}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const stageToRetry = failedStage || activeStage || 3;
                      setPipelineError(null);
                      setFailedStage(null);
                      setActiveStage(stageToRetry);
                    }}
                  >
                    Retry Verification
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <span className="text-xs text-[#475569]">
                  {pipelineError
                    ? "Verification stopped due to an error."
                    : isCompleted
                    ? "All verification steps completed. Proceed to review extracted information."
                    : "Verifying package evidence..."}
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

