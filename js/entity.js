// The entity.
//
// It lives in the deep: 2,200-4,000 m by day (the trench and the plain), rising to 900-2,800 m at night. It is not hunting Earl
// at the start of a run; it roams its range. A hidden attention meter fills when Earl disturbs the
// deep (being below 200 m, noise and light down there, taking things from its domain, coming near
// it). When the meter fills, Earl is MARKED and it hunts him: by sound and light, losing him when
// he hides, searching, and getting a vague fix on him every so often. While hunting it can push up
// toward ~120 m (slowing and fading as it rises - no hard line); otherwise it stays below ~200 m.
// Staying shallow long enough makes it lose interest, and the mark fades.
import { clamp, lerp, dist, TAU } from './util.js';
export const ENTITY_SPEED = 12; // m/s: its travelling speed, far faster than Earl, and than the sub
export const ENTITY_BURST = 15; // m/s: a burst, only once it is in sight of him and only if he is getting away
export const LANTERN_RADIUS = 3;
export const SAFE_DEPTH = 120;   // above this it can never reach Earl
export const REST_CEILING = 200; // when not chasing it keeps below this
const FORGET_TIME = 180;         // seconds above SAFE_DEPTH before a mark fades on its own
export const CALM_NEEDED = 60;   // about a minute of good deeds lifts a mark
export const GRACE_TIME = 180;
export const GLARE_TIME = 6;     // seconds its eyes take to come up after it has seen him, before it comes   // after an offering (or a deed that pleases it) it will not notice him for three minutes

export class Entity {
  constructor(rng, world) {
    this.rng = rng;
    this.world = world;
    this.x = rng.range(80, 500); this.y = rng.range(2600, 3400);
    this.vx = 0; this.vy = 0;
    this.state = 'roam'; // roam | hunt | search | drift | lured | away
    this.awayT = 0; this.awayX = 0; this.awayY = 0;
    this.lastX = 500; this.lastY = 5; this.searchT = 0; this.senseT = 12;
    this.heading = 0; this.lureT = 0; this.lure = null; this.repelT = 0;
    this.eyeOpen = 0; this.blink = 0; this.knows = 0;
    this.marked = false; this.attn = 0; this.shallowT = 0; this.fade = 1;
    this.roamX = this.x; this.roamY = this.y; this.roamT = 0;
    this.deepMarkArmed = true;
    this.graceT = 0; // pleased: for this long nothing he does draws its attention
    // its own light (drawn in monster_draw.js): body 0..1, eye 0..1, the blue flash 0..1, and how far
    // its red has crept into the water round him (tint 0..1)
    this.lit = { mode: 'pulse', t: 0, body: 1, eye: 0.3, flash: 0, tint: 0, cool: 0 };
  }

