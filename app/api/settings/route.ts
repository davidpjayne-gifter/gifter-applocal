import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
    const authHeader = req.headers.get("authorization") || "";
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const cookieToken =
      req.cookies.get("sb-access-token")?.value ??
      req.cookies.get("supabase-auth-token")?.value ??
      "";

    let authSource: "bearer" | "cookie" | "none" = "none";
    let userData: { user: { id: string; email: string | null } } | null = null;

    if (headerToken) {
      const { data, error } = await supabaseAdmin.auth.getUser(headerToken);
      if (!error && data?.user) {
        authSource = "bearer";
        userData = { user: { id: data.user.id, email: data.user.email ?? null } };
      } else {
        console.error("[api/settings] bearer auth failed", error?.message ?? error);
      }
    }

    if (!userData && cookieToken) {
      const { data, error } = await supabaseAdmin.auth.getUser(cookieToken);
      if (!error && data?.user) {
        authSource = "cookie";
        userData = { user: { id: data.user.id, email: data.user.email ?? null } };
      } else {
        console.error("[api/settings] cookie auth failed", error?.message ?? error);
      }
    }

    if (!userData?.user?.id) {
      const debug =
        process.env.NODE_ENV !== "production"
          ? { authSource, userIdPresent: false }
          : undefined;
      return NextResponse.json({
        ok: true,
        tier: "free",
        isPro: false,
        source: "anon",
        profile: null,
        devices: [],
        pastSeasons: [],
        debug,
      });
    }

    const userId = userData.user.id;
    const list = await getOrCreateCurrentList(userId);

    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,email,name,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id"
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("[api/settings] profile load failed", profileErr.message);
      return fallback("fallback");
    }

    const profile = profileData
      ? {
          ...profileData,
          email: profileData.email ?? userData.user.email ?? null,
        }
      : null;

    if (!profile) {
      const debug =
        process.env.NODE_ENV !== "production"
          ? {
              authSource,
              userIdPresent: true,
              profileFound: false,
              subscription_status: null,
              is_pro: null,
              computedIsPro: false,
            }
          : undefined;
      return NextResponse.json({
        ok: true,
        tier: "free",
        isPro: false,
        source: "no_profile",
        profile: null,
        devices: [],
        pastSeasons: [],
        debug,
      });
    }

    console.log("[api/settings][debug]", {
      userId,
      is_pro: profile.is_pro,
      subscription_status: profile.subscription_status,
      current_period_end: profile.current_period_end,
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id,
    });

    const { data: deviceData, error: deviceErr } = await supabaseAdmin
      .from("user_devices")
      .select("id,user_id,device_label,last_seen_at,created_at")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false });

    if (deviceErr) {
      console.error("[api/settings] device load failed", deviceErr.message);
      return fallback("fallback");
    }

    const { data: seasonData, error: seasonErr } = await supabaseAdmin
      .from("seasons")
      .select("id,name,list_id,is_active,created_at,is_wrapped_up,wrapped_up_at")
      .eq("list_id", list.id)
      .eq("is_wrapped_up", true)
      .order("wrapped_up_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (seasonErr) {
      console.error("[api/settings] past seasons load failed", seasonErr.message);
      return fallback("fallback");
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

    const isPro =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing" ||
      profile.subscription_status === "past_due" ||
      profile.is_pro === true;

    const debug =
      process.env.NODE_ENV !== "production"
        ? {
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
