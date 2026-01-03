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
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">
                🗓️ Start a season, set a budget, and even set a goal date to wrap your season up.
              </p>
              <p>
                Create a season and set a budget so you can see how much you plan to spend overall
                - and how much is left as you go.
              </p>
              <p className="font-semibold text-gray-900">👥 Add people &amp; gifts</p>
              <p>
                Add the people you’re buying for, then add gifts under each person.
                For every gift, you can track 🎁 what it is, 💵 the cost, and 📦 an optional tracking number.
              </p>
              <p className="font-semibold text-gray-900">📊 See everything at a glance</p>
              <p>GIFTer keeps things organized so you can quickly see:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>👥 How many people you’re buying for</li>
                <li>💰 How much you’ve spent total</li>
                <li>🎯 How much you’ve spent on each person</li>
              </ul>
              <p className="font-semibold text-gray-900">✅ Track progress as you go</p>
              <p>
                As gifts are wrapped or arrive, update their status so you always know what’s left to do
                - and when you’re done GIFTing.
              </p>
            </div>
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
