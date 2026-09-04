import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth,
  size = "md",
}) => {
  const effectiveMaxWidth = maxWidth || size;
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={cn(
          "w-full rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_20px_50px_rgba(15,23,42,0.25)] overflow-hidden animate-in zoom-in-95 duration-200",
          maxWidthStyles[effectiveMaxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[#F1F5F9]">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
            {description && <p className="text-xs text-[#475569]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer transition-all duration-150 active:scale-95"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 text-xs text-[#0F172A] leading-relaxed">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 px-6 bg-[#F8FAFC] border-t border-[#F1F5F9]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
