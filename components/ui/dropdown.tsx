import React from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = "left" }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-40 mt-1.5 min-w-[170px] rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] animate-in fade-in-80 zoom-in-95 duration-100",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                }
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-all duration-150 text-left select-none active:scale-[0.98]",
                item.destructive
                  ? "text-[#DC2626] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                  : "text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
                item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {item.icon && <span className="size-4 shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
