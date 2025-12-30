import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

function isPaidStatus(status: string | null) {
  return status === "active" || status === "trialing";
}

function pickBestSubscription(subscriptions: Stripe.Subscription[]) {
  const statusScore = (status: Stripe.Subscription.Status) => {
    if (status === "active") return 3;
    if (status === "trialing") return 2;
    if (status === "past_due") return 1;
    return 0;
  };

  const sorted = [...subscriptions].sort((a, b) => {
    const scoreDiff = statusScore(b.status) - statusScore(a.status);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.created ?? 0) - (a.created ?? 0);
  });

  return sorted[0] ?? null;
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to sync access." },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live")
    ? "live"
    : process.env.STRIPE_SECRET_KEY
      ? "test"
      : "missing";

  const token = getAccessToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const user = userData.user;
  const userId = user.id;
  const userEmail = user.email ?? null;

  let supabaseError: { message?: string; code?: string; details?: string } | null = null;
  let didUpdateProfile = false;
  let customerIdUsed: string | null = null;

  const stripe = getStripe();

  const profileSelect =
    "id,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id";

  let { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    supabaseError = {
      message: profileErr.message,
      code: profileErr.code,
      details: profileErr.details,
    };
    return NextResponse.json({
      ok: false,
      stripeMode,
      user: { id: userId, email: userEmail },
      customerIdUsed,
      subscriptionsFound: [],
      selectedSubscription: null,
      didUpdateProfile,
      supabaseError,
    });
  }

  if (!profile) {
    const { error: insertErr } = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, is_pro: false });
    if (insertErr) {
      supabaseError = {
        message: insertErr.message,
        code: insertErr.code,
        details: insertErr.details,
      };
      return NextResponse.json({
        ok: false,
        stripeMode,
        user: { id: userId, email: userEmail },
        customerIdUsed,
        subscriptionsFound: [],
        selectedSubscription: null,
        didUpdateProfile,
        supabaseError,
      });
    }

    const { data: refreshed, error: refreshErr } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .eq("id", userId)
      .maybeSingle();

    if (refreshErr) {
      supabaseError = {
        message: refreshErr.message,
        code: refreshErr.code,
        details: refreshErr.details,
      };
      return NextResponse.json({
        ok: false,
        stripeMode,
        user: { id: userId, email: userEmail },
        customerIdUsed,
        subscriptionsFound: [],
        selectedSubscription: null,
        didUpdateProfile,
        supabaseError,
      });
    }

    profile = refreshed ?? null;
  }

  let stripeCustomerId = profile?.stripe_customer_id ?? null;
  if (!stripeCustomerId && userEmail) {
    const customerList = await stripe.customers.list({ email: userEmail, limit: 1 });
    const customer = customerList.data[0] ?? null;
    if (customer?.id) {
      stripeCustomerId = customer.id;
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", userId);
      if (updateErr) {
        supabaseError = {
          message: updateErr.message,
          code: updateErr.code,
          details: updateErr.details,
        };
      }
    }
  }

  customerIdUsed = stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    return NextResponse.json({
      ok: true,
      stripeMode,
      user: { id: userId, email: userEmail },
      customerIdUsed,
      subscriptionsFound: [],
      selectedSubscription: null,
      didUpdateProfile,
      supabaseError,
    });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 5,
  });

  const subscriptionsFound = subscriptions.data.map((sub) => ({
    id: sub.id,
    status: sub.status,
    created: sub.created,
  }));

  const best = pickBestSubscription(subscriptions.data);
  const subscriptionStatus = best?.status ?? null;
  const isPro = isPaidStatus(subscriptionStatus);
  const bestAny = best as unknown as { current_period_end?: number | null };
  const currentPeriodEnd =
    typeof bestAny?.current_period_end === "number"
      ? new Date(bestAny.current_period_end * 1000).toISOString()
      : null;

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: best?.id ?? null,
      subscription_status: subscriptionStatus,
      is_pro: isPro,
      current_period_end: currentPeriodEnd,
    })
    .eq("id", userId);

  if (updateError) {
    supabaseError = {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
    };
  } else {
    didUpdateProfile = true;
  }

  return NextResponse.json({
    ok: !supabaseError,
    stripeMode,
    user: { id: userId, email: userEmail },
    customerIdUsed,
    subscriptionsFound,
    selectedSubscription: best
      ? { id: best.id, status: best.status }
      : null,
    didUpdateProfile,
    supabaseError,
  });
}
