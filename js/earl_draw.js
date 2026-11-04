// Earl, the submersible and the boat. All drawn in local pixel space.
import { TAU, clamp } from './util.js';

const SUIT = '#121417', SUIT_HI = '#262b31', SUIT_SEAM = '#1d2126';

function limb(ctx, x0, y0, a0, l0, a1, l1, w0, w1, col) {
  const kx = x0 + Math.cos(a0) * l0, ky = y0 + Math.sin(a0) * l0;
  const ex = kx + Math.cos(a1) * l1, ey = ky + Math.sin(a1) * l1;
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.lineWidth = w0; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.lineWidth = w1; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
  return [ex, ey, a1];
}

// Earl lies along +x (head at +x). L = his height in pixels (2 m).
// pose: kick phase, moving 0..1, lamp colour (null = off), rim = rim light strength (from surface light)
export function drawEarl(ctx, L, kick, moving, lampCol, rim) {
  const u = L / 100; // 1 unit = 1% of height
  const s1 = Math.sin(kick), s2 = Math.sin(kick + Math.PI);
  const kickAmp = 0.1 + moving * 0.2;
  const hipX = -8 * u, hipY = 1.5 * u;
  const drawLeg = (s, col, finCol, far) => {
    // flutter kick: thigh swings, knee bends on the down-stroke
    const a0 = Math.PI + s * kickAmp + (far ? 0.05 : -0.03);
    const bend = 0.1 + Math.max(0, s) * 0.45 * (0.4 + moving);
    const a1 = a0 - bend * (far ? 1 : 1);
    const [fx, fy, fa] = limb(ctx, hipX, hipY + (far ? -2 * u : 2 * u), a0, 24 * u, a1, 22 * u, 9.5 * u, 7.2 * u, col);
    // fin blade: long, slightly flexing, a little translucent at the tip
    const flex = s * 0.35 * (0.3 + moving);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fa + Math.PI * 0.5 - 0.15 - flex * 0.4);
    ctx.rotate(-Math.PI * 0.5);
    const fg = ctx.createLinearGradient(0, 0, 30 * u, 0);
    fg.addColorStop(0, finCol); fg.addColorStop(0.7, finCol); fg.addColorStop(1, 'rgba(30,34,40,0.55)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(-2 * u, -3.4 * u);
    ctx.quadraticCurveTo(14 * u, -5.5 * u + flex * 3 * u, 31 * u, -4 * u + flex * 7 * u);
    ctx.lineTo(32 * u, 3.2 * u + flex * 7 * u);
    ctx.quadraticCurveTo(14 * u, 4.6 * u + flex * 3 * u, -2 * u, 3.4 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.6 * u;
    ctx.beginPath(); ctx.moveTo(6 * u, -3.8 * u); ctx.quadraticCurveTo(18 * u, -4.4 * u + flex * 3 * u, 30 * u, -3.6 * u + flex * 7 * u); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(1 * u, 0, 6 * u, 3.6 * u, 0, 0, TAU); ctx.fill(); // foot pocket
    ctx.restore();
  };
  drawLeg(s2, '#0b0c0f', 'rgba(12,14,18,0.95)', true);
  // far arm, tucked under the chest
  limb(ctx, 24 * u, 1 * u, Math.PI * 0.55 - moving * 0.3, 12 * u, Math.PI * 0.05 + moving * 0.1, 11 * u, 6 * u, 5 * u, '#0b0c0f');
  // tank on his back (negative y)
  const tg = ctx.createLinearGradient(0, -16 * u, 0, -5 * u);
  tg.addColorStop(0, '#4c5257'); tg.addColorStop(0.3, '#8c949a'); tg.addColorStop(0.55, '#5e666c'); tg.addColorStop(1, '#22272a');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.roundRect(-5 * u, -16 * u, 34 * u, 11 * u, 5.5 * u); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(8 * u, -16 * u, 2 * u, 11 * u); ctx.fillRect(20 * u, -16 * u, 2 * u, 11 * u); // cam bands
  ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.roundRect(28 * u, -13.5 * u, 5 * u, 6 * u, 1 * u); ctx.fill(); // valve
  // hoses
  ctx.strokeStyle = '#08090a'; ctx.lineWidth = 1.7 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(32 * u, -11 * u); ctx.quadraticCurveTo(42 * u, -14 * u, 44 * u, -3 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30 * u, -8 * u); ctx.quadraticCurveTo(30 * u, 6 * u, 18 * u, 8 * u); ctx.stroke();
  // torso
  const bg = ctx.createLinearGradient(0, -9 * u, 0, 9 * u);
  bg.addColorStop(0, SUIT_HI); bg.addColorStop(0.4, SUIT); bg.addColorStop(1, '#060708');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-14 * u, -1 * u);
  ctx.bezierCurveTo(-13 * u, -8 * u, 4 * u, -9 * u, 25 * u, -8.5 * u);
  ctx.bezierCurveTo(33 * u, -8 * u, 36 * u, -2 * u, 34 * u, 4.5 * u);
  ctx.bezierCurveTo(26 * u, 10 * u, 6 * u, 9 * u, -12 * u, 7 * u);
  ctx.bezierCurveTo(-16 * u, 6 * u, -16 * u, 2 * u, -14 * u, -1 * u);
  ctx.closePath(); ctx.fill();
  // BCD jacket, weight belt
  ctx.fillStyle = '#0a0b0d';
  ctx.beginPath(); ctx.roundRect(3 * u, -8 * u, 25 * u, 15.5 * u, 4 * u); ctx.fill();
  ctx.strokeStyle = SUIT_SEAM; ctx.lineWidth = 1.1 * u;
  ctx.beginPath(); ctx.moveTo(7 * u, -7 * u); ctx.lineTo(7 * u, 7 * u); ctx.moveTo(22 * u, -7 * u); ctx.lineTo(22 * u, 7 * u); ctx.stroke();
  ctx.fillStyle = '#1c1e21'; ctx.fillRect(-4 * u, -7.5 * u, 3 * u, 15 * u);
  ctx.fillStyle = '#3e4246'; ctx.fillRect(-3.6 * u, 5 * u, 2.2 * u, 2.2 * u);
  // near leg
  drawLeg(s1, SUIT, 'rgba(18,20,25,0.97)', false);
  // head: hood + full-face mask
  const hx = 40 * u, hy = -1.5 * u;
  ctx.fillStyle = SUIT;
  ctx.fillRect(32 * u, hy - 4.5 * u, 6 * u, 9 * u); // neck
  const hg = ctx.createRadialGradient(hx - 2 * u, hy - 3 * u, 1, hx, hy, 8 * u);
  hg.addColorStop(0, '#2a2f35'); hg.addColorStop(1, '#0c0d10');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(hx, hy, 8 * u, 7.4 * u, 0, 0, TAU); ctx.fill();
  // visor: dark and reflective - no face
  const vg = ctx.createLinearGradient(hx, hy - 6 * u, hx + 6 * u, hy + 6 * u);
  vg.addColorStop(0, '#36505c'); vg.addColorStop(0.35, '#0d1a20'); vg.addColorStop(1, '#020507');
  ctx.fillStyle = vg;
  ctx.beginPath(); ctx.ellipse(hx + 3.8 * u, hy + 0.8 * u, 5.2 * u, 6.2 * u, 0.12, -1.45, 1.8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#30353a'; ctx.lineWidth = 1.2 * u; ctx.stroke();
  ctx.strokeStyle = 'rgba(210,235,245,0.4)'; ctx.lineWidth = 0.9 * u;
  ctx.beginPath(); ctx.arc(hx + 3.6 * u, hy + 0.2 * u, 4 * u, -1.15, -0.4); ctx.stroke();
  ctx.fillStyle = '#1a1c1f'; ctx.beginPath(); ctx.ellipse(hx + 6.5 * u, hy + 5 * u, 2.2 * u, 2 * u, 0, 0, TAU); ctx.fill(); // regulator
  // headlamp
  ctx.fillStyle = '#2c3034'; ctx.beginPath(); ctx.roundRect(hx - 1 * u, hy - 9.2 * u, 5.5 * u, 3.2 * u, 1 * u); ctx.fill();
  if (lampCol) { ctx.fillStyle = lampCol; ctx.fillRect(hx + 4 * u, hy - 8.8 * u, 1.3 * u, 2.4 * u); }
  // near arm: forearm forward along the body, hand torch in front
  const [hx2, hy2] = limb(ctx, 27 * u, 2 * u, Math.PI * 0.5 - moving * 0.35, 11 * u, -0.05 - moving * 0.05, 12 * u, 6.4 * u, 5.4 * u, SUIT);
  ctx.save(); ctx.translate(hx2, hy2); ctx.rotate(-0.08);
  ctx.fillStyle = '#1d2024'; ctx.beginPath(); ctx.roundRect(-1 * u, -1.8 * u, 9 * u, 3.6 * u, 1.2 * u); ctx.fill();
  ctx.fillStyle = '#3a3f44'; ctx.fillRect(7 * u, -2.2 * u, 1.4 * u, 4.4 * u);
  ctx.restore();
  // rim light from above
  if (rim > 0.02) {
    ctx.strokeStyle = `rgba(170,215,235,${(0.38 * rim).toFixed(3)})`; ctx.lineWidth = 1.2 * u;
    ctx.beginPath(); ctx.moveTo(-4 * u, -16 * u); ctx.lineTo(26 * u, -16 * u); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 7.6 * u, -2.7, -1.0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14 * u, -2 * u); ctx.quadraticCurveTo(-10 * u, -8 * u, -5 * u, -8.5 * u); ctx.stroke();
  }
  return { headX: hx + 4 * u, headY: hy - 8 * u, torchX: hx2 + 8 * u, torchY: hy2 };
}

