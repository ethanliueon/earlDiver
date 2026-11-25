import { uiUnit } from './settings.js';
import { act } from './input.js';
// (5.3) Touch: a floating joystick and the HUD's buttons, for phones and tablets.
//
// Every finger is followed on its own. One that lands on a HUD button sends that button's action (input.js: held
// while the finger stays, a short one a tap); one that lands
// anywhere else in the left part of the screen grows a joystick where it landed. The stick is analogue: a small push
// swims slowly, the rim is full speed, and pushed to the very edge he sprints. The base follows the thumb if it
// drifts too far, so the stick never "runs out". The emulated mouse events a browser makes after a touch are
// suppressed, so a tap never also counts as a click.
export class Touch {
  constructor(canvas, { buttonAt, active, onMessage, onTap, aim, onPress }) {
    this.c = canvas; this.buttonAt = buttonAt; this.active = active; this.onMessage = onMessage; this.onTap = onTap; this.aim = aim; this.onPress = onPress; // (5.16.0) aim: a tap that Dash is waiting for
    this.stick = null; this.fingers = new Map();
    this.vec = { x: 0, y: 0, mag: 0, on: false, sprint: false };
    this.el = document.getElementById('stick');
    this.base = this.el && this.el.querySelector('.st-base'); this.knob = this.el && this.el.querySelector('.st-knob');
    const opt = { passive: false };
    canvas.addEventListener('touchstart', (e) => this.start(e), opt);
    canvas.addEventListener('touchmove', (e) => this.move(e), opt);
    canvas.addEventListener('touchend', (e) => this.end(e), opt);
    canvas.addEventListener('touchcancel', (e) => this.end(e), opt);
    window.addEventListener('blur', () => this.releaseAll());
  }
  get lampAt() { const L = this.lamp; return L && (L.far > 8 || performance.now() - L.t0 > 220) ? { x: L.x, y: L.y } : null; }
  key(k, down) { act(k, down); } // (7.2.4) the button's action (input.js), no longer a made-up key press
  radius() { const k = window.__fingerK || 1; return 53 * uiUnit() * k; } // (7.4.0, owner) a little bigger (was 46) // (5.15.7) in the one unit, as the HUD: proportional on every screen // (5.4) in real points, on a page laid out wider than the screen // (5.3.1) CSS px centre to rim: about 1.6 cm across
  start(e) {
    if (!this.active()) return;
    e.preventDefault();
    if (navigator.vibrate) this.vibe = true;
    for (const t of e.changedTouches) {
      const b = this.buttonAt(t.clientX, t.clientY);
      if (!b && this.aim && this.aim(t.clientX, t.clientY)) { this.fingers.set(t.identifier, {}); continue; } // (5.16.0) Dash's tap: taken, no stick
      if (b && b.key.startsWith('msg:')) { this.fingers.set(t.identifier, {}); this.onMessage && this.onMessage(b.key.slice(4)); continue; } // a greyed button: why
      if (b) { this.fingers.set(t.identifier, { key: b.key }); this.key(b.key, true); this.onPress && this.onPress(b.key); if (this.vibe) navigator.vibrate(8); continue; } // (5.17.0) its click
      // (5.6.1) the stick grows wherever a thumb lands that is not on a button (not only the left half); a quick tap
      // that hardly moves is a tap on the world instead (an animal to observe)
      // (7.4.26, owner) two hands: the right half of the screen never grows the stick; a finger there turns the diver's lamp
      // toward it (kept in front of him), and a quick tap there is still a tap on the world
      if (t.clientX > window.innerWidth * 0.5) { if (!this.lamp) { this.lamp = { id: t.identifier, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now(), far: 0 }; this.fingers.set(t.identifier, { lamp: true }); } else this.fingers.set(t.identifier, {}); continue; }
      if (!this.stick) {
        this.stick = { id: t.identifier, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now(), far: 0 };
        this.fingers.set(t.identifier, { stick: true });
        this.update(t.clientX, t.clientY);
      }
    }
  }
  move(e) {
    if (!this.fingers.size) return;
    e.preventDefault();
    for (const t of e.changedTouches) if (this.lamp && t.identifier === this.lamp.id) { const L = this.lamp; L.far = Math.max(L.far, Math.hypot(t.clientX - L.x0, t.clientY - L.y0)); L.x = t.clientX; L.y = t.clientY; }
    for (const t of e.changedTouches) if (this.stick && t.identifier === this.stick.id) { this.stick.far = Math.max(this.stick.far, Math.hypot(t.clientX - this.stick.x0, t.clientY - this.stick.y0)); this.update(t.clientX, t.clientY); }
  }
  end(e) {
    for (const t of e.changedTouches) {
      const f = this.fingers.get(t.identifier); if (!f) continue;
      this.fingers.delete(t.identifier);
      if (f.key) this.key(f.key, false);
      if (f.lamp) { const L = this.lamp, k = window.__fingerK || 1; if (L && this.onTap && performance.now() - L.t0 < 280 && L.far < 12 * k) this.onTap(L.x0, L.y0); this.lamp = null; }
      if (f.stick) { const S = this.stick, k = window.__fingerK || 1; if (S && this.onTap && performance.now() - S.t0 < 280 && S.far < 12 * k) this.onTap(S.x0, S.y0); this.clearStick(); }
    }
    if (e.cancelable) e.preventDefault();
  }
  releaseAll() { for (const f of this.fingers.values()) if (f.key) this.key(f.key, false); this.fingers.clear(); this.clearStick(); this.lamp = null; }
  update(x, y) {
    const S = this.stick, R = this.radius();
    let dx = x - S.x, dy = y - S.y, d = Math.hypot(dx, dy);
    if (d > R * 1.25) { const k = (d - R * 1.25) / d; S.x += dx * k; S.y += dy * k; dx = x - S.x; dy = y - S.y; d = Math.hypot(dx, dy); } // the base follows the thumb
    const m = Math.min(1, d / R), dead = 0.12, mag = m < dead ? 0 : (m - dead) / (1 - dead);
    this.vec = { x: d ? dx / d * mag : 0, y: d ? dy / d * mag : 0, mag, on: true, sprint: d > R * (this.vec && this.vec.sprint ? 0.96 : 1.08) }; // (7.4.10) a margin: a thumb resting at the rim no longer flips walk and run several times a second
    this.paint(S.x, S.y, S.x + (d ? dx / d : 0) * Math.min(d, R), S.y + (d ? dy / d : 0) * Math.min(d, R), R);

  }
  clearStick() { this.stick = null; this.vec = { x: 0, y: 0, mag: 0, on: false, sprint: false }; if (this.el) { this.el.classList.remove('on'); this.rest(true); } }
  // at rest: the faint ring in the lower left, where a thumb would go (hidden off the game)
  rest(show) {
    if (!this.el) return;
    if (!show) { this.el.hidden = true; return; }
    if (this.stick) return;
    const R = this.radius(), k = (window.__fingerK || 1) * uiUnit(), x = R + 62 * k, y = window.innerHeight - R - 50 * k; /* (7.4.0, owner) further right and up, clear of the corner */ /* (6.5.7) a little right and up, where the thumb rests */ // (5.17.0) deep in the corner, the lamp having left it (a thumb's margin kept from the edges)
    this.el.hidden = false; this.el.style.setProperty('--r', R + 'px');
    this.base.style.transform = `translate(${x}px, ${y}px)`; this.knob.style.transform = `translate(${x}px, ${y}px)`;
  }
  paint(bx, by, kx, ky, R) {
    if (!this.el) return;
    this.el.hidden = false; this.el.classList.add('on');
    this.el.style.setProperty('--r', R + 'px');
    this.base.style.transform = `translate(${bx}px, ${by}px)`;
    this.knob.style.transform = `translate(${kx}px, ${ky}px)`;
    this.el.classList.toggle('sprint', this.vec.sprint || !!this.lock); // (5.5.3) the sprint button's lock lights the ring too
  }
}
