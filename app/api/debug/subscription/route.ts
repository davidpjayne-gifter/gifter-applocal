import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAccessTokenFromCookies() {
  const store = await cookies();
  return store.get("sb-access-token")?.value ?? null;
}

export async function GET() {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const user = userData.user;
  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live")
    ? "live"
    : "test_or_missing";

  const tableName = "profiles";
  const selectColumns =
    "id,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id";

  const debug: {
    triedTables: string[];
    lastError?: { message?: string; code?: string; details?: string };
    stripeSecretKeyPresent: boolean;
    stripeSecretKeyPrefix: string | null;
    stripeWebhookSecretPresent: boolean;
    vercelEnv: string | null;
    nodeEnv: string | null;
  } = {
    triedTables: [tableName],
    stripeSecretKeyPresent: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeSecretKeyPrefix: process.env.STRIPE_SECRET_KEY
      ? process.env.STRIPE_SECRET_KEY.slice(0, 7)
      : null,
    stripeWebhookSecretPresent: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  };

  let entitlements: Record<string, unknown> | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data, error } = await userSupabase
      .from(tableName)
      .select(selectColumns)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      debug.lastError = {
        message: error.message,
        code: error.code,
        details: error.details,
      };
    } else if (data) {
      entitlements = data as Record<string, unknown>;
    }
  } else {
    debug.lastError = {
      message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    };
  }

  if (!entitlements) {
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from(tableName)
      .select(selectColumns)
      .eq("id", user.id)
      .maybeSingle();

    if (adminError) {
      debug.lastError = {
        message: adminError.message,
        code: adminError.code,
        details: adminError.details,
      };
    } else if (adminData) {
      entitlements = adminData as Record<string, unknown>;
    }
  }

  return NextResponse.json({
    ok: true,
    stripeMode,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    entitlements,
    debug,
  });
}
