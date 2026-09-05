import React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeTab = controlledValue !== undefined ? controlledValue : internalValue;

  const setActiveTab = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [controlledValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("flex flex-col gap-4 w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("inline-flex items-center gap-1 rounded-lg bg-[#F1F5F9] p-1 border border-[#E2E8F0] self-start shadow-2xs", className)}>
    {children}
  </div>
);

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, icon, className }) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 active:scale-[0.97]",
        isActive
          ? "bg-white text-[#1D4ED8] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] border border-[#CBD5E1]"
          : "text-[#64748B] hover:text-[#1D4ED8] hover:bg-white/80 hover:shadow-2xs",
        className
      )}
    >
      {icon && <span className="size-4 shrink-0 text-current">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({
  value,
  children,
  className,
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={cn("w-full animate-in fade-in duration-150", className)}>
      {children}
    </div>
  );
};
