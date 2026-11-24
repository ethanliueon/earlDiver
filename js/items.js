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
//   bag: slots                            suit: press (m), air (×), speed (×), bite, warm, quiet, look
// An owned thing is an instance in the locker: { u, id, sk: [[skill, level], ...], leg }.
import { WORDS, ARCH_WORDS } from './item_words.js';
import { designFor } from './designs.js';
import { ABILITY_DEFS, abilityId } from './abilities.js';
import { RARITY, SKILLS, FREE_ROWS, BAYSIDE_ROWS, DAVE_ROWS, STATION_ROWS, EXOTICS, LEGENDARIES, SETS, SET_PIECE, MAKERS, MODELS, NOUN, ARCH_LINE, CHEST_COUNTS, LOOKS, EXOTIC_LOOK } from './item_data.js';
export { RARITY, RARITIES, SKILLS, LEGEND, SETS } from './item_data.js';

// (5.0) the slurp gun and the tag gun are gone: the net catches, the camera records what can't be brought up
export const KINDS = ['net', 'cam', 'suit', 'fins', 'tank', 'bag'];
export const MAIN_KINDS = ['net', 'fins', 'tank', 'bag', 'suit'];
export const SIDE_KINDS = ['cam'];
export const RETIRED_KINDS = new Set(['slurp', 'tag']);
export const RETIRED = {}; // id -> what it cost: a save that owned one is paid this back
export const KIND_NAME = { net: 'Hand nets', cam: 'Cameras', suit: 'Suits', fins: 'Fins', tank: 'Air', bag: 'Bags' };
export const FREE = { net: 'hand', fins: 'rubber', tank: 'al80', bag: 'mesh', suit: 'wet' }; // what he starts with, all on (the tools 2-4 start empty)
export const SHOP_OF = { catalog: 'Bayside Marine Supply', dave: "Dave's Haul", station: 'The research station', old: 'The old one' };
export const LOCKER = 30; // (3.0.31) thirty things in the locker; what he has on is not in it

