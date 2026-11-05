// Swimming life: spawns around the camera within each species' real depth range.
//  - ordinary groups: a leader and a few followers (reef fish, sharks, jellies...)
//  - bait schools: 50-180 small fish moving as one body around a moving centre; they part
//    around Earl and pull into a tight ball when a predator comes
//  - predators hunt nearby small fish and eat them
//  - everything flees the entity
import { rollVariant, canBeRare } from './variants.js';
import { SPECIES, SPECIES_BY_ID, isSwimHab } from './species.js';
import { clamp, lerp, fbm1, dist } from './util.js';

const SWIMMERS = SPECIES.filter((s) => isSwimHab(s.v.hab));

// Bait schools by depth. Lanternfish migrate: deep by day, near the surface at night.
const BAIT = [
  { id: 48, min: 2, max: 150, n: [80, 160] },   // Atlantic herring
  { id: 49, min: 2, max: 120, n: [90, 180] },   // Pacific sardine
  { id: 50, min: 2, max: 100, n: [100, 180] },  // Northern anchovy
  { id: 51, min: 2, max: 150, n: [50, 90] },    // Atlantic mackerel
  { id: 62, min: 40, max: 400, n: [50, 90] },   // Alaska pollock
  { id: 161, min: 5, max: 350, n: [120, 200] }, // Antarctic krill
  { id: 98, min: 250, max: 900, nightMin: 15, nightMax: 250, n: [60, 130] }, // spotted lanternfish
  { id: 99, min: 200, max: 600, n: [25, 50] },  // silver hatchetfish
];

// Species that migrate up toward the surface at night and back down by day.
const MIGRATORS = new Set([98, 99, 102, 103, 105, 148, 150, 151, 161, 88, 104]);
// Never flee from Earl: drifters, slow or curious animals, and the things that might attack him.
const NO_FLEE = new Set([46, 77, 84, 88, 31, 32, 33, 183, 107, 100, 67, 12, 11, 141, 184, 185, 186, 187, 76, 78, 82, 83, 80, 42, 43, 44, 148, 89, 85]);
const DIVE_SPEED = 1.68; // Earl's speed: fish escape at 0.55-1.5x it
// genuinely fast swimmers: may burst to 1.5x Earl's speed (swordfish, sailfish, marlin, tunas,
// mako, wahoo, mahi-mahi, dolphins, orca). Everything else is slower than a diver can sprint.
const FAST = new Set([42, 43, 44, 39, 40, 41, 82, 52, 45, 185, 186, 187]);

// Predators that hunt small fish (ids from the species list).
const PREDATORS = new Set([35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 52, 53, 76, 78, 79, 82, 83, 148, 30, 31, 32, 34, 68, 102]);

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
  if (PREDATORS.has(sp.id)) w *= 1.4; // keep some hunters around the bait
  return w;
}

export class Fauna {
  constructor(W, rng) {
    this.W = W; this.rng = rng; this.list = []; this.spawnT = 0; this.baitT = 0; this.groupId = 1;
    this.schools = new Map(); // gid -> school centre state (bait schools only)
    this.puffs = [];          // little clouds of scales where something was eaten
  }
  // target number of ordinary groups near the camera (less life the deeper you go)
  targetCount(depth, dread, openWater) {
    let base = depth < 60 ? 9 : depth < 200 ? 7 : depth < 600 ? 5 : depth < 1200 ? 4 : 3;
    if (openWater) base = Math.max(2, base - 1);
    return Math.round(base * (1 - dread * 0.95));
  }
  baitTarget(depth, dread) {
    const base = depth < 150 ? 2 : depth < 600 ? 2 : depth < 1000 ? 1 : 0;
    return Math.round(base * (1 - dread));
  }
  groupCount() {
    const s = new Set();
    for (const c of this.list) if (!this.schools.has(c.gid)) s.add(c.gid);
    return s.size;
  }

  pickSpawnPoint(cam) {
    const rng = this.rng;
    const side = rng() < 0.5 ? -1 : 1;
    let x = cam.x + side * (cam.w / 2 + rng.range(4, 30));
    let y = cam.y + rng.range(-cam.h * 0.9, cam.h * 0.9);
    if (rng() < 0.3) { x = cam.x + rng.range(-cam.w, cam.w); y = cam.y + (rng() < 0.5 ? -1 : 1) * (cam.h / 2 + rng.range(4, 18)); }
    return { x, y, side };
  }

