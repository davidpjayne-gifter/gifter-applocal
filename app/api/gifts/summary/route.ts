import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeasonSummary = {
  id: string;
  name: string;
  created_at: string | null;
  is_wrapped_up: boolean | null;
  budget: number | null;
  peopleCount: number;
  giftsCount: number;
  wrappedCount: number;
  spentTotal: number;
};

type SummaryResponse =
  | {
      ok: true;
      hasSeasons: boolean;
      hasAnyGifts: boolean;
      seasons: SeasonSummary[];
    }
  | {
      ok: false;
      error: string;
    };

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value ?? null;
    if (!token) {
      return NextResponse.json<SummaryResponse>({
        ok: true,
        hasSeasons: false,
        hasAnyGifts: false,
        seasons: [],
      });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json<SummaryResponse>({
        ok: true,
        hasSeasons: false,
        hasAnyGifts: false,
        seasons: [],
      });
    }

    const list = await getOrCreateCurrentList(userData.user.id);

    const { data: seasons } = await supabaseAdmin
      .from("seasons")
      .select("id,name,is_active,budget,created_at,is_wrapped_up")
      .eq("list_id", list.id)
      .or("is_wrapped_up.is.null,is_wrapped_up.eq.false")
      .order("is_wrapped_up", { ascending: true })
      .order("created_at", { ascending: false });

    if (!seasons || seasons.length === 0) {
      return NextResponse.json<SummaryResponse>({
        ok: true,
        hasSeasons: false,
        hasAnyGifts: false,
        seasons: [],
      });
    }

    const seasonIds = seasons.map((season) => season.id);

    const { data: gifts } = await supabaseAdmin
      .from("gifts")
      .select("season_id,recipient_name,cost,wrapped")
      .eq("list_id", list.id)
      .in("season_id", seasonIds);

    const summaryMap = new Map<string, SeasonSummary>();

    for (const season of seasons) {
      summaryMap.set(season.id, {
        id: season.id,
        name: season.name ?? "Season",
        created_at: season.created_at ?? null,
        is_wrapped_up: season.is_wrapped_up ?? null,
        budget: typeof season.budget === "number" ? season.budget : null,
        peopleCount: 0,
        giftsCount: 0,
        wrappedCount: 0,
        spentTotal: 0,
      });
    }

    for (const gift of gifts ?? []) {
      const seasonId = String(gift.season_id ?? "").trim();
      const entry = summaryMap.get(seasonId);
      if (!entry) continue;

      entry.giftsCount += 1;
      if (gift.wrapped === true) entry.wrappedCount += 1;
      if (typeof gift.cost === "number") entry.spentTotal += gift.cost;
    }

    for (const gift of gifts ?? []) {
      const seasonId = String(gift.season_id ?? "").trim();
      const entry = summaryMap.get(seasonId);
      if (!entry) continue;
      const nameKey = (gift.recipient_name ?? "").trim().toLowerCase();
      if (!nameKey) continue;
      entry.peopleCount += 0; // placeholder to ensure entry exists
    }

    const peopleMap = new Map<string, Set<string>>();
    for (const gift of gifts ?? []) {
      const seasonId = String(gift.season_id ?? "").trim();
      if (!peopleMap.has(seasonId)) peopleMap.set(seasonId, new Set());
      const nameKey = (gift.recipient_name ?? "").trim().toLowerCase();
      if (nameKey) peopleMap.get(seasonId)!.add(nameKey);
    }

    for (const [seasonId, names] of peopleMap.entries()) {
      const entry = summaryMap.get(seasonId);
      if (entry) entry.peopleCount = names.size;
    }

    const summaries = seasons
      .map((season) => summaryMap.get(season.id))
      .filter((entry): entry is SeasonSummary => Boolean(entry));

    const hasAnyGifts = summaries.some((summary) => summary.giftsCount > 0);

    return NextResponse.json<SummaryResponse>({
      ok: true,
      hasSeasons: true,
      hasAnyGifts,
      seasons: summaries,
    });
  } catch (err: any) {
    console.error("Summary load failed:", err?.message ?? err);
    return NextResponse.json<SummaryResponse>({ ok: false, error: "Failed to load summary." });
  }
}
