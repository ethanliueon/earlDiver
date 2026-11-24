// (7.4.14, owner) Pets come only from pearls. A pet is never an item: not in the bag, the locker or the aquarium, never
// sold. Each kind shows in the shop once one of that species has been caught (a dark outline until then, "Catch one to
// unlock"). Three tiers by price, each with its rarity: exotic 80 pearls (plain), legendary 150 (a soft glow and slow
// motes), mythical 500, the giants (a stronger, ember glow and more of it).
// Every pet starts at its real size in the game and grows by feeding: once a day, at the surface, one live animal
// brought up (its points by its rarity); at 10, 50, 100 and 500 points it reaches a level and grows a fifth again.
// The size shown can be set back to any level reached, without losing the level. Pearls top up points, 1 for 10.
import { SPECIES_BY_ID } from './species.js';
import { rarityOf } from './specimens.js';

export const PET_TIERS = {
  exotic: { pearls: 80, name: 'Exotic' },
  legendary: { pearls: 150, name: 'Legendary' },
  mythical: { pearls: 500, name: 'Mythical' },
};
const T = (tier, ids) => ids.map((id) => ({ id, tier, pearls: PET_TIERS[tier].pearls }));
export const PETS = [
  // ordinary animals of the game, at their own size
  ...T('exotic', [53, 482, 462, 329, 499, 87, 67, 325, 150, 319, 103, 352, 472, 323]),
  // the legends ("the" forms), and the goblin shark
  ...T('legendary', [100, 101, 2102, 2110, 2162, 2150, 104, 105, 108, 2146, 54, 86]),
  // the giants
  ...T('mythical', [149, 350, 351, 188, 88]),
].filter((p) => SPECIES_BY_ID[p.id]);
export const PET_BY_ID = new Map(PETS.map((p) => [p.id, p]));

// growth
export const PET_LEVELS = [10, 50, 100, 500];
export const PET_GROW = 1.2; // each level a fifth again
export const MAX_LEVEL = PET_LEVELS.length;
export const PEARL_POINTS = 10; // 1 pearl buys 10 points
// points for an animal fed, by its rarity (a legendary 100)
export const FEED_POINTS = { common: 5, uncommon: 10, rare: 20, exotic: 40, undocumented: 40, legendary: 100 };
export const feedPoints = (sp) => FEED_POINTS[(rarityOf(sp) || {}).id] || 5;

export const petsOwned = (P) => new Set(P.petsOwned || []);
export const petUnlocked = (P, id) => (P.caught || []).includes(id) || petsOwned(P).has(id);
export function petData(P, id) { P.petData = P.petData || {}; return P.petData[id] || (P.petData[id] = { pts: 0, size: null, fed: null }); }
export const levelOf = (pts) => PET_LEVELS.filter((n) => pts >= n).length;
export const petLevel = (P, id) => levelOf(petData(P, id).pts);
// the level whose size is shown: the one chosen, or the highest reached
export function sizeLevel(P, id) { const d = petData(P, id), lv = levelOf(d.pts); return d.size == null ? lv : Math.min(d.size, lv); }
export const petScale = (P, id) => Math.pow(PET_GROW, sizeLevel(P, id));
// the next level's points, or null at the top
export function nextLevel(pts) { const n = PET_LEVELS.find((q) => pts < q); return n == null ? null : n; }
// pearls to reach the next level
export function topUpCost(pts) { const n = nextLevel(pts); return n == null ? 0 : Math.ceil((n - pts) / PEARL_POINTS); }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const fedToday = (P, id) => petData(P, id).fed === today();
export function markFed(P, id) { petData(P, id).fed = today(); }
// what can be fed: the live animals brought up (the bag and the sub's tank), one card each
export function feedable(g) {
  const L = [];
  g.bag.forEach((s, i) => { if (SPECIES_BY_ID[s.id] && s.cond > 0.05) L.push({ where: 'bag', i, s }); });
  (g.subTank || []).forEach((s, i) => { if (SPECIES_BY_ID[s.id] && s.cond > 0.05 && !s.pile) L.push({ where: 'tank', i, s }); });
  return L;
}
// feeding happens at the surface: on the boat, or in the water or the sub at the top
export const atSurface = (g) => !!(g.aboard || (g.earl && (g.earl.inSub ? g.sub.y < 4 : g.earl.y < 3)));
