import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const scope = body?.scope === "recipient" ? "recipient" : "list";
    const season_id = typeof body?.season_id === "string" ? body.season_id.trim() : "";
    const list_id = typeof body?.list_id === "string" ? body.list_id.trim() : "";
    const recipient_key =
      (typeof body?.recipient_key === "string" ? body.recipient_key : "").trim().toLowerCase();

    if (!season_id) {
      return NextResponse.json({ error: "Missing season_id" }, { status: 400 });
    }
    if (!list_id) {
      return NextResponse.json({ error: "Missing list_id" }, { status: 400 });
    }

    if (scope === "recipient" && !recipient_key) {
      return NextResponse.json({ error: "Missing recipient_key" }, { status: 400 });
    }

    if (scope === "list" && recipient_key) {
      return NextResponse.json({ error: "recipient_key is not allowed for list scope" }, { status: 400 });
    }

    const share_token = crypto.randomBytes(16).toString("hex");
    const created_at = new Date().toISOString();

    // 1) Check if a share already exists for this scope
    let findQuery = supabaseAdmin
      .from("gift_shares")
      .select("id")
      .eq("list_id", list_id)
      .eq("season_id", season_id)
      .eq("scope", scope);

    if (scope === "recipient") {
      findQuery = findQuery.eq("recipient_key", recipient_key);
    } else {
      findQuery = findQuery.is("recipient_key", null);
    }

    const { data: existing, error: findError } = await findQuery.maybeSingle();

    if (findError) {
      console.error("gift_shares lookup error:", findError);
      return NextResponse.json(
        {
          error: findError.message,
          details: (findError as any).details,
          hint: (findError as any).hint,
          code: (findError as any).code,
        },
        { status: 500 }
      );
    }

    // 2) Update if exists, otherwise insert
    if (existing?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("gift_shares")
        .update({ share_token, created_at })
        .eq("id", existing.id);

      if (updateError) {
        console.error("gift_shares update error:", updateError);
        return NextResponse.json(
          {
            error: updateError.message,
            details: (updateError as any).details,
            hint: (updateError as any).hint,
            code: (updateError as any).code,
          },
          { status: 500 }
        );
      }

      const origin = req.headers.get("origin") || "";
      const url = origin ? `${origin}/share/${share_token}` : `/share/${share_token}`;
      return NextResponse.json({ url, token: share_token });
    }

    const { error: insertError } = await supabaseAdmin.from("gift_shares").insert({
      list_id,
      season_id,
      scope,
      recipient_key: scope === "recipient" ? recipient_key : null,
      share_token,
      created_at,
    });

    if (insertError) {
      console.error("gift_shares insert error:", insertError);
      return NextResponse.json(
        {
          error: insertError.message,
          details: (insertError as any).details,
          hint: (insertError as any).hint,
          code: (insertError as any).code,
        },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") || "";
    const url = origin ? `${origin}/share/${share_token}` : `/share/${share_token}`;
    return NextResponse.json({ url, token: share_token });
  } catch (err) {
    console.error("POST /api/share error:", err);
    return NextResponse.json({ error: "Unexpected error creating share link" }, { status: 500 });
  }
}
