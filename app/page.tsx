import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HomeClient from "./HomeClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value ?? null;

  if (!token) {
    redirect("/login?next=/");
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    redirect("/login?next=/");
  }

  return <HomeClient />;
}
