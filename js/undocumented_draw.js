// The undocumented animals: species the game invents for its deepest and strangest places, each with
// one feature found nowhere else, built on the real anatomy of its family (fin placement, gill covers,
// lateral lines, photophores, mouths). Same conventions as creatures_draw.js: local frame, head toward
// -x, body length L px, t the clock, swim 0..1 how hard it is swimming. Drawn once into cached sprites,
// so the detail costs nothing per frame. Each returns its living lights ([x, y, size] local) or null.
import { TAU, shade } from './util.js';

// ---------------- the anatomy kit ----------------
function eye(ctx, x, y, r, iris = '#c8c2a8', glint = true, ring = '#0a0a0a') {
  ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, shade(iris, 0.25)); g.addColorStop(1, shade(iris, -0.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#040404'; ctx.beginPath(); ctx.arc(x + r * 0.06, y + r * 0.03, r * 0.6, 0, TAU); ctx.fill();
  if (glint) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.3, r * 0.2, 0, TAU); ctx.fill(); }
}
// a smooth closed path through points (quadratic curves through the midpoints)
function smooth(pts, close = true) {
  const p = new Path2D(), n = pts.length;
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (!close) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const q = m(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } p.lineTo(pts[n - 1][0], pts[n - 1][1]); return p; }
  const s = m(pts[n - 1], pts[0]); p.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], q = m(a, b); p.quadraticCurveTo(a[0], a[1], q[0], q[1]); }
  p.closePath(); return p;
}
// a fish body from its centreline: back profile d(u) and belly profile b(u) (fractions of L, measured
// from the centreline), bent by the swimming wave. Gives the outline and points along back, belly and
// middle, with u from the snout (0) to the base of the tail (1).
function fishBody(L, d, b, t, swim, amp = 0.05, n = 28, len = 1) {
  const top = [], bot = [], mid = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -L / 2 + u * L * len, y = Math.sin(t * 3 - u * 4.5) * L * amp * u * u * (0.35 + swim);
    mid.push([x, y]); top.push([x, y - d(u) * L]); bot.push([x, y + b(u) * L]);
  }
  const p = smooth(top.concat(bot.slice().reverse()));
  const at = (arr, u) => { const f = u * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return [arr[i][0] + (arr[i + 1][0] - arr[i][0]) * k, arr[i][1] + (arr[i + 1][1] - arr[i][1]) * k]; };
  return { p, top, bot, mid, n, T: (u) => at(top, u), Bt: (u) => at(bot, u), M: (u) => at(mid, u) };
}
// a fin: a membrane from a base line out to an edge, with rays running through it
function fin(ctx, base, edge, col, rayCol, rays = 6) {
  const pts = base.concat(edge.slice().reverse());
  ctx.fillStyle = col; ctx.fill(smooth(pts));
  if (!rayCol || rays < 1) return;
  ctx.strokeStyle = rayCol; ctx.lineWidth = Math.max(0.4, Math.hypot(edge[0][0] - base[0][0], edge[0][1] - base[0][1]) * 0.03);
  const lerp2 = (A, f) => { const g = f * (A.length - 1), i = Math.min(A.length - 2, Math.floor(g)), k = g - i; return [A[i][0] + (A[i + 1][0] - A[i][0]) * k, A[i][1] + (A[i + 1][1] - A[i][1]) * k]; };
  for (let r = 0; r <= rays; r++) { const f = r / rays, a = lerp2(base, f), e = lerp2(edge, f); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0] * 0.96 + a[0] * 0.04, e[1] * 0.96 + a[1] * 0.04); ctx.stroke(); }
}
// the gill cover: a curved edge behind the head, a little lighter on its leading side
function gillCover(ctx, x, y, h, col = 'rgba(0,0,0,0.35)', hi = 'rgba(255,255,255,0.12)') {
  ctx.lineWidth = Math.max(0.6, h * 0.06);
  ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x - h * 0.1, y - h * 0.5); ctx.quadraticCurveTo(x + h * 0.25, y, x - h * 0.05, y + h * 0.55); ctx.stroke();
  ctx.strokeStyle = hi; ctx.beginPath(); ctx.moveTo(x - h * 0.2, y - h * 0.45); ctx.quadraticCurveTo(x + h * 0.12, y, x - h * 0.15, y + h * 0.5); ctx.stroke();
}
// a line of points along the body: lateral line or photophore row
function along(B, u0, u1, off, k = 12) { const out = []; for (let i = 0; i <= k; i++) { const u = u0 + (u1 - u0) * i / k, m = B.M(u), tp = B.T(u), bt = B.Bt(u); out.push([m[0], off < 0 ? m[1] + (tp[1] - m[1]) * -off : m[1] + (bt[1] - m[1]) * off]); } return out; }
function stroke(ctx, pts, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(smooth(pts, false)); }
// overlapping scale rows, faint, clipped to the body
function scales(ctx, B, r, col) {
  ctx.save(); ctx.clip(B.p); ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.4, r * 0.12);
  for (let row = -3; row <= 3; row++) for (let u = 0.18; u < 0.95; u += r / (B.top[B.n][0] - B.top[0][0]) * 1.6) {
    const m = B.M(u), tp = B.T(u), bt = B.Bt(u), h = (bt[1] - tp[1]) / 2, y = m[1] + row * r * 1.1 + ((Math.round(u * 50) % 2) ? r * 0.55 : 0);
    if (Math.abs(y - m[1]) > h * 0.95) continue;
    ctx.beginPath(); ctx.arc(m[0], y, r, -1.1, 1.1); ctx.stroke();
  }
  ctx.restore();
}
// countershading: dark back, lighter flank, pale belly, over the body's own colour
function shadeBody(ctx, B, back, flank, belly) {
  const t0 = B.T(0.35), b0 = B.Bt(0.35);
  const g = ctx.createLinearGradient(0, t0[1], 0, b0[1]);
  g.addColorStop(0, back); g.addColorStop(0.45, flank); g.addColorStop(1, belly);
  ctx.fillStyle = g; ctx.fill(B.p);
}
function rim(ctx, B, col = 'rgba(0,0,0,0.45)', w = 1) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(B.p); }
const lights = (ctx, pts, r, col, every = 2) => { const P = []; pts.forEach(([x, y], i) => { ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); if (i % every === 0) P.push([x, y, 0.35]); }); return P; };

// ---------------- the species ----------------

