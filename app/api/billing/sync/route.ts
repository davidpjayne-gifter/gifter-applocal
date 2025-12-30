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
  try {
    const stripe = getStripe();

    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing auth token." }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid auth token." }, { status: 401 });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id,email,stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ ok: false, error: "Failed to load profile." }, { status: 500 });
    }

    const email = userEmail ?? profile?.email ?? null;
    let stripeCustomerId = profile?.stripe_customer_id ?? null;
    let foundCustomer = Boolean(stripeCustomerId);

    if (!stripeCustomerId && email) {
      const customerList = await stripe.customers.list({ email, limit: 1 });
      const customer = customerList.data[0] ?? null;
      if (customer?.id) {
        stripeCustomerId = customer.id;
        foundCustomer = true;
        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", userId);
        if (updateErr) {
          console.error("Failed to persist stripe_customer_id:", updateErr);
        }
      }
    }

    if (!stripeCustomerId) {
      const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test";
      return NextResponse.json({
        ok: true,
        stripeMode,
        foundCustomer,
        subscriptionStatus: null,
        isPro: false,
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 5,
    });

    const best = pickBestSubscription(subscriptions.data);
    const subscriptionStatus = best?.status ?? null;
    const isPro = isPaidStatus(subscriptionStatus);
    const currentPeriodEnd =
      typeof best?.current_period_end === "number"
        ? new Date(best.current_period_end * 1000).toISOString()
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
      return NextResponse.json({ ok: false, error: "Failed to update profile." }, { status: 500 });
    }

    const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test";

    return NextResponse.json({
      ok: true,
      stripeMode,
      foundCustomer,
      subscriptionStatus,
      isPro,
    });
  } catch (err: any) {
    console.error("Sync access error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to sync access." },
      { status: 500 }
    );
  }
}
