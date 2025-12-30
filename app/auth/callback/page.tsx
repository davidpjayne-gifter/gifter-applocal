"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams?.get("code");
    const redirect = searchParams?.get("redirect");
    const nextPath = redirect && redirect.startsWith("/") ? redirect : "/gifts";

    if (!code) {
      setErrorMessage("Missing sign-in code.");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setErrorMessage(error.message || "Unable to complete sign-in.");
          return;
        }
        router.replace(nextPath);
      })
      .catch(() => {
        setErrorMessage("Unable to complete sign-in.");
      });
  }, [searchParams, router]);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 text-center">
      <h1 className="text-xl font-black text-slate-900">Signing you in…</h1>
      <p className="mt-2 text-sm text-slate-600">
        This should only take a moment.
      </p>
      {errorMessage && (
        <div className="mt-4 text-sm text-rose-600">{errorMessage}</div>
      )}
    </main>
  );
}
