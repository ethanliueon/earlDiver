// (5.6) The touch buttons as painted coins, in the manner of a mobile RPG's skill buttons: a deep, muted face
// (darker to the rim, a soft light behind the art, brushed through), the art of the thing itself centred on it,
// and a worn dark lip. The art is drawn here at a size of its own (no flat symbols): the net and the camera from
// the player's own gear, the eye, the fins, the sub, the glove, the torch, the crab pot, the claw. Each look is
// painted once into a picture and reused.
import { drawGlyph } from './glyphs.js';

const TAU = Math.PI * 2;
const cache = new Map();
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// the face colour of each: muted, deep, telling the buttons apart at a glance
const HUE = {
  net: [100, 24, 15], eye: [186, 32, 13], sprint: [208, 26, 14], hand: [28, 26, 14], sub: [78, 18, 13], cam: [36, 38, 15],
  trap: [14, 32, 14], lamp: [34, 42, 14], claw: [200, 10, 14], leave: [78, 18, 13], tank: [190, 28, 13], auto: [78, 18, 13],
  trawl: [100, 24, 15], air: [200, 14, 14], sell: [44, 30, 14], lure: [186, 32, 13], glow: [140, 30, 12], pet: [186, 32, 13], swap: [60, 8, 12],
};

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
  x.lineWidth = R * 0.028; x.strokeStyle = state === 'lit' ? 'rgba(236,224,190,0.9)' : 'rgba(190,172,132,0.35)';
  if (state === 'lit') { x.beginPath(); x.arc(0, 0, R * 0.95, 0, TAU); x.stroke(); }
  else { x.beginPath(); x.arc(0, 0, R * 0.95, Math.PI * 1.12, Math.PI * 1.88); x.stroke(); }
}

// ---------------- the art, on a box of ±50 units ----------------
const ART = {
  // the head of the hand net, close: the hoop seen a little from above, the knotted bag hanging from it, the end of
  // the pole coming in from the lower left. Its colours are the player's own net's
  net(x, look) {
    const hoop = look.hoop || '#8c9496', meshC = look.mesh || 'rgba(92,140,96,0.9)', h = look.h || ['#c4cacb', '#8a9294', '#4a5254'];
    // the pole and its ferrule
    x.lineCap = 'round';
    x.strokeStyle = '#0d0f0e'; x.lineWidth = 11; x.beginPath(); x.moveTo(-46, 44); x.lineTo(-20, 14); x.stroke();
    x.strokeStyle = h[1]; x.lineWidth = 8; x.stroke();
    x.strokeStyle = h[0]; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-45, 40); x.lineTo(-21, 12); x.stroke();
    x.fillStyle = h[2]; x.save(); x.translate(-20, 13); x.rotate(-0.86); x.beginPath(); x.roundRect(-6, -6, 12, 12, 3); x.fill(); x.restore();
    // the bag: its far side first (seen through the hoop), then the near side
    const bag = new Path2D('M-14 -2C-16 16 -2 38 12 42C26 36 36 14 34 -8C26 4 -2 6 -14 -2Z');
    x.save(); x.translate(4, 4);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fill(bag);
    x.clip(bag);
    x.strokeStyle = meshC; x.lineWidth = 1.5;
    // a diamond mesh (lines at 45 degrees both ways, 8 apart) with a knot at every crossing
    x.beginPath(); for (let c = -90; c < 90; c += 8) { x.moveTo(c - 30, -30); x.lineTo(c + 60, 60); x.moveTo(c + 60, -30); x.lineTo(c - 30, 60); } x.stroke();
    x.fillStyle = meshC; for (let a = -90; a < 90; a += 8) for (let b = -90; b < 150; b += 8) { const kx = (a + b) / 2, ky = (b - a) / 2; if (kx > -25 && kx < 45 && ky > -15 && ky < 50) { x.beginPath(); x.arc(kx, ky, 1.25, 0, TAU); x.fill(); } } // the knots
    // the bag's depth: darker towards its bottom and its back
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.ellipse(14, 34, 22, 14, 0, 0, TAU); x.fill();
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1.2; x.save(); x.translate(4, 4); x.stroke(bag); x.restore();
    // the hoop: a dark edge, its metal, a bright line along its upper rim
    x.save(); x.translate(10, -10); x.rotate(-0.32);
    x.strokeStyle = '#0d0f0e'; x.lineWidth = 8.5; x.beginPath(); x.ellipse(0, 0, 28, 13, 0, 0, TAU); x.stroke();
    x.strokeStyle = hoop; x.lineWidth = 5.5; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(0, -1, 27, 12, 0, Math.PI * 1.1, Math.PI * 1.85); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(0, 1.2, 27, 12, 0, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
    x.restore();
    // a drop running off the bag
    x.fillStyle = 'rgba(210,235,240,0.55)'; x.beginPath(); x.ellipse(17, 47, 1.6, 2.4, 0, 0, TAU); x.fill();
  },
  // an underwater camera in its housing, in the colour of the player's own: moulded, not a box. Bevelled edges, two
  // grips with their rubber, the big port of the lens with its rings and a reflection, the strobe on its arm, screws
  cam(x, look) {
    const base = look && typeof look === 'object' ? look.base || 0 : look || 0;
    const body = (look && look.body) || ['#d6aa26', '#8a9296', '#2c3034'][base] || '#d6aa26', trim = (look && look.accent) || ['#2a2a26', '#a02a20', '#a02a20'][base] || '#2a2a26';
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
  sprint(x) {
    const fin = (tx, ty, rot, tone) => {
      x.save(); x.translate(tx, ty); x.rotate(rot);
      const blade = new Path2D('M-6 -9L40 -15C44 -15 46 -12 46 -8L46 8C46 12 44 15 40 15L-6 9Z');
      x.fillStyle = '#0c0e10'; x.save(); x.lineWidth = 4; x.strokeStyle = '#0c0e10'; x.stroke(blade); x.restore();
      x.fillStyle = tone; x.fill(blade);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(-6, -9); x.lineTo(40, -15); x.lineTo(40, -10); x.lineTo(-6, -5); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-4, -8); x.lineTo(44, -13); x.moveTo(-4, 8); x.lineTo(44, 13); x.stroke(); // the rails
      x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1; for (const k of [-4, 0, 4]) { x.beginPath(); x.moveTo(8, k * 0.8); x.lineTo(42, k * 1.6); x.stroke(); }
      x.fillStyle = '#16191b'; x.beginPath(); x.ellipse(-12, 0, 14, 11, 0, 0, TAU); x.fill(); // the foot pocket
      x.strokeStyle = '#0a0b0c'; x.lineWidth = 2.4; x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.14)'; x.beginPath(); x.ellipse(-14, -4, 8, 3, -0.2, 0, TAU); x.fill();
      x.restore();
    };
    fin(-10, -10, -0.38, '#2c4b62'); fin(-4, 12, 0.08, '#36586f');
    x.strokeStyle = 'rgba(210,235,240,0.7)'; x.lineWidth = 1.4;
    for (const [bx, by, br] of [[-38, -26, 4], [-44, -12, 2.6], [-40, 4, 3.2], [-46, 18, 2], [-36, 26, 2.6], [-48, -2, 1.6]]) { x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke(); }
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
  lamp(x) {
    const beam = x.createLinearGradient(4, 0, 50, 0); beam.addColorStop(0, 'rgba(255,214,140,0.55)'); beam.addColorStop(1, 'rgba(255,214,140,0)');
    x.fillStyle = beam; x.beginPath(); x.moveTo(6, -9); x.lineTo(50, -26); x.lineTo(50, 26); x.lineTo(6, 9); x.closePath(); x.fill();
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
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#0a0b0c'; x.lineWidth = 12; x.beginPath(); x.moveTo(-46, 12); x.lineTo(-14, 2); x.stroke();
    x.strokeStyle = '#6c7276'; x.lineWidth = 8; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-44, 8); x.lineTo(-14, -1); x.stroke();
    for (const s of [-1, 1]) {
      x.strokeStyle = '#0a0b0c'; x.lineWidth = 9; x.beginPath(); x.moveTo(-10, 2); x.quadraticCurveTo(14, s * 26, 34, s * 10); x.stroke();
      x.strokeStyle = '#8a9094'; x.lineWidth = 5.5; x.stroke();
      x.strokeStyle = '#0a0b0c'; x.lineWidth = 6; x.beginPath(); x.moveTo(34, s * 10); x.lineTo(28, s * 3); x.stroke(); x.strokeStyle = '#8a9094'; x.lineWidth = 3; x.stroke();
    }
    x.fillStyle = '#4c5256'; x.strokeStyle = '#0a0b0c'; x.lineWidth = 2.6; x.beginPath(); x.arc(-11, 2, 7, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#b8bec0'; x.beginPath(); x.arc(-11, 2, 2.2, 0, TAU); x.fill();
  },
};

