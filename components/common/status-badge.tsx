/**
 * PackCheck AI - Standardized Status Badge
 * Implements project-wide UI standard: Always renders Icon + Text + Color.
 */

import React from "react";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { InspectionStatus, OverallResult, ImageQualityStatus } from "@/lib/types/common";
import { STATUS_CONFIG, RESULT_CONFIG, QUALITY_CONFIG } from "@/config/constants";

interface StatusBadgeProps {
  status?: InspectionStatus;
  result?: OverallResult;
  quality?: ImageQualityStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  result,
  quality,
  className,
}) => {
  if (result) {
    const variantMap: Record<OverallResult, BadgeVariant> = {
      PASS: "pass",
      POTENTIAL_NON_COMPLIANCE: "fail",
      MANUAL_REVIEW: "review",
    };
    return (
      <Badge variant={variantMap[result]} className={className}>
        {RESULT_CONFIG[result].label}
      </Badge>
    );
  }

  if (status) {
    const variantMap: Record<InspectionStatus, BadgeVariant> = {
      COMPLETED: "pass",
      MANUAL_REVIEW: "review",
      PROCESSING: "info",
      DRAFT: "draft",
    };
    return (
      <Badge variant={variantMap[status]} className={className}>
        {STATUS_CONFIG[status].label}
      </Badge>
    );
  }

  if (quality) {
    const variantMap: Record<ImageQualityStatus, BadgeVariant> = {
      PASSED: "pass",
      RETAKE_REQUIRED: "fail",
      PENDING: "info",
    };
    return (
      <Badge variant={variantMap[quality]} className={className}>
        {QUALITY_CONFIG[quality].label}
      </Badge>
    );
  }

  return null;
};
