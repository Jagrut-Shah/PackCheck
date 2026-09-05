import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#E2E8F0] mb-6", className)}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-xs text-[#475569] max-w-3xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
