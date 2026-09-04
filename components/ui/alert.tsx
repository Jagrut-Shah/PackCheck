import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  children,
  action,
  className,
}) => {
  const alertStyles: Record<AlertType, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
    info: {
      border: "border-sky-200",
      bg: "bg-sky-50/80",
      text: "text-sky-900",
      icon: <Info className="size-4 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />,
    },
    success: {
      border: "border-emerald-200",
      bg: "bg-emerald-50/80",
      text: "text-emerald-900",
      icon: <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />,
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-amber-50/80",
      text: "text-amber-900",
      icon: <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />,
    },
    error: {
      border: "border-red-200",
      bg: "bg-red-50/80",
      text: "text-red-900",
      icon: <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />,
    },
  };

  const style = alertStyles[type];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-xs transition-colors",
        style.border,
        style.bg,
        style.text,
        className
      )}
    >
      {style.icon}
      <div className="flex-1 flex flex-col gap-1">
        {title && <h4 className="font-semibold text-xs leading-none tracking-tight">{title}</h4>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
