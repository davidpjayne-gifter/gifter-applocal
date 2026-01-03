"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type LoginFormProps = {
  nextPath: string;
};

const AGE_OPTIONS = [
  { value: "13-17", label: "13–17" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55-64", label: "55–64" },
  { value: "65+", label: "65+" },
];

export default function LoginForm({ nextPath }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [status, setStatus] = useState<null | "sent" | "error">(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const emailIsValid = useMemo(() => {
    const value = email.trim();
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, [email]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  async function sendLink(nextEmail: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setLoading(false);
    setStatus("sent");
    setMessage("");
    setResendCountdown(15);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setAttemptedSubmit(true);

    const nextEmail = email.trim();
    if (!nextEmail || !emailIsValid) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!gender || !ageRange) {
      setStatus("error");
      setMessage("Please select your gender and age range.");
      return;
    }

    setStatus(null);
    setMessage("");
    setLoading(true);

    await sendLink(nextEmail);
  }

  async function handleResend() {
    if (loading || resendCountdown > 0) return;
    const nextEmail = email.trim();
    if (!nextEmail || !emailIsValid) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!gender || !ageRange) {
      setStatus("error");
      setMessage("Please select your gender and age range.");
      return;
    }
    setStatus(null);
    setMessage("");
    setLoading(true);
    await sendLink(nextEmail);
  }

  function handleUseDifferentEmail() {
    setStatus(null);
    setMessage("");
    setResendCountdown(0);
    setAttemptedSubmit(false);
    setEmailTouched(false);
  }

  const inputBase =
    "w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition " +
    "focus:outline-none focus:ring-2 " +
    "bg-white text-slate-900 border-slate-200 " +
    "focus:border-blue-400 focus:ring-blue-200 " +
    "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

  const labelBase = "text-xs font-semibold text-slate-700 dark:text-slate-200";
  const selectBase =
    "w-full rounded-xl border bg-white px-4 py-3 text-base shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
    "border-slate-200 appearance-none " +
    "dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100";

  const showEmailError = (emailTouched || attemptedSubmit) && !emailIsValid;
  const canSubmit = emailIsValid && gender && ageRange;

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/10 via-blue-600/5 to-blue-600/0 px-5 py-6 text-left shadow-sm">
      {status === "sent" ? (
        <div className="flex flex-col gap-4 text-sm">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <div className="font-semibold text-emerald-900 dark:text-emerald-100">
              Check your email 📬
            </div>
            <div className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
              We sent a secure sign-in link to {email.trim() || "your email"}.
            </div>
            <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-100/70">
              It can take up to a minute. Check spam/promotions if you don’t see it.
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCountdown > 0}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40"
            >
              {resendCountdown > 0 ? `Resend link (${resendCountdown}s)` : "Resend link"}
            </button>
            <button
              type="button"
              onClick={handleUseDifferentEmail}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Use a different email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className={labelBase} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputBase}
            />
            {showEmailError && (
              <p className="text-xs font-semibold text-rose-600">
                Please enter a valid email address.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label className={labelBase} htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className={`${selectBase} ${gender ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}
              required
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelBase} htmlFor="ageRange">
              Age range
            </label>
            <select
              id="ageRange"
              name="ageRange"
              value={ageRange}
              onChange={(event) => setAgeRange(event.target.value)}
              className={`${selectBase} ${ageRange ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}
              required
            >
              <option value="">Select age range</option>
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40"
          >
            {loading ? "Sending..." : "Send my sign-in link"}
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            We’ll only email you sign-in links. No spam.
          </p>

          {status === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {message}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
