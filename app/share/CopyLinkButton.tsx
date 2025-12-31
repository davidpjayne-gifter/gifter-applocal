"use client";

import { useMemo, useState } from "react";

export default function CopyLinkButton({ sharePath }: { sharePath: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return sharePath;
    return `${window.location.origin}${sharePath}`;
  }, [sharePath]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      alert(`Copy failed. Please copy the link manually:\n${shareUrl}`);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid #2563eb",
        background: "#2563eb",
        color: "#ffffff",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        marginTop: 12,
      }}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
