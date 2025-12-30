"use client";

import { useState } from "react";
import Toast from "@/app/components/Toast";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      setToast("Couldn’t copy. Try again.");
    }
  }

  return (
    <>
      <button
        onClick={copy}
        type="button"
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          fontSize: 12,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>

      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}
