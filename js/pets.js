// (5.0) A companion. It goes down with Earl and keeps at his shoulder: it can't be netted, pressure means nothing to it,
// and it is never lost. Every pet hunts: where there is a school about, now and then it darts in and takes a fish under
// 40 cm. Before something bad arrives it is the first to know: it tucks in close behind him and twitches. G tells it to
// stay (it circles where it was left) or to follow again.
// (7.4.14, owner) pets come only from pearls (petshop.js): never from the catch. Its size is its real one grown by its
// level (a fifth again a level, as chosen); a legendary pet glows softly, a mythical one (the giants) with embers too.
import { clamp, dist } from './util.js';
import { SPECIES_BY_ID } from './species.js';
import { PET_BY_ID, petScale } from './petshop.js';

export const PREY_MAX = 0.4;

// keep the pet in the water with him: made when he is in it, steered every frame
export function updatePet(g, dt, dread) {
  const P = g.profile, pet = P && P.pet, e = g.earl, F = g.fauna;
  let c = g.petC && F.list.includes(g.petC) && !g.petC.dead ? g.petC : null;
  const inWater = g.mode === 'play' && !g.aboard;
  if (!pet || !inWater) { if (c) { F.list.splice(F.list.indexOf(c), 1); } g.petC = null; return; }
  const sp = SPECIES_BY_ID[pet.id];
  if (!c) {
    const host = e.inSub ? g.sub : e;
    c = F.makeFish(sp, host.x - (e.facing || 1) * 2, Math.max(1, host.y + 0.5), e.facing || 1, 'pet', true);
    const tier = (PET_BY_ID.get(sp.id) || {}).tier || 'exotic';
    Object.assign(c, { companion: true, flee: 0, placed: true, devKeep: true, len: sp.len * petScale(P, sp.id), petLeg: tier === 'legendary' || tier === 'mythical', petMyth: tier === 'mythical', variant: pet.variant || undefined, huntCool: 6 });
    F.list.push(c); g.petC = c;
  }
  const host = e.inSub ? g.sub : e, W = g.world, t = g.time;
  const nervous = dread > 0.08 || !!g.threat;
  c.nervous = nervous;
  // where it wants to be
  let tx, ty, sp2 = Math.max(2.2, Math.hypot(host.vx || 0, host.vy || 0) * 1.35 + 1.2);
  if (P.petStay && g.petStayAt && !nervous) {
    const S = g.petStayAt, a = t * 0.35 + c.wob;
    tx = S.x + Math.cos(a) * 1.6; ty = S.y + Math.sin(a * 1.3) * 0.6; sp2 = c.cruise * 0.8;
  } else {
    const back = e.inSub ? 3.2 + c.len : nervous ? 0.6 + c.len * 0.4 : 1.2 + c.len * 0.7;
    tx = host.x - (e.facing || 1) * back + Math.sin(t * 0.5 + c.wob) * (nervous ? 0.15 : 0.6);
    ty = host.y + (e.inSub ? 1.2 : 0.35) + Math.sin(t * 0.7 + c.wob * 2) * (nervous ? 0.1 : 0.35);
  }
  // the hunt: a fish from a school close by, now and then
  c.huntCool -= dt;
  if (!c.prey && c.huntCool <= 0 && !nervous) {
    let best = null, bd = 9;
    for (const p of F.list) {
      if (p.dead || p === c || p.companion || !F.schools.has(p.gid) || p.len > PREY_MAX || p.len > c.len * 0.7) continue;
      const d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = p; }
    }
    if (best) c.prey = best; else c.huntCool = 2;
  }
  if (c.prey) {
    const p = c.prey;
    if (p.dead || !F.list.includes(p) || dist(c.x, c.y, host.x, host.y) > 16) { c.prey = null; c.huntCool = 4; }
    else {
      tx = p.x; ty = p.y; sp2 = clamp(c.len * 3, 3.5, 8);
      const ps = F.schools.get(p.gid); if (ps) ps.threat = Math.min(1.5, ps.threat + dt * 2);
      if (dist(c.x, c.y, p.x, p.y) < Math.max(0.3, c.len * 0.3)) {
        p.dead = true; c.prey = null; c.huntCool = 8 + Math.random() * 12;
        F.puffs.push({ x: p.x, y: p.y, t: 0, n: 5 + Math.floor(Math.random() * 4), seed: Math.random() * 100 });
      }
    }
  }
  // far behind (he sank fast, rode the sub off): it catches up out of sight
  if (!(P.petStay && g.petStayAt) && dist(c.x, c.y, host.x, host.y) > 40) { c.x = host.x - (e.facing || 1) * 6; c.y = Math.max(1, host.y); c.vx = 0; c.vy = 0; }
  const ax = (tx - c.x) * 2.2 - c.vx * 1.2, ay = (ty - c.y) * 2.2 - c.vy * 1.2;
  c.vx += ax * dt; c.vy += ay * dt;
  const v = Math.hypot(c.vx, c.vy); if (v > sp2) { c.vx *= sp2 / v; c.vy *= sp2 / v; }
  c.x += c.vx * dt; c.y += c.vy * dt;
  const fl = W.floorAt(c.x); if (c.y > fl - 0.4 - c.len * 0.2) { c.y = fl - 0.4 - c.len * 0.2; c.vy = Math.min(0, c.vy); }
  if (c.y < 0.5) { c.y = 0.5; c.vy = Math.max(0, c.vy); }
  if (Math.abs(c.vx) > 0.1) { const nd = c.vx > 0 ? 1 : -1; if (nd !== c.dir) c.turnAt = t; c.dir = nd; }
  c.phase += dt * (0.6 + Math.min(4, v * 1.4)) * (nervous ? 1.8 : 1);
  c.startle = nervous && Math.random() < dt * 1.5 ? 0.32 : Math.max(0, (c.startle || 0) - dt);
}

// G: stay here / follow me
export function toggleStay(g) {
  const P = g.profile; if (!P.pet || !g.petC) return null;
  P.petStay = !P.petStay;
  g.petStayAt = P.petStay ? { x: g.petC.x, y: g.petC.y } : null;
  return P.petStay ? 'stay' : 'follow';
}
