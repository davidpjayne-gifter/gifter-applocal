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
      type="button"
      className={className}
      title={title}
      onClick={(event) => {
        const form = event.currentTarget.closest("form");
        if (form) {
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const form = event.currentTarget.closest("form");
        if (form) {
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.submit();
          }
        }
      }}
    >
      {children}
    </button>
  );
}