// Old riveted bathyscaphe. Local origin centre; length ~9 m => Lp pixels. Faces +x.
export function drawSub(ctx, Lp, t, stress, lights) {
  const u = Lp / 100;
  // float hull
  const hg = ctx.createLinearGradient(0, -22 * u, 0, 2 * u);
  hg.addColorStop(0, '#6b7266'); hg.addColorStop(0.4, '#4c5349'); hg.addColorStop(1, '#262a24');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-50 * u, -9 * u);
  ctx.bezierCurveTo(-48 * u, -22 * u, 30 * u, -22 * u, 46 * u, -12 * u);
  ctx.bezierCurveTo(52 * u, -8 * u, 50 * u, 0, 42 * u, 2 * u);
  ctx.lineTo(-44 * u, 2 * u); ctx.closePath(); ctx.fill();
  // rust streaks
  ctx.save(); ctx.clip();
  for (let k = 0; k < 14; k++) {
    const x = -44 * u + k * 6.5 * u;
    ctx.fillStyle = `rgba(${110 + (k % 3) * 10},60,30,${0.12 + (k % 4) * 0.03})`;
    ctx.fillRect(x, -18 * u + (k % 5) * u, 1.4 * u, 16 * u);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-50 * u, -3 * u, 100 * u, 6 * u);
  ctx.restore();
  // rivet seams
  ctx.fillStyle = 'rgba(20,22,18,0.8)';
  for (let k = 0; k < 6; k++) for (let j = 0; j < 9; j++) {
    const x = -38 * u + k * 14 * u, y = -17 * u + j * 2 * u;
    ctx.beginPath(); ctx.arc(x, y, 0.45 * u, 0, TAU); ctx.fill();
  }
  // conning tower / hatch
  ctx.fillStyle = '#3e443b'; ctx.beginPath(); ctx.roundRect(-8 * u, -27 * u, 16 * u, 8 * u, 2 * u); ctx.fill();
  ctx.fillStyle = '#2a2e28'; ctx.fillRect(-3 * u, -30 * u, 6 * u, 3 * u);
  // faded hull number
  ctx.fillStyle = 'rgba(200,190,160,0.35)'; ctx.font = `bold ${6 * u}px monospace`; ctx.fillText('Б-7', -32 * u, -8 * u);
  // gondola sphere
  const gx = 6 * u, gy = 10 * u, gr = 13 * u;
  ctx.fillStyle = '#2c302a'; ctx.fillRect(-4 * u, 0, 20 * u, 4 * u);
  const sg = ctx.createRadialGradient(gx - 5 * u, gy - 5 * u, 1, gx, gy, gr);
  sg.addColorStop(0, '#7a8070'); sg.addColorStop(0.6, '#454b40'); sg.addColorStop(1, '#1e211c');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(15,16,14,0.8)'; ctx.lineWidth = 0.8 * u;
  ctx.beginPath(); ctx.arc(gx, gy, gr * 0.98, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx - gr, gy); ctx.lineTo(gx + gr, gy); ctx.stroke();
  // portholes (warm light from inside)
  const ports = [[gx + 7 * u, gy - 2 * u, 3.2 * u], [gx - 3 * u, gy + 5 * u, 2.2 * u]];
  for (const [px, py, pr] of ports) {
    ctx.fillStyle = '#1a1c18'; ctx.beginPath(); ctx.arc(px, py, pr * 1.35, 0, TAU); ctx.fill();
    const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    pg.addColorStop(0, lights ? '#f6d9a0' : '#3a3428'); pg.addColorStop(1, lights ? '#a8743a' : '#1c1a14');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  }
  // lamps
  ctx.fillStyle = '#1e201c'; ctx.fillRect(44 * u, -6 * u, 5 * u, 4 * u); ctx.fillRect(16 * u, 12 * u, 5 * u, 3.5 * u);
  if (lights) { ctx.fillStyle = '#f2f6ff'; ctx.fillRect(48.5 * u, -5.4 * u, 1 * u, 2.8 * u); ctx.fillRect(20.5 * u, 12.5 * u, 1 * u, 2.5 * u); }
  // manipulator arm
  ctx.strokeStyle = '#3a3e36'; ctx.lineWidth = 1.8 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(14 * u, 16 * u); ctx.lineTo(24 * u, 21 * u); ctx.lineTo(30 * u, 18 * u); ctx.stroke();
  // propeller + fins
  ctx.fillStyle = '#2c302a';
  ctx.beginPath(); ctx.moveTo(-44 * u, -10 * u); ctx.lineTo(-56 * u, -20 * u); ctx.lineTo(-52 * u, -8 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-44 * u, -2 * u); ctx.lineTo(-56 * u, 6 * u); ctx.lineTo(-52 * u, -4 * u); ctx.fill();
  const pa = Math.abs(Math.sin(t * 14));
  ctx.fillStyle = '#4a4e44'; ctx.fillRect(-58 * u, -6 * u - 6 * u * pa, 2 * u, 12 * u * pa + 1);
  // stress cracks
  if (stress > 0.05) {
    ctx.strokeStyle = `rgba(220,230,235,${0.15 + stress * 0.5})`; ctx.lineWidth = 0.6 * u;
    const n = Math.floor(stress * 9);
    for (let k = 0; k < n; k++) {
      const cx = gx + Math.cos(k * 2.4) * gr * 0.6, cy = gy + Math.sin(k * 2.4) * gr * 0.6;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(k) * 4 * u, cy + Math.sin(k * 1.7) * 4 * u); ctx.lineTo(cx + Math.cos(k + 1) * 6 * u, cy + Math.sin(k) * 7 * u); ctx.stroke();
    }
  }
  return { lampA: [49 * u, -4 * u], lampB: [21 * u, 13.5 * u], ports };
}

