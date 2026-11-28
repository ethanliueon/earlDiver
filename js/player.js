// Earl (diver) and his submersible: movement, oxygen, pressure, hull.
import { clamp, lerp, angleLerp } from './util.js';
import { X0 as SEA_X0 } from './mapx.js';
import { collide, BOAT, SPAWN, WORLD_W, waterRes } from './world.js';
import { SUB_TIERS } from './economy.js';

export const DIVE_SPEED = 1.68; // Earl's base swimming speed (m/s)
export const SUB_SPEED = 3.36;  // the submersible's
// ballast: diving is no faster than cruising; blowing ballast to rise is a little faster
export const SUB_DIVE = 1.0, SUB_RISE = 1.2;
export const ballastBoost = (nx, ny) => 1 + ((ny < 0 ? SUB_RISE : SUB_DIVE) - 1) * clamp((Math.abs(ny) - Math.abs(nx)) / (Math.abs(ny) + 1e-6), 0, 1);
export const DIVER_O2 = 50;
const K_PRESS = Math.log(80) / 700; // x80 drain at 1000 m, starting at 300 m

export const SUB_LEVELS = SUB_TIERS;

// start: the depth at which his suit stops protecting him from the pressure (300 m in a wetsuit)
export function diverDrainMult(depth, start = 300) {
  // (6.3.0) the same for every suit, by metres past its own depth: x1.9 at 100 m past, x3.5 at 200, x23 at 500; then it
  // climbs more slowly, about x80 at 1,000 m past, and keeps climbing (some x1,000 at 2,000 m past: crushed at once)
  if (depth <= start) return 1;
  const d = depth - start; if (d <= 500) return Math.exp(K_PRESS * d);
  const m5 = Math.exp(K_PRESS * 500); return Math.min(1e6, m5 * Math.pow(80 / m5, (d - 500) / 500)); // (7.8.0) capped: no number overflows at 60 km
}
// a damaged hull leaks: at 40 % integrity the air drains 2.5x as fast
// (4.5.0) a damaged hull leaks air (hidden from the player): +3 % air use for every 1 % of hull lost; at 0 % four times
export function subLeak(sub) { return 1 + 3 * (1 - Math.max(0, Math.min(1, sub.hull))); }
export function subDrainMult(depth, rated) {
  // (4.5.0) anywhere within her rating the air lasts as it should; past it, the cabin works harder
  const r = depth / rated;
  return r <= 1 ? 1 : 1 + (r - 1) * 2;
}

export class Earl {
  constructor() {
    this.x = SPAWN.x; this.y = SPAWN.y; this.vx = 0; this.vy = 0;
    this.facing = 1; this.angle = 0; this.kick = 0; this.speedNow = 0;
    this.o2Max = DIVER_O2; this.o2 = DIVER_O2;
    this.sprint = false; this.inSub = false; this.lampWanted = true; this.lampAuto = true; this.finSpeed = 1;
    this.maxDepth = 0; this.surfacing = 0; this.idle = 0; this.hr = 68;
    this.bubbleT = 0; this.atSurface = false;
    this.speedMul = 1; this.o2Mul = 1; // set from injury each frame
  }
  // (7.4.19) the depth his suit takes: its rating, times Dauntless's multiple while it runs (pressMul)
  get pressStart() { return (this.pressBase || 300) * (this.pressMul || 1); }
  set pressStart(v) { this.pressBase = v; }
  // switches on by itself below 200 m, or whenever it is too dark to see (night, the entity's darkness)
  // the headlamp: on its own it comes on in the dark (below 200 m, or at night); L switches it
  // either way at any depth, and going down past 200 m hands it back to automatic (on)
  get lampOn() {
    if (this.y <= 1) return false;
    return this.lampAuto ? (this.y > 200 || this.dark) : this.lampWanted;
  }
}

