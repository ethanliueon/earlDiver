// Earl, the submersible and the boat. All drawn in local pixel space.
import { TAU, clamp, lerp } from './util.js';
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

// Old riveted bathyscaphe. Local origin centre; length ~9 m => Lp pixels. Faces +x.
// arm (optional): { ext 0..1, lx, ly: the target in this local frame (px), closed, sp, len }
export function drawSub(ctx, Lp, t, stress, lights, arm) {
  // An old riveted bathyscaphe: a long float hull (bow to the right) with a rounded bow and a
  // tapering stern, cruciform tail fins and a ducted propeller; a conning tower with a hatch wheel;
  // the steel crew sphere slung underneath with its viewports, lamps and a jointed manipulator arm.
  const u = Lp / 100;
  const steel = '#4f574c', steelHi = '#79826f', steelLo = '#22261f';
  // ---------- stern: fins and ducted propeller (behind the hull) ----------
  const fin = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0] * u, pts[0][1] * u); for (const [x, y] of pts.slice(1)) ctx.lineTo(x * u, y * u); ctx.closePath(); ctx.fill(); };
  fin([[-40, -12], [-52, -22], [-57, -21], [-54, -11]], '#30352c'); // upper vertical fin
  fin([[-40, -4], [-52, 5], [-57, 4], [-54, -5]], '#2a2e26');      // lower vertical fin
  // propeller blades spinning inside the duct
  const spin = t * 14;
  ctx.fillStyle = '#5a5e52';
  for (let k = 0; k < 3; k++) { const a = spin + k * 2.09; const h = Math.sin(a) * 6.5; ctx.fillRect(-60 * u, (-8.5 + Math.min(0, h)) * u, 1.6 * u, Math.abs(h) * u + 0.5); }
  ctx.fillStyle = '#3c4036'; ctx.beginPath(); ctx.ellipse(-61.5 * u, -8.5 * u, 1.6 * u, 1.6 * u, 0, 0, TAU); ctx.fill(); // hub
  // the duct (ring seen side-on)
  const dg = ctx.createLinearGradient(0, -16 * u, 0, -1 * u);
  dg.addColorStop(0, '#6a7262'); dg.addColorStop(0.5, '#3e443a'); dg.addColorStop(1, '#1e211b');
  ctx.fillStyle = dg;
  ctx.beginPath(); ctx.roundRect(-64 * u, -16.5 * u, 8 * u, 2.4 * u, 1 * u); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-64 * u, -2.6 * u, 8 * u, 2.4 * u, 1 * u); ctx.fill();
  ctx.fillStyle = 'rgba(20,22,18,0.55)'; ctx.fillRect(-63.5 * u, -14.2 * u, 7 * u, 11.6 * u);
  // ---------- the float hull ----------
  const hull = new Path2D();
  hull.moveTo(-50 * u, -12 * u);
  hull.bezierCurveTo(-40 * u, -20 * u, -20 * u, -22 * u, 10 * u, -22 * u);     // back
  hull.bezierCurveTo(36 * u, -22 * u, 50 * u, -18 * u, 52 * u, -10 * u);       // rounded bow
  hull.bezierCurveTo(53 * u, -3 * u, 46 * u, 2 * u, 36 * u, 2.5 * u);
  hull.lineTo(-20 * u, 2.5 * u);
  hull.bezierCurveTo(-36 * u, 2.5 * u, -46 * u, -2 * u, -50 * u, -6 * u);      // stern taper
  hull.closePath();
  const hg = ctx.createLinearGradient(0, -22 * u, 0, 3 * u);
  hg.addColorStop(0, steelHi); hg.addColorStop(0.18, '#5f6858'); hg.addColorStop(0.55, steel); hg.addColorStop(1, steelLo);
  ctx.fillStyle = hg; ctx.fill(hull);
  ctx.save(); ctx.clip(hull);
  // plate seams and rivet rows
  ctx.strokeStyle = 'rgba(15,17,13,0.45)'; ctx.lineWidth = Math.max(0.6, 0.35 * u);
  for (const x of [-34, -18, -2, 14, 30]) { ctx.beginPath(); ctx.moveTo(x * u, -23 * u); ctx.quadraticCurveTo((x + 1) * u, -10 * u, x * u, 3 * u); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-52 * u, -9 * u); ctx.bezierCurveTo(-20 * u, -11 * u, 30 * u, -11 * u, 54 * u, -8 * u); ctx.stroke();
  ctx.fillStyle = 'rgba(12,14,10,0.7)';
  for (const x of [-34, -18, -2, 14, 30]) for (let j = 0; j < 9; j++) { ctx.beginPath(); ctx.arc((x + 1.2) * u, (-19.5 + j * 2.4) * u, 0.32 * u, 0, TAU); ctx.fill(); }
  // rust streaks from the rivets, a band of grime along the waterline of the float
  for (let k = 0; k < 18; k++) {
    const x = -44 + ((k * 37) % 92), len = 4 + (k % 5) * 2.2;
    const rg = ctx.createLinearGradient(0, -20 * u, 0, (-20 + len) * u);
    rg.addColorStop(0, `rgba(${118 + (k % 3) * 12},62,30,0.35)`); rg.addColorStop(1, 'rgba(118,62,30,0)');
    ctx.fillStyle = rg; ctx.fillRect(x * u, -20 * u, (0.5 + (k % 3) * 0.35) * u, len * u);
  }
  ctx.fillStyle = 'rgba(10,12,8,0.35)'; ctx.fillRect(-60 * u, -3 * u, 120 * u, 6 * u);
  // specular line along the top of the hull
  ctx.strokeStyle = 'rgba(220,230,210,0.22)'; ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.moveTo(-36 * u, -18.5 * u); ctx.bezierCurveTo(-10 * u, -21 * u, 30 * u, -21 * u, 46 * u, -16 * u); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(10,12,8,0.6)'; ctx.lineWidth = Math.max(0.6, 0.3 * u); ctx.stroke(hull);
  // horizontal stern plane, seen edge-on
  fin([[-44, -9.5], [-58, -9.2], [-58, -7.6], [-44, -7.4]], '#262a22');
  // faded hull number
  { // painted number: never mirrored, whichever way the sub faces
    const m = ctx.getTransform(), flip = m.a < 0;
    ctx.save(); ctx.translate(28 * u, -14 * u); if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(205,195,165,0.32)'; ctx.font = `bold ${5.5 * u}px monospace`; ctx.textAlign = 'center'; ctx.fillText('Б-7', 0, 2 * u);
    ctx.restore();
  }
  // deck railing along the top
  ctx.strokeStyle = 'rgba(30,33,27,0.95)'; ctx.lineWidth = Math.max(0.6, 0.35 * u);
  ctx.beginPath(); ctx.moveTo(-26 * u, -25 * u); ctx.lineTo(30 * u, -25 * u); ctx.stroke();
  for (let x = -26; x <= 30; x += 4) { ctx.beginPath(); ctx.moveTo(x * u, -25 * u); ctx.lineTo(x * u, -21.8 * u); ctx.stroke(); }
  // conning tower: portholes, hatch wheel, a mast light
  const tg = ctx.createLinearGradient(-9 * u, 0, 9 * u, 0);
  tg.addColorStop(0, '#363b31'); tg.addColorStop(0.4, '#5f6858'); tg.addColorStop(1, '#2c3028');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.moveTo(-9 * u, -21.5 * u); ctx.lineTo(-7 * u, -30 * u); ctx.lineTo(7 * u, -30 * u); ctx.lineTo(10 * u, -21.5 * u); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(10,12,8,0.55)'; ctx.lineWidth = Math.max(0.5, 0.3 * u); ctx.stroke();
  for (const x of [-3.5, 2.5]) { ctx.fillStyle = '#14160f'; ctx.beginPath(); ctx.arc(x * u, -26 * u, 1.2 * u, 0, TAU); ctx.fill(); ctx.fillStyle = lights ? 'rgba(240,200,140,0.8)' : 'rgba(60,70,60,0.8)'; ctx.beginPath(); ctx.arc(x * u, -26 * u, 0.75 * u, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = '#4a4f44'; ctx.lineWidth = 0.5 * u;
  ctx.beginPath(); ctx.ellipse(0, -31 * u, 3.4 * u, 0.9 * u, 0, 0, TAU); ctx.stroke(); // hatch wheel, edge-on
  ctx.beginPath(); ctx.moveTo(0, -30 * u); ctx.lineTo(0, -31.8 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5 * u, -30 * u); ctx.lineTo(5 * u, -36 * u); ctx.stroke(); // mast
  ctx.fillStyle = lights ? '#ffe8b0' : '#4a4436'; ctx.beginPath(); ctx.arc(5 * u, -36.4 * u, 0.6 * u, 0, TAU); ctx.fill();
  // ---------- the crew sphere and its frame ----------
  const gx = 6 * u, gy = 10 * u, gr = 13 * u;
  ctx.fillStyle = '#2a2e26';
  ctx.beginPath(); ctx.moveTo(-6 * u, 2 * u); ctx.lineTo(-2 * u, 2 * u); ctx.lineTo(1 * u, 0 * u); ctx.lineTo(-4 * u, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14 * u, 0); ctx.lineTo(18 * u, 0); ctx.lineTo(15 * u, 2.5 * u); ctx.lineTo(11 * u, 2.5 * u); ctx.fill();
  ctx.fillRect(-2 * u, 1 * u, 16 * u, 2.4 * u); // trunk joining sphere to hull
  const sg = ctx.createRadialGradient(gx - 5 * u, gy - 6 * u, 1, gx, gy, gr);
  sg.addColorStop(0, '#8a9280'); sg.addColorStop(0.45, '#4e5548'); sg.addColorStop(1, '#1a1d17');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
  // bolted equator flange and bolts
  ctx.strokeStyle = '#1c1f19'; ctx.lineWidth = 1.2 * u;
  ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * 0.16, 0, 0, Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgba(160,165,145,0.5)';
  for (let k = 1; k < 12; k++) { const a = (k / 12) * Math.PI; ctx.beginPath(); ctx.arc(gx + Math.cos(a) * gr, gy + Math.sin(a) * gr * 0.16, 0.35 * u, 0, TAU); ctx.fill(); }
  // viewports: thick bevelled rims, warm light inside
  const ports = [[gx + 7.5 * u, gy - 2.5 * u, 3.1 * u], [gx - 3 * u, gy + 5.5 * u, 2.1 * u]];
  for (const [px, py, pr] of ports) {
    const rim = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, 0, px, py, pr * 1.5);
    rim.addColorStop(0, '#9aa08c'); rim.addColorStop(1, '#22251e');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(px, py, pr * 1.45, 0, TAU); ctx.fill();
    const pg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
    pg.addColorStop(0, lights ? '#ffe2a8' : '#3a3428'); pg.addColorStop(1, lights ? '#9a6a34' : '#141210');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.4 * u; ctx.beginPath(); ctx.arc(px, py, pr * 0.7, 3.6, 4.6); ctx.stroke();
  }
  // lamp housings: bow lamp and sphere lamp
  for (const [lx, ly] of [[48, -4], [20, 13.5]]) {
    ctx.fillStyle = '#1c1f19'; ctx.beginPath(); ctx.roundRect((lx - 3.5) * u, (ly - 2.2) * u, 4.5 * u, 4.4 * u, 1 * u); ctx.fill();
    ctx.fillStyle = lights ? '#f4f7ff' : '#3a3e38'; ctx.beginPath(); ctx.ellipse((lx + 1) * u, ly * u, 0.7 * u, 1.8 * u, 0, 0, TAU); ctx.fill();
  }
  // navigation lights: red to port (we see the near side), a green glint at the bow
  ctx.fillStyle = lights ? '#ff4030' : '#502420'; ctx.beginPath(); ctx.arc(-30 * u, -21 * u, 0.6 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = lights ? '#40ff70' : '#205030'; ctx.beginPath(); ctx.arc(44 * u, -15 * u, 0.6 * u, 0, TAU); ctx.fill();
  // manipulator arm: shoulder, two segments, a two-fingered claw that opens and closes
  const sx = 14 * u, sy = 17 * u;
  let open = 0.25 + 0.15 * Math.sin(t * 0.6);
  let ex = sx + 8 * u, ey = sy + 4 * u, wx = ex + 7 * u, wy = ey - 2.5 * u;
  if (arm && arm.ext > 0) {
    // reaching: the wrist goes out to the animal; the two segments telescope and the elbow bends
    // below the line between shoulder and wrist (two-bone reach)
    const k = arm.ext * arm.ext * (3 - 2 * arm.ext);
    wx = wx + (arm.lx - wx) * k; wy = wy + (arm.ly - wy) * k;
    const D = Math.hypot(wx - sx, wy - sy), l = Math.max(8 * u, D * 0.56);
    const mx = (sx + wx) / 2, my = (sy + wy) / 2, h = Math.sqrt(Math.max(0, l * l - (D / 2) * (D / 2)));
    const nx = -(wy - sy) / (D || 1), ny = (wx - sx) / (D || 1);
    ex = mx + nx * h; ey = my + ny * h;
    open = arm.closed ? 0.04 : 0.5;
  }
  const fa = Math.atan2(wy - ey, wx - ex);
  ctx.strokeStyle = '#3e4338'; ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 * u; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.lineWidth = 1.6 * u; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(wx, wy); ctx.stroke();
  // hydraulic rams along each segment: a bright chrome rod sliding out of a dark cylinder
  for (const [ax, ay, bx, by] of [[sx, sy, ex, ey], [ex, ey, wx, wy]]) {
    const a = Math.atan2(by - ay, bx - ax), off = 1.3 * u, px = -Math.sin(a) * off, py = Math.cos(a) * off;
    ctx.strokeStyle = '#1e211b'; ctx.lineWidth = 0.9 * u;
    ctx.beginPath(); ctx.moveTo(ax + px, ay + py); ctx.lineTo(ax + px + (bx - ax) * 0.5, ay + py + (by - ay) * 0.5); ctx.stroke();
    ctx.strokeStyle = '#a8aea4'; ctx.lineWidth = 0.45 * u;
    ctx.beginPath(); ctx.moveTo(ax + px + (bx - ax) * 0.5, ay + py + (by - ay) * 0.5); ctx.lineTo(ax + px + (bx - ax) * 0.85, ay + py + (by - ay) * 0.85); ctx.stroke();
  }
  ctx.fillStyle = '#2a2e26'; for (const [jx, jy] of [[sx, sy], [ex, ey]]) { ctx.beginPath(); ctx.arc(jx, jy, 1.4 * u, 0, TAU); ctx.fill(); }
  // what the claw is holding
  if (arm && arm.sp) {
    const fl = Math.max(3 * u, Math.min(arm.len / 0.09, 14) * u);
    ctx.save(); ctx.translate(wx + Math.cos(fa) * 3 * u, wy + Math.sin(fa) * 3 * u); ctx.rotate(fa + Math.PI / 2 + Math.sin(t * 20) * 0.25);
    drawSpecies(ctx, arm.sp, fl, t * 3, 1, 0);
    ctx.restore();
  }
  // the claw: two jointed fingers along the forearm's line
  ctx.strokeStyle = '#555a4c'; ctx.lineWidth = 0.8 * u;
  for (const sgn of [-1, 1]) {
    const a1 = fa + sgn * open * 1.1, a2 = fa - sgn * open * 0.5;
    const kx = wx + Math.cos(a1) * 3 * u, ky = wy + Math.sin(a1) * 3 * u;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(kx, ky); ctx.lineTo(kx + Math.cos(a2) * 2.4 * u, ky + Math.sin(a2) * 2.4 * u); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // sacrificial anodes on the sphere frame
  ctx.fillStyle = '#7a7c74'; ctx.fillRect(-5 * u, 6 * u, 2 * u, 1.2 * u); ctx.fillRect(16 * u, 4 * u, 2 * u, 1.2 * u);
  // stress cracks in the sphere when pushed past its rating
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
