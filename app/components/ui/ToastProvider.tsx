"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ToastContext, ToastItem, ToastVariant } from "./toast";

type Props = {
  children: React.ReactNode;
};

function buildId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function variantStyles(variant: ToastVariant) {
  if (variant === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (variant === "error") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-slate-200 bg-slate-50 text-slate-900 dark:border-zinc-800";
}

function variantLabel(variant: ToastVariant) {
  if (variant === "success") return "Success";
  if (variant === "error") return "Error";
  return "Info";
}

export default function ToastProvider({ children }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeoutsRef.current[id];
    if (timeout) {
      window.clearTimeout(timeout);
      delete timeoutsRef.current[id];
    }
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = buildId();
      setToasts((prev) => [...prev, { id, variant, message }]);

      const timeout = window.setTimeout(() => {
        dismiss(id);
      }, 3000);

      timeoutsRef.current[id] = timeout;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message: string) => addToast("success", message),
      error: (message: string) => addToast("error", message),
      info: (message: string) => addToast("info", message),
    }),
    [addToast]
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(360px,90vw)] flex-col gap-3">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border px-4 py-3 shadow-lg ${variantStyles(item.variant)}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {variantLabel(item.variant)}
                </div>
                <div className="mt-1 text-sm font-medium">{item.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-white"
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
