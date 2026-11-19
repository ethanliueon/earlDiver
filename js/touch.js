// (5.3) Touch: a floating joystick and the HUD's buttons, for phones and tablets.
//
// Every finger is followed on its own. One that lands on a HUD button presses that button's key (a real keydown,
// so the game treats it exactly as the keyboard: held while the finger stays, a short one a tap); one that lands
// anywhere else in the left part of the screen grows a joystick where it landed. The stick is analogue: a small push
// swims slowly, the rim is full speed, and pushed to the very edge he sprints. The base follows the thumb if it
// drifts too far, so the stick never "runs out". The emulated mouse events a browser makes after a touch are
// suppressed, so a tap never also counts as a click.
export class Touch {
  constructor(canvas, { buttonAt, active }) {
    this.c = canvas; this.buttonAt = buttonAt; this.active = active;
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
  key(k, down) {
    const key = k === ' ' ? ' ' : k === 'escape' ? 'Escape' : k;
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }));
  }
  radius() { return Math.max(46, Math.min(70, window.innerHeight * 0.15)); } // CSS px from the centre to the rim
  start(e) {
    if (!this.active()) return;
    e.preventDefault();
    if (navigator.vibrate) this.vibe = true;
    for (const t of e.changedTouches) {
      const b = this.buttonAt(t.clientX, t.clientY);
      if (b) { this.fingers.set(t.identifier, { key: b.key }); this.key(b.key, true); if (this.vibe) navigator.vibrate(8); continue; }
      if (!this.stick && t.clientX < window.innerWidth * 0.5) {
        this.stick = { id: t.identifier, x: t.clientX, y: t.clientY };
        this.fingers.set(t.identifier, { stick: true });
        this.update(t.clientX, t.clientY);
      }
    }
  }
  move(e) {
    if (!this.fingers.size) return;
    e.preventDefault();
    for (const t of e.changedTouches) if (this.stick && t.identifier === this.stick.id) this.update(t.clientX, t.clientY);
  }
  end(e) {
    for (const t of e.changedTouches) {
      const f = this.fingers.get(t.identifier); if (!f) continue;
      this.fingers.delete(t.identifier);
      if (f.key) this.key(f.key, false);
      if (f.stick) this.clearStick();
    }
    if (e.cancelable) e.preventDefault();
  }
  releaseAll() { for (const f of this.fingers.values()) if (f.key) this.key(f.key, false); this.fingers.clear(); this.clearStick(); }
  update(x, y) {
    const S = this.stick, R = this.radius();
    let dx = x - S.x, dy = y - S.y, d = Math.hypot(dx, dy);
    if (d > R * 1.25) { const k = (d - R * 1.25) / d; S.x += dx * k; S.y += dy * k; dx = x - S.x; dy = y - S.y; d = Math.hypot(dx, dy); } // the base follows the thumb
    const m = Math.min(1, d / R), dead = 0.12, mag = m < dead ? 0 : (m - dead) / (1 - dead);
    this.vec = { x: d ? dx / d * mag : 0, y: d ? dy / d * mag : 0, mag, on: true, sprint: d > R * 1.08 };
    this.paint(S.x, S.y, S.x + (d ? dx / d : 0) * Math.min(d, R), S.y + (d ? dy / d : 0) * Math.min(d, R), R);
  }
  clearStick() { this.stick = null; this.vec = { x: 0, y: 0, mag: 0, on: false, sprint: false }; if (this.el) { this.el.classList.remove('on'); } }
  paint(bx, by, kx, ky, R) {
    if (!this.el) return;
    this.el.hidden = false; this.el.classList.add('on');
    this.el.style.setProperty('--r', R + 'px');
    this.base.style.transform = `translate(${bx}px, ${by}px)`;
    this.knob.style.transform = `translate(${kx}px, ${ky}px)`;
    this.el.classList.toggle('sprint', this.vec.sprint);
  }
}
