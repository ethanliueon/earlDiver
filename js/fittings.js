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
export function depthCounter(ctx, x, y, depth, { warn = false, t = 0, label = 'DEPTH · METRES' } = {}) {
  // (3.6.0) larger, and the drums lit more evenly so the digits read at a glance
  const N = 4, dw = 30, dh = 44, pad = 10, W = N * dw + pad * 2 + 4, H = dh + pad * 2;
  ctx.save(); ctx.translate(x, y);
  // the brass bezel, its screws
  const bz = ctx.createLinearGradient(0, 0, 0, H);
  bz.addColorStop(0, '#d8c48e'); bz.addColorStop(0.45, '#a88e52'); bz.addColorStop(1, '#6c5630');
  ctx.fillStyle = '#1a1408'; ctx.beginPath(); ctx.roundRect(-2, -1, W + 4, H + 4, 8); ctx.fill();
  ctx.fillStyle = bz; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(0.5, 0.5, W - 1, H - 1, 7); ctx.stroke();
  for (const [sx, sy] of [[6, 6], [W - 6, 6], [6, H - 6], [W - 6, H - 6]]) {
    ctx.fillStyle = '#5a4620'; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2008'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 1.6, sy - 1); ctx.lineTo(sx + 1.6, sy + 1); ctx.stroke();
  }
  // the window, recessed
  const wx = pad + 2, wy = pad, ww = N * dw;
  ctx.fillStyle = '#0b0c0c'; ctx.beginPath(); ctx.roundRect(wx - 2, wy - 2, ww + 4, dh + 4, 3); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, dh); ctx.clip();
  const d = Math.max(0, Math.min(9999.99, depth));
  for (let i = 0; i < N; i++) {
    const p = N - 1 - i, unit = Math.pow(10, p), v = d / unit, digit = Math.floor(v) % 10;
    // each drum snaps over in the last fifth of its turn, so a number at rest reads cleanly
    const snap = (q) => ease(clamp((q - 0.8) / 0.2, 0, 1));
    const lower = d % unit, roll = p === 0 ? snap(v - Math.floor(v)) : (lower >= unit - 1 ? snap(lower - (unit - 1)) : 0);
    const dx = wx + i * dw;
    const drum = ctx.createLinearGradient(0, wy, 0, wy + dh);
    drum.addColorStop(0, '#8e8a7e'); drum.addColorStop(0.22, '#e6e0cf'); drum.addColorStop(0.5, '#f2ecdc'); drum.addColorStop(0.78, '#e6e0cf'); drum.addColorStop(1, '#8e8a7e');
    ctx.fillStyle = drum; ctx.fillRect(dx + 1, wy, dw - 2, dh);
    ctx.fillStyle = '#121008'; ctx.font = `600 31px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const off = roll * dh;
    ctx.fillText(String(digit), dx + dw / 2, wy + dh / 2 + 1 - off);
    ctx.fillText(String((digit + 1) % 10), dx + dw / 2, wy + dh / 2 + 1 + dh - off);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(dx, wy, 1.5, dh);
  }
  // the drum's curve, gently; a glint across the glass
  const sh = ctx.createLinearGradient(0, wy, 0, wy + dh);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)'); sh.addColorStop(0.16, 'rgba(0,0,0,0)'); sh.addColorStop(0.84, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = sh; ctx.fillRect(wx, wy, ww, dh);
  if (warn) { ctx.fillStyle = `rgba(255,150,40,${(0.2 + 0.1 * Math.sin(t * 6)).toFixed(3)})`; ctx.fillRect(wx, wy, ww, dh); }
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(wx, wy + 4, ww, 3);
  ctx.restore();
  // engraved on a strip under the bezel
  ctx.font = `600 9px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(label, W / 2 + 0.6, H + 14.6);
  ctx.fillStyle = 'rgba(232,222,190,0.72)'; ctx.fillText(label, W / 2, H + 14);
  ctx.restore();
  return { w: W, h: H + 16 };
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
// a manila tag on string, printed and typed: the supplier's name, a form number, typed fields with dotted
// leaders, a rubber stamp across it in red. It sways a little.
export function paperTag(ctx, x, y, w, h, { title = 'BAYSIDE MARINE SUPPLY', form = 'WORK ORDER  No. 0417', fields = [], stamp = '', t = 0, seed = 1, from = null } = {}) {
  const sway = Math.sin(t * 0.9 + seed) * 0.03 + Math.sin(t * 2.3 + seed) * 0.006;
  if (from) {
    ctx.strokeStyle = 'rgba(196,182,140,0.9)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo((from.x + x) / 2 + 4, (from.y + y) / 2 + 6, x + Math.sin(sway) * 14, y + 14); ctx.stroke();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway - 0.03);
  const tag = new Path2D(); const cc = 18;
  tag.moveTo(-w / 2 + cc, 0); tag.lineTo(w / 2 - cc, 0); tag.lineTo(w / 2, cc); tag.lineTo(w / 2, h); tag.lineTo(-w / 2, h); tag.lineTo(-w / 2, cc); tag.closePath();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5; ctx.fillStyle = '#cdb98a'; ctx.fill(tag); ctx.restore();
  const pg = ctx.createLinearGradient(0, 0, w * 0.2, h); pg.addColorStop(0, '#ddc99a'); pg.addColorStop(1, '#bfa874');
  ctx.fillStyle = pg; ctx.fill(tag);
  ctx.save(); ctx.clip(tag);
  // card grain, a fold, a damp edge
  const r = rng(seed * 977); ctx.fillStyle = 'rgba(80,56,20,0.07)';
  for (let i = 0; i < 260; i++) ctx.fillRect(-w / 2 + r() * w, r() * h, 1 + r() * 2.5, 1);
  ctx.strokeStyle = 'rgba(110,84,40,0.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.64); ctx.lineTo(w / 2, h * 0.6); ctx.stroke();
  const st = ctx.createLinearGradient(0, h * 0.75, 0, h); st.addColorStop(0, 'rgba(90,64,24,0)'); st.addColorStop(1, 'rgba(90,64,24,0.18)'); ctx.fillStyle = st; ctx.fillRect(-w / 2, 0, w, h);
  // the printed form: a rule, the supplier, the form number
  const L = -w / 2 + 14, R = w / 2 - 14, ink = 'rgba(38,46,60,0.9)';
  ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  ctx.font = `600 9.5px ${MONO}`; ctx.fillText(title, 0, 38);
  ctx.fillStyle = 'rgba(38,46,60,0.75)'; ctx.fillRect(L, 43, R - L, 1);
  ctx.font = `500 9px ${MONO}`; ctx.textAlign = 'left'; ctx.fillText(form, L, 56);
  ctx.fillRect(L, 61, R - L, 0.8);
  // typed fields: a label in print, dotted leaders, the value in type (a little uneven, as a typewriter is)
  let fy = 78;
  for (const [label, val] of fields) {
    ctx.font = `500 8.5px ${MONO}`; ctx.fillStyle = 'rgba(38,46,60,0.7)'; ctx.fillText(label, L, fy);
    const lw = ctx.measureText(label).width;
    ctx.font = `500 11px ${MONO}`; const vw = ctx.measureText(val).width;
    ctx.fillStyle = 'rgba(38,46,60,0.35)'; for (let dx = L + lw + 4; dx < R - vw - 4; dx += 4) ctx.fillRect(dx, fy - 1, 1, 1);
    let cx = R - vw; for (const ch of val) { const rr = r(); ctx.fillStyle = `rgba(20,18,16,${(0.78 + rr * 0.2).toFixed(3)})`; ctx.fillText(ch, cx, fy + (rr - 0.5) * 0.8); cx += ctx.measureText(ch).width; }
    fy += 18;
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,64,24,0.5)'; ctx.lineWidth = 1; ctx.stroke(tag);
  // the eyelet, a brass ring pressed into the card
  ctx.fillStyle = '#9c8450'; ctx.beginPath(); ctx.arc(0, 14, 7, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 14, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.fillStyle = '#16140f'; ctx.beginPath(); ctx.arc(0, 14, 3.4, 0, TAU); ctx.fill();
  // the rubber stamp: a double border, red ink that took unevenly
  if (stamp) {
    ctx.save(); ctx.translate(-w * 0.12, h - 24); ctx.rotate(-0.07);
    ctx.font = `17px ${STENCIL}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sw = ctx.measureText(stamp).width + 22, shh = 28;
    const sc = document.createElement('canvas'); sc.width = Math.ceil(sw + 8); sc.height = shh + 8;
    const k = sc.getContext('2d'); k.translate(4, 4);
    k.strokeStyle = 'rgb(170,34,26)'; k.lineWidth = 2.2; k.strokeRect(0, 0, sw, shh); k.lineWidth = 1; k.strokeRect(3, 3, sw - 6, shh - 6);
    k.font = `17px ${STENCIL}`; k.fillStyle = 'rgb(170,34,26)'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText(stamp, sw / 2, shh / 2 + 1);
    const rs = rng(seed * 31 + 7); k.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) { k.globalAlpha = 0.3 + rs() * 0.7; k.fillRect(rs() * sw, rs() * shh, 1 + rs() * 2, 1 + rs() * 1.5); }
    const fade = k.createLinearGradient(0, 0, sw, 0); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.85, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.5)');
    k.globalAlpha = 1; k.fillStyle = fade; k.fillRect(-4, -4, sc.width, sc.height);
    ctx.globalAlpha = 0.82; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------- engraved plates ----------------
// an instruction plate: brushed aluminium, two rivets, the words engraved and filled black, as the labels on
// real equipment are. `alpha` fades it (a plate taken down once he knows).
export function instructionPlate(ctx, x, y, lines, { align = 'left', alpha = 1, arrow = 0 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `600 10.5px ${MONO}`;
  const lw = Math.max(...lines.map((l) => ctx.measureText(l).width)), w = lw + 40 + (arrow ? 22 : 0), h = 14 + lines.length * 15;
  const x0 = align === 'right' ? x - w : x;
  ctx.translate(x0, y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(1, 2, w, h, 3); ctx.fill();
  const al = ctx.createLinearGradient(0, 0, 0, h); al.addColorStop(0, '#c9cbc6'); al.addColorStop(0.5, '#a9aca6'); al.addColorStop(1, '#8c8f8a');
  ctx.fillStyle = al; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 3); ctx.fill();
  // brushing
  const r = rng(hash(lines.join('|'))); ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, w, h, 3); ctx.clip();
  for (let i = 0; i < h; i += 1) { ctx.fillStyle = `rgba(255,255,255,${(r() * 0.08).toFixed(3)})`; ctx.fillRect(0, i, w, 1); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3, 0.5); ctx.lineTo(w - 3, 0.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(0.5, 0.5, w - 1, h - 1, 3); ctx.stroke();
  for (const rx of [8, w - 8]) { ctx.fillStyle = '#6e716c'; ctx.beginPath(); ctx.arc(rx, h / 2, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(rx - 0.7, h / 2 - 0.7, 1, 0, TAU); ctx.fill(); }
  // the engraving: cut dark, a bright lip under each stroke
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const tx = 20 + (arrow < 0 ? 22 : 0);
  lines.forEach((l, i) => { const ly = 7 + 7.5 + i * 15; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(l, tx, ly + 0.8); ctx.fillStyle = '#1c1e1d'; ctx.fillText(l, tx, ly); });
  if (arrow) { // an engraved arrowhead, pointing the way
    const ax = arrow > 0 ? w - 22 : 16, ay = h / 2;
    ctx.fillStyle = '#1c1e1d'; ctx.beginPath();
    if (arrow > 0) { ctx.moveTo(ax - 4, ay - 6); ctx.lineTo(ax + 5, ay); ctx.lineTo(ax - 4, ay + 6); } else { ctx.moveTo(ax + 4, ay - 6); ctx.lineTo(ax - 5, ay); ctx.lineTo(ax + 4, ay + 6); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return { x: x0, y, w, h };
}

// ---------------- an empty bay ----------------
// where equipment will go: the bulkhead there cleaner (no grime or rust collected where it is kept clear), a
// grime line round the edge of it
export function cleanPatch(ctx, x, y, w, h) {
  ctx.save();
  ctx.filter = 'blur(10px)';
  ctx.fillStyle = 'rgba(200,210,205,0.07)'; ctx.fillRect(x, y, w, h);
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(14,10,6,0.3)'; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  ctx.filter = 'none';
  ctx.restore();
}
// a capped flange at the end of a drop from the pipe run: a blank bolted over the end, a red blanking tag
export function cappedFlange(ctx, x, top, y) {
  ctx.save();
  ctx.fillStyle = '#4b5355'; ctx.fillRect(x - 4, top, 8, y - top);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x - 3, top, 2, y - top);
  ctx.fillStyle = '#606a6c'; ctx.fillRect(x - 8, top - 8, 16, 16);
  // the flange and the blank
  const fg = ctx.createLinearGradient(x - 18, 0, x + 18, 0); fg.addColorStop(0, '#3e4547'); fg.addColorStop(0.4, '#7a8487'); fg.addColorStop(1, '#2c3233');
  ctx.fillStyle = fg; ctx.fillRect(x - 18, y, 36, 7);
  ctx.fillStyle = '#8a3324'; ctx.fillRect(x - 18, y + 7, 36, 5); // the blank, painted red
  ctx.fillStyle = '#c4c9c6'; for (const bx of [-13, -4.5, 4.5, 13]) { ctx.beginPath(); ctx.arc(x + bx, y + 9.5, 1.6, 0, TAU); ctx.fill(); }
  ctx.restore();
  return { x, y: y + 12 };
}
// a length of hose, coiled and hung on a wall hook
export function hoseCoil(ctx, x, y, R = 30) {
  ctx.save();
  // a steel bracket bolted to the wall, its arm curled up
  ctx.fillStyle = '#3a4142'; ctx.fillRect(x - 9, y - R - 20, 18, 14);
  ctx.fillStyle = '#8a9294'; for (const bx of [-5, 5]) { ctx.beginPath(); ctx.arc(x + bx, y - R - 13, 1.6, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = '#4b5355'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - R - 8); ctx.lineTo(x, y - R + 4); ctx.quadraticCurveTo(x, y - R + 12, x + 8, y - R + 8); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const dy = i * 3, rx = R * (1 - i * 0.04), ry = R * 0.86;
    ctx.strokeStyle = '#0e1010'; ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(x + i * 1.5, y + dy, rx, ry, 0.08, 0, TAU); ctx.stroke();
    ctx.strokeStyle = i % 2 ? '#2a2d2e' : '#353a3c'; ctx.lineWidth = 8.5; ctx.beginPath(); ctx.ellipse(x + i * 1.5, y + dy, rx, ry, 0.08, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + i * 1.5, y + dy - 2, rx, ry, 0.08, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  }
  // its brass coupling hanging down
  ctx.strokeStyle = '#2a2d2e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + R * 0.7, y + R * 0.5); ctx.quadraticCurveTo(x + R * 0.9, y + R * 1.3, x + R * 0.6, y + R * 1.6); ctx.stroke();
  ctx.fillStyle = '#a88e52'; ctx.fillRect(x + R * 0.6 - 5, y + R * 1.6, 10, 9);
  ctx.restore();
}
// hazard tape on the deck: worn yellow and black stripes marking out a footprint
export function hazardTape(ctx, x0, x1, y, h = 9) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, h); ctx.clip();
  ctx.fillStyle = 'rgba(196,160,40,0.75)'; ctx.fillRect(x0, y, x1 - x0, h);
  ctx.fillStyle = 'rgba(18,16,12,0.85)';
  for (let sx = x0 - h; sx < x1 + h; sx += 18) { ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + 9, y + h); ctx.lineTo(sx + 9 + h, y); ctx.lineTo(sx + h, y); ctx.closePath(); ctx.fill(); }
  // scuffed where boots go
  const r = rng(Math.round(x0 * 7 + x1)); ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < (x1 - x0) / 5; i++) { ctx.fillStyle = `rgba(30,30,28,${(0.2 + r() * 0.4).toFixed(3)})`; ctx.fillRect(x0 + r() * (x1 - x0), y + r() * h, 2 + r() * 8, 1 + r() * 2); }
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

// ---------------- prompts ----------------
// (3.6.0) "F  Out on deck", "Hold F  Plant a coral", "Space  Atlantic herring", or several joined by " · ":
// each part as { hold, key, label }; a part with no key is plain words
const KEYS = /^(?:(Hold|Tap)\s+)?(Space|Shift|Enter|Esc|Tab|F\d{1,2}|[A-Z0-9])\s{2,}(.*)$/;
export function parsePrompt(text) {
  return String(text).split(/\s+·\s+/).map((part) => { const m = part.trim().match(KEYS); return m ? { hold: m[1] || '', key: m[2], label: m[3] } : { hold: '', key: '', label: part.trim() }; });
}
// a key-cap, brass, the key engraved on its top: at (x, y) its top-left, size s; returns its width
export function keyCap(ctx, x, y, key, s = 1) {
  const h = 26 * s, w = key.length > 1 ? Math.max(h * 1.9, (key.length * 8 + 18) * s) : h, d = 3.5 * s, r = 4.5 * s;
  ctx.save();
  // its side (the depth of the key), then the top face
  ctx.fillStyle = '#4a3a18'; ctx.beginPath(); ctx.roundRect(x, y + d, w, h, r); ctx.fill();
  const tg = ctx.createLinearGradient(0, y, 0, y + h); tg.addColorStop(0, '#e4d29e'); tg.addColorStop(0.55, '#b89c5c'); tg.addColorStop(1, '#94793e');
  ctx.fillStyle = tg; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,4,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h + d - 1, r); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,244,210,0.6)'; ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke();
  // the dished top: a soft hollow
  const dg = ctx.createRadialGradient(x + w / 2, y + h * 0.42, 1, x + w / 2, y + h * 0.42, Math.max(w, h) * 0.6); dg.addColorStop(0, 'rgba(255,240,200,0.18)'); dg.addColorStop(1, 'rgba(60,40,10,0.12)');
  ctx.fillStyle = dg; ctx.beginPath(); ctx.roundRect(x + 2.5 * s, y + 2.5 * s, w - 5 * s, h - 5 * s, r * 0.8); ctx.fill();
  // the engraving
  ctx.font = `600 ${(key.length > 1 ? 10.5 : 14) * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lab = key.length > 1 ? key.toUpperCase() : key;
  ctx.fillStyle = 'rgba(255,244,210,0.55)'; ctx.fillText(lab, x + w / 2, y + h / 2 + 1.6 * s);
  ctx.fillStyle = '#2a1e06'; ctx.fillText(lab, x + w / 2, y + h / 2 + 0.6 * s);
  ctx.restore();
  return w;
}
// a whole prompt, centred on cx at y: key-caps and upright words, a soft shadow pooled behind (no box)
export function drawPrompt(ctx, text, cx, y, s = 1, { col = '#ece6d2', size = 19 } = {}) {
  const parts = parsePrompt(text), gapK = 9 * s, gapP = 26 * s, fs = size * s;
  ctx.save(); ctx.textBaseline = 'middle';
  const measure = (p) => {
    let w = 0;
    if (p.hold) { ctx.font = `600 ${9.5 * s}px ${MONO}`; w += ctx.measureText(p.hold.toUpperCase()).width + 6 * s; }
    if (p.key) { const kw = p.key.length > 1 ? Math.max(26 * s * 1.9, (p.key.length * 8 + 18) * s) : 26 * s; w += kw + gapK; }
    ctx.font = `500 ${fs}px "EB Garamond", Georgia, serif`; w += ctx.measureText(p.label).width;
    return w;
  };
  const ws = parts.map(measure), total = ws.reduce((a, b) => a + b, 0) + gapP * (parts.length - 1);
  // the pooled shadow
  const sh = ctx.createRadialGradient(cx, y, 4, cx, y, total * 0.62 + 30 * s);
  sh.addColorStop(0, 'rgba(4,8,10,0.55)'); sh.addColorStop(0.6, 'rgba(4,8,10,0.3)'); sh.addColorStop(1, 'rgba(4,8,10,0)');
  ctx.save(); ctx.translate(cx, y); ctx.scale(1, 0.28); ctx.translate(-cx, -y); ctx.fillStyle = sh; ctx.fillRect(cx - total, y - total, total * 2, total * 2); ctx.restore();
  let x = cx - total / 2;
  parts.forEach((p, i) => {
    if (i) { ctx.fillStyle = 'rgba(236,230,210,0.45)'; ctx.beginPath(); ctx.arc(x - gapP / 2, y, 2 * s, 0, TAU); ctx.fill(); }
    if (p.hold) { ctx.font = `600 ${9.5 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(236,230,210,0.75)'; ctx.fillText(p.hold.toUpperCase(), x, y); x += ctx.measureText(p.hold.toUpperCase()).width + 6 * s; }
    if (p.key) { x += keyCap(ctx, x, y - 15 * s, p.key, s) + gapK; }
    ctx.font = `500 ${fs}px "EB Garamond", Georgia, serif`; ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 1;
    ctx.fillStyle = col; ctx.fillText(p.label, x, y + 1 * s); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    x += ctx.measureText(p.label).width + gapP;
  });
  ctx.restore();
}
// the same, as HTML (for the rooms drawn in HTML, such as the cabin)
export function promptHtml(text) {
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return parsePrompt(text).map((p) => `<span class="pr-part">${p.hold ? `<i class="pr-hold">${esc(p.hold)}</i>` : ''}${p.key ? `<kbd class="keycap${p.key.length > 1 ? ' wide' : ''}">${esc(p.key)}</kbd>` : ''}<span class="pr-label">${esc(p.label)}</span></span>`).join('<i class="pr-sep"></i>');
}
