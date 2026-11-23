import { uiUnit } from './settings.js';
import { depthUnit } from './units.js';
import { drawBagIcon, drawTankIcon, drawChamberIcon } from './coin_art.js';
import { drawPrompt, promptShade, parsePrompt, depthCounter, dymo, tubeGauge, brassBezel, keyCap, oliveNine, HUDF } from './fittings.js';
import { lockerTexture } from './textures.js';
import { drawToken } from './tokens.js';
import { drawCoin, drawCash, drawTile } from './coins.js';
import { abilityState, whyNot, cooldownLeft, fmtLeft } from './abilities.js';
import { drawNet3, drawCam3 } from './gear_art.js';
import { drawHourglass, drawPowerBadge, POWER_EMBLEMS } from './coin_art.js';
import { LEGEND } from './item_data.js';
import { rarityOf } from './specimens.js';
import { legendMotes, glint } from './scrolls.js';
import { drawGlyph } from './glyphs.js';
import { touchWords } from './touchtext.js';
import { calState } from './store.js';
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
const TIMG = {};
function touchImg(n) { let im = TIMG[n]; if (!im) { im = new Image(); im.src = `assets/ui/touch/${n}.png`; TIMG[n] = im; } return im.complete && im.naturalWidth ? im : null; }
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
import { toolIcon, netLook } from './tools_draw.js';
import { bagSlots, bagUsed, tankSlots, pressSlots, NETS_SUB, TOW_MAX, netKinds, netsOf, tankUsed, BIG, hasBigTank, bigIn } from './capture.js';
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies } from './creatures_draw.js';

const MONO = '"Barlow Semi Condensed", "Arial Narrow", sans-serif';
const HUDT = '"Barlow Semi Condensed", "Arial Narrow", sans-serif'; // (4.28) the instruments' figures
const GAME = '"Barlow Semi Condensed", "Arial Narrow", system-ui, sans-serif'; // (4.27) the HUD face

