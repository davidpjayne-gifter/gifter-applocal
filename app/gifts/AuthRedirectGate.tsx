"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthRedirectGate() {
  const router = useRouter();
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timeoutId = window.setTimeout(() => {
      if (mounted) setShowContinue(true);
    }, 3200);

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/gifts");
      }
    }

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/gifts");
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function handleContinue() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      router.replace("/gifts");
      return;
    }
    router.push("/login?next=/gifts");
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      {showContinue && (
        <>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            If nothing happens, click Continue.
          </div>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
