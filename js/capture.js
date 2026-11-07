// Catching animals alive: the net and the slurp gun, the specimen bag, the sub's tank, and what
// happens to an animal between the catch and the sale (handling, time, coming up too fast).
import { LEGENDARY } from './specimens.js';
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
// (3.1.0) too big for an ordinary chamber: a Legendary, or anything 1.2 m and up. Only the large pressure tank holds one.
export const tooBig = (s) => LEGENDARY.has(s.id) || (s.len || 0) >= 1.2;
export const hasBigTank = (g) => !!(g.addons || {}).bigTank;
export const bigIn = (g) => g.subTank.filter((s) => s.pressed && s.chamber === BIG);
export function bigFits(g, spec) {
  if (!hasBigTank(g)) return false;
  const inn = bigIn(g).filter((s) => s !== spec);
  if (!inn.length) return true;
  return !tooBig(spec) && inn.length < 3 && !inn.some((s) => tooBig(s));
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
  if (tooBig(spec)) return false; // (3.1.0) not in an ordinary chamber
  const used = new Set(g.subTank.filter((s) => s.pressed && s !== spec).map((s) => s.chamber));
  const c = want >= 0 ? (want < pressSlots(g) && !used.has(want) ? want : -1) : freeChamber(g);
  if (c < 0) return false;
  spec.pressed = true; spec.chamber = c; delete spec.pile;
  spec.press = Math.max(0, g.sub.y); // sealed at the pressure outside, then pumped up to its home
  return true;
}
export function stow(g, spec) {
  if ((spec.from || 0) > 100 && tooBig(spec) && bigFits(g, spec)) { seal(g, spec, BIG); g.subTank.push(spec); return 'press'; }
  if ((spec.from || 0) > 100 && !tooBig(spec) && freeChamber(g) >= 0) { seal(g, spec); g.subTank.push(spec); return 'press'; }
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
    else if (len > def.maxLen) why = isTagOnly(sp) && len > 1.1 ? 'needs a tag' : `too big for the ${def.name.toLowerCase()}`;
    else if (def.minLen && len < def.minLen) why = `slips through the ${def.name.toLowerCase()}`;
    if (why === null && !canTakeLive(sp)) return; // plants, corals: not even worth mentioning
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
        if (def.multi > 1 && tgt.c && tgt.c.gid != null) {
          let more = def.multi - 1;
          for (const c of g.fauna.list) {
            if (more <= 0 || g.bag.length >= bagSlots(g)) break;
            if (c === tgt.c || c.dead || c.pet || c.gid !== tgt.c.gid || c.len > def.maxLen || dist(c.x, c.y, tgt.x, tgt.y) > 1.8) continue;
            c.dead = true; more--;
            const s2 = { id: c.sp.id, len: c.len, cond: clamp(1 - def.harm * (fragile(c.sp) ? 2 : 1) - Math.random() * 0.05, 0.05, 1), from: Math.round(Math.max(e.y, c.y)), t: g.time };
            g.bag.push(s2); g.captureFx.push({ sp: c.sp, len: c.len, x: c.x, y: c.y, dir: c.dir, t: 0, dur: 0.3, kind });
            ev.push({ type: 'caught', sp: c.sp, spec: s2, name: c.sp.name, extra: true });
          }
        }
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
  if (s.safe) return 0; // (4.0.0) brought up: safe until the sub dives again
  return Math.abs(gapSigned(g, s, inBag));
}
// (4.0.0) when the sub touches the surface, every animal aboard is safe: its condition is held where it is
// until she dives again. Diving undoes it (moving one between tanks down there, it feels the pressure);
// coming back up makes them safe again.
const AIR_WARN = 30, AIR_DEAD = 90; // (4.1.1) seconds out of the water, on the floor of the sub
const SURFACE_Y = 2.2, DIVE_Y = 5; // (as the sub breathing fresh air: under 2.2 m she is at the surface)
export function surfaceSafety(g) {
  const sub = g.sub; if (!sub || sub.imploded) return;
  const inSub = g.earl.inSub;
  if (sub.y <= SURFACE_Y || sub.docked) for (const s of inSub ? g.subTank.concat(g.bag) : g.subTank) { if (s.cond > 0.05) s.safe = true; }
  else if (sub.y > DIVE_Y) for (const s of g.subTank) s.safe = false;
  // what he carries in his bag is safe only while it is aboard with him: out in the water, below the surface, not
  if (sub.y > DIVE_Y && inSub || !inSub && g.earl.y > DIVE_Y) for (const s of g.bag) s.safe = false;
}
export function updateSpecimens(g, dt) {
  const deaths = [], events = [];
  const cmax = chamberMax(g);
  surfaceSafety(g);
  // (4.0.1) never a legendary or a 1.2 m+ animal in an ordinary chamber, however it got there (an old save):
  // into the large pressure tank if it fits, otherwise out onto the floor of the tank room
  for (const s of g.subTank) if (s.pressed && s.chamber !== BIG && tooBig(s)) { if (bigFits(g, s)) s.chamber = BIG; else { s.pressed = false; s.chamber = undefined; s.pile = true; } }
  const tick = (s, inBag) => {
    if (s.home === undefined) s.home = s.from || 0;
    if (s.cond <= 0.05) return;
    // (4.1.1) out of the water, heaped on the floor of the sub (what the trawl hauls in lands there): it suffocates.
    // Fine for about 30 s, then a warning; it weakens through the next 30 s and is dead by about 90 s. Put into a
    // tank, its clock starts again. Safe at the surface or not, a fish needs water.
    if (s.pile) {
      const before0 = s.cond; s.airT = (s.airT || 0) + dt;
      if (s.airT > AIR_WARN && !s.warnAir) { s.warnAir = true; events.push({ type: 'air', s }); }
      if (s.airT > AIR_WARN) { const k = Math.min(1, (s.airT - AIR_WARN) / (AIR_DEAD - AIR_WARN)); s.cond = Math.min(s.cond, Math.max(0, 0.75 * (1 - k))); }
      if (s.airT > AIR_DEAD) s.cond = 0;
      if (before0 > 0.05 && s.cond <= 0.05) { s.airDeath = true; deaths.push(s); }
      if (s.cond <= 0.05) return;
    } else if (s.airT) { s.airT = 0; s.warnAir = false; }
    if (s.safe) { s.warnStress = s.warnDying = false; return; } // (4.0.0) safe at the surface: held as it is
    if (inBag && g.earl.legends && g.earl.legends.has('kinship')) return; // (2.8.0) Kinship: in his bag, never stressed, never dying
    const before = s.cond;
    if (inBag) s.cond -= dt * 0.0005;
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
    // (2.9.1) however it comes to suffer (pressure, time in the bag, the floor of the tank room), say so once
    // as it gets stressed and once as it starts to die; one in a chamber at its own pressure is left in peace
    if (!(s.pressed && gap <= 5)) {
      const press = gap > ZONE.ok; // is the pressure the cause?
      if (s.cond < 0.6 && !s.warnStress) { s.warnStress = true; events.push({ type: 'stressed', s, inBag, press }); }
      if (s.cond < 0.3 && !s.warnDying) { s.warnDying = true; events.push({ type: 'dying', s, inBag, press }); }
    }
    if (s.cond > 0.75 && gap <= ZONE.ok) s.warnStress = s.warnDying = false; // recovered, and back at a safe pressure: it can warn again (3.5.0: not while the pressure is still wrong, or it warned every frame)
    if (before > 0.05 && s.cond <= 0.05) { s.pressDeath = gap > ZONE.ok; deaths.push(s); }
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

// ---------------- the sub's trawl net (2.3.5) ----------------
// A trawl carried in a hatch under the sub's belly: one net at a time, used up in one haul. N drops it:
// weights pull the footrope down, floats hold the headrope up, and the net streams out behind and below
// the sub on two cables, its mouth facing forward. It only fishes while the sub is moving (stopped, the
// mouth sags shut): drive through a school. N again (or after TOW_MAX s) pulls the drawstring shut, and
// the winch hauls the bag up into the hatch; the haul lands in a heap on the tank-room floor. An animal
// too big for the net may tear it: the net is lost, and everything in it swims free. Loud below 200 m.
export const NETS_SUB = {
  basic: { name: 'Beginner trawl net', short: 'NET', price: 50, max: 6, maxLen: 1.0, mouth: 1.6, tear: 0.7, slip: 0.15,
    desc: 'A light trawl for the hatch under the sub. A small mouth, room for six, fish up to a metre; a few slip out before it closes, and anything bigger may tear it. Used up in one haul.' },
  adv: { name: 'Advanced trawl net', short: 'BIG NET', price: 400, max: 10, maxLen: 6.0, mouth: 2.6, tear: 0.3, slip: 0.03,
    desc: 'A heavy-twine trawl with a wide mouth: room for ten, sharks and oarfish up to 6 m and the great legends; almost nothing slips out, and it seldom tears. Used up in one haul.' },
};
export const NET_DROP = 1.5, TOW_MAX = 8, NET_PURSE = 1.0, NET_HAUL = 1.5;
// where the hatch is under the hull, and where the net's mouth hangs behind it, for a sub facing dir
export const hatchAt = (g) => ({ x: g.sub.x - (g.sub.facing || 1) * 1.2, y: g.sub.y + 1.3 });
const towTarget = (g) => { const d = g.sub.facing || 1, k = g.subNet ? g.subNet.T.mouth : 1.6; return { x: g.sub.x - d * (7.5 + k * 1.5), y: g.sub.y + 2.4 + k }; };
export function fireSubNet(g) {
  const n = g.subNet;
  if (n) { if (n.phase === 'tow') { n.phase = 'purse'; n.pt = 0; return 'closing'; } return 'busy'; }
  const tier = g.items.net;
  if (!tier || !NETS_SUB[tier]) return 'No net in the hatch: the Margaret sells them';
  if (g.sub.docked || !g.earl.inSub) return 'Only from the sub, under way';
  if (g.sub.y < 6) return 'Too shallow to trawl';
  g.items.net = null; // used up in this haul, whatever happens
  const h = hatchAt(g);
  g.subNet = { tier, T: NETS_SUB[tier], phase: 'drop', t: 0, pt: 0, mx: h.x, my: h.y, open: 0, got: [], dir: g.sub.facing || 1 };
  if (g.sub.y > 200) g.entity.disturb(g, 0.35);
  return null;
}
// returns null while working; { haul: [...] } when the net is in; { torn: sp } when it tore
export function updateSubNet(g, dt, canTake) {
  const n = g.subNet;
  if (!n) return null;
  n.t += dt; n.pt += dt;
  const sub = g.sub, speed = Math.hypot(sub.vx || 0, sub.vy || 0), T = n.T;
  // the mouth trails behind the sub on its cables, swinging round slowly when she turns
  const tgt = towTarget(g), h = hatchAt(g);
  if (n.phase === 'drop') {
    const k = Math.min(1, n.pt / NET_DROP);
    n.mx = h.x + (tgt.x - h.x) * k; n.my = h.y + (tgt.y - h.y) * k; n.open = k * 0.7;
    if (k >= 1) { n.phase = 'tow'; n.pt = 0; }
  } else if (n.phase === 'tow') {
    n.mx += (tgt.x - n.mx) * Math.min(1, dt * 1.5); n.my += (tgt.y - n.my) * Math.min(1, dt * 1.5);
    const want = clamp(speed / 1.2, 0.25, 1); // moving, the mouth stands open; stopped, it sags
    n.open += (want - n.open) * Math.min(1, dt * 2);
    n.dir = sub.facing || n.dir;
    if (n.open > 0.6) {
      // (4.0.0) only what goes in at the mouth: an animal is caught when it crosses the mouth's opening
      // (from the sub's side to the bag's side, within the hoop), not anything near the net
      const r = T.mouth * n.open, prev = n.prev || (n.prev = new Map()), seen = new Map();
      for (const c of g.fauna.list) {
        if (c.dead || c.hidden || c.pet || n.got.includes(c)) continue;
        const rel = (c.x - n.mx) * n.dir; // + ahead of the mouth (toward the sub), - inside the bag
        if (Math.abs(rel) > 4 || Math.abs(c.y - n.my) > r + 1) continue;
        seen.set(c, rel);
        const was = prev.get(c);
        if (!(was !== undefined && was > 0 && rel <= 0 && Math.abs(c.y - n.my) < r)) continue;
        if (!canTake(c.sp)) continue;
        if (c.len > T.maxLen && !(T.maxLen >= 6 && LEGENDARY.has(c.sp.id))) { // (4.1.1) the big net never tears on a legend
          // too big: it hits the net; it may tear straight through, losing the net and everything in it
          if (Math.random() < T.tear) { tearNet(g, c); return { torn: c.sp }; }
          continue;
        }
        if (n.got.length >= T.max) continue;
        n.got.push(c); c.dead = true; c.netted = true;
      }
      n.prev = seen;
    }
    if (n.pt >= TOW_MAX) { n.phase = 'purse'; n.pt = 0; }
  } else if (n.phase === 'purse') {
    n.open = Math.max(0, n.open - dt / NET_PURSE);
    n.mx += (tgt.x - n.mx) * Math.min(1, dt); n.my += (tgt.y - n.my) * Math.min(1, dt);
    if (n.pt >= NET_PURSE) {
      // a few slip out before the drawstring is tight
      n.lost = 0;
      n.got = n.got.filter(() => { const out = Math.random() < T.slip; if (out) n.lost++; return !out; });
      n.phase = 'haul'; n.pt = 0; n.hx = n.mx; n.hy = n.my;
    }
  } else if (n.phase === 'haul') {
    const k = Math.min(1, n.pt / NET_HAUL);
    n.mx = n.hx + (h.x - n.hx) * k; n.my = n.hy + (h.y - n.hy) * k;
    if (k >= 1) {
      g.subNet = null;
      const haul = n.got.map((c) => {
        const spec = { id: c.sp.id, len: c.len, cond: clamp(0.85 + Math.random() * 0.1, 0, 1), from: Math.round(c.y), t: g.time, pile: true };
        if (c.variant) { spec.variant = c.variant; spec.mult = variantMult(c.variant); }
        return spec;
      });
      for (const s of haul) g.subTank.push(s);
      return { haul, lost: n.lost || 0 };
    }
  } else if (n.phase === 'torn') {
    if (n.pt > 1.6) g.subNet = null;
  }
  return null;
}
// the net tears: its catch swims free, the net is left in rags for a moment, then gone
function tearNet(g, big) {
  const n = g.subNet;
  for (const c of n.got) {
    const f = g.fauna.makeFish(c.sp, n.mx + (Math.random() - 0.5) * 2, n.my + (Math.random() - 0.5) * 2, Math.random() < 0.5 ? -1 : 1, g.fauna.groupId++, true);
    if (c.variant) f.variant = c.variant;
    g.fauna.list.push(f);
  }
  n.got = []; n.phase = 'torn'; n.pt = 0; n.big = big.sp;
}
