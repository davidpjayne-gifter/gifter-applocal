export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

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
    const name = String(body?.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Missing season name" }, { status: 400 });
    }

    const currentList = await getOrCreateCurrentList(userData.user.id);
    const listId = currentList.id;

    const { error: archiveErr } = await supabaseAdmin
      .from("seasons")
      .update({ is_active: false })
      .eq("list_id", listId)
      .eq("is_active", true);

    if (archiveErr) {
      return NextResponse.json({ error: archiveErr.message }, { status: 400 });
    }

    const { data: season, error } = await supabaseAdmin
      .from("seasons")
      .insert({
        list_id: listId,
        name,
        is_active: true,
      })
      .select("id,name,list_id,is_active,budget")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, season });
  } catch (err: any) {
    console.error("POST /api/seasons/new error:", err);
    return NextResponse.json({ error: "Unexpected error starting season" }, { status: 500 });
  }
}
