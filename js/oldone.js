// The old one (3.0.0): a giant humpback anglerfish in the mouth of her cave in the west wall, her lure lighting
// the water round her. Below her mouth a flat stone table juts from the cliff. (6.1.1) On it lie three things, and she
// takes only gold coins for them: pieces of the expedition sets (Exotic) for 3 coins, and now and then (one time in
// ten) a Legendary for 10. Each lies there for its own 12 to 24 hours (real time) and is then gone; a thing bought or
// gone is replaced by another. Earl looks at them from the sub (or swimming): over one, the hand shows its card.
import { CAVE } from './world.js';
import { ITEMS, CHEST_POOL } from './items.js';
import { rollSkillsFor } from './items.js';
import { TAU } from './util.js';

export const TABLE = { x0: CAVE.x + 5.5, x1: CAVE.x + 27, y: CAVE.y + 9 }; // its top surface (y down)
const SLOTS = [CAVE.x + 10, CAVE.x + 16.25, CAVE.x + 22.5]; // the three things, west to east
export const CHEST_SLOTS = [];
export const COIN_COST = { exotic: 3, legendary: 10 };
const H = 3600e3;

function rollOne(used) {
  const leg = Math.random() < 0.1, L = CHEST_POOL.filter((it) => (leg ? it.rarity === 'legendary' : it.rarity === 'exotic' && it.set) && !used.has(it.id));
  const def = L[Math.floor(Math.random() * L.length)] || CHEST_POOL.find((it) => it.rarity === 'exotic');
  const sk = rollSkillsFor(def);
  return { id: def.id, sk, ...(def.legend ? { leg: def.legend } : {}), cost: COIN_COST[def.rarity] || 3, until: Date.now() + (12 + Math.random() * 12) * H };
}
// her three things: each replaced when its time is up (bought or not)
export function oldStock(P) {
  const S = P.oldone && Array.isArray(P.oldone.items) && P.oldone.items.length === 3 && P.oldone.items.every((q) => q && q.until) ? P.oldone : (P.oldone = { items: [null, null, null] });
  const used = new Set(S.items.filter(Boolean).map((q) => q.id));
  // (6.1.9) one given for stays, dimmed, until its own time is up; only then does she lay out another
  S.items = S.items.map((q) => (q && q.until > Date.now() ? q : (() => { const n = rollOne(used); used.add(n.id); return n; })()));
  return S;
}
// (6.1.8) her lure hangs at the cave's mouth over the west end of the table (render.js sways it a little about here):
// near it, the hand opens what she has, all three things at once
export const LURE = { x: TABLE.x0 + 1.5, y: TABLE.y - 6.2 }; // just west of her first thing, so the two never share a reach
export const nearLure = (x, y, r = 2.4) => Math.hypot(x - LURE.x, y - LURE.y) < r;
export const leftOf = (q) => Math.max(0, (q.until - Date.now()) / 1000);

// what Earl is over: one of her things, or a bundle. From the sub, the sub's middle counts.
export function overTable(x, y) {
  if (y < TABLE.y - 9 || y > TABLE.y + 0.5 || x < TABLE.x0 - 2 || x > TABLE.x1 + 2) return null;
  let best = null, bd = 1.7;
  SLOTS.forEach((sx, i) => { const d = Math.abs(x - sx); if (d < bd) { bd = d; best = { kind: 'item', i, x: sx }; } });
  for (const c of CHEST_SLOTS) { const d = Math.abs(x - c.x); if (d < bd) { bd = d; best = { kind: 'chest', key: c.key, x: c.x }; } }
  return best;
}

// the table, and what is on it
const IMG = new Map();
function imgOf(def, picture) {
  if (IMG.has(def.id)) return IMG.get(def.id);
  const im = new Image(); im.src = picture(def.kind, def, 200, 120, true); IMG.set(def.id, im); return im;
}
export function drawTable(ctx, S, Sy, ppm, t, P, picture, hover) {
  const m = ppm, ty = Sy(TABLE.y), x0 = S(TABLE.x0), x1 = S(TABLE.x1);
  // the slab: a rough, flat stone, thicker where it goes into the cliff
  ctx.save();
  const g = ctx.createLinearGradient(0, ty, 0, ty + 1.6 * m); g.addColorStop(0, '#5a5650'); g.addColorStop(1, '#2a2824');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 3 * m, ty - 0.1 * m);
  for (let k = 0; k <= 12; k++) { const x = x0 + (x1 - x0) * (k / 12); ctx.lineTo(x, ty + Math.sin(k * 2.7) * 0.08 * m); }
  ctx.lineTo(x1 + 0.4 * m, ty + 0.5 * m); ctx.lineTo(x1 - 1 * m, ty + 1.1 * m); ctx.lineTo(x0, ty + 2.2 * m); ctx.lineTo(x0 - 3 * m, ty + 3 * m); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(200,190,160,0.18)'; ctx.lineWidth = Math.max(1, 0.06 * m); ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x1, ty); ctx.stroke(); // its worn edge
  // old marks scratched into it, and a little silt
  ctx.fillStyle = 'rgba(150,140,110,0.25)'; for (let k = 0; k < 18; k++) { const x = x0 + ((k * 0.618) % 1) * (x1 - x0); ctx.fillRect(x, ty - 0.06 * m, (0.3 + (k % 3) * 0.2) * m, 0.06 * m); }
  // (6.1.1) her three things, laid out
  const st = P && oldStock(P); /* (6.1.1) a thing whose time is up is replaced even while she is on screen */
  if (st) SLOTS.forEach((sx, i) => {
    const it = st.items[i]; if (!it) return;
    const X = S(sx), w = 2.4 * m, h = 1.44 * m;
    const def = ITEMS[it.id]; if (!def) return;
    const im = imgOf(def, picture);
    if (im.complete) { ctx.save(); if (it.sold) { ctx.globalAlpha = 0.3; ctx.filter = 'saturate(0.3)'; } /* (6.1.9) given for: dim until it goes */ ctx.translate(X, ty - h * 0.42); ctx.rotate(((i * 37) % 7 - 3) * 0.02); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
    if (hover && hover.kind === 'item' && hover.i === i) { ctx.strokeStyle = 'rgba(200,225,230,0.55)'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.setLineDash([0.2 * m, 0.15 * m]); ctx.beginPath(); ctx.ellipse(X, ty - h * 0.42, w * 0.6, h * 0.62, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  });
  if (hover && hover.kind === 'chest') { ctx.strokeStyle = 'rgba(200,225,230,0.55)'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.setLineDash([0.2 * m, 0.15 * m]); ctx.beginPath(); ctx.ellipse(S(hover.x), ty - 1.1 * m, 1.8 * m, 1.4 * m, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
