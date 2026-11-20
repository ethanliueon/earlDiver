// (5.8.0) Ability scrolls: an unrolled sheet of oiled, sea-stained vellum, its top rolled back and its foot rolled
// forward, two stripe bands down it and the family's emblem in the middle, all in one accent colour. Its body is
// coloured by rarity (rare a deep sea blue, exotic a dark plum, legendary a smoky bronze with gold leaf), kept muted
// so it sits with the game's olive and bronze. A plus tier has double bands. Painted once per size and kept.
const TAU = Math.PI * 2;

export const ABILITY_FAMILIES = ['sprint', 'vigor', 'dash', 'flare', 'echo', 'ironhull', 'tidewarden'];
export const ACCENT = { sprint: '#9fe4f2', vigor: '#93d68c', dash: '#efe2c0', flare: '#f4b860', echo: '#74dccb', ironhull: '#c2ccd2', tidewarden: '#82bdf4' };
const BODY = {
  rare: { mid: '#2e4c70', dark: '#16273d', light: '#4a6f98' },
  exotic: { mid: '#4c2d58', dark: '#26152e', light: '#6f4a80' },
  legendary: { mid: '#7a5524', dark: '#3a240c', light: '#b48a46' },
};
const INK = '#17131a'; // a soft dark edge, not pure black
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k); return `rgb(${f(r)},${f(g)},${f(b)})`; };

// the family's emblem, centred on 0,0 in a box of about ±24 units, in its accent with a dark cut edge
export function drawEmblem(x, fam, col = ACCENT[fam] || '#e8e0c8') {
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  const both = (path, w) => { x.lineWidth = w + 4.5; x.strokeStyle = INK; x.stroke(path); x.lineWidth = w; x.strokeStyle = col; x.stroke(path); };
  const fillBoth = (path) => { x.lineWidth = 4.5; x.strokeStyle = INK; x.stroke(path); x.fillStyle = col; x.fill(path); };
  if (fam === 'sprint') { // rushing current: three swept chevrons, streaks trailing behind
    for (const [ox, a] of [[-12, 0.55], [-1, 0.8], [10, 1]]) { const p = new Path2D(); p.moveTo(ox - 6, -14); p.quadraticCurveTo(ox + 6, -6, ox + 8, 0); p.quadraticCurveTo(ox + 6, 6, ox - 6, 14); x.globalAlpha = a; both(p, 4.2); }
    x.globalAlpha = 0.7; for (const y of [-20, 20]) { const p = new Path2D(); p.moveTo(-22, y * 0.55); p.lineTo(-10, y * 0.55); both(p, 2.2); }
  } else if (fam === 'vigor') { // a net's hoop and mesh, its reach spreading out in two rings
    for (const [r, a] of [[23, 0.45], [18, 0.7]]) { const p = new Path2D(); p.arc(0, 0, r, -0.9, 0.9); x.globalAlpha = a; both(p, 2.4); const q = new Path2D(); q.arc(0, 0, r, Math.PI - 0.9, Math.PI + 0.9); both(q, 2.4); }
    x.globalAlpha = 1; const h = new Path2D(); h.arc(0, 0, 11, 0, TAU); both(h, 3.4);
    x.save(); x.beginPath(); x.arc(0, 0, 10, 0, TAU); x.clip(); x.globalAlpha = 0.8; for (let k = -12; k <= 12; k += 5) { const m = new Path2D(); m.moveTo(k - 12, -12); m.lineTo(k + 12, 12); m.moveTo(k + 12, -12); m.lineTo(k - 12, 12); x.lineWidth = 1.3; x.strokeStyle = col; x.stroke(m); } x.restore();
  } else if (fam === 'dash') { // a fish darting, its body an arrow, streaks behind
    const f = new Path2D(); f.moveTo(20, 0); f.quadraticCurveTo(6, -11, -8, -5); f.lineTo(-17, -12); f.lineTo(-13, 0); f.lineTo(-17, 12); f.lineTo(-8, 5); f.quadraticCurveTo(6, 11, 20, 0); f.closePath(); fillBoth(f);
    x.fillStyle = INK; x.beginPath(); x.arc(11, -2, 1.8, 0, TAU); x.fill();
    x.globalAlpha = 0.65; for (const [y, l] of [[-8, 9], [0, 12], [8, 9]]) { const p = new Path2D(); p.moveTo(-21, y); p.lineTo(-21 - l, y); both(p, 2); }
  } else if (fam === 'flare') { // a burst: eight rays round a bright core
    const p = new Path2D(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU - Math.PI / 2, r = i % 2 ? 9 : (i % 4 ? 17 : 23); if (i) p.lineTo(Math.cos(a) * r, Math.sin(a) * r); else p.moveTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); fillBoth(p);
    x.fillStyle = '#fff6dc'; x.beginPath(); x.arc(0, 0, 5, 0, TAU); x.fill();
  } else if (fam === 'echo') { // a ping: a point and the rings going out from it
    x.fillStyle = col; x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(-12, 0, 4.5, 0, TAU); x.stroke(); x.fill();
    for (const [r, a] of [[10, 1], [18, 0.75], [26, 0.5]]) { const p = new Path2D(); p.arc(-12, 0, r, -0.75, 0.75); x.globalAlpha = a; both(p, 3.2); }
  } else if (fam === 'ironhull') { // a riveted hull plate, a spanner across it
    const pl = new Path2D(); pl.roundRect(-17, -15, 34, 30, 4); fillBoth(pl);
    x.fillStyle = INK; for (const [a, b] of [[-12, -10], [12, -10], [-12, 10], [12, 10]]) { x.beginPath(); x.arc(a, b, 2.2, 0, TAU); x.fill(); }
    x.save(); x.rotate(-0.7); const w = new Path2D(); w.roundRect(-22, -3, 30, 6, 2); w.arc(13, 0, 7.5, 0, TAU); x.lineWidth = 4.5; x.strokeStyle = INK; x.stroke(w); x.fillStyle = shade(col, -0.35); x.fill(w, 'nonzero');
    x.fillStyle = col === '#c2ccd2' ? shade(col, -0.05) : col; x.beginPath(); x.roundRect(-22, -2, 30, 4, 1.5); x.fill(); x.fillStyle = INK; x.beginPath(); x.moveTo(13, -3.5); x.lineTo(21, -3.5); x.lineTo(21, 3.5); x.lineTo(13, 3.5); x.closePath(); x.fill(); x.restore();
  } else if (fam === 'tidewarden') { // an eye closing over a wave
    const e = new Path2D(); e.moveTo(-20, -4); e.quadraticCurveTo(0, -20, 20, -4); e.quadraticCurveTo(0, 8, -20, -4); fillBoth(e);
    x.fillStyle = INK; x.beginPath(); x.ellipse(0, -5, 4, 5.5, 0, 0, TAU); x.fill();
    const lid = new Path2D(); lid.moveTo(-20, -4); lid.quadraticCurveTo(0, -14, 20, -4); x.lineWidth = 3; x.strokeStyle = INK; x.stroke(lid);
    const wv = new Path2D(); wv.moveTo(-22, 14); wv.quadraticCurveTo(-15, 8, -8, 14); wv.quadraticCurveTo(-1, 20, 6, 14); wv.quadraticCurveTo(13, 8, 22, 14); both(wv, 3.4);
  }
  x.restore();
}