// Silvered mirrorfish (Specularia argentea): built like an opah or a moonfish: a tall, thin oval with
// a forked tail, a long sickle pectoral, a high dorsal. Scaleless mirror skin: what shows on it is the
// water above and below and a bright band of reflected light that slides as it turns.
export function drawMirrorfish(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => 0.03 + Math.sin(Math.min(1, u / 0.85) * Math.PI) * 0.29 * (1 - u * 0.25) + (u > 0.85 ? -0.02 : 0),
    (u) => 0.03 + Math.sin(Math.min(1, u / 0.85) * Math.PI) * 0.26 * (1 - u * 0.2), t, swim, 0.03, 30, 0.86);
  const tail = B.M(1), tw = Math.sin(t * 4) * L * 0.02;
  fin(ctx, [B.T(0.97), tail, B.Bt(0.97)], [[tail[0] + L * 0.17, tail[1] - L * 0.17 + tw], [tail[0] + L * 0.08, tail[1] + tw * 0.5], [tail[0] + L * 0.17, tail[1] + L * 0.17 + tw]], '#7a8c98', 'rgba(220,230,240,0.35)', 8);
  fin(ctx, [B.T(0.3), B.T(0.5), B.T(0.75)], [[B.T(0.32)[0] + L * 0.05, B.T(0.32)[1] - L * 0.2], [B.T(0.48)[0] + L * 0.06, B.T(0.48)[1] - L * 0.1], B.T(0.78)], 'rgba(150,170,185,0.55)', 'rgba(230,240,248,0.35)', 9);
  fin(ctx, [B.Bt(0.45), B.Bt(0.75)], [[B.Bt(0.47)[0] + L * 0.04, B.Bt(0.47)[1] + L * 0.09], B.Bt(0.78)], 'rgba(150,170,185,0.5)', 'rgba(230,240,248,0.3)', 6);
  const g = ctx.createLinearGradient(0, B.T(0.45)[1], 0, B.Bt(0.45)[1]);
  g.addColorStop(0, '#16242e'); g.addColorStop(0.3, '#5e7888'); g.addColorStop(0.48, '#dce8f0'); g.addColorStop(0.62, '#8aa2b2'); g.addColorStop(1, '#2a3a46');
  ctx.fillStyle = g; ctx.fill(B.p);
  ctx.save(); ctx.clip(B.p);
  const s = Math.sin(t * 0.8) * L * 0.22, rg = ctx.createLinearGradient(s - L * 0.12, 0, s + L * 0.12, 0);
  rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; ctx.fillRect(-L, -L, L * 2, L * 2);
  ctx.fillStyle = 'rgba(255,248,225,0.9)'; ctx.beginPath(); ctx.ellipse(-s * 0.5, B.M(0.4)[1] - L * 0.05, L * 0.022, L * 0.032, 0.4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(8,16,24,0.9)'; ctx.beginPath(); ctx.moveTo(-L, -L); for (let u = 0; u <= 1; u += 0.05) { const p = B.T(u); ctx.lineTo(p[0], p[1] + L * 0.035); } ctx.lineTo(L, -L); ctx.fill();
  ctx.restore();
  gillCover(ctx, B.M(0.24)[0], B.M(0.24)[1] - L * 0.02, L * 0.24, 'rgba(10,20,28,0.45)', 'rgba(255,255,255,0.25)');
  stroke(ctx, along(B, 0.24, 0.95, -0.45), 'rgba(20,32,40,0.35)', Math.max(0.5, L * 0.004));
  // the long sickle pectoral
  const pb = B.M(0.27);
  fin(ctx, [[pb[0], pb[1] - L * 0.02], [pb[0], pb[1] + L * 0.02]], [[pb[0] + L * 0.05, pb[1] - L * 0.04], [pb[0] + L * 0.2, pb[1] + L * 0.02 + Math.sin(t * 2) * L * 0.01]], 'rgba(180,200,215,0.5)', 'rgba(240,248,252,0.35)', 5);
  ctx.fillStyle = '#1a242c'; ctx.beginPath(); ctx.moveTo(B.T(0)[0] - L * 0.005, B.M(0.02)[1]); ctx.quadraticCurveTo(B.M(0.06)[0], B.M(0.06)[1] + L * 0.02, B.M(0.09)[0], B.M(0.09)[1] + L * 0.005); ctx.lineWidth = Math.max(0.6, L * 0.006); ctx.strokeStyle = '#1a242c'; ctx.stroke();
  eye(ctx, B.M(0.14)[0], B.M(0.14)[1] - L * 0.04, Math.max(1, L * 0.05), '#c8d8e0');
  return null;
}

// Banded glow eel (Nyctophis fasciatus): a true eel: a tapered snout with a small mouth and nostril,
// a gill slit, a small pectoral fin, and one continuous fin from behind the head round the tail.
// A band of blue-green light travels slowly along it from head to tail, and starts again.
export function drawGlowEel(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.05 ? 0.008 + u * 0.4 : 0.028 * (1 - u * 0.7) + 0.002), (u) => (u < 0.05 ? 0.006 + u * 0.36 : 0.026 * (1 - u * 0.7) + 0.002), t, swim, 0.1, 40);
  // the continuous fin
  const fu = [], fd = [];
  for (let u = 0.2; u <= 1.0001; u += 0.04) { const k = Math.min(1, (1 - u) / 0.08); const tp = B.T(Math.min(u, 0.999)), bt = B.Bt(Math.min(u, 0.999)); fu.push([tp[0], tp[1] - L * 0.01 * k]); if (u > 0.4) fd.push([bt[0], bt[1] + L * 0.008 * k]); }
  ctx.fillStyle = 'rgba(70,52,40,0.75)'; ctx.fill(smooth(fu.concat(fd.slice().reverse()).concat([B.M(0.4)])));
  shadeBody(ctx, B, '#120c08', '#2e2218', '#4a3a2c');
  rim(ctx, B, 'rgba(0,0,0,0.5)', Math.max(0.5, L * 0.002));
  // gill slit, pectoral
  const gs = B.M(0.1);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(0.5, L * 0.003); ctx.beginPath(); ctx.moveTo(gs[0], gs[1] - L * 0.008); ctx.lineTo(gs[0] + L * 0.004, gs[1] + L * 0.01); ctx.stroke();
  fin(ctx, [[gs[0] + L * 0.006, gs[1]], [gs[0] + L * 0.006, gs[1] + L * 0.012]], [[gs[0] + L * 0.03, gs[1] - L * 0.004], [gs[0] + L * 0.03, gs[1] + L * 0.014]], 'rgba(80,60,46,0.8)', null);
  // the mouth and nostril
  const sn = B.M(0);
  ctx.strokeStyle = '#0a0604'; ctx.lineWidth = Math.max(0.5, L * 0.0025); ctx.beginPath(); ctx.moveTo(sn[0], sn[1] + L * 0.002); ctx.lineTo(sn[0] + L * 0.03, sn[1] + L * 0.006); ctx.stroke();
  ctx.fillStyle = '#0a0604'; ctx.beginPath(); ctx.arc(sn[0] + L * 0.006, sn[1] - L * 0.004, L * 0.0025, 0, TAU); ctx.fill();
  // the travelling band of light
  const k = (t * 0.12) % 1, P = [];
  ctx.save(); ctx.clip(B.p);
  for (let i = 0; i <= 40; i++) { const u = i / 40, d = Math.abs(u - k), a = Math.max(0, 1 - d / 0.06); if (a <= 0) continue; const m = B.M(u);
    const lg = ctx.createRadialGradient(m[0], m[1], 0, m[0], m[1], L * 0.035); lg.addColorStop(0, `rgba(150,255,225,${(0.8 * a).toFixed(3)})`); lg.addColorStop(1, 'rgba(60,200,170,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(m[0], m[1], L * 0.035, 0, TAU); ctx.fill(); if (a > 0.7 && i % 2 === 0) P.push([m[0], m[1], 0.5 * a]); }
  ctx.restore();
  eye(ctx, sn[0] + L * 0.022, sn[1] - L * 0.006, Math.max(1, L * 0.006), '#6a5a40');
  return P;
}

// Canyon ember-lure angler (Pyrolophus canyonensis): a female deep-sea angler like Melanocetus: a
// globe of a body, an enormous upturned mouth with fangs in both jaws, small fins set far back, the
// fishing rod on its head. Its skin has ember-coloured pores round the mouth, and its lure burns orange.
export function drawEmberAngler(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.65 ? 0.08 + Math.sin(Math.min(1, u / 0.6) * Math.PI * 0.5) * 0.25 - Math.max(0, u - 0.4) * 0.5 : 0.07 * (1 - (u - 0.65) / 0.35) + 0.04),
    (u) => (u < 0.65 ? 0.12 + Math.sin(Math.min(1, u / 0.6) * Math.PI * 0.5) * 0.2 - Math.max(0, u - 0.45) * 0.55 : 0.06 * (1 - (u - 0.65) / 0.35) + 0.035), t, swim * 0.4, 0.02, 28, 0.8);
  const tail = B.M(1), tw = Math.sin(t * 3) * L * 0.02;
  fin(ctx, [B.T(0.97), tail, B.Bt(0.97)], [[tail[0] + L * 0.18, tail[1] - L * 0.1 + tw], [tail[0] + L * 0.2, tail[1] + tw], [tail[0] + L * 0.18, tail[1] + L * 0.1 + tw]], '#1c120e', 'rgba(90,60,46,0.5)', 7);
  fin(ctx, [B.T(0.72), B.T(0.86)], [[B.T(0.75)[0] + L * 0.03, B.T(0.75)[1] - L * 0.06], B.T(0.9)], '#1c120e', 'rgba(90,60,46,0.5)', 4);
  fin(ctx, [B.Bt(0.74), B.Bt(0.86)], [[B.Bt(0.77)[0] + L * 0.03, B.Bt(0.77)[1] + L * 0.05], B.Bt(0.9)], '#1c120e', 'rgba(90,60,46,0.5)', 3);
  const g = ctx.createRadialGradient(B.M(0.35)[0], B.M(0.3)[1] - L * 0.1, 0, B.M(0.4)[0], B.M(0.4)[1], L * 0.45);
  g.addColorStop(0, '#4a2c1e'); g.addColorStop(0.55, '#24150e'); g.addColorStop(1, '#0e0806');
  ctx.fillStyle = g; ctx.fill(B.p);
  ctx.save(); ctx.clip(B.p);
  // rough velvet skin, and ember pores near the mouth
  for (let k = 0; k < 70; k++) { const a = k * 2.399, r = Math.sqrt(k / 70) * L * 0.36, x = B.M(0.4)[0] + Math.cos(a) * r, y = B.M(0.4)[1] + Math.sin(a) * r * 0.8;
    const nearMouth = x < B.M(0.25)[0];
    ctx.fillStyle = nearMouth && k % 3 === 0 ? `rgba(255,${130 + (k % 4) * 25},50,${(0.3 + 0.2 * Math.sin(t * 2 + k)).toFixed(3)})` : 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(x, y, L * (nearMouth ? 0.006 : 0.004), 0, TAU); ctx.fill(); }
  ctx.restore();
  // the mouth: a deep upturned gape, fangs above and below
  const m0 = B.T(0.02), m1 = B.M(0.42);
  ctx.fillStyle = '#030201'; ctx.beginPath(); ctx.moveTo(m0[0], m0[1] + L * 0.03); ctx.quadraticCurveTo(m0[0] + L * 0.12, m1[1] + L * 0.02, m1[0], m1[1] + L * 0.04); ctx.quadraticCurveTo(m0[0] + L * 0.12, m1[1] + L * 0.18, B.Bt(0.04)[0], B.Bt(0.04)[1] - L * 0.02); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 8; k++) { const f = k / 7, x = m0[0] + L * 0.02 + f * (m1[0] - m0[0] - L * 0.06), yt = m0[1] + L * 0.04 + f * L * 0.07, len = L * (0.05 - f * 0.025);
    ctx.fillStyle = '#ece4d2'; ctx.beginPath(); ctx.moveTo(x - L * 0.007, yt); ctx.quadraticCurveTo(x + L * 0.004, yt + len * 0.6, x + L * 0.002, yt + len); ctx.lineTo(x + L * 0.008, yt); ctx.fill();
    const yb = B.Bt(0.06)[1] - L * 0.04 - f * L * 0.05; ctx.beginPath(); ctx.moveTo(x - L * 0.004, yb); ctx.quadraticCurveTo(x + L * 0.006, yb - len * 0.7, x + L * 0.005, yb - len * 0.9); ctx.lineTo(x + L * 0.011, yb); ctx.fill(); }
  gillCover(ctx, B.M(0.5)[0], B.M(0.5)[1] + L * 0.04, L * 0.12, 'rgba(0,0,0,0.5)', 'rgba(120,80,60,0.15)');
  // the pectoral fin
  const pb = B.M(0.55); fin(ctx, [[pb[0], pb[1] + L * 0.03], [pb[0], pb[1] + L * 0.07]], [[pb[0] + L * 0.06, pb[1] + L * 0.03], [pb[0] + L * 0.07, pb[1] + L * 0.09]], '#2a1a12', 'rgba(110,70,50,0.5)', 5);
  // the rod (illicium) and the burning lure (esca) with its filaments
  const base = B.T(0.2), lx = base[0] - L * 0.2 + Math.sin(t * 1.3) * L * 0.025, ly = base[1] - L * 0.22 + Math.cos(t * 1.1) * L * 0.015;
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = Math.max(0.8, L * 0.01); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.bezierCurveTo(base[0] - L * 0.02, base[1] - L * 0.2, lx + L * 0.1, ly - L * 0.08, lx, ly); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,160,80,0.6)'; ctx.lineWidth = Math.max(0.4, L * 0.003);
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx - L * 0.02, ly + L * 0.03, lx - L * (0.01 + k * 0.012), ly + L * (0.05 + k * 0.01) + Math.sin(t * 2 + k) * L * 0.006); ctx.stroke(); }
  ctx.lineCap = 'butt';
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, L * 0.045); lg.addColorStop(0, '#fff4d0'); lg.addColorStop(0.35, '#ffa040'); lg.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, L * 0.045, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.ellipse(lx + L * 0.005, ly - L * 0.006, L * 0.012, L * 0.008, 0.4, Math.PI, TAU); ctx.fill();
  eye(ctx, B.M(0.22)[0], B.T(0.22)[1] + L * 0.05, Math.max(1, L * 0.014), '#5a4a3a', false);
  return [[lx, ly, 1.2]];
}

