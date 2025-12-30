export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getOrigin(req: Request) {
  const direct = req.headers.get("origin");
  if (direct) return direct;

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return host ? `${proto}://${host}` : "";
}

export async function POST(req: Request) {
  try {
    const origin = getOrigin(req);
    if (!origin) {
      return NextResponse.json({ error: "Missing request origin" }, { status: 500 });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const yearlyPriceId = process.env.STRIPE_PRICE_ID_YEARLY;
    if (!stripeSecret || !yearlyPriceId) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = authData.user;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("profiles lookup error:", profileError);
      return NextResponse.json({ error: "Unable to load profile" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret);

    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });

      stripeCustomerId = customer.id;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("profiles update error:", updateError);
        return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: yearlyPriceId, quantity: 1 }],
      allow_promotion_codes: false,
      success_url: `${origin}/gifts?upgraded=1`,
      cancel_url: `${origin}/upgrade?canceled=1`,
      metadata: { user_id: user.id },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Missing checkout URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/stripe/checkout error:", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
