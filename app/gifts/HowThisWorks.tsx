"use client";

import { useState } from "react";

export default function HowThisWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        How this works
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-slate-900/40"
            aria-label="Close help"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-gray-900 shadow-xl">
            <div className="text-sm font-black">How it works</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
              <li>Add people</li>
              <li>Add gifts under each person</li>
              <li>Track cost, wrapping, and arrival</li>
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
