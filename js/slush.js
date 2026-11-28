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
    if (!this.lite) layer(this.soft, 13, 0.06, 0.7, (y) => Math.min(0.55, amt(y) * 1.3), 'pSoft');
    layer(this.mush, 6, 0.012, 0.15, (y) => 0.85 * ss(0.3, 1, amt(y)), 'pMush');
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
    }
    ctx.restore();
  }
  // (7.9.1, owner) no floor to be seen at the bottom: over its last ten metres the mush thickens until it is the ice. Drawn
  // after the floor and what lies on it, so the floor's line, its colour and anything on it are lost in the mush; a
  // smooth gradient (no bands), the same milky colour as the mush, then the mush's own grain over it. Like the rest of the
  // slush it is drawn before the light map: it shows only where a light falls
  drawBody(ctx, S, Sy, ppm, W, H, t, camY) {
    const A = AREA2, top = A.ice - 10, yA = Sy(top); if (yA >= H) return;
    const xa = Math.max(0, Math.floor(S(A.drop2 + 4))), xb = Math.min(W, Math.ceil(S(A.cliff - 470))); if (xb <= xa) return;
    const yB = Sy(A.ice - 0.3), y0 = Math.max(0, Math.floor(yA));
    ctx.save();
    const gr = ctx.createLinearGradient(0, yA, 0, yB);
    for (let k = 0; k <= 8; k++) { const u = k / 8, a = Math.pow(u * u * (3 - 2 * u), 1.6); gr.addColorStop(u, `rgba(190,203,210,${a.toFixed(3)})`); }
    ctx.fillStyle = gr; ctx.fillRect(xa, y0, xb - xa, H - y0);
    const im = this.mush; if (im.ok) {
      const k = 6 * ppm / im.width, pat = this.pBody || (this.pBody = ctx.createPattern(im, 'repeat'));
      pat.setTransform(new DOMMatrix([k, 0, 0, k, (S(0) + Math.sin(t * 0.05 + 6) * 0.15 * ppm) % (im.width * k), (Sy(0) + t * 0.012 * ppm) % (im.height * k)]));
      ctx.fillStyle = pat;
      for (let py = y0; py < H; py += 4) { const wy = camY + (py + 2 - H / 2) / ppm, a = 0.75 * ss(top, A.ice - 1, wy); if (a < 0.004) continue; ctx.globalAlpha = a; ctx.fillRect(xa, py, xb - xa, Math.min(4, H - py)); }
    }
    ctx.restore();
  }
}
