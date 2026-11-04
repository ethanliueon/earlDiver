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
  [0, [78, 172, 196]], [30, [44, 134, 176]], [120, [22, 86, 138]], [300, [12, 52, 98]], [1000, [6, 30, 64]], [3000, [4, 20, 44]],
];
const LIGHT_TINT = [
  [0, [1.0, 1.0, 1.0]], [10, [0.82, 0.97, 1.0]], [40, [0.55, 0.88, 1.0]], [150, [0.38, 0.72, 1.0]], [600, [0.25, 0.55, 0.95]],
];
const FLOOR_COL = [
  [0, [196, 182, 146]], [40, [178, 168, 138]], [150, [128, 122, 104]], [600, [92, 88, 80]], [3000, [70, 68, 64]],
];
const BEAM_CALM = [214, 232, 255];
const BEAM_DREAD = [255, 96, 46];

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
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) {
      this.c.width = w; this.c.height = h;
      this.lc.width = Math.ceil(w / 2); this.lc.height = Math.ceil(h / 2);
      this.gc.width = w; this.gc.height = h;
    }
  }
  get W() { return this.c.width; }
  get H() { return this.c.height; }

  updateCamera(g, dt) {
    const e = g.earl;
    const targetView = g.mode === 'menu' ? 40 : e.inSub ? 46 : 30;
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
    for (const c of g.fauna.list) {
      if (!inView(c.x, c.y, c.len)) continue;
      const Ld = (c.len + 0.25 * Math.exp(-c.len * 2)) * ppm;
      ctx.save(); ctx.translate(S(c.x), Sy(c.y));
      const tilt = clamp(Math.atan2(c.vy, Math.abs(c.vx) + 0.2), -0.5, 0.5);
      if (c.dir < 0) ctx.scale(-1, 1);
      ctx.rotate(c.sp.v.hab === 'drift' ? 0 : tilt);
      const r = drawSpecies(ctx, c.sp, Ld, c.phase, 1, c.wob);
      ctx.restore();
      if (c.sp.v.glow) {
        if (r) for (const [lx, ly] of r) glowPts.push([S(c.x) + lx * c.dir, Sy(c.y) + ly, c.sp.v.glow, Ld * 0.25]);
        else glowPts.push([S(c.x), Sy(c.y), c.sp.v.glow, Ld * 0.3]);
      }
    }

    // ---- boat + sub ----
    const boatX = S(BOAT_X), boatY = Sy(surfY(BOAT_X) * 0.8);
    let crane = null;
    if (Math.abs(BOAT_X - cam.x) < cam.w) {
      const roll = Math.atan2(surfY(BOAT_X + 4) - surfY(BOAT_X - 4), 8) * 0.7;
      ctx.save(); ctx.translate(boatX, boatY); ctx.rotate(roll);
      ctx.filter = `brightness(${(0.22 + 0.78 * Math.sqrt(dayEff)).toFixed(2)})`;
      crane = drawBoat(ctx, 14 * ppm, t, g.sub);
      ctx.filter = 'none';
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
      ctx.save(); ctx.translate(S(sub.x), Sy(sub.y)); ctx.rotate(sub.tilt * sub.facing); ctx.scale(sub.facing, 1);
      const lights = g.earl.inSub && sub.lightsOn;
      const r = drawSub(ctx, 9 * ppm, t, sub.stress, lights);
      ctx.restore();
      if (lights) subLamps = r;
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
      head = { x: S(e.x) + (h.headX * ca - h.headY * sa) * e.facing, y: Sy(e.y) + (h.headX * sa + h.headY * ca) };
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

  drawKelp(g, S, Sy, ppm, layer, x0, x1) {
    const ctx = this.ctx, t = g.time;
    const surf = g.surfY || (() => 0);
    for (let i = 0; i < g.world.kelp.length; i++) {
      const k = g.world.kelp[i];
      if ((i % 3 === 0 ? 1 : 0) !== layer) continue;
      if (k.x < x0 - 8 || k.x > x1 + 8) continue;
      const topY = k.base - k.h;
      if (k.base < this.cam.y - this.cam.h || topY > this.cam.y + this.cam.h) continue;
      const segs = Math.max(6, Math.floor(k.h / 1.2));
      const pts = [];
      for (let s = 0; s <= segs; s++) {
        const u = s / segs, hh = u * k.h;
        let y = k.base - hh;
        const sway = Math.sin(t * 0.55 + k.phase + hh * 0.12) * hh * 0.07 + Math.sin(t * 1.3 + hh * 0.3) * 0.15 * u + k.lean * hh + g.waveBoost * Math.sin(t * 2 + hh * 0.2) * u * 2;
        if (y < 0.4) y = 0.4 + surf(k.x + sway) * 0.4;
        pts.push([k.x + sway, y]);
      }
      const dark = layer === 1 ? 0.75 : 1;
      ctx.strokeStyle = rgbStr([70 * dark, 58 * dark, 26 * dark]);
      ctx.lineWidth = Math.max(1, ppm * 0.07);
      ctx.beginPath(); for (const [x, y] of pts) ctx.lineTo(S(x), Sy(y)); ctx.stroke();
      // blades
      for (let s = 1; s <= segs; s++) {
        const [x, y] = pts[s];
        const side = s % 2 ? 1 : -1;
        const a = -Math.PI / 2 + side * (0.7 + Math.sin(t * 0.8 + s + k.phase) * 0.2);
        const len = 1.1 * ppm, wid = 0.22 * ppm;
        ctx.save(); ctx.translate(S(x), Sy(y)); ctx.rotate(a);
        ctx.fillStyle = `rgba(${(112 * dark) | 0},${(92 * dark) | 0},${(34 * dark) | 0},0.86)`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.fill();
        // gas bladder
        ctx.fillStyle = `rgba(${(140 * dark) | 0},${(120 * dark) | 0},${(50 * dark) | 0},0.9)`;
        ctx.beginPath(); ctx.arc(len * 0.05, 0, wid * 0.35, 0, TAU); ctx.fill();
        ctx.restore();
      }
      if (k.species === 119) {
        const [x, y] = pts[segs];
        ctx.fillStyle = 'rgb(96,78,34)'; ctx.beginPath(); ctx.arc(S(x), Sy(y), ppm * 0.18, 0, TAU); ctx.fill();
      }
    }
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
        ctx.fillStyle = '#1e2638'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse((k - 1) * u * 0.14, -u * 0.06, u * 0.1, u * 0.045, -0.4 + k * 0.4, 0, TAU); ctx.fill(); }
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
    const cone = (x, y, ang, range, spread, col, a) => {
      const gg = l.createRadialGradient(x * k, y * k, 0, x * k, y * k, range * k);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(0.35, rgbStr(col, a * 0.7)); gg.addColorStop(1, rgbStr(col, 0));
      l.fillStyle = gg;
      l.beginPath(); l.moveTo(x * k, y * k);
      l.arc(x * k, y * k, range * k, ang - spread, ang + spread); l.closePath(); l.fill();
    };
    const e = g.earl;
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const flick = fx.torchShift > 0.6 ? (Math.random() < 0.06 ? 0.3 : 1) : 1;
    if (head && e.lampOn) {
      const ang = e.facing > 0 ? e.angle : Math.PI - e.angle;
      cone(head.x, head.y, ang, 19 * ppm, 0.36, beamCol, 1.0 * flick);
      cone(head.x, head.y, ang, 9 * ppm, 0.6, beamCol, 0.5 * flick);
      radial(head.x, head.y, 4 * ppm, beamCol, 0.45 * flick);
    }
    if (g.protection && g.protection.necklace) radial(S(e.x), Sy(e.y), 9 * ppm, [255, 230, 190], 0.65);
    if (subLamps) {
      const sub = g.sub;
      const sx = S(sub.x), sy = Sy(sub.y);
      const ang = sub.facing > 0 ? sub.tilt : Math.PI - sub.tilt;
      const lp = (p) => [sx + p[0] * sub.facing, sy + p[1]];
      const [ax, ay] = lp(subLamps.lampA), [bx, by] = lp(subLamps.lampB);
      cone(ax, ay, ang, 30 * ppm, 0.3, mixRgb([235, 240, 255], BEAM_DREAD, fx.torchShift), 1.0 * flick);
      cone(bx, by, ang + 0.35 * (sub.facing > 0 ? 1 : -1), 18 * ppm, 0.4, mixRgb([235, 240, 255], BEAM_DREAD, fx.torchShift), 0.8 * flick);
      radial(sx, sy, 6 * ppm, [255, 200, 140], 0.35);
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
    for (const [x, y, col, r] of glowPts) radial(x, y, Math.max(r * 2.5, ppm * 0.8), hexToRgb(col), 0.7);
    // caustic dapples near the surface by day
    if (g.dayEff > 0.3 && cam.y < 40) {
      const a = 0.12 * g.dayEff;
      for (let i = 0; i < 18; i++) {
        const wx = Math.floor(cam.x / 4) * 4 + (i - 9) * 4 + Math.sin(g.time * 0.7 + i) * 1.5;
        const fy = g.world.floorAt(wx);
        if (fy > 40) continue;
        radial(S(wx), Sy(fy) - ppm * 0.3, ppm * 1.6, [255, 255, 240], a * (0.5 + 0.5 * Math.sin(g.time * 2 + i * 1.7)));
      }
    }
  }

  drawGlows(g, S, Sy, ppm, head, subLamps, glowPts, horizon, dayEff) {
    const ctx = this.ctx, cam = this.cam, fx = g.fx, t = g.time;
    // god rays near the surface
    const rayStrength = dayEff * clamp(1 - cam.y / 110, 0, 1) * (1 - fx.darken);
    if (rayStrength > 0.01) {
      for (let i = 0; i < 9; i++) {
        const wx = Math.floor(cam.x / 9) * 9 + (i - 4) * 9 + Math.sin(t * 0.13 + i * 2.1) * 3;
        const top = Sy(0), w = ppm * (1.5 + (i % 3)), len = ppm * 70;
        const sx = S(wx);
        const a = rayStrength * (0.05 + 0.04 * Math.sin(t * 0.4 + i * 1.3));
        const gg = ctx.createLinearGradient(0, top, 0, top + len);
        gg.addColorStop(0, `rgba(210,240,255,${a.toFixed(3)})`); gg.addColorStop(1, 'rgba(210,240,255,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(sx - w, top); ctx.lineTo(sx + w, top); ctx.lineTo(sx + w * 3 + len * 0.18, top + len); ctx.lineTo(sx - w + len * 0.18, top + len); ctx.closePath(); ctx.fill();
      }
    }
    const beamCol = mixRgb(BEAM_CALM, BEAM_DREAD, fx.torchShift);
    const amb = ambientAt(g.earl.y, g.dayEff);
    const haze = clamp(1 - amb * 1.6, 0, 1);
    const coneHaze = (x, y, ang, range, spread, col, a) => {
      const gg = ctx.createRadialGradient(x, y, 0, x, y, range);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(1, rgbStr(col, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, range, ang - spread, ang + spread); ctx.closePath(); ctx.fill();
    };
    const e = g.earl;
    if (head && e.lampOn && haze > 0) {
      const ang = e.facing > 0 ? e.angle : Math.PI - e.angle;
      coneHaze(head.x, head.y, ang, 16 * ppm, 0.3, beamCol, 0.09 * haze);
    }
    if (subLamps && haze > 0) {
      const sub = g.sub;
      const ang = sub.facing > 0 ? sub.tilt : Math.PI - sub.tilt;
      coneHaze(S(sub.x) + subLamps.lampA[0] * sub.facing, Sy(sub.y) + subLamps.lampA[1], ang, 26 * ppm, 0.26, beamCol, 0.08 * haze);
    }
    const halo = (x, y, r, col, a) => {
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, rgbStr(col, a)); gg.addColorStop(1, rgbStr(col, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    for (const lt of g.world.lanterns) {
      const x = S(lt.x), y = Sy(lt.y);
      if (x < -200 || x > this.W + 200 || y < -200 || y > this.H + 200) continue;
      halo(x, y, ppm * (1.5 + lt.charge * 1.5), hsl(lt.hue, 0.7, 0.65), 0.35 * (0.3 + 0.7 * lt.charge) * haze);
      if (lt.active > 0.01) {
        ctx.strokeStyle = rgbStr(hsl(lt.hue, 0.7, 0.7), 0.12 * lt.active);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, LANTERN_RADIUS * ppm, 0, TAU); ctx.stroke();
      }
    }
    for (const [x, y, col, r] of glowPts) halo(x, y, Math.max(r, ppm * 0.4), hexToRgb(col), 0.5 * haze);
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
