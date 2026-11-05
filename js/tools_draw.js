// Earl's catching gear, drawn in his local frame (u = his height / 100, about 2 cm).
// Every tool is drawn from its grip (the origin) out along +x; the caller rotates it.
import { TAU, clamp } from './util.js';
import { drawSpecies } from './creatures_draw.js';

// a tube with a soft cylindrical shade
function tube(ctx, x0, x1, r, c0, c1, c2) {
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, c0); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x0, -r, x1 - x0, r * 2, r * 0.6); ctx.fill();
}
// diamond mesh clipped to the current path
function mesh(ctx, x0, y0, x1, y1, step, col, w) {
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath();
  const span = (x1 - x0) + (y1 - y0);
  for (let k = -span; k < span; k += step) {
    ctx.moveTo(x0 + k, y0); ctx.lineTo(x0 + k + (y1 - y0), y1);
    ctx.moveTo(x0 + k, y1); ctx.lineTo(x0 + k + (y1 - y0), y0);
  }
  ctx.stroke();
}

const NET_LOOK = [
  // handle length, hoop radius, bag depth, mesh step, mesh colour, bag tint, hoop colour, handle colours
  { len: 30, r: 8, bag: 14, step: 2.6, mesh: 'rgba(92,140,96,0.9)', tint: 'rgba(60,110,70,0.16)', hoop: '#8c9496', h: ['#c4cacb', '#8a9294', '#4a5254'], grip: '#1e2124' },
  { len: 34, r: 9, bag: 16, step: 1.5, mesh: 'rgba(225,230,224,0.75)', tint: 'rgba(230,236,232,0.14)', hoop: '#c3c9cb', h: ['#d4dadb', '#9aa2a4', '#5a6264'], grip: '#202326' },
  { len: 66, r: 10, bag: 20, step: 2.0, mesh: 'rgba(40,52,52,0.95)', tint: 'rgba(30,40,40,0.2)', hoop: '#26292c', h: ['#9aa2a4', '#646c70', '#2c3236'], grip: '#16181a', collar: '#c8641e' },
  { len: 56, r: 12, bag: 18, step: 1.2, mesh: 'rgba(200,215,214,0.55)', tint: 'rgba(190,210,212,0.28)', hoop: '#1a1c1e', h: ['#4a5056', '#24282c', '#0e1012'], grip: '#141618', collar: '#d6702a', dframe: true },
];

