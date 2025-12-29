"use client";

import { useRouter } from "next/navigation";
import AddGiftForm from "./AddGiftForm";

type Props = {
  listId: string;
  seasonId: string;
  recipientName?: string | null;
};

export default function RefreshAfterAdd({
  listId,
  seasonId,
  recipientName = null,
}: Props) {
  const router = useRouter();

  return (
    <AddGiftForm
      listId={listId}
      seasonId={seasonId}
      recipientName={recipientName}
      onAdded={() => router.refresh()}
    />
  );
}
