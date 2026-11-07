// World generation: seafloor profile, rocks/overhangs, kelp, wrecks, vents,
// sea lanterns, pickups, sapphires and the static (seafloor) creatures.
import { makeRng, fbm1, clamp, lerp, smoothstep, pointInPoly, closestOnSeg } from './util.js';
import { SPECIES, isStaticHab } from './species.js';
import { climateOk } from './fauna.js';
// the shallowest the game puts these deep-sea bottom animals (their recorded minimums are rare outliers)
const DEEP_FLOOR = { 130: 250, 131: 250, 132: 400, 162: 300, 170: 1000, 163: 2000, 180: 1600 };

// 5,000 m wide, down to 5,100 m in the trench's pit. The shore is on the right (east); the deep ocean and a sheer wall
// with a trench at its foot are on the left (west). The shallow half (shelf, wreck, kelp, reef,
// beach) is the original map moved 2,000 m east (EAST); everything west of the shelf edge is new.
export const WORLD_W = 5000;
export const WORLD_D = 5200;
export const EAST = 4000;
// v2: a 2,000 m wide hadal trench was opened west of the old one; everything east of it moved by SH
export const SH = 2000;
export const FLOOR_RES = 0.5; // metres per floor sample
// the Margaret: she starts 150 m from the east edge (over the kelp) and can be driven along the surface
// anywhere between BOAT_MIN and BOAT_MAX
export const BOAT_HOME = 4850, BOAT_MIN = 60, BOAT_MAX = 4945; // (v2: she can go anywhere on the surface)
export const BOAT = { x: BOAT_HOME, yaw: 0 }; // (3.0.0) yaw: 0 = bow to the left as drawn (her usual heading), PI = turned about
export const boatDock = () => BOAT.x + 8.5 * Math.cos(BOAT.yaw || 0); // the sub's cradle, which turns with her
export const BOAT_X = BOAT_HOME; // (where she starts)
export const SPAWN = { x: BOAT_HOME - 12, y: 5 };
// the anglerfish's cave: a hollow in the west wall
export const CAVE = { x: 52, y: 1800 };
// the old one who lives in it: a giant anglerfish, head to the mouth of the cave
export const ANGLER = { x: 46, y: 1802.5, len: 14 };

// Fixed overall profile (x -> seafloor depth). Beach on the right, deep on the left.
const PROFILE = [
  // the west wall: a reef cap near the surface, then a sheer drop to the trench
  [0, 25], [22, 40], [34, 900], [40, 2600], [46, 3880],
  // v2: the hadal trench at its foot, 2,000 m wide: a floor of swells and outcrops at ~4,800-4,950 m,
  // and one pit (5,100 m) that even the deepest sub can't take
  [60, 4300], [95, 4760], [180, 4870], [330, 4820], [520, 4900], [700, 4860], [880, 4930], [1040, 4950],
  [1150, 4990], [1260, 4930], [1420, 4880], [1600, 4910], [1780, 4850], [1950, 4880], [2120, 4800], [2230, 4450],
  // the old trench's eastern side, rising to the abyssal plain
  [2330, 3960], [2450, 3800], [2560, 3560], [2700, 3380], [2840, 3320],
  // a seamount: an underwater mountain rising from the plain to ~300 m
  [2930, 3150], [3000, 2400], [3060, 1300], [3110, 520], [3150, 310], [3200, 320], [3240, 600],
  [3300, 1500], [3370, 2700], [3450, 3250],
  // the abyssal plain: vents, a brine pool, nodules, a whale fall
  [3550, 3330], [3700, 3300], [3820, 3200],
  // the continental rise and slope, with a cold seep and coral mounds
  [3900, 2950], [3980, 2600], [4060, 2250], [4150, 1950], [4250, 1600], [4330, 1250],
  // a submarine canyon cut into the shelf edge
  [4380, 1150], [4420, 1500], [4450, 1560], [4475, 1250], [4500, 950],
  // the original map from here, moved 2,000 m east: the drop, the shelf, kelp, reef, beach
  [4520, 860], [4560, 640], [4585, 470], [4596, 330], [4604, 215], [4640, 175], [4700, 132],
  [4760, 72], [4800, 42], [4880, 26], [4920, 16], [4950, 9], [4972, 3], [4985, -1], [5000, -3.5],
];

