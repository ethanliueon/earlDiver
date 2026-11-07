// (3.5.0) The sub's own fittings, drawn on the canvas, so that what the rooms say is part of the rooms: names
// painted on the steel, a mechanical depth counter, the destination stencilled round a hatch's rim, paper
// work-order tags on string, chalk on the bulkhead, a toggle switch, a brass tag. Four materials, each with one
// job: paint names places, brass is what you operate, paper and chalk tell you things, red is only for alarms.
import { clamp, lerp, TAU } from './util.js';

const STENCIL = '"Allerta Stencil", "IBM Plex Mono", monospace';
const HAND = '"Caveat", "Segoe Print", cursive';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const ease = (q) => 1 - Math.pow(1 - clamp(q, 0, 1), 3);

// a little seeded noise, so chips and grain stay put from frame to frame
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const hash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return h >>> 0; };

// ---------------- paint ----------------
// stencilled paint on the bulkhead: chipped where the paint has flaked, the stencil's bridges left in the letters,
// worn thin in patches. Made once per text and size, then drawn like a decal.
const PAINT = new Map();
export function paintedText(ctx, text, x, y, size, { col = 'rgba(214,206,172,1)', alpha = 0.5, align = 'left', spacing = 0.12 } = {}) {
  const key = `${text}|${size}|${col}|${spacing}`;
  let P = PAINT.get(key);
  if (!P) {
    const c = document.createElement('canvas'), x0 = c.getContext('2d');
    x0.font = `${size}px ${STENCIL}`;
    const chars = [...text], gap = size * spacing, w = chars.reduce((a, ch) => a + x0.measureText(ch).width + gap, 0) - gap;
    c.width = Math.ceil(w + size * 0.4); c.height = Math.ceil(size * 1.5);
    const k = c.getContext('2d'); k.font = `${size}px ${STENCIL}`; k.textBaseline = 'middle'; k.fillStyle = col;
    let cx = size * 0.2; for (const ch of chars) { k.fillText(ch, cx, c.height / 2); cx += k.measureText(ch).width + gap; }
    // flaked chips and worn patches
    const r = rng(hash(key)); k.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < (c.width * c.height) / 90; i++) { k.globalAlpha = 0.35 + r() * 0.65; k.beginPath(); k.arc(r() * c.width, r() * c.height, 0.4 + r() * r() * size * 0.07, 0, TAU); k.fill(); }
    for (let i = 0; i < 4; i++) { const g = k.createRadialGradient(r() * c.width, r() * c.height, 0, r() * c.width, r() * c.height, size * (0.8 + r())); g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); k.globalAlpha = 1; k.fillStyle = g; k.fillRect(0, 0, c.width, c.height); }
    // a drip or two under the letters
    k.globalCompositeOperation = 'source-over'; k.fillStyle = col; k.globalAlpha = 0.5;
    for (let i = 0; i < 2; i++) { const dx = size * 0.4 + r() * (c.width - size), dl = size * (0.15 + r() * 0.3); k.fillRect(dx, c.height * 0.72, 1.2, dl); }
    P = { c, w: c.width, h: c.height }; PAINT.set(key, P);
  }
  const dx = align === 'center' ? x - P.w / 2 : align === 'right' ? x - P.w : x;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(P.c, dx, y - P.h / 2); ctx.restore();
  return P.w;
}

