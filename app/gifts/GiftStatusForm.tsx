"use client";

import * as React from "react";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";

type ShippingStatus = "unknown" | "in_transit" | "arrived";

type Props = {
  giftId: string;
  isWrapped: boolean;
  shippingStatus: ShippingStatus;
  updateGiftStatus: (formData: FormData) => void; // server action
  actions?: React.ReactNode;
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

export default function GiftStatusForm({
  giftId,
  isWrapped,
  shippingStatus,
  updateGiftStatus,
  actions,
}: Props) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<ShippingStatus | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(t);
  }, [saved]);

  function handle(nextStatus: ShippingStatus | "wrapped") {
    // Confirm only when unwrapping
    if (isWrapped && nextStatus !== "wrapped") {
      setPendingStatus(nextStatus as ShippingStatus);
      setConfirmOpen(true);
      return;
    }

    const fd = new FormData();
    fd.set("giftId", giftId);
    fd.set("status", nextStatus);

    updateGiftStatus(fd);
    setSaved(true);
  }

  function handleConfirmUnwrap() {
    if (!pendingStatus) {
      setConfirmOpen(false);
      return;
    }

    const fd = new FormData();
    fd.set("giftId", giftId);
    fd.set("status", pendingStatus);

    updateGiftStatus(fd);
    setSaved(true);
    setConfirmOpen(false);
    setPendingStatus(null);
  }

  return (
    <>
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

        <button
          type="button"
          onClick={() => handle("wrapped")}
          style={statusButtonStyle(isWrapped)}
        >
          Wrapped 🎁
        </button>
        {actions ? <div style={{ display: "flex", gap: 8 }}>{actions}</div> : null}
      </div>
      {saved && <div className="mt-2 text-xs font-semibold text-emerald-700">Saved</div>}

      <ConfirmDialog
        open={confirmOpen}
        title="Mark as not wrapped?"
        description="This will remove the wrapped status for this gift."
        confirmText="Mark not wrapped"
        cancelText="Keep wrapped"
        variant="default"
        onCancel={() => {
          setConfirmOpen(false);
          setPendingStatus(null);
        }}
        onConfirm={handleConfirmUnwrap}
      />
    </>
  );
}
