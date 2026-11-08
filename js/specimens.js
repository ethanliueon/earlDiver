// What animals are worth, and what can be done with them.
//
// Live: small enough for a net or slurp gun, sold to the aquarium buyer. Tag: too big to bring
// up (and swimming), tagged for the research program (built later). Neither: plants, corals,
// anything rooted, anything too big to carry off the bottom.
import { SPECIES_BY_ID } from './species.js';
import { MORE_SPECIES } from '../data/species_more.js';

// What one healthy adult of normal size sells for, in dollars: roughly what it would fetch in the
// real world (a sardine is pocket change, a salmon a good day, a coelacanth a lifetime). Set by hand
// for nearly everything; the rest come from the formula in priceOfSpecies. The rarity tier follows from
// the price (see RARITY), and rarity also decides how often the animal is met (fauna.js).
const PRICE = {
  // reef
  1: 12, 2: 25, 3: 20, 4: 18, 5: 120, 6: 150, 7: 28, 8: 12, 9: 35, 10: 22, 11: 45, 12: 60, 13: 15, 14: 90, 15: 400,
  16: 4, 17: 9, 18: 20, 19: 15, 20: 25, 21: 28, 22: 80, 23: 40, 24: 70, 25: 45, 26: 8, 27: 1, 28: 0.8, 29: 1.2,
  30: 35, 31: 60, 32: 180, 33: 190, 34: 70, 35: 20, 36: 45, 37: 18, 38: 60,
  // open ocean
  39: 2500, 40: 180, 41: 12, 42: 300, 43: 250, 44: 600, 45: 70, 46: 350, 47: 1, 48: 0.5, 49: 0.4, 50: 0.3, 51: 3,
  52: 80, 53: 150, 54: 8000, 55: 50, 56: 60, 57: 35, 58: 25, 59: 20,
  // cold water
  60: 15, 61: 8, 62: 4, 63: 150, 64: 120, 65: 4, 66: 25, 67: 30, 68: 18, 69: 20, 70: 45, 71: 15, 72: 18, 73: 30, 74: 60, 75: 180,
  // sharks and rays
  76: 4000, 77: 12000, 78: 900, 79: 700, 80: 120, 81: 150, 82: 800, 83: 300, 84: 3000, 85: 4500, 86: 8000, 87: 6000,
  88: 15000, 89: 1500, 90: 250, 91: 1500, 92: 180, 93: 45, 94: 60, 95: 50, 96: 2500, 97: 90,
  // the deep
  98: 35, 99: 40, 100: 25000, 101: 9000, 102: 1200, 103: 6000, 104: 18000, 105: 15000, 106: 2500, 107: 7000, 108: 40000,
  109: 250, 110: 1800, 111: 12,
  // seahorses and relatives
  112: 25, 113: 35, 114: 150, 115: 800, 116: 450, 117: 12,
  // shellfish, octopus and squid, crabs
  134: 120, 135: 0.25, 136: 1, 137: 2, 138: 8, 139: 40, 140: 30, 141: 900,
  142: 40, 143: 900, 144: 120, 145: 180, 146: 20000, 147: 30, 148: 120, 149: 50000, 150: 15000, 151: 30,
  152: 30, 153: 25, 154: 8, 155: 60, 156: 6, 157: 300, 158: 3, 159: 50, 160: 6, 161: 0.25, 162: 900, 163: 12000,
  // starfish, jellies, worms, the big tag-only animals
  164: 3, 165: 2, 166: 15, 167: 0.8, 168: 45, 169: 4, 170: 2000,
  171: 5, 172: 30, 173: 10, 174: 8, 175: 60, 176: 600, 177: 4, 178: 400,
  180: 300, 181: 40, 183: 400, 184: 8000, 185: 300, 186: 250, 187: 3000, 188: 45000,
  // (added in 1.30)
  189: 80, 190: 90, 191: 40, 192: 25, 193: 90, 194: 15, 195: 18, 196: 8, 197: 6, 198: 12, 199: 35, 200: 150,
  201: 30, 202: 3, 203: 22, 204: 1, 205: 1.5, 206: 1.2, 207: 10, 208: 9, 209: 14, 210: 15, 211: 6, 212: 1.5,
  213: 12, 214: 30, 215: 15, 216: 40, 217: 35, 218: 18, 219: 25, 220: 18, 221: 30, 222: 25, 223: 35, 224: 6,
  225: 10, 226: 25, 227: 20, 228: 4, 229: 3, 230: 1, 231: 3, 232: 20, 233: 6, 234: 10, 235: 5, 236: 4, 237: 2,
  238: 15, 239: 30, 240: 25, 241: 50, 242: 15, 243: 8, 244: 6, 245: 6, 246: 30, 247: 35,
  248: 150, 249: 180, 250: 180, 251: 190, 252: 120, 253: 80, 254: 220, 255: 300, 256: 400, 257: 1200, 258: 900,
  259: 60, 260: 35, 261: 90, 262: 190, 263: 20, 264: 40, 265: 3, 266: 2, 267: 0.6, 268: 6, 269: 400, 270: 700,
  271: 25, 272: 45, 273: 300, 274: 500, 275: 600, 276: 700, 277: 800, 278: 500, 279: 50,
  280: 250, 281: 350, 282: 500, 283: 450, 284: 1500,
  285: 12, 286: 6, 287: 12, 288: 6, 289: 10, 290: 25, 291: 30, 292: 45, 293: 40, 294: 0.3, 295: 1.5, 296: 20,
  297: 10, 298: 12, 299: 5, 300: 12, 301: 15, 302: 5, 303: 6, 304: 3, 305: 3, 306: 6, 307: 12, 308: 18, 309: 6,
  310: 30, 311: 40, 312: 20, 313: 400, 314: 450, 315: 2500, 316: 600, 317: 90, 318: 45,
  319: 600, 320: 1400, 321: 400, 322: 900, 323: 1500, 324: 2200, 325: 3000, 326: 2000, 327: 30, 328: 1200,
  329: 350, 330: 250, 331: 800, 332: 4500, 333: 120, 334: 200, 335: 90, 336: 900, 337: 150, 338: 220,
  339: 2500, 340: 300, 341: 700, 342: 450, 343: 1500,
  344: 45, 345: 60, 346: 250, 347: 4000, 348: 2500, 349: 4000, 350: 50000, 351: 30000, 352: 600, 353: 50, 354: 12,
  355: 250, 356: 20, 357: 120, 358: 40,
  359: 25, 360: 4, 361: 10, 362: 4, 363: 6, 364: 3, 365: 2, 366: 30, 367: 3, 368: 40, 369: 4, 370: 40, 371: 0.25,
  372: 3, 373: 12, 374: 4, 375: 2, 376: 1, 377: 8, 378: 3, 379: 6, 380: 2, 381: 0.5, 382: 25, 383: 1500, 384: 3,
  385: 60, 386: 8, 387: 4, 388: 25, 389: 40, 390: 20, 391: 1, 392: 1, 393: 35, 394: 6, 395: 8, 396: 25, 397: 10,
  398: 6, 399: 10, 400: 6, 401: 2, 402: 4, 403: 12, 404: 35, 405: 40, 406: 3000, 407: 250, 408: 600, 409: 1,
  410: 8, 411: 1, 412: 30, 413: 0.5, 414: 1,
  434: 2, 437: 8, 438: 200, 440: 800, 441: 30, 442: 30, 443: 28, 444: 45, 445: 10, 446: 12,
};
// anything without a hand price: by kind, size and depth (and nothing from the deep is cheap)
const CAT_BASE = {
  'Reef Fish': 6, 'Cold Water Fish': 4, 'Open Ocean Fish': 3, 'Deep Sea Fish': 300, 'Sharks & Rays': 80,
  'Crabs, Lobsters & Shrimp': 4, 'Octopus & Squid': 30, 'Seahorses & Relatives': 20, 'Jellyfish & Drifters': 6,
  'Starfish & Urchins': 2, 'Shellfish & Snails': 2.5, 'Worms & Others': 3,
};
export const isDeep = (sp) => sp.cat === 'Deep Sea Fish' || sp.dmin >= 200;
function formulaPrice(sp) {
  let p = (CAT_BASE[sp.cat] || 2) * Math.min(6, Math.max(0.4, Math.pow(sp.len / 0.3, 0.7)));
  if (sp.dmin >= 1000) p *= 4; else if (sp.dmin >= 500) p *= 2.5; else if (sp.dmin >= 200) p *= 1.5;
  return p;
}
// Research program: the big swimming animals too big to bring up, which are tagged instead. A tag
// pays a share of what the animal is worth (see tagPrice); 0 means it cannot be tagged at all.
export const TAG = {
  14: 80, 15: 150, 23: 90, 24: 120, 25: 60, 32: 140, 33: 160, 35: 60, 36: 50, 38: 70,
  39: 400, 40: 120, 42: 100, 43: 90, 44: 140, 45: 40, 46: 300, 52: 60, 53: 250, 54: 4000,
  55: 40, 56: 40, 58: 30, 60: 40, 63: 250, 64: 120, 67: 200, 68: 40, 70: 150, 75: 600,
  76: 800, 77: 2500, 78: 600, 79: 450, 80: 120, 81: 150, 82: 500, 83: 150, 84: 1200, 85: 1800,
  86: 3000, 87: 1200, 88: 6000, 89: 900, 91: 700, 92: 200, 93: 100, 95: 150, 96: 1500,
  105: 0, 108: 20000, 109: 400, 143: 900, 148: 150, 149: 25000, 172: 0, 183: 400,
  184: 4000, 185: 300, 186: 250, 187: 1500, 188: 12000, // the abyssal sleeper: tag it if you dare
};