// ---------------- the depth counter ----------------
// a brass-bezelled window of number drums, rolling as the sub goes down: each drum turns only while the ones to
// its right roll over from 9, like an odometer. Past the sub's rating the window glows amber.
export function depthCounter(ctx, x, y, depth, { warn = false, t = 0, label = 'DEPTH · M' } = {}) {
  const N = 4, dw = 22, dh = 32, pad = 8, W = N * dw + pad * 2 + 4, H = dh + pad * 2;
  ctx.save(); ctx.translate(x, y);
  // the brass bezel, its screws
  const bz = ctx.createLinearGradient(0, 0, 0, H);
  bz.addColorStop(0, '#d8c48e'); bz.addColorStop(0.45, '#a88e52'); bz.addColorStop(1, '#6c5630');
  ctx.fillStyle = '#1a1408'; ctx.beginPath(); ctx.roundRect(-2, -1, W + 4, H + 4, 7); ctx.fill();
  ctx.fillStyle = bz; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(0.5, 0.5, W - 1, H - 1, 6); ctx.stroke();
  for (const [sx, sy] of [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5]]) {
    ctx.fillStyle = '#5a4620'; ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2008'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 1.5, sy - 1); ctx.lineTo(sx + 1.5, sy + 1); ctx.stroke();
  }
  // the window, recessed
  const wx = pad + 2, wy = pad, ww = N * dw;
  ctx.fillStyle = '#0b0c0c'; ctx.beginPath(); ctx.roundRect(wx - 2, wy - 2, ww + 4, dh + 4, 3); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, dh); ctx.clip();
  const d = Math.max(0, Math.min(9999.99, depth));
  for (let i = 0; i < N; i++) {
    const p = N - 1 - i, unit = Math.pow(10, p), v = d / unit, digit = Math.floor(v) % 10;
    // it rolls only when everything to its right is about to turn over
    // (each drum snaps over in the last fifth of its turn, so a number at rest reads cleanly)
    const snap = (q) => ease(clamp((q - 0.8) / 0.2, 0, 1));
    const lower = d % unit, roll = p === 0 ? snap(v - Math.floor(v)) : (lower >= unit - 1 ? snap(lower - (unit - 1)) : 0);
    const dx = wx + i * dw;
    const drum = ctx.createLinearGradient(0, wy, 0, wy + dh);
    drum.addColorStop(0, '#1a1b1c'); drum.addColorStop(0.5, '#e9e4d4'); drum.addColorStop(1, '#1a1b1c');
    ctx.fillStyle = drum; ctx.fillRect(dx + 1, wy, dw - 2, dh);
    ctx.fillStyle = '#16120a'; ctx.font = `600 22px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const off = roll * dh;
    ctx.fillText(String(digit), dx + dw / 2, wy + dh / 2 - off);
    ctx.fillText(String((digit + 1) % 10), dx + dw / 2, wy + dh / 2 + dh - off);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(dx, wy, 1, dh);
  }
  // the drum's curve: dark at top and bottom, a glint across the glass
  const sh = ctx.createLinearGradient(0, wy, 0, wy + dh);
  sh.addColorStop(0, 'rgba(0,0,0,0.75)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = sh; ctx.fillRect(wx, wy, ww, dh);
  if (warn) { ctx.fillStyle = `rgba(255,150,40,${(0.22 + 0.12 * Math.sin(t * 6)).toFixed(3)})`; ctx.fillRect(wx, wy, ww, dh); }
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(wx, wy + 3, ww, 3);
  ctx.restore();
  // engraved on the bezel, under the window
  ctx.font = `600 8px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.fillText(label, W / 2, H + 12);
  ctx.fillStyle = 'rgba(40,30,10,0.0)';
  ctx.restore();
  return { w: W, h: H + 14 };
}

