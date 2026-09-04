import React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold tracking-tight text-[#0F172A]">{title}</h2>
        {description && <p className="text-xs text-[#475569]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
