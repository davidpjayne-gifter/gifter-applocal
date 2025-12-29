import { createClient } from "@supabase/supabase-js";

const supabaseUrl =https://ktytdcsnobuitlailuno.supabase.co;
const supabaseAnonKey =573URuCA3uDhkUh6eVLAdg_8T-vZbHs;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
