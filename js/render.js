// Scene renderer: sky, sea surface, water, terrain, life, Earl, and the light model.
// Light model: the scene is drawn in "true" colour, then multiplied by a lightmap
// (ambient that fades with depth and loses red, plus lamps and bioluminescence),
// then additive glows are layered on top.
import { eyePicture } from './hud.js';
import { X0 as SEA_X0 } from './mapx.js';
import { UPRIGHT } from './fauna.js';
import { clamp, lerp, smoothstep, sampleTable, rgbStr, TAU, fbm1, hexToRgb, mixRgb } from './util.js';
import { drawSpecies } from './creatures_draw.js';
import { SPECIES } from './species.js';
import { drawEarl, drawSub, drawBoat, drawBoatRadar, markOf, SUB_MARKS, boatRock } from './earl_draw.js';
import { drawMonster, drawMonsterLights, drawMonsterShape, drawMonsterRim, MONSTER_LEN } from './monster_draw.js';
import { sleeperState } from './sleeper_draw.js';
import { activeTool, hatchAt, NET_DROP, NET_HAUL } from './capture.js';
import { drawShipwreck, drawVentChimney, drawRockArt } from './scenery_draw.js';
import { drawDart, drawBoxTrap, drawTrapBuoy, netGeom } from './tools_draw.js';
import { drawStation, STATION_TOP } from './station_draw.js';
import { drawSailBuoy } from './buoy_draw.js';
import { drawTable, TABLE, LURE } from './oldone.js';
import { pictureOf } from './catalog.js';
const SIMPLE_SMALL = false; // (4.3.7) small animals as generic shapes (off: each is drawn as itself)
import { drawPrompt, HUDF } from './fittings.js'; // (4.3.2) the tutorial's prompt beside the fish
import { Wake } from './trail.js';
import { TRAPS, lv, statValue, gear } from './economy.js';
import { armPose } from './arm.js';
import { makeVariantSprite } from './variants.js';
import { SPECIES_BY_ID } from './species.js';
import { LEGENDARY } from './specimens.js';
import { glint, ember, ACCENT } from './scrolls.js'; // (7.4.3) the legendary sparkle, for a legendary pet
import { BOAT, WORLD_W, EAST, CAVE, ANGLER, CANYON, SAIL, WHALE_FALL, ISLE, yardX, SIGN, KEEPER, AREA2 } from './world.js';
import { bargePicture, BARGE } from './barge_draw.js';
import { LANTERN_RADIUS } from './entity.js';
import { Clouds } from './clouds.js';

const WATER_ALBEDO = [
  [0, [78, 172, 196]], [30, [44, 134, 176]], [120, [22, 86, 138]], [250, [12, 50, 88]], [500, [8, 32, 56]], [1000, [5, 20, 36]], [3000, [3, 13, 24]],
];
const LIGHT_TINT = [
  [0, [1.0, 1.0, 1.0]], [10, [0.82, 0.97, 1.0]], [40, [0.55, 0.88, 1.0]], [150, [0.38, 0.72, 1.0]], [600, [0.25, 0.55, 0.95]],
];
const FLOOR_COL = [
  [0, [196, 182, 146]], [40, [178, 168, 138]], [150, [128, 122, 104]], [600, [92, 88, 80]], [3000, [70, 68, 64]],
];
const BEAM_CALM = [214, 232, 255];
const BEAM_DREAD = [255, 96, 46];
const WATER_LIT = [60, 150, 180];
// sprite cache for full-detail creatures: one swim cycle (2.09 s covers the fish tail beat twice and
// the shark beat once) in 32 frames
// how long a fish of length len (m) is drawn: larger than life (x1.6) so they read on screen,
// with only a small boost for the tiniest so herring and mackerel still look different
// How a thing sits on the seabed. What lies on the floor (shells, mussels, starfish, urchins, sea
// cucumbers, crabs, octopus, flatfish, coral mounds...) follows the slope under it; what grows up
// (kelp, seagrass, branching corals, sea fans, sponges, tube worms) stays upright, as it does in life,
// and is set a little into the uphill side so neither edge of its base floats. The slope is taken
// across the thing's own width, so small bumps don't make it wobble.
const FISHY = new Set(['fish', 'shark', 'billfish', 'hatchet', 'angler', 'viper', 'dolphin', 'swallower', 'eel']); // (5.6.9) shapes whose far silhouette has a tail
const LIES = new Set(['abalone', 'angler', 'basketstar', 'blob', 'bobbit', 'clam', 'conch', 'crab', 'cucumber', 'fish', 'flat', 'frog', 'isopod',
  'lobster', 'mussel', 'octopus', 'oyster', 'scallop', 'seapig', 'shrimp', 'star', 'stone', 'tripod', 'urchin', 'brain', 'dumbo', 'nudibranch']);
export function seabedPose(W, x, halfW, lies) {
  const h = Math.max(0.1, halfW), a = clamp(Math.atan2(W.floorAt(x + h) - W.floorAt(x - h), 2 * h), -1.0, 1.0);
  return lies ? { rot: a, sink: 0 } : { rot: 0, sink: Math.min(h, Math.abs(Math.tan(a)) * h * 0.9) };
}
const staticPose = (W, st) => st.pose || (st.pose = seabedPose(W, st.x, Math.max(0.18, st.sp.len) * st.scale * 0.45, LIES.has(st.sp.v.s) || st.sp.v.hab === 'floor'));
// (v2 size audit: everything drawn 1.25x larger than before, 1.6 -> 2.0; real lengths still set value and slots)
// (3.1.2) how long an animal is drawn in the sea, against Earl (who, fins and all, is drawn about 1.5 m long):
// 1.2x its length, bigger than life but halfway to it (a great white about 3.5x Earl, a yellowfin about 1.4x),
// and never under about a quarter of Earl, so the smallest (prawns, firefly squid) are still seen
export const fishDrawLen = (len) => Math.max(0.46, len * 1.2 + 0.24 * Math.exp(-len * 5));
// Earl's height in metres
export const EARL_H = 1.0;
const SPRITE_PERIOD = (Math.PI * 2) / 3, SPRITE_FRAMES = 16; // (16 frames a swim cycle: half the building of 32, and it still reads smooth)
// seabed life that bends with the water (the rest is stone, shell or stiff)
const SWAY = new Set(['anemone', 'plumose', 'seagrass', 'sealettuce', 'sugarkelp', 'oarweed', 'tubeworm', 'xmastree', 'basketstar', 'seasquirt']);
const CACHE_SKIP = new Set(['jelly', 'siphonophore', 'manowar', 'oarfish', 'gulper', 'dragon', 'comb', 'eel', 'viper', 'sperm', 'orca', 'dolphin', 'sleeper']); // what's left of a beam after a few metres of seawater

export function dayCycle(t) {
  // 10 minute day: 5 day, 1 sunset, 3 night, 1 sunrise
  const c = ((t % 600) + 600) % 600;
  let light, phase;
  if (c < 300) { light = 1; phase = 'day'; }
  else if (c < 360) { light = lerp(1, 0.035, smoothstep(0, 1, (c - 300) / 60)); phase = 'sunset'; }
  else if (c < 540) { light = 0.035; phase = 'night'; }
  else { light = lerp(0.035, 1, smoothstep(0, 1, (c - 540) / 60)); phase = 'sunrise'; }
  return { light, phase, c, sun: c < 360 ? c / 360 : null, moon: c >= 330 && c < 570 ? (c - 330) / 240 : null };
}

export function ambientAt(depth, dayLight) {
  if (depth < 0) return Math.sqrt(dayLight);
  return Math.sqrt(dayLight * Math.exp(-depth / 140));
}

// how many soft layers a lamp beam is built from (more = smoother edge)
const FEATHER = 10;
// Earl's hand torch is a small dive light: well below the submersible's floodlights
const TORCH = 0.62;
// base brightness of every creature's living light (halo, the light it casts, and the organ itself)
const BIO_BRIGHT = 0.6;
// a creature's own light: a slow breathing pulse at its own rhythm, flaring when it is startled
let HUSH = 0; // 0..1: the thing below is close and hunting, and the living lights go out
function bioPulse(c, t) {
  const rate = 0.45 + (c.wob % 1) * 0.6, hush = 1 - 0.88 * HUSH;
  // a lone deep fish flashes: a dim glow, now and then a bright blink (as lanternfish signal)
  if (c.glimmer) return hush * (0.45 + 1.2 * Math.pow(Math.max(0, Math.sin(t * rate * 0.7 + c.wob)), 10)) * (c.fleeT > 0 ? 1.7 : 1);
  return hush * (0.8 + 0.2 * Math.sin(t * rate + c.wob)) * (c.fleeT > 0 ? 1.7 : 1);
}

// what the yard has done to the sub, from the profile: the hull mark (from her depth rating) and
// each upgrade's fittings, for drawSub
export const deckSurfAt = (g) => (g.surfY ? g.surfY(BOAT.x) * 0.8 : 0);
export function subLook(P, addons) {
  if (!P) return { mark: 0 };
  return {
    mark: markOf(statValue(P, 'depth')),
    engine: lv(P, 'subSpeed'), air: lv(P, 'depth') * 5, ballast: lv(P, 'ballast'), rack: statValue(P, 'airTanks'), // (the air bottles on her hull come with each new sub)
    name: P.subName || 'EARL',
    chambers: statValue(P, 'pressTanks'), chamberLv: lv(P, 'pressRating'), tank: lv(P, 'subTank'),
    reach: lv(P, 'armReach'), jaw: lv(P, 'armSize'), hyd: lv(P, 'armSpeed'),
    quiet: !!(addons || P.addons || {}).quiet, recall: !!(addons || P.addons || {}).recall, mast: false, // (2.9.2: no light mast)
  };
}

// (6.5.7) bioluminescence belongs to the dark: in the top 100 m nothing glows (krill, shallow jellies, the lanternfish
// that come up at night are seen by the lamp like anything else), except now and then a deep animal come up, which
// still carries its light
const glowOf = (o) => { const v = o.sp.v.glow; if (!v) return 0; return o.y >= 100 || (o.sp.dmin || 0) >= 150 ? v : 0; };
// (7.0.6) The whale fall: a great whale's skeleton, about 32 m, lying on its belly on a shelf of rock, painted once into
// a picture (40 px a metre) and laid in. As the real thing: a long low skull with its flat rostrum resting on the rock
// and the two great jawbones splayed out beside it; the spine sagging along the shelf, its vertebrae big at the chest
// and shrinking to the tail, a short spine standing on each; the ribs a cage, each arching down from the spine to the
// rock, near ones bright, far ones in shadow, a few snapped; a flipper's bones fanned on the rock. Every bone is
// shaded as round: a dark edge, the bone, a lit top. Stained, pitted, a white mat of bacteria at its foot, rags of
// flesh still in the ribs. glow: the same picture again, faint and added on after the light, so it is seen from afar.
let WHALE_PIC = null;
function whalePicture() {
  if (WHALE_PIC) return WHALE_PIC;
  const K = 40, Lm = 34, Hm = 8, c = document.createElement('canvas'); c.width = Lm * K; c.height = Hm * K;
  const x = c.getContext('2d'), X = (m) => (m + 1) * K, Y = (m) => (Hm - 0.6 + m) * K; // m: metres from the skull's tip; y up is negative
  let sd = 77; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  x.lineCap = 'round'; x.lineJoin = 'round';
  const bone = (path, w, far = false) => { // a round bone: dark edge, body, lit top
    x.strokeStyle = far ? '#1c1810' : '#2e271a'; x.lineWidth = w * K * 1.35; x.stroke(path);
    x.strokeStyle = far ? '#6c6450' : '#b4a882'; x.lineWidth = w * K; x.stroke(path);
    x.save(); x.translate(0, -w * K * 0.22); x.strokeStyle = far ? 'rgba(150,142,118,0.5)' : 'rgba(232,224,196,0.85)'; x.lineWidth = w * K * 0.32; x.stroke(path); x.restore();
  };
  // the mat and the stain on the rock under it
  for (let i = 0; i < 70; i++) { x.fillStyle = r() < 0.6 ? `rgba(226,224,206,${0.18 + r() * 0.2})` : `rgba(30,22,14,${0.25 + r() * 0.2})`; x.beginPath(); x.ellipse(X(1 + r() * 31), Y(-0.05 - r() * 0.15), K * (0.4 + r() * 1.2), K * (0.06 + r() * 0.08), 0, 0, Math.PI * 2); x.fill(); }
  const spY = (m) => -3.0 + 0.35 * Math.sin((m - 9) * 0.16) + Math.max(0, m - 24) * 0.24; // the spine, sagging, falling toward the tail
  // far ribs (the far side of the cage, in shadow)
  const ribs = []; for (let k = 0; k < 15; k++) ribs.push(10.2 + k * 0.95);
  for (const m of ribs) { const top = spY(m), p = new Path2D(); p.moveTo(X(m), Y(top)); p.bezierCurveTo(X(m + 1.6), Y(top - 0.9), X(m + 2.4), Y(-1.4), X(m + 1.5), Y(-0.15)); bone(p, 0.2, true); }
  // the spine: centra shrinking to the tail, each with its spine
  for (let m = 8.4; m <= 33; m += 0.62) { const sz = m < 24 ? 0.42 : 0.42 - (m - 24) * 0.035, y = spY(m);
    x.fillStyle = '#2e271a'; x.beginPath(); x.ellipse(X(m), Y(y), sz * K * 0.62, sz * K, 0, 0, Math.PI * 2); x.fill();
    const g = x.createLinearGradient(0, Y(y - sz), 0, Y(y + sz)); g.addColorStop(0, '#e2d8b8'); g.addColorStop(0.5, '#b0a47e'); g.addColorStop(1, '#5e5440');
    x.fillStyle = g; x.beginPath(); x.ellipse(X(m), Y(y), sz * K * 0.5, sz * K * 0.86, 0, 0, Math.PI * 2); x.fill();
    if (m < 30) { const p = new Path2D(); p.moveTo(X(m), Y(y - sz * 0.8)); p.lineTo(X(m - 0.25), Y(y - sz * (2 + (m < 20 ? 1.2 : 0.4)))); bone(p, Math.max(0.08, sz * 0.32)); } }
  // near ribs: the cage in front, arching down to the rock; a few snapped short
  ribs.forEach((m, k) => { const top = spY(m), snap = r() < 0.2, p = new Path2D(); p.moveTo(X(m), Y(top));
    if (snap) p.quadraticCurveTo(X(m - 1.6), Y(top + 0.6), X(m - 1.9), Y(top + 1.6)); else p.bezierCurveTo(X(m - 1.4), Y(top - 0.7), X(m - 2.6), Y(-1.6), X(m - 1.9), Y(-0.12));
    bone(p, 0.26);
    if (!snap && r() < 0.3) { x.strokeStyle = 'rgba(78,56,44,0.6)'; x.lineWidth = K * 0.07; x.beginPath(); x.moveTo(X(m - 1.6), Y(top + 1.2)); x.quadraticCurveTo(X(m - 1.2), Y(top + 2.2), X(m - 1.5), Y(top + 2.9)); x.stroke(); } });
  // the flipper: a shoulder blade, the arm, and the finger bones fanned on the rock
  { const sc = new Path2D(); sc.moveTo(X(9.8), Y(-2.6)); sc.lineTo(X(10.6), Y(-1.2)); bone(sc, 0.55); const arm = new Path2D(); arm.moveTo(X(10.6), Y(-1.2)); arm.lineTo(X(9.2), Y(-0.35)); bone(arm, 0.3);
    for (let f = 0; f < 4; f++) { const d = new Path2D(); d.moveTo(X(9.2), Y(-0.35)); d.lineTo(X(7.6 - f * 0.3), Y(-0.12 - f * 0.05)); bone(d, 0.12); } }
  // the skull: cranium, and the long flat rostrum resting on the rock
  { const sk = new Path2D(); sk.moveTo(X(9.6), Y(-3.3)); sk.bezierCurveTo(X(8.4), Y(-4.1), X(6.6), Y(-3.4), X(5.2), Y(-2.1)); sk.bezierCurveTo(X(3.2), Y(-1.2), X(1.2), Y(-0.6), X(0), Y(-0.35));
    sk.lineTo(X(0.1), Y(-0.08)); sk.bezierCurveTo(X(2.6), Y(-0.25), X(6), Y(-0.6), X(8.4), Y(-1.4)); sk.quadraticCurveTo(X(9.8), Y(-2), X(9.6), Y(-3.3)); sk.closePath();
    x.strokeStyle = '#2e271a'; x.lineWidth = K * 0.16; x.stroke(sk);
    const g = x.createLinearGradient(0, Y(-4), 0, Y(0)); g.addColorStop(0, '#e6dcbc'); g.addColorStop(0.5, '#b8ac86'); g.addColorStop(1, '#5e5440'); x.fillStyle = g; x.fill(sk);
    x.save(); x.clip(sk); for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(60,46,30,${0.12 + r() * 0.25})`; x.beginPath(); x.arc(X(r() * 9.6), Y(-0.2 - r() * 3.6), K * (0.03 + r() * 0.08), 0, Math.PI * 2); x.fill(); } x.restore();
    x.strokeStyle = 'rgba(60,46,30,0.55)'; x.lineWidth = K * 0.05; x.beginPath(); x.moveTo(X(8.6), Y(-2.9)); x.bezierCurveTo(X(6), Y(-2), X(3), Y(-0.9), X(0.4), Y(-0.3)); x.stroke(); // the rostrum's ridge
    x.fillStyle = '#0a0806'; x.beginPath(); x.ellipse(X(8.3), Y(-2.2), K * 0.5, K * 0.36, -0.3, 0, Math.PI * 2); x.fill(); } // the eye socket
  // the two jawbones: great bows, one lying on the rock, the far one splayed behind
  { const j1 = new Path2D(); j1.moveTo(X(9), Y(-1.0)); j1.quadraticCurveTo(X(4.5), Y(0.15), X(-0.6), Y(-0.9)); bone(j1, 0.36, true);
    const j2 = new Path2D(); j2.moveTo(X(9.3), Y(-0.8)); j2.quadraticCurveTo(X(5), Y(0.05), X(0.4), Y(-0.15)); bone(j2, 0.42); }
  WHALE_PIC = c; return c;
}
function drawWhaleFall(ctx, S, Sy, ppm, F, t, glow) {
  const c = whalePicture(), k = ppm / 40, x0 = S(F.x - 16) - 40 * k, y0 = Sy(F.y) - (8 - 0.6) * 40 * k;
  if (!glow) { const st = ctx.createRadialGradient(S(F.x), Sy(F.y), ppm, S(F.x), Sy(F.y), ppm * 20); st.addColorStop(0, 'rgba(18,14,10,0.5)'); st.addColorStop(1, 'rgba(18,14,10,0)'); ctx.fillStyle = st; ctx.beginPath(); ctx.ellipse(S(F.x), Sy(F.y), ppm * 20, ppm * 1.4, 0, 0, TAU); ctx.fill(); }
  ctx.drawImage(c, x0, y0, c.width * k, c.height * k);
}

// (7.6.8, owner) Siphon's change: how much of him, and how much of the squid, is drawn now
const SIPH_FO = 0.24, SIPH_FI = 0.32;
function siphMix(Q) { if (!Q) return [1, 0]; const J = Q.A.dur, t = Q.t; if (t < SIPH_FO) { const k = t / SIPH_FO; return [1 - k, k]; } if (t < SIPH_FO + J) return [0, 1]; const k = Math.min(1, (t - SIPH_FO - J) / SIPH_FI); return [k, 1 - k]; }
// (7.6.28, owner) a god ray, never a flat strip: a shaft of light made of several thin, very faint wedges of different
// widths and slants overlapping, each widening as it falls with soft sides, the whole fading in from nothing at the top and
// out to nothing below. The shape is worked out once per seed into a small grey picture; each frame it is copied onto a
// small canvas, broken along its length by slowly drifting bands (light through moving surface water) and tinted, then
// laid over the scene, scaled up and leaning as it sways
const RAY_TW = 96, RAY_TH = 192, RAY_TEX = [];
function rayTex(seed) {
  if (RAY_TEX[seed]) return RAY_TEX[seed];
  let sd = seed * 7919 + 13; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const n = 9 + Math.floor(rnd() * 4), W = [];
  // fanned from a narrow source: each wedge leaves near the middle at the top and leans out its own way; a few broad faint
  // ones make the body, the rest thin and a little brighter, so single rays can be told apart inside it
  for (let i = 0; i < n; i++) { const thin = i >= 3; W.push({ cx: 0.5 + (rnd() - 0.5) * 0.08, dx: (rnd() - 0.5) * (thin ? 0.8 : 0.3), top: 0.008 + rnd() * 0.025, bot: thin ? 0.025 + rnd() * 0.07 : 0.18 + rnd() * 0.2, a: thin ? 0.08 + rnd() * 0.12 : 0.05 + rnd() * 0.05, y0: rnd() * 0.1, y1: 0.5 + rnd() * 0.5 }); }
  const c = document.createElement('canvas'); c.width = RAY_TW; c.height = RAY_TH; const x = c.getContext('2d'), d = x.createImageData(RAY_TW, RAY_TH), A = d.data;
  for (let py = 0; py < RAY_TH; py++) { const v = py / (RAY_TH - 1);
    for (let px = 0; px < RAY_TW; px++) { const u = px / (RAY_TW - 1); let sum = 0;
      for (const w of W) { if (v < w.y0 || v > w.y1) continue; const k = (v - w.y0) / (w.y1 - w.y0), hw = w.top + (w.bot - w.top) * k, cx = w.cx + w.dx * k, q = 1 - Math.abs(u - cx) / hw; if (q <= 0) continue;
        const along = Math.min(1, k / 0.18) * Math.pow(1 - k, 1.3); sum += w.a * q * q * (3 - 2 * q) * along; }
      const o = (py * RAY_TW + px) * 4; A[o] = A[o + 1] = A[o + 2] = 255; A[o + 3] = Math.min(255, Math.round(sum * 255 * 2.2)); } }
  x.putImageData(d, 0, 0); return (RAY_TEX[seed] = c);
}
function godRay(ctx, rc, x, y, len, w, tilt, col, a, t, seed) {
  if (a <= 0.002) return; const tex = rayTex(seed), bx = rc.getContext('2d');
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'copy'; bx.globalAlpha = 1; bx.drawImage(tex, 0, 0);
  // the drifting bands: a vertical mask, bright and dim in turn, sliding slowly down and breathing
  bx.globalCompositeOperation = 'destination-in'; const bg = bx.createLinearGradient(0, 0, 0, RAY_TH), ph = (t * 0.07 + seed * 0.31) % 1;
  for (let i = 0; i <= 12; i++) { const v = i / 12, b = 0.55 + 0.45 * Math.sin((v - ph) * Math.PI * 2 * 3.2 + seed) * Math.sin((v + ph * 0.6) * Math.PI * 2 * 1.3 + 1.7); bg.addColorStop(v, `rgba(0,0,0,${Math.max(0.15, Math.min(1, b)).toFixed(3)})`); }
  bx.fillStyle = bg; bx.fillRect(0, 0, RAY_TW, RAY_TH);
  bx.globalCompositeOperation = 'source-in'; bx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; bx.fillRect(0, 0, RAY_TW, RAY_TH);
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(rc, -w / 2, 0, w, len); ctx.restore();
}
export class Renderer {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.lc = document.createElement('canvas'); this.lctx = this.lc.getContext('2d');
    this.gc = document.createElement('canvas'); this.gctx = this.gc.getContext('2d'); // ghost buffer
    this.clouds = new Clouds();
    this.viewW = 30; this.cam = { x: BOAT.x - 7, y: 5.5, w: 30, h: 17, zoom: 1 }; // start on the boat, not panning in from afar
    this.stars = Array.from({ length: 140 }, (_, i) => [((i * 7919) % 1000) / 1000, ((i * 104729) % 1000) / 1000 * 0.6, ((i * 31) % 10) / 10]);
  }
  // quality (0.5..1) scales the internal resolution; the canvas is stretched to the window by CSS.
  // It is lowered automatically when frames run slow and raised again when there is headroom.
  resize() {
    if (this.quality === undefined) this.quality = 1;
    // at most 1.25x the screen: sharp, without drawing 1.5x the pixels; (5.3) on a phone or tablet 1x: its screen is
    // small and dense, and the fill it saves is most of a frame
    // (5.4) asked once, not every frame (matchMedia each frame cost a little on a phone); a phone's page is laid out
    // wider than its screen (index.html), so the picture is sized from the real screen: one pixel a point
    if (this.coarse === undefined) this.coarse = true; // (7.4.13) phone-only
    const coarse = this.coarse, fk = window.__fingerK || 1;
    const dpr = (coarse ? 1 / fk : Math.min(window.devicePixelRatio || 1, 1.25)) * this.quality;
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) {
      this.c.width = w; this.c.height = h;
      // (the light's size is set where it is built: half, or a quarter in lite mode)
      this.gc.width = Math.ceil(w / 2); this.gc.height = Math.ceil(h / 2);
    }
  }
  // (5.0) a photograph: the last frame drawn, cut around where the camera pointed, as a small JPEG. A shaky
  // exposure comes out blurred, as it would
  snapshot(frame, blur = 0) {
    try {
      const cam = this.cam, ppm = cam.ppm, W = this.W, H = this.H;
      const cx = (frame.x - cam.x) * ppm + W / 2, cy = (frame.y - cam.y) * ppm + H / 2;
      const cwM = clamp((fishDrawLen(frame.len) * 1.9 + 0.45), 1.1, 8), cw = cwM * ppm, ch = cw * 2 / 3, OW = 480, OH = 320;
      const o = document.createElement('canvas'); o.width = OW; o.height = OH;
      const x = o.getContext('2d');
      x.fillStyle = '#0a1418'; x.fillRect(0, 0, OW, OH); x.imageSmoothingQuality = 'high';
      // the water behind, from the screen, a little soft (as a lens focused on the animal sees it)...
      x.filter = `blur(${(3 + blur * 4).toFixed(1)}px) contrast(1.06) saturate(1.1)`;
      x.drawImage(this.c, cx - cw / 2, cy - ch / 2, cw, ch, 0, 0, OW, OH);
      x.filter = 'none';
      // ...and the animal itself drawn again at the picture's own size, sharp (soft only if the exposure shook),
      // dimmed to the light it was in
      const S2 = frame.sub;
      if (S2) {
        const k = OW / cwM, Ld = fishDrawLen(S2.len) * k, lit = S2.flash ? 1 : clamp(Math.max(1 - S2.y / 300, this.litAt(S2.x, S2.y)), 0.2, 1);
        x.save(); x.translate(OW / 2 + (S2.x - frame.x) * k, OH / 2 + (S2.y - frame.y) * k);
        if (S2.dir > 0) x.scale(-1, 1);
        x.rotate(-S2.tilt);
        const fl = [blur > 0.25 ? `blur(${(blur * 3).toFixed(1)}px)` : '', lit < 0.98 ? `brightness(${lit.toFixed(2)})` : ''].filter(Boolean).join(' ');
        if (fl) x.filter = fl;
        try { if (S2.variant) this.drawVariant(x, S2.sp, S2.variant, Ld, S2.phase); else drawSpecies(x, S2.sp, Ld, S2.phase, S2.still ? 0 : 1, 0); } catch (e) { /* the water alone, then */ }
        x.restore();
      }
      const v = x.createRadialGradient(OW / 2, OH / 2, OH * 0.3, OW / 2, OH / 2, OW * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)');
      x.fillStyle = v; x.fillRect(0, 0, OW, OH);
      // (5.10.11) developed like film: the colour almost gone, a warm tone, a little contrast, and grain
      const f = document.createElement('canvas'); f.width = OW; f.height = OH; const fx = f.getContext('2d');
      fx.filter = 'grayscale(0.82) sepia(0.28) contrast(1.12) brightness(0.96)'; fx.drawImage(o, 0, 0); fx.filter = 'none';
      const gr = fx.getImageData(0, 0, OW, OH), d = gr.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; } fx.putImageData(gr, 0, 0);
      return f.toDataURL('image/jpeg', 0.84);
    } catch (e) { return null; }
  }
  get W() { return this.c.width; }
  get H() { return this.c.height; }

  updateCamera(g, dt) {
    const e = g.earl;
    // (2.3.1) a little closer in the shallows, where Earl works by hand (22 m across above 40 m, 26 m by
    // 120 m), and in the sub in the deep, where the animals are small lights (46 m across near the surface,
    // 38 m below 400 m)
    const dv = clamp((e.y - 40) / 80, 0, 1), ds = clamp((e.y - 150) / 250, 0, 1);
    const targetView = g.debugView || (g.mode === 'menu' ? 40 : g.helm ? 36 : (e.inSub ? lerp(46, 38, ds) : lerp(22, 26, dv)) * (this.zoomMul || 1) * (this.aimZoom || 1) * (g.lookZoom || 1)); /* (7.6.5) Lookout draws the view out */ /* (5.16.0) Dash's aim opens the view by its tier */ // (3.0.0) only the wheel changes the view; on deck it is the same as in the water
    const lk = g.legendK || 0; // (4.9.0) the legendary moment: the view leans in on it, about a tenth, and back
    // (7.6.66, owner) the view eases to where it should be (the zoom on entering, the skills' zooms: kept, the owner likes
    // them); it stops when it arrives instead of creeping on, and the scale it is heading for is known (zoomTarget), so the
    // pictures painted at the screen's scale are painted once at that and scaled smoothly while the camera gets there
    const wantV = targetView * (1 - 0.1 * lk); this.viewW = lerp(this.viewW, wantV, 1 - Math.exp(-dt * 1.2)); this.zoomTarget = this.W / wantV;
    if (Math.abs(this.viewW - wantV) < 0.01) this.viewW = wantV;
    // (7.4.0, owner) home on the autopilot: the view eases in and back out once, over a second and a half
    const hf = g.homeFx, hk = hf && hf.t < 1.5 ? Math.sin(Math.PI * hf.t / 1.5) : 0;
    const ppm = this.W / (this.viewW * (1 - 0.08 * hk));
    const cam = this.cam;
    cam.w = this.viewW; cam.h = this.H / ppm; cam.ppm = ppm;
    g.viewBox = [cam.x - cam.w / 2, cam.x + cam.w / 2, cam.y - cam.h / 2, cam.y + cam.h / 2]; // what is on screen, in metres (the monster only reacts to a lamp it can be seen in)
    // (7.6.25, owner) the look-ahead follows his speed smoothed over about half a second, with a small dead zone: taken raw,
    // the speed's frame-to-frame wobble (the swell, a nudge off the hull) shook the whole view, so the boat and the sub
    // seemed to jiggle and the marine snow to jump
    { const LV = this.lookV || (this.lookV = { x: 0, y: 0 }), a = 1 - Math.exp(-dt * 2.2), dz = (v) => (Math.abs(v) < 0.25 ? 0 : v - Math.sign(v) * 0.25); LV.x += (dz(e.vx || 0) - LV.x) * a; LV.y += (dz(e.vy || 0) - LV.y) * a; }
    // (7.6.26, owner) fast, he stays well inside the screen: the look-ahead eases off toward a fifth of the view (never a
    // straight multiple of his speed), and the camera is never left more than a quarter of the view from him
    const capX = cam.w * 0.2, capY = cam.h * 0.16, lookX = capX * Math.tanh(this.lookV.x * 0.9 / capX), lookY = capY * Math.tanh(this.lookV.y * 0.6 / capY);
    let tx = e.x + lookX, ty = e.y + lookY;
    ty = Math.max(ty, -cam.h * 0.18); // let a little sky show near the surface
    // (5.7.0) the title: the camera starts at the boat and sinks slowly past her keel into the dark, over a minute
    if (g.mode === 'menu') { const T = g.time - (g.menuT0 ?? g.time), k = smoothstep(6, 62, T); tx = BOAT.x - 7 + Math.sin(g.time * 0.05) * 3 + k * 10; ty = lerp(5.5, 78, k); }
    if (g.helm) { tx = BOAT.x + 3 * Math.cos(BOAT.yaw || 0) + clamp(g.boatV || 0, -5, 5) * 1.6; ty = -2.5; } // at the wheel: the whole Margaret and the sub in her cradle, looking a little ahead the way she goes
    if (lk > 0 && g.legend && g.legend.c) { const q = 0.35 * lk; tx = lerp(tx, g.legend.c.x, q); ty = lerp(ty, g.legend.c.y, q); this.legendAt = g.legend.c; }
    // a jump (new dive, respawn) cuts straight there instead of sweeping across the map
    if (Math.hypot(cam.x - tx, cam.y - ty) > 80) { cam.x = tx; cam.y = ty; }
    const k = 1 - Math.exp(-dt * (g.mode === 'menu' ? 0.6 : 3));
    cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k);
    if (g.mode === 'play' && !g.helm && !(lk > 0)) { const mX = cam.w * 0.25, mY = cam.h * 0.25; cam.x = clamp(cam.x, e.x - mX, e.x + mX); cam.y = clamp(cam.y, Math.max(e.y, -1e9) - mY, e.y + mY); } // (7.6.26)
    cam.x = clamp(cam.x, SEA_X0 + cam.w / 2 - 20, WORLD_W - cam.w / 2 + 25);
  }

  render(g) {
    this.frameNo = (this.frameNo || 0) + 1;
    HUSH = (g.fx && g.fx.hush) || 0;
    const ctx = this.ctx, W = this.W, H = this.H, cam = this.cam, ppm = cam.ppm;
    const t = g.time;
    const fx = g.fx; // dread/disorientation state
    const day = g.day;
    const dayEff = g.dayEff;
    const S = (x) => (x - cam.x) * ppm + W / 2;
    const Sy = (y) => (y - cam.y) * ppm + H / 2;
    this.S = S; this.Sy = Sy;
    const x0 = cam.x - cam.w / 2 - 2, x1 = cam.x + cam.w / 2 + 2;
    const y0 = cam.y - cam.h / 2 - 2, y1 = cam.y + cam.h / 2 + 2;
    const inView = (x, y, r = 3) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
    // In the deep, what no light reaches is black: it is not drawn at all. The lights are last
    // frame's (lamps, glows, lanterns...), with a margin for anything that moved since.
    const darkAmb = 0.015 / Math.max(0.05, 1 - (fx.darken || 0));
    const pLamps = this.lamps || [], pR = this.visR || [];
    const visible = (wx, wy, R) => {
      if (ambientAt(wy, dayEff) > darkAmb) return true;
      const sx = S(wx), sy = Sy(wy), Rp = (R + 3) * ppm;
      for (let i = 0; i < pR.length; i += 3) { const dx = sx - pR[i], dy = sy - pR[i + 1]; if (dx * dx + dy * dy < (pR[i + 2] + Rp) ** 2) return true; }
      for (const L of pLamps) {
        const dx = sx - L.x, dy = sy - L.y, d = Math.hypot(dx, dy);
        if (L.r) { if (d < L.r + Rp) return true; continue; }
        if (d > L.range + Rp) continue;
        if (d < Rp) return true;
        let da = Math.abs(Math.atan2(dy, dx) - L.ang) % TAU; if (da > Math.PI) da = TAU - da;
        if (da < L.spread * 2 + Math.asin(Math.min(1, Rp / d))) return true;
      }
      return false;
    };
    const waveAmp = 0.12 + g.waveBoost * 1.6;
    const surfY = (x) => Math.sin(x * 0.21 + t * 1.25) * waveAmp * 0.6 + Math.sin(x * 0.53 - t * 1.9) * waveAmp * 0.3 + Math.sin(x * 0.07 + t * 0.6) * waveAmp * 0.5;
    g.surfY = surfY;

    ctx.save();
    // ---- disorientation transform ----
    // (7.1.0) Composure: the shaking and the disorientation softened, on a log curve (I 15 % .. IV 80 % less)
    const cLv = Math.min(4, (g.earl && g.earl.composure) || 0), calm = cLv ? 1 - (0.15 + 0.65 * Math.log(cLv) / Math.log(4)) : 1;
    const dis = fx.disorient * calm, shk = fx.shake * calm;
    if (dis > 0 || shk > 0) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.sin(t * 0.7) * 0.03 * dis + Math.sin(t * 1.9) * 0.012 * dis);
      const z = 1 + Math.sin(t * 0.9) * 0.025 * dis;
      ctx.scale(z, z);
      // a jolt (random jitter) plus, when disoriented, a slow uneasy lurch of the whole view
      const lx = fbm1(t * 1.4, 2, 7) * dis * ppm * 0.5, ly = fbm1(t * 1.1 + 40, 2, 11) * dis * ppm * 0.35;
      ctx.translate(-W / 2 + lx + (Math.random() - 0.5) * shk * ppm * 0.4, -H / 2 + ly + (Math.random() - 0.5) * shk * ppm * 0.4);
    }

    // ================= SKY =================
    const horizon = Sy(0);
    if (horizon > -50) this.drawSkyCached(g, horizon, dayEff, day);
    // (the aquarium is aboard the Margaret now: nothing on the shore)

    // ================= WATER =================
    const topY = Math.max(0, horizon - waveAmp * ppm * 1.5);
    if (topY < H) {
      const wg = ctx.createLinearGradient(0, topY, 0, H);
      const dTop = Math.max(0, cam.y - cam.h / 2), dBot = cam.y + cam.h / 2;
      for (let i = 0; i <= 4; i++) {
        const d = lerp(dTop, dBot, i / 4);
        wg.addColorStop(i / 4, rgbStr(sampleTable(WATER_ALBEDO, d)));
      }
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(-10, H + 10);
      for (let sx = -10; sx <= W + 20; sx += 16) ctx.lineTo(sx, Sy(surfY(cam.x + (sx - W / 2) / ppm)));
      ctx.lineTo(W + 20, H + 10); ctx.closePath(); ctx.fill();
      // the surface layer picks up the colour of the sky: rose and gold at sunset
      const ss = this.sunset || 0;
      if (ss > 0.03 && horizon > -40 && horizon < H) {
        const rg = ctx.createLinearGradient(0, horizon, 0, horizon + ppm * 12);
        rg.addColorStop(0, `rgba(240,160,120,${(0.6 * ss).toFixed(3)})`); rg.addColorStop(0.3, `rgba(200,120,130,${(0.32 * ss).toFixed(3)})`); rg.addColorStop(1, 'rgba(110,80,120,0)');
        // only the water: follow the wave line so nothing spills into the sky
        ctx.save(); ctx.beginPath(); ctx.moveTo(-10, horizon + ppm * 14);
        for (let sx = -10; sx <= W + 20; sx += 16) ctx.lineTo(sx, Sy(surfY(cam.x + (sx - W / 2) / ppm)));
        ctx.lineTo(W + 20, horizon + ppm * 14); ctx.closePath(); ctx.clip();
        ctx.fillStyle = rg; ctx.fillRect(0, horizon - ppm * 2, W, ppm * 16);
        ctx.restore();
        // a path of glitter below the low sun
        if (this.sunX !== undefined) {
          for (let k = 0; k < 40; k++) {
            const h1 = Math.abs(Math.sin(k * 12.9898) * 43758.5) % 1, h2 = Math.abs(Math.sin(k * 78.233) * 12345.6) % 1;
            const tw = Math.max(0, Math.sin(t * (2 + h1 * 3) + k * 1.7));
            if (tw < 0.3) continue;
            const yy = horizon + ppm * (0.2 + h2 * h2 * 3.5);
            const spread = 40 + (yy - horizon) * 0.9;
            const xx = this.sunX + (h1 - 0.5) * 2 * spread;
            ctx.fillStyle = `rgba(255,214,160,${(0.6 * tw * ss * (1 - h2 * 0.7)).toFixed(3)})`;
            ctx.fillRect(xx, yy, ppm * (0.4 + h1 * 0.9), Math.max(1, ppm * 0.05));
          }
        }
      }
    }
    // slow murk: soft clouds of silt and plankton hanging in the water, drifting past slower than
    // the foreground (they are farther off), so the water is never one flat colour
    if (topY < H) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, Math.max(0, topY + ppm), W, H); ctx.clip();
      { const o = this.drift('murk', cam, ppm, 0.55); this.texture(ctx, 'murk', 70, 0.28 + 0.12 * smoothstep(20, 400, cam.y), 'soft-light', W / 2 - o.x + this.flow('murk', t, ppm) * 0.25, H / 2 - o.y); } // (6.5.1) moved by how far the camera moved, not its place times the zoom
      ctx.restore();
    }
    // distant parallax silhouettes (slope / cliffs far behind)
    this.drawFar(g, S, Sy, dayEff);
    // something very large, very far away
    if (g.farShadow && g.farShadow.fade > 0) {
      // a real place in the water: drawn where it is, about 30 m long, dim and soft
      const f = g.farShadow;
      const len = 70 * ppm, a = 0.26 * f.fade;
      // drawn small and scaled up: that is the blur, at almost no cost
      const sc = this.shadowC || (this.shadowC = document.createElement('canvas'));
      const sw = 64, sh = 32;
      if (sc.width !== sw) { sc.width = sw; sc.height = sh; }
      const sctx = sc.getContext('2d');
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, sw, sh);
      sctx.translate(sw * 0.42, sh * 0.45); sctx.scale(f.dir, 1);
      drawMonsterShape(sctx, sw * 0.5, t * 0.5, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sc, S(f.x) - len * 0.68, Sy(f.y) - len * 0.36, len * 1.6, len * 0.8);
      ctx.restore();
    }

    // painted kelp forests far behind (baked once, high detail, gently swaying)
    if (!this.phone) this.drawKelpBackdrop(g, ppm, t); // (5.3.2) the far painted kelp: not on a phone
    // ================= TERRAIN & STRUCTURES =================
    for (const w of g.world.wrecks) if (Math.abs(w.x - cam.x) < cam.w / 2 + w.len && visible(w.x, w.y, w.len * 0.6)) this.drawWreck(ctx, w, S, Sy, ppm);
    if (!(this.skip && this.skip.kelp)) this.drawKelp(g, S, Sy, ppm, 0, x0, x1);
    for (const v of g.world.vents) if (inView(v.x, v.y, 30)) this.drawVent(ctx, v, S, Sy, ppm, t);
    this.drawFloorCached(g, S, Sy, ppm);
    this.drawFloorLife(g, ctx, S, Sy, ppm, x0, x1, t);
    if (x1 > ISLE.x0 - 10) this.drawIsland(g, ctx, S, Sy, ppm, t, dayEff); // (7.4.17)
    { const L = g.world.lip; if (L && x1 > L.x0 && x0 < L.x1 && y1 > L.y0 && y0 < L.y1) { ctx.save(); ctx.beginPath(); L.poly.forEach((p, i) => (i ? ctx.lineTo(S(p.x), Sy(p.y)) : ctx.moveTo(S(p.x), Sy(p.y)))); ctx.closePath(); ctx.clip(); this.paintWallSeabed(ctx, S, Sy, ppm, L.x0 - 1, L.x1 + 1, L.y0 - 1, L.y1, true); ctx.restore(); } } // (7.8.1) the wall's overhanging lip: the same seabed as the wall
    if (x1 > SIGN.x - 6 && x0 < KEEPER.x + 6) this.drawEdgeKeeper(g, ctx, S, Sy, ppm, t); // (7.8.0)
    for (const rk of g.world.rocks) if (rk.kind !== 'oldone' && !rk.hidden && rk.x1 > x0 && rk.x0 < x1 && rk.y1 > y0 && rk.y0 < y1 && visible((rk.x0 + rk.x1) / 2, (rk.y0 + rk.y1) / 2, Math.max(rk.x1 - rk.x0, rk.y1 - rk.y0) * 0.6)) this.drawRock(ctx, rk, S, Sy, ppm);
    this.drawDeepPlaces(g, ctx, S, Sy, ppm, t, inView);
    // statics on the floor
    const glowPts = [];
    // Seabed life and animals are drawn straight onto the scene with the water's tint built into
    // their stored pictures (one per depth band). Only what is still drawn live (rare forms, jellies,
    // eels, the great whales...) goes through a layer, and only when one is on screen.
    let fl = null;
    const layer = () => fl || (fl = this.layerBegin(ctx));
    // the still seabed life of the lit shallows (corals, sponges, shells: nothing that sways, glows or
    // is a rare form) is baked into one picture per 16 m stretch and drawn as a handful of images
    const bakedS = this.drawStaticChunks(g, ctx, S, Sy, ppm, x0, x1, y0, y1);
    for (const s of g.world.statics) {
      if (s.x < x0 - 3 || s.x > x1 + 3 || s.y < y0 - 6 || s.y > y1 + 6) continue;
      if (bakedS.has(s)) continue;
      if (!glowOf(s) && !s.variant && !visible(s.x, s.y, Math.max(0.18, s.sp.len) * s.scale)) continue;
      const L = Math.max(0.18, s.sp.len) * s.scale * ppm;
      const sl = s.variant ? layer() : ctx;
      if (s.variant) this.lgrow(S(s.x), Sy(s.y) - L * 0.5, L * 1.3);
      const pose = staticPose(g.world, s);
      sl.save(); sl.translate(S(s.x), Sy(s.y) + pose.sink * ppm); sl.rotate(pose.rot); sl.scale(s.flip, 1);
      const r = s.variant ? this.drawVariant(sl, s.sp, s.variant, L, t * 0.3 + s.phase) : this.drawStatic(sl, s, L, t, this.veilFor(s.y));
      sl.restore();
      if (s.variant === 'crimson') glowPts.push([S(s.x), Sy(s.y) - L * 0.3, '#ff3018', Math.max(ppm * 0.6, L * 0.6), 1]);
      if (r && glowOf(s)) glowPts.push([S(s.x), Sy(s.y), glowOf(s), L]);
    }
    // ---- fauna ----
    // Fish are drawn nose at -x, so a fish heading right (+x) is mirrored, and the tilt is negated
    // so the nose follows the direction of travel (a fish swimming down points down).
    // Small fish are batched per species: one path for all their backs, one for all their bellies,
    // one for the silver flashes - a whole school costs three draw calls.
    const baseM = ctx.getTransform();
    this.rimSun = this.lite || cam.y + cam.h / 2 <= 0 ? 0 : clamp(1 - Math.max(0, cam.y) / 260, 0.25, 1) * (0.55 + 0.45 * (g.dayEff || 0));
    const rbox = [1e9, 1e9, -1e9, -1e9]; // animals drawn live (not from baked frames) get the rim the old way
    const batches = new Map(), flatB = new Map();
    let glowSkip = 0;
    // (7.6.6, owner) Cast waiting for its tap: every fish its net can take, within its throw, lit from behind in the long
    // shape of its own body (a soft bone light along it, breathing; never a ring round it)
    if (g.castAim && g.mode === 'play') { const A = g.castAim.A, e = g.earl, q = 0.7 + 0.3 * Math.sin(t * 3); ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const c of g.fauna.list) { if (c.dead || c.pet || (c.len || 0) > 2 || Math.hypot(c.x - e.x, c.y - e.y) > A.cast.range + A.cast.r || !inView(c.x, c.y, c.len)) continue;
        const Ld = fishDrawLen(c.len) * ppm, hh = Math.max(3, Ld * Math.min(0.32, (c.sp.v.h || 0.3) * 0.6 + 0.06)), rot = c.dir > 0 ? 0 : Math.PI, x = S(c.x), y = Sy(c.y);
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot + clamp(Math.atan2(c.vy || 0, Math.abs(c.vx || 0) + 0.2), -0.5, 0.5) * (c.dir > 0 ? 1 : -1)); ctx.scale(Math.max(4, Ld * 0.62), hh * 1.9);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(236,228,204,${(0.42 * q).toFixed(3)})`); gr.addColorStop(0.6, `rgba(236,228,204,${(0.16 * q).toFixed(3)})`); gr.addColorStop(1, 'rgba(236,228,204,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.restore(); }
    for (const c of g.fauna.list) {
      if (!inView(c.x, c.y, c.len)) continue;
      if (LEGENDARY.has(c.sp.id) && !c.dead) { // (4.16.5) a legend leaves a trail of small glowing bubbles that rise, twinkle and fade
        const tr = c.trail || (c.trail = []), dir = c.dir || (c.vx >= 0 ? 1 : -1), Lm = fishDrawLen(c.len);
        if (!c.trailAt || t - c.trailAt > 0.09) { c.trailAt = t; tr.push({ x: c.x - dir * Lm * (0.38 + Math.random() * 0.1), y: c.y + (Math.random() - 0.5) * Lm * 0.07, t0: t, r: 0.012 + Math.random() * 0.02, sway: Math.random() * 6.28 }); } // (6.3.0) tiny, close behind the tail
        while (tr.length && t - tr[0].t0 > 2.4) tr.shift();
        for (const b of tr) { const age = (t - b.t0) / 2.4, a = Math.sin(Math.PI * Math.min(1, age * 1.4)) * (1 - age) * (0.75 + 0.25 * Math.sin(t * 9 + b.sway));
          const bx = S(b.x + Math.sin(t * 2 + b.sway) * 0.04), by = Sy(b.y - age * 0.7), rr = Math.max(0.7, (b.r + age * 0.01) * ppm);
          glowPts.push([bx, by, '#ffe6a8', rr * 2.2, a * 1.5, Math.max(0.6, rr * 0.6)]); } // (6.3.0) small sharp points, not wide orbs
      }
      if (c.petLeg && !c.dead) { // (7.4.3, owner) a legendary pet: a soft warm light round it, breathing, and glints that come and go along its body
        const Lp = fishDrawLen(c.len), br = 0.5 + 0.5 * Math.sin(t * 1.4 + (c.wob || 0)), dir = c.dir || (c.vx >= 0 ? 1 : -1);
        const my = !!c.petMyth; // (7.4.14, owner) a mythical pet (the giants): a stronger ember glow, more glints, and embers rising off it
        glowPts.push([S(c.x), Sy(c.y), my ? '#ffb08a' : '#ffe2a0', Math.max(ppm * 1.1, Lp * ppm * (my ? 1.05 : 0.85)), (my ? 0.42 : 0.32) + 0.18 * br]);
        // drawn straight onto the scene too (behind the animal), so it shows in daylit water where the light map adds little
        { const hx = S(c.x), hy = Sy(c.y), hr = Lp * ppm * 0.62; ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.42); // an oval glow that fades to nothing at its edge (a round gradient cut to an oval showed a hard rim)
          const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, hr); const gc0 = my ? '255,150,110' : '255,226,160', gc1 = my ? '224,96,60' : '240,200,130'; hg.addColorStop(0, `rgba(${gc0},${((my ? 0.18 : 0.13) + 0.06 * br).toFixed(3)})`); hg.addColorStop(0.45, `rgba(${gc1},${((my ? 0.08 : 0.05) + 0.025 * br).toFixed(3)})`); hg.addColorStop(1, `rgba(${gc1},0)`);
          ctx.fillStyle = hg; ctx.fillRect(-hr, -hr, hr * 2, hr * 2); ctx.restore();
          const nG = my ? 13 : 7;
          for (let k = 0; k < nG; k++) { const ph = (t * 0.4 + k * 0.149) % 1, a = Math.sin(Math.PI * ph) * (0.65 + 0.35 * Math.sin(t * 9 + k * 3)), u = (k / (nG - 1) - 0.5) * 0.85;
            glint(ctx, S(c.x + dir * u * Lp), Sy(c.y + Math.sin(k * 2.1 + t * 0.6) * Lp * 0.09 - ph * 0.3), Math.max(3, ppm * 0.1), a * 0.95, k + t * 0.3, my ? [255, 170, 120] : undefined); }
          if (my) { ctx.save(); ctx.globalCompositeOperation = 'source-over'; // (7.4.17) solid embers, so they show in bright shallow water too
            const nE = 28, er = Math.max(2.2, ppm * 0.09);
            for (let k = 0; k < nE; k++) { const ph = (t * (0.14 + (k % 5) * 0.03) + k * 0.0617) % 1, u = ((k * 0.381) % 1 - 0.5) * 1.0, ex = S(c.x + dir * u * Lp + Math.sin(t * 0.9 + k) * 0.2), ey = Sy(c.y + Lp * 0.05 - ph * Math.max(1.5, Lp * 0.3));
              ember(ctx, ex, ey, er * (4 - ph * 1.5), er * 1.1, -Math.PI / 2 + Math.sin(t * 1.7 + k) * 0.35, Math.sin(Math.PI * ph) * 0.95); } // (7.4.24) slivers of ash
            ctx.restore(); }
          ctx.restore(); }
      }
      if (!glowOf(c) && !c.variant && !c.petLeg && !visible(c.x, c.y, fishDrawLen(c.len))) continue; // black in the black (a legendary pet always shows)
      if (LEGENDARY.has(c.sp.id) && g.earl.legends && g.earl.legends.has('eye')) /* (6.5.0) legends glow now: rare forms are gone */ glowPts.push([S(c.x), Sy(c.y), '#ffe6a0', Math.max(ppm * 0.9, fishDrawLen(c.len) * ppm), 0.85]); // (2.8.0) Eye of the Sea
      const Ld = fishDrawLen(c.len) * ppm;
      const shape = c.sp.v.s;
      const tilt = clamp(Math.atan2(c.hvy !== undefined ? c.hvy : c.vy, Math.max(Math.abs(c.vx), c.hvy !== undefined ? c.speed * 0.8 : 0) + 0.2), -0.5, 0.5);
      // (4.3.7) no stand-in shapes: every animal is drawn as itself at any size (from its cached frames). Small fish,
      // shrimp and krill used to be drawn here as a generic oval and tail, so a krill looked like a little fish until
      // he was close enough for its own drawing. Kept, switched off, in case a slow machine ever needs it back.
      // (4.26) the smallest animals (krill, larvae, a far school) are one flat silhouette each, in the species' own
      // colour under the water's tint: at a few pixels the full drawing only shimmered, and it cost the most
      // (5.6.9) on a phone (drawn at 1x) the cut-off is lower, so fish a few millimetres long on its screen are drawn as
      // themselves; and the silhouettes of fish keep a forked tail, so even the tiniest read as fish, not ovals
      if (Ld < (this.phone ? 7 : 12) && !c.variant && !LEGENDARY.has(c.sp.id)) {
        let fb = flatB.get(c.sp.id);
        if (!fb) { fb = { sp: c.sp, path: new Path2D() }; flatB.set(c.sp.id, fb); }
        const x = S(c.x), y = Sy(c.y), rot = c.dir > 0 ? tilt : Math.PI - tilt, hl = Math.max(1.2, Ld * 0.5), hh = Math.max(0.8, Ld * Math.min(0.22, c.sp.v.h * 0.5 + 0.06));
        fb.path.moveTo(x + Math.cos(rot) * hl, y + Math.sin(rot) * hl); fb.path.ellipse(x, y, hl, hh, rot, 0, TAU);
        if (FISHY.has(shape)) { const cx2 = Math.cos(rot), sy2 = Math.sin(rot), bx2 = x - cx2 * hl * 0.8, by2 = y - sy2 * hl * 0.8, ex = x - cx2 * hl * 1.6, ey = y - sy2 * hl * 1.6, w2 = hh * 1.15;
          fb.path.moveTo(bx2, by2); fb.path.lineTo(ex - sy2 * w2, ey + cx2 * w2); fb.path.lineTo(x - cx2 * hl * 1.35, y - sy2 * hl * 1.35); fb.path.lineTo(ex + sy2 * w2, ey - cx2 * w2); fb.path.closePath(); }
        if (glowOf(c) && (glowSkip++ % 6 === 0)) glowPts.push([x, y, glowOf(c), Math.max(2, Ld * 0.35), 0.4, 0.7]);
        continue;
      }
      if (SIMPLE_SMALL && Ld < 20 && !c.variant && (shape === 'fish' || shape === 'shrimp' || shape === 'hatchet')) {
        let bt = batches.get(c.sp.id);
        if (!bt) { bt = { sp: c.sp, back: new Path2D(), belly: new Path2D(), flash: new Path2D(), eyes: new Path2D(), nf: 0 }; batches.set(c.sp.id, bt); }
        const x = S(c.x), y = Sy(c.y);
        // forward (nose) direction on screen, and the body's "down" (belly) direction
        const fx2 = c.dir > 0 ? Math.cos(tilt) : -Math.cos(tilt), fy2 = Math.sin(tilt);
        const rot = Math.atan2(fy2, fx2);
        const hh = Ld * Math.min(0.32, c.sp.v.h * 0.6 + 0.06), sw = Math.sin(c.phase * 6) * hh * 0.35;
        // body centre sits slightly toward the nose; tail behind
        const bx = x + fx2 * Ld * 0.04, by = y + fy2 * Ld * 0.04;
        bt.back.moveTo(bx + fx2 * Ld * 0.42, by + fy2 * Ld * 0.42);
        bt.back.ellipse(bx, by, Ld * 0.42, hh, rot, 0, TAU);
        const tx0 = x - fx2 * Ld * 0.3, ty0 = y - fy2 * Ld * 0.3;
        const tx1 = x - fx2 * Ld * 0.52, ty1 = y - fy2 * Ld * 0.52;
        const px = -fy2, py = fx2; // perpendicular
        bt.back.moveTo(tx0, ty0);
        bt.back.lineTo(tx1 + px * (hh * 1.1 + sw), ty1 + py * (hh * 1.1 + sw));
        bt.back.lineTo(tx1 - px * (hh * 1.1 - sw), ty1 - py * (hh * 1.1 - sw));
        bt.back.closePath();
        // belly: the lower half (screen-down side of the body)
        const down = (px * 0 + py) >= 0 ? 1 : -1;
        const ox = px * down * hh * 0.35, oy = py * down * hh * 0.35;
        bt.belly.moveTo(bx + ox + fx2 * Ld * 0.34, by + oy + fy2 * Ld * 0.34);
        bt.belly.ellipse(bx + ox, by + oy, Ld * 0.34, hh * 0.55, rot, 0, TAU);
        const flash = 0; // (no shimmer)
        if (flash > 0.3) { bt.flash.moveTo(bx + fx2 * Ld * 0.36, by + fy2 * Ld * 0.36); bt.flash.ellipse(bx, by, Ld * 0.36, hh * 0.7, rot, 0, TAU); bt.nf++; }
        if (Ld > 9) { const ex = x + fx2 * Ld * 0.33 - px * down * hh * 0.2, ey = y + fy2 * Ld * 0.33 - py * down * hh * 0.2, er = Math.max(0.7, hh * 0.3); bt.eyes.moveTo(ex + er, ey); bt.eyes.arc(ex, ey, er, 0, TAU); }
        // school fish carry faint belly photophores, not lamps: small, dim, and they never sum to a blaze
        // (6th field: the radius of a sharp light-organ core; marks a living light the torch can wash out)
        if (glowOf(c) && c.glimmer) glowPts.push([x, y, glowOf(c), Math.max(2, Ld * 0.4 + ppm * 0.08), 0.55 * bioPulse(c, t), Math.max(0.8, ppm * 0.05)]); // a lone one: its own light, flashing
        else if (glowOf(c) && (glowSkip++ % 4 === 0)) glowPts.push([x, y, glowOf(c), Math.max(2, Ld * 0.35), 0.45 * bioPulse(c, t), 0.7]); // (2.3.1: every second fish, a little brighter: a school reads as a drift of blue points)
        continue;
      }
      const isLive = c.variant || Ld > 150 || CACHE_SKIP.has(shape);
      if (shape === 'sleeper') sleeperState.jaw = c.jaw || 0; // how far its jaw is open (see hunters.js)
      const tg = isLive && Ld >= 6 ? layer() : ctx;
      if (tg !== ctx) this.lgrow(S(c.x), Sy(c.y), Ld * 1.4);
      tg.save(); tg.translate(S(c.x), Sy(c.y));
      // (5.0) body language: a turn is a quick edge-on swing, not a flip; a startle is a flinch; a spent fish
      // hangs nose-down; a dazed one rolls and wobbles
      let turnK = 1, extra = 0, roll = 1;
      if (c.turnAt !== undefined) { const k = (t - c.turnAt) / (0.18 + Math.min(0.5, c.len * 0.25)); if (k >= 0 && k < 1) turnK = 0.1 + 0.9 * k * k * (3 - 2 * k); }
      if (c.startle > 0) extra += Math.sin((1 - c.startle / 0.32) * Math.PI) * 0.5;
      if (c.tired > 0) extra += -0.3 + Math.sin(t * 1.3 + c.wob) * 0.06;
      if (c.dazed > 0) { const dk = Math.min(1, c.dazed / 0.8); extra += Math.sin(t * 11 + c.wob) * 0.32 * dk; roll = 1 - 0.5 * dk * Math.abs(Math.sin(t * 7 + c.wob)); }
      tg.scale(c.dir > 0 ? -turnK : turnK, roll);
      if (c.sp.v.hab === 'floor' && c.y > g.world.floorAt(c.x) - 0.6) {
        // a crab, an octopus, a starfish on the bottom: along the slope under it, not level
        const a = seabedPose(g.world, c.x, Math.max(0.1, c.len * 0.5), true).rot;
        tg.rotate(c.dir > 0 ? -a : a);
      } else if (UPRIGHT[c.sp.id]) tg.rotate(UPRIGHT[c.sp.id][0] * Math.PI / 2 * 0.9 + Math.sin(t * 0.4 + c.wob) * 0.07 + extra); // (5.16.0) hanging upright, a slight lean
      else if (c.sp.v.sq === 'giant' || c.sp.v.sq === 'colossal') tg.rotate(-tilt * 0.4 + 0.12 + Math.sin(t * 0.5 + (c.wob || 0)) * 0.03 + extra * 0.5); // (7.4.17, owner) a giant squid never turns over: level or a little tilted, the mantle's tip a touch higher
      else tg.rotate((c.sp.v.hab === 'drift' ? 0 : -tilt) + extra);
      const r = c.variant ? this.drawVariant(tg, c.sp, c.variant, Ld, c.phase) : this.drawCached(tg, c.sp, Ld, c.phase, c.wob, isLive ? null : this.veilFor(c.y));
      tg.restore();
      if (Ld >= 6 && (c.variant || Ld > 150 || CACHE_SKIP.has(shape))) {
        const sx = S(c.x), sy = Sy(c.y), rr = Ld * 1.4;
        rbox[0] = Math.min(rbox[0], sx - rr); rbox[1] = Math.min(rbox[1], sy - rr); rbox[2] = Math.max(rbox[2], sx + rr); rbox[3] = Math.max(rbox[3], sy + rr);
      }
      // a research tag trailing from a tagged animal
      if (c.tagged) {
        const tx = S(c.x) + (c.dir > 0 ? -1 : 1) * Ld * 0.05, ty = Sy(c.y) - Ld * 0.08;
        ctx.strokeStyle = '#e8b02a'; ctx.lineWidth = Math.max(1, ppm * 0.03); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - c.dir * Ld * 0.08, ty - Ld * 0.06 + Math.sin(t * 8 + c.wob) * Ld * 0.02, tx - c.dir * Ld * 0.16, ty - Ld * 0.03); ctx.stroke(); ctx.lineCap = 'butt';
      }
      // a crimson animal glows: a red light that carries in the dark
      if (c.variant === 'crimson') glowPts.push([S(c.x), Sy(c.y), '#ff3018', Math.max(ppm * 0.6, Ld * 0.6), 0.9 + 0.3 * Math.sin(t * 1.7 + c.wob)]);
      if (glowOf(c)) {
        // living light from the real organs: a sharp core and a small halo, slowly pulsing, flaring when startled
        const pk = bioPulse(c, t), rot = c.sp.v.hab === 'drift' ? 0 : -tilt, cr = Math.cos(rot), sr = Math.sin(rot);
        const pts = r || [[0, 0, 1]];
        for (const [lx, ly, sz = 1] of pts) {
          const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
          glowPts.push([S(c.x) - rx * c.dir, Sy(c.y) + ry, glowOf(c), Math.max(2, (Ld * 0.06 + ppm * 0.1) * sz), pk, Math.max(0.7, (Ld * 0.012 + 0.4) * sz)]);
        }
      }
    }
    // the small fish, batched: their colours mixed with the water's, as the veil would have done
    const bv = this.veilFor(cam.y);
    const vmix = (hex) => rgbStr(mixRgb(hexToRgb(hex), bv.col, bv.a));
    for (const fb of flatB.values()) { ctx.fillStyle = vmix(fb.sp.v.c[0]); ctx.fill(fb.path); }
    for (const bt of batches.values()) {
      ctx.fillStyle = vmix(bt.sp.v.c[0]); ctx.fill(bt.back);
      ctx.fillStyle = vmix(bt.sp.v.c[1]); ctx.fill(bt.belly);
      if (bt.nf) { ctx.fillStyle = 'rgba(235,245,250,0.7)'; ctx.fill(bt.flash); }
      ctx.fillStyle = vmix('#0a0a0a'); ctx.fill(bt.eyes);
    }
    ctx.setTransform(baseM);
    if (fl) { fl.setTransform(baseM); this.layerEnd(ctx, g, fl, null); } // (2.3.2: no rim-and-belly shading on the animals: it popped in and out around whatever was drawn live)
    // (7.6.88, owner) the tutorial's tap cue lives in the sea: the diver's own glove (assets/ui/tap_glove.png, baked by
    // tools/tap_glove.py) comes up out of the dark below the fish on the side away from the diver, its fingertip stopping at
    // the fish's edge (never over it), and taps twice, then rests; each touch sends a soft ring out through the water. Drawn
    // here, with the animals, so the lamp's light and the depth's dark fall on it and the snow, kelp and veil pass in front
    if (g.tutFocus && g.tutFocus.kind === 'observe' && g.tutFocus.fish && !g.tutFocus.fish.dead && this.tapGloveReady()) this.drawTapGlove(ctx, g, S, Sy, ppm);
    // ---- pickups + lanterns (over the veiled layer, so nothing valuable hides behind the coral) ----
    for (const p of g.world.pickups) if (!p.taken && inView(p.x, p.y)) {
      if (p.rot === undefined) p.rot = p.y > g.world.floorAt(p.x) - 0.6 ? seabedPose(g.world, p.x, 0.25, true).rot : 0; // lying on the slope
      this.drawPickup(ctx, p, S(p.x), Sy(p.y), ppm, t);
    }
    for (const l of g.world.lanterns) if (inView(l.x, l.y, 14)) this.drawLanternBody(ctx, l, S, Sy, ppm, t);
    // traps on their lines: a buoy at the surface, a line (a thin string for the small traps, a thick
    // rope for the big ones) sagging with the current down to the box, the box with what's inside it,
    // and the bait's scent drifting away downstream
    this.trapLabels = [];
    const night = g.day && g.day.light < 0.3;
    // (7.6.23, owner) the shipyard barge off the Margaret's bow, a picture painted once (barge_draw.js), riding the swell
    { const bx = yardX(); if (bx > x0 - 12 && bx < x1 + 12) { const B = BARGE, pic = bargePicture(!!night, this.steadyPpm(ppm)), sc = ppm / Math.max(12, Math.round(this.steadyPpm(ppm) * 4) / 4), bob = Math.sin(t * 0.9) * 0.05, roll = Math.sin(t * 0.7 + 1) * 0.008;
        { const mv = this.ppMoving(), rp = (v) => (mv ? v : Math.round(v)); ctx.save(); ctx.translate(rp(S(bx)), rp(Sy(bob))); ctx.rotate(roll); ctx.drawImage(pic, rp(-7 * ppm), rp(-B.WL * ppm), pic.width * sc, pic.height * sc); /* (7.6.64) scaled from the held picture while the camera zooms */ ctx.restore(); } } }
    for (const pt of SAIL) if ((pt.id === 'home' || pt.id === 'dave' || pt.id === 'station' || pt.id === 'cave') /* (7.4.27, owner) buoys only at the shops: the others' chains read as a black line down the screen */ && pt.x > x0 - 6 && pt.x < x1 + 6 && y0 < 4 + 400) drawSailBuoy(ctx, S, Sy, ppm, t, pt, surfY, g.world.floorAt(pt.x), y1, night); // (6.8.1) the sail points' buoys
    for (const tr of g.traps || []) {
      if (tr.x < x0 - 10 || tr.x > x1 + 10) continue;
      const T = TRAPS[tr.type], by = surfY(tr.x);
      const bx = S(tr.x), bsy = Sy(by), ty = Sy(tr.y);
      const drift = Math.sin(t * 0.25 + tr.sway) * Math.min(tr.y * 0.05, 5) + Math.min(tr.y * 0.03, 4); // the current bows the line
      const tx = S(tr.x + (tr.state === 'set' && !tr.onBottom ? drift * 0.25 : 0)), swing = Math.sin(t * 0.7 + tr.sway) * (tr.state === 'hauling' ? 0.12 : 0.03);
      // the line first (behind the box)
      const thick = T.line === 'rope' ? 0.06 : T.line === 'line' ? 0.025 : 0.012;
      ctx.strokeStyle = T.line === 'rope' ? 'rgba(120,95,60,0.95)' : T.line === 'line' ? 'rgba(200,190,150,0.8)' : 'rgba(220,215,190,0.7)';
      ctx.lineWidth = Math.max(1, ppm * thick); ctx.lineCap = 'round';
      const topY = ty - T.size[1] * ppm * 1.3, cx = (bx + tx) / 2 + drift * ppm, cy = (bsy + topY) / 2;
      ctx.beginPath(); ctx.moveTo(bx, bsy); ctx.quadraticCurveTo(cx, cy, tx, topY); ctx.stroke();
      if (T.line === 'rope') { // the lay of a braided rope: a darker twist along it
        ctx.strokeStyle = 'rgba(60,45,25,0.6)'; ctx.lineWidth = Math.max(1, ppm * 0.02); ctx.setLineDash([ppm * 0.08, ppm * 0.1]);
        ctx.beginPath(); ctx.moveTo(bx, bsy); ctx.quadraticCurveTo(cx, cy, tx, topY); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.lineCap = 'butt';
      // the box itself, swaying on its line (still when it rests on the bottom)
      if (inView(tr.x, tr.y, 4)) {
        const inside = tr.catch.map((c, i) => ({ sp: SPECIES_BY_ID[c.id], len: c.len, dead: c.cond <= 0.05, seed: i * 1.7 }));
        ctx.save(); ctx.translate(tx, ty); if (!tr.onBottom || tr.state !== 'set') ctx.rotate(swing);
        const r = drawBoxTrap(ctx, ppm, tr.type, t, inside, (c2, sp, L, ph) => this.drawCached(c2, sp, L, ph, 0));
        ctx.restore();
        if (r.glow) glowPts.push([tx + r.glow[0], ty + r.glow[1], '#9affd8', ppm * 1.0, 1.1]);
        // the bait's scent: a faint trail of particles drifting off with the current
        if (tr.state === 'set' && tr.age < 420) {
          ctx.fillStyle = 'rgba(210,200,170,0.22)';
          for (let k = 0; k < 10; k++) {
            const q = ((t * 0.08 + k / 10 + tr.sway) % 1), sx = tx + q * ppm * 9, sy = ty - T.size[1] * ppm * 0.5 + Math.sin(q * 7 + k) * ppm * 0.6 * q;
            ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, ppm * (0.03 + q * 0.05)), 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
      // the buoy riding the waves, and its label
      if (bsy > -60 && bsy < this.H + 60) {
        ctx.save(); ctx.translate(bx, bsy); ctx.rotate(Math.sin(t * 1.3 + tr.sway) * 0.12);
        const lamp = drawTrapBuoy(ctx, ppm, t, !!T.winch, night);
        ctx.restore();
        if (lamp) glowPts.push([bx + lamp[0], bsy + lamp[1], '#fff2b0', ppm * 0.8, 1.5]);
        const n = tr.catch.length, S0 = g.profile && (g.profile.trapSets || []).find((q) => q.id === tr.id), left = S0 ? Math.max(0, TRAPS[S0.type].dur - (Date.now() - S0.at) / 1000) : 0; // (7.3.0) real time
        this.trapLabels.push([bx, bsy - ppm * (T.winch ? 2.4 : 1.5), tr.state === 'lowering' ? `going down, ${Math.round(tr.y)} m` : tr.state === 'hauling' ? `coming up · ${Math.round(tr.y)} m`
          : `${n} inside, ${left > 0 ? (left >= 3600 ? `${Math.floor(left / 3600)} h ${String(Math.floor((left % 3600) / 60)).padStart(2, '0')} min` : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`) : 'done'}`]);
      }
    }

    // brackets around what the net, slurp gun or claw will go for (a setting: pause menu)
    // (4.2.0, 4.3.1) the tutorial: a stream of brass chevrons flowing from Earl to where to go, a ring pulsing round
    // the fish (or the spot), and an arrow at the edge of the screen when it is off screen. No words: the game's own
    // prompts already say what to press there
    // (4.10.0) the player's chart markers, as small pins in the sea with their names
    if (g.mode === 'play' && g.profile && Array.isArray(g.profile.markers)) for (const m of g.profile.markers) {
      const px = S(m.x), py = Sy(m.y); if (px < -80 || px > W + 80 || py < -40 || py > H + 40) continue;
      const bob = Math.sin(t * 1.6 + m.x) * 2, pr = clamp(ppm * 0.28, 7, 11);
      ctx.save(); ctx.translate(px, py + bob); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5; ctx.fillStyle = m.col || '#d9cfae';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-pr * 0.4, -pr * 0.7, -pr, -pr * 1.1, -pr, -pr * 1.7); ctx.arc(0, -pr * 1.7, pr, Math.PI, 0); ctx.bezierCurveTo(pr, -pr * 1.1, pr * 0.4, -pr * 0.7, 0, 0); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(20,16,8,0.75)'; ctx.beginPath(); ctx.arc(0, -pr * 1.7, pr * 0.38, 0, TAU); ctx.fill(); ctx.restore();
      drawPrompt(ctx, m.name, px, py + bob - pr * 3.4, 0.9, { size: 15, shade: false, col: '#ece6d2' });
    }
    // (7.4.26, owner) a step that must be done before anything else (getting into the sub): the screen's edges darkened
    // a little, breathing, so the eye goes to the middle and the chevrons
    { const want = g.mode === 'play' && g.tutVig ? 1 : 0; this.tutVigK = (this.tutVigK || 0) + (want - (this.tutVigK || 0)) * Math.min(1, (g.dt || 0.016) * 3);
      if (this.tutVigK > 0.01) { const W0 = this.c.width, H0 = this.c.height, TF = g.tutFocus && g.tutFocus.fish, k = this.tutVigK * (TF ? 1 : 0.85 + 0.15 * Math.sin(g.time * 2)), R = Math.hypot(W0, H0) / 2;
        // (7.6.82, owner) the first fish's moment: the dark closes round the fish itself, only it and the water round it lit
        if (TF) { this.vigAt = this.vigAt || [S(TF.x), Sy(TF.y)]; this.vigAt[0] += (S(TF.x) - this.vigAt[0]) * 0.2; this.vigAt[1] += (Sy(TF.y) - this.vigAt[1]) * 0.2; } else this.vigAt = null;
        const vx = this.vigAt ? this.vigAt[0] : W0 / 2, vy = this.vigAt ? this.vigAt[1] : H0 / 2, r0 = this.vigAt ? Math.max(36, ppm * 1.8) : R * 0.3, r1 = this.vigAt ? Math.max(140, ppm * 5.5) : R;
        const vg = ctx.createRadialGradient(vx, vy, r0, vx, vy, r1), a1 = this.vigAt ? 0.66 : 0.42, a2 = this.vigAt ? 0.84 : 0.78;
        vg.addColorStop(0, 'rgba(6,9,6,0)'); vg.addColorStop(0.5, `rgba(6,9,6,${(a1 * k).toFixed(3)})`); vg.addColorStop(1, `rgba(4,6,4,${(a2 * k).toFixed(3)})`);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = vg; ctx.fillRect(0, 0, W0, H0); ctx.restore(); } }
    const guide = g.tut && g.tut.to ? g.tut : g.devGuide ? { to: g.devGuide.c, fish: g.devGuide.c } : g.markGuide ? { to: g.markGuide } : null; // (4.9.0) or the developer's trail to a legend (X)
    // (5.6.8) on a phone, once the thing to tap is in reach its brackets say it all: no trail or ring on top of them
    if (guide && g.mode === 'play' && !(!guide.fish /* (7.1.0) a fish to catch keeps its ring */ && !guide.sellDoor /* (7.7.0, owner) on the way to the Sell door the trail stays, whatever else (the ladder) is in reach */ && g.tapMarks && g.tapMarks.some((m) => m.what !== 'winch' || (g.tutAction && String(g.tutAction.key).toLowerCase() === 'u')))) {
      const e = guide.from || g.earl, tx = guide.to.x, ty = guide.to.y, d = Math.hypot(tx - e.x, ty - e.y); // (4.8.1) from: where the trail starts (the trawl's mouth in its lesson)
      const ang = Math.atan2(Sy(ty) - Sy(e.y), S(tx) - S(e.x)), gap = 1.5, n = Math.min(36, Math.floor(d / gap));
      const sz = clamp(ppm * 0.22, 7, 16), flow = (g.time * 1.6) % 1;
      // (7.1.0) straight chevrons from Earl to the goal, each turned along the line and drifting toward it (the bubbly
      // thread of light was hard to read): cream with a dark edge, fading in from Earl and out before the goal
      { const L = Math.hypot(S(tx) - S(e.x), Sy(ty) - Sy(e.y)), stepPx = clamp(ppm * 1.4, 26, 46), cn = Math.min(24, Math.floor(L / stepPx)), ph = (g.time * 0.9) % 1, c = clamp(ppm * 0.22, 6, 11);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < cn; i++) { const m = (i + ph + 0.5) * stepPx; if (m < stepPx * 0.8 || m > L - stepPx * 0.6) continue;
          const q = m / L, sx = S(e.x) + (S(tx) - S(e.x)) * q, sy = Sy(e.y) + (Sy(ty) - Sy(e.y)) * q, a = Math.min(1, (m - stepPx * 0.8) / stepPx) * Math.min(1, (L - m) / stepPx) * 0.9;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
          for (const [w, col] of [[c * 0.6, `rgba(14,18,10,${(a * 0.6).toFixed(3)})`], [c * 0.28, `rgba(240,228,196,${a.toFixed(3)})`]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, w); ctx.beginPath(); ctx.moveTo(-c, -c); ctx.lineTo(0, 0); ctx.lineTo(-c, c); ctx.stroke(); }
          ctx.restore(); }
        ctx.restore(); }
      ctx.restore(); void ang; void sz; void flow; void n;
      const f = guide.fish, cx = S(f ? f.x : tx), cy = Sy(f ? f.y : ty);
      const r = (f ? Math.max(16, ppm * (f.len * 0.8 + 0.45)) : Math.max(14, ppm * 0.5)) * (1 + 0.1 * Math.sin(g.time * 4));
      ctx.save(); if (guide.door) ctx.globalAlpha = 0; // (4.3.5) the door glows itself
      // (5.5.5) as every mark the tutorial makes: cream with a dark olive edge (no white glow), breathing out once a while
      // (7.6.81, owner) no outlined circle: a soft patch of lighter water round it, brightest in the middle and fading out, breathing slowly
      { const rr = r * 1.15, lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); lg.addColorStop(0, 'rgba(230,222,196,0.2)'); lg.addColorStop(0.6, 'rgba(230,222,196,0.12)'); lg.addColorStop(1, 'rgba(230,222,196,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); }
      // (7.6.82, owner) waiting to be tapped: soft pulses of light grow out of the fish one after another, small, middle, large
      if (false && g.tutFocus && g.tutFocus.kind === 'observe' && f === g.tutFocus.fish) { /* (7.6.87, owner) off: the tap cue's own ripple is the one signal */ const base = Math.max(14, ppm * (f.len * 0.8 + 0.45));
        for (let i = 0; i < 3; i++) { const q = ((g.time - g.tutFocus.t0) * 0.8 + i / 3) % 1, rr = base * (0.5 + 1.6 * q), a = 0.32 * (1 - q) * Math.min(1, q * 6);
          const pg = ctx.createRadialGradient(cx, cy, rr * 0.55, cx, cy, rr); pg.addColorStop(0, 'rgba(236,228,204,0)'); pg.addColorStop(0.8, `rgba(236,228,204,${a.toFixed(3)})`); pg.addColorStop(1, 'rgba(236,228,204,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); } }
      ctx.restore();
      // (4.3.2) a prompt beside the fish, only where the game's own prompts don't already say it (swinging the net,
      // "it got away"): a brass key-cap, or a mouse with its left button lit, and the words
      const tp0 = guide.prompt, tp = tp0 && typeof tp0 === 'object' ? { text: tp0.text, col: tp0.col } : tp0; // (5.3) on a phone no key or mouse: the buttons are the way
      if (tp && typeof tp === 'object' && cx > -60 && cx < this.W + 60 && cy > -60 && cy < this.H + 60) {
        ctx.save(); ctx.font = '500 18px "Barlow Semi Condensed", "Arial Narrow", sans-serif';
        const iw = tp.mouse ? 24 : tp.key ? (tp.key.length > 1 ? 58 : 26) + 9 : 0, total = iw + ctx.measureText(tp.text).width;
        // on the side away from Earl, so it never sits on him; the other side if it would leave the screen
        const leftSide = S(g.earl.x) > cx; let x0 = leftSide ? cx - r - 14 - total : cx + r + 14;
        if (x0 < 12) x0 = cx + r + 14; else if (x0 + total > this.W - 12) x0 = cx - r - 14 - total;
        ctx.restore();
        if (tp.mouse) {
          ctx.save(); ctx.translate(x0 + 8, cy); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5;
          ctx.fillStyle = 'rgba(20,16,8,0.6)'; ctx.strokeStyle = '#ece6d2'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.roundRect(-8, -12, 16, 24, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          const on = 0.6 + 0.4 * Math.abs(Math.sin(g.time * 3));
          ctx.fillStyle = `rgba(244,246,240,${on.toFixed(2)})`; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -1); ctx.lineTo(-8, -1); ctx.lineTo(-8, -4); ctx.arcTo(-8, -12, 0, -12, 8); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -1); ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.stroke();
          ctx.restore();
          drawPrompt(ctx, tp.text, x0 + iw + (total - iw) / 2, cy, 1, { size: 18, shade: false, col: tp.col || '#ece6d2' });
        } else drawPrompt(ctx, tp.key ? `${tp.key}  ${tp.text}` : tp.text, x0 + total / 2, cy, 1, { size: 18, shade: false, col: tp.col || '#ece6d2' });
      }
      // off-screen: a bigger arrow at the edge of the screen pointing the way, with how far
      const W2 = this.W, H2 = this.H;
      if (cx < 0 || cx > W2 || cy < 0 || cy > H2) {
        const ax = clamp(cx, 48, W2 - 48), ay = clamp(cy, 70, (H2 * 0.56)), // (5.6.7) on a phone, kept above the stick and the buttons
           a2 = Math.atan2(cy - H2 / 2, cx - W2 / 2), pulse = 1 + 0.12 * Math.sin(g.time * 5);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a2); ctx.scale(pulse, pulse);
        // (5.5.5) a smaller chevron in the tutorial's cream with its dark olive edge, not a white paper plane
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -12); ctx.lineTo(-3, 0); ctx.lineTo(-8, 12); ctx.closePath();
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(18,22,12,0.75)'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = 'rgba(230,222,196,0.9)'; ctx.fill(); ctx.restore();
        ctx.save(); ctx.font = '600 12px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(230,222,196,0.85)'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(`${Math.round(d)} m`, ax - Math.cos(a2) * 34, ay - Math.sin(a2) * 34 + 4); ctx.restore();
      }
    }
    // (5.0) a pet left to stay, off the screen: a smaller, dimmer arrow at the edge pointing back to it, with how far
    const pc = g.petC;
    if (pc && g.profile && g.profile.petStay && g.mode === 'play' && !g.photo) {
      const cx = S(pc.x), cy = Sy(pc.y), W2 = this.W, H2 = this.H;
      if (cx < 0 || cx > W2 || cy < 0 || cy > H2) {
        const ax = clamp(cx, 40, W2 - 40), ay = clamp(cy, 64, H2 - 64), a2 = Math.atan2(cy - H2 / 2, cx - W2 / 2);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a2); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5; ctx.fillStyle = 'rgba(200,228,236,0.8)';
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.font = '600 12px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,228,236,0.85)'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(`Pet ${Math.round(Math.hypot(pc.x - g.earl.x, pc.y - g.earl.y))} m`, ax - Math.cos(a2) * 32, ay - Math.sin(a2) * 32 + 4); ctx.restore();
      }
    }
    // (5.8.0) the catch bracket: bold cream corners closing in snug round the fish the net will go for, a quick pulse
    // as it comes in reach (always on a phone; a setting on a computer)
    const ctg = null; // (6.3.0) no brackets anywhere: swing and see
    if (ctg) {
      const tx = ctg.c ? ctg.c.x : ctg.x, ty = ctg.c ? ctg.c.y : ctg.y, id = ctg.c || null;
      if (this.ctgFor !== id) { this.ctgFor = id; this.ctgAt = t; }
      const inK = Math.min(1, (t - this.ctgAt) / 0.22), close = 1 + 0.6 * (1 - inK) * (1 - inK);
      const r = Math.max(ppm * 0.38, fishDrawLen(ctg.len) * ppm * 0.62) * close * (1 + 0.04 * Math.sin(t * 6)), rh = Math.max(ppm * 0.3, r * 0.62), k = r * 0.34;
      const cx = S(tx), cy = Sy(ty);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.35 + 0.65 * inK;
      for (const [w, col] of [[Math.max(4.5, ppm * 0.12), 'rgba(16,20,12,0.65)'], [Math.max(2.4, ppm * 0.065), '#efe6c8']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(cx + sx * r, cy + sy * rh - sy * k); ctx.lineTo(cx + sx * r, cy + sy * rh); ctx.lineTo(cx + sx * r - sx * k, cy + sy * rh); }
        ctx.stroke();
      }
      ctx.restore();
    }
    // (5.0) the camera's viewfinder while the shutter is open: four thin corners along the aim, closing in on the
    // animal as the exposure runs, a line filling under them. (Gone in the last instant: the picture is cut from
    // this canvas, and the frame must not be in it.)
    const PH = g.photo;
    if (PH && g.mode === 'play' && PH.t < PH.dur - 0.06) {
      const e = g.earl, a = g.aim !== null && g.aim !== undefined ? g.aim : (e.facing > 0 ? 0 : Math.PI);
      const subj = PH.s ? (PH.s.c ? PH.s.c : PH.s) : null, dd = subj ? Math.hypot(subj.x - e.x, subj.y - e.y) : 3;
      const as = PH.def.assist || 0.2, ax = e.x + Math.cos(a) * dd, ay = e.y + Math.sin(a) * dd;
      const fx2 = subj ? ax + (subj.x - ax) * as : ax, fy2 = subj ? ay + (subj.y - ay) * as : ay;
      const k = clamp(PH.t / PH.dur, 0, 1), L = subj ? fishDrawLen(PH.s.len) : 0.6;
      const rw = Math.max(ppm * 0.9, L * ppm * 1.4) * (1.35 - 0.3 * k), rh = rw * 0.66, c = rw * 0.28;
      const cx = S(fx2), cy = Sy(fy2);
      ctx.save(); ctx.strokeStyle = 'rgba(244,246,240,0.9)'; ctx.lineWidth = Math.max(1.5, ppm * 0.04); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(cx + sx * rw, cy + sy * rh - sy * c); ctx.lineTo(cx + sx * rw, cy + sy * rh); ctx.lineTo(cx + sx * rw - sx * c, cy + sy * rh); }
      ctx.stroke();
      ctx.lineWidth = Math.max(1, ppm * 0.025); ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
      ctx.fillStyle = 'rgba(244,246,240,0.85)'; ctx.fillRect(cx - rw, cy + rh + 6, rw * 2 * k, Math.max(2, ppm * 0.05));
      ctx.restore();
    }
    // the entity's body, lit by the same light as everything else (invisible in the dark)
    const entB = g.entity;
    this.entInfo = null;
    if (entB && g.mode !== 'menu' && !g.kill && inView(entB.x, entB.y, MONSTER_LEN * 1.35) && entB.dist < 170) {
      const toward = entB.faceLock ?? (entB.dist < 70 ? (g.earl.x >= entB.x ? 1 : -1) : (Math.cos(entB.heading) >= 0 ? 1 : -1));
      entB.face = entB.faceLock ?? lerp(entB.face ?? toward, toward, 0.02);
      const flipB = entB.face >= 0 ? -1 : 1;
      ctx.save(); ctx.translate(S(entB.x), Sy(entB.y)); ctx.scale(flipB, 1);
      const info = drawMonster(ctx, MONSTER_LEN * ppm, t, g.reveal ? 1 : clamp((170 - entB.dist) / 60, 0, 1) * (entB.fade ?? 1), g.kill ? g.kill.open || 0 : 0, 1, entB.flick || 0);
      ctx.restore();
      this.entInfo = { info, x: S(entB.x), y: Sy(entB.y), flip: flipB };
      // at the bottom it shows itself: a faint light of its own along the whole length
      if (g.reveal) {
        const k = clamp(Math.min(g.reveal.t / 4, (26 - g.reveal.t) / 4), 0, 1);
        for (let i = 0; i <= 8; i++) glowPts.push([S(entB.x) - flipB * -i * ppm * 12, Sy(entB.y) + Math.sin(i + t) * ppm, '#781410', ppm * 14, 0.8 * k]);
      }
    }
    // scales drifting where something was eaten
    for (const pf of g.fauna.puffs) {
      if (!inView(pf.x, pf.y)) continue;
      const k = pf.t / 2.5;
      for (let i = 0; i < pf.n; i++) {
        const a = pf.seed + i * 2.4, r = (0.2 + k * 1.4) * (0.5 + (i % 3) * 0.3);
        const tw = 0.5 + 0.5 * Math.sin(g.time * 9 + i * 3 + pf.seed);
        ctx.fillStyle = `rgba(225,235,240,${((1 - k) * 0.8 * tw).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(S(pf.x + Math.cos(a) * r), Sy(pf.y + Math.sin(a) * r * 0.7 + k * 0.6), Math.max(1, ppm * 0.04), Math.max(0.6, ppm * 0.025), a, 0, TAU); ctx.fill();
      }
    }

    // (4.0.0) the anchor chain: steel links from the hawse on her bow down to the anchor, as much of it
    // as is out (g.anchorLen metres of depth), hanging in a long curve toward the bow
    if (g.anchorLen > 0.2) {
      const dirB = -Math.sign(Math.cos(BOAT.yaw || 0) || 1), hx = BOAT.x + dirB * 7, hy = surfY(BOAT.x) * 0.8 - 1.5;
      let len = g.anchorLen; const scope = Math.min(len * 0.22, 30);
      const cx = (y) => { const k = clamp((y - hy) / Math.max(1, len - hy), 0, 1); return hx + dirB * (0.3 + scope * k * k * (3 - 2 * k)); };
      if (g.anchored && !g.anchorDir) len = Math.max(1, g.world.floorAt(cx(len)) - 0.35); // resting on the bottom where it lies, not where she floats
      const ya = Math.max(hy, y0 - 1), yb = Math.min(len, y1 + 1);
      if (ya < yb && Math.abs(cx((ya + yb) / 2) - cam.x) < cam.w) {
        const step = 0.3, big = ppm * step >= 3.5;
        ctx.lineCap = 'round';
        if (!big) { ctx.strokeStyle = 'rgba(70,76,80,0.9)'; ctx.lineWidth = Math.max(1, ppm * 0.08); ctx.beginPath(); for (let y = ya; y <= yb; y += Math.max(step, 2 / ppm)) ctx.lineTo(S(cx(y)), Sy(y)); ctx.stroke(); }
        else {
          let i = Math.floor((ya - hy) / step);
          for (let y = hy + i * step; y <= yb; y += step, i++) {
            const x = cx(y), a = Math.atan2(step, cx(y + step) - x), px = S(x), py = Sy(y), L = ppm * step * 0.62, Wd = ppm * step * 0.36;
            ctx.save(); ctx.translate(px, py); ctx.rotate(a);
            if (i % 2) { // seen face on: an oval ring with a stud across it
              ctx.strokeStyle = '#2a2e31'; ctx.lineWidth = Math.max(1.2, Wd * 0.55); ctx.beginPath(); ctx.ellipse(0, 0, L, Wd, 0, 0, TAU); ctx.stroke();
              ctx.strokeStyle = '#7c8488'; ctx.lineWidth = Math.max(0.6, Wd * 0.28); ctx.beginPath(); ctx.ellipse(0, 0, L, Wd, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
              ctx.strokeStyle = '#4a5054'; ctx.lineWidth = Math.max(0.8, Wd * 0.3); ctx.beginPath(); ctx.moveTo(0, -Wd * 0.8); ctx.lineTo(0, Wd * 0.8); ctx.stroke();
            } else { // edge on: a bar
              ctx.strokeStyle = '#25292c'; ctx.lineWidth = Math.max(1.4, Wd * 0.75); ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
              ctx.strokeStyle = '#6e767a'; ctx.lineWidth = Math.max(0.5, Wd * 0.22); ctx.beginPath(); ctx.moveTo(-L * 0.8, -Wd * 0.15); ctx.lineTo(L * 0.8, -Wd * 0.15); ctx.stroke();
            }
            ctx.restore();
          }
        }
        // the anchor itself, a stockless one hanging by its shackle (or lying on the mud)
        const ax = cx(len), ay = len;
        if (inView(ax, ay, 4)) {
          const u = ppm * 0.5; ctx.save(); ctx.translate(S(ax), Sy(ay)); ctx.rotate(Math.atan2(step, cx(len) - cx(len - step)) - Math.PI / 2);
          ctx.fillStyle = '#3a3f42'; ctx.strokeStyle = '#1c1f21'; ctx.lineWidth = Math.max(1, u * 0.08);
          ctx.beginPath(); ctx.arc(0, -u * 0.15, u * 0.22, 0, TAU); ctx.stroke(); // shackle
          ctx.fillRect(-u * 0.12, 0, u * 0.24, u * 1.9); ctx.strokeRect(-u * 0.12, 0, u * 0.24, u * 1.9); // shank
          ctx.beginPath(); ctx.moveTo(-u * 0.95, u * 1.35); ctx.quadraticCurveTo(-u * 0.6, u * 2.25, 0, u * 2.2); ctx.quadraticCurveTo(u * 0.6, u * 2.25, u * 0.95, u * 1.35);
          ctx.lineTo(u * 0.7, u * 1.75); ctx.quadraticCurveTo(0, u * 1.95, -u * 0.7, u * 1.75); ctx.closePath(); ctx.fill(); ctx.stroke(); // crown and flukes
          ctx.fillStyle = 'rgba(160,170,175,0.35)'; ctx.fillRect(-u * 0.12, 0, u * 0.07, u * 1.9);
          ctx.restore();
        }
      }
    }
    // ---- boat + sub ----
    const boatX = S(BOAT.x), boatY = Sy(surfY(BOAT.x) * 0.8);
    let crane = null;
    if (Math.abs(BOAT.x - cam.x) < cam.w) {
      const roll = Math.atan2(surfY(BOAT.x + 4) - surfY(BOAT.x - 4), 8) * (0.7 + (g.storm || 0) * 0.8);
      ctx.save(); ctx.translate(boatX, boatY); ctx.rotate(roll);
      // (5.3.5) the boat is painted into a picture at one fixed scale (its weathering laid on once there) and only
      // repainted a few times a second (the radar turning, the lights) or when she turns, the light changes or a door
      // lights up; each frame that picture is rocked, darkened for the hour and scaled into place. It was drawn
      // stroke by stroke at full size every frame, the costliest thing on the screen on a phone
      const REF = Math.max(16, Math.round(this.steadyPpm(ppm) * 4) / 4) /* (7.6.64, owner) the scale she is painted at holds still while the camera zooms (she was repainted at a new size every frame of the zoom on entering: she jittered); the held picture is scaled smoothly meanwhile */ /* (7.6.25, owner) painted at the screen's own scale: shrunk from a larger picture each frame, its fine grain shimmered as she moved */, Rw = Math.ceil(14 * REF * 1.3), Rh = Math.ceil(14 * REF * 0.75);
      const bcos = Math.cos(BOAT.yaw || 0), bsx = Math.sign(bcos || 1) * Math.max(0.06, Math.abs(bcos));
      const dimB = 1 - (0.22 + 0.78 * Math.sqrt(dayEff)), door = !!(g.tut && g.tut.door);
      const bc = this.boatC || (this.boatC = document.createElement('canvas'));
      const BK = this.boatK || {};
      if (bc.width !== Rw || bc.height !== Rh || BK.flip !== (bsx < 0) || BK.door !== door || Math.abs((BK.dim ?? -1) - dimB) > 0.02 || BK.docked !== g.sub.docked || BK.wear !== this.wearReady() || t - (BK.t ?? -9) > (this.phone ? 0.25 : 0.1)) {
        if (bc.width !== Rw || bc.height !== Rh) { bc.width = Rw; bc.height = Rh; }
        const bctx = bc.getContext('2d');
        bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, Rw, Rh); bctx.globalCompositeOperation = 'source-over';
        bctx.translate(Rw * 0.45, Rh * 0.82);
        this.boatCrane = drawBoat(bctx, 14 * REF, t, g.sub, bsx < 0, { noRoll: true, noRadar: true, noSmoke: true });
        bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'source-atop'; bctx.drawImage(this.boatWear(Rw, Rh, bsx < 0), 0, 0);
        if (dimB > 0.01) { bctx.fillStyle = `rgba(4,6,10,${dimB.toFixed(3)})`; bctx.fillRect(0, 0, Rw, Rh); }
        bctx.globalCompositeOperation = 'source-over';
        this.boatK = { flip: bsx < 0, door, dim: dimB, docked: g.sub.docked, wear: this.wearReady(), t };
      }
      const kB = ppm / REF; crane = this.boatCrane ? { craneTip: [this.boatCrane.craneTip[0] * kB, this.boatCrane.craneTip[1] * kB] } : null;
      ctx.save(); ctx.scale(bsx, 1); ctx.rotate(boatRock(t)); { const mv = this.ppMoving(), rp = (v) => (mv ? v : Math.round(v)); ctx.drawImage(bc, rp(-Rw * 0.45 * kB), rp(-Rh * 0.82 * kB), Rw * kB, Rh * kB); } // (7.6.65) never snapped to whole pixels while the zoom moves (it wobbled a pixel against the sea)
      // (7.6.62, owner) a door the tutorial wants: its own frame glows, a warm lamp light breathing round its edge, drawn in the
      // boat's frame so it stays on the door as she rocks (never a hand following him about)
      const sellD = !!(g.tut && g.tut.sellDoor);
      if (door || sellD) { const u = 0.14 * ppm, pulse = 0.55 + 0.45 * Math.sin(t * 2.6), fr = new Path2D();
        if (door) { fr.moveTo(16.5 * u, -10.8 * u); fr.lineTo(16.5 * u, -24.6 * u); fr.lineTo(21.5 * u, -24.6 * u); fr.lineTo(21.5 * u, -10.8 * u); }
        else { const x0 = 28.1, x1 = 35.9, y0 = -10.4, y1 = -2.1, r = 1.4; fr.moveTo((x0 + r) * u, y0 * u); fr.lineTo((x1 - r) * u, y0 * u); fr.quadraticCurveTo(x1 * u, y0 * u, x1 * u, (y0 + r) * u); fr.lineTo(x1 * u, (y1 - r) * u); fr.quadraticCurveTo(x1 * u, y1 * u, (x1 - r) * u, y1 * u); fr.lineTo((x0 + r) * u, y1 * u); fr.quadraticCurveTo(x0 * u, y1 * u, x0 * u, (y1 - r) * u); fr.lineTo(x0 * u, (y0 + r) * u); fr.quadraticCurveTo(x0 * u, y0 * u, (x0 + r) * u, y0 * u); }
        ctx.save(); ctx.lineJoin = 'round'; ctx.shadowColor = `rgba(255, 214, 150, ${(0.6 + 0.4 * pulse).toFixed(2)})`; ctx.shadowBlur = (6 + 8 * pulse) * Math.max(1, ppm / 40);
        ctx.strokeStyle = `rgba(255, 226, 170, ${(0.35 + 0.45 * pulse).toFixed(2)})`; ctx.lineWidth = Math.max(1.2, 0.45 * u); ctx.stroke(fr);
        ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255, 244, 214, ${(0.25 + 0.35 * pulse).toFixed(2)})`; ctx.lineWidth = Math.max(0.6, 0.15 * u); ctx.stroke(fr); ctx.restore(); }
      { const u = 0.14 * ppm, sh = 1 - dimB; for (let k = 0; k < 4; k++) { const p = ((t * 0.25 + k / 4) % 1); ctx.fillStyle = `rgba(${Math.round(90 * sh)},${Math.round(90 * sh)},${Math.round(92 * sh)},${(0.25 * (1 - p)).toFixed(3)})`; ctx.beginPath(); ctx.arc((13.5 + p * 8) * u, (-39 - p * 10) * u, (1 + p * 3) * u, 0, TAU); ctx.fill(); } } /* (7.6.25, owner) the stack's smoke drawn every frame, not baked with her four times a second */ drawBoatRadar(ctx, 0.14 * ppm, t, dimB); /* (7.4.0) smooth, every frame */ this.boatWays(ctx, g, t, 0.14 * ppm, Math.sqrt(dayEff)); ctx.restore(); // (3.0.0) turned with her heading
      this.boatFrame = { x: boatX, y: boatY, roll, rock: boatRock(t), sx: bsx, k: 0.14 * ppm, a: roll + boatRock(t), lit: 0.35 + 0.65 * Math.sqrt(dayEff) }; // (2.5.0: Earl on deck is drawn in this frame; the deck stations are gone)
      if (dayEff < 0.5) {
        // the cabin light stays on at night
        const a = (0.5 - dayEff) * 1.6;
        ctx.fillStyle = `rgba(255,196,120,${(0.85 * a).toFixed(3)})`;
        const u = 14 * ppm / 100;
        for (let k = 0; k < 3; k++) ctx.fillRect(-3 * u + k * 8 * u, -26 * u, 5 * u, 5 * u);
        this.boatLight = { x: boatX + 6 * u, y: boatY - 24 * u, a };
      } else this.boatLight = null;
      ctx.restore();
    } else { this.boatLight = null; this.boatFrame = null; }
    const sub = g.sub;
    let subLamps = null;
    // imploding: for a fraction of a second the hull folds in on itself, then it is gone
    const crumple = sub.imploded && g.implodeT != null && g.implodeT < 0.22 ? g.implodeT / 0.22 : -1;
    if ((!sub.imploded || crumple >= 0) && !(g.kill && g.kill.swallowed && g.kill.inSub) && inView(sub.x, sub.y, 10)) {
      if (crane && sub.docked) {
        ctx.strokeStyle = 'rgba(30,30,28,0.9)'; ctx.lineWidth = Math.max(1, ppm * 0.05);
        ctx.beginPath(); ctx.moveTo(boatX + crane.craneTip[0] * Math.sign(Math.cos(BOAT.yaw || 0) || 1) * Math.max(0.06, Math.abs(Math.cos(BOAT.yaw || 0))), boatY + crane.craneTip[1]); ctx.lineTo(S(sub.x), Sy(sub.y) - 2.6 * ppm); ctx.stroke(); // (turned with it; 7.3.0: the cable's lineTo and stroke had slipped into this comment, so it was never drawn)
      }
      // at night, the part of her above the water must be as dark as the night (the light map only
      // darkens below the surface; the boat is dimmed the same way): she is drawn on her own layer,
      // and everything above the wave line on it is dimmed
      const nightDim = 1 - (0.22 + 0.78 * Math.sqrt(dayEff));
      const awash = nightDim > 0.01 && sub.y - 4 < surfY(sub.x) + 1;
      let dctx = ctx, oc = null, ox = 0, oy = 0;
      if (awash) {
        oc = this.subNightC || (this.subNightC = document.createElement('canvas'));
        const ow = Math.ceil(18 * ppm), oh = Math.ceil(14 * ppm);
        if (oc.width !== ow || oc.height !== oh) { oc.width = ow; oc.height = oh; }
        dctx = oc.getContext('2d'); dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, ow, oh);
        ox = S(sub.x) - ow / 2; oy = Sy(sub.y) - oh / 2; dctx.translate(-ox, -oy);
      }
      const cy = Math.cos(sub.yaw), sxs = (cy >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy));
      dctx.save(); dctx.translate(S(sub.x), Sy(sub.y)); dctx.rotate(sub.tilt * Math.sign(sxs)); dctx.scale(sxs, 1);
      if (crumple >= 0) { const k = crumple * crumple; dctx.translate(0, -9 * ppm * 0.09); dctx.scale(1 - k * 0.55, 1 - k * 0.8); dctx.rotate((Math.random() - 0.5) * 0.2 * crumple); dctx.translate(0, 9 * ppm * 0.09); }
      // running lights on while the autopilot is driving it, so it can be seen coming
      // its lamps stay as he left them when he climbs out (off while docked at the boat)
      const lights = !sub.docked && (sub.lightsOn || (g.autopilot && g.autopilot.state !== 'idle' && !g.earl.inSub)); // running lights only while she drives herself empty; with Earl aboard, L decides
      // the arm reaching: its target, in the sub's own (flipped, tilted) frame
      let armArg = null;
      const ap = armPose(g);
      if (ap) {
        const cy0 = Math.cos(sub.yaw), sx0 = (cy0 >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy0)), rr = -sub.tilt * Math.sign(sx0);
        const dx = (ap.tx - sub.x) * ppm, dy = (ap.ty - sub.y) * ppm;
        armArg = { ext: ap.ext, closed: ap.closed, sp: ap.sp, len: ap.len, lx: (dx * Math.cos(rr) - dy * Math.sin(rr)) / sx0, ly: dx * Math.sin(rr) + dy * Math.cos(rr) };
      }
      const look = subLook(g.profile, g.addons);
      look.patches = sub.patches;
      if (g.siphon && g.siphon.sub) dctx.globalAlpha *= siphMix(g.siphon)[0]; // (7.6.8)
      const r = drawSub(dctx, 9 * ppm, t, sub.stress, lights, armArg, look);
      dctx.restore();
      // (6.5.1) the sub he can board: not a shape drawn round it but the sub itself, breathing. It is drawn a second time
      // into its own small canvas, exactly as it stands (any sub, any refit, turned or tilted); from that its own
      // outline gets a thin bone rim and a soft glow behind it, and its paint lifts a little and settles, slowly
      const homeK = g.homeFx && g.homeFx.t < 0.9 ? 1 - g.homeFx.t / 0.9 : 0; // (7.4.0, owner) home: the boarding rim and glow flare once and fade
      if ((g.tapMarks && g.tapMarks.some((m) => m.what === 'sub')) || homeK > 0) { // (awash at dusk it is drawn through its own canvas: the lift goes there too)
        const hw = Math.ceil(20 * ppm), hh = Math.ceil(16 * ppm), hx = S(sub.x) - hw / 2, hy = Sy(sub.y) - hh / 2;
        const hc = this.subHlC || (this.subHlC = document.createElement('canvas')), sc2 = this.subHlS || (this.subHlS = document.createElement('canvas'));
        for (const c of [hc, sc2]) if (c.width !== hw || c.height !== hh) { c.width = hw; c.height = hh; }
        const h1 = hc.getContext('2d'); h1.setTransform(1, 0, 0, 1, 0, 0); h1.clearRect(0, 0, hw, hh); h1.translate(-hx, -hy);
        h1.save(); h1.translate(S(sub.x), Sy(sub.y)); h1.rotate(sub.tilt * Math.sign(sxs)); h1.scale(sxs, 1); drawSub(h1, 9 * ppm, t, sub.stress, lights, armArg, look); h1.restore();
        const h2 = sc2.getContext('2d'); h2.setTransform(1, 0, 0, 1, 0, 0); h2.globalCompositeOperation = 'source-over'; h2.clearRect(0, 0, hw, hh); h2.drawImage(hc, 0, 0); h2.globalCompositeOperation = 'source-in'; h2.fillStyle = '#ece4cc'; h2.fillRect(0, 0, hw, hh);
        const q = homeK > 0 ? homeK : 0.5 + 0.5 * Math.sin(t * 2.2), d = Math.max(1.2, ppm * 0.045);
        // the rim and the glow, made in their own canvas: the bone shape spread a hair each way, a soft blur of it, then
        // the sub's own shape cut out, so only what lies outside its edge is left to lay over the scene
        const rc2 = this.subHlR || (this.subHlR = document.createElement('canvas')); if (rc2.width !== hw || rc2.height !== hh) { rc2.width = hw; rc2.height = hh; }
        const h3 = rc2.getContext('2d'); h3.setTransform(1, 0, 0, 1, 0, 0); h3.globalCompositeOperation = 'source-over'; h3.clearRect(0, 0, hw, hh);
        h3.save(); h3.globalAlpha = 0.5; h3.shadowColor = 'rgba(236,228,204,1)'; h3.shadowBlur = Math.max(8, ppm * 0.5); h3.drawImage(sc2, 0, 0); h3.restore();
        h3.globalAlpha = 1; for (const [ax, ay] of [[d, 0], [-d, 0], [0, d], [0, -d], [d * 0.7, d * 0.7], [-d * 0.7, d * 0.7], [d * 0.7, -d * 0.7], [-d * 0.7, -d * 0.7]]) h3.drawImage(sc2, ax, ay);
        h3.globalCompositeOperation = 'destination-out'; h3.drawImage(hc, 0, 0); h3.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * q; ctx.drawImage(rc2, hx, hy); ctx.restore();
        dctx.save(); dctx.globalCompositeOperation = 'screen'; dctx.globalAlpha = 0.1 + 0.14 * q; dctx.drawImage(hc, hx, hy); dctx.restore(); // its own paint, lifting and settling
      }
      // mid-turn the hull is seen nearly bow-on: draw its round cross-section over the squashed side view
      const bow = clamp(1 - Math.abs(cy) / 0.5, 0, 1);
      if (bow > 0) {
        const u2 = 9 * ppm / 100, bx = S(sub.x), by = Sy(sub.y);
        dctx.save(); dctx.globalAlpha = bow;
        const hg = dctx.createRadialGradient(bx - 4 * u2, by - 14 * u2, 1, bx, by - 9 * u2, 13 * u2);
        const Mk = SUB_MARKS[look.mark];
        hg.addColorStop(0, Mk.top ? Mk.top[0] : Mk.body[1]); hg.addColorStop(1, Mk.body[3]);
        dctx.fillStyle = hg; dctx.beginPath(); dctx.ellipse(bx, by - 9 * u2, 11 * u2, 11.5 * u2, 0, 0, TAU); dctx.fill();
        dctx.fillStyle = '#3e443b'; dctx.fillRect(bx - 4 * u2, by - 27 * u2, 8 * u2, 8 * u2);
        const sg = dctx.createRadialGradient(bx - 4 * u2, by + 6 * u2, 1, bx, by + 10 * u2, 13 * u2);
        sg.addColorStop(0, Mk.sphere[0]); sg.addColorStop(1, Mk.sphere[2]);
        dctx.fillStyle = sg; dctx.beginPath(); dctx.arc(bx, by + 10 * u2, 13 * u2, 0, TAU); dctx.fill();
        dctx.fillStyle = lights ? '#f0cf96' : '#2a261e'; dctx.beginPath(); dctx.arc(bx, by + 8 * u2, 3.4 * u2, 0, TAU); dctx.fill();
        if (lights) { dctx.fillStyle = '#f4f8ff'; dctx.beginPath(); dctx.arc(bx + 6 * u2, by - 6 * u2, 1.6 * u2, 0, TAU); dctx.fill(); }
        dctx.restore();
      }
      if (oc) {
        dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-atop';
        dctx.fillStyle = `rgba(4,6,10,${nightDim.toFixed(3)})`;
        dctx.beginPath(); dctx.moveTo(0, 0); dctx.lineTo(oc.width, 0);
        for (let px = oc.width; px >= -4; px -= 4) { const wx = sub.x + (px + ox - S(sub.x)) / ppm; dctx.lineTo(px, Sy(surfY(wx)) - oy); }
        dctx.closePath(); dctx.fill();
        dctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(oc, ox, oy);
      }
      if (lights) subLamps = r;
    }

    // ---- blood (lit by the same light model, so it reads dark green-black at depth) ----
    for (const b of g.blood) {
      if (!inView(b.x, b.y, 3)) continue;
      const a = 0.45 * (1 - b.t / b.life);
      const r = b.r * ppm;
      const bg = ctx.createRadialGradient(S(b.x), Sy(b.y), 0, S(b.x), Sy(b.y), r);
      bg.addColorStop(0, `rgba(120,8,10,${a.toFixed(3)})`); bg.addColorStop(1, 'rgba(90,6,8,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(S(b.x), Sy(b.y), r, 0, TAU); ctx.fill();
    }
    // ---- implosion: the gas in the hull crushed to a point, then the cloud it throws out ----
    if (g.implodeT != null && g.implodeT < 2.5 && inView(sub.x, sub.y, 20)) {
      const t0 = g.implodeT, cx = S(sub.x), cy = Sy(sub.y) - 0.8 * ppm;
      const R = t0 < 0.22 ? 5 * (1 - t0 / 0.22) + 0.3 : 0.3 + 7 * Math.sqrt((t0 - 0.22) / 2.3);
      const a = t0 < 0.22 ? 0.25 + t0 * 2 : 0.7 * (1 - (t0 - 0.22) / 2.3);
      const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * ppm);
      ig.addColorStop(0, `rgba(235,245,240,${(a * 0.9).toFixed(3)})`); ig.addColorStop(0.6, `rgba(160,190,185,${(a * 0.35).toFixed(3)})`); ig.addColorStop(1, 'rgba(120,150,150,0)');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, R * ppm, 0, TAU); ctx.fill();
      if (t0 > 0.22) { // the shock front
        ctx.strokeStyle = `rgba(220,235,230,${(0.5 * (1 - (t0 - 0.22) / 0.8)).toFixed(3)})`; ctx.lineWidth = Math.max(1, ppm * 0.12);
        if (t0 < 1.02) { ctx.beginPath(); ctx.arc(cx, cy, (t0 - 0.22) * 30 * ppm, 0, TAU); ctx.stroke(); }
      }
    }
    // ---- implosion debris ----
    for (const d of g.debris) {
      if (!inView(d.x, d.y)) continue;
      ctx.save(); ctx.translate(S(d.x), Sy(d.y)); ctx.rotate(d.rot);
      // (4.8.3) torn plating: a jagged steel shard, a lit edge where it was ripped, a little rust; three shapes
      const r = d.size * ppm, kind = Math.floor((d.size * 997) % 3);
      const pts = kind === 0 ? [[-1, -0.25], [-0.2, -0.45], [0.35, -0.2], [1, 0.05], [0.1, 0.38], [-0.55, 0.2]] : kind === 1 ? [[-0.9, 0.1], [-0.3, -0.5], [0.8, -0.3], [0.45, 0.3], [-0.1, 0.15]] : [[-0.7, -0.35], [0.9, -0.15], [0.2, 0.45]];
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * r, py * r) : ctx.moveTo(px * r, py * r))); ctx.closePath();
      const sg = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5); sg.addColorStop(0, '#5a6164'); sg.addColorStop(1, '#2a2f31');
      ctx.fillStyle = sg; ctx.fill();
      ctx.strokeStyle = 'rgba(190,200,205,0.55)'; ctx.lineWidth = Math.max(0.6, r * 0.08); ctx.beginPath(); ctx.moveTo(pts[0][0] * r, pts[0][1] * r); ctx.lineTo(pts[1][0] * r, pts[1][1] * r); ctx.stroke(); // the torn edge
      ctx.fillStyle = 'rgba(140,72,34,0.45)'; ctx.beginPath(); ctx.arc(pts[2][0] * r * 0.5, pts[2][1] * r * 0.4, r * 0.18, 0, TAU); ctx.fill(); // rust
      ctx.restore();
    }
    // ---- Earl ----
    const e = g.earl;
    let head = null;
    // released gallery fish: their names, softly, when Earl is close
    for (const c of g.fauna.list) {
      if (!c.pet || Math.hypot(c.x - g.earl.x, c.y - g.earl.y) > 14) continue;
      ctx.save(); ctx.font = `${Math.max(11, ppm * 0.4)}px serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(240,226,190,0.8)';
      ctx.fillText((c.pet.famous ? '★ ' : '') + (c.pet.name || c.sp.name), S(c.x), Sy(c.y - c.len * 0.8) - 6); ctx.restore();
    }
    // the sub's trawl (2.3.5): two cables from the belly hatch to the net's mouth (a headrope with orange
    // floats, a footrope with dark weights), the mesh bag streaming behind it to a tied cod end, the catch
    // bunched in the end; the drawstring pulls the mouth shut; torn, it hangs in rags as the catch scatters
    if (g.subNet) {
      const n = g.subNet, T = n.T, dir = n.dir, h = hatchAt(g);
      const torn = n.phase === 'torn', fade = torn ? clamp(1 - n.pt / 1.6, 0, 1) : 1;
      const r = Math.max(0.12, T.mouth * n.open), mx = n.mx, my = n.my;
      const hauling = n.phase === 'haul' ? Math.min(1, n.pt / NET_HAUL) : 0;
      const bagLen = (n.phase === 'drop' ? Math.min(1, n.pt / NET_DROP) : 1) * (1 - hauling * 0.85) * (T.mouth * 3.2 + 2.5);
      const sway = Math.sin(t * 1.6) * 0.25;
      const X = (f) => mx - dir * bagLen * f;
      const half = (f) => Math.max(0.1, r * (1 - f * 0.78)) + Math.sin(f * Math.PI) * 0.12 * n.open;
      const cyf = (f) => my + sway * f * f + f * 0.35;
      const lw = Math.max(1, ppm * 0.04);
      ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round';
      // the hatch under the belly, open
      ctx.fillStyle = '#141614'; ctx.fillRect(S(h.x) - ppm * 0.5, Sy(h.y) - ppm * 0.08, ppm, ppm * 0.16);
      // the cables, from the hatch to the top and bottom of the mouth
      ctx.strokeStyle = 'rgba(70,74,70,0.95)'; ctx.lineWidth = Math.max(1, ppm * 0.035);
      ctx.beginPath(); ctx.moveTo(S(h.x), Sy(h.y)); ctx.quadraticCurveTo(S((h.x + mx) / 2), Sy((h.y + my) / 2 + 0.6), S(mx), Sy(my - r));
      ctx.moveTo(S(h.x), Sy(h.y)); ctx.quadraticCurveTo(S((h.x + mx) / 2), Sy((h.y + my) / 2 + 1.0), S(mx), Sy(my + r)); ctx.stroke();
      // the bag
      const bag = new Path2D(); bag.moveTo(S(X(0)), Sy(cyf(0) - half(0)));
      for (let i = 1; i <= 14; i++) { const f = i / 14; bag.lineTo(S(X(f)), Sy(cyf(f) - half(f))); }
      for (let i = 14; i >= 0; i--) { const f = i / 14; bag.lineTo(S(X(f)), Sy(cyf(f) + half(f))); }
      bag.closePath();
      if (!torn) { ctx.fillStyle = 'rgba(110,125,110,0.14)'; ctx.fill(bag); }
      ctx.save();
      if (torn) { // a ragged hole where it burst: the mesh is drawn everywhere but there
        const cut = new Path2D(bag); cut.ellipse(S(X(0.45)), Sy(cyf(0.45)), ppm * (0.8 + n.pt), ppm * (0.6 + n.pt * 0.6), 0.4, 0, TAU);
        ctx.clip(cut, 'evenodd');
      } else ctx.clip(bag);
      ctx.strokeStyle = 'rgba(200,210,190,0.4)'; ctx.lineWidth = Math.max(0.6, ppm * 0.018);
      ctx.beginPath();
      const nl = 8;
      for (let j = 0; j <= nl; j++) { const v = j / nl * 2 - 1; for (let i = 0; i <= 16; i++) { const f = i / 16, y = cyf(f) + half(f) * v + Math.sin(f * 8 + j + t * 2.5) * 0.04; if (i) ctx.lineTo(S(X(f)), Sy(y)); else ctx.moveTo(S(X(f)), Sy(y)); } }
      for (let i = 0; i <= 18; i++) { const f = Math.pow(i / 18, 0.85); ctx.moveTo(S(X(f)), Sy(cyf(f) - half(f))); ctx.quadraticCurveTo(S(X(f) + dir * 0.12), Sy(cyf(f)), S(X(f)), Sy(cyf(f) + half(f))); }
      ctx.stroke();
      ctx.restore();
      if (!torn) { ctx.strokeStyle = 'rgba(205,212,195,0.6)'; ctx.lineWidth = lw; ctx.stroke(bag); }
      // the cod end, tied off
      ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(S(X(1)), Sy(cyf(1)), Math.max(2, ppm * 0.08), 0, TAU); ctx.fill();
      // the mouth: headrope with floats, footrope with weights, and the drawstring as it closes
      // (6.5.1) the mouth is a solid ring seen at an angle (an oval), the bag hanging from all of it: its far half dimmer,
      // its near half lit along the top; rope on the basic net, a steel hoop on the advanced
      { const adv = n.tier !== 'basic', rx = Math.max(2, r * ppm * 0.32), ry = Math.max(2, r * ppm), lw2 = Math.max(1.5, ppm * (adv ? 0.07 : 0.055)), col = adv ? 'rgba(120,122,116,0.95)' : 'rgba(205,188,140,0.95)';
        ctx.strokeStyle = adv ? 'rgba(60,62,58,0.8)' : 'rgba(120,104,70,0.75)'; ctx.lineWidth = lw2; ctx.beginPath(); ctx.ellipse(S(mx), Sy(my), rx, ry, 0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, dir > 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke();
        ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(S(mx), Sy(my), rx, ry, 0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,248,230,0.4)'; ctx.lineWidth = Math.max(0.8, lw2 * 0.4); ctx.beginPath(); ctx.ellipse(S(mx), Sy(my) - lw2 * 0.3, rx, ry, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.fillStyle = '#e8762a'; for (const f of [-0.35, 0.35]) { ctx.beginPath(); ctx.arc(S(mx - dir * 0.3 + f * 0.4), Sy(my - r - 0.05), Math.max(1.6, ppm * 0.09), 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#2a2c2a'; for (const f of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.arc(S(mx - dir * 0.2 + f * 0.4), Sy(my + r + 0.05), Math.max(1.6, ppm * 0.08), 0, TAU); ctx.fill(); }
      // (6.5.1) something in it: the mouth breathes with a faint warm light (as the trawl button does) until it is closed
      if (n.phase === 'tow' && n.got && n.got.length) { const q = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const [w, a] of [[Math.max(6, ppm * 0.32), 0.1], [Math.max(3, ppm * 0.14), 0.22]]) { ctx.strokeStyle = `rgba(226,196,140,${(a * (0.55 + 0.45 * q)).toFixed(3)})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(S(mx), Sy(my - r)); ctx.quadraticCurveTo(S(mx + dir * 0.25), Sy(my), S(mx), Sy(my + r)); ctx.stroke(); }
        ctx.restore(); }
      ctx.restore();
      if (!torn) for (const c of n.got) { // what it holds, bunched toward the cod end
        const f = 0.55 + ((c.wob || 0) * 7 % 1) * 0.35, fy = cyf(f) + ((c.wob || 0) * 13 % 1 - 0.5) * half(f) * 1.2;
        ctx.save(); ctx.translate(S(X(f)), Sy(fy)); if (dir > 0) ctx.scale(-1, 1); ctx.globalAlpha = 0.85; drawSpecies(ctx, c.sp, Math.max(4, Math.min(fishDrawLen(c.len), bagLen * 0.5) * ppm), t * 3 + (c.wob || 0), 1, 0); ctx.restore();
      }
    }
    // (no names floating over the deck: the prompt at the bottom says what F does)
    if (!e.inSub && !g.helm && g.mode !== 'menu' && !(g.kill && g.kill.swallowed)) { // at the helm he is inside the wheelhouse
      const amb = ambientAt(e.y, dayEff);
      ctx.save();
      const A0 = g.aboard, bf = this.boatFrame;
      if (A0 && A0.inFrame && bf && A0.lx != null) { ctx.translate(bf.x, bf.y); ctx.rotate(bf.a); ctx.translate(A0.lx * ppm, A0.ly * ppm); } // aboard: in the boat's own frame, rocking with her
      else ctx.translate(S(e.x), Sy(e.y));
      ctx.scale(e.facing, 1); ctx.rotate(e.angle);
      const moving = g.aboard || g.ashore ? 0 : clamp(e.speedNow / 3, 0, 1);
      const lampCol = e.lampOn ? rgbStr(mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift)) : null;
      // what he is holding, and what is in his bag
      let gear = null;
      if (g.mode === 'play' && g.profile) {
        const tool = activeTool(g);
        // the aim, in his own frame (he is drawn flipped by facing, then rotated by his angle)
        let aimLocal = null;
        if (tool.kind === 'tag' || tool.kind === 'cam') {
          // the cursor if he uses the mouse, otherwise straight ahead (as the dart flies)
          const wa = g.aim !== null && g.aim !== undefined ? g.aim : (e.facing > 0 ? 0 : Math.PI);
          aimLocal = Math.atan2(Math.sin(wa), Math.cos(wa) * e.facing) - e.angle;
          aimLocal = Math.atan2(Math.sin(aimLocal), Math.cos(aimLocal));
        }
        gear = { kind: tool.kind === 'trap' ? 'none' : tool.kind, tier: tool.tier, t, sweep: g.capture && g.capture.kind === tool.kind ? clamp(g.capture.t / g.capture.dur, 0, 1) : null,
          catchSp: g.netCatch, held: g.slurpHeld, bag: g.bag.map((sp) => ({ col: SPECIES_BY_ID[sp.id].v.c[0] })),
          aimLocal, loaded: !(g.capture && g.capture.kind === 'tag'), flash: g.camFlash || 0, suit: e.suit, finLook: e.finLook, tankLook: e.tankLook, suitGlow: e.suitGlow };
      }
      if (g.ashore) gear = { kind: 'none', tier: 0, t, suit: e.suit, bag: [], land: true, noTank: true, noMask: true, tankLook: e.tankLook, suitGlow: e.suitGlow, walk: g.ashore.walk || 0 }; // (7.4.17) on the island: as on deck
      if (g.aboard) { // on deck: tools stowed, boots on, no tank or mask; on the ladder: tank and mask still on, hands on the rungs
        const P0 = g.aboard.pose, onDeck = P0 === 'deck' && !(g.aboard.jump > 0);
        gear = { kind: 'none', tier: 0, t, suit: e.suit, bag: [], land: true, noTank: onDeck, noMask: onDeck, tankLook: e.tankLook, suitGlow: e.suitGlow };
        if (onDeck) gear.walk = g.aboard.walk || 0;
        else if (P0 === 'climb') gear.climb = g.aboard.rung || 0;
      }
      const sm0 = g.siphon && !g.siphon.sub ? siphMix(g.siphon)[0] : 1; if (sm0 < 1) { ctx.globalAlpha *= sm0; if ('filter' in ctx) ctx.filter = `grayscale(${(1 - sm0).toFixed(2)})`; } // (7.6.8) Siphon: he greys and fades
      const h = drawEarl(ctx, (g.aboard || g.ashore ? 1.7 : EARL_H) * ppm, e.kick, moving, lampCol, amb, gear); // (standing on deck he is drawn at a man's height)
      if (sm0 < 1 && 'filter' in ctx) ctx.filter = 'none';
      // (7.6.7, owner) Temper: heat colours on his own figure, never round him. He is drawn again on a side canvas under
      // the same transform, only his own pixels are coloured (straw, bronze, purple and steel blue, as tempered steel,
      // running slowly along him), and that is laid over him; Adamant's colours run deeper and brighter
      const ironK = g.ironT > 0 ? Math.min(1, g.ironT / 1.5, (g.ironFx ? g.ironFx.t : 9) * 3) : 0; // (7.6.8, owner) Ironskin: the suit turned to iron, the same way
      if (((g.temper && g.temper.k > 0.01) || ironK > 0.01) && !e.inSub && g.mode === 'play') { const T = ironK > 0.01 ? { tier: 'iron', k: ironK } : g.temper, oc = this.suitC || (this.suitC = document.createElement('canvas')); if (oc.width !== this.c.width || oc.height !== this.c.height) { oc.width = this.c.width; oc.height = this.c.height; }
        const ox = oc.getContext('2d'); ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'source-over'; ox.clearRect(0, 0, oc.width, oc.height); ox.setTransform(ctx.getTransform());
        drawEarl(ox, (g.aboard || g.ashore ? 1.7 : EARL_H) * ppm, e.kick, moving, lampCol, amb, gear);
        ox.globalCompositeOperation = 'source-atop'; // (in his own drawing frame, so the colour always runs head to foot however he lies)
        const Hd = (g.aboard || g.ashore ? 1.7 : EARL_H) * ppm, p0 = (g.time * 0.35) % 1.4 - 0.2, hg = ox.createLinearGradient(0, -Hd * 0.6, 0, Hd * 0.6), BASE = T.tier === 'iron' ? '#7e8890' : '#b8581a'; // the tempering band sweeps head to foot over a copper heat; iron: gunmetal, a cold sheen sweeping
        hg.addColorStop(0, BASE); for (const [o2, c2] of (T.tier === 'iron' ? [[p0 - 0.2, BASE], [p0 - 0.06, '#c8d0d6'], [p0, '#f2f6f8'], [p0 + 0.06, '#c8d0d6'], [p0 + 0.2, BASE]] : [[p0 - 0.3, BASE], [p0 - 0.18, '#f6cc66'], [p0 - 0.06, '#ec7a28'], [p0 + 0.06, '#b044d4'], [p0 + 0.18, '#3c86ff'], [p0 + 0.3, BASE]])) if (o2 > 0 && o2 < 1) hg.addColorStop(o2, c2); hg.addColorStop(1, BASE);
        // his own shading kept: his figure lightened, the heat multiplied into it, then cut back to his outline (a mask copy)
        const mc = this.suitM || (this.suitM = document.createElement('canvas')); if (mc.width !== oc.width || mc.height !== oc.height) { mc.width = oc.width; mc.height = oc.height; }
        const mx3 = mc.getContext('2d'); mx3.setTransform(1, 0, 0, 1, 0, 0); mx3.globalCompositeOperation = 'copy'; mx3.drawImage(oc, 0, 0); mx3.globalCompositeOperation = 'source-over';
        ox.fillStyle = 'rgba(255,255,255,0.55)'; ox.fillRect(-Hd, -Hd, Hd * 2, Hd * 2);
        ox.globalCompositeOperation = 'multiply'; ox.fillStyle = hg; ox.fillRect(-Hd, -Hd, Hd * 2, Hd * 2);
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'destination-in'; ox.drawImage(mc, 0, 0); ox.globalCompositeOperation = 'source-over';
        this.temperDraw = { lv: T.tier === 'iron' ? 0.62 : T.tier === 'legendary' ? 0.85 : T.tier === 'exotic' ? 0.7 : 0.55, k: T.k, leg: T.tier === 'legendary' }; // laid over the scene later, after the deep's darkness (see the skill effects)
      } else this.temperDraw = null;
      ctx.restore();
      // (7.6.8, owner) Siphon: the squid of the tier where he is, mantle first along the jet, belly down whichever way
      // (never turned over, never more than 70 degrees off level); larger for the sub
      if (g.siphon && g.mode === 'play') { const Q = g.siphon, a = siphMix(Q)[1]; if (a > 0.01) { const sid = Q.A.siphon.sp, sp = sid === 'colossal' ? (this.colossalSp || (this.colossalSp = SPECIES.find((s2) => /colossal squid/i.test(s2.name)))) : SPECIES_BY_ID[sid];
        if (sp) { const M = Q.sub ? g.sub : e, Lp = Q.A.siphon.len * ppm * (Q.sub ? 1.5 : 1), right = Q.dx >= 0, ang = clamp(Math.atan2(Q.dy, Math.abs(Q.dx)), -1.22, 1.22);
          ctx.save(); ctx.translate(S(M.x), Sy(M.y)); ctx.globalAlpha = a; if (right) { ctx.rotate(ang); ctx.scale(-1, 1); } else ctx.rotate(-ang);
          drawSpecies(ctx, sp, Lp, g.time * 1.6, 1, 0); this.siphLead = { x: S(M.x) + Q.dx * Lp * 0.5, y: Sy(M.y) + Q.dy * Lp * 0.5, Lp, a, mx: ctx.getTransform() };
          ctx.restore(); } } } else this.siphLead = null;
      // (2.8.2) a Legendary's wake: a few dim motes that school with him, shaped by the net's skill (trail.js)
      if (e.trail && !e.inSub && !g.aboard && g.mode === 'play') {
        const wk = this.wake || (this.wake = new Wake());
        wk.update(e, g.time, e.trailKind); wk.draw(ctx, S, Sy, ppm, e.trail, !!e.lampOn, g.time);
      } else if (this.wake) this.wake.reset();
      if (h.tip) {
        const ca2 = Math.cos(e.angle), sa2 = Math.sin(e.angle);
        g.toolTip = { x: e.x + e.facing * (h.tip.x * ca2 - h.tip.y * sa2) / ppm, y: e.y + (h.tip.x * sa2 + h.tip.y * ca2) / ppm };
      }
      // (5.7.0) the net's swing leaves a trace: a pale arc of stirred water where the hoop went, fading over half a
      // second, a few bubbles torn off it. A quick net draws a short, sharp arc; a slow one a long sweep
      // (5.8.0) the net's swing: no drawn trail, only a few bubbles shed from the hoop as it sweeps (five or six a swing)
      { const cap = g.capture;
        if (cap && cap.kind === 'net' && g.toolTip && !e.inSub) { if (this.swingCap !== cap) { this.swingCap = cap; this.swingN = 0; }
          const want = Math.floor((cap.t / cap.dur) * 6); while (this.swingN < want && this.swingN < 6 && g.bubbles) { this.swingN++; g.bubbles.push({ x: g.toolTip.x + (Math.random() - 0.5) * 0.25, y: g.toolTip.y + (Math.random() - 0.5) * 0.2, r: 0.02 + Math.random() * 0.05, w: Math.random() * 6, t: 0 }); } } }
      // tag darts in flight
      for (const d of g.darts || []) {
        ctx.save(); ctx.translate(S(d.x), Sy(d.y)); ctx.rotate(Math.atan2(d.vy, d.vx));
        drawDart(ctx, EARL_H * ppm / 100, d.tier, -12 * EARL_H * ppm / 100, t);
        ctx.restore();
        if (d.adv) glowPts.push([S(d.x), Sy(d.y), '#9fe8ff', ppm * 0.9, 0.9]); // an advanced tag glows faintly
      }
      // the camera's flash lights the water for a moment
      // a wet-welding arc: blue-white, flickering, lighting the hull and the water around it
      if (g.welding) { const fl = 0.55 + 0.45 * Math.random(); glowPts.push([S(g.welding.x), Sy(g.welding.y), '#d4e6ff', ppm * (5 + 4 * fl), 1.7 * fl]); }
      if (g.camFlash > 0 && g.toolTip) glowPts.push([S(g.toolTip.x), Sy(g.toolTip.y), '#f4f8ff', ppm * 3 * g.camFlash, 1.5 * g.camFlash]);
      // animals on their way into the net or up the slurp gun's barrel
      for (const f of g.captureFx || []) {
        if (!g.toolTip) break;
        const k = clamp(f.t / f.dur, 0, 1), ek = k * k;
        const fx2 = f.x + (g.toolTip.x - f.x) * ek, fy2 = f.y + (g.toolTip.y - f.y) * ek - Math.sin(k * Math.PI) * clamp(Math.hypot(g.toolTip.x - f.x, g.toolTip.y - f.y) * 0.35, 0.1, 0.5); /* (5.9.3) flicked up and over into the net, not slid */
        const Lf = Math.max(4, fishDrawLen(f.len) * ppm * (1 - 0.4 * k));
        ctx.save(); ctx.translate(S(fx2), Sy(fy2)); if (f.dir > 0) ctx.scale(-1, 1);
        ctx.rotate(Math.sin(t * 30) * 0.4 * k); ctx.globalAlpha = 1 - k * 0.6;
        drawSpecies(ctx, f.sp, Lf, t * 4, 1, 0);
        ctx.restore();
      }
      // head position in screen space (for the beam)
      const ca = Math.cos(e.angle), sa = Math.sin(e.angle);
      head = { x: S(e.x) + (h.headX * ca - h.headY * sa) * e.facing, y: Sy(e.y) + (h.headX * sa + h.headY * ca), beamA: h.beamA };
    }
    // ---- front kelp ----
    if (!(this.skip && this.skip.kelp)) this.drawKelp(g, S, Sy, ppm, 1, x0, x1);
    // ---- bubbles ----
    ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = Math.max(0.8, ppm * 0.02);
    // (4.5.0) every bubble in one path and one stroke (a stroke each was what made a burst of them slow)
    ctx.beginPath();
    for (const b of g.bubbles) {
      if (!inView(b.x, b.y)) continue;
      const bx = S(b.x), by = Sy(b.y), br = Math.max(1, b.r * ppm);
      ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU);
    }
    ctx.stroke();
    // ---- marine snow ----
    this.drawSnow(g, S, Sy, ppm, x0, x1, y0, y1);
    // ---- foam on the crests of storm waves ----
    if (g.waveBoost > 0.12 && horizon > -60 && horizon < H + 40) {
      const fa = clamp((g.waveBoost - 0.12) * 1.6, 0, 1);
      ctx.strokeStyle = `rgba(200,210,212,${(0.5 * fa).toFixed(3)})`; ctx.lineWidth = Math.max(1, ppm * 0.07);
      ctx.beginPath();
      let prev = null;
      for (let sx = -10; sx <= W + 20; sx += 8) {
        const wx = cam.x + (sx - W / 2) / ppm, y = surfY(wx);
        const crest = y < -waveAmp * 0.55; // only near the tops of the swell
        if (crest) { const py = Sy(y); if (prev) ctx.lineTo(sx, py); else ctx.moveTo(sx, py); prev = 1; }
        else prev = null;
      }
      ctx.stroke();
      // streaks of foam trailing down the backs of the waves
      ctx.fillStyle = `rgba(190,200,204,${(0.25 * fa).toFixed(3)})`;
      for (let k = 0; k < 60; k++) {
        const wx = Math.floor(cam.x / 3) * 3 + (k - 30) * 3 + Math.sin(k * 7.1) * 1.2;
        const y = surfY(wx);
        if (y > -waveAmp * 0.2) continue;
        ctx.fillRect(S(wx), Sy(y) + ppm * (0.15 + Math.abs(Math.sin(k * 3.3)) * 0.6), ppm * (0.6 + Math.abs(Math.sin(k)) * 1.2), Math.max(1, ppm * 0.05));
      }
    }
    // ---- surface underside shimmer ----
    if (horizon > -20 && horizon < H + 20) {
      ctx.strokeStyle = `rgba(220,245,255,${(0.25 + 0.35 * dayEff).toFixed(3)})`; ctx.lineWidth = Math.max(1, ppm * 0.06);
      ctx.beginPath();
      let on = false; // (7.4.17) broken where land stands above the water (the island): the line only on water
      for (let sx = -10; sx <= W + 20; sx += 12) { const wx = cam.x + (sx - W / 2) / ppm, y = surfY(wx); if (g.world.floorAt(wx) < y + 0.15) { on = false; continue; } if (on) ctx.lineTo(sx, Sy(y) + 1); else ctx.moveTo(sx, Sy(y) + 1); on = true; }
      ctx.stroke();
    }

    // (7.6.29, owner) Plunge's anchor and chain are drawn with the world, before the light, so the water and his lamp
    // light them as they light everything else (drawn over the light, they stood out flat and the dark shifted round them)
    if (g.mode === 'play' && (g.sinkK || 0) > 0.01 && g.sinkLast) { const e = g.earl, m = e.inSub ? g.sub : e, tier = g.sinkLast.tier, t = g.time, hold = !!e.sinkHold;
      const sh = hold ? (Math.random() - 0.5) * 2.2 : 0, ax0 = S(m.x) + sh, ay0 = Sy(m.y) + (e.inSub ? 2.0 : 0.55) * ppm, Lc = (e.inSub ? 4.6 : 2.6) * ppm, sway = hold ? 0 : Math.sin(t * 1.7) * ppm * 0.18;
      const ax1 = ax0 + sway, ay1 = ay0 + Lc, sc = ppm * (e.inSub ? 1.9 : 1.15) * (tier === 'legendary' ? 1.15 : 1);
      ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = g.sinkK; // (7.6.29) it fades as it lets go
      // the chain: oval links turned alternately, dark iron lit on one edge
      const n = Math.max(6, Math.round(Lc / (sc * 0.22)));
      for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, cx = ax0 + (ax1 - ax0) * k + Math.sin(k * Math.PI) * sway * 0.6, cy = ay0 + Lc * k, side = i % 2 === 0;
        ctx.strokeStyle = '#141412'; ctx.lineWidth = Math.max(1.2, sc * 0.05); ctx.beginPath(); ctx.ellipse(cx, cy, side ? sc * 0.05 : sc * 0.025, sc * 0.1, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = hold ? 'rgba(206,196,170,0.6)' : 'rgba(150,146,130,0.45)'; ctx.lineWidth = Math.max(0.6, sc * 0.018); ctx.beginPath(); ctx.ellipse(cx - sc * 0.01, cy, side ? sc * 0.04 : sc * 0.02, sc * 0.085, 0, Math.PI * 0.8, Math.PI * 1.5); ctx.stroke(); }
      // the anchor: ring, stock, shank, curved arms with flukes
      ctx.translate(ax1, ay1); ctx.rotate(hold ? sh * 0.02 : Math.sin(t * 1.3) * 0.06);
      const iron = ctx.createLinearGradient(-sc * 0.5, 0, sc * 0.5, 0); iron.addColorStop(0, tier === 'legendary' ? '#3a4636' : '#3a3a36'); iron.addColorStop(0.45, tier === 'legendary' ? '#5a6a52' : '#5c5a52'); iron.addColorStop(1, '#151614');
      ctx.strokeStyle = '#0c0c0b'; ctx.fillStyle = iron;
      const body = new Path2D(); body.moveTo(-sc * 0.05, sc * 0.08); body.lineTo(sc * 0.05, sc * 0.08); body.lineTo(sc * 0.06, sc * 0.86); body.lineTo(-sc * 0.06, sc * 0.86); body.closePath(); // the shank
      body.moveTo(-sc * 0.34, sc * 0.2); body.lineTo(sc * 0.34, sc * 0.2); body.lineTo(sc * 0.32, sc * 0.27); body.lineTo(-sc * 0.32, sc * 0.27); body.closePath(); // the stock
      body.moveTo(-sc * 0.06, sc * 0.78); body.bezierCurveTo(-sc * 0.3, sc * 0.82, -sc * 0.44, sc * 0.66, -sc * 0.46, sc * 0.5); body.lineTo(-sc * 0.56, sc * 0.56); body.lineTo(-sc * 0.48, sc * 0.4); body.lineTo(-sc * 0.38, sc * 0.5); body.lineTo(-sc * 0.4, sc * 0.52); body.bezierCurveTo(-sc * 0.36, sc * 0.68, -sc * 0.24, sc * 0.74, -sc * 0.06, sc * 0.7); body.closePath(); // the left arm and its fluke
      body.moveTo(sc * 0.06, sc * 0.78); body.bezierCurveTo(sc * 0.3, sc * 0.82, sc * 0.44, sc * 0.66, sc * 0.46, sc * 0.5); body.lineTo(sc * 0.56, sc * 0.56); body.lineTo(sc * 0.48, sc * 0.4); body.lineTo(sc * 0.38, sc * 0.5); body.lineTo(sc * 0.4, sc * 0.52); body.bezierCurveTo(sc * 0.36, sc * 0.68, sc * 0.24, sc * 0.74, sc * 0.06, sc * 0.7); body.closePath(); // the right
      ctx.lineWidth = Math.max(1.2, sc * 0.04); ctx.stroke(body); ctx.fill(body);
      ctx.lineWidth = Math.max(1.4, sc * 0.045); ctx.beginPath(); ctx.arc(0, sc * 0.03, sc * 0.08, 0, TAU); ctx.stroke(); // the ring
      ctx.strokeStyle = 'rgba(214,206,180,0.35)'; ctx.lineWidth = Math.max(0.6, sc * 0.015); ctx.beginPath(); ctx.moveTo(-sc * 0.03, sc * 0.12); ctx.lineTo(-sc * 0.035, sc * 0.82); ctx.stroke(); // light along the shank
      if (tier !== 'rare') { ctx.fillStyle = 'rgba(120,64,34,0.55)'; for (const [px, py, r] of [[0.02, 0.4, 0.05], [-0.3, 0.62, 0.04], [0.33, 0.6, 0.035], [0.15, 0.23, 0.03]]) { ctx.beginPath(); ctx.ellipse(px * sc, py * sc, r * sc, r * sc * 0.6, 0.4, 0, TAU); ctx.fill(); } } // rust
      if (tier === 'legendary') { ctx.fillStyle = '#c8c4b0'; ctx.strokeStyle = '#2a2a22'; ctx.lineWidth = 0.8; for (const [px, py] of [[-0.42, 0.52], [-0.38, 0.6], [0.4, 0.55], [0.03, 0.58], [-0.02, 0.7], [0.27, 0.22]]) { ctx.beginPath(); ctx.moveTo(px * sc - sc * 0.03, py * sc + sc * 0.02); ctx.lineTo(px * sc, py * sc - sc * 0.035); ctx.lineTo(px * sc + sc * 0.03, py * sc + sc * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke(); } // barnacles
        ctx.strokeStyle = 'rgba(70,104,60,0.8)'; ctx.lineWidth = Math.max(0.8, sc * 0.02); for (const [px, k] of [[-0.31, 1], [0.32, -1], [0.05, 1]]) { ctx.beginPath(); ctx.moveTo(px * sc, sc * 0.25); ctx.bezierCurveTo(px * sc + k * sc * 0.06, sc * 0.4 + Math.sin(t * 2 + px * 9) * sc * 0.03, px * sc - k * sc * 0.05, sc * 0.55, px * sc + k * sc * 0.04, sc * 0.72); ctx.stroke(); } } // weed trailing off the stock
      ctx.restore();
      // the water's struggle: bubbles driven up past him and silt dragged down while he holds; a few rising always
      if (g.bubbles && Math.random() < (hold ? 0.9 : 0.35)) g.bubbles.push({ x: m.x + (Math.random() - 0.5) * (e.inSub ? 3 : 1.2), y: m.y + (e.inSub ? 1.5 : 0.4), r: 0.03 + Math.random() * 0.07, w: Math.random() * 6, t: 0 });
      if (hold) { ctx.save(); ctx.strokeStyle = 'rgba(150,140,110,0.28)'; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const px = S(m.x) + Math.sin(i * 12.9 + t) * ppm * 1.6, py = Sy(m.y) + ((t * 2.4 + i * 0.37) % 1) * ppm * 3 - ppm * 0.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 0.5, py + ppm * 0.18); ctx.stroke(); } ctx.restore(); }
    }
    // (7.6.32, owner) drawn with the world, before the light, so the deep's dark and his lamp fall on the school as on any fish;
    // Silverstorm is six oversized whipnose anglers whose lures light the water. When it ends the school swims off
    if (g.mode === 'play' && g.shoalFx) { const F = g.shoalFx, e = g.earl, m = e.inSub ? g.sub : e, fade = Math.min(1, F.t / 0.15), out = Math.max(0, F.t - F.dur), outK = Math.min(1, out / 3.5), n = [0, 16, 28, 6][F.lv], big = F.lv >= 3, now = g.time, dt = Math.min(0.05, Math.max(0, now - (F.rt ?? now))); F.rt = now;
      if (F.cx == null) { const side = -(e.facing || 1); F.cx = m.x + side * (this.W / 2 / ppm + 4); F.cy = m.y + 1.5; F.vx = -side * 9; F.vy = -0.4; F.hd = Math.atan2(0, F.vx); } /* (7.6.19, owner) the school rushes in from off the screen behind him, never appearing out of nowhere */
      // (7.7.2, owner) when he shoots off (a squid's jet, a dash) the school is carried along with him, not flung after him:
      // whatever part of his move is faster than a fish can swim (4 m/s) moves the whole school with him
      { const mx = m.x, my = m.y; if (F.mx != null && dt > 0) { const ddx = mx - F.mx, ddy = my - F.my, sp0 = Math.hypot(ddx, ddy) / dt; if (sp0 > 4) { const k = (sp0 - 4) / sp0, cx = ddx * k, cy = ddy * k; F.cx += cx; F.cy += cy; if (F.fishN) for (const f of F.fishN) { f.x += cx; f.y += cy; } } } F.mx = mx; F.my = my; }
      const orb = (e.inSub ? 5.5 : 2.4) * (1 + F.lv * 0.1), th = F.t * 0.33 + Math.sin(F.t * 0.21) * 1.2, tx = m.x + Math.cos(th) * orb * 1.3, ty = m.y + Math.sin(th) * orb * 0.45 - 0.4;
      F.vx += ((tx - F.cx) * 2.6 - F.vx * 1.5) * dt; F.vy += ((ty - F.cy) * 2.6 - F.vy * 1.5) * dt; F.cx += F.vx * dt; F.cy += F.vy * dt;
      const want = Math.atan2(F.vy * 0.6, F.vx), dh = Math.atan2(Math.sin(want - F.hd), Math.cos(want - F.hd)); F.hd += dh * Math.min(1, dt * 3); const turn = Math.min(1, Math.abs(dh) * 2.2);
      // (7.6.14, owner) each fish its own: a small flock. Every fish has its own place and speed and keeps three rules:
      // stay with the school (its own loose spot in it, drawn from a bell curve, never a pattern), swim as the school swims,
      // and keep a body's length from its neighbours; a little restlessness of its own on top. So the shape lives and
      // stretches, thickens and thins, and never falls into rows
      const sp = SPECIES_BY_ID[F.fish || 49] || SPECIES_BY_ID[49], Lp = ppm * (big ? Math.max(1.1, (sp.len || 0.3) * 2.6) : Math.max(0.28, (sp.len || 0.3) * 0.9)), ch = Math.cos(F.hd), shd = Math.sin(F.hd), SL = (2.2 + 0.5 * F.lv) * (e.inSub ? 1.8 : 1) * (F.lv >= 3 ? 1.35 : 1), SW = (0.9 + 0.2 * F.lv) * (e.inSub ? 1.6 : 1) * (F.lv >= 3 ? 1.35 : 1), sep = big ? 2.6 : 0.6; /* (7.6.19, owner) the anglers further apart */ // (7.6.15) twice the room round each fish; sardines, mackerel, seadevils
      if (!F.fishN) { const rnd = (k) => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }, gs = (k) => Math.sqrt(-2 * Math.log(Math.max(1e-6, rnd(k)))) * Math.cos(TAU * rnd(k + 0.5));
        F.fishN = []; for (let i = 0; i < n; i++) { const oa = gs(i * 3.1) * 0.45, oc = gs(i * 5.7 + 2) * 0.45; F.fishN.push({ x: F.cx + oa * SL * ch - oc * SW * shd, y: F.cy + oa * SL * shd + oc * SW * ch, vx: F.vx, vy: F.vy, oa, oc, ph: rnd(i * 9.3) * TAU, sz: 0.8 + 0.4 * rnd(i * 2.2) }); } }
      // (7.6.15) a strike taken: the school bursts open round the hunter's mouth (fish flung out, bubbles, a flash of scales)
      if (F.hit && F.t - F.hit.t < 0.9) { const hk = (F.t - F.hit.t) / 0.9; for (const f of F.fishN) { const dx = f.x - F.hit.x, dy = f.y - F.hit.y, dd = Math.hypot(dx, dy) || 1; if (dd < 4) { f.vx += dx / dd * (1 - hk) * 9 * dt; f.vy += dy / dd * (1 - hk) * 9 * dt; } } if (!F.hit.bub) { F.hit.bub = 1; for (let i = 0; i < 18; i++) g.bubbles && g.bubbles.push({ x: F.hit.x + (Math.random() - 0.5) * 1.2, y: F.hit.y + (Math.random() - 0.5) * 0.8, r: 0.02 + Math.random() * 0.08, w: Math.random() * 6, t: 0 }); } }
      if (F.fishN && F.used && F.lostTo !== F.used) { F.lostTo = F.used; const keep = Math.max(3, Math.round(F.fishN.length * (1 - 0.55 / F.guard))); F.fishN.splice(keep); }
      // (7.6.24, owner) once it has arrived the school circles him: each fish its own place on a loose ring round him (or the
      // sub), the ring turning slowly; when a hunter comes in, the school surges out toward it, between it and him
      const ringK = smoothstep(1.4, 3.2, F.t), R0 = (e.inSub ? 6.2 : 2.3) * (1 + 0.12 * F.lv) * (big ? 1.5 : 1), thr = F.threat && F.t - F.threat.t < 1.6 ? F.threat : null;
      const FF = F.fishN; for (const f of FF) { let tx2 = F.cx + f.oa * SL * ch - f.oc * SW * shd, ty2 = F.cy + f.oa * SL * shd + f.oc * SW * ch;
        if (ringK > 0) { const th = f.ph + F.t * (0.55 + 0.1 * f.oc) * (F.lv % 2 ? -1 : 1), rr = R0 * (0.8 + 0.45 * Math.abs(f.oa) + 0.15 * Math.sin(F.t * 0.7 + f.ph)); let rx = m.x + Math.cos(th) * rr, ry = m.y + Math.sin(th) * rr * 0.62;
          if (thr) { const tk = Math.max(0, 1 - (F.t - thr.t) / 1.6); rx += (thr.x - m.x) * 0.55 * tk + Math.cos(th) * 0.6; ry += (thr.y - m.y) * 0.55 * tk; }
          tx2 += (rx - tx2) * ringK; ty2 += (ry - ty2) * ringK; }
        if (out > 0) { const ox = f.x - m.x, oy = f.y - m.y, od = Math.hypot(ox, oy) || 1; f.ox = f.ox ?? ox / od; f.oy = f.oy ?? oy / od * 0.5; tx2 = f.x + f.ox * 12; ty2 = f.y + f.oy * 12; } // (7.6.32, owner) the school leaves: each fish turns away from him and swims off into the water
        let ax = (tx2 - f.x) * 2.2 + (F.vx - f.vx) * 1.6 + Math.sin(F.t * 1.3 + f.ph) * 0.5, ay = (ty2 - f.y) * 2.2 + (F.vy - f.vy) * 1.6 + Math.cos(F.t * 1.1 + f.ph * 1.7) * 0.35;
        for (const o of FF) { if (o === f) continue; const dx = f.x - o.x, dy = f.y - o.y, d2 = dx * dx + dy * dy; if (d2 < sep * sep && d2 > 1e-6) { const d = Math.sqrt(d2), k = (sep - d) / sep * 6; ax += dx / d * k; ay += dy / d * k; } }
        f.vx += ax * dt; f.vy += ay * dt; const spd = Math.hypot(f.vx, f.vy), mx2 = Math.max(Math.hypot(F.vx, F.vy) * 1.6 + 1.2, ringK * (thr ? 7 : 3.2)); if (spd > mx2) { f.vx *= mx2 / spd; f.vy *= mx2 / spd; } f.x += f.vx * dt; f.y += f.vy * dt; }
      ctx.save(); for (const f of FF) { const x = S(f.x), y = Sy(f.y), fh = Math.atan2(f.vy * 0.7, f.vx), right = Math.cos(fh) >= 0, angf = clamp(Math.atan2(Math.sin(fh), Math.abs(Math.cos(fh))), -0.6, 0.6);
          ctx.save(); ctx.translate(x, y); ctx.globalAlpha = fade * (1 - outK); if (right) { ctx.rotate(angf); ctx.scale(-1, 1); } else ctx.rotate(-angf); const org = drawSpecies(ctx, sp, Lp * f.sz, F.t * 4 + f.ph, 1, f.ph); ctx.restore();
          // (7.7.2, owner) an angler's light is its own lure, where the drawing puts it: small and dim (no second bead beside it)
          if (big && Array.isArray(org)) { const lb = 0.75 + 0.25 * Math.sin(F.t * 2.1 + f.ph * 3), a2 = right ? angf : -angf, cr = Math.cos(a2), sr = Math.sin(a2), Ld2 = Lp * f.sz;
            for (const [lx0, ly, sz = 1] of org) { const lx = right ? -lx0 : lx0, rx = lx * cr - ly * sr, ry = lx * sr + ly * cr; glowPts.push([x + rx, y + ry, '#cfe6dc', Math.max(2, (Ld2 * 0.08 + ppm * 0.25) * sz), 0.55 * fade * (1 - outK) * lb, Math.max(0.7, (Ld2 * 0.012 + 0.4) * sz)]); } }
          const fl = big ? 0 : turn * (0.5 + 0.5 * Math.sin(f.ph * 3 + F.t * 5)); if (fl > 0.35) { /* (7.7.2, owner) the flash of scales as a school turns is for silver fish; anglers have none */ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * Math.min(1, (fl - 0.35) * 2.5); const fg = ctx.createRadialGradient(x, y, 0, x, y, Lp * 0.45); fg.addColorStop(0, 'rgba(236,244,244,0.85)'); fg.addColorStop(1, 'rgba(236,244,244,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(x, y, Lp * 0.45, Lp * 0.16, -fh, 0, TAU); ctx.fill(); ctx.restore(); } }
      ctx.restore(); }
    // ================= LIGHTING =================
    // (3.0.26) a cap on the living lights a frame: those off screen dropped, and past 90 the small ones thinned
    // evenly (a swarm of firefly squid could put hundreds here, each drawn twice)
    { const W0 = this.W, H0 = this.H; let n = 0;
      for (const p of glowPts) if (p[0] > -80 && p[0] < W0 + 80 && p[1] > -80 && p[1] < H0 + 80) glowPts[n++] = p;
      glowPts.length = n;
      if (n > 90) { const keep = [], small = []; for (const p of glowPts) (p[3] > ppm * 0.9 ? keep : small).push(p); const step = small.length / Math.max(1, 90 - keep.length); glowPts.length = 0; glowPts.push(...keep); for (let i = 0; i < small.length && glowPts.length < 90; i += Math.max(1, step)) glowPts.push(small[Math.floor(i)]); } }
    if (!(this.skip && this.skip.light)) { this.buildLightmap(g, S, Sy, ppm, head, subLamps, glowPts, horizon, surfY);
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = this.phone ? 'low' : 'high'; // (5.3.2) 'high' scaling is very slow in Safari
    ctx.drawImage(this.lc, 0, 0, W, H); }
    ctx.imageSmoothingQuality = 'low'; // (only the light needs the careful scaling; everything else uses the fast kind)
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff);
    if (g.abilLight >= 2 && ((g.lightFade ?? 1) * (g.abilOutK ?? 1)) > 0.01 && g.mode === 'play') { // (7.4.9, owner) the Lighthouse over the lit scene: up to half again as bright as it pulses, and its two beams turning, brighter still where they cross the screen
      const e2 = g.earl, bx = e2.inSub ? S(g.sub.x) : S(e2.x), by = e2.inSub ? Sy(g.sub.y) : Sy(e2.y), fl = (g.lightFade ?? 1) * (g.abilOutK ?? 1), pul = lerp(0.35, Math.pow(0.5 + 0.5 * Math.sin(g.time * 1.6), 2), g.pulseK ?? 1), rot = g.time * 0.45, Rb = Math.hypot(W, H), bK = g.beamK ?? 1;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen';
      const wash = ctx.createRadialGradient(bx, by, 0, bx, by, Rb * 0.75); wash.addColorStop(0, `rgba(255,238,210,${((0.1 + 0.22 * pul) * fl).toFixed(3)})`); wash.addColorStop(0.6, `rgba(255,232,200,${((0.05 + 0.12 * pul) * fl).toFixed(3)})`); wash.addColorStop(1, 'rgba(255,232,200,0)');
      ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
      // (7.6.31, owner) the old beams kept (owner: a light, not a beam of light); Pharos Heart's only for its first 10 s (g.beamK)
      if (bK > 0.01) for (const off of (g.abilLight >= 3 ? [0, TAU / 3, TAU * 2 / 3] : [0, Math.PI])) { /* (7.7.2) Pharos Heart's three beams, as its card says */ const a2 = rot + off, gb = ctx.createRadialGradient(bx, by, 0, bx, by, Rb); gb.addColorStop(0, `rgba(255,240,214,${((0.12 + 0.1 * pul) * fl * bK).toFixed(3)})`); gb.addColorStop(0.55, `rgba(255,236,206,${((0.06 + 0.05 * pul) * fl * bK).toFixed(3)})`); gb.addColorStop(1, 'rgba(255,236,206,0)');
        ctx.fillStyle = gb; for (const [w, al] of [[0.38, 0.22], [0.31, 0.28], [0.24, 0.32], [0.17, 0.36], [0.1, 0.4]]) { ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, Rb, a2 - w, a2 + w); ctx.closePath(); ctx.fill(); } ctx.globalAlpha = 1; } // five widths laid over each other: a beam with soft edges, brightest down its middle
      ctx.restore(); ctx.globalCompositeOperation = 'lighter'; }
    if (!(this.skip && this.skip.light)) this.drawDeepRim(g, S, Sy, ppm); // (7.0.2) the deep's shapes, after the dark
    ctx.globalCompositeOperation = 'source-over';
    this.drawSay(g, S, Sy, ppm); // (6.0.0) over everything in the scene, lit or not

    // ---- the entity's own light: red along its length, its eyes, the blue flash (see entity.lights) ----
    const ent = g.entity;
    if (ent && this.entInfo && !g.kill && g.mode !== 'menu') {
      const I = this.entInfo, Lt = ent.lit || { body: 1, eye: 0.3, flash: 0 }, fade = ent.fade ?? 1;
      const lidOpen = ent.blink > 0 ? 0.1 : 1;
      // (7.2.2) its edge, where a lamp reaches: only while it is close and a light is on (his lamp or the sub's)
      const lampOn = g.earl.inSub ? g.sub.lightsOn && !g.sub.imploded : g.earl.lampOn, rimK = lampOn ? clamp((80 - (ent.dist ?? 999)) / 45, 0, 1) * (ent.fade ?? 1) : 0;
      if (rimK > 0.01) { ctx.save(); ctx.translate(I.x, I.y); ctx.scale(I.flip, 1); drawMonsterRim(ctx, MONSTER_LEN * ppm, t, 0.32 * rimK * (ent.lit && ent.lit.mode === 'dark' ? 0.4 : 1), ent.flick || 0); ctx.restore(); }
      drawMonsterLights(ctx, I.info, (lx, ly) => [I.x + lx * I.flip, I.y + ly], ppm, t,
        { body: Lt.body * fade, eye: Lt.eye * fade * lidOpen, flash: Lt.flash * fade, reduce: !!g.reduceFlash, blue: (ent.tideBlue || 0) > 0.5 });
    }
    // taken: it comes in from the side, jaws opening, and he is in its open mouth; then they shut.
    // Drawn again over the lit scene (the lamps on it) so it cannot be lost in the dark.
    if (g.kill && g.entity) {
      const K = g.kill, en = g.entity;
      const flipK = K.flip ?? ((en.face ?? 1) >= 0 ? -1 : 1), rotK = K.rot || 0, Lk = MONSTER_LEN * ppm, cr = Math.cos(rotK), sr = Math.sin(rotK);
      ctx.save(); ctx.translate(S(en.x), Sy(en.y)); ctx.rotate(rotK); ctx.scale(flipK, 1);
      const info = drawMonster(ctx, Lk, t, 1, K.open || 0, 0.55);
      ctx.restore();
      drawMonsterLights(ctx, info, (lx, ly) => { const x = lx * flipK; return [S(en.x) + x * cr - ly * sr, Sy(en.y) + x * sr + ly * cr]; }, ppm, t, { body: 0, eye: 1, flash: 0, reduce: !!g.reduceFlash });
    }
    // the arc itself, white-hot, and sparks quenched almost as soon as they leave it
    if (g.welding) {
      const hx = S(g.welding.x), hy = Sy(g.welding.y);
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createRadialGradient(hx, hy, 0, hx, hy, ppm * 0.5);
      cg.addColorStop(0, 'rgba(255,255,255,0.95)'); cg.addColorStop(0.25, 'rgba(170,205,255,0.6)'); cg.addColorStop(1, 'rgba(60,100,200,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(hx, hy, ppm * 0.5 * (0.7 + 0.3 * Math.random()), 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,160,0.8)'; ctx.lineWidth = Math.max(1, ppm * 0.02);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.random() * TAU, l = ppm * (0.1 + Math.random() * 0.35); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * l, hy + Math.sin(a) * l + l * 0.3); }
      ctx.stroke();
      // sparks thrown off and falling, orange going dark as the water quenches them
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, l = ppm * (0.2 + Math.random() * 0.7), sx = hx + Math.cos(a) * l, sy = hy + Math.sin(a) * l + l * l / ppm * 0.6; ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.random() * 90)},60,${0.4 + Math.random() * 0.5})`; ctx.fillRect(sx, sy, Math.max(1.2, ppm * 0.03), Math.max(1.2, ppm * 0.03)); }
      ctx.globalCompositeOperation = 'source-over';
    }
    // the trap buoys' labels: what is in each and how long its bait has left
    if (this.trapLabels && this.trapLabels.length) {
      ctx.font = `${Math.max(11, ppm * 0.28).toFixed(0)}px "Barlow Semi Condensed", "Arial Narrow", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (const [lx, ly, txt] of this.trapLabels) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(txt, lx + 1, ly + 1); ctx.fillStyle = txt.endsWith('!') ? '#ffb070' : 'rgba(235,240,230,0.9)'; ctx.fillText(txt, lx, ly); }
    }
    ctx.restore();

    // (5.10.10) the vast faint eye behind him when marked is gone: it read as tinted water. Being marked is shown by the eye under the money.
    // (5.6.3) the sub's holes, outside her on a touch screen: each outlined in cream, breathing, to be tapped
    if (g.patchMarks && g.mode === 'play') {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const q = 0.5 + 0.5 * Math.sin(g.time * 3), rr = Math.max(12, ppm * 0.55);
      for (const w of g.patchMarks) { const hx = S(w.x), hy = Sy(w.y);
        ctx.setLineDash([4, 4]); ctx.lineDashOffset = -g.time * 8;
        ctx.strokeStyle = 'rgba(8,12,10,0.6)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(hx, hy, rr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(230,222,196,${(0.6 + 0.35 * q).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore();
    }
    // (5.6.1) on a touch screen, an animal not yet observed and in reach: four cream corner marks round it, breathing,
    // to say it can be tapped (observing is done by tapping it)
    
    // (5.6.8) on a phone, the things a tap acts on (the ladder, the cabin door, the sub, a thing to pick up, a trap, the
    // Margaret when there is a catch to sell): thin cream corners round each, breathing, the same mark an animal to
    // observe gets. Where each was drawn is kept for the tap (CSS pixels)
    // (5.9.6) the way aboard: at the surface near the Margaret (and not already at her ladder) a short line of chevrons
    // runs along the water from Earl to her ladder, drifting toward it, so nobody is left guessing how to get on
    { const e = g.earl, lxW = BOAT.x + 9 * 0.14, dx = lxW - e.x;
      const P0 = g.profile, Sq = P0 && P0.quests, mq = Sq && g.questMainId ? g.questMainId : null;
      // (6.5.0) only when there is a reason to go aboard (the tutorial, or the Log's step to sell, buy or put gear on): at
      // other times they pointed at the ladder while the quest wanted him in the sub
      const needAboard = !!P0 && !!g.tutLadder; void mq; // (7.1.0) only when the step is to climb the ladder: they were always on
      const want = needAboard && g.mode === 'play' && !g.aboard && !e.inSub && !g.kill && e.y < 3 && e.y > -1 && Math.abs(dx) > 1.6 && Math.abs(dx) < 26 && !(g.helm);
      this.wayK = clamp((this.wayK || 0) + (want ? 1 : -1) * (g.dtLast || 1 / 60) * 2.5, 0, 1);
      if (this.wayK > 0.01) {
        // (6.5.6) from Earl himself to the ladder's foot, each chevron turned along that line: they ran along the waterline
        // beside him, so they seemed to start somewhere to his side
        const lyW = 0.35, dy = lyW - e.y, dist = Math.hypot(dx, dy), n = Math.min(7, Math.max(2, Math.floor(dist / 1.4))), step = dist / (n + 1), ph = (g.time * 0.9) % 1;
        const ux = dx / dist, uy = dy / dist, rot = Math.atan2(Sy(lyW) - Sy(e.y), S(lxW) - S(e.x));
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < n; i++) {
          const f = (i + ph) / n, m = step * (i + ph + 0.5), xW = e.x + ux * m, yW = e.y + uy * m, sx = S(xW), sy = Sy(yW) - Math.sin(g.time * 1.3 + xW) * ppm * 0.05;
          const a = this.wayK * Math.sin(Math.PI * clamp(f, 0, 1)) * 0.85, c = ppm * 0.22;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
          for (const [w, col] of [[ppm * 0.13, `rgba(14,18,10,${(a * 0.6).toFixed(3)})`], [ppm * 0.06, `rgba(240,228,196,${a.toFixed(3)})`]]) {
            ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, w); ctx.beginPath(); ctx.moveTo(-c, -c); ctx.lineTo(0, 0); ctx.lineTo(-c, c); ctx.stroke(); }
          ctx.restore();
        }
        ctx.restore();
      }
    }
    this.tapRects = [];
    if (g.tapMarks && g.tapMarks.length && g.mode === 'play') {
      const fk = window.__fingerK || 1, kC = innerWidth / this.c.width / fk, BF = this.boatFrame, tk = g.tutAction ? String(g.tutAction.key).toLowerCase() : null;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round';
      for (const m of g.tapMarks) {
        let pts;
        if (m.boat) {
          if (!BF) continue;
          const [a0, b0, a1, b1] = m.boat, cr = Math.cos(BF.rock), sr = Math.sin(BF.rock), cR = Math.cos(BF.roll), sR = Math.sin(BF.roll);
          pts = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([u0, v0]) => { const x1 = u0 * BF.k * cr - v0 * BF.k * sr, y1 = u0 * BF.k * sr + v0 * BF.k * cr, x2 = x1 * BF.sx; return [BF.x + x2 * cR - y1 * sR, BF.y + x2 * sR + y1 * cR]; });
        } else { const [x0, y0, x1, y1] = m.w; pts = [[S(x0), Sy(y0)], [S(x1), Sy(y1)]]; }
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        let L0 = Math.min(...xs), R0 = Math.max(...xs), T0 = Math.min(...ys), B0 = Math.max(...ys);
        const mw = 30 / kC; if (R0 - L0 < mw) { const c0 = (L0 + R0) / 2; L0 = c0 - mw / 2; R0 = c0 + mw / 2; } if (B0 - T0 < mw) { const c0 = (T0 + B0) / 2; T0 = c0 - mw / 2; B0 = c0 + mw / 2; }
        this.tapRects.push({ x: L0 * kC * fk, y: T0 * kC * fk, w: (R0 - L0) * kC * fk, h: (B0 - T0) * kC * fk, key: m.key, what: m.what });
        const want = tk === m.key, q = 0.5 + 0.5 * Math.sin(g.time * 3);
        // (6.5.1) no shape drawn round it: the sub breathes itself (drawn with it, above); the door, the ladder, the
        // winch and the rest are part of a bigger picture, so the light on that part lifts and settles, slowly, as a
        // lamp swung near it would: soft at its edges, nothing drawn round it
        if (m.what !== 'sub') { const A = (m.faint && !want ? 0.5 : 1) * (0.1 + 0.1 * q), cx3 = (L0 + R0) / 2, cy3 = (T0 + B0) / 2, rx = (R0 - L0) / 2 + 6 / kC, ry = (B0 - T0) / 2 + 6 / kC;
          ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(cx3, cy3); ctx.scale(1, ry / rx);
          const lg2 = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx); lg2.addColorStop(0, `rgba(240,228,196,${A.toFixed(3)})`); lg2.addColorStop(0.7, `rgba(240,228,196,${(A * 0.6).toFixed(3)})`); lg2.addColorStop(1, 'rgba(240,228,196,0)');
          ctx.fillStyle = lg2; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
      }
      ctx.restore();
    }
    // (5.7.5) a swing that missed: "Missed" beside the fish, rising and fading as it bolts
    if (g.missLabels && g.missLabels.length) {
      const dtM = Math.min(0.1, Math.max(0, g.time - (this.missT ?? g.time))); this.missT = g.time;
      g.missLabels = g.missLabels.filter((L) => (L.t += dtM) < 1.4);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '700 19px "Barlow Semi Condensed", "Arial Narrow", sans-serif';
      for (const L of g.missLabels) { if (L.c && !L.c.dead) { L.x = L.c.x; L.y = L.c.y; } const a = Math.min(1, L.t / 0.12) * Math.min(1, (1.4 - L.t) / 0.5), x = S(L.x), y = Sy(L.y) - Math.max(26, ppm * 0.7) - L.t * 22;
        ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('Missed', x + 1, y + 1); ctx.fillStyle = '#f4b8a0'; ctx.fillText('Missed', x, y); }
      ctx.restore();
    }
    // (5.5.3) an animal just observed: its name beside it in the water. Faint pale letters, widely spaced, rising in out
    // of the dark, drifting up a little and going again after a few seconds, a hairline down to the animal
    if (g.obsLabels && g.obsLabels.length) {
      const dtL = Math.min(0.1, Math.max(0, g.time - (this.obsT ?? g.time))); this.obsT = g.time;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      g.obsLabels = g.obsLabels.filter((L) => (L.t += dtL) < 4.2);
      for (const L of g.obsLabels) {
        if (L.c && !L.c.dead) { L.x = L.c.x; L.y = L.c.y; }
        if (L.stay && Math.hypot(g.earl.x - L.x, g.earl.y - L.y) < L.stay && !g.earl.inSub) L.t = Math.min(L.t, 2); // (6.5.7) held while he is by it
        { const qx = S(L.x), qy = Sy(L.y); if (qx < -24 || qx > this.W + 24 || qy < -24 || qy > this.H + 24) L.t = Math.max(L.t, 3.9); } // (7.5.3, owner) its animal off the screen: the name goes with it (it was held at the edge)
        const a = Math.min(1, L.t / 0.7) * Math.min(1, (4.2 - L.t) / 1.1), ax = S(L.x), ay = Sy(L.y), rise = L.t * 5;
        let side = S(g.earl.x) > ax ? -1 : 1;
        // (5.6.7) the name is turned to the side it fits on, so it never runs off the screen
        ctx.font = '500 15px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; ctx.letterSpacing = '2px';
        const tw = Math.max(ctx.measureText(L.text).width, L.rar ? L.rar.length * 9.2 : 0) + 8, off = Math.max(30, ppm * 0.7); /* (6.5.7) the wider of its two lines (the guardian jellyfish's second line ran off the screen) */
        // (7.1.0) the name and rarity alone, centred over the animal: no line drawn to it
        side = 0; const tx = Math.min(this.W - tw / 2 - 8, Math.max(tw / 2 + 8, ax)), ty = Math.min(Math.max(70, ay - Math.max(18, ppm * ((L.c && L.c.len) || 0.4) * 0.32 + 12) - rise * 0.4) /* (7.4.0, owner) just above its back, rising only a little */, (side > 0 ? tx : tx - tw) < this.W * 0.3 ? this.H * 0.55 : Infinity); // above it, clear of words beside it; (5.6.9) on a phone, never down in the stick's corner
        if (tx < -200 || tx > this.W + 200) continue;
        ctx.globalAlpha = a * 0.9;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = '500 15px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; ctx.letterSpacing = '2px';
        ctx.letterSpacing = '0.5px'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L.text, tx + 1, ty + 1); /* (7.4.0, owner) the name as written, not in capitals */
        ctx.fillStyle = L.nameCol || 'rgba(214,222,210,0.92)'; ctx.fillText(L.text, tx, ty); // (7.2.8) a species' name in its rarity's colour
        if (L.rar) { ctx.font = '500 11px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; ctx.letterSpacing = '3px'; ctx.globalAlpha = a * 0.8; ctx.fillStyle = L.col || '#9aa0a6'; ctx.fillText(L.rar.toUpperCase(), tx, ty + 15); }
        ctx.letterSpacing = '0px';
      }
      ctx.restore();
    }
    // ================= POST =================
    // (5.9.0) abilities, seen. Sprint: streaks of water rushing past him while he moves (more of them, and brighter, at
    // each tier; Riptide's gold, with a warm aura and the edges of sight pulsing) and the faintest judder. Vigor: a pale
    // arc in the water where the net now reaches. Flare: light round him. Echo: a ring going out. Bulwark: a shimmer
    // round the sub. Tidewarden: the red washed out to blue.
    for (const AS of [g.abil, g.abil2, g.abil3]) if (g.mode === 'play' && AS && AS.activeT > 0 && AS.def) { // (7.6.4) both scrolls' effects, the one on the button and the other still running
      const A = AS.def, e = g.earl, mover = e.inSub ? g.sub : e, ex = S(mover.x), ey = Sy(mover.y), spd = Math.hypot(mover.vx || 0, mover.vy || 0);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (A.speed && spd > 0.6) {
        // (7.2.8) the water itself is drawn just after this block: only what it needs is handed over here
        this.sprintEmit = { kS: clamp(spd / (e.inSub ? 7 : 3.6), 0, 1), tier: A.tier, inSub: e.inSub, t: g.time, at: AS.at };
        ctx.globalAlpha = 1;
        // (7.3.0) a steady tremor by tier, and a kick when it fires that dies away in half a second (owner: more power at
        // every tier). (Riptide's round glow over him is gone: its light is in the light map now, wide and soft like a Flare)
        const kick = Math.max(0, 1 - (g.time - (AS.at ?? -9)) / 0.5), T0 = A.tier === 'mythical' ? [0.2, 1.05] : A.tier === 'legendary' ? [0.16, 0.9] : A.tier === 'exotic' ? [0.08, 0.55] : [0.04, 0.32];
        if (!g.overenc) g.fx.shake = Math.max(g.fx.shake || 0, T0[0] + T0[1] * kick * kick); // (7.4.0, owner) no tremor while the bag drags him to half speed
      }
      if (A.reach && !e.inSub && g.toolTip) { // (7.6.0, owner) the reach skills: no dashed arc. A light in the net's hoop, by tier, and a wake of churned water along each swing as long as the reach
        const TC = { rare: [226, 220, 196, 0.35], exotic: [214, 190, 140, 0.55], legendary: [242, 184, 74, 0.8], mythical: [236, 120, 84, 1] }[A.tier] || [226, 220, 196, 0.35];
        const hx = S(g.toolTip.x), hy = Sy(g.toolTip.y), hr = Math.max(14, ppm * 0.7), q = 0.75 + 0.25 * Math.sin(g.time * 3.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // (7.6.8, owner) no round glow: light runs along the hoop's own rim (slivers chasing round it, more by tier); Apex and
        // Leviathan Heart ring the mouth with hooked teeth of light, curved inward, pulsing; the swing leaves a torn streak
        { const rr0 = hr * 0.62, nS = { rare: 2, exotic: 3, legendary: 4, mythical: 5 }[A.tier] || 2; ctx.lineCap = 'round';
          for (let i = 0; i < nS; i++) { const a0 = g.time * (2.4 + 0.3 * i) + i * TAU / nS; for (let q2 = 0; q2 < 6; q2++) { const t0 = q2 / 6, aa = a0 - t0 * 0.9; ctx.strokeStyle = `rgba(${TC[0]},${TC[1]},${TC[2]},${(TC[3] * 0.9 * (1 - t0) * q).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, ppm * 0.05 * (1 - t0 * 0.7)); ctx.beginPath(); ctx.arc(hx, hy, rr0, aa - 0.16, aa); ctx.stroke(); } }
          if (A.tier === 'legendary' || A.tier === 'mythical') { const nT = A.tier === 'mythical' ? 11 : 9, tl = hr * (A.tier === 'mythical' ? 0.5 : 0.38), bite = 0.7 + 0.3 * Math.sin(g.time * 4);
            for (let i = 0; i < nT; i++) { const ang = i / nT * TAU + g.time * 0.35, bx = hx + Math.cos(ang) * rr0 * 1.08, by = hy + Math.sin(ang) * rr0 * 1.08, ix = -Math.cos(ang), iy = -Math.sin(ang), px = -iy, py = ix, L2 = tl * bite;
              ctx.fillStyle = `rgba(${TC[0]},${TC[1]},${TC[2]},${(0.85 * TC[3] * q).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(bx + px * L2 * 0.22, by + py * L2 * 0.22); ctx.quadraticCurveTo(bx + ix * L2 * 0.7 + px * L2 * 0.2, by + iy * L2 * 0.7 + py * L2 * 0.2, bx + ix * L2 + px * L2 * 0.42, by + iy * L2 + py * L2 * 0.42); ctx.quadraticCurveTo(bx + ix * L2 * 0.55 - px * L2 * 0.05, by + iy * L2 * 0.55 - py * L2 * 0.05, bx - px * L2 * 0.22, by - py * L2 * 0.22); ctx.closePath(); ctx.fill(); } } }
        const tr = this.reachTrail || (this.reachTrail = []);
        if (g.capture && g.capture.kind === 'net') tr.push({ x: g.toolTip.x, y: g.toolTip.y, t: g.time });
        while (tr.length && g.time - tr[0].t > 0.7) tr.shift();
        ctx.lineCap = 'round'; for (let i = 1; i < tr.length; i++) { const P0 = tr[i - 1], P1 = tr[i], k0 = 1 - (g.time - P1.t) / 0.7; for (const off of [-1, 0, 1]) { const dx2 = Sy(P1.y) - Sy(P0.y), dy2 = S(P0.x) - S(P1.x), dl = Math.hypot(dx2, dy2) || 1, o2 = off * ppm * 0.12 * (1 + (1 - k0) * 2);
          ctx.strokeStyle = `rgba(${TC[0]},${TC[1]},${TC[2]},${(0.32 * TC[3] * k0 * (off ? 0.5 : 1)).toFixed(3)})`; ctx.lineWidth = Math.max(0.6, ppm * 0.06 * k0); ctx.beginPath(); ctx.moveTo(S(P0.x) + dx2 / dl * o2, Sy(P0.y) + dy2 / dl * o2); ctx.lineTo(S(P1.x) + dx2 / dl * o2, Sy(P1.y) + dy2 / dl * o2); ctx.stroke(); } }
        ctx.restore();
        if (g.capture && g.capture.kind === 'net' && g.bubbles && Math.random() < 0.5 + 0.4 * TC[3]) g.bubbles.push({ x: g.toolTip.x + (Math.random() - 0.5) * 0.3, y: g.toolTip.y + (Math.random() - 0.5) * 0.3, r: 0.03 + Math.random() * 0.06, w: Math.random() * 6, t: 0 }); // the churned water of its swing
      }
      /* (5.16.0) a Flare's light is drawn in the light map now (30 m round him) */
      ctx.restore();
    }
    if (g.mode === 'play' && (g.mythT > 0 || g.mythFx || g.markWashFx || g.songFx)) { const e = g.earl, m = e.inSub ? g.sub : e, mx = S(m.x), my = Sy(m.y), t = g.time, sz = (e.inSub ? 4 : 1.8) * ppm, er = Math.max(1.8, ppm * 0.07);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
      const hadal = g.abil && g.abil.def && g.abil.def.press; // (7.4.24) Hadal Heart: no embers, its field is enough
      if (g.mythFx && !hadal) { const k0 = g.mythFx.t / 1.6; for (let i = 0; i < 30; i++) { const a = i * 2.39996, r = sz * (0.3 + k0 * (2.4 + (i % 5) * 0.4)), px = mx + Math.cos(a) * r, py = my + Math.sin(a) * r * 0.8 - k0 * sz * 0.6;
        ember(ctx, px, py, er * (5 - 2 * k0), er * 1.2, a, (1 - k0) * 0.85); } } // flung out from him
      if (g.mythT > 0 && !hadal) { const fade = Math.min(1, g.mythT / 1.5); for (let i = 0; i < 16; i++) { const ph = (t * (0.35 + (i % 4) * 0.07) + i * 0.083) % 1, u = ((i * 0.618) % 1 - 0.5) * 1.6, px = mx + u * sz + Math.sin(t * 1.3 + i) * sz * 0.15, py = my + sz * 0.3 - ph * sz * 1.8;
        ember(ctx, px, py, er * 4, er * 1.1, -Math.PI / 2 + Math.sin(t * 2 + i) * 0.3, Math.sin(Math.PI * ph) * 0.7 * fade); } } // rising off him
      if (g.songFx) { const T = g.songFx.t, rr = Math.hypot(ctx.canvas.width, ctx.canvas.height) * Math.min(1.1, 0.08 + T / 2.6), a = 0.22 * Math.max(0, 1 - T / 4); // (7.4.15) Whalesong: a pale ring of light going out over the screen
        const rg = ctx.createRadialGradient(mx, my, rr * 0.78, mx, my, rr); rg.addColorStop(0, 'rgba(214,230,240,0)'); rg.addColorStop(0.7, `rgba(214,230,240,${a.toFixed(3)})`); rg.addColorStop(1, 'rgba(214,230,240,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
      /* (7.6.7, owner) the mark wash's drawn ring is gone: the burst that opens every skill carries it */
      ctx.restore(); }
    // (7.4.19, owner) Dauntless: a force field of pressed water round him (or round the sub's hull). The same pale water
    // colour at every tier; a higher tier is a bigger field, a thicker brighter rim, more pressure rings closing in, more
    // bending of the water inside it, and from Bathysphere up the screen itself pulsing with the pressure. How hard it
    // all shows follows how much of the skill's extra depth is in use (g.pressK). It bursts out as it fires and is crushed
    // back in as it ends. Drawn by hand each frame: a lens, an uneven rim, rings and streaks, never a plain circle
    // (7.6.5, owner) Plunge: an iron anchor on its chain under him, dragging him (or the sub) down. Held against with the
    // stick, the chain goes taut and shudders, the bubbles are driven up past him and the silt is dragged down round him.
    // By tier: a plain black anchor, then a heavier one, then Drowned Anchor, green with weed and crusted with barnacles
    // (7.6.5, owner) Breath: as it fires, a burst of bubbles round him; while it runs, a soft blue light along his outline
    // (7.6.8, owner) Breath: no glow round him; the air coming in. Pale slivers of water stream in toward his tank from all
    // round, quickening as they near and vanishing into it, more of them with a stronger refill
    if (g.mode === 'play' && (g.breathGlow > 0 || g.breathFx) && !g.earl.inSub) { const e = g.earl, mx = S(e.x - (e.facing || 1) * 0.15), my = Sy(e.y - 0.1), k = Math.min(1, g.breathGlow || 0), t = g.time, nB = 22;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < nB; i++) { const seed = i * 2.399, cyc = ((t * 0.55 + i * 0.137) % 1), rr = ppm * (2.6 - 2.4 * cyc * cyc), a = seed + cyc * 1.2, x = mx + Math.cos(a) * rr, y = my + Math.sin(a) * rr * 0.8, ln = ppm * (0.12 + 0.35 * cyc), al = k * Math.sin(cyc * Math.PI) * 0.55;
        if (al < 0.02) continue; ctx.strokeStyle = `rgba(200,226,236,${al.toFixed(3)})`; ctx.lineWidth = Math.max(0.6, ppm * 0.03); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * ln, y - Math.sin(a) * ln * 0.8); ctx.stroke(); }
      ctx.restore();
      if (g.breathFx && g.breathFx.t < 0.05 && g.bubbles) for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; g.bubbles.push({ x: e.x + Math.cos(a) * 0.5, y: e.y + Math.sin(a) * 0.5, r: 0.04 + Math.random() * 0.08, w: Math.random() * 6, t: 0 }); } }
    // (7.6.6, owner) Cast: the net flying out in an arc, opening as it goes, a weighted rim and its mesh; on landing it
    // draws shut. Snatch: a thin line whipped out to the fish and back
    if (g.mode === 'play' && g.castNet) { const N = g.castNet, k = Math.min(1, N.t / N.dur), x = N.x0 + (N.x1 - N.x0) * k, y = N.y0 + (N.y1 - N.y0) * k - Math.sin(k * Math.PI) * 1.6, open = N.landed ? Math.max(0.25, 1 - (N.t - N.dur) * 1.5) : 0.3 + 0.7 * k, rr = N.r * open * ppm, cx = S(x), cy = Sy(y);
      ctx.save(); ctx.lineCap = 'round';
      /* (7.6.13, owner) no throw line: the net flies alone */
      const rim = (t) => { const a = t * TAU, w = 1 + 0.07 * Math.sin(a * 5 + N.t * 9); return [cx + Math.cos(a) * rr * w, cy + Math.sin(a) * rr * 0.55 * w]; };
      ctx.save(); ctx.beginPath(); for (let i = 0; i <= 40; i++) { const [px, py] = rim(i / 40); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fillStyle = 'rgba(20,24,22,0.12)'; ctx.fill(); ctx.clip();
      ctx.strokeStyle = N.tier === 'legendary' ? 'rgba(206,188,140,0.55)' : 'rgba(190,184,160,0.45)'; ctx.lineWidth = 0.7; const st = Math.max(4, rr / 5); ctx.beginPath(); for (let d = -rr * 2; d <= rr * 2; d += st) { ctx.moveTo(cx + d - rr, cy - rr); ctx.lineTo(cx + d + rr, cy + rr); ctx.moveTo(cx + d + rr, cy - rr); ctx.lineTo(cx + d - rr, cy + rr); } ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(150,140,112,0.8)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const [px, py] = rim(i / 40); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#2a261c'; for (let i = 0; i < 12; i++) { const [px, py] = rim(i / 12); ctx.beginPath(); ctx.ellipse(px, py, 1.7, 1.3, 0, 0, TAU); ctx.fill(); } // (7.6.6) the lead weights round the rim
      ctx.restore(); }
    // (7.6.13, owner) Snatch: never a line. A point of light darts out to the fish, small ripples of light spreading
    // where it passed; at the fish a ripple bursts round it as it is taken, and the light comes back. Talon: larger, amber
    if (g.mode === 'play' && g.snatchFx) { const F = g.snatchFx, tal = F.tier === 'legendary', C = tal ? [255, 196, 110] : [214, 230, 236], OUT = 0.22, BACK = 0.25, x0 = S(F.x0), y0 = Sy(F.y0), X1 = S(F.x1), Y1 = Sy(F.y1);
      const at = (k) => [x0 + (X1 - x0) * k, y0 + (Y1 - y0) * k - Math.sin(k * Math.PI) * ppm * 0.6];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sc = tal ? 1.6 : 1;
      for (let i = 1; i < 7; i++) { const f = i / 7; for (const [born, dirK] of [[f * OUT, 1], [OUT + 0.08 + (1 - f) * BACK, 0.6]]) { const age = F.t - born; if (age < 0 || age > 0.45) continue; const [rx, ry] = at(f), rr = ppm * sc * (0.06 + age * 0.7), al = Math.pow(1 - age / 0.45, 1.6) * 0.55 * dirK;
          ctx.strokeStyle = `rgba(${C[0]},${C[1]},${C[2]},${al.toFixed(3)})`; ctx.lineWidth = Math.max(0.6, ppm * 0.025 * sc * (1 - age)); ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.8, i, 0, TAU); ctx.stroke(); } } // small full ripples, blooming and fading like droplets
      const hk = F.t < OUT ? F.t / OUT : F.t < OUT + 0.08 ? 1 : Math.max(0, 1 - (F.t - OUT - 0.08) / BACK); if (F.t < OUT + 0.08 + BACK) { const [hx, hy] = at(hk), hr = ppm * 0.28 * sc, hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr); hg.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},0.85)`); hg.addColorStop(0.35, `rgba(${C[0]},${C[1]},${C[2]},0.3)`); hg.addColorStop(1, `rgba(${C[0]},${C[1]},${C[2]},0)`); ctx.fillStyle = hg; ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2); }
      for (const d0 of [0, 0.09]) { const age = F.t - OUT - d0; if (age < 0 || age > 0.4) continue; const rr = ppm * sc * (0.3 + age * 2.2); ctx.strokeStyle = `rgba(${C[0]},${C[1]},${C[2]},${((1 - age / 0.4) * 0.6).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, ppm * 0.045 * sc); ctx.beginPath(); ctx.arc(X1, Y1, rr, 0.3, 5.9); ctx.stroke(); }
      ctx.restore(); }
    // (7.6.6, owner) Ironskin: a cold steel sheen on him and hard glints sliding across it, as light off worked metal (no ring round him); a bite throws sparks off it (slivers, not dots)
    if (g.mode === 'play' && g.ironT > 0 && !g.earl.inSub) { const e = g.earl, mx = S(e.x), my = Sy(e.y); // (7.6.8) the iron is on his own figure now; only the sparks off it when something bites
      if (g.ironHit && g.time - g.ironHit.t < 0.4) { const h = 1 - (g.time - g.ironHit.t) / 0.4; ctx.save(); ctx.strokeStyle = `rgba(255,214,150,${(0.9 * h).toFixed(3)})`; ctx.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const a = i * 0.7 + g.ironHit.t * 13, r0 = ppm * 0.35, r1 = r0 + ppm * 0.5 * (1 - h * 0.5); ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0); ctx.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1); ctx.stroke(); } ctx.restore(); } }
    // (7.6.6, owner) Shoal: small silver fish turning round him in a loose ring, each a slim body flashing as it turns
    // (7.6.8, owner) Shoal: real anchovies (the game's own drawing), a school that moves as one: each fish follows its own
    // place in a loose, ragged body that wheels round him, swings wide and tight, turns about together every few seconds,
    // and flashes silver as its flank catches the light; never a ring, never even spacing
    // (7.6.13, owner) Shoal: a real school that keeps him company. One body with its own momentum chases a point that
    // drifts slowly round him (beside him, ahead, behind), so it trails, overtakes and sweeps past him as a school does; the
    // fish keep places in a long ragged shoal along its heading, each facing the way it swims, and they flash together
    // as the school turns. More fish, and a longer school, by tier
    // (7.6.6, owner) Revel: the water flickers with warm lantern colours in time with the music (Carnival: stronger, and
    // the glows in the water pulse with it); Ink: the water round him tinted its colour, a fading trail behind (Inkstorm)
    // (7.6.7, owner) Revel: the sea lit in vivid lantern colours. The water's own colour swings through crimson, amber,
    // violet and kelp green in time; from Revel+ soft-edged coloured shafts fall from above, swaying; lantern jellies (a
    // ribbed bell with a hot heart and trailing threads, each its own colour) drift round him, lighting the water round
    // themselves, more of them by tier. The light itself (as bright as a Flare+) comes through the light map
    // (7.6.7) Temper's heated figure, laid over him here, after the deep's darkness, so it glows as hot metal does
    // (7.6.32, owner) Ironskin: three small steel shields circling him on a tilted orbit, each turning on its own upright as
    // it goes (narrowing to its edge and back), lit across its face, a dark rim and a domed boss; those passing behind him
    // dimmer and smaller. A glint runs over one now and then. They fade in and out with the skill
    if (g.mode === 'play' && g.ironT > 0 && !g.earl.inSub) { const e = g.earl, k = Math.min(1, g.ironT / 1.5, (g.ironFx ? g.ironFx.t : 9) * 2), cx = S(e.x), cy = Sy(e.y) - ppm * 0.15, R = ppm * 1.05, sz = ppm * 0.36, t = g.time;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * TAU / 3, z = Math.sin(a), x = cx + Math.cos(a) * R, y = cy + z * R * 0.32 - Math.cos(a) * R * 0.12, sc = 0.82 + 0.18 * z, turn = Math.cos(t * 2.3 + i * 1.9), w = Math.max(0.12, Math.abs(turn));
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(a) * 0.18); ctx.scale(w * sc, sc); ctx.globalAlpha = k * (z < 0 ? 0.55 : 0.95);
        const sh = new Path2D(); sh.moveTo(-sz * 0.5, -sz * 0.55); sh.quadraticCurveTo(0, -sz * 0.66, sz * 0.5, -sz * 0.55); sh.bezierCurveTo(sz * 0.52, sz * 0.05, sz * 0.3, sz * 0.45, 0, sz * 0.66); sh.bezierCurveTo(-sz * 0.3, sz * 0.45, -sz * 0.52, sz * 0.05, -sz * 0.5, sz * 0.55 * -1); sh.closePath();
        const lit = turn > 0 ? 1 : 0.7, gr = ctx.createLinearGradient(-sz * 0.5, -sz * 0.6, sz * 0.4, sz * 0.6); gr.addColorStop(0, `rgb(${Math.round(200 * lit)},${Math.round(206 * lit)},${Math.round(208 * lit)})`); gr.addColorStop(0.45, `rgb(${Math.round(120 * lit)},${Math.round(128 * lit)},${Math.round(134 * lit)})`); gr.addColorStop(1, '#3a3f44');
        ctx.fillStyle = gr; ctx.fill(sh); ctx.lineWidth = Math.max(1, sz * 0.09); ctx.strokeStyle = '#24282c'; ctx.stroke(sh);
        ctx.lineWidth = Math.max(0.6, sz * 0.035); ctx.strokeStyle = 'rgba(220,226,228,0.55)'; ctx.beginPath(); ctx.moveTo(-sz * 0.42, -sz * 0.47); ctx.quadraticCurveTo(0, -sz * 0.57, sz * 0.42, -sz * 0.47); ctx.stroke(); // the top edge catching light
        const bg = ctx.createRadialGradient(-sz * 0.04, -sz * 0.06, 0, 0, 0, sz * 0.14); bg.addColorStop(0, '#e2e6e8'); bg.addColorStop(1, '#4a5056'); ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -sz * 0.02, sz * 0.13, sz * 0.13, 0, 0, TAU); ctx.fill(); // the boss
        const gl = (t * 0.6 + i * 0.37) % 1; if (gl < 0.18 && z > 0) { const q = Math.sin(gl / 0.18 * Math.PI); ctx.globalCompositeOperation = 'lighter'; glint(ctx, sz * 0.2, -sz * 0.3, sz * 0.5, q * k, 0); }
        ctx.restore(); }
      ctx.restore(); }
    if (this.temperDraw && this.suitC && g.mode === 'play') { const T = this.temperDraw; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = T.k * T.lv * (0.85 + 0.15 * Math.sin(g.time * 1.7)); ctx.drawImage(this.suitC, 0, 0);
      if (T.leg) { ctx.globalAlpha = T.k * (0.25 + 0.12 * Math.sin(g.time * 2.2)); ctx.drawImage(this.suitC, 0, 0); } ctx.restore(); }
    if (g.mode === 'play' && g.revelFx) { const F = g.revelFx, fade = Math.min(1, F.t / 0.8, (F.dur + 1.5 - F.t) / 1.5), beat = 0.5 + 0.5 * Math.cos(F.t * Math.PI * 2 * 1.9);
      const PAL = [[214, 40, 52], [240, 150, 30], [150, 60, 210], [60, 190, 90], [230, 80, 150]], ph = F.t * 0.45, pi0 = Math.floor(ph) % PAL.length, pf = ph % 1, C = PAL[pi0].map((v, q) => Math.round(v + (PAL[(pi0 + 1) % PAL.length][q] - v) * pf));
      const e = g.earl, m = e.inSub ? g.sub : e, mx = S(m.x), my = Sy(m.y);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${(fade * (0.32 + 0.1 * F.lv) * (0.65 + 0.35 * beat)).toFixed(3)})`; ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalCompositeOperation = 'lighter';
      // (7.6.28, owner) the shafts are god rays (godRay above): two (Revel+) or three (Carnival) wide, soft shafts from above,
      // swaying slowly, their colour soaked toward the water's own blue so they tint it instead of striping it
      if (F.lv >= 2) { const rc = this.rayC || (this.rayC = Object.assign(document.createElement('canvas'), { width: RAY_TW, height: RAY_TH })), nS = F.lv === 2 ? 2 : 3;
        for (let i = 0; i < nS; i++) { const Ci = PAL[(pi0 + i * 2) % PAL.length], Cw = [Math.round(Ci[0] * 0.6 + 70 * 0.4), Math.round(Ci[1] * 0.6 + 120 * 0.4), Math.round(Ci[2] * 0.6 + 140 * 0.4)];
          const x = this.W * ((i + 0.5) / nS) + Math.sin(F.t * 0.23 + i * 2.1) * this.W * 0.09, tilt = 0.16 * Math.sin(F.t * 0.17 + i * 1.7) + (i - (nS - 1) / 2) * 0.14, w = this.W * (0.55 + 0.12 * F.lv) * (0.85 + 0.15 * Math.sin(i * 3.1)), len = this.H * 1.45;
          godRay(ctx, rc, x, -this.H * 0.12, len, w, tilt, Cw, fade * (0.55 + 0.12 * F.lv) * (0.8 + 0.2 * beat), F.t + i * 7, i % 3); } }
      const nL = [0, 3, 5, 8][F.lv], R0 = ppm * (e.inSub ? 7 : 3.2);
      for (let i = 0; i < nL; i++) { const Ci = PAL[i % PAL.length], a = i / nL * TAU + F.t * (0.25 + (i % 3) * 0.05), rr = R0 * (0.8 + 0.35 * Math.sin(i * 2.3 + F.t * 0.4)), x = mx + Math.cos(a) * rr * 1.25, y = my + Math.sin(a) * rr * 0.7 + Math.sin(F.t * 1.3 + i) * ppm * 0.25, pulse = 0.6 + 0.4 * Math.cos(F.t * Math.PI * 2 * 1.9 + i * 0.9), sz = ppm * (0.2 + 0.03 * F.lv);
        const pool = ctx.createRadialGradient(x, y, 0, x, y, ppm * (1.6 + 0.3 * F.lv)); pool.addColorStop(0, `rgba(${Ci[0]},${Ci[1]},${Ci[2]},${(0.2 * fade * pulse).toFixed(3)})`); pool.addColorStop(1, `rgba(${Ci[0]},${Ci[1]},${Ci[2]},0)`); ctx.fillStyle = pool; ctx.fillRect(x - ppm * 3, y - ppm * 3, ppm * 6, ppm * 6);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(F.t * 0.9 + i) * 0.2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
        const bell = ctx.createLinearGradient(0, -sz, 0, sz * 0.4); bell.addColorStop(0, `rgba(${Math.min(255, Ci[0] + 60)},${Math.min(255, Ci[1] + 60)},${Math.min(255, Ci[2] + 60)},0.95)`); bell.addColorStop(1, `rgba(${Ci[0]},${Ci[1]},${Ci[2]},0.55)`);
        ctx.fillStyle = bell; ctx.beginPath(); ctx.moveTo(-sz, sz * 0.25); ctx.bezierCurveTo(-sz * 1.05, -sz * 0.9, sz * 1.05, -sz * 0.9, sz, sz * 0.25); ctx.quadraticCurveTo(sz * 0.5, sz * 0.05, 0, sz * 0.3); ctx.quadraticCurveTo(-sz * 0.5, sz * 0.05, -sz, sz * 0.25); ctx.fill();
        ctx.strokeStyle = `rgba(255,240,220,${(0.45 * pulse).toFixed(3)})`; ctx.lineWidth = Math.max(0.6, sz * 0.07); for (const rx of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(rx * sz, -sz * 0.62 * (1 - Math.abs(rx) * 0.5)); ctx.quadraticCurveTo(rx * sz * 1.25, -sz * 0.1, rx * sz * 1.5, sz * 0.2); ctx.stroke(); }
        ctx.strokeStyle = `rgba(${Ci[0]},${Ci[1]},${Ci[2]},0.6)`; for (let q = 0; q < 4; q++) { const tx = (q - 1.5) * sz * 0.4; ctx.beginPath(); ctx.moveTo(tx, sz * 0.25); ctx.quadraticCurveTo(tx + Math.sin(F.t * 2 + q + i) * sz * 0.4, sz * 1.1, tx + Math.sin(F.t * 1.6 + q) * sz * 0.3, sz * 1.9); ctx.stroke(); }
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,236,200,${(0.85 * pulse).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(0, -sz * 0.2, sz * 0.22, sz * 0.3, 0, 0, TAU); ctx.fill();
        ctx.restore(); ctx.globalCompositeOperation = 'lighter'; }
      ctx.restore(); }
    // (7.6.8, owner) Nacre: while it runs a mother-of-pearl shimmer chases round the net's rim (rose, green, blue, never one
    // colour), and a lucky catch lets a real pearl rise from the fish, turning and glinting, before it fades
    if (g.mode === 'play' && g.nacreT > 0 && g.toolTip && !g.earl.inSub) { const hx = S(g.toolTip.x), hy = Sy(g.toolTip.y), hr = Math.max(14, ppm * 0.7) * 0.62, NC = [[236, 196, 206], [196, 230, 210], [190, 206, 240], [240, 226, 196]];
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const a0 = g.time * 1.6 + i * TAU / 4, C = NC[(i + Math.floor(g.time * 0.8)) % 4]; for (let q2 = 0; q2 < 5; q2++) { const t0 = q2 / 5; ctx.strokeStyle = `rgba(${C[0]},${C[1]},${C[2]},${(0.6 * (1 - t0)).toFixed(3)})`; ctx.lineWidth = Math.max(0.7, ppm * 0.04 * (1 - t0 * 0.6)); ctx.beginPath(); ctx.arc(hx, hy, hr, a0 - t0 * 0.7 - 0.14, a0 - t0 * 0.7); ctx.stroke(); } } ctx.restore(); }
    if (g.mode === 'play' && g.pearlFx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const p of g.pearlFx) { const k = p.t / 1.8, x = S(p.x + Math.sin(p.t * 3) * 0.12), y = Sy(p.y - 0.4 - k * 1.8), r = Math.max(4, ppm * 0.17), a = Math.min(1, p.t * 6) * (1 - Math.max(0, k - 0.7) / 0.3);
        ctx.globalAlpha = a; const pg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); pg.addColorStop(0, '#fffaf2'); pg.addColorStop(0.45, '#eadfd6'); pg.addColorStop(0.8, '#c4b4b6'); pg.addColorStop(1, '#8c7e84'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(210,236,230,${(0.35 * a).toFixed(3)})`; ctx.lineWidth = Math.max(0.6, r * 0.18); ctx.beginPath(); ctx.arc(x, y, r * 0.72, Math.PI * 0.15 + p.t * 2, Math.PI * 0.75 + p.t * 2); ctx.stroke();
        const gl = Math.max(0, Math.sin(p.t * 7)); if (gl > 0.6) { ctx.strokeStyle = `rgba(255,252,240,${((gl - 0.6) * 2 * a).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r * 1.6, y - r * 0.9); ctx.lineTo(x + r * 0.2, y - r * 0.2); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore(); }
    // (7.6.8, owner) Siphon: the water ahead of the jet lit (a soft cone off the mantle's tip); Kraken's eyes burning amber
    // and the sharp living specks along its arms; and the ink it leaves, puffs that billow, curl at their edges and thin out
    if (g.mode === 'play' && g.inkPuffs) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      // (7.6.12, owner, from a photograph of squid ink) not clouds but threads and veils: from a small dense knot, a few
      // filaments wind out, each thick and dark at its root and hair-fine at its tip, curling slowly as it spreads and
      // sinks; between neighbouring filaments a torn translucent veil. Never heavy: sepia-black at low strength
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const p of g.inkPuffs) { const k = p.t / 7, a = Math.min(1, p.t * 5) * Math.pow(1 - k, 1.5), grow = ppm * p.r * (1.4 + Math.sqrt(p.t) * 3.2), x = S(p.x + Math.sin(p.s + p.t * 0.35) * p.t * 0.12), y = Sy(p.y - p.t * 0.06), NS = 4, NP = 18, strands = [];
        for (let j = 0; j < NS; j++) { const pts = [[x, y]]; let ang = (p.d || 0) + Math.PI + (j - 1.5) * 0.75 + Math.sin(p.s * 3.1 + j) * 0.6, px = x, py = y; const seg = grow / NP * (0.8 + 0.4 * Math.sin(p.s + j * 2.3));
          for (let i = 1; i <= NP; i++) { ang += Math.sin(p.s * 1.7 + j * 4.1 + i * 0.42 + p.t * 0.4) * 0.38 + Math.sin(i * 0.9 + j) * 0.12 + (j - 1.5) * 0.05; px += Math.cos(ang) * seg; py += Math.sin(ang) * seg + seg * 0.12 * p.t; pts.push([px, py]); }
          strands.push(pts); }
        for (let j = 0; j < NS - 1; j++) { const A0 = strands[j], B0 = strands[j + 1]; ctx.fillStyle = `rgba(46,32,40,${(0.09 * a).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(A0[0][0], A0[0][1]); for (let i = 1; i < A0.length * 0.8; i++) ctx.lineTo(A0[i][0], A0[i][1]); for (let i = Math.floor(B0.length * 0.75); i >= 0; i--) ctx.lineTo(B0[i][0], B0[i][1]); ctx.closePath(); ctx.fill(); } // the veils
        for (const pts of strands) for (let i = 1; i < pts.length; i++) { const u = i / pts.length; ctx.strokeStyle = `rgba(36,24,30,${(0.34 * a * (1 - u * 0.6)).toFixed(3)})`; ctx.lineWidth = Math.max(0.5, ppm * 0.05 * p.r * (1 - u * 0.85)); ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
        const kr = ppm * p.r * 0.28 * (1 + p.t * 0.2), kg = ctx.createRadialGradient(x, y, 0, x, y, kr); kg.addColorStop(0, `rgba(30,20,26,${(0.2 * a).toFixed(3)})`); kg.addColorStop(1, 'rgba(30,20,26,0)'); ctx.fillStyle = kg; ctx.fillRect(x - kr, y - kr, kr * 2, kr * 2); } // the dense knot it came from
      ctx.restore(); }
    if (g.mode === 'play' && g.siphon && this.siphLead) { const Q = g.siphon, Ld = this.siphLead, J = Q.A.dur, tj = Q.t - SIPH_FO, on = tj > -0.1 && tj < J + 0.15 ? 1 : 0, A2 = Q.A.siphon;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
      /* (7.6.11, owner) no beam ahead: the water round him is lit as by a Flare (the light map), nothing more */
      if (A2.eyes && Ld.a > 0.05) { const Lp = Ld.Lp, H = Lp * 0.11, at = (lx, ly) => Ld.mx.transformPoint(new DOMPoint(lx, ly)), E = at(Lp * 0.015, -H * 0.06);
        const er = H * 0.32 * Math.hypot(Ld.mx.a, Ld.mx.b), eg = ctx.createRadialGradient(E.x, E.y, 0, E.x, E.y, er * 3.2), pulse = 0.85 + 0.15 * Math.sin(g.time * 9); eg.addColorStop(0, `rgba(255,214,130,${(0.95 * Ld.a * pulse).toFixed(3)})`); eg.addColorStop(0.3, `rgba(255,150,60,${(0.45 * Ld.a).toFixed(3)})`); eg.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = eg; ctx.fillRect(E.x - er * 3.2, E.y - er * 3.2, er * 6.4, er * 6.4);
        ctx.strokeStyle = 'rgba(255,196,120,0.85)'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, Lp * 0.003);
        for (let i = 0; i < 18; i++) { const u = 0.06 + ((i * 0.37) % 0.4), v = (((i * 0.61) % 1) - 0.5) * H * 1.2, fl = Math.max(0, Math.sin(g.time * 6 + i * 2.3)); if (fl < 0.3) continue; const p0 = at(u * Lp, v), p1 = at(u * Lp + Lp * 0.014, v - Lp * 0.003);
          ctx.globalAlpha = fl * Ld.a; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); } ctx.globalAlpha = 1; }
      ctx.restore(); }
    // (7.6.5, owner) Eagle Eye: the screen's edges darkened into the almond of a lid, a faint amber in the middle, while it runs
    // (7.6.8, owner) Eagle Eye: real lids. The top and the bottom close in as dark curved shapes, feathered at their edge,
    // a fringe of lash shadows along each, leaving an almond of sharp sight; the light inside warm
    if (false && g.mode === 'play' && (g.eagle || 0) > 0.01) { // (7.6.26, owner) Eagle Eye no longer closes lids over the screen const k = g.eagle, W0 = this.W, H0 = this.H, cx = W0 / 2, cy = H0 / 2, op = H0 * (0.62 - 0.12 * k), sp = W0 * 0.62;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const lid = (sd) => { const P2 = new Path2D(); P2.moveTo(cx - sp, cy); P2.bezierCurveTo(cx - sp * 0.45, cy + sd * op, cx + sp * 0.45, cy + sd * op, cx + sp, cy); P2.lineTo(cx + sp + W0, cy); P2.lineTo(cx + sp + W0, cy + sd * H0 * 2); P2.lineTo(cx - sp - W0, cy + sd * H0 * 2); P2.lineTo(cx - sp - W0, cy); P2.closePath(); return P2; };
      const fl = 'filter' in ctx;
      for (const sd of [-1, 1]) { const L2 = lid(sd); for (const [bl, al] of [[18, 0.35], [8, 0.35], [0, 0.4]]) { if (fl) ctx.filter = bl ? `blur(${bl}px)` : 'none'; ctx.fillStyle = `rgba(10,7,4,${(al * k).toFixed(3)})`; ctx.fill(L2); } if (fl) ctx.filter = 'none';
        ctx.strokeStyle = `rgba(8,5,3,${(0.55 * k).toFixed(3)})`; ctx.lineCap = 'round'; for (let i = 1; i < 34; i++) { const u = i / 34, bx = (1 - u) ** 3 * (cx - sp) + 3 * (1 - u) ** 2 * u * (cx - sp * 0.45) + 3 * (1 - u) * u * u * (cx + sp * 0.45) + u ** 3 * (cx + sp), by = (1 - u) ** 3 * cy + 3 * (1 - u) ** 2 * u * (cy + sd * op) + 3 * (1 - u) * u * u * (cy + sd * op) + u ** 3 * cy, ln = H0 * (0.02 + 0.025 * Math.sin(u * Math.PI)) * (0.7 + 0.3 * Math.sin(i * 2.7));
          ctx.lineWidth = Math.max(0.8, H0 * 0.004); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (u - 0.5) * ln * 0.8, by + sd * ln); ctx.stroke(); } }
      ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(214,160,84,${(0.18 * k).toFixed(3)})`; ctx.fillRect(0, 0, W0, H0); ctx.restore(); }
    if (g.mode === 'play' && g.pressFx && !g.earl.inSub) { const F = g.pressFx, e = g.earl, sub0 = false, tt = g.time, kk = g.pressK || 0, dkT = smoothstep(0.5, 1, kk), dkk = (this.pressDk = (this.pressDk ?? dkT) + (dkT - (this.pressDk ?? dkT)) * Math.min(1, Math.max(0, tt - (this.pressT0 ?? tt)) * 1.5)), _pt = (this.pressT0 = tt), jit = dkk * ppm * 0.035 * (1 + ({ rare: 0, exotic: 1, legendary: 2, mythical: 3 }[F.tier] ?? 0) * 0.3), mx = S(e.x) + Math.sin(tt * 5.1) * jit + Math.sin(tt * 3.3) * jit * 0.6, my = Sy(e.y) + Math.cos(tt * 4.4) * jit + Math.sin(tt * 2.7) * jit * 0.5; /* (7.6.29, owner) nothing abrupt: the strain eases in from half the limit to the full limit, smoothed over time, and every shake is slow (no flicker) */ // (7.4.22) the diver only; it shakes harder the nearer the limit
      const TI = { rare: 0, exotic: 1, legendary: 2, mythical: 3 }[F.tier] ?? 0, k = g.pressK || 0, dk = dkk, /* (7.4.25, owner) distortion: none up to 80 % of the limit, full at 100 % */ vis = (0.5 + 0.5 * k) * (0.8 + 0.12 * TI);
      const open = Math.min(1, F.t / 0.55), ease = 1 - Math.pow(1 - open, 3), over = open < 1 ? 1 + Math.sin(open * Math.PI) * 0.12 : 1;
      const close = F.end > 0 ? Math.min(1, F.end / 0.9) : 0, shut = close > 0 ? Math.pow(1 - close, 2.2) : 1;
      const sc = ease * over * shut, R0 = [2.2, 3.0, 3.8, 4.6][TI] * ppm * (1.08 - 0.32 * k), ry = 1, R = R0 * sc; // (7.4.22, owner) Hadal Heart the largest at 4.6 m; the nearer the limit, the more the water closes it in
      const sp = 1 + 2.5 * dk, rimR = (a) => R * (1 + (0.011 * Math.sin(a * 3 + tt * 0.9 * sp + 1.3) + 0.008 * Math.sin(a * 5 - tt * 0.7 * sp + 0.4) + 0.008 * Math.sin(a * 7 - tt * 1.7 * sp) + 0.005 * Math.sin(a * 13 + tt * 2.9 * sp) + 0.016 * dk * Math.sin(a * 19 + tt * 2.6) + 0.01 * dk * Math.sin(a * 31 - tt * 3.4)) * (0.9 + 1.8 * dk) - (0.03 + 0.07 * dk) * Math.pow(Math.max(0, -Math.sin(a)), 2) * (0.6 + 0.2 * TI)); /* always shifting; past 80 % warping and shuddering */ // an uneven edge, flattened from above where the weight is; near the limit it warps and shudders
      const ring = (f, scl = 1) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = f(a) * scl; i ? ctx.lineTo(mx + Math.cos(a) * r, my + Math.sin(a) * r * ry) : ctx.moveTo(mx + Math.cos(a) * r, my + Math.sin(a) * r * ry); } ctx.closePath(); };
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (R > 2) {
        // the lens: the water inside bent outward a little (the scene under it drawn again, magnified, clipped to the field)
        const mag = 1.05 + 0.025 * TI + 0.06 * k; // (7.4.21) the water inside bent harder
        if (sc > 0.3) { ctx.save(); ctx.beginPath(); // (7.4.21) the bending in a band inside the rim only: he and the middle stay sharp
          for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, rr = rimR(a) * 0.97; i ? ctx.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry) : ctx.moveTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry); }
          const inner = TI >= 3 ? 0.72 : 0.5; for (let i = 64; i >= 0; i--) { const a = i / 64 * TAU, rr = rimR(a) * inner; ctx.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry); } ctx.closePath(); ctx.clip('evenodd'); const cw = ctx.canvas.width, ch = ctx.canvas.height, w2 = R * 2.2, h2 = R * 2.2 * ry;
          try { ctx.globalAlpha = 0.9; ctx.drawImage(ctx.canvas, Math.max(0, mx - w2 / 2), Math.max(0, my - h2 / 2), Math.min(cw, w2), Math.min(ch, h2), mx - w2 * mag / 2, my - h2 * mag / 2, w2 * mag, h2 * mag); } catch (er) { /* a lens skipped */ }
          ctx.globalAlpha = 1; const ig = ctx.createRadialGradient(mx, my, R * 0.2, mx, my, R); ig.addColorStop(0, 'rgba(84,104,134,0)'); ig.addColorStop(0.75, `rgba(84,104,134,${(0.04 + 0.05 * vis).toFixed(3)})`); ig.addColorStop(1, `rgba(96,116,146,${(0.12 + 0.14 * vis).toFixed(3)})`); ctx.fillStyle = ig; ctx.fillRect(mx - R * 1.2, my - R * 1.2, R * 2.4, R * 2.4);
          // light moving inside it, slow
          ctx.globalCompositeOperation = 'lighter'; for (let j = 0; j < 3 + TI; j++) { const a = tt * (0.4 + j * 0.13) + j * 2.1, px = mx + Math.cos(a) * R * 0.45, py = my + Math.sin(a * 1.3) * R * 0.35 * ry; const lg = ctx.createRadialGradient(px, py, 0, px, py, R * 0.35); lg.addColorStop(0, `rgba(90,110,140,${(0.05 * vis).toFixed(3)})`); lg.addColorStop(1, 'rgba(90,110,140,0)'); ctx.fillStyle = lg; ctx.fillRect(px - R * 0.4, py - R * 0.4, R * 0.8, R * 0.8); }
          ctx.restore(); }
        // (7.4.23, owner) particles: fine motes held in the field, slowly swirling round him, drawn outward to the rim as
        // the pressure builds; a few more drifting in the dark outside, all in the same twilight blue
        { const nM = 26 + TI * 12, sw = 0.03 + 0.05 * k; /* (7.6.32, owner) the motes drift and slowly sink, never streaming sideways round him */
          for (let j = 0; j < nM; j++) { const h1 = Math.sin(j * 12.9898) * 43758.5453, u = h1 - Math.floor(h1), h2 = Math.sin(j * 78.233) * 12543.123, v = h2 - Math.floor(h2);
            const a = u * TAU + tt * sw * (0.6 + v), rr = R * (0.25 + 0.68 * Math.pow(v, 0.7 - 0.4 * k)) * (1 + 0.03 * Math.sin(tt * 2 + j)), px = mx + Math.cos(a) * rr, py = my + Math.sin(a) * rr * ry + Math.sin(tt * 0.8 + j) * ppm * 0.08 + (((tt * 0.12 + v) % 1) - 0.5) * R * 0.35;
            const tw = 0.5 + 0.5 * Math.sin(tt * (1.5 + v * 2) + j * 3), al = (0.25 + 0.45 * tw) * (0.5 + 0.5 * vis) * shut * Math.min(1, sc * 1.5);
            const pr = Math.max(1, ppm * (0.03 + 0.04 * v)), fa = Math.PI / 2 + Math.sin(tt * 0.3 + j) * 0.5; ctx.strokeStyle = `rgba(132,150,180,${al.toFixed(3)})`; ctx.lineWidth = Math.max(0.7, pr * 0.45); ctx.beginPath(); ctx.moveTo(px - Math.cos(fa) * pr, py - Math.sin(fa) * pr); ctx.quadraticCurveTo(px + Math.sin(fa) * pr * 0.4, py - Math.cos(fa) * pr * 0.4, px + Math.cos(fa) * pr, py + Math.sin(fa) * pr); ctx.stroke(); } } // (7.4.24) flecks, not dots
        // (7.4.21, owner) the crush outside: the water beyond the field darkened and pressed, harder the more of the limit is
        // used; and just outside the rim a band of squeezed water (the scene drawn again, pulled in toward him)
        { const cw = ctx.canvas.width, ch = ctx.canvas.height, dk = (0.09 + 0.07 * TI) * (0.3 + 1.6 * k) * shut;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, ch); for (let i = 64; i >= 0; i--) { const a = i / 64 * TAU, rr = rimR(a) * 1.02; i === 64 ? ctx.moveTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry) : ctx.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry); } ctx.closePath();
          const og = ctx.createRadialGradient(mx, my, R * 0.9, mx, my, Math.max(R * 1.6, Math.hypot(cw, ch) * 0.6)); og.addColorStop(0, `rgba(4,12,18,${Math.min(0.75, dk * 1.3).toFixed(3)})`); og.addColorStop(0.5, `rgba(3,9,14,${Math.min(0.7, dk).toFixed(3)})`); og.addColorStop(1, `rgba(1,4,8,${Math.min(0.85, dk * (0.8 + 1.2 * k)).toFixed(3)})`); // the dark closing in from the edges ctx.fillStyle = og; ctx.fill('evenodd'); ctx.restore();
          if (TI >= 1 && sc > 0.3) { ctx.save(); ctx.beginPath(); ring(rimR, 1.3 + 0.1 * TI); ctx.save(); ctx.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, rr = rimR(a) * (1.3 + 0.1 * TI); i ? ctx.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry) : ctx.moveTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry); } for (let i = 64; i >= 0; i--) { const a = i / 64 * TAU, rr = rimR(a) * 1.02; ctx.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * ry); } ctx.closePath(); ctx.clip('evenodd');
            const sq = 1 - (0.03 + 0.015 * TI) * (0.5 + k) * (0.8 + 0.2 * Math.sin(tt * 3)), w3 = R * 3, h3 = R * 3 * ry;
            try { ctx.drawImage(ctx.canvas, mx - w3 / 2, my - h3 / 2, w3, h3, mx - w3 * sq / 2, my - h3 * sq / 2, w3 * sq, h3 * sq); } catch (er) { /* skipped */ }
            ctx.fillStyle = `rgba(72,92,122,${((0.05 + 0.03 * TI) * vis).toFixed(3)})`; ctx.fillRect(mx - w3 / 2, my - h3 / 2, w3, h3); ctx.restore(); ctx.restore(); } }
        // the pressure closing in: wavy rings travelling inward from the water outside and flattening against the rim
        const nR = 4 + TI * 3, /* (7.6.33) heat: fewer rings, each of fewer points */ per = (2.0 - TI * 0.25) * (1 - 0.6 * dk); // (7.4.22) faster the nearer the limit
        for (let j = 0; j < nR; j++) { const ph = ((tt / per + j / nR) % 1), rr = 1 + (1 - ph) * (1.3 + 0.25 * TI), al = Math.pow(ph, 1.4) * (0.22 + 0.14 * TI) * vis * shut;
          ctx.strokeStyle = `rgba(88,108,138,${(al * 0.8).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, (0.6 + TI * 0.25) * (0.5 + ph) * (1 + 0.6 * k)) * (ppm / 30); // (7.4.24) thinner, and more of them
          ring((a) => rimR(a) * (1 + (0.03 + 0.06 * dk) * (1 - ph) * Math.sin(a * 7 + j * 3 + tt * (1.5 + 1.2 * dk))), rr); ctx.stroke(); }
        // streaks of weight bearing down on it from above, more of them the higher the tier
        const nS = 16 + TI * 14; ctx.lineCap = 'round';
        for (let j = 0; j < nS; j++) { const u = (j + 0.5) / nS - 0.5, a = -Math.PI / 2 + u * (2.2 + TI * 0.35), ph = (tt * (0.7 + 0.1 * TI) + j * 0.37) % 1, r1 = rimR(a) * (1.06 + (1 - ph) * 1.1), r2 = r1 + R * 0.25 * (0.5 + k);
          ctx.strokeStyle = `rgba(84,104,134,${(ph * (0.22 + 0.1 * TI) * vis * shut).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, ppm * 0.03 * (1 + TI * 0.25) * (0.7 + 0.6 * k));
          ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * r2, my + Math.sin(a) * r2 * ry); ctx.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1 * ry); ctx.stroke(); }
        // (7.4.22) silt and specks driven in by the water and smashed against the rim, faster and more of them near the limit
        { const nP = Math.round((22 + TI * 14) * (0.5 + k)), spd = 0.6 + 1.8 * dk;
          for (let j = 0; j < nP; j++) { const a = j * 2.39996 + Math.sin(j * 7.1) * 0.3, ph = (tt * spd * (0.6 + (j % 5) * 0.12) + j * 0.137) % 1, d0 = rimR(a) * (1.02 + (1 - ph) * (1.6 + 0.3 * TI)), d1 = d0 + R * (0.05 + 0.15 * k * k) * (1 - ph * 0.5);
            ctx.strokeStyle = `rgba(108,128,160,${(Math.pow(ph, 1.2) * (0.3 + 0.35 * k) * shut).toFixed(3)})`; ctx.lineWidth = Math.max(0.7, ppm * (0.02 + 0.015 * k));
            ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * d1, my + Math.sin(a) * d1); ctx.lineTo(mx + Math.cos(a) * d0, my + Math.sin(a) * d0); ctx.stroke();
            if (ph > 0.9) { ctx.fillStyle = `rgba(132,150,178,${((ph - 0.9) * 6 * (0.3 + 0.4 * k) * shut).toFixed(3)})`; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * rimR(a) * 1.03, my + Math.sin(a) * rimR(a) * 1.03, Math.max(1.5, ppm * 0.07), 0, TAU); ctx.fill(); } } } // a splash where it strikes
        // (7.4.22) near the limit the rim begins to crack: thin forks of light running in from it, flickering
        if (dk > 0) { const nC = Math.round((3 + TI * 2) * dk * 2) + 1;
          for (let j = 0; j < nC; j++) { const seed = Math.floor(tt * 3 + j * 1.7), a = (seed * 2.399 + j) % TAU, fl = 0.5 + 0.5 * Math.sin(tt * 23 + j * 5); if (fl < 0.25) continue;
            let px = mx + Math.cos(a) * rimR(a), py = my + Math.sin(a) * rimR(a); ctx.strokeStyle = `rgba(150,168,196,${(fl * (k - 0.5) * 1.4 * shut).toFixed(3)})`; ctx.lineWidth = Math.max(1, ppm * 0.035); ctx.beginPath(); ctx.moveTo(px, py);
            for (let q = 0; q < 4; q++) { const aa = a + Math.PI + Math.sin(seed * 3.1 + q * 2.3) * 0.7, l = R * (0.07 + 0.05 * Math.abs(Math.sin(seed + q))); px += Math.cos(aa) * l; py += Math.sin(aa) * l; ctx.lineTo(px, py); } ctx.stroke(); } }
        // the rim: a dark outer edge, the pale core (one line, its weight by the tier and the pressure), a thin lit inner
        // edge, and a soft halo; the water's own pale colour, never white
        const wCore = Math.max(1.2, (1.1 + TI * 0.6 + k * 1.8) * (ppm / 30)); // (7.4.21) a heavier rim
        ctx.strokeStyle = `rgba(10,22,28,${((0.22 + 0.1 * TI) * shut).toFixed(3)})`; ctx.lineWidth = wCore * 2.4; ring(rimR, 1.015); ctx.stroke();
        ctx.strokeStyle = `rgba(104,124,156,${((0.34 + 0.3 * vis) * shut).toFixed(3)})`; ctx.lineWidth = wCore; ring(rimR, 1); ctx.stroke();
        ctx.strokeStyle = `rgba(138,156,184,${((0.14 + 0.2 * vis) * shut).toFixed(3)})`; ctx.lineWidth = Math.max(1, wCore * 0.35); ring(rimR, 0.985); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(60,80,110,${((0.06 + 0.05 * TI) * vis * shut).toFixed(3)})`; ctx.lineWidth = wCore * 4; ring(rimR, 1); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      }
      // the burst as it opens: a shock ring thrown far out; the collapse as it ends: a flash where it closes on him
      if (F.t < 0.9) { const q = F.t / 0.9, rb = R0 * (0.6 + q * (2.2 + TI * 0.5)); // (7.4.24) the burst: a broken, uneven ripple thrown out, never a plain ring
        for (let i = 0; i < 40; i++) { const a0 = i / 40 * TAU + Math.sin(i * 7.7) * 0.05, a1 = a0 + TAU / 40 * (0.45 + 0.4 * Math.abs(Math.sin(i * 3.3))), w0 = rb * (1 + 0.06 * Math.sin(i * 5.1 + F.t * 9)), al = (1 - q) * (0.25 + 0.2 * Math.abs(Math.sin(i * 2.7))) * (0.8 + 0.1 * TI);
          ctx.strokeStyle = `rgba(104,124,156,${al.toFixed(3)})`; ctx.lineWidth = Math.max(0.8, ppm * (0.05 + 0.02 * TI) * (1 - q)); ctx.beginPath(); ctx.arc(mx, my, w0, a0, a1); ctx.stroke(); } }
      if (close > 0.6) { const q = (close - 0.6) / 0.4, fr = R0 * 0.5 * (1 - q * 0.6); const fg = ctx.createRadialGradient(mx, my, 0, mx, my, fr); fg.addColorStop(0, `rgba(116,136,166,${(0.5 * (1 - q)).toFixed(3)})`); fg.addColorStop(1, 'rgba(116,136,166,0)'); ctx.fillStyle = fg; ctx.fillRect(mx - fr, my - fr, fr * 2, fr * 2); }
      // from Bathysphere up the screen feels it: its edges pressing in with each ring that arrives; Hadal Heart trembles
      const pIn = TI >= 2 ? 1 : smoothstep(0.25, 0.6, k); this.pressPh = ((this.pressPh || 0) + Math.min(0.05, Math.max(0, tt - (this.pressPhT ?? tt))) / ((2.2 - TI * 0.25) * (1 - 0.4 * k))) % 1; this.pressPhT = tt; /* (7.6.29, owner) eased in, and its beat accumulated so a change of depth never makes it stutter */
      if (pIn > 0.01 && shut > 0.05) { const cw = ctx.canvas.width, ch = ctx.canvas.height, pul = Math.pow(Math.max(0, Math.sin(this.pressPh * TAU)), 3), a = (0.1 + 0.05 * TI) * (0.4 + 1.2 * k) * pul * shut * pIn;
        const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * (0.45 - 0.06 * pul - 0.12 * k), cw / 2, ch / 2, Math.hypot(cw, ch) * 0.55); vg.addColorStop(0, 'rgba(6,14,20,0)'); vg.addColorStop(1, `rgba(6,14,20,${a.toFixed(3)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
        if (TI >= 3) g.fx.shake = Math.max(g.fx.shake || 0, 0.35 * dk * pul); }
      if (dk > 0 && shut > 0.05) g.fx.shake = Math.max(g.fx.shake || 0, dk * (0.14 + 0.07 * TI)); // (7.4.25) the view shakes only past 80 % // (7.4.22) the view shakes as the limit nears, at every tier
      ctx.restore(); }
    // (7.2.8) Sprint's water, made real: motes that live in the water itself (world places, still water), so they slide past
    // him exactly as fast as he really moves, and nothing can jump (never a clock times a changing speed).
    // (7.3.0) a meteor (owner): ahead of him the water is thrown aside, unevenly, in loose clumps, small motes and the odd
    // big one (it read as one even wall); behind him a tail of streaks off his fins; a burst from the fins when it fires.
    // Each tier a clear step: Sprint sparse; Sprint+ denser, with a stream of bubbles and a few blue sparks of
    // bioluminescence stirred up in the wake; Riptide the widest bow, a heavy bubble stream and many sparks (its light is
    // a wide soft glow in the light map). Sparks show more the darker the water
    { const em = (g.mode === 'play' && this.sprintEmit && this.sprintEmit.t === g.time) ? this.sprintEmit : null; const P = this.sprintP || (this.sprintP = []);
      const dt = clamp(g.time - (this.sprintT ?? g.time), 0, 0.1); this.sprintT = g.time; const rnd = Math.random;
      if (em && dt > 0) { const e = g.earl, m = em.inSub ? g.sub : e, sp = Math.hypot(m.vx || 0, m.vy || 0) || 1, dx = (m.vx || 0) / sp, dy = (m.vy || 0) / sp, nx = -dy, ny = dx;
        const TT = { rare: { bow: 52, tail: 34, bub: 8, spark: 0, w: 1 }, exotic: { bow: 62, tail: 46, bub: 20, spark: 7, w: 1.3 }, legendary: { bow: 105, tail: 80, bub: 38, spark: 30, w: 1.7 }, mythical: { bow: 125, tail: 100, bub: 46, spark: 44, w: 1.9 } }[em.tier] || { bow: 52, tail: 34, bub: 8, spark: 0, w: 1 };
        // (7.4.0, owner) the sub's own shape: the bow wave off its nose (about 4.2 m ahead of its middle on a 9 m hull), the wake off
        // its propeller (4.6 m behind), spread over the hull's height, not a diver's outline round its middle
        const sz = em.inSub ? 1.5 : 1, head = em.inSub ? 4.2 : 0.9, fins = em.inSub ? 4.6 : 1.05, cap = 900, k = em.kS;
        const add = (q) => { if (P.length < cap) P.push(q); };
        const bow = (n) => { for (let i = 0; i < n; i++) { // thrown aside ahead of his head: wider the further out, faster the nearer the line
          const g2 = (rnd() + rnd() + rnd() - 1.5) / 1.5, across = g2 * 0.75 * sz * TT.w, side = Math.sign(across) || (rnd() < 0.5 ? -1 : 1), ahead = head + (0.15 + rnd() * rnd() * 1.6) * sz;
          const push = (0.8 + rnd() * 2.4) * TT.w * (0.5 + 0.5 * k) * (1.2 - Math.min(1, Math.abs(g2)) * 0.5);
          const clump = rnd() < 0.18 ? 2 + Math.floor(rnd() * 3) : 1; // loose clumps, so it is never an even spread
          for (let c = 0; c < clump; c++) { const j = c ? 0.12 * sz : 0;
            add({ x: m.x + dx * ahead + nx * across + (rnd() - 0.5) * j, y: m.y + dy * ahead + ny * across + (rnd() - 0.5) * j, vx: nx * side * push + dx * sp * 0.06, vy: ny * side * push + dy * sp * 0.06, age: 0, life: 0.7 + rnd() * 1.6, k: 0, r: 0.25 + rnd() * rnd() * 1.6, a: 0.3 + rnd() * 0.7 }); } } };
        const tail = (n) => { for (let i = 0; i < n; i++) { const j = (rnd() + rnd() - 1) * 0.22 * sz * TT.w; // the tail: off the fins, left behind in the water
          add({ x: m.x - dx * (fins + rnd() * 0.3 * sz) + nx * j, y: m.y - dy * (fins + rnd() * 0.3 * sz) + ny * j, vx: -dx * sp * (0.04 + rnd() * 0.1) + nx * (rnd() - 0.5) * 0.4, vy: -dy * sp * (0.04 + rnd() * 0.1) + ny * (rnd() - 0.5) * 0.4, age: 0, life: 0.5 + rnd() * 0.9, k: 2, r: 0.5 + rnd() * 1.3, a: 0.25 + rnd() * 0.5 }); } };
        const bub = (n, spread = 0.3) => { for (let i = 0; i < n; i++) { const j = (rnd() - 0.5) * spread * sz;
          add({ x: m.x - dx * (fins + rnd() * 0.4) + nx * j, y: m.y - dy * (fins + rnd() * 0.4) + ny * j, vx: -dx * 0.5 + (rnd() - 0.5) * 0.5, vy: -dy * 0.5 - 0.25, age: 0, life: 1.2 + rnd() * 1.4, k: 1, r: 0.5 + rnd() * rnd() * 2.2 * (em.inSub ? 1.4 : 1), a: 1 }); } };
        const spark = (n) => { for (let i = 0; i < n; i++) { const back = rnd() * 2.2 * sz, j = (rnd() + rnd() - 1) * 0.9 * sz * TT.w; // stirred up along him and in his wake
          add({ x: m.x - dx * back + nx * j, y: m.y - dy * back + ny * j, vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3, age: 0, life: 0.5 + rnd() * 0.9, k: 3, r: 0.6 + rnd() * 0.8, a: 0.5 + rnd() * 0.5 }); } };
        // (7.4.26, owner) the meteor's head: water packed right at his nose and streaming back past him, close and dense, so
        // the front of him reads as the leading point of the rush
        const nose = (n) => { for (let i = 0; i < n; i++) { const g3 = (rnd() + rnd() - 1) * 0.32 * sz, ahead = head * 0.85 + rnd() * rnd() * 0.45 * sz, side = Math.sign(g3) || 1, sv = (0.3 + rnd() * 0.9) * TT.w;
          add({ x: m.x + dx * ahead + nx * g3, y: m.y + dy * ahead + ny * g3, vx: -dx * sp * (0.12 + rnd() * 0.18) + nx * side * sv, vy: -dy * sp * (0.12 + rnd() * 0.18) + ny * side * sv, age: 0, life: 0.25 + rnd() * 0.5, k: 0, r: 0.2 + rnd() * rnd() * 0.9, a: 0.45 + rnd() * 0.55 }); } };
        const acc = (key, rate) => { this[key] = (this[key] || 0) + rate * dt; const n = Math.floor(this[key]); this[key] -= n; return n; };
        bow(acc('spBow', TT.bow * k)); nose(acc('spNose', TT.bow * 1.1 * k)); tail(acc('spTail', TT.tail * k)); bub(acc('spBub', TT.bub * (0.4 + 0.6 * k))); if (TT.spark) spark(acc('spSpark', TT.spark * k));
        if (em.at != null && this.sprintBurstAt !== em.at) { this.sprintBurstAt = em.at; // the kick: water and bubbles burst from his fins
          const nb = em.tier === 'mythical' ? 84 : em.tier === 'legendary' ? 70 : em.tier === 'exotic' ? 42 : 24;
          for (let i = 0; i < nb; i++) { const an = Math.atan2(-dy, -dx) + (rnd() - 0.5) * 2.6, v = (0.8 + rnd() * 2.2) * TT.w;
            add({ x: m.x - dx * fins, y: m.y - dy * fins, vx: Math.cos(an) * v, vy: Math.sin(an) * v, age: 0, life: 0.6 + rnd() * 1.0, k: 0, r: 0.3 + rnd() * rnd() * 1.6, a: 0.4 + rnd() * 0.6 }); }
          bub(nb >> 1, 0.9); if (TT.spark) spark(nb >> 1); } }
      if (P.length) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const dr = Math.max(1, ppm / 40), dark = clamp((this.cam.y - 30) / 270, 0, 1); /* bioluminescence is not seen in sunlit water */
        for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; q.age += dt; if (q.age >= q.life) { P.splice(i, 1); continue; }
          const damp = Math.exp(-dt * (q.k === 1 ? 0.8 : q.k === 3 ? 1.5 : 2.4)); q.vx *= damp; q.vy *= damp; if (q.k === 1) q.vy -= 0.5 * dt; /* bubbles rise */ q.x += q.vx * dt; q.y += q.vy * dt;
          const f = q.age / q.life, x0 = S(q.x), y0 = Sy(q.y);
          if (x0 < -20 || y0 < -20 || x0 > this.W + 20 || y0 > this.H + 20) { q.sx = x0; q.sy = y0; continue; }
          const lx = q.sx ?? x0, ly = q.sy ?? y0, mvx = x0 - lx, mvy = y0 - ly, ml = Math.hypot(mvx, mvy);
          if (q.k === 1) { const a = Math.min(1, f * 6) * (1 - f) ** 1.4; ctx.globalAlpha = a * 0.55; ctx.strokeStyle = 'rgb(214,226,220)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x0, y0, q.r * dr * 1.4, 0, TAU); ctx.stroke(); ctx.globalAlpha = a * 0.4; ctx.fillStyle = 'rgb(240,244,236)'; ctx.fillRect(x0 - q.r * dr * 0.5, y0 - q.r * dr * 0.6, dr * 0.9, dr * 0.9); }
          else if (q.k === 3) { // a spark of bioluminescence: flares as it is stirred, then fades. (7.4.24, owner) a tiny sharp
            // point drawn out a little along its drift with a faint glow close round it, never a soft round blob
            const a = (f < 0.15 ? f / 0.15 : (1 - f) ** 1.6) * q.a * dark, rr = (1.6 + q.r * 2.2) * dr, sp = Math.hypot(q.vx || 0, q.vy || 0) || 1, ux = (q.vx || 0) / sp, uy = (q.vy || 0) / sp, ln = rr * (1.2 + Math.min(2, sp));
            ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
            ctx.strokeStyle = `rgba(120,160,210,${(0.35 * a).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, rr * 0.9); ctx.beginPath(); ctx.moveTo(x0 - ux * ln * 0.5, y0 - uy * ln * 0.5); ctx.lineTo(x0 + ux * ln * 0.5, y0 + uy * ln * 0.5); ctx.stroke();
            ctx.strokeStyle = `rgba(206,226,242,${(0.95 * a).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, rr * 0.3); ctx.beginPath(); ctx.moveTo(x0 - ux * ln * 0.35, y0 - uy * ln * 0.35); ctx.lineTo(x0 + ux * ln * 0.35, y0 + uy * ln * 0.35); ctx.stroke();
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
          else { // a mote (k 0) or a tail streak (k 2): smeared along its motion on the screen, so its length shows his speed
            const a = Math.min(1, f * 5) * (1 - f) ** 1.3 * q.a, kk = Math.min(1, (q.k === 2 ? 22 : 10) / (ml + 1e-3)), ln = q.k === 2 ? 2.6 : 1.5;
            ctx.globalAlpha = a * (q.k === 2 ? 0.42 : 0.62); ctx.strokeStyle = q.k === 2 ? 'rgb(226,232,224)' : 'rgb(210,222,216)'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, q.r * dr * (q.k === 2 ? 0.8 : 1.1));
            ctx.beginPath(); ctx.moveTo(x0 - mvx * ln * kk, y0 - mvy * ln * kk); ctx.lineTo(x0, y0); ctx.stroke(); }
          q.sx = x0; q.sy = y0; }
        ctx.restore(); ctx.globalAlpha = 1; } }
    if (g.mode === 'play' && g.echoAt != null && g.time - g.echoAt < 1.6) { const k = (g.time - g.echoAt) / 1.6, e = g.earl, m = e.inSub ? g.sub : e; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = `rgba(150,230,214,${(0.6 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(S(m.x), Sy(m.y), k * Math.max(this.W, this.H) * 0.7, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (g.mode === 'play' && g.subGuardT > 0) { const sx0 = S(g.sub.x), sy0 = Sy(g.sub.y), q = 0.5 + 0.5 * Math.sin(g.time * 6); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = `rgba(200,224,240,${(0.3 + 0.25 * q).toFixed(3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx0, sy0 - ppm * 0.6, ppm * 5.2, ppm * 2.6, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (g.tideFx) { const k = Math.min(1, g.tideFx.t / 1.2) * Math.min(1, (4.2 - g.tideFx.t) / 1); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(40,110,200,${(0.55 * k).toFixed(3)})`; ctx.fillRect(0, 0, this.W, this.H); ctx.globalCompositeOperation = 'source-over'; ctx.restore(); /* (7.6.7) no drawn rings: the burst carries them */ if (fx) fx.redTint = (fx.redTint || 0) * (1 - k); }
    // (5.7.0) the title's dive: once it is deep, a long shape passes slowly under the view, and if nothing is touched
    // for a while, a red eye opens in the dark at the lower right and watches
    if (g.mode === 'menu') {
      const T = g.time - (g.menuT0 ?? g.time), idle = g.time - (g.menuIdle0 ?? g.time);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (T > 38 && T < 70) { const k = (T - 38) / 32, x = this.W * (1.25 - 1.6 * k), y = this.H * 0.8, L = this.W * 0.55;
        ctx.globalAlpha = 0.55 * Math.sin(Math.PI * k); ctx.fillStyle = '#020405'; ctx.beginPath(); ctx.ellipse(x, y, L * 0.5, L * 0.075, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + L * 0.46, y); ctx.lineTo(x + L * 0.66, y - L * 0.09 + Math.sin(g.time * 1.4) * L * 0.02); ctx.lineTo(x + L * 0.63, y); ctx.lineTo(x + L * 0.66, y + L * 0.08 + Math.sin(g.time * 1.4) * L * 0.02); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - L * 0.05, y - L * 0.07); ctx.lineTo(x + L * 0.06, y - L * 0.15); ctx.lineTo(x + L * 0.1, y - L * 0.06); ctx.fill(); }
      // (7.7.0, owner) the eye in the dark: the thing's own painted eye (hud.js eyePicture: an ember iris full of fibres, a
      // rough hide round it), not gradients; its slit darts from place to place as a live eye does (quick saccades, a held
      // look, now and then a long stare), it narrows and widens, the glow round it beats unevenly, and it blinks
      if (T > 50 && idle > 22) { const o = smoothstep(22, 26, idle), E = eyePicture(), ew = Math.min(this.W, this.H) * 0.075, sc = ew / E.ew, ex = this.W * 0.87, ey = this.H * 0.88;
        const M = this.menuEye || (this.menuEye = { px: 0, py: 0, tx: 0, ty: 0, next: 0, dil: 1, tdil: 1, blinkAt: g.time + 3 }); const now = g.time, dt = Math.min(0.05, now - (M.t ?? now)); M.t = now;
        if (now > M.next) { const stare = Math.random() < 0.18; M.tx = (Math.random() - 0.5) * E.ew * 0.9; M.ty = (Math.random() - 0.5) * E.eh * 0.5; M.tdil = 0.55 + Math.random() * 0.9; M.next = now + (stare ? 1.4 + Math.random() * 1.6 : 0.18 + Math.random() * 0.7); }
        const kq = 1 - Math.exp(-dt * 26); M.px += (M.tx - M.px) * kq; M.py += (M.ty - M.py) * kq; M.dil += (M.tdil - M.dil) * (1 - Math.exp(-dt * 6));
        if (now > M.blinkAt + 0.22) M.blinkAt = now + 2.5 + Math.random() * 5; const bk = now > M.blinkAt ? Math.sin(clamp((now - M.blinkAt) / 0.22, 0, 1) * Math.PI) : 0;
        const beat = Math.pow(Math.max(0, Math.sin(now * 2.1)), 3) * 0.7 + Math.pow(Math.max(0, Math.sin(now * 2.1 - 0.9)), 6) * 0.4; // a heavy double beat
        { const gl = ctx.createRadialGradient(ex, ey, ew * 0.4, ex, ey, ew * (2.6 + 0.5 * beat)); gl.addColorStop(0, `rgba(170,22,10,${((0.5 + 0.35 * beat) * o).toFixed(3)})`); gl.addColorStop(0.45, `rgba(110,10,5,${((0.2 + 0.18 * beat) * o).toFixed(3)})`); gl.addColorStop(1, 'rgba(60,4,2,0)'); ctx.globalAlpha = 1; ctx.fillStyle = gl; ctx.fillRect(ex - ew * 3.2, ey - ew * 3.2, ew * 6.4, ew * 6.4); }
        ctx.save(); ctx.globalAlpha = o * (0.82 + 0.18 * beat); ctx.beginPath(); ctx.ellipse(ex, ey - E.eh * sc * 0.08, E.ew * sc * 1.45, E.eh * sc * 1.7, -0.18, 0, TAU); ctx.clip();
        ctx.drawImage(E.c, ex - E.cx * sc, ey - E.cy * sc, E.c.width * sc, E.c.height * sc); ctx.restore();
        ctx.save(); ctx.translate(ex, ey); ctx.scale(sc, sc); ctx.globalAlpha = o;
        const almond = () => { ctx.beginPath(); ctx.moveTo(-E.ew, E.eh * 0.25); ctx.bezierCurveTo(-E.ew * 0.55, -E.eh * 1.15, E.ew * 0.3, -E.eh * 1.2, E.ew, -E.eh * 0.5); ctx.bezierCurveTo(E.ew * 0.45, E.eh * 0.85, -E.ew * 0.45, E.eh * 1.05, -E.ew, E.eh * 0.25); ctx.closePath(); };
        almond(); ctx.clip();
        const px = M.px, py = M.py, sw = E.eh * 0.3 * M.dil * (1 + 0.08 * beat);
        { const hg = ctx.createRadialGradient(px, py, 0, px, py, E.eh * 0.95); hg.addColorStop(0, `rgba(255,190,140,${(0.45 + 0.25 * beat).toFixed(3)})`); hg.addColorStop(1, 'rgba(255,120,80,0)'); ctx.fillStyle = hg; ctx.fillRect(px - E.eh, py - E.eh, E.eh * 2, E.eh * 2); }
        ctx.shadowColor = 'rgba(90,10,2,0.9)'; ctx.shadowBlur = 6; ctx.fillStyle = '#040100'; ctx.beginPath(); ctx.moveTo(px, py - E.eh * 1.25); ctx.quadraticCurveTo(px + sw, py, px, py + E.eh * 1.25); ctx.quadraticCurveTo(px - sw, py, px, py - E.eh * 1.25); ctx.fill(); ctx.shadowBlur = 0;
        const shut = Math.max(bk, 1 - o); if (shut > 0.01) { ctx.fillStyle = '#060201'; const up = -E.eh * 1.25 + E.eh * 1.3 * shut, lo = E.eh * 1.1 - E.eh * 1.05 * shut; ctx.fillRect(-E.ew * 1.1, -E.eh * 1.4, E.ew * 2.2, up + E.eh * 1.4); ctx.fillRect(-E.ew * 1.1, lo, E.ew * 2.2, E.eh * 1.5); }
        ctx.restore(); }
      ctx.restore();
    }
    // (5.7.0) drowning: as the breath-hold runs out the colour drains, the edges of sight close in and pulse with the
    // heartbeat, until only a small circle round him is left
    // (5.9.3) on a phone the colour drains too, but by the browser's own filter on the game's canvas (done on the GPU when
    // it composites the page), in steps of 5%, instead of a 'saturation' fill over every pixel (too slow on an iPhone)
    // (7.7.2, owner) the thing's red is done the same way, on every screen: the picture recoloured red (sepia, turned
    // to red and deepened), a little dimmer; black stays black, and only what is lit shows the red
    {
      const want = this.phone && g.noAir && g.mode === 'play' ? Math.round((1 - 0.85 * clamp(g.noAir / 15, 0, 1)) * 20) / 20 : 1;
      const red = g.mode === 'menu' ? 0 : Math.round(clamp(fx.redTint || 0, 0, 1) * 20) / 20;
      const key = want + ':' + red;
      if (key !== this.filtKey) { this.filtKey = key; const f = [];
        if (red > 0) f.push(`sepia(${Math.min(1, 1.5 * red).toFixed(2)})`, `hue-rotate(${(-40 * Math.min(1, 1.5 * red)).toFixed(0)}deg)`, `saturate(${(1 + 2.4 * red).toFixed(2)})`, `brightness(${(1 - 0.72 * red).toFixed(2)})` /* (7.7.3) sepia lifts dark blue: brought back to about the same brightness as the water was, a touch less */);
        if (want < 1) f.push(`saturate(${want})`);
        this.filterExtra = f.join(' '); } // main.js puts it on the canvas, with the dread grade and the wake's blur (one writer)
    }
    if (g.noAir && g.mode === 'play') {
      const k = clamp(g.noAir / 15, 0, 1), hb = Math.pow(Math.max(0, Math.sin(g.time * Math.PI * (1.6 - 0.8 * k))), 6);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!this.phone) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, this.W, this.H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      const cx = S(g.earl.x), cy = Sy(g.earl.y), big = Math.hypot(this.W, this.H), inner = big * (0.55 - 0.47 * k) * (1 - 0.05 * hb), outer = inner + big * (0.35 - 0.2 * k);
      const vg = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${(0.55 + 0.43 * k).toFixed(3)})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, this.W, this.H);
      if (this.phone) { ctx.fillStyle = `rgba(30,32,34,${(0.18 * k).toFixed(3)})`; ctx.fillRect(0, 0, this.W, this.H); } /* (5.9.3) less of the grey wash now the filter drains it */
      ctx.restore();
    }
    // its red, crept into the water round him: the black of the deep turns a black-red
    if ((fx.redTint || 0) > 0.01) {
      // (7.6.0, owner) back to the red of before 4.0 (a blood-red glow lifted over the water; the 7.2.2 rust stain read as
      // too dark), and everything already drawn pulled toward red first: skill light, beams, motes and lamps no longer
      // stay white over red water, they are reddened and dimmed with it, more the deeper the red
      const k = fx.redTint, cx = this.W / 2, cy = this.H / 2;
      // (7.7.2, owner) a tint in the water, never a light: only multiplied, so black water stays black and only what is
      // lit (lamps, the shallows, every fish's own light) turns red, a little dimmer. Nothing is added over the dark
      void cx; void cy; void k; // (the recolouring itself is the canvas's filter, set with the drowning's below)
    }
    // (7.6.7, owner) the burst that opens every skill: no drawn circle but a lens rolling out from him. In a band round
    // its front the water is magnified, as through thick glass (the frame already drawn, copied and scaled up about him,
    // inside the band), and the front catches light, unevenly round its way, brightest just ahead of the bend and fading
    // behind. Rare reaches a few metres; exotic and up send a second, weaker wave after it; legendary crosses the screen;
    // a Heart first pulls the water in toward him and darkens it, then bursts out with the brightest light in the game
    if (g.mode === 'play' && g.bursts && g.bursts.length) {
      // (7.6.26) heat: the lens is worked at half resolution (a quarter of the pixels); its band is soft, so it reads the same
      const HR = 0.5, hw = Math.ceil(this.c.width * HR), hh = Math.ceil(this.c.height * HR);
      const diag = Math.hypot(this.W, this.H), PEAK = { rare: 0.32, exotic: 0.42, legendary: 0.58, mythical: 0.9 };
      const lc = this.burstL || (this.burstL = document.createElement('canvas')); if (lc.width !== hw || lc.height !== hh) { lc.width = hw; lc.height = hh; } const lx2 = lc.getContext('2d');
      // (7.6.29, owner) the bend is a ripple, never a pane of glass: the band is cut into many thin rings and each is drawn
      // pushed outward by its own small amount along a smooth wave (nothing at either edge, most in the middle), so the water
      // bends with no seam and no edge; drawn over the scene (never cut out of it), so nothing behind the canvas shows
      const fc = this.burstF || (this.burstF = document.createElement('canvas')); if (fc.width !== this.c.width || fc.height !== this.c.height) { fc.width = this.c.width; fc.height = this.c.height; }
      let fcFresh = false; const fresh = () => { if (fcFresh) return; const fx2 = fc.getContext('2d'); fx2.setTransform(1, 0, 0, 1, 0, 0); fx2.globalCompositeOperation = 'copy'; fx2.drawImage(this.c, 0, 0); fcFresh = true; };
      const lens = (cx, cy, r0, r1, push) => { if (r1 <= r0 + 2 || Math.abs(push) < 0.4) return; fresh(); const N = Math.max(8, Math.min(18, Math.round(Math.abs(push) * 1.4)));
        for (let i = 0; i < N; i++) { const ra = r0 + (r1 - r0) * i / N, rb = r0 + (r1 - r0) * (i + 1) / N, rm = (ra + rb) / 2, u = (i + 0.5) / N, d = push * Math.pow(Math.sin(Math.PI * u), 2); if (rm < 2) continue;
          const s2 = rm / Math.max(1, rm - d); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rb + 0.6, 0, TAU); if (ra > 0.5) ctx.arc(cx, cy, ra - 0.6, 0, TAU, true); ctx.clip('evenodd');
          ctx.translate(cx, cy); ctx.scale(s2, s2); ctx.translate(-cx, -cy); ctx.drawImage(fc, 0, 0); ctx.restore(); } };
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const B of g.bursts) {
        const cx = S(B.x), cy = Sy(B.y), C = hexToRgb(B.tier === 'mythical' ? '#ffd8a0' : (ACCENT[B.fam] || '#e8dcc0')), pull = B.pull || 0;
        if (B.t < pull) { // the Heart's breath in: the water drawn toward him and darkening
          const k = B.t / pull, sc = 1 - 0.05 * Math.sin(k * Math.PI / 2);
          lens(cx, cy, 0, Math.min(this.W, this.H) * 0.6, -(1 - sc) * Math.min(this.W, this.H) * 0.5);
          const dg = ctx.createRadialGradient(cx, cy, ppm * 0.8, cx, cy, diag * 0.55); dg.addColorStop(0, `rgba(0,0,0,${(0.15 * k).toFixed(3)})`); dg.addColorStop(0.35, `rgba(0,0,0,${(0.5 * k).toFixed(3)})`); dg.addColorStop(1, `rgba(0,0,0,${(0.25 * k).toFixed(3)})`);
          ctx.fillStyle = dg; ctx.fillRect(0, 0, this.W, this.H);
          const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, ppm * 1.4); hg.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},${(0.6 * k * k).toFixed(3)})`); hg.addColorStop(1, `rgba(${C[0]},${C[1]},${C[2]},0)`);
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hg; ctx.fillRect(cx - ppm * 1.4, cy - ppm * 1.4, ppm * 2.8, ppm * 2.8); ctx.globalCompositeOperation = 'source-over';
          continue;
        }
        const tt = B.t - pull, reach = B.reach ? B.reach * ppm : diag * (B.tier === 'mythical' ? 1.2 : 0.85);
        const waves = (B.second ? [[0, 1], [0.35, 0.55]] : [[0, 1]]).map(([d0, wk]) => { const k = (tt - d0) / B.dur; if (k <= 0 || k >= 1) return null;
          const R = Math.max(ppm * 0.3, reach * (1 - Math.pow(1 - k, 2.1))), w = Math.max(ppm * 0.9, reach * (B.reach ? 0.5 : 0.17)) * (0.6 + 0.4 * wk); return { k, wk, R, w, lw: Math.max(ppm * 0.6, w * 0.95), fade: Math.pow(1 - k, 1.05) * wk }; }).filter(Boolean); // (7.6.15, owner) wide, soft and long
        // the bends first, every wave (so a later one never wipes an earlier one's light): the band magnified most at its
        // middle and less toward its edges, in nested steps, so it has no seam
        for (const V of waves) lens(cx, cy, Math.max(0, V.R - V.w * 0.7), V.R + V.w * 1.6, ppm * B.mag * 2.2 * V.fade); // (7.6.15) bent most just past the front and on beyond it, fading far out: the water stretched
        // then the light on each front, uneven round the way, and a little light left in the water behind it, fading inward
        ctx.globalCompositeOperation = 'lighter';
        if (B.tier === 'mythical' && tt < 0.5) { const f = 1 - tt / 0.5; ctx.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${(0.3 * f * f).toFixed(3)})`; ctx.fillRect(0, 0, this.W, this.H); } // (the Heart's flash: the brightest light in the game, gone in half a second)
        for (const V of waves) { const { R, lw } = V;
          const pk = PEAK[B.tier] * V.fade * 0.75, lg = ctx.createRadialGradient(cx, cy, Math.max(0, R - lw), cx, cy, R + lw * 0.45);
          lg.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},0)`); lg.addColorStop(0.55, `rgba(${C[0]},${C[1]},${C[2]},${(pk * 0.55).toFixed(3)})`); lg.addColorStop(0.8, `rgba(${C[0]},${C[1]},${C[2]},${pk.toFixed(3)})`); lg.addColorStop(1, `rgba(${C[0]},${C[1]},${C[2]},0)`);
          // (one smooth ring, then made brighter and dimmer round its way by an angular mask: no slices, no ticks)
          { const r1 = R + lw * 0.5, x0 = Math.max(0, Math.floor(cx - r1)), y0 = Math.max(0, Math.floor(cy - r1)), x1 = Math.min(this.c.width, Math.ceil(cx + r1)), y1 = Math.min(this.c.height, Math.ceil(cy + r1)), bw = x1 - x0, bh = y1 - y0;
            if (bw > 0 && bh > 0) { lx2.setTransform(HR, 0, 0, HR, 0, 0); lx2.globalCompositeOperation = 'source-over'; lx2.clearRect(x0, y0, bw, bh); lx2.fillStyle = lg; lx2.beginPath(); lx2.arc(cx, cy, r1, 0, TAU); lx2.arc(cx, cy, Math.max(0, R - lw), 0, TAU, true); lx2.fill('evenodd');
              if (lx2.createConicGradient) { const cg = lx2.createConicGradient(B.x * 3.1 % TAU + tt * 0.5, cx, cy), s2 = B.y * 1.7 % TAU; for (let i = 0; i <= 24; i++) { const am = i / 24 * TAU, nz = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(am * 3)) * (0.6 + 0.4 * Math.sin(am * 5 - tt * 1.3 + s2)); cg.addColorStop(i / 24, `rgba(0,0,0,${nz.toFixed(3)})`); } lx2.globalCompositeOperation = 'destination-in'; lx2.fillStyle = cg; lx2.fillRect(x0, y0, bw, bh); lx2.globalCompositeOperation = 'source-over'; }
              ctx.drawImage(lc, x0 * HR, y0 * HR, bw * HR, bh * HR, x0, y0, bw, bh); } }
          if (B.tier === 'legendary' || B.tier === 'mythical') { const ig = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, Math.max(R * 0.35 + 1, R - lw * 0.5)); ig.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},0)`); ig.addColorStop(1, `rgba(${C[0]},${C[1]},${C[2]},${(0.14 * pk).toFixed(3)})`); ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, R - lw * 0.5), 0, TAU); ctx.fill(); }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }
    if (fx.ghost > 0.01) {
      // double vision
      // the second image is copied at half resolution: a quarter of the work, and it is a ghost anyway
      const gw = Math.ceil(W / 2), gh = Math.ceil(H / 2);
      if (this.gc.width !== gw || this.gc.height !== gh) { this.gc.width = gw; this.gc.height = gh; }
      this.gctx.clearRect(0, 0, gw, gh);
      this.gctx.drawImage(this.c, 0, 0, gw, gh);
      // the second image drifts apart and back together
      const sep = fx.ghost * (0.6 + 0.4 * Math.sin(t * 0.8));
      ctx.globalAlpha = fx.ghost * 0.45;
      ctx.drawImage(this.gc, Math.sin(t * 1.3) * ppm * 0.9 * sep, Math.cos(t * 1.1) * ppm * 0.4 * sep, W, H);
      ctx.globalAlpha = 1;
    }
    // (4.9.0) the legendary moment: the edges of the sea grey out and darken, so only the legend stands out
    const lk = g.legendK || 0, la = g.legend ? g.legend.c : this.legendAt;
    if (lk > 0.01 && la && g.mode === 'play') {
      const lx = S(la.x), ly = Sy(la.y), r0 = Math.max(Math.min(W, H) * 0.16, ppm * Math.max(2, la.len * 1.6)), r1 = Math.hypot(W, H) * 0.62;
      ctx.save();
      const dg = ctx.createRadialGradient(lx, ly, r0, lx, ly, r1);
      dg.addColorStop(0, 'rgba(128,128,128,0)'); dg.addColorStop(0.45, `rgba(128,128,128,${(0.7 * lk).toFixed(3)})`); dg.addColorStop(1, `rgba(128,128,128,${(0.95 * lk).toFixed(3)})`);
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const kg = ctx.createRadialGradient(lx, ly, r0 * 0.9, lx, ly, r1);
      kg.addColorStop(0, 'rgba(0,0,0,0)'); kg.addColorStop(0.5, `rgba(0,2,4,${(0.42 * lk).toFixed(3)})`); kg.addColorStop(1, `rgba(0,2,4,${(0.78 * lk).toFixed(3)})`);
      ctx.fillStyle = kg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (lk <= 0.01) this.legendAt = null;
    // vignette
    const vs = 0.38 + fx.vignette * 0.32;
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.42 - fx.vignette * 0.2), W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${vs.toFixed(3)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // injury: red creeping in from the edges, pulsing with the heartbeat when it's bad
    const lvl = Math.min(4, g.injury || 0);
    if (lvl > 0 || fx.redFlash > 0 || fx.redDeath > 0) {
      const beat = lvl >= 3 ? 0.75 + 0.25 * Math.pow(Math.max(0, Math.sin(t * g.earl.hr / 60 * Math.PI)), 6) : 1;
      const edge = [0, 0.22, 0.38, 0.55, 0.7][lvl] * beat + (fx.redDeath || 0) * 0.6;
      const inner = Math.min(W, H) * (0.42 - lvl * 0.07 - (fx.redDeath || 0) * 0.4);
      const rg = ctx.createRadialGradient(W / 2, H / 2, Math.max(0, inner), W / 2, H / 2, Math.max(W, H) * 0.75);
      rg.addColorStop(0, 'rgba(90,0,0,0)'); rg.addColorStop(1, `rgba(110,4,6,${Math.min(0.92, edge).toFixed(3)})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      if (fx.redFlash > 0) { ctx.fillStyle = `rgba(160,0,0,${(0.35 * fx.redFlash).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      if (fx.redDeath > 0) { ctx.fillStyle = `rgba(40,0,0,${(0.55 * fx.redDeath).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    }
    // being marked: a slow dark pulse closing in from the edges
    if (fx.markPulse > 0) {
      const mp = Math.sin(Math.min(1, (1 - fx.markPulse) * 1.6) * Math.PI) * fx.markPulse;
      const mg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.7);
      mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, `rgba(0,0,8,${(0.75 * mp).toFixed(3)})`);
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
    }
    if (fx.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${fx.flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    if (fx.black > 0) { ctx.fillStyle = `rgba(0,0,0,${fx.black.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }

  // Full-detail creatures are expensive to draw (gradients, scales, fins), so each species' swim
  // cycle is rendered once per size into a strip of animation frames and replayed. Same detail,
  // a fraction of the cost. Long or very large animals are still drawn live.
  // A rare variant: the species' frame, with the variant worked into it, cached per size and frame.
  drawVariant(ctx, sp, v, Ld, phase) {
    const cache = this.variantCache || (this.variantCache = new Map());
    const Lc = Math.min(Ld, 220);
    const bucket = Math.round(Math.log(Math.max(4, Lc)) / Math.log(1.18)), bl = Math.pow(1.18, bucket);
    const f = Math.floor((((phase % SPRITE_PERIOD) + SPRITE_PERIOD) % SPRITE_PERIOD) / SPRITE_PERIOD * 16) % 16;
    const key = sp.id + v + ':' + bucket + ':' + f;
    let e = cache.get(key);
    if (!e) {
      const box = Math.ceil(bl * 2.4);
      const base = document.createElement('canvas'); base.width = base.height = box;
      const bx = base.getContext('2d'); bx.translate(box / 2, box / 2);
      drawSpecies(bx, sp, bl, (f / 16) * SPRITE_PERIOD, 1, 0);
      e = { c: makeVariantSprite(base, v, bl, sp), box, bl };
      cache.set(key, e);
      if (cache.size > 400) cache.delete(cache.keys().next().value);
    }
    const k = Ld / e.bl;
    ctx.drawImage(e.c, -e.box / 2 * k, -e.box / 2 * k, e.box * k, e.box * k);
    return null;
  }

  // A cached sprite's size: bucketed on the full-quality scale, so the adaptive quality stepping up or
  // down never throws the cache away (a smaller canvas just draws the same sprite smaller).
  spriteKey(sp, Ld) {
    const Lf = Ld / (this.quality || 1), bucket = Math.round(Math.log(Lf) / Math.log(1.4)); // coarse: one set of frames serves a species' big and small individuals
    return { Lf, key: sp.id + ':' + bucket, bl: Math.pow(1.4, bucket) };
  }
  drawCached(ctx, sp, Ld, phase, wob, veil = null) {
    const shape = sp.v.s;
    if (Ld > 150 || Ld < 6 || CACHE_SKIP.has(shape)) return drawSpecies(ctx, sp, Ld, phase, 1, wob);
    const cache = this.spriteCache || (this.spriteCache = new Map());
    const { key, bl } = this.spriteKey(sp, Ld);
    let e = cache.get(key);
    if (!e) {
      const box = Math.ceil(bl * 2.4);
      e = { box, bl, frames: new Array(SPRITE_FRAMES), glows: new Array(SPRITE_FRAMES), seen: this.frameNo };
      cache.set(key, e);
      if (cache.size > (this.phone ? 360 : 900)) cache.delete(cache.keys().next().value); // keep memory bounded (a phone tighter)
    } else if (e.seen !== this.frameNo) { e.seen = this.frameNo; cache.delete(key); cache.set(key, e); } // (5.4) used: to the back of the queue, so what is on screen is the last to go
    let f = Math.floor((((phase % SPRITE_PERIOD) + SPRITE_PERIOD) % SPRITE_PERIOD) / SPRITE_PERIOD * SPRITE_FRAMES) % SPRITE_FRAMES;
    if (!e.frames[f]) {
      // not built yet: show the nearest frame that is, and let the warm-up queue fill the gap
      // instead of stalling this frame
      for (let d = 1; d < SPRITE_FRAMES / 2 && !e.frames[f]; d++) {
        if (e.frames[(f + d) % SPRITE_FRAMES]) f = (f + d) % SPRITE_FRAMES;
        else if (e.frames[(f - d + SPRITE_FRAMES) % SPRITE_FRAMES]) f = (f - d + SPRITE_FRAMES) % SPRITE_FRAMES;
      }
    }
    if (!e.frames[f]) this.buildFrame(e, sp, f);
    const k = Ld / e.bl;
    ctx.drawImage(veil ? this.veiled(e, f, veil) : e.frames[f], -e.box / 2 * k, -e.box / 2 * k, e.box * k, e.box * k);
    const gl = e.glows[f];
    return gl ? gl.map(([gx, gy, sz]) => [gx * k, gy * k, sz]) : null;
  }

  // Seabed life (corals, anemones, sponges, seagrass, crabs...) never goes anywhere, so each kind is
  // drawn once per size into a picture and reused; soft things sway by bending the picture gently.
  // which statics can be baked: still, unlit by their own light, ordinary, and in the lit shallows
  staticBakeable(s) { return !s.variant && !s.sp.v.glow && !SWAY.has(s.sp.v.s) && s.y < 160; }
  drawStaticChunks(g, ctx, S, Sy, ppm, x0, x1, y0, y1) {
    const CH = 16, W = g.world, ver = W.staticsVer || 0;
    const ppmB = ppm / (this.quality || 1); // baked at the full-quality scale: the adaptive quality never forces a rebake
    if (!this.sChunks || this.sChunksWorld !== W || this.sChunksVer !== ver) {
      // which statics belong to which stretch (made again when one is taken or planted)
      const m = new Map();
      for (const s of W.statics) if (this.staticBakeable(s)) { const k = Math.floor(s.x / CH); if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
      const old = this.sChunks;
      this.sChunks = new Map([...m].map(([k, list]) => [k, { list, set: new Set(list), c: null, ppm: 0 }]));
      if (old) for (const v of old.values()) if (v.c) { v.c.width = v.c.height = 0; }
      this.sChunksWorld = W; this.sChunksVer = ver; this.sBakedSet = null;
    }
    const baked = this.sBakedSet || (this.sBakedSet = new Set([...this.sChunks.values()].flatMap((ch) => ch.list)));
    for (let k = Math.floor((x0 - 3) / CH); k <= Math.floor((x1 + 3) / CH); k++) {
      const ch = this.sChunks.get(k);
      if (!ch) continue;
      if (!ch.c || Math.abs(ppmB / ch.ppm - 1) > 0.12) {
        // bake: every still static of this stretch, at today's scale, tinted for its depth
        let ya = 1e9, yb = -1e9;
        for (const s of ch.list) { const L = Math.max(0.18, s.sp.len) * s.scale; ya = Math.min(ya, s.y - L * 2); yb = Math.max(yb, s.y + L * 0.6); }
        const bx0 = k * CH - 3, bx1 = (k + 1) * CH + 3;
        ch.x0 = bx0; ch.y0 = ya; ch.ppm = ppmB;
        const cw = Math.ceil((bx1 - bx0) * ppmB), chh = Math.max(4, Math.ceil((yb - ya) * ppmB));
        if (cw * chh > 6e6) { ch.c = null; ch.skip = true; continue; } // absurdly zoomed: draw them live instead
        ch.skip = false;
        ch.c = ch.c || document.createElement('canvas'); ch.c.width = cw; ch.c.height = chh;
        const cx = ch.c.getContext('2d');
        for (const s of ch.list) {
          const L = Math.max(0.18, s.sp.len) * s.scale * ppmB;
          const pose = staticPose(W, s);
          cx.save(); cx.translate((s.x - bx0) * ppmB, (s.y - ya + pose.sink) * ppmB); cx.rotate(pose.rot); cx.scale(s.flip, 1);
          this.drawStatic(cx, s, L, 0, this.veilFor(s.y));
          cx.restore();
        }
        ch.w = cw; ch.h = chh;
      }
      if (ch.skip || !ch.c) { for (const s of ch.list) baked.delete(s); continue; }
      const sc = ppm / ch.ppm;
      ctx.drawImage(ch.c, S(ch.x0), Sy(ch.y0), ch.w * sc, ch.h * sc);
    }
    return baked;
  }

  drawStatic(ctx, s, L, t, veil) {
    const sp = s.sp, cache = this.staticCache || (this.staticCache = new Map());
    const bucket = Math.round(Math.log(Math.max(4, L)) / Math.log(1.15)), bl = Math.pow(1.15, bucket), key = sp.id + ':' + bucket + ':' + veil.band;
    let e = cache.get(key);
    if (!e) {
      const bw = Math.ceil(bl * 2.4), bh = Math.ceil(bl * 2.4), oy = Math.ceil(bh * 0.82);
      const c = document.createElement('canvas'); c.width = bw; c.height = bh;
      const x = c.getContext('2d'); x.translate(bw / 2, oy);
      const glow = drawSpecies(x, sp, bl, 1.3, 0.3, 0);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgbStr(veil.col, veil.a); x.fillRect(0, 0, bw, bh);
      e = { c, bw, bh, oy, bl, glow };
      cache.set(key, e);
      if (cache.size > 500) cache.delete(cache.keys().next().value);
    }
    const k = L / e.bl;
    if (SWAY.has(sp.v.s)) ctx.transform(1, 0, Math.sin(t * 0.8 + s.phase) * 0.07, 1, 0, 0); // the top leans with the swell
    ctx.drawImage(e.c, -e.bw / 2 * k, -e.oy * k, e.bw * k, e.bh * k);
    return e.glow ? e.glow.map(([gx, gy, sz]) => [gx * k, gy * k, sz]) : null;
  }

  // The water between the eye and an animal at depth d: its colour and how thick it is. Quantised
  // into bands (finer near the surface), so each stored picture is tinted once per band.
  veilFor(d) {
    const band = d <= 0 ? 0 : Math.round(Math.log2(1 + d / 4) * 3);
    const cache = this.veilCache || (this.veilCache = []);
    if (!cache[band]) {
      const dd = band === 0 ? 0 : 4 * (Math.pow(2, band / 3) - 1);
      cache[band] = { band, col: mixRgb(sampleTable(WATER_ALBEDO, dd), [150, 190, 200], 0.15), a: dd <= 0 ? 0 : 0.1 + 0.24 * smoothstep(0, 90, dd) };
    }
    return cache[band];
  }
  // an animation frame with the water's tint laid over it (made on first use, kept with the frame)
  veiled(e, f, veil) {
    if (!veil.a) return e.frames[f];
    const v = e.veil || (e.veil = {});
    let arr = v[veil.band];
    if (!arr) { arr = v[veil.band] = new Array(SPRITE_FRAMES); const ks = Object.keys(v); if (ks.length > 2) delete v[ks[0] === String(veil.band) ? ks[1] : ks[0]]; } // keep the last two bands
    if (!arr[f]) {
      const c = document.createElement('canvas'); c.width = c.height = e.box;
      const x = c.getContext('2d'); x.drawImage(e.frames[f], 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgbStr(veil.col, veil.a); x.fillRect(0, 0, e.box, e.box);
      arr[f] = c;
    }
    return arr[f];
  }

  // One animation frame of a species, drawn once and kept.
  buildFrame(e, sp, f) {
    const c = document.createElement('canvas'); c.width = c.height = e.box;
    const x = c.getContext('2d'); x.translate(e.box / 2, e.box / 2);
    e.glows[f] = drawSpecies(x, sp, e.bl, (f / SPRITE_FRAMES) * SPRITE_PERIOD, 1, 0);
    // (5.4) the rim-light masks and the belly shade built here were no longer drawn (2.3.2): ~25 MB of canvases and
    // several passes per frame for nothing, gone
    e.frames[f] = c;
  }

  // Build creature animation frames ahead of time, a little each frame: first every species on
  // screen, then every swimmer that lives within ~150 m of the camera's depth, at today's scale.
  warmSprites(g, budgetMs, onlyLiving = false) {
    const t0 = performance.now(), ppm = this.cam.ppm;
    if (!ppm) return false;
    if (budgetMs < 3 && (this.warmTick = (this.warmTick || 0) + 1) % 3) return false; // frames running slow: build only every third frame
    const cache = this.spriteCache || (this.spriteCache = new Map());
    const wanted = [];
    for (const c of g.fauna.list) wanted.push([c.sp, fishDrawLen(c.len) * ppm]);
    if (!this.nearSpecies || Math.abs(this.nearDepth - this.cam.y) > 25) {
      const d = this.cam.y;
      this.nearSpecies = SPECIES.filter((sp) => sp.v.hab !== 'plant' && sp.v.hab !== 'floor' && sp.dmin <= d + 60 && sp.dmax >= d - 40);
      this.nearDepth = d; this.nearPpm = Math.round(ppm);
    }
    if (budgetMs >= 3 && !onlyLiving) for (const sp of this.nearSpecies) wanted.push([sp, fishDrawLen(sp.len) * ppm]); // the look-ahead only when frames are quick
    for (const [sp, Ld] of wanted) {
      if (Ld > 150 || Ld < 6 || CACHE_SKIP.has(sp.v.s) || (SIMPLE_SMALL && Ld < 20 && (sp.v.s === 'fish' || sp.v.s === 'shrimp' || sp.v.s === 'hatchet'))) continue;
      const { key, bl } = this.spriteKey(sp, Ld);
      let e = cache.get(key);
      if (!e) { const box = Math.ceil(bl * 2.4); e = { box, bl, frames: new Array(SPRITE_FRAMES), glows: new Array(SPRITE_FRAMES), seen: this.frameNo }; cache.set(key, e); if (cache.size > (this.phone ? 360 : 900)) cache.delete(cache.keys().next().value); } // (5.4) the same bound as drawCached
      for (let f = 0; f < SPRITE_FRAMES; f++) {
        if (e.frames[f]) continue;
        this.buildFrame(e, sp, f);
        if (performance.now() - t0 > budgetMs) return false;
      }
    }
    return true;
  }

  // where the headlamp points: at the cursor if the mouse is in use (within the half he faces),
  // otherwise where his head looks
  // how strongly the lamps (Earl's torch, the sub's) light a screen point this frame: 0 dark .. 1 full beam
  litAt(x, y) {
    let s = 0;
    for (const L of this.lamps || []) {
      const dx = x - L.x, dy = y - L.y, d = Math.hypot(dx, dy);
      if (L.r) { if (d < L.r) s += L.a * (1 - d / L.r) * 2.5; continue; }
      if (d > L.range * 0.75) continue;
      let da = Math.abs(Math.atan2(dy, dx) - L.ang) % TAU; if (da > Math.PI) da = TAU - da;
      const w = L.spread * 1.3; if (da > w && d > L.range * 0.04) continue;
      const angF = d < L.range * 0.04 ? 1 : 1 - clamp((da - L.spread * 0.5) / (w - L.spread * 0.5), 0, 1);
      s += L.a * angF * clamp(1 - d / (L.range * 0.75), 0, 1) * 1.8;
    }
    return clamp(s, 0, 1);
  }

  lampAngle(g, e, head) {
    const natural = e.facing > 0 ? e.angle + head.beamA : Math.PI - e.angle - head.beamA;
    // (7.4.26, owner) the lamp turned by the right hand: eased toward where the finger is, never behind him
    if (g.aim == null && (g.lampK || 0) > 0.001 && g.lampA != null) { const fwd = e.facing > 0 ? 0 : Math.PI; let d = ((g.lampA - fwd + Math.PI * 3) % (Math.PI * 2)) - Math.PI; d = clamp(d, -Math.PI / 2, Math.PI / 2); /* (7.7.2, owner) the whole half in front of him, straight up to straight down: the finger reaches below where the lamp rests when let go */ /* (7.5.0, owner) from straight up to just below the net's angle, never behind him */ const want = fwd + d; let dd = ((want - natural + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return natural + dd * g.lampK; }
    if (g.aim == null) return natural;
    let a = g.aim;
    const fwd = e.facing > 0 ? 0 : Math.PI;
    let d = ((a - fwd + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    d = clamp(d, -1.35, 1.35);
    return fwd + d;
  }

  // The sky is all soft gradients and clouds: painted at half resolution, remade every other frame
  // (shifted to the horizon in between), and laid in as one image.
  drawSkyCached(g, horizon, dayEff, day) {
    const W = this.W, H = this.H, main = this.ctx;
    const C = this.skyC || (this.skyC = document.createElement('canvas'));
    const sh = Math.max(4, Math.min(H, Math.ceil(horizon + 4 * this.cam.ppm))); // the sky and a little below the surface (the beach)
    const cw = Math.ceil(W / 2), ch = Math.ceil(sh / 2);
    this.skyN = (this.skyN || 0) + 1;
    // redrawn every other frame, or at once if the view has moved more than a couple of pixels
    const moved = !this.skyAt || Math.abs(this.skyAt.cx - this.cam.x) * this.cam.ppm > 2;
    if (C.width !== cw || C.height !== ch || this.skyN % 2 === 0 || moved) {
      if (C.width !== cw || C.height !== ch) { C.width = cw; C.height = ch; }
      const x = C.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch); x.setTransform(0.5, 0, 0, 0.5, 0, 0);
      this.ctx = x;
      try { this.drawSky(g, horizon, dayEff, day); } finally { this.ctx = main; }
      this.skyAt = { horizon, cx: this.cam.x };
    }
    main.drawImage(C, 0, horizon - this.skyAt.horizon, cw * 2, ch * 2);
  }

  drawSky(g, horizon, dayEff, day) {
    const ctx = this.ctx, W = this.W;
    const t = g.time;
    const sunset = day.phase === 'sunset' || day.phase === 'sunrise' ? 1 - Math.abs(dayEff - 0.5) * 2 : 0;
    // A real sky is several colours deep. At sunset: deep indigo overhead, through violet and
    // dusky rose, to salmon and gold, with a pale glow right on the horizon.
    const NIGHT = [[4, 7, 16], [6, 11, 24], [8, 15, 30], [11, 20, 36], [16, 26, 42]];
    const DAY = [[56, 108, 168], [84, 136, 188], [118, 164, 204], [156, 192, 216], [190, 212, 224]];
    const DUSK = [[34, 40, 86], [96, 72, 128], [196, 112, 122], [240, 152, 104], [252, 204, 150]];
    const stops = [0, 0.38, 0.66, 0.86, 1];
    const sg = ctx.createLinearGradient(0, horizon - this.H, 0, horizon);
    for (let i = 0; i < 5; i++) sg.addColorStop(stops[i], rgbStr(mixRgb(mixRgb(NIGHT[i], DAY[i], dayEff), DUSK[i], sunset * 0.9)));
    this.sunset = sunset;
    ctx.fillStyle = sg; ctx.fillRect(-20, -20, W + 40, horizon + 22 + (0.2 + g.waveBoost * 2.5) * this.cam.ppm);
    // stars
    // (4.0.0) baked once per screen size into their own layer: points scattered at random (no rows), most
    // faint and tiny, a few bright ones with a soft glow, faintly blue or warm, thinning toward the haze
    if (dayEff < 0.4) {
      const sh = Math.ceil(this.H * 0.9), sw = Math.ceil(W);
      if (!this.starC || this.starC.width !== sw || this.starC.height !== sh) {
        const c = this.starC || (this.starC = document.createElement('canvas')); c.width = sw; c.height = sh;
        const x = c.getContext('2d'); let z = 1234567;
        const rnd = () => { z ^= z << 13; z ^= z >>> 17; z ^= z << 5; return ((z >>> 0) % 100000) / 100000; };
        const n = Math.round(sw * sh / 2600);
        for (let i = 0; i < n; i++) {
          const px = rnd() * sw, py = rnd() * sh, k = py / sh; // k: toward the horizon
          if (rnd() < k * 0.75) continue; // the haze near the sea hides most of the low ones
          const m = Math.pow(rnd(), 5); // magnitude: very few bright
          const tint = rnd(), col = tint < 0.2 ? '200,215,255' : tint > 0.88 ? '255,226,196' : '236,240,255';
          const a = (0.25 + 0.75 * Math.min(1, m * 3 + 0.15)) * (1 - k * 0.5);
          if (m > 0.25) {
            const r = 2 + m * 5, gl = x.createRadialGradient(px, py, 0, px, py, r);
            gl.addColorStop(0, `rgba(${col},${(a * 0.5).toFixed(3)})`); gl.addColorStop(1, `rgba(${col},0)`);
            x.fillStyle = gl; x.fillRect(px - r, py - r, r * 2, r * 2);
          }
          x.fillStyle = `rgba(${col},${a.toFixed(3)})`;
          x.beginPath(); x.arc(px, py, 0.45 + m * 1.1, 0, TAU); x.fill();
        }
      }
      ctx.save(); ctx.globalAlpha = Math.min(1, (0.4 - dayEff) * 2.5);
      ctx.beginPath(); ctx.rect(0, 0, W, horizon - 4); ctx.clip();
      ctx.drawImage(this.starC, 0, horizon - this.H * 0.9);
      ctx.restore();
    }
    // sun / moon
    const arc = (p) => [W * (0.1 + p * 0.8), horizon - Math.sin(p * Math.PI) * this.H * 0.45 - 20];
    if (day.sun !== null) {
      const [x, y] = arc(day.sun);
      const sb = Math.max(dayEff, sunset * 0.9);
      // low sun: a wide warm bloom spreading along the horizon, a gold disc in the middle
      if (sunset > 0.05) {
        const bloom = ctx.createRadialGradient(x, y, 0, x, y, this.H * 0.75);
        bloom.addColorStop(0, `rgba(255,190,120,${(0.55 * sunset).toFixed(3)})`); bloom.addColorStop(0.35, `rgba(240,130,100,${(0.22 * sunset).toFixed(3)})`); bloom.addColorStop(1, 'rgba(200,100,120,0)');
        ctx.save(); ctx.translate(x, y); ctx.scale(1.8, 0.7); ctx.translate(-x, -y);
        ctx.fillStyle = bloom; ctx.fillRect(x - this.H, y - this.H, this.H * 2, this.H * 2);
        ctx.restore();
      }
      const gg = ctx.createRadialGradient(x, y, 0, x, y, this.H * 0.18);
      const core = mixRgb([255, 246, 225], [255, 214, 150], sunset);
      gg.addColorStop(0, rgbStr(core, 0.95 * sb)); gg.addColorStop(0.07, rgbStr(core, 0.55 * sb)); gg.addColorStop(1, 'rgba(255,200,160,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - this.H, y - this.H, this.H * 2, this.H * 2);
      this.sunX = x;
    }
    if (day.moon !== null) {
      const [x, y] = arc(day.moon);
      ctx.fillStyle = 'rgba(220,228,240,0.85)'; ctx.beginPath(); ctx.arc(x, y, this.H * 0.018, 0, TAU); ctx.fill();
    }
    // clouds: generated, lit, parallax layers (see clouds.js)
    const ctint = mixRgb(mixRgb([22, 28, 44], [255, 255, 255], dayEff), [255, 176, 150], sunset * 0.8);
    this.clouds.draw(ctx, W, horizon, this.H * 0.85, t, this.cam.x, this.cam.ppm, ctint, Math.max(0.12, dayEff));
    // storm: a low, bruised overcast rolls over the sky, heavier toward the horizon, drifting fast
    const storm = g.storm || 0;
    if (storm > 0.02) {
      const og = ctx.createLinearGradient(0, horizon - this.H, 0, horizon);
      og.addColorStop(0, `rgba(22,22,32,${(0.75 * storm).toFixed(3)})`);
      og.addColorStop(0.6, `rgba(44,44,56,${(0.7 * storm).toFixed(3)})`);
      og.addColorStop(1, `rgba(58,60,66,${(0.6 * storm).toFixed(3)})`);
      ctx.fillStyle = og; ctx.fillRect(-20, -20, W + 40, horizon + 20);
      // ragged lower cloud edge, scudding past
      // the cloud deck itself, re-drawn darker and closer: soft, scudding storm cloud
      this.clouds.draw(ctx, W, horizon, this.H * 0.6, t * 4, this.cam.x * 1.6, this.cam.ppm, [70, 72, 84], 0.12 + 0.2 * storm);
    }
  }

  // (7.4.17, owner) the coconut island: one coconut palm leaning out over the water, its trunk ringed with old leaf
  // scars, a crown of long drooping fronds stirring in the wind, a cluster of coconuts under it; tufts of dune grass on
  // the sand, a few shells and a fallen coconut. Painted by hand in the game's muted colours, lit by the day
  drawIsland(g, ctx, S, Sy, ppm, t, dayEff) {
    const W = g.world, day = Math.max(0.18, dayEff ?? 1), tint = (rgb) => rgbStr(mixRgb([18, 20, 22], rgb, day));
    const px = ISLE.palm, gy = W.floorAt(px), wind = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 1.9) * 0.2;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // (7.4.28, owner) dune grass in clumps, painted once into a few sprites (no per-blade work each frame): tapered blades
    // from a dark olive base to sun-bleached straw tips, the odd dry one and a seed stalk, a soft shadow on the sand under
    // each; grouped in twos and threes with bare sand between, and a gust running across them now and then
    { const lvl = Math.round(day * 8) / 8; if (!this.grassSpr || this.grassLvl !== lvl) { this.grassLvl = lvl; this.grassSpr = [];
        const mix = (rgb) => rgbStr(mixRgb([18, 20, 22], rgb, lvl));
        for (let v = 0; v < 6; v++) { const c = document.createElement('canvas'); c.width = 160; c.height = 130; const x = c.getContext('2d'); let sd = 11 + v * 97; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
          x.fillStyle = 'rgba(40,32,18,0.22)'; x.beginPath(); x.ellipse(80, 124, 34 + v * 3, 5, 0, 0, TAU); x.fill();
          const nb = 7 + Math.floor(r() * 7);
          for (let b = 0; b < nb; b++) { const bx = 80 + (r() - 0.5) * 26, a = (r() - 0.5) * 1.3 + (bx - 80) * 0.012, h = 46 + r() * 70, w = 2.4 + r() * 2.2, bend = (r() - 0.5) * 0.7, dry = r() < 0.15;
            const tx = bx + Math.sin(a) * h, ty = 124 - Math.cos(a) * h, mx = bx + Math.sin(a + bend) * h * 0.55, my = 124 - Math.cos(a) * h * 0.6;
            const gr = x.createLinearGradient(bx, 124, tx, ty); gr.addColorStop(0, mix(dry ? [104, 86, 52] : [70, 80, 44])); gr.addColorStop(0.55, mix(dry ? [150, 128, 80] : [112, 120, 66])); gr.addColorStop(1, mix(dry ? [196, 176, 126] : [188, 178, 118]));
            x.fillStyle = gr; x.beginPath(); x.moveTo(bx - w, 124); x.quadraticCurveTo(mx - w * 0.6, my, tx, ty); x.quadraticCurveTo(mx + w * 0.6, my, bx + w, 124); x.closePath(); x.fill();
            x.strokeStyle = 'rgba(255,246,210,0.18)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(bx, 122); x.quadraticCurveTo(mx, my, tx, ty); x.stroke(); }
          if (r() < 0.6) { const sx = 80 + (r() - 0.5) * 12, sh = 90 + r() * 30, a = (r() - 0.5) * 0.4; x.strokeStyle = mix([150, 132, 86]); x.lineWidth = 1.4; x.beginPath(); x.moveTo(sx, 124); x.quadraticCurveTo(sx + Math.sin(a) * sh * 0.5, 124 - sh * 0.55, sx + Math.sin(a) * sh, 124 - sh); x.stroke();
            x.fillStyle = mix([176, 150, 96]); for (let q = 0; q < 6; q++) { const u = 0.78 + q * 0.04; x.beginPath(); x.ellipse(sx + Math.sin(a) * sh * u, 124 - sh * u, 2.2, 4, a, 0, TAU); x.fill(); } }
          this.grassSpr.push(c); } }
      const SPR = this.grassSpr, k = ppm / 120; /* a sprite is 1.3 m tall at 120 px a metre */
      for (let gI = 0; gI < 7; gI++) { const gx = ISLE.x0 + 2.6 + gI * 2.3 + Math.sin(gI * 7.7) * 0.7, nIn = 2 + (gI * 5) % 3;
        for (let c2 = 0; c2 < nIn; c2++) { const x = gx + (c2 - nIn / 2) * 0.45 + Math.sin(gI * 3 + c2 * 1.7) * 0.15, y = W.floorAt(x); if (y > -0.4) continue;
          const spr = SPR[(gI * 3 + c2) % SPR.length], sc = (0.75 + ((gI * 7 + c2 * 3) % 5) * 0.09) * k, gust = Math.max(0, Math.sin(t * 0.9 - x * 0.45)) ** 3 * 0.35, sway = wind * 0.08 + gust;
          ctx.save(); ctx.translate(S(x), Sy(y + 0.03)); ctx.transform(1, 0, -sway, 1, 0, 0); ctx.drawImage(spr, -80 * sc, -124 * sc, 160 * sc, 130 * sc); ctx.restore(); } } }
    // shells and a fallen coconut on the sand
    for (const [sx, r] of [[ISLE.x0 + 5.2, 0.06], [ISLE.x0 + 9.7, 0.05], [ISLE.x0 + 13.1, 0.07]]) { const y = W.floorAt(sx); ctx.fillStyle = tint([232, 222, 200]); ctx.beginPath(); ctx.ellipse(S(sx), Sy(y - r * 0.4), r * ppm, r * 0.6 * ppm, 0.2, Math.PI, TAU); ctx.fill(); }
    { const cx = px - 2.2, cy = W.floorAt(cx) - 0.12; ctx.fillStyle = tint([96, 70, 42]); ctx.beginPath(); ctx.ellipse(S(cx), Sy(cy), 0.15 * ppm, 0.12 * ppm, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = tint([130, 98, 62]); ctx.beginPath(); ctx.ellipse(S(cx - 0.04), Sy(cy - 0.04), 0.07 * ppm, 0.05 * ppm, 0.3, 0, TAU); ctx.fill(); }
    // the trunk: rooted in the sand, curving up and leaning out to the left (over the water), ringed
    const H = 7.2, lean = -2.6, top = { x: px + lean + wind * 0.08, y: gy - H };
    const pt = (u) => { const x = px + lean * u * u + wind * 0.08 * u * u, y = gy - H * u; return [x, y]; };
    const n = 26;
    for (let i = 0; i < n; i++) { const [xa, ya] = pt(i / n), [xb, yb] = pt((i + 1) / n), w = (0.34 - 0.12 * i / n) * ppm;
      ctx.strokeStyle = tint(i % 2 ? [118, 104, 84] : [104, 92, 74]); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(S(xa), Sy(ya)); ctx.lineTo(S(xb), Sy(yb)); ctx.stroke();
      ctx.strokeStyle = tint([70, 60, 48]); ctx.lineWidth = Math.max(1, ppm * 0.03); ctx.beginPath(); const [xm, ym] = pt((i + 0.5) / n); ctx.moveTo(S(xm) - w * 0.48, Sy(ym) + w * 0.12); ctx.lineTo(S(xm) + w * 0.48, Sy(ym) - w * 0.12); ctx.stroke(); }
    ctx.strokeStyle = tint([150, 136, 110]); ctx.lineWidth = Math.max(1, ppm * 0.05); ctx.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = pt(i / n); i ? ctx.lineTo(S(x) - (0.12 - 0.04 * i / n) * ppm, Sy(y)) : ctx.moveTo(S(x) - 0.12 * ppm, Sy(y)); } ctx.stroke(); // the lit side
    // the base flares into the sand
    ctx.fillStyle = tint([104, 92, 74]); ctx.beginPath(); ctx.ellipse(S(px), Sy(gy - 0.05), 0.42 * ppm, 0.14 * ppm, 0, 0, TAU); ctx.fill();
    // the coconuts, under the crown
    for (const [dx, dy] of [[0.12, 0.25], [-0.15, 0.3], [0.02, 0.42], [0.25, 0.4]]) { ctx.fillStyle = tint([92, 74, 40]); ctx.beginPath(); ctx.arc(S(top.x + dx), Sy(top.y + dy), 0.17 * ppm, 0, TAU); ctx.fill(); ctx.fillStyle = tint([140, 118, 64]); ctx.beginPath(); ctx.arc(S(top.x + dx - 0.05), Sy(top.y + dy - 0.05), 0.06 * ppm, 0, TAU); ctx.fill(); }
    // two dead fronds hanging down against the trunk, brown and ragged
    for (const [sd, ln] of [[-1, 2.4], [1, 2.0]]) { ctx.strokeStyle = tint([110, 90, 58]); ctx.lineWidth = Math.max(1, ppm * 0.05); const bx = top.x + sd * 0.15, by = top.y + 0.3;
      ctx.beginPath(); ctx.moveTo(S(bx), Sy(by)); ctx.quadraticCurveTo(S(bx + sd * 0.6), Sy(by + 0.5), S(bx + sd * 0.35 + wind * 0.05), Sy(by + ln)); ctx.stroke();
      for (let i = 2; i < 12; i++) { const u = i / 12, x = bx + sd * (0.6 * 2 * u * (1 - u) + 0.35 * u * u), y = by + 0.5 * 2 * u * (1 - u) + ln * u * u; ctx.strokeStyle = tint(i % 2 ? [128, 104, 66] : [98, 80, 52]); ctx.lineWidth = Math.max(1, ppm * 0.03); ctx.beginPath(); ctx.moveTo(S(x), Sy(y)); ctx.lineTo(S(x - sd * 0.25), Sy(y + 0.35)); ctx.stroke(); } }
    // the fronds: long arching midribs that droop at the ends, each lined both sides with many long, narrow leaflets
    // hanging down from it (painted as tapered strokes, two greens, the far side darker), stirring in the wind
    const fronds = [-2.95, -2.55, -2.1, -1.7, -1.25, -0.8, -0.35, 0.1, 0.55, 1.0, 1.45, 1.9, 2.35, 2.8];
    const order = fronds.map((a, i) => [a, i]).sort((p1, p2) => (p1[1] % 2) - (p2[1] % 2)); // the far ones first
    for (const [a00, f] of order) {
      const far = f % 2 === 1, a0 = a00 + wind * 0.08 * (1 + (f % 3) * 0.3), len = 3.6 + ((f * 5) % 4) * 0.4, sag = 1.1 + Math.abs(Math.cos(a0)) * 0.9;
      const P = []; for (let i = 0; i <= 20; i++) { const u = i / 20; P.push([top.x + Math.sin(a0) * len * u, top.y - Math.cos(a0) * len * u * 0.5 + sag * u * u + Math.sin(t * 1.3 + f + u * 3) * 0.07 * u]); }
      const g0 = far ? [64, 80, 44] : [86, 104, 56], g1 = far ? [74, 90, 50] : [104, 120, 64];
      for (let i = 2; i < 20; i++) { const u = i / 20, [x, y] = P[i], [xn, yn] = P[i + 1], ang = Math.atan2(yn - y, xn - x), ll = 0.95 * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 0.15;
        for (const sd of [-1, 1]) { const la = ang + sd * 0.95, dx = Math.cos(la) * ll, dy = Math.abs(Math.sin(la)) * ll * 0.6 + ll * 0.55; // the leaflets hang: their tips fall
          ctx.strokeStyle = tint(sd > 0 ? g0 : g1); ctx.lineWidth = Math.max(1, ppm * 0.07 * (1 - u * 0.5));
          ctx.beginPath(); ctx.moveTo(S(x), Sy(y)); ctx.quadraticCurveTo(S(x + dx * 0.6), Sy(y + dy * 0.2), S(x + dx), Sy(y + dy)); ctx.stroke(); } }
      ctx.strokeStyle = tint(far ? [96, 96, 60] : [130, 128, 80]); for (let i = 0; i < 20; i++) { ctx.lineWidth = Math.max(1, ppm * 0.09 * (1 - i / 24)); ctx.beginPath(); ctx.moveTo(S(P[i][0]), Sy(P[i][1])); ctx.lineTo(S(P[i + 1][0]), Sy(P[i + 1][1])); ctx.stroke(); }
    }
    ctx.restore();
  }

  drawFar(g, S, Sy, dayEff) {
    const ctx = this.ctx, cam = this.cam, ppm = cam.ppm, W = this.W, H = this.H;
    for (const [par, alpha, off] of [[0.35, 0.35, 70], [0.6, 0.45, 30]]) {
      ctx.fillStyle = rgbStr(sampleTable(WATER_ALBEDO, cam.y + 200), alpha);
      ctx.beginPath(); ctx.moveTo(-10, H + 10);
      // (7.1.1) sampled at fixed places in the world (not at fixed places on the screen): the outline no longer shimmers
      // up and down as the camera moves
      const k = ppm * par, stepW = Math.pow(2, Math.round(Math.log2(Math.max(0.25, 20 / k)))), f0 = Math.floor((cam.x + (-10 - W / 2) / k) / stepW) * stepW, f1 = cam.x + (W + 20 - W / 2) / k + stepW;
      for (let fx = f0; fx <= f1; fx += stepW) {
        const sx = W / 2 + (fx - cam.x) * k;
        const d = g.world.floorAt(clamp(fx, 0, WORLD_W)) - off + fbm1(fx / 40, 3, 99) * 25;
        const sy = H / 2 + (d - cam.y) * ppm * par;
        ctx.lineTo(sx, Math.max(Sy(0) + 4, sy));
      }
      ctx.lineTo(W + 20, H + 10); ctx.closePath(); ctx.fill();
    }
  }

  // ---------- water between the eye and everything in it ----------
  // a layer the size of the screen, with the scene's current transform
  layerBegin(ctx) {
    if (!this.fc) { this.fc = document.createElement('canvas'); this.fctx = this.fc.getContext('2d'); }
    if (this.fc.width !== this.c.width || this.fc.height !== this.c.height) { this.fc.width = this.c.width; this.fc.height = this.c.height; }
    const f = this.fctx;
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1;
    // only the part used last time needs clearing; only the part used this time is worked on
    const lb = this.lastBox;
    if (lb) f.clearRect(lb[0], lb[1], lb[2] - lb[0], lb[3] - lb[1]); else f.clearRect(0, 0, this.fc.width, this.fc.height);
    const m = ctx.getTransform();
    this.lpad = 16 + (m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 ? 0 : 140);
    this.lbox = [1e9, 1e9, -1e9, -1e9];
    f.setTransform(m);
    return f;
  }
  // grow the layer's working box around something drawn at screen (x, y), radius r
  lgrow(x, y, r) { const b = this.lbox; if (x - r < b[0]) b[0] = x - r; if (y - r < b[1]) b[1] = y - r; if (x + r > b[2]) b[2] = x + r; if (y + r > b[3]) b[3] = y + r; }
  // veil what was drawn with the colour of the water (it soaks up reds and yellows first, and
  // softens every edge), add the sun's dapples in the shallows, then lay it onto the scene
  layerEnd(ctx, g, f, rim = false) {
    const cam = this.cam, b = this.lbox, pad = this.lpad;
    f.setTransform(1, 0, 0, 1, 0, 0);
    if (b[2] < b[0]) { this.lastBox = null; this.lastBox = [0, 0, 0, 0]; return; }
    const bx = Math.max(0, Math.floor(b[0] - pad)), by = Math.max(0, Math.floor(b[1] - pad));
    const bw = Math.min(this.W, Math.ceil(b[2] + pad)) - bx, bh = Math.min(this.H, Math.ceil(b[3] + pad)) - by;
    this.lastBox = [bx, by, bx + Math.max(0, bw), by + Math.max(0, bh)];
    if (bw <= 0 || bh <= 0) return;
    const W = this.W, H = this.H;
    f.save(); f.beginPath(); f.rect(bx, by, bw, bh); f.clip();
    f.globalCompositeOperation = 'source-atop';
    const dTop = cam.y - cam.h / 2, dBot = cam.y + cam.h / 2;
    if (dBot > 0) {
      const vg = f.createLinearGradient(0, 0, 0, H);
      for (let i = 0; i <= 4; i++) {
        const dd = Math.max(0, lerp(dTop, dBot, i / 4));
        const col = mixRgb(sampleTable(WATER_ALBEDO, dd), [150, 190, 200], 0.15);
        const a = dd <= 0 ? 0 : 0.1 + 0.24 * smoothstep(0, 90, dd);
        vg.addColorStop(i / 4, rgbStr(col, a));
      }
      f.fillStyle = vg; f.fillRect(bx, by, bw, bh);
    }
    // sunlight dapples sliding over the animals near the surface (one tile, made once, slid along)
    const day = g.dayEff || 0;
    if (day > 0.2 && dTop < 35 && !this.lite) {
      const ppm = cam.ppm, t = g.time;
      if (!this.dapT) {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const x = c.getContext('2d');
        // (7.0.0) the rippling net the surface throws: cells whose edges are bright (where two cells meet), soft, uneven,
        // tiling seamlessly (the cells wrap round the tile's edges); not stripes
        const P = []; let sd = 4242; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 22; i++) P.push([rr() * 256, rr() * 256]);
        const im = x.createImageData(256, 256), D = im.data;
        for (let yy = 0; yy < 256; yy++) for (let xx = 0; xx < 256; xx++) {
          let d1 = 1e9, d2 = 1e9;
          for (const [px, py] of P) { let dx = Math.abs(xx - px), dy = Math.abs(yy - py); if (dx > 128) dx = 256 - dx; if (dy > 128) dy = 256 - dy; const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
          const e = Math.sqrt(d2) - Math.sqrt(d1), v = Math.max(0, 1 - e / 7) ** 2, o = (yy * 256 + xx) * 4;
          D[o] = 236; D[o + 1] = 246; D[o + 2] = 232; D[o + 3] = Math.round(v * 255);
        }
        x.putImageData(im, 0, 0);
        this.dapT = f.createPattern(c, 'repeat');
      }
      const sc = ppm * 2.6 * 9 / 256;
      { const o = this.drift('dapple', cam, ppm, 1, 0.2); this.dapT.setTransform(new DOMMatrix([sc, 0, 0, sc, (W / 2 - o.x) % (256 * sc) + this.flow('dapple', t, ppm) * 0.4, -o.y])); } // (6.5.1)
      const a = 0.1 * day; // (7.0.0) quieter: a net of light, not stripes
      // fades out with depth: full at the surface, gone by 35 m
      const fg = Math.max(0, 1 - Math.max(0, dTop) / 35);
      f.globalAlpha = a * fg; f.fillStyle = this.dapT; f.fillRect(bx, by, bw, bh); f.globalAlpha = 1;
    }
    f.globalCompositeOperation = 'source-over';
    // light from above: a soft bright rim along every top edge and a shade along every belly,
    // found from the layer itself (what has nothing above it, what has nothing below it)
    // (claude-polish) not in the dark below 600 m: there is no sunlight to make a rim, and under the night of the
    // light map neither the highlight nor the shade showed, though they cost a tenth of a frame there
    if (rim && dBot > 0 && cam.y < 600) {
      // only around the animals that were drawn live; everything else has the rim baked in
      const rp = this.lpad;
      const bx = Math.max(0, Math.floor(rim[0] - rp)), by = Math.max(0, Math.floor(rim[1] - rp));
      const bw = Math.min(this.W, Math.ceil(rim[2] + rp)) - bx, bh = Math.min(this.H, Math.ceil(rim[3] + rp)) - by;
      if (bw > 0 && bh > 0) {
      // worked out at half resolution (a quarter of the pixels): the rim is a soft edge anyway
      const k = Math.max(1, Math.round(cam.ppm * 0.035 / 2));
      if (!this.rc) { this.rc = document.createElement('canvas'); this.rctx = this.rc.getContext('2d'); }
      const rw = Math.ceil(this.fc.width / 2), rh = Math.ceil(this.fc.height / 2);
      if (this.rc.width !== rw || this.rc.height !== rh) { this.rc.width = rw; this.rc.height = rh; }
      const r = this.rctx, sun = clamp(1 - Math.max(0, cam.y) / 260, 0.25, 1) * (0.55 + 0.45 * (g.dayEff || 0));
      const hx = Math.floor(bx / 2), hy = Math.floor(by / 2), hw = Math.ceil(bw / 2) + 1, hh = Math.ceil(bh / 2) + 1;
      for (const [dy, col, a] of [[k, 'rgb(225,240,245)', 0.32 * sun], [-k, 'rgb(4,10,18)', 0.3]]) {
        // worked out a few rows beyond the box, so the box's own edge is never taken for an outline
        const m = k + 2, ey = Math.max(0, hy - m), eh = hh + 2 * m;
        r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.clearRect(hx, ey, hw, eh);
        r.drawImage(this.fc, hx * 2, ey * 2, hw * 2, eh * 2, hx, ey, hw, eh);
        r.globalCompositeOperation = 'destination-out'; r.drawImage(this.fc, hx * 2, ey * 2, hw * 2, eh * 2, hx, ey + dy, hw, eh);
        r.globalCompositeOperation = 'source-in'; r.fillStyle = col; r.fillRect(hx, ey, hw, eh);
        f.globalCompositeOperation = 'source-atop'; f.globalAlpha = a; f.drawImage(this.rc, hx, hy, hw, hh, hx * 2, hy * 2, hw * 2, hh * 2);
        f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';
      }
      }
    }
    f.restore();
    const m = ctx.getTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.fc, bx, by, bw, bh, bx, by, bw, bh); ctx.setTransform(m);
  }
  // a seamless grey noise tile (several octaves), made once
  noiseTile(name, size, seed, octaves, contrast) {
    this.tiles = this.tiles || {};
    if (this.tiles[name]) return this.tiles[name];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), img = x.createImageData(size, size);
    const hash = (i, j, o) => { let h = (i * 374761393 + j * 668265263 + o * 974711 + seed * 144665) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    // periodic gradient noise: smooth, no blocky cells, and it tiles
    const vals = new Float32Array(size * size);
    for (let o = 0; o < octaves; o++) {
      const cells = 3 << o, amp = Math.pow(0.52, o);
      const gx = [], gy = [];
      for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) { const a = hash(i, j, o) * TAU; gx.push(Math.cos(a)); gy.push(Math.sin(a)); }
      const dot = (i, j, dx, dy) => { const k = (j % cells) * cells + (i % cells); return gx[k] * dx + gy[k] * dy; };
      const fade = (q) => q * q * q * (q * (q * 6 - 15) + 10);
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const fx = px / size * cells, fy = py / size * cells;
        const i0 = Math.floor(fx), j0 = Math.floor(fy), dx = fx - i0, dy = fy - j0;
        const u2 = fade(dx), v2 = fade(dy);
        const n = lerp(lerp(dot(i0, j0, dx, dy), dot(i0 + 1, j0, dx - 1, dy), u2), lerp(dot(i0, j0 + 1, dx, dy - 1), dot(i0 + 1, j0 + 1, dx - 1, dy - 1), u2), v2);
        vals[py * size + px] += n * amp;
      }
    }
    let lo = 1e9, hi = -1e9;
    for (const v of vals) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let i = 0; i < vals.length; i++) {
      const v = clamp(128 + ((vals[i] - lo) / (hi - lo) - 0.5) * 255 * contrast, 0, 255);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return (this.tiles[name] = c);
  }
  // fill the current clip with a noise tile pinned to the world (ox, oy: where its corner sits)
  texture(ctx, name, metres, alpha, op = 'soft-light', ox = 0, oy = 0, area = null) {
    if (this.phone) return; // (5.3.2) soft-light blending is software-slow in Safari
    if (this.lite && !area) return;
    const tile = name === 'murk' ? this.noiseTile('murk', 192, 7, 3, 1.3) : name === 'grain' ? this.noiseTile('grain', 192, 3, 4, 1.2) : this.noiseTile('rock', 192, 11, 5, 1.3);
    this.pats = this.pats || {};
    const pat = this.pats[name] || (this.pats[name] = ctx.createPattern(tile, 'repeat'));
    const k = metres * this.cam.ppm / tile.width;
    pat.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
    ctx.save();
    ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.fillStyle = pat;
    if (area) ctx.fillRect(area[0], area[1], area[2], area[3]); else ctx.fillRect(-this.W * 0.2, -this.H * 0.2, this.W * 1.4, this.H * 1.4);
    ctx.restore();
  }

  // The seabed never moves, so it is drawn once into a picture about 1.5 screens across and reused
  // while the camera moves inside it; it is redrawn only near its edge or after a change of zoom.
  drawFloorCached(g, S, Sy, ppm) {
    const cam = this.cam, F = this.floorCache || (this.floorCache = { c: document.createElement('canvas') });
    const pad = 0.12 + (g.fx.disorient > 0 || g.fx.shake > 0 ? 0.12 : 0); // room for the view to sway
    const vx0 = cam.x - cam.w * (0.5 + pad), vx1 = cam.x + cam.w * (0.5 + pad), vy0 = cam.y - cam.h * (0.5 + pad), vy1 = cam.y + cam.h * (0.5 + pad);
    const ratio = F.ppm ? ppm / F.ppm : 0;
    const inside = F.ppm && vx0 >= F.x0 && vx1 <= F.x1 && vy0 >= F.y0 && vy1 <= F.y1;
    const zoomOff = Math.abs(ratio - 1) > 0.03;
    if (!inside || (zoomOff && g.time - (F.t || 0) > 0.25)) {
      // bake: the view and a quarter-screen margin all round
      const mx = cam.w * 0.3, my = cam.h * 0.3;
      F.x0 = cam.x - cam.w / 2 - mx; F.x1 = cam.x + cam.w / 2 + mx; F.y0 = cam.y - cam.h / 2 - my; F.y1 = cam.y + cam.h / 2 + my;
      F.ppm = ppm; F.t = g.time;
      const cw = Math.ceil((F.x1 - F.x0) * ppm), ch = Math.ceil((F.y1 - F.y0) * ppm);
      if (F.c.width !== cw || F.c.height !== ch) { F.c.width = cw; F.c.height = ch; } else F.c.getContext('2d').clearRect(0, 0, cw, ch);
      const fctx = F.c.getContext('2d');
      const bS = (x) => (x - F.x0) * ppm, bSy = (y) => (y - F.y0) * ppm;
      // the floor's colour follows the bottom over a wide stretch, so a new bake never jumps
      let mid = 0; const deepest = cam.y + cam.h * 0.75 + 40; for (let k = -4; k <= 4; k++) mid += Math.min(deepest, g.world.floorAt(cam.x + k * 12)); mid /= 9; /* (7.8.0) only the floor in sight: beside the wall the abyss no longer colours the beach */
      this.drawFloor(g, bS, bSy, ppm, F.x0, F.x1, { ctx: fctx, W: cw, H: ch, midD: mid, camY: cam.y, y0: F.y0, y1: F.y1 });
    }
    const k = ppm / F.ppm;
    this.ctx.drawImage(F.c, S(F.x0), Sy(F.y0), (F.x1 - F.x0) * F.ppm * k, (F.y1 - F.y0) * F.ppm * k);
  }

  drawFloor(g, S, Sy, ppm, x0, x1, V = null) {
    const ctx = V ? V.ctx : this.ctx, H = V ? V.H : this.H, W = V ? V.W : this.W;
    const camY = V ? V.camY : this.cam.y, area = V ? [0, 0, W, H] : null;
    const step = Math.max(0.5, 6 / ppm);
    ctx.beginPath();
    ctx.moveTo(S(x0), H + 20);
    for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(S(x), Sy(g.world.floorAt(x)));
    ctx.lineTo(S(x1 + step), H + 20); ctx.closePath();
    const midD = V ? V.midD : g.world.floorAt(this.cam.x);
    const fg = ctx.createLinearGradient(0, Sy(midD - 6), 0, Sy(midD + 30));
    const c = midD > AREA2.ice - 1500 ? [168, 196, 212] : sampleTable(FLOOR_COL, midD); /* (7.8.0, owner) the second sea's floor is ice VI: pale, glassy */
    fg.addColorStop(0, rgbStr(c)); fg.addColorStop(0.15, rgbStr(mixRgb(c, [40, 36, 30], 0.35))); fg.addColorStop(1, rgbStr(mixRgb(c, [10, 10, 10], 0.75)));
    ctx.fillStyle = fg; ctx.fill();
    // grain texture
    ctx.save(); ctx.clip();
    // (7.4.17, owner) the island above the water: dry pale sand, a darker wet band just above the waterline
    if (x1 > ISLE.x0 - 4 && x0 < WORLD_W + 80) {
      const top = Sy(-1.7), wl = Sy(0);
      const dg = ctx.createLinearGradient(0, top, 0, wl + ppm * 0.3); dg.addColorStop(0, '#d6c49a'); dg.addColorStop(0.7, '#c8b286'); dg.addColorStop(0.88, '#a8916a'); dg.addColorStop(1, '#8a7656');
      ctx.fillStyle = dg; ctx.fillRect(S(ISLE.x0 - 4), top - ppm, S(ISLE.x1 + 3) - S(ISLE.x0 - 4), wl + ppm * 0.3 - top + ppm); /* (7.8.0) the dry sand only as far as the island's far shore */
    }
    // (7.4.17, owner) the painted sand itself (assets/textures/seabed.png), multiplied over the floor's colour, pinned to
    // the world; strongest in the shallows, where the bottom is seen close and lit (a phone draws it too: this is baked)
    // (7.6.24, owner) one texture per zone of the sea (the sandy shelf, the kelp floor, the slope's silt, the deep plain's ooze,
    // the trench's rock), each by how much of that zone the floor below is in, blended across the boundaries in narrow
    // upright strips (only when the floor is baked, so nothing of it is done per frame)
    { const ZT = this.seabedZ || (this.seabedZ = ['', '_kelp', '_slope', '_ooze', '_trench'].map((sfx) => { const im = new Image(); im.onload = () => { im.ok = true; if (this.floorCache) this.floorCache.ppm = 0; }; im.src = `assets/textures/seabed${sfx}.png`; return { im, pat: null }; }));
      const kx0 = EAST + 788, kx1 = EAST + 907, ss = smoothstep;
      const wts = (x) => { const d = Math.max(0, g.world.floorAt(x)), kelp = ss(kx0 - 15, kx0, x) * (1 - ss(kx1, kx1 + 15, x)) * (1 - ss(40, 70, d)),
          shelf = (1 - ss(30, 70, d)) * (1 - kelp), slope = ss(30, 70, d) * (1 - ss(300, 520, d)), oz = ss(300, 520, d) * (1 - ss(2000, 2900, d)), tr = ss(2000, 2900, d), sm = shelf + kelp + slope + oz + tr || 1;
        return [shelf / sm, kelp / sm, slope / sm, oz / sm, tr / sm]; };
      const k = 3.2 * ppm / 512, alpha = 0.85 - 0.5 * smoothstep(20, 600, V ? V.midD : camY), sw = Math.max(6, Math.round(W / 90));
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      for (let zi = 0; zi < ZT.length; zi++) { const Z = ZT[zi]; if (!Z.im.ok) continue; if (!Z.pat) Z.pat = ctx.createPattern(Z.im, 'repeat'); Z.pat.setTransform(new DOMMatrix([k, 0, 0, k, S(0) % (512 * k), Sy(0)])); ctx.fillStyle = Z.pat;
        for (let px = 0; px < W; px += sw) { const wx = x0 + (px + sw / 2) / ppm, w = wts(wx)[zi]; if (w < 0.02) continue; ctx.globalAlpha = alpha * w; ctx.fillRect(px, 0, sw + 0.5, H); } }
      ctx.restore(); }
    // (7.8.1, owner) the second sea's wall is the same seabed carried down: sand at the top, turning by depth (not by
    // the floor below, which there is 11 km down) to the slope's silt, the ooze and the trench's rock, from the same
    // painted textures; the ice only at the very bottom
    if (x1 > AREA2.edge - 30) { const yT = V ? V.y0 : camY - this.cam.h / 2 - 5, yB = V ? V.y1 : camY + this.cam.h / 2 + 5; this.paintWallSeabed(ctx, S, Sy, ppm, x0, x1, yT, yB); }
    // rock and sediment: large mottling and a fine grain, pinned to the world so they never swim
    if (!this.phone) this.texture(ctx, 'rock', 19, 0.22 + 0.25 * smoothstep(30, 400, camY), 'soft-light', S(0), Sy(0), area);
    if (ppm > 14 && !this.lite) this.texture(ctx, 'grain', 2.7, 0.3, 'soft-light', S(0.37), Sy(0.61), area);
    // a pale skin of settled silt just under the surface line, darkening below
    {
      ctx.beginPath();
      for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(S(x), Sy(g.world.floorAt(x)) + ppm * 0.18);
      ctx.strokeStyle = 'rgba(235,228,205,0.10)'; ctx.lineWidth = ppm * 0.36; ctx.stroke();
      ctx.beginPath();
      for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(S(x), Sy(g.world.floorAt(x)) + ppm * 0.9);
      ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = ppm * 0.9; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const gx0 = Math.floor(x0 * 3), gx1 = Math.ceil(x1 * 3);
    for (let i = gx0; i < gx1; i++) {
      const x = i / 3, base = g.world.floorAt(x);
      for (let j = 0; j < 4; j++) {
        const h = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
        const yy = base + Math.abs(h) * 3 + j * 0.6;
        ctx.fillRect(S(x + h * 0.3), Sy(yy), Math.max(1, ppm * 0.06), Math.max(1, ppm * 0.04));
      }
    }
    // strata: faint layered bands that show on steep walls
    ctx.lineWidth = Math.max(1, ppm * 0.08);
    const ys0 = Math.floor((V ? V.y0 : this.cam.y - this.cam.h / 2) / 2.2) * 2.2, ys1 = (V ? V.y1 : this.cam.y + this.cam.h / 2) + 2;
    for (let yy = ys0; yy < ys1; yy += 2.2) {
      const k = Math.abs(Math.sin(yy * 7.13));
      ctx.strokeStyle = k > 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,245,225,0.05)';
      ctx.beginPath();
      for (let x = x0; x <= x1 + step; x += step * 2) ctx.lineTo(S(x), Sy(yy + Math.sin(x * 0.35 + yy) * 0.35 + Math.sin(x * 0.07) * 0.8));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = gx0 - (((gx0 % 2) + 2) % 2); i < gx1; i += 2) {
      const x = i / 3, base = g.world.floorAt(x);
      const h = Math.abs(Math.sin(i * 3.7) * 9137.13) % 1;
      if (h > 0.25) continue;
      ctx.beginPath(); ctx.ellipse(S(x), Sy(base + 1 + h * 10), ppm * (0.2 + h), ppm * (0.1 + h * 0.4), 0, 0, TAU); ctx.fill();
    }
    // (7.8.0, owner) the second sea's rock: the cliff, the plain's bed and the far wall painted as stone, the floor of the
    // abyss as ice, instead of the sand and silt of the first sea
    ctx.restore();
    // lit edge
    ctx.strokeStyle = 'rgba(255,250,235,0.16)'; ctx.lineWidth = Math.max(1, ppm * 0.06);
    ctx.beginPath(); for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(S(x), Sy(g.world.floorAt(x)) + 1); ctx.stroke();
  }

  // (7.8.1, owner) the seabed on the second sea's wall, by the depth of each band of it: its colour from the same table
  // as the first sea's floor, then the painted textures (assets/textures/seabed*.png) multiplied over it in thin bands,
  // each weighted by depth exactly as the first sea's floor is (sand above 30-70 m, the slope's silt to 300-520 m, the
  // ooze to 2-2.9 km, the trench's rock below); below 55 km it pales into the ice. Then the floor's usual mottling and
  // grain go over it like everywhere else. The texture is pinned to the world, so it never swims
  paintWallSeabed(ctx, S, Sy, ppm, xa, xb, ya, yb, all = false) {
    const A = AREA2; if (!all) { xa = Math.max(xa, A.edge - 26); ya = Math.max(ya, 10.2); } if (xb <= xa || yb <= ya) return;
    const ss = smoothstep, X0 = S(xa), X1 = S(xb), Y0 = Sy(ya), Y1 = Sy(yb);
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const ICE = [[A.ice - 5000, null], [A.ice - 1000, [150, 178, 192]], [A.ice, [178, 202, 214]]];
    const colAt = (y) => { const c = sampleTable(FLOOR_COL, y); if (y < A.ice - 5000) return c; const t = ss(A.ice - 5000, A.ice - 500, y); return c.map((v, i) => Math.round(v + ((ICE[2][1][i]) - v) * t)); };
    const gr = ctx.createLinearGradient(0, Y0, 0, Y1); for (let k2 = 0; k2 <= 10; k2++) { const y = ya + (yb - ya) * k2 / 10; gr.addColorStop(k2 / 10, rgbStr(colAt(y))); }
    ctx.fillStyle = gr; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    const ZT = this.seabedZ; if (ZT) {
      const k = 3.2 * ppm / 512, bh = Math.max(4, Math.round((Y1 - Y0) / 120)), zi2 = [0, 2, 3, 4]; // sand, slope, ooze, trench (no kelp on the wall)
      const wts = (d) => { const shelf = 1 - ss(30, 70, d), slope = ss(30, 70, d) * (1 - ss(300, 520, d)), oz = ss(300, 520, d) * (1 - ss(2000, 2900, d)), tr = ss(2000, 2900, d) * (1 - ss(A.ice - 5000, A.ice - 1000, d)), sm = shelf + slope + oz + tr || 1; return [shelf / sm, slope / sm, oz / sm, tr / sm]; };
      ctx.globalCompositeOperation = 'multiply';
      for (let n = 0; n < zi2.length; n++) { const Z = ZT[zi2[n]]; if (!Z || !Z.im.ok) continue; if (!Z.pat) Z.pat = ctx.createPattern(Z.im, 'repeat'); Z.pat.setTransform(new DOMMatrix([k, 0, 0, k, S(0) % (512 * k), Sy(0) % (512 * k)])); ctx.fillStyle = Z.pat;
        for (let py = Y0; py < Y1; py += bh) { const wy = ya + (py + bh / 2 - Y0) / ppm, w = wts(wy)[n]; if (w < 0.02) continue; ctx.globalAlpha = (0.85 - 0.5 * ss(20, 600, wy)) * w; ctx.fillRect(X0, py, X1 - X0, bh + 0.5); } } }
    ctx.restore();
    if (!this.phone) this.texture(ctx, 'rock', 19, 0.22 + 0.25 * ss(30, 400, (ya + yb) / 2), 'soft-light', S(0), Sy(0), [X0, Y0, X1 - X0, Y1 - Y0]);
  }
  // the small things on the bottom: pebbles and shells in the shallows, burrows and worm tubes on
  // the shelf, brittle stars and sea pens on the slope, sea cucumbers, tracks and lumpy
  // xenophyophores on the abyssal plain. Placed by hash, so they are always in the same place.
  drawFloorLife(g, ctx, S, Sy, ppm, x0, x1, t) {
    if (ppm < 12) return;
    const W = g.world, CELL = 0.65, u = ppm;
    const h = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    const blob = (x, y, rx, ry, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
    const pebbles = (i, tone) => {
      const n = 1 + Math.floor(h(i, 5) * 3);
      for (let k = 0; k < n; k++) {
        const r = u * (0.04 + h(i, 10 + k) * 0.07), ox = (h(i, 20 + k) - 0.5) * u * 0.4;
        blob(ox, -r * 0.5, r, r * 0.7, `rgb(${tone + Math.round(h(i, 30 + k) * 30)},${tone - 4 + Math.round(h(i, 31 + k) * 26)},${tone - 12 + Math.round(h(i, 32 + k) * 20)})`);
      }
    };
    const burrow = (i) => { blob(0, -u * 0.04, u * 0.22, u * 0.07, 'rgba(225,215,190,0.18)'); blob(0, -u * 0.03, u * 0.06, u * 0.03, 'rgba(0,0,0,0.55)'); };
    const brittle = (i, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, u * 0.018); ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const a0 = k / 5 * TAU + h(i, 7) * 3, c1 = Math.sin(t * 0.6 + k + i) * 0.4;
        ctx.beginPath(); ctx.moveTo(0, -u * 0.02);
        ctx.quadraticCurveTo(Math.cos(a0) * u * 0.1, -u * 0.02 + Math.sin(a0) * u * 0.03, Math.cos(a0 + c1) * u * 0.2, -u * 0.02 + Math.sin(a0 + c1) * u * 0.05);
        ctx.stroke();
      }
      blob(0, -u * 0.025, u * 0.035, u * 0.025, col);
      ctx.lineCap = 'butt';
    };
    const seaPen = (i, col) => {
      const hgt = u * (0.3 + h(i, 8) * 0.35), sway = Math.sin(t * 0.5 + i * 0.7) * u * 0.06;
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, u * 0.02);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway * 0.3, -hgt * 0.5, sway, -hgt); ctx.stroke();
      ctx.lineWidth = Math.max(1, u * 0.012);
      for (let k = 0; k < 7; k++) {
        const f = 0.4 + k * 0.085, px = sway * f * f, py = -hgt * f;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - u * 0.05, py + u * 0.03); ctx.moveTo(px, py); ctx.lineTo(px + u * 0.05, py + u * 0.03); ctx.stroke();
      }
    };
    for (let i = Math.floor(x0 / CELL); i <= Math.ceil(x1 / CELL); i++) {
      const r = h(i, 1), x = (i + h(i, 2)) * CELL, d = W.floorAt(x);
      if (d < 0.6 || r > 0.62) continue;
      const sl = W.slopeAt(x);
      if (Math.abs(sl) > 0.9) continue;
      ctx.save(); ctx.translate(S(x), Sy(d) + u * 0.03); ctx.rotate(Math.atan(sl) * 0.8);
      if (d < 45) {
        if (r < 0.28) pebbles(i, 150);
        else if (r < 0.38) { ctx.fillStyle = 'rgba(240,230,210,0.75)'; ctx.beginPath(); ctx.arc(0, 0, u * 0.06, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,100,80,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
        else if (r < 0.43 && x > 4780) { blob(0, -u * 0.06, u * 0.07, u * 0.06, '#241a26'); ctx.strokeStyle = '#2e2232'; ctx.lineWidth = Math.max(1, u * 0.012); for (let k = 0; k < 9; k++) { const a0 = Math.PI + k / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * u * 0.06, -u * 0.06 + Math.sin(a0) * u * 0.05); ctx.lineTo(Math.cos(a0) * u * 0.14, -u * 0.06 + Math.sin(a0) * u * 0.12); ctx.stroke(); } }
        else if (r < 0.55) { ctx.strokeStyle = 'rgba(250,240,215,0.16)'; ctx.lineWidth = Math.max(1, u * 0.03); ctx.beginPath(); ctx.moveTo(-u * 0.25, -u * 0.01); ctx.quadraticCurveTo(0, -u * 0.08, u * 0.25, -u * 0.01); ctx.stroke(); }
        else if (r < 0.58 && x > 4780) { ctx.fillStyle = '#c8603a'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a0 = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? u * 0.035 : u * 0.1; ctx.lineTo(Math.cos(a0) * rr, -u * 0.03 + Math.sin(a0) * rr * 0.4); } ctx.fill(); }
      } else if (d < 250) {
        if (r < 0.22) pebbles(i, 105);
        else if (r < 0.33) burrow(i);
        else if (r < 0.41) { ctx.strokeStyle = 'rgba(225,215,195,0.6)'; ctx.lineWidth = Math.max(1, u * 0.02); for (let k = 0; k < 4; k++) { const ox = (k - 1.5) * u * 0.04, hh = u * (0.08 + h(i, 40 + k) * 0.12); ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox + Math.sin(t * 0.7 + k) * u * 0.01, -hh); ctx.stroke(); } }
        else if (r < 0.46) { ctx.strokeStyle = 'rgba(210,190,170,0.7)'; ctx.lineWidth = Math.max(1, u * 0.03); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -u * 0.1); ctx.stroke(); ctx.lineWidth = Math.max(1, u * 0.012); for (let k = 0; k < 7; k++) { const a0 = -Math.PI / 2 + (k - 3) * 0.3 + Math.sin(t + i) * 0.1; ctx.beginPath(); ctx.moveTo(0, -u * 0.1); ctx.lineTo(Math.cos(a0) * u * 0.08, -u * 0.1 + Math.sin(a0) * u * 0.08); ctx.stroke(); } }
        else if (r < 0.5) seaPen(i, 'rgba(220,170,120,0.75)');
        else blob(0, -u * 0.02, u * (0.08 + r * 0.1), u * 0.035, 'rgba(200,195,175,0.22)');
      } else if (d < 1200) {
        if (r < 0.12) brittle(i, 'rgba(205,175,160,0.8)');
        else if (r < 0.2) seaPen(i, 'rgba(230,200,160,0.7)');
        else if (r < 0.3) burrow(i);
        else if (r < 0.36) { ctx.fillStyle = 'rgba(225,230,220,0.4)'; ctx.beginPath(); ctx.moveTo(-u * 0.05, 0); ctx.quadraticCurveTo(-u * 0.09, -u * 0.25, -u * 0.06, -u * 0.32); ctx.lineTo(u * 0.06, -u * 0.32); ctx.quadraticCurveTo(u * 0.09, -u * 0.25, u * 0.05, 0); ctx.fill(); }
        else if (r < 0.5) pebbles(i, 80);
        else if (r < 0.54) { blob(0, -u * 0.06, u * 0.16, u * 0.06, 'rgba(150,110,100,0.85)'); blob(-u * 0.04, -u * 0.09, u * 0.06, u * 0.02, 'rgba(255,230,220,0.15)'); }
        else blob(0, -u * 0.02, u * (0.06 + r * 0.1), u * 0.03, 'rgba(210,205,190,0.2)');
      } else {
        if (r < 0.09) { ctx.fillStyle = 'rgba(205,195,170,0.75)'; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const a0 = Math.PI + k / 12 * Math.PI, rr = u * (0.12 + 0.03 * Math.sin(k * 2.3 + i)); ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr * 0.8); } ctx.fill(); }
        else if (r < 0.17) brittle(i, 'rgba(200,190,175,0.75)');
        else if (r < 0.22) { blob(0, -u * 0.07, u * 0.17, u * 0.07, 'rgba(215,150,160,0.8)'); ctx.fillStyle = 'rgba(215,150,160,0.8)'; for (let k = 0; k < 5; k++) ctx.fillRect(-u * 0.12 + k * u * 0.06, -u * 0.02, Math.max(1, u * 0.015), u * 0.03); for (let k = 0; k < 3; k++) ctx.fillRect(-u * 0.12 + k * u * 0.025, -u * 0.17, Math.max(1, u * 0.012), u * 0.05); }
        else if (r < 0.34) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 8; k++) ctx.fillRect(k * u * 0.07 - u * 0.25, -u * 0.01 + Math.sin(k * 0.9 + i) * u * 0.015, Math.max(1, u * 0.025), Math.max(1, u * 0.015)); }
        else if (r < 0.44) burrow(i);
        else if (r < 0.48) { ctx.strokeStyle = 'rgba(200,190,160,0.7)'; ctx.lineWidth = Math.max(1, u * 0.015); const hh = u * (0.4 + h(i, 9) * 0.3), sw = Math.sin(t * 0.3 + i) * u * 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -hh * 0.6, sw, -hh); ctx.stroke(); for (let k = 0; k < 6; k++) { const a0 = -Math.PI / 2 + (k - 2.5) * 0.35; ctx.beginPath(); ctx.moveTo(sw, -hh); ctx.quadraticCurveTo(sw + Math.cos(a0) * u * 0.08, -hh + Math.sin(a0) * u * 0.1, sw + Math.cos(a0) * u * 0.12, -hh + u * 0.02); ctx.stroke(); } }
        else blob(0, -u * 0.02, u * (0.06 + r * 0.1), u * 0.03, 'rgba(200,200,190,0.18)');
      }
      ctx.restore();
    }
  }

  // Rocks and ledges are drawn once into a picture (see drawRockArt) and reused; the ones that have
  // not been seen for a while are let go, so memory stays small however far Earl wanders.
  drawRock(ctx, rk, S, Sy, ppm) {
    let C = rk._spr;
    if (!C || ppm > C.bp * 1.3) {
      const bp = Math.min(Math.max(ppm, 24) * 1.2, 72, 3600 / Math.max(1, rk.x1 - rk.x0 + 3));
      const mg = 1.4; // room above for growth
      const ox = rk.x0 - mg, oy = rk.y0 - mg * 2, cw = Math.ceil((rk.x1 - rk.x0 + mg * 2) * bp), ch = Math.ceil((rk.y1 - rk.y0 + mg * 3) * bp);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d');
      const d = (rk.y0 + rk.y1) / 2;
      const base = mixRgb(sampleTable(FLOOR_COL, d), [50, 48, 46], 0.55);
      const tile = x.createPattern(this.noiseTile('rock', 192, 11, 5, 1.3), 'repeat');
      drawRockArt(x, rk.poly.map((p) => [(p.x - ox) * bp, (p.y - oy) * bp]), rk.kind, d, rk.seed, bp, tile, base);
      C = rk._spr = { c, bp, ox, oy, cw, ch };
      const keep = this.rockSprites || (this.rockSprites = []);
      keep.push(rk); if (keep.length > 120) { const old = keep.shift(); if (old !== rk) old._spr = null; }
    }
    const k = ppm / C.bp;
    ctx.drawImage(C.c, S(C.ox), Sy(C.oy), C.cw * k, C.ch * k);
  }

  bakeKelpBackdrop(world) {
    const PX = 22, X0 = EAST + 760, X1 = EAST + 935, DEP = 46; // pixels per metre, world span, depth span
    const layers = [];
    for (const [k, f, seed, tint] of [[0, 0.55, 11, 0.28], [1, 0.75, 29, 0.5]]) {
      const c = document.createElement('canvas');
      c.width = Math.ceil((X1 - X0) * PX); c.height = Math.ceil(DEP * PX);
      const ctx = c.getContext('2d');
      let sd = seed * 7919;
      const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      // distance haze: the further layer fades much more toward the colour of the water
      const col = (r, g2, b, a = 1) => `rgba(${(r * tint + 34 * (1 - tint)) | 0},${(g2 * tint + 110 * (1 - tint)) | 0},${(b * tint + 150 * (1 - tint)) | 0},${a})`;
      // reef rock and sand at the foot of the forest
      ctx.fillStyle = col(70, 66, 52);
      ctx.beginPath(); ctx.moveTo(0, c.height);
      for (let x = 0; x <= c.width; x += 20) {
        const wx = X0 + x / PX, d = Math.max(4, world.floorAt(wx) - 4 - k * 5) * 0.9;
        ctx.lineTo(x, d * PX + Math.sin(x * 0.03 + seed) * 10 + Math.sin(x * 0.11) * 4);
      }
      ctx.lineTo(c.width, c.height); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 90; i++) {
        const x = rnd() * c.width, wx = X0 + x / PX, d = Math.max(4, world.floorAt(wx) - 4 - k * 5) * 0.9 * PX;
        ctx.fillStyle = col(60 + rnd() * 30, 56 + rnd() * 25, 46, 0.9);
        ctx.beginPath(); ctx.ellipse(x, d, 8 + rnd() * 30, 5 + rnd() * 14, 0, Math.PI, 0); ctx.fill();
      }
      // stalks: sparse at the two ends of the forest, dense in the middle
      for (let x = rnd() * 30; x < c.width; x += 26 + rnd() * 44) {
        const edge = Math.min(x, c.width - x) / (c.width * 0.22);
        if (edge < 1 && rnd() > edge * 0.85 + 0.1) continue;
        const wx = X0 + x / PX, base = Math.max(5, world.floorAt(wx) - 4 - k * 5) * 0.9 * PX;
        const h = base * (0.75 + rnd() * 0.25);
        const lean = (rnd() - 0.5) * 0.25;
        const pts = [];
        for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([x + Math.sin(u * 3 + x) * 12 * u + lean * h * u, base - h * u]); }
        const sg = ctx.createLinearGradient(0, base - h, 0, base);
        sg.addColorStop(0, col(120, 104, 44)); sg.addColorStop(1, col(52, 42, 20));
        ctx.strokeStyle = sg; ctx.lineWidth = 3 + rnd() * 2; ctx.lineCap = 'round';
        ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
        // blades: leaf shapes with a midrib, lighter toward the top where the light is
        for (let i = 2; i <= 24; i++) {
          const [px, py] = pts[i], u = i / 24, side = i % 2 ? 1 : -1;
          const a = -Math.PI / 2 + side * (0.6 + rnd() * 0.4);
          const L = PX * (1.0 + rnd() * 0.5), wd = PX * 0.22;
          ctx.save(); ctx.translate(px, py); ctx.rotate(a);
          const bg = ctx.createLinearGradient(0, -wd, 0, wd);
          bg.addColorStop(0, col(140 + 40 * u, 118 + 30 * u, 48, 0.92)); bg.addColorStop(1, col(84, 70, 28, 0.92));
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(L * 0.3, -wd * 1.2, L * 0.75, -wd * 0.8, L, (rnd() - 0.5) * wd);
          ctx.bezierCurveTo(L * 0.75, wd * 0.8, L * 0.3, wd * 1.1, 0, 0); ctx.fill();
          ctx.strokeStyle = col(70, 58, 24, 0.6); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(L * 0.85, 0); ctx.stroke();
          ctx.fillStyle = col(150, 128, 56); ctx.beginPath(); ctx.arc(1, 0, wd * 0.4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      // feather the edges into the water: the forest thins out at both ends and fades into the
      // depths at the bottom, so it never ends in a straight line
      ctx.globalCompositeOperation = 'destination-out';
      const fadeX = c.width * 0.2;
      let fg = ctx.createLinearGradient(0, 0, fadeX, 0);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg; ctx.fillRect(0, 0, fadeX, c.height);
      fg = ctx.createLinearGradient(c.width - fadeX, 0, c.width, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fg; ctx.fillRect(c.width - fadeX, 0, fadeX, c.height);
      fg = ctx.createLinearGradient(0, c.height * 0.62, 0, c.height);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fg; ctx.fillRect(0, c.height * 0.62, c.width, c.height * 0.38);
      ctx.globalCompositeOperation = 'source-over';
      layers.push({ c, f, X0, PX });
    }
    this.kelpBack = layers;
  }

  // (5.9.3) the ways aboard, live over the baked boat: from a distance now and then a slow glint runs down the
  // ladder's rail (in the water) or the door's edge (on deck); close to them a warm lamp-glow gathers round them
  boatWays(ctx, g, t, u, day) {
    const e = g.earl; if (!e || g.kill || g.mode !== 'play' || e.inSub) return;
    const onDeck = !!g.aboard, BU = 0.14, dx = e.x - (BOAT.x + (onDeck ? 19 : 9) * BU); /* as main.js's nearLadder measures it */
    const d = Math.hypot(dx, onDeck ? 0 : Math.max(0, e.y - 1));
    const near = clamp(1 - (d - 1.2) / 3.5, 0, 1); // 0 far .. 1 beside it
    const [x0, y0, x1, y1] = onDeck ? [17, -24, 21, -11] : [7.7, -12.8, 10.3, 2.6];
    const cx = (x0 + x1) / 2 * u, cy = (y0 + y1) / 2 * u;
    ctx.save();
    if (near > 0.01) { // the warm glow: a lamp held near it
      const p = 0.85 + 0.15 * Math.sin(t * 2.2), R = (onDeck ? 10 : 11) * u;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(255,196,120,${(0.32 * near * p).toFixed(3)})`); gr.addColorStop(0.5, `rgba(220,150,80,${(0.12 * near * p).toFixed(3)})`); gr.addColorStop(1, 'rgba(200,130,70,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    }
    // the glint: every 5 s a bright bead slides down the edge, faint by day, plainer at dusk; less as he comes close
    const ph = (t % 5) / 1.1;
    if (ph < 1 && near < 0.95) {
      const a = (0.55 + 0.35 * (1 - day)) * (1 - near) * Math.sin(ph * Math.PI);
      const gx = onDeck ? x1 * u : (x0 - 0.12) * u, gy = (y0 + (y1 - y0) * ph) * u, R = 2.6 * u;
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
      gr.addColorStop(0, `rgba(255,236,190,${a.toFixed(3)})`); gr.addColorStop(0.25, `rgba(240,200,130,${(a * 0.4).toFixed(3)})`); gr.addColorStop(1, 'rgba(240,200,130,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(gx - R, gy - R, 2 * R, 2 * R);
    }
    ctx.restore();
  }
  // (7.6.64, owner) the scale pictures painted at the screen's own size (the boat, the barge) are made at: while the camera's
  // zoom is moving it holds the last settled value, and catches up 0.35 s after the zoom stops, so they are repainted once
  // when it settles instead of every frame of the zoom (on entering the game the boat jittered as it was)
  ppMoving() { return this.ppMoved != null && performance.now() / 1000 - this.ppMoved < 0.35; }
  // (7.6.66, owner) the scale to paint the boat and the barge at: while a zoom moves, the scale it is heading for (painted
  // once, scaled smoothly on the way, nothing repainted mid-zoom and no pop when it lands); otherwise the screen's own
  steadyPpm(ppm) { const now = performance.now() / 1000;
    if (this.ppLast == null || Math.abs(ppm - this.ppLast) > 0.0005) { this.ppLast = ppm; this.ppMoved = now; }
    const tgt = this.zoomTarget; return tgt && Math.abs(tgt - ppm) > 0.02 ? tgt : ppm; }
  // (7.6.62, owner) the boat's weathering is a fixed picture (assets/textures/boat_wear.png, baked by tools/bake_pngs.cjs from
  // boatWearProc below), only scaled to the size she is painted at: it was generated afresh for every size, so while the
  // camera settled on entering the game her rust and grime reshuffled from frame to frame
  // (7.6.90, owner) the tutorial's pointing hands: the diver's gloved hand from the owner's own pictures (tools/cut_hands.py): the back of
  // the hand pointing up, and the side of it pointing across; the numbers are each picture's size and fingertip
  tapGloveReady() { if (!this.handImgs) { this.handImgs = { back: new Image(), side: new Image() }; this.handImgs.back.src = 'assets/ui/hand_back.png'; this.handImgs.side.src = 'assets/ui/hand_side.png'; }
    return ['back', 'side'].every((k) => this.handImgs[k].complete && this.handImgs[k].naturalWidth > 0); }
  drawTapGlove(ctx, g, S, Sy, ppm) {
    const HANDS = { back: { w: 411, h: 510, tip: [67, 2], dir: [0.12, 0.99] }, side: { w: 780, h: 401, tip: [2, 59], dir: [1, 0.08] } }; // (7.6.90, owner) the owner's own gloved hands (tools/cut_hands.py)
    const f = g.tutFocus.fish, M = g.earl.inSub ? g.sub : g.earl, side = M.x < f.x ? 1 : -1; // the hand on the side away from the diver
    const cx = S(f.x), cy = Sy(f.y), low = cy > this.H * 0.6, kind = low ? 'side' : 'back', Hd = HANDS[kind]; // low on the screen: no room below, it points across
    const hpx = clamp(ppm * 2.2, 72, 124), k = kind === 'back' ? hpx / Hd.h : (hpx * 1.5) / Hd.w;
    const T = 1.7, ph = ((g.time - (g.tutFocus.t0 || 0)) % T) / T;
    const ease = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
    const back = 10 - 10 * ease(0, 0.1, ph) + 6 * ease(0.15, 0.22, ph) - 6 * ease(0.22, 0.32, ph) + 10 * ease(0.37, 0.46, ph); // a double tap, then rest
    const press = Math.max(1 - Math.abs(ph - 0.125) / 0.035, 1 - Math.abs(ph - 0.345) / 0.035, 0);
    const fr = Math.max(6, (f.len || 0.25) * ppm * 0.5), dx = side * Hd.dir[0], dy = Hd.dir[1], L0 = Math.hypot(dx, dy), ux = dx / L0, uy = dy / L0;
    const tx = cx + ux * (fr + 3 + back), ty = cy + uy * (fr + 3 + back);
    const lit = clamp(Math.max(1 - f.y / 300, this.litAt ? this.litAt(f.x, f.y) : 1), 0.25, 1);
    ctx.save(); ctx.translate(tx, ty); ctx.scale(side * k * (1 - 0.03 * press), k * (1 + 0.015 * press));
    ctx.filter = `brightness(${(0.5 + 0.6 * lit).toFixed(2)})`;
    ctx.drawImage(this.handImgs[kind], -Hd.tip[0], -Hd.tip[1], Hd.w, Hd.h); ctx.restore();
    // the touch: a faint soft stir going out through the water from the fingertip, one for each press
    for (const at of [0.125, 0.345]) { const q = (ph - at + 1) % 1; if (q > 0.4) continue; const e = q / 0.4, rr = 6 + e * Math.max(20, ppm * 0.9), a = 0.26 * (1 - e) * (1 - e) * Math.min(1, q * 30);
      const ox = cx + ux * (fr + 3), oy = cy + uy * (fr + 3), rg = ctx.createRadialGradient(ox, oy, rr * 0.45, ox, oy, rr);
      rg.addColorStop(0, 'rgba(226,222,200,0)'); rg.addColorStop(0.75, `rgba(226,222,200,${a.toFixed(3)})`); rg.addColorStop(1, 'rgba(226,222,200,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ox, oy, rr, 0, TAU); ctx.fill(); }
  }
  wearReady() { if (!this.wearImg) { this.wearImg = new Image(); this.wearImg.src = 'assets/textures/boat_wear.png'; } return this.wearImg.complete && this.wearImg.naturalWidth > 0; }
  boatWear(w, h, flip) {
    if (!this.wearReady()) return this.boatWearProc(w, h, flip);
    const key = 'i' + w + 'x' + h + (flip ? 'f' : '');
    if (this.boatWearC && this.boatWearC.key === key) return this.boatWearC.c;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    if (flip) { x.translate(w, 0); x.scale(-1, 1); } x.drawImage(this.wearImg, 0, 0, w, h);
    this.boatWearC = { key, c }; return c;
  }
  boatWearProc(w, h, flip) {
    const key = w + 'x' + h + (flip ? 'f' : '');
    if (this.boatWearC && this.boatWearC.key === key) return this.boatWearC.c;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    let sd = 4242; const R = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    // fine grain
    const id = x.createImageData(w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = R(); d[i] = d[i + 1] = d[i + 2] = v < 0.5 ? 0 : 255; d[i + 3] = Math.floor(Math.abs(v - 0.5) * 34); }
    x.putImageData(id, 0, 0);
    // grime: soft dark blotches, more of them low on the hull
    for (let k = 0; k < 70; k++) { const px = R() * w, py = h * (0.35 + Math.pow(R(), 0.6) * 0.6), r = (0.01 + R() * 0.04) * w; const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(40,34,24,${(0.05 + R() * 0.12).toFixed(3)})`); gr.addColorStop(1, 'rgba(40,34,24,0)'); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); }
    // rust runs from the deck edge downward
    for (let k = 0; k < 26; k++) { const px = w * (0.12 + R() * 0.72), py = h * (0.5 + R() * 0.12), len = h * (0.05 + R() * 0.14), lw = Math.max(1, w * (0.0015 + R() * 0.003)); const gr = x.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, `rgba(122,62,28,${(0.25 + R() * 0.3).toFixed(3)})`); gr.addColorStop(1, 'rgba(122,62,28,0)'); x.fillStyle = gr; x.fillRect(px, py, lw, len); }
    // the waterline: a dark stain band, and the light catching the top edges
    const wl = x.createLinearGradient(0, h * 0.78, 0, h); wl.addColorStop(0, 'rgba(20,24,18,0)'); wl.addColorStop(0.35, 'rgba(20,24,18,0.28)'); wl.addColorStop(1, 'rgba(20,24,18,0.4)'); x.fillStyle = wl; x.fillRect(0, h * 0.78, w, h * 0.22);
    const tl = x.createLinearGradient(0, 0, 0, h * 0.5); tl.addColorStop(0, 'rgba(255,246,226,0.08)'); tl.addColorStop(1, 'rgba(255,246,226,0)'); x.fillStyle = tl; x.fillRect(0, 0, w, h * 0.5);
    this.boatWearC = { key, c }; return c;
  }
  drawKelpBackdrop(g, ppm, t) {
    const cam = this.cam;
    if (cam.x < EAST + 700 || cam.x > WORLD_W || cam.y > 120) return;
    if (!this.kelpBack || this.kelpBackWorld !== g.world) { this.bakeKelpBackdrop(g.world); this.kelpBackWorld = g.world; }
    const ctx = this.ctx, W = this.W, H = this.H, surfY = (H / 2) - cam.y * ppm;
    for (const L of this.lite ? this.kelpBack.slice(1) : this.kelpBack) { // lite: only the nearer layer
      const scale = ppm * L.f / L.PX;               // image pixels -> screen pixels
      const x0 = W / 2 + (L.X0 - cam.x) * ppm * L.f; // further layers slide slower and look smaller
      const bands = 48, bh = L.c.height / bands; // (4.28) thin bands: neighbouring offsets differ by a pixel, so no visible seams
      for (let b = 0; b < bands; b++) {
        // sway grows toward the tops of the stalks (top bands)
        const up = 1 - b / bands;
        const off = Math.sin(t * 0.45 + b * 0.6 + L.f * 5) * 9 * up * up;
        const dy = surfY + b * bh * scale, dh = (bh + 1) * scale;
        if (dy > H || dy + dh < 0) continue;
        // copy only the part of the painting that is on screen
        const dx = x0 + off * scale, sx0 = Math.max(0, -dx / scale), sx1 = Math.min(L.c.width, (W - dx) / scale);
        if (sx1 <= sx0) continue;
        ctx.drawImage(L.c, sx0, b * bh, sx1 - sx0, bh + 1, dx + sx0 * scale, dy, (sx1 - sx0) * scale, dh);
      }
    }
  }

  // a kelp blade, 128 px long along +x from its base, centred on y = 0 of a 64 px tall picture;
  // v: how far it droops (0 straight .. 2 most); the near layer is a little brighter
  // (7.0.13) a giant-kelp blade, painted at four times its size and drawn down to 128 x 64: a frilled, ruffled edge, the
  // blade shaded across its width (lit along the upper edge, darker below), the corrugated surface of real giant kelp in
  // fine wrinkles across it, a darker midrib, light showing through toward the thin tip, the tip worn ragged
  // (7.0.14) the blades are real pictures now (assets/kelp, tools/kelp_kit.py): smooth, broad detail only, so nothing in
  // them crawls or shimmers as the camera moves; the painted canvas below is used only until a picture has loaded
  // (7.4.0, owner) a blade's picture pre-shrunk by halves (128, 64, 32 px wide), each made with smoothing: drawn from the
  // full 256 px picture at 25-100 px, its fine veins shimmered and swam as the camera moved (it read as a wavy, rainbow
  // distortion). Each blade is drawn from the copy nearest its size on screen
  bladeMip(spr, px) {
    if (!spr || !(spr.width || spr.naturalWidth) || (spr.complete === false)) return spr;
    const M = this.bladeMips || (this.bladeMips = new Map()); let L = M.get(spr);
    if (!L) { L = [spr]; let src = spr, w = spr.naturalWidth || spr.width, h = spr.naturalHeight || spr.height;
      while (w > 40) { w = Math.round(w / 2); h = Math.max(2, Math.round(h / 2)); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h); L.push(c); src = c; }
      M.set(spr, L); }
    let pick = L[0]; for (const c of L) if ((c.width || 0) >= px * 1.15) pick = c; return pick;
  }
  bladeSprite(layer, v) {
    const key = layer * 3 + v, arr = this.bladeSprites || (this.bladeSprites = []);
    if (arr[key]) return arr[key];
    { const P = this.bladePngs || (this.bladePngs = []); if (!P[key]) { const im = new Image(); im.src = `assets/kelp/blade_${layer}_${v}.png`; im.onload = () => { arr[key] = im; }; P[key] = im; } }
    if (this.bladeFallback && this.bladeFallback[key]) return this.bladeFallback[key];
    const Z = 4, c = document.createElement('canvas'); c.width = 128 * Z; c.height = 64 * Z;
    const x = c.getContext('2d'), dark = layer === 1 ? 0.75 : 1, droop = [0.05, 0.3, 0.55][v] * 128; x.scale(Z, Z);
    let sd = 31 + key; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const P = (q, e) => [128 * q, 32 + droop * q * q + e + q * q * 128 * 0.08];
    const col = (rr, gg, bb, a) => `rgba(${(rr * dark) | 0},${(gg * dark) | 0},${(bb * dark) | 0},${a})`;
    const left = [], right = [];
    for (let j = 0; j <= 60; j++) { const q = j / 60, w0 = 9 * Math.sin(Math.PI * Math.pow(q, 0.6)) * (1 + 0.15 * Math.sin(q * 13)), fr = q > 0.12 ? (0.55 + 0.45 * Math.sin(q * 70 + 1)) * 0.9 * Math.min(1, q * 3) : 0; // the frill
      const wl = w0 + fr - (q > 0.9 && r() < 0.5 ? r() * 3 : 0), wr = w0 + fr * 0.8 - (q > 0.9 && r() < 0.5 ? r() * 3 : 0); left.push(P(q, wl)); right.push(P(q, -wr)); }
    const blade = new Path2D(); blade.moveTo(left[0][0], left[0][1]); for (const p of left) blade.lineTo(p[0], p[1]); for (let j = right.length - 1; j >= 0; j--) blade.lineTo(right[j][0], right[j][1]); blade.closePath();
    x.fillStyle = col(118, 92, 32, 0.82); x.fill(blade);
    x.save(); x.clip(blade);
    for (let j = 0; j < 40; j++) { const q = j / 40, [cx, cy] = P(q, 0), g = x.createLinearGradient(cx, cy - 10, cx, cy + 10); // across its width: lit above, shaded below
      g.addColorStop(0, col(176, 150, 74, 0.55)); g.addColorStop(0.45, col(130, 102, 38, 0)); g.addColorStop(1, col(40, 30, 10, 0.5)); x.fillStyle = g; x.fillRect(cx - 2, cy - 14, 128 / 40 + 3, 28); }
    // (7.0.14) no fine wrinkles: they crawled as the camera moved

    { const tg = x.createLinearGradient(0, 0, 128, 0); tg.addColorStop(0, col(40, 30, 10, 0.35)); tg.addColorStop(0.35, 'rgba(0,0,0,0)'); tg.addColorStop(0.8, col(210, 190, 110, 0.18)); tg.addColorStop(1, col(220, 200, 120, 0.28)); x.fillStyle = tg; x.fillRect(0, 0, 128, 64); } // dark at its root, light through the thin tip
    x.restore();
    x.strokeStyle = col(60, 44, 14, 0.4); x.lineWidth = 0.5; x.stroke(blade); // its edge
    const m0 = P(0.03, 0), m1 = P(0.55, 0), m2 = P(0.93, 0);
    x.strokeStyle = col(62, 46, 16, 0.6); x.lineWidth = 1.3; x.beginPath(); x.moveTo(m0[0], m0[1]); x.quadraticCurveTo(m1[0], m1[1], m2[0], m2[1]); x.stroke(); // the midrib
    x.strokeStyle = col(200, 178, 104, 0.3); x.lineWidth = 0.5; x.beginPath(); x.moveTo(m0[0], m0[1] - 0.8); x.quadraticCurveTo(m1[0], m1[1] - 0.8, m2[0], m2[1] - 0.8); x.stroke(); // lit along its top
    (this.bladeFallback || (this.bladeFallback = []))[key] = c;
    return c;
  }


  drawKelp(g, S, Sy, ppm, layer, x0, x1) {
    // Batched: every stalk of this layer goes into one path, every blade into another,
    // every bladder into a third - three draw calls for the whole forest.
    const ctx = this.ctx, t = g.time;
    const surf = g.surfY || (() => 0);
    const stalks = new Path2D(), bulbs = new Path2D(), blades = [];
    const len = 1.5 * ppm, wid = 0.26 * ppm, br = wid * 0.32;
    let any = false;
    for (let i = 0; i < g.world.kelp.length; i++) {
      const k = g.world.kelp[i];
      if ((i % 3 === 0 ? 1 : 0) !== layer) continue;
      if (k.x < x0 - 8 || k.x > x1 + 8) continue;
      const topY = k.base - k.h;
      if (k.base < this.cam.y - this.cam.h || topY > this.cam.y + this.cam.h) continue;
      any = true;
      const segs = Math.max(4, Math.floor(k.h / 2.4)); // (4.12.5: a blade every ~2.4 m, each a little longer: a fifth fewer draws in the forest)
      for (let s2 = 0; s2 <= segs; s2++) {
        const u = s2 / segs, hh = u * k.h;
        let y = k.base - hh;
        const sway = Math.sin(t * 0.55 + k.phase + hh * 0.12) * hh * 0.07 + Math.sin(t * 1.3 + hh * 0.3) * 0.15 * u + k.lean * hh + g.waveBoost * Math.sin(t * 2 + hh * 0.2) * u * 2;
        if (y < 0.4) y = 0.4 + surf(k.x + sway) * 0.4;
        const px = S(k.x + sway), py = Sy(y);
        if (s2 === 0) stalks.moveTo(px, py); else stalks.lineTo(px, py);
        if (s2 === 0) continue;
        // a giant-kelp blade: a gas bladder on the stipe, and from it a long, narrow, wavy blade
        // that angles up and then droops away with the current, its edges rippling
        const side = s2 % 2 ? 1 : -1, hsh = Math.abs(Math.sin(s2 * 12.9898 + k.phase * 78.233));
        const a = -Math.PI / 2 + side * (0.5 + hsh * 0.35 + Math.sin(t * 0.8 + s2 + k.phase) * 0.18);
        const ca = Math.cos(a), sa = Math.sin(a);
        const bl = len * (0.9 + hsh * 0.8), bw = wid * (0.55 + hsh * 0.35);
        const bx = px + ca * br * 1.4, by = py + sa * br * 1.4;
        bulbs.moveTo(bx + br, by); bulbs.ellipse(bx, by, br, br * 0.8, a, 0, TAU);
        // the blade: a stored picture (one of three droops), turned, stretched and flipped into place
        const droopK = side * (0.05 + Math.floor(hsh * 3) * 0.2); // (3.0.10) each blade keeps its own droop picture and side: picking them by time made blades snap between pictures; the sway of the angle above carries the motion
        blades.push([bx, by, a, bl, bw, droopK, y]);
      }
      if (k.species === 119) {
        const u = 1, hh = k.h;
        const sway = Math.sin(t * 0.55 + k.phase + hh * 0.12) * hh * 0.07 + Math.sin(t * 1.3 + hh * 0.3) * 0.15 * u + k.lean * hh + g.waveBoost * Math.sin(t * 2 + hh * 0.2) * u * 2;
        const y = Math.max(0.4, k.base - hh);
        const px = S(k.x + sway), py = Sy(y);
        bulbs.moveTo(px + ppm * 0.18, py); bulbs.arc(px, py, ppm * 0.18, 0, TAU);
      }
    }
    if (!any) return;
    const dark = layer === 1 ? 0.86 : 1; // (7.2.6) lighter, as the blades
    ctx.strokeStyle = layer === 0 ? 'rgba(84,92,72,0.7)' : rgbStr([96 * dark, 80 * dark, 38 * dark]);
    ctx.lineWidth = Math.max(1, ppm * 0.07);
    ctx.stroke(stalks);
    // blades: thin and a little see-through, golden-brown, a darker midrib down each (stored pictures)
    const M = ctx.getTransform();
    const warm = []; // (7.2.6) the blades near the surface, for the sun through them
    for (const [bx, by, a2, bl, bw, dk, wy] of blades) {
      const flip = dk < 0 ? -1 : 1, v = Math.min(2, Math.floor(Math.abs(dk) / 0.2));
      const spr = this.bladeSprite(layer, v);
      const ca = Math.cos(a2), sa = Math.sin(a2), sx = bl / 128, sy = (bw / 9) * flip;
      // M x translate(bx,by) x rotate(a2) x scale(sx, sy)
      const a_ = ca * sx, b_ = sa * sx, c_ = -sa * sy, d_ = ca * sy;
      ctx.setTransform(M.a * a_ + M.c * b_, M.b * a_ + M.d * b_, M.a * c_ + M.c * d_, M.b * c_ + M.d * d_, M.a * bx + M.c * by + M.e, M.b * bx + M.d * by + M.f);
      const spm = this.bladeMip(spr, bl * Math.hypot(M.a, M.b)); ctx.drawImage(spm, 0, -32, 128, 64);
      if (wy < 14) warm.push([ctx.getTransform(), spm, 1 - wy / 14]);
    }
    // (7.2.6) near the surface the sun shows through them: the same blade laid over itself, added faintly (warm)
    if (warm.length && (g.day ? g.day.light : 1) > 0.2) {
      const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha; ctx.globalCompositeOperation = 'lighter';
      const sun = (g.day ? g.day.light : 1) * (layer === 1 ? 0.22 : 0.14);
      for (const [T, spr, k] of warm) { ctx.setTransform(T); ctx.globalAlpha = sun * k * k; ctx.drawImage(spr, 0, -32, 128, 64); }
      ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
    }
    ctx.setTransform(M);
    ctx.fillStyle = `rgba(${(156 * dark) | 0},${(134 * dark) | 0},${(62 * dark) | 0},${layer === 0 ? 0.6 : 0.85})`;
    ctx.fill(bulbs);
    ctx.strokeStyle = `rgba(${(50 * dark) | 0},${(40 * dark) | 0},${(14 * dark) | 0},0.6)`; ctx.lineWidth = Math.max(0.6, ppm * 0.02); ctx.stroke(bulbs); // (7.0.13) the floats' edges
  }

  // The wrecks are detailed paintings (see scenery_draw.js), made once at a generous resolution and
  // reused; made again only if the camera zooms in well past it.
  drawWreck(ctx, w, S, Sy, ppm) {
    let C = w._spr;
    if (!C || ppm > C.bp * 1.3) {
      const bp = Math.min(Math.max(ppm, 24) * 1.2, 72, 4096 / (1.3 * w.len));
      const L = w.len * bp, H = L * 0.13;
      const ox = -L * 0.7, oy = -H * 4.4, cw = Math.ceil(L * 1.3), ch = Math.ceil(H * 4.9);
      const c = C && C.c.width === cw && C.c.height === ch ? C.c : document.createElement('canvas');
      c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.clearRect(0, 0, cw, ch); x.translate(-ox, -oy);
      drawShipwreck(x, L, w.x * 0.37 + w.len, sampleTable(FLOOR_COL, w.y));
      C = w._spr = { c, bp, ox, oy, cw, ch };
    }
    const k = ppm / C.bp;
    ctx.save(); ctx.translate(S(w.x), Sy(w.y + w.len * 0.03)); ctx.rotate(w.tilt);
    ctx.drawImage(C.c, C.ox * k, C.oy * k, C.cw * k, C.ch * k);
    ctx.restore();
  }
  drawDeepPlaces(g, ctx, S, Sy, ppm, t, inView) {
    const W = g.world;
    this.escaW = null;
    const B = W.brine;
    if (B && inView((B.x0 + B.x1) / 2, B.y, 40)) {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(S(B.x0 - 2), Sy(B.y));
      for (let x = B.x0 - 2; x <= B.x1 + 2; x += 0.5) ctx.lineTo(S(x), Sy(Math.max(B.y, W.floorAt(x))));
      ctx.lineTo(S(B.x1 + 2), Sy(B.y)); ctx.closePath();
      const gr = ctx.createLinearGradient(0, Sy(B.y), 0, Sy(B.y + 8));
      gr.addColorStop(0, 'rgba(40,52,66,0.96)'); gr.addColorStop(1, 'rgba(10,14,20,0.98)');
      ctx.fillStyle = gr; ctx.fill();
      // its surface: a still, mirror-like line with slow ripples, and a rim of dead things
      ctx.strokeStyle = 'rgba(170,195,220,0.45)'; ctx.lineWidth = Math.max(1, ppm * 0.06);
      ctx.beginPath();
      for (let x = B.x0 - 1; x <= B.x1 + 1; x += 0.5) { const y = Sy(B.y) + Math.sin(x * 0.9 + t * 0.6) * ppm * 0.04; x === B.x0 - 1 ? ctx.moveTo(S(x), y) : ctx.lineTo(S(x), y); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,190,160,0.35)';
      for (let k = 0; k < 14; k++) { const x = B.x0 + ((k * 37.3) % (B.x1 - B.x0)); ctx.beginPath(); ctx.ellipse(S(x), Sy(B.y) - ppm * 0.05, ppm * 0.18, ppm * 0.05, 0, 0, TAU); ctx.fill(); }
      // slow ripples just under the surface, and the shimmering haze where brine meets seawater
      ctx.strokeStyle = 'rgba(150,175,200,0.14)'; ctx.lineWidth = Math.max(1, ppm * 0.03);
      for (let r = 1; r <= 3; r++) { ctx.beginPath(); for (let x = B.x0; x <= B.x1; x += 0.5) { const y = Sy(B.y + r * 0.35) + Math.sin(x * 0.6 - t * 0.4 + r) * ppm * 0.06; x === B.x0 ? ctx.moveTo(S(x), y) : ctx.lineTo(S(x), y); } ctx.stroke(); }
      const hz = ctx.createLinearGradient(0, Sy(B.y - 1.2), 0, Sy(B.y));
      hz.addColorStop(0, 'rgba(140,165,190,0)'); hz.addColorStop(1, `rgba(140,165,190,${(0.12 + 0.04 * Math.sin(t * 0.7)).toFixed(3)})`);
      ctx.fillStyle = hz; ctx.fillRect(S(B.x0), Sy(B.y - 1.2), (B.x1 - B.x0) * ppm, ppm * 1.2);
      // the shore: a thick ring of mussels living off the seep, and white bacterial mats
      for (let k = 0; k < 110; k++) {
        const end = k % 2, x = end ? B.x1 - 1.5 + ((k * 0.731) % 4) : B.x0 - 2.5 + ((k * 0.613) % 4), y = Math.min(W.floorAt(x), B.y + 0.1) - ((k * 0.37) % 0.5);
        ctx.fillStyle = k % 4 ? '#17151b' : '#2b2a35';
        ctx.beginPath(); ctx.ellipse(S(x), Sy(y), ppm * 0.08, ppm * 0.15, -0.6 + (k % 7) * 0.2, 0, TAU); ctx.fill();
        if (k % 3 === 0) { ctx.fillStyle = 'rgba(160,170,190,0.35)'; ctx.beginPath(); ctx.arc(S(x) - ppm * 0.02, Sy(y) - ppm * 0.06, ppm * 0.03, 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(232,232,222,0.4)';
      for (const xs of [B.x0 - 4, B.x0 - 3.2, B.x1 + 2.4, B.x1 + 3.4]) { ctx.beginPath(); ctx.ellipse(S(xs), Sy(W.floorAt(xs)) - ppm * 0.04, ppm * 0.9, ppm * 0.12, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    const F = W.whaleFall;
    if (F && inView(F.x, F.y, 50)) drawWhaleFall(ctx, S, Sy, ppm, F, t, false); // (7.0.6)
    const P = W.seep;
    if (P && inView(P.x, P.y, 30)) {
      // a cold seep: white bacterial mats, a black bed of mussels, methane bubbling out of the mud
      ctx.save();
      for (let k = 0; k < 7; k++) {
        const x = P.x + (k - 3) * 2.2 + Math.sin(k * 3.1) * 0.8;
        ctx.fillStyle = k % 2 ? 'rgba(235,235,225,0.55)' : 'rgba(250,200,120,0.4)';
        ctx.beginPath(); ctx.ellipse(S(x), Sy(W.floorAt(x)) - ppm * 0.05, ppm * 1.2, ppm * 0.18, 0, 0, TAU); ctx.fill();
      }
      for (let k = 0; k < 90; k++) {
        // mussels in clumps, stacked on one another, a glint on some shells
        const clump = Math.floor(k / 15), x = P.x - 6 + clump * 2.1 + ((k * 0.731) % 1.4), y = W.floorAt(x) - ((k * 0.37) % 0.45);
        ctx.fillStyle = k % 3 ? '#16141a' : '#2a2836';
        ctx.beginPath(); ctx.ellipse(S(x), Sy(y) - ppm * 0.08, ppm * 0.09, ppm * 0.16, -0.4 + (k % 5) * 0.2, 0, TAU); ctx.fill();
        if (k % 4 === 0) { ctx.fillStyle = 'rgba(150,160,185,0.35)'; ctx.beginPath(); ctx.arc(S(x) - ppm * 0.02, Sy(y) - ppm * 0.14, ppm * 0.03, 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(200,220,235,0.5)';
      for (let k = 0; k < 18; k++) {
        const q = (t * 0.12 + k / 18 + P.phase) % 1, x = P.x + Math.sin(k * 5.3) * 4 + Math.sin(q * 9 + k) * 0.4;
        ctx.beginPath(); ctx.arc(S(x), Sy(W.floorAt(P.x + Math.sin(k * 5.3) * 4) - q * 30), Math.max(1, ppm * (0.05 + q * 0.06)), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // (2.7.0) Dave's Haul: a diver's habitat on its terrace, ~1,200 m down the seamount. A yellow pressure
    // cylinder on four legs, lit portholes (Dave passes behind one now and then), the airlock and its docking
    // collar at the east end, a hand-painted sign on the roof, a mast with a red beacon, and the junk of a
    // man who lives down here: a net strung out to dry, glass floats, crates, a drum, an anchor, a tyre.
    // (3.0.0) the research station on the seamount's summit (station_draw.js)
    const St = W.station;
    if (St && inView(St.x, St.y - 18, 34)) { ctx.save(); drawStation(ctx, (dx) => S(St.x + dx), (dy) => Sy(St.y + dy), ppm, t, true); ctx.restore(); }
    const Dv = W.dave;
    if (Dv && inView(Dv.x, Dv.y - 4, 26)) {
      const X = (dx) => S(Dv.x + dx), Y = (dy) => Sy(Dv.y + dy), m = ppm;
      const cy = -3.1, R = 1.8, x0 = -5, x1 = 5; // the hull: its axis 3.1 m above the terrace
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // the cable up the slope, and the mooring chain
      ctx.strokeStyle = '#141414'; ctx.lineWidth = Math.max(1.5, m * 0.08);
      ctx.beginPath(); ctx.moveTo(X(x0), Y(cy + 0.5)); ctx.quadraticCurveTo(X(-9), Y(-0.2), X(-14), Sy(W.floorAt(Dv.x - 14)) - m * 0.1); ctx.lineTo(X(-26), Sy(W.floorAt(Dv.x - 26)) - m * 0.1); ctx.stroke();
      // the legs and their feet
      ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = Math.max(2, m * 0.22);
      for (const lx of [-3.8, -1.6, 1.6, 3.8]) { ctx.beginPath(); ctx.moveTo(X(lx), Y(cy + R * 0.7)); ctx.lineTo(X(lx + Math.sign(lx) * 0.5), Y(0)); ctx.stroke(); ctx.fillStyle = '#2a2a26'; ctx.fillRect(X(lx + Math.sign(lx) * 0.5) - m * 0.35, Y(0) - m * 0.12, m * 0.7, m * 0.18); }
      // the mast, and its beacon
      ctx.strokeStyle = '#2e2e2a'; ctx.lineWidth = Math.max(1.5, m * 0.1); ctx.beginPath(); ctx.moveTo(X(-3.2), Y(cy - R)); ctx.lineTo(X(-3.2), Y(cy - R - 4.2)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(-3.9), Y(cy - R - 3.3)); ctx.lineTo(X(-2.5), Y(cy - R - 3.3)); ctx.stroke();
      const blink = 0.5 + 0.5 * Math.sin(t * 1.1); // (6.8.3) a slow dim swell, never a blink
      ctx.fillStyle = `rgba(${150 + 60 * blink | 0},${50 + 18 * blink | 0},${36 + 10 * blink | 0},0.95)`; ctx.beginPath(); ctx.arc(X(-3.2), Y(cy - R - 4.3), Math.max(2, m * 0.16), 0, TAU); ctx.fill();
      // the hull: a yellow cylinder, rounded ends, rust run down from every seam
      const hg = ctx.createLinearGradient(0, Y(cy - R), 0, Y(cy + R));
      hg.addColorStop(0, '#4a3418'); hg.addColorStop(0.1, '#8a6436'); hg.addColorStop(0.27, '#a47a44'); hg.addColorStop(0.5, '#7a5629'); hg.addColorStop(0.82, '#3e2a12'); hg.addColorStop(1, '#22170a'); /* (6.7.2) old ochre paint, faded and grimed; (6.8.3) turned: a lit band along its upper third, the underside in shadow */
      ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(X(x0), Y(cy - R), (x1 - x0) * m, R * 2 * m, R * m); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(X(x0), Y(cy - R), (x1 - x0) * m, R * 2 * m, R * m); ctx.clip();
      ctx.fillStyle = 'rgba(96,40,14,0.45)';
      for (let k = 0; k < 22; k++) { const rx = x0 + 0.5 + ((k * 2.37) % (x1 - x0 - 1)), len = 0.6 + ((k * 0.73) % 1.6); ctx.fillRect(X(rx), Y(cy - R + 0.2 + (k % 3) * 0.6), Math.max(1, m * 0.07), len * m); }
      ctx.strokeStyle = 'rgba(40,24,6,0.55)'; ctx.lineWidth = Math.max(1, m * 0.07);
      for (const rx of [-2.6, 0, 2.6]) { ctx.beginPath(); ctx.moveTo(X(rx), Y(cy - R)); ctx.lineTo(X(rx), Y(cy + R)); ctx.stroke(); } // the ring seams
      ctx.fillStyle = 'rgba(255,236,200,0.1)'; ctx.fillRect(X(x0), Y(cy - R * 0.72), (x1 - x0) * m, m * 0.22); // the dull shine along its top
      // (6.8.3) the domed ends darker toward their edge, rivet lines along the seams, grime settled on the underside
      for (const [ex, dir] of [[x0 + R, -1], [x1 - R, 1]]) { const eg = ctx.createLinearGradient(X(ex), 0, X(ex + dir * R), 0); eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(16,10,4,0.55)'); ctx.fillStyle = eg; ctx.fillRect(Math.min(X(ex), X(ex + dir * R)), Y(cy - R), R * m, 2 * R * m); }
      ctx.fillStyle = 'rgba(40,24,8,0.7)'; for (const rx of [-2.6, 0, 2.6]) for (let ry = cy - R + 0.3; ry < cy + R - 0.2; ry += 0.4) { ctx.beginPath(); ctx.arc(X(rx + 0.14), Y(ry), Math.max(0.6, m * 0.04), 0, TAU); ctx.fill(); }
      { const ug = ctx.createLinearGradient(0, Y(cy + R * 0.3), 0, Y(cy + R)); ug.addColorStop(0, 'rgba(28,30,18,0)'); ug.addColorStop(1, 'rgba(28,30,18,0.6)'); ctx.fillStyle = ug; ctx.fillRect(X(x0), Y(cy), (x1 - x0) * m, R * m); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(18,12,6,0.8)'; ctx.lineWidth = Math.max(1, m * 0.07); ctx.beginPath(); ctx.roundRect(X(x0), Y(cy - R), (x1 - x0) * m, R * 2 * m, R * m); ctx.stroke(); // a hard edge against the water
      // the portholes: warm light from inside, and now and then his head going past
      const dave = Math.sin(t * 0.21) * 0.5 + 0.5; // where he is in his hut (0 west .. 1 east)
      for (const px of [-2.0, 0.8]) {
        const pr = 0.62, wx = X(px), wy = Y(cy - 0.25);
        { const gl = ctx.createRadialGradient(wx - m * 0.12, wy - m * 0.12, 0, wx, wy, pr * m); gl.addColorStop(0, 'rgba(228,190,126,0.95)'); gl.addColorStop(1, 'rgba(150,104,52,0.95)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(wx, wy, pr * m, 0, TAU); ctx.fill(); } // (6.8.3) lamplight, warm and dim, brighter at its heart
        const hx = -3 + dave * 6.2; // his head and shoulders, when he passes this window
        if (Math.abs(hx - px) < 0.9) { ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, pr * m, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(60,34,14,0.85)'; ctx.beginPath(); ctx.arc(X(hx), wy + m * 0.05, m * 0.26, 0, TAU); ctx.fill(); ctx.fillRect(X(hx) - m * 0.45, wy + m * 0.28, m * 0.9, m * 0.5); ctx.restore(); }
        { const rg2 = ctx.createLinearGradient(0, wy - pr * m, 0, wy + pr * m); rg2.addColorStop(0, '#8a7a56'); rg2.addColorStop(0.5, '#5a4c34'); rg2.addColorStop(1, '#2e261a'); ctx.strokeStyle = rg2; ctx.lineWidth = Math.max(1.5, m * 0.16); ctx.beginPath(); ctx.arc(wx, wy, pr * m, 0, TAU); ctx.stroke(); } // (6.8.3) a brass rim, lit from above
        ctx.strokeStyle = 'rgba(240,226,190,0.32)'; ctx.lineWidth = Math.max(1, m * 0.05); ctx.beginPath(); ctx.arc(wx, wy, pr * m * 0.7, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); // the glass's reflection
      }
      // the airlock: a short trunk at the east end, its hatch and the docking collar
      ctx.fillStyle = '#6e5028'; ctx.fillRect(X(x1 - 0.6), Y(cy - 1.1), m * 1.6, m * 2.2);
      ctx.fillStyle = '#4a4a44'; ctx.fillRect(X(x1 + 0.9), Y(cy - 1.4), m * 0.35, m * 2.8); // the collar
      ctx.fillStyle = '#6e6e66'; ctx.beginPath(); ctx.ellipse(X(x1 + 1.07), Y(cy), m * 0.14, m * 1.05, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,140,0.9)'; ctx.beginPath(); ctx.arc(X(x1 + 0.35), Y(cy - 1.45), Math.max(1.5, m * 0.13), 0, TAU); ctx.fill(); // the lamp over the hatch
      // the sign on the roof: a plank on two posts, hand-painted
      const sx0 = X(-1.6), sy0 = Y(cy - R - 1.9), sw = 4.6 * m, sh = 1.15 * m;
      ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = Math.max(1.5, m * 0.1);
      for (const q of [0.15, 0.85]) { ctx.beginPath(); ctx.moveTo(sx0 + sw * q, sy0 + sh); ctx.lineTo(sx0 + sw * q, Y(cy - R + 0.1)); ctx.stroke(); }
      ctx.fillStyle = '#6e4e2c'; ctx.beginPath(); ctx.moveTo(sx0, sy0 + m * 0.05); ctx.lineTo(sx0 + sw, sy0 - m * 0.08); ctx.lineTo(sx0 + sw, sy0 + sh - m * 0.04); ctx.lineTo(sx0, sy0 + sh); ctx.fill();
      if (m > 5) {
        ctx.fillStyle = '#e2d4b0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.round(m * 0.56)}px "Barlow Semi Condensed", sans-serif`; ctx.fillText("DAVE'S HAUL", sx0 + sw / 2, sy0 + sh * 0.42); // (6.7.2) the game's own type, hand-painted cream
        ctx.fillStyle = '#b8503c'; ctx.font = `700 ${Math.round(m * 0.3)}px "Barlow Semi Condensed", sans-serif`; ctx.fillText('OPEN', sx0 + sw / 2, sy0 + sh * 0.84);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      // the junk: a net strung from the mast to a post, glass floats, crates, a drum, an anchor, a tyre
      ctx.strokeStyle = 'rgba(150,150,120,0.55)'; ctx.lineWidth = 1;
      const nx0 = -3.2, ny0 = cy - R - 2.8, nx1 = -8.5, ny1 = -2.6;
      for (let k = 0; k <= 8; k++) { const q = k / 8; ctx.beginPath(); ctx.moveTo(X(nx0 + (nx1 - nx0) * q), Y(ny0 + (ny1 - ny0) * q)); ctx.lineTo(X(nx0 + (nx1 - nx0) * q - 0.3), Y(ny0 + (ny1 - ny0) * q + 1.6 + Math.sin(q * Math.PI) * 0.8 + Math.sin(t * 0.6 + k) * 0.08)); ctx.stroke(); }
      ctx.beginPath(); for (let k = 0; k <= 8; k++) { const q = k / 8; const xx = X(nx0 + (nx1 - nx0) * q - 0.3), yy = Y(ny0 + (ny1 - ny0) * q + 1.6 + Math.sin(q * Math.PI) * 0.8); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      ctx.strokeStyle = '#2e2e2a'; ctx.lineWidth = Math.max(1.5, m * 0.12); ctx.beginPath(); ctx.moveTo(X(nx1), Y(0)); ctx.lineTo(X(nx1), Y(ny1 - 0.2)); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,40,36,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(nx0), Y(ny0)); ctx.lineTo(X(nx1), Y(ny1)); ctx.stroke();
      for (const [fx, fy, c] of [[-4.6, ny0 + 0.9, [140, 76, 44]], [-6.2, ny0 + 1.6, [78, 92, 62]], [-7.6, ny1 - 0.1, [140, 76, 44]]]) { // (6.8.3) old glass floats, faded: rust and bottle green, shaded round
        const fxp = X(fx), fyp = Y(fy + 0.5), fg = ctx.createRadialGradient(fxp - m * 0.1, fyp - m * 0.12, m * 0.02, fxp, fyp, m * 0.32); fg.addColorStop(0, `rgb(${c[0] * 1.35 | 0},${c[1] * 1.35 | 0},${c[2] * 1.35 | 0})`); fg.addColorStop(0.6, `rgb(${c[0]},${c[1]},${c[2]})`); fg.addColorStop(1, `rgb(${c[0] * 0.35 | 0},${c[1] * 0.35 | 0},${c[2] * 0.35 | 0})`);
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fxp, fyp, m * 0.32, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(30,26,20,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(fxp, fyp, m * 0.32, m * 0.1, 0, 0, TAU); ctx.stroke(); }
      // (6.8.3) the crates: planks, a lit top edge, the side away from the light darker; the drum turned and rusted
      const crate = (cx2, cy2, cw, ch, base) => { const [a, b, c] = base; const cg = ctx.createLinearGradient(X(cx2), 0, X(cx2 + cw), 0); cg.addColorStop(0, `rgb(${a * 1.2 | 0},${b * 1.2 | 0},${c * 1.2 | 0})`); cg.addColorStop(1, `rgb(${a * 0.6 | 0},${b * 0.6 | 0},${c * 0.6 | 0})`);
        ctx.fillStyle = cg; ctx.fillRect(X(cx2), Y(cy2), cw * m, ch * m); ctx.strokeStyle = 'rgba(20,12,6,0.55)'; ctx.lineWidth = 1; for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(X(cx2), Y(cy2 + ch * k / 3)); ctx.lineTo(X(cx2 + cw), Y(cy2 + ch * k / 3)); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(214,190,150,0.3)'; ctx.beginPath(); ctx.moveTo(X(cx2), Y(cy2)); ctx.lineTo(X(cx2 + cw), Y(cy2)); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(X(cx2), Y(cy2), cw * m, ch * m); };
      crate(6.8, -0.9, 1.1, 0.9, [90, 64, 38]); crate(7.2, -1.6, 0.9, 0.7, [74, 52, 32]);
      { const dg = ctx.createLinearGradient(X(-6.4), 0, X(-5.6), 0); dg.addColorStop(0, '#5a4a36'); dg.addColorStop(0.35, '#7a6448'); dg.addColorStop(1, '#2a2218'); ctx.fillStyle = dg; ctx.fillRect(X(-6.4), Y(-1.2), m * 0.8, m * 1.2);
        ctx.fillStyle = 'rgba(20,14,8,0.5)'; for (const ry of [-0.85, -0.4]) ctx.fillRect(X(-6.4), Y(ry), m * 0.8, Math.max(1, m * 0.07)); ctx.fillStyle = 'rgba(110,56,28,0.45)'; ctx.fillRect(X(-6.1), Y(-1.2), m * 0.12, m * 0.9); } // a drum
      ctx.strokeStyle = '#3a342c'; ctx.lineWidth = Math.max(1.5, m * 0.14); // the anchor, on its side
      ctx.beginPath(); ctx.moveTo(X(8.6), Y(-0.15)); ctx.lineTo(X(10.4), Y(-0.15)); ctx.moveTo(X(8.6), Y(-0.15)); ctx.quadraticCurveTo(X(8.2), Y(-0.9), X(8.8), Y(-1.2)); ctx.moveTo(X(10.4), Y(-0.15)); ctx.lineTo(X(10.6), Y(-0.8)); ctx.stroke();
      ctx.strokeStyle = '#161616'; ctx.lineWidth = Math.max(2, m * 0.2); ctx.beginPath(); ctx.ellipse(X(-1.2), Y(-0.25), m * 0.7, m * 0.22, 0, 0, TAU); ctx.stroke(); // a tyre
      // (3.0.0) more of Dave's life: the things a man accumulates living down here alone
      // a vent pipe off the roof, the heater's warm water trickling up as bubbles
      ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = Math.max(1.5, m * 0.14); ctx.beginPath(); ctx.moveTo(X(2.4), Y(cy - R + 0.1)); ctx.lineTo(X(2.4), Y(cy - R - 1.1)); ctx.lineTo(X(2.9), Y(cy - R - 1.4)); ctx.stroke();
      ctx.fillStyle = 'rgba(210,230,235,0.5)';
      for (let k = 0; k < 5; k++) { const ph = (t * 0.35 + k / 5) % 1; ctx.beginPath(); ctx.arc(X(2.95 + Math.sin(ph * 9 + k) * 0.15), Y(cy - R - 1.5 - ph * 5), Math.max(0.8, m * (0.05 + 0.06 * ph)), 0, TAU); ctx.fill(); }
      // a TV dish bolted to the roof at the east end, bent, pointing at nothing
      ctx.save(); ctx.translate(X(3.7), Y(cy - R - 0.5)); ctx.rotate(-0.5);
      ctx.fillStyle = '#b8b4a6'; ctx.beginPath(); ctx.ellipse(0, 0, m * 0.55, m * 0.2, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = '#5a5a52'; ctx.lineWidth = Math.max(1, m * 0.05); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -m * 0.55); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#4a4a44'; ctx.lineWidth = Math.max(1, m * 0.07); ctx.beginPath(); ctx.moveTo(X(3.7), Y(cy - R - 0.3)); ctx.lineTo(X(3.7), Y(cy - R + 0.1)); ctx.stroke();
      // his spare wetsuit and a towel hung on the net line to "dry"
      // (6.9.1) cloth on the line, not a flat shape: folds shaded across it (light, dark, light), a ragged hem swaying
      const hang = (hx, hy, w, h, col) => { const sw2 = Math.sin(t * 0.7 + hx) * 0.08, xa = X(hx - w / 2), xb = X(hx + w / 2);
        const fg = ctx.createLinearGradient(xa, 0, xb, 0); fg.addColorStop(0, col); fg.addColorStop(0.3, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, 'rgba(0,0,0,0)'); fg.addColorStop(1, col);
        ctx.beginPath(); ctx.moveTo(xa, Y(hy)); ctx.lineTo(xb, Y(hy)); ctx.lineTo(X(hx + w / 2 + sw2), Y(hy + h));
        for (let k = 5; k >= 0; k--) ctx.lineTo(X(hx - w / 2 + sw2 + w * k / 5), Y(hy + h - (k % 2) * 0.07)); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.save(); ctx.clip();
        for (let k = 0; k < 3; k++) { const fx2 = X(hx - w / 2 + w * (0.2 + k * 0.3) + sw2 * 0.5), gg2 = ctx.createLinearGradient(fx2 - m * w * 0.12, 0, fx2 + m * w * 0.12, 0); gg2.addColorStop(0, 'rgba(255,240,220,0.12)'); gg2.addColorStop(0.5, 'rgba(0,0,0,0.3)'); gg2.addColorStop(1, 'rgba(255,240,220,0)'); ctx.fillStyle = gg2; ctx.fillRect(fx2 - m * w * 0.12, Y(hy), m * w * 0.24, h * m + 4); }
        const dg2 = ctx.createLinearGradient(0, Y(hy), 0, Y(hy + h)); dg2.addColorStop(0, 'rgba(0,0,0,0)'); dg2.addColorStop(1, 'rgba(10,8,6,0.35)'); ctx.fillStyle = dg2; ctx.fillRect(xa - 4, Y(hy), xb - xa + 8, h * m + 4); ctx.restore(); };
      const lineY = (x) => ny0 + (ny1 - ny0) * ((x - nx0) / (nx1 - nx0));
      hang(-5.4, lineY(-5.4), 0.7, 1.7, '#16181a'); ctx.fillStyle = '#16181a'; ctx.fillRect(X(-5.75), Y(lineY(-5.4) + 0.15), m * 0.7 * 0.32, m * 0.9); // the suit, an arm hanging down
      hang(-7.0, lineY(-7.0), 0.55, 0.9, '#7e3e2c'); /* (6.9.1) faded */ ctx.fillStyle = 'rgba(240,220,180,0.6)'; ctx.fillRect(X(-7.27), Y(lineY(-7.0) + 0.35), m * 0.55, m * 0.08); // a striped towel
      // an old brass diving helmet on the crates, and a bucket of kelp he keeps "for the colour"
      const hx2 = X(7.65), hy2 = Y(-2.05), hr = m * 0.42;
      const bg2 = ctx.createRadialGradient(hx2 - hr * 0.3, hy2 - hr * 0.3, hr * 0.1, hx2, hy2, hr); bg2.addColorStop(0, '#d8b060'); bg2.addColorStop(1, '#6a4c18');
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(hx2, hy2, hr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(40,50,46,0.85)'; ctx.beginPath(); ctx.arc(hx2 + hr * 0.25, hy2, hr * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = Math.max(1, m * 0.06); ctx.beginPath(); ctx.arc(hx2 + hr * 0.25, hy2, hr * 0.42, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#7a5a20'; ctx.fillRect(hx2 - hr * 0.8, hy2 + hr * 0.75, hr * 1.6, hr * 0.3); // its breastplate rim
      ctx.fillStyle = '#5a6a6a'; ctx.beginPath(); ctx.moveTo(X(5.2), Y(-0.75)); ctx.lineTo(X(5.9), Y(-0.75)); ctx.lineTo(X(5.8), Y(0)); ctx.lineTo(X(5.3), Y(0)); ctx.closePath(); ctx.fill(); // the bucket
      ctx.strokeStyle = '#5a7a3a'; ctx.lineWidth = Math.max(1, m * 0.07);
      for (let k = 0; k < 4; k++) { const bx = 5.35 + k * 0.14; ctx.beginPath(); ctx.moveTo(X(bx), Y(-0.75)); ctx.quadraticCurveTo(X(bx + Math.sin(t * 0.8 + k) * 0.3), Y(-1.6), X(bx + Math.sin(t * 0.6 + k * 2) * 0.4), Y(-2.2 - k * 0.15)); ctx.stroke(); }
      // a lifebuoy on a hook by the hatch, and his name stencilled on a box under it
      ctx.strokeStyle = '#e06a3a'; ctx.lineWidth = Math.max(1.5, m * 0.16); ctx.beginPath(); ctx.arc(X(4.2), Y(cy + 0.5), m * 0.42, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#f0e8d8'; ctx.lineWidth = Math.max(1.5, m * 0.16); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(X(4.2), Y(cy + 0.5), m * 0.42, k * Math.PI / 2, k * Math.PI / 2 + 0.35); ctx.stroke(); }
      if (m > 6) { ctx.fillStyle = '#3e3424'; ctx.fillRect(X(3.4), Y(-0.85), m * 1.3, m * 0.85); ctx.fillStyle = '#d8c8a0'; ctx.font = `700 ${Math.round(m * 0.3)}px monospace`; ctx.textAlign = 'center'; ctx.fillText('DAVE', X(4.05), Y(-0.3)); ctx.textAlign = 'left'; }
      // a string of little bulbs along the hull's belly, one of them dead
      for (let k = 0; k < 9; k++) { const bx = x0 + 0.8 + k * 1.05, by = cy + R * 0.92 + Math.sin(k * 0.9) * 0.12; ctx.fillStyle = k === 5 ? '#4a4030' : `rgba(255,${200 + (k % 3) * 15},120,${(0.75 + 0.25 * Math.sin(t * 2 + k)).toFixed(2)})`; ctx.beginPath(); ctx.arc(X(bx), Y(by), Math.max(1, m * 0.08), 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // the canyon's current: silt streaming down and out toward the deep
    const cx = (CANYON.x0 + CANYON.x1) / 2;
    if (inView(cx, this.cam.y, 80) && this.cam.y > CANYON.top - 40) {
      // (7.7.2, owner) silt, not lines: each a fine grain with a short tail fading behind it, wobbling as it drifts, and
      // seen only where there is light (the long even strokes of before read as streaks on the screen)
      ctx.save(); ctx.lineCap = 'round';
      for (let k = 0; k < 46; k++) {
        const q = (t * 0.05 * (0.7 + (k * 0.137) % 0.6) + k * 0.6180339) % 1;
        const x = CANYON.x1 - q * (CANYON.x1 - CANYON.x0), y = this.cam.y - this.cam.h / 2 + ((k * 0.381966 + q * 0.12) % 1) * this.cam.h + Math.sin(t * 0.7 + k) * 0.25;
        if (y < CANYON.top || y > W.floorAt(x) - 1) continue;
        const lit = this.litAt ? this.litAt(x, y) : 1; if (lit < 0.08) continue;
        const a = Math.min(1, lit) * Math.min(1, q * 8, (1 - q) * 8), X = S(x), Y = Sy(y), tl = 0.35 * ppm, ty = -0.1 * ppm;
        const gr = ctx.createLinearGradient(X, Y, X + tl, Y + ty); gr.addColorStop(0, `rgba(196,186,156,${(0.22 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(196,186,156,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = Math.max(1, 0.035 * ppm); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + tl, Y + ty); ctx.stroke();
      }
      ctx.restore();
    }
    // the old one: a giant anglerfish filling the back of the cave, her lure hanging at its mouth
    if (inView(ANGLER.x, ANGLER.y, 30)) {
      const sp = SPECIES_BY_ID[100], L = ANGLER.len * ppm, bob = Math.sin(t * 0.35) * 0.3;
      ctx.save(); ctx.translate(S(ANGLER.x), Sy(ANGLER.y + bob)); ctx.scale(-1, 1);
      const r = drawSpecies(ctx, sp, L, t * 0.25, 0.1, 0);
      ctx.restore();
      if (r && r[0]) {
        // (6.1.4) her lure trails out on a long thin stalk and hangs at the cave's mouth over the west end of her table,
        // swaying slowly, so its light is the first thing seen coming in, and it lights what she has laid out
        const hx = ANGLER.x + r[0][0] / ppm * -1, hy = ANGLER.y + bob + r[0][1] / ppm, sw = Math.sin(t * 0.4) * 0.5, sw2 = Math.sin(t * 0.27 + 1) * 0.3;
        const ex = LURE.x + sw, ey = LURE.y + sw2;
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(18,16,14,0.9)'; ctx.lineWidth = Math.max(1.2, 0.14 * ppm);
        ctx.beginPath(); ctx.moveTo(S(hx), Sy(hy)); ctx.bezierCurveTo(S(hx + 4), Sy(hy - 5), S(ex - 3), Sy(ey - 8), S(ex), Sy(ey - 0.4)); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,200,210,0.18)'; ctx.lineWidth = Math.max(0.6, 0.05 * ppm); ctx.stroke(); // a wet sheen along it
        const R0 = 0.42 * ppm, bg = ctx.createRadialGradient(S(ex) - R0 * 0.3, Sy(ey) - R0 * 0.3, 0, S(ex), Sy(ey), R0);
        bg.addColorStop(0, 'rgba(238,240,224,1)'); bg.addColorStop(0.45, 'rgba(188,210,194,0.95)'); bg.addColorStop(1, 'rgba(70,92,84,0.9)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(S(ex), Sy(ey), R0 * 0.85, R0, 0, 0, TAU); ctx.fill(); // the bulb
        ctx.fillStyle = 'rgba(20,18,16,0.85)'; ctx.beginPath(); ctx.ellipse(S(ex), Sy(ey - 0.36), R0 * 0.4, R0 * 0.22, 0, 0, TAU); ctx.fill(); // where it joins the stalk
        ctx.strokeStyle = 'rgba(200,220,206,0.45)'; ctx.lineWidth = Math.max(0.5, 0.04 * ppm); for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(S(ex + k * 0.12), Sy(ey + 0.38)); ctx.quadraticCurveTo(S(ex + k * 0.3 + sw * 0.2), Sy(ey + 0.9), S(ex + k * 0.25), Sy(ey + 1.3)); ctx.stroke(); } // its fine filaments
        ctx.restore();
        this.escaW = { x: ex, y: ey };
      }
    }
    // (3.0.0) her table, below her mouth, and what lies on it
    if (inView(TABLE.x0 + 10, TABLE.y, 30)) drawTable(ctx, S, Sy, ppm, t, g.profile, pictureOf, g.oldHover);
  }

  drawVent(ctx, v, S, Sy, ppm, t) {
    const x = S(v.x), y = Sy(v.y), h = v.h * ppm;
    let C = v._spr;
    if (!C || ppm > C.bp * 1.3) {
      const bp = Math.min(Math.max(ppm, 24) * 1.2, 80);
      const hh = v.h * bp, ww = bp * 1.1, ox = -ww * 2, oy = -hh * 1.4, cw = Math.ceil(ww * 4), ch = Math.ceil(hh * 1.4 + ww * 0.7);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const g2 = c.getContext('2d'); g2.translate(-ox, -oy);
      drawVentChimney(g2, hh, ww, v.x);
      C = v._spr = { c, bp, ox, oy, cw, ch };
    }
    const k = ppm / C.bp;
    ctx.drawImage(C.c, x + C.ox * k, y + C.oy * k, C.cw * k, C.ch * k);
    for (let k = 0; k < 14; k++) {
      const p = ((t * 0.25 + k / 14 + v.phase) % 1);
      const px = x + Math.sin(p * 7 + k) * ppm * (0.3 + p * 2), py = y - h - p * ppm * 14;
      ctx.fillStyle = `rgba(14,12,12,${(0.5 * (1 - p)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(px, py, ppm * (0.4 + p * 1.6), 0, TAU); ctx.fill();
    }
  }

  drawPickup(ctx, p, x, y, ppm, t) {
    const u = ppm;
    ctx.save(); ctx.translate(x, y); if (p.rot) ctx.rotate(p.rot);
    switch (p.type) {
      case 'clam':
        ctx.fillStyle = '#8a8270'; ctx.beginPath(); ctx.ellipse(0, -u * 0.08, u * 0.2, u * 0.12, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#6a6252'; ctx.beginPath(); ctx.ellipse(0, -u * 0.07, u * 0.2, u * 0.06, 0, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * u * 0.03, -u * 0.08); ctx.lineTo(k * u * 0.07, -u * 0.18); ctx.stroke(); }
        break;
      case 'mussel':
        // a little clump of mussels standing in the sand
        for (let k = 0; k < 4; k++) {
          ctx.save(); ctx.translate((k - 1.5) * u * 0.07, 0); ctx.rotate(-0.35 + k * 0.22);
          ctx.fillStyle = k % 2 ? '#1a2030' : '#252e44';
          ctx.beginPath(); ctx.ellipse(0, -u * 0.09, u * 0.04, u * 0.1, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(150,170,210,0.2)'; ctx.beginPath(); ctx.ellipse(-u * 0.012, -u * 0.12, u * 0.012, u * 0.05, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        break;
      case 'rock':
        ctx.fillStyle = '#4a4844'; ctx.beginPath(); ctx.moveTo(-u * 0.2, 0); ctx.lineTo(-u * 0.12, -u * 0.2); ctx.lineTo(u * 0.1, -u * 0.22); ctx.lineTo(u * 0.22, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-u * 0.1, -u * 0.18, u * 0.12, u * 0.03);
        break;
      case 'iron':
        ctx.rotate(0.3); ctx.fillStyle = '#5a3420'; ctx.fillRect(-u * 0.3, -u * 0.12, u * 0.6, u * 0.1);
        ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-u * 0.25, -u * 0.12, u * 0.2, u * 0.04);
        ctx.fillStyle = '#1a1210'; ctx.beginPath(); ctx.arc(u * 0.15, -u * 0.07, u * 0.025, 0, TAU); ctx.fill();
        break;
      case 'scale': {
        const s = Math.sin(t * 3 + p.phase);
        for (let k = 0; k < 5; k++) { ctx.fillStyle = `rgba(220,230,240,${(0.45 + 0.4 * Math.sin(t * 4 + k + p.phase)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(Math.sin(k * 2 + p.phase) * u * 0.25, Math.cos(k * 3) * u * 0.18 + s * u * 0.1, u * 0.05, u * 0.035, k, 0, TAU); ctx.fill(); }
        break;
      }
      case 'tentacle':
        ctx.strokeStyle = '#8a3a30'; ctx.lineWidth = u * 0.07; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-u * 0.4, -u * 0.04); ctx.quadraticCurveTo(0, -u * 0.25, u * 0.2, -u * 0.06); ctx.quadraticCurveTo(u * 0.35, u * 0.02, u * 0.3, -u * 0.12); ctx.stroke();
        ctx.fillStyle = '#c87a6a'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-u * 0.35 + k * u * 0.1, -u * 0.06 - Math.sin(k) * u * 0.06, u * 0.018, 0, TAU); ctx.fill(); }
        break;
      case 'ink':
        ctx.translate(0, Math.sin(t + p.phase) * u * 0.1);
        ctx.fillStyle = 'rgba(20,14,26,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, u * 0.14, u * 0.2, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(120,90,150,0.35)'; ctx.beginPath(); ctx.ellipse(-u * 0.04, -u * 0.06, u * 0.05, u * 0.07, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(10,8,14,0.25)'; ctx.beginPath(); ctx.arc(u * 0.25, u * 0.1, u * 0.3, 0, TAU); ctx.fill();
        break;
      case 'glass':
        ctx.strokeStyle = 'rgba(230,236,232,0.75)'; ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-u * 0.2 + k * u * 0.1, 0); ctx.lineTo(-u * 0.1 + k * u * 0.06, -u * 0.35); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-u * 0.2, -u * 0.12); ctx.lineTo(u * 0.22, -u * 0.18); ctx.moveTo(-u * 0.18, -u * 0.26); ctx.lineTo(u * 0.14, -u * 0.3); ctx.stroke();
        break;
      case 'necklace': { // (3.0.1) a glow stick lying in the silt, still faintly lit
        const gg = ctx.createRadialGradient(0, -u * 0.05, 0, 0, -u * 0.05, u * 0.45); gg.addColorStop(0, 'rgba(160,255,180,0.35)'); gg.addColorStop(1, 'rgba(160,255,180,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, -u * 0.05, u * 0.45, 0, TAU); ctx.fill();
        ctx.save(); ctx.rotate(-0.25); ctx.fillStyle = '#9af0b0'; ctx.beginPath(); ctx.roundRect(-u * 0.22, -u * 0.09, u * 0.44, u * 0.07, u * 0.035); ctx.fill();
        ctx.fillStyle = '#2a3a30'; ctx.fillRect(u * 0.2, -u * 0.1, u * 0.06, u * 0.09); ctx.restore();
        break;
      }
      case 'coral': {
        ctx.strokeStyle = '#d88a6a'; ctx.lineWidth = Math.max(1, u * 0.05); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-u * 0.15, 0); ctx.lineTo(0, -u * 0.25); ctx.lineTo(u * 0.12, -u * 0.4); ctx.moveTo(0, -u * 0.25); ctx.lineTo(-u * 0.1, -u * 0.4); ctx.stroke(); ctx.lineCap = 'butt';
        break;
      }
      case 'net': {
        // a lost fishing net snagged on the bottom, an animal struggling in it
        const st = Math.sin(t * 3 + p.phase) * 0.15;
        ctx.save(); ctx.rotate(st * 0.3);
        if (p.animal === 'turtle') {
          ctx.fillStyle = '#4e5a36'; ctx.beginPath(); ctx.ellipse(0, -u * 0.25, u * 0.5, u * 0.28, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#6e6a4c'; ctx.beginPath(); ctx.ellipse(-u * 0.55, -u * 0.22, u * 0.14, u * 0.1, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(-u * 0.2, -u * 0.05, u * 0.32, u * 0.07, 0.6 + st * 2, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = '#c45a5a'; ctx.beginPath(); ctx.ellipse(0, -u * 0.25, u * 0.45, u * 0.17, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(u * 0.4, -u * 0.25); ctx.lineTo(u * 0.65, -u * 0.42 + st * u); ctx.lineTo(u * 0.65, -u * 0.08 + st * u); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(70,110,90,0.85)'; ctx.lineWidth = Math.max(1, u * 0.025);
        ctx.beginPath();
        for (let k = -6; k <= 6; k++) { ctx.moveTo(k * u * 0.12, u * 0.05); ctx.lineTo(k * u * 0.12 + u * 0.3, -u * 0.7); ctx.moveTo(k * u * 0.12, u * 0.05); ctx.lineTo(k * u * 0.12 - u * 0.3, -u * 0.7); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(200,120,50,0.9)'; ctx.beginPath(); ctx.arc(u * 0.6, -u * 0.7, u * 0.08, 0, TAU); ctx.fill(); // float
        break;
      }
      case 'nodule': {
        // a knobbly black-brown lump, half sunk in the ooze
        ctx.fillStyle = '#1c1612';
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI, r = u * (0.16 + 0.03 * Math.sin(k * 2.7 + p.phase * 3)); ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.9); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,96,70,0.35)';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc((k - 1.5) * u * 0.07, -u * (0.06 + (k % 2) * 0.05), u * 0.025, 0, TAU); ctx.fill(); }
        break;
      }
      case 'bone': {
        // a curved white rib lying on the bottom
        ctx.strokeStyle = '#d8d0bc'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, u * 0.09);
        ctx.beginPath(); ctx.moveTo(-u * 0.45, -u * 0.04); ctx.quadraticCurveTo(0, -u * (0.35 + 0.1 * Math.sin(p.phase)), u * 0.45, -u * 0.05); ctx.stroke();
        ctx.strokeStyle = 'rgba(90,80,60,0.4)'; ctx.lineWidth = Math.max(1, u * 0.03);
        ctx.beginPath(); ctx.moveTo(-u * 0.2, -u * 0.2); ctx.quadraticCurveTo(0, -u * 0.27, u * 0.2, -u * 0.2); ctx.stroke();
        ctx.lineCap = 'butt';
        break;
      }
      case 'sapphire': {
        const s = 0.5 + 0.5 * Math.sin(t * 2 + p.phase);
        ctx.fillStyle = '#0c2a8a';
        ctx.beginPath(); ctx.moveTo(0, -u * 0.42); ctx.lineTo(u * 0.2, -u * 0.18); ctx.lineTo(u * 0.12, 0); ctx.lineTo(-u * 0.12, 0); ctx.lineTo(-u * 0.2, -u * 0.18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a6ae8'; ctx.beginPath(); ctx.moveTo(0, -u * 0.42); ctx.lineTo(u * 0.2, -u * 0.18); ctx.lineTo(0, -u * 0.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(220,235,255,${(0.4 + s * 0.5).toFixed(3)})`; ctx.fillRect(-u * 0.04, -u * 0.34, u * 0.04, u * 0.04);
        // every few seconds a brief four-pointed twinkle gives its hiding place away
        const tw = Math.pow(Math.max(0, Math.sin(t * 0.9 + p.phase * 2.3)), 40);
        if (tw > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(190,215,255,${(0.9 * tw).toFixed(3)})`; ctx.lineWidth = Math.max(1, u * 0.03);
          const r = u * (0.4 + tw * 0.5);
          ctx.beginPath(); ctx.moveTo(-r, -u * 0.3); ctx.lineTo(r, -u * 0.3); ctx.moveTo(0, -u * 0.3 - r); ctx.lineTo(0, -u * 0.3 + r); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        break;
      }
    }
    ctx.restore();
  }

  drawLanternBody(ctx, l, S, Sy, ppm, t) {
    const x = S(l.x), y = Sy(l.y);
    if (l.tether) {
      ctx.strokeStyle = 'rgba(50,60,56,0.7)'; ctx.lineWidth = Math.max(1, ppm * 0.05);
      ctx.beginPath(); ctx.moveTo(x, y + ppm * 0.4);
      ctx.quadraticCurveTo(x + Math.sin(t * 0.5 + l.phase) * ppm, y + l.tether * ppm * 0.5, x, y + l.tether * ppm); ctx.stroke();
    }
    const r = ppm * 0.5;
    const br = 0.3 + 0.7 * l.charge;
    // trailing tendrils with glowing tips
    ctx.lineWidth = Math.max(1, ppm * 0.03);
    for (let k = 0; k < 7; k++) {
      const bx = x + (k - 3) * r * 0.22;
      const len = r * (1.4 + (k % 3) * 0.6);
      const ex = bx + Math.sin(t * 0.8 + k + l.phase) * r * 0.4, ey = y + r * 0.5 + len;
      ctx.strokeStyle = `hsla(${l.hue + 10},35%,45%,0.5)`;
      ctx.beginPath(); ctx.moveTo(bx, y + r * 0.4); ctx.quadraticCurveTo(bx + Math.sin(t + k) * r * 0.3, y + r * 0.5 + len * 0.5, ex, ey); ctx.stroke();
      ctx.fillStyle = `hsla(${l.hue},80%,${(50 + 30 * br) | 0}%,${(0.5 + 0.5 * br).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, ppm * 0.045), 0, TAU); ctx.fill();
    }
    // membrane
    const blob = new Path2D();
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * TAU;
      const rr = r * (1 + 0.16 * Math.sin(a * 3 + t * 1.1 + l.phase) + 0.08 * Math.sin(a * 5 - t * 0.7));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
      if (k === 0) blob.moveTo(px, py); else blob.lineTo(px, py);
    }
    const g = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r * 1.15);
    g.addColorStop(0, `hsla(${l.hue},55%,${(40 + 25 * br) | 0}%,0.55)`);
    g.addColorStop(0.7, `hsla(${l.hue + 25},45%,22%,0.45)`);
    g.addColorStop(1, `hsla(${l.hue + 30},40%,12%,0.25)`);
    ctx.fillStyle = g; ctx.fill(blob);
    ctx.strokeStyle = `hsla(${l.hue},40%,75%,0.3)`; ctx.lineWidth = 1; ctx.stroke(blob);
    // veins
    ctx.save(); ctx.clip(blob);
    ctx.strokeStyle = `hsla(${l.hue + 15},50%,60%,0.22)`;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(k * 1.3) * r * 0.6, y + Math.sin(k * 2.1) * r * 0.3, x + Math.cos(k * 1.3 + 0.4) * r, y + Math.sin(k * 1.3 + 0.4) * r * 0.8); ctx.stroke(); }
    ctx.restore();
    // nucleus, pulsing
    const p = 0.75 + 0.25 * Math.sin(t * 1.6 + l.phase);
    const ng = ctx.createRadialGradient(x, y, 0, x, y, r * 0.45 * p);
    ng.addColorStop(0, `hsla(${l.hue - 10},90%,${(70 + 25 * br) | 0}%,${(0.95 * br).toFixed(2)})`);
    ng.addColorStop(1, `hsla(${l.hue},80%,50%,0)`);
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, r * 0.45 * p, 0, TAU); ctx.fill();
  }


  // (7.8.0, owner) the edge of the first sea: a weathered wooden sign where the beach goes into the water, and the old
  // diver who sits on a stone at the beach's end in a brass helmet and a patched canvas suit, his back to the drop
  drawEdgeKeeper(g, ctx, S, Sy, ppm, t) {
    const W = g.world;
    { const x = SIGN.x, gy = W.floorAt(x), px = S(x), base = Sy(gy), top = Sy(-1.9), bw = 1.5 * ppm, bh = 0.62 * ppm, by = Sy(-1.55);
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = '#4a3622'; ctx.lineWidth = Math.max(2, 0.12 * ppm); ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px + 0.03 * ppm, top); ctx.stroke(); // the post
      ctx.translate(px, by); ctx.rotate(-0.04);
      const wg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); wg.addColorStop(0, '#8a6a44'); wg.addColorStop(0.5, '#73563a'); wg.addColorStop(1, '#5a432c');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(-bw / 2, -bh / 2 + 1); ctx.lineTo(bw / 2, -bh / 2); ctx.lineTo(bw / 2 - 1, bh / 2); ctx.lineTo(-bw / 2 + 1, bh / 2 + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,10,0.5)'; ctx.lineWidth = 1; for (const k of [-0.15, 0.18]) { ctx.beginPath(); ctx.moveTo(-bw / 2 + 2, k * bh); ctx.lineTo(bw / 2 - 2, k * bh + 0.5); ctx.stroke(); } // grain
      ctx.fillStyle = '#e9dcc0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.max(7, bh * 0.34)}px 'Barlow Semi Condensed', sans-serif`; ctx.fillText('DANGER AHEAD', 0, -bh * 0.17);
      ctx.font = `600 ${Math.max(6, bh * 0.28)}px 'Barlow Semi Condensed', sans-serif`; ctx.fillText('TURN BACK', 0, bh * 0.22);
      ctx.restore(); }
    { const x = KEEPER.x, gy = W.floorAt(x), px = S(x), sy = Sy(gy), u = ppm / 40, bob = Math.sin(t * 0.8) * 0.6 * u;
      ctx.save(); ctx.translate(px, sy);
      // his stone
      const sg = ctx.createLinearGradient(0, -16 * u, 0, 2 * u); sg.addColorStop(0, '#5d6260'); sg.addColorStop(1, '#2f3332');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-15 * u, 2 * u); ctx.quadraticCurveTo(-16 * u, -12 * u, -4 * u, -16 * u); ctx.quadraticCurveTo(10 * u, -17 * u, 15 * u, -8 * u); ctx.lineTo(16 * u, 2 * u); ctx.closePath(); ctx.fill();
      ctx.translate(0, -15 * u + bob); ctx.scale(-1, 1); // facing back toward the beach, the drop behind him
      const canvas = ctx.createLinearGradient(0, -30 * u, 0, 10 * u); canvas.addColorStop(0, '#7d7560'); canvas.addColorStop(1, '#4f4a3c');
      ctx.fillStyle = canvas; ctx.strokeStyle = 'rgba(20,16,10,0.6)'; ctx.lineWidth = 1.2 * u;
      ctx.beginPath(); ctx.moveTo(-8 * u, 0); ctx.quadraticCurveTo(-10 * u, -18 * u, -2 * u, -26 * u); ctx.lineTo(8 * u, -25 * u); ctx.quadraticCurveTo(10 * u, -12 * u, 7 * u, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); // body, seated
      ctx.beginPath(); ctx.moveTo(-6 * u, -2 * u); ctx.quadraticCurveTo(10 * u, -3 * u, 16 * u, 4 * u); ctx.lineTo(16 * u, 12 * u); ctx.lineTo(11 * u, 12 * u); ctx.lineTo(10 * u, 6 * u); ctx.quadraticCurveTo(2 * u, 4 * u, -6 * u, 4 * u); ctx.closePath(); ctx.fill(); ctx.stroke(); // thighs and shins
      ctx.fillStyle = '#2a2622'; ctx.fillRect(9 * u, 11 * u, 9 * u, 4 * u); // lead boots
      ctx.fillStyle = '#6e6450'; ctx.fillRect(-3 * u, -14 * u, 7 * u, 4 * u); // a patch
      ctx.fillStyle = canvas; ctx.beginPath(); ctx.moveTo(5 * u, -22 * u); ctx.quadraticCurveTo(12 * u, -14 * u, 12 * u, -6 * u); ctx.lineTo(8 * u, -5 * u); ctx.quadraticCurveTo(8 * u, -13 * u, 2 * u, -18 * u); ctx.closePath(); ctx.fill(); ctx.stroke(); // arm on his knee
      // the brass helmet: a dome, its breastplate, a round front port and two side ports
      const hx = 2 * u, hy = -34 * u, hr = 9 * u, hg = ctx.createRadialGradient(hx - hr * 0.4, hy - hr * 0.45, hr * 0.1, hx, hy, hr * 1.1);
      hg.addColorStop(0, '#e4c47e'); hg.addColorStop(0.5, '#a87d3c'); hg.addColorStop(1, '#5a3e1a');
      ctx.fillStyle = '#7a5a2c'; ctx.beginPath(); ctx.ellipse(hx, hy + 8 * u, 11 * u, 4 * u, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a2224'; ctx.strokeStyle = '#c9a55c'; ctx.lineWidth = 1.6 * u; ctx.beginPath(); ctx.arc(hx + 4.6 * u, hy + 0.5 * u, 3.6 * u, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx - 2 * u, hy - 1 * u, 2 * u, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(hx - 3.5 * u, hy - 5 * u, 2.4 * u, 1.3 * u, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
      // a thread of bubbles from his helmet now and then
      if (g.bubbles && Math.random() < 0.02) g.bubbles.push({ x: x + 0.05, y: gy - 1.3, r: 0.03 + Math.random() * 0.04, w: Math.random() * 6, t: 0 }); }
  }
  drawSay(g, S, Sy, ppm) {
    // (6.0.5) the scene's messages: each written beside what it is about (him, the sub), with a short line to it, the
    // (6.1.5) where Earl (or the sub he is in) is on screen, for the line that says what killed him
    { const o = g.earl && g.earl.inSub ? g.sub : g.earl; if (o) g.earlScr = [S(o.x) / this.W, Sy(o.y) / this.H, ppm / this.W]; } /* as fractions of the screen: the HUD's canvas has its own size */
    // words on the side away from the screen's nearer edge; they fade after a few seconds
    if (g.says && g.says.length && g.mode === 'play') { const ctx = this.ctx, W = this.W; let row = 0;
      for (const m of g.says) { const o = m.at === 'sub' ? g.sub : m.at === 'pet' ? g.petC : m.at === 'keeper' ? { x: KEEPER.x, y: g.world.floorAt(KEEPER.x) - 1.1 } : g.earl, a = clamp(m.t / 0.3, 0, 1) * clamp((4 - m.t) / 0.7, 0, 1); if (a < 0.01 || !o) continue;
        const hx = S(o.x), hy = Sy(o.y) - ppm * (m.at === 'sub' ? 2.2 : 0.8) - row * 22, fs = 15; row++;
        ctx.save(); ctx.font = `500 ${fs}px ${HUDF}`; const w = ctx.measureText(m.text).width, left = hx > W * 0.5, d = Math.max(30, ppm * 1.2); let tx = left ? Math.max(150, hx - d - w) : Math.min(W - w - 150, hx + d); let ty = Math.max(fs + 70, hy - Math.max(30, ppm * 1.2));
        // (7.5.0, owner) every word written just above what it is about (him, the sub, the pet), with no line to it
        ctx.globalAlpha = a; { const lift = m.at === 'sub' ? ppm * 2.6 : m.at === 'pet' ? Math.max(18, ppm * ((o.len || 1) * 0.35 + 0.5)) : Math.max(26, ppm * 1.15);
          tx = Math.min(W - w - 12, Math.max(12, hx - w / 2)); ty = Math.max(fs + 70, Sy(o.y) - lift - (row - 1) * (fs + 6)); }
        ctx.fillStyle = '#ece6d2'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(m.text, tx, ty); ctx.restore(); } }
    // (6.0.0) Earl's one line, after the sea gives him back from its jaws: written into the scene beside him like the
    // game's labels (no box, no bubble), a thin line curving up from his head to the words, which run on under them; it
    // comes a few letters at a time, as if he were thinking it, and fades
    const ctx = this.ctx;
    if (g.earlSay && g.mode === 'play' && !g.earl.inSub) { const L = g.earlSay, e = g.earl, a = clamp(L.t / 0.4, 0, 1) * clamp((5.4 - L.t) / 0.9, 0, 1);
      if (a > 0.01) { const hx = S(e.x), hy = Sy(e.y) - ppm * 0.7, n = clamp(Math.floor((L.t - 0.25) * 22), 0, L.text.length), fs = 17;
        ctx.save(); ctx.font = `500 ${fs}px ${HUDF}`; const w = ctx.measureText(L.text).width, tx = Math.max(150, hx - Math.max(36, ppm * 1.6) - w), ty = Math.max(fs + 70, hy - Math.max(48, ppm * 2)); /* (6.0.1) up and to his left, into the open water, clear of the menu column */
        ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(236,230,210,0.7)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        /* (7.5.0, owner) no line to him: the words alone, beside him */
        ctx.fillStyle = '#ece6d2'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; { const fx = (L.t - 0.25) * 22; let cx = tx; for (let j = 0; j < Math.min(L.text.length, Math.ceil(fx) + 3); j++) { const ch = L.text[j], al = clamp((fx - j) / 3, 0, 1); if (al > 0) { ctx.save(); ctx.globalAlpha *= al; ctx.fillText(ch, cx, ty); ctx.restore(); } cx += ctx.measureText(ch).width; } } /* (7.2.0) each letter fades in after the one before */
        ctx.restore(); } }
  }
  // (6.0.4) marine snow in three layers, each a fixed set of flakes made once (sizes, speeds, drift and brightness drawn
  // from a seed) that scrolls downward for ever at its own pace and with its own parallax: far (fine, faint, slow, moving
  // less with the camera), middle, and near (fewer, larger, softer, fastest, swaying). Barely there near the surface, it
  // thickens through 100-300 m and is dense below. Drawn before the light, so lamps, glow sticks and flares make it show
  // as it does on deep footage; it stops at the seabed. A few hundred small fills a frame: no full-screen layers
  // (6.5.1) a layer's offset on screen, grown each frame by how far the camera moved at this frame's scale. A layer
  // placed at (the camera's place in the sea x the scale) jumped across the screen at the smallest zoom change
  // (6.5.6) a steady flow (murk, dapple) as distance in pixels grown each frame at that frame's scale, never time x scale
  flow(key, t, ppm) { const F = this.flows || (this.flows = {}), f = F[key] || (F[key] = { t, v: 0 }); f.v += clamp(t - f.t, 0, 0.1) * ppm; f.t = t; return f.v; }
  drift(key, cam, ppm, px, py = px) {
    const D = this.drifts || (this.drifts = {}), d = D[key] || (D[key] = { x: cam.x * ppm * px, y: cam.y * ppm * py, cx: cam.x, cy: cam.y });
    const dx = cam.x - d.cx, dy = cam.y - d.cy; d.cx = cam.x; d.cy = cam.y;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) { d.x += dx * ppm * px; d.y += dy * ppm * py; } // a jump (a new dive, Rebirth) is not a drift
    return d;
  }
  drawSnow(g, S, Sy, ppm, x0, x1, y0, y1) {
    const ctx = this.ctx, t = g.time, W = this.W, H = this.H, cam = this.cam;
    if (!this.snowL) { let sd = 4242; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const mk = (n, s0, s1, a0, a1, fall, par, sway) => Array.from({ length: n }, () => ({ u: r(), v: r(), s: s0 + r() * (s1 - s0), a: a0 + r() * (a1 - a0), f: fall * (0.7 + r() * 0.6), ph: r() * 6.28, par, sway }));
      this.snowL = [mk(720, 0.9, 1.3, 0.2, 0.36, 0.22, 0.55, 0.2), mk(330, 1.2, 1.8, 0.28, 0.46, 0.42, 0.8, 0.35), mk(90, 1.6, 2.4, 0.26, 0.42, 0.75, 1.0, 0.6)]; } // (6.5.1) the near layer moves with the water, no faster // (6.1.9) many more and much smaller: fine motes, not flakes
    const depth = Math.max(0, cam.y), dens0 = clamp((depth - 120) / 140, 0, 1), dens = dens0 * dens0 * (3 - 2 * dens0); // (6.5.0) none in sunlit water. (7.6.0, owner) never abrupt: eased in from 120 m, full only at 260 m, count and brightness together
    if (dens <= 0) return;
    const surf = Sy(0), TW = W * 1.1, TH = H * 1.1;
    // the seabed's line on screen, a column every 24 px, once a frame
    const step = 24, cols = Math.ceil(W / step) + 1, floorY = this.snowFloor || (this.snowFloor = new Float32Array(cols + 1));
    for (let i = 0; i <= cols; i++) floorY[i] = Sy(g.world.floorAt(clamp(cam.x + (i * step - W / 2) / ppm, 0, WORLD_W - 1)));
    const sz = clamp(ppm / 24, 0.8, 1.1) * 0.6; /* (6.1.9) never swelling with the zoom. (7.6.0, owner) smaller: specks, not discs */
    ctx.save(); ctx.fillStyle = '#dfe6e8';
    this.snowL.forEach((L, li) => {
      const n = Math.floor(L.length * dens); if (!n) return;
      // (6.5.1) each layer's offset grows by how far the camera moved this frame, at this frame's scale: it used to be
      // the camera's place in the whole sea times the scale, so the smallest zoom (the sub's camera eases out as it
      // speeds up) threw every flake across the screen
      const st = this.snowOff || (this.snowOff = this.snowL.map(() => ({ x: 0, y: 0 })));
      if (li === 0) { const pc = this.snowCam; this.snowCamD = pc ? [cam.x - pc[0], cam.y - pc[1]] : [0, 0]; if (Math.abs(this.snowCamD[0]) > 40 || Math.abs(this.snowCamD[1]) > 40) this.snowCamD = [0, 0]; this.snowCam = [cam.x, cam.y]; }
      st[li].x += this.snowCamD[0] * ppm * L[0].par; st[li].y += this.snowCamD[1] * ppm * L[0].par;
      // (6.5.6) the fall too: it was the game's whole time x the scale, so when the zoom eased (getting in or out of the
      // sub) an hour of falling was rescaled at once and every flake swept across the screen for seconds
      if (li === 0) { const pt = this.snowT == null ? t : this.snowT, dt = clamp(t - pt, 0, 0.1); this.snowT = t; this.snowFall = (this.snowFall || 0) + dt * ppm; }
      const ox = st[li].x, oy = st[li].y, fall = this.snowFall;
      for (let i = 0; i < n; i++) { const f = L[i];
        let x = (f.u * TW - ox + Math.sin(t * 0.4 + f.ph) * f.sway * ppm) % TW; if (x < 0) x += TW; x -= (TW - W) / 2;
        let y = (f.v * TH - oy + fall * f.f) % TH; if (y < 0) y += TH; y -= (TH - H) / 2;
        if (y < surf || x < -4 || x > W + 4) continue;
        const fy = floorY[clamp(Math.round(x / step), 0, cols)]; if (y > fy) continue;
        const s2 = f.s * sz; ctx.globalAlpha = f.a * (0.35 + 0.65 * dens);
        { const w2 = Math.max(0.7, s2 * (0.8 + ((f.ph * 7) % 1) * 0.6)), h2 = Math.max(0.7, s2 * (0.7 + ((f.ph * 13) % 1) * 0.7)); ctx.fillRect(x, y, w2, h2); } // (7.6.0, owner) every flake a small uneven speck (the near layer's round discs read as big circles)
      } });
    ctx.restore();
  }

  buildLightmap(g, S, Sy, ppm, head, subLamps, glowPts, horizon, surfY) {
    // (5.3) the light is soft by nature: half the screen's resolution, and a quarter in lite mode (it is stretched
    // with smoothing over the picture, so it reads the same, at a quarter of the fill)
    { const div = this.lite ? 4 : 2, lw = Math.ceil(this.W / div), lh = Math.ceil(this.H / div); if (this.lc.width !== lw || this.lc.height !== lh) { this.lc.width = lw; this.lc.height = lh; } }
    const l = this.lctx, LW = this.lc.width, LH = this.lc.height;
    const k = LW / this.W;
    const cam = this.cam, fx = g.fx;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    // ambient: vertical gradient sampled by depth
    const dTop = cam.y - cam.h / 2, dBot = cam.y + cam.h / 2;
    const gr = l.createLinearGradient(0, 0, 0, LH);
    const dim = 1 - fx.darken;
    const storm = g.storm || 0;
    const lit = (d) => {
      let a = ambientAt(d, g.dayEff) * dim, tint = sampleTable(LIGHT_TINT, d);
      // the entity's darkness never turns the shallows fully black: it bottoms out at a grey-blue
      // storm light (the natural light of night and the deep is left alone)
      const natural = ambientAt(d, g.day.light);
      const floor = Math.min(natural, 0.36) * clamp(1 - d / 220, 0, 1);
      void floor; void storm; // (the shallow storm-light floor is gone: the entity can't reach the shallows)
      return rgbStr([255 * a * tint[0], 255 * a * tint[1], 255 * a * tint[2]]);
    };
    // underwater light everywhere (the water above depth 0 - in the wave crests - gets the
    // surface light), then the sky is painted back to full light exactly above the moving wave line
    for (let i = 0; i <= 8; i++) {
      const f = i / 8, d = lerp(dTop, dBot, f);
      gr.addColorStop(f, lit(Math.max(0, d)));
    }
    l.fillStyle = gr; l.fillRect(0, 0, LW, LH);
    const horizonY = Sy(0);
    if (horizonY > -50 && g.surfY) {
      l.fillStyle = 'rgb(255,255,255)';
      l.beginPath(); l.moveTo(-10, -10);
      for (let sx = -16; sx <= this.W + 32; sx += 16) l.lineTo(sx * k, Sy(g.surfY(cam.x + (sx - this.W / 2) / ppm)) * k);
      l.lineTo(LW + 10, -10); l.closePath(); l.fill();
    }
    // the entity swallows light around it
    const ent = g.entity;
    if (ent && g.mode !== 'menu' && ent.dist < 260 && (fx.safeK ?? 1) > 0.01) {
      // the dark rolls in like ink from the side it is on, and creeps across as it closes in
      const dx = ent.x - g.earl.x, dy = ent.y - g.earl.y, dl = Math.hypot(dx, dy) || 1;
      const ux = dx / dl, uy = dy / dl * 0.6, ul = Math.hypot(ux, uy) || 1;
      const cx = LW / 2, cy = LH / 2, half = Math.max(LW, LH) * 0.7;
      const reach = clamp((260 - ent.dist) / 230, 0, 1); // how far across the screen the ink has come
      const x0 = cx + (ux / ul) * half, y0 = cy + (uy / ul) * half, x1 = cx - (ux / ul) * half, y1 = cy - (uy / ul) * half;
      const dg = l.createLinearGradient(x0, y0, x1, y1);
      const a0 = 0.3 * reach * (fx.safeK ?? 1), front = 0.15 + reach * 0.5; /* (7.7.2, owner) dimmer, never black (was 0.5) */
      dg.addColorStop(0, `rgba(0,0,0,${a0.toFixed(3)})`);
      dg.addColorStop(Math.min(0.95, front * 0.6), `rgba(0,0,0,${(a0 * 0.75).toFixed(3)})`);
      dg.addColorStop(Math.min(0.99, front), 'rgba(0,0,0,0)');
      dg.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = dg; l.fillRect(0, 0, LW, LH);
      // far off-screen it still swallows the light where it is; close by it is left to show
      // as a shape blacker than the water
      if (ent.dist > 70) {
        const ex = S(ent.x) * k, ey = Sy(ent.y) * k, r = 40 * ppm * k;
        const eg = l.createRadialGradient(ex, ey, 0, ex, ey, r);
        eg.addColorStop(0, 'rgba(0,0,0,0.85)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = eg; l.beginPath(); l.arc(ex, ey, r, 0, TAU); l.fill();
      }
    }
    l.globalCompositeOperation = 'lighter';
    const visR = this.visR = []; // every pool of light this frame (screen space), for next frame's darkness test
    const radial = (x, y, r, col, a) => {
      if (a > 0.02) visR.push(x, y, r);
      const gg = l.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(1, rgbStr(col, 0));
      l.fillStyle = gg; l.beginPath(); l.arc(x * k, y * k, r * k, 0, TAU); l.fill();
    };
    // A lamp in seawater: three nested cones give a soft edge instead of a hard wedge, and the
    // light falls off fast and turns blue-green with distance as the water absorbs the red.
    const lamps = this.lamps = []; // every lamp this frame, so living lights can tell how lit they are
    const cone = (x, y, ang, range, spread, col, a) => {
      lamps.push({ x, y, ang, range, spread, a });
      const far = mixRgb(col, WATER_LIT, 0.65);
      // one gradient, fanned out in many thin layers from narrow to wide: the light fades smoothly
      // and widely toward the edges (diffused), with no visible wedge edges or streaks
      // (2.9.2: back to the 2.5.3 beams, as the player preferred them)
      const gg = l.createRadialGradient(x * k, y * k, 0, x * k, y * k, range * k);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(0.12, rgbStr(col, a * 0.85));
      gg.addColorStop(0.4, rgbStr(far, a * 0.4)); gg.addColorStop(0.75, rgbStr(WATER_LIT, a * 0.1));
      gg.addColorStop(1, rgbStr(WATER_LIT, 0));
      l.fillStyle = gg;
      for (let i = 0; i < FEATHER; i++) {
        const sm = 0.3 + 1.7 * (i / (FEATHER - 1));
        l.globalAlpha = 1 / FEATHER;
        l.beginPath(); l.moveTo(x * k, y * k);
        l.arc(x * k, y * k, range * k, ang - spread * sm, ang + spread * sm); l.closePath(); l.fill();
      }
      l.globalAlpha = 1;
    };
    const e = g.earl;
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const flick = (fx.torchShift > 0.6 ? (Math.random() < 0.06 ? 0.3 : 1) : 1) * fx.lightPulse * (1 - 0.25 * (g.entDark || 0)) * ((g.entDark || 0) > 0.15 && Math.random() < 0.1 * g.entDark ? 0.45 : 1); // (5.16.0) weaker and flickering as its dark comes
    if (head && e.lampOn) {
      const ang = this.lampAngle(g, e, head);
      cone(head.x, head.y, ang, 17 * ppm * (e.nightSet ? 1.5 : 1), 0.32 * (e.nightSet ? 1.2 : 1), beamCol, 0.95 * TORCH * flick); // (the Night Shift set: half as far again)
      radial(head.x, head.y, 3.2 * ppm, beamCol, 0.3 * TORCH * flick); lamps.push({ x: head.x, y: head.y, r: 3.2 * ppm, a: 0.3 * TORCH * flick });
    }
    // (5.17.1) each dropped glow stick lights the water round itself, where it was let go (warm amber, about 8 m across);
    // the last 8 s it dies down, and it fades with the thing's dark like every light but his lamp
    for (const L of g.glows || []) { const gx = S(L.x), gy = Sy(L.y), gm = (L.adv ? 33 : 17) * ppm; if (gx < -gm || gx > this.W + gm || gy < -gm || gy > this.H + gm) continue;
      const fade = Math.min(1, L.t / 8) * (g.lightFade ?? 1), fl = 0.94 + 0.06 * Math.sin(g.time * 7.3 + L.ph) * Math.sin(g.time * 2.1), gr = (L.adv ? 32 : 16) * ppm, a = (L.adv ? 0.62 : 0.5) * fade * fl; // (6.0.1) the advanced stick twice the reach
      // (5.17.1) an even pool 16 m round: nearly flat out to half way, then falling away, with only a small bright core
      if (a > 0.02) { visR.push(gx, gy, gr); const gg = l.createRadialGradient(gx * k, gy * k, 0, gx * k, gy * k, gr * k); const c = L.adv ? [236, 228, 208] : [255, 182, 100];
        gg.addColorStop(0, rgbStr(c, a)); gg.addColorStop(0.5, rgbStr(c, a * 0.8)); gg.addColorStop(0.8, rgbStr(c, a * 0.3)); gg.addColorStop(1, rgbStr(c, 0)); l.fillStyle = gg; l.beginPath(); l.arc(gx * k, gy * k, gr * k, 0, TAU); l.fill(); }
      radial(gx, gy, 1.6 * ppm, L.adv ? [248, 244, 232] : [255, 205, 140], 0.35 * fade * fl); lamps.push({ x: gx, y: gy, r: gr, a: 0.5 * fade }); }
    // (5.16.0) a Flare: 30 m round him (or the sub), as bright near him as 100 m deep, still at the 200 m level 20 m out, gone by
    // 30 m; Flare+ brighter (as 70 m); Lighthouse as if he were at 20 m. It fades with the thing's dark (g.lightFade)
    if (g.abilLight > 0 && ((g.lightFade ?? 1) * (g.abilOutK ?? 1)) > 0.01) {
      // (6.0.2) each tier a visible step: Flare 28 m (near him about as bright as 100 m deep), Flare+ 45 m (as 70 m), the
      // Lighthouse 80 m, the whole screen, very bright (as 20 m water) and holding its strength far out, but still a light in
      // the dark sea: white-amber, the far corners left dimmer, no daylight blue
      const L = g.abilLight, lh = L >= 2, a0 = (L >= 2 ? 0.97 : L >= 1.5 ? 0.84 : 0.62) * ((g.lightFade ?? 1) * (g.abilOutK ?? 1)), col = lh ? [255, 246, 230] : [255, 226, 196];
      const fxp = e.inSub ? S(g.sub.x) : S(e.x), fyp = e.inSub ? Sy(g.sub.y) : Sy(e.y), R = (L >= 3 ? 110 : lh ? 80 : L >= 1.5 ? 45 : 28) * ppm; // (7.4.15) Pharos 110 m
      const gg = l.createRadialGradient(fxp * k, fyp * k, 0, fxp * k, fyp * k, R * k);
      if (lh) { gg.addColorStop(0, rgbStr(col, a0)); gg.addColorStop(0.35, rgbStr(col, a0 * 0.97)); gg.addColorStop(0.7, rgbStr(col, a0 * 0.75)); gg.addColorStop(1, rgbStr(col, 0)); }
      else if (L >= 1.5) { gg.addColorStop(0, rgbStr(col, a0)); gg.addColorStop(0.3, rgbStr(col, a0 * 0.95)); gg.addColorStop(0.72, rgbStr(col, a0 * 0.6)); gg.addColorStop(1, rgbStr(col, 0)); }
      else { gg.addColorStop(0, rgbStr(col, a0)); gg.addColorStop(0.22, rgbStr(col, a0 * 0.9)); gg.addColorStop(0.6, rgbStr(col, a0 * 0.45)); gg.addColorStop(1, rgbStr(col, 0)); } // the plain Flare falls away well before the screen's edge
      l.fillStyle = gg; l.beginPath(); l.arc(fxp * k, fyp * k, R * k, 0, TAU); l.fill(); visR.push(fxp, fyp, R); lamps.push({ x: fxp, y: fyp, r: R, a: a0 });
      if (lh) { // (7.4.9, owner) the Lighthouse pulses: every few seconds its light swells to half again as bright and settles back
        const pul = Math.pow(0.5 + 0.5 * Math.sin(g.time * 1.6), 2), op = l.globalCompositeOperation; l.globalCompositeOperation = 'lighter';
        const pg = l.createRadialGradient(fxp * k, fyp * k, 0, fxp * k, fyp * k, R * 0.8 * k); pg.addColorStop(0, rgbStr(col, 0.5 * a0 * pul)); pg.addColorStop(0.6, rgbStr(col, 0.3 * a0 * pul)); pg.addColorStop(1, rgbStr(col, 0));
        l.fillStyle = pg; l.beginPath(); l.arc(fxp * k, fyp * k, R * 0.8 * k, 0, TAU); l.fill(); l.globalCompositeOperation = op; }
    }
    // (7.3.0) Riptide's light: wide and soft like a Flare (owner: no small round glow), a warm bone light 40 m round him
    if (g.abil && g.abil.activeT > 0 && g.abil.def && g.abil.def.speed && (g.abil.def.tier === 'legendary' || g.abil.def.tier === 'mythical') && (g.lightFade ?? 1) > 0.01) {
      const m0 = e.inSub ? g.sub : e, rx = S(m0.x), ry = Sy(m0.y), R = 40 * ppm, a0 = 0.7 * (g.lightFade ?? 1) * Math.min(1, (g.time - (g.abil.at ?? 0)) / 0.6) * Math.min(1, g.abil.activeT / 1.2), col = [250, 232, 204];
      const gg = l.createRadialGradient(rx * k, ry * k, 0, rx * k, ry * k, R * k); gg.addColorStop(0, rgbStr(col, a0)); gg.addColorStop(0.25, rgbStr(col, a0 * 0.9)); gg.addColorStop(0.65, rgbStr(col, a0 * 0.45)); gg.addColorStop(1, rgbStr(col, 0));
      l.fillStyle = gg; l.beginPath(); l.arc(rx * k, ry * k, R * k, 0, TAU); l.fill(); visR.push(rx, ry, R); lamps.push({ x: rx, y: ry, r: R, a: a0 });
    }
    // (7.4.15) Maelstrom's wake: the water he passes stays lit a little while, a trail of warm light fading behind him
    { const W0 = this.mythWake || (this.mythWake = []), A0 = g.abil && g.abil.activeT > 0 && g.abil.def && g.abil.def.wake, m0 = e.inSub ? g.sub : e;
      if (A0 && (!W0.length || Math.hypot(W0[W0.length - 1].x - m0.x, W0[W0.length - 1].y - m0.y) > 2.2)) W0.push({ x: m0.x, y: m0.y, t: g.time });
      while (W0.length && (g.time - W0[0].t > 2.8 || g.time < W0[0].t)) W0.shift();
      if (W0.length && (g.lightFade ?? 1) > 0.01) { const op = l.globalCompositeOperation; l.globalCompositeOperation = 'lighter';
        for (const w of W0) { const age = (g.time - w.t) / 2.8, wx = S(w.x), wy = Sy(w.y), R = (9 + 6 * age) * ppm, a = 0.34 * (1 - age) * (g.lightFade ?? 1);
          const wg = l.createRadialGradient(wx * k, wy * k, 0, wx * k, wy * k, R * k); wg.addColorStop(0, rgbStr([255, 206, 170], a)); wg.addColorStop(1, rgbStr([255, 196, 160], 0));
          l.fillStyle = wg; l.beginPath(); l.arc(wx * k, wy * k, R * k, 0, TAU); l.fill(); visR.push(wx, wy, R); }
        l.globalCompositeOperation = op; } }
    // (7.4.15) Whalesong: light washing out across the whole screen from him as the call goes out, then gone
    if (g.songFx && (g.lightFade ?? 1) > 0.01) { const T = g.songFx.t, m0 = e.inSub ? g.sub : e, wx = S(m0.x) * k, wy = Sy(m0.y) * k, Rw = Math.hypot(this.W, this.H) * k * Math.min(1.2, 0.15 + T / 2.4), a = 0.42 * Math.max(0, 1 - T / 4) * (g.lightFade ?? 1);
      const op = l.globalCompositeOperation; l.globalCompositeOperation = 'lighter';
      const wg = l.createRadialGradient(wx, wy, Rw * 0.55, wx, wy, Rw); wg.addColorStop(0, rgbStr([210, 226, 236], 0)); wg.addColorStop(0.75, rgbStr([214, 230, 240], a)); wg.addColorStop(1, rgbStr([214, 230, 240], 0));
      l.fillStyle = wg; l.fillRect(0, 0, this.W * k, this.H * k);
      const cg = l.createRadialGradient(wx, wy, 0, wx, wy, Rw * 0.6); cg.addColorStop(0, rgbStr([214, 230, 240], a * 0.5)); cg.addColorStop(1, rgbStr([214, 230, 240], 0)); l.fillStyle = cg; l.fillRect(0, 0, this.W * k, this.H * k);
      l.globalCompositeOperation = op; visR.push(wx / k, wy / k, Rw / k); }
    // (6.0.9) Bioluminescence: his gear glows like a glow stick he carries, a soft even pool 16 m round him in a muted deep-sea
    // blue (not cyan); always on, the thing ignores it, and it goes out with the others when its red comes
    if (e.biolum && !e.inSub && (g.lightFade ?? 1) > 0.01) { const bx = S(e.x), by = Sy(e.y), gr = 16 * ppm, a = 0.42 * (g.lightFade ?? 1) * (0.94 + 0.06 * Math.sin(g.time * 1.3)), c = [128, 156, 204];
      visR.push(bx, by, gr); const gg = l.createRadialGradient(bx * k, by * k, 0, bx * k, by * k, gr * k); gg.addColorStop(0, rgbStr(c, a)); gg.addColorStop(0.5, rgbStr(c, a * 0.8)); gg.addColorStop(0.8, rgbStr(c, a * 0.3)); gg.addColorStop(1, rgbStr(c, 0));
      l.fillStyle = gg; l.beginPath(); l.arc(bx * k, by * k, gr * k, 0, TAU); l.fill(); lamps.push({ x: bx, y: by, r: gr, a }); }
    if (g.abilLight >= 2 && ((g.lightFade ?? 1) * (g.abilOutK ?? 1)) > 0.01 && g.mode === 'play') { // (7.4.9, owner) the Lighthouse's beams: two broad shafts of light turning slowly round him, lighting the water they cross (in the light map, so they light what is there)
      const e2 = g.earl, bx = (e2.inSub ? S(g.sub.x) : S(e2.x)) * k, by = (e2.inSub ? Sy(g.sub.y) : Sy(e2.y)) * k, fadeL = (g.lightFade ?? 1) * (g.abilOutK ?? 1) * (g.beamK ?? 1), pul = 0.6 + 0.4 * lerp(0.35, Math.pow(0.5 + 0.5 * Math.sin(g.time * 1.6), 2), g.pulseK ?? 1), rot = g.time * 0.45, Rb = Math.hypot(this.W, this.H) * k;
      const op = l.globalCompositeOperation; l.globalCompositeOperation = 'lighter';
      for (const off of (g.abilLight >= 3 ? [0, TAU / 3, TAU * 2 / 3] : [0, Math.PI])) { const a = rot + off; // (7.4.15) Pharos: three beams
        const gb = l.createRadialGradient(bx, by, 0, bx, by, Rb); gb.addColorStop(0, rgbStr([255, 240, 214], 0.34 * pul * fadeL)); gb.addColorStop(0.5, rgbStr([255, 236, 206], 0.2 * pul * fadeL)); gb.addColorStop(1, rgbStr([255, 236, 206], 0));
        l.fillStyle = gb; for (const w of [0.32, 0.14]) { l.beginPath(); l.moveTo(bx, by); l.arc(bx, by, Rb, a - w, a + w); l.closePath(); l.fill(); } } // a broad beam and its brighter core
      l.globalCompositeOperation = op; }
    if (g.legend) { // the legendary moment: a pale light comes up on it, and fades
      const c = g.legend.c, kf = Math.min(1, g.legend.t / 1.5) * Math.min(1, (8 - g.legend.t) / 2.5);
      // (4.8.2) one even, pale light: as soft in the middle as at its edge (no hot spot on the fish), fading only at the rim
      const R0 = Math.max(7, c.len * 4) * ppm, x0 = S(c.x), y0 = Sy(c.y), A0 = 0.42 * kf;
      visR.push(x0, y0, R0); const lg = l.createRadialGradient(x0 * k, y0 * k, 0, x0 * k, y0 * k, R0 * k);
      lg.addColorStop(0, rgbStr([215, 232, 240], A0)); lg.addColorStop(0.55, rgbStr([215, 232, 240], A0 * 0.92)); lg.addColorStop(1, rgbStr([215, 232, 240], 0));
      l.fillStyle = lg; l.beginPath(); l.arc(x0 * k, y0 * k, R0 * k, 0, TAU); l.fill(); lamps.push({ x: x0, y: y0, r: R0, a: A0 });
    }
    this.netLamp = null;
    if (subLamps) {
      const sub = g.sub;
      const sx = S(sub.x), sy = Sy(sub.y);
      const cy = Math.cos(sub.yaw), sxs = (cy >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy));
      const vis = Math.pow(Math.abs(cy), 0.7); // beams swing towards/away from us while turning
      const ang = sxs > 0 ? sub.tilt : Math.PI - sub.tilt;
      const rt = sub.tilt * Math.sign(sxs), cr = Math.cos(rt), sr = Math.sin(rt), lp = (p) => { const px = p[0] * sxs, py = p[1]; return [sx + px * cr - py * sr, sy + px * sr + py * cr]; }; // (7.7.0, owner) turned with the hull as it is drawn (rotate, then mirror): unturned, the lamp slid about on the bow as she pitched
      const [ax, ay] = lp(subLamps.lampA), [bx, by] = lp(subLamps.lampB);
      const lc = mixRgb([235, 238, 245], BEAM_DREAD, fx.torchShift);
      cone(ax, ay, ang, 32 * ppm, 0.34, lc, 1.15 * flick * vis);
      cone(ax, ay, ang, 15 * ppm, 0.95, lc, 0.4 * flick * vis); // diffuse flood around the main beam
      cone(bx, by, ang + 0.35 * Math.sign(sxs), 18 * ppm, 0.45, lc, 0.75 * flick * vis);
      // light spilling around the hull: a soft neutral fill, the warm portholes, a dim stern lamp
      radial(sx, sy, 14 * ppm, [140, 165, 175], 0.2 * fx.lightPulse); lamps.push({ x: sx, y: sy, r: 14 * ppm, a: 0.2 * fx.lightPulse });
      radial(sx + 0.5 * sxs * ppm, sy + 0.9 * ppm, 5 * ppm, [255, 190, 120], 0.4 * fx.lightPulse);
      radial(sx - 4.8 * sxs * ppm, sy - 0.4 * ppm, 7 * ppm, [220, 160, 110], 0.15 * fx.lightPulse);
      if (vis < 0.6) radial(ax, ay, 6 * ppm, lc, (0.6 - vis) * 1.2 * flick); // the lamps face us mid-turn
      // the net light (2.5.1): a work lamp low on her stern, aimed back down the trawl, lit only while the
      // net is out (and the lights are on)
      const tn = g.subNet;
      if (tn && tn.phase !== 'torn') {
        const nx = sx - 4.6 * sxs * ppm, ny = sy + 0.7 * ppm, mx3 = S(tn.mx), my3 = Sy(tn.my);
        const na = Math.atan2(my3 - ny, mx3 - nx), nd = Math.hypot(mx3 - nx, my3 - ny);
        cone(nx, ny, na, nd + 9 * ppm, 0.42, [235, 232, 215], 0.85 * flick);
        radial(mx3, my3, 6 * ppm, [235, 232, 215], 0.35 * flick); lamps.push({ x: mx3, y: my3, r: 6 * ppm, a: 0.35 * flick });
        this.netLamp = [nx, ny, na, nd + 9 * ppm];
      } else this.netLamp = null;
    }
    // (3.0.0) the research station: its windows and dome, cool and white, and the docking light
    const Sn = g.world.station;
    if (Sn) { const sx2 = S(Sn.x), sy2 = Sy(Sn.y - STATION_TOP - 2);
      if (sx2 > -800 && sx2 < this.W + 800 && sy2 > -800 && sy2 < this.H + 800) {
        radial(S(Sn.x - 5.5), sy2, 8 * ppm, [210, 235, 232], 0.3); radial(S(Sn.x + 4.6), sy2, 7 * ppm, [210, 235, 232], 0.28); radial(sx2, sy2, 5 * ppm, [170, 220, 215], 0.3);
        radial(S(Sn.x + 10), Sy(Sn.y - STATION_TOP - 3.2), 4 * ppm, [255, 200, 110], 0.5); lamps.push({ x: sx2, y: sy2, r: 10 * ppm, a: 0.5 });
      } }
    // (2.7.0) Dave's hut: warm portholes, the lamp over the hatch, the sign's lamp, the mast's red beacon
    const Dh = g.world.dave;
    if (Dh) { const hx = S(Dh.x), hy = Sy(Dh.y - 3.3);
      if (hx > -600 && hx < this.W + 600 && hy > -600 && hy < this.H + 600) {
        radial(S(Dh.x - 2), hy, 7 * ppm, [255, 200, 120], 0.75); radial(S(Dh.x + 0.8), hy, 7 * ppm, [255, 200, 120], 0.75); lamps.push({ x: S(Dh.x - 0.6), y: hy, r: 8 * ppm, a: 0.5 });
        radial(S(Dh.x + 5.35), Sy(Dh.y - 4.5), 5 * ppm, [255, 214, 140], 0.6);
        radial(S(Dh.x + 0.7), Sy(Dh.y - 8.5), 4.5 * ppm, [255, 230, 180], 0.45);
        if ((g.time || 0) % 2.4 < 0.25) radial(S(Dh.x - 3.2), Sy(Dh.y - 9.2), 4 * ppm, [255, 70, 50], 0.6);
      } }
    // (5.15.5) each landmark lights its own water: within about 50 m the dark lifts to roughly the 350 m level (Dave's
    // warm, the station cool white), fading smoothly to nothing at the edge so it can be seen from further off; the old
    // one's place is lit less, nearer the 600 m level, and colder, so it never feels welcoming
    const pool = (wx, wy, R, col, a) => { const x = S(wx), y = Sy(wy), r = R * ppm; if (x < -r || x > this.W + r || y < -r || y > this.H + r) return;
      const gg = l.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k); gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(0.4, rgbStr(col, a * 0.8)); gg.addColorStop(0.75, rgbStr(col, a * 0.32)); gg.addColorStop(1, rgbStr(col, 0));
      l.fillStyle = gg; l.beginPath(); l.arc(x * k, y * k, r * k, 0, TAU); l.fill(); visR.push(x, y, r * 0.6); };
    if (Dh) pool(Dh.x, Dh.y - 4, 50, [255, 214, 165], 0.42);
    if (Sn) pool(Sn.x, Sn.y - STATION_TOP, 50, [205, 228, 226], 0.42);
    pool(CAVE.x + 14, CAVE.y, 50, [150, 178, 190], 0.2);
    for (const lt of g.world.lanterns) {
      const x = S(lt.x), y = Sy(lt.y);
      if (x < -400 || x > this.W + 400 || y < -400 || y > this.H + 400) continue;
      const r = (6 + 7 * lt.charge + lt.active * 3) * ppm;
      radial(x, y, r, hsl(lt.hue, 0.6, 0.6), 0.75 * (0.4 + 0.6 * lt.charge));
    }
    for (const p of g.world.pickups) {
      if (p.taken) continue;
      if (p.type === 'sapphire') {
        const x = S(p.x), y = Sy(p.y);
        if (x < -100 || x > this.W + 100 || y < -100 || y > this.H + 100) continue;
        radial(x, y, (1.6 * (1 + 0.8 * (e.prospector || 0))) * ppm, [80, 120, 255], 0.5 + 0.1 * (e.prospector || 0)); // (Prospector: sapphires shine from farther off)
      }
    }
    if (this.escaW) { radial(S(this.escaW.x), Sy(this.escaW.y), 11 * ppm, [190, 216, 200], 0.55 + 0.08 * Math.sin(g.time * 1.7)); radial(S(this.escaW.x + 4), Sy(this.escaW.y + 4), 22 * ppm, [150, 180, 170], 0.22); /* (6.1.4) softer, bone-green, not cyan */ radial(S(TABLE.x0 + 10), Sy(TABLE.y - 3), 18 * ppm, [140, 200, 225], 0.45); lamps.push({ x: S(TABLE.x0 + 10), y: Sy(TABLE.y - 3), r: 18 * ppm, a: 0.45 }); } // (3.0.0) and further: the sea round her, and her table
    for (const v of g.world.vents) {
      const x = S(v.x), y = Sy(v.y - v.h);
      if (x < -500 || x > this.W + 500 || y < -500 || y > this.H + 500) continue;
      radial(x, y, 9 * ppm, [255, 120, 60], 0.22 + 0.06 * Math.sin(g.time * 3 + v.phase));
    }
    for (const p of glowPts) {
      const [x, y, col, r, gk = 1, core] = p;
      if (core === undefined) { radial(x, y, gk < 1 ? r * 2.5 : Math.max(r * 2.5, ppm * 0.8), hexToRgb(col), 0.7 * fx.bioPulse * gk); continue; }
      // a living light washes out under a lamp: the body's own colours and detail show instead
      const dim = p[6] = 1 - 0.8 * this.litAt(x, y);
      const a = 0.4 * BIO_BRIGHT * fx.bioPulse * gk * dim;
      if (a < 0.01) continue;
      if (r * 1.8 * k < 3) { l.fillStyle = rgbStr(hexToRgb(col), a * 0.4); l.beginPath(); l.arc(x * k, y * k, Math.max(1, r * 1.8 * k), 0, TAU); l.fill(); }
      else radial(x, y, r * 1.8, hexToRgb(col), a); // just enough to hint at the body around it
    }
    // caustic dapples near the surface by day
    if (g.dayEff > 0.3 && cam.y < 40) {
      const a = 0.12 * g.dayEff;
      // one dapple per 4 m of seafloor, keyed to its world cell so it never jumps as the camera moves
      const k0 = Math.floor((cam.x - cam.w / 2) / 4) - 2, k1 = Math.ceil((cam.x + cam.w / 2) / 4) + 2;
      for (let k = k0; k <= k1; k++) {
        const wx = k * 4 + Math.sin(g.time * 0.7 + k * 1.3) * 1.5;
        const fy = g.world.floorAt(wx);
        if (fy > 40) continue;
        radial(S(wx), Sy(fy) - ppm * 0.3, ppm * 1.6, [255, 255, 240], a * (0.5 + 0.5 * Math.sin(g.time * 2 + k * 1.7)));
      }
    }
  }

  // a soft round glow of one colour (kind 0: a halo fading out; kind 1: a glare, white at the heart)
  glowSprite(col, kind) {
    const q = (v) => Math.round(v / 8) * 8, key = `${kind}:${q(col[0])},${q(col[1])},${q(col[2])}`;
    const m = this.glowSprites || (this.glowSprites = new Map());
    let c = m.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gg = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      const cc = [q(col[0]), q(col[1]), q(col[2])];
      if (kind) { gg.addColorStop(0, rgbStr([255, 255, 255], 1)); gg.addColorStop(0.25, rgbStr(cc, 0.5)); gg.addColorStop(1, rgbStr(cc, 0)); }
      else { gg.addColorStop(0, rgbStr(cc, 1)); gg.addColorStop(1, rgbStr(cc, 0)); }
      x.fillStyle = gg; x.fillRect(0, 0, 64, 64);
      m.set(key, c);
      if (m.size > 200) m.delete(m.keys().next().value);
    }
    return c;
  }
  // a beam's haze, pointing along +x from the middle of a 512 px square (range 256 px)
  coneSprite(col, spread) {
    const q = (v) => Math.round(v / 12) * 12, key = `${spread}:${q(col[0])},${q(col[1])},${q(col[2])}`;
    const m = this.coneSprites || (this.coneSprites = new Map());
    let c = m.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 512;
      const x = c.getContext('2d'), cc = [q(col[0]), q(col[1]), q(col[2])], far = mixRgb(cc, WATER_LIT, 0.7);
      const gg = x.createRadialGradient(256, 256, 0, 256, 256, 256);
      gg.addColorStop(0, rgbStr(cc, 1)); gg.addColorStop(0.3, rgbStr(far, 0.45)); gg.addColorStop(1, rgbStr(WATER_LIT, 0));
      x.fillStyle = gg;
      const n = FEATHER;
      for (let i = 0; i < n; i++) {
        const sm = 0.3 + 1.6 * (i / (n - 1));
        x.globalAlpha = 1 / n;
        x.beginPath(); x.moveTo(256, 256); x.arc(256, 256, 256, -spread * sm, spread * sm); x.closePath(); x.fill();
      }
      m.set(key, c);
      if (m.size > 60) m.delete(m.keys().next().value);
    }
    return c;
  }

  drawRays(ctx, S, Sy, ppm, cam, t, rayStrength) {
    // Each ray belongs to a fixed 9 m cell of the surface; its sway, width and brightness come
    // from that cell's index, so rays slide smoothly past instead of snapping when the camera moves.
    // Cells start well left of the screen because the rays slant to the right as they go down.
    const k0 = Math.floor((cam.x - cam.w / 2 - 16) / 9), k1 = Math.ceil((cam.x + cam.w / 2 + 4) / 9);
    for (let k = k0; k <= k1; k++) {
      const h = ((k * 7919) % 3 + 3) % 3;
      const wx = k * 9 + Math.sin(t * 0.13 + k * 2.1) * 3;
      const top = Sy(0), w = ppm * (1.5 + h), len = ppm * 70;
      const sx = S(wx);
      const a = rayStrength * (0.04 + 0.03 * Math.sin(t * 0.3 + k * 1.3)) * (0.5 + 0.5 * ((k * 4271) % 5) / 4); // (7.0.0) uneven: some faint, some clearer
      for (const [wm, am] of [[2.2, 0.3], [1.4, 0.35], [0.7, 0.35]]) {
        const gg = ctx.createLinearGradient(0, top, 0, top + len);
        gg.addColorStop(0, `rgba(226,238,226,${(a * am).toFixed(3)})`); gg.addColorStop(0.35, `rgba(226,238,226,${(a * am * 0.45).toFixed(3)})`); gg.addColorStop(1, 'rgba(226,238,226,0)'); // brightest just under the surface, gone well before 70 m
        ctx.fillStyle = gg;
        const ww = w * wm;
        ctx.beginPath(); ctx.moveTo(sx - ww, top); ctx.lineTo(sx + ww, top); ctx.lineTo(sx + ww * 2 + w + len * 0.18, top + len); ctx.lineTo(sx - ww + len * 0.18, top + len); ctx.closePath(); ctx.fill();
      }
    }
  }

  // (7.0.2) the deep readable without lifting the dark. Drawn after the light, added on (lighter):
  // - a rim of light along the seabed's and the rocks' edges: barely there on its own below about 200 m, picked up
  //   strongly wherever a light falls (the lamp, the sub's lights, glow sticks, flares: litAt);
  // - silt on the seabed where a light falls: fine grains fixed to the ground, in bone and mud;
  // - the deep places giving off their own dim light: the whale fall's bones, the brine pool's mirror, the seep's
  //   bacterial mats (the vents already glow), so each reads as a shape from a distance
  drawDeepRim(g, S, Sy, ppm) {
    const ctx = this.ctx, W = this.W, H = this.H, cam = this.cam, Wd = g.world, t = g.time;
    if (cam.y + cam.h / 2 < 150) return;
    const deep = (y) => clamp((y - 180) / 320, 0, 1), hsh = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const seg = (x0, y0, x1, y1, a, w) => { ctx.strokeStyle = `rgba(206,206,186,${a.toFixed(3)})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
    // the seabed's edge, and silt where it is lit
    const step = Math.max(5, W / 150); let pw = null, py = null, psx = null;
    const stepW = Math.pow(2, Math.round(Math.log2(Math.max(0.0625, step / ppm)))), w0 = Math.floor((cam.x - (W / 2 + step) / ppm) / stepW) * stepW; // (7.1.1) world-fixed samples: no shimmer
    for (let wx = w0; S(wx) <= W + step; wx += stepW) {
      const sx = S(wx), fy = Wd.floorAt(wx), sy = Sy(fy);
      if (pw !== null && (sy > -30 || py > -30) && (sy < H + 30 || py < H + 30)) {
        const d = deep(fy);
        if (d > 0) { const lit = this.litAt(wx, fy - 0.6), a = d * (0.05 + 0.55 * lit);
          if (a > 0.008) { seg(psx, py, sx, sy, a * 0.22, Math.max(3, ppm * 0.3)); seg(psx, py, sx, sy, a, Math.max(1, ppm * 0.05)); }
          if (lit > 0.04) for (let c = Math.ceil(pw * 6); c <= Math.floor(wx * 6); c++) { const h1 = hsh(c), h2 = hsh(c + 0.37), h3 = hsh(c + 0.71), gx = c / 6 + h1 * 0.16, gy = Wd.floorAt(gx) + 0.04 + h2 * h2 * 0.9;
            ctx.fillStyle = h3 < 0.65 ? `rgba(196,186,160,${(lit * d * (0.25 + 0.35 * h3)).toFixed(3)})` : `rgba(120,108,86,${(lit * d * 0.35).toFixed(3)})`; ctx.beginPath(); ctx.arc(S(gx), Sy(gy), Math.max(0.6, ppm * (0.015 + 0.025 * h1)), 0, TAU); ctx.fill(); } }
      }
      pw = wx; py = sy; psx = sx;
    }
    // the rocks' edges
    const x0 = cam.x - cam.w / 2 - 4, x1 = cam.x + cam.w / 2 + 4, y0 = cam.y - cam.h / 2 - 4, y1 = cam.y + cam.h / 2 + 4;
    for (const rk of Wd.rocks) { if (rk.kind === 'oldone' || rk.hidden || rk.x1 < x0 || rk.x0 > x1 || rk.y1 < y0 || rk.y0 > y1) continue;
      const d = deep((rk.y0 + rk.y1) / 2); if (d <= 0) continue; const P0 = rk.poly;
      for (let i = 0; i < P0.length; i++) { const A = P0[i], B = P0[(i + 1) % P0.length], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, lit = this.litAt(mx, my), up = A.x !== B.x ? clamp(1 - Math.abs((B.y - A.y) / (B.x - A.x)) * 0.5, 0.3, 1) : 0.3, a = d * up * (0.035 + 0.5 * lit);
        if (a > 0.008) { seg(S(A.x), Sy(A.y), S(B.x), Sy(B.y), a * 0.2, Math.max(3, ppm * 0.25)); seg(S(A.x), Sy(A.y), S(B.x), Sy(B.y), a, Math.max(1, ppm * 0.045)); } } }
    const inV = (x, y, r) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
    // the whale fall: its bones give back a pale glow (the same drawing, faint and added on)
    const F = Wd.whaleFall;
    if (F && inV(F.x, F.y, 50)) { ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 0.4); drawWhaleFall(ctx, S, Sy, ppm, F, t, true); ctx.globalAlpha = 1; }
    // the brine pool: its still mirror catches what little light there is
    const B = Wd.brine;
    if (B && inV((B.x0 + B.x1) / 2, B.y, 40)) { ctx.strokeStyle = 'rgba(176,196,206,0.22)'; ctx.lineWidth = Math.max(1, ppm * 0.07); ctx.beginPath();
      for (let x = B.x0 - 1; x <= B.x1 + 1; x += 0.5) { const y = Sy(B.y) + Math.sin(x * 0.9 + t * 0.6) * ppm * 0.04; x === B.x0 - 1 ? ctx.moveTo(S(x), y) : ctx.lineTo(S(x), y); } ctx.stroke();
      const hz = ctx.createLinearGradient(0, Sy(B.y - 1.4), 0, Sy(B.y)); hz.addColorStop(0, 'rgba(150,172,190,0)'); hz.addColorStop(1, `rgba(150,172,190,${(0.07 + 0.02 * Math.sin(t * 0.7)).toFixed(3)})`); ctx.fillStyle = hz; ctx.fillRect(S(B.x0), Sy(B.y - 1.4), (B.x1 - B.x0) * ppm, ppm * 1.4); }
    // the seep: its white bacterial mats faintly luminous on the mud
    const Pp = Wd.seep;
    if (Pp && inV(Pp.x, Pp.y, 30)) for (let k = 0; k < 7; k++) { const x = Pp.x + (k - 3) * 2.2 + Math.sin(k * 3.1) * 0.8, y = Sy(Wd.floorAt(x)) - ppm * 0.05, gg = ctx.createRadialGradient(S(x), y, 0, S(x), y, ppm * 1.6);
      gg.addColorStop(0, `rgba(220,222,206,${(0.1 + 0.03 * Math.sin(t * 0.5 + k)).toFixed(3)})`); gg.addColorStop(1, 'rgba(220,222,206,0)'); ctx.fillStyle = gg; ctx.save(); ctx.translate(S(x), y); ctx.scale(1, 0.25); ctx.translate(-S(x), -y); ctx.fillRect(S(x) - ppm * 1.6, y - ppm * 1.6, ppm * 3.2, ppm * 3.2); ctx.restore(); }
    ctx.restore();
  }

  drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff) {
    const ctx = this.ctx, cam = this.cam, fx = g.fx, t = g.time;
    // (5.16.0) Dash: while it waits the screen greys (the world slowed), and after it the water shows where he went: a pale
    // streak (Dash), with swirls curling off it and a trail of bubbles (Dash+), the water bent round the path and motes
    // drifting in it (Undertow)
    if (g.dashAim || g.siphonAim) { ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(36,40,40,0.38)'; ctx.fillRect(0, 0, this.W, this.H); ctx.restore(); }
    // (7.6.8, owner) no tube, no rings, no round glows: the water torn along his path. Tapered slivers of foam lie along
    // it, brightest where he arrived, spreading and fading; from Dash+ small curls of churned water peel off its sides,
    // tapering as they turn; Undertow leaves sharp specks swirling in its wake (the bubbles are the world's own)
    if (g.dashFx) { const D = g.dashFx, a = Math.max(0, 1 - D.t / 1.2), x0 = S(D.x0), y0 = Sy(D.y0), x1 = S(D.x1), y1 = Sy(D.y1), Lp = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / Lp, uy = (y1 - y0) / Lp, nx = -uy, ny = ux;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const n = 10 + 6 * D.tier, spread = ppm * (0.25 + 0.2 * D.tier) * (1 + D.t * 1.5);
      for (let i = 0; i < n; i++) { const k = ((i * 0.618) % 1), j = Math.sin(i * 12.9898) * 0.5 + 0.5, px = x0 + (x1 - x0) * k + nx * (j - 0.5) * spread * 2, py = y0 + (y1 - y0) * k + ny * (j - 0.5) * spread * 2, ln = ppm * (0.5 + j * 1.1) * (0.7 + k * 0.6), al = a * (0.25 + 0.5 * k);
        const gr = ctx.createLinearGradient(px - ux * ln, py - uy * ln, px, py); gr.addColorStop(0, 'rgba(214,226,214,0)'); gr.addColorStop(1, `rgba(220,232,222,${al.toFixed(3)})`); ctx.strokeStyle = gr; ctx.lineWidth = Math.max(0.8, ppm * 0.05 * (1 + j)); ctx.beginPath(); ctx.moveTo(px - ux * ln, py - uy * ln); ctx.lineTo(px, py); ctx.stroke(); }
      if (D.tier >= 2) for (let i = 1; i <= 4 + D.tier; i++) { const k = i / (5 + D.tier), sd = i % 2 ? 1 : -1, cx2 = x0 + (x1 - x0) * k + nx * sd * spread, cy2 = y0 + (y1 - y0) * k + ny * sd * spread, r0 = ppm * (0.35 + 0.15 * D.tier) * (0.7 + D.t), base = Math.atan2(-uy, -ux);
        for (let q = 0; q < 10; q++) { const t0 = q / 10, t1 = (q + 1) / 10, a0 = base + sd * t0 * 4.2, a1 = base + sd * t1 * 4.2, ra = r0 * (1 - t0 * 0.7), rb = r0 * (1 - t1 * 0.7);
          ctx.strokeStyle = `rgba(206,220,208,${(0.4 * a * (1 - t0)).toFixed(3)})`; ctx.lineWidth = Math.max(0.6, ppm * 0.06 * (1 - t0)); ctx.beginPath(); ctx.moveTo(cx2 + Math.cos(a0) * ra, cy2 + Math.sin(a0) * ra); ctx.lineTo(cx2 + Math.cos(a1) * rb, cy2 + Math.sin(a1) * rb); ctx.stroke(); } }
      if (D.tier >= 3) { ctx.strokeStyle = D.tier >= 4 ? `rgba(255,170,110,${(0.8 * a).toFixed(3)})` : `rgba(232,220,180,${(0.75 * a).toFixed(3)})`; ctx.lineWidth = Math.max(0.7, ppm * 0.03);
        for (let i = 0; i < 22 + 10 * (D.tier - 3); i++) { const k = (i * 0.381) % 1, j = Math.sin(i * 7.31) * 0.5 + 0.5, sw = D.t * (1.2 + j) * (i % 2 ? 1 : -1), px = x0 + (x1 - x0) * k + nx * (j - 0.5) * spread * 3 + Math.cos(sw * 2 + i) * ppm * 0.4, py = y0 + (y1 - y0) * k + ny * (j - 0.5) * spread * 3 + Math.sin(sw * 2 + i) * ppm * 0.4 - D.t * ppm * 0.4 * (D.tier >= 4 ? 1 : 0), ln = ppm * 0.14;
          ctx.beginPath(); ctx.moveTo(px - Math.cos(sw + i) * ln, py - Math.sin(sw + i) * ln); ctx.lineTo(px + Math.cos(sw + i) * ln, py + Math.sin(sw + i) * ln); ctx.stroke(); } }
      ctx.restore(); }
    // (5.16.0) Echo: for 3 s the whole sea becomes one great sonar scope round him: the water dims a little, range rings
    // spread out from him, and a sweep goes round once, in the scope's own dim olive phosphor
    if (g.echoSweep != null) { const T0 = g.echoSweep, ex0 = S(g.earl.x), ey0 = Sy(g.earl.y), Rm = Math.hypot(this.W, this.H), a = Math.min(1, T0 / 0.4) * Math.min(1, (3 - T0) / 0.8);
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(4,10,8,${(0.32 * a).toFixed(3)})`; ctx.fillRect(0, 0, this.W, this.H);
      for (let i = 1; i <= 6; i++) { const rr = ((T0 / 3) * 1.4 + i / 6 - 0.2) % 1.2 * Rm * 0.8; if (rr <= 0) continue; ctx.strokeStyle = `rgba(150,190,130,${(0.22 * a * (1 - rr / Rm)).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex0, ey0, rr, 0, TAU); ctx.stroke(); }
      const ang = -Math.PI / 2 + (T0 / 3) * TAU, sw = ctx.createRadialGradient(ex0, ey0, 0, ex0, ey0, Rm); sw.addColorStop(0, `rgba(170,210,140,${(0.11 * a).toFixed(3)})`); sw.addColorStop(1, 'rgba(170,210,140,0)');
      ctx.fillStyle = sw; ctx.beginPath(); ctx.moveTo(ex0, ey0); ctx.arc(ex0, ey0, Rm, ang - 0.5, ang); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(200,230,170,${(0.28 * a).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex0, ey0); ctx.lineTo(ex0 + Math.cos(ang) * Rm, ey0 + Math.sin(ang) * Rm); ctx.stroke(); ctx.restore(); }
    // (5.15.5) the landmarks' light in the water itself: a soft haze, as the lamps' beams make, so the lit water round
    // Dave's, the station and the old one's place shows from a way off (the light map only lights what is drawn there)
    { const haze = (wx, wy, R, col, a) => { const x = S(wx), y = Sy(wy), r = R * ppm; if (x < -r || x > this.W + r || y < -r || y > this.H + r) return;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(0.4, rgbStr(col, a * 0.6)); gg.addColorStop(0.8, rgbStr(col, a * 0.15)); gg.addColorStop(1, rgbStr(col, 0));
        ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
      const Dh = g.world.dave, Sn = g.world.station;
      if (Dh) haze(Dh.x, Dh.y - 4, 50, [70, 66, 52], 0.5);
      if (Sn && Sn.y > 250) haze(Sn.x, Sn.y - STATION_TOP, 50, [50, 70, 74], 0.45);
      haze(CAVE.x + 14, CAVE.y, 50, [34, 48, 54], 0.4);
      // (7.0.0) the deep places show themselves faintly, each in its own light: the vents' mouths a dull warm heat, the
      // brine pool a cool sheen on its surface, the whale fall the pale glow of the mats on its bones
      for (const v of g.world.vents) haze(v.x, v.y - v.h * 0.8, 10 + v.h, [120, 70, 40], 0.22);
      { const B = g.world.brine; if (B) haze((B.x0 + B.x1) / 2, B.y, (B.x1 - B.x0) * 0.7 + 10, [60, 96, 104], 0.28); }
      haze(WHALE_FALL.x, g.world.floorAt(WHALE_FALL.x) - 2, 24, [120, 124, 104], 0.24);
      if (g.abilLight > 0 && ((g.lightFade ?? 1) * (g.abilOutK ?? 1)) > 0.01) { const e0 = g.earl, L = g.abilLight; haze(e0.inSub ? g.sub.x : e0.x, e0.inSub ? g.sub.y : e0.y, L >= 2 ? 80 : L >= 1.5 ? 45 : 28, L >= 2 ? [120, 100, 70] : [70, 60, 50], (L >= 2 ? 0.16 : L >= 1.5 ? 0.52 : 0.42) * ((g.lightFade ?? 1) * (g.abilOutK ?? 1))); /* (6.0.12) the Lighthouse: only a faint warm haze, so its light falls on the scene instead of greying it */ /* (6.0.2) its reach by tier */ } } // (5.16.0) the Flare's light in the water itself
    // god rays near the surface
    const rayStrength = (this.phone ? 0.7 : 1) * dayEff * clamp(1 - cam.y / 110, 0, 1) * (1 - fx.darken * 0.7); // (7.0.0) on a phone too, a little fainter: drawn at a quarter size every other frame, they cost little
    if (rayStrength > 0.01) {
      // drawn into a quarter-size picture (they are soft: nothing is lost) and laid over the scene
      // in one go; remade every other frame, shifted with the camera in between
      const RC = this.rayC || (this.rayC = document.createElement('canvas'));
      const rw = Math.ceil(this.W / 4), rh = Math.ceil(this.H / 4);
      this.rayN = (this.rayN || 0) + 1;
      const remake = RC.width !== rw || RC.height !== rh || this.rayN % 2 === 0 || !this.rayCam || Math.abs(this.rayCam.ppm - ppm) > 0.01;
      if (remake) {
        if (RC.width !== rw || RC.height !== rh) { RC.width = rw; RC.height = rh; }
        const rctx = RC.getContext('2d');
        rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.globalCompositeOperation = 'source-over'; rctx.clearRect(0, 0, rw, rh); rctx.setTransform(0.25, 0, 0, 0.25, 0, 0); rctx.globalCompositeOperation = 'lighter';
        this.drawRays(rctx, S, Sy, ppm, cam, t, rayStrength);
        this.rayCam = { x: cam.x, y: cam.y, ppm };
      }
      const ox = (this.rayCam.x - cam.x) * ppm, oy = (this.rayCam.y - cam.y) * ppm;
      ctx.drawImage(RC, ox, oy, rw * 4, rh * 4);
    }
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const amb = ambientAt(g.earl.y, g.dayEff);
    const haze = clamp(1 - amb * 1.6, 0, 1);
    // faint scattered light inside the beam (soft-edged), plus the particles it catches
    // the scattered light in a beam: a feathered cone made once per beam shape and colour, then
    // turned, scaled and faded per frame (one image instead of a dozen gradient fills)
    const coneHaze = (x, y, ang, range, spread, col, a) => {
      if (a <= 0.002) return;
      const c = this.coneSprite(col, spread);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const k = range / 256; ctx.scale(k, k);
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(c, -256, -256); ctx.restore();
    };
    const motes = (x, y, ang, range, spread, col, a) => {
      if (this.lite) return;
      // the same deterministic particle field as the marine snow, but finer, lit only inside the cone
      a *= 1 + 1.3 * clamp((cam.y - 250) / 900, 0, 1); // (4.28) in the dark the light catches more: the beam is what there is to see
      const rm = range / ppm, cell = 0.9;
      const wx = cam.x + (x - this.W / 2) / ppm, wy = cam.y + (y - this.H / 2) / ppm;
      const i0 = Math.floor((wx - rm) / cell), i1 = Math.ceil((wx + rm) / cell);
      const j0 = Math.floor(Math.max(0.5, wy - rm) / cell), j1 = Math.ceil((wy + rm) / cell);
      const ca = Math.cos(ang), sa = Math.sin(ang), cosS = Math.cos(spread);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const h = Math.abs(Math.sin(i * 91.7 + j * 47.3) * 24634.6345) % 1;
        if (h > (this.quality < 0.85 ? 0.3 : 0.5)) continue; // fewer specks when frames run slow
        const h2 = Math.abs(Math.sin(i * 12.9 + j * 78.2) * 43758.5453) % 1;
        const px = i * cell + h * cell + Math.sin(t * 0.4 + h * 20) * 0.25;
        const py = j * cell + ((h2 * cell + t * 0.04 * (0.4 + h)) % cell);
        const dx = (px - wx), dy = (py - wy), d = Math.hypot(dx, dy);
        if (d > rm || d < 0.3) continue;
        const c = (dx * ca + dy * sa) / d;
        if (c < cosS) continue;
        const edge = (c - cosS) / (1 - cosS);
        const fall = (1 - d / rm); 
        const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + h * 3) + h2 * 30);
        const al = a * fall * fall * Math.min(1, edge * 2.5) * tw;
        if (al < 0.02) continue;
        ctx.fillStyle = rgbStr(d < rm * 0.35 ? col : mixRgb(col, WATER_LIT, 0.5), al);
        const sz = Math.max(1, ppm * (0.025 + h2 * 0.035));
        ctx.fillRect(S(px), Sy(py), sz, sz);
      }
    };
    // halos and glares: soft round sprites made once per colour, scaled and faded per use
    const halo = (x, y, r, col, a) => {
      if (a <= 0.003 || r < 0.5) return;
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(this.glowSprite(col, 0), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
    };
    const glare = (x, y, col, a) => {
      if (a <= 0.003) return;
      const r = ppm * 0.5;
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(this.glowSprite(col, 1), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
    };
    const e = g.earl;
    const lp = fx.lightPulse;
    // (4.28) the dark is not empty: now and then, far off, a living light: a blue-green flash, a slow pulse, or a pair
    // of lights that turn and go. Nothing is explained. Only below the sunlit water, never close to him.
    {
      const deep = clamp((cam.y - 260) / 700, 0, 1), dt0 = Math.min(0.1, t - (this.bioT || t)); this.bioT = t;
      const bl = this.bioLights || (this.bioLights = []);
      if (deep > 0 && !this.lite && Math.random() < dt0 * 0.35 * deep && bl.length < 4) {
        const side = Math.random() < 0.5 ? -1 : 1, kind = Math.random() < 0.22 ? 'pair' : Math.random() < 0.5 ? 'pulse' : 'flash';
        bl.push({ x: this.W / 2 + side * this.W * (0.22 + Math.random() * 0.26), y: this.H * (0.15 + Math.random() * 0.7), t0: t, life: kind === 'pair' ? 4.5 : kind === 'pulse' ? 3.2 : 1.1, kind, col: Math.random() < 0.8 ? '#5fd6c8' : '#7aa8ff', vx: (Math.random() - 0.5) * 18, r: 0.7 + Math.random() * 0.8 });
      }
      for (let i = bl.length - 1; i >= 0; i--) {
        const L = bl[i], k = (t - L.t0) / L.life; if (k >= 1 || deep <= 0) { bl.splice(i, 1); continue; }
        const env = Math.sin(Math.PI * k), x = L.x + L.vx * (t - L.t0), y = L.y;
        if (L.kind === 'pair') { const a = env * 0.55 * deep; halo(x, y, ppm * 0.5, '#e8f0d8', a); halo(x + ppm * 0.55, y, ppm * 0.5, '#e8f0d8', a); glare(x, y, '#ffffff', a * 0.6); glare(x + ppm * 0.55, y, '#ffffff', a * 0.6); }
        else { const a = (L.kind === 'pulse' ? env * (0.6 + 0.4 * Math.sin((t - L.t0) * 7)) : env * env) * 0.7 * deep; halo(x, y, ppm * 1.6 * L.r, L.col, a * 0.6); glare(x, y, L.col, a); }
      }
    }
    if (head && e.lampOn && haze > 0) {
      const ang = this.lampAngle(g, e, head);
      coneHaze(head.x, head.y, ang, 15 * ppm, 0.28, beamCol, 0.06 * TORCH * haze * lp);
      motes(head.x, head.y, ang, 15 * ppm, 0.3, beamCol, 0.8 * TORCH * haze * lp);
      glare(head.x, head.y, beamCol, 0.5 * TORCH * lp);
    }
    if (subLamps && haze > 0) {
      const sub = g.sub;
      const cy = Math.cos(sub.yaw), sxs = (cy >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy));
      const vis = Math.pow(Math.abs(cy), 0.7);
      const ang = sxs > 0 ? sub.tilt : Math.PI - sub.tilt;
      const rt = sub.tilt * Math.sign(sxs), pxA = subLamps.lampA[0] * sxs, pyA = subLamps.lampA[1], lx = S(sub.x) + pxA * Math.cos(rt) - pyA * Math.sin(rt), ly = Sy(sub.y) + pxA * Math.sin(rt) + pyA * Math.cos(rt); // (7.7.0, owner) the glare sits on the lamp as the hull pitches
      // soft volumetric glow around the whole sub, and the little stern lamp itself
      halo(S(sub.x), Sy(sub.y), ppm * 9, [150, 175, 185], 0.06 * haze * lp);
      halo(S(sub.x) - 4.8 * sxs * ppm, Sy(sub.y) - 0.4 * ppm, ppm * 0.7, [255, 175, 110], 0.22 * lp);
      coneHaze(lx, ly, ang, 28 * ppm, 0.32, beamCol, 0.07 * haze * lp * vis);
      coneHaze(lx, ly, ang, 14 * ppm, 0.9, beamCol, 0.035 * haze * lp * vis);
      motes(lx, ly, ang, 28 * ppm, 0.34, beamCol, 0.8 * haze * lp * vis);
      glare(lx, ly, beamCol, (0.6 + (1 - vis) * 0.8) * lp);
      if (this.netLamp && g.subNet) { const [nx, ny, na, nl] = this.netLamp; coneHaze(nx, ny, na, nl, 0.4, beamCol, 0.06 * haze * lp); motes(nx, ny, na, nl, 0.42, beamCol, 0.6 * haze * lp); glare(nx, ny, beamCol, 0.45 * lp); }
    }
    for (const lt of g.world.lanterns) {
      const x = S(lt.x), y = Sy(lt.y);
      if (x < -200 || x > this.W + 200 || y < -200 || y > this.H + 200) continue;
      halo(x, y, ppm * (1.5 + lt.charge * 1.5), hsl(lt.hue, 0.7, 0.65), 0.35 * (0.3 + 0.7 * lt.charge) * haze);
      if (lt.active > 0.01) {
        ctx.strokeStyle = rgbStr(hsl(lt.hue, 0.7, 0.7), 0.12 * lt.active);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, LANTERN_RADIUS * ppm, 0, TAU); ctx.stroke();
      }
    }
    for (const [x, y, col, r, k = 1, core, dim = 1] of glowPts) {
      if (core === undefined) { halo(x, y, k < 1 ? r * 1.4 : Math.max(r, ppm * 0.4), hexToRgb(col), 0.5 * haze * fx.bioPulse * k); continue; }
      const c = hexToRgb(col);
      const ha = 0.5 * BIO_BRIGHT * Math.max(haze, 0.4) * fx.bioPulse * k * dim;
      if (r < 5) { ctx.fillStyle = rgbStr(c, ha * 0.35); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } // tiny halos: no gradient needed
      else halo(x, y, r, c, ha);
      // the organ itself: a small, sharp point; under a lamp only a faint coloured dot on the skin
      ctx.fillStyle = rgbStr(mixRgb(c, [255, 255, 255], 0.45), Math.min(1, 0.85 * k * fx.bioPulse) * BIO_BRIGHT * (0.3 + 0.7 * dim));
      ctx.beginPath(); ctx.arc(x, y, core, 0, TAU); ctx.fill();
    }
    if (this.escaW) halo(S(this.escaW.x), Sy(this.escaW.y), ppm * 1.5, [196, 220, 204], 0.45 * haze);
    for (const p of g.world.pickups) {
      if (p.taken || p.type !== 'sapphire') continue;
      const x = S(p.x), y = Sy(p.y);
      if (x < -50 || x > this.W + 50 || y < -50 || y > this.H + 50) continue;
      halo(x, y - ppm * 0.2, ppm * 0.5, [90, 140, 255], 0.35 * haze + 0.1);
    }
    { const e0 = g.earl; if (e0.biolum && !e0.inSub && g.mode === 'play') { const f0 = g.lightFade ?? 1, bx = S(e0.x), by = Sy(e0.y), c0 = [130, 158, 206]; // (6.0.9) Bioluminescence's glow in the water, as a glow stick's
      halo(bx, by, ppm * 16, c0, 0.08 * f0); halo(bx, by, ppm * 9, c0, 0.09 * f0); halo(bx, by, ppm * 2.5, [170, 196, 230], 0.12 * f0); } }
    for (const L of g.glows || []) { // (5.17.1) the stick itself: a short amber tube, tilted, swaying as it sinks, in its own soft glow
      const x = S(L.x), y = Sy(L.y), mg = ppm * 16 * (L.adv ? 2 : 1) + 4; if (x < -mg || x > this.W + mg || y < -mg || y > this.H + mg) continue; const fade = Math.min(1, L.t / 8) * (g.lightFade ?? 1); // (6.5.1) its light is drawn until the whole pool is off screen (it snapped away when the stick itself left)
      /* (6.0.5) no name beside a dropped glow stick: the light says it */
      const R0 = L.adv ? 2 : 1, hc = L.adv ? [232, 226, 210] : [255, 178, 94], hk = L.adv ? 1.25 : 1; halo(x, y, ppm * 16 * R0, hc, 0.07 * hk * fade); halo(x, y, ppm * 9 * R0, hc, 0.08 * hk * fade); halo(x, y, ppm * 3 * R0, hc, 0.14 * fade); // (5.17.1) the water lit evenly 16 m round, not a bright knot
      const ln = Math.max(4, ppm * 0.22), rw = Math.max(1.4, ppm * 0.035), ang = L.rot + (L.rest ? 1.45 : Math.sin(g.time * 0.9 + L.ph) * 0.35);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = 0.35 + 0.65 * fade; ctx.lineCap = 'round';
      ctx.strokeStyle = L.adv ? '#e8e2d0' : '#ffc070'; ctx.lineWidth = rw * 2; ctx.beginPath(); ctx.moveTo(-ln / 2, 0); ctx.lineTo(ln / 2, 0); ctx.stroke();
      ctx.strokeStyle = '#fff2d8'; ctx.lineWidth = rw * 0.8; ctx.beginPath(); ctx.moveTo(-ln / 2 + rw, 0); ctx.lineTo(ln / 2 - rw * 2, 0); ctx.stroke();
      ctx.strokeStyle = L.adv ? '#8a8c88' : '#3a3026'; ctx.lineWidth = rw * 2.2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(ln / 2 - rw * 1.2, 0); ctx.lineTo(ln / 2 + rw * 0.6, 0); ctx.stroke(); ctx.restore(); }
    if (this.boatLight) halo(this.boatLight.x, this.boatLight.y, ppm * 4, [255, 190, 110], 0.25 * this.boatLight.a);
  }
}

function hsl(h, s, l) {
  h /= 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}
