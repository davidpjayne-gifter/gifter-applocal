"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { openStripeCheckout } from "@/lib/stripeClient";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const features = useMemo(
    () => [
      "Unlimited people per season",
      "Unlimited gifts per season",
      "Pro badge",
      "Priority early access to Explore Gifts",
    ],
    []
  );

  async function handleUpgrade() {
    if (loading) return;
    setLoading(true);
    setErrorMessage("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      router.push("/?redirect=/pricing");
      return;
    }

    try {
      await openStripeCheckout(token);
    } catch (err: any) {
      setErrorMessage(err?.message || "Unable to start checkout.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-black text-slate-900">Pricing</h1>
      <p className="mt-2 text-sm text-slate-600">
        Go Pro to unlock unlimited gifting.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Free</h2>
          <div className="mt-2 text-2xl font-black text-slate-900">$0</div>
          <p className="mt-3 text-sm text-slate-600">
            Free includes up to 2 people + 3 gifts per season.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Up to 2 people per season</li>
            <li>Up to 3 gifts per season</li>
            <li>Basic tracking + wrapping</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Pro</h2>
          <div className="mt-2 text-3xl font-black text-slate-900">$9</div>
          <div className="text-sm font-semibold text-slate-600">per year</div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Opening checkout..." : "Upgrade to Pro"}
          </button>

          {errorMessage && (
            <div className="mt-3 text-sm text-rose-600">{errorMessage}</div>
          )}
        </section>
      </div>
    </main>
  );
}
