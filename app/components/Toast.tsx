"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
  durationMs?: number;
};

export default function Toast({ message, onClose, durationMs = 2000 }: Props) {
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
        background: "rgba(15,23,42,0.95)",
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
