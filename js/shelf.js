// (7.6.2, owner) the shop's pearl pages: the scroll shelf, coins for pearls, and pearl packs (docs/PLAN_SKILLS.md).
// Pearls are a fuel spent every day; every price here is the same for every player (never scaled by the hidden level).
import { ITEMS, RARITY } from './items.js';
import { ALL_ABILITIES, abilityOf } from './abilities.js';

const H12 = 12 * 3600e3;
export const SHELF_SLOTS = 3, RESTOCK_PEARLS = 50;
const ROLL = [['rare', 0.8], ['exotic', 0.15], ['legendary', 0.05]];
// a scroll's place on the shelf and in the sale: hybrids 250 / 750 / 2,000; pure families about 1.6 times that; the
// specials (one rarity only) at the legendary price; mythicals never on the shelf
const BASE = { rare: 250, exotic: 750, legendary: 2000 };
export const isPure = (id) => { const A = abilityOf(id); return !!(A && A.pure); };
export const isSpecial = (id) => { const A = abilityOf(id); return !!(A && A.special); };
export function shelfPrice(id) {
  const it = ITEMS[id]; if (!it) return 0;
  if (isSpecial(id)) return BASE.legendary;
  const b = BASE[it.rarity] || 0; return isPure(id) ? Math.round(b * 1.6 / 10) * 10 : b;
}
// selling a scroll back: a quarter of its shelf price, in pearls (a mythical 1,500)
export const scrollSellPearls = (id) => { const it = ITEMS[id]; if (!it) return 0; return it.rarity === 'mythical' ? 1500 : Math.round(shelfPrice(id) / 4); };

