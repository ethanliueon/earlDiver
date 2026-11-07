// Painted textures for the screens (3.0.33; 3.0.34 built from parts). The dive locker door, drawn once for the size
// and layout of the window, then used as its background:
//  - two steel plates, each painted olive and worn its own way (one more faded, one more scuffed), joined by a
//    riveted seam that runs exactly between the two halves of the window;
//  - a hinge strip down the left edge with its knuckles; a vent louvre high on the right plate; a diamond-tread
//    kick plate along the bottom, scuffed bright by boots;
//  - an engraved maker's plate, a faded decal, a dymo-tape name, and a dive-log tag on a bulldog clip with a
//    pencilled checklist, hung below Earl's stand;
//  - chips to bare metal, faint rust at the rivets and along the bottom, a stencilled 07, and the light of a lamp
//    above falling unevenly across it all.
// Seeded, so it is the same every time.
const rngOf = (seed) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const CACHE = new Map();

// L: { split (x of the seam), tag: [x, y] (where the dive-log tag hangs), name }
export function lockerTexture(w = 1200, h = 800, L = {}) {
  const split = Math.round(L.split || w * 0.5), key = `locker:${w}x${h}:${split}:${L.tag ? L.tag.join(',') : ''}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), R = rngOf(7);
  const plate = (x0, x1, tone, wear) => {
    x.save(); x.beginPath(); x.rect(x0, 0, x1 - x0, h); x.clip();
    const g = x.createLinearGradient(x0, 0, x0 + (x1 - x0) * 0.5, h); g.addColorStop(0, tone[0]); g.addColorStop(0.6, tone[1]); g.addColorStop(1, tone[2]);
    x.fillStyle = g; x.fillRect(x0, 0, x1 - x0, h);
    for (let i = 0; i < 40; i++) { const px = x0 + R() * (x1 - x0), py = R() * h, r = 30 + R() * 130, gg = x.createRadialGradient(px, py, 0, px, py, r), l = R() < 0.5;
      gg.addColorStop(0, l ? `rgba(130,140,105,${0.06 * wear})` : `rgba(18,22,14,${0.08 * wear})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(px - r, py - r, r * 2, r * 2); }
    for (let i = 0; i < 150; i++) { const px = x0 + R() * (x1 - x0), len = 40 + R() * 200, py = R() * h; x.strokeStyle = R() < 0.5 ? 'rgba(255,255,240,0.022)' : 'rgba(0,0,0,0.035)'; x.lineWidth = 1 + R() * 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 3, py + len); x.stroke(); }
    for (let i = 0; i < 50 * wear; i++) { const px = x0 + R() * (x1 - x0), py = R() * h, a = (R() - 0.5) * 1.2, LL = 5 + R() * 26;
      x.strokeStyle = `rgba(185,190,175,${0.06 + R() * 0.1})`; x.lineWidth = 0.6 + R() * 0.7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * LL, py + Math.sin(a) * LL); x.stroke(); }
    x.restore();
  };
  plate(0, split, ['#5a6450', '#4b5541', '#3b4434'], 1.0);
  plate(split, w, ['#55604c', '#48523f', '#384131'], 1.5); // the right plate: older, more knocked about
  // grain over everything
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 13; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
  const rivet = (px, py, r = 3.2) => {
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.arc(px + 0.6, py + 1, r + 0.6, 0, Math.PI * 2); x.fill();
    const g = x.createRadialGradient(px - r * 0.35, py - r * 0.4, 0, px, py, r); g.addColorStop(0, '#8a927e'); g.addColorStop(1, '#3a4234'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  };
  // the seam between the plates: a lap joint, its shadow and highlight, a row of rivets
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(split - 1, 0, 2, h); x.fillStyle = 'rgba(255,255,240,0.07)'; x.fillRect(split + 1, 0, 1, h);
  for (let y = 26; y < h - 70; y += 34) rivet(split + 9, y, 2.8);
  // rivets round the edge
  for (let px = 40; px < w - 20; px += 46) { rivet(px, 12, 2.6); }
  // the hinge strip down the left: a steel strap, three knuckles
  x.fillStyle = '#3e4636'; x.fillRect(0, 0, 16, h); x.fillStyle = 'rgba(255,255,240,0.06)'; x.fillRect(15, 0, 1, h);
  for (const k of [0.16, 0.5, 0.84]) { const ky = h * k, g = x.createLinearGradient(0, 0, 14, 0); g.addColorStop(0, '#2e3428'); g.addColorStop(0.5, '#6a725c'); g.addColorStop(1, '#2a3024');
    x.fillStyle = g; x.fillRect(0, ky - 34, 13, 68); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, ky - 1, 13, 2); rivet(22, ky - 22, 2.4); rivet(22, ky + 22, 2.4); }
  // a vent louvre high on the right plate
  { const vx = w - 190, vy = 34, vw = 120; x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(vx - 4, vy - 4, vw + 8, 44);
    for (let k = 0; k < 6; k++) { const ly = vy + k * 6.5, g = x.createLinearGradient(0, ly, 0, ly + 6); g.addColorStop(0, '#6a7460'); g.addColorStop(0.4, '#4a5442'); g.addColorStop(1, '#151812'); x.fillStyle = g; x.fillRect(vx, ly, vw, 5); }
    rivet(vx - 10, vy + 18, 2.4); rivet(vx + vw + 10, vy + 18, 2.4); }
  // the kick plate along the bottom: diamond tread, scuffed bright in the middle
  { const ky = h - 44; const g = x.createLinearGradient(0, ky, 0, h); g.addColorStop(0, '#5a5f56'); g.addColorStop(1, '#3a3e36'); x.fillStyle = g; x.fillRect(16, ky, w - 16, 44);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(16, ky, w - 16, 2);
    for (let row = 0; row < 5; row++) for (let col = 0; col < w / 22; col++) { const px = 24 + col * 22 + (row % 2) * 11, py = ky + 8 + row * 8, rot = row % 2 ? -0.6 : 0.6;
      x.save(); x.translate(px, py); x.rotate(rot); x.fillStyle = 'rgba(200,205,195,0.16)'; x.fillRect(-6, -1, 12, 2.2); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-6, 1.2, 12, 1); x.restore(); }
    const sg = x.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, w * 0.3); sg.addColorStop(0, 'rgba(220,220,210,0.14)'); sg.addColorStop(1, 'rgba(220,220,210,0)'); x.fillStyle = sg; x.fillRect(16, ky, w - 16, 44);
    for (let px = 40; px < w - 20; px += 90) rivet(px, ky + 6, 2.2); }
  // chips to bare metal, mostly near the edges and the seam
  const chip = (px, py, r) => { x.beginPath(); for (let k = 0; k <= 9; k++) { const a = (k / 9) * Math.PI * 2, rr = r * (0.55 + R() * 0.6); const qx = px + Math.cos(a) * rr, qy = py + Math.sin(a) * rr * (0.6 + R() * 0.5); k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.closePath();
    x.fillStyle = '#5f625a'; x.fill(); x.strokeStyle = 'rgba(28,30,22,0.55)'; x.lineWidth = 1; x.stroke(); };
  for (let i = 0; i < 34; i++) { const px = R() < 0.3 ? split + (R() - 0.5) * 30 : R() < 0.5 ? 18 + R() * 40 : w - R() * 50, py = R() * (h - 50); chip(px, py, 1.4 + R() * 4); }
  // rust: faint, at the top rivets, along the seam's foot and over the kick plate
  const rust = (px, py, r, L) => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(96,56,28,0.3)'); g.addColorStop(1, 'rgba(96,62,34,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    const sg = x.createLinearGradient(0, py, 0, py + L); sg.addColorStop(0, 'rgba(92,56,28,0.22)'); sg.addColorStop(1, 'rgba(92,56,28,0)'); x.fillStyle = sg; x.fillRect(px - 1, py, 1.5 + R() * 2, L); };
  for (let i = 0; i < 9; i++) rust(40 + Math.floor(R() * (w / 46)) * 46, 14, 3 + R() * 3, 20 + R() * 60);
  for (let i = 0; i < 6; i++) rust(split + 9, 26 + Math.floor(R() * 18) * 34, 3, 15 + R() * 40);
  for (let i = 0; i < 8; i++) rust(30 + R() * (w - 60), h - 48, 6 + R() * 10, 10);
  // an engraved maker's plate, high on the left plate
  { const px = split - 210, py = h - 150; x.fillStyle = '#6e6650'; x.fillRect(px, py, 150, 26); x.fillStyle = 'rgba(255,250,220,0.12)'; x.fillRect(px, py, 150, 1.5); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(px, py + 25, 150, 1.5);
    x.fillStyle = 'rgba(30,26,16,0.75)'; x.font = '600 9px "IBM Plex Mono", monospace'; x.fillText('DIVE LOCKER', px + 10, py + 11); x.font = '8px "IBM Plex Mono", monospace'; x.fillText('MARGARET · E-7 · 1971', px + 10, py + 21);
    rivet(px + 5, py + 13, 1.8); rivet(px + 145, py + 13, 1.8); }
  // a faded decal on the right plate
  { x.save(); x.globalAlpha = 0.1; x.translate(split + 40, h - 120); x.rotate(-0.05); x.strokeStyle = '#e8e4d0'; x.lineWidth = 2; x.strokeRect(0, 0, 150, 38); x.fillStyle = '#e8e4d0'; x.font = 'bold 13px Georgia, serif'; x.fillText('BAYSIDE MARINE', 12, 17); x.font = '9px Georgia, serif'; x.fillText('SUPPLY · HARBOUR RD', 12, 30); x.restore(); }
  // the dive-log tag on a bulldog clip, hung on a nail below Earl's stand
  if (L.tag) { const [tx, ty] = L.tag; x.save(); x.translate(tx, ty); x.rotate(-0.04);
    rivet(0, -14, 2.2); x.strokeStyle = 'rgba(30,30,24,0.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -12); x.lineTo(-6, 2); x.moveTo(0, -12); x.lineTo(6, 2); x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-48, 6, 104, 118); // its shadow
    x.fillStyle = '#d8d0b4'; x.fillRect(-52, 2, 104, 116); x.fillStyle = 'rgba(120,100,60,0.12)'; x.fillRect(-52, 92, 104, 26); // a coffee ring of grime at the bottom
    x.strokeStyle = 'rgba(80,110,140,0.35)'; x.lineWidth = 0.8; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(-46, 22 + k * 10); x.lineTo(46, 22 + k * 10); x.stroke(); }
    x.fillStyle = 'rgba(40,36,30,0.85)'; x.font = '600 8px "IBM Plex Mono", monospace'; x.fillText('DIVE LOG', -44, 14);
    x.font = 'italic 10px Caveat, Georgia, serif'; x.fillStyle = 'rgba(40,40,60,0.8)';
    ['air checked  ✓', 'net, bag  ✓', 'lights  ✓', 'tell the boat', 'back by dark'].forEach((t, k) => x.fillText(t, -44, 30 + k * 10));
    const cg = x.createLinearGradient(-16, 0, 16, 0); cg.addColorStop(0, '#5a5e58'); cg.addColorStop(0.5, '#a8aca0'); cg.addColorStop(1, '#4a4e48'); x.fillStyle = cg; x.fillRect(-16, -2, 32, 9); // the clip
    x.restore(); }
  // the light: a lamp above, falling unevenly
  { const lg = x.createRadialGradient(w * 0.42, -h * 0.1, 0, w * 0.42, -h * 0.1, h * 1.1); lg.addColorStop(0, 'rgba(255,240,210,0.12)'); lg.addColorStop(0.5, 'rgba(255,240,210,0.03)'); lg.addColorStop(1, 'rgba(0,0,0,0.18)'); x.fillStyle = lg; x.fillRect(0, 0, w, h); }
  // a stencilled 07, faded, low on the right plate
  x.save(); x.globalAlpha = 0.06; x.fillStyle = '#e8e4d0'; x.font = `bold ${Math.round(h * 0.18)}px "Allerta Stencil", monospace`; x.textAlign = 'right'; x.fillText('07', w - 40, h - 56); x.restore();
  const url = c.toDataURL('image/jpeg', 0.86); CACHE.set(key, url); return url;
}
