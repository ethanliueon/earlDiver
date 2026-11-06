// The thing in the deep: a gulper the size of nothing that should live. Almost all head and mouth,
// velvet-black, loose wrinkled skin, a long whip of a tail; tiny eyes at the tip of the snout; fine
// needle teeth. Its lower jaw is a long thin bone with a sack of skin slung under it: when it opens,
// the jaw drops and the sack balloons. Between the jaws there is nothing drawn at all: you see the
// water (and whatever is in it) through the open mouth.
//
// It makes its own light: red, along its flanks, its jaw and in the veins of the sack, flickering fast
// and unevenly; and its eyes glow red. (Red, because almost nothing down there can see red light: the
// dragonfish hunt the same way.) The lights themselves are drawn by render.js from the points this
// returns, after the darkness, so they show where nothing else does.
//
// Local frame: the snout at the origin, the body trailing along +x for Lp pixels (and the tail past
// it, to 1.3 Lp). The caller flips it to face its prey. The body is painted once into sprites (a
// coarse one for the whole length, a fine one for the head) and drawn in strips so the tail can whip.
import { TAU, clamp } from './util.js';

export const MONSTER_LEN = 60;           // metres, snout to the root of the tail (the tail goes on 18 m)
export const MONSTER_EYE = [0.026, -0.016]; // where its eye is, in body lengths from the snout
const HEAD_U = 0.46;                     // the head sprite covers the snout to here
const BODY_PPM = 22, HEAD_PPM = 60;      // sprite resolution, pixels per metre
const V0 = -0.11, V1 = 0.075;            // the sprites' vertical extent, body lengths

function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const rot = (p, a, c) => { const dx = p[0] - c[0], dy = p[1] - c[1], ca = Math.cos(a), sa = Math.sin(a); return [c[0] + dx * ca - dy * sa, c[1] + dx * sa + dy * ca]; };
function smooth(pts, closed = true) {
  const p = new Path2D(), n = pts.length;
  if (closed) {
    const m = mid(pts[n - 1], pts[0]); p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], mm = mid(a, b); p.quadraticCurveTo(a[0], a[1], mm[0], mm[1]); }
    p.closePath();
  } else {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const mm = mid(pts[i], pts[i + 1]); p.quadraticCurveTo(pts[i][0], pts[i][1], mm[0], mm[1]); }
    p.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  return p;
}

// ---- the shape, in body lengths ----
const TOP = [[0.0, 0.006], [0.004, -0.016], [0.022, -0.04], [0.06, -0.066], [0.12, -0.084], [0.2, -0.093], [0.28, -0.092], [0.36, -0.08], [0.44, -0.06], [0.54, -0.04], [0.66, -0.027], [0.78, -0.017], [0.9, -0.01], [1.02, -0.006], [1.14, -0.003], [1.24, -0.0015]];
const UNDER = [[1.3, 0.0], [1.24, 0.0015], [1.14, 0.003], [1.02, 0.006], [0.9, 0.01], [0.78, 0.017], [0.66, 0.026], [0.56, 0.036], [0.48, 0.048], [0.42, 0.058], [0.37, 0.058], [0.34, 0.045]];
const LIP = [[0.33, 0.034], [0.28, 0.03], [0.22, 0.026], [0.16, 0.022], [0.1, 0.018], [0.05, 0.014], [0.015, 0.011]];
const JAW_LIP = [[0.33, 0.036], [0.28, 0.033], [0.22, 0.03], [0.16, 0.026], [0.1, 0.022], [0.05, 0.018], [0.012, 0.016]];
const JAW_UNDER = [[0.012, 0.024], [0.05, 0.027], [0.1, 0.031], [0.16, 0.035], [0.22, 0.039], [0.28, 0.042], [0.33, 0.045]];
const HINGE = [0.33, 0.034];
const SACK_BASE = [0.43, 0.056];
// the tail whips; the head and the front of the body hold still
// flick 0..1 curls the tail up (body lengths), as when it strikes something above it
let FLICK = 0;
const wave = (u, t) => (u < 0.45 ? 0 : Math.sin(u * 7 - 2.6 - t * 0.9) * 0.035 * (u - 0.45) * 1.6 + Math.sin(u * 3 - t * 0.4) * 0.006 * (u - 0.45)) - (u > 0.8 ? FLICK * 0.42 * Math.pow((u - 0.8) / 0.5, 2) : 0);

