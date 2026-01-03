import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs"; // REQUIRED
export const dynamic = "force-dynamic"; // REQUIRED

async function hasProcessedEvent(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("stripe_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.event_id);
}

async function markEventProcessed(eventId: string) {
  // Insert; if it already exists, ignore (idempotent)
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .insert({ event_id: eventId });

  // If a duplicate slipped in due to race, Postgres will throw unique violation.
  // Supabase returns an error object; treat unique violation as "already processed".
  if (error) {
    // Postgres unique violation is 23505; Supabase may expose it as `code`
    const code = (error as any).code;
    if (code === "23505") return;
    throw error;
  }
}

function isProStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing" || status === "past_due";
}

async function handleCheckoutCompleted(params: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}) {
  const { stripe, session } = params;

  const userId =
    (typeof session.client_reference_id === "string" && session.client_reference_id) ||
    (typeof session.metadata?.supabase_user_id === "string" && session.metadata.supabase_user_id) ||
    null;

  if (!userId) {
    console.error("❌ checkout.session.completed missing userId", {
      sessionId: session.id,
    });

    return {
      handled: true,
      userId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscription: null,
    };
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let subscription: Stripe.Subscription | null = null;
  let subscriptionStatus: string | null = null;
  let currentPeriodEnd: string | null = null;

  if (stripeSubscriptionId) {
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    subscriptionStatus = subscription.status;
    const cpe = (subscription as any).current_period_end;
    currentPeriodEnd = typeof cpe === "number" ? new Date(cpe * 1000).toISOString() : null;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_status: subscriptionStatus ?? "active",
      is_pro: isProStatus(subscriptionStatus ?? "active"),
      current_period_end: currentPeriodEnd,
    })
    .eq("id", userId);

  if (error) {
    console.error("❌ Supabase update failed", {
      userId,
      error,
    });
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.log("[stripe-webhook][debug]", {
        event: "checkout.session.completed",
        userId,
        status: subscriptionStatus ?? "active",
        stripeCustomerId,
        stripeSubscriptionId,
      });
    }
  }

  return {
    handled: true,
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    subscription,
  };
}

async function handleSubscriptionLifecycle(params: {
  eventType: string;
  subscription: Stripe.Subscription;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  userId: string | null;
}) {
  const { eventType, subscription, stripeCustomerId, stripeSubscriptionId, userId } = params;

  if (!userId) return null;

  if (eventType === "customer.subscription.deleted") {
    const currentPeriodEnd =
      typeof (subscription as any).current_period_end === "number"
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: stripeCustomerId ?? undefined,
        stripe_subscription_id: stripeSubscriptionId ?? undefined,
        subscription_status: subscription.status ?? "canceled",
        is_pro: false,
        current_period_end: currentPeriodEnd ?? null,
        pro_expires_at: null,
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return null;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId ?? undefined,
      stripe_subscription_id: stripeSubscriptionId ?? undefined,
      subscription_status: subscription.status ?? null,
      is_pro: isProStatus(subscription.status),
      current_period_end:
        typeof (subscription as any).current_period_end === "number"
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null,
      pro_expires_at:
        typeof (subscription as any).current_period_end === "number"
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[stripe-webhook][debug]", {
      event: eventType,
      userId,
      status: subscription.status ?? null,
      stripeCustomerId,
      stripeSubscriptionId,
    });
  }

  return null;
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

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const stripe = getStripe();

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text(); // RAW body (DO NOT use req.json)

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // ---- Idempotency guard ----
  try {
    const already = await hasProcessedEvent(event.id);
    if (already) {
      console.log("↩️ Duplicate Stripe event ignored:", event.id);
      return NextResponse.json({ received: true });
    }

  } catch (e) {
    console.error("❌ Idempotency check failed:", e);
    // Return 500 so Stripe retries; better than silently losing events
    return NextResponse.json({ error: "Idempotency failure" }, { status: 500 });
  }

  try {
    const eventType = event.type;

    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let subscription: Stripe.Subscription | null = null;
    let userId: string | null = null;
    let handledCheckoutSession = false;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await handleCheckoutCompleted({
          stripe,
          session,
        });

        handledCheckoutSession = result.handled;
        userId = result.userId;
        stripeCustomerId = result.stripeCustomerId;
        stripeSubscriptionId = result.stripeSubscriptionId;
        subscription = result.subscription;
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        subscription = sub;
        stripeCustomerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        stripeSubscriptionId = sub.id ?? null;
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: Stripe.Subscription | string | null;
        };
        stripeCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        stripeSubscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null;
        break;
      }

      default: {
        break;
      }
    }

    if (!userId && (stripeCustomerId || stripeSubscriptionId)) {
      userId = await resolveProfileId({
        stripeCustomerId,
        stripeSubscriptionId,
      });
    }

    if (!handledCheckoutSession && userId) {
      if (eventType === "invoice.payment_failed") {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: stripeCustomerId ?? undefined,
            stripe_subscription_id: stripeSubscriptionId ?? undefined,
            subscription_status: "past_due",
            is_pro: true,
          })
          .eq("id", userId);

        if (error) {
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[stripe-webhook][debug]", {
            event: "invoice.payment_failed",
            userId,
            status: "past_due",
            stripeCustomerId,
            stripeSubscriptionId,
          });
        }
      } else if (stripeCustomerId || stripeSubscriptionId || subscription) {
        const response = await handleSubscriptionLifecycle({
          eventType,
          subscription: subscription as Stripe.Subscription,
          stripeCustomerId,
          stripeSubscriptionId,
          userId,
        });

        if (response) return response;
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

    await markEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Unable to process webhook" }, { status: 500 });
  }
}
