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
  triggerVariant?: "floating" | "inline";
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
  triggerVariant = "floating",
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
      triggerVariant={triggerVariant}
      onAdded={() => router.refresh()}
    />
  );
}
