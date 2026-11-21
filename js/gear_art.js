// (5.12.6) Gear photographed for the shop, as the suits are (suit_art.js): each thing drawn as a solid object lit from
// the top, its real parts and its own shape, a faint shadow round its outline, nothing flat or stencilled. Rarity shows
// as craft: a stripe, then better hardware, then stitching and brass, then a glow and sparks at the top.
// Fins: a pair, one lying across the other. Each kind its own blade: rubber (classic, flared), split (cut down the
// middle), long (a long, narrow blade), free (very long freediving carbon) and jet (short, stiff and square, vented).
const TAU = Math.PI * 2;
const RK = { common: 0, uncommon: 1, rare: 2, exotic: 3, legendary: 4 };
const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } const r = /rgba?\(([^)]+)\)/.exec(c || ''); if (r) return r[1].split(',').slice(0, 3).map((v) => +v); return [40, 42, 44]; };
const mix = (c, t, k) => { const a = hex(c), b = hex(t); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
const rgba = (c, al) => { const a = hex(c); return `rgba(${a[0]},${a[1]},${a[2]},${al})`; };
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); for (const [k, c] of stops) g.addColorStop(k, c); return g; };

// the scene is drawn in a 1000 x 400 frame, then fitted into the picture with a faint outline shadow under it
function fitted(ctx, w, h, draw, aspect = 2.5) {
  const W = 1000, H = W / aspect, k = Math.min((w * 0.9) / W, (h * 0.86) / H);
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext('2d');
  x.translate(w / 2, h / 2); x.scale(k, k); x.translate(-W / 2, -H / 2); draw(x, W, H);
  const s = document.createElement('canvas'); s.width = c.width; s.height = c.height; const sx = s.getContext('2d');
  sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(20,24,28,1)'; sx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = 0.24; ctx.filter = `blur(${Math.max(1, h * 0.018).toFixed(1)}px)`; ctx.drawImage(s, Math.max(0.5, h * 0.004), Math.max(1, h * 0.014)); ctx.restore();
  ctx.drawImage(c, 0, 0);
}
function sparks(x, W, H, col, seed) {
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) { const px = 80 + rnd() * (W - 160), py = 40 + rnd() * (H - 80), r = 3 + rnd() * 6, g = x.createRadialGradient(px, py, 0, px, py, r * 3), lt = mix(col, '#fff4dc', 0.7);
    g.addColorStop(0, lt); g.addColorStop(0.35, lt.replace('rgb(', 'rgba(').replace(')', ',0.35)')); g.addColorStop(1, lt.replace('rgb(', 'rgba(').replace(')', ',0)')); x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 3, 0, TAU); x.fill(); }
}

