// (6.4.0) The Shop and Events, two screens off the left menu. The Shop sells chests for cash: three standard ones (the
// pine crate, the footlocker, the Siren's casket) and one deal that changes every four hours among the rest. Events
// holds the daily gift: a seven-day calendar, one gift a day; a day missed pauses it, it never resets. Day 7 is
// Poseidon's chest; then it starts again at day 1.
import { CHESTS, chestPicture } from './chests.js';
import { RARITY } from './item_data.js';
import { playerLevel } from './quests.js';
import { TRAPS, money } from './economy.js';

export const STANDARD = ['crate', 'footlocker', 'siren'];
const DEALS = ['crate3', 'tea', 'case', 'case3', 'strongbox', 'salvage', 'expedition', 'leviathan', 'poseidon'];
const SLOT = 4 * 3600e3;
export const dealNow = (t = Date.now()) => DEALS[Math.floor(t / SLOT) % DEALS.length];
export const dealLeft = (t = Date.now()) => (Math.floor(t / SLOT) + 1) * SLOT - t;
// the seven gifts
// (6.5.1) the first week is a new player's own, given once: a pine crate, $250 (7.3.9), advanced glow sticks, a fish trap, a
// station case, $1,000 (7.3.9) and a Siren's casket. From the second week the calendar repeats, its gifts set by the hidden
// player level (quests.js playerLevel): the chests, the cash and the glow sticks grow with him; day 7 is the week's chest
export const WEEK1 = [
  { k: 'chest', v: 'crate' }, { k: 'cash', v: 250 }, { k: 'glow', v: 3, adv: true }, { k: 'trap', v: 'fish' },
  { k: 'chest', v: 'case' }, { k: 'cash', v: 1000 }, { k: 'chest', v: 'siren' }, // (7.3.9, owner) $250 and $1,000 (they were $1,000 and $5,000: a sub or two early on)
];
const TIERS = [ // [up to level, daily chest, cash days 2 and 6, advanced glow sticks, the week's chest]
  [3, 'crate', [75, 160], false, 'footlocker'], [6, 'case', [380, 800], false, 'siren'], // (7.3.9) the cash a quarter to a fifth of before, as week one's
  [9, 'footlocker', [1500, 3000], true, 'leviathan'], [10, 'strongbox', [3000, 6000], true, 'poseidon'],
];
export function calWeek(P) {
  calState(P); if (!(P.cal.week > 0)) return WEEK1;
  const L = playerLevel(P), t = TIERS.find((q) => L <= q[0]) || TIERS[3], [, ch, cash, adv, wk] = t;
  return [{ k: 'chest', v: ch }, { k: 'cash', v: cash[0] }, { k: 'glow', v: 3, adv }, { k: 'coin', v: 1 }, { k: 'chest', v: ch }, { k: 'cash', v: cash[1] }, { k: 'chest', v: wk }];
}
export const CAL = WEEK1; // (the old name, for the first week)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function calState(P) { if (!P.cal) P.cal = { day: 0, last: null }; return { day: P.cal.day, ready: P.cal.last !== today() }; }
export function calClaimed(P) { calState(P); P.cal.last = today(); P.cal.day = (P.cal.day + 1) % 7; if (P.cal.day === 0) P.cal.week = (P.cal.week || 0) + 1; } // (6.5.1) a week done: the next is the level's
export const giftName = (r) => (r.k === 'chest' ? CHESTS[r.v].name : r.k === 'cash' ? money(r.v, false) : r.k === 'glow' ? `${r.v} ${r.adv ? 'advanced ' : ''}glow sticks` : r.k === 'trap' ? (TRAPS[r.v] ? TRAPS[r.v].name : 'Trap') : `${r.v} old coin${r.v > 1 ? 's' : ''}`);
const hrs = (ms) => { const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3); return h ? `${h} h ${m} min` : `${m} min`; };

