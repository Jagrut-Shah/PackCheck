import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHomeIcon = true,
  className,
}) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-xs text-[#64748B]", className)}>
      <ol className="inline-flex items-center gap-1.5 flex-wrap">
        {showHomeIcon && (
          <li className="inline-flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="text-[#94A3B8] hover:text-[#1D4ED8] transition-colors cursor-pointer flex items-center"
              aria-label="Dashboard Home"
            >
              <Home className="size-3.5" />
            </Link>
            <ChevronRight className="size-3 text-[#CBD5E1] shrink-0" />
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              {isLast ? (
                <span className="font-bold text-[#0F172A]" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              )}
              {!isLast && <ChevronRight className="size-3 text-[#CBD5E1] shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
