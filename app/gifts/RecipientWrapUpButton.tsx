"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";

type Props = {
  disabled: boolean;
  label: string;
  confirmText: string;
  autoWrap?: boolean;
  totalGifts?: number;
  wrappedCount?: number;
};

type ConfettiPiece = {
  x: number;
  y: number;
  rotate: number;
  delay: number;
  color: string;
};

const CONFETTI_PIECES: ConfettiPiece[] = [
  { x: -70, y: -90, rotate: -20, delay: 0, color: "#f87171" },
  { x: -40, y: -110, rotate: 15, delay: 60, color: "#60a5fa" },
  { x: -10, y: -95, rotate: -8, delay: 120, color: "#34d399" },
  { x: 20, y: -115, rotate: 22, delay: 80, color: "#fbbf24" },
  { x: 50, y: -100, rotate: -14, delay: 140, color: "#a78bfa" },
  { x: 75, y: -85, rotate: 10, delay: 200, color: "#fb7185" },
  { x: -55, y: -60, rotate: 18, delay: 160, color: "#38bdf8" },
  { x: -25, y: -70, rotate: -24, delay: 220, color: "#f472b6" },
  { x: 5, y: -65, rotate: 12, delay: 260, color: "#22d3ee" },
  { x: 35, y: -80, rotate: -6, delay: 300, color: "#facc15" },
  { x: 60, y: -60, rotate: 20, delay: 240, color: "#4ade80" },
  { x: 90, y: -75, rotate: -18, delay: 280, color: "#c084fc" },
];

export default function RecipientWrapUpButton({
  disabled,
  label,
  confirmText,
  autoWrap = false,
  totalGifts = 0,
  wrappedCount = 0,
}: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [autoWrapping, setAutoWrapping] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState<{ x: number; y: number } | null>(null);
  const autoWrapTimerRef = useRef<number | null>(null);

  function submitForm() {
    const form = btnRef.current?.form;
    if (form) {
      form.requestSubmit();
    }
  }

  useEffect(() => {
    return () => {
      if (autoWrapTimerRef.current) {
        window.clearTimeout(autoWrapTimerRef.current);
        autoWrapTimerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled || autoWrapping}
        onClick={() => {
          if (disabled || autoWrapping) return;
          if (autoWrap && totalGifts > 0 && wrappedCount < totalGifts) {
            const rect = btnRef.current?.getBoundingClientRect();
            if (rect) {
              setConfettiOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }
            setAutoWrapping(true);
            autoWrapTimerRef.current = window.setTimeout(() => {
              submitForm();
              setAutoWrapping(false);
              setConfettiOrigin(null);
              autoWrapTimerRef.current = null;
            }, 1500);
            return;
          }
          setConfirmOpen(true);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-zinc-800 dark:hover:border-zinc-700"
        title={disabled ? "Add a gift first" : "Wrap all gifts + collapse this person"}
      >
        {label}
      </button>

      {autoWrapping && confettiOrigin && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-50 h-0 w-0"
          style={{
            transform: `translate(${confettiOrigin.x}px, ${confettiOrigin.y}px)`,
            pointerEvents: "none",
          }}
        >
          <style>{`
            @keyframes gifter-confetti-fall {
              0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
              100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--rot)); }
            }
          `}</style>
          {CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={`${piece.x}-${piece.y}-${idx}`}
              style={{
                position: "absolute",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: piece.color,
                animation: `gifter-confetti-fall 1.5s ease-out ${piece.delay}ms forwards`,
                transform: "translate(0, 0)",
                ["--x" as any]: `${piece.x}px`,
                ["--y" as any]: `${piece.y}px`,
                ["--rot" as any]: `${piece.rotate}deg`,
              }}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Wrap up this recipient?"
        description={confirmText}
        confirmText="Wrap up"
        cancelText="Cancel"
        variant="success"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          submitForm();
        }}
      />
    </>
  );
}
