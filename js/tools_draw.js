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

// Tag guns. pull 0..1 is the shot (recoil, the sling stretched); loaded shows the dart.
export function drawTagger(ctx, u, tier, t, pull, loaded = true) {
  const kick = -Math.sin(Math.min(1, pull) * Math.PI) * 2.5 * u;
  ctx.save(); ctx.translate(kick, 0);
  let tipX;
  if (tier === 0) {
    // pole tagger: an aluminium pole, an orange rubber sling looped at the back, a steel dart
    const len = 62 * u;
    // the sling: a loop of surgical tubing from the back of the pole to his hand
    ctx.strokeStyle = '#d0702c'; ctx.lineWidth = 1.1 * u; ctx.lineCap = 'round';
    const st = -6 * u - pull * 6 * u;
    ctx.beginPath(); ctx.moveTo(-2 * u, -1 * u); ctx.quadraticCurveTo(st, -2.6 * u, st - 2 * u, 0); ctx.quadraticCurveTo(st, 2.6 * u, -2 * u, 1 * u); ctx.stroke();
    tube(ctx, -2 * u, len, 0.95 * u, '#c4cacb', '#8a9294', '#4a5254');
    ctx.fillStyle = '#1e2124'; ctx.beginPath(); ctx.roundRect(4 * u, -1.25 * u, 10 * u, 2.5 * u, 0.8 * u); ctx.fill(); // grip
    tipX = len;
  } else {
    // pneumatic / satellite: a barrel with a pistol grip and a muzzle, like a short speargun
    const sat = tier === 2, len = (sat ? 44 : 38) * u, r = (sat ? 2.2 : 1.8) * u;
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.moveTo(-2 * u, r); ctx.lineTo(3 * u, r); ctx.lineTo(1.6 * u, r + 7 * u); ctx.lineTo(-3 * u, r + 6.4 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 0.7 * u; ctx.beginPath(); ctx.moveTo(4 * u, r); ctx.quadraticCurveTo(6 * u, r + 3 * u, 3 * u, r + 3.6 * u); ctx.stroke(); // trigger guard
    tube(ctx, -8 * u, len, r, sat ? '#8a9094' : '#3a3e42', sat ? '#5a6064' : '#1e2124', '#0c0d0e');
    ctx.fillStyle = sat ? '#d8b42a' : '#c8641e'; ctx.fillRect(-6 * u, -r, 2.4 * u, r * 2); // band
    ctx.fillStyle = '#2a2d30'; ctx.beginPath(); ctx.roundRect(-11 * u, -r * 1.1, 3.5 * u, r * 2.2, 0.8 * u); ctx.fill(); // air reservoir cap
    ctx.fillStyle = '#0c0d0e'; ctx.beginPath(); ctx.roundRect(len - 1 * u, -r * 1.15, 2.6 * u, r * 2.3, 0.6 * u); ctx.fill(); // muzzle
    tipX = len + 1.6 * u;
  }
  if (loaded) tipX = drawDart(ctx, u, tier, tipX, t);
  ctx.restore();
  return { tipX: tipX + kick, tipY: 0 };
}
// the tag dart (or a satellite tag) sitting in the muzzle; also used for darts in flight
export function drawDart(ctx, u, tier, x0, t) {
  ctx.fillStyle = '#b8bec2'; ctx.fillRect(x0, -0.35 * u, 9 * u, 0.7 * u);                  // steel shaft
  ctx.beginPath(); ctx.moveTo(x0 + 9 * u, -0.9 * u); ctx.lineTo(x0 + 12 * u, 0); ctx.lineTo(x0 + 9 * u, 0.9 * u); ctx.closePath(); ctx.fill(); // barb
  if (tier === 2) {
    // a pop-up satellite tag: a yellow torpedo float with a stub antenna
    ctx.fillStyle = '#e0b82a'; ctx.beginPath(); ctx.ellipse(x0 + 3 * u, -2.2 * u, 4.4 * u, 1.5 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1c1e'; ctx.fillRect(x0 - 1.4 * u, -2.7 * u, 1 * u, 1 * u);
    ctx.strokeStyle = '#1a1c1e'; ctx.lineWidth = 0.4 * u; ctx.beginPath(); ctx.moveTo(x0 - 1.2 * u, -2.2 * u); ctx.lineTo(x0 - 5 * u, -3.4 * u); ctx.stroke();
  } else {
    // a spaghetti tag: a short streamer of yellow-orange plastic
    ctx.strokeStyle = tier === 1 ? '#e8902a' : '#e8d02a'; ctx.lineWidth = 0.8 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 2 * u, 0); ctx.quadraticCurveTo(x0 - 1 * u, -1.6 * u + Math.sin(t * 9) * 0.6 * u, x0 - 4 * u, -0.8 * u); ctx.stroke();
  }
  return x0 + 12 * u;
}

// Cameras. flash 0..1 is the strobe firing.
export function drawCamera(ctx, u, tier, t, flash) {
  let lensX;
  if (tier === 0) {
    // a yellow plastic waterproof compact
    ctx.fillStyle = '#d8b02a'; ctx.beginPath(); ctx.roundRect(-3 * u, -4.5 * u, 12 * u, 8 * u, 1.6 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-2 * u, -4 * u, 10 * u, 1 * u);
    ctx.fillStyle = '#1a1c1e'; ctx.beginPath(); ctx.roundRect(9 * u, -2.4 * u, 2 * u, 4.6 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#28333a'; ctx.beginPath(); ctx.arc(10.6 * u, -0.2 * u, 1.7 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8eef0'; ctx.fillRect(5 * u, -6 * u, 2.4 * u, 1.6 * u); // flash window
    ctx.fillStyle = '#1a1c1e'; ctx.fillRect(0, -5.6 * u, 2.2 * u, 1.2 * u);                // shutter button
    ctx.fillStyle = '#2a2a26'; ctx.beginPath(); ctx.roundRect(-3 * u, -3.6 * u, 2.4 * u, 6.2 * u, 0.8 * u); ctx.fill(); // rubber grip
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.3 * u;
    for (let k = -3; k < 2.6; k += 1) { ctx.beginPath(); ctx.moveTo(-2.8 * u, k * u); ctx.lineTo(-0.8 * u, k * u); ctx.stroke(); }
    ctx.strokeStyle = '#8a8e90'; ctx.lineWidth = 0.4 * u; ctx.beginPath(); ctx.arc(10.6 * u, -0.2 * u, 2.1 * u, 0, TAU); ctx.stroke(); // lens bezel
    ctx.fillStyle = 'rgba(220,240,250,0.6)'; ctx.beginPath(); ctx.arc(10.1 * u, -0.8 * u, 0.5 * u, 0, TAU); ctx.fill();     // glint
    lensX = 12 * u;
  } else {
    // an aluminium (or black, red-trimmed) housing with a port; strobes on jointed arms
    const big = tier === 2;
    const w = (big ? 15 : 13) * u, h = (big ? 11 : 9) * u;
    if (!big) for (const sgn of [-1, 1]) {
      ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 1.1 * u;
      ctx.beginPath(); ctx.moveTo(2 * u, sgn * h * 0.45); ctx.lineTo(-1 * u, sgn * (h * 0.45 + 5 * u)); ctx.lineTo(6 * u, sgn * (h * 0.45 + 8 * u)); ctx.stroke();
      ctx.fillStyle = '#1a1c1e'; ctx.beginPath(); ctx.roundRect(5 * u, sgn * (h * 0.45 + 8 * u) - 2 * u, 5 * u, 4 * u, 1 * u); ctx.fill();
      ctx.fillStyle = flash > 0 ? '#ffffff' : '#c8d2d6'; ctx.fillRect(9.6 * u, sgn * (h * 0.45 + 8 * u) - 1.6 * u, 0.9 * u, 3.2 * u);
    }
    const hg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    hg.addColorStop(0, big ? '#3a3e42' : '#a8b0b4'); hg.addColorStop(0.4, big ? '#1e2124' : '#6a7276'); hg.addColorStop(1, '#16181a');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(-4 * u, -h / 2, w, h, 2 * u); ctx.fill();
    if (big) { ctx.fillStyle = '#a02a20'; ctx.fillRect(-4 * u, -h / 2 + 1.2 * u, w, 0.9 * u); }
    // handles on either side
    ctx.fillStyle = '#121416'; ctx.beginPath(); ctx.roundRect(-6.5 * u, -h * 0.4, 2.6 * u, h * 0.8, 1 * u); ctx.fill();
    // the port: a glass dome (flat for the low-light camera)
    ctx.fillStyle = '#0c0d0e'; ctx.fillRect(w - 4 * u, -h * 0.34, 2 * u, h * 0.68);
    const pg = ctx.createRadialGradient(w - 1 * u, -1 * u, 0.5 * u, w - 2 * u, 0, h * 0.4);
    pg.addColorStop(0, 'rgba(200,225,235,0.75)'); pg.addColorStop(0.5, 'rgba(40,60,70,0.85)'); pg.addColorStop(1, 'rgba(10,14,16,0.95)');
    ctx.fillStyle = pg; ctx.beginPath();
    if (big) ctx.roundRect(w - 2 * u, -h * 0.36, 2.2 * u, h * 0.72, 0.6 * u); else ctx.ellipse(w - 2 * u, 0, 3.4 * u, h * 0.34, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    lensX = w + 1.5 * u;
  }
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(lensX, 0, 0, lensX, 0, 30 * u);
    fg.addColorStop(0, `rgba(255,255,255,${(0.9 * flash).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(lensX, 0, 30 * u, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  return { tipX: lensX, tipY: 0 };
}

// A trap on the seabed. m = pixels per metre; origin on the bottom, centred. catchList: what is in it.
export function drawTrap(ctx, m, type, t, catchList, sp) {
  if (type === 'pot') {
    // a galvanised wire cage: frame, mesh, a funnel entrance on the side, a bait jar inside
    const w = 0.95 * m, h = 0.5 * m;
    ctx.fillStyle = 'rgba(40,46,44,0.25)'; ctx.fillRect(-w / 2, -h, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h, w, h); ctx.clip();
    (catchList || []).forEach((c, i) => {
      ctx.save(); ctx.translate(-w * 0.2 + i * w * 0.35, -h * 0.35); ctx.rotate(Math.sin(t * 3 + i) * 0.1);
      drawSpecies(ctx, c.sp, Math.min(w * 0.45, Math.max(0.15 * m, c.len * m)), t * 2 + i, 0.5, 0);
      ctx.restore();
    });
    mesh(ctx, -w / 2, -h, w / 2, 0, 0.07 * m, 'rgba(150,158,150,0.7)', Math.max(0.5, 0.008 * m));
    ctx.restore();
    // bait jar
    ctx.fillStyle = 'rgba(200,190,150,0.7)'; ctx.beginPath(); ctx.roundRect(w * 0.18, -h * 0.55, 0.12 * m, 0.18 * m, 0.02 * m); ctx.fill();
    ctx.strokeStyle = '#8a928c'; ctx.lineWidth = Math.max(1, 0.025 * m);
    ctx.strokeRect(-w / 2, -h, w, h);
    ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, 0); ctx.stroke();
    // the funnel: a cone of mesh leading in from the left end
    ctx.strokeStyle = 'rgba(160,168,160,0.8)'; ctx.lineWidth = Math.max(0.6, 0.012 * m);
    ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.85); ctx.lineTo(-w * 0.28, -h * 0.55); ctx.lineTo(-w * 0.28, -h * 0.35); ctx.lineTo(-w / 2, -h * 0.12); ctx.stroke();
    // the bridle the line ties to
    ctx.strokeStyle = '#c8b070'; ctx.lineWidth = Math.max(0.8, 0.015 * m);
    ctx.beginPath(); ctx.moveTo(-w * 0.4, -h); ctx.lineTo(0, -h - 0.18 * m); ctx.lineTo(w * 0.4, -h); ctx.stroke();
    return { top: -h - 0.18 * m };
  }
  // the deep trap: a steel cylinder on its side, a lit bait chamber in a window, a lifting eye
  const w = 1.1 * m, h = 0.62 * m;
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, '#6a726e'); g.addColorStop(0.4, '#3a403c'); g.addColorStop(1, '#16191a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 0.12 * m); ctx.fill();
  ctx.fillStyle = '#121414'; ctx.beginPath(); ctx.ellipse(-w / 2 + 0.04 * m, -h / 2, 0.08 * m, h * 0.46, 0, 0, TAU); ctx.fill(); // the funnel mouth
  for (const k of [-0.25, 0.25]) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(k * w - 0.02 * m, -h, 0.04 * m, h); }        // bands
  // the window into the bait chamber, glowing
  const pulse = 0.7 + 0.3 * Math.sin(t * 2.3);
  const wg = ctx.createRadialGradient(w * 0.15, -h * 0.5, 0, w * 0.15, -h * 0.5, 0.2 * m);
  wg.addColorStop(0, `rgba(170,255,220,${(0.95 * pulse).toFixed(3)})`); wg.addColorStop(1, 'rgba(60,140,120,0.3)');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.roundRect(w * 0.02, -h * 0.68, 0.26 * m, h * 0.36, 0.04 * m); ctx.fill();
  (catchList || []).slice(0, 2).forEach((c, i) => {
    ctx.save(); ctx.translate(-w * 0.2 + i * 0.12 * m, -h * 0.45); ctx.globalAlpha = 0.85;
    drawSpecies(ctx, c.sp, Math.min(w * 0.3, Math.max(0.12 * m, c.len * m * 0.6)), t * 2 + i, 0.4, 0); ctx.restore();
  });
  ctx.strokeStyle = '#8a908a'; ctx.lineWidth = Math.max(1, 0.03 * m); ctx.beginPath(); ctx.arc(0, -h - 0.08 * m, 0.07 * m, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#2a2e2c'; ctx.fillRect(-w * 0.42, -0.05 * m, 0.12 * m, 0.05 * m); ctx.fillRect(w * 0.3, -0.05 * m, 0.12 * m, 0.05 * m); // skids
  return { top: -h - 0.15 * m, glow: [w * 0.15, -h * 0.5] };
}
// the marker buoy at the surface: an orange float with a short flag pole
export function drawBuoy(ctx, m, t) {
  const r = 0.22 * m;
  ctx.strokeStyle = '#2a2a26'; ctx.lineWidth = Math.max(1, 0.025 * m);
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r - 0.9 * m); ctx.stroke();
  ctx.fillStyle = '#d23a22'; ctx.beginPath(); ctx.moveTo(0, -r - 0.9 * m); ctx.lineTo(0.32 * m, -r - 0.8 * m + Math.sin(t * 4) * 0.03 * m); ctx.lineTo(0, -r - 0.68 * m); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffb070'); g.addColorStop(0.5, '#e8641e'); g.addColorStop(1, '#8a3410');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-r, -r * 0.12, r * 2, r * 0.24);
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
  } else if (kind === 'slurp') {
    const u = w / (tier ? 56 : 48);
    ctx.translate(w * 0.32, h * 0.45); ctx.rotate(-0.08);
    drawSlurp(ctx, u, tier, 0, 0, null);
  } else if (kind === 'tag') {
    const u = w / (tier === 0 ? 86 : tier === 2 ? 72 : 64);
    ctx.translate(w * (tier === 0 ? 0.12 : 0.2), h * 0.42); ctx.rotate(-0.06);
    drawTagger(ctx, u, tier, 0.4, 0, true);
  } else if (kind === 'trap') {
    ctx.translate(w / 2, h * 0.86);
    drawTrap(ctx, h * 1.1, tier ? 'deep' : 'pot', 0.5, []);
  } else if (kind === 'cam') {
    const u = h / (tier === 0 ? 14 : 30);
    ctx.translate(w * 0.42, h * 0.5);
    drawCamera(ctx, u, tier, 0, 0);
  }
  return c;
}
