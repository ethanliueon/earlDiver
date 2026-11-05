// Catching animals alive: the net and the slurp gun, the specimen bag, the sub's tank, and what
// happens to an animal between the catch and the sale (handling, time, coming up too fast).
import { clamp, dist } from './util.js';
import { WEIGHT, gear, owns, statValue } from './economy.js';
import { canTakeLive, isTagOnly, liveValue, fragile, conditionName } from './specimens.js';
import { variantMult, variantName } from './variants.js';

export const bagSlots = (g) => Math.round(statValue(g.profile, 'bag'));
export const tankSlots = (g) => Math.round(statValue(g.profile, 'subTank'));

// the tool in his hand: 'net' or 'slurp' (if he owns one)
export function activeTool(g) {
  const P = g.profile;
  const T = (kind, k) => { const def = gear(P, k); return { kind, def, tier: def.look }; };
  if (g.toolSel === 'slurp' && owns(P, 'slurp')) return T('slurp', 'slurp');
  if (g.toolSel === 'trap') return { kind: 'trap', def: null, tier: 0 };
  if (g.toolSel === 'tag' && owns(P, 'tagger')) return T('tag', 'tag');
  if (g.toolSel === 'cam' && owns(P, 'camera')) return T('cam', 'cam');
  return T('net', 'net');
}

// where his hand is, and which way he faces (world metres)
// (upright or swimming, his hands work about half a metre in front of him at chest height)
export function handPos(g) {
  const e = g.earl;
  const swim = Math.abs(Math.cos(e.angle)); // 1 swimming flat, ~0.4 upright
  return { x: e.x + e.facing * (0.17 + 0.17 * swim), y: e.y + 0.03, fx: e.facing };
}

