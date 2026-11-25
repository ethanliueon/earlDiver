const FAST_IDS = new Set([42, 43, 44, 39, 40, 41, 82, 52, 45, 185, 186, 187]); // (6.0.16) as fauna.js FAST: the swimmers quick enough to beat a slow swing
// Catching animals alive: the net and the slurp gun, the specimen bag, the sub's tank, and what
// happens to an animal between the catch and the sale (handling, time, coming up too fast).
import { LEGENDARY, PROTECTED } from './specimens.js';
import { clamp, dist } from './util.js';
import { pressureTolerance } from './specimens.js';
import { SPECIES_BY_ID } from './species.js';
import { WEIGHT, gear, owns, statValue } from './economy.js';
import { canTakeLive, isTagOnly, liveValue, deepPremium, fragile, conditionName } from './specimens.js';
import { variantMult, variantName } from './variants.js';
import { netGeom } from './tools_draw.js';

// (5.14.0) the bag and the sub's open tank are measured in spaces, and an animal takes spaces by its length (owner's
// scale): under 20 cm 1, under 50 cm 2, under 1 m 4, under 2 m 8, bigger 16. The tank's room is three times its old count
export const spacesOf = (s) => { const L = (s && s.len) || 0; return L < 0.2 ? 1 : L < 0.5 ? 2 : L < 1 ? 4 : L < 2 ? 8 : 16; };
export const bagSlots = (g) => Math.round(statValue(g.profile, 'bag'));
export const bagUsed = (g) => (g.bag || []).reduce((a, s) => a + spacesOf(s), 0);
// overencumbered: more in the bag than it holds (a catch is never refused for room; it is the player's to judge)
export const overencumbered = (g) => bagUsed(g) > bagSlots(g);
export const tankSlots = (g) => Math.round(statValue(g.profile, 'subTank') * 3);
// the sealed pressure tanks: separate places in the sub (specimens in them carry pressed: true)
export const pressSlots = (g) => Math.round(statValue(g.profile, 'pressTanks'));
// a big animal takes more of the open tank: one place to 60 cm, two to 1.2 m, three beyond
// (4.12.6) a tiny animal (under 20 cm) takes half a place, in the open tank or in a chamber
export const TINY = 0.2;
export const slotsOf = (s) => spacesOf(s); // (5.14.0) spaces, as the bag
// how full an ordinary chamber is: one place each, a tiny animal half (two tiny ones share a chamber)
export const chamberLoad = (g, n, except = null) => g.subTank.reduce((a, q) => a + (q.pressed && q.chamber === n && q !== except ? ((q.len || 0) < TINY ? 0.5 : 1) : 0), 0);
export const chamberRoom = (g, n, spec) => chamberLoad(g, n, spec) + ((spec.len || 0) < TINY ? 0.5 : 1) <= 1;
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
export function freeChamber(g, spec = null) {
  if (spec && (spec.len || 0) < TINY) for (let i = 0; i < pressSlots(g); i++) if (chamberLoad(g, i, spec) === 0.5) return i; // a tiny one: beside another tiny one first
  for (let i = 0; i < pressSlots(g); i++) if (chamberLoad(g, i, spec) === 0) return i;
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
  const c = want >= 0 ? (want < pressSlots(g) && chamberRoom(g, want, spec) ? want : -1) : freeChamber(g, spec);
  if (c < 0) return false;
  spec.pressed = true; spec.chamber = c; delete spec.pile;
  spec.press = Math.max(0, g.sub.y); // sealed at the pressure outside, then pumped up to its home
  return true;
}
export function stow(g, spec) {
  if ((spec.from || 0) > 100 && tooBig(spec) && bigFits(g, spec)) { seal(g, spec, BIG); g.subTank.push(spec); return 'press'; }
  if ((spec.from || 0) > 100 && !tooBig(spec) && freeChamber(g, spec) >= 0) { seal(g, spec); g.subTank.push(spec); return 'press'; }
  if (tankFits(g, spec)) { spec.pressed = false; g.subTank.push(spec); return 'tank'; }
  if (freeChamber(g, spec) >= 0) { seal(g, spec); g.subTank.push(spec); return 'press'; }
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
  if (P && P.kit && P.kit.on && !P.kit.on.net) return { kind: 'none', def: null, tier: 0, noNet: true }; // (6.9.1) no net on: empty hands
  return T('net', 'net');
}

