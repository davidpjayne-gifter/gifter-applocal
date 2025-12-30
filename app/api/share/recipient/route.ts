import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

function randomToken(len = 18) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid auth token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const recipient = String(body?.recipient || "").trim();
    if (!recipient) {
      return NextResponse.json({ ok: false, error: "Missing recipient" }, { status: 400 });
    }

    const recipient_key = recipient.toLowerCase();

    const currentList = await getOrCreateCurrentList(userData.user.id);
    const listId = currentList.id;

    // If share already exists for this recipient, return it
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("gift_shares")
      .select("share_token")
      .eq("list_id", listId)
      .eq("recipient_key", recipient_key)
      .maybeSingle();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    if (existing?.share_token) return NextResponse.json({ ok: true, token: existing.share_token });

    // Create new share token
    let shareToken = randomToken();
    for (let tries = 0; tries < 5; tries++) {
      const { error: insErr } = await supabaseAdmin.from("gift_shares").insert([
        { list_id: listId, recipient_key, share_token: shareToken },
      ]);

      if (!insErr) return NextResponse.json({ ok: true, token: shareToken });

      shareToken = randomToken();
    }

    return NextResponse.json({ ok: false, error: "Could not create token" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing auth token" }, { status: 401 });
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Invalid auth token" }, { status: 401 });
  }

  const currentList = await getOrCreateCurrentList(userData.user.id);
  const listId = currentList.id;

  const { data, error } = await supabaseAdmin
    .from("gift_shares")
    .select("recipient_key, share_token, created_at")
    .eq("list_id", listId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
