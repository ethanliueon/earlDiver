// (6.5.0) The journal's picture of an animal: not a white photograph taped in (pale animals vanished into it) but a
// small tank of its own water, painted once per habitat and kept: an old oak frame, the water of the depth it lives at
// (sunlit, reef, kelp, blue, twilight, the deep), a floor of sand or silt with what grows there, a little suspended
// matter, light from above where there is light, and the glass catching it at one corner.
const CACHE = new Map();
const WATER = {
  'hb-sun': ['#5a9aa2', '#2c6672', '#1c4a56'], 'hb-reef': ['#58a0a0', '#2a6e72', '#1e5258'], 'hb-kelp': ['#6a8e6a', '#3a5c44', '#263f30'],
  'hb-blue': ['#3c6a8c', '#1e4262', '#142f48'], 'hb-twi': ['#24405e', '#142a42', '#0c1a2c'], 'hb-deep': ['#121c28', '#0a1018', '#05080c'],
};
const FLOOR = { 'hb-sun': ['#b8a47a', '#8a7650'], 'hb-reef': ['#c4b088', '#94805a'], 'hb-kelp': ['#7a6a4a', '#544632'], 'hb-blue': ['#6e6450', '#4a4234'], 'hb-twi': ['#3a3830', '#26241e'], 'hb-deep': ['#1e1c1a', '#121110'] };
// (6.9.1) z: how near the scene is, from the animal's size. The animal is always drawn the same size in the frame, so
// a small one is seen close beside tall plants and big pebbles (z > 1), a large one from farther off, the same place
// small and wide behind it: short plants, more of them, stones far off (z < 1)
export const tankZoom = (len) => (len < 0.15 ? 2.2 : len < 0.5 ? 1.5 : len < 1.5 ? 1 : len < 4 ? 0.6 : 0.4);
export function tankPicture(hab, W = 480, H = 260, z = 1) {
  const key = hab + W + 'x' + H + 'z' + z; if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let sd = 7 + [...hab].reduce((a, ch) => a + ch.charCodeAt(0), 0); const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const F = Math.round(H * 0.07), ix = F, iy = F, iw = W - F * 2, ih = H - F * 2, [w0, w1, w2] = WATER[hab] || WATER['hb-blue'], light = ['hb-sun', 'hb-reef', 'hb-kelp', 'hb-blue'].includes(hab), deep = hab === 'hb-deep' || hab === 'hb-twi';
  // the water: lighter at the top, a little brushed (uneven bands), never a flat fill
  const g = x.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, w0); g.addColorStop(0.55, w1); g.addColorStop(1, w2); x.fillStyle = g; x.fillRect(ix, iy, iw, ih);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${(0.015 + r() * 0.025).toFixed(3)})`; x.fillRect(ix, iy + r() * ih, iw, 1 + r() * 4); }
  // light from above, in soft slanted shafts (none where it is dark)
  if (light) { x.save(); x.beginPath(); x.rect(ix, iy, iw, ih); x.clip(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const sx = ix + iw * (0.1 + r() * 0.8), sw = iw * (0.04 + r() * 0.07), lg = x.createLinearGradient(0, iy, 0, iy + ih * 0.85); lg.addColorStop(0, `rgba(220,236,224,${(0.07 + r() * 0.06).toFixed(3)})`); lg.addColorStop(1, 'rgba(220,236,224,0)');
      x.fillStyle = lg; x.beginPath(); x.moveTo(sx, iy); x.lineTo(sx + sw, iy); x.lineTo(sx + sw * 2.2 + ih * 0.25, iy + ih); x.lineTo(sx + ih * 0.25, iy + ih); x.closePath(); x.fill(); }
    x.restore(); }
  // the floor: an uneven line of sand (or silt), grains, a few pebbles
  const [f0, f1] = FLOOR[hab] || FLOOR['hb-blue'], fy = iy + ih * 0.8, pts = [];
  for (let i = 0; i <= 12; i++) pts.push([ix + iw * i / 12, fy + Math.sin(i * 1.3 + r() * 2) * ih * 0.03 + r() * ih * 0.03]);
  x.beginPath(); x.moveTo(ix, iy + ih); pts.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(ix + iw, iy + ih); x.closePath();
  const fg = x.createLinearGradient(0, fy, 0, iy + ih); fg.addColorStop(0, f0); fg.addColorStop(1, f1); x.fillStyle = fg; x.fill();
  x.save(); x.clip(); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,248,230' : '30,24,14'},${(0.08 + r() * 0.12).toFixed(3)})`; x.fillRect(ix + r() * iw, fy + r() * ih * 0.22, 1.2, 1.2); }
  for (let i = 0; i < (z < 1 ? 14 : 7); i++) { const px = ix + r() * iw, py = fy + ih * (0.06 + r() * 0.12), pr = (2 + r() * 5) * z; const pg = x.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0.5, px, py, pr); pg.addColorStop(0, deep ? '#4a4640' : '#a89a80'); pg.addColorStop(1, deep ? '#1a1816' : '#5a4e3a'); x.fillStyle = pg; x.beginPath(); x.ellipse(px, py, pr * 1.3, pr, 0, 0, Math.PI * 2); x.fill(); }
  x.restore();
  // what grows there: kelp, a clump of coral, a tuft of weed in the sunlit, a stone in the deep
  const plant = (px, hgt, col) => { hgt = Math.min(ih * 0.95, hgt * z); const lz = Math.max(0.45, Math.min(2, z)); x.strokeStyle = col; x.lineWidth = 2.2 * lz; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, fy + 4); for (let k = 1; k <= 8; k++) x.lineTo(px + Math.sin(k * 0.9 + px) * 5 * lz, fy + 4 - hgt * k / 8); x.stroke();
    for (let k = 2; k <= 8; k += 2) { const ly = fy + 4 - hgt * k / 8, lx = px + Math.sin(k * 0.9 + px) * 5 * lz; x.fillStyle = col; x.beginPath(); x.ellipse(lx + 6 * lz, ly, 7 * lz, 2.6 * lz, -0.5, 0, Math.PI * 2); x.fill(); } };
  const far = z < 1 ? Math.round(2 / z) : 0; // farther off: more of the same plants across the floor, small
  if (hab === 'hb-kelp') { plant(ix + iw * 0.12, ih * 0.7, 'rgba(110,104,52,0.85)'); plant(ix + iw * 0.86, ih * 0.6, 'rgba(96,92,46,0.8)'); plant(ix + iw * 0.93, ih * 0.45, 'rgba(120,112,56,0.7)'); for (let k = 0; k < far * 2; k++) plant(ix + iw * (0.25 + r() * 0.5), ih * (0.4 + r() * 0.4), 'rgba(96,92,46,0.55)'); }
  else if (hab === 'hb-reef') { const nC = 2 + far * 2; for (let k = 0; k < nC; k++) { const cx = ix + iw * (k === 0 ? 0.1 : k === 1 ? 0.88 : 0.2 + r() * 0.6), cy = fy + 2; for (let j = 0; j < 9; j++) { const a = -Math.PI / 2 + (r() - 0.5) * 1.6, L = Math.min(ih * 0.6, ih * (0.1 + r() * 0.14) * z); x.strokeStyle = k % 2 ? 'rgba(170,96,78,0.85)' : 'rgba(196,150,110,0.85)'; x.lineWidth = 3 * Math.max(0.5, Math.min(2.2, z)); x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + Math.cos(a) * L * 0.5 + 4, cy + Math.sin(a) * L * 0.5, cx + Math.cos(a) * L, cy + Math.sin(a) * L); x.stroke(); } } }
  else if (hab === 'hb-sun' || hab === 'hb-blue') { plant(ix + iw * 0.08, ih * 0.28, 'rgba(90,110,64,0.7)'); plant(ix + iw * 0.92, ih * 0.22, 'rgba(84,104,60,0.6)'); for (let k = 0; k < far; k++) plant(ix + iw * (0.25 + r() * 0.5), ih * 0.22, 'rgba(84,104,60,0.45)'); }
  else { const stone = (sx, sy, k2) => { const sg = x.createRadialGradient(sx - 10 * k2, sy - 14 * k2, 2, sx, sy, 32 * k2); sg.addColorStop(0, deep ? '#3a3a36' : '#5a5650'); sg.addColorStop(1, '#0e0e0c'); x.fillStyle = sg; x.beginPath(); x.ellipse(sx, sy, 34 * k2, 18 * k2, 0, Math.PI, 0); x.fill(); };
    const k1 = Math.max(0.35, Math.min(2.4, z)); stone(ix + iw * 0.85, fy + 6, k1); for (let k = 0; k < far + (z < 1 ? 1 : 0); k++) stone(ix + iw * (0.1 + r() * 0.6), fy + 4, k1 * (0.5 + r() * 0.5)); }
  // suspended matter: fine motes, more of them deeper
  for (let i = 0; i < (deep ? 70 : 30); i++) { x.fillStyle = `rgba(226,232,224,${(0.12 + r() * 0.22).toFixed(3)})`; x.beginPath(); x.arc(ix + r() * iw, iy + r() * ih * 0.78, 0.5 + r() * 1.1, 0, Math.PI * 2); x.fill(); }
  // the waterline just under the top rail, and the glass catching light at its upper left
  x.fillStyle = 'rgba(230,240,236,0.16)'; x.fillRect(ix, iy + ih * 0.04, iw, 1.5);
  x.save(); x.beginPath(); x.rect(ix, iy, iw, ih); x.clip(); const hg = x.createLinearGradient(ix, iy, ix + iw * 0.35, iy + ih * 0.5); hg.addColorStop(0, 'rgba(255,255,255,0.12)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hg; x.beginPath(); x.moveTo(ix, iy); x.lineTo(ix + iw * 0.3, iy); x.lineTo(ix, iy + ih * 0.55); x.closePath(); x.fill(); x.restore();
  // the frame: old oak, its grain along each rail, darker toward the glass, its mitred corners
  const rail = (x0, y0, w, h, horiz) => { const rg = horiz ? x.createLinearGradient(0, y0, 0, y0 + h) : x.createLinearGradient(x0, 0, x0 + w, 0); rg.addColorStop(0, '#6a4e30'); rg.addColorStop(0.5, '#523a22'); rg.addColorStop(1, '#3a2816'); x.fillStyle = rg; x.fillRect(x0, y0, w, h);
    for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(${r() < 0.5 ? '30,18,8' : '140,104,64'},${(0.15 + r() * 0.25).toFixed(3)})`; x.lineWidth = 0.8; x.beginPath(); if (horiz) { const yy = y0 + r() * h; x.moveTo(x0, yy); x.bezierCurveTo(x0 + w * 0.3, yy + (r() - 0.5) * 3, x0 + w * 0.7, yy + (r() - 0.5) * 3, x0 + w, yy); } else { const xx = x0 + r() * w; x.moveTo(xx, y0); x.bezierCurveTo(xx + (r() - 0.5) * 3, y0 + h * 0.3, xx + (r() - 0.5) * 3, y0 + h * 0.7, xx, y0 + h); } x.stroke(); } };
  rail(0, 0, W, F, true); rail(0, H - F, W, F, true); rail(0, F, F, H - F * 2, false); rail(W - F, F, F, H - F * 2, false);
  x.strokeStyle = 'rgba(12,8,4,0.85)'; x.lineWidth = 2; x.strokeRect(ix - 1, iy - 1, iw + 2, ih + 2); x.strokeStyle = 'rgba(20,12,6,0.9)'; x.lineWidth = 1.5; x.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);
  x.strokeStyle = 'rgba(160,124,80,0.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(2, 2); x.lineTo(W - 2, 2); x.stroke(); // the top edge catching light
  x.strokeStyle = 'rgba(20,12,6,0.6)'; x.lineWidth = 1; for (const [a, b] of [[0, 0], [W, 0], [0, H], [W, H]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(a + (a ? -F : F), b + (b ? -F : F)); x.stroke(); }
  const url = c.toDataURL('image/jpeg', 0.9); CACHE.set(key, url); return url;
}
