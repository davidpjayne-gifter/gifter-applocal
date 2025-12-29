import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";

import RefreshAfterAdd from "./RefreshAfterAdd";
import NewSeasonSheet from "./NewSeasonSheet";
import CopyButton from "./CopyButton";
import GiftStatusForm from "./GiftStatusForm";
import ShareRecipientButton from "./ShareRecipientButton";
import RecipientWrapUpButton from "./RecipientWrapUpButton";
import SeasonBudgetPill from "./SeasonBudgetPill";

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
  budget: number | null;
};

type RecipientWrapupRow = {
  season_id: string;
  list_id: string;
  recipient_key: string;
  wrapped_up_at: string;
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

function bottomActionRowStyle(): CSSProperties {
  return {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #e2e8f0",
    display: "flex",
    justifyContent: "center",
  };
}

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function recipientSummary(gifts: Gift[]) {
  const total = gifts.length;
  const wrappedCount = gifts.filter((g) => g.wrapped === true).length;
  const unwrappedCount = total - wrappedCount;

  const spend = gifts.reduce((sum, g) => sum + (typeof g.cost === "number" ? g.cost : 0), 0);
  const hasAnyCost = gifts.some((g) => typeof g.cost === "number" && !Number.isNaN(g.cost));

  return { total, wrappedCount, unwrappedCount, spend, hasAnyCost };
}

function seasonTotalSpent(allGifts: Gift[]) {
  return allGifts.reduce((sum, g) => sum + (typeof g.cost === "number" ? g.cost : 0), 0);
}

/* ---------------- SERVER ACTIONS ---------------- */

async function updateGiftStatus(formData: FormData) {
  "use server";

  const giftId = String(formData.get("giftId") || "");
  const status = String(formData.get("status") || "");

  if (!giftId) return;

  if (status === "wrapped") {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: true, shipping_status: "arrived" })
      .eq("id", giftId);
  } else if (status === "arrived") {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "arrived" })
      .eq("id", giftId);
  } else if (status === "in_transit") {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "in_transit" })
      .eq("id", giftId);
  } else {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "unknown" })
      .eq("id", giftId);
  }

  revalidatePath("/gifts");
}

async function markRecipientWrappedUp(formData: FormData) {
  "use server";

  const recipientKey = String(formData.get("recipientKey") || "");
  const listId = String(formData.get("listId") || "");
  const seasonId = String(formData.get("seasonId") || "");

  if (!recipientKey || !listId || !seasonId) return;

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

  await supabaseAdmin
    .from("recipient_wrapups")
    .upsert(
      {
        season_id: seasonId,
        list_id: listId,
        recipient_key: recipientKey,
        wrapped_up_at: new Date().toISOString(),
      },
      { onConflict: "season_id,list_id,recipient_key" }
    );

  revalidatePath("/gifts");
}

async function reopenRecipient(formData: FormData) {
  "use server";

  const recipientKey = String(formData.get("recipientKey") || "");
  const listId = String(formData.get("listId") || "");
  const seasonId = String(formData.get("seasonId") || "");

  if (!recipientKey || !listId || !seasonId) return;

  await supabaseAdmin
    .from("recipient_wrapups")
    .delete()
    .eq("season_id", seasonId)
    .eq("list_id", listId)
    .eq("recipient_key", recipientKey);

  revalidatePath("/gifts");
}

/* ---------------- PAGE ---------------- */

