import { drawPrompt, promptShade, parsePrompt, depthCounter, dymo, tubeGauge, brassBezel, keyCap, oliveNine, HUDF } from './fittings.js';
import { lockerTexture } from './textures.js';
// (olive) a small plate of the locker's painted steel (the same painter, so the same material), cached by size
const PLATES = new Map();
function steelPlate(ctx, x, y, w, h, s) {
  const W2 = Math.round(w), H2 = Math.round(h), k = W2 + 'x' + H2;
  let im = PLATES.get(k);
  if (!im) { im = new Image(); im.src = lockerTexture(W2, H2, { plain: true }); PLATES.set(k, im); }
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = '#3b4434'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 4 * s); ctx.fill(); ctx.restore();
  if (im.complete && im.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 4 * s); ctx.clip(); ctx.drawImage(im, x, y, w, h); ctx.restore(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4 * s); ctx.stroke();
}
// (4.27) the painted HUD icons (tools/icon_kit.py)
const ICONS = {};
function hudIcon(n) { let im = ICONS[n]; if (!im) { im = new Image(); im.src = `assets/ui/icons/${n}.png`; ICONS[n] = im; } return im.complete && im.naturalWidth ? im : null; }
const parsePromptKey = (t) => parsePrompt(t).some((p) => p.key);
import { TITLES, LEGEND_OF } from './species.js';
// (3.0.42) a Legendary's title in a message: never 'the the fangtooth', always 'the Fangtooth'
const TITLE_RE = Object.values(TITLES).concat(Object.values(LEGEND_OF).map((x) => x[0])).map((t) => [new RegExp(`\\b(?:the |an? )?${t}\\b`, 'gi'), t]);
export function titled(text) { let out = String(text); for (const [re, t] of TITLE_RE) out = out.replace(re, t); return out.charAt(0).toUpperCase() + out.slice(1); }
// HUD drawn on its own canvas (not affected by the dread filters):
// survival timer + oxygen bar (top right), the right-hand dive monitor
// (depth, radar, heart rate, journal), item slots and prompts.
import { clamp, lerp, formatTime, TAU } from './util.js';
import { SUB_LEVELS, diverDrainMult } from './player.js';
import { RESOURCES, boatDock } from './world.js';
import { GOODS, money, gear, owns } from './economy.js';
import { BOAT } from './world.js';
import { VARIANTS } from './variants.js';
import { speciesIcon } from './creatures_draw.js';
import { SETTINGS } from './settings.js';
import { toolIcon } from './tools_draw.js';
import { bagSlots, tankSlots, pressSlots, NETS_SUB, TOW_MAX, netKinds, netsOf, tankUsed, BIG, hasBigTank, bigIn } from './capture.js';
import { SPECIES_BY_ID } from './species.js';

