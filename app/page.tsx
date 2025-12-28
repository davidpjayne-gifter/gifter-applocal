"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Gift = {
  id: string;
  recipient_name: string | null;
  title: string;
  cost: number | null;
  tracking_number: string | null;
  created_at?: string;
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  minWidth: 180,
};

export default function Home() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [tracking, setTracking] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetchGifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchGifts() {
    setErrorText("");

    const { data, error } = await supabase
      .from("gifts")
      .select(
        "id, recipient_name, title, cost, tracking_number, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      console.error("fetchGifts:", error);
      return;
    }

    setGifts((data ?? []) as Gift[]);
  }

  async function addGift() {
    const trimmedRecipient = recipient.trim();
    const trimmedTitle = title.trim();
    const costNumber = cost ? Number(cost) : null;
    const trimmedTracking = tracking.trim() || null;

    if (!trimmedRecipient) return setErrorText("Recipient is required.");
    if (!trimmedTitle) return setErrorText("Gift title is required.");
    if (cost && Number.isNaN(costNumber))
      return setErrorText("Cost must be a number.");

    setLoading(true);
    setErrorText("");

    const { error } = await supabase.from("gifts").insert([
      {
        recipient_name: trimmedRecipient,
        title: trimmedTitle,
        cost: costNumber,
        tracking_number: trimmedTracking,
      },
    ]);

    if (error) {
      setErrorText(error.message);
      console.error("addGift:", error);
      setLoading(false);
      return;
    }

    setRecipient("");
    setTitle("");
    setCost("");
    setTracking("");

    await fetchGifts();
    setLoading(false);
  }

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "system-ui, -apple-system, Arial",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
        Gift Tracker
      </h1>

      <Link
        href="/gifts"
        style={{ marginBottom: 20, display: "inline-block" }}
      >
        View My Gifts →
      </Link>

      {errorText && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 6,
            background: "#fee2e2",
            color: "#7f1d1d",
            maxWidth: 800,
          }}
        >
          {errorText}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <input
          placeholder="Recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Gift title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Cost (optional)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          inputMode="decimal"
          style={inputStyle}
        />

        <input
          placeholder="Tracking # (optional)"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          style={{ ...inputStyle, minWidth: 240 }}
        />

        <button
          onClick={addGift}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            border: "1px solid #0f172a",
            background: loading ? "#475569" : "#0f172a",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Adding..." : "Add Gift"}
        </button>
      </div>

      <ul style={{ paddingLeft: 18 }}>
        {gifts.map((gift) => (
          <li key={gift.id} style={{ marginBottom: 8 }}>
            <strong>{gift.recipient_name}</strong> – {gift.title}
            {gift.cost !== null && ` ($${gift.cost})`}
            {gift.tracking_number && (
              <span style={{ color: "#475569" }}>
                {" "}
                • Tracking: {gift.tracking_number}
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
