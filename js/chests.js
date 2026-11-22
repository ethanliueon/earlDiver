// Chests (2.9.0): the main way to good gear. Every shop has one or more; each rolls one item, its rarity by
// the chest's odds, then any item of that rarity in the chest pool (set pieces included). Bought and opened
// at once, in a short reveal (about 3 s; a click skips it): the lid creaks up, a little light in the
// rarity's colour, and the thing rises out with its name and skills. A full locker can't open one.
import { RARITY, SKILLS, LEGEND, skillCol } from './item_data.js';
import { powerHtml, skillsHtml } from './itemcard.js';
import { ITEMS, CHEST_POOL } from './items.js';
import { TAU } from './util.js';

// (6.4.0) chests are standard tiers, like a real game's, and things in their own right: bought (or given) into the
// locker as an item of the chest's rarity, opened from the bag when there is room for all it can give. Every chest is at
// least rare. Each gives 1 or 3 items (an old coin, if one comes up, is extra). Odds are per item, in %; per: odds for
// each item when the chest has a rule of its own (at least one exotic; a legendary in 1 chest of 5)
export const CHESTS = {
  // ---- rare: the basic chests
  crate: { name: 'Pine crate', tier: 'rare', n: 1, look: 'crate', coin: 2, odds: { common: 30, uncommon: 60, rare: 10 },
    line: 'Returns and odd lots in straw. Mostly ordinary.' },
  crate3: { name: 'Large pine crate', tier: 'rare', n: 3, look: 'crate_big', coin: 3, odds: { common: 30, uncommon: 60, rare: 10 },
    line: 'Three lots in one crate, roped shut.' },
  tea: { name: 'Tea chest', tier: 'rare', n: 3, look: 'tea', coin: 3, odds: { common: 28, uncommon: 60, rare: 10, exotic: 2 },
    line: 'Whatever came down on the rope this month.' },
  case: { name: 'Station case', tier: 'rare', n: 1, look: 'case', coin: 3, odds: { uncommon: 70, rare: 30 },
    line: "A sealed aluminium case from the station's stores." },
  case3: { name: 'Large station case', tier: 'rare', n: 3, look: 'case_big', coin: 5, odds: { uncommon: 70, rare: 30 },
    line: 'A double case, stencilled and padded.' },
  // ---- exotic
  footlocker: { name: 'Footlocker', tier: 'exotic', n: 1, look: 'footlocker', coin: 10, odds: { rare: 70, exotic: 30 },
    line: "Someone's whole kit, still in it." },
  strongbox: { name: 'Strongbox', tier: 'exotic', n: 1, look: 'strongbox', coin: 12, odds: { exotic: 100 },
    line: 'A riveted steel box off a salvage job. Heavier than it looks.' },
  salvage: { name: 'Salvage trunk', tier: 'exotic', n: 3, look: 'salvage', coin: 12, odds: { uncommon: 40, rare: 45, exotic: 15 },
    line: 'Hauled up from a wreck, still wet inside.' },
  expedition: { name: 'Expedition trunk', tier: 'exotic', n: 3, look: 'trunk', coin: 15, odds: { rare: 75, exotic: 25 },
    line: "Brass corners, a society's crest, a name scratched off." },
  // ---- legendary: never a legendary for certain
  siren: { name: "Siren's casket", tier: 'legendary', n: 1, look: 'siren', coin: 25, odds: { rare: 15, exotic: 80, legendary: 5 }, /* (6.5.1) the owner's odds */
    line: 'Pearl and black coral, sung shut.' },
  leviathan: { name: "Leviathan's hoard", tier: 'legendary', n: 3, look: 'leviathan', coin: 30, odds: { rare: 50.3, exotic: 48, legendary: 1.7 }, atLeast: 'exotic',
    line: 'Bound in bone the size of a ship.' },
  poseidon: { name: "Poseidon's chest", tier: 'legendary', n: 3, look: 'poseidon', coin: 50, odds: { exotic: 92.83, legendary: 7.17 },
    line: 'Bronze gone green, a trident on the lid, the sea still in it.' },
};
// (6.4.0) what a chest's contents are worth on average (each item at its shop price), and so its price: about twice that,
// so on average a chest never pays back what it cost (it is bought for the gear, not to sell), while a lucky pull can
const MEAN = {}; for (const r of ['common', 'uncommon', 'rare', 'exotic', 'legendary']) { const a = CHEST_POOL.filter((it) => it.rarity === r).map((it) => it.price); MEAN[r] = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
const nice = (v) => (v < 1000 ? Math.round(v / 50) * 50 : v < 10000 ? Math.round(v / 100) * 100 : Math.round(v / 500) * 500);
for (const [k, C] of Object.entries(CHESTS)) {
  C.ev = C.n * Object.entries(C.odds).reduce((a, [r, p]) => a + p / 100 * MEAN[r], 0); C.price = Math.max(900, nice(C.ev * 2));
  // each chest is also a thing in the locker: an item of its tier, opened from the bag
  ITEMS['chest_' + k] = { id: 'chest_' + k, kind: 'chest', chestKey: k, look: C.look, rarity: C.tier, name: C.name, line: C.line, good: `${C.n} item${C.n > 1 ? 's' : ''}`, bad: '', price: C.price };
}
// (6.4.1) the owner's prices: large station case $5,000, expedition trunk $20,000, Leviathan's hoard $50,000, Poseidon's
// chest $100,000, the rest in proportion (each tier scaled by its anchors). The pine crate stays the beginner's $900
const SET_PRICE = { crate: 900, case: 1700, crate3: 3100, tea: 3800, case3: 5000, footlocker: 7500, salvage: 14000, strongbox: 15000, expedition: 20000, siren: 27000, leviathan: 50000, poseidon: 100000 };
for (const [k, p] of Object.entries(SET_PRICE)) CHESTS[k].price = ITEMS['chest_' + k].price = p;
export const chestItem = (k) => ITEMS['chest_' + k];
export const chestsOf = (shop) => Object.entries(CHESTS).filter(([, c]) => c.shop === shop).map(([key, c]) => ({ key, ...c }));

export function rollRarity(odds, rnd = Math.random) {
  let r = rnd() * 100;
  for (const [k, p] of Object.entries(odds)) { if ((r -= p) < 0) return k; }
  return Object.keys(odds)[0];
}
// the item a chest gives: its rarity by the odds, then any item of that rarity in the pool
export function rollChest(key, rnd = Math.random, force = null) {
  const C = CHESTS[key]; if (!C) return null;
  const rarity = force || rollRarity(C.odds, rnd), pool = CHEST_POOL.filter((it) => it.rarity === rarity);
  let pick = pool[Math.floor(rnd() * pool.length)] || null;
  if (pick && pick.kind === 'ability' && rnd() < 0.5) pick = pool[Math.floor(rnd() * pool.length)] || pick; // (5.9.0) scrolls rarer than gear
  return pick;
}
// (6.4.0) everything a chest gives: its 1 or 3 items (a chest that promises at least one exotic keeps its word), and
// whether an old coin comes up besides
export function rollChestAll(key, rnd = Math.random) {
  const C = CHESTS[key]; if (!C) return null;
  const items = []; for (let i = 0; i < C.n; i++) items.push(rollChest(key, rnd));
  if (C.atLeast && !items.some((d) => d && RARITY[d.rarity].k >= RARITY[C.atLeast].k)) items[Math.floor(rnd() * items.length)] = rollChest(key, rnd, C.atLeast);
  return { items: items.filter(Boolean), coin: rnd() * 100 < (C.coin || 0) };
}
// the odds as words for the shop: "Common 60 % · Uncommon 30 % · …"
// (6.1.0) a chest's odds, and the chance of a gold coin besides (on top of its item, never in its place)
// (6.1.7) no string of rates joined by dots: a small "i  Rates" beside the price, and a tap shows them as a table on old
// paper (a row each: the rarity in its colour, its chance right-aligned; the gold coin last, as an extra on top)
export const oddsText = (odds, coin = 0) => { const k = Object.keys(CHESTS).find((q) => CHESTS[q].odds === odds) || ''; return `<button type="button" class="rates-i" data-rates="${k}"><i>i</i>Rates</button>`; };
export function ratesTable(key) { // (6.1.9) names and figures only; the coin by its picture
  const C = CHESTS[key]; if (!C) return '';
  const rows = Object.entries(C.odds).map(([r, p]) => `<tr><td class="r-${r}"><span class="sw"></span>${RARITY[r].name}</td><td>${p} %</td></tr>`).join('');
  const coin = C.coin ? `<table class="rt-extra"><tr><td class="r-legendary"><img class="gc" src="${coinPic()}" alt="">Old coin</td><td>+${C.coin} %</td></tr></table>` : '';
  // (6.4.1) the details too, opened by the shop card's i: the chest's picture, its line, how many items, and its rule
  const sure = C.atLeast ? `<tr><td>At least</td><td>1 ${RARITY[C.atLeast].name}</td></tr>` : '';
  return `<div class="rt-box"><button class="rt-x" aria-label="Close">×</button><img class="rt-pic" src="${chestPicture(C.look, 220, 160)}" alt=""><h4>${C.name}</h4><p class="rt-line">${C.line}</p><table class="rt-head"><tr><td>Items</td><td>${C.n}</td></tr>${sure}</table><table>${rows}</table>${coin}</div>`;
}
let COINPIC = null;
function coinPic() { if (COINPIC) return COINPIC; const c = document.createElement('canvas'); c.width = c.height = 48; import('./catalog.js').then((m) => { const x = c.getContext('2d'); m.drawGoldCoins(x, 48, 48, 1); COINPIC = c.toDataURL(); }); return c.toDataURL(); }
if (typeof document !== 'undefined') setTimeout(coinPic, 0);
// one listener for every shop: a tap on "Rates" opens the table over everything; a tap outside it, or the cross, closes it
if (typeof document !== 'undefined') document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('[data-rates]');
  let el = document.getElementById('rates');
  if (b) { ev.preventDefault(); ev.stopPropagation(); if (!el) { el = document.createElement('div'); el.id = 'rates'; document.body.appendChild(el); } el.innerHTML = ratesTable(b.dataset.rates); el.hidden = false; return; }
  if (el && !el.hidden && (ev.target === el || (ev.target.closest && ev.target.closest('.rt-x')))) { el.hidden = true; ev.stopPropagation(); }
}, true);

