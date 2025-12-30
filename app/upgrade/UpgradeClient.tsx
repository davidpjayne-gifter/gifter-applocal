"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { openStripePortal } from "@/lib/stripeClient";

export default function UpgradeClient() {
  const searchParams = useSearchParams();
  const canceled = useMemo(() => searchParams?.get("canceled") === "1", [searchParams]);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setErrorMessage("Please sign in first.");
      return null;
    }

    return token;
  }

  async function handleUpgrade() {
    setLoading(true);
    setErrorMessage("");

    const token = await getAccessToken();

    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.url) {
      setLoading(false);
      setErrorMessage(json?.error || "Unable to start checkout.");
      return;
    }

    window.location.href = json.url;
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setErrorMessage("");

    const token = await getAccessToken();
    if (!token) {
      setPortalLoading(false);
      return;
    }

    try {
      await openStripePortal(token);
    } catch (err: any) {
      setPortalLoading(false);
      setErrorMessage(err?.message || "Unable to open billing portal.");
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Go Pro</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Upgrade when you’re ready to keep GIFTing all year.
      </p>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>GIFTer Pro — $9/year</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.85 }}>
          <li>Unlimited gifts</li>
          <li>Save trending ideas from Explore</li>
          <li>Budgets + seasons history</li>
        </ul>

        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #0f172a",
            background: loading ? "#94a3b8" : "#0f172a",
            color: "#fff",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {loading ? "Opening checkout..." : "Upgrade for $9/year"}
        </button>

        <button
          type="button"
          onClick={handleManageBilling}
          disabled={portalLoading}
          style={{
            marginTop: 10,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #0f172a",
            background: portalLoading ? "#e2e8f0" : "#fff",
            color: "#0f172a",
            fontWeight: 900,
            cursor: portalLoading ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {portalLoading ? "Opening billing portal..." : "Manage billing"}
        </button>

        {canceled && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            No worries — you can upgrade anytime.
          </div>
        )}

        {errorMessage && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>{errorMessage}</div>
        )}
      </section>
    </>
  );
}
