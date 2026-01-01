import LinkPreviewGrid from "@/app/components/LinkPreviewGrid";

export default function ForThemExplorePage() {
  const links = [
    "https://amzn.to/492KHR4",
    "https://amzn.to/3KSmIe8",
    "https://amzn.to/4qCNJBw",
  ];

  return (
    <main className="min-h-screen mx-auto w-full max-w-xl bg-white px-4 py-8 text-center text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-slate-50">
      <div className="mb-4 flex justify-start">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Main
        </a>
      </div>
      <h1 className="text-2xl font-semibold">🚀 Coming soon</h1>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Great gifts are better when they work for everyone. This category is on the way with versatile, crowd-pleasing ideas.
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        We’re building this list carefully so you can gift with confidence.
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        👀 New ideas dropping soon.
      </p>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        An Amazon affiliate earns from qualifying purchases.
      </p>

      <LinkPreviewGrid links={links} />
    </main>
  );
}