// The net. ang is unused here (the caller rotates); flutter 0..1 moves the bag.
// catchSp: {sp, len, t} shows a fish thrashing in the bag.
export function drawNet(ctx, u, tier, t, flutter, catchSp) {
  const L = NET_LOOK[clamp(tier, 0, 3)];
  const len = L.len * u, r = L.r * u;
  // ---- handle ----
  tube(ctx, -4 * u, len, 1.05 * u, L.h[0], L.h[1], L.h[2]);
  // grip tape: a dark wrapped section with ridges
  ctx.fillStyle = L.grip; ctx.beginPath(); ctx.roundRect(-4.5 * u, -1.35 * u, 12 * u, 2.7 * u, 1 * u); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.4 * u;
  for (let k = -3; k < 7; k += 1.2) { ctx.beginPath(); ctx.moveTo(k * u, -1.3 * u); ctx.lineTo(k * u + 0.8 * u, 1.3 * u); ctx.stroke(); }
  ctx.fillStyle = '#0c0d0e'; ctx.beginPath(); ctx.roundRect(-5.6 * u, -1.25 * u, 1.6 * u, 2.5 * u, 0.6 * u); ctx.fill(); // end cap
  if (L.collar) {
    // telescopic sections: a twist-lock collar where the poles meet, and a lanyard ring
    const cx = tier === 2 ? len * 0.5 : len * 0.42;
    ctx.fillStyle = L.collar; ctx.beginPath(); ctx.roundRect(cx - 2 * u, -1.6 * u, 4 * u, 3.2 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = -1.4; k < 1.6; k += 0.9) ctx.fillRect(cx + k * u, -1.6 * u, 0.35 * u, 3.2 * u);
    tube(ctx, cx + 2 * u, len, 0.85 * u, L.h[0], L.h[1], L.h[2]);
  }
  // ---- hoop (seen a little from above: an ellipse along the handle) and the bag ----
  const hx = len + r; // hoop centre
  const sway = Math.sin(t * 5) * 0.12 + flutter * 0.6;
  // the bag trails behind the sweep (+y side), drawn first so the hoop sits over it
  const tipX = hx - r * 0.2 + sway * 4 * u, tipY = r * 0.3 + L.bag * u;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(hx - r, 0);
  ctx.bezierCurveTo(hx - r * 1.05, tipY * 0.55, tipX - r * 0.55, tipY, tipX, tipY);
  ctx.bezierCurveTo(tipX + r * 0.6, tipY, hx + r * 1.05, tipY * 0.45, hx + r, 0);
  ctx.closePath();
  ctx.fillStyle = L.tint; ctx.fill();
  ctx.clip();
  if (catchSp) {
    // the catch thrashing in the mesh
    const k = clamp(catchSp.t / 1.1, 0, 1);
    const fl = Math.max(5 * u, Math.min(r * 1.4, catchSp.len * 50 * u));
    ctx.save(); ctx.translate(hx * 0.5 + tipX * 0.5, tipY * 0.55);
    ctx.rotate(Math.sin(catchSp.t * 24) * 0.5 * (1 - k * 0.6) + 0.3);
    ctx.globalAlpha = 0.95;
    drawSpecies(ctx, catchSp.sp, fl, t * 3, 1, 0);
    ctx.restore();
  }
  mesh(ctx, hx - r * 1.3, -2 * u, hx + r * 1.3, tipY + 2 * u, L.step * u, L.mesh, Math.max(0.5, 0.32 * u));
  ctx.restore();
  // seam down the bag
  ctx.strokeStyle = L.mesh; ctx.lineWidth = 0.5 * u;
  ctx.beginPath(); ctx.moveTo(hx, 0); ctx.quadraticCurveTo(hx + sway * 2 * u, tipY * 0.6, tipX, tipY); ctx.stroke();
  // the frame
  ctx.lineWidth = (L.dframe ? 1.7 : 1.1) * u; ctx.strokeStyle = L.hoop;
  ctx.beginPath();
  if (L.dframe) {
    // D-frame: a straight leading edge (for scooping along the bottom) and a round back
    ctx.moveTo(hx - r, -r * 0.42); ctx.lineTo(hx - r, r * 0.42);
    ctx.ellipse(hx - r, 0, r * 2, r * 0.42, 0, Math.PI / 2, -Math.PI / 2, true);
  } else ctx.ellipse(hx, 0, r, r * 0.4, 0, 0, TAU);
  ctx.stroke();
  if (L.dframe) {
    // padded rim
    ctx.strokeStyle = 'rgba(214,112,42,0.85)'; ctx.lineWidth = 0.7 * u;
    ctx.beginPath(); ctx.ellipse(hx - r, 0, r * 2, r * 0.42, 0, -Math.PI / 2 + 0.2, Math.PI / 2 - 0.2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.45 * u;
  ctx.beginPath(); ctx.ellipse(hx, -0.2 * u, r * 0.96, r * 0.36, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); // glint
  // ferrule where the handle meets the hoop
  ctx.fillStyle = L.h[2]; ctx.beginPath(); ctx.roundRect(len - 2 * u, -1.3 * u, 4 * u, 2.6 * u, 0.6 * u); ctx.fill();
  return { tipX: hx, tipY: 0 };
}

// The slurp gun: a clear tube, a spring plunger, a nozzle. pull 0..1 draws the plunger back.
export function drawSlurp(ctx, u, tier, t, pull, held) {
  const pro = tier >= 1;
  const len = (pro ? 36 : 28) * u, r = (pro ? 2.6 : 2.2) * u, x0 = -10 * u, x1 = x0 + len;
  // plunger rod out of the back, with a T-handle
  const back = pull * 7 * u;
  ctx.fillStyle = '#8e969a'; ctx.fillRect(x0 - 6 * u - back, -0.45 * u, 7 * u + back + 4 * u, 0.9 * u);
  ctx.fillStyle = '#1a1c1e'; ctx.beginPath(); ctx.roundRect(x0 - 7.6 * u - back, -2.6 * u, 1.8 * u, 5.2 * u, 0.7 * u); ctx.fill();
  // pistol grip under the pro barrel
  if (pro) {
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.moveTo(-3 * u, r); ctx.lineTo(1.5 * u, r); ctx.lineTo(0.5 * u, r + 6 * u); ctx.lineTo(-3.4 * u, r + 5.6 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#26292c'; ctx.lineWidth = 0.6 * u; ctx.beginPath(); ctx.moveTo(2.2 * u, r); ctx.quadraticCurveTo(3.6 * u, r + 2.4 * u, 1.8 * u, r + 3 * u); ctx.stroke(); // trigger guard
  }
  // the fish inside, if it has one
  if (held) {
    const fl = Math.min(len * 0.45, Math.max(4 * u, held.len * 50 * u));
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2 * u, -r * 0.9, len - 6 * u, r * 1.8); ctx.clip();
    ctx.translate(x0 + len * 0.62, Math.sin(t * 9) * r * 0.2); ctx.rotate(Math.sin(t * 13) * 0.15);
    drawSpecies(ctx, held.sp, fl, t * 3, 1, 0);
    ctx.restore();
  }
  // spring and plunger head inside the rear half
  const ph = x0 + 3 * u + (1 - pull) * len * 0.05;
  ctx.strokeStyle = 'rgba(170,180,184,0.8)'; ctx.lineWidth = 0.4 * u;
  ctx.beginPath(); ctx.moveTo(x0 + 1.5 * u, 0);
  const coils = 9, sx = (ph - x0 - 1.5 * u) / coils;
  for (let k = 0; k <= coils; k++) ctx.lineTo(x0 + 1.5 * u + k * sx, (k % 2 ? 1 : -1) * r * 0.75);
  ctx.stroke();
  ctx.fillStyle = '#2a2d30'; ctx.fillRect(ph, -r * 0.85, 1.2 * u, r * 1.7);
  // clear barrel: faint fill, bright edges, a long highlight
  ctx.fillStyle = pro ? 'rgba(150,190,215,0.2)' : 'rgba(210,228,232,0.16)';
  ctx.beginPath(); ctx.roundRect(x0, -r, len, r * 2, r * 0.5); ctx.fill();
  ctx.strokeStyle = pro ? 'rgba(170,205,225,0.65)' : 'rgba(220,235,238,0.55)'; ctx.lineWidth = 0.45 * u; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5 * u;
  ctx.beginPath(); ctx.moveTo(x0 + 2 * u, -r * 0.55); ctx.lineTo(x1 - 3 * u, -r * 0.55); ctx.stroke();
  // end caps
  ctx.fillStyle = '#121416';
  ctx.beginPath(); ctx.roundRect(x0 - 1 * u, -r - 0.4 * u, 1.8 * u, r * 2 + 0.8 * u, 0.5 * u); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x1 - 1 * u, -r - 0.4 * u, 1.8 * u, r * 2 + 0.8 * u, 0.5 * u); ctx.fill();
  // nozzle: a tapering cone
  ctx.fillStyle = '#1c1f22';
  ctx.beginPath(); ctx.moveTo(x1 + 0.6 * u, -r * 0.9); ctx.lineTo(x1 + 5 * u, -0.9 * u); ctx.lineTo(x1 + 5 * u, 0.9 * u); ctx.lineTo(x1 + 0.6 * u, r * 0.9); ctx.closePath(); ctx.fill();
  if (pro) { ctx.fillStyle = '#3a6a8a'; ctx.fillRect(x1 + 1.4 * u, -r * 0.7, 1 * u, r * 1.4); } // one-way valve band
  return { tipX: x1 + 5 * u, tipY: 0 };
}

// the mesh goody bag clipped to his belt, bulging with what is in it
export function drawBeltBag(ctx, u, items, t) {
  if (!items.length) return;
  const n = items.length, w = (5 + Math.min(n, 8) * 0.8) * u, h = (6 + Math.min(n, 8) * 0.9) * u;
  const x = 4 * u, y = 7.5 * u + h * 0.5;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.4) * 0.08 + 0.15);
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.5, h * 0.55, 0, 0, TAU);
  ctx.fillStyle = 'rgba(40,52,48,0.55)'; ctx.fill();
  ctx.save(); ctx.clip();
  items.forEach((it, i) => {
    const a = i * 2.4, rr = (i % 3) * 0.25;
    ctx.fillStyle = it.col;
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * w * rr, Math.sin(a) * h * rr * 0.8 + h * 0.1, 2.2 * u, 1.1 * u, a, 0, TAU); ctx.fill();
  });
  mesh(ctx, -w, -h, w, h, 1.6 * u, 'rgba(30,36,34,0.9)', 0.35 * u);
  ctx.restore();
  // the drawstring mouth and the clip
  ctx.fillStyle = '#1a1c1e'; ctx.beginPath(); ctx.roundRect(-w * 0.45, -h * 0.62, w * 0.9, 1.6 * u, 0.6 * u); ctx.fill();
  ctx.strokeStyle = '#6a6e72'; ctx.lineWidth = 0.6 * u; ctx.beginPath(); ctx.arc(0, -h * 0.75, 1.1 * u, 0, TAU); ctx.stroke();
  ctx.restore();
}

// a small picture of a tool, for the hotbar and the shop
export function toolIcon(kind, tier, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (kind === 'net') {
    const L = NET_LOOK[tier];
    const u = w / (L.len + L.r * 2 + 14);
    ctx.translate(6 * u, h * 0.42); ctx.rotate(-0.12);
    drawNet(ctx, u, tier, 0.6, 0, null);
  } else {
    const u = w / (tier ? 56 : 48);
    ctx.translate(w * 0.32, h * 0.45); ctx.rotate(-0.08);
    drawSlurp(ctx, u, tier, 0, 0, null);
  }
  return c;
}
