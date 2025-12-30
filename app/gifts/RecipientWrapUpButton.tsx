"use client";

import { useRef, useState } from "react";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";

type Props = {
  disabled: boolean;
  label: string;
  confirmText: string;
};

export default function RecipientWrapUpButton({ disabled, label, confirmText }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function submitForm() {
    const form = btnRef.current?.form;
    if (form) {
      form.requestSubmit();
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setConfirmOpen(true);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
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
        variant="default"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          submitForm();
        }}
      />
    </>
  );
}
