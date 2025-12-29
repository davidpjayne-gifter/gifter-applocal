import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type Ctx = {
  params: Promise<{ seasonId?: string }>; // ✅ params can be async in newer Next
};

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { seasonId: rawSeasonId } = await ctx.params; // ✅ unwrap params
    const seasonId = String(rawSeasonId || "").trim();

    // ✅ prevent Postgres uuid error
    if (!isUuid(seasonId)) {
      return NextResponse.json(
        { error: "Invalid seasonId", seasonId },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const budgetRaw = body?.budget;

    // Allow null to clear; otherwise must be a finite number >= 0
    const budget =
      budgetRaw === null || budgetRaw === undefined || budgetRaw === ""
        ? null
        : Number(budgetRaw);

    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      return NextResponse.json(
        { error: "Invalid budget value", budget: budgetRaw },
        { status: 400 }
      );
    }

    // Update the season budget
    const { data, error } = await supabaseAdmin
      .from("seasons")
      .update({ budget })
      .eq("id", seasonId)
      .select("id, budget")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, season: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
