import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <FolderOpen className="size-8 text-slate-400" />,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 my-4",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 border border-slate-200 mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
