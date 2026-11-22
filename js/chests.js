// Chests (2.9.0): the main way to good gear. Every shop has one or more; each rolls one item, its rarity by
// the chest's odds, then any item of that rarity in the chest pool (set pieces included). Bought and opened
// at once, in a short reveal (about 3 s; a click skips it): the lid creaks up, a little light in the
// rarity's colour, and the thing rises out with its name and skills. A full locker can't open one.
import { RARITY, SKILLS, LEGEND } from './item_data.js';
import { ITEMS, CHEST_POOL } from './items.js';
import { TAU } from './util.js';

// odds in %, by rarity
export const CHESTS = {
  bayside: { shop: 'bayside', name: 'Surplus crate', price: 900, look: 'crate', line: 'A pine crate of returns and odd lots from the back room. Mostly ordinary; now and then something old turns up in the straw.',
    coin: 1, odds: { common: 60, uncommon: 30, rare: 9, exotic: 1 } },
  station: { shop: 'station', name: 'Equipment case', price: 3000, look: 'case', line: "A sealed aluminium case from the station's stores, stencilled and padded. Kit the scientists stopped using.",
    coin: 2, odds: { common: 10, uncommon: 45, rare: 43, exotic: 2 } },
  dave1: { shop: 'dave', name: 'Tea chest', price: 2000, look: 'tea', line: "Whatever came down on the rope this month. Dave hasn't looked. So Dave says.",
    coin: 5, odds: { common: 20, uncommon: 50, rare: 25, exotic: 5 } },
  dave2: { shop: 'dave', name: 'Strongbox', price: 6000, look: 'strongbox', line: 'A riveted steel box off a salvage job, the lock long gone. Heavier than it looks.',
    coin: 10, odds: { uncommon: 30, rare: 60, exotic: 10 } },
  dave3: { shop: 'dave', name: "Bosun's footlocker", price: 15000, look: 'footlocker', line: "Out of a wreck on the plain. Someone's whole kit, still in it.",
    coin: 15, odds: { uncommon: 5, rare: 79, exotic: 15, legendary: 1 } },
  dave4: { shop: 'dave', name: 'Expedition trunk', price: 32000, look: 'trunk', line: "Brass corners, a society's crest, a name scratched off. Dave won't say where it came from.",
    coin: 20, odds: { rare: 78, exotic: 20, legendary: 2 } },
};
export const chestsOf = (shop) => Object.entries(CHESTS).filter(([, c]) => c.shop === shop).map(([key, c]) => ({ key, ...c }));

export function rollRarity(odds, rnd = Math.random) {
  let r = rnd() * 100;
  for (const [k, p] of Object.entries(odds)) { if ((r -= p) < 0) return k; }
  return Object.keys(odds)[0];
}
// the item a chest gives: its rarity by the odds, then any item of that rarity in the pool
export function rollChest(key, rnd = Math.random) {
  const C = CHESTS[key]; if (!C) return null;
  const rarity = rollRarity(C.odds, rnd), pool = CHEST_POOL.filter((it) => it.rarity === rarity);
  let pick = pool[Math.floor(rnd() * pool.length)] || null;
  if (pick && pick.kind === 'ability' && rnd() < 0.5) pick = pool[Math.floor(rnd() * pool.length)] || pick; // (5.9.0) scrolls rarer than gear
  return pick;
}
// the odds as words for the shop: "Common 60 % · Uncommon 30 % · …"
// (6.1.0) a chest's odds, and the chance of a gold coin besides (on top of its item, never in its place)
export const oddsText = (odds, coin = 0) => Object.entries(odds).map(([k, p]) => `<span class="r-${k}">${RARITY[k].name} ${p} %</span>`).join(' · ') + (coin ? ` · <span class="r-legendary">Gold coin ${coin} % bonus</span>` : '');

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
export class ChestReveal {
  // hooks: picture(def, w, h) → data URL; putOn(u); close()
  constructor(root, hooks) {
    this.root = root; this.h = hooks;
    root.innerHTML = `<div class="cr-box"><canvas width="520" height="300"></canvas><div class="cr-item"><img alt=""><div class="cr-txt"><b class="nm"></b><span class="rr"></span><p></p><div class="cr-sks"></div></div></div>
      <div class="cr-acts"><button class="cr-on">Put it on</button><button class="cr-done">Keep it</button></div><small class="cr-skip">click to skip</small></div>`;
    this.cv = root.querySelector('canvas');
    root.addEventListener('click', (ev) => {
      if (ev.target.closest('.cr-on')) { this.h.putOn(this.q.u); this.close(); return; }
      if (ev.target.closest('.cr-done')) { this.close(); return; }
      if (this.t < 3) this.t0 = performance.now() - 3000; // skip to the end
    });
    window.addEventListener('keydown', (ev) => { if (this.root.hidden) return; if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopImmediatePropagation(); if (this.t < 3) this.t0 = performance.now() - 3000; else this.close(); } }, true);
  }
  open(key, q, coin = false) {
    const C = CHESTS[key], def = ITEMS[q.id]; this.C = C; this.q = q; this.def = def; this.t = 0; this.t0 = performance.now();
    const R = this.root; R.hidden = false; R.classList.remove('done');
    R.querySelector('.cr-item').className = `cr-item r-${def.rarity}`;
    R.querySelector('img').src = this.h.picture(def, 300, 180);
    R.querySelector('.nm').textContent = def.name;
    R.querySelector('.rr').textContent = RARITY[def.rarity].name + (def.set ? ' · set piece' : '');
    R.querySelector('p').textContent = def.line || '';
    R.querySelector('.cr-sks').innerHTML = (q.sk || []).map(([k, l]) => `<div><b>${SKILLS[k].name}${SKILLS[k].flat ? '' : ' ' + ROMAN[l]}</b> ${SKILLS[k].what}</div>`).join('') + (q.leg ? `<div class="leg"><b>✦ ${LEGEND[q.leg].name}</b> ${LEGEND[q.leg].what}</div>` : '');
    // (6.1.2) and a gold coin at the bottom of it, when one came up
    { const old = R.querySelector('.cr-coin'); if (old) old.remove(); if (coin) R.querySelector('.cr-item').insertAdjacentHTML('afterend', `<div class="cr-coin r-legendary"><span class="cr-ci"><img src="${this.h.picture({ kind: 'gold', id: 1 }, 90, 90)}" alt=""></span><span>And at the bottom of it, a gold coin.</span></div>`); }
    const loop = () => { if (R.hidden) return; this.t = (performance.now() - this.t0) / 1000; this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  close() { this.root.hidden = true; this.h.close && this.h.close(); }
  draw() {
    const t = this.t, c = this.cv.getContext('2d'), W = this.cv.width, H = this.cv.height, R = this.root;
    c.clearRect(0, 0, W, H);
    // 0-0.7 s it rattles; 0.7-1.4 the lid comes up; then the light, and the thing rises (in the DOM)
    const shake = t < 0.7 ? Math.sin(t * 60) * (0.7 - t) * 3 : 0, lid = Math.min(1, Math.max(0, (t - 0.7) / 0.7));
    c.save(); c.translate(shake, 0); drawChest(c, this.C.look, W, H, 1 - Math.pow(1 - lid, 3), LIGHT[this.def.rarity]); c.restore();
    const rise = Math.min(1, Math.max(0, (t - 1.3) / 0.9));
    const item = R.querySelector('.cr-item');
    item.style.opacity = rise.toFixed(3); item.style.transform = `translateY(${Math.round((1 - rise) * 40)}px)`;
    if (t >= 2.6 && !R.classList.contains('done')) R.classList.add('done');
  }
}
