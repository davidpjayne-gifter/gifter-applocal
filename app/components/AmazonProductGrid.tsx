"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type ProductInput = {
  asin: string;
  url: string;
  imageUrl: string;
  title?: string;
};

type AmazonProductGridProps = {
  products: ProductInput[];
};

export default function AmazonProductGrid({ products }: AmazonProductGridProps) {
  const placeholderImage = "/placeholder-gift.png";
  const loggedRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || loggedRef.current) return;
    if (products[0]) {
      console.debug("IMG_DEBUG_FIRST", products[0]);
      loggedRef.current = true;
    }
  }, [products]);

  if (products[0]) {
    console.debug("IMG_DEBUG", products[0]);
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {products.map((product) => {
          const title = product.title?.trim() || "Amazon item";
          const imageSrc = product.imageUrl?.trim() ? product.imageUrl : placeholderImage;

          return (
            <a
              key={product.asin}
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white text-left shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <Image
                  src={imageSrc}
                  alt={title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className={product.imageUrl?.trim() ? "object-cover" : "object-contain p-10"}
                  priority={false}
                />
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
