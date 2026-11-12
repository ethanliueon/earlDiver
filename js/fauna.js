// Swimming life: spawns around the camera within each species' real depth range.
//  - ordinary groups: a leader and a few followers (reef fish, sharks, jellies...)
//  - bait schools: 50-180 small fish moving as one body around a moving centre; they part
//    around Earl and pull into a tight ball when a predator comes
//  - predators hunt nearby small fish and eat them
//  - everything flees the entity
import { rollVariant, canBeRare } from './variants.js';
import { SPECIES, SPECIES_BY_ID, isSwimHab } from './species.js';
import { MORE_SPECIES } from '../data/species_more.js';
import { rarityOf, isTagOnly as TAG_ONLY } from './specimens.js';
import { clamp, lerp, fbm1, dist, smoothstep } from './util.js';

const SWIMMERS = SPECIES.filter((s) => isSwimHab(s.v.hab));

// Bait schools by depth. Lanternfish migrate: deep by day, near the surface at night.
const BAIT = [
  { id: 48, min: 2, max: 150, n: [80, 160] },   // Atlantic herring
  { id: 49, min: 2, max: 120, n: [90, 180] },   // Pacific sardine
  { id: 50, min: 2, max: 100, n: [100, 180] },  // Northern anchovy
  { id: 51, min: 2, max: 150, n: [50, 90] },    // Atlantic mackerel
  { id: 62, min: 40, max: 400, n: [50, 90] },   // Alaska pollock
  { id: 161, min: 5, max: 350, n: [30, 50] }, // Antarctic krill (4.12.5: smaller swarms, spread wider)
  { id: 98, min: 250, max: 900, nightMin: 15, nightMax: 250, n: [30, 55] }, // spotted lanternfish
  { id: 99, min: 200, max: 600, n: [20, 40] },  // silver hatchetfish
  // (3.0.21) the twilight is the most crowded water in the sea: more kinds of school; (3.0.22) each a little smaller, for smoothness
  { id: 327, min: 250, max: 1000, n: [30, 55] }, // bristlemouth (the most numerous fish there is)
  { id: 484, min: 300, max: 650, n: [20, 40] },    // lovely hatchetfish
  { id: 450, min: 300, max: 900, nightMin: 20, nightMax: 220, n: [25, 45] }, // glacier lanternfish
];

// (3.0.22) the twilight's everyday animals: most of the lone fish out there are these
const FILLER = new Set([98, 99, 327, 151, 370, 484, 450, 161]);
// (3.7.3) the height of the deep's spawning curve q^1.4 (1-q)^0.55, at its peak (q = 1.4 / 1.95)
const DEEP_PEAK = Math.pow(1.4 / 1.95, 1.4) * Math.pow(0.55 / 1.95, 0.55);
// (3.7.3) where an animal is usually met in this sea, for its card and the journal: not the extremes ever
// recorded but the stretch where most of them are. A deep animal's spawning curve (see depthPref) is skewed
// down its band, so that is roughly from a third of the way down its band to near its foot; a shallow one's is
// its everyday band. Rounded to tidy figures.
export function usualDepth(sp) {
  const kin = sp.legendOf || sp.id, day = CORE[kin] || [sp.dmin, sp.dmax], deepKind = day[0] >= 150 || sp.cat === 'Deep Sea Fish';
  let lo = day[0], hi = day[1];
  if (DEEP_HUNTER(sp)) { lo = Math.max(lo, 500); hi = Math.max(hi, lo + 100, Math.min(sp.dmax, 3000)); }
  if (deepKind) { const R = rarityOf(sp); if (R && R.i >= 2) lo = Math.max(lo, 100); const a = lo + (hi - lo) * 0.33, b = lo + (hi - lo) * 0.95; lo = a; hi = b; }
  else if (!CORE[kin] && hi > lo * 4 + 60) hi = lo + (hi - lo) * 0.6; // a wide recorded range, no everyday band: its upper part
  const nice = (v) => (v < 20 ? Math.round(v) : v < 100 ? Math.round(v / 5) * 5 : v < 300 ? Math.round(v / 10) * 10 : v < 1000 ? Math.round(v / 50) * 50 : Math.round(v / 100) * 100);
  lo = nice(lo); hi = Math.max(lo + 1, nice(hi));
  return [lo, hi];
}
const DEEP_HUNTER = (sp) => sp.cat === 'Deep Sea Fish' && /viper|dragon|angler|seadevil|sea devil|football|fangtooth|sabertooth|daggertooth|snaggletooth|gulper|swallower|loosejaw|barbeled|dreamer|wolftrap|fanfin|whipnose/i.test(sp.name);
// Species that migrate up toward the surface at night and back down by day.
const MIGRATORS = new Set([98, 99, 102, 103, 105, 148, 150, 151, 161, 88, 104, 90, 42]);
// Where an animal actually lives, when the recorded range (the deepest and shallowest it was ever
// found) is far wider than its everyday one. Day ranges; NIGHT is where night migrators rise to.
const CORE = {
  188: [3000, 5100], // abyssal sleeper shark (3.0.37): everywhere below 3,000 m, never above it
  319: [500, 1500],  // Pacific viperfish (3.0.21)
  487: [500, 1500],  // highfin dragonfish (3.0.21)
  67: [30, 200],     // monkfish: a shelf fish on the bottom, not one of the deep anglers (3.0.21)
  99: [200, 600],     // silver hatchetfish (by day)
  98: [300, 1000], 162: [400, 2140], 110: [1000, 4720], 107: [600, 1200],
  100: [600, 2500],  // humpback anglerfish: adults mostly 1,000-2,000 m, rarely above 500
  101: [500, 2000],  // fangtooth
  102: [500, 1500],  // Sloane's viperfish (by day)
  103: [500, 1500],  // black dragonfish (by day)
  90: [600, 1200],   // cookiecutter shark (by day)
  86: [270, 1300],   // goblin shark
  87: [500, 1000],   // frilled shark
  89: [180, 1100],   // bluntnose sixgill
  75: [300, 2500],   // Patagonian toothfish
  54: [200, 1000],   // giant oarfish
  // the rest of the deep: where each is usually met, not the extremes ever recorded
  104: [600, 800], 105: [700, 2000], 106: [900, 2500], 108: [150, 300], 109: [500, 2500], 111: [100, 900],
  73: [300, 1500], 74: [500, 1500], 85: [200, 1500], 88: [100, 500], 97: [50, 500], 141: [200, 700],
  146: [1500, 4000], 149: [400, 1000], 150: [600, 1000], 151: [200, 400], 148: [200, 700], 176: [500, 1500], 178: [300, 1000],
  // open-ocean giants: they can dive deep, but they are mostly met near the top
  39: [0, 500], 40: [0, 150], 41: [0, 200], 42: [300, 600], 43: [0, 100], 44: [0, 200], 46: [0, 400], 53: [50, 400],
  76: [0, 250], 77: [0, 300], 78: [0, 150], 79: [0, 300], 82: [0, 500], 83: [0, 350], 84: [0, 200], 91: [0, 120],
  // cold-water bottom fish
  60: [20, 300], 61: [40, 300], 62: [30, 300], 68: [10, 300], 69: [50, 400], 70: [20, 500], 59: [20, 200],
  // reef fish recorded deep but at home in the shallows
  4: [3, 60], 10: [1, 50], 30: [20, 120], 15: [1, 60],
};
// night migrators: where they rise to after dark
const NIGHT = { 99: [80, 400], 102: [350, 900], 103: [350, 800], 90: [150, 600], 42: [0, 100], 148: [0, 200], 151: [100, 400], 88: [10, 60], 105: [500, 1500] };
// How likely an animal is to be met at depth y: best through the middle of its everyday range,
// a little less at its edges, and outside it rare (rarer the further out) - but never impossible
// within the depths it has really been recorded at.
// Never flee from Earl: drifters, slow or curious animals, and the things that might attack him.
const NO_FLEE = new Set([46, 77, 84, 88, 31, 32, 33, 183, 107, 100, 67, 12, 11, 141, 184, 185, 186, 187, 76, 78, 82, 83, 80, 42, 43, 44, 148, 89, 85, 188]);
const DIVE_SPEED = 1.68; // Earl's speed: fish escape at 0.55-1.5x it
// genuinely fast swimmers: may burst to 1.5x Earl's speed (swordfish, sailfish, marlin, tunas,
// mako, wahoo, mahi-mahi, dolphins, orca). Everything else is slower than a diver can sprint.
const FAST = new Set([42, 43, 44, 39, 40, 41, 82, 52, 45, 185, 186, 187]);

