// Animals that attack Earl (or the submersible). Every attack is telegraphed:
//  - sharks circle, close in, bump, then bite
//  - billfish line up level with Earl, hold still, then charge in a straight line (dodge it)
//  - sperm whales click in the dark before they lunge
//  - orcas ram the submersible, never Earl
//  - morays, nesting triggerfish, blue/reef sharks and Humboldt squid only when provoked
// Defences: hiding (the animal loses interest), a sea lantern or the necklace, a pod of dolphins
// nearby (sharks leave), or flashing the lamp (L) at a charging animal at the last moment.
import { clamp, dist, lerp } from './util.js';
import { LANTERN_RADIUS } from './entity.js';

export const AGGRO = {
  42: { kind: 'charge', dmg: 1, p: 0.05 },   // swordfish
  43: { kind: 'charge', dmg: 1, p: 0.04 },   // sailfish
  44: { kind: 'charge', dmg: 1, p: 0.05 },   // blue marlin
  76: { kind: 'shark', dmg: 3, p: 0.06 },    // great white
  78: { kind: 'shark', dmg: 3, p: 0.06 },    // tiger shark
  82: { kind: 'shark', dmg: 3, p: 0.05 },    // shortfin mako
  83: { kind: 'nip', dmg: 1, p: 0.03, provoked: true },  // blue shark
  80: { kind: 'nip', dmg: 1, p: 0.03, provoked: true },  // blacktip reef shark
  148: { kind: 'nip', dmg: 1, p: 0.05, night: true },    // Humboldt squid, at night
  23: { kind: 'lurk', dmg: 1, range: 1.8 },  // green moray
  24: { kind: 'lurk', dmg: 1, range: 1.8 },  // giant moray
  21: { kind: 'lurk', dmg: 1, range: 3.2 },  // titan triggerfish guarding its nest
  184: { kind: 'whale', dmg: 5, hull: 0.4, p: 0.05, minDepth: 250 }, // sperm whale
  187: { kind: 'ram', hull: 0.2, p: 0.04 },  // orca: rams the sub, leaves divers alone
  188: { kind: 'ambush', dmg: 4, hull: 0.3, p: 0.08, minDepth: 2400 }, // abyssal sleeper shark: from below, Earl or the sub
};
const DOLPHINS = new Set([185, 186]);

// Encounter director: how many hunting encounters per minute, by where Earl is and when.
// Open water in the upper 300 m is shark and billfish country; the deep belongs to sperm whales;
// Humboldt squid rise at night; orcas only bother the submersible near the surface.
export function directEncounters(g, dt, SPECIES_BY_ID) {
  const e = g.earl, W = g.world, rng = g.rng;
  if (g.mode !== 'play') return;
  const night = g.day.light < 0.3;
  const open = W.floorAt(e.x) - e.y > 25;
  const active = g.fauna.list.filter((c) => AGGRO[c.sp.id] && AGGRO[c.sp.id].kind !== 'lurk' && Math.hypot(c.x - e.x, c.y - e.y) < 60).length;
  let rate = 0, pool = [];
  if (e.inSub) {
    if (e.y > 300) { rate = 0.12; pool = [184]; }
    else if (e.y < 150) { rate = 0.1; pool = [187]; }
  } else if (e.y > 260) { rate = 0.18; pool = [184]; }
  else if (e.y > 3) {
    rate = open ? 0.45 : 0.22;
    pool = [76, 78, 82, 42, 43, 44, 83];
    if (e.y < 60) pool.push(80);
    if (night) { rate *= 2; pool.push(148, 148); }
  }
  // 2,500-3,000 m belongs to the abyssal sleeper shark (in the sub or out of it)
  if (e.y > 2450 && e.y < 3050) { rate = 0.14; pool = [188]; }
  if (g.injury > 0) rate *= 1 + g.injury * 0.6;   // blood in the water
  if (g.concealed || g.protection) rate *= 0.1;
  rate *= g.stillMul || 1;                         // still water: they are slow to come
  if (active >= 2) rate = 0;                        // one or two at a time
  g.encT = (g.encT ?? 20) - dt * rate / 0.5;         // a countdown that runs faster in dangerous water
  if (g.encT > 0 || !pool.length) return;
  g.encT = rng.range(20, 40);
  const cands = pool.map((id) => SPECIES_BY_ID[id]).filter((sp) => e.y >= sp.dmin && e.y <= sp.dmax);
  if (!cands.length) return;
  const sp = rng.pick(cands);
  // arrive from the dark, beyond the edge of the screen
  const side = rng() < 0.5 ? -1 : 1;
  const x = clamp(e.x + side * rng.range(32, 40), 5, 2975);
  let y = clamp(e.y + rng.range(-10, 10), 2, W.floorAt(x) - 3);
  if ((sp.id === 184 && !e.inSub) || sp.id === 188) y = Math.min(W.floorAt(x) - 5, e.y + rng.range(5, 30)); // from below
  const n = sp.id === 187 ? 3 : sp.id === 148 ? 4 : 1;
  const gid = g.fauna.groupId++;
  for (let i = 0; i < n; i++) {
    const c = g.fauna.makeFish(sp, x + i * 3 * side, y + (i - n / 2) * 2, -side, gid, i === 0);
    c.att = { s: 'idle', t: 0, cool: i * 4 + rng.range(0, 2) }; c.hunting = true;
    g.fauna.list.push(c);
  }
}

