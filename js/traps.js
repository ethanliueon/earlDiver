// Box traps on a line: set from the surface at a chosen depth, each hangs from a buoy (or rests on
// the bottom if the line is let all the way down). Over five minutes the bait draws fish in: real
// animals that live at that depth and in that kind of place swim up, find a funnel and go in. A
// trap is hauled up at the buoy (by hand for the small ones, by the boat's winch for the big ones)
// or emptied where it hangs, by Earl or from the sub. Leave a full trap too long and the catch dies;
// leave it longer and it breaks loose from its buoy and drifts as a ghost net.
import { clamp, dist } from './util.js';
import { TRAPS, TRAP_ORDER } from './economy.js';
import { SPECIES } from './species.js';
import { canTakeLive } from './specimens.js';
import { rollVariant, variantMult, canBeRare } from './variants.js';
import { bagSlots } from './capture.js';
import { BOAT } from './world.js';
import { climateOk } from './fauna.js';

export const FILL_TIME = 300;   // the bait works for five minutes
const SPOIL_AFTER = 120;        // then, unhauled, the catch starts to die...
const GHOST_AFTER = 600;        // ...and after ten more minutes the trap breaks loose

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
  return out;
}
function pick(list) {
  let tot = 0; for (const [, w] of list) tot += w;
  let r = Math.random() * tot;
  for (const [s, w] of list) { r -= w; if (r <= 0) return s; }
  return list.length ? list[0][0] : null;
}

export const trapsOwned = (g) => g.profile.traps || {};
export function trapsFree(g, type) { return (trapsOwned(g)[type] || 0) - g.traps.filter((t) => t.type === type).length; }
export const anyTrapsFree = (g) => TRAP_ORDER.some((k) => trapsFree(g, k) > 0);
// old saves: wire pots become wire pots, deep traps become steel pots
export function convertOldTraps(P) {
  const t = P.traps || {};
  if (t.deep && !t.steel) { t.steel = Math.min(TRAPS.steel.max, t.deep); delete t.deep; }
  P.traps = Object.assign(Object.fromEntries(TRAP_ORDER.map((k) => [k, 0])), t);
}

// where a trap may be set from: at the surface, outside the sub, over enough water
export function canSetHere(g) {
  const e = g.earl;
  if (e.inSub) return 'Traps are set by hand: get out of the sub, at the surface';
  if (e.y > 2.5) return 'Traps are set from the surface: come up first';
  if (g.world.floorAt(e.x) < 3) return 'Too shallow here for a trap';
  if (!anyTrapsFree(g)) return 'No traps left to set (buy more at the boat)';
  return null;
}
// lower a trap of this type on a line to this depth (resting on the bottom if it reaches it)
export function setTrap(g, type, depth) {
  const T = TRAPS[type], e = g.earl, fl = g.world.floorAt(e.x);
  const d = clamp(Math.round(depth), 2, Math.min(T.maxDepth, fl - 0.4));
  const n = T.count[0] + Math.floor(Math.random() * (T.count[1] - T.count[0] + 1));
  // when each of its fish will arrive over the five minutes (a little bunched toward the start)
  const plan = Array.from({ length: n }, () => FILL_TIME * Math.pow(Math.random(), 1.3)).sort((a, b) => a - b);
  g.traps.push({ type, x: e.x, depth: d, y: 0.6, onBottom: d >= fl - 0.6, state: 'lowering', age: 0, plan, catch: [], coming: [],
    sway: Math.random() * 6, id: Math.random().toString(36).slice(2) });
  return d;
}

// a fish drawn to a trap: an animal near it turns toward a funnel and swims in. If the trap is out of
// sight the catch simply arrives; in sight, a real fish is sent (or one already near is turned).
function lure(g, t, sp, cam) {
  const spec = { id: sp.id, len: sp.len * (Math.min(0.6 + Math.random() * 0.55, 0.6 + Math.random() * 0.55) + (Math.random() < 0.08 ? 0.1 + Math.random() * 0.1 : 0)), cond: 0.92 + Math.random() * 0.06, from: t.depth, t: g.time };
  if (g.fauna.caught && g.fauna.caught.has(sp.id) && canBeRare(sp)) {
    const v = rollVariant(Math.random, t.depth, g.fauna.entityNear);
    if (v) { spec.variant = v; spec.mult = variantMult(v); if (v === 'giant') spec.len = Math.min(spec.len * 1.7, TRAPS[t.type].maxLen); }
  }
  const seen = cam && Math.abs(t.x - cam.x) < cam.w * 0.9 && Math.abs(t.y - cam.y) < cam.h * 0.9;
  if (!seen) { t.catch.push(spec); return; }
  const F = g.fauna;
  let c = F.list.find((f) => f.sp.id === sp.id && !f.dead && !f.ctrl && !F.schools.has(f.gid) && dist(f.x, f.y, t.x, t.y) < 18);
  if (!c) {
    // from just out of sight, upstream of the scent
    const side = Math.random() < 0.5 ? -1 : 1, sx = t.x + side * (cam.w * 0.5 + 1), sy = clamp(t.y + (Math.random() - 0.5) * 4, 1, g.world.floorAt(sx) - 0.5);
    c = F.makeFish(sp, sx, sy, -side, F.groupId++, true); F.list.push(c);
  }
  c.ctrl = { x: t.x, y: t.y - TRAPS[t.type].size[1] * 0.45, speed: Math.max(1.0, Math.min(2.0, c.cruise * 1.6)) };
  c.toTrap = t.id; c.len = spec.len;
  t.coming.push({ c, spec, t0: g.time });
}

