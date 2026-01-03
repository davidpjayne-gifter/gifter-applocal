import AmazonProductGrid from "@/app/components/AmazonProductGrid";

export default function ForThemExplorePage() {
  const products = [
    {
      asin: "B0F94LH1PR",
      title: "JrTrack 5 Kids Smart Watch by Cosmo",
      url: "https://www.amazon.com/dp/B0F94LH1PR/ref=cm_sw_r_as_gl_api_gl_i_dl_HEXZMWEZ48WZRV49DW1R?linkCode=ml1&tag=morganjayne-20&linkId=05f3e5f01b848109db9ec327bffdd3af",
      imageUrl: "https://m.media-amazon.com/images/I/61KRlQe3CzL._AC_SL1500_.jpg",
    },
    {
      asin: "B0D46FMQTJ",
      title: "4 Pack LCD Writing Tablet",
      url: "https://www.amazon.com/dp/B0D46FMQTJ/ref=cm_sw_r_as_gl_api_gl_i_Z0Q524Y19VSEWYR50RNQ?linkCode=ml1&tag=morganjayne-20&linkId=c47fa8e20ea10ce08c97dd1b9bb43f1b&th=1",
      imageUrl: "https://m.media-amazon.com/images/I/71eSSNJH9fL._AC_SL1500_.jpg",
    },
    {
      asin: "B0FKVS1K4Z",
      title: "GUND Official Bingo Oh So Snuggly Plush",
      url: "https://www.amazon.com/dp/B0FKVS1K4Z/ref=cm_sw_r_as_gl_api_gl_i_XR610F2YGDN482SC83YM?linkCode=ml1&tag=morganjayne-20&linkId=a0b9474682abe100fa9ffeb43071e934",
      imageUrl: "https://m.media-amazon.com/images/I/71jc-5iKtoL._AC_SL1500_.jpg",
    },
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
      <h1 className="text-2xl font-semibold">🎁 For Them</h1>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        More ideas coming soon ✨
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        We’re adding new picks regularly, so check back for fresh favorites.
      </p>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        An Amazon affiliate earns from qualifying purchases.
      </p>

      <AmazonProductGrid products={products} />
    </main>
  );
}
