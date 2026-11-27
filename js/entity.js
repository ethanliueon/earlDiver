// The entity.
//
// It lives in the deep: 2,200-4,000 m by day (the trench and the plain), rising to 900-2,800 m at night. It is not hunting Earl
// at the start of a run; it roams its range. A hidden attention meter fills when Earl disturbs the
// deep (being below 200 m, noise and light down there, taking things from its domain, coming near
// it). When the meter fills, Earl is MARKED and it hunts him: by sound and light, losing him when
// he hides, searching, and getting a vague fix on him every so often. While hunting it can push up
// toward ~120 m (slowing and fading as it rises - no hard line); otherwise it stays below ~200 m.
// Staying shallow long enough makes it lose interest, and the mark fades.
import { clamp, lerp, dist } from './util.js';
import { MONSTER_LEN, MONSTER_EYE } from './monster_draw.js';
export const ENTITY_SPEED = 12; // m/s: its travelling speed, far faster than Earl, and than the sub
export const ENTITY_BURST = 15; // m/s: a burst, only once it is in sight of him and only if he is getting away
// every speed above and in the approaches below is scaled by this at the moment it moves (the owner
// asked for it 0.6x as fast as v1.30: 7.2 m/s travelling, a 9 m/s burst)
export const ENTITY_PACE = 0.6;
export const LANTERN_RADIUS = 3;
export const FLEE_SPEED = 20; // (7.7.3, owner) m/s, driven off by the Warden: not scaled by its pace
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
    // a new place every run: anywhere across the ocean, between 1,500 and 3,500 m, in open water
    this.x = rng.range(60, 4900); this.y = rng.range(1500, 3500);
    if (world) for (let k = 0; k < 60; k++) {
      const x = rng.range(60, 4900), y = rng.range(1500, 3500);
      if (world.floorAt(x) - y > 40) { this.x = x; this.y = y; break; }
    }
    this.teleported = false; // it may close the distance once a run (see closeIn)
    this.vx = 0; this.vy = 0;
    this.state = 'roam'; // roam | hunt | search | drift | away
    this.awayT = 0; this.awayX = 0; this.awayY = 0;
    this.lastX = 500; this.lastY = 5; this.searchT = 0; this.senseT = 12;
    this.heading = 0; this.repelT = 0;
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
    const V = g.viewBox, ex = this.x + back * MONSTER_EYE[0] * MONSTER_LEN, ey = this.y + MONSTER_EYE[1] * MONSTER_LEN; // its eye
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
      if (H) { body = H.phase === 'stalk' ? 0.35 : 0; /* (7.2.2) while it circles, a few of its slits drift past in the dark */ eye = H.phase === 'windup' || H.phase === 'strike' ? 1 : H.phase === 'stare' ? 0.9 : 0.55; tint = H.phase === 'windup' || H.phase === 'strike' ? 1 : 0.35; }
      if (L.cool <= 0 && !g.kill && this.dist < 60 && this.graceT <= 0 && !(H && H.phase !== 'stalk') && !(this.ap && this.ap.phase && this.ap.phase !== 'look') && this.litBy(g)) { L.mode = 'dark'; L.t = 0; g.events.push('lit'); }
    }
    if (L.mode === 'dark') { body = 0; eye = 0; snap = true; if (L.t > 0.9) { L.mode = 'flash'; L.t = 0; this.seen(g); } }
    else if (L.mode === 'flash') { body = 0; eye = 0; snap = true; flash = Math.max(0, 1 - L.t / 0.3); if (L.t > 0.3) { L.mode = 'dark2'; L.t = 0; } }
    else if (L.mode === 'dark2') { body = 0; eye = 0; snap = true; if (L.t > 0.8) { L.mode = 'glare'; L.t = 0; } }
    else if (L.mode === 'glare') {
      body = 0;
      if (H && (H.phase === 'windup' || H.phase === 'strike')) { eye = 1; tint = 1; }
      else if (H && H.phase === 'glare') { eye = 0.12 + 0.88 * clamp(H.t / GLARE_TIME, 0, 1); tint = eye; }
      else if (this.ap && this.ap.phase === 'stare2') { eye = 0.12 + 0.88 * clamp(this.ap.t / GLARE_TIME, 0, 1); tint = eye; }
      else if (this.ap && this.ap.n === 2 && this.marked && g.earl.inSub) { eye = 1; tint = 0.85; } // it is coming back for him
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
    if (e.inSub) {
      const A = this.ap || (this.ap = { n: 0, phase: null, t: 0, wait: 0, side: 1, still: 0 });
      A.phase = 'stare2'; A.t = 0; A.side = Math.sign(this.x - e.x) || 1; A.n = Math.max(A.n, 1); A.wait = 0;
      this.state = 'hunt'; this.lastX = e.x; this.lastY = e.y; this.knows = 1; if (!this.darkTried) g.events.push('glare');
      return;
    }
    this.state = 'hunt'; this.lastX = e.x; this.lastY = e.y; this.knows = 1;
    this.hunt = { phase: 'glare', t: 0, ang: Math.atan2(this.y - e.y, this.x - e.x), passes: 1, still: 0, run: 0, dir: this.rng() < 0.5 ? -1 : 1 }; if (!this.darkTried) g.events.push('glare'); // (5.16.0) so the way out can be said, once
  }

  // Once a run, when Earl is down in its water (below 100 m) and it is far off, it is suddenly 500 m
  // nearer: only if that still leaves it more than 1,000 m away, and never into rock or above 100 m.
  closeIn(g) {
    if (this.teleported || this.marked || g.earl.y < 100) return false;
    const dx = g.earl.x - this.x, dy = g.earl.y - this.y, d = Math.hypot(dx, dy);
    if (d - 500 <= 1000) return false;
    let x = clamp(this.x + dx / d * 500, 20, 4980), y = this.y + dy / d * 500;
    if (this.world) y = Math.min(y, this.world.floorAt(x) - 25);
    y = Math.max(150, y);
    if (this.world && this.world.rockAt && this.world.rockAt(x, y, 10)) return false;
    this.x = x; this.y = y; this.vx = this.vy = 0; this.roamX = x; this.roamY = y; this.roamT = 0;
    this.teleported = true;
    return true;
  }

  // its home range right now (night lifts it toward the surface)
  band(g) {
    const n = clamp(1 - g.day.light, 0, 1); // 0 day .. 1 night
    return [lerp(1500, 900, n), lerp(3500, 2800, n)]; // day: 1,500-3,500 m, anywhere; night: it rises
  }

  // add to the attention meter (amount is a fraction of a full mark)
  // good deeds for the ocean: they calm it. Marked: build toward lifting the mark.
  // Not marked: they lower its attention.
  appease(g, amount) {
    if (this.marked) {
      this.calm = (this.calm || 0) + amount;
      if (this.calm >= CALM_NEEDED) { this.marked = false; this.ap = null; this.flick = 0; this.calm = 0; this.attn = 0.2; this.state = 'roam'; this.graceT = GRACE_TIME; g.events.push('appeased'); }
    } else { this.attn = Math.max(0, this.attn - amount / 100); this.graceT = Math.max(this.graceT, GRACE_TIME); }
  }
  // an offering to the deep: whatever it wanted, it is satisfied. The hunt ends, and for three
  // minutes it does not look for him at all.
  soothe(g) {
    const was = this.marked;
    this.marked = false; this.ap = null; this.flick = 0; this.calm = 0; this.attn = 0; this.graceT = GRACE_TIME;
    if (was) { this.state = 'roam'; g.events.push('appeased'); }
  }
  disturb(g, amount) {
    if (this.marked || this.graceT > 0) return;
    this.attn = Math.min(1, this.attn + amount);
    if (this.attn >= 1) this.mark(g);
  }
  mark(g) {
    if (this.marked) return;
    this.marked = true; this.attn = 1; this.shallowT = 0; this.calm = 0; this.darkTried = false; this.slip = null; // (5.16.0) a new hunt: going dark may be tried once more
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
      let r = 120 * (q < 1 ? 0.85 : 1); // (5.12.4) how fast she goes no longer carries: only her lights and how close she is
      if (g.sub.lightsOn && g.ambient < 0.3) r += 60;
      return r;
    }
    const hidden = g.world.inKelp(e.x, e.y) || g.world.underLedge(e.x, e.y);
    // (5.12.4) Earl's speed no longer matters to it, and a glow stick is not a light to it, however bright
    g.concealed = hidden && !e.lampOn;
    if (hidden) return e.lampOn ? 14 : 6;
    let r = 45;
    if (e.lampOn) r += 70;
    // (5.16.0) a Flare, Lighthouse or glow stick is not a light to it: only the lamp and the sub's floodlight
    if (e.suitQuiet) r *= 0.7; // no bubbles: much less to hear
    if (e.atSurface) r += 30; // splashing
    return r;
  }

  // the attention meter: what Earl is doing in the deep, every frame
  attend(g, dt, d, per) {
    const e = g.earl;
    const lit = e.inSub ? !!g.sub.lightsOn : !!e.lampOn; // (5.12.4) his light: the sub's floodlight in her, his lamp out of her; never a glow stick
    if (this.marked) {
      // (5.12.4) losing it in the dark: only when it is more than 1,000 m off and he has kept it dark for 30 s; then it
      // stops where it lost him and waits there (it does not go home). Nearer than that, nothing he does shakes it
      if (!lit && d > 1000) { this.darkT = (this.darkT || 0) + dt; if (this.darkT >= 30) { this.marked = false; this.ap = null; this.flick = 0; this.attn = 0.6; this.state = 'linger'; this.lingerT = 240; this.lingerX = this.x; this.lingerY = this.y; this.darkT = 0; g.events.push('unmarked'); return; } }
      else this.darkT = 0;
      // a mark fades if he stays above its reach long enough
      if (e.y < SAFE_DEPTH) { this.shallowT += dt; if (this.shallowT > FORGET_TIME) { this.marked = false; this.ap = null; this.flick = 0; this.attn = 0.35; this.state = 'roam'; g.events.push('unmarked'); } }
      else this.shallowT = 0;
      return;
    }
    // pleased: for a while it pays him no mind (whatever traps, lamps, engines or welding arcs say)
    if (this.graceT > 0) {
      this.graceT = Math.max(0, this.graceT - dt);
      this.attn = Math.max(0, Math.min(this.attn, 0.5) - dt * 0.004);
      return;
    }
    if (this.lingerT > 0) { this.lingerT -= dt; if (lit && e.y > 200) { this.lingerT = 0; this.mark(g); return; } } // (5.12.4) it was waiting: a light, and it is back on him
    // going below 500 m without the submersible marks him outright
    if (!e.inSub && e.y > 500) { if (this.deepMarkArmed) { this.deepMarkArmed = false; this.mark(g); } return; }
    if (e.y < 480 || e.inSub) this.deepMarkArmed = true;
    let rate = 0;
    if (e.y > 200) {
      rate += 0.002 + 0.002 * (e.y - 200) / 100;                    // just being down here
      // (5.12.4) no more noise from his speed (sprinting, the engine at full): it notices light, and him near it
      if ((e.inSub ? g.sub.lightsOn : e.lampOn) && e.y > 300) rate += 0.006; // light
    } else rate -= e.y < SAFE_DEPTH ? 0.012 : 0.006;                 // quiet water calms it
    // the empty sub driving itself in the deep: engine noise travels
    const ap = g.autopilot;
    if (ap && ap.active && !e.inSub && g.sub.y > 200 && ap.speed > 0.5) rate += 0.008 * (1 + (g.sub.y - 200) / 400) * (g.addons && g.addons.quiet ? 0.5 : 1);
    if (d < per) rate += 0.35;                                       // it has noticed him
    if (rate > 0) rate *= (g.stillMul || 1) * (g.blessed ? 0.5 : 1) * (e.legends && e.legends.has('faithless') ? 0.5 : 1) * (e.triesteSet ? 0.5 : 1); // still water, a blessing, Faithless, the Trieste set: it is slow to notice
    this.attn = clamp(this.attn + rate * dt, 0, 1);
    if (this.attn >= 1) this.mark(g);
  }

  update(g, dt) {
    // (5.9.0) Tidewarden: held still while the water turns, then gone far off for five minutes
    if (this.frozen) { this.dist = dist(this.x, this.y, g.earl.x, g.earl.y); return; }
    if (this.sleepT > 0) { this.sleepT -= dt; this.marked = false; this.dist = dist(this.x, this.y, g.earl.x, g.earl.y); this.fade = this.sleepT > 0 ? 0 : 1; return; }
    // (7.7.3, owner) driven off by the Warden (Tidewarden, Warden Heart): it turns and swims straight away at 20 m/s,
    // its mark on the radar gone blue, out past the radar's edge and a little further; then it roams as usual, and for
    // 30 s nothing he does draws it back
    if (this.flee) { const F = this.flee, e0 = g.earl; F.t += dt;
      if (F.ux == null) { const dx = this.x - e0.x, dy = this.y - e0.y, l = Math.hypot(dx, dy) || 1; F.ux = dx / l; F.uy = Math.max(0.25, dy / l); const l2 = Math.hypot(F.ux, F.uy); F.ux /= l2; F.uy /= l2; }
      const sp = Math.min(FLEE_SPEED, FLEE_SPEED * F.t / 0.8); this.vx = F.ux * sp; this.vy = F.uy * sp; this.x += this.vx * dt; this.y += this.vy * dt;
      const fl = this.world ? this.world.floorAt(clamp(this.x, 0, 5000)) - 15 : 3900; if (this.y > fl) { this.y = fl; F.uy = 0; F.ux = Math.sign(F.ux) || 1; }
      if (this.x < 20 || this.x > 4980) { this.x = clamp(this.x, 20, 4980); F.ux = 0; F.uy = 1; }
      this.heading = Math.atan2(this.vy, this.vx); this.marked = false; this.hunt = null; this.ap = null; this.slip = null; this.state = 'away'; this.attn = 0; this.fade = 1;
      this.dist = dist(this.x, this.y, e0.x, e0.y); this.tideBlue = 1;
      if (this.dist > 1100 && F.past == null) F.past = F.t;
      if (F.past != null && F.t - F.past > 4) { this.flee = null; this.tideBlue = 0; this.state = 'roam'; this.roamX = this.x; this.roamY = this.y; this.roamT = 0; this.graceT = Math.max(this.graceT || 0, 30); this.vx *= 0.3; this.vy *= 0.3; }
      return; }
    this.closeIn(g);
    const e = g.earl;
    const d = dist(this.x, this.y, e.x, e.y);
    this.dist = d;
    const prot = g.protection; // {x,y} or null
    const per = this.perception(g);
    this.attend(g, dt, d, per);
    const [bandLo, bandHi] = this.band(g);
    const floorY = this.world ? this.world.floorAt(clamp(this.x, 0, 5000)) - 10 : 3900;

    let tx = this.x, ty = this.y, speed = ENTITY_SPEED * 0.35;

    if (this.offRadarT > 0) this.offRadarT = Math.max(0, this.offRadarT - dt);
    if (this.marked && this.slip) {
      // (5.16.0) fooled by the dark: it turns and swims slowly off. For 15 s any light of his brings it straight back
      // (and the dark will not fool it again this hunt); after that the mark lifts, and it lingers out past the radar's
      // reach, a little deeper, for a minute and more, never far off
      const S = this.slip, lit = e.inSub ? !!g.sub.lightsOn : !!e.lampOn;
      S.t -= dt;
      if (lit) { this.slip = null; this.state = 'hunt'; this.lastX = e.x; this.lastY = e.y; this.knows = 1; g.events.push('turnsBack'); }
      else if (S.t <= 0) {
        this.slip = null; this.marked = false; this.ap = null; this.hunt = null; this.flick = 0; this.attn = 0.5; this.offRadarT = 60;
        this.lingerT = 90; this.lingerX = clamp(e.x + S.dir * 240, 20, 4980); this.lingerY = Math.max(e.y + 60, this.y); this.state = 'linger'; g.events.push('unmarked');
      }
      if (this.slip) { tx = clamp(e.x + S.dir * 240, 20, 4980); ty = Math.max(e.y + 60, this.y); speed = ENTITY_SPEED * 0.35; /* (7.7.3) turning away a little quicker (was 0.12) */ this.state = 'away';
        ty = Math.min(ty, floorY); const dx0 = tx - this.x, dy0 = ty - this.y, dl0 = Math.hypot(dx0, dy0) || 1, w0 = Math.min(speed * ENTITY_PACE, dl0);
        this.vx = lerp(this.vx, dx0 / dl0 * w0, 1 - Math.exp(-dt * 1.4)); this.vy = lerp(this.vy, dy0 / dl0 * w0, 1 - Math.exp(-dt * 1.4)); this.x += this.vx * dt; this.y += this.vy * dt;
        if (Math.abs(this.vx) > 0.2) this.heading = Math.atan2(this.vy, this.vx); this.eyeOpen = lerp(this.eyeOpen, 0, dt); this.lights(g, dt); return; }
    }
    if (!this.marked && this.lingerT > 0) {
      // (5.12.4) waiting where it lost him: a slow drift round that spot, in the dark
      tx = this.lingerX + Math.sin(g.time * 0.05) * 20; ty = this.lingerY + Math.cos(g.time * 0.04) * 10; speed = ENTITY_SPEED * 0.15; this.state = 'linger';
    } else if (!this.marked) {
      // ---------- roaming its range, not hunting ----------
      this.roamT -= dt;
      if (this.roamT <= 0 || dist(this.x, this.y, this.roamX, this.roamY) < 15) {
        this.roamT = this.rng.range(40, 90);
        this.roamX = this.rng.range(20, 4980);
        this.roamY = this.rng.range(bandLo, bandHi);
      }
      const fl = this.world ? this.world.floorAt(clamp(this.roamX, 0, 5000)) - 15 : 3900;
      tx = this.roamX; ty = Math.min(this.roamY, fl);
      // the band moves with the day: drift with it
      if (this.y < bandLo - 30 || this.y > bandHi + 30) ty = clamp(this.y, bandLo, Math.min(bandHi, fl));
      speed = ENTITY_SPEED * (Math.abs(this.y - ty) > 200 ? 0.6 : 0.3);
      this.state = 'roam';
    } else {
      // ---------- marked: the hunt ----------
      const away = this.awayT > 0;
      if (d < per && !prot && !away && e.y > SAFE_DEPTH - 20) {
        this.lastX = e.x; this.lastY = e.y; this.knows = Math.min(1, this.knows + dt * 2);
        this.state = 'hunt';
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
      if (away) {
        // gone off: it does not wait outside a safe place for him, it leaves for a while
        this.awayT -= dt;
        this.state = 'away';
        tx = this.awayX; ty = this.awayY; speed = ENTITY_SPEED * 1.4; /* (7.7.3, owner) it leaves at a good pace (was 0.8) */
        if (this.awayT <= 0) { this.state = 'drift'; this.senseT = this.rng.range(20, 40); }
      } else if (prot && d < 70) {
        // it will not come near a lantern, the necklace or the old one's cave: it turns and goes
        this.goAway(prot.x, prot.y, bandLo);
        tx = this.awayX; ty = this.awayY; speed = ENTITY_SPEED * 1.4; /* (7.7.3, owner) it leaves at a good pace (was 0.8) */
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
      this.faceLock = null;
      // the three approaches need room: the sub well clear of rock and the bottom on every side. In
      // close quarters (or with Earl swimming) it comes once, from whatever way is open, and eats him.
      const midApproach = this.ap && (this.ap.phase || this.ap.wait > 0);
      const cramped = e.inSub && !midApproach && !this.openAround(g);
      if (e.inSub && !cramped) {
        // ---------- at the sub: three approaches (see approach) ----------
        this.hunt = null;
        const r = (this.state === 'hunt' || (this.ap && (this.ap.phase || this.ap.wait > 0))) && !away && !(prot && d < 70) ? this.approach(g, dt, d, bandLo) : null;
        if (r) { tx = r.tx; ty = r.ty; speed = r.speed; if (r.swallow) this.swallowNow = true; }
      } else {
        if (this.ap) { this.ap.phase = null; this.flick = 0; }
      }
      // ---------- one turn: it comes for him once, jaws opening ----------
      if ((!e.inSub || cramped) && this.state === 'hunt' && !away && !(prot && d < 70)) {
        const H = this.hunt;
        if (H && H.phase === 'glare') {
          // seen in his lamp: it hangs off at the edge of what he can see, its eyes coming up. Dark and
          // still, or hidden, and it may lose him; run and it comes at once.
          H.t += dt;
          const dark = e.inSub ? !g.sub.lightsOn : !e.lampOn; // (5.16.0) only light matters to it, never how he moves
          H.still = dark ? (H.still || 0) + dt : 0;
          const V = g.viewBox, half = V ? Math.min(V[1] - V[0], (V[3] - V[2]) * 1.6) / 2 : 20;
          const ux = (this.x - e.x) / (d || 1), uy = (this.y - e.y) / (d || 1), hold = clamp(half - 5, 7, e.inSub ? 17 : 12);
          tx = e.x + ux * hold; ty = e.y + uy * hold * 0.6; speed = 2.5;
          if (g.concealed) { this.goAway(e.x, e.y, bandLo); this.hunt = null; g.events.push('lost'); }
          else if (H.still > 3.5 && this.tryDark(g)) { this.hunt = null; }
          else if (H.t > GLARE_TIME) { this.hunt = null; this.swallowNow = true; }
        } else if (d < 80) { this.hunt = null; this.swallowNow = true; }
      } else if (!e.inSub || cramped) this.hunt = this.hunt && this.hunt.phase === 'glare' && this.state === 'hunt' ? this.hunt : null;
      // how high it will come: up toward 120 m only in a live chase, otherwise it keeps below 200 m
      const chasing = this.state === 'hunt';
      ty = Math.max(ty, chasing ? SAFE_DEPTH + 2 : REST_CEILING + 10);
    }

    // ---------- move (it passes through rock: it is not of the water) ----------
    ty = Math.min(ty, floorY);
    let dx = tx - this.x, dy = ty - this.y;
    const dl = Math.hypot(dx, dy) || 1;
    const want = Math.min(speed * ENTITY_PACE * (this.marked && g.earl.legends && g.earl.legends.has('faithless') ? 0.5 : 1), dl * 1.2); // (5.16.0) Faithless: hunting him, at half its pace
    let tvx = (dx / dl) * want, tvy = (dy / dl) * want;
    // rising into shallower water it slows down: no sharp ceiling, a growing reluctance
    if (tvy < 0 && this.y < 170) tvy *= clamp((this.y - SAFE_DEPTH) / 50, 0.12, 1);
    const k = 1 - Math.exp(-dt * 1.4);
    this.vx = lerp(this.vx, tvx, k); this.vy = lerp(this.vy, tvy, k);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y < SAFE_DEPTH) { this.y = lerp(this.y, SAFE_DEPTH, dt * 2); this.vy = Math.max(0, this.vy); }
    this.x = clamp(this.x, -40, 5040);
    if (Math.abs(this.vx) > 0.2) this.heading = Math.atan2(this.vy, this.vx);
    // it fades as it rises toward the light
    this.fade = clamp((this.y - SAFE_DEPTH + 10) / 70, 0.25, 1);

    // eyes: open when close
    this.eyeOpen = lerp(this.eyeOpen, d < 45 ? 1 : 0, dt * 0.8);
    this.blink -= dt;
    if (this.blink < -this.rng.range(3, 7)) this.blink = 0.18;

    this.lights(g, dt);
    if (this.swallowNow) { this.swallowNow = false; if (this.marked && !prot && e.y > SAFE_DEPTH - 4) { this.ap = null; this.flick = 0; return 'swallow'; } }
    // the strike reached him: the grab (see main.js: the jaws)
    if (this.grab) { this.grab = false; if (this.marked && !prot && e.y > SAFE_DEPTH - 4) return 'grab'; }
    return null;
  }

  // Room for the three approaches: open water round the sub, 50 m each side, 20 m above (and below
  // the surface) and 30 m below, with no rock and the bottom further down. Checked once a second.
  openAround(g) {
    const e = g.earl, W = this.world;
    if (!W) return true;
    if (this.openT && g.time - this.openT < 1 && Math.abs(this.openX - e.x) < 8 && Math.abs(this.openY - e.y) < 8) return this.openOk;
    let ok = e.y > 25;
    for (let dx = -50; ok && dx <= 50; dx += 5) {
      const x = clamp(e.x + dx, 0, 4999);
      if (W.floorAt(x) < e.y + 32) ok = false;
      for (let dy = -20; ok && dy <= 30; dy += 5) if (W.rockAt(x, e.y + dy, 1)) ok = false;
    }
    this.openT = g.time; this.openX = e.x; this.openY = e.y; this.openOk = ok;
    return ok;
  }
  // The sub, three times. Each approach is its own pass out of the dark, with a pause between:
  //  1. only its tail: it passes beneath, out of sight, and its tail curls up into view and strikes the hull
  //  2. its head: it noses in at the edge of the screen and sees him (lights out, the blue flash, its
  //     eyes coming up, the red in the water). Dark and still, and it may lose him here.
  //  3. it comes in from the side with its mouth already opening and swallows the sub whole.
  // (7.2.2) how far beneath him it passes: just under the bottom edge of the screen, so the pale line of its back
  // slides along the foot of the view (it was 22 m down, wholly out of sight)
  under(g) { const V = g.viewBox; return V ? clamp((V[3] - V[2]) / 2 + 3.5, 12, 22) : 22; }
  approach(g, dt, d, bandLo) {
    const e = g.earl, L = MONSTER_LEN, A = this.ap || (this.ap = { n: 0, phase: null, t: 0, wait: 0, side: 1, still: 0 });
    A.t += dt;
    const V = g.viewBox, half = V ? (V[1] - V[0]) / 2 : 23;
    if (!A.phase) {
      if (A.wait > 0) {
        // between approaches it turns away into the dark below, and comes round again
        A.wait -= dt; this.flick = Math.max(0, (this.flick || 0) - dt * 2);
        return { tx: e.x + A.side * 150, ty: e.y + 70, speed: ENTITY_SPEED * 0.6 };
      }
      if (d > 170) return null;                      // still closing on him: the ordinary hunt
      A.side = Math.sign(this.x - e.x) || 1; A.t = 0; A.bumped = false; A.still = 0;
      A.phase = A.n === 0 ? 'tailIn' : A.n === 1 ? 'look' : 'swallowIn';
    }
    switch (A.phase) {
      case 'tailIn': {
        // out of sight below him and off to one side
        const px = e.x + A.side * 55, py = e.y + this.under(g);
        this.faceLock = -A.side;
        if (dist(this.x, this.y, px, py) < 6 || A.t > 14) { A.phase = 'tail'; A.t = 0; A.dir = -A.side; }
        return { tx: px, ty: py, speed: ENTITY_SPEED };
      }
      case 'tail': {
        // beneath him, steady; as the tail comes under the sub it curls up into view and strikes the hull
        this.faceLock = A.dir;
        const tailX = this.x - A.dir * 1.15 * L, tipX = this.x - A.dir * 1.27 * L;
        const want = Math.abs(tailX - e.x) < 22 ? 1 : 0, under = this.under(g);
        this.flick = clamp((this.flick || 0) + (want - (this.flick || 0)) * (1 - Math.exp(-dt * 3)), 0, 1);
        if (!A.bumped && this.flick > 0.7 * under / 22 && Math.abs(tipX - e.x) < 6) { A.bumped = true; g.events.push('tailbump'); }
        if ((tailX - e.x) * A.dir > 45 || A.t > 30) { A.phase = null; A.n = 1; A.wait = this.rng.range(16, 26); }
        this.flick = Math.min(this.flick, under / 22); // (7.2.2) passing nearer, the tail curls only as far as the hull
        return { tx: e.x + A.dir * 160, ty: e.y + under, speed: 9 };
      }
      case 'look': {
        // its head comes in at the edge of the screen, level with him
        const px = e.x + A.side * (half - 8), py = e.y + 1; /* (7.2.2) far enough in that its head is clear of the buttons and the radar */
        this.faceLock = -A.side;
        const off = dist(this.x, this.y, px, py);
        if (off < 2.5) { A.phase = 'looking'; A.t = 0; if (this.lit.mode === 'pulse') { this.lit.mode = 'dark'; this.lit.t = 0; } }
        return { tx: px, ty: py, speed: off > 12 ? ENTITY_SPEED * 0.8 : 3 };
      }
      case 'looking': case 'stare2': {
        // it holds there, looking at him (the lights do the rest: see lights)
        const px = e.x + A.side * (half - 8), py = e.y + 1; /* (7.2.2) far enough in that its head is clear of the buttons and the radar */
        this.faceLock = -A.side;
        const dark = !g.sub.lightsOn; // (5.16.0) only her light matters, not whether she moves
        A.still = dark ? A.still + dt : 0;
        if (A.phase === 'stare2') {
          if (A.still > 3.5 && this.tryDark(g)) { A.phase = null; return null; }
          if (A.t > GLARE_TIME) { A.phase = null; A.n = 2; A.wait = this.rng.range(10, 16); }
        } else if (A.t > 6) { A.phase = 'stare2'; A.t = 0; } // (if the lights never went through the sequence)
        return { tx: px, ty: py, speed: 1.5 };
      }
      case 'swallowIn': {
        // from off the side of the screen, its mouth level with him, fast
        const px = e.x + A.side * Math.max(half + 8, 30), py = e.y - 2.5;
        this.faceLock = -A.side;
        if (dist(this.x, this.y, px, py) < 5 || A.t > 12) { this.killDir = [A.side, 0]; return { tx: px, ty: py, speed: 14, swallow: true }; }
        return { tx: px, ty: py, speed: 14 };
      }
    }
    return null;
  }

  // give up on him for a while: head far off, away from (fx, fy), and deeper
  // (7.7.2, owner) put it at the edge of his radar, R metres off, from below where the sea floor allows (Bloodmoon, a revive)
  placeFar(e, R = 1000) {
    let best = null;
    for (let i = 0; i < 24; i++) {
      const a = Math.PI / 2 + (this.rng() - 0.5) * (i < 12 ? 1.6 : 3.0); // straight down first, then widening to the sides
      let x = clamp(e.x + Math.cos(a) * R, 20, 4980), y = e.y + Math.sin(a) * R;
      const fl = this.world ? this.world.floorAt(x) - 20 : 3900; y = Math.max(SAFE_DEPTH + 30, Math.min(y, fl));
      if (this.world && this.world.rockAt && this.world.rockAt(x, y, 10)) continue;
      const d = Math.hypot(x - e.x, y - e.y), score = Math.abs(d - R) + (y < e.y ? 300 : 0);
      if (!best || score < best.score) best = { x, y, score };
    }
    if (!best) { const x = clamp(e.x + (e.x > 2500 ? -R : R), 20, 4980); best = { x, y: Math.max(SAFE_DEPTH + 30, Math.min(e.y + 200, this.world ? this.world.floorAt(x) - 20 : 3900)) }; }
    this.x = best.x; this.y = best.y; this.vx = this.vy = 0; this.roamX = best.x; this.roamY = best.y; this.roamT = 0;
    this.dist = Math.hypot(this.x - e.x, this.y - e.y); this.hunt = null; this.ap = null; this.slip = null;
  }
  goAway(fx, fy, bandLo, T = null) {
    if (this.ap) this.ap.phase = null;
    const side = Math.sign(this.x - fx) || (this.rng() < 0.5 ? -1 : 1);
    let ax = this.x + side * this.rng.range(350, 500);
    if (ax < 20 || ax > 4980) ax = this.x - side * this.rng.range(350, 500);
    ax = clamp(ax, 20, 4980);
    const fl = this.world ? this.world.floorAt(ax) - 15 : 3900;
    this.awayX = ax; this.awayY = Math.min(fl, Math.max(bandLo, this.y, fy) + this.rng.range(150, 350));
    this.awayT = T ?? this.rng.range(90, 150);
    this.state = 'away'; this.knows = 0; this.searchT = 0;
  }

  // (5.16.0) going dark: once a hunt, an even chance it loses him. Fooled, it turns away (see the slip in update); not
  // fooled, its eye stays on him and it keeps coming. Returns true when it was fooled
  tryDark(g) {
    if (this.darkTried) return false;
    this.darkTried = true;
    if (this.rng.next ? this.rng.next() < 0.5 : Math.random() < 0.5) { this.slip = { t: 15, dir: Math.sign(this.x - g.earl.x) || 1 }; g.events.push('fooled'); return true; }
    g.events.push('notFooled'); return false;
  }
}

// "Dread" 0..1 from distance: begins at 200 m, heavy inside 50 m.
export function dreadFromDistance(d) {
  if (d > 200) return 0;
  if (d > 50) return (200 - d) / 150 * 0.55;
  return 0.55 + (50 - d) / 50 * 0.45;
}
