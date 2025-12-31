"use client";

import { useState } from "react";
import { useToast } from "@/app/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

export default function ShareScreenshotButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState("");

  async function makeLink() {
    setLoading(true);
    setLink("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      toast.error("Please sign in first.");
      return;
    }

    const result = await safeFetchJson("/api/share/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!result.ok || !(result.json as any)?.ok) {
      setLoading(false);
      toast.error(
        (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          "Something went wrong."
      );
      return;
    }

    if (result.text) {
      setLoading(false);
      toast.error("Something went wrong.");
      return;
    }

    const tokenValue = (result.json as any)?.token;
    const url = `${window.location.origin}/share/${tokenValue}`;
    setLink(url);
    window.open(url, "_blank"); // open screenshot page
    toast.success("Share link opened.");
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "10px 0 16px 0" }}>
      <button
        onClick={makeLink}
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
        {loading ? "Opening..." : "Share / Screenshot View"}
      </button>

      {link ? (
        <span style={{ fontSize: 12, color: "#475569" }}>
          Opened. (Link ready)
        </span>
      ) : null}
    </div>
  );
}
