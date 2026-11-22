// (5.15.6) The buttons' pictures painted as objects, not symbols: each part a solid lit from the top left (a lighter
// face, a darker turn, a dark rim where it meets the coin), worn (specks, chips, scuffs), a sharp highlight where
// metal or wet rubber catches the light. Drawn on the coin's box of +/-50 units, as coins.js's own art is.
const TAU = Math.PI * 2;
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c); if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } const r = /rgba?\(([^)]+)\)/.exec(c || ''); return r ? r[1].split(',').slice(0, 3).map((v) => +v) : [60, 60, 56]; };
const mix = (c, t, k) => { const a = hex(c), b = hex(t); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };

// a solid: its fill lit along (lx,ly)->(dx,dy), a rim of shadow inside its lower edge, specks of wear, an outline
function solid(x, path, col, o = {}) {
  const { from = [-30, -30], to = [30, 30], hi = 0.28, lo = 0.5, wear = 0, seed = 1, line = 2.2, ink = '#0a0b09' } = o;
  const g = x.createLinearGradient(from[0], from[1], to[0], to[1]); g.addColorStop(0, mix(col, '#fff4e0', hi)); g.addColorStop(0.45, col); g.addColorStop(1, mix(col, '#000', lo));
  x.fillStyle = g; x.fill(path);
  x.save(); x.clip(path);
  if (wear) { const r = rnd(seed); for (let i = 0; i < wear; i++) { const px = (r() - 0.5) * 100, py = (r() - 0.5) * 100, s = 0.4 + r() * 1.3; x.fillStyle = r() < 0.5 ? 'rgba(255,240,210,0.16)' : 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(px, py, s * 1.6, s, r() * 3, 0, TAU); x.fill(); } }
  x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,0.28)'; x.translate(1.6, 2.2); x.stroke(path); // the turn into shadow
  x.restore();
  if (line) { x.lineWidth = line; x.strokeStyle = ink; x.stroke(path); }
}
// a round bar (pole, finger, pipe) from a to b, width w, shaded across its width
function bar(x, ax, ay, bx, by, w, col, o = {}) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  x.save(); x.translate(ax, ay); x.rotate(a);
  const p = new Path2D(); p.roundRect(0, -w / 2, L, w, w / 2);
  const g = x.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, mix(col, '#fff4e0', o.hi ?? 0.35)); g.addColorStop(0.35, col); g.addColorStop(1, mix(col, '#000', 0.55));
  x.lineWidth = o.line ?? 2.2; x.strokeStyle = '#0a0b09'; x.stroke(p); x.fillStyle = g; x.fill(p);
  if (o.shine !== false) { x.strokeStyle = 'rgba(255,250,235,0.32)'; x.lineWidth = Math.max(0.8, w * 0.12); x.beginPath(); x.moveTo(w * 0.4, -w * 0.22); x.lineTo(L - w * 0.4, -w * 0.22); x.stroke(); }
  x.restore();
}
function bolt(x, bx, by, r, col = '#5a5e5a') {
  const g = x.createRadialGradient(bx - r * 0.4, by - r * 0.4, 0, bx, by, r); g.addColorStop(0, mix(col, '#fff', 0.5)); g.addColorStop(1, mix(col, '#000', 0.45));
  x.fillStyle = g; x.strokeStyle = '#0a0b09'; x.lineWidth = 1.4; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill(); x.stroke();
}

export const PAINTED = {
  // a diver's glove, palm towards us and the fingers a little apart: black neoprene going grey where it is worn,
  // a pattern of grip dots on the palm, seams down the fingers, the cuff closed with a strap
  hand(x) {
    x.save(); x.translate(2, 4); x.rotate(-0.08);
    const rub = '#34383a';
    // the fingers, back to front: each a tapered round bar with a seam and a knuckle crease
    const fingers = [[-15, -6, -22, -40, 9.5], [-4, -9, -6, -46, 10], [7, -8, 9, -44, 9.8], [17, -4, 22, -34, 8.6]];
    for (const [ax, ay, bx, by, w] of fingers) {
      bar(x, ax, ay, bx, by, w, rub, { hi: 0.3 });
      x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 1; const mx = ax + (bx - ax) * 0.55, my = ay + (by - ay) * 0.55; x.beginPath(); x.moveTo(mx - w * 0.4, my); x.lineTo(mx + w * 0.4, my + 0.6); x.stroke();
    }
    // the palm: a broad rounded block, the thumb's root swelling at the left
    const palm = new Path2D('M-21 -8C-22 -12 -14 -14 -4 -14C8 -14 20 -12 22 -6C25 4 22 18 14 24L-12 24C-20 18 -23 6 -21 -8Z');
    solid(x, palm, rub, { wear: 40, seed: 3, from: [-20, -14], to: [20, 24] });
    // the thumb, out to the left and across
    bar(x, -18, 10, -36, -6, 11, rub, { hi: 0.32 });
    // grip dots
    x.fillStyle = 'rgba(150,152,140,0.45)'; for (let gy = -6; gy <= 16; gy += 5) for (let gx = -14 + ((gy / 5) % 2) * 2.5; gx <= 16; gx += 5) { x.beginPath(); x.arc(gx, gy, 1.1, 0, TAU); x.fill(); }
    // a sheen of wet rubber across the palm
    const sh = x.createLinearGradient(-20, -14, 10, 10); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); x.fillStyle = sh; x.fill(palm);
    // the cuff and its strap, an olive webbing band with a worn buckle
    const cuff = new Path2D(); cuff.roundRect(-16, 22, 32, 18, 3); solid(x, cuff, '#24272a', { wear: 20, seed: 9, from: [0, 22], to: [0, 40] });
    const strap = new Path2D(); strap.roundRect(-18, 27, 36, 7, 2); solid(x, strap, '#5c5a3e', { wear: 14, seed: 4, from: [0, 27], to: [0, 34], line: 1.6 });
    const bk = new Path2D(); bk.roundRect(6, 25.5, 9, 10, 2); solid(x, bk, '#8a8270', { from: [6, 25], to: [15, 36], line: 1.4 });
    x.restore();
  },
  // the sub's manipulator: an olive-painted upper arm, chipped to bare steel, a chromed ram, a black hydraulic hose
  // looping between the joints, the wrist and two steel jaws with teeth, closing
  claw(x) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    // the hose behind
    x.strokeStyle = '#0a0b09'; x.lineWidth = 6; x.beginPath(); x.moveTo(-44, 22); x.bezierCurveTo(-46, -6, -18, -14, -10, 0); x.stroke();
    x.strokeStyle = '#1e2020'; x.lineWidth = 3.6; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; x.stroke();
    bar(x, -48, 40, -26, 12, 15, '#5a5e40'); // the upper arm, olive paint
    { const r = rnd(7); for (let i = 0; i < 9; i++) { const t = r(), px = -48 + 22 * t, py = 40 - 28 * t + (r() - 0.5) * 8; x.fillStyle = r() < 0.5 ? 'rgba(160,166,160,0.55)' : 'rgba(96,52,30,0.6)'; x.beginPath(); x.ellipse(px, py, 1.4 + r() * 1.8, 0.8 + r(), r() * 3, 0, TAU); x.fill(); } } // chips to steel, rust
    bar(x, -42, 34, -24, 22, 5, '#b8bcbc', { hi: 0.6 }); // the ram, chrome
    bar(x, -26, 12, -4, 4, 12, '#6a6e66'); // the forearm, bare steel
    bolt(x, -26, 12, 6.5, '#6a6e62');
    // the jaws: thick, bevelled, a row of teeth along each inner edge
    for (const sg of [-1, 1]) {
      const jaw = new Path2D(sg < 0 ? 'M-4 -2C6 -20 28 -27 44 -15L39 -8C27 -16 12 -12 4 3Z' : 'M-4 6C6 22 28 28 44 17L39 10C27 18 12 14 4 1Z');
      solid(x, jaw, '#8a9090', { from: [0, sg < 0 ? -26 : 2], to: [20, sg < 0 ? 0 : 28], hi: 0.4, wear: 18, seed: sg < 0 ? 5 : 6 });
      x.fillStyle = '#d8dcd6'; x.strokeStyle = '#0a0b09'; x.lineWidth = 0.9;
      for (let k = 0; k < 4; k++) { const tx = 14 + k * 6.5, ty = sg < 0 ? -11 + k * 0.4 : 12 - k * 0.4; x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + 2.4, ty + sg * 4.5); x.lineTo(tx + 4.6, ty); x.closePath(); x.fill(); x.stroke(); }
    }
    bolt(x, -2, 2, 7.5, '#70746c');
  },
  // leaving the sub: the hatch above, seen from inside. A heavy ring of steel with its bolts, the lid swung up on its
  // hinge with the handwheel on it, the water's light falling in, the top rungs of the ladder going up into it
  leave(x) {
    // the light from the open hatch
    const lg = x.createRadialGradient(0, -20, 2, 0, -10, 46); lg.addColorStop(0, 'rgba(200,226,214,0.55)'); lg.addColorStop(1, 'rgba(60,100,96,0)');
    x.fillStyle = lg; x.beginPath(); x.moveTo(-24, -20); x.lineTo(24, -20); x.lineTo(34, 46); x.lineTo(-34, 46); x.closePath(); x.fill();
    // the opening and the ring
    x.fillStyle = '#0e1414'; x.beginPath(); x.ellipse(0, -20, 26, 11, 0, 0, TAU); x.fill();
    const op = x.createRadialGradient(0, -24, 1, 0, -20, 22); op.addColorStop(0, '#cfe2d6'); op.addColorStop(0.6, '#5a8078'); op.addColorStop(1, 'rgba(40,64,62,0)');
    x.fillStyle = op; x.beginPath(); x.ellipse(0, -21, 21, 8.5, 0, 0, TAU); x.fill();
    const ring = new Path2D(); ring.ellipse(0, -20, 30, 14, 0, 0, TAU); ring.ellipse(0, -20, 23, 9.5, 0, 0, TAU, true);
    solid(x, ring, '#5a5e44', { from: [0, -34], to: [0, -6], wear: 22, seed: 2 });
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; bolt(x, Math.cos(a) * 26.5, -20 + Math.sin(a) * 11.8, 1.6, '#7a7e66'); }
    // the lid, swung up and back on its hinge at the left, the handwheel's spokes on its face
    x.save(); x.translate(-22, -26); x.rotate(-1.05);
    const lid = new Path2D(); lid.ellipse(0, -14, 9, 18, 0, 0, TAU); solid(x, lid, '#4c5038', { from: [-9, -30], to: [9, 4], wear: 16, seed: 8 });
    x.strokeStyle = '#0a0b09'; x.lineWidth = 2.6; x.beginPath(); x.ellipse(0, -14, 5, 10, 0, 0, TAU); x.stroke(); x.strokeStyle = '#9a9a82'; x.lineWidth = 1.4; x.stroke();
    x.strokeStyle = '#9a9a82'; x.lineWidth = 1.2; for (const a of [0, 1.05, 2.1]) { x.beginPath(); x.moveTo(Math.cos(a) * 5, -14 + Math.sin(a) * 10); x.lineTo(-Math.cos(a) * 5, -14 - Math.sin(a) * 10); x.stroke(); }
    x.restore();
    // the ladder: two rails and rungs, nearer and wider towards us
    bar(x, -11, -14, -17, 48, 4.4, '#7e8274', { hi: 0.4 }); bar(x, 11, -14, 17, 48, 4.4, '#7e8274', { hi: 0.4 });
    for (let k = 0; k < 5; k++) { const y = -4 + k * 11, w = 11.5 + k * 1.3; bar(x, -w, y, w, y, 3.8, '#8a8e80', { hi: 0.45, line: 1.8 }); }
  },
  // diving in from the deck: the water's surface across the coin, Earl's legs and fins going in head first, a crown of
  // splash round where he went in, bubbles already rising in the water below
  dive(x) {
    // the water below the line, darker with depth
    const wg = x.createLinearGradient(0, 6, 0, 50); wg.addColorStop(0, '#3e6a72'); wg.addColorStop(1, '#14262a');
    x.fillStyle = wg; x.beginPath(); x.moveTo(-50, 8); for (let k = -50; k <= 50; k += 10) x.quadraticCurveTo(k + 5, 5 + (k % 20 ? 3 : -3), k + 10, 8); x.lineTo(50, 50); x.lineTo(-50, 50); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(214,232,226,0.65)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-50, 8); for (let k = -50; k <= 50; k += 10) x.quadraticCurveTo(k + 5, 5 + (k % 20 ? 3 : -3), k + 10, 8); x.stroke();
    // his body under the water, faint
    x.fillStyle = 'rgba(16,24,26,0.55)'; x.beginPath(); x.ellipse(2, 24, 7, 14, 0.1, 0, TAU); x.fill();
    // the legs going in, the suit's dark neoprene, then the fins spread at the top
    bar(x, -3, 10, -8, -18, 8.5, '#2a2e30', { hi: 0.28 }); bar(x, 5, 10, 9, -18, 8.5, '#2a2e30', { hi: 0.28 });
    for (const [bx, by, a] of [[-8, -18, -0.35], [9, -18, 0.35]]) {
      x.save(); x.translate(bx, by); x.rotate(a);
      const fin = new Path2D('M-4.5 2C-6 -8 -9 -22 -10 -32C-4 -35 4 -35 10 -32C9 -22 6 -8 4.5 2Z'); solid(x, fin, '#3a3e3a', { from: [-10, -34], to: [10, 2], wear: 10, seed: a > 0 ? 3 : 4 });
      x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1; for (const k of [-4, 0, 4]) { x.beginPath(); x.moveTo(k * 0.4, -2); x.lineTo(k, -30); x.stroke(); }
      x.restore();
    }
    // the splash crown and the ring on the water
    x.strokeStyle = 'rgba(230,240,236,0.8)'; x.lineWidth = 1.8; x.beginPath(); x.ellipse(1, 9, 20, 4.5, 0, 0, TAU); x.stroke();
    const r = rnd(11); x.fillStyle = 'rgba(232,242,238,0.9)';
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI, d = 16 + r() * 6; const px = 1 + Math.cos(a) * d, py = 7 + Math.sin(a) * d * 0.5 - r() * 7; x.beginPath(); x.ellipse(px, py, 1.6, 2.6, a, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(214,232,226,0.7)'; x.lineWidth = 1.2; for (const [bx, by, br] of [[-14, 30, 2.2], [-20, 40, 1.6], [16, 34, 2], [20, 44, 1.4], [-8, 44, 1.2]]) { x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke(); }
  },
};

