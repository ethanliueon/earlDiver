// World generation: seafloor profile, rocks/overhangs, kelp, wrecks, vents,
// sea lanterns, pickups, sapphires and the static (seafloor) creatures.
import { makeRng, fbm1, clamp, lerp, smoothstep, pointInPoly, closestOnSeg } from './util.js';
import { SPECIES, isStaticHab } from './species.js';

export const WORLD_W = 1000;
export const WORLD_D = 3000;
export const FLOOR_RES = 0.5; // metres per floor sample
export const BOAT_X = 512;
export const SPAWN = { x: 500, y: 5 };

// Fixed overall profile (x -> seafloor depth). Beach on the right, deep on the left.
const PROFILE = [
  [0, 2960], [60, 2930], [150, 2820], [230, 2450], [300, 2050], [340, 1700],
  [380, 1400], [430, 1180], [470, 1060], [520, 860], [560, 640], [585, 470],
  [596, 330], [604, 215], [640, 175], [700, 132], [760, 72], [800, 42],
  [880, 26], [920, 16], [950, 9], [972, 3], [985, -1], [1000, -3.5],
];

// Fixed sapphire hiding places: a ladder, each just beyond what the previous sapphires let a
// diver reach on one breath. None below ~260 m - deeper than that a sapphire would be useless.
// hide: 'boulder' (a rock beside it), 'grass', 'kelp', 'crevice' (rocks either side),
// 'ledge' (an overhang above it), 'wreck' (in the shadow of the hull)
const SAPPHIRES = [
  { x: 966, hide: 'boulder' },  // ~4 m, beach shallows
  { x: 928, hide: 'grass' },    // ~14 m, seagrass meadow
  { x: 858, hide: 'kelp' },     // ~25 m, among the kelp holdfasts
  { x: 808, hide: 'crevice' },  // ~40 m, the deep edge of the kelp
  { x: 752, hide: 'ledge' },    // ~75 m, the sloping shelf
  { x: 699, hide: 'wreck' },    // ~130 m, under the wreck's stern
  { x: 617, hide: 'ledge' },    // ~190 m, the cliff edge
  { x: 602, hide: 'ledge' },    // ~240 m, the cliff wall
];

export const RESOURCES = {
  clam: { name: 'Clam', desc: 'A heavy, closed clam.' },
  mussel: { name: 'Mussel', desc: 'Blue-black mussels prised from the rocks.' },
  rock: { name: 'Rock', desc: 'A dense, dark stone.' },
  kelp: { name: 'Kelp', desc: 'A long blade of giant kelp.' },
  iron: { name: 'Iron', desc: 'Corroded iron from a wreck.' },
  scale: { name: 'Fish scales', desc: 'A handful of shed scales, still catching the light.' },
  tentacle: { name: 'Squid tentacle', desc: 'Something took the rest of the squid.' },
  ink: { name: 'Ink', desc: 'An ink sac, intact.' },
  pearl: { name: 'Pearl', desc: 'Found inside a clam.' },
  glass: { name: 'Glass sponge shard', desc: 'Silica lattice from a deep glass sponge.' },
  coral: { name: 'Coral fragment', desc: 'A living piece of broken coral. It could be planted.' },
};

