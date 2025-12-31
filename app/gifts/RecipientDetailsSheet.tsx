"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

type Props = {
  recipientKey: string;
  listId: string;
  seasonId: string;
  initialGender: string | null;
  initialAgeRange: string | null;
  onSave: (formData: FormData) => Promise<void>;
};

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const ageRangeOptions = [
  { value: "13-17", label: "13–17" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55-64", label: "55–64" },
  { value: "65+", label: "65+" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function RecipientDetailsSheet({
  recipientKey,
  listId,
  seasonId,
  initialGender,
  initialAgeRange,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState(initialGender ?? "");
  const [ageRange, setAgeRange] = useState(initialAgeRange ?? "");
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setGender(initialGender ?? "");
    setAgeRange(initialAgeRange ?? "");
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await onSave(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
      >
        Edit details
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
      >
        Edit details
      </button>
      <div
        className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-x-0 bottom-0 z-[80]">
        <div className="mx-auto w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 text-gray-900 shadow-2xl">
          <div className="text-base font-black">Recipient details</div>
          <div className="mt-1 text-xs text-gray-600">
            Optional (helps with gift ideas later)
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="recipientKey" value={recipientKey} />
            <input type="hidden" name="listId" value={listId} />
            <input type="hidden" name="seasonId" value={seasonId} />

            <label className="text-sm font-semibold text-gray-900">
              Gender <span className="text-gray-500">(optional)</span>
              <select
                name="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Select…</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-gray-900">
              Age range <span className="text-gray-500">(optional)</span>
              <select
                name="ageRange"
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Select…</option>
                {ageRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
