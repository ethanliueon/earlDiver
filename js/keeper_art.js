// (7.9.4, owner) the old diver who keeps the edge of the second sea: a seated hard-hat diver painted once into a picture
// (the game's rule for static art) and only scaled in play. He sits on his stone facing the beach (+x here is toward the
// beach), a copper helmet with a bolted breastplate, a barred face port and side ports, a creased canvas suit, a weight
// belt, lead boots with brass toes, an air hose curling off his helmet to the stone. Units: u = one HUD unit at 40 px/m.
import { TAU } from './util.js';
let PIC = null;
export function keeperPicture() {
  if (PIC) return PIC; const Z = 6, w = 60, h = 66, ox = 30, oy = 62; // canvas in u, origin (ox, oy) = the stone's foot, middle
  const c = document.createElement('canvas'); c.width = w * Z; c.height = h * Z; const x = c.getContext('2d'); x.scale(Z, Z); x.translate(ox, oy);
  x.lineJoin = 'round'; x.lineCap = 'round';
  const lin = (x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const rad = (cx, cy, r, stops, fx = -0.35, fy = -0.4) => { const g = x.createRadialGradient(cx + r * fx, cy + r * fy, r * 0.08, cx, cy, r); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const path = (pts, close = true) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) x.quadraticCurveTo(p[0], p[1], p[2], p[3]); else x.lineTo(p[0], p[1]); } if (close) x.closePath(); };
  // ---- the stone ----
  path([[-17, 0], [-18, -8, -12, -14], [-4, -17, 6, -16], [14, -15, 17, -7], [18, 0]]);
  x.fillStyle = lin(0, -17, 0, 0, [[0, '#6a6c64'], [0.55, '#45473f'], [1, '#26281f']]); x.fill();
  x.strokeStyle = 'rgba(12,12,8,0.6)'; x.lineWidth = 0.6; x.stroke();
  x.strokeStyle = 'rgba(190,186,160,0.18)'; x.lineWidth = 0.8; path([[-13, -12], [-6, -16.2, 5, -15.4]], false); x.stroke(); // its lit top
  x.fillStyle = 'rgba(20,20,14,0.35)'; for (const [a, b, r] of [[-9, -6, 2.2], [5, -4, 1.6], [11, -9, 1.2], [-2, -10, 1]]) { x.beginPath(); x.ellipse(a, b, r * 1.3, r, 0.3, 0, TAU); x.fill(); } // pits
  x.fillStyle = '#5d6a3a'; for (const [a, b] of [[-15, -2], [-12, -1], [14, -2], [16, -1]]) { x.beginPath(); x.moveTo(a, 0); x.quadraticCurveTo(a - 1, b - 2, a + 0.6, b - 3.5); x.quadraticCurveTo(a + 0.4, b - 1.5, a + 1, 0); x.fill(); } // weed at its foot
  x.fillStyle = '#b8b09a'; for (const [a, b] of [[-11, -13], [-9.5, -13.6], [8, -14.5], [12.5, -11]]) { x.beginPath(); x.arc(a, b, 0.7, 0, TAU); x.fill(); x.fillStyle = 'rgba(60,54,40,0.8)'; x.beginPath(); x.arc(a, b, 0.25, 0, TAU); x.fill(); x.fillStyle = '#b8b09a'; } // barnacles
  // ---- the air hose: off the back of his helmet, over the stone's back and away along the seabed ----
  const hose = () => { x.beginPath(); x.moveTo(-5, -50); x.bezierCurveTo(-14, -48, -16, -30, -14, -20); x.bezierCurveTo(-13, -12, -22, -6, -30, -2); };
  hose(); x.strokeStyle = '#1d1c18'; x.lineWidth = 3.2; x.stroke(); hose(); x.strokeStyle = '#3c3a32'; x.lineWidth = 2.2; x.stroke();
  x.setLineDash([0.5, 1.4]); hose(); x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 2.4; x.stroke(); x.setLineDash([]); // its ribbed wrap
  hose(); x.strokeStyle = 'rgba(200,190,160,0.18)'; x.lineWidth = 0.6; x.stroke();
  const SUIT = [[0, '#8f8668'], [0.55, '#6a634c'], [1, '#3e3a2c']];
  // ---- legs: thighs forward along the stone, shins down ----
  path([[-5, -17], [4, -20, 12, -19], [17, -18, 18, -14], [18, -11], [9, -11, 2, -11], [-6, -12]]); x.fillStyle = lin(0, -20, 0, -11, SUIT); x.fill(); x.strokeStyle = 'rgba(20,16,10,0.6)'; x.lineWidth = 0.6; x.stroke();
  path([[13, -17], [19, -16, 19.5, -10], [19, -3], [14.5, -3], [14.5, -9, 13, -12]]); x.fillStyle = lin(13, 0, 20, 0, SUIT); x.fill(); x.stroke();
  x.strokeStyle = 'rgba(30,26,18,0.45)'; x.lineWidth = 0.5; for (const [a, b, c2, d] of [[4, -18.5, 8, -13], [9, -18.8, 12, -14], [15.5, -11, 18.5, -9], [15, -7, 18.5, -6]]) { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c2) / 2 + 1, (b + d) / 2, c2, d); x.stroke(); } // creases
  // lead boots: a heavy sole, a brass toe cap, two straps
  path([[13.5, -4.5], [20, -4.5], [24, -3.5, 25, -1.2], [25, 0.4], [13, 0.4], [13, -2]]); x.fillStyle = lin(0, -4.5, 0, 0.4, [[0, '#4a4740'], [1, '#1d1c18']]); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 0.6; x.stroke();
  path([[20.5, -3.6], [23.4, -3.2, 24.6, -1.2], [24.6, -0.2], [20.5, -0.2]]); x.fillStyle = lin(20, -4, 25, 0, [[0, '#d6b46e'], [0.5, '#9a7434'], [1, '#5c4018']]); x.fill(); // the toe cap
  x.strokeStyle = '#2a2014'; x.lineWidth = 0.7; for (const sx of [15.5, 18]) { x.beginPath(); x.moveTo(sx, -4.6); x.lineTo(sx, 0.2); x.stroke(); }
  // ---- the body, leaning a little forward over his knees ----
  path([[-8, -14], [-11, -26, -7, -38], [-2, -42, 6, -40], [10, -36, 9, -26], [8, -18, 6, -14]]); x.fillStyle = lin(-10, -40, 8, -14, SUIT); x.fill(); x.strokeStyle = 'rgba(20,16,10,0.6)'; x.lineWidth = 0.6; x.stroke();
  x.strokeStyle = 'rgba(30,26,18,0.4)'; x.lineWidth = 0.5; for (const [a, b, c2, d] of [[-6, -34, -3, -24], [-2, -36, 0, -27], [3, -35, 5, -28], [-7, -22, 4, -21]]) { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c2) / 2 - 1, (b + d) / 2, c2, d); x.stroke(); }
  x.fillStyle = 'rgba(60,54,40,0.55)'; path([[-6, -31], [-1, -32], [-0.6, -28], [-5.6, -27.4]]); x.fill(); x.strokeStyle = 'rgba(30,26,18,0.5)'; x.setLineDash([0.6, 0.6]); x.lineWidth = 0.35; x.stroke(); x.setLineDash([]); // a stitched patch
  // the weight belt with its lead blocks and a knife on the hip
  path([[-9.2, -20], [7.8, -20.5], [7.6, -17.4], [-9, -17]]); x.fillStyle = '#2c2a24'; x.fill();
  for (const bx of [-7, -2, 3]) { x.fillStyle = lin(0, -21.5, 0, -16.6, [[0, '#7a7a74'], [1, '#3a3a36']]); x.fillRect(bx, -21.3, 3.4, 4.6); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 0.35; x.strokeRect(bx, -21.3, 3.4, 4.6); }
  path([[6.2, -19.6], [8.6, -19.6], [8.2, -12], [7, -11.4], [6, -12.2]]); x.fillStyle = lin(6, 0, 9, 0, [[0, '#9a7434'], [1, '#4c3412']]); x.fill(); // the knife's brass sheath
  // ---- the arm, forearm along the thigh, a dark rubber cuff and a heavy glove on the knee ----
  path([[2, -38], [8, -36, 9, -28], [11, -21], [14, -19], [15.5, -16.4], [11, -15.6], [6.6, -19.5, 5, -27], [1, -32]]); x.fillStyle = lin(0, -38, 14, -16, SUIT); x.fill(); x.strokeStyle = 'rgba(20,16,10,0.6)'; x.lineWidth = 0.6; x.stroke();
  x.fillStyle = '#26241e'; path([[11.4, -20.2], [14, -19.4], [13.2, -16.6], [10.8, -17.4]]); x.fill(); // the cuff
  x.fillStyle = lin(12, -20, 18, -14, [[0, '#5a5444'], [1, '#2c2a22']]); x.beginPath(); x.ellipse(15.6, -17.2, 2.8, 2.2, 0.3, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 0.4; x.stroke();
  // ---- the breastplate (corselet): a brass collar over the shoulders, bolted round its rim ----
  path([[-10, -40], [-8, -46, 1, -47], [10, -46, 11, -40], [7, -37.6, 0, -37.4], [-7, -37.6, -10, -40]]);
  x.fillStyle = lin(-10, -47, 11, -37, [[0, '#d9b672'], [0.45, '#a77c3a'], [1, '#5a3e18']]); x.fill(); x.strokeStyle = 'rgba(30,20,8,0.75)'; x.lineWidth = 0.55; x.stroke();
  for (let i = 0; i < 7; i++) { const a = Math.PI * (1.08 + i * 0.14), bx = 0.5 + Math.cos(a) * 10, by = -41 - Math.sin(a) * -4.2; x.fillStyle = '#4a3414'; x.beginPath(); x.arc(bx, by, 0.65, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,236,190,0.6)'; x.beginPath(); x.arc(bx - 0.2, by - 0.2, 0.25, 0, TAU); x.fill(); }
  // ---- the helmet: a copper dome turned on its breastplate, olive bloom of verdigris on it ----
  const hx = 1.5, hy = -54, hr = 9.4;
  x.fillStyle = rad(hx, hy, hr, [[0, '#f0cf8a'], [0.35, '#c08a46'], [0.75, '#7c5222'], [1, '#3e2810']]); x.beginPath(); x.arc(hx, hy, hr, 0, TAU); x.fill();
  x.save(); x.beginPath(); x.arc(hx, hy, hr, 0, TAU); x.clip();
  x.fillStyle = 'rgba(96,110,62,0.32)'; for (const [a, b, r] of [[hx - 6, hy + 4, 4], [hx + 5, hy - 6, 2.6], [hx - 2, hy + 8, 3.4]]) { x.beginPath(); x.ellipse(a, b, r * 1.3, r, 0.5, 0, TAU); x.fill(); } // verdigris
  x.strokeStyle = 'rgba(40,24,8,0.55)'; x.lineWidth = 0.9; x.beginPath(); x.ellipse(hx, hy + 6.8, hr, 2.6, 0, Math.PI, TAU); x.stroke(); // the neck ring's seam
  x.restore();
  x.strokeStyle = 'rgba(30,18,6,0.8)'; x.lineWidth = 0.6; x.beginPath(); x.arc(hx, hy, hr, 0, TAU); x.stroke();
  // the valve on top and the hose's elbow at the back
  x.fillStyle = lin(hx - 1.5, 0, hx + 1.5, 0, [[0, '#d9b672'], [1, '#6a4a1c']]); x.fillRect(hx - 1.4, hy - hr - 2.4, 2.8, 2.8); x.beginPath(); x.ellipse(hx, hy - hr - 2.6, 2.2, 0.7, 0, 0, TAU); x.fill();
  x.fillStyle = lin(0, hy - 6, 0, hy + 2, [[0, '#c9a25c'], [1, '#5c3e16']]); x.beginPath(); x.ellipse(hx - hr + 0.6, hy + 1, 1.6, 3.2, 0, 0, TAU); x.fill();
  // the side port (oval, its guard bars) and the face port (round, a heavy rim, crossed bars), dark glass with a cold catch of light
  const port = (cx, cy, rx, ry, bars) => { x.fillStyle = lin(cx - rx, cy - ry, cx + rx, cy + ry, [[0, '#e6c784'], [1, '#6a4a1c']]); x.beginPath(); x.ellipse(cx, cy, rx + 1.2, ry + 1.2, 0, 0, TAU); x.fill();
    x.fillStyle = rad(cx, cy, Math.max(rx, ry), [[0, '#2c3632'], [1, '#0c1210']], 0.2, 0.2); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(220,196,140,0.85)'; x.lineWidth = 0.7; x.beginPath(); for (const b of bars) { x.moveTo(cx + b[0] * rx, cy + b[1] * ry); x.lineTo(cx + b[2] * rx, cy + b[3] * ry); } x.stroke();
    x.fillStyle = 'rgba(220,226,214,0.35)'; x.beginPath(); x.ellipse(cx - rx * 0.35, cy - ry * 0.4, rx * 0.3, ry * 0.16, -0.5, 0, TAU); x.fill(); };
  port(hx + 4.4, hy + 0.6, 3.6, 3.6, [[-1, 0, 1, 0], [0, -1, 0, 1]]);
  port(hx - 2.6, hy - 1.4, 1.5, 2.2, [[-1, -0.3, 1, -0.3], [-1, 0.35, 1, 0.35]]);
  x.fillStyle = 'rgba(255,240,200,0.5)'; x.beginPath(); x.ellipse(hx - 4.5, hy - 5.4, 2.6, 1.2, -0.6, 0, TAU); x.fill(); // the dome's lit catch
  PIC = { c, w, h, ox, oy }; return PIC;
}
