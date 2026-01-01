import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SummaryResponse =
  | {
      ok: true;
      hasData: boolean;
      summary: null;
    }
  | {
      ok: true;
      hasData: true;
      summary: {
        peopleCount: number;
        giftsCount: number;
        spentTotal: number;
        budget: number | null;
        remaining: number | null;
      };
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
      return NextResponse.json<SummaryResponse>({ ok: true, hasData: false, summary: null });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json<SummaryResponse>({ ok: true, hasData: false, summary: null });
    }

    const list = await getOrCreateCurrentList(userData.user.id);

    const { data: seasons } = await supabaseAdmin
      .from("seasons")
      .select("id,is_active,budget,created_at")
      .eq("list_id", list.id)
      .order("created_at", { ascending: false });

    const activeSeason =
      (seasons ?? []).find((season) => season.is_active) ?? (seasons ?? [])[0] ?? null;

    if (!activeSeason) {
      return NextResponse.json<SummaryResponse>({ ok: true, hasData: false, summary: null });
    }

    const { data: gifts } = await supabaseAdmin
      .from("gifts")
      .select("recipient_name,cost")
      .eq("list_id", list.id)
      .eq("season_id", activeSeason.id);

    const giftsCount = (gifts ?? []).length;
    if (giftsCount === 0) {
      return NextResponse.json<SummaryResponse>({ ok: true, hasData: false, summary: null });
    }

    const recipientSet = new Set(
      (gifts ?? [])
        .map((gift) => (gift.recipient_name ?? "").trim())
        .filter(Boolean)
        .map((name) => name.toLowerCase())
    );

    const spentTotal = (gifts ?? []).reduce(
      (sum, gift) => sum + (typeof gift.cost === "number" ? gift.cost : 0),
      0
    );
    const budget = typeof activeSeason.budget === "number" ? activeSeason.budget : null;
    const remaining = budget !== null ? budget - spentTotal : null;

    return NextResponse.json<SummaryResponse>({
      ok: true,
      hasData: true,
      summary: {
        peopleCount: recipientSet.size,
        giftsCount,
        spentTotal,
        budget,
        remaining,
      },
    });
  } catch (err: any) {
    console.error("Summary load failed:", err?.message ?? err);
    return NextResponse.json<SummaryResponse>({ ok: false, error: "Failed to load summary." });
  }
}
