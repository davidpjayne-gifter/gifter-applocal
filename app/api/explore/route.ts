import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const bucket = url.searchParams.get("bucket"); // under_25 | 25_50 | 50_100 | 100_plus

    let q = supabaseAdmin
      .from("gift_stats")
      .select("id,title,category,price_bucket,count,updated_at,created_at")
      .order("count", { ascending: false })
      .limit(limit);

    if (bucket) q = q.eq("price_bucket", bucket);

    const { data, error } = await q;

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
