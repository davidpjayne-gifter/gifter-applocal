import LinkPreviewGrid from "@/app/components/LinkPreviewGrid";

export default function ForHerExplorePage() {
  const links = [
    "https://amzn.to/4jr1IYK",
    "https://amzn.to/3LkKQGa",
    "https://amzn.to/4sk0G4D",
    "https://amzn.to/3MXqOCk",
    "https://amzn.to/3N5izE7",
    "https://amzn.to/4pf7Wfn",
    "https://amzn.to/4ssuzjt",
    "https://amzn.to/4pkrGya",
    "https://amzn.to/3YRiPJv",
    "https://amzn.to/3MW2mBj",
  ];

  return (
    <main className="min-h-screen mx-auto w-full max-w-xl bg-white px-4 py-8 text-center text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-slate-50">
      <h1 className="text-2xl font-semibold">✨ Coming soon</h1>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        We’re curating thoughtful and popular gift ideas designed to make gifting easier and more meaningful.
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Check back soon as this collection fills up with handpicked favorites.
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        💡 Perfect for birthdays, holidays, and just because moments.
      </p>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        An Amazon affiliate earns from qualifying purchases.
      </p>

      <LinkPreviewGrid links={links} />
    </main>
  );
}
