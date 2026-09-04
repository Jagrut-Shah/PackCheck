"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Cpu,
  CheckSquare,
  ShieldAlert,
  Image as ImageIcon,
  Award,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InspectionStepperProps {
  inspectionId: string;
  className?: string;
}

export const InspectionStepper: React.FC<InspectionStepperProps> = ({
  inspectionId,
  className,
}) => {
  const pathname = usePathname();

  const steps = [
    {
      id: "overview",
      label: "Overview",
      href: `/inspections/${inspectionId}`,
      icon: <FileText className="size-3.5" />,
      exact: true,
    },
    {
      id: "processing",
      label: "Processing",
      href: `/inspections/${inspectionId}/processing`,
      icon: <Cpu className="size-3.5" />,
    },
    {
      id: "review",
      label: "Review Data",
      href: `/inspections/${inspectionId}/review`,
      icon: <CheckSquare className="size-3.5" />,
    },
    {
      id: "compliance",
      label: "Compliance",
      href: `/inspections/${inspectionId}/compliance`,
      icon: <ShieldAlert className="size-3.5" />,
    },
    {
      id: "evidence",
      label: "Evidence",
      href: `/inspections/${inspectionId}/evidence`,
      icon: <ImageIcon className="size-3.5" />,
    },
    {
      id: "report",
      label: "Report",
      href: `/inspections/${inspectionId}/report`,
      icon: <Award className="size-3.5" />,
    },
  ];

  const currentStepIndex = steps.findIndex((step) =>
    step.exact ? pathname === step.href : pathname.startsWith(step.href)
  );

  return (
    <nav
      aria-label="Inspection Workflow"
      className={cn(
        "flex flex-col rounded-lg border border-[#E2E8F0] bg-white shadow-2xs text-xs overflow-hidden",
        className
      )}
    >
      <div className="flex items-center overflow-x-auto p-1.5">
        <ol className="flex items-center gap-1 min-w-max w-full">
          {steps.map((step, idx) => {
            const isActive = step.exact
              ? pathname === step.href
              : pathname.startsWith(step.href);
            const isCompleted = currentStepIndex > idx;

            return (
              <li key={step.id} className="flex-1 min-w-[120px]">
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all duration-200 ease-out text-center select-none active:scale-[0.98]",
                    isActive
                      ? "bg-gradient-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] border border-[#1E40AF]"
                      : isCompleted
                      ? "text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] bg-[#EFF6FF]/60 hover:-translate-y-0.5 hover:shadow-2xs"
                      : "text-[#64748B] hover:text-[#1D4ED8] hover:bg-[#F1F5F9] hover:-translate-y-0.5 hover:shadow-2xs"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center shrink-0",
                      isActive
                        ? "text-white"
                        : isCompleted
                        ? "text-[#1D4ED8]"
                        : "text-[#94A3B8]"
                    )}
                  >
                    {isCompleted ? <Check className="size-3.5 stroke-[2.5]" /> : step.icon}
                  </span>
                  <span className="truncate">{step.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Liquid Workflow Progress Track */}
      <div className="h-1 w-full bg-[#F1F5F9] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#60A5FA] via-[#2563EB] to-[#1D4ED8] transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.5)]"
          style={{
            width: `${Math.max(16, ((currentStepIndex + 1) / steps.length) * 100)}%`,
          }}
        />
      </div>
    </nav>
  );
};