// Deep sapphires: rare valuables, only below 500 m, a few per ocean at random, each tucked under a
// ledge, between boulders or beside one. They are worth a great deal and the deep notices them go.
const SAPPHIRE_COUNT = 10;
const SAPPHIRE_HIDES = ['ledge', 'crevice', 'boulder', 'ledge'];

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
  sapphire: { name: 'Deep sapphire', desc: 'A raw blue stone from the deep. Worth a fortune.' },
  glass: { name: 'Glass sponge shard', desc: 'Silica lattice from a deep glass sponge.' },
  coral: { name: 'Coral fragment', desc: 'A living piece of broken coral. It could be planted.' },
  nodule: { name: 'Manganese nodule', desc: 'A black lump of metal that grew a millimetre in a million years.' },
  bone: { name: 'Whalebone', desc: 'A rib from the whale fall, picked clean and white.' },
};
// places on the deep floor (x ranges in metres)
export const BRINE = { x0: 3730, x1: 3788 };     // a lake of brine on the abyssal plain: heavy, airless, deadly
export const WHALE_FALL = { x: 2770 };            // a dead whale on the plain, and everything that feeds on it
export const SEEP = { x: 3960 };
// (2.7.0) Dave's Haul: a diver's habitat on a terrace cut into the seamount's east flank, about 1,200 m down
export const DAVE = { x: 3278, half: 11 };                 // a cold seep on the rise: methane, mussels, tube worms
// (3.0.0) the research station: a tower on the seamount's summit (~315 m), the station ~30 m up it (~285 m)
export const STATION = { x: 3175, half: 16 };
export const PIT = { x: 1180, half: 38, y: 5100 };       // the deepest point: a pit in the hadal trench floor
export const TRENCH = { x0: 70, x1: 2220 };              // the hadal trench floor (the monster's lair is down here)
export const CANYON = { x0: 4385, x1: 4495, top: 1000 }; // the canyon below its rim, where the current runs

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
    if (x > WORLD_W - 25) d = Math.min(d, lerp(-1, -3.5, (x - (WORLD_W - 25)) / 25)); // beach above the waterline
    if (x < 30) d = Math.min(d, 25 + x * 0.5);                                         // the wall's reef cap stays shallow
    if (x > 60 && x < 2230) {                                // the hadal floor: gentler swells, never past ~4,990 m
      d = lerp(d, Math.min(d, 4985 - fine), smoothstep(60, 140, x) * (1 - smoothstep(2150, 2230, x)));
    }
    floor[i] = d;
  }
  // the pit: one narrow bowl on the trench floor, 5,100 m at the bottom (the deepest place there is)
  {
    const ic = Math.round(PIT.x / FLOOR_RES), h = Math.round(PIT.half / FLOOR_RES);
    for (let i = ic - h; i <= ic + h; i++) {
      const t = (i - ic) / h, k = Math.cos(t * Math.PI / 2) ** 1.6;
      floor[i] = Math.max(floor[i], lerp(floor[i], PIT.y, k) + fbm1(i * FLOOR_RES / 3, 2, seed + 21) * 1.5 * (1 - k));
    }
  }
  // the brine pool: a basin with a flat, still surface a little below its lower rim
  {
    const i0 = Math.round(BRINE.x0 / FLOOR_RES), i1 = Math.round(BRINE.x1 / FLOOR_RES);
    const surf = Math.max(floor[i0], floor[i1]) + 0.6;
    for (let i = i0; i <= i1; i++) {
      const t = (i - i0) / (i1 - i0);
      floor[i] = Math.max(floor[i], surf + 1 + Math.sin(Math.PI * t) * 7 + fbm1(i * FLOOR_RES / 5, 2, seed + 9) * 0.6);
    }
    W.brine = { x0: BRINE.x0 + 1.5, x1: BRINE.x1 - 1.5, y: surf };
  }
  // level beds for the whale fall (on the plain) and the seep (a terrace cut into the rise)
  for (const [cx, half] of [[WHALE_FALL.x, 16], [SEEP.x, 13], [DAVE.x, DAVE.half], [STATION.x, STATION.half]]) {
    const ic = Math.round(cx / FLOOR_RES), h = Math.round(half / FLOOR_RES), edge = Math.round(8 / FLOOR_RES);
    const level = floor[ic];
    for (let i = ic - h - edge; i <= ic + h + edge; i++) {
      const out = Math.max(0, Math.abs(i - ic) - h) / edge;          // 0 on the bed, 1 at the end of the blend
      const k = out >= 1 ? 0 : 1 - out * out * (3 - 2 * out);
      floor[i] = lerp(floor[i], level + fbm1(i * FLOOR_RES / 4, 2, seed + 13) * 0.25, k);
    }
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
  for (let x = 2; x < WORLD_W - 28; x += rng.range(5, 22)) {
    const d = W.floorAt(x);
    const s = W.slopeAt(x);
    if (x > EAST + 940 && rng() < 0.6) continue;
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
  // nothing sticks out of the brine pool
  W.rocks = W.rocks.filter((rk) => !(rk.x1 > BRINE.x0 - 2 && rk.x0 < BRINE.x1 + 2 && rk.y1 > W.brine.y - 4));
  { const sy = W.floorAt(STATION.x); W.rocks = W.rocks.filter((rk) => !(rk.x1 > STATION.x - STATION.half - 4 && rk.x0 < STATION.x + STATION.half + 4 && rk.y1 > sy - 40)); } // (3.0.0) the summit kept clear for the station
  { const dy = W.floorAt(DAVE.x); W.rocks = W.rocks.filter((rk) => !(rk.x1 > DAVE.x - DAVE.half - 4 && rk.x0 < DAVE.x + DAVE.half + 4 && rk.y1 > dy - 14)); } // (2.7.0) Dave's terrace kept clear of rock
  // the anglerfish's cave mouth: an upper and a lower lip of rock jutting from the west wall
  {
    const cx = CAVE.x, cy = CAVE.y;
    addRock(roughen([{ x: 30, y: cy - 34 }, { x: cx + 26, y: cy - 22 }, { x: cx + 30, y: cy - 15 }, { x: cx + 8, y: cy - 11 }, { x: 30, y: cy - 12 }], 4, 1.2), 'ledge');
    addRock(roughen([{ x: 30, y: cy + 12 }, { x: cx + 6, y: cy + 10 }, { x: cx + 28, y: cy + 15 }, { x: cx + 24, y: cy + 26 }, { x: 30, y: cy + 36 }], 4, 1.2), 'boulder');
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
  for (let x = EAST + 790; x < EAST + 905; x += rng.range(0.9, 2.4)) {
    const d = W.floorAt(x);
    if (d < 6) continue;
    const h = clamp(d - rng.range(0, 3), 4, 36) * rng.range(0.8, 1.02);
    W.kelp.push({ x, base: d, h, phase: rng() * 6.28, sp: 1, harvested: false, lean: rng.range(-0.15, 0.15), species: rng() < 0.85 ? 118 : 119 });
  }
  W.inKelp = (x, y) => {
    if (x < EAST + 788 || x > EAST + 907) return false;
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
    { x: EAST + 688, y: W.floorAt(EAST + 688), len: 36, tilt: -0.08, kind: 'ship' },
    { x: 4110, y: W.floorAt(4110), len: 70, tilt: 0.12, kind: 'ship' },   // on the slope, ~1,800 m
  ];
  // ---- Hydrothermal vents in the abyss ----
  W.vents = [];
  for (let i = 0; i < 7; i++) {
    const x = rng.range(3520, 3690);   // a vent field on the abyssal plain
    W.vents.push({ x, y: W.floorAt(x), h: rng.range(4, 14), phase: rng() * 6 });
  }
  // the anglerfish's cave: two great lips of rock jutting from the wall make a hollow between them
  W.cave = { x: CAVE.x, y: CAVE.y };
  W.whaleFall = { x: WHALE_FALL.x, y: W.floorAt(WHALE_FALL.x) };
  W.seep = { x: SEEP.x, y: W.floorAt(SEEP.x), phase: rng() * 6 };
  W.dave = { x: DAVE.x, y: W.floorAt(DAVE.x) }; // Dave's hut stands on its terrace; its airlock faces east, toward the boat
  W.station = { x: STATION.x, y: W.floorAt(STATION.x) }; // (3.0.0) the foot of the station's tower

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
  addLantern(EAST + 575, 300);
  addLantern(EAST + 640, 120);

  // ---- Pickups ----
  W.pickups = [];
  const addPickup = (type, x, y, extra = {}) => W.pickups.push({ type, x, y, taken: false, phase: rng() * 6, ...extra });
  const onFloor = (x) => W.floorAt(x) - 0.25;
  for (let i = 0; i < 22; i++) {
    const x = rng.range(EAST + 830, EAST + 970);
    if (W.floorAt(x) > 2) addPickup('clam', x, onFloor(x), { pearl: rng() < 0.08 });
  }
  for (let i = 0; i < 14; i++) { const x = rng.range(EAST + 900, EAST + 975); if (W.floorAt(x) > 1) addPickup('mussel', x, onFloor(x)); }
  // (v2: no more rocks, scrap iron, squid tentacles, ink sacs or fish scales to pick up: they had no use
  // but a few cents at the boat)
  // manganese nodules strewn over the abyssal plain (not in the brine)
  for (let i = 0; i < 70; i++) {
    const x = rng.pick([rng.range(2560, 2900), rng.range(3460, 3860)]);
    if (W.floorAt(x) < 3000 || (x > BRINE.x0 - 3 && x < BRINE.x1 + 3)) continue;
    addPickup('nodule', x, onFloor(x));
  }
  // the whale fall: ribs to take; the seep: clams that often hold pearls
  for (let i = 0; i < 9; i++) { const x = WHALE_FALL.x + rng.range(-9, 9); addPickup('bone', x, onFloor(x)); }
  for (let i = 0; i < 12; i++) { const x = SEEP.x + rng.range(-10, 10); addPickup('clam', x, onFloor(x), { pearl: rng() < 0.25 }); }
  for (let i = 0; i < 60; i++) { const x = rng.range(2950, 4600); const fl = W.floorAt(x); if (fl > 300 && fl < 1300) addPickup('glass', x, onFloor(x)); }
  // Usable items, found on the deeper seafloor
  // Rare finds, anywhere across the ocean (rarer than an exotic animal, commoner than a legend): a few
  // fangtooth necklaces on the seabed between 300 and 3,000 m, and a few anglerfish lures between
  // 1,500 and 4,000 m, each well apart from the others (a new scatter every run)
  const scatter = (type, n, d0, d1, lift) => {
    const placed = [];
    for (let tries = 0; placed.length < n && tries < 600; tries++) {
      const x = rng.range(60, 4900), fl = W.floorAt(x);
      if (fl < d0 || fl > d1 || placed.some((q) => Math.abs(q - x) < 120) || W.rockAt(x, fl - lift, 0.3)) continue;
      placed.push(x); addPickup(type, x, fl - lift);
    }
  };
  scatter('necklace', 6, 300, 3000, 0.3);
  scatter('lure', 6, 1500, 4000, 0.4);
  // Good deeds: animals caught in lost fishing nets (fixed places), and broken coral to replant
  for (const [x, an] of [[EAST + 938, 'turtle'], [EAST + 905, 'fish'], [EAST + 872, 'turtle'], [EAST + 826, 'fish'], [EAST + 778, 'turtle'], [EAST + 736, 'fish']]) addPickup('net', x, W.floorAt(x) - 0.7, { animal: an });
  for (let i = 0; i < 12; i++) { const x = rng.range(EAST + 880, EAST + 968); addPickup('coral', x, onFloor(x)); }
  // Sapphires: random deep spots, spread apart
  const spots = [];
  for (let tries = 0; spots.length < SAPPHIRE_COUNT && tries < 400; tries++) {
    const x = rng.range(60, EAST + 578);
    if (W.floorAt(x) < 520 || spots.some((q) => Math.abs(q.x - x) < 45)) continue;
    spots.push({ x, hide: SAPPHIRE_HIDES[spots.length % SAPPHIRE_HIDES.length] });
  }
  W.sapphires = spots.map((sp, i) => {
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
  // deep bottom life is never set out in the shallows, whatever the records' shallowest find
  W.statics = [];
  const statics = SPECIES.filter((s) => isStaticHab(s.v.hab) && s.id !== 118 && s.id !== 119);
  for (let x = 1; x < WORLD_W - 25; x += rng.range(0.6, 2.5) * clamp(W.floorAt(x) / 120, 1, 6) * (x > EAST + 880 ? 0.6 : 1)) {
    const d = W.floorAt(x);
    if (d < 0.6) continue;
    const cands = statics.filter((s) => d >= Math.max(s.dmin, DEEP_FLOOR[s.id] || 0) && d <= s.dmax && climateOk(s.id, x));
    if (!cands.length) continue;
    // weight corals, anemones, sponges and seagrass higher in the shallows so the reef reads as a reef
    let sp;
    if (d < 45 && x > EAST + 880 && rng() < 0.6) {
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
  // and at the seep
  for (let i = 0; i < 10; i++) {
    const x = SEEP.x + rng.range(-8, 8);
    W.statics.push({ sp: SPECIES.find((s) => s.id === 180), x, y: W.floorAt(x), scale: rng.range(0.5, 1), phase: rng() * 6, flip: 1 });
  }
  // coral heads: a real reef is built of them (the shallow reef by the beach, and the wall's cap)
  {
    const heads = [126, 127, 127, 133].map((id) => SPECIES.find((s) => s.id === id));
    for (const [xa, xb, n] of [[EAST + 905, EAST + 982, 34], [2, 30, 12]]) {
      for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
        const x = rng.range(xa, xb), d = W.floorAt(x), sp = rng.pick(heads);
        if (d < 1.5 || d < sp.dmin || d > sp.dmax || W.rockAt(x, d - 0.3)) continue;
        W.statics.push({ sp, x, y: d, scale: rng.range(0.75, 1.25), phase: rng() * 6, flip: rng() < 0.5 ? -1 : 1 });
        i++;
      }
    }
  }
  // host anemones on the shallow reef: every clownfish needs one to live in
  {
    const host = SPECIES.find((s) => s.id === 128);
    let have = W.statics.filter((s) => s.sp.id === 128 && s.x > EAST + 880).length;
    for (let tries = 0; have < 9 && tries < 200; tries++) {
      const x = rng.range(EAST + 905, EAST + 978), d = W.floorAt(x);
      if (d < 2 || d > 16 || W.rockAt(x, d - 0.3)) continue;
      W.statics.push({ sp: host, x, y: d, scale: rng.range(0.8, 1.15), phase: rng() * 6, flip: rng() < 0.5 ? -1 : 1 });
      have++;
    }
  }
  W.statics = W.statics.filter((s) => !(s.x > BRINE.x0 && s.x < BRINE.x1));
  W.statics = W.statics.filter((s) => !(s.x > DAVE.x - DAVE.half - 3 && s.x < DAVE.x + DAVE.half + 3)); // (2.7.0) nothing grows on Dave's terrace
  W.statics = W.statics.filter((s) => !(s.x > STATION.x - 3 && s.x < STATION.x + 3)); // (3.0.0) the tower's foot
  W.statics.sort((a, b) => a.x - b.x);
  buildHabitats(W);
  return W;
}

// ---- Habitats: the places an animal can call home ----
// Every kind of place is a list of points sorted by x: a host anemone, a coral head, a sponge, a
// patch of seagrass, a stand of kelp, a crevice at the foot of a boulder, the shade under a ledge,
// a wreck, open sand, the top of the seamount, the whale fall. Reef and bottom animals pick one of
// these as their home when they appear, and stay within their own range of it.
function buildHabitats(W) {
  const H = {};
  // a home must be open water an animal can actually reach: lift it clear of rock and bottom
  const add = (kind, x, y, extra) => {
    for (let k = 0; k < 8 && (W.rockAt(x, y, 0.15) || y > W.floorAt(x) - 0.25); k++) y -= 0.4;
    if (W.rockAt(x, y, 0.15) || y > W.floorAt(x) - 0.25) return;
    (H[kind] || (H[kind] = [])).push({ kind, x, y, ...extra });
  };
  for (const s of W.statics) {
    const id = s.sp.id, c = s.sp.cat || '';
    if (id === 128) add('anemone', s.x, s.y - 0.25);
    else if (id === 126 || id === 127) add('coral', s.x, s.y - 0.5);
    else if (id === 130 || id === 131) add('deepcoral', s.x, s.y - 0.6);
    else if (id === 132 || id === 133) add('sponge', s.x, s.y - 0.5);
    else if (id === 123 || id === 124) add('seagrass', s.x, s.y - 0.3);
    else if (/Coral|Anemone/.test(c) && s.y < 60) add('coral', s.x, s.y - 0.4);
  }
  for (const k of W.kelp) add('kelp', k.x, k.base - k.h * 0.45, { top: k.base - k.h, bottom: k.base });
  for (const rk of W.rocks) {
    if (rk.kind === 'ledge') add('ledge', (rk.x0 + rk.x1) / 2, rk.y1 + 0.6);
    else {
      // the dark gap where a boulder meets the bottom, on either side
      add('crevice', rk.x0 - 0.2, Math.min(W.floorAt(rk.x0 - 0.2), rk.y1) - 0.35);
      add('crevice', rk.x1 + 0.2, Math.min(W.floorAt(rk.x1 + 0.2), rk.y1) - 0.35);
    }
  }
  for (const w of W.wrecks) for (let k = -2; k <= 2; k++) add('wreck', w.x + k * w.len * 0.2, w.y - 2 - Math.abs(k) * 0.5);
  // open sand and mud: gentle bottom away from the reef and the kelp
  for (let x = 4; x < WORLD_W - 10; x += 7) {
    const d = W.floorAt(x);
    if (d < 2 || Math.abs(W.slopeAt(x)) > 0.7) continue;
    add('sand', x, d - 0.3);
  }
  for (let x = 3112; x < 3240; x += 8) add('seamount', x, W.floorAt(x) - 4);
  for (let k = -3; k <= 3; k++) add('whalefall', W.whaleFall.x + k * 3, W.whaleFall.y - 1.5);
  for (const v of W.vents) add('vent', v.x, v.y - 2);
  for (const kind in H) H[kind].sort((a, b) => a.x - b.x);
  W.habitats = H;
  // places of a kind within r metres of (x, y)
  W.homesNear = (kind, x, y, r) => {
    const L = H[kind]; if (!L) return [];
    let lo = 0, hi = L.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (L[m].x < x - r) lo = m + 1; else hi = m; }
    const out = [];
    for (let i = lo; i < L.length && L[i].x <= x + r; i++) if (Math.abs(L[i].y - y) <= r) out.push(L[i]);
    return out;
  };
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
