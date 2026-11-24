// Box traps on a line: set from the surface at a chosen depth, each hangs from a buoy (or rests on the bottom if the
// line is let all the way down). (7.3.0, owner) One trap set at a time, and it belongs to the save, not the dive: it
// fishes in real time, the game open or closed and Earl alive or not, and the catch waits in it once its time is up.
//   Wire pot  5 minutes, 5 animals;  Fish trap  30 minutes, 10 animals;  Deep trap (Dave's)  4 hours, 20 animals.
// What comes in is what lives at that depth there, met as often as anywhere else (exotics 3 %, legendaries 0.05 %).
// Emptied into the bag from the buoy at the surface (the deep trap only by the boat's winch) or at the trap itself;
// whatever does not fit stays in it. Brought up from deep water, an animal suffers the climb as one in the bag does
// (capture.js), and a dead one sells for half. Emptied with its time up, the trap comes up and is stowed.
import { clamp, dist } from './util.js';
import { TRAPS, TRAP_ORDER } from './economy.js';
import { SPECIES } from './species.js';
import { canTakeLive, spawnLen, rarityShare } from './specimens.js';
import { rollVariant, variantMult, canBeRare } from './variants.js';
import { bagSlots, bagUsed } from './capture.js';
import { BOAT } from './world.js';
import { climateOk } from './fauna.js';

