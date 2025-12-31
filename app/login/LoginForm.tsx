"use client";

import { useState } from "react";
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const nextEmail = email.trim();
    if (!nextEmail) {
      setStatus("error");
      setMessage("Please enter your email address.");
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

    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath
    )}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        emailRedirectTo,
        data: {
          gender,
          age_range: ageRange,
        },
      },
    });

    setLoading(false);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a sign-in link.");
  }

  const inputBase =
    "w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition " +
    "focus:outline-none focus:ring-2 " +
    "bg-white text-slate-900 border-slate-200 " +
    "focus:border-blue-400 focus:ring-blue-200 " +
    "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

  const labelBase = "text-xs font-semibold text-slate-700 dark:text-slate-200";
  const selectBase =
    `${inputBase} dark:bg-white dark:text-slate-900 dark:border-slate-200`;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/10 via-blue-600/5 to-blue-600/0 px-5 py-6"
    >
      {/* Email */}
      <div className="grid gap-2">
        <label className={labelBase} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={inputBase}
        />
      </div>

      {/* Gender */}
      <div className="grid gap-2">
        <label className={labelBase} htmlFor="gender">
          Gender
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          className={selectBase}
          required
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>

      {/* Age range */}
      <div className="grid gap-2">
        <label className={labelBase} htmlFor="ageRange">
          Age range
        </label>
        <select
          id="ageRange"
          value={ageRange}
          onChange={(event) => setAgeRange(event.target.value)}
          className={selectBase}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40"
      >
        {loading ? "Sending..." : "Email me a sign-in link"}
      </button>

      {/* Status */}
      {status === "sent" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
          <div className="font-semibold text-emerald-900 dark:text-emerald-100">
            Check your email 📬
          </div>
          <div className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
            We just sent you a sign-in link. Click it to open GIFTer.
          </div>
          <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-100/70">
            If you don’t see it within a couple minutes, check Spam or Promotions and mark the
            email as “Not Spam” so future links arrive.
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {message}
        </div>
      )}
    </form>
  );
}
