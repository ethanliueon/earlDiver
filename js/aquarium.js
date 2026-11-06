// Earl's aquarium, on the beach. The endless goal: keep live animals for display instead of
// selling them, one of each species and each rare form, in wings built one by one. Visitors pay
// for tickets every day (every 10-minute day/night cycle), more the better the collection; each
// wing costs a little to run. The last wing needs animals from the very bottom.
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { liveValue, canTakeLive } from './specimens.js';
import { VARIANTS, variantMult, canBeRare } from './variants.js';

export const DAY = 600; // seconds of play per paid day
export const WINGS = [
  { id: 'reef', name: 'Reef hall', price: 530, slots: 12, upkeep: 7, desc: 'Warm shallow tanks under a glass roof: reef fish, seahorses, crabs, starfish.' },
  { id: 'kelp', name: 'Kelp tower', price: 3600, slots: 10, upkeep: 35, desc: 'A tall cold-water cylinder with a living kelp forest for the cold-water fish.' },
  { id: 'open', name: 'Open ocean dome', price: 19000, slots: 8, upkeep: 190, desc: 'One enormous round tank for open-water swimmers and drifting jellies.' },
  { id: 'twilight', name: 'Twilight gallery', price: 59000, slots: 10, upkeep: 440, desc: 'Dim, chilled tanks for animals from 150 to 500 m.' },
  { id: 'deep', name: 'Deep-sea gallery', price: 135000, slots: 8, upkeep: 900, desc: 'Pressurised black tanks behind portholes, for animals from below 500 m.' },
  { id: 'abyss', name: 'Abyss tank', price: 300000, coins: 10, slots: 6, upkeep: 1800, desc: 'One tank held at the pressure of the very bottom. Only for animals caught below 3,500 m.' },
];
export const WING_BY_ID = Object.fromEntries(WINGS.map((w) => [w.id, w]));

// which wing an animal belongs in (where it lives, and where it was caught)
export function zoneOf(spec) {
  const sp = SPECIES_BY_ID[spec.id];
  if ((spec.from || 0) >= 3500) return 'abyss';
  if (sp.dmin >= 500) return 'deep';
  if (sp.dmin >= 150 || sp.cat === 'Deep Sea Fish') return 'twilight';
  if (sp.cat === 'Open Ocean Fish' || sp.cat === 'Sharks & Rays' || sp.cat === 'Jellyfish & Drifters' || sp.v.hab === 'pelagic') return 'open';
  if (sp.cat === 'Cold Water Fish' || (sp.dmin >= 20 && sp.cat !== 'Reef Fish')) return 'kelp';
  return 'reef';
}
export const displayKey = (spec) => spec.id + (spec.variant ? ':' + spec.variant : '');

export function aquariumOf(P) {
  if (!P.aquarium) P.aquarium = { wings: [], display: {}, clock: 0, days: 0, earned: 0, lastDay: null };
  return P.aquarium;
}
export function wingUsed(P, wing) {
  const A = aquariumOf(P);
  return Object.values(A.display).filter((d) => d.wing === wing).length;
}
// can this specimen go on display? returns null if yes, or the reason it can't
export function displayRefusal(P, spec) {
  const A = aquariumOf(P), zone = zoneOf(spec), W = WING_BY_ID[zone];
  if (A.display[displayKey(spec)]) return 'already on display';
  if (!A.wings.includes(zone)) return `needs the ${W.name.toLowerCase()}`;
  if (wingUsed(P, zone) >= W.slots) return `the ${W.name.toLowerCase()} is full`;
  if (spec.cond < 0.3) return 'too weak to display';
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
// Famous never does. Feeding helps a weak one recover; petting is for the two of you.
export const HAPPY_AFTER = 300, FAMOUS_AFTER = 900;
export const isHappy = (d) => (d.happyT || 0) >= HAPPY_AFTER;
export function lifeMult(d) { return (isHappy(d) ? 1.2 : 1) * (d.famous ? 2 : 1); }
export function tickGallery(P, dt) {
  const A = aquariumOf(P);
  for (const d of Object.values(A.display)) {
    if (d.cond === undefined) d.cond = 1;
    if (d.cond <= 0.05) continue;                                       // dead: X eyes, until it is taken out
    d.cond = Math.min(1, d.cond + dt * (d.fedT > 0 ? 0.004 : 0.0015));   // clean water, regular meals
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

// how much a displayed animal draws visitors: rarer, deeper and stranger is better
export function drawOf(d) {
  const sp = SPECIES_BY_ID[d.id];
  return liveValue(sp) * variantMult(d.variant) * 0.8;
}
export function reputation(P) {
  const A = aquariumOf(P);
  const list = Object.values(A.display);
  let r = 0;
  for (const d of list) r += drawOf(d);
  const species = new Set(list.map((d) => d.id)).size;
  return r * (1 + Math.floor(species / 10) * 0.1); // variety: +10 % per ten species
}
// only wings with animals in them cost anything to run
export function upkeep(P) { return aquariumOf(P).wings.reduce((a, w) => a + (wingUsed(P, w) ? WING_BY_ID[w].upkeep : 0), 0); }
export function dailyIncome(P) { return Math.round(reputation(P) * 100) / 100; }
export function visitors(P) { return Math.round(4 + reputation(P) * 3); }

// advance the aquarium's clock; returns the day's result when a day ends
export function tickAquarium(P, dt) {
  const A = aquariumOf(P);
  if (!A.wings.length) return null;
  A.clock += dt;
  if (A.clock < DAY) return null;
  A.clock -= DAY;
  A.days++;
  const income = dailyIncome(P), cost = Math.min(upkeep(P), income + Math.max(0, P.cash)), net = income - cost; // never into debt
  P.cash = Math.round((P.cash + net) * 100) / 100;
  if (net > 0) P.lifetime = Math.round((P.lifetime + net) * 100) / 100;
  A.earned += net;
  A.lastDay = { visitors: visitors(P), income, cost, net };
  return A.lastDay;
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