export function updateHunters(g, dt) {
  const e = g.earl, list = g.fauna.list, rng = g.rng;
  // a big animal bites with its head, not its middle: how far its snout is from him (drawn 1.6x life)
  const headD = (c) => Math.hypot(c.x + (c.dir > 0 ? 1 : -1) * c.len * 0.8 - e.x, c.y - e.y);
  const night = g.day.light < 0.3;
  const protectedNow = !!g.protection;
  const dolphinsNear = list.some((c) => DOLPHINS.has(c.sp.id) && dist(c.x, c.y, e.x, e.y) < 25);
  const frenzy = g.fauna.puffs.some((p) => dist(p.x, p.y, e.x, e.y) < 35);
  const hidden = g.concealed;
  const flash = g.time - (g.lampFlashT ?? -99) < 0.45 && (e.y > 25 || g.dayEff < 0.4);
  g.threat = null;

  for (const c of list) {
    const A = AGGRO[c.sp.id];
    if (!A || c.dead) continue;
    const at = c.att || (c.att = { s: 'idle', t: 0, cool: rng.range(5, 20) });
    const d = dist(c.x, c.y, e.x, e.y);
    at.t += dt;
    at.cool -= dt;
    c.ctrl = null;
    if (c.jaw) c.jaw = Math.max(0, c.jaw - dt * 1.5);
    // the one thing the abyssal sleeper keeps clear of: the thing in the deep
    if (c.sp.id === 188 && g.entity && dist(c.x, c.y, g.entity.x, g.entity.y) < 160) {
      const ent = g.entity, dx = c.x - ent.x, dy = c.y - ent.y, dd = Math.hypot(dx, dy) + 0.01;
      c.ctrl = { x: c.x + dx / dd * 30, y: clamp(c.y + dy / dd * 10 + 6, 2, 3990), speed: 4.5 };
      if (at.s !== 'idle' && at.s !== 'leave') { at.s = 'leave'; at.t = 0; at.cool = 60; }
      continue;
    }

    const toEarl = (speed, off = 0) => { c.ctrl = { x: e.x, y: e.y + off, speed }; };
    // steer so the snout, not the middle, arrives at him (a long animal: drawn 1.6x life)
    const headTo = (speed, off = 0) => { const s = Math.sign(e.x - c.x) || 1; c.ctrl = { x: e.x - s * c.len * 0.8, y: e.y + off, speed }; };
    const leave = (cool) => { at.s = 'leave'; at.t = 0; at.cool = cool; };
    const canTargetDiver = !e.inSub && A.kind !== 'ram';
    const canTargetSub = e.inSub && A.hull;

    // abort conditions for anything mid-attack
    if (at.s !== 'idle' && at.s !== 'leave') {
      const sharkish = A.kind === 'shark' || A.kind === 'nip';
      if (protectedNow || (sharkish && dolphinsNear) || (!canTargetDiver && !canTargetSub)) { leave(rng.range(25, 45)); continue; }
      if (hidden && (at.s === 'circle' || at.s === 'line' || at.s === 'stalk' || at.s === 'sink' || at.s === 'rise') && at.t > 1.5) { leave(rng.range(15, 30)); continue; }
      // flashing the lamp at the last moment makes a charging animal swerve away
      if (flash && d < 14 && (at.s === 'windup' || at.s === 'charge' || at.s === 'bite' || at.s === 'lunge' || at.s === 'gape' || at.s === 'rise')) {
        leave(rng.range(25, 45)); g.events.push('swerve'); continue;
      }
    }

    switch (at.s) {
      case 'idle': {
        if (at.cool > 0 || d > 40 || protectedNow) break;
        if (!canTargetDiver && !canTargetSub) break;
        if (A.minDepth && e.y < A.minDepth) break;
        if (A.night && !night) break;
        if (A.kind === 'lurk') {
          if (d < A.range && !e.inSub) { at.s = 'windup'; at.t = 0; at.wx = e.x; at.wy = e.y; }
          break;
        }
        if (A.provoked && !(d < 3 || g.injury > 0 || (e.sprint && d < 8))) break;
        if ((A.kind === 'shark' || A.kind === 'nip') && dolphinsNear) break;
        let p = A.p * (night ? 2 : 1) * (c.hunting ? 6 : 1);
        if (A.kind === 'shark' || A.kind === 'nip') p *= (1 + g.injury * 0.8) * (frenzy ? 2 : 1);
        if (hidden) p *= 0.15;
        if (rng() < p * dt) {
          at.t = 0;
          if (A.kind === 'shark') { at.s = 'circle'; at.ang = Math.atan2(c.y - e.y, c.x - e.x); at.r = clamp(d, 8, 14); at.loops = 0; at.dir = rng() < 0.5 ? 1 : -1; }
          else if (A.kind === 'charge') { at.s = 'line'; at.side = c.x < e.x ? -1 : 1; }
          else if (A.kind === 'whale' || A.kind === 'ram') { at.s = 'stalk'; g.events.push(A.kind === 'whale' ? 'clicks' : 'orca'); }
          else if (A.kind === 'nip') { at.s = 'bite'; }
          else if (A.kind === 'ambush') { at.s = 'sink'; at.side = c.x < e.x ? -1 : 1; }
        }
        break;
      }
      case 'circle': {
        // circle Earl, tightening, for a few loops; then a bump; then the bite
        at.ang += at.dir * dt * (3.5 / at.r);
        at.r = Math.max(4, at.r - dt * 0.5);
        c.ctrl = { x: e.x + Math.cos(at.ang) * at.r, y: Math.max(1, e.y + Math.sin(at.ang) * at.r * 0.6), speed: 3.6 };
        g.threat = g.threat || c;
        if (at.t > 9 && !at.bumped) { at.s = 'bump'; at.t = 0; }
        else if (at.t > 4 && at.bumped) { at.s = 'bite'; at.t = 0; }
        break;
      }
      case 'bump':
        toEarl(6);
        if (d < 1.4 + c.len * 0.2) { at.bumped = true; at.s = 'circle'; at.t = 0; g.events.push('bump'); }
        if (at.t > 4) { at.s = 'circle'; at.t = 0; at.bumped = true; }
        g.threat = c;
        break;
      case 'line': {
        // get level with Earl, 16 m off to one side
        c.ctrl = { x: e.x + at.side * 16, y: e.y, speed: 6 };
        if ((Math.abs(c.x - (e.x + at.side * 16)) < 3 && Math.abs(c.y - e.y) < 2) || at.t > 7) { at.s = 'windup'; at.t = 0; }
        break;
      }
      case 'windup':
        // hold still and face him: the warning
        c.ctrl = { x: c.x, y: c.y, speed: 0.3 };
        c.dir = e.x > c.x ? 1 : -1;
        g.threat = c;
        if (A.kind === 'lurk') {
          if (at.t > 0.55) { if (d < A.range + 0.6) g.hurt(A.dmg, c.sp, 'lurk'); leave(rng.range(8, 14)); }
          break;
        }
        if (at.t > 1.2) {
          at.s = 'charge'; at.t = 0;
          const dx = e.x - c.x, dy = e.y - c.y, dd = Math.hypot(dx, dy) + 0.01;
          at.vx = dx / dd; at.vy = dy / dd; at.hit = false;
          g.events.push('charge');
        }
        break;
      case 'charge':
        // a straight line through where Earl was: move and it misses
        c.ctrl = { x: c.x + at.vx * 20, y: c.y + at.vy * 20, speed: 13 };
        g.threat = c;
        if (!at.hit && canTargetDiver && d < 1.1 + c.len * 0.1) { at.hit = true; g.hurt(A.dmg, c.sp, 'charge'); }
        if (at.t > 3.2) leave(rng.range(30, 50));
        break;
      case 'bite':
        toEarl(A.kind === 'nip' ? 5.5 : 9.5);
        g.threat = c;
        if (d < 1.2 + c.len * 0.15) { g.hurt(A.dmg, c.sp, 'bite'); leave(rng.range(40, 70)); }
        if (at.t > 6) leave(rng.range(20, 30));
        break;
      case 'stalk':
        // the whale's clicks, or the orca pod closing on the sub, from the dark
        toEarl(2);
        g.threat = c;
        if (at.t > 6 || d < 10) { at.s = 'lunge'; at.t = 0; g.events.push('lunge'); }
        break;
      case 'lunge':
        toEarl(9);
        g.threat = c;
        if (d < 2.5 + c.len * 0.15) {
          if (e.inSub) g.damageSub(A.hull, c.sp);
          else if (A.dmg) g.hurt(A.dmg, c.sp, 'whale');
          leave(rng.range(60, 120));
        }
        if (at.t > 6) leave(rng.range(30, 60));
        break;
      case 'sink':
        // the sleeper drops away into the dark below and behind him, out of his light
        c.ctrl = { x: e.x + at.side * 12, y: Math.min(e.y + 11, g.world.floorAt(c.x) - 3), speed: 3 };
        if (at.t > 6 || (Math.abs(c.x - (e.x + at.side * 12)) < 4 && c.y > e.y + 7)) { at.s = 'rise'; at.t = 0; }
        break;
      case 'rise':
        // then it rises, slowly, straight up at him: a pale shape coming out of the black beneath
        headTo(1.7, 1.5);
        c.jaw = Math.max(c.jaw || 0, 0.12);
        g.threat = c;
        if (headD(c) < 9 || at.t > 14) { at.s = 'gape'; at.t = 0; g.events.push('lunge'); }
        break;
      case 'gape':
        // the lunge: a short burst, the jaw dropping open
        headTo(8);
        c.jaw = Math.min(1, at.t * 4);
        g.threat = c;
        if (headD(c) < (e.inSub ? 3.5 : 2.4)) {
          if (e.inSub) g.damageSub(A.hull, c.sp);
          else g.hurt(A.dmg, c.sp, 'bite');
          leave(rng.range(60, 120));
        }
        if (at.t > 3) leave(rng.range(30, 60));
        break;
      case 'leave': {
        // swim off, away from Earl
        const dx = c.x - e.x, dy = c.y - e.y, dd = Math.hypot(dx, dy) + 0.01;
        c.ctrl = { x: c.x + dx / dd * 20, y: clamp(c.y + dy / dd * 6, 2, 3000), speed: 5 };
        if (at.t > 6) { at.s = 'idle'; at.t = 0; c.ctrl = null; }
        break;
      }
    }
  }

  // sharks keep their distance from a dolphin pod
  if (dolphinsNear) for (const c of list) {
    const A = AGGRO[c.sp.id];
    if (A && (A.kind === 'shark' || A.kind === 'nip') && c.att && c.att.s === 'idle') c.att.cool = Math.max(c.att.cool, 10);
  }
}