// the face for button `kind` (the art, if drawn here; else its symbol in bone), radius r, state 'on' | 'off' | 'down' | 'lit'
export function drawCoin(ctx, cx, cy, r, kind, state = 'on', look = null) {
  const lk = look && typeof look === 'object' ? (look.id || JSON.stringify(look).slice(0, 40)) : String(look ?? '');
  const key = `${kind}|${state}|${Math.round(r * 2)}|${lk}`;
  let t = cache.get(key);
  if (!t) {
    const R = Math.round(r * 2) / 2, pad = Math.ceil(R * 0.14) + 2, size = Math.ceil(R * 2 + pad * 2), c = document.createElement('canvas');
    c.width = c.height = size; const x = c.getContext('2d'); x.translate(size / 2, size / 2);
    // its shadow on the water
    x.fillStyle = 'rgba(0,0,0,0.32)'; x.beginPath(); x.arc(0, R * 0.08, R * 1.03, 0, TAU); x.fill();
    face(x, R, HUE[kind] || [190, 20, 13], kind.length * 31 + 7);
    // a soft light behind the art
    const gl = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.7); gl.addColorStop(0, 'rgba(230,236,220,0.13)'); gl.addColorStop(1, 'rgba(230,236,220,0)');
    x.fillStyle = gl; x.beginPath(); x.arc(0, 0, R * 0.7, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, R * 0.9, 0, TAU); x.clip();
    if (ART[kind]) { const k = R * 0.66 / 50; x.save(); x.scale(k, k); ART[kind](x, look || {}); x.restore(); }
    else drawGlyph(x, kind, 0, 0, R * 0.95);
    x.restore();
    if (state === 'off') { x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.65; x.fillStyle = '#808080'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = 'rgba(6,8,8,0.22)'; x.fill(); }
    if (state === 'down') { x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); }
    lip(x, R, state);
    t = { c, half: size / 2 }; cache.set(key, t); if (cache.size > 80) cache.delete(cache.keys().next().value);
  }
  ctx.drawImage(t.c, cx - t.half, cy - t.half + (state === 'down' ? r * 0.04 : 0));
}
export const COIN_ART = Object.keys(ART);
