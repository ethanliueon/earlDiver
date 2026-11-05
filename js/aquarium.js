// Earl's aquarium, on the beach. The endless goal: keep live animals for display instead of
// selling them, one of each species and each rare form, in wings built one by one. Visitors pay
// for tickets every day (every 10-minute day/night cycle), more the better the collection; each
// wing costs a little to run. The last wing needs animals from the very bottom.
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { liveValue, canTakeLive } from './specimens.js';
import { VARIANTS, variantMult } from './variants.js';

export const DAY = 600; // seconds of play per paid day
export const WINGS = [
  { id: 'reef', name: 'Reef hall', price: 2000, slots: 12, upkeep: 40, desc: 'Warm shallow tanks under a glass roof: reef fish, seahorses, crabs, starfish.' },
  { id: 'kelp', name: 'Kelp tower', price: 6000, slots: 10, upkeep: 80, desc: 'A tall cold-water cylinder with a living kelp forest for the cold-water fish.' },
  { id: 'open', name: 'Open ocean dome', price: 15000, slots: 8, upkeep: 150, desc: 'One enormous round tank for open-water swimmers and drifting jellies.' },
  { id: 'twilight', name: 'Twilight gallery', price: 30000, slots: 10, upkeep: 250, desc: 'Dim, chilled tanks for animals from 150 to 500 m.' },
  { id: 'deep', name: 'Deep-sea gallery', price: 60000, slots: 8, upkeep: 500, desc: 'Pressurised black tanks behind portholes, for animals from below 500 m.' },
  { id: 'abyss', name: 'Abyss tank', price: 120000, slots: 6, upkeep: 900, desc: 'One tank held at the pressure of the very bottom. Only for animals caught below 2,500 m.' },
];
export const WING_BY_ID = Object.fromEntries(WINGS.map((w) => [w.id, w]));

// which wing an animal belongs in (where it lives, and where it was caught)
export function zoneOf(spec) {
  const sp = SPECIES_BY_ID[spec.id];
  if ((spec.from || 0) >= 2500) return 'abyss';
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
  A.display[displayKey(spec)] = { id: spec.id, variant: spec.variant || null, wing: zone, since: Date.now() };
}

// how much a displayed animal draws visitors: rarer, deeper and stranger is better
export function drawOf(d) {
  const sp = SPECIES_BY_ID[d.id];
  return Math.sqrt(liveValue(sp) * variantMult(d.variant)) * 2;
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
export function dailyIncome(P) { return Math.round(reputation(P) * 3); }
export function visitors(P) { return Math.round(reputation(P) * 1.6); }

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
  return { species, of: KEEPABLE, rare, rareOf: KEEPABLE * Object.keys(VARIANTS).length };
}
