// Scene renderer: sky, sea surface, water, terrain, life, Earl, and the light model.
// Light model: the scene is drawn in "true" colour, then multiplied by a lightmap
// (ambient that fades with depth and loses red, plus lamps and bioluminescence),
// then additive glows are layered on top.
import { clamp, lerp, smoothstep, sampleTable, rgbStr, TAU, fbm1, noise1, hexToRgb, mixRgb } from './util.js';
import { drawSpecies } from './creatures_draw.js';
import { drawEarl, drawSub, drawBoat, drawEntityShape } from './earl_draw.js';
import { BOAT_X, WORLD_W } from './world.js';
import { LANTERN_RADIUS } from './entity.js';

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
const WATER_LIT = [60, 150, 180]; // what's left of a beam after a few metres of seawater

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

export class Renderer {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.lc = document.createElement('canvas'); this.lctx = this.lc.getContext('2d');
    this.gc = document.createElement('canvas'); this.gctx = this.gc.getContext('2d'); // ghost buffer
    this.viewW = 30; this.cam = { x: 500, y: 5, w: 30, h: 17, zoom: 1 };
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
      this.lc.width = Math.ceil(w / 3); this.lc.height = Math.ceil(h / 3);
      this.gc.width = w; this.gc.height = h;
    }
  }
  get W() { return this.c.width; }
  get H() { return this.c.height; }

  updateCamera(g, dt) {
    const e = g.earl;
    const targetView = g.debugView || (g.mode === 'menu' ? 40 : e.inSub ? 46 : 30);
    this.viewW = lerp(this.viewW, targetView, 1 - Math.exp(-dt * 1.2));
    const ppm = this.W / this.viewW;
    const cam = this.cam;
    cam.w = this.viewW; cam.h = this.H / ppm; cam.ppm = ppm;
    const lookX = e.vx * 0.9, lookY = e.vy * 0.6;
    let tx = e.x + lookX, ty = e.y + lookY;
    ty = Math.max(ty, -cam.h * 0.18); // let a little sky show near the surface
    if (g.mode === 'menu') { tx = 505 + Math.sin(g.time * 0.05) * 3; ty = 5.5; }
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
      ctx.translate(-W / 2 + (Math.random() - 0.5) * fx.shake * ppm * 0.4, -H / 2 + (Math.random() - 0.5) * fx.shake * ppm * 0.4);
    }

    // ================= SKY =================
    const horizon = Sy(0);
    if (horizon > -50) this.drawSky(g, horizon, dayEff, day);

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
    }
    // distant parallax silhouettes (slope / cliffs far behind)
    this.drawFar(g, S, Sy, dayEff);
    // something very large, very far away
    if (g.farShadow) {
      const f = g.farShadow;
      const a = Math.sin(Math.PI * clamp(f.t / f.dur, 0, 1)) * 0.1;
      const px = -0.3 * W + (f.t / f.dur) * W * 1.6, py = H * f.y;
      // drawn tiny and scaled up: that is the blur, at almost no cost
      const sc = this.shadowC || (this.shadowC = document.createElement('canvas'));
      const sw = Math.ceil(W * 0.06), sh = Math.ceil(W * 0.03);
      if (sc.width !== sw) { sc.width = sw; sc.height = sh; }
      const sctx = sc.getContext('2d');
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, sw, sh);
      sctx.translate(sw * 0.42, sh * 0.4); sctx.scale(f.dir, 1);
      drawEntityShape(sctx, sw * 0.62, t * 0.5, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sc, (f.dir > 0 ? px : W - px) - W * 0.25, py - W * 0.125, W * 0.6, W * 0.3);
      ctx.restore();
    }

    // painted kelp forests far behind (baked once, high detail, gently swaying)
    this.drawKelpBackdrop(g, ppm, t);
    // ================= TERRAIN & STRUCTURES =================
    for (const w of g.world.wrecks) if (Math.abs(w.x - cam.x) < cam.w / 2 + w.len) this.drawWreck(ctx, w, S, Sy, ppm);
    this.drawKelp(g, S, Sy, ppm, 0, x0, x1);
    for (const v of g.world.vents) if (inView(v.x, v.y, 30)) this.drawVent(ctx, v, S, Sy, ppm, t);
    this.drawFloor(g, S, Sy, ppm, x0, x1);
    for (const rk of g.world.rocks) if (rk.x1 > x0 && rk.x0 < x1 && rk.y1 > y0 && rk.y0 < y1) this.drawRock(ctx, rk, S, Sy, ppm);
    // statics on the floor
    const glowPts = [];
    for (const s of g.world.statics) {
      if (s.x < x0 - 3 || s.x > x1 + 3 || s.y < y0 - 6 || s.y > y1 + 6) continue;
      const L = Math.max(0.18, s.sp.len) * s.scale * ppm;
      ctx.save(); ctx.translate(S(s.x), Sy(s.y)); ctx.scale(s.flip, 1);
      const r = drawSpecies(ctx, s.sp, L, t + s.phase, 0.3, s.phase);
      ctx.restore();
      if (r && s.sp.v.glow) glowPts.push([S(s.x), Sy(s.y), s.sp.v.glow, L]);
    }
    // ---- pickups + lanterns ----
    for (const p of g.world.pickups) if (!p.taken && inView(p.x, p.y)) this.drawPickup(ctx, p, S(p.x), Sy(p.y), ppm, t);
    for (const l of g.world.lanterns) if (inView(l.x, l.y, 14)) this.drawLanternBody(ctx, l, S, Sy, ppm, t);
    if (g.lure) this.drawLure(ctx, S(g.lure.x), Sy(g.lure.y), ppm, t);

    // ---- fauna ----
    // Fish are drawn nose at -x, so a fish heading right (+x) is mirrored, and the tilt is negated
    // so the nose follows the direction of travel (a fish swimming down points down).
    // Small fish are batched per species: one path for all their backs, one for all their bellies,
    // one for the silver flashes - a whole school costs three draw calls.
    const baseM = ctx.getTransform();
    const batches = new Map();
    let glowSkip = 0;
    for (const c of g.fauna.list) {
      if (!inView(c.x, c.y, c.len)) continue;
      const Ld = (c.len + 0.25 * Math.exp(-c.len * 2)) * ppm;
      const shape = c.sp.v.s;
      const tilt = clamp(Math.atan2(c.vy, Math.abs(c.vx) + 0.2), -0.5, 0.5);
      if (Ld < 20 && (shape === 'fish' || shape === 'shrimp' || shape === 'hatchet')) {
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
        const flash = Math.pow(Math.max(0, Math.sin(c.phase * 0.6 + c.wob)), 10);
        if (flash > 0.3) { bt.flash.moveTo(bx + fx2 * Ld * 0.36, by + fy2 * Ld * 0.36); bt.flash.ellipse(bx, by, Ld * 0.36, hh * 0.7, rot, 0, TAU); bt.nf++; }
        if (Ld > 9) { const ex = x + fx2 * Ld * 0.33 - px * down * hh * 0.2, ey = y + fy2 * Ld * 0.33 - py * down * hh * 0.2, er = Math.max(0.7, hh * 0.3); bt.eyes.moveTo(ex + er, ey); bt.eyes.arc(ex, ey, er, 0, TAU); }
        if (c.sp.v.glow && (glowSkip++ % 3 === 0)) glowPts.push([x, y, c.sp.v.glow, Math.max(2, Ld * 0.3)]);
        continue;
      }
      ctx.save(); ctx.translate(S(c.x), Sy(c.y));
      if (c.dir > 0) ctx.scale(-1, 1);
      ctx.rotate(c.sp.v.hab === 'drift' ? 0 : -tilt);
      const r = drawSpecies(ctx, c.sp, Ld, c.phase, 1, c.wob);
      ctx.restore();
      if (c.sp.v.glow) {
        if (r) for (const [lx, ly] of r) glowPts.push([S(c.x) - lx * c.dir, Sy(c.y) + ly, c.sp.v.glow, Ld * 0.25]);
        else glowPts.push([S(c.x), Sy(c.y), c.sp.v.glow, Ld * 0.3]);
      }
    }
    for (const bt of batches.values()) {
      ctx.fillStyle = bt.sp.v.c[0]; ctx.fill(bt.back);
      ctx.fillStyle = bt.sp.v.c[1]; ctx.fill(bt.belly);
      if (bt.nf) { ctx.fillStyle = 'rgba(235,245,250,0.7)'; ctx.fill(bt.flash); }
      ctx.fillStyle = '#0a0a0a'; ctx.fill(bt.eyes);
    }
    ctx.setTransform(baseM);
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
    const boatX = S(BOAT_X), boatY = Sy(surfY(BOAT_X) * 0.8);
    let crane = null;
    if (Math.abs(BOAT_X - cam.x) < cam.w) {
      const roll = Math.atan2(surfY(BOAT_X + 4) - surfY(BOAT_X - 4), 8) * 0.7;
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
      const lights = g.earl.inSub && sub.lightsOn;
      const r = drawSub(ctx, 9 * ppm, t, sub.stress, lights);
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
    if (!e.inSub && g.mode !== 'menu') {
      const amb = ambientAt(e.y, dayEff);
      ctx.save(); ctx.translate(S(e.x), Sy(e.y));
      ctx.scale(e.facing, 1); ctx.rotate(e.angle);
      const moving = clamp(e.speedNow / 3, 0, 1);
      const lampCol = e.lampOn ? rgbStr(mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift)) : null;
      const h = drawEarl(ctx, 2 * ppm, e.kick, moving, lampCol, amb);
      ctx.restore();
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
    ctx.drawImage(this.lc, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff);
    ctx.globalCompositeOperation = 'source-over';

    // ---- the entity: a faint shape and two eyes ----
    const ent = g.entity;
    if (ent && g.mode !== 'menu' && inView(ent.x, ent.y, 30)) {
      const d = ent.dist;
      const a = clamp((60 - d) / 60, 0, 1) * 0.22 * (0.6 + 0.4 * Math.sin(t * 0.4));
      ctx.save(); ctx.translate(S(ent.x), Sy(ent.y));
      const dir = Math.cos(ent.heading) >= 0 ? -1 : 1;
      ctx.scale(dir, 1);
      drawEntityShape(ctx, 34 * ppm, t, a);
      ctx.restore();
      if (ent.eyeOpen > 0.02 && ent.blink <= 0) {
        const ex = S(ent.x) - dir * 15 * ppm, ey = Sy(ent.y) - 1.2 * ppm;
        const o = ent.eyeOpen;
        for (const off of [-1, 1]) {
          const px = ex + off * ppm * 0.55, py = ey + off * ppm * 0.08;
          ctx.globalCompositeOperation = 'lighter';
          const gg = ctx.createRadialGradient(px, py, 0, px, py, ppm * 0.9);
          gg.addColorStop(0, `rgba(190,200,150,${(0.5 * o).toFixed(3)})`);
          gg.addColorStop(0.25, `rgba(120,130,80,${(0.18 * o).toFixed(3)})`);
          gg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, ppm * 0.9, 0, TAU); ctx.fill();
          const ig = ctx.createRadialGradient(px, py, 0, px, py, ppm * 0.16);
          ig.addColorStop(0, `rgba(214,222,170,${(0.75 * o).toFixed(3)})`);
          ig.addColorStop(1, `rgba(150,160,100,0)`);
          ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(px, py, ppm * 0.17, ppm * 0.1, 0, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = `rgba(0,0,0,${(0.55 * o).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(px, py, ppm * 0.022, ppm * 0.085, 0, 0, TAU); ctx.fill();
        }
      }
      // a few faint photophores trace part of its outline when it is very close
      if (d < 30) {
        ctx.globalCompositeOperation = 'lighter';
        const a2 = (30 - d) / 30 * 0.25;
        for (let k = 0; k < 14; k++) {
          const u = k / 13;
          const px = S(ent.x) + dir * (-15 + u * 30) * ppm * 1.1, py = Sy(ent.y) + (Math.sin(u * Math.PI) * -5.5 + 0.5) * ppm + Math.sin(t * 0.6 + k) * ppm * 0.2;
          const tw = 0.5 + 0.5 * Math.sin(t * 1.7 + k * 2.3);
          ctx.fillStyle = `rgba(150,170,190,${(a2 * tw).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(px, py, ppm * 0.07, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();

    // ================= POST =================
    if (fx.ghost > 0.01) {
      // double vision
      this.gctx.clearRect(0, 0, W, H);
      this.gctx.drawImage(this.c, 0, 0);
      ctx.globalAlpha = fx.ghost * 0.35;
      ctx.drawImage(this.gc, Math.sin(t * 1.3) * ppm * 0.6 * fx.ghost, Math.cos(t * 1.1) * ppm * 0.3 * fx.ghost);
      ctx.globalAlpha = 1;
    }
    // vignette
    const vs = 0.38 + fx.vignette * 0.55;
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
    if (fx.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${fx.flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    if (fx.black > 0) { ctx.fillStyle = `rgba(0,0,0,${fx.black.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }

  drawSky(g, horizon, dayEff, day) {
    const ctx = this.ctx, W = this.W;
    const t = g.time;
    const sunset = day.phase === 'sunset' || day.phase === 'sunrise' ? 1 - Math.abs(dayEff - 0.5) * 2 : 0;
    const top = mixRgb(mixRgb([4, 7, 16], [74, 128, 178], dayEff), [70, 60, 96], sunset * 0.6);
    const bot = mixRgb(mixRgb([12, 22, 36], [176, 204, 218], dayEff), [226, 140, 92], sunset * 0.8);
    const sg = ctx.createLinearGradient(0, horizon - this.H, 0, horizon);
    sg.addColorStop(0, rgbStr(top)); sg.addColorStop(1, rgbStr(bot));
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
      const gg = ctx.createRadialGradient(x, y, 0, x, y, this.H * 0.18);
      gg.addColorStop(0, `rgba(255,245,220,${(0.9 * dayEff).toFixed(3)})`); gg.addColorStop(0.08, `rgba(255,236,200,${(0.5 * dayEff).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,220,180,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - this.H, y - this.H, this.H * 2, this.H * 2);
    }
    if (day.moon !== null) {
      const [x, y] = arc(day.moon);
      ctx.fillStyle = 'rgba(220,228,240,0.85)'; ctx.beginPath(); ctx.arc(x, y, this.H * 0.018, 0, TAU); ctx.fill();
    }
    // clouds
    for (let k = 0; k < 7; k++) {
      const cx = ((k * 211 + t * (2 + k * 0.4) - this.cam.x * 3) % (W + 400) + W + 400) % (W + 400) - 200;
      const cy = horizon - this.H * (0.12 + (k % 4) * 0.08);
      const a = 0.18 + 0.25 * dayEff;
      ctx.fillStyle = rgbStr(mixRgb([40, 44, 56], [236, 240, 244], dayEff), a);
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(cx + j * 40, cy + Math.sin(j) * 6, 90 - j * 10, 18, 0, 0, TAU); ctx.fill(); }
    }
    // the beach / dunes above water (right side)
    const S = this.S, Sy = this.Sy, ppm = this.cam.ppm;
    if (S(975) < W) {
      ctx.fillStyle = rgbStr(mixRgb([30, 28, 24], [196, 180, 146], Math.max(0.15, dayEff)));
      ctx.beginPath(); ctx.moveTo(S(972), Sy(0.2));
      for (let x = 972; x <= 1060; x += 2) ctx.lineTo(S(x), Sy(Math.min(0.2, g.world.floorAt(Math.min(x, 1000)) - (x > 1000 ? (x - 1000) * 0.05 : 0)) + Math.sin(x * 0.3) * 0.1));
      ctx.lineTo(S(1060), Sy(1)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgbStr(mixRgb([20, 24, 18], [80, 96, 56], Math.max(0.15, dayEff)));
      ctx.lineWidth = Math.max(1, ppm * 0.03);
      for (let k = 0; k < 30; k++) {
        const x = 985 + k * 2.3, y = g.world.floorAt(Math.min(x, 1000)) - (x > 1000 ? (x - 1000) * 0.05 : 0);
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
        const d = g.world.floorAt(clamp(fx, 0, 1000)) - off + fbm1(fx / 40, 3, 99) * 25;
        const sy = H / 2 + (d - cam.y) * ppm * par;
        ctx.lineTo(sx, Math.max(Sy(0) + 4, sy));
      }
      ctx.lineTo(W + 20, H + 10); ctx.closePath(); ctx.fill();
    }
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
    for (let i = gx0; i < gx1; i += 2) {
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
    ctx.fillStyle = d < 200 ? 'rgba(160,120,90,0.25)' : 'rgba(200,200,190,0.12)';
    for (let k = 0; k < 10; k++) {
      const p = rk.poly[(k * 3) % rk.poly.length];
      ctx.beginPath(); ctx.arc(S(p.x) + Math.sin(rk.seed + k) * ppm * 0.4, Sy(p.y) + Math.cos(rk.seed + k) * ppm * 0.4, Math.max(1, ppm * 0.15), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- baked kelp backdrop ----------
  bakeKelpBackdrop(world) {
    const PX = 22, X0 = 760, X1 = 935, DEP = 46; // pixels per metre, world span, depth span
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
      // stalks
      for (let x = rnd() * 30; x < c.width; x += 26 + rnd() * 44) {
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
      layers.push({ c, f, X0, PX });
    }
    this.kelpBack = layers;
  }

  drawKelpBackdrop(g, ppm, t) {
    const cam = this.cam;
    if (cam.x < 700 || cam.x > 1000 || cam.y > 120) return;
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
      case 'sapphire': {
        const s = 0.5 + 0.5 * Math.sin(t * 2 + p.phase);
        ctx.fillStyle = '#0c2a8a';
        ctx.beginPath(); ctx.moveTo(0, -u * 0.42); ctx.lineTo(u * 0.2, -u * 0.18); ctx.lineTo(u * 0.12, 0); ctx.lineTo(-u * 0.12, 0); ctx.lineTo(-u * 0.2, -u * 0.18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a6ae8'; ctx.beginPath(); ctx.moveTo(0, -u * 0.42); ctx.lineTo(u * 0.2, -u * 0.18); ctx.lineTo(0, -u * 0.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(220,235,255,${(0.4 + s * 0.5).toFixed(3)})`; ctx.fillRect(-u * 0.04, -u * 0.34, u * 0.04, u * 0.04);
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
    for (let i = 0; i <= 8; i++) {
      const d = lerp(dTop, dBot, i / 8);
      if (d < 0) { gr.addColorStop(i / 8, 'rgb(255,255,255)'); continue; }
      const a = ambientAt(d, g.dayEff) * dim;
      const tint = sampleTable(LIGHT_TINT, d);
      gr.addColorStop(i / 8, rgbStr([255 * a * tint[0], 255 * a * tint[1], 255 * a * tint[2]]));
    }
    l.fillStyle = gr; l.fillRect(0, 0, LW, LH);
    // the entity swallows light around it
    const ent = g.entity;
    if (ent && g.mode !== 'menu' && ent.dist < 260) {
      const ex = S(ent.x) * k, ey = Sy(ent.y) * k, r = (30 + 40 * fx.dread) * ppm * k;
      const eg = l.createRadialGradient(ex, ey, 0, ex, ey, r);
      eg.addColorStop(0, 'rgba(0,0,0,0.95)'); eg.addColorStop(0.5, 'rgba(0,0,0,0.6)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = eg; l.beginPath(); l.arc(ex, ey, r, 0, TAU); l.fill();
    }
    l.globalCompositeOperation = 'lighter';
    const radial = (x, y, r, col, a) => {
      const gg = l.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(1, rgbStr(col, 0));
      l.fillStyle = gg; l.beginPath(); l.arc(x * k, y * k, r * k, 0, TAU); l.fill();
    };
    // A lamp in seawater: three nested cones give a soft edge instead of a hard wedge, and the
    // light falls off fast and turns blue-green with distance as the water absorbs the red.
    const cone = (x, y, ang, range, spread, col, a) => {
      const far = mixRgb(col, WATER_LIT, 0.65);
      for (const [sm, am] of [[1.3, 0.2], [0.85, 0.32], [0.5, 0.48]]) {
        const gg = l.createRadialGradient(x * k, y * k, 0, x * k, y * k, range * k);
        gg.addColorStop(0, rgbStr(col, a * am)); gg.addColorStop(0.12, rgbStr(col, a * am * 0.85));
        gg.addColorStop(0.4, rgbStr(far, a * am * 0.4)); gg.addColorStop(0.75, rgbStr(WATER_LIT, a * am * 0.1));
        gg.addColorStop(1, rgbStr(WATER_LIT, 0));
        l.fillStyle = gg;
        l.beginPath(); l.moveTo(x * k, y * k);
        l.arc(x * k, y * k, range * k, ang - spread * sm, ang + spread * sm); l.closePath(); l.fill();
      }
    };
    const e = g.earl;
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const flick = (fx.torchShift > 0.6 ? (Math.random() < 0.06 ? 0.3 : 1) : 1) * fx.lightPulse;
    if (head && e.lampOn) {
      const ang = e.facing > 0 ? e.angle + head.beamA : Math.PI - e.angle - head.beamA;
      cone(head.x, head.y, ang, 17 * ppm, 0.32, beamCol, 0.95 * flick);
      radial(head.x, head.y, 2.6 * ppm, beamCol, 0.3 * flick);
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
      radial(sx, sy, 14 * ppm, [140, 165, 175], 0.2 * fx.lightPulse);
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
    if (g.lure) radial(S(g.lure.x), Sy(g.lure.y), 8 * ppm, [170, 230, 255], 0.9);
    for (const v of g.world.vents) {
      const x = S(v.x), y = Sy(v.y - v.h);
      if (x < -500 || x > this.W + 500 || y < -500 || y > this.H + 500) continue;
      radial(x, y, 9 * ppm, [255, 120, 60], 0.22 + 0.06 * Math.sin(g.time * 3 + v.phase));
    }
    for (const [x, y, col, r] of glowPts) radial(x, y, Math.max(r * 2.5, ppm * 0.8), hexToRgb(col), 0.7 * fx.bioPulse);
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
    const rayStrength = dayEff * clamp(1 - cam.y / 110, 0, 1) * (1 - fx.darken);
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
        const gg = ctx.createLinearGradient(0, top, 0, top + len);
        gg.addColorStop(0, `rgba(210,240,255,${a.toFixed(3)})`); gg.addColorStop(1, 'rgba(210,240,255,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(sx - w, top); ctx.lineTo(sx + w, top); ctx.lineTo(sx + w * 3 + len * 0.18, top + len); ctx.lineTo(sx - w + len * 0.18, top + len); ctx.closePath(); ctx.fill();
      }
    }
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const amb = ambientAt(g.earl.y, g.dayEff);
    const haze = clamp(1 - amb * 1.6, 0, 1);
    // faint scattered light inside the beam (soft-edged), plus the particles it catches
    const coneHaze = (x, y, ang, range, spread, col, a) => {
      const far = mixRgb(col, WATER_LIT, 0.7);
      for (const [sm, am] of [[1.2, 0.35], [0.7, 0.65]]) {
        const gg = ctx.createRadialGradient(x, y, 0, x, y, range);
        gg.addColorStop(0, rgbStr(col, a * am)); gg.addColorStop(0.3, rgbStr(far, a * am * 0.45)); gg.addColorStop(1, rgbStr(WATER_LIT, 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, range, ang - spread * sm, ang + spread * sm); ctx.closePath(); ctx.fill();
      }
    };
    const motes = (x, y, ang, range, spread, col, a) => {
      // the same deterministic particle field as the marine snow, but finer, lit only inside the cone
      const rm = range / ppm, cell = 0.9;
      const wx = cam.x + (x - this.W / 2) / ppm, wy = cam.y + (y - this.H / 2) / ppm;
      const i0 = Math.floor((wx - rm) / cell), i1 = Math.ceil((wx + rm) / cell);
      const j0 = Math.floor(Math.max(0.5, wy - rm) / cell), j1 = Math.ceil((wy + rm) / cell);
      const ca = Math.cos(ang), sa = Math.sin(ang), cosS = Math.cos(spread);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const h = Math.abs(Math.sin(i * 91.7 + j * 47.3) * 24634.6345) % 1;
        if (h > 0.5) continue;
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
      const ang = e.facing > 0 ? e.angle + head.beamA : Math.PI - e.angle - head.beamA;
      coneHaze(head.x, head.y, ang, 15 * ppm, 0.28, beamCol, 0.06 * haze * lp);
      motes(head.x, head.y, ang, 15 * ppm, 0.3, beamCol, 0.8 * haze * lp);
      glare(head.x, head.y, beamCol, 0.5 * lp);
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
    for (const [x, y, col, r] of glowPts) halo(x, y, Math.max(r, ppm * 0.4), hexToRgb(col), 0.5 * haze * fx.bioPulse);
    if (g.lure) halo(S(g.lure.x), Sy(g.lure.y), ppm * 1.5, [180, 235, 255], 0.6);
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
