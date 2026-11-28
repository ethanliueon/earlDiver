// (7.9.0, owner) The ice V slush of the second sea's deepest water.
//
// The science: under the pressure down there the ice that forms is ice V, denser than the water, so it sinks. Near the
// floor the water is barely above freezing and ice forms in it as frazil: clear platelets, needles and loose flocs that
// snow slowly down, thicken to slush and lie as a mush on the ice. Nothing glows; the flakes are clear, seen only where a
// lamp falls on them, and a plate catches the light only for a moment, when its face turns toward it.
//
// How it is drawn (painted pictures baked by tools/bake_slush.py, nothing drawn as plain shapes):
//  - the water a little way off: three tiling layers (sparse sharp flakes, a few large out-of-focus ones, and the milky
//    mush near the floor), pinned to the world and settling slowly, faded in by depth in thin bands. The same few fills
//    a frame whatever he does, sprinting or dashing included.
//  - the water right round him: a fixed pool of pieces from the atlas (plates, slivers, needles, flocs), each turning
//    slowly as it sinks at its own pace, moved by the water's flow round his body as he swims (the flow round a moving
//    cylinder, from a formula) and stirred in his wake; the ones he leaves behind are put back ahead of him.
//  - all of it is drawn before the light map multiplies the scene: where no light falls, none of it shows. That is the
//    "only where your lamp is" for nothing: no test per piece.
// It fades in over kilometres: a stray glint from 35 km, faint from 40 km, slush below 43.5 km, mush on the ice.
import { AREA2 } from './world.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// how much ice is in the water, 0..1, by depth (in the second sea only)
export function slushAmount(x, y) {
  if (x <= AREA2.edge || y < 35000) return 0;
  return 0.06 * ss(35000, 40000, y) + 0.24 * ss(40000, 43500, y) + 0.7 * ss(43500, AREA2.ice - 4, y);
}
const img = (src) => { const im = new Image(); im.onload = () => { im.ok = true; }; im.src = src; return im; };
const N = 120;

