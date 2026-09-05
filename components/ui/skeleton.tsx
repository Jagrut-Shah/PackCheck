import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangular",
  ...props
}) => {
  const variantStyles = {
    text: "h-3.5 w-full rounded-xs",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn("animate-pulse bg-slate-200/80 shrink-0", variantStyles[variant], className)}
      {...props}
    />
  );
};
