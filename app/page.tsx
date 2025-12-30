"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | "sent" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) window.location.href = "/gifts";
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") window.location.href = "/gifts";
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSendLink() {
    const nextEmail = email.trim();
    if (!nextEmail) return;

    setStatus(null);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/gifts`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>Welcome to GIFTer!</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>Manage gifts, shipping, and wrapping status.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            fontSize: 14,
          }}
        />

        <button
          type="button"
          onClick={handleSendLink}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Send me a login link
        </button>

        {status === "sent" && (
          <div style={{ fontSize: 13, fontWeight: 700 }}>Check your email for the sign-in link.</div>
        )}
        {status === "error" && (
          <div style={{ fontSize: 12, color: "#b91c1c" }}>{errorMessage}</div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link
          href="/gifts"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          My GIFTs →
        </Link>
      </div>
    </main>
  );
}
