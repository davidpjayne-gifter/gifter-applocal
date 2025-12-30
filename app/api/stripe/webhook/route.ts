export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isProStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

async function resolveProfileId(params: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const { stripeCustomerId, stripeSubscriptionId } = params;

  if (stripeCustomerId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  if (stripeSubscriptionId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  return null;
}

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from("billing_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existing?.stripe_event_id) {
      return NextResponse.json({ received: true });
    }

    const eventType = event.type;
    const obj = event.data?.object as Stripe.Checkout.Session | Stripe.Subscription;

    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let subscription: Stripe.Subscription | null = null;

    if (eventType === "checkout.session.completed") {
      const session = obj as Stripe.Checkout.Session;
      stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
      stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      if (stripeSubscriptionId) {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      }
    }

    if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted"
    ) {
      subscription = obj as Stripe.Subscription;
      stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
      stripeSubscriptionId = subscription.id ?? null;
    }

    let userId: string | null = null;

    if (stripeCustomerId || stripeSubscriptionId) {
      userId = await resolveProfileId({
        stripeCustomerId,
        stripeSubscriptionId,
      });
    }

    if (userId && (stripeCustomerId || stripeSubscriptionId || subscription)) {
      if (eventType === "customer.subscription.deleted" && subscription) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: stripeCustomerId ?? undefined,
            stripe_subscription_id: stripeSubscriptionId ?? undefined,
            subscription_status: subscription.status ?? "canceled",
            is_pro: false,
            pro_expires_at: null,
          })
          .eq("id", userId);

        if (error) {
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }
      } else if (subscription) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: stripeCustomerId ?? undefined,
            stripe_subscription_id: stripeSubscriptionId ?? undefined,
            subscription_status: subscription.status ?? null,
            is_pro: isProStatus(subscription.status),
            pro_expires_at: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("id", userId);

        if (error) {
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }
      }
    }

    const { error: insertError } = await supabaseAdmin.from("billing_events").insert({
      user_id: userId,
      event_type: eventType,
      stripe_event_id: event.id,
      payload: event,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to record billing event" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Unable to process webhook" }, { status: 500 });
  }
}
