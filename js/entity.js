// The entity.
//
// It lives in the deep: 1500-3000 m by day, rising to 500-2000 m at night. It is not hunting Earl
// at the start of a run; it roams its range. A hidden attention meter fills when Earl disturbs the
// deep (being below 200 m, noise and light down there, taking things from its domain, coming near
// it). When the meter fills, Earl is MARKED and it hunts him: by sound and light, losing him when
// he hides, searching, and getting a vague fix on him every so often. While hunting it can push up
// toward ~120 m (slowing and fading as it rises - no hard line); otherwise it stays below ~200 m.
// Staying shallow long enough makes it lose interest, and the mark fades.
import { clamp, lerp, dist, TAU } from './util.js';
import { DIVE_SPEED } from './player.js';

export const ENTITY_SPEED = DIVE_SPEED * 1.5;
export const LANTERN_RADIUS = 3;
export const SAFE_DEPTH = 120;   // above this it can never reach Earl
export const REST_CEILING = 200; // when not chasing it keeps below this
const FORGET_TIME = 60;          // seconds above SAFE_DEPTH before a mark fades

export class Entity {
  constructor(rng, world) {
    this.rng = rng;
    this.world = world;
    this.x = rng.range(80, 400); this.y = rng.range(1700, 2300);
    this.vx = 0; this.vy = 0;
    this.state = 'roam'; // roam | hunt | search | drift | repelled | lured
    this.lastX = 500; this.lastY = 5; this.searchT = 0; this.senseT = 12;
    this.heading = 0; this.lureT = 0; this.lure = null; this.repelT = 0;
    this.eyeOpen = 0; this.blink = 0; this.knows = 0;
    this.marked = false; this.attn = 0; this.shallowT = 0; this.fade = 1;
    this.roamX = this.x; this.roamY = this.y; this.roamT = 0;
    this.deepMarkArmed = true;
  }

  // its home range right now (night lifts it toward the surface)
  band(g) {
    const n = clamp(1 - g.day.light, 0, 1); // 0 day .. 1 night
    return [lerp(1500, 500, n), lerp(3000, 2000, n)];
  }

  // add to the attention meter (amount is a fraction of a full mark)
  disturb(g, amount) {
    if (this.marked) return;
    this.attn = Math.min(1, this.attn + amount);
    if (this.attn >= 1) this.mark(g);
  }
  mark(g) {
    if (this.marked) return;
    this.marked = true; this.attn = 1; this.shallowT = 0;
    this.lastX = g.earl.x; this.lastY = g.earl.y;
    this.state = 'search'; this.searchT = 0; this.senseT = this.rng.range(6, 12);
    g.events.push('marked');
  }

  // how far away the entity can perceive Earl right now
  perception(g) {
    const e = g.earl;
    g.concealed = false;
    if (e.inSub) {
      let r = 120 + (e.speedNow > 1 ? 120 : 0) + (e.sprint && e.speedNow > 1 ? 100 : 0);
      if (g.sub.lightsOn && g.ambient < 0.3) r += 60;
      return r;
    }
    const hidden = g.world.inKelp(e.x, e.y) || g.world.underLedge(e.x, e.y);
    const fast = e.sprint && e.speedNow > 1;
    g.concealed = hidden && !fast && !e.lampOn && e.speedNow < 2.5;
    if (hidden && !fast) return e.lampOn ? 14 : 6;
    let r = 45;
    if (e.speedNow > 2) r += 25;
    if (fast) r += 90;
    if (e.lampOn) r += 70;
    if (e.atSurface) r += 30; // splashing
    return r;
  }