// What is in reach of the tool right now: the best animal it can take, or why it can't.
export function findCatch(g) {
  const e = g.earl, W = g.world;
  if (e.inSub || g.mode !== 'play') return null;
  const { def, kind } = activeTool(g);
  if (kind !== 'net' && kind !== 'slurp') return null;
  const h = handPos(g);
  const reach = def.range + 0.7;
  let best = null, bd = 1e9, blocked = null, bbd = 1e9;
  const consider = (sp, x, y, len, ref) => {
    if ((x - h.x) * h.fx < -0.8) return; // behind him
    // to the edge of the animal, and the sweep covers a little more height than length
    const d = Math.hypot(x - h.x, (y - h.y) * 0.75) - len * 0.5;
    if (d > reach) return;
    let why = null;
    if (!canTakeLive(sp)) why = isTagOnly(sp) ? 'needs a tag' : null;
    else if (len > def.maxLen) why = isTagOnly(sp) && len > 1.1 ? 'needs a tag' : `too big for the ${kind === 'net' ? def.name.toLowerCase() : def.name.toLowerCase()}`;
    if (why === null && !canTakeLive(sp)) return; // plants, corals: not even worth mentioning
    if (why) { if (d < bbd) { bbd = d; blocked = { sp, why, d }; } return; }
    if (d < bd) { bd = d; best = { sp, x, y, len, d, ...ref }; }
  };
  for (const c of g.fauna.list) if (!c.dead && !(c.att && c.att.s !== 'idle')) consider(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
  for (const s of W.statics) {
    if (Math.abs(s.x - h.x) > reach + 3) continue;
    consider(s.sp, s.x, s.y - Math.min(0.5, s.sp.len * s.scale * 0.3), s.sp.len * s.scale, { s, variant: s.variant });
  }
  if (best) {
    best.value = liveValue(best.sp, best.len) * variantMult(best.variant); best.name = variantName(best.sp, best.variant);
    best.chance = catchChance(def, kind, best);
  }
  return best ? { ok: true, ...best } : blocked ? { ok: false, ...blocked } : null;
}

// the odds of a catch: the tool, and whether the animal is already bolting
export function catchChance(def, kind, tgt) {
  const fleeing = tgt.c && tgt.c.fleeT > 0;
  let chance = def.success * (fleeing ? (kind === 'slurp' ? 0.9 : 0.8) : 1);
  if (tgt.s) chance = Math.min(0.97, chance + 0.2); // things on the bottom don't swim off
  return chance;
}

// Start a sweep / a shot. Returns a message for the player, or null when it starts.
export function useTool(g) {
  const e = g.earl;
  if (e.inSub) return 'Not from inside the submersible';
  if (g.capture) return null; // already mid-swing
  if ((g.toolCool || 0) > 0) return null;
  if (g.bag.length >= bagSlots(g)) return 'Bag full — get to the sub or the boat';
  const { kind, def, tier } = activeTool(g);
  const lock = findCatch(g);
  g.capture = { kind, def, tier, t: 0, dur: def.time, resolveAt: kind === 'net' ? 0.35 : 0.12, done: false, lock: lock && lock.ok ? lock : null };
  if (e.y > 200) g.entity.disturb(g, def.noise);
  return null;
}

// Advance the sweep; at the right moment, see what it caught. Returns events for the HUD/audio.
export function updateCapture(g, dt) {
  const ev = [];
  g.toolCool = Math.max(0, (g.toolCool || 0) - dt);
  if (g.netCatch) { g.netCatch.t += dt; if (g.netCatch.t > 1.1) g.netCatch = null; }
  if (g.slurpHeld) { g.slurpHeld.t += dt; if (g.slurpHeld.t > 1.6) g.slurpHeld = null; }
  for (let i = g.captureFx.length - 1; i >= 0; i--) { const f = g.captureFx[i]; f.t += dt; if (f.t > f.dur) g.captureFx.splice(i, 1); }
  const cap = g.capture;
  if (!cap || cap.kind === 'tag' || cap.kind === 'cam') return ev;
  cap.t += dt;
  if (!cap.done && cap.t >= cap.dur * cap.resolveAt) {
    cap.done = true;
    // the animal he swung at, if it is still within reach (with some slack for the swing);
    // otherwise whatever is in reach now
    let tgt = null;
    const L = cap.lock;
    if (L && !(L.c && L.c.dead) && !(L.s && !g.world.statics.includes(L.s))) {
      const h = handPos(g), x = L.c ? L.c.x : L.x, y = L.c ? L.c.y : L.y;
      if (Math.hypot(x - h.x, (y - h.y) * 0.75) - L.len * 0.5 < cap.def.range + 1.3) tgt = Object.assign({}, L, { x, y });
    }
    if (!tgt) tgt = findCatch(g);
    const e = g.earl;
    if (!tgt || !tgt.ok) ev.push({ type: 'miss', why: tgt ? tgt.why : null, sp: tgt && tgt.sp });
    else {
      const { def, kind } = cap;
      if (Math.random() < catchChance(def, kind, tgt)) {
        const harm = def.harm * (fragile(tgt.sp) ? 2 : 1) + Math.random() * 0.05;
        const spec = { id: tgt.sp.id, len: tgt.len, cond: clamp(1 - harm, 0.05, 1), from: Math.round(Math.max(e.y, tgt.y)), t: g.time };
        if (tgt.variant) { spec.variant = tgt.variant; spec.mult = variantMult(tgt.variant); if (tgt.variant === 'crimson') g.entity.disturb(g, 0.08); }
        if (tgt.c) tgt.c.dead = true;
        if (tgt.s) g.world.statics.splice(g.world.statics.indexOf(tgt.s), 1);
        g.bag.push(spec);
        g.captureFx.push({ sp: tgt.sp, len: tgt.len, x: tgt.x, y: tgt.y, dir: tgt.c ? tgt.c.dir : 1, t: 0, dur: kind === 'slurp' ? 0.25 : 0.3, kind });
        if (kind === 'net') g.netCatch = { sp: tgt.sp, len: tgt.len, t: 0 };
        else g.slurpHeld = { sp: tgt.sp, len: tgt.len, t: 0 };
        ev.push({ type: 'caught', sp: tgt.sp, spec, name: variantName(tgt.sp, tgt.variant) });
      } else {
        ev.push({ type: 'missed', sp: tgt.sp, name: variantName(tgt.sp, tgt.variant) });
        if (tgt.c) tgt.c.fleeT = 2.2;
      }
      // the commotion scares off whatever else is close
      for (const c of g.fauna.list) if (c !== tgt.c && c.flee > 0 && dist(c.x, c.y, e.x, e.y) < 3.5) c.fleeT = Math.max(c.fleeT, 1.5);
    }
  }
  if (cap.t >= cap.dur) { g.capture = null; g.toolCool = cap.kind === 'slurp' ? 0 : 0.15; }
  return ev;
}

// Specimens between the catch and the sale. A bag is rougher than the sub's tank; and an animal
// from deep water, brought up fast, is hurt by the pressure change (unless in a canister).
export function updateSpecimens(g, dt) {
  const e = g.earl, deaths = [];
  const canisters = g.addons && g.addons.canisters;
  const rise = -(e.inSub ? g.sub.vy : e.vy); // m/s upward
  const tick = (s, inBag) => {
    if (s.cond <= 0.05) return;
    const before = s.cond;
    if (inBag) s.cond -= dt * 0.0005;
    // per metre climbed above where it was caught: worse the faster he rises, and the deeper it lived.
    // From 300 m at full sub speed it arrives stressed; from 1,000 m it does not survive.
    if (!canisters && rise > 1 && e.y < s.from - 5 && s.from > 40) s.cond -= rise * dt * 0.001 * clamp((rise - 1) / 4, 0, 1.5) * clamp(s.from / 300, 0.3, 1.5);
    s.cond = clamp(s.cond, 0, 1);
    if (before > 0.05 && s.cond <= 0.05) deaths.push(s);
  };
  for (const s of g.bag) tick(s, true);
  for (const s of g.subTank) tick(s, false);
  return deaths;
}
// boarding the sub: specimens move from the bag into the tank (as many as fit)
export function transferToTank(g) {
  let n = 0;
  while (g.bag.length && g.subTank.length < tankSlots(g)) { g.subTank.push(g.bag.shift()); n++; }
  return n;
}

// what he is carrying, in kg (salvage only; animals in the bag weigh little)
export function loadKg(g) {
  let kg = 0;
  for (const [k, n] of Object.entries(g.inv)) kg += (WEIGHT[k] || 0) * n;
  return kg + g.bag.length * 0.3;
}
// a heavy load: slower, and harder breathing. Light loads (under 10 kg) cost nothing.
export const loadSpeed = (kg) => 1 - clamp((kg - 10) / 60, 0, 0.4);
export const loadAir = (kg) => 1 + Math.max(0, kg - 10) / 80;

export { conditionName };
