import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  assertCanAddGift,
  assertCanAddRecipient,
  FREE_LIMIT_MESSAGE,
} from "@/lib/entitlements";

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

type GiftPayload = {
  title?: string;
  recipient_name?: string | null;
  cost?: number | null;
  list_id?: string;
  season_id?: string;
};

export async function POST(req: NextRequest) {
  try {
    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, message: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, message: "Invalid auth token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as GiftPayload;
    const title = String(body?.title ?? "").trim();
    const recipientName =
      typeof body?.recipient_name === "string" ? body.recipient_name.trim() : null;
    const listId = String(body?.list_id ?? "").trim();
    const seasonId = String(body?.season_id ?? "").trim();
    const cost = body?.cost ?? null;

    if (!title) {
      return NextResponse.json({ ok: false, message: "Title is required" }, { status: 400 });
    }
    if (!listId || !seasonId) {
      return NextResponse.json({ ok: false, message: "Missing list or season" }, { status: 400 });
    }

    try {
      await assertCanAddGift({ userId: userData.user.id, listId, seasonId });
      await assertCanAddRecipient({
        userId: userData.user.id,
        listId,
        seasonId,
        recipientName,
      });
    } catch (err: any) {
      const message = err?.message || FREE_LIMIT_MESSAGE;
      if (message === FREE_LIMIT_MESSAGE) {
        return NextResponse.json(
          { ok: false, code: "LIMIT_REACHED", message },
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: false, message }, { status: 500 });
    }

    const { data: gift, error } = await supabaseAdmin
      .from("gifts")
      .insert([
        {
          title,
          recipient_name: recipientName || null,
          cost,
          list_id: listId,
          season_id: seasonId,
          wrapped: false,
        },
      ])
      .select("id,title,recipient_name,cost,tracking_number,shipping_status,wrapped")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, gift });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
