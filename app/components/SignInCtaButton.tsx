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
  preserveNext?: boolean;
};

export default function SignInCtaButton({
  children,
  className,
  style,
  nextPath,
  disabled,
  preserveNext,
}: SignInCtaButtonProps) {
  const router = useRouter();

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined") return;
    event.preventDefault();
    event.stopPropagation();
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const safeNext = safeNextClient(nextPath ?? currentPath);
    const target = preserveNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login";

    router.push(target);
  }, [nextPath, preserveNext, router]);

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
