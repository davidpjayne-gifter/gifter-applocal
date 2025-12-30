import { cookies, headers } from "next/headers";
import ExploreClient from "./ExploreClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreateCurrentList } from "@/lib/currentList";

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

  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value ?? null;
  let listId: string | null = null;

  if (token) {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (!userErr && userData?.user?.id) {
      const list = await getOrCreateCurrentList(userData.user.id);
      listId = list.id;
    }
  }

  return <ExploreClient items={items} listId={listId} />;
}
