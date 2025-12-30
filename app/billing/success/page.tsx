"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function BillingSuccessPage() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.location.reload();
    }, 2500);

    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
      <h1 className="text-2xl font-black text-slate-900">You&apos;re Pro 🎉</h1>
      <p className="mt-3 text-sm text-slate-600">
        Your subscription is active. If you don&apos;t see Pro yet, refresh in a moment.
      </p>

      <Link
        href="/gifts"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Return to My GIFTs
      </Link>
    </main>
  );
}
