"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    const json = await Promise.race([
      res.json(),
      (async () => {
        await sleep(timeoutMs);
        throw new Error("timeout");
      })(),
    ]).catch(() => null);

    return { res, json };
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("timeout");
    if (err?.message === "timeout") throw err;
    throw err;
  } finally {
    window.clearTimeout(id);
  }
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
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState(recipientName ?? "");
  const [cost, setCost] = useState("");
  const [tracking, setTracking] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [costError, setCostError] = useState("");
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

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
    if (!recipient) {
      setRecipient(recipientName ?? "");
    }
    if (!sheetRef.current) return;
    const node = sheetRef.current;
    const raf = window.requestAnimationFrame(() => {
      node.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, recipientName]);

  useEffect(() => {
    if (!open || !submitting) return;
    const t = window.setTimeout(() => {
      setSubmitting(false);
      setSubmitError("That took too long. Please try again.");
    }, 16000);
    return () => window.clearTimeout(t);
  }, [open, submitting]);

  function handleClose() {
    setSubmitting(false);
    setSubmitError("");
    setCostError("");
    setOpen(false);
  }

  const parsedCost = useMemo(() => {
    const raw = cost.trim().replace(/[^0-9.]/g, "");
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : NaN;
  }, [cost]);

  const costIsValid = useMemo(() => {
    return typeof parsedCost === "number" && Number.isFinite(parsedCost) && parsedCost > 0;
  }, [parsedCost]);

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
      costIsValid &&
      !submitting &&
      !(hitsGiftLimit || hitsRecipientLimit),
    [title, recipient, costIsValid, submitting, hitsGiftLimit, hitsRecipientLimit]
  );

  async function handleSubmit() {
    if (submitting || !canSubmit) return;

    setSubmitError("");
    setCostError("");

    const costRaw = cost.trim().replace(/[^0-9.]/g, "");
    const costNumber = Number(costRaw);
    if (!costRaw) {
      setCostError("Cost is required.");
      return;
    }
    if (!Number.isFinite(costNumber) || costNumber <= 0) {
      setCostError("Enter a valid cost.");
      return;
    }

    const requestId = crypto.randomUUID();
    setLastRequestId(requestId);
    setSubmitting(true);

    try {
      if (!isPro && (hitsGiftLimit || hitsRecipientLimit)) {
        setShowUpgrade(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setSubmitError("Please sign in first.");
        return;
      }

      const payload = {
        requestId,
        title: title.trim(),
        recipient_name: recipient.trim(),
        recipient_key: recipient.trim().toLowerCase(),
        cost: costNumber,
        list_id: listId,
        season_id: seasonId,
        listId,
        seasonId,
        tracking: tracking.trim() ? tracking.trim() : null,
      };

      console.log("[AddGift] request", requestId, {
        recipient: payload.recipient_name,
        title: payload.title,
        cost: payload.cost,
        listId: payload.list_id,
        seasonId: payload.season_id,
      });

      const { res, json } = await fetchJsonWithTimeout(
        "/api/gifts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
        15000
      );

      if (!res.ok || !json?.ok) {
        if (json?.code === "LIMIT_REACHED") {
          setShowUpgrade(true);
          return;
        }
        const serverMessage = json?.error || json?.message || "Couldn’t add gift.";
        const serverId = json?.requestId || requestId;
        setSubmitError(`${serverMessage} (ID: ${serverId})`);
        return;
      }

      setTitle("");
      setRecipient("");
      setCost("");
      setTracking("");
      setOpen(false);
      setLastRequestId(null);

      setToast("Added 🎁");

      setTimeout(() => {
        if (onAdded) {
          onAdded();
          return;
        }
        router.refresh();
      }, 300);
    } catch (err) {
      if (err instanceof Error && err.message === "timeout") {
        setSubmitError(`That took too long. Please try again. (ID: ${requestId})`);
        return;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn’t add gift. Please try again.";
      setSubmitError(`${message} (ID: ${requestId})`);
    } finally {
      setSubmitting(false);
    }
  }

  const showUpgradeCta =
    !isPro && (hitsGiftLimit || hitsRecipientLimit || submitError.includes("Free includes"));
  const needsSignIn = submitError === "Please sign in first.";

  return (
    <>
      {triggerVariant === "floating" ? (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: "calc(5rem + env(safe-area-inset-bottom))",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <button
            onClick={() => setOpen(true)}
            style={{
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
            }}
            aria-label="Add gift"
          >
            +
          </button>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>Add GIFT</div>
        </div>
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
      <Toast message={toast ?? ""} onClose={() => setToast(null)} variant="success" />

      {/* Backdrop */}
      {open && (
        <div
          onClick={handleClose}
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
          ref={sheetRef}
          className="bg-white text-gray-900"
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
            <div className="text-gray-900" style={{ fontSize: 16, fontWeight: 900 }}>
              🎁 Add a GIFT
            </div>
            <button
              onClick={handleClose}
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
              <span className="text-gray-900" style={{ fontSize: 12, fontWeight: 900 }}>
                Person
              </span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g., Emma"
                className="text-gray-900 placeholder:text-gray-400"
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
              <span className="text-gray-900" style={{ fontSize: 12, fontWeight: 900 }}>
                Gift
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AirPods case"
                className="text-gray-900 placeholder:text-gray-400"
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
              <span className="text-gray-900" style={{ fontSize: 12, fontWeight: 900 }}>
                Cost
              </span>
              <input
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  setCostError("");
                }}
                autoFocus
                placeholder="$25"
                inputMode="decimal"
                pattern="[0-9]*"
                required
                className="text-gray-900 placeholder:text-gray-400"
                style={{
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <p className="mt-1 text-xs text-gray-500">Required</p>
              {costError && (
                <span className="text-xs font-semibold text-rose-600">{costError}</span>
              )}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="text-gray-900" style={{ fontSize: 12, fontWeight: 900 }}>
                Tracking (optional)
              </span>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Tracking number"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                className="text-gray-900 placeholder:text-gray-400"
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

            <button
              type="button"
              onClick={handleClose}
              style={{
                marginTop: 6,
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 900,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            {submitError && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-sm text-rose-700">{submitError}</p>
                {lastRequestId && (
                  <button
                    type="button"
                    onClick={async () => {
                      const debugInfo = [
                        `requestId=${lastRequestId}`,
                        `recipient=${recipient.trim()}`,
                        `title=${title.trim()}`,
                        `cost=${cost.trim()}`,
                        `timestamp=${new Date().toISOString()}`,
                      ].join("\n");
                      try {
                        await navigator.clipboard.writeText(debugInfo);
                        setToast("Debug info copied");
                      } catch {
                        setToast("Unable to copy debug info");
                      }
                    }}
                    className="text-left text-xs font-semibold text-slate-600 underline underline-offset-2"
                  >
                    Copy debug info
                  </button>
                )}
                {!submitting && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
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