// (5.15.6) the ability button's Sprint: a pair of fins mid-kick (one up, one down) with a wake curling off their tips,
// painted in bone and bronze; more at each tier: the rare's bare fins; the exotic's with a stitched strap and a second
// curl of wake; the legendary's in worn bronze, bubbles streaming from the wake
export function paintSprint(x, tier = 'rare') {
  const exo = tier === 'exotic' || tier === 'legendary', leg = tier === 'legendary', col = leg ? '#a07a44' : '#c8bc9c';
  // the wake: two or three curls of water peeling off behind (to the left), pale and soft
  const curl = (y0, r0, a) => { x.strokeStyle = `rgba(214,224,214,${a})`; x.lineWidth = 3.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(6, y0); x.bezierCurveTo(-14, y0 - 2, -30, y0 + 4, -40, y0 + r0); x.stroke();
    x.lineWidth = 1.6; x.beginPath(); x.arc(-40 + Math.abs(r0) * 0.8, y0 + r0, Math.abs(r0) * 0.8, Math.PI * 0.9, Math.PI * 2.1); x.stroke(); };
  curl(-14, 8, 0.75); curl(18, -8, 0.6); if (exo) curl(2, 6, 0.45);
  if (leg) { x.strokeStyle = 'rgba(226,234,226,0.7)'; x.lineWidth = 1.1; for (const [bx, by, br] of [[-30, -2, 2.4], [-38, 8, 1.6], [-22, 10, 1.8], [-44, -12, 1.4], [-34, 22, 1.5]]) { x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke(); } }
  // the two fins seen from above in a scissor kick: each a dark foot pocket at the right and a broad blade fanning out
  // to the left, wider at its square tip, ribs along it and its rails catching the light; one swung up, one down
  for (const [ty, a, far] of [[-20, -0.36, true], [20, 0.3, false]]) {
    x.save(); x.translate(30, ty); x.rotate(a); x.scale(0.86, 0.86); if (far) x.globalAlpha = 0.88;
    const blade = new Path2D('M-14 -8C-30 -11 -48 -17 -62 -20C-65 -8 -65 8 -62 20C-48 17 -30 11 -14 8Z');
    solid(x, blade, col, { from: [-62, -20], to: [-14, 20], hi: 0.32, wear: 22, seed: far ? 5 : 6, line: 2.4 });
    x.strokeStyle = 'rgba(0,0,0,0.38)'; x.lineWidth = 1.4; for (const k of [-1, 0, 1]) { x.beginPath(); x.moveTo(-16, k * 4); x.lineTo(-60, k * 11); x.stroke(); }
    x.strokeStyle = 'rgba(255,248,226,0.35)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-16, -7); x.lineTo(-60, -18); x.stroke(); // the upper rail lit
    const pocket = new Path2D('M-16 -10C-8 -14 6 -13 12 -8C16 -4 16 4 12 8C6 13 -8 14 -16 10Z'); solid(x, pocket, mix(col, '#000', 0.45), { from: [-16, -12], to: [14, 12], wear: 10, seed: 3, line: 2.4 });
    x.fillStyle = '#0c0d0b'; x.beginPath(); x.ellipse(4, 0, 6, 5.5, 0, 0, TAU); x.fill(); // the foot opening
    if (exo) { x.setLineDash([2.2, 2]); x.strokeStyle = 'rgba(232,220,190,0.75)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(-14, -6.5); x.bezierCurveTo(-6, -10, 6, -9, 10, -5); x.stroke(); x.setLineDash([]);
      x.strokeStyle = '#1e1c16'; x.lineWidth = 3.4; x.lineCap = 'round'; x.beginPath(); x.arc(14, 0, 7, -1.3, 1.3); x.stroke(); } // stitched, a heel strap
    if (leg) { x.strokeStyle = 'rgba(232,200,130,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-18, 8.5); x.lineTo(-61, 19); x.stroke(); } // a bright worn edge on the bronze
    x.restore();
  }
}
// (5.15.6) the other abilities' emblems painted in bone on the coin (the coin's face carries the rarity's colour):
// the emblem's own shape, filled with a lit gradient, a dark edge under it
export function paintMask(x, mask, legendary = false) {
  const c = document.createElement('canvas'); c.width = c.height = mask.width; const t = c.getContext('2d');
  t.drawImage(mask, 0, 0); t.globalCompositeOperation = 'source-in';
  const g = t.createLinearGradient(0, 0, c.width, c.height); const base = legendary ? '#c09a5c' : '#d8ceb0';
  g.addColorStop(0, mix(base, '#fff', 0.3)); g.addColorStop(0.5, base); g.addColorStop(1, mix(base, '#000', 0.4)); t.fillStyle = g; t.fillRect(0, 0, c.width, c.height);
  const sh = document.createElement('canvas'); sh.width = sh.height = mask.width; const s = sh.getContext('2d'); s.drawImage(mask, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#000'; s.fillRect(0, 0, sh.width, sh.height);
  x.globalAlpha = 0.7; x.drawImage(sh, -46, -44, 96, 96); x.globalAlpha = 1; x.drawImage(c, -48, -48, 96, 96);
}

// (5.15.6) the bag counter's picture: Earl's own mesh catch bag, a little sack of olive netting with something in it,
// its drawstring gathered at the neck and a webbing loop, drawn small and once per size
const bagCache = new Map();
export function drawBagIcon(ctx, cx, cy, size) {
  const key = Math.round(size); let c = bagCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * 1.3); const x = c.getContext('2d'); x.translate(c.width / 2, c.width / 2); x.scale(size / 100, size / 100);
    const sack = new Path2D('M-20 -22C-34 -12 -40 10 -32 28C-24 42 24 42 32 28C40 10 34 -12 20 -22Z');
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.save(); x.translate(3, 5); x.fill(sack); x.restore();
    const g = x.createLinearGradient(-30, -20, 30, 40); g.addColorStop(0, '#7a7a5a'); g.addColorStop(0.5, '#4e5038'); g.addColorStop(1, '#262818'); x.fillStyle = g; x.fill(sack);
    x.save(); x.clip(sack); x.fillStyle = 'rgba(20,22,16,0.55)'; x.beginPath(); x.ellipse(2, 18, 22, 14, 0, 0, TAU); x.fill(); // the catch inside, a dark shape
    x.strokeStyle = 'rgba(206,200,170,0.55)'; x.lineWidth = 2.2; for (let k = -60; k < 60; k += 10) { x.beginPath(); x.moveTo(k, -30); x.quadraticCurveTo(k + 14, 8, k + 30, 44); x.stroke(); x.beginPath(); x.moveTo(k + 30, -30); x.quadraticCurveTo(k + 16, 8, k, 44); x.stroke(); }
    x.restore(); x.lineWidth = 3.6; x.strokeStyle = '#0c0d09'; x.stroke(sack);
    const neck = new Path2D(); neck.roundRect(-22, -28, 44, 10, 4); solid(x, neck, '#5c5a3e', { from: [0, -28], to: [0, -18], line: 3 }); // the drawstring's band
    x.strokeStyle = '#0c0d09'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(-12, -28); x.bezierCurveTo(-12, -46, 12, -46, 12, -28); x.stroke(); x.strokeStyle = '#8a8466'; x.lineWidth = 3.6; x.stroke(); // the loop
    const tog = new Path2D(); tog.roundRect(14, -24, 9, 14, 3); solid(x, tog, '#9a9070', { from: [14, -24], to: [23, -10], line: 2 }); // the toggle
    bagCache.set(key, c);
  }
  ctx.drawImage(c, cx - c.width / 2, cy - c.width / 2);
}

