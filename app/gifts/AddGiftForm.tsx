"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UpgradeSheet from "@/app/components/UpgradeSheet";
import Toast from "@/app/components/Toast";
import SignInCtaButton from "@/app/components/SignInCtaButton";

type Props = {
  listId: string;
  seasonId: string;
  recipientName?: string | null;
  isPro: boolean;
  giftsUsed: number;
  recipientsUsed: number;
  freeGiftLimit: number;
  freeRecipientLimit: number;
  existingRecipientKeys: string[];
  onAdded?: () => void;
  triggerVariant?: "floating" | "inline";
};

function moneyToNumber(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function normalizeRecipientKey(name: string) {
  return name.trim().toLowerCase();
}

export default function AddGiftForm({
  listId,
  seasonId,
  recipientName = null,
  isPro,
  giftsUsed,
  recipientsUsed,
  freeGiftLimit,
  freeRecipientLimit,
  existingRecipientKeys,
  onAdded,
  triggerVariant = "floating",
}: Props) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState(recipientName ?? "");
  const [cost, setCost] = useState("");
  const [tracking, setTracking] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // iOS toast
  const [toast, setToast] = useState<string | null>(null);

  // Upgrade sheet
  const [showUpgrade, setShowUpgrade] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    setRecipient(recipientName ?? "");
  }, [open, recipientName]);

  const recipientKey = normalizeRecipientKey(recipient);
  const willAddNewRecipient =
    recipientKey.length > 0 &&
    recipientKey !== "unassigned" &&
    !existingRecipientKeys.includes(recipientKey);

  const hitsGiftLimit = !isPro && giftsUsed >= freeGiftLimit;
  const hitsRecipientLimit = !isPro && willAddNewRecipient && recipientsUsed >= freeRecipientLimit;

  const canSubmit = useMemo(
    () =>
      title.trim().length > 0 &&
      recipient.trim().length > 0 &&
      !submitting &&
      !(hitsGiftLimit || hitsRecipientLimit),
    [title, recipient, submitting, hitsGiftLimit, hitsRecipientLimit]
  );

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError("");

    if (!isPro && (hitsGiftLimit || hitsRecipientLimit)) {
      setSubmitting(false);
      setShowUpgrade(true);
      return;
    }

    const costNumber = moneyToNumber(cost);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    setSubmitting(false);

    if (!token) {
      setSubmitError("Please sign in first.");
      return;
    }

    const res = await fetch("/api/gifts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        recipient_name: recipient.trim(),
        cost: costNumber,
        list_id: listId,
        season_id: seasonId,
        tracking: tracking.trim() ? tracking.trim() : null,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      if (json?.code === "LIMIT_REACHED") {
        setShowUpgrade(true);
        return;
      }
      setSubmitError(json?.message || "Couldn’t save that gift. Try again.");
      return;
    }

    setTitle("");
    setRecipient("");
    setCost("");
    setTracking("");
    setOpen(false);

    setToast("Gift added ✅");

    // Refresh after animation for a native feel
    setTimeout(() => {
      if (onAdded) {
        onAdded();
        return;
      }
      window.location.reload();
    }, 300);
  }

  const showUpgradeCta =
    !isPro && (hitsGiftLimit || hitsRecipientLimit || submitError.includes("Free includes"));
  const needsSignIn = submitError === "Please sign in first.";

  return (
    <>
      {triggerVariant === "floating" ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 18,
            bottom: "calc(5rem + env(safe-area-inset-bottom))",
            width: 54,
            height: 54,
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            background: "#0f172a",
            color: "white",
            fontWeight: 900,
            fontSize: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            cursor: "pointer",
            zIndex: 60,
          }}
          aria-label="Add gift"
        >
          +
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            maxWidth: 240,
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Add Gift
        </button>
      )}

      {/* Toast */}
      <Toast message={toast ?? ""} onClose={() => setToast(null)} />

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => (submitting ? null : setOpen(false))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(6px)",
            zIndex: 40,
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 45,
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 220ms ease",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Add a gift</div>
            <button
              onClick={() => (submitting ? null : setOpen(false))}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 999,
                padding: "6px 10px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>Person</span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g., Emma"
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>Gift</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AirPods case"
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>Cost (optional)</span>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="$25"
                inputMode="decimal"
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>
                Tracking (optional)
              </span>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Tracking number"
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                marginTop: 6,
                padding: "12px 14px",
                borderRadius: 16,
                border: "1px solid #0f172a",
                background: canSubmit ? "#0f172a" : "#cbd5e1",
                color: "#fff",
                fontWeight: 900,
                fontSize: 14,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "Adding…" : "Add gift"}
            </button>

            {submitError && (
              <div style={{ fontSize: 12, color: "#b91c1c", textAlign: "center" }}>{submitError}</div>
            )}
            {needsSignIn && (
              <SignInCtaButton
                style={{
                  marginTop: 6,
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

            {isPro ? (
              <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-green-600">
                <span>You’re a Pro</span> ✅
              </p>
            ) : (
              <p className="mt-1 text-center text-sm text-slate-600">
                Free includes up to <span className="font-semibold">2 people</span> +{" "}
                <span className="font-semibold">3 gifts</span> per season.
              </p>
            )}

            {showUpgradeCta && (
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>

      <UpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
