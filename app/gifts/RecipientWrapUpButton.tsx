"use client";

import { useRef } from "react";

type Props = {
  disabled: boolean;
  label: string;
  confirmText: string;
};

export default function RecipientWrapUpButton({ disabled, label, confirmText }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <button
      ref={btnRef}
      type="submit"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;

        // Confirm only when enabled; prevents accidental wrap-up/collapse
        const ok = window.confirm(confirmText);
        if (!ok) e.preventDefault();
      }}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        color: "#0f172a",
        fontWeight: 800,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 0.9,
      }}
      title={disabled ? "Add a gift first" : "Wrap all gifts + collapse this person"}
    >
      {label}
    </button>
  );
}
