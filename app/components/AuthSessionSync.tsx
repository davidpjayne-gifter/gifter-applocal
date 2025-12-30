"use client";

import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";

export default function AuthSessionSync() {
  const syncedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      if (syncedRef.current) return;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token || !mounted) return;

      syncedRef.current = true;

      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
    }

    syncSession();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) return;

      syncedRef.current = false;
      syncSession();
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