const NETS_SUB_HUD = (g, k) => { const it = g.items && g.items.nets; return it ? (it[k] || 0) : null; }; // (6.5.1) how many of one kind of trawl net are in the hatch
const dwOf = (ctx) => ctx.measureText('0').width; // (5.9.6) one figure's width
// (5.17.0) a tool's coin picture, from the tool's own shop drawing: rendered once per item, trimmed to what was drawn,
// and framed on what matters (a net's hoop and bag, a camera's body), so the button looks like the thing he has on
const TOOL_PIC = new Map();
export function toolPic(kind, def) {
  if (!def || !def.id) return null; const key = kind + ':' + def.id; if (TOOL_PIC.has(key)) return TOOL_PIC.get(key);
  const W0 = 360, H0 = 216, c = document.createElement('canvas'); c.width = W0; c.height = H0; const x = c.getContext('2d');
  try { (kind === 'net' ? drawNet3 : drawCam3)(x, W0, H0, { ...def, coin: true }); } catch (err) { TOOL_PIC.set(key, null); return null; }
  const d = x.getImageData(0, 0, W0, H0).data; let x0 = W0, y0 = H0, x1 = 0, y1 = 0;
  for (let yy = 0; yy < H0; yy += 2) for (let xx = 0; xx < W0; xx += 2) if (d[(yy * W0 + xx) * 4 + 3] > 40) { /* (5.17.0) faint mesh counts too (a pale bag was being left out, and the net framed too big) */ if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  if (x1 <= x0) { TOOL_PIC.set(key, null); return null; }
  const bw = x1 - x0, bh = y1 - y0;
  // a net: framed on its hoop and bag only (the columns where the drawing is tall; the thin pole is left out), so every
  // net sits at the same size on its coin whatever its pole or bag, and the pole runs off the edge; a camera: the whole of it
  let pic;
  if (kind === 'net') { let hx0 = x1, hx1 = x0, hy0 = y1, hy1 = y0;
    for (let xx = x0; xx <= x1; xx += 2) { let t = H0, b = -1; for (let yy = y0; yy <= y1; yy += 2) if (d[(yy * W0 + xx) * 4 + 3] > 40) { if (yy < t) t = yy; b = yy; } if (b - t > bh * 0.45) { if (xx < hx0) hx0 = xx; hx1 = xx; if (t < hy0) hy0 = t; if (b > hy1) hy1 = b; } }
    if (hx1 <= hx0) { hx0 = x0; hx1 = x1; hy0 = y0; hy1 = y1; }
    pic = { c, fx: (hx0 + hx1) / 2, fy: (hy0 + hy1) / 2, span: Math.max(hx1 - hx0, hy1 - hy0, bh * 0.9) * 1.15, rot: -0.62 }; }
  else pic = { c, fx: x0 + bw / 2, fy: y0 + bh / 2, span: Math.max(Math.max(bw, bh) * 1.1, Math.sqrt(bw * bh) * 1.6), rot: 0 }; // a camera by its bulk, so a long one is not shrunk to a sliver (its strobe arms may run to the rim)
  const out = { id: def.id, pic }; TOOL_PIC.set(key, out); return out;
}

// (6.0.6) the thing's eye, painted once into a picture (not drawn from shapes each frame): an almond of iris lit from
// inside like an ember (white-gold at the pupil, through orange, to a dark red rim), full of fibres and grain; the
// glow spilling onto a rough dark hide in warm flecks, fading to black with no edge. The slit and the lids are laid
// over it live (hud: marked), so it can still blink and narrow as the thing comes nearer
let EYE_PIC = null;
function eyePicture() {
  if (EYE_PIC) return EYE_PIC;
  const W = 320, H = 190, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let sd = 9137; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const cx = W / 2, cy = H / 2, ew = 88, eh = 62; /* (6.0.9) taller */
  const almond = (k = 1) => { x.beginPath(); x.moveTo(cx - ew * k, cy + eh * 0.25 * k); x.bezierCurveTo(cx - ew * 0.55 * k, cy - eh * 1.15 * k, cx + ew * 0.3 * k, cy - eh * 1.2 * k, cx + ew * k, cy - eh * 0.5 * k); /* the outer corner lifted */
    x.bezierCurveTo(cx + ew * 0.45 * k, cy + eh * 0.85 * k, cx - ew * 0.45 * k, cy + eh * 1.05 * k, cx - ew * k, cy + eh * 0.25 * k); x.closePath(); };
  // the hide round it: dark, warmer near the eye where its light falls, in short rough strokes running out from it
  { const g = x.createRadialGradient(cx, cy, eh * 0.6, cx, cy, W * 0.5); g.addColorStop(0, 'rgba(62,18,8,0.62)'); g.addColorStop(0.35, 'rgba(24,8,4,0.42)'); g.addColorStop(1, 'rgba(4,2,1,0)'); /* (6.0.7) lighter */ x.save(); x.translate(cx, cy); x.scale(1, 0.62); x.translate(-cx, -cy); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, W * 0.5, 0, Math.PI * 2); x.fill(); x.restore(); }
  for (let i = 0; i < 1500; i++) { const an = r() * Math.PI * 2, d = ew * (0.95 + Math.pow(r(), 0.8) * 1.0), px = cx + Math.cos(an) * d, py = cy + Math.sin(an) * d * 0.55, near = Math.max(0, 1 - (d - ew * 0.9) / (ew * 0.9));
    const len = 2 + r() * 5, a2 = an + (r() - 0.5) * 0.6; x.strokeStyle = `rgba(${120 + r() * 70 | 0},${20 + r() * 26 | 0},${10 + r() * 12 | 0},${(near * near * near * (0.08 + r() * 0.2)).toFixed(3)})`; /* scattered, dark, catching only a little of its light */ x.lineWidth = 0.8 + r() * 0.8;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a2) * len, py + Math.sin(a2) * len * 0.55); x.stroke(); }
  // the lids' heavy dark rim, blurred out a little onto the hide
  x.save(); x.filter = 'blur(5px)'; x.fillStyle = 'rgba(6,2,1,0.62)'; almond(1.12); x.fill(); x.restore();
  // (6.0.7) cracked, scaly hide round the lids, catching a little of the eye's light
  for (let i = 0; i < 70; i++) { const an = r() * Math.PI * 2, d = ew * (1.02 + r() * 0.45), px = cx + Math.cos(an) * d, py = cy + Math.sin(an) * d * 0.62, sz = 4 + r() * 7; x.strokeStyle = `rgba(${120 + r() * 60 | 0},${40 + r() * 30 | 0},12,${(0.18 * (1 - (d - ew) / (ew * 0.5))).toFixed(3)})`; x.lineWidth = 0.9;
    x.beginPath(); for (let k = 0; k < 5; k++) { const a3 = k / 5 * Math.PI * 2 + r() * 0.5, rr = sz * (0.7 + r() * 0.5); const qx = px + Math.cos(a3) * rr, qy = py + Math.sin(a3) * rr * 0.7; k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.closePath(); x.stroke(); }
  // two folds above the lid
  x.strokeStyle = 'rgba(150,60,20,0.22)'; x.lineWidth = 1.6; for (const f of [1.32, 1.6]) { x.beginPath(); x.moveTo(cx - ew * 0.8, cy - eh * f * 0.55); x.quadraticCurveTo(cx - ew * 0.05, cy - eh * f * 1.02, cx + ew * 0.85, cy - eh * f * 0.62); x.stroke(); }
  // the iris, lit from inside
  x.save(); almond(); x.clip();
  { const g = x.createRadialGradient(cx + 4, cy + 2, 2, cx, cy, ew * 1.02); g.addColorStop(0, '#ffd8b0'); g.addColorStop(0.08, '#ff9a5a'); g.addColorStop(0.24, '#e8442a'); g.addColorStop(0.5, '#b81c12'); g.addColorStop(0.74, '#5e0a06'); g.addColorStop(1, '#160202'); /* (6.0.9) red, not amber: a hot pale core into blood red */ x.fillStyle = g; x.fillRect(0, 0, W, H); }
  for (let i = 0; i < 1800; i++) { const an = r() * Math.PI * 2, r0 = ew * (0.06 + r() * 0.4), r1 = r0 + ew * (0.06 + r() * 0.3), lt = r() < 0.45; // fibres running out from the pupil
    x.strokeStyle = lt ? `rgba(255,${120 + r() * 70 | 0},${80 + r() * 50 | 0},${(0.06 + r() * 0.16).toFixed(3)})` : `rgba(${90 + r() * 60 | 0},${20 + r() * 20 | 0},4,${(0.08 + r() * 0.2).toFixed(3)})`; x.lineWidth = 0.6 + r() * 0.9;
    x.beginPath(); x.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); x.lineTo(cx + Math.cos(an + (r() - 0.5) * 0.08) * r1, cy + Math.sin(an + (r() - 0.5) * 0.08) * r1); x.stroke(); }
  for (let i = 0; i < 46; i++) { const px = cx + (r() - 0.5) * ew * 1.9, py = cy + (r() - 0.5) * eh * 1.9, rr = 4 + r() * 14, dg = x.createRadialGradient(px, py, 0, px, py, rr); const dark = r() < 0.6; // (6.0.7) mottling: dark blotches and hot flecks, as in old burnt metal
    dg.addColorStop(0, dark ? `rgba(60,6,2,${(0.25 + r() * 0.3).toFixed(3)})` : `rgba(255,${130 + r() * 60 | 0},90,${(0.18 + r() * 0.25).toFixed(3)})`); dg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = dg; x.beginPath(); x.arc(px, py, rr, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = 'rgba(50,8,2,0.55)'; for (let i = 0; i < 9; i++) { let px = cx + (r() < 0.5 ? -1 : 1) * ew * (0.55 + r() * 0.4), py = cy + (r() - 0.5) * eh * 1.4; x.lineWidth = 0.8 + r() * 0.8; x.beginPath(); x.moveTo(px, py); // thin dark cracks running in from the rim
    for (let k = 0; k < 6; k++) { px += (cx - px) * (0.12 + r() * 0.1) + (r() - 0.5) * 6; py += (r() - 0.5) * 7; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 5200; i++) { const px = cx + (r() - 0.5) * ew * 2, py = cy + (r() - 0.5) * eh * 2.2; x.fillStyle = r() < 0.5 ? `rgba(255,170,130,${(r() * 0.2).toFixed(3)})` : `rgba(24,4,1,${(r() * 0.28).toFixed(3)})`; x.fillRect(px, py, 1 + r(), 1 + r()); } // heavy grain
  { const bg = x.createRadialGradient(cx, cy + eh * 0.1, eh * 0.5, cx, cy, ew * 1.05); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(0.7, 'rgba(20,3,1,0.2)'); bg.addColorStop(1, 'rgba(14,2,1,0.75)'); x.fillStyle = bg; x.fillRect(0, 0, W, H); } // the bulge: darker where the lids press
  // the brow's shadow over the top of it, and the dark rim inside the lids
  { const g = x.createLinearGradient(0, cy - eh * 1.2, 0, cy + eh * 0.2); g.addColorStop(0, 'rgba(10,2,1,0.96)'); g.addColorStop(0.55, 'rgba(10,2,1,0.35)'); g.addColorStop(1, 'rgba(10,2,1,0)'); x.fillStyle = g; x.fillRect(0, cy - eh * 1.3, W, eh * 1.5); } // the brow's heavy shadow
  x.lineWidth = 9; x.strokeStyle = 'rgba(14,3,1,0.55)'; x.filter = 'blur(3px)'; almond(); x.stroke(); x.filter = 'none';
  x.restore();
  { x.save(); almond(); x.clip(); const sg = x.createRadialGradient(cx - ew * 0.38, cy - eh * 0.45, 0, cx - ew * 0.38, cy - eh * 0.45, eh * 0.55); sg.addColorStop(0, 'rgba(255,246,220,0.22)'); sg.addColorStop(1, 'rgba(255,246,220,0)'); x.fillStyle = sg; x.fillRect(0, 0, W, H); x.restore(); } // (6.0.7) a dull wet glint
  for (let pass = 0; pass < 3; pass++) { x.strokeStyle = `rgba(8,2,1,${(0.55 + pass * 0.15).toFixed(2)})`; x.lineWidth = 3.4 - pass; x.beginPath(); // the lids' rim, ragged rather than a clean line
    for (let k = 0; k <= 80; k++) { const t2 = k / 80, top = t2 <= 0.5, u2 = top ? t2 * 2 : (t2 - 0.5) * 2; let qx, qy;
      if (top) { const a0 = [cx - ew, cy + eh * 0.25], c1 = [cx - ew * 0.55, cy - eh * 1.15], c2 = [cx + ew * 0.3, cy - eh * 1.2], a1 = [cx + ew, cy - eh * 0.5], v = 1 - u2; qx = v * v * v * a0[0] + 3 * v * v * u2 * c1[0] + 3 * v * u2 * u2 * c2[0] + u2 * u2 * u2 * a1[0]; qy = v * v * v * a0[1] + 3 * v * v * u2 * c1[1] + 3 * v * u2 * u2 * c2[1] + u2 * u2 * u2 * a1[1]; }
      else { const a0 = [cx + ew, cy - eh * 0.5], c1 = [cx + ew * 0.45, cy + eh * 0.85], c2 = [cx - ew * 0.45, cy + eh * 1.05], a1 = [cx - ew, cy + eh * 0.25], v = 1 - u2; qx = v * v * v * a0[0] + 3 * v * v * u2 * c1[0] + 3 * v * u2 * u2 * c2[0] + u2 * u2 * u2 * a1[0]; qy = v * v * v * a0[1] + 3 * v * v * u2 * c1[1] + 3 * v * u2 * u2 * c2[1] + u2 * u2 * u2 * a1[1]; }
      qx += (r() - 0.5) * 2.2; qy += (r() - 0.5) * 2.2; k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.stroke(); }
  EYE_PIC = { c, ew, eh, cx, cy }; return EYE_PIC;
}

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.ecg = new Array(120).fill(0); this.ecgT = 0; this.beatPhase = 0;
    this.sweep = 0; this.blip = null; this.toasts = []; this.journalHot = null; this.chartHot = null;
  }
  resize() {
    // (5.4) on a phone the page is wider than the screen (index.html): the HUD drawn at 1.5 pixels a real point, as before
    const dpr = window.__fingerK ? 1.5 / window.__fingerK : Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    // (4.17.0) the UI scale: from the screen's height, but never below 0.7 of the design (a phone held sideways is
    // only ~390 px tall) nor above 1.5; and the notch's safe areas kept clear
    // (5.15.7) the instruments in the one unit (settings.js uiUnit): canvas pixels per point, times the unit; 0.575 keeps
    // them as they were on the 844 x 390 phone they were laid out on
    this.pxPt = h / (window.innerHeight / (window.__fingerK || 1)); this.U = uiUnit();
    this.s = 0.575 * this.pxPt * this.U;
    if (!this.safeEl) { this.safeEl = document.createElement('div'); this.safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(this.safeEl); }
    let ps = null; try { ps = window.parent !== window && window.parent.__safeFor ? window.parent.__safeFor() : null; } catch (e) { /* not ours */ }
    if (ps) { this.safe = { l: ps.l * dpr, r: ps.r * dpr, t: ps.t * dpr, b: ps.b * dpr }; return; } // (5.9.5) in the shell's frame: the phone's notch, from the page outside, turned with the frame
    const cs = getComputedStyle(this.safeEl); this.safe = { l: parseFloat(cs.paddingLeft) * dpr || 0, r: parseFloat(cs.paddingRight) * dpr || 0, t: parseFloat(cs.paddingTop) * dpr || 0, b: parseFloat(cs.paddingBottom) * dpr || 0 };
  }
  // explanations: only when hints are on (H)
  hint(text) { if (this.hints) this.toast(text, 'note'); }
  toast(text, kind = '') {
    if (typeof text === 'string') text = touchWords(text); // (5.10.10) a phone game: no key names in what it says
    text = titled(String(text).replace(/\s+·\s+/g, ', ')); // (4.26) no middle dots in what the game says
    // the same line again while it is still up: count it ("x2") instead of stacking a copy
    const same = this.toasts.find((tt) => tt.text === text && tt.kind === kind && tt.t < 3.5);
    if (same) { same.t = Math.min(same.t, 0.4); if (this.onShow) this.onShow(text, kind); return; } // (4.5.0) said again: the line stays up (no count)
    this.toasts.push({ text, kind, t: 0 }); if (this.toasts.length > 4) this.toasts.shift();
    if (this.onShow) this.onShow(text, kind); // (3.4.0) said by the message line (messages.js), not drawn here
  }

  // The hotbar (1 net, 2 slurp gun) and a row of specimen slots above it.
  drawGear(g, W, H, s, dt) {
    const ctx = this.ctx, P = g.profile, e = g.earl;
    this.icons = this.icons || new Map();
    const icon = (kind, tier) => {
      const k = kind + (tier && typeof tier === 'object' ? (tier.fx || '') + (tier.base || 0) + (tier.hoop || '') + (tier.body || '') + (tier.shape || '') : tier); // (a special net's look is an object)
      if (!this.icons.has(k)) this.icons.set(k, toolIcon(kind, tier, 120, 60));
      return this.icons.get(k);
    };
    const G = (k) => gear(P, k);
    const tools = [['1', 'net', G('net').look, G('net').name]];
    if (owns(P, 'camera')) tools.push(['2', 'cam', G('cam').look, G('cam').name]);
    const tr = P.traps || {};
    const ownedTraps = ['pot', 'fish', 'steel', 'cage'].reduce((a, k) => a + (tr[k] || 0), 0);
    if (ownedTraps > 0) tools.push(['3', 'trap', ['pot', 'fish', 'steel', 'cage'].findIndex((k) => tr[k] > 0), 'Traps']);
    const sw = 84 * s, sh = 46 * s, gap = 8 * s;
    const total = tools.length * sw + (tools.length - 1) * gap;
    let x = W / 2 - total / 2;
    const y = H - sh - 22 * s;
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    for (const [key, kind, tier, name] of (this.touch ? [] : tools)) { // (5.5.2) on a touch screen the tools are buttons up the right edge (drawActions)
      const on = kind === sel && !e.inSub;
      // (olive) a raised plate of the panels' painted steel with a well pressed into it; the tool in hand ringed in
      // the deck's cream paint
      if (!oliveNine(ctx, 'btn-olive', x - 3 * s, y - 3 * s, sw + 6 * s, sh + 6 * s, 28, 10 * s)) { ctx.fillStyle = 'rgba(44,48,42,0.9)'; ctx.beginPath(); ctx.roundRect(x, y, sw, sh, 5 * s); ctx.fill(); }
      oliveNine(ctx, 'well', x + 4 * s, y + 4 * s, sw - 8 * s, sh - 8 * s, 30, 6 * s);
      if (on) { ctx.strokeStyle = 'rgba(230,222,196,0.95)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.roundRect(x - 2 * s, y - 2 * s, sw + 4 * s, sh + 4 * s, 6 * s); ctx.stroke(); }
      ctx.globalAlpha = e.inSub ? 0.35 : on ? 1 : 0.55;
      ctx.drawImage(icon(kind, tier), x + 6 * s, y + 4 * s, sw - 12 * s, sh - 12 * s);
      ctx.globalAlpha = 1;
      ctx.font = `500 ${10 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (!this.touch) keyCap(ctx, x - 5 * s, y - 7 * s, key, s * 0.6); ctx.font = `500 ${10 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      { const kx2 = window.innerWidth / this.c.width; if (!e.inSub) this.hots.push({ x: (x + this.safeL) * kx2, y: (y + this.safeT) * kx2, w: sw * kx2, h: sh * kx2, key }); } // (5.1.1) a tool is picked by clicking (tapping) it too
      if (kind === 'cam') { ctx.textAlign = 'right'; ctx.fillStyle = g.items.film ? 'rgba(216,236,230,0.8)' : '#e0524a'; ctx.fillText(`${g.items.film || 0}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      if (kind === 'trap') { const free = ownedTraps - g.traps.length; ctx.textAlign = 'right'; ctx.fillStyle = free ? 'rgba(216,236,230,0.8)' : '#e86a50'; ctx.fillText(`${free}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      // sweep / reload progress along the bottom edge
      if (on && kind === 'cam' && g.photo) { ctx.fillStyle = 'rgba(200,230,215,0.7)'; ctx.fillRect(x + 4 * s, y + sh - 4 * s, (sw - 8 * s) * clamp(g.photo.t / g.photo.dur, 0, 1), 2 * s); }
      if (on && g.capture && g.capture.kind === kind) {
        ctx.fillStyle = 'rgba(200,230,215,0.7)';
        ctx.fillRect(x + 4 * s, y + sh - 4 * s, (sw - 8 * s) * clamp(g.capture.t / g.capture.dur, 0, 1), 2 * s);
      }
      if (on) { ctx.font = `${9 * s}px ${MONO}`; const nw = dymo(ctx, name, 0, -999, s, { align: 'left' }); dymo(ctx, name, x + sw / 2 - nw / 2, y + sh + 3 * s, s, { align: 'left' }); }
      x += sw + gap;
    }
    // specimen slots: the bag (or, in the sub, its tank). Each dot shows the animal's colour,
    // ringed by its condition: green healthy, amber stressed, red weak, grey dead.
    // (4.16.7) in the sub, just counts: the open tank's spaces, the chambers, the large tank if fitted
    // (6.0.12) in the sub, painted counters like the diver's bag (an icon and its count, no words), bottom centre: the open
    // tank, the pressure chambers, the bag still outside, the large tank if fitted
    if (e.inSub) {
      const fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1)), wy = H - 52 * s, sz = 30 * s;
      const parts = [['tank', `${fmt(tankUsed(g))} / ${tankSlots(g)}`]];
      if (pressSlots(g)) parts.push(['ch', `${g.subTank.filter((q) => q.pressed && q.chamber !== BIG).length} / ${pressSlots(g)}`]);
      if (g.bag.length) parts.push(['bag', `${g.bag.length}`]);
      if (hasBigTank(g)) parts.push(['big', `${bigIn(g).length} / 3`]);
      ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `700 ${22 * s}px ${HUDF}`;
      const gapP = 30 * s, widths = parts.map(([, v]) => sz + 8 * s + ctx.measureText(v).width);
      let px = W / 2 - (widths.reduce((a2, b2) => a2 + b2, 0) + gapP * (parts.length - 1)) / 2;
      parts.forEach(([k, v], i) => { const ic = px + sz / 2;
        if (k === 'tank') drawTankIcon(ctx, ic, wy, sz * 0.62); else if (k === 'ch') drawChamberIcon(ctx, ic, wy, sz * 0.6); else if (k === 'big') drawChamberIcon(ctx, ic, wy, sz * 0.62, true); else drawBagIcon(ctx, ic, wy, sz * 1.25);
        ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5 * s; ctx.fillStyle = '#efe8d2'; ctx.fillText(v, px + sz + 8 * s, wy + 1 * s); ctx.shadowBlur = 0; px += widths[i] + gapP; });
      ctx.restore();
    }
    const list = e.inSub ? [] : g.bag, slots = e.inSub ? 0 : bagSlots(g);
    const pList = [], pSlots = 0;
    const r = 7.5 * s, step = 21 * s, rowW = (slots + (pSlots ? pSlots + 0.6 : 0)) * step;
    let sx = W / 2 - rowW / 2 + step / 2;
    const sy = y - 18 * s;
    ctx.font = `${9 * s}px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';

    // (5.14.0) the bag as one quiet counter, bottom centre: a bag and its spaces used of its room ("7 / 12"), red when he
    // is overencumbered; the animal just caught shows beside it for a moment, then settles into the count
    if (!e.inSub && slots) {
      const used = bagUsed(g), over = used > slots, wy = H - 52 * s, cx0 = W / 2, sz = 30 * s;
      if ((this.bagN ?? list.length) < list.length) this.bagPop = { sp: list[list.length - 1], t: 0 };
      this.bagN = list.length;
      ctx.save(); ctx.textBaseline = 'middle'; ctx.font = `700 ${22 * s}px ${HUDF}`;
      const txt = `${used} / ${slots}`, tw = ctx.measureText(txt).width, x0 = cx0 - (sz + 8 * s + tw) / 2;
      ctx.globalAlpha = 1; drawBagIcon(ctx, x0 + sz / 2, wy, sz * 1.25); // (5.15.6) Earl's own mesh catch bag, painted
      ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5 * s;
      ctx.fillStyle = over ? `rgba(240,84,72,${(0.75 + 0.25 * Math.sin(g.time * 6)).toFixed(3)})` : '#efe8d2'; ctx.fillText(txt, x0 + sz + 8 * s, wy + 1 * s);
      const P2 = this.bagPop; if (P2 && SPECIES_BY_ID[P2.sp.id]) { P2.t += dt; const k = P2.t < 0.25 ? P2.t / 0.25 : P2.t > 1.6 ? Math.max(0, 1 - (P2.t - 1.6) / 0.4) : 1;
        if (k <= 0) this.bagPop = null; else { ctx.shadowBlur = 0; ctx.globalAlpha = k; ctx.translate(x0 + sz + 8 * s + tw + 34 * s, wy); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
          try { drawSpecies(ctx, SPECIES_BY_ID[P2.sp.id], 44 * s, g.time * 2, 1, 0); } catch (err) { /* only the count, then */ } } }
      ctx.restore();
      if (this.touch && this.hots) this.hots.push({ x: (x0 + this.safeL) * (window.innerWidth / this.c.width), y: (wy - sz / 2 + this.safeT) * (window.innerWidth / this.c.width), w: (sz + 8 * s + tw) * (window.innerWidth / this.c.width), h: sz * (window.innerWidth / this.c.width), key: 'b' }); // a tap opens the bag
    }
    for (let i = 0; i < 0; i++, sx += step) { // (5.14.0) the old row of dots, retired
      const sp = list[i];
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
      ctx.fillStyle = 'rgba(6,12,14,0.55)'; ctx.fill();
      if (sp) {
        const c = sp.cond;
        ctx.fillStyle = SPECIES_BY_ID[sp.id].v.c[0];
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.62, 0, TAU); ctx.fill();
        ctx.strokeStyle = c <= 0.05 ? 'rgba(140,140,140,0.9)' : c >= 0.8 ? 'rgba(120,220,140,0.9)' : c >= 0.5 ? 'rgba(232,176,64,0.95)' : 'rgba(230,80,60,0.95)';
        ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
        // dying in the net (too far from its own pressure): a red ring pulses out from it
        if (c > 0.05 && sp.warnDying && !e.inSub) {
          const q = (g.time * 1.2) % 1;
          ctx.strokeStyle = `rgba(255,90,60,${(0.8 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1.4 * s;
          ctx.beginPath(); ctx.arc(sx, sy, r * (1 + q * 0.9), 0, TAU); ctx.stroke();
        }
      } else { ctx.strokeStyle = 'rgba(160,200,200,0.18)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // the pressure tanks: brass-ringed, after a small gap
    if (pSlots) sx += step * 0.6;
    for (let i = 0; i < pSlots; i++, sx += step) {
      const sp = pList[i];
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fillStyle = 'rgba(6,12,14,0.55)'; ctx.fill();
      if (sp) { ctx.fillStyle = SPECIES_BY_ID[sp.id].v.c[0]; ctx.beginPath(); ctx.arc(sx, sy, r * 0.62, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = sp ? 'rgba(224,180,90,0.95)' : 'rgba(224,180,90,0.35)'; ctx.lineWidth = 1.8 * s;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
    }
    this.coinW = 0; /* (6.1.0) gold coins live in the locker now, not on the HUD */
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

  // (5.1.1) A touch screen's hands, bottom right: one big button for the main action (swing the net, take the picture,
  // set a trap; in the sub, the claw), and round action buttons in a fixed arc round its upper left (observe or
  // whatever F does here, call the sub, the lamp, the lure, the glow stick, the pet; in the sub: leave, the tank room,
  // the autopilot, the trawl, the spare air, sell, the lamp). Each keeps its place: one that can't be used now is
  // greyed, never moved or hidden, so nothing jumps about. A picture and a word on each; no key letters.
  // (5.10.8) in the jaws: no lamp (the light no longer drives it off). If the Tidewarden is carried and ready, its
  // coin waits where the big button was, quietly; a lure, if carried, is asked for by its own card
  drawActions(g, W, H, s, dt, aboard) {
    const ctx = this.ctx, P = g.profile, e = g.earl, kx = window.innerWidth / this.c.width;
    const hot = (x, y, w, h, key) => this.hots.push({ x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, w: w * kx, h: h * kx, key });
    // (5.3) sized from the finger, not the screen: CSS pixels (about 0.18 mm each on a phone). The main button about
    // 2 cm across, the others about 1.4 cm, never below Apple's 44 pt
    const u = (this.pxPt || 1.5) * (this.U || 1), pad = 16 * u, R = 41 * u; // (5.15.7) the buttons in the one unit: proportional on every screen
    const
      cx = W - pad - R, cy = H - pad - R; // (5.3.1) small: about 1.3 cm // (5.4) a tablet (no page scaling): 1.3x, so the small buttons reach 44 pt
    const held = this.held || new Set();
    const parts = g.prompt && !g.tutHidePrompts ? parsePrompt(g.prompt) : [], partOf = (k) => parts.find((p) => p.key && p.key.toLowerCase() === k);
    const short = (t) => { const w = String(t).split(/\s+/).filter((x) => !/^(the|a|an|to|of)$/i.test(x)).map((x) => ({ submersible: 'sub' }[x.toLowerCase()] || x)); const out = w.slice(0, 2).join(' '); return out.length > 13 ? w[0] : out; };
    // (5.3.1) a button is a dark translucent disc with a thin light rim (as a phone game's), a real picture on it
    // (5.5) each a brass-bezelled enamel fitting (tokens.js), not a see-through disc
    const plate = (x, y, r, on, down, lit, big) => drawToken(ctx, x, y, r, big ? 'big' : 'small', down ? 'down' : !on ? 'off' : lit ? 'lit' : 'on');
    const pic = (name, x, y, w) => { const im = hudIcon('act-' + name); if (im) ctx.drawImage(im, x - w / 2, y - w / 2, w, w); };
    // the pictures on the buttons: plain shapes in the deck's cream paint
    const NAME = { eye: 'eye', hand: 'hand', leave: 'leave', sub: 'sub', lamp: 'lamp', lure: 'lure', glow: 'glow', pet: 'pet', tank: 'tank', trawl: 'trawl', air: 'air', sell: 'sell', auto: 'auto', pause: 'pause', bag: 'bag' };
    const glyph = (kind, x, y, r) => drawGlyph(ctx, kind, x, y, r * 2.35); // (5.3.3) one set of bold white symbols (glyphs.js)
    const glyph1 = (kind, x, y, r, col) => {
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const k = r / 22;
      ctx.scale(k, k); ctx.lineWidth = 2.6;
      const P0 = () => ctx.beginPath();
      if (kind === 'eye') { P0(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(0, -10, 11, 0); ctx.quadraticCurveTo(0, 10, -11, 0); ctx.stroke(); P0(); ctx.arc(0, 0, 3.6, 0, TAU); ctx.fill(); }
      else if (kind === 'hand') { P0(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.moveTo(1, -5); ctx.lineTo(7, 0); ctx.lineTo(1, 5); ctx.stroke(); P0(); ctx.moveTo(9, -9); ctx.lineTo(9, 9); ctx.stroke(); }
      else if (kind === 'leave') { P0(); ctx.moveTo(0, 8); ctx.lineTo(0, -7); ctx.moveTo(-5, -2); ctx.lineTo(0, -8); ctx.lineTo(5, -2); ctx.stroke(); P0(); ctx.moveTo(-9, 10); ctx.lineTo(9, 10); ctx.stroke(); }
      else if (kind === 'sub') { P0(); ctx.ellipse(0, 2, 11, 5, 0, 0, TAU); ctx.stroke(); P0(); ctx.rect(-3, -6, 6, 4); ctx.stroke(); }
      else if (kind === 'lamp') { P0(); ctx.arc(-3, 0, 4.5, 0, TAU); ctx.stroke(); for (const a of [-0.45, 0, 0.45]) { P0(); ctx.moveTo(4 + Math.cos(a) * 1, Math.sin(a) * 4); ctx.lineTo(4 + Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); } }
      else if (kind === 'lure') { P0(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-8, -6, 3, -5); ctx.stroke(); P0(); ctx.arc(5, -4, 4, 0, TAU); ctx.fill(); }
      else if (kind === 'glow') { P0(); ctx.roundRect(-3, -10, 6, 20, 3); ctx.stroke(); P0(); ctx.rect(-1.2, -6, 2.4, 12); ctx.fill(); }
      else if (kind === 'pet') { P0(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-2, -7, 6, 0); ctx.quadraticCurveTo(-2, 7, -9, 0); ctx.stroke(); P0(); ctx.moveTo(6, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.closePath(); ctx.stroke(); }
      else if (kind === 'tank') { P0(); ctx.rect(-10, -7, 20, 14); ctx.stroke(); P0(); ctx.moveTo(-10, -1); ctx.quadraticCurveTo(-5, -4, 0, -1); ctx.quadraticCurveTo(5, 2, 10, -1); ctx.stroke(); }
      else if (kind === 'trawl') { P0(); ctx.moveTo(-10, -7); ctx.lineTo(10, -2); ctx.lineTo(10, 2); ctx.lineTo(-10, 7); ctx.closePath(); ctx.stroke(); P0(); ctx.moveTo(-4, -5); ctx.lineTo(-4, 5); ctx.moveTo(3, -3); ctx.lineTo(3, 3); ctx.stroke(); }
      else if (kind === 'air') { P0(); ctx.roundRect(-5, -8, 10, 18, 4); ctx.stroke(); P0(); ctx.rect(-2, -11, 4, 3); ctx.fill(); }
      else if (kind === 'sell') { P0(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke(); ctx.font = `700 13px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1); }
      else if (kind === 'pause') { P0(); ctx.rect(-6, -8, 4, 16); ctx.rect(2, -8, 4, 16); ctx.fill(); }
      else if (kind === 'bag') { P0(); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); ctx.lineTo(7, 10); ctx.lineTo(-7, 10); ctx.closePath(); ctx.stroke(); P0(); ctx.arc(0, -3, 5, Math.PI, 0); ctx.stroke(); P0(); ctx.moveTo(-3, 2); ctx.lineTo(3, 8); ctx.moveTo(3, 2); ctx.lineTo(-3, 8); ctx.stroke(); }
      else if (kind === 'auto') { P0(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke(); P0(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); }
      ctx.restore();
    };
    // ---- the actions, in fixed places ----
    const F = partOf('f'), ap = g.autopilot, sub = g.sub;
    const subLabel = e.inSub ? (g.homeRun ? 'Autopilot off' : 'Autopilot') : (ap && ap.state === 'coming' ? 'Stop sub' : 'Call sub');
    // the near ring: the three things done most (always there, greyed when they can't be done); the top row: the
    // rarer ones, small, beside pause and the bag
    // (5.5) the tutorial's own action (its F, or the observe button) keeps its button up even while it hides prompts
    const ta = g.tutAction && !g.tutAction.cabinOnly ? String(g.tutAction.key).toLowerCase() : null;
    // (5.6) as a mobile RPG's skills: four fixed coins in an arc round the big button (one that cannot be used now is
    // dimmed, never moved), and a quiet row of small round icons along the bottom for the rest
    // (5.7.1) the same four in the sub as in the water, each doing its own job there: the sub's slot lets him out (in
    // the water it calls her), the glow stick, the hand (the station, Dave, selling when she is docked), the lamp.
    // Leaving always works (it used to wait on the prompt, which hides itself after a few seconds)
    // (5.9.0) the ability in the arc's last place: the carried scroll's emblem on a coin of its rarity; a sweep while it
    // recovers, a bright ring running down while it is on
    const AB = this.abilDef || null, ABS = abilityState(g);
    const abil = () => { if (!AB) return { key: 'ability', icon: 'ab_sprint', on: false, why: "You don't have a skill equipped: put a scroll on in the bag", lock: true };
      const why = whyNot(g, P, AB); return { key: 'ability', icon: 'ab_' + AB.fam, look: { tier: AB.tier }, tint: AB.tier, on: !why || why === 'Already running', lit: ABS.activeT > 0, why, abil: true }; };
    const handSub = e.inSub ? (g.subHandF ? 'f' : sub.docked ? 'u' : null) : null;
    // (5.17.0) the light, in the arc's fourth place in the water and the sub: his lamp while he swims, her lights while he
    // is in her (it moved here from the bottom left corner, which is the stick's alone now)
    const light = () => { const on = e.inSub ? !!sub.lightsOn : !!e.lampOn; return { key: 'l', icon: 'lamp', on: true, lit: on }; };
    // (6.5.6) at the Margaret's wheel: the anchor and the way back from the wheel in the arc (on a phone there was no
    // way to do either, so taking the wheel left him stuck there); the stick steers
    const atHelm = !!g.helm && !e.inSub;
    const A = atHelm ? [
      null,
      { key: 'g', icon: 'anchor', on: true, lit: !!(g.anchored && !g.anchorDir) },
      { key: 'v', icon: 'door', on: true, lit: true, inter: true },
      abil(),
      light(),
    ] : e.inSub ? [
      { key: 'leavesub', icon: 'leave', on: true, tutAlt: g.tutAction && g.tutAction.id === 'leavesub' ? 'f' : null },
      // (5.17.0) no glow stick in the sub's arc: she has her own lights (the bag still snaps one)
      !handSub && g.obsTarget ? { key: 'obs', icon: 'eye', on: true, lit: true, inter: true } /* (6.5.7) an animal at the glass: the eye */ : { key: handSub || 'f', icon: 'hand', on: !!handSub, lit: !!handSub, why: 'Nothing in reach', inter: true },
      abil(),
      light(),
    ] : [
      // (5.6.5) the lamp in the same place outside and in the sub (the last of the arc)
      // (5.6.8) the same four in the same places on deck and in the cabin: the sprint button runs there; the rest wait
      null, // (5.16.7) calling the sub moved to the menu's sub tile (call sub out of the sub, autopilot home in it)
      // (5.6.9) the glow sticks on his belt; with none on it, a padlock (and where to get one)
      (() => { const gk = P.glowKind === 'glowAdv' ? 'glowAdv' : 'necklace', n = g.items[gk] || 0, sp = (P.spare && (P.spare.necklace || P.spare.glowAdv)) || 0; // (6.0.1) the kind on the belt, on its rarity's coin
        return { key: 'e', icon: 'glow', tint: gk === 'glowAdv' ? 'exotic' : 'rare', /* (6.5.8) */ on: !aboard && n > 0, n, lit: false, lock: !(n > 0), why: n > 0 ? 'For the water' : sp ? 'Put glow sticks on your belt: open the bag' : 'No glow sticks: the computer in the cabin sells them' }; })(),
      // (5.7.0) the hand: one button for whatever is in reach (the ladder, a door, the hatch, a thing to take, a trap;
      // the winch to sell). Sprint moved beside the stick
      // (5.7.5) aboard, the big button is the hand; this slot gets its own job: Dive in on deck, Out on deck in the cabin
      (() => { // (6.5.0) aboard, this slot is the hand (the big button is only ever the net or the camera): what is in reach
        // (the computer, the bunk, the cabin door); in the cabin with nothing in reach, the way out on deck
        if (aboard) { const hOn = !!this.handOn; return hOn ? { key: 'f', icon: this.inCabin ? 'hand' : 'cabin', on: true, lit: true, inter: true } : this.inCabin ? { key: 'outdeck', icon: 'door', on: true, inter: true } : { key: 'f', icon: 'hand', on: false, why: 'Nothing in reach', inter: true }; }
        const tm = g.tapMarks || [], hf = tm.some((m) => m.key === 'f'), hu = !hf && tm.some((m) => m.key === 'u'), hon = hf || hu;
        // (6.1.4) the hand shows what it will do: the ladder, the winch's basket, the sub's hatch; anything else, the hand
        const tgt = tm.find((m) => m.key === (hu ? 'u' : 'f')), ctxIcon = tgt && { ladder: 'ladder', winch: 'basket', sub: 'hatch', door: 'cabin' }[tgt.what];
        // (6.3.0) an animal not yet observed, in reach (and nothing else to do here): the slot becomes the eye. Nothing is
        // drawn round the animal: the eye on this button is the only sign
        if (!hon && g.obsTarget && !e.inSub) return { key: 'obs', icon: 'eye', on: true, lit: true, inter: true };
        return { key: hu ? 'u' : 'f', icon: ctxIcon || 'hand', on: hon, lit: hon, why: 'Nothing in reach', inter: true }; })(),
      abil(),
      light(), // (6.0.5) aboard too: there it switches the sub's lights
    ];
    // (5.6.1) under the radar, small and quiet: the journal and the bag, then what else is carried
    const ROW = [{ key: 'journal', dom: true }, { key: 'b', icon: 'bag', on: true }].concat( // (5.6.9) the journal's coin (HTML) above the bag
e.inSub ? [
      // (5.7.1) in the sub only: the tank room and the autopilot (out of the arc), then the spare air
      { key: 'c', icon: 'auto', on: !sub.imploded && !sub.docked && !g.tutHidePrompts, lit: g.homeRun, why: 'The sub is at the boat' }, // (5.16.7) the sub tile's place: autopilot home in the sub, call sub out of it
      { key: 't', icon: 'tank', on: true, badge: g.subTank.some((s) => s.pile) }, // (6.6.2) a red ! while a catch lies on the sub's floor
      { key: 'r', icon: 'air', on: (g.items.airTank || 0) > 0, n: g.items.airTank, away: true },
    ] : [
      // (5.16.7) out of the sub, the same place calls her (on deck she is already at the boat)
      { key: 'c', icon: 'sub', on: !sub.imploded && !g.tutHidePrompts && !aboard, lit: ap && ap.state === 'coming', why: sub.imploded ? 'The sub is lost' : 'The sub is at the boat' },
    ]).concat([{ key: 'store', icon: 'shop', on: true }, { key: 'events', icon: 'events', on: true, badge: P ? calState(P).ready : false }]) // (6.4.0) the Shop and Events; the daily gift's "!" when one waits
      .filter((a) => !(a.away && !a.on));
    const tutKey = window.__hudTutKey || g.questHint || null; // (5.5) the button the tutorial wants: ringed, pulsing. (6.5.1) or the Log's step (main.js lessons): a quiet ring, no arrow
    this.quietRing = !window.__hudTutKey && !!g.questHint;
    const vis = this.btnVis || (this.btnVis = {});
    // (5.7.5) the tutorial's mark: a warm halo pulsing behind the button, the cream ring breathing out, and a short arrow
    // bobbing toward it from the middle of the screen, so there is no doubt which one
    const halo = (x, y, r, a0 = 1) => { const q = 0.5 + 0.5 * Math.sin(g.time * 4.2), hr = r * (1.55 + 0.25 * q);
      const hg = ctx.createRadialGradient(x, y, r * 0.6, x, y, hr); hg.addColorStop(0, `rgba(226,218,196,${(0.3 * a0 * (0.6 + 0.4 * q)).toFixed(3)})`); hg.addColorStop(1, 'rgba(226,218,196,0)'); /* (6.0.5) bone and quiet, not gold */
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fill(); };
    // (5.8.1) the tutorial's mark: the ring breathing out and a large painted arrow (bronze, a dark edge, a cream lit
    // side) bobbing in toward the button from the middle of the screen. With the spotlight (below) it is drawn again
    // over the darkened screen
    // (6.5.0) sq: a square tile (the menu's), ringed in its own rounded square, not a circle drawn over it
    const ring = (x, y, r, spot = false, sq = false) => {
      if (!spot) { this.tutTarget = { x, y, r, sq }; }
      const shp = (rad) => { ctx.beginPath(); if (sq) ctx.roundRect(x - rad, y - rad, rad * 2, rad * 2, rad * 0.26); else ctx.arc(x, y, rad, 0, TAU); };
      if (!spot) halo(x, y, r); // (6.0.5) behind the button only: over the dark the button must stay readable
      // (6.6.0) no lines round it: a soft light in the button's own shape, hugging its edge and breathing
      { const q = 0.5 + 0.5 * Math.sin(g.time * 3.6); ctx.save(); ctx.shadowColor = `rgba(240,228,196,${(0.75 + 0.25 * q).toFixed(3)})`; ctx.shadowBlur = (14 + 18 * q) * u;
        ctx.fillStyle = `rgba(240,228,196,${(0.3 + 0.22 * q).toFixed(3)})`; ctx.beginPath();
        if (sq) { ctx.roundRect(x - r * 1.07, y - r * 1.07, r * 2.14, r * 2.14, r * 0.3); ctx.roundRect(x - r * 0.99, y - r * 0.99, r * 1.98, r * 1.98, r * 0.26); }
        else { ctx.arc(x, y, r * 1.07, 0, TAU); ctx.arc(x, y, r * 0.99, 0, TAU); }
        ctx.fill('evenodd'); ctx.restore(); }
      // motes of light drifting round it
      for (let i = 0; i < 3; i++) { const a2 = g.time * (0.5 + i * 0.07) + i * 0.9, rr2 = r * (1.35 + 0.25 * Math.sin(g.time * 1.3 + i)), mx = x + Math.cos(a2) * rr2, my = y + Math.sin(a2) * rr2, ms = (1.4 + (i % 3)) * u, al = 0.45 + 0.4 * Math.sin(g.time * 2 + i);
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, ms * 3); mg.addColorStop(0, `rgba(232,226,208,${(al * 0.6).toFixed(3)})`); mg.addColorStop(1, 'rgba(232,226,208,0)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, ms * 3, 0, TAU); ctx.fill(); }
      // the arrow (not for the Log's quiet ring)
      if (this.quietRing) return;
      const es = g.earlScr && !this.inCabin ? g.earlScr : null, ox = es ? es[0] * W : W * 0.5, oy = es ? es[1] * H : H * 0.45; /* (6.5.6) on the line from Earl to the button, not from the screen's middle */
      const ang = Math.atan2(y - oy, x - ox), bob = (0.5 + 0.5 * Math.sin(g.time * 4)) * 9 * u, d = (r > 32 * u ? r + 50 * u + 30 * u + 26 * u : r * 1.55 + 18 * u) + bob, ax = x - Math.cos(ang) * d, ay = y - Math.sin(ang) * d, L = 24 * u;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.lineJoin = 'round';
      const ar = new Path2D(); ar.moveTo(0, 0); ar.lineTo(-L, -L * 0.66); ar.quadraticCurveTo(-L * 0.82, -L * 0.3, -L * 0.7, -L * 0.24); ar.lineTo(-L * 2, -L * 0.2); ar.quadraticCurveTo(-L * 2.12, 0, -L * 2, L * 0.2); ar.lineTo(-L * 0.7, L * 0.24); ar.quadraticCurveTo(-L * 0.82, L * 0.3, -L, L * 0.66); ar.closePath();
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6 * u; ctx.shadowOffsetY = 2 * u; ctx.fillStyle = '#2a2014'; ctx.fill(ar); ctx.shadowColor = 'transparent';
      const bg = ctx.createLinearGradient(0, -L * 0.66, 0, L * 0.66); bg.addColorStop(0, '#d8d0bc'); bg.addColorStop(0.45, '#a49c88'); bg.addColorStop(1, '#4e4a40'); /* (6.0.5) bone, not gold */ ctx.fillStyle = bg; ctx.fill(ar);
      ctx.save(); ctx.clip(ar); ctx.strokeStyle = 'rgba(244,240,228,0.6)'; ctx.lineWidth = 2.4 * u; ctx.beginPath(); ctx.moveTo(-L * 2, -L * 0.14); ctx.lineTo(-L * 0.72, -L * 0.18); ctx.lineTo(-L * 0.95, -L * 0.6); ctx.stroke(); ctx.restore();
      ctx.lineWidth = 2.6 * u; ctx.strokeStyle = '#1a140c'; ctx.stroke(ar);
      ctx.restore();
    };
    // (5.6.9) a padlock over a coin that is locked: dark bronze, a cream edge
    const padlock = (x, y, k) => {
      ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.arc(0, 0, k * 1.05, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#0c0b08'; ctx.lineWidth = k * 0.34; ctx.beginPath(); ctx.arc(0, -k * 0.18, k * 0.36, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = '#b9ab84'; ctx.lineWidth = k * 0.16; ctx.stroke();
      ctx.fillStyle = '#8a7650'; ctx.strokeStyle = '#0c0b08'; ctx.lineWidth = k * 0.1; ctx.beginPath(); ctx.roundRect(-k * 0.55, -k * 0.2, k * 1.1, k * 0.8, k * 0.12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1610'; ctx.beginPath(); ctx.arc(0, k * 0.12, k * 0.12, 0, TAU); ctx.fill(); ctx.fillRect(-k * 0.05, k * 0.12, k * 0.1, k * 0.26);
      ctx.restore();
    };
    // (5.7.0) a press you can see: the coin sinks and lights up (coins.js 'press'), and a ring of light runs out from it
    const pa = this.pressAt || (this.pressAt = {}), was = this.wasHeld || (this.wasHeld = new Set()), nowT = performance.now();
    const pressFx = (key, x, y, r) => {
      const dn = held.has(key); if (dn && !was.has(key)) pa[key] = nowT;
      const k = pa[key] ? (nowT - pa[key]) / 320 : 2;
      if (k < 1) { ctx.save(); halo(x, y, r, 0.35 * (1 - k)); ctx.strokeStyle = `rgba(255,236,196,${(0.4 * (1 - k)).toFixed(3)})`; ctx.lineWidth = (2.2 - 1.6 * k) * u; ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.35 * k), 0, TAU); ctx.stroke(); ctx.restore(); } // (5.10.8) a soft ripple, not a flash
      return dn;
    };
    const LIT_ART = new Set(['lamp', 'glow', 'sprint']); // their pictures change when on
    // (6.5.0) the interact button is the one pressed most and the one that changes (ladder, hatch, door, eye...): it
    // wears a heavier ring than the rest, knurled brass with four rivets, like the bezel round a helmet's porthole. With
    // something in reach a faint warm light shows round its rim, so a change is noticed without anything shouting
    const bezel = (x, y, r, warm, down) => { // (6.5.1) inside the coin's own edge (the same size as the others), worn gunmetal, not gold
      const R1 = r * 0.84, R2 = r * 1.0, Rm = (R1 + R2) / 2;
      ctx.save(); if (down) ctx.translate(0, 1 * u);
      const bg = ctx.createLinearGradient(x - R2, y - R2, x + R2 * 0.6, y + R2);
      bg.addColorStop(0, '#77756c'); bg.addColorStop(0.45, '#46453f'); bg.addColorStop(1, '#22221e');
      ctx.beginPath(); ctx.arc(x, y, R2, 0, TAU); ctx.arc(x, y, R1, 0, TAU, true); ctx.fillStyle = bg; ctx.fill('evenodd');
      ctx.lineWidth = Math.max(1, 0.9 * u); ctx.strokeStyle = 'rgba(10,10,8,0.85)'; ctx.beginPath(); ctx.arc(x, y, R2, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, R1, 0, TAU); ctx.stroke();
      // the knurling: fine ticks round the band, a faint bronze in the worn ones, lit from the top left
      const n = 48; for (let i = 0; i < n; i++) { const a2 = i / n * TAU, c = Math.cos(a2), s2 = Math.sin(a2), lit = 0.5 - 0.5 * Math.cos(a2 + Math.PI * 0.75);
        ctx.strokeStyle = i % 3 ? `rgba(14,14,12,${(0.3 + 0.3 * (1 - lit)).toFixed(3)})` : `rgba(140,116,80,${(0.1 + 0.18 * lit).toFixed(3)})`; ctx.lineWidth = Math.max(0.7, 0.7 * u);
        ctx.beginPath(); ctx.moveTo(x + c * (R1 + 1 * u), y + s2 * (R1 + 1 * u)); ctx.lineTo(x + c * (R2 - 1 * u), y + s2 * (R2 - 1 * u)); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(220,214,196,0.22)'; ctx.lineWidth = Math.max(0.7, 0.7 * u); ctx.beginPath(); ctx.arc(x, y, R2 - 0.6 * u, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a2 = Math.PI / 4 + i * Math.PI / 2, rx = x + Math.cos(a2) * Rm, ry = y + Math.sin(a2) * Rm, rr = (R2 - R1) * 0.36;
        const rg = ctx.createRadialGradient(rx - rr * 0.35, ry - rr * 0.35, rr * 0.1, rx, ry, rr); rg.addColorStop(0, '#b4b0a4'); rg.addColorStop(1, '#3a3934');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(10,10,8,0.7)'; ctx.lineWidth = Math.max(0.5, 0.5 * u); ctx.stroke(); }
      // something in reach: a thin warm line of light just inside the ring, breathing slowly (never a glow over the picture)
      if (warm) { const q = 0.5 + 0.5 * Math.sin(g.time * 2.4); ctx.strokeStyle = `rgba(232,200,146,${(0.4 + 0.35 * q).toFixed(3)})`; ctx.lineWidth = Math.max(1.2, 1.5 * u); ctx.beginPath(); ctx.arc(x, y, R1 - 1.2 * u, 0, TAU); ctx.stroke(); }
      ctx.restore();
    };
    const btn = (a, x, y, r) => {
      if (a.dom) { this.journalAt = { x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, r: r * kx }; this.journalR = r * kx; return; } // (5.6.9) the journal's HTML coin is placed here by main.js
      const down = pressFx(a.key, x, y, r);
      // one that comes and goes rises in (and sinks away) over a fifth of a second rather than blinking
      if (a.away) { const v0 = vis[a.key] ?? 0, v = vis[a.key] = clamp(v0 + (a.on ? 1 : -1) * dt * 6, 0, 1); if (v <= 0.01) return; r *= 0.7 + 0.3 * (1 - (1 - v) * (1 - v)); ctx.save(); ctx.globalAlpha *= v; }
      else ctx.save();
      const want = (tutKey === a.key || (a.tutAlt && tutKey === a.tutAlt)) && a.on;
      if (want) { ring(x, y, r, false, !!a.tile); r *= 1 + 0.07 * (0.5 + 0.5 * Math.sin(g.time * 4.2)); } // (5.7.5) and it swells gently with the pulse
      /* (5.17.0) one that cannot be used now keeps its size: its greyed face says it */ // (5.7.5) one that cannot be used now sits back: smaller and fainter
      // (5.10.10) in its jaws the layout stays put: everything that cannot help goes dim, and a ready Tidewarden wakes:
      // saturated, a slow warm swell behind it. The same swell shows whenever the Tidewarden can be used.
      const tideReady = a.abil && AB && AB.tide && (this.inKill ? this.killTide : a.on && !a.lit);
      if (this.inKill && !tideReady) { ctx.globalAlpha *= 0.32; }
      if (tideReady) { const q = 0.5 + 0.5 * Math.sin(g.time * 3.4), gr = r * (1.25 + 0.12 * q);
        const tg = ctx.createRadialGradient(x, y, r * 0.8, x, y, gr); tg.addColorStop(0, `rgba(196,150,86,${(0.28 + 0.22 * q).toFixed(3)})`); tg.addColorStop(1, 'rgba(196,150,86,0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(x, y, gr, 0, TAU); ctx.fill(); r *= 1 + 0.05 * q; }
      // (5.5.6) the bag gives a tug as something new goes into it
      if (a.key === 'b' && window.__bagTug) { const k = (performance.now() - window.__bagTug) / 450; if (k > 0 && k < 1) { const s2 = 1 + 0.22 * Math.sin(k * Math.PI) * (1 - k * 0.5); ctx.translate(x, y); ctx.scale(s2, s2); ctx.translate(-x, -y); } }
      if (a.row) { // the bottom row: a small dark round, its symbol in bone (as the menus' icons are)
        ctx.fillStyle = down ? 'rgba(4,8,8,0.8)' : 'rgba(6,10,10,0.55)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = a.lit ? 'rgba(236,224,190,0.85)' : 'rgba(230,222,196,0.22)'; ctx.lineWidth = 1.4 * u; ctx.stroke();
        ctx.globalAlpha *= a.on ? 0.92 : 0.4; glyph(a.icon, x, y + (down ? 1 * u : 0), r * 0.4);
      } else if (a.tile) drawTile(ctx, x, y, r, a.icon, down ? 'press' : this.inKill || !a.on ? 'off' : 'on', !!a.badge); // (5.15.7) the menu's square tiles
      else { if (a.inter && a.on && a.lit && !this.inKill) { const q = 0.5 + 0.5 * Math.sin(g.time * 2.4), R0 = r * 0.92, R3 = r * (1.34 + 0.06 * q); /* (6.5.6) something in reach: a soft warm glow round the button, behind it (the thin line inside its ring read as an outline cut off) */
        const hg = ctx.createRadialGradient(x, y, R0, x, y, R3); hg.addColorStop(0, `rgba(226,196,146,${(0.34 + 0.16 * q).toFixed(3)})`); hg.addColorStop(1, 'rgba(226,196,146,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, R3, 0, TAU); ctx.fill(); }
      drawCoin(ctx, x, y, r, a.icon, down ? 'press' : tideReady ? 'lit' : this.inKill || !a.on ? 'off' : a.lit && !a.inter ? 'lit' : 'on', a.inter ? { ...(a.look || {}), k: a.icon === 'hand' ? 0.92 : 1.15 } /* (6.5.6) the hand smaller: it outsized the others */ : a.lit && LIT_ART.has(a.icon) ? { lit: true } : a.look, a.tint); } /* (6.5.1) the interact button: its picture larger, never the lit face (its glow says it) */
      if (a.inter) bezel(x, y, r, false, down);
      if (a.lock) padlock(x + r * 0.42, y + r * 0.42, r * 0.42);
      if (a.key === 'b' && (P.bagGot || 0) > (P.bagSeenAt || 0)) { // (5.9.6) something new in the bag: a red "!" at its top right, as games do
        const bx = x + r * 0.74, by = y - r * 0.74, br = Math.max(8 * u, r * 0.4), pq = 1 + 0.08 * Math.sin(g.time * 5);
        ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = '#c8402e'; ctx.strokeStyle = '#181a14'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.arc(bx, by, br * pq, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff6ea'; ctx.font = `700 ${br * 1.45}px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + br * 0.06); ctx.restore(); }
      if (a.abil && AB.tier === 'legendary') legendMotes(ctx, x, y, r * 1.8, r * 1.8, g.time, 3); // (5.9.1) a legendary's sparks; (5.10.8) fewer, closer
      if (a.abil) { const cdl = cooldownLeft(P), tot = (AB.dur || 0) + (AB.cd || 0);
        if (ABS.activeT > 0) { ctx.strokeStyle = AB.tier === 'legendary' ? 'rgba(220,180,110,0.75)' : 'rgba(226,220,196,0.7)'; ctx.lineWidth = 2.2 * u; ctx.beginPath(); ctx.arc(x, y, r * 1.08, -Math.PI / 2, -Math.PI / 2 + TAU * (ABS.activeT / Math.max(0.01, ABS.maxT))); ctx.stroke(); }
        else if (cdl > 0 && tot > 0 && !(AB.charges && ABS.charges > 0)) { ctx.fillStyle = 'rgba(4,6,6,0.6)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.92, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, cdl / tot)); ctx.closePath(); ctx.fill();
          // (5.16.0) a small painted hourglass and the time left in the middle of the greyed coin ("7h 42m", "38s")
          drawHourglass(ctx, x, y - r * 0.2, r * 0.3); ctx.font = `700 ${Math.max(10 * u, r * 0.38)}px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#efe8d2'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3 * u; ctx.fillText(fmtLeft(cdl), x, y + r * 0.34); ctx.shadowBlur = 0; } }
      if (a.n > 1 && !a.lock) { ctx.font = `700 ${12 * u}px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ece6d2'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3 * u; ctx.fillText(String(a.n), x + r * 0.72, y - r * 0.72); }
      if (a.bar && g.promptBar != null && a.on) { ctx.strokeStyle = 'rgba(244,246,240,0.95)'; ctx.lineWidth = 3.5 * u; ctx.beginPath(); ctx.arc(x, y, r * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(g.promptBar, 0, 1)); ctx.stroke(); }
      ctx.restore();
      if (a.away && !a.on) return; // going: no longer pressable
      hot(x - r, y - r, r * 2, r * 2, a.on ? a.key : 'msg:' + (a.why || 'Not now'));
    };
    const r = 26.5 * u, gap = 31.5 * u, rho0 = R + r + gap; // (5.17.0) four coins of one size, a little larger (25 to 26.5), 35 degrees apart with even gaps
    this.arcTop = cy - rho0 - r; // (5.15.6) where the corner of buttons begins: the radar stops above it
    { const kept = A.filter(Boolean); A.length = 0; A.push(...kept); } // (5.15.7) an empty place (the deck's old Dive in) leaves no gap
    A.forEach((a, i) => { const ang = [-88, -123, -158, -193][i] * Math.PI / 180; btn(a, cx + Math.cos(ang) * rho0, cy + Math.sin(ang) * rho0, r); });
    // (5.6.8) the top left is what is his: a painted stack of banknotes and the sum (no coin round it, as it is not a
    // button), the journal's coin beside it (HTML, placed by main.js at this.journalAt). The settings coin goes to the
    // top right corner, where a phone game keeps it; the depth moves left to make room (this.gearSpace)
    { const ch = 30 * u, mx = 12 * u + ch * 0.8, my = 12 * u + 19 * u;
      drawCash(ctx, mx, my, ch);
      ctx.save(); ctx.font = `700 ${21 * u}px ${HUDF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4 * u;
      // (5.7.5) the sum counts up to a new total (a quest paid, a sale) instead of jumping
      const cash = P.cash || 0; if (this.cashShown == null || cash < this.cashShown || cash - this.cashShown < 0.01) this.cashShown = cash; else this.cashShown += Math.max(0.01, (cash - this.cashShown) * Math.min(1, dt * 3.2));
      const txt = money(Math.min(cash, this.cashShown)), tx0 = mx + ch * 0.8 + 6 * u; this.moneyTextX = tx0; this.moneyRowBottom = my + ch * 0.55; /* (6.0.7) the eye hangs right under the sum */ ctx.fillStyle = cash > this.cashShown ? '#f6e7b4' : '#efe8d2'; ctx.fillText(txt, tx0, my + 1 * u);
      { ctx.save(); ctx.font = `700 ${21 * u}px ${HUDF}`; const tw = ctx.measureText(money(cash)).width; ctx.restore(); this.moneyAt = { x: (tx0 + tw + 16 * u + this.safeL) * kx, y: (my - 16 * u + this.safeT) * kx }; } // (5.7.5) right of the sum, on its row
      ctx.restore();
      this.topLeftBottom = (my + ch * 0.55 + 8 * u + this.safeT) * kx; this.topLeftX = (12 * u + this.safeL) * kx;
      const rg = 19 * u, gx = W - 12 * u - rg, gy = 12 * u + rg; /* (5.9.4) the same size as the journal and the bag under it */
      btn({ key: 'settings', icon: 'gear', on: true }, gx, gy, rg);
      // (5.6.9b) the journal and the bag (and in the sub what else is carried) hang in a column right under the settings
      // coin, at the very right edge; the depth and the radar sit to the left of that column
      // (5.15.6) the journal, the bag (and in the sub the tank room, the autopilot, the spare air) in a row under the
      // money, top left, where a phone game keeps its menus: the right side is left to the depth, the radar and the
      // actions, and the row never reaches the messages in the middle
      // (5.15.7) as the owner sketched it: a column down the left edge under the money, stopping above the lamp; the
      // goal's line and the marked eye start to the right of it
      // (5.15.7) smaller square tiles that fold away under a tab (a chevron), as the owner asked: open unless folded
      // (remembered), opened by itself when the tutorial points at something in it; folded, the tab carries the red "!"
      // when something in it wants him
      // (5.15.8) as the owner's reference: the tiles sit on one soft dark strip (feathered, no hard edge), so they read as
      // one group; its fold is a chevron engraved into the strip's lower end (a mark on it, not a button of its own).
      // Folded, the strip is a short stub under the money with only the chevron, and the red dot when something waits
      const rb = 15 * u, stepB = rb * 2 + 7 * u, top = my + ch * 0.55 + 10 * u, colX = 12 * u + rb, sw = rb * 2 + 12 * u, chevH = 20 * u;
      if (this.menuOpen == null) { try { this.menuOpen = localStorage.getItem('earl.menuOpen') !== '0'; } catch (err) { this.menuOpen = true; } }
      const tutIn = ROW.some((a) => a.key === tutKey || (a.dom && (tutKey === 'j' || tutKey === 'journal'))), open = this.menuOpen || tutIn;
      const wants = (P.bagGot || 0) > (P.bagSeenAt || 0) || !!window.__journalBadge;
      let y0 = top + 6 * u + rb, step = stepB;
      if (open) { const colEnd = H - 12 * u - 36 * u - 14 * u - chevH - rb; step = ROW.length > 1 ? Math.min(stepB, (colEnd - y0) / (ROW.length - 1)) : stepB; }
      const stripBot = open ? y0 + (ROW.length - 1) * step + rb + 4 * u + chevH : top + chevH + 4 * u, chevY = stripBot - chevH * 0.55;
      { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 10 * u; ctx.fillStyle = 'rgba(10,14,14,0.42)';
        ctx.beginPath(); ctx.roundRect(colX - sw / 2, top, sw, stripBot - top, 9 * u); ctx.fill(); ctx.restore(); // the strip, its edge feathered by its own shadow
        const down = pressFx('menu', colX, chevY, rb), dy = down ? 1 * u : 0, up = open, w = 7 * u, hgt = 4 * u;
        const chev = (col, lw, oy) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(colX - w, chevY + oy + dy + (up ? hgt : -hgt)); ctx.lineTo(colX, chevY + oy + dy + (up ? -hgt : hgt)); ctx.lineTo(colX + w, chevY + oy + dy + (up ? hgt : -hgt)); ctx.stroke(); };
        chev('rgba(0,0,0,0.6)', 2.6 * u, -0.8 * u); chev('rgba(222,212,184,0.85)', 1.8 * u, 0); // engraved: a dark cut above, the bone line in it
        if (!open && wants) { const bx = colX + sw / 2 - 2 * u, by = top + 2 * u, br = 4.5 * u; ctx.fillStyle = '#c8402e'; ctx.strokeStyle = '#181a14'; ctx.lineWidth = 1.4 * u; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); ctx.stroke(); }
        if (!tutIn) hot(colX - sw / 2, stripBot - chevH - 4 * u, sw, chevH + 8 * u, 'menu'); }
      this.journalAt = null; this.menuShown = open;
      if (open) ROW.forEach((a, i) => btn({ ...a, tile: true }, colX, y0 + i * step, rb));
      this.underRadarH = 0;
      this.topLeftBottom = (my + ch * 0.55 + 8 * u + this.safeT) * kx; this.topLeftX = (12 * u + rb * 2 + 14 * u + this.safeL) * kx;
      this.gearSpace = rg * 2 + 22 * u; }
    // (5.6.8) what F does here is done by tapping the thing itself (render.js brackets it, main.js takes the tap): no tag
    // laid over the scene, and no picture that could say the wrong thing
    const rho1 = rho0;
    // ---- the big button: the main action ----
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    const armT = e.inSub && owns(P, 'arm');
    const handOn = aboard && !!this.handOn; // (5.6.8) aboard, the big button is his hand: the door, the computer, the bunk
    const can = aboard ? false /* (6.5.0) the net waits aboard */ : e.inSub ? !!(armT && g.capPrompt && g.capPrompt.startsWith('Space')) : sel === 'net' ? !!g.catchTarget : !!(g.capPrompt && /^Space/.test(g.capPrompt));
    ctx.save(); ctx.globalAlpha *= this.inKill ? 0.32 : 1; /* (5.16.7) opaque: an unusable tool shows its greyed face, not the water through it */ /* (5.10.10) dim in its jaws */ // (5.3.6) on deck: there, greyed
    const bdown = held.has(' ');
    const bKey = ' '; // (6.5.0) never the hand: aboard the hand is the arc's interact slot
    // (5.16.7) a legendary net or camera shows its rarity on its button: the legendary coin face, a slow glow behind it and
    // a few sparks round its rim (legendaries give off sparks wherever they are shown); every other tool stays plain
    const rarOf = (k) => ((k === 'net' || k === 'cam') && !e.inSub && !aboard && !(k === 'cam' && !owns(P, 'camera')) ? gear(P, k).rarity || 'common' : null); // (5.17.0) every net and camera on its rarity's coin
    { const lk = aboard || e.inSub ? null : rarOf(sel || 'net');
      if (lk === 'legendary') { const q = 0.5 + 0.5 * Math.sin(g.time * 1.6), lg = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.32); lg.addColorStop(0, `rgba(200,156,80,${(0.3 + 0.12 * q).toFixed(3)})`); lg.addColorStop(1, 'rgba(200,156,80,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.32, 0, TAU); ctx.fill();
        for (let i = 0; i < 7; i++) { const ph = (g.time * 0.35 + i * 0.37) % 1, ang = i * 2.39 + g.time * 0.12, rr = R * (1.02 + 0.22 * ph), sx3 = cx + Math.cos(ang) * rr, sy3 = cy + Math.sin(ang) * rr - ph * 6 * u, al = Math.sin(ph * Math.PI) * 0.75;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; glint(ctx, sx3, sy3, 2.6 * u, al, ang * 0.2); ctx.restore(); } /* (6.0.10) glints */ } }
    // (5.15.7) able to act: a warm light behind the coin, round its rim, breathing slowly (nothing drawn over its picture)
    if (tutKey === bKey) ring(cx, cy, R); // (6.0.5) drawn before the coin, so the hand (or net) stays readable on top
    if (can) { const q = 0.5 + 0.5 * Math.sin(g.time * 3), gg = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.38); gg.addColorStop(0, `rgba(222,212,186,${(0.2 + 0.1 * q).toFixed(3)})`); gg.addColorStop(1, 'rgba(222,212,186,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.38, 0, TAU); ctx.fill(); } // (6.0.5) quieter, bone
    const toolLook = (k) => (k === 'net' ? toolPic('net', gear(P, 'net')) || netLook(gear(P, 'net').look || 0) : k === 'cam' ? toolPic('cam', gear(P, 'cam')) || gear(P, 'cam').look : null); // (5.17.0) its own picture
    { const kind = e.inSub ? 'claw' : sel || 'net', look = toolLook(kind); /* (6.5.0) aboard too: the net, greyed */
      const noNet = !!(P && P.kit && P.kit.on && !P.kit.on.net); /* (6.9.1) the net unequipped: its button greyed */ drawCoin(ctx, cx, cy, R, kind, pressFx(bKey, cx, cy, R) ? 'press' : aboard ? 'off' : ((e.inSub && !armT) || (!sel && !e.inSub) || (kind === 'net' && noNet)) ? 'off' : 'on', look, rarOf(kind)); }
    // (6.5.7) the swing's time on its button: a hair-thin bone arc runs round the rim while the net is in motion, so a slow
    // net is seen to take its second
    if (g.capture && g.capture.kind === 'net' && !aboard) { const k = clamp(g.capture.t / g.capture.dur, 0, 1); ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(12,12,8,0.6)'; ctx.lineWidth = 4.2 * u; ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(226,216,190,0.85)'; ctx.lineWidth = 2.2 * u; ctx.stroke(); ctx.restore(); }
    // (5.17.0) the legendary net's power, as a badge on the main button's lower left, whatever is in hand (the net is
    // worn either way): steady for a power that is always on; grey with a hair-thin arc while one with a cooldown comes
    // back; on coming back (or at a dive's start) it warms from grey to full colour and pulses gently for 10 s, then
    // stays lit. It is not a button: a tap there still uses the tool
    { const pw = aboard ? null : gear(P, 'net').legend, L = pw && LEGEND[pw];
      if (L && POWER_EMBLEMS.includes(pw)) {
        const cd = L.cd || 0, left = cd ? Math.max(0, (P.netPowerAt || 0) - Date.now()) / 1000 : 0, nowS = performance.now() / 1000;
        if (this.badgeRun !== g) { this.badgeRun = g; this.badgeWake = cd ? nowS : null; }
        if (cd && left > 0) this.badgeCooling = true; else if (cd && this.badgeCooling) { this.badgeCooling = false; this.badgeWake = nowS; }
        let st;
        if (!cd) st = { sat: 1, glow: 0.35, arc: null };
        else if (left > 0) st = { sat: 0, glow: 0, arc: 1 - left / Math.max(P.netPowerFor || cd, left) }; /* (6.0.0) measured against what the shared timer was set for */
        else { const t = this.badgeWake != null ? nowS - this.badgeWake : 99, sat = clamp(t / 2.5, 0, 1), pulse = t < 10 ? (0.5 - 0.5 * Math.cos(t * TAU / 2.2)) * (1 - t / 10) : 0;
          st = { sat, glow: 0.35 * sat + 0.45 * pulse, arc: null }; }
        drawPowerBadge(ctx, cx - R * 0.74, cy + R * 0.6, R * 0.33, pw, st);
      } }
    // (6.5.1) the camera in hand: the exposures left in it this dive, small on its rim (it loads again at the surface)
    const filmCount = (fx, fy, fr) => { const n = (g.items && g.items.film) || 0; ctx.save(); ctx.fillStyle = 'rgba(10,12,10,0.88)'; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(230,222,196,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = n > 0 ? '#ece6d2' : '#e06a58'; ctx.font = `700 ${Math.round(fr * 1.2)}px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), fx, fy + fr * 0.06); ctx.restore(); };
    if (!aboard && !e.inSub && sel === 'cam' && owns(P, 'camera')) filmCount(cx + R * 0.68, cy + R * 0.68, R * 0.24);
    if (e.inSub && !armT) padlock(cx + R * 0.42, cy + R * 0.42, R * 0.36); // (5.7.1) no arm fitted: locked, as a camera not owned is
    // in reach: the porthole's glass glows, breathing (a warm ring inside the bolts)
    /* (5.15.7) the ring that was drawn across the picture here is gone: the light behind the coin says it */
    // (5.3.3) the main action's symbol: the net, the camera, a trap; in the sub, the claw. The ring pulses when it can reach

    const prog = g.photo ? g.photo.t / g.photo.dur : g.capture && g.capture.dur ? g.capture.t / g.capture.dur : 0;
    if (prog > 0) { ctx.strokeStyle = 'rgba(244,246,240,0.95)'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(prog, 0, 1)); ctx.stroke(); }
    ctx.restore();
    // what it would go for: its name above the button, in its rarity's colour
    const nm = this.capWant && this.capWant[0] ? parsePrompt(this.capWant[0]).map((p) => p.label).join(' ') : '';
    if (nm && can) { ctx.save(); ctx.font = `600 ${16 * u}px ${HUDF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = this.capWant[1] || '#ece6d2'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5 * s; ctx.textBaseline = 'middle'; ctx.fillText(nm, cx - rho1 - r - 14 * u, cy + R * 0.3); ctx.restore(); }
    // (5.7.1) in the sub the chip on the big button's rim is her trawl net: a tap lets it out or hauls it in (N); with no
    // trawl net in the hatch, a padlock
    if (e.inSub) {
      const rc = 19 * u, a2 = -36 * Math.PI / 180, sx2 = cx + Math.cos(a2) * (R + rc * 0.1), sy2 = cy + Math.sin(a2) * (R + rc * 0.1), hasN = !!g.subNet || (P && P.trawlPick && NETS_SUB_HUD(g, P.trawlPick) != null ? NETS_SUB_HUD(g, P.trawlPick) > 0 : netKinds(g.items).length > 0); // (6.5.1) the chosen net, or padlocked when none of it is left
      if (hasN && tutKey === 'n') ring(sx2, sy2, rc); // (6.5.1) the Log's step, or a net that can be closed
      if (hasN) { drawCoin(ctx, sx2, sy2, rc, 'trawl', pressFx('n', sx2, sy2, rc) ? 'press' : g.subNet ? 'lit' : 'on'); hot(sx2 - rc, sy2 - rc, rc * 2, rc * 2, 'n'); }
      else { drawCoin(ctx, sx2, sy2, rc, 'trawl', 'off'); padlock(sx2 + rc * 0.4, sy2 + rc * 0.4, rc * 0.42); hot(sx2 - rc, sy2 - rc, rc * 2, rc * 2, 'msg:No trawl net: the yard sells them'); }
    }
    // (5.6) the swap chip on the big button's rim: the next tool owned, a tap takes it in hand
    if (!e.inSub && !aboard) { ctx.save(); if (this.inKill) ctx.globalAlpha *= 0.32; // (5.10.10) dim in its jaws
      const owned = ['net'].concat(owns(P, 'camera') ? ['cam'] : []); /* (5.9.6) net and camera only */
      // (5.6.9) larger, and always there: the tool it swaps to; with nothing to swap to, a camera behind a padlock
      const rc = 16 * u, a2 = -36 * Math.PI / 180, sx2 = cx + Math.cos(a2) * (R - rc * 0.2), sy2 = cy + Math.sin(a2) * (R - rc * 0.2); // (5.17.0) smaller, further onto the rim
      if (owned.length > 1) {
        const nx = owned[(owned.indexOf(sel || 'net') + 1) % owned.length];
        drawCoin(ctx, sx2, sy2, rc, nx, pressFx('swap', sx2, sy2, rc) ? 'press' : 'on', toolLook(nx), rarOf(nx));
        if (nx === 'cam') filmCount(sx2 + rc * 0.62, sy2 + rc * 0.62, rc * 0.46); // (6.5.1) the exposures left, on the camera
        ctx.save(); ctx.translate(sx2 - rc * 0.68, sy2 + rc * 0.68); ctx.fillStyle = 'rgba(8,8,6,0.88)'; ctx.beginPath(); ctx.arc(0, 0, rc * 0.42, 0, TAU); ctx.fill(); drawGlyph(ctx, 'swap', 0, 0, rc * 0.8); ctx.restore();
        hot(sx2 - rc, sy2 - rc, rc * 2, rc * 2, 'swap');
      } else {
        drawCoin(ctx, sx2, sy2, rc, 'cam', 'off', null); padlock(sx2 + rc * 0.4, sy2 + rc * 0.4, rc * 0.42);
        hot(sx2 - rc, sy2 - rc, rc * 2, rc * 2, "msg:You don't have a camera equipped");
      }
      ctx.restore(); }
    // (5.8.1) the spotlight: while the tutorial waits on a button, the screen darkens round it (the game is paused under
    // it, main.js) and the button stands in a pool of light; its ring and arrow are drawn again over the dark
    { const T = this.tutTarget; this.tutTarget = null; this.spotOn = !!(T && tutKey && this.spotWanted);
      // (6.5.0) coming straight from a panel's shade (the tutorial pointing out of a screen, then at a button), it starts
      // dark rather than fading up from nothing: the screen never flashes bright between the two
      if (this.spotOn && !(this.spotV > 0) && performance.now() - (window.__tutDarkAt || -1e9) < 700) this.spotV = 1;
      const vS = this.spotV = clamp((this.spotV || 0) + (this.spotOn ? 1 : -1) * dt * 4, 0, 1);
      // (6.0.5) the dark covers the whole screen, the safe-area strips at the sides too, and reaches the farthest corner;
      // it eases in over a wide band round the button rather than starting at a hard ring
      if (T && vS > 0.01) { const x0 = -this.safeL, y0 = -this.safeT, X1 = x0 + this.c.width, Y1 = y0 + this.c.height, far = Math.max(Math.hypot(T.x - x0, T.y - y0), Math.hypot(T.x - X1, T.y - y0), Math.hypot(T.x - x0, T.y - Y1), Math.hypot(T.x - X1, T.y - Y1)) * 1.08;
        const sg = ctx.createRadialGradient(T.x, T.y, T.r * 1.25, T.x, T.y, far), b0 = T.r * 1.25, k1 = clamp((T.r * 3.2 - b0) / (far - b0), 0.02, 0.5);
        sg.addColorStop(0, 'rgba(4,8,8,0)'); sg.addColorStop(k1, `rgba(4,8,8,${(0.5 * vS).toFixed(3)})`); sg.addColorStop(1, `rgba(2,4,4,${(0.74 * vS).toFixed(3)})`);
        ctx.fillStyle = sg; ctx.fillRect(x0, y0, this.c.width, this.c.height); if (vS > 0.5) ring(T.x, T.y, T.r, true, T.sq); } }
    // (5.7.5) every button's picture in every state is painted once, now (during the loading screen), rather than the
    // first time each is needed, which showed as a button popping in a beat late
    if (!this.prewarmed) { this.prewarmed = true; const off = document.createElement('canvas').getContext('2d'), st = ['on', 'off', 'lit', 'press'];
      const sets = [[R, ['net', 'cam', 'trap', 'claw', 'hand', 'cabin']], [r, ['sub', 'glow', 'hand', 'lamp', 'leave', 'dive', 'door', 'ladder', 'basket', 'hatch']], [19 * u, ['bag', 'tank', 'auto', 'air', 'cam', 'trap', 'net', 'trawl']], [18 * u, ['sprint']], [17 * u, ['gear']]];
      for (const [sz, kinds] of sets) for (const kd of kinds) for (const s0 of st) { try { drawCoin(off, 0, 0, sz, kd, s0, kd === 'net' ? netLook(gear(P, 'net').look || 0) : (s0 === 'lit' && LIT_ART.has(kd)) ? { lit: true } : null, kd === 'net' ? (gear(P, 'net').rarity || null) : null); } catch (e) { /* skip */ } } }
    this.wasHeld = new Set(held); // (5.7.0) for the next frame's press rings
    hot(cx - R, cy - R, R * 2, R * 2, aboard ? 'msg:For the water' : e.inSub && !armT ? 'msg:This sub has no arm: the yard fits one' : !sel ? 'msg:Nothing in hand: pick the net in the bag' : ' ');
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
    this.pressureFx(g, dt, sf);
    if (g && g.wake) this.wakeFx(g);
    this.drawDeath(g);
  }
  // (6.1.9) no death screen: the whole screen goes black over everything (the radar and buttons too), one line says
  // what happened, centred, in the cream the game writes in, and fades; then he is back aboard
  drawDeath(g) {
    if (!g || g.mode !== 'dying') return;
    const ctx = this.ctx, W = this.c.width, H = this.c.height, s = this.s || 1, crushed = g.deathKind === 'implode';
    const t0 = crushed ? 1.6 : 0, end = g.deathEnd || 4.2;
    const dark = g.deathKind === 'devoured' ? 1 : clamp((g.deathT - t0) / 1.1, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    const a = clamp((g.deathT - t0 - 1.0) / 0.7, 0, 1) * clamp((end - 0.6 - g.deathT) / 0.7, 0, 1);
    const cause = String(g.deathCause || '').replace(/ when the submersible imploded/, ': the sub gave way');
    if (a > 0.01 && cause && g.deathKind !== 'quit') {
      ctx.save(); ctx.globalAlpha = a * 0.88; ctx.font = `500 ${30 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ddd3ba'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10 * s; ctx.fillText(cause, W / 2, H * 0.46); ctx.restore();
    }
  }
  // (6.0.0) a Rebirth's waking: black at first, then the eyelids part from the middle, soft-edged (a feathered eye-shaped
  // opening), with one slow blink before they open fully; the world behind is blurred (main.js) and clears as they open
  wakeFx(g) {
    const t = g.wake.t, c = this.ctx, W = this.c.width, H = this.c.height;
    let k = clamp((t - 1.3) / 2.1, 0, 1); k = 1 - Math.pow(1 - k, 1.6); document.documentElement.classList.toggle('waking', k < 0.98);
    const blink = t > 2.25 && t < 2.75 ? 1 - 0.7 * Math.sin((t - 2.25) / 0.5 * Math.PI) : 1, open = k * blink;
    if (open >= 0.999) { document.documentElement.classList.remove('waking'); return; }
    c.save(); c.fillStyle = '#030303'; c.fillRect(0, 0, W, H);
    if (open > 0.002) { const rx = W * 0.8, ry = Math.max(1, H * 0.62 * open); c.globalCompositeOperation = 'destination-out'; c.translate(W / 2, H / 2); c.scale(1, ry / rx);
      const gg = c.createRadialGradient(0, 0, 0, 0, 0, rx); gg.addColorStop(0, 'rgba(0,0,0,1)'); gg.addColorStop(0.55, 'rgba(0,0,0,1)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  // (5.12.3) past what his suit is built for, the game itself seems to change: the whole HUD slowly loses some of its
  // colour (none at the suit's depth, about 40 % at twice it; never grey), all but the depth figure, which turns to
  // blood (see bloodFigure). It eases in and out over a second or so, never a snap. Only for the diver in the water
  pressureFx(g, dt, sf) {
    const e = g && g.earl, P = (e && e.pressStart) || 300;
    const on = !!(e && g.mode === 'play' && !e.inSub && !g.aboard && !g.dying);
    const want = 0; // (6.3.0) nothing on screen changes past the suit's depth: no colour fade
    this.desat = (this.desat || 0) + (want - (this.desat || 0)) * (1 - Math.exp(-dt / 0.7));
    if (this.desat < 0.01) return;
    const c = this.c, W = c.width, H = c.height;
    if (!this.desatC || this.desatC.width !== W || this.desatC.height !== H) { this.desatC = document.createElement('canvas'); this.desatC.width = W; this.desatC.height = H; }
    const d = this.desatC.getContext('2d'); d.globalCompositeOperation = 'copy'; d.drawImage(c, 0, 0);
    d.globalCompositeOperation = 'saturation'; d.fillStyle = `rgba(128,128,128,${this.desat.toFixed(3)})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-in'; d.drawImage(c, 0, 0); d.globalCompositeOperation = 'source-over';
    const ctx = this.ctx, R = this.depthRect; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (R) ctx.rect(R.x + sf.l, R.y + sf.t, R.w, R.h); ctx.clip('evenodd'); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.desatC, 0, 0); ctx.restore();
  }
  // (5.12.3) the depth figure in blood (the owner-approved sample): dark red soaked into the readout's glass, a soft stain
  // round it, edges only a little uneven, a dull wet sheen on top; no running drips. Made once per figure and size
  bloodFigure(text, size) {
    const key = text + '|' + Math.round(size); this.bloodCache = this.bloodCache || new Map();
    if (this.bloodCache.has(key)) return this.bloodCache.get(key);
    let seed = 11 + text.length * 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const noise = (w, h, cell) => { const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, gr = new Float32Array(gw * gh); for (let i = 0; i < gr.length; i++) gr[i] = rnd();
      const f = new Float32Array(w * h), sm = (t) => t * t * (3 - 2 * t);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gx = x / cell, gy = y / cell, x0 = gx | 0, y0 = gy | 0, tx = sm(gx - x0), ty = sm(gy - y0);
        const a = gr[y0 * gw + x0], b = gr[y0 * gw + x0 + 1], c2 = gr[(y0 + 1) * gw + x0], d2 = gr[(y0 + 1) * gw + x0 + 1]; f[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c2 + (d2 - c2) * tx) * ty; } return f; };
    const pad = Math.ceil(size * 0.5), font = `600 ${size}px ${HUDT}`;
    const m0 = document.createElement('canvas').getContext('2d'); m0.font = font; const tw = m0.measureText(text).width;
    const w = Math.ceil(tw + pad * 2), h = Math.ceil(size * 1.5 + pad), bx = w - pad, by = Math.round(size * 0.95 + pad * 0.5);
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const A = mk(), a = A.getContext('2d'); a.font = font; a.textAlign = 'right'; a.textBaseline = 'alphabetic'; a.fillStyle = '#fff';
    a.filter = `blur(${(size * 0.022).toFixed(1)}px)`; a.fillText(text, bx, by); a.filter = 'none';
    const N = noise(w, h, size * 0.12), N2 = noise(w, h, size * 0.035), im = a.getImageData(0, 0, w, h), px = im.data;
    for (let i = 0; i < w * h; i++) { const v = px[i * 4 + 3] / 255 + (N[i] - 0.5) * 0.12 + (N2[i] - 0.5) * 0.08, t = Math.max(0, Math.min(1, (v - 0.44) / 0.14)); px[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255); }
    a.putImageData(im, 0, 0);
    const B = mk(), b = B.getContext('2d'); b.drawImage(A, 0, 0); b.globalCompositeOperation = 'source-in';
    const gr = b.createLinearGradient(0, by - size * 0.9, 0, by + size * 0.3); gr.addColorStop(0, '#a8170f'); gr.addColorStop(0.6, '#7a0c08'); gr.addColorStop(1, '#420503'); b.fillStyle = gr; b.fillRect(0, 0, w, h); /* (5.13.0) brighter */
    const cl = b.getImageData(0, 0, w, h), q = cl.data; for (let i = 0; i < w * h; i++) { if (!q[i * 4 + 3]) continue; const k = 0.72 + 0.5 * N2[i] - 0.25 * N[i]; q[i * 4] = Math.min(255, q[i * 4] * k); q[i * 4 + 1] *= k * 0.9; q[i * 4 + 2] *= k * 0.9; } b.putImageData(cl, 0, 0);
    const S = mk(), sx = S.getContext('2d'); sx.filter = `blur(${(size * 0.16).toFixed(1)}px)`; sx.drawImage(A, 0, 0); sx.filter = 'none'; sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(40,2,2,1)'; sx.fillRect(0, 0, w, h);
    sx.globalCompositeOperation = 'destination-in'; { const r = sx.createRadialGradient(bx - tw / 2, by - size * 0.4, size * 0.2, bx - tw / 2, by - size * 0.4, Math.max(tw, size) * 0.75); r.addColorStop(0, '#000'); r.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = r; sx.fillRect(0, 0, w, h); }
    const Hc = mk(), hx = Hc.getContext('2d'); hx.drawImage(A, 0, 0); hx.globalCompositeOperation = 'destination-out'; hx.drawImage(A, 0, size * 0.03); hx.globalCompositeOperation = 'source-in'; hx.fillStyle = 'rgba(200,96,86,0.38)'; hx.fillRect(0, 0, w, h);
    const out = mk(), o = out.getContext('2d'); o.drawImage(B, 0, 0); o.drawImage(Hc, 0, 0); // (5.13.0) no dark stain under it: it made the figure hard to read
    const res = { c: out, dx: -bx, dy: -by }; this.bloodCache.set(key, res); if (this.bloodCache.size > 24) this.bloodCache.delete(this.bloodCache.keys().next().value);
    return res;
  }
  drawIn(g, dt, W, H) {
    const touch = !!this.touch, ctx = this.ctx, s = this.s; this.hudNotes = []; this.hots = []; window.__hudHots = this.hots; // (5.4) for the tutorial's pointing on touch (5.3.1) the HUD keeps its size on a phone: only the controls are added
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
    const rx0 = W - pad - (touch ? Math.max(0, (this.gearSpace || 0) - pad + 12 * s) : 0), CW = 212 * s, cx0 = rx0 - CW, ccx = cx0 + CW / 2;
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
      const warnD = false, past = false; // (6.3.0) the depth figure never turns red, never flickers: depth is just depth (the pressure figure and the air say the rest)
      const dm = clamp((e.y - 120) / 1400, 0, 1), lit = 1 - dm * 0.42;
      const fl = past && Math.random() < 0.06 ? 0.35 : 1;
      const cr = Math.round(lerp(239, 170, dm)), cg = Math.round(lerp(232, 192, dm)), cb = Math.round(lerp(212, 204, dm));
      const bloodOn = false; // (6.3.0) no blood figure
      this.bloodK = (this.bloodK || 0) + ((bloodOn ? 1 : 0) - (this.bloodK || 0)) * (1 - Math.exp(-dt / 0.6));
      const ink = (a) => warnD && e.inSub ? `rgba(240,84,72,${(a * fl).toFixed(3)})` : `rgba(${cr},${cg},${cb},${(a * lit * fl * (1 - (this.bloodK || 0))).toFixed(3)})`;
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetY = 1;
      const base = pad + 52 * s; // (6.3.0) room for the taller figure
      ctx.font = `600 ${27 * s}px ${HUDT}`; ctx.fillStyle = ink(0.7); ctx.fillText(depthUnit(), rx0, base); /* (6.0.3); (6.3.0) larger */
      if (this.bloodK > 0.01) { ctx.save(); ctx.shadowColor = 'transparent'; ctx.fillStyle = `rgba(96,14,12,${(0.95 * this.bloodK).toFixed(3)})`; ctx.fillText(depthUnit(), rx0, base); ctx.restore(); }
      // (5.9.6) the figure changes calmly: a small dead zone so it does not flicker as he bobs on a metre's line, and
      // the new number slides in a little and fades up over a quarter second while the old one fades out (the last digit
      // used to snap over in the last quarter metre, and the next digit's top showed under the window)
      { ctx.font = `600 ${68 * s}px ${HUDT}`; /* (6.3.0) taller and wider */
        const v = Math.max(0, e.y) * (depthUnit() === 'ft' ? 3.28084 : 1), xr = rx0 - 27 * s, /* (6.0.3) in feet with Imperial */ lh = 68 * s * 0.86, nowT = performance.now();
        if (this.dShown == null) { this.dShown = Math.floor(v); this.dPrev = null; this.dDir = 1; }
        if (v >= this.dShown + 1.12 || v < this.dShown - 0.12) { this.dPrev = this.dShown; this.dShown = Math.floor(v); this.dT = nowT; this.dDir = this.dShown > this.dPrev ? 1 : -1; }
        const k = this.dPrev == null ? 1 : clamp((nowT - (this.dT || 0)) / 260, 0, 1), ek = k * k * (3 - 2 * k), sl = lh * 0.22;
        ctx.save(); ctx.beginPath(); ctx.rect(xr - 4 * dwOf(ctx) - 8 * s, base - lh - 4 * s, 4 * dwOf(ctx) + 12 * s, lh + 6 * s); ctx.clip();
        // (6.5.1) an odometer: each digit in its own fixed-width place from the right, and only a digit that changed rolls
        // (down as he goes deeper, up as he rises) while the rest stand still; a new leading digit fades in at the left
        { const now = String(this.dShown), was = this.dPrev == null ? now : String(this.dPrev), cw = dwOf(ctx), n2 = Math.max(now.length, was.length); ctx.fillStyle = ink(1); ctx.textAlign = 'center';
          for (let i = 0; i < n2; i++) { const a = now[now.length - 1 - i] || '', b = was[was.length - 1 - i] || '', cx2 = xr - cw * (i + 0.5);
            if (a === b || k >= 1) { if (a) { ctx.globalAlpha = 1; ctx.fillText(a, cx2, base); } continue; }
            if (b) { ctx.globalAlpha = 1 - ek; ctx.fillText(b, cx2, base - this.dDir * sl * ek); }
            if (a) { ctx.globalAlpha = ek; ctx.fillText(a, cx2, base + this.dDir * sl * (1 - ek)); } }
          ctx.globalAlpha = 1; ctx.textAlign = 'right'; }
        if (k >= 1) this.dPrev = null;
        ctx.restore();
        if (this.bloodK > 0.01) { const Bf = this.bloodFigure(String(this.dShown), 58 * s); ctx.save(); ctx.globalAlpha = this.bloodK; ctx.shadowColor = 'transparent'; ctx.drawImage(Bf.c, xr + Bf.dx, base + Bf.dy);
          // (5.13.0) a heartbeat: two quick swells (lub, dub) and a rest, about once a second; the figure brightens on each
          const ph = (g.time * 1.15) % 1, beat = Math.exp(-Math.pow((ph - 0.06) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.24) / 0.05, 2));
          if (beat > 0.02) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.bloodK * 0.45 * beat; ctx.drawImage(Bf.c, xr + Bf.dx, base + Bf.dy); ctx.globalCompositeOperation = 'source-over'; }
          ctx.restore(); }
        const tw0 = ctx.measureText(String(this.dShown)).width; this.depthRect = { x: xr - tw0 - 26 * s, y: base - lh - 18 * s, w: tw0 + 26 * s + (rx0 - xr) + 8 * s, h: lh + 34 * s }; }
      ctx.restore(); ctx.textBaseline = 'top'; ctx.textAlign = 'right';
      // a thin line with its painted icon at the left
      // (5.0) a short line with its mark in the same letters as the depth: O2 for his air, HULL for the sub's
      const lineW = 132 * s, lx = rx0 - lineW, lh = (touch ? 10 : 6) * s; // (5.9.6) thicker on a phone: new divers did not see it
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
      const spr = !!(e.sprint && !e.inSub && !aboard && e.speedNow > 0.5); // (5.7.0) sprinting: the air is seen going
      line('air', ay, o2, oc, o2 < 0.1 || g.noAir ? 0.55 + 0.45 * Math.sin(g.time * 10) : spr ? 0.78 + 0.22 * Math.sin(g.time * 22) : 1);
      if (spr) { // a bright bead running back along the bar toward the empty end, again and again: air pouring out
        const fw = (lineW - 2) * clamp(o2, 0, 1), k2 = (g.time * 1.6) % 1, bx = lx + 1 + fw * (1 - k2);
        ctx.save(); ctx.globalAlpha = 0.85 * (1 - k2); ctx.fillStyle = '#eaf6ff'; ctx.shadowColor = 'rgba(200,235,255,0.9)'; ctx.shadowBlur = 8 * s; ctx.beginPath(); ctx.arc(bx, ay + lh / 2, lh * 0.55, 0, TAU); ctx.fill(); ctx.restore(); }
      if (e.inSub) { const hi = clamp(g.sub.hull, 0, 1); line('hull', ay + 22 * s, hi, hi < 0.5 ? [226, 66, 52] : [130, 196, 164]); }
      // (6.5.1) the cabin air low with a backup tank aboard: a word under the bars, where the eye already is
      if (g.airCallout) { ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = `600 ${15 * s}px ${HUDT}`; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5 * s; ctx.fillStyle = `rgba(236,226,200,${(0.75 + 0.2 * Math.sin(g.time * 2.4)).toFixed(3)})`; ctx.fillText('Connect a backup tank', rx0, ay + 36 * s); ctx.restore(); }
      // (5.9.6) the first time under, a callout on the air bar: (5.12.1) an arrow pointing at it and words to its left
      const PA = g.profile;
      if (touch && PA && !e.inSub && !aboard && (e.y > 1.5 || this.airTipT > 0) && !PA.tutAirSeen) { this.airTipT = (this.airTipT || 0) + dt; if (this.airTipT > 9) { PA.tutAirSeen = true; this.airTipT = 0; } }
      if (touch && this.airTipT > 0 && PA && !PA.tutAirSeen) {
        const k = Math.min(1, this.airTipT / 0.4, (9 - this.airTipT) / 0.6), q = 0.5 + 0.5 * Math.sin(g.time * 4.5), fx0 = lx - 44 * s, fy0 = ay - 7 * s, fw = lineW + 50 * s, fh = lh + 14 * s;
        ctx.save(); ctx.globalAlpha = k;
        // (5.12.1) not a frame round it (it read as a web outline): a chunky painted arrow, as a phone game points at a thing,
        // nudging toward the air line in a slow ease; cream with a dark edge and a soft shadow, a little taper to the shaft
        { const nud = 5 * s * (0.5 - 0.5 * Math.cos(g.time * 3.2)), tipX = lx - 8 * s + nud, ty = ay + lh / 2, L = 44 * s, hw = 17 * s, sw = 7 * s;
          const arrow = () => { ctx.beginPath(); ctx.moveTo(tipX, ty); ctx.lineTo(tipX - hw * 1.25, ty - hw); ctx.lineTo(tipX - hw * 1.1, ty - sw * 0.9); ctx.quadraticCurveTo(tipX - L * 0.75, ty - sw * 1.05, tipX - L, ty - sw * 0.75);
            ctx.lineTo(tipX - L, ty + sw * 0.75); ctx.quadraticCurveTo(tipX - L * 0.75, ty + sw * 1.05, tipX - hw * 1.1, ty + sw * 0.9); ctx.lineTo(tipX - hw * 1.25, ty + hw); ctx.closePath(); };
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 2 * s; arrow(); ctx.fillStyle = '#1c1a14'; ctx.fill(); ctx.restore();
          ctx.save(); arrow(); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,18,12,0.85)'; ctx.lineWidth = 3 * s; ctx.stroke();
          const gr = ctx.createLinearGradient(0, ty - hw, 0, ty + hw); gr.addColorStop(0, '#f6f0dc'); gr.addColorStop(0.55, '#e6dcbc'); gr.addColorStop(1, '#bfb08a'); ctx.fillStyle = gr; ctx.fill();
          ctx.strokeStyle = 'rgba(255,252,240,0.55)'; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(tipX - L + 2 * s, ty - sw * 0.5); ctx.quadraticCurveTo(tipX - L * 0.7, ty - sw * 0.8, tipX - hw * 1.2, ty - sw * 0.7); ctx.stroke(); ctx.restore(); }
        const fx0b = fx0 - 16 * s; /* the words sit left of the arrow */
        ctx.font = `700 ${24 * s}px ${HUDF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6 * s; ctx.fillStyle = '#efe8d2';
        ctx.fillText('Your air', fx0b - 14 * s, fy0 + fh / 2 - 12 * s); ctx.font = `500 ${18 * s}px ${HUDF}`; ctx.fillStyle = 'rgba(239,232,210,0.85)'; ctx.fillText('come up before it runs out', fx0b - 14 * s, fy0 + fh / 2 + 12 * s);
        ctx.restore(); }
      yy = ay + (e.inSub ? 22 * s : 0) + lh + 18 * s;
      // (6.3.0) the pressure he is under, once he feels it: how much faster his air goes (the same curve for every suit,
      // by metres past its depth). Cream at first, slowly rust as it climbs; never a warning colour
      if (!e.inSub && !aboard && (g.diverPress || 1) > 1.05) { const pm = g.diverPress, k3 = clamp((pm - 1) / 6, 0, 1);
        ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5 * s; ctx.font = `600 ${17 * s}px ${HUDT}`;
        ctx.fillStyle = `rgba(${Math.round(lerp(cr, 196, k3))},${Math.round(lerp(cg, 120, k3))},${Math.round(lerp(cb, 84, k3))},${(0.9 * lit).toFixed(3)})`;
        ctx.fillText(`Pressure \u00d7${pm < 10 ? pm.toFixed(1) : Math.round(pm)}`, rx0, yy - 6 * s); ctx.restore(); yy += 16 * s; }
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
    else if (!e.atSurface && o2 < 0.25 && !g.firstDive) notes.push([sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s of air` : `${sec} s of air`, '#f06a5c']);
    // (4.28) no pressure multiplier: the air line draining faster says it
    if (e.inSub) {
      const r = g.sub.y / g.sub.rated, hi = clamp(g.sub.hull, 0, 1);
      if (g.sub.failing != null) notes.push(['Hull failing!', flash('#ff4a3a', '#a02a20')]);
      /* (5.15.5) no "near her rated depth" note: the red depth, the hull bar and the crush message say it */
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
    // (5.1.1) on a touch screen the radar sits under the instrument; the bottom right is the actions'
    // (5.15.6) as large as fits between the air bar and the corner of buttons (88 at most, as the owner asked), so the two
    // never overlap whatever the phone
    const room = this.arcTop ? (this.arcTop - (yy + 8 * s) - 10 * s) / 2 : 88 * s, rrT = Math.max(40 * s, Math.min(72 * s, room - 6 * s)), rcyT = yy + 20 * s + rrT; // (6.3.0) a little smaller, and lower // (5.6.9b) 44 to 56; (5.9.6) 66; (5.13.0) 88
    const notesAt = touch ? { x: W - 12 * (this.pxPt || 1.5) * (this.U || 1) - 2 * rrT - 14 * s, y: yy + 8 * s } : null; // (5.15.6) on a phone the notes stand to the left of the radar, clear of the buttons
    if (touch) yy = rcyT + rrT + 16 * s;
    // ---------- the words: under the instrument, centred on it ----------
    {
      let ny = notesAt ? notesAt.y : yy;
      ctx.save(); ctx.font = `600 ${19 * s}px ${HUDF}`; ctx.textAlign = notesAt ? 'right' : 'center'; ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5 * s; ctx.shadowOffsetY = 1;
      for (const [t, c] of notes) { ctx.fillStyle = c; ctx.fillText(t, notesAt ? notesAt.x : ccx, ny); ny += 24 * s; }
      ctx.restore();
    }
    // ---------- the radar: large, in the bottom right corner ----------
    const rr = touch ? rrT : 64 * s, rcx = touch ? W - 12 * (this.pxPt || 1.5) * (this.U || 1) - rr : rx0 - rr, rcy = touch ? rcyT : H - pad - rr; // (5.15.7) on a phone, out to the right edge under the settings coin
    this.radarAt = { x: rcx, y: rcy, r: rr }; // (5.6.1) the column under it hangs from here
    ctx.save();
    // (5.13.0) a real sonar scope (the owner's reference): dark green glass with a faint grid behind, four range rings, a
    // bearing ring of ticks (longer each 30 degrees, longest at the quarters), and a sweep in a dim olive phosphor with a
    // bright leading edge and a long fading tail; the contacts it passes glow, then fade until it comes round again
    { const gl = ctx.createRadialGradient(rcx - rr * 0.25, rcy - rr * 0.3, rr * 0.1, rcx, rcy, rr); gl.addColorStop(0, 'rgba(18,34,22,0.88)'); gl.addColorStop(1, 'rgba(4,10,6,0.9)');
      ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.fillStyle = gl; ctx.fill(); }
    ctx.clip();
    { const PH = (a) => `rgba(160,200,120,${a})`, gs = rr / 4.5; ctx.strokeStyle = PH(0.05); ctx.lineWidth = 1;
      for (let gx = rcx - rr; gx <= rcx + rr; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, rcy - rr); ctx.lineTo(gx, rcy + rr); ctx.stroke(); }
      for (let gy = rcy - rr; gy <= rcy + rr; gy += gs) { ctx.beginPath(); ctx.moveTo(rcx - rr, gy); ctx.lineTo(rcx + rr, gy); ctx.stroke(); }
      ctx.strokeStyle = PH(0.2); ctx.lineWidth = 1.1 * s; for (const k of [0.25, 0.5, 0.75]) { ctx.beginPath(); ctx.arc(rcx, rcy, rr * k, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = PH(0.12); ctx.beginPath(); ctx.moveTo(rcx - rr, rcy); ctx.lineTo(rcx + rr, rcy); ctx.moveTo(rcx, rcy - rr); ctx.lineTo(rcx, rcy + rr); ctx.stroke();
      for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, big = i % 18 === 0, mid = i % 6 === 0, L = (big ? 9 : mid ? 6 : 3) * s; ctx.strokeStyle = PH(big ? 0.55 : mid ? 0.4 : 0.22); ctx.lineWidth = (big ? 1.6 : 1) * s;
        ctx.beginPath(); ctx.moveTo(rcx + Math.cos(a) * (rr - 2 * s), rcy + Math.sin(a) * (rr - 2 * s)); ctx.lineTo(rcx + Math.cos(a) * (rr - 2 * s - L), rcy + Math.sin(a) * (rr - 2 * s - L)); ctx.stroke(); } }
    this.sweep = (this.sweep + dt * 1.6) % TAU;
    const sg = ctx.createConicGradient ? ctx.createConicGradient(this.sweep - 1.1, rcx, rcy) : null;
    if (sg) { sg.addColorStop(0, 'rgba(160,200,120,0)'); sg.addColorStop(0.17, 'rgba(160,200,120,0.3)'); sg.addColorStop(0.175, 'rgba(160,200,120,0)'); ctx.fillStyle = sg; ctx.fillRect(rcx - rr, rcy - rr, rr * 2, rr * 2);
      ctx.strokeStyle = 'rgba(196,226,150,0.65)'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(rcx, rcy); ctx.lineTo(rcx + Math.cos(this.sweep) * rr, rcy + Math.sin(this.sweep) * rr); ctx.stroke(); }
    // his traps: small amber marks where their lines are
    for (const tr of g.traps || []) {
      const dx = tr.x - e.x, dy = tr.y - e.y, d = Math.hypot(dx, dy);
      if (d > 200) continue;
      const k = rr * Math.min(1, d / 200);
      ctx.fillStyle = 'rgba(240,190,90,0.9)'; ctx.beginPath(); ctx.arc(rcx + dx / (d || 1) * k, rcy + dy / (d || 1) * k, 2 * s, 0, TAU); ctx.fill();
    }
    // (5.9.0) Echo: every animal within the radar's 200 m as a dot while it lasts (rare and better in their colours at Echo+)
    // (5.16.0) Echo: for its time, every exotic and legendary animal in reach shows as the same pale bone pip with a soft ring
    // (no telling which is which); Fathom reaches three times as far (the radar's edge stands for its reach then)
    if (g.echoT > 0 && g.fauna) { const al = Math.min(1, g.echoT / 1.5), reach = g.echoLv >= 3 ? 600 : 200;
      for (const c of g.fauna.list) { if (c.dead) continue; const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy); if (d > reach) continue;
        const R = c.rk || (c.rk = (rarityOf(c.sp) || {}).id || 'common'); if (R !== 'exotic' && R !== 'legendary') continue;
        const k = rr * Math.min(1, d / reach), px = rcx + dx / (d || 1) * k, py = rcy + dy / (d || 1) * k, q = 0.5 + 0.5 * Math.sin(g.time * 3 + c.x);
        ctx.globalAlpha = al * (0.35 + 0.3 * q); ctx.strokeStyle = '#e6dcc0'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.arc(px, py, 5.5 * s, 0, TAU); ctx.stroke();
        ctx.globalAlpha = al; ctx.fillStyle = '#ece4cc'; ctx.beginPath(); ctx.arc(px, py, 2.4 * s, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; }
    const ent = g.entity;
    if (ent && ent.dist < 200 && !dying && !(ent.offRadarT > 0)) { // (5.16.0) after it loses you in the dark it stays off the radar a minute
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
        if (ent && ent.marked) { const q = 7 * s, c = 3 * s; ctx.strokeStyle = `rgba(230,80,64,${Math.min(1, this.blip.life * 1.4).toFixed(3)})`; ctx.lineWidth = 1.4 * s; // (5.13.0) it has marked him: a bracketed contact
          for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(bxp + sx2 * q, byp + sy2 * (q - c)); ctx.lineTo(bxp + sx2 * q, byp + sy2 * q); ctx.lineTo(bxp + sx2 * (q - c), byp + sy2 * q); ctx.stroke(); } }
      }
    }
    // (6.8.0) the radar ghost: when the sweep passes its bearing, a large contact at the very edge, there for half a
    // second, then gone; a duller red than the thing's own blip and twice its size, with no sound but the sweep's own
    if (g.radarGhost && !dying) { const a = g.radarGhost.a, da = ((this.sweep - a) % TAU + TAU) % TAU; if (da < dt * 1.7 + 0.001) { this.ghostBlip = { a, life: 1 }; g.radarGhost = null; } }
    if (this.ghostBlip) { const G = this.ghostBlip; G.life -= dt * 1.6; if (G.life <= 0) this.ghostBlip = null; else {
      const r = rr * 0.88, bx = rcx + Math.cos(G.a) * r, by = rcy + Math.sin(G.a) * r, R = 14 * s, al = Math.min(1, G.life * 1.6) * 0.9;
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, R); gr.addColorStop(0, `rgba(196,82,64,${al.toFixed(3)})`); gr.addColorStop(0.5, `rgba(170,66,52,${(al * 0.5).toFixed(3)})`); gr.addColorStop(1, 'rgba(150,60,48,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(bx, by, R, R * 0.7, G.a + Math.PI / 2, 0, TAU); ctx.fill(); } }
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
    const slotBase = rcy - rr - 20 * s; // the carried things stack upward from here
    // ---------- the sub: a button for C (call it to you, or the autopilot home) ----------
    this.subHot = null;
    if (!touch && !g.sub.imploded && !dying && !g.tutHidePrompts) { // (4.4.0) not during the tutorial (5.1.1: on touch, an action button)
      const ap = g.autopilot;
      const label = e.inSub ? (g.homeRun ? 'autopilot off' : g.sub.docked ? null : 'autopilot home') : (ap && ap.state === 'coming' ? 'stop sub' : 'call sub');
      if (label) {
        // bottom-right corner, a little larger
        const word = label.charAt(0).toUpperCase() + label.slice(1);
        ctx.font = `600 ${19 * s}px ${HUDF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(word).width, bw = tw + 40 * s, bh = 31 * s, bx = rcx - rr - 18 * s - bw, by = H - pad - bh;
        this.subHot = { x: (bx + this.safeL) * kx, y: (by + this.safeT) * kx, w: bw * kx, h: bh * kx };
        const on = g.homeRun || (ap && ap.state === 'coming');
        promptShade(ctx, bx + bw / 2, by + bh / 2, s * 0.45);
        keyCap(ctx, bx, by + 2 * s, 'C', s);
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 1;
        ctx.fillStyle = '#efe8d2'; ctx.fillText(word, bx + 38 * s, by + bh / 2 + 1 * s);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.textBaseline = 'top';
      }
    }

    // ---------- Q / E items: in the right-hand column, only when carried ----------
    // (claude-polish) a small steel plate in a brass rim, as the journal and chart buttons
    // (olive) the item slots: the same raised olive plate and well as the hotbar
    const glass = (x, y, w, h) => { if (!oliveNine(ctx, 'btn-olive', x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s, 28, 10 * s)) { ctx.fillStyle = 'rgba(44,48,42,0.9)'; ctx.fillRect(x, y, w, h); } oliveNine(ctx, 'well', x + 4 * s, y + 4 * s, w - 8 * s, h - 8 * s, 30, 6 * s); };
    const sz = 46 * s;
    const slots = [];
    if (e.inSub && (g.items.airTank > 0 || g.tankFit)) slots.push(['r', 'R', 'AIR TANK', g.items.airTank, '#9fd4ff', g.tankFit ? g.tankFit / 3 : 0]);
    if (g.items.necklace > 0) slots.push(['e', 'E', 'GLOW STICK', g.items.necklace, '#ffc070', 0]);
    // the sub's trawl net (N): which net is in the hatch, and while it is out, how long it has been towing
    if (e.inSub) {
      const n = g.subNet, kinds = netKinds(g.items), N = n ? n.T : kinds.length ? NETS_SUB[kinds[0]] : null; // (4.11.0) every kind in the hatch
      const state = n ? (n.phase === 'tow' ? (g.trawlTaught ? 'OUT' : 'OUT, N CLOSES') : n.phase === 'torn' ? 'TORN' : 'HAULING') : kinds.length ? kinds.map((k) => NETS_SUB[k].short).join(' + ') : 'NO NET';
      if (n || N) slots.push(['n', 'N', state, n || N ? 1 : 0, n ? '#e8b070' : kinds.includes('adv') ? '#f0c060' : '#e8b070', n && n.phase === 'tow' ? Math.min(1, n.pt / (n.T.tow || TOW_MAX)) : 0, n ? 0 : netsOf(g.items).basic]); // (the badge: two beginner nets)
    }
    this.slotHot = {}; this.itemSlots = slots;
    if (!touch) slots.forEach(([id, key, name, n, col, active, badge], i) => {
      const x = rx0 - sz, y = slotBase - (i + 1) * (sz + 10 * s) + 10 * s;
      this.slotHot[id] = { x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, w: sz * kx, h: sz * kx };
      glass(x, y, sz, sz);
      ctx.fillStyle = col; ctx.globalAlpha = n > 0 ? 1 : 0.3;
      ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.52, 8 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (active > 0) { ctx.strokeStyle = col; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.52, 13 * s, -Math.PI / 2, -Math.PI / 2 + TAU * active); ctx.stroke(); }
      ctx.font = `500 ${10 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6'; ctx.textAlign = 'left'; if (!(id === 'n' && g.trawlTaught)) keyCap(ctx, x - 6 * s, y - 6 * s, key, s * 0.62); // (4.0.6) N, once learned, is not shown
      ctx.textAlign = 'right'; if (id !== 'n') ctx.fillText(`×${n}`, x + sz - 5 * s, y + 4 * s);
      if (badge > 1) { // (4.11.0) how many nets are in the hatch: a number in a small brass circle at the corner
        const bw = 22 * s, bh = 14 * s, bx = x + sz - bw + 6 * s, by = y - 5 * s; // (4.11.1) a wider pill: ×2
        ctx.fillStyle = '#d8d0b6'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3 * s); ctx.fill(); ctx.strokeStyle = 'rgba(20,18,12,0.85)'; ctx.lineWidth = 1; ctx.stroke(); // (olive) cream, as the keys
        ctx.save(); ctx.fillStyle = '#26241a'; ctx.font = `600 ${10 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`×${badge}`, bx + bw / 2, by + bh / 2 + 0.5 * s); ctx.restore();
      }
      dymo(ctx, name.toLowerCase(), x - 9 * s, y + sz / 2 - 6 * s, s, { tape: name === 'NO NET' || name === 'TORN' ? '#4a1810' : '#1c1d1b' });
    });
    }
    // (4.28) no cash on the HUD: it cannot change under water. It is in the inventory, the journal and the shops.

    if (!aboard) {
    // ---------- tools and specimens, bottom centre ----------
    if (g.profile && g.mode === 'play' && !dying && !this.panel) this.drawGear(g, W, H, s, dt); // (5.4) touch: not under an open panel

    // ---------- marked: the thing's eye, under the money ----------
    // (5.10.10) the one sign of being marked (the vast eye in the water is gone): larger, matte (no halo, no wet
    // shine), darker and bloodshot. It watches: as the thing comes nearer the lids part wider and the slit narrows.
    // Each good deed fades it a step.
    if (!(g.entity && g.entity.marked)) this.wasMarked = false;
    if (g.entity && g.entity.marked && !dying) {
      const calm = 0 /* (5.16.0) no calm meter */, near = clamp(1 - (g.entity.dist ?? 2000) / 900, 0, 1);
      const a = 1 - calm * 0.6;
      // (6.0.6) one eye, the painted picture (eyePicture), with its slit and lids laid on live: quiet and dim while the
      // thing is far, warmer as it comes; the slow heavy blink, and the slit narrowing to a thread when it is close
      // (6.1.11) it cannot be missed: when the mark lands, a large eye opens slowly (6.2.0: under the money), and holds
      // line, and holds; then it draws back to a smaller narrowed slit that stays while he is marked, pulsing faintly as
      // the thing comes nearer, and the lids snap wide when it is close
      if (!this.wasMarked) { this.wasMarked = true; this.markT0 = g.time; }
      const mt = g.time - this.markT0, big = mt < 4.6 ? 1 : clamp(1 - (mt - 4.6) / 1.4, 0, 1), ease = (q) => q * q * (3 - 2 * q);
      // (6.2.0) back under the money, as in 6.0.7, but the larger, thicker eye: it opens at its largest, then settles
      const kxE = window.innerWidth / this.c.width, E = eyePicture(), ew = (52 + 20 * ease(big)) * s, sc = ew / E.ew, tlB = this.topLeftBottom ? this.topLeftBottom / kxE - (this.safeT || 0) : 70 * s;
      const ex = (this.moneyTextX != null ? this.moneyTextX : 60 * s) + ew * 0.95, ey = (this.moneyRowBottom != null ? this.moneyRowBottom : tlB) + E.eh * sc * 1.15 + 6 * s;
      const close = near > 0.82, pulse = 0.5 + 0.5 * Math.sin(g.time * (2 + 5 * near));
      const per = 9 - 3 * near, bt = g.time % per, blink = !close && mt > 6 && bt < 0.32 ? Math.sin(bt / 0.32 * Math.PI) : 0;
      const opening = clamp(mt / 1.3, 0, 1), rest = close ? 1 : 0.24 + 0.4 * near, open = Math.max(0.05, (1 - blink) * ease(opening) * (big * 0.92 + (1 - big) * rest));
      { const gg = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew * 1.6); gg.addColorStop(0, `rgba(120,14,6,${(0.18 + 0.22 * near * pulse + 0.2 * big).toFixed(3)})`); gg.addColorStop(1, 'rgba(120,14,6,0)'); ctx.fillStyle = gg; ctx.fillRect(ex - ew * 1.6, ey - ew * 1.6, ew * 3.2, ew * 3.2); } // a dull red breath round it
      ctx.save(); ctx.globalAlpha *= a * (0.85 + 0.15 * Math.max(big, near));
      ctx.save(); ctx.beginPath(); ctx.ellipse(ex + E.ew * sc * 0.02, ey - E.eh * sc * 0.08, E.ew * sc * 1.45, E.eh * sc * 1.7, -0.18, 0, TAU); ctx.clip(); /* (7.0.13) only the eye and its near hide: no stray flecks */
      ctx.drawImage(E.c, ex - E.cx * sc, ey - E.cy * sc, E.c.width * sc, E.c.height * sc); ctx.restore();
      ctx.save(); ctx.translate(ex, ey); ctx.scale(sc, sc);
      const almond = () => { ctx.beginPath(); ctx.moveTo(-E.ew, E.eh * 0.25); ctx.bezierCurveTo(-E.ew * 0.55, -E.eh * 1.15, E.ew * 0.3, -E.eh * 1.2, E.ew, -E.eh * 0.5); ctx.bezierCurveTo(E.ew * 0.45, E.eh * 0.85, -E.ew * 0.45, E.eh * 1.05, -E.ew, E.eh * 0.25); ctx.closePath(); };
      almond(); ctx.clip();
      const sw = E.eh * (0.5 - 0.3 * near) * (1 + 0.06 * Math.sin(g.time * 0.7)), px = 2 + Math.sin(g.time * 0.23) * 4;
      { const hg = ctx.createRadialGradient(px, 0, 0, px, 0, E.eh * 0.9); hg.addColorStop(0, 'rgba(255,180,140,0.5)'); hg.addColorStop(1, 'rgba(255,120,80,0)'); ctx.fillStyle = hg; ctx.fillRect(px - E.eh, -E.eh, E.eh * 2, E.eh * 2); } // the hottest gold round the pupil // the slit, with a faint dark-red edge where it meets the glow
      ctx.shadowColor = 'rgba(90,10,2,0.9)'; ctx.shadowBlur = 6; ctx.fillStyle = '#040100'; ctx.beginPath(); ctx.moveTo(px, -E.eh * 1.25); ctx.quadraticCurveTo(px + sw, 0, px, E.eh * 1.25); ctx.quadraticCurveTo(px - sw, 0, px, -E.eh * 1.25); ctx.fill(); ctx.shadowBlur = 0;
      if (open < 0.999) { const k = 1 - open; ctx.fillStyle = '#060201'; // (7.0.13) the lids close as lids do: each edge a curve following the eye, meeting in a slanted line
        const up = -E.eh * 1.25 + E.eh * 1.3 * k, lo = E.eh * 1.1 - E.eh * 1.05 * k, tilt = -E.eh * 0.35;
        ctx.beginPath(); ctx.moveTo(-E.ew * 1.1, -E.eh * 2); ctx.lineTo(E.ew * 1.1, -E.eh * 2); ctx.lineTo(E.ew * 1.1, up + tilt); ctx.quadraticCurveTo(0, up - E.eh * 0.55 * (1 - k * 0.6), -E.ew * 1.1, up - tilt * 0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-E.ew * 1.1, E.eh * 2); ctx.lineTo(E.ew * 1.1, E.eh * 2); ctx.lineTo(E.ew * 1.1, lo + tilt * 0.6); ctx.quadraticCurveTo(0, lo + E.eh * 0.45 * (1 - k * 0.6), -E.ew * 1.1, lo - tilt * 0.2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(150,40,20,0.35)'; ctx.lineWidth = E.eh * 0.06; ctx.beginPath(); ctx.moveTo(E.ew * 1.1, up + tilt); ctx.quadraticCurveTo(0, up - E.eh * 0.55 * (1 - k * 0.6), -E.ew * 1.1, up - tilt * 0.4); ctx.stroke(); }
      ctx.restore();
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
    // ---------- interaction prompts ----------
    // (4.0.0) both prompts fade in and out, and one crossfades into the next; the shade behind them is one
    // fixed soft pool that fades with them. (5.1.1) On a touch screen these are the action buttons instead.
    if (!touch) {
      const cw = aboard ? null : this.capWant;
      const capFx = this.fadeText('cap', cw ? cw[0] : null, cw ? cw[1] : null); this.capIconNow = cw ? cw[2] : this.capIconNow;
      const prFx = this.fadeText('pr', g.prompt && !dying && !g.kill && !g.tutHidePrompts ? g.prompt : null, '#ece6d2'); // (2.6.2: always: Hints off hid what F does, e.g. at the cabin door)
      const shadeA = Math.max(capFx.level, prFx.level);
      const both = capFx.level > 0.01 && prFx.level > 0.01, capY = H * 0.72 - (both || g.prompt ? 40 : 0) * s + 14 * s, prY = H * 0.72 + 15 * s;
      const sy = both ? (capY + prY) / 2 : capFx.level > prFx.level ? capY : prY; this.shadeY = shadeA > 0.02 && this.shadeY != null ? this.shadeY + (sy - this.shadeY) * 0.15 : sy;
      if (shadeA > 0.01) promptShade(ctx, W / 2, this.shadeY, s, shadeA);
      for (const [txt, a, col] of capFx.list) { ctx.save(); ctx.globalAlpha = a; drawPrompt(ctx, txt, W / 2, capY, s, { col, size: 18, shade: false, icon: parsePromptKey(txt) ? null : this.capIconNow }); ctx.restore(); } // (3.6.0) a brass key-cap and the words; a catch's name in its rarity's colour
      for (const [txt, a, col] of prFx.list) { ctx.save(); ctx.globalAlpha = a; drawPrompt(ctx, txt, W / 2, prY, s, { col, shade: false, named: g.promptName }); ctx.restore(); }
      if (g.promptBar != null && prFx.level > 0.01) { // (4.5.0) the hold's progress: a slim brass bar in a dark groove
        const bw = 150 * s, bh = 5 * s, bx = W / 2 - bw / 2, by = prY + 18 * s, k = Math.max(0, Math.min(1, g.promptBar));
        ctx.save(); ctx.globalAlpha = prFx.level;
        ctx.fillStyle = 'rgba(6,10,12,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 3 * s); ctx.fill();
        const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#f4f6f0'); gr.addColorStop(1, '#b8bab0');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(bh, bw * k), bh, 2.5 * s); ctx.fill();
        ctx.restore();
      }
    }
    // (5.1.1) a touch screen: the actions, bottom right (on deck too: the F action is how he goes in)
    this.inKill = !!(touch && g.kill && !g.kill.inSub && !g.kill.esc); // (5.10.10) the controls stay where they are in its jaws, dimmed
    if (touch && !this.panel && g.profile && g.mode === 'play' && !dying && (!g.kill || this.inKill) && !(g.paused || (document.getElementById('pause') && !document.getElementById('pause').hidden))) { const dk = aboard ? 0 : clamp(((g.earl.y || 0) - 120) / 700, 0, 1); ctx.save(); ctx.globalAlpha = 1 - 0.28 * dk; const h0 = this.hots.length; this.drawActions(g, W, H, s, dt, aboard); ctx.restore(); if (this.inKill) this.hots.splice(h0, this.hots.length - h0, ...this.hots.slice(h0).filter((h) => h.key === 'ability' && this.killTide)); } // (5.10.8) the controls dim gently in the dark
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
    // ---------- P: frames per second, the picture's resolution, and whether lite mode is on ----------
    if (this.showFps) { // (5.3.5) top right, everywhere (on deck too)
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = 'rgba(200,225,215,0.75)';
      ctx.fillText(`${Math.round(this.fps || 0)} fps · ${Math.round(Math.min(1, (this.quality ?? 1) * Math.min(window.devicePixelRatio || 1, 1.25)) * 100)} % sharp${this.lite ? ' · lite' : ''}`, W / 2, 6 * s);
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
      if (this.killTide) opts.push(['1', 'TIDEWARDEN']); // (5.10.8) no lamp: a lure or the Tidewarden
      const left = 1 - (K.t - K.window[0]) / (K.window[1] - K.window[0]);
      const pulse = 0.75 + 0.25 * Math.sin(K.t * 22);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${30 * s}px ${MONO}`; ctx.fillStyle = `rgba(255,236,220,${pulse.toFixed(3)})`;
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12 * s;
      ctx.fillText(opts.length ? opts.map(([k, n]) => (touch ? n : `${k}  ${n}`)).join('     ') : 'NOTHING LEFT TO GIVE IT', W / 2, H * 0.72); // (5.10.1) no key letters on a phone: the lamp button is lit below
      ctx.shadowBlur = 0;
      const bw = 360 * s, bx = W / 2 - bw / 2, by = H * 0.72 + 30 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, 5 * s);
      ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fillRect(bx, by, bw * left, 5 * s);
      ctx.restore();
    }
    // ---------- death ----------
    // (6.1.9) no death screen: the sea goes black, one line says what happened, centred, in the cream the game writes
    // in, and it fades again; then he is back aboard. In the thing's jaws it is black from the first moment
    const bleedOut = dying && g.deathKind === 'injury', crushed = dying && g.deathKind === 'implode';
  }
}