// (5.16.0) the cooldown's hourglass: two worn brass caps, glass bulbs with the sand run partly through, small and painted
export function drawHourglass(ctx, cx, cy, h) {
  ctx.save(); ctx.translate(cx, cy); const w = h * 0.62;
  const glass = new Path2D(); glass.moveTo(-w * 0.8, -h * 0.8); glass.bezierCurveTo(-w * 0.8, -h * 0.2, -w * 0.12, -h * 0.12, -w * 0.12, 0); glass.bezierCurveTo(-w * 0.12, h * 0.12, -w * 0.8, h * 0.2, -w * 0.8, h * 0.8);
  glass.lineTo(w * 0.8, h * 0.8); glass.bezierCurveTo(w * 0.8, h * 0.2, w * 0.12, h * 0.12, w * 0.12, 0); glass.bezierCurveTo(w * 0.12, -h * 0.12, w * 0.8, -h * 0.2, w * 0.8, -h * 0.8); glass.closePath();
  ctx.fillStyle = 'rgba(214,226,220,0.18)'; ctx.fill(glass);
  ctx.save(); ctx.clip(glass); ctx.fillStyle = '#c8a86a'; ctx.beginPath(); ctx.moveTo(-w, h * 0.8); ctx.lineTo(w, h * 0.8); ctx.lineTo(w, h * 0.42); ctx.quadraticCurveTo(0, h * 0.2, -w, h * 0.42); ctx.closePath(); ctx.fill();
  ctx.fillRect(-w, -h * 0.35, w * 2, h * 0.3); ctx.fillRect(-h * 0.03, -h * 0.1, h * 0.06, h * 0.6); ctx.restore(); // sand below, a little left above, the thread running
  ctx.lineWidth = Math.max(1, h * 0.09); ctx.strokeStyle = 'rgba(236,228,206,0.85)'; ctx.stroke(glass);
  for (const sy of [-1, 1]) { ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.roundRect(-w, sy * h * 0.8 - h * 0.13, w * 2, h * 0.26, h * 0.08); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(0.8, h * 0.06); ctx.stroke(); }
  ctx.restore();
}

// (5.16.0) the Blessed mark: a small bronze sunburst, eight worn rays round a domed boss, as a fish's card shows it
let BLESS_URL = null;
export function blessedURL() {
  if (BLESS_URL) return BLESS_URL;
  const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.translate(24, 24);
  for (let i = 0; i < 8; i++) { x.save(); x.rotate(i * Math.PI / 4); const long = i % 2 === 0, L = long ? 21 : 15;
    x.beginPath(); x.moveTo(-3.2, -6); x.quadraticCurveTo(0, -L - 2, 3.2, -6); x.closePath(); x.fillStyle = long ? '#b08a4e' : '#8a6a3a'; x.fill(); x.strokeStyle = 'rgba(20,14,6,0.8)'; x.lineWidth = 1.4; x.stroke(); x.restore(); }
  const g = x.createRadialGradient(-2.5, -2.5, 0.5, 0, 0, 8); g.addColorStop(0, '#f0d8a0'); g.addColorStop(0.55, '#b08a4e'); g.addColorStop(1, '#5a4020');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, 7.5, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(20,14,6,0.85)'; x.lineWidth = 1.6; x.stroke();
  BLESS_URL = c.toDataURL(); return BLESS_URL;
}

