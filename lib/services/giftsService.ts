import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertCanAddGift, assertCanAddRecipient, FREE_LIMIT_MESSAGE } from "@/lib/entitlements";

export type CreateGiftInput = {
  requestId?: string;
  userId: string;
  listId: string;
  seasonId: string;
  title: string;
  recipientName?: string | null;
  cost: number;
  trackingNumber?: string | null;
};

export type CreateGiftResult = {
  id: string;
  title: string;
  recipient_name: string | null;
  cost: number | null;
  tracking_number: string | null;
  shipping_status: string | null;
  wrapped: boolean | null;
};

export async function createGift(input: CreateGiftInput) {
  try {
    await assertCanAddGift({
      userId: input.userId,
      listId: input.listId,
      seasonId: input.seasonId,
    });

    await assertCanAddRecipient({
      userId: input.userId,
      listId: input.listId,
      seasonId: input.seasonId,
      recipientName: input.recipientName ?? null,
    });
  } catch (err: any) {
    const message = err?.message || FREE_LIMIT_MESSAGE;
    if (err?.name === "LIMIT_REACHED" || message === FREE_LIMIT_MESSAGE) {
      const limitErr = new Error(message);
      limitErr.name = "LIMIT_REACHED";
      throw limitErr;
    }
    throw err;
  }

  const { data: gift, error } = await supabaseAdmin
    .from("gifts")
    .insert([
      {
        title: input.title,
        recipient_name: input.recipientName ?? null,
        cost: input.cost,
        tracking_number: input.trackingNumber ?? null,
        list_id: input.listId,
        season_id: input.seasonId,
        wrapped: false,
      },
    ])
    .select("id,title,recipient_name,cost,tracking_number,shipping_status,wrapped")
    .single<CreateGiftResult>();

  if (error) {
    console.error("[createGift:supabase_error]", {
      requestId: input.requestId ?? null,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
    });
    throw new Error(error.message);
  }

  return gift;
}
