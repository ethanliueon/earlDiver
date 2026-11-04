// The entity. It hunts by sound and light, loses Earl when he hides,
// searches, and periodically gets a vague sense of where he is.
import { clamp, lerp, dist, TAU } from './util.js';
import { DIVE_SPEED } from './player.js';

export const ENTITY_SPEED = DIVE_SPEED * 1.5;
export const LANTERN_RADIUS = 3;

export class Entity {
  constructor(rng) {
    this.rng = rng;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.state = 'drift'; // drift | hunt | search | repelled | lured
    this.lastX = 500; this.lastY = 5; this.searchT = 0; this.senseT = 35;
    this.heading = 0; this.lureT = 0; this.lure = null;
    this.teleportArmed = true; this.repelT = 0;
    this.eyeOpen = 0; this.blink = 0; this.knows = 0;
  }

  // how far away the entity can perceive Earl right now
  perception(g) {
    const e = g.earl;
    if (e.inSub) {
      let r = 120 + (e.speedNow > 1 ? 120 : 0) + (e.sprint && e.speedNow > 1 ? 100 : 0);
      if (g.sub.lightsOn && g.ambient < 0.3) r += 60;
      return r;
    }
    const hidden = g.world.inKelp(e.x, e.y) || g.world.underLedge(e.x, e.y);
    const fast = e.sprint && e.speedNow > 1;
    if (hidden && !fast) return e.lampOn ? 14 : 6;
    let r = 45;
    if (e.speedNow > 2) r += 25;
    if (fast) r += 90;
    if (e.lampOn) r += 70;
    if (e.atSurface) r += 30; // splashing
    return r;
  }

  update(g, dt) {
    const e = g.earl;
    const d = dist(this.x, this.y, e.x, e.y);
    this.dist = d;

    // --- punishment for diving too deep without the sub ---
    if (!e.inSub && e.y > 500) {
      if (this.teleportArmed) {
        this.teleportArmed = false;
        this.x = e.x; this.y = e.y + 500; // straight below - inside the rock if need be
        this.state = 'hunt'; this.lastX = e.x; this.lastY = e.y; this.knows = 1;
        g.events.push('teleport');
      }
    } else if (e.y < 480 || e.inSub) this.teleportArmed = true;

    // --- protection: lanterns / necklace ---
    const prot = g.protection; // {x,y} or null
    // --- perception ---
    const per = this.perception(g);
    const lured = this.lureT > 0;
    if (d < per && !prot && (!lured || d < 8)) {
      this.lastX = e.x; this.lastY = e.y; this.knows = Math.min(1, this.knows + dt * 2);
      if (!lured) this.state = 'hunt';
    } else this.knows = Math.max(0, this.knows - dt * 0.15);

    // the sense: every so often a vague fix on Earl, so it always comes back
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT = this.rng.range(22, 40);
      if (this.state === 'drift' || this.state === 'search') {
        const err = clamp(d * 0.12, 8, 70);
        this.lastX = e.x + this.rng.range(-err, err);
        this.lastY = Math.max(5, e.y + this.rng.range(-err, err));
        this.state = 'search'; this.searchT = 0;
      }
    }

    let tx = this.lastX, ty = this.lastY, speed = ENTITY_SPEED;
    if (this.lureT > 0) {
      this.lureT -= dt;
      this.state = 'lured';
      tx = this.lure.x; ty = this.lure.y; speed = ENTITY_SPEED * 0.9;
      if (this.lureT <= 0) { this.state = 'search'; this.lastX = this.lure.x; this.lastY = this.lure.y; this.searchT = 0; this.lure = null; }
    } else if (prot && d < 70) {
      // it will not come near: retreat and circle at a distance, waiting
      this.state = 'repelled';
      const ang = Math.atan2(this.y - prot.y, this.x - prot.x) + dt * 0.15;
      const want = 55;
      tx = prot.x + Math.cos(ang) * want; ty = Math.max(4, prot.y + Math.sin(ang) * want);
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
      tx = this.lastX + Math.cos(a) * r; ty = Math.max(3, this.lastY + Math.sin(a * 1.3) * r * 0.6);
      speed = ENTITY_SPEED * 0.5;
      if (this.searchT > 26) { this.state = 'drift'; }
    } else if (this.state === 'drift') {
      // slow wander toward the last idea it had
      speed = ENTITY_SPEED * 0.35;
    }
    // move (it passes through rock: it is not of the water)
    let dx = tx - this.x, dy = ty - this.y;
    const dl = Math.hypot(dx, dy) || 1;
    const want = Math.min(speed, dl * 1.2);
    const tvx = (dx / dl) * want, tvy = (dy / dl) * want;
    const k = 1 - Math.exp(-dt * 1.4);
    this.vx = lerp(this.vx, tvx, k); this.vy = lerp(this.vy, tvy, k);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y < 2) this.y = 2;
    this.x = clamp(this.x, -40, 1040);
    if (Math.abs(this.vx) > 0.2) this.heading = Math.atan2(this.vy, this.vx);

    // eyes: open when close and in darkness
    const wantEyes = d < 45 ? 1 : 0;
    this.eyeOpen = lerp(this.eyeOpen, wantEyes, dt * 0.8);
    this.blink -= dt;
    if (this.blink < -this.rng.range(3, 7)) this.blink = 0.18;

    return d < 2.6 && !prot ? 'caught' : null;
  }

  throwLure(x, y) { this.lure = { x, y }; this.lureT = 10; }
}

// "Dread" 0..1 from distance: begins at 200 m, heavy inside 50 m.
export function dreadFromDistance(d) {
  if (d > 200) return 0;
  if (d > 50) return (200 - d) / 150 * 0.55;
  return 0.55 + (50 - d) / 50 * 0.45;
}
