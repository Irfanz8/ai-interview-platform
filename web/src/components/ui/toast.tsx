import React, { useEffect } from "react";
import { atom, useAtom } from "jotai";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "destructive" | "warning" | "info";
  duration?: number;
}

export const toastsAtom = atom<ToastItem[]>([]);

let toastCount = 0;

export function addToast(item: Omit<ToastItem, "id">) {
  const id = `toast-${Date.now()}-${++toastCount}`;
  const duration = item.duration ?? 4000;
  
  // Update atom via direct store or listeners if outside react
  if (typeof window !== "undefined") {
    const event = new CustomEvent("app:add-toast", {
      detail: { ...item, id, duration },
    });
    window.dispatchEvent(event);
  }
  return id;
}

export const toast = {
  success: (description: string, title?: string) =>
    addToast({ description, title, variant: "success" }),
  error: (description: string, title?: string) =>
    addToast({ description, title, variant: "destructive" }),
  warning: (description: string, title?: string) =>
    addToast({ description, title, variant: "warning" }),
  info: (description: string, title?: string) =>
    addToast({ description, title, variant: "info" }),
  default: (description: string, title?: string) =>
    addToast({ description, title, variant: "default" }),
};

export function Toaster() {
  const [toasts, setToasts] = useAtom(toastsAtom);

  useEffect(() => {
    const handleAdd = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    window.addEventListener("app:add-toast", handleAdd);
    return () => window.removeEventListener("app:add-toast", handleAdd);
  }, [setToasts]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-md pointer-events-none"
    >
      {toasts.map((t) => {
        const isDestructive = t.variant === "destructive";
        const isSuccess = t.variant === "success";
        const isWarning = t.variant === "warning";

        return (
          <div
            key={t.id}
            role={isDestructive ? "alert" : "status"}
            className={cn(
              "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-5",
              isDestructive && "border-red-200 bg-red-50/95 text-red-900 shadow-red-500/10",
              isSuccess && "border-emerald-200 bg-emerald-50/95 text-emerald-900 shadow-emerald-500/10",
              isWarning && "border-amber-200 bg-amber-50/95 text-amber-900 shadow-amber-500/10",
              (!t.variant || t.variant === "default" || t.variant === "info") &&
                "border-slate-200 bg-white/95 text-slate-900 shadow-slate-900/10"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
              {isDestructive && <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />}
              {isWarning && <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />}
              {(!t.variant || t.variant === "default" || t.variant === "info") && (
                <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              {t.title && <p className="text-sm font-semibold leading-none">{t.title}</p>}
              <p className="text-xs sm:text-sm font-normal leading-relaxed opacity-95">{t.description}</p>
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
