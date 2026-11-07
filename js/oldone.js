// The old one (3.0.0): a giant humpback anglerfish in the mouth of her cave in the west wall, her lure lighting
// the water round her. No website: below her mouth a flat stone table juts from the cliff, and on it lie five
// things (Rare and Exotic, of any kind, an even split) and her two bundles, the Offering and the Reliquary.
// Earl looks at them from the sub (or swimming): over one, F shows what it is and what she wants for it.
// What lies there changes every three in-game days (a day is ten minutes of play).
import { CAVE } from './world.js';
import { ITEMS, CHEST_POOL, valueOf, kitOf, lockerFree } from './items.js';
import { rollSkillsFor } from './items.js';
import { drawChest } from './chests.js';
import { TAU } from './util.js';

export const TABLE = { x0: CAVE.x + 5.5, x1: CAVE.x + 27, y: CAVE.y + 9 }; // its top surface (y down)
export const DAY_S = 600;
const SLOTS = [62.5, 65.6, 68.7, 71.8, 74.9].map((x) => x - 52 + CAVE.x); // the five things, west to east
export const CHEST_SLOTS = [{ key: 'offering', x: CAVE.x + 7.6 }, { key: 'reliquary', x: CAVE.x + 25 }];
const MARKUP = 2.5; // she knows what they are worth

// her five things: rolled once, kept until three days have passed (things bought stay gone till then)
export function oldStock(P) {
  const day = Math.floor((P.playT || 0) / DAY_S);
  const S = P.oldone;
  if (S && S.items && day - S.day < 3) return S;
  const pool = { rare: CHEST_POOL.filter((it) => it.rarity === 'rare'), exotic: CHEST_POOL.filter((it) => it.rarity === 'exotic') };
  const items = [], used = new Set();
  for (let i = 0; i < 5; i++) {
    const r = Math.random() < 0.5 ? 'rare' : 'exotic', L = pool[r];
    let def; for (let k = 0; k < 20; k++) { def = L[Math.floor(Math.random() * L.length)]; if (!used.has(def.id)) break; }
    used.add(def.id);
    const sk = rollSkillsFor(def), q = { id: def.id, sk, ...(def.legend ? { leg: def.legend } : {}) };
    items.push({ ...q, price: Math.round(valueOf(q) * MARKUP / 50) * 50, sold: false });
  }
  P.oldone = { day, items };
  return P.oldone;
}
export const daysLeft = (P) => { const S = P.oldone; if (!S) return 3; return Math.max(0, 3 - (Math.floor((P.playT || 0) / DAY_S) - S.day)); };

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
  // her bundles at either end
  for (const c of CHEST_SLOTS) {
    ctx.save(); ctx.translate(S(c.x) - 1.3 * m, ty - 2.1 * m); drawChest(ctx, c.key, 2.6 * m, 2.4 * m, 0); ctx.restore();
  }
  // her five things, laid out; a sold one leaves a clean patch in the silt
  const st = P && P.oldone;
  if (st) SLOTS.forEach((sx, i) => {
    const it = st.items[i]; if (!it) return;
    const X = S(sx), w = 2.4 * m, h = 1.44 * m;
    if (it.sold) { ctx.fillStyle = 'rgba(90,86,76,0.5)'; ctx.fillRect(X - w * 0.35, ty - 0.08 * m, w * 0.7, 0.08 * m); return; }
    const def = ITEMS[it.id]; if (!def) return;
    const im = imgOf(def, picture);
    if (im.complete) { ctx.save(); ctx.translate(X, ty - h * 0.42); ctx.rotate(((i * 37) % 7 - 3) * 0.02); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
    if (hover && hover.kind === 'item' && hover.i === i) { ctx.strokeStyle = 'rgba(200,225,230,0.55)'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.setLineDash([0.2 * m, 0.15 * m]); ctx.beginPath(); ctx.ellipse(X, ty - h * 0.42, w * 0.6, h * 0.62, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  });
  if (hover && hover.kind === 'chest') { ctx.strokeStyle = 'rgba(200,225,230,0.55)'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.setLineDash([0.2 * m, 0.15 * m]); ctx.beginPath(); ctx.ellipse(S(hover.x), ty - 1.1 * m, 1.8 * m, 1.4 * m, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
export { lockerFree, kitOf };