// ---------- the chests, drawn ----------
// (6.1.2) painted in chest_art.js
import { drawChest } from './chest_art.js';
export { drawChest };

const PICS = new Map();
export function chestPicture(look, w, h) {
  const k = `${look}:${w}x${h}`; if (PICS.has(k)) return PICS.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; drawChest(c.getContext('2d'), look, w, h, 0); const url = c.toDataURL(); PICS.set(k, url); return url;
}

// ---------- the reveal ----------
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const LIGHT = { common: 'rgba(200,196,180,A)', uncommon: 'rgba(150,200,150,A)', rare: 'rgba(130,170,220,A)', exotic: 'rgba(190,150,220,A)', legendary: 'rgba(230,200,120,A)' };
// (6.4.0) opening a chest, as a real game does it: the screen dims, the chest sits large in the middle, it shakes (a
// cheap crate twice, a legendary chest a long time), the lid flies up, and things burst out by what it is and what is
// in it: a puff of dust and straw for the rare chests, sparks in the find's colour for the better ones, a slow column of
// light for a legendary find. Then the finds pop out one after another and hang over it: the pictures alone (an old
// coin as a find of its own). Tap one for its card; Take puts it all in the locker.
const TIER_T = { rare: { shake: 0.4, lid: 0.3, gap: 0.22, parts: 16 }, exotic: { shake: 0.95, lid: 0.45, gap: 0.32, parts: 34 }, legendary: { shake: 1.5, lid: 0.6, gap: 0.42, parts: 60 } };
const SPARK = { common: [200, 196, 180], uncommon: [150, 200, 150], rare: [140, 178, 224], exotic: [196, 156, 224], legendary: [232, 202, 128] };
export class ChestReveal {
  // hooks: picture(def, w, h) -> data URL; coinPic() -> data URL; coins() -> how many; putOn(u); close()
  constructor(root, hooks) {
    this.root = root; this.h = hooks;
    root.innerHTML = '<canvas class="cx-cv"></canvas><div class="cx-finds"></div><div class="cx-card" hidden></div><button class="cx-take" hidden>Take</button>';
    this.cv = root.querySelector('canvas');
    root.addEventListener('click', (ev) => {
      const f = ev.target.closest('.cx-find'); if (f) { this.card(+f.dataset.i); return; }
      if (ev.target.closest('.cx-on')) { const u = ev.target.closest('.cx-on').dataset.u; this.h.putOn(u); this.cardEl.hidden = true; return; }
      if (ev.target.closest('.cx-cardx') || (this.cardEl && !this.cardEl.hidden && !ev.target.closest('.cx-card'))) { this.cardEl.hidden = true; return; }
      if (ev.target.closest('.cx-take')) { this.close(); return; }
      if (!this.done) this.t0 -= 10; // a tap skips to the end
    });
  }
  open(key, finds, coin = false) {
    const C = CHESTS[key]; this.C = C; this.finds = finds.concat(coin ? [{ coin: true }] : []); this.done = false; this.parts = []; this.burst = false;
    const best = finds.reduce((a, f) => Math.max(a, RARITY[f.def.rarity].k), 0); this.best = Object.keys(RARITY).find((r) => RARITY[r].k === best) || 'common';
    this.T = TIER_T[C.tier] || TIER_T.rare; this.t0 = performance.now();
    const R = this.root; R.hidden = false; R.className = `chest-reveal cx t-${C.tier}`; this.cardEl = R.querySelector('.cx-card'); this.cardEl.hidden = true; R.querySelector('.cx-take').hidden = true;
    const box = R.querySelector('.cx-finds'); box.innerHTML = this.finds.map((f, i) => f.coin
      ? `<button class="cx-find r-legendary" data-i="${i}"><img src="${this.h.coinPic()}" alt=""><span>Old coin</span></button>`
      : `<button class="cx-find r-${f.def.rarity}" data-i="${i}"><img src="${this.h.picture(f.def, 160, 110)}" alt=""><span>${f.def.name}</span></button>`).join('');
    this.findEls = [...box.children];
    const loop = () => { if (R.hidden) return; this.draw(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  card(i) { // a find's card: its picture, name, rarity, what it does
    const f = this.finds[i], el = this.cardEl; if (!f) return;
    if (f.coin) el.innerHTML = `<button class="cx-cardx" aria-label="Close">×</button><div class="icard"><img src="${this.h.coinPic()}" alt=""><h4 style="color:${RARITY.legendary.col}">Old coin</h4><p class="ic-r" style="color:${RARITY.legendary.col}">Legendary</p><p class="ic-line">Hand-struck and worn nearly smooth. The Old One trades for them.</p><p class="ic-line cx-have">${this.h.coins()} in the locker</p></div>`;
    else { const d = f.def; // (6.5.3) the card every item shares: picture, name, rarity, what it is, its power, its skills
      el.innerHTML = `<button class="cx-cardx" aria-label="Close">×</button><div class="icard"><img src="${this.h.picture(d, 300, 180)}" alt=""><h4 style="color:${RARITY[d.rarity].col}">${d.name}</h4><p class="ic-r" style="color:${RARITY[d.rarity].col}">${RARITY[d.rarity].name}</p>${d.line ? `<p class="ic-line">${d.line}</p>` : ''}${d.legend ? powerHtml(d.legend) : ''}${skillsHtml(f.q.sk)}</div>`; }
    el.hidden = false;
  }
  close() { this.root.hidden = true; this.h.close && this.h.close(); }
  draw() {
    const R = this.root, c = this.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(R.clientWidth * dpr), H = Math.round(R.clientHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'), t = (performance.now() - this.t0) / 1000, T = this.T; x.clearRect(0, 0, W, H);
    const cw = Math.min(W * 0.4, H * 0.62), chh = cw * 0.8, cx = W / 2, cy = H * 0.62;
    // the shake: a few hard jolts that grow, then the lid
    const sk = t < T.shake ? t / T.shake : 1, shake = t < T.shake ? Math.sin(t * 46) * Math.pow(sk, 0.6) * cw * 0.02 * (1 + (this.C.tier === 'legendary' ? 1 : 0)) : 0, hop = t < T.shake ? Math.abs(Math.sin(t * 23)) * sk * cw * 0.015 : 0;
    const lid = Math.min(1, Math.max(0, (t - T.shake) / T.lid)), lidE = 1 - Math.pow(1 - lid, 3);
    x.save(); x.translate(cx - cw / 2 + shake, cy - chh / 2 - hop); drawChest(x, this.C.look, cw, chh, lidE, LIGHT[this.best]); x.restore();
    // the burst when the lid goes: dust and straw for a rare chest, sparks in the find's colour for better ones
    const mouthY = cy - chh * 0.05;
    if (lid > 0.4 && !this.burst) { this.burst = true; const n = Math.round(T.parts * (1 + RARITY[this.best].k * 0.25)), col = SPARK[this.best], dust = this.C.tier === 'rare';
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * (dust ? 2.2 : 1.6), v = cw * (dust ? 0.5 + Math.random() * 0.6 : 0.8 + Math.random() * 1.2);
        this.parts.push({ x: cx + (Math.random() - 0.5) * cw * 0.4, y: mouthY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t, life: dust ? 0.9 + Math.random() * 0.6 : 1 + Math.random() * 0.9, dust, straw: dust && Math.random() < 0.4, col, r: dust ? cw * (0.006 + Math.random() * 0.01) : cw * (0.003 + Math.random() * 0.004), a: Math.random() * 6 }); } }
    let last = this.lastT ?? t; const dt = Math.min(0.05, t - last); this.lastT = t;
    for (const p of this.parts) { const age = (t - p.t0) / p.life; if (age >= 1) continue; p.vy += (p.dust ? cw * 0.9 : cw * 0.35) * dt; p.vx *= 1 - dt * 1.2; p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * 3;
      if (p.dust) { x.globalAlpha = 0.6 * (1 - age); if (p.straw) { x.strokeStyle = '#c8b070'; x.lineWidth = Math.max(1, p.r * 0.35); x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x + Math.cos(p.a) * p.r * 3, p.y + Math.sin(p.a) * p.r * 3); x.stroke(); } else { x.fillStyle = 'rgba(160,140,110,1)'; x.beginPath(); x.arc(p.x, p.y, p.r * (1 + age * 2), 0, TAU); x.fill(); } }
      else { x.globalAlpha = 1 - age; x.fillStyle = `rgb(${p.col.join(',')})`; x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill(); x.globalAlpha = (1 - age) * 0.35; x.beginPath(); x.arc(p.x, p.y, p.r * 3, 0, TAU); x.fill(); } }
    x.globalAlpha = 1;
    if (this.best === 'legendary' && lid > 0.3) { const k = Math.min(1, (lid - 0.3) / 0.7), g = x.createLinearGradient(0, mouthY, 0, mouthY - H * 0.6); g.addColorStop(0, `rgba(232,202,128,${(0.28 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(232,202,128,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(cx - cw * 0.3, mouthY); x.lineTo(cx - cw * 0.18, mouthY - H * 0.6); x.lineTo(cx + cw * 0.18, mouthY - H * 0.6); x.lineTo(cx + cw * 0.3, mouthY); x.fill(); } // a slow column of light for a legendary find
    // the finds rise out of the mouth one after another and hang over the chest
    const tf = T.shake + T.lid * 0.6, n = this.findEls.length, Wc = R.clientWidth, Hc = R.clientHeight, gapX = Math.min(130, Wc * 0.9 / Math.max(1, n));
    this.findEls.forEach((el, i) => { const ti = tf + i * T.gap, k = Math.min(1, Math.max(0, (t - ti) / 0.45)), e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1, over = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.12 : 0;
      const tx = Wc / 2 + (i - (n - 1) / 2) * gapX, ty0 = (cy - chh * 0.1) / dpr, ty1 = Hc * 0.24;
      el.style.opacity = k > 0 ? Math.min(1, k * 3).toFixed(3) : '0'; el.style.transform = `translate(${(tx).toFixed(1)}px, ${(ty0 + (ty1 - ty0) * e).toFixed(1)}px) translate(-50%, -50%) scale(${(0.35 + 0.65 * e + over).toFixed(3)})`; });
    if (!this.done && t > tf + (n - 1) * T.gap + 0.5) { this.done = true; R.querySelector('.cx-take').hidden = false; R.classList.add('done'); }
  }
}
