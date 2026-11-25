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
import { ember } from './scrolls.js';

// (7.6.33, owner) more of them, so the wake reads as meant (30-40), and never a plain circle
const STYLE = {
  magnetic: { n: 30, size: 0.05, a: 0.34 },
  kinship: { n: 26, size: 0.06, a: 0.3 },
  eye: { n: 32, size: 0.035, a: 0.45 },
  secondwind: { n: 34, size: 0.045, a: 0.32 },
  phantom: { n: 38, size: 0.06, a: 0.32 },
  faithless: { n: 40, size: 0.03, a: 0.42 },
  motes: { n: 34, size: 0.035, a: 0.32 },
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
    // (7.6.29) he jumped (a respawn, a revive, a sail): the school starts again at his side instead of streaming across
    if (this.p.length && Math.hypot(this.p[0].x - e.x, this.p[0].y - e.y) > 8) this.kind = null;
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
    // (7.6.33, owner) every mark drawn as a thing, stretched a little along the way it moves, its brightness its own
    const dirOf = (q) => { const v = Math.hypot(q.vx, q.vy); return [Math.atan2(q.vy, q.vx), Math.min(2.6, 1 + v * 0.5)]; };
    if (this.kind === 'phantom') { // dark smoky flecks, tapered at both ends, drawn as shadow
      for (const q of this.p) { const [ang, str] = dirOf(q), r = st.size * ppm * (0.7 + 0.3 * Math.sin(q.ph * 2)), x = S(q.x), y = Sy(q.y);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = `rgba(6,8,16,${(A * (0.6 + 0.3 * Math.sin(q.ph))).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(-r * 1.6 * str, 0); ctx.quadraticCurveTo(-r * 0.2, -r * 0.7, r * 1.1, -r * 0.1); ctx.quadraticCurveTo(r * 0.3, r * 0.5, -r * 1.6 * str, 0); ctx.fill(); ctx.restore(); }
      ctx.restore(); return;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.p) {
      const x = S(q.x), y = Sy(q.y), r = Math.max(1, st.size * ppm), [ang, str] = dirOf(q), tw = 0.6 + 0.4 * Math.sin(q.ph * 2.3 + q.d * 7);
      if (this.kind === 'magnetic') { // a tiny fish, nose to where it's going
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = rgba(A * tw);
        ctx.beginPath(); ctx.moveTo(r, 0); ctx.quadraticCurveTo(0, -r * 0.42, -r * 0.8, 0); ctx.quadraticCurveTo(0, r * 0.42, r, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * 0.75, 0); ctx.lineTo(-r * 1.4, -r * 0.38); ctx.lineTo(-r * 1.25, 0); ctx.lineTo(-r * 1.4, r * 0.38); ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (this.kind === 'kinship') { // a little bell, pulsing, trailing a thread
        const pulse = 0.8 + 0.2 * Math.sin(q.ph * 3);
        ctx.fillStyle = rgba(A * 0.8 * tw); ctx.beginPath(); ctx.moveTo(x - r * pulse, y); ctx.bezierCurveTo(x - r * pulse, y - r * 0.9, x + r * pulse, y - r * 0.9, x + r * pulse, y); ctx.quadraticCurveTo(x, y - r * 0.25, x - r * pulse, y); ctx.fill();
        ctx.strokeStyle = rgba(A * 0.4); ctx.lineWidth = Math.max(0.6, r * 0.12); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(q.ph) * r, y + r * 1.5, x - q.vx * 4, y + r * 2.6); ctx.stroke();
      } else if (this.kind === 'eye') { // an almond of light that opens and closes
        const open = Math.max(0, Math.sin(q.ph * 1.6)); if (open < 0.05) continue; const w = r * 1.5, h = r * 0.6 * open;
        ctx.fillStyle = rgba(A * open); ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - h * 1.6, x + w, y); ctx.quadraticCurveTo(x, y + h * 1.6, x - w, y); ctx.fill();
      } else if (this.kind === 'secondwind') { // a little cluster of bubbles, each a wobbling, uneven skin with a bright crescent
        const n = 1 + Math.floor((q.d * 7) % 3);
        for (let k = 0; k < n; k++) { const bx = x + (k ? Math.sin(q.ph + k * 2.1) * r * 1.3 : 0), by = y - Math.sin(q.ph) * r - k * r * 1.1, rr = r * (k ? 0.5 : 0.8) * (0.8 + 0.2 * Math.sin(q.ph * 0.7 + k)), sq = 1 + 0.12 * Math.sin(q.ph * 3 + k);
          ctx.strokeStyle = rgba(A * 0.75 * tw); ctx.lineWidth = Math.max(0.6, rr * 0.16); ctx.beginPath(); ctx.ellipse(bx, by, rr * sq, rr / sq, q.ph * 0.3, 0, TAU); ctx.stroke();
          ctx.strokeStyle = rgba(A * tw); ctx.lineWidth = Math.max(0.6, rr * 0.22); ctx.beginPath(); ctx.ellipse(bx, by, rr * sq * 0.7, rr / sq * 0.7, 0, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke(); }
      } else if (this.kind === 'faithless') { // embers rising as slivers, and grey flakes of ash turning
        if (q.side > 0.5) ember(ctx, x, y, r * 3.2 * str, Math.max(0.8, r * 0.5), -Math.PI / 2 + Math.sin(q.ph) * 0.4, A * 1.6 * tw);
        else { ctx.save(); ctx.translate(x, y); ctx.rotate(q.ph * 0.8); ctx.fillStyle = `rgba(150,140,130,${(A * 0.45 * tw).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(r * 0.6, -r * 0.6); ctx.lineTo(r, r * 0.4); ctx.lineTo(-r * 0.4, r * 0.5); ctx.closePath(); ctx.fill(); ctx.restore(); }
      } else { // a mote: a tiny sharp streak along its way
        const L = r * 1.6 * str; ctx.strokeStyle = rgba(A * tw); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.7, r * 0.45); ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * L, y - Math.sin(ang) * L); ctx.lineTo(x + Math.cos(ang) * L * 0.3, y + Math.sin(ang) * L * 0.3); ctx.stroke(); }
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
