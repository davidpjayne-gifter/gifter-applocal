"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MAX_FREE_GIFTS } from "@/lib/limits";
import UpgradeSheet from "@/app/components/UpgradeSheet";
import Toast from "@/app/components/Toast";

type Props = {
  listId: string;
  seasonId: string;
  recipientName?: string | null;
  onAdded?: () => void;
};

type LimitState =
  | { ok: true; giftsUsed: number; recipientsUsed: number }
  | { ok: false; reason: "gifts" | "recipients"; giftsUsed: number; recipientsUsed: number };

const FREE_LIMITS = {
  maxRecipients: 2,
  maxGifts: MAX_FREE_GIFTS,
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
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState(recipientName ?? "");
  const [cost, setCost] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // iOS toast
  const [toast, setToast] = useState<string | null>(null);

  // Upgrade sheet
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;

      if (!userId) {
        if (mounted) {
          setIsPro(false);
          setProfileChecked(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;
      setIsPro(Boolean(profile?.is_pro));
      setProfileChecked(true);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecipient(recipientName ?? "");
  }, [open, recipientName]);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && recipient.trim().length > 0 && !submitting,
    [title, recipient, submitting]
  );

  async function computeFreeLimits(nextRecipientName: string): Promise<LimitState> {
    const { count: giftsUsed, error: giftsErr } = await supabase
      .from("gifts")
      .select("id", { count: "exact", head: true })
      .eq("list_id", listId)
      .eq("season_id", seasonId);

    if (giftsErr) {
      console.error(giftsErr);
      return { ok: true, giftsUsed: 0, recipientsUsed: 0 };
    }

    const { data: recRows, error: recErr } = await supabase
      .from("gifts")
      .select("recipient_name")
      .eq("list_id", listId)
      .eq("season_id", seasonId);

    if (recErr) {
      console.error(recErr);
      return { ok: true, giftsUsed: giftsUsed ?? 0, recipientsUsed: 0 };
    }

    const distinct = new Set(
      (recRows ?? [])
        .map((r: any) => (r.recipient_name ?? "").trim())
        .filter(Boolean)
        .map(normalizeRecipientKey)
    );

    const recipientsUsed = distinct.size;
    const nextKey = normalizeRecipientKey(nextRecipientName);
    const isNewRecipient = nextKey.length > 0 && !distinct.has(nextKey);

    if ((giftsUsed ?? 0) >= FREE_LIMITS.maxGifts) {
      return { ok: false, reason: "gifts", giftsUsed: giftsUsed ?? 0, recipientsUsed };
    }
    if (isNewRecipient && recipientsUsed >= FREE_LIMITS.maxRecipients) {
      return { ok: false, reason: "recipients", giftsUsed: giftsUsed ?? 0, recipientsUsed };
    }

    return { ok: true, giftsUsed: giftsUsed ?? 0, recipientsUsed };
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!profileChecked) return;

    setSubmitting(true);
    setSubmitError("");

    if (!isPro) {
      const limits = await computeFreeLimits(recipient);

      if (!limits.ok) {
        setSubmitting(false);
        setShowUpgrade(true);
        return;
      }
    }

    const costNumber = moneyToNumber(cost);

    const { error } = await supabase.from("gifts").insert([
      {
        title: title.trim(),
        recipient_name: recipient.trim(),
        cost: costNumber,
        list_id: listId,
        season_id: seasonId,
        wrapped: false,
      },
    ]);

    setSubmitting(false);

    if (error) {
      console.error(error);
      setSubmitError("Couldn’t save that gift. Try again.");
      return;
    }

    setTitle("");
    setRecipient("");
    setCost("");
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

  return (
    <>
      {/* Floating + */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
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
          zIndex: 50,
        }}
        aria-label="Add gift"
      >
        +
      </button>

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

            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 }}>
              Free includes up to {FREE_LIMITS.maxRecipients} people + {FREE_LIMITS.maxGifts} gifts per season.
            </div>
          </div>
        </div>
      </div>

      <UpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
