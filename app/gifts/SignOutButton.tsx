"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  const [hasSession, setHasSession] = useState(false);

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
    window.location.href = "/";
  }

  if (!hasSession) return null;

  return (
    <button
      type="button"
      onClick={handleSignOut}
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        background: "#fff",
        fontSize: 12,
        fontWeight: 800,
        color: "#334155",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