// Predators that hunt small fish (ids from the species list).
const PREDATORS = new Set([35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 52, 53, 76, 78, 79, 82, 83, 148, 30, 31, 32, 34, 68, 102]);

// ---- Where each animal lives ----
// k: the kinds of place it can call home (see buildHabitats in world.js); r: how far it strays from
// home (metres); hide: (v2.0.14: no longer used: nothing tucks itself away out of reach; a frightened
// reef fish darts off like any other);
// act: 'day' animals rest in their home at night, 'night' animals by day; ('any' never rests).
const HOME = {
  1: { k: ['anemone'], r: 1.2, hide: 1, act: 'day' },               // clownfish: never far from its anemone
  2: { k: ['coral'], r: 14, hide: 1, act: 'day' }, 3: { k: ['coral'], r: 12, hide: 1, act: 'day' }, // tangs graze the reef
  4: { k: ['coral'], r: 10, hide: 1, act: 'day' },                  // moorish idol
  5: { k: ['coral', 'sponge'], r: 10, hide: 1, act: 'day' }, 6: { k: ['coral', 'sponge'], r: 10, hide: 1, act: 'day' }, // angelfish
  7: { k: ['coral'], r: 7, hide: 1, act: 'day' }, 8: { k: ['coral'], r: 8, hide: 1, act: 'day' },  // butterflyfish
  9: { k: ['coral'], r: 1.5, hide: 1, act: 'night' },               // mandarinfish: out at dusk, in the rubble
  10: { k: ['ledge', 'crevice', 'coral', 'wreck'], r: 5, hide: 0, act: 'night' }, // lionfish hunt at night, hang under ledges by day
  13: { k: ['coral'], r: 18, hide: 1, act: 'day' }, 14: { k: ['coral'], r: 30, hide: 1, act: 'day' }, // parrotfish (sleep in crevices)
  15: { k: ['coral'], r: 30, hide: 0, act: 'day' },                 // humphead wrasse
  16: { k: ['coral'], r: 2.5, hide: 1, act: 'day' },                // cleaner wrasse at its cleaning station
  17: { k: ['ledge', 'crevice', 'coral'], r: 1.5, hide: 1, act: 'any' }, // royal gramma, under its overhang
  18: { k: ['coral'], r: 6, hide: 1, act: 'day' }, 19: { k: ['crevice', 'ledge', 'coral'], r: 8, hide: 1, act: 'night' },
  20: { k: ['seagrass', 'coral', 'sand'], r: 8, hide: 1, act: 'day' }, 21: { k: ['coral', 'sand'], r: 14, hide: 0, act: 'day' },
  22: { k: ['coral'], r: 10, hide: 1, act: 'day' },
  23: { k: ['crevice', 'ledge', 'coral'], r: 1.2, hide: 1, act: 'night', night: 8 }, // morays: head out of a hole by day, hunt at night
  24: { k: ['crevice', 'ledge', 'coral'], r: 1.4, hide: 1, act: 'night', night: 10 },
  25: { k: ['crevice', 'sand'], r: 0.8, hide: 1, act: 'any' },      // ribbon eel in its burrow
  27: { k: ['coral', 'wreck'], r: 6, hide: 1, act: 'day' }, 28: { k: ['coral'], r: 3.5, hide: 1, act: 'day' }, // chromis hover over one coral head
  29: { k: ['ledge', 'coral', 'wreck'], r: 6, hide: 0, act: 'night', night: 20 }, // grunts school under ledges by day, forage at night
  30: { k: ['wreck', 'ledge', 'crevice'], r: 25, hide: 0, act: 'any' },
  31: { k: ['crevice', 'ledge', 'coral', 'wreck'], r: 7, hide: 1, act: 'any' }, 32: { k: ['wreck', 'ledge', 'crevice'], r: 10, hide: 1, act: 'any' },
  33: { k: ['wreck', 'ledge'], r: 10, hide: 1, act: 'any' }, 34: { k: ['coral', 'crevice'], r: 9, hide: 1, act: 'day' },
  35: { k: ['coral', 'wreck'], r: 45, hide: 0, act: 'any' },        // barracuda patrol the reef edge
  36: { k: ['coral', 'wreck', 'ledge'], r: 70, hide: 0, act: 'any' }, 37: { k: ['coral', 'wreck'], r: 60, hide: 0, act: 'any' },
  38: { k: ['wreck', 'seagrass', 'coral'], r: 40, hide: 0, act: 'any' },
  58: { k: ['kelp', 'crevice'], r: 30, hide: 0, act: 'any' }, 59: { k: ['sand', 'wreck', 'kelp'], r: 20, hide: 0, act: 'any' },
  60: { k: ['sand', 'crevice', 'wreck'], r: 35, hide: 0, act: 'any' }, 61: { k: ['sand'], r: 35, hide: 0, act: 'any' },
  68: { k: ['crevice', 'ledge', 'kelp'], r: 8, hide: 1, act: 'any' }, 69: { k: ['crevice', 'ledge'], r: 5, hide: 1, act: 'any' },
  70: { k: ['crevice', 'ledge'], r: 3, hide: 1, act: 'any' },       // wolffish in its den
  71: { k: ['kelp', 'crevice'], r: 20, hide: 1, act: 'day' }, 72: { k: ['kelp', 'crevice'], r: 3, hide: 1, act: 'day' }, // garibaldi guard a patch
  74: { k: ['seamount', 'deepcoral'], r: 60, hide: 0, act: 'any' }, // orange roughy gather over seamounts
  80: { k: ['coral', 'seagrass'], r: 60, hide: 0, act: 'any' },    // blacktip reef shark
  81: { k: ['ledge', 'crevice', 'wreck'], r: 8, hide: 0, act: 'night', night: 40 }, // nurse sharks rest under ledges by day
  92: { k: ['sand', 'seagrass', 'coral'], r: 40, hide: 0, act: 'any' }, 93: { k: ['sand'], r: 15, hide: 0, act: 'any' },
  94: { k: ['coral', 'sand'], r: 4, hide: 1, act: 'any' }, 95: { k: ['sand'], r: 6, hide: 0, act: 'night' }, 96: { k: ['sand', 'seagrass'], r: 30, hide: 0, act: 'any' },
  108: { k: ['ledge', 'crevice'], r: 6, hide: 1, act: 'night', night: 30 }, // coelacanths: caves on steep walls by day
  111: { k: ['whalefall', 'sand'], r: 15, hide: 0, act: 'any' },  // hagfish at the whale fall
  89: { k: ['whalefall', 'ledge'], r: 60, hide: 0, act: 'night', night: 120 },
  115: { k: ['kelp', 'seagrass'], r: 2, hide: 0, act: 'any' }, 116: { k: ['kelp', 'seagrass'], r: 2, hide: 0, act: 'any' }, // seadragons
  117: { k: ['seagrass', 'coral'], r: 2, hide: 1, act: 'any' }, 140: { k: ['coral'], r: 5, hide: 0, act: 'night' },
  141: { k: ['ledge', 'crevice'], r: 40, hide: 0, act: 'any' },     // nautilus on the steep wall
  147: { k: ['seagrass', 'sand', 'coral'], r: 8, hide: 1, act: 'any' },
  183: { k: ['seagrass', 'coral'], r: 45, hide: 0, act: 'any' },   // green turtles graze seagrass, rest under ledges
};
// Open-ocean animals: they turn up only over deep water, away from the beach and the reef.
const OFFSHORE = new Set([39, 40, 41, 42, 43, 44, 45, 46, 52, 53, 54, 76, 77, 78, 79, 82, 83, 84, 88, 90, 91, 148, 149, 184, 187]);
export const homeOf = (sp) => HOME[sp.id] || null;
// Warm-water reef animals live only on the tropical reefs (the reef by the beach, the wall's cap);
// cold-water animals keep to the kelp, the shelf and the deep, never the coral reef.
const TROPICAL = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 80, 92, 93, 94, 96, 140, 183]);
const COLD = new Set([58, 59, 60, 61, 68, 69, 70, 71, 72, 73, 75, 115, 116]);
const onTropicalReef = (x) => x > 4900 || x < 34;
// warm and cold water for anything else that needs it (traps): crabs and lobsters too
const COLD_BOTTOM = new Set([152, 154, 155, 156]), WARM_BOTTOM = new Set([153, 144, 145, 159, 160]);
// The everyday crowd of each deep zone: met five to ten times as often as the other deep animals, so
// the twilight is lanternfish and hatchetfish, the midnight zone red shrimp, jellies and grenadiers, the
// abyss and the trench grenadiers, cusk-eels, tripod fish and sea pigs, and an exotic stays an event.
const CROWD = {
  98: 14, 99: 10, 327: 16, 151: 10, 370: 12, 352: 4, 484: 10, 450: 12, // twilight: lanternfish, hatchetfish, bristlemouth, firefly squid, red shrimp, strawberry squid, lovely hatchetfish, glacier lanternfish (3.0.21: twice as common, to fill the water)
  176: 4, 407: 5, 109: 4, 333: 5, 334: 5, 338: 4, 383: 3, // midnight: Atolla and helmet jellies, grenadiers, slickhead, swimming sea cucumber
  332: 5, 110: 5, 170: 4,                                  // abyss and trench: cusk-eel, tripod fish, sea pig
};
// the species added since (data/species_more.js) say for themselves where and how they live
for (const m of MORE_SPECIES) {
  const x = m.x;
  if (x.home) HOME[m.id] = x.home;
  if (x.warm) TROPICAL.add(m.id);
  if (x.cold) COLD.add(m.id);
  if (x.core) CORE[m.id] = x.core;
  if (x.off) OFFSHORE.add(m.id);
  if (x.mig) MIGRATORS.add(m.id);
  if (x.aggro || x.protect) NO_FLEE.add(m.id);
  if (x.crowd) CROWD[m.id] = x.crowd;
}
export const climateOk = (id, x) => !((TROPICAL.has(id) || WARM_BOTTOM.has(id)) && !onTropicalReef(x)) && !((COLD.has(id) || COLD_BOTTOM.has(id)) && onTropicalReef(x));

