// Catching animals alive: the net and the slurp gun, the specimen bag, the sub's tank, and what
// happens to an animal between the catch and the sale (handling, time, coming up too fast).
import { clamp, dist } from './util.js';
import { pressureTolerance } from './specimens.js';
import { SPECIES_BY_ID } from './species.js';
import { WEIGHT, gear, owns, statValue } from './economy.js';
import { canTakeLive, isTagOnly, liveValue, fragile, conditionName } from './specimens.js';
import { variantMult, variantName } from './variants.js';

export const bagSlots = (g) => Math.round(statValue(g.profile, 'bag'));
export const tankSlots = (g) => Math.round(statValue(g.profile, 'subTank'));
// the sealed pressure tanks: separate places in the sub (specimens in them carry pressed: true)
export const pressSlots = (g) => Math.round(statValue(g.profile, 'pressTanks'));
// a big animal takes more of the open tank: one place to 60 cm, two to 1.2 m, three beyond
export const slotsOf = (s) => (s.len < 0.6 ? 1 : s.len < 1.2 ? 2 : 3);
export const tankUsed = (g) => g.subTank.reduce((a, s) => a + (s.pressed || s.pile ? 0 : slotsOf(s)), 0);
export const tankFits = (g, s) => tankUsed(g) + slotsOf(s) <= tankSlots(g);
// the large pressure tank (an add-on): a long steel cylinder in the tank room, one more pressure
// chamber that holds three animals, or one big one (1.2 m and up). Its specimens have chamber BIG.
export const BIG = 100;
export const hasBigTank = (g) => !!(g.addons || {}).bigTank;
export const bigIn = (g) => g.subTank.filter((s) => s.pressed && s.chamber === BIG);
export function bigFits(g, spec) {
  if (!hasBigTank(g)) return false;
  const inn = bigIn(g).filter((s) => s !== spec);
  if (!inn.length) return true;
  return spec.len < 1.2 && inn.length < 3 && !inn.some((s) => s.len >= 1.2);
}
export const pressUsed = (g) => g.subTank.reduce((a, s) => a + (s.pressed ? 1 : 0), 0);
// put a specimen in the sub: deep animals into a pressure tank if one is free, else the open tank
// the first free chamber, or -1
export function freeChamber(g) {
  const used = new Set(g.subTank.filter((s) => s.pressed).map((s) => s.chamber));
  for (let i = 0; i < pressSlots(g); i++) if (!used.has(i)) return i;
  return -1;
}
// seal a specimen into a chamber: the one asked for (if it is fitted and empty), or the first free one
export function seal(g, spec, want = -1) {
  if (want === BIG) {
    if (!bigFits(g, spec)) return false;
    spec.pressed = true; spec.chamber = BIG; delete spec.pile; spec.press = Math.max(0, g.sub.y);
    return true;
  }
  const used = new Set(g.subTank.filter((s) => s.pressed && s !== spec).map((s) => s.chamber));
  const c = want >= 0 ? (want < pressSlots(g) && !used.has(want) ? want : -1) : freeChamber(g);
  if (c < 0) return false;
  spec.pressed = true; spec.chamber = c; delete spec.pile;
  spec.press = Math.max(0, g.sub.y); // sealed at the pressure outside, then pumped up to its home
  return true;
}
export function stow(g, spec) {
  if ((spec.from || 0) > 100 && freeChamber(g) >= 0) { seal(g, spec); g.subTank.push(spec); return 'press'; }
  if (tankFits(g, spec)) { spec.pressed = false; g.subTank.push(spec); return 'tank'; }
  if (freeChamber(g) >= 0) { seal(g, spec); g.subTank.push(spec); return 'press'; }
  return null;
}
export const subFull = (g) => tankUsed(g) >= tankSlots(g) && pressUsed(g) >= pressSlots(g);

// the tool in his hand: 'net' or 'slurp' (if he owns one)
export function activeTool(g) {
  const P = g.profile;
  const T = (kind, k) => { const def = gear(P, k); return { kind, def, tier: def.look }; };
  if (g.toolSel === 'none') return { kind: 'none', def: null, tier: 0 }; // hands free
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
    if (!why && ref.c && ref.c.hidden) why = 'tucked into its home: wait, it will come out';
    if (why) { if (d < bbd) { bbd = d; blocked = { sp, why, d }; } return; }
    if (d < bd) { bd = d; best = { sp, x, y, len, d, ...ref }; }
  };
  for (const c of g.fauna.list) if (!c.dead && !c.pet && !(c.att && c.att.s !== 'idle')) consider(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
  for (const s of W.statics) {
    if (Math.abs(s.x - h.x) > reach + 3) continue;
    consider(s.sp, s.x, s.y - Math.min(0.5, s.sp.len * s.scale * 0.3), s.sp.len * s.scale, { s, variant: s.variant });
  }
  if (best) {
    best.value = liveValue(best.sp, best.len) * variantMult(best.variant); best.name = variantName(best.sp, best.variant);
    best.chance = catchChance(def, kind, best, g.luck || 0);
  }
  return best ? { ok: true, ...best } : blocked ? { ok: false, ...blocked } : null;
}