export default async function GiftsPage() {
  const { data: activeSeason, error: seasonErr } = await supabase
    .from("seasons")
    .select("id,name,list_id,is_active,budget")
    .eq("is_active", true)
    .single<Season>();

  if (seasonErr || !activeSeason?.id) {
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

  const totalSpent = seasonTotalSpent(gifts);

  const grouped = gifts.reduce<Record<string, Gift[]>>((acc, gift) => {
    const key = (gift.recipient_name?.trim() || "unassigned").toLowerCase();
    acc[key] ||= [];
    acc[key].push(gift);
    return acc;
  }, {});

  const recipientKeys = Object.keys(grouped);

  const { data: wrapupsRaw } = await supabase
    .from("recipient_wrapups")
    .select("season_id,list_id,recipient_key,wrapped_up_at")
    .eq("season_id", activeSeason.id)
    .eq("list_id", activeSeason.list_id);

  const wrapups = (wrapupsRaw ?? []) as RecipientWrapupRow[];
  const wrapupSet = new Set(wrapups.map((r) => r.recipient_key));

  const sortedRecipientKeys = [...recipientKeys].sort((a, b) => {
    const aWU = wrapupSet.has(a);
    const bWU = wrapupSet.has(b);
    return Number(aWU) - Number(bWU);
  });

  const seasonIdForClient = String(activeSeason.id ?? "").trim();
  const listIdForClient = String(activeSeason.list_id ?? "").trim();

  return (
    <main style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>My Gifts</div>

        <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={pillStyle()}>Season: {activeSeason.name}</span>

          <span style={{ ...pillStyle(), opacity: 0.9 }}>
            Recipients: {sortedRecipientKeys.length}
          </span>

          <span style={{ ...pillStyle(), borderColor: "#cbd5e1" }}>
            Total Spent: {money(totalSpent)}
          </span>

          <SeasonBudgetPill
            seasonId={seasonIdForClient}
            totalSpent={totalSpent}
            initialBudget={activeSeason.budget ?? null}
          />
        </div>

        <NewSeasonSheet listId={listIdForClient} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sortedRecipientKeys.map((key) => {
          const list = grouped[key];
          const displayName = key === "unassigned" ? "Unassigned" : toTitleCase(key);

          const { total, wrappedCount, unwrappedCount, spend, hasAnyCost } = recipientSummary(list);
          const isWrappedUp = wrapupSet.has(key);

          const sectionShell: CSSProperties = {
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
          };

          const headerRow: CSSProperties = {
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          };

          const summaryRow: CSSProperties = {
            marginTop: 6,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 12,
            opacity: 0.85,
          };

          const summaryPill: CSSProperties = {
            padding: "3px 8px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontWeight: 800,
          };

          if (isWrappedUp) {
            return (
              <section key={key} style={{ ...sectionShell, opacity: 0.95 }}>
                <form action={reopenRecipient} style={{ margin: 0 }}>
                  <input type="hidden" name="recipientKey" value={key} />
                  <input type="hidden" name="listId" value={listIdForClient} />
                  <input type="hidden" name="seasonId" value={seasonIdForClient} />

                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "white",
                      cursor: "pointer",
                    }}
                    title="Click to reopen"
                  >
                    <div style={headerRow}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{displayName}</h2>

                        <div style={summaryRow}>
                          <span style={summaryPill}>
                            {wrappedCount}/{total} wrapped
                          </span>
                          <span style={summaryPill}>{total} gifts</span>
                          {hasAnyCost && <span style={summaryPill}>{money(spend)}</span>}
                          <span style={{ ...summaryPill, borderColor: "#bbf7d0" }}>done GIFTing</span>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                          ✅ Wrapped up — click to reopen
                        </div>
                      </div>

                      <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>🎁 ✅</div>
                    </div>
                  </button>
                </form>
              </section>
            );
          }

          return (
            <section key={key} style={sectionShell}>
              <div style={headerRow}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{displayName}</h2>

                  <div style={summaryRow}>
                    <span style={summaryPill}>
                      {wrappedCount}/{total} wrapped
                    </span>
                    <span style={summaryPill}>{total} gifts</span>
                    {hasAnyCost && <span style={summaryPill}>{money(spend)}</span>}

                    {unwrappedCount > 0 ? (
                      <span style={{ ...summaryPill, borderColor: "#fecaca" }}>
                        {unwrappedCount} left
                      </span>
                    ) : (
                      <span style={{ ...summaryPill, borderColor: "#bbf7d0" }}>all wrapped</span>
                    )}
                  </div>

                  {/* ✅ RESTORED: Add gift for THIS recipient */}
                  <div style={{ marginTop: 10 }}>
                    <RefreshAfterAdd
                      listId={listIdForClient}
                      seasonId={seasonIdForClient}
                      recipientName={key === "unassigned" ? null : displayName}
                    />
                  </div>
                </div>

                <form action={markRecipientWrappedUp} style={{ margin: 0 }}>
                  <input type="hidden" name="recipientKey" value={key} />
                  <input type="hidden" name="listId" value={listIdForClient} />
                  <input type="hidden" name="seasonId" value={seasonIdForClient} />

                  <RecipientWrapUpButton
                    disabled={list.length === 0}
                    label="Mark All Wrapped Up"
                    confirmText={`Wrap up ${displayName}?\n\nThis will mark all gifts as wrapped and collapse this section (you can reopen it anytime).`}
                  />
                </form>
              </div>

              <div style={{ padding: "0 14px 14px 14px" }}>
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
                    <ShareRecipientButton recipientKey={key} listId={listIdForClient} />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ✅ Keep bottom “unassigned” add too */}
      <div style={{ marginTop: 16 }}>
        <RefreshAfterAdd listId={listIdForClient} seasonId={seasonIdForClient} recipientName={null} />
      </div>
    </main>
  );
}