// Small weathered work boat with an A-frame crane. Origin at the waterline centre. Faces -x (bow left).
export function drawBoat(ctx, Lp, t, sub) {
  const u = Lp / 100;
  const roll = Math.sin(t * 0.8) * 0.02;
  ctx.save(); ctx.rotate(roll);
  // hull below/above water
  const hg = ctx.createLinearGradient(0, -12 * u, 0, 10 * u);
  hg.addColorStop(0, '#3a2e26'); hg.addColorStop(0.45, '#26201b'); hg.addColorStop(1, '#141210');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-50 * u, -12 * u); ctx.lineTo(46 * u, -10 * u); ctx.lineTo(44 * u, 4 * u);
  ctx.quadraticCurveTo(0, 11 * u, -38 * u, 5 * u); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a2a22'; ctx.fillRect(-46 * u, -1 * u, 90 * u, 2.2 * u); // waterline paint
  ctx.fillStyle = 'rgba(200,190,170,0.18)'; ctx.fillRect(-48 * u, -11 * u, 94 * u, 1.2 * u);
  // wheelhouse
  ctx.fillStyle = '#5a5850'; ctx.fillRect(-6 * u, -30 * u, 26 * u, 18 * u);
  ctx.fillStyle = '#2a2a26'; ctx.fillRect(-6 * u, -32 * u, 27 * u, 3 * u);
  ctx.fillStyle = '#9ab0b4'; for (let k = 0; k < 3; k++) ctx.fillRect(-3 * u + k * 8 * u, -26 * u, 5 * u, 5 * u);
  // mast
  ctx.strokeStyle = '#2a2826'; ctx.lineWidth = 1.4 * u;
  ctx.beginPath(); ctx.moveTo(8 * u, -32 * u); ctx.lineTo(8 * u, -55 * u); ctx.moveTo(2 * u, -48 * u); ctx.lineTo(14 * u, -48 * u); ctx.stroke();
  // A-frame crane at the stern (right side) holding the sub cable
  ctx.strokeStyle = '#3e3a34'; ctx.lineWidth = 2.2 * u;
  ctx.beginPath(); ctx.moveTo(34 * u, -11 * u); ctx.lineTo(56 * u, -40 * u); ctx.lineTo(44 * u, -11 * u); ctx.stroke();
  ctx.restore();
  return { craneTip: [56 * u, -40 * u] };
}

