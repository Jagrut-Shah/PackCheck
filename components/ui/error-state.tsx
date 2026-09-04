import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Failed to load content",
  description = "An error occurred while loading this section. Please try again or contact system support.",
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-[#FCA5A5] bg-[#FEE2E2]/35 my-4",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-[#FEE2E2] border border-[#FCA5A5] mb-3 text-[#991B1B]">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-sm font-bold text-[#991B1B] mb-1">{title}</h3>
      <p className="text-xs text-[#475569] max-w-sm mb-4 leading-relaxed">{description}</p>
      {onRetry && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onRetry}
        >
          Retry Load
        </Button>
      )}
    </div>
  );
};