function habitatOk(sp, x, y, W) {
  const fl = W.floorAt(x);
  const above = fl - y;
  if (above < 0.5) return false;
  if (W.rockAt(x, y, 1)) return false;
  switch (sp.v.hab) {
    case 'reef': return false; // reef animals appear only around a home of their own (see HOME)
    case 'floor-swim': return above < 3;
    case 'demersal': return above < 25;
    case 'drift-low': return above < 4;
    case 'surface': return y < 3;
    default: return true;
  }
}
// how often a species is met: smaller, schooling animals more, and above all the rarer the less
// (common 1, uncommon 0.4, rare 0.14, exotic 0.05, legendary 0.012: see RARITY in specimens.js).
// Big animals and sharks are mostly exotic already, so their own penalty is lighter than it was.
const WEIGHT = new Map();
function weightOf(sp) {
  let w = WEIGHT.get(sp.id);
  if (w !== undefined) return w;
  w = 1 / (0.6 + sp.len * 0.7);
  if (sp.len > 6 && !sp.giant) w *= 0.4; // giants are rare encounters
  else if (sp.len > 2.5 && !sp.giant) w *= 0.7;
  if (sp.v.hab === 'reef') w *= 2.2;
  if (sp.v.sch > 4) w *= 1.6;
  if (/Shark/.test(sp.cat)) w *= 0.6;
  w *= rarityOf(sp).spawn;
  w *= CROWD[sp.id] || 1;
  if (PREDATORS.has(sp.id)) w *= 1.4; // keep some hunters around the bait
  WEIGHT.set(sp.id, w);
  return w;
}

export class Fauna {
  constructor(W, rng) {
    this.W = W; this.rng = rng; this.list = []; this.spawnT = 0; this.baitT = 0; this.groupId = 1;
    this.schools = new Map(); // gid -> school centre state (bait schools only)
    this.puffs = [];          // little clouds of scales where something was eaten
  }
  // target number of ordinary groups near the camera (less life the deeper you go)
  targetCount(depth, dread, openWater) {
    // (2.3.1: the deep a little livelier - every animal there is small and dark, so a few more groups are
    // needed for any to pass through the lights; open water only thins the shallows)
    let base = depth < 60 ? 9 : depth < 200 ? 7 : depth < 600 ? 6 : depth < 1200 ? 5 : depth < 2500 ? 4 : 3;
    if (openWater && depth < 200) base = Math.max(2, base - 1);
    return Math.round(base * (1 - dread * 0.95));
  }
  baitTarget(depth, dread) {
    const base = depth < 150 ? 1 : depth < 1000 ? 1 : 0; // (4.12.5) one school at a time, fewer everywhere // (3.0.26) two schools through the twilight; the rest of its life comes singly
    return Math.round(base * (1 - dread));
  }
  groupCount() {
    const s = new Set();
    for (const c of this.list) if (!this.schools.has(c.gid) && !c.home && !c.glimmer) s.add(c.gid);
    return s.size;
  }

  // Residents: every home near the camera is looked at once. It is taken by a species that lives in
  // that kind of place (or left empty), and keeps the same tenant every time you come back. Homes
  // ahead are filled while they are still out of sight; on arriving somewhere new, what's in view too.
  settle(cam) {
    const W = this.W, rng = this.rng, H = W.habitats;
    if (!H) return;
    const jumped = !this.lastCam || Math.abs(cam.x - this.lastCam.x) > cam.w || Math.abs(cam.y - this.lastCam.y) > cam.h;
    this.lastCam = { x: cam.x, y: cam.y };
    const live = new Set(); let residents = 0;
    for (const c of this.list) { live.add(c.gid); if (c.home) residents++; }
    this.reefy = residents > 40; // a crowded reef: one bait school instead of two
    const FILL = { anemone: 0.9, coral: 0.45, sponge: 0.3, seagrass: 0.3, kelp: 0.1, crevice: 0.15, ledge: 0.3, wreck: 0.8, sand: 0.1, seamount: 0.35, deepcoral: 0.2, whalefall: 0.9, vent: 0 };
    const rx = cam.w * 1.4, ry = cam.h * 1.4;
    for (const kind in H) {
      const p = FILL[kind] || 0;
      if (!p) continue;
      for (const h of W.homesNear(kind, cam.x, cam.y, Math.max(rx, ry))) {
        if (Math.abs(h.x - cam.x) > rx || Math.abs(h.y - cam.y) > ry) continue;
        if (h.occ && live.has(h.occ)) continue;
        const inView = Math.abs(h.x - cam.x) < cam.w / 2 + 2 && Math.abs(h.y - cam.y) < cam.h / 2 + 2;
        if (inView && !jumped) continue;            // never pop into sight
        if (h.res === undefined) {
          h.res = 0;
          if (rng() < p) {
            const cands = SWIMMERS.filter((s) => { const R = HOME[s.id];
              return R && R.k.includes(kind) && h.y >= s.dmin && h.y <= s.dmax && !(TROPICAL.has(s.id) && !onTropicalReef(h.x)) && !(COLD.has(s.id) && onTropicalReef(h.x)); });
            if (cands.length) { const wt = (c) => weightOf(c) * this.depthPref(c, h.x, h.y, this.night); let tot = 0; for (const c of cands) tot += wt(c); let r = rng() * tot; for (const c of cands) { r -= wt(c); if (r <= 0) { h.res = c.id; break; } } if (!h.res) h.res = cands[0].id; }
          }
        }
        if (!h.res || residents > 60) continue;
        this.reefy = true;
        residents += this.house(SPECIES_BY_ID[h.res], h);
      }
    }
  }
  house(sp, home) {
    const rng = this.rng, W = this.W, H = HOME[sp.id];
    const n = Math.max(1, Math.min(12, Math.round((sp.v.sch || 1) * rng.range(0.5, 1.1))));
    const gid = this.groupId++;
    home.occ = gid;
    const spread = Math.min(1, H.r / 6);
    for (let i = 0; i < n; i++) {
      const k = Math.max(1, sp.len * 0.7);
      const ox = rng.range(-1, 1) * Math.min(8, 0.9 + n * 0.18) * k * spread, oy = rng.range(-1, 1) * Math.min(4, 0.6 + n * 0.09) * k * spread; // (4.12.5) spread wider
      const x = home.x + ox;
      // day-active reef fish are met out in the water, 3-15 m above the seabed; the rest at home
      const yHome = sp.v.hab === 'reef' && H.act !== 'night' ? Math.max(1.2, W.floorAt(x) - rng.range(3, 15)) : home.y + oy;
      const f = this.makeFish(sp, x, Math.max(0.5, Math.min(yHome, W.floorAt(x) - 0.4)), rng() < 0.5 ? 1 : -1, gid, i === 0);
      f.home = home; f.homeR = H.r <= 2 ? H.r : H.r * 1.6; f.hide = false; // (roamers range wider than the bare minimum)
      f.act = H.act; f.nightR = H.night || H.r * 1.6; f.tT = rng.range(0, 3);
      this.list.push(f);
    }
    return n;
  }

