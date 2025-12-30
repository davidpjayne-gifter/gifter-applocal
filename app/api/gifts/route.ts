import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";
import { FREE_LIMIT_MESSAGE } from "@/lib/entitlements";
import { createGift } from "@/lib/services/giftsService";

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
  season_id?: string;
  tracking?: string | null;
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
    const seasonId = String(body?.season_id ?? "").trim();
    const cost = body?.cost ?? null;
    const trackingRaw =
      typeof body?.tracking === "string" ? body.tracking.trim() : body?.tracking ?? null;
    const trackingNumber =
      trackingRaw === null || trackingRaw === undefined || trackingRaw === ""
        ? ""
        : String(trackingRaw);

    if (!title) {
      return NextResponse.json({ ok: false, message: "Title is required" }, { status: 400 });
    }
    if (!seasonId) {
      return NextResponse.json({ ok: false, message: "Missing season" }, { status: 400 });
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    const listId = currentList.id;

    const { data: season, error: seasonErr } = await supabaseAdmin
      .from("seasons")
      .select("id")
      .eq("id", seasonId)
      .eq("list_id", listId)
      .maybeSingle();

    if (seasonErr) {
      return NextResponse.json({ ok: false, message: seasonErr.message }, { status: 400 });
    }
    if (!season?.id) {
      return NextResponse.json({ ok: false, message: "Season not found" }, { status: 404 });
    }

    try {
      const gift = await createGift({
        userId: userData.user.id,
        listId,
        seasonId,
        title,
        recipientName,
        cost,
        trackingNumber,
      });

      return NextResponse.json({ ok: true, gift });
    } catch (err: any) {
      const message = err?.message || FREE_LIMIT_MESSAGE;
      if (err?.name === "LIMIT_REACHED" || message === FREE_LIMIT_MESSAGE) {
        return NextResponse.json(
          { ok: false, code: "LIMIT_REACHED", message },
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: false, message }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
