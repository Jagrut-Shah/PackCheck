import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, hint, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-[#0F172A] select-none">
            {label}
            {props.required && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-9 rounded-lg border border-[#E2E8F0] bg-white pl-3 pr-8 text-xs text-[#0F172A] appearance-none transition-colors cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]",
              "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
              error && "border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 pointer-events-none text-[#94A3B8]">
            <ChevronDown className="size-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs text-[#DC2626] font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[#64748B]">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
