import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
  requestId?: string;
  title?: string;
  recipient_name?: string | null;
  recipient_key?: string | null;
  cost?: number | null;
  list_id?: string;
  season_id?: string;
  tracking?: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const token = getAccessToken(req);
    const headerRequestId = req.headers.get("x-request-id") || "";
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing auth token", requestId: headerRequestId || "unknown" },
        { status: 401 }
      );
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: "Invalid auth token", requestId: headerRequestId || "unknown" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as GiftPayload;
    const requestId = String(body?.requestId || headerRequestId || crypto.randomUUID());
    const title = String(body?.title ?? "").trim();
    const recipientName =
      typeof body?.recipient_name === "string" ? body.recipient_name.trim() : null;
    const listId = String(body?.list_id ?? "").trim();
    const seasonId = String(body?.season_id ?? "").trim();
    const cost = body?.cost ?? null;
    const trackingRaw =
      typeof body?.tracking === "string" ? body.tracking.trim() : body?.tracking ?? null;
    const trackingNumber =
      trackingRaw === null || trackingRaw === undefined || trackingRaw === ""
        ? ""
        : String(trackingRaw);

    console.log("[api/gifts] start", requestId);

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required", requestId },
        { status: 400 }
      );
    }
    if (!recipientName) {
      return NextResponse.json(
        { ok: false, error: "Recipient is required", requestId },
        { status: 400 }
      );
    }
    if (!listId || !isUuid(listId)) {
      return NextResponse.json(
        { ok: false, error: "Missing list_id", requestId },
        { status: 400 }
      );
    }
    if (!seasonId) {
      return NextResponse.json(
        { ok: false, error: "Missing season_id", requestId },
        { status: 400 }
      );
    }
    if (!isUuid(seasonId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid season_id", requestId },
        { status: 400 }
      );
    }
    if (typeof cost !== "number" || !Number.isFinite(cost) || cost <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid cost", requestId },
        { status: 400 }
      );
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    if (currentList.id !== listId) {
      return NextResponse.json(
        { ok: false, error: "Invalid list_id", requestId },
        { status: 403 }
      );
    }

    const { data: season, error: seasonErr } = await supabaseAdmin
      .from("seasons")
      .select("id")
      .eq("id", seasonId)
      .eq("list_id", listId)
      .maybeSingle();

    if (seasonErr) {
      return NextResponse.json(
        { ok: false, error: seasonErr.message, requestId },
        { status: 400 }
      );
    }
    if (!season?.id) {
      return NextResponse.json(
        { ok: false, error: "Season not found", requestId },
        { status: 404 }
      );
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

      console.log("[api/gifts] ok", requestId, gift?.id);
      return NextResponse.json({ ok: true, gift, requestId });
    } catch (err: any) {
      const message = err?.message || FREE_LIMIT_MESSAGE;
      if (err?.name === "LIMIT_REACHED" || message === FREE_LIMIT_MESSAGE) {
        return NextResponse.json(
          { ok: false, code: "LIMIT_REACHED", error: message, requestId },
          { status: 403 }
        );
      }
      console.error("[api/gifts] error", requestId, message);
      return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error", requestId: "unknown" },
      { status: 500 }
    );
  }
}
