// Earl, the submersible and the boat. All drawn in local pixel space.
import { TAU, clamp, lerp, shade } from './util.js';
import { drawNet, drawSlurp, drawBeltBag, drawTagger, drawCamera } from './tools_draw.js';
import { drawSpecies } from './creatures_draw.js';

let SUIT = '#141619', SUIT_HI = '#2a2f35', SUIT_PANEL = '#24282d', SUIT_SEAM = '#33383e';
let GLOVE = '#0d0e10', BCD = '#23272c', WEBBING = '#3a3d41';
// each suit's colours: [suit, highlight, panel, seam, glove]
const SUIT_LOOK = {
  wet: ['#1a1d21', '#3c434b', '#2d3339', '#2f7480', '#0f1012'], // charcoal neoprene, grey panels, a teal trim
  skin: ['#10223a', '#2a4a6e', '#163050', '#3a5a80', '#0b1626'],
  dry: ['#1a1b1d', '#34363a', '#b8501e', '#c86a30', '#121314'],
  chain: ['#1a1c1f', '#4a4e54', '#2a2d31', '#3a3e44', '#121315'],
  rebreather: ['#16191a', '#2c3236', '#2e3a2a', '#42503a', '#0e1011'],
  hard: ['#c8a23a', '#ecd27a', '#8a6a1e', '#6a5014', '#3a3a3a'],
};