// ---------------- a hatch's rim ----------------
// where the hatch goes, stencilled round the top of its rim, with a painted chevron; on hover the rim catches
// the light (a brass edge brightening). The hatch itself is the button.
export function hatchRim(ctx, h, label, dir, hover = 0) {
  ctx.save(); ctx.translate(h.x, h.y);
  if (hover > 0.01) {
    ctx.strokeStyle = `rgba(232,206,140,${(0.55 * hover).toFixed(3)})`; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(240,210,140,0.8)'; ctx.shadowBlur = 14 * hover;
    ctx.beginPath(); ctx.arc(0, 0, h.r + 10, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
  }
  const R = h.r + 26, size = Math.max(11, Math.min(15, h.r * 0.12));
  ctx.font = `${size}px ${STENCIL}`; ctx.fillStyle = `rgba(214,206,172,${(0.62 + 0.3 * hover).toFixed(3)})`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = [...label.toUpperCase()], gap = size * 0.25, widths = chars.map((c) => ctx.measureText(c).width + gap), total = widths.reduce((a, b) => a + b, 0) - gap;
  let a = -Math.PI / 2 - total / R / 2;
  for (let i = 0; i < chars.length; i++) {
    const aw = widths[i] / R, am = a + (widths[i] - gap) / R / 2;
    ctx.save(); ctx.rotate(am); ctx.translate(R, 0); ctx.rotate(Math.PI / 2); ctx.fillText(chars[i], 0, 0); ctx.restore();
    a += aw;
  }
  // the chevron, at the end the hatch leads
  const ca = dir > 0 ? a + 0.12 : -Math.PI / 2 - total / R / 2 - 0.12;
  ctx.save(); ctx.rotate(ca); ctx.translate(R, 0); ctx.rotate(Math.PI / 2 + (dir > 0 ? 0 : Math.PI));
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2.4; ctx.lineCap = 'square';
  ctx.beginPath(); ctx.moveTo(-3, -size * 0.38); ctx.lineTo(size * 0.32, 0); ctx.lineTo(-3, size * 0.38); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------- paper ----------------
// a manila work-order tag on string: a reinforced eyelet, a red stamp, handwriting; it sways a little
export function paperTag(ctx, x, y, w, h, { stamp = 'WORK ORDER', lines = [], t = 0, seed = 1, from = null } = {}) {
  const sway = Math.sin(t * 0.9 + seed) * 0.035 + Math.sin(t * 2.3 + seed) * 0.008;
  // the string, from where it is tied down to the eyelet
  if (from) {
    ctx.strokeStyle = 'rgba(200,184,140,0.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo((from.x + x) / 2 + 6, (from.y + y) / 2 + 10, x + Math.sin(sway) * 14, y + 14); ctx.stroke();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway - 0.04);
  // the card: a clipped-corner tag, grain, a soft shadow
  const tag = new Path2D(); const cc = 16;
  tag.moveTo(-w / 2 + cc, 0); tag.lineTo(w / 2 - cc, 0); tag.lineTo(w / 2, cc); tag.lineTo(w / 2, h); tag.lineTo(-w / 2, h); tag.lineTo(-w / 2, cc); tag.closePath();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.fillStyle = '#d9c597'; ctx.fill(tag); ctx.restore();
  const pg = ctx.createLinearGradient(0, 0, w * 0.3, h); pg.addColorStop(0, '#e6d4a6'); pg.addColorStop(1, '#c8b17e');
  ctx.fillStyle = pg; ctx.fill(tag);
  ctx.save(); ctx.clip(tag);
  const r = rng(seed * 977); ctx.fillStyle = 'rgba(90,60,20,0.08)';
  for (let i = 0; i < 160; i++) ctx.fillRect(-w / 2 + r() * w, r() * h, 1 + r() * 2, 1);
  // a crease, and a damp stain at the bottom
  ctx.strokeStyle = 'rgba(120,90,40,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.62); ctx.lineTo(w / 2, h * 0.58); ctx.stroke();
  const st = ctx.createRadialGradient(w * 0.28, h, 2, w * 0.28, h, h * 0.5); st.addColorStop(0, 'rgba(110,80,30,0.25)'); st.addColorStop(1, 'rgba(110,80,30,0)'); ctx.fillStyle = st; ctx.fillRect(-w / 2, 0, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,64,24,0.45)'; ctx.lineWidth = 1; ctx.stroke(tag);
  // the eyelet
  ctx.fillStyle = '#b89a58'; ctx.beginPath(); ctx.arc(0, 14, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1c1a16'; ctx.beginPath(); ctx.arc(0, 14, 3.4, 0, TAU); ctx.fill();
  // the stamp: red ink, a box, slightly crooked and uneven
  ctx.save(); ctx.translate(0, 38); ctx.rotate(-0.05);
  ctx.font = `15px ${STENCIL}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const sw = ctx.measureText(stamp).width + 18;
  ctx.strokeStyle = 'rgba(168,40,30,0.75)'; ctx.lineWidth = 2; ctx.strokeRect(-sw / 2, -11, sw, 22);
  ctx.fillStyle = 'rgba(168,40,30,0.8)'; ctx.fillText(stamp, 0, 1);
  ctx.restore();
  // the handwriting, in pencil-dark ink
  ctx.fillStyle = '#2a2418'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let ly = 72;
  for (const L of lines) { ctx.font = `${L.size || 21}px ${HAND}`; ctx.fillStyle = L.col || '#2a2418'; ctx.fillText(L.text, -w / 2 + 14, ly); ly += (L.size || 21) * 1.05; }
  ctx.restore();
}

// ---------------- chalk ----------------
// chalk on steel: a little rough, a little smudged
export function chalkText(ctx, text, x, y, size, { align = 'left', alpha = 0.6, rot = -0.03 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `600 ${size}px ${HAND}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(236,234,222,${(alpha * 0.25).toFixed(3)})`; ctx.fillText(text, 1.2, 1.2); // the smudge
  ctx.fillStyle = `rgba(236,234,222,${alpha.toFixed(3)})`; ctx.fillText(text, 0, 0);
  ctx.restore();
}
// a chalk arrow along a gentle curve, from (x0,y0) to (x1,y1)
export function chalkArrow(ctx, x0, y0, x1, y1, { alpha = 0.6, bend = 30 } = {}) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - bend;
  ctx.save(); ctx.strokeStyle = `rgba(236,234,222,${alpha.toFixed(3)})`; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (const j of [0, 1.2]) { ctx.globalAlpha = j ? 0.35 : 1; ctx.beginPath(); ctx.moveTo(x0 + j, y0 + j); ctx.quadraticCurveTo(mx + j, my, x1 + j, y1); ctx.stroke(); }
  const a = Math.atan2(y1 - my, x1 - mx);
  ctx.globalAlpha = 1; ctx.beginPath();
  ctx.moveTo(x1 - Math.cos(a - 0.5) * 14, y1 - Math.sin(a - 0.5) * 14); ctx.lineTo(x1, y1); ctx.lineTo(x1 - Math.cos(a + 0.5) * 14, y1 - Math.sin(a + 0.5) * 14); ctx.stroke();
  ctx.restore();
}
// chalk along a path: a few rough passes, broken here and there
export function chalkStroke(ctx, path, { alpha = 0.45, width = 2.4, seed = 3 } = {}) {
  const r = rng(seed);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    ctx.setLineDash([18 + r() * 40, 3 + r() * 7, 6 + r() * 20, 2 + r() * 4]); ctx.lineDashOffset = r() * 50;
    ctx.strokeStyle = `rgba(236,234,222,${(alpha * (pass ? 0.45 : 1)).toFixed(3)})`; ctx.lineWidth = width * (pass ? 0.7 : 1);
    ctx.save(); ctx.translate((r() - 0.5) * 1.6, (r() - 0.5) * 1.6); ctx.stroke(path); ctx.restore();
  }
  ctx.restore();
}

// ---------------- brass you operate ----------------
// a toggle switch on a small steel plate: up for the first label, down for the second; a pilot lamp
export function toggleSwitch(ctx, x, y, up, { top = 'DAY', bottom = 'DIM', title = 'TANK LIGHT', hover = 0, lamp = '#9fe08a' } = {}) {
  const W = 62, H = 112;
  ctx.save(); ctx.translate(x, y);
  // the plate: painted steel, screwed to the bulkhead
  ctx.fillStyle = '#121414'; ctx.beginPath(); ctx.roundRect(-1, 1, W + 2, H + 2, 4); ctx.fill();
  const pg = ctx.createLinearGradient(0, 0, 0, H); pg.addColorStop(0, '#46504a'); pg.addColorStop(1, '#2e3530');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,240,0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(0.5, 0.5, W - 1, H - 1, 4); ctx.stroke();
  for (const [sx, sy] of [[6, 6], [W - 6, 6], [6, H - 6], [W - 6, H - 6]]) { ctx.fillStyle = '#8a8f88'; ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a2e2a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 1.5, sy); ctx.lineTo(sx + 1.5, sy); ctx.stroke(); }
  // dymo tape title
  ctx.fillStyle = '#121312'; ctx.fillRect(6, 10, W - 12, 13);
  ctx.font = `600 7.5px ${MONO}`; ctx.fillStyle = '#f2f2ea'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, W / 2, 17);
  // the two positions, engraved
  ctx.font = `10px ${STENCIL}`; ctx.fillStyle = up ? 'rgba(240,230,200,0.95)' : 'rgba(214,206,172,0.45)'; ctx.fillText(top, W / 2, 34);
  ctx.fillStyle = !up ? 'rgba(240,230,200,0.95)' : 'rgba(214,206,172,0.45)'; ctx.fillText(bottom, W / 2, 96);
  // the boss and the lever
  const cx = W / 2, cy = 65;
  const bg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 12); bg.addColorStop(0, '#e2d2a0'); bg.addColorStop(1, '#6e5a30');
  ctx.fillStyle = '#141210'; ctx.beginPath(); ctx.arc(cx, cy + 1, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, TAU); ctx.fill();
  const tip = up ? -20 : 20;
  ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + tip); ctx.stroke();
  ctx.strokeStyle = hover > 0.01 ? '#f0e0b0' : '#d8c896'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + tip); ctx.stroke();
  ctx.fillStyle = '#efe2b8'; ctx.beginPath(); ctx.arc(cx, cy + tip, 4.5, 0, TAU); ctx.fill();
  // the pilot lamp
  ctx.fillStyle = '#0c0d0c'; ctx.beginPath(); ctx.arc(W - 11, 34, 4.2, 0, TAU); ctx.fill();
  const lg = ctx.createRadialGradient(W - 11, 34, 0, W - 11, 34, 9); lg.addColorStop(0, lamp); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(W - 11, 34, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = lamp; ctx.beginPath(); ctx.arc(W - 11, 34, 2.6, 0, TAU); ctx.fill();
  if (hover > 0.01) { ctx.strokeStyle = `rgba(232,206,140,${(0.5 * hover).toFixed(3)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-3, -3, W + 6, H + 6, 6); ctx.stroke(); }
  ctx.restore();
  return { x, y, w: W, h: H };
}
// a small stamped brass tag on a ring: how full the bag is
export function brassTag(ctx, x, y, text, rot = 0.2) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#8a7a50'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.stroke();
  ctx.rotate(rot); ctx.translate(0, 4);
  ctx.font = `600 11px ${MONO}`; const w = Math.max(30, ctx.measureText(text).width + 14), h = 18;
  const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#dcc890'); bg.addColorStop(0.5, '#b49a5c'); bg.addColorStop(1, '#7c6436');
  ctx.fillStyle = '#2a2008'; ctx.beginPath(); ctx.roundRect(-w / 2 - 1, -1, w + 2, h + 2, 4); ctx.fill();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, 0, w, h, 3.5); ctx.fill();
  ctx.fillStyle = '#1e1606'; ctx.beginPath(); ctx.arc(-w / 2 + 5, h / 2, 1.8, 0, TAU); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.fillText(text, 3, h / 2 + 1.6);
  ctx.fillStyle = '#2a1e08'; ctx.fillText(text, 3, h / 2 + 0.6);
  ctx.restore();
}
export { ease, lerp };
