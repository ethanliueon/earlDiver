// The aquarium: a gallery aboard the Margaret, for the pleasure of it. Live animals kept here can be
// watched, petted, fed and named; the longer a healthy one lives here, the more it is worth (Happy,
// then the Famous tag). Visitors come aboard to see them and leave a little money each day, but not
// enough to live on: the sea pays, the gallery is for keeping what you love.
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { liveValue, canTakeLive } from './specimens.js';
import { VARIANTS, variantMult, canBeRare } from './variants.js';

export const DAY = 600; // seconds of play per gallery day
// the four tanks set into the gallery's bulkhead (an animal goes in the one for its water)
export const WINGS = [
  { id: 'reef', name: 'Warm reef tank', water: ['#2a7a90', '#0c3644'], desc: 'Warm shallow water: reef fish, seahorses, crabs, starfish.' },
  { id: 'kelp', name: 'Cold water tank', water: ['#2a6a6a', '#0a2a2c'], desc: 'Chilled, green, with a little kelp: the cold-water fish.' },
  { id: 'open', name: 'Open water tank', water: ['#1f5f8a', '#08243a'], desc: 'Long and blue, for swimmers, sharks and drifting jellies.' },
  { id: 'deep', name: 'Dark tank', water: ['#0c1a26', '#020608'], desc: 'Black and cold, for the animals of the deep.' },
];
export const WING_BY_ID = Object.fromEntries(WINGS.map((w) => [w.id, w]));
// room for animals: four to start, two more for each refit, up to twenty
// (3.0.16) the aquarium's size by level: 5, then 7 ($200), 11 ($1,000), 15 ($3,500), 20 ($10,000)
export const GALLERY_SIZES = [5, 7, 11, 15, 20];
export const GALLERY_STEPS = [200, 1000, 3500, 10000];
export const gallerySlots = (P) => GALLERY_SIZES[Math.min(GALLERY_STEPS.length, P.galleryLv || 0)];
// (4.1.1) how many places an animal takes, by its length: a small fish one, a metre-long one three, an oarfish or a
// big shark six. Something bigger than the whole aquarium still goes in, if the aquarium is otherwise empty:
// it simply fills it.
export function placesOf(spec) {
  const len = spec.len || (SPECIES_BY_ID[spec.id] || {}).len || 0.2;
  return len < 0.5 ? 1 : len < 1 ? 2 : len < 2 ? 3 : len < 3.5 ? 4 : len < 5 ? 5 : 6;
}
export const placesTaken = (P, spec) => Math.min(placesOf(spec), gallerySlots(P));
export const placesUsed = (P) => Object.values(aquariumOf(P).display).reduce((a, d) => a + placesTaken(P, d), 0);

// which wing an animal belongs in (where it lives, and where it was caught)
export function zoneOf(spec) {
  const sp = SPECIES_BY_ID[spec.id];
  if (sp.dmin >= 150 || sp.cat === 'Deep Sea Fish' || (spec.from || 0) >= 400) return 'deep';
  if (sp.cat === 'Open Ocean Fish' || sp.cat === 'Sharks & Rays' || sp.cat === 'Jellyfish & Drifters' || sp.v.hab === 'pelagic') return 'open';
  if (sp.cat === 'Cold Water Fish' || (sp.dmin >= 20 && sp.cat !== 'Reef Fish')) return 'kelp';
  return 'reef';
}
export const displayKey = (spec) => spec.id + (spec.variant ? ':' + spec.variant : '');

export function aquariumOf(P) {
  if (!P.aquarium) P.aquarium = { wings: [], display: {}, clock: 0, days: 0, earned: 0, lastDay: null };
  return P.aquarium;
}
// the tank an animal on display swims in (older saves had more wings: their deep ones share the dark tank)
export const tankOf = (d) => (WING_BY_ID[d.wing] ? d.wing : 'deep');
export function wingUsed(P, wing) { return Object.values(aquariumOf(P).display).filter((d) => tankOf(d) === wing).length; }
// can this specimen go on display? returns null if yes, or the reason it can't
export function displayRefusal(P, spec) {
  const A = aquariumOf(P);
  if (A.display[displayKey(spec)]) return 'already in the gallery';
  if (spec.cond <= 0.05) return 'dead: it can only be sold';
  if (placesUsed(P) + placesTaken(P, spec) > gallerySlots(P)) { const n = placesTaken(P, spec); return `it needs ${n} place${n > 1 ? 's' : ''}: not enough room`; }
  return null;
}
export function display(P, spec) {
  const A = aquariumOf(P), zone = zoneOf(spec);
  A.display[displayKey(spec)] = { id: spec.id, variant: spec.variant || null, wing: zone, since: Date.now(),
    len: spec.len || SPECIES_BY_ID[spec.id].len, cond: spec.cond ?? 1, from: spec.from || 0, name: '', happyT: 0, famT: 0, famous: !!spec.famous };
}