// where his hand is, and which way he faces (world metres)
// (upright or swimming, his hands work about half a metre in front of him at chest height)
export function handPos(g) {
  const e = g.earl;
  const swim = Math.abs(Math.cos(e.angle)); // 1 swimming flat, ~0.4 upright
  return { x: e.x + e.facing * (0.17 + 0.17 * swim), y: e.y + 0.03, fx: e.facing };
}

// (7.4.0, owner) reach is a multiple of the hand net's (range 1.1 = 1x): the hoop catches what it passes over, and a
// net with reach 2x catches what passes within twice the hoop's radius of it (a long net overreaches, the starter does not)
export const reachX = (g, def) => (def.range || 1.1) / 1.1 * (g.reachMul || 1);
export const hoopReach = (g, def, tier) => netGeom(tier).hoop * reachX(g, def);
// (7.4.0, owner) Ambush: each level a quarter more likely that a fish holds still instead of darting off (IV: never)
export const ambushChance = (g) => clamp(0.25 * ((g.earl && g.earl.ambushLv) || 0), 0, 1);
// What is in reach of the tool right now: the best animal it can take, or why it can't. With at ({x, y, r}), what is
// under the hoop where it is now (7.4.0)
export function findCatch(g, at = null) {
  const e = g.earl, W = g.world;
  if (e.inSub || g.mode !== 'play') return null;
  const { def, kind, tier } = activeTool(g);
  if (kind !== 'net' && kind !== 'slurp') return null;
  const h = handPos(g);
  const reach = def.range * (g.reachMul || 1) + 0.7; // (5.9.0) Vigor reaches further (the slurp gun's reach)
  const NG = kind === 'net' ? netGeom(tier) : null, hr = NG ? NG.hoop * reachX(g, def) : 0;
  let best = null, bd = 1e9, blocked = null, bbd = 1e9;
  const consider = (sp, x, y, len, ref) => { // (5.10.8: len and ref may be changed for a colony's piece)
    let d;
    if (at) { d = Math.hypot(x - at.x, y - at.y) - len * 0.4; if (d > at.r) return; } // (7.4.0) under the hoop: its body overlaps the hoop's circle
    else {
      if ((x - h.x) * h.fx < -0.8) return; // behind him
      if (NG) { // (7.4.0, owner) the net: only where the hoop's sweep passes, a handle's length out from his hand
        if ((x - h.x) * h.fx < -0.1) return;
        d = Math.max(0, Math.abs(Math.hypot(x - h.x, y - h.y) - NG.arm) - len * 0.4); if (d > hr) return;
      } else { d = Math.hypot(x - h.x, (y - h.y) * 0.75) - len * 0.5; if (d > reach) return; } // the slurp gun as before
    }
    let why = null;
    // (5.10.10) no tags any more: an animal no net can hold is 'too big for the net' (a photograph is how it pays);
    // one a better net could hold is 'too big for this net'
    if (len > 4) why = 'too big to catch: photograph it'; // (5.16.0) nothing over 4 m can be caught, by any net
    else if (!canTakeLive(sp)) why = isTagOnly(sp) ? 'too big for the net' : null;
    else if (len > def.maxLen * OVER) why = isTagOnly(sp) && len > 1.1 ? 'too big for the net' : 'too big for this net';
    else if (def.minLen && len < def.minLen) why = 'too small for this net: it slips through the mesh'; // (7.3.0) said plainly
    if (why === null && !canTakeLive(sp)) return; // plants, corals: not even worth mentioning
    if (why) { if (d < bbd) { bbd = d; blocked = { sp, why, d }; } return; }
    if (d < bd) { bd = d; best = { sp, x, y, len, d, ...ref }; }
  };
  for (const c of g.fauna.list) if (!c.dead && !c.pet && !c.companion && !(c.att && c.att.s !== 'idle')) consider(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
  for (const s of W.statics) {
    if (Math.abs(s.x - (at ? at.x : h.x)) > (at ? at.r + 3 : reach + 3)) continue;
    consider(s.sp, s.x, s.y - Math.min(0.5, s.sp.len * s.scale * 0.3), s.sp.len * s.scale, { s, variant: s.variant });
  }
  if (best) {
    best.value = liveValue(best.sp, best.len) * variantMult(best.variant) * deepPremium(best.y); best.name = variantName(best.sp, best.variant);
    best.chance = catchChance(def, kind, best, g.luck || 0);
  }
  return best ? { ok: true, ...best } : blocked ? { ok: false, ...blocked } : null;
}

// (5.0) the size limit is soft: a fish up to half again the net's size can still be tried, at worse odds
// the further over it is (a 25 cm net on a 35 cm fish: about one in seven), and gone past that
export const OVER = 1.5;
export const sizeOdds = (def, len) => (len <= def.maxLen ? 1 : clamp(1 - (len / def.maxLen - 1) * 2, 0, 1));
// the odds of a catch: the tool, the fish's size, and what the fish is doing (bolting, spent, dazed)
export function catchChance(def, kind, tgt, luck = 0) {
  const c = tgt.c, fleeing = c && c.fleeT > 0, spent = c && (c.tired > 0 || c.dazed > 0);
  let chance = def.success * (fleeing ? (kind === 'slurp' ? 0.9 : 0.8) : 1);
  if (spent) chance = Math.min(0.97, chance + 0.25); // a worn-out fish hardly moves
  if (tgt.s) chance = Math.min(0.97, chance + 0.2); // things on the bottom don't swim off
  chance *= sizeOdds(def, tgt.len) * (spent && tgt.len > def.maxLen ? 1.6 : 1);
  return clamp(chance + luck, 0, 0.98);
}

// Start a sweep / a shot. Returns a message for the player, or null when it starts.
export function useTool(g) {
  const e = g.earl;
  if (e.inSub) return 'Not from inside the submersible';
  if (g.capture) return null; // already mid-swing
  if ((g.toolCool || 0) > 0) return null;
  const { kind, def, tier } = activeTool(g);
  if (overencumbered(g) && kind !== 'cam') return 'Overencumbered: lighten the bag'; // (5.14.0) one catch too many is allowed; nothing more after it (a photograph is not carried)
  const lock = findCatch(g);
  // (6.0.16) the catch lands when the hoop arrives, two-thirds of the way through the swing (it was a third: the swing
  // speed could not be felt). A quick fish that sees it coming may dart out of reach first: small reef fish and the
  // fast swimmers react in about a third of a second, so a slow net misses them more and a fast one beats them
  g.capture = { kind, def, tier, t: 0, dur: def.time * (g.swingMul || 1), resolveAt: kind === 'net' ? 0.6 : 0.12 /* (6.5.7) the end of the sweep */, done: false, lock: lock && lock.ok ? lock : null };
  if (kind === 'net' && lock && lock.ok && lock.c && !g.tutForce && !lock.c.dazed) {
    const c = lock.c, fast = FAST_IDS.has(c.sp.id), small = (c.len || 1) < 0.35, arrive = g.capture.dur * 0.6, react = 0.26 + Math.random() * 0.18, p = fast ? 0.6 : small ? 0.4 : 0.12;
    if (arrive > react && Math.random() < p * Math.min(1, (arrive - react) / 0.35) && Math.random() < ambushChance(g)) c.ambushed = true; // (7.4.0) it would have darted: Ambush held it still
    else if (arrive > react && Math.random() < p * Math.min(1, (arrive - react) / 0.35)) { const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1, sp = fast ? 11 : 7;
      c.dartT = arrive - react; c.dartVx = dx / d * sp; c.dartVy = dy / d * sp * 0.6; c.startle = 1.2; } }
  if (e.y > 200) g.entity.disturb(g, def.noise);
  return null;
}

// Advance the sweep; at the right moment, see what it caught. Returns events for the HUD/audio.
export function updateCapture(g, dt) {
  const ev = [];
  // (6.0.16) a fish darting away from a slow swing: carried out of reach for the moment it has
  for (const c of g.fauna && g.fauna.list ? g.fauna.list : []) if (c.dartT > 0) { const k = Math.min(dt, c.dartT); c.x += c.dartVx * k; c.y += c.dartVy * k; c.dartT -= dt; if (c.dartT <= 0) { c.vx = c.dartVx * 0.4; c.vy = c.dartVy * 0.4; c.dartT = 0; } }
  g.toolCool = Math.max(0, (g.toolCool || 0) - dt);
  if (g.netCatch) {
    const N = g.netCatch; N.t += dt;
    // the fight churns the water: bubbles off the net while it thrashes, fewer as it tires
    const tip = g.toolTip, fight = 1 - N.t / (N.dur || 1.1);
    if (tip && g.bubbles && Math.random() < dt * (6 + N.len * 18) * fight) g.bubbles.push({ x: tip.x + (Math.random() - 0.5) * 0.25, y: tip.y + (Math.random() - 0.5) * 0.2, r: 0.015 + Math.random() * 0.035, w: Math.random() * 6, t: 0 });
    if (N.t > (N.dur || 1.1)) g.netCatch = null;
  }
  if (g.tug) { g.tug.t += dt; if (g.tug.t > g.tug.dur) g.tug = null; }
  if (g.slurpHeld) { g.slurpHeld.t += dt; if (g.slurpHeld.t > 1.6) g.slurpHeld = null; }
  for (let i = g.captureFx.length - 1; i >= 0; i--) { const f = g.captureFx[i]; f.t += dt; if (f.t > f.dur) g.captureFx.splice(i, 1); }
  const cap = g.capture;
  if (!cap || cap.kind === 'tag' || cap.kind === 'cam') return ev;
  cap.t += dt;
  // (7.4.0, owner) the net: what the hoop actually passes over on its way, frame by frame (the drawn hoop, g.toolTip)
  if (cap.kind === 'net' && !cap.done && g.toolTip && cap.t > cap.dur * 0.15) {
    const at = { x: g.toolTip.x, y: g.toolTip.y, r: hoopReach(g, cap.def, cap.tier) * 1.6 + 0.3 }, L0 = cap.lock; /* (7.4.26, owner) more forgiving: what the hoop comes near, not only what it passes exactly over */
    if (L0 && L0.c && !L0.c.dead && Math.hypot(L0.c.x - at.x, L0.c.y - at.y) - L0.len * 0.5 <= at.r * 1.15) cap.hit = Object.assign({}, L0, { x: L0.c.x, y: L0.c.y });
    else if (!cap.hit) { const f = findCatch(g, at); if (f && f.ok) cap.hit = f; else if (f && !cap.why) cap.why = f; }
  }
  if (!cap.done && cap.t >= cap.dur * cap.resolveAt) {
    cap.done = true;
    // the animal he swung at, if it is still within reach (with some slack for the swing);
    // otherwise whatever is in reach now
    let tgt = null;
    const L = cap.lock;
    if (cap.kind === 'net' && !g.tutForce) { // (7.4.0) only what the hoop passed over (the tutorial's fish keeps the old slack)
      const H = cap.hit; tgt = H && !(H.c && H.c.dead) && !(H.s && !g.world.statics.includes(H.s)) ? H : cap.why || null;
      if (tgt && tgt.ok && tgt.c && tgt.value === undefined) { tgt.value = liveValue(tgt.sp, tgt.len) * variantMult(tgt.variant) * deepPremium(tgt.y); tgt.name = variantName(tgt.sp, tgt.variant); }
    } else if (L && !(L.c && L.c.dead) && !(L.s && !g.world.statics.includes(L.s))) {
      const h = handPos(g), x = L.c ? L.c.x : L.x, y = L.c ? L.c.y : L.y;
      if (Math.hypot(x - h.x, (y - h.y) * 0.75) - L.len * 0.5 < cap.def.range * (g.reachMul || 1) + 1.3) tgt = Object.assign({}, L, { x, y });
    }
    if (!tgt && !(cap.kind === 'net' && !g.tutForce)) tgt = findCatch(g);
    const e = g.earl;
    // (7.5.0, owner) the hoop passed nothing but a fish was close: "Get closer", so a miss for reach never reads as a glitch
    if (!tgt && cap.kind === 'net') { const h2 = handPos(g), near = findCatch(g, { x: h2.x + h2.fx * 0.6, y: h2.y, r: 2.2 }); if (near && near.ok) { ev.push({ type: 'miss', why: 'Get closer', near: true, sp: near.sp }); tgt = { ok: false, handled: true }; } }
    if (tgt && tgt.handled) { /* said above */ }
    else if (!tgt || !tgt.ok) ev.push({ type: 'miss', why: tgt ? tgt.why : null, sp: tgt && tgt.sp });
    else {
      const { def, kind } = cap;
      // (4.3.2) the tutorial's net step: the first swing misses, the next one catches (g.tutForce, set by tutor())
      const force = g.tutForce;
      if (force === 'catch' || (force !== 'miss' && g.sureCatch) || (force !== 'miss' && Math.random() < catchChance(def, kind, tgt, g.luck || 0))) {
        const harm = def.harm * (fragile(tgt.sp) ? 2 : 1) + Math.random() * 0.05;
        const spec = { id: tgt.sp.id, len: tgt.len, cond: clamp(1 - harm, 0.05, 1), from: Math.round(Math.max(e.y, tgt.y)), t: g.time };
        if (tgt.variant) { spec.variant = tgt.variant; spec.mult = variantMult(tgt.variant); if (tgt.variant === 'crimson') g.entity.disturb(g, 0.08); }
        if (tgt.c) tgt.c.dead = true;
        if (tgt.s) { g.world.statics.splice(g.world.statics.indexOf(tgt.s), 1); g.world.staticsVer = (g.world.staticsVer || 0) + 1; }
        if (g.blessCatch) { spec.cond = 1; spec.blessed = true; } // (5.16.0) Apex: what it catches comes back whole, and Blessed
        if (g.curseCatch) { spec.cond = 1; spec.cursed = true; } // (7.6.6, owner) Bloodmoon: Cursed
        g.bag.push(spec);
        g.captureFx.push({ sp: tgt.sp, len: tgt.len, x: tgt.x, y: tgt.y, dir: tgt.c ? tgt.c.dir : 1, t: 0, dur: kind === 'slurp' ? 0.25 : 0.3, kind });
        // (5.0) it fights the net: a pull on Earl the way it was swimming, as strong as it is big
        if (kind === 'net') {
          g.netCatch = { sp: tgt.sp, len: tgt.len, t: 0, dur: clamp(0.7 + tgt.len * 1.1, 0.75, 1.7) };
          g.tug = { dir: tgt.c ? (tgt.c.dir || 1) : e.facing, str: clamp(0.4 + tgt.len * 2.2, 0.5, 3.2), t: 0, dur: clamp(0.3 + tgt.len * 1.2, 0.3, 1.2) };
        } else g.slurpHeld = { sp: tgt.sp, len: tgt.len, t: 0 };
        ev.push({ type: 'caught', sp: tgt.sp, spec, name: variantName(tgt.sp, tgt.variant), ambushed: !!(tgt.c && tgt.c.ambushed), x: tgt.x, y: tgt.y }); // (7.4.0) held still by Ambush: written beside it
        if (def.multi > 1 && tgt.c && tgt.c.gid != null) {
          let more = def.multi - 1;
          for (const c of g.fauna.list) {
            if (more <= 0 || bagUsed(g) >= bagSlots(g)) break;
            if (c === tgt.c || c.dead || c.pet || c.gid !== tgt.c.gid || c.len > def.maxLen * 1.1 || dist(c.x, c.y, tgt.x, tgt.y) > 1.8) continue;
            if (bagUsed(g) + spacesOf({ len: c.len }) > bagSlots(g)) break; // (6.5.1) the school's extra fish never take the bag past its room: only the one catch may tip it over
            c.dead = true; more--;
            const s2 = { id: c.sp.id, len: c.len, cond: clamp(1 - def.harm * (fragile(c.sp) ? 2 : 1) - Math.random() * 0.05, 0.05, 1), from: Math.round(Math.max(e.y, c.y)), t: g.time };
            g.bag.push(s2); g.captureFx.push({ sp: c.sp, len: c.len, x: c.x, y: c.y, dir: c.dir, t: 0, dur: 0.3, kind });
            ev.push({ type: 'caught', sp: c.sp, spec: s2, name: c.sp.name, extra: true });
          }
        }
        // (7.4.15) Leviathan's Maw: up to three animals a swing, any kind the net can hold, near where the hoop passed
        if ((g.multiCatch || 1) > 1) {
          let more = g.multiCatch - 1;
          for (const c of g.fauna.list) {
            if (more <= 0 || bagUsed(g) >= bagSlots(g)) break;
            if (c === tgt.c || c.dead || c.pet || c.companion || c.len > def.maxLen * OVER || c.len > 4 || !canTakeLive(c.sp) || dist(c.x, c.y, tgt.x, tgt.y) > 2.6) continue;
            if (bagUsed(g) + spacesOf({ len: c.len }) > bagSlots(g)) break;
            c.dead = true; more--;
            const s2 = { id: c.sp.id, len: c.len, cond: 1, blessed: !!g.blessCatch, from: Math.round(Math.max(e.y, c.y)), t: g.time };
            g.bag.push(s2); g.captureFx.push({ sp: c.sp, len: c.len, x: c.x, y: c.y, dir: c.dir, t: 0, dur: 0.3, kind });
            ev.push({ type: 'caught', sp: c.sp, spec: s2, name: c.sp.name, extra: true, x: c.x, y: c.y });
          }
        }
      } else {
        ev.push({ type: 'missed', sp: tgt.sp, name: variantName(tgt.sp, tgt.variant), c: tgt.c || null, x: tgt.x, y: tgt.y });
        // (5.0) a miss you can see: the fish flinches and bolts with a kick of speed and a puff of silt and bubbles
        // (now and then the rim clips it instead, and it hangs dazed a moment: a second chance)
        const c = tgt.c;
        // (5.6.9) the tutorial's scripted miss: a short dart of 2 or 3 m and it hangs there, dazed, for the second swing
        // (5.12.2) a miss no longer sends it bolting or leaves it hanging dazed: it swims on at its own pace (the puff of
        // silt and bubbles still shows the miss). The tutorial's scripted miss is only a short nudge on, for the second swing
        // (6.5.7) a miss sends it off about 5 m from him at half again its own pace, keeping off the surface and the floor,
        // then it settles and swims as before: no 2 m dart and a stop that let him swing again and again
        if (c && !g.tutForce && Math.random() < ambushChance(g)) { c.ambushed = true; } // (7.4.0, owner) Ambush: it holds still instead of bolting
        else if (c) { c.tired = 0; c.dazed = 0; const fs = Math.max(0.6, (c.cruise || c.speed || 1) * 1.5); c.fleeSp = fs; c.fleeT = clamp(5 / fs, 1.2, 8.5); c.fleeFrom = { x: e.x, y: e.y }; }
        if (g.bubbles) for (let i = 0; i < 8; i++) g.bubbles.push({ x: tgt.x + (Math.random() - 0.5) * 0.4, y: tgt.y + (Math.random() - 0.5) * 0.3, r: 0.02 + Math.random() * 0.05, w: Math.random() * 6, t: 0 });
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
  return (s.pressed && s.shareHome != null ? s.shareHome : homeOf(s)) - felt; // (4.12.6) sharing a chamber: measured from the chamber's own setting
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
  // (4.12.6) animals sharing a chamber (two tiny ones, or several in the large tank): the chamber is set to the
  // average of their own pressures, and each is kept healthy at it
  { const by = new Map(); for (const s of g.subTank) { if (s.pressed) { if (s.home === undefined) s.home = s.from || 0; const L = by.get(s.chamber) || []; L.push(s); by.set(s.chamber, L); } else delete s.shareHome; }
    for (const L of by.values()) { if (L.length < 2) { delete L[0].shareHome; continue; } const avg = L.reduce((a, q) => a + q.home, 0) / L.length; for (const q of L) q.shareHome = avg; } }
  const tick = (s, inBag) => { if (s.cursed) { s.cond = 1; return; } // (7.6.6, owner) Cursed: never stressed, never dead
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
      const target = clamp(s.shareHome != null ? s.shareHome : s.home, cmin, cmax);
      if (s.press > cmax) s.press = cmax; // more than the walls can hold over the outside: it vents
      if (s.press < cmin) s.press = cmin; // the outside presses in past what the walls can keep out
      if (s.press < target) s.press = Math.min(target, s.press + PUMP * dt);
      else if (s.press > target) s.press = target;
    }
    // the comfort zones, measured from the depth it lives at and scaled by what it can take
    // (pressureTolerance): within 50 m healthy; to 150 m stressed; to 250 m dying; to 350 m dying
    // fast; beyond, dead
    if (!s.tol) { const sp = SPECIES_BY_ID[s.id]; s.tol = (sp ? pressureTolerance(sp, homeOf(s)).k : 1) * (s.blessed ? 2 : 1); } // (5.16.0) Blessed: twice the safe range
    const gap = s.pressed && s.shareHome != null ? Math.min(gapOf(g, s, inBag) / s.tol, ZONE.ok) : gapOf(g, s, inBag) / s.tol; // (sharing: kept healthy)
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
  basic: { name: 'Beginner trawl net', rarity: 'uncommon', /* (6.5.8) */ short: 'NET', price: 50, /* (claude-polish) was 120: a net used up in one haul cost more than a first sub's haul was worth, and one empty net left a new diver broke */ tow: 8, max: 6, maxLen: 2.0, mouth: 1.6, tear: 0.5, slip: 0.15, cap: 2, legendOut: 0.9,
    desc: 'A light trawl for the hatch under the sub. It takes whatever its mouth touches, and dragged along the bottom it scoops up corals, sponges and anemones whole: room for six animals, open for 8 seconds, and it holds fish up to 2 m. Anything bigger, small sharks too, may still be caught, but the bigger it is the likelier it breaks out, and a break can tear the net and lose the whole haul. Nine legends in ten escape it. Used up in one haul; carry up to two.' },
  adv: { name: 'Advanced trawl net', rarity: 'rare', short: 'BIG NET', price: 1200, tow: 11, max: 10, maxLen: 4.0, mouth: 2.6, tear: 0.2, slip: 0.03, cap: 1, legendOut: 0,
    desc: 'The net for big game, and it takes whatever its mouth touches, the bottom too. Its mouth is over half again as wide and it stays open 11 seconds, so it sweeps up far more of a school; it holds ten animals and fish up to 4 m, big ones seldom break out, and no legend escapes it. Almost nothing slips out before it closes. Used up in one haul; carry one.' },
  // (7.3.0, owner) the deep trawl: the deepest subs carry twenty and more in their tanks, and the abyss pays by the
  // animal, so a net that holds what the tank can (a haul limited by the tank, as every haul is)
  deep: { name: 'Deep trawl net', rarity: 'exotic', short: 'DEEP NET', price: 25000, tow: 14, max: 24, maxLen: 4.0, mouth: 3.2, tear: 0.1, slip: 0.02, cap: 1, legendOut: 0,
    desc: 'A long, heavy trawl for the abyss, its mouth on a steel frame. It stays open 14 seconds and holds up to twenty-four animals, as many as the deepest submersibles carry; big animals seldom break out of it, and no legend does. Used up in one haul; carry one.' },
};
// (4.11.1) the chance an animal too big for a net breaks out of it (legends by the net's own odds): more the bigger it is
export const escapeOdds = (T, c) => c.len > 4 ? 1 : LEGENDARY.has(c.sp.id) ? T.legendOut : c.len <= T.maxLen ? 0 : Math.min(0.95, 0.35 + 0.6 * (c.len - T.maxLen) / T.maxLen);
// (4.11.0) the hatch holds nets of each kind: up to two beginner nets and one advanced net. items.nets = { basic, adv }
// (an old save's single items.net becomes one of its kind)
export function netsOf(items) {
  if (!items.nets || typeof items.nets !== 'object') { items.nets = { basic: 0, adv: 0 }; if (items.net && NETS_SUB[items.net]) items.nets[items.net] = 1; }
  delete items.net;
  for (const k of Object.keys(NETS_SUB)) items.nets[k] = Math.max(0, Math.min(NETS_SUB[k].cap, items.nets[k] | 0));
  return items.nets;
}
export const netKinds = (items) => { const N = netsOf(items); return Object.keys(NETS_SUB).filter((k) => N[k] > 0); };
export const netTotal = (items) => { const N = netsOf(items); return Object.values(N).reduce((a, b) => a + b, 0); };
export const NET_DROP = 1.5, TOW_MAX = 8, /* the beginner net's tow; each net has its own (T.tow): 8 s, the advanced 11 s. Timing the run at a school is the skill */ NET_PURSE = 1.0, NET_HAUL = 1.5;
// where the hatch is under the hull, and where the net's mouth hangs behind it, for a sub facing dir
export const hatchAt = (g) => ({ x: g.sub.x - (g.sub.facing || 1) * 1.2, y: g.sub.y + 1.3 });
const towTarget = (g) => { const d = g.sub.facing || 1, k = g.subNet ? g.subNet.T.mouth : 1.6; return { x: g.sub.x - d * (7.5 + k * 1.5), y: g.sub.y + 2.4 + k }; };
// tier: which net to let out (main asks when there is a choice); without one, the only kind carried
export function canFireSubNet(g) {
  if (g.subNet) return null;
  if (!netKinds(g.items).length) return 'No net in the hatch: the Margaret sells them';
  if (g.sub.docked || !g.earl.inSub) return 'Only from the sub, under way';
  if (g.sub.y < 6) return 'Too shallow to trawl';
  return null;
}
export function fireSubNet(g, tier = null) {
  const n = g.subNet;
  if (n) { if (n.phase === 'tow') { n.phase = 'purse'; n.pt = 0; return 'closing'; } return 'busy'; }
  const why = canFireSubNet(g); if (why) return why;
  const N = netsOf(g.items); tier = tier || netKinds(g.items)[0];
  if (!N[tier]) return 'That net is not in the hatch';
  N[tier]--; // used up in this haul, whatever happens
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
    if (g.world.floorAt) n.my = Math.min(n.my, g.world.floorAt(n.mx) - T.mouth * Math.max(0.5, n.open)); // (5.10.10) it rides on the bottom, never through it
    const want = clamp(speed / 1.2, 0.25, 1); // moving, the mouth stands open; stopped, it sags
    n.open += (want - n.open) * Math.min(1, dt * 2);
    n.dir = sub.facing || n.dir;
    if (n.open > 0.6) {
      // (5.10.10) anything the mouth touches is taken: fish, octopuses and crabs, and on the bottom corals, sponges
      // and anemones too (a coral is taken whole and is gone from that spot). The mouth reaches generously: an
      // animal counts as soon as any part of it is in the hoop or just inside the bag, not only its middle.
      const r = T.mouth * n.open, x0 = n.mx - n.dir * 3.2, x1 = n.mx + n.dir * 1.2, lo = Math.min(x0, x1), hi = Math.max(x0, x1);
      const take = (sp, len, variant, c) => {
        if (n.got.length >= T.max) return false;
        if (c && Math.random() < escapeOdds(T, c)) { // (4.11.1) too big for the net: it may break out, and that may tear the net
          if (Math.random() < T.tear) { tearNet(g, c); return 'torn'; }
          n.broke = (n.broke || 0) + 1; c.vx = (c.vx || 0) + n.dir * 4; c.vy = (c.vy || 0) + (Math.random() - 0.5) * 2; g.netEscape = c.sp; c.netOut = g.time; return false;
        }
        return true;
      };
      for (const c of g.fauna.list) {
        if (c.dead || c.hidden || c.pet || c.companion || n.got.includes(c) || (c.netOut && g.time - c.netOut < 2)) continue;
        if (g.trawlOnly && c !== g.trawlOnly) continue; // (6.6.2) the first trawl's lesson: only its jellyfish
        const reach = r + 0.5 + c.len * 0.4;
        if (c.x + c.len * 0.5 < lo || c.x - c.len * 0.5 > hi || Math.abs(c.y - n.my) > reach) continue;
        if (!canTake(c.sp)) continue;
        const ok = take(c.sp, c.len, c.variant, c);
        if (ok === 'torn') return { torn: c.sp };
        if (!ok) continue;
        n.got.push(c); c.dead = true; c.netted = true;
      }
      // the bottom: what grows there is scooped up when the mouth drags through it (too big for the net, it stays)
      for (let k = g.trawlOnly ? -1 : g.world.statics.length - 1; k >= 0; k--) {
        const st = g.world.statics[k], sp = st.sp, len = sp.len * st.scale;
        if (st.x + len * 0.5 < lo || st.x - len * 0.5 > hi) continue;
        if (!(st.y - len < n.my + r + 0.6 && st.y > n.my - r - 0.6)) continue; // it stands from the floor (st.y) up to st.y - len
        if (sp.cat === 'Kelp & Plants' || PROTECTED.has(sp.id) || len > T.maxLen) continue; /* kelp and seagrass stay; corals and anemones carry hab 'plant' too, but they are taken */
        if (n.got.length >= T.max) break;
        g.world.statics.splice(k, 1); g.world.staticsVer = (g.world.staticsVer || 0) + 1;
        n.got.push({ sp, len, variant: st.variant, y: st.y, fromFloor: true });
      }
    }
    if (n.pt >= (n.T.tow || TOW_MAX) && !(g.trawlOnly && !g.trawlOnly.netted)) { /* (7.4.26, owner) in the lesson it stays open until its jellyfish is in (the old check looked for a lesson kind never set, so it closed at 8 s) */ n.phase = 'purse'; n.pt = 0; } // (4.12.2) in the lesson it stays out until it is closed
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
    if (c.fromFloor) continue; // (5.10.10) a coral torn loose sinks away; it does not swim off
    const f = g.fauna.makeFish(c.sp, n.mx + (Math.random() - 0.5) * 2, n.my + (Math.random() - 0.5) * 2, Math.random() < 0.5 ? -1 : 1, g.fauna.groupId++, true);
    if (c.variant) f.variant = c.variant;
    g.fauna.list.push(f);
  }
  n.got = []; n.phase = 'torn'; n.pt = 0; n.big = big.sp;
}
