import { NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const recipient_key_raw = typeof body?.recipient === "string" ? body.recipient : "";
    const recipient_key = recipient_key_raw.trim().toLowerCase();

    if (!recipient_key) {
      return NextResponse.json({ error: "Missing recipient key" }, { status: 400 });
    }

    const share_token = crypto.randomBytes(16).toString("hex");
    const created_at = new Date().toISOString();

    const { error } = await supabaseAdmin.from("gift_shares").insert({
      recipient_key,
      share_token,
      created_at,
      // list_id is optional — leave it out unless your share page needs it
    });

    if (error) {
      console.error("gift_shares insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ token: share_token });
  } catch (err) {
    console.error("POST /api/share error:", err);
    return NextResponse.json({ error: "Unexpected error creating share link" }, { status: 500 });
  }
}
