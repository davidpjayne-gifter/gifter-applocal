"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
  durationMs?: number;
  variant?: "success" | "error" | "info";
};

const variantStyles: Record<NonNullable<Props["variant"]>, React.CSSProperties> = {
  success: { background: "rgba(16,185,129,0.95)" },
  error: { background: "rgba(225,29,72,0.95)" },
  info: { background: "rgba(15,23,42,0.95)" },
};

export default function Toast({
  message,
  onClose,
  durationMs = 2000,
  variant = "info",
}: Props) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 90,
        transform: "translateX(-50%)",
        padding: "10px 14px",
        borderRadius: 999,
        background: variantStyles[variant].background,
        color: "white",
        fontWeight: 800,
        fontSize: 13,
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        zIndex: 60,
      }}
    >
      {message}
    </div>
  );
}
