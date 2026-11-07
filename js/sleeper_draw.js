// The Abyssal Sleeper Shark (Somniosus abyssalis): the apex predator below 3,000 m. A sleeper
// shark grown huge and old: heavy and slow, a sagging belly, a blunt rounded snout; a hide of mottled
// brown-grey lumps, cookiecutter craters and raked old scars; torn fins; a small milky eye with a
// pale parasitic copepod trailing from it (as on real Greenland sharks); a down-turned mouth with a
// saw of interlocking blade teeth below, that drops open when it lunges.
//
// Species frame (as every renderer in creatures_draw.js): centred, the snout toward -x at -L/2.
// The hide is painted once into a sprite; the tail beats by drawing the back half in sheared strips,
// and the lower jaw is its own small sprite, swung open about its hinge.
import { TAU, clamp } from './util.js';

const SPAN = 1.125;                 // the whole animal, snout to tail tip, in "body lengths" below
const SU0 = -0.01, SU1 = 1.135, SV0 = -0.165, SV1 = 0.19; // the sprite's extent
const HINGE = [0.2, 0.078];
const S_PX = 760;                   // sprite pixels per body length

function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
function smooth(pts, closed = true) {
  const p = new Path2D(), n = pts.length;
  if (closed) { const m = mid(pts[n - 1], pts[0]); p.moveTo(m[0], m[1]); for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], mm = mid(a, b); p.quadraticCurveTo(a[0], a[1], mm[0], mm[1]); } p.closePath(); }
  else { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const mm = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], mm[0], mm[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); }
  return p;
}
function ragged(pts, amp, r) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; out.push(a);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, k = 2 + Math.floor(r() * 3);
    for (let j = 1; j <= k; j++) { const f = j / (k + 1), d = (r() - 0.35) * amp * (r() < 0.25 ? 3 : 1); out.push([a[0] + dx * f + nx * d, a[1] + dy * f + ny * d]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function hide(ctx, clip, box, n, r) {
  const [x0, y0, x1, y1] = box, W = x1 - x0, H = y1 - y0, S = Math.max(W, H);
  ctx.save(); ctx.clip(clip);
  for (let i = 0; i < n.blotch; i++) {
    const x = x0 + r() * W, y = y0 + r() * H, rad = S * (0.004 + r() * r() * 0.03), dark = r() < 0.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, dark ? 'rgba(14,12,10,1)' : 'rgba(150,140,120,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (dark ? 0.35 : 0.2) * (0.5 + r() * 0.5); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rad * (1 + r() * 0.8), rad, r() * 3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(10,8,6,0.35)';
  for (let i = 0; i < n.speck; i++) { ctx.beginPath(); ctx.arc(x0 + r() * W, y0 + r() * H, S * (0.0006 + r() * 0.0014), 0, TAU); ctx.fill(); }
  for (let i = 0; i < n.lumps; i++) {
    const x = x0 + r() * W, y = y0 + r() * H, rad = S * (0.0015 + r() * r() * 0.005);
    const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.45, 0, x + rad * 0.15, y + rad * 0.2, rad);
    g.addColorStop(0, 'rgba(200,190,170,0.22)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function scar(ctx, a, b, w, r, col) {
  const pts = [a]; for (let i = 1; i < 5; i++) { const f = i / 5; pts.push([a[0] + (b[0] - a[0]) * f + (r() - 0.5) * w * 6, a[1] + (b[1] - a[1]) * f + (r() - 0.5) * w * 6]); } pts.push(b);
  const p = smooth(pts, false); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(20,16,14,0.35)'; ctx.lineWidth = w * 2.2; ctx.stroke(p);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(p);
}
function crater(ctx, x, y, rad) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, 'rgba(70,50,46,0.55)'); g.addColorStop(0.65, 'rgba(120,96,88,0.35)'); g.addColorStop(0.8, 'rgba(225,215,200,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rad * 1.2, rad, 0.3, 0, TAU); ctx.fill();
}
// teeth: 'cone' (hooked points) or 'blade' (the saw), along an edge, pointing along dir
function teeth(ctx, edge, dir, n, len, kind, r) {
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n * (edge.length - 1), k = Math.min(edge.length - 2, Math.floor(s)), f = s - k, a = edge[k], b = edge[k + 1];
    const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f, tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / tl, uy = (b[1] - a[1]) / tl;
    if (r() < 0.08) continue; // a gap where one has broken off
    const h = len * (0.65 + 0.35 * Math.sin(Math.PI * (i + 0.5) / n)) * (0.8 + r() * 0.4), w = (kind === 'blade' ? 0.75 : 0.32) * h;
    const lean = (r() - 0.5) * 0.5 + (kind === 'blade' ? 0.45 : 0), tx = px + (dir[0] + ux * lean) * h, ty = py + (dir[1] + uy * lean) * h;
    const g = ctx.createLinearGradient(px, py, tx, ty); g.addColorStop(0, '#8f7f68'); g.addColorStop(0.35, '#e9e2cc'); g.addColorStop(1, '#fffaf0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - ux * w, py - uy * w);
    ctx.quadraticCurveTo(px + dir[0] * h * 0.55 - ux * w * 0.6, py + dir[1] * h * 0.55 - uy * w * 0.6, tx, ty);
    ctx.quadraticCurveTo(px + dir[0] * h * 0.5 + ux * w * 0.3, py + dir[1] * h * 0.5 + uy * w * 0.3, px + ux * w, py + uy * w); ctx.fill();
  }
}

// ---- the shape (snout at u = 0, body lengths) ----
const TOP = [[-0.004, 0.014], [0.0, -0.008], [0.014, -0.03], [0.045, -0.052], [0.09, -0.074], [0.17, -0.108], [0.26, -0.117], [0.36, -0.122], [0.46, -0.12], [0.56, -0.108], [0.66, -0.09], [0.76, -0.068], [0.85, -0.048], [0.91, -0.036]];
const TAIL = [[0.97, -0.055], [1.04, -0.1], [1.11, -0.14], [1.125, -0.136], [1.09, -0.085], [1.04, -0.028], [1.015, 0.0], [1.03, 0.022], [1.045, 0.045], [1.03, 0.05], [0.99, 0.04], [0.93, 0.032]];
const BELLY = [[0.85, 0.046], [0.75, 0.072], [0.64, 0.104], [0.54, 0.126], [0.44, 0.13], [0.35, 0.118], [0.27, 0.097], [0.21, 0.08]];
const LIP = [[0.2, 0.078], [0.175, 0.07], [0.145, 0.062], [0.115, 0.055], [0.085, 0.048], [0.058, 0.04], [0.035, 0.032]];
const SNOUT_UNDER = [[0.015, 0.027], [0.0, 0.022]];
const JAW_LIP = [[0.2, 0.08], [0.175, 0.072], [0.145, 0.064], [0.115, 0.057], [0.085, 0.05], [0.058, 0.043], [0.042, 0.04]];
const CHIN = [[0.044, 0.05], [0.062, 0.064], [0.09, 0.077], [0.125, 0.088], [0.165, 0.096], [0.205, 0.096], [0.235, 0.09]];
const EYE = [0.072, -0.034];

function paintBody(ctx, L) {
  const r = rng(11), P = (u, v) => [u * L, v * L];
  const pecFar = smooth(ragged([[0.3, 0.09], [0.36, 0.15], [0.39, 0.17], [0.385, 0.14], [0.36, 0.1]].map(([u, v]) => P(u, v)), L * 0.004, r));
  ctx.fillStyle = '#25231f'; ctx.fill(pecFar);
  const body = smooth([...TOP, ...TAIL, ...BELLY, ...LIP, ...SNOUT_UNDER].map(([u, v]) => P(u, v)));
  const bg = ctx.createLinearGradient(0, -0.125 * L, 0, 0.13 * L);
  bg.addColorStop(0, '#2c2a26'); bg.addColorStop(0.35, '#45413a'); bg.addColorStop(0.7, '#5d574d'); bg.addColorStop(1, '#7a7264');
  ctx.fillStyle = bg; ctx.fill(body);
  const box = [0, -0.14 * L, 1.13 * L, 0.14 * L];
  hide(ctx, body, box, { blotch: 420, speck: 2400, lumps: 700 }, r);
  ctx.save(); ctx.clip(body);
  for (let k = 0; k < 4; k++) { const u = 0.12 + r() * 0.6, v = -0.09 + r() * 0.15, du = 0.05 + r() * 0.08, dv = (r() - 0.5) * 0.06; for (let j = 0; j < 3; j++) scar(ctx, P(u + j * 0.006, v + j * 0.012), P(u + du * (0.7 + r() * 0.5) + j * 0.006, v + dv + j * 0.012), L * 0.0013, r, 'rgba(190,180,160,0.32)'); }
  ctx.globalAlpha = 0.6; for (let k = 0; k < 8; k++) crater(ctx, ...P(0.15 + r() * 0.7, -0.08 + r() * 0.17), L * (0.003 + r() * 0.003)); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(8,6,5,0.6)';
  for (let k = 0; k < 90; k++) { const u = r() * 0.12, v = -0.06 + r() * 0.1; if (u > 0.04 + v * 0.3 + 0.06) continue; const p = P(u, v); ctx.beginPath(); ctx.arc(p[0], p[1], L * (0.0008 + r() * 0.0009), 0, TAU); ctx.fill(); } // electroreceptor pores
  ctx.strokeStyle = 'rgba(15,12,10,0.4)'; ctx.lineWidth = L * 0.0018;
  for (let k = 0; k < 6; k++) { const u = 0.3 + k * 0.07; ctx.beginPath(); const a = P(u, 0.06 + k * 0.004), b = P(u + 0.05, 0.11 + k * 0.002); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + L * 0.03, b[1], b[0], b[1]); ctx.stroke(); } // sagging belly folds
  const rg = ctx.createLinearGradient(0, -0.125 * L, 0, 0.13 * L);
  rg.addColorStop(0, 'rgba(210,215,205,0.22)'); rg.addColorStop(0.12, 'rgba(210,215,205,0)'); rg.addColorStop(0.75, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = rg; ctx.fillRect(box[0], box[1], box[2], box[3] - box[1]);
  ctx.strokeStyle = 'rgba(8,5,4,0.6)'; ctx.lineWidth = L * 0.0022;
  for (let k = 0; k < 5; k++) { const a = P(0.225 + k * 0.012, 0.006), b = P(0.23 + k * 0.012, 0.055); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + L * 0.006, (a[1] + b[1]) / 2, b[0], b[1]); ctx.stroke(); } // gill slits
  ctx.restore();
  for (const f of [[[0.49, -0.119], [0.51, -0.142], [0.535, -0.14], [0.55, -0.112]], [[0.72, -0.076], [0.745, -0.107], [0.77, -0.1], [0.78, -0.064]], [[0.68, 0.094], [0.715, 0.135], [0.745, 0.13], [0.745, 0.085]], [[0.27, 0.088], [0.32, 0.15], [0.352, 0.178], [0.36, 0.152], [0.345, 0.104]]]) {
    const pts = ragged(f.map(([u, v]) => P(u, v)), L * 0.004, r), p = smooth(pts);
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]); g.addColorStop(0, '#3e3a33'); g.addColorStop(1, '#26231f');
    ctx.fillStyle = g; ctx.fill(p); ctx.strokeStyle = 'rgba(10,8,6,0.5)'; ctx.lineWidth = L * 0.0012; ctx.stroke(p);
  }
  teeth(ctx, LIP.slice(0, -1).map(([u, v]) => P(u, v)), [0, 1], 34, L * 0.007, 'cone', r);
  // the eye: small and milky, under a heavy lid
  const e = P(...EYE), rad = L * 0.0085;
  const so = ctx.createRadialGradient(e[0], e[1] + rad * 0.2, rad * 0.5, e[0], e[1], rad * 1.9); so.addColorStop(0, 'rgba(10,8,8,0.9)'); so.addColorStop(1, 'rgba(10,8,8,0)');
  ctx.fillStyle = so; ctx.beginPath(); ctx.ellipse(e[0], e[1], rad * 1.9, rad * 1.5, 0, 0, TAU); ctx.fill();
  const eg = ctx.createRadialGradient(e[0] - rad * 0.2, e[1] - rad * 0.2, rad * 0.05, e[0], e[1], rad);
  eg.addColorStop(0, '#dfe6e2'); eg.addColorStop(0.45, '#b4c0bc'); eg.addColorStop(0.85, '#7d8a87'); eg.addColorStop(1, '#3e4644');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(e[0], e[1], rad, rad * 0.82, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(40,50,50,0.28)'; ctx.beginPath(); ctx.ellipse(e[0] + rad * 0.05, e[1], rad * 0.22, rad * 0.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(e[0] - rad * 0.38, e[1] - rad * 0.32, rad * 0.16, rad * 0.1, -0.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(15,12,10,0.7)'; ctx.lineWidth = rad * 0.28; ctx.beginPath(); ctx.ellipse(e[0], e[1] + rad * 0.1, rad * 1.05, rad * 0.95, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  // wet sheen on the snout and brow
  ctx.strokeStyle = 'rgba(235,240,235,0.35)'; ctx.lineWidth = L * 0.003; ctx.lineCap = 'round';
  ctx.stroke(smooth([P(0.008, -0.012), P(0.025, -0.044), P(0.06, -0.068), P(0.11, -0.085)], false));
}
function paintJaw(ctx, L) {
  const r = rng(29), P = (u, v) => [u * L, v * L];
  const pts = [...JAW_LIP, ...CHIN].map(([u, v]) => P(u, v)), jaw = smooth(pts);
  const jg = ctx.createLinearGradient(...P(0.12, 0.06), ...P(0.12, 0.092)); jg.addColorStop(0, '#433f38'); jg.addColorStop(1, '#6e665a');
  ctx.fillStyle = jg; ctx.fill(jaw);
  hide(ctx, jaw, [0, 0.03 * L, 0.25 * L, 0.11 * L], { blotch: 60, speck: 300, lumps: 60 }, r);
  ctx.strokeStyle = 'rgba(8,6,5,0.85)'; ctx.lineWidth = L * 0.0022; ctx.stroke(smooth(JAW_LIP.map(([u, v]) => P(u, v)), false));
  teeth(ctx, JAW_LIP.map(([u, v]) => P(u, v)), [0, -1], 22, L * 0.0085, 'blade', r);
}

let SPR = null;
function sprites() {
  if (SPR) return SPR;
  const L = S_PX;
  const b = document.createElement('canvas'); b.width = Math.ceil((SU1 - SU0) * L); b.height = Math.ceil((SV1 - SV0) * L);
  const bx = b.getContext('2d'); bx.translate(-SU0 * L, -SV0 * L); paintBody(bx, L);
  // the jaw sprite, drawn about the hinge
  const j = document.createElement('canvas'); j.width = Math.ceil(0.26 * L); j.height = Math.ceil(0.12 * L);
  const jx = j.getContext('2d'); jx.translate(-0.0 * L, -0.02 * L); paintJaw(jx, L);
  SPR = { b, j, L };
  return SPR;
}

// state set by the renderer for the animal about to be drawn: how far its jaw is open (0..1)
export const sleeperState = { jaw: 0 };

export function drawSleeper(ctx, L, v, t, swim = 1) {
  const S = sprites(), Lb = L / SPAN, k = Lb / S.L;
  const jaw = clamp(sleeperState.jaw || 0, 0, 1);
  ctx.save(); ctx.translate(-L / 2, 0); // the snout at -L/2, as every species is drawn
  // the slow beat of the back half: the head and trunk hold still
  const ph = t * 1.3 * swim;
  const bend = (u) => u < 0.55 ? 0 : Math.sin(ph - u * 3) * Math.pow((u - 0.55) / 0.57, 1.6) * 0.05 * Lb;
  // the jaw first, so the head covers its hinge
  const H = [HINGE[0] * Lb, HINGE[1] * Lb];
  // (nothing is drawn between the jaws when it gapes: the water shows through)
  ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate(-jaw * 0.9); ctx.translate(-H[0], -H[1]);
  ctx.drawImage(S.j, 0, 0.02 * Lb, S.j.width * k, S.j.height * k);
  ctx.restore();
  // the body: the front in one piece, the back in sheared strips
  const bw = S.b.width, bh = S.b.height, y0 = SV0 * Lb;
  const cut = 0.55;
  ctx.drawImage(S.b, 0, 0, (cut - SU0) * S.L + 1, bh, SU0 * Lb, y0, (cut - SU0) * Lb + k, bh * k);
  for (let u = cut; u < SU1; u += 0.035) {
    const u1 = Math.min(SU1, u + 0.035), d0 = bend(u), d1 = bend(u1);
    ctx.save(); ctx.translate(u * Lb, d0); ctx.transform(1, (d1 - d0) / ((u1 - u) * Lb), 0, 1, 0, 0);
    ctx.drawImage(S.b, (u - SU0) * S.L, 0, (u1 - u) * S.L + 1.5, bh, 0, y0, (u1 - u) * Lb + 1.5 * k, bh * k);
    ctx.restore();
  }
  // the parasite trailing from its eye, swaying
  const e = [EYE[0] * Lb, EYE[1] * Lb];
  ctx.strokeStyle = 'rgba(225,220,200,0.85)'; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const sx = e[0] + Lb * (0.002 + i * 0.003), sy = e[1] + Lb * 0.006, sway = Math.sin(t * 1.3 + i) * Lb * 0.004;
    ctx.lineWidth = Math.max(0.6, Lb * 0.0018); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx + Lb * 0.004, sy + Lb * 0.012, sx + sway - Lb * 0.004, sy + Lb * 0.022, sx + sway + Lb * 0.002, sy + Lb * 0.034); ctx.stroke();
    ctx.fillStyle = 'rgba(235,228,205,0.9)'; ctx.beginPath(); ctx.ellipse(sx + sway + Lb * 0.002, sy + Lb * 0.037, Math.max(0.5, Lb * 0.0016), Math.max(0.8, Lb * 0.0045), 0.1, 0, TAU); ctx.fill();
  }
  ctx.restore();
  return null;
}
