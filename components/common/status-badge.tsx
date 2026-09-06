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
    const config = RESULT_CONFIG[result as OverallResult];
    if (!config) {
      return (
        <Badge variant="neutral" className={className}>
          {result || "Unknown"}
        </Badge>
      );
    }
    return (
      <Badge variant={variantMap[result as OverallResult] || "neutral"} className={className}>
        {config.label}
      </Badge>
    );
  }

  if (status !== undefined && status !== null) {
    const variantMap: Record<InspectionStatus, BadgeVariant> = {
      COMPLETED: "pass",
      MANUAL_REVIEW: "review",
      PROCESSING: "info",
      PENDING: "info",
      DRAFT: "draft",
      FAILED: "fail",
    };
    const config = STATUS_CONFIG[status as InspectionStatus];
    if (!config) {
      return (
        <Badge variant="neutral" className={className}>
          {status || "Unknown"}
        </Badge>
      );
    }
    return (
      <Badge variant={variantMap[status as InspectionStatus] || "neutral"} className={className}>
        {config.label}
      </Badge>
    );
  }

  if (quality) {
    const variantMap: Record<ImageQualityStatus, BadgeVariant> = {
      PASSED: "pass",
      RETAKE_REQUIRED: "fail",
      PENDING: "info",
    };
    const config = QUALITY_CONFIG[quality as ImageQualityStatus];
    if (!config) {
      return (
        <Badge variant="neutral" className={className}>
          {quality || "Unknown"}
        </Badge>
      );
    }
    return (
      <Badge variant={variantMap[quality as ImageQualityStatus] || "neutral"} className={className}>
        {config.label}
      </Badge>
    );
  }

  return null;
};
