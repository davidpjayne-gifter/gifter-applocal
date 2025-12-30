import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  is_pro: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type Device = {
  id: string;
  user_id: string;
  device_label: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

async function getAccessTokenFromCookies() {
  const store = await cookies();
  return (
    store.get("sb-access-token")?.value ??
    store.get("supabase-auth-token")?.value ??
    null
  );
}

export default async function SettingsPage() {
  const token = await getAccessTokenFromCookies();

  let profile: Profile | null = null;
  let devices: Device[] = [];

  if (token) {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (!userErr && userData?.user) {
      const userId = userData.user.id;

      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select(
          "id,email,name,is_pro,subscription_status,current_period_end,stripe_customer_id,stripe_subscription_id"
        )
        .eq("id", userId)
        .maybeSingle();

      profile = profileData
        ? {
            ...profileData,
            email: profileData.email ?? userData.user.email ?? null,
          }
        : {
            id: userId,
            email: userData.user.email ?? null,
            name: null,
            is_pro: false,
            subscription_status: null,
            current_period_end: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
          };

      const { data: deviceData } = await supabaseAdmin
        .from("user_devices")
        .select("id,user_id,device_label,last_seen_at,created_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false });

      devices = deviceData ?? [];
    }
  }

  return <SettingsClient initialProfile={profile} initialDevices={devices} />;
}
