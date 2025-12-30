"use client";

import { useEffect, useMemo, useRef } from "react";

type Variant = "danger" | "default" | "success";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function confirmButtonClass(variant: Variant) {
  if (variant === "danger") {
    return "bg-rose-600 text-white hover:bg-rose-700";
  }
  if (variant === "success") {
    return "bg-emerald-600 text-white hover:bg-emerald-700";
  }
  return "bg-slate-900 text-white hover:bg-slate-800";
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const focusable = useMemo(() => [cancelRef, confirmRef], []);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      cancelRef.current?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = focusable
        .map((ref) => ref.current)
        .filter((el): el is HTMLButtonElement => Boolean(el));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel, focusable]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        onClick={onCancel}
        className="absolute inset-0 h-full w-full bg-slate-900/50"
        aria-label="Close dialog"
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-zinc-800 dark:disabled:bg-zinc-900"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-400 ${confirmButtonClass(
              variant
            )}`}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
