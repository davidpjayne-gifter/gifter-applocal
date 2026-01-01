"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SignOutButton from "@/app/gifts/SignOutButton";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

type ExploreCard = {
  label: string;
  href: string;
  proLocked?: boolean;
};

const EXPLORE_CARDS: ExploreCard[] = [
  { label: "🔥 Popular Right Now", href: "/explore/popular", proLocked: true },
  { label: "👔 For Him", href: "/explore/for-him" },
  { label: "💄 For Her", href: "/explore/for-her" },
  { label: "🎁 For Them", href: "/explore/for-them" },
];

export default function HomePage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [summary, setSummary] = useState<null | {
    peopleCount: number;
    giftsCount: number;
    spentTotal: number;
    budget: number | null;
    remaining: number | null;
  }>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function updateFromSession(session: typeof supabase.auth.getSession extends (...args: any) => Promise<infer R>
      ? R extends { data: { session: infer S } }
        ? S
        : null
      : null) {
      if (!mounted) return;
      setHasSession(Boolean(session));
      setSummary(null);
      setSummaryLoaded(false);

      if (!session?.user?.id) {
        setIsPro(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro,subscription_status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;
      const pro =
        profile?.subscription_status === "active" ||
        profile?.subscription_status === "trialing" ||
        Boolean(profile?.is_pro);
      setIsPro(Boolean(pro));

      const result = await safeFetchJson("/api/gifts/summary");
      if (!mounted) return;
      if (result.ok && (result.json as any)?.ok && (result.json as any)?.hasData) {
        setSummary((result.json as any).summary ?? null);
      } else {
        setSummary(null);
      }
      setSummaryLoaded(true);
    }

    supabase.auth.getSession().then(({ data }) => updateFromSession(data.session));

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      updateFromSession(session);
    });

    return () => {
      mounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const heroSubtitle = hasSession
    ? "View your current season and GIFTees"
    : "Sign in to view and manage your gifts";
  const showEmptyState = hasSession && summaryLoaded && !summary;

  const formatMoney = (value: number) =>
    value.toLocaleString(undefined, { style: "currency", currency: "USD" });

  function handleHeroClick() {
    router.push(hasSession ? "/gifts" : "/login");
  }

  function handleExploreClick(card: ExploreCard) {
    if (card.proLocked && !isPro) {
      setShowUpgrade(true);
      return;
    }
    router.push(card.href);
  }

  function handleUpgrade() {
    setShowUpgrade(false);
    router.push("/upgrade");
  }

  const cardBase =
    "w-full rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition sm:p-6 dark:border-slate-700 dark:bg-slate-900";
  const exploreCardBase = `${cardBase} lg:aspect-square`;
  const cardInteractive =
    "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:translate-y-0 dark:hover:border-blue-300/40";

  return (
    <main className="min-h-screen mx-auto w-full max-w-3xl bg-white px-4 py-6 text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-slate-50">
      <div className="text-center text-2xl font-semibold">GIFTer 🎁</div>

      <div className="mt-6 mb-2 text-lg font-semibold">My GIFTs</div>
      <button
        type="button"
        onClick={handleHeroClick}
        className={`mt-6 ${cardBase} ${cardInteractive} text-center md:min-h-[140px] lg:min-h-[160px] border-slate-400 bg-gradient-to-br from-blue-50/80 via-white to-white dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900`}
      >
        {hasSession ? (
          showEmptyState ? (
            <>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                You don&apos;t have any gifts yet.
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Start by adding a person, then add gifts under them.
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-base text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                  🎁
                </span>
                <span>My GIFTs</span>
              </div>
              <div className="mt-2 text-base text-slate-700 dark:text-slate-300">{heroSubtitle}</div>
              {summary && (
                <div className="mt-4 rounded-xl border border-blue-600/60 bg-blue-600/10 p-4 dark:border-blue-400/30 dark:bg-blue-400/10">
                  <div className="flex flex-wrap justify-center gap-3">
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">👥 People</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                          {summary.peopleCount}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">🎁 Gifts</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                          {summary.giftsCount}
                        </div>
                      </div>
                    </div>
                  </div>
                  {summary.budget !== null ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">💰 Budget</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(summary.budget)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">🧾 Spent</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(summary.spentTotal)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">✅ Left</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(summary.remaining ?? 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">🧾 Spent</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(summary.spentTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-300">{heroSubtitle}</div>
        )}
      </button>

      <div className="mt-8 mb-4 text-lg font-semibold">Explore</div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {EXPLORE_CARDS.map((card) => {
          const [emoji, ...labelParts] = card.label.split(" ");
          const labelText = labelParts.join(" ");
          const content = (
            <>
              {card.proLocked && (
                <span className="absolute right-3 top-3 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  Pro
                </span>
              )}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                  {emoji}
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-50 sm:text-lg">
                  {labelText}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span>{card.proLocked ? "Pro feature" : "Tap to explore"}</span>
                <span aria-hidden="true">→</span>
              </div>
            </>
          );

          const className = `${exploreCardBase} ${cardInteractive} relative text-center bg-gradient-to-br from-blue-50/80 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900`;

          if (card.proLocked && !isPro) {
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => handleExploreClick(card)}
                className={className}
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={card.label} href={card.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 pb-6">
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-600"
        >
          Help
        </button>
        <SignOutButton
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-600"
        />
      </div>

      {showHelp && (
        <>
          <div
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Help with GIFTer 🎁</div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                GIFTer is a simple place to keep track of who you’re buying for, what you’ve
                purchased, and what’s already wrapped up.
              </div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                You sign in with your email, so your gifts are available anywhere you open GIFTer.
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {showUpgrade && (
        <>
          <div
            onClick={() => setShowUpgrade(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unlock GIFTer Pro</div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                This feature is part of GIFTer Pro.
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgrade(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-slate-600"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
