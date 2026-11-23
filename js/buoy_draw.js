// (6.8.1) A sail point's marker buoy: a squat can buoy riding the swell, old red paint faded to rust, a band of green
// grime at the waterline, a steel day-mark cage on top with a lamp (dark by day, a faint amber at night), a riveted
// plate with its number in the game's type, and its chain running down out of sight to the seabed. Drawn turned and
// lit like the rest of the sea's things: the can is shaded across, the plate catches light along its top edge.
import { TAU } from './util.js';

const FONT = '"Barlow Semi Condensed", "Arial Narrow", sans-serif';

export function drawSailBuoy(ctx, S, Sy, ppm, t, pt, surfY, floorY, yView1, night) {
  const m = ppm, x = pt.x, wy = surfY(x) * 0.9, tilt = Math.atan2(surfY(x + 0.8) - surfY(x - 0.8), 1.6) * 0.8 + Math.sin(t * 0.9 + x) * 0.05;
  const bx = S(x), by = Sy(wy);
  // the chain: from under the can, bowed a little by the current, to the floor (or out of the view)
  const fy = Math.min(floorY, yView1 + 5), cx = S(x + 2 + Math.sin(t * 0.2 + x) * 0.6);
  ctx.save(); ctx.strokeStyle = 'rgba(30,28,24,0.85)'; ctx.lineWidth = Math.max(1.5, 0.1 * m); ctx.lineCap = 'round'; ctx.setLineDash([Math.max(2, 0.16 * m), Math.max(2, 0.1 * m)]); /* links */
  ctx.beginPath(); ctx.moveTo(bx, by + 0.55 * m); ctx.quadraticCurveTo(cx, (by + Sy(fy)) / 2, S(x + 1), Sy(fy)); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
  const w = 0.62, hTop = -1.05, hBot = 0.6; // the can: half-width, its top above the water and its foot below, in metres
  // the can, shaded across: lit on the left, dark on the right
  const g = ctx.createLinearGradient(-w * m, 0, w * m, 0);
  g.addColorStop(0, '#5a2e1e'); g.addColorStop(0.22, '#9a5434'); g.addColorStop(0.42, '#a8603c'); g.addColorStop(0.75, '#6a3622'); g.addColorStop(1, '#2e1810');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w * m, hBot * m); ctx.lineTo(-w * 0.92 * m, hTop * m); ctx.lineTo(w * 0.92 * m, hTop * m); ctx.lineTo(w * m, hBot * m);
  ctx.ellipse(0, hBot * m, w * m, 0.16 * m, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  // the top, an oval seen from a little above
  const tg = ctx.createLinearGradient(-w * m, 0, w * m, 0); tg.addColorStop(0, '#7a4630'); tg.addColorStop(0.4, '#9a6448'); tg.addColorStop(1, '#3a2014');
  ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(0, hTop * m, w * 0.92 * m, 0.15 * m, 0, 0, TAU); ctx.fill();
  // grime at the waterline: green-black, ragged
  const gg = ctx.createLinearGradient(0, -0.1 * m, 0, hBot * m); gg.addColorStop(0, 'rgba(40,52,30,0)'); gg.addColorStop(0.35, 'rgba(40,52,30,0.75)'); gg.addColorStop(1, 'rgba(24,30,20,0.9)');
  ctx.fillStyle = gg; ctx.fillRect(-w * m, -0.1 * m, 2 * w * m, (hBot + 0.1) * m);
  // paint gone in patches, and rust weeping from the plate's rivets
  ctx.fillStyle = 'rgba(60,40,28,0.35)'; for (let i = 0; i < 6; i++) { const a = Math.sin(i * 12.9898 + pt.x) * 43758.5453, f = a - Math.floor(a); ctx.beginPath(); ctx.ellipse((-0.4 + f * 0.8) * m, (-0.85 + ((f * 7) % 1) * 0.7) * m, (0.05 + f * 0.08) * m, (0.03 + f * 0.04) * m, 0, 0, TAU); ctx.fill(); }
  // the plate: dark steel, riveted, its number in bone
  const pw = 0.82, ph = 0.36, py = -0.72;
  const pg = ctx.createLinearGradient(0, (py - ph / 2) * m, 0, (py + ph / 2) * m); pg.addColorStop(0, '#4a4a42'); pg.addColorStop(0.15, '#33332d'); pg.addColorStop(1, '#22221e');
  ctx.fillStyle = pg; ctx.fillRect(-pw / 2 * m, (py - ph / 2) * m, pw * m, ph * m);
  ctx.strokeStyle = 'rgba(150,146,126,0.45)'; ctx.lineWidth = Math.max(1, 0.025 * m); ctx.beginPath(); ctx.moveTo(-pw / 2 * m, (py - ph / 2) * m); ctx.lineTo(pw / 2 * m, (py - ph / 2) * m); ctx.stroke();
  ctx.fillStyle = 'rgba(16,16,14,0.9)'; for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * (pw / 2 - 0.06) * m, (py + sy * (ph / 2 - 0.06)) * m, 0.025 * m, 0, TAU); ctx.fill(); }
  if (m > 7) { ctx.font = `600 ${0.25 * m}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(218,208,180,0.85)'; ctx.fillText(pt.no, 0, (py + 0.015) * m); }
  // the day-mark cage on top: four bars meeting at a ring, a lamp housing at the crown
  ctx.strokeStyle = '#4a4740'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.lineCap = 'round';
  for (const k of [-1, -0.35, 0.35, 1]) { ctx.beginPath(); ctx.moveTo(k * w * 0.7 * m, hTop * m); ctx.lineTo(k * 0.12 * m, (hTop - 0.75) * m); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, (hTop - 0.38) * m, 0.4 * m, 0.07 * m, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#3a3832'; ctx.fillRect(-0.12 * m, (hTop - 0.98) * m, 0.24 * m, 0.25 * m);
  const lampOn = night, sw = 0.5 + 0.5 * Math.sin(t * 0.8 + pt.x);
  ctx.fillStyle = lampOn ? `rgba(226,176,100,${0.5 + 0.35 * sw})` : 'rgba(60,58,48,0.9)'; ctx.beginPath(); ctx.arc(0, (hTop - 1.05) * m, 0.09 * m, 0, TAU); ctx.fill();
  ctx.restore();
}
