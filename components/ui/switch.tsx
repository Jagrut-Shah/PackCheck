import React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked: controlledChecked,
  defaultChecked = false,
  disabled = false,
  label,
  description,
  onChange,
  className,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", disabled && "opacity-50 cursor-not-allowed", className)}>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 active:scale-95",
          isChecked ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]" : "bg-[#E2E8F0] hover:bg-[#CBD5E1]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-0 transition duration-200 ease-out",
            isChecked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <label htmlFor={switchId} onClick={toggle} className="flex flex-col cursor-pointer">
          {label && <span className="text-xs font-semibold text-[#0F172A]">{label}</span>}
          {description && <span className="text-xs text-[#475569]">{description}</span>}
        </label>
      )}
    </div>
  );
};
