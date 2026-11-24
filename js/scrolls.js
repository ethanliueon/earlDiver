// (5.8.0) Ability scrolls, (5.7.7) drawn rather than built from shapes: every edge carries a slight hand wobble, the
// vellum has grain and wear, the rolls swell and taper, and each family's emblem is a small illustration (a flying
// fish, a hand net, a sailfish, a lit flare, a conch shell, a roped anchor, an eye over a breaking wave), each shape
// shaded in two tones with a cut highlight and a dark edge that thickens on its shadow side. The body's colour is the
// rarity (rare a deep sea blue, exotic a dark plum, legendary a smoky bronze with gold leaf); a plus tier has double
// bands. Painted once per size and kept.
const TAU = Math.PI * 2;

export const ABILITY_FAMILIES = ['sprint', 'vigor', 'dash', 'flare', 'echo', 'ironhull', 'tidewarden', 'dauntless'];
export const ACCENT = { sprint: '#a6e6f2', vigor: '#9ad690', dash: '#efe0b8', flare: '#f6b45c', echo: '#f0c8a8', ironhull: '#c6cfd4', tidewarden: '#8cc2f4', dauntless: '#c8d2d6' };
const BODY = {
  rare: { mid: '#2e4c70', dark: '#15253a', light: '#4d739c' },
  exotic: { mid: '#4c2d58', dark: '#25142c', light: '#714b83' },
  legendary: { mid: '#7a5524', dark: '#38230c', light: '#b48a46' },
};
const INK = '#1a1418';
let MASK = false; // (5.7.7) drawing an emblem as a stencil (one flat colour) for the foil stamping
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const shade = (hex, k) => { const [r, g, b] = hexRgb(hex), f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k); return `rgb(${f(r)},${f(g)},${f(b)})`; };

// a closed outline through points, smoothed, every point nudged a little by hand
function wobbly(pts, r, amt = 0.7) {
  const q = pts.map(([a, b]) => [a + (r() - 0.5) * 2 * amt, b + (r() - 0.5) * 2 * amt]), p = new Path2D(), n = q.length;
  const mid = (i) => [(q[i][0] + q[(i + 1) % n][0]) / 2, (q[i][1] + q[(i + 1) % n][1]) / 2];
  const m0 = mid(n - 1); p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(i); p.quadraticCurveTo(q[i][0], q[i][1], m[0], m[1]); }
  p.closePath(); return p;
}
// points along a straight run, so a long edge can wobble along its length
const along = (a, b, steps) => Array.from({ length: steps }, (_, i) => [a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]);

