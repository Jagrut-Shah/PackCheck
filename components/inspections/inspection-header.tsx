import React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, User, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { InspectionRecord } from "@/types/inspection";

interface InspectionHeaderProps {
  inspection: InspectionRecord;
  actions?: React.ReactNode;
}

export const InspectionHeader: React.FC<InspectionHeaderProps> = ({
  inspection,
  actions,
}) => {
  const formattedDate = new Date(inspection.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/inspections">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="size-3.5" />}
              className="text-xs"
            >
              All Inspections
            </Button>
          </Link>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#0F172A] bg-[#F1F5F9] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
            <span>{inspection.inspectionNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={inspection.status} />
          {inspection.overallResult && <StatusBadge result={inspection.overallResult} />}
          {actions}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A]">
            {inspection.commodity.commodityName}
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#475569] mt-1">
            <span className="font-semibold text-[#1D4ED8]">{inspection.commodity.brandName ?? "Generic Commodity"}</span>
            <span>•</span>
            <span className="capitalize">{inspection.commodity.category.replace(/_/g, " ").toLowerCase()}</span>
          </div>
        </div>

        {/* Metadata info strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#475569]">
            <Building2 className="size-3.5 text-[#1D4ED8] shrink-0" />
            <span className="truncate max-w-[140px]" title={inspection.commodity.manufacturerName}>
              {inspection.commodity.manufacturerName ?? "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#475569]">
            <User className="size-3.5 text-[#1D4ED8] shrink-0" />
            <span className="truncate max-w-[120px]">{inspection.inspectorName}</span>
          </div>
          <div className="flex items-center gap-2 text-[#475569]">
            <MapPin className="size-3.5 text-[#1D4ED8] shrink-0" />
            <span className="truncate max-w-[120px]">{inspection.jurisdiction}</span>
          </div>
          <div className="flex items-center gap-2 text-[#475569]">
            <Calendar className="size-3.5 text-[#1D4ED8] shrink-0" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
