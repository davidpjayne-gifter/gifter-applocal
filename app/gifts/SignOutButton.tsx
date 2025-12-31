"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeFetchJson } from "@/app/lib/safeFetchJson";
import { useToast } from "@/app/components/ui/toast";

export default function SignOutButton({ className }: { className?: string }) {
  const [hasSession, setHasSession] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    const result = await safeFetchJson("/api/auth/session", { method: "DELETE" });
    if (!result.ok) {
      const message =
        (result.json as any)?.error?.message ||
        (result.json as any)?.error ||
        "Something went wrong.";
      toast.error(message);
    } else if (result.text) {
      toast.error("Something went wrong.");
    }
    window.location.href = "/";
  }

  if (!hasSession) return null;

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
      style={
        className
          ? undefined
          : {
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 12,
              fontWeight: 800,
              color: "#334155",
              cursor: "pointer",
            }
      }
    >
      Sign out
    </button>
  );
}
