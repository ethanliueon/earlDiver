// The things a diver owns (2.8.0): items with a rarity, fixed stats from their kind's archetype, skills,
// and set pieces; and the player's locker (40 things, what he has on included). The data is in
// item_data.js; the plan is docs/GEAR_AND_SHOPS_PLAN.md.
//
// An item definition (ITEMS[id]): kind, arch, rarity, name, line, good, bad, price, shop ('catalog',
// 'dave', ...) or chest (true), set (a SETS key), legend (a LEGEND key), glow (Legendaries), sk (a shop
// item's fixed basic skill), and its stats:
//   net / slurp: range (m), time (s), minLen / maxLen (m), success, harm, noise, multi
//   tag: range, time, provoke, pay        cam: range, shots, flash, small
//   fins: swim, sprint                    tank: air (s), speed, quiet
//   bag: slots, apart                     suit: press (m), air (×), speed (×), bite, warm, quiet, look
// An owned thing is an instance in the locker: { u, id, sk: [[skill, level], ...], leg }.
import { designFor } from './designs.js';
import { RARITY, RARITIES, SKILLS, LEGEND, FREE_ROWS, BAYSIDE_ROWS, DAVE_ROWS, STATION_ROWS, EXOTICS, LEGENDARIES, SETS, SET_PIECE, MAKERS, MODELS, NOUN, ARCH_LINE, CHEST_COUNTS, LOOKS, EXOTIC_LOOK } from './item_data.js';
export { RARITY, RARITIES, SKILLS, LEGEND, SETS } from './item_data.js';

export const KINDS = ['net', 'slurp', 'tag', 'cam', 'suit', 'fins', 'tank', 'bag'];
export const MAIN_KINDS = ['net', 'fins', 'tank', 'bag', 'suit'];
export const SIDE_KINDS = ['slurp', 'tag', 'cam'];
export const KIND_NAME = { net: 'Hand nets', slurp: 'Slurp guns', tag: 'Tag guns', cam: 'Cameras', suit: 'Suits', fins: 'Fins', tank: 'Air', bag: 'Bags' };
export const FREE = { net: 'hand', fins: 'rubber', tank: 'al80', bag: 'mesh', suit: 'wet' }; // what he starts with, all on (the tools 2-4 start empty)
export const SHOP_OF = { catalog: 'Bayside Marine Supply', dave: "Dave's Haul", station: 'The research station', old: 'The old one' };
export const LOCKER = 40;