  // Is a lamp on it? Earl's lamp (where he aims it) or the sub's lights, on its head.
  litBy(g) {
    const e = g.earl;
    let s = null;
    if (e.inSub) { const cy = Math.cos(g.sub.yaw ?? 0); if (g.sub.lightsOn && !g.sub.imploded && Math.abs(cy) > 0.3) { const f = cy >= 0 ? 1 : -1; s = { x: g.sub.x + f * 2, y: g.sub.y, a: f > 0 ? 0 : Math.PI, range: 55, cone: 0.5 }; } } // the beams point the way the hull is turned
    else if (e.lampOn) s = { x: e.x, y: e.y, a: g.aim ?? (e.facing > 0 ? 0 : Math.PI), range: 40, cone: 0.42 };
    if (!s) return false;
    const back = (this.face ?? 1) >= 0 ? -1 : 1; // the way its body runs from the snout
    const V = g.viewBox, ex = this.x + back * 2.6, ey = this.y - 1.6; // its eye
    if (V && (ex < V[0] + 1 || ex > V[1] - 1 || ey < V[2] + 1 || ey > V[3] - 1)) return false; // only where he can see it go dark
    for (const [px, py] of [[this.x, this.y], [this.x + back * 6, this.y - 1], [this.x + back * 14, this.y]]) {
      const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx, dy);
      if (d > s.range) continue;
      let da = Math.atan2(dy, dx) - s.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < s.cone) return true;
    }
    return false;
  }
  // Its lights. Roaming, they stutter fast and unevenly along its whole length, the eyes with them.
  // Caught in a lamp: every light goes out; a second of black; one blue flash, all over it (it has seen
  // him); black again; then only the eyes, coming up slowly, while its red creeps into the water round
  // him, until it strikes. Hunting, it keeps its body dark and its eyes on him.
  lights(g, dt) {
    const L = this.lit, H = this.hunt;
    L.t += dt; L.cool = Math.max(0, L.cool - dt);
    let body = 1, eye = 0.3, flash = 0, tint = 0, snap = false;
    if (g.kill) { body = 0; eye = 1; tint = 1; L.mode = 'pulse'; }
    else if (L.mode === 'pulse') {
      if (H) { body = 0; eye = H.phase === 'windup' || H.phase === 'strike' ? 1 : H.phase === 'stare' ? 0.9 : 0.55; tint = H.phase === 'windup' || H.phase === 'strike' ? 1 : 0.35; }
      if (L.cool <= 0 && !g.kill && this.dist < 60 && this.graceT <= 0 && !(H && H.phase !== 'stalk') && this.litBy(g)) { L.mode = 'dark'; L.t = 0; g.events.push('lit'); }
    }
    if (L.mode === 'dark') { body = 0; eye = 0; snap = true; if (L.t > 0.9) { L.mode = 'flash'; L.t = 0; this.seen(g); } }
    else if (L.mode === 'flash') { body = 0; eye = 0; snap = true; flash = Math.max(0, 1 - L.t / 0.3); if (L.t > 0.3) { L.mode = 'dark2'; L.t = 0; } }
    else if (L.mode === 'dark2') { body = 0; eye = 0; snap = true; if (L.t > 0.8) { L.mode = 'glare'; L.t = 0; } }
    else if (L.mode === 'glare') {
      body = 0;
      if (H && (H.phase === 'windup' || H.phase === 'strike')) { eye = 1; tint = 1; }
      else if (H && H.phase === 'glare') { eye = 0.12 + 0.88 * clamp(H.t / GLARE_TIME, 0, 1); tint = eye; }
      else { L.mode = 'fade'; L.t = 0; }
    } else if (L.mode === 'fade') { body = 0; eye = 0; if (L.t > 3) { L.mode = 'pulse'; L.t = 0; L.cool = 20; } }
    const k = (r) => 1 - Math.exp(-dt * r);
    L.body += (body - L.body) * (snap || body < L.body ? k(30) : k(1.5));   // out at once; back slowly
    L.eye += (eye - L.eye) * (snap ? k(30) : L.mode === 'glare' ? 1 : k(3));
    L.flash = flash;
    L.tint += (tint - L.tint) * k(tint > L.tint ? 2 : 0.6);
  }
  // the blue flash: it has seen him. Marked, and it hangs off in the dark looking at him.
  seen(g) {
    const e = g.earl;
    if (!this.marked) this.mark(g);
    this.state = 'hunt'; this.lastX = e.x; this.lastY = e.y; this.knows = 1;
    this.hunt = { phase: 'glare', t: 0, ang: Math.atan2(this.y - e.y, this.x - e.x), passes: 1, still: 0, run: 0, dir: this.rng() < 0.5 ? -1 : 1 };
  }

  // its home range right now (night lifts it toward the surface)
  band(g) {
    const n = clamp(1 - g.day.light, 0, 1); // 0 day .. 1 night
    return [lerp(2200, 900, n), lerp(4000, 2800, n)]; // day: the trench and the plain; night: it rises
  }

  // add to the attention meter (amount is a fraction of a full mark)
  // good deeds for the ocean: they calm it. Marked: build toward lifting the mark.
  // Not marked: they lower its attention.
  appease(g, amount) {
    if (this.marked) {
      this.calm = (this.calm || 0) + amount;
      if (this.calm >= CALM_NEEDED) { this.marked = false; this.calm = 0; this.attn = 0.2; this.state = 'roam'; this.graceT = GRACE_TIME; g.events.push('appeased'); }
    } else { this.attn = Math.max(0, this.attn - amount / 100); this.graceT = Math.max(this.graceT, GRACE_TIME); }
  }
  // an offering to the deep: whatever it wanted, it is satisfied. The hunt ends, and for three
  // minutes it does not look for him at all.
  soothe(g) {
    const was = this.marked;
    this.marked = false; this.calm = 0; this.attn = 0; this.graceT = GRACE_TIME;
    if (was) { this.state = 'roam'; g.events.push('appeased'); }
  }
  disturb(g, amount) {
    if (this.marked || this.graceT > 0) return;
    this.attn = Math.min(1, this.attn + amount);
    if (this.attn >= 1) this.mark(g);
  }
  mark(g) {
    if (this.marked) return;
    this.marked = true; this.attn = 1; this.shallowT = 0; this.calm = 0;
    this.lastX = g.earl.x; this.lastY = g.earl.y;
    this.state = 'search'; this.searchT = 0; this.senseT = this.rng.range(6, 12);
    g.events.push('marked');
  }

  // how far away the entity can perceive Earl right now
  perception(g) {
    const e = g.earl;
    g.concealed = false;
    if (e.inSub) {
      const q = g.addons && g.addons.quiet ? 0.5 : 1;
      let r = 120 + ((e.speedNow > 1 ? 120 : 0) + (e.sprint && e.speedNow > 1 ? 100 : 0)) * q;
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
    if (e.suitQuiet) r *= 0.7; // no bubbles: much less to hear
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
    // pleased: for a while it pays him no mind (whatever traps, lamps, engines or welding arcs say)
    if (this.graceT > 0) {
      this.graceT = Math.max(0, this.graceT - dt);
      this.attn = Math.max(0, Math.min(this.attn, 0.5) - dt * 0.004);
      return;
    }
    // going below 500 m without the submersible marks him outright
    if (!e.inSub && e.y > 500) { if (this.deepMarkArmed) { this.deepMarkArmed = false; this.mark(g); } return; }
    if (e.y < 480 || e.inSub) this.deepMarkArmed = true;
    let rate = 0;
    if (e.y > 200) {
      rate += 0.002 + 0.002 * (e.y - 200) / 100;                    // just being down here
      let noisy = e.inSub ? (e.speedNow > 1 ? 1 : 0.3) : (e.sprint && e.speedNow > 1 ? 1 : 0);
      if (e.inSub && g.addons && g.addons.quiet) noisy *= 0.5;
      rate += noisy * 0.01 * (1 + (e.y - 200) / 400);               // engines, thrashing
      if ((e.inSub ? g.sub.lightsOn : e.lampOn) && e.y > 300) rate += 0.006; // light
    } else rate -= e.y < SAFE_DEPTH ? 0.012 : 0.006;                 // quiet water calms it
    // the empty sub driving itself in the deep: engine noise travels
    const ap = g.autopilot;
    if (ap && ap.active && !e.inSub && g.sub.y > 200 && ap.speed > 0.5) rate += 0.008 * (1 + (g.sub.y - 200) / 400) * (g.addons && g.addons.quiet ? 0.5 : 1);
    if (d < per) rate += 0.35;                                       // it has noticed him
    if (rate > 0) rate *= (g.stillMul || 1) * (g.blessed ? 0.5 : 1); // still water, or her blessing: it is slow to notice
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
    const floorY = this.world ? this.world.floorAt(clamp(this.x, 0, 3000)) - 10 : 3900;

    let tx = this.x, ty = this.y, speed = ENTITY_SPEED * 0.35;

    if (!this.marked) {
      // ---------- roaming its range, not hunting ----------
      this.roamT -= dt;
      if (this.roamT <= 0 || dist(this.x, this.y, this.roamX, this.roamY) < 15) {
        this.roamT = this.rng.range(40, 90);
        this.roamX = this.rng.range(20, 2980);
        this.roamY = this.rng.range(bandLo, bandHi);
      }
      const fl = this.world ? this.world.floorAt(clamp(this.roamX, 0, 3000)) - 15 : 3900;
      tx = this.roamX; ty = Math.min(this.roamY, fl);
      // the band moves with the day: drift with it
      if (this.y < bandLo - 30 || this.y > bandHi + 30) ty = clamp(this.y, bandLo, Math.min(bandHi, fl));
      speed = ENTITY_SPEED * (Math.abs(this.y - ty) > 200 ? 0.6 : 0.3);
      this.state = 'roam';
    } else {
      // ---------- marked: the hunt ----------
      const lured = this.lureT > 0;
      const away = this.awayT > 0;
      if (d < per && !prot && !away && (!lured || d < 8) && e.y > SAFE_DEPTH - 20) {
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
        // the lure burns out: it has lost him, and wanders off a long way before it looks again
        if (this.lureT <= 0) { this.goAway(this.lure.x, this.lure.y, bandLo); this.lure = null; }
      } else if (away) {
        // gone off: it does not wait outside a safe place for him, it leaves for a while
        this.awayT -= dt;
        this.state = 'away';
        tx = this.awayX; ty = this.awayY; speed = ENTITY_SPEED * 0.8;
        if (this.awayT <= 0) { this.state = 'drift'; this.senseT = this.rng.range(20, 40); }
      } else if (prot && d < 70) {
        // it will not come near a lantern, the necklace or the old one's cave: it turns and goes
        this.goAway(prot.x, prot.y, bandLo);
        tx = this.awayX; ty = this.awayY; speed = ENTITY_SPEED * 0.8;
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
      if ((this.state === 'search' || this.state === 'drift') && far > 140) speed = ENTITY_SPEED * (far > 400 ? 1 : 0.85);
      // ---------- close in: it stalks, makes one pass, draws back and strikes ----------
      // Every step has its warning, so a death can always be seen coming. Keep still and dark and it
      // may lose him (or, at the sub, come and look in through the viewport, and then leave); run,
      // or light up while it is looking, and it comes.
      if (!this.hunt || this.hunt.phase !== 'stare') this.faceLock = null;
      if (this.state !== 'hunt') this.hunt = null;
      else if (d < 75) {
        const H = this.hunt || (this.hunt = { phase: 'stalk', t: 0, ang: Math.atan2(this.y - e.y, this.x - e.x), passes: 0, still: 0, run: 0, dir: this.rng() < 0.5 ? -1 : 1 });
        H.t += dt;
        const dark = e.inSub ? !g.sub.lightsOn : !e.lampOn, still = (e.speedNow || 0) < 0.4;
        H.still = still && dark ? H.still + dt : 0;
        H.run = (e.speedNow || 0) > 2.5 ? H.run + dt : Math.max(0, H.run - dt);
        const R = e.inSub ? 26 : 18;
        if (H.phase === 'stalk') {
          // circling at the edge of his light, slow; seen only in pieces
          H.ang += H.dir * dt * 2.4 / R;
          tx = e.x + Math.cos(H.ang) * R; ty = e.y + Math.sin(H.ang) * R * 0.55;
          speed = d > R + 15 ? ENTITY_SPEED * 0.6 : 3;
          if (e.inSub && H.still > 2.5) { H.phase = 'stare'; H.t = 0; H.stareT = 0; g.events.push('stare'); }
          else if (!e.inSub && H.still > 8) { this.goAway(e.x, e.y, bandLo); this.hunt = null; g.events.push('lost'); }
          else if (H.run > 2) { H.phase = 'windup'; H.t = 0; g.events.push('windup'); } // he bolts: prey that runs is chased
          else if (H.t > (H.passes ? 5 : 8) * (still && dark ? 1.8 : 1)) {
            H.t = 0;
            if (H.passes < 1) {
              const side = Math.sign(this.x - e.x) || 1;
              H.px = e.x - side * 30; H.py = e.y + (e.inSub ? 7 : 5) * (this.rng() < 0.5 ? -1 : 1);
              H.phase = 'pass'; H.passed = false;
            } else { H.phase = 'windup'; g.events.push('windup'); }
          }
        } else if (H.phase === 'glare') {
          // seen: it hangs off in the dark, facing him, its eyes coming up. Go dark and still, or hide,
          // and it may lose him; run and it comes at once.
          const V = g.viewBox, half = V ? Math.min(V[1] - V[0], (V[3] - V[2]) * 1.6) / 2 : 20;
          const ux = (this.x - e.x) / (d || 1), uy = (this.y - e.y) / (d || 1), hold = clamp(half - 5, 7, e.inSub ? 17 : 12); // at the edge of what he can see
          tx = e.x + ux * hold; ty = e.y + uy * hold * 0.6; speed = 2.5;
          if (H.still > 3.5 || g.concealed) { this.goAway(e.x, e.y, bandLo); this.hunt = null; g.events.push('lost'); }
          else if (H.run > 2.5 || H.t > GLARE_TIME) { H.phase = 'windup'; H.t = 0; g.events.push('windup'); }
        } else if (H.phase === 'pass') {
          // it sweeps past him, close, and does not strike
          tx = H.px; ty = H.py; speed = 9;
          if (!H.passed && Math.abs(this.x - e.x) < 4) { H.passed = true; g.events.push('pass'); }
          if (dist(this.x, this.y, tx, ty) < 6 || H.t > 9) { H.phase = 'stalk'; H.t = 0; H.passes++; H.ang = Math.atan2(this.y - e.y, this.x - e.x); }
        } else if (H.phase === 'windup') {
          // the warning: it draws back, a second, then comes
          const ux = (this.x - e.x) / (d || 1), uy = (this.y - e.y) / (d || 1);
          tx = this.x + ux * 6; ty = this.y + uy * 6; speed = 3;
          if (H.t > 1.1) { H.phase = 'strike'; H.t = 0; g.events.push('strike'); }
        } else if (H.phase === 'strike') {
          // the strike: at travelling speed, bursting to 15 m/s only when it is on screen and he is fleeing
          tx = e.x; ty = e.y; speed = d < 30 && (e.speedNow || 0) > 1.5 ? ENTITY_BURST : ENTITY_SPEED;
          if (d < 7) { this.hunt = null; this.grab = true; }
          else if (H.t > 6) { H.phase = 'stalk'; H.t = 0; }
        } else if (H.phase === 'stare') {
          // it comes to the viewport and looks in. Still and dark, and it leaves; otherwise it comes.
          // its eye (2.6 m behind the snout, 1.6 m up) brought to the sphere's viewport, looking in
          if (!H.s0) H.s0 = Math.sign(this.x - e.x) || 1;
          this.faceLock = -H.s0;
          const portX = g.sub.x + (g.sub.facing || 1) * 1.2, portY = g.sub.y + 0.7;
          tx = portX + H.s0 * 0.4 - H.s0 * 2.6; ty = portY + 1.6;
          const off = dist(this.x, this.y, tx, ty);
          speed = off > 4 ? 7 : 1.5; // it comes in fast through the dark, and the last few metres slowly
          H.near = off < 2.5;
          if (H.near) H.stareT += dt; // the long look starts when its face is at the glass
          if (!(still && dark)) { H.phase = 'windup'; H.t = 0.6; g.events.push('windup'); }
          else if (H.stareT > 8) {
            this.marked = false; this.calm = 0; this.attn = 0.3; this.hunt = null; this.faceLock = null;
            this.goAway(e.x, e.y, bandLo); this.roamX = this.awayX; this.roamY = this.awayY; this.roamT = 90;
            g.events.push('unmarked');
          }
        }
      }
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
    this.x = clamp(this.x, -40, 3040);
    if (Math.abs(this.vx) > 0.2) this.heading = Math.atan2(this.vy, this.vx);
    // it fades as it rises toward the light
    this.fade = clamp((this.y - SAFE_DEPTH + 10) / 70, 0.25, 1);

    // eyes: open when close
    this.eyeOpen = lerp(this.eyeOpen, d < 45 ? 1 : 0, dt * 0.8);
    this.blink -= dt;
    if (this.blink < -this.rng.range(3, 7)) this.blink = 0.18;

    this.lights(g, dt);
    // the strike reached him: the grab (see main.js: the arm, then the jaws)
    if (this.grab) { this.grab = false; if (this.marked && !prot && e.y > SAFE_DEPTH - 4) return 'grab'; }
    return null;
  }

  // give up on him for a while: head far off, away from (fx, fy), and deeper
  goAway(fx, fy, bandLo) {
    const side = Math.sign(this.x - fx) || (this.rng() < 0.5 ? -1 : 1);
    let ax = this.x + side * this.rng.range(350, 500);
    if (ax < 20 || ax > 2980) ax = this.x - side * this.rng.range(350, 500);
    ax = clamp(ax, 20, 2980);
    const fl = this.world ? this.world.floorAt(ax) - 15 : 3900;
    this.awayX = ax; this.awayY = Math.min(fl, Math.max(bandLo, this.y, fy) + this.rng.range(150, 350));
    this.awayT = this.rng.range(90, 150);
    this.state = 'away'; this.knows = 0; this.searchT = 0;
  }

  throwLure(x, y, T = 10) { this.lure = { x, y }; this.lureT = T; }
}

// "Dread" 0..1 from distance: begins at 200 m, heavy inside 50 m.
export function dreadFromDistance(d) {
  if (d > 200) return 0;
  if (d > 50) return (200 - d) / 150 * 0.55;
  return 0.55 + (50 - d) / 50 * 0.45;
}
