"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SignOutButton from "@/app/gifts/SignOutButton";
import { safeFetchJson } from "@/app/lib/safeFetchJson";
import SeasonProgressBar from "@/app/components/SeasonProgressBar";

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

function getSeasonEmoji(name: string) {
  const value = name.toLowerCase();
  if (value.includes("christmas") || value.includes("xmas")) return "🎄";
  if (value.includes("valentine")) return "💘";
  if (value.includes("birthday") || value.includes("bday")) return "🎂";
  if (value.includes("easter")) return "🐣";
  if (value.includes("wedding")) return "💍";
  if (value.includes("graduation")) return "🎓";
  if (value.includes("baby") || value.includes("shower")) return "🍼";
  if (value.includes("anniversary")) return "💖";
  return "🎁";
}

export default function HomePage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [seasonSummaries, setSeasonSummaries] = useState<
    {
      id: string;
      name: string;
      created_at: string | null;
      is_wrapped_up: boolean | null;
      budget: number | null;
      peopleCount: number;
      giftsCount: number;
      wrappedCount: number;
      spentTotal: number;
    }[]
  >([]);
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
      setSeasonSummaries([]);
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
      if (result.ok && (result.json as any)?.ok) {
        setSeasonSummaries((result.json as any).seasons ?? []);
      } else {
        setSeasonSummaries([]);
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
    ? "Your active gifting seasons"
    : "Sign in to see your seasons 🎁";
  const showEmptyState = hasSession && summaryLoaded && seasonSummaries.length === 0;
  const multiSeasonView = hasSession && summaryLoaded && seasonSummaries.length > 1;
  const singleSeasonSummary = seasonSummaries[0] ?? null;

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

  const actionButtonClass =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-600";

  return (
    <main className="min-h-screen mx-auto w-full max-w-3xl bg-white px-4 py-6 text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-slate-50">
      <div className="text-center text-2xl font-semibold">GIFTer 🎁</div>

      <div className="mt-6 mb-2 text-lg font-semibold">My GIFTs</div>
      <div
        className={`mt-6 ${cardBase} text-center md:min-h-[140px] lg:min-h-[160px] border-slate-400 bg-gradient-to-br from-blue-50/80 via-white to-white dark:border-slate-600 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 ${
          hasSession && summaryLoaded && !showEmptyState && !multiSeasonView && singleSeasonSummary
            ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:translate-y-0 dark:hover:border-blue-300/40"
            : ""
        }`}
        onClick={() => {
          if (hasSession && summaryLoaded && !showEmptyState && !multiSeasonView && singleSeasonSummary) {
            handleHeroClick();
          }
        }}
        role={
          hasSession && summaryLoaded && !showEmptyState && !multiSeasonView && singleSeasonSummary
            ? "button"
            : undefined
        }
        tabIndex={
          hasSession && summaryLoaded && !showEmptyState && !multiSeasonView && singleSeasonSummary
            ? 0
            : undefined
        }
        onKeyDown={(event) => {
          if (
            hasSession &&
            summaryLoaded &&
            !showEmptyState &&
            !multiSeasonView &&
            singleSeasonSummary &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            handleHeroClick();
          }
        }}
      >
        {hasSession ? (
          showEmptyState ? (
            <>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                No active seasons right now ✨
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Start a season for birthdays, holidays, or anything you’re GIFTing.
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link href="/gifts" className={actionButtonClass}>
                  Start New Season
                </Link>
                <Link
                  href="/settings#past-seasons"
                  className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
                >
                  Past Seasons →
                </Link>
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                When you’re done GIFTing, you can wrap up a season.
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-base text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                  🎁
                </span>
                <span>My GIFTs</span>
              </div>
              <div className="mt-2 text-base text-slate-700 dark:text-slate-300">
                {heroSubtitle}
              </div>
              {!multiSeasonView && singleSeasonSummary && !showEmptyState && (
                <div className="mt-4 rounded-xl border border-blue-600/60 bg-blue-600/10 p-4 dark:border-blue-400/30 dark:bg-blue-400/10">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    <span>{getSeasonEmoji(singleSeasonSummary.name)}</span>
                    <span>{singleSeasonSummary.name}</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      🟢 Open
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    👥 People {singleSeasonSummary.peopleCount} • 🎁 Gifts {singleSeasonSummary.giftsCount} • 📦
                    Wrapped{" "}
                    {singleSeasonSummary.giftsCount > 0
                      ? Math.round((singleSeasonSummary.wrappedCount / singleSeasonSummary.giftsCount) * 100)
                      : 0}
                    %
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">👥 People</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                          {singleSeasonSummary.peopleCount}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">🎁 Gifts</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                          {singleSeasonSummary.giftsCount}
                        </div>
                      </div>
                    </div>
                  </div>
                  {singleSeasonSummary.budget !== null ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">💰 Budget</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(singleSeasonSummary.budget)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">🧾 Spent</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(singleSeasonSummary.spentTotal)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">✅ Left</div>
                          <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                            {formatMoney(
                              typeof singleSeasonSummary.budget === "number"
                                ? singleSeasonSummary.budget - singleSeasonSummary.spentTotal
                                : 0
                            )}
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
                            {formatMoney(singleSeasonSummary.spentTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>
                      📦 Wrapped {singleSeasonSummary.wrappedCount} of {singleSeasonSummary.giftsCount}
                    </span>
                    <span>
                      {singleSeasonSummary.giftsCount > 0
                        ? Math.round((singleSeasonSummary.wrappedCount / singleSeasonSummary.giftsCount) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="mt-2">
                    <SeasonProgressBar
                      completed={singleSeasonSummary.wrappedCount}
                      total={singleSeasonSummary.giftsCount}
                      size="compact"
                    />
                  </div>
                </div>
              )}
              {multiSeasonView && (
                <div className="mt-4 rounded-xl border border-blue-600/60 bg-blue-600/10 p-4 text-center dark:border-blue-400/30 dark:bg-blue-400/10">
                  <div className="mt-3 space-y-3">
                    {seasonSummaries.slice(0, 3).map((season) => {
                      const wrappedPercent =
                        season.giftsCount > 0
                          ? Math.round((season.wrappedCount / season.giftsCount) * 100)
                          : 0;
                      const seasonEmoji = getSeasonEmoji(season.name);
                      return (
                        <div
                          key={season.id}
                          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <Link
                            href={`/gifts?seasonId=${season.id}`}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="text-sm font-semibold">
                              {seasonEmoji} {season.name}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">🟢 Open</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              👥 People {season.peopleCount} • 🎁 Gifts {season.giftsCount} • 📦
                              Wrapped {wrappedPercent}%
                            </div>
                            <div className="flex w-full items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <span>
                                📦 Wrapped {season.wrappedCount} of {season.giftsCount}
                              </span>
                              <span>{wrappedPercent}%</span>
                            </div>
                            <SeasonProgressBar
                              completed={season.wrappedCount}
                              total={season.giftsCount}
                              size="compact"
                            />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                  {seasonSummaries.length > 3 && (
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                      +{seasonSummaries.length - 3} more seasons
                    </div>
                  )}
                </div>
              )}
              {!multiSeasonView && singleSeasonSummary && !showEmptyState && (
                <div className="mt-4">
                  <button type="button" onClick={handleHeroClick} className={actionButtonClass}>
                    Open My GIFTs
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          <>
            <div className="text-sm text-slate-600 dark:text-slate-300">{heroSubtitle}</div>
            <div className="mt-2 flex justify-center">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                Secure sign-in ✨
              </span>
            </div>
            <div className="mt-4">
              <button type="button" onClick={handleHeroClick} className={actionButtonClass}>
                Login
              </button>
            </div>
          </>
        )}
      </div>

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
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Continue GIFTing stress-free 🎁
              </div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Pro keeps all your people and gifts in one place so you never have to juggle limits.
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Add more people, track more gifts, and finish every season with confidence.
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Simple yearly plan. Cancel anytime.
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
                  Go Pro
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