// ---------------------------------------------------------------- (5.16.0) the ability coins ----------------------------------------------------------------
// One painted picture per skill, on the coin's +/-50 box, and the tier told by craft as well as the face's colour: a rare
// coin plain; an exotic one with an engraved ring round its rim; a legendary one with a bronze filigree rim and its picture
// in old gilt (the HUD adds its drifting sparks). Pictures: Sprint, your fins in a scissor kick with streaks and a wake;
// Dash, a spear thrown to the right, crackling; Vigor, the net thrust out with power running up its pole; Flare, a hand
// flare burning (Lighthouse, a lighthouse); Echo, a sonar scope; Ironhull, a riveted plate and a weld closing a crack;
// Tidewarden, a wave of blue turning back the red
const BONE = '#d8ceb0', GILT = '#c09a5c';
function arc2(x, pts, col, w) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.stroke(); }
function zap(x, x0, y0, x1, y1, seed, col, w = 1.6, seg = 6, amp = 4) { // a small jagged arc of light between two points
  const r = rnd(seed), pts = [[x0, y0]]; for (let i = 1; i < seg; i++) { const k = i / seg; pts.push([x0 + (x1 - x0) * k + (r() - 0.5) * amp * 2, y0 + (y1 - y0) * k + (r() - 0.5) * amp * 2]); } pts.push([x1, y1]);
  x.save(); x.shadowColor = col; x.shadowBlur = 6; arc2(x, pts, col, w); x.restore(); arc2(x, pts, 'rgba(255,250,236,0.9)', w * 0.45);
}
function tierRim(x, tier) {
  if (tier === 'exotic') { x.strokeStyle = 'rgba(226,214,186,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, 47, 0, TAU); x.stroke(); x.lineWidth = 0.9; x.beginPath(); x.arc(0, 0, 43.5, 0, TAU); x.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; x.beginPath(); x.moveTo(Math.cos(a) * 43.5, Math.sin(a) * 43.5); x.lineTo(Math.cos(a) * 47, Math.sin(a) * 47); x.stroke(); } }
  if (tier === 'legendary') { x.lineWidth = 3; x.strokeStyle = '#6e5028'; x.beginPath(); x.arc(0, 0, 46, 0, TAU); x.stroke(); x.lineWidth = 1.6; x.strokeStyle = GILT; x.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.save(); x.rotate(a); x.strokeStyle = GILT; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-6, -46); x.quadraticCurveTo(-3, -41, 0, -43.5); x.quadraticCurveTo(3, -46, 6, -41.5); x.stroke();
      x.fillStyle = '#e8cc90'; x.beginPath(); x.arc(0, -46, 1.6, 0, TAU); x.fill(); x.restore(); } }
}
const ABIL_ART = {
  sprint(x, tier) {
    const leg = tier === 'legendary', exo = tier !== 'rare', col = leg ? GILT : BONE;
    // speed: long streaks running back from the fins, and a wake curling off their tips
    for (const [y0, l, w, a] of [[-22, 34, 2.2, 0.5], [-8, 44, 2.6, 0.6], [6, 38, 2.4, 0.55], [20, 30, 2, 0.45]].concat(exo ? [[-30, 22, 1.6, 0.35], [28, 22, 1.6, 0.35]] : [])) arc2(x, [[-6 - l, y0], [-6, y0]], `rgba(222,232,220,${a})`, w);
    x.strokeStyle = 'rgba(214,226,214,0.6)'; x.lineWidth = 1.6; x.beginPath(); x.arc(-40, -10, 6, Math.PI * 0.5, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(-44, 12, 5, Math.PI * 0.1, Math.PI * 1.5); x.stroke();
    if (exo) for (const [bx, by, br] of [[-30, -16, 2], [-38, 2, 1.6], [-26, 14, 1.8], [-44, -4, 1.2]]) { x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke(); }
    // the fins, both from one point (the ankles) at the right: one swung up, one down, blades fanning left
    for (const [a, far] of [[-0.42, true], [0.42, false]]) {
      x.save(); x.translate(32, 2); x.rotate(Math.PI + a); if (far) x.globalAlpha = 0.86;
      const blade = new Path2D('M8 -5C22 -6 36 -9 52 -11C55 -4 55 4 52 11C36 9 22 6 8 5Z');
      solid(x, blade, col, { from: [8, -16], to: [52, 16], hi: 0.3, wear: 18, seed: far ? 5 : 6, line: 2.2 });
      x.strokeStyle = 'rgba(0,0,0,0.38)'; x.lineWidth = 1.2; for (const k of [-1, 1]) { x.beginPath(); x.moveTo(10, k * 2.5); x.lineTo(50, k * 7); x.stroke(); }
      const pocket = new Path2D(); pocket.roundRect(-6, -7.5, 18, 15, 6); solid(x, pocket, mix(col, '#000', 0.5), { from: [-6, -9], to: [12, 9], line: 2.2 });
      x.fillStyle = '#0c0d0b'; x.beginPath(); x.ellipse(0, 0, 4, 5, 0, 0, TAU); x.fill();
      if (exo) { x.setLineDash([2, 2]); x.strokeStyle = 'rgba(232,220,190,0.7)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-4, -7); x.lineTo(10, -7); x.stroke(); x.setLineDash([]); }
      x.restore();
    }
  },
  dash(x, tier) {
    const leg = tier === 'legendary', exo = tier !== 'rare';
    x.save(); x.rotate(-0.32); x.scale(1.18, 1.35);
    // the shaft, ash-wood, a cord binding at the head and a grip wrap
    bar(x, -46, 0, 18, 0, 5.4, leg ? '#8a6a3e' : '#7a6448', { hi: 0.35 });
    for (let i = 0; i < 4; i++) { x.strokeStyle = '#2a2016'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(10 + i * 2.4, -3); x.lineTo(12 + i * 2.4, 3); x.stroke(); }
    for (let i = 0; i < 5; i++) { x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-34 + i * 3, -2.8); x.lineTo(-32 + i * 3, 2.8); x.stroke(); }
    // the head, a long leaf of steel (gilt on a legendary), a ridge down its middle
    const head = new Path2D('M16 0C22 -10 34 -12 52 0C34 12 22 10 16 0Z'); solid(x, head, leg ? GILT : '#b8bcb8', { from: [18, -8], to: [50, 8], hi: 0.45, wear: 10, seed: 4, line: 2 });
    x.strokeStyle = 'rgba(255,255,255,0.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(20, -0.5); x.lineTo(48, -0.5); x.stroke();
    // the crackle: arcs of light round the head and running down the shaft
    const zc = leg ? 'rgba(236,206,140,0.9)' : 'rgba(214,226,214,0.85)', n = tier === 'rare' ? 3 : tier === 'exotic' ? 5 : 8;
    for (let i = 0; i < n; i++) { const a = -1.2 + i * (2.4 / Math.max(1, n - 1)), r0 = 9, r1 = 14 + (i % 2) * 6; zap(x, 34 + Math.cos(a) * r0, Math.sin(a) * r0, 34 + Math.cos(a) * r1 + 6, Math.sin(a) * r1, 11 + i * 7, zc, 1.4, 4, 2.5); }
    if (exo) { zap(x, 14, -5, -20, -8, 91, zc, 1.2, 7, 3); zap(x, 14, 5, -16, 9, 93, zc, 1.2, 7, 3); }
    if (leg) zap(x, -2, -6, -40, -2, 95, zc, 1.4, 8, 4);
    x.restore();
  },
  vigor(x, tier) {
    const leg = tier === 'legendary', exo = tier !== 'rare', col = leg ? GILT : BONE;
    // the pole, from the lower left up to the hoop at the upper right
    bar(x, -44, 40, 4, -2, 5.6, leg ? '#8a6a3e' : '#6e6a58', { hi: 0.35 });
    // the hoop, seen at an angle, its bag behind
    const bag = new Path2D('M2 -6C-2 14 14 34 26 30C38 26 42 6 36 -14Z'); x.fillStyle = 'rgba(40,46,38,0.55)'; x.fill(bag);
    x.save(); x.clip(bag); x.strokeStyle = 'rgba(214,206,176,0.5)'; x.lineWidth = 1; for (let k = -30; k < 60; k += 6) { x.beginPath(); x.moveTo(k - 20, -20); x.lineTo(k + 10, 40); x.stroke(); x.beginPath(); x.moveTo(k + 20, -20); x.lineTo(k - 10, 40); x.stroke(); } x.restore();
    x.save(); x.shadowColor = leg ? 'rgba(236,200,130,0.9)' : 'rgba(214,232,214,0.8)'; x.shadowBlur = exo ? 10 : 6; x.strokeStyle = col; x.lineWidth = 4.5; x.beginPath(); x.ellipse(20, -10, 18, 10, -0.5, 0, TAU); x.stroke(); x.restore();
    x.strokeStyle = '#1a1a14'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(20, -10, 20, 12, -0.5, 0, TAU); x.stroke();
    // power running up the pole in arcs, and a ripple ahead of the hoop
    const zc = leg ? 'rgba(236,206,140,0.9)' : 'rgba(214,232,214,0.85)';
    zap(x, -40, 34, -6, 4, 21, zc, 1.6, 8, 3.5); if (exo) zap(x, -34, 38, -2, 8, 23, zc, 1.3, 8, 3); if (leg) zap(x, -44, 30, -10, 0, 25, zc, 1.3, 8, 4);
    x.strokeStyle = 'rgba(222,232,220,0.45)'; x.lineWidth = 1.6; for (const r of exo ? [26, 32, 38] : [28, 34]) { x.beginPath(); x.arc(20, -10, r, -1.3, 0.2); x.stroke(); }
  },
  flare(x, tier) {
    if (tier === 'legendary') { // Lighthouse: a stone tower on its rock, the lantern lit, two beams going out
      for (const s of [-1, 1]) { const g = x.createLinearGradient(0, -26, s * 50, -40); g.addColorStop(0, 'rgba(255,236,190,0.55)'); g.addColorStop(1, 'rgba(255,236,190,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, -26); x.lineTo(s * 52, -46); x.lineTo(s * 52, -20); x.closePath(); x.fill(); }
      const rock = new Path2D('M-34 44C-30 34 -18 30 -8 32C4 28 18 30 34 44Z'); solid(x, rock, '#4a4a40', { from: [0, 28], to: [0, 44], wear: 20, seed: 3 });
      const tower = new Path2D('M-9 34L-6 -14L6 -14L9 34Z'); solid(x, tower, '#c8beaa', { from: [-9, -14], to: [9, 34], hi: 0.3, wear: 24, seed: 5 });
      for (const y of [4, 18]) { x.fillStyle = '#7a3a2a'; x.beginPath(); x.moveTo(-7.4 - (y + 14) * 0.03, y); x.lineTo(7.4 + (y + 14) * 0.03, y); x.lineTo(7.8 + (y + 14) * 0.035, y + 6); x.lineTo(-7.8 - (y + 14) * 0.035, y + 6); x.fill(); } // its red bands
      bar(x, -10, -14, 10, -14, 3, '#3a3a34', { line: 1.4 });
      const lamp = x.createRadialGradient(0, -21, 0, 0, -21, 14); lamp.addColorStop(0, '#fff6dc'); lamp.addColorStop(0.4, 'rgba(255,226,160,0.8)'); lamp.addColorStop(1, 'rgba(255,226,160,0)'); x.fillStyle = lamp; x.beginPath(); x.arc(0, -21, 14, 0, TAU); x.fill();
      x.strokeStyle = '#1a1a14'; x.lineWidth = 1.6; x.strokeRect(-5, -27, 10, 12); const cap = new Path2D('M-7 -27L0 -35L7 -27Z'); solid(x, cap, '#3a3a34', { line: 1.4 });
      return;
    }
    const exo = tier === 'exotic';
    // a marine hand flare: a short red-brown tube, its cap end, the tip burning white into red, sparks and smoke
    x.save(); x.rotate(-0.5);
    bar(x, -40, 0, 12, 0, 11, '#8a3a28', { hi: 0.3 }); x.fillStyle = '#d8ceb0'; x.fillRect(-26, -5.5, 12, 11); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1; x.strokeRect(-26, -5.5, 12, 11); // its paper label
    const glow = x.createRadialGradient(18, 0, 0, 18, 0, exo ? 32 : 24); glow.addColorStop(0, 'rgba(255,244,224,0.95)'); glow.addColorStop(0.25, 'rgba(255,170,120,0.7)'); glow.addColorStop(1, 'rgba(255,120,80,0)'); x.fillStyle = glow; x.beginPath(); x.arc(18, 0, exo ? 32 : 24, 0, TAU); x.fill();
    x.fillStyle = '#fffaf0'; x.beginPath(); x.ellipse(15, 0, 4, 6, 0, 0, TAU); x.fill();
    const r = rnd(7); x.fillStyle = 'rgba(255,220,170,0.95)'; for (let i = 0; i < (exo ? 16 : 9); i++) { const a = (r() - 0.5) * 2.2, d = 10 + r() * (exo ? 26 : 18); x.beginPath(); x.arc(18 + Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 1.3, 0, TAU); x.fill(); }
    x.restore();
    x.strokeStyle = 'rgba(200,196,184,0.35)'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(14, -18); x.bezierCurveTo(4, -30, 22, -36, 12, -48); x.stroke(); // smoke
  },
  echo(x, tier) {
    const exo = tier !== 'rare', leg = tier === 'legendary';
    const glass = x.createRadialGradient(-8, -8, 2, 0, 0, 38); glass.addColorStop(0, '#2c3a26'); glass.addColorStop(1, '#0e140c'); x.fillStyle = glass; x.beginPath(); x.arc(0, 0, 36, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(150,190,120,0.45)'; x.lineWidth = 1; for (const r of exo ? [9, 18, 27] : [12, 24]) { x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }
    if (exo) { for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, l = i % 3 === 0 ? 5 : 2.5; x.beginPath(); x.moveTo(Math.cos(a) * 36, Math.sin(a) * 36); x.lineTo(Math.cos(a) * (36 - l), Math.sin(a) * (36 - l)); x.stroke(); } }
    const sw = x.createRadialGradient(0, 0, 0, 0, 0, 36); sw.addColorStop(0, 'rgba(180,220,150,0.55)'); sw.addColorStop(1, 'rgba(180,220,150,0.05)'); x.fillStyle = sw; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 36, -1.9, -0.9); x.closePath(); x.fill();
    arc2(x, [[0, 0], [Math.cos(-0.9) * 36, Math.sin(-0.9) * 36]], 'rgba(214,240,190,0.85)', 1.6);
    for (const [px, py] of [[14, -20], [-18, 10], [22, 12]].concat(leg ? [[-8, -26], [6, 26]] : [])) { x.fillStyle = '#ece4cc'; x.beginPath(); x.arc(px, py, 2.4, 0, TAU); x.fill(); x.strokeStyle = 'rgba(236,228,204,0.5)'; x.beginPath(); x.arc(px, py, 5, 0, TAU); x.stroke(); }
    x.strokeStyle = leg ? GILT : '#5a5e44'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 37, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 39.5, 0, TAU); x.stroke();
  },
  ironhull(x) {
    const plate = new Path2D('M-40 -24L36 -30L40 24L-36 30Z'); solid(x, plate, '#5a5e44', { from: [-40, -30], to: [40, 30], wear: 40, seed: 9 });
    const r = rnd(5); for (let i = 0; i < 9; i++) { const k = i / 8; bolt(x, -36 + 72 * k, -25 - 4 * k + 2, 2.2, '#7a7e66'); bolt(x, -32 + 72 * k, 25 + 4 * (1 - k) - 1, 2.2, '#7a7e66'); }
    // the crack across it, and the weld closing it from the left: a glowing bead, then cooling to a dark seam
    const crack = [[-24, -10], [-12, -4], [-4, -12], [8, 0], [16, -6], [28, 8]];
    arc2(x, crack, '#0a0b09', 2.4);
    x.save(); x.shadowColor = 'rgba(255,190,120,0.9)'; x.shadowBlur = 10; arc2(x, crack.slice(0, 4), '#ffcf8a', 3.2); x.restore(); arc2(x, crack.slice(0, 4), '#fff4dc', 1.4);
    // the welding torch at the bead: a brass nozzle on its hose, the arc's white point at its tip
    x.save(); x.translate(8, 0); x.rotate(-0.9); bar(x, 4, 0, 30, 0, 6, '#9a8050', { hi: 0.45, line: 1.6 }); bar(x, 30, 0, 50, 0, 8, '#2a2a26', { line: 1.6 }); x.restore();
    { const gl = x.createRadialGradient(8, 0, 0, 8, 0, 14); gl.addColorStop(0, 'rgba(255,252,240,1)'); gl.addColorStop(0.3, 'rgba(255,214,150,0.7)'); gl.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = gl; x.beginPath(); x.arc(8, 0, 14, 0, TAU); x.fill(); }
    const sp = rnd(3); x.fillStyle = 'rgba(255,214,150,0.95)'; for (let i = 0; i < 16; i++) { const a = -Math.PI * 0.9 + sp() * Math.PI * 0.8, d = 4 + sp() * 16; x.beginPath(); x.arc(8 + Math.cos(a) * d, Math.sin(a) * d, 0.8 + sp() * 1.1, 0, TAU); x.fill(); }
    void r;
  },
  tidewarden(x) {
    // the red water at the left, and a great wave of deep blue rising and curling over it from the right
    { const rd = x.createRadialGradient(-30, 6, 2, -24, 6, 44); rd.addColorStop(0, 'rgba(140,26,20,0.9)'); rd.addColorStop(0.6, 'rgba(110,18,14,0.55)'); rd.addColorStop(1, 'rgba(110,18,14,0)'); x.fillStyle = rd;
      x.beginPath(); x.moveTo(-50, -40); for (let k = 0; k <= 10; k++) x.lineTo(-50 + 30 + Math.sin(k * 1.7) * 8, -40 + k * 9); x.lineTo(-50, 50); x.closePath(); x.fill();
      x.fillStyle = 'rgba(160,40,30,0.5)'; for (const [px, py, pr] of [[-36, -14, 3], [-28, 20, 2.4], [-40, 30, 2], [-20, -2, 1.6]]) { x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill(); } } // the red water, ragged where the blue meets it
    const wave = new Path2D('M50 44L50 -6C40 -38 6 -46 -14 -30C-26 -20 -24 -4 -12 -4C-2 -4 -2 -18 8 -18C22 -18 26 4 14 18C4 30 -20 34 -48 44Z');
    solid(x, wave, '#3a6a8a', { from: [-20, -40], to: [40, 40], hi: 0.35, wear: 14, seed: 4, line: 2.4 });
    x.strokeStyle = 'rgba(226,240,246,0.75)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-12, -4); x.bezierCurveTo(-24, -6, -24, -22, -12, -30); x.bezierCurveTo(4, -42, 34, -38, 46, -10); x.stroke(); // the crest's foam
    for (const [fx, fy, fr] of [[-16, -32, 2.4], [-6, -38, 1.8], [10, -40, 2], [28, -34, 1.6]]) { x.fillStyle = 'rgba(236,246,250,0.85)'; x.beginPath(); x.arc(fx, fy, fr, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(200,226,236,0.4)'; x.lineWidth = 1.4; for (const k of [10, 20, 30]) { x.beginPath(); x.moveTo(-40, 44 - k * 0.2); x.quadraticCurveTo(0, 30 - k * 0.5, 46, 26 - k); x.stroke(); }
  },
};
export function paintAbility(x, fam, tier) {
  const f = ABIL_ART[fam]; if (!f) return false;
  x.save(); x.scale(1.06, 1.06); f(x, tier); x.restore(); tierRim(x, tier); return true;
}

// (5.16.0) the rest of the buttons repainted as objects: the glow stick amber (as it lights the water), the dive lamp, the
// settings cog in worn brass, the pet a muted reef fish, the eye a deep sea-grey, the chart a folded sea chart, the spare
// air a small steel bottle, the tank room a glass tank with its water lit
Object.assign(PAINTED, {
  glow(x, look) {
    const on = look && look.lit, gl = x.createRadialGradient(0, 0, 2, 0, 0, on ? 46 : 34); gl.addColorStop(0, on ? 'rgba(255,196,110,0.55)' : 'rgba(255,190,110,0.28)'); gl.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = gl; x.beginPath(); x.arc(0, 0, 46, 0, TAU); x.fill();
    x.save(); x.rotate(-0.7);
    const tube = new Path2D(); tube.roundRect(-30, -7, 54, 14, 7); const tg = x.createLinearGradient(0, -7, 0, 7); tg.addColorStop(0, '#fff0c8'); tg.addColorStop(0.4, on ? '#ffc070' : '#d8a060'); tg.addColorStop(1, on ? '#c87a30' : '#8a6030'); x.fillStyle = tg; x.fill(tube); x.lineWidth = 2; x.strokeStyle = '#2a1a0c'; x.stroke(tube);
    x.strokeStyle = 'rgba(255,255,240,0.6)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-26, -3.5); x.lineTo(20, -3.5); x.stroke();
    const cap = new Path2D(); cap.roundRect(22, -8, 10, 16, 3); solid(x, cap, '#3a3a34', { line: 1.8 });
    x.strokeStyle = '#1a1a14'; x.lineWidth = 2.4; x.beginPath(); x.arc(38, 0, 6, -1.2, 1.2); x.stroke(); x.restore(); // the lanyard loop
  },
  lamp(x, look) {
    const on = !look || look.lit !== false;
    const beam = x.createLinearGradient(6, 0, 50, 0); beam.addColorStop(0, 'rgba(255,240,206,0.55)'); beam.addColorStop(1, 'rgba(255,240,206,0)'); x.fillStyle = beam; x.beginPath(); x.moveTo(8, -7); x.lineTo(50, -24); x.lineTo(50, 24); x.lineTo(8, 7); x.closePath(); x.fill();
    bar(x, -40, 2, -4, 2, 13, '#6a6e66', { hi: 0.4 }); for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-34 + i * 4.5, -4); x.lineTo(-34 + i * 4.5, 8); x.stroke(); } // the ribbed grip
    const head = new Path2D('M-6 -9L8 -12L8 16L-6 13Z'); solid(x, head, '#2a2c2a', { from: [-6, -12], to: [8, 16], line: 2 });
    const lens = x.createRadialGradient(8, 2, 0, 8, 2, 10); lens.addColorStop(0, on ? '#fffaf0' : '#8a9090'); lens.addColorStop(1, on ? 'rgba(255,224,170,0.7)' : '#3a3e3e'); x.fillStyle = lens; x.beginPath(); x.ellipse(8.5, 2, 3.5, 12.5, 0, 0, TAU); x.fill(); x.strokeStyle = '#111'; x.lineWidth = 1.4; x.stroke();
    const sw = new Path2D(); sw.roundRect(-22, -7, 8, 4, 1.5); solid(x, sw, '#8a3a28', { line: 1 }); // the switch
  },
  gear(x) {
    const g = new Path2D(); const n = 10; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, r = i % 2 ? 26 : 34, a2 = a + TAU / (n * 2); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); } g.closePath(); g.arc(0, 0, 11, 0, TAU, true);
    solid(x, g, '#9a7a48', { from: [-34, -34], to: [34, 34], hi: 0.4, wear: 40, seed: 6, line: 2.4 });
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 20, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(255,240,200,0.25)'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 21.5, Math.PI * 1.1, Math.PI * 1.8); x.stroke();
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; bolt(x, Math.cos(a) * 16, Math.sin(a) * 16, 2, '#7a6a48'); }
  },
  pet(x) { // a reef fish of its own, muted: a striped grunt, side on
    const body = new Path2D('M-30 0C-22 -16 6 -20 24 -8C30 -4 32 0 30 4C24 14 0 20 -22 10L-38 20L-34 0L-38 -20Z'); solid(x, body, '#a8905c', { from: [-30, -18], to: [30, 18], hi: 0.3, wear: 30, seed: 5, line: 2.2 });
    x.save(); x.clip(body); x.strokeStyle = 'rgba(60,70,60,0.55)'; x.lineWidth = 3; for (const k of [-10, -2, 6]) { x.beginPath(); x.moveTo(-26, k - 6); x.quadraticCurveTo(0, k - 12, 26, k - 2); x.stroke(); } x.restore();
    const fin = new Path2D('M-8 -14C-2 -26 10 -24 14 -12Z'); solid(x, fin, '#8a7448', { line: 1.6 });
    x.fillStyle = '#0c0d0b'; x.beginPath(); x.arc(18, -4, 3.4, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,240,0.8)'; x.beginPath(); x.arc(17, -5, 1.1, 0, TAU); x.fill();
  },
  eye(x) {
    const lid = new Path2D('M-40 0C-24 -22 24 -22 40 0C24 22 -24 22 -40 0Z'); solid(x, lid, '#d8ceb4', { from: [-40, -20], to: [40, 20], hi: 0.2, line: 2.4 });
    const ir = x.createRadialGradient(-3, -3, 1, 0, 0, 15); ir.addColorStop(0, '#7a8a80'); ir.addColorStop(0.7, '#3a4a44'); ir.addColorStop(1, '#1a2220'); x.fillStyle = ir; x.beginPath(); x.arc(0, 0, 15, 0, TAU); x.fill();
    x.fillStyle = '#060707'; x.beginPath(); x.ellipse(0, 0, 4, 9, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,245,0.85)'; x.beginPath(); x.arc(-5, -6, 2.6, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-40, 0); x.bezierCurveTo(-24, -22, 24, -22, 40, 0); x.stroke();
  },
  chart(x) {
    const sheet = new Path2D('M-38 -26L-12 -30L12 -24L38 -28L38 26L12 30L-12 24L-38 28Z'); solid(x, sheet, '#cfc2a0', { from: [-38, -30], to: [38, 30], hi: 0.15, wear: 40, seed: 8, line: 2 });
    x.strokeStyle = 'rgba(60,50,30,0.35)'; x.lineWidth = 1; for (const fx of [-12, 12]) { x.beginPath(); x.moveTo(fx, -28); x.lineTo(fx, 28); x.stroke(); } // the folds
    x.strokeStyle = 'rgba(70,90,80,0.7)'; x.lineWidth = 1.3; for (const [k, a] of [[0, 1], [6, 0.7], [12, 0.5]]) { x.globalAlpha = a; x.beginPath(); x.moveTo(-34, 4 + k); x.bezierCurveTo(-14, -14 + k, 6, 16 + k, 34, -4 + k); x.stroke(); } x.globalAlpha = 1; // depth contours
    x.fillStyle = 'rgba(60,40,24,0.85)'; for (const [px, py] of [[-20, -12], [14, 10], [26, -14]]) { x.beginPath(); x.arc(px, py, 1.8, 0, TAU); x.fill(); } // soundings
    x.strokeStyle = '#7a3a28'; x.lineWidth = 2; x.beginPath(); x.arc(14, 10, 5, 0, TAU); x.stroke(); // a ringed spot
  },
  air(x) {
    x.save(); x.rotate(-0.5); bar(x, -30, 0, 22, 0, 18, '#7a8084', { hi: 0.45 }); x.fillStyle = '#c8a050'; x.fillRect(-4, -9, 5, 18);
    const valve = new Path2D(); valve.roundRect(22, -5, 9, 10, 2); solid(x, valve, '#b8bcbc', { line: 1.6 }); bar(x, 30, -9, 30, 9, 4, '#3a3c3e', { line: 1.4 }); x.restore();
  },
  tank(x) {
    const box = new Path2D(); box.roundRect(-36, -24, 72, 48, 3); const wg = x.createLinearGradient(0, -24, 0, 24); wg.addColorStop(0, '#5a8a84'); wg.addColorStop(1, '#1e3836'); x.fillStyle = wg; x.fill(box);
    x.fillStyle = '#6a5e48'; x.beginPath(); x.moveTo(-36, 24); for (let k = -36; k <= 36; k += 9) x.lineTo(k, 16 - Math.sin(k * 0.2) * 2); x.lineTo(36, 24); x.fill();
    x.strokeStyle = '#4a6a3a'; x.lineWidth = 2; for (const kx of [-24, -18, 26]) { x.beginPath(); x.moveTo(kx, 18); x.quadraticCurveTo(kx - 4, 4, kx + 2, -10); x.stroke(); }
    const fish = new Path2D('M-4 0C0 -6 10 -6 14 0C10 6 0 6 -4 0L-10 -5L-10 5Z'); solid(x, fish, '#a8905c', { line: 1.4 });
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(-30, -24); x.lineTo(-20, -24); x.lineTo(-34, 20); x.lineTo(-36, 20); x.fill(); // glare on the glass
    x.lineWidth = 3; x.strokeStyle = '#2a2c28'; x.stroke(box); x.fillStyle = '#3a3c36'; x.fillRect(-38, -28, 76, 5); x.fillRect(-38, 23, 76, 5);
  },
});

