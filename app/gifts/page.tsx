import type { CSSProperties } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import RefreshAfterAdd from "./RefreshAfterAdd";
import NewSeasonSheet from "./NewSeasonSheet";
import ShareRecipientButton from "./ShareRecipientButton";
import RecipientWrapUpButton from "./RecipientWrapUpButton";
import SeasonBudgetPill from "./SeasonBudgetPill";
import SignOutButton from "./SignOutButton";
import GiftRow from "./GiftRow";
import SignInBanner from "./SignInBanner";
import HowThisWorks from "./HowThisWorks";
import RecipientDetailsSheet from "./RecipientDetailsSheet";
import SeasonalGiftIcon from "@/app/components/SeasonalGiftIcon";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FREE_GIFT_LIMIT, FREE_RECIPIENT_LIMIT, getProfileForUser, isPro } from "@/lib/entitlements";
import { getOrCreateCurrentList } from "@/lib/currentList";

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
  wrapped_up_at: string | null;
  gender: string | null;
  age_range: string | null;
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

function formatRecipientDetails(gender: string | null, ageRange: string | null) {
  const genderLabel =
    gender === "male" ? "Male" : gender === "female" ? "Female" : null;

  const ageLabelMap: Record<string, string> = {
    "13-17": "13–17",
    "18-24": "18–24",
    "25-34": "25–34",
    "35-44": "35–44",
    "45-54": "45–54",
    "55-64": "55–64",
    "65+": "65+",
  };
  const ageLabel = ageRange ? ageLabelMap[ageRange] ?? null : null;

  const parts = [genderLabel, ageLabel].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

async function getUserIdFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value ?? null;
  if (!token) return null;

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return null;
  return userData.user.id;
}

/* ---------------- SERVER ACTIONS ---------------- */

async function updateGiftStatus(formData: FormData) {
  "use server";

  const giftId = String(formData.get("giftId") || "");
  const status = String(formData.get("status") || "");

  if (!giftId) return;

  const userId = await getUserIdFromCookie();
  if (!userId) return;

  const { id: listId } = await getOrCreateCurrentList(userId);

  if (status === "wrapped") {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: true, shipping_status: "arrived" })
      .eq("id", giftId)
      .eq("list_id", listId);
  } else if (status === "arrived") {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "arrived" })
      .eq("id", giftId)
      .eq("list_id", listId);
  } else if (status === "in_transit") {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "in_transit" })
      .eq("id", giftId)
      .eq("list_id", listId);
  } else {
    await supabaseAdmin
      .from("gifts")
      .update({ wrapped: false, shipping_status: "unknown" })
      .eq("id", giftId)
      .eq("list_id", listId);
  }

  revalidatePath("/gifts");
}

async function markRecipientWrappedUp(formData: FormData) {
  "use server";

  const recipientKey = String(formData.get("recipientKey") || "");
  const seasonId = String(formData.get("seasonId") || "");

  if (!recipientKey || !seasonId) return;

  const userId = await getUserIdFromCookie();
  if (!userId) return;

  const { id: listId } = await getOrCreateCurrentList(userId);

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
  const seasonId = String(formData.get("seasonId") || "");

  if (!recipientKey || !seasonId) return;

  const userId = await getUserIdFromCookie();
  if (!userId) return;

  const { id: listId } = await getOrCreateCurrentList(userId);

  await supabaseAdmin
    .from("recipient_wrapups")
    .update({ wrapped_up_at: null })
    .eq("season_id", seasonId)
    .eq("list_id", listId)
    .eq("recipient_key", recipientKey);

  revalidatePath("/gifts");
}

async function updateRecipientDetails(formData: FormData) {
  "use server";

  const recipientKey = String(formData.get("recipientKey") || "").trim().toLowerCase();
  const seasonId = String(formData.get("seasonId") || "").trim();
  const listId = String(formData.get("listId") || "").trim();
  const genderRaw = String(formData.get("gender") || "").trim();
  const ageRangeRaw = String(formData.get("ageRange") || "").trim();

  if (!recipientKey || !seasonId || !listId) return;

  const userId = await getUserIdFromCookie();
  if (!userId) return;

  const payload = {
    season_id: seasonId,
    list_id: listId,
    recipient_key: recipientKey,
    gender: genderRaw || null,
    age_range: ageRangeRaw || null,
  };

  await supabaseAdmin
    .from("recipient_wrapups")
    .upsert(payload, { onConflict: "season_id,list_id,recipient_key" });

  revalidatePath("/gifts");
}

/* ---------------- PAGE ---------------- */

