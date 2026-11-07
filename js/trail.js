// The wake of a Legendary (2.8.2). A few dim motes that swim with Earl like a small school: while he swims
// they stream out behind him; when he stops they catch up, drift a little past him and hang there ahead of
// him, milling, until he moves again. What they look like depends on the net's own skill:
//   Magnetic      tiny fish, and a school of pale glowing fish round him that can't be caught (only drawn)
//   Kinship       little bells, pulsing, each trailing a thread
//   Eye of the Sea  sparks that open and close like eyes
//   Second Wind   small bubbles, rising
//   Phantom       dark flecks, barely there
//   Faithless     ash and embers
//   (a Legendary that isn't a net)  plain motes
import { TAU, hexToRgb, clamp } from './util.js';

const STYLE = {
  magnetic: { n: 12, size: 0.05, a: 0.34 },
  kinship: { n: 9, size: 0.06, a: 0.3 },
  eye: { n: 10, size: 0.035, a: 0.45 },
  secondwind: { n: 12, size: 0.045, a: 0.3 },
  phantom: { n: 14, size: 0.06, a: 0.3 },
  faithless: { n: 14, size: 0.03, a: 0.4 },
  motes: { n: 10, size: 0.035, a: 0.3 },
};
const rnd = (a, b) => a + Math.random() * (b - a);

function makeSwarm(n, x, y, spread) {
  return Array.from({ length: n }, (_, i) => ({ x: x + rnd(-spread, spread), y: y + rnd(-spread, spread), vx: 0, vy: 0,
    d: 0.35 + (i / n) * 1.4 + rnd(-0.1, 0.1), side: rnd(-1, 1), ph: rnd(0, TAU), sp: rnd(0.7, 1.3) }));
}

export class Wake {
  constructor() { this.kind = null; this.p = []; this.fish = []; this.t = null; this.lead = 0; }
  reset() { this.kind = null; this.p.length = 0; this.fish.length = 0; this.t = null; }

  update(e, time, kind) {
    const dt = this.t === null ? 0 : clamp(time - this.t, 0, 0.1); this.t = time;
    if (kind !== this.kind) { this.kind = kind; const st = STYLE[kind] || STYLE.motes; this.p = makeSwarm(st.n, e.x, e.y, 0.4); this.fish = kind === 'magnetic' ? makeSwarm(8, e.x, e.y, 1.2) : []; }
    const v = Math.hypot(e.vx || 0, e.vy || 0), moving = v > 0.35;
    // how far "ahead of him" the school sits: grows once he stops, so they drift past him and settle there
    this.lead += ((moving ? 0 : 1) - this.lead) * (1 - Math.exp(-dt * (moving ? 3 : 0.9)));
    const hx = moving ? -(e.vx / v) : e.facing, hy = moving ? -(e.vy / v) : 0; // behind him while he swims; the way he faces when still
    const steer = (q, tx, ty, k, damp, wob) => {
      q.ph += dt * q.sp;
      tx += Math.sin(q.ph * 1.7) * wob; ty += Math.cos(q.ph * 1.3) * wob * 0.7;
      q.vx += ((tx - q.x) * k - q.vx * damp) * dt; q.vy += ((ty - q.y) * k - q.vy * damp) * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
    };
    for (const q of this.p) {
      const lx = -hy, ly = hx; // across his path
      const behind = { x: e.x + hx * q.d + lx * q.side * 0.25 * q.d, y: e.y + hy * q.d + ly * q.side * 0.25 * q.d };
      const ahead = { x: e.x + e.facing * (0.5 + q.d * 0.45), y: e.y - 0.15 + q.side * 0.45 };
      const L = this.lead;
      steer(q, behind.x * (1 - L) + ahead.x * L, behind.y * (1 - L) + ahead.y * L, 6, 3.2, 0.08 + 0.18 * L);
    }
    // Magnetic's school: a loose ring round him, turning slowly, that follows him and noses ahead when he stops
    this.fish.forEach((q, i) => {
      const a = time * 0.35 * (i % 2 ? 1 : -1) * 0.6 + (i / this.fish.length) * TAU, r = 1.1 + (i % 3) * 0.3;
      const cx = e.x + e.facing * 0.6 * this.lead + (moving ? hx * 0.5 : 0), cy = e.y - 0.1;
      steer(q, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55, 2.2, 1.6, 0.15);
    });
  }

