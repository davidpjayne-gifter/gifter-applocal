import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.https://ktytdcsnobuitlailuno.supabase.co;
const supabaseAnonKey = process.env.sb_publishable_573URuCA3uDhkUh6eVLAdg_8T-vZbHs;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