export default async function GiftsPage(props: {
  searchParams?: Promise<{ season?: string; upgraded?: string }> | { season?: string; upgraded?: string };
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedSeasonId =
    typeof searchParams?.season === "string" ? searchParams.season.trim() : "";
  const upgraded =
    typeof searchParams?.upgraded === "string" ? searchParams.upgraded.trim() === "1" : false;

  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value ?? null;
  let userId: string | null = null;
  let userEmail: string | null = null;

  if (token) {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (!userErr && userData?.user?.id) {
      userId = userData.user.id;
      userEmail = userData.user.email ?? null;
    }
  }

  if (!userId) {
    return (
      <main style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <SignInBanner />
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, textAlign: "center" }}>My GIFTs</div>
        </div>
        <div
          className="text-slate-600 dark:text-slate-300"
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 14,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div className="text-slate-900" style={{ fontWeight: 700 }}>
            Sign in to see your list
          </div>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            GIFTer is a web app. We’ll email you a sign-in link so you can pick up on any device.
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 10 }}>
            <Link
              href="/login?next=/gifts"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Sign in with email
            </Link>
            <Link
              href="/"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const upgradedBanner = upgraded ? (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/20 via-blue-600/10 to-blue-600/5 px-4 py-3 text-sm text-slate-900">
      <div className="font-extrabold">You’re Pro 🎉 Thanks for upgrading!</div>
      <div className="mt-1 text-xs text-slate-700">
        Your Pro plan is active. Enjoy unlimited GIFTing.
      </div>
    </div>
  ) : null;

  let listIdForClient = "";

  try {
    const list = await getOrCreateCurrentList(userId);
    listIdForClient = list.id;
  } catch (err: any) {
    return (
      <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        {upgradedBanner}
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>My GIFTs</h1>
        <p style={{ color: "#b91c1c" }}>Failed to load your gift list.</p>
      </main>
    );
  }

  const { data: seasons, error: seasonsErr } = await supabaseAdmin
    .from("seasons")
    .select("id,name,list_id,is_active,budget,created_at")
    .eq("list_id", listIdForClient)
    .order("created_at", { ascending: false });

  if (seasonsErr) {
    return (
      <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        {upgradedBanner}
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>My GIFTs</h1>
        <p style={{ color: "#b91c1c" }}>Failed to load seasons.</p>
      </main>
    );
  }

  const requestedSeason = requestedSeasonId
    ? (seasons ?? []).find((season) => season.id === requestedSeasonId) ?? null
    : null;

  const activeSeason = requestedSeason ?? (seasons ?? []).find((season) => season.is_active) ?? null;

  if (!activeSeason) {
    return (
      <main style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <SignInBanner />
        {upgradedBanner}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, textAlign: "center" }}>My GIFTs</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/15 via-blue-600/10 to-blue-600/5 px-4 py-4 text-slate-900">
          <div className="text-base font-black">Start your first season</div>
          <div className="mt-1 text-sm text-slate-700">
            Create a season to start adding gifts.
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: 16 }}>
          <NewSeasonSheet listId={listIdForClient} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 pb-10">
          <Link
            href="/settings"
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 12,
              fontWeight: 800,
              color: "#334155",
              textDecoration: "none",
            }}
          >
            Settings
          </Link>
          <SignOutButton />
        </div>
      </main>
    );
  }

  const { data: giftsRaw } = await supabaseAdmin
    .from("gifts")
    .select("*")
    .eq("list_id", listIdForClient)
    .eq("season_id", activeSeason.id)
    .order("recipient_name", { ascending: true })
    .order("created_at", { ascending: false });

  const gifts: Gift[] = (giftsRaw ?? []).map((g: any) => ({
    ...g,
    shipping_status: normalizeStatus(g.shipping_status),
    wrapped: Boolean(g.wrapped),
  }));

  const totalSpent = seasonTotalSpent(gifts);
  const giftsUsed = gifts.length;
  const existingRecipientKeys = Array.from(
    new Set(
      gifts
        .map((g) => (g.recipient_name ?? "").trim())
        .filter(Boolean)
        .map((name) => name.toLowerCase())
    )
  );
  const recipientsUsed = existingRecipientKeys.length;

  let profile = null;
  if (userId) {
    try {
      profile = await getProfileForUser(userId);
    } catch {
      profile = null;
    }
  }
  const userIsPro = profile ? isPro(profile) : false;

  const grouped = gifts.reduce<Record<string, Gift[]>>((acc, gift) => {
    const key = (gift.recipient_name?.trim() || "unassigned").toLowerCase();
    acc[key] ||= [];
    acc[key].push(gift);
    return acc;
  }, {});

  const recipientKeys = Object.keys(grouped);

  const { data: wrapupsRaw } = await supabaseAdmin
    .from("recipient_wrapups")
    .select("season_id,list_id,recipient_key,wrapped_up_at,gender,age_range")
    .eq("season_id", activeSeason.id)
    .eq("list_id", listIdForClient);

  const wrapups = (wrapupsRaw ?? []) as RecipientWrapupRow[];
  const wrapupsByRecipient = new Map(wrapups.map((r) => [r.recipient_key, r]));
  const wrapupSet = new Set(
    wrapups.filter((r) => Boolean(r.wrapped_up_at)).map((r) => r.recipient_key)
  );

  const sortedRecipientKeys = [...recipientKeys].sort((a, b) => {
    const aWU = wrapupSet.has(a);
    const bWU = wrapupSet.has(b);
    return Number(aWU) - Number(bWU);
  });

  const seasonIdForClient = String(activeSeason.id ?? "").trim();

  return (
    <>
      <main style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        <SignInBanner />
        {upgradedBanner}
        <SeasonalGiftIcon />
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 22, fontWeight: 900, textAlign: "center", flex: 1 }}>
              My GIFTs
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              {userEmail === "davidpjayne@gmail.com" && (
                <a
                  href="/api/debug/subscription"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline opacity-70 hover:opacity-100"
                >
                  Debug
                </a>
              )}
            </div>
          </div>

          <div className="mt-3 flex w-full flex-col items-center gap-3">
            <div className="flex w-full justify-center">
              <span className="text-slate-900" style={pillStyle()}>
                Season: {activeSeason.name}
              </span>
            </div>
            <div className="flex w-full justify-center">
              <span className="text-slate-900" style={{ ...pillStyle(), opacity: 0.9 }}>
                GIFTee: {sortedRecipientKeys.length}
              </span>
            </div>
            <div className="flex w-full flex-wrap justify-center gap-2">
              <span className="text-slate-900" style={{ ...pillStyle(), borderColor: "#cbd5e1" }}>
                Total Spent: {money(totalSpent)}
              </span>

              <SeasonBudgetPill
                seasonId={seasonIdForClient}
                totalSpent={totalSpent}
                initialBudget={activeSeason.budget ?? null}
              />
            </div>
            <div className="flex justify-center">
              <HowThisWorks />
            </div>
          </div>
        </div>

      {gifts.length === 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/15 via-blue-600/10 to-blue-600/5 px-4 py-4 text-slate-900">
          <div className="text-base font-black text-center text-gray-900 dark:text-gray-100">
            Start by adding a person
          </div>
          <div className="mt-1 text-sm text-center text-gray-900 dark:text-gray-100">
            Start by adding a person, then add gifts under them.
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <RefreshAfterAdd
              listId={listIdForClient}
              seasonId={seasonIdForClient}
              recipientName={null}
              isPro={userIsPro}
              giftsUsed={giftsUsed}
              recipientsUsed={recipientsUsed}
              freeGiftLimit={FREE_GIFT_LIMIT}
              freeRecipientLimit={FREE_RECIPIENT_LIMIT}
              existingRecipientKeys={existingRecipientKeys}
              triggerVariant="inline"
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedRecipientKeys.map((key) => {
            const list = grouped[key];
            const displayName = key === "unassigned" ? "Unassigned" : toTitleCase(key);

            const { total, wrappedCount, unwrappedCount, spend, hasAnyCost } = recipientSummary(list);
            const isWrappedUp = wrapupSet.has(key);
            const details = wrapupsByRecipient.get(key) ?? null;
            const detailsLine = formatRecipientDetails(details?.gender ?? null, details?.age_range ?? null);
            const canEditDetails = key !== "unassigned";

            if (isWrappedUp) {
              return (
                <section
                  key={key}
                  className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm"
                >
                  <form action={reopenRecipient} className="m-0">
                    <input type="hidden" name="recipientKey" value={key} />
                    <input type="hidden" name="listId" value={listIdForClient} />
                    <input type="hidden" name="seasonId" value={seasonIdForClient} />

                    <button
                      type="submit"
                      className="w-full cursor-pointer text-left"
                      title="Click to reopen"
                    >
                      <div className="border-b border-blue-700/70 bg-gradient-to-br from-blue-600/25 via-blue-600/20 to-blue-600/10 px-4 py-4 sm:px-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                              {displayName}
                            </h2>

                            {(detailsLine || canEditDetails) && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                {detailsLine && <span>{detailsLine}</span>}
                                {canEditDetails && (
                                  <RecipientDetailsSheet
                                    recipientKey={key}
                                    listId={listIdForClient}
                                    seasonId={seasonIdForClient}
                                    initialGender={details?.gender ?? null}
                                    initialAgeRange={details?.age_range ?? null}
                                    onSave={updateRecipientDetails}
                                  />
                                )}
                              </div>
                            )}

                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-900">
                              <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1">
                              {wrappedCount}/{total} wrapped
                              </span>
                              <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1">
                                {total} total
                              </span>
                              {hasAnyCost && (
                                <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1">
                                  {money(spend)}
                                </span>
                              )}
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                                all wrapped
                              </span>
                            </div>

                            <div className="mt-3 h-2 w-full rounded-full bg-emerald-100">
                              <div className="h-2 w-full rounded-full bg-emerald-500" />
                            </div>

                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                              Wrapped up — click to reopen
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-slate-700">Ready ✅</div>
                        </div>
                      </div>
                    </button>
                  </form>
                </section>
              );
            }

            return (
              <section
                key={key}
                className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm"
              >
                <div className="border-b border-blue-700/70 bg-gradient-to-br from-blue-600/25 via-blue-600/20 to-blue-600/10 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                        {displayName}
                      </h2>

                      {(detailsLine || canEditDetails) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {detailsLine && <span>{detailsLine}</span>}
                          {canEditDetails && (
                            <RecipientDetailsSheet
                              recipientKey={key}
                              listId={listIdForClient}
                              seasonId={seasonIdForClient}
                              initialGender={details?.gender ?? null}
                              initialAgeRange={details?.age_range ?? null}
                              onSave={updateRecipientDetails}
                            />
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-900">
                        <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1">
                          {wrappedCount}/{total} wrapped
                        </span>
                        <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1">
                          {total} total
                        </span>
                        {hasAnyCost && (
                          <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1">
                            {money(spend)}
                          </span>
                        )}

                        {unwrappedCount > 0 ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-800">
                            {unwrappedCount} to wrap
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                            all wrapped
                          </span>
                        )}
                      </div>

                      <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.round((wrappedCount / Math.max(total, 1)) * 100)}%`,
                          }}
                        />
                      </div>

                      {/* ✅ RESTORED: Add gift for THIS recipient */}
                      <div className="mt-3">
                        <RefreshAfterAdd
                          listId={listIdForClient}
                          seasonId={seasonIdForClient}
                          recipientName={key === "unassigned" ? null : displayName}
                          isPro={userIsPro}
                          giftsUsed={giftsUsed}
                          recipientsUsed={recipientsUsed}
                          freeGiftLimit={FREE_GIFT_LIMIT}
                          freeRecipientLimit={FREE_RECIPIENT_LIMIT}
                          existingRecipientKeys={existingRecipientKeys}
                        />
                      </div>
                    </div>

                    <form action={markRecipientWrappedUp} className="m-0">
                      <input type="hidden" name="recipientKey" value={key} />
                      <input type="hidden" name="listId" value={listIdForClient} />
                      <input type="hidden" name="seasonId" value={seasonIdForClient} />

                      <RecipientWrapUpButton
                        disabled={list.length === 0}
                        label="Mark All Wrapped Up"
                        confirmText={`Wrap up ${displayName}?\n\nThis will mark all gifts as wrapped and collapse this section (you can reopen it anytime).`}
                        autoWrap
                        totalGifts={total}
                        wrappedCount={wrappedCount}
                      />
                    </form>
                  </div>
                </div>

                <div style={{ padding: "0 14px 14px 14px" }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {list.map((gift) => (
                      <GiftRow key={gift.id} gift={gift} updateGiftStatus={updateGiftStatus} />
                    ))}
                  </ul>

                  {list.length > 0 && (
                    <div style={bottomActionRowStyle()}>
                      <ShareRecipientButton
                        scope="giftee"
                        recipientKey={key}
                        recipientName={displayName}
                        listId={listIdForClient}
                        seasonId={seasonIdForClient}
                      />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {gifts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <RefreshAfterAdd
            listId={listIdForClient}
            seasonId={seasonIdForClient}
            recipientName={null}
            isPro={userIsPro}
            giftsUsed={giftsUsed}
            recipientsUsed={recipientsUsed}
            freeGiftLimit={FREE_GIFT_LIMIT}
            freeRecipientLimit={FREE_RECIPIENT_LIMIT}
            existingRecipientKeys={existingRecipientKeys}
          />
        </div>
      )}

      {sortedRecipientKeys.length > 0 && (
        <div className="mt-4 flex justify-center">
          <ShareRecipientButton
            scope="list"
            listId={listIdForClient}
            seasonId={seasonIdForClient}
          />
        </div>
      )}

      <div className="flex justify-center" style={{ marginTop: 16 }}>
        <NewSeasonSheet listId={listIdForClient} />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 pb-10">
        <Link
          href="/settings"
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 12,
            fontWeight: 800,
            color: "#334155",
            textDecoration: "none",
          }}
        >
          Settings
        </Link>
        <SignOutButton />
      </div>
      </main>
    </>
  );
}