  // the attention meter: what Earl is doing in the deep, every frame
  attend(g, dt, d, per) {
    const e = g.earl;
    if (this.marked) {
      // a mark fades if he stays above its reach long enough
      if (e.y < SAFE_DEPTH) { this.shallowT += dt; if (this.shallowT > FORGET_TIME) { this.marked = false; this.attn = 0.35; this.state = 'roam'; g.events.push('unmarked'); } }
      else this.shallowT = 0;
      return;
    }
    // going below 500 m without the submersible marks him outright
    if (!e.inSub && e.y > 500) { if (this.deepMarkArmed) { this.deepMarkArmed = false; this.mark(g); } return; }
    if (e.y < 480 || e.inSub) this.deepMarkArmed = true;
    let rate = 0;
    if (e.y > 200) {
      rate += 0.002 + 0.002 * (e.y - 200) / 100;                    // just being down here
      const noisy = e.inSub ? (e.speedNow > 1 ? 1 : 0.3) : (e.sprint && e.speedNow > 1 ? 1 : 0);
      rate += noisy * 0.01 * (1 + (e.y - 200) / 400);               // engines, thrashing
      if ((e.inSub ? g.sub.lightsOn : e.lampOn) && e.y > 300) rate += 0.006; // light
    } else rate -= e.y < SAFE_DEPTH ? 0.012 : 0.006;                 // quiet water calms it
    if (d < per) rate += 0.35;                                       // it has noticed him
    this.attn = clamp(this.attn + rate * dt, 0, 1);
    if (this.attn >= 1) this.mark(g);
  }

