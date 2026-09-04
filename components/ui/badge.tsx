import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "pass" | "review" | "fail" | "info" | "draft" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  showIcon = true,
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    pass: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]",
    review: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
    fail: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
    info: "bg-[#E0F2FE] text-[#0369A1] border-[#7DD3FC]",
    draft: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
    neutral: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
  };

  const statusIcons: Record<BadgeVariant, React.ReactNode> = {
    pass: <CheckCircle2 className="size-3 text-[#166534] shrink-0" aria-hidden="true" />,
    review: <AlertTriangle className="size-3 text-[#92400E] shrink-0" aria-hidden="true" />,
    fail: <XCircle className="size-3 text-[#991B1B] shrink-0" aria-hidden="true" />,
    info: <Clock className="size-3 text-[#0369A1] shrink-0" aria-hidden="true" />,
    draft: <FileText className="size-3 text-[#64748B] shrink-0" aria-hidden="true" />,
    neutral: <Info className="size-3 text-[#64748B] shrink-0" aria-hidden="true" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border select-none leading-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {showIcon && statusIcons[variant]}
      <span>{children}</span>
    </span>
  );
};
