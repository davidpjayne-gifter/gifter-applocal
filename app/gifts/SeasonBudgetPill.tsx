"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/toast";
import { supabase } from "@/lib/supabase";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Props = {
  seasonId: string;
  totalSpent: number;
  initialBudget: number | null;
};

export default function SeasonBudgetPill({ seasonId, totalSpent, initialBudget }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const safeSeasonId = (typeof seasonId === "string" ? seasonId : "").trim();
  const seasonIdValid =
    safeSeasonId.length > 0 &&
    safeSeasonId !== "undefined" &&
    safeSeasonId !== "null" &&
    isUuid(safeSeasonId);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(
    initialBudget === null || typeof initialBudget !== "number" ? "" : String(initialBudget)
  );
  const [saving, setSaving] = useState(false);

  const parsedBudget = useMemo<number | null>(() => {
    const v = value.trim();
    if (v === "") return null; // empty means "no number entered"
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return NaN as any;
    return n;
  }, [value]);

  const budgetIsInvalid = useMemo(() => {
    return value.trim() !== "" && !Number.isFinite(parsedBudget as number);
  }, [value, parsedBudget]);

  const canSave = useMemo(() => {
    if (!seasonIdValid) return false;
    if (saving) return false;
    return typeof parsedBudget === "number" && Number.isFinite(parsedBudget);
  }, [parsedBudget, saving, seasonIdValid]);

  const delta = useMemo(() => {
    if (initialBudget === null || typeof initialBudget !== "number") return null;
    return initialBudget - totalSpent;
  }, [initialBudget, totalSpent]);

  async function save(next: number | null) {
    // 🔒 Absolute guard: never call the API unless we have a real UUID
    if (!seasonIdValid) {
      toast.error("Season ID missing or invalid. Please refresh and try again.");
      return;
    }

    // validate budget if not clearing
    if (next !== null) {
      if (!Number.isFinite(next) || next < 0) {
        toast.error("Please enter a valid budget (0 or higher).");
        return;
      }
    }

    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Please sign in first.");
      }

      const res = await fetch(`/api/seasons/${safeSeasonId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ budget: next }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save budget");

      setEditing(false);
      toast.success("Budget saved.");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {!editing ? (
        <button
          onClick={() => {
            if (!seasonIdValid) {
              toast.error("Season ID missing or invalid. Please refresh and try again.");
              return;
            }
            setEditing(true);
          }}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            fontWeight: 900,
            background: "#fff",
            cursor: seasonIdValid ? "pointer" : "not-allowed",
            opacity: seasonIdValid ? 1 : 0.55,
          }}
          title={seasonIdValid ? "Click to set/edit budget" : "Season ID missing/invalid"}
        >
          Budget: {initialBudget === null ? "Set" : money(initialBudget)}
        </button>
      ) : (
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            fontWeight: 900,
            background: "#fff",
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>Budget:</span>
          <span style={{ fontWeight: 900 }}>$</span>

          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 250"
            style={{
              width: 90,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "3px 6px",
              fontSize: 12,
              fontWeight: 800,
            }}
            disabled={saving}
          />

          <button
            onClick={() => {
              if (!canSave) return;
              save(parsedBudget as number);
            }}
            disabled={!canSave}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 10,
              padding: "3px 8px",
              fontSize: 12,
              fontWeight: 900,
              cursor: !canSave ? "not-allowed" : "pointer",
              opacity: !canSave ? 0.5 : 1,
            }}
            title={
              !seasonIdValid
                ? "Season not ready"
                : budgetIsInvalid
                  ? "Enter a valid number"
                  : "Save"
            }
          >
            Save
          </button>

          <button
            onClick={() => {
              setEditing(false);
              setValue(initialBudget === null ? "" : String(initialBudget));
            }}
            disabled={saving}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 12,
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 0.8,
            }}
            title="Cancel"
          >
            ✕
          </button>

          <button
            onClick={() => save(null)}
            disabled={saving || !seasonIdValid}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 12,
              fontWeight: 900,
              cursor: saving || !seasonIdValid ? "not-allowed" : "pointer",
              opacity: saving || !seasonIdValid ? 0.5 : 0.75,
              marginLeft: 4,
            }}
            title="Clear budget"
          >
            Clear
          </button>

          {budgetIsInvalid && (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Enter a valid number</span>
          )}
        </div>
      )}

      {initialBudget !== null && delta !== null && (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid",
            fontSize: 12,
            fontWeight: 900,
            background: "#fff",
            borderColor: delta >= 0 ? "#bbf7d0" : "#fecaca",
          }}
          title={delta >= 0 ? "Left to spend" : "Over budget"}
        >
          {delta >= 0 ? `Left: ${money(delta)}` : `Over: ${money(Math.abs(delta))}`}
        </span>
      )}
    </div>
  );
}
