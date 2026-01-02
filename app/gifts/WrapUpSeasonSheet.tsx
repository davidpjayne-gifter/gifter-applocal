"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  listId: string;
  seasonId: string;
  isWrapped: boolean;
  onWrap: (formData: FormData) => void;
  onReopen: (formData: FormData) => void;
};

export default function WrapUpSeasonSheet({ listId, seasonId, isWrapped, onWrap, onReopen }: Props) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!open || !sheetRef.current) return;
    const node = sheetRef.current;
    const raf = window.requestAnimationFrame(() => {
      node.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  const title = isWrapped ? "Reopen this season?" : "Wrap up this season?";
  const body = isWrapped
    ? "This will let you keep adding and updating gifts in this season."
    : "This marks the season as complete. You can still view it, and you can reopen it later.";
  const confirmLabel = isWrapped ? "Reopen Season" : "Wrap Up Season";
  const cancelLabel = isWrapped ? "Keep Wrapped" : "Leave Open";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {isWrapped && (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Season Wrapped ✅
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center text-blue-600 hover:bg-blue-50"
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {isWrapped ? "Reopen Season" : "Wrap Up Season"}
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(6px)",
            zIndex: 40,
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 220ms ease",
        }}
      >
        <div
          ref={sheetRef}
          className="bg-white text-gray-900"
          style={{
            maxWidth: 520,
            margin: "0 auto",
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            border: "1px solid #e2e8f0",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.12)",
            padding: 16,
          }}
        >
          <div className="text-gray-900" style={{ fontSize: 16, fontWeight: 900 }}>
            {title}
          </div>
          <div className="text-gray-700" style={{ marginTop: 8, fontSize: 13 }}>
            {body}
          </div>

          <form
            ref={actionRef}
            action={isWrapped ? onReopen : onWrap}
            className="m-0"
          >
            <input type="hidden" name="seasonId" value={seasonId} />
            <input type="hidden" name="listId" value={listId} />
            <button type="submit" style={{ display: "none" }} />
          </form>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                actionRef.current?.requestSubmit();
                setOpen(false);
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
