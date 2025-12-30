import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

function isProStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

async function getUserIdFromCookie() {
  const store = await cookies();
  const token = store.get("sb-access-token")?.value ?? null;
  if (!token) return null;

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) return null;
  return userData.user.id;
}

export default async function BillingSuccessPage(props: {
  searchParams?: Promise<{ session_id?: string }> | { session_id?: string };
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const sessionId =
    typeof searchParams?.session_id === "string" ? searchParams.session_id : null;

  const returnLink = (
    <Link
      href="/gifts"
      className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      Return to my GIFTs
    </Link>
  );

  if (!sessionId) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-12 text-center text-slate-900 dark:text-slate-100">
        <h1 className="text-2xl font-black">You’re all set</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Your checkout completed. Return to your GIFTs to get started.
        </p>
        {returnLink}
      </main>
    );
  }

  const userId = await getUserIdFromCookie();
  if (!userId) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-12 text-center text-slate-900 dark:text-slate-100">
        <h1 className="text-2xl font-black">Checkout complete</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Please sign in to access your upgraded plan.
        </p>
        <Link
          href="/login?next=/gifts"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Sign in to continue
        </Link>
      </main>
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const stripeSubscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    let subscriptionStatus: string | null = null;
    let currentPeriodEnd: string | null = null;

    const subscription = session.subscription as Stripe.Subscription | null;
    if (subscription) {
      subscriptionStatus = subscription.status ?? null;
      const cpe = (subscription as any).current_period_end;
      currentPeriodEnd = typeof cpe === "number" ? new Date(cpe * 1000).toISOString() : null;
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: subscriptionStatus ?? "active",
        is_pro: isProStatus(subscriptionStatus ?? "active"),
        current_period_end: currentPeriodEnd,
      })
      .eq("id", userId);

    redirect("/gifts?upgraded=1");
  } catch {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-12 text-center text-slate-900 dark:text-slate-100">
        <h1 className="text-2xl font-black">Checkout complete</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Your payment went through. You can return to your GIFTs now.
        </p>
        {returnLink}
      </main>
    );
  }
}
