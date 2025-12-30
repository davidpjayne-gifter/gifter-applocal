"use client";

import * as React from "react";

type ShippingStatus = "unknown" | "in_transit" | "arrived";

type Props = {
  giftId: string;
  isWrapped: boolean;
  shippingStatus: ShippingStatus;
  updateGiftStatus: (formData: FormData) => void; // server action
};

function statusButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: active ? "#0f172a" : "#ffffff",
    color: active ? "#ffffff" : "#0f172a",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

export default function GiftStatusForm({ giftId, isWrapped, shippingStatus, updateGiftStatus }: Props) {
  function handle(nextStatus: ShippingStatus | "wrapped") {
    // Confirm only when unwrapping
    if (isWrapped && nextStatus !== "wrapped") {
      const ok = window.confirm("This gift is marked as Wrapped. Mark it as NOT wrapped?");
      if (!ok) return;
    }

    const fd = new FormData();
    fd.set("giftId", giftId);
    fd.set("status", nextStatus);

    updateGiftStatus(fd);
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <button
        type="button"
        onClick={() => handle("unknown")}
        style={statusButtonStyle(!isWrapped && shippingStatus === "unknown")}
      >
        Storebought
      </button>

      <button
        type="button"
        onClick={() => handle("in_transit")}
        style={statusButtonStyle(!isWrapped && shippingStatus === "in_transit")}
      >
        In Transit
      </button>

      <button
        type="button"
        onClick={() => handle("arrived")}
        style={statusButtonStyle(!isWrapped && shippingStatus === "arrived")}
      >
        Arrived
      </button>

      <button type="button" onClick={() => handle("wrapped")} style={statusButtonStyle(isWrapped)}>
        Wrapped 🎁
      </button>
    </div>
  );
}
