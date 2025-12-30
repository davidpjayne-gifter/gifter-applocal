import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const FREE_RECIPIENT_LIMIT = 2;
export const FREE_GIFT_LIMIT = 3;
export const FREE_LIMIT_MESSAGE = "Free includes up to 2 people + 3 gifts per season.";

export type ProfileEntitlements = {
  id: string;
  tier: string | null;
  is_pro: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export async function getProfileForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,tier,is_pro,subscription_status,current_period_end")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ProfileEntitlements | null;
}

export function isPro(profile: ProfileEntitlements | null) {
  if (!profile) return false;
  return profile.subscription_status === "active" || profile.is_pro === true;
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
    throw new Error(FREE_LIMIT_MESSAGE);
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
    throw new Error(FREE_LIMIT_MESSAGE);
  }
}
