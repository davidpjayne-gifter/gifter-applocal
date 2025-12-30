import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // ---- 1) AUTH TOKEN (your route already does this conceptually) ----
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    // ---- 2) GET USER FROM SUPABASE USING TOKEN ----
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;
    const email = userData.user.email ?? null;

    // ---- 3) LOOK UP YOUR PROFILE ROW (stores stripe_customer_id) ----
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    // ---- 4) GET/CREATE STRIPE CUSTOMER ----
    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      });

      stripeCustomerId = customer.id;

      // Persist customer id for next time
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", userId);

      if (updErr) {
        // non-fatal: checkout can still proceed, but log it
        console.error("Failed to persist stripe_customer_id:", updErr);
      }
    }

    // ---- 5) CREATE CHECKOUT SESSION (yearly price + origin urls) ----
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,

      line_items: [{ price: process.env.STRIPE_PRICE_ID_YEARLY!, quantity: 1 }],

      success_url: `${origin}/upgrade/success`,
      cancel_url: `${origin}/upgrade`,

      // 🔑 THIS is the missing link to Supabase user:
      client_reference_id: userId,
      metadata: { userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err?.message ?? err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
