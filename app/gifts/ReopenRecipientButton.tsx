"use client";

import type { ReactNode } from "react";

type Props = {
  className?: string;
  title?: string;
  children: ReactNode;
};

export default function ReopenRecipientButton({ className, title, children }: Props) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}