// Glassbone hatchetfish (Hyalopelecus triplex): a hatchetfish (like Argyropelecus): a deep, keeled,
// sharply angled body, tubular upward eyes, paired photophores along the keel, and a stalked tail.
// Its body is as clear as glass: only the skeleton shows, faintly lit from within.
export function drawGlassHatchet(ctx, L, v, t, swim) {
  const H = L * 0.42, tw = Math.sin(t * 6) * L * 0.015;
  const outline = smooth([[-L * 0.47, -H * 0.1], [-L * 0.36, -H * 0.42], [-L * 0.05, -H * 0.5], [L * 0.2, -H * 0.3], [L * 0.32, -H * 0.1], [L * 0.32, H * 0.06], [L * 0.1, H * 0.2], [-L * 0.08, H * 0.62], [-L * 0.3, H * 0.55], [-L * 0.45, H * 0.15]]);
  fin(ctx, [[L * 0.3, -H * 0.08], [L * 0.32, H * 0.05]], [[L * 0.5, -H * 0.3 + tw], [L * 0.5, H * 0.28 + tw]], 'rgba(200,232,245,0.18)', 'rgba(200,240,255,0.35)', 6);
  fin(ctx, [[-L * 0.05, -H * 0.5], [L * 0.12, -H * 0.38]], [[L * 0.02, -H * 0.75], [L * 0.16, -H * 0.42]], 'rgba(200,232,245,0.16)', 'rgba(200,240,255,0.3)', 5);
  ctx.fillStyle = 'rgba(185,222,238,0.14)'; ctx.fill(outline);
  ctx.strokeStyle = 'rgba(205,238,252,0.45)'; ctx.lineWidth = Math.max(0.5, L * 0.008); ctx.stroke(outline);
  // the skeleton: skull, spine to the tail, ribs down to the keel, the keel's own bony plates
  ctx.strokeStyle = 'rgba(175,232,255,0.85)'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.6, L * 0.011);
  ctx.beginPath(); ctx.moveTo(-L * 0.28, -H * 0.24); ctx.bezierCurveTo(-L * 0.05, -H * 0.36, L * 0.2, -H * 0.18, L * 0.46, tw * 0.5); ctx.stroke();
  ctx.lineWidth = Math.max(0.4, L * 0.006);
  for (let k = 0; k < 8; k++) { const x = -L * 0.2 + k * L * 0.055, y0 = -H * (0.3 - k * 0.025); ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x - L * 0.03, y0 + H * 0.3, x - L * 0.04, y0 + H * (0.75 - k * 0.07)); ctx.stroke(); }
  for (let k = 0; k < 6; k++) { const x = -L * 0.3 + k * L * 0.05; ctx.beginPath(); ctx.moveTo(x, H * (0.5 + Math.sin(k) * 0.03)); ctx.lineTo(x + L * 0.03, H * 0.56); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(-L * 0.33, -H * 0.22, L * 0.08, H * 0.16, 0, 0, TAU); ctx.stroke(); // the skull
  ctx.beginPath(); ctx.moveTo(-L * 0.45, H * 0.05); ctx.lineTo(-L * 0.36, H * 0.12); ctx.lineTo(-L * 0.4, -H * 0.02); ctx.stroke(); // the jaw
  ctx.lineCap = 'butt';
  // the tubular eye, looking up
  ctx.fillStyle = 'rgba(190,232,248,0.5)'; ctx.fillRect(-L * 0.37, -H * 0.42, L * 0.06, H * 0.2);
  eye(ctx, -L * 0.34, -H * 0.42, Math.max(1, L * 0.035), '#bfe8f8');
  // the paired photophores along the keel, pointing down
  const ph = []; for (let k = 0; k < 10; k++) { const f = k / 9; ph.push([-L * 0.4 + f * L * 0.42, H * (0.18 + Math.sin(f * Math.PI) * 0.42)]); }
  return lights(ctx, ph, Math.max(0.6, L * 0.008), '#9fe8ff', 2);
}

