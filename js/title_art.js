// (7.0.0) The game's name as artwork, not type: HATCHETFISH built letter by letter from hand-cut strokes (tall, narrow,
// a little uneven, each end flared like a chisel cut), painted in worn bone, and seen under the surface: the water
// tints it toward the deep, ripples it slowly, and throws a faint moving net of light across it. Behind the letters a
// real hatchetfish drifts past, turned and lit, its belly lights glinting. Drawn on its own canvas only while the title
// shows; the letters themselves are painted once and kept.
const BONE = [232, 222, 194];
// each letter on a 60 x 100 cell (y down), as strokes: [x0, y0, x1, y1] lines and ['arc', cx, cy, r, a0, a1]
const W0 = 18; // stroke width
const G = {
  H: [[10, 0, 10, 100], [50, 0, 50, 100], [10, 50, 50, 50]],
  A: [[6, 100, 30, 0], [54, 100, 30, 0], [15, 64, 45, 64]],
  T: [[0, 8, 60, 8], [30, 8, 30, 100]],
  C: [['arc', 33, 50, 40, 0.75, 5.55]],
  E: [[10, 0, 10, 100], [10, 8, 54, 8], [10, 50, 46, 50], [10, 92, 56, 92]],
  F: [[10, 0, 10, 100], [10, 8, 52, 8], [10, 50, 44, 50]],
  I: [[13, 0, 13, 100]],
  S: [['path', 'M54 14 C46 2 10 0 10 26 C10 50 50 46 50 74 C50 100 14 102 4 86']],
};
const WIDTH = { H: 60, A: 60, T: 58, C: 62, E: 54, F: 48, I: 26, S: 58 }; // (advances set by eye, so the gaps look even)
// (7.6.35, owner) pairs kerned by eye: the T's stem stands in the middle of its bar, the A is narrow at the top, so the
// word read "HA TCHE TFISH"; these pull the open pairs together so it reads as one
const KERN = { AT: -7, TC: -4, ET: -2, TF: -3, HE: 3 };

