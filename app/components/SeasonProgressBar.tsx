"use client";

import { useEffect, useState } from "react";

type Props = {
  completed: number;
  total: number;
  size?: "default" | "compact";
};

export default function SeasonProgressBar({ completed, total, size = "default" }: Props) {
  const safeTotal = Math.max(total, 1);
  const percent = Math.round((completed / safeTotal) * 100);
  const [width, setWidth] = useState(0);
  const heightClass = size === "compact" ? "h-1.5" : "h-2";
  const fillClass =
    size === "compact" ? "bg-blue-600 dark:bg-blue-400" : "bg-emerald-500 dark:bg-emerald-400";

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setWidth(percent);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [percent]);

  return (
    <div className="w-full">
      <div className={`w-full rounded-full bg-slate-200 dark:bg-slate-800 ${heightClass}`}>
        <div
          className={`rounded-full ${fillClass} ${heightClass} transition-[width] duration-300 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
