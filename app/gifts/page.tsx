import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import RefreshAfterAdd from "./RefreshAfterAdd";
import ShareRecipientButton from "./ShareRecipientButton";
import CopyButton from "./CopyButton";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
};

function toTitleCase(str: string) {
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function normalizeStatus(status: any): ShippingStatus {
  if (status === "arrived" || status === "in_transit" || status === "unknown") return status;
  return "unknown";
}

function pillStyle(): CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    fontSize: 12,
    fontWeight: 900,
    background: "#fff",
  };
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

function statusButtonStyle(active: boolean): CSSProperties {
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

// ✅ Server action to update gift status (live buttons)
async function updateGiftStatus(formData: FormData) {
  "use server";

  const giftId = String(formData.get("giftId") || "");
  const status = String(formData.get("status") || "");

  if (!giftId) return;

  if (status === "wrapped") {
    // When user chooses Wrapped, we store wrapped=true and also mark shipping_status as arrived.
    // Not automatic — it only happens because they clicked Wrapped.
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
    // fallback
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "unknown" })
      .eq("id", giftId);
  }

  revalidatePath("/gifts");
}

export default async function GiftsPage() {
  const { data: giftsRaw, error } = await supabase
    .from("gifts")
    .select("id, title, recipient_name, cost, tracking_number, delivery_eta, shipping_status, wrapped")
    .order("recipient_name", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>My Gifts</h1>
        <p style={{ color: "#b91c1c" }}>Error loading gifts: {error.message}</p>
      </main>
    );
  }

  const gifts: Gift[] = (giftsRaw ?? []).map((g: any) => ({
    ...g,
    shipping_status: normalizeStatus(g.shipping_status),
    wrapped: Boolean(g.wrapped),
  }));

  // ✅ Grand total (private)
  const grandTotal = gifts.reduce((sum, g) => sum + (typeof g.cost === "number" ? g.cost : 0), 0);

  // Group by recipient (case-insensitive)
  const grouped = gifts.reduce<Record<string, Gift[]>>((acc, gift) => {
    const key = (gift.recipient_name?.trim() || "Unassigned").toLowerCase();
    acc[key] ||= [];
    acc[key].push(gift);
    return acc;
  }, {});

  const recipientKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
  <a
    href="/"
    style={{
      display: "inline-block",
      marginBottom: 6,
      fontSize: 13,
      fontWeight: 800,
      color: "#0f172a",
      textDecoration: "none",
    }}
  >
    ← Back to Tracker
  </a>

  <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>My Gifts</h1>

  <div style={{ fontSize: 16, fontWeight: 900 }}>
    Total spent: {formatMoney(grandTotal)}
  </div>

  <p style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
    Totals + status breakdown are private (not shown on shared links)
  </p>
</div>


      {/* Add Gift */}
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
          background: "#ffffff",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Add a Gift</h2>
        <RefreshAfterAdd />
      </section>

      {recipientKeys.length === 0 ? (
        <section
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 12,
            padding: 18,
            color: "#64748b",
            textAlign: "center",
          }}
        >
          No gifts added yet.
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {recipientKeys.map((key) => {
            const list = grouped[key];
            const displayName = key === "unassigned" ? "Unassigned" : toTitleCase(key);

            // per-recipient total
            const recipientTotal = list.reduce(
              (sum, g) => sum + (typeof g.cost === "number" ? g.cost : 0),
              0
            );

            // status counts
            const counts = list.reduce(
              (acc, g) => {
                const s = normalizeStatus(g.shipping_status);
                acc[s] += 1;
                if (g.wrapped) acc.wrapped += 1;
                return acc;
              },
              { unknown: 0, in_transit: 0, arrived: 0, wrapped: 0 }
            );

            // ✅ "Completed" definition: every gift is wrapped (and there is at least 1 gift)
            const isCompleted = list.length > 0 && counts.wrapped === list.length;

            return (
              <section
                key={key}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  background: "#ffffff",
                }}
              >
                {/* Recipient header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{displayName}</h2>
                      {isCompleted ? <span style={pillStyle()}>Completed ✅</span> : null}
                    </div>

                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      {list.length} gift{list.length === 1 ? "" : "s"} •{" "}
                      <span style={{ fontWeight: 900, color: "#0f172a" }}>
                        {formatMoney(recipientTotal)}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      <span style={pillStyle()}>In Transit: {counts.in_transit}</span>
                      <span style={pillStyle()}>Arrived: {counts.arrived}</span>
                      <span style={pillStyle()}>Unknown: {counts.unknown}</span>
                      <span style={pillStyle()}>Wrapped: {counts.wrapped}</span>
                    </div>
                  </div>

                  <ShareRecipientButton recipient={displayName} />
                </div>

                {/* Gifts */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {list.map((gift) => {
                    const shipping = normalizeStatus(gift.shipping_status);
                    const currentStatus = gift.wrapped ? "wrapped" : shipping; // display logic only

                    const hasTracking = Boolean(gift.tracking_number && gift.tracking_number.trim());

                    return (
                      <li
                        key={gift.id}
                        style={{
                          padding: "12px 0",
                          borderTop: "1px solid #f1f5f9",
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 15 }}>{gift.title}</div>

                        {/* Status options (live update) */}
                        <form action={updateGiftStatus} style={{ marginTop: 10 }}>
                          <input type="hidden" name="giftId" value={gift.id} />

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="submit"
                              name="status"
                              value="in_transit"
                              style={statusButtonStyle(currentStatus === "in_transit")}
                            >
                              In Transit
                            </button>

                            <button
                              type="submit"
                              name="status"
                              value="arrived"
                              style={statusButtonStyle(currentStatus === "arrived")}
                            >
                              Arrived
                            </button>

                            <button
                              type="submit"
                              name="status"
                              value="wrapped"
                              style={statusButtonStyle(currentStatus === "wrapped")}
                            >
                              Wrapped 🎁
                            </button>
                          </div>

                          {/* Small hint line */}
                          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                            Current:{" "}
                            <span style={{ fontWeight: 900, color: "#0f172a" }}>
                              {currentStatus === "wrapped" ? "Wrapped" : statusLabel(shipping)}
                            </span>
                          </div>
                        </form>

                        {/* Cost + tracking storage */}
                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {typeof gift.cost === "number" ? (
                            <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
                              {formatMoney(gift.cost)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, color: "#94a3b8" }}>No cost</span>
                          )}

                          {hasTracking && gift.tracking_number ? (
                            <>
                              <span style={{ fontSize: 13, color: "#475569" }}>
                                Tracking: {gift.tracking_number}
                              </span>
                              <CopyButton text={gift.tracking_number} />
                            </>
                          ) : (
                            <span style={{ fontSize: 13, color: "#94a3b8" }}>No tracking</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
