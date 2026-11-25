# Before release (App Store and Google Play)

Things that must be done before the game is packaged for the stores. Written down now so they are not forgotten.

## Must do before packaging
- **Remove the test shop.** In `js/purchases.js` set `TEST_STORE = false` (the Shop's Test tab gives free cash, pearls,
  chests, items and skills). With it false the tab only shows with `?dev` in the address, which the store app never has.
- **Connect real purchases.** The Pearls tab already sells pearl packs (`PRODUCTS` in `js/purchases.js`: 1,000 for $0.99,
  5,000 for $2.99), but today a stand-in answers that never takes money. The packaged app must register the native store
  bridge (`window.__nativeStore`: StoreKit on iOS, Google Play Billing on Android, e.g. through RevenueCat), create the
  same product ids in App Store Connect and the Play Console, and set the real prices there.
- **Rewarded ads**, if used: the same bridge (AdMob) answers `adReady` / `showAd`.

## Before or after release
- **New redeem codes.** `js/codes.js` holds the codes. Today only WELCOME (10 pearls) is there, as a test. Before (or after)
  release: think up the real codes and what they give. Codes written in the game's code can be read by anyone who unpacks
  the app, and adding one needs an app update; for codes given out over time (events, creators, support), move them to a
  small server the game asks (see "Codes on a server" below).

## Codes on a server (later)
The game would send the typed code to a small web service, which checks it against its list (and how many times it has
been used, by whom) and answers with the reward. Options: a serverless function (Cloudflare Workers, Firebase Functions,
Supabase Edge Functions) on a free or very cheap plan. Apple and Google do not host this; their own "offer codes" only
cover in-app purchases and subscriptions, not free game codes.
