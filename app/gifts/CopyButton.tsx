"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      alert("Could not copy. Please copy manually.");
    }
  }

  return (
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
  );
}