function roll() {
  let r = Math.random(), tier = 'rare'; for (const [t, p] of ROLL) { if (r < p) { tier = t; break; } r -= p; }
  // every family of that rarity can come up; a pure one a third as likely; a special one only at its own rarity
  const pool = ALL_ABILITIES.filter((id) => ITEMS[id] && ITEMS[id].rarity === tier && !(abilityOf(id) || {}).hidden && !(abilityOf(id) || {}).event);
  if (!pool.length) return null;
  const w = pool.map((id) => (isPure(id) ? 1 / 3 : 1)), sum = w.reduce((a, b) => a + b, 0); let q = Math.random() * sum;
  for (let i = 0; i < pool.length; i++) { q -= w[i]; if (q <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
// the shelf: three scrolls, each on its own 12-hour clock (from when it was put there)
export function shelfOf(P, now = Date.now()) {
  const S = P.shelf || (P.shelf = { slots: [] });
  for (let i = 0; i < SHELF_SLOTS; i++) { const s = S.slots[i]; if (!s || now - s.at >= H12) S.slots[i] = { id: roll(), at: now, sold: false }; }
  return S;
}
export function restock(P, now = Date.now()) { const S = shelfOf(P, now); for (let i = 0; i < SHELF_SLOTS; i++) S.slots[i] = { id: roll(), at: now, sold: false }; return S; }
export const slotLeft = (s, now = Date.now()) => Math.max(0, H12 - (now - s.at));

// coins for pearls: three offers, and a daily deal once a day
export const COIN_OFFERS = [{ pearls: 50, cash: 5000 }, { pearls: 100, cash: 15000 }, { pearls: 300, cash: 65000 }];
export const COIN_DEAL = { pearls: 150, cash: 30000 };
const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export const dealTaken = (P, now = Date.now()) => P.coinDeal === dayKey(now);
export const takeDeal = (P, now = Date.now()) => { P.coinDeal = dayKey(now); };

// pearl packs (the stand-in store until the app's is connected)
export const PACKS = [{ key: 'pearls1000', pearls: 1000, price: '$0.99' }, { key: 'pearls5000', pearls: 5000, price: '$2.99' }];

const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const hm = (ms) => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h} h ${m % 60} min` : `${m} min`; };
const pearl = '<img class="st-pearl" src="assets/ui/icons/pearl.png" alt="">';

export function scrollsHtml(P, tabs, pic) {
  const S = shelfOf(P), have = Math.floor(P.pearls || 0), now = Date.now();
  const cards = S.slots.map((s, i) => {
    const it = s.id && ITEMS[s.id]; if (!it) return '<div class="st-card empty"></div>';
    const R = RARITY[it.rarity], price = shelfPrice(s.id), kindWord = isPure(s.id) ? 'Pure scroll' : 'Scroll';
    const btn = s.sold ? '<button disabled>Sold</button>' : `<button data-shelf="${i}"${have < price ? ' disabled' : ''}>${pearl}${fmt(price)}</button>`;
    return `<div class="st-card sh-card r-${it.rarity}${s.sold ? ' sold' : ''}"><span class="st-deal sh-left">${hm(slotLeft(s, now))}</span><img src="${pic(it)}" alt=""><b style="color:${R.col}">${it.name}</b><small style="color:${R.col}">${R.name} ${kindWord.toLowerCase()}</small><span class="sh-line">${it.line || ''}</span>${btn}</div>`;
  }).join('');
  // (7.6.2) the restock as the row's fourth card, the shop being one size on every tab: three fresh scrolls, face down
  const restockCard = `<div class="st-card sh-card sh-rest"><span class="sh-stack"><img src="${pic(ITEMS[S.slots[0].id] || {})}" alt=""><img src="${pic(ITEMS[S.slots[1].id] || {})}" alt=""><img src="${pic(ITEMS[S.slots[2].id] || {})}" alt=""></span><b>Restock</b><small>Three new scrolls</small><button class="sh-restock" data-restock="1"${have < RESTOCK_PEARLS ? ' disabled' : ''}>${pearl}${RESTOCK_PEARLS}</button></div>`;
  return `<div class="st-plate st-shopplate st-shelf"><button class="st-x" aria-label="Close">×</button>${tabs}<div class="st-row">${cards}${restockCard}</div></div>`;
}
export function coinsHtml(P, tabs, cashPic) {
  const have = Math.floor(P.pearls || 0), deal = dealTaken(P);
  const card = (o, i, isDeal) => `<div class="st-card co-card${isDeal ? ' deal' : ''}">${isDeal ? '<span class="st-deal">Daily deal</span>' : ''}<img src="${cashPic}" alt=""><b>$${fmt(o.cash)}</b><small>Cash</small><button data-coins="${isDeal ? 'deal' : i}"${(isDeal && deal) || have < o.pearls ? ' disabled' : ''}>${isDeal && deal ? 'Taken today' : `${pearl}${fmt(o.pearls)}`}</button></div>`;
  return `<div class="st-plate st-shopplate st-coins"><button class="st-x" aria-label="Close">×</button>${tabs}<div class="st-row">${COIN_OFFERS.map((o, i) => card(o, i, false)).join('')}${card(COIN_DEAL, 0, true)}</div></div>`;
}
export function packsHtml(P, tabs) {
  // a heap of pearls, bigger for the bigger pack: each pearl placed by hand in a low pile, the back ones higher
  const PILE = [[[60, 52], [36, 56], [84, 56], [48, 36], [72, 36]], [[60, 58], [32, 60], [88, 60], [12, 62], [108, 62], [46, 40], [74, 40], [22, 44], [98, 44], [60, 22], [36, 26], [84, 26]]];
  const card = (k, i) => `<div class="st-card pk-card"><div class="pk-pile">${PILE[i].slice().reverse().map(([x, y]) => pearl.replace('alt=""', `alt="" style="left:${x}px;top:${y}px"`)).join('')}</div><b>${fmt(k.pearls)}</b><small>Pearls</small><button data-pack="${k.key}">${k.price}</button></div>`;
  return `<div class="st-plate st-shopplate st-packs"><button class="st-x" aria-label="Close">×</button>${tabs}<div class="st-row">${PACKS.map(card).join('')}</div></div>`;
}