// the odds of a catch: the tool, and whether the animal is already bolting
export function catchChance(def, kind, tgt, luck = 0) {
  const fleeing = tgt.c && tgt.c.fleeT > 0;
  let chance = def.success * (fleeing ? (kind === 'slurp' ? 0.9 : 0.8) : 1);
  if (tgt.s) chance = Math.min(0.97, chance + 0.2); // things on the bottom don't swim off
  return Math.min(0.98, chance + luck);
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
      if (Math.random() < catchChance(def, kind, tgt, g.luck || 0)) {
        const harm = def.harm * (fragile(tgt.sp) ? 2 : 1) + Math.random() * 0.05;
        const spec = { id: tgt.sp.id, len: tgt.len, cond: clamp(1 - harm, 0.05, 1), from: Math.round(Math.max(e.y, tgt.y)), t: g.time };
        if (tgt.variant) { spec.variant = tgt.variant; spec.mult = variantMult(tgt.variant); if (tgt.variant === 'crimson') g.entity.disturb(g, 0.08); }
        if (tgt.c) tgt.c.dead = true;
        if (tgt.s) { g.world.statics.splice(g.world.statics.indexOf(tgt.s), 1); g.world.staticsVer = (g.world.staticsVer || 0) + 1; }
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

// Specimens between the catch and the sale. Every animal has a home depth (where it was caught,
// or where it has been slowly brought up to). What hurts is the gap between that and the pressure it
// is under now: in the bag, Earl's depth; in the open tank, the sub's; in a pressure chamber, what
// the chamber holds. A chamber's rating is how much more than the water outside it can hold: so it
// keeps an animal at its own pressure anywhere from its home depth up to (home - rating), and above
// that the animal feels the rest.
// Up to 150 m of gap, it lives, more stressed the bigger the gap; past that, it dies.
export const SAFE_GAP = 150, PUMP = 30;
export const ZONE = { ok: 50, stressed: 150, dying: 250, dead: 350 }; // metres from its own depth, times its tolerance
export const chamberRating = (g) => Math.round(statValue(g.profile, 'pressRating'));
// the most a chamber can hold right now: the water outside, plus its rating
export const chamberMax = (g) => Math.max(0, g.sub.y) + chamberRating(g);
export const homeOf = (s) => (s.home ?? s.from ?? 0);
// how far the pressure it is under is from its own, either way: taken deeper than it lives hurts it
// as surely as being brought up (signed: positive when it is under less pressure than its own)
export function gapSigned(g, s, inBag) {
  const felt = s.pressed ? (s.press || 0) : Math.max(0, inBag ? g.earl.y : g.sub.y);
  return homeOf(s) - felt;
}
export function gapOf(g, s, inBag) {
  return Math.abs(gapSigned(g, s, inBag));
}
export function updateSpecimens(g, dt) {
  const deaths = [], events = [];
  const cmax = chamberMax(g);
  const tick = (s, inBag) => {
    if (s.home === undefined) s.home = s.from || 0;
    if (s.cond <= 0.05) return;
    const before = s.cond;
    if (inBag) s.cond -= dt * 0.0005;
    if (s.pile) s.cond -= dt * 0.002; // heaped on the floor of the tank room, out of the water's support
    if (s.pressed) {
      if (s.press === undefined) s.press = Math.max(0, g.sub.y);
      // the chamber holds its rating either way: above the water outside, or (a shallow animal taken
      // deep) below it, as the sub's own sphere does
      const cmin = Math.max(0, Math.max(0, g.sub.y) - chamberRating(g));
      const target = clamp(s.home, cmin, cmax);
      if (s.press > cmax) s.press = cmax; // more than the walls can hold over the outside: it vents
      if (s.press < cmin) s.press = cmin; // the outside presses in past what the walls can keep out
      if (s.press < target) s.press = Math.min(target, s.press + PUMP * dt);
      else if (s.press > target) s.press = target;
    }
    // the comfort zones, measured from the depth it lives at and scaled by what it can take
    // (pressureTolerance): within 50 m healthy; to 150 m stressed; to 250 m dying; to 350 m dying
    // fast; beyond, dead
    if (!s.tol) { const sp = SPECIES_BY_ID[s.id]; s.tol = sp ? pressureTolerance(sp, homeOf(s)).k : 1; }
    const gap = gapOf(g, s, inBag) / s.tol;
    // in the net there is nothing to protect it: say so, once as it starts to suffer, once as it dies
    const deeper = gapSigned(g, s, inBag) < 0;
    if (inBag && gap > ZONE.ok && !s.warnStress) { s.warnStress = true; events.push({ type: 'bagStress', s, deeper }); }
    if (inBag && gap > ZONE.stressed && !s.warnDying) { s.warnDying = true; events.push({ type: 'bagDying', s, deeper }); }
    if (gap > ZONE.ok) {
      const cap = gap <= ZONE.stressed ? 1 - ((gap - ZONE.ok) / (ZONE.stressed - ZONE.ok)) * 0.45 : 0.5;
      if (s.cond > cap) s.cond -= Math.min(s.cond - cap, 0.03 * dt);
      if (gap > ZONE.dead) s.cond -= 0.25 * dt;                                                            // dead in seconds
      else if (gap > ZONE.dying) s.cond -= (0.02 + 0.04 * (gap - ZONE.dying) / (ZONE.dead - ZONE.dying)) * dt; // dying fast
      else if (gap > ZONE.stressed) s.cond -= 0.004 * dt;                                                  // dying slowly: time to get it into a chamber
    }
    // held at its own pressure in a chamber, it recovers
    if (s.pressed && gap <= 5) s.cond += 0.003 * dt;
    s.cond = clamp(s.cond, 0, 1);
    if (before > 0.05 && s.cond <= 0.05) deaths.push(s);
  };
  for (const s of g.bag) tick(s, true);
  for (const s of g.subTank) tick(s, false);
  deaths.events = events;
  return deaths;
}
// boarding the sub: specimens move from the bag into the tank (as many as fit)
export function transferToTank(g) {
  let n = 0;
  while (g.bag.length && stow(g, g.bag[0])) { g.bag.shift(); n++; }
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

// ---------------- the sub's net ----------------
// A trawl net in a canister under the bow (an add-on). N lets it out once a dive: it opens ahead of
// the sub and sweeps a long box of water for a few seconds, then closes on whatever it took (up to
// ten animals, sharks to 2.5 m, legends too). The haul lands in a heap on the tank-room floor, to be
// sorted into the tank and the chambers. It is loud: below 200 m it draws the deep's attention.
export const NET_MAX = 10, NET_LEN = 2.5, NET_TIME = 3.2;
export function netBox(g) {
  const n = g.subNet, k = Math.min(1, n.t / 1.2); // it pays out over the first second
  const x0 = n.x + n.dir * 4, x1 = n.x + n.dir * (4 + 20 * k);
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: n.y - 4.5 * k - 0.5, y1: n.y + 4.5 * k + 0.5 };
}
export function fireSubNet(g) {
  if (!(g.addons || {}).subNet) return 'The sub has no net (the boat sells one)';
  if (g.subNetUsed) return 'The net is already used this dive: the yard repacks it at the boat';
  if (g.sub.docked || !g.earl.inSub) return 'Only from the sub, under way';
  if (g.sub.y < 4) return 'Too shallow to trawl';
  g.subNetUsed = true;
  g.subNet = { t: 0, x: g.sub.x, y: g.sub.y, dir: g.sub.facing || 1, got: [] };
  if (g.sub.y > 200) g.entity.disturb(g, 0.35);
  return null;
}
export function updateSubNet(g, dt, canTake) {
  const n = g.subNet;
  if (!n) return null;
  n.t += dt; n.x = g.sub.x; n.y = g.sub.y; // it is towed behind the sub's bow as she moves
  const B = netBox(g);
  for (const c of g.fauna.list) {
    if (n.got.length >= NET_MAX) break;
    if (c.dead || c.hidden || c.pet || c.len > NET_LEN || n.got.includes(c)) continue;
    if (c.x < B.x0 || c.x > B.x1 || c.y < B.y0 || c.y > B.y1) continue;
    if (!canTake(c.sp)) continue;
    n.got.push(c); c.dead = true; c.netted = true;
  }
  if (n.t < NET_TIME) return null;
  g.subNet = null;
  const haul = n.got.map((c) => {
    const spec = { id: c.sp.id, len: c.len, cond: clamp(0.85 + Math.random() * 0.1, 0, 1), from: Math.round(c.y), t: g.time, pile: true };
    if (c.variant) { spec.variant = c.variant; spec.mult = variantMult(c.variant); }
    return spec;
  });
  for (const s of haul) g.subTank.push(s);
  return haul;
}
