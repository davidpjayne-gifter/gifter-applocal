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
    {
      asin: "B08W5DGL1V",
      title: "Paw Patrol, Mighty Lookout Tower",
      url: "https://amzn.to/4bgBHJm",
      imageUrl: "https://m.media-amazon.com/images/I/914zKPJuu8L._AC_SL1500_.jpg",
    },
    {
      asin: "B0G4GDZ4FV",
      title: "SIX–SEVEN! The Epic 67 Activity Book",
      url: "https://amzn.to/4pXZZfM",
      imageUrl: "https://m.media-amazon.com/images/I/81XxRnvAggL._SL1499_.jpg",
    },
    {
      asin: "B0BRKPVZB4",
      title: "BolaButty Bluetooth Speaker with HD Sound",
      url: "https://amzn.to/4pxSfQQ",
      imageUrl: "https://m.media-amazon.com/images/I/81l7mB5LhsL._AC_SL1500_.jpg",
    },
    {
      asin: "B0C6KK8Q9V",
      title: "Bottleboom STEM 13-in-1 Education Solar Power Robot",
      url: "https://amzn.to/3KXJlhh",
      imageUrl: "https://m.media-amazon.com/images/I/91arrRYVW5L._AC_SL1500_.jpg",
    },
    {
      asin: "B0CTWHSSM8",
      title: "Remote Control Car, RC Cars",
      url: "https://amzn.to/45fYOQL",
      imageUrl: "https://m.media-amazon.com/images/I/81pa-dG26dL._AC_SL1500_.jpg",
    },
    {
      asin: "B0FN77THJH",
      title: "Drones For Kids Beginners - Foldable HD 1080P Drone with Camera",
      url: "https://amzn.to/3YqTpCq",
      imageUrl: "https://m.media-amazon.com/images/I/71atrV8sIyL._AC_SL1500_.jpg",
    },
    {
      asin: "B09Y9DT9W7",
      title: "LED Mask with Gesture Sensing",
      url: "https://amzn.to/4qzc1vX",
      imageUrl: "https://m.media-amazon.com/images/I/81PatiJgAOL._AC_SL1500_.jpg",
    },
    {
      asin: "B00SBBZITI",
      title: "Bluetooth Beanie Hat Wireless Headphone for Outdoors",
      url: "https://amzn.to/4sppt7m",
      imageUrl: "https://m.media-amazon.com/images/I/81EijQnyMML._AC_SX679_.jpg",
    },
    {
      asin: "B0DJRQZPS1",
      title: "New Balance Men's Sport Essentials Fleece Hoodie",
      url: "https://amzn.to/3L1csQN",
      imageUrl: "https://m.media-amazon.com/images/I/711MJ-e7AXL._AC_SX679_.jpg",
    },
    {
      asin: "B0BS3S1MHC",
      title: "2 Pack Mens Athletic Shorts 5 Inch Quick Dry",
      url: "https://amzn.to/44ONSt6",
      imageUrl: "https://m.media-amazon.com/images/I/71rjcO4nkSL._AC_SX679_.jpg",
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
