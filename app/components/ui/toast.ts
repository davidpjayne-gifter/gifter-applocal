import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
};

export type ToastContextValue = {
  toasts: ToastItem[];
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  dismiss: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
