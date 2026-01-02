import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  is_pro: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type Device = {
  id: string;
  user_id: string;
  device_label: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

type Season = {
  id: string;
  name: string;
  list_id: string;
  is_active: boolean;
  created_at: string | null;
  is_wrapped_up: boolean | null;
  wrapped_up_at: string | null;
  peopleCount: number;
  giftsCount: number;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

async function getAccessTokenFromCookies() {
  const store = await cookies();
  return (
    store.get("sb-access-token")?.value ??
    store.get("supabase-auth-token")?.value ??
    null
  );
}

async function reopenSeason(formData: FormData) {
  "use server";

  const seasonId = String(formData.get("seasonId") || "").trim();
  const listId = String(formData.get("listId") || "").trim();

  if (!seasonId || !listId || !isUuid(seasonId) || !isUuid(listId)) return;

  const token = await getAccessTokenFromCookies();
  if (!token) return;

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return;

  const list = await getOrCreateCurrentList(userData.user.id);
  if (list.id !== listId) return;

  const { data: season } = await supabaseAdmin
    .from("seasons")
    .select("id")
    .eq("id", seasonId)
    .eq("list_id", listId)
    .maybeSingle();

  if (!season) return;

  await supabaseAdmin
    .from("seasons")
    .update({ is_wrapped_up: false, wrapped_up_at: null })
    .eq("id", seasonId)
    .eq("list_id", listId);

  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const token = await getAccessTokenFromCookies();

  let profile: Profile | null = null;
  let devices: Device[] = [];
  let pastSeasons: Season[] = [];
  let listId = "";

  if (token) {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (!userErr && userData?.user) {
      const userId = userData.user.id;
      const list = await getOrCreateCurrentList(userId);
      listId = list.id;

      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select(
          "id,email,name,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id"
        )
        .eq("id", userId)
        .maybeSingle();

      profile = profileData
        ? {
            ...profileData,
            email: profileData.email ?? userData.user.email ?? null,
          }
        : {
            id: userId,
            email: userData.user.email ?? null,
            name: null,
            is_pro: false,
            subscription_status: null,
            current_period_end: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
          };

      const { data: deviceData } = await supabaseAdmin
        .from("user_devices")
        .select("id,user_id,device_label,last_seen_at,created_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false });

      devices = deviceData ?? [];

      const { data: seasonData } = await supabaseAdmin
        .from("seasons")
        .select("id,name,list_id,is_active,created_at,is_wrapped_up,wrapped_up_at")
        .eq("list_id", list.id)
        .eq("is_wrapped_up", true)
        .order("wrapped_up_at", { ascending: false })
        .order("created_at", { ascending: false });

      const wrappedSeasons = seasonData ?? [];
      const seasonIds = wrappedSeasons.map((season) => season.id);

      const { data: gifts } = seasonIds.length
        ? await supabaseAdmin
            .from("gifts")
            .select("season_id,recipient_name")
            .eq("list_id", list.id)
            .in("season_id", seasonIds)
        : { data: [] };

      const summaryMap = new Map<string, { people: Set<string>; giftsCount: number }>();
      for (const season of wrappedSeasons) {
        summaryMap.set(season.id, { people: new Set(), giftsCount: 0 });
      }

      for (const gift of gifts ?? []) {
        const seasonId = String(gift.season_id ?? "").trim();
        const entry = summaryMap.get(seasonId);
        if (!entry) continue;
        entry.giftsCount += 1;
        const nameKey = (gift.recipient_name ?? "").trim().toLowerCase();
        if (nameKey) entry.people.add(nameKey);
      }

      pastSeasons = wrappedSeasons.map((season) => {
        const entry = summaryMap.get(season.id);
        return {
          id: season.id,
          name: season.name ?? "Season",
          list_id: season.list_id,
          is_active: season.is_active,
          created_at: season.created_at ?? null,
          is_wrapped_up: season.is_wrapped_up ?? null,
          wrapped_up_at: season.wrapped_up_at ?? null,
          peopleCount: entry ? entry.people.size : 0,
          giftsCount: entry ? entry.giftsCount : 0,
        };
      });
    }
  }

  return (
    <SettingsClient
      initialProfile={profile}
      initialDevices={devices}
      initialPastSeasons={pastSeasons}
      listId={listId}
      onReopenSeason={reopenSeason}
    />
  );
}
