"use client";

import { useEffect, useRef, useState } from "react";
import Toast from "@/app/components/Toast";
import { supabase } from "@/lib/supabase";

export default function ShareRecipientButton({
  scope,
  recipientKey,
  recipientName,
  listId,
  seasonId,
}: {
  scope: "list" | "giftee";
  recipientKey?: string;
  recipientName?: string | null;
  listId: string;
  seasonId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const resetTimer = useRef<number | null>(null);

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

    if (scope === "giftee" && !rk) {
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

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setToast("Please sign in first.");
      return;
    }

    const res = await fetch("/api/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        scope,
        seasonId: sid,
        recipientKey: scope === "giftee" ? rk : undefined,
        listId: lid,
      }),
    });

    const raw = await res.text();
    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      console.error("Share API error status:", res.status);
      console.error("Share API raw:", raw);
      setToast((json && json.error) || "Share failed. Try again.");
      return;
    }

    const shareUrl = json?.url
      ? String(json.url)
      : json?.token
        ? `${window.location.origin}/share/${json.token}`
        : "";
    if (!shareUrl) {
      console.error("Share API missing url:", { raw, json });
      setToast("Share failed. Try again.");
      return;
    }

    const shareText =
      scope === "giftee"
        ? `Share ${recipientName || "GIFTEE"}'s gifts`
        : "Share entire list";

    if (navigator?.share) {
      try {
        await navigator.share({
          title: "Gift list",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to clipboard for unsupported or canceled shares.
      }
    }

    try {
      const ok = await copyToClipboard(shareUrl);
      if (ok) {
        showCopied();
        setToast("Link copied");
      } else {
        setToast("Couldn’t share. Try again.");
      }
    } catch {
      setToast("Couldn’t share. Try again.");
    }

    if (!isProbablyMobile()) {
      window.open(shareUrl, "_blank");
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
        : scope === "giftee"
          ? `Share ${recipientName || "GIFTEE"}'s gifts`
          : "Share entire list"}
    </button>

    <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}
