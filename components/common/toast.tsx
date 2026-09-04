"use client";

import React, { createContext, useContext, useState, useCallback, useId } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let globalAddToast: ((toast: Omit<ToastItem, "id">) => void) | null = null;

export const toast = {
  success: (title: string, description?: string, duration = 4500) => {
    globalAddToast?.({ type: "success", title, description, duration });
  },
  error: (title: string, description?: string, duration = 6000) => {
    globalAddToast?.({ type: "error", title, description, duration });
  },
  warning: (title: string, description?: string, duration = 5000) => {
    globalAddToast?.({ type: "warning", title, description, duration });
  },
  info: (title: string, description?: string, duration = 4500) => {
    globalAddToast?.({ type: "info", title, description, duration });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 4500 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  React.useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  const success = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast({ type: "success", title, description, duration }),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast({ type: "error", title, description, duration }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast({ type: "warning", title, description, duration }),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) =>
      addToast({ type: "info", title, description, duration }),
    [addToast]
  );

  const styles: Record<
    ToastType,
    { border: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    success: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      icon: <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />,
    },
    error: {
      border: "border-red-200",
      bg: "bg-red-50",
      text: "text-red-900",
      icon: <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />,
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-900",
      icon: <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />,
    },
    info: {
      border: "border-sky-200",
      bg: "bg-sky-50",
      text: "text-sky-900",
      icon: <Info className="size-4 text-sky-600 shrink-0 mt-0.5" />,
    },
  };

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((item) => {
          const s = styles[item.type];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-md transition-all duration-200 animate-in slide-in-from-bottom-2 text-xs",
                s.border,
                s.bg,
                s.text
              )}
            >
              {s.icon}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 opacity-90 leading-relaxed text-[11px]">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded focus:outline-none"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return toast;
  }
  return ctx;
}
