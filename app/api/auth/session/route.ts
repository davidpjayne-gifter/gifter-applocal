import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "sb-access-token";

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json().catch(() => ({}));

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    return res;
  } catch (err: any) {
    console.error("Session cookie error:", err?.message ?? err);
    return NextResponse.json({ error: "Unable to set session cookie" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}
