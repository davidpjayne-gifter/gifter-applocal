import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { error: devicesError } = await supabaseAdmin
      .from("user_devices")
      .delete()
      .eq("user_id", userId);

    if (devicesError) {
      return NextResponse.json({ error: "Failed to delete devices" }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Account delete error:", err?.message ?? err);
    return NextResponse.json({ error: "Unable to delete account" }, { status: 500 });
  }
}
