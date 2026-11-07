// Scene renderer: sky, sea surface, water, terrain, life, Earl, and the light model.
// Light model: the scene is drawn in "true" colour, then multiplied by a lightmap
// (ambient that fades with depth and loses red, plus lamps and bioluminescence),
// then additive glows are layered on top.
import { clamp, lerp, smoothstep, sampleTable, rgbStr, TAU, fbm1, noise1, hexToRgb, mixRgb } from './util.js';
import { drawSpecies } from './creatures_draw.js';
import { SPECIES } from './species.js';
import { drawEarl, drawSub, drawBoat, markOf, SUB_MARKS, boatRock } from './earl_draw.js';
import { drawMonster, drawMonsterLights, drawMonsterShape, MONSTER_LEN } from './monster_draw.js';
import { sleeperState } from './sleeper_draw.js';
import { activeTool, hatchAt, NET_DROP, NET_HAUL } from './capture.js';
import { drawShipwreck, drawVentChimney, drawRockArt } from './scenery_draw.js';
import { drawDart, drawBoxTrap, drawTrapBuoy } from './tools_draw.js';
import { drawStation, STATION_TOP } from './station_draw.js';
import { drawTable, TABLE } from './oldone.js';
import { pictureOf } from './catalog.js';
const SIMPLE_SMALL = false; // (4.3.7) small animals as generic shapes (off: each is drawn as itself)
import { drawPrompt } from './fittings.js'; // (4.3.2) the tutorial's prompt beside the fish
import { Wake } from './trail.js';
import { TRAPS, lv, statValue } from './economy.js';
import { armPose } from './arm.js';
import { makeVariantSprite } from './variants.js';
import { SPECIES_BY_ID } from './species.js';
import { SETTINGS } from './settings.js';
import { BOAT, WORLD_W, EAST, CAVE, ANGLER, CANYON } from './world.js';
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25) * this.quality; // at most 1.25x the screen: sharp, without drawing 1.5x the pixels
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) {
      this.c.width = w; this.c.height = h;
      this.lc.width = Math.ceil(w / 2); this.lc.height = Math.ceil(h / 2); // light at half resolution, smoothed when stretched
      this.gc.width = Math.ceil(w / 2); this.gc.height = Math.ceil(h / 2);
    }
  }
  get W() { return this.c.width; }
  get H() { return this.c.height; }

  updateCamera(g, dt) {
    const e = g.earl;
    // (2.3.1) a little closer in the shallows, where Earl works by hand (22 m across above 40 m, 26 m by
    // 120 m), and in the sub in the deep, where the animals are small lights (46 m across near the surface,
    // 38 m below 400 m)
    const dv = clamp((e.y - 40) / 80, 0, 1), ds = clamp((e.y - 150) / 250, 0, 1);
    const targetView = g.debugView || (g.mode === 'menu' ? 40 : g.helm ? 36 : (e.inSub ? lerp(46, 38, ds) : lerp(22, 26, dv)) * (this.zoomMul || 1)); // (3.0.0) only the wheel changes the view; on deck it is the same as in the water
    this.viewW = lerp(this.viewW, targetView, 1 - Math.exp(-dt * 1.2));
    const ppm = this.W / this.viewW;
    const cam = this.cam;
    cam.w = this.viewW; cam.h = this.H / ppm; cam.ppm = ppm;
    g.viewBox = [cam.x - cam.w / 2, cam.x + cam.w / 2, cam.y - cam.h / 2, cam.y + cam.h / 2]; // what is on screen, in metres (the monster only reacts to a lamp it can be seen in)
    const lookX = e.vx * 0.9, lookY = e.vy * 0.6;
    let tx = e.x + lookX, ty = e.y + lookY;
    ty = Math.max(ty, -cam.h * 0.18); // let a little sky show near the surface
    if (g.mode === 'menu') { tx = BOAT.x - 7 + Math.sin(g.time * 0.05) * 3; ty = 5.5; }
    if (g.helm) { tx = BOAT.x + 3 * Math.cos(BOAT.yaw || 0) + clamp(g.boatV || 0, -5, 5) * 1.6; ty = -2.5; } // at the wheel: the whole Margaret and the sub in her cradle, looking a little ahead the way she goes
    // a jump (new dive, respawn) cuts straight there instead of sweeping across the map
    if (Math.hypot(cam.x - tx, cam.y - ty) > 80) { cam.x = tx; cam.y = ty; }
    const k = 1 - Math.exp(-dt * (g.mode === 'menu' ? 0.6 : 3));
    cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k);
    cam.x = clamp(cam.x, cam.w / 2 - 20, WORLD_W - cam.w / 2 + 25);
  }

  render(g) {
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
    const dis = fx.disorient;
    if (dis > 0 || fx.shake > 0) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.sin(t * 0.7) * 0.03 * dis + Math.sin(t * 1.9) * 0.012 * dis);
      const z = 1 + Math.sin(t * 0.9) * 0.025 * dis;
      ctx.scale(z, z);
      // a jolt (random jitter) plus, when disoriented, a slow uneasy lurch of the whole view
      const lx = fbm1(t * 1.4, 2, 7) * dis * ppm * 0.5, ly = fbm1(t * 1.1 + 40, 2, 11) * dis * ppm * 0.35;
      ctx.translate(-W / 2 + lx + (Math.random() - 0.5) * fx.shake * ppm * 0.4, -H / 2 + ly + (Math.random() - 0.5) * fx.shake * ppm * 0.4);
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
      this.texture(ctx, 'murk', 70, 0.28 + 0.12 * smoothstep(20, 400, cam.y), 'soft-light', W / 2 - cam.x * ppm * 0.55 + t * ppm * 0.25, H / 2 - cam.y * ppm * 0.55);
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
    this.drawKelpBackdrop(g, ppm, t);
    // ================= TERRAIN & STRUCTURES =================
    for (const w of g.world.wrecks) if (Math.abs(w.x - cam.x) < cam.w / 2 + w.len && visible(w.x, w.y, w.len * 0.6)) this.drawWreck(ctx, w, S, Sy, ppm);
    this.drawKelp(g, S, Sy, ppm, 0, x0, x1);
    for (const v of g.world.vents) if (inView(v.x, v.y, 30)) this.drawVent(ctx, v, S, Sy, ppm, t);
    this.drawFloorCached(g, S, Sy, ppm);
    this.drawFloorLife(g, ctx, S, Sy, ppm, x0, x1, t);
    for (const rk of g.world.rocks) if (rk.x1 > x0 && rk.x0 < x1 && rk.y1 > y0 && rk.y0 < y1 && visible((rk.x0 + rk.x1) / 2, (rk.y0 + rk.y1) / 2, Math.max(rk.x1 - rk.x0, rk.y1 - rk.y0) * 0.6)) this.drawRock(ctx, rk, S, Sy, ppm);
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
      if (!s.sp.v.glow && !s.variant && !visible(s.x, s.y, Math.max(0.18, s.sp.len) * s.scale)) continue;
      const L = Math.max(0.18, s.sp.len) * s.scale * ppm;
      const sl = s.variant ? layer() : ctx;
      if (s.variant) this.lgrow(S(s.x), Sy(s.y) - L * 0.5, L * 1.3);
      const pose = staticPose(g.world, s);
      sl.save(); sl.translate(S(s.x), Sy(s.y) + pose.sink * ppm); sl.rotate(pose.rot); sl.scale(s.flip, 1);
      const r = s.variant ? this.drawVariant(sl, s.sp, s.variant, L, t * 0.3 + s.phase) : this.drawStatic(sl, s, L, t, this.veilFor(s.y));
      sl.restore();
      if (s.variant === 'crimson') glowPts.push([S(s.x), Sy(s.y) - L * 0.3, '#ff3018', Math.max(ppm * 0.6, L * 0.6), 1]);
      if (r && s.sp.v.glow) glowPts.push([S(s.x), Sy(s.y), s.sp.v.glow, L]);
    }
    // ---- fauna ----
    // Fish are drawn nose at -x, so a fish heading right (+x) is mirrored, and the tilt is negated
    // so the nose follows the direction of travel (a fish swimming down points down).
    // Small fish are batched per species: one path for all their backs, one for all their bellies,
    // one for the silver flashes - a whole school costs three draw calls.
    const baseM = ctx.getTransform();
    this.rimSun = this.lite || cam.y + cam.h / 2 <= 0 ? 0 : clamp(1 - Math.max(0, cam.y) / 260, 0.25, 1) * (0.55 + 0.45 * (g.dayEff || 0));
    const rbox = [1e9, 1e9, -1e9, -1e9]; // animals drawn live (not from baked frames) get the rim the old way
    const batches = new Map();
    let glowSkip = 0;
    for (const c of g.fauna.list) {
      if (!inView(c.x, c.y, c.len)) continue;
      if (!c.sp.v.glow && !c.variant && !visible(c.x, c.y, fishDrawLen(c.len))) continue; // black in the black
      if (c.variant && g.earl.legends && g.earl.legends.has('eye')) glowPts.push([S(c.x), Sy(c.y), '#ffe6a0', Math.max(ppm * 0.9, fishDrawLen(c.len) * ppm), 0.85]); // (2.8.0) Eye of the Sea: rare forms glow
      const Ld = fishDrawLen(c.len) * ppm;
      const shape = c.sp.v.s;
      const tilt = clamp(Math.atan2(c.hvy !== undefined ? c.hvy : c.vy, Math.max(Math.abs(c.vx), c.hvy !== undefined ? c.speed * 0.8 : 0) + 0.2), -0.5, 0.5);
      // (4.3.7) no stand-in shapes: every animal is drawn as itself at any size (from its cached frames). Small fish,
      // shrimp and krill used to be drawn here as a generic oval and tail, so a krill looked like a little fish until
      // he was close enough for its own drawing. Kept, switched off, in case a slow machine ever needs it back.
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
        if (c.sp.v.glow && c.glimmer) glowPts.push([x, y, c.sp.v.glow, Math.max(2, Ld * 0.4 + ppm * 0.08), 0.55 * bioPulse(c, t), Math.max(0.8, ppm * 0.05)]); // a lone one: its own light, flashing
        else if (c.sp.v.glow && (glowSkip++ % 4 === 0)) glowPts.push([x, y, c.sp.v.glow, Math.max(2, Ld * 0.35), 0.45 * bioPulse(c, t), 0.7]); // (2.3.1: every second fish, a little brighter: a school reads as a drift of blue points)
        continue;
      }
      const isLive = c.variant || Ld > 150 || CACHE_SKIP.has(shape);
      if (shape === 'sleeper') sleeperState.jaw = c.jaw || 0; // how far its jaw is open (see hunters.js)
      const tg = isLive && Ld >= 6 ? layer() : ctx;
      if (tg !== ctx) this.lgrow(S(c.x), Sy(c.y), Ld * 1.4);
      tg.save(); tg.translate(S(c.x), Sy(c.y));
      if (c.dir > 0) tg.scale(-1, 1);
      if (c.sp.v.hab === 'floor' && c.y > g.world.floorAt(c.x) - 0.6) {
        // a crab, an octopus, a starfish on the bottom: along the slope under it, not level
        const a = seabedPose(g.world, c.x, Math.max(0.1, c.len * 0.5), true).rot;
        tg.rotate(c.dir > 0 ? -a : a);
      } else tg.rotate(c.sp.v.hab === 'drift' ? 0 : -tilt);
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
      if (c.sp.v.glow) {
        // living light from the real organs: a sharp core and a small halo, slowly pulsing, flaring when startled
        const pk = bioPulse(c, t), rot = c.sp.v.hab === 'drift' ? 0 : -tilt, cr = Math.cos(rot), sr = Math.sin(rot);
        const pts = r || [[0, 0, 1]];
        for (const [lx, ly, sz = 1] of pts) {
          const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
          glowPts.push([S(c.x) - rx * c.dir, Sy(c.y) + ry, c.sp.v.glow, Math.max(2, (Ld * 0.06 + ppm * 0.1) * sz), pk, Math.max(0.7, (Ld * 0.012 + 0.4) * sz)]);
        }
      }
    }
    // the small fish, batched: their colours mixed with the water's, as the veil would have done
    const bv = this.veilFor(cam.y);
    const vmix = (hex) => rgbStr(mixRgb(hexToRgb(hex), bv.col, bv.a));
    for (const bt of batches.values()) {
      ctx.fillStyle = vmix(bt.sp.v.c[0]); ctx.fill(bt.back);
      ctx.fillStyle = vmix(bt.sp.v.c[1]); ctx.fill(bt.belly);
      if (bt.nf) { ctx.fillStyle = 'rgba(235,245,250,0.7)'; ctx.fill(bt.flash); }
      ctx.fillStyle = vmix('#0a0a0a'); ctx.fill(bt.eyes);
    }
    ctx.setTransform(baseM);
    if (fl) { fl.setTransform(baseM); this.layerEnd(ctx, g, fl, null); } // (2.3.2: no rim-and-belly shading on the animals: it popped in and out around whatever was drawn live)
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
        const n = tr.catch.length, left = Math.max(0, 300 - tr.age);
        this.trapLabels.push([bx, bsy - ppm * (T.winch ? 2.4 : 1.5), tr.state === 'lowering' ? `going down · ${Math.round(tr.y)} m` : tr.state === 'hauling' ? `coming up · ${Math.round(tr.y)} m`
          : `${n} inside · ${left > 0 ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}` : tr.age > 420 ? 'left too long!' : 'ready'}`]);
      }
    }
    if (g.lure) this.drawLure(ctx, S(g.lure.x), Sy(g.lure.y), ppm, t);

    // brackets around what the net, slurp gun or claw will go for (a setting: pause menu)
    // (4.2.0, 4.3.1) the tutorial: a stream of brass chevrons flowing from Earl to where to go, a ring pulsing round
    // the fish (or the spot), and an arrow at the edge of the screen when it is off screen. No words: the game's own
    // prompts already say what to press there
    if (g.tut && g.tut.to && g.mode === 'play') {
      const e = g.earl, tx = g.tut.to.x, ty = g.tut.to.y, d = Math.hypot(tx - e.x, ty - e.y);
      const ang = Math.atan2(Sy(ty) - Sy(e.y), S(tx) - S(e.x)), gap = 1.5, n = Math.min(36, Math.floor(d / gap));
      const sz = clamp(ppm * 0.22, 7, 16), flow = (g.time * 1.6) % 1;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i <= n; i++) {
        const m = (i - flow) * gap; if (m < 1.1 || m > d - 1.2) continue; // clear of Earl and of the target
        const q = m / d, x = S(lerp(e.x, tx, q)), y = Sy(lerp(e.y, ty, q));
        // a wave of light runs along them towards the target; they fade in from Earl
        const wave = 0.5 + 0.5 * Math.cos((q * 4 - g.time * 2.2) * TAU * 0.5), a = (0.4 + 0.5 * wave) * Math.min(1, (m - 1.1) / 1.5);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(-sz * 0.55, -sz * 0.7); ctx.lineTo(sz * 0.35, 0); ctx.lineTo(-sz * 0.55, sz * 0.7);
        ctx.strokeStyle = `rgba(20,14,4,${(a * 0.6).toFixed(3)})`; ctx.lineWidth = sz * 0.42 + 2; ctx.stroke(); // a dark edge: readable on sky and water
        ctx.strokeStyle = `rgba(232,208,146,${a.toFixed(3)})`; ctx.lineWidth = sz * 0.42; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      const f = g.tut.fish, cx = S(f ? f.x : tx), cy = Sy(f ? f.y : ty);
      const r = (f ? Math.max(16, ppm * (f.len * 0.8 + 0.45)) : Math.max(14, ppm * 0.5)) * (1 + 0.1 * Math.sin(g.time * 4));
      ctx.save(); ctx.shadowColor = 'rgba(232,208,146,0.8)'; ctx.shadowBlur = 10; if (g.tut.door) ctx.globalAlpha = 0; // (4.3.5) the door glows itself
      ctx.strokeStyle = 'rgba(232,208,146,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(232,208,146,${(0.5 * (1 - ((g.time * 0.8) % 1))).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * (1 + 0.8 * ((g.time * 0.8) % 1)), 0, TAU); ctx.stroke(); // a ripple going out
      ctx.restore();
      // (4.3.2) a prompt beside the fish, only where the game's own prompts don't already say it (swinging the net,
      // "it got away"): a brass key-cap, or a mouse with its left button lit, and the words
      const tp = g.tut.prompt;
      if (tp && typeof tp === 'object' && cx > -60 && cx < this.W + 60 && cy > -60 && cy < this.H + 60) {
        ctx.save(); ctx.font = '500 18px "EB Garamond", Georgia, serif';
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
          ctx.fillStyle = `rgba(216,191,130,${on.toFixed(2)})`; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -1); ctx.lineTo(-8, -1); ctx.lineTo(-8, -4); ctx.arcTo(-8, -12, 0, -12, 8); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -1); ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.stroke();
          ctx.restore();
          drawPrompt(ctx, tp.text, x0 + iw + (total - iw) / 2, cy, 1, { size: 18, shade: false, col: tp.col || '#ece6d2' });
        } else drawPrompt(ctx, tp.key ? `${tp.key}  ${tp.text}` : tp.text, x0 + total / 2, cy, 1, { size: 18, shade: false, col: tp.col || '#ece6d2' });
      }
      // off-screen: a bigger arrow at the edge of the screen pointing the way, with how far
      const W2 = this.W, H2 = this.H;
      if (cx < 0 || cx > W2 || cy < 0 || cy > H2) {
        const ax = clamp(cx, 48, W2 - 48), ay = clamp(cy, 70, H2 - 70), a2 = Math.atan2(cy - H2 / 2, cx - W2 / 2), pulse = 1 + 0.12 * Math.sin(g.time * 5);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a2); ctx.scale(pulse, pulse);
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.fillStyle = 'rgba(232,208,146,0.95)';
        ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-12, -16); ctx.lineTo(-4, 0); ctx.lineTo(-12, 16); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,230,210,0.85)'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(`${Math.round(d)} m`, ax - Math.cos(a2) * 34, ay - Math.sin(a2) * 34 + 4); ctx.restore();
      }
    }
    const ctg = g.mode === 'play' && SETTINGS.brackets ? g.catchTarget : null;
    if (ctg) {
      const tx = ctg.c ? ctg.c.x : ctg.x, ty = ctg.c ? ctg.c.y : ctg.y;
      const r = Math.max(ppm * 0.35, fishDrawLen(ctg.len) * ppm * 0.6), rh = Math.max(ppm * 0.28, r * 0.6), k = r * 0.3;
      const cx = S(tx), cy = Sy(ty), a = 0.45 + 0.25 * Math.sin(t * 5);
      ctx.strokeStyle = ctg.col || 'rgb(200,240,210)'; ctx.globalAlpha = Math.min(1, a + 0.15); ctx.lineWidth = Math.max(1.6, ppm * 0.05);
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(cx + sx * r, cy + sy * rh - sy * k); ctx.lineTo(cx + sx * r, cy + sy * rh); ctx.lineTo(cx + sx * r - sx * k, cy + sy * rh);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
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
      // draw the boat into a small offscreen canvas and darken it there (canvas filters are slow)
      const bw = Math.ceil(14 * ppm * 1.3), bh = Math.ceil(14 * ppm * 0.75);
      const bc = this.boatC || (this.boatC = document.createElement('canvas'));
      if (bc.width !== bw || bc.height !== bh) { bc.width = bw; bc.height = bh; }
      const bctx = bc.getContext('2d');
      bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, bw, bh);
      bctx.globalCompositeOperation = 'source-over';
      bctx.translate(bw * 0.45, bh * 0.82);
      const bcos = Math.cos(BOAT.yaw || 0), bsx = Math.sign(bcos || 1) * Math.max(0.06, Math.abs(bcos));
      crane = drawBoat(bctx, 14 * ppm, t, g.sub, bsx < 0, { tutDoor: !!(g.tut && g.tut.door) });
      const dimB = 1 - (0.22 + 0.78 * Math.sqrt(dayEff));
      if (dimB > 0.01) { bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'source-atop'; bctx.fillStyle = `rgba(4,6,10,${dimB.toFixed(3)})`; bctx.fillRect(0, 0, bw, bh); }
      ctx.save(); ctx.scale(bsx, 1); ctx.drawImage(bc, -bw * 0.45, -bh * 0.82); ctx.restore(); // (3.0.0) turned with her heading
      this.boatFrame = { x: boatX, y: boatY, a: roll + boatRock(t), lit: 0.35 + 0.65 * Math.sqrt(dayEff) }; // (2.5.0: Earl on deck is drawn in this frame; the deck stations are gone)
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
        ctx.beginPath(); ctx.moveTo(boatX + crane.craneTip[0] * Math.sign(Math.cos(BOAT.yaw || 0) || 1) * Math.max(0.06, Math.abs(Math.cos(BOAT.yaw || 0))), boatY + crane.craneTip[1]); // (turned with her) ctx.lineTo(S(sub.x), Sy(sub.y) - 2.6 * ppm); ctx.stroke();
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
      const r = drawSub(dctx, 9 * ppm, t, sub.stress, lights, armArg, look);
      dctx.restore();
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
      ctx.fillStyle = '#2e332b';
      const r = d.size * ppm;
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(r * 0.2, -r * 0.5); ctx.lineTo(r, r * 0.1); ctx.lineTo(-r * 0.3, r * 0.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // ---- Earl ----
    const e = g.earl;
    let head = null;
    // the tag tracker: a faint dotted trail to the nearest released fish
    if ((g.addons || {}).tracker && (g.profile.released || []).length && g.mode === 'play') {
      const me = g.earl.inSub ? g.sub : g.earl;
      let best = null, bd = 1e9;
      for (const r of g.profile.released) { const d = Math.hypot(r.x - me.x, r.y - me.y); if (d < bd) { bd = d; best = r; } }
      if (best && bd > 8) {
        const ang = Math.atan2(best.y - me.y, best.x - me.x), len = Math.min(bd, 22);
        ctx.save(); ctx.strokeStyle = 'rgba(150,230,200,0.45)'; ctx.lineWidth = Math.max(1, ppm * 0.06); ctx.setLineDash([ppm * 0.3, ppm * 0.5]); ctx.lineDashOffset = -t * ppm * 1.5;
        ctx.beginPath(); ctx.moveTo(S(me.x + Math.cos(ang) * 2), Sy(me.y + Math.sin(ang) * 2)); ctx.lineTo(S(me.x + Math.cos(ang) * len), Sy(me.y + Math.sin(ang) * len)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = 'rgba(170,240,210,0.75)'; ctx.font = `${Math.max(11, ppm * 0.38)}px monospace`; ctx.textAlign = 'center';
        const lx = clamp(S(me.x + Math.cos(ang) * len * 0.7), 90, this.W - 90), ly = clamp(Sy(me.y + Math.sin(ang) * len * 0.7) - 10, 30, this.H - 40);
        ctx.fillText(`${best.name || SPECIES_BY_ID[best.id].name} · ${Math.round(bd)} m`, lx, ly);
        ctx.restore();
      }
    }
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
      ctx.strokeStyle = 'rgba(225,215,180,0.9)'; ctx.lineWidth = Math.max(1.2, ppm * 0.05);
      ctx.beginPath(); ctx.moveTo(S(mx), Sy(my - r)); ctx.quadraticCurveTo(S(mx + dir * 0.25), Sy(my), S(mx), Sy(my + r)); ctx.stroke();
      ctx.fillStyle = '#e8762a'; for (const f of [-0.35, 0.35]) { ctx.beginPath(); ctx.arc(S(mx - dir * 0.3 + f * 0.4), Sy(my - r - 0.05), Math.max(1.6, ppm * 0.09), 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#2a2c2a'; for (const f of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.arc(S(mx - dir * 0.2 + f * 0.4), Sy(my + r + 0.05), Math.max(1.6, ppm * 0.08), 0, TAU); ctx.fill(); }
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
      const moving = g.aboard ? 0 : clamp(e.speedNow / 3, 0, 1);
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
      if (g.aboard) { // on deck: tools stowed, boots on, no tank or mask; on the ladder: tank and mask still on, hands on the rungs
        const P0 = g.aboard.pose, onDeck = P0 === 'deck' && !(g.aboard.jump > 0);
        gear = { kind: 'none', tier: 0, t, suit: e.suit, bag: [], land: true, noTank: onDeck, noMask: onDeck, tankLook: e.tankLook, suitGlow: e.suitGlow };
        if (onDeck) gear.walk = g.aboard.walk || 0;
        else if (P0 === 'climb') gear.climb = g.aboard.rung || 0;
      }
      const h = drawEarl(ctx, (g.aboard ? 1.7 : EARL_H) * ppm, e.kick, moving, lampCol, amb, gear); // (standing on deck he is drawn at a man's height)
      ctx.restore();
      // (2.8.2) a Legendary's wake: a few dim motes that school with him, shaped by the net's skill (trail.js)
      if (e.trail && !e.inSub && !g.aboard && g.mode === 'play') {
        const wk = this.wake || (this.wake = new Wake());
        wk.update(e, g.time, e.trailKind); wk.draw(ctx, S, Sy, ppm, e.trail, !!e.lampOn, g.time);
      } else if (this.wake) this.wake.reset();
      if (h.tip) {
        const ca2 = Math.cos(e.angle), sa2 = Math.sin(e.angle);
        g.toolTip = { x: e.x + e.facing * (h.tip.x * ca2 - h.tip.y * sa2) / ppm, y: e.y + (h.tip.x * sa2 + h.tip.y * ca2) / ppm };
      }
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
        const fx2 = f.x + (g.toolTip.x - f.x) * ek, fy2 = f.y + (g.toolTip.y - f.y) * ek;
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
    this.drawKelp(g, S, Sy, ppm, 1, x0, x1);
    // ---- bubbles ----
    ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = Math.max(0.8, ppm * 0.02);
    for (const b of g.bubbles) {
      if (!inView(b.x, b.y)) continue;
      ctx.beginPath(); ctx.arc(S(b.x), Sy(b.y), Math.max(1, b.r * ppm), 0, TAU); ctx.stroke();
    }
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
      for (let sx = -10; sx <= W + 20; sx += 12) ctx.lineTo(sx, Sy(surfY(cam.x + (sx - W / 2) / ppm)) + 1);
      ctx.stroke();
    }

    // ================= LIGHTING =================
    // (3.0.26) a cap on the living lights a frame: those off screen dropped, and past 90 the small ones thinned
    // evenly (a swarm of firefly squid could put hundreds here, each drawn twice)
    { const W0 = this.W, H0 = this.H; let n = 0;
      for (const p of glowPts) if (p[0] > -80 && p[0] < W0 + 80 && p[1] > -80 && p[1] < H0 + 80) glowPts[n++] = p;
      glowPts.length = n;
      if (n > 90) { const keep = [], small = []; for (const p of glowPts) (p[3] > ppm * 0.9 ? keep : small).push(p); const step = small.length / Math.max(1, 90 - keep.length); glowPts.length = 0; glowPts.push(...keep); for (let i = 0; i < small.length && glowPts.length < 90; i += Math.max(1, step)) glowPts.push(small[Math.floor(i)]); } }
    this.buildLightmap(g, S, Sy, ppm, head, subLamps, glowPts, horizon, surfY);
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.lc, 0, 0, W, H);
    ctx.imageSmoothingQuality = 'low'; // (only the light needs the careful scaling; everything else uses the fast kind)
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff);
    ctx.globalCompositeOperation = 'source-over';

    // ---- the entity's own light: red along its length, its eyes, the blue flash (see entity.lights) ----
    const ent = g.entity;
    if (ent && this.entInfo && !g.kill && g.mode !== 'menu') {
      const I = this.entInfo, Lt = ent.lit || { body: 1, eye: 0.3, flash: 0 }, fade = ent.fade ?? 1;
      const lidOpen = ent.blink > 0 ? 0.1 : 1;
      drawMonsterLights(ctx, I.info, (lx, ly) => [I.x + lx * I.flip, I.y + ly], ppm, t,
        { body: Lt.body * fade, eye: Lt.eye * fade * lidOpen, flash: Lt.flash * fade, reduce: !!g.reduceFlash });
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
      ctx.font = `${Math.max(11, ppm * 0.28).toFixed(0)}px IBM Plex Mono, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (const [lx, ly, txt] of this.trapLabels) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(txt, lx + 1, ly + 1); ctx.fillStyle = txt.endsWith('!') ? '#ffb070' : 'rgba(235,240,230,0.9)'; ctx.fillText(txt, lx, ly); }
    }
    ctx.restore();

    // ================= POST =================
    // its red, crept into the water round him: the black of the deep turns a black-red
    if ((fx.redTint || 0) > 0.01) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen';
      const rg = ctx.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.1, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.75);
      rg.addColorStop(0, `rgba(110,4,10,${(0.42 * fx.redTint).toFixed(3)})`); rg.addColorStop(1, `rgba(150,6,12,${(0.62 * fx.redTint).toFixed(3)})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, this.W, this.H);
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
      e = { box, bl, frames: new Array(SPRITE_FRAMES), glows: new Array(SPRITE_FRAMES) };
      cache.set(key, e);
      if (cache.size > 900) cache.delete(cache.keys().next().value); // keep memory bounded
    }
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

  // One animation frame of a species, with the light from above worked in once instead of every
  // frame on screen: a shade along every belly (baked in), and a bright rim along every back (kept
  // as its own mask, laid on at the strength the depth and the daylight give).
  buildFrame(e, sp, f) {
    const c = document.createElement('canvas'); c.width = c.height = e.box;
    const x = c.getContext('2d'); x.translate(e.box / 2, e.box / 2);
    e.glows[f] = drawSpecies(x, sp, e.bl, (f / SPRITE_FRAMES) * SPRITE_PERIOD, 1, 0);
    x.setTransform(1, 0, 0, 1, 0, 0);
    const off = clamp(Math.round(0.035 * e.bl / fishDrawLen(sp.len)), 1, 3);
    // a solid outline first (see-through fins would otherwise leave lines across the body)
    // (grown by a pixel and shrunk back, which also closes hairline seams inside a drawing)
    // the working canvases are reused from frame to frame: only the frame and its highlight are kept
    const scratch = this.frameScratch || (this.frameScratch = [0, 1, 2].map(() => document.createElement('canvas')));
    const mk = (i) => { const k = scratch[i]; if (k.width < e.box || k.height < e.box) { k.width = k.height = Math.max(e.box, k.width); } const kx = k.getContext('2d'); kx.setTransform(1, 0, 0, 1, 0, 0); kx.globalCompositeOperation = 'source-over'; kx.globalAlpha = 1; kx.clearRect(0, 0, k.width, k.height); return k; };
    const grow = mk(0), gx = grow.getContext('2d');
    for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { gx.drawImage(c, ox, oy); gx.drawImage(c, ox, oy); }
    gx.globalCompositeOperation = 'source-in'; gx.fillStyle = '#fff'; gx.fillRect(0, 0, e.box, e.box);
    const sil = mk(1), sx = sil.getContext('2d');
    sx.drawImage(grow, 0, 0);
    sx.globalCompositeOperation = 'destination-in';
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sx.drawImage(grow, ox, oy);
    const edge = (dy, col, keep) => {
      let m;
      if (keep) { m = document.createElement('canvas'); m.width = m.height = e.box; } else m = mk(2);
      const mx = m.getContext('2d');
      mx.drawImage(sil, 0, 0);
      mx.globalCompositeOperation = 'destination-out'; mx.drawImage(sil, 0, dy);
      mx.globalCompositeOperation = 'source-in'; mx.fillStyle = col; mx.fillRect(0, 0, e.box, e.box);
      return m;
    };
    if (!e.hi) e.hi = new Array(SPRITE_FRAMES);
    e.hi[f] = edge(off, 'rgb(225,240,245)', true);
    const sh = edge(-off, 'rgb(4,10,18)', false);
    void sh; // (2.3.2: the belly shade is no longer laid on: the animals look better plain, and it switched on
    // and off as they crossed the size where they stop being drawn as simple school shapes)
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
      if (!e) { const box = Math.ceil(bl * 2.4); e = { box, bl, frames: new Array(SPRITE_FRAMES), glows: new Array(SPRITE_FRAMES) }; cache.set(key, e); }
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
    // the beach / dunes above water (right side)
    const S = this.S, Sy = this.Sy, ppm = this.cam.ppm;
    if (S(WORLD_W - 25) < W) {
      ctx.fillStyle = rgbStr(mixRgb([30, 28, 24], [196, 180, 146], Math.max(0.15, dayEff)));
      ctx.beginPath(); ctx.moveTo(S(WORLD_W - 28), Sy(0.2));
      for (let x = WORLD_W - 28; x <= WORLD_W + 60; x += 2) ctx.lineTo(S(x), Sy(Math.min(0.2, g.world.floorAt(Math.min(x, WORLD_W)) - (x > WORLD_W ? (x - WORLD_W) * 0.05 : 0)) + Math.sin(x * 0.3) * 0.1));
      ctx.lineTo(S(WORLD_W + 60), Sy(1)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgbStr(mixRgb([20, 24, 18], [80, 96, 56], Math.max(0.15, dayEff)));
      ctx.lineWidth = Math.max(1, ppm * 0.03);
      for (let k = 0; k < 30; k++) {
        const x = WORLD_W - 15 + k * 2.3, y = g.world.floorAt(Math.min(x, WORLD_W)) - (x > WORLD_W ? (x - WORLD_W) * 0.05 : 0);
        ctx.beginPath(); ctx.moveTo(S(x), Sy(y)); ctx.quadraticCurveTo(S(x + 0.2), Sy(y - 0.4), S(x + 0.4 + Math.sin(t + k) * 0.1), Sy(y - 0.7)); ctx.stroke();
      }
    }
  }

  drawFar(g, S, Sy, dayEff) {
    const ctx = this.ctx, cam = this.cam, ppm = cam.ppm, W = this.W, H = this.H;
    for (const [par, alpha, off] of [[0.35, 0.35, 70], [0.6, 0.45, 30]]) {
      ctx.fillStyle = rgbStr(sampleTable(WATER_ALBEDO, cam.y + 200), alpha);
      ctx.beginPath(); ctx.moveTo(-10, H + 10);
      for (let sx = -10; sx <= W + 20; sx += 20) {
        const wx = cam.x + (sx - W / 2) / ppm;
        const fx = cam.x + (wx - cam.x) / par; // parallax-scaled world x
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
        x.strokeStyle = 'rgba(235,250,255,1)'; x.lineCap = 'round';
        for (let k = 0; k < 9; k++) {
          x.lineWidth = 5 + (k % 3) * 3;
          for (const ox of [-256, 0, 256]) {
            x.beginPath();
            for (let yy = -8; yy <= 264; yy += 8) x.lineTo(ox + k * 28.4 + Math.sin(yy * 0.05 + k * 1.7) * 9 + yy * 0.3, yy);
            x.stroke();
          }
        }
        this.dapT = f.createPattern(c, 'repeat');
      }
      const sc = ppm * 2.6 * 9 / 256;
      this.dapT.setTransform(new DOMMatrix([sc, 0, 0, sc, (W / 2 - cam.x * ppm) % (256 * sc) + t * ppm * 0.4, -cam.y * ppm * 0.2]));
      const a = 0.16 * day;
      // fades out with depth: full at the surface, gone by 35 m
      const fg = Math.max(0, 1 - Math.max(0, dTop) / 35);
      f.globalAlpha = a * fg; f.fillStyle = this.dapT; f.fillRect(bx, by, bw, bh); f.globalAlpha = 1;
    }
    f.globalCompositeOperation = 'source-over';
    // light from above: a soft bright rim along every top edge and a shade along every belly,
    // found from the layer itself (what has nothing above it, what has nothing below it)
    if (rim && dBot > 0) {
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
      let mid = 0; for (let k = -4; k <= 4; k++) mid += g.world.floorAt(cam.x + k * 12); mid /= 9;
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
    const c = sampleTable(FLOOR_COL, midD);
    fg.addColorStop(0, rgbStr(c)); fg.addColorStop(0.15, rgbStr(mixRgb(c, [40, 36, 30], 0.35))); fg.addColorStop(1, rgbStr(mixRgb(c, [10, 10, 10], 0.75)));
    ctx.fillStyle = fg; ctx.fill();
    // grain texture
    ctx.save(); ctx.clip();
    // rock and sediment: large mottling and a fine grain, pinned to the world so they never swim
    this.texture(ctx, 'rock', 19, 0.22 + 0.25 * smoothstep(30, 400, camY), 'soft-light', S(0), Sy(0), area);
    if (ppm > 14) this.texture(ctx, 'grain', 2.7, 0.3, 'soft-light', S(0.37), Sy(0.61), area);
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
    ctx.restore();
    // lit edge
    ctx.strokeStyle = 'rgba(255,250,235,0.16)'; ctx.lineWidth = Math.max(1, ppm * 0.06);
    ctx.beginPath(); for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(S(x), Sy(g.world.floorAt(x)) + 1); ctx.stroke();
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

  drawKelpBackdrop(g, ppm, t) {
    const cam = this.cam;
    if (cam.x < EAST + 700 || cam.x > WORLD_W || cam.y > 120) return;
    if (!this.kelpBack || this.kelpBackWorld !== g.world) { this.bakeKelpBackdrop(g.world); this.kelpBackWorld = g.world; }
    const ctx = this.ctx, W = this.W, H = this.H, surfY = (H / 2) - cam.y * ppm;
    for (const L of this.lite ? this.kelpBack.slice(1) : this.kelpBack) { // lite: only the nearer layer
      const scale = ppm * L.f / L.PX;               // image pixels -> screen pixels
      const x0 = W / 2 + (L.X0 - cam.x) * ppm * L.f; // further layers slide slower and look smaller
      const bands = 8, bh = L.c.height / bands;
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
  bladeSprite(layer, v) {
    const key = layer * 3 + v, arr = this.bladeSprites || (this.bladeSprites = []);
    if (arr[key]) return arr[key];
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const x = c.getContext('2d'), dark = layer === 1 ? 0.75 : 1, droop = [0.05, 0.3, 0.55][v] * 128;
    const P = (q, e) => [128 * q, 32 + droop * q * q + e + q * q * 128 * 0.08];
    const left = [], right = [];
    for (let j = 0; j <= 10; j++) { const q = j / 10, w = 9 * Math.sin(Math.PI * Math.pow(q, 0.6)) * (1 + 0.15 * Math.sin(q * 13)); left.push(P(q, w)); right.push(P(q, -w)); }
    x.beginPath(); x.moveTo(left[0][0], left[0][1]);
    for (const p of left) x.lineTo(p[0], p[1]);
    for (let j = right.length - 1; j >= 0; j--) x.lineTo(right[j][0], right[j][1]);
    x.closePath();
    x.fillStyle = `rgba(${(122 * dark) | 0},${(96 * dark) | 0},${(34 * dark) | 0},0.78)`; x.fill();
    const m0 = P(0.05, 0), m1 = P(0.55, 0), m2 = P(0.92, 0);
    x.strokeStyle = `rgba(${(70 * dark) | 0},${(54 * dark) | 0},${(20 * dark) | 0},0.5)`; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(m0[0], m0[1]); x.quadraticCurveTo(m1[0], m1[1], m2[0], m2[1]); x.stroke();
    arr[key] = c;
    return c;
  }

  drawKelp(g, S, Sy, ppm, layer, x0, x1) {
    // Batched: every stalk of this layer goes into one path, every blade into another,
    // every bladder into a third - three draw calls for the whole forest.
    const ctx = this.ctx, t = g.time;
    const surf = g.surfY || (() => 0);
    const stalks = new Path2D(), bulbs = new Path2D(), blades = [];
    const len = 1.3 * ppm, wid = 0.24 * ppm, br = wid * 0.32;
    let any = false;
    for (let i = 0; i < g.world.kelp.length; i++) {
      const k = g.world.kelp[i];
      if ((i % 3 === 0 ? 1 : 0) !== layer) continue;
      if (k.x < x0 - 8 || k.x > x1 + 8) continue;
      const topY = k.base - k.h;
      if (k.base < this.cam.y - this.cam.h || topY > this.cam.y + this.cam.h) continue;
      any = true;
      const segs = Math.max(5, Math.floor(k.h / 1.9)); // (a blade every ~1.9 m: a third fewer draws, each a little longer)
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
        const ca = Math.cos(a), sa = Math.sin(a), pxp = -sa, pyp = ca;
        const bl = len * (0.9 + hsh * 0.8), bw = wid * (0.55 + hsh * 0.35);
        const bx = px + ca * br * 1.4, by = py + sa * br * 1.4;
        bulbs.moveTo(bx + br, by); bulbs.ellipse(bx, by, br, br * 0.8, a, 0, TAU);
        // the blade: a stored picture (one of three droops), turned, stretched and flipped into place
        const droopK = side * (0.05 + Math.floor(hsh * 3) * 0.2); // (3.0.10) each blade keeps its own droop picture and side: picking them by time made blades snap between pictures; the sway of the angle above carries the motion
        blades.push([bx, by, a, bl, bw, droopK]);
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
    const dark = layer === 1 ? 0.75 : 1;
    ctx.strokeStyle = rgbStr([70 * dark, 58 * dark, 26 * dark]);
    ctx.lineWidth = Math.max(1, ppm * 0.07);
    ctx.stroke(stalks);
    // blades: thin and a little see-through, golden-brown, a darker midrib down each (stored pictures)
    const M = ctx.getTransform();
    for (const [bx, by, a2, bl, bw, dk] of blades) {
      const flip = dk < 0 ? -1 : 1, v = Math.min(2, Math.floor(Math.abs(dk) / 0.2));
      const spr = this.bladeSprite(layer, v);
      const ca = Math.cos(a2), sa = Math.sin(a2), sx = bl / 128, sy = (bw / 9) * flip;
      // M x translate(bx,by) x rotate(a2) x scale(sx, sy)
      const a_ = ca * sx, b_ = sa * sx, c_ = -sa * sy, d_ = ca * sy;
      ctx.setTransform(M.a * a_ + M.c * b_, M.b * a_ + M.d * b_, M.a * c_ + M.c * d_, M.b * c_ + M.d * d_, M.a * bx + M.c * by + M.e, M.b * bx + M.d * by + M.f);
      ctx.drawImage(spr, 0, -32);
    }
    ctx.setTransform(M);
    ctx.fillStyle = `rgba(${(140 * dark) | 0},${(120 * dark) | 0},${(50 * dark) | 0},0.9)`;
    ctx.fill(bulbs);
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
    if (F && inView(F.x, F.y, 30)) {
      // a whale skeleton half sunk in the ooze: skull, a long spine, ribs, a carpet of bacteria
      const fy = (x) => W.floorAt(x);
      ctx.save();
      ctx.fillStyle = 'rgba(230,200,150,0.35)';
      ctx.beginPath(); ctx.ellipse(S(F.x), Sy(fy(F.x)) - ppm * 0.1, ppm * 11, ppm * 0.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#cfc6b0'; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, ppm * 0.35);
      ctx.beginPath(); ctx.moveTo(S(F.x - 7), Sy(fy(F.x - 7)) - ppm * 0.6);
      for (let x = F.x - 7; x <= F.x + 9; x += 1) ctx.lineTo(S(x), Sy(fy(x)) - ppm * (0.6 + 0.25 * Math.sin((x - F.x) * 0.25)));
      ctx.stroke();
      for (let k = 0; k < 11; k++) {
        const x = F.x - 5 + k * 1.15, by = Sy(fy(x)) - ppm * 0.6, h = ppm * (2.4 - Math.abs(k - 4) * 0.18);
        ctx.lineWidth = Math.max(1.5, ppm * 0.16);
        ctx.beginPath(); ctx.moveTo(S(x), by); ctx.quadraticCurveTo(S(x) + ppm * 1.2, by - h, S(x) + ppm * 0.4, by - h * 1.3); ctx.stroke();
      }
      // the skull: a long flat jaw and the cranium
      const sx = S(F.x - 7.5), sy = Sy(fy(F.x - 7.5));
      ctx.fillStyle = '#c8bea6';
      ctx.beginPath(); ctx.moveTo(sx + ppm * 1.2, sy - ppm * 0.4); ctx.quadraticCurveTo(sx - ppm * 1, sy - ppm * 2.2, sx - ppm * 4.5, sy - ppm * 0.6); ctx.lineTo(sx - ppm * 4.4, sy - ppm * 0.1); ctx.quadraticCurveTo(sx - ppm * 1, sy - ppm * 0.6, sx + ppm * 1.2, sy); ctx.fill();
      ctx.fillStyle = 'rgba(40,30,20,0.6)'; ctx.beginPath(); ctx.ellipse(sx - ppm * 0.4, sy - ppm * 0.9, ppm * 0.35, ppm * 0.25, 0, 0, TAU); ctx.fill();
      ctx.lineCap = 'butt';
      ctx.restore();
    }
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
      const blink = (t % 2.4) < 0.25;
      ctx.fillStyle = blink ? '#ff5040' : '#5a1a14'; ctx.beginPath(); ctx.arc(X(-3.2), Y(cy - R - 4.3), Math.max(2, m * 0.16), 0, TAU); ctx.fill();
      // the hull: a yellow cylinder, rounded ends, rust run down from every seam
      const hg = ctx.createLinearGradient(0, Y(cy - R), 0, Y(cy + R));
      hg.addColorStop(0, '#d8a83c'); hg.addColorStop(0.35, '#c08e2a'); hg.addColorStop(1, '#5e4210');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(X(x0), Y(cy - R), (x1 - x0) * m, R * 2 * m, R * m); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(X(x0), Y(cy - R), (x1 - x0) * m, R * 2 * m, R * m); ctx.clip();
      ctx.fillStyle = 'rgba(110,52,16,0.35)';
      for (let k = 0; k < 14; k++) { const rx = x0 + 0.5 + ((k * 2.37) % (x1 - x0 - 1)), len = 0.6 + ((k * 0.73) % 1.6); ctx.fillRect(X(rx), Y(cy - R + 0.2 + (k % 3) * 0.6), Math.max(1, m * 0.07), len * m); }
      ctx.strokeStyle = 'rgba(40,24,6,0.55)'; ctx.lineWidth = Math.max(1, m * 0.07);
      for (const rx of [-2.6, 0, 2.6]) { ctx.beginPath(); ctx.moveTo(X(rx), Y(cy - R)); ctx.lineTo(X(rx), Y(cy + R)); ctx.stroke(); } // the ring seams
      ctx.fillStyle = 'rgba(255,240,200,0.18)'; ctx.fillRect(X(x0), Y(cy - R * 0.72), (x1 - x0) * m, m * 0.22); // the shine along its top
      ctx.restore();
      // the portholes: warm light from inside, and now and then his head going past
      const dave = Math.sin(t * 0.21) * 0.5 + 0.5; // where he is in his hut (0 west .. 1 east)
      for (const px of [-2.0, 0.8]) {
        const pr = 0.62, wx = X(px), wy = Y(cy - 0.25);
        ctx.fillStyle = '#ffd890'; ctx.beginPath(); ctx.arc(wx, wy, pr * m, 0, TAU); ctx.fill();
        const hx = -3 + dave * 6.2; // his head and shoulders, when he passes this window
        if (Math.abs(hx - px) < 0.9) { ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, pr * m, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(60,34,14,0.85)'; ctx.beginPath(); ctx.arc(X(hx), wy + m * 0.05, m * 0.26, 0, TAU); ctx.fill(); ctx.fillRect(X(hx) - m * 0.45, wy + m * 0.28, m * 0.9, m * 0.5); ctx.restore(); }
        ctx.strokeStyle = '#5a5a52'; ctx.lineWidth = Math.max(1.5, m * 0.13); ctx.beginPath(); ctx.arc(wx, wy, pr * m, 0, TAU); ctx.stroke();
      }
      // the airlock: a short trunk at the east end, its hatch and the docking collar
      ctx.fillStyle = '#9a7424'; ctx.fillRect(X(x1 - 0.6), Y(cy - 1.1), m * 1.6, m * 2.2);
      ctx.fillStyle = '#4a4a44'; ctx.fillRect(X(x1 + 0.9), Y(cy - 1.4), m * 0.35, m * 2.8); // the collar
      ctx.fillStyle = '#6e6e66'; ctx.beginPath(); ctx.ellipse(X(x1 + 1.07), Y(cy), m * 0.14, m * 1.05, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,140,0.9)'; ctx.beginPath(); ctx.arc(X(x1 + 0.35), Y(cy - 1.45), Math.max(1.5, m * 0.13), 0, TAU); ctx.fill(); // the lamp over the hatch
      // the sign on the roof: a plank on two posts, hand-painted
      const sx0 = X(-1.6), sy0 = Y(cy - R - 1.9), sw = 4.6 * m, sh = 1.15 * m;
      ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = Math.max(1.5, m * 0.1);
      for (const q of [0.15, 0.85]) { ctx.beginPath(); ctx.moveTo(sx0 + sw * q, sy0 + sh); ctx.lineTo(sx0 + sw * q, Y(cy - R + 0.1)); ctx.stroke(); }
      ctx.fillStyle = '#6e4e2c'; ctx.beginPath(); ctx.moveTo(sx0, sy0 + m * 0.05); ctx.lineTo(sx0 + sw, sy0 - m * 0.08); ctx.lineTo(sx0 + sw, sy0 + sh - m * 0.04); ctx.lineTo(sx0, sy0 + sh); ctx.fill();
      if (m > 5) {
        ctx.fillStyle = '#f0e2b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.round(m * 0.52)}px Georgia, serif`; ctx.fillText("DAVE'S HAUL", sx0 + sw / 2, sy0 + sh * 0.42);
        ctx.fillStyle = '#e8584a'; ctx.font = `700 ${Math.round(m * 0.3)}px Georgia, serif`; ctx.fillText('· OPEN ·', sx0 + sw / 2, sy0 + sh * 0.84);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      // the junk: a net strung from the mast to a post, glass floats, crates, a drum, an anchor, a tyre
      ctx.strokeStyle = 'rgba(150,150,120,0.55)'; ctx.lineWidth = 1;
      const nx0 = -3.2, ny0 = cy - R - 2.8, nx1 = -8.5, ny1 = -2.6;
      for (let k = 0; k <= 8; k++) { const q = k / 8; ctx.beginPath(); ctx.moveTo(X(nx0 + (nx1 - nx0) * q), Y(ny0 + (ny1 - ny0) * q)); ctx.lineTo(X(nx0 + (nx1 - nx0) * q - 0.3), Y(ny0 + (ny1 - ny0) * q + 1.6 + Math.sin(q * Math.PI) * 0.8 + Math.sin(t * 0.6 + k) * 0.08)); ctx.stroke(); }
      ctx.beginPath(); for (let k = 0; k <= 8; k++) { const q = k / 8; const xx = X(nx0 + (nx1 - nx0) * q - 0.3), yy = Y(ny0 + (ny1 - ny0) * q + 1.6 + Math.sin(q * Math.PI) * 0.8); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      ctx.strokeStyle = '#2e2e2a'; ctx.lineWidth = Math.max(1.5, m * 0.12); ctx.beginPath(); ctx.moveTo(X(nx1), Y(0)); ctx.lineTo(X(nx1), Y(ny1 - 0.2)); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,40,36,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(nx0), Y(ny0)); ctx.lineTo(X(nx1), Y(ny1)); ctx.stroke();
      for (const [fx, fy, c] of [[-4.6, ny0 + 0.9, '#e0702a'], [-6.2, ny0 + 1.6, '#3a8a7a'], [-7.6, ny1 - 0.1, '#e0702a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(fx), Y(fy + 0.5), m * 0.32, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(X(fx) - m * 0.1, Y(fy + 0.4), m * 0.1, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#5a4026'; ctx.fillRect(X(6.8), Y(-0.9), m * 1.1, m * 0.9); ctx.fillStyle = '#4a3420'; ctx.fillRect(X(7.2), Y(-1.6), m * 0.9, m * 0.7); // crates
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(X(6.8), Y(-0.9), m * 1.1, m * 0.9); ctx.strokeRect(X(7.2), Y(-1.6), m * 0.9, m * 0.7);
      ctx.fillStyle = '#2a4a6a'; ctx.fillRect(X(-6.4), Y(-1.2), m * 0.8, m * 1.2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X(-6.4), Y(-0.8), m * 0.8, m * 0.1); // a drum
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
      const hang = (hx, hy, w, h, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X(hx - w / 2), Y(hy)); ctx.lineTo(X(hx + w / 2), Y(hy)); ctx.lineTo(X(hx + w / 2 + Math.sin(t * 0.7 + hx) * 0.08), Y(hy + h)); ctx.lineTo(X(hx - w / 2 + Math.sin(t * 0.7 + hx) * 0.08), Y(hy + h)); ctx.closePath(); ctx.fill(); };
      const lineY = (x) => ny0 + (ny1 - ny0) * ((x - nx0) / (nx1 - nx0));
      hang(-5.4, lineY(-5.4), 0.7, 1.7, '#16181a'); ctx.fillStyle = '#16181a'; ctx.fillRect(X(-5.75), Y(lineY(-5.4) + 0.15), m * 0.7 * 0.32, m * 0.9); // the suit, an arm hanging down
      hang(-7.0, lineY(-7.0), 0.55, 0.9, '#a84a3a'); ctx.fillStyle = 'rgba(240,220,180,0.6)'; ctx.fillRect(X(-7.27), Y(lineY(-7.0) + 0.35), m * 0.55, m * 0.08); // a striped towel
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
      ctx.save(); ctx.strokeStyle = 'rgba(170,160,130,0.16)'; ctx.lineWidth = 1;
      for (let k = 0; k < 70; k++) {
        const q = (t * 0.05 + k * 0.6180339) % 1;
        const x = CANYON.x1 - q * (CANYON.x1 - CANYON.x0), y = this.cam.y - this.cam.h / 2 + ((k * 0.381966 + q * 0.12) % 1) * this.cam.h;
        if (y < CANYON.top || y > W.floorAt(x) - 1) continue;
        ctx.beginPath(); ctx.moveTo(S(x), Sy(y)); ctx.lineTo(S(x + 1.4), Sy(y - 0.4)); ctx.stroke();
      }
      ctx.restore();
    }
    // the old one: a giant anglerfish filling the back of the cave, her lure hanging at its mouth
    if (inView(ANGLER.x, ANGLER.y, 30)) {
      const sp = SPECIES_BY_ID[100], L = ANGLER.len * ppm, bob = Math.sin(t * 0.35) * 0.3;
      ctx.save(); ctx.translate(S(ANGLER.x), Sy(ANGLER.y + bob)); ctx.scale(-1, 1);
      const r = drawSpecies(ctx, sp, L, t * 0.25, 0.1, 0);
      ctx.restore();
      if (r && r[0]) this.escaW = { x: ANGLER.x - r[0][0] / ppm, y: ANGLER.y + bob + r[0][1] / ppm };
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
      case 'lure':
        ctx.strokeStyle = '#2a2420'; ctx.lineWidth = u * 0.04;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(u * 0.2, -u * 0.3, u * 0.05, -u * 0.5); ctx.stroke();
        ctx.fillStyle = '#d8f2ff'; ctx.beginPath(); ctx.arc(u * 0.05, -u * 0.55, u * 0.07, 0, TAU); ctx.fill();
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

  drawLure(ctx, x, y, ppm, t) {
    ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.arc(x, y, ppm * 0.08, 0, TAU); ctx.fill();
  }

  drawSnow(g, S, Sy, ppm, x0, x1, y0, y1) {
    const ctx = this.ctx, t = g.time;
    const cell = 2.2;
    ctx.fillStyle = 'rgba(225,232,236,0.5)';
    const cx0 = Math.floor(x0 / cell), cx1 = Math.ceil(x1 / cell), cy0 = Math.floor(Math.max(0.5, y0) / cell), cy1 = Math.ceil(y1 / cell);
    for (let i = cx0; i <= cx1; i++) for (let j = cy0; j <= cy1; j++) {
      const h = Math.abs(Math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1;
      if (h > 0.55) continue;
      const h2 = Math.abs(Math.sin(i * 269.5 + j * 183.3) * 13758.5453) % 1;
      const x = i * cell + h * cell + Math.sin(t * 0.3 + h * 10) * 0.3;
      let y = j * cell + ((h2 * cell + t * 0.05 * (0.5 + h)) % cell);
      const s = Math.max(1, ppm * (0.02 + h2 * 0.03));
      ctx.fillRect(S(x), Sy(y), s, s);
    }
  }

  buildLightmap(g, S, Sy, ppm, head, subLamps, glowPts, horizon, surfY) {
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
      const a0 = 0.5 * reach * (fx.safeK ?? 1), front = 0.15 + reach * 0.5;
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
    const flick = (fx.torchShift > 0.6 ? (Math.random() < 0.06 ? 0.3 : 1) : 1) * fx.lightPulse;
    if (head && e.lampOn) {
      const ang = this.lampAngle(g, e, head);
      cone(head.x, head.y, ang, 17 * ppm * (e.nightSet ? 1.5 : 1), 0.32 * (e.nightSet ? 1.2 : 1), beamCol, 0.95 * TORCH * flick); // (the Night Shift set: half as far again)
      radial(head.x, head.y, 3.2 * ppm, beamCol, 0.3 * TORCH * flick); lamps.push({ x: head.x, y: head.y, r: 3.2 * ppm, a: 0.3 * TORCH * flick });
    }
    if (g.necklaceOn) { // (4.0.0) the glow stick: warm amber, wide; in the sub it fills the cabin and lights the water round her
      const fade = Math.min(1, (g.glowT || 0) / 8), fl = 0.94 + 0.06 * Math.sin(g.time * 7.3) * Math.sin(g.time * 2.1);
      const gx = e.inSub ? S(g.sub.x) : S(e.x), gy = e.inSub ? Sy(g.sub.y) : Sy(e.y), gr = (e.inSub ? 13 : 10) * ppm;
      radial(gx, gy, gr, [255, 178, 92], 0.75 * fade * fl); radial(gx, gy, gr * 0.35, [255, 205, 140], 0.45 * fade * fl);
      lamps.push({ x: gx, y: gy, r: gr, a: 0.75 * fade });
    }
    if (e.biolum && e.lampOn && !e.inSub) { const gc = hexToRgb(e.glows && e.glows[0] || '#8af0d0'), br = (4 + 1.5 * e.biolum) * ppm, pulse = 0.85 + 0.15 * Math.sin(g.time * 1.3); radial(S(e.x), Sy(e.y), br, gc, 0.45 * pulse); lamps.push({ x: S(e.x), y: Sy(e.y), r: br, a: 0.45 }); } // (2.8.0) Bioluminescence: his gear glows while his light is on
    if (g.legend) { // the legendary moment: a pale light comes up on it, and fades
      const c = g.legend.c, k = Math.min(1, g.legend.t / 1.5) * Math.min(1, (8 - g.legend.t) / 2.5);
      radial(S(c.x), Sy(c.y), Math.max(7, c.len * 4) * ppm, [215, 232, 240], 0.95 * k); radial(S(c.x), Sy(c.y), Math.max(3, c.len * 1.6) * ppm, [235, 242, 246], 0.6 * k); lamps.push({ x: S(c.x), y: Sy(c.y), r: Math.max(7, c.len * 4) * ppm, a: 0.95 * k });
    }
    this.netLamp = null;
    if (subLamps) {
      const sub = g.sub;
      const sx = S(sub.x), sy = Sy(sub.y);
      const cy = Math.cos(sub.yaw), sxs = (cy >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy));
      const vis = Math.pow(Math.abs(cy), 0.7); // beams swing towards/away from us while turning
      const ang = sxs > 0 ? sub.tilt : Math.PI - sub.tilt;
      const lp = (p) => [sx + p[0] * sxs, sy + p[1]];
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
    for (const lt of g.world.lanterns) {
      const x = S(lt.x), y = Sy(lt.y);
      if (x < -400 || x > this.W + 400 || y < -400 || y > this.H + 400) continue;
      const r = (6 + 7 * lt.charge + lt.active * 3) * ppm;
      radial(x, y, r, hsl(lt.hue, 0.6, 0.6), 0.75 * (0.4 + 0.6 * lt.charge));
    }
    for (const p of g.world.pickups) {
      if (p.taken) continue;
      if (p.type === 'sapphire' || p.type === 'lure') {
        const x = S(p.x), y = Sy(p.y);
        if (x < -100 || x > this.W + 100 || y < -100 || y > this.H + 100) continue;
        radial(x, y, (p.type === 'lure' ? 2.5 : 1.6 * (1 + 0.8 * (e.prospector || 0))) * ppm, p.type === 'lure' ? [170, 230, 255] : [80, 120, 255], p.type === 'lure' ? 0.5 : 0.5 + 0.1 * (e.prospector || 0)); // (Prospector: sapphires shine from farther off)
      }
    }
    if (g.lure) radial(S(g.lure.x), Sy(g.lure.y), (g.lure.old ? 12 : 8) * ppm, g.lure.old ? [120, 170, 255] : [170, 230, 255], 0.9);
    if (this.escaW) { radial(S(this.escaW.x), Sy(this.escaW.y), 16 * ppm, [150, 220, 255], 0.75 + 0.15 * Math.sin(g.time * 1.7)); radial(S(this.escaW.x + 4), Sy(this.escaW.y + 6), 30 * ppm, [120, 190, 230], 0.35); radial(S(TABLE.x0 + 10), Sy(TABLE.y - 3), 18 * ppm, [140, 200, 225], 0.45); lamps.push({ x: S(TABLE.x0 + 10), y: Sy(TABLE.y - 3), r: 18 * ppm, a: 0.45 }); } // (3.0.0) and further: the sea round her, and her table
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
      const a = rayStrength * (0.05 + 0.04 * Math.sin(t * 0.4 + k * 1.3));
      for (const [wm, am] of [[2.2, 0.3], [1.4, 0.35], [0.7, 0.35]]) {
        const gg = ctx.createLinearGradient(0, top, 0, top + len);
        gg.addColorStop(0, `rgba(210,240,255,${(a * am).toFixed(3)})`); gg.addColorStop(1, 'rgba(210,240,255,0)');
        ctx.fillStyle = gg;
        const ww = w * wm;
        ctx.beginPath(); ctx.moveTo(sx - ww, top); ctx.lineTo(sx + ww, top); ctx.lineTo(sx + ww * 2 + w + len * 0.18, top + len); ctx.lineTo(sx - ww + len * 0.18, top + len); ctx.closePath(); ctx.fill();
      }
    }
  }

  drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff) {
    const ctx = this.ctx, cam = this.cam, fx = g.fx, t = g.time;
    // god rays near the surface
    const rayStrength = dayEff * clamp(1 - cam.y / 110, 0, 1) * (1 - fx.darken * 0.7);
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
      const lx = S(sub.x) + subLamps.lampA[0] * sxs, ly = Sy(sub.y) + subLamps.lampA[1];
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
    if (g.lure) halo(S(g.lure.x), Sy(g.lure.y), ppm * 1.5, [180, 235, 255], 0.6);
    if (this.escaW) halo(S(this.escaW.x), Sy(this.escaW.y), ppm * 2.2, [170, 230, 255], 0.7 * haze);
    for (const p of g.world.pickups) {
      if (p.taken || (p.type !== 'sapphire' && p.type !== 'lure')) continue;
      const x = S(p.x), y = Sy(p.y);
      if (x < -50 || x > this.W + 50 || y < -50 || y > this.H + 50) continue;
      halo(x, y - ppm * 0.2, ppm * 0.5, p.type === 'lure' ? [190, 240, 255] : [90, 140, 255], 0.35 * haze + 0.1);
    }
    if (g.necklaceOn) { const fade = Math.min(1, (g.glowT || 0) / 8); if (e.inSub) halo(S(g.sub.x), Sy(g.sub.y), ppm * 4.5, [255, 180, 96], 0.16 * fade); else halo(S(e.x), Sy(e.y), ppm * 3.2, [255, 180, 96], 0.3 * fade); }
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
