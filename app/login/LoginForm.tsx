"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

type LoginFormProps = {
  nextPath: string;
};

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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600/10 via-blue-600/5 to-blue-600/0 px-5 py-6"
    >
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="email">
        Email address
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700"
      />
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="gender">
        Gender
      </label>
      <select
        id="gender"
        value={gender}
        onChange={(event) => setGender(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700"
        required
      >
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="prefer_not_to_say">Prefer not to say</option>
      </select>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="ageRange">
        Age range
      </label>
      <select
        id="ageRange"
        value={ageRange}
        onChange={(event) => setAgeRange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700"
        required
      >
        <option value="">Select age range</option>
        <option value="13-17">13–17</option>
        <option value="18-24">18–24</option>
        <option value="25-34">25–34</option>
        <option value="35-44">35–44</option>
        <option value="45-54">45–54</option>
        <option value="55-64">55–64</option>
        <option value="65+">65+</option>
        <option value="prefer_not_to_say">Prefer not to say</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? "Sending..." : "Send sign-in link"}
      </button>

      {status === "sent" && (
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {message || "Check your email for a sign-in link."}
          </div>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            If you don’t see it within a couple minutes, check Spam/Promotions and mark the email
            as Not Spam so future links arrive.
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="text-sm font-semibold text-red-600">{message}</div>
      )}
    </form>
  );
}
