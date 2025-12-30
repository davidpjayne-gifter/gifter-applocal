"use client";

import { useState } from "react";
import { useToast } from "@/app/components/ui/toast";
import { supabase } from "@/lib/supabase";

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

    const res = await fetch("/api/share/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setLoading(false);
      toast.error(json.error || "Could not create share link");
      return;
    }

    const url = `${window.location.origin}/share/${json.token}`;
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