export function generateWorld(seed) {
  const rng = makeRng(seed);
  const W = { seed, rng };
  const n = Math.round(WORLD_W / FLOOR_RES) + 1;
  const floor = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * FLOOR_RES;
    let k = 1;
    while (k < PROFILE.length - 1 && PROFILE[k][0] < x) k++;
    const [x0, d0] = PROFILE[k - 1], [x1, d1] = PROFILE[k];
    const t = clamp((x - x0) / (x1 - x0), 0, 1);
    let d = lerp(d0, d1, t * t * (3 - 2 * t) * 0.6 + t * 0.4);
    // roughness grows with depth; large undulation + fine rubble
    const big = fbm1(x / 70, 4, seed) * clamp(d * 0.05, 1.5, 60);
    const fine = fbm1(x / 6, 3, seed + 5) * clamp(d * 0.006, 0.25, 4);
    d += big + fine;
    if (x > 975) d = Math.min(d, lerp(-1, -3.5, (x - 975) / 25)); // beach above the waterline
    floor[i] = d;
  }
  W.floor = floor;
  W.floorAt = (x) => {
    const f = clamp(x / FLOOR_RES, 0, n - 1.001);
    const i = Math.floor(f);
    return lerp(floor[i], floor[i + 1], f - i);
  };
  W.slopeAt = (x) => (W.floorAt(x + 1) - W.floorAt(x - 1)) / 2;

  // ---- Rocks: boulders on the floor and overhanging ledges on steep walls ----
  W.rocks = [];
  const blob = (cx, cy, rx, ry, rot, jag, pts = 14) => {
    const poly = [];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 1 + (rng() - 0.5) * jag;
      const px = Math.cos(a) * rx * r, py = Math.sin(a) * ry * r;
      poly.push({ x: cx + px * Math.cos(rot) - py * Math.sin(rot), y: cy + px * Math.sin(rot) + py * Math.cos(rot) });
    }
    return poly;
  };
  const roughen = (poly, seg, amp) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
      for (let k = 0; k < seg; k++) {
        const t = k / seg, j = k === 0 ? 0 : (rng() - 0.5) * 2 * amp;
        out.push({ x: a.x + (b.x - a.x) * t + (nx / nl) * j, y: a.y + (b.y - a.y) * t + (ny / nl) * j });
      }
    }
    return out;
  };
  const addRock = (poly, kind) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    W.rocks.push({ poly, kind, x0, x1, y0, y1, seed: rng() * 1000 });
  };
  for (let x = 2; x < 972; x += rng.range(5, 22)) {
    const d = W.floorAt(x);
    const s = W.slopeAt(x);
    if (x > 940 && rng() < 0.6) continue;
    const size = clamp(0.6 + d * 0.004, 0.6, 6) * rng.range(0.5, 1.8);
    addRock(roughen(blob(x, d + size * 0.25, size * rng.range(1, 2.2), size, rng.range(-0.3, 0.3) + Math.atan(s) * 0.5, 0.45, 10), 2, size * 0.12), 'boulder');
    // Overhangs on steep walls: a ledge sticking out to the left (towards open water)
    if (Math.abs(s) > 1.6 && rng() < 0.55) {
      const len = rng.range(6, 18) * clamp(d / 300, 0.6, 2.5);
      const th = rng.range(2.5, 5);
      const ax = x + 2, ay = d;
      const poly = [
        { x: ax + 3, y: ay - th * 0.6 },
        { x: ax - len * 0.35, y: ay - th * 0.9 },
        { x: ax - len * 0.8, y: ay - th * 0.4 },
        { x: ax - len, y: ay + th * 0.1 },
        { x: ax - len * 0.75, y: ay + th * 0.5 },
        { x: ax - len * 0.3, y: ay + th * 0.45 },
        { x: ax + 3, y: ay + th * 0.9 },
      ];
      for (const p of poly) { p.x += (rng() - 0.5) * 1.2; p.y += (rng() - 0.5) * 0.8; }
      addRock(roughen(poly, 4, 0.55), 'ledge');
    }
  }
  W.rockAt = (x, y, r = 0) => {
    for (const rk of W.rocks) {
      if (x < rk.x0 - r || x > rk.x1 + r || y < rk.y0 - r || y > rk.y1 + r) continue;
      if (pointInPoly(x, y, rk.poly)) return rk;
    }
    return null;
  };

  // ---- Kelp forest (cold-water band) and seagrass meadow near the beach ----
  W.kelp = [];
  for (let x = 790; x < 905; x += rng.range(0.9, 2.4)) {
    const d = W.floorAt(x);
    if (d < 6) continue;
    const h = clamp(d - rng.range(0, 3), 4, 36) * rng.range(0.8, 1.02);
    W.kelp.push({ x, base: d, h, phase: rng() * 6.28, sp: 1, harvested: false, lean: rng.range(-0.15, 0.15), species: rng() < 0.85 ? 118 : 119 });
  }
  W.inKelp = (x, y) => {
    if (x < 788 || x > 907) return false;
    // count stalks near the point that are tall enough to reach this depth
    let c = 0;
    for (const k of W.kelp) {
      if (Math.abs(k.x - x) < 2.2 && y > k.base - k.h && y < k.base) c++;
      if (c >= 2) return true;
    }
    return false;
  };
  W.underLedge = (x, y) => {
    for (const rk of W.rocks) {
      if (rk.kind !== 'ledge') continue;
      if (x > rk.x0 + 0.5 && x < rk.x1 - 0.5 && y > rk.y1 - 0.5 && y < rk.y1 + 5) return true;
    }
    return false;
  };

  // ---- Wrecks ----
  W.wrecks = [
    { x: 688, y: W.floorAt(688), len: 36, tilt: -0.08, kind: 'ship' },
    { x: 452, y: W.floorAt(452), len: 70, tilt: 0.16, kind: 'ship' },
  ];
  // ---- Hydrothermal vents in the abyss ----
  W.vents = [];
  for (let i = 0; i < 6; i++) {
    const x = rng.range(70, 210);
    W.vents.push({ x, y: W.floorAt(x), h: rng.range(4, 14), phase: rng() * 6 });
  }

  // ---- Sea lanterns: 1-2 per 500x500 m cell in open water; extra deeper ----
  W.lanterns = [];
  const addLantern = (x, y) => {
    if (y > W.floorAt(x) - 2 || y < 20) return;
    if (W.rockAt(x, y, 2)) return;
    W.lanterns.push({ x, y, charge: 1, active: 0, phase: rng() * 6, tether: rng() < 0.5 ? Math.min(W.floorAt(x) - y, 60) : 0, hue: rng.range(160, 200) });
  };
  for (let cx = 0; cx < WORLD_W; cx += 250) {
    for (let cy = 0; cy < WORLD_D; cy += 250) {
      // design: 1-2 per 500x500 (= ~0.4 per 250 cell) near the surface, rising with depth
      const depthT = smoothstep(0, 1500, cy);
      const expected = lerp(0.45, 1.6, depthT);
      let k = Math.floor(expected) + (rng() < expected % 1 ? 1 : 0);
      for (let i = 0; i < k; i++) {
        const x = cx + rng.range(10, 240);
        const fl = W.floorAt(x);
        const y = cy + rng.range(10, 240);
        if (y > fl - 3) continue; // this part of the cell is solid ground
        addLantern(x, y);
      }
    }
  }
  // Guarantee a lantern near the first cliff and in the kelp shadows
  addLantern(575, 300);
  addLantern(640, 120);

  // ---- Pickups ----
  W.pickups = [];
  const addPickup = (type, x, y, extra = {}) => W.pickups.push({ type, x, y, taken: false, phase: rng() * 6, ...extra });
  const onFloor = (x) => W.floorAt(x) - 0.25;
  for (let i = 0; i < 22; i++) {
    const x = rng.range(830, 970);
    if (W.floorAt(x) > 2) addPickup('clam', x, onFloor(x), { pearl: rng() < 0.08 });
  }
  for (let i = 0; i < 14; i++) { const x = rng.range(900, 975); if (W.floorAt(x) > 1) addPickup('mussel', x, onFloor(x)); }
  for (let i = 0; i < 28; i++) { const x = rng.range(560, 975); addPickup('rock', x, onFloor(x)); }
  for (const w of W.wrecks) {
    const cnt = w.x > 600 ? 16 : 28;
    for (let i = 0; i < cnt; i++) { const x = w.x + rng.range(-w.len * 0.8, w.len * 0.8); addPickup('iron', x, onFloor(x)); }
  }
  for (let i = 0; i < 40; i++) { const x = rng.range(440, 610); const fl = W.floorAt(x); if (fl > 200 && fl < 1000) addPickup('tentacle', x, onFloor(x)); }
  for (let i = 0; i < 45; i++) { const x = rng.range(380, 700); const y = rng.range(100, 1000); if (y < W.floorAt(x) - 4) addPickup('ink', x, y); }
  for (let i = 0; i < 60; i++) { const x = rng.range(500, 900); const y = rng.range(8, 300); if (y < W.floorAt(x) - 3) addPickup('scale', x, y); }
  for (let i = 0; i < 30; i++) { const x = rng.range(330, 600); const fl = W.floorAt(x); if (fl > 300 && fl < 1300) addPickup('glass', x, onFloor(x)); }
  // Usable items, found on the deeper seafloor
  for (let i = 0; i < 26; i++) { const x = rng.range(300, 640); const fl = W.floorAt(x); if (fl > 150 && fl < 1800) addPickup('lure', x, fl - 0.4); }
  for (let i = 0; i < 18; i++) { const x = rng.range(250, 620); const fl = W.floorAt(x); if (fl > 250 && fl < 2200) addPickup('necklace', x, fl - 0.3); }
  // Good deeds: animals caught in lost fishing nets (fixed places), and broken coral to replant
  for (const [x, an] of [[938, 'turtle'], [905, 'fish'], [872, 'turtle'], [826, 'fish'], [778, 'turtle'], [736, 'fish']]) addPickup('net', x, W.floorAt(x) - 0.7, { animal: an });
  for (let i = 0; i < 12; i++) { const x = rng.range(880, 968); addPickup('coral', x, onFloor(x)); }
  // Sapphires at fixed places
  W.sapphires = SAPPHIRES.map((sp, i) => {
    const x = sp.x, fl = W.floorAt(x);
    // keep the spot clear of generated rock, then build the fixed landmark that hides it
    W.rocks = W.rocks.filter((rk) => !(x > rk.x0 - 1.2 && x < rk.x1 + 1.2 && fl > rk.y0 - 2 && fl - 2.5 < rk.y1));
    const r2 = makeRng(seed ^ 0x51ab + i * 977); // only shapes vary; the places never do
    const boulder = (cx, size) => addRock(roughen(blob(cx, W.floorAt(cx) + size * 0.25, size * 1.5, size, 0, 0.35, 10), 2, size * 0.1), 'boulder');
    if (sp.hide === 'boulder') { boulder(x + 2.2, 1.0); }
    else if (sp.hide === 'crevice') { boulder(x - 2.4, 1.1); boulder(x + 2.6, 1.3); }
    else if (sp.hide === 'ledge') {
      const top = fl - 2.6, len = 5 + r2() * 2;
      const poly = [{ x: x + 3.5, y: top - 1.2 }, { x: x - len * 0.4, y: top - 1.4 }, { x: x - len, y: top - 0.4 }, { x: x - len * 0.9, y: top + 0.2 }, { x: x - len * 0.3, y: top + 0.3 }, { x: x + 3.5, y: fl + 1 }];
      addRock(roughen(poly, 3, 0.35), 'ledge');
    }
    // never let a landmark swallow it
    W.rocks = W.rocks.filter((rk) => !(rk.kind === 'boulder' && x > rk.x0 - 0.4 && x < rk.x1 + 0.4 && fl - 0.35 > rk.y0 - 0.4));
    return { type: 'sapphire', x, y: fl - 0.35, taken: false, phase: i, idx: i, hide: sp.hide };
  });
  for (const s of W.sapphires) W.pickups.push(s);

  // ---- Static seafloor life ----
  W.statics = [];
  const statics = SPECIES.filter((s) => isStaticHab(s.v.hab) && s.id !== 118 && s.id !== 119);
  for (let x = 1; x < 975; x += rng.range(0.6, 2.5) * clamp(W.floorAt(x) / 120, 1, 6) * (x > 880 ? 0.6 : 1)) {
    const d = W.floorAt(x);
    if (d < 0.6) continue;
    const cands = statics.filter((s) => d >= s.dmin && d <= s.dmax);
    if (!cands.length) continue;
    // weight corals, anemones, sponges and seagrass higher in the shallows so the reef reads as a reef
    let sp;
    if (d < 45 && x > 880 && rng() < 0.6) {
      const reef = cands.filter((c) => /Coral|Anemone|Sponge|Plants/.test(c.cat) && c.v.s !== 'kelp');
      sp = reef.length ? rng.pick(reef) : rng.pick(cands);
    } else sp = rng.pick(cands);
    if (W.rockAt(x, d - 0.3)) continue;
    const scale = rng.range(0.6, 1.15);
    W.statics.push({ sp, x, y: d, scale, phase: rng() * 6, flip: rng() < 0.5 ? -1 : 1 });
  }
  // Tube worm colonies around vents
  for (const v of W.vents) for (let i = 0; i < 9; i++) {
    const x = v.x + rng.range(-6, 6);
    W.statics.push({ sp: SPECIES.find((s) => s.id === 180), x, y: W.floorAt(x), scale: rng.range(0.6, 1.2), phase: rng() * 6, flip: 1 });
  }
  W.statics.sort((a, b) => a.x - b.x);
  return W;
}

