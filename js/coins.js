// (5.6) The touch buttons as painted coins, in the manner of a mobile RPG's skill buttons: a deep, muted face
// (darker to the rim, a soft light behind the art, brushed through), the art of the thing itself centred on it,
// and a worn dark lip. The art is drawn here at a size of its own (no flat symbols): the net and the camera from
// the player's own gear, the eye, the fins, the sub, the glove, the torch, the crab pot, the claw. Each look is
// painted once into a picture and reused.
import { drawEmblem, ABILITY_FAMILIES, drawTierEmblemMask, ACCENT } from './scrolls.js';
import { drawGlyph } from './glyphs.js';
import { drawNet, netLook } from './tools_draw.js';
import { PAINTED, paintSprint, paintMask, paintAbility } from './coin_art.js';

const TAU = Math.PI * 2;
const cache = new Map();
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// the face colour of each: muted, deep, telling the buttons apart at a glance
// (5.9.6) the plain buttons all share one worn grey-brown, so colour on a button means one thing: rarity, on the
// ability's. Only two keep a hint of their own: the sub's (and its controls') olive green, the glow stick's faint glow
const PLAIN = [32, 10, 13];
const HUE = new Proxy({ sub: [78, 18, 13], leave: [78, 18, 13], auto: [78, 18, 13], glow: [88, 30, 12], hand: [38, 20, 12] /* (5.16.7) the hand: a neutral worn brown */ }, { get: (o, k) => o[k] || PLAIN });

function face(x, R, hue, seed) {
  const [h, s, l0] = hue, l = l0 + 4; // (a little lighter than the deep: they must read over dark water)
  const g = x.createRadialGradient(-R * 0.18, -R * 0.24, R * 0.04, 0, 0, R);
  g.addColorStop(0, hsl(h, s + 6, l + 13)); g.addColorStop(0.5, hsl(h, s, l + 3)); g.addColorStop(1, hsl(h, Math.max(0, s - 10), Math.max(3, l - 10)));
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
  // brushed through: short soft strokes, light and dark, as paint laid on by hand
  const r = rnd(seed);
  x.save(); x.beginPath(); x.arc(0, 0, R, 0, TAU); x.clip();
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * R, light = r() < 0.5;
    x.fillStyle = light ? 'rgba(255,244,220,0.045)' : 'rgba(0,0,0,0.06)';
    x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * (0.1 + r() * 0.12), R * (0.02 + r() * 0.02), r() * Math.PI, 0, TAU); x.fill();
  }
  x.restore();
}
function lip(x, R, state) {
  x.lineWidth = R * 0.085; x.strokeStyle = '#15130f'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.stroke();
  x.lineWidth = R * (state === 'lit' ? 0.022 : 0.028); x.strokeStyle = state === 'lit' ? 'rgba(226,212,176,0.55)' : 'rgba(190,172,132,0.35)'; // (5.10.8) lit: a quiet cream rim, not a glowing ring
  if (state === 'lit') { x.beginPath(); x.arc(0, 0, R * 0.95, 0, TAU); x.stroke(); }
  else { x.beginPath(); x.arc(0, 0, R * 0.95, Math.PI * 1.12, Math.PI * 1.88); x.stroke(); }
}

