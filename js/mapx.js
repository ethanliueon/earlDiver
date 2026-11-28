// (7.8.0, owner) the first sea, shortened. Everything from the first ridge east (the shelf, the drop, the canyon, the
// boat's home, the island) keeps its place; everything west of it (the rise, the plain, the seamount, the trench, the
// west wall) is drawn closer together, each stretch by its own share, every landmark kept in its order. The sea now
// begins at X0 (the west wall), about 2.8 km from the island instead of 5 km.
// mapX turns a place in the old, long sea into the same place in the new one; positions saved before 7.8 go through
// it once (economy.js migrate)
export const X0 = 2215;
// old x -> new x, piecewise straight: the west wall, the trench, its east side, the seamount, the plain, the rise
const OLD = [0, 60, 2230, 2840, 3450, 3900, 4330];
const NEW = [X0, X0 + 60, X0 + 760, X0 + 1060, X0 + 1530, X0 + 1790, 4330];
export function mapX(x) {
  if (x >= 4330) return x;
  if (x <= 0) return X0 + x;
  let k = 1; while (k < OLD.length - 1 && OLD[k] < x) k++;
  const t = (x - OLD[k - 1]) / (OLD[k] - OLD[k - 1]);
  return NEW[k - 1] + t * (NEW[k] - NEW[k - 1]);
}
// how much a stretch of the old sea was squeezed at x (for widths that should shrink with it)
export function squeezeAt(x) {
  if (x >= 4330) return 1;
  let k = 1; while (k < OLD.length - 1 && OLD[k] < x) k++;
  return (NEW[k] - NEW[k - 1]) / (OLD[k] - OLD[k - 1]);
}
export const MAP_V = 2; // the map version a save's positions are in
