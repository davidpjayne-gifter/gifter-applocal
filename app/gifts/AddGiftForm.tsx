"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  minWidth: 180,
};

function dateToNoonISO(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

type CarrierValue = "usps" | "ups" | "fedex" | "dhl" | "amazon" | "unknown";

const carriers: Array<{ value: CarrierValue; label: string }> = [
  { value: "unknown", label: "Other / Auto-detect" },
  { value: "usps", label: "USPS" },
  { value: "ups", label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl", label: "DHL" },
  { value: "amazon", label: "Amazon" },
];

function carrierLabel(carrier: CarrierValue) {
  switch (carrier) {
    case "usps":
      return "USPS";
    case "ups":
      return "UPS";
    case "fedex":
      return "FedEx";
    case "dhl":
      return "DHL";
    case "amazon":
      return "Amazon";
    default:
      return "Unknown";
  }
}

function detectCarrier(trackingNumberRaw: string): CarrierValue {
  const tn = trackingNumberRaw.replace(/\s+/g, "").toUpperCase();
  if (!tn) return "unknown";

  // UPS: starts with 1Z
  if (tn.startsWith("1Z")) return "ups";

  // USPS: 20–22 digits (often), or starts with 9...
  if (/^\d{20,22}$/.test(tn)) return "usps";
  if (/^9\d{15,21}$/.test(tn)) return "usps";

  // FedEx: common digit lengths
  if (/^\d{12}$/.test(tn)) return "fedex";
  if (/^\d{15}$/.test(tn)) return "fedex";
  if (/^\d{20}$/.test(tn)) return "fedex";
  if (/^\d{22}$/.test(tn)) return "fedex";

  // DHL (simple heuristics)
  if (/^JD\d+$/i.test(tn)) return "dhl";
  if (/^\d{10}$/.test(tn)) return "dhl";

  return "unknown";
}

export default function AddGiftForm({ onAdded }: { onAdded: () => void }) {
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState<CarrierValue>("unknown");
  const [etaDate, setEtaDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // ✅ Live detected carrier (only meaningful if user leaves Auto/Unknown)
  const detected = useMemo(() => {
    const tn = tracking.trim();
    if (!tn) return "unknown";
    return detectCarrier(tn);
  }, [tracking]);

  const liveHint =
    carrier === "unknown" && tracking.trim()
      ? detected !== "unknown"
        ? `Detected: ${carrierLabel(detected)} (auto)`
        : "Detected: Unknown (auto)"
      : carrier !== "unknown"
      ? `Using: ${carrierLabel(carrier)} (manual)`
      : "";

  async function addGift() {
    const recipient_name = recipient.trim();
    const giftTitle = title.trim();
    const costNumber = cost ? Number(cost) : null;

    const tracking_number = tracking.trim() || null;
    const delivery_eta = etaDate ? dateToNoonISO(etaDate) : null;

    if (!recipient_name) return setErrorText("Recipient is required.");
    if (!giftTitle) return setErrorText("Gift title is required.");
    if (cost && Number.isNaN(costNumber)) return setErrorText("Cost must be a number.");

    // Use dropdown if set; otherwise use detected carrier (if any)
    const finalCarrier: CarrierValue =
      carrier !== "unknown"
        ? carrier
        : tracking_number
        ? detectCarrier(tracking_number)
        : "unknown";

    setLoading(true);
    setErrorText("");

    const { error } = await supabase.from("gifts").insert([
      {
        recipient_name,
        title: giftTitle,
        cost: costNumber,
        tracking_number,
        carrier: finalCarrier === "unknown" ? null : finalCarrier,
        delivery_eta,
      },
    ]);

    setLoading(false);

    if (error) return setErrorText(error.message);

    setRecipient("");
    setTitle("");
    setCost("");
    setTracking("");
    setCarrier("unknown");
    setEtaDate("");

    onAdded();
  }

  return (
    <div style={{ marginBottom: 0 }}>
      {errorText && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 6,
            background: "#fee2e2",
            color: "#7f1d1d",
          }}
        >
          {errorText}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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

        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value as CarrierValue)}
          style={inputStyle}
        >
          {carriers.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            placeholder="Tracking # (optional)"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            style={{ ...inputStyle, minWidth: 240 }}
          />
          {liveHint ? (
            <span style={{ fontSize: 12, color: "#64748b" }}>{liveHint}</span>
          ) : null}
        </div>

        <input
          type="date"
          value={etaDate}
          onChange={(e) => setEtaDate(e.target.value)}
          style={inputStyle}
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

      <p style={{ margin: "10px 0 0 0", color: "#64748b", fontSize: 12 }}>
        Leave carrier on “Other / Auto-detect” and we’ll detect as you type.
      </p>
    </div>
  );
}
