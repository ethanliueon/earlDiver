// Scene renderer: sky, sea surface, water, terrain, life, Earl, and the light model.
// Light model: the scene is drawn in "true" colour, then multiplied by a lightmap
// (ambient that fades with depth and loses red, plus lamps and bioluminescence),
// then additive glows are layered on top.
import { clamp, lerp, smoothstep, sampleTable, rgbStr, TAU, fbm1, noise1, hexToRgb, mixRgb } from './util.js';
import { drawSpecies } from './creatures_draw.js';
import { SPECIES } from './species.js';
import { drawEarl, drawSub, drawBoat, drawEntityShape, drawEntity } from './earl_draw.js';
import { activeTool } from './capture.js';
import { drawDart, drawTrap, drawBuoy } from './tools_draw.js';
import { armPose } from './arm.js';
import { drawAquarium } from './aquarium_draw.js';
import { aquariumOf, visitors } from './aquarium.js';
import { makeVariantSprite } from './variants.js';
import { SPECIES_BY_ID } from './species.js';
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
export const fishDrawLen = (len) => len * 1.6 + 0.08 * Math.exp(-len * 4);
// Earl's height in metres
export const EARL_H = 1.0;
const SPRITE_PERIOD = (Math.PI * 2) / 3, SPRITE_FRAMES = 32;
const CACHE_SKIP = new Set(['jelly', 'siphonophore', 'manowar', 'oarfish', 'gulper', 'dragon', 'comb', 'eel', 'viper', 'sperm', 'orca', 'dolphin']); // what's left of a beam after a few metres of seawater

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
function bioPulse(c, t) {
  const rate = 0.45 + (c.wob % 1) * 0.6;
  return (0.8 + 0.2 * Math.sin(t * rate + c.wob)) * (c.fleeT > 0 ? 1.7 : 1);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * this.quality;
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
    const targetView = g.debugView || (g.mode === 'menu' ? 40 : (e.inSub ? 46 : 26) * (this.zoomMul || 1));
    this.viewW = lerp(this.viewW, targetView, 1 - Math.exp(-dt * 1.2));
    const ppm = this.W / this.viewW;
    const cam = this.cam;
    cam.w = this.viewW; cam.h = this.H / ppm; cam.ppm = ppm;
    const lookX = e.vx * 0.9, lookY = e.vy * 0.6;
    let tx = e.x + lookX, ty = e.y + lookY;
    ty = Math.max(ty, -cam.h * 0.18); // let a little sky show near the surface
    if (g.mode === 'menu') { tx = BOAT.x - 7 + Math.sin(g.time * 0.05) * 3; ty = 5.5; }
    // a jump (new dive, respawn) cuts straight there instead of sweeping across the map
    if (Math.hypot(cam.x - tx, cam.y - ty) > 80) { cam.x = tx; cam.y = ty; }
    const k = 1 - Math.exp(-dt * (g.mode === 'menu' ? 0.6 : 3));
    cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k);
    cam.x = clamp(cam.x, cam.w / 2 - 20, WORLD_W - cam.w / 2 + 25);
  }

  render(g) {
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
    if (horizon > -50) this.drawSky(g, horizon, dayEff, day);
    // Earl's aquarium on the far shore, at the horizon (far away: small, and it barely moves)
    if (g.profile && horizon > -20 && horizon < H + 200) {
      const A = aquariumOf(g.profile), sc = ppm * 0.11;
      const ax = W / 2 + (WORLD_W + 100 - cam.x) * ppm * 0.035;
      if (ax > -80 * sc && ax < W + 80 * sc) {
        const cw = Math.ceil(130 * sc), ch = Math.ceil(36 * sc);
        const ac = this.aqC || (this.aqC = document.createElement('canvas'));
        if (ac.width !== cw || ac.height !== ch) { ac.width = cw; ac.height = ch; }
        const x2 = ac.getContext('2d');
        x2.setTransform(1, 0, 0, 1, 0, 0); x2.globalCompositeOperation = 'source-over'; x2.clearRect(0, 0, cw, ch);
        x2.translate(cw / 2, ch - 2 * sc);
        drawAquarium(x2, sc, A.wings, t, dayEff, Math.round(visitors(g.profile) / 40));
        const dim = 1 - (0.25 + 0.75 * Math.sqrt(dayEff));
        if (dim > 0.01) { x2.setTransform(1, 0, 0, 1, 0, 0); x2.globalCompositeOperation = 'source-atop'; x2.fillStyle = `rgba(6,8,14,${(dim * 0.85).toFixed(3)})`; x2.fillRect(0, 0, cw, ch); }
        ctx.drawImage(ac, ax - cw / 2, horizon - ch + 3 * sc);
      }
    }

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
      const len = 30 * ppm, a = 0.26 * f.fade;
      // drawn small and scaled up: that is the blur, at almost no cost
      const sc = this.shadowC || (this.shadowC = document.createElement('canvas'));
      const sw = 64, sh = 32;
      if (sc.width !== sw) { sc.width = sw; sc.height = sh; }
      const sctx = sc.getContext('2d');
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, sw, sh);
      sctx.translate(sw * 0.42, sh * 0.45); sctx.scale(f.dir, 1);
      drawEntityShape(sctx, sw * 0.62, t * 0.5, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sc, S(f.x) - len * 0.68, Sy(f.y) - len * 0.36, len * 1.6, len * 0.8);
      ctx.restore();
    }

    // painted kelp forests far behind (baked once, high detail, gently swaying)
    this.drawKelpBackdrop(g, ppm, t);
    // ================= TERRAIN & STRUCTURES =================
    for (const w of g.world.wrecks) if (Math.abs(w.x - cam.x) < cam.w / 2 + w.len) this.drawWreck(ctx, w, S, Sy, ppm);
    this.drawKelp(g, S, Sy, ppm, 0, x0, x1);
    for (const v of g.world.vents) if (inView(v.x, v.y, 30)) this.drawVent(ctx, v, S, Sy, ppm, t);
    this.drawFloor(g, S, Sy, ppm, x0, x1);
    this.drawFloorLife(g, ctx, S, Sy, ppm, x0, x1, t);
    for (const rk of g.world.rocks) if (rk.x1 > x0 && rk.x0 < x1 && rk.y1 > y0 && rk.y0 < y1) this.drawRock(ctx, rk, S, Sy, ppm);
    this.drawDeepPlaces(g, ctx, S, Sy, ppm, t, inView);
    // statics on the floor
    const glowPts = [];
    const sl = this.layerBegin(ctx); // statics: drawn on a layer, then veiled by the water
    for (const s of g.world.statics) {
      if (s.x < x0 - 3 || s.x > x1 + 3 || s.y < y0 - 6 || s.y > y1 + 6) continue;
      const L = Math.max(0.18, s.sp.len) * s.scale * ppm;
      this.lgrow(S(s.x), Sy(s.y) - L * 0.5, L * 1.3);
      sl.save(); sl.translate(S(s.x), Sy(s.y)); sl.scale(s.flip, 1);
      const r = s.variant ? this.drawVariant(sl, s.sp, s.variant, L, t * 0.3 + s.phase) : drawSpecies(sl, s.sp, L, t + s.phase, 0.3, s.phase);
      sl.restore();
      if (s.variant === 'crimson') glowPts.push([S(s.x), Sy(s.y) - L * 0.3, '#ff3018', Math.max(ppm * 0.6, L * 0.6), 1]);
      if (r && s.sp.v.glow) glowPts.push([S(s.x), Sy(s.y), s.sp.v.glow, L]);
    }
    this.layerEnd(ctx, g, sl);
    // ---- pickups + lanterns ----
    for (const p of g.world.pickups) if (!p.taken && inView(p.x, p.y)) this.drawPickup(ctx, p, S(p.x), Sy(p.y), ppm, t);
    for (const l of g.world.lanterns) if (inView(l.x, l.y, 14)) this.drawLanternBody(ctx, l, S, Sy, ppm, t);
    // traps on the bottom, their lines up to the buoys
    for (const tr of g.traps || []) {
      const by = surfY(tr.x);
      if (tr.x < x0 - 4 || tr.x > x1 + 4) continue;
      const list = tr.catch.map((c) => ({ sp: SPECIES_BY_ID[c.id], len: c.len }));
      ctx.save(); ctx.translate(S(tr.x), Sy(tr.y)); ctx.rotate(Math.sin(t * 0.7 + tr.sway) * (tr.state === 'hauling' ? 0.15 : 0.02));
      const r = drawTrap(ctx, ppm, tr.type, t, list);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,180,120,0.55)'; ctx.lineWidth = Math.max(1, ppm * 0.02);
      ctx.beginPath(); ctx.moveTo(S(tr.x), Sy(tr.y) + r.top);
      ctx.quadraticCurveTo(S(tr.x) + Math.sin(t * 0.4 + tr.sway) * ppm * 1.5, (Sy(tr.y) + r.top + Sy(by)) / 2, S(tr.x), Sy(by)); ctx.stroke();
      if (Sy(by) > -40 && Sy(by) < this.H + 40) { ctx.save(); ctx.translate(S(tr.x), Sy(by)); drawBuoy(ctx, ppm, t); ctx.restore(); }
      if (tr.type === 'deep' && r.glow) glowPts.push([S(tr.x) + r.glow[0], Sy(tr.y) + r.glow[1], '#9affd8', ppm * 0.8, 1]);
    }
    if (g.lure) this.drawLure(ctx, S(g.lure.x), Sy(g.lure.y), ppm, t);

    // ---- fauna ----
    // Fish are drawn nose at -x, so a fish heading right (+x) is mirrored, and the tilt is negated
    // so the nose follows the direction of travel (a fish swimming down points down).
    // Small fish are batched per species: one path for all their backs, one for all their bellies,
    // one for the silver flashes - a whole school costs three draw calls.
    const fl = this.layerBegin(ctx); // the fauna, on a layer the water veils
    const baseM = fl.getTransform();
    const batches = new Map();
    let glowSkip = 0;
    for (const c of g.fauna.list) {
      if (!inView(c.x, c.y, c.len)) continue;
      const Ld = fishDrawLen(c.len) * ppm;
      this.lgrow(S(c.x), Sy(c.y), Ld * 1.4);
      const shape = c.sp.v.s;
      const tilt = clamp(Math.atan2(c.hvy !== undefined ? c.hvy : c.vy, Math.max(Math.abs(c.vx), c.hvy !== undefined ? c.speed * 0.8 : 0) + 0.2), -0.5, 0.5);
      if (Ld < 20 && !c.variant && (shape === 'fish' || shape === 'shrimp' || shape === 'hatchet')) {
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
        if (c.sp.v.glow && (glowSkip++ % 3 === 0)) glowPts.push([x, y, c.sp.v.glow, Math.max(1.5, Ld * 0.3), 0.3 * bioPulse(c, t), 0.6]);
        continue;
      }
      fl.save(); fl.translate(S(c.x), Sy(c.y));
      if (c.dir > 0) fl.scale(-1, 1);
      fl.rotate(c.sp.v.hab === 'drift' ? 0 : -tilt);
      const r = c.variant ? this.drawVariant(fl, c.sp, c.variant, Ld, c.phase) : this.drawCached(fl, c.sp, Ld, c.phase, c.wob);
      fl.restore();
      // a research tag trailing from a tagged animal
      if (c.tagged) {
        const tx = S(c.x) + (c.dir > 0 ? -1 : 1) * Ld * 0.05, ty = Sy(c.y) - Ld * 0.08;
        fl.strokeStyle = '#e8b02a'; fl.lineWidth = Math.max(1, ppm * 0.03); fl.lineCap = 'round';
        fl.beginPath(); fl.moveTo(tx, ty); fl.quadraticCurveTo(tx - c.dir * Ld * 0.08, ty - Ld * 0.06 + Math.sin(t * 8 + c.wob) * Ld * 0.02, tx - c.dir * Ld * 0.16, ty - Ld * 0.03); fl.stroke();
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
    for (const bt of batches.values()) {
      fl.fillStyle = bt.sp.v.c[0]; fl.fill(bt.back);
      fl.fillStyle = bt.sp.v.c[1]; fl.fill(bt.belly);
      if (bt.nf) { fl.fillStyle = 'rgba(235,245,250,0.7)'; fl.fill(bt.flash); }
      fl.fillStyle = '#0a0a0a'; fl.fill(bt.eyes);
    }
    fl.setTransform(baseM);
    this.layerEnd(ctx, g, fl, !this.lite);
    // brackets around what the net, slurp gun or claw will go for
    const ctg = g.mode === 'play' ? g.catchTarget : null;
    if (ctg) {
      const tx = ctg.c ? ctg.c.x : ctg.x, ty = ctg.c ? ctg.c.y : ctg.y;
      const r = Math.max(ppm * 0.35, fishDrawLen(ctg.len) * ppm * 0.6), rh = Math.max(ppm * 0.28, r * 0.6), k = r * 0.3;
      const cx = S(tx), cy = Sy(ty), a = 0.45 + 0.25 * Math.sin(t * 5);
      ctx.strokeStyle = ctg.col || 'rgb(200,240,210)'; ctx.globalAlpha = a; ctx.lineWidth = Math.max(1, ppm * 0.03);
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(cx + sx * r, cy + sy * rh - sy * k); ctx.lineTo(cx + sx * r, cy + sy * rh); ctx.lineTo(cx + sx * r - sx * k, cy + sy * rh);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // the entity's body, lit by the same light as everything else (invisible in the dark)
    const entB = g.entity;
    if (entB && g.mode !== 'menu' && inView(entB.x, entB.y, 45) && entB.dist < 90) {
      const toward = entB.dist < 70 ? (g.earl.x >= entB.x ? 1 : -1) : (Math.cos(entB.heading) >= 0 ? 1 : -1);
      entB.face = lerp(entB.face ?? toward, toward, 0.02);
      const flipB = entB.face >= 0 ? -1 : 1;
      ctx.save(); ctx.translate(S(entB.x), Sy(entB.y)); ctx.scale(flipB, 1);
      drawEntity(ctx, 34 * ppm, t, g.reveal ? 1 : clamp((90 - entB.dist) / 50, 0, 1) * (entB.fade ?? 1), g.reveal ? 0.9 : 0.3 * (entB.fade ?? 1));
      ctx.restore();
      // at the bottom it shows itself: a faint light of its own along the whole length
      if (g.reveal) {
        const k = clamp(Math.min(g.reveal.t / 4, (26 - g.reveal.t) / 4), 0, 1);
        for (let i = -3; i <= 3; i++) glowPts.push([S(entB.x) + i * ppm * 4.5, Sy(entB.y) + Math.sin(i + t) * ppm, '#4a6a78', ppm * 9, 0.8 * k]);
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
      crane = drawBoat(bctx, 14 * ppm, t, g.sub);
      const dimB = 1 - (0.22 + 0.78 * Math.sqrt(dayEff));
      if (dimB > 0.01) { bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'source-atop'; bctx.fillStyle = `rgba(4,6,10,${dimB.toFixed(3)})`; bctx.fillRect(0, 0, bw, bh); }
      ctx.drawImage(bc, -bw * 0.45, -bh * 0.82);
      if (dayEff < 0.5) {
        // the cabin light stays on at night
        const a = (0.5 - dayEff) * 1.6;
        ctx.fillStyle = `rgba(255,196,120,${(0.85 * a).toFixed(3)})`;
        const u = 14 * ppm / 100;
        for (let k = 0; k < 3; k++) ctx.fillRect(-3 * u + k * 8 * u, -26 * u, 5 * u, 5 * u);
        this.boatLight = { x: boatX + 6 * u, y: boatY - 24 * u, a };
      } else this.boatLight = null;
      ctx.restore();
    } else this.boatLight = null;
    const sub = g.sub;
    let subLamps = null;
    if (!sub.imploded && inView(sub.x, sub.y, 10)) {
      if (crane && sub.docked) {
        ctx.strokeStyle = 'rgba(30,30,28,0.9)'; ctx.lineWidth = Math.max(1, ppm * 0.05);
        ctx.beginPath(); ctx.moveTo(boatX + crane.craneTip[0], boatY + crane.craneTip[1]); ctx.lineTo(S(sub.x), Sy(sub.y) - 2.6 * ppm); ctx.stroke();
      }
      const cy = Math.cos(sub.yaw), sxs = (cy >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy));
      ctx.save(); ctx.translate(S(sub.x), Sy(sub.y)); ctx.rotate(sub.tilt * Math.sign(sxs)); ctx.scale(sxs, 1);
      // running lights on while the autopilot is driving it, so it can be seen coming
      // its lamps stay as he left them when he climbs out (off while docked at the boat)
      const lights = (sub.lightsOn && !sub.docked) || (g.autopilot && g.autopilot.state !== 'idle' && !sub.docked);
      // the arm reaching: its target, in the sub's own (flipped, tilted) frame
      let armArg = null;
      const ap = armPose(g);
      if (ap) {
        const cy0 = Math.cos(sub.yaw), sx0 = (cy0 >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(cy0)), rr = -sub.tilt * Math.sign(sx0);
        const dx = (ap.tx - sub.x) * ppm, dy = (ap.ty - sub.y) * ppm;
        armArg = { ext: ap.ext, closed: ap.closed, sp: ap.sp, len: ap.len, lx: (dx * Math.cos(rr) - dy * Math.sin(rr)) / sx0, ly: dx * Math.sin(rr) + dy * Math.cos(rr) };
      }
      const r = drawSub(ctx, 9 * ppm, t, sub.stress, lights, armArg);
      ctx.restore();
      // mid-turn the hull is seen nearly bow-on: draw its round cross-section over the squashed side view
      const bow = clamp(1 - Math.abs(cy) / 0.5, 0, 1);
      if (bow > 0) {
        const u2 = 9 * ppm / 100, bx = S(sub.x), by = Sy(sub.y);
        ctx.save(); ctx.globalAlpha = bow;
        const hg = ctx.createRadialGradient(bx - 4 * u2, by - 14 * u2, 1, bx, by - 9 * u2, 13 * u2);
        hg.addColorStop(0, '#727a6c'); hg.addColorStop(1, '#262a24');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(bx, by - 9 * u2, 11 * u2, 11.5 * u2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3e443b'; ctx.fillRect(bx - 4 * u2, by - 27 * u2, 8 * u2, 8 * u2);
        const sg = ctx.createRadialGradient(bx - 4 * u2, by + 6 * u2, 1, bx, by + 10 * u2, 13 * u2);
        sg.addColorStop(0, '#7a8070'); sg.addColorStop(1, '#1e211c');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(bx, by + 10 * u2, 13 * u2, 0, TAU); ctx.fill();
        ctx.fillStyle = lights ? '#f0cf96' : '#2a261e'; ctx.beginPath(); ctx.arc(bx, by + 8 * u2, 3.4 * u2, 0, TAU); ctx.fill();
        if (lights) { ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.arc(bx + 6 * u2, by - 6 * u2, 1.6 * u2, 0, TAU); ctx.fill(); }
        ctx.restore();
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
    if (!e.inSub && !g.helm && g.mode !== 'menu') { // at the helm he is inside the wheelhouse
      const amb = ambientAt(e.y, dayEff);
      ctx.save(); ctx.translate(S(e.x), Sy(e.y));
      ctx.scale(e.facing, 1); ctx.rotate(e.angle);
      const moving = clamp(e.speedNow / 3, 0, 1);
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
          aimLocal, loaded: !(g.capture && g.capture.kind === 'tag'), flash: g.camFlash || 0, suit: e.suit };
      }
      const h = drawEarl(ctx, EARL_H * ppm, e.kick, moving, lampCol, amb, gear);
      ctx.restore();
      if (h.tip) {
        const ca2 = Math.cos(e.angle), sa2 = Math.sin(e.angle);
        g.toolTip = { x: e.x + e.facing * (h.tip.x * ca2 - h.tip.y * sa2) / ppm, y: e.y + (h.tip.x * sa2 + h.tip.y * ca2) / ppm };
      }
      // tag darts in flight
      for (const d of g.darts || []) {
        ctx.save(); ctx.translate(S(d.x), Sy(d.y)); ctx.rotate(Math.atan2(d.vy, d.vx));
        drawDart(ctx, EARL_H * ppm / 100, d.tier, -12 * EARL_H * ppm / 100, t);
        ctx.restore();
      }
      // the camera's flash lights the water for a moment
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
    this.buildLightmap(g, S, Sy, ppm, head, subLamps, glowPts, horizon, surfY);
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.lc, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff);
    // far off in the dark, tiny lights come and go: things the lamp will never reach
    if (cam.y > 220) {
      const k = smoothstep(220, 700, cam.y), par = 0.45;
      for (let n = 0; n < 70; n++) {
        const hx = Math.abs(Math.sin(n * 91.7) * 1e4) % 1, hy = Math.abs(Math.sin(n * 47.3) * 1e4) % 1, hp = Math.abs(Math.sin(n * 13.1) * 1e4) % 1;
        const span = cam.w * 1.6, spanY = cam.h * 1.6;
        const wx = ((hx * span - cam.x * par) % span + span) % span - span * 0.2, wy = ((hy * spanY - cam.y * par) % spanY + spanY) % spanY - spanY * 0.2;
        const tw = Math.pow(Math.max(0, Math.sin(t * (0.25 + hp * 0.5) + n * 2.1)), 14);
        if (tw < 0.03) continue;
        const sx = wx * ppm, sy = wy * ppm;
        ctx.fillStyle = hp < 0.8 ? `rgba(110,230,215,${(0.55 * tw * k).toFixed(3)})` : `rgba(150,170,255,${(0.55 * tw * k).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, ppm * 0.05) * (1 + tw), 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // ---- the entity: a dark mass that blocks the light, a faint rim, dim lights, two eyes ----
    const ent = g.entity;
    if (ent && g.mode !== 'menu' && inView(ent.x, ent.y, 45)) {
      const d = ent.dist;
      const Lp = 34 * ppm;
      // it turns its head toward Earl when close; otherwise it faces the way it moves
      const flip = (ent.face ?? 1) >= 0 ? -1 : 1; // local frame faces -x (face is updated in the scene pass)
      const fillA = clamp((80 - d) / 60, 0, 1) * 0.95 * (ent.fade ?? 1);
      const lampBoost = g.earl.lampOn || (g.earl.inSub && g.sub.lightsOn) ? 1.6 : 1;
      const rimA = clamp((50 - d) / 45, 0, 1) * 0.22 * lampBoost * (0.75 + 0.25 * Math.sin(t * 0.37));
      ctx.save(); ctx.translate(S(ent.x), Sy(ent.y)); ctx.scale(flip, 1);
      const info = drawEntity(ctx, Lp, t, fillA, rimA * 0.6, true); // only a faint rim shows in the dark
      ctx.restore();
      const wx = (lx) => S(ent.x) + lx * flip;
      // lights along its flank, slowly pulsing out of step
      if (d < 60) {
        ctx.globalCompositeOperation = 'lighter';
        const a2 = clamp((60 - d) / 50, 0, 1) * 0.3;
        info.photophores.forEach(([lx, ly], k) => {
          const tw = Math.max(0, Math.sin(t * 0.9 - k * 0.5));
          if (tw < 0.05) return;
          const px = wx(lx), py = Sy(ent.y) + ly, r = ppm * 0.6;
          const pg = ctx.createRadialGradient(px, py, 0, px, py, r);
          pg.addColorStop(0, `rgba(140,175,200,${(a2 * tw).toFixed(3)})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
      }
      // the eyes: eyeshine, brighter when a lamp catches them
      if (ent.eyeOpen > 0.02 && ent.blink <= 0) {
        const o = ent.eyeOpen * (lampBoost > 1 ? 1 : 0.65);
        const ex = wx(info.eye[0]), ey = Sy(ent.y) + info.eye[1];
        for (const [ox, oy, sc] of [[0, 0, 1], [-flip * ppm * 0.9, -ppm * 0.25, 0.8]]) {
          const px = ex + ox, py = ey + oy;
          ctx.globalCompositeOperation = 'lighter';
          const gg = ctx.createRadialGradient(px, py, 0, px, py, ppm * 2.4 * sc);
          gg.addColorStop(0, `rgba(255,60,40,${(0.6 * o).toFixed(3)})`);
          gg.addColorStop(0.2, `rgba(170,20,15,${(0.25 * o).toFixed(3)})`);
          gg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, ppm * 2.4 * sc, 0, TAU); ctx.fill();
          const ig = ctx.createRadialGradient(px, py, 0, px, py, ppm * 0.38 * sc);
          ig.addColorStop(0, `rgba(255,120,80,${(0.98 * o).toFixed(3)})`); ig.addColorStop(0.6, `rgba(225,30,20,${(0.9 * o).toFixed(3)})`); ig.addColorStop(1, 'rgba(120,0,0,0)');
          ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(px, py, ppm * 0.38 * sc, ppm * 0.27 * sc, 0, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          // a narrow vertical pupil
          ctx.fillStyle = `rgba(0,0,0,${(0.85 * o).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(px, py, ppm * 0.26 * sc, ppm * 0.045 * sc, 0, 0, TAU); ctx.fill(); // a frog's horizontal slit
        }
      }
    }
    ctx.restore();

    // ================= POST =================
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

  drawCached(ctx, sp, Ld, phase, wob) {
    const shape = sp.v.s;
    if (Ld > 150 || Ld < 6 || CACHE_SKIP.has(shape)) return drawSpecies(ctx, sp, Ld, phase, 1, wob);
    const cache = this.spriteCache || (this.spriteCache = new Map());
    const bucket = Math.round(Math.log(Ld) / Math.log(1.18)), bl = Math.pow(1.18, bucket);
    const key = sp.id + ':' + bucket;
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
    if (!e.frames[f]) {
      const c = document.createElement('canvas');
      c.width = c.height = e.box;
      const x = c.getContext('2d');
      x.translate(e.box / 2, e.box / 2);
      e.glows[f] = drawSpecies(x, sp, e.bl, (f / SPRITE_FRAMES) * SPRITE_PERIOD, 1, 0);
      e.frames[f] = c;
    }
    const k = Ld / e.bl;
    ctx.drawImage(e.frames[f], -e.box / 2 * k, -e.box / 2 * k, e.box * k, e.box * k);
    const gl = e.glows[f];
    return gl ? gl.map(([gx, gy, sz]) => [gx * k, gy * k, sz]) : null;
  }

  // Build creature animation frames ahead of time, a little each frame: first every species on
  // screen, then every swimmer that lives within ~150 m of the camera's depth, at today's scale.
  warmSprites(g, budgetMs) {
    const t0 = performance.now(), ppm = this.cam.ppm;
    if (!ppm) return;
    const cache = this.spriteCache || (this.spriteCache = new Map());
    const wanted = [];
    for (const c of g.fauna.list) wanted.push([c.sp, fishDrawLen(c.len) * ppm]);
    if (!this.nearSpecies || Math.abs(this.nearDepth - this.cam.y) > 25 || this.nearPpm !== Math.round(ppm)) {
      const d = this.cam.y;
      this.nearSpecies = SPECIES.filter((sp) => sp.v.hab !== 'plant' && sp.v.hab !== 'floor' && sp.dmin <= d + 150 && sp.dmax >= d - 60);
      this.nearDepth = d; this.nearPpm = Math.round(ppm);
    }
    for (const sp of this.nearSpecies) wanted.push([sp, fishDrawLen(sp.len) * ppm]);
    for (const [sp, Ld] of wanted) {
      if (Ld > 150 || Ld < 6 || CACHE_SKIP.has(sp.v.s) || (Ld < 20 && (sp.v.s === 'fish' || sp.v.s === 'shrimp' || sp.v.s === 'hatchet'))) continue;
      const bucket = Math.round(Math.log(Ld) / Math.log(1.18)), bl = Math.pow(1.18, bucket), key = sp.id + ':' + bucket;
      let e = cache.get(key);
      if (!e) { const box = Math.ceil(bl * 2.4); e = { box, bl, frames: new Array(SPRITE_FRAMES), glows: new Array(SPRITE_FRAMES) }; cache.set(key, e); }
      for (let f = 0; f < SPRITE_FRAMES; f++) {
        if (e.frames[f]) continue;
        const c = document.createElement('canvas'); c.width = c.height = e.box;
        const x = c.getContext('2d'); x.translate(e.box / 2, e.box / 2);
        e.glows[f] = drawSpecies(x, sp, e.bl, (f / SPRITE_FRAMES) * SPRITE_PERIOD, 1, 0);
        e.frames[f] = c;
        if (performance.now() - t0 > budgetMs) return;
      }
    }
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
    if (dayEff < 0.4) {
      ctx.fillStyle = `rgba(230,235,255,${((0.4 - dayEff) * 1.6).toFixed(3)})`;
      for (const [sx, sy, b] of this.stars) {
        const y = horizon - (1 - sy) * this.H * 0.9;
        if (y < horizon - 4) ctx.fillRect(sx * W, y, 1 + b, 1 + b);
      }
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
    if (day > 0.2 && dTop < 35) {
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
      // worked out at half resolution (a quarter of the pixels): the rim is a soft edge anyway
      const k = Math.max(1, Math.round(cam.ppm * 0.035 / 2));
      if (!this.rc) { this.rc = document.createElement('canvas'); this.rctx = this.rc.getContext('2d'); }
      const rw = Math.ceil(this.fc.width / 2), rh = Math.ceil(this.fc.height / 2);
      if (this.rc.width !== rw || this.rc.height !== rh) { this.rc.width = rw; this.rc.height = rh; }
      const r = this.rctx, sun = clamp(1 - Math.max(0, cam.y) / 260, 0.25, 1) * (0.55 + 0.45 * (g.dayEff || 0));
      const hx = Math.floor(bx / 2), hy = Math.floor(by / 2), hw = Math.ceil(bw / 2) + 1, hh = Math.ceil(bh / 2) + 1;
      for (const [dy, col, a] of [[k, 'rgb(225,240,245)', 0.32 * sun], [-k, 'rgb(4,10,18)', 0.3]]) {
        r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.clearRect(hx, hy, hw, hh);
        r.drawImage(this.fc, hx * 2, hy * 2, hw * 2, hh * 2, hx, hy, hw, hh);
        r.globalCompositeOperation = 'destination-out'; r.drawImage(this.fc, hx * 2, hy * 2, hw * 2, hh * 2, hx, hy + dy, hw, hh);
        r.globalCompositeOperation = 'source-in'; r.fillStyle = col; r.fillRect(hx, hy, hw, hh);
        f.globalCompositeOperation = 'source-atop'; f.globalAlpha = a; f.drawImage(this.rc, hx, hy, hw, hh, hx * 2, hy * 2, hw * 2, hh * 2);
        f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';
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
  texture(ctx, name, metres, alpha, op = 'soft-light', ox = 0, oy = 0) {
    if (this.lite) return;
    const tile = name === 'murk' ? this.noiseTile('murk', 192, 7, 3, 1.3) : name === 'grain' ? this.noiseTile('grain', 192, 3, 4, 1.2) : this.noiseTile('rock', 192, 11, 5, 1.3);
    this.pats = this.pats || {};
    const pat = this.pats[name] || (this.pats[name] = ctx.createPattern(tile, 'repeat'));
    const k = metres * this.cam.ppm / tile.width;
    pat.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
    ctx.save();
    ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.fillStyle = pat;
    ctx.fillRect(-this.W * 0.2, -this.H * 0.2, this.W * 1.4, this.H * 1.4);
    ctx.restore();
  }

  drawFloor(g, S, Sy, ppm, x0, x1) {
    const ctx = this.ctx, H = this.H, W = this.W;
    const step = Math.max(0.5, 6 / ppm);
    ctx.beginPath();
    ctx.moveTo(S(x0), H + 20);
    for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(S(x), Sy(g.world.floorAt(x)));
    ctx.lineTo(S(x1 + step), H + 20); ctx.closePath();
    const midD = g.world.floorAt(this.cam.x);
    const fg = ctx.createLinearGradient(0, Sy(midD - 6), 0, Sy(midD + 30));
    const c = sampleTable(FLOOR_COL, midD);
    fg.addColorStop(0, rgbStr(c)); fg.addColorStop(0.15, rgbStr(mixRgb(c, [40, 36, 30], 0.35))); fg.addColorStop(1, rgbStr(mixRgb(c, [10, 10, 10], 0.75)));
    ctx.fillStyle = fg; ctx.fill();
    // grain texture
    ctx.save(); ctx.clip();
    // rock and sediment: large mottling and a fine grain, pinned to the world so they never swim
    this.texture(ctx, 'rock', 19, 0.22 + 0.25 * smoothstep(30, 400, this.cam.y), 'soft-light', S(0), Sy(0));
    if (ppm > 14) this.texture(ctx, 'grain', 2.7, 0.3, 'soft-light', S(0.37), Sy(0.61));
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
    const ys0 = Math.floor((this.cam.y - this.cam.h / 2) / 2.2) * 2.2, ys1 = this.cam.y + this.cam.h / 2 + 2;
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
        else if (r < 0.43 && x > 2780) { blob(0, -u * 0.06, u * 0.07, u * 0.06, '#241a26'); ctx.strokeStyle = '#2e2232'; ctx.lineWidth = Math.max(1, u * 0.012); for (let k = 0; k < 9; k++) { const a0 = Math.PI + k / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a0) * u * 0.06, -u * 0.06 + Math.sin(a0) * u * 0.05); ctx.lineTo(Math.cos(a0) * u * 0.14, -u * 0.06 + Math.sin(a0) * u * 0.12); ctx.stroke(); } }
        else if (r < 0.55) { ctx.strokeStyle = 'rgba(250,240,215,0.16)'; ctx.lineWidth = Math.max(1, u * 0.03); ctx.beginPath(); ctx.moveTo(-u * 0.25, -u * 0.01); ctx.quadraticCurveTo(0, -u * 0.08, u * 0.25, -u * 0.01); ctx.stroke(); }
        else if (r < 0.58 && x > 2780) { ctx.fillStyle = '#c8603a'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a0 = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? u * 0.035 : u * 0.1; ctx.lineTo(Math.cos(a0) * rr, -u * 0.03 + Math.sin(a0) * rr * 0.4); } ctx.fill(); }
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

  drawRock(ctx, rk, S, Sy, ppm) {
    ctx.beginPath();
    for (const p of rk.poly) ctx.lineTo(S(p.x), Sy(p.y));
    ctx.closePath();
    const d = (rk.y0 + rk.y1) / 2;
    const base = mixRgb(sampleTable(FLOOR_COL, d), [50, 48, 46], 0.6);
    const gr = ctx.createLinearGradient(0, Sy(rk.y0), 0, Sy(rk.y1));
    gr.addColorStop(0, rgbStr(mixRgb(base, [200, 200, 190], 0.15))); gr.addColorStop(0.5, rgbStr(base)); gr.addColorStop(1, rgbStr(mixRgb(base, [0, 0, 0], 0.6)));
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, ppm * 0.04); ctx.stroke();
    // encrusting life specks
    ctx.save(); ctx.clip();
    this.texture(ctx, 'rock', 11, 0.55, 'soft-light', S(rk.x0 * 0.37), Sy(rk.y0 * 0.61));
    if (ppm > 14) this.texture(ctx, 'grain', 2.3, 0.3, 'soft-light', S(0), Sy(0));
    // cracks running in from the edges, made once per rock
    if (!rk.cracks) {
      let sd = Math.abs(Math.sin(rk.x0 * 12.9898 + rk.y0 * 78.233) * 43758.5453);
      const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
      const cx = (rk.x0 + rk.x1) / 2, cy = (rk.y0 + rk.y1) / 2;
      rk.cracks = [];
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const v = rk.poly[Math.floor(rnd() * rk.poly.length)];
        const pts = [[v.x, v.y]];
        let px = v.x, py = v.y;
        const len = 0.25 + rnd() * 0.45;
        for (let j = 0; j < 4; j++) { px = lerp(px, cx, len / 2.2) + (rnd() - 0.5) * 0.6; py = lerp(py, cy, len / 2.2) + (rnd() - 0.5) * 0.6; pts.push([px, py]); }
        rk.cracks.push(pts);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = Math.max(1, ppm * 0.035);
    for (const cr of rk.cracks) { ctx.beginPath(); for (const [cx2, cy2] of cr) ctx.lineTo(S(cx2), Sy(cy2)); ctx.stroke(); }
    ctx.fillStyle = d < 200 ? 'rgba(160,120,90,0.25)' : 'rgba(200,200,190,0.12)';
    for (let k = 0; k < 10; k++) {
      const p = rk.poly[(k * 3) % rk.poly.length];
      ctx.beginPath(); ctx.arc(S(p.x) + Math.sin(rk.seed + k) * ppm * 0.4, Sy(p.y) + Math.cos(rk.seed + k) * ppm * 0.4, Math.max(1, ppm * 0.15), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- baked kelp backdrop ----------
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
    for (const L of this.kelpBack) {
      const scale = ppm * L.f / L.PX;               // image pixels -> screen pixels
      const x0 = W / 2 + (L.X0 - cam.x) * ppm * L.f; // further layers slide slower and look smaller
      const bands = 14, bh = L.c.height / bands;
      for (let b = 0; b < bands; b++) {
        // sway grows toward the tops of the stalks (top bands)
        const up = 1 - b / bands;
        const off = Math.sin(t * 0.45 + b * 0.35 + L.f * 5) * 9 * up * up;
        ctx.drawImage(L.c, 0, b * bh, L.c.width, bh + 1, x0 + off * scale, surfY + b * bh * scale, L.c.width * scale, (bh + 1) * scale);
      }
    }
  }

  drawKelp(g, S, Sy, ppm, layer, x0, x1) {
    // Batched: every stalk of this layer goes into one path, every blade into another,
    // every bladder into a third - three draw calls for the whole forest.
    const ctx = this.ctx, t = g.time;
    const surf = g.surfY || (() => 0);
    const stalks = new Path2D(), blades = new Path2D(), bulbs = new Path2D();
    const len = 1.1 * ppm, wid = 0.22 * ppm, br = wid * 0.35;
    let any = false;
    for (let i = 0; i < g.world.kelp.length; i++) {
      const k = g.world.kelp[i];
      if ((i % 3 === 0 ? 1 : 0) !== layer) continue;
      if (k.x < x0 - 8 || k.x > x1 + 8) continue;
      const topY = k.base - k.h;
      if (k.base < this.cam.y - this.cam.h || topY > this.cam.y + this.cam.h) continue;
      any = true;
      const segs = Math.max(6, Math.floor(k.h / 1.45));
      for (let s2 = 0; s2 <= segs; s2++) {
        const u = s2 / segs, hh = u * k.h;
        let y = k.base - hh;
        const sway = Math.sin(t * 0.55 + k.phase + hh * 0.12) * hh * 0.07 + Math.sin(t * 1.3 + hh * 0.3) * 0.15 * u + k.lean * hh + g.waveBoost * Math.sin(t * 2 + hh * 0.2) * u * 2;
        if (y < 0.4) y = 0.4 + surf(k.x + sway) * 0.4;
        const px = S(k.x + sway), py = Sy(y);
        if (s2 === 0) stalks.moveTo(px, py); else stalks.lineTo(px, py);
        if (s2 === 0) continue;
        // blade: a leaf shape from (px,py) along angle a
        const side = s2 % 2 ? 1 : -1;
        const a = -Math.PI / 2 + side * (0.7 + Math.sin(t * 0.8 + s2 + k.phase) * 0.2);
        const ca = Math.cos(a), sa = Math.sin(a);
        // a blade is one short, thick, round-capped stroke: reads as a leaf, rasterizes far faster than a curve fill
        blades.moveTo(px + ca * len * 0.18, py + sa * len * 0.18);
        blades.lineTo(px + ca * len * 0.82, py + sa * len * 0.82);
        if (s2 % 2 === 0) { const bx = px + ca * len * 0.05, by = py + sa * len * 0.05; bulbs.moveTo(bx + br, by); bulbs.arc(bx, by, br, 0, TAU); }
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
    ctx.strokeStyle = `rgba(${(112 * dark) | 0},${(92 * dark) | 0},${(34 * dark) | 0},0.86)`;
    ctx.lineWidth = wid * 1.5; ctx.lineCap = 'round';
    ctx.stroke(blades);
    ctx.lineCap = 'butt';
    ctx.fillStyle = `rgba(${(140 * dark) | 0},${(120 * dark) | 0},${(50 * dark) | 0},0.9)`;
    ctx.fill(bulbs);
  }

  drawWreck(ctx, w, S, Sy, ppm) {
    // A small steel freighter, sunk upright with a list, settled into the sediment.
    ctx.save(); ctx.translate(S(w.x), Sy(w.y + w.len * 0.03)); ctx.rotate(w.tilt);
    const L = w.len * ppm, H = w.len * 0.13 * ppm;
    const hull = new Path2D();
    hull.moveTo(-L * 0.5, -H * 1.18);
    hull.quadraticCurveTo(-L * 0.47, -H * 0.3, -L * 0.4, H * 0.15);
    hull.lineTo(L * 0.42, H * 0.15);
    hull.quadraticCurveTo(L * 0.5, -H * 0.1, L * 0.5, -H * 0.95);
    hull.lineTo(L * 0.2, -H * 0.98);
    hull.quadraticCurveTo(-L * 0.2, -H * 0.98, -L * 0.5, -H * 1.18);
    const hg = ctx.createLinearGradient(0, -H * 1.2, 0, H * 0.2);
    hg.addColorStop(0, '#4a3e34'); hg.addColorStop(0.3, '#33291f'); hg.addColorStop(1, '#130f0c');
    ctx.fillStyle = hg; ctx.fill(hull);
    ctx.save(); ctx.clip(hull);
    // plating seams + rust streaks running down from the deck
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = Math.max(1, ppm * 0.05);
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-L / 2, -H * 1.0 + k * H * 0.3); ctx.lineTo(L / 2, -H * 1.0 + k * H * 0.3); ctx.stroke(); }
    for (let k = 0; k < 22; k++) { const x = -L * 0.48 + k * L * 0.045; ctx.beginPath(); ctx.moveTo(x, -H * 1.2); ctx.lineTo(x, H * 0.2); ctx.stroke(); }
    for (let k = 0; k < 26; k++) {
      const x = -L * 0.47 + ((k * 37) % 100) / 100 * L * 0.94, len = H * (0.3 + ((k * 13) % 7) / 10);
      const rg = ctx.createLinearGradient(0, -H, 0, -H + len);
      rg.addColorStop(0, 'rgba(140,70,34,0.55)'); rg.addColorStop(1, 'rgba(140,70,34,0)');
      ctx.fillStyle = rg; ctx.fillRect(x, -H * 1.1, Math.max(1.5, ppm * (0.15 + (k % 3) * 0.1)), len);
    }
    // breach in the hull
    ctx.fillStyle = '#050403';
    ctx.beginPath(); ctx.moveTo(-L * 0.08, -H * 0.55); ctx.lineTo(-L * 0.02, -H * 0.72); ctx.lineTo(L * 0.03, -H * 0.5);
    ctx.lineTo(L * 0.06, -H * 0.2); ctx.lineTo(L * 0.0, -H * 0.05); ctx.lineTo(-L * 0.06, -H * 0.18); ctx.closePath(); ctx.fill();
    // portholes
    for (let k = 0; k < 6; k++) { ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.arc(L * (0.14 + k * 0.045), -H * 0.72, Math.max(1.5, ppm * 0.22), 0, TAU); ctx.fill(); }
    ctx.restore();
    // superstructure aft
    const sx0 = L * 0.18, sx1 = L * 0.4, top = -H * 2.0;
    ctx.fillStyle = '#2c241d';
    ctx.beginPath(); ctx.moveTo(sx0, -H * 0.97); ctx.lineTo(sx0 + L * 0.01, top); ctx.lineTo(sx1, top); ctx.lineTo(sx1, -H * 0.95); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#251e18'; ctx.fillRect(sx0 + L * 0.04, top - H * 0.5, L * 0.13, H * 0.52);
    ctx.fillStyle = '#060504';
    for (let k = 0; k < 6; k++) ctx.fillRect(sx0 + L * 0.02 + k * L * 0.033, top + H * 0.2, L * 0.018, H * 0.22);
    for (let k = 0; k < 4; k++) ctx.fillRect(sx0 + L * 0.055 + k * L * 0.03, top - H * 0.32, L * 0.015, H * 0.16);
    // funnel, leaning
    ctx.save(); ctx.translate(L * 0.33, top - H * 0.45); ctx.rotate(0.12);
    ctx.fillStyle = '#2a201a'; ctx.fillRect(-L * 0.02, -H * 0.8, L * 0.04, H * 0.85);
    ctx.fillStyle = 'rgba(120,40,30,0.35)'; ctx.fillRect(-L * 0.02, -H * 0.7, L * 0.04, H * 0.12);
    ctx.restore();
    // forward mast, snapped
    ctx.strokeStyle = '#211a14'; ctx.lineWidth = Math.max(2, ppm * 0.22); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-L * 0.22, -H * 1.02); ctx.lineTo(-L * 0.215, -H * 2.6); ctx.lineTo(-L * 0.12, -H * 3.0); ctx.stroke();
    ctx.lineWidth = Math.max(1, ppm * 0.08);
    ctx.beginPath(); ctx.moveTo(-L * 0.215, -H * 2.4); ctx.lineTo(-L * 0.32, -H * 1.05); ctx.moveTo(-L * 0.215, -H * 2.0); ctx.lineTo(-L * 0.08, -H * 1.0); ctx.stroke();
    // deck rail
    ctx.strokeStyle = 'rgba(40,32,26,0.9)'; ctx.lineWidth = Math.max(1, ppm * 0.05);
    ctx.beginPath(); ctx.moveTo(-L * 0.48, -H * 1.42); ctx.quadraticCurveTo(-L * 0.2, -H * 1.2, L * 0.17, -H * 1.22); ctx.stroke();
    for (let k = 0; k < 18; k++) { const x = -L * 0.47 + k * L * 0.037; const yTop = -H * (1.42 - (k / 18) * 0.2); ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yTop + H * 0.24); ctx.stroke(); }
    // growth along the deck edge
    ctx.fillStyle = 'rgba(170,150,120,0.22)';
    for (let k = 0; k < 30; k++) { ctx.beginPath(); ctx.arc(-L * 0.48 + k * L * 0.032, -H * (1.16 - (k / 30) * 0.2) + Math.sin(k) * ppm * 0.1, ppm * (0.15 + (k % 4) * 0.08), 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // the brine pool, the whale fall, the cold seep, the canyon's current and the old one in her cave
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
      for (let k = 0; k < 40; k++) {
        const x = P.x - 6 + ((k * 7.31) % 12), y = W.floorAt(x);
        ctx.fillStyle = k % 3 ? '#16141a' : '#2a2836';
        ctx.beginPath(); ctx.ellipse(S(x), Sy(y) - ppm * 0.08, ppm * 0.09, ppm * 0.16, -0.4 + (k % 5) * 0.2, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,220,235,0.5)';
      for (let k = 0; k < 18; k++) {
        const q = (t * 0.12 + k / 18 + P.phase) % 1, x = P.x + Math.sin(k * 5.3) * 4 + Math.sin(q * 9 + k) * 0.4;
        ctx.beginPath(); ctx.arc(S(x), Sy(W.floorAt(P.x + Math.sin(k * 5.3) * 4) - q * 30), Math.max(1, ppm * (0.05 + q * 0.06)), 0, TAU); ctx.fill();
      }
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
  }

  drawVent(ctx, v, S, Sy, ppm, t) {
    const x = S(v.x), y = Sy(v.y), h = v.h * ppm;
    ctx.fillStyle = '#2a2420';
    ctx.beginPath(); ctx.moveTo(x - ppm * 1.4, y); ctx.lineTo(x - ppm * 0.5, y - h); ctx.lineTo(x + ppm * 0.5, y - h); ctx.lineTo(x + ppm * 1.6, y); ctx.fill();
    ctx.fillStyle = 'rgba(160,110,60,0.3)'; ctx.fillRect(x - ppm * 0.4, y - h, ppm * 0.8, h * 0.3);
    for (let k = 0; k < 14; k++) {
      const p = ((t * 0.25 + k / 14 + v.phase) % 1);
      const px = x + Math.sin(p * 7 + k) * ppm * (0.3 + p * 2), py = y - h - p * ppm * 14;
      ctx.fillStyle = `rgba(14,12,12,${(0.5 * (1 - p)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(px, py, ppm * (0.4 + p * 1.6), 0, TAU); ctx.fill();
    }
  }

  drawPickup(ctx, p, x, y, ppm, t) {
    const u = ppm;
    ctx.save(); ctx.translate(x, y);
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
      case 'necklace':
        ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = u * 0.025;
        ctx.beginPath(); ctx.ellipse(0, -u * 0.08, u * 0.3, u * 0.08, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#e8e2d0';
        for (let k = 0; k < 7; k++) { const a = Math.PI * 0.15 + k * 0.12 * Math.PI; const px = Math.cos(a) * u * 0.3, py = -u * 0.08 + Math.sin(a) * u * 0.08; ctx.beginPath(); ctx.moveTo(px - u * 0.02, py); ctx.lineTo(px, py + u * 0.14); ctx.lineTo(px + u * 0.02, py); ctx.fill(); }
        break;
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
    const radial = (x, y, r, col, a) => {
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
      cone(head.x, head.y, ang, 17 * ppm, 0.32, beamCol, 0.95 * TORCH * flick);
      radial(head.x, head.y, 3.2 * ppm, beamCol, 0.3 * TORCH * flick); lamps.push({ x: head.x, y: head.y, r: 3.2 * ppm, a: 0.3 * TORCH * flick });
    }
    if (g.protection && g.protection.necklace) radial(S(e.x), Sy(e.y), 9 * ppm, [255, 230, 190], 0.65);
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
    }
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
        radial(x, y, (p.type === 'lure' ? 2.5 : 1.6) * ppm, p.type === 'lure' ? [170, 230, 255] : [80, 120, 255], 0.5);
      }
    }
    if (g.lure) radial(S(g.lure.x), Sy(g.lure.y), (g.lure.old ? 12 : 8) * ppm, g.lure.old ? [120, 170, 255] : [170, 230, 255], 0.9);
    if (this.escaW) radial(S(this.escaW.x), Sy(this.escaW.y), 16 * ppm, [150, 220, 255], 0.75 + 0.15 * Math.sin(g.time * 1.7));
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

  drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff) {
    const ctx = this.ctx, cam = this.cam, fx = g.fx, t = g.time;
    // god rays near the surface
    const rayStrength = dayEff * clamp(1 - cam.y / 110, 0, 1) * (1 - fx.darken * 0.7);
    if (rayStrength > 0.01) {
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
        // three nested strips, widest and faintest outside: soft edges, no hard lines
        for (const [wm, am] of [[2.2, 0.3], [1.4, 0.35], [0.7, 0.35]]) {
          const gg = ctx.createLinearGradient(0, top, 0, top + len);
          gg.addColorStop(0, `rgba(210,240,255,${(a * am).toFixed(3)})`); gg.addColorStop(1, 'rgba(210,240,255,0)');
          ctx.fillStyle = gg;
          const ww = w * wm;
          ctx.beginPath(); ctx.moveTo(sx - ww, top); ctx.lineTo(sx + ww, top); ctx.lineTo(sx + ww * 2 + w + len * 0.18, top + len); ctx.lineTo(sx - ww + len * 0.18, top + len); ctx.closePath(); ctx.fill();
        }
      }
    }
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const amb = ambientAt(g.earl.y, g.dayEff);
    const haze = clamp(1 - amb * 1.6, 0, 1);
    // faint scattered light inside the beam (soft-edged), plus the particles it catches
    const coneHaze = (x, y, ang, range, spread, col, a) => {
      const far = mixRgb(col, WATER_LIT, 0.7);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, range);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(0.3, rgbStr(far, a * 0.45)); gg.addColorStop(1, rgbStr(WATER_LIT, 0));
      ctx.fillStyle = gg;
      const n = this.quality < 0.85 ? 6 : FEATHER;
      for (let i = 0; i < n; i++) {
        const sm = 0.3 + 1.6 * (i / (n - 1));
        ctx.globalAlpha = 1 / n;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, range, ang - spread * sm, ang + spread * sm); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
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
    const halo = (x, y, r, col, a) => {
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(1, rgbStr(col, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    const glare = (x, y, col, a) => {
      const gg = ctx.createRadialGradient(x, y, 0, x, y, ppm * 0.5);
      gg.addColorStop(0, rgbStr([255, 255, 255], a)); gg.addColorStop(0.25, rgbStr(col, a * 0.5)); gg.addColorStop(1, rgbStr(col, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, ppm * 0.5, 0, TAU); ctx.fill();
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
    if (g.protection && g.protection.necklace) halo(S(e.x), Sy(e.y), ppm * 3, [255, 220, 170], 0.18);
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
