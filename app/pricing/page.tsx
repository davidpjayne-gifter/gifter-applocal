"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeFetchJson } from "@/app/lib/safeFetchJson";
import { useToast } from "@/app/components/ui/toast";

export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
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
      router.push("/login?next=/pricing");
      return;
    }

    try {
      const result = await safeFetchJson("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!result.ok) {
        const message =
          (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          "Something went wrong.";
        toast.error(message);
        setErrorMessage(message);
        setLoading(false);
        return;
      }

      if (result.text) {
        toast.error("Something went wrong.");
        setErrorMessage("Something went wrong.");
        setLoading(false);
        return;
      }

      if ((result.json as any)?.url) {
        window.location.href = String((result.json as any).url);
        return;
      }

      toast.error("Stripe did not return a checkout URL.");
      setErrorMessage("Stripe did not return a checkout URL.");
      setLoading(false);
    } catch (err: any) {
      const message = err?.message || "Unable to start checkout.";
      toast.error(message);
      setErrorMessage(message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Pricing</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Go Pro to unlock unlimited gifting.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800">
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

        <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-900">
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
