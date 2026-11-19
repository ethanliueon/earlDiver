// (5.5) The touch buttons' faces: each a small fitting off the boat rather than a stock round icon. A bezel of old
// bronze gone black and green with the sea (5.5.2: not bright brass, which read as gold and cheerful), held by screws, a dark enamel face sunk into it, the symbol in cream (glyphs.js) laid on by the HUD. The main
// button is a porthole ring, bolted like the sub's windows. Each look (size and state) is painted once into a picture
// and reused, so a frame only copies it.
const TAU = Math.PI * 2;
const cache = new Map();

// a seeded scatter, so the wear on a bezel is the same every time it is painted
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function paint(r, kind, state) {
  const pad = Math.ceil(r * 0.18) + 2, size = Math.ceil(r * 2 + pad * 2);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), m = size / 2;
  const off = state === 'off', down = state === 'down', lit = state === 'lit';
  const big = kind === 'big';
  const rim = big ? 0.78 : 0.8; // where the face starts, as a share of the radius
  const R = rnd(big ? 77 : 31);

  // the shadow it throws on the water: a soft dark disc a little below (pressed in, almost none)
  for (let i = 3; i >= 1; i--) { x.fillStyle = `rgba(0,0,0,${(down ? 0.06 : 0.1) * (4 - i) / 3})`; x.beginPath(); x.arc(m, m + (down ? 0.5 : r * 0.07), r + i * r * 0.035, 0, TAU); x.fill(); }

  // the bezel: brass, darker in its lower half where the light from above does not reach, a bright lip along the top
  // blackened bronze: a dark olive-brown metal, deeper in shadow below, a dull worn edge on top; greyer when off
  const brass = off ? [44, 46, 44] : [58, 56, 44], dark = off ? [24, 26, 26] : [28, 28, 22], light = off ? [92, 98, 96] : [128, 132, 108];
  const rgb = (a, k = 1) => `rgba(${a[0]},${a[1]},${a[2]},${k})`;
  x.fillStyle = rgb(brass); x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
  x.fillStyle = rgb(dark, 0.75); x.beginPath(); x.arc(m, m, r, 0.08 * Math.PI, 0.92 * Math.PI); x.arc(m, m, r * rim, 0.92 * Math.PI, 0.08 * Math.PI, true); x.closePath(); x.fill();
  x.strokeStyle = rgb(light, 0.8); x.lineWidth = Math.max(1, r * 0.045); x.beginPath(); x.arc(m, m, r - x.lineWidth * 0.6, 1.12 * Math.PI, 1.88 * Math.PI); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,0.75)'; x.lineWidth = Math.max(1, r * 0.03); x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, TAU); x.stroke();
  // a porthole ring is turned: fine rings cut round it
  if (big) { for (const k of [0.9, 0.84]) { x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = Math.max(0.8, r * 0.012); x.beginPath(); x.arc(m, m, r * k, 0, TAU); x.stroke(); } }
  // wear: a scatter of small dark pits and bright scuffs on the brass
  for (let i = 0; i < (big ? 46 : 22); i++) {
    const a = R() * TAU, d = r * (rim + 0.03 + R() * (0.94 - rim)), s = Math.max(0.5, r * (0.008 + R() * 0.014));
    const q = R(); x.fillStyle = q < 0.45 ? 'rgba(8,10,8,0.45)' : q < 0.8 ? 'rgba(78,128,108,0.42)' : rgb(light, 0.3); // pits, verdigris, scuffs x.beginPath(); x.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, s, 0, TAU); x.fill();
  }
  // the screws (four) or the bolts (eight): slotted heads, each slot turned its own way
  const n = big ? 8 : 4, sr = r * (big ? 0.055 : 0.075), at = r * (rim + (1 - rim) * 0.5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (big ? Math.PI / 8 : Math.PI / 4), sx = m + Math.cos(a) * at, sy = m + Math.sin(a) * at;
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.arc(sx, sy + sr * 0.25, sr * 1.1, 0, TAU); x.fill();
    x.fillStyle = rgb(off ? [70, 74, 72] : [92, 98, 84]); x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
    x.fillStyle = rgb(light, 0.7); x.beginPath(); x.arc(sx - sr * 0.3, sy - sr * 0.3, sr * 0.38, 0, TAU); x.fill();
    if (!big || true) { const t = R() * Math.PI; x.strokeStyle = 'rgba(30,20,6,0.85)'; x.lineWidth = Math.max(0.7, sr * 0.35); x.beginPath(); x.moveTo(sx - Math.cos(t) * sr * 0.75, sy - Math.sin(t) * sr * 0.75); x.lineTo(sx + Math.cos(t) * sr * 0.75, sy + Math.sin(t) * sr * 0.75); x.stroke(); }
  }

  // the face: dark green-black enamel sunk into the bezel. Its upper edge in the bezel's shadow, its lower edge
  // catching a little light; pressed, it is darker and sits deeper
  const fr = r * rim;
  x.fillStyle = off ? 'rgba(10,12,13,0.88)' : down ? 'rgba(4,7,8,0.96)' : 'rgba(8,13,15,0.9)';
  x.beginPath(); x.arc(m, m, fr, 0, TAU); x.fill();
  // a broad soft light on the lower half of the enamel (glaze), as painted rings rather than a gradient
  if (!down) for (let i = 0; i < 5; i++) { x.fillStyle = `rgba(110,160,160,${off ? 0.01 : 0.02})`; x.beginPath(); x.ellipse(m, m + fr * 0.28, fr * (0.82 - i * 0.12), fr * (0.55 - i * 0.08), 0, 0, TAU); x.fill(); }
  x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = Math.max(1, r * (down ? 0.09 : 0.06)); x.beginPath(); x.arc(m, m, fr - x.lineWidth / 2, 1.05 * Math.PI, 1.95 * Math.PI); x.stroke();
  x.strokeStyle = `rgba(150,190,180,${off ? 0.06 : 0.12})`; x.lineWidth = Math.max(0.8, r * 0.03); x.beginPath(); x.arc(m, m, fr - x.lineWidth, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
  // a gloss: one small curved glint at the top left of the glass-hard enamel
  if (!off) { x.strokeStyle = 'rgba(200,240,235,0.1)'; x.lineWidth = Math.max(1, r * 0.05); x.lineCap = 'round'; x.beginPath(); x.arc(m, m, fr * 0.78, 1.18 * Math.PI, 1.42 * Math.PI); x.stroke(); }
  // on (a lamp burning, the sub coming): a cold ring of light round the inside of the bezel, as the deep's animals glow
  if (lit) for (let i = 0; i < 4; i++) { x.strokeStyle = `rgba(110,236,214,${0.5 - i * 0.11})`; x.lineWidth = Math.max(1, r * 0.04); x.beginPath(); x.arc(m, m, fr - r * 0.03 - i * r * 0.035, 0, TAU); x.stroke(); }
  return { c, half: size / 2 };
}

// the face for a button of radius r (HUD pixels); kind 'small' or 'big'; state 'on', 'off', 'down' or 'lit'
export function drawToken(ctx, cx, cy, r, kind = 'small', state = 'on') {
  const key = `${kind}|${state}|${Math.round(r * 2)}`;
  let t = cache.get(key);
  if (!t) { t = paint(Math.round(r * 2) / 2, kind, state); cache.set(key, t); if (cache.size > 64) cache.delete(cache.keys().next().value); }
  ctx.drawImage(t.c, cx - t.half, cy - t.half + (state === 'down' ? r * 0.04 : 0));
}