// Resolve a circle against the floor and rocks; returns pushed position and contact normal.
export function collide(W, x, y, r) {
  let nx = 0, ny = 0, hit = false;
  // floor
  const fl = W.floorAt(x);
  if (y > fl - r) {
    // approximate normal from slope
    const s = W.slopeAt(x);
    const len = Math.hypot(s, 1);
    const pen = y - (fl - r);
    nx += (s / len) * 0; ny -= 1;
    y -= pen; hit = true;
  }
  // rocks (push out along nearest edge)
  for (const rk of W.rocks) {
    if (x < rk.x0 - r || x > rk.x1 + r || y < rk.y0 - r || y > rk.y1 + r) continue;
    const inside = pointInPoly(x, y, rk.poly);
    let best = 1e9, bx = 0, by = 0;
    for (let i = 0, j = rk.poly.length - 1; i < rk.poly.length; j = i++) {
      const [cx, cy] = closestOnSeg(x, y, rk.poly[j].x, rk.poly[j].y, rk.poly[i].x, rk.poly[i].y);
      const d = Math.hypot(x - cx, y - cy);
      if (d < best) { best = d; bx = cx; by = cy; }
    }
    if (inside || best < r) {
      let dx = x - bx, dy = y - by;
      const d = Math.hypot(dx, dy) || 1e-6;
      dx /= d; dy /= d;
      if (inside) { dx = -dx; dy = -dy; }
      const push = inside ? best + r : r - best;
      x += dx * push; y += dy * push; nx += dx; ny += dy; hit = true;
    }
  }
  return { x, y, hit, nx, ny };
}
