import { NextResponse } from "next/server";

type Preview = {
  title: string | null;
  image: string | null;
  finalUrl: string | null;
};

const cache = new Map<string, { data: Preview; ts: number }>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getMetaContent(html: string, property: string) {
  const prop = property.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim() ?? "";

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ title: null, image: null, finalUrl: null });
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < ONE_DAY_MS) {
    return NextResponse.json(cached.data);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    const finalUrl = res.url ?? null;
    const html = await res.text();
    const title = getMetaContent(html, "og:title");
    const image = getMetaContent(html, "og:image");

    const data = { title: title || null, image: image || null, finalUrl };
    cache.set(url, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch {
    const data = { title: null, image: null, finalUrl: null };
    cache.set(url, { data, ts: Date.now() });
    return NextResponse.json(data);
  } finally {
    clearTimeout(timeout);
  }
}
