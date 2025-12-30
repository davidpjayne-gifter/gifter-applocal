"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import SignInCtaButton from "@/app/components/SignInCtaButton";
import { openStripePortal } from "@/lib/stripeClient";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/toast";

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

type Season = {
  id: string;
  name: string;
  list_id: string;
  is_active: boolean;
  created_at: string | null;
};

type Props = {
  initialProfile: Profile | null;
  initialDevices: Device[];
  initialPastSeasons: Season[];
};

const DEVICE_LIMIT = 2;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

export default function SettingsClient({ initialProfile, initialDevices, initialPastSeasons }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [pastSeasons] = useState<Season[]>(initialPastSeasons);
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [initialLoading, setInitialLoading] = useState(!initialProfile);
  const [checkedSession, setCheckedSession] = useState(Boolean(initialProfile));

  const [accountLoading, setAccountLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deviceLoadingId, setDeviceLoadingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [accountError, setAccountError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [dangerError, setDangerError] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Device | null>(null);

  const planLabel = useMemo(() => {
    if (!profile) return "Free";
    if (profile?.subscription_status === "past_due") return "Past due";
    if (profile?.is_pro) return "Pro";
    if (profile?.subscription_status === "canceled") return "Canceled";
    return "Free";
  }, [profile]);

  const showManageBilling =
    profile?.is_pro || profile?.subscription_status === "past_due";

  useEffect(() => {
    if (profile) {
      setInitialLoading(false);
      setCheckedSession(true);
      return;
    }

    let active = true;

    async function loadInitialData() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        if (!active) return;
        setCheckedSession(true);
        setInitialLoading(false);
        return;
      }

      const res = await fetch("/api/settings", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => null);

      if (!active) return;

      if (!res.ok || !json?.profile) {
        setCheckedSession(true);
        setInitialLoading(false);
        return;
      }

      setProfile(json.profile);
      setDevices(json.devices ?? []);
      setName(json.profile.name ?? "");
      setCheckedSession(true);
      setInitialLoading(false);
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [profile]);

  async function getAccessToken(onError: (message: string) => void) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      onError("Please sign in first.");
      return null;
    }
    return token;
  }

  async function handleSaveName() {
    if (!profile) return;
    setAccountLoading(true);
    setAccountError("");

    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", profile.id);

    if (error) {
      setAccountLoading(false);
      setAccountError(error.message || "Unable to save name.");
      return;
    }

    setProfile({ ...profile, name });
    setAccountLoading(false);
  }

  async function handleUpgrade() {
    setBillingLoading(true);
    setBillingError("");

    const token = await getAccessToken(setBillingError);
    if (!token) {
      setBillingLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setBillingError(json?.error || "Unable to start checkout.");
        setBillingLoading(false);
        return;
      }

      if (json?.url) {
        window.location.href = json.url;
        return;
      }

      setBillingError("Stripe did not return a checkout URL.");
      setBillingLoading(false);
    } catch (err: any) {
      setBillingError(err?.message || "Unable to start checkout.");
      setBillingLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setBillingError("");

    const token = await getAccessToken(setBillingError);
    if (!token) {
      setPortalLoading(false);
      return;
    }

    try {
      await openStripePortal(token);
    } catch (err: any) {
      setBillingError(err?.message || "Unable to open billing portal.");
      setPortalLoading(false);
    }
  }

  async function handleRevokeDevice(deviceId: string) {
    setDeviceLoadingId(deviceId);

    const { error } = await supabase.from("user_devices").delete().eq("id", deviceId);

    if (error) {
      setDeviceLoadingId(null);
      toast.error(error.message || "Unable to revoke device.");
      return;
    }

    setDevices((prev) => prev.filter((device) => device.id !== deviceId));
    setDeviceLoadingId(null);
    toast.success("Device revoked.");
  }

  async function handleSignOut() {
    setDangerError("");
    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDangerError("");

    const token = await getAccessToken(setDangerError);
    if (!token) {
      setDeleteLoading(false);
      return;
    }

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setDangerError(json?.error || "Unable to delete account.");
      setDeleteLoading(false);
      return;
    }

    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  if (initialLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">Loading your settings...</p>
        </div>
      </div>
    );
  }

  if (!profile && checkedSession) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please sign in to view your settings.
          </p>
          <SignInCtaButton className="mt-4 inline-flex items-center justify-center rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-blue-400">
            Go to sign in
          </SignInCtaButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-black text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-600">
        Manage your account, billing, and devices.
      </p>

      <div className="mt-8 grid gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Account</h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Email
              <input
                value={profile?.email ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </label>

            <label className="text-sm text-slate-700">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                placeholder="Your name"
              />
            </label>
          </div>

          {accountError && (
            <div className="mt-3 text-sm text-rose-600">{accountError}</div>
          )}

          <button
            type="button"
            onClick={handleSaveName}
            disabled={accountLoading}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {accountLoading ? "Saving..." : "Save"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Plan & Billing</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {planLabel}
            </span>
          </div>

          <div className="mt-4 text-sm text-slate-700">
            Renewal date: <span className="font-semibold">{formatDate(profile?.current_period_end)}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {!showManageBilling && (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={billingLoading}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {billingLoading ? "Opening checkout..." : "Upgrade to Pro"}
              </button>
            )}

            {showManageBilling && (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {portalLoading ? "Opening portal..." : "Manage Billing"}
              </button>
            )}
          </div>

          {billingError && (
            <div className="mt-3 text-sm text-rose-600">{billingError}</div>
          )}

          <div className="mt-4 text-xs text-slate-500">Billing powered by Stripe.</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Devices</h2>
            <span className="text-xs font-semibold text-slate-600">
              {devices.length}/{DEVICE_LIMIT}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">Active devices (2 max).</p>

          <div className="mt-4 divide-y divide-slate-200">
            {devices.length === 0 && (
              <div className="py-3 text-sm text-slate-500">No devices found.</div>
            )}

            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {device.device_label || "Unknown device"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Last seen: {formatDateTime(device.last_seen_at || device.created_at)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRevokeTarget(device)}
                  disabled={deviceLoadingId === device.id}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {deviceLoadingId === device.id ? "Revoking..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>

          {devices.length >= DEVICE_LIMIT && (
            <div className="mt-3 text-xs text-slate-500">
              You have reached the device limit. Revoke one to add another.
            </div>
          )}

        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Past Seasons</h2>
            <span className="text-xs font-semibold text-slate-600">
              {pastSeasons.length}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">View previous seasons.</p>

          <div className="mt-4 divide-y divide-slate-200">
            {pastSeasons.length === 0 && (
              <div className="py-3 text-sm text-slate-500">No past seasons yet.</div>
            )}

            {pastSeasons.map((season) => (
              <div key={season.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{season.name}</div>
                  <div className="text-xs text-slate-500">
                    Created: {formatDate(season.created_at)}
                  </div>
                </div>
                <Link
                  href={`/gifts?season=${season.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-rose-700">Danger Zone</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Sign out
            </button>

            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="rounded-xl border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Delete account
            </button>
          </div>

          {dangerError && (
            <div className="mt-3 text-sm text-rose-600">{dangerError}</div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete your account?"
        description="This permanently deletes your profile, devices, and access. This action can’t be undone."
        confirmText="Delete account"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke device?"
        description={
          revokeTarget
            ? `Remove access for ${revokeTarget.device_label || "this device"}?`
            : undefined
        }
        confirmText="Revoke"
        cancelText="Cancel"
        variant="danger"
        loading={Boolean(revokeTarget && deviceLoadingId === revokeTarget.id)}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) {
            handleRevokeDevice(revokeTarget.id);
            setRevokeTarget(null);
          }
        }}
      />
    </div>
  );
}
