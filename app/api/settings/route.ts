import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,email,name,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id"
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    const profile = profileData
      ? {
          ...profileData,
          email: profileData.email ?? userData.user.email ?? null,
        }
      : {
          id: userId,
          email: userData.user.email ?? null,
          name: null,
          is_pro: false,
          subscription_status: null,
          current_period_end: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        };

    const { data: deviceData, error: deviceErr } = await supabaseAdmin
      .from("user_devices")
      .select("id,user_id,device_label,last_seen_at,created_at")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false });

    if (deviceErr) {
      return NextResponse.json({ error: "Failed to load devices" }, { status: 500 });
    }

    return NextResponse.json({ profile, devices: deviceData ?? [] });
  } catch (err: any) {
    console.error("Settings load error:", err?.message ?? err);
    return NextResponse.json({ error: "Unable to load settings" }, { status: 500 });
  }
}
