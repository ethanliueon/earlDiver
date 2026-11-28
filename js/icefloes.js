// (7.9.7, owner) The mush's ice as real slabs, but only round him.
//
// Away from him the mush stays the slush's painted layers (slush.js). Within a few metres of him, while the ice holds
// him (player.js e.iceK), up to 34 slabs of clear ice are real bodies: each a flat, irregular plate that drifts, turns,
// is pushed by his body and pushes its neighbours, and is held loosely in the pack (a weak spring to a rest place that
// itself gives way, so a slab pushed aside stays aside). When he tears free (player.js e.ice, a "snap") the slabs in
// front of him are shoved, cracks run across the nearest, and chips of ice spin off. Cheap: a few dozen circles tested
// in pairs, nothing outside the screen drawn.
//
// The ice is nearly clear: a slab is drawn as a faint body with its edges catching his lamp (bright on the faces
// turned to the light, dark on the far ones) and a second, offset outline for its thickness. Drawn before the light map,
// like the rest of the slush, so it shows only where a light falls.
import { AREA2 } from './world.js';
const TAU = Math.PI * 2;
const MAX = 34;

export class IceField {
  constructor() { this.f = []; this.chips = []; this.k = 0; this.seed = 7; this.lastN = 0; }
  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  // a slab: an irregular plate, a little flattened, its corners not all alike
  make(x, y) {
    const r = this.rnd.bind(this), R = (0.2 + r() * r() * 0.6) * (this.sz || 1), n = 7 + Math.floor(r() * 4), asp = 0.45 + r() * 0.4, pts = [];
    for (let i = 0; i < n; i++) { const a = (i + (r() - 0.5) * 0.6) / n * TAU, rr = R * (0.72 + r() * 0.34); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * asp]); }
    return { x, y, hx: x, hy: y, vx: 0, vy: 0, a: r() * TAU, va: 0, R, rc: R * (0.55 + asp * 0.35), pts, cracks: [], al: 0, out: false, tint: r(), gap: pts.map(() => r() < 0.22), ew: pts.map(() => 0.6 + r() * 0.8) }; // gap: an edge chipped dull; ew: each edge's own weight
  }
  place(e, ahead) {
    const r = this.rnd.bind(this), sp = Math.hypot(e.vx || 0, e.vy || 0);
    for (let k = 0; k < 8; k++) {
      let a = r() * TAU, d = 1.0 + r() * 4.6;
      if (ahead && sp > 0.02) { a = Math.atan2(e.vy, e.vx) + (r() - 0.5) * 2.4; d = 3.6 + r() * 2; }
      const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.75;
      if (this.f.every((q) => Math.hypot(q.x - x, q.y - y) > q.rc + 0.25)) return [x, y];
    }
    return null;
  }
  // a crack across a slab: from a point on its edge inward, branching once; it grows when the slab is hit again
  crack(q, power) {
    const r = this.rnd.bind(this);
    if (q.cracks.length < 3 && (q.cracks.length === 0 || r() < 0.5)) {
      const i = Math.floor(r() * q.pts.length), [px, py] = q.pts[i], a = Math.atan2(-py, -px) + (r() - 0.5) * 0.9;
      q.cracks.push({ x: px * 0.96, y: py * 0.96, a, len: 0, max: q.R * (0.8 + r() * 0.9), br: r() < 0.6 ? 0.35 + r() * 0.4 : 0, bs: r() < 0.5 ? -1 : 1, w: (r() - 0.5) * 0.5 });
    }
    for (const c of q.cracks) c.len = Math.min(c.max, c.len + q.R * (0.25 + 0.45 * power));
  }
  update(g, dt, floorAt) {
    const e = g.earl; if (!e || e.inSub) { this.k = 0; this.f.length = 0; this.chips.length = 0; return; }
    // (7.9.8, owner) seen well before they hold him: over the ice floor the slabs drift in from 300 m above it, more and
    // larger the nearer the floor (sz), so the pack is there to see on the way down, not only once he is stuck in it
    const fy0 = floorAt(e.x), overIce = e.x > AREA2.drop2 && fy0 > AREA2.ice - 40, h = fy0 - e.y, vis = overIce ? Math.pow(Math.min(1, Math.max(0, 1 - h / 300)), 1.3) : 0;
    this.sz = 0.55 + 0.45 * Math.max(vis, e.iceK || 0);
    const want = Math.max(e.iceK || 0, vis * 0.85); this.k += (want - this.k) * (1 - Math.exp(-dt * 1.2));
    const n = this.k < 0.02 ? 0 : Math.round(MAX * Math.min(1, this.k * 1.6) * (this.lite ? 0.7 : 1));
    let live = 0; for (const q of this.f) if (!q.out) live++;
    while (live < n) { const p = this.place(e, false); if (!p) break; this.f.push(this.make(p[0], p[1])); live++; }
    if (live > n) for (const q of this.f) { if (live <= n) break; if (!q.out) { q.out = true; live--; } }
    // his body: three circles along it
    const fc = e.facing || 1, ax = Math.cos(e.angle || 0) * fc, ay = Math.sin(e.angle || 0), body = [[-0.62, 0.26], [0, 0.32], [0.5, 0.25]].map(([o, rr]) => [e.x + ax * o, e.y + ay * o, rr]);
    const I = e.ice, slip = I && I.slip > 0, mvx = slip ? I.svx : (e.vx || 0) * 0.15, mvy = slip ? I.svy : (e.vy || 0) * 0.15;
    // a snap: the ice in front of him gives way
    if (I && I.n !== this.lastN) {
      this.lastN = I.n; const P = I.snapP || 0.5, dl = Math.hypot(I.svx, I.svy) || 1, dx = I.svx / dl, dy = I.svy / dl;
      const near = this.f.filter((q) => !q.out).map((q) => ({ q, d: Math.hypot(q.x - e.x - dx * 0.6, q.y - e.y - dy * 0.6) })).sort((a, b) => a.d - b.d);
      near.slice(0, 1 + Math.round(P * 2)).forEach(({ q }) => this.crack(q, P));
      for (const { q, d } of near) { if (d > 2.2) break; const nx = q.x - e.x, ny = q.y - e.y, nl = Math.hypot(nx, ny) || 1, f = P * 0.9 * (1 - d / 2.2); q.vx += (nx / nl * 0.6 + dx * 0.4) * f; q.vy += (ny / nl * 0.6 + dy * 0.4) * f; q.va += (this.rnd() - 0.5) * 3 * f; }
      const cn = Math.round(3 + 7 * P); for (let k = 0; k < cn && this.chips.length < 60; k++) { const a = Math.atan2(dy, dx) + (this.rnd() - 0.5) * 2.6, s = 0.4 + this.rnd() * 1.4 * P;
        this.chips.push({ x: e.x + dx * 0.7 + (this.rnd() - 0.5) * 0.4, y: e.y + dy * 0.7 + (this.rnd() - 0.5) * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: this.rnd() * TAU, rv: (this.rnd() - 0.5) * 14, sp: Math.floor(this.rnd() * 8), sz: 0.025 + this.rnd() * 0.05, age: 0, life: 1.4 + this.rnd() * 1.6 }); }
    }
    const damp = Math.exp(-dt * 3.2), F = this.f;
    for (let i = F.length - 1; i >= 0; i--) {
      const q = F[i];
      q.al = q.out ? q.al - dt * 1.4 : Math.min(1, q.al + dt * 1.6); if (q.out && q.al <= 0) { F.splice(i, 1); continue; }
      // held in the pack: a weak pull to its rest place, which slowly follows it (pushed aside, it stays aside)
      q.vx += (q.hx - q.x) * 0.5 * dt; q.vy += (q.hy - q.y) * 0.5 * dt + 0.004 * dt;
      q.hx += (q.x - q.hx) * (1 - Math.exp(-dt * 0.35)); q.hy += (q.y - q.hy) * (1 - Math.exp(-dt * 0.35));
      q.vx *= damp; q.vy *= damp; q.va *= Math.exp(-dt * 2.4);
      q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt;
      const fy = floorAt(q.x) - q.rc * 0.6; if (q.y > fy) { q.y = fy; q.vy = Math.min(0, q.vy); }
      // pushed by his body
      for (const [bx, by, br] of body) { const dx = q.x - bx, dy = q.y - by, d = Math.hypot(dx, dy), m = q.rc + br; if (d < m && d > 1e-4) { const nx = dx / d, ny = dy / d, ov = m - d; q.x += nx * ov * 0.8; q.y += ny * ov * 0.8; const vn = mvx * nx + mvy * ny; if (vn > 0) { q.vx += nx * vn * 0.7; q.vy += ny * vn * 0.7; } q.va += (nx * mvy - ny * mvx) * 0.6 / q.R; } }
      // too far behind him: let it go, and a new one comes in ahead
      if (!q.out && Math.hypot(q.x - e.x, q.y - e.y) > 6.6) { q.out = true; const p = this.place(e, true); if (p) F.push(this.make(p[0], p[1])); }
    }
    // slab against slab: they jam and grind; a hard knock leaves a crack
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const A = F[i], B = F[j], dx = B.x - A.x, dy = B.y - A.y, m = A.rc + B.rc; if (Math.abs(dx) > m || Math.abs(dy) > m) continue;
      const d = Math.hypot(dx, dy); if (d >= m || d < 1e-4) continue;
      const nx = dx / d, ny = dy / d, ov = (m - d) * 0.5, wa = B.R / (A.R + B.R), wb = 1 - wa;
      A.x -= nx * ov * wa * 2; A.y -= ny * ov * wa * 2; B.x += nx * ov * wb * 2; B.y += ny * ov * wb * 2;
      const rvx = B.vx - A.vx, rvy = B.vy - A.vy, vn = rvx * nx + rvy * ny;
      if (vn < 0) { const j2 = -vn * 0.9; A.vx -= nx * j2 * wa; A.vy -= ny * j2 * wa; B.vx += nx * j2 * wb; B.vy += ny * j2 * wb;
        const vt = -rvx * ny + rvy * nx; A.va += vt * 0.4 / A.R; B.va -= vt * 0.4 / B.R; // grinding turns them
        if (-vn > 0.5) this.crack(-vn > 0.9 ? A : B, Math.min(1, -vn - 0.3)); }
    }
    for (const q of F) for (const c of q.cracks) if (c.len < c.max * 0.4) c.len += dt * 0.05; // a fresh crack creeps on a little
    const C = this.chips; for (let i = C.length - 1; i >= 0; i--) { const c = C[i]; c.age += dt; if (c.age > c.life) { C[i] = C[C.length - 1]; C.pop(); continue; }
      const dk = Math.exp(-dt * 4); c.vx *= dk; c.vy = c.vy * dk + 0.04 * (1 - dk); c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.rv * dt; c.rv *= Math.exp(-dt * 1.5); }
  }
  // lx, ly: where the light comes from (his lamp), in screen space
  draw(ctx, S, Sy, ppm, W, H, lx, ly, atlas) {
    if (!this.f.length && !this.chips.length) return;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const q of this.f) {
      const px = S(q.x), py = Sy(q.y), rr = q.R * ppm * 1.1; if (px < -rr || px > W + rr || py < -rr || py > H + rr) continue;
      const al = q.al * Math.min(1, this.k * 2), ca = Math.cos(q.a), sa = Math.sin(q.a), P = q.pts.map(([x, y]) => [px + (x * ca - y * sa) * ppm, py + (x * sa + y * ca) * ppm]);
      const toL = Math.atan2(ly - py, lx - px), ox = Math.cos(toL) * q.R * 0.07 * ppm, oy = Math.sin(toL) * q.R * 0.07 * ppm;
      // the body: barely there, a little colder at its thick middle
      ctx.globalAlpha = al; ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      { const gx = Math.cos(toL) * q.R * ppm, gy = Math.sin(toL) * q.R * ppm, gr = ctx.createLinearGradient(px + gx, py + gy, px - gx, py - gy); // a sheen across its face from the lit side
        gr.addColorStop(0, `rgba(${150 + q.tint * 20},${180 + q.tint * 14},${194 + q.tint * 10},0.17)`); gr.addColorStop(0.45, 'rgba(110,140,152,0.08)'); gr.addColorStop(1, 'rgba(50,72,82,0.05)'); ctx.fillStyle = gr; ctx.fill(); }
      // its far face, offset away from the light: the slab's thickness
      ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x - ox, y - oy) : ctx.moveTo(x - ox, y - oy))); ctx.closePath();
      ctx.strokeStyle = 'rgba(150,180,192,0.22)'; ctx.lineWidth = Math.max(0.6, 0.006 * ppm); ctx.stroke();
      // each edge lit by how squarely it faces the lamp; the far edges a dark line
      for (let i = 0; i < P.length; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], ex = x1 - x0, ey = y1 - y0, el = Math.hypot(ex, ey) || 1, nx = ey / el, ny = -ex / el;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ll = Math.hypot(lx - mx, ly - my) || 1, f = (nx * (lx - mx) + ny * (ly - my)) / ll;
        if (f > 0 && !q.gap[i]) { // lit: a soft glow just inside the edge, then the edge itself catching the light, heavier where it faces the lamp
          const ix = -nx * 0.012 * ppm, iy = -ny * 0.012 * ppm, w = q.ew[i];
          ctx.strokeStyle = `rgba(200,222,232,${(0.08 * f * w).toFixed(3)})`; ctx.lineWidth = Math.max(1.2, 0.022 * ppm * w); ctx.beginPath(); ctx.moveTo(x0 + ix, y0 + iy); ctx.lineTo(x1 + ix, y1 + iy); ctx.stroke();
          ctx.strokeStyle = `rgba(228,240,246,${((0.1 + 0.62 * f * f) * Math.min(1, w)).toFixed(3)})`; ctx.lineWidth = Math.max(0.6, (0.003 + 0.009 * f) * ppm * w); }
        else { ctx.strokeStyle = `rgba(8,16,20,${f > 0 ? 0.18 : 0.32})`; ctx.lineWidth = Math.max(0.6, 0.005 * ppm); }
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      // cracks: a bright split with its shadow beside it
      for (const c of q.cracks) { if (c.len < 0.01) continue;
        const pts = [[c.x, c.y]]; let x = c.x, y = c.y, a = c.a; const st = 4; for (let k = 1; k <= st; k++) { a += c.w * (k % 2 ? 1 : -1); x += Math.cos(a) * c.len / st; y += Math.sin(a) * c.len / st; pts.push([x, y]); }
        const tr = ([x, y]) => [px + (x * ca - y * sa) * ppm, py + (x * sa + y * ca) * ppm];
        const line = (arr, col, w, dx = 0) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); arr.forEach((p, i) => { const [sx, sy] = tr(p); i ? ctx.lineTo(sx + dx, sy + dx) : ctx.moveTo(sx + dx, sy + dx); }); ctx.stroke(); };
        line(pts, 'rgba(6,12,16,0.4)', Math.max(0.6, 0.005 * ppm), 0.8); line(pts, 'rgba(226,240,246,0.55)', Math.max(0.5, 0.0035 * ppm));
        if (c.br) { const k = Math.max(1, Math.round(st * c.br)), [bx, by] = pts[k], ba = c.a + c.bs * 0.8, bl = c.len * 0.45; line([[bx, by], [bx + Math.cos(ba) * bl * 0.5, by + Math.sin(ba) * bl * 0.5], [bx + Math.cos(ba + c.bs * 0.3) * bl, by + Math.sin(ba + c.bs * 0.3) * bl]], 'rgba(226,240,246,0.4)', Math.max(0.5, 0.003 * ppm)); }
      }
    }
    // chips: the slush's own painted pieces, spinning off and settling
    if (atlas && atlas.ok) for (const c of this.chips) { const px = S(c.x), py = Sy(c.y); if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      const s = Math.max(3, c.sz * ppm * 6), k = c.age / c.life; ctx.save(); ctx.translate(px, py); ctx.rotate(c.rot); ctx.globalAlpha = 0.9 * (1 - k * k) * Math.min(1, c.age * 10);
      ctx.drawImage(atlas, c.sp * 64, (Math.cos(c.rot * 2) > 0.8 ? 1 : 0) * 64, 64, 64, -s / 2, -s / 2, s, s); ctx.restore(); }
    ctx.restore();
  }
  // (7.9.8, owner) beyond his beam: the slabs' edges that face him catch a little of his lamp's spill, faint and falling
  // away with distance, so the pack round him can be felt in the dark. Drawn added on after the light map
  drawSheen(ctx, S, Sy, ppm, W, H, lx, ly, on) {
    if (!on || !this.f.length) return;
    ctx.save(); ctx.lineCap = 'round';
    for (const q of this.f) {
      const px = S(q.x), py = Sy(q.y), rr = q.R * ppm * 1.1; if (px < -rr || px > W + rr || py < -rr || py > H + rr) continue;
      const dist = Math.hypot(px - lx, py - ly) / ppm; if (dist > 14) continue;
      const k = q.al * Math.min(1, this.k * 2) * Math.pow(1 - dist / 14, 1.3) * 0.34; if (k < 0.005) continue;
      const ca = Math.cos(q.a), sa = Math.sin(q.a), P = q.pts.map(([x, y]) => [px + (x * ca - y * sa) * ppm, py + (x * sa + y * ca) * ppm]);
      for (let i = 0; i < P.length; i++) { if (q.gap[i]) continue;
        const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], ex = x1 - x0, ey = y1 - y0, el = Math.hypot(ex, ey) || 1, nx = ey / el, ny = -ex / el;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ll = Math.hypot(lx - mx, ly - my) || 1, f = (nx * (lx - mx) + ny * (ly - my)) / ll; if (f <= 0.2) continue;
        ctx.strokeStyle = `rgba(190,214,226,${(k * f).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, 0.008 * ppm * q.ew[i]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    }
    ctx.restore();
  }
  // (7.9.8, owner) where his lamp falls on the ice floor it glints: short tapered streaks along the surface, each catching
  // the light only at its own angle, so they come and go as he moves. Added on after the light map
  drawFloorGlints(ctx, S, Sy, ppm, W, H, hx, hy, lampA, on, floorAt) {
    if (!on) return; const wx0 = (hx - S(0)) / ppm, wy0 = (hy - Sy(0)) / ppm;
    if (wx0 < AREA2.drop2 || floorAt(wx0) < AREA2.ice - 40 || floorAt(wx0) - wy0 > 12) return;
    ctx.save();
    for (let i = -40; i <= 40; i++) {
      const x = Math.round(wx0 * 3) / 3 + i / 3, fy = floorAt(x), dx = x - wx0, dy = fy - wy0, d = Math.hypot(dx, dy); if (d > 11 || d < 0.5) continue;
      let da = Math.atan2(dy, dx) - lampA; da = Math.atan2(Math.sin(da), Math.cos(da)); const cone = Math.max(0, 1 - Math.abs(da) / 0.75); if (cone <= 0) continue;
      const hsh = Math.sin(Math.round(x * 3) * 127.1) * 43758.5453, rnd = hsh - Math.floor(hsh), face = Math.cos(rnd * 40 + Math.atan2(dy, dx) * 9);
      if (face < 0.55) continue;
      const a = cone * Math.pow(1 - d / 11, 1.2) * Math.pow((face - 0.55) / 0.45, 1.5) * 0.85, px = S(x), py = Sy(fy), L = (0.18 + rnd * 0.3) * ppm;
      ctx.fillStyle = `rgba(226,240,248,${a.toFixed(3)})`; ctx.beginPath(); ctx.moveTo(px - L, py); ctx.quadraticCurveTo(px, py - Math.max(0.8, 0.02 * ppm), px + L, py); ctx.quadraticCurveTo(px, py + Math.max(0.6, 0.012 * ppm), px - L, py); ctx.fill();
    }
    ctx.restore();
  }
  // (7.9.8, owner) the ice floor round him catching his lamp: through the slush the lamp itself barely reaches the floor,
  // so the ice's surface and what is inside it (the same baked tile) are added on round him, strongest a little way along
  // his beam and fading out within about 12 m. Worked at half size
  drawIceLit(ctx, S, Sy, ppm, W, H, hx, hy, lampA, on, floorAt, tile) {
    if (!on || !tile || !tile.ok) return; const wx0 = (hx - S(0)) / ppm, wy0 = (hy - Sy(0)) / ppm, f0 = floorAt(wx0);
    if (wx0 < AREA2.drop2 || f0 < AREA2.ice - 40 || f0 - wy0 > 26) return;
    const w2 = Math.ceil(W / 2), h2 = Math.ceil(H / 2), c = this.litC || (this.litC = document.createElement('canvas')); if (c.width !== w2 || c.height !== h2) { c.width = w2; c.height = h2; this.litP = null; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w2, h2); x.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const R = 12 * ppm, cx = hx + Math.cos(lampA) * 3 * ppm, cy = hy + Math.sin(lampA) * 3 * ppm, xa = Math.max(0, cx - R), xb = Math.min(W, cx + R);
    const pts = []; for (let px = xa - 8; px <= xb + 8; px += 8) pts.push([px, Sy(floorAt((px - S(0)) / ppm))]);
    x.beginPath(); x.moveTo(pts[0][0], H + 2); for (const [px, py] of pts) x.lineTo(px, py); x.lineTo(pts[pts.length - 1][0], H + 2); x.closePath();
    x.save(); x.clip(); const k = 8 * ppm / tile.width, pat = this.litP || (this.litP = x.createPattern(tile, 'repeat-x'));
    pat.setTransform(new DOMMatrix([k, 0, 0, k, S(0) % (tile.width * k), Sy(AREA2.ice - 1.6)])); x.fillStyle = pat; x.fillRect(xa, 0, xb - xa, H); x.restore();
    x.lineJoin = 'round'; x.strokeStyle = 'rgba(214,234,242,0.9)'; x.lineWidth = Math.max(1.5, 0.03 * ppm); x.beginPath(); pts.forEach(([px, py], n) => (n ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    x.strokeStyle = 'rgba(160,196,210,0.35)'; x.lineWidth = Math.max(3, 0.18 * ppm); x.beginPath(); pts.forEach(([px, py], n) => (n ? x.lineTo(px, py + 0.08 * ppm) : x.moveTo(px, py + 0.08 * ppm))); x.stroke();
    x.globalCompositeOperation = 'destination-in'; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.42; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
  }
}
