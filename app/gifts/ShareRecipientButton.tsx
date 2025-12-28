"use client";

import { useState } from "react";

export default function ShareRecipientButton({ recipient }: { recipient: string }) {
  const [loading, setLoading] = useState(false);

  async function openShare() {
    setLoading(true);

    const res = await fetch("/api/share/recipient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient }),
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      alert(json.error || "Could not create screenshot view");
      setLoading(false);
      return;
    }

    // ✅ Open dynamic route
    window.open(`/share/${json.token}`, "_blank");

    setLoading(false);
  }

  return (
    <button
      onClick={openShare}
      disabled={loading}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #0f172a",
        background: loading ? "#475569" : "#ffffff",
        color: "#0f172a",
        fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "Opening..." : "Screenshot (To Share)"}
    </button>
  );
}
