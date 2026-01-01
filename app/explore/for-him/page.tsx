import AmazonProductGrid from "@/app/components/AmazonProductGrid";

export default function ForHimExplorePage() {
  const products = [
    {
      asin: "B0CP4ZNJLR",
      title: "Ember Temperature Control 14oz Smart Mug 2",
      url: "https://amzn.to/4sk027d",
      imageUrl: "https://m.media-amazon.com/images/I/51NRIgybmdL._AC_SL1500_.jpg",
    },
    {
      asin: "B0FQFB8FMG",
      title: "Apple AirPods Pro 3 Wireless Earbuds",
      url: "https://amzn.to/4aEKLYh",
      imageUrl: "https://m.media-amazon.com/images/I/61solmQSSlL._AC_SL1500_.jpg",
    },
    {
      asin: "B0DQTDMGM6",
      title: "Lacoste Mens Tapered Leg Sweatpants",
      url: "https://amzn.to/4b9fuwQ",
      imageUrl: "https://m.media-amazon.com/images/I/71tYjHqi50L._AC_SY879_.jpg",
    },
    {
      asin: "B0DPXX8BXX",
      title: "The North Face mens Evolution Simple Dome Crew",
      url: "https://amzn.to/3No6nOU",
      imageUrl: "https://m.media-amazon.com/images/I/61+VU7KP2lL._AC_SX679_.jpg",
    },
    {
      asin: "B0F8C6XD6P",
      title: "Samsung Q-SerieSamsungs Soundbar",
      url: "https://amzn.to/4sk5irz",
      imageUrl: "https://m.media-amazon.com/images/I/31GmCRyisJL._AC_SL1000_.jpg",
    },
    {
      asin: "B0DQT5TWFV",
      title: "Lacoste Men's Cable Knit Cotton Sweater",
      url: "https://amzn.to/44Np9Ft",
      imageUrl: "https://m.media-amazon.com/images/I/51dPf3AcG9L._AC_SX679_.jpg",
    },
    {
      asin: "B0CVLD42PD",
      title: "Bose SoundLink Max Bluetooth Speaker",
      url: "https://amzn.to/4aEM75j",
      imageUrl: "https://m.media-amazon.com/images/I/71Ae5OlcXCL._AC_SL1500_.jpg",
    },
    {
      asin: "B0BV17VLYG",
      title: "DEWALT 20V MAX Impact Driver",
      url: "https://amzn.to/45xhUBE",
      imageUrl: "https://m.media-amazon.com/images/I/71WBZC5PeoL._AC_SL1500_.jpg",
    },
    {
      asin: "B09X5DL9S5",
      title: "Roku Streaming Stick 4K",
      url: "https://amzn.to/4smhuIm",
      imageUrl: "https://m.media-amazon.com/images/I/61ihvr7z6CL._AC_SL1500_.jpg",
    },
    {
      asin: "B07WJFS6LH",
      title: "G-Shock GA-2100 Series Watch",
      url: "https://amzn.to/4jmEdzY",
      imageUrl: "https://m.media-amazon.com/images/I/81yNV+5p3oL._AC_SY695_.jpg",
    },
  ];

  return (
    <main className="min-h-screen mx-auto w-full max-w-xl bg-white px-4 py-8 text-center text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-slate-50">
      <h1 className="text-2xl font-semibold">👔 For Him</h1>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Browse gift ideas commonly chosen for men.
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Whether you’re shopping for a partner, family member, or friend, this space is here to help
        spark ideas.
      </p>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        An Amazon affiliate earns from qualifying purchases.
      </p>

      <AmazonProductGrid products={products} />
    </main>
  );
}
