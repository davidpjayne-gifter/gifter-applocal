import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Local verify:
// curl -i http://localhost:3000/api/billing/checkout
// curl -i -X POST http://localhost:3000/api/billing/checkout

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("host");
  if (proto && host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) return token;
  return req.cookies.get("sb-access-token")?.value ?? null;
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to create a checkout session." },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_YEARLY;

    if (!stripeSecret || !priceId) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID_YEARLY.",
        },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
    }

    const userId = userData.user.id;
    const email = userData.user.email ?? null;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
    }

    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { supabase_user_id: userId },
      });

      stripeCustomerId = customer.id;

      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", userId);

      if (updErr) {
        console.error("Failed to persist stripe_customer_id:", updErr);
      }
    }

    const origin = getOrigin(req);
    if (!origin) {
      return NextResponse.json(
        { error: "Missing app URL configuration." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success`,
      cancel_url: `${origin}/gifts`,
      client_reference_id: userId,
      metadata: { userId, supabase_user_id: userId },
    });

    if (!session.url) {
      console.error("Checkout error: missing session url");
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message || "Checkout failed." },
      { status: 500 }
    );
  }
}
