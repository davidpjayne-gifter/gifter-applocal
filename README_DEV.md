# GIFTer Dev Notes

## Gift writes must go through the service

All new gift creation paths must call `createGift()` from `lib/services/giftsService.ts`.
This guarantees Free vs Pro enforcement and consistent limit errors.

Before shipping new features, search for any direct inserts:

- `.from("gifts").insert`

If you find one, refactor it to use the service.

## Auth QA checklist

- Logged out → `/gifts` shows CTA → `/login` sends link → click link → lands in `/gifts`
- Logged in → `/login` redirects to `/gifts`
- Logged in → `/gifts` shows gifts
- Bad `next` values (e.g. `https://evil.com`, `//evil.com`) resolve to `/gifts`
- Works on `https://gifter.skeletonkeysolution.com`