let cache = null;
function letters(scale) {
  if (cache && cache.scale === scale) return cache;
  const word = 'HATCHETFISH', gap = 9, kern = (i) => (i + 1 < word.length ? KERN[word[i] + word[i + 1]] || 0 : 0), total = [...word].reduce((a, ch, i) => a + WIDTH[ch] + gap + kern(i), -gap);
  const pad = 24, cw = Math.ceil((total + pad * 2) * scale), ch = Math.ceil((100 + pad * 2) * scale);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
  let sd = 1234; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  x.translate(pad * scale, pad * scale); x.scale(scale, scale);
  x.lineCap = 'butt'; x.lineJoin = 'miter';
  let ox = 0, ci = 0;
  for (const chr of word) {
    x.save(); x.translate(ox, (r() - 0.5) * 3); x.rotate((r() - 0.5) * 0.03); // each letter set by hand: a little off true
    const strokes = G[chr];
    // the stroke drawn three times with a small jitter and varied width: an edge that is cut, not printed
    for (let pass = 0; pass < 3; pass++) {
      x.strokeStyle = `rgb(${BONE.join(',')})`; x.lineWidth = W0 * (0.9 + r() * 0.16);
      for (const s of strokes) {
        const j = () => (r() - 0.5) * 1.4;
        x.beginPath();
        if (s[0] === 'path') { x.stroke(new Path2D(s[1])); continue; }
        if (s[0] === 'arc') { x.arc(s[1] + j(), s[2] + j(), s[3], s[4], s[5], s[6] || false); }
        else { x.moveTo(s[0] + j(), s[1] + j()); x.lineTo(s[2] + j(), s[3] + j()); }
        x.stroke();
      }
    }
    // chisel flares at the free ends of the vertical strokes (top and foot), slightly uneven
    x.fillStyle = `rgb(${BONE.join(',')})`;
    for (const s of strokes) {
      if (s[0] === 'arc' || s[0] === 'path' || Math.abs(s[0] - s[2]) > 2) continue;
      for (const yy of [s[1], s[3]]) { const dir = yy < 50 ? 1 : -1, fw = W0 * (0.85 + r() * 0.2); x.beginPath(); x.moveTo(s[0] - fw, yy); x.lineTo(s[0] + fw, yy); x.lineTo(s[0] + W0 * 0.5, yy + dir * 7); x.lineTo(s[0] - W0 * 0.5, yy + dir * 7); x.closePath(); x.fill(); }
    }
    x.restore(); ox += WIDTH[chr] + gap + kern(ci); ci++;
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  // (7.6.35, owner) the surface, painted: no sprayed dots. The paint worn back at the edges in uneven chips (more where the
  // letters are older, toward the right), a fine grain through it, a pale lip along the tops where light from above
  // catches, and each letter darkening toward its foot
  const mask = document.createElement('canvas'); mask.width = cw; mask.height = ch; mask.getContext('2d').drawImage(c, 0, 0);
  const md = mask.getContext('2d').getImageData(0, 0, cw, ch).data, solid = (px, py) => px >= 0 && py >= 0 && px < cw && py < ch && md[((py | 0) * cw + (px | 0)) * 4 + 3] > 128;
  const edge = (px, py, d) => solid(px, py) && (!solid(px + d, py) || !solid(px - d, py) || !solid(px, py + d) || !solid(px, py - d));
  const fAt = (px) => { const u = px / cw; return u < 0.3 ? 0 : Math.min(1, Math.pow((u - 0.3) / 0.62, 1.3)); }; // how far the deep has got in, from the C on
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { const px = r() * cw, py = r() * ch, f = fAt(px); if (!edge(px, py, 1.2 * scale)) continue; if (r() > 0.12 + 0.5 * f) continue;
    const rr = (0.35 + r() * r() * (0.9 + 1.6 * f)) * scale, n = 7 + (r() * 4 | 0); x.globalAlpha = 0.7 + r() * 0.3; x.beginPath();
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, q = rr * (0.5 + r() * 0.7); k ? x.lineTo(px + Math.cos(a) * q, py + Math.sin(a) * q) : x.moveTo(px + Math.cos(a) * q, py + Math.sin(a) * q); } x.closePath(); x.fill(); } // chips bitten from the edges
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-atop';
  const gg = x.createLinearGradient(0, 0, 0, ch); gg.addColorStop(0, 'rgba(255,250,232,0.12)'); gg.addColorStop(0.45, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(46,36,20,0.38)'); x.fillStyle = gg; x.fillRect(0, 0, cw, ch);
  { const id = x.getImageData(0, 0, cw, ch), d = id.data, cell = Math.max(1, Math.round(0.7 * scale)), nz = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) { const o = (py * cw + px) * 4; if (!d[o + 3]) continue; const g2 = 0.95 + 0.06 * nz((px / cell) | 0, (py / cell) | 0) + 0.03 * nz(px, py); d[o] *= g2; d[o + 1] *= g2; d[o + 2] *= g2; }
    x.putImageData(id, 0, 0); } // the grain
  { const lip = document.createElement('canvas'); lip.width = cw; lip.height = ch; const lx = lip.getContext('2d'); lx.drawImage(c, 0, 0); lx.globalCompositeOperation = 'source-in'; lx.fillStyle = 'rgb(255,248,226)'; lx.fillRect(0, 0, cw, ch);
    lx.globalCompositeOperation = 'destination-out'; lx.drawImage(mask, 0, 2.2 * scale); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.45; x.drawImage(lip, 0, 0); x.globalAlpha = 1; } // the lit top lip
  // (7.6.36, owner) one brightness across the word: the deep shows in its hue and texture, never by darkening. The bone's
  // colour turns, from the C on, toward a drowned olive green and then a cold sea teal, each letter keeping its brightness
  // ('color' keeps the letters' own light and takes only the hue)
  { const hu = document.createElement('canvas'); hu.width = cw; hu.height = ch; const hx = hu.getContext('2d'), hg2 = hx.createLinearGradient(cw * 0.28, 0, cw * 0.97, 0);
    hg2.addColorStop(0, 'rgba(140,150,110,0)'); hg2.addColorStop(0.4, 'rgba(128,140,104,0.5)'); hg2.addColorStop(0.75, 'rgba(114,134,116,0.6)'); hg2.addColorStop(1, 'rgba(106,130,122,0.7)'); /* greyed drowned greens, never cyan */
    hx.fillStyle = hg2; hx.fillRect(0, 0, cw, ch); hx.globalCompositeOperation = 'destination-in'; hx.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'color'; x.drawImage(hu, 0, 0); }
  x.globalCompositeOperation = 'source-over';
  // (7.6.35, owner) the deep getting into it, on a layer of its own (so it can breathe on the title): from the C on the
  // bone sinks through olive and drowned green to near black teal by the S H; silt stains rise from the feet; rust crust
  // and small barnacles gather at the corners; fine dark threads creep across the last letters toward the fish; and a
  // few sharp pricks of cold light show only in the darkest letters. All inside the letters' own shape
  const inf = document.createElement('canvas'); inf.width = cw; inf.height = ch; const ix = inf.getContext('2d');
  { // (7.6.36, owner) mottling: the paint blotched lighter and darker in about equal measure (texture, not shade), and
    // scars: short gouges, a dark cut with a pale lip, more of both the further right
    for (let i = 0; i < 900; i++) { const px = r() * cw, py = r() * ch, f = fAt(px); if (f <= 0.02 || r() > f) continue; const rr = (1.5 + r() * 5) * scale, lt = r() < 0.5;
      ix.fillStyle = lt ? `rgba(226,236,214,${(0.07 + 0.08 * r()).toFixed(3)})` : `rgba(40,52,44,${(0.08 + 0.09 * r()).toFixed(3)})`; ix.beginPath(); ix.ellipse(px, py, rr * (1 + r()), rr, r() * 3, 0, Math.PI * 2); ix.fill(); }
    ix.lineCap = 'round';
    for (let i = 0; i < 160; i++) { const px = r() * cw, py = r() * ch, f = fAt(px); if (f <= 0.1 || r() > f || !solid(px, py)) continue; const L = (3 + r() * 9) * scale, a = (r() - 0.5) * 1.2 + (r() < 0.5 ? 0 : Math.PI / 2), dx = Math.cos(a) * L, dy = Math.sin(a) * L;
      ix.strokeStyle = 'rgba(30,38,32,0.55)'; ix.lineWidth = Math.max(0.6, 0.7 * scale); ix.beginPath(); ix.moveTo(px - dx / 2, py - dy / 2); ix.quadraticCurveTo(px + dy * 0.15, py - dx * 0.15, px + dx / 2, py + dy / 2); ix.stroke();
      ix.strokeStyle = 'rgba(236,240,220,0.35)'; ix.lineWidth = Math.max(0.5, 0.45 * scale); ix.beginPath(); ix.moveTo(px - dx / 2 + 0.8 * scale, py - dy / 2 + 0.8 * scale); ix.quadraticCurveTo(px + dy * 0.15 + 0.8 * scale, py - dx * 0.15 + 0.8 * scale, px + dx / 2 + 0.8 * scale, py + dy / 2 + 0.8 * scale); ix.stroke(); }
    for (let sx = 0; sx < cw; sx += 3) { const f = fAt(sx); if (f <= 0) continue; const hh = ch * (0.18 + 0.4 * f) * (0.75 + 0.5 * Math.abs(Math.sin(sx * 0.037) * Math.sin(sx * 0.011 + 1.3))), sg = ix.createLinearGradient(0, ch - pad * scale * 0.9, 0, ch - pad * scale * 0.9 - hh);
      sg.addColorStop(0, `rgba(118,112,80,${(0.42 * f).toFixed(3)})`); sg.addColorStop(1, 'rgba(118,112,80,0)'); /* a mid-tone stain, not a shadow */ ix.fillStyle = sg; ix.fillRect(sx, 0, 3.4, ch); } // silt stains rising
    for (let i = 0; i < 1800; i++) { const px = r() * cw, py = r() * ch, f = fAt(px); if (f <= 0.05 || r() > f * f || !edge(px, py, 3 * scale)) continue;
      if (r() < 0.55) { const rr = (1 + r() * 2.4) * scale; ix.fillStyle = `rgba(${110 + (r() * 30 | 0)},${60 + (r() * 20 | 0)},${34 + (r() * 12 | 0)},${(0.35 + 0.35 * r()).toFixed(3)})`; ix.beginPath(); ix.ellipse(px, py, rr * 1.5, rr, r() * 3, 0, Math.PI * 2); ix.fill(); } // rust crust
      else { const rr = (0.9 + r() * 1.5) * scale; ix.fillStyle = 'rgba(176,170,146,0.85)'; ix.beginPath(); ix.ellipse(px, py, rr, rr * 0.8, 0, 0, Math.PI * 2); ix.fill(); ix.fillStyle = 'rgba(20,22,18,0.8)'; ix.beginPath(); ix.ellipse(px, py - rr * 0.1, rr * 0.42, rr * 0.3, 0, 0, Math.PI * 2); ix.fill(); ix.strokeStyle = 'rgba(230,226,206,0.5)'; ix.lineWidth = Math.max(0.5, rr * 0.25); ix.beginPath(); ix.arc(px, py, rr * 0.85, Math.PI * 1.1, Math.PI * 1.7); ix.stroke(); } } // a barnacle: a pale cone, its dark mouth, light on its rim
    ix.lineCap = 'round';
    for (let i = 0; i < 14; i++) { let px = cw * (0.97 - r() * 0.3), py = ch * (0.15 + r() * 0.7), a = Math.PI + (r() - 0.5) * 1.4; const L = (40 + r() * 90) * scale, w0 = (0.8 + r() * 0.9) * scale; // threads creeping in from the fish's side
      ix.strokeStyle = `rgba(34,48,40,${(0.4 + 0.25 * r()).toFixed(3)})`; for (let s2 = 0; s2 < L; s2 += 2 * scale) { const k = s2 / L; a += (r() - 0.5) * 0.5; const nx = px + Math.cos(a) * 2 * scale, ny = py + Math.sin(a) * 2 * scale; ix.lineWidth = w0 * (1 - k * 0.8); ix.beginPath(); ix.moveTo(px, py); ix.lineTo(nx, ny); ix.stroke(); px = nx; py = ny; if (r() < 0.04) { let bx = px, by = py, ba = a + (r() < 0.5 ? 0.9 : -0.9); for (let q = 0; q < 8; q++) { const bx2 = bx + Math.cos(ba) * 1.6 * scale, by2 = by + Math.sin(ba) * 1.6 * scale; ix.lineWidth = w0 * 0.4 * (1 - q / 8); ix.beginPath(); ix.moveTo(bx, by); ix.lineTo(bx2, by2); ix.stroke(); bx = bx2; by = by2; ba += (r() - 0.5) * 0.6; } } } }
    ix.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 400; i++) { const px = r() * cw, py = r() * ch, f = fAt(px); if (f < 0.6 || r() > (f - 0.6) * 1.2 || !solid(px, py)) continue; const L = (1.2 + r() * 2.2) * scale, an = (r() - 0.5) * 0.6; ix.strokeStyle = `rgba(196,226,200,${(0.5 + 0.4 * r()).toFixed(3)})`; ix.lineWidth = Math.max(0.6, 0.45 * scale); ix.beginPath(); ix.moveTo(px - Math.cos(an) * L, py - Math.sin(an) * L); ix.lineTo(px + Math.cos(an) * L, py + Math.sin(an) * L); ix.stroke(); } // cold pricks of light
    ix.globalCompositeOperation = 'destination-in'; ix.drawImage(c, 0, 0); ix.globalCompositeOperation = 'source-over'; }
  const base = c;
  cache = { c: base, inf, scale, cw, ch };
  return cache;
}

