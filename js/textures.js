// Painted textures for the screens (3.0.33): drawn once, then used as CSS backgrounds. The dive locker: a steel
// locker door painted olive, with the grain of the paint, brush streaks, chips worn through to bare metal (a
// dark rim round each), rust blooming round rivets and running down in streaks, scuffs, and a stencilled number.
// Seeded, so it looks the same every time.
const rngOf = (seed) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const CACHE = new Map();

export function lockerTexture(w = 1024, h = 640, seed = 7) {
  const key = `locker:${w}x${h}:${seed}`; if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), R = rngOf(seed);
  // the paint: olive, a little uneven, lighter where the light falls (top left)
  const base = x.createLinearGradient(0, 0, w * 0.4, h); base.addColorStop(0, '#5c6650'); base.addColorStop(0.55, '#4d5743'); base.addColorStop(1, '#3d4636');
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  // blotches in the paint (a few coats, not quite even)
  for (let i = 0; i < 70; i++) { const px = R() * w, py = R() * h, r = 30 + R() * 140, g = x.createRadialGradient(px, py, 0, px, py, r), l = R() < 0.5;
    g.addColorStop(0, l ? 'rgba(120,130,100,0.07)' : 'rgba(20,24,16,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
  // brush streaks, vertical, faint
  for (let i = 0; i < 260; i++) { const px = R() * w, len = 40 + R() * 220, py = R() * h; x.strokeStyle = R() < 0.5 ? 'rgba(255,255,240,0.025)' : 'rgba(0,0,0,0.04)'; x.lineWidth = 1 + R() * 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 4, py + len); x.stroke(); }
  // the grain: fine speckle
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
  // scuffs: short scratches through the top coat
  for (let i = 0; i < 90; i++) { const px = R() * w, py = R() * h, a = (R() - 0.5) * 0.9, L = 6 + R() * 30;
    x.strokeStyle = `rgba(190,195,180,${0.08 + R() * 0.12})`; x.lineWidth = 0.6 + R() * 0.8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  // chips worn through to the metal, more near the edges (where things knock it)
  const chip = (px, py, r) => {
    x.beginPath(); const n = 9; for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2, rr = r * (0.55 + R() * 0.6); const qx = px + Math.cos(a) * rr, qy = py + Math.sin(a) * rr * (0.6 + R() * 0.5); k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.closePath();
    x.fillStyle = '#5f625a'; x.fill();
    x.strokeStyle = 'rgba(30,32,24,0.55)'; x.lineWidth = 1.2; x.stroke(); // the paint's broken edge
    x.fillStyle = 'rgba(140,142,134,0.35)'; x.fillRect(px - r * 0.2, py - r * 0.15, r * 0.3, 1); // a glint of bare steel
  };
  for (let i = 0; i < 30; i++) { const edge = R() < 0.75; let px = R() * w, py = R() * h; if (edge) { if (R() < 0.5) px = R() < 0.5 ? R() * 40 : w - R() * 40; else py = R() < 0.5 ? R() * 40 : h - R() * 40; } chip(px, py, 1.5 + R() * (edge ? 5 : 2.5)); }
  // rust: blooms (round rivet holes, along the bottom edge) and streaks running down from them
  const rust = (px, py, r) => {
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(92,54,28,0.32)'); g.addColorStop(0.5, 'rgba(96,62,34,0.14)'); g.addColorStop(1, 'rgba(96,62,34,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    const L = 20 + R() * 90; const sg = x.createLinearGradient(0, py, 0, py + L); sg.addColorStop(0, 'rgba(92,56,28,0.22)'); sg.addColorStop(1, 'rgba(92,56,28,0)');
    x.fillStyle = sg; x.fillRect(px - 1 - R() * 1.5, py, 2 + R() * 2.5, L);
  };
  for (let i = 0; i < 12; i++) rust(R() * w, 14 + R() * 8, 2 + R() * 4); // at the rivet line along the top
  for (let i = 0; i < 10; i++) rust(R() * w, h - 8 - R() * 24, 5 + R() * 10); // along the bottom, where the water sits
  // a stencilled locker number, faded, low on the door
  x.save(); x.globalAlpha = 0.07; x.fillStyle = '#e8e4d0'; x.font = `bold ${Math.round(h * 0.2)}px "Allerta Stencil", monospace`; x.textAlign = 'right'; x.fillText('07', w - 30, h - 30); x.restore();
  const url = c.toDataURL('image/jpeg', 0.86); CACHE.set(key, url); return url;
}
