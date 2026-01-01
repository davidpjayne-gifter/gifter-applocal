"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import SignInCtaButton from "@/app/components/SignInCtaButton";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function UpgradeSheet({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);

  async function handleUpgrade() {
    if (loading) return;
    setLoading(true);
    setErrorMessage("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      setErrorMessage("Please sign in first.");
      return;
    }

    const result = await safeFetchJson("/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!result.ok) {
      setLoading(false);
      setErrorMessage(
        (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          "Something went wrong."
      );
      return;
    }

    if (result.text) {
      setLoading(false);
      setErrorMessage("Something went wrong.");
      return;
    }

    if (!(result.json as any)?.url) {
      setLoading(false);
      setErrorMessage("Stripe did not return a checkout URL.");
      return;
    }

    window.location.href = String((result.json as any).url);
  }

  async function handleSyncAccess() {
    if (syncLoading) return;
    setSyncLoading(true);
    setErrorMessage("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setSyncLoading(false);
      setErrorMessage("Please sign in first.");
      return;
    }

    const result = await safeFetchJson("/api/billing/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!result.ok || !(result.json as any)?.ok) {
      setSyncLoading(false);
      setErrorMessage(
        (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          "Something went wrong."
      );
      return;
    }

    if (result.text) {
      setSyncLoading(false);
      setErrorMessage("Something went wrong.");
      return;
    }

    window.location.reload();
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(6px)",
          zIndex: 70,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: "#fff",
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            border: "1px solid #e2e8f0",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.12)",
            padding: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900 }}>Continue GIFTing stress-free 🎁</div>
          <div style={{ marginTop: 8, color: "#334155", fontSize: 13, lineHeight: 1.35 }}>
            Pro keeps all your people and gifts in one place so you never have to juggle limits.
          </div>
          <div style={{ marginTop: 6, color: "#334155", fontSize: 13, lineHeight: 1.35 }}>
            Add more people, track more gifts, and finish every season with confidence.
          </div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
            Simple yearly plan. Cancel anytime.
          </div>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid #0f172a",
              background: loading ? "#94a3b8" : "#0f172a",
              color: "#fff",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Opening checkout..." : "Go Pro"}
          </button>

          <button
            type="button"
            onClick={handleSyncAccess}
            disabled={syncLoading}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: syncLoading ? "#e2e8f0" : "#fff",
              color: "#0f172a",
              fontWeight: 900,
              cursor: syncLoading ? "not-allowed" : "pointer",
            }}
          >
            {syncLoading ? "Syncing access..." : "I already paid — Sync Access"}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Not now
          </button>

          {errorMessage && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>{errorMessage}</div>
          )}
          {errorMessage === "Please sign in first." && (
            <SignInCtaButton
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Go to sign in
            </SignInCtaButton>
          )}
        </div>
      </div>
    </>
  );
}
