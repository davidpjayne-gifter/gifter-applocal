import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type GiftList = {
  id: string;
  owner_id: string;
};

export async function getOrCreateCurrentList(userId: string) {
  const { data: existing, error } = await supabaseAdmin
    .from("gift_lists")
    .select("id, owner_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (existing?.id) {
    return existing as GiftList;
  }

  const { data: created, error: createErr } = await supabaseAdmin
    .from("gift_lists")
    .insert({ owner_id: userId })
    .select("id, owner_id")
    .single();

  if (createErr) {
    throw new Error(createErr.message);
  }

  return created as GiftList;
}