// The entity: never shown fully. A huge, wrong silhouette, barely darker than the water.
export function drawEntityShape(ctx, Lp, t, alpha) {
  if (alpha <= 0.002) return;
  const u = Lp / 100;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(-50 * u, 2 * u);
  ctx.bezierCurveTo(-46 * u, -12 * u, -20 * u, -19 * u, 6 * u, -16 * u);
  ctx.bezierCurveTo(22 * u, -14 * u, 34 * u, -7 * u, 40 * u, -3 * u + Math.sin(t * 0.7) * 2 * u);
  ctx.lineTo(62 * u, -14 * u + Math.sin(t * 0.5) * 5 * u);
  ctx.lineTo(56 * u, 1 * u);
  ctx.lineTo(66 * u, 12 * u + Math.sin(t * 0.5) * 5 * u);
  ctx.lineTo(40 * u, 5 * u);
  ctx.bezierCurveTo(30 * u, 10 * u, 6 * u, 18 * u, -18 * u, 14 * u);
  ctx.bezierCurveTo(-34 * u, 12 * u, -46 * u, 10 * u, -50 * u, 2 * u);
  ctx.fill();
  // too many trailing fins
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    const x = -14 * u + k * 9 * u;
    ctx.moveTo(x, 12 * u);
    ctx.quadraticCurveTo(x + 4 * u, 26 * u + Math.sin(t * 0.6 + k) * 4 * u, x + 10 * u, 34 * u + Math.sin(t * 0.4 + k) * 6 * u);
    ctx.lineTo(x + 5 * u, 13 * u); ctx.fill();
  }
  // lower jaw, hanging slightly open
  ctx.beginPath(); ctx.moveTo(-50 * u, 3 * u); ctx.lineTo(-30 * u, 9 * u + Math.sin(t * 0.3) * 2 * u); ctx.lineTo(-42 * u, 12 * u); ctx.fill();
  ctx.restore();
}