// a shape painted as an illustrator would: a two-tone fill (light from the upper left), a soft highlight inside its
// upper edge, a darker rim at its lower right, and the dark edge
function paintShape(x, path, col, box = [-24, -24, 24, 24], edge = 2.6) {
  if (MASK) { x.fillStyle = '#fff'; x.fill(path); return; }
  const [x0, y0, x1, y1] = box, g = x.createLinearGradient(x0, y0, x1 * 0.6, y1);
  g.addColorStop(0, shade(col, 0.32)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.38));
  x.save(); x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 3; x.shadowOffsetY = 1.5; x.fillStyle = g; x.fill(path); x.restore();
  x.save(); x.clip(path);
  x.lineWidth = edge * 1.6; x.strokeStyle = 'rgba(255,252,236,0.5)'; x.translate(1.4, 1.6); x.stroke(path); x.translate(-1.4, -1.6); // the lit inner edge
  x.lineWidth = edge * 2.2; x.strokeStyle = 'rgba(0,0,0,0.28)'; x.translate(-1.6, -1.8); x.stroke(path); // the shadowed inner edge
  x.restore();
  x.lineWidth = edge; x.strokeStyle = INK; x.stroke(path);
}
// a tapered crescent: a swoosh of moving water
function swoosh(cx, cy, r, a0, a1, w) {
  const p = new Path2D(), am = (a0 + a1) / 2;
  p.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
  p.quadraticCurveTo(cx + Math.cos(am) * (r + w) * 1.08, cy + Math.sin(am) * (r + w) * 1.08, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
  p.quadraticCurveTo(cx + Math.cos(am) * r * 1.02, cy + Math.sin(am) * r * 1.02, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
  p.closePath(); return p;
}

// the family's emblem, about ±24 units round 0,0
export function drawEmblem(x, fam, col = ACCENT[fam] || '#e8e0c8') {
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  const r = rnd(fam.length * 31 + 5);
  if (fam === 'sprint') { // a flying fish leaping clear, wings spread, water streaming off it
    for (const [rr, a0, a1, w, al] of [[20, 2.5, 3.5, 4, 0.55], [14, 2.6, 3.6, 3.2, 0.75]]) { x.globalAlpha = al; paintShape(x, swoosh(4, 2, rr, a0, a1, w), shade(col, -0.1), undefined, 1.8); }
    x.globalAlpha = 1;
    const wing = new Path2D(); wing.moveTo(-2, -2); wing.bezierCurveTo(-8, -20, 6, -24, 12, -18); wing.bezierCurveTo(8, -12, 6, -6, 4, -1); wing.closePath(); paintShape(x, wing, shade(col, -0.15));
    const body = new Path2D(); body.moveTo(20, -8); body.bezierCurveTo(12, -12, -2, -6, -12, 2); body.lineTo(-20, -2); body.lineTo(-17, 6); body.lineTo(-21, 12); body.lineTo(-11, 7); body.bezierCurveTo(0, 8, 12, 2, 20, -8); body.closePath(); paintShape(x, body, col);
    x.fillStyle = INK; x.beginPath(); x.ellipse(14, -7.5, 1.6, 1.8, 0, 0, TAU); x.fill();
  } else if (fam === 'vigor') { // a hand net held out, its mesh bag full of water, its reach rippling out
    for (const [rr, al] of [[24, 0.4], [19, 0.65]]) { x.globalAlpha = al; paintShape(x, swoosh(-4, -6, rr, -0.9, 0.5, 3), shade(col, -0.05), undefined, 1.6); }
    x.globalAlpha = 1;
    const pole = new Path2D(); pole.moveTo(-22, 20); pole.quadraticCurveTo(-14, 10, -6, 3); pole.lineTo(-3.5, 5.5); pole.quadraticCurveTo(-11, 13, -19, 23); pole.closePath(); paintShape(x, pole, '#c9a874', undefined, 2);
    const bag = new Path2D(); bag.moveTo(-6, -4); bag.bezierCurveTo(-8, 10, 4, 20, 12, 16); bag.bezierCurveTo(18, 12, 18, 0, 14, -8); bag.closePath(); paintShape(x, bag, shade(col, -0.2));
    x.save(); x.clip(bag); x.strokeStyle = 'rgba(20,30,20,0.55)'; x.lineWidth = 1; for (let k = -20; k < 30; k += 4.5) { x.beginPath(); x.moveTo(k - 10, -10); x.quadraticCurveTo(k, 4, k + 6, 20); x.stroke(); x.beginPath(); x.moveTo(k + 16, -10); x.quadraticCurveTo(k + 6, 4, k, 20); x.stroke(); } x.restore();
    const hoop = new Path2D(); hoop.ellipse(4, -6, 11.5, 6, -0.45, 0, TAU); hoop.ellipse(4, -6, 8.5, 3.6, -0.45, 0, TAU, true); paintShape(x, hoop, col, undefined, 2.2);
  } else if (fam === 'dash') { // a sailfish lunging, its sail raised, its bill ahead
    for (const [y0, l, al] of [[-6, 14, 0.5], [3, 18, 0.7], [11, 12, 0.5]]) { x.globalAlpha = al; const p = new Path2D(); p.moveTo(-14, y0 - 1.8); p.quadraticCurveTo(-14 - l * 0.6, y0 - 0.6, -14 - l, y0); p.quadraticCurveTo(-14 - l * 0.6, y0 + 0.6, -14, y0 + 1.8); p.closePath(); paintShape(x, p, shade(col, -0.1), undefined, 1.4); }
    x.globalAlpha = 1;
    const sail = new Path2D(); sail.moveTo(-8, -1); sail.bezierCurveTo(-10, -16, 2, -22, 10, -12); sail.lineTo(8, -2); sail.closePath(); paintShape(x, sail, shade(col, -0.25));
    x.save(); x.clip(sail); x.strokeStyle = 'rgba(30,20,10,0.4)'; x.lineWidth = 1; for (let k = -8; k < 10; k += 3.5) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 3, -20); x.stroke(); } x.restore();
    const body = new Path2D(); body.moveTo(25, 0); body.lineTo(14, -2.5); body.bezierCurveTo(6, -6, -6, -4, -14, 0); body.lineTo(-20, -6); body.lineTo(-17, 1); body.lineTo(-21, 8); body.lineTo(-13, 3); body.bezierCurveTo(-4, 6, 8, 5, 14, 1.5); body.closePath(); paintShape(x, body, col);
    x.fillStyle = INK; x.beginPath(); x.ellipse(10, -1.2, 1.4, 1.5, 0, 0, TAU); x.fill();
  } else if (fam === 'flare') { // a hand flare burning: the tube, the flame, the sparks thrown off it
    const tube = new Path2D(); tube.moveTo(-10, 22); tube.quadraticCurveTo(-12, 10, -6, 2); tube.lineTo(1, 5); tube.quadraticCurveTo(-4, 13, -3, 24); tube.closePath(); paintShape(x, tube, '#c45a3e', undefined, 2.2);
    const fl = new Path2D(); fl.moveTo(-2, 4); fl.bezierCurveTo(-16, -4, -6, -14, -4, -22); fl.bezierCurveTo(0, -14, 6, -18, 6, -24); fl.bezierCurveTo(14, -14, 14, -2, 2, 6); fl.closePath(); paintShape(x, fl, col);
    const inner = new Path2D(); inner.moveTo(-1, 2); inner.bezierCurveTo(-8, -4, -3, -9, -2, -14); inner.bezierCurveTo(2, -9, 6, -10, 6, -14); inner.bezierCurveTo(9, -6, 7, -1, 1, 3); inner.closePath(); x.fillStyle = '#fff2c8'; x.fill(inner);
    for (const [sx, sy, s] of [[12, -20, 2.4], [16, -10, 1.8], [-14, -16, 2], [10, -28, 1.4]]) { const p = new Path2D(); p.moveTo(sx, sy - s * 1.8); p.quadraticCurveTo(sx + s, sy, sx, sy + s); p.quadraticCurveTo(sx - s, sy, sx, sy - s * 1.8); x.fillStyle = col; x.fill(p); x.lineWidth = 1.2; x.strokeStyle = INK; x.stroke(p); }
  } else if (fam === 'echo') { // a conch shell, held to the ear of the sea: the sound coming back out of it in soft rings
    for (const [rr, al] of [[22, 0.4], [17, 0.65]]) { x.globalAlpha = al; paintShape(x, swoosh(-10, 6, rr, -1.3, -0.1, 3.2), '#bfe6e2', undefined, 1.6); }
    x.globalAlpha = 1;
    const sh = new Path2D(); sh.moveTo(-18, 14); sh.bezierCurveTo(-22, 0, -10, -18, 6, -20); sh.bezierCurveTo(14, -20, 22, -14, 20, -6); sh.bezierCurveTo(18, 4, 8, 6, 4, 14); sh.bezierCurveTo(0, 20, -12, 20, -18, 14); sh.closePath(); paintShape(x, sh, col);
    x.save(); x.clip(sh); x.strokeStyle = 'rgba(120,60,40,0.55)'; x.lineWidth = 1.6; for (const [a, b, c2] of [[-12, 10, 6], [-6, 2, 9], [0, -6, 11], [6, -13, 9]]) { x.beginPath(); x.arc(a, b, c2, -2.4, 0.2); x.stroke(); } x.restore();
    const mouth = new Path2D(); mouth.moveTo(-14, 12); mouth.bezierCurveTo(-10, 4, -2, 6, 0, 12); mouth.bezierCurveTo(-4, 16, -10, 16, -14, 12); mouth.closePath(); x.fillStyle = '#e88c78'; x.fill(mouth); x.lineWidth = 1.6; x.strokeStyle = INK; x.stroke(mouth);
    for (const [kx, ky] of [[4, -21], [12, -20], [19, -12]]) { const p = new Path2D(); p.moveTo(kx - 2.4, ky + 1); p.lineTo(kx, ky - 4); p.lineTo(kx + 2.4, ky + 1); p.closePath(); x.fillStyle = shade(col, -0.1); x.fill(p); x.lineWidth = 1.2; x.strokeStyle = INK; x.stroke(p); }
  } else if (fam === 'ironhull') { // an anchor with a rope wound round its shank
    const ring = new Path2D(); ring.ellipse(0, -18, 5.5, 5.5, 0, 0, TAU); ring.ellipse(0, -18, 3, 3, 0, 0, TAU, true); paintShape(x, ring, col, undefined, 2);
    const stock = new Path2D(); stock.moveTo(-12, -11); stock.quadraticCurveTo(0, -13.5, 12, -11); stock.lineTo(12, -7.5); stock.quadraticCurveTo(0, -10, -12, -7.5); stock.closePath(); paintShape(x, stock, shade(col, -0.1), undefined, 2);
    const shank = new Path2D(); shank.moveTo(-2.6, -12); shank.lineTo(2.6, -12); shank.quadraticCurveTo(3.4, 4, 2.4, 16); shank.lineTo(-2.4, 16); shank.quadraticCurveTo(-3.4, 4, -2.6, -12); shank.closePath(); paintShape(x, shank, col, undefined, 2);
    const crown = new Path2D(); crown.moveTo(-18, 6); crown.quadraticCurveTo(-14, 20, 0, 20); crown.quadraticCurveTo(14, 20, 18, 6); crown.lineTo(22, 10); crown.lineTo(20, 2); crown.lineTo(14, 4); crown.quadraticCurveTo(10, 15, 0, 15); crown.quadraticCurveTo(-10, 15, -14, 4); crown.lineTo(-20, 2); crown.lineTo(-22, 10); crown.closePath(); paintShape(x, crown, col);
    const rope = new Path2D(); rope.moveTo(-6, -4); rope.bezierCurveTo(10, -2, 8, 4, -6, 5); rope.bezierCurveTo(-12, 6, 10, 10, 6, 13); x.lineWidth = 4.8; x.strokeStyle = INK; x.stroke(rope); x.lineWidth = 2.6; x.strokeStyle = '#d2b07a'; x.stroke(rope);
    x.setLineDash([1.5, 2.5]); x.lineWidth = 2.6; x.strokeStyle = 'rgba(90,60,30,0.6)'; x.stroke(rope); x.setLineDash([]);
  } else if (fam === 'tidewarden') { // an eye, its lid half down, over a breaking wave
    const wave = new Path2D(); wave.moveTo(-24, 20); wave.bezierCurveTo(-18, 10, -8, 6, 2, 10); wave.bezierCurveTo(10, 13, 12, 6, 8, 3); wave.bezierCurveTo(16, 2, 22, 10, 24, 20); wave.closePath(); paintShape(x, wave, shade(col, -0.15));
    x.save(); x.clip(wave); x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 1.2; for (const k of [12, 16]) { x.beginPath(); x.moveTo(-24, k + 4); x.bezierCurveTo(-12, k - 2, 4, k + 2, 24, k + 1); x.stroke(); } x.restore();
    const eye = new Path2D(); eye.moveTo(-21, -6); eye.bezierCurveTo(-10, -20, 10, -20, 21, -6); eye.bezierCurveTo(10, 4, -10, 4, -21, -6); eye.closePath(); paintShape(x, eye, '#efe8d4');
    x.save(); x.clip(eye); const ir = x.createRadialGradient(-1, -9, 1, 0, -7, 9); ir.addColorStop(0, shade(col, 0.3)); ir.addColorStop(1, shade(col, -0.4)); x.fillStyle = ir; x.beginPath(); x.ellipse(0, -7, 8, 8, 0, 0, TAU); x.fill();
    x.fillStyle = INK; x.beginPath(); x.ellipse(0, -7, 2.2, 5.4, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(-2.6, -10, 1.6, 1.3, 0, 0, TAU); x.fill();
    const lid = new Path2D(); lid.moveTo(-22, -6); lid.bezierCurveTo(-10, -20, 10, -20, 22, -6); lid.bezierCurveTo(10, -12, -10, -12, -22, -6); lid.closePath(); x.fillStyle = shade(col, -0.45); x.fill(lid); x.restore();
    const lash = new Path2D(); lash.moveTo(-21, -6); lash.bezierCurveTo(-10, -12, 10, -12, 21, -6); x.lineWidth = 2.6; x.strokeStyle = INK; x.stroke(lash); x.lineWidth = 2.6; x.stroke(eye);
  }
  void r; x.restore();
}

// one scroll, painted into a box of ±50 units
function paintScroll(x, fam, tier) {
  const B = BODY[tier] || BODY.rare, acc = ACCENT[fam] || '#e8e0c8', r = rnd(fam.length * 97 + tier.length * 13), plus = tier === 'exotic', gold = tier === 'legendary';
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.fillStyle = 'rgba(0,0,0,0.32)'; x.beginPath(); x.ellipse(0, 47, 42, 5.5, 0, 0, TAU); x.fill();
  // a roll: it swells a little in the middle and its end shows the turns of the sheet
  const roll = (x0, x1, y, rad, endAtLeft) => {
    const top = along([x0 + rad * 0.3, y - rad], [x1 - rad * 0.3, y - rad * 1.06], 6), bot = along([x1 - rad * 0.3, y + rad * 1.04], [x0 + rad * 0.3, y + rad], 6);
    const body = wobbly([...top, [x1, y], ...bot, [x0, y]], r, 0.5);
    const g = x.createLinearGradient(0, y - rad, 0, y + rad); g.addColorStop(0, shade(B.mid, 0.15)); g.addColorStop(0.3, shade(B.light, 0.18)); g.addColorStop(0.55, B.mid); g.addColorStop(1, B.dark);
    x.fillStyle = g; x.fill(body);
    x.save(); x.clip(body);
    for (const [a, b] of bandsX) { const bandP = wobbly([[a, y - rad - 2], [b, y - rad - 2], [b + 0.6, y + rad + 2], [a - 0.4, y + rad + 2]], r, 0.4); x.fillStyle = shade(acc, -0.18); x.fill(bandP); }
    const hl = x.createLinearGradient(0, y - rad, 0, y); hl.addColorStop(0, 'rgba(255,250,230,0)'); hl.addColorStop(0.5, 'rgba(255,250,230,0.28)'); hl.addColorStop(1, 'rgba(255,250,230,0)'); x.fillStyle = hl; x.fillRect(x0, y - rad * 0.8, x1 - x0, rad * 0.6);
    x.restore();
    x.lineWidth = 2.2; x.strokeStyle = INK; x.stroke(body);
    const ex = endAtLeft ? x0 + 1 : x1 - 1, cap = wobbly(Array.from({ length: 10 }, (_, i) => [ex + Math.cos(i / 10 * TAU) * rad * 0.52, y + Math.sin(i / 10 * TAU) * rad * 0.98]), r, 0.35);
    x.fillStyle = shade(gold ? '#c8a050' : B.light, -0.1); x.fill(cap); x.stroke(cap);
    x.strokeStyle = shade(B.dark, 0.05); x.lineWidth = 1.4; x.beginPath();
    for (let a = 0.3; a < TAU * 2.3; a += 0.18) { const rr = rad * (0.12 + a / (TAU * 2.7)); const px = ex + Math.cos(a + 1) * rr * 0.5, py = y + Math.sin(a + 1) * rr * 0.95; if (a === 0.3) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
  };
  const bandsX = [[-30, -23], [20, 27]].concat(plus ? [[-20, -18], [16, 18]] : []);
  roll(-36, 44, -32, 11, false);
  // the sheet: wobbly sides, a slight waist
  const left = along([-37, -25], [-38, 28], 7).map(([a, b], i) => [a + Math.sin(i * 0.9) * 0.9 + 1.2 * Math.sin(Math.PI * i / 7), b]);
  const right = along([33, 28], [35, -25], 7).map(([a, b], i) => [a - 1.2 * Math.sin(Math.PI * i / 7), b]);
  const sheet = wobbly([...left, ...along([-38, 28], [33, 28], 5), ...right, ...along([35, -25], [-37, -25], 5)], r, 0.6);
  const sg = x.createLinearGradient(-38, -10, 36, 10); sg.addColorStop(0, B.dark); sg.addColorStop(0.18, B.mid); sg.addColorStop(0.46, shade(B.light, 0.1)); sg.addColorStop(0.62, B.light); sg.addColorStop(0.86, B.mid); sg.addColorStop(1, B.dark);
  x.fillStyle = sg; x.fill(sheet);
  x.save(); x.clip(sheet);
  // the vellum's grain: short fibres, a few creases
  for (let i = 0; i < 90; i++) { const fx = -38 + r() * 74, fy = -26 + r() * 54, l = 2 + r() * 5; x.strokeStyle = r() < 0.5 ? 'rgba(255,248,226,0.08)' : 'rgba(0,0,0,0.1)'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + (r() - 0.5) * 1.5, fy + l); x.stroke(); }
  x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-36, 4 + r() * 4); x.bezierCurveTo(-10, 0, 10, 10, 34, 6); x.stroke();
  x.strokeStyle = 'rgba(255,250,230,0.1)'; x.beginPath(); x.moveTo(-36, 5.5); x.bezierCurveTo(-10, 1.5, 10, 11.5, 34, 7.5); x.stroke();
  // the bands down it, their edges not quite straight
  for (const [a, b] of bandsX) { const band = wobbly([...along([a, -30], [a - 0.6, 32], 5), ...along([b + 0.3, 32], [b, -30], 5)], r, 0.45);
    const bg = x.createLinearGradient(a, 0, b, 0); bg.addColorStop(0, shade(acc, -0.3)); bg.addColorStop(0.45, acc); bg.addColorStop(1, shade(acc, -0.3)); x.fillStyle = bg; x.fill(band); }
  // salt stains: soft blotches with a darker tide line
  for (let i = 0; i < 4; i++) { const sx = -30 + r() * 60, sy = -18 + r() * 40, sr = 4 + r() * 6; const st = wobbly(Array.from({ length: 9 }, (_, k) => [sx + Math.cos(k / 9 * TAU) * sr * (0.8 + r() * 0.4), sy + Math.sin(k / 9 * TAU) * sr * 0.7 * (0.8 + r() * 0.4)]), r, 0.4); x.fillStyle = 'rgba(255,248,226,0.06)'; x.fill(st); x.lineWidth = 0.8; x.strokeStyle = 'rgba(0,0,0,0.12)'; x.stroke(st); }
  const tg = x.createLinearGradient(0, -25, 0, -14); tg.addColorStop(0, 'rgba(0,0,0,0.45)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(-40, -26, 80, 12);
  const bgr = x.createLinearGradient(0, 28, 0, 17); bgr.addColorStop(0, 'rgba(0,0,0,0.4)'); bgr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bgr; x.fillRect(-40, 17, 80, 12);
  // the emblem's place: a soft pale bloom, as if the ink sat on lighter vellum
  const em = x.createRadialGradient(-2, 1, 2, -2, 1, 22); em.addColorStop(0, 'rgba(255,248,226,0.16)'); em.addColorStop(1, 'rgba(255,248,226,0)'); x.fillStyle = em; x.fillRect(-26, -22, 48, 46);
  x.restore();
  x.lineWidth = 2.2; x.strokeStyle = INK; x.stroke(sheet);
  if (gold) { x.save(); x.clip(sheet); x.lineWidth = 3; x.strokeStyle = '#d6ae5a'; x.stroke(sheet); x.lineWidth = 1; x.strokeStyle = 'rgba(255,240,190,0.7)'; x.stroke(sheet); x.restore(); }
  x.save(); x.translate(-2, 1); x.scale(0.82, 0.82); drawEmblem(x, fam, acc); x.restore();
  roll(-46, 34, 33, 12, true);
}

const cache = new Map();
// the scroll for an ability; size = its height in pixels
export function drawScroll(ctx, cx, cy, size, fam, tier = 'rare') {
  const key = `${fam}|${tier}|${Math.round(size)}`;
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(size); const x = c.getContext('2d'), k = size / 104; x.translate(size / 2, size / 2); x.scale(k, k); paintScroll(x, fam, tier); cache.set(key, c); if (cache.size > 120) cache.delete(cache.keys().next().value); }
  ctx.drawImage(c, cx - c.width / 2, cy - c.height / 2);
}
export function scrollURL(fam, tier, px = 160) { const c = document.createElement('canvas'); c.width = c.height = px; drawScroll(c.getContext('2d'), px / 2, px / 2, px, fam, tier); return c.toDataURL('image/png'); }

