// (6.5.0) The journal's picture of an animal: not a white photograph taped in (pale animals vanished into it) but a
// small tank of its own water, painted once per habitat and kept: an old oak frame, the water of the depth it lives at
// (sunlit, reef, kelp, blue, twilight, the deep), a floor of sand or silt with what grows there, a little suspended
// matter, light from above where there is light.
// (6.9.2) redrawn: the water mottled in soft clouds (no horizontal bands), no glare in the glass's corner; rocks are
// faceted stones lit from above with cracks and a little growth, never circles; plants are real shapes (kelp blades
// with floats, sea grass, sea fans, branching and brain coral); the deep has its own life (bamboo coral, glass
// sponges, sea pens, a pale fan), lit only by a faint glow as if from a lamp. z sizes the scene to the animal.
const CACHE = new Map();
const WATER = {
  'hb-sun': ['#5a9aa2', '#2c6672', '#1c4a56'], 'hb-reef': ['#58a0a0', '#2a6e72', '#1e5258'], 'hb-kelp': ['#6a8e6a', '#3a5c44', '#263f30'],
  'hb-blue': ['#3c6a8c', '#1e4262', '#142f48'], 'hb-twi': ['#24405e', '#142a42', '#0c1a2c'], 'hb-deep': ['#121c28', '#0a1018', '#05080c'],
};
const FLOOR = { 'hb-sun': ['#b8a47a', '#8a7650'], 'hb-reef': ['#c4b088', '#94805a'], 'hb-kelp': ['#7a6a4a', '#544632'], 'hb-blue': ['#6e6450', '#4a4234'], 'hb-twi': ['#3a3830', '#26241e'], 'hb-deep': ['#1e1c1a', '#121110'] };
// (6.9.1) z: how near the scene is, from the animal's size. The animal is always drawn the same size in the frame, so
// a small one is seen close beside tall plants and big stones (z > 1), a large one from farther off, the same place
// small and wide behind it: short plants, more of them, stones far off (z < 1)
export const tankZoom = (len) => (len < 0.15 ? 2.2 : len < 0.5 ? 1.5 : len < 1.5 ? 1 : len < 4 ? 0.6 : 0.4);
const rgba = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
export function tankPicture(hab, W = 480, H = 260, z = 1) {
  const key = hab + W + 'x' + H + 'z' + z; if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let sd = 7 + [...hab].reduce((a, ch) => a + ch.charCodeAt(0), 0) + Math.round(z * 10); const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const F = Math.round(H * 0.07), ix = F, iy = F, iw = W - F * 2, ih = H - F * 2, [w0, w1, w2] = WATER[hab] || WATER['hb-blue'], light = ['hb-sun', 'hb-reef', 'hb-kelp', 'hb-blue'].includes(hab), deep = hab === 'hb-deep' || hab === 'hb-twi';
  const Z = Math.max(0.4, Math.min(2.4, z)); // sizes of things on the floor
  x.save(); x.beginPath(); x.rect(ix, iy, iw, ih); x.clip();
  // the water: lighter at the top, mottled in soft clouds of lighter and darker water
  const g = x.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, w0); g.addColorStop(0.55, w1); g.addColorStop(1, w2); x.fillStyle = g; x.fillRect(ix, iy, iw, ih);
  for (let i = 0; i < 26; i++) { const cx = ix + r() * iw, cy = iy + r() * ih * 0.85, rr = ih * (0.15 + r() * 0.35), lite = r() < 0.5, cg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    cg.addColorStop(0, lite ? 'rgba(230,240,230,0.05)' : 'rgba(0,10,14,0.07)'); cg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = cg; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
  // light from above in soft slanted shafts; in the deep, only a faint glow, as from a lamp held off to one side
  if (light) { x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const sx = ix + iw * (0.1 + r() * 0.8), sw = iw * (0.04 + r() * 0.07), lg = x.createLinearGradient(0, iy, 0, iy + ih * 0.85); lg.addColorStop(0, `rgba(220,236,224,${(0.06 + r() * 0.05).toFixed(3)})`); lg.addColorStop(1, 'rgba(220,236,224,0)');
      x.fillStyle = lg; x.beginPath(); x.moveTo(sx, iy); x.lineTo(sx + sw, iy); x.lineTo(sx + sw * 2.2 + ih * 0.25, iy + ih); x.lineTo(sx + ih * 0.25, iy + ih); x.closePath(); x.fill(); }
    x.restore(); }
  else { const gx = ix + iw * 0.38, gy = iy + ih * 0.55, gr = x.createRadialGradient(gx, gy, 0, gx, gy, iw * 0.55); gr.addColorStop(0, deep ? 'rgba(120,140,150,0.16)' : 'rgba(140,160,170,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(ix, iy, iw, ih); }
  // the floor: an uneven line of sand (or silt), grains
  const [f0, f1] = FLOOR[hab] || FLOOR['hb-blue'], fy = iy + ih * 0.8, pts = [];
  for (let i = 0; i <= 16; i++) pts.push([ix + iw * i / 16, fy + Math.sin(i * 1.3 + r() * 2) * ih * 0.025 + r() * ih * 0.025]);
  const floorAt = (px) => { const t = Math.max(0, Math.min(16, (px - ix) / iw * 16)), i = Math.min(15, Math.floor(t)); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (t - i); };
  x.beginPath(); x.moveTo(ix, iy + ih); pts.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(ix + iw, iy + ih); x.closePath();
  const fg = x.createLinearGradient(0, fy, 0, iy + ih); fg.addColorStop(0, f0); fg.addColorStop(1, f1); x.fillStyle = fg; x.fill();
  x.save(); x.clip(); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,248,230' : '30,24,14'},${(0.06 + r() * 0.1).toFixed(3)})`; x.fillRect(ix + r() * iw, fy + r() * ih * 0.22, 1.2, 1.2); } x.restore();

  // ---- things on the floor, each a real shape ----
  // a stone: an irregular faceted outline, its top face lit, its flanks and foot in shadow, a crack, perhaps some growth
  const stone = (sx, s, tone) => { const n = 9, R = s, P = []; const by = floorAt(sx) + R * 0.15;
    for (let k = 0; k < n; k++) { const a = Math.PI + (k / (n - 1)) * Math.PI, rr = R * (0.75 + r() * 0.35); P.push([sx + Math.cos(a) * rr * 1.35, by + Math.sin(a) * rr * (0.75 + r() * 0.2)]); }
    x.beginPath(); P.forEach(([a, b], k) => (k ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
    const sg = x.createLinearGradient(sx - R, by - R, sx + R * 0.8, by); sg.addColorStop(0, tone[0]); sg.addColorStop(0.55, tone[1]); sg.addColorStop(1, tone[2]); x.fillStyle = sg; x.fill();
    x.strokeStyle = 'rgba(10,8,6,0.55)'; x.lineWidth = Math.max(0.8, R * 0.05); x.stroke();
    x.save(); x.clip(); // a facet edge, a crack, the shadow under it
    x.strokeStyle = 'rgba(255,245,225,0.18)'; x.lineWidth = Math.max(0.8, R * 0.06); x.beginPath(); x.moveTo(P[1][0], P[1][1] + R * 0.1); x.lineTo(sx - R * 0.1, by - R * 0.55); x.lineTo(P[n - 2][0], P[n - 2][1] + R * 0.15); x.stroke();
    x.strokeStyle = 'rgba(10,8,6,0.45)'; x.lineWidth = Math.max(0.6, R * 0.035); x.beginPath(); x.moveTo(sx + R * 0.1, by - R * 0.6); x.lineTo(sx + R * 0.25, by - R * 0.3); x.lineTo(sx + R * 0.15, by - R * 0.05); x.stroke();
    const sh = x.createLinearGradient(0, by - R * 0.3, 0, by); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)'); x.fillStyle = sh; x.fillRect(sx - R * 1.5, by - R * 0.3, R * 3, R * 0.4);
    if (!deep && r() < 0.6) { x.fillStyle = 'rgba(96,110,60,0.45)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(sx - R * 0.6 + r() * R * 1.2, by - R * (0.55 + r() * 0.25), R * 0.14, R * 0.07, 0, 0, Math.PI * 2); x.fill(); } }
    x.restore(); };
  const TONE = deep ? ['#4a4842', '#2c2a26', '#121110'] : hab === 'hb-kelp' ? ['#8a8470', '#5c5646', '#2e2a20'] : ['#b0a68c', '#7c725c', '#3c3628'];
  // kelp: a stipe rising in a slow S, long blades off it each with a float at its base, lit along one edge
  const kelp = (px, hgt, col) => { hgt = Math.min(ih * 0.98, hgt * z); const lz = Math.max(0.45, Math.min(2, z)), base = floorAt(px) + 3, sx = (k) => px + Math.sin(k * 0.8 + px) * 6 * lz;
    x.strokeStyle = col; x.lineWidth = 2 * lz; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, base); for (let k = 1; k <= 10; k++) x.lineTo(sx(k), base - hgt * k / 10); x.stroke();
    for (let k = 2; k <= 10; k += 1.5) { const ly = base - hgt * k / 10, lx = sx(k), d = k % 3 < 1.5 ? 1 : -1, L = 14 * lz;
      x.fillStyle = col; x.beginPath(); x.moveTo(lx, ly); x.quadraticCurveTo(lx + d * L * 0.6, ly - L * 0.5, lx + d * L * 1.4, ly - L * 0.2); x.quadraticCurveTo(lx + d * L * 0.7, ly + L * 0.12, lx, ly); x.fill();
      x.strokeStyle = 'rgba(230,220,160,0.25)'; x.lineWidth = 0.8 * lz; x.beginPath(); x.moveTo(lx, ly); x.quadraticCurveTo(lx + d * L * 0.6, ly - L * 0.5, lx + d * L * 1.4, ly - L * 0.2); x.stroke();
      x.fillStyle = 'rgba(150,130,60,0.9)'; x.beginPath(); x.ellipse(lx + d * 2 * lz, ly - 1, 2.2 * lz, 1.6 * lz, 0, 0, Math.PI * 2); x.fill(); } };
  // sea grass: a tuft of thin curved blades
  const grass = (px, hgt, col) => { hgt = Math.min(ih * 0.6, hgt * z); const base = floorAt(px) + 2, lz = Math.max(0.5, Math.min(2, z)); x.strokeStyle = col; x.lineCap = 'round';
    for (let k = 0; k < 7; k++) { const lean = (r() - 0.5) * 0.9, h2 = hgt * (0.5 + r() * 0.5); x.lineWidth = (1 + r()) * lz; x.beginPath(); x.moveTo(px + (k - 3) * 1.5 * lz, base); x.quadraticCurveTo(px + lean * h2 * 0.3, base - h2 * 0.6, px + lean * h2 * 0.7, base - h2); x.stroke(); } };
  // branching coral: a trunk that forks, each branch tapering, little knobs at the tips
  const branch = (px, hgt, col, hi) => { hgt = Math.min(ih * 0.7, hgt * z); const base = floorAt(px) + 2, lz = Math.max(0.5, Math.min(2.2, z));
    const arm = (x0, y0, a, L, w, d) => { const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      x.strokeStyle = hi; x.lineWidth = w * 0.35; x.beginPath(); x.moveTo(x0 - w * 0.2, y0); x.lineTo(x1 - w * 0.2, y1); x.stroke();
      if (d > 0) { arm(x1, y1, a - 0.35 - r() * 0.3, L * 0.72, w * 0.7, d - 1); arm(x1, y1, a + 0.35 + r() * 0.3, L * 0.72, w * 0.7, d - 1); } else { x.fillStyle = hi; x.beginPath(); x.arc(x1, y1, w * 0.6, 0, Math.PI * 2); x.fill(); } };
    arm(px, base, -Math.PI / 2 + (r() - 0.5) * 0.3, hgt * 0.36, 4.2 * lz, 3); };
  // a sea fan: a flat lattice of fine branches spread from one stem
  const fan = (px, hgt, col) => { hgt = Math.min(ih * 0.7, hgt * z); const base = floorAt(px) + 2; x.strokeStyle = col; x.lineCap = 'round';
    for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (k / 15 - 0.5) * 1.5, L = hgt * (0.7 + r() * 0.3); x.lineWidth = Math.max(0.6, 1.4 * Math.min(2, z) * (1 - k % 3 * 0.2)); x.beginPath(); x.moveTo(px, base); x.quadraticCurveTo(px + Math.cos(a) * L * 0.4, base + Math.sin(a) * L * 0.6, px + Math.cos(a) * L, base + Math.sin(a) * L); x.stroke(); }
    x.globalAlpha = 0.35; for (let k = 1; k < 5; k++) { x.beginPath(); x.ellipse(px, base, hgt * 0.6 * k / 4, hgt * k / 4, 0, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); } x.globalAlpha = 1; };
  // brain coral: a dome, lit on top, with its winding grooves
  const brain = (px, s, col) => { s *= Z; const by = floorAt(px) + s * 0.2, bg = x.createRadialGradient(px - s * 0.3, by - s * 0.6, s * 0.1, px, by - s * 0.2, s * 1.2); bg.addColorStop(0, col[0]); bg.addColorStop(1, col[1]);
    x.fillStyle = bg; x.beginPath(); x.ellipse(px, by, s * 1.2, s, 0, Math.PI, 0); x.closePath(); x.fill(); x.save(); x.clip(); x.strokeStyle = 'rgba(40,28,18,0.4)'; x.lineWidth = Math.max(0.6, s * 0.06);
    for (let k = 0; k < 7; k++) { x.beginPath(); let yy = by - s * (0.15 + k * 0.13); x.moveTo(px - s * 1.2, yy); for (let j = 0; j <= 12; j++) x.lineTo(px - s * 1.2 + j * s * 0.2, yy + Math.sin(j * 1.7 + k) * s * 0.06); x.stroke(); } x.restore(); };
  // ---- the deep's own life ----
  // bamboo coral: a white stalk jointed by dark nodes, a few thin branches
  const bamboo = (px, hgt) => { hgt = Math.min(ih * 0.75, hgt * z); const base = floorAt(px) + 2, lz = Math.max(0.5, Math.min(2, z));
    const seg = (x0, y0, a, L, w, d) => { const n = 5; let cx = x0, cy = y0; for (let k = 0; k < n; k++) { const nx = cx + Math.cos(a) * L / n, ny = cy + Math.sin(a) * L / n; x.strokeStyle = 'rgba(214,210,196,0.85)'; x.lineWidth = w; x.beginPath(); x.moveTo(cx, cy); x.lineTo(nx, ny); x.stroke(); x.fillStyle = 'rgba(40,32,26,0.9)'; x.beginPath(); x.arc(nx, ny, w * 0.55, 0, Math.PI * 2); x.fill(); cx = nx; cy = ny; a += (r() - 0.5) * 0.12; if (d > 0 && k === 2) seg(cx, cy, a + (r() < 0.5 ? -0.6 : 0.6), L * 0.55, w * 0.7, d - 1); } };
    seg(px, base, -Math.PI / 2 + (r() - 0.5) * 0.2, hgt, 2.2 * lz, 2); };
  // a glass sponge: a pale vase, its lattice faintly seen
  const sponge = (px, s) => { s *= Z; const base = floorAt(px) + 2; x.fillStyle = 'rgba(206,200,180,0.55)'; x.beginPath(); x.moveTo(px - s * 0.25, base); x.quadraticCurveTo(px - s * 0.6, base - s * 1.2, px - s * 0.4, base - s * 2); x.lineTo(px + s * 0.4, base - s * 2); x.quadraticCurveTo(px + s * 0.6, base - s * 1.2, px + s * 0.25, base); x.closePath(); x.fill();
    x.save(); x.clip(); x.strokeStyle = 'rgba(80,76,66,0.35)'; x.lineWidth = Math.max(0.5, s * 0.04); for (let k = -6; k <= 6; k++) { x.beginPath(); x.moveTo(px + k * s * 0.12, base); x.lineTo(px + k * s * 0.12 + s * 0.6, base - s * 2); x.stroke(); x.beginPath(); x.moveTo(px + k * s * 0.12, base); x.lineTo(px + k * s * 0.12 - s * 0.6, base - s * 2); x.stroke(); } x.restore();
    x.strokeStyle = 'rgba(230,226,210,0.6)'; x.lineWidth = Math.max(0.6, s * 0.06); x.beginPath(); x.ellipse(px, base - s * 2, s * 0.4, s * 0.1, 0, 0, Math.PI * 2); x.stroke(); };
  // a sea pen: a feather on a stalk, pale rust
  const pen = (px, hgt) => { hgt = Math.min(ih * 0.55, hgt * z); const base = floorAt(px) + 2, lz = Math.max(0.5, Math.min(2, z)); x.strokeStyle = 'rgba(176,120,90,0.85)'; x.lineWidth = 1.6 * lz; x.beginPath(); x.moveTo(px, base); x.lineTo(px + 2, base - hgt); x.stroke();
    for (let k = 3; k < 12; k++) { const yy = base - hgt * k / 12, L = 5 * lz * Math.sin(k / 12 * Math.PI); x.lineWidth = 1 * lz; x.beginPath(); x.moveTo(px + 2 * k / 12, yy); x.lineTo(px - L, yy - L * 0.5); x.moveTo(px + 2 * k / 12, yy); x.lineTo(px + L + 2, yy - L * 0.5); x.stroke(); } };

  const N = (n) => Math.max(1, Math.round(n * (z < 1 ? 1 / z : 1))); // farther off: more of everything, smaller
  const spread = (n, f) => { for (let k = 0; k < n; k++) f(ix + iw * (0.04 + r() * 0.92), k); };
  if (hab === 'hb-kelp') {
    spread(N(2), (px) => stone(px, ih * (0.05 + r() * 0.05) * Z, TONE));
    kelp(ix + iw * 0.1, ih * 0.75, 'rgba(110,100,48,0.9)'); kelp(ix + iw * 0.88, ih * 0.65, 'rgba(96,90,44,0.85)');
    if (z < 1) spread(N(2), (px) => kelp(px, ih * (0.5 + r() * 0.3), 'rgba(90,86,44,0.6)'));
    spread(N(2), (px) => grass(px, ih * 0.12, 'rgba(110,116,60,0.7)'));
  } else if (hab === 'hb-reef') {
    spread(N(1), (px) => stone(px, ih * (0.05 + r() * 0.04) * Z, TONE));
    branch(ix + iw * 0.1, ih * 0.45, 'rgba(196,150,110,0.95)', 'rgba(236,206,170,0.7)'); fan(ix + iw * 0.88, ih * 0.5, 'rgba(150,80,66,0.85)');
    brain(ix + iw * 0.72, ih * 0.07, ['#c4a07a', '#6a4a30']);
    if (z < 1) spread(N(2), (px, k) => (k % 3 === 0 ? brain(px, ih * 0.05, ['#b4927a', '#5a4030']) : k % 3 === 1 ? branch(px, ih * 0.3, 'rgba(170,110,90,0.85)', 'rgba(220,180,150,0.6)') : fan(px, ih * 0.35, 'rgba(140,76,60,0.7)')));
    spread(N(1), (px) => grass(px, ih * 0.1, 'rgba(100,120,70,0.6)'));
  } else if (hab === 'hb-sun' || hab === 'hb-blue') {
    spread(N(2), (px) => stone(px, ih * (0.04 + r() * 0.05) * Z, TONE));
    grass(ix + iw * 0.08, ih * 0.3, 'rgba(96,114,66,0.8)'); grass(ix + iw * 0.92, ih * 0.24, 'rgba(90,108,62,0.75)');
    spread(N(1), (px) => grass(px, ih * 0.16, 'rgba(90,108,62,0.55)'));
  } else { // the twilight and the deep: silt, dark stones, and the deep's own slow life
    spread(N(2), (px) => stone(px, ih * (0.05 + r() * 0.06) * Z, TONE));
    bamboo(ix + iw * 0.12, ih * 0.6); sponge(ix + iw * 0.86, ih * 0.11); pen(ix + iw * 0.72, ih * 0.3);
    if (hab === 'hb-twi') fan(ix + iw * 0.3, ih * 0.35, 'rgba(170,110,84,0.6)');
    if (z < 1) spread(N(2), (px, k) => (k % 3 === 0 ? bamboo(px, ih * 0.4) : k % 3 === 1 ? sponge(px, ih * 0.07) : pen(px, ih * 0.22)));
  }
  // suspended matter: fine motes, more of them deeper
  for (let i = 0; i < (deep ? 80 : 30); i++) { x.fillStyle = `rgba(226,232,224,${(0.1 + r() * 0.2).toFixed(3)})`; x.beginPath(); x.arc(ix + r() * iw, iy + r() * ih * 0.78, 0.5 + r() * 1.1, 0, Math.PI * 2); x.fill(); }
  // the waterline just under the top rail
  x.fillStyle = 'rgba(230,240,236,0.14)'; x.fillRect(ix, iy + ih * 0.04, iw, 1.5);
  x.restore();
  // the frame: old oak, its grain along each rail, darker toward the glass, its mitred corners
  const rail = (x0, y0, w, h, horiz) => { const rg = horiz ? x.createLinearGradient(0, y0, 0, y0 + h) : x.createLinearGradient(x0, 0, x0 + w, 0); rg.addColorStop(0, '#6a4e30'); rg.addColorStop(0.5, '#523a22'); rg.addColorStop(1, '#3a2816'); x.fillStyle = rg; x.fillRect(x0, y0, w, h);
    for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(${r() < 0.5 ? '30,18,8' : '140,104,64'},${(0.15 + r() * 0.25).toFixed(3)})`; x.lineWidth = 0.8; x.beginPath(); if (horiz) { const yy = y0 + r() * h; x.moveTo(x0, yy); x.bezierCurveTo(x0 + w * 0.3, yy + (r() - 0.5) * 3, x0 + w * 0.7, yy + (r() - 0.5) * 3, x0 + w, yy); } else { const xx = x0 + r() * w; x.moveTo(xx, y0); x.bezierCurveTo(xx + (r() - 0.5) * 3, y0 + h * 0.3, xx + (r() - 0.5) * 3, y0 + h * 0.7, xx, y0 + h); } x.stroke(); } };
  rail(0, 0, W, F, true); rail(0, H - F, W, F, true); rail(0, F, F, H - F * 2, false); rail(W - F, F, F, H - F * 2, false);
  x.strokeStyle = 'rgba(12,8,4,0.85)'; x.lineWidth = 2; x.strokeRect(ix - 1, iy - 1, iw + 2, ih + 2); x.strokeStyle = 'rgba(20,12,6,0.9)'; x.lineWidth = 1.5; x.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);
  x.strokeStyle = 'rgba(160,124,80,0.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(2, 2); x.lineTo(W - 2, 2); x.stroke(); // the top edge catching light
  x.strokeStyle = 'rgba(20,12,6,0.6)'; x.lineWidth = 1; for (const [a, b] of [[0, 0], [W, 0], [0, H], [W, H]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(a + (a ? -F : F), b + (b ? -F : F)); x.stroke(); }
  const url = c.toDataURL('image/jpeg', 0.9); CACHE.set(key, url); return url;
}