  update(g, dt) {
    const e = g.earl;
    const d = dist(this.x, this.y, e.x, e.y);
    this.dist = d;
    const prot = g.protection; // {x,y} or null
    const per = this.perception(g);
    this.attend(g, dt, d, per);
    const [bandLo, bandHi] = this.band(g);
    const floorY = this.world ? this.world.floorAt(clamp(this.x, 0, 1000)) - 10 : 2900;

    let tx = this.x, ty = this.y, speed = ENTITY_SPEED * 0.35;

    if (!this.marked) {
      // ---------- roaming its range, not hunting ----------
      this.roamT -= dt;
      if (this.roamT <= 0 || dist(this.x, this.y, this.roamX, this.roamY) < 15) {
        this.roamT = this.rng.range(40, 90);
        this.roamX = this.rng.range(20, 980);
        this.roamY = this.rng.range(bandLo, bandHi);
      }
      const fl = this.world ? this.world.floorAt(clamp(this.roamX, 0, 1000)) - 15 : 2900;
      tx = this.roamX; ty = Math.min(this.roamY, fl);
      // the band moves with the day: drift with it
      if (this.y < bandLo - 30 || this.y > bandHi + 30) ty = clamp(this.y, bandLo, Math.min(bandHi, fl));
      speed = ENTITY_SPEED * (Math.abs(this.y - ty) > 200 ? 0.6 : 0.3);
      this.state = 'roam';
    } else {
      // ---------- marked: the hunt ----------
      const lured = this.lureT > 0;
      if (d < per && !prot && (!lured || d < 8) && e.y > SAFE_DEPTH - 20) {
        this.lastX = e.x; this.lastY = e.y; this.knows = Math.min(1, this.knows + dt * 2);
        if (!lured) this.state = 'hunt';
      } else this.knows = Math.max(0, this.knows - dt * 0.15);

      // the sense: every so often a vague fix on him, so it always comes back
      this.senseT -= dt;
      if (this.senseT <= 0) {
        this.senseT = this.rng.range(22, 40);
        if (this.state === 'drift' || this.state === 'search' || this.state === 'roam') {
          const err = clamp(d * 0.12, 8, 70);
          this.lastX = e.x + this.rng.range(-err, err);
          this.lastY = e.y + this.rng.range(-err, err);
          this.state = 'search'; this.searchT = 0;
        }
      }

      tx = this.lastX; ty = this.lastY; speed = ENTITY_SPEED;
      if (this.lureT > 0) {
        this.lureT -= dt;
        this.state = 'lured';
        tx = this.lure.x; ty = this.lure.y; speed = ENTITY_SPEED * 0.9;
        if (this.lureT <= 0) { this.state = 'search'; this.lastX = this.lure.x; this.lastY = this.lure.y; this.searchT = 0; this.lure = null; }
      } else if (prot && d < 70) {
        // it will not come near: retreat and circle at a distance, waiting
        this.state = 'repelled';
        const ang = Math.atan2(this.y - prot.y, this.x - prot.x) + dt * 0.15;
        tx = prot.x + Math.cos(ang) * 55; ty = prot.y + Math.sin(ang) * 55;
        speed = d < 25 ? ENTITY_SPEED * 1.6 : ENTITY_SPEED * 0.5;
        this.repelT = 4;
      } else if (this.state === 'repelled') {
        this.repelT -= dt;
        if (this.repelT <= 0) { this.state = 'search'; this.searchT = 0; }
        tx = this.x; ty = this.y; speed = 0.5;
      } else if (this.state === 'hunt') {
        if (d < per) { tx = e.x; ty = e.y; }
        else if (dist(this.x, this.y, this.lastX, this.lastY) < 6) { this.state = 'search'; this.searchT = 0; }
      }
      if (this.state === 'search') {
        this.searchT += dt;
        const a = this.searchT * 0.35 + this.heading;
        const r = 12 + Math.min(40, this.searchT * 1.5);
        tx = this.lastX + Math.cos(a) * r; ty = this.lastY + Math.sin(a * 1.3) * r * 0.6;
        speed = ENTITY_SPEED * 0.5;
        if (this.searchT > 26) this.state = 'drift';
      } else if (this.state === 'drift') speed = ENTITY_SPEED * 0.55;
      // far away it closes the distance quickly; it only slows to a creep once it is near
      const far = dist(this.x, this.y, this.lastX, this.lastY);
      if ((this.state === 'search' || this.state === 'drift') && far > 140) speed = ENTITY_SPEED * (far > 400 ? 1.3 : 0.85);
      // how high it will come: up toward 120 m only in a live chase, otherwise it keeps below 200 m
      const chasing = this.state === 'hunt' || this.state === 'lured';
      ty = Math.max(ty, chasing ? SAFE_DEPTH + 2 : REST_CEILING + 10);
    }

    // ---------- move (it passes through rock: it is not of the water) ----------
    ty = Math.min(ty, floorY);
    let dx = tx - this.x, dy = ty - this.y;
    const dl = Math.hypot(dx, dy) || 1;
    const want = Math.min(speed, dl * 1.2);
    let tvx = (dx / dl) * want, tvy = (dy / dl) * want;
    // rising into shallower water it slows down: no sharp ceiling, a growing reluctance
    if (tvy < 0 && this.y < 170) tvy *= clamp((this.y - SAFE_DEPTH) / 50, 0.12, 1);
    const k = 1 - Math.exp(-dt * 1.4);
    this.vx = lerp(this.vx, tvx, k); this.vy = lerp(this.vy, tvy, k);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y < SAFE_DEPTH) { this.y = lerp(this.y, SAFE_DEPTH, dt * 2); this.vy = Math.max(0, this.vy); }
    this.x = clamp(this.x, -40, 1040);
    if (Math.abs(this.vx) > 0.2) this.heading = Math.atan2(this.vy, this.vx);
    // it fades as it rises toward the light
    this.fade = clamp((this.y - SAFE_DEPTH + 10) / 70, 0.25, 1);

    // eyes: open when close
    this.eyeOpen = lerp(this.eyeOpen, d < 45 ? 1 : 0, dt * 0.8);
    this.blink -= dt;
    if (this.blink < -this.rng.range(3, 7)) this.blink = 0.18;

    return this.marked && d < 2.6 && !prot && e.y > SAFE_DEPTH - 4 ? 'caught' : null;
  }

  throwLure(x, y) { this.lure = { x, y }; this.lureT = 10; }
}

// "Dread" 0..1 from distance: begins at 200 m, heavy inside 50 m.
export function dreadFromDistance(d) {
  if (d > 200) return 0;
  if (d > 50) return (200 - d) / 150 * 0.55;
  return 0.55 + (50 - d) / 50 * 0.45;
}