// ---------------- life in the gallery (v2) ----------------
// A healthy animal (condition 0.7+) that lives here 5 minutes of play becomes Happy (sells for x1.2);
// 15 minutes after that it earns the Famous tag (x2, stacking: x2.4). Happy lapses if it sickens;
// Famous never does. Feeding helps a stressed one recover faster; a dying one (below 0.3) only fades, and
// dies within minutes. Petting is for the two of you.
export const HAPPY_AFTER = 300, FAMOUS_AFTER = 900;
export const isHappy = (d) => (d.happyT || 0) >= HAPPY_AFTER;
export function lifeMult(d) { return (isHappy(d) ? 1.2 : 1) * (d.famous ? 2 : 1); }
export function tickGallery(P, dt) {
  const A = aquariumOf(P);
  for (const d of Object.values(A.display)) {
    if (d.cond === undefined) d.cond = 1;
    if (d.cond <= 0.05) continue;                                       // dead: X eyes, until it is taken out
    if (d.cond < 0.3) d.cond = Math.max(0, d.cond - dt * 0.0007);     // dying: a few minutes more, then it is gone
    else d.cond = Math.min(1, d.cond + dt * (d.fedT > 0 ? 0.004 : 0.0015)); // stressed: clean water and meals bring it back
    if (d.fedT > 0) d.fedT -= dt;
    if (d.cond >= 0.7) {
      d.happyT = (d.happyT || 0) + dt;
      if (isHappy(d)) { d.famT = (d.famT || 0) + dt; if (d.famT >= FAMOUS_AFTER && !d.famous) { d.famous = true; d.justFamous = true; } }
    } else d.happyT = 0;
  }
}
// what one on display would fetch at the boat (before the pay upgrade)
export function gallerySale(d) {
  const sp = SPECIES_BY_ID[d.id];
  const base = liveValue(sp, d.len || sp.len) * variantMult(d.variant);
  return d.cond <= 0.05 ? base * 0.1 : base * lifeMult(d);
}

// the day's takings: a little from every animal, less from a stressed one, a trickle from a dying one,
// nothing from the dead. About 2 % of what the animal is worth, a day: pleasant, never a living.
export function earnsOf(d) {
  if (d.cond <= 0.05) return 0;
  const sp = SPECIES_BY_ID[d.id];
  const k = d.cond >= 0.7 ? 1 : d.cond >= 0.3 ? 0.5 : 0.25;
  return liveValue(sp, d.len || sp.len) * variantMult(d.variant) * lifeMult(d) * 0.02 * k;
}
export function dailyIncome(P) { return Math.round(Object.values(aquariumOf(P).display).reduce((a, d) => a + earnsOf(d), 0) * 100) / 100; }
export function visitors(P) {
  const list = Object.values(aquariumOf(P).display).filter((d) => d.cond > 0.05);
  return list.length ? Math.round(6 + list.length * 4 + list.filter((d) => d.famous).length * 15 + list.filter((d) => d.variant).length * 6) : 0;
}
// advance the gallery's clock; returns the day's result when a day ends
export function tickAquarium(P, dt) {
  const A = aquariumOf(P);
  if (!Object.keys(A.display).length) return null;
  A.clock += dt;
  if (A.clock < DAY) return null;
  A.clock -= DAY;
  A.days++;
  const income = dailyIncome(P);
  P.cash = Math.round((P.cash + income) * 100) / 100;
  P.lifetime = Math.round((P.lifetime + income) * 100) / 100;
  A.earned += income;
  A.lastDay = { visitors: visitors(P), income };
  return income > 0 ? A.lastDay : null;
}

// completion: species on display out of every species that can be kept, plus rare forms
const KEEPABLE = SPECIES.filter((s) => canTakeLive(s)).length;
export function completion(P) {
  const A = aquariumOf(P);
  const list = Object.values(A.display);
  const species = new Set(list.map((d) => d.id)).size;
  const rare = list.filter((d) => d.variant).length;
  return { species, of: KEEPABLE, rare, rareOf: SPECIES.filter(canBeRare).length * Object.keys(VARIANTS).length };
}
