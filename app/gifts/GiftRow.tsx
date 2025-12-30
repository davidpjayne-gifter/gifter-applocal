"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import GiftStatusForm from "./GiftStatusForm";
import CopyButton from "./CopyButton";

type ShippingStatus = "unknown" | "in_transit" | "arrived";

type Gift = {
  id: string;
  title: string;
  tracking_number: string | null;
  shipping_status: ShippingStatus | null;
  wrapped: boolean | null;
};

type Props = {
  gift: Gift;
  updateGiftStatus: (formData: FormData) => void;
};

function statusLabel(status: ShippingStatus) {
  if (status === "in_transit") return "In Transit";
  if (status === "arrived") return "Arrived";
  return "Unknown";
}

export default function GiftRow({ gift, updateGiftStatus }: Props) {
  const [removed, setRemoved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (removed) return null;

  async function handleDelete() {
    if (deleting) return;
    const ok = window.confirm("Are you sure you want to delete this gift?");
    if (!ok) return;

    setDeleting(true);

    const { error } = await supabase.from("gifts").delete().eq("id", gift.id);

    if (error) {
      console.error("Failed to delete gift:", error);
      setDeleting(false);
      return;
    }

    setRemoved(true);
  }

  const shipping = gift.shipping_status ?? "unknown";
  const isWrapped = gift.wrapped === true;

  return (
    <li style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
      <div style={{ position: "relative", paddingBottom: 22 }}>
        <div style={{ fontWeight: 800 }}>{gift.title}</div>

        <GiftStatusForm
          giftId={gift.id}
          isWrapped={isWrapped}
          shippingStatus={shipping}
          updateGiftStatus={updateGiftStatus}
        />

        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>
          Status: {isWrapped ? "Wrapped" : statusLabel(shipping)}
        </div>

        {gift.tracking_number && (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Tracking: {gift.tracking_number} <CopyButton text={gift.tracking_number} />
          </div>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            padding: "4px 8px",
            borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fff",
            color: "#b91c1c",
            fontSize: 11,
            fontWeight: 800,
            cursor: deleting ? "not-allowed" : "pointer",
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </li>
  );
}
