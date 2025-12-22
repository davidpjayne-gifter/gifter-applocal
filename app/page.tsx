"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Gift = {
  id: string | number;
  recipient: string;
  item: string;
  cost: number;
  tracking: string;
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
  const [item, setItem] = useState("");
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
      .select("*")
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
    const trimmedItem = item.trim();
    const costNumber = Number(cost);
    const trimmedTracking = tracking.trim();

    if (!trimmedRecipient) return setErrorText("Recipient is required.");
    if (!trimmedItem) return setErrorText("Gift item is required.");
    if (!cost || Number.isNaN(costNumber))
      return setErrorText("Valid cost is required (ex: 25 or 25.99).");

    // tracking is required by your DB schema
    if (!trimmedTracking) return setErrorText("Tracking is required.");

    setLoading(true);
    setErrorText("");

    const { error } = await supabase.from("gifts").insert([
      {
        recipient: trimmedRecipient,
        item: trimmedItem,
        cost: costNumber,
        tracking: trimmedTracking,
      },
    ]);

    if (error) {
      setErrorText(error.message);
      console.error("addGift:", error);
      setLoading(false);
      return;
    }

    setRecipient("");
    setItem("");
    setCost("");
    setTracking("");
    await fetchGifts();
    setLoading(false);
  }

  return (
    <main style={{ padding: 40, fontFamily: "system-ui, -apple-system, Arial" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>
        Gift Tracker
      </h1>

      {errorText ? (
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
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
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
          placeholder="Gift item"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Cost (e.g. 25.99)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          inputMode="decimal"
          style={inputStyle}
        />

        <input
          placeholder="Tracking (required)"
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
            <strong>{gift.recipient}</strong> – {gift.item} (${gift.cost}){" "}
            <span style={{ color: "#475569" }}>• Tracking: {gift.tracking}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