const MONO = '"Barlow Semi Condensed", "Arial Narrow", sans-serif';
const HUDT = '"Barlow Condensed", "Arial Narrow", sans-serif'; // (4.28) the instruments' figures
const GAME = '"Barlow Semi Condensed", "Arial Narrow", system-ui, sans-serif'; // (4.27) the HUD face

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.ecg = new Array(120).fill(0); this.ecgT = 0; this.beatPhase = 0;
    this.sweep = 0; this.blip = null; this.toasts = []; this.journalHot = null; this.chartHot = null;
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    // (4.17.0) the UI scale: from the screen's height, but never below 0.7 of the design (a phone held sideways is
    // only ~390 px tall) nor above 1.5; and the notch's safe areas kept clear
    this.s = Math.min(1.6 * dpr, Math.max(h / 780, 0.8 * dpr)); // (4.26) larger: readable at a glance // (claude-polish) as the comment above says: the clamp was never applied, so a phone's instruments were drawn at 0.43 and unreadable
    if (!this.safeEl) { this.safeEl = document.createElement('div'); this.safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(this.safeEl); }
    const cs = getComputedStyle(this.safeEl); this.safe = { l: parseFloat(cs.paddingLeft) * dpr || 0, r: parseFloat(cs.paddingRight) * dpr || 0, t: parseFloat(cs.paddingTop) * dpr || 0, b: parseFloat(cs.paddingBottom) * dpr || 0 };
  }
  // explanations: only when hints are on (H)
  hint(text) { if (this.hints) this.toast(text, 'note'); }
  toast(text, kind = '') {
    text = titled(String(text).replace(/\s+·\s+/g, ', ')); // (4.26) no middle dots in what the game says
    // the same line again while it is still up: count it ("x2") instead of stacking a copy
    const same = this.toasts.find((tt) => tt.text === text && tt.kind === kind && tt.t < 3.5);
    if (same) { same.t = Math.min(same.t, 0.4); if (this.onShow) this.onShow(text, kind); return; } // (4.5.0) said again: the line stays up (no count)
    this.toasts.push({ text, kind, t: 0 }); if (this.toasts.length > 4) this.toasts.shift();
    if (this.onShow) this.onShow(text, kind); // (3.4.0) said by the message line (messages.js), not drawn here
  }

  // The hotbar (1 net, 2 slurp gun) and a row of specimen slots above it.
  // (5.1) The hands, bottom right, where a thumb will be: one round action button (the tool in hand: net, camera,
  // traps; in the sub the claw) with the bag's pockets (in the sub, the tank's places) as marks round its rim, and
  // above it a small chip for each tool to switch to. Every one is a button (click now, tap later); the key it
  // stands for is printed on it. Bottom left is left empty, for a stick one day.
  drawGear(g, W, H, s, dt) {
    const ctx = this.ctx, P = g.profile, e = g.earl, kx = window.innerWidth / this.c.width;
    this.icons = this.icons || new Map();
    const icon = (kind, tier) => {
      const k = kind + (tier && typeof tier === 'object' ? (tier.fx || '') + (tier.base || 0) + (tier.hoop || '') + (tier.body || '') + (tier.shape || '') : tier);
      if (!this.icons.has(k)) this.icons.set(k, toolIcon(kind, tier, 120, 60));
      return this.icons.get(k);
    };
    const hot = (x, y, w, h, key) => this.hots.push({ x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, w: w * kx, h: h * kx, key });
    const G = (k) => gear(P, k);
    const pad = 26 * s, R = 40 * s, cx = W - pad - R, cy = H - pad - R;
    this.actionC = { cx, cy, R };
    const tr = P.traps || {}, ownedTraps = ['pot', 'fish', 'steel', 'cage'].reduce((a, k) => a + (tr[k] || 0), 0);
    const tools = [['1', 'net', G('net').look]];
    if (owns(P, 'camera')) tools.push(['2', 'cam', G('cam').look]);
    if (ownedTraps > 0) tools.push(['3', 'trap', ['pot', 'fish', 'steel', 'cage'].findIndex((k) => tr[k] > 0)]);
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    const plate = (x, y, r, lift = 1) => {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetY = 2 * s;
      const pg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
      pg.addColorStop(0, `rgba(${Math.round(84 * lift)},${Math.round(92 * lift)},${Math.round(72 * lift)},0.96)`); pg.addColorStop(1, 'rgba(34,38,30,0.96)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(12,14,10,0.9)'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,230,0.12)'; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.arc(x, y, r - 2 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.fillStyle = 'rgba(8,12,10,0.55)'; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    };
    const fit = (im, x, y, w) => { const h = w * im.height / im.width; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); };
    // ---- the action button ----
    const armT = e.inSub && owns(P, 'arm');
    const ready = !!g.catchTarget || (e.inSub && g.capPrompt && g.capPrompt.startsWith('Space'));
    plate(cx, cy, R, ready ? 1.25 : 1);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, 0, TAU); ctx.clip();
    if (e.inSub) {
      ctx.globalAlpha = armT ? 1 : 0.3; ctx.strokeStyle = '#d8d0b6'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      const o = g.armGame ? 0.15 : 0.5; // the claw, open or closing
      ctx.beginPath(); ctx.moveTo(cx - R * 0.45, cy + R * 0.2); ctx.lineTo(cx - R * 0.05, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R * 0.05, cy); ctx.quadraticCurveTo(cx + R * 0.3, cy - R * o, cx + R * 0.45, cy - R * (o * 0.3)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R * 0.05, cy); ctx.quadraticCurveTo(cx + R * 0.3, cy + R * o, cx + R * 0.45, cy + R * (o * 0.3)); ctx.stroke();
    } else if (sel) {
      const t = tools.find((q) => q[1] === sel) || tools[0];
      fit(icon(t[1], t[2]), cx, cy, R * (t[1] === 'cam' ? 1.05 : 1.45));
    }
    ctx.restore();
    // its progress: a swing, an exposure, the claw's reach
    const prog = g.photo ? g.photo.t / g.photo.dur : g.capture && g.capture.dur ? g.capture.t / g.capture.dur : 0;
    if (prog > 0) { ctx.strokeStyle = 'rgba(244,246,240,0.9)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(cx, cy, R - 4 * s, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(prog, 0, 1)); ctx.stroke(); }
    if (ready) { const q = 0.5 + 0.5 * Math.sin(g.time * 5); ctx.strokeStyle = `rgba(244,246,240,${(0.35 + 0.4 * q).toFixed(3)})`; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(cx, cy, R + 3 * s + q * 2 * s, 0, TAU); ctx.stroke(); }
    // the pockets round the rim: each a short arc, lit in the colour of how its animal is
    {
      const n = e.inSub ? tankSlots(g) : bagSlots(g), used = e.inSub ? tankUsed(g) : g.bag.length;
      const span = Math.PI * 0.75, a0 = -Math.PI * 0.375, step = span / Math.max(1, n), rr = R + 8 * s; // (on its outer side, clear of the chips)
      for (let i = 0; i < n; i++) {
        const sp = !e.inSub ? g.bag[i] : null, full = i < used;
        const c = sp ? sp.cond : 1;
        ctx.strokeStyle = !full ? 'rgba(10,14,12,0.6)' : sp && c <= 0.05 ? 'rgba(150,150,150,0.95)' : sp && c < 0.5 ? 'rgba(226,80,64,0.95)' : 'rgba(170,226,170,0.95)';
        ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, rr, a0 + i * step + step * 0.18, a0 + (i + 1) * step - step * 0.18); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    keyCap(ctx, cx - R - 4 * s, cy + R - 20 * s, 'Space', s * 0.62);
    if (!(e.inSub && !armT)) hot(cx - R, cy - R, R * 2, R * 2, ' ');
    // ---- (5.1) the tools to switch to, and the things he carries (Q, E, R, N), as small round buttons in an arc
    // round the action button's upper left: two rings, so a short phone screen still has room above
    const chips = [];
    if (!e.inSub && tools.length > 1) for (const [key, kind, tier] of tools) chips.push({ tool: true, key, kind, tier, on: kind === sel });
    for (const [id, key, name, n, col, active, badge] of this.itemSlots || []) chips.push({ key: id, cap: key, name, n, col, active, badge });
    const r = 22 * s, rho0 = R + 44 * s, rho1 = rho0 + 54 * s, A0 = [-92, -136, -180], A1 = [-92, -114, -136, -158];
    let top = cy - R - 14 * s, low = cx - R - 22 * s;
    chips.forEach((c, i) => {
      const ring = i < 3 ? 0 : 1, ang = (ring ? A1[i - 3] : A0[i]) * Math.PI / 180, rho = ring ? rho1 : rho0;
      if (ang === undefined || isNaN(ang)) return;
      const x = cx + Math.cos(ang) * rho, y = cy + Math.sin(ang) * rho;
      plate(x, y, r, c.on ? 1.3 : 0.85);
      if (c.tool) {
        ctx.save(); ctx.globalAlpha = c.on ? 1 : 0.6; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.clip(); fit(icon(c.kind, c.tier), x, y, r * (c.kind === 'cam' ? 1.25 : 2.1)); ctx.restore();
        if (c.on) { ctx.strokeStyle = 'rgba(236,230,210,0.95)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, y, r + 2.5 * s, 0, TAU); ctx.stroke(); }
        const cnt = c.kind === 'cam' ? g.items.film || 0 : c.kind === 'trap' ? ownedTraps - g.traps.length : null;
        if (cnt != null) { ctx.save(); ctx.font = `600 ${11 * s}px ${HUDF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cnt ? 'rgba(236,230,210,0.95)' : '#f06a5c'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3 * s; ctx.fillText(String(cnt), x + r * 0.78, y + r * 0.78); ctx.restore(); }
        keyCap(ctx, x - r - 5 * s, y - r - 3 * s, c.key, s * 0.55);
      } else {
        ctx.fillStyle = c.col; ctx.globalAlpha = c.n > 0 ? 1 : 0.3; ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        if (c.active > 0) { ctx.strokeStyle = c.col; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, y, 12 * s, -Math.PI / 2, -Math.PI / 2 + TAU * c.active); ctx.stroke(); }
        ctx.save(); ctx.font = `600 ${11 * s}px ${HUDF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(236,230,210,0.95)'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3 * s;
        const cnt = c.key === 'n' ? (c.badge > 1 ? c.badge : null) : c.n; if (cnt != null) ctx.fillText(String(cnt), x + r * 0.78, y + r * 0.78);
        ctx.restore();
        if (!(c.key === 'n' && g.trawlTaught)) keyCap(ctx, x - r - 5 * s, y - r - 3 * s, c.cap, s * 0.55);
      }
      hot(x - r, y - r, r * 2, r * 2, c.key);
      top = Math.min(top, y - r - 12 * s);
      if (y > cy - R * 1.2) low = Math.min(low, x - r - 16 * s);
    });
    this.pillRight = low;
    this.chipTop = top;
    // the arm's grip gauge: a marker sweeping a bar; close the claw in the green
    const A = g.armGame;
    if (A && A.phase === 'grip') {
      const bw = 260 * s, bh = 14 * s, bx = W / 2 - bw / 2, by = H * 0.62;
      ctx.fillStyle = 'rgba(6,12,14,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 6 * s, by - 6 * s, bw + 12 * s, bh + 12 * s, 6 * s); ctx.fill();
      ctx.fillStyle = 'rgba(200,80,60,0.55)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(232,176,64,0.8)'; ctx.fillRect(bx + bw * A.amber[0], by, bw * (A.amber[1] - A.amber[0]), bh);
      ctx.fillStyle = 'rgba(120,220,140,0.9)'; ctx.fillRect(bx + bw * A.green[0], by, bw * (A.green[1] - A.green[0]), bh);
      ctx.fillStyle = '#f4f4ee'; ctx.fillRect(bx + bw * A.marker - 1.5 * s, by - 4 * s, 3 * s, bh + 8 * s);
      ctx.font = `${10 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,236,230,0.7)'; ctx.textBaseline = 'top';
      ctx.fillText('GRIP', W / 2, by + bh + 8 * s);
    }
    // the last photograph: a print in the corner, with the animal on it
    const pc = this.photoCard;
    if (pc) {
      pc.t += dt;
      if (pc.t > 3.5) this.photoCard = null;
      else {
        if (!pc.img) pc.img = speciesIcon(pc.sp, 200, 120);
        const a = clamp(Math.min(pc.t * 4, (3.5 - pc.t) * 2), 0, 1);
        const cw = 150 * s, ch = 118 * s, px = W - cw - 26 * s, py = H - ch - 26 * s;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(px + cw / 2, py + ch / 2); ctx.rotate(-0.04);
        ctx.fillStyle = '#ece6d6'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14 * s;
        ctx.fillRect(-cw / 2, -ch / 2, cw, ch); ctx.shadowBlur = 0;
        ctx.fillStyle = '#163a4a'; ctx.fillRect(-cw / 2 + 8 * s, -ch / 2 + 8 * s, cw - 16 * s, ch - 34 * s);
        ctx.drawImage(pc.img, -cw / 2 + 10 * s, -ch / 2 + 10 * s, cw - 20 * s, ch - 38 * s);
        ctx.fillStyle = '#2b2620'; ctx.font = `600 ${13 * s}px ${HUDF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((pc.variant ? VARIANTS[pc.variant].name + ' ' : '') + pc.sp.name, 0, ch / 2 - 13 * s);
        ctx.restore();
      }
    }
    // a second row inside the sub: what is still in the bag outside the tank
    ctx.textBaseline = 'top';
  }

  // A strip of sonar: the seabed profile 80 m each side of the sub, scaled to fit, with the sub at the
  // top and a sounding straight down. Refreshed with each ping (twice a second), not every frame.
  drawSonar(ctx, g, rx0, y0, s) {
    const w = 150 * s, h = 70 * s, x0 = rx0 - w, sub = g.sub, W = g.world, now = g.time;
    const P = this.sonarP;
    if (!P || now - P.t > 0.5 || Math.abs(P.x - sub.x) > 4 || Math.abs(P.y - sub.y) > 4) {
      const xs = [], N = 64;
      for (let i = 0; i <= N; i++) { const x = sub.x - 80 + 160 * i / N; xs.push(W.floorAt(Math.max(0, Math.min(4999, x)))); }
      this.sonarP = { t: now, x: sub.x, y: sub.y, fl: xs, below: W.floorAt(sub.x) - sub.y };
    }
    const S = this.sonarP, top = sub.y - 8, span = Math.max(40, Math.min(1500, Math.max(...S.fl) - top + 10));
    const Y = (d) => y0 + 12 * s + (d - top) / span * (h - 14 * s);
    ctx.save();
    // (olive) the trace behind glass set into a raised olive plate, as the other instruments
    oliveNine(ctx, 'btn-olive', x0 - 6 * s, y0 - 6 * s, w + 12 * s, h + 12 * s, 28, 10 * s);
    ctx.fillStyle = 'rgba(4,16,13,0.92)'; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 3 * s); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 5 * s); ctx.clip();
    // the seabed: a filled profile, brighter along its edge where the echo comes back
    ctx.beginPath(); ctx.moveTo(x0, y0 + h);
    S.fl.forEach((d, i) => ctx.lineTo(x0 + w * i / (S.fl.length - 1), Y(d)));
    ctx.lineTo(x0 + w, y0 + h); ctx.closePath();
    ctx.fillStyle = 'rgba(60,170,120,0.22)'; ctx.fill();
    ctx.strokeStyle = 'rgba(110,230,170,0.75)'; ctx.lineWidth = 1.2 * s; ctx.beginPath();
    S.fl.forEach((d, i) => { const x = x0 + w * i / (S.fl.length - 1), y = Y(d); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    // the ping: a ring going out from the sub, fading
    const ph = ((now % 0.5) / 0.5), sx = x0 + w / 2, sy = Y(sub.y);
    ctx.strokeStyle = `rgba(110,230,170,${(0.35 * (1 - ph)).toFixed(3)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, ph * w * 0.6, 0, Math.PI); ctx.stroke();
    // the sounding straight down, and the sub
    const by = Y(sub.y + S.below);
    ctx.setLineDash([3 * s, 3 * s]); ctx.strokeStyle = 'rgba(216,236,230,0.5)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8d8a8'; ctx.beginPath(); ctx.ellipse(sx, sy, 4 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = `600 ${13 * s}px ${HUDF}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(150,220,180,0.85)';
    ctx.textBaseline = 'bottom'; ctx.fillText(`bottom ${Math.max(0, Math.round(S.below))} m below`, x0 + 5 * s, y0 + h - 3 * s); ctx.textBaseline = 'top'; // (olive: in the reading face, low, clear of the sub's mark)
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(150,220,180,0.6)';
    ctx.fillText(`${Math.round(sub.y + S.below)} m`, x0 + w - 5 * s, y0 + 3 * s);
    ctx.restore();
  }

  // (4.0.0) a prompt's text fading in, and the one it replaced fading out; level: how much is showing
  fadeText(slot, text, col) {
    const st = (this.fadeState || (this.fadeState = {}))[slot] || (this.fadeState[slot] = { items: [], t: performance.now() });
    const now = performance.now(), dt = Math.min(0.1, (now - st.t) / 1000); st.t = now;
    if (text && !st.items.some((q) => q.text === text && q.on)) {
      for (const q of st.items) q.on = false;
      const back = st.items.find((q) => q.text === text); // (4.2.1) the same words coming back while they fade: they come back, not a second copy
      if (back) back.on = true; else st.items.push({ text, col, a: 0, on: true });
    }
    if (!text) for (const q of st.items) q.on = false;
    for (const q of st.items) { if (q.on) q.col = col || q.col; q.a = q.on ? Math.min(1, q.a + dt / 0.16) : Math.max(0, q.a - dt / 0.2); }
    st.items = st.items.filter((q) => q.on || q.a > 0.01).slice(-3);
    return { list: st.items.map((q) => [q.text, q.a, q.col]), level: st.items.reduce((m, q) => Math.max(m, q.a), 0) };
  }
  // (4.17.0) the HUD is drawn inside the screen's safe area (clear of a phone's notch and rounded corners)
  draw(g, dt) {
    const sf = this.safe || { l: 0, r: 0, t: 0, b: 0 }; this.safeL = sf.l; this.safeT = sf.t;
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
    this.ctx.save(); this.ctx.translate(sf.l, sf.t);
    try { this.drawIn(g, dt, this.c.width - sf.l - sf.r, this.c.height - sf.t - sf.b); } finally { this.ctx.restore(); }
  }
  drawIn(g, dt, W, H) {
    const ctx = this.ctx, s = this.s; this.hudNotes = []; this.hots = [];
    if (g.mode === 'menu') return;
    const e = g.earl, fx = g.fx;
    const dying = g.mode === 'dying';
    if (g.holdCursor) { // (4.12.3) the weighted pointer during a long hold: a brass ring, trailing the real one
      const k = W / window.innerWidth, hx = g.holdCursor.x * k, hy = g.holdCursor.y * k, r = 9 * s;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4 * s; ctx.strokeStyle = 'rgba(230,222,196,0.9)'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(230,222,196,0.9)'; ctx.beginPath(); ctx.arc(hx, hy, 2 * s, 0, TAU); ctx.fill(); ctx.restore();
    }
    const red = dying || false;
    const aboard = !!g.aboard && !dying; // on the Margaret's deck or in her cabin: only cash, the prompt and the contracts

    // ---------- (4.27) the instruments ----------
    // Top right, one instrument on one plate: the depth large in a dark window and under it the air (and in the sub
    // the hull), each a painted icon and a wide tube; what it has to say written under it. Bottom right, the radar,
    // large, the sub's button beside it and the things he carries stacked above it. The journal and the chart are
    // pictures under the quest board at the left (HTML, #quests-hud).
    const pad = 26 * s;
    ctx.textBaseline = 'top'; ctx.textAlign = 'right';
    const rx0 = W - pad, CW = 212 * s, cx0 = rx0 - CW, ccx = cx0 + CW / 2;
    this.colX = ccx; this.journalHot = null; this.chartHot = null;
    const kx = window.innerWidth / this.c.width;
    const notes = []; // [text, colour]
    let yy = pad;
    if (!aboard) {
    const onTank = e.inSub && g.sub.o2 <= 0; // an empty cabin: the gauge shows his own tank
    const o2 = e.inSub && !onTank ? g.sub.o2 / g.sub.o2Max : e.o2 / e.o2Max;
    if (!dying) {
      // (4.28) no plate: the depth as bare figures, a dive computer's readout, and the air (in the sub, the hull) as
      // thin lines under it. It cools and dims as he goes down: bright in the sunlit water, a faint cold grey in the
      // dark, and it flickers when he is past what he (or the sub) is built for. Red only for danger.
      const warnD = e.inSub ? g.sub.y / g.sub.rated > 0.9 : e.y > (e.pressStart || 300);
      const past = e.inSub ? g.sub.y > g.sub.rated : e.y > (e.pressStart || 300) * 1.6;
      const dm = clamp((e.y - 120) / 1400, 0, 1), lit = 1 - dm * 0.42;
      const fl = past && Math.random() < 0.06 ? 0.35 : 1;
      const cr = Math.round(lerp(239, 170, dm)), cg = Math.round(lerp(232, 192, dm)), cb = Math.round(lerp(212, 204, dm));
      const ink = (a) => warnD ? `rgba(240,84,72,${(a * fl).toFixed(3)})` : `rgba(${cr},${cg},${cb},${(a * lit * fl).toFixed(3)})`;
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetY = 1;
      const base = pad + 44 * s;
      ctx.font = `600 ${24 * s}px ${HUDT}`; ctx.fillStyle = ink(0.7); ctx.fillText('m', rx0, base);
      ctx.font = `600 ${58 * s}px ${HUDT}`; ctx.fillStyle = ink(1); ctx.fillText(String(Math.round(Math.max(0, e.y))), rx0 - 24 * s, base);
      ctx.restore(); ctx.textBaseline = 'top'; ctx.textAlign = 'right';
      // a thin line with its painted icon at the left
      // (5.0) a short line with its mark in the same letters as the depth: O2 for his air, HULL for the sub's
      const lineW = 132 * s, lx = rx0 - lineW, lh = 6 * s;
      const line = (name, y, frac, col, pulse = 1) => {
        ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4 * s;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.8 * lit).toFixed(3)})`;
        if (name === 'air') { ctx.font = `600 ${15 * s}px ${HUDT}`; const sw2 = ctx.measureText('2').width * 0.7; ctx.fillText('O', lx - 8 * s - sw2 - 1 * s, y + lh / 2 + 1 * s); ctx.font = `600 ${10 * s}px ${HUDT}`; ctx.fillText('2', lx - 8 * s, y + lh / 2 + 5 * s); }
        else { ctx.font = `600 ${12 * s}px ${HUDT}`; ctx.fillText('HULL', lx - 8 * s, y + lh / 2 + 1 * s); }
        ctx.restore();
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(lx, y, lineW, lh, lh / 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${(0.14 * lit).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = lit * pulse; ctx.fillStyle = `rgb(${col.join(',')})`; ctx.shadowColor = `rgba(${col.join(',')},0.6)`; ctx.shadowBlur = 6 * s;
        ctx.beginPath(); ctx.roundRect(lx + 1, y + 1, Math.max(lh - 2, (lineW - 2) * clamp(frac, 0, 1)), lh - 2, (lh - 2) / 2); ctx.fill(); ctx.restore();
      };
      const oc = o2 > 0.25 ? [96, 172, 226] : [226, 66, 52]; // (5.0) blue, then red: no orange
      const ay = base + 16 * s;
      line('air', ay, o2, oc, o2 < 0.1 || g.noAir ? 0.55 + 0.45 * Math.sin(g.time * 10) : 1);
      if (e.inSub) { const hi = clamp(g.sub.hull, 0, 1); line('hull', ay + 22 * s, hi, hi < 0.5 ? [226, 66, 52] : [130, 196, 164]); }
      yy = ay + (e.inSub ? 22 * s : 0) + lh + 18 * s;
      if ((g.loadKg || 0) > 10 && !e.inSub) notes.push([`Heavy: ${Math.round(g.loadKg)} kg`, '#f06a5c']);
      const py = pad - 8 * s;
      // hidden: a small leaf at the plate's left
      if (g.concealed) {
        const icx = cx0 - 16 * s, icy = py + 22 * s;
        ctx.fillStyle = 'rgba(150,200,170,0.9)';
        ctx.beginPath(); ctx.moveTo(icx - 7 * s, icy + 5 * s); ctx.quadraticCurveTo(icx - 6 * s, icy - 7 * s, icx + 7 * s, icy - 6 * s); ctx.quadraticCurveTo(icx + 5 * s, icy + 5 * s, icx - 7 * s, icy + 5 * s); ctx.fill();
      }
    }
    const left = e.inSub && !onTank ? g.sub.o2 / Math.max(0.0001, g.subDrain) : e.o2 / Math.max(0.0001, g.diverDrain);
    const sec = Math.max(0, Math.floor(left));
    const flash = (a, b2) => (Math.sin(g.time * 8) > 0 ? a : b2);
    if (g.noAir && !e.atSurface) { /* (4.28) the message line says it; not twice */ }
    else if (!e.atSurface && o2 < 0.25) notes.push([sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s of air` : `${sec} s of air`, '#f06a5c']);
    // (4.28) no pressure multiplier: the air line draining faster says it
    if (e.inSub) {
      const r = g.sub.y / g.sub.rated, hi = clamp(g.sub.hull, 0, 1);
      if (g.sub.failing != null) notes.push(['Hull failing!', flash('#ff4a3a', '#a02a20')]);
      else if (r > 0.9) notes.push([`Near her ${g.sub.rated} m`, '#f06a5c']);
      else if (hi < 0.99) notes.push(['Hull leaking', '#f06a5c']);
    }
    const ap = g.autopilot;
    if (ap && e.inSub && g.homeRun) notes.push(['Autopilot home', '#e6dec4']);
    if (ap && !e.inSub && !g.sub.imploded && (ap.active || ap.state === 'waiting')) {
      const dsub = Math.hypot(g.sub.x - e.x, g.sub.y - e.y);
      let txt;
      if (ap.state === 'home') txt = `Sub going home`;
      else if (ap.holding && ap.remaining < 3) txt = `Sub holding at ${Math.round(g.sub.y)} m`;
      else if (ap.state === 'waiting') txt = `Sub ${Math.round(dsub)} m away`;
      else txt = `Sub coming, ${Math.ceil(ap.eta || 0)} s`;
      notes.push([txt, ap.holding ? '#f06a5c' : '#e6dec4']);
    }
    // the seafloor sonar (a fitted extra): under the instrument, the bottom below and around the sub, 160 m across
    if (e.inSub && g.addons && g.addons.sonar && !dying && !g.sub.imploded) { this.drawSonar(ctx, g, rx0, yy + 4 * s, s); yy += 88 * s; }
    // (5.1) the radar: top right, under the depth and the air, with the other things to read; notes under it
    const rr = 50 * s, rcx = rx0 - rr, rcy = yy + 6 * s + rr;
    yy = rcy + rr + 16 * s;
    // ---------- the words: under the instrument, centred on it ----------
    {
      let ny = yy;
      ctx.save(); ctx.font = `600 ${19 * s}px ${HUDF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5 * s; ctx.shadowOffsetY = 1;
      for (const [t, c] of notes) { ctx.textAlign = 'right'; ctx.fillStyle = c; ctx.fillText(t, rx0, ny); ny += 24 * s; }
      ctx.restore();
    }
    // ---------- the radar: large, in the bottom right corner ----------
    ctx.save();
    ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.fillStyle = 'rgba(4,20,16,0.6)'; ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(80,200,150,0.15)'; ctx.lineWidth = 1;
    for (const k of [0.5, 1]) { ctx.beginPath(); ctx.arc(rcx, rcy, rr * k, 0, TAU); ctx.stroke(); }
    this.sweep = (this.sweep + dt * 1.6) % TAU;
    const sg = ctx.createConicGradient ? ctx.createConicGradient(this.sweep - 0.9, rcx, rcy) : null;
    if (sg) { sg.addColorStop(0, 'rgba(80,220,160,0)'); sg.addColorStop(0.14, 'rgba(80,220,160,0.22)'); sg.addColorStop(0.145, 'rgba(80,220,160,0)'); ctx.fillStyle = sg; ctx.fillRect(rcx - rr, rcy - rr, rr * 2, rr * 2); }
    // his traps: small amber marks where their lines are
    for (const tr of g.traps || []) {
      const dx = tr.x - e.x, dy = tr.y - e.y, d = Math.hypot(dx, dy);
      if (d > 200) continue;
      const k = rr * Math.min(1, d / 200);
      ctx.fillStyle = 'rgba(240,190,90,0.9)'; ctx.beginPath(); ctx.arc(rcx + dx / (d || 1) * k, rcy + dy / (d || 1) * k, 2 * s, 0, TAU); ctx.fill();
    }
    const ent = g.entity;
    if (ent && ent.dist < 200 && !dying) {
      const a = Math.atan2(ent.y - e.y, ent.x - e.x);
      const da = ((this.sweep - a) % TAU + TAU) % TAU;
      if (da < dt * 1.7 + 0.001) { this.blip = { a, d: ent.dist, life: 1 }; g.audio && g.audio.sonar(0.03 + fx.dread * 0.04); }
    }
    if (this.blip) {
      this.blip.life -= dt * 0.45;
      if (this.blip.life <= 0) this.blip = null;
      else {
        const r = (this.blip.d / 200) * rr;
        const bxp = rcx + Math.cos(this.blip.a) * r, byp = rcy + Math.sin(this.blip.a) * r;
        const bg2 = ctx.createRadialGradient(bxp, byp, 0, bxp, byp, 6 * s);
        bg2.addColorStop(0, `rgba(255,90,70,${this.blip.life})`); bg2.addColorStop(1, 'rgba(255,90,70,0)');
        ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bxp, byp, 6 * s, 0, TAU); ctx.fill();
      }
    }
    // the sapphire eye: sapphires within 150 m are blue points
    if (g.profile && g.profile.eye && !dying) {
      for (const p of g.world.pickups) {
        if (p.taken || p.type !== 'sapphire') continue;
        const ds = Math.hypot(p.x - e.x, p.y - e.y);
        if (ds > 150) continue;
        const as = Math.atan2(p.y - e.y, p.x - e.x), k = ds / 200;
        ctx.fillStyle = `rgba(110,150,255,${(0.6 + 0.3 * Math.sin(g.time * 3 + p.phase)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(rcx + Math.cos(as) * k * rr, rcy + Math.sin(as) * k * rr, 2 * s, 0, TAU); ctx.fill();
      }
    }
    // the sub's transponder: a steady pale square inside 200 m, a tick on the rim beyond
    if (!e.inSub && !g.sub.imploded && !dying) {
      const ds = Math.hypot(g.sub.x - e.x, g.sub.y - e.y), as = Math.atan2(g.sub.y - e.y, g.sub.x - e.x);
      const k = Math.min(1, ds / 200) * (ds > 200 ? 0.92 : 1);
      const sxp = rcx + Math.cos(as) * k * rr, syp = rcy + Math.sin(as) * k * rr;
      const on = ap && ap.active ? 0.55 + 0.45 * Math.sin(g.time * 5) : 0.75;
      ctx.fillStyle = `rgba(240,220,160,${on.toFixed(3)})`;
      const q = (ds > 200 ? 1.6 : 2.2) * s;
      ctx.fillRect(sxp - q, syp - q, q * 2, q * 2);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(216,236,230,0.8)'; ctx.beginPath(); ctx.arc(rcx, rcy, 1.6 * s, 0, TAU); ctx.fill();
    brassBezel(ctx, rcx, rcy, rr, s);
    const slotBase = this.chipTop || H - 200 * s; // (5.1) the carried things stack upward from above the tool chips
    // (5.1) calling the sub (C) is one of the context buttons beside the action button (see the prompts below)
    this.subHot = null;
    // ---------- Q / E items: in the right-hand column, only when carried ----------
    // (claude-polish) a small steel plate in a brass rim, as the journal and chart buttons
    // (olive) the item slots: the same raised olive plate and well as the hotbar
    const glass = (x, y, w, h) => { if (!oliveNine(ctx, 'btn-olive', x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s, 28, 10 * s)) { ctx.fillStyle = 'rgba(44,48,42,0.9)'; ctx.fillRect(x, y, w, h); } oliveNine(ctx, 'well', x + 4 * s, y + 4 * s, w - 8 * s, h - 8 * s, 30, 6 * s); };
    const sz = 46 * s;
    const slots = [];
    if (g.items.lure > 0 || g.lure) slots.push(['q', 'Q', 'LURE', g.items.lure, '#bfeaff', g.lure ? g.entity.lureT / 10 : 0]);
    if (e.inSub && (g.items.airTank > 0 || g.tankFit)) slots.push(['r', 'R', 'AIR TANK', g.items.airTank, '#9fd4ff', g.tankFit ? g.tankFit / 3 : 0]);
    if (g.items.necklace > 0 || g.necklaceOn) slots.push(['e', 'E', g.necklaceOn ? `GLOW ${Math.ceil(g.glowT || 0)} S` : 'GLOW STICK', g.items.necklace, '#ffc070', g.necklaceOn ? 1 : 0]);
    // the sub's trawl net (N): which net is in the hatch, and while it is out, how long it has been towing
    if (e.inSub) {
      const n = g.subNet, kinds = netKinds(g.items), N = n ? n.T : kinds.length ? NETS_SUB[kinds[0]] : null; // (4.11.0) every kind in the hatch
      const state = n ? (n.phase === 'tow' ? (g.trawlTaught ? 'OUT' : 'OUT, N CLOSES') : n.phase === 'torn' ? 'TORN' : 'HAULING') : kinds.length ? kinds.map((k) => NETS_SUB[k].short).join(' + ') : 'NO NET';
      if (n || N) slots.push(['n', 'N', state, n || N ? 1 : 0, n ? '#e8b070' : kinds.includes('adv') ? '#f0c060' : '#e8b070', n && n.phase === 'tow' ? Math.min(1, n.pt / (n.T.tow || TOW_MAX)) : 0, n ? 0 : netsOf(g.items).basic]); // (the badge: two beginner nets)
    }
    this.itemSlots = slots; this.slotHot = {}; // (5.1) drawn round the action button (drawGear)
    // ---------- P: frames per second, the picture's resolution, and whether lite mode is on ----------
    if (this.showFps) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = 'rgba(200,225,215,0.75)';
      ctx.fillText(`${Math.round(this.fps || 0)} fps · ${Math.round(Math.min(1, (this.quality ?? 1) * Math.min(window.devicePixelRatio || 1, 1.25)) * 100)} % sharp${this.lite ? ' · lite' : ''}`, pad, H - pad * 0.4);
    }
    }
    // (4.28) no cash on the HUD: it cannot change under water. It is in the inventory, the journal and the shops.

    if (!aboard) {
    // ---------- tools and specimens, bottom centre ----------
    if (g.profile && g.mode === 'play' && !dying) this.drawGear(g, W, H, s, dt);

    // ---------- marked: a symbol, the red eye, bottom left ----------
    // each good deed fades it a step
    if (g.entity && g.entity.marked && !dying) {
      const calm = clamp((g.entity.calm || 0) / 60, 0, 1);
      const a = 1 - calm * 0.65;
      // (4.28) a real eye in the dark, not a sign: a wet dark lid line, an iris of deep amber going to blood red with
      // fibres in it, a slit that breathes, a point of light on the cornea; it opens slowly and blinks now and then
      const ex = W - pad - 210 * s, ey = pad + 30 * s, ew = 30 * s, eh = 18 * s; // (5.1) up by the depth, the danger corner; the bottom left stays clear
      const blink = (g.time % 7.3) < 0.18 ? Math.abs(Math.sin((g.time % 7.3) / 0.18 * Math.PI)) : 0, open = (1 - blink) * (0.85 + 0.15 * Math.sin(g.time * 0.5));
      ctx.save();
      const og = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew * 1.7);
      og.addColorStop(0, `rgba(160,20,10,${(0.22 * a).toFixed(3)})`); og.addColorStop(1, 'rgba(160,20,10,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ex, ey, ew * 1.7, 0, TAU); ctx.fill();
      const lid = () => { ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.bezierCurveTo(ex - ew * 0.45, ey - eh * 1.15 * open, ex + ew * 0.5, ey - eh * 1.05 * open, ex + ew, ey + eh * 0.05);
        ctx.bezierCurveTo(ex + ew * 0.5, ey + eh * 0.95 * open, ex - ew * 0.45, ey + eh * 1.0 * open, ex - ew, ey); ctx.closePath(); };
      lid(); ctx.save(); ctx.clip();
      // the white of it, dark and bloodshot
      ctx.fillStyle = `rgba(52,14,10,${a.toFixed(3)})`; ctx.fillRect(ex - ew, ey - eh * 1.2, ew * 2, eh * 2.4);
      // the iris: amber in the middle, red, then almost black at its rim
      const ir = eh * 1.05, ig = ctx.createRadialGradient(ex + ew * 0.05, ey, 0, ex + ew * 0.05, ey, ir);
      ig.addColorStop(0, `rgba(255,170,60,${a.toFixed(3)})`); ig.addColorStop(0.45, `rgba(214,52,22,${a.toFixed(3)})`); ig.addColorStop(0.85, `rgba(110,14,8,${a.toFixed(3)})`); ig.addColorStop(1, `rgba(30,4,2,${a.toFixed(3)})`);
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex + ew * 0.05, ey, ir, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,190,110,${(0.22 * a).toFixed(3)})`; ctx.lineWidth = Math.max(1, 0.8 * s);
      for (let k = 0; k < 22; k++) { const an = k / 22 * TAU + 0.2 * Math.sin(k * 3.1); ctx.beginPath(); ctx.moveTo(ex + ew * 0.05 + Math.cos(an) * ir * 0.25, ey + Math.sin(an) * ir * 0.25); ctx.lineTo(ex + ew * 0.05 + Math.cos(an) * ir * (0.7 + 0.2 * Math.sin(k * 7.7)), ey + Math.sin(an) * ir * (0.7 + 0.2 * Math.sin(k * 7.7))); ctx.stroke(); }
      // the slit
      const sw = eh * (0.16 + 0.07 * Math.sin(g.time * 0.9));
      ctx.fillStyle = `rgba(4,1,1,${a.toFixed(3)})`; ctx.beginPath(); ctx.moveTo(ex + ew * 0.05, ey - ir * 0.92); ctx.quadraticCurveTo(ex + ew * 0.05 + sw, ey, ex + ew * 0.05, ey + ir * 0.92); ctx.quadraticCurveTo(ex + ew * 0.05 - sw, ey, ex + ew * 0.05, ey - ir * 0.92); ctx.fill();
      // shadow from the upper lid, and a point of wet light
      const sh = ctx.createLinearGradient(0, ey - eh, 0, ey); sh.addColorStop(0, 'rgba(0,0,0,0.75)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.fillRect(ex - ew, ey - eh * 1.2, ew * 2, eh * 1.2);
      ctx.fillStyle = `rgba(255,240,220,${(0.75 * a).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(ex - ew * 0.18, ey - eh * 0.38, 2.4 * s, 1.6 * s, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
      // the lid line: dark and wet
      lid(); ctx.strokeStyle = `rgba(10,3,2,${a.toFixed(3)})`; ctx.lineWidth = 2.2 * s; ctx.stroke();
      ctx.restore();
    }

    // ---------- what the tool can reach ----------
    // with hints off the prompts are short and quiet: just the key and the action, no box
    const short = (p) => p.split('  ·  ')[0].split(' · ')[0].replace(/\s*\(.*\)$/, '');
    // (2.6.6) "Space  Atlantic herring": the key, then the name, plain, in the name's rarity colour
    const keyLine = (txt, cx, y, px) => { ctx.font = `${px}px ${GAME}`; ctx.textAlign = 'center'; ctx.fillText(txt, cx, y); };
    const keyWidth = (txt, px) => { ctx.font = `${px}px ${GAME}`; return ctx.measureText(txt).width; };
    const capHidden = !SETTINGS.catchTags && !!g.catchTarget; // the catch tag is a setting (pause menu); other Space prompts stay
    // (2.6.3) Hints off hides only the tips (hud.hint); what F or Space does is always shown, in its box
    // (4.0.0) what the tool can reach, said below (the prompts are all drawn together, after this)
    const capOn = g.capPrompt && !capHidden && !dying && !g.kill && !g.tutHidePrompts; // (4.4.0) the tutorial shows its own
    this.capWant = capOn ? [g.capPrompt, g.capRarity ? g.capRarity.col : g.capPrompt.startsWith('Space') ? '#d6ecce' : '#ece6d2', g.capIcon] : null; // (4.0.6) a name alone, in its rarity's colour
    }
    // ---------- interaction prompts: (5.1) buttons, bottom right, beside the action button ----------
    // What the tool can reach, what F (or T, U...) does here, and calling the sub: each a button with its key on it,
    // stacked upward from the bottom, right-aligned against the action button (or the corner, on deck). Clicking one
    // is the same as pressing its key (held while the button is held); a line with no key is just words.
    {
      const pills = [], paused = !!g.paused || (document.getElementById('pause') && !document.getElementById('pause').hidden);
      const keyOf = (k) => (k === 'Space' ? ' ' : String(k || '').toLowerCase());
      const cw = aboard ? null : this.capWant;
      if (cw && cw[0] && !dying) for (const p of parsePrompt(cw[0])) pills.push({ key: p.key ? keyOf(p.key) : cw[2] ? ' ' : null, cap: p.key || (cw[2] ? '' : null), hold: p.hold, label: p.label, col: cw[1] });
      if (g.prompt && !dying && !g.kill && !g.tutHidePrompts) for (const p of parsePrompt(g.prompt)) pills.push({ key: p.key ? keyOf(p.key) : null, cap: p.key || null, hold: p.hold, label: p.label, col: p.key ? '#ece6d2' : (g.promptName && g.promptName.col) || '#ece6d2', bar: p.hold || g.promptBar != null });
      if (!g.sub.imploded && !dying && !g.tutHidePrompts && !aboard) {
        const ap = g.autopilot, lab = e.inSub ? (g.homeRun ? 'Autopilot off' : g.sub.docked ? null : 'Autopilot home') : (ap && ap.state === 'coming' ? 'Stop the sub' : 'Call the sub');
        if (lab) pills.push({ key: 'c', cap: 'C', label: lab, col: '#ece6d2' });
      }
      if (paused) pills.length = 0;
      const AC = !aboard && this.actionC, right = AC ? (this.pillRight || AC.cx - AC.R - 22 * s) : W - pad;
      const ph = 36 * s, gapY = 10 * s;
      let by = H - pad - ph;
      this.pillA = this.pillA || {};
      const seen = new Set();
      for (const P2 of pills) {
        const id = (P2.cap || '') + P2.label; seen.add(id);
        const a = this.pillA[id] = Math.min(1, (this.pillA[id] || 0) + dt / 0.15);
        ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle';
        ctx.font = `600 ${17 * s}px ${HUDF}`;
        const tw = ctx.measureText(P2.label).width, ks = 0.8 * s, kw = P2.cap ? (P2.cap.length > 1 ? Math.max(26 * ks * 1.9, (P2.cap.length * 8 + 18) * ks) : 26 * ks) : 0;
        ctx.font = `500 ${14 * s}px ${HUDF}`; const hw = P2.hold ? ctx.measureText('Hold').width + 7 * s : 0;
        if (P2.key) {
          const w = 12 * s + hw + kw + (kw ? 9 * s : 0) + tw + 16 * s, x = right - w;
          ctx.fillStyle = 'rgba(14,18,14,0.8)'; ctx.beginPath(); ctx.roundRect(x, by, w, ph, ph / 2); ctx.fill();
          ctx.strokeStyle = 'rgba(236,230,210,0.18)'; ctx.lineWidth = 1; ctx.stroke();
          let tx = x + 12 * s;
          if (P2.hold) { ctx.fillStyle = 'rgba(236,230,210,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Hold', tx, by + ph / 2 + 1 * s); tx += hw; }
          if (kw) { keyCap(ctx, tx, by + ph / 2 - 13 * ks - 1.5 * s, P2.cap, ks); tx += kw + 9 * s; }
          else if (P2.cap === '') { tx -= 0; }
          ctx.font = `600 ${17 * s}px ${HUDF}`; ctx.textAlign = 'left'; ctx.fillStyle = P2.col || '#ece6d2'; ctx.fillText(P2.label, tx, by + ph / 2 + 1 * s);
          if (P2.bar && g.promptBar != null) { const k = clamp(g.promptBar, 0, 1); ctx.fillStyle = 'rgba(244,246,240,0.9)'; ctx.beginPath(); ctx.roundRect(x + ph / 2, by + ph - 5 * s, Math.max(2, (w - ph) * k), 3 * s, 1.5 * s); ctx.fill(); }
          this.hots.push({ x: (x + this.safeL) * kx, y: (by + this.safeT) * kx, w: w * kx, h: ph * kx, key: P2.key });
        } else {
          ctx.font = `600 ${17 * s}px ${HUDF}`; ctx.textAlign = 'right'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5 * s;
          ctx.fillStyle = P2.col || '#ece6d2'; ctx.fillText(P2.label, right - 6 * s, by + ph / 2 + 1 * s);
        }
        ctx.restore();
        by -= ph + gapY;
      }
      for (const id of Object.keys(this.pillA)) if (!seen.has(id)) delete this.pillA[id];
      this.uiTop = by; // (where the stack ends: the mouse doesn't steer Earl below and right of here)
    }
    // ---------- (3.0.0) the next step of the main quest line, under the Quests button ----------
    const qs = g.profile && g.profile.quests, step = qs && this.questMain ? this.questMain[qs.main] : null;
    if (false && step && step.on && g.mode === 'play' && !dying && !g.kill && !g.hideQuest) { // (3.0.1: shown beside the Quests button instead)
      const tx = W - pad, ty0 = H * 0.42 + 42 * s, ok = qs.mainProg >= step.need;
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `${15 * s}px ${GAME}`;
      const line = step.text + (ok ? ': done' : '') + (step.need > 1 && !ok ? `  ${qs.mainProg}/${step.need}` : '');
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(line, tx + 1, ty0 + 1);
      ctx.fillStyle = ok ? 'rgba(170,230,150,0.95)' : 'rgba(236,232,220,0.88)'; ctx.fillText(line, tx, ty0);
      if (ok) { ctx.font = `${12 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,210,150,0.75)'; ctx.fillText('claim it in Quests', tx, ty0 + 19 * s); }
    }
    // ---------- toasts ----------
    ctx.textAlign = 'center';
    let ty = pad + 6 * s; // each line below the last, spaced by its own size, so big and small lines never overlap
    for (let i = 0; i < this.toasts.length; i++) {
      const tt = this.toasts[i];
      tt.t += dt;
      if (this.onShow) continue; // (3.4.0) the message line shows them
      const a = clamp(Math.min(tt.t * 3, (4.5 - tt.t) * 1.5), 0, 1);
      const fs = (tt.kind === 'big' ? 24 : 18) * s;
      ctx.font = `${fs}px ${GAME}`;
      ctx.shadowColor = `rgba(0,0,0,${0.7 * a})`; ctx.shadowBlur = 6 * s;
      if (tt.kind.startsWith('rar:')) { ctx.globalAlpha = a; ctx.fillStyle = tt.kind.slice(4); }
      else ctx.fillStyle = tt.kind === 'warn' ? `rgba(244,110,98,${a})` : tt.kind === 'note' ? `rgba(240,226,190,${a})` : `rgba(230,238,236,${a})`;
      ctx.fillText(tt.text, W / 2, ty); // (3.0.0: no ×N on a repeated line: it just stays up) ctx.shadowBlur = 0;
      ty += fs * 1.45;
      ctx.globalAlpha = 1;
    }
    this.toasts = this.toasts.filter((tt) => tt.t < 4.5);

    // ---------- in its grip: what can still get him free, and how little time is left ----------
    const K = g.kill;
    if (K && K.window && !K.esc && K.t > K.window[0] && K.t < K.window[1] && g.mode === 'play') {
      const opts = [];
      if (!g.entity.flashed) opts.push(['L', 'FLASH IT']);
      if (g.items.lure > 0 || (g.profile.oldLures || 0) > 0) opts.push(['Q', 'LURE']);
      const left = 1 - (K.t - K.window[0]) / (K.window[1] - K.window[0]);
      const pulse = 0.75 + 0.25 * Math.sin(K.t * 22);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${30 * s}px ${MONO}`; ctx.fillStyle = `rgba(255,236,220,${pulse.toFixed(3)})`;
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12 * s;
      ctx.fillText(opts.length ? opts.map(([k, n]) => `${k}  ${n}`).join('     ') : 'NOTHING LEFT TO GIVE IT', W / 2, H * 0.72);
      ctx.shadowBlur = 0;
      const bw = 360 * s, bx = W / 2 - bw / 2, by = H * 0.72 + 30 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, 5 * s);
      ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fillRect(bx, by, bw * left, 5 * s);
      ctx.restore();
    }
    // ---------- death: everything but the red timer fades to black ----------
    const bleedOut = dying && g.deathKind === 'injury', crushed = dying && g.deathKind === 'implode';
    if (dying) {
      ctx.fillStyle = bleedOut ? `rgba(26,0,0,${clamp(g.deathT / 3, 0, 1).toFixed(3)})` : `rgba(0,0,0,${(g.deathKind === 'devoured' ? 1 : clamp(crushed ? (g.deathT - 1.6) / 1.6 : g.deathT / 2.2, 0, 1)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `500 ${40 * s}px ${MONO}`;
      ctx.fillStyle = '#d8241e'; ctx.fillText(formatTime(g.survival + g.deathT), W - pad, pad);
      ctx.font = `${13 * s}px ${MONO}`; ctx.fillStyle = `rgba(216,36,30,${clamp(g.deathT - (crushed ? 3.4 : 0.5), 0, 0.8).toFixed(3)})`;
      ctx.fillText(g.deathCause || '', W - pad, pad + 50 * s);
    }
    // ---------- death countdown ----------
    if (dying && !bleedOut && !crushed && g.deathT > 0) {
      const left = Math.max(0, 3 - Math.floor(g.deathT - g.deathDelay));
      if (g.deathT > g.deathDelay) {
        ctx.font = `500 ${120 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(216,36,30,${clamp(1 - ((g.deathT - g.deathDelay) % 1), 0.2, 1)})`;
        if (left > 0) ctx.fillText(String(left), W / 2, H / 2);
        ctx.textBaseline = 'top';
      }
    }
  }
}
