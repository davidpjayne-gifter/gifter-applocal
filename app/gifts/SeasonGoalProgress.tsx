"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SeasonProgressBar from "@/app/components/SeasonProgressBar";
import { safeFetchJson } from "@/app/lib/safeFetchJson";
import { supabase } from "@/lib/supabase";

type Props = {
  goalDate: string | null;
  createdAt: string | null;
  seasonId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parseGoalEnd(goalDate: string) {
  const end = new Date(`${goalDate}T23:59:59`);
  return Number.isNaN(end.getTime()) ? null : end;
}

function parseStart(createdAt: string | null) {
  if (!createdAt) return new Date();
  const start = new Date(createdAt);
  return Number.isNaN(start.getTime()) ? new Date() : start;
}

function getDaysLeftLabel(goalDate: string | null, now: Date) {
  if (!goalDate) return "No goal date";
  const end = parseGoalEnd(goalDate);
  if (!end) return "No goal date";
  const diff = end.getTime() - now.getTime();
  if (diff < 0) return "Goal date passed";
  const days = Math.ceil(diff / DAY_MS);
  if (days <= 0) return "Today";
  return `${days} days left`;
}

function getTimeProgress(goalDate: string | null, createdAt: string | null, now: Date) {
  if (!goalDate) return 0;
  const end = parseGoalEnd(goalDate);
  if (!end) return 0;
  const start = parseStart(createdAt);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = now.getTime() - start.getTime();
  return clamp(elapsed / total);
}

function formatGoalDate(goalDate: string | null) {
  if (!goalDate) return "";
  const date = new Date(`${goalDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SeasonGoalProgress({ goalDate, createdAt, seasonId }: Props) {
  const now = new Date();
  const label = getDaysLeftLabel(goalDate, now);
  const progress = getTimeProgress(goalDate, createdAt, now);
  const percent = Math.round(progress * 100);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pendingDate, setPendingDate] = useState(goalDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPendingDate(goalDate ?? "");
  }, [goalDate]);

  async function saveGoalDate() {
    if (saving) return;
    setSaving(true);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setSaving(false);
      setError("Please sign in to update your goal date.");
      return;
    }

    const result = await safeFetchJson(`/api/seasons/${seasonId}/goal-date`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        goalDate: pendingDate.trim() === "" ? null : pendingDate.trim(),
      }),
    });

    setSaving(false);

    if (!result.ok) {
      const message =
        (result.json as any)?.error?.message ||
        (result.json as any)?.error ||
        "Something went wrong.";
      setError(message);
      return;
    }

    if (result.text) {
      setError("Something went wrong.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>Days till wrapped</span>
        <span>{label}</span>
      </div>
      <div className="mt-2">
        <SeasonProgressBar completed={percent} total={100} size="compact" />
      </div>
      {!editing ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>
            {goalDate
              ? `Goal date: ${formatGoalDate(goalDate)}`
              : "No goal date yet"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {goalDate ? "Change goal date" : "Set goal date"}
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <div className="font-semibold text-slate-900 dark:text-slate-100">Set a goal date</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            When do you want to be all wrapped up?
          </div>
          <input
            type="date"
            id={`goal-date-${seasonId}`}
            name="goalDate"
            value={pendingDate}
            onChange={(event) => setPendingDate(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
          />
          {error && (
            <div className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setPendingDate(goalDate ?? "");
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveGoalDate}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40"
            >
              {saving ? "Saving..." : "Save goal date"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