export class Slush {
  constructor() {
    this.far = img('assets/textures/slush_far.png'); this.soft = img('assets/textures/slush_soft.png');
    this.mush = img('assets/textures/slush_mush.png'); this.atlas = img('assets/textures/ice_pieces.png');
    this.p = []; this.trail = []; this.rng = 1;
  }
  rnd() { this.rng = (this.rng * 16807) % 2147483647; return this.rng / 2147483647; }
  // one piece, put somewhere round him: ahead of where he is going when he moves, anywhere round him when still
  spawn(q, e, ahead) {
    const r = this.rnd.bind(this), sp = Math.hypot(e.vx || 0, e.vy || 0);
    let a = r() * Math.PI * 2, d = 1.2 + r() * 4.6;
    if (ahead && sp > 0.3) { a = Math.atan2(e.vy, e.vx) + (r() - 0.5) * 2.2; d = 4 + r() * 2.5; }
    q.x = e.x + Math.cos(a) * d; q.y = e.y + Math.sin(a) * d * 0.7;
    const kind = Math.floor(r() * 8); q.sp = kind; q.size = (0.03 + r() * r() * 0.09) * (kind === 7 ? 0.6 : 1);   // a few cm: most small
    q.sink = 0.025 + 9 * q.size * q.size;            // settling: the larger, the faster, as in still water
    q.rot = r() * Math.PI * 2; q.rotV = (r() - 0.5) * 0.9; q.vx = 0; q.vy = q.sink; q.blur = r() < 0.28; q.ph = r() * 6.28;
  }
  update(g, dt) {
    const e = g.earl; if (!e || e.inSub) { this.n = 0; return; }
    const v = slushAmount(e.x, e.y); this.v = v;
    const want = v < 0.004 ? 0 : Math.round(N * Math.min(1, Math.sqrt(v / 0.5)) * (this.lite ? 0.55 : 1));
    while (this.p.length < want) { const q = {}; this.spawn(q, e, false); this.p.push(q); }
    if (this.p.length > want) this.p.length = want;
    this.n = want; if (!want) return;
    // his path: a short trail of where he was and how fast he went, for the stirring in his wake
    this.trailT = (this.trailT || 0) + dt; if (this.trailT > 0.12) { this.trailT = 0; this.trail.unshift({ x: e.x, y: e.y, vx: e.vx || 0, vy: e.vy || 0, age: 0 }); if (this.trail.length > 10) this.trail.pop(); }
    for (const T of this.trail) T.age += dt;
    const Ux = e.vx || 0, Uy = e.vy || 0, a2 = 0.45 * 0.45, damp = 1 - Math.exp(-dt * 2.6);
    for (const q of this.p) {
      const rx = q.x - e.x, ry = (q.y - e.y) / 0.7, d2 = rx * rx + ry * ry;
      let tx = 0, ty = q.sink;                       // still water: it just settles
      if (d2 > 0.04) { // the flow round his body: a cylinder moving at his speed pushes the water out of its way and lets it close behind
        const k = a2 / d2, c2 = (rx * rx - ry * ry) / d2, s2 = (2 * rx * ry) / d2;
        tx += k * (Ux * c2 + Uy * s2); ty += k * (Ux * s2 - Uy * c2);
      }
      for (const T of this.trail) { // the wake: water he passed through still turning, slowly letting go
        const wx = q.x - T.x, wy = q.y - T.y, w2 = wx * wx + wy * wy; if (w2 > 4) continue;
        const sp = Math.hypot(T.vx, T.vy), str = sp * 0.35 * Math.exp(-T.age * 1.4) * (1 - Math.sqrt(w2) / 2), side = (T.vx * wy - T.vy * wx) > 0 ? 1 : -1;
        const w = Math.sqrt(w2) + 0.05; tx += (-wy / w) * str * side; ty += (wx / w) * str * side;
      }
      tx += Math.sin(g.time * 0.7 + q.ph) * 0.02;    // the faintest sway
      q.vx += (tx - q.vx) * damp; q.vy += (ty - q.vy) * damp;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.rotV * dt;
      const dx = q.x - e.x, dy = q.y - e.y;
      if (dx * dx + dy * dy > 49 || q.y > g.world.floorAt(q.x) - 0.05) this.spawn(q, e, true);
    }
    this.stir(g, e, dt, v);
  }
  // (7.9.1, owner) what he stirs up: each stroke of his fins and each sweep of the net throws out a puff of the fine
  // ice it passes through, which the thick water stops within a hand's breadth and lets settle again; the pieces
  // close to a fin are pushed aside by the stroke. A small fixed pool, nothing when the water is clear
  stir(g, e, dt, v) {
    const F = this.fx || (this.fx = []);
    for (let i = F.length - 1; i >= 0; i--) { const f = F[i]; f.age += dt; if (f.age > f.life) { F[i] = F[F.length - 1]; F.pop(); continue; }
      const dk = Math.exp(-dt * 5); f.vx *= dk; f.vy = f.vy * dk + 0.03 * (1 - dk); f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.rv * dt; }
    if (v < 0.08) return;
    const r = this.rnd.bind(this), sp = Math.hypot(e.vx || 0, e.vy || 0), dx = sp > 0.05 ? e.vx / sp : e.facing || 1, dy = sp > 0.05 ? e.vy / sp : 0;
    const emit = (x, y, vx, vy, n) => { for (let k = 0; k < n && F.length < 70; k++) F.push({ x: x + (r() - 0.5) * 0.25, y: y + (r() - 0.5) * 0.25, vx: vx * (0.5 + r()) + (r() - 0.5) * 0.25, vy: vy * (0.5 + r()) + (r() - 0.5) * 0.25, age: 0, life: 1.2 + r() * 1.6, sz: 0.025 + r() * 0.05, sp: Math.floor(r() * 8), rot: r() * 6.3, rv: (r() - 0.5) * 2 }); };
    // a stroke of the fins: each half kick, behind him
    const half = Math.floor((e.kick || 0) / Math.PI);
    if (this.lastHalf !== undefined && half !== this.lastHalf && (e.labour || 0) > 0.05) {
      const fx = e.x - dx * 1.05, fy = e.y - dy * 1.05 + 0.15, n = Math.round(2 + 5 * v);
      emit(fx, fy, -dx * 0.5 + (r() - 0.5) * 0.3, -dy * 0.5 + (r() - 0.5) * 0.3, n);
      for (const q of this.p) { const qx = q.x - fx, qy = q.y - fy, d2 = qx * qx + qy * qy; if (d2 < 1.4 && d2 > 1e-4) { const d = Math.sqrt(d2), f = 0.35 * (1 - d / 1.2); q.vx += (qx / d) * f; q.vy += (qy / d) * f; } }
    }
    this.lastHalf = half;
    // the net's sweep: along its arc in front of him, while it moves
    const C = g.capture; if (C && C.kind === 'net' && !C.done && C.dur > 0) {
      const p = Math.min(1, C.t / C.dur), fc = e.facing || 1; this.netAcc = (this.netAcc || 0) + dt * (10 + 22 * v);
      while (this.netAcc > 1) { this.netAcc -= 1; const a = -1.1 + 2.0 * p, nx = e.x + fc * (0.5 + 1.0 * Math.cos(a)), ny = e.y + 1.0 * Math.sin(a); emit(nx, ny, fc * -Math.sin(a) * 0.6 * -1, Math.cos(a) * 0.6, 1); }
    } else this.netAcc = 0;
  }
  // the far layers, faded in by depth in thin bands; then the near pieces. ctx in screen space
  draw(ctx, g, S, Sy, ppm, W, H, t, camX, camY, camH, lampA) {
    const e = g.earl; if (!e) return;
    const yTop = camY - camH / 2 - 2, yBot = camY + camH / 2 + 2;
    if (camX - W / 2 / ppm > AREA2.edge + 400 || yBot < 35000) { /* far from the ice: nothing */ }
    const x0 = Math.max(0, S(AREA2.edge)); if (x0 >= W) return;
    const layer = (im, tileM, sinkMS, sway, alphaOf, key) => {
      if (!im.ok) return; const k = tileM * ppm / im.width; if (k <= 0) return;
      const pat = this[key] || (this[key] = ctx.createPattern(im, 'repeat'));
      const ox = S(0) + Math.sin(t * 0.05 + tileM) * sway * ppm, oy = Sy(0) + (t * sinkMS) * ppm;
      pat.setTransform(new DOMMatrix([k, 0, 0, k, ox % (im.width * k), oy % (im.height * k)]));
      ctx.fillStyle = pat;
      const aT = alphaOf(yTop), aB = alphaOf(yBot);
      if (Math.max(aT, aB) < 0.004) return;
      if (Math.abs(aT - aB) < 0.015) { ctx.globalAlpha = (aT + aB) / 2; ctx.fillRect(x0, 0, W - x0, H); return; }
      // (7.9.1) thin bands meeting exactly, never overlapping (the half pixel of overlap drew a faint line at every seam);
      // fine enough (4 px) that the steps between them are below what an eye can tell
      const bh = 4, X0 = Math.floor(x0); for (let py = 0; py < H; py += bh) { const wy = camY + (py + bh / 2 - H / 2) / ppm, a = alphaOf(wy); if (a < 0.004) continue; ctx.globalAlpha = a; ctx.fillRect(X0, py, W - X0, Math.min(bh, H - py)); }
    };
    ctx.save();
    const amt = (y) => slushAmount(AREA2.edge + 1, y);
    layer(this.far, 8, 0.03, 0.4, (y) => Math.min(0.9, amt(y) * 2.6), 'pFar');
    if (!this.lite) layer(this.soft, 13, 0.06, 0.7, (y) => Math.min(0.3, amt(y) * 0.8), 'pSoft'); // (7.9.1) fainter: thick, the big soft flakes read as clouds
    layer(this.mush, 6, 0.012, 0.15, (y) => 0.4 * ss(0.3, 1, amt(y)), 'pMush'); // (7.9.7, owner) the ice nearly clear: the mush a veil, not a milk
    ctx.globalAlpha = 1;
    // the near pieces
    const A = this.atlas; if (A.ok && this.n) {
      const sp = Math.hypot(e.vx || 0, e.vy || 0), streak = Math.min(1.8, 1 + sp * 0.14), ma = Math.atan2(e.vy || 0, e.vx || 0);
      for (const q of this.p) {
        const px = S(q.x), py = Sy(q.y); if (px < x0 - 20 || px > W + 20 || py < -20 || py > H + 20) continue;
        const s = Math.max(3, q.size * ppm * (q.blur ? 9 : 6)), face = Math.cos(q.rot * 2 - (lampA || 0)), glint = !q.blur && face > 0.93;
        const row = q.blur ? 2 : glint ? 1 : 0;
        ctx.save(); ctx.translate(px, py);
        if (streak > 1.04) { ctx.rotate(ma); ctx.scale(streak, 1 / Math.sqrt(streak)); ctx.rotate(-ma); } // a little drawn out along his motion, as a camera sees it
        ctx.rotate(q.rot); ctx.globalAlpha = (q.blur ? 0.55 : 0.85) * Math.min(1, 0.35 + this.v * 1.6);
        ctx.drawImage(A, q.sp * 64, row * 64, 64, 64, -s / 2, -s / 2, s, s); ctx.restore();
      }
      // the puffs he stirred up: fine, soft, out of focus, fading as they settle
      if (this.fx) for (const f of this.fx) { const px = S(f.x), py = Sy(f.y); if (px < x0 - 20 || px > W + 20 || py < -20 || py > H + 20) continue;
        const s = Math.max(3, f.sz * ppm * 7), k = f.age / f.life; ctx.save(); ctx.translate(px, py); ctx.rotate(f.rot);
        ctx.globalAlpha = 0.7 * Math.min(1, f.age * 6) * (1 - k * k) * Math.min(1, 0.4 + this.v * 1.5);
        ctx.drawImage(A, f.sp * 64, 128, 64, 64, -s / 2, -s / 2, s, s); ctx.restore(); }
    }
    ctx.restore();
  }
  // (7.9.1, owner) no floor to be seen at the bottom: over its last ten metres the mush thickens until it is the ice. Drawn
  // after the floor and what lies on it, so the floor's line, its colour and anything on it are lost in the mush; a
  // smooth gradient (no bands), the same milky colour as the mush, then the mush's own grain over it. Like the rest of the
  // slush it is drawn before the light map: it shows only where a light falls
  drawBody(ctx, S, Sy, ppm, W, H, t, camY) {
    // (7.9.1, owner) thickening over 150 m, not 10: within any one screen it changes too little to see as a layer, and
    // over the last 12 m it is whole, so the floor is never seen at all
    const A = AREA2, top = A.ice - 160, full = A.ice - 12, yA = Sy(top); if (yA >= H) return;
    const xa = Math.max(0, Math.floor(S(A.drop2 + 4))), xb = Math.min(W, Math.ceil(S(A.cliff - 470))); if (xb <= xa) return;
    const y0 = Math.max(0, Math.floor(yA)), alphaAt = (y) => { const u = Math.min(1, Math.max(0, (y - top) / (full - top))); return Math.pow(u * u * (3 - 2 * u), 1.4); };
    ctx.save();
    const gr = ctx.createLinearGradient(0, yA, 0, Sy(full));
    for (let k = 0; k <= 12; k++) { const u = k / 12; gr.addColorStop(u, `rgba(70,96,108,${(0.7 * alphaAt(top + u * (full - top))).toFixed(3)})`); /* (7.9.7, owner) clear ice: a dark glassy body that still hides the floor's line */ }
    ctx.fillStyle = gr; ctx.fillRect(xa, y0, xb - xa, H - y0);
    const im = this.mush; if (im.ok) {
      const k = 6 * ppm / im.width, pat = this.pBody || (this.pBody = ctx.createPattern(im, 'repeat'));
      pat.setTransform(new DOMMatrix([k, 0, 0, k, (S(0) + Math.sin(t * 0.05 + 6) * 0.15 * ppm) % (im.width * k), (Sy(0) + t * 0.012 * ppm) % (im.height * k)]));
      ctx.fillStyle = pat;
      const aT = 0.16 * alphaAt(camY - H / 2 / ppm), aB = 0.16 * alphaAt(camY + H / 2 / ppm);
      if (Math.abs(aT - aB) < 0.01) { ctx.globalAlpha = (aT + aB) / 2; ctx.fillRect(xa, y0, xb - xa, H - y0); }
      else for (let py = y0; py < H; py += 4) { const wy = camY + (py + 2 - H / 2) / ppm, a = 0.16 * alphaAt(wy); if (a < 0.004) continue; ctx.globalAlpha = a; ctx.fillRect(xa, py, xb - xa, Math.min(4, H - py)); }
    }
    ctx.restore();
  }
}
