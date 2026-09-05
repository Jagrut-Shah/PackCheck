import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "destructive" | "teal" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-lg cursor-pointer transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none select-none active:scale-[0.97] active:translate-y-0";

    const variantStyles = {
      primary:
        "bg-gradient-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white border border-[#1E40AF] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_3px_rgba(29,78,216,0.25)] hover:from-[#3B82F6] hover:via-[#2563EB] hover:to-[#1D4ED8] hover:shadow-[0_4px_16px_rgba(29,78,216,0.32),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]",
      teal:
        "bg-gradient-to-b from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white border border-[#1E40AF] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_3px_rgba(29,78,216,0.25)] hover:from-[#3B82F6] hover:via-[#2563EB] hover:to-[#1D4ED8] hover:shadow-[0_4px_16px_rgba(29,78,216,0.32),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]",
      secondary:
        "bg-gradient-to-b from-white to-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] hover:from-white hover:to-white hover:border-[#CBD5E1] hover:text-[#1D4ED8] hover:shadow-[0_3px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 active:bg-[#F1F5F9]",
      outline:
        "bg-gradient-to-b from-white to-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] hover:from-white hover:to-white hover:border-[#CBD5E1] hover:text-[#1D4ED8] hover:shadow-[0_3px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 active:bg-[#F1F5F9]",
      tertiary:
        "bg-transparent text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:-translate-y-0.5 hover:shadow-2xs active:bg-[#DBEAFE]",
      ghost:
        "bg-transparent text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:-translate-y-0.5 hover:shadow-2xs active:bg-[#DBEAFE]",
      destructive:
        "bg-gradient-to-b from-[#EF4444] via-[#DC2626] to-[#B91C1C] text-white border border-[#991B1B] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(220,38,38,0.25)] hover:from-[#F87171] hover:via-[#EF4444] hover:to-[#DC2626] hover:shadow-[0_4px_16px_rgba(220,38,38,0.38),inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-xs font-semibold gap-2",
      lg: "h-10 px-5 text-xs font-semibold gap-2",
      icon: "size-8 p-0 text-[#64748B] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] rounded-lg",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin text-current" data-icon="inline-start" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
