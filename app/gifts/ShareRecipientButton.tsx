"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/app/components/Toast";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

export default function ShareRecipientButton({
  scope,
  recipientKey,
  recipientName,
  listId,
  seasonId,
}: {
  scope: "list" | "recipient";
  recipientKey?: string;
  recipientName?: string | null;
  listId: string;
  seasonId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const resetTimer = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  function showCopied() {
    setCopied(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  function isProbablyMobile() {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  async function copyToClipboard(text: string) {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    } finally {
      document.body.removeChild(textarea);
    }

    return ok;
  }

  async function handleClick() {
    const rk = (recipientKey || "").trim().toLowerCase();
    const lid = (listId || "").trim();
    const sid = (seasonId || "").trim();

    if (scope === "recipient" && !rk) {
      console.error("ShareRecipientButton missing recipientKey prop:", recipientKey);
      setToast("Share failed. Try again.");
      return;
    }
    if (!lid) {
      console.error("ShareRecipientButton missing listId prop:", listId);
      setToast("Share failed. Try again.");
      return;
    }
    if (!sid) {
      console.error("ShareRecipientButton missing seasonId prop:", seasonId);
      setToast("Share failed. Try again.");
      return;
    }

    const result = await safeFetchJson("/api/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope,
        season_id: sid,
        list_id: lid,
        recipient_key: scope === "recipient" ? rk : undefined,
      }),
    });

    if (!result.ok) {
      console.error("Share API error status:", result.status);
      setToast(
        (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          (result.status === 401 ? "Please sign in first." : "Something went wrong.")
      );
      return;
    }

    if (result.text) {
      setToast("Something went wrong.");
      return;
    }

    const shareUrl = (result.json as any)?.url
      ? String((result.json as any).url)
      : (result.json as any)?.token
        ? `${window.location.origin}/share/${(result.json as any).token}`
        : "";
    if (!shareUrl) {
      console.error("Share API missing url:", { json: result.json });
      setToast("Share failed. Try again.");
      return;
    }

    if (isProbablyMobile()) {
      router.push(shareUrl);
      return;
    }

    window.open(shareUrl, "_blank");

    try {
      const ok = await copyToClipboard(shareUrl);
      if (ok) {
        showCopied();
        setToast("Link copied");
      }
    } catch {
      // no-op
    }
  }

  return (
    <>
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        fontSize: 12,
        fontWeight: 800,
        color: "#334155",
        cursor: "pointer",
        pointerEvents: "auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      {copied
        ? "Link copied"
        : scope === "recipient"
          ? `Share ${recipientName || "GIFTEE"}'s gifts`
          : "Share entire list"}
    </button>

    <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}