  pickSpawnPoint(cam) {
    const rng = this.rng;
    const side = rng() < 0.5 ? -1 : 1;
    // (2.3.1) in the deep, where everything is slow and small, groups start nearer the edge of the view and
    // nearer its middle height, so they drift through the lights instead of passing unseen above or below
    const deep = cam.y > 300;
    let x = cam.x + side * (cam.w / 2 + (deep ? rng.range(3, 14) : rng.range(4, 30)));
    let y = cam.y + (deep ? rng.range(-cam.h * 0.5, cam.h * 0.5) : rng.range(-cam.h * 0.9, cam.h * 0.9));
    if (rng() < 0.3) { x = cam.x + rng.range(-cam.w, cam.w); y = cam.y + (rng() < 0.5 ? -1 : 1) * (cam.h / 2 + rng.range(4, 18)); }
    return { x, y, side };
  }

  trySpawn(cam, dread) {
    const rng = this.rng, W = this.W;
    const { x, y, side } = this.pickSpawnPoint(cam);
    if (x < 2 || x > 4985 || y < 0.6) return;
    // which homes are free: one group to a home (an anemone holds one family of clownfish)
    const live = new Set(); for (const c of this.list) live.add(c.gid);
    const homes = new Map();
    const homeFor = (s) => {
      const H = HOME[s.id];
      let best = null, bd = 1e9;
      for (const kind of H.k) for (const h of W.homesNear(kind, x, y, 40)) {
        if (h.y < s.dmin || h.y > s.dmax) continue;
        if (this.depthPref(s, h.x, h.y, this.night) <= 0) continue;
        if (h.occ && live.has(h.occ)) continue;
        if (TROPICAL.has(s.id) && !onTropicalReef(h.x)) continue;
        if (COLD.has(s.id) && onTropicalReef(h.x)) continue;
        // appear out of sight, never in front of the player
        if (Math.abs(h.x - cam.x) < cam.w / 2 + 2 && Math.abs(h.y - cam.y) < cam.h / 2 + 2) continue;
        const d = Math.abs(h.x - x) + Math.abs(h.y - y);
        if (d < bd) { bd = d; best = h; }
      }
      return best;
    };
    const floorHere = W.floorAt(x);
    const cands = SWIMMERS.filter((s) => {
      if (HOME[s.id]) return false; // reef and bottom animals are residents of their homes (see settle)
      if (OFFSHORE.has(s.id) && floorHere < 90) return false;           // open-ocean animals: only over deep water
      return y >= s.dmin && y <= s.dmax && habitatOk(s, x, y, W) && climateOk(s.id, x) && this.depthPref(s, x, y, this.night) > 0; // (and in its own climate) // within what has ever been recorded (how likely: depthPref)
    });
    if (!cands.length) return;
    const wOf = (c) => {
      let w = weightOf(c) * this.depthPref(c, x, y, this.night);
      if (this.bleeding && /Shark/.test(c.cat)) w *= 3;           // blood in the water
      if (this.night && /Shark/.test(c.cat)) w *= 1.6;            // sharks hunt at night
      if (c.id === 185 || c.id === 186) w *= 2.5;                 // dolphin pods are fairly common near the surface
      if (c.id === 187) w *= 4;
      if (c.id === 184) w *= y > 250 ? 14 : 2;                   // sperm whales hunt in the deep
      return w;
    };
    let tot = 0; for (const c of cands) tot += wOf(c);
    let r = rng() * tot, sp = cands[0];
    for (const c of cands) { r -= wOf(c); if (r <= 0) { sp = c; break; } }
    const n = Math.max(1, Math.min(14, Math.round((sp.v.sch || 1) * rng.range(0.35, 0.8)))); // (4.12.5) smaller groups
    const gid = this.groupId++;
    const dir = side < 0 ? 1 : -1;
    const home = homes.get(sp.id) || null, H = HOME[sp.id];
    if (home) home.occ = gid;
    // a homebound group starts around its home, spread no wider than its range
    const cx = home ? home.x : x, cy = home ? home.y : y, spread = home ? Math.min(1, H.r / 6) : 1;
    for (let i = 0; i < n; i++) {
      const k = Math.max(1, sp.len * 0.7); // big animals spawn a body-length or so apart
      const ox = rng.range(-1, 1) * Math.min(6, 0.6 + n * 0.12) * k * spread, oy = rng.range(-1, 1) * Math.min(3, 0.4 + n * 0.06) * k * spread;
      const f = this.makeFish(sp, cx + ox, Math.max(0.5, Math.min(cy + oy, W.floorAt(cx + ox) - 0.4)), dir, gid, i === 0);
      if (home) { f.home = home; f.homeR = H.r; f.hide = false; f.act = H.act; f.nightR = H.night || H.r * 1.6; f.tT = 0; }
      this.list.push(f);
    }
  }

  trySpawnBait(cam, night) {
    const rng = this.rng, W = this.W;
    const { x, y, side } = this.pickSpawnPoint(cam);
    if (x < 5 || x > 4975 || y < 2) return;
    const fl = W.floorAt(x);
    if (fl - y < 8) return;
    const opts = BAIT.filter((b) => {
      const lo = night && b.nightMin !== undefined ? b.nightMin : b.min;
      const hi = night && b.nightMax !== undefined ? b.nightMax : b.max;
      return y >= lo && y <= hi;
    });
    if (!opts.length) return;
    const b = rng.pick(opts);
    const sp = SPECIES_BY_ID[b.id];
    const n = Math.round(rng.int(b.n[0], b.n[1]) * 0.42); // (4.12.5) well under half the table: still a school, far cheaper to draw
    const gid = this.groupId++;
    const dir = side < 0 ? 1 : -1;
    // spacing: about a body length and a half between fish, never tighter than ~15 cm (tiny
    // krill and lanternfish otherwise merge into one solid blob)
    const baseR = Math.sqrt(n) * Math.max(sp.len, 0.16) * 1.15 + 0.8; // (4.12.5) looser: more water between the fish
    this.schools.set(gid, {
      sp, x, y, vx: dir * 0.6, vy: 0, dir, n, r: baseR, baseR, wob: rng() * 100, threat: 0, turnTime: -99, turnT: rng.range(15, 40),
      lo: night && b.nightMin !== undefined ? b.nightMin : b.min, hi: night && b.nightMax !== undefined ? b.nightMax : b.max,
    });
    for (let i = 0; i < n; i++) {
      // denser in the core, thinning toward the edges
      const a = rng() * Math.PI * 2, rr = Math.pow(rng(), 0.75);
      const c = this.makeFish(sp, x + Math.cos(a) * rr * baseR * 1.8, y + Math.sin(a) * rr * baseR, dir, gid, false);
      c.ox = Math.cos(a) * rr; c.oy = Math.sin(a) * rr;
      c.speed = clamp(0.6 + sp.len * 3, 0.6, 1.8);
      c.hvy = 0; c.flash = 0; c.turnedAt = -99;
      this.list.push(c);
    }
  }