// ---------------- the art, on a box of ±50 units ----------------
const ART = {
  // the head of the hand net, close: the hoop seen a little from above, the knotted bag hanging from it, the end of
  // the pole coming in from the lower left. Its colours are the player's own net's
  net(x, look) {
    // (5.6.6) the player's own net, drawn by the game's own drawing of it (every net, whatever its shape: a hoop, a
    // square frame, a teardrop, the eel's jaw, the bell). It is drawn once at a fixed size, its head found by what was
    // drawn past the pole, and that head framed in the coin with a stub of pole leaving it
    const L = look && typeof look === 'object' ? look : netLook(look || 0);
    const u0 = 6, len = (L.len || 30) * u0, Wc = Math.ceil(len + 60 * u0), Hc = Math.ceil(80 * u0);
    const c = document.createElement('canvas'); c.width = Wc; c.height = Hc; const cx = c.getContext('2d');
    cx.translate(6 * u0, Hc * 0.45); drawNet(cx, u0, L, 0.6, 0, null);
    const d = cx.getImageData(0, 0, Wc, Hc).data;
    // where the head starts: the first column, from the grip outwards, where what is drawn is far thicker than a pole
    let from = 0;
    for (let xx = Math.floor(Wc * 0.15); xx < Wc; xx += 2) { let lo = -1, hi = -1; for (let yy = 0; yy < Hc; yy += 2) if (d[(yy * Wc + xx) * 4 + 3] > 20) { if (lo < 0) lo = yy; hi = yy; } if (lo >= 0 && hi - lo > 6 * u0) { from = Math.max(0, xx - 3 * u0); break; } }
    let l = Wc, r2 = -1, t = Hc, b = -1;
    for (let yy = 0; yy < Hc; yy += 2) for (let xx = from; xx < Wc; xx += 2) if (d[(yy * Wc + xx) * 4 + 3] > 20) { if (xx < l) l = xx; if (xx > r2) r2 = xx; if (yy < t) t = yy; if (yy > b) b = yy; }
    if (r2 < 0) return;
    const hw = r2 - l, hh = b - t, k = 76 / Math.max(hw, hh * 1.1), mx = (l + r2) / 2, my = (t + b) / 2;
    // (5.7.0) a pale halo round the net's own shape first, so a dark net still stands off a dark face of any rarity
    const hc = document.createElement('canvas'); hc.width = Wc; hc.height = Hc; const hx = hc.getContext('2d'); hx.drawImage(c, 0, 0); hx.globalCompositeOperation = 'source-in'; hx.fillStyle = 'rgba(232,226,204,1)'; hx.fillRect(0, 0, Wc, Hc);
    x.save(); x.rotate(-0.55); x.scale(k, k); x.translate(-mx + hw * 0.08, -my);
    x.globalAlpha = 0.5; x.filter = `blur(${(2.2 / k).toFixed(1)}px)`; for (const [ox, oy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) x.drawImage(hc, ox / k, oy / k);
    x.filter = 'none'; x.globalAlpha = 1; x.drawImage(c, 0, 0); x.restore();
  },
  // an underwater camera in its housing, in the colour of the player's own: moulded, not a box. Bevelled edges, two
  // grips with their rubber, the big port of the lens with its rings and a reflection, the strobe on its arm, screws
  cam(x, look) {
    const base = look && typeof look === 'object' ? look.base || 0 : look || 0;
    const body0 = (look && look.body) || ['#8a7a44', '#8a9296', '#2c3034'][base] || '#8a7a44', trim = (look && look.accent) || ['#2a2a26', '#7a3a28', '#7a3a28'][base] || '#2a2a26';
    const body = (() => { const m = /^#([0-9a-f]{6})$/i.exec(body0); if (!m) return body0; const n = parseInt(m[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (106 - v) * 0.35)); return `rgb(${c.join(',')})`; })(); // (5.16.0) the housing's paint weathered on the button: no bright yellow
    // the strobe on its jointed arm
    x.lineCap = 'round'; x.strokeStyle = '#0b0c0c'; x.lineWidth = 6; x.beginPath(); x.moveTo(-18, -16); x.lineTo(-28, -32); x.lineTo(-10, -40); x.stroke();
    x.strokeStyle = '#4a5054'; x.lineWidth = 3.4; x.stroke();
    x.fillStyle = '#1a1d1f'; x.strokeStyle = '#0b0c0c'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(-12, -47, 18, 12, 3); x.fill(); x.stroke();
    x.fillStyle = '#dfe8ea'; x.fillRect(4, -45, 2.6, 8);
    // the housing: bevelled corners, a seam where its two halves seal
    const hb = new Path2D('M-34 -18L-26 -24H26L34 -18V20L26 26H-26L-34 20Z');
    x.lineWidth = 4.4; x.strokeStyle = '#0b0c0c'; x.stroke(hb); x.fillStyle = body; x.fill(hb);
    x.save(); x.clip(hb);
    x.fillStyle = 'rgba(255,255,240,0.28)'; x.beginPath(); x.moveTo(-34, -18); x.lineTo(-26, -24); x.lineTo(26, -24); x.lineTo(34, -18); x.lineTo(34, -12); x.lineTo(-34, -12); x.fill(); // light along its top
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-40, 12, 80, 20); // and dark below
    x.fillStyle = trim; x.fillRect(-40, 2, 80, 3.4); // the seal
    x.fillStyle = 'rgba(0,0,0,0.25)'; for (const [a, b] of [[-20, -16], [10, 16], [-6, 18]]) { x.beginPath(); x.ellipse(a, b, 4, 1, 0.4, 0, TAU); x.fill(); } // scuffs
    x.restore();
    x.fillStyle = 'rgba(0,0,0,0.6)'; for (const [a, b] of [[-29, -16], [29, -16], [-29, 18], [29, 18]]) { x.beginPath(); x.arc(a, b, 1.6, 0, TAU); x.fill(); }
    // the grips
    for (const sx of [-1, 1]) { x.fillStyle = '#1a1c1e'; x.strokeStyle = '#0b0c0c'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(sx * 40 - 5, -14, 10, 30, 4); x.fill(); x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; for (let k = -10; k < 14; k += 4) { x.beginPath(); x.moveTo(sx * 40 - 3, k); x.lineTo(sx * 40 + 3, k); x.stroke(); } }
    // the port
    x.fillStyle = '#121416'; x.strokeStyle = '#0b0c0c'; x.lineWidth = 3; x.beginPath(); x.arc(2, 2, 17, 0, TAU); x.fill(); x.stroke();
    x.strokeStyle = '#6a7074'; x.lineWidth = 2.4; x.beginPath(); x.arc(2, 2, 14.5, 0, TAU); x.stroke();
    const pg = x.createRadialGradient(-3, -3, 1, 2, 2, 12); pg.addColorStop(0, '#5a8a96'); pg.addColorStop(0.5, '#1c3238'); pg.addColorStop(1, '#06090a');
    x.fillStyle = pg; x.beginPath(); x.arc(2, 2, 12, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(160,200,210,0.35)'; x.lineWidth = 1; x.beginPath(); x.arc(2, 2, 7, 0, TAU); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(-3, -4, 3.4, 2, -0.6, 0, TAU); x.fill();
    x.fillStyle = '#c8402e'; x.beginPath(); x.roundRect(18, -30, 9, 6, 2); x.fill(); x.strokeStyle = '#0b0c0c'; x.lineWidth = 1.6; x.stroke(); // the shutter
  },
  // leaving the sub: the open hatch seen from inside, its ladder going up into the light
  leave(x) {
    const lg = x.createRadialGradient(0, -24, 2, 0, -20, 30); lg.addColorStop(0, 'rgba(210,236,240,0.9)'); lg.addColorStop(1, 'rgba(60,110,130,0)');
    x.fillStyle = '#0c1012'; x.beginPath(); x.ellipse(0, -16, 26, 12, 0, 0, TAU); x.fill();
    x.fillStyle = lg; x.beginPath(); x.ellipse(0, -16, 22, 10, 0, 0, TAU); x.fill();
    x.strokeStyle = '#0a0b09'; x.lineWidth = 7; x.beginPath(); x.ellipse(0, -16, 26, 12, 0, 0, TAU); x.stroke(); x.strokeStyle = '#5a5e44'; x.lineWidth = 4.4; x.stroke();
    x.fillStyle = '#4c503a'; x.strokeStyle = '#0a0b09'; x.lineWidth = 2.4; x.beginPath(); x.ellipse(-22, -38, 18, 6, -0.9, 0, TAU); x.fill(); x.stroke(); // the lid, swung open
    x.strokeStyle = '#0a0b09'; x.lineWidth = 5; x.beginPath(); x.moveTo(-12, -14); x.lineTo(-16, 44); x.moveTo(12, -14); x.lineTo(16, 44); x.stroke();
    x.strokeStyle = '#8a8e80'; x.lineWidth = 2.6; x.stroke();
    for (let k = 0; k < 5; k++) { const y = -2 + k * 10, w = 12 + k * 0.8; x.strokeStyle = '#0a0b09'; x.lineWidth = 4.4; x.beginPath(); x.moveTo(-w, y); x.lineTo(w, y); x.stroke(); x.strokeStyle = '#8a8e80'; x.lineWidth = 2.2; x.stroke(); }
  },
  // the tank room: a small glass tank, its water lit, a fish in it, weed on its gravel
  tank(x) {
    x.fillStyle = '#0b0d0d'; x.beginPath(); x.roundRect(-40, -26, 80, 54, 4); x.fill();
    const wg = x.createLinearGradient(0, -20, 0, 26); wg.addColorStop(0, '#5c9eaa'); wg.addColorStop(1, '#173a44');
    x.fillStyle = wg; x.fillRect(-35, -16, 70, 40);
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(-30, -16); x.lineTo(-18, -16); x.lineTo(-30, 24); x.lineTo(-35, 24); x.fill();
    x.fillStyle = '#6a5a40'; x.beginPath(); x.moveTo(-35, 24); x.quadraticCurveTo(0, 14, 35, 22); x.lineTo(35, 24); x.fill();
    x.strokeStyle = '#3c6a3a'; x.lineWidth = 2; for (const k of [-24, -18, 22]) { x.beginPath(); x.moveTo(k, 22); x.quadraticCurveTo(k + 4, 8, k - 2, -4); x.stroke(); }
    x.fillStyle = '#d8743a'; x.beginPath(); x.ellipse(4, 2, 9, 5, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(-4, 2); x.lineTo(-11, -3); x.lineTo(-11, 7); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.arc(9, 1, 1.2, 0, TAU); x.fill();
    x.strokeStyle = '#0a0b0b'; x.lineWidth = 4; x.strokeRect(-36, -26, 72, 52); x.fillStyle = '#4a4e44'; x.fillRect(-40, -30, 80, 6); x.fillRect(-40, 26, 80, 6);
    x.strokeStyle = '#0a0b0b'; x.lineWidth = 2; x.strokeRect(-40, -30, 80, 6); x.strokeRect(-40, 26, 80, 6);
  },
  // the autopilot: a ship's wheel in old bronze
  auto(x) {
    x.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.strokeStyle = '#0a0906'; x.lineWidth = 7; x.beginPath(); x.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); x.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); x.stroke(); x.strokeStyle = '#7a6440'; x.lineWidth = 4; x.stroke(); }
    x.strokeStyle = '#0a0906'; x.lineWidth = 10; x.beginPath(); x.arc(0, 0, 28, 0, TAU); x.stroke(); x.strokeStyle = '#8a7048'; x.lineWidth = 6.4; x.stroke();
    x.strokeStyle = 'rgba(255,236,190,0.35)'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, 28, Math.PI * 1.1, Math.PI * 1.7); x.stroke();
    x.fillStyle = '#6a5636'; x.strokeStyle = '#0a0906'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(80,140,110,0.5)'; x.beginPath(); x.arc(-3, 2, 3, 0, TAU); x.fill(); // verdigris
  },
  // the eye: wet, a little bloodshot, the iris holding a faint cold light, the upper lid's shadow across it
  eye(x) {
    const lid = new Path2D('M-42 2C-26 -26 26 -26 42 2C26 26 -26 26 -42 2Z');
    x.save(); x.fillStyle = '#d6cfb8'; x.fill(lid); x.clip(lid);
    x.fillStyle = 'rgba(120,60,50,0.18)'; x.beginPath(); x.ellipse(-30, 4, 12, 16, 0, 0, TAU); x.ellipse(30, 4, 12, 16, 0, 0, TAU); x.fill(); // the corners, redder
    x.strokeStyle = 'rgba(150,50,40,0.45)'; x.lineWidth = 0.8;
    for (const [a, b2, c, d] of [[-40, 0, -24, 2], [-38, 6, -26, 4], [40, 0, 25, -1], [37, 7, 26, 5], [-36, -6, -27, -3]]) { x.beginPath(); x.moveTo(a, b2); x.quadraticCurveTo((a + c) / 2, b2 - 3, c, d); x.stroke(); }
    const ig = x.createRadialGradient(0, 2, 2, 0, 2, 19);
    ig.addColorStop(0, '#0a1414'); ig.addColorStop(0.32, '#1d5858'); ig.addColorStop(0.72, '#2f7f72'); ig.addColorStop(1, '#0c2624');
    x.fillStyle = ig; x.beginPath(); x.arc(0, 2, 19, 0, TAU); x.fill();
    const r = rnd(9); for (let i = 0; i < 70; i++) { const a = i / 70 * TAU; x.strokeStyle = `rgba(150,226,206,${0.12 + r() * 0.22})`; x.lineWidth = 1; x.beginPath(); x.moveTo(Math.cos(a) * 7, 2 + Math.sin(a) * 7); x.lineTo(Math.cos(a) * (15 + r() * 3), 2 + Math.sin(a) * (15 + r() * 3)); x.stroke(); }
    x.strokeStyle = 'rgba(5,10,10,0.8)'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 2, 19, 0, TAU); x.stroke();
    x.fillStyle = '#030606'; x.beginPath(); x.arc(0, 2, 7.5, 0, TAU); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.42)'; x.beginPath(); x.ellipse(0, -22, 50, 15, 0, 0, TAU); x.fill(); // the lid's shadow
    x.restore();
    x.strokeStyle = '#120f0b'; x.lineWidth = 3.4; x.stroke(lid);
    x.strokeStyle = 'rgba(60,40,30,0.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-36, -10); x.bezierCurveTo(-20, -30, 20, -30, 36, -10); x.stroke(); // the crease above
    x.fillStyle = 'rgba(255,255,250,0.9)'; x.beginPath(); x.ellipse(-6, -4, 4, 2.6, -0.5, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,250,0.45)'; x.beginPath(); x.arc(5, 8, 1.5, 0, TAU); x.fill();
  },
  // a pair of long fins mid-kick, rails down their blades, a stream of bubbles behind
  sprint(x, look) {
    // (5.7.0) on (locked): streaks of water rushing past behind it and a stronger light
    if (look && look.lit) { const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 50); g2.addColorStop(0, 'rgba(200,240,255,0.55)'); g2.addColorStop(1, 'rgba(120,200,255,0)'); x.fillStyle = g2; x.beginPath(); x.arc(0, 0, 50, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(220,245,255,0.7)'; x.lineCap = 'round'; for (const [y0, l, w] of [[-26, 30, 2.4], [-8, 40, 3], [12, 34, 2.6], [30, 24, 2]]) { x.lineWidth = w; x.beginPath(); x.moveTo(-48, y0); x.lineTo(-48 + l, y0 - 4); x.stroke(); } }
    // (5.6.6) sprinting: a jagged bolt of rushing water, white at its core, a stream of bubbles torn along it
    const bolt = new Path2D('M8 -46L-22 4H-2L-12 46L24 -8H4Z');
    const gl = x.createRadialGradient(0, 0, 0, 0, 0, 46); gl.addColorStop(0, 'rgba(170,230,255,0.4)'); gl.addColorStop(1, 'rgba(120,200,255,0)');
    x.fillStyle = gl; x.beginPath(); x.arc(0, 0, 46, 0, TAU); x.fill();
    x.lineJoin = 'round'; x.lineWidth = 6; x.strokeStyle = '#06101a'; x.stroke(bolt);
    const bg = x.createLinearGradient(-20, -40, 20, 40); bg.addColorStop(0, '#e8f8ff'); bg.addColorStop(0.5, '#7cc8ec'); bg.addColorStop(1, '#2a6890');
    x.fillStyle = bg; x.fill(bolt);
    x.save(); x.clip(bolt); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1.4; for (let k = -40; k < 50; k += 7) { x.beginPath(); x.moveTo(-30, k); x.quadraticCurveTo(0, k - 6, 30, k - 2); x.stroke(); } x.restore(); // the current in it
    x.strokeStyle = 'rgba(220,245,255,0.8)'; x.lineWidth = 1.4;
    for (const [a, b, r] of [[-30, -22, 3.2], [-36, -8, 2], [-28, 18, 2.6], [-38, 28, 1.6], [26, 16, 2.4], [32, 28, 1.6], [30, -30, 2]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.stroke(); }
  },
  // the B-7: a riveted hull, its rail and conning tower, the diving sphere slung under it with a warm port lit
  sub(x) {
    x.save(); x.scale(1.12, 1.12); x.save(); x.translate(0, -8);
    const hull = new Path2D('M-44 0C-44 -10 -28 -15 -6 -15L26 -15C38 -15 44 -8 44 0C44 8 38 15 26 15L-6 15C-28 15 -44 10 -44 0Z');
    x.lineWidth = 4; x.strokeStyle = '#0b0c09'; x.stroke(hull); x.fillStyle = '#5a5e44'; x.fill(hull);
    x.save(); x.clip(hull); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-50, 4, 100, 20); x.fillStyle = 'rgba(255,250,220,0.14)'; x.fillRect(-50, -15, 100, 5); x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; for (const k of [-24, -4, 16]) { x.beginPath(); x.moveTo(k, -14); x.lineTo(k, 14); x.stroke(); }
    x.fillStyle = 'rgba(20,20,14,0.7)'; for (let k = -36; k <= 36; k += 6) { x.beginPath(); x.arc(k, -10, 0.9, 0, TAU); x.fill(); }
    x.fillStyle = '#4c503a'; x.strokeStyle = '#0b0c09'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(-8, -27, 18, 13, 3); x.fill(); x.stroke(); // the tower
    x.fillStyle = '#c8d0c8'; x.beginPath(); x.arc(-2, -21, 1.7, 0, TAU); x.arc(4, -21, 1.7, 0, TAU); x.fill();
    x.strokeStyle = '#2a2c20'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-30, -18); x.lineTo(30, -18); for (let k = -30; k <= 30; k += 6) { x.moveTo(k, -18); x.lineTo(k, -15); } x.stroke(); // the rail
    x.fillStyle = '#3a3c2c'; x.beginPath(); x.moveTo(42, -4); x.lineTo(50, -11); x.lineTo(50, 11); x.lineTo(42, 4); x.closePath(); x.fill();
    x.restore();
    // the sphere
    x.lineWidth = 3.4; x.strokeStyle = '#0b0c09'; x.fillStyle = '#4a4e3a'; x.beginPath(); x.arc(2, 24, 13, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,250,220,0.18)'; x.beginPath(); x.arc(-2, 19, 7, Math.PI, Math.PI * 1.8); x.lineTo(-2, 19); x.fill();
    const pg = x.createRadialGradient(6, 24, 0, 6, 24, 6); pg.addColorStop(0, '#ffe2a0'); pg.addColorStop(1, '#a06020');
    x.fillStyle = pg; x.beginPath(); x.arc(6, 24, 4.4, 0, TAU); x.fill(); x.strokeStyle = '#1c1c14'; x.lineWidth = 1.6; x.stroke();
    x.restore();
  },
  // a diver's rubber glove, open to take hold
  hand(x) {
    x.save(); x.translate(-30, -34); x.scale(2.6, 2.6);
    const p = new Path2D('M8 11V4.5a1.5 1.5 0 0 1 3 0V10h.6V3a1.5 1.5 0 0 1 3 0v7h.6V4.2a1.5 1.5 0 0 1 3 0V12h.6V7.5a1.5 1.5 0 0 1 3 0V14c0 4.4-3.3 8-7.5 8h-1c-2.6 0-4.4-1.2-5.8-3.3L2.4 13.4a1.6 1.6 0 0 1 2.5-1.9L8 15z');
    x.lineWidth = 1.6; x.strokeStyle = '#090a0a'; x.stroke(p);
    x.fillStyle = '#2b2f31'; x.fill(p);
    x.save(); x.clip(p); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, 0, 9, 24); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(15, 0, 10, 24);
    x.strokeStyle = 'rgba(200,200,190,0.25)'; x.lineWidth = 0.35; for (const k of [9.5, 13.1, 16.7]) { x.beginPath(); x.moveTo(k, 4); x.lineTo(k, 12); x.stroke(); }
    x.restore(); x.restore();
    x.fillStyle = '#1a1d1f'; x.strokeStyle = '#090a0a'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(-12, 22, 36, 15, 2); x.fill(); x.stroke(); // the cuff
    x.fillStyle = 'rgba(200,170,90,0.6)'; x.fillRect(-12, 26, 36, 2.4);
  },
  // the torch: a ribbed grip, the head, and a cone of warm light going out into the water
  lamp(x, look) {
    // (5.7.0) on: the beam thrown wide and bright, a warm halo at the glass
    const on = look && look.lit;
    if (on) { const h = x.createRadialGradient(8, 0, 0, 8, 0, 30); h.addColorStop(0, 'rgba(255,236,190,0.7)'); h.addColorStop(1, 'rgba(255,214,140,0)'); x.fillStyle = h; x.beginPath(); x.arc(8, 0, 30, 0, TAU); x.fill(); }
    const beam = x.createLinearGradient(4, 0, 50, 0); beam.addColorStop(0, on ? 'rgba(255,236,180,0.95)' : 'rgba(255,214,140,0.55)'); beam.addColorStop(1, 'rgba(255,214,140,0)');
    x.fillStyle = beam; x.beginPath(); x.moveTo(6, -9); x.lineTo(50, on ? -40 : -26); x.lineTo(50, on ? 40 : 26); x.lineTo(6, 9); x.closePath(); x.fill();
    x.save(); x.rotate(0); x.lineWidth = 3; x.strokeStyle = '#0a0b0c';
    x.fillStyle = '#3a3e40'; x.beginPath(); x.roundRect(-40, -6.5, 34, 13, 4); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1.2; for (let k = -34; k < -10; k += 4) { x.beginPath(); x.moveTo(k, -6); x.lineTo(k, 6); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.14)'; x.fillRect(-38, -5, 30, 2.4);
    x.fillStyle = '#2c3032'; x.strokeStyle = '#0a0b0c'; x.lineWidth = 3; x.beginPath(); x.moveTo(-6, -7); x.lineTo(6, -12); x.lineTo(6, 12); x.lineTo(-6, 7); x.closePath(); x.fill(); x.stroke();
    const lg = x.createRadialGradient(6, 0, 0, 6, 0, 12); lg.addColorStop(0, '#fff2cc'); lg.addColorStop(1, '#d8a050');
    x.fillStyle = lg; x.beginPath(); x.ellipse(6.5, 0, 2.6, 11, 0, 0, TAU); x.fill();
    x.fillStyle = '#c8402e'; x.beginPath(); x.roundRect(-26, -9, 6, 3, 1); x.fill(); // the switch
    x.restore();
  },
  // a crab pot: a domed wire cage on the bottom, its funnel mouth, and the line up to an orange buoy
  trap(x) {
    x.strokeStyle = '#1a1612'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(22, -12); x.quadraticCurveTo(30, -28, 30, -36); x.stroke();
    x.fillStyle = '#d06030'; x.strokeStyle = '#140c08'; x.lineWidth = 2.4; x.beginPath(); x.ellipse(30, -40, 8, 6.5, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,240,220,0.4)'; x.beginPath(); x.ellipse(27, -42, 3, 1.8, -0.3, 0, TAU); x.fill();
    const cage = new Path2D('M-38 32V2C-38 -16 -20 -26 0 -26S38 -16 38 2V32Z');
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fill(cage);
    x.save(); x.clip(cage); x.strokeStyle = '#8a8a78'; x.lineWidth = 1;
    x.beginPath(); for (let c = -60; c < 60; c += 6) { x.moveTo(c, -30); x.lineTo(c + 60, 34); x.moveTo(c + 60, -30); x.lineTo(c, 34); } x.stroke(); x.restore();
    x.strokeStyle = '#0b0b08'; x.lineWidth = 5; x.stroke(cage); x.strokeStyle = '#6a6a5a'; x.lineWidth = 3; x.stroke(cage);
    x.strokeStyle = '#6a6a5a'; x.lineWidth = 2.4; for (const k of [-19, 0, 19]) { x.beginPath(); x.moveTo(k, 32); x.lineTo(k, k ? -20 : -26); x.stroke(); }
    x.fillStyle = '#0c0c0a'; x.strokeStyle = '#8a8a78'; x.lineWidth = 2; x.beginPath(); x.ellipse(0, 10, 10, 8, 0, 0, TAU); x.fill(); x.stroke(); // the funnel
    x.fillStyle = '#4a4436'; x.fillRect(-42, 30, 84, 6); x.strokeStyle = '#0b0b08'; x.lineWidth = 2; x.strokeRect(-42, 30, 84, 6);
  },
  // the sub's claw: two hooked steel jaws on a jointed wrist
  claw(x) {
    // (5.6.5) the sub's grab arm: a jointed steel limb with its hydraulic ram, a wrist, and two hooked jaws lined with
    // teeth, a bolt at each joint
    x.lineCap = 'round'; x.lineJoin = 'round';
    const seg = (x0, y0, x1, y1, w, col) => { x.strokeStyle = '#0a0b0c'; x.lineWidth = w + 4; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.strokeStyle = col; x.lineWidth = w; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = w * 0.25; x.beginPath(); x.moveTo(x0, y0 - w * 0.25); x.lineTo(x1, y1 - w * 0.25); x.stroke(); };
    seg(-48, 34, -26, 10, 10, '#5a6064'); // the upper arm
    seg(-40, 30, -24, 18, 3, '#9aa0a2'); // its ram
    seg(-26, 10, -4, 2, 8, '#6c7276'); // the forearm
    const bolt = (bx, by, r) => { x.fillStyle = '#3c4246'; x.strokeStyle = '#0a0b0c'; x.lineWidth = 2.4; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#c8ccc8'; x.beginPath(); x.arc(bx - r * 0.25, by - r * 0.25, r * 0.35, 0, TAU); x.fill(); };
    bolt(-26, 10, 6);
    // the jaws
    for (const sg of [-1, 1]) {
      const jaw = new Path2D(sg < 0 ? 'M-2 0C8 -16 26 -22 40 -12L36 -6C26 -12 12 -8 4 4Z' : 'M-2 4C8 18 26 24 40 14L36 8C26 14 12 10 4 0Z');
      x.lineWidth = 4; x.strokeStyle = '#0a0b0c'; x.stroke(jaw); x.fillStyle = '#8a9094'; x.fill(jaw);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.save(); x.clip(jaw); x.fillRect(-10, sg < 0 ? -24 : 2, 60, 6); x.restore();
      x.fillStyle = '#d8dcd8'; for (let k = 0; k < 4; k++) { const tx2 = 12 + k * 7, ty2 = sg < 0 ? -9 + k * 0.6 : 10 - k * 0.6; x.beginPath(); x.moveTo(tx2, ty2); x.lineTo(tx2 + 2.4, ty2 + sg * 4); x.lineTo(tx2 + 4.8, ty2); x.fill(); }
    }
    bolt(-2, 2, 7);
  },

  // the anglerfish's lure: the fleshy stalk curling up, the bulb at its end lit from within, a few specks drifting
  lure(x) {
    x.save(); x.scale(1.15, 1.15); x.translate(4, 4);
    const gl = x.createRadialGradient(10, -18, 0, 10, -18, 30); gl.addColorStop(0, 'rgba(210,255,230,0.55)'); gl.addColorStop(1, 'rgba(120,220,190,0)');
    x.fillStyle = gl; x.beginPath(); x.arc(10, -18, 30, 0, TAU); x.fill();
    x.lineCap = 'round'; x.strokeStyle = '#0c0a08'; x.lineWidth = 9; x.beginPath(); x.moveTo(-30, 46); x.bezierCurveTo(-34, 10, -26, -26, 2, -24); x.stroke();
    x.strokeStyle = '#6a4a3a'; x.lineWidth = 5.6; x.stroke();
    x.strokeStyle = 'rgba(255,220,200,0.25)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-33, 40); x.bezierCurveTo(-36, 8, -28, -24, 0, -26); x.stroke();
    // little filaments off the bulb
    x.strokeStyle = 'rgba(180,240,220,0.7)'; x.lineWidth = 1.2; for (const [a, l] of [[0.2, 14], [0.8, 11], [1.6, 12], [2.6, 9]]) { x.beginPath(); x.moveTo(10, -18); x.quadraticCurveTo(10 + Math.cos(a) * l * 0.6, -18 + Math.sin(a) * l * 0.2, 10 + Math.cos(a) * l, -18 + Math.sin(a) * l); x.stroke(); }
    const bg = x.createRadialGradient(7, -21, 1, 10, -18, 12); bg.addColorStop(0, '#f4fff6'); bg.addColorStop(0.45, '#9ff0cc'); bg.addColorStop(1, '#2a7a64');
    x.fillStyle = bg; x.strokeStyle = '#08100c'; x.lineWidth = 3; x.beginPath(); x.ellipse(10, -18, 11, 12, 0.2, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.ellipse(6, -23, 3, 2, -0.5, 0, TAU); x.fill();
    x.fillStyle = 'rgba(200,250,230,0.7)'; for (const [a, b, r] of [[30, 6, 1.6], [26, 18, 1.1], [36, -6, 1.2], [-12, -40, 1]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
    x.restore();
  },
  // a glow stick: a cracked chemical light in a cord loop, its liquid shining green through the plastic
  glow(x, look) {
    x.save(); x.rotate(-0.6); x.scale(1.3, 1.3);
    // (5.7.0) snapped and burning: a warm amber flood round it (the stick burns amber in the water)
    if (look && look.lit) { const a = x.createRadialGradient(0, 0, 0, 0, 0, 44); a.addColorStop(0, 'rgba(255,200,110,0.8)'); a.addColorStop(0.5, 'rgba(255,170,80,0.35)'); a.addColorStop(1, 'rgba(255,160,70,0)'); x.fillStyle = a; x.beginPath(); x.arc(0, 0, 44, 0, TAU); x.fill(); }
    const gl = x.createRadialGradient(0, 0, 0, 0, 0, 40); gl.addColorStop(0, 'rgba(160,255,150,0.45)'); gl.addColorStop(1, 'rgba(120,255,120,0)');
    x.fillStyle = gl; x.beginPath(); x.arc(0, 0, 40, 0, TAU); x.fill();
    x.strokeStyle = '#0a0c0a'; x.lineWidth = 2.2; x.beginPath(); x.ellipse(-36, 0, 8, 6, 0, 0, TAU); x.stroke(); x.strokeStyle = '#c8402e'; x.lineWidth = 1.4; x.stroke(); // the cord
    x.fillStyle = '#0a0c0a'; x.beginPath(); x.roundRect(-30, -8.5, 62, 17, 8.5); x.fill();
    const lg = x.createLinearGradient(0, -7, 0, 7); lg.addColorStop(0, '#eaffd8'); lg.addColorStop(0.4, '#8cf070'); lg.addColorStop(1, '#2c8a30');
    x.fillStyle = lg; x.beginPath(); x.roundRect(-27, -6, 56, 12, 6); x.fill();
    x.strokeStyle = 'rgba(20,60,20,0.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-2, -6); x.lineTo(1, -1); x.lineTo(-1, 2); x.lineTo(2, 6); x.stroke(); // the crack
    x.fillStyle = '#3a3e3a'; x.beginPath(); x.roundRect(-31, -7, 6, 14, 2); x.fill(); x.beginPath(); x.roundRect(27, -7, 6, 14, 2); x.fill(); // the caps
    x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(-22, -4, 40, 1.6);
    x.restore();
  },
  // (5.7.5) dive in: a diver going in head first off a rail, the splash rings below
  dive(x) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#0a0c0c'; x.lineWidth = 7; x.beginPath(); x.moveTo(-40, -6); x.lineTo(-6, -6); x.stroke(); x.strokeStyle = '#8a7650'; x.lineWidth = 3.5; x.stroke(); // the rail
    x.strokeStyle = '#0a0c0c'; x.lineWidth = 4; x.beginPath(); x.moveTo(-36, -6); x.lineTo(-36, 10); x.moveTo(-14, -6); x.lineTo(-14, 10); x.stroke();
    // the arc of the dive
    x.setLineDash([4, 5]); x.strokeStyle = 'rgba(230,222,196,0.75)'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-20, -14); x.quadraticCurveTo(10, -46, 20, 4); x.stroke(); x.setLineDash([]);
    // the diver, arms over head, going down
    x.save(); x.translate(20, 6); x.rotate(0.35);
    x.fillStyle = '#1c2124'; x.strokeStyle = '#0a0c0c'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(-6, -26, 12, 30, 6); x.fill(); x.stroke();
    x.fillStyle = '#c9b48c'; x.beginPath(); x.arc(0, 8, 5.5, 0, TAU); x.fill(); x.stroke(); // head
    x.fillStyle = '#9aa2a6'; x.beginPath(); x.roundRect(-9, -20, 5, 16, 2); x.fill(); x.stroke(); // tank
    x.restore();
    // the water and the splash rings
    x.strokeStyle = '#6aa6c4'; x.lineWidth = 3; x.beginPath(); x.moveTo(-44, 26); x.quadraticCurveTo(-30, 22, -16, 26); x.quadraticCurveTo(-2, 30, 12, 26); x.quadraticCurveTo(26, 22, 44, 26); x.stroke();
    x.strokeStyle = 'rgba(220,240,250,0.85)'; x.lineWidth = 2; for (const [rx, ry] of [[10, 3], [18, 5.5]]) { x.beginPath(); x.ellipse(24, 30, rx, ry, 0, 0, TAU); x.stroke(); }
  },
  // (5.7.5) out on deck: the cabin's steel door, its porthole lit with daylight, the handle
  door(x, o = {}) {
    x.lineJoin = 'round';
    const d = new Path2D('M-22 -40H22C26 -40 28 -38 28 -34V40H-28V-34C-28 -38 -26 -40 -22 -40Z');
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.save(); x.translate(2, 4); x.fill(d); x.restore();
    x.fillStyle = '#4c5e4a'; x.fill(d); x.lineWidth = 4; x.strokeStyle = '#0a0c0a'; x.stroke(d);
    x.save(); x.clip(d); x.fillStyle = 'rgba(255,255,230,0.12)'; x.fillRect(-28, -40, 14, 80); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(14, -40, 14, 80); x.restore();
    x.fillStyle = '#2a3428'; x.beginPath(); x.arc(0, -16, 12, 0, TAU); x.fill(); // porthole rim
    const pg = x.createRadialGradient(-3, -19, 1, 0, -16, 10); pg.addColorStop(0, '#f2f4e0'); pg.addColorStop(1, '#8ab4c8'); x.fillStyle = pg; x.beginPath(); x.arc(0, -16, 8.5, 0, TAU); x.fill();
    x.strokeStyle = '#c8a860'; x.lineWidth = 3; x.beginPath(); x.arc(0, -16, 11, 0, TAU); x.stroke();
    x.fillStyle = '#c8a860'; x.strokeStyle = '#0a0c0a'; x.lineWidth = 2; x.beginPath(); x.roundRect(14, 2, 8, 18, 3); x.fill(); x.stroke(); // the handle
    if (!o.noArrow) x.fillStyle = '#e8dcb8'; if (!o.noArrow) x.beginPath(); if (o.noArrow) return; x.moveTo(-20, 22); x.lineTo(-8, 14); x.lineTo(-8, 19); x.lineTo(4, 19); x.lineTo(4, 25); x.lineTo(-8, 25); x.lineTo(-8, 30); x.closePath(); x.fill(); // an arrow out
  },
  // settings: a cog of old bronze, green with verdigris in its teeth, a bolt through it
  gear(x) {
    x.save(); x.rotate(0.15);
    const teeth = 9, r0 = 30, r1 = 40;
    const p = new Path2D();
    for (let i = 0; i < teeth * 2; i++) { const a0 = i / (teeth * 2) * TAU, a1 = (i + 1) / (teeth * 2) * TAU, rr = i % 2 ? r0 : r1, pd = i % 2 ? 0 : 0.05; const pt = (a, r) => [Math.cos(a) * r, Math.sin(a) * r]; const [ax, ay] = pt(a0 + pd, rr), [bx, by] = pt(a1 - pd, rr); if (i) p.lineTo(ax, ay); else p.moveTo(ax, ay); p.lineTo(bx, by); }
    p.closePath(); p.moveTo(13, 0); p.arc(0, 0, 13, 0, TAU, true);
    x.lineWidth = 5; x.strokeStyle = '#0c0a06'; x.stroke(p); x.fillStyle = '#8a6a3c'; x.fill(p, 'evenodd');
    x.save(); x.clip(p, 'evenodd'); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-50, 4, 100, 50); x.fillStyle = 'rgba(255,236,190,0.22)'; x.fillRect(-50, -50, 100, 24);
    x.fillStyle = 'rgba(80,150,120,0.55)'; for (const [a, b, r] of [[20, 26, 7], [-28, 18, 6], [30, -12, 5], [-10, -32, 5]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
    x.restore();
    x.fillStyle = '#4c3c24'; x.strokeStyle = '#0c0a06'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill(); x.stroke();
    x.strokeStyle = '#0c0a06'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-5, 0); x.lineTo(5, 0); x.stroke();
    x.restore();
  },
  // the bag: a canvas dive bag, its buckled flap and a strap. (5.6.8) Pale washed khaki with a dark outline and
  // bright buckles, so it stands off the coin's dark face instead of brown on brown
  bag(x) {
    x.lineJoin = 'round';
    x.strokeStyle = '#0c0b08'; x.lineWidth = 7; x.beginPath(); x.moveTo(-16, -22); x.bezierCurveTo(-16, -44, 16, -44, 16, -22); x.stroke(); x.strokeStyle = '#8a7a52'; x.lineWidth = 3.6; x.stroke(); // the handle
    const b = new Path2D('M-30 -22H30C34 -22 36 -19 36 -15V34C36 40 32 42 28 42H-28C-32 42 -36 40 -36 34V-15C-36 -19 -34 -22 -30 -22Z');
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.save(); x.translate(2, 5); x.fill(b); x.restore();
    x.fillStyle = '#b4a678'; x.fill(b);
    x.save(); x.clip(b); x.fillStyle = 'rgba(40,30,10,0.32)'; x.fillRect(-40, 22, 80, 30); x.fillStyle = 'rgba(255,250,225,0.22)'; x.fillRect(-40, -22, 80, 8);
    x.strokeStyle = 'rgba(60,50,20,0.16)'; x.lineWidth = 0.8; for (let k = -36; k < 40; k += 3) { x.beginPath(); x.moveTo(k, -22); x.lineTo(k, 42); x.stroke(); } x.restore(); // the weave
    x.lineWidth = 4.6; x.strokeStyle = '#0c0b08'; x.stroke(b);
    const flap = new Path2D('M-34 -18H34V6C34 10 30 12 26 12H-26C-30 12 -34 10 -34 6Z');
    x.fillStyle = '#968a5e'; x.fill(flap); x.strokeStyle = '#0c0b08'; x.lineWidth = 3; x.stroke(flap);
    x.strokeStyle = 'rgba(40,32,16,0.55)'; x.lineWidth = 1.2; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(-30, 7); x.lineTo(30, 7); x.stroke(); x.setLineDash([]); // stitching
    for (const sx of [-16, 16]) { x.fillStyle = '#3a3020'; x.fillRect(sx - 4, 2, 8, 24); x.fillStyle = '#e0c47a'; x.strokeStyle = '#0c0b08'; x.lineWidth = 2.2; x.beginPath(); x.roundRect(sx - 7, 12, 14, 10, 2); x.fill(); x.stroke(); x.fillStyle = '#0c0b08'; x.fillRect(sx - 1.2, 13.5, 2.4, 7); }
  },
  // the quests: the Margaret's log, a worn hardback tied shut with string, a page-marker sticking out
  quest(x) {
    // (5.6.6) the quests: a work order on a sheet of damp paper, hung on a nail through its corner, a list down it
    // in pencil and two items ticked off
    x.save(); x.rotate(0.06);
    const sh = new Path2D('M-28 -38L30 -36L32 40L-30 42Z');
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.save(); x.translate(3, 4); x.fill(sh); x.restore();
    x.fillStyle = '#ded3b4'; x.fill(sh); x.strokeStyle = '#100c08'; x.lineWidth = 2.6; x.stroke(sh);
    x.save(); x.clip(sh); x.fillStyle = 'rgba(120,90,50,0.22)'; x.beginPath(); x.arc(18, 28, 14, 0, TAU); x.arc(-22, -24, 9, 0, TAU); x.fill(); x.restore(); // stains
    x.fillStyle = '#2a1e12'; x.fillRect(-28, -38, 58, 9); x.fillStyle = '#ded3b4'; x.font = 'bold 7px sans-serif'; // a printed head band
    x.strokeStyle = 'rgba(222,211,180,0.8)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-20, -34); x.lineTo(10, -34); x.stroke();
    for (let k = 0; k < 4; k++) { const y = -18 + k * 14;
      x.strokeStyle = '#3a2c1e'; x.lineWidth = 1.6; x.strokeRect(-20, y - 4, 8, 8); // a box
      x.strokeStyle = 'rgba(50,40,30,0.7)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(-6, y); x.lineTo(20 - (k % 2) * 8, y); x.stroke(); // the line of pencil
      if (k < 2) { x.strokeStyle = '#a02a20'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-21, y - 1); x.lineTo(-17, y + 4); x.lineTo(-9, y - 8); x.stroke(); } } // ticked
    // the nail through the corner
    x.fillStyle = '#5a5850'; x.strokeStyle = '#0c0b08'; x.lineWidth = 2; x.beginPath(); x.arc(-22, -30, 4, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(160,80,40,0.6)'; x.beginPath(); x.arc(-20, -26, 3, 0, TAU); x.fill(); // rust run from it
    x.restore();
  },
  // (5.6.8) the journal: an open field notebook seen from above, its two cream pages the lightest thing on the coin
  // (so it reads at a glance on a dark face), a fish sketched on the left page, lines of pencil on the right, the dark
  // leather cover showing round it and a red ribbon hanging from the spine
  journal(x) {
    // (5.13.0) a closed field logbook, cloth-bound, seen a little turned: an olive cover worn pale at the corners, raised
    // bands across the spine, an elastic strap, the cream page block showing at the fore-edge and foot, and a frayed red
    // ribbon hanging out. Drawn, no lettering
    x.save(); x.rotate(-0.12); x.lineJoin = 'round';
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.roundRect(-30, -38, 66, 82, 6); x.fill(); // its shadow
    x.fillStyle = '#e4d8b8'; x.beginPath(); x.moveTo(-28, 36); x.lineTo(34, 36); x.lineTo(38, 30); x.lineTo(38, -36); x.lineTo(32, -40); x.lineTo(32, 32); x.closePath(); x.fill(); // the page block
    x.strokeStyle = 'rgba(120,104,72,0.6)'; x.lineWidth = 0.8; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(33 + i * 0.8, -38 + i); x.lineTo(33 + i * 0.8, 33 - i * 0.4); x.stroke(); }
    const cov = new Path2D('M-34 -42H28Q32 -42 32 -38V30Q32 34 28 34H-34Z');
    const cg = x.createLinearGradient(-34, -42, 32, 34); cg.addColorStop(0, '#5a6440'); cg.addColorStop(0.5, '#3e4a2c'); cg.addColorStop(1, '#2a321e');
    x.fillStyle = cg; x.fill(cov); x.lineWidth = 3; x.strokeStyle = '#10140a'; x.stroke(cov);
    x.save(); x.clip(cov); x.strokeStyle = 'rgba(255,255,240,0.05)'; x.lineWidth = 1; for (let i = -80; i < 80; i += 3) { x.beginPath(); x.moveTo(i, -42); x.lineTo(i + 40, 34); x.stroke(); } x.restore(); // the cloth's weave
    for (const [cx, cy] of [[28, -38], [28, 30]]) { x.fillStyle = 'rgba(190,180,140,0.45)'; x.beginPath(); x.arc(cx, cy, 5, 0, TAU); x.fill(); } // corners worn pale
    x.fillStyle = '#26301a'; x.fillRect(-34, -42, 12, 76); for (const yy of [-30, -6, 18]) { x.fillStyle = 'rgba(255,255,230,0.12)'; x.fillRect(-34, yy, 12, 3); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-34, yy + 3, 12, 2); } // the spine and its bands
    x.fillStyle = '#16180f'; x.fillRect(16, -42, 6, 76); x.fillStyle = 'rgba(255,255,240,0.1)'; x.fillRect(16, -42, 1.5, 76); // the strap
    x.fillStyle = '#9a2a1e'; x.strokeStyle = '#2a0806'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-6, 34); x.lineTo(0, 34); x.lineTo(1, 48); x.lineTo(-2.5, 45); x.lineTo(-6, 49); x.closePath(); x.fill(); x.stroke(); // the ribbon
    x.restore();
  },
  // the chart: a sea chart, half unrolled, its contours and a red mark
  chart(x) {
    // (5.6.6) a chart: an aged sheet, its coast and islands inked brown, the soundings, a compass rose, a dotted course
    // to a red cross
    x.save(); x.rotate(-0.08);
    const sh = new Path2D('M-42 -30L40 -32L42 30L-40 32Z');
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.save(); x.translate(3, 4); x.fill(sh); x.restore();
    x.fillStyle = '#d8c89c'; x.fill(sh); x.strokeStyle = '#100c08'; x.lineWidth = 2.6; x.stroke(sh);
    x.save(); x.clip(sh);
    x.fillStyle = 'rgba(80,120,130,0.35)'; x.fillRect(-50, -40, 100, 80); // the sea, washed in
    x.fillStyle = '#c8b480'; x.strokeStyle = '#5a3c20'; x.lineWidth = 1.6;
    const land = new Path2D('M-44 -34L-10 -34C-14 -22 -26 -18 -30 -6C-34 4 -40 8 -44 10Z'); x.fill(land); x.stroke(land); // the coast
    const isl = new Path2D('M10 4C16 -2 26 0 26 8C24 14 14 14 10 10Z'); x.fill(isl); x.stroke(isl); // an island
    x.strokeStyle = 'rgba(40,60,80,0.45)'; x.lineWidth = 0.9; for (const k of [5, 10]) { x.beginPath(); x.moveTo(-44, 10 + k); x.bezierCurveTo(-30, 6 + k, -24, -14 + k, -8, -34 + k * 0.4); x.stroke(); } // depth lines
    x.fillStyle = 'rgba(40,40,60,0.6)'; for (const [a, b] of [[-4, 14], [4, 22], [-16, 24], [32, -18]]) { x.beginPath(); x.arc(a, b, 0.9, 0, TAU); x.fill(); } // soundings
    x.strokeStyle = '#5a2a18'; x.lineWidth = 1.6; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(-26, 2); x.bezierCurveTo(-10, 20, 4, 24, 20, 22); x.stroke(); x.setLineDash([]); // the course
    x.strokeStyle = '#a02a20'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(17, 19); x.lineTo(24, 26); x.moveTo(24, 19); x.lineTo(17, 26); x.stroke(); // the cross
    // the compass rose
    x.save(); x.translate(28, -18); x.fillStyle = '#3a2a1a';
    x.beginPath(); x.moveTo(0, -10); x.lineTo(2, 0); x.lineTo(0, 10); x.lineTo(-2, 0); x.closePath(); x.fill(); x.beginPath(); x.moveTo(-10, 0); x.lineTo(0, 2); x.lineTo(10, 0); x.lineTo(0, -2); x.closePath(); x.fill();
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 0.8; x.beginPath(); x.arc(0, 0, 6, 0, TAU); x.stroke(); x.fillStyle = '#a02a20'; x.beginPath(); x.moveTo(0, -10); x.lineTo(2, 0); x.lineTo(-2, 0); x.fill(); x.restore();
    x.restore();
    x.fillStyle = 'rgba(90,60,30,0.25)'; x.beginPath(); x.moveTo(40, -32); x.lineTo(42, -20); x.lineTo(30, -32); x.fill(); // a torn corner
    x.restore();
  },
  // a spare cylinder: scuffed steel, its valve and a pressure gauge
  air(x) {
    x.save(); x.rotate(-0.5);
    x.fillStyle = '#0b0c0c'; x.beginPath(); x.roundRect(-14, -30, 28, 70, 13); x.fill();
    const cg = x.createLinearGradient(-12, 0, 12, 0); cg.addColorStop(0, '#5a6266'); cg.addColorStop(0.35, '#a8b2b6'); cg.addColorStop(1, '#3a4044');
    x.fillStyle = cg; x.beginPath(); x.roundRect(-11.5, -27, 23, 64, 11); x.fill();
    x.fillStyle = '#d8c060'; x.fillRect(-11.5, -14, 23, 4);
    x.fillStyle = '#2a2e30'; x.strokeStyle = '#0b0c0c'; x.lineWidth = 2; x.beginPath(); x.roundRect(-5, -40, 10, 12, 2); x.fill(); x.stroke();
    x.fillStyle = '#d8d8cc'; x.beginPath(); x.arc(10, -38, 6, 0, TAU); x.fill(); x.stroke(); x.strokeStyle = '#c8402e'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(10, -38); x.lineTo(13, -41); x.stroke();
    x.restore();
  },
  // the trawl: a bundle of net, corks strung along its head-rope
  trawl(x) {
    const b = new Path2D('M-40 -10C-30 -24 10 -26 40 -14C44 4 30 30 0 34C-26 32 -44 14 -40 -10Z');
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fill(b); x.save(); x.clip(b); x.strokeStyle = 'rgba(140,170,120,0.85)'; x.lineWidth = 1.4;
    x.beginPath(); for (let c = -90; c < 90; c += 8) { x.moveTo(c - 30, -30); x.lineTo(c + 60, 60); x.moveTo(c + 60, -30); x.lineTo(c - 30, 60); } x.stroke(); x.restore();
    x.strokeStyle = '#0b0a08'; x.lineWidth = 2.4; x.stroke(b);
    x.strokeStyle = '#c8b890'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-40, -10); x.bezierCurveTo(-30, -24, 10, -26, 40, -14); x.stroke();
    for (let k = 0; k < 5; k++) { const t = k / 4, px = -38 + t * 76, py = -12 - Math.sin(t * Math.PI) * 9; x.fillStyle = '#c87a30'; x.strokeStyle = '#0b0a08'; x.lineWidth = 1.8; x.beginPath(); x.ellipse(px, py, 5, 3.6, 0, 0, TAU); x.fill(); x.stroke(); }
  },
  // selling: a canvas purse, open, coins spilling from it
  sell(x) {
    x.fillStyle = '#5a4a30'; x.strokeStyle = '#0b0a08'; x.lineWidth = 3; x.beginPath(); x.moveTo(-26, -6); x.quadraticCurveTo(-34, 34, 0, 36); x.quadraticCurveTo(34, 34, 26, -6); x.quadraticCurveTo(0, -16, -26, -6); x.fill(); x.stroke();
    x.strokeStyle = '#c8b890'; x.lineWidth = 2; x.beginPath(); x.moveTo(-26, -6); x.quadraticCurveTo(0, 4, 26, -6); x.stroke();
    for (const [a, b] of [[-14, -18], [4, -22], [20, -14], [32, 20], [24, 34]]) { x.fillStyle = '#d8b040'; x.strokeStyle = '#3a2a08'; x.lineWidth = 1.8; x.beginPath(); x.ellipse(a, b, 8, 6, 0.3, 0, TAU); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,240,180,0.6)'; x.beginPath(); x.ellipse(a - 2, b - 2, 3, 1.6, 0.3, 0, TAU); x.fill(); }
  },
  // (6.1.4) the hand, by what it will do. A boarding ladder: two weathered steel rails and their rungs, wet, a hook over the top
  ladder(x) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.save(); x.translate(2, 3); x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 8; x.beginPath(); x.moveTo(-15, -30); x.lineTo(-15, 40); x.moveTo(15, -30); x.lineTo(15, 40); x.stroke(); x.restore();
    for (const sx of [-15, 15]) { // the rails, hooked over the gunwale at the top
      x.strokeStyle = '#0b0c0a'; x.lineWidth = 9; x.beginPath(); x.moveTo(sx, 42); x.lineTo(sx, -28); x.quadraticCurveTo(sx, -40, sx + 10, -40); x.lineTo(sx + 12, -34); x.stroke();
      x.strokeStyle = '#8a8a7c'; x.lineWidth = 5.4; x.stroke(); x.strokeStyle = 'rgba(255,250,230,0.35)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(sx - 1.4, 40); x.lineTo(sx - 1.4, -27); x.stroke();
    }
    for (let k = 0; k < 5; k++) { const y = -18 + k * 13; x.strokeStyle = '#0b0c0a'; x.lineWidth = 7; x.beginPath(); x.moveTo(-15, y); x.lineTo(15, y); x.stroke(); x.strokeStyle = k % 2 ? '#7a7a6c' : '#86846f'; x.lineWidth = 3.6; x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-13, y + 1.2); x.lineTo(13, y + 1.2); x.stroke(); } // the rungs, treads worn bright
    x.fillStyle = 'rgba(130,70,30,0.5)'; for (const [a, b] of [[-15, 8], [15, -6], [15, 30], [-15, 34]]) { x.beginPath(); x.ellipse(a, b, 2.4, 5, 0, 0, TAU); x.fill(); } // rust where the paint went
    x.fillStyle = 'rgba(190,220,230,0.5)'; for (const [a, b] of [[-15, 44], [15, 46], [2, 33]]) { x.beginPath(); x.ellipse(a, b, 1.6, 2.6, 0, 0, TAU); x.fill(); } // dripping
  },
  // the winch's basket, hanging from its hook on the wire: a wicker-and-net cradle the catch goes up in
  basket(x) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#0b0c0a'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, -48); x.lineTo(0, -32); x.stroke(); x.strokeStyle = '#9a9a8a'; x.lineWidth = 2; x.stroke(); // the wire
    x.strokeStyle = '#0b0c0a'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, -32); x.lineTo(0, -26); x.arc(-4, -22, 4, -0.2, Math.PI * 0.9); x.stroke(); x.strokeStyle = '#6a6a5e'; x.lineWidth = 3.4; x.stroke(); // the hook
    x.strokeStyle = '#1a1712'; x.lineWidth = 2.6; for (const sx of [-26, -9, 9, 26]) { x.beginPath(); x.moveTo(-4, -20); x.lineTo(sx, -2); x.stroke(); } x.strokeStyle = '#a8946a'; x.lineWidth = 1.2; for (const sx of [-26, -9, 9, 26]) { x.beginPath(); x.moveTo(-4, -20); x.lineTo(sx, -2); x.stroke(); } // the bridle ropes
    const b = new Path2D('M-30 -3H30L25 34C24 38 21 40 17 40H-17C-21 40 -24 38 -25 34Z');
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.save(); x.translate(2, 3); x.fill(b); x.restore();
    x.fillStyle = '#6a5636'; x.fill(b); x.save(); x.clip(b);
    for (let y = 2; y < 42; y += 6) { x.fillStyle = y % 12 ? '#7c6640' : '#5e4c2e'; x.fillRect(-32, y, 64, 4); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-32, y + 3.6, 64, 1.2); } // the woven bands
    x.strokeStyle = 'rgba(30,24,14,0.7)'; x.lineWidth = 2; for (let k = -24; k <= 24; k += 8) { x.beginPath(); x.moveTo(k, -3); x.lineTo(k * 0.86, 42); x.stroke(); } // its uprights
    x.fillStyle = 'rgba(255,240,200,0.1)'; x.fillRect(-32, -3, 18, 46); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(14, -3, 18, 46); x.restore();
    x.lineWidth = 3.4; x.strokeStyle = '#0b0c0a'; x.stroke(b);
    x.strokeStyle = '#2a2418'; x.lineWidth = 5; x.beginPath(); x.moveTo(-31, -3); x.lineTo(31, -3); x.stroke(); x.strokeStyle = '#8a7650'; x.lineWidth = 2.4; x.stroke(); // the rim
    x.fillStyle = '#7a8a8a'; x.strokeStyle = '#0b0c0a'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(10, -7, 9, 3.5, -0.2, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#8a6a5a'; x.beginPath(); x.ellipse(-8, -6, 7, 3, 0.3, 0, TAU); x.fill(); x.stroke(); // a fish's tail and back over the rim
  },
  // the sub's hatch, seen from above on her conning tower: a round lid of olive steel on its hinge, the handwheel on it
  hatch(x) {
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.arc(2, 4, 38, 0, TAU); x.fill();
    x.fillStyle = '#3e4232'; x.strokeStyle = '#0b0c09'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 38, 0, TAU); x.fill(); x.stroke(); // the coaming
    x.fillStyle = 'rgba(20,20,14,0.7)'; for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; x.beginPath(); x.arc(Math.cos(a) * 33, Math.sin(a) * 33, 1.6, 0, TAU); x.fill(); } // its bolts
    const lg = x.createRadialGradient(-8, -10, 2, 0, 0, 28); lg.addColorStop(0, '#6e7452'); lg.addColorStop(1, '#40452f');
    x.fillStyle = lg; x.beginPath(); x.arc(0, 0, 27, 0, TAU); x.fill(); x.strokeStyle = '#0b0c09'; x.lineWidth = 3; x.stroke(); // the lid
    x.strokeStyle = 'rgba(255,250,220,0.22)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 24, Math.PI * 1.05, Math.PI * 1.7); x.stroke();
    x.fillStyle = '#2e3224'; x.strokeStyle = '#0b0c09'; x.lineWidth = 2; x.beginPath(); x.roundRect(22, -8, 14, 16, 3); x.fill(); x.stroke(); // the hinge
    x.lineCap = 'round'; x.strokeStyle = '#0b0c09'; x.lineWidth = 6.5; x.beginPath(); x.arc(0, 0, 14, 0, TAU); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.3; x.moveTo(0, 0); x.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); } x.stroke(); // the handwheel
    x.strokeStyle = '#a8946a'; x.lineWidth = 3.4; x.beginPath(); x.arc(0, 0, 14, 0, TAU); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.3; x.moveTo(0, 0); x.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); } x.stroke();
    x.fillStyle = '#a8946a'; x.strokeStyle = '#0b0c09'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(130,70,30,0.45)'; for (const [a, b] of [[-20, 14], [16, 18], [-6, -24]]) { x.beginPath(); x.ellipse(a, b, 4, 2.4, 0.5, 0, TAU); x.fill(); } // rust in the paint
  },
  // the cabin door from the deck: the door alone, no arrow (going in)
  cabin(x) { ART.door(x, { noArrow: true }); },
  // the pet: a small painted fish, turned towards you
  pet(x) {
    x.fillStyle = '#c86a3a'; x.strokeStyle = '#120c08'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(-32, 0); x.bezierCurveTo(-20, -24, 22, -22, 34, 0); x.bezierCurveTo(22, 22, -20, 24, -32, 0); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-28, 0); x.lineTo(-46, -16); x.lineTo(-42, 0); x.lineTo(-46, 16); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,230,200,0.25)'; x.beginPath(); x.ellipse(0, -8, 22, 6, 0, 0, TAU); x.fill();
    x.fillStyle = '#f4f0e0'; x.beginPath(); x.arc(20, -4, 6, 0, TAU); x.fill(); x.stroke(); x.fillStyle = '#0a0806'; x.beginPath(); x.arc(21, -4, 3, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1.4; for (const k of [-10, 0]) { x.beginPath(); x.moveTo(k, -14); x.quadraticCurveTo(k + 4, 0, k, 14); x.stroke(); }
  },
};

