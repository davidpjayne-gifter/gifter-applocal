"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";

type Props = {
  disabled: boolean;
  label: string;
  confirmText: string;
  autoWrap?: boolean;
  totalGifts?: number;
  wrappedCount?: number;
};

export default function RecipientWrapUpButton({
  disabled,
  label,
  confirmText,
  autoWrap = false,
  totalGifts = 0,
  wrappedCount = 0,
}: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [autoWrapping, setAutoWrapping] = useState(false);
  const autoWrapTimerRef = useRef<number | null>(null);

  function submitForm() {
    const form = btnRef.current?.form;
    if (form) {
      form.requestSubmit();
    }
  }

  useEffect(() => {
    return () => {
      if (autoWrapTimerRef.current) {
        window.clearTimeout(autoWrapTimerRef.current);
        autoWrapTimerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled || autoWrapping}
        onClick={() => {
          if (disabled || autoWrapping) return;
          if (autoWrap && totalGifts > 0 && wrappedCount < totalGifts) {
            setAutoWrapping(true);
            autoWrapTimerRef.current = window.setTimeout(() => {
              submitForm();
              setAutoWrapping(false);
              autoWrapTimerRef.current = null;
            }, 1500);
            return;
          }
          setConfirmOpen(true);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-zinc-800 dark:hover:border-zinc-700"
        title={disabled ? "Add a gift first" : "Wrap all gifts + collapse this person"}
      >
        {label}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Wrap up this recipient?"
        description={confirmText}
        confirmText="Wrap up"
        cancelText="Cancel"
        variant="success"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          submitForm();
        }}
      />
    </>
  );
}
