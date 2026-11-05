// What animals are worth, and what can be done with them.
//
// Live: small enough for a net or slurp gun, sold to the aquarium buyer. Tag: too big to bring
// up (and swimming), tagged for the research program (built later). Neither: plants, corals,
// anything rooted, anything too big to carry off the bottom.
import { SPECIES_BY_ID } from './species.js';

// Aquarium prices (US$, one healthy adult of normal size). Set by hand for the animals that matter;
// everything else comes from the formula below.
const LIVE = {
  1: 25, 2: 40, 3: 35, 4: 30, 5: 120, 6: 150, 7: 45, 8: 30, 9: 60, 10: 40, 11: 90, 12: 180, 13: 70,
  16: 20, 17: 25, 18: 45, 19: 60, 20: 50, 21: 90, 22: 160, 26: 30, 27: 6, 28: 4, 29: 5, 30: 45,
  31: 90, 34: 140, 37: 60, 41: 12, 47: 15, 48: 0.3, 49: 0.2, 50: 0.15, 51: 0.6, 57: 15, 59: 50,
  61: 8, 62: 1, 65: 20, 66: 30, 69: 60, 71: 70, 72: 80, 73: 70, 74: 150,
  90: 600, 94: 150, 97: 300,
  98: 5, 99: 60, 100: 2500, 101: 800, 102: 1200, 103: 900, 104: 3500, 105: 4000, 106: 2000, 107: 2500,
  110: 3000, 111: 40, 112: 60, 113: 80, 114: 400, 115: 1500, 116: 800, 117: 40,
  135: 0.5, 136: 4, 137: 8, 138: 25, 139: 60, 140: 90, 141: 1800,
  142: 150, 144: 220, 145: 300, 146: 5000, 147: 120, 150: 4000, 151: 30,
  152: 45, 153: 60, 154: 15, 156: 20, 158: 10, 159: 120, 160: 20, 161: 0.05, 162: 900, 163: 6000,
  164: 12, 165: 8, 166: 40, 167: 3, 168: 300, 169: 20, 170: 3000,
  171: 25, 173: 40, 174: 60, 175: 200, 176: 900, 177: 30,
};
const CAT_BASE = {
  'Reef Fish': 18, 'Cold Water Fish': 10, 'Open Ocean Fish': 6, 'Deep Sea Fish': 300, 'Sharks & Rays': 120,
  'Crabs, Lobsters & Shrimp': 20, 'Octopus & Squid': 60, 'Seahorses & Relatives': 70, 'Jellyfish & Drifters': 25,
  'Starfish & Urchins': 8, 'Shellfish & Snails': 10, 'Worms & Others': 15,
};
// Research program: what a tag on each big animal pays (milestone 5).
// (These are the reference figures; liveValue and tagValue scale them so the game starts at cents.)
export const PRICE_SCALE = 0.08, TAG_SCALE = 0.4;
export const TAG = {
  14: 80, 15: 150, 23: 90, 24: 120, 25: 60, 32: 140, 33: 160, 35: 60, 36: 50, 38: 70,
  39: 400, 40: 120, 42: 100, 43: 90, 44: 140, 45: 40, 46: 300, 52: 60, 53: 250, 54: 4000,
  55: 40, 56: 40, 58: 30, 60: 40, 63: 250, 64: 120, 67: 200, 68: 40, 70: 150, 75: 600,
  76: 800, 77: 2500, 78: 600, 79: 450, 80: 120, 81: 150, 82: 500, 83: 150, 84: 1200, 85: 1800,
  86: 3000, 87: 1200, 88: 6000, 89: 900, 91: 700, 92: 200, 93: 100, 95: 150, 96: 1500,
  105: 0, 108: 20000, 109: 400, 143: 900, 148: 150, 149: 25000, 172: 0, 183: 400,
  184: 4000, 185: 300, 186: 250, 187: 1500,
};

const NEVER = new Set(['Kelp & Plants', 'Corals, Anemones & Sponges', 'Marine Mammals']);
const PROTECTED = new Set([183]); // sea turtles: tag only, never taken

// can a net / slurp gun take it at all (ignoring tool size limits)?
export function canTakeLive(sp) {
  if (NEVER.has(sp.cat) || PROTECTED.has(sp.id)) return false;
  const h = sp.v.hab;
  return h !== 'plant' && h !== 'surface-plant';
}
// swimming animals too big for any net can be tagged instead
export function isTagOnly(sp) { return TAG[sp.id] !== undefined && TAG[sp.id] > 0; }
// what the research program pays for a tag (the swordfish is the benchmark: $100)
export function tagPrice(id) { return id === 42 ? 100 : (TAG[id] || 0) * TAG_SCALE; }

// a healthy specimen of normal size; len is this individual's length
export function liveValue(sp, len = sp.len) {
  let v = LIVE[sp.id];
  if (v === undefined) v = (CAT_BASE[sp.cat] || 10) * (1 + Math.max(0, sp.dmin) / 150);
  const size = Math.min(1.4, Math.max(0.7, len / Math.max(0.01, sp.len)));
  return v * size * PRICE_SCALE;
}
// condition: 1 healthy .. 0 dead. Stressed animals sell for less; dead ones for almost nothing.
export function conditionMult(c) {
  if (c <= 0.05) return 0.1;
  return c >= 0.7 ? c : c * 0.8;
}
export function conditionName(c) {
  return c <= 0.05 ? 'dead' : c >= 0.8 ? 'healthy' : c >= 0.5 ? 'stressed' : 'weak';
}
export function specimenValue(s) {
  const sp = SPECIES_BY_ID[s.id];
  return liveValue(sp, s.len) * conditionMult(s.cond) * (s.mult || 1);
}
// fragile animals (jellies, comb jellies) take more harm from a net
export const fragile = (sp) => sp.cat === 'Jellyfish & Drifters';
