// Swimming life: spawns around the camera within each species' real depth range,
// schools, wanders, startles from Earl, and flees from the entity.
import { SPECIES, isSwimHab } from './species.js';
import { clamp, lerp, fbm1, dist } from './util.js';

const SWIMMERS = SPECIES.filter((s) => isSwimHab(s.v.hab));

function habitatOk(sp, x, y, W) {
  const fl = W.floorAt(x);
  const above = fl - y;
  if (above < 0.5) return false;
  if (W.rockAt(x, y, 1)) return false;
  switch (sp.v.hab) {
    case 'reef': return above < 12 && x > 840;
    case 'floor-swim': return above < 3;
    case 'demersal': return above < 25;
    case 'drift-low': return above < 4;
    case 'surface': return y < 3;
    default: return true;
  }
}
function weightOf(sp) {
  let w = 1 / (0.6 + sp.len * 0.7);
  if (sp.len > 6) w *= 0.15; // giants are rare encounters
  else if (sp.len > 2.5) w *= 0.4;
  if (sp.v.hab === 'reef') w *= 2.2;
  if (sp.v.sch > 4) w *= 1.6;
  if (/Shark/.test(sp.cat)) w *= 0.3;
  return w;
}

export class Fauna {
  constructor(W, rng) {
    this.W = W; this.rng = rng; this.list = []; this.spawnT = 0; this.groupId = 1;
  }
  // target number of groups (a school counts once) near the camera
  targetCount(depth, dread, openWater) {
    let base = depth < 60 ? 6 : depth < 200 ? 5 : depth < 600 ? 4 : depth < 1200 ? 3 : 2;
    if (openWater) base = Math.max(1, base - 2);
    return Math.round(base * (1 - dread * 0.95));
  }
  groupCount() { const s = new Set(); for (const c of this.list) s.add(c.gid); return s.size; }
  trySpawn(cam, dread) {
    const rng = this.rng, W = this.W;
    // pick a point just outside the view
    const side = rng() < 0.5 ? -1 : 1;
    let x = cam.x + side * (cam.w / 2 + rng.range(4, 30));
    let y = cam.y + rng.range(-cam.h * 0.9, cam.h * 0.9);
    if (rng() < 0.3) { x = cam.x + rng.range(-cam.w, cam.w); y = cam.y + (rng() < 0.5 ? -1 : 1) * (cam.h / 2 + rng.range(4, 18)); }
    if (x < 2 || x > 985 || y < 0.6) return;
    const cands = SWIMMERS.filter((s) => y >= s.dmin && y <= s.dmax && habitatOk(s, x, y, W));
    if (!cands.length) return;
    let tot = 0; for (const c of cands) tot += weightOf(c);
    let r = rng() * tot, sp = cands[0];
    for (const c of cands) { r -= weightOf(c); if (r <= 0) { sp = c; break; } }
    const n = Math.max(1, Math.min(24, Math.round((sp.v.sch || 1) * rng.range(0.5, 1.2))));
    const gid = this.groupId++;
    const dir = side < 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const sz = rng.range(0.75, 1.15);
      const ox = rng.range(-1, 1) * Math.min(6, 0.6 + n * 0.12), oy = rng.range(-1, 1) * Math.min(3, 0.4 + n * 0.06);
      const c = {
        sp, x: x + ox, y: Math.max(0.5, y + oy), vx: dir * 0.4, vy: 0, dir, len: sp.len * sz,
        phase: rng() * 100, gid, leader: i === 0, wob: rng() * 1000, flee: 0, noted: false,
        speed: clamp(0.35 + Math.sqrt(sp.len) * 0.7, 0.3, 2.6) * (sp.v.hab === 'drift' || sp.v.hab === 'drift-low' ? 0.12 : 1),
      };
      this.list.push(c);
    }
  }
  update(dt, cam, earl, entity, dread, time) {
    const W = this.W;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.25;
      const open = this.W.floorAt(cam.x) - cam.y > 60;
      if (this.groupCount() < this.targetCount(cam.y, dread, open)) this.trySpawn(cam, dread);
    }
    const leaders = {};
    for (const c of this.list) if (c.leader) leaders[c.gid] = c;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      // despawn far away
      if (Math.abs(c.x - cam.x) > cam.w * 1.6 || Math.abs(c.y - cam.y) > cam.h * 2.2) { this.list.splice(i, 1); continue; }
      let tx, ty;
      const L = leaders[c.gid];
      if (!c.leader && L) {
        // follow the leader with an offset
        tx = L.x - L.dir * (0.5 + (c.wob % 3)) + Math.sin(time * 0.7 + c.wob) * 1.2;
        ty = L.y + Math.sin(time * 0.5 + c.wob * 1.3) * 0.9 + ((c.wob % 7) - 3.5) * 0.25;
      } else {
        c.leader = true;
        const wander = fbm1(time * 0.05 + c.wob, 2, 3) * 1.6;
        tx = c.x + c.dir * 6;
        ty = c.y + wander * 3;
      }
      let ax = (tx - c.x) * 0.6, ay = (ty - c.y) * 0.6;
      let sp = c.speed;
      // startle from Earl
      const de = dist(c.x, c.y, earl.x, earl.y);
      const scare = earl.speedNow > 3 ? 4 + c.len : 1.8 + c.len * 0.5;
      if (de < scare && c.sp.v.hab !== 'drift') {
        ax += (c.x - earl.x) / (de + 0.1) * 12; ay += (c.y - earl.y) / (de + 0.1) * 12; sp *= 2.4;
      }
      // flee the entity
      if (entity && dread > 0.05) {
        const dx = c.x - entity.x, dy = c.y - entity.y, dd = Math.hypot(dx, dy) + 1;
        const f = dread * 30;
        ax += (dx / dd) * f; ay += (dy / dd) * f * 0.5;
        sp *= 1 + dread * 2.5;
      }
      // stay in water & habitat band
      const fl = W.floorAt(c.x);
      if (c.y > fl - 1.2) ay -= 8;
      if (c.y < 0.6) ay += 6;
      if (c.sp.v.hab === 'reef' && fl - c.y > 10) ay += 1.5;
      if ((c.sp.v.hab === 'floor-swim' || c.sp.v.hab === 'drift-low') && fl - c.y > 2.5) ay += 1.5;
      if (c.sp.v.hab === 'demersal' && fl - c.y > 20) ay += 1;
      if (c.y < c.sp.dmin) ay += 2;
      if (c.y > c.sp.dmax) ay -= 2;
      c.vx += ax * dt; c.vy += ay * dt;
      const v = Math.hypot(c.vx, c.vy);
      if (v > sp) { c.vx *= sp / v; c.vy *= sp / v; }
      c.vy *= 0.97;
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (W.rockAt(c.x, c.y)) { c.x -= c.vx * dt * 2; c.y -= c.vy * dt * 2; c.vx = -c.vx * 0.5; c.dir = -c.dir; }
      if (Math.abs(c.vx) > 0.08) c.dir = c.vx > 0 ? 1 : -1;
      if (c.x < 3) { c.dir = 1; c.vx = Math.abs(c.vx); }
      c.phase += dt * (0.6 + Math.min(3, v * 1.2));
    }
  }
  nearest(x, y, maxD) {
    let best = null, bd = maxD;
    for (const c of this.list) {
      const d = dist(x, y, c.x, c.y) - c.len * 0.4;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
}