// one scroll, painted into a box of ±50 units
function paintScroll(x, fam, tier) {
  const B = BODY[tier] || BODY.rare, acc = ACCENT[fam] || '#e8e0c8', r = rnd(fam.length * 97 + tier.length * 13), plus = tier === 'exotic';
  x.lineJoin = 'round'; x.lineCap = 'round';
  // its shadow
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(0, 47, 44, 5, 0, 0, TAU); x.fill();
  // a cylinder (a roll): body with a highlight band along it, and its end showing the turns of the sheet
  const roll = (x0, x1, y, rad, endAtLeft) => {
    const g = x.createLinearGradient(0, y - rad, 0, y + rad); g.addColorStop(0, shade(B.mid, 0.2)); g.addColorStop(0.35, B.light); g.addColorStop(0.6, B.mid); g.addColorStop(1, B.dark);
    x.fillStyle = g; x.beginPath(); x.roundRect(x0, y - rad, x1 - x0, rad * 2, rad * 0.4); x.fill();
    // the bands carry round the roll
    for (const bx of bandsX) { x.fillStyle = shade(acc, -0.12); x.fillRect(bx[0], y - rad, bx[1] - bx[0], rad * 2); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(bx[0], y - rad * 0.55, bx[1] - bx[0], rad * 0.35); }
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(x0 + 2, y - rad * 0.55, x1 - x0 - 4, rad * 0.3);
    x.lineWidth = 2.4; x.strokeStyle = INK; x.beginPath(); x.roundRect(x0, y - rad, x1 - x0, rad * 2, rad * 0.4); x.stroke();
    // the end: an ellipse with the sheet's spiral in it
    const ex = endAtLeft ? x0 : x1;
    x.fillStyle = shade(B.dark, 0.1); x.beginPath(); x.ellipse(ex, y, rad * 0.55, rad, 0, 0, TAU); x.fill(); x.stroke();
    x.strokeStyle = shade(B.light, 0.15); x.lineWidth = 1.3; x.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.2) { const rr = rad * (0.15 + a / (TAU * 2.6)); const px = ex + Math.cos(a) * rr * 0.55, py = y + Math.sin(a) * rr; if (a) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
    if (tier === 'legendary') { x.strokeStyle = '#d9b25e'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(ex, y, rad * 0.55, rad, 0, 0, TAU); x.stroke(); }
  };
  // the stripe bands (x ranges); a plus tier has a thin second band beside each
  const bandsX = [[-30, -22], [20, 28]].concat(plus ? [[-19, -17], [15, 17]] : []);
  // top roll, behind
  roll(-36, 44, -32, 11, false);
  // the sheet: its sides waisted a little, edges a touch frayed
  const sheet = new Path2D(); sheet.moveTo(-37, -25); sheet.quadraticCurveTo(-34, 0, -38, 28); sheet.lineTo(33, 28); sheet.quadraticCurveTo(37, 0, 35, -25); sheet.closePath();
  const sg = x.createLinearGradient(-38, 0, 36, 0); sg.addColorStop(0, B.dark); sg.addColorStop(0.16, B.mid); sg.addColorStop(0.42, shade(B.light, 0.12)); sg.addColorStop(0.55, B.light); sg.addColorStop(0.84, B.mid); sg.addColorStop(1, B.dark);
  x.fillStyle = sg; x.fill(sheet);
  x.save(); x.clip(sheet);
  for (const bx of bandsX) { const bg = x.createLinearGradient(bx[0], 0, bx[1], 0); bg.addColorStop(0, shade(acc, -0.25)); bg.addColorStop(0.5, acc); bg.addColorStop(1, shade(acc, -0.25)); x.fillStyle = bg; x.fillRect(bx[0], -40, bx[1] - bx[0], 80); x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(bx[0] + (bx[1] - bx[0]) * 0.25, -40, Math.max(0.8, (bx[1] - bx[0]) * 0.18), 80); }
  // wear: salt stains and specks, a shadow under the top roll and above the foot
  for (let i = 0; i < 18; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,250,235,0.06)' : 'rgba(0,0,0,0.09)'; x.beginPath(); x.ellipse(-34 + r() * 66, -24 + r() * 50, 1 + r() * 5, 0.6 + r() * 2.4, r() * 3, 0, TAU); x.fill(); }
  const tg = x.createLinearGradient(0, -25, 0, -15); tg.addColorStop(0, 'rgba(0,0,0,0.42)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(-40, -25, 80, 10);
  const bgr = x.createLinearGradient(0, 28, 0, 18); bgr.addColorStop(0, 'rgba(0,0,0,0.38)'); bgr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bgr; x.fillRect(-40, 18, 80, 10);
  x.restore();
  x.lineWidth = 2.4; x.strokeStyle = INK; x.stroke(sheet);
  // frayed nicks in its edges
  x.fillStyle = INK; for (const [ex, ey, d] of [[-35.5, -6, 1], [-36.6, 12, 1], [35.4, -12, -1], [35.6, 8, -1]]) { x.beginPath(); x.moveTo(ex, ey - 2.4); x.lineTo(ex + d * 3.2, ey); x.lineTo(ex, ey + 2.4); x.closePath(); x.fill(); }
  // gold leaf down the legendary's edges
  if (tier === 'legendary') { x.save(); x.strokeStyle = '#d9b25e'; x.lineWidth = 1.8; x.setLineDash([]); const gl = new Path2D(); gl.moveTo(-34, -23); gl.quadraticCurveTo(-31, 0, -35, 26); gl.moveTo(30, 26); gl.quadraticCurveTo(34, 0, 32, -23); x.stroke(gl); x.restore(); }
  // the emblem, on a faint disc of darker vellum
  x.save(); x.translate(-2, 1); x.scale(0.82, 0.82); drawEmblem(x, fam, acc); x.restore();
  // the foot roll, in front
  roll(-46, 34, 33, 12, true);
}

const cache = new Map();
// the scroll for an ability, size = its height in pixels
export function drawScroll(ctx, cx, cy, size, fam, tier = 'rare') {
  const key = `${fam}|${tier}|${Math.round(size)}`;
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(size); const x = c.getContext('2d'), k = size / 104; x.translate(size / 2, size / 2); x.scale(k, k); paintScroll(x, fam, tier); cache.set(key, c); if (cache.size > 120) cache.delete(cache.keys().next().value); }
  ctx.drawImage(c, cx - c.width / 2, cy - c.height / 2);
}
export function scrollURL(fam, tier, px = 160) { const c = document.createElement('canvas'); c.width = c.height = px; drawScroll(c.getContext('2d'), px / 2, px / 2, px, fam, tier); return c.toDataURL('image/png'); }