// (5.8.0) the ability buttons: the family's emblem on the coin (its face tinted by the scroll's rarity)
for (const f of ABILITY_FAMILIES) ART['ab_' + f] = (x, look) => { // (5.9.0) the scroll's own emblem for its tier, painted on the coin
  const tier = (look && look.tier) || 'rare', m = drawTierEmblemMask(f, tier, 220), col = tier === 'legendary' ? '#d8b066' : (ACCENT[f] || '#e8e0c8');
  const tint = (c0) => { const c = document.createElement('canvas'); c.width = c.height = m.width; const t = c.getContext('2d'); t.drawImage(m, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = c0; t.fillRect(0, 0, c.width, c.height); return c; };
  void tint; void col;
  if (paintAbility(x, f, tier)) return; // (5.16.0) every skill painted, its tier told by craft (coin_art.js)
  void paintSprint;
  paintMask(x, m, tier === 'legendary'); // (5.15.6) the others' emblems in lit bone (bronze for a legendary), larger
};
for (const [k, f] of Object.entries(PAINTED)) ART[k] = (x, look) => { x.save(); if (k === 'dive') { x.translate(0, 6); x.scale(1.08, 1.08); } else x.scale(1.32, 1.32); f(x, look); x.restore(); }; // (5.15.6) the glove, the claw, the hatch and the dive painted as objects (coin_art.js), filling the coin

// the face for button `kind` (the art, if drawn here; else its symbol in bone), radius r, state 'on' | 'off' | 'down' | 'lit'
// (5.6.9) a tool's coin tinted by its rarity: dark, muddy versions of the rarity colours (they sit in the olive and
// bronze, not app-bright), and a thin lip in the rarity's own colour
const TINT = { common: [110, 8, 13], uncommon: [112, 26, 13], rare: [208, 30, 14], exotic: [276, 22, 14], legendary: [36, 40, 13] };
const TINT_LIP = { common: 'rgba(201,205,196,0.35)', uncommon: 'rgba(110,170,112,0.45)', rare: 'rgba(80,140,200,0.45)', exotic: 'rgba(160,110,200,0.45)', legendary: 'rgba(190,146,70,0.55)' }; // (5.10.8) the rarity's rim, muted
export function drawCoin(ctx, cx, cy, r, kind, state = 'on', look = null, tint = null) {
  const lk = look && typeof look === 'object' ? (look.id || JSON.stringify(look).slice(0, 40)) : String(look ?? '');
  const key = `${kind}|${state}|${Math.round(r * 2)}|${lk}|${tint || ''}`;
  let t = cache.get(key);
  if (!t) {
    const R = Math.round(r * 2) / 2, pad = Math.ceil(R * 0.14) + 2, size = Math.ceil(R * 2 + pad * 2), c = document.createElement('canvas');
    c.width = c.height = size; const x = c.getContext('2d'); x.translate(size / 2, size / 2);
    // its shadow on the water
    x.fillStyle = 'rgba(0,0,0,0.32)'; x.beginPath(); x.arc(0, R * 0.08, R * 1.03, 0, TAU); x.fill();
    face(x, R, (tint && TINT[tint]) || HUE[kind] || [190, 20, 13], kind.length * 31 + 7);
    // a soft light behind the art
    const gl = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.7); gl.addColorStop(0, 'rgba(230,236,220,0.13)'); gl.addColorStop(1, 'rgba(230,236,220,0)');
    x.fillStyle = gl; x.beginPath(); x.arc(0, 0, R * 0.7, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, R * 0.9, 0, TAU); x.clip();
    if (look && look.pic) { const bl = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.8); bl.addColorStop(0, 'rgba(226,214,180,0.2)'); bl.addColorStop(1, 'rgba(226,214,180,0)'); x.fillStyle = bl; x.beginPath(); x.arc(0, 0, R * 0.8, 0, TAU); x.fill(); // a little more light behind a dark net // (5.17.0) the tool he has on, drawn from its own shop picture: turned on the diagonal, its business end filling the coin
      const P0 = look.pic, k = (R * 1.5) / P0.span; x.save(); x.rotate(P0.rot); x.scale(k, k); x.translate(-P0.fx, -P0.fy);
      x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 3 / k * R / 30; x.filter = 'brightness(1.3) contrast(1.15)'; x.drawImage(P0.c, 0, 0); x.filter = 'none'; x.restore(); } // lifted, so a dark net stands off its coin
    else if (ART[kind]) { const k = R * 0.66 / 50; x.save(); x.scale(k, k); ART[kind](x, look || {}); x.restore(); }
    else drawGlyph(x, kind, 0, 0, R * 0.95);
    x.restore();
    if (state === 'off') { x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.6; x.fillStyle = '#808080'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = 'rgba(6,8,8,0.34)'; x.fill(); } // (5.16.7) greyer and darker: opaque now, so this alone says 'not now'
    if (state === 'down') { x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); }
    // (5.7.0) pressed: the face lights up and its colours deepen, as if a lamp came on behind it
    if (state === 'press') { x.save(); x.beginPath(); x.arc(0, 0, R * 0.95, 0, TAU); x.clip(); x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.35; x.fillStyle = 'hsl(40,100%,50%)'; x.fill(); x.globalCompositeOperation = 'screen'; x.globalAlpha = 1;
      const pg = x.createRadialGradient(0, 0, 0, 0, 0, R); pg.addColorStop(0, 'rgba(255,240,205,0.24)'); pg.addColorStop(0.7, 'rgba(255,230,180,0.08)'); pg.addColorStop(1, 'rgba(255,230,180,0.16)'); /* (5.10.8) softer */ x.fillStyle = pg; x.fillRect(-R, -R, R * 2, R * 2); x.restore(); }
    lip(x, R, state === 'press' ? 'lit' : state);
    if (tint && TINT_LIP[tint] && state !== 'off') { x.lineWidth = R * 0.03; x.strokeStyle = TINT_LIP[tint]; x.beginPath(); x.arc(0, 0, R * 0.955, 0, TAU); x.stroke(); }
    t = { c, half: size / 2 }; cache.set(key, t); if (cache.size > 320) cache.delete(cache.keys().next().value);
  }
  if (state === 'press') { const k = 0.92, hh = t.half * k; ctx.drawImage(t.c, cx - hh, cy - hh + r * 0.05, hh * 2, hh * 2); return; } // (5.7.0) pressed in: smaller and a little lower
  ctx.drawImage(t.c, cx - t.half, cy - t.half + (state === 'down' ? r * 0.04 : 0));
}
export const COIN_ART = Object.keys(ART);