// ---------------------------------------------------------------- fins ----------------------------------------------------------------
const FIN_SHAPE = { // L: blade length; r0: half width at the root; r1: half width at the tip; flare: how the edge bows out
  rubber: { L: 560, r0: 62, r1: 112, flare: 0.25 }, split: { L: 600, r0: 62, r1: 104, flare: 0.15, split: true }, long: { L: 700, r0: 56, r1: 78, flare: 0.05 },
  free: { L: 790, r0: 52, r1: 70, flare: 0.02, carbon: true }, jet: { L: 450, r0: 72, r1: 118, flare: 0, vents: true, square: true },
};
function finColours(def) {
  const L = def.finLook, arch = def.arch || 'rubber';
  // (5.12.6) plain fins in real moulded-rubber colours, all muted: most commons black, the rest a quiet colour of their own
  const QUIET = [['#1d2023', '#3a3f43'], ['#2a2c2e', '#4a4e52'], ['#2e3324', '#55603e'], ['#3e2a20', '#6e4a34'], ['#1e2633', '#3a4a60'], ['#5a5548', '#8a8470']];
  if (!(L && L.c)) { const hh = hash(def.id || arch), r = RK[def.rarity] || 0; if (r >= 1 || hh % 10 >= 7) { const q = QUIET[r === 0 ? 1 : (hh >>> 3) % QUIET.length]; return { body: q[0], mid: q[1], acc: '#7a6040', fx: null, glass: false }; } }
  const base = L && L.c ? L.c : { rubber: ['#1d2023', '#3a3f43'], split: ['#23262a', '#454b4f'], long: ['#1c1e21', '#3c4146'], free: ['#141516', '#2c2e30'], jet: ['#202122', '#454646'] }[arch] || ['#202224', '#40454a'];
  return { body: base[0], mid: base[1], acc: (L && (L.stripe || L.c && L.c[2])) || '#6a5a3e', fx: L && L.fx, glass: L && L.fx === 'glass' };
}
function oneFin(x, S, C, k, far) {
  const { L, r0, r1, flare } = S, rootX = 250, tipX = rootX + L;
  // the blade's outline, top view a little foreshortened: rails bow out slightly; the tip square, rounded or split
  const edge = (side) => { const sgn = side; x.lineTo(rootX + L * 0.35, sgn * (r0 + (r1 - r0) * (0.35 + flare))); x.quadraticCurveTo(rootX + L * 0.8, sgn * (r1 * (1 + flare * 0.2)), tipX - (S.square ? 6 : 30), sgn * r1); };
  const blade = () => { x.beginPath(); x.moveTo(rootX, -r0); edge(-1);
    if (S.square) { x.lineTo(tipX, -r1 * 0.95); x.lineTo(tipX, r1 * 0.95); }
    else if (S.split) { x.quadraticCurveTo(tipX + 14, -r1 * 0.75, tipX, -r1 * 0.1); x.lineTo(rootX + L * 0.55, -4); x.lineTo(rootX + L * 0.55, 4); x.lineTo(tipX, r1 * 0.1); x.quadraticCurveTo(tipX + 14, r1 * 0.75, tipX - 30, r1); }
    else x.quadraticCurveTo(tipX + 26, 0, tipX - 30, r1);
    x.lineTo(rootX + L * 0.35, r0 + (r1 - r0) * (0.35 + flare)); x.lineTo(rootX, r0); x.closePath(); };
  // the blade: lit from the top, darker to its lower rail; the tip curls up a little into the light
  x.save(); blade(); x.fillStyle = C.glass ? rgba(C.body, 0.45) : C.body; x.fill(); x.clip();
  x.fillStyle = lin(x, 0, -r1, 0, r1, [[0, rgba('#ffffff', C.glass ? 0.25 : 0.14)], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.45)']]); x.fillRect(rootX - 10, -r1 * 1.4, L + 60, r1 * 2.8);
  x.fillStyle = lin(x, rootX, 0, tipX, 0, [[0, 'rgba(0,0,0,0.25)'], [0.6, 'rgba(0,0,0,0)'], [1, rgba(C.mid, 0.55)]]); x.fillRect(rootX - 10, -r1 * 1.4, L + 60, r1 * 2.8);
  if (S.carbon) { x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 3; for (let i = -40; i < 60; i++) { x.beginPath(); x.moveTo(rootX + i * 14, -r1); x.lineTo(rootX + i * 14 + r1 * 2, r1); x.stroke(); } } // the weave
  // ribs along the blade (a raised line with its lit side up); the rails thicker and catching the light
  for (const yy of S.split ? [-r0 * 0.55, r0 * 0.55] : [-r0 * 0.5, 0, r0 * 0.5]) { if (S.carbon) break; x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 7; x.beginPath(); x.moveTo(rootX + 10, yy); x.quadraticCurveTo(rootX + L * 0.5, yy * 1.45, tipX - 60, yy * 1.7); x.stroke(); x.strokeStyle = rgba('#ffffff', 0.1); x.lineWidth = 3; x.beginPath(); x.moveTo(rootX + 10, yy - 4); x.quadraticCurveTo(rootX + L * 0.5, yy * 1.45 - 4, tipX - 60, yy * 1.7 - 4); x.stroke(); }
  if (S.vents) for (let i = 0; i < 3; i++) { const vx = rootX + 50 + i * 54; x.fillStyle = 'rgba(8,9,10,0.9)'; x.beginPath(); x.roundRect(vx, -r0 * 0.62, 30, r0 * 1.24, 12); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(vx + 2, -r0 * 0.62 + 6); x.lineTo(vx + 28, -r0 * 0.62 + 6); x.stroke(); }
  x.restore();
  x.save(); blade(); x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 6; x.stroke(); x.restore();
  x.save(); x.strokeStyle = rgba('#ffffff', 0.18); x.lineWidth = 4; x.beginPath(); x.moveTo(rootX + 8, -r0 + 4); edge(-1); x.stroke(); x.restore(); // the upper rail catches the light
  // rarity's work: a stripe down both rails (Uncommon up), wider and with a fine second line (Rare up)
  if (k >= 1) { x.save(); blade(); x.clip(); x.strokeStyle = C.acc; x.lineWidth = k >= 2 ? 10 : 7; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(rootX + 4, sg * (r0 - 12)); x.lineTo(rootX + L * 0.35, sg * (r0 + (r1 - r0) * (0.35 + flare) - 12)); x.quadraticCurveTo(rootX + L * 0.8, sg * (r1 * (1 + flare * 0.2) - 12), tipX - 40, sg * (r1 - 12)); x.stroke(); } x.restore(); }
  // the foot pocket: a moulded shoe, its opening dark, a spring strap round the heel with its buckle
  const pocket = () => { x.beginPath(); x.moveTo(rootX + 30, -r0 - 6); x.bezierCurveTo(rootX - 60, -r0 - 18, 70, -r0 - 4, 46, -26); x.bezierCurveTo(36, -8, 36, 8, 46, 26); x.bezierCurveTo(70, r0 + 4, rootX - 60, r0 + 18, rootX + 30, r0 + 6); x.closePath(); };
  x.save(); pocket(); x.fillStyle = mix(C.body, '#000', 0.12); x.fill(); x.clip(); x.fillStyle = lin(x, 0, -r0 - 18, 0, r0 + 18, [[0, 'rgba(255,255,255,0.16)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.5)']]); x.fillRect(0, -200, 400, 400); x.restore();
  x.save(); pocket(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 6; x.stroke(); x.restore();
  x.fillStyle = 'rgba(6,6,7,0.92)'; x.beginPath(); x.ellipse(118, -2, 58, r0 * 0.5, 0, 0, TAU); x.fill(); // the foot opening
  x.strokeStyle = rgba('#ffffff', 0.14); x.lineWidth = 3; x.beginPath(); x.ellipse(118, -2, 62, r0 * 0.56, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
  if (k >= 3) { x.save(); pocket(); x.clip(); x.setLineDash([7, 6]); x.strokeStyle = rgba(mix(C.acc, '#e8d8b0', 0.5), 0.8); x.lineWidth = 2.5; x.beginPath(); x.ellipse(150, 0, 130, r0 + 2, 0, 0, TAU); x.stroke(); x.restore(); } // stitched
  const metal = k >= 2 ? (k >= 3 ? ['#b8955a', '#6e5428'] : ['#b8bcbc', '#5a5e60']) : ['#3a3c3e', '#1a1b1c'];
  x.strokeStyle = mix(C.body, '#000', 0.3); x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(70, -r0 + 6); x.bezierCurveTo(-10, -r0 + 10, -10, r0 - 10, 70, r0 - 6); x.stroke(); // the heel strap
  x.strokeStyle = rgba('#ffffff', 0.12); x.lineWidth = 4; x.beginPath(); x.moveTo(66, -r0 + 2); x.bezierCurveTo(-6, -r0 + 6, -6, 0, 0, 10); x.stroke();
  x.fillStyle = lin(x, 64, -r0 - 6, 92, -r0 + 22, [[0, metal[0]], [1, metal[1]]]); x.beginPath(); x.roundRect(62, -r0 - 6, 34, 26, 5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke(); // the buckle
  if (far) { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(10,12,14,0.32)'; x.fillRect(-100, -300, 1400, 600); x.restore(); }
}
export function drawFins3(ctx, w, h, def) {
  const S = FIN_SHAPE[def.arch] || FIN_SHAPE.rubber, C = finColours(def), k = RK[def.rarity] || 0, glow = k >= 4 ? (def.finLook && def.finLook.c && def.finLook.c[2]) || C.acc : null;
  fitted(ctx, w, h, (x, W, H) => {
    // the far fin first, laid a little higher and to the right, then the near one across it
    const totalL = 250 + S.L + 30, sc = Math.min(1, 880 / totalL);
    const lay = (dx, dy, rot, far) => { const L = document.createElement('canvas'); L.width = W; L.height = H; const lx = L.getContext('2d');
      lx.translate(W / 2 - (totalL * sc) / 2 + dx, H / 2 + dy); lx.rotate(rot); lx.scale(sc, sc); oneFin(lx, S, C, k, far); x.drawImage(L, 0, 0); };
    lay(40, -40, -0.05, true); lay(0, 34, 0.025, false);
    if (glow) { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba(mix(glow, '#fff4dc', 0.4), 0.16); x.fillRect(0, 0, W, H); x.restore(); sparks(x, W, H, glow, 7 + (hash(def.id) % 97)); } // a living sheen on the fins themselves, and sparks
  });
  return true;
}
