import React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  bordered?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, bordered = false, ...props }, ref) => (
    <div
      className={cn(
        "w-full overflow-x-auto",
        bordered && "rounded-lg border border-[#E2E8F0] bg-white",
        containerClassName
      )}
    >
      <table
        ref={ref}
        className={cn("w-full text-left text-xs text-[#0F172A] border-collapse", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#0F172A] font-semibold", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-[#F1F5F9]", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("transition-colors duration-150 hover:bg-[#F8FAFC]", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("px-4 py-3 font-semibold text-[#64748B] uppercase tracking-wider text-[10px]", className)} {...props} />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3.5 text-[#0F172A] align-middle", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";