  // S, Sy: world to screen; ppm: pixels a metre; lit: his light is on (the glowing things glow more in it, dimly otherwise)
  draw(ctx, S, Sy, ppm, col, lit, time) {
    const st = STYLE[this.kind] || STYLE.motes, c = hexToRgb(col || '#c8d8d0'), rgba = (a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
    const A = st.a * (lit ? 1 : 0.6);
    ctx.save();
    if (this.kind === 'phantom') {
      // dark flecks: drawn as shadow, not light
      for (const q of this.p) { const r = st.size * ppm * (0.7 + 0.3 * Math.sin(q.ph * 2)); ctx.fillStyle = `rgba(6,8,16,${(A * 0.9).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(S(q.x), Sy(q.y), r * 1.4, r, Math.atan2(q.vy, q.vx), 0, TAU); ctx.fill(); }
      ctx.restore(); return;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.p) {
      const x = S(q.x), y = Sy(q.y), r = Math.max(1, st.size * ppm);
      if (this.kind === 'magnetic') { // a tiny fish, nose to where it's going
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(q.vy, q.vx)); ctx.fillStyle = rgba(A);
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.38, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(-r * 1.5, -r * 0.4); ctx.lineTo(-r * 1.5, r * 0.4); ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (this.kind === 'kinship') { // a little bell with a thread
        const pulse = 0.8 + 0.2 * Math.sin(q.ph * 3);
        ctx.fillStyle = rgba(A * 0.8); ctx.beginPath(); ctx.ellipse(x, y, r * pulse, r * 0.7, 0, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = rgba(A * 0.45); ctx.lineWidth = Math.max(0.6, r * 0.12); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(q.ph) * r, y + r * 1.5, x - q.vx * 4, y + r * 2.6); ctx.stroke();
      } else if (this.kind === 'eye') { // a spark that opens and closes
        const open = Math.max(0, Math.sin(q.ph * 1.6)); if (open < 0.05) continue;
        ctx.fillStyle = rgba(A * open); ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * 0.55 * open, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(A * open * 0.4); ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill();
      } else if (this.kind === 'secondwind') { // a small bubble
        ctx.strokeStyle = rgba(A); ctx.lineWidth = Math.max(0.7, r * 0.18); ctx.beginPath(); ctx.arc(x, y - Math.sin(q.ph) * r, r * (0.7 + 0.3 * Math.sin(q.ph * 0.7)), 0, TAU); ctx.stroke();
      } else if (this.kind === 'faithless') { // ash and embers: most grey, a few warm
        const ember = q.side > 0.5, fl = 0.6 + 0.4 * Math.sin(q.ph * 4);
        ctx.fillStyle = ember ? rgba(A * fl) : `rgba(150,140,130,${(A * 0.5).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r * (ember ? 1 : 0.8), 0, TAU); ctx.fill();
      } else { ctx.fillStyle = rgba(A * (0.7 + 0.3 * Math.sin(q.ph * 2))); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    }
    // the uncatchable school
    for (const q of this.fish) {
      const x = S(q.x), y = Sy(q.y), L = (0.34 + (q.d % 0.12)) * ppm, dir = q.vx >= 0 ? 1 : -1, tilt = clamp(Math.atan2(q.vy, Math.abs(q.vx) + 0.05), -0.5, 0.5);
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(tilt);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(lit ? 0.22 : 0.12).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(L * 0.5, 0); ctx.quadraticCurveTo(L * 0.1, -L * 0.22, -L * 0.3, -L * 0.05); ctx.lineTo(-L * 0.55, -L * 0.2); ctx.lineTo(-L * 0.48, 0); ctx.lineTo(-L * 0.55, L * 0.2); ctx.lineTo(-L * 0.3, L * 0.05); ctx.quadraticCurveTo(L * 0.1, L * 0.22, L * 0.5, 0); ctx.fill();
      // its light organs: a little row of dots along its flank, the only bright bit
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(lit ? 0.55 : 0.3).toFixed(3)})`;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(L * (0.25 - k * 0.15), L * 0.07, Math.max(0.6, L * 0.025), 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }
}
