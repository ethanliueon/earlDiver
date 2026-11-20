// (5.8.0) Ability scrolls, (5.7.7) drawn rather than built from shapes: every edge carries a slight hand wobble, the
// vellum has grain and wear, the rolls swell and taper, and each family's emblem is a small illustration (a flying
// fish, a hand net, a sailfish, a lit flare, a conch shell, a roped anchor, an eye over a breaking wave), each shape
// shaded in two tones with a cut highlight and a dark edge that thickens on its shadow side. The body's colour is the
// rarity (rare a deep sea blue, exotic a dark plum, legendary a smoky bronze with gold leaf); a plus tier has double
// bands. Painted once per size and kept.
const TAU = Math.PI * 2;

export const ABILITY_FAMILIES = ['sprint', 'vigor', 'dash', 'flare', 'echo', 'ironhull', 'tidewarden'];
export const ACCENT = { sprint: '#a6e6f2', vigor: '#9ad690', dash: '#efe0b8', flare: '#f6b45c', echo: '#f0c8a8', ironhull: '#c6cfd4', tidewarden: '#8cc2f4' };
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
};
const fade = (hex, k) => { const [r, g, b] = hexRgb(hex), gr = (r + g + b) / 3, f = (c) => Math.round(c + (gr - c) * k).toString(16).padStart(2, '0'); return `#${f(r)}${f(g)}${f(b)}`; };
function paintScroll3(x, fam, tier) {
  const B = BODY3[tier] || BODY3.rare, r = rnd(fam.length * 131 + tier.length * 17), plus = tier === 'exotic', leg = tier === 'legendary';
  const acc0 = leg ? '#c4a05a' : (ACCENT[fam] || '#e8e0c8'), acc = fade(acc0, 0.28), bandCol = leg ? '#8a6a34' : fade(ACCENT[fam] || '#e8e0c8', 0.32);
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
  const roll = (x0, x1, y, rad, endAtLeft) => {
    const top = along([x0 + rad * 0.3, y - rad], [x1 - rad * 0.3, y - rad * 1.04], 6), bot = along([x1 - rad * 0.3, y + rad * 1.03], [x0 + rad * 0.3, y + rad], 6);
    const body = wobbly([...top, [x1, y], ...bot, [x0, y]], r, 0.4);
    const g = x.createLinearGradient(0, y - rad, 0, y + rad); g.addColorStop(0, B.mid); g.addColorStop(0.3, B.light); g.addColorStop(0.62, B.mid); g.addColorStop(1, B.dark);
    x.fillStyle = g; x.fill(body);
    x.save(); x.clip(body);
    for (const [a, b] of bandsX) { const bp = wobbly([[a, y - rad - 2], [b, y - rad - 2], [b + 0.5, y + rad + 2], [a - 0.3, y + rad + 2]], r, 0.35); const bg = x.createLinearGradient(0, y - rad, 0, y + rad); bg.addColorStop(0, shade(bandCol, -0.05)); bg.addColorStop(0.3, shade(bandCol, 0.12)); bg.addColorStop(1, shade(bandCol, -0.45)); x.fillStyle = bg; x.fill(bp); }
    x.restore();
    age(body, x0 - 2, y - rad - 2, x1 - x0 + 4, rad * 2 + 4, 10);
    x.lineWidth = 1.1; x.strokeStyle = edgeCol; x.stroke(body);
    const ex = endAtLeft ? x0 + 1 : x1 - 1, cap = wobbly(Array.from({ length: 10 }, (_, i) => [ex + Math.cos(i / 10 * TAU) * rad * 0.5, y + Math.sin(i / 10 * TAU) * rad * 0.97]), r, 0.3);
    const capCol = leg ? '#5e4422' : shade(B.dark, 0.1); const cg = x.createRadialGradient(ex - rad * 0.15, y - rad * 0.3, 1, ex, y, rad); cg.addColorStop(0, shade(capCol, 0.3)); cg.addColorStop(1, shade(capCol, -0.3));
    x.fillStyle = cg; x.fill(cap); age(cap, ex - rad, y - rad, rad * 2, rad * 2, 4); x.lineWidth = 1; x.strokeStyle = edgeCol; x.stroke(cap);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 0.9; x.beginPath();
    for (let a = 0.3; a < TAU * 2.3; a += 0.16) { const rr = rad * (0.12 + a / (TAU * 2.7)); const px = ex + Math.cos(a + 1) * rr * 0.48, py = y + Math.sin(a + 1) * rr * 0.93; if (a === 0.3) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
  };
  roll(-36, 44, -32, 11, false);
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
  // the emblem: painted on, solid, softly shaded, the paint worn in places
  { const m = emblemMask(fam, 240), size = 46, c = document.createElement('canvas'); c.width = c.height = m.width; const t = c.getContext('2d');
    t.drawImage(m, 0, 0); t.globalCompositeOperation = 'source-in'; const eg = t.createLinearGradient(0, 0, 0, c.height); eg.addColorStop(0, shade(acc, 0.16)); eg.addColorStop(0.55, acc); eg.addColorStop(1, shade(acc, -0.32)); t.fillStyle = eg; t.fillRect(0, 0, c.width, c.height);
    t.globalCompositeOperation = 'destination-out'; const rr2 = rnd(fam.length * 7 + 3); for (let i = 0; i < 70; i++) { t.globalAlpha = 0.25 + rr2() * 0.6; t.beginPath(); t.arc(rr2() * c.width, rr2() * c.height, 1 + rr2() * 4, 0, TAU); t.fill(); } t.globalAlpha = 1;
    x.save(); x.globalAlpha = 0.55; x.drawImage((() => { const d = document.createElement('canvas'); d.width = d.height = m.width; const u = d.getContext('2d'); u.drawImage(m, 0, 0); u.globalCompositeOperation = 'source-in'; u.fillStyle = 'rgba(0,0,0,1)'; u.fillRect(0, 0, d.width, d.height); return d; })(), -2 - size / 2 + 0.8, 1 - size / 2 + 1.2, size, size); x.restore(); // the paint's thickness: a soft shadow under it
    x.drawImage(c, -2 - size / 2, 1 - size / 2, size, size); }
  roll(-46, 34, 33, 12, true);
}
export function drawScroll3(ctx, cx, cy, size, fam, tier = 'rare') {
  const key = `3|${fam}|${tier}|${Math.round(size)}`;
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(size); const x = c.getContext('2d'), k = size / 104; x.translate(size / 2, size / 2); x.scale(k, k); paintScroll3(x, fam, tier); cache.set(key, c); }
  ctx.drawImage(c, cx - c.width / 2, cy - c.height / 2);
}
// (5.7.8) a legendary's motes: slow sparks of old gold drifting up round it, wherever it is shown. Call each frame
// with the time; state is a small array kept by the caller
export function legendMotes(ctx, cx, cy, w, h, t, seed = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const r = rnd(seed * 31 + i * 7), ph = (t * (0.18 + r() * 0.12) + r()) % 1, px = cx + (r() - 0.5) * w * 0.9 + Math.sin(t * 1.3 + i) * w * 0.04, py = cy + h * 0.45 - ph * h * 1.05, a = Math.sin(ph * Math.PI) * (0.55 + r() * 0.4), sz = (1 + r() * 1.8) * w / 100;
    const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 3); g.addColorStop(0, `rgba(255,226,150,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, sz * 3, 0, TAU); ctx.fill(); }
  ctx.restore();
}
