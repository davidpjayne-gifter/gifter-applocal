"use client";

import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";
import { safeFetchJson } from "@/app/lib/safeFetchJson";
import { useToast } from "@/app/components/ui/toast";

export default function AuthSessionSync() {
  const syncedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      if (syncedRef.current) return;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token || !mounted) return;

      syncedRef.current = true;

      const result = await safeFetchJson("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      if (!result.ok) {
        const message =
          (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          "Something went wrong.";
        toast.error(message);
        return;
      }
      if (result.text) {
        toast.error("Something went wrong.");
      }
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
