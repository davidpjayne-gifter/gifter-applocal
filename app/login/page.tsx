import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { safeNext } from "@/lib/safeNext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

async function getSessionTokensFromCookies() {
  const store = await cookies();
  const accessToken =
    store.get("sb-access-token")?.value ??
    store.get("supabase-auth-token")?.value ??
    null;
  const refreshToken =
    store.get("sb-refresh-token")?.value ??
    store.get("supabase-refresh-token")?.value ??
    null;
  return { accessToken, refreshToken };
}

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string }> | { next?: string };
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const nextPath = safeNext(typeof searchParams?.next === "string" ? searchParams.next : undefined);
  const redirectTo = nextPath || "/";
  const { accessToken, refreshToken } = await getSessionTokensFromCookies();

  if (accessToken && refreshToken) {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!error && data?.user) {
      redirect(redirectTo);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="text-center">
        <Link
          href="/"
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
        >
          ← Back to home
        </Link>
        <h1 className="mt-3 text-2xl font-black">Welcome to GIFTer 🎁</h1>
        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Done GIFTing, stress-free.
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Send yourself a magic link. No password. Takes about 10 seconds.
        </p>
      </div>

      <div className="w-full">
        <LoginForm nextPath={nextPath} />
      </div>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Tip: After you’re in, bookmark GIFTer for next time ✨
      </p>
    </main>
  );
}
