import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function priceBucket(price: number | null | undefined) {
  if (price === null || price === undefined || !Number.isFinite(price)) return null;
  if (price < 25) return "under_25";
  if (price < 50) return "25_50";
  if (price < 100) return "50_100";
  return "100_plus";
}

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

type Ctx = {
  params: Promise<{ giftId?: string }>;
};

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { giftId: rawGiftId } = await ctx.params;
    const giftId = String(rawGiftId || "").trim();

    if (!isUuid(giftId)) {
      return NextResponse.json({ error: "Invalid giftId", giftId }, { status: 400 });
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

    // 1) Mark gift as done (adjust column names if yours differ)
    const nowIso = new Date().toISOString();

    const { data: gift, error: giftErr } = await supabaseAdmin
      .from("gifts")
      .update({
        status: "done",     // <-- change if your column/values differ
        done_at: nowIso,    // <-- change if you use wrapped_at / completed_at etc
      })
      .eq("id", giftId)
      .eq("list_id", listId)
      .select("id, title, category, price") // <-- change if your columns differ
      .single();

    if (giftErr) {
      return NextResponse.json({ error: giftErr.message }, { status: 400 });
    }

    const title = String(gift?.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Gift missing title; cannot increment stats.", giftId },
        { status: 400 }
      );
    }

    const category = gift?.category ?? null;
    const bucket = priceBucket(
      typeof gift?.price === "number" ? gift.price : gift?.price ? Number(gift.price) : null
    );

    // 2) Increment gift_stats atomically via SQL function
    // NOTE: bucket can be null; if you want buckets required, enforce it in SQL.
    const { data: statRows, error: statErr } = await supabaseAdmin.rpc(
      "increment_gift_stat",
      {
        p_title: title,
        p_category: category,
        p_price_bucket: bucket,
      }
    );

    if (statErr) {
      return NextResponse.json({ error: statErr.message }, { status: 400 });
    }

    const stat = Array.isArray(statRows) ? statRows[0] : statRows;

    return NextResponse.json({
      ok: true,
      gift,
      stat,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