  trySpawn(cam, dread) {
    const rng = this.rng, W = this.W;
    const { x, y, side } = this.pickSpawnPoint(cam);
    if (x < 2 || x > 985 || y < 0.6) return;
    const cands = SWIMMERS.filter((s) => {
      if (y < s.dmin || y > s.dmax || !habitatOk(s, x, y, W)) return false;
      const [lo, hi] = this.depthBand(s, x, this.night);
      return y >= lo - 15 && y <= hi + 15;
    });
    if (!cands.length) return;
    const wOf = (c) => {
      let w = weightOf(c);
      if (this.bleeding && /Shark/.test(c.cat)) w *= 3;           // blood in the water
      if (this.night && /Shark/.test(c.cat)) w *= 1.6;            // sharks hunt at night
      if (c.id === 185 || c.id === 186) w *= 2.5;                 // dolphin pods are fairly common near the surface
      if (c.id === 187) w *= 4;
      if (c.id === 184) w *= y > 250 ? 14 : 2;                   // sperm whales hunt in the deep
      return w;
    };
    let tot = 0; for (const c of cands) tot += wOf(c);
    let r = rng() * tot, sp = cands[0];
    for (const c of cands) { r -= wOf(c); if (r <= 0) { sp = c; break; } }
    const n = Math.max(1, Math.min(24, Math.round((sp.v.sch || 1) * rng.range(0.5, 1.2))));
    const gid = this.groupId++;
    const dir = side < 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const k = Math.max(1, sp.len * 0.7); // big animals spawn a body-length or so apart
      const ox = rng.range(-1, 1) * Math.min(6, 0.6 + n * 0.12) * k, oy = rng.range(-1, 1) * Math.min(3, 0.4 + n * 0.06) * k;
      this.list.push(this.makeFish(sp, x + ox, Math.max(0.5, y + oy), dir, gid, i === 0));
    }
  }

  trySpawnBait(cam, night) {
    const rng = this.rng, W = this.W;
    const { x, y, side } = this.pickSpawnPoint(cam);
    if (x < 5 || x > 975 || y < 2) return;
    const fl = W.floorAt(x);
    if (fl - y < 8) return;
    const opts = BAIT.filter((b) => {
      const lo = night && b.nightMin !== undefined ? b.nightMin : b.min;
      const hi = night && b.nightMax !== undefined ? b.nightMax : b.max;
      return y >= lo && y <= hi;
    });
    if (!opts.length) return;
    const b = rng.pick(opts);
    const sp = SPECIES_BY_ID[b.id];
    const n = rng.int(b.n[0], b.n[1]);
    const gid = this.groupId++;
    const dir = side < 0 ? 1 : -1;
    // spacing: about a body length and a half between fish, never tighter than ~15 cm (tiny
    // krill and lanternfish otherwise merge into one solid blob)
    const baseR = Math.sqrt(n) * Math.max(sp.len, 0.1) * 0.75 + 0.6;
    this.schools.set(gid, {
      sp, x, y, vx: dir * 0.6, vy: 0, dir, n, r: baseR, baseR, wob: rng() * 100, threat: 0, turnTime: -99, turnT: rng.range(15, 40),
      lo: night && b.nightMin !== undefined ? b.nightMin : b.min, hi: night && b.nightMax !== undefined ? b.nightMax : b.max,
    });
    for (let i = 0; i < n; i++) {
      // denser in the core, thinning toward the edges
      const a = rng() * Math.PI * 2, rr = Math.pow(rng(), 0.75);
      const c = this.makeFish(sp, x + Math.cos(a) * rr * baseR * 1.8, y + Math.sin(a) * rr * baseR, dir, gid, false);
      c.ox = Math.cos(a) * rr; c.oy = Math.sin(a) * rr;
      c.speed = clamp(0.6 + sp.len * 3, 0.6, 1.8);
      c.hvy = 0; c.flash = 0; c.turnedAt = -99;
      this.list.push(c);
    }
  }

  makeFish(sp, x, y, dir, gid, leader) {
    const rng = this.rng;
    const sz = rng.range(0.75, 1.15);
    const len = sp.len * sz, hab = sp.v.hab;
    // cruising at roughly one body length a second (bounded), much slower for drifters
    let cruise = clamp(len * 0.8, 0.3, 1.6);
    if (hab === 'drift' || hab === 'drift-low') cruise = 0.12;
    if (sp.id === 185 || sp.id === 186) cruise = 2.4; if (sp.id === 187) cruise = 2.2; if (sp.id === 184) cruise = 1.4;
    // escape speed: 0.7-1.3x Earl's swimming speed, small fish fastest; some never flee
    let flee = 0;
    const noFlee = NO_FLEE.has(sp.id) || hab === 'drift' || hab === 'drift-low' || /seahorse|seadragon|pipefish|jelly|comb|siphon|manowar|nautilus/.test(sp.v.s);
    if (!noFlee) flee = (FAST.has(sp.id) ? rng.range(1.35, 1.5) : len < 0.3 ? rng.range(0.85, 1.05) : len < 1 ? rng.range(0.7, 0.9) : rng.range(0.55, 0.75)) * DIVE_SPEED;
    const c = {
      sp, x, y, vx: dir * 0.4, vy: 0, dir, len,
      phase: rng() * 100, gid, leader, wob: rng() * 1000, noted: false,
      speed: cruise, cruise, flee, fleeT: 0,
      tDepth: y, tDepthT: rng.range(4, 15), turnT: rng.range(25, 70),
      predator: PREDATORS.has(sp.id), prey: null, huntCool: rng.range(2, 10), dead: false,
    };
    // rare variants, once Earl has caught a normal one of this species
    if (this.caught && this.caught.has(sp.id) && canBeRare(sp) && !this.schools.has(gid)) {
      const v = rollVariant(rng, y, this.entityNear, this.rareMult || 1);
      if (v) {
        c.variant = v;
        if (v === 'giant') { const k = rng.range(1.6, 2.0); c.len *= k; c.flee *= 0.75; c.cruise = c.speed = Math.min(c.cruise * 1.2, 2); }
      }
    }
    return c;
  }

  // the depth band this animal wants to be in right now (migrators move up at night)
  depthBand(sp, x, night) {
    let lo = sp.dmin, hi = Math.min(sp.dmax, this.W.floorAt(x) - 2);
    if (MIGRATORS.has(sp.id)) {
      if (night) hi = Math.min(hi, Math.max(lo + 30, 250));
      else lo = Math.max(lo, Math.min(hi - 30, 280));
    }
    if (sp.id === 185 || sp.id === 186 || sp.id === 187) hi = Math.min(hi, 120); // air-breathers stay fairly shallow
    return [Math.max(0.8, lo), Math.max(lo + 1, hi)];
  }

  update(dt, cam, earl, entity, dread, time, night = false) {
    const W = this.W, rng = this.rng;
    this.night = night;
    this.spawnT -= dt; this.baitT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.25;
      const open = W.floorAt(cam.x) - cam.y > 60;
      if (this.groupCount() < this.targetCount(cam.y, dread, open)) this.trySpawn(cam, dread);
    }
    if (this.baitT <= 0) {
      this.baitT = 0.6;
      if (this.schools.size < this.baitTarget(cam.y, dread)) this.trySpawnBait(cam, night);
    }

    const hunting = this.list.filter((h) => h.prey && !h.dead);
    // ---- bait school centres ----
    for (const [gid, s] of this.schools) {
      // a slowly wandering heading
      const wander = fbm1(time * 0.04 + s.wob, 2, 7);
      let ax = s.dir * 0.35, ay = wander * 0.5;
      s.threat = Math.max(0, s.threat - dt * 0.25);
      const fl = W.floorAt(s.x);
      if (s.y > fl - s.r - 4) ay -= 1.2;
      if (s.y < s.lo + s.r) ay += 0.6;
      if (s.y > s.hi - s.r) ay -= 0.6;
      if (s.y < 2 + s.baseR) ay += 2;
      if (s.y < 1 + s.baseR) s.y = 1 + s.baseR;
      // the whole school moves off from a diver who comes close (faster if he comes fast), and
      // closes up tighter while he is near - instead of individual fish piling up around him
      const de = dist(s.x, s.y, earl.x, earl.y) + 0.01;
      const zone = s.r * 1.8 + 5 + (earl.speedNow > 2.5 ? 4 : 0);
      if (de < zone && !earl.inSub) {
        const push = (1 - de / zone) * (earl.speedNow > 2.5 ? 5 : 2.5);
        ax += (s.x - earl.x) / de * push; ay += (s.y - earl.y) / de * push * 0.7;
        s.threat = Math.min(1.2, s.threat + dt * (1 - de / zone) * 1.5);
      }
      if (entity && dread > 0.05) { const dx = s.x - entity.x, dy = s.y - entity.y, dd = Math.hypot(dx, dy) + 1; ax += dx / dd * dread * 6; ay += dy / dd * dread * 3; }
      // a hunter closing in: the whole school veers away from it
      for (const h of hunting) {
        const dx = s.x - h.x, dy = s.y - h.y, dd = Math.hypot(dx, dy) + 0.01, hz = s.r * 1.6 + 6;
        if (dd < hz) { const k = (1 - dd / hz) * 4; ax += dx / dd * k; ay += dy / dd * k * 0.6; }
      }
      s.vx += ax * dt; s.vy += ay * dt;
      const sp = 0.6 + s.threat * 2.4 + dread * 0.8; // a scared school moves off together, about as fast as a diver
      const v = Math.hypot(s.vx, s.vy);
      if (v > sp) { s.vx *= sp / v; s.vy *= sp / v; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x < 10) s.dir = 1; if (s.x > 970) s.dir = -1;
      // now and then the school wheels round on its own
      s.turnT -= dt;
      if (s.turnT <= 0) { s.turnT = rng.range(18, 45); s.vx = -s.vx * 0.5; s.dir = -s.dir; }
      const nd = Math.abs(s.vx) > 0.15 ? (s.vx > 0 ? 1 : -1) : s.dir;
      if (nd !== s.prevDir) { s.turnTime = time; s.prevDir = nd; }
      s.dir = nd;
      // tighten into a ball under threat
      const want = s.baseR * (1 - 0.3 * Math.min(1, s.threat));
      s.r = lerp(s.r, want, dt * 1.5);
    }

    // ---- predators look for prey ----
    for (const c of this.list) {
      if (!c.predator || c.dead) continue;
      c.huntCool -= dt;
      if (c.prey && (c.prey.dead || dist(c.x, c.y, c.prey.x, c.prey.y) > 30)) c.prey = null;
      if (!c.prey && c.huntCool <= 0 && rng() < dt * 2) {
        let best = null, bd = 22;
        for (const p of this.list) {
          if (p === c || p.dead || p.predator || p.len > c.len * 0.3 || p.len > 0.6) continue;
          if (p.sp.v.hab === 'drift' || p.sp.v.hab === 'floor' ) continue;
          const d = Math.abs(p.x - c.x) + Math.abs(p.y - c.y);
          if (d < bd) { bd = d; best = p; }
        }
        if (best) c.prey = best;
      }
    }

    const leaders = {};
    for (const c of this.list) if (c.leader && !this.schools.has(c.gid)) leaders[c.gid] = c;
    const hunters = this.list.filter((h) => h.prey && !h.dead);
    // large animals in a group (dolphins, orca, sharks...) keep their own space instead of overlapping
    const bigs = this.list.filter((b) => b.len > 1 && !this.schools.has(b.gid));
    const counts = new Map();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      if (c.dead) { this.list.splice(i, 1); continue; }
      // despawn far away
      const busy = c.att && c.att.s !== 'idle';
      if (!busy && (Math.abs(c.x - cam.x) > cam.w * 1.7 || Math.abs(c.y - cam.y) > cam.h * 2.4)) { this.list.splice(i, 1); continue; }
      counts.set(c.gid, (counts.get(c.gid) || 0) + 1);
      const school = this.schools.get(c.gid);
      let tx, ty, sp = c.speed, ax, ay;
      if (school) {
        // a fixed place in the school's shape; only the spacing tightens when it is threatened
        const tight = 1 - 0.15 * Math.min(1, school.threat);
        const ox = c.ox + Math.sin(time * 0.31 + c.wob) * 0.04, oy = c.oy + Math.cos(time * 0.27 + c.wob * 1.7) * 0.04;
        tx = school.x + ox * school.baseR * 1.8 * tight; ty = school.y + oy * school.baseR * tight;
        ax = (tx - c.x) * 3 + (school.vx - c.vx) * 2;
        ay = (ty - c.y) * 3 + (school.vy - c.vy) * 2;
        sp = Math.max(c.speed * (1 + school.threat), Math.hypot(school.vx, school.vy) * 1.25); // keep up with the school, no more
      } else {
        const L = leaders[c.gid];
        if (!c.leader && L) {
          const k = Math.max(1, c.len * 0.7); // slots scale with body size
          tx = L.x - L.dir * (0.5 + (c.wob % 3)) * k + Math.sin(time * 0.7 + c.wob) * 1.2 * Math.min(k, 2);
          ty = L.y + Math.sin(time * 0.5 + c.wob * 1.3) * 0.9 + ((c.wob % 7) - 3.5) * 0.25 * k;
        } else {
          c.leader = true;
          const pel = c.sp.v.hab === 'pelagic' || c.sp.v.hab === 'drift' || c.sp.v.hab === 'surface';
          if (pel) {
            // roam up and down the species' depth range rather than cruising at one level
            c.tDepthT -= dt;
            const [lo, hi] = this.depthBand(c.sp, c.x, night);
            if (c.tDepthT <= 0 || c.tDepth < lo || c.tDepth > hi) {
              c.tDepthT = rng.range(8, 22);
              const span = Math.min(hi - lo, 40 + c.len * 25);
              c.tDepth = clamp(c.y + rng.range(-span, span), lo, hi);
              if (c.y < lo - 20 || c.y > hi + 20) c.tDepth = clamp(c.y, lo, hi);
            }
          }
          c.turnT -= dt;
          if (c.turnT <= 0) { c.turnT = rng.range(25, 80); c.dir = -c.dir; c.vx *= -0.3; }
          const wander = fbm1(time * 0.05 + c.wob, 2, 3) * 1.6;
          tx = c.x + c.dir * 6;
          ty = pel ? c.y + clamp(c.tDepth - c.y, -4, 4) + wander : c.y + wander * 3;
        }
        ax = (tx - c.x) * 0.6; ay = (ty - c.y) * 0.6;
        if (c.len > 1) for (const o of bigs) {
          if (o === c || o.gid !== c.gid) continue;
          const dx = c.x - o.x, dy = (c.y - o.y) * 2.5, need = (c.len + o.len) * 0.55, d = Math.hypot(dx, dy);
          if (d < need) { const f = (need - d) / need * 4 / (d + 0.05); ax += dx * f * 1.5; ay += dy * f; }
        }
      }
      // an attacker under hunter control steers straight to its target
      if (c.ctrl) {
        const dx = c.ctrl.x - c.x, dy = c.ctrl.y - c.y, d = Math.hypot(dx, dy) + 0.01;
        ax = dx / d * 25; ay = dy / d * 25; sp = c.ctrl.speed;
        if (d < 0.3) { ax = -c.vx * 4; ay = -c.vy * 4; }
      }
      // a predator on a hunt: a burst straight at its prey
      if (c.prey) {
        const p = c.prey;
        const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) + 0.01;
        ax = dx / d * 18; ay = dy / d * 18;
        sp = clamp(c.len * 2.2, 3, 10);
        // the school feels it coming
        const ps = this.schools.get(p.gid);
        if (ps && d < 14) ps.threat = Math.min(1.5, ps.threat + dt * 2);
        if (d < Math.max(0.35, c.len * 0.3)) {
          p.dead = true; c.prey = null; c.huntCool = rng.range(5, 14);
          this.puffs.push({ x: p.x, y: p.y, t: 0, n: 6 + Math.floor(rng() * 5), seed: rng() * 100 });
        }
      }
      // prey scatter from a hunter closing in
      if (!c.predator && c.len < 0.6) {
        for (const h of hunters) {
          const dx = c.x - h.x, dy = c.y - h.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) continue;
          const d = Math.hypot(dx, dy) + 0.1;
          if (school) {
            // only the fish right at the strike dart aside (forward, with the school); the rest of
            // the school's response is the whole body veering away and balling up
            // (school fish don't scatter on their own: the whole school veers away instead)
          } else if (d < 4) { ax += dx / d * 30; ay += dy / d * 30; sp *= 2.5; }
        }
      }
      // Earl: schools part around him; other fish bolt if he comes at them fast, but a slow,
      // calm approach lets him get close enough to observe
      const de = dist(c.x, c.y, earl.x, earl.y);
      if (school) {
        // school fish don't break ranks: the whole school moves off (see the school centres)
      } else if (c.flee > 0 && !c.prey && !c.ctrl && !earl.inSub) {
        const closing = ((c.x - earl.x) * earl.vx + (c.y - earl.y) * earl.vy) / (de + 0.01);
        // hanging still he can come very close; drifting slowly, a little less; fast, not at all
        const threat = earl.speedNow < 0.4 ? 0.9 : earl.speedNow < 1.3 ? 1.4 : (3 + c.len * 1.5) * (earl.sprint ? 1.6 : 1) * (closing > 1 ? 1.4 : 1);
        if (de < threat) c.fleeT = 1.2 + c.len * 0.5;
      } else if (c.flee > 0 && earl.inSub && de < 10) c.fleeT = 1.5; // the sub is loud
      if (c.fleeT > 0) {
        c.fleeT -= dt;
        ax = (c.x - earl.x) / (de + 0.1) * 30; ay = (c.y - earl.y) / (de + 0.1) * 20;
        sp = Math.max(sp, c.flee);
      }
      // flee the entity
      if (entity && dread > 0.05) {
        const dx = c.x - entity.x, dy = c.y - entity.y, dd = Math.hypot(dx, dy) + 1;
        const f = dread * 30;
        ax += (dx / dd) * f; ay += (dy / dd) * f * 0.5;
        sp = school ? sp : Math.max(sp, c.flee || c.speed);
      }
      // stay in water & habitat band
      const fl = W.floorAt(c.x);
      if (c.y > fl - 1.2) ay -= 8;
      const surf = this.surfY ? this.surfY(c.x) : 0;
      if (c.y < surf + 0.6) ay += 6;
      if (!school) {
        if (c.sp.v.hab === 'reef' && fl - c.y > 10) ay += 1.5;
        if ((c.sp.v.hab === 'floor-swim' || c.sp.v.hab === 'drift-low') && fl - c.y > 2.5) ay += 1.5;
        if (c.sp.v.hab === 'demersal' && fl - c.y > 20) ay += 1;
        if (c.y < c.sp.dmin) ay += 2;
        if (c.y > c.sp.dmax) ay -= 2;
      }
      if (c.variant === 'abnormal') { ay += Math.sin(time * 2.7 + c.wob) * 2.5; ax += Math.sin(time * 1.9 + c.wob * 2) * 0.8; } // it swims wrong
      c.vx += ax * dt; c.vy += ay * dt;
      const v = Math.hypot(c.vx, c.vy);
      if (v > sp) { c.vx *= sp / v; c.vy *= sp / v; }
      c.vy *= 0.97;
      c.x += c.vx * dt; c.y += c.vy * dt;
      const lim = surf + 0.35 + c.len * 0.15;
      if (c.y < lim) { c.y = lim; if (c.vy < 0) c.vy = 0; }
      if (!school && W.rockAt(c.x, c.y)) { c.x -= c.vx * dt * 2; c.y -= c.vy * dt * 2; c.vx = -c.vx * 0.5; c.dir = -c.dir; }
      if (school) {
        // all aligned with the school; when it turns, the turn sweeps from the leading edge back,
        const front = c.ox * school.prevDir; // +1 at the new front
        if (c.dir !== school.dir && time - school.turnTime > (1 - front) * 0.45) { c.dir = school.dir; c.turnedAt = time; }
        c.hvy = lerp(c.hvy || 0, school.vy * 0.8 + (c.vy - school.vy) * 0.25, Math.min(1, dt * 3));
        c.flash = 0;
      } else if (Math.abs(c.vx) > 0.08) c.dir = c.vx > 0 ? 1 : -1;
      if (c.x < 3) { c.dir = 1; c.vx = Math.abs(c.vx); }
      c.phase += dt * (0.6 + Math.min(4, v * 1.4));
    }
    // forget schools that have dispersed or gone off-screen
    for (const gid of this.schools.keys()) if (!counts.get(gid)) this.schools.delete(gid);
    for (let i = this.puffs.length - 1; i >= 0; i--) { this.puffs[i].t += dt; if (this.puffs[i].t > 2.5) this.puffs.splice(i, 1); }
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