// (5.17.0) a legendary net's power, as a badge on the main button: a dark plate with a bone rim, and on it the power's
// emblem, painted large once and shrunk (a stamped bronze piece, not an icon). One bold shape each, so it reads at
// about 15 px: Rebirth a whale, Second Wind three rising bubbles, Magnetic an old horseshoe magnet, Kinship a fish
// held in a ring, Eye of the Sea a glowing eye, Faithless the Old One's long tooth
// (6.0.11) each emblem painted with care at twice the size it was (a detail to find for whoever looks closely; the badge
// stays its size): shaded forms, worn surfaces, small true details, then shrunk
let ER = 1; const er = () => ((ER = (ER * 16807) % 2147483647) / 2147483647);
const EMB = {
  rebirth(x) { // a humpback rising: the long head, the throat grooves, a long pale flipper, barnacles, the flukes trailing
    ER = 311;
    const body = new Path2D(); body.moveTo(-40, 14); body.bezierCurveTo(-42, -2, -30, -16, -10, -18); body.bezierCurveTo(10, -20, 26, -12, 34, -2);
    body.bezierCurveTo(38, 4, 38, 10, 34, 14); body.bezierCurveTo(20, 20, 0, 22, -16, 21); body.bezierCurveTo(-30, 20, -38, 18, -40, 14); body.closePath();
    const tail = new Path2D(); tail.moveTo(32, 4); tail.bezierCurveTo(38, -2, 40, -10, 38, -18); tail.bezierCurveTo(42, -22, 48, -24, 52, -28); tail.bezierCurveTo(50, -20, 46, -16, 44, -14); tail.bezierCurveTo(50, -10, 54, -10, 58, -12); tail.bezierCurveTo(52, -2, 44, 4, 34, 12); tail.closePath();
    const fin = new Path2D(); fin.moveTo(-14, 14); fin.bezierCurveTo(-10, 26, -2, 36, 10, 40); fin.bezierCurveTo(4, 32, 0, 24, -4, 16); fin.closePath();
    const g = x.createLinearGradient(0, -22, 0, 24); g.addColorStop(0, '#d8cab0'); g.addColorStop(0.35, '#8a7c62'); g.addColorStop(0.7, '#4e4434'); g.addColorStop(1, '#2a241a');
    x.fillStyle = g; x.fill(tail); x.fill(body);
    x.save(); x.clip(body); // mottled skin and the pale throat
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(${er() < 0.5 ? '30,24,16' : '230,220,196'},${(0.05 + er() * 0.1).toFixed(3)})`; x.beginPath(); x.ellipse(-40 + er() * 78, -20 + er() * 42, 1 + er() * 3, 0.8 + er() * 2, er() * 3, 0, Math.PI * 2); x.fill(); }
    const tg = x.createLinearGradient(0, 8, 0, 22); tg.addColorStop(0, 'rgba(232,222,198,0)'); tg.addColorStop(1, 'rgba(232,222,198,0.55)'); x.fillStyle = tg; x.fillRect(-42, 8, 76, 16);
    x.strokeStyle = 'rgba(40,32,22,0.6)'; x.lineWidth = 0.9; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(-36 + i * 4, 12 + i * 0.2); x.quadraticCurveTo(-24 + i * 4, 19, -8 + i * 4.4, 20); x.stroke(); } // the grooves
    x.fillStyle = 'rgba(255,248,226,0.35)'; x.beginPath(); x.ellipse(-8, -15, 22, 2.6, -0.06, 0, Math.PI * 2); x.fill(); // light along the back
    x.restore();
    for (const [bx, by, n] of [[-34, 2, 5], [-24, -8, 3], [6, -14, 2]]) for (let i = 0; i < n; i++) { const px = bx + (er() - 0.5) * 6, py = by + (er() - 0.5) * 4, r = 0.9 + er() * 1.3; x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); x.fillStyle = '#3a3020'; x.beginPath(); x.arc(px, py, r * 0.4, 0, Math.PI * 2); x.fill(); } // barnacles on the head
    const fg = x.createLinearGradient(-14, 14, 10, 40); fg.addColorStop(0, '#cfc2a4'); fg.addColorStop(1, '#6a5e46'); x.fillStyle = fg; x.fill(fin); x.strokeStyle = 'rgba(30,24,16,0.8)'; x.lineWidth = 1.2; x.stroke(fin);
    x.strokeStyle = '#1a140c'; x.lineWidth = 1.8; x.stroke(body); x.stroke(tail);
    x.fillStyle = '#120d06'; x.beginPath(); x.ellipse(-22, 4, 1.8, 1.3, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,240,210,0.7)'; x.beginPath(); x.arc(-22.5, 3.5, 0.5, 0, Math.PI * 2); x.fill(); // the small eye
    x.strokeStyle = 'rgba(30,24,16,0.5)'; x.lineWidth = 0.8; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(44 + i * 3, -14 - i * 2); x.lineTo(46 + i * 3, -11 - i * 2); x.stroke(); } // nicks in the fluke
  },
  secondwind(x) { // three bubbles rising, each a thin skin of light: a bright rim, a window highlight, the far side's glow, and a few seed bubbles
    ER = 77;
    for (const [bx, by, r] of [[-20, 26, 8], [-2, 6, 12.5], [17, -21, 17]]) {
      const g = x.createRadialGradient(bx + r * 0.25, by + r * 0.3, r * 0.2, bx, by, r); g.addColorStop(0, 'rgba(190,190,160,0.08)'); g.addColorStop(0.75, 'rgba(200,196,168,0.2)'); g.addColorStop(1, 'rgba(236,230,204,0.75)');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(236,230,206,0.95)'; x.lineWidth = 1.4; x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = 'rgba(20,16,10,0.7)'; x.lineWidth = 1; x.beginPath(); x.arc(bx, by, r + 1, 0.15, 1.5); x.stroke();
      x.fillStyle = 'rgba(255,252,236,0.95)'; x.beginPath(); x.ellipse(bx - r * 0.4, by - r * 0.42, r * 0.24, r * 0.13, -0.7, 0, Math.PI * 2); x.fill(); // the window
      x.fillStyle = 'rgba(255,252,236,0.5)'; x.beginPath(); x.ellipse(bx - r * 0.12, by - r * 0.62, r * 0.08, r * 0.05, -0.3, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,246,220,0.45)'; x.lineWidth = 1.1; x.beginPath(); x.arc(bx, by, r * 0.78, 0.3, 1.2); x.stroke(); // the far side catching light
    }
    for (let i = 0; i < 6; i++) { const px = -28 + er() * 50, py = 34 - er() * 60, r = 1 + er() * 1.6; x.strokeStyle = 'rgba(232,226,200,0.8)'; x.lineWidth = 0.8; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.stroke(); }
  },
  magnetic(x) { // an old horseshoe magnet: pitted iron, its poles rust red with chipped paint, and iron filings clinging to them
    ER = 913;
    const U = new Path2D(); U.moveTo(-26, 30); U.lineTo(-26, -4); U.bezierCurveTo(-26, -40, 26, -40, 26, -4); U.lineTo(26, 30); U.lineTo(12, 30); U.lineTo(12, -4); U.bezierCurveTo(12, -21, -12, -21, -12, -4); U.lineTo(-12, 30); U.closePath();
    const g = x.createLinearGradient(-26, 0, 26, 0); g.addColorStop(0, '#9a988c'); g.addColorStop(0.3, '#6e6c62'); g.addColorStop(0.7, '#4a4840'); g.addColorStop(1, '#2c2a24');
    x.fillStyle = g; x.fill(U); x.save(); x.clip(U);
    for (let i = 0; i < 130; i++) { x.fillStyle = `rgba(${er() < 0.6 ? '20,18,14' : '200,196,180'},${(0.08 + er() * 0.18).toFixed(3)})`; x.beginPath(); x.arc(-28 + er() * 56, -36 + er() * 68, 0.4 + er() * 1.1, 0, Math.PI * 2); x.fill(); } // pitting
    const pg = x.createLinearGradient(0, 12, 0, 32); pg.addColorStop(0, '#a8503a'); pg.addColorStop(1, '#6a2a1c'); x.fillStyle = pg; x.fillRect(-30, 12, 60, 20);
    x.fillStyle = '#5a5850'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(-28 + er() * 56, 13 + er() * 18, 1 + er() * 2.4, 0.8 + er() * 1.6, er() * 3, 0, Math.PI * 2); x.fill(); } // chips in the paint
    x.strokeStyle = 'rgba(30,14,8,0.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-30, 12.5); x.lineTo(30, 12.5); x.stroke(); // the paint's edge
    x.fillStyle = 'rgba(255,250,232,0.3)'; x.fillRect(-24, -8, 3, 38); x.fillRect(14, -8, 2, 38); x.restore();
    x.strokeStyle = '#141210'; x.lineWidth = 1.8; x.stroke(U);
    x.strokeStyle = '#2a2824'; x.lineWidth = 0.8; for (const px of [-19, 19]) for (let i = 0; i < 14; i++) { const a2 = (er() - 0.5) * 1.6, l = 2 + er() * 5; x.beginPath(); x.moveTo(px + (er() - 0.5) * 12, 31); x.lineTo(px + (er() - 0.5) * 12 + Math.sin(a2) * l, 31 + Math.cos(a2) * l); x.stroke(); } // filings bristling at the poles
  },
  kinship(x) { // a fish held safe in a ring of old knotted cord (the veil), scales and fin rays drawn small
    ER = 451;
    for (let i = 0; i < 40; i++) { const a2 = i / 40 * Math.PI * 2, a3 = a2 + Math.PI / 40; x.strokeStyle = i % 2 ? '#8a7450' : '#c8b088'; x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 33, a2, a3 + 0.04); x.stroke(); x.strokeStyle = 'rgba(30,22,12,0.7)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(Math.cos(a2) * 30.5, Math.sin(a2) * 30.5); x.lineTo(Math.cos(a3) * 35.5, Math.sin(a3) * 35.5); x.stroke(); } // twisted cord
    x.strokeStyle = 'rgba(20,14,8,0.85)'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 35.8, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, 30.2, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#b89a6a'; x.beginPath(); x.ellipse(0, 33, 4.5, 3.2, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#2a1e10'; x.stroke(); // the knot
    const f = new Path2D(); f.moveTo(-20, 0); f.bezierCurveTo(-11, -12, 7, -12, 13, -2); f.lineTo(22, -11); f.quadraticCurveTo(19, 0, 22, 11); f.lineTo(13, 2); f.bezierCurveTo(7, 12, -11, 12, -20, 0); f.closePath();
    const fg = x.createLinearGradient(0, -12, 0, 12); fg.addColorStop(0, '#e8dcbc'); fg.addColorStop(0.55, '#a8946c'); fg.addColorStop(1, '#5e5038'); x.fillStyle = fg; x.fill(f);
    x.save(); x.clip(f); x.strokeStyle = 'rgba(50,38,22,0.45)'; x.lineWidth = 0.7; for (let r2 = 0; r2 < 5; r2++) for (let c2 = 0; c2 < 9; c2++) { const sx = -12 + c2 * 3.2, sy = -6 + r2 * 3 + (c2 % 2) * 1.5; x.beginPath(); x.arc(sx, sy, 1.9, -0.9, 0.9); x.stroke(); } x.restore(); // scales
    x.strokeStyle = 'rgba(40,30,16,0.6)'; x.lineWidth = 0.7; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(14, 0); x.lineTo(21, -9 + i * 4.5); x.stroke(); } // tail rays
    x.strokeStyle = '#1a140a'; x.lineWidth = 1.6; x.stroke(f);
    x.fillStyle = '#120d06'; x.beginPath(); x.arc(-12, -2, 1.9, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,240,210,0.8)'; x.beginPath(); x.arc(-12.5, -2.6, 0.6, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(40,30,16,0.6)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(-8, -7); x.quadraticCurveTo(-6, 0, -8, 7); x.stroke(); // the gill
  },
  eye(x) { // an open eye lit from within: almond lids, a fibrous warm iris, a round dark pupil, a wet glint, and its light on the brow
    ER = 129;
    const halo = x.createRadialGradient(0, 0, 4, 0, 0, 40); halo.addColorStop(0, 'rgba(240,200,130,0.5)'); halo.addColorStop(1, 'rgba(240,200,130,0)'); x.fillStyle = halo; x.beginPath(); x.arc(0, 0, 40, 0, Math.PI * 2); x.fill();
    const lid = new Path2D(); lid.moveTo(-36, 2); lid.bezierCurveTo(-18, -24, 18, -24, 36, -2); lid.bezierCurveTo(18, 20, -18, 22, -36, 2); lid.closePath();
    x.fillStyle = '#e2d8be'; x.fill(lid); x.save(); x.clip(lid);
    const sg = x.createRadialGradient(0, 0, 8, 0, 0, 36); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(60,40,20,0.6)'); x.fillStyle = sg; x.fillRect(-40, -26, 80, 50);
    const ir = x.createRadialGradient(-1, -1, 1, 0, 0, 15); ir.addColorStop(0, '#fff0c0'); ir.addColorStop(0.4, '#e8a44a'); ir.addColorStop(0.85, '#8a4a1a'); ir.addColorStop(1, '#3a1c08'); x.fillStyle = ir; x.beginPath(); x.arc(0, 0, 15, 0, Math.PI * 2); x.fill();
    x.lineWidth = 0.7; for (let i = 0; i < 46; i++) { const a2 = i / 46 * Math.PI * 2; x.strokeStyle = i % 3 ? 'rgba(120,60,20,0.45)' : 'rgba(255,230,170,0.4)'; x.beginPath(); x.moveTo(Math.cos(a2) * 5, Math.sin(a2) * 5); x.lineTo(Math.cos(a2) * (12 + er() * 3), Math.sin(a2) * (12 + er() * 3)); x.stroke(); } // the iris's fibres
    x.fillStyle = '#0e0904'; x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,252,240,0.9)'; x.beginPath(); x.ellipse(-6, -6, 3, 2, -0.5, 0, Math.PI * 2); x.fill(); // the wet glint
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(-40, -26, 80, 9); x.restore();
    x.strokeStyle = '#140e06'; x.lineWidth = 2.2; x.stroke(lid);
    x.strokeStyle = 'rgba(60,40,20,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-30, -14); x.bezierCurveTo(-14, -30, 14, -30, 30, -16); x.stroke(); // the crease above
  },
  faithless(x) { // the Old One's tithe: one long curved tooth, worn enamel with fine lengthwise lines, a dark root, a chip at the tip, a crack
    ER = 707;
    const t = new Path2D(); t.moveTo(-12, -36); t.bezierCurveTo(-4, -40, 10, -38, 14, -32); t.bezierCurveTo(16, -6, 10, 18, -4, 38); t.lineTo(-7, 36); t.bezierCurveTo(-4, 16, -10, -8, -12, -36); t.closePath();
    const g = x.createLinearGradient(-12, 0, 16, 0); g.addColorStop(0, '#f2e8cc'); g.addColorStop(0.45, '#d4c29a'); g.addColorStop(0.8, '#9a8460'); g.addColorStop(1, '#5e4c32'); x.fillStyle = g; x.fill(t);
    x.save(); x.clip(t);
    x.lineWidth = 0.6; for (let i = 0; i < 9; i++) { x.strokeStyle = `rgba(${er() < 0.5 ? '110,90,60' : '255,248,226'},0.35)`; x.beginPath(); x.moveTo(-10 + i * 2.6, -36); x.bezierCurveTo(-4 + i * 2.2, -6, -4 + i * 1.6, 14, -6 + i * 0.8, 38); x.stroke(); } // the enamel's lines
    const rg = x.createLinearGradient(0, -40, 0, -24); rg.addColorStop(0, 'rgba(60,36,20,0.9)'); rg.addColorStop(1, 'rgba(60,36,20,0)'); x.fillStyle = rg; x.fillRect(-20, -42, 40, 18); // the root
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(80,60,34,${(er() * 0.18).toFixed(3)})`; x.fillRect(-14 + er() * 30, -36 + er() * 72, 1, 1); }
    x.restore();
    x.strokeStyle = 'rgba(50,34,18,0.8)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(5, -22); x.lineTo(2, -10); x.lineTo(4, -2); x.lineTo(1, 6); x.stroke(); // a crack
    x.strokeStyle = '#16100a'; x.lineWidth = 1.8; x.stroke(t);
  },
};
const embCache = new Map();
function emblem(power, grey) { // painted at 120 px once, in colour and in grey
  const key = power + (grey ? 'g' : ''); if (embCache.has(key)) return embCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d');
  if (grey) { x.filter = 'grayscale(1) brightness(0.55)'; x.drawImage(emblem(power, false), 0, 0); x.filter = 'none'; } // only the emblem's own pixels, greyed and darkened
  else { x.translate(120, 120); x.scale(2.2, 2.2); x.lineJoin = 'round'; x.lineCap = 'round'; (EMB[power] || EMB.eye)(x); } // (6.0.11) painted at twice the size
  embCache.set(key, c); return c;
}
export const POWER_EMBLEMS = Object.keys(EMB);
// st: { sat 0..1 (grey to colour), glow 0..1 (the warm light round the badge), arc null or 0..1 (recovered so far) }
export function drawPowerBadge(ctx, cx, cy, r, power, st) {
  ctx.save();
  if (st.glow > 0.01) { const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.7); g.addColorStop(0, `rgba(220,176,100,${(0.5 * st.glow).toFixed(3)})`); g.addColorStop(1, 'rgba(220,176,100,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 1.04, 0, Math.PI * 2); ctx.fill(); // its shadow on the coin
  const pg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r); pg.addColorStop(0, '#2e2a22'); pg.addColorStop(1, '#0e0c09'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = st.sat > 0.5 ? '#d8ccaa' : '#8a8474'; ctx.lineWidth = Math.max(1.2, r * 0.11); ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2); ctx.stroke(); // the bone rim
  const s = r * 1.75, half = s / 2;
  if (st.sat < 0.99) ctx.drawImage(emblem(power, true), cx - half, cy - half, s, s);
  if (st.sat > 0.01) { ctx.globalAlpha *= st.sat; ctx.drawImage(emblem(power, false), cx - half, cy - half, s, s); ctx.globalAlpha /= st.sat; }
  if (st.arc != null) { ctx.strokeStyle = 'rgba(236,224,190,0.9)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, st.arc)); ctx.stroke(); } // the hair-thin arc: how far it has come back
  ctx.restore();
}
