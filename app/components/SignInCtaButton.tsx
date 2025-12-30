"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { safeNextClient } from "@/lib/safeNextClient";

type SignInCtaButtonProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  nextPath?: string | null;
};

export default function SignInCtaButton({
  children,
  className,
  style,
  nextPath,
}: SignInCtaButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const safeNext = safeNextClient(nextPath ?? currentPath);

    router.push(`/login?next=${encodeURIComponent(safeNext)}`);
  }, [nextPath, router]);

  return (
    <button type="button" onClick={handleClick} className={className} style={style}>
      {children}
    </button>
  );
}