// ---------- (5.7.7) the second look: foil-stamped, no outlines, grained vellum, ornate legendaries ----------
// the emblem as a stencil: everything drawn in one flat white (the details cut into it come out dark, then are knocked
// out so they read as engraving in the foil)
function emblemMask(fam, size) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.translate(size / 2, size / 2); x.scale(size / 60, size / 60);
  MASK = true; try { drawEmblem(x, fam, '#ffffff'); } finally { MASK = false; }
  // turn the drawing into a pure stencil: whatever is light becomes solid, dark details become holes
  const d = x.getImageData(0, 0, size, size), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const lum = (a[i] + a[i + 1] + a[i + 2]) / 3, al = a[i + 3] / 255; const v = lum > 140 ? al : 0; a[i] = a[i + 1] = a[i + 2] = 255; a[i + 3] = Math.round(v * 255); }
  x.putImageData(d, 0, 0); return c;
}
const FOIL = {
  rare: ['#f0c49a', '#c47e4c', '#7a4424', '#f6d8b8'],      // copper
  exotic: ['#f4f6fa', '#b8c0cc', '#6c7482', '#ffffff'],    // silver
  legendary: ['#fff0b8', '#e2b450', '#8a5a18', '#fffbe6'], // gold
};
let NOISE = null;
function noisePattern(x) {
  if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 96; const n = NOISE.getContext('2d'), d = n.createImageData(96, 96), r = rnd(4242); for (let i = 0; i < d.data.length; i += 4) { const v = 110 + r() * 50; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } n.putImageData(d, 0, 0); }
  return x.createPattern(NOISE, 'repeat');
}
// stamp a stencil in foil: pressed in (a dark rim below it, a lit one above), metallic, with an optional glow
function stampFoil(x, mask, cx, cy, w, tier, glow) {
  const F = FOIL[tier] || FOIL.rare, s = w;
  const tint = (cols) => { const c = document.createElement('canvas'); c.width = c.height = mask.width; const t = c.getContext('2d'); t.drawImage(mask, 0, 0); t.globalCompositeOperation = 'source-in';
    if (Array.isArray(cols)) { const g = t.createLinearGradient(0, 0, mask.width * 0.7, mask.height); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); t.fillStyle = g; } else t.fillStyle = cols; t.fillRect(0, 0, c.width, c.height); return c; };
  const dark = tint('rgba(10,6,4,0.75)'), lit = tint('rgba(255,250,235,0.55)'), metal = tint([F[3], F[0], F[1], F[2], F[1], F[0]]);
  x.save();
  if (glow) { x.shadowColor = glow; x.shadowBlur = s * 0.22; x.drawImage(tint(glow), cx - s / 2, cy - s / 2, s, s); x.shadowBlur = 0; }
  x.drawImage(dark, cx - s / 2 + s * 0.012, cy - s / 2 + s * 0.022, s, s);   // pressed: shadow below
  x.drawImage(lit, cx - s / 2 - s * 0.01, cy - s / 2 - s * 0.016, s, s);     // and a lit lip above
  x.drawImage(metal, cx - s / 2, cy - s / 2, s, s);
  // a sheen running across the metal
  const sh = document.createElement('canvas'); sh.width = sh.height = mask.width; const t = sh.getContext('2d'); t.drawImage(mask, 0, 0); t.globalCompositeOperation = 'source-in';
  const sg = t.createLinearGradient(0, 0, mask.width, mask.height); sg.addColorStop(0.3, 'rgba(255,255,255,0)'); sg.addColorStop(0.42, 'rgba(255,255,255,0.55)'); sg.addColorStop(0.5, 'rgba(255,255,255,0)'); t.fillStyle = sg; t.fillRect(0, 0, sh.width, sh.height);
  x.drawImage(sh, cx - s / 2, cy - s / 2, s, s);
  x.restore();
}
// gold filigree: curling tendrils along the inside of the sheet's border (the legendary's)
function filigree(x, r) {
  const curl = (sx, sy, dir, k) => { const p = new Path2D(); p.moveTo(sx, sy); p.bezierCurveTo(sx + dir * 6 * k, sy - 2 * k, sx + dir * 9 * k, sy + 5 * k, sx + dir * 5 * k, sy + 7 * k); p.bezierCurveTo(sx + dir * 2 * k, sy + 8 * k, sx + dir * 1 * k, sy + 4 * k, sx + dir * 3.5 * k, sy + 3.5 * k); return p; };
  const vine = new Path2D(); vine.moveTo(-31, -20); vine.bezierCurveTo(-29, -6, -33, 8, -31, 22); vine.moveTo(27, -20); vine.bezierCurveTo(29, -6, 25, 8, 27, 22);
  const paths = [vine]; for (const [sx, sy, dir] of [[-31, -16, 1], [-31.5, -4, 1], [-32, 8, 1], [-31, 18, 1], [27, -14, -1], [27.5, -2, -1], [26.5, 10, -1], [27, 19, -1]]) paths.push(curl(sx, sy, dir, 0.9 + r() * 0.3));
  x.save(); x.lineCap = 'round';
  x.lineWidth = 2.2; x.strokeStyle = 'rgba(20,10,0,0.45)'; x.translate(0.5, 0.8); for (const p of paths) x.stroke(p); x.translate(-0.5, -0.8);
  const g = x.createLinearGradient(-35, -25, 30, 25); g.addColorStop(0, '#fff0b8'); g.addColorStop(0.4, '#e2b450'); g.addColorStop(0.7, '#9a6a20'); g.addColorStop(1, '#f2d27a');
  x.lineWidth = 1.5; x.strokeStyle = g; x.shadowColor = 'rgba(255,214,120,0.6)'; x.shadowBlur = 3; for (const p of paths) x.stroke(p);
  x.restore();
}
function paintScroll2(x, fam, tier) {
  const B = BODY[tier] || BODY.rare, acc = ACCENT[fam] || '#e8e0c8', r = rnd(fam.length * 97 + tier.length * 13), plus = tier === 'exotic', gold = tier === 'legendary';
  const edge = shade(B.dark, -0.35);
  x.lineJoin = 'round'; x.lineCap = 'round';
  // a halo behind a legendary
  if (gold) { const hg = x.createRadialGradient(0, 0, 10, 0, 0, 52); hg.addColorStop(0, 'rgba(255,214,120,0.42)'); hg.addColorStop(0.6, 'rgba(255,200,100,0.12)'); hg.addColorStop(1, 'rgba(255,200,100,0)'); x.fillStyle = hg; x.fillRect(-52, -52, 104, 104); }
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(0, 46, 42, 5, 0, 0, TAU); x.fill();
  const bandsX = [[-30, -24], [20, 26]].concat(plus ? [[-21, -19.5], [16.5, 18]] : []);
  const grain = noisePattern(x);
  const roll = (x0, x1, y, rad, endAtLeft) => {
    const top = along([x0 + rad * 0.3, y - rad], [x1 - rad * 0.3, y - rad * 1.04], 6), bot = along([x1 - rad * 0.3, y + rad * 1.03], [x0 + rad * 0.3, y + rad], 6);
    const body = wobbly([...top, [x1, y], ...bot, [x0, y]], r, 0.4);
    const g = x.createLinearGradient(0, y - rad, 0, y + rad); g.addColorStop(0, shade(B.mid, 0.08)); g.addColorStop(0.28, shade(B.light, 0.22)); g.addColorStop(0.5, B.mid); g.addColorStop(0.85, B.dark); g.addColorStop(1, shade(B.dark, -0.3));
    x.fillStyle = g; x.fill(body);
    x.save(); x.clip(body);
    for (const [a, b] of bandsX) { const bp = wobbly([[a, y - rad - 2], [b, y - rad - 2], [b + 0.5, y + rad + 2], [a - 0.3, y + rad + 2]], r, 0.35); const bg = x.createLinearGradient(0, y - rad, 0, y + rad); bg.addColorStop(0, shade(acc, -0.1)); bg.addColorStop(0.3, shade(acc, 0.2)); bg.addColorStop(1, shade(acc, -0.55)); x.fillStyle = bg; x.fill(bp); }
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.5; x.fillStyle = grain; x.fillRect(x0 - 2, y - rad - 2, x1 - x0 + 4, rad * 2 + 4); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.restore();
    x.lineWidth = 1.2; x.strokeStyle = edge; x.stroke(body);
    const ex = endAtLeft ? x0 + 1 : x1 - 1, cap = wobbly(Array.from({ length: 10 }, (_, i) => [ex + Math.cos(i / 10 * TAU) * rad * 0.5, y + Math.sin(i / 10 * TAU) * rad * 0.97]), r, 0.3);
    const cg = x.createRadialGradient(ex - rad * 0.15, y - rad * 0.3, 1, ex, y, rad); if (gold) { cg.addColorStop(0, '#fff0b8'); cg.addColorStop(0.5, '#d8a848'); cg.addColorStop(1, '#6a4410'); } else { cg.addColorStop(0, shade(B.light, 0.25)); cg.addColorStop(1, shade(B.dark, -0.1)); }
    x.fillStyle = cg; x.fill(cap); x.lineWidth = 1; x.strokeStyle = edge; x.stroke(cap);
    x.strokeStyle = gold ? 'rgba(90,56,10,0.7)' : 'rgba(0,0,0,0.35)'; x.lineWidth = 0.9; x.beginPath();
    for (let a = 0.3; a < TAU * 2.3; a += 0.16) { const rr = rad * (0.12 + a / (TAU * 2.7)); const px = ex + Math.cos(a + 1) * rr * 0.48, py = y + Math.sin(a + 1) * rr * 0.93; if (a === 0.3) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
  };
  roll(-36, 44, -32, 11, false);
  const left = along([-37, -25], [-38, 28], 7).map(([a, b], i) => [a + 1.2 * Math.sin(Math.PI * i / 7), b]);
  const right = along([33, 28], [35, -25], 7).map(([a, b], i) => [a - 1.2 * Math.sin(Math.PI * i / 7), b]);
  const sheet = wobbly([...left, ...along([-38, 28], [33, 28], 5), ...right, ...along([35, -25], [-37, -25], 5)], r, 0.5);
  const sg = x.createLinearGradient(-38, -12, 36, 14); sg.addColorStop(0, shade(B.dark, -0.2)); sg.addColorStop(0.16, B.mid); sg.addColorStop(0.44, shade(B.light, 0.06)); sg.addColorStop(0.6, B.light); sg.addColorStop(0.86, B.mid); sg.addColorStop(1, shade(B.dark, -0.2));
  x.fillStyle = sg; x.fill(sheet);
  x.save(); x.clip(sheet);
  for (const [a, b] of bandsX) { const band = wobbly([...along([a, -30], [a - 0.5, 32], 5), ...along([b + 0.3, 32], [b, -30], 5)], r, 0.35);
    const bg = x.createLinearGradient(a, 0, b, 0); bg.addColorStop(0, shade(acc, -0.45)); bg.addColorStop(0.4, shade(acc, -0.05)); bg.addColorStop(0.6, acc); bg.addColorStop(1, shade(acc, -0.45)); x.fillStyle = bg; x.fill(band); }
  // the grain over everything, then soft light and shade: lit from the upper left, darker toward the rolls
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.55; x.fillStyle = grain; x.fillRect(-40, -28, 80, 60); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const lt = x.createRadialGradient(-10, -14, 4, -4, 0, 46); lt.addColorStop(0, 'rgba(255,250,232,0.16)'); lt.addColorStop(1, 'rgba(0,0,0,0.22)'); x.fillStyle = lt; x.fillRect(-40, -28, 80, 60);
  for (let i = 0; i < 3; i++) { const sx = -26 + r() * 52, sy = -16 + r() * 36, sr = 5 + r() * 6; const st = wobbly(Array.from({ length: 9 }, (_, k) => [sx + Math.cos(k / 9 * TAU) * sr * (0.8 + r() * 0.4), sy + Math.sin(k / 9 * TAU) * sr * 0.7 * (0.8 + r() * 0.4)]), r, 0.4); x.fillStyle = 'rgba(255,246,222,0.05)'; x.fill(st); x.lineWidth = 0.7; x.strokeStyle = 'rgba(0,0,0,0.1)'; x.stroke(st); }
  const tg = x.createLinearGradient(0, -25, 0, -13); tg.addColorStop(0, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(-40, -26, 80, 13);
  const bgr = x.createLinearGradient(0, 28, 0, 16); bgr.addColorStop(0, 'rgba(0,0,0,0.45)'); bgr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bgr; x.fillRect(-40, 16, 80, 13);
  if (gold) filigree(x, r);
  x.restore();
  x.lineWidth = 1.2; x.strokeStyle = edge; x.stroke(sheet);
  // the emblem, stamped in foil (copper, silver, gold); the exotic's and legendary's glowing in the family's colour
  stampFoil(x, emblemMask(fam, 240), -2, 1, 44, tier, gold ? acc : plus ? 'rgba(220,200,255,0.55)' : null);
  if (gold) for (let i = 0; i < 9; i++) { const a = r() * TAU, d = 16 + r() * 18, mx = -2 + Math.cos(a) * d, my = 1 + Math.sin(a) * d * 0.8, mr = 0.8 + r() * 1.6; const mg = x.createRadialGradient(mx, my, 0, mx, my, mr * 3); mg.addColorStop(0, 'rgba(255,246,210,0.95)'); mg.addColorStop(1, 'rgba(255,220,140,0)'); x.fillStyle = mg; x.beginPath(); x.arc(mx, my, mr * 3, 0, TAU); x.fill(); }
  roll(-46, 34, 33, 12, true);
}
// (5.7.7) the second look is the one used
export function drawScroll2(ctx, cx, cy, size, fam, tier = 'rare') {
  const key = `2|${fam}|${tier}|${Math.round(size)}`;
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(size); const x = c.getContext('2d'), k = size / 104; x.translate(size / 2, size / 2); x.scale(k, k); paintScroll2(x, fam, tier); cache.set(key, c); }
  ctx.drawImage(c, cx - c.width / 2, cy - c.height / 2);
}

// ---------- (5.7.8) the third look: old and matte, like the references ----------
// solid paint, softly shaded, faded and worn: dust in the grain, edges darkened by handling, paint chipped through to
// the base, creases across the sheet. Rarity in the cloth and trim, not in shine: rare a muted sea blue, exotic a deep
// plum with an extra pair of thin bands, legendary a near-black, very old scroll with dark bronze ends, a band of
// painted wave pattern and its emblem in dull aged gold.
const BODY3 = {
  rare: { mid: '#3a5470', dark: '#22344a', light: '#557292', band: null },
  exotic: { mid: '#553a5e', dark: '#33223a', light: '#71537a', band: null },
  legendary: { mid: '#2e2829', dark: '#171314', light: '#463d3c', band: '#a8874a' },
  mythical: { mid: '#4a1c18', dark: '#22090a', light: '#6c2a22', band: '#b85a36' }, // (7.4.15) oxblood
};
const fade = (hex, k) => { const [r, g, b] = hexRgb(hex), gr = (r + g + b) / 3, f = (c) => Math.round(c + (gr - c) * k).toString(16).padStart(2, '0'); return `#${f(r)}${f(g)}${f(b)}`; };
function paintScroll3(x, fam, tier) {
  const B = BODY3[tier] || BODY3.rare, r = rnd(fam.length * 131 + tier.length * 17), plus = tier === 'exotic', my = tier === 'mythical', leg = tier === 'legendary' || my;
  const acc0 = my ? '#e8956a' : leg ? '#c4a05a' : (ACCENT[fam] || '#e8e0c8'), acc = fade(acc0, my ? 0.12 : 0.28), bandCol = my ? '#9a3e26' : leg ? '#8a6a34' : fade(ACCENT[fam] || '#e8e0c8', 0.32);
  const edgeCol = shade(B.dark, -0.4), grain = noisePattern(x);
  x.lineJoin = 'round'; x.lineCap = 'round';
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(0, 46, 42, 5, 0, 0, TAU); x.fill();
  const bandsX = [[-30, -23], [19, 26]].concat(plus ? [[-20, -18.5], [15.5, 17]] : []);
  // dust and wear laid over a filled region: grain multiplied in, edges darkened, chips through to a pale base
  const age = (clipPath, x0, y0, w, h, chips) => {
    x.save(); x.clip(clipPath);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.5; x.fillStyle = grain; x.fillRect(x0, y0, w, h); x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < chips; i++) { const ex = r() < 0.5 ? r() * 0.18 : 1 - r() * 0.18, cx = x0 + (r() < 0.6 ? ex : r()) * w, cy = y0 + r() * h, cr = 0.4 + r() * 1.1; const ch = wobbly(Array.from({ length: 6 }, (_, k) => [cx + Math.cos(k / 6 * TAU) * cr * (0.6 + r() * 0.8), cy + Math.sin(k / 6 * TAU) * cr * (0.6 + r() * 0.8)]), r, 0.2); x.fillStyle = 'rgba(200,186,156,0.16)'; x.fill(ch); }
    x.restore();
  };
  // (7.4.20, owner) a roll is a cylinder of the sheet's own paper: shaded round (dark top edge, a lit band, the underside
  // dark with a little light thrown back), its far end curving away, and its near end open to show the paper wound on
  // itself, layer on layer, spiralling in to a dark core, the edges catching the light (gilded on a legendary or
  // mythical). The sheet comes out from under it
  const roll = (x0, x1, y, rad, endAtLeft) => {
    const ex = endAtLeft ? x0 : x1, fx = endAtLeft ? x1 : x0, rx = rad * 0.42, dir = endAtLeft ? -1 : 1;
    const body = new Path2D(); body.moveTo(fx, y - rad); body.lineTo(ex, y - rad * 1.02); body.lineTo(ex, y + rad * 1.02); body.lineTo(fx, y + rad);
    body.ellipse(fx, y, rx, rad, 0, Math.PI / 2, Math.PI * 1.5, dir > 0); body.closePath(); // the far end, its curve
    const g = x.createLinearGradient(0, y - rad, 0, y + rad); g.addColorStop(0, shade(B.dark, -0.2)); g.addColorStop(0.18, B.mid); g.addColorStop(0.32, shade(B.light, 0.12)); g.addColorStop(0.5, B.mid); g.addColorStop(0.82, B.dark); g.addColorStop(1, shade(B.mid, -0.15));
    x.fillStyle = g; x.fill(body);
    x.save(); x.clip(body);
    for (const [ba, bb] of bandsX) { const bp = wobbly([[ba, y - rad - 2], [bb, y - rad - 2], [bb + 0.5, y + rad + 2], [ba - 0.3, y + rad + 2]], r, 0.35); const bg = x.createLinearGradient(0, y - rad, 0, y + rad); bg.addColorStop(0, shade(bandCol, -0.35)); bg.addColorStop(0.32, shade(bandCol, 0.15)); bg.addColorStop(0.6, bandCol); bg.addColorStop(1, shade(bandCol, -0.5)); x.fillStyle = bg; x.fill(bp); }
    x.strokeStyle = 'rgba(255,250,235,0.22)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(fx, y - rad * 0.42); x.lineTo(ex, y - rad * 0.44); x.stroke(); // the shine along it
    x.restore();
    age(body, Math.min(x0, x1) - 2, y - rad - 2, Math.abs(x1 - x0) + 4, rad * 2 + 4, 10);
    x.lineWidth = 1.1; x.strokeStyle = edgeCol; x.stroke(body);
    // the open end: the paper wound round, layer on layer
    const face = new Path2D(); face.ellipse(ex, y, rx, rad * 1.02, 0, 0, TAU);
    const fg = x.createRadialGradient(ex - dir * rx * 0.3, y - rad * 0.35, 0.5, ex, y, rad); fg.addColorStop(0, shade(B.light, 0.25)); fg.addColorStop(0.6, B.mid); fg.addColorStop(1, shade(B.dark, -0.1)); x.fillStyle = fg; x.fill(face);
    x.save(); x.clip(face);
    const gild = leg ? (my ? 'rgba(240,150,100,' : 'rgba(226,190,120,') : 'rgba(255,248,230,';
    for (let k = 0; k < 7; k++) { const q = 1 - k / 7.5, a0 = k * 0.9; // each turn of the paper: its edge lit on the upper side, shadowed under
      x.strokeStyle = `rgba(0,0,0,${(0.28 + k * 0.03).toFixed(2)})`; x.lineWidth = 0.9; x.beginPath(); x.ellipse(ex + dir * (1 - q) * rx * 0.25, y + (1 - q) * rad * 0.08, rx * q, rad * q, 0, a0, a0 + TAU * 0.92); x.stroke();
      x.strokeStyle = gild + (0.35 + 0.25 * q).toFixed(2) + ')'; x.lineWidth = 0.6; x.beginPath(); x.ellipse(ex + dir * (1 - q) * rx * 0.25, y + (1 - q) * rad * 0.08 - 0.5, rx * q, rad * q, 0, Math.PI * 1.05, Math.PI * 1.75); x.stroke(); }
    x.fillStyle = 'rgba(8,5,3,0.85)'; x.beginPath(); x.ellipse(ex + dir * rx * 0.22, y + rad * 0.08, rx * 0.16, rad * 0.2, 0, 0, TAU); x.fill(); // the hollow core
    x.restore();
    x.lineWidth = 1; x.strokeStyle = edgeCol; x.stroke(face);
    x.strokeStyle = 'rgba(255,250,235,0.3)'; x.lineWidth = 0.9; x.beginPath(); x.ellipse(ex, y, rx, rad * 1.02, 0, Math.PI * 1.1, Math.PI * 1.65); x.stroke(); // the lit lip
  };
  // the sheet first; the rolls are laid over its ends, so it comes out from under each of them
  const rolls = () => { roll(-36, 44, -33, 11.5, false); };
  const left = along([-37, -25], [-38, 28], 7).map(([a, b], i) => [a + 1.2 * Math.sin(Math.PI * i / 7), b]);
  const right = along([33, 28], [35, -25], 7).map(([a, b], i) => [a - 1.2 * Math.sin(Math.PI * i / 7), b]);
  const sheet = wobbly([...left, ...along([-38, 28], [33, 28], 5), ...right, ...along([35, -25], [-37, -25], 5)], r, 0.5);
  const sg = x.createLinearGradient(-38, 0, 36, 0); sg.addColorStop(0, B.dark); sg.addColorStop(0.2, B.mid); sg.addColorStop(0.55, B.light); sg.addColorStop(0.85, B.mid); sg.addColorStop(1, B.dark);
  x.fillStyle = sg; x.fill(sheet);
  x.save(); x.clip(sheet);
  for (const [a, b] of bandsX) { const band = wobbly([...along([a, -30], [a - 0.5, 32], 5), ...along([b + 0.3, 32], [b, -30], 5)], r, 0.35);
    const bg = x.createLinearGradient(a, 0, b, 0); bg.addColorStop(0, shade(bandCol, -0.3)); bg.addColorStop(0.5, bandCol); bg.addColorStop(1, shade(bandCol, -0.3)); x.fillStyle = bg; x.fill(band);
    // a legendary's bands carry a painted wave pattern, worn
    if (leg && b - a > 4) { x.save(); x.clip(band); x.strokeStyle = 'rgba(40,26,10,0.7)'; x.lineWidth = 1; const mx = (a + b) / 2; for (let yy = -28; yy < 32; yy += 5) { x.beginPath(); x.moveTo(a, yy + 2); x.quadraticCurveTo(mx, yy - 2.5, b, yy + 2); x.stroke(); } x.restore(); }
  }
  // creases: a dark fold and its lit edge beside it
  for (const [y0, y1] of [[-6 + r() * 4, 2 + r() * 4], [12 + r() * 3, 8 + r() * 4]]) { x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(-38, y0); x.bezierCurveTo(-12, y0 - 2, 10, y1 + 3, 36, y1); x.stroke(); x.strokeStyle = 'rgba(255,248,230,0.12)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(-38, y0 + 1.3); x.bezierCurveTo(-12, y0 - 0.7, 10, y1 + 4.3, 36, y1 + 1.3); x.stroke(); }
  // handling: the edges and corners darker
  const vg = x.createRadialGradient(-2, 2, 14, -2, 2, 46); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)'); x.fillStyle = vg; x.fillRect(-40, -28, 80, 60);
  const tg = x.createLinearGradient(0, -25, 0, -14); tg.addColorStop(0, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(-40, -26, 80, 12);
  const bgr = x.createLinearGradient(0, 28, 0, 17); bgr.addColorStop(0, 'rgba(0,0,0,0.42)'); bgr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bgr; x.fillRect(-40, 17, 80, 12);
  x.restore();
  age(sheet, -40, -28, 80, 60, 26);
  x.lineWidth = 1.1; x.strokeStyle = edgeCol; x.stroke(sheet);
  // (7.4.19) a mythical's sheet: an ember-gilt border inside its edge, a second fine line within it, small corner knots
  if (my) { x.save(); x.clip(sheet); x.strokeStyle = 'rgba(232,140,90,0.8)'; x.lineWidth = 1.4; x.strokeRect(-33.5, -21.5, 64, 46); x.strokeStyle = 'rgba(232,140,90,0.4)'; x.lineWidth = 0.7; x.strokeRect(-31, -19, 59, 41);
    x.fillStyle = 'rgba(240,160,110,0.85)'; for (const [cx, cy] of [[-33.5, -21.5], [30.5, -21.5], [-33.5, 24.5], [30.5, 24.5]]) { x.beginPath(); x.arc(cx, cy, 1.8, 0, TAU); x.fill(); } x.restore(); }
  // the emblem: painted on, solid, softly shaded, the paint worn in places
  { const m = emblemMask2(fam, tier, 288) /* (7.4.19) a mythical has its own picture */, size = 58, c = document.createElement('canvas'); c.width = c.height = m.width; const t = c.getContext('2d');
    t.drawImage(m, 0, 0); t.globalCompositeOperation = 'source-in'; const eg = t.createLinearGradient(0, 0, 0, c.height); eg.addColorStop(0, shade(acc, 0.16)); eg.addColorStop(0.55, acc); eg.addColorStop(1, shade(acc, -0.32)); t.fillStyle = eg; t.fillRect(0, 0, c.width, c.height);
    t.globalCompositeOperation = 'destination-out'; const rr2 = rnd(fam.length * 7 + 3); for (let i = 0; i < 70; i++) { t.globalAlpha = 0.25 + rr2() * 0.6; t.beginPath(); t.arc(rr2() * c.width, rr2() * c.height, 1 + rr2() * 4, 0, TAU); t.fill(); } t.globalAlpha = 1;
    x.save(); x.globalAlpha = 0.55; x.drawImage((() => { const d = document.createElement('canvas'); d.width = d.height = m.width; const u = d.getContext('2d'); u.drawImage(m, 0, 0); u.globalCompositeOperation = 'source-in'; u.fillStyle = 'rgba(0,0,0,1)'; u.fillRect(0, 0, d.width, d.height); return d; })(), -2 - size / 2 + 0.8, 1 - size / 2 + 1.2, size, size); x.restore(); // the paint's thickness: a soft shadow under it
    x.drawImage(c, -2 - size / 2, 1 - size / 2, size, size); }
  rolls(); roll(-46, 34, 35, 12.5, true);
  // (7.4.20, owner) a mythical's seal: hot wax pressed onto the sheet's corner over two ribbon tails. An uneven pool with
  // a raised rim (lit above, shadowed below), the stamp's disc pressed into it, and the heart embossed in that, its
  // upper edges catching the light. Still warm: an ember glow round it and a few sparks lifting off
  if (my) { x.save(); x.translate(24, 21);
    const gl = x.createRadialGradient(0, 0, 4, 0, 0, 18); gl.addColorStop(0, 'rgba(255,110,60,0.42)'); gl.addColorStop(1, 'rgba(255,110,60,0)'); x.fillStyle = gl; x.fillRect(-18, -18, 36, 36);
    for (const [dx, a] of [[-4, 0.45], [4, -0.35]]) { const rb = new Path2D(); rb.moveTo(dx - 2.6, 3); rb.lineTo(dx + 2.6, 3); rb.lineTo(dx + 3.4 + a * 4, 15); rb.lineTo(dx + a * 4, 12.4); rb.lineTo(dx - 3.4 + a * 4, 15); rb.closePath();
      const rg = x.createLinearGradient(dx - 3, 0, dx + 3, 0); rg.addColorStop(0, '#3e0e08'); rg.addColorStop(0.5, '#7a2416'); rg.addColorStop(1, '#3e0e08'); x.fillStyle = rg; x.fill(rb); }
    const seal = wobbly(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * TAU, rr = 9.6 + (r() - 0.5) * 2.6 + (i % 5 === 2 ? 1.4 : 0); return [Math.cos(a) * rr, Math.sin(a) * rr]; }), r, 0.5);
    x.fillStyle = 'rgba(20,4,2,0.5)'; x.save(); x.translate(0.8, 1.2); x.fill(seal); x.restore(); // its shadow on the paper
    const sg2 = x.createRadialGradient(-3.5, -3.5, 0.5, 0, 0, 11); sg2.addColorStop(0, '#d0503a'); sg2.addColorStop(0.55, '#962a1c'); sg2.addColorStop(1, '#561510'); x.fillStyle = sg2; x.fill(seal);
    x.lineWidth = 1.2; x.strokeStyle = 'rgba(255,180,150,0.35)'; x.save(); x.clip(seal); x.beginPath(); x.arc(-0.6, -0.8, 9.2, Math.PI * 0.95, Math.PI * 1.75); x.stroke(); x.strokeStyle = 'rgba(30,6,4,0.5)'; x.beginPath(); x.arc(0.6, 0.8, 9.2, Math.PI * 0.0, Math.PI * 0.7); x.stroke(); x.restore();
    // the stamp's pressed disc: a step down into the wax
    const dg = x.createRadialGradient(1, 1, 1, 0, 0, 7); dg.addColorStop(0, '#8a2618'); dg.addColorStop(1, '#6a1c12'); x.fillStyle = dg; x.beginPath(); x.arc(0, 0, 6.8, 0, TAU); x.fill();
    x.lineWidth = 1; x.strokeStyle = 'rgba(30,6,4,0.65)'; x.beginPath(); x.arc(0, 0, 6.8, Math.PI * 1.0, Math.PI * 1.8); x.stroke(); x.strokeStyle = 'rgba(255,170,140,0.45)'; x.beginPath(); x.arc(0, 0, 6.8, Math.PI * 0.05, Math.PI * 0.8); x.stroke();
    const heart = (ox, oy, sc) => { const h = new Path2D(); h.moveTo(ox, oy + 3.9 * sc); h.bezierCurveTo(ox - 2.2 * sc, oy + 2.2 * sc, ox - 4.4 * sc, oy + 0.6 * sc, ox - 4.4 * sc, oy - 1.3 * sc); h.bezierCurveTo(ox - 4.4 * sc, oy - 3.4 * sc, ox - 1.5 * sc, oy - 3.8 * sc, ox, oy - 1.8 * sc); h.bezierCurveTo(ox + 1.5 * sc, oy - 3.8 * sc, ox + 4.4 * sc, oy - 3.4 * sc, ox + 4.4 * sc, oy - 1.3 * sc); h.bezierCurveTo(ox + 4.4 * sc, oy + 0.6 * sc, ox + 2.2 * sc, oy + 2.2 * sc, ox, oy + 3.9 * sc); h.closePath(); return h; };
    x.fillStyle = 'rgba(30,6,4,0.7)'; x.fill(heart(0.55, 0.65, 1)); x.fillStyle = 'rgba(255,190,160,0.55)'; x.fill(heart(-0.45, -0.5, 1)); // embossed: shadow below, light above
    const hg = x.createLinearGradient(-4, -4, 4, 4); hg.addColorStop(0, '#e86448'); hg.addColorStop(1, '#a8301e'); x.fillStyle = hg; x.fill(heart(0, 0, 1));
    x.fillStyle = 'rgba(255,220,200,0.55)'; x.beginPath(); x.ellipse(-2.2, -1.8, 1.1, 0.6, -0.6, 0, TAU); x.fill(); // the shine on its lobe
    for (const [ex2, ey2, er] of [[-6, -10, 0.9], [3, -12.5, 0.7], [8, -9, 0.6], [-1, -15, 0.5]]) { x.fillStyle = 'rgba(255,170,100,0.85)'; x.beginPath(); x.arc(ex2, ey2, er, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,120,60,0.25)'; x.beginPath(); x.arc(ex2, ey2, er * 2.6, 0, TAU); x.fill(); } // sparks lifting off
    x.restore(); }
}
export function drawScroll3(ctx, cx, cy, size, fam, tier = 'rare') {
  const key = `3|${fam}|${tier}|${Math.round(size)}`;
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(size); const x = c.getContext('2d'), k = size / 104; x.translate(size / 2, size / 2); x.scale(k, k); paintScroll3(x, fam, tier); cache.set(key, c); }
  ctx.drawImage(c, cx - c.width / 2, cy - c.height / 2);
}
// (5.7.8) a legendary's motes: slow sparks of old gold drifting up round it, wherever it is shown. Call each frame
// with the time; state is a small array kept by the caller
// (6.0.10) a glint, the one spark every legendary gives off: a small hot core and two thin crossed streaks (the long one
// level, as light catches an edge), sharp at the tips, warm gold fading to nothing. k: 0..1 how bright, sz its reach
export function glint(ctx, px, py, sz, k, rot = 0, col = [255, 222, 150]) {
  if (k <= 0.01) return; const [r0, g0, b0] = col, c = (a) => `rgba(${r0},${g0},${b0},${a.toFixed(3)})`;
  ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
  const ray = (len, wid) => { const g = ctx.createLinearGradient(-len, 0, len, 0); g.addColorStop(0, c(0)); g.addColorStop(0.5, c(k)); g.addColorStop(1, c(0)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -wid, len, 0); ctx.quadraticCurveTo(0, wid, -len, 0); ctx.fill(); };
  ray(sz * 2.4, sz * 0.16); ctx.rotate(Math.PI / 2); ray(sz * 1.3, sz * 0.13); ctx.rotate(-Math.PI / 4); ray(sz * 0.7, sz * 0.08); ctx.rotate(Math.PI / 2); ray(sz * 0.7, sz * 0.08);
  const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 0.7); hg.addColorStop(0, `rgba(255,250,236,${k.toFixed(3)})`); hg.addColorStop(0.35, c(k * 0.5)); hg.addColorStop(1, c(0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, sz * 0.7, 0, TAU); ctx.fill();
  ctx.restore();
}
export function legendMotes(ctx, cx, cy, w, h, t, seed = 1) {
  // (6.0.10) glints, not soft dots: each drifts up slowly and flares once on the way (a quick rise, a slow fade), turning a little
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const r = rnd(seed * 31 + i * 7), ph = (t * (0.18 + r() * 0.12) + r()) % 1, px = cx + (r() - 0.5) * w * 0.9 + Math.sin(t * 1.3 + i) * w * 0.04, py = cy + h * 0.45 - ph * h * 1.05;
    const fl = ph < 0.18 ? ph / 0.18 : Math.pow(1 - (ph - 0.18) / 0.82, 1.6), a = fl * (0.6 + r() * 0.4), sz = Math.max(2.2, Math.min(w, h) * (0.03 + r() * 0.03));
    glint(ctx, px, py, sz, a, (r() - 0.5) * 0.5 + t * 0.15 * (r() - 0.5)); }
  ctx.restore();
}