const NEVER = new Set(['Kelp & Plants', 'Corals, Anemones & Sponges', 'Marine Mammals']);
const PROTECTED = new Set([183]); // sea turtles: tag only, never taken
// the species added since: their tag values, and which are protected
// v2: the everyday crowd of each deep zone is the deep's "common": rare at most, never exotic
Object.assign(PRICE, {
  352: 120, 176: 90, 407: 70, 334: 110, 338: 60, 383: 150, 332: 160, 110: 180, 170: 170,
  449: 45, 450: 35, 484: 35, 472: 60, 459: 90, 460: 70, 485: 50, 489: 120, 490: 140, 491: 170, 493: 160,
  469: 650, 483: 40, 494: 60, 495: 45, 478: 120, 479: 50, 480: 45,
});
for (const m of MORE_SPECIES) { if (m.x.tag) TAG[m.id] = m.x.tag; if (m.x.protect) PROTECTED.add(m.id); if (m.x.price) PRICE[m.id] = m.x.price; }

// can a net / slurp gun take it at all (ignoring tool size limits)?
export function canTakeLive(sp) {
  if (NEVER.has(sp.cat) || PROTECTED.has(sp.id)) return false;
  const h = sp.v.hab;
  return h !== 'plant' && h !== 'surface-plant';
}
// swimming animals too big for any net can be tagged instead
export function isTagOnly(sp) { return TAG[sp.id] !== undefined && TAG[sp.id] > 0; }
// what the research program pays for a tag (the swordfish is the benchmark: $100)
// ---------- rarity ----------
// Every species has a rarity, from how scarce and remarkable it is (the reference figures above):
// common, uncommon, rare, exotic, legendary. What it pays comes from its rarity.
// (3.0.41) an animal's rarity on its card: its name in the rarity's colour, and gold stars in the top-right
// corner, one for Rare, two for Exotic, three for Legendary (a Legendary's stars glint now and then). Nothing for
// the animals whose rarity is never shown.
const STARS = { rare: 1, exotic: 2, legendary: 3 };
export function rarityStars(sp) {
  const r = rarityOf(sp); if (!r || r.hidden || !STARS[r.id]) return '';
  return `<i class="r-stars rs-${r.id}" title="${r.name}">${'<b>★</b>'.repeat(STARS[r.id])}</i>`;
}
export const rarityCls = (sp) => { const r = rarityOf(sp); return !r || r.hidden || !STARS[r.id] ? '' : r.id === 'legendary' ? ' has-stars leg-card' : ' has-stars'; };
export const rarityCol = (sp) => { const r = rarityOf(sp); return !r || r.hidden ? '' : r.col; };
export const RARITY = [
  { id: 'common', name: 'Common', col: '#9aa0a6', upTo: 5, spawn: 1 },
  { id: 'uncommon', name: 'Uncommon', col: '#5fbf6a', upTo: 30, spawn: 0.4 },
  { id: 'rare', name: 'Rare', col: '#4a8ff0', upTo: 200, spawn: 0.14 },
  { id: 'exotic', name: 'Exotic', col: '#a35be0', upTo: 5000, spawn: 0.05 },
  { id: 'legendary', name: 'Legendary', col: '#f0a020', upTo: Infinity, spawn: 0.012 },
];
// Undocumented: the game's own invented animals (no scientific record), valued like exotics, each only
// in its own place. Not on the price ladder: species carry it explicitly (x.undoc in species_more.js).
export const UNDOCUMENTED = { id: 'undocumented', name: 'Undocumented', col: '#bfe8f0', upTo: 5000, spawn: 0.015, i: 3.5 };
// Legendary is not a price but a short list: exactly these species (the owner's choice) and no others.
// humpback anglerfish, common fangtooth, barreleye, pelican gulper eel, blobfish, coelacanth, giant oarfish
export const LEGENDARY = new Set([100, 101, 104, 105, 107, 108, 54, 2102, 2103, 2106, 2150, 2146, 2162, 2110, 2109]); // (3.0.42) and the giant versions of the viperfish, dragonfish, swallower, vampire squid, dumbo, isopod, tripod, grenadier
// a capturable animal that is not legendary stays inside the exotic band, however much it would fetch
const EXOTIC_CAP = 4000; // (3.1.0) an Exotic never fetches more than $4,000
// (3.1.0) what each Legendary pays: $25,000 to $60,000, by how rare and how strange
const LEG_PRICE = { 100: 40000, 101: 30000, 104: 35000, 105: 45000, 107: 25000, 108: 60000, 54: 55000, 2102: 30000, 2103: 35000, 2106: 28000, 2150: 40000, 2146: 38000, 2162: 25000, 2110: 32000, 2109: 50000 };
const PRICE_CACHE = new Map();
// what one of this species pays (before size, condition, rare form, upgrades)
// (4.16.6) what a healthy legend pays: by the depth it usually keeps to, $60,000 for the coelacanth in the shallows
// (about 245 m) up to $150,000 for the tripod fish of the abyss (about 3,350 m), on a log scale
const LEG_VALUE = {"54":96000,"100":135000,"101":134000,"104":97000,"105":136000,"107":108000,"108":60000,"2102":134000,"2103":121000,"2106":134000,"2109":129000,"2110":150000,"2146":147000,"2150":104000,"2162":123000};
// (3.7.0) the list price: it sets the rarity tier (and how often the animal is met) and nothing else now
const BASE_CACHE = new Map();
export function basePrice(sp) {
  let p = BASE_CACHE.get(sp.id);
  if (p !== undefined) return p;
  p = PRICE[sp.id] !== undefined ? PRICE[sp.id] : formulaPrice(sp);
  if (isDeep(sp)) p = Math.max(30, p); // nothing from the deep is common
  if (LEGENDARY.has(sp.id)) p = LEG_PRICE[sp.id] || 30000;
  else if (!isTagOnly(sp)) p = Math.min(EXOTIC_CAP, p);
  BASE_CACHE.set(sp.id, p);
  return p;
}
// (3.7.0) how deep an animal lives, 0 (the sunlit shallows) to 1 (the deep): from the middle of the band it
// usually keeps to, so a viperfish whose recorded range starts at the surface still counts as deep
export function deepness(sp) {
  const core = sp.x && sp.x.core, lo = core ? core[0] : sp.dmin, hi = core ? core[1] : Math.min(sp.dmax, Math.max(sp.dmin * 4, 1500));
  const mid = (lo + hi) / 2;
  return clamp01((mid - 100) / (450 - 100));
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerpN = (a, b, q) => a + (b - a) * q;
// (3.7.0) what one healthy adult of normal size pays: commons and uncommons at their list price ($100 is a good
// day early on); rares $10-80 in the shallows, $150-500 from the deep; exotics $1-2k shallow, $3-5k from
// the mid-depths, $6-8k from the deep; legendaries $60-120k. Within a band, the bigger and the rarer pay more.
export function rarityPrice(sp) {
  let p = PRICE_CACHE.get(sp.id);
  if (p !== undefined) return p;
  const base = basePrice(sp), R = rarityOf(sp);
  const size = clamp01(Math.log(Math.max(0.03, sp.len) / 0.05) / Math.log(2 / 0.05)), d = deepness(sp);
  if (sp.undoc || (isTagOnly(sp) && !LEGENDARY.has(sp.id)) || R.i <= 1) p = base;
  else if (R.id === 'legendary') p = LEG_VALUE[sp.id] || 90000; // (4.16.6) by how deep it lives
  else if (R.id === 'exotic') {
    const lo = d < 0.5 ? lerpN(1000, 3000, d * 2) : lerpN(3000, 6000, (d - 0.5) * 2), hi = d < 0.5 ? lerpN(2000, 5000, d * 2) : lerpN(5000, 8000, (d - 0.5) * 2);
    p = lerpN(lo, hi, 0.65 * size + 0.35 * R.pos);
  } else { // rare
    const lo = lerpN(10, 150, d), hi = lerpN(80, 500, d);
    p = lerpN(lo, hi, lerpN(0.5, 0.3, d) * size + lerpN(0.5, 0.7, d) * R.pos); // (in the deep, a small one is no worse than a big one)
  }
  p = p >= 100 ? Math.round(p / 5) * 5 : Math.round(p * 100) / 100;
  PRICE_CACHE.set(sp.id, p);
  return p;
}
const RAR_CACHE = new Map();
// { tier index, rarity entry, position 0..1 within the tier, hidden }. Animals that can't be captured
// (tag-only, apart from the legendaries) have a tier only for how often they turn up: hidden, never shown.
export function rarityOf(sp) {
  let r = RAR_CACHE.get(sp.id);
  if (r) return r;
  if (sp.undoc) { r = { ...UNDOCUMENTED, pos: 0.5 }; RAR_CACHE.set(sp.id, r); return r; }
  const w = isTagOnly(sp) ? Math.max(basePrice(sp), TAG[sp.id]) : basePrice(sp); // (a giant you can only tag is as rare as its tag is worth)
  let i = RARITY.findIndex((t) => w < t.upTo);
  if (LEGENDARY.has(sp.id)) i = 4; else if (i === 4 && !isTagOnly(sp)) i = 3; // (a hidden tier may stay legendary: it only sets how often it is met)
  const lo = i ? RARITY[i - 1].upTo : 0.2, hi = RARITY[i].upTo === Infinity ? 50000 : RARITY[i].upTo;
  const pos = Math.min(1, Math.max(0, Math.log(w / lo) / Math.log(hi / lo)));
  r = { i, ...RARITY[i], pos, hidden: isTagOnly(sp) && !LEGENDARY.has(sp.id) };
  RAR_CACHE.set(sp.id, r);
  return r;
}
// a tag pays a share of what the animal is worth
export function tagPrice(id) { return TAG[id] ? rarityPrice(SPECIES_BY_ID[id]) * 0.25 : 0; }

// a healthy specimen of normal size; len is this individual's length
// (3.7.1) the price follows the animal's weight: weight goes with the cube of its length, and buyers pay a
// little less than proportionally for the heavy ones (a fish twice as heavy is worth about 1.6 times as much).
// So a small one of its kind (0.6 of the usual length) fetches about 40 %, a big one (1.35) about 175 %.
export const sizeMult = (sp, len = sp.len) => Math.min(1.9, Math.max(0.35, Math.pow(Math.max(0.01, len) / Math.max(0.01, sp.len), 3 * 0.66)));
export function liveValue(sp, len = sp.len) {
  return rarityPrice(sp) * sizeMult(sp, len);
}
// condition: 1 healthy .. 0 dead. Stressed animals sell for less; dead ones for almost nothing.
export function conditionMult(c) {
  if (c <= 0.05) return 0.1;
  return c >= 0.7 ? c : Math.max(0.55, c * 0.8); // (3.7.0) alive, however weak, is worth more than dead (half)
}
export function conditionName(c) {
  return c <= 0.05 ? 'dead' : c >= 0.8 ? 'healthy' : c >= 0.5 ? 'stressed' : 'weak';
}
// a dead animal is worth half the plain market price of its kind: no rare-form or contract
// bonus. One brought slowly up to surface pressure in a chamber (acclimated) is worth a quarter more.
export const isDead = (s) => s.cond <= 0.05;
export function specimenValue(s) {
  const sp = SPECIES_BY_ID[s.id];
  if (isDead(s)) return liveValue(sp, s.len) * 0.5;
  return liveValue(sp, s.len) * conditionMult(s.cond) * (s.mult || 1) * (s.acc ? 1.25 : 1);
}
// fragile animals (jellies, comb jellies) take more harm from a net
export const fragile = (sp) => sp.cat === 'Jellyfish & Drifters';

// ---------------- pressure tolerance ----------------
// Pressure harms an animal mostly through the gas in its body (a swim bladder swells or is crushed),
// so how far it can be moved from the depth it was caught at depends on what it is:
//   x3  jellyfish, comb jellies, siphonophores and other gelatinous drifters (no gas spaces at all)
//   x2  daily migrators (lanternfish, hatchetfish, firefly squid, krill, red shrimp, most squid):
//       they travel hundreds of metres up and down every night
//   x1.5 no swim bladder: sharks and rays, octopus, crabs, lobsters and shrimp, starfish and urchins,
//       sea cucumbers, shellfish
//   x1  fish with a gas swim bladder (reef fish, cod, snapper, salmon: the most fragile)
// and anything caught deep is built for crushing pressure: x1.5 below 1,000 m, x2 below 2,500 m. It
// takes whichever is higher. The comfort zones (capture.js) are 50 / 150 / 250 / 350 m times this.
const DAILY_MIGRATORS = new Set([98, 99, 151, 161, 327, 370, 371, 102, 103, 148, 150, 104, 42]);
export function pressureKind(sp) {
  if (sp.cat === 'Jellyfish & Drifters') return { k: 3, why: 'no gas in its body' };
  if (DAILY_MIGRATORS.has(sp.id) || (sp.cat === 'Octopus & Squid' && /squid/i.test(sp.name))) return { k: 2, why: 'migrates daily' };
  if (/Sharks & Rays|Octopus & Squid|Crabs, Lobsters & Shrimp|Starfish & Urchins|Shellfish & Snails|Worms & Others/.test(sp.cat)) return { k: 1.5, why: 'no swim bladder' };
  return { k: 1, why: 'a swim bladder' };
}
export function pressureTolerance(sp, home = 0) {
  const kind = pressureKind(sp), deep = home >= 2500 ? 2 : home >= 1000 ? 1.5 : 1;
  return deep > kind.k ? { k: deep, why: 'built for the deep' } : kind;
}