// Nodule-armoured crab (Manganocarcinus nodosus): a deep-sea crab (like Chaceon or a spider crab
// that decorates itself) seen from the side: a broad carapace with a frontal rostrum and stalked eyes,
// a pair of heavy claws, four pairs of long jointed walking legs; manganese nodules cemented to its back.
export function drawNoduleCrab(ctx, L, v, t, swim) {
  const W = L, H = L * 0.36;
  ctx.lineCap = 'round';
  // far legs first, darker
  const leg = (s, k, far) => {
    const bx = s * W * (0.08 + k * 0.06), by = H * 0.12, ph = Math.sin(t * 3 + k * 1.4 + (s > 0 ? 1.5 : 0) + (far ? 0.7 : 0));
    const kx = bx + s * W * (0.16 + k * 0.02), ky = -H * (0.15 + 0.1 * Math.max(0, ph)), ex = kx + s * W * (0.1 + k * 0.01), ey = H * 0.25, fx = ex + s * W * 0.04, fy = H * 0.85;
    const col = far ? '#3a2c26' : '#6a4e42', hi = far ? '#4a3a32' : '#8a6a5a';
    for (const [a, b, w] of [[[bx, by], [kx, ky], 0.03], [[kx, ky], [ex, ey], 0.024], [[ex, ey], [fx, fy], 0.016]]) {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, L * w); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.strokeStyle = hi; ctx.lineWidth = Math.max(0.5, L * w * 0.3); ctx.beginPath(); ctx.moveTo(a[0], a[1] - L * w * 0.2); ctx.lineTo(b[0], b[1] - L * w * 0.2); ctx.stroke();
    }
  };
  for (let k = 0; k < 4; k++) { leg(-1, k, true); leg(1, k, true); }
  // the claws
  for (const s of [-1, 1]) {
    const cx = s * W * 0.36, cy = -H * 0.02;
    ctx.strokeStyle = '#6a4e42'; ctx.lineWidth = Math.max(1, L * 0.035); ctx.beginPath(); ctx.moveTo(s * W * 0.18, H * 0.05); ctx.lineTo(cx - s * W * 0.06, cy); ctx.stroke();
    const cg = ctx.createLinearGradient(0, cy - H * 0.2, 0, cy + H * 0.2); cg.addColorStop(0, '#9a7464'); cg.addColorStop(1, '#4a362e');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.08, H * 0.2, s * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1e18'; ctx.beginPath(); ctx.moveTo(cx + s * W * 0.06, cy - H * 0.1); ctx.lineTo(cx + s * W * 0.16, cy - H * 0.04); ctx.lineTo(cx + s * W * 0.07, cy + H * 0.02); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.06, cy + H * 0.06); ctx.lineTo(cx + s * W * 0.15, cy + H * 0.04); ctx.lineTo(cx + s * W * 0.06, cy + H * 0.12); ctx.fill();
  }
  // the carapace
  const cp = smooth([[-W * 0.3, H * 0.15], [-W * 0.32, -H * 0.2], [-W * 0.15, -H * 0.5], [W * 0.15, -H * 0.5], [W * 0.32, -H * 0.2], [W * 0.3, H * 0.15], [0, H * 0.3]]);
  const g = ctx.createRadialGradient(-W * 0.05, -H * 0.35, 0, 0, 0, W * 0.35); g.addColorStop(0, '#8a6a5a'); g.addColorStop(0.6, '#5a4238'); g.addColorStop(1, '#2e221c');
  ctx.fillStyle = g; ctx.fill(cp); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(0.6, L * 0.004); ctx.stroke(cp);
  // the nodules: black, lumpy, with a dull metal sheen
  for (let k = 0; k < 13; k++) {
    const a = Math.PI + (k + 0.5) / 13 * Math.PI, r = W * (0.14 + (k % 3) * 0.05), x = Math.cos(a) * r, y = Math.sin(a) * r * 0.85 - H * 0.05, nr = W * (0.04 + (k % 4) * 0.012);
    const ng = ctx.createRadialGradient(x - nr * 0.35, y - nr * 0.4, 0, x, y, nr); ng.addColorStop(0, '#8a8a90'); ng.addColorStop(0.3, '#33333a'); ng.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = ng; ctx.beginPath(); ctx.moveTo(x + nr, y); for (let j = 1; j <= 8; j++) { const aa = j / 8 * TAU, rr = nr * (0.85 + ((k * 7 + j * 3) % 5) * 0.04); ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 0.85); } ctx.fill();
  }
  // near legs, over the body
  for (let k = 0; k < 4; k++) { leg(-1, k, false); leg(1, k, false); }
  // the rostrum spines and the stalked eyes
  ctx.strokeStyle = '#5a4238'; ctx.lineWidth = Math.max(0.8, L * 0.008);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * W * 0.03, -H * 0.45); ctx.lineTo(s * W * 0.06, -H * 0.62); ctx.stroke(); eye(ctx, s * W * 0.065, -H * 0.66, Math.max(1, L * 0.012), '#2a2420', false); }
  ctx.lineCap = 'butt';
  return null;
}

// Vent skate (Thermobatis ventralis): a small skate (Rajidae) seen from the side and a little above:
// a pointed snout, broad pectoral wings rippling at the edges, pelvic lobes, a slender tail with two
// small dorsal fins near its tip, eyes and spiracles on top. Its back is stained rust-orange by vent microbes.
export function drawVentSkate(ctx, L, v, t, swim) {
  const D = L * 0.55, cx = -L * 0.12;
  // the tail with its two small dorsal fins and a tiny caudal
  const tp = (f) => [cx + D * 0.42 + f * (L * 0.62 - D * 0.42), Math.sin(t * 2 + f * 2) * L * 0.025 * f];
  ctx.strokeStyle = '#4e4640'; ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) { const a = tp(i / 10), b = tp((i + 1) / 10); ctx.lineWidth = Math.max(0.8, L * (0.016 - i * 0.0011)); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.lineCap = 'butt';
  for (const f of [0.7, 0.84]) { const a = tp(f), b = tp(f + 0.06); ctx.fillStyle = '#5a504a'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + L * 0.01, a[1] - L * 0.03, b[0], b[1]); ctx.fill(); }
  // the disc: snout point, wings rippling
  const pts = [], n = 32;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, up = Math.sin(a) < 0, rip = Math.sin(a * 3 - t * 3) * 0.05 * Math.abs(Math.cos(a));
    let rx = D * 0.5 * (1 + rip), ry = D * (up ? 0.2 : 0.12);
    if (Math.cos(a) < -0.9) rx *= 1.15; // the snout
    pts.push([cx + Math.cos(a) * rx, Math.sin(a) * ry + (up ? Math.sin(t * 2.2) * D * 0.03 * Math.abs(Math.cos(a)) : 0)]);
  }
  const disc = smooth(pts);
  const g = ctx.createLinearGradient(0, -D * 0.2, 0, D * 0.12); g.addColorStop(0, '#7a6a5e'); g.addColorStop(0.55, '#5e544c'); g.addColorStop(0.62, '#cfc6bd'); g.addColorStop(1, '#e8e0d8');
  ctx.fillStyle = g; ctx.fill(disc);
  ctx.save(); ctx.clip(disc);
  for (let k = 0; k < 30; k++) { const x = cx + (((k * 37) % 100) / 100 - 0.5) * D * 0.9, y = -D * 0.1 + (((k * 53) % 100) / 100 - 0.5) * D * 0.16;
    ctx.fillStyle = `rgba(${190 + (k % 3) * 15},${85 + (k % 4) * 15},35,0.45)`; ctx.beginPath(); ctx.ellipse(x, y, D * 0.035, D * 0.018, k, 0, TAU); ctx.fill(); }
  // the thorny midline
  ctx.fillStyle = 'rgba(220,210,190,0.6)'; for (let k = 0; k < 7; k++) { const x = cx - D * 0.15 + k * D * 0.08; ctx.beginPath(); ctx.moveTo(x, -D * 0.19); ctx.lineTo(x + D * 0.012, -D * 0.23); ctx.lineTo(x + D * 0.024, -D * 0.19); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,26,22,0.5)'; ctx.lineWidth = Math.max(0.6, L * 0.004); ctx.stroke(disc);
  // pelvic lobes under the disc's rear
  ctx.fillStyle = 'rgba(200,190,180,0.85)'; ctx.beginPath(); ctx.moveTo(cx + D * 0.26, D * 0.09); ctx.quadraticCurveTo(cx + D * 0.36, D * 0.15, cx + D * 0.44, D * 0.06); ctx.quadraticCurveTo(cx + D * 0.36, D * 0.09, cx + D * 0.26, D * 0.09); ctx.fill();
  // eyes and spiracles on top
  eye(ctx, cx - D * 0.24, -D * 0.17, Math.max(1, L * 0.012), '#8a7a60', false);
  ctx.fillStyle = 'rgba(20,16,12,0.7)'; ctx.beginPath(); ctx.ellipse(cx - D * 0.17, -D * 0.18, L * 0.008, L * 0.004, 0, 0, TAU); ctx.fill();
  return null;
}

