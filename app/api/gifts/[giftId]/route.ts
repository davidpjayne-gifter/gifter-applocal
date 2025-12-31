import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

type Ctx = {
  params: Promise<{ giftId?: string }>;
};

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { giftId: rawGiftId } = await ctx.params;
    const giftId = String(rawGiftId || "").trim();

    if (!isUuid(giftId)) {
      return NextResponse.json({ error: "Invalid giftId" }, { status: 400 });
    }

    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    const listId = currentList.id;

    const body = await req.json().catch(() => ({}));
    const { title, cost, tracking } = body ?? {};

    const updates: Record<string, any> = {};

    if (title !== undefined) {
      const trimmed = String(title ?? "").trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      updates.title = trimmed;
    }

    if (cost !== undefined) {
      const costValue =
        typeof cost === "number"
          ? (Number.isFinite(cost) ? cost : null)
          : typeof cost === "string"
            ? (() => {
                const cleaned = cost.replace(/[$,]/g, "").trim();
                if (cleaned === "") return null;
                const parsed = Number(cleaned);
                return Number.isFinite(parsed) ? parsed : null;
              })()
            : null;

      if (costValue === null || costValue < 0) {
        return NextResponse.json(
          { error: { code: "INVALID_COST", message: "Please enter a valid cost." } },
          { status: 400 }
        );
      }

      updates.cost = costValue;
    }

    if (tracking !== undefined) {
      if (tracking === null) {
        updates.tracking_number = null;
      } else {
        const trimmed = String(tracking).trim();
        updates.tracking_number = trimmed.length > 0 ? trimmed : null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: gift, error } = await supabaseAdmin
      .from("gifts")
      .update(updates)
      .eq("id", giftId)
      .eq("list_id", listId)
      .select("id,title,cost,tracking_number,shipping_status,wrapped")
      .maybeSingle();

    if (error) {
      const message = error.message.includes("not-null") || error.message.includes("check constraint")
        ? "Please enter a valid cost."
        : error.message;
      return NextResponse.json({ error: { message } }, { status: 400 });
    }

    if (!gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    return NextResponse.json({ gift });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