// ---------- archetypes: a Common's stats; a rarity scales them by its power p ----------
const ARCH = {
  net: {
    everyday: { range: 1.2, time: 1.0, maxLen: 0.45, success: 0.65, harm: 0.15 },
    gentle: { range: 1.3, time: 0.8, maxLen: 0.3, success: 0.75, harm: 0.03 },
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
  // (5.0) exp: how long the shutter is open (Earl holds still); assist: how much it steadies the frame on the animal
  cam: { compact: { range: 8, shots: 5, flash: true, exp: 1.8, assist: 0.15 }, macro: { range: 2, shots: 8, flash: true, small: 1.5, exp: 1.3, assist: 0.3 }, housed: { range: 11, shots: 14, flash: true, exp: 0.9, assist: 0.5 }, lowlight: { range: 9, shots: 10, flash: false, exp: 0.7, assist: 0.55 } },
  fins: { rubber: { swim: 1, sprint: 1.5 }, split: { swim: 1.2, sprint: 1.4 }, long: { swim: 1.3, sprint: 1.65 }, jet: { swim: 1.08, sprint: 2.0 }, free: { swim: 1.35, sprint: 1.5 } },
  // (2.8.0: all air is cut to 0.4 of what it was: he starts with 20 s)
  tank: { al: { air: 20, speed: 1 }, steel: { air: 28, speed: 1 }, big: { air: 38, speed: 0.97 }, twin: { air: 56, speed: 0.92 }, side: { air: 62, speed: 1 }, rebreather: { air: 80, speed: 1, quiet: true } },
  bag: { mesh: { slots: 5 }, large: { slots: 7 }, divided: { slots: 7 } /* (6.1.6) no 'kept apart': a bag is its spaces (and any skills it carries) */, light: { slots: 6, feather: 1 } },
  suit: {
    wet: { press: 300, air: 1, speed: 1 }, skin: { press: 300, air: 1.1, speed: 1.15 }, dry: { press: 400, air: 1, speed: 1.04, warm: true },
    chain: { press: 300, air: 1, speed: 1.0, bite: 1 }, rebreather: { press: 300, air: 0.8, speed: 1.06, quiet: true }, hard: { press: 700, air: 0.9, speed: 0.95, bite: 1, warm: true },
  },
};
const TOOL_LOOK = { net: { everyday: 0, gentle: 1, reach: 2, quick: 0, big: 3, school: 1, sure: 3 }, slurp: { normal: 0, sipper: 0, wide: 1, long: 1 }, tag: { pole: 0, gas: 1, sat: 2 }, cam: { compact: 0, macro: 0, housed: 1, lowlight: 2 } };
const BAG_PLUS = [0, 1, 1, 2, 5]; // (3.0.38) a Legendary bag: twelve pockets
function statsOf(kind, arch, rarity) {
  const b = ARCH[kind][arch], p = RARITY[rarity].p, k = RARITY[rarity].k, s = { ...b };
  if (kind === 'net' || kind === 'slurp') {
    s.range = +(b.range * Math.pow(p, 0.5)).toFixed(2); s.time = +(b.time / Math.pow(p, 0.5)).toFixed(2); s.maxLen = +(b.maxLen * Math.pow(p, 0.6)).toFixed(2);
    s.success = +(1 - (1 - b.success) / Math.pow(p, 1.2)).toFixed(3); s.harm = +(b.harm / Math.pow(p, 1.5)).toFixed(3);
    if (b.multi) s.multi = b.multi + (k >= 3 ? 1 : 0) + (k >= 4 ? 1 : 0);
    s.noise = 0.012 / p;
  } else if (kind === 'tag') { s.range = +(b.range * Math.pow(p, 0.7)).toFixed(1); s.time = +(b.time / Math.pow(p, 0.6)).toFixed(1); s.provoke = +(b.provoke / Math.pow(p, 1.3)).toFixed(2); s.pay = +(b.pay * Math.pow(p, 0.4)).toFixed(2); }
  else if (kind === 'cam') { s.range = +(b.range * Math.pow(p, 0.5)).toFixed(1); s.shots = Math.round(b.shots * p); s.exp = +(b.exp / Math.pow(p, 0.6)).toFixed(2); s.assist = +Math.min(0.85, b.assist + 0.08 * k).toFixed(2); }
  else if (kind === 'fins') { s.swim = +(b.swim * Math.pow(p, 0.55)).toFixed(2); s.sprint = +(b.sprint * Math.pow(p, 0.3)).toFixed(2); }
  else if (kind === 'tank') { s.air = Math.round(b.air * Math.pow(p, 0.9)); }
  else if (kind === 'bag') { s.slots = b.slots + BAG_PLUS[k]; }
  else if (kind === 'suit') { s.press = b.press + 60 * k; s.air = +(b.air / Math.pow(p, 0.25)).toFixed(2); s.speed = +(b.speed * Math.pow(p, 0.15)).toFixed(2); }
  if (TOOL_LOOK[kind]) s.look = TOOL_LOOK[kind][arch];
  if (kind === 'suit') s.look = arch;
  return s;
}
// (5.10.10) a camera's Quality number, shown on its card ("Quality 22.16"): the per cent of an animal's worth a
// photograph from it earns before the photo's grade. Each rarity has its band, and each model its own exact figure
// inside it (from its id), so two cameras compare at a glance without a round rule showing through.
const CAM_BAND = { common: [9, 11.5], uncommon: [13.5, 16.5], rare: [20, 24.5], exotic: [27.5, 32.5], legendary: [37.5, 42] };
export function camIndex(def) {
  const [a, b] = CAM_BAND[def.rarity] || CAM_BAND.common; let h = 2166136261;
  for (const ch of String(def.id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return +(a + ((h >>> 0) % 10000) / 10000 * (b - a)).toFixed(2);
}
// what a thing is worth (a chest item's value, before its skills; selling pays about a third)
// (5.10.10) each rarity's price band starts here (common $25-300, uncommon $300-1,500, rare $1,500-8,000, exotic $8,000-40,000, legendary $45,000 up)
export const BAND_MIN = { common: 25, uncommon: 300, rare: 1500, exotic: 8000, legendary: 45000 };
// (6.4.0) friendlier prices at the cheap end: rare at most about $2,000. Each item keeps its
// place within its rarity (the old band mapped onto the new on a log scale).
const OLD_BAND = { uncommon: [300, 1500], rare: [1500, 8000], exotic: [8000, 40000], legendary: [45000, 90000] };
// (6.4.1) only the cheap end: exotic and legendary items keep their old prices (deep players earn $3-8k a catch, $60k+ a legend)
const NEW_BAND = { uncommon: [300, 1000], rare: [1000, 2000] };
function reband(def) {
  // (6.4.1) suits too, at the cheap end
  const O = OLD_BAND[def.rarity], N = NEW_BAND[def.rarity]; if (!O || !N) return def.price;
  const t = Math.min(1, Math.max(0, Math.log(def.price / O[0]) / Math.log(O[1] / O[0])));
  const v = N[0] * Math.pow(N[1] / N[0], t); return v < 1000 ? Math.round(v / 5) * 5 : Math.round(v / 50) * 50;
}
const VALUE = { common: 120, uncommon: 450, rare: 1800, exotic: 15000, legendary: 90000 }; // (3.7.0) the top two raised with what the deep pays
// the "good for" line, worked out from the stats
function goodOf(kind, s) {
  
  if (kind === 'net' || kind === 'slurp') return `${s.multi ? `Up to ${s.multi} from a school at once; ` : ''}fish size ${s.minLen ? `${s.minLen.toFixed(2)}–${s.maxLen.toFixed(2)} m` : `${s.maxLen.toFixed(2)} m`}, reach ${s.range} m`; // (6.0.8)
  if (kind === 'tag') return `Tagging from ${s.range} m`;
  if (kind === 'cam') return `Quality ${(s.idx || 10).toFixed(2)}; holds ${s.shots} exposures, ${s.exp} s to take${s.flash ? '' : ', no flash'}`;
  if (kind === 'fins') return `Speed ${+s.swim.toFixed(2)}, sprint ${+s.sprint.toFixed(2)}`; // (6.5.8) the real figure: the first fins 1, the best about 3 (halved, the first read 0.5, like a loss)
  if (kind === 'tank') return `About ${s.air} s of air${s.quiet ? ', no bubbles' : ''}`;
  if (kind === 'bag') return `${s.slots} spaces`;
  if (kind === 'suit') return `Pressure starts at ${s.press} m${s.air < 1 ? `; air use ×${s.air}` : ''}${s.warm ? '; keeps out the cold' : ''}${s.bite ? '; turns a bite' : ''}`;
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
  if (RETIRED_KINDS.has(def.kind)) { RETIRED[def.id] = def.price != null ? def.price : Math.round(VALUE[def.rarity] * 0.6); return; }
  Object.assign(def, statsOf(def.kind, def.arch, def.rarity));
  if (def.kind === 'cam') def.idx = camIndex(def); // (5.10.10) the camera's Quality: what share of an animal's worth its photographs earn
  if (!def.good) def.good = goodOf(def.kind, def);
  if (def.price == null) def.price = Math.round(VALUE[def.rarity] * (SIDE_KINDS.includes(def.kind) ? 0.6 : 1));
  def.price = Math.max(def.price, BAND_MIN[def.rarity] || 0); // (5.10.10) never below its rarity's band, so the colour means the price
  def.price = reband(def); // (6.4.0) the friendlier bands
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
// (5.0) the net he starts with is a worn one: smaller fish, more misses, rougher on them, a slower swing.
// Every net in the shop now beats it at something (size, care, speed, reach) instead of being a step down
Object.assign(ITEMS.hand, { maxLen: 0.3, success: 0.58, harm: 0.2, time: 1.1, range: 1.1 });
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

// (5.9.0) ability scrolls: items like the rest (chests, the Old One, the locker), with no rolled skills
for (const [fam, T] of Object.entries(ABILITY_DEFS)) for (const [tier, d] of Object.entries(T)) {
  const id = abilityId(fam, tier); ITEMS[id] = { id, kind: 'ability', arch: fam, fam, tier, rarity: tier, chest: true, name: d.name, line: d.line, good: d.line, bad: '', price: reband({ rarity: tier, kind: 'ability', price: Math.max(BAND_MIN[tier] || 0, Math.round(VALUE[tier] * 0.8)) }) }; // (5.10.10) within its band
}
// (5.11.8) names that grow with rarity (owner-approved): a common is plain, with no maker; an exotic has a history or an
// owner. Uncommon, rare and legendary names stay as they were. Applied after every item is built, because the looks
// (designs.js) are found by the old names; the ids are unchanged, so saves are not affected
const RENAMES = {
  c_net_0: 'Hoop net', c_net_1: 'Game net', c_net_2: 'Dip net', c_net_3: 'Seine net', c_net_4: 'Pole net', c_cam_0: 'Pocket compact', c_cam_1: 'Plastic compact',
  c_suit_0: 'Hire wetsuit', c_suit_1: 'Training rebreather suit', c_suit_2: 'Patched drysuit', c_suit_3: 'Old wetsuit', c_suit_4: 'Old rebreather suit',
  c_fins_0: 'Old rubber fins', c_fins_1: 'Freediving fins', c_fins_2: 'Hire jet fins', c_fins_3: 'Plastic blades', c_fins_4: 'Short split fins',
  c_tank_0: 'Hire cylinder', c_tank_1: 'Small sidemount pair', c_tank_2: 'Big steel cylinder', c_tank_3: 'Old cylinder', c_tank_4: 'Pony sidemount pair',
  c_bag_0: 'Canvas pouch', c_bag_1: 'Net pouch', c_bag_2: 'Belt pouch', c_bag_3: 'Rubber pouch', c_bag_4: 'Old pouch',
  lowlight: 'Navy low-light camera, 1971', rebreather: "Clearance diver's rebreather suit", dv_quietsuit: "Combat swimmer's drysuit", dv_hot: 'North Sea heated suit',
  dv_monster: 'Grand Banks trawl-wing net', st_lander: 'Deep lander optic, 1985', st_bathy: 'Bathythermal prototype suit', dv_hard1: 'Gulf oilfield hardsuit',
  // no two things share a name (owner: change whichever clashes)
  dv_big: 'Steel 130, refilled', dv_side: 'Deep sidemount pair', lightbag: 'Mesh pouch', x_fins_2: "Sealab II diver's fins",
};
for (const [id, nm] of Object.entries(RENAMES)) if (ITEMS[id]) ITEMS[id].name = nm;
export const ITEMS_OF = (kind, shop = null) => Object.values(ITEMS).filter((it) => it.kind === kind && (!shop || it.shop === shop));
export const CHEST_POOL = Object.values(ITEMS).filter((it) => it.chest);

// ---------- skills rolled on a chest item ----------
const ROLL = { common: [0, 1], uncommon: [1, 1], rare: [2, 2], exotic: [2, 3], legendary: [2, 3] }; // [fewest, most] skills
// the chance of each level (I, II, III, IV) by rarity (decided 7 Nov): a Common's one skill (half have one)
// is always I; an Uncommon's 70 % I, 30 % II; a Rare's 30 / 40 / 30 up to III; an Exotic's 10 / 35 / 55;
// a Legendary's 5 / 20 / 40 / 35, the only rarity with level IV
const LEVELS = { common: [1], uncommon: [0.7, 0.3], rare: [0.25, 0.5, 0.25], exotic: [0, 0.15, 0.85], legendary: [0, 0, 0.5, 0.5] }; // (5.14.0) rare about II, exotic about III, legendary III or IV evenly
function rollLevel(rarity, rnd) { const w = LEVELS[rarity]; let r = rnd(); for (let i = 0; i < w.length; i++) { if (r < w[i]) return i + 1; r -= w[i]; } return w.length; }
export function rollSkills(def, rnd = Math.random) {
  if (def.kind === 'ability') return [];
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
  // (5.9.0) every diver starts with a Sprint scroll on (once)
  if (!P.abilInit) { P.abilInit = 1; if (!P.kit.on.ability) { const q = mk('ab_sprint_rare'); P.kit.items.push(q); P.kit.on.ability = q.u; } }
  // (5.0) a save from before 5.0: slurp guns and tag guns (and tag darts) are bought back at what they cost
  if (!P.retired5) {
    P.retired5 = 1;
    let back = 0;
    P.kit.items = P.kit.items.filter((q) => { if (ITEMS[q.id]) return true; back += RETIRED[q.id] || 0; return false; });
    for (const k of ['slurp', 'tag']) delete P.kit.on[k];
    if (P.items) { back += (P.items.tag || 0) * 5 + (P.items.tagAdv || 0) * 200; delete P.items.tag; delete P.items.tagAdv; }
    if (back > 0) { P.cash = Math.round(((P.cash || 0) + back) * 100) / 100; P.refund5 = back; }
  }
  return P.kit;
}
function mk(id, rnd) { const def = ITEMS[id]; return { u: newUid(), id, sk: rollSkills(def, rnd), ...(def.legend ? { leg: def.legend } : {}) }; }
export const rollSkillsFor = (def, rnd) => rollSkills(def, rnd); // (3.0.0) the old one's wares are rolled when laid out
export function giveRolled(P, q) { if (lockerFree(P) <= 0) return null; const n = { u: newUid(), id: q.id, sk: q.sk || [], isNew: true, ...(q.leg ? { leg: q.leg } : {}) }; kitOf(P).items.push(n); P.bagGot = (P.bagGot || 0) + 1; /* (5.9.6) for the bag's "!" */ bump(P); return n; }
export const lockerCount = (P) => { const K = kitOf(P), on = new Set(Object.values(K.on)); return K.items.filter((q) => !on.has(q.u)).length; }; // (3.0.31) only what he hasn't on
// (6.1.0) gold coins lie in the locker in stacks of up to 10, each stack a space
export const coinStacks = (P) => Math.ceil(((P && P.gold) || 0) / 10);
export const lockerFree = (P) => LOCKER - lockerCount(P) - coinStacks(P);
export const instOf = (P, u) => kitOf(P).items.find((q) => q.u === u) || null;
export const wornInst = (P, kind) => { const u = kitOf(P).on[kind]; return u ? instOf(P, u) : null; };
export const worn = (P, kind) => { const q = wornInst(P, kind); return q ? ITEMS[q.id] : null; };
export const ownsItem = (P, id) => kitOf(P).items.some((q) => q.id === id);
export const isOn = (P, q) => kitOf(P).on[ITEMS[q.id].kind] === q.u;
const bump = (P) => { kitOf(P).rev = (kitOf(P).rev || 0) + 1; };
// a new thing into the locker (null if it is full)
export function giveItem(P, id, rnd) { if (!ITEMS[id] || lockerFree(P) <= 0) return null; const q = mk(id, rnd); q.isNew = true; kitOf(P).items.push(q); P.bagGot = (P.bagGot || 0) + 1; /* (5.9.6) */ bump(P); return q; }
export function putOn(P, u) { const q = instOf(P, u); if (!q) return false; kitOf(P).on[ITEMS[q.id].kind] = u; bump(P); return true; }
// take a thing off, back into the locker. Net, fins, tank, bag and suit always have one on: taking one off puts his
// starter one back on (3.0.31). Not when the locker has no room for it; not the starter itself.
export function takeOff(P, kind) {
  const K = kitOf(P), cur = K.on[kind] && instOf(P, K.on[kind]);
  if (!cur) return false;
  if (lockerFree(P) <= 0) return 'full';
  if (FREE[kind] && kind !== 'net') { // (6.9.1) a net unequipped is gone from his hands: no hand net put back on
    if (cur.id === FREE[kind]) return false;
    let base = K.items.find((q) => q.id === FREE[kind]);
    if (!base) { base = mk(FREE[kind]); K.items.push(base); }
    K.on[kind] = base.u;
  } else K.on[kind] = null;
  bump(P); return true;
}
// out of the locker (sold): never the thing he has on
export function removeItem(P, u) { const K = kitOf(P), i = K.items.findIndex((q) => q.u === u); if (i < 0 || isOn(P, K.items[i])) return false; K.items.splice(i, 1); bump(P); return true; }
// (6.4.0) every enchantment level adds to the worth: a legendary with its enchantments all at IV comes to about twice
export function valueOf(q) { const def = ITEMS[q.id]; return Math.round(def.price * (1 + 0.075 * (q.sk || []).reduce((a, [, l]) => a + l, 0)) * (q.leg ? 1.1 : 1)); }
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

// (3.0.12) rescaled once the list is built, generated items included: a suit's pressure limit is a third of
// what it was (the wetsuit: 100 m, the toughest about 290 m). (3.0.13) Only the beginner bags are smaller:
// Commons hold two animals fewer (the starting bag: 3), Uncommons one fewer, Rare and up as they were (the
// best still 11). The numbers in each item's words are rewritten to match.
const PRESS_K = 1 / 3, BAG_LESS_OF = { common: 2, uncommon: 1 };
const reword = (it, f) => { for (const k of ['line', 'good', 'bad', 'tag', 'desc']) if (typeof it[k] === 'string') it[k] = f(it[k]); };
for (const it of Object.values(ITEMS)) {
  if (typeof it.press === 'number') {
    const was = it.press; it.press = Math.max(100, Math.round(was * PRESS_K / 10) * 10);
    reword(it, (t) => t.replace(/(\d[\d,]*) m\b/g, (m0, n) => { const v = +n.replace(/,/g, ''); return v >= 200 && v <= 1000 ? `${Math.max(100, Math.round(v * PRESS_K / 10) * 10)} m` : m0; }));
  }
  if (it.kind === 'bag' && typeof it.slots === 'number') {
    const was = it.slots; it.slots = Math.max(3, was - (BAG_LESS_OF[it.rarity || 'common'] || 0));
    reword(it, (t) => t.replace(new RegExp(`\\b${was} animals`, 'g'), `${it.slots} animals`));
  }
}
// (4.3.6) the starting mesh bag holds two: the first bag bought (three) is a step up
if (ITEMS.mesh && ITEMS.mesh.slots === 3) { ITEMS.mesh.slots = 2; reword(ITEMS.mesh, (t) => t.replace(/\b3 animals/g, '2 animals')); }
// (4.12.1) air and bag room by rarity: each rarity has its own span, and within it the items keep their order
// (common tanks 20-30 s, uncommon 30-50, rare 50-80, exotic 80-110, legendary 150-180; bags: the starting mesh 2,
// commons 3, uncommon 4-5, rare 5-7, exotic 7-10, legendary 11-12). The numbers in each item's words follow.
{
  const SPAN = { tank: { common: [20, 30], uncommon: [30, 50], rare: [50, 80], exotic: [80, 110], legendary: [150, 180] },
    bag: { common: [3, 3], uncommon: [4, 5], rare: [5, 7], exotic: [7, 10], legendary: [11, 12] } };
  for (const [kind, key, unit] of [['tank', 'air', ' s'], ['bag', 'slots', ' animals']]) {
    for (const [rar, [lo, hi]] of Object.entries(SPAN[kind])) {
      const list = Object.values(ITEMS).filter((it) => it.kind === kind && (it.rarity || 'common') === rar && typeof it[key] === 'number' && it.id !== 'mesh')
        .sort((a, b) => a[key] - b[key] || String(a.id).localeCompare(String(b.id)));
      list.forEach((it, i) => {
        const was = it[key], now = Math.round(list.length < 2 ? (lo + hi) / 2 : lo + (hi - lo) * i / (list.length - 1));
        if (it.id === 'al80') { it[key] = 20; return; } // the tank he starts with
        it[key] = now;
        if (was !== now) reword(it, (t) => t.replace(new RegExp(`\\b${was}${unit}`, 'g'), `${now}${unit}`));
      });
    }
  }
}
// (5.12.0) the suit and fin ladders (owner-agreed). A suit is about depth: the pressure starts at real metres that grow
// with its rarity (the wetsuit 20 m, a legendary past 1,000 m), and from Rare up it also saves air (down to x0.5 at the
// top); suits no longer change his speed. Speed is the fins' alone, shown at half the in-game figure, so the rubber fins
// read 0.5 and a legendary pair about 1.5. Within a rarity each kind keeps a role: a skin is the lightest and cheapest,
// weakest against pressure; chain mail turns bites; a rebreather is silent and the easiest on air; a drysuit goes deeper
// and keeps out the cold; a hardsuit goes deepest but is the hungriest for air. Items keep their order within a rarity.
{
  const PB = { common: [20, 40], uncommon: [60, 120], rare: [150, 300], exotic: [400, 800], legendary: [1000, 1300] };
  const AB = { rare: [0.9, 0.8], exotic: [0.75, 0.6], legendary: [0.55, 0.5] };
  const DEEP = { skin: 0, wet: 0.25, chain: 0.4, rebreather: 0.55, dry: 0.75, hard: 1 }, EASY = { rebreather: 1, skin: 0.75, wet: 0.5, chain: 0.4, dry: 0.3, hard: 0 };
  const jit = (id, amp) => { let h = 2166136261; for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * amp; };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  for (const it of Object.values(ITEMS)) {
    if (it.kind !== 'suit') continue;
    const r = it.rarity || 'common', [lo, hi] = PB[r] || PB.common, was = it.press;
    it.press = it.id === 'wet' ? 15 : Math.round((lo + (hi - lo) * clamp01((DEEP[it.arch] ?? 0.4) + jit(it.id, 0.1))) / 10) * 10 || lo;
    // (6.5.8) the wetsuit he starts in is the one suit worse than any bought: pressure from 15 m and a little hungrier for
    // air. Every common suit for sale starts at 30 m or deeper (the cheap skin was the wetsuit's exact equal)
    if (r === 'common') it.press = Math.max(30, Math.round((lo + 10 + (hi - lo) * clamp01((DEEP[it.arch] ?? 0.4) + jit(it.id, 0.1))) / 5) * 5); if (it.id === 'wet') it.press = 15;
    const A = AB[r]; it.air = A ? +(A[0] - (A[0] - A[1]) * clamp01((EASY[it.arch] ?? 0.4) + jit(it.id + 'a', 0.1))).toFixed(2) : it.id === 'wet' ? 1.05 : 1;
    it.speed = 1;
    if (was !== it.press) reword(it, (t) => t.replace(new RegExp(`\\b${was} m\\b`, 'g'), `${it.press} m`));
    // its words no longer promise speed (suits do not give it), and a hardsuit is no longer slow
    if (/speed|faster|quick/i.test(it.good || '')) it.good = it.arch === 'skin' ? 'Light, and cheap' : goodOf('suit', it);
    if (it.chest) it.good = goodOf('suit', it); // a chest suit's line is worked out from its numbers: say the new ones
    if (it.air >= 1 && /air/i.test(it.bad || '')) it.bad = it.arch === 'skin' ? 'Pressure bites early' : ''; // no air cost any more below Rare
    if (/slow|heavy/i.test(it.bad || '')) it.bad = it.bad.replace(/slow,? and /i, '').replace(/^(slow|heavy)$/i, '').replace(/^\w/, (c) => c.toUpperCase());
  }
  const SB = { common: [0.5, 0.6], uncommon: [0.65, 0.75], rare: [0.8, 0.95], exotic: [1.0, 1.2], legendary: [1.3, 1.5] }; // shown (half the in-game figure)
  for (const r of Object.keys(SB)) {
    const list = Object.values(ITEMS).filter((it) => it.kind === 'fins' && (it.rarity || 'common') === r).sort((a, b) => a.swim - b.swim || String(a.id).localeCompare(String(b.id)));
    list.forEach((it, i) => {
      const [lo, hi] = SB[r], shown = it.id === 'rubber' ? 0.5 : lo + (hi - lo) * (list.length < 2 ? 0.5 : i / (list.length - 1)), ratio = it.sprint / it.swim;
      it.swim = +(shown * 2).toFixed(2); it.sprint = +(it.swim * ratio).toFixed(2);
      it.good = it.chest || /cruis|sprint|speed|×/i.test(it.good || '') || !it.good ? goodOf('fins', it) : it.good;
    });
  }
}
// (5.12.5) tanks, bags, nets and cameras by rarity (owner-agreed): even steps from Common to Exotic, then a large jump to
// Legendary so the best is obviously the best. Items keep their order within a rarity; their words follow the numbers.
{
  const order = (kind, r, key) => Object.values(ITEMS).filter((it) => it.kind === kind && (it.rarity || 'common') === r && typeof it[key] === 'number').sort((a, b) => a[key] - b[key] || String(a.id).localeCompare(String(b.id)));
  const spread = (list, lo, hi, round) => list.forEach((it, i) => round(it, list.length < 2 ? (lo + hi) / 2 : lo + (hi - lo) * i / (list.length - 1)));
  const TANK = { common: [20, 30], uncommon: [45, 65], rare: [75, 105], exotic: [120, 155], legendary: [190, 200] };
  for (const [r, [lo, hi]] of Object.entries(TANK)) spread(order('tank', r, 'air'), lo, hi, (it, v) => { const was = it.air, now = it.id === 'al80' ? 20 : Math.round(v); it.air = now; if (was !== now) reword(it, (t) => t.replace(new RegExp(`\\b${was} s\\b`, 'g'), `${now} s`)); });
  const BAG = { common: [5, 7], uncommon: [9, 12], rare: [14, 18], exotic: [20, 26], legendary: [40, 50] }; // (5.14.0) spaces (an animal takes 1 to 16 by its length)
  for (const [r, [lo, hi]] of Object.entries(BAG)) spread(order('bag', r, 'slots'), lo, hi, (it, v) => { const was = it.slots, now = it.id === 'mesh' ? 5 : it.id === 'eelpurse' ? 45 : Math.round(v); /* (6.1.0) the eel-skin purse holds 45 */ it.slots = now; if (was !== now) reword(it, (t) => t.replace(new RegExp(`\\b${was} animals`, 'g'), `${now} animals`)); });
  const CAM = { common: [9, 11.5], uncommon: [14, 17], rare: [20, 23], exotic: [26, 29], legendary: [40, 45] };
  for (const [r, [lo, hi]] of Object.entries(CAM)) spread(order('cam', r, 'idx'), lo, hi, (it, v) => { it.idx = +v.toFixed(2); if (it.chest || /Quality/.test(it.good || '')) it.good = goodOf('cam', it); });
  // nets: each kind keeps what it is for (its own size, reach and swing); rarity multiplies them, with the jump at the top
  const NM = { common: 1, uncommon: 1.15, rare: 1.3, exotic: 1.45, legendary: 1.9 };
  for (const it of Object.values(ITEMS)) {
    if (it.id === 'hand') it.time = 1.17; // (7.4.0, owner) the hand net: 0.7 s before a fish is in it (the catch lands 60 % through), noticeably slow
    if (it.kind !== 'net' || it.id === 'hand' || !ARCH.net[it.arch]) continue;
    const b = ARCH.net[it.arch], m = NM[it.rarity || 'common'] || 1, cm = (v) => Math.round(v * 100);
    const was = it.maxLen;
    it.maxLen = +(b.maxLen * m).toFixed(2); it.range = +(b.range * Math.pow(m, 0.8)).toFixed(2); it.time = +Math.max(0.3, ({ common: 1.0, uncommon: 0.85, rare: 0.72, exotic: 0.57, legendary: 0.42 }[it.rarity || 'common'] || 1) * Math.pow(b.time, 0.6)).toFixed(2); /* (6.0.16) the swing by rarity, a clear step each; the kind softened within it */
    it.success = +(1 - (1 - b.success) / Math.pow(m, 1.6)).toFixed(3); it.harm = +(b.harm / Math.pow(m, 1.5)).toFixed(3);
    if (b.minLen) it.minLen = b.minLen;
    if (it.chest || /up to|cm|reach/.test(it.good || '')) it.good = goodOf('net', it);
    if (was !== it.maxLen) reword(it, (t) => t.replace(new RegExp(`\\b${cm(was)} cm\\b`, 'g'), `${cm(it.maxLen)} cm`));
  }
  for (const it of Object.values(ITEMS)) if ((it.kind === 'tank' || it.kind === 'bag') && it.chest) it.good = goodOf(it.kind, it);
}
// (5.12.5) whatever a description says about air or pockets, it says the real number (shop words were written by hand)
{
  
  for (const it of Object.values(ITEMS)) {
    if (it.kind === 'tank') reword(it, (t) => t.replace(/\b\d+ s of air/g, `${it.air} s of air`));
    if (it.kind === 'bag') reword(it, (t) => t.replace(/\b\d+ animals/g, `${it.slots} spaces`).replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) pockets\b/g, 'room inside'));
  }
}
for (const it of Object.values(ITEMS)) if (it.kind === 'fins' && /no faster cruising/i.test(it.bad || '')) it.bad = 'Cruising barely faster than rubber'; // (5.12.5) they are a little faster now
// (5.12.9) prices follow what an item really does now (owner-approved, docs/PROPOSAL_prices.md): inside each rarity the
// weakest of its kind sits at the bottom of the band, the strongest near the top. Legendaries and the chests themselves
// keep their prices
{
  const score = { tank: (i) => i.air * (i.quiet ? 1.1 : 1), fins: (i) => i.swim + 0.5 * i.sprint, bag: (i) => i.slots, net: (i) => (i.maxLen || 0) * (i.range || 1) * (i.success || 0.8), cam: (i) => i.idx || 0,
    suit: (i) => i.press / 100 + (1 - i.air) * 8 + (i.bite ? 0.4 : 0) + (i.warm ? 0.3 : 0) + (i.quiet ? 0.4 : 0) };
  const BANDP = { common: [25, 250], uncommon: [300, 1000], rare: [1000, 2000], exotic: [8000, 30000] }; // (6.4.0) common to rare friendlier; (6.4.1) exotic back to its old band
  const BANDS_SUIT = { common: [25, 250], uncommon: [300, 1000], rare: [1000, 2000], exotic: [8000, 30000] }; // (6.4.1) common to rare as 6.4.0, exotic back to its old band
  const nice = (p) => (p < 300 ? Math.round(p / 5) * 5 : p < 2000 ? Math.round(p / 50) * 50 : p < 10000 ? Math.round(p / 100) * 100 : Math.round(p / 500) * 500);
  for (const kind of Object.keys(score)) for (const [r, [a, b]] of Object.entries(kind === 'suit' ? BANDS_SUIT : BANDP)) {
    const xs = Object.values(ITEMS).filter((it) => it.kind === kind && it.rarity === r && it.price > 0); if (!xs.length) continue;
    const sc = xs.map(score[kind]), lo = Math.min(...sc), hi = Math.max(...sc);
    xs.forEach((it, j) => { const pos = hi > lo ? (sc[j] - lo) / (hi - lo) : 0.5; it.price = nice(a + (b - a) * Math.pow(pos, 1.3)); });
  }
}
// (5.14.0) Deep Pockets: spaces by its level, on a bag or a suit (both add up): I +2, II +5, III +10, IV +20
export const POCKETS_BY_LV = [0, 2, 5, 10, 20];
export function pocketsBonus(P) { const K = kitOf(P); let n = 0; for (const u of Object.values(K.on)) { const q = u && instOf(P, u); if (!q) continue; for (const [k, l] of q.sk || []) if (k === 'pockets') n += POCKETS_BY_LV[Math.min(4, l)] || 0; } return n; }
// (5.15.3) a suit's line on its card says what it actually does, short and its own (hand-written lines had grown alike:
// "pressure barely matters", "pressure hardly reaches him"): its depth, then what sets it apart
for (const it of Object.values(ITEMS)) {
  if (it.kind !== 'suit') continue;
  const bits = [`Safe to ${it.press} m`];
  if (it.air < 1) bits.push(`air lasts ×${+(1 / it.air).toFixed(2)}`);
  if (it.bite) bits.push('turns a bite'); if (it.warm) bits.push('keeps out the cold'); if (it.quiet) bits.push('no bubbles');
  if (it.arch === 'skin' && bits.length === 1) bits.push('light and cheap');
  it.good = bits.join(', ');
  if (/^(costly|slow|heavy|air)$/i.test(it.bad || '')) it.bad = '';
}
// (5.15.3) the "not for" lines checked against what the gear does now: speed lives only on fins, so a tank or a suit
// is never "slower"; the price is on the card, so "costly" says nothing; a bare word becomes a reason
{ const RE = { 'Range': 'Short reach', 'Small': 'Small fish only', 'Costly, slow': 'Slow to swing', 'Cruising barely faster than rubber': 'Hardly quicker at a cruise', 'Heavy': '' };
  for (const it of Object.values(ITEMS)) {
    if (!it.bad) continue;
    if ((it.kind === 'tank' || it.kind === 'suit') && /slower/i.test(it.bad)) it.bad = '';
    else if (/^costly$/i.test(it.bad)) it.bad = '';
    else if (it.bad in RE) it.bad = RE[it.bad];
  } }

// (7.3.0, owner: the economy remaster) exotic and legendary things priced by the time it takes to earn them at the
// depths where they are wanted (docs/PLAN_7.4.md): exotics about one to two hours of a research submersible's income,
// legendaries five to nine hours of the deepest. Each keeps its place in its rarity (log scale); common to rare stay
// as they were (owner). Scrolls too. Selling pays a third of the new price
// (7.3.0, economy v2: x3 per 1,000 m, income measured per submersible) each rarity priced by the time to earn it where it is
// wanted: common about ten minutes of the first sub's income (unchanged), uncommon fifteen of the refit's, rare half an
// hour of the work subs', exotic one to two hours at research depth, legendary three to five hours of the deepest sub's
// (7.3.8, owner) the same rule on the re-measured income (tools/econ/measure.cjs): rare half an hour of the work subs', exotic
// an hour and a half of the research sub's to two of the deep research sub's, legendary three to five hours of the deepest's
{ const REMAP = { uncommon: [[300, 1000], [400, 1200]], rare: [[1000, 2000], [2100, 4600]], exotic: [[8000, 30000], [24000, 78000]], legendary: [[54000, 90000], [1070000, 1790000]] }; // (7.3.9) on the slower subs' income
  const nice = (p) => (p < 1000 ? Math.round(p / 10) * 10 : p < 10000 ? Math.round(p / 100) * 100 : p < 1e6 ? Math.round(p / 1000) * 1000 : Math.round(p / 50000) * 50000);
  for (const it of Object.values(ITEMS)) { const R = REMAP[it.rarity]; if (!R || !(it.price > 0)) continue;
    const [[a, b], [c, d]] = R, t = Math.min(1, Math.max(0, Math.log(it.price / a) / Math.log(b / a)));
    it.price = nice(c * Math.pow(d / c, t)); } }
// (7.3.0) the words last of all (item_words.js): a hand-written card line in place of figures, and a description. A
// chest item or a set piece takes its design's; a set piece keeps its set's line before it. Figures stay on the item's
// page and in the inventory (catalog.js MEASURES), worked out as before
for (const it of Object.values(ITEMS)) {
  if (it.kind === 'ability') continue;
  const W = WORDS[it.id], A = ARCH_WORDS[it.kind] && ARCH_WORDS[it.kind][it.arch];
  if (W) { if (W[0]) it.good = W[0]; if (W[1]) it.line = W[1]; continue; }
  if (A && (it.chest || it.set)) { it.good = A[0]; it.line = it.set ? `${it.line} ${A[1]}` : A[1]; }
}
// (7.3.0) every net with a lower limit (a big-game net's coarse mesh) says it where the shops say what it is not for
for (const it of Object.values(ITEMS)) if (it.kind === 'net' && it.minLen) { it.bad = `Fish under ${Math.round(it.minLen * 100)} cm slip through`; if (!/slip|pass/i.test(it.line || '')) it.line = `${it.line} Fish under ${Math.round(it.minLen * 100)} cm slip through the mesh.`; } // (owner) said in its words, the floor kept in its figures
