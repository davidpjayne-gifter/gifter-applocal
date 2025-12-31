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
        const form = event.currentTarget.form;
        if (form) {
          form.requestSubmit();
        }
      }}
    >
      {children}
    </button>
  );
}
