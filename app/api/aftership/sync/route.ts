import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const AFTERSHIP_BASE = "https://api.aftership.com/tracking/2025-07";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function afterShipHeaders() {
  const key = process.env.AFTERSHIP_API_KEY;
  if (!key) {
    throw new Error("Missing AFTERSHIP_API_KEY");
  }

  return {
    "Content-Type": "application/json",
    "as-api-key": key,
  };
}

function normalizeEtaDate(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    // ISO date-time → YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    // Already date-only
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }

  return null;
}

/* -------------------------------------------------
   GET — sanity check (prevents 404 confusion)
-------------------------------------------------- */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "aftership sync reachable",
    hasApiKey: Boolean(process.env.AFTERSHIP_API_KEY),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}

/* -------------------------------------------------
   POST — real AfterShip sync
-------------------------------------------------- */
export async function POST() {
  try {
    const headers = afterShipHeaders();

    // 1️⃣ Find gifts that have tracking numbers but no AfterShip ID yet
    const { data: gifts, error } = await supabaseAdmin
      .from("gifts")
      .select("id, tracking_number")
      .not("tracking_number", "is", null)
      .is("aftership_id", null)
      .limit(25);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!gifts || gifts.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No new tracking numbers to sync",
      });
    }

    const results: any[] = [];

    for (const gift of gifts as Array<{ id: string; tracking_number: string }>) {
      const trackingNumber = gift.tracking_number.trim();

      /* 2️⃣ Detect carrier */
      const detectRes = await fetch(`${AFTERSHIP_BASE}/couriers/detect`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tracking_number: trackingNumber }),
      });

      if (!detectRes.ok) {
        results.push({
          id: gift.id,
          status: "error",
          step: "detect",
        });
        continue;
      }

      const detectJson = await detectRes.json();
      const slug = detectJson?.data?.couriers?.[0]?.slug ?? null;

      /* 3️⃣ Create tracking */
      const createRes = await fetch(`${AFTERSHIP_BASE}/trackings`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tracking_number: trackingNumber,
          ...(slug ? { slug } : {}),
        }),
      });

      if (!createRes.ok) {
        results.push({
          id: gift.id,
          status: "error",
          step: "create",
        });
        continue;
      }

      const createJson = await createRes.json();
      const aftershipId = createJson?.data?.id ?? null;

      if (!aftershipId) {
        results.push({
          id: gift.id,
          status: "error",
          step: "missing_id",
        });
        continue;
      }

      /* 4️⃣ Fetch tracking details */
      const getRes = await fetch(
        `${AFTERSHIP_BASE}/trackings/${encodeURIComponent(aftershipId)}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!getRes.ok) {
        results.push({
          id: gift.id,
          status: "error",
          step: "get",
        });
        continue;
      }

      const getJson = await getRes.json();

      const shipping_status = getJson?.data?.tag ?? null;
      const delivery_eta = normalizeEtaDate(
        getJson?.data?.expected_delivery
      );

      /* 5️⃣ Save back to Supabase */
      const { error: updateError } = await supabaseAdmin
        .from("gifts")
        .update({
          aftership_id: aftershipId,
          aftership_slug: slug,
          shipping_status,
          delivery_eta,
          last_tracking_update: new Date().toISOString(),
        })
        .eq("id", gift.id);

      if (updateError) {
        results.push({
          id: gift.id,
          status: "error",
          step: "db_update",
        });
        continue;
      }

      results.push({
        id: gift.id,
        status: "ok",
        shipping_status,
        delivery_eta,
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
