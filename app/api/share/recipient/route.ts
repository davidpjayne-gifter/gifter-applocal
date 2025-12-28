import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function randomToken(len = 18) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const recipient = String(body?.recipient || "").trim();
    if (!recipient) {
      return NextResponse.json({ ok: false, error: "Missing recipient" }, { status: 400 });
    }

    const recipient_key = recipient.toLowerCase();

    // Get default list (first one)
    const { data: list, error: listErr } = await supabaseAdmin
      .from("gift_lists")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (listErr) return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    if (!list) return NextResponse.json({ ok: false, error: "No gift list found" }, { status: 404 });

    // If share already exists for this recipient, return it
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("gift_shares")
      .select("share_token")
      .eq("list_id", list.id)
      .eq("recipient_key", recipient_key)
      .maybeSingle();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    if (existing?.share_token) return NextResponse.json({ ok: true, token: existing.share_token });

    // Create new share token
    let token = randomToken();
    for (let tries = 0; tries < 5; tries++) {
      const { error: insErr } = await supabaseAdmin.from("gift_shares").insert([
        { list_id: list.id, recipient_key, share_token: token },
      ]);

      if (!insErr) return NextResponse.json({ ok: true, token });

      token = randomToken();
    }

    return NextResponse.json({ ok: false, error: "Could not create token" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("gift_shares")
    .select("recipient_key, share_token, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
