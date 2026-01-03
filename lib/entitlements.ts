import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const FREE_RECIPIENT_LIMIT = 2;
export const FREE_GIFT_LIMIT = 3;
export const FREE_LIMIT_MESSAGE = "Free includes up to 2 people + 3 gifts per season.";

export type ProfileEntitlements = {
  id: string;
  is_pro: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export async function getProfileForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,is_pro,subscription_status,current_period_end")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("does not exist") || error.message.includes("column")) {
      const err = new Error("Entitlements misconfigured. Run Sync Access.");
      err.name = "ENTITLEMENTS_MISCONFIGURED";
      throw err;
    }
    throw new Error(error.message);
  }

  return (data ?? null) as ProfileEntitlements | null;
}

export function isPro(profile: ProfileEntitlements | null) {
  if (!profile) return false;
  const pro =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing" ||
    profile.subscription_status === "past_due" ||
    profile.is_pro === true;

  if (process.env.NODE_ENV !== "production") {
    console.log("[pro-check]", {
      userId: profile.id,
      isPro: pro,
      status: profile.subscription_status,
      is_pro: profile.is_pro,
    });
  }

  return pro;
}

function makeLimitError() {
  const err = new Error(FREE_LIMIT_MESSAGE);
  err.name = "LIMIT_REACHED";
  return err;
}

export async function assertCanAddRecipient(params: {
  userId: string;
  seasonId: string;
  listId: string;
  recipientName?: string | null;
}) {
  const profile = await getProfileForUser(params.userId);
  if (isPro(profile)) return;

  const recipientName = (params.recipientName ?? "").trim();
  if (!recipientName) return;

  const { data, error } = await supabaseAdmin
    .from("gifts")
    .select("recipient_name")
    .eq("list_id", params.listId)
    .eq("season_id", params.seasonId);

  if (error) {
    throw new Error(error.message);
  }

  const distinct = new Set(
    (data ?? [])
      .map((row: any) => (row.recipient_name ?? "").trim())
      .filter(Boolean)
      .map((name: string) => name.toLowerCase())
  );

  const nextKey = recipientName.toLowerCase();
  const isNewRecipient = nextKey.length > 0 && !distinct.has(nextKey);

  if (isNewRecipient && distinct.size >= FREE_RECIPIENT_LIMIT) {
    throw makeLimitError();
  }
}

export async function assertCanAddGift(params: {
  userId: string;
  seasonId: string;
  listId: string;
}) {
  const profile = await getProfileForUser(params.userId);
  if (isPro(profile)) return;

  const { count, error } = await supabaseAdmin
    .from("gifts")
    .select("id", { count: "exact", head: true })
    .eq("list_id", params.listId)
    .eq("season_id", params.seasonId);

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) >= FREE_GIFT_LIMIT) {
    throw makeLimitError();
  }
}
