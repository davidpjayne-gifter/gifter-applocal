"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const PRESETS = [
  { label: "Christmas", example: `Christmas ${new Date().getFullYear()}` },
  { label: "Birthdays", example: `Birthdays ${new Date().getFullYear()}` },
  { label: "Valentine’s", example: `Valentine’s ${new Date().getFullYear()}` },
  { label: "Vacation", example: `Vacation ${new Date().getFullYear()}` },
];

export default function NewSeasonSheet({ listId }: { listId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const canSubmit = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  async function startSeason() {
    if (!canSubmit) return;
    setSubmitting(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setSubmitting(false);
      setToast("Please sign in first.");
      return;
    }

    const res = await fetch("/api/seasons/new", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ listId, name }),
    });

    const json = await res.json().catch(() => ({}));

    setSubmitting(false);

    if (!res.ok) {
      setToast(json?.error || "Couldn’t start season.");
      return;
    }

    setToast("Season started ✅");
    setOpen(false);
    setName("");

    // Refresh server page after animation
    setTimeout(() => window.location.reload(), 350);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center text-blue-600 hover:bg-blue-50"
        style={{
          marginTop: 10,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          background: "#fff",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Start new season
      </button>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 90,
            transform: "translateX(-50%)",
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.95)",
            color: "white",
            fontWeight: 800,
            fontSize: 13,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}

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
          zIndex: 50,
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 220ms ease",
        }}
      >
        <div
          className="bg-white text-gray-900"
          style={{
            maxWidth: 520,
            margin: "0 auto",
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            border: "1px solid #e2e8f0",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.12)",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="text-gray-900" style={{ fontSize: 16, fontWeight: 900 }}>
              Start a new season
            </div>
            <button
              onClick={() => setOpen(false)}
              disabled={submitting}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 12,
                padding: "6px 10px",
                fontWeight: 900,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Close
            </button>
          </div>

          {/* Presets */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setName(p.example)}
                  type="button"
                  className="text-gray-900"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Name input */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="text-gray-900" style={{ fontSize: 12, fontWeight: 900 }}>
              Season name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Mom’s Birthday, Valentine’s, Christmas 2026"
              className="text-gray-900 placeholder:text-gray-400"
              style={{
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={startSeason}
            disabled={!canSubmit}
            style={{
              marginTop: 12,
              width: "100%",
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
            {submitting ? "Starting…" : "Start season"}
          </button>

          <div
            className="text-gray-500"
            style={{ marginTop: 10, fontSize: 11, textAlign: "center" }}
          >
            This will archive your current season and start a fresh one.
          </div>
        </div>
      </div>
    </>
  );
}
