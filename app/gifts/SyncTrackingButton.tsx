"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetchJson } from "@/app/lib/safeFetchJson";
import { useToast } from "@/app/components/ui/toast";

export default function SyncTrackingButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  async function sync() {
    setLoading(true);
    setMsg("");

    const result = await safeFetchJson("/api/aftership/sync", { method: "POST" });

    if (!result.ok || !(result.json as any)?.ok) {
      const message =
        (result.json as any)?.error?.message ||
        (result.json as any)?.error ||
        "Something went wrong.";
      toast.error(message);
      setMsg(message);
      setLoading(false);
      return;
    }
    if (result.text) {
      toast.error("Something went wrong.");
      setMsg("Something went wrong.");
      setLoading(false);
      return;
    }

    const okCount = Array.isArray((result.json as any)?.results)
      ? (result.json as any).results.filter((r: any) => r.status === "ok").length
      : 0;

    setMsg(`Synced! Updated ${okCount} item${okCount === 1 ? "" : "s"}.`);
    router.refresh();
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "10px 0 16px 0" }}>
      <button
        onClick={sync}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #0f172a",
          background: loading ? "#475569" : "#0f172a",
          color: "white",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Syncing..." : "Sync Tracking"}
      </button>

      {msg ? <span style={{ color: "#475569" }}>{msg}</span> : null}
    </div>
  );
}