export class Sub {
  constructor() {
    this.level = 0; this.x = BOAT.x + 8.5; this.y = 2.6; this.vx = 0; this.vy = 0;
    this.facing = -1; this.o2 = SUB_LEVELS[0].o2; this.stress = 0; this.imploded = false;
    this.tilt = 0; this.lightsOn = true; this.hull = 1; // hull integrity: damage makes the cabin leak air
    this.yaw = Math.PI; // 0 = bow to the right, PI = bow to the left; turns smoothly between
  }
  // set from the upgrades (see applySub in main.js)
  get rated() { return (this.ratedV || 300) * (this.pressMul || 1); } // (7.4.19) Dauntless rates her deeper while it runs
  get o2Max() { return this.o2V || 120; }
}

// Input: {x,y} move vector -1..1, sprint bool
export function updateEarl(g, dt, inp) {
  const e = g.earl, sub = g.sub, W = g.world;
  e.sprint = inp.sprint;
  const lowO2 = !e.inSub && e.o2 / e.o2Max < 0.1;
  if (e.inSub) {
    // ---- submersible ----
    // (on the way home under autopilot the autopilot moves the sub; nothing here steers it)
    if (!g.homeRun) {
    const sp = SUB_SPEED * (sub.speedMul || 1) * Math.max(inp.sprint ? 1.5 : 1, e.abilSpeed || 1); // (5.9.0) the Sprint ability drives her too. (7.6.0, owner) the strongest boost wins, on her own speed, never multiplied together
    // diagonal input is normalised, so going right and down at once is no faster than one way
    const im = Math.hypot(inp.x, inp.y), nx = im > 1 ? inp.x / im : inp.x, ny = im > 1 ? inp.y / im : inp.y;
    // the ballast boost only applies to (mostly) straight dives and ascents, never to diagonals
    const vBoost = ballastBoost(nx, ny) * (1 + (sub.ballast || 0) * Math.min(1, Math.abs(ny)));
    const tvx = nx * sp, tvy = ny * sp * vBoost;
    sub.vx = lerp(sub.vx, tvx, 1 - Math.exp(-dt * 0.9));
    sub.vy = lerp(sub.vy, tvy, 1 - Math.exp(-dt * 0.7));
    // (7.6.5, owner) Plunge: the anchor drags her down, faster than any sprint; the stick held up holds her against it
    if (e.abilSink > 0) { const up = ny < -0.3, want = up ? 0 : SUB_SPEED * (sub.speedMul || 1) * e.abilSink * (ny > 0.3 ? 1.2 : 1); sub.vy = lerp(sub.vy, want, 1 - Math.exp(-dt * 2.4)); e.sinkHold = up; } else e.sinkHold = false;
    sub.x += sub.vx * dt; sub.y += sub.vy * dt;
    if (sub.y < 1.6) { sub.y = 1.6; sub.vy = Math.max(0, sub.vy); }
    const c = collide(W, sub.x, sub.y, 2.2);
    if (c.hit) { sub.x = c.x; sub.y = c.y; sub.vx *= 0.6; sub.vy *= 0.4; }
    sub.x = clamp(sub.x, SEA_X0 + 4, 4994); /* (7.8.0) never past the island */
    if (Math.abs(sub.vx) > 0.3) sub.facing = sub.vx > 0 ? 1 : -1;
    // swing round over ~1.5 s rather than flipping (the projection of the turn eases in and out)
    const yawT = sub.facing > 0 ? 0 : Math.PI, rate = Math.PI / 1.5;
    sub.yaw += clamp(yawT - sub.yaw, -rate * dt, rate * dt);
    sub.tilt = lerp(sub.tilt, clamp(sub.vy * 0.03, -0.18, 0.18), dt * 2);
    }
    e.x = sub.x; e.y = sub.y; e.vx = sub.vx; e.vy = sub.vy;
    e.speedNow = Math.hypot(sub.vx, sub.vy);
    // oxygen
    const surf = sub.y < 2.2 || sub.docked; // (claude-polish) docked in the cradle (at 2.6 m) the hatch is open to the air: it refilled nowhere, and drained
    if (surf) sub.o2 = Math.min(sub.o2Max, sub.o2 + (sub.o2Max / 4) * dt);
    else if (sub.o2 > 0 && !g.frozen) sub.o2 -= dt * (1 + (subDrainMult(sub.y, sub.rated) - 1) / (sub.pressMul || 1)) / (sub.pressBeyond && sub.y > sub.rated ? sub.pressBeyond : 1) * (inp.sprint && e.speedNow > 1 ? 3 : 1) * subLeak(sub) * (g.homeRun ? 0.6 : 1) * (g.airMul || 1) * (g.mythT > 0 ? 0 : 1); // a steady autopilot is thriftier; (7.4.15) none used in a mythical's 10 s
    e.atSurface = surf;
    // hull
    const r = sub.y / sub.rated;
    sub.stress = clamp((r - 1) / Math.max(0.2, (sub.crushR || 1.62) - 1), 0, 1); // 0 at its rating .. 1 at its crush depth
    if (sub.o2 <= 0) {
      // the cabin is empty: he stays at the controls on his own tank. The cabin is still at surface
      // pressure, so depth doesn't make his air go faster (only injury does)
      sub.o2 = 0;
      if (!surf) e.o2 -= dt * e.o2Mul * (g.airMul || 1) * (e.abilNoAir ? 0 : 1);
      if (e.o2 <= 0) { e.o2 = 0; return 'o2'; }
      return 'cabin-empty';
    }
  } else {
    // ---- diver ----
    // (7.9.0, owner) the water pushes back: denser with depth, slush and mush near the second sea's floor. Boosts lose
    // their extra in the slush first (a sprint can't be run through mush), and rising out is a quarter easier than sinking in
    const WR = waterRes(e.x, e.y), upK = (inp.y || 0) < -0.2 ? 1.25 : 1, sl = 1 + (WR.slush - 1) / upK; e.resK = Math.sqrt(WR.dens) * sl; e.slush = WR.slush;
    const boost = Math.max(inp.sprint ? 1.5 : 1, lowO2 ? 1.5 : 1, e.abilSpeed || 1), boostEff = 1 + (boost - 1) / sl;
    let sp = DIVE_SPEED * e.speedMul * e.finSpeed * boostEff / e.resK; // (5.9.0). (7.6.0, owner) his own speed (fins, suit, the bag's weight) times the strongest boost running, never the boosts multiplied
    // (5.0) the camera's shutter is open: he holds still (he can still aim)
    const hold = !!g.photo;
    const mag = hold ? 0 : Math.hypot(inp.x, inp.y);
    let ix = hold ? 0 : inp.x, iy = hold ? 0 : inp.y;
    if (mag > 1) { ix /= mag; iy /= mag; }
    const tvx = ix * sp, tvy = iy * sp;
    const acc = (hold ? 5 : mag > 0.1 ? (inp.stick ? 3.8 : 2.6) : 1.4) * (1 - (e.struggle || 0) * 0.5) / Math.sqrt(sl); // (7.9.0) slower to answer in slush // heavy, sluggish response (5.3.4: a little quicker on the stick, which has no keys' snap)
    e.vx = lerp(e.vx, tvx, 1 - Math.exp(-dt * acc));
    e.vy = lerp(e.vy, tvy, 1 - Math.exp(-dt * acc));
    // (7.6.5, owner) Plunge: the anchor drags him down at his own speed times its pull (faster than any sprint); the stick
    // held up holds him where he is against it, pushed a little further down it goes faster
    if (e.abilSink > 0 && !hold) { const up = iy < -0.3, want = up ? 0 : DIVE_SPEED * e.speedMul * e.finSpeed * e.abilSink * (iy > 0.3 ? 1.2 : 1) / e.resK; e.vy = lerp(e.vy, want, 1 - Math.exp(-dt * 3)); e.sinkHold = up; } else e.sinkHold = false;
    // slight negative buoyancy when idle at depth, positive near surface
    if (mag < 0.1) e.vy += (e.y < 8 ? -0.12 : 0.05) * dt;
    // losing his bearings: a slow sideways pull and a sag, applied to his drift, not his steering
    if (e.struggle) { e.vx += Math.sin(g.time * 0.6) * 0.9 * e.struggle * dt; e.vy += (0.35 + Math.sin(g.time * 0.9) * 0.3) * e.struggle * dt; }
    // (5.0) a fish fighting the net pulls him along a little, harder the bigger it is
    if (g.tug) { const T = g.tug, k = T.t / T.dur, f = T.str * (1 - k) * (0.55 + 0.45 * Math.sin(g.time * 23)); e.vx += T.dir * f * dt * 3.2; e.vy += Math.sin(g.time * 17) * f * dt * 1.6; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.y < 0.35) { e.y = 0.35; if (e.vy < 0) e.vy = 0; }
    const c = collide(W, e.x, e.y, 0.28);
    if (c.hit) { e.x = c.x; e.y = c.y; e.vx *= 0.7; e.vy *= 0.5; }
    e.x = clamp(e.x, SEA_X0 + 2, WORLD_W - 4);
    // never onto the beach
    if (W.floorAt(e.x) < 0.9) { e.x -= 0.6; e.vx = Math.min(0, e.vx); }
    e.speedNow = Math.hypot(e.vx, e.vy);
    // orientation: swim horizontally when moving, upright when idle
    // he turns only when the player steers left or right
    if (Math.abs(inp.x) > 0.15) e.facing = inp.x > 0 ? 1 : -1; // (2.6.8) a real push left or right: the mouse straight above or below him gives only a flicker of x, which used to flip him back and forth many times a second
    else if (Math.abs(e.vx) > 1.2) e.facing = e.vx > 0 ? 1 : -1; // pushed hard (e.g. knocked) - rare
    const moving = e.speedNow > 0.6;
    let target;
    if (moving) target = Math.atan2(e.vy, Math.abs(e.vx) + 0.001) * 0.85;
    else target = e.y < 1 ? -1.25 : -1.15; // upright, a little forward
    const st = e.struggle || 0;
    if (st > 0) target += Math.sin(g.time * 1.3) * 0.22 * st + Math.sin(g.time * 3.1) * 0.06 * st; // body rolls and lurches
    e.angle = angleLerp(e.angle, target, 1 - Math.exp(-dt * 3));
    // weak, uneven kicks when struggling: bursts of frantic fluttering, then near-stalls
    const kickRate = st > 0 ? 0.55 + 1.1 * Math.pow(Math.abs(Math.sin(g.time * 2.3)), 2) : 1;
    // the kick: 1.5x the old pace. Sprinting scales it by the sprint's own factor. Faster fins and speed
    // upgrades quicken it too, but never past 1.5x the base kick (before the sprint)
    const sprintK = inp.sprint ? 1.5 : 1; // (7.6.49) running on deck only: no sprint figure any more
    const baseKick = (3.2 + DIVE_SPEED * 0.9) * 2.25;                  // plain swimming, no upgrades, no sprint
    const nowKick = (3.2 + (e.speedNow / sprintK) * 0.9) * 2.25;      // from his actual speed, sprint taken out
    const kickNow = Math.min(nowKick, baseKick * 1.5) * sprintK;
    e.kick += dt * (moving ? kickNow : 1.65) * kickRate / Math.pow(e.resK || 1, 0.6); // (7.9.0) the fins labour in thick water: slower, never frozen
    // oxygen
    e.atSurface = e.y < 0.9;
    if (e.atSurface) {
      e.o2 = Math.min(e.o2Max, e.o2 + (e.o2Max / 3.5) * dt);
      e.surfacing = Math.min(1, e.surfacing + dt);
    } else {
      e.surfacing = 0;
      e.o2 -= dt * (1 + (diverDrainMult(e.y, e.pressStart || 300) - 1) * (e.pressRes ?? 1) / (e.pressMul || 1)) / (e.pressBeyond && e.y > e.pressStart ? e.pressBeyond : 1) * (inp.sprint && e.speedNow > 1 ? (e.sprintAir ?? 2) : 1) * e.o2Mul * (g.airMul || 1) * (e.abilNoAir ? 0 : 1); // (5.9.0) Riptide: no air used // (2.8.0: Resilience, the Harbour Patrol set)
    }
    if (e.o2 <= 0) { e.o2 = 0; return 'o2'; }
  }
  e.maxDepth = Math.max(e.maxDepth, e.y);
  return null;
}