// Crowned hagfish (Myxinella coronata): a hagfish: eel-shaped, jawless, three pairs of barbels round a
// single nostril and the slit of the mouth, a row of slime pores along each side, a low fin-fold round
// the tail, eyes only as pale spots under the skin. On its head, a crown of bone-white tendrils.
export function drawCrownedHagfish(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.04 ? 0.012 + u * 0.5 : 0.032 * (1 - u * 0.4) + 0.002), (u) => (u < 0.04 ? 0.01 + u * 0.5 : 0.03 * (1 - u * 0.35) + 0.002), t, swim, 0.08, 34);
  // the fin-fold round the tail
  // a low fin-fold, rising gently from the body and round the tail
  const ff = [], hh = (u, u0) => L * 0.01 * Math.sin(Math.min(1, (u - u0) / (1 - u0) * 1.15) * Math.PI * 0.5);
  for (let u = 0.72; u <= 0.999; u += 0.02) { const tp = B.T(u); ff.push([tp[0], tp[1] - hh(u, 0.72)]); }
  const tip = B.M(0.999); ff.push([tip[0] + L * 0.012, tip[1]]);
  for (let u = 0.999; u >= 0.64; u -= 0.02) { const bt = B.Bt(u); ff.push([bt[0], bt[1] + hh(u, 0.64)]); }
  ctx.fillStyle = 'rgba(200,170,168,0.8)'; ctx.fill(smooth(ff));
  shadeBody(ctx, B, '#7a5c5e', '#b0908c', '#dcc8c4');
  rim(ctx, B, 'rgba(60,40,40,0.4)', Math.max(0.5, L * 0.002));
  // slime pores
  ctx.fillStyle = 'rgba(250,240,236,0.7)';
  for (let u = 0.12; u < 0.9; u += 0.025) { const m = B.M(u), bt = B.Bt(u); ctx.beginPath(); ctx.arc(m[0], (m[1] + bt[1]) / 2 + L * 0.003, L * 0.0028, 0, TAU); ctx.fill(); }
  // the gill pore, the eyespot under the skin
  const gp = B.M(0.2); ctx.fillStyle = 'rgba(80,50,50,0.6)'; ctx.beginPath(); ctx.arc(gp[0], gp[1] + L * 0.012, L * 0.004, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(240,225,220,0.55)'; ctx.beginPath(); ctx.ellipse(B.M(0.03)[0], B.M(0.03)[1] - L * 0.008, L * 0.007, L * 0.005, 0, 0, TAU); ctx.fill();
  // nostril and barbels
  const sn = B.M(0);
  ctx.fillStyle = '#4a2e2e'; ctx.beginPath(); ctx.arc(sn[0] + L * 0.002, sn[1] - L * 0.004, L * 0.003, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c8a8a2'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.5, L * 0.0035);
  for (let k = 0; k < 6; k++) { const yy = (k - 2.5) * L * 0.004; ctx.beginPath(); ctx.moveTo(sn[0] + L * 0.004, sn[1] + yy); ctx.quadraticCurveTo(sn[0] - L * 0.015, sn[1] + yy * 2, sn[0] - L * (0.025 + (k % 2) * 0.008), sn[1] + yy * 3 + Math.sin(t * 3 + k) * L * 0.003); ctx.stroke(); }
  // the crown: bone-white tendrils, knobbed at the tips, swaying
  for (let k = 0; k < 11; k++) {
    const hu = 0.015 + k * 0.009, bp = B.T(hu), a = -Math.PI / 2 - 0.9 + k * 0.17, len = L * (0.05 + ((k * 3) % 4) * 0.012), sw = Math.sin(t * 1.4 + k * 0.6) * 0.25;
    const ex = bp[0] + Math.cos(a + sw * 2) * len, ey = bp[1] + Math.sin(a + sw * 2) * len;
    ctx.strokeStyle = '#efe8dc'; ctx.lineWidth = Math.max(0.6, L * (0.005 - k * 0.0002));
    ctx.beginPath(); ctx.moveTo(bp[0], bp[1] + L * 0.002); ctx.quadraticCurveTo(bp[0] + Math.cos(a + sw) * len * 0.6, bp[1] + Math.sin(a + sw) * len * 0.6, ex, ey); ctx.stroke();
    ctx.fillStyle = '#fbf7ee'; ctx.beginPath(); ctx.arc(ex, ey, L * 0.0045, 0, TAU); ctx.fill();
  }
  ctx.lineCap = 'butt';
  return null;
}

// Brine-shore cusk-eel (Halobythites pallidus): a cusk-eel (Ophidiidae): a long tapering body, the
// dorsal and anal fins meeting round a pointed tail, the pelvic fins as two thin filaments under the
// chin, a gill cover, a small eye. Pale and nearly see-through: gut, liver and spine show.
export function drawBrineCusk(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.08 ? 0.015 + Math.sqrt(u / 0.08) * 0.045 : 0.06 * Math.pow(1 - (u - 0.08) / 0.92, 0.85) + 0.002),
    (u) => (u < 0.08 ? 0.012 + Math.sqrt(u / 0.08) * 0.04 : 0.055 * Math.pow(1 - (u - 0.08) / 0.92, 0.85) + 0.002), t, swim, 0.05, 36);
  const fu = [], fd = [];
  for (let u = 0.2; u <= 1.0001; u += 0.03) { const k = Math.min(1, (1.02 - u) / 0.12); const tp = B.T(Math.min(u, 0.999)); fu.push([tp[0], tp[1] - L * 0.016 * k]); }
  for (let u = 1; u >= 0.42; u -= 0.03) { const k = Math.min(1, (1.02 - u) / 0.12); const bt = B.Bt(Math.max(0.001, Math.min(u, 0.999))); fd.push([bt[0], bt[1] + L * 0.014 * k]); }
  fin(ctx, B.top.slice(Math.round(0.2 * B.n)), fu, 'rgba(238,224,228,0.3)', 'rgba(255,250,250,0.18)', 18);
  fin(ctx, B.bot.slice(Math.round(0.42 * B.n)), fd.slice().reverse(), 'rgba(238,224,228,0.3)', 'rgba(255,250,250,0.18)', 12);
  ctx.globalAlpha = 0.82; shadeBody(ctx, B, '#cdb4ba', '#ecdde0', '#f6ecee'); ctx.globalAlpha = 1;
  ctx.save(); ctx.clip(B.p);
  ctx.fillStyle = 'rgba(190,110,122,0.42)'; ctx.beginPath(); ctx.ellipse(B.M(0.2)[0], B.M(0.2)[1] + L * 0.012, L * 0.07, L * 0.02, 0, 0, TAU); ctx.fill(); // gut
  ctx.fillStyle = 'rgba(215,175,120,0.35)'; ctx.beginPath(); ctx.ellipse(B.M(0.14)[0], B.M(0.14)[1], L * 0.035, L * 0.018, 0, 0, TAU); ctx.fill(); // liver
  ctx.restore();
  stroke(ctx, along(B, 0.1, 0.97, -0.25, 20), 'rgba(170,140,150,0.5)', Math.max(0.5, L * 0.003)); // spine
  gillCover(ctx, B.M(0.09)[0], B.M(0.09)[1], L * 0.08, 'rgba(150,110,120,0.5)', 'rgba(255,255,255,0.3)');
  // the chin filaments (pelvic fins)
  const ch = B.Bt(0.05); ctx.strokeStyle = 'rgba(230,210,215,0.85)'; ctx.lineWidth = Math.max(0.5, L * 0.003);
  for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(ch[0], ch[1]); ctx.quadraticCurveTo(ch[0] + L * 0.02, ch[1] + L * 0.03, ch[0] + L * (0.05 + k * 0.01), ch[1] + L * 0.035 + Math.sin(t * 2 + k) * L * 0.004); ctx.stroke(); }
  // the pectoral fin
  const pb = B.M(0.11); fin(ctx, [[pb[0], pb[1] - L * 0.006], [pb[0], pb[1] + L * 0.008]], [[pb[0] + L * 0.04, pb[1] - L * 0.012], [pb[0] + L * 0.045, pb[1] + L * 0.01]], 'rgba(240,226,230,0.5)', 'rgba(255,250,250,0.35)', 5);
  ctx.strokeStyle = 'rgba(120,80,90,0.6)'; ctx.lineWidth = Math.max(0.5, L * 0.003); ctx.beginPath(); ctx.moveTo(B.M(0)[0], B.M(0)[1] + L * 0.006); ctx.lineTo(B.M(0.04)[0], B.M(0.04)[1] + L * 0.012); ctx.stroke();
  eye(ctx, B.M(0.035)[0], B.M(0.035)[1] - L * 0.015, Math.max(1, L * 0.008), '#d8c8c0', false);
  return null;
}

