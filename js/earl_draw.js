// Earl, the submersible and the boat. All drawn in local pixel space.
import { TAU, clamp } from './util.js';

const SUIT = '#141619', SUIT_HI = '#2a2f35', SUIT_PANEL = '#24282d', SUIT_SEAM = '#33383e';
const GLOVE = '#0d0e10', BCD = '#1b1d20', WEBBING = '#3a3d41';

// A tapered limb segment with rounded ends (reads as flesh in a wetsuit, not a stick).
function seg(ctx, x0, y0, x1, y1, w0, w1, col) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
  ctx.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  ctx.arc(x1, y1, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
  ctx.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  ctx.arc(x0, y0, w0 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
  ctx.closePath(); ctx.fill();
}
const at = (x, y, a, l) => [x + Math.cos(a) * l, y + Math.sin(a) * l];

// Earl lies along +x (head at +x); his back (tank side) is -y, his front is +y.
// L = his height in pixels. moving 0..1 blends an upright idle pose into a swimming pose.
export function drawEarl(ctx, L, kick, moving, lampCol, rim) {
  const u = L / 100;
  const m = moving;
  const s1 = Math.sin(kick);

  // ---------- legs (drawn far leg first) ----------
  // Knees only ever bend backwards (towards -y), and the legs stay close to the line of the body.
  const hipX = -7 * u;
  const leg = (phase, near) => {
    const s = Math.sin(kick + phase);
    // Local frame: +y is his front, -y his back. A thigh angle just under PI swings the knee
    // slightly forward; the shin then bends back from the knee (angle increases), like a real leg.
    const thighA = Math.PI - (1 - m) * 0.14 - 0.02 + s * (0.04 + 0.15 * m);
    const bend = (1 - m) * 0.26 + m * (0.04 + Math.max(0, -s) * 0.26);      // knee flexion, on the up-stroke
    const shinA = thighA + bend;
    const hx = hipX, hy = near ? 1.6 * u : -1.2 * u;
    const [kx, ky] = at(hx, hy, thighA, 25 * u);
    const [ax, ay] = at(kx, ky, shinA, 23 * u);
    const col = near ? SUIT : '#0d0e11';
    seg(ctx, hx, hy, kx, ky, 11 * u, 8 * u, col);
    seg(ctx, kx, ky, ax, ay, 8 * u, 5 * u, col);
    // calf muscle
    const [cx, cy] = at(kx, ky, shinA, 7 * u);
    // calf muscle bulges on the back of the shin
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx - Math.sin(shinA) * 1.1 * u, cy + Math.cos(shinA) * 1.1 * u, 6 * u, 4.2 * u, shinA, 0, Math.PI * 2); ctx.fill();
    if (near) {
      // knee pad + side seam, visible when lit
      ctx.fillStyle = SUIT_PANEL; ctx.beginPath(); ctx.ellipse(kx, ky + 1.5 * u, 4 * u, 3 * u, thighA, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = SUIT_SEAM; ctx.lineWidth = 0.6 * u;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(ax, ay); ctx.stroke();
      // dive knife strapped to the inside of the calf
      const [k1x, k1y] = at(kx, ky, shinA, 9 * u), [k2x, k2y] = at(kx, ky, shinA, 17 * u);
      ctx.strokeStyle = '#3c4044'; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(k1x, k1y + 2.2 * u); ctx.lineTo(k2x, k2y + 1.4 * u); ctx.stroke();
      ctx.strokeStyle = '#1c1e20'; ctx.lineWidth = 0.9 * u;
      for (const t of [11, 15]) { const [bx, by] = at(kx, ky, shinA, t * u); ctx.beginPath(); ctx.moveTo(bx, by - 2.6 * u); ctx.lineTo(bx, by + 3 * u); ctx.stroke(); }
    }
    // fin: foot pocket + long blade continuing the line of the shin, flexing with the kick
    const flex = -s * (0.12 + 0.3 * m);
    // pointed foot: the fin carries straight on from the shin, so the leg reads as one long line
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(shinA + 0.04);
    ctx.fillStyle = near ? '#1d2024' : '#101215';
    ctx.beginPath(); ctx.ellipse(3 * u, 0, 6 * u, 3.2 * u, 0, 0, Math.PI * 2); ctx.fill(); // foot pocket
    ctx.fillStyle = WEBBING; ctx.fillRect(-1 * u, -2.9 * u, 1.4 * u, 5.4 * u); // heel strap
    const bg = ctx.createLinearGradient(6 * u, 0, 34 * u, 0);
    bg.addColorStop(0, near ? '#1a1d21' : '#0f1114'); bg.addColorStop(1, near ? 'rgba(34,40,48,0.65)' : 'rgba(20,24,30,0.6)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(6 * u, -3.4 * u);
    ctx.quadraticCurveTo(20 * u, -4.4 * u + flex * 4 * u, 33 * u, -3.8 * u + flex * 9 * u);
    ctx.lineTo(34 * u, 3.4 * u + flex * 9 * u);
    ctx.quadraticCurveTo(20 * u, 3.6 * u + flex * 4 * u, 6 * u, 2.6 * u);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.7 * u;
    ctx.beginPath(); ctx.moveTo(8 * u, -3.2 * u); ctx.quadraticCurveTo(20 * u, -4 * u + flex * 4 * u, 32 * u, -3.4 * u + flex * 9 * u); ctx.stroke();
    ctx.restore();
  };

  // ---------- arms ----------
  // Idle: hanging forward of the body, gently sculling at waist height.
  // Swimming: tucked under the chest, hands together - never up at the face.
  const arm = (phase, near) => {
    const sc = Math.sin(kick * 0.7 + phase);
    const shX = 27 * u, shY = near ? 2 * u : -0.5 * u;
    const upA = (1 - m) * (Math.PI - 0.32 + sc * 0.12) + m * (Math.PI * 0.7);
    const foreA = (1 - m) * (Math.PI - 0.95 + sc * 0.25) + m * (Math.PI * 0.12);
    const [ex, ey] = at(shX, shY, upA, 15 * u);
    const [wx, wy] = at(ex, ey, foreA, 13 * u);
    const col = near ? SUIT : '#0d0e11';
    seg(ctx, shX, shY, ex, ey, 7.2 * u, 6 * u, col);
    seg(ctx, ex, ey, wx, wy, 6 * u, 4.6 * u, col);
    // glove
    const [hx, hy] = at(wx, wy, foreA, 3 * u);
    ctx.fillStyle = near ? GLOVE : '#08090a';
    ctx.beginPath(); ctx.ellipse(hx, hy, 3.6 * u, 2.6 * u, foreA, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx - Math.sin(foreA) * 1.5 * u, hy + Math.cos(foreA) * 1.5 * u, 1.8 * u, 1.1 * u, foreA + 0.6, 0, Math.PI * 2); ctx.fill(); // thumb
    if (near) {
      ctx.fillStyle = SUIT_PANEL; ctx.beginPath(); ctx.ellipse(shX - 1 * u, shY, 4.6 * u, 4 * u, upA, 0, Math.PI * 2); ctx.fill(); // shoulder panel
      ctx.fillStyle = '#2a2d31'; ctx.fillRect(wx - 1.6 * u, wy - 1.6 * u, 3.2 * u, 3.2 * u); // dive computer on the wrist
    }
  };

  leg(Math.PI, false);
  arm(Math.PI, false);

  // ---------- tank on his back ----------
  const tg = ctx.createLinearGradient(0, -17.5 * u, 0, -6 * u);
  tg.addColorStop(0, '#4c5257'); tg.addColorStop(0.3, '#9aa2a8'); tg.addColorStop(0.55, '#646c72'); tg.addColorStop(1, '#25292c');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.roundRect(-2 * u, -17.5 * u, 32 * u, 11.5 * u, 5.7 * u); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(8 * u, -17.5 * u, 1.8 * u, 11.5 * u); ctx.fillRect(19 * u, -17.5 * u, 1.8 * u, 11.5 * u); // cam bands
  ctx.fillStyle = '#17191b'; ctx.beginPath(); ctx.roundRect(29 * u, -15 * u, 4.5 * u, 6.5 * u, 1 * u); ctx.fill(); // valve
  ctx.fillStyle = '#3e4347'; ctx.beginPath(); ctx.arc(33.5 * u, -11.5 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill(); // first stage

  // ---------- torso: chest wider than the waist, hips, backside ----------
  const bg = ctx.createLinearGradient(0, -8 * u, 0, 8 * u);
  bg.addColorStop(0, SUIT_HI); bg.addColorStop(0.35, SUIT); bg.addColorStop(1, '#070809');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-10 * u, -3.5 * u);
  ctx.bezierCurveTo(-8 * u, -7.5 * u, -2 * u, -7.2 * u, 3 * u, -6 * u);        // backside -> small of the back
  ctx.bezierCurveTo(10 * u, -5.4 * u, 18 * u, -7.4 * u, 27 * u, -7.6 * u);     // back -> shoulder blades
  ctx.bezierCurveTo(32 * u, -7.4 * u, 34 * u, -4 * u, 34 * u, -1.5 * u);       // shoulders -> neck
  ctx.bezierCurveTo(33 * u, 4 * u, 29 * u, 8 * u, 23 * u, 8 * u);             // chest
  ctx.bezierCurveTo(16 * u, 7.8 * u, 11 * u, 6 * u, 6 * u, 6.2 * u);            // belly
  ctx.bezierCurveTo(0 * u, 6.6 * u, -6 * u, 6.4 * u, -10 * u, 3.5 * u);        // hips -> crotch
  ctx.closePath(); ctx.fill();
  // BCD jacket over the torso
  ctx.fillStyle = BCD;
  ctx.beginPath();
  ctx.moveTo(4 * u, -6.2 * u); ctx.lineTo(28 * u, -7.4 * u); ctx.quadraticCurveTo(31 * u, 0, 28 * u, 7.4 * u);
  ctx.lineTo(9 * u, 6.4 * u); ctx.quadraticCurveTo(3 * u, 0, 4 * u, -6.2 * u); ctx.closePath(); ctx.fill();
  // pocket bulge, shoulder strap, chest strap + buckle
  ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.roundRect(8 * u, 1.5 * u, 9 * u, 6 * u, 2 * u); ctx.fill();
  ctx.strokeStyle = WEBBING; ctx.lineWidth = 1.3 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(27 * u, -7 * u); ctx.quadraticCurveTo(25 * u, 0, 26 * u, 7 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22 * u, 6.5 * u); ctx.lineTo(22 * u, 3 * u); ctx.stroke();
  ctx.fillStyle = '#55595d'; ctx.fillRect(20.8 * u, 5.6 * u, 2.6 * u, 1.8 * u);
  // weight belt
  ctx.fillStyle = '#0b0c0d'; ctx.beginPath(); ctx.roundRect(-1 * u, -6.8 * u, 3.6 * u, 13.6 * u, 1 * u); ctx.fill();
  ctx.fillStyle = '#6a6e72'; ctx.fillRect(-0.4 * u, 4.4 * u, 2.4 * u, 2.2 * u);
  // low-pressure inflator hose from the left shoulder down the front
  ctx.strokeStyle = '#0a0b0c'; ctx.lineWidth = 1.8 * u;
  ctx.beginPath(); ctx.moveTo(31 * u, -4 * u); ctx.quadraticCurveTo(30 * u, 9 * u, 21 * u, 9.5 * u); ctx.stroke();
  // yellow backup regulator clipped at the chest + pressure gauge console at the hip
  ctx.strokeStyle = '#7a6a1e'; ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.moveTo(33 * u, -11 * u); ctx.quadraticCurveTo(36 * u, 2 * u, 29 * u, 6.5 * u); ctx.stroke();
  ctx.fillStyle = '#b8a02a'; ctx.beginPath(); ctx.ellipse(29 * u, 7 * u, 2 * u, 1.5 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0a0b0c'; ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.moveTo(30 * u, -10 * u); ctx.quadraticCurveTo(18 * u, -4 * u, 6 * u, 8 * u); ctx.stroke();
  ctx.fillStyle = '#26292c'; ctx.beginPath(); ctx.arc(6 * u, 8.6 * u, 2.6 * u, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(210,220,215,0.55)'; ctx.beginPath(); ctx.arc(6 * u, 8.6 * u, 1.6 * u, 0, Math.PI * 2); ctx.fill();

  leg(0, true);

  // ---------- head: neoprene hood, full-face mask, nothing visible inside ----------
  const hx = 41 * u, hy = -0.5 * u;
  seg(ctx, 32 * u, -0.5 * u, 37 * u, -0.5 * u, 8 * u, 7.6 * u, SUIT); // neck
  const hg = ctx.createRadialGradient(hx - 2 * u, hy - 3 * u, 1, hx, hy, 8 * u);
  hg.addColorStop(0, '#2e333a'); hg.addColorStop(1, '#0d0e11');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(hx, hy, 7.6 * u, 6.9 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = SUIT_SEAM; ctx.lineWidth = 0.6 * u;
  ctx.beginPath(); ctx.arc(hx - 1 * u, hy, 6 * u, 2.2, 4.1); ctx.stroke(); // hood seam
  ctx.beginPath(); ctx.moveTo(35 * u, -5 * u); ctx.quadraticCurveTo(33.5 * u, -0.5 * u, 35 * u, 4.5 * u); ctx.stroke(); // neck seal
  // mask strap
  ctx.strokeStyle = '#08090a'; ctx.lineWidth = 1.6 * u;
  ctx.beginPath(); ctx.moveTo(hx + 1 * u, hy - 6 * u); ctx.lineTo(hx - 6 * u, hy - 1 * u); ctx.stroke();
  // mask frame and lens (front of the face is +y)
  ctx.fillStyle = '#25282c';
  ctx.beginPath(); ctx.ellipse(hx + 1.8 * u, hy + 3.8 * u, 5 * u, 4.6 * u, 0.3, 0, Math.PI * 2); ctx.fill();
  const vg = ctx.createLinearGradient(hx - 2 * u, hy, hx + 6 * u, hy + 8 * u);
  vg.addColorStop(0, '#3a5866'); vg.addColorStop(0.4, '#0c1a20'); vg.addColorStop(1, '#020507');
  ctx.fillStyle = vg;
  ctx.beginPath(); ctx.ellipse(hx + 2.2 * u, hy + 3.6 * u, 3.9 * u, 3.6 * u, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(215,235,245,0.45)'; ctx.lineWidth = 0.7 * u;
  ctx.beginPath(); ctx.arc(hx + 2.4 * u, hy + 3.4 * u, 2.6 * u, 3.6, 4.6); ctx.stroke(); // reflection
  // integrated regulator below the lens
  ctx.fillStyle = '#16181b'; ctx.beginPath(); ctx.roundRect(hx - 2 * u, hy + 5.6 * u, 4.6 * u, 3.4 * u, 1.2 * u); ctx.fill();
  ctx.strokeStyle = '#0a0b0c'; ctx.lineWidth = 1.6 * u;
  ctx.beginPath(); ctx.moveTo(hx - 1 * u, hy + 8 * u); ctx.quadraticCurveTo(hx - 8 * u, hy + 10 * u, 33 * u, -11 * u); ctx.stroke(); // hose to the tank
  // headlamp on the forehead, above the mask, pointing where he looks
  const beamA = 0.35 + (1 - m) * (Math.PI / 2 - 0.45);
  const lx = hx + 5.4 * u, ly = hy + 0.6 * u;
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(beamA);
  ctx.fillStyle = '#2c3034'; ctx.beginPath(); ctx.roundRect(-2.4 * u, -1.8 * u, 3.6 * u, 3.6 * u, 1 * u); ctx.fill();
  if (lampCol) { ctx.fillStyle = lampCol; ctx.fillRect(1 * u, -1.4 * u, 0.9 * u, 2.8 * u); }
  ctx.restore();

  arm(0, true);

  // ---------- rim light from the surface (strongest near the top) ----------
  if (rim > 0.02) {
    ctx.strokeStyle = `rgba(175,215,235,${(0.4 * rim).toFixed(3)})`; ctx.lineWidth = 1.1 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -17.3 * u); ctx.lineTo(27 * u, -17.3 * u); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 7.3 * u, -2.5, -0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9 * u, -4.5 * u); ctx.quadraticCurveTo(-6 * u, -7.4 * u, 0, -6.8 * u); ctx.stroke();
  }
  return { headX: lx, headY: ly, beamA };
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

// The entity, up close. Local frame: its head (mouth) at the origin, facing -x; the body trails
// along +x for Lp pixels. Drawn after the lighting pass as a near-black mass, so in the dark it is
// invisible except where it blocks light (a lamp beam, a lantern, the bright water above) and by
// its faint pale rim and the dim lights along its flank.
// Returns the eye position and the photophore positions (local) for the glow pass.
export function drawEntity(ctx, Lp, t, fillA, rimA, onlyRim = false) {
  const n = 44, spine = [];
  const prof = (u) => {
    if (u < 0.08) return 0.035 + (u / 0.08) * 0.055;          // blunt snout rising to the brow
    if (u < 0.32) return 0.09 + Math.sin((u - 0.08) / 0.24 * Math.PI) * 0.012; // the massive front
    return 0.09 * Math.pow(1 - (u - 0.32) / 0.68, 1.35) + 0.006; // a long tapering body
  };
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const wave = Math.sin(t * 0.55 - u * 5.5) * Lp * 0.035 * u * u + Math.sin(t * 0.21 + u * 2) * Lp * 0.01 * u;
    spine.push([u * Lp, wave, prof(u) * Lp]);
  }
  const top = spine.map(([x, y, h], i) => [x, y - h * (i < 6 ? 0.9 : 1)]);
  const bot = spine.map(([x, y, h]) => [x, y + h * 0.85]);
  // lower jaw: hangs a little open below the head
  const gape = 0.012 + 0.006 * Math.sin(t * 0.3);
  const body = new Path2D();
  body.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i <= n; i++) body.lineTo(top[i][0], top[i][1]);
  for (let i = n; i >= 3; i--) body.lineTo(bot[i][0], bot[i][1]);
  body.lineTo(Lp * 0.06, bot[3][1] + Lp * gape); // jaw hinge, dropped
  body.lineTo(-Lp * 0.012, bot[0][1] + Lp * gape * 0.6); // jaw tip juts past the snout
  body.lineTo(top[0][0], top[0][1] + Lp * 0.03);
  body.closePath();
  // fins first: long ragged pectoral fins trailing down and back, a torn dorsal ridge, the tail tendrils
  ctx.save();
  if (onlyRim) ctx.globalAlpha = 0;
  ctx.globalAlpha = fillA;
  ctx.fillStyle = '#020304';
  for (const [u0, len, drop] of [[0.2, 0.22, 0.11], [0.24, 0.18, 0.08]]) {
    const [x0, y0] = bot[Math.round(u0 * n)];
    ctx.beginPath(); ctx.moveTo(x0, y0 - Lp * 0.01);
    const sw = Math.sin(t * 0.4 + u0 * 9) * Lp * 0.02;
    ctx.quadraticCurveTo(x0 + len * Lp * 0.5, y0 + drop * Lp * 0.6 + sw, x0 + len * Lp, y0 + drop * Lp + sw);
    for (let k = 0; k < 5; k++) ctx.lineTo(x0 + len * Lp * (0.95 - k * 0.16), y0 + drop * Lp * (0.7 - k * 0.12) + sw * (1 - k * 0.2) + (k % 2) * Lp * 0.015);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 8; i < n - 4; i += 2) {
    const [x, y] = top[i], h = Lp * (0.025 + ((i * 7) % 5) * 0.006) * (1 - i / n);
    ctx.beginPath(); ctx.moveTo(x - Lp * 0.008, y + 1); ctx.lineTo(x + Lp * 0.012 + Math.sin(t * 0.5 + i) * Lp * 0.005, y - h); ctx.lineTo(x + Lp * 0.014, y + 1); ctx.fill();
  }
  ctx.strokeStyle = '#020304'; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const [x, y] = spine[n];
    ctx.lineWidth = Math.max(1, Lp * 0.004);
    ctx.beginPath(); ctx.moveTo(x - Lp * 0.03, y);
    ctx.quadraticCurveTo(x + Lp * 0.08, y + (k - 2) * Lp * 0.02 + Math.sin(t * 0.7 + k) * Lp * 0.02, x + Lp * (0.16 + (k % 3) * 0.04), y + (k - 2) * Lp * 0.045 + Math.sin(t * 0.5 + k * 1.7) * Lp * 0.03);
    ctx.stroke();
  }
  // the body: almost black, a hint of slick grey-green on the back
  // the skin: dark slate, slick, lighter along the back - only lit where a lamp actually reaches it
  const g = ctx.createLinearGradient(0, -Lp * 0.1, 0, Lp * 0.09);
  // darker than the darkest water, so it reads as a black shape gliding through dim light;
  // a lamp still picks out the slick slate of its back
  g.addColorStop(0, '#2c3639'); g.addColorStop(0.35, '#151c1e'); g.addColorStop(0.7, '#080b0c'); g.addColorStop(1, '#030405');
  ctx.fillStyle = g; ctx.fill(body);
  if (!onlyRim) {
    ctx.save(); ctx.clip(body);
    // mottling, old scars, and pale pits along the head
    for (let k = 0; k < 70; k++) {
      const u = ((k * 37) % 100) / 100, i = Math.round(u * n);
      const [x, y, h] = spine[i];
      ctx.fillStyle = k % 3 ? 'rgba(0,0,0,0.25)' : 'rgba(150,170,170,0.12)';
      ctx.beginPath(); ctx.ellipse(x, y + (((k * 53) % 100) / 100 - 0.5) * h * 1.5, Lp * (0.004 + (k % 4) * 0.003), Lp * 0.003, k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(170,185,180,0.18)'; ctx.lineWidth = Math.max(1, Lp * 0.0015);
    for (let k = 0; k < 6; k++) { const x = Lp * (0.1 + k * 0.05); ctx.beginPath(); ctx.moveTo(x, -Lp * 0.04 + k * Lp * 0.004); ctx.lineTo(x + Lp * 0.05, -Lp * 0.025 + (k % 2) * Lp * 0.02); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
  // rim light along the back and brow, as if from far above or from a lamp
  if (rimA > 0.005) {
    ctx.save();
    ctx.strokeStyle = `rgba(150,172,180,${rimA.toFixed(3)})`; ctx.lineWidth = Math.max(1, Lp * 0.0025);
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let i = 1; i < n - 6; i++) ctx.lineTo(top[i][0], top[i][1]); ctx.stroke();
    // wrinkled, scarred skin around the head
    ctx.strokeStyle = `rgba(120,140,145,${(rimA * 0.45).toFixed(3)})`; ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) { const x = Lp * (0.04 + k * 0.022); ctx.beginPath(); ctx.moveTo(x, -Lp * 0.06); ctx.quadraticCurveTo(x + Lp * 0.01, -Lp * 0.02, x - Lp * 0.004, Lp * 0.03); ctx.stroke(); }
    // needle teeth along the hanging jaw
    ctx.strokeStyle = `rgba(200,205,190,${(rimA * 1.2).toFixed(3)})`; ctx.lineWidth = Math.max(0.6, Lp * 0.0012);
    for (let k = 0; k < 14; k++) {
      const x = -Lp * 0.006 + k * Lp * 0.0048, y = bot[0][1] + Lp * gape * 0.6 + k * Lp * 0.0012;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Lp * 0.002, y - Lp * (0.008 + (k % 3) * 0.004)); ctx.stroke();
    }
    ctx.restore();
  }
  const photophores = [];
  for (let i = 6; i < n - 6; i += 2) photophores.push([spine[i][0], spine[i][1] + spine[i][2] * 0.35]);
  return { eye: [Lp * 0.045, -Lp * 0.035], photophores };
}