// A tapered limb segment with rounded ends (reads as flesh in a wetsuit, not a stick).
// Shaded across its width (lit from his back, shadowed on his front), so it reads round.
function seg(ctx, x0, y0, x1, y1, w0, w1, col, shade = true) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
  if (shade) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, w = Math.max(w0, w1) / 2;
    const g = ctx.createLinearGradient(mx - nx * w, my - ny * w, mx + nx * w, my + ny * w);
    g.addColorStop(0, col === SUIT ? SUIT_HI : col); g.addColorStop(0.45, col); g.addColorStop(1, '#050607');
    ctx.fillStyle = g;
  } else ctx.fillStyle = col;
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
// gear (optional): { kind: 'net'|'slurp', tier, sweep: 0..1 while in use (else null), t,
//   catchSp: a fish in the net, held: a fish in the slurp gun, bag: [{col}] for the belt bag }
export function drawEarl(ctx, L, kick, moving, lampCol, rim, gear) {
  const u = L / 100;
  const look = SUIT_LOOK[(gear && gear.suit) || 'wet'] || SUIT_LOOK.wet;
  [SUIT, SUIT_HI, SUIT_PANEL, SUIT_SEAM, GLOVE] = look;
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
    bg.addColorStop(0, near ? '#1d3346' : '#101b25'); bg.addColorStop(0.6, near ? '#24506a' : '#152a38'); bg.addColorStop(1, near ? 'rgba(60,120,150,0.55)' : 'rgba(30,60,80,0.5)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(6 * u, -3.4 * u);
    ctx.quadraticCurveTo(20 * u, -4.4 * u + flex * 4 * u, 33 * u, -3.8 * u + flex * 9 * u);
    ctx.lineTo(34 * u, 3.4 * u + flex * 9 * u);
    ctx.quadraticCurveTo(20 * u, 3.6 * u + flex * 4 * u, 6 * u, 2.6 * u);
    ctx.closePath(); ctx.fill();
    // stiff side rails and the channels moulded into the blade
    ctx.strokeStyle = near ? '#14181c' : '#0b0d10'; ctx.lineWidth = 1.1 * u;
    ctx.beginPath(); ctx.moveTo(6 * u, -3.4 * u); ctx.quadraticCurveTo(20 * u, -4.4 * u + flex * 4 * u, 33 * u, -3.8 * u + flex * 9 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6 * u, 2.6 * u); ctx.quadraticCurveTo(20 * u, 3.6 * u + flex * 4 * u, 34 * u, 3.4 * u + flex * 9 * u); ctx.stroke();
    if (near) {
      ctx.strokeStyle = 'rgba(140,200,220,0.16)'; ctx.lineWidth = 0.5 * u;
      for (const k of [-1.6, 0, 1.6]) { ctx.beginPath(); ctx.moveTo(9 * u, k * 0.8 * u); ctx.quadraticCurveTo(21 * u, k * u + flex * 4 * u, 31 * u, k * 1.1 * u + flex * 9 * u); ctx.stroke(); }
    }
    ctx.restore();
  };

  // ---------- arms ----------
  // Idle: hanging forward of the body, gently sculling at waist height.
  // Swimming: tucked under the chest, hands together - never up at the face.
  const arm = (phase, near, pose) => {
    const sc = Math.sin(kick * 0.7 + phase);
    const shX = 27 * u, shY = near ? 2 * u : -0.5 * u;
    let upA = (1 - m) * (Math.PI - 0.32 + sc * 0.12) + m * (Math.PI * 0.7);
    let foreA = (1 - m) * (Math.PI - 0.95 + sc * 0.25) + m * (Math.PI * 0.12);
    if (pose) { upA = pose.upA; foreA = pose.foreA; }
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
    return { hx, hy, foreA };
  };

  leg(Math.PI, false);
  arm(Math.PI, false);

  // ---------- tank on his back ----------
  const tg = ctx.createLinearGradient(0, -17.5 * u, 0, -6 * u);
  tg.addColorStop(0, '#4c5257'); tg.addColorStop(0.3, '#9aa2a8'); tg.addColorStop(0.55, '#646c72'); tg.addColorStop(1, '#25292c');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.roundRect(-2 * u, -17.5 * u, 32 * u, 11.5 * u, 5.7 * u); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(8 * u, -17.5 * u, 1.8 * u, 11.5 * u); ctx.fillRect(19 * u, -17.5 * u, 1.8 * u, 11.5 * u); // cam bands
  ctx.fillStyle = 'rgba(225,215,170,0.55)'; ctx.fillRect(24 * u, -17.5 * u, 2.4 * u, 11.5 * u); // inspection band
  ctx.fillStyle = '#121416'; ctx.beginPath(); ctx.roundRect(-2.4 * u, -17.6 * u, 5 * u, 11.7 * u, 2.2 * u); ctx.fill(); // rubber boot
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
  // the jacket's piping in the suit's trim colour
  ctx.strokeStyle = SUIT_SEAM; ctx.lineWidth = 0.6 * u;
  ctx.beginPath(); ctx.moveTo(4.5 * u, -5.8 * u); ctx.lineTo(27.5 * u, -6.9 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9.5 * u, 6 * u); ctx.lineTo(27.5 * u, 6.9 * u); ctx.stroke();
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

  // the specimen bag on his belt
  if (gear && gear.bag && gear.bag.length) drawBeltBag(ctx, u, gear.bag, gear.t);

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

  // ---------- the tool in his near hand ----------
  // net: wind up over his head, sweep down through the water in front of him, recover.
  // slurp gun: arm straight out in front while it fires and reloads.
  let pose = null, toolA = null, pull = 0;
  if (gear) {
    const sw = gear.sweep;
    const carryUp = (1 - m) * (Math.PI - 0.32) + m * (Math.PI * 0.7);
    const ease = (x) => x * x * (3 - 2 * x);
    if (sw !== null && sw !== undefined && gear.kind === 'net') {
      let a;
      if (sw < 0.25) a = lerp(carryUp, -0.75, ease(sw / 0.25));
      else if (sw < 0.62) a = lerp(-0.75, 1.55, ease((sw - 0.25) / 0.37));
      else a = lerp(1.55, carryUp, ease((sw - 0.62) / 0.38));
      pose = { upA: a, foreA: a - 0.18 };
      toolA = a - 0.22;
    } else if ((gear.kind === 'tag' || gear.kind === 'cam') && (gear.aimLocal !== null || (sw !== null && sw !== undefined))) {
      // tag gun and camera: the arm points where he aims
      const a = gear.aimLocal !== null ? gear.aimLocal : 0.1;
      pose = { upA: a + 0.22, foreA: a + 0.02 };
      toolA = a;
      pull = sw !== null && sw !== undefined ? clamp(1 - sw * 3, 0, 1) : 0;
    } else if (sw !== null && sw !== undefined) {
      pose = { upA: 0.32, foreA: 0.12 };
      toolA = 0.1;
      pull = sw < 0.12 ? sw / 0.12 : 1 - (sw - 0.12) / 0.88;
    }
  }
  if (gear && gear.kind === 'none') { pose = null; }
  const hand = arm(0, true, pose);
  let tip = null;
  if (gear && gear.kind !== 'none') {
    if (toolA === null) toolA = gear.kind === 'net' ? lerp(hand.foreA - 0.5, Math.PI * 0.94, m) : hand.foreA;
    ctx.save(); ctx.translate(hand.hx, hand.hy); ctx.rotate(toolA);
    const r = gear.kind === 'net'
      ? drawNet(ctx, u, gear.tier, gear.t, gear.sweep !== null && gear.sweep !== undefined ? Math.sin(gear.sweep * Math.PI) : 0, gear.catchSp)
      : gear.kind === 'tag' ? drawTagger(ctx, u, gear.tier, gear.t, pull, gear.loaded)
      : gear.kind === 'cam' ? drawCamera(ctx, u, gear.tier, gear.t, gear.flash || 0)
      : drawSlurp(ctx, u, gear.tier, gear.t, pull, gear.held);
    ctx.restore();
    tip = { x: hand.hx + Math.cos(toolA) * r.tipX, y: hand.hy + Math.sin(toolA) * r.tipX };
    // redraw the glove over the grip so the hand holds it
    ctx.fillStyle = GLOVE; ctx.beginPath(); ctx.ellipse(hand.hx, hand.hy, 3.4 * u, 2.5 * u, toolA, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- what the suit adds ----------
  const suitK = gear && gear.suit;
  if (suitK === 'chain') {
    // steel mesh: a fine crosshatch of bright links over the torso
    ctx.save(); ctx.beginPath(); ctx.ellipse(16 * u, 0, 18 * u, 7.5 * u, 0, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(190,198,206,0.45)'; ctx.lineWidth = 0.35 * u;
    for (let k = -30; k < 40; k += 1.4) { ctx.beginPath(); ctx.moveTo(k * u, -8 * u); ctx.lineTo((k + 8) * u, 8 * u); ctx.moveTo(k * u, 8 * u); ctx.lineTo((k + 8) * u, -8 * u); ctx.stroke(); }
    ctx.restore();
  } else if (suitK === 'rebreather') {
    // the counterlung: a breathing bag on his chest, and the scrubber canister on his back
    ctx.fillStyle = '#26301f'; ctx.beginPath(); ctx.roundRect(12 * u, 3.5 * u, 12 * u, 5 * u, 2 * u); ctx.fill();
    ctx.strokeStyle = '#4a5a3a'; ctx.lineWidth = 0.5 * u; ctx.stroke();
    ctx.fillStyle = '#d0b030'; ctx.fillRect(14 * u, 5 * u, 2 * u, 1.2 * u);
  } else if (suitK === 'hard') {
    // a walking pressure vessel: ringed joints and a domed viewport
    ctx.strokeStyle = 'rgba(60,44,10,0.75)'; ctx.lineWidth = 1 * u;
    for (const [x, y] of [[4, -6], [4, 6], [12, -6.5], [12, 6.5], [20, -7], [20, 7], [28, -6], [28, 6]]) { ctx.beginPath(); ctx.moveTo(x * u, y * u); ctx.lineTo(x * u, 0); ctx.stroke(); }
    const dg = ctx.createRadialGradient(43 * u, 1 * u, 1 * u, 42 * u, 0, 9 * u);
    dg.addColorStop(0, '#f0d27a'); dg.addColorStop(1, '#7a5a18');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(42 * u, -0.5 * u, 8.6 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e1a20'; ctx.beginPath(); ctx.arc(45 * u, 2.5 * u, 4.6 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,250,0.45)'; ctx.lineWidth = 0.6 * u; ctx.beginPath(); ctx.arc(45 * u, 2 * u, 3.4 * u, 3.6, 4.6); ctx.stroke();
    ctx.strokeStyle = '#5a4210'; ctx.lineWidth = 1 * u; ctx.beginPath(); ctx.arc(45 * u, 2.5 * u, 4.8 * u, 0, Math.PI * 2); ctx.stroke();
  }

  // ---------- rim light from the surface (strongest near the top) ----------
  if (rim > 0.02) {
    ctx.strokeStyle = `rgba(175,215,235,${(0.4 * rim).toFixed(3)})`; ctx.lineWidth = 1.1 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -17.3 * u); ctx.lineTo(27 * u, -17.3 * u); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 7.3 * u, -2.5, -0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9 * u, -4.5 * u); ctx.quadraticCurveTo(-6 * u, -7.4 * u, 0, -6.8 * u); ctx.stroke();
  }
  return { headX: lx, headY: ly, beamA, tip };
}

// The submersible. Local origin centre; length ~9 m => Lp pixels. Faces +x.
// look: what the yard has done to her (see subLook): the hull mark from her depth rating, and the
// fittings each upgrade bolts on. arm (optional): { ext 0..1, lx, ly: the target in this local
// frame (px), closed, sp, len }
//
// Five hulls, as her rating goes deeper:
//   Mk I   (to 675 m)    the old riveted Soviet bathyscaphe Б-7: green steel, rust, a conning tower
//   Mk II  (to 1,200 m)  the yard's refit: welded plates, grey paint, bigger ports, a shrouded prop
//   Mk III (to 1,950 m)  a research sub: white hull under an orange float of syntactic foam, a
//                        forged-steel sphere, a low sail, skids
//   Mk IV  (to 2,925 m)  titanium: a pale titanium sphere, yellow foam, side thrusters, LED lamp bars
//   Mk V   (beyond)      full ocean depth: charcoal and white, the sphere faired into the hull, a
//                        teal stripe, vectored thrusters
export const SUB_MARKS = [
  { name: 'Б-7', label: 'Mk I', upTo: 675, number: 'Б-7', top: null, body: ['#79826f', '#5f6858', '#4f574c', '#22261f'], fin: '#30352c', sphere: ['#8a9280', '#4e5548', '#1a1d17'], rivets: 1, rust: 1, rail: true, tower: 'old', ports: [3.1, 2.1] },
  { name: 'Б-7М', label: 'Mk II', upTo: 1200, number: 'Б-7М', top: null, body: ['#7e8a94', '#5c6872', '#47525c', '#1c2227'], fin: '#2c333a', sphere: ['#8e979e', '#4c555c', '#181c20'], rivets: 0.5, rust: 0.35, rail: true, tower: 'old', ports: [3.4, 2.3] },
  { name: 'Margaret Deep', label: 'Mk III', upTo: 1950, number: 'DSV-3', top: ['#e8823a', '#c8642a'], band: -16, body: ['#f0eee6', '#d9d6cc', '#bdb9ae', '#4a4842'], fin: '#c8642a', sphere: ['#9a9e9e', '#5e6264', '#202426'], rivets: 0, rust: 0.12, rail: false, tower: 'sail', ports: [2.7, 1.9], skids: true },
  { name: 'Margaret Ti', label: 'Mk IV', upTo: 2925, number: 'DSV-4', top: ['#f2c43a', '#d8a020'], band: -16, body: ['#f4f4f0', '#dfe0dc', '#c4c6c2', '#4a4c4a'], fin: '#d8a020', sphere: ['#e0e4e6', '#a8aeb2', '#4a5054'], rivets: 0, rust: 0, rail: false, tower: 'sail', ports: [2.3, 1.7], skids: true, thrusters: true, ledBars: true },
  { name: 'Earl', label: 'Mk V', upTo: Infinity, number: 'EARL', top: ['#f6f7f5', '#dfe2e0'], body: ['#4a5258', '#363c42', '#2a2f34', '#111416'], fin: '#2a2f34', sphere: ['#e0e4e6', '#a8aeb2', '#4a5054'], rivets: 0, rust: 0, rail: false, tower: 'hatch', ports: [2.0, 1.5], skids: true, thrusters: true, ledBars: true, faired: true, stripe: '#2fb5a8' },
];
export const markOf = (rated) => SUB_MARKS.findIndex((m) => rated < m.upTo);

export function drawSub(ctx, Lp, t, stress, lights, arm, look = {}) {
  const u = Lp / 100;
  const mk = clamp(look.mark | 0, 0, SUB_MARKS.length - 1), M = SUB_MARKS[mk];
  const sleek = mk >= 2;
  const [cHi, cMid, cBody, cLo] = M.body;
  const P = (x, y) => [x * u, y * u];
  const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0] * u, pts[0][1] * u); for (const [x, y] of pts.slice(1)) ctx.lineTo(x * u, y * u); ctx.closePath(); ctx.fill(); };
  const eng = look.engine || 0;
  // ---------- stern: fins and the propeller in its duct ----------
  if (mk === 4) { // swept X-tail
    poly([[-42, -12], [-55, -24], [-59, -23], [-55, -11]], M.fin);
    poly([[-42, -4], [-55, 8], [-59, 7], [-55, -5]], M.fin);
  } else {
    poly([[-40, -12], [-52, -22], [-57, -21], [-54, -11]], M.fin);
    poly([[-40, -4], [-52, 5], [-57, 4], [-54, -5]], shade(M.fin, -0.12));
  }
  // the propeller: more blades and a bigger disc with each engine refit, spinning faster
  const nBlade = eng >= 10 ? 5 : eng >= 5 ? 4 : 3, pr = 6.5 * (1 + eng * 0.015);
  const spin = t * 14 * (1 + eng * 0.04);
  ctx.fillStyle = sleek ? '#3a3e40' : '#5a5e52';
  for (let k = 0; k < nBlade; k++) { const a = spin + k * TAU / nBlade; const h = Math.sin(a) * pr; ctx.fillRect(-60 * u, (-8.5 + Math.min(0, h)) * u, 1.6 * u, Math.abs(h) * u + 0.5); }
  ctx.fillStyle = '#3c4036'; ctx.beginPath(); ctx.ellipse(-61.5 * u, -8.5 * u, 1.6 * u, 1.6 * u, 0, 0, TAU); ctx.fill(); // hub
  if (look.quiet) {
    // the quiet engine: a thick rubber-lined shroud, ribbed, the prop deep inside it
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.roundRect(-66 * u, -18.5 * u, 12 * u, 4 * u, 2 * u); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-66 * u, -2.5 * u, 12 * u, 4 * u, 2 * u); ctx.fill();
    ctx.strokeStyle = 'rgba(70,74,76,0.6)'; ctx.lineWidth = Math.max(0.5, 0.25 * u);
    for (let x = -65; x <= -55; x += 2.5) { ctx.beginPath(); ctx.moveTo(x * u, -18.3 * u); ctx.lineTo(x * u, -14.7 * u); ctx.moveTo(x * u, -2.3 * u); ctx.lineTo(x * u, 1.3 * u); ctx.stroke(); }
    ctx.fillStyle = 'rgba(12,13,14,0.6)'; ctx.fillRect(-65.5 * u, -14.5 * u, 11 * u, 12 * u);
  } else {
    const dg = ctx.createLinearGradient(0, -16 * u, 0, -1 * u);
    dg.addColorStop(0, sleek ? shade(M.fin, 0.15) : '#6a7262'); dg.addColorStop(0.5, sleek ? M.fin : '#3e443a'); dg.addColorStop(1, '#1e211b');
    ctx.fillStyle = dg;
    const dl = mk >= 1 ? 10 : 8; // the refit lengthened the duct into a proper nozzle
    ctx.beginPath(); ctx.roundRect(-(56 + dl) * u, -16.5 * u, dl * u, 2.4 * u, 1 * u); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-(56 + dl) * u, -2.6 * u, dl * u, 2.4 * u, 1 * u); ctx.fill();
    ctx.fillStyle = 'rgba(20,22,18,0.55)'; ctx.fillRect(-(55.5 + dl) * u, -14.2 * u, (dl - 1) * u, 11.6 * u);
  }
  // ---------- the float hull ----------
  const hull = new Path2D();
  if (!sleek) {
    hull.moveTo(-50 * u, -12 * u);
    hull.bezierCurveTo(-40 * u, -20 * u, -20 * u, -22 * u, 10 * u, -22 * u);
    hull.bezierCurveTo(36 * u, -22 * u, 50 * u, -18 * u, 52 * u, -10 * u);
    hull.bezierCurveTo(53 * u, -3 * u, 46 * u, 2 * u, 36 * u, 2.5 * u);
    hull.lineTo(-20 * u, 2.5 * u);
    hull.bezierCurveTo(-36 * u, 2.5 * u, -46 * u, -2 * u, -50 * u, -6 * u);
  } else {
    // a smoother, fuller fairing with a blunt rounded bow
    hull.moveTo(-53 * u, -10 * u);
    hull.bezierCurveTo(-44 * u, -21 * u, -20 * u, -23.5 * u, 8 * u, -23.5 * u);
    hull.bezierCurveTo(38 * u, -23.5 * u, 54 * u, -18 * u, 54.5 * u, -9 * u);
    hull.bezierCurveTo(55 * u, -1.5 * u, 47 * u, 3 * u, 36 * u, 3 * u);
    hull.lineTo(-22 * u, 3 * u);
    hull.bezierCurveTo(-38 * u, 3 * u, -49 * u, -1.5 * u, -53 * u, -6 * u);
  }
  hull.closePath();
  const hg = ctx.createLinearGradient(0, -23 * u, 0, 3 * u);
  hg.addColorStop(0, cHi); hg.addColorStop(0.18, cMid); hg.addColorStop(0.55, cBody); hg.addColorStop(1, cLo);
  ctx.fillStyle = hg; ctx.fill(hull);
  ctx.save(); ctx.clip(hull);
  if (M.top) {
    // the float: a thick band of syntactic foam along the top, its own colour, shaded round
    const fg = ctx.createLinearGradient(0, -24 * u, 0, -12 * u);
    fg.addColorStop(0, shade(M.top[0], 0.12)); fg.addColorStop(0.5, M.top[0]); fg.addColorStop(1, M.top[1]);
    ctx.fillStyle = fg;
    const bb = M.band || -12; // where the foam meets the hull below
    ctx.beginPath(); ctx.moveTo(-60 * u, -24 * u); ctx.lineTo(60 * u, -24 * u); ctx.lineTo(60 * u, (bb - 0.5) * u);
    ctx.bezierCurveTo(30 * u, (bb - 1.5) * u, -20 * u, (bb - 1) * u, -60 * u, (bb + 1) * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.5, 0.3 * u);
    ctx.beginPath(); ctx.moveTo(-60 * u, (bb + 1) * u); ctx.bezierCurveTo(-20 * u, (bb - 1) * u, 30 * u, (bb - 1.5) * u, 60 * u, (bb - 0.5) * u); ctx.stroke();
    // the shading of a round body over the flat colours
    const vg = ctx.createLinearGradient(0, -24 * u, 0, 3 * u);
    vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(0.35, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(-60 * u, -24 * u, 120 * u, 28 * u);
  }
  if (M.stripe) { ctx.fillStyle = M.stripe; ctx.fillRect(-60 * u, -9.5 * u, 120 * u, 1.3 * u); }
  // plating: riveted seams (Mk I), welded seams with some rivets left (Mk II), panel lines after
  ctx.strokeStyle = sleek ? 'rgba(20,22,22,0.22)' : 'rgba(15,17,13,0.45)'; ctx.lineWidth = Math.max(0.6, (sleek ? 0.22 : 0.35) * u);
  const seams = sleek ? [-30, -6, 22] : [-34, -18, -2, 14, 30];
  for (const x of seams) { ctx.beginPath(); ctx.moveTo(x * u, -24 * u); ctx.quadraticCurveTo((x + 1) * u, -10 * u, x * u, 3 * u); ctx.stroke(); }
  if (!sleek) { ctx.beginPath(); ctx.moveTo(-52 * u, -9 * u); ctx.bezierCurveTo(-20 * u, -11 * u, 30 * u, -11 * u, 54 * u, -8 * u); ctx.stroke(); }
  if (M.rivets) {
    ctx.fillStyle = 'rgba(12,14,10,0.7)';
    for (const [i, x] of seams.entries()) { if (M.rivets < 1 && i % 2) continue; for (let j = 0; j < 9; j++) { ctx.beginPath(); ctx.arc((x + 1.2) * u, (-19.5 + j * 2.4) * u, 0.32 * u, 0, TAU); ctx.fill(); } }
  }
  if (mk === 1) {
    // the refit's new plates, a shade fresher than the old steel around them, with weld beads
    ctx.fillStyle = 'rgba(140,155,165,0.16)';
    for (const [x, y, w, h] of [[-12, -21, 12, 9], [18, -18, 10, 8], [-40, -12, 9, 7]]) { ctx.fillRect(x * u, y * u, w * u, h * u); ctx.strokeStyle = 'rgba(30,34,38,0.5)'; ctx.lineWidth = Math.max(0.5, 0.25 * u); ctx.strokeRect(x * u, y * u, w * u, h * u); }
  }
  if (sleek) {
    // access hatches and lifting points in the fairing
    ctx.strokeStyle = 'rgba(30,32,32,0.3)'; ctx.lineWidth = Math.max(0.5, 0.2 * u);
    for (const [x, y, w, h] of [[-26, -8, 8, 5], [30, -7, 6, 4]]) { ctx.beginPath(); ctx.roundRect(x * u, y * u, w * u, h * u, 0.8 * u); ctx.stroke(); }
  }
  // rust streaks and grime, less with every refit
  const nRust = Math.round(18 * M.rust);
  for (let k = 0; k < nRust; k++) {
    const x = -44 + ((k * 37) % 92), len = 4 + (k % 5) * 2.2;
    const rg = ctx.createLinearGradient(0, -20 * u, 0, (-20 + len) * u);
    rg.addColorStop(0, `rgba(${118 + (k % 3) * 12},62,30,${(0.35 * Math.min(1, M.rust * 1.6)).toFixed(3)})`); rg.addColorStop(1, 'rgba(118,62,30,0)');
    ctx.fillStyle = rg; ctx.fillRect(x * u, -20 * u, (0.5 + (k % 3) * 0.35) * u, len * u);
  }
  ctx.fillStyle = `rgba(10,12,8,${(0.12 + 0.23 * M.rust).toFixed(3)})`; ctx.fillRect(-60 * u, -3 * u, 120 * u, 6 * u);
  ctx.strokeStyle = 'rgba(230,235,225,0.22)'; ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.moveTo(-36 * u, -19 * u); ctx.bezierCurveTo(-10 * u, -21.5 * u, 30 * u, -21.5 * u, 46 * u, -16.5 * u); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(10,12,8,0.6)'; ctx.lineWidth = Math.max(0.6, 0.3 * u); ctx.stroke(hull);
  // horizontal stern plane, seen edge-on
  poly([[-44, -9.5], [-58, -9.2], [-58, -7.6], [-44, -7.4]], shade(M.fin, -0.15));
  // the hull number: never mirrored, whichever way she faces
  {
    const m = ctx.getTransform(), flip = m.a < 0;
    ctx.save(); ctx.translate(28 * u, (M.top ? -5 : -14) * u); if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = M.faired ? 'rgba(225,232,232,0.55)' : M.top ? 'rgba(40,40,38,0.55)' : 'rgba(205,195,165,0.32)'; ctx.font = `bold ${5.5 * u}px monospace`; ctx.textAlign = 'center'; ctx.fillText(M.number, 0, 2 * u);
    ctx.restore();
  }
  // ---------- on deck ----------
  if (M.rail) {
    ctx.strokeStyle = 'rgba(30,33,27,0.95)'; ctx.lineWidth = Math.max(0.6, 0.35 * u);
    ctx.beginPath(); ctx.moveTo(-26 * u, -25 * u); ctx.lineTo(30 * u, -25 * u); ctx.stroke();
    for (let x = -26; x <= 30; x += 4) { ctx.beginPath(); ctx.moveTo(x * u, -25 * u); ctx.lineTo(x * u, -21.8 * u); ctx.stroke(); }
  } else {
    // a lifting eye for the crane, and a strobe
    ctx.strokeStyle = '#3a3e40'; ctx.lineWidth = 0.7 * u; ctx.beginPath(); ctx.arc(-18 * u, -23.4 * u, 1.3 * u, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = lights && (t * 1.2) % 1 < 0.08 ? '#ffffff' : '#5a6064'; ctx.beginPath(); ctx.arc(36 * u, -22.5 * u, 0.6 * u, 0, TAU); ctx.fill();
  }
  // side thrusters (deep marks, or a big engine refit): small ducted pods on the deck
  if (M.thrusters || eng >= 10) {
    for (const x of [-34, 28]) {
      ctx.fillStyle = sleek ? '#2e3236' : '#30352c';
      ctx.fillRect((x - 0.7) * u, -23.5 * u, 1.4 * u, 4 * u); // its pylon down into the hull
      ctx.beginPath(); ctx.roundRect((x - 2.5) * u, -27 * u, 5 * u, 4.2 * u, 1.2 * u); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect((x - 1.8) * u, -26.5 * u, 3.6 * u, 0.8 * u);
      const s2 = Math.sin(t * 30 + x) * 1.6;
      ctx.fillStyle = '#6a6e70'; ctx.fillRect((x - Math.abs(s2)) * u, -25.4 * u, Math.abs(s2) * 2 * u + 0.5, 0.5 * u);
    }
  }
  // ---------- the tower ----------
  if (M.tower === 'old') {
    const tg = ctx.createLinearGradient(-9 * u, 0, 9 * u, 0);
    tg.addColorStop(0, shade(cBody, -0.25)); tg.addColorStop(0.4, cMid); tg.addColorStop(1, shade(cBody, -0.35));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(-9 * u, -21.5 * u); ctx.lineTo(-7 * u, -30 * u); ctx.lineTo(7 * u, -30 * u); ctx.lineTo(10 * u, -21.5 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(10,12,8,0.55)'; ctx.lineWidth = Math.max(0.5, 0.3 * u); ctx.stroke();
    for (const x of [-3.5, 2.5]) { ctx.fillStyle = '#14160f'; ctx.beginPath(); ctx.arc(x * u, -26 * u, 1.2 * u, 0, TAU); ctx.fill(); ctx.fillStyle = lights ? 'rgba(240,200,140,0.8)' : 'rgba(60,70,60,0.8)'; ctx.beginPath(); ctx.arc(x * u, -26 * u, 0.75 * u, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#4a4f44'; ctx.lineWidth = 0.5 * u;
    ctx.beginPath(); ctx.ellipse(0, -31 * u, 3.4 * u, 0.9 * u, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -30 * u); ctx.lineTo(0, -31.8 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5 * u, -30 * u); ctx.lineTo(5 * u, -36 * u); ctx.stroke(); // mast
    ctx.fillStyle = lights ? '#ffe8b0' : '#4a4436'; ctx.beginPath(); ctx.arc(5 * u, -36.4 * u, 0.6 * u, 0, TAU); ctx.fill();
  } else {
    // a low faired sail (or, on the last hull, just a raised hatch), in the float's colour
    const h = M.tower === 'hatch' ? 3.2 : 6;
    const sg2 = ctx.createLinearGradient(0, (-23 - h) * u, 0, -22 * u);
    const tc = M.top ? M.top[0] : cMid;
    sg2.addColorStop(0, shade(tc, 0.1)); sg2.addColorStop(1, shade(tc, -0.2));
    ctx.fillStyle = sg2;
    ctx.beginPath(); ctx.moveTo(-10 * u, -22.5 * u); ctx.bezierCurveTo(-8 * u, (-23 - h) * u, 6 * u, (-23.5 - h) * u, 11 * u, -22.5 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(0.5, 0.25 * u); ctx.stroke();
    ctx.fillStyle = '#2a2e30'; ctx.beginPath(); ctx.ellipse(0, (-22.8 - h) * u, 3 * u, 0.7 * u, 0, 0, TAU); ctx.fill(); // the hatch
    if (M.tower === 'sail') { ctx.fillStyle = lights ? 'rgba(240,210,160,0.85)' : '#2a3034'; ctx.beginPath(); ctx.roundRect(3 * u, (-21.5 - h * 0.7) * u, 3.5 * u, 1.5 * u, 0.6 * u); ctx.fill(); }
    ctx.strokeStyle = '#3a3e40'; ctx.lineWidth = 0.5 * u; ctx.beginPath(); ctx.moveTo(6 * u, (-22.5 - h * 0.6) * u); ctx.lineTo(6 * u, (-29 - h * 0.4) * u); ctx.stroke(); // radio whip
    ctx.fillStyle = lights ? '#ffe8b0' : '#4a4436'; ctx.beginPath(); ctx.arc(6 * u, (-29.3 - h * 0.4) * u, 0.55 * u, 0, TAU); ctx.fill();
  }
  // the recall unit: an acoustic transponder on the deck, its green light blinking when it pings
  if (look.recall) {
    const x = -10, top = M.tower === 'old' ? -24 : -23.5;
    ctx.fillStyle = '#d8b030'; ctx.beginPath(); ctx.roundRect((x - 1.2) * u, (top - 5) * u, 2.4 * u, 5 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#2a2e30'; ctx.fillRect((x - 1.3) * u, (top - 3.2) * u, 2.6 * u, 0.6 * u);
    const ping = (t * 0.5) % 1 < 0.06;
    ctx.fillStyle = ping ? '#7aff9a' : '#2a5034'; ctx.beginPath(); ctx.arc(x * u, (top - 5.4) * u, 0.55 * u, 0, TAU); ctx.fill();
  }
  // ---------- under the hull: ballast, bottles, sample basket ----------
  // shot-ballast hoppers: iron shot held by an electromagnet, dropped to rise. More with each refit.
  const nHop = 1 + Math.min(3, Math.floor((look.ballast || 0) / 4));
  for (let i = 0; i < nHop; i++) {
    const x = -24 - i * 7.5, w = 5.5;
    poly([[x - w / 2, 2], [x + w / 2, 2], [x + w * 0.3, 7.5], [x - w * 0.3, 7.5]], sleek ? '#3a3e40' : '#33382f');
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect((x - w * 0.3) * u, 6.8 * u, w * 0.6 * u, 0.7 * u);
    ctx.fillStyle = '#7a3a2a'; ctx.fillRect((x - 0.6) * u, 7.5 * u, 1.2 * u, 0.8 * u); // the magnet's release
  }
  // the cabin's breathing gas: high-pressure bottles strapped along the hull, one more for each few refits
  const nBot = 1 + Math.min(4, Math.floor((look.air || 0) / 7));
  const botCol = sleek ? '#d8dcd8' : '#5a7a4a';
  for (let i = 0; i < nBot; i++) {
    const x = -46 + i * 7.2, y = i % 2 ? -4.2 : -6.4;
    const bg = ctx.createLinearGradient(0, (y - 1.3) * u, 0, (y + 1.3) * u);
    bg.addColorStop(0, shade(botCol, 0.25)); bg.addColorStop(0.5, botCol); bg.addColorStop(1, shade(botCol, -0.45));
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x * u, (y - 1.3) * u, 6.4 * u, 2.6 * u, 1.3 * u); ctx.fill();
    ctx.fillStyle = '#2a2c2a'; ctx.fillRect((x + 1.6) * u, (y - 1.4) * u, 0.5 * u, 2.8 * u); ctx.fillRect((x + 4.4) * u, (y - 1.4) * u, 0.5 * u, 2.8 * u); // straps
    ctx.fillStyle = '#8a8c88'; ctx.fillRect((x + 6.2) * u, (y - 0.4) * u, 0.8 * u, 0.8 * u); // valve
  }
  // ---------- the crew sphere and its frame ----------
  const gx = 6 * u, gy = 10 * u, gr = 13 * u;
  // the backup air tanks: yellow bottles racked upright behind the sphere
  const nRack = Math.max(1, look.rack || 1);
  for (let i = 0; i < nRack; i++) {
    const x = -9.5 - i * 3.2;
    const yg = ctx.createLinearGradient(x * u, 0, (x + 2.6) * u, 0);
    yg.addColorStop(0, '#f0c040'); yg.addColorStop(0.6, '#c8961e'); yg.addColorStop(1, '#6a4e10');
    ctx.fillStyle = yg; ctx.beginPath(); ctx.roundRect(x * u, 3.5 * u, 2.6 * u, 9 * u, 1.3 * u); ctx.fill();
    ctx.fillStyle = '#3a3a36'; ctx.fillRect((x + 0.9) * u, 2.6 * u, 0.8 * u, 1 * u);
  }
  if (nRack) { ctx.fillStyle = '#2a2e26'; ctx.fillRect((-10 - (nRack - 1) * 3.2) * u, 7 * u, (nRack * 3.2 + 1) * u, 0.7 * u); } // the rack's strap
  // landing skids (research hulls)
  if (M.skids) {
    ctx.strokeStyle = '#2e3236'; ctx.lineWidth = 1.1 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14 * u, 2 * u); ctx.lineTo(-17 * u, 25 * u); ctx.moveTo(30 * u, 2 * u); ctx.lineTo(28 * u, 25 * u); ctx.stroke();
    ctx.lineWidth = 1.4 * u; ctx.beginPath(); ctx.moveTo(-22 * u, 25.5 * u); ctx.lineTo(33 * u, 25.5 * u); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.fillStyle = '#2a2e26';
  ctx.beginPath(); ctx.moveTo(-6 * u, 2 * u); ctx.lineTo(-2 * u, 2 * u); ctx.lineTo(1 * u, 0 * u); ctx.lineTo(-4 * u, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14 * u, 0); ctx.lineTo(18 * u, 0); ctx.lineTo(15 * u, 2.5 * u); ctx.lineTo(11 * u, 2.5 * u); ctx.fill();
  ctx.fillRect(-2 * u, 1 * u, 16 * u, 2.4 * u); // trunk joining sphere to hull
  if (M.faired) {
    // the last hull wraps the sphere in a smooth fairing: charcoal below, white above
    const fp = new Path2D();
    fp.moveTo(-9 * u, 1 * u); fp.bezierCurveTo(-11 * u, 14 * u, -4 * u, 25 * u, 7 * u, 25 * u);
    fp.bezierCurveTo(19 * u, 25 * u, 23 * u, 14 * u, 21 * u, 1 * u); fp.closePath();
    const fg2 = ctx.createLinearGradient(0, 0, 0, 25 * u);
    fg2.addColorStop(0, '#4a5258'); fg2.addColorStop(0.6, '#2a2f34'); fg2.addColorStop(1, '#111416');
    ctx.fillStyle = fg2; ctx.fill(fp);
    ctx.save(); ctx.clip(fp); ctx.fillStyle = M.stripe; ctx.fillRect(-12 * u, 15 * u, 36 * u, 1.2 * u); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(0.5, 0.3 * u); ctx.stroke(fp);
    // the titanium sphere shows only round its viewport
    const sg = ctx.createRadialGradient(gx + 5 * u, gy - 4 * u, 1, gx + 6 * u, gy - 2 * u, 7 * u);
    sg.addColorStop(0, M.sphere[0]); sg.addColorStop(0.6, M.sphere[1]); sg.addColorStop(1, M.sphere[2]);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(gx + 6.5 * u, gy - 2.5 * u, 5.5 * u, 0, TAU); ctx.fill();
  } else {
    const sg = ctx.createRadialGradient(gx - 5 * u, gy - 6 * u, 1, gx, gy, gr);
    sg.addColorStop(0, M.sphere[0]); sg.addColorStop(0.45, M.sphere[1]); sg.addColorStop(1, M.sphere[2]);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
    if (mk <= 1) {
      // bolted equator flange (cast hemispheres)
      ctx.strokeStyle = '#1c1f19'; ctx.lineWidth = 1.2 * u;
      ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * 0.16, 0, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = 'rgba(160,165,145,0.5)';
      const nb = mk ? 18 : 12;
      for (let k = 1; k < nb; k++) { const a = (k / nb) * Math.PI; ctx.beginPath(); ctx.arc(gx + Math.cos(a) * gr, gy + Math.sin(a) * gr * 0.16, 0.35 * u, 0, TAU); ctx.fill(); }
    } else {
      // forged or titanium: a single fine equator weld, and the hatch ring on top
      ctx.strokeStyle = 'rgba(20,22,24,0.45)'; ctx.lineWidth = 0.5 * u;
      ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * 0.16, 0, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.8 * u;
      ctx.beginPath(); ctx.arc(gx, gy, gr * 0.92, 3.5, 4.4); ctx.stroke();
    }
  }
  // viewports: thick bevelled rims, warm light inside. Deeper hulls have smaller, thicker windows.
  const [p1, p2] = M.ports;
  const ports = M.faired ? [[gx + 6.5 * u, gy - 2.5 * u, p1 * u]] : [[gx + 7.5 * u, gy - 2.5 * u, p1 * u], [gx - 3 * u, gy + 5.5 * u, p2 * u]];
  for (const [px, py, pr2] of ports) {
    const rim = ctx.createRadialGradient(px - pr2 * 0.4, py - pr2 * 0.4, 0, px, py, pr2 * 1.5);
    rim.addColorStop(0, mk >= 3 ? '#e4e8ea' : '#9aa08c'); rim.addColorStop(1, '#22251e');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(px, py, pr2 * (mk >= 2 ? 1.6 : 1.45), 0, TAU); ctx.fill();
    const pg = ctx.createRadialGradient(px - pr2 * 0.3, py - pr2 * 0.3, 0, px, py, pr2);
    pg.addColorStop(0, lights ? '#ffe2a8' : '#3a3428'); pg.addColorStop(1, lights ? '#9a6a34' : '#141210');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.4 * u; ctx.beginPath(); ctx.arc(px, py, pr2 * 0.7, 3.6, 4.6); ctx.stroke();
  }
  // ---------- the sample basket at the bow: the open tank, and the pressure chambers in it ----------
  {
    const tl = look.tank || 0, x0 = 21, w = 9 + tl * 1.6, y0 = 3.5, h = 5.5;
    ctx.fillStyle = 'rgba(30,34,30,0.35)'; ctx.fillRect(x0 * u, y0 * u, w * u, h * u);
    ctx.strokeStyle = sleek ? '#3a3e40' : '#3a3f34'; ctx.lineWidth = Math.max(0.5, 0.3 * u);
    ctx.strokeRect(x0 * u, y0 * u, w * u, h * u);
    ctx.lineWidth = Math.max(0.4, 0.15 * u); ctx.strokeStyle = 'rgba(70,76,70,0.7)';
    ctx.beginPath(); for (let x = x0 + 1.2; x < x0 + w; x += 1.2) { ctx.moveTo(x * u, y0 * u); ctx.lineTo(x * u, (y0 + h) * u); } for (let y = y0 + 1.2; y < y0 + h; y += 1.2) { ctx.moveTo(x0 * u, y * u); ctx.lineTo((x0 + w) * u, y * u); } ctx.stroke();
    // pressure chambers: clear blue cylinders, thicker-capped as their rating rises
    const nc = Math.max(1, look.chambers || 1), cap = 0.5 + Math.min(1, (look.chamberLv || 0) / 12) * 0.8;
    for (let i = 0; i < nc; i++) {
      const cx = x0 + 1 + i * 2.6; if (cx + 2 > x0 + w) break;
      const cg = ctx.createLinearGradient(cx * u, 0, (cx + 2) * u, 0);
      cg.addColorStop(0, 'rgba(120,190,230,0.75)'); cg.addColorStop(0.5, 'rgba(190,230,250,0.85)'); cg.addColorStop(1, 'rgba(60,120,170,0.75)');
      ctx.fillStyle = cg; ctx.fillRect(cx * u, (y0 + 0.6) * u, 2 * u, (h - 1.2) * u);
      ctx.fillStyle = '#3a3e40'; ctx.fillRect((cx - 0.1) * u, (y0 + 0.4) * u, 2.2 * u, cap * u); ctx.fillRect((cx - 0.1) * u, (y0 + h - 0.4 - cap) * u, 2.2 * u, cap * u);
    }
  }
  // ---------- lamps ----------
  if (M.ledBars) {
    for (const [lx, ly] of [[47, -5], [19, 13.5]]) {
      ctx.fillStyle = '#1a1c1e'; ctx.beginPath(); ctx.roundRect((lx - 3) * u, (ly - 3) * u, 4.5 * u, 6 * u, 0.8 * u); ctx.fill();
      ctx.fillStyle = lights ? '#f4f8ff' : '#3a3e40';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc((lx + 0.6) * u, (ly - 2.1 + k * 1.4) * u, 0.45 * u, 0, TAU); ctx.fill(); }
    }
  } else {
    for (const [lx, ly] of [[48, -4], [20, 13.5]]) {
      ctx.fillStyle = '#1c1f19'; ctx.beginPath(); ctx.roundRect((lx - 3.5) * u, (ly - 2.2) * u, 4.5 * u, 4.4 * u, 1 * u); ctx.fill();
      ctx.fillStyle = lights ? '#f4f7ff' : '#3a3e38'; ctx.beginPath(); ctx.ellipse((lx + 1) * u, ly * u, 0.7 * u, 1.8 * u, 0, 0, TAU); ctx.fill();
    }
  }
  // navigation lights: red to port (we see the near side), a green glint at the bow
  ctx.fillStyle = lights ? '#ff4030' : '#502420'; ctx.beginPath(); ctx.arc(-30 * u, -21 * u, 0.6 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = lights ? '#40ff70' : '#205030'; ctx.beginPath(); ctx.arc(44 * u, -15 * u, 0.6 * u, 0, TAU); ctx.fill();
  // ---------- the manipulator arm: heavier, longer-jawed and with bigger rams as it is upgraded ----------
  const reach = look.reach || 0, jaw = look.jaw || 0, hyd = look.hyd || 0;
  const sx = 14 * u, sy = 17 * u;
  let open = 0.25 + 0.15 * Math.sin(t * 0.6);
  let ex = sx + 8 * u, ey = sy + 4 * u, wx = ex + 7 * u, wy = ey - 2.5 * u;
  if (arm && arm.ext > 0) {
    const k = arm.ext * arm.ext * (3 - 2 * arm.ext);
    wx = wx + (arm.lx - wx) * k; wy = wy + (arm.ly - wy) * k;
    const D = Math.hypot(wx - sx, wy - sy), l = Math.max(8 * u, D * 0.56);
    const mx = (sx + wx) / 2, my = (sy + wy) / 2, h = Math.sqrt(Math.max(0, l * l - (D / 2) * (D / 2)));
    const nx = -(wy - sy) / (D || 1), ny = (wx - sx) / (D || 1);
    ex = mx + nx * h; ey = my + ny * h;
    open = arm.closed ? 0.04 : 0.5;
  }
  const fa = Math.atan2(wy - ey, wx - ex);
  const armCol = sleek ? (mk >= 3 ? '#c8ccd0' : '#e0e2dc') : '#3e4338';
  ctx.strokeStyle = armCol; ctx.lineCap = 'round';
  ctx.lineWidth = (2.2 + reach * 0.06) * u; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.lineWidth = (1.6 + reach * 0.05) * u; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(wx, wy); ctx.stroke();
  for (const [ax, ay, bx, by] of [[sx, sy, ex, ey], [ex, ey, wx, wy]]) {
    const a = Math.atan2(by - ay, bx - ax), off = (1.3 + hyd * 0.05) * u, px = -Math.sin(a) * off, py = Math.cos(a) * off;
    ctx.strokeStyle = '#1e211b'; ctx.lineWidth = (0.9 + hyd * 0.06) * u;
    ctx.beginPath(); ctx.moveTo(ax + px, ay + py); ctx.lineTo(ax + px + (bx - ax) * 0.5, ay + py + (by - ay) * 0.5); ctx.stroke();
    ctx.strokeStyle = hyd >= 5 ? '#e4eaf0' : '#a8aea4'; ctx.lineWidth = (0.45 + hyd * 0.03) * u;
    ctx.beginPath(); ctx.moveTo(ax + px + (bx - ax) * 0.5, ay + py + (by - ay) * 0.5); ctx.lineTo(ax + px + (bx - ax) * 0.85, ay + py + (by - ay) * 0.85); ctx.stroke();
  }
  ctx.fillStyle = sleek ? '#2e3236' : '#2a2e26'; for (const [jx, jy] of [[sx, sy], [ex, ey]]) { ctx.beginPath(); ctx.arc(jx, jy, (1.4 + reach * 0.04) * u, 0, TAU); ctx.fill(); }
  if (arm && arm.sp) {
    const fl = Math.max(3 * u, Math.min(arm.len / 0.09, 14) * u);
    ctx.save(); ctx.translate(wx + Math.cos(fa) * 3 * u, wy + Math.sin(fa) * 3 * u); ctx.rotate(fa + Math.PI / 2 + Math.sin(t * 20) * 0.25);
    drawSpecies(ctx, arm.sp, fl, t * 3, 1, 0);
    ctx.restore();
  }
  // the claw: two jointed fingers, longer with each jaw upgrade
  const f1 = 3 * (1 + jaw * 0.05), f2 = 2.4 * (1 + jaw * 0.05);
  ctx.strokeStyle = sleek ? '#7a7e82' : '#555a4c'; ctx.lineWidth = (0.8 + jaw * 0.04) * u;
  for (const sgn of [-1, 1]) {
    const a1 = fa + sgn * open * 1.1, a2 = fa - sgn * open * 0.5;
    const kx = wx + Math.cos(a1) * f1 * u, ky = wy + Math.sin(a1) * f1 * u;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(kx, ky); ctx.lineTo(kx + Math.cos(a2) * f2 * u, ky + Math.sin(a2) * f2 * u); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // sacrificial anodes on the frame
  ctx.fillStyle = '#7a7c74'; ctx.fillRect(-5 * u, 6 * u, 2 * u, 1.2 * u); ctx.fillRect(16 * u, 4 * u, 2 * u, 1.2 * u);
  // past its rating the hull shows the strain: the viewports fog as the cold steel sweats and fine
  // crazing spreads in the acrylic; seawater weeps from the sphere's seams in thin jets of mist; small
  // streams of bubbles work out of the joints. All of it grows toward crush depth.
  if (stress > 0.03) {
    for (const [px, py, pr] of ports) {
      ctx.fillStyle = `rgba(205,215,220,${(0.1 + stress * 0.32).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(px, py, pr * 0.82, 0, TAU); ctx.fill();
      if (stress > 0.35) {
        ctx.strokeStyle = `rgba(18,22,24,${((stress - 0.35) * 0.9).toFixed(3)})`; ctx.lineWidth = Math.max(0.5, 0.18 * u);
        const nn = 2 + Math.floor(stress * 5);
        for (let k = 0; k < nn; k++) {
          const a = k * 2.3 + 0.4, r0 = pr * 0.8, r1 = pr * (0.25 + 0.3 * ((k * 0.37) % 1));
          ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0);
          ctx.lineTo(px + Math.cos(a + 0.25) * (r0 + r1) / 2, py + Math.sin(a + 0.25) * (r0 + r1) / 2); ctx.lineTo(px + Math.cos(a - 0.1) * r1, py + Math.sin(a - 0.1) * r1); ctx.stroke();
        }
      }
    }
    const leaks = [[gx - gr * 0.97, gy - 2 * u, -1, 0.2], [gx + gr * 0.93, gy + 3 * u, 1, -0.1], [gx - 3 * u, gy + gr * 0.97, -0.3, 1], [gx + 4 * u, gy - gr * 0.95, 0.4, -1]];
    const nLeak = Math.min(leaks.length, Math.ceil(stress * leaks.length));
    for (let k = 0; k < nLeak; k++) {
      const [lx, ly, dx, dy] = leaks[k], nl = Math.hypot(dx, dy), ux = dx / nl, uy = dy / nl;
      const len = (2 + stress * 5) * u * (0.8 + 0.2 * Math.sin(t * 17 + k * 3)), w = (0.4 + stress * 1.2) * u;
      const jg = ctx.createLinearGradient(lx, ly, lx + ux * len, ly + uy * len);
      jg.addColorStop(0, `rgba(215,228,235,${(0.35 * stress + 0.1).toFixed(3)})`); jg.addColorStop(1, 'rgba(215,228,235,0)');
      ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(lx - uy * w * 0.15, ly + ux * w * 0.15);
      ctx.lineTo(lx + ux * len - uy * w, ly + uy * len + ux * w); ctx.lineTo(lx + ux * len + uy * w, ly + uy * len - ux * w); ctx.lineTo(lx + uy * w * 0.15, ly - ux * w * 0.15); ctx.closePath(); ctx.fill();
      // the bubbles it carries off, rising
      ctx.strokeStyle = `rgba(210,230,240,${(0.25 + stress * 0.35).toFixed(3)})`; ctx.lineWidth = Math.max(0.5, 0.15 * u);
      for (let b = 0; b < 3; b++) {
        const q = (t * 0.9 + b / 3 + k * 0.31) % 1;
        ctx.beginPath(); ctx.arc(lx + ux * len * 0.6 + Math.sin(q * 9 + b) * u, ly + uy * len * 0.6 - q * 9 * u, (0.25 + q * 0.4) * u, 0, TAU); ctx.stroke();
      }
    }
  }
  return { lampA: [49 * u, -4 * u], lampB: [21 * u, 13.5 * u], ports };
}

// Small weathered work boat with an A-frame crane. Origin at the waterline centre. Faces -x (bow left).
export function drawBoat(ctx, Lp, t, sub) {
  // A small, hard-worked dive-support boat, bow to the left: a flared bow and a curved sheer line,
  // a red boot-top at the waterline, rub rail, plating seams and rust; a wheelhouse with framed
  // windows; a mast with radar, antennas and lights; an exhaust stack; deck clutter; and at the
  // stern an A-frame with hydraulic rams, a winch drum and a block that carries the sub's cable.
  const u = Lp / 100;
  const roll = Math.sin(t * 0.8) * 0.02;
  ctx.save(); ctx.rotate(roll);
  // ---------- hull ----------
  const hull = new Path2D();
  hull.moveTo(-56 * u, -16 * u);                                   // bow, raked and flared
  hull.quadraticCurveTo(-20 * u, -10.5 * u, 20 * u, -10.5 * u);    // sheer line, lower amidships
  hull.lineTo(46 * u, -11.5 * u);                                  // transom top
  hull.lineTo(45 * u, 3 * u);                                      // transom
  hull.quadraticCurveTo(10 * u, 8.5 * u, -30 * u, 6 * u);          // bottom
  hull.quadraticCurveTo(-46 * u, 3 * u, -56 * u, -16 * u);         // forefoot curving up to the stem
  const hg = ctx.createLinearGradient(0, -16 * u, 0, 8 * u);
  hg.addColorStop(0, '#e6e2d8'); hg.addColorStop(0.25, '#cfcabd'); hg.addColorStop(0.55, '#a8a396'); hg.addColorStop(1, '#5e5a52');
  ctx.fillStyle = hg; ctx.fill(hull);
  ctx.save(); ctx.clip(hull);
  // red antifouling below the waterline, dark boot-top stripe on it
  ctx.fillStyle = '#7a2a22'; ctx.fillRect(-60 * u, -0.5 * u, 110 * u, 12 * u);
  ctx.fillStyle = '#2a2624'; ctx.fillRect(-60 * u, -2.2 * u, 110 * u, 1.8 * u);
  // plating seams, rust runs from the scuppers, scuffs along the side
  ctx.strokeStyle = 'rgba(40,38,32,0.25)'; ctx.lineWidth = Math.max(0.5, 0.3 * u);
  for (let x = -44; x < 44; x += 9) { ctx.beginPath(); ctx.moveTo(x * u, -14 * u); ctx.lineTo((x + 0.5) * u, 6 * u); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-54 * u, -7 * u); ctx.quadraticCurveTo(0, -4 * u, 46 * u, -5 * u); ctx.stroke();
  for (let k = 0; k < 9; k++) {
    const x = -40 + k * 10, len = 4 + (k % 3) * 2.5;
    const rg = ctx.createLinearGradient(0, -10 * u, 0, (-10 + len) * u);
    rg.addColorStop(0, 'rgba(130,70,34,0.55)'); rg.addColorStop(1, 'rgba(130,70,34,0)');
    ctx.fillStyle = rg; ctx.fillRect(x * u, -10 * u, 0.8 * u, len * u);
    ctx.fillStyle = '#2a2624'; ctx.fillRect((x - 0.6) * u, -10.6 * u, 2 * u, 0.9 * u); // scupper
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-60 * u, -14 * u, 110 * u, 1.2 * u);
  ctx.restore();
  ctx.strokeStyle = 'rgba(30,28,24,0.6)'; ctx.lineWidth = Math.max(0.6, 0.35 * u); ctx.stroke(hull);
  // rub rail along the sheer, bulwark cap
  ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 1.6 * u;
  ctx.beginPath(); ctx.moveTo(-55 * u, -14.5 * u); ctx.quadraticCurveTo(-20 * u, -9.3 * u, 20 * u, -9.3 * u); ctx.lineTo(46 * u, -10.3 * u); ctx.stroke();
  ctx.strokeStyle = '#d8d4c8'; ctx.lineWidth = 0.8 * u;
  ctx.beginPath(); ctx.moveTo(-56 * u, -16 * u); ctx.quadraticCurveTo(-20 * u, -10.5 * u, 20 * u, -10.5 * u); ctx.lineTo(46 * u, -11.5 * u); ctx.stroke();
  // name on the bow, hawse pipe and anchor
  ctx.fillStyle = 'rgba(40,36,30,0.7)'; ctx.font = `bold ${3 * u}px Georgia, serif`; ctx.fillText('MARGARET', -47 * u, -7.5 * u);
  ctx.fillStyle = '#2a2624'; ctx.beginPath(); ctx.ellipse(-50 * u, -11.5 * u, 1 * u, 0.8 * u, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 0.6 * u; ctx.beginPath(); ctx.moveTo(-50 * u, -11 * u); ctx.lineTo(-50.5 * u, -6 * u); ctx.stroke();
  // tyre fenders hanging over the side
  for (const x of [-20, 2, 22]) {
    ctx.strokeStyle = '#2a2826'; ctx.lineWidth = 0.4 * u; ctx.beginPath(); ctx.moveTo(x * u, -10.5 * u); ctx.lineTo(x * u, -8 * u); ctx.stroke();
    ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(x * u, -6 * u, 1.4 * u, 2.2 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c2c2c'; ctx.beginPath(); ctx.ellipse(x * u, -6 * u, 0.6 * u, 1.1 * u, 0, 0, TAU); ctx.fill();
  }
  // ---------- deck clutter ----------
  ctx.fillStyle = '#6a5a40'; ctx.fillRect(-42 * u, -15.5 * u, 6 * u, 3.5 * u); ctx.fillRect(-36.5 * u, -14.5 * u, 4 * u, 2.5 * u); // crates
  ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 0.3 * u; ctx.strokeRect(-42 * u, -15.5 * u, 6 * u, 3.5 * u);
  ctx.fillStyle = '#4a5a48'; ctx.beginPath(); ctx.ellipse(25 * u, -11.8 * u, 5 * u, 1.6 * u, 0, Math.PI, TAU); ctx.fill(); // coiled net
  ctx.strokeStyle = 'rgba(30,40,30,0.6)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(25 * u, -11.8 * u, (4.6 - k * 0.8) * u, (1.4 - k * 0.2) * u, 0, Math.PI, TAU); ctx.stroke(); }
  // ---------- wheelhouse ----------
  const wh = new Path2D();
  wh.moveTo(-8 * u, -11 * u); wh.lineTo(-9 * u, -27 * u); wh.quadraticCurveTo(-9 * u, -30 * u, -6 * u, -30.5 * u);
  wh.lineTo(19 * u, -30.5 * u); wh.quadraticCurveTo(22 * u, -30 * u, 22 * u, -27 * u); wh.lineTo(22 * u, -11 * u); wh.closePath();
  const whg = ctx.createLinearGradient(-9 * u, 0, 22 * u, 0);
  whg.addColorStop(0, '#d8d4c8'); whg.addColorStop(0.5, '#ecE8de'); whg.addColorStop(1, '#bcb8ac');
  ctx.fillStyle = whg; ctx.fill(wh);
  ctx.strokeStyle = 'rgba(40,38,32,0.45)'; ctx.lineWidth = 0.4 * u; ctx.stroke(wh);
  ctx.fillStyle = '#5a5850'; ctx.beginPath(); ctx.roundRect(-10.5 * u, -33 * u, 34 * u, 3 * u, 1 * u); ctx.fill(); // roof overhang
  // windows (positions shared with the night-lighting code): frames, sky reflection
  for (let k = 0; k < 3; k++) {
    const x = (-3 + k * 8) * u, y = -26 * u, w = 5 * u, h = 5 * u;
    ctx.fillStyle = '#2a2e30'; ctx.beginPath(); ctx.roundRect(x - 0.5 * u, y - 0.5 * u, w + u, h + u, 0.8 * u); ctx.fill();
    const wg = ctx.createLinearGradient(x, y, x + w, y + h);
    wg.addColorStop(0, '#a8bcc4'); wg.addColorStop(0.5, '#62767e'); wg.addColorStop(1, '#3a4a50');
    ctx.fillStyle = wg; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.4 * u; ctx.beginPath(); ctx.moveTo(x + 0.8 * u, y + h - 0.8 * u); ctx.lineTo(x + w - 0.8 * u, y + 0.8 * u); ctx.stroke();
  }
  // door with a porthole, life ring on the wall
  ctx.fillStyle = '#b0aca0'; ctx.fillRect(17 * u, -24 * u, 4 * u, 13 * u);
  ctx.strokeStyle = 'rgba(40,38,32,0.5)'; ctx.lineWidth = 0.3 * u; ctx.strokeRect(17 * u, -24 * u, 4 * u, 13 * u);
  ctx.fillStyle = '#3a4a50'; ctx.beginPath(); ctx.arc(19 * u, -20.5 * u, 1 * u, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e05a2a'; ctx.lineWidth = 1.1 * u; ctx.beginPath(); ctx.arc(-4.5 * u, -15.5 * u, 2.2 * u, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#f0ece0'; ctx.lineWidth = 1.1 * u;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-4.5 * u, -15.5 * u, 2.2 * u, k * Math.PI / 2, k * Math.PI / 2 + 0.35); ctx.stroke(); }
  // exhaust stack with a wisp of smoke
  ctx.fillStyle = '#2a2826'; ctx.fillRect(12 * u, -38 * u, 3 * u, 6 * u);
  ctx.fillStyle = '#8a2a20'; ctx.fillRect(12 * u, -38 * u, 3 * u, 1 * u);
  for (let k = 0; k < 4; k++) {
    const p = ((t * 0.25 + k / 4) % 1);
    ctx.fillStyle = `rgba(90,90,92,${(0.25 * (1 - p)).toFixed(3)})`;
    ctx.beginPath(); ctx.arc((13.5 + p * 8) * u, (-39 - p * 10) * u, (1 + p * 3) * u, 0, TAU); ctx.fill();
  }
  // ---------- mast: radar, antennas, lights ----------
  ctx.strokeStyle = '#3a3836'; ctx.lineWidth = 0.9 * u;
  ctx.beginPath(); ctx.moveTo(4 * u, -33 * u); ctx.lineTo(4 * u, -54 * u); ctx.stroke();
  ctx.lineWidth = 0.5 * u; ctx.beginPath(); ctx.moveTo(-1 * u, -46 * u); ctx.lineTo(9 * u, -46 * u); ctx.stroke(); // yard
  ctx.beginPath(); ctx.moveTo(9 * u, -46 * u); ctx.lineTo(10 * u, -57 * u); ctx.moveTo(-1 * u, -46 * u); ctx.lineTo(-1.5 * u, -53 * u); ctx.stroke(); // whips
  const rad = Math.cos(t * 2.4); // the radar bar sweeps round (foreshortened)
  ctx.fillStyle = '#d8d4c8'; ctx.fillRect((4 - 5 * Math.abs(rad)) * u, -50 * u, 10 * Math.abs(rad) * u + 0.6 * u, 1.2 * u);
  ctx.fillStyle = '#2a2826'; ctx.fillRect(3.2 * u, -49 * u, 1.6 * u, 2 * u);
  ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.arc(4 * u, -54.4 * u, 0.6 * u, 0, TAU); ctx.fill(); // masthead light
  ctx.fillStyle = '#ff5a40'; ctx.beginPath(); ctx.arc(-8.5 * u, -29 * u, 0.5 * u, 0, TAU); ctx.fill(); // port light
  // ---------- stern A-frame, rams, winch, block ----------
  ctx.strokeStyle = '#4a4640'; ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(36 * u, -11.5 * u); ctx.lineTo(56 * u, -40 * u); ctx.stroke();      // near leg
  ctx.strokeStyle = '#34312c';
  ctx.beginPath(); ctx.moveTo(43 * u, -11.5 * u); ctx.lineTo(57 * u, -39 * u); ctx.stroke();      // far leg
  ctx.strokeStyle = '#7a7468'; ctx.lineWidth = 1 * u;
  ctx.beginPath(); ctx.moveTo(30 * u, -11 * u); ctx.lineTo(45 * u, -26 * u); ctx.stroke();        // hydraulic ram
  ctx.strokeStyle = '#c8c4b8'; ctx.lineWidth = 0.6 * u;
  ctx.beginPath(); ctx.moveTo(38 * u, -19 * u); ctx.lineTo(45 * u, -26 * u); ctx.stroke();        // polished rod
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#3a3630'; ctx.beginPath(); ctx.roundRect(26 * u, -15.5 * u, 7 * u, 4.5 * u, 1 * u); ctx.fill(); // winch
  ctx.fillStyle = '#5a5850'; ctx.beginPath(); ctx.ellipse(29.5 * u, -13.2 * u, 2.4 * u, 1.8 * u, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1e1c1a'; ctx.lineWidth = 0.35 * u;
  ctx.beginPath(); ctx.moveTo(29.5 * u, -15 * u); ctx.lineTo(56 * u, -40.5 * u); ctx.stroke();   // cable up to the block
  ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.arc(56 * u, -40 * u, 1.6 * u, 0, TAU); ctx.fill(); // block (yellow)
  ctx.fillStyle = '#2a2826'; ctx.beginPath(); ctx.arc(56 * u, -40 * u, 0.6 * u, 0, TAU); ctx.fill();
  ctx.restore();
  return { craneTip: [56 * u, -40 * u] };
}

// The thing in the deep itself is drawn in monster_draw.js.

