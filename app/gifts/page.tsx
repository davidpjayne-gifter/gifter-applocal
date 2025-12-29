import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";

import AddGiftForm from "./AddGiftForm";
import NewSeasonSheet from "./NewSeasonSheet";
import CopyButton from "./CopyButton";
import GiftStatusForm from "./GiftStatusForm";
import ShareRecipientButton from "./ShareRecipientButton";

import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------------- TYPES ---------------- */

type ShippingStatus = "unknown" | "in_transit" | "arrived";

type Gift = {
  id: string;
  title: string;
  recipient_name: string | null;
  cost: number | null;
  tracking_number: string | null;
  delivery_eta: string | null;
  shipping_status: ShippingStatus | null;
  wrapped: boolean | null;
  created_at?: string;
};

type Season = {
  id: string;
  name: string;
  list_id: string;
  is_active: boolean;
};

/* ---------------- HELPERS ---------------- */

function toTitleCase(str: string) {
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeStatus(status: any): ShippingStatus {
  if (status === "arrived" || status === "in_transit" || status === "unknown") return status;
  return "unknown";
}

function statusLabel(status: ShippingStatus) {
  switch (status) {
    case "arrived":
      return "Arrived";
    case "in_transit":
      return "In Transit";
    default:
      return "Unknown";
  }
}

function pillStyle(): CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    fontWeight: 900,
    background: "#fff",
  };
}

function groupActionButtonStyle(): CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

function bottomActionRowStyle(): CSSProperties {
  return {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #e2e8f0",
    display: "flex",
    justifyContent: "center",
  };
}

/* ---------------- SERVER ACTIONS ---------------- */

async function updateGiftStatus(formData: FormData) {
  "use server";

  const giftId = String(formData.get("giftId") || "");
  const status = String(formData.get("status") || "");

  if (!giftId) return;

  if (status === "wrapped") {
    await supabaseAdmin.from("gifts").update({ wrapped: true, shipping_status: "arrived" }).eq("id", giftId);
  } else if (status === "arrived") {
    await supabaseAdmin.from("gifts").update({ wrapped: false, shipping_status: "arrived" }).eq("id", giftId);
  } else if (status === "in_transit") {
    await supabaseAdmin.from("gifts").update({ wrapped: false, shipping_status: "in_transit" }).eq("id", giftId);
  } else {
    await supabaseAdmin.from("gifts").update({ wrapped: false, shipping_status: "unknown" }).eq("id", giftId);
  }

  revalidatePath("/gifts");
}

async function markAllWrapped(formData: FormData) {
  "use server";

  const recipientKey = String(formData.get("recipientKey") || "");
  const listId = String(formData.get("listId") || "");
  const seasonId = String(formData.get("seasonId") || "");

  if (!listId || !seasonId) return;

  const q = supabaseAdmin
    .from("gifts")
    .update({ wrapped: true, shipping_status: "arrived" })
    .eq("list_id", listId)
    .eq("season_id", seasonId);

  if (recipientKey === "unassigned") {
    await q.is("recipient_name", null);
  } else {
    await q.ilike("recipient_name", recipientKey);
  }

  revalidatePath("/gifts");
}

/* ---------------- PAGE ---------------- */

export default async function GiftsPage() {
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single<Season>();

  if (!activeSeason) {
    return (
      <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>My Gifts</h1>
        <p>No active season.</p>
      </main>
    );
  }

  const { data: giftsRaw } = await supabase
    .from("gifts")
    .select("*")
    .eq("season_id", activeSeason.id)
    .order("recipient_name", { ascending: true })
    .order("created_at", { ascending: false });

  const gifts: Gift[] = (giftsRaw ?? []).map((g: any) => ({
    ...g,
    shipping_status: normalizeStatus(g.shipping_status),
    wrapped: Boolean(g.wrapped),
  }));

  const grouped = gifts.reduce<Record<string, Gift[]>>((acc, gift) => {
    const key = (gift.recipient_name?.trim() || "unassigned").toLowerCase();
    acc[key] ||= [];
    acc[key].push(gift);
    return acc;
  }, {});

  const recipientKeys = Object.keys(grouped);

  return (
    <main style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>My Gifts</div>

        <div style={{ marginTop: 6, display: "flex", gap: 10 }}>
          <span style={pillStyle()}>Season: {activeSeason.name}</span>
        </div>

        <NewSeasonSheet listId={activeSeason.list_id} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {recipientKeys.map((key) => {
          const list = grouped[key];
          const displayName = key === "unassigned" ? "Unassigned" : toTitleCase(key);

          return (
            <section
              key={key}
              style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 14 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{displayName}</h2>

                <form action={markAllWrapped} style={{ margin: 0 }}>
                  <input type="hidden" name="recipientKey" value={key} />
                  <input type="hidden" name="listId" value={activeSeason.list_id} />
                  <input type="hidden" name="seasonId" value={activeSeason.id} />
                  <button type="submit" style={groupActionButtonStyle()}>
                    Mark all wrapped
                  </button>
                </form>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {list.map((gift) => {
                  const shipping = gift.shipping_status ?? "unknown";
                  const isWrapped = gift.wrapped === true;

                  return (
                    <li key={gift.id} style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
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
                    </li>
                  );
                })}
              </ul>

              {list.length > 0 && (
                <div style={bottomActionRowStyle()}>
                  {/* ✅ FIXED: lowercase key */}
<ShareRecipientButton recipientKey={key} listId={activeSeason.list_id} />
                </div>
              )}
            </section>
          );
        })}
      </div>

      <AddGiftForm listId={activeSeason.list_id} seasonId={activeSeason.id} />
    </main>
  );
}
