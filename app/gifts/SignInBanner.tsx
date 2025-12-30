"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SignInCtaButton from "@/app/components/SignInCtaButton";

export default function SignInBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setShow(!data.session);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setShow(!session);
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/25 via-blue-600/20 to-blue-600/10 px-4 py-3 text-sm text-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <span>Please sign in to edit gifts or make changes.</span>
      <SignInCtaButton className="inline-flex items-center justify-center rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-blue-400 dark:border-blue-700">
        Go to sign in
      </SignInCtaButton>
    </div>
  );
}