export function updateTraps(g, dt, cam) {
  const ev = [];
  for (let i = g.traps.length - 1; i >= 0; i--) {
    const t = g.traps[i], T = TRAPS[t.type];
    if (t.state === 'lowering') {
      // it sinks on its line, quickly at first, settling at its depth
      t.y = Math.min(t.depth, t.y + Math.max(2, t.depth / 18) * dt);
      if (t.y >= t.depth - 0.01) { t.y = t.depth; t.state = 'set'; ev.push({ type: 'settled', trap: t }); }
    } else if (t.state === 'set') {
      t.age += dt;
      // the bait does its work: each planned arrival, a fish that lives here comes in
      while (t.plan.length && t.plan[0] <= t.age) {
        t.plan.shift();
        if (t.catch.length + t.coming.length >= T.holds) continue;
        const sp = pick(candidates(g, T, t.x, t.depth, t.onBottom));
        if (sp) lure(g, t, sp, cam);
      }
      // fish on their way in: in through a funnel, or given up if something chased them off
      for (let k = t.coming.length - 1; k >= 0; k--) {
        const { c, spec } = t.coming[k];
        if (c.dead || !c.ctrl) { t.coming.splice(k, 1); continue; }
        if (g.time - t.coming[k].t0 > 60) { c.ctrl = null; t.catch.push(spec); t.coming.splice(k, 1); continue; } // it got there out of sight
        c.ctrl.x = t.x; c.ctrl.y = t.y - T.size[1] * 0.45;
        if (dist(c.x, c.y, c.ctrl.x, c.ctrl.y) < Math.max(0.35, T.size[0] * 0.3)) { c.dead = true; t.catch.push(spec); t.coming.splice(k, 1); ev.push({ type: 'entered', trap: t, sp: c.sp }); }
      }
      // the deep cage's light, below 200 m, draws attention
      if (T.lure && t.y > 200 && !g.entity.marked) g.entity.attn = Math.min(1, g.entity.attn + dt * 0.0012);
      // left too long: the catch weakens and dies; then the trap tears free and drifts as a ghost net
      const over = t.age - FILL_TIME;
      if (over > SPOIL_AFTER) for (const s of t.catch) s.cond = Math.max(0, s.cond - dt / 240);
      if (over > SPOIL_AFTER && !t.warned) { t.warned = true; ev.push({ type: 'spoiling', trap: t }); }
      if (over > GHOST_AFTER) {
        g.traps.splice(i, 1);
        const P = g.profile; if (P.traps && P.traps[t.type] > 0) P.traps[t.type]--;
        g.world.pickups.push({ type: 'net', x: t.x, y: Math.min(t.y, g.world.floorAt(t.x) - 0.7), taken: false, phase: Math.random() * 6, animal: 'fish', ghost: true });
        ev.push({ type: 'ghost', trap: t });
      }
    } else if (t.state === 'hauling') {
      for (const { c } of t.coming) if (c) c.ctrl = null; // what was on its way loses interest
      t.coming.length = 0;
      // up the line: by hand at about his swimming speed, faster on the winch; never longer than ~45 s
      const rise = T.winch ? Math.max(3, t.depth / 45) : Math.max(1.68, t.depth / 40);
      t.y -= rise * dt;
      if (t.y <= 0.4) { t.y = 0; g.traps.splice(i, 1); ev.push({ type: 'hauled', trap: t }); }
    }
  }
  return ev;
}

// a trap within reach: its buoy from the surface (haul), or the trap itself underwater (empty) -
// by Earl, or from the sub (which reaches a little further)
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
// into the bag, whatever fits; the trap stays set and its bait keeps working
export function emptyTrap(g, t) {
  let n = 0;
  while (t.catch.length && g.bag.length < bagSlots(g)) { g.bag.push(t.catch.shift()); n++; }
  return n;
}
// on death the traps are lost with him
export function lostTraps(g) {
  const n = g.traps.reduce((a, t) => a + t.catch.length, 0);
  for (const t of g.traps) for (const { c } of t.coming) if (c) c.ctrl = null;
  g.traps = [];
  return n;
}
