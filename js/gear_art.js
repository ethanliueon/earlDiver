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

// ---------------------------------------------------------------- cameras ----------------------------------------------------------------
// (5.12.7) A camera in its underwater housing, seen from the front and a little above, turned to the left: a box with a
// lit top, a front and a darker side, its lens port, the controls on top. A compact sits in a clear polycarbonate case;
// a macro has a short port and a focus light; a housed camera is a solid metal housing with grip handles (and strobe
// arms from Rare up); a low-light camera a matte housing with a big flat port and no strobes.
function box(x, X, Y, w, h, d, cols) { // front face (X..X+w, Y..Y+h), the side and top drawn back by d at 30 degrees
  const dx = d * 0.85, dy = -d * 0.5;
  x.fillStyle = cols.top; x.beginPath(); x.moveTo(X + 6, Y); x.lineTo(X + w - 6, Y); x.lineTo(X + w + dx - 6, Y + dy); x.lineTo(X + dx + 6, Y + dy); x.closePath(); x.fill();
  x.fillStyle = cols.side; x.beginPath(); x.moveTo(X + w, Y + 6); x.lineTo(X + w + dx, Y + dy + 6); x.lineTo(X + w + dx, Y + h + dy - 6); x.lineTo(X + w, Y + h - 6); x.closePath(); x.fill();
  x.fillStyle = cols.front; x.beginPath(); x.roundRect(X, Y, w, h, 10); x.fill();
  x.fillStyle = lin(x, 0, Y, 0, Y + h, [[0, 'rgba(255,255,255,0.14)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.35)']]); x.beginPath(); x.roundRect(X, Y, w, h, 10); x.fill();
  x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.beginPath(); x.roundRect(X, Y, w, h, 10); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(X + 8, Y + 2); x.lineTo(X + w - 8, Y + 2); x.stroke();
}
function port(x, cx, cy, r, ring, glass, dome) { // a round lens port seen nearly face-on, a little to the left
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(cx + 4, cy + 5, r * 0.88 + 8, r + 8, 0, 0, TAU); x.fill();
  x.fillStyle = lin(x, cx - r, cy - r, cx + r, cy + r, [[0, mix(ring, '#fff', 0.35)], [0.5, ring], [1, mix(ring, '#000', 0.5)]]); x.beginPath(); x.ellipse(cx, cy, r * 0.88 + 7, r + 7, 0, 0, TAU); x.fill();
  x.fillStyle = lin(x, cx - r, cy - r, cx + r, cy + r, [[0, glass[0]], [0.6, glass[1]], [1, '#030405']]); x.beginPath(); x.ellipse(cx, cy, r * 0.88, r, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(8,10,12,0.9)'; x.beginPath(); x.ellipse(cx + 2, cy + 2, r * 0.4, r * 0.46, 0, 0, TAU); x.fill(); // the lens within
  x.fillStyle = `rgba(230,236,232,${dome ? 0.32 : 0.22})`; x.beginPath(); x.ellipse(cx - r * 0.3, cy - r * 0.38, r * 0.3, r * 0.14, -0.6, 0, TAU); x.fill();
}
function strobeArm(x, sx, sy, ex, ey, metal, k) {
  x.lineCap = 'round'; x.strokeStyle = mix(metal, '#000', 0.4); x.lineWidth = 16; x.beginPath(); x.moveTo(sx, sy); x.lineTo((sx + ex) / 2, (sy + ey) / 2 - 30); x.lineTo(ex, ey); x.stroke();
  x.strokeStyle = metal; x.lineWidth = 10; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(sx, sy - 3); x.lineTo((sx + ex) / 2, (sy + ey) / 2 - 33); x.lineTo(ex, ey - 3); x.stroke();
  for (const [bx, by] of [[sx, sy], [(sx + ex) / 2, (sy + ey) / 2 - 30]]) { x.fillStyle = lin(x, bx - 10, by - 10, bx + 10, by + 10, [[0, mix(metal, '#fff', 0.4)], [1, mix(metal, '#000', 0.5)]]); x.beginPath(); x.arc(bx, by, 11, 0, TAU); x.fill(); }
  // the strobe head: a short cylinder, its diffuser facing forward
  x.fillStyle = lin(x, 0, ey - 44, 0, ey + 44, [[0, '#4a4c4e'], [0.35, '#2a2c2e'], [1, '#0e0f10']]); x.beginPath(); x.roundRect(ex - 50, ey - 44, 96, 88, 18); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 3; x.stroke();
  for (let i = 1; i < 4; i++) { x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ex - 40 + i * 22, ey - 40); x.lineTo(ex - 40 + i * 22, ey + 40); x.stroke(); } // ribs on its body
  x.fillStyle = lin(x, 0, ey - 40, 0, ey + 40, [[0, '#5a5c5e'], [1, '#1a1b1c']]); x.beginPath(); x.ellipse(ex - 50, ey, 20, 42, 0, 0, TAU); x.fill();
  x.fillStyle = lin(x, ex - 66, ey - 34, ex - 40, ey + 34, [[0, '#efebe0'], [0.6, '#c8c4b6'], [1, '#8e8a7e']]); x.beginPath(); x.ellipse(ex - 52, ey, 15, 34, 0, 0, TAU); x.fill(); // the diffuser
}
function camColours(def) {
  const L = typeof def.look === 'object' && def.look ? def.look : null, arch = def.arch || 'compact';
  const D = { compact: ['#c9d1d4', '#8e989c'], macro: ['#b9c2c4', '#7e888c'], housed: ['#4a5258', '#2c3236'], lowlight: ['#2a2c2e', '#17191a'] }[arch] || ['#4a5258', '#2c3236'];
  const mute = (c) => mix(c, '#6a675c', 0.32); // (one mood: a housing's paint is weathered, never bright)
  return { body: L && L.body ? mute(L.body) : D[0], body2: L && L.body2 ? mute(L.body2) : D[1], acc: (L && L.accent) || '#b8955a' };
}
export function drawCam3(ctx, w, h, def) {
  const arch = def.arch || 'compact', k = RK[def.rarity] || 0, C = camColours(def), clear = arch === 'compact' || arch === 'macro';
  const metal = k >= 3 ? '#a8864e' : k >= 1 ? '#9aa0a2' : '#5a5e60';
  fitted(ctx, w, h, (x, W, H) => {
    const big = arch === 'housed' || arch === 'lowlight', bw = big ? 360 : 330, bh = big ? 250 : 230, bd = big ? 130 : 110, X = W / 2 - bw / 2 - 50, Y = H / 2 - bh / 2 + 36;
    if (big && k >= 2 && arch === 'housed') { strobeArm(x, X - 14, Y + 60, X - 190, Y - 20, metal, k); strobeArm(x, X + bw + bd * 0.85 + 16, Y + 50, X + bw + bd * 0.85 + 200, Y - 30, metal, k); }
    // grip handles either side of a big housing
    if (big) for (const hx of [X - 26, X + bw + bd * 0.85 + 4]) { x.fillStyle = '#1a1b1c'; x.beginPath(); x.roundRect(hx, Y + 20, 26, bh - 30, 12); x.fill(); x.fillStyle = lin(x, hx, 0, hx + 26, 0, [[0, '#4a4c4e'], [0.4, '#2a2c2e'], [1, '#0e0f10']]); x.beginPath(); x.roundRect(hx + 3, Y + 24, 20, bh - 38, 10); x.fill(); }
    const cols = clear ? { front: rgba(C.body, 0.85), side: rgba(mix(C.body, '#000', 0.25), 0.9), top: rgba(mix(C.body, '#fff', 0.25), 0.9) } : { front: C.body, side: mix(C.body, '#000', 0.35), top: mix(C.body, '#fff', 0.18) };
    box(x, X, Y, bw, bh, bd, cols);
    if (clear) { x.fillStyle = 'rgba(20,22,24,0.55)'; x.beginPath(); x.roundRect(X + 30, Y + 30, bw - 60, bh - 60, 8); x.fill(); } // the camera seen through the clear case
    // controls on top: the shutter lever, knobs; a latch on the side
    x.fillStyle = '#1c1d1e'; x.beginPath(); x.roundRect(X + bw * 0.62, Y - 30, 46, 22, 6); x.fill(); x.fillStyle = metal; x.beginPath(); x.roundRect(X + bw * 0.62 + 4, Y - 26, 38, 8, 4); x.fill();
    for (const kx of [X + bw * 0.2, X + bw * 0.36]) { x.fillStyle = lin(x, kx - 12, 0, kx + 12, 0, [[0, mix(metal, '#fff', 0.3)], [1, mix(metal, '#000', 0.45)]]); x.beginPath(); x.roundRect(kx - 12, Y - 22, 24, 18, 5); x.fill(); }
    x.fillStyle = metal; x.beginPath(); x.roundRect(X + bw + 20, Y + bh * 0.4, 18, 40, 5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke();
    // the port: big and flat for low light, short and forward for macro, domed on a housing
    const pr = arch === 'lowlight' ? bh * 0.4 : arch === 'macro' ? bh * 0.26 : bh * 0.34, pcx = X + bw * 0.42, pcy = Y + bh * 0.55;
    if (arch === 'macro') { x.fillStyle = lin(x, 0, pcy - pr, 0, pcy + pr, [[0, '#5a5e60'], [0.5, '#2a2c2e'], [1, '#121314']]); x.beginPath(); x.roundRect(pcx - pr - 60, pcy - pr * 0.95, 70, pr * 1.9, 10); x.fill(); }
    port(x, arch === 'macro' ? pcx - 60 : pcx, pcy, pr, arch === 'lowlight' ? '#2a2c2e' : metal, arch === 'lowlight' ? ['#1c2a2a', '#08100f'] : ['#2e3a3c', '#0c1214'], arch === 'housed');
    if (arch === 'macro') { x.fillStyle = '#e8e2c8'; x.beginPath(); x.arc(X + bw - 34, Y + 34, 12, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3; x.stroke(); } // the focus light
    if (k >= 3) { x.strokeStyle = rgba(C.acc, 0.85); x.lineWidth = 3; x.setLineDash([]); x.beginPath(); x.roundRect(X + 10, Y + 10, bw - 20, bh - 20, 6); x.stroke(); } // a fine brass bead round the front
    if (k >= 4) sparks(x, W, H, C.acc, 11 + (hash(def.id) % 97));
  });
  return true;
}

// ---------------------------------------------------------------- tanks ----------------------------------------------------------------
// (5.12.8) Cylinders laid on their side, valve to the right: a round body lit from the top, the domed shoulder, a pillar
// valve with its handwheel, a rubber boot on the base. A twin set rides on a manifold, a sidemount pair is strapped one
// behind the other, a rebreather is its compact unit with two small bottles and its hoses.
function cylinder(x, X, Y, L, R, body, band, valve, k) {
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(X + L / 2, Y + R + 6, L / 2, 8, 0, 0, TAU); x.fill();
  const g = lin(x, 0, Y - R, 0, Y + R, [[0, mix(body[1], '#fff', 0.25)], [0.18, body[0]], [0.42, body[1]], [0.8, body[2]], [1, mix(body[2], '#000', 0.4)]]);
  x.fillStyle = g; x.beginPath(); x.moveTo(X + R * 0.4, Y - R); x.lineTo(X + L - R * 0.9, Y - R); x.bezierCurveTo(X + L, Y - R, X + L + R * 0.25, Y - R * 0.45, X + L + R * 0.3, Y);
  x.bezierCurveTo(X + L + R * 0.25, Y + R * 0.45, X + L, Y + R, X + L - R * 0.9, Y + R); x.lineTo(X + R * 0.4, Y + R); x.quadraticCurveTo(X, Y + R, X, Y); x.quadraticCurveTo(X, Y - R, X + R * 0.4, Y - R); x.fill();
  x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + R * 0.5, Y - R * 0.62); x.lineTo(X + L - R, Y - R * 0.62); x.stroke(); // a long highlight
  // the rubber boot on the base, the band (rarity's colour from Uncommon), the valve
  x.fillStyle = lin(x, 0, Y - R, 0, Y + R, [[0, '#3a3a38'], [0.4, '#1c1c1b'], [1, '#0a0a0a']]); x.beginPath(); x.roundRect(X - 4, Y - R - 2, R * 0.55, R * 2 + 4, 10); x.fill();
  if (band) { x.fillStyle = lin(x, 0, Y - R, 0, Y + R, [[0, mix(band, '#fff', 0.2)], [0.5, band], [1, mix(band, '#000', 0.45)]]); x.fillRect(X + L * 0.62, Y - R, L * 0.05, R * 2); }
  const vx = X + L + R * 0.28;
  x.fillStyle = lin(x, 0, Y - R * 0.3, 0, Y + R * 0.3, [[0, mix(valve, '#fff', 0.45)], [0.5, valve], [1, mix(valve, '#000', 0.5)]]); x.beginPath(); x.roundRect(vx, Y - R * 0.26, R * 0.55, R * 0.52, 6); x.fill();
  x.fillStyle = lin(x, 0, Y - R * 0.6, 0, Y + R * 0.6, [[0, '#3a3c3e'], [1, '#101112']]); x.beginPath(); x.roundRect(vx + R * 0.5, Y - R * 0.62, R * 0.28, R * 1.24, 8); x.fill(); // the handwheel, edge-on
  for (let i = -2; i <= 2; i++) { x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(vx + R * 0.52, Y + i * R * 0.22); x.lineTo(vx + R * 0.76, Y + i * R * 0.22); x.stroke(); }
}
function tankColours(def) {
  const T = def.tankLook, arch = def.arch || 'al';
  const D = { al: ['#b8bec1', '#8a9296', '#4e5559'], steel: ['#5a6064', '#3e4448', '#1c2022'], big: ['#6e6a4e', '#4e4a34', '#26241a'], twin: ['#5a6064', '#3e4448', '#1c2022'], side: ['#6a7074', '#484e52', '#24282a'], rebreather: ['#3a3c3e', '#24262a', '#0e0f10'] }[arch] || ['#5a6064', '#3e4448', '#1c2022'];
  const mute = (c) => mix(c, '#6a675c', 0.4); // (painted cylinders weathered, never bright)
  return { body: T && T.body ? T.body.map(mute) : D, band: T && T.band ? T.band : null };
}
export function drawTank3(ctx, w, h, def) {
  const arch = def.arch || 'al', k = RK[def.rarity] || 0, C = tankColours(def), valve = k >= 3 ? '#a8864e' : k >= 2 ? '#c8ccce' : '#8e9396', band = k >= 1 ? C.band || '#7a6040' : null;
  fitted(ctx, w, h, (x, W, H) => {
    const big = (def.air || 20) > 90, L = big ? 640 : 560, R = big ? 70 : 62, X = W / 2 - L / 2 - 40;
    if (arch === 'twin') { cylinder(x, X + 20, H / 2 - R * 0.9, L, R * 0.9, C.body, band, valve, k); cylinder(x, X, H / 2 + R * 0.95, L, R * 0.9, C.body, band, valve, k);
      x.fillStyle = valve; x.fillRect(X + L + R * 0.6, H / 2 - R * 0.9, 18, R * 1.85); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2; x.strokeRect(X + L + R * 0.6, H / 2 - R * 0.9, 18, R * 1.85); // the manifold
      for (const yy of [H / 2 - R * 0.9, H / 2 + R * 0.95]) { x.fillStyle = '#2a2a28'; x.fillRect(X + L * 0.28, yy - R * 0.92, 22, R * 1.84); x.fillRect(X + L * 0.55, yy - R * 0.92, 22, R * 1.84); } } // the bands
    else if (arch === 'side') { cylinder(x, X + 60, H / 2 - R * 0.75, L, R * 0.85, C.body, band, valve, k); cylinder(x, X, H / 2 + R * 0.85, L, R * 0.85, C.body, band, valve, k);
      for (const [xx, yy] of [[X + 60, H / 2 - R * 0.75], [X, H / 2 + R * 0.85]]) { x.fillStyle = '#1a1a19'; x.fillRect(xx + L * 0.2, yy - R * 0.9, 14, R * 1.8); x.fillRect(xx + L * 0.7, yy - R * 0.9, 14, R * 1.8); } } // bungees
    else if (arch === 'rebreather') { // the unit: a moulded case, two small bottles beside it, the loop's hoses
      cylinder(x, X + 360, H / 2 + 70, 300, 40, C.body.map((c) => mix(c, '#8a9296', 0.3)), band, valve, k); cylinder(x, X + 360, H / 2 - 70, 300, 40, C.body.map((c) => mix(c, '#8a9296', 0.3)), band, valve, k);
      x.fillStyle = lin(x, 0, H / 2 - 120, 0, H / 2 + 120, [[0, mix(C.body[0], '#fff', 0.1)], [0.5, C.body[1]], [1, C.body[2]]]); x.beginPath(); x.roundRect(X, H / 2 - 120, 330, 240, 28); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + 20, H / 2 - 116); x.lineTo(X + 310, H / 2 - 116); x.stroke();
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.roundRect(X + 40, H / 2 - 70, 250, 26, 8); x.fill(); x.beginPath(); x.roundRect(X + 40, H / 2 + 40, 250, 26, 8); x.fill(); // the lid's seams
      x.strokeStyle = '#111'; x.lineWidth = 18; x.lineCap = 'round'; x.beginPath(); x.moveTo(X + 80, H / 2 - 120); x.bezierCurveTo(X + 60, H / 2 - 190, X + 260, H / 2 - 200, X + 250, H / 2 - 120); x.stroke(); // the breathing loop
      x.strokeStyle = 'rgba(255,255,255,0.1)'; x.lineWidth = 5; x.stroke(); }
    else cylinder(x, X, H / 2, L, R, C.body, band, valve, k);
    if (k >= 4) sparks(x, W, H, C.band || '#c8a868', 13 + (hash(def.id) % 97));
  });
  return true;
}

