// Small math / random / noise helpers shared by every module.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoothstep = (a, b, v) => smooth(invLerp(a, b, v));
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const TAU = Math.PI * 2;

export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}

// Mulberry32 seeded PRNG
export function makeRng(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (a, b) => a + (b - a) * rng();
  rng.int = (a, b) => Math.floor(a + (b - a + 1) * rng());
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

// 1D / 2D value noise with smooth interpolation, plus fractal sums.
function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash2(i, 0, seed), b = hash2(i + 1, 0, seed);
  return lerp(a, b, smooth(f)) * 2 - 1;
}
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy) * 2 - 1;
}
export function fbm1(x, oct = 4, seed = 0) {
  let s = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += noise1(x * f, seed + i * 17) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export function fbm2(x, y, oct = 4, seed = 0) {
  let s = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += noise2(x * f, y * f, seed + i * 31) * a; n += a; a *= 0.5; f *= 2.01; }
  return s / n;
}

// Colour helpers. Colours are [r,g,b] 0..255 arrays.
export function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const rgbStr = (c, a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
export function shade(hex, k) {
  // k < 0 darken, k > 0 lighten
  const c = hexToRgb(hex);
  const t = k < 0 ? [0, 0, 0] : [255, 255, 255];
  return rgbStr(mixRgb(c, t, Math.abs(k)));
}
export function rgba(hex, a) { return rgbStr(hexToRgb(hex), a); }

// Sample a piecewise-linear table of [key, value] where value is a number or rgb array.
export function sampleTable(table, k) {
  if (k <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (k <= table[i][0]) {
      const [k0, v0] = table[i - 1], [k1, v1] = table[i];
      const t = (k - k0) / (k1 - k0);
      return Array.isArray(v0) ? mixRgb(v0, v1, t) : lerp(v0, v1, t);
    }
  }
  return table[table.length - 1][1];
}

export function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// Polygon helpers (arrays of {x,y})
export function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-9;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return [ax + dx * t, ay + dy * t];
}
