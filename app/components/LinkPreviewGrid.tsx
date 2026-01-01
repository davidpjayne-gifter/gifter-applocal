"use client";

import { useEffect, useState } from "react";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

type Preview = {
  title: string | null;
  image: string | null;
  finalUrl: string | null;
};

type PreviewState = {
  status: "idle" | "loading" | "ready";
  data: Record<string, Preview>;
};

type LinkPreviewGridProps = {
  links: string[];
};

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await fn(current));
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export default function LinkPreviewGrid({ links }: LinkPreviewGridProps) {
  const [state, setState] = useState<PreviewState>({
    status: "idle",
    data: {},
  });

  useEffect(() => {
    let mounted = true;

    async function loadPreviews() {
      setState((prev) => ({ ...prev, status: "loading" }));
      const previews: Record<string, Preview> = {};

      await mapWithLimit(links, 3, async (link) => {
        const result = await safeFetchJson<Preview>(`/api/link-preview?url=${encodeURIComponent(link)}`);
        previews[link] = result.ok && result.json ? result.json : { title: null, image: null, finalUrl: null };
      });

      if (!mounted) return;
      setState({ status: "ready", data: previews });
    }

    loadPreviews();
    return () => {
      mounted = false;
    };
  }, [links]);

  const loading = state.status !== "ready";

  return (
    <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((href) => {
          const preview = state.data[href];
          const title = preview?.title?.trim() || "Amazon item";
          const image = preview?.image || null;

          return (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white text-left shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400 dark:text-slate-500">
                    🎁
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 animate-pulse bg-slate-200/60 dark:bg-slate-700/40" />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900 line-clamp-2 dark:text-slate-50">
                  {title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">Amazon</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