// ---------------------------------------------------------------- bags ----------------------------------------------------------------
// (5.12.8) A catch bag lying on its side, opening to the left: a mesh sack (its diamond weave shaded round the bulge), a
// drawstring or a hard collar with its spring flap, a handle loop; a divided specimen bag is a hard case, lid and
// compartments; a light bag fine, pale mesh.
function bagColours(def) {
  const B = def.bagLook, arch = def.arch || 'mesh';
  const D = { mesh: ['#3a4a3e', '#6e7a5e'], large: ['#2e3a34', '#5e6e5a'], divided: ['#3a3e40', '#7a8084'], light: ['#5a6252', '#9aa088'] }[arch] || ['#3a4a3e', '#6e7a5e'];
  const mute = (c) => mix(c, '#6a675c', 0.25);
  return { body: B && B.body ? mute(B.body) : D[0], acc: B && B.accent ? B.accent : D[1] };
}
export function drawBag3(ctx, w, h, def) {
  const arch = def.arch || 'mesh', k = RK[def.rarity] || 0, C = bagColours(def), metal = k >= 3 ? '#a8864e' : k >= 2 ? '#b8bcbc' : '#6a6e70';
  const sz = 0.8 + Math.min(1, ((def.slots || 3) - 2) / 12) * 0.35;
  fitted(ctx, w, h, (x, W, H) => {
    x.save(); x.translate(W / 2, H / 2 + 10); x.scale(sz, sz);
    if (arch === 'divided') { // a hard case: lid, a body, compartments showing through a window, latches and a handle
      const bw = 520, bh = 230;
      x.fillStyle = mix(C.body, '#fff', 0.15); x.beginPath(); x.moveTo(-bw / 2 + 20, -bh / 2); x.lineTo(bw / 2 - 20, -bh / 2); x.lineTo(bw / 2 + 50, -bh / 2 - 40); x.lineTo(-bw / 2 + 90, -bh / 2 - 40); x.closePath(); x.fill();
      x.fillStyle = mix(C.body, '#000', 0.35); x.beginPath(); x.moveTo(bw / 2, -bh / 2 + 10); x.lineTo(bw / 2 + 70, -bh / 2 - 30); x.lineTo(bw / 2 + 70, bh / 2 - 40); x.lineTo(bw / 2, bh / 2); x.closePath(); x.fill();
      x.fillStyle = lin(x, 0, -bh / 2, 0, bh / 2, [[0, mix(C.body, '#fff', 0.08)], [1, mix(C.body, '#000', 0.3)]]); x.beginPath(); x.roundRect(-bw / 2, -bh / 2, bw, bh, 16); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke();
      x.fillStyle = 'rgba(14,18,20,0.7)'; x.beginPath(); x.roundRect(-bw / 2 + 40, -bh / 2 + 50, bw - 80, bh - 100, 8); x.fill();
      const n = Math.max(2, Math.min(6, Math.round((def.slots || 4) / 2))); for (let i = 1; i < n; i++) { const xx = -bw / 2 + 40 + (bw - 80) * i / n; x.fillStyle = 'rgba(200,210,200,0.25)'; x.fillRect(xx - 3, -bh / 2 + 50, 6, bh - 100); } // the dividers
      x.fillStyle = 'rgba(230,236,230,0.16)'; x.beginPath(); x.moveTo(-bw / 2 + 50, -bh / 2 + 56); x.lineTo(-bw / 2 + 140, -bh / 2 + 56); x.lineTo(-bw / 2 + 90, bh / 2 - 56); x.lineTo(-bw / 2 + 50, bh / 2 - 56); x.fill(); // glare on the window
      for (const lx of [-bw / 2 + 60, bw / 2 - 100]) { x.fillStyle = metal; x.beginPath(); x.roundRect(lx, -bh / 2 - 8, 40, 26, 5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke(); }
      x.strokeStyle = '#1a1b1c'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(-70, -bh / 2 - 30); x.quadraticCurveTo(0, -bh / 2 - 90, 70, -bh / 2 - 30); x.stroke();
      if (k >= 1) { x.fillStyle = C.acc; x.fillRect(-bw / 2, bh / 2 - 26, bw, 10); }
    } else { // a mesh sack on its side, the opening to the left
      const L = arch === 'large' ? 560 : 500, R = arch === 'large' ? 120 : 100, light = arch === 'light';
      const sack = () => { x.beginPath(); x.moveTo(-L / 2 + 40, -R * 0.75); x.bezierCurveTo(-L / 2 + 160, -R * 1.15, L / 2 - 120, -R * 1.05, L / 2, -R * 0.15); x.quadraticCurveTo(L / 2 + 14, 0, L / 2, R * 0.15); x.bezierCurveTo(L / 2 - 120, R * 1.05, -L / 2 + 160, R * 1.15, -L / 2 + 40, R * 0.75); x.closePath(); };
      x.save(); sack(); x.fillStyle = rgba(C.body, light ? 0.55 : 0.85); x.fill(); x.clip();
      x.fillStyle = lin(x, 0, -R, 0, R, [[0, 'rgba(255,255,255,0.18)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.45)']]); x.fillRect(-L, -R * 1.4, L * 2, R * 2.8);
      const step = light ? 14 : 22; x.lineWidth = light ? 1.6 : 2.6; // the diamond weave, darker where the mesh turns away
      for (let i = -40; i < 40; i++) { for (const sg of [1, -1]) { x.strokeStyle = 'rgba(10,12,10,0.55)'; x.beginPath(); x.moveTo(-L / 2 + i * step, -R * 1.2); x.lineTo(-L / 2 + i * step + sg * R * 1.6, R * 1.2); x.stroke(); x.strokeStyle = rgba(C.acc, 0.25); x.beginPath(); x.moveTo(-L / 2 + i * step + 1, -R * 1.2 - 1); x.lineTo(-L / 2 + i * step + sg * R * 1.6 + 1, R * 1.2 - 1); x.stroke(); } }
      x.restore(); x.save(); sack(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke(); x.restore();
      if (arch === 'large') { // the hard collar with its spring flap
        x.fillStyle = lin(x, -L / 2, 0, -L / 2 + 70, 0, [[0, '#2a2c2e'], [0.5, '#4a4e50'], [1, '#1a1b1c']]); x.beginPath(); x.ellipse(-L / 2 + 40, 0, 34, R * 0.82, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(6,6,6,0.85)'; x.beginPath(); x.ellipse(-L / 2 + 36, 0, 18, R * 0.62, 0, 0, TAU); x.fill();
        x.fillStyle = metal; x.beginPath(); x.roundRect(-L / 2 + 10, -R * 0.9, 50, 16, 5); x.fill(); }
      else { // the drawstring gathered at the opening
        x.fillStyle = rgba(C.body, 0.95); x.beginPath(); x.ellipse(-L / 2 + 40, 0, 16, R * 0.7, 0, 0, TAU); x.fill();
        x.strokeStyle = mix(C.acc, '#d8d0b8', 0.4); x.lineWidth = 6; x.beginPath(); x.moveTo(-L / 2 + 40, -R * 0.6); x.bezierCurveTo(-L / 2 - 40, -R * 0.4, -L / 2 - 50, R * 0.5, -L / 2 - 10, R * 0.9); x.stroke();
        x.fillStyle = metal; x.beginPath(); x.roundRect(-L / 2 - 26, R * 0.78, 30, 22, 6); x.fill(); } // the toggle
      x.strokeStyle = '#1a1b1c'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(-L / 2 + 120, -R * 0.95); x.quadraticCurveTo(-L / 2 + 190, -R * 1.6, -L / 2 + 270, -R * 1.0); x.stroke(); // the handle loop
      x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 4; x.stroke();
      if (k >= 1) { x.save(); sack(); x.clip(); x.strokeStyle = C.acc; x.lineWidth = k >= 2 ? 12 : 8; x.beginPath(); x.moveTo(-L / 2 + 60, -R * 0.9); x.bezierCurveTo(-L / 2 + 80, -R * 0.3, -L / 2 + 80, R * 0.3, -L / 2 + 60, R * 0.9); x.stroke(); x.restore(); } // a webbing band
      if (k >= 3) { x.setLineDash([7, 6]); x.strokeStyle = rgba('#e8d8b0', 0.7); x.lineWidth = 2.5; x.beginPath(); x.moveTo(-L / 2 + 52, -R * 0.85); x.bezierCurveTo(-L / 2 + 70, -R * 0.3, -L / 2 + 70, R * 0.3, -L / 2 + 52, R * 0.85); x.stroke(); x.setLineDash([]); }
    }
    x.restore();
    if (k >= 4) sparks(x, W, H, C.acc, 17 + (hash(def.id) % 97));
  });
  return true;
}

// ---------------------------------------------------------------- nets ----------------------------------------------------------------
// (5.12.9) A hand net lying across the frame, handle to the left: a real pole with its grip and end cap, a frame seen at
// an angle at the far end, and the mesh bag hanging behind it in a soft cone, its knots catching the light. Each kind its
// frame: a round hoop (everyday, sure), a square dip frame (gentle), a long pole and a teardrop (reach), a short quick
// net, a big D-frame (big game), a wide seine frame (school).
const NET_SHAPE = { everyday: { pole: 430, r: 90, f: 'round' }, sure: { pole: 440, r: 100, f: 'round', deep: 1.3 }, gentle: { pole: 420, r: 90, f: 'square' }, reach: { pole: 600, r: 78, f: 'tear' },
  quick: { pole: 320, r: 74, f: 'round' }, big: { pole: 500, r: 120, f: 'd' }, school: { pole: 440, r: 100, f: 'wide' } };
export function drawNet3(ctx, w, h, def) {
  const S = NET_SHAPE[def.arch] || NET_SHAPE.everyday, k = RK[def.rarity] || 0, L = typeof def.look === 'object' && def.look ? def.look : {};
  const mute = (c) => mix(c, '#6a675c', 0.25), hoop = L.hoop ? mute(L.hoop) : k >= 3 ? '#8a6a34' : '#3e4448', handle = L.h ? L.h.map(mute) : k >= 3 ? ['#a07a48', '#6e5030', '#3a2a18'] : ['#7a8288', '#4a5258', '#22272a'];
  const mesh = k >= 3 ? '#5a5a46' : '#3a4a3a', metal = k >= 3 ? '#a8864e' : k >= 2 ? '#b8bcbc' : '#5a5e60';
  fitted(ctx, w, h, (x, W, H) => {
    const tot = S.pole + S.r * 2.2, sc = Math.min(1, 900 / tot); x.save(); x.translate(W / 2 - (tot * sc) / 2, H / 2 + 20); x.scale(sc, sc); x.rotate(-0.06);
    const fx = S.pole + S.r, fy = -10, rx = S.r * 0.55, ry = S.r; // the frame's centre; seen at an angle, it is an upright ellipse
    // the mesh bag behind the frame: a cone hanging down and back, shaded, its weave
    const depth = S.r * 1.9 * (S.deep || 1);
    const bag = () => { x.beginPath(); x.moveTo(fx, fy - ry); x.bezierCurveTo(fx + rx * 2.2, fy - ry * 0.6, fx + depth * 0.9, fy + ry * 0.6, fx + depth * 0.55, fy + ry * 1.25); x.bezierCurveTo(fx + depth * 0.3, fy + ry * 1.5, fx + rx * 0.4, fy + ry * 1.3, fx, fy + ry); x.closePath(); };
    x.save(); bag(); x.fillStyle = rgba(mesh, 0.35); x.fill(); x.clip();
    x.lineWidth = 2; for (let i = -30; i < 30; i++) for (const sg of [1, -1]) { x.strokeStyle = rgba(mix(mesh, '#000', 0.3), 0.75); x.beginPath(); x.moveTo(fx - 100 + i * 16, fy - ry * 1.4); x.lineTo(fx - 100 + i * 16 + sg * ry * 2.6, fy + ry * 1.8); x.stroke(); }
    x.fillStyle = lin(x, fx, 0, fx + depth, 0, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.05)']]); x.fillRect(fx - 50, fy - ry * 2, depth + 100, ry * 4); x.restore();
    x.save(); bag(); x.strokeStyle = rgba(mix(mesh, '#000', 0.4), 0.8); x.lineWidth = 3; x.stroke(); x.restore();
    // the frame
    const frame = () => { x.beginPath();
      if (S.f === 'square') x.roundRect(fx - rx, fy - ry, rx * 2, ry * 2, 10);
      else if (S.f === 'tear') { x.moveTo(fx - rx * 1.3, fy); x.bezierCurveTo(fx - rx * 0.6, fy - ry * 1.1, fx + rx, fy - ry * 1.05, fx + rx, fy); x.bezierCurveTo(fx + rx, fy + ry * 1.05, fx - rx * 0.6, fy + ry * 1.1, fx - rx * 1.3, fy); }
      else if (S.f === 'd') { x.moveTo(fx - rx * 0.7, fy - ry); x.lineTo(fx - rx * 0.7, fy + ry); x.bezierCurveTo(fx + rx * 1.5, fy + ry, fx + rx * 1.5, fy - ry, fx - rx * 0.7, fy - ry); }
      else if (S.f === 'wide') x.ellipse(fx, fy, rx * 0.8, ry * 1.25, 0, 0, TAU);
      else x.ellipse(fx, fy, rx, ry, 0, 0, TAU); };
    x.save(); frame(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 16; x.stroke(); x.strokeStyle = hoop; x.lineWidth = 11; x.stroke(); x.restore();
    x.save(); x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.6); x.strokeStyle = rgba('#ffffff', 0.3); x.lineWidth = 3; x.stroke(); x.restore();
    // the pole: lit from the top, its grip near the end, an end cap, a ferrule where it meets the frame
    const R0 = 13, x0 = 0, x1 = fx - (S.f === 'tear' ? rx * 1.3 : S.f === 'd' ? rx * 0.7 : rx);
    x.fillStyle = lin(x, 0, -R0, 0, R0, [[0, mix(handle[0], '#fff', 0.2)], [0.3, handle[0]], [0.65, handle[1]], [1, handle[2]]]); x.beginPath(); x.roundRect(x0, -R0, x1 - x0, R0 * 2, R0); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.stroke();
    const gripC = k >= 1 && L.h ? mix(handle[2], '#000', 0.3) : '#1a1b1c'; x.fillStyle = lin(x, 0, -R0 - 3, 0, R0 + 3, [[0, mix(gripC, '#fff', 0.15)], [1, mix(gripC, '#000', 0.4)]]); x.beginPath(); x.roundRect(x0 + 10, -R0 - 3, 120, R0 * 2 + 6, R0); x.fill(); // the grip
    for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2; x.beginPath(); x.moveTo(x0 + 18 + i * 13, -R0); x.lineTo(x0 + 24 + i * 13, R0); x.stroke(); }
    x.fillStyle = metal; x.beginPath(); x.roundRect(x1 - 30, -R0 - 2, 30, R0 * 2 + 4, 4); x.fill(); x.fillStyle = '#121314'; x.beginPath(); x.roundRect(x0 - 8, -R0 - 1, 14, R0 * 2 + 2, 5); x.fill(); // the ferrule, the end cap
    if (k >= 1 && !L.h) { x.fillStyle = '#7a6040'; x.fillRect(x0 + 140, -R0, 16, R0 * 2); } // a band of colour below the grip
    x.restore();
    if (k >= 4) sparks(x, W, H, hoop, 19 + (hash(def.id) % 97));
  });
  return true;
}
