"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<null | "sent" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState<null | "magic" | "signin" | "signup" | "reset">(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [showBookmarkHelp, setShowBookmarkHelp] = useState(false);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    const nextRedirect = params.get("redirect");
    const redirectTarget = nextRedirect && nextRedirect.startsWith("/") ? nextRedirect : null;
    setRedirectTo(redirectTarget);

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        router.push(redirectTarget ?? "/gifts");
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push(redirectTarget ?? "/gifts");
      }
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, [router, redirectTo]);

  function clearMessages() {
    setStatus(null);
    setErrorMessage("");
    setSuccessMessage("");
    setNeedsEmailConfirm(false);
  }

  async function handleSendLink() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setStatus("error");
      setErrorMessage("Email is required.");
      return;
    }

    clearMessages();
    setLoading("magic");

    const { error } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/gifts`,
      },
    });

    setLoading(null);

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  async function handlePasswordSignIn() {
    const nextEmail = email.trim();
    const nextPassword = password.trim();

    if (!nextEmail || !nextPassword) {
      setErrorMessage("Email and password are required.");
      return;
    }

    clearMessages();
    setLoading("signin");

    const { error } = await supabase.auth.signInWithPassword({
      email: nextEmail,
      password: nextPassword,
    });

    setLoading(null);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setNeedsEmailConfirm(true);
        setErrorMessage("Email confirmation required before you can sign in.");
        return;
      }
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Signed in!");
    router.push("/gifts");
  }

  async function handlePasswordSignUp() {
    const nextEmail = email.trim();
    const nextPassword = password.trim();

    if (!nextEmail || !nextPassword) {
      setErrorMessage("Email and password are required.");
      return;
    }

    clearMessages();
    setLoading("signup");

    const { data, error } = await supabase.auth.signUp({
      email: nextEmail,
      password: nextPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/gifts`,
      },
    });

    setLoading(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data?.session) {
      setSuccessMessage("Account created.");
      router.push("/gifts");
      return;
    }

    setNeedsEmailConfirm(true);
    setSuccessMessage("Account created. Check your email to confirm.");

    try {
      await supabase.auth.resend({
        type: "signup",
        email: nextEmail,
      });
    } catch {
      // No-op: still show confirmation guidance.
    }
  }

  async function handleForgotPassword() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setErrorMessage("Enter your email first.");
      return;
    }

    clearMessages();
    setLoading("reset");

    const { error } = await supabase.auth.resetPasswordForEmail(nextEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setLoading(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Password reset email sent.");
  }

  async function handleResendConfirmation() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setErrorMessage("Enter your email first.");
      return;
    }

    setResendLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: nextEmail,
    });

    setResendLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Confirmation email resent.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>Welcome to GIFTer</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        A simple web app for keeping track of gifts, budgets, and who’s wrapped up.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              clearMessages();
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid #0f172a",
              background: mode === "magic" ? "#0f172a" : "#fff",
              color: mode === "magic" ? "#fff" : "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              clearMessages();
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid #0f172a",
              background: mode === "password" ? "#0f172a" : "#fff",
              color: mode === "password" ? "#fff" : "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Password
          </button>
        </div>

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

        {mode === "password" && (
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            style={{
              width: "100%",
              maxWidth: 320,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              fontSize: 14,
            }}
          />
        )}

        {mode === "magic" ? (
          <button
            type="button"
            onClick={handleSendLink}
            disabled={loading === "magic"}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #0f172a",
              background: loading === "magic" ? "#475569" : "#0f172a",
              color: "#fff",
              fontWeight: 900,
              cursor: loading === "magic" ? "not-allowed" : "pointer",
            }}
          >
            {loading === "magic" ? "Sending..." : "Send me a login link"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePasswordSignIn}
              disabled={loading === "signin" || loading === "signup"}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: loading === "signin" ? "#475569" : "#0f172a",
                color: "#fff",
                fontWeight: 900,
                cursor: loading === "signin" ? "not-allowed" : "pointer",
                width: "100%",
                maxWidth: 320,
              }}
            >
              {loading === "signin" ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={handlePasswordSignUp}
              disabled={loading === "signin" || loading === "signup"}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 900,
                cursor: loading === "signup" ? "not-allowed" : "pointer",
                width: "100%",
                maxWidth: 320,
              }}
            >
              {loading === "signup" ? "Creating..." : "Create account"}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading === "reset"}
              style={{
                border: "none",
                background: "transparent",
                color: "#1d4ed8",
                fontWeight: 700,
                cursor: loading === "reset" ? "not-allowed" : "pointer",
              }}
            >
              {loading === "reset" ? "Sending reset..." : "Forgot password?"}
            </button>
          </>
        )}

        {status === "sent" && (
          <div style={{ fontSize: 13, fontWeight: 700 }}>Check your email for the sign-in link.</div>
        )}
        {successMessage && <div style={{ fontSize: 13, fontWeight: 700 }}>{successMessage}</div>}
        {(status === "error" || errorMessage) && (
          <div style={{ fontSize: 12, color: "#b91c1c" }}>{errorMessage}</div>
        )}
        {needsEmailConfirm && mode === "password" && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendLoading}
            style={{
              marginTop: 6,
              border: "1px solid #0f172a",
              background: "#fff",
              color: "#0f172a",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: resendLoading ? "not-allowed" : "pointer",
            }}
          >
            {resendLoading ? "Resending..." : "Resend confirmation email"}
          </button>
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

      <div
        style={{
          marginTop: 20,
          textAlign: "left",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
          How GIFTer works
        </div>
        <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
          <li>Sign in once, then come back anytime at: {origin || "this site"}</li>
          <li>Bookmark this page (desktop) or “Add to Home Screen” (mobile) for quick access.</li>
          <li>You’ll stay signed in unless you click Sign out.</li>
          <li>
            Tip: If you’re using an Incognito/Private window, you may need to sign in again next time.
          </li>
        </ul>

        <button
          type="button"
          onClick={() => setShowBookmarkHelp((prev) => !prev)}
          style={{
            marginTop: 8,
            border: "none",
            background: "transparent",
            color: "#1d4ed8",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {showBookmarkHelp ? "Hide bookmark tips" : "How do I bookmark this?"}
        </button>

        {showBookmarkHelp && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
            Desktop: Press Ctrl+D (Windows) / Cmd+D (Mac). Mobile: Share → Add to Home Screen.
          </div>
        )}
      </div>
    </main>
  );
}
