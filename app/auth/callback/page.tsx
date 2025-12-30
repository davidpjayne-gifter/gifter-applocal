"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function completeSignIn() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && isMounted) {
          router.replace("/gifts");
          return;
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && isMounted) {
          router.replace("/gifts");
          return;
        }
      }

      if (isMounted) {
        router.replace("/gifts");
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
