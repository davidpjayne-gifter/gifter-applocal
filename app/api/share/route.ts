import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const recipient_key =
      (typeof body?.recipientKey === "string" ? body.recipientKey : "").trim().toLowerCase();

    const list_id = (typeof body?.listId === "string" ? body.listId : "").trim();

    if (!recipient_key) {
      return NextResponse.json({ error: "Missing recipientKey" }, { status: 400 });
    }

    if (!list_id) {
      return NextResponse.json({ error: "Missing listId" }, { status: 400 });
    }

    const share_token = crypto.randomBytes(16).toString("hex");
    const created_at = new Date().toISOString();

    // 1) Check if a share already exists for this (list_id, recipient_key)
    const { data: existing, error: findError } = await supabaseAdmin
      .from("gift_shares")
      .select("id")
      .eq("list_id", list_id)
      .eq("recipient_key", recipient_key)
      .maybeSingle();

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

      return NextResponse.json({ token: share_token });
    }

    const { error: insertError } = await supabaseAdmin.from("gift_shares").insert({
      list_id,
      recipient_key,
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

    return NextResponse.json({ token: share_token });
  } catch (err) {
    console.error("POST /api/share error:", err);
    return NextResponse.json({ error: "Unexpected error creating share link" }, { status: 500 });
  }
}
