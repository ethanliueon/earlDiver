// Traps on the seabed: set one, leave it, come back. A line runs from each trap to a buoy at the
// surface, so a shallow pot can be hauled from the boat side without diving. They fill slowly with
// whatever lives on the bottom there. A deep trap's lit bait draws deep fish, and something else.
import { clamp, dist } from './util.js';
import { TRAPS } from './economy.js';
import { SPECIES } from './species.js';
import { canTakeLive } from './specimens.js';
import { rollVariant, variantMult } from './variants.js';
import { bagSlots } from './capture.js';

const BOTTOM = new Set(['floor', 'floor-swim', 'demersal']);
// what could wander into a trap at this depth
function candidates(type, depth) {
  const T = TRAPS[type];
  return SPECIES.filter((s) => BOTTOM.has(s.v.hab) && canTakeLive(s) && s.len <= T.maxLen && depth >= s.dmin && depth <= s.dmax &&
    // what really walks or swims into a baited trap: crustaceans, octopus, eels, bottom fish
    !/Coral|Kelp|Seahorse|Starfish|Shellfish|Worms|Jelly/.test(s.cat) && s.v.s !== 'gardeneel' && s.v.s !== 'stone' && s.v.s !== 'frog');
}
export const trapsOwned = (g) => (g.profile.traps || { pot: 0, deep: 0 });
export function trapsFree(g, type) { return (trapsOwned(g)[type] || 0) - g.traps.filter((t) => t.type === type).length; }

// set a trap on the bottom below him (the right kind for the depth)
export function placeTrap(g) {
  const e = g.earl, fl = g.world.floorAt(e.x);
  if (e.inSub) return 'Traps are set by hand — get out of the sub';
  if (fl - e.y > 3) return 'Get down to the bottom to set a trap';
  const type = fl <= TRAPS.pot.maxDepth && trapsFree(g, 'pot') > 0 ? 'pot' : trapsFree(g, 'deep') > 0 ? 'deep' : null;
  if (!type) return trapsFree(g, 'pot') > 0 ? `A wire pot is rated to ${TRAPS.pot.maxDepth} m — this needs a deep trap` : 'No traps left to set';
  if (fl > TRAPS[type].maxDepth) return `Too deep for the ${TRAPS[type].name.toLowerCase()}`;
  g.traps.push({ type, x: e.x, y: fl, catch: [], rollT: TRAPS[type].every, state: 'set', depth: Math.round(fl), sway: Math.random() * 6 });
  return null;
}

export function updateTraps(g, dt) {
  const ev = [];
  for (let i = g.traps.length - 1; i >= 0; i--) {
    const t = g.traps[i], T = TRAPS[t.type];
    if (t.state === 'set') {
      t.rollT -= dt;
      if (t.rollT <= 0) {
        t.rollT = T.every * (0.7 + Math.random() * 0.6);
        if (t.catch.length < T.holds && Math.random() < T.chance) {
          const c = candidates(t.type, t.depth);
          if (c.length) {
            const sp = c[Math.floor(Math.random() * c.length)];
            const spec = { id: sp.id, len: sp.len * (0.75 + Math.random() * 0.4), cond: 0.9 + Math.random() * 0.08, from: t.depth, t: g.time };
            if (g.fauna.caught && g.fauna.caught.has(sp.id)) {
              const v = rollVariant(Math.random, t.depth, g.fauna.entityNear);
              if (v) { spec.variant = v; spec.mult = variantMult(v); if (v === 'giant') spec.len *= 1.7; }
            }
            t.catch.push(spec);
          }
        }
      }
      // the deep trap's lit bait, below 200 m, keeps drawing a little attention
      if (t.type === 'deep' && t.y > 200 && !g.entity.marked) g.entity.attn = Math.min(1, g.entity.attn + dt * 0.0012);
    } else if (t.state === 'hauling') {
      // coming up the line at 1.5 m/s; what is in it feels the pressure change
      const rise = 1.5;
      t.y -= rise * dt;
      for (const s of t.catch) if (!(g.addons && g.addons.canisters) && s.from > 40 && t.y < s.from - 5) s.cond = Math.max(0, s.cond - rise * dt * 0.001 * 0.125 * clamp(s.from / 300, 0.3, 1.5));
      if (t.y <= 0.6) { g.traps.splice(i, 1); ev.push({ type: 'hauled', trap: t }); }
    }
  }
  return ev;
}
// a trap he can reach: underwater beside it, or at the surface by its buoy
export function trapNear(g) {
  const e = g.earl;
  if (e.inSub) return null;
  for (const t of g.traps) {
    if (t.state !== 'set') continue;
    if (dist(e.x, e.y, t.x, t.y - 0.5) < 2.6) return { t, how: 'empty' };
    if (e.y < 2 && Math.abs(e.x - t.x) < 3) return { t, how: 'haul' };
  }
  return null;
}
// emptying it into the bag (whatever fits); the trap stays set
export function emptyTrap(g, t) {
  let n = 0;
  while (t.catch.length && g.bag.length < bagSlots(g)) { g.bag.push(t.catch.shift()); n++; }
  return n;
}
