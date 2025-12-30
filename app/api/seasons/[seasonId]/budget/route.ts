import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type Ctx = {
  params: Promise<{ seasonId?: string }>; // ✅ params can be async in newer Next
};

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

export async function POST(req: NextRequest, ctx: Ctx) {
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

    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    const listId = currentList.id;

    // Update the season budget
    const { data, error } = await supabaseAdmin
      .from("seasons")
      .update({ budget })
      .eq("id", seasonId)
      .eq("list_id", listId)
      .select("id, budget")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, season: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