// (5.6.2) a coin as a picture, for the page's own buttons (the quest group's)
export function coinURL(kind, px = 112, state = 'on') {
  const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d');
  drawCoin(x, px / 2, px / 2, px * 0.43, kind, state); return c.toDataURL('image/png');
}

// (5.6.8) the money in the top left: a painted stack of old banknotes held by a paper band, no coin round it (only
// buttons have coins). Drawn once per size and reused
const cashCache = new Map();
export function drawCash(ctx, cx, cy, h) {
  const key = Math.round(h * 2);
  let c = cashCache.get(key);
  if (!c) {
    const W = Math.ceil(h * 1.6), H = Math.ceil(h * 1.2); c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), k = h / 60; x.translate(W / 2, H / 2); x.scale(k, k); x.lineJoin = 'round';
    const ink = '#0d100a';
    // one bundle: its top face (the top note) and its side (the edges of the notes under it)
    const bundle = (ox, oy, rot, face) => {
      x.save(); x.translate(ox, oy); x.rotate(rot);
      const w = 66, d = 30, t = 9; // width, depth on screen, thickness
      // the side: layered edges
      x.fillStyle = '#c5c9a4'; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.lineTo(w / 2, t); x.lineTo(-w / 2, t); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(70,84,52,0.75)'; x.lineWidth = 0.9; for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(-w / 2, i * t / 5); x.lineTo(w / 2, i * t / 5); x.stroke(); }
      x.strokeStyle = ink; x.lineWidth = 2.4; x.strokeRect(-w / 2, 0, w, t);
      // the top note
      const top = new Path2D(`M${-w / 2} 0L${-w / 2 + 8} ${-d}L${w / 2 + 8} ${-d}L${w / 2} 0Z`);
      x.fillStyle = face; x.fill(top);
      x.save(); x.clip(top);
      x.strokeStyle = 'rgba(20,34,16,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-w / 2 + 6, -3); x.lineTo(-w / 2 + 12, -d + 3); x.lineTo(w / 2 + 2, -d + 3); x.lineTo(w / 2 - 4, -3); x.closePath(); x.stroke(); // the printed border
      x.fillStyle = 'rgba(222,230,196,0.55)'; x.beginPath(); x.ellipse(4, -d / 2, 9, 9, 0, 0, TAU); x.fill(); // the portrait's oval
      x.strokeStyle = 'rgba(20,34,16,0.6)'; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = 'rgba(30,44,24,0.5)'; x.beginPath(); x.arc(4, -d / 2 - 1, 3.4, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,230,0.14)'; x.fillRect(-w / 2, -d, w + 10, 8); // light along the far edge
      x.restore();
      x.strokeStyle = ink; x.lineWidth = 2.4; x.stroke(top);
      // the paper band round the middle
      x.fillStyle = '#ddd0a6'; x.beginPath(); x.moveTo(-10, t); x.lineTo(-10, 0); x.lineTo(-6, -d); x.lineTo(6, -d); x.lineTo(2, 0); x.lineTo(2, t); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(120,80,40,0.8)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-4, t); x.lineTo(-4, 0); x.lineTo(0, -d); x.stroke();
      x.strokeStyle = ink; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-10, t); x.lineTo(-10, 0); x.lineTo(-6, -d); x.moveTo(6, -d); x.lineTo(2, 0); x.lineTo(2, t); x.stroke();
      x.restore();
    };
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(2, 27, 44, 7, 0, 0, TAU); x.fill(); // its shadow
    bundle(-4, 22, 0, '#5f7b4f');
    bundle(2, 10, -0.04, '#67845a');
    bundle(-2, -2, 0.07, '#6f8c5e');
    cashCache.set(key, c);
  }
  ctx.drawImage(c, cx - c.width / 2, cy - c.height / 2);
}

