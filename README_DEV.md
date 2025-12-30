# GIFTer Dev Notes

## Gift writes must go through the service

All new gift creation paths must call `createGift()` from `lib/services/giftsService.ts`.
This guarantees Free vs Pro enforcement and consistent limit errors.

Before shipping new features, search for any direct inserts:

- `.from("gifts").insert`

If you find one, refactor it to use the service.
