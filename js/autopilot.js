// The submersible's autopilot: called with C, it drives itself to Earl at its normal speed,
// routing around rock, and stops a few metres away. Hold C to send it back to the dock.
// It never goes below its rated depth: past that it holds and waits.
import { clamp, lerp, dist } from './util.js';
import { collide, BOAT_X } from './world.js';
import { SUB_SPEED, SUB_VERTICAL } from './player.js';

const CELL = 3;            // routing grid, metres
const STOP = 5;            // how far from Earl it stops (the hull is ~9 m long)
const DOCK = { x: BOAT_X + 8.5, y: 2.6 };
const MAX_EXPAND = 60000;  // A* budget per plan

// is a grid cell open water the sub fits through?
function openCell(W, cx, cy, maxY, cache) {
  const key = cx * 4096 + cy;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
  let ok = x > 4 && x < 984 && y <= maxY && W.floorAt(x) - y > 3;
  if (ok) for (const [ox, oy] of [[0, 0], [2.4, 0], [-2.4, 0], [0, 2], [0, -2]]) if (W.rockAt(x + ox, y + oy)) { ok = false; break; }
  cache.set(key, ok);
  return ok;
}

// A* on the coarse grid, inside a window around start and goal
function plan(W, sx, sy, gx, gy, maxY, cache) {
  const c0 = [Math.floor(sx / CELL), Math.max(0, Math.floor(sy / CELL))];
  let c1 = [Math.floor(gx / CELL), Math.max(0, Math.floor(gy / CELL))];
  // goal inside rock: take the nearest open cell to it
  if (!openCell(W, c1[0], c1[1], maxY, cache)) {
    let best = null, bd = 1e9;
    for (let r = 1; r < 12 && !best; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      const cx = c1[0] + dx, cy = c1[1] + dy;
      if (cy < 0 || !openCell(W, cx, cy, maxY, cache)) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [cx, cy]; }
    }
    if (!best) return null;
    c1 = best;
  }
  const pad = 50;
  const xlo = Math.min(c0[0], c1[0]) - pad, xhi = Math.max(c0[0], c1[0]) + pad;
  const ylo = Math.max(0, Math.min(c0[1], c1[1]) - pad), yhi = Math.max(c0[1], c1[1]) + pad;
  const key = (x, y) => x * 4096 + y;
  const g = new Map([[key(...c0), 0]]), from = new Map();
  // a small binary heap of [f, x, y]
  const heap = [[0, c0[0], c0[1]]];
  const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const h = (x, y) => Math.hypot(x - c1[0], y - c1[1]);
  let n = 0;
  while (heap.length && n++ < MAX_EXPAND) {
    const [, x, y] = pop();
    if (x === c1[0] && y === c1[1]) {
      const path = [];
      let k = key(x, y);
      while (k !== undefined) { const cx = Math.floor(k / 4096), cy = k % 4096; path.push({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 }); k = from.get(k); }
      return path.reverse();
    }
    const gc = g.get(key(x, y));
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < xlo || nx > xhi || ny < ylo || ny > yhi) continue;
      if (!openCell(W, nx, ny, maxY, cache)) continue;
      if (dx && dy && (!openCell(W, x + dx, y, maxY, cache) || !openCell(W, x, y + dy, maxY, cache))) continue; // no squeezing past corners
      const ng = gc + (dx && dy ? 1.4142 : 1);
      const k = key(nx, ny);
      if (ng < (g.get(k) ?? 1e9)) { g.set(k, ng); from.set(k, key(x, y)); push([ng + h(nx, ny), nx, ny]); }
    }
  }
  return null;
}

// can it go straight from a to b?
function clearLine(W, ax, ay, bx, by, maxY) {
  const n = Math.ceil(dist(ax, ay, bx, by) / 1.5);
  for (let i = 1; i <= n; i++) {
    const x = lerp(ax, bx, i / n), y = lerp(ay, by, i / n);
    if (y > maxY + 1 || W.floorAt(x) - y < 2.6 || W.rockAt(x, y, 0) || W.rockAt(x + 2.2, y) || W.rockAt(x - 2.2, y)) return false;
  }
  return true;
}
// drop waypoints it can see past
function smooth(W, path, sx, sy, maxY) {
  const out = [];
  let ax = sx, ay = sy, i = 0;
  while (i < path.length) {
    let j = path.length - 1;
    while (j > i && !clearLine(W, ax, ay, path[j].x, path[j].y, maxY)) j--;
    out.push(path[j]); ax = path[j].x; ay = path[j].y; i = j + 1;
  }
  return out;
}

export class Autopilot {
  constructor() { this.state = 'idle'; this.path = null; this.cache = new Map(); this.replanT = 0; this.stuckT = 0; this.msg = null; }
  get active() { return this.state === 'coming' || this.state === 'home'; }

  call(g) { this.state = 'coming'; this.path = null; this.replanT = 0; this.holding = false; g.sub.docked = false; }
  sendHome(g) { this.state = 'home'; this.path = null; this.replanT = 0; this.holding = false; g.sub.docked = false; }
  cancel() { this.state = 'idle'; this.path = null; }

