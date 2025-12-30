"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import UpgradeSheet from "@/app/components/UpgradeSheet";

type Item = {
  id: string;
  title: string;
  category: string | null;
  price_bucket: string | null;
  count: number;
  updated_at?: string;
  created_at?: string;
};

function amazonSearchUrl(title: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(title)}`;
}

export default function ExploreClient({ items, listId }: { items: Item[]; listId: string | null }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
        .select("is_pro,subscription_status")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;
      const pro =
        profile?.subscription_status === "active" || Boolean(profile?.is_pro);
      setIsPro(pro);
      setProfileChecked(true);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function loadActiveSeason() {
    if (!listId) return null;

    const { data, error } = await supabase
      .from("seasons")
      .select("id,list_id")
      .eq("is_active", true)
      .eq("list_id", listId)
      .single();

    if (error || !data?.id || !data?.list_id) return null;
    return { id: String(data.id), list_id: String(data.list_id) };
  }

  async function handleSave(item: Item) {
    if (!profileChecked || savingId) return;

    if (!isPro) {
      setShowUpgrade(true);
      return;
    }

    if (!listId) {
      setToast("Please sign in first.");
      return;
    }

    setSavingId(item.id);

    const season = await loadActiveSeason();
    if (!season) {
      setSavingId(null);
      setToast("No active season yet.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSavingId(null);
      setToast("Please sign in first.");
      return;
    }

    const res = await fetch("/api/gifts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: item.title,
        recipient_name: null,
        list_id: season.list_id,
        season_id: season.id,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setSavingId(null);
      if (json?.code === "LIMIT_REACHED") {
        setShowUpgrade(true);
        return;
      }
      setToast(json?.message || "Couldn’t save gift — try again.");
      return;
    }

    setSavingId(null);
    setToast("Saved to My GIFTs.");
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Explore Gifts</h1>

      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Trending gifts based on what people are <b>done GIFTing</b>.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <b>No trending gifts yet.</b>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Mark a gift as done GIFTing to start populating Explore.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it, idx) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: 14,
                border: "1px solid #ddd",
                borderRadius: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700 }}>{idx + 1}.</div>
                  <div
                    style={{
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.title}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    opacity: 0.85,
                  }}
                >
                  {it.category && (
                    <span
                      style={{
                        padding: "2px 8px",
                        border: "1px solid #ccc",
                        borderRadius: 999,
                      }}
                    >
                      {it.category}
                    </span>
                  )}

                  {it.price_bucket && (
                    <span
                      style={{
                        padding: "2px 8px",
                        border: "1px solid #ccc",
                        borderRadius: 999,
                      }}
                    >
                      {it.price_bucket}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{it.count}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>done GIFTing</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(it)}
                  disabled={savingId === it.id}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #0f172a",
                    borderRadius: 10,
                    background: savingId === it.id ? "#94a3b8" : "#0f172a",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: savingId === it.id ? "not-allowed" : "pointer",
                  }}
                >
                  {savingId === it.id ? "Saving..." : "Save"}
                </button>

                <a
                  href={amazonSearchUrl(it.title)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #ccc",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

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

      <UpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