// the Shop: a row of chests, each its picture, name, tier, items, price and Buy
// (6.9.0) the Test tab: for testing only, and only in the web build (isTestStore: no native store behind it), so it can
// never reach the App Store build. Cash, any chest (into the locker, to open), every ability, any item, and resets.
export function testHtml(P, items) {
  const chest = Object.entries(CHESTS).map(([k, C]) => `<button data-test="chest|${k}">${C.name}</button>`).join('');
  const opts = items.map((it) => `<option value="${it.id}">${it.name} (${it.rarity})</option>`).join('');
  return `<div class="st-plate st-test"><button class="st-x" aria-label="Close">×</button>${shopTabs('test', true)}
    <div class="tt-rows"><div class="tt-row"><b>Pearls</b><button data-test="pearls|50">+50</button><button data-test="pearls|500">+500</button></div><div class="tt-row"><b>Cash</b><button data-test="cash|1000">+$1,000</button><button data-test="cash|10000">+$10,000</button><button data-test="cash|100000">+$100,000</button><button data-test="cash|1000000">+$1,000,000</button></div>
    <div class="tt-row"><b>Chests</b>${chest}</div>
    <div class="tt-row"><b>Abilities</b><button data-test="abil|all">Every ability</button><button data-test="abil|ready">Cooldown ready</button></div>
    <div class="tt-row"><b>Item</b><select class="tt-item">${opts}</select><button data-test="item|">Give</button></div>
    <div class="tt-row"><b>Reset</b><button data-test="reset|lessons">Lessons</button><button data-test="reset|tutorial">Tutorial</button><button data-test="reset|board">First board</button></div></div></div>`;
}
// (7.3.9, owner) the shop's tabs: chests (for cash), pets (for pearls), and the web build's Test
export const shopTabs = (on, test) => `<div class="st-tabs">${[['shop', 'Chests'], ['pets', 'Pets'], ...(test ? [['test', 'Test']] : [])].map(([k, n]) => `<button${k === on ? ' class="on"' : ''} data-tab="${k}">${n}</button>`).join('')}</div>`;
// (7.3.9, owner) pets sold for pearls, the shop's own: kinds that are not to be had otherwise as a companion. Caught animals
// still become pets as before. A pet bought stays his: he can take it back out at any time for nothing
export const SHOP_PETS = [{ id: 53, pearls: 80 }, { id: 482, pearls: 80 }, { id: 329, pearls: 80 }, { id: 462, pearls: 80 }, { id: 499, pearls: 120 }, { id: 87, pearls: 300 }];
export const SHOP_PET_IDS = new Set(SHOP_PETS.map((s) => s.id));
export function petsHtml(P, test, picOf, nameOf, rarOf) {
  const owned = new Set(P.petsOwned || []), cur = P.pet && P.pet.id, have = Math.floor(P.pearls || 0);
  const pearl = '<img class="st-pearl" src="assets/ui/icons/pearl.png" alt="">';
  const cards = SHOP_PETS.map((s) => { const R = rarOf(s.id), mine = owned.has(s.id), out = cur === s.id;
    const btn = out ? '<button disabled>With you</button>' : mine ? `<button data-pet="${s.id}">Take out</button>` : `<button data-pet="${s.id}" ${have < s.pearls ? 'disabled' : ''}>${pearl}${s.pearls}</button>`;
    return `<div class="st-card r-${R.id}"><img src="${picOf(s.id)}" alt=""><b style="color:${R.col}">${nameOf(s.id)}</b><span class="st-r" style="color:${R.col}">${R.name} pet</span><span class="st-n">${mine ? 'Yours' : '&nbsp;'}</span>${btn}</div>`; }).join('');
  return `<div class="st-plate"><button class="st-x" aria-label="Close">×</button>${shopTabs('pets', test)}<div class="st-row st-pets">${cards}</div></div>`;
}
export function storeHtml(P, test = false) {
  const card = (key, deal) => {
    const C = CHESTS[key], R = RARITY[C.tier];
    return `<div class="st-card r-${C.tier}${deal ? ' deal' : ''}">${deal ? `<span class="st-deal">Deal, ${hrs(dealLeft())} left</span>` : ''}<button class="st-i" data-rates="${key}" aria-label="Details"><i>i</i></button><img src="${chestPicture(C.look, 220, 160)}" alt=""><b style="color:${R.col}">${C.name}</b><span class="st-r" style="color:${R.col}">${R.name}</span><span class="st-n">${C.n} item${C.n > 1 ? 's' : ''}</span><button data-store="${key}" ${(P.cash || 0) < C.price ? 'disabled' : ''}>${money(C.price, false)}</button></div>`;
  };
  return `<div class="st-plate"><button class="st-x" aria-label="Close">×</button>${shopTabs('shop', test)}<div class="st-row">${STANDARD.map((k) => card(k, false)).join('')}${card(dealNow(), true)}</div></div>`;
}
// Events: the daily gift, seven days in a row
// (6.5.0) today's gift and its Claim button pulse slowly; once claimed, the next day's button is greyed with the time
// left until it can be claimed beside it. A tap on any day shows what it is (a chest, its odds)
export const untilTomorrow = (t = new Date()) => { const n = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1); return n - t; };
export function eventsHtml(P, coinPic, glowPic, picOf, cashPic) {
  const st = calState(P), W = calWeek(P);
  const days = W.map((r, i) => {
    const done = i < st.day, now = i === st.day, pic = r.k === 'chest' ? chestPicture(CHESTS[r.v].look, 120, 90) : r.k === 'coin' ? coinPic : r.k === 'glow' ? (r.adv && picOf ? picOf('supply', 'glowAdv') : glowPic) : r.k === 'trap' && picOf ? picOf('trap', r.v) : r.k === 'cash' ? cashPic || null : null; // (7.3.0) the painted notes, not a "$"
    return `<button class="ev-day${done ? ' done' : ''}${now && st.ready ? ' now' : ''}${now && !st.ready ? ' next' : ''}${i === 6 ? ' big' : ''}" data-evday="${i}"${r.k === 'chest' ? ` data-rates="${r.v}"` : ''}><span class="ev-n">Day ${i + 1}</span>${pic ? `<img src="${pic}" alt="">` : '<i class="ev-cash">$</i>'}<span class="ev-g">${giftName(r)}</span>${done ? '<i class="ev-tick">✓</i>' : ''}</button>`;
  }).join('');
  return `<div class="st-plate ev"><button class="st-x" aria-label="Close">×</button><h2>Daily gift</h2><div class="ev-row">${days}</div><div class="ev-foot">${st.ready ? `<button class="ev-claim" data-ev="claim">Claim day ${st.day + 1}</button>` : `<span class="ev-wait">${hrs(untilTomorrow())}</span><button class="ev-claim" disabled>Claim day ${st.day + 1}</button>`}</div></div>`;
}
