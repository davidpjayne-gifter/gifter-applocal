import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";
import { getProfileForUser, isPro as isProFromProfile } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fallback = (source: string) =>
    NextResponse.json({
      ok: true,
      tier: "free",
      isPro: false,
      source,
      profile: null,
      devices: [],
      pastSeasons: [],
    });

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    let {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user) {
      const auth = req.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

      if (token) {
        const tokenRes = await supabase.auth.getUser(token);
        user = tokenRes.data.user ?? null;
        userError = tokenRes.error ?? null;
      }
    }

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email ?? null;
    const authSource: "cookie" = "cookie";
    const entitlementsProfile = await getProfileForUser(user.id).catch(() => null);
    const computedIsPro = entitlementsProfile ? isProFromProfile(entitlementsProfile) : false;
    let list: { id: string } | null = null;
    try {
      list = await getOrCreateCurrentList(userId);
    } catch (err) {
      console.error("[api/settings] list load failed", (err as Error)?.message ?? err);
      list = null;
    }

    const profileSelect =
      "id,email,name,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id";
    let profileData = null;
    let profileErr: { message?: string } | null = null;
    {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select(profileSelect)
        .eq("id", userId)
        .maybeSingle();
      profileData = data;
      profileErr = error;
    }

    if (profileErr) {
      console.error("[api/settings] profile load failed", profileErr.message);
      const { data, error } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", userId)
        .maybeSingle();
      profileData = data;
      profileErr = error;
    }

    if (profileErr) {
      console.error("[api/settings] profile load failed after fallback", profileErr.message);
      profileData = null;
    }

    let profile = profileData
      ? {
          ...profileData,
          email: profileData.email ?? userEmail ?? null,
        }
      : null;

    if (!profile) {
      let insertErr: { message?: string } | null = null;
      {
        const { error } = await supabaseAdmin.from("profiles").upsert({
          id: userId,
          email: userEmail ?? null,
          is_pro: false,
          subscription_status: "free",
        });
        insertErr = error;
      }

      if (insertErr) {
        console.error("[api/settings] profile upsert failed", insertErr.message);
        const { error } = await supabase.from("profiles").upsert({
          id: userId,
          email: userEmail ?? null,
          is_pro: false,
          subscription_status: "free",
        });
        insertErr = error;
      }

      if (insertErr) {
        console.error("[api/settings] profile upsert failed after fallback", insertErr.message);
        profile = null;
      }

      const { data: refreshed, error: refreshErr } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", userId)
        .maybeSingle();

      if (refreshErr || !refreshed) {
        console.error("[api/settings] profile refresh failed", refreshErr?.message ?? "missing");
      }

      if (refreshed) {
        profile = {
          ...refreshed,
          email: refreshed.email ?? userEmail ?? null,
        };
      }
    }

    console.log("[api/settings][debug]", {
      userId,
      is_pro: profile.is_pro,
      subscription_status: profile.subscription_status,
      current_period_end: profile.current_period_end,
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id,
    });

    let deviceData: any[] = [];
    let deviceErr: { message?: string } | null = null;
    {
      const { data, error } = await supabaseAdmin
        .from("user_devices")
        .select("id,user_id,device_label,last_seen_at,created_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false });
      deviceData = data ?? [];
      deviceErr = error;
    }

    if (deviceErr) {
      console.error("[api/settings] device load failed", deviceErr.message);
      const { data, error } = await supabase
        .from("user_devices")
        .select("id,user_id,device_label,last_seen_at,created_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false });
      deviceData = data ?? [];
      deviceErr = error;
    }

    if (deviceErr) {
      console.error("[api/settings] device load failed after fallback", deviceErr.message);
    }

    let seasonData: any[] = [];
    let seasonErr: { message?: string } | null = null;
    if (list?.id) {
      const { data, error } = await supabaseAdmin
        .from("seasons")
        .select("id,name,list_id,is_active,created_at,is_wrapped_up,wrapped_up_at")
        .eq("list_id", list.id)
        .eq("is_wrapped_up", true)
        .order("wrapped_up_at", { ascending: false })
        .order("created_at", { ascending: false });
      seasonData = data ?? [];
      seasonErr = error;
    }

    if (seasonErr && list?.id) {
      console.error("[api/settings] past seasons load failed", seasonErr.message);
      const { data, error } = await supabase
        .from("seasons")
        .select("id,name,list_id,is_active,created_at,is_wrapped_up,wrapped_up_at")
        .eq("list_id", list.id)
        .eq("is_wrapped_up", true)
        .order("wrapped_up_at", { ascending: false })
        .order("created_at", { ascending: false });
      seasonData = data ?? [];
      seasonErr = error;
    }

    if (seasonErr) {
      console.error("[api/settings] past seasons load failed after fallback", seasonErr.message);
    }

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

    const pastSeasons = wrappedSeasons.map((season) => {
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

    const isPro = entitlementsProfile
      ? computedIsPro
      : profile
        ? profile.subscription_status === "active" ||
          profile.subscription_status === "trialing" ||
          profile.subscription_status === "past_due" ||
          profile.is_pro === true
        : false;

    const debug =
      process.env.NODE_ENV !== "production"
        ? {
            hadAuthHeader: false,
            authSource,
            userIdPresent: true,
            profileFound: true,
            userId,
            email: profile.email ?? null,
            is_pro: profile.is_pro,
            subscription_status: profile.subscription_status,
            current_period_end: profile.current_period_end,
            stripe_customer_id_present: Boolean(profile.stripe_customer_id),
            stripe_subscription_id_present: Boolean(profile.stripe_subscription_id),
            computedIsPro: isPro,
          }
        : undefined;

    return NextResponse.json({
      ok: true,
      tier: isPro ? "pro" : "free",
      isPro,
      source: "db",
      profile,
      devices: deviceData ?? [],
      pastSeasons,
      debug,
    });
  } catch (err: any) {
    console.error("[api/settings] settings load error", err?.message ?? err);
    return fallback("fallback");
  }
}