// ---- painting the hide (once) ----
function paintHide(ctx, L, r, detail) {
  const P = (u, v) => [u * L, v * L];
  const body = smooth([...TOP, ...UNDER, ...LIP].map(([u, v]) => P(u, v)));
  const bg = ctx.createLinearGradient(0, -0.095 * L, 0, 0.06 * L);
  bg.addColorStop(0, '#0e0a0e'); bg.addColorStop(0.5, '#1c151c'); bg.addColorStop(1, '#2a2028');
  ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  const W = 1.3 * L, x0 = 0, y0 = -0.1 * L, H = 0.17 * L, S = W;
  // blotches, dark and violet
  for (let i = 0; i < 300 * detail; i++) {
    const x = x0 + r() * W, y = y0 + r() * H, rad = S * (0.002 + r() * r() * 0.016), dark = r() < 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, dark ? 'rgba(0,0,0,1)' : 'rgba(120,90,130,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (dark ? 0.35 : 0.18) * (0.5 + r() * 0.5); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rad * (1 + r() * 0.8), rad, r() * 3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // speckle and soft bumps
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 800 * detail; i++) { ctx.beginPath(); ctx.arc(x0 + r() * W, y0 + r() * H, S * (0.0004 + r() * 0.0009), 0, TAU); ctx.fill(); }
  for (let i = 0; i < 500 * detail; i++) {
    const x = x0 + r() * W, y = y0 + r() * H, rad = S * (0.001 + r() * r() * 0.004);
    const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.45, 0, x + rad * 0.15, y + rad * 0.2, rad);
    g.addColorStop(0, 'rgba(170,140,180,0.16)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }
  // wrinkles bunched over the head and behind the jaw
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = L * 0.0011;
  for (let k = 0; k < 90; k++) { const p = P(0.03 + r() * 0.5, -0.08 + r() * 0.1), l = L * (0.01 + r() * 0.02); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + l * 0.5, p[1] + (r() - 0.5) * l * 0.6, p[0] + l, p[1] + (r() - 0.5) * l * 0.3); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(150,120,160,0.12)';
  for (let k = 0; k < 50; k++) { const p = P(0.03 + r() * 0.45, -0.08 + r() * 0.07), l = L * (0.008 + r() * 0.015); ctx.beginPath(); ctx.moveTo(p[0], p[1] - L * 0.001); ctx.quadraticCurveTo(p[0] + l * 0.5, p[1] - L * 0.002, p[0] + l, p[1] - L * 0.001); ctx.stroke(); }
  // pale old scars
  for (let k = 0; k < 6; k++) {
    const u = 0.08 + r() * 0.5, a = P(u, -0.07 + r() * 0.04), b = P(u + 0.05 + r() * 0.06, -0.04 + r() * 0.05);
    const pts = [a]; for (let i = 1; i < 5; i++) { const f = i / 5; pts.push([a[0] + (b[0] - a[0]) * f + (r() - 0.5) * L * 0.006, a[1] + (b[1] - a[1]) * f + (r() - 0.5) * L * 0.006]); } pts.push(b);
    const p = smooth(pts, false);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = L * 0.003; ctx.stroke(p);
    ctx.strokeStyle = 'rgba(170,150,170,0.35)'; ctx.lineWidth = L * 0.0013; ctx.stroke(p);
  }
  // the pits its lights sit in: a small pale ring each (the lights themselves are drawn live)
  for (const [u, v] of LIGHTS) { const p = P(u, v); ctx.fillStyle = 'rgba(60,10,16,0.8)'; ctx.beginPath(); ctx.arc(p[0], p[1], L * 0.0016, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(150,110,120,0.35)'; ctx.lineWidth = L * 0.0006; ctx.stroke(); }
  // the violet sheen across the dome of the head, and shade underneath
  const vs = ctx.createLinearGradient(0, -0.095 * L, 0, 0.06 * L);
  vs.addColorStop(0, 'rgba(160,120,190,0.22)'); vs.addColorStop(0.18, 'rgba(160,120,190,0)'); vs.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vs; ctx.fillRect(0, -0.12 * L, 1.35 * L, 0.24 * L);
  ctx.restore();
  // the ragged fin along the back of the whip
  const fpts = [];
  for (let u = 0.7; u <= 1.2; u += 0.025) fpts.push(P(u, -0.017 * (1.2 - u) / 0.5 - 0.0015));
  for (let u = 1.2; u >= 0.7; u -= 0.025) fpts.push(P(u, -0.017 * (1.2 - u) / 0.5 - 0.0015 - 0.012 * Math.sin(Math.PI * (u - 0.7) / 0.5) * (0.8 + r() * 0.4)));
  ctx.fillStyle = '#1a141a'; ctx.fill(smooth(fpts));
  // fine needle teeth along the upper lip, pointing down
  needles(ctx, LIP.map(([u, v]) => P(u, v)), [0, 1], 46, L * 0.0045, r);
  // the eye: a small dark globe in a socket (its red glow is drawn live)
  const e = P(...MONSTER_EYE);
  const sg = ctx.createRadialGradient(e[0], e[1], L * 0.002, e[0], e[1], L * 0.009);
  sg.addColorStop(0, 'rgba(0,0,0,0.9)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(e[0], e[1], L * 0.009, 0, TAU); ctx.fill();
  const ig = ctx.createRadialGradient(e[0] - L * 0.001, e[1] - L * 0.001, 0, e[0], e[1], L * 0.0045);
  ig.addColorStop(0, '#7a2020'); ig.addColorStop(0.6, '#3a0a0c'); ig.addColorStop(1, '#100406');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(e[0], e[1], L * 0.0045, L * 0.0037, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,240,0.7)'; ctx.beginPath(); ctx.arc(e[0] - L * 0.0015, e[1] - L * 0.0013, L * 0.0007, 0, TAU); ctx.fill();
  // wet gloss on the snout and the dome
  ctx.strokeStyle = 'rgba(230,220,240,0.45)'; ctx.lineWidth = L * 0.0028;
  ctx.stroke(smooth([P(0.0, 0.0), P(0.006, -0.02), P(0.03, -0.046), P(0.075, -0.07)], false));
  ctx.strokeStyle = 'rgba(230,220,240,0.2)'; ctx.lineWidth = L * 0.0018;
  ctx.stroke(smooth([P(0.09, -0.078), P(0.17, -0.09), P(0.27, -0.092)], false));
}
function needles(ctx, edge, dir, n, len, r, col = '#d8d0c0') {
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n * (edge.length - 1), k = Math.min(edge.length - 2, Math.floor(s)), f = s - k, a = edge[k], b = edge[k + 1];
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / tl, uy = (b[1] - a[1]) / tl;
    const h = len * (0.65 + 0.35 * Math.sin(Math.PI * (i + 0.5) / n)) * (0.8 + r() * 0.4), w = h * 0.16, lean = (r() - 0.5) * 0.4;
    const tx = x + (dir[0] + ux * lean) * h, ty = y + (dir[1] + uy * lean) * h;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - ux * w, y - uy * w); ctx.lineTo(tx, ty); ctx.lineTo(x + ux * w, y + uy * w); ctx.fill();
  }
}

// ---- where its lights are (body lengths): rows along the flank and the belly, and the crown ----
const LIGHTS = [];
for (let u = 0.07; u < 1.2; u += 0.028) LIGHTS.push([u, -0.012 - 0.03 * Math.max(0, 0.6 - u) - 0.01 * Math.max(0, 0.3 - u)]);
for (let u = 0.46; u < 1.05; u += 0.04) LIGHTS.push([u, 0.004 + 0.042 * Math.max(0, 0.66 - u) + 0.008]);
for (const [u, v] of [[0.035, -0.03], [0.045, -0.012], [0.06, -0.045], [0.08, -0.058]]) LIGHTS.push([u, v]);

// ---- the sprites, built the first time it is drawn ----
let SPR = null;
function sprites() {
  if (SPR) return SPR;
  const mk = (ppm, u0, u1) => {
    const L = MONSTER_LEN * ppm, c = document.createElement('canvas');
    c.width = Math.ceil((u1 - u0) * L); c.height = Math.ceil((V1 - V0) * L);
    const x = c.getContext('2d'); x.translate(-u0 * L, -V0 * L); paintHide(x, L, rng(37), ppm > 20 ? 1 : 0.7);
    // a black silhouette of the same, laid over it to darken it (cheaper than recolouring)
    const s = document.createElement('canvas'); s.width = c.width; s.height = c.height;
    const sx = s.getContext('2d'); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, s.width, s.height);
    return { c, s, ppm, u0, u1, L };
  };
  SPR = { body: mk(BODY_PPM, 0, 1.31), head: mk(HEAD_PPM, 0, HEAD_U) };
  return SPR;
}

// paint the sprites ahead of time (the first sight of it should not stutter); returns ms taken
export function prepareMonster() { const t0 = performance.now(); sprites(); return performance.now() - t0; }

// erratic flicker, smooth enough not to strobe: two random levels a step apart, eased between
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function flicker(k, t, rate) {
  const x = t * rate + k * 3.7, i = Math.floor(x), f = x - i, e = f * f * (3 - 2 * f);
  return hash(i + k * 17) * (1 - e) + hash(i + 1 + k * 17) * e;
}

// Draws the animal. alpha: how much of it shows; jaw 0..1 open; dim 0..1 brightness (1 = as painted;
// less darkens it, for when it is drawn over an already lit scene). Returns, in local pixels: eye,
// the mouth (where something reaching out of it starts), and its lights [x, y, kind].
export function drawMonster(ctx, Lp, t, alpha, jaw = 0, dim = 1, flick = 0) {
  const S = sprites();
  FLICK = clamp(flick, 0, 1);
  const open = Math.max(0.025 + 0.012 * Math.sin(t * 0.3), clamp(jaw, 0, 1));
  const L = Lp, P = (u, v) => [u * L, v * L + wave(u, t) * L];
  const H = P(...HINGE), th = -open * 1.15, J = (u, v) => rot(P(u, v), th, H);
  const jl = JAW_LIP.map(([u, v]) => J(u, v)), ju = JAW_UNDER.map(([u, v]) => J(u, v));
  const shadeK = 1 - clamp(dim, 0, 1);
  const dc = (r, g, b) => `rgb(${Math.round(r * dim)},${Math.round(g * dim)},${Math.round(b * dim)})`;
  const out = { eye: P(...MONSTER_EYE), mouth: P(0.06, 0.02 + open * 0.02), lights: [] };
  if (alpha <= 0.002) return out;
  ctx.save(); ctx.globalAlpha = alpha;
  // ---- the sack: black skin slung from the jaw back to the belly; it balloons as the jaw drops ----
  const base = P(...SACK_BASE), sag = L * (0.03 + open * 0.16);
  const back = ju.slice().reverse().map((p, i, a) => { const f = i / (a.length - 1); return [p[0] + (base[0] - p[0]) * (1 - f) * 0.6, p[1] + sag * Math.sin(Math.PI * (0.15 + 0.85 * f)) * (0.35 + 0.65 * (1 - f))]; });
  const sack = smooth([...ju, base, ...back]);
  const sg = ctx.createLinearGradient(0, H[1], 0, H[1] + sag);
  sg.addColorStop(0, dc(26, 18, 24)); sg.addColorStop(1, dc(open > 0.3 ? 40 : 20, open > 0.3 ? 24 : 14, open > 0.3 ? 34 : 18));
  ctx.fillStyle = sg; ctx.fill(sack);
  if (open > 0.15) {
    // folds, and the veins that carry its light (lit live along these lines)
    ctx.save(); ctx.clip(sack);
    ctx.strokeStyle = `rgba(0,0,0,${(0.5 - open * 0.3).toFixed(3)})`; ctx.lineWidth = L * 0.002;
    for (let k = 0; k < 9; k++) { const x = ju[0][0] + (k + 0.5) / 9 * (base[0] - ju[0][0]); ctx.beginPath(); ctx.moveTo(x, H[1]); ctx.quadraticCurveTo(x + L * 0.01, H[1] + sag * 0.5, x - L * 0.005, H[1] + sag * 0.9); ctx.stroke(); }
    ctx.strokeStyle = `rgba(150,30,40,${(0.25 * open * dim).toFixed(3)})`; ctx.lineWidth = L * 0.0012;
    for (let k = 0; k < 7; k++) { const x0 = ju[1][0] + k / 6 * (base[0] - ju[1][0]) * 0.8; ctx.beginPath(); ctx.moveTo(x0, H[1] + sag * 0.15); ctx.bezierCurveTo(x0 + L * 0.01, H[1] + sag * 0.4, x0 - L * 0.012, H[1] + sag * 0.6, x0 + L * 0.004, H[1] + sag * 0.85); ctx.stroke(); }
    ctx.restore();
    for (let k = 0; k < 7; k++) for (let j = 1; j <= 3; j++) { const x0 = ju[1][0] + k / 6 * (base[0] - ju[1][0]) * 0.8; out.lights.push([x0 + (j === 2 ? -L * 0.003 : L * 0.002), H[1] + sag * (0.2 + j * 0.2), 'vein']); }
  }
  // ---- the body, in strips so the tail can whip; then the head, sharper, over it ----
  const B = S.body, bs = L / B.L;
  // each strip sheared to follow the wave from its front edge to its back, so the strips join
  const strip = (u0, u1) => {
    const sx = u0 * B.L, sw = (u1 - u0) * B.L + 1.5, d0 = wave(u0, t) * L, d1 = wave(u1, t) * L;
    ctx.save(); ctx.translate(u0 * L, d0); ctx.transform(1, (d1 - d0) / ((u1 - u0) * L), 0, 1, 0, 0);
    ctx.drawImage(B.c, sx, 0, sw, B.c.height, 0, V0 * L, sw * bs, B.c.height * bs);
    if (shadeK > 0.01) { ctx.globalAlpha = alpha * shadeK; ctx.drawImage(B.s, sx, 0, sw, B.c.height, 0, V0 * L, sw * bs, B.c.height * bs); }
    ctx.restore();
  };
  strip(0.38, 0.45);
  for (let u = 0.45; u < 1.31; u += 0.025) strip(u, Math.min(1.31, u + 0.025));
  const Hs = S.head, hs = L / Hs.L;
  ctx.drawImage(Hs.c, 0, V0 * L, Hs.c.width * hs, Hs.c.height * hs);
  if (shadeK > 0.01) { ctx.globalAlpha = alpha * shadeK; ctx.drawImage(Hs.s, 0, V0 * L, Hs.c.width * hs, Hs.c.height * hs); ctx.globalAlpha = alpha; }
  // ---- the jaw: a long thin bone, needle teeth pointing up into the gap ----
  const jawP = smooth([...jl, ...ju.slice().reverse()]);
  ctx.fillStyle = dc(35, 26, 34); ctx.fill(jawP);
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = L * 0.0014; ctx.stroke(smooth(jl, false));
  ctx.strokeStyle = `rgba(140,110,140,${(0.25 * dim).toFixed(3)})`; ctx.lineWidth = L * 0.0012; ctx.stroke(smooth(ju, false));
  needles(ctx, jl, [Math.sin(th), -Math.cos(th)], 40, L * (0.004 + open * 0.002), rng(5), dc(216, 208, 192));
  ctx.restore();
  // its lights, where they are this frame, and its spine (for the haze round it)
  for (const [u, v] of LIGHTS) out.lights.push([...P(u, v), 'body']);
  out.spine = [];
  for (let u = 0.05; u < 1.15; u += 0.08) { const top = TOP.find(([uu]) => uu >= u) || TOP[TOP.length - 1]; out.spine.push([...P(u, -0.01), Math.max(L * 0.012, -top[1] * L)]); }
  for (let k = 1; k < JAW_LIP.length - 1; k++) { const [u, v] = JAW_UNDER[k]; out.lights.push([...J(u, v - 0.004), 'jaw']); }
  return out;
}

// the far-off shape (sonar ghosts and the like): just the silhouette, at a small size
export function drawMonsterShape(ctx, Lp, t, alpha) {
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(-Lp * 0.6, 0);
  const L = Lp, P = (u, v) => [u * L, v * L + wave(u, t) * L];
  ctx.fillStyle = '#000'; ctx.fill(smooth([...TOP, ...UNDER, ...LIP].map(([u, v]) => P(u, v))));
  ctx.restore();
}

// ---- its light, drawn after the darkness (additive) ----
// A soft glow sprite per colour, so a hundred lights cost a hundred drawImage calls.
const GLOW = {};
function glowSprite(col) {
  if (GLOW[col]) return GLOW[col];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.22, `rgba(${col},0.7)`); g.addColorStop(0.55, `rgba(${col},0.22)`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (GLOW[col] = c);
}
const RED = '255,40,24', RED_CORE = '255,170,140', BLUE = '90,170,255', EYE = '255,30,20';
// info: what drawMonster returned; at(x, y): local px to screen; ppm: pixels a metre.
// L: { body 0..1 (its lights), eye 0..1, flash 0..1 (the blue), reduce (fewer, softer flashes) }
export function drawMonsterLights(ctx, info, at, ppm, t, L) {
  const prev = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  const rate = L.reduce ? 1.2 : 9;                  // how fast the lights stutter
  const surge = L.reduce ? 0.85 : 0.55 + 0.45 * flicker(99, t, 2.5); // the whole animal brightens and dims
  const red = glowSprite(RED), core = glowSprite(RED_CORE), blue = glowSprite(BLUE);
  // a dim red haze along the whole animal, breathing with the surge, so it reads as one glowing body
  if (L.flash > 0.01 && info.spine) {
    info.spine.forEach(([lx, ly, w]) => { const [x, y] = at(lx, ly), r = w * 2; ctx.globalAlpha = Math.min(1, L.flash * (L.reduce ? 0.25 : 0.5)); ctx.drawImage(blue, x - r * 1.3, y - r * 0.8, r * 2.6, r * 1.6); });
  }
  if (L.body > 0.01 && info.spine) {
    const haze = glowSprite('200,20,16');
    info.spine.forEach(([lx, ly, w], k) => {
      const [x, y] = at(lx, ly), r = w * (1.6 + 0.2 * flicker(k + 50, t, rate * 0.3));
      ctx.globalAlpha = Math.min(1, L.body * surge * 0.3); ctx.drawImage(haze, x - r * 1.3, y - r * 0.8, r * 2.6, r * 1.6);
    });
  }
  info.lights.forEach(([lx, ly, kind], k) => {
    const [x, y] = at(lx, ly);
    if (L.flash > 0.01) {
      const r = Math.max(ppm * (kind === 'vein' ? 1.6 : 2.6), 12) * (0.8 + 0.4 * L.flash);
      ctx.globalAlpha = Math.min(1, L.flash * (L.reduce ? 0.5 : 1)); ctx.drawImage(blue, x - r, y - r, r * 2, r * 2);
    }
    if (L.body > 0.01) {
      // each one stutters on its own; now and then a light goes out altogether
      let f = flicker(k, t, rate * (0.7 + (k % 5) * 0.15));
      f = f < 0.22 && !L.reduce ? 0 : f;
      const a = L.body * (0.25 + 0.95 * f) * surge * (kind === 'vein' ? 0.9 : 1);
      if (a < 0.02) return;
      const r = Math.max(ppm * (kind === 'vein' ? 1.1 : 1.7), 9) * (0.7 + 0.5 * f);
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(red, x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = Math.min(1, a * 0.8); const rc = r * 0.28; ctx.drawImage(core, x - rc, y - rc, rc * 2, rc * 2);
    }
  });
  // the eyes: a near one, and the far one a little behind and above it
  if (L.eye > 0.01) {
    const pulse = L.reduce ? 0.9 + 0.1 * Math.sin(t * 2) : 0.75 + 0.25 * flicker(7, t, 6);
    const [ex, ey] = at(info.eye[0], info.eye[1]);
    const far = at(info.eye[0] + ppm * 0.9, info.eye[1] - ppm * 0.4);
    for (const [x, y, s] of [[far[0], far[1], 0.6], [ex, ey, 1]]) {
      // (softer since v2: a smaller, fainter haze; the eye reads by its hot centre, not a wash of red)
      const k = L.eye * pulse * s, r = ppm * (0.6 + 1.9 * L.eye) * s;
      ctx.globalAlpha = Math.min(1, k * 0.3); ctx.drawImage(glowSprite(EYE), x - r * 1.7, y - r * 1.7, r * 3.4, r * 3.4); // the haze round it
      ctx.globalAlpha = Math.min(1, k * 0.65); ctx.drawImage(glowSprite(EYE), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = Math.min(1, k); const rc = ppm * (0.18 + 0.25 * L.eye) * s; ctx.drawImage(core, x - rc, y - rc, rc * 2, rc * 2); // the hot centre
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = prev;
}
