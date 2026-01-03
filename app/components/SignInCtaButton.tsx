"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { safeNextClient } from "@/lib/safeNextClient";

type SignInCtaButtonProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  nextPath?: string | null;
  disabled?: boolean;
};

export default function SignInCtaButton({
  children,
  className,
  style,
  nextPath,
  disabled,
}: SignInCtaButtonProps) {
  const router = useRouter();

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined") return;
    event.preventDefault();
    event.stopPropagation();
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const safeNext = safeNextClient(nextPath ?? currentPath);

    router.push(`/login?next=${encodeURIComponent(safeNext)}`);
  }, [nextPath, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
