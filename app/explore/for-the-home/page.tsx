import AmazonProductGrid from "@/app/components/AmazonProductGrid";

export default function ForTheHomeExplorePage() {
  const products = [
    {
      asin: "B09M84PBHR",
      title: "Murrey Home Glass Cutting Board",
      url: "https://amzn.to/3YH8QXr",
      imageUrl: "https://m.media-amazon.com/images/I/61e6xb7oD0L._AC_SL1500_.jpg",
    },
    {
      asin: "B0BR3CCDCV",
      title: "Industrial Pendant Lights",
      url: "https://amzn.to/4slMesO",
      imageUrl: "https://m.media-amazon.com/images/I/61tp96QzkBL._AC_SL1500_.jpg",
    },
    {
      asin: "B0BV2VNP4K",
      title: "Country Kitchen Non Stick Silicone Utensil Set",
      url: "https://amzn.to/49IgVQL",
      imageUrl: "https://m.media-amazon.com/images/I/61-OqkKsMUL._AC_SL1500_.jpg",
    },
    {
      asin: "B0D93SBHMM",
      title: "LOVMOC 22 inches Meditation Pillow",
      url: "https://amzn.to/4beNTu6",
      imageUrl: "https://m.media-amazon.com/images/I/91nns4WiCDL._AC_SL1500_.jpg",
    },
    {
      asin: "B0CKYT5195",
      title: "7FT Artificial Olive Tree",
      url: "https://amzn.to/3MVVGTM",
      imageUrl: "https://m.media-amazon.com/images/I/61MXt7Ee0KL._AC_SL1500_.jpg",
    },
    {
      asin: "B0BC1F9B6V",
      title: "Bedsure Queen Comforter Set (White / Boho Tufted)",
      url: "https://amzn.to/4jyWf1V",
      imageUrl: "https://m.media-amazon.com/images/I/91+vECJ8t-L._AC_SL1500_.jpg",
    },
    {
      asin: "B0DSJY7WCS",
      title: "Sterilite 8 Pack Tote, Plastic Stackable Storage Bin",
      url: "https://amzn.to/4967Kug",
      imageUrl: "https://m.media-amazon.com/images/I/51e3raSSUOL._AC_SL1500_.jpg",
    },
    {
      asin: "B0CPJ74KDJ",
      title: "Bathroom Vanity Mirror with Tempered Glass",
      url: "https://amzn.to/4pqBUNN",
      imageUrl: "https://m.media-amazon.com/images/I/71VJGCwCdwL._AC_SL1500_.jpg",
    },
    {
      asin: "B0C8NFTKT6",
      title: "MerryNine Acrylic Book Ends (20pcs)",
      url: "https://amzn.to/4aDTJVN",
      imageUrl: "https://m.media-amazon.com/images/I/615clnR+tiL._AC_SL1500_.jpg",
    },
    {
      asin: "B0CGVBXTH4",
      title: "Christmas Ornament Storage Box",
      url: "https://amzn.to/4aNUUCd",
      imageUrl: "https://m.media-amazon.com/images/I/811d65cHAlL._AC_SL1500_.jpg",
    },
    {
      asin: "B06XK2Y3S6",
      title: "DII Herringbone Striped Cotton Throw Blanket, 50x60",
      url: "https://amzn.to/3YH8XCl",
      imageUrl: "https://m.media-amazon.com/images/I/81GpNm6mAwL._AC_SL1500_.jpg",
    },
    {
      asin: "B0BZYYGVPB",
      title: "Topfinel Blue Patterned Curtains (2 panels, 96 inches)",
      url: "https://amzn.to/4aJfeo7",
      imageUrl: "https://m.media-amazon.com/images/I/81ImhDP7NzL._AC_SL1500_.jpg",
    },
    {
      asin: "B08J8GZXKZ",
      title: "KITCHENAID Ribbed Soft Silicone Oven Mitt 2-Pack Set",
      url: "https://amzn.to/3MVujt1",
      imageUrl: "https://m.media-amazon.com/images/I/617z6N3l59L._AC_SL1500_.jpg",
    },
    {
      asin: "B0F9K88CBR",
      title: "DEPAOTLUX 3pcs Under Cabinet Mug Hooks",
      url: "https://amzn.to/4jojbAI",
      imageUrl: "https://m.media-amazon.com/images/I/71g47ivqo8L._AC_SL1500_.jpg",
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
      <h1 className="text-2xl font-semibold">🏡 For the Home</h1>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        An Amazon affiliate earns from qualifying purchases.
      </p>

      <AmazonProductGrid products={products} />
    </main>
  );
}