const now = () => Date.now();
// the trap that is set, kept in the save: { type, x, depth, onBottom, at (ms, real time), id, n, drawn, catch }
export const trapSet = (P) => (P && P.trapSet) || null;
export const trapElapsed = (S) => Math.max(0, (now() - S.at) / 1000);
export const trapLeft = (S) => Math.max(0, TRAPS[S.type].dur - trapElapsed(S));
export const trapDone = (S) => trapLeft(S) <= 0;
// "4 h 12 min", "25 min", "40 s"
export const timeLeftText = (sec) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min` : sec >= 60 ? `${Math.ceil(sec / 60)} min` : `${Math.ceil(sec)} s`);

// what could find its way into a trap hanging at depth d (on the bottom or not) at x
const NEVER = /Coral|Kelp|Starfish|Worms|Jelly|Marine Mammals/;
function candidates(g, T, x, d, onBottom) {
  const fl = g.world.floorAt(x), above = fl - d, night = g.day && g.day.light < 0.3;
  const out = [];
  for (const s of SPECIES) {
    if (!canTakeLive(s) || s.len > T.maxLen || d < s.dmin || d > s.dmax || NEVER.test(s.cat)) continue;
    if (/turtle|seahorse|seadragon|pipefish|nudibranch|clam|mussel|oyster|scallop|conch|abalone|gardeneel|stone|frog/.test(s.v.s)) continue;
    const h = s.v.hab;
    // where it lives decides whether this trap is anywhere near it
    if (h === 'floor' && !onBottom) continue;                       // crabs, lobsters, octopus: only a trap on the bottom
    if (h === 'floor-swim' && above > 3) continue;
    if (h === 'demersal' && above > 25) continue;
    if (h === 'reef' && (above > 15 || !(x > 4900 || x < 34))) continue; // reef fish: low over the reef itself
    if (h === 'drift' || h === 'drift-low' || h === 'surface') continue;
    const pref = g.fauna.depthPref ? g.fauna.depthPref(s, x, Math.min(d, fl - 2.5), night) : 1; // (bands stop just above the bottom)
    if (pref < 0.12) continue;                                       // only where it is reasonably common
    if (!climateOk(s.id, x)) continue;                               // warm-water animals on the warm reefs, cold-water ones off them
    out.push([s, pref / (0.6 + s.len)]);                            // the small and the common come first
  }
  return rarityShare(out); // (7.3.0) met as often as anywhere: exotics 3 %, legendaries 0.05 %
}
function pick(list) {
  let tot = 0; for (const [, w] of list) tot += w;
  let r = Math.random() * tot;
  for (const [s, w] of list) { r -= w; if (r <= 0) return s; }
  return list.length ? list[0][0] : null;
}

export const trapsOwned = (g) => g.profile.traps || {};
// (7.3.0) one trap of each kind is owned; it is free unless it is the one set
export function trapsFree(g, type) { const S = trapSet(g.profile); return (trapsOwned(g)[type] || 0) - (S && S.type === type ? 1 : 0); }
export const anyTrapsFree = (g) => TRAP_ORDER.some((k) => trapsFree(g, k) > 0);
// old saves: the wire pot and fish trap stay; the old steel pot and deep cage become the deep trap; one of each at most
// (once, 7.3.0) every trap beyond one of each kind is refunded at half what it cost (old prices: steel pot $17,500, deep
// cage $90,000), and whatever was set in the water in the old way is simply back in the locker
const OLD_PRICE = { pot: 130, fish: 1600, steel: 17500, cage: 90000, deep: 17500 };
export function convertOldTraps(P) {
  const t = P.traps || {};
  if (!P.trapsV) {
    P.trapsV = 3; let back = 0;
    const deepish = ['steel', 'deep', 'cage'].map((k) => [k, t[k] || 0]).filter(([, n]) => n > 0);
    const keep = deepish.sort((a, b) => (OLD_PRICE[b[0]] || 0) - (OLD_PRICE[a[0]] || 0))[0]; // the dearest becomes the deep trap
    for (const [k, n] of Object.entries(t)) { const extra = n - (k === 'pot' || k === 'fish' ? 1 : keep && keep[0] === k ? 1 : 0); if (extra > 0) back += extra * (OLD_PRICE[k] || 0) * 0.5; }
    t.cage = keep ? 1 : 0; delete t.steel; delete t.deep;
    if (back > 0) { P.cash = (P.cash || 0) + Math.round(back); P.trapRefund = Math.round(back); }
  }
  P.traps = Object.fromEntries(TRAP_ORDER.map((k) => [k, Math.min(1, t[k] || 0)]));
}

// where a trap may be set from: at the surface, outside the sub, over enough water, and none set already
export function canSetHere(g) {
  const e = g.earl, S = trapSet(g.profile);
  if (S) return `Your ${TRAPS[S.type].name.toLowerCase()} is already set: empty it first`;
  if (e.inSub) return 'Traps are set by hand: get out of the sub, at the surface';
  if (e.y > 2.5) return 'Traps are set from the surface: come up first';
  if (g.world.floorAt(e.x) < 3) return 'Too shallow here for a trap';
  if (!anyTrapsFree(g)) return 'No trap to set (buy one at the boat)';
  return null;
}
// lower a trap of this type on a line to this depth (resting on the bottom if it reaches it)
export function setTrap(g, type, depth) {
  const T = TRAPS[type], e = g.earl, fl = g.world.floorAt(e.x);
  const d = clamp(Math.round(depth), 2, Math.min(T.maxDepth, fl - 0.4));
  g.profile.trapSet = { type, x: e.x, depth: d, onBottom: d >= fl - 0.6, at: now(), id: Math.random().toString(36).slice(2), n: T.count, drawn: 0, catch: [] };
  g.traps = []; syncTraps(g); g.traps[0].y = 0.6; g.traps[0].state = 'lowering';
  return d;
}
// the trap as the world draws it (g.traps), made from the save's (the catch is the save's own list)
export function syncTraps(g) {
  const S = trapSet(g.profile);
  if (!S) { if (g.traps.length && g.traps[0].state !== 'hauling') g.traps = []; return; }
  let t = g.traps.find((q) => q.id === S.id);
  if (!t) { t = { type: S.type, x: S.x, depth: S.depth, y: S.depth, onBottom: S.onBottom, state: 'set', age: 0, catch: S.catch, coming: [], sway: Math.random() * 6, id: S.id }; g.traps = [t]; }
  t.catch = S.catch;
}

// a fish drawn to a trap: if the trap is in sight a real fish swims in through a funnel; otherwise it is simply there
function lure(g, t, sp, cam) {
  const spec = { id: sp.id, len: Math.min(spawnLen(sp), TRAPS[t.type].maxLen), cond: 0.92 + Math.random() * 0.06, from: t.depth, t: g.time };
  if (g.fauna.caught && g.fauna.caught.has(sp.id) && canBeRare(sp)) {
    const v = rollVariant(Math.random, t.depth, g.fauna.entityNear);
    if (v) { spec.variant = v; spec.mult = variantMult(v); if (v === 'giant') spec.len = Math.min(spec.len * 1.7, TRAPS[t.type].maxLen); }
  }
  const seen = cam && t.state === 'set' && Math.abs(t.x - cam.x) < cam.w * 0.9 && Math.abs(t.y - cam.y) < cam.h * 0.9;
  if (!seen) { t.catch.push(spec); return; }
  const F = g.fauna;
  let c = F.list.find((f) => f.sp.id === sp.id && !f.dead && !f.ctrl && !F.schools.has(f.gid) && dist(f.x, f.y, t.x, t.y) < 18);
  if (!c) { const side = Math.random() < 0.5 ? -1 : 1, sx = t.x + side * (cam.w * 0.5 + 1), sy = clamp(t.y + (Math.random() - 0.5) * 4, 1, g.world.floorAt(sx) - 0.5); c = F.makeFish(sp, sx, sy, -side, F.groupId++, true); F.list.push(c); }
  c.ctrl = { x: t.x, y: t.y - TRAPS[t.type].size[1] * 0.45, speed: Math.max(1.0, Math.min(2.0, c.cruise * 1.6)) };
  c.toTrap = t.id; c.len = spec.len;
  t.coming.push({ c, spec, t0: g.time });
}

export function updateTraps(g, dt, cam) {
  const ev = []; syncTraps(g);
  const S = trapSet(g.profile);
  for (let i = g.traps.length - 1; i >= 0; i--) {
    const t = g.traps[i], T = TRAPS[t.type];
    if (t.state === 'lowering') {
      t.y = Math.min(t.depth, t.y + Math.max(2, t.depth / 18) * dt);
      if (t.y >= t.depth - 0.01) { t.y = t.depth; t.state = 'set'; ev.push({ type: 'settled', trap: t }); }
    } else if (t.state === 'set' && S && S.id === t.id) {
      // arrivals by real time: as many as are due, each an animal that lives here (all at once after a long absence)
      const due = Math.min(S.n, Math.floor(S.n * Math.min(1, trapElapsed(S) / T.dur)));
      let list = null;
      while (S.drawn < due) { S.drawn++; list = list || candidates(g, T, t.x, t.depth, t.onBottom); const sp = pick(list); if (sp) lure(g, t, sp, cam); }
      for (let k = t.coming.length - 1; k >= 0; k--) {
        const { c, spec } = t.coming[k];
        if (c.dead || !c.ctrl || g.time - t.coming[k].t0 > 60) { if (c && !c.dead) c.ctrl = null; S.catch.push(spec); t.coming.splice(k, 1); continue; } // chased off or slow: it is in anyway
        c.ctrl.x = t.x; c.ctrl.y = t.y - T.size[1] * 0.45;
        if (dist(c.x, c.y, c.ctrl.x, c.ctrl.y) < Math.max(0.35, T.size[0] * 0.3)) { c.dead = true; S.catch.push(spec); t.coming.splice(k, 1); ev.push({ type: 'entered', trap: t, sp: c.sp }); }
      }
      if (!S.doneSaid && trapDone(S) && S.drawn >= S.n) { S.doneSaid = true; ev.push({ type: 'done', trap: t }); }
      // the deep trap's light, below 200 m, draws attention
      if (T.lure && t.y > 200 && !g.entity.marked) g.entity.attn = Math.min(1, g.entity.attn + dt * 0.0012);
    } else if (t.state === 'hauling') {
      const rise = T.winch ? Math.max(3, t.depth / 45) : Math.max(1.68, t.depth / 40);
      t.y -= rise * dt;
      if (t.y <= 0.4) { g.traps.splice(i, 1); ev.push({ type: 'stowed', trap: t }); }
    }
  }
  return ev;
}

// a trap within reach: its buoy from the surface (empty it from there), or the trap itself underwater - by Earl, or
// from the sub (which reaches a little further)
export function trapNear(g) {
  const e = g.earl;
  for (const t of g.traps) {
    if (t.state !== 'set') continue;
    if (g.helm && Math.abs(BOAT.x - t.x) < 14) return { t, how: 'haul' }; // from the helm: her winch, over the buoy
    if (dist(e.x, e.y, t.x, t.y - 0.5) < (e.inSub ? 5 : 2.6)) return { t, how: 'empty' };
    if (!e.inSub && e.y < 2 && Math.abs(e.x - t.x) < 3) {
      if (TRAPS[t.type].winch && Math.abs(BOAT.x - t.x) > 14) return { t, how: 'needboat' };
      return { t, how: 'haul' };
    }
  }
  return null;
}
// into the bag, whatever fits; from the surface (how 'haul') the catch has come up from the trap's depth, and suffers
// the climb in the bag as anything does. Emptied with its time up, the trap comes up and is stowed (a fresh one can
// be set); before then it stays and keeps fishing
export function emptyTrap(g, t, how = 'empty') {
  const S = trapSet(g.profile); if (!S || S.id !== t.id) return { n: 0, left: 0, stowed: false };
  let n = 0;
  while (S.catch.length && bagUsed(g) < bagSlots(g)) { const q = S.catch.shift(); if (how === 'haul') q.t = g.time; g.bag.push(q); n++; }
  const stowed = !S.catch.length && trapDone(S) && S.drawn >= S.n;
  if (stowed) { g.profile.trapSet = null; t.state = 'hauling'; }
  return { n, left: S.catch.length, stowed };
}
// (7.3.0) a death no longer takes the trap: it belongs to the save, and fishes on
export function lostTraps(g) { for (const t of g.traps) for (const { c } of t.coming || []) if (c) c.ctrl = null; return 0; }
