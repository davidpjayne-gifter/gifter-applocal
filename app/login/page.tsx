import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safeNext";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

async function getAccessTokenFromCookies() {
  const store = await cookies();
  return (
    store.get("sb-access-token")?.value ??
    store.get("supabase-auth-token")?.value ??
    null
  );
}

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string }> | { next?: string };
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const nextPath = safeNext(typeof searchParams?.next === "string" ? searchParams.next : undefined);
  const token = await getAccessTokenFromCookies();

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      redirect(nextPath);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-10 text-slate-900 dark:text-slate-100">
      <div>
        <Link
          href="/"
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
        >
          ← Back to home
        </Link>
        <h1 className="mt-3 text-2xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          GIFTer is a web app. Enter your email and we’ll send a sign-in link.
        </p>
      </div>

      <LoginForm nextPath={nextPath} />

      <p className="text-sm text-slate-500 dark:text-slate-400">
        🔖 Tip: once you’re signed in, bookmark this page for quick access next time.
      </p>
    </main>
  );
}
