// (6.5.9) Purchases and rewarded ads, behind one small door. The game asks this module for a product or an ad and gets
// a promise back; it never knows what answers. In the packaged app a native bridge answers (StoreKit / Google Play
// Billing through RevenueCat, rewarded video through AdMob), registered on window.__nativeStore by the app shell. On
// the web there is no such bridge: a stand-in answers so the game can be built and tested now. The stand-in never
// takes money and its "ad" is a short still card; it is marked as a test everywhere it shows.
//
// What the bridge must offer (all promise-based):
//   ready()                       -> true once products are loaded
//   price(productId)              -> the store's own price string for the player's country, e.g. "$0.99", "0,99 €"
//   buy(productId)                -> { ok: true } once paid and delivered, { ok: false, why } if cancelled or failed
//   adReady(placement)            -> true when a rewarded video is loaded
//   showAd(placement)             -> { rewarded: true } when watched to the end, { rewarded: false } when skipped or failed
//
// Products are consumables; nothing here is a subscription. (7.3.9) none yet: the revive is paid in pearls.

export const PRODUCTS = {
};

const native = () => (typeof window !== 'undefined' && window.__nativeStore) || null;

// (7.4.13) the stand-in until the app's store is connected: a purchase that always succeeds after a beat, an "ad" that is a 3 s card
const TEST = {
  ready: async () => true,
  price: async (id) => (Object.values(PRODUCTS).find((p) => p.id === id) || {}).fallback || '',
  buy: async () => { await new Promise((r) => setTimeout(r, 400)); return { ok: true, test: true }; },
  adReady: async () => true,
  showAd: async () => {
    const el = document.createElement('div'); el.className = 'ad-test';
    el.innerHTML = '<div class="ad-box"><b>Advertisement</b><span>Test ad: no store connected</span><i class="ad-bar"></i></div>';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 3000));
    el.remove(); return { rewarded: true, test: true };
  },
};

const api = () => native() || TEST;
// (7.4.13, owner) the game is phone-only: no web build. The shop's Test tab (free cash, items, resets) shows only with
// ?dev in the address, which the App Store app never has; for the owner's own testing
// (7.4.26, owner) the Test tab back for everyone while the game is in testing. Set TEST_STORE to false for the
// App Store build (then only ?dev shows it)
export const TEST_STORE = true;
export const isTestStore = () => TEST_STORE || (typeof location !== 'undefined' && /[?&]dev\b/.test(location.search));
export async function priceOf(key) { const P = PRODUCTS[key]; if (!P) return ''; try { return (await api().price(P.id)) || P.fallback; } catch (e) { return P.fallback; } }
export async function buy(key) { const P = PRODUCTS[key]; if (!P) return { ok: false, why: 'unknown' }; try { return await api().buy(P.id); } catch (e) { return { ok: false, why: String(e && e.message || e) }; } }
export async function adReady(placement) { try { return !!(await api().adReady(placement)); } catch (e) { return false; } }
export async function showAd(placement) { try { return await api().showAd(placement); } catch (e) { return { rewarded: false }; } }
