"use client";

import { useRouter } from "next/navigation";
import AddGiftForm from "./AddGiftForm";

export default function RefreshAfterAdd() {
  const router = useRouter();

  return (
    <AddGiftForm
      onAdded={() => {
        router.refresh();
      }}
    />
  );
}
