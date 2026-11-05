// The submersible's manipulator arm. From inside the sub, Space reaches for an animal (up to a
// metre long, within 4 m of the claw); then a marker sweeps a gauge and Space again closes the
// claw. In the green: a clean grip. In the amber: it holds, but too hard. Outside: it slips away.
import { clamp, dist } from './util.js';
import { canTakeLive, liveValue } from './specimens.js';
import { variantMult, variantName } from './variants.js';
import { tankSlots } from './capture.js';

export const ARM_REACH = 4, ARM_MAXLEN = 1.0;
const REACH_T = 0.7, RETRACT_T = 0.8, GRIP_TIMEOUT = 4;
export const GREEN = [0.42, 0.58], AMBER = [0.3, 0.7];

// where the claw's shoulder is (world): under the sphere, toward the bow
export function armBase(g) {
  const sub = g.sub;
  return { x: sub.x + sub.facing * 1.26, y: sub.y + 1.53 };
}
export function findArmTarget(g) {
  const b = armBase(g), sub = g.sub;
  let best = null, bd = 1e9;
  const test = (sp, x, y, len, ref) => {
    if (!canTakeLive(sp) || len > ARM_MAXLEN) return;
    if ((x - b.x) * sub.facing < -1) return;
    const d = dist(b.x, b.y, x, y) - len * 0.3;
    if (d < ARM_REACH && d < bd) { bd = d; best = { sp, x, y, len, ...ref }; }
  };
  for (const c of g.fauna.list) if (!c.dead && !(c.att && c.att.s !== 'idle')) test(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
  for (const s of g.world.statics) if (Math.abs(s.x - b.x) < ARM_REACH + 3) test(s.sp, s.x, s.y - s.sp.len * s.scale * 0.3, s.sp.len * s.scale, { s, variant: s.variant });
  if (best) { best.value = liveValue(best.sp, best.len) * variantMult(best.variant); best.name = variantName(best.sp, best.variant); }
  return best;
}

export function startArm(g) {
  if (g.subTank.length >= tankSlots(g)) return 'The specimen tank is full';
  const tgt = findArmTarget(g);
  if (!tgt) return 'Nothing in reach of the arm';
  g.armGame = { phase: 'reach', t: 0, tgt, marker: 0, dir: 1, speed: 1.1 + Math.random() * 0.5 };
  return null;
}
// returns an event when something happens
export function updateArm(g, dt, pressSpace) {
  const A = g.armGame;
  if (!A) return null;
  A.t += dt;
  const c = A.tgt.c;
  // the animal is held in the lights while the claw comes for it: it barely moves
  if (c && A.phase !== 'retract') { c.vx *= Math.exp(-dt * 4); c.vy *= Math.exp(-dt * 4); A.tgt.x = c.x; A.tgt.y = c.y; }
  if (A.phase === 'reach') { if (A.t >= REACH_T) { A.phase = 'grip'; A.t = 0; } }
  else if (A.phase === 'grip') {
    A.marker += A.dir * A.speed * dt;
    if (A.marker > 1) { A.marker = 2 - A.marker; A.dir = -1; }
    if (A.marker < 0) { A.marker = -A.marker; A.dir = 1; }
    if (pressSpace || A.t > GRIP_TIMEOUT) {
      const m = A.marker;
      const res = pressSpace && m >= GREEN[0] && m <= GREEN[1] ? 'clean' : pressSpace && m >= AMBER[0] && m <= AMBER[1] ? 'crushed' : 'slipped';
      A.result = res;
      if (res === 'slipped') { if (c) c.fleeT = 2.5; A.phase = 'retract'; A.t = 0; A.empty = true; return { type: 'armMiss', name: A.tgt.name }; }
      // it has it: off the bottom or out of the water column, into the claw
      if (c) c.dead = true;
      if (A.tgt.s) g.world.statics.splice(g.world.statics.indexOf(A.tgt.s), 1);
      A.phase = 'retract'; A.t = 0;
    }
  } else if (A.phase === 'retract' && A.t >= RETRACT_T) {
    g.armGame = null;
    if (A.empty) return null;
    const tg = A.tgt;
    const spec = { id: tg.sp.id, len: tg.len, cond: A.result === 'clean' ? 0.95 : 0.35, from: Math.round(g.sub.y), t: g.time };
    if (tg.variant) { spec.variant = tg.variant; spec.mult = variantMult(tg.variant); }
    g.subTank.push(spec);
    return { type: 'armCatch', spec, sp: tg.sp, name: tg.name, crushed: A.result === 'crushed' };
  }
  return null;
}
// how far out the claw is (0..1) and whether it is closed, for the drawing
export function armPose(g) {
  const A = g.armGame;
  if (!A) return null;
  let ext = 1;
  if (A.phase === 'reach') ext = clamp(A.t / REACH_T, 0, 1);
  if (A.phase === 'retract') ext = 1 - clamp(A.t / RETRACT_T, 0, 1);
  const closed = A.phase === 'retract' && !A.empty;
  return { ext, closed, tx: A.tgt.x, ty: A.tgt.y, sp: closed ? A.tgt.sp : null, len: A.tgt.len, variant: A.tgt.variant };
}
