import AmazonProductGrid from "@/app/components/AmazonProductGrid";

export default function ForHerExplorePage() {
  const products = [
    {
      asin: "B0DPJHXTSX",
      title: "UGG Women's Tasman II Slipper",
      url: "https://www.amazon.com/dp/B0DPJHXTSX/ref=cm_sw_r_as_gl_api_gl_i_10JDMM89NDQY2TPRANB6?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/61OH0aaaSJL._AC_SY695_.jpg",
    },
    {
      asin: "B09GC9FSPT",
      title: "Ember Temperature Control Smart Cup (6 oz)",
      url: "https://www.amazon.com/dp/B09GC9FSPT/ref=cm_sw_r_as_gl_api_gl_i_JW1YXHQGRCVXZX3EEJ3X?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/41vYzitHY4L._AC_SX679_.jpg",
    },
    {
      asin: "B06XD26G5W",
      title: "UGG Women's Rib Knit Slouchy Crew Socks",
      url: "https://www.amazon.com/dp/B06XD26G5W/ref=cm_sw_r_as_gl_api_gl_i_V1A652QYZ4A14PDTW5TD?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/512nYIb5YfL._AC_SX679_.jpg",
    },
    {
      asin: "B0FQ69BR1F",
      title: "Kate Spade New York Spade Floral Decorative Pillow (20\" x 20\")",
      url: "https://www.amazon.com/dp/B0FQ69BR1F/ref=cm_sw_r_as_gl_api_gl_i_F3YGHHYC2T0X6CC9MGC3?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/81T6vLbJ8eL._AC_SX679_.jpg",
    },
    {
      asin: "B09PFC48BN",
      title: "SMEG Mini 50's Retro Style Appliance",
      url: "https://www.amazon.com/dp/B09PFC48BN/ref=cm_sw_r_as_gl_api_gl_i_JZE61R60CXMXCRBKA0YW?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/512ekjqYLeL._AC_SL1500_.jpg",
    },
    {
      asin: "B0CCX8BNC6",
      title: "Meridian Furniture Contemporary Swivel Accent Chair",
      url: "https://www.amazon.com/dp/B0CCX8BNC6/ref=cm_sw_r_as_gl_api_gl_i_6BKJPZVJJEVP85PMY3Q2?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/918h6WBD7FL._AC_SL1500_.jpg",
    },
    {
      asin: "B0FQ9PXJG3",
      title: "Trendy Queen V-Neck Oversized Cable Knit Sweater",
      url: "https://www.amazon.com/dp/B0FQ9PXJG3/ref=cm_sw_r_as_gl_api_gl_i_3ASH1MR16XJBMEHAG3QY?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/71CuPmDdLSL._AC_SY879_.jpg",
    },
    {
      asin: "B0FJ23CP29",
      title: "Women's Long Sleeve Knit Tunic Pullover Sweater",
      url: "https://www.amazon.com/dp/B0FJ23CP29/ref=cm_sw_r_as_gl_api_gl_i_4E3PEJTMGHSY4BD5N9DS?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/81C-dFSyFuL._AC_SY879_.jpg",
    },
    {
      asin: "B0FQB5CJLH",
      title: "AVAMO High Waisted Pull-On Flare Jeans",
      url: "https://www.amazon.com/dp/B0FQB5CJLH/ref=cm_sw_r_as_gl_api_gl_i_SNY4S4N990ZTNVWZN5SF?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/818OjRA7DBL._AC_SY879_.jpg",
    },
    {
      asin: "B0FC6BVH7G",
      title: "OFEEFAN Oversized Turtleneck Sweater",
      url: "https://www.amazon.com/dp/B0FC6BVH7G/ref=cm_sw_r_as_gl_api_gl_i_PXD16AH9A15KFVGRBD66?linkCode=ml1&tag=morganjayne-20",
      imageUrl: "https://m.media-amazon.com/images/I/711EMMHRpfL._AC_SY879_.jpg",
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
      <h1 className="text-2xl font-semibold">💄 For Her</h1>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Explore gift ideas often chosen for women.
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Use this page as a starting point when planning birthdays, holidays, or special occasions.
      </p>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        An Amazon affiliate earns from qualifying purchases.
      </p>

      <AmazonProductGrid products={products} />
    </main>
  );
}