  // where it is heading right now
  goal(g) {
    const e = g.earl, sub = g.sub;
    const maxY = sub.rated - 4;
    if (this.state === 'home') return { x: DOCK.x, y: DOCK.y, maxY, home: true };
    // stop beside him, on the side it is coming from
    let dx = sub.x - e.x, dy = sub.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let gx = e.x + (dx / d) * STOP, gy = Math.max(1.8, e.y + (dy / d) * STOP * 0.5);
    this.holding = gy > maxY;
    if (this.holding) gy = maxY;
    return { x: gx, y: gy, maxY };
  }

  update(g, dt, speedMul = 1) {
    if (this.state === 'waiting') {
      // parked beside him: settle, and swing round to face him
      const sub = g.sub;
      sub.vx *= Math.exp(-dt * 1.5); sub.vy *= Math.exp(-dt * 1.5);
      sub.x += sub.vx * dt; sub.y += sub.vy * dt;
      if (Math.abs(g.earl.x - sub.x) > 1) sub.facing = g.earl.x > sub.x ? 1 : -1;
      const yawT = sub.facing > 0 ? 0 : Math.PI, rate = Math.PI / 1.5;
      sub.yaw += clamp(yawT - sub.yaw, -rate * dt, rate * dt);
      sub.tilt = lerp(sub.tilt, 0, dt * 2);
      return null;
    }
    if (!this.active) return;
    const W = g.world, sub = g.sub, e = g.earl;
    const G = this.goal(g);
    // plan (and re-plan when he moves or it gets stuck)
    this.replanT -= dt;
    if (!this.path || this.replanT <= 0 && (!this.goalAt || dist(G.x, G.y, this.goalAt.x, this.goalAt.y) > 6)) {
      this.replanT = 2.5;
      this.goalAt = { x: G.x, y: G.y };
      if (clearLine(W, sub.x, sub.y, G.x, G.y, G.maxY)) this.path = [{ x: G.x, y: G.y }];
      else {
        const p = plan(W, sub.x, sub.y, G.x, G.y, G.maxY, this.cache);
        this.path = p ? smooth(W, p, sub.x, sub.y, G.maxY) : [{ x: G.x, y: G.y }];
      }
      // the last point is always the live goal
      this.path[this.path.length - 1] = { x: G.x, y: G.y };
    }
    this.path[this.path.length - 1] = { x: G.x, y: G.y };
    let wp = this.path[0];
    if (this.path.length > 1 && dist(sub.x, sub.y, wp.x, wp.y) < 3) { this.path.shift(); wp = this.path[0]; }
    const toGoal = dist(sub.x, sub.y, G.x, G.y);
    this.remaining = toGoal;
    // steer like a pilot would: same speed, same ballast boost on straight dives and ascents
    const sp = SUB_SPEED * speedMul * (sub.speedMul || 1);
    let dx = wp.x - sub.x, dy = wp.y - sub.y;
    const dl = Math.hypot(dx, dy) || 1;
    let nx = dx / dl, ny = dy / dl;
    const vBoost = 1 + (SUB_VERTICAL - 1) * clamp((Math.abs(ny) - Math.abs(nx)) / (Math.abs(ny) + 1e-6), 0, 1);
    const slow = this.path.length === 1 ? clamp(toGoal / 6, 0.15, 1) : 1; // ease in at the end
    const arrived = toGoal < 1.2;
    const tvx = arrived ? 0 : nx * sp * slow, tvy = arrived ? 0 : ny * sp * vBoost * slow;
    sub.vx = lerp(sub.vx, tvx, 1 - Math.exp(-dt * 0.9));
    sub.vy = lerp(sub.vy, tvy, 1 - Math.exp(-dt * 0.7));
    sub.x += sub.vx * dt; sub.y += sub.vy * dt;
    if (sub.y < 1.6) { sub.y = 1.6; sub.vy = Math.max(0, sub.vy); }
    const c = collide(W, sub.x, sub.y, 2.2);
    if (c.hit) { sub.x = c.x; sub.y = c.y; sub.vx *= 0.6; sub.vy *= 0.4; }
    sub.x = clamp(sub.x, 4, 984);
    if (Math.abs(sub.vx) > 0.3) sub.facing = sub.vx > 0 ? 1 : -1;
    const yawT = sub.facing > 0 ? 0 : Math.PI, rate = Math.PI / 1.5;
    sub.yaw += clamp(yawT - sub.yaw, -rate * dt, rate * dt);
    sub.tilt = lerp(sub.tilt, clamp(sub.vy * 0.03, -0.18, 0.18), dt * 2);
    sub.stress = clamp((sub.y / sub.rated - 0.85) / 0.45, 0, 1);
    this.speed = Math.hypot(sub.vx, sub.vy);
    this.eta = toGoal / Math.max(0.5, sp * 0.8);
    // stuck against something: plan again
    if (this.speed < 0.3 && !arrived) { this.stuckT += dt; if (this.stuckT > 2) { this.stuckT = 0; this.path = null; } } else this.stuckT = 0;
    if (arrived && this.speed < 0.4) {
      if (G.home) { sub.x = DOCK.x; sub.y = DOCK.y; sub.vx = sub.vy = 0; sub.docked = true; this.state = 'idle'; return 'docked'; }
      if (!this.holding) { this.state = 'waiting'; this.heldMsg = false; return 'arrived'; }
      // at its rated depth: it hovers there and keeps following him sideways
      if (!this.heldMsg) { this.heldMsg = true; return 'holding'; }
    } else if (!this.holding) this.heldMsg = false;
    return null;
  }
}