  makeFish(sp, x, y, dir, gid, leader) {
    const rng = this.rng;
    const sz = Math.min(rng.range(0.6, 1.15), rng.range(0.6, 1.15)) + (rng.range(0, 1) < 0.08 ? rng.range(0.1, 0.2) : 0); // (3.7.1) sizes from 0.6 to 1.35 of the usual: most a bit under, now and then a big one
    const len = sp.len * sz, hab = sp.v.hab;
    // cruising at roughly one body length a second (bounded), much slower for drifters
    let cruise = clamp(len * 0.8, 0.3, 1.6);
    if (hab === 'drift' || hab === 'drift-low') cruise = 0.12;
    if (sp.id === 185 || sp.id === 186) cruise = 2.4; if (sp.id === 187) cruise = 2.2; if (sp.id === 184) cruise = 1.4;
    // escape speed: 0.7-1.3x Earl's swimming speed, small fish fastest; some never flee
    let flee = 0;
    const noFlee = NO_FLEE.has(sp.id) || hab === 'drift' || hab === 'drift-low' || /seahorse|seadragon|pipefish|jelly|comb|siphon|manowar|nautilus/.test(sp.v.s);
    if (!noFlee) flee = (FAST.has(sp.id) ? rng.range(1.35, 1.5) : len < 0.3 ? rng.range(0.85, 1.05) : len < 1 ? rng.range(0.7, 0.9) : rng.range(0.55, 0.75)) * DIVE_SPEED;
    const c = {
      sp, x, y, vx: dir * 0.4, vy: 0, dir, len,
      phase: rng() * 100, gid, leader, wob: rng() * 1000, noted: false,
      speed: cruise, cruise, flee, fleeT: 0,
      tDepth: y, tDepthT: rng.range(4, 15), turnT: rng.range(25, 70),
      predator: PREDATORS.has(sp.id), prey: null, huntCool: rng.range(2, 10), dead: false,
    };
    // rare variants, once Earl has caught a normal one of this species
    if (this.caught && this.caught.has(sp.id) && canBeRare(sp) && !this.schools.has(gid)) {
      const v = rollVariant(rng, y, this.entityNear, this.rareMult || 1);
      if (v) {
        c.variant = v;
        if (v === 'giant') { const k = rng.range(1.6, 2.0); c.len *= k; c.flee *= 0.75; c.cruise = c.speed = Math.min(c.cruise * 1.2, 2); }
      }
    }
    return c;
  }

  // keep about a dozen lone glowing animals around the view in the deep (fewer just below 220 m)
  spawnGlimmer(cam, night) {
    // (3.0.22) the twilight's loose filler: lone lanternfish, hatchetfish, bristlemouths, firefly squid, krill
    // and shrimp scattered all through the water (not only in schools), so a rare fish is one among many
    const k = smoothstep(150, 500, cam.y) * (cam.y > 1500 ? 0.6 : 1);
    if (k <= 0) return;
    const want = Math.round(60 * k); // (3.0.26: more of them, fewer in schools)
    let have = 0; for (const c of this.list) if (c.glimmer && !c.dead) have++;
    if (have >= want) return;
    // anywhere about the view, but out in the dark, well away from him and his lamps (a deep fish
    // in the dark is only ever its light, so one turning up there is simply one coming into sight)
    const rng = this.rng, side = rng() < 0.5 ? -1 : 1;
    const x = clamp(cam.x + rng.range(-0.75, 0.75) * cam.w, 5, 4995);
    const fl = this.W.floorAt(x);
    const y = clamp(cam.y + rng.range(-0.7, 0.7) * cam.h, 150, fl - 3);
    if (fl - 3 < 150 || dist(x, y, cam.x, cam.y) < 12) return;
    const pool = [];
    // (4.18.0) below the glowing animals' water (the abyss and the trench) the loose life is the abyss's own crowd,
    // lit or not: prawns, amphipods, rattails, snailfish, cusk-eels, and near the bottom the things that walk it
    const abyss = y > 3100, nearFloor = fl - y < 45;
    for (const sp of SPECIES) {
      const filler = FILLER.has(sp.id), hab = sp.v.hab;
      const abyssal = abyss && (hab === 'pelagic' || ((hab === 'demersal' || hab === 'floor-swim') && nearFloor)) && !TAG_ONLY(sp);
      if (((!sp.v.glow || hab !== 'pelagic') && !filler && !abyssal) || sp.len > (abyssal ? 1.3 : 1) || y < sp.dmin || y > sp.dmax) continue;
      const w = this.depthPref(sp, x, y, night);
      if (w >= 0.12) pool.push([sp, w / (0.3 + sp.len) * (filler ? 4 : 1) * rarityOf(sp).spawn / 0.14]); // the small and common first, the filler most of all (4.18.0: and by rarity, as everything else is met: an exotic was as likely as a lanternfish)
    }
    if (!pool.length) return;
    let tot = 0; for (const [, w] of pool) tot += w;
    let r = rng() * tot, pick = pool[0][0];
    for (const [sp, w] of pool) { r -= w; if (r <= 0) { pick = sp; break; } }
    const c = this.makeFish(pick, x, y, -side, this.groupId++, true);
    c.glimmer = true;
    this.list.push(c);
  }

  // how close to the seabed an animal's middle may come: bottom walkers right down on it, swimmers
  // a little clear by their size
  skin(c) {
    const h = c.sp.v.hab;
    if (h === 'floor') return 0.05;
    if (h === 'floor-swim' || h === 'drift-low' || h === 'demersal') return 0.15 + c.len * 0.1;
    return 0.3 + c.len * 0.2;
  }

  depthPref(sp, x, y, night) {
    const [lo, hi] = this.depthBand(sp, x, night);
    // (3.7.3) a deep-living animal (its everyday band starts at 150 m, or it is a deep-sea fish): never met above
    // its band, and if it is rare or rarer, never above 100 m at all, night migrations included
    const kin = sp.legendOf || sp.id, day = CORE[kin] || [sp.dmin, sp.dmax], deepKind = day[0] >= 150 || sp.cat === 'Deep Sea Fish';
    if (deepKind) {
      const R = rarityOf(sp), floorY = R && R.i >= 2 ? Math.max(100, lo - 10) : lo - Math.min(40, (hi - lo) * 0.1);
      if (y < floorY) return 0;
    }
    // a deep animal (one that lives from 150 m down) is never met far above its band: none of the
    // rare strays into the shallows the records allow (no anglerfish at 130 m)
    if (lo >= 150 && y < lo - (DEEP_HUNTER(sp) ? 20 : Math.max(50, lo * 0.25))) return 0; // (3.0.21: the deep's hunters, never above their band)
    // (3.0.21) the deep's hunters grow commoner the deeper it is: a fifth as likely at 500 m, full from ~1,300 m, more below
    const deepK = DEEP_HUNTER(sp) ? clamp(0.2 + (y - 500) / 1000, 0.2, 1.4) : 1;
    if (y >= lo && y <= hi) {
      // (3.7.3) the deep's animals are few at the top of their band, most common about seven tenths of the way
      // down and still common near its foot; shallow animals stay best through the middle
      if (rarityOf(sp) && rarityOf(sp).id === 'legendary') { const q = (y - lo) / Math.max(1, hi - lo); return (0.5 + q) * deepK; } // (4.12.0) a legend is three times as likely at the foot of its band as at the top
      if (deepKind) { const q = (y - lo) / Math.max(1, hi - lo); return (0.08 + 0.92 * Math.pow(q, 1.4) * Math.pow(1 - q, 0.55) / DEEP_PEAK) * deepK; }
      const half = Math.max(1, (hi - lo) / 2); return (0.6 + 0.4 * (1 - Math.abs(y - (lo + hi) / 2) / half)) * deepK;
    }
    if (deepKind && y < lo) return 0;
    const d = y < lo ? lo - y : y - hi, scale = Math.max(30, (hi - lo) * 0.3);
    return 0.07 * Math.exp(-d / scale);
  }
  // the depth band this animal wants to be in right now (migrators move up at night)
  depthBand(sp, x, night) {
    const kin = sp.legendOf || sp.id; // (3.0.42) a Legendary giant lives where its ordinary kind does
    const core = (night && NIGHT[kin]) || CORE[kin];
    let lo = core ? core[0] : sp.dmin, hi = Math.min(core ? core[1] : sp.dmax, this.W.floorAt(x) - 2);
    // (3.0.21) the deep's hunters (viperfish, dragonfish, anglers and seadevils, fangtooths, gulpers, swallowers)
    // never come above 500 m, day or night, whatever the records allow
    if (DEEP_HUNTER(sp)) { lo = Math.max(lo, 500); hi = Math.min(Math.max(hi, lo + 100, Math.min(sp.dmax, 3000)), this.W.floorAt(x) - 2); } // (and down as deep as each is ever found, to 3,000 m)
    if (MIGRATORS.has(kin) && !core) {
      if (night) hi = Math.min(hi, Math.max(lo + 30, 250));
      else lo = Math.max(lo, Math.min(hi - 30, 280));
    }
    if (sp.id === 185 || sp.id === 186 || sp.id === 187) hi = Math.min(hi, 120); // air-breathers stay fairly shallow
    return [Math.max(0.8, lo), Math.max(lo + 1, hi)];
  }

