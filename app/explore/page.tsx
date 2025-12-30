import { headers } from "next/headers";
import ExploreClient from "./ExploreClient";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  // ✅ Next.js dynamic API: headers() can be async
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const res = await fetch(`${origin}/api/explore?limit=50`, {
    cache: "no-store",
  });

  const json = await res.json();
  const items = json?.items ?? [];

  return <ExploreClient items={items} />;
}
