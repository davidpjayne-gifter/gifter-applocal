"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import GiftStatusForm from "./GiftStatusForm";
import CopyButton from "./CopyButton";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/toast";

type ShippingStatus = "unknown" | "in_transit" | "arrived";

type Gift = {
  id: string;
  title: string;
  tracking_number: string | null;
  cost: number | null;
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
  return "Storebought";
}

export default function GiftRow({ gift, updateGiftStatus }: Props) {
  const { toast } = useToast();
  const [removed, setRemoved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(gift.title);
  const [editCost, setEditCost] = useState(gift.cost === null ? "" : String(gift.cost));
  const [editTracking, setEditTracking] = useState(gift.tracking_number ?? "");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [localGift, setLocalGift] = useState(gift);

  if (removed) return null;

  useEffect(() => {
    setLocalGift(gift);
  }, [gift.id, gift.title, gift.cost, gift.tracking_number, gift.shipping_status, gift.wrapped]);

  useEffect(() => {
    function onEdit(event: Event) {
      const custom = event as CustomEvent<{ id: string }>;
      if (custom.detail?.id !== gift.id) {
        setIsEditing(false);
        setSaveError("");
      }
    }

    window.addEventListener("gifter-edit-gift", onEdit as EventListener);
    return () => {
      window.removeEventListener("gifter-edit-gift", onEdit as EventListener);
    };
  }, [gift.id]);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);

    const { error } = await supabase.from("gifts").delete().eq("id", gift.id);

    if (error) {
      console.error("Failed to delete gift:", error);
      setDeleting(false);
      toast.error("Could not delete gift. Please try again.");
      return;
    }

    toast.success("Gift deleted.");
    setRemoved(true);
    setConfirmOpen(false);
  }

  async function handleSave() {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setSaveError("Title is required.");
      return;
    }

    let costValue: number | null | undefined = undefined;
    if (editCost.trim() !== "") {
      const parsed = Number(editCost);
      if (!Number.isFinite(parsed)) {
        setSaveError("Cost must be a valid number.");
        return;
      }
      costValue = parsed;
    } else {
      costValue = null;
    }

    setSaving(true);
    setSaveError("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error("Please sign in first.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/gifts/${gift.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          cost: costValue,
          tracking: editTracking.trim() ? editTracking.trim() : null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.gift) {
        throw new Error(json?.error || "Unable to update gift.");
      }

      setLocalGift((prev) => ({ ...prev, ...json.gift }));
      toast.success("Gift updated.");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not update gift.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditClick() {
    window.dispatchEvent(new CustomEvent("gifter-edit-gift", { detail: { id: gift.id } }));
    setEditTitle(localGift.title);
    setEditCost(localGift.cost === null ? "" : String(localGift.cost));
    setEditTracking(localGift.tracking_number ?? "");
    setSaveError("");
    setIsEditing(true);
  }

  const shipping = gift.shipping_status ?? "unknown";
  const isWrapped = gift.wrapped === true;

  return (
    <li style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
      <div style={{ position: "relative", paddingBottom: 22 }}>
        {!isEditing ? (
          <div style={{ fontWeight: 800 }}>{localGift.title}</div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">Title</label>
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none disabled:bg-slate-100 dark:border-zinc-800"
              placeholder="Gift title"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Cost</label>
                <input
                  value={editCost}
                  onChange={(event) => setEditCost(event.target.value)}
                  disabled={saving}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none disabled:bg-slate-100 dark:border-zinc-800"
                  placeholder="e.g. 24.99"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Tracking</label>
                <input
                  value={editTracking}
                  onChange={(event) => setEditTracking(event.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none disabled:bg-slate-100 dark:border-zinc-800"
                  placeholder="Tracking number"
                />
              </div>
            </div>

            {saveError && <div className="text-xs font-semibold text-rose-600">{saveError}</div>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError("");
                }}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <GiftStatusForm
            giftId={gift.id}
            isWrapped={isWrapped}
            shippingStatus={shipping}
            updateGiftStatus={updateGiftStatus}
          />
        )}

        {!isEditing && (
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>
            Status: {isWrapped ? "Wrapped" : statusLabel(shipping)}
          </div>
        )}

        {!isEditing && localGift.tracking_number && (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Tracking: {localGift.tracking_number} <CopyButton text={localGift.tracking_number} />
          </div>
        )}

        {!isEditing && (
          <div className="absolute bottom-0 right-0 flex gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              className="rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete gift?"
        description="This action can’t be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </li>
  );
}
