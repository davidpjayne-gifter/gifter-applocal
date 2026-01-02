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
  locked?: boolean;
  lockedMessage?: string;
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
  locked = false,
  lockedMessage = "This season is wrapped. Reopen to edit.",
}: Props) {
  const router = useRouter();

  if (locked) {
    if (triggerVariant === "inline") {
      return <div className="text-xs text-slate-600">{lockedMessage}</div>;
    }
    return null;
  }

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