// ---------- archetypes: a Common's stats; a rarity scales them by its power p ----------
const ARCH = {
  net: {
    everyday: { range: 1.2, time: 1.0, maxLen: 0.45, success: 0.65, harm: 0.15 },
    gentle: { range: 1.3, time: 0.8, maxLen: 0.25, success: 0.75, harm: 0.03 },
    reach: { range: 2.2, time: 1.45, maxLen: 0.55, success: 0.7, harm: 0.12 },
    quick: { range: 1.1, time: 0.6, maxLen: 0.4, success: 0.72, harm: 0.12 },
    big: { range: 1.5, time: 1.25, minLen: 0.3, maxLen: 1.0, success: 0.7, harm: 0.14 },
    school: { range: 1.4, time: 1.5, maxLen: 0.35, success: 0.7, harm: 0.25, multi: 2 },
    sure: { range: 1.2, time: 1.1, maxLen: 0.45, success: 0.82, harm: 0.1 },
  },
  slurp: {
    normal: { range: 1.8, time: 2.0, maxLen: 0.2, success: 0.85, harm: 0.05 },
    sipper: { range: 1.6, time: 0.9, maxLen: 0.08, success: 0.92, harm: 0 },
    wide: { range: 1.8, time: 2.3, maxLen: 0.3, success: 0.8, harm: 0.07 },
    long: { range: 2.6, time: 1.7, maxLen: 0.2, success: 0.85, harm: 0.05 },
  },
  tag: { pole: { range: 2.5, time: 4, provoke: 0.5, pay: 1 }, gas: { range: 5, time: 3.2, provoke: 0.3, pay: 1 }, sat: { range: 4, time: 3.5, provoke: 0.35, pay: 1.4 } },
  cam: { compact: { range: 8, shots: 5, flash: true }, macro: { range: 2, shots: 8, flash: true, small: 1.5 }, housed: { range: 11, shots: 14, flash: true }, lowlight: { range: 9, shots: 10, flash: false } },
  fins: { rubber: { swim: 1, sprint: 1.5 }, split: { swim: 1.2, sprint: 1.4 }, long: { swim: 1.3, sprint: 1.65 }, jet: { swim: 1.08, sprint: 2.0 }, free: { swim: 1.35, sprint: 1.5 } },
  // (2.8.0: all air is cut to 0.4 of what it was: he starts with 20 s)
  tank: { al: { air: 20, speed: 1 }, steel: { air: 28, speed: 1 }, big: { air: 38, speed: 0.97 }, twin: { air: 56, speed: 0.92 }, side: { air: 62, speed: 1 }, rebreather: { air: 80, speed: 1, quiet: true } },
  bag: { mesh: { slots: 5 }, large: { slots: 7 }, divided: { slots: 7, apart: true }, light: { slots: 6, feather: 1 } },
  suit: {
    wet: { press: 300, air: 1, speed: 1 }, skin: { press: 300, air: 1.1, speed: 1.15 }, dry: { press: 400, air: 1, speed: 1.04, warm: true },
    chain: { press: 300, air: 1, speed: 1.0, bite: 1 }, rebreather: { press: 300, air: 0.8, speed: 1.06, quiet: true }, hard: { press: 700, air: 0.9, speed: 0.95, bite: 1, warm: true },
  },
};
const TOOL_LOOK = { net: { everyday: 0, gentle: 1, reach: 2, quick: 0, big: 3, school: 1, sure: 3 }, slurp: { normal: 0, sipper: 0, wide: 1, long: 1 }, tag: { pole: 0, gas: 1, sat: 2 }, cam: { compact: 0, macro: 0, housed: 1, lowlight: 2 } };
const BAG_PLUS = [0, 1, 1, 2, 4];
function statsOf(kind, arch, rarity) {
  const b = ARCH[kind][arch], p = RARITY[rarity].p, k = RARITY[rarity].k, s = { ...b };
  if (kind === 'net' || kind === 'slurp') {
    s.range = +(b.range * Math.pow(p, 0.5)).toFixed(2); s.time = +(b.time / Math.pow(p, 0.5)).toFixed(2); s.maxLen = +(b.maxLen * Math.pow(p, 0.6)).toFixed(2);
    s.success = +(1 - (1 - b.success) / Math.pow(p, 1.2)).toFixed(3); s.harm = +(b.harm / Math.pow(p, 1.5)).toFixed(3);
    if (b.multi) s.multi = b.multi + (k >= 3 ? 1 : 0) + (k >= 4 ? 1 : 0);
    s.noise = 0.012 / p;
  } else if (kind === 'tag') { s.range = +(b.range * Math.pow(p, 0.7)).toFixed(1); s.time = +(b.time / Math.pow(p, 0.6)).toFixed(1); s.provoke = +(b.provoke / Math.pow(p, 1.3)).toFixed(2); s.pay = +(b.pay * Math.pow(p, 0.4)).toFixed(2); }
  else if (kind === 'cam') { s.range = +(b.range * Math.pow(p, 0.5)).toFixed(1); s.shots = Math.round(b.shots * p); }
  else if (kind === 'fins') { s.swim = +(b.swim * Math.pow(p, 0.55)).toFixed(2); s.sprint = +(b.sprint * Math.pow(p, 0.3)).toFixed(2); }
  else if (kind === 'tank') { s.air = Math.round(b.air * Math.pow(p, 0.9)); }
  else if (kind === 'bag') { s.slots = b.slots + BAG_PLUS[k]; }
  else if (kind === 'suit') { s.press = b.press + 60 * k; s.air = +(b.air / Math.pow(p, 0.25)).toFixed(2); s.speed = +(b.speed * Math.pow(p, 0.15)).toFixed(2); }
  if (TOOL_LOOK[kind]) s.look = TOOL_LOOK[kind][arch];
  if (kind === 'suit') s.look = arch;
  return s;
}
// what a thing is worth (a chest item's value, before its skills; selling pays about a third)
const VALUE = { common: 120, uncommon: 450, rare: 1800, exotic: 9000, legendary: 40000 };
// the "good for" line, worked out from the stats
function goodOf(kind, s) {
  const cm = (m) => Math.round(m * 100);
  if (kind === 'net' || kind === 'slurp') return `${s.multi ? `Up to ${s.multi} from a school at once; ` : ''}fish ${s.minLen ? `${cm(s.minLen)}–${cm(s.maxLen)} cm` : `up to ${cm(s.maxLen)} cm`}, reach ${s.range} m`;
  if (kind === 'tag') return `Tagging from ${s.range} m`;
  if (kind === 'cam') return `${s.shots} photographs a dive${s.flash ? '' : ', no flash'}`;
  if (kind === 'fins') return `Cruising ×${s.swim}, sprint ×${s.sprint}`;
  if (kind === 'tank') return `About ${s.air} s of air${s.quiet ? ', no bubbles' : ''}`;
  if (kind === 'bag') return `${s.slots} animals${s.apart ? ', kept apart' : ''}`;
  if (kind === 'suit') return `Pressure starts at ${s.press} m${s.warm ? '; keeps out the cold' : ''}${s.bite ? '; turns a bite' : ''}`;
  return '';
}
// Rare things have their own colours (a hue from their name); Exotics and Legendaries their own look
function hueOf(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
function paletteOf(def) {
  if (RARITY[def.rarity].k < 2 || def.kind !== 'suit') return null;
  const h = def.glow ? hueOf(def.glow) : hueOf(def.id), sat = def.rarity === 'rare' ? 35 : 45;
  return [hsl(h, sat, 12), hsl(h, sat, 26), hsl(h, sat, 19), hsl((h + 40) % 360, 60, 45), hsl(h, sat, 8)];
}

// ---------- the definitions ----------
export const ITEMS = {};
function add(def) {
  Object.assign(def, statsOf(def.kind, def.arch, def.rarity));
  if (!def.good) def.good = goodOf(def.kind, def);
  if (def.price == null) def.price = Math.round(VALUE[def.rarity] * (SIDE_KINDS.includes(def.kind) ? 0.6 : 1));
  def.pal = paletteOf(def);
  // (2.8.1) the special looks: a Legendary's own, or the old-expedition look of an Exotic
  const Lk = LOOKS[def.id], ex = def.rarity === 'exotic';
  if (def.kind === 'net') {
    // a net's shape is what it is for (a square dip frame, a long pear-shaped pole net, a wide school net,
    // a D-frame for big game); the Legendaries have their own; Exotics are old brass and wood
    const SHAPE = { gentle: 'square', reach: 'teardrop', school: 'wide' }[def.arch] || null, base = typeof def.look === 'number' ? def.look : 0;
    if (Lk) def.look = Lk.net;
    else if (ex) def.look = EXOTIC_LOOK.net(base, SHAPE);
    else if (SHAPE || def.arch === 'quick') def.look = { base, shape: SHAPE, ...(def.arch === 'quick' ? { len: 24, r: 7.5, bag: 12 } : {}), ...(def.rarity === 'rare' ? { hoop: '#3a4046', h: ['#7a8a96', '#4a5660', '#22282e'] } : {}) };
  }
  if (def.kind === 'fins') def.finLook = Lk ? Lk.fin : ex ? EXOTIC_LOOK.fin : null;
  if (def.kind === 'tank') def.tankLook = Lk ? Lk.tank : ex ? EXOTIC_LOOK.tank : null;
  if (def.kind === 'suit' && (Lk || ex)) { def.pal = Lk ? Lk.suit : EXOTIC_LOOK.suit[def.arch]; def.suitGlow = Lk ? Lk.glow : null; }
  // (3.0.0) designs: each Rare in its finish, each set in its set's, each Exotic its own (designs.js)
  const D = designFor(def); if (D) { if (D.look && def.kind === 'net') def.look = { ...(typeof def.look === 'object' ? def.look : {}), ...D.look }; else if (D.look) def.look = D.look; for (const k of ['finLook', 'tankLook', 'bagLook', 'pal']) if (D[k]) def[k] = D[k]; }
  ITEMS[def.id] = def;
}
const fromRow = (shop) => ([id, kind, arch, rarity, price, name, line, good, bad, sk]) => add({ id, kind, arch, rarity, price, name, line, good, bad: bad || '', shop, sk: sk || null });
FREE_ROWS.forEach(fromRow('free'));
BAYSIDE_ROWS.forEach(fromRow('catalog'));
DAVE_ROWS.forEach(fromRow('dave'));
STATION_ROWS.forEach(fromRow('station')); // (3.0.0)
// chest Commons, Uncommons and Rares: a maker, a model, what it is
for (const kind of KINDS) {
  const counts = CHEST_COUNTS[MAIN_KINDS.includes(kind) ? 'main' : 'side'], archs = Object.keys(ARCH[kind]);
  let n = 0;
  for (const rarity of ['common', 'uncommon', 'rare']) {
    for (let i = 0; i < counts[rarity]; i++, n++) {
      const arch = archs[(n * 3 + i) % archs.length], maker = MAKERS[(n * 5 + kind.length) % MAKERS.length], models = MODELS[rarity], model = models[(n * 7 + i) % models.length];
      add({ id: `c_${kind}_${n}`, kind, arch, rarity, chest: true, name: `${maker} ${model} ${NOUN[kind][arch]}`, line: ARCH_LINE[kind][arch], bad: '' });
    }
  }
}
// chest Exotics: lost expedition gear
for (const [kind, rows] of Object.entries(EXOTICS)) rows.forEach(([name, arch, line], i) => add({ id: `x_${kind}_${i}`, kind, arch, rarity: 'exotic', chest: true, name, line, bad: '' }));
// chest Legendaries: eerie things from the deep
for (const L of LEGENDARIES) add({ ...L, rarity: 'legendary', chest: true, bad: '' });
// set pieces
for (const [key, S] of Object.entries(SETS)) for (const [kind, arch] of Object.entries(S.archs)) add({ id: `set_${key}_${kind}`, kind, arch, rarity: S.rarity, chest: true, set: key, name: `${S.name} ${SET_PIECE[kind]}`, line: S.line, bad: '' });

export const ITEMS_OF = (kind, shop = null) => Object.values(ITEMS).filter((it) => it.kind === kind && (!shop || it.shop === shop));
export const CHEST_POOL = Object.values(ITEMS).filter((it) => it.chest);

// ---------- skills rolled on a chest item ----------
const ROLL = { common: [0, 1], uncommon: [1, 1], rare: [2, 2], exotic: [2, 3], legendary: [2, 3] }; // [fewest, most] skills
// the chance of each level (I, II, III, IV) by rarity (decided 7 Nov): a Common's one skill (half have one)
// is always I; an Uncommon's 70 % I, 30 % II; a Rare's 30 / 40 / 30 up to III; an Exotic's 10 / 35 / 55;
// a Legendary's 5 / 20 / 40 / 35, the only rarity with level IV
const LEVELS = { common: [1], uncommon: [0.7, 0.3], rare: [0.3, 0.4, 0.3], exotic: [0.1, 0.35, 0.55], legendary: [0.05, 0.2, 0.4, 0.35] };
function rollLevel(rarity, rnd) { const w = LEVELS[rarity]; let r = rnd(); for (let i = 0; i < w.length; i++) { if (r < w[i]) return i + 1; r -= w[i]; } return w.length; }
export function rollSkills(def, rnd = Math.random) {
  if (!def.chest) return def.sk ? [def.sk.slice()] : [];
  const [lo, hi] = ROLL[def.rarity], k = RARITY[def.rarity].k;
  let n = lo + Math.floor(rnd() * (hi - lo + 1));
  if (def.rarity === 'common') n = rnd() < 0.5 ? 1 : 0;
  if (def.set) n = Math.max(0, n - 1); // a set piece rolls one fewer: the set's trait makes up for it
  if (def.rarity === 'legendary' && !def.legend) n += 1; // a Legendary with no legendary skill (anything but a net) rolls one more
  const pool = Object.entries(SKILLS).filter(([key, S]) => key !== 'biolum' && (S.fits === 'any' || S.fits.includes(def.kind)) && (!S.min || k >= RARITY[S.min].k)).map(([key]) => key);
  if (k === 3) pool.push('biolum'); // (a Legendary always has it, on top of its rolls)
  const out = [];
  while (out.length < n && pool.length) {
    const key = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    out.push([key, SKILLS[key].flat ? 1 : rollLevel(def.rarity, rnd)]);
  }
  if (def.rarity === 'legendary' && !out.some((q) => q[0] === 'biolum')) out.push(['biolum', 1]); // every Legendary glows
  return out;
}

// ---------- the locker ----------
let UID = Date.now() % 100000;
const newUid = () => 'i' + (UID++).toString(36) + Math.floor(Math.random() * 1296).toString(36);
export function kitOf(P) {
  if (!P.kit || P.kit.v !== 2) {
    // (a profile from before 2.8.0: the free kit, plus anything it owned that still exists)
    const old = P.kit && P.kit.own ? Object.values(P.kit.own).flat() : [];
    P.kit = { v: 2, items: [], on: {}, rev: 1 };
    for (const [kind, id] of Object.entries(FREE)) { const it = mk(id); P.kit.items.push(it); P.kit.on[kind] = it.u; }
    for (const id of old) if (ITEMS[id] && !Object.values(FREE).includes(id) && P.kit.items.length < LOCKER) P.kit.items.push(mk(id));
    for (const k of SIDE_KINDS) if (P.kit.on[k] === undefined) P.kit.on[k] = null;
  }
  return P.kit;
}
function mk(id, rnd) { const def = ITEMS[id]; return { u: newUid(), id, sk: rollSkills(def, rnd), ...(def.legend ? { leg: def.legend } : {}) }; }
export const rollSkillsFor = (def, rnd) => rollSkills(def, rnd); // (3.0.0) the old one's wares are rolled when laid out
export function giveRolled(P, q) { if (lockerFree(P) <= 0) return null; const n = { u: newUid(), id: q.id, sk: q.sk || [], ...(q.leg ? { leg: q.leg } : {}) }; kitOf(P).items.push(n); bump(P); return n; }
export const lockerCount = (P) => kitOf(P).items.length;
export const lockerFree = (P) => LOCKER - lockerCount(P);
export const instOf = (P, u) => kitOf(P).items.find((q) => q.u === u) || null;
export const wornInst = (P, kind) => { const u = kitOf(P).on[kind]; return u ? instOf(P, u) : null; };
export const worn = (P, kind) => { const q = wornInst(P, kind); return q ? ITEMS[q.id] : null; };
export const ownsItem = (P, id) => kitOf(P).items.some((q) => q.id === id);
export const isOn = (P, q) => kitOf(P).on[ITEMS[q.id].kind] === q.u;
const bump = (P) => { kitOf(P).rev = (kitOf(P).rev || 0) + 1; };
// a new thing into the locker (null if it is full)
export function giveItem(P, id, rnd) { if (!ITEMS[id] || lockerFree(P) <= 0) return null; const q = mk(id, rnd); kitOf(P).items.push(q); bump(P); return q; }
export function putOn(P, u) { const q = instOf(P, u); if (!q) return false; kitOf(P).on[ITEMS[q.id].kind] = u; bump(P); return true; }
export function takeOff(P, kind) { if (FREE[kind]) return false; kitOf(P).on[kind] = null; bump(P); return true; } // net, fins, tank, bag and suit always have one on
// out of the locker (sold): never the thing he has on
export function removeItem(P, u) { const K = kitOf(P), i = K.items.findIndex((q) => q.u === u); if (i < 0 || isOn(P, K.items[i])) return false; K.items.splice(i, 1); bump(P); return true; }
export function valueOf(q) { const def = ITEMS[q.id]; return Math.round(def.price * (1 + 0.05 * (q.sk || []).reduce((a, [, l]) => a + l, 0)) * (q.leg ? 1.2 : 1)); }
export const sellValue = (q) => Math.max(1, Math.round(valueOf(q) * 0.3));

// ---------- what everything he has on adds up to (skills stack fully) ----------
const TOT = new WeakMap();
export function totals(P) {
  const K = kitOf(P), hit = TOT.get(K);
  if (hit && hit.rev === K.rev) return hit.t;
  const t = { sk: {}, legends: new Set(), sets: {}, setsOn: new Set(), glows: [], trail: null, trailKind: null };
  for (const u of Object.values(K.on)) {
    const q = u && instOf(P, u); if (!q) continue;
    const def = ITEMS[q.id];
    for (const [k, l] of q.sk || []) t.sk[k] = (t.sk[k] || 0) + l;
    if (q.leg) t.legends.add(q.leg);
    if (def.rarity === 'legendary' && (def.kind === 'net' || !t.trail)) { t.trail = def.glow; t.trailKind = def.legend || 'motes'; } // one trail only: the net's, if it is Legendary
    if ((q.sk || []).some(([k]) => k === 'biolum')) t.glows.push(def.glow || '#8af0d0');
    if (def.set) t.sets[def.set] = (t.sets[def.set] || 0) + 1;
  }
  for (const [s, n] of Object.entries(t.sets)) if (n >= 3) t.setsOn.add(s);
  TOT.set(K, { rev: K.rev, t });
  return t;
}
export const skillLv = (P, k) => (totals(P).sk[k] || 0);
export const hasLegend = (P, k) => totals(P).legends.has(k);
export const setOn = (P, k) => totals(P).setsOn.has(k);
// a chest roll: a random chest item of the rarity given
export function chestPick(rarity, rnd = Math.random) { const pool = CHEST_POOL.filter((it) => it.rarity === rarity); return pool[Math.floor(rnd() * pool.length)]; }
