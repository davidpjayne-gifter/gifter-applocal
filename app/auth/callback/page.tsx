"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safeNext";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function completeSignIn() {
      const searchParams = new URLSearchParams(window.location.search);
      const nextPath = safeNext(searchParams.get("next") ?? undefined);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && isMounted) {
          await safeFetchJson("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });
          router.replace(nextPath);
          return;
        }
      }

      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && isMounted) {
          const { data } = await supabase.auth.getSession();
          const accessToken = data.session?.access_token;
          if (accessToken) {
            await safeFetchJson("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken }),
            });
          }
          router.replace(nextPath);
          return;
        }
      }

      if (isMounted) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      }
    }

    void completeSignIn();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontWeight: 700 }}>Signing you in...</div>
    </main>
  );
}
