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
