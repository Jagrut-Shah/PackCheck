import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#0F172A] select-none">
            {label}
            {props.required && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 text-[#94A3B8] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]",
              "disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed",
              error && "border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#94A3B8] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
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

Input.displayName = "Input";