  update(dt, cam, earl, entity, dread, time, night = false) {
    const W = this.W, rng = this.rng;
    this.night = night;
    this.spawnT -= dt; this.baitT -= dt;
    this.settleT = (this.settleT || 0) - dt;
    if (this.settleT <= 0) { this.settleT = 0.4; this.settle(cam); }
    if (this.spawnT <= 0) {
      this.spawnT = 0.25;
      const open = W.floorAt(cam.x) - cam.y > 60;
      // where the residents are many (a reef), fewer passing visitors are needed
      let resGroups = 0; const seenG = new Set(); for (const c of this.list) if (c.home && !seenG.has(c.gid)) { seenG.add(c.gid); resGroups++; }
      const target = Math.max(2, this.targetCount(cam.y, dread, open) - Math.floor(resGroups / 3));
      if (this.groupCount() < target) this.trySpawn(cam, dread);
    }
    // the deep's living lights: below about 220 m there are always small glowing animals about
    // (lanternfish, hatchetfish, firefly squid, dragonfish, viperfish...), each one real and catchable
    this.glimT = (this.glimT || 0) - dt;
    if (this.glimT <= 0) { this.glimT = this.list.length < 120 ? 0.12 : 0.4; this.spawnGlimmer(cam, night); } // (3.0.22: quicker while the water is empty)
    if (this.baitT <= 0) {
      this.baitT = 0.6;
      if (this.schools.size < this.baitTarget(cam.y, dread)) this.trySpawnBait(cam, night);
    }

    const hunting = this.list.filter((h) => h.prey && !h.dead);
    // ---- bait school centres ----
    for (const [gid, s] of this.schools) {
      // a slowly wandering heading
      const wander = fbm1(time * 0.04 + s.wob, 2, 7);
      let ax = s.dir * 0.35, ay = wander * 0.5;
      s.threat = Math.max(0, s.threat - dt * 0.25);
      // (2.5.4) the floor under the whole school, not just its middle: on a slope the highest point
      // under it is what it must clear, or half the fish are pressed flat against the bottom
      const sw = s.baseR * 1.9, fl = Math.min(W.floorAt(s.x - sw), W.floorAt(s.x), W.floorAt(s.x + sw));
      const clear = fl - s.y - s.r;
      if (clear < 4) ay -= 1.2 + (4 - clear) * 0.9;
      if (s.y < s.lo + s.r) ay += 0.6;
      if (s.y > s.hi - s.r) ay -= 0.6;
      // (2.6.6) kept clear of the surface by its whole height, swell included, so no fish of it is
      // pressed into a line along the top of the water
      const sTop = (this.surfY ? Math.max(this.surfY(s.x - sw), this.surfY(s.x), this.surfY(s.x + sw)) : 0) + s.baseR;
      if (s.y < sTop + 2) ay += 2 + (sTop + 2 - s.y) * 1.5;
      if (s.y < sTop + 1) s.y = sTop + 1;
      // the whole school moves off from a diver who comes close (faster if he comes fast), and
      // closes up tighter while he is near - instead of individual fish piling up around him
      const de = dist(s.x, s.y, earl.x, earl.y) + 0.01;
      const zone = s.r * 1.8 + 5 + (earl.speedNow > 2.5 ? 4 : 0);
      if (de < zone && !earl.inSub) {
        const push = (1 - de / zone) * (earl.speedNow > 2.5 ? 5 : 2.5);
        ax += (s.x - earl.x) / de * push; ay += (s.y - earl.y) / de * push * 0.7;
        s.threat = Math.min(1.2, s.threat + dt * (1 - de / zone) * 1.5);
      }
      if (entity && dread > 0.05) { const dx = s.x - entity.x, dy = s.y - entity.y, dd = Math.hypot(dx, dy) + 1; ax += dx / dd * dread * 6; ay += dy / dd * dread * 3; }
      // a hunter closing in: the whole school veers away from it
      for (const h of hunting) {
        const dx = s.x - h.x, dy = s.y - h.y, dd = Math.hypot(dx, dy) + 0.01, hz = s.r * 1.6 + 6;
        if (dd < hz) { const k = (1 - dd / hz) * 4; ax += dx / dd * k; ay += dy / dd * k * 0.6; }
      }
      s.vx += ax * dt; s.vy += ay * dt;
      const sp = 0.6 + s.threat * 2.4 + dread * 0.8; // a scared school moves off together, about as fast as a diver
      const v = Math.hypot(s.vx, s.vy);
      if (v > sp) { s.vx *= sp / v; s.vy *= sp / v; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      { const fl2 = Math.min(W.floorAt(s.x - sw), W.floorAt(s.x), W.floorAt(s.x + sw)); if (s.y > fl2 - s.r - 0.8) { s.y = fl2 - s.r - 0.8; if (s.vy > 0) s.vy = 0; } }
      if (s.x < 10) s.dir = 1; if (s.x > 4970) s.dir = -1;
      // now and then the school wheels round on its own
      s.turnT -= dt;
      if (s.turnT <= 0) { s.turnT = rng.range(18, 45); s.vx = -s.vx * 0.5; s.dir = -s.dir; }
      const nd = Math.abs(s.vx) > 0.15 ? (s.vx > 0 ? 1 : -1) : s.dir;
      if (nd !== s.prevDir) { s.turnTime = time; s.prevDir = nd; }
      s.dir = nd;
      // tighten into a ball under threat
      const want = s.baseR * (1 - 0.3 * Math.min(1, s.threat));
      s.r = lerp(s.r, want, dt * 1.5);
    }

    // ---- predators look for prey ----
    for (const c of this.list) {
      if (!c.predator || c.dead) continue;
      c.huntCool -= dt;
      if (c.prey && (c.prey.dead || dist(c.x, c.y, c.prey.x, c.prey.y) > 30)) c.prey = null;
      // an ambush hunter with a home strikes only at what passes near its den, and gives up a chase that leads away
      if (c.prey && c.home && dist(c.x, c.y, c.home.x, c.home.y) > c.homeR * 2 + 5) c.prey = null;
      if (!c.prey && c.huntCool <= 0 && rng() < dt * 2) {
        let best = null, bd = 22;
        for (const p of this.list) {
          if (p === c || p.dead || p.predator || p.len > c.len * 0.3 || p.len > 0.6) continue;
          if (p.sp.v.hab === 'drift' || p.sp.v.hab === 'floor' ) continue;
          if (c.home && dist(p.x, p.y, c.home.x, c.home.y) > c.homeR * 1.5 + 4) continue;
          const d = Math.abs(p.x - c.x) + Math.abs(p.y - c.y);
          if (d < bd) { bd = d; best = p; }
        }
        if (best) c.prey = best;
      }
    }

    const leaders = {};
    for (const c of this.list) if (c.leader && !this.schools.has(c.gid)) leaders[c.gid] = c;
    const hunters = this.list.filter((h) => h.prey && !h.dead);
    // large animals in a group (dolphins, orca, sharks...) keep their own space instead of overlapping
    const bigs = this.list.filter((b) => b.len > 1 && !this.schools.has(b.gid));
    const counts = new Map();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      if (c.dead) { this.list.splice(i, 1); continue; }
      // despawn far away
      const busy = c.att && c.att.s !== 'idle';
      if (!busy && !c.devKeep && (Math.abs(c.x - cam.x) > cam.w * 1.7 || Math.abs(c.y - cam.y) > cam.h * 2.4)) { this.list.splice(i, 1); continue; }
      // a newcomer that would start inside rock is lifted clear of the seabed, or not spawned at all
      if (!c.placed) {
        c.placed = true;
        const sk = this.skin(c);
        if (c.y > W.floorAt(c.x) - sk) c.y = Math.max(0.5, W.floorAt(c.x) - sk);
        if (!c.home && W.rockAt(c.x, c.y, c.len * 0.3)) { this.list.splice(i, 1); continue; }
      }
      counts.set(c.gid, (counts.get(c.gid) || 0) + 1);
      const school = this.schools.get(c.gid);
      let tx, ty, sp = c.speed, ax, ay;
      if (school) {
        // a fixed place in the school's shape; only the spacing tightens when it is threatened
        const tight = 1 - 0.15 * Math.min(1, school.threat);
        const ox = c.ox + Math.sin(time * 0.31 + c.wob) * 0.04, oy = c.oy + Math.cos(time * 0.27 + c.wob * 1.7) * 0.04;
        tx = school.x + ox * school.baseR * 1.8 * tight; ty = school.y + oy * school.baseR * tight;
        // (2.6.6) a place above the surface is taken just under it, still in the school's order
        // (the higher its place, the nearer the top), so the school squeezes instead of flattening
        const sf = this.surfY ? this.surfY(tx) : 0;
        ty = Math.max(ty, sf + 0.5 + c.len * 0.2 + (oy + 1) * 0.45);
        ty = Math.min(ty, W.floorAt(tx) - this.skin(c) - 0.4); // a place below the bottom is taken just above it, so the school follows a slope instead of piling into it
        ax = (tx - c.x) * 3 + (school.vx - c.vx) * 2;
        ay = (ty - c.y) * 3 + (school.vy - c.vy) * 2;
        sp = Math.max(c.speed * (1 + school.threat), Math.hypot(school.vx, school.vy) * 1.25); // keep up with the school, no more
      } else if (c.home) {
        // a homebound animal potters about its home: a new spot within its range every few
        // seconds, back home if it strays, and tucked in to rest at its own time of day
        const h = c.home;
        const resting = (c.act === 'day' && night) || (c.act === 'night' && !night);
        const R = resting ? Math.min(c.homeR, 0.7) : (c.act === 'night' && night ? c.nightR : c.homeR);
        c.tT -= dt;
        if (c.tT <= 0 || c.tx === undefined || Math.hypot(c.tx - c.x, c.ty - c.y) < 0.3) {
          c.tT = rng.range(2.5, 8);
          const nx = h.x + rng.range(-R, R);
          const up = Math.min(R, 6) * (h.kind === 'kelp' ? 1.4 : 0.8);
          let ny = h.y + rng.range(-up, Math.min(0.3, R * 0.2));
          if (h.kind === 'kelp') ny = clamp(ny, h.top + 1, h.bottom - 0.6);
          // open-water reef fish, out and about, swim well clear of the rock: 3-15 m above the seabed
          // (never right at the surface); at rest, or hiding, they keep to their home
          if (c.sp.v.hab === 'reef' && !resting && !(c.hideT > 0)) ny = Math.max(1.2, W.floorAt(nx) - rng.range(3, 15));
          c.tx = nx; c.ty = Math.min(ny, W.floorAt(nx) - 0.4 - c.len * 0.3);
        }
        const high = c.sp.v.hab === 'reef' && !resting;
        const away = high ? Math.abs(c.x - h.x) + Math.max(0, h.y - 16 - c.y) : Math.hypot(c.x - h.x, c.y - h.y); // (the high swimmers: only how far along, and nothing above 16 m over home, counts as away)
        tx = c.tx; ty = c.ty;
        if (away > R * 1.5 + 1) { tx = h.x; ty = h.y; }
        sp = c.speed * (resting ? 0.35 : away > R * 1.5 + 1 ? 1 : 0.6);
        ax = (tx - c.x) * 0.8 - c.vx * 0.3; ay = (ty - c.y) * 0.8 - c.vy * 0.3;
      } else {
        const L = leaders[c.gid];
        if (!c.leader && L) {
          const k = Math.max(1, c.len * 0.7); // slots scale with body size
          tx = L.x - L.dir * (0.5 + (c.wob % 3)) * k + Math.sin(time * 0.7 + c.wob) * 1.2 * Math.min(k, 2);
          ty = L.y + Math.sin(time * 0.5 + c.wob * 1.3) * 0.9 + ((c.wob % 7) - 3.5) * 0.25 * k;
          // (2.6.6) with the leader up at the surface, a place above it is taken just under it, each fish at
          // its own depth (the same order as in the group), so the group never ends up in one flat row
          const sfL = this.surfY ? this.surfY(tx) : 0;
          ty = Math.max(ty, sfL + 0.6 + c.len * 0.2 + (c.wob % 7) / 7 * 1.6);
        } else {
          c.leader = true;
          const pel = c.sp.v.hab === 'pelagic' || c.sp.v.hab === 'drift' || c.sp.v.hab === 'surface';
          if (pel) {
            // roam up and down the species' depth range rather than cruising at one level
            c.tDepthT -= dt;
            const [lo, hi] = this.depthBand(c.sp, c.x, night);
            if (c.tDepthT <= 0 || c.tDepth < lo || c.tDepth > hi) {
              c.tDepthT = rng.range(8, 22);
              const span = Math.min(hi - lo, 40 + c.len * 25);
              c.tDepth = clamp(c.y + rng.range(-span, span), lo, hi);
              if (c.y < lo - 20 || c.y > hi + 20) c.tDepth = clamp(c.y, lo, hi);
            }
          }
          c.turnT -= dt;
          if (c.turnT <= 0) { c.turnT = rng.range(25, 80); c.dir = -c.dir; c.vx *= -0.3; }
          const wander = fbm1(time * 0.05 + c.wob, 2, 3) * 1.6;
          tx = c.x + c.dir * 6;
          ty = pel ? c.y + clamp(c.tDepth - c.y, -4, 4) + wander : c.y + wander * 3;
        }
        ax = (tx - c.x) * 0.6; ay = (ty - c.y) * 0.6;
        if (c.len > 1) for (const o of bigs) {
          if (o === c || o.gid !== c.gid) continue;
          const dx = c.x - o.x, dy = (c.y - o.y) * 2.5, need = (c.len + o.len) * 0.55, d = Math.hypot(dx, dy);
          if (d < need) { const f = (need - d) / need * 4 / (d + 0.05); ax += dx * f * 1.5; ay += dy * f; }
        }
      }
      // an attacker under hunter control steers straight to its target
      if (c.ctrl) {
        const dx = c.ctrl.x - c.x, dy = c.ctrl.y - c.y, d = Math.hypot(dx, dy) + 0.01;
        ax = dx / d * 25; ay = dy / d * 25; sp = c.ctrl.speed;
        if (d < 0.3) { ax = -c.vx * 4; ay = -c.vy * 4; }
      }
      // a predator on a hunt: a burst straight at its prey
      if (c.prey) {
        const p = c.prey;
        const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) + 0.01;
        ax = dx / d * 18; ay = dy / d * 18;
        sp = clamp(c.len * 2.2, 3, 10);
        // the school feels it coming
        const ps = this.schools.get(p.gid);
        if (ps && d < 14) ps.threat = Math.min(1.5, ps.threat + dt * 2);
        if (d < Math.max(0.35, c.len * 0.3)) {
          p.dead = true; c.prey = null; c.huntCool = rng.range(5, 14);
          this.puffs.push({ x: p.x, y: p.y, t: 0, n: 6 + Math.floor(rng() * 5), seed: rng() * 100 });
        }
      }
      // prey scatter from a hunter closing in
      if (!c.predator && c.len < 0.6) {
        for (const h of hunters) {
          const dx = c.x - h.x, dy = c.y - h.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) continue;
          const d = Math.hypot(dx, dy) + 0.1;
          if (school) {
            // only the fish right at the strike dart aside (forward, with the school); the rest of
            // the school's response is the whole body veering away and balling up
            // (school fish don't scatter on their own: the whole school veers away instead)
          } else if (d < 4 && c.home && c.hide) c.fleeT = Math.max(c.fleeT, 1.5); // into its hole
          else if (d < 4) { ax += dx / d * 30; ay += dy / d * 30; sp *= 2.5; }
        }
      }
      // Earl: schools part around him; other fish bolt if he comes at them fast, but a slow,
      // calm approach lets him get close enough to observe
      const de = dist(c.x, c.y, earl.x, earl.y);
      if (school) {
        // school fish don't break ranks: the whole school moves off (see the school centres)
      } else if (c.flee > 0 && !c.prey && !c.ctrl && !earl.inSub && !c.tutor) { // (4.19.3: not the tutorial's fish: it waits for him, and darts only when the first swing misses)
        const closing = ((c.x - earl.x) * earl.vx + (c.y - earl.y) * earl.vy) / (de + 0.01);
        // hanging still he can come very close; drifting slowly, a little less; fast, not at all
        const threat = (earl.speedNow < 0.4 ? 0.9 : earl.speedNow < 1.3 ? 1.4 : (3 + c.len * 1.5) * (earl.sprint ? 1.6 : 1) * (closing > 1 ? 1.4 : 1)) * (1 - (earl.ambush || 0));
        const unseen = (earl.kelpSet && W.inKelp(earl.x, earl.y)) || (earl.legends && earl.legends.has('magnetic')); // (2.8.0) the Kelp Runner set; Magnetic
        if (de < threat && !unseen) c.fleeT = 1.2 + c.len * 0.5;
        if (earl.legends && earl.legends.has('magnetic') && !c.predator && de < 12 && de > 1.2) { ax += (earl.x - c.x) / de * 4; ay += (earl.y - c.y) / de * 3; } // fish come to him
      } else if (c.flee > 0 && earl.inSub && de < 10) c.fleeT = 1.5; // the sub is loud
      if (c.fleeT > 0) {
        c.fleeT -= dt;
        if (c.home && c.hide) {
          // a reef animal doesn't bolt into open water: it darts back into its home and stays there
          const hx = c.home.x - c.x, hy = c.home.y - c.y, hd = Math.hypot(hx, hy) + 0.01;
          ax = hx / hd * 30; ay = hy / hd * 30; sp = Math.max(sp, c.flee || c.speed * 2);
          if (hd < 0.5) c.hideT = Math.max(c.hideT || 0, rng.range(4, 9));
        } else {
          ax = (c.x - earl.x) / (de + 0.1) * 30; ay = (c.y - earl.y) / (de + 0.1) * 20;
          sp = Math.max(sp, c.flee);
          // (4.12.5) not into a wall: rock or seabed ahead turns it back the other way, and the bottom lifts it
          const sx = Math.sign(ax) || 1, look = 1.5 + c.len;
          if (W.rockAt(c.x + sx * look, c.y, 0.2) || W.floorAt(c.x + sx * look) < c.y + 0.4) { ax = -sx * 30; c.wallT = 1.2; }
          else if (c.wallT > 0) { c.wallT -= dt; ax = Math.abs(ax) * (c.vx >= 0 ? 1 : -1); }
          if (c.y + Math.max(0, ay) * 0.08 > W.floorAt(c.x) - 1 - c.len * 0.5) ay = -Math.abs(ay) - 8;
          if (W.rockAt(c.x, c.y + Math.sign(ay) * look, 0.2)) ay = -ay;
        }
      }
      // tucked into its home: it waits there while the diver is close, then creeps back out
      if (c.hideT > 0) {
        c.hideT -= dt;
        if (de < 3 && earl.speedNow > 0.4) c.hideT = Math.max(c.hideT, 1.5);
        const h = c.home;
        ax = (h.x + Math.sin(time * 1.7 + c.wob) * 0.12 - c.x) * 5 - c.vx * 2; ay = (h.y - c.y) * 5 - c.vy * 2;
        sp = Math.max(0.25, c.speed * 0.4);
        c.hidden = true;
      } else c.hidden = false;
      // flee the entity (reef animals hide from it instead)
      if (entity && dread > 0.05 && c.home && c.hide) c.hideT = Math.max(c.hideT || 0, 3);
      else if (entity && dread > 0.05) {
        const dx = c.x - entity.x, dy = c.y - entity.y, dd = Math.hypot(dx, dy) + 1;
        const f = dread * 30;
        ax += (dx / dd) * f; ay += (dy / dd) * f * 0.5;
        sp = school ? sp : Math.max(sp, c.flee || c.speed);
      }
      // stay in water & habitat band
      const fl = W.floorAt(c.x);
      const surf = this.surfY ? this.surfY(c.x) : 0;
      // (2.6.6) a fish driven at the surface or the bottom turns along it instead of pressing into it:
      // the part of its push that points into the boundary becomes speed along it, so frightened fish
      // spread out sideways (each at its own depth) instead of piling up in a flat line
      if (c.fleeT > 0 || (entity && dread > 0.05)) {
        const roomUp = c.y - surf, roomDown = fl - c.y;
        const into = ay < 0 && roomUp < 3 ? -ay * (1 - roomUp / 3) : ay > 0 && roomDown < 3 ? ay * (1 - roomDown / 3) : 0;
        if (into > 0) {
          const side = Math.abs(ax) > 0.5 ? Math.sign(ax) : (c.dir || 1);
          ax += side * into; ay += (ay < 0 ? 1 : -1) * into * 1.3;
          if (!school) c.dir = side;
        }
      }
      if (c.y > fl - 1.2) ay -= 8;
      if (c.y < surf + 0.6) ay += 6;
      if (!school && !c.home) {
        if (c.sp.v.hab === 'reef' && fl - c.y > 10) ay += 1.5;
        if ((c.sp.v.hab === 'floor-swim' || c.sp.v.hab === 'drift-low') && fl - c.y > 2.5) ay += 1.5;
        if (c.sp.v.hab === 'demersal' && fl - c.y > 20) ay += 1;
        const kin = c.sp.legendOf || c.sp.id, band = (night && NIGHT[kin]) || CORE[kin] || [c.sp.dmin, c.sp.dmax];
        if (c.y < band[0] - 20) ay += 2;
        if (c.y > band[1] + 20) ay -= 2;
      }
      if (c.variant === 'abnormal') { ay += Math.sin(time * 2.7 + c.wob) * 2.5; ax += Math.sin(time * 1.9 + c.wob * 2) * 0.8; } // it swims wrong
      c.vx += ax * dt; c.vy += ay * dt;
      const v = Math.hypot(c.vx, c.vy);
      if (v > sp) { c.vx *= sp / v; c.vy *= sp / v; }
      c.vy *= 0.97;
      const ox = c.x, oy = c.y;
      c.x += c.vx * dt; c.y += c.vy * dt;
      const lim = surf + 0.35 + c.len * 0.15 + (school ? 0 : (c.wob % 1) * 0.9); // (2.6.6) each its own ceiling: never all in one row
      if (c.y < lim) { c.y = lim; if (c.vy < 0) c.vy = 0; }
      // never inside rock: a step into the seabed, a wall or a boulder is undone and the animal turns
      // away; if it is in anyway (pushed, or the floor rose under it), it is lifted straight out.
      // (Before, only a gentle push kept fish off the floor: on a steep wall one sideways step could
      // put a fish metres inside it.) Residents tucked into their crevice are left there while hidden.
      if (!c.hidden) {
        const sk = this.skin(c);
        if (c.y > W.floorAt(c.x) - sk || W.rockAt(c.x, c.y, c.len * 0.25)) {
          c.x = ox; c.y = oy; c.vx = -c.vx * 0.5; c.vy = Math.min(c.vy, 0) - 0.2;
          if (!school) c.dir = -c.dir;
          if (c.home) { c.tx = c.home.x; c.ty = c.home.y; }
        }
        const fl = W.floorAt(c.x);
        if (c.y > fl - sk) { c.y = fl - sk; if (c.vy > 0) c.vy = 0; }
      }
      if (school) {
        // all aligned with the school; when it turns, the turn sweeps from the leading edge back,
        const front = c.ox * school.prevDir; // +1 at the new front
        if (c.dir !== school.dir && time - school.turnTime > (1 - front) * 0.45) { c.dir = school.dir; c.turnedAt = time; }
        c.hvy = lerp(c.hvy || 0, school.vy * 0.8 + (c.vy - school.vy) * 0.25, Math.min(1, dt * 3));
        c.flash = 0;
      } else if (Math.abs(c.vx) > 0.08) c.dir = c.vx > 0 ? 1 : -1;
      if (c.x < 3) { c.dir = 1; c.vx = Math.abs(c.vx); }
      c.phase += dt * (0.6 + Math.min(4, v * 1.4));
    }
    // forget schools that have dispersed or gone off-screen
    for (const gid of this.schools.keys()) if (!counts.get(gid)) this.schools.delete(gid);
    for (let i = this.puffs.length - 1; i >= 0; i--) { this.puffs[i].t += dt; if (this.puffs[i].t > 2.5) this.puffs.splice(i, 1); }
  }

  nearest(x, y, maxD) {
    let best = null, bd = maxD;
    for (const c of this.list) {
      const d = dist(x, y, c.x, c.y) - c.len * 0.4;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
}
