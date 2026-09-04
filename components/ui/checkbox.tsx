import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, checked, disabled, onChange, ...props }, ref) => {
    const checkboxId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex items-start gap-2.5 cursor-pointer select-none",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              "size-4 rounded border border-[#CBD5E1] bg-white transition-all duration-150 flex items-center justify-center hover:border-[#2563EB] hover:shadow-2xs active:scale-90",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-[#2563EB] peer-focus-visible:ring-offset-1",
              "peer-checked:bg-gradient-to-b peer-checked:from-[#2563EB] peer-checked:to-[#1D4ED8] peer-checked:border-[#1E40AF] peer-checked:text-white peer-checked:shadow-2xs",
              className
            )}
          >
            <Check className="size-3 stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && <span className="text-xs font-semibold text-[#0F172A]">{label}</span>}
            {description && <span className="text-xs text-[#475569]">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