// a hatchetfish, side on, facing right: the deep hatchet-shaped belly, a silver flank lit from above, a big eye, a row
// of photophores along the keel that glint in turn
// (7.1.7) the painted hatchetfish (tools/hatchet_kit.py): a silver blade with tube eyes and its belly's lights; the drawn
// one below stays only until the picture has loaded
const HF = typeof Image !== 'undefined' ? Object.assign(new Image(), { src: 'assets/loading/hatchetfish.png' }) : null;
// (7.3.5) it swims as a hatchetfish does, seen from the side: the body stays stiff (the slices of 7.3.4 bent it up and down
// like a flag, which no fish does); it hovers, rising and sinking a little with a slow nose-up, nose-down tilt, and the
// tail beats sideways, toward and away from us, so in profile the tail fin narrows and widens in quick flicks (a beat,
// then a glide). The same in index.html's loading bar (its own copy, since it runs before any of this loads).
// Drawn in thin upright slices, put together once a frame on a small canvas of their own (the title draws it twice)
let SWIM = null, SWIM_T = -1;
export function swimPose(t) {
  const ph = t * 7.5, beat = Math.max(0, Math.sin(t * 1.9)); // flicks come in bursts, then a short glide
  return { sq: 1 - 0.32 * beat * (0.5 + 0.5 * Math.cos(ph)), bob: Math.sin(t * 1.1) * 0.016, pitch: Math.sin(t * 0.8 + 1) * 0.025 };
}
export function swimDraw(x, img, dx, dy, dw, dh, t) {
  const W = Math.max(8, Math.round(dw)), pad = Math.round(dh * 0.12), H = Math.max(8, Math.round(dh)) + pad * 2;
  if (!SWIM) SWIM = document.createElement('canvas');
  if (SWIM.width !== W || SWIM.height !== H || SWIM_T !== t) {
    if (SWIM.width !== W || SWIM.height !== H) { SWIM.width = W; SWIM.height = H; }
    const k = SWIM.getContext('2d'); k.clearRect(0, 0, W, H); SWIM_T = t;
    const P = swimPose(t), n = 28, sw = img.naturalWidth / n, ut = 0.2; // u 0 the tail .. 1 the nose (it faces right); the tail fin is the first fifth
    const X = (u) => (u < ut ? ut - (ut - u) * P.sq : u) * W;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, um = (u0 + u1) / 2, off = (P.bob + (um - 0.5) * P.pitch) * dh;
      k.drawImage(img, i * sw, 0, sw + 0.6, img.naturalHeight, X(u0), pad + off, X(u1) - X(u0) + 0.6, dh);
    }
  }
  x.drawImage(SWIM, dx, dy - pad * (dh / (H - pad * 2)), dw, dh * H / (H - pad * 2));
}
function drawHatchetfish(x, L, t) {
  if (HF && HF.complete && HF.naturalWidth) { const h = L * HF.naturalHeight / HF.naturalWidth; swimDraw(x, HF, 0, L * 0.68 / 2 - h / 2, L * 1.08, h * 1.08, t); return; }
  const s = L / 100;
  x.save(); x.scale(s, s);
  x.fillStyle = 'rgba(140,150,140,0.55)'; x.beginPath(); x.moveTo(4, 20); x.lineTo(18, 31); x.lineTo(4, 42); x.lineTo(9, 31); x.closePath(); x.fill(); // tail
  x.beginPath(); x.moveTo(49, 15); x.lineTo(55, 5); x.lineTo(62, 13); x.closePath(); x.fill(); // dorsal fin
  const body = new Path2D('M15 28 C25 24 40 14 62 12 C76 11 88 16 95 26 C97 30 96 33 92 35 C88 45 80 58 66 64 C56 66 46 60 38 50 C30 42 22 36 15 32 Z');
  const g = x.createLinearGradient(0, 10, 0, 66); g.addColorStop(0, '#4c5652'); g.addColorStop(0.22, '#a3ada6'); g.addColorStop(0.45, '#dcddcf'); g.addColorStop(0.75, '#9fa498'); g.addColorStop(1, '#5a5e56');
  x.fillStyle = g; x.fill(body); x.strokeStyle = 'rgba(20,24,20,0.8)'; x.lineWidth = 1.2; x.stroke(body);
  x.strokeStyle = 'rgba(80,88,80,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(70, 16); x.bezierCurveTo(74, 30, 72, 46, 64, 60); x.stroke(); // the gill line
  x.fillStyle = '#c4bea2'; x.beginPath(); x.arc(83, 23, 6.5, 0, Math.PI * 2); x.fill(); x.fillStyle = '#121616'; x.beginPath(); x.arc(83.5, 23.5, 5, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(240,236,220,0.9)'; x.beginPath(); x.arc(81.6, 21.6, 1.5, 0, Math.PI * 2); x.fill();
  const P = [[88, 41], [84, 47], [79, 52], [73, 57], [67, 60], [61, 60], [55, 57], [49, 54], [43, 50]];
  P.forEach(([px, py], i) => { const k = 0.45 + 0.55 * Math.max(0, Math.sin(t * 1.6 - i * 0.7)); x.fillStyle = `rgba(150,196,214,${(0.25 + 0.6 * k).toFixed(3)})`; x.beginPath(); x.arc(px, py, 1.7 + k, 0, Math.PI * 2); x.fill(); });
  x.restore();
}

let raf = 0;
let lay = null;
// (7.0.5) one frame of the title art (letters under the water, their shadow, the hatchetfish): drawn live on the title,
// and baked once into assets/loading/title.png for the loading screen, which shows before any of the game's code runs
export function paintTitle(ctx, W, H, t = 0, dpr = 1) {
    const L = letters(Math.max(0.5, Math.round((H / 160) * 4) / 4));
    // (7.0.2) the word takes the left of the canvas and leaves room after it for the hatchetfish
    const k = Math.min((W * 0.84) / L.cw, (H * 0.86) / L.ch), lw = L.cw * k, lh = L.ch * k, lx = W * 0.03, ly = (H - lh) / 2;
    // the letters under the water, on a layer of their own (so the shadow can be cast from it): drawn in thin slices,
    // each shifted by a slow wave, so the water ripples them; then the water's colour over them and a faint net of light
    if (!lay || lay.width !== W || lay.height !== H) { lay = document.createElement('canvas'); lay.width = W; lay.height = H; }
    const lx2 = lay.getContext('2d'); lx2.setTransform(1, 0, 0, 1, 0, 0); lx2.clearRect(0, 0, W, H);
    const sl = Math.max(2, Math.round(2 * dpr));
    for (let y = 0; y < lh; y += sl) {
      const off = Math.sin(y / (14 * dpr) + t * 1.4) * 1.6 * dpr + Math.sin(y / (37 * dpr) - t * 0.6) * 1.1 * dpr;
      lx2.drawImage(L.c, 0, (y / lh) * L.ch, L.cw, (sl / lh) * L.ch, lx + off, ly + y, lw, sl);
      lx2.globalAlpha = 0.86 + 0.14 * Math.sin(t * 0.22); lx2.drawImage(L.inf, 0, (y / lh) * L.ch, L.cw, (sl / lh) * L.ch, lx + off, ly + y, lw, sl); lx2.globalAlpha = 1; // (7.6.35) the deep in it, breathing slowly
    }
    lx2.save(); lx2.globalCompositeOperation = 'source-atop';
    const wg = lx2.createLinearGradient(0, ly, 0, ly + lh); wg.addColorStop(0, 'rgba(60,110,120,0.12)'); wg.addColorStop(1, 'rgba(12,40,58,0.5)'); lx2.fillStyle = wg; lx2.fillRect(0, 0, W, H);
    lx2.strokeStyle = 'rgba(240,250,236,0.16)'; lx2.lineWidth = 1.2 * dpr;
    // (7.6.35, owner) light through the surface: a broken net of thin wavering lines drifting slowly over the letters,
    // never rings
    lx2.strokeStyle = 'rgba(240,250,236,0.11)'; lx2.lineWidth = 1 * dpr;
    for (let i = 0; i < 9; i++) { const y0 = ly + (i + 0.5) / 9 * lh; lx2.beginPath(); let pen = false;
      for (let x0 = lx; x0 <= lx + lw; x0 += 6 * dpr) { const yy = y0 + Math.sin(x0 / (23 * dpr) + t * 0.5 + i * 1.7) * 7 * dpr + Math.sin(x0 / (9 * dpr) - t * 0.8 + i) * 2 * dpr, on = Math.sin(x0 / (41 * dpr) + i * 2.3 + t * 0.3) > -0.2;
        if (on) { pen ? lx2.lineTo(x0, yy) : lx2.moveTo(x0, yy); pen = true; } else pen = false; } lx2.stroke(); }
    lx2.restore();
    // (7.0.2) a soft shadow under the letters, cast down and a little right, so they stand off the sea behind
    ctx.save(); ctx.globalAlpha = 0.5; ctx.filter = `brightness(0) blur(${(2.2 * dpr).toFixed(1)}px)`; ctx.drawImage(lay, 1.5 * dpr, 3.5 * dpr); ctx.restore(); // (7.6.35) a tighter contact shadow
    ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = `brightness(0) blur(${(1.2 * dpr).toFixed(1)}px)`; ctx.drawImage(lay, 0.8 * dpr, 2 * dpr); ctx.restore(); // and a tight one at their edge
    ctx.drawImage(lay, 0, 0);
    // (7.0.2) the hatchetfish after the word, facing it, wholly seen: hanging in the water, bobbing and turning a little
    { const fl = H * 0.44, fx = lx + lw + (W - lx - lw) * 0.5 + Math.sin(t * 0.45) * W * 0.006, fy = H * 0.52 + Math.sin(t * 0.8) * H * 0.04;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(-1, 1); ctx.rotate(Math.sin(t * 1.1) * 0.05 - 0.04);
      ctx.save(); ctx.globalAlpha = 0.5; ctx.filter = `brightness(0) blur(${(4 * dpr).toFixed(1)}px)`; ctx.translate(-fl * 0.5 + 2 * dpr, -fl * 0.35 + 4 * dpr); drawHatchetfish(ctx, fl, t); ctx.restore(); // its shadow
      ctx.translate(-fl * 0.5, -fl * 0.35); drawHatchetfish(ctx, fl, t); ctx.restore(); }
}
export function startTitleArt(host) {
  if (!host || host.querySelector('canvas.t-art')) return;
  const cv = document.createElement('canvas'); cv.className = 't-art'; host.prepend(cv);
  const ctx = cv.getContext('2d'), t0 = performance.now();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const title = document.getElementById('title'); if (!title || title.hidden || title.classList.contains('gone')) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), Wc = cv.clientWidth, Hc = cv.clientHeight; if (!Wc || !Hc) return;
    if (cv.width !== Math.round(Wc * dpr) || cv.height !== Math.round(Hc * dpr)) { cv.width = Math.round(Wc * dpr); cv.height = Math.round(Hc * dpr); }
    const t = (performance.now() - t0) / 1000, W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    paintTitle(ctx, W, H, t, dpr);
  };
  cancelAnimationFrame(raf); frame();
}
