// Earl (diver) and his submersible: movement, oxygen, pressure, hull.
import { clamp, lerp, angleLerp } from './util.js';
import { collide, BOAT_X, SPAWN } from './world.js';

export const DIVE_SPEED = 4;
export const SUB_SPEED = DIVE_SPEED * 1.2;
export const SUB_VERTICAL = 2.0; // ballast: vertical speed multiplier for the sub
export const DIVER_O2 = 50;
export const SAPPHIRE_O2 = 15;
const K_PRESS = Math.log(30) / 700; // x30 drain at 1000 m, starting at 300 m

export const SUB_LEVELS = [
  { rated: 800, o2: 180 },
  { rated: 1300, o2: 300, cost: { clam: 3, mussel: 2, kelp: 2, iron: 1 } },
  { rated: 1950, o2: 450, cost: { iron: 4, tentacle: 3, ink: 2, rock: 4 } },
  { rated: 2700, o2: 720, cost: { iron: 6, glass: 2, ink: 3, scale: 4, pearl: 1 } },
];

export function diverDrainMult(depth) {
  return depth <= 300 ? 1 : Math.exp(K_PRESS * (depth - 300));
}
// a damaged hull leaks: at 40 % integrity the air drains 2.5x as fast
export function subLeak(sub) { return 1 / Math.max(0.25, sub.hull); }
export function subDrainMult(depth, rated) {
  const r = depth / rated;
  return r <= 0.5 ? 1 : Math.exp(1.386 * (r - 0.5));
}

export class Earl {
  constructor() {
    this.x = SPAWN.x; this.y = SPAWN.y; this.vx = 0; this.vy = 0;
    this.facing = 1; this.angle = 0; this.kick = 0; this.speedNow = 0;
    this.o2Max = DIVER_O2; this.o2 = DIVER_O2;
    this.sprint = false; this.inSub = false; this.lampWanted = true;
    this.maxDepth = 0; this.surfacing = 0; this.idle = 0; this.hr = 68;
    this.bubbleT = 0; this.atSurface = false;
    this.speedMul = 1; this.o2Mul = 1; // set from injury each frame
  }
  // switches on by itself below 200 m, or whenever it is too dark to see (night, the entity's darkness)
  get lampOn() { return this.lampWanted && (this.y > 200 || (this.y > 1 && this.dark)); }
}

export class Sub {
  constructor() {
    this.level = 0; this.x = BOAT_X + 8.5; this.y = 2.6; this.vx = 0; this.vy = 0;
    this.facing = -1; this.o2 = SUB_LEVELS[0].o2; this.stress = 0; this.imploded = false;
    this.tilt = 0; this.lightsOn = true; this.hull = 1; // hull integrity: damage makes the cabin leak air
    this.yaw = Math.PI; // 0 = bow to the right, PI = bow to the left; turns smoothly between
  }
  get rated() { return SUB_LEVELS[this.level].rated; }
  get o2Max() { return SUB_LEVELS[this.level].o2; }
}