// ---------- (5.7.9) emblems by tier: the same idea, richer as the rarity rises ----------
// drawn as a stencil: white is paint, black lines are cut through it (engraving). Rare: one bold silhouette.
// Exotic: the motif with a second element and inner detail, in a painted ring. Legendary: a small composition in an
// ornamented medallion (a rope border, flourishes), the motif engraved in fine detail.
function emblemTier(x, fam, tier) {
  const W = '#ffffff', K = '#000000', exo = tier === 'exotic';
  const F = (p) => { x.fillStyle = W; x.fill(p); };
  const D = (p, w = 1.4) => { x.lineWidth = w; x.strokeStyle = K; x.stroke(p); };
  const S = (p, w = 2) => { x.lineWidth = w; x.strokeStyle = W; x.stroke(p); };
  const P = () => new Path2D();
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  const ring = () => { const p = P(); p.arc(0, 0, 25.5, 0, TAU); S(p, 2.4); };
  const medallion = () => {
    const o = P(); o.arc(0, 0, 27, 0, TAU); S(o, 3.4);
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, t = P(); t.moveTo(Math.cos(a) * 25.6, Math.sin(a) * 25.6); t.lineTo(Math.cos(a + 0.07) * 28.4, Math.sin(a + 0.07) * 28.4); D(t, 0.9); } // the rope's twist
    const i2 = P(); i2.arc(0, 0, 23, 0, TAU); S(i2, 1.1);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { x.save(); x.rotate(a); const l = P(); l.moveTo(0, -27); l.bezierCurveTo(-3.5, -30, -2, -33, 0, -33.5); l.bezierCurveTo(2, -33, 3.5, -30, 0, -27); F(l); x.restore(); } // small leaf flourishes
  };
  const fish = (sx = 1, detail = 0) => { // a flying fish's body and wing, facing right
    const wing = P(); wing.moveTo(-2, -2); wing.bezierCurveTo(-8, -20 * sx, 6, -24 * sx, 13, -18 * sx); wing.bezierCurveTo(9, -12, 6, -6, 4, -1); wing.closePath(); F(wing);
    const b = P(); b.moveTo(21, -8); b.bezierCurveTo(12, -13, -2, -7, -12, 2); b.lineTo(-21, -3); b.lineTo(-17, 6); b.lineTo(-22, 13); b.lineTo(-11, 7); b.bezierCurveTo(0, 9, 13, 2, 21, -8); b.closePath(); F(b);
    const eye = P(); eye.arc(15, -7.5, 1.6, 0, TAU); x.fillStyle = K; x.fill(eye);
    if (detail >= 1) { for (let k = 0; k < 4; k++) { const v = P(); v.moveTo(0, -2); v.quadraticCurveTo(2 + k * 2.5, -10 - k, 6 + k * 2.2, -16 - k * 0.5); D(v, 0.9); } const gl = P(); gl.moveTo(11, -11); gl.quadraticCurveTo(10, -6, 12, -3); D(gl, 1.1); }
    if (detail >= 2) { for (let k = 0; k < 5; k++) { const sc = P(); sc.arc(4 - k * 3.4, -1.5 + k * 0.6, 2.4, -1, 1); D(sc, 0.8); } const ln = P(); ln.moveTo(10, -4); ln.bezierCurveTo(2, -1, -6, 2, -12, 4); D(ln, 0.7); }
  };
  const swoosh2 = (cx, cy, rr, a0, a1, w) => { const p = swoosh(cx, cy, rr, a0, a1, w); F(p); };
  // (7.4.19, owner) Dauntless: an inverted triangle, the weight of the water bearing down on it, heavier as the rarity rises
  const tri = (r, cut = 0) => { const p = P(); p.moveTo(-r * 0.92, -r * 0.55); p.lineTo(r * 0.92, -r * 0.55); p.lineTo(0, r * 0.95); p.closePath(); if (cut) { p.moveTo(0, r * 0.95 - cut * 2.1); p.lineTo(r * 0.92 - cut * 1.8, -r * 0.55 + cut); p.lineTo(-r * 0.92 + cut * 1.8, -r * 0.55 + cut); p.closePath(); } return p; };
  const press = (a, r0, len, w = 2.2) => { x.save(); x.rotate(a); const sh = P(); sh.moveTo(0, -r0 - len); sh.lineTo(0, -r0 - 3); S(sh, w); const hd = P(); hd.moveTo(-3.4, -r0 - 4.5); hd.lineTo(0, -r0); hd.lineTo(3.4, -r0 - 4.5); hd.closePath(); F(hd); x.restore(); };
  const heartMark = () => { const h = P(); h.moveTo(0, 33); h.bezierCurveTo(-1.6, 31.6, -3.6, 30.6, -3.6, 28.9); h.bezierCurveTo(-3.6, 27.3, -1.4, 26.9, 0, 28.3); h.bezierCurveTo(1.4, 26.9, 3.6, 27.3, 3.6, 28.9); h.bezierCurveTo(3.6, 30.6, 1.6, 31.6, 0, 33); h.closePath(); F(h); };
  if (fam === 'dauntless' && tier !== 'mythical') {
    if (tier === 'rare') { x.translate(0, 3); F(tri(18)); for (const dx of [-9, 0, 9]) { const sh = P(); sh.moveTo(dx, -27); sh.lineTo(dx, -17); S(sh, 2.2); const hd = P(); hd.moveTo(dx - 3, -18.5); hd.lineTo(dx, -14); hd.lineTo(dx + 3, -18.5); hd.closePath(); F(hd); } }
    else if (exo) { ring(); x.translate(0, 2); const o = tri(17); S(o, 2); F(tri(12)); for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) press(a, 19, 5, 2); }
    else { medallion(); x.translate(0, 2); F(tri(19, 3.2)); F(tri(8)); for (let i = 0; i < 8; i++) press(i / 8 * TAU, 20.5, 2.5, 1.6);
      for (const sd of [-1, 1]) { const bend = P(); bend.moveTo(sd * 21, -16); bend.quadraticCurveTo(sd * 13, 2, sd * 6, 18); D(bend, 1); } }
    x.restore(); return;
  }
  // (7.4.19, owner) the mythicals' own pictures: each the legendary's idea pushed further, on the medallion, with a small
  // heart at its foot (every mythical is a Heart)
  if (tier === 'mythical') {
    medallion(); heartMark();
    if (fam === 'sprint') { // the fins at the eye of a whirlpool, the water spiralling in
      for (let k = 0; k < 3; k++) { const sp = P(); for (let a = 0; a < TAU * 1.1; a += 0.12) { const rr = 22 - a * 2.6 - k * 0.6, ph = a + k * TAU / 3, px = Math.cos(ph) * rr, py = Math.sin(ph) * rr * 0.8; a ? sp.lineTo(px, py) : sp.moveTo(px, py); } S(sp, 2.6 - k * 0.5); }
      x.save(); x.scale(0.55, 0.55); fish(1, 2); x.restore(); }
    else if (fam === 'flare') { // the lighthouse on a storm-wave rock, three beams, its lantern burning
      for (const a of [-2.6, -0.55, 1.4]) { const bm = P(); bm.moveTo(0, -13); bm.lineTo(Math.cos(a - 0.2) * 30, -13 + Math.sin(a - 0.2) * 30); bm.lineTo(Math.cos(a + 0.2) * 30, -13 + Math.sin(a + 0.2) * 30); bm.closePath(); x.globalAlpha = 0.85; F(bm); x.globalAlpha = 1; }
      const tw = P(); tw.moveTo(-5, 10); tw.lineTo(-3, -9); tw.lineTo(3, -9); tw.lineTo(5, 10); tw.closePath(); F(tw); for (const yy of [-3, 3]) { const st = P(); st.moveTo(-4.3, yy); st.lineTo(4.3, yy + 0.4); D(st, 1.8); }
      const lr = P(); lr.arc(0, -13, 4.6, 0, TAU); F(lr); const fl = P(); fl.moveTo(0, -10.5); fl.bezierCurveTo(-3, -12.5, -1, -15, 0, -17); fl.bezierCurveTo(1, -15, 3, -12.5, 0, -10.5); x.fillStyle = K; x.fill(fl);
      const wv = P(); wv.moveTo(-24, 19); wv.bezierCurveTo(-18, 8, -9, 10, -5, 12); wv.lineTo(5, 12); wv.bezierCurveTo(12, 6, 20, 8, 22, 14); wv.bezierCurveTo(17, 12, 15, 16, 19, 19); wv.closePath(); F(wv); }
    else if (fam === 'echo') { // a whale curled round a sonar ring, its call going out
      for (const rr of [8, 13]) { const r1 = P(); r1.arc(0, 0, rr, 0, TAU); S(r1, 1.3); }
      const wh = P(); wh.moveTo(-20, 6); wh.bezierCurveTo(-22, -10, -8, -21, 6, -20); wh.bezierCurveTo(16, -19, 22, -10, 19, -2); wh.bezierCurveTo(15, -11, 6, -15, -2, -14); wh.bezierCurveTo(-12, -12, -16, -2, -14, 6); wh.closePath(); F(wh);
      const tl = P(); tl.moveTo(-17, 4); tl.lineTo(-23, 12); tl.lineTo(-17, 10); tl.lineTo(-12, 15); tl.closePath(); F(tl); const ey = P(); ey.arc(12, -14, 1.3, 0, TAU); x.fillStyle = K; x.fill(ey);
      for (const [a0, rr] of [[0.2, 18], [0.1, 21.5]]) { const cw = P(); cw.arc(0, 0, rr, a0, a0 + 1.1); S(cw, 1.6); } }
    else if (fam === 'vigor') { // the net torn open by a jaw of hooked teeth
      for (const sd of [-1, 1]) { const jw = P(); jw.moveTo(-20, sd * 3); jw.quadraticCurveTo(0, sd * 22, 20, sd * 3); jw.lineTo(16, sd * 6); jw.quadraticCurveTo(0, sd * 15, -16, sd * 6); jw.closePath(); F(jw);
        for (let i = 0; i < 6; i++) { const tx = -12 + i * 4.8, ty = sd * (8 + Math.sin((i + 0.5) / 6 * Math.PI) * 4.5), th = P(); th.moveTo(tx - 1.8, ty); th.quadraticCurveTo(tx + 0.5, ty - sd * 5, tx + 2.2, ty - sd * 6.5); th.lineTo(tx + 1.8, ty); th.closePath(); F(th); } }
      for (const [x0, y0, x1, y1] of [[-8, -3, -3, 2], [2, -2, 7, 3], [-2, 0, 3, -4]]) { const st = P(); st.moveTo(x0, y0); st.lineTo(x1, y1); S(st, 1.1); } }
    else if (fam === 'dash') { // the spear splitting the sea, the crack of light behind it
      const cr = P(); cr.moveTo(-22, 16); cr.lineTo(-14, 9); cr.lineTo(-15, 4); cr.lineTo(-7, -1); cr.lineTo(-8, -6); cr.lineTo(0, -11); S(cr, 2.8); const cr2 = P(); cr2.moveTo(-14, 9); cr2.lineTo(-20, 5); cr2.moveTo(-7, -1); cr2.lineTo(-12, -5); S(cr2, 1.3);
      x.save(); x.rotate(-0.6); const sp = P(); sp.moveTo(24, 0); sp.lineTo(13, -3.4); sp.lineTo(-20, -1.2); sp.lineTo(-20, 1.2); sp.lineTo(13, 3.4); sp.closePath(); F(sp); const bd = P(); bd.moveTo(16, -3); bd.lineTo(12, -6.5); bd.moveTo(16, 3); bd.lineTo(12, 6.5); S(bd, 1.5); x.restore(); }
    else if (fam === 'tidewarden') { // a great wave curling over a closed eye
      const wv = P(); wv.moveTo(-23, 16); wv.bezierCurveTo(-24, -6, -6, -22, 12, -18); wv.bezierCurveTo(22, -15, 22, -4, 14, -2); wv.bezierCurveTo(16, -9, 10, -12, 4, -10); wv.bezierCurveTo(-6, -6, -8, 6, -2, 16); wv.closePath(); F(wv);
      for (const [cx, cy, rr] of [[14, -8, 3], [18, -12, 2]]) { const fo = P(); fo.arc(cx, cy, rr, 0, TAU); x.fillStyle = K; x.fill(fo); }
      const ey = P(); ey.moveTo(-1, 11); ey.quadraticCurveTo(8, 17, 17, 11); S(ey, 2.2); for (const lx of [2, 8, 14]) { const la = P(); la.moveTo(lx, 13.5); la.lineTo(lx - 1, 17.5); S(la, 1.4); } }
    else if (fam === 'dauntless') { // Hadal Heart: the triangle at its heaviest, cracked with light, rings pressing in from all round
      x.translate(0, 2); for (const rr of [21, 17]) { const pr = P(); pr.arc(0, 0, rr, 0, TAU); x.setLineDash([3.5, 2.6]); S(pr, 1.3); x.setLineDash([]); }
      F(tri(15)); const ck = P(); ck.moveTo(-6, -7.5); ck.lineTo(-1, -2); ck.lineTo(-3, 3); ck.lineTo(1, 8); ck.moveTo(-1, -2); ck.lineTo(5, -5); ck.moveTo(-3, 3); ck.lineTo(3, 2.5); D(ck, 1.4);
      for (let i = 0; i < 12; i++) press(i / 12 * TAU, 22.5, 2.2, 1.4); }
    else { x.save(); x.scale(0.8, 0.8); emblemTier(x, fam, 'legendary'); x.restore(); }
    x.restore(); return;
  }
  if (fam === 'sprint') {
    if (tier === 'rare') { x.scale(1.15, 1.15); fish(1, 0); }
    else if (exo) { ring(); x.save(); x.scale(0.95, 0.95); fish(1, 1); x.restore(); swoosh2(2, 4, 19, 2.3, 3.5, 3.6); swoosh2(2, 4, 13, 2.4, 3.6, 2.8); }
    else { medallion(); const wv = P(); wv.moveTo(-22, 20); wv.bezierCurveTo(-16, 8, -2, 4, 6, 10); wv.bezierCurveTo(12, 14, 14, 6, 9, 3); wv.bezierCurveTo(18, 2, 22, 12, 22, 20); wv.closePath(); F(wv);
      for (const k of [13, 17]) { const fl = P(); fl.moveTo(-20, k + 3); fl.bezierCurveTo(-10, k - 3, 4, k + 1, 21, k); D(fl, 0.9); }
      for (const [sx, sy, s] of [[-10, 2, 1.8], [-4, -2, 1.4], [-15, -2, 1.2], [16, -1, 1.5]]) { const d = P(); d.arc(sx, sy, s, 0, TAU); F(d); }
      x.save(); x.translate(2, -6); x.rotate(-0.25); x.scale(0.78, 0.78); fish(1, 2); x.restore(); }
  } else if (fam === 'vigor') {
    const hoop = (sc, mesh, fishIn) => { x.save(); x.scale(sc, sc);
      const pole = P(); pole.moveTo(-22, 21); pole.quadraticCurveTo(-14, 11, -7, 4); pole.lineTo(-3.5, 6.5); pole.quadraticCurveTo(-11, 14, -18.5, 24); pole.closePath(); F(pole);
      if (mesh) { const bag = P(); bag.moveTo(-6, -3); bag.bezierCurveTo(-8, 11, 4, 21, 12, 17); bag.bezierCurveTo(19, 13, 19, 1, 15, -7); bag.closePath(); F(bag);
        x.save(); x.clip(bag); for (let k = -20; k < 30; k += 4.2) { const m1 = P(); m1.moveTo(k - 10, -10); m1.quadraticCurveTo(k, 4, k + 6, 22); D(m1, 0.9); const m2 = P(); m2.moveTo(k + 16, -10); m2.quadraticCurveTo(k + 6, 4, k, 22); D(m2, 0.9); } x.restore();
        if (fishIn) { const f = P(); f.moveTo(12, 8); f.bezierCurveTo(8, 4, 2, 6, -1, 9); f.lineTo(-4, 6); f.lineTo(-3, 11); f.lineTo(-4, 15); f.lineTo(-1, 12); f.bezierCurveTo(2, 15, 8, 13, 12, 8); f.closePath(); x.fillStyle = K; x.fill(f); } }
      const h = P(); h.ellipse(4, -6, 12, 6.4, -0.45, 0, TAU); h.ellipse(4, -6, 8.6, 3.6, -0.45, 0, TAU, true); F(h); x.restore(); };
    if (tier === 'rare') hoop(1.15, false, false);
    else if (exo) { ring(); hoop(0.92, true, false); swoosh2(-2, -8, 21, -0.9, 0.4, 3); }
    else { medallion(); hoop(0.8, true, true); swoosh2(-2, -8, 20, -0.9, 0.4, 2.6); swoosh2(-2, -8, 15.5, -0.85, 0.35, 2.2); }
  } else if (fam === 'dash') {
    const sailfish = (detail) => {
      if (detail) { const sail = P(); sail.moveTo(-8, -1); sail.bezierCurveTo(-10, -17, 2, -23, 10, -12); sail.lineTo(8, -2); sail.closePath(); F(sail); for (let k = -6; k < 9; k += 3.2) { const ry = P(); ry.moveTo(k, -1); ry.lineTo(k + 2.4, -17 + Math.abs(k) * 0.5); D(ry, 0.8); } }
      const b = P(); b.moveTo(26, 0); b.lineTo(14, -2.6); b.bezierCurveTo(6, -6.5, -6, -4.5, -14, 0); b.lineTo(-20, -7); b.lineTo(-17, 1); b.lineTo(-21, 9); b.lineTo(-13, 3); b.bezierCurveTo(-4, 6.5, 8, 5.5, 14, 1.5); b.closePath(); F(b);
      const e = P(); e.arc(10, -1, 1.3, 0, TAU); x.fillStyle = K; x.fill(e);
      if (detail > 1) { const ln = P(); ln.moveTo(10, 1); ln.bezierCurveTo(2, 3, -6, 2.5, -13, 1); D(ln, 0.7); for (let k = 0; k < 4; k++) { const st = P(); st.moveTo(4 - k * 4, -3); st.lineTo(4 - k * 4, 2.5); D(st, 0.6); } } };
    if (tier === 'rare') { x.scale(1.1, 1.1); sailfish(0); for (const [y0, l] of [[-5, 10], [5, 12]]) { const st = P(); st.moveTo(-16, y0); st.lineTo(-16 - l, y0); S(st, 2.4); } }
    else if (exo) { ring(); x.save(); x.scale(0.92, 0.92); sailfish(1); x.restore(); for (const [y0, l] of [[-7, 8], [2, 10], [10, 7]]) { const st = P(); st.moveTo(-17, y0); st.lineTo(-17 - l, y0); S(st, 1.8); } }
    else { medallion(); const sp = P(); for (let a = 0; a < TAU * 1.6; a += 0.1) { const rr = 21 - a * 2.2; const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.75; if (a === 0) sp.moveTo(px, py); else sp.lineTo(px, py); } S(sp, 1.6);
      for (const [fx, fy, fr] of [[-15, -12, 0.6], [14, 13, 2.4], [-17, 10, 3.6], [6, -16, 5.2]]) { x.save(); x.translate(fx, fy); x.rotate(fr); const sf = P(); sf.moveTo(4, 0); sf.quadraticCurveTo(0, -2, -3, 0); sf.lineTo(-5, -2); sf.lineTo(-4.5, 0); sf.lineTo(-5, 2); sf.lineTo(-3, 0); sf.quadraticCurveTo(0, 2, 4, 0); F(sf); x.restore(); }
      x.save(); x.scale(0.72, 0.72); sailfish(2); x.restore(); }
  } else if (fam === 'flare') {
    const flame = (sc, inner) => { x.save(); x.scale(sc, sc); const fl = P(); fl.moveTo(0, 8); fl.bezierCurveTo(-14, 0, -6, -12, -4, -22); fl.bezierCurveTo(0, -14, 6, -18, 6, -25); fl.bezierCurveTo(15, -14, 14, -1, 0, 8); fl.closePath(); F(fl);
      if (inner) { const ip = P(); ip.moveTo(0, 4); ip.bezierCurveTo(-7, -1, -3, -8, -2, -13); ip.bezierCurveTo(1, -8, 5, -10, 5, -14); ip.bezierCurveTo(8, -6, 6, -1, 0, 4); D(ip, 1.1); } x.restore(); };
    if (tier === 'rare') { x.translate(0, 6); flame(1.25, false); }
    else if (exo) { ring(); const tube = P(); tube.moveTo(-9, 21); tube.quadraticCurveTo(-11, 11, -5, 3); tube.lineTo(1.5, 6); tube.quadraticCurveTo(-3, 13, -2.5, 22); tube.closePath(); F(tube); const bd = P(); bd.moveTo(-9, 15); bd.lineTo(-2.5, 16); D(bd, 1); x.save(); x.translate(-1, 2); flame(0.9, true); x.restore();
      for (const [sx, sy] of [[12, -16], [15, -6], [-13, -14]]) { const sk = P(); sk.moveTo(sx, sy - 3); sk.quadraticCurveTo(sx + 1.5, sy, sx, sy + 1.5); sk.quadraticCurveTo(sx - 1.5, sy, sx, sy - 3); F(sk); } }
    else { medallion(); // a lighthouse on its rock, two beams out across the sea
      for (const s of [-1, 1]) { const bm = P(); bm.moveTo(0, -12); bm.lineTo(s * 24, -20); bm.lineTo(s * 24, -6); bm.closePath(); x.globalAlpha = 0.85; F(bm); x.globalAlpha = 1; }
      const tw = P(); tw.moveTo(-5, 12); tw.lineTo(-3, -9); tw.lineTo(3, -9); tw.lineTo(5, 12); tw.closePath(); F(tw); for (const yy of [-3, 4]) { const st = P(); st.moveTo(-4.4, yy); st.lineTo(4.4, yy + 0.4); D(st, 2); }
      const lr = P(); lr.roundRect(-4, -15, 8, 6, 1); F(lr); const lw = P(); lw.rect(-2.2, -13.8, 4.4, 3.4); x.fillStyle = K; x.fill(lw); const cap = P(); cap.moveTo(-5, -15); cap.lineTo(0, -19); cap.lineTo(5, -15); F(cap);
      const rock = P(); rock.moveTo(-13, 16); rock.quadraticCurveTo(-8, 9, -3, 11); rock.lineTo(4, 10); rock.quadraticCurveTo(10, 10, 13, 16); rock.closePath(); F(rock);
      const sea = P(); sea.moveTo(-22, 17); sea.quadraticCurveTo(-16, 14, -11, 17); sea.moveTo(11, 17); sea.quadraticCurveTo(16, 14, 22, 17); S(sea, 1.6); }
  } else if (fam === 'echo') {
    const conch = (sc, detail) => { x.save(); x.scale(sc, sc); const sh = P(); sh.moveTo(-18, 14); sh.bezierCurveTo(-22, 0, -10, -18, 6, -20); sh.bezierCurveTo(14, -20, 22, -14, 20, -6); sh.bezierCurveTo(18, 4, 8, 6, 4, 14); sh.bezierCurveTo(0, 20, -12, 20, -18, 14); sh.closePath(); F(sh);
      const mouth = P(); mouth.moveTo(-14, 12); mouth.bezierCurveTo(-10, 4, -2, 6, 0, 12); mouth.bezierCurveTo(-4, 16, -10, 16, -14, 12); mouth.closePath(); x.fillStyle = K; x.fill(mouth);
      if (detail) { for (const [a, b, c2] of [[-6, 2, 9], [0, -6, 11], [6, -13, 9]]) { const sp = P(); sp.arc(a, b, c2, -2.4, 0.2); D(sp, 1.1); } for (const [kx, ky] of [[4, -21], [12, -20], [19, -12]]) { const k2 = P(); k2.moveTo(kx - 2.4, ky + 1); k2.lineTo(kx, ky - 4.5); k2.lineTo(kx + 2.4, ky + 1); k2.closePath(); F(k2); } }
      x.restore(); };
    if (tier === 'rare') conch(1.15, false);
    else if (exo) { ring(); conch(0.85, true); swoosh2(-14, 8, 21, -1.2, -0.2, 2.6); swoosh2(-14, 8, 16, -1.15, -0.25, 2.2); }
    else { medallion(); // a compass rose behind it, depth rings
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? 15 : 22, pt = P(); pt.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); pt.lineTo(Math.cos(a + 0.22) * 5, Math.sin(a + 0.22) * 5); pt.lineTo(Math.cos(a - 0.22) * 5, Math.sin(a - 0.22) * 5); pt.closePath(); F(pt); const ml = P(); ml.moveTo(0, 0); ml.lineTo(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9); D(ml, 0.7); }
      const dr = P(); dr.arc(0, 0, 18.5, 0, TAU); D(dr, 0.8); x.save(); x.translate(1, 2); conch(0.62, true); x.restore(); }
  } else if (fam === 'ironhull') {
    const anchor = (sc, rope, cut) => { x.save(); x.scale(sc, sc); const fill = cut ? (p) => { x.fillStyle = K; x.fill(p); } : F;
      const rg = P(); rg.arc(0, -18, 5.5, 0, TAU); rg.arc(0, -18, 2.8, 0, TAU, true); fill(rg);
      const stock = P(); stock.moveTo(-12, -11.5); stock.quadraticCurveTo(0, -14, 12, -11.5); stock.lineTo(12, -7.5); stock.quadraticCurveTo(0, -10, -12, -7.5); stock.closePath(); fill(stock);
      const sk = P(); sk.moveTo(-2.8, -12); sk.lineTo(2.8, -12); sk.quadraticCurveTo(3.6, 4, 2.6, 16); sk.lineTo(-2.6, 16); sk.quadraticCurveTo(-3.6, 4, -2.8, -12); sk.closePath(); fill(sk);
      const cr = P(); cr.moveTo(-18, 6); cr.quadraticCurveTo(-14, 20, 0, 20); cr.quadraticCurveTo(14, 20, 18, 6); cr.lineTo(22, 10); cr.lineTo(20, 1.5); cr.lineTo(14, 4); cr.quadraticCurveTo(10, 15, 0, 15); cr.quadraticCurveTo(-10, 15, -14, 4); cr.lineTo(-20, 1.5); cr.lineTo(-22, 10); cr.closePath(); fill(cr);
      if (rope) { const rp = P(); rp.moveTo(-6, -4); rp.bezierCurveTo(10, -2, 8, 4, -6, 5); rp.bezierCurveTo(-12, 6, 10, 10, 6, 13); x.lineWidth = 3.6; x.strokeStyle = K; x.stroke(rp); x.lineWidth = 2; x.strokeStyle = W; x.stroke(rp); x.setLineDash([1.2, 1.8]); D(rp, 2); x.setLineDash([]); }
      x.restore(); };
    if (exo) { ring(); anchor(0.92, true, false); }
    else { medallion(); // a riveted shield, the anchor cut into it, two spanners crossed behind
      for (const s of [-1, 1]) { x.save(); x.rotate(s * 0.75); const sp = P(); sp.roundRect(-2, -24, 4, 30, 1.5); sp.arc(0, -24, 5, 0, TAU); F(sp); const jaw = P(); jaw.rect(-1.6, -30, 3.2, 6); x.fillStyle = K; x.fill(jaw); x.restore(); }
      const shd = P(); shd.moveTo(-14, -16); shd.lineTo(14, -16); shd.lineTo(14, 2); shd.quadraticCurveTo(14, 14, 0, 20); shd.quadraticCurveTo(-14, 14, -14, 2); shd.closePath(); F(shd);
      for (const [a, b] of [[-11, -13], [11, -13], [-11, 1], [11, 1], [0, 16.5]]) { const rv = P(); rv.arc(a, b, 1.2, 0, TAU); x.fillStyle = K; x.fill(rv); }
      x.save(); x.translate(0, 1); anchor(0.5, false, true); x.restore(); }
  } else if (fam === 'tidewarden') {
    medallion();
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.28, ry = P(); ry.moveTo(Math.cos(a - 0.05) * 13, Math.sin(a - 0.05) * 13 - 2); ry.lineTo(Math.cos(a) * 21, Math.sin(a) * 21 - 2); ry.lineTo(Math.cos(a + 0.05) * 13, Math.sin(a + 0.05) * 13 - 2); ry.closePath(); F(ry); } // sun rays above
    const eye = P(); eye.moveTo(-17, -4); eye.bezierCurveTo(-8, -16, 8, -16, 17, -4); eye.bezierCurveTo(8, 5, -8, 5, -17, -4); eye.closePath(); F(eye);
    const ir = P(); ir.arc(0, -5, 6.2, 0, TAU); D(ir, 2.2); const pu = P(); pu.ellipse(0, -5, 1.8, 4.2, 0, 0, TAU); x.fillStyle = K; x.fill(pu);
    const lid = P(); lid.moveTo(-17, -4); lid.bezierCurveTo(-8, -11, 8, -11, 17, -4); D(lid, 1.3);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const ls = P(); const lx = s * (6 + k * 4); ls.moveTo(lx, -12 + k * 1.6); ls.lineTo(lx + s * 1.6, -15 + k * 1.6); S(ls, 1.2); }
    const wv = P(); wv.moveTo(-22, 19); wv.bezierCurveTo(-16, 9, -6, 6, 2, 10); wv.bezierCurveTo(9, 13, 11, 7, 7, 4.5); wv.bezierCurveTo(15, 3.5, 21, 11, 22, 19); wv.closePath(); F(wv);
    for (const k of [12.5, 16]) { const fl = P(); fl.moveTo(-21, k + 3); fl.bezierCurveTo(-10, k - 2, 4, k + 2, 21, k + 1); D(fl, 0.9); }
  }
  x.restore();
}
function emblemMask2(fam, tier, size) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.translate(size / 2, size / 2); x.scale(size / 72, size / 72);
  emblemTier(x, fam, tier);
  const d = x.getImageData(0, 0, size, size), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const lum = (a[i] + a[i + 1] + a[i + 2]) / 3, al = a[i + 3] / 255; a[i + 3] = Math.round((lum > 128 ? al : 0) * 255); a[i] = a[i + 1] = a[i + 2] = 255; }
  x.putImageData(d, 0, 0); return c;
}
export function drawTierEmblemMask(fam, tier, size) { return emblemMask2(fam, tier, size); }
