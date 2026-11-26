// (7.6.53-54, owner) the scenes behind the diver in the bag. Four come free; the rest are bought with pearls. Each is
// painted once onto a canvas at the stage's size (ui.js eqBackdrop) and laid over the olive plate, see-through, fading
// at its edges. A scene draws in the turntable's units (the diver's stand is 360 x 520), across the whole stage's width
// FW, with the diver standing at FW / 2 and the seabed under his feet at PH * 0.92.
// The mood is the game's own: olive, bronze, bone, deep water, rust; light is rare and earned.

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- small painted things, shared ----------
// a seabed band: an uneven top edge, darker below, speckled with grit and the odd pebble
function seabed(y, rnd, FW, PH, top, col, dark, amp = 6) {
  const g = y.createLinearGradient(0, top - amp, 0, PH); g.addColorStop(0, col); g.addColorStop(1, dark);
  y.fillStyle = g; y.beginPath(); y.moveTo(0, PH + 2); const ph = rnd() * 6;
  for (let i = 0; i <= 40; i++) { const px = (i / 40) * FW; y.lineTo(px, top - amp * (0.5 + 0.5 * Math.sin(i * 0.45 + ph)) - rnd() * 1.5); }
  y.lineTo(FW, PH + 2); y.closePath(); y.fill();
  for (let i = 0; i < FW * 0.5; i++) { const px = rnd() * FW, py = top + rnd() * (PH - top); y.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '170,170,150'}, ${0.06 + rnd() * 0.1})`; y.fillRect(px, py, 1, 1); }
  for (let i = 0; i < FW * 0.04; i++) { const px = rnd() * FW, py = top + 4 + rnd() * (PH - top - 4), r = 1 + rnd() * 2.4; y.fillStyle = 'rgba(0,0,0,0.3)'; y.beginPath(); y.ellipse(px + 0.6, py + 0.8, r, r * 0.6, 0, 0, TAU); y.fill(); y.fillStyle = `rgba(${90 + rnd() * 40}, ${92 + rnd() * 30}, ${84 + rnd() * 20}, 0.5)`; y.beginPath(); y.ellipse(px, py, r, r * 0.6, 0, 0, TAU); y.fill(); }
}
// a boulder: lit from above, shadowed below, a few cracks
function rock(y, rnd, x, base, w, h, col = [46, 54, 52]) {
  const pts = []; for (let i = 0; i <= 10; i++) { const t = Math.PI + (i / 10) * Math.PI; pts.push([x + Math.cos(t) * w * (0.85 + rnd() * 0.25), base + Math.sin(t) * h * (0.8 + rnd() * 0.3)]); }
  const g = y.createLinearGradient(0, base - h, 0, base); g.addColorStop(0, `rgb(${col[0] + 18},${col[1] + 18},${col[2] + 16})`); g.addColorStop(1, `rgb(${col[0] - 22},${col[1] - 24},${col[2] - 24})`);
  y.fillStyle = g; y.beginPath(); y.moveTo(pts[0][0], base); for (const [px, py] of pts) y.lineTo(px, py); y.lineTo(pts[pts.length - 1][0], base); y.closePath(); y.fill();
  y.strokeStyle = 'rgba(0,0,0,0.35)'; y.lineWidth = 0.8; for (let i = 0; i < 2; i++) { const sx = x + (rnd() - 0.5) * w; y.beginPath(); y.moveTo(sx, base - h * (0.3 + rnd() * 0.5)); y.lineTo(sx + (rnd() - 0.5) * 8, base - h * 0.1); y.stroke(); }
}
// a small school far off: dark slivers all heading one way
function school(y, rnd, cx, cy, n, spread, col, dir = 1, size = 1) {
  y.fillStyle = col;
  for (let i = 0; i < n; i++) { const px = cx + (rnd() - 0.5) * spread, py = cy + (rnd() - 0.5) * spread * 0.4, l = (4 + rnd() * 2) * size;
    y.beginPath(); y.moveTo(px + dir * l, py); y.quadraticCurveTo(px, py - l * 0.32, px - dir * l * 0.7, py); y.lineTo(px - dir * l, py - l * 0.25); y.lineTo(px - dir * l, py + l * 0.25); y.lineTo(px - dir * l * 0.7, py); y.quadraticCurveTo(px, py + l * 0.32, px + dir * l, py); y.fill(); }
}
// a soft point of living light
function glowDot(y, px, py, r, rgb, a) {
  const g = y.createRadialGradient(px, py, 0, px, py, r * 5); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.25, `rgba(${rgb},${a * 0.35})`); g.addColorStop(1, `rgba(${rgb},0)`);
  y.fillStyle = g; y.fillRect(px - r * 5, py - r * 5, r * 10, r * 10); y.fillStyle = `rgba(${rgb},${Math.min(1, a * 1.4)})`; y.beginPath(); y.arc(px, py, r * 0.5, 0, TAU); y.fill();
}
// a jellyfish: a bell with a lit rim and trailing threads
function jelly(y, rnd, jx, jy, r, rgb, a) {
  const g = y.createRadialGradient(jx, jy - r * 0.3, 0, jx, jy, r * 1.2); g.addColorStop(0, `rgba(${rgb},${a * 0.45})`); g.addColorStop(1, `rgba(${rgb},${a * 0.08})`);
  y.fillStyle = g; y.beginPath(); y.moveTo(jx - r, jy); y.bezierCurveTo(jx - r, jy - r * 1.25, jx + r, jy - r * 1.25, jx + r, jy); y.quadraticCurveTo(jx, jy - r * 0.18, jx - r, jy); y.fill();
  y.strokeStyle = `rgba(${rgb},${a * 0.7})`; y.lineWidth = 0.9; y.beginPath(); y.moveTo(jx - r, jy); y.quadraticCurveTo(jx, jy - r * 0.18, jx + r, jy); y.stroke();
  y.lineWidth = 0.7; for (let k = 0; k < 7; k++) { const sx = jx - r * 0.8 + k * r * 0.27, len = r * (2 + rnd() * 2.5); y.strokeStyle = `rgba(${rgb},${a * (0.25 + rnd() * 0.25)})`; y.beginPath(); y.moveTo(sx, jy); y.bezierCurveTo(sx + (rnd() - 0.5) * r, jy + len * 0.35, sx + (rnd() - 0.5) * r, jy + len * 0.7, sx + (rnd() - 0.5) * r * 0.8, jy + len); y.stroke(); }
  y.fillStyle = `rgba(${rgb},${a * 0.3})`; for (let k = 0; k < 4; k++) { y.beginPath(); y.ellipse(jx + (k - 1.5) * r * 0.25, jy - r * 0.15, r * 0.08, r * 0.28, 0, 0, TAU); y.fill(); } // the gonads, faint
}
// a stalk that thins as it rises, bending with the current
function stalk(y, bx, by, len, lean, w0, rgba, n = 14) {
  for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, P = (t) => [bx + lean * t * t, by - len * t]; const [x0, y0] = P(t0), [x1, y1] = P(t1);
    y.strokeStyle = rgba(t0); y.lineWidth = w0 * (1 - t0 * 0.8); y.lineCap = 'round'; y.beginPath(); y.moveTo(x0, y0); y.lineTo(x1, y1); y.stroke(); }
}
// a sea anemone: a short column and a crown of tentacles
function anemone(y, rnd, ax, ay, s, col) {
  y.fillStyle = col; y.beginPath(); y.moveTo(ax - 4 * s, ay); y.lineTo(ax - 3 * s, ay - 7 * s); y.lineTo(ax + 3 * s, ay - 7 * s); y.lineTo(ax + 4 * s, ay); y.fill();
  y.strokeStyle = col; y.lineCap = 'round'; for (let k = 0; k < 11; k++) { const a = -Math.PI + (k / 10) * Math.PI + (rnd() - 0.5) * 0.2, l = (6 + rnd() * 4) * s; y.lineWidth = 1.2 * s; y.beginPath(); y.moveTo(ax, ay - 7 * s); y.quadraticCurveTo(ax + Math.cos(a) * l * 0.6, ay - 7 * s + Math.sin(a) * l * 0.9 - 2, ax + Math.cos(a) * l, ay - 7 * s + Math.sin(a) * l * 0.7); y.stroke(); }
}

export const BAG_SCENES = {
  // ---------------- free ----------------
  reef: { name: 'Reef', price: 0, water: ['#1d3a44', '#0f232b', '#060e12'], light: 'rgba(70, 106, 108, 0.22)', line: 'A deep reef: fans and whips in the current.',
    draw(y, rnd, FW, PH) { const c = FW / 2;
      for (let i = 0; i < 5; i++) rock(y, rnd, c + (rnd() - 0.5) * FW * 0.9, PH * 0.86, 30 + rnd() * 40, 16 + rnd() * 26, [26, 36, 38]); // rocks far back
      school(y, rnd, c + FW * 0.22, PH * 0.3, 14, 60, 'rgba(10, 22, 26, 0.55)', -1);
      seabed(y, rnd, FW, PH, PH * 0.88, '#1a2e33', '#081215');
      { const bx = c - 95, by = PH * 0.9, tips = []; // a sea fan, a lace web on branching ribs
        const br = (px, py, a, len, wdt, dpt) => { const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len; y.lineWidth = wdt; y.beginPath(); y.moveTo(px, py); y.quadraticCurveTo((px + ex) / 2 + (rnd() - 0.5) * 5, (py + ey) / 2 + (rnd() - 0.5) * 3, ex, ey); y.stroke();
          if (dpt >= 5 || len < 5) { tips.push([ex, ey]); return; } br(ex, ey, a - 0.26 - rnd() * 0.25, len * (0.72 + rnd() * 0.12), wdt * 0.7, dpt + 1); br(ex, ey, a + 0.26 + rnd() * 0.25, len * (0.72 + rnd() * 0.12), wdt * 0.7, dpt + 1); };
        y.strokeStyle = 'rgba(78, 66, 50, 0.85)'; y.lineCap = 'round'; br(bx, by, -Math.PI / 2 + 0.08, 44, 3.8, 0);
        tips.sort((p, q) => Math.atan2(p[1] - by, p[0] - bx) - Math.atan2(q[1] - by, q[0] - bx));
        y.fillStyle = 'rgba(88, 66, 48, 0.45)'; y.beginPath(); y.moveTo(bx, by - 22); for (const [tx, ty] of tips) y.lineTo(tx, ty); y.closePath(); y.fill(); }
      for (let i = 0; i < 5; i++) stalk(y, c + 70 + i * 16 + rnd() * 6, PH * (0.9 + rnd() * 0.02), PH * (0.18 + rnd() * 0.18), 14 + rnd() * 26, 3.4, (t) => `rgba(${120 - i * 6}, ${70 + i * 3}, 52, ${0.8 - t * 0.35})`); // rust sea whips
      for (let i = 0; i < 3; i++) { const bx = c - 30 + i * 14 + rnd() * 5, base = PH * 0.905, h = 22 + rnd() * 26, wd = 11 + rnd() * 6, lean = (rnd() - 0.5) * 6, top = base - h; // barrel sponges
        const g = y.createLinearGradient(bx - wd, 0, bx + wd, 0); g.addColorStop(0, 'rgba(70, 76, 60, 0.95)'); g.addColorStop(0.6, 'rgba(96, 98, 74, 0.95)'); g.addColorStop(1, 'rgba(56, 60, 48, 0.95)'); y.fillStyle = g;
        y.beginPath(); y.moveTo(bx - wd * 0.3, base); y.bezierCurveTo(bx - wd * 0.75, base - h * 0.4, bx - wd * 0.6 + lean, top + h * 0.2, bx - wd * 0.5 + lean, top); y.lineTo(bx + wd * 0.5 + lean, top); y.bezierCurveTo(bx + wd * 0.6 + lean, top + h * 0.2, bx + wd * 0.75, base - h * 0.4, bx + wd * 0.3, base); y.closePath(); y.fill();
        y.fillStyle = 'rgba(4, 10, 12, 0.85)'; y.beginPath(); y.ellipse(bx + lean, top + 1, wd * 0.42, 2, 0, 0, TAU); y.fill(); }
      anemone(y, rnd, c + 38, PH * 0.915, 1.2, 'rgba(150, 96, 70, 0.75)'); anemone(y, rnd, c - 140, PH * 0.92, 0.9, 'rgba(140, 120, 90, 0.6)');
      rock(y, rnd, c + 150, PH * 0.93, 34, 22, [40, 46, 42]); rock(y, rnd, c - 170, PH * 0.94, 28, 16, [38, 44, 42]);
      { y.strokeStyle = 'rgba(160, 120, 80, 0.55)'; y.lineWidth = 1.4; const sx = c + 120, sy = PH * 0.93; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; y.beginPath(); y.moveTo(sx, sy); y.quadraticCurveTo(sx + Math.cos(a) * 6, sy + Math.sin(a) * 2.4 - 2, sx + Math.cos(a + 0.4) * 11, sy + Math.sin(a + 0.4) * 3); y.stroke(); } } } }, // a brittle star
  kelp: { name: 'Kelp', price: 0, water: ['#2f5249', '#173530', '#0a1c19'], light: 'rgba(150, 170, 110, 0.2)', line: 'The kelp forest, near the light.',
    draw(y, rnd, FW, PH) { const c = FW / 2;
      const forest = (n, a, dark, tall) => { for (let i = 0; i < n; i++) { const bx = (i + 0.5 + (rnd() - 0.5) * 0.6) * FW / n, by = PH * 0.92, len = PH * tall * (0.75 + rnd() * 0.3), sway = (rnd() - 0.5) * 50, col = `rgba(${dark ? 52 : 92 + rnd() * 20}, ${dark ? 70 : 96 + rnd() * 14}, ${dark ? 50 : 50}, ${a})`;
        const P = (t) => [bx + sway * Math.sin(t * 2.2) * t, by - len * t]; y.strokeStyle = col; y.lineWidth = dark ? 2.2 : 3.4; y.lineCap = 'round'; y.beginPath(); for (let k = 0; k <= 24; k++) { const [px, py] = P(k / 24); k ? y.lineTo(px, py) : y.moveTo(px, py); } y.stroke();
        y.fillStyle = col; for (let t = 0.1; t < 0.97; t += 0.045 + rnd() * 0.07) { const [px, py] = P(t), sd = rnd() < 0.5 ? 1 : -1, bl = (dark ? 16 : 24) + rnd() * 22, rise = 6 + rnd() * 14, wv = (rnd() - 0.5) * 6;
          y.beginPath(); y.moveTo(px, py); y.bezierCurveTo(px + sd * bl * 0.3, py - rise * 0.2 - 5, px + sd * bl * 0.7, py - rise + wv, px + sd * bl, py - rise - 2); y.bezierCurveTo(px + sd * bl * 0.65, py - rise * 0.5 + 3, px + sd * bl * 0.3, py + 3, px, py + 1); y.fill();
          if (rnd() < 0.15) { y.fillStyle = `rgba(110, 104, 60, ${a})`; y.beginPath(); y.arc(px + sd * 3, py - 1, 2.2, 0, TAU); y.fill(); y.fillStyle = col; } } } }; // the odd float bladder
      forest(9, 0.35, true, 1.0); // a far row, dim
      school(y, rnd, c - FW * 0.2, PH * 0.38, 22, 80, 'rgba(14, 30, 26, 0.6)', 1);
      for (let i = 0; i < 6; i++) { const px = rnd() * FW, py = rnd() * PH * 0.4, g = y.createRadialGradient(px, py, 0, px, py, 50 + rnd() * 50); g.addColorStop(0, 'rgba(190, 200, 140, 0.08)'); g.addColorStop(1, 'rgba(190, 200, 140, 0)'); y.fillStyle = g; y.fillRect(px - 100, py - 100, 200, 200); } // sun through the canopy, in patches
      seabed(y, rnd, FW, PH, PH * 0.9, '#3a4634', '#141c14');
      for (let i = 0; i < 6; i++) rock(y, rnd, rnd() * FW, PH * 0.93, 14 + rnd() * 22, 8 + rnd() * 12, [54, 60, 46]);
      forest(5, 0.75, false, 0.95); } },
  midnight: { name: 'Midnight', price: 0, water: ['#0d1a22', '#060d12', '#020507'], light: 'rgba(40, 60, 70, 0.1)', snow: 220, line: 'The midnight zone: only the living make light.',
    draw(y, rnd, FW, PH) { const c = FW / 2;
      for (let i = 0; i < 7; i++) { const lx = rnd() * FW, ly = PH * (0.15 + rnd() * 0.6), d = rnd() < 0.5 ? 1 : -1; // lanternfish: a dim body and a row of lights
        school(y, rnd, lx, ly, 1, 1, 'rgba(26, 34, 38, 0.7)', d, 1.6); for (let k = 0; k < 5; k++) glowDot(y, lx - d * 5 + d * k * 2.4, ly + 1.4, 0.45, '170, 210, 190', 0.45); }
      for (let i = 0; i < 40; i++) glowDot(y, rnd() * FW, rnd() * PH * 0.9, 0.5 + rnd() * 1.2, rnd() < 0.8 ? '160, 200, 180' : '200, 150, 110', 0.2 + rnd() * 0.4);
      jelly(y, rnd, c + 78, PH * 0.16, 18, '150, 170, 170', 0.5); jelly(y, rnd, c - 84, PH * 0.5, 10, '150, 170, 170', 0.35);
      { y.strokeStyle = 'rgba(120, 140, 130, 0.18)'; y.lineWidth = 1.2; y.beginPath(); const sx = c - 70; for (let k = 0; k <= 40; k++) { const t = k / 40, px = sx + Math.sin(t * 6) * 12, py = PH * (0.05 + t * 0.7); k ? y.lineTo(px, py) : y.moveTo(px, py); if (k % 4 === 0) glowDot(y, px, py, 0.6, '160, 200, 180', 0.3); } y.stroke(); } // a siphonophore's long thread
      { const dx = c + 60, dy = PH * 0.7; y.fillStyle = 'rgba(12, 16, 18, 0.9)'; y.beginPath(); y.moveTo(dx - 40, dy); y.quadraticCurveTo(dx - 10, dy - 8, dx + 14, dy - 3); y.lineTo(dx + 22, dy + 2); y.quadraticCurveTo(dx - 10, dy + 6, dx - 40, dy); y.fill(); // a dragonfish, its barbel lure lit
        y.strokeStyle = 'rgba(40, 50, 52, 0.8)'; y.lineWidth = 0.8; y.beginPath(); y.moveTo(dx + 16, dy + 3); y.quadraticCurveTo(dx + 24, dy + 18, dx + 30, dy + 22); y.stroke(); glowDot(y, dx + 30, dy + 22, 1.4, '200, 160, 120', 0.7); glowDot(y, dx + 8, dy - 2, 0.9, '200, 120, 100', 0.6); } } },
  vents: { name: 'Vents', price: 0, water: ['#1c2427', '#0f1416', '#07090a'], light: 'rgba(110, 80, 60, 0.1)', line: 'Hydrothermal vents, black smoke and heat.',
    draw(y, rnd, FW, PH) { const c = FW / 2;
      { y.fillStyle = 'rgba(20, 22, 22, 0.85)'; y.beginPath(); y.moveTo(0, PH); y.lineTo(0, PH * 0.3); for (let i = 0; i <= 10; i++) y.lineTo(FW * 0.16 * (i / 10) + rnd() * 8, PH * (0.3 + i * 0.06)); y.lineTo(FW * 0.2, PH); y.closePath(); y.fill(); // a rock wall at the left, far
        y.beginPath(); y.moveTo(FW, PH); y.lineTo(FW, PH * 0.4); for (let i = 0; i <= 10; i++) y.lineTo(FW - FW * 0.14 * (i / 10) - rnd() * 8, PH * (0.4 + i * 0.05)); y.lineTo(FW * 0.8, PH); y.closePath(); y.fill(); }
      const chimney = (bx, h, wd) => { const g = y.createLinearGradient(bx - wd, 0, bx + wd, 0); g.addColorStop(0, 'rgba(22,22,21,0.97)'); g.addColorStop(0.55, 'rgba(48,44,40,0.97)'); g.addColorStop(1, 'rgba(18,18,18,0.97)'); y.fillStyle = g;
        y.beginPath(); y.moveTo(bx - wd, PH * 0.92); for (let k = 0; k <= 10; k++) { const t = k / 10; y.lineTo(bx - wd * (1 - t * 0.6) + (rnd() - 0.5) * 5, PH * 0.92 - h * t); } for (let k = 10; k >= 0; k--) { const t = k / 10; y.lineTo(bx + wd * (1 - t * 0.6) + (rnd() - 0.5) * 5, PH * 0.92 - h * t); } y.closePath(); y.fill();
        for (let k = 0; k < 4; k++) { y.fillStyle = 'rgba(120, 70, 40, 0.25)'; y.fillRect(bx - wd * 0.5 + rnd() * wd, PH * 0.92 - h * rnd(), 2, 6 + rnd() * 10); } // mineral streaks
        const gl = y.createRadialGradient(bx, PH * 0.92 - h, 0, bx, PH * 0.92 - h, 34); gl.addColorStop(0, 'rgba(170, 90, 50, 0.3)'); gl.addColorStop(1, 'rgba(170, 90, 50, 0)'); y.fillStyle = gl; y.fillRect(bx - 34, PH * 0.92 - h - 34, 68, 68);
        y.save(); y.filter = 'blur(5px)'; let sx = bx; for (let k = 0; k < 12; k++) { sx += (rnd() - 0.35) * 8; y.fillStyle = `rgba(${40 + k * 2}, ${42 + k * 2}, ${42 + k * 2}, ${0.3 - k * 0.018})`; y.beginPath(); y.ellipse(sx, PH * 0.92 - h - 6 - k * 13, 5 + k * 3, 4 + k * 1.8, (rnd() - 0.5) * 0.6, 0, TAU); y.fill(); } y.restore(); };
      chimney(c - 110, 130, 18); chimney(c + 120, 170, 24); chimney(c + 66, 74, 12);
      seabed(y, rnd, FW, PH, PH * 0.9, '#232321', '#0a0b0b');
      for (let i = 0; i < 30; i++) { const mx = c - 60 + rnd() * 120, my = PH * (0.915 + rnd() * 0.03); y.fillStyle = `rgba(${60 + rnd() * 20}, ${50 + rnd() * 10}, 40, 0.8)`; y.beginPath(); y.ellipse(mx, my, 3, 1.6, rnd(), 0, TAU); y.fill(); } // a mussel bed
      for (let i = 0; i < 14; i++) { const bx = c - 40 + i * 5 + rnd() * 4, h = 14 + rnd() * 22; y.strokeStyle = 'rgba(210, 204, 186, 0.5)'; y.lineWidth = 2.2; y.beginPath(); y.moveTo(bx, PH * 0.92); y.quadraticCurveTo(bx + (rnd() - 0.5) * 6, PH * 0.92 - h * 0.5, bx + (rnd() - 0.5) * 5, PH * 0.92 - h); y.stroke(); // tube worms
        y.fillStyle = 'rgba(160, 60, 42, 0.8)'; y.beginPath(); y.ellipse(bx, PH * 0.92 - h - 2, 2.6, 3.6, 0, 0, TAU); y.fill(); }
      for (let i = 0; i < 3; i++) { const kx = c - 150 + i * 120 + rnd() * 30, ky = PH * 0.925; y.fillStyle = 'rgba(210, 204, 190, 0.55)'; y.beginPath(); y.ellipse(kx, ky, 4, 2.6, 0, 0, TAU); y.fill(); y.strokeStyle = 'rgba(210, 204, 190, 0.45)'; y.lineWidth = 0.8; for (let k = -2; k <= 2; k++) { y.beginPath(); y.moveTo(kx + k * 1.5, ky); y.lineTo(kx + k * 3.2, ky + 3); y.stroke(); } } } }, // pale vent crabs
  // ---------------- for pearls ----------------
  wreck: { name: 'The Wreck', price: 60, water: ['#213a40', '#0f2228', '#060e11'], light: 'rgba(90, 120, 110, 0.18)', line: "A freighter's bow, settled on its side long ago.",
    draw(y, rnd, FW, PH) { const c = FW / 2, base = PH * 0.9;
      { y.save(); y.translate(c - FW * 0.06, base); y.rotate(-0.12); const L = FW * 0.62, H = 120; // the hull, bow up to the right
        const g = y.createLinearGradient(0, -H, 0, 0); g.addColorStop(0, 'rgba(60, 50, 40, 0.95)'); g.addColorStop(1, 'rgba(26, 24, 22, 0.98)'); y.fillStyle = g;
        y.beginPath(); y.moveTo(-L * 0.5, 0); y.lineTo(-L * 0.5, -H * 0.8); y.lineTo(L * 0.35, -H * 0.95); y.quadraticCurveTo(L * 0.52, -H * 0.9, L * 0.5, -H * 0.2); y.lineTo(L * 0.38, 0); y.closePath(); y.fill();
        y.strokeStyle = 'rgba(0,0,0,0.4)'; y.lineWidth = 1; for (let k = 1; k < 9; k++) { const px = -L * 0.5 + k * L * 0.1; y.beginPath(); y.moveTo(px, -H * 0.85); y.lineTo(px, 0); y.stroke(); } // plates
        for (let k = 0; k < 6; k++) { const px = -L * 0.38 + k * L * 0.12, py = -H * 0.62; y.fillStyle = 'rgba(8, 12, 12, 0.95)'; y.beginPath(); y.arc(px, py, 5, 0, TAU); y.fill(); y.strokeStyle = 'rgba(140, 110, 70, 0.5)'; y.lineWidth = 1.4; y.stroke(); } // portholes
        for (let k = 0; k < 16; k++) { y.fillStyle = `rgba(${120 + rnd() * 40}, ${60 + rnd() * 20}, 36, ${0.2 + rnd() * 0.3})`; y.fillRect(-L * 0.5 + rnd() * L * 0.9, -H * 0.9 + rnd() * H * 0.8, 1.5 + rnd() * 2, 6 + rnd() * 18); } // rust runs
        y.fillStyle = 'rgba(200, 190, 170, 0.35)'; y.font = 'bold 15px "Barlow Semi Condensed", sans-serif'; y.fillText('ORMOND', L * 0.14, -H * 0.78); // a name, mostly gone
        y.strokeStyle = 'rgba(70, 60, 48, 0.9)'; y.lineWidth = 4; y.beginPath(); y.moveTo(-L * 0.1, -H * 0.9); y.lineTo(-L * 0.04, -H * 2.1); y.stroke(); // the mast, leaning
        y.lineWidth = 2; y.beginPath(); y.moveTo(-L * 0.18, -H * 1.75); y.lineTo(L * 0.06, -H * 1.85); y.stroke();
        y.strokeStyle = 'rgba(110, 100, 80, 0.4)'; y.lineWidth = 0.8; y.beginPath(); y.moveTo(-L * 0.06, -H * 2.0); y.quadraticCurveTo(L * 0.1, -H * 1.4, L * 0.3, -H * 0.95); y.stroke(); // a stay, still hanging
        y.restore(); }
      school(y, rnd, c + FW * 0.12, PH * 0.32, 26, 90, 'rgba(16, 28, 30, 0.6)', -1);
      seabed(y, rnd, FW, PH, PH * 0.91, '#2c3634', '#0c1312');
      for (let i = 0; i < 4; i++) stalk(y, c - FW * 0.3 + i * 12, PH * 0.92, 30 + rnd() * 30, 8 + rnd() * 10, 2.6, (t) => `rgba(100, 96, 64, ${0.7 - t * 0.3})`);
      { y.strokeStyle = 'rgba(60, 54, 44, 0.9)'; y.lineWidth = 2.4; y.beginPath(); y.moveTo(c + FW * 0.2, PH * 0.93); y.bezierCurveTo(c + FW * 0.25, PH * 0.9, c + FW * 0.32, PH * 0.95, c + FW * 0.38, PH * 0.925); y.stroke(); // the anchor chain
        y.fillStyle = 'rgba(56, 50, 42, 0.95)'; y.beginPath(); y.moveTo(c + FW * 0.38, PH * 0.9); y.lineTo(c + FW * 0.385, PH * 0.94); y.lineTo(c + FW * 0.36, PH * 0.93); y.closePath(); y.fill(); } } },
  whalefall: { name: 'Whale Fall', price: 90, water: ['#16282e', '#0a161a', '#04090b'], light: 'rgba(70, 90, 90, 0.14)', line: 'A whale come to rest. A whole world eats from it for decades.',
    draw(y, rnd, FW, PH) { const c = FW / 2, base = PH * 0.91;
      seabed(y, rnd, FW, PH, base, '#1e2a2a', '#090f10');
      for (let i = 0; i < 8; i++) { const px = c - FW * 0.35 + rnd() * FW * 0.7, g = y.createRadialGradient(px, base + 4, 0, px, base + 4, 30); g.addColorStop(0, 'rgba(200, 196, 170, 0.18)'); g.addColorStop(1, 'rgba(200, 196, 170, 0)'); y.fillStyle = g; y.fillRect(px - 30, base - 26, 60, 60); } // pale bacterial mats
      const bone = 'rgba(160, 152, 130, 0.72)', boneD = 'rgba(70, 66, 56, 0.8)';
      for (let i = 0; i < 9; i++) { const rx = c - 130 + i * 24, h = 70 + Math.sin(i / 8 * Math.PI) * 50 + rnd() * 10, bend = 14 + rnd() * 8; // the ribs, arching up
        y.strokeStyle = boneD; y.lineWidth = 6; y.lineCap = 'round'; y.beginPath(); y.moveTo(rx, base); y.quadraticCurveTo(rx + bend, base - h * 0.7, rx + bend * 2.2, base - h); y.stroke();
        y.strokeStyle = bone; y.lineWidth = 3.4; y.beginPath(); y.moveTo(rx - 1, base); y.quadraticCurveTo(rx + bend - 1, base - h * 0.7, rx + bend * 2.2 - 1, base - h); y.stroke(); }
      { y.fillStyle = boneD; y.beginPath(); y.ellipse(c - 20, base - 4, 140, 7, 0, 0, TAU); y.fill(); y.fillStyle = bone; for (let k = 0; k < 16; k++) { y.beginPath(); y.ellipse(c - 150 + k * 17, base - 6, 7, 5, 0, 0, TAU); y.fill(); } } // the spine
      { const sx = c + 100; y.fillStyle = bone; y.beginPath(); y.moveTo(sx - 40, base); y.quadraticCurveTo(sx - 30, base - 44, sx + 30, base - 30); y.quadraticCurveTo(sx + 60, base - 20, sx + 70, base); y.closePath(); y.fill(); // the skull
        y.fillStyle = 'rgba(10, 14, 14, 0.85)'; y.beginPath(); y.ellipse(sx - 8, base - 22, 8, 6, 0.2, 0, TAU); y.fill(); }
      for (let i = 0; i < 40; i++) { const px = c - FW * 0.35 + rnd() * FW * 0.75, py = base - rnd() * 8; y.strokeStyle = 'rgba(170, 70, 60, 0.6)'; y.lineWidth = 1; y.beginPath(); y.moveTo(px, py); y.lineTo(px + (rnd() - 0.5) * 2, py - 3 - rnd() * 3); y.stroke(); } // bone-eating worms, a red fuzz
      for (let i = 0; i < 4; i++) { const hx = c - FW * 0.3 + rnd() * FW * 0.6, hy = base - 20 - rnd() * 60; y.strokeStyle = 'rgba(120, 100, 96, 0.6)'; y.lineWidth = 3; y.beginPath(); y.moveTo(hx, hy); y.bezierCurveTo(hx + 10, hy - 6, hx + 20, hy + 6, hx + 30, hy); y.stroke(); } // hagfish
      school(y, rnd, c - FW * 0.2, PH * 0.4, 10, 50, 'rgba(14, 22, 24, 0.6)', 1); } },
  jellies: { name: 'Jelly Bloom', price: 120, water: ['#14232c', '#0a141a', '#04080b'], light: 'rgba(60, 80, 90, 0.12)', snow: 120, line: 'A bloom of jellies drifting past in the dark.',
    draw(y, rnd, FW, PH) { const c = FW / 2;
      for (let i = 0; i < 14; i++) jelly(y, rnd, rnd() * FW, PH * (0.08 + rnd() * 0.5), 6 + rnd() * 8, '150, 170, 170', 0.25); // far, small, faint
      for (let i = 0; i < 7; i++) jelly(y, rnd, rnd() * FW, PH * (0.12 + rnd() * 0.55), 14 + rnd() * 14, rnd() < 0.3 ? '200, 160, 140' : '170, 196, 190', 0.55);
      jelly(y, rnd, c - 82, PH * 0.3, 32, '200, 170, 140', 0.7); jelly(y, rnd, c + 84, PH * 0.16, 26, '170, 196, 190', 0.6); jelly(y, rnd, c + 70, PH * 0.62, 16, '170, 196, 190', 0.5); } },
  lanterns: { name: 'Lantern Choir', price: 160, water: ['#0b151a', '#05090c', '#010304'], light: 'rgba(30, 40, 46, 0.08)', snow: 80, line: "Anglerfish, waiting in the dark, each with its own light.",
    draw(y, rnd, FW, PH) { const c = FW / 2;
      const angler = (ax, ay, s, d) => { y.fillStyle = 'rgba(14, 16, 16, 0.92)'; y.beginPath(); y.ellipse(ax, ay, 16 * s, 13 * s, 0, 0, TAU); y.fill(); // body
        y.beginPath(); y.moveTo(ax - d * 14 * s, ay); y.lineTo(ax - d * 26 * s, ay - 7 * s); y.lineTo(ax - d * 26 * s, ay + 7 * s); y.closePath(); y.fill(); // tail
        y.fillStyle = 'rgba(200, 196, 180, 0.6)'; for (let k = 0; k < 5; k++) { y.beginPath(); y.moveTo(ax + d * 9 * s + d * k * 1.6 * s, ay + 3 * s); y.lineTo(ax + d * 9.8 * s + d * k * 1.6 * s, ay + 7 * s); y.lineTo(ax + d * 10.6 * s + d * k * 1.6 * s, ay + 3 * s); y.fill(); } // teeth
        y.strokeStyle = 'rgba(40, 44, 44, 0.9)'; y.lineWidth = 1.2; y.beginPath(); y.moveTo(ax + d * 4 * s, ay - 11 * s); y.quadraticCurveTo(ax + d * 14 * s, ay - 30 * s, ax + d * 22 * s, ay - 20 * s); y.stroke();
        glowDot(y, ax + d * 22 * s, ay - 20 * s, 2.2 * s, rnd() < 0.7 ? '190, 220, 200' : '220, 170, 120', 0.85); };
      for (let i = 0; i < 9; i++) { const s = 0.35 + rnd() * 0.3; angler(c + (rnd() - 0.5) * 240, PH * (0.1 + rnd() * 0.7), s, rnd() < 0.5 ? 1 : -1); } // far off
      angler(c - 80, PH * 0.6, 1.2, 1); angler(c + 82, PH * 0.42, 1.0, -1); angler(c + 60, PH * 0.82, 0.75, -1); angler(c - 60, PH * 0.2, 0.6, 1); } },
  watcher: { name: 'It Watches', price: 300, water: ['#120c0c', '#080506', '#030202'], light: 'rgba(60, 20, 16, 0.12)', snow: 100, snowCol: '190, 170, 160', line: 'Something in the deep has noticed you.',
    draw(y, rnd, FW, PH) { const ex = FW / 2 + 6, ey = PH * 0.36, R = 105; // the eye vast behind him: he stands against it
      const halo = y.createRadialGradient(ex, ey, 0, ex, ey, R * 3); halo.addColorStop(0, 'rgba(120, 30, 20, 0.35)'); halo.addColorStop(1, 'rgba(120, 30, 20, 0)'); y.fillStyle = halo; y.fillRect(0, 0, FW, PH); // the water red round it
      y.save(); y.beginPath(); y.moveTo(ex - R * 1.6, ey); y.quadraticCurveTo(ex, ey - R * 1.05, ex + R * 1.6, ey); y.quadraticCurveTo(ex, ey + R * 1.05, ex - R * 1.6, ey); y.clip(); // the lids
      const iris = y.createRadialGradient(ex, ey, R * 0.1, ex, ey, R); iris.addColorStop(0, 'rgba(230, 120, 60, 0.95)'); iris.addColorStop(0.55, 'rgba(170, 50, 30, 0.9)'); iris.addColorStop(1, 'rgba(50, 10, 8, 0.95)'); y.fillStyle = iris; y.fillRect(ex - R * 2, ey - R * 2, R * 4, R * 4);
      y.strokeStyle = 'rgba(40, 8, 6, 0.4)'; y.lineWidth = 1; for (let k = 0; k < 40; k++) { const a = rnd() * TAU; y.beginPath(); y.moveTo(ex + Math.cos(a) * R * 0.25, ey + Math.sin(a) * R * 0.25); y.lineTo(ex + Math.cos(a) * R * (0.7 + rnd() * 0.3), ey + Math.sin(a) * R * (0.7 + rnd() * 0.3)); y.stroke(); } // the iris's fibres
      y.fillStyle = 'rgba(4, 2, 2, 0.98)'; y.beginPath(); y.ellipse(ex, ey, R * 0.12, R * 0.78, 0, 0, TAU); y.fill(); // the slit
      y.fillStyle = 'rgba(255, 220, 190, 0.35)'; y.beginPath(); y.ellipse(ex - R * 0.4, ey - R * 0.35, R * 0.1, R * 0.06, -0.5, 0, TAU); y.fill(); y.restore();
      y.strokeStyle = 'rgba(20, 10, 8, 0.9)'; y.lineWidth = 6; y.beginPath(); y.moveTo(ex - R * 1.6, ey); y.quadraticCurveTo(ex, ey - R * 1.05, ex + R * 1.6, ey); y.stroke(); y.beginPath(); y.moveTo(ex - R * 1.6, ey); y.quadraticCurveTo(ex, ey + R * 1.05, ex + R * 1.6, ey); y.stroke();
      y.fillStyle = 'rgba(14, 8, 8, 0.85)'; for (let k = 0; k < 30; k++) { const a = rnd() * TAU, r = R * (1.7 + rnd() * 1.2); y.beginPath(); y.ellipse(ex + Math.cos(a) * r, ey + Math.sin(a) * r * 0.6, 4 + rnd() * 8, 3 + rnd() * 5, a, 0, TAU); y.fill(); } // scarred hide round it
      seabed(y, rnd, FW, PH, PH * 0.92, '#1a1312', '#070404'); } },
};
export const BAG_SCENE_IDS = Object.keys(BAG_SCENES);
