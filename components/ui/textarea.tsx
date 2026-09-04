import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, disabled, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-[#0F172A] select-none">
            {label}
            {props.required && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors resize-y",
            "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]",
            "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
            error && "border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#DC2626] font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[#64748B]">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