// (5.15.7) the menu's tiles: the same worn paint and the same pictures as the coins, on a square with rounded corners
// (smaller than a coin for the same reach, so the menu down the left takes less of the screen)
export function drawTile(ctx, cx, cy, h, kind, state = 'on', badge = false) {
  const key = `tile|${kind}|${state}|${Math.round(h * 2)}`;
  let t = cache.get(key);
  if (!t) {
    const H2 = Math.round(h * 2) / 2, pad = Math.ceil(H2 * 0.16) + 2, size = Math.ceil(H2 * 2 + pad * 2), c = document.createElement('canvas');
    c.width = c.height = size; const x = c.getContext('2d'); x.translate(size / 2, size / 2);
    const rr = H2 * 0.34, plate = () => { x.beginPath(); x.roundRect(-H2, -H2, H2 * 2, H2 * 2, rr); };
    x.fillStyle = 'rgba(0,0,0,0.32)'; x.beginPath(); x.roundRect(-H2, -H2 + H2 * 0.1, H2 * 2, H2 * 2, rr); x.fill(); // its shadow on the water
    const [hh, ss, l0] = HUE[kind], l = l0 + 4, g = x.createLinearGradient(-H2, -H2, H2, H2);
    g.addColorStop(0, hsl(hh, ss + 6, l + 12)); g.addColorStop(0.55, hsl(hh, ss, l + 2)); g.addColorStop(1, hsl(hh, Math.max(0, ss - 10), Math.max(3, l - 9)));
    x.fillStyle = g; plate(); x.fill();
    const r = rnd(kind.length * 17 + 3); x.save(); plate(); x.clip();
    for (let i = 0; i < 70; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,244,220,0.045)' : 'rgba(0,0,0,0.06)'; x.beginPath(); x.ellipse((r() - 0.5) * H2 * 2, (r() - 0.5) * H2 * 2, H2 * (0.1 + r() * 0.12), H2 * 0.03, r() * Math.PI, 0, TAU); x.fill(); }
    if (kind === 'menu-open' || kind === 'menu-shut') { // the fold: a chevron pointing the way it will go
      const up = kind === 'menu-open'; x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = '#0c0b08'; x.lineWidth = H2 * 0.26; x.beginPath(); x.moveTo(-H2 * 0.42, up ? H2 * 0.18 : -H2 * 0.18); x.lineTo(0, up ? -H2 * 0.24 : H2 * 0.24); x.lineTo(H2 * 0.42, up ? H2 * 0.18 : -H2 * 0.18); x.stroke();
      x.strokeStyle = '#d8ceb0'; x.lineWidth = H2 * 0.14; x.stroke();
    } else if (ART[kind]) { const k = H2 * 0.78 / 50; x.save(); x.scale(k, k); ART[kind](x, {}); x.restore(); }
    else drawGlyph(x, kind, 0, 0, H2 * 1.1);
    x.restore();
    if (state === 'off') { x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.65; x.fillStyle = '#808080'; plate(); x.fill(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = 'rgba(0,0,0,0.25)'; plate(); x.fill(); }
    if (state === 'press') { x.fillStyle = 'rgba(255,236,200,0.16)'; plate(); x.fill(); }
    x.lineWidth = H2 * 0.09; x.strokeStyle = '#15130f'; plate(); x.stroke();
    x.lineWidth = H2 * 0.04; x.strokeStyle = 'rgba(190,172,132,0.35)'; x.beginPath(); x.moveTo(-H2 + rr, -H2 + H2 * 0.07); x.lineTo(H2 - rr, -H2 + H2 * 0.07); x.stroke(); // the top edge catching the light
    t = { c, half: size / 2 }; cache.set(key, t); if (cache.size > 320) cache.delete(cache.keys().next().value);
  }
  const k = state === 'press' ? 0.94 : 1, hh2 = t.half * k; ctx.drawImage(t.c, cx - hh2, cy - hh2 + (state === 'press' ? h * 0.04 : 0), hh2 * 2, hh2 * 2);
  if (badge) { const bx = cx + h * 0.82, by = cy - h * 0.82, br = Math.max(h * 0.36, 6); ctx.save(); ctx.fillStyle = '#c8402e'; ctx.strokeStyle = '#181a14'; ctx.lineWidth = br * 0.25; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6ea'; ctx.font = `700 ${br * 1.45}px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + br * 0.06); ctx.restore(); }
}
export function tileURL(kind, px = 112) { const c = document.createElement('canvas'); c.width = c.height = px; drawTile(c.getContext('2d'), px / 2, px / 2, px * 0.4, kind); return c.toDataURL('image/png'); }
