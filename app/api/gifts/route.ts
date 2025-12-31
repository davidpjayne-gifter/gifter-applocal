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

type GiftPayload = Record<string, unknown>;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const logEnd = (ok: boolean) => {
    console.log("[api/gifts] end", { requestId, ok, ms: Date.now() - startedAt });
  };

  try {
    const token = getAccessToken(req);
    if (!token) {
      logEnd(false);
      return NextResponse.json({ ok: false, error: "Missing auth token", requestId }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      logEnd(false);
      return NextResponse.json({ ok: false, error: "Invalid auth token", requestId }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as GiftPayload;
    console.error("[addGift:incoming]", {
      requestId,
      recipient: (body as any)?.recipient,
      title: (body as any)?.title,
      cost: (body as any)?.cost,
      costType: typeof (body as any)?.cost,
      tracking: (body as any)?.tracking,
      trackingType: typeof (body as any)?.tracking,
    });
    const title = String((body as any)?.title ?? "").trim();
    const recipientRaw =
      typeof (body as any)?.recipient === "string"
        ? (body as any).recipient
        : typeof (body as any)?.recipient_name === "string"
          ? (body as any).recipient_name
          : "";
    const recipientName = recipientRaw.trim() || null;
    const listId = String((body as any)?.list_id ?? "").trim();
    const seasonId = String((body as any)?.season_id ?? "").trim();
    const costRaw = (body as any)?.cost;
    const cost: number | null =
      typeof costRaw === "number"
        ? (Number.isFinite(costRaw) ? costRaw : null)
        : typeof costRaw === "string"
          ? (() => {
            const cleaned = costRaw.replace(/[$,]/g, "").trim();
            if (cleaned === "") return null;
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : null;
          })()
          : null;
    const trackingNumber: string | null =
      typeof (body as any)?.tracking === "string"
        ? (body as any).tracking.trim() === ""
          ? null
          : (body as any).tracking.trim()
        : null;

    console.log("[api/gifts] start", { requestId, ts: new Date().toISOString() });

    if (!title) {
      console.warn("[api/gifts] bad_request", { requestId, missing: ["title"] });
      logEnd(false);
      return NextResponse.json({ ok: false, error: "Title is required", requestId }, { status: 400 });
    }
    if (!recipientName) {
      console.warn("[api/gifts] bad_request", { requestId, missing: ["recipient"] });
      logEnd(false);
      return NextResponse.json(
        { ok: false, error: "Recipient is required", requestId },
        { status: 400 }
      );
    }
    if (!listId || !isUuid(listId)) {
      console.warn("[api/gifts] bad_request", { requestId, missing: ["list_id"] });
      logEnd(false);
      return NextResponse.json({ ok: false, error: "Missing list_id", requestId }, { status: 400 });
    }
    if (!seasonId) {
      console.warn("[api/gifts] bad_request", { requestId, missing: ["season_id"] });
      logEnd(false);
      return NextResponse.json(
        { ok: false, error: "Missing season_id", requestId },
        { status: 400 }
      );
    }
    if (!isUuid(seasonId)) {
      console.warn("[api/gifts] bad_request", { requestId, missing: ["season_id"] });
      logEnd(false);
      return NextResponse.json(
        { ok: false, error: "Invalid season_id", requestId },
        { status: 400 }
      );
    }
    if (cost === null || cost < 0) {
      console.warn("[api/gifts] bad_request", { requestId, missing: ["cost"] });
      logEnd(false);
      return NextResponse.json(
        { ok: false, requestId, error: { code: "INVALID_COST", message: "Please enter a valid cost." } },
        { status: 400 }
      );
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    if (currentList.id !== listId) {
      logEnd(false);
      return NextResponse.json({ ok: false, error: "Invalid list_id", requestId }, { status: 403 });
    }

    const { data: season, error: seasonErr } = await supabaseAdmin
      .from("seasons")
      .select("id")
      .eq("id", seasonId)
      .eq("list_id", listId)
      .maybeSingle();

    if (seasonErr) {
      logEnd(false);
      return NextResponse.json({ ok: false, error: seasonErr.message, requestId }, { status: 400 });
    }
    if (!season?.id) {
      logEnd(false);
      return NextResponse.json({ ok: false, error: "Season not found", requestId }, { status: 404 });
    }

    try {
      console.log("[api/gifts] insert_payload", {
        requestId,
        listId,
        seasonId,
        recipient: recipientName,
        title,
        cost,
        hasTracking: Boolean(trackingNumber),
      });

      const gift = await withTimeout(
        createGift({
          requestId,
          userId: userData.user.id,
          listId,
          seasonId,
          title,
          recipientName,
          cost,
          trackingNumber,
        }),
        12000
      );

      console.log("[api/gifts] ok", { requestId, id: gift?.id });
      logEnd(true);
      return NextResponse.json({ ok: true, gift, requestId });
    } catch (err: any) {
      if (err?.message === "timeout") {
        console.error("[api/gifts] timeout", { requestId });
        logEnd(false);
        return NextResponse.json(
          { ok: false, error: "Insert timed out", requestId },
          { status: 504 }
        );
      }
      if (typeof err?.message === "string" && /cost|not null|check/i.test(err.message)) {
        logEnd(false);
        return NextResponse.json(
          { ok: false, requestId, error: { code: "INVALID_COST", message: "Please enter a valid cost." } },
          { status: 400 }
        );
      }
      const message = err?.message || FREE_LIMIT_MESSAGE;
      if (err?.name === "LIMIT_REACHED" || message === FREE_LIMIT_MESSAGE) {
        logEnd(false);
        return NextResponse.json(
          { ok: false, code: "LIMIT_REACHED", error: message, requestId },
          { status: 403 }
        );
      }
      console.error("[api/gifts] error", { requestId, message });
      logEnd(false);
      return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[addGift:handler_error]", { requestId, message: err?.message, err });
    logEnd(false);
    return NextResponse.json(
      { ok: false, requestId, error: { message: err?.message ?? "Couldn’t save that gift. Try again." } },
      { status: 500 }
    );
  }
}
