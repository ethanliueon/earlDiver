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
// Products are consumables (a revive is used up); nothing here is a subscription.

export const PRODUCTS = {
  revive: { id: 'earl.revive.1', fallback: '$0.99', what: 'Revive' },
};

const native = () => (typeof window !== 'undefined' && window.__nativeStore) || null;

// the web's stand-in: a purchase that always succeeds after a beat, an "ad" that is a 3 s card
const TEST = {
  ready: async () => true,
  price: async (id) => (Object.values(PRODUCTS).find((p) => p.id === id) || {}).fallback || '',
  buy: async () => { await new Promise((r) => setTimeout(r, 400)); return { ok: true, test: true }; },
  adReady: async () => true,
  showAd: async () => {
    const el = document.createElement('div'); el.className = 'ad-test';
    el.innerHTML = '<div class="ad-box"><b>Advertisement</b><span>Test ad: no ads on the web build</span><i class="ad-bar"></i></div>';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 3000));
    el.remove(); return { rewarded: true, test: true };
  },
};

const api = () => native() || TEST;
export const isTestStore = () => !native();
export async function priceOf(key) { const P = PRODUCTS[key]; if (!P) return ''; try { return (await api().price(P.id)) || P.fallback; } catch (e) { return P.fallback; } }
export async function buy(key) { const P = PRODUCTS[key]; if (!P) return { ok: false, why: 'unknown' }; try { return await api().buy(P.id); } catch (e) { return { ok: false, why: String(e && e.message || e) }; } }
export async function adReady(placement) { try { return !!(await api().adReady(placement)); } catch (e) { return false; } }
export async function showAd(placement) { try { return await api().showAd(placement); } catch (e) { return { rewarded: false }; } }
