import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

function randomToken(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookieToken = req.cookies.get("sb-access-token")?.value ?? null;
    const accessToken = bearerToken || cookieToken;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid auth token" }, { status: 401 });
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    const listId = currentList.id;

    const { data: list, error } = await supabaseAdmin
      .from("gift_lists")
      .select("id, share_token")
      .eq("id", listId)
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
