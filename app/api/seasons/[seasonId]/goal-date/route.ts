import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

type Ctx = {
  params: Promise<{ seasonId?: string }>;
};

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { seasonId: rawSeasonId } = await ctx.params;
    const seasonId = String(rawSeasonId || "").trim();

    if (!isUuid(seasonId)) {
      return NextResponse.json({ error: "Invalid seasonId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const goalRaw = typeof body?.goalDate === "string" ? body.goalDate.trim() : "";
    const goalDate = goalRaw === "" ? null : goalRaw;

    if (goalDate && !isValidDateString(goalDate)) {
      return NextResponse.json({ error: "Invalid goal date" }, { status: 400 });
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

    const { data, error } = await supabaseAdmin
      .from("seasons")
      .update({
        goal_date: goalDate,
        goal_date_set_at: goalDate ? new Date().toISOString() : null,
      })
      .eq("id", seasonId)
      .eq("list_id", listId)
      .select("id, goal_date, goal_date_set_at")
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
