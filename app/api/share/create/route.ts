import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function randomToken(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST() {
  try {
    // Grab the default list (first one)
    const { data: list, error } = await supabaseAdmin
      .from("gift_lists")
      .select("id, share_token")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!list) {
      return NextResponse.json({ ok: false, error: "No gift list found" }, { status: 404 });
    }

    // If it already has a token, return it
    if (list.share_token) {
      return NextResponse.json({ ok: true, token: list.share_token });
    }

    // Otherwise create a token and save it
    let token = randomToken();
    for (let tries = 0; tries < 5; tries++) {
      const { error: upErr } = await supabaseAdmin
        .from("gift_lists")
        .update({ share_token: token })
        .eq("id", list.id);

      if (!upErr) return NextResponse.json({ ok: true, token });

      // If unique collision, try again
      token = randomToken();
    }

    return NextResponse.json({ ok: false, error: "Could not generate token" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
