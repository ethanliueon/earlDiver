// (6.4.0) The Shop and Events, two screens off the left menu. The Shop sells chests for cash: three standard ones (the
// pine crate, the footlocker, the Siren's casket) and one deal that changes every four hours among the rest. Events
// holds the daily gift: a seven-day calendar, one gift a day; a day missed pauses it, it never resets. Day 7 is
// Poseidon's chest; then it starts again at day 1.
import { CHESTS, chestPicture } from './chests.js';
import { RARITY } from './item_data.js';

export const STANDARD = ['crate', 'footlocker', 'siren'];
const DEALS = ['crate3', 'tea', 'case', 'case3', 'strongbox', 'salvage', 'expedition', 'leviathan', 'poseidon'];
const SLOT = 4 * 3600e3;
export const dealNow = (t = Date.now()) => DEALS[Math.floor(t / SLOT) % DEALS.length];
export const dealLeft = (t = Date.now()) => (Math.floor(t / SLOT) + 1) * SLOT - t;
// the seven gifts
export const CAL = [
  { k: 'chest', v: 'crate' }, { k: 'cash', v: 1000 }, { k: 'glow', v: 3 }, { k: 'coin', v: 1 },
  { k: 'chest', v: 'case' }, { k: 'cash', v: 3000 }, { k: 'chest', v: 'poseidon' },
];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function calState(P) { if (!P.cal) P.cal = { day: 0, last: null }; return { day: P.cal.day, ready: P.cal.last !== today() }; }
export function calClaimed(P) { calState(P); P.cal.last = today(); P.cal.day = (P.cal.day + 1) % CAL.length; }
export const giftName = (r) => (r.k === 'chest' ? CHESTS[r.v].name : r.k === 'cash' ? `$${r.v.toLocaleString()}` : r.k === 'glow' ? `${r.v} glow sticks` : `${r.v} old coin${r.v > 1 ? 's' : ''}`);
const hrs = (ms) => { const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3); return h ? `${h} h ${m} min` : `${m} min`; };

// the Shop: a row of chests, each its picture, name, tier, items, price and Buy
export function storeHtml(P) {
  const card = (key, deal) => {
    const C = CHESTS[key], R = RARITY[C.tier];
    return `<div class="st-card r-${C.tier}${deal ? ' deal' : ''}">${deal ? `<span class="st-deal">Deal, ${hrs(dealLeft())} left</span>` : ''}<button class="st-i" data-rates="${key}" aria-label="Details"><i>i</i></button><img src="${chestPicture(C.look, 220, 160)}" alt=""><b>${C.name}</b><span class="st-r" style="color:${R.col}">${R.name}</span><span class="st-n">${C.n} item${C.n > 1 ? 's' : ''}</span><button data-store="${key}" ${(P.cash || 0) < C.price ? 'disabled' : ''}>$${C.price.toLocaleString()}</button></div>`;
  };
  return `<div class="st-plate"><button class="st-x" aria-label="Close">×</button><h2>Shop</h2><div class="st-row">${STANDARD.map((k) => card(k, false)).join('')}${card(dealNow(), true)}</div></div>`;
}
// Events: the daily gift, seven days in a row
export function eventsHtml(P, coinPic, glowPic) {
  const st = calState(P);
  const days = CAL.map((r, i) => {
    const done = i < st.day, now = i === st.day, pic = r.k === 'chest' ? chestPicture(CHESTS[r.v].look, 120, 90) : r.k === 'coin' ? coinPic : r.k === 'glow' ? glowPic : null;
    return `<div class="ev-day${done ? ' done' : ''}${now ? ' now' : ''}${i === CAL.length - 1 ? ' big' : ''}"><span class="ev-n">Day ${i + 1}</span>${pic ? `<img src="${pic}" alt="">` : '<i class="ev-cash">$</i>'}<span class="ev-g">${giftName(r)}</span>${done ? '<i class="ev-tick">✓</i>' : ''}</div>`;
  }).join('');
  return `<div class="st-plate ev"><button class="st-x" aria-label="Close">×</button><h2>Daily gift</h2><div class="ev-row">${days}</div><div class="ev-foot">${st.ready ? `<button data-ev="claim">Claim day ${st.day + 1}</button>` : '<span class="ev-wait">Come back tomorrow</span>'}</div></div>`;
}