// Input: {x,y} move vector -1..1, sprint bool
export function updateEarl(g, dt, inp) {
  const e = g.earl, sub = g.sub, W = g.world;
  e.sprint = inp.sprint;
  const lowO2 = !e.inSub && e.o2 / e.o2Max < 0.1;
  if (e.inSub) {
    // ---- submersible ----
    const sp = SUB_SPEED * (inp.sprint ? 1.5 : 1);
    const tvx = inp.x * sp, tvy = inp.y * sp * SUB_VERTICAL;
    sub.vx = lerp(sub.vx, tvx, 1 - Math.exp(-dt * 0.9));
    sub.vy = lerp(sub.vy, tvy, 1 - Math.exp(-dt * 0.7));
    sub.x += sub.vx * dt; sub.y += sub.vy * dt;
    if (sub.y < 1.6) { sub.y = 1.6; sub.vy = Math.max(0, sub.vy); }
    const c = collide(W, sub.x, sub.y, 2.2);
    if (c.hit) { sub.x = c.x; sub.y = c.y; sub.vx *= 0.6; sub.vy *= 0.4; }
    sub.x = clamp(sub.x, 4, 984);
    if (Math.abs(sub.vx) > 0.3) sub.facing = sub.vx > 0 ? 1 : -1;
    // swing round over ~1.5 s rather than flipping (the projection of the turn eases in and out)
    const yawT = sub.facing > 0 ? 0 : Math.PI, rate = Math.PI / 1.5;
    sub.yaw += clamp(yawT - sub.yaw, -rate * dt, rate * dt);
    sub.tilt = lerp(sub.tilt, clamp(sub.vy * 0.03, -0.18, 0.18), dt * 2);
    e.x = sub.x; e.y = sub.y; e.vx = sub.vx; e.vy = sub.vy;
    e.speedNow = Math.hypot(sub.vx, sub.vy);
    // oxygen
    const surf = sub.y < 2.2;
    if (surf) sub.o2 = Math.min(sub.o2Max, sub.o2 + (sub.o2Max / 4) * dt);
    else sub.o2 -= dt * subDrainMult(sub.y, sub.rated) * (inp.sprint && e.speedNow > 1 ? 2 : 1) * subLeak(sub);
    e.atSurface = surf;
    // hull
    const r = sub.y / sub.rated;
    sub.stress = clamp((r - 0.85) / 0.45, 0, 1);
    if (sub.y > sub.rated * 1.3 && !sub.imploded) return 'implode';
    if (sub.o2 <= 0) { sub.o2 = 0; return 'sub-o2'; }
  } else {
    // ---- diver ----
    let sp = DIVE_SPEED * (inp.sprint ? 1.5 : 1) * (lowO2 ? 1.5 : 1) * e.speedMul;
    const mag = Math.hypot(inp.x, inp.y);
    let ix = inp.x, iy = inp.y;
    if (mag > 1) { ix /= mag; iy /= mag; }
    const tvx = ix * sp, tvy = iy * sp;
    const acc = mag > 0.1 ? 2.6 : 1.4;
    e.vx = lerp(e.vx, tvx, 1 - Math.exp(-dt * acc));
    e.vy = lerp(e.vy, tvy, 1 - Math.exp(-dt * acc));
    // slight negative buoyancy when idle at depth, positive near surface
    if (mag < 0.1) e.vy += (e.y < 8 ? -0.12 : 0.05) * dt;
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.y < 0.35) { e.y = 0.35; if (e.vy < 0) e.vy = 0; }
    const c = collide(W, e.x, e.y, 0.55);
    if (c.hit) { e.x = c.x; e.y = c.y; e.vx *= 0.7; e.vy *= 0.5; }
    e.x = clamp(e.x, 2, 980);
    // never onto the beach
    if (W.floorAt(e.x) < 0.9) { e.x -= 0.6; e.vx = Math.min(0, e.vx); }
    e.speedNow = Math.hypot(e.vx, e.vy);
    // orientation: swim horizontally when moving, upright when idle
    if (Math.abs(e.vx) > 0.25) e.facing = e.vx > 0 ? 1 : -1;
    const moving = e.speedNow > 0.6;
    let target;
    if (moving) target = Math.atan2(e.vy, Math.abs(e.vx) + 0.001) * 0.85;
    else target = e.y < 1 ? -1.25 : -1.15; // upright, a little forward
    e.angle = angleLerp(e.angle, target, 1 - Math.exp(-dt * 3));
    e.kick += dt * (moving ? 3.2 + e.speedNow * 0.9 : 1.1);
    // oxygen
    e.atSurface = e.y < 0.9;
    if (e.atSurface) {
      e.o2 = Math.min(e.o2Max, e.o2 + (e.o2Max / 3.5) * dt);
      e.surfacing = Math.min(1, e.surfacing + dt);
    } else {
      e.surfacing = 0;
      e.o2 -= dt * diverDrainMult(e.y) * (inp.sprint && e.speedNow > 1 ? 2 : 1) * e.o2Mul;
    }
    if (e.o2 <= 0) { e.o2 = 0; return 'o2'; }
  }
  e.maxDepth = Math.max(e.maxDepth, e.y);
  return null;
}