// Falling-star squid (Asteroteuthis cadens): a great ommastrephid-like squid: a long mantle ending in a
// rhomboid pair of fins, a head with large eyes and the siphon below, eight arms with suckers and two
// long tentacles ending in toothed clubs. Deep red, set with blue photophores. Startled, it releases
// glowing ink that sinks slowly behind it, like falling stars.
export function drawStarfallSquid(ctx, L, v, t, swim) {
  const H = L * 0.085, hx = L * 0.0;
  ctx.lineCap = 'round';
  // the arms (squid swim mantle first, so mantle toward -x, arms trailing toward +x)
  for (let k = 0; k < 8; k++) {
    const y0 = (k - 3.5) * H * 0.12, sw = Math.sin(t * 2 + k * 0.8) * H * 0.35, len = L * (0.26 + (k % 4) * 0.02);
    const p0 = [hx + L * 0.06, y0], p3 = [hx + L * 0.06 + len, y0 * 1.6 + sw * 1.3];
    ctx.strokeStyle = k % 2 ? '#6a1828' : '#7a2030'; ctx.lineWidth = Math.max(1, L * 0.011);
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(p0[0] + len * 0.35, y0 + sw, p0[0] + len * 0.7, y0 - sw, p3[0], p3[1]); ctx.stroke();
    ctx.fillStyle = 'rgba(230,180,180,0.5)'; for (let j = 1; j < 6; j++) { const f = j / 6; ctx.beginPath(); ctx.arc(p0[0] + len * f, y0 + (p3[1] - y0) * f + (k < 4 ? -1 : 1) * L * 0.004, L * 0.0028, 0, TAU); ctx.fill(); }
  }
  // the two tentacles and their toothed clubs
  ctx.strokeStyle = '#7a2030'; ctx.lineWidth = Math.max(0.8, L * 0.005);
  for (const s of [-1, 1]) {
    const ex = hx + L * 0.55, ey = s * H * 0.5 + Math.sin(t + s) * H * 0.3;
    ctx.beginPath(); ctx.moveTo(hx + L * 0.06, s * H * 0.1); ctx.bezierCurveTo(hx + L * 0.25, s * H * 0.9, hx + L * 0.4, s * H * 0.1, ex, ey); ctx.stroke();
    ctx.fillStyle = '#8a2838'; ctx.beginPath(); ctx.ellipse(ex + L * 0.02, ey, L * 0.03, H * 0.16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(240,200,200,0.7)'; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(ex + L * (0.0 + j * 0.013), ey + s * H * 0.04, L * 0.003, 0, TAU); ctx.fill(); }
  }
  ctx.lineCap = 'butt';
  // the fins: a rhomboid pair at the mantle's end
  const fy = Math.sin(t * 2) * H * 0.25;
  ctx.fillStyle = '#5a1222';
  ctx.beginPath(); ctx.moveTo(-L * 0.47, 0); ctx.lineTo(-L * 0.36, -H * 1.5 + fy); ctx.lineTo(-L * 0.25, -H * 0.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-L * 0.47, 0); ctx.lineTo(-L * 0.36, H * 1.5 - fy); ctx.lineTo(-L * 0.25, H * 0.4); ctx.closePath(); ctx.fill();
  // the mantle
  const mp = smooth([[-L * 0.5, 0], [-L * 0.42, -H * 0.62], [-L * 0.15, -H * 0.95], [hx, -H * 0.85], [hx, H * 0.85], [-L * 0.15, H * 0.95], [-L * 0.42, H * 0.62]]);
  const g = ctx.createLinearGradient(0, -H, 0, H); g.addColorStop(0, '#4a0e1c'); g.addColorStop(0.45, '#8e2a3a'); g.addColorStop(1, '#3e0a18');
  ctx.fillStyle = g; ctx.fill(mp);
  ctx.save(); ctx.clip(mp);
  for (let k = 0; k < 60; k++) { ctx.fillStyle = `rgba(${40 + (k % 3) * 20},0,10,0.35)`; ctx.beginPath(); ctx.arc(-L * 0.48 + ((k * 37) % 100) / 100 * L * 0.48, (((k * 53) % 100) / 100 - 0.5) * H * 1.8, L * 0.004, 0, TAU); ctx.fill(); } // chromatophores
  ctx.restore();
  // the head, with the mantle's collar and the siphon
  const hd = smooth([[hx - L * 0.005, -H * 0.75], [hx + L * 0.05, -H * 0.6], [hx + L * 0.07, 0], [hx + L * 0.05, H * 0.6], [hx - L * 0.005, H * 0.75]]);
  ctx.fillStyle = '#7a2232'; ctx.fill(hd);
  ctx.fillStyle = '#5a1424'; ctx.beginPath(); ctx.ellipse(hx - L * 0.01, H * 0.62, L * 0.025, H * 0.16, -0.3, 0, TAU); ctx.fill();
  // its lights
  const P = [];
  for (let k = 0; k < 18; k++) { const x = -L * 0.44 + (k / 18) * L * 0.44, y = Math.sin(k * 2.7) * H * 0.6; ctx.fillStyle = '#0a0a14'; ctx.beginPath(); ctx.arc(x, y, L * 0.006, 0, TAU); ctx.fill(); ctx.fillStyle = '#9ad8ff'; ctx.beginPath(); ctx.arc(x, y, L * 0.004, 0, TAU); ctx.fill(); if (k % 3 === 0) P.push([x, y, 0.4]); }
  eye(ctx, hx + L * 0.025, -H * 0.2, Math.max(1, L * 0.02), '#c8b090');
  // the falling stars: glowing ink sinking slowly behind and below
  for (let k = 0; k < 14; k++) { const q = (t * 0.15 + k / 14) % 1, x = -L * 0.46 + k * L * 0.028, y = H * 1.2 + q * L * 0.3;
    ctx.fillStyle = `rgba(185,225,255,${(0.75 * (1 - q)).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, L * 0.0035 * (1 + (k % 3)), 0, TAU); ctx.fill(); if (k % 4 === 0) P.push([x, y, 0.3 * (1 - q)]); }
  return P;
}

// Silt-walking tripodfish (Ambulopus limosus): a tripodfish (Bathypterois): a long, low body with a
// flat head, a small eye, a high dorsal, the pectoral rays thrown forward over the head like feelers,
// and three stilts (the long rays of the two pelvic fins and the lower lobe of the tail) on which it
// walks over the soft floor.
export function drawSiltWalker(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.12 ? 0.02 + u * 0.35 : 0.062 * (1 - u * 0.6)), (u) => (u < 0.12 ? 0.015 + u * 0.3 : 0.05 * (1 - u * 0.6)), t, swim * 0.3, 0.02, 30, 0.85);
  const tail = B.M(1);
  // the stilts, stepping in turn
  ctx.strokeStyle = '#ddd8cc'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, L * 0.006);
  const st = (p0, ph) => { const lift = Math.max(0, Math.sin(t * 1.5 + ph)) * L * 0.025, fx = p0[0] + Math.cos(t * 1.5 + ph) * L * 0.03; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p0[0] + L * 0.01, p0[1] + L * 0.12, fx, p0[1] + L * 0.27 - lift); ctx.stroke(); };
  st(B.Bt(0.32), 0); st([B.Bt(0.34)[0] + L * 0.01, B.Bt(0.34)[1]], 2.1); st([tail[0] + L * 0.02, tail[1] + L * 0.01], 4.2);
  ctx.lineCap = 'butt';
  fin(ctx, [B.T(0.97), tail, B.Bt(0.97)], [[tail[0] + L * 0.12, tail[1] - L * 0.06], [tail[0] + L * 0.1, tail[1]], [tail[0] + L * 0.06, tail[1] + L * 0.03]], '#4e4a44', 'rgba(220,214,200,0.4)', 6);
  fin(ctx, [B.T(0.33), B.T(0.47)], [[B.T(0.35)[0] + L * 0.02, B.T(0.35)[1] - L * 0.1], B.T(0.5)], 'rgba(90,86,78,0.7)', 'rgba(220,214,200,0.4)', 7);
  fin(ctx, [B.Bt(0.6), B.Bt(0.8)], [[B.Bt(0.62)[0] + L * 0.02, B.Bt(0.62)[1] + L * 0.03], B.Bt(0.82)], 'rgba(90,86,78,0.7)', 'rgba(220,214,200,0.35)', 6);
  shadeBody(ctx, B, '#4a4640', '#7a766c', '#a8a498');
  ctx.save(); ctx.clip(B.p); for (let k = 0; k < 26; k++) { const u = 0.08 + (k / 26) * 0.9, m = B.M(u); ctx.fillStyle = 'rgba(30,28,24,0.4)'; ctx.beginPath(); ctx.arc(m[0], m[1] + ((k * 37) % 10 - 5) / 5 * L * 0.025, L * 0.0055, 0, TAU); ctx.fill(); } ctx.restore();
  scales(ctx, B, L * 0.012, 'rgba(30,28,24,0.18)');
  rim(ctx, B, 'rgba(20,18,16,0.5)', Math.max(0.5, L * 0.003));
  gillCover(ctx, B.M(0.16)[0], B.M(0.16)[1], L * 0.07);
  stroke(ctx, along(B, 0.17, 0.97, -0.1), 'rgba(200,196,184,0.35)', Math.max(0.5, L * 0.0025));
  // the pectoral feelers, thrown forward over the head
  const pb = B.T(0.16); ctx.strokeStyle = 'rgba(225,220,205,0.7)'; ctx.lineWidth = Math.max(0.4, L * 0.0025);
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(pb[0], pb[1] + L * 0.01); ctx.quadraticCurveTo(pb[0] - L * 0.08, pb[1] - L * (0.12 + k * 0.012), pb[0] - L * (0.16 + k * 0.02), pb[1] - L * (0.03 + k * 0.025) + Math.sin(t + k) * L * 0.006); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(20,18,16,0.6)'; ctx.lineWidth = Math.max(0.5, L * 0.003); ctx.beginPath(); ctx.moveTo(B.M(0)[0], B.M(0)[1] + L * 0.004); ctx.lineTo(B.M(0.07)[0], B.M(0.07)[1] + L * 0.012); ctx.stroke();
  eye(ctx, B.M(0.06)[0], B.M(0.06)[1] - L * 0.012, Math.max(1, L * 0.006), '#4a4a3e', false);
  return null;
}

// Steadylight dragonfish (Constantia lucerna): a barbeled dragonfish (Stomiidae): long and black,
// the dorsal and anal fins set far back near the tail, fangs in a hinged jaw, a row of small photophores
// along the belly, and a long chin barbel whose bulb holds one steady white light that never flickers.
export function drawSteadylight(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.07 ? 0.012 + Math.sqrt(u / 0.07) * 0.04 : 0.052 * (1 - u * 0.55)), (u) => (u < 0.07 ? 0.014 + Math.sqrt(u / 0.07) * 0.04 : 0.05 * (1 - u * 0.55)), t, swim, 0.05, 32, 0.9);
  const tail = B.M(1);
  fin(ctx, [B.T(0.98), tail, B.Bt(0.98)], [[tail[0] + L * 0.09, tail[1] - L * 0.06], [tail[0] + L * 0.06, tail[1]], [tail[0] + L * 0.09, tail[1] + L * 0.06]], '#0a0a0c', 'rgba(70,74,90,0.4)', 7);
  fin(ctx, [B.T(0.78), B.T(0.92)], [[B.T(0.8)[0] + L * 0.03, B.T(0.8)[1] - L * 0.05], B.T(0.95)], '#0c0c0e', 'rgba(70,74,90,0.4)', 6);
  fin(ctx, [B.Bt(0.76), B.Bt(0.92)], [[B.Bt(0.78)[0] + L * 0.03, B.Bt(0.78)[1] + L * 0.05], B.Bt(0.95)], '#0c0c0e', 'rgba(70,74,90,0.4)', 6);
  ctx.fillStyle = '#060607'; ctx.fill(B.p);
  ctx.save(); ctx.clip(B.p); const sh = ctx.createLinearGradient(0, B.T(0.4)[1], 0, B.M(0.4)[1]); sh.addColorStop(0, 'rgba(70,80,100,0.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.fillRect(-L, -L, L * 2, L * 2); ctx.restore();
  // the hinged jaw and its fangs
  const j0 = B.M(0), j1 = B.M(0.11);
  ctx.strokeStyle = '#1c1c22'; ctx.lineWidth = Math.max(0.5, L * 0.003); ctx.beginPath(); ctx.moveTo(j0[0], j0[1]); ctx.lineTo(j1[0], j1[1] + L * 0.01); ctx.stroke();
  ctx.fillStyle = '#ddd8cc';
  for (let k = 0; k < 6; k++) { const f = k / 5, x = j0[0] + L * 0.006 + f * (j1[0] - j0[0] - L * 0.01), y = j0[1] + f * L * 0.01, len = L * (0.022 - f * 0.012) * (k % 2 ? 0.6 : 1);
    ctx.beginPath(); ctx.moveTo(x - L * 0.003, y); ctx.quadraticCurveTo(x + L * 0.002, y + len * 0.6, x + L * 0.001, y + len); ctx.lineTo(x + L * 0.004, y); ctx.fill(); }
  gillCover(ctx, B.M(0.13)[0], B.M(0.13)[1], L * 0.07, 'rgba(60,64,80,0.5)', 'rgba(120,130,150,0.12)');
  // the belly photophores (faint)
  const P = lights(ctx, along(B, 0.15, 0.85, 0.75, 16), Math.max(0.5, L * 0.0035), 'rgba(140,170,220,0.7)', 4).map(([x, y]) => [x, y, 0.15]);
  // the barbel and its steady light
  const bx = B.M(0.06)[0] + Math.sin(t * 0.8) * L * 0.015, by = B.M(0.06)[1] + L * 0.16;
  ctx.strokeStyle = '#26262c'; ctx.lineWidth = Math.max(0.6, L * 0.003); ctx.beginPath(); ctx.moveTo(B.Bt(0.05)[0], B.Bt(0.05)[1]); ctx.quadraticCurveTo(B.Bt(0.03)[0] - L * 0.02, by - L * 0.06, bx, by); ctx.stroke();
  const lg = ctx.createRadialGradient(bx, by, 0, bx, by, L * 0.022); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.45, '#eef6ff'); lg.addColorStop(1, 'rgba(220,235,255,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(bx, by, L * 0.022, 0, TAU); ctx.fill();
  eye(ctx, B.M(0.05)[0], B.M(0.05)[1] - L * 0.012, Math.max(1, L * 0.01), '#2a3040');
  return P.concat([[bx, by, 1.0]]);
}

// Great pale snailfish (Leucoliparis maximus): a snailfish (Liparidae), the deepest-living family of
// fishes, grown huge: a broad, soft, tadpole body of gelatinous skin, a blunt head with a terminal
// mouth and a tiny eye, a big lobed pectoral fin whose lower rays are free and finger-like, a sucking
// disc under the chest, and long dorsal and anal fins joined round the tail. White and nearly see-through.
export function drawPaleSnailfish(ctx, L, v, t, swim) {
  const B = fishBody(L, (u) => (u < 0.08 ? 0.03 + Math.sqrt(u / 0.08) * 0.09 : u < 0.3 ? 0.12 + Math.sin((u - 0.08) / 0.22 * Math.PI) * 0.02 : 0.12 * Math.pow(1 - (u - 0.3) / 0.7, 1.2) + 0.004),
    (u) => (u < 0.08 ? 0.03 + Math.sqrt(u / 0.08) * 0.08 : u < 0.3 ? 0.11 + Math.sin((u - 0.08) / 0.22 * Math.PI) * 0.03 : 0.11 * Math.pow(1 - (u - 0.3) / 0.7, 1.2) + 0.004), t, swim * 0.5, 0.05, 40);
  const fu = [], fd = [];
  for (let u = 0.32; u <= 1.0001; u += 0.03) { const k = Math.min(1, (1.03 - u) / 0.15); const tp = B.T(Math.min(u, 0.999)); fu.push([tp[0], tp[1] - L * 0.03 * k]); }
  for (let u = 1; u >= 0.36; u -= 0.03) { const k = Math.min(1, (1.03 - u) / 0.15); const bt = B.Bt(Math.max(0.001, Math.min(u, 0.999))); fd.push([bt[0], bt[1] + L * 0.026 * k]); }
  fin(ctx, B.top.slice(Math.round(0.32 * B.n)), fu, 'rgba(240,232,236,0.3)', 'rgba(255,250,252,0.2)', 22);
  fin(ctx, B.bot.slice(Math.round(0.36 * B.n)), fd.slice().reverse(), 'rgba(240,232,236,0.3)', 'rgba(255,250,252,0.2)', 20);
  const g = ctx.createRadialGradient(B.M(0.15)[0], B.M(0.15)[1] - L * 0.05, 0, B.M(0.3)[0], B.M(0.3)[1], L * 0.55);
  g.addColorStop(0, 'rgba(255,252,252,0.92)'); g.addColorStop(0.45, 'rgba(242,230,234,0.8)'); g.addColorStop(1, 'rgba(222,204,212,0.6)');
  ctx.fillStyle = g; ctx.fill(B.p);
  ctx.save(); ctx.clip(B.p);
  // what shows through: the gut and liver, the swim of the spine, the gill chamber
  ctx.fillStyle = 'rgba(200,118,128,0.35)'; ctx.beginPath(); ctx.ellipse(B.M(0.24)[0], B.M(0.24)[1] + L * 0.04, L * 0.08, L * 0.035, 0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(215,172,110,0.3)'; ctx.beginPath(); ctx.ellipse(B.M(0.16)[0], B.M(0.16)[1] + L * 0.02, L * 0.05, L * 0.03, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(180,140,160,0.18)'; ctx.beginPath(); ctx.ellipse(B.M(0.1)[0], B.M(0.1)[1], L * 0.04, L * 0.06, 0, 0, TAU); ctx.fill();
  // the faint ripples of loose gelatinous skin
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = Math.max(0.5, L * 0.002);
  for (let k = 0; k < 7; k++) { const m = B.M(0.06 + k * 0.05); ctx.beginPath(); ctx.arc(m[0] + L * 0.04, m[1], L * 0.09, 2.6, 3.7); ctx.stroke(); }
  ctx.restore();
  stroke(ctx, along(B, 0.12, 0.97, -0.25, 22), 'rgba(185,165,178,0.45)', Math.max(0.5, L * 0.003));
  rim(ctx, B, 'rgba(170,150,160,0.35)', Math.max(0.5, L * 0.002));
  // the sucking disc under the chest
  const sd = B.Bt(0.14); ctx.strokeStyle = 'rgba(200,180,190,0.6)'; ctx.lineWidth = Math.max(0.6, L * 0.004); ctx.beginPath(); ctx.ellipse(sd[0], sd[1] - L * 0.005, L * 0.025, L * 0.008, 0, 0, Math.PI); ctx.stroke();
  // the big lobed pectoral, its lower rays free like fingers
  const pb = B.M(0.13);
  fin(ctx, [[pb[0], pb[1] - L * 0.03], [pb[0], pb[1] + L * 0.04]], [[pb[0] + L * 0.1, pb[1] - L * 0.05 + Math.sin(t) * L * 0.01], [pb[0] + L * 0.12, pb[1] + L * 0.02], [pb[0] + L * 0.07, pb[1] + L * 0.06]], 'rgba(245,236,240,0.42)', 'rgba(255,255,255,0.3)', 9);
  ctx.strokeStyle = 'rgba(240,226,232,0.7)'; ctx.lineWidth = Math.max(0.5, L * 0.003);
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(pb[0] + L * 0.01, pb[1] + L * (0.05 + k * 0.006)); ctx.quadraticCurveTo(pb[0] + L * 0.03, pb[1] + L * 0.09, pb[0] + L * (0.04 + k * 0.012), pb[1] + L * (0.1 + k * 0.006) + Math.sin(t * 1.5 + k) * L * 0.004); ctx.stroke(); }
  // the terminal mouth and the tiny eye
  ctx.strokeStyle = 'rgba(150,110,125,0.6)'; ctx.lineWidth = Math.max(0.6, L * 0.004); ctx.beginPath(); ctx.moveTo(B.M(0)[0] + L * 0.004, B.M(0)[1] + L * 0.012); ctx.quadraticCurveTo(B.M(0.03)[0], B.M(0.03)[1] + L * 0.03, B.M(0.06)[0], B.M(0.06)[1] + L * 0.025); ctx.stroke();
  eye(ctx, B.M(0.06)[0], B.M(0.06)[1] - L * 0.035, Math.max(1, L * 0.007), '#3a3036', false);
  return null;
}

// the drawing for each undocumented species, by its shape key
const RAW = {
  mirrorfish: drawMirrorfish, gloweel: drawGlowEel, emberangler: drawEmberAngler, glasshatchet: drawGlassHatchet,
  nodulecrab: drawNoduleCrab, ventskate: drawVentSkate, crownhag: drawCrownedHagfish, brinecusk: drawBrineCusk,
  starfall: drawStarfallSquid, siltwalker: drawSiltWalker, steadylight: drawSteadylight, palesnail: drawPaleSnailfish,
};

// the drawing for each undocumented species, by its shape key (head toward -x, like every creature)
export const UNDOCUMENTED_RENDERERS = RAW;
