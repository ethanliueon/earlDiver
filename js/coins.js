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
  trawl: [100, 24, 15], air: [200, 14, 14], sell: [44, 30, 14], lure: [170, 34, 10], glow: [120, 26, 11], pet: [186, 32, 13], swap: [60, 8, 12],
  gear: [40, 18, 13], bag: [70, 16, 13], quest: [24, 26, 13], journal: [40, 20, 14], chart: [200, 18, 13],
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
    // (5.6.2) the net, read at a glance: a round hoop seen almost face-on, a deep bag of big knotted mesh hanging
    // out of it, the pole leaving at the lower left. Its colours are the player's own net's
    const hoop = look.hoop || '#8c9496', meshC = look.mesh || 'rgba(120,170,120,0.95)', h = look.h || ['#c4cacb', '#8a9294', '#4a5254'];
    x.lineCap = 'round'; x.lineJoin = 'round';
    // the pole
    x.strokeStyle = '#0d0f0e'; x.lineWidth = 10; x.beginPath(); x.moveTo(-48, 46); x.lineTo(-22, 18); x.stroke();
    x.strokeStyle = h[1]; x.lineWidth = 6.4; x.stroke();
    x.strokeStyle = h[0]; x.lineWidth = 2; x.beginPath(); x.moveTo(-47, 43); x.lineTo(-23, 16); x.stroke();
    // the bag: a sack hanging down out of the hoop, wider than the hoop's lower half, its mesh drawn as knotted
    // diamonds that get smaller towards the bottom
    const bag = new Path2D('M-22 -2C-28 18 -12 44 8 46C28 44 40 20 36 -2Z');
    x.fillStyle = 'rgba(0,0,0,0.38)'; x.fill(bag);
    x.save(); x.clip(bag);
    const mc = typeof meshC === 'string' ? meshC : 'rgba(120,170,120,0.95)';
    for (let row = 0; row < 7; row++) {
      const y0 = -2 + row * 7.2, step = 9 - row * 0.5;
      for (let k = -40; k < 50; k += step) {
        const xx = k + (row % 2 ? step / 2 : 0);
        x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 2.8; x.beginPath(); x.moveTo(xx, y0); x.lineTo(xx + step / 2, y0 + 7.2); x.lineTo(xx + step, y0); x.stroke();
        x.strokeStyle = mc; x.lineWidth = 1.5; x.stroke();
        x.fillStyle = mc; x.beginPath(); x.arc(xx + step / 2, y0 + 7.2, 1.3, 0, TAU); x.fill();
      }
    }
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(24, 26, 16, 22, 0, 0, TAU); x.fill(); // the bag's shadowed side
    x.restore();
    x.strokeStyle = '#0d0f0e'; x.lineWidth = 2; x.stroke(bag);
    // the hoop
    x.strokeStyle = '#0d0f0e'; x.lineWidth = 9; x.beginPath(); x.ellipse(7, -6, 31, 15, -0.06, 0, TAU); x.stroke();
    x.strokeStyle = hoop; x.lineWidth = 5.6; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(7, -7, 30, 14, -0.06, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
    // the ferrule where pole meets hoop
    x.fillStyle = h[2]; x.strokeStyle = '#0d0f0e'; x.lineWidth = 2; x.beginPath(); x.arc(-22, 16, 4.6, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(210,235,240,0.6)'; x.beginPath(); x.ellipse(10, 49, 1.6, 2.6, 0, 0, TAU); x.fill(); // a drop
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
  glow(x) {
    x.save(); x.rotate(-0.6); x.scale(1.3, 1.3);
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
  // the bag: a canvas dive bag, its buckled flap and a strap
  bag(x) {
    x.lineJoin = 'round';
    x.strokeStyle = '#0c0b08'; x.lineWidth = 5; x.beginPath(); x.moveTo(-14, -22); x.bezierCurveTo(-14, -42, 14, -42, 14, -22); x.stroke(); x.strokeStyle = '#4a3c28'; x.lineWidth = 3; x.stroke(); // the handle
    const b = new Path2D('M-30 -22H30C34 -22 36 -19 36 -15V34C36 40 32 42 28 42H-28C-32 42 -36 40 -36 34V-15C-36 -19 -34 -22 -30 -22Z');
    x.lineWidth = 4.4; x.strokeStyle = '#0c0b08'; x.stroke(b); x.fillStyle = '#5a5a3e'; x.fill(b);
    x.save(); x.clip(b); x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(-40, 20, 80, 30); x.fillStyle = 'rgba(255,250,220,0.14)'; x.fillRect(-40, -22, 80, 8);
    x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 0.8; for (let k = -36; k < 40; k += 3) { x.beginPath(); x.moveTo(k, -22); x.lineTo(k, 42); x.stroke(); } x.restore(); // the weave
    const flap = new Path2D('M-34 -18H34V6C34 10 30 12 26 12H-26C-30 12 -34 10 -34 6Z');
    x.fillStyle = '#4c4c34'; x.fill(flap); x.strokeStyle = '#0c0b08'; x.lineWidth = 3; x.stroke(flap);
    x.strokeStyle = 'rgba(230,222,196,0.35)'; x.lineWidth = 1; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(-30, 8); x.lineTo(30, 8); x.stroke(); x.setLineDash([]); // stitching
    for (const sx of [-16, 16]) { x.fillStyle = '#2a2418'; x.fillRect(sx - 4, 2, 8, 22); x.fillStyle = '#b89a5a'; x.strokeStyle = '#0c0b08'; x.lineWidth = 2; x.beginPath(); x.roundRect(sx - 6, 12, 12, 9, 1.5); x.fill(); x.stroke(); x.fillStyle = '#0c0b08'; x.fillRect(sx - 1, 13, 2, 7); }
  },
  // the quests: the Margaret's log, a worn hardback tied shut with string, a page-marker sticking out
  quest(x) {
    x.save(); x.rotate(-0.12);
    x.fillStyle = '#0b0a08'; x.beginPath(); x.roundRect(-32, -40, 64, 80, 4); x.fill();
    x.fillStyle = '#e6dcc0'; x.fillRect(-26, -36, 58, 74); // the pages' edge
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 0.8; for (let k = -32; k < 38; k += 3) { x.beginPath(); x.moveTo(28, k); x.lineTo(32, k); x.stroke(); }
    const cov = new Path2D('M-30 -40H24C27 -40 28 -39 28 -36V36C28 39 27 40 24 40H-30Z');
    x.fillStyle = '#4a3020'; x.fill(cov); x.save(); x.clip(cov); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-30, 10, 60, 40); x.fillStyle = 'rgba(255,230,200,0.12)'; x.fillRect(-30, -40, 60, 10);
    x.fillStyle = 'rgba(30,20,10,0.3)'; for (const [a, b, r] of [[10, -20, 9], [-14, 18, 12]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); } x.restore(); // water stains
    x.strokeStyle = '#0b0a08'; x.lineWidth = 3; x.stroke(cov);
    x.fillStyle = '#2a1a10'; x.fillRect(-30, -40, 8, 80); // the spine
    x.fillStyle = '#d8ccaa'; x.strokeStyle = '#0b0a08'; x.lineWidth = 2; x.beginPath(); x.roundRect(-12, -16, 32, 18, 2); x.fill(); x.stroke(); // the label
    x.strokeStyle = 'rgba(40,30,20,0.7)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-8, -10); x.lineTo(16, -10); x.moveTo(-8, -4); x.lineTo(10, -4); x.stroke();
    x.strokeStyle = '#c8b890'; x.lineWidth = 2; x.beginPath(); x.moveTo(-34, 22); x.bezierCurveTo(0, 18, 20, 26, 34, 22); x.stroke(); // the string
    x.fillStyle = '#a02a20'; x.beginPath(); x.moveTo(14, 40); x.lineTo(14, 52); x.lineTo(18, 48); x.lineTo(22, 52); x.lineTo(22, 40); x.fill(); // the marker
    x.restore();
  },
  // the journal (the quest group's): a field notebook, open, a sketched fish on its page, a pencil across it
  journal(x) {
    x.fillStyle = '#0b0a08'; x.beginPath(); x.moveTo(-44, -26); x.quadraticCurveTo(-22, -34, 0, -26); x.quadraticCurveTo(22, -34, 44, -26); x.lineTo(44, 32); x.quadraticCurveTo(22, 24, 0, 32); x.quadraticCurveTo(-22, 24, -44, 32); x.closePath(); x.fill();
    x.fillStyle = '#e4d9bc'; x.beginPath(); x.moveTo(-40, -23); x.quadraticCurveTo(-20, -30, -1, -23); x.lineTo(-1, 28); x.quadraticCurveTo(-20, 21, -40, 28); x.closePath(); x.fill();
    x.fillStyle = '#ddd2b4'; x.beginPath(); x.moveTo(1, -23); x.quadraticCurveTo(20, -30, 40, -23); x.lineTo(40, 28); x.quadraticCurveTo(20, 21, 1, 28); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(60,70,90,0.35)'; x.lineWidth = 0.8; for (let k = -14; k < 24; k += 5) { x.beginPath(); x.moveTo(6, k); x.lineTo(36, k - 2); x.stroke(); }
    x.strokeStyle = 'rgba(40,40,40,0.75)'; x.lineWidth = 1.4; x.beginPath(); x.ellipse(-20, 0, 12, 6, 0, 0, TAU); x.moveTo(-32, 0); x.lineTo(-38, -5); x.lineTo(-38, 5); x.closePath(); x.stroke(); // a sketched fish
    x.beginPath(); x.arc(-13, -1, 1, 0, TAU); x.stroke();
    x.fillStyle = 'rgba(120,80,40,0.25)'; x.beginPath(); x.arc(28, 16, 7, 0, TAU); x.fill(); // a stain
    x.save(); x.rotate(-0.5); x.fillStyle = '#c8a040'; x.strokeStyle = '#0b0a08'; x.lineWidth = 1.6; x.beginPath(); x.roundRect(-6, 20, 46, 5, 1); x.fill(); x.stroke(); x.fillStyle = '#e8c8a0'; x.beginPath(); x.moveTo(40, 20); x.lineTo(47, 22.5); x.lineTo(40, 25); x.fill(); x.restore(); // a pencil
  },
  // the chart: a sea chart, half unrolled, its contours and a red mark
  chart(x) {
    x.fillStyle = '#0b0a08'; x.beginPath(); x.roundRect(-42, -26, 84, 54, 3); x.fill();
    x.fillStyle = '#d8ccaa'; x.fillRect(-38, -22, 72, 46);
    x.strokeStyle = 'rgba(40,80,100,0.6)'; x.lineWidth = 1.2; for (const k of [0, 6, 12]) { x.beginPath(); x.moveTo(-38, 10 - k); x.bezierCurveTo(-14, -6 - k, 6, 18 - k, 34, 2 - k); x.stroke(); }
    x.fillStyle = '#a02a20'; x.beginPath(); x.moveTo(10, -4); x.lineTo(14, -12); x.lineTo(18, -4); x.closePath(); x.fill();
    x.fillStyle = '#b8a880'; x.strokeStyle = '#0b0a08'; x.lineWidth = 2.4; x.beginPath(); x.ellipse(36, 1, 7, 26, 0, 0, TAU); x.fill(); x.stroke(); // the roll
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

// (5.6.2) a coin as a picture, for the page's own buttons (the quest group's)
export function coinURL(kind, px = 112, state = 'on') {
  const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d');
  drawCoin(x, px / 2, px / 2, px * 0.43, kind, state); return c.toDataURL('image/png');
}
