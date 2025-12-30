"use client";

import { useRouter } from "next/navigation";
import AddGiftForm from "./AddGiftForm";

type Props = {
  listId: string;
  seasonId: string;
  recipientName?: string | null;
  isPro: boolean;
  giftsUsed: number;
  recipientsUsed: number;
  freeGiftLimit: number;
  freeRecipientLimit: number;
  existingRecipientKeys: string[];
};

export default function RefreshAfterAdd({
  listId,
  seasonId,
  recipientName = null,
  isPro,
  giftsUsed,
  recipientsUsed,
  freeGiftLimit,
  freeRecipientLimit,
  existingRecipientKeys,
}: Props) {
  const router = useRouter();

  return (
    <AddGiftForm
      listId={listId}
      seasonId={seasonId}
      recipientName={recipientName}
      isPro={isPro}
      giftsUsed={giftsUsed}
      recipientsUsed={recipientsUsed}
      freeGiftLimit={freeGiftLimit}
      freeRecipientLimit={freeRecipientLimit}
      existingRecipientKeys={existingRecipientKeys}
      onAdded={() => router.refresh()}
    />
  );
}
