"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import SignInCtaButton from "@/app/components/SignInCtaButton";
import { openStripePortal } from "@/lib/stripeClient";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/toast";
import { safeFetchJson } from "@/app/lib/safeFetchJson";

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
  is_wrapped_up: boolean | null;
  wrapped_up_at: string | null;
  peopleCount: number;
  giftsCount: number;
};

type Props = {
  initialProfile: Profile | null;
  initialDevices: Device[];
  initialPastSeasons: Season[];
  listId: string;
  onReopenSeason: (formData: FormData) => void;
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

export default function SettingsClient({
  initialProfile,
  initialDevices,
  initialPastSeasons,
  listId,
  onReopenSeason,
}: Props) {
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
    if (profile?.subscription_status === "trialing") return "Trialing";
    if (profile?.subscription_status === "active") return "Pro";
    if (profile?.is_pro) return "Pro";
    if (profile?.subscription_status === "canceled") return "Canceled";
    return "Free";
  }, [profile]);

  const showManageBilling =
    profile?.is_pro ||
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing" ||
    profile?.subscription_status === "past_due";

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const result = await safeFetchJson("/api/settings", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!active) return;

      if (!result.ok || !(result.json as any)?.profile) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[settings] fallback to free tier");
        }
        setCheckedSession(true);
        setInitialLoading(false);
        return;
      }

      if (result.text) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[settings] non-json response");
        }
        setCheckedSession(true);
        setInitialLoading(false);
        return;
      }

      setProfile((result.json as any).profile);
      setDevices((result.json as any).devices ?? []);
      setName((result.json as any).profile.name ?? "");
      setCheckedSession(true);
      setInitialLoading(false);
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

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
      const result = await safeFetchJson("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!result.ok) {
        const message =
          (result.json as any)?.error?.message ||
          (result.json as any)?.error ||
          "Something went wrong.";
        toast.error(message);
        setBillingError(message);
        setBillingLoading(false);
        return;
      }

      if (result.text) {
        toast.error("Something went wrong.");
        setBillingError("Something went wrong.");
        setBillingLoading(false);
        return;
      }

      if ((result.json as any)?.url) {
        window.location.href = String((result.json as any).url);
        return;
      }

      toast.error("Stripe did not return a checkout URL.");
      setBillingError("Stripe did not return a checkout URL.");
      setBillingLoading(false);
    } catch (err: any) {
      const message = err?.message || "Unable to start checkout.";
      toast.error(message);
      setBillingError(message);
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
    const result = await safeFetchJson("/api/auth/session", { method: "DELETE" });
    if (!result.ok) {
      const message =
        (result.json as any)?.error?.message ||
        (result.json as any)?.error ||
        "Something went wrong.";
      toast.error(message);
    } else if (result.text) {
      toast.error("Something went wrong.");
    }
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

    const result = await safeFetchJson("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!result.ok) {
      const message =
        (result.json as any)?.error?.message ||
        (result.json as any)?.error ||
        "Something went wrong.";
      toast.error(message);
      setDangerError(message);
      setDeleteLoading(false);
      return;
    }

    if (result.text) {
      toast.error("Something went wrong.");
      setDangerError("Something went wrong.");
      setDeleteLoading(false);
      return;
    }

    await supabase.auth.signOut();
    const signOutResult = await safeFetchJson("/api/auth/session", { method: "DELETE" });
    if (!signOutResult.ok) {
      const message =
        (signOutResult.json as any)?.error?.message ||
        (signOutResult.json as any)?.error ||
        "Something went wrong.";
      toast.error(message);
    } else if (signOutResult.text) {
      toast.error("Something went wrong.");
    }
    router.push("/");
    router.refresh();
  }

  if (initialLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800">
          <h1 className="text-xl font-black text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Loading your settings...
          </p>
        </div>
      </div>
    );
  }

  if (!profile && checkedSession) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800">
          <h1 className="text-xl font-black text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please sign in to view your settings.
          </p>
          <SignInCtaButton className="mt-4 inline-flex items-center justify-center rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-blue-400 dark:border-blue-700">
            Go to sign in
          </SignInCtaButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link
        href="/gifts"
        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-600"
      >
        Back to my GIFTs
      </Link>
      <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Settings</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Manage your account, billing, and devices.
      </p>

      <div className="mt-8 grid gap-6">
        {showManageBilling && (
          <section className="rounded-2xl border border-blue-200/60 bg-blue-50/50 p-6 shadow-sm dark:border-blue-800/50 dark:bg-blue-900/20">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
              🎉 You’re Pro!
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Enjoy stress-free GIFTing with all features unlocked.
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>💎</span>
              <span>Pro Member</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Active subscription
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
              <div>🎁 Unlimited gifts</div>
              <div>📦 Tracking & gift details</div>
              <div>📊 Full season insights</div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Account</h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Email
              <input
                id="settings-email"
                name="email"
                value={profile?.email ?? ""}
                readOnly
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-zinc-800"
              />
            </label>

            <label className="text-sm text-slate-700">
              Name
              <input
                id="settings-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-zinc-800"
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Plan & Billing</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-zinc-800">
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
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-zinc-800"
              >
                {portalLoading ? "Opening portal..." : "Manage Billing"}
              </button>
            )}
          </div>

          {billingError && (
            <div className="mt-3 text-sm text-rose-600">{billingError}</div>
          )}

          <div className="mt-4 text-xs text-slate-500">
            Billing powered by Stripe.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Devices</h2>
            <span className="text-xs font-semibold text-slate-600">
              {devices.length}/{DEVICE_LIMIT}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Active devices (2 max).
          </p>

          <div className="mt-4 divide-y divide-slate-200 dark:divide-zinc-800">
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
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-zinc-800 dark:hover:border-zinc-700"
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

        <section
          id="past-seasons"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Past Seasons</h2>
            <span className="text-xs font-semibold text-slate-600">
              {pastSeasons.length}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">View previous seasons.</p>

          <div className="mt-4 divide-y divide-slate-200 dark:divide-zinc-800">
            {pastSeasons.length === 0 && (
              <div className="py-3 text-sm text-slate-500">No past seasons yet.</div>
            )}

            {pastSeasons.map((season) => (
              <div key={season.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{season.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Wrapped ✅ • People {season.peopleCount} • Gifts {season.giftsCount}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/gifts?seasonId=${season.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    View
                  </Link>
                  <form action={onReopenSeason}>
                    <input type="hidden" name="seasonId" value={season.id} />
                    <input type="hidden" name="listId" value={listId} />
                    <button
                      type="submit"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                    >
                      Reopen
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm dark:border-rose-900">
          <h2 className="text-lg font-bold text-rose-700">Danger Zone</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 dark:border-zinc-700"
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
