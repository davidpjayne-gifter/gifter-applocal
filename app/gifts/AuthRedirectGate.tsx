"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthRedirectGate() {
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fallbackId = window.setTimeout(() => {
      if (mounted) setShowFallback(true);
    }, 4200);

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/gifts");
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session || event === "SIGNED_IN") {
        router.replace("/gifts");
      }
    });

    const redirectId = window.setTimeout(() => {
      checkSession();
      router.replace("/gifts");
    }, 700);

    return () => {
      mounted = false;
      window.clearTimeout(fallbackId);
      window.clearTimeout(redirectId);
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function handleFallback() {
    router.replace("/gifts");
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      {showFallback && (
        <>
          <div className="text-xs text-slate-500 dark:text-slate-400">Just a moment.</div>
          <button
            type="button"
            onClick={handleFallback}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Go to My GIFTs
          </button>
        </>
      )}
    </div>
  );
}
