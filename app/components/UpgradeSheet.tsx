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
          className="mx-auto max-w-[520px] rounded-t-[26px] border border-slate-200 bg-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="text-base font-black text-slate-900 dark:text-slate-50">
            Continue GIFTing stress-free 🎁
          </div>
          <div className="mt-2 text-[13px] leading-[1.35] text-slate-700 dark:text-slate-300">
            Pro keeps all your people and gifts in one place so you never have to juggle limits.
          </div>
          <div className="mt-2 text-[13px] leading-[1.35] text-slate-700 dark:text-slate-300">
            Add more people, track more gifts, and finish every season with confidence.
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Simple yearly plan. Cancel anytime.
          </div>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-3 w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-400 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:disabled:border-slate-500 dark:disabled:bg-slate-500"
          >
            {loading ? "Opening checkout..." : "Go Pro"}
          </button>

          <button
            type="button"
            onClick={handleSyncAccess}
            disabled={syncLoading}
            className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 transition disabled:cursor-not-allowed disabled:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:disabled:bg-slate-800"
          >
            {syncLoading ? "Syncing access..." : "I already paid — Sync Access"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-slate-600"
          >
            Not now
          </button>

          {errorMessage && (
            <div className="mt-2.5 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
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
