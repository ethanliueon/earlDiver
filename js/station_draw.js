// The research station (3.0.0), on the summit of the seamount. A steel lattice tower stands on the summit
// (~315 m) and carries the station ~30 m up, so its docking collar sits at ~285 m, inside the starter sub's
// rating. The station itself: two white, ribbed pressure modules end to end on a deck frame, a small domed
// observation sphere between them, square lit windows, instrument racks and sample baskets hung off the
// frame, a docking collar facing east, an antenna mast, mooring cables down to anchor blocks, and a couple of
// orange buoyancy spheres. Tidy and institutional, the opposite of Dave's place. Everything is drawn in
// metres from the foot of the tower (X(dx), Y(dy): dy negative is up).
import { TAU } from './util.js';

export const STATION_TOP = 30;    // how far above the summit the station's deck frame stands
export const STATION_COLLAR = { dx: 10.2, dy: -31.9 }; // the docking collar, east end

export function drawStation(ctx, X, Y, m, t, lit) {
  const top = -STATION_TOP;
  const line = (x0, y0, x1, y1, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * m); ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke(); };
  // mooring cables to two anchor blocks, a little slack
  ctx.strokeStyle = 'rgba(40,44,46,0.8)'; ctx.lineWidth = Math.max(1, 0.06 * m);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(X(s * 6), Y(top + 1)); ctx.quadraticCurveTo(X(s * 11), Y(top / 2 + 2), X(s * 15), Y(-0.5)); ctx.stroke();
    ctx.fillStyle = '#4a4e4c'; ctx.fillRect(X(s * 15 - 0.9), Y(-0.9), 1.8 * m, 0.9 * m);
  }
  // the tower: four legs (two seen) splayed at the foot, cross-bracing in bays
  const legX = (dy, s) => s * (2.6 + (dy / top) * -1.2 + 1.2); // wider at the foot
  for (const s of [-1, 1]) line(legX(0, s), 0, legX(top, s), top, 0.32, '#5c6266');
  const bays = 6;
  for (let i = 0; i < bays; i++) {
    const ya = (top * i) / bays, yb = (top * (i + 1)) / bays;
    line(legX(ya, -1), ya, legX(yb, 1), yb, 0.12, '#4e5458'); line(legX(ya, 1), ya, legX(yb, -1), yb, 0.12, '#4e5458');
    line(legX(yb, -1), yb, legX(yb, 1), yb, 0.14, '#555b5f');
  }
  // a ladder of cable trays up one leg, and a pressure housing bolted at the foot
  line(legX(0, 1) - 0.4, -0.4, legX(top, 1) - 0.4, top + 0.5, 0.08, 'rgba(200,120,40,0.6)');
  ctx.fillStyle = '#d8d6cc'; ctx.beginPath(); ctx.roundRect(X(-1.2), Y(-1.4), 2.4 * m, 1.4 * m, 0.3 * m); ctx.fill();
  ctx.fillStyle = '#2a2e30'; ctx.font = `${Math.max(6, 0.5 * m)}px monospace`; ctx.textAlign = 'center'; ctx.fillText('ADCP', X(0), Y(-0.5));
  // the deck frame
  ctx.fillStyle = '#4a5054'; ctx.fillRect(X(-10), Y(top), 20 * m, 0.5 * m);
  for (let i = -10; i <= 10; i += 2) line(i, top, i + 1, top + 0.5, 0.06, '#3a3f42');
  // the two modules: white cylinders seen side on, with rib rings
  const mod = (x0, x1, cy, r) => {
    const g = ctx.createLinearGradient(0, Y(cy - r), 0, Y(cy + r));
    g.addColorStop(0, '#c4c3ba'); g.addColorStop(0.35, '#aeada4'); g.addColorStop(1, '#5e5d57'); // weathered white, stained by the years down here
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(X(x0), Y(cy - r), (x1 - x0) * m, 2 * r * m, r * m * 0.9); ctx.fill();
    ctx.strokeStyle = 'rgba(80,80,74,0.45)'; ctx.lineWidth = Math.max(1, 0.06 * m);
    for (let x = x0 + 1; x < x1 - 0.5; x += 1.4) { ctx.beginPath(); ctx.moveTo(X(x), Y(cy - r + 0.05)); ctx.lineTo(X(x), Y(cy + r - 0.05)); ctx.stroke(); }
    // a stripe and the station's lettering
    ctx.fillStyle = '#1e5a5a'; ctx.fillRect(X(x0 + 0.3), Y(cy + r * 0.45), (x1 - x0 - 0.6) * m, 0.22 * m);
  };
  const cy = top - 1.9, r = 1.6;
  mod(-9.5, -1.4, cy, r); mod(1.4, 9.0, cy, r);
  // the windows: square, lit a cool white when anyone is home (always)
  const win = (x, y) => { ctx.fillStyle = lit ? 'rgba(220,240,236,0.92)' : '#2a3436'; ctx.fillRect(X(x - 0.35), Y(y - 0.3), 0.7 * m, 0.6 * m); ctx.strokeStyle = '#6a6c66'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.strokeRect(X(x - 0.35), Y(y - 0.3), 0.7 * m, 0.6 * m); };
  for (const x of [-8, -6.4, -4.8, -3.2]) win(x, cy - 0.3);
  for (const x of [3, 4.6, 6.2]) win(x, cy - 0.3);
  // someone at a window now and then: a silhouette crossing
  const walk = ((t * 0.12) % 1);
  if (walk < 0.5) { const px = -8 + walk * 2 * 4.8; ctx.fillStyle = 'rgba(30,40,44,0.55)'; ctx.beginPath(); ctx.ellipse(X(px), Y(cy - 0.25), 0.18 * m, 0.26 * m, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#1e5a5a'; ctx.font = `600 ${Math.max(7, 0.62 * m)}px monospace`; ctx.textAlign = 'left';
  ctx.fillText('STATION 7', X(-9), Y(cy + 1.2));
  // the observation sphere between the modules, with a dome of glass
  ctx.fillStyle = '#9e9c94'; ctx.beginPath(); ctx.arc(X(0), Y(cy), 1.9 * m, 0, TAU); ctx.fill();
  const dg = ctx.createRadialGradient(X(-0.4), Y(cy - 0.6), 0.2 * m, X(0), Y(cy), 1.3 * m);
  dg.addColorStop(0, lit ? 'rgba(210,240,236,0.9)' : 'rgba(90,120,120,0.8)'); dg.addColorStop(1, lit ? 'rgba(90,160,160,0.75)' : 'rgba(30,50,52,0.9)');
  ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(X(0), Y(cy), 1.3 * m, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#6a6c66'; ctx.lineWidth = Math.max(1, 0.08 * m); ctx.beginPath(); ctx.arc(X(0), Y(cy), 1.3 * m, 0, TAU); ctx.stroke();
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(X(Math.cos(a) * 1.3), Y(cy + Math.sin(a) * 1.3)); ctx.lineTo(X(-Math.cos(a) * 1.3), Y(cy - Math.sin(a) * 1.3)); ctx.stroke(); }
  // the docking collar at the east end: a short tube and a flanged ring
  const C = STATION_COLLAR;
  ctx.fillStyle = '#9a9890'; ctx.fillRect(X(9.0), Y(C.dy - 0.8), 0.9 * m, 1.6 * m);
  ctx.fillStyle = '#6a6c66'; ctx.fillRect(X(9.8), Y(C.dy - 1.05), 0.3 * m, 2.1 * m);
  ctx.fillStyle = 'rgba(255,190,80,0.9)'; ctx.beginPath(); ctx.arc(X(10.0), Y(C.dy - 1.3), 0.12 * m, 0, TAU); ctx.fill(); // the docking light
  // instrument racks and a sample basket hung off the deck frame
  ctx.fillStyle = '#3e4447'; ctx.fillRect(X(-9.2), Y(top + 0.5), 1.6 * m, 1.4 * m); ctx.fillRect(X(5.4), Y(top + 0.5), 1.2 * m, 1.8 * m);
  ctx.strokeStyle = '#8a8e88'; ctx.lineWidth = Math.max(1, 0.04 * m);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X(-9.2), Y(top + 0.7 + i * 0.3)); ctx.lineTo(X(-7.6), Y(top + 0.7 + i * 0.3)); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(190,190,170,0.6)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(X(2 + i * 0.4), Y(top + 0.5)); ctx.lineTo(X(2 + i * 0.4), Y(top + 1.6)); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(X(2), Y(top + 1.6)); ctx.lineTo(X(3.6), Y(top + 1.6)); ctx.stroke();
  // orange buoyancy spheres on the roof, and the antenna mast with a slow green light
  for (const x of [-6, 5]) { ctx.fillStyle = '#d0702e'; ctx.beginPath(); ctx.arc(X(x), Y(cy - r - 0.55), 0.55 * m, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(X(x - 0.15), Y(cy - r - 0.7), 0.18 * m, 0, TAU); ctx.fill(); }
  line(-2.5, cy - r, -2.5, cy - r - 4.5, 0.1, '#6a6e70'); line(-3.2, cy - r - 3.6, -1.8, cy - r - 3.6, 0.07, '#6a6e70');
  const blink = Math.sin(t * 1.6) > 0.6;
  ctx.fillStyle = blink ? 'rgba(140,255,170,0.95)' : 'rgba(60,110,70,0.8)'; ctx.beginPath(); ctx.arc(X(-2.5), Y(cy - r - 4.6), 0.14 * m, 0, TAU); ctx.fill();
}
