// (3.4.0) Every message the game says, in one place: top centre, over the sea and over every room and panel.
// One line at a time; when another comes while one is up, the first fades into the next where it stands. No box:
// the line itself, upright and clear, a soft shadow behind it and a thin rule under it in its colour, drawn out
// from the middle. About three seconds each (danger a little longer); the same line again only counts up (x2).
// kinds: '' (plain), 'note' (a hint, pale gold), 'good', 'warn' (amber), 'danger' (red), 'big' (a moment worth
// marking, larger), or 'rar:#col' (a find, in its rarity's colour)
const DANGER = /died|dying|no air|crush|implod|torn|taken|out of air|lost/i;
const HOLD = { '': 3, note: 3, good: 3, warn: 3, danger: 4.2, big: 4 };

export class Messages {
  constructor() {
    const el = document.createElement('div'); el.id = 'msgs'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    this.el = el; this.cur = null; this.queue = [];
    // its own clock: it keeps time while the game is paused or a room covers it
    let last = performance.now();
    const tick = (now) => { this.update(Math.min(0.1, (now - last) / 1000)); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  kindOf(text, kind = '') {
    if (kind.startsWith('rar:')) return { cls: 'rar', col: kind.slice(4) };
    if (kind === 'warn') return { cls: DANGER.test(text) ? 'danger' : 'warn' };
    return { cls: kind || 'plain' };
  }
  show(text, kind = '') {
    if (!text) return;
    const k = this.kindOf(text, kind);
    // the same line again: it counts, and stays
    const same = (m) => m && m.text === text;
    if (same(this.cur) && !this.cur.leaving) { this.cur.n++; this.cur.t = 0; this.paint(this.cur); return; }
    const q = this.queue.find(same); if (q) { q.n++; return; }
    const m = { text, k, n: 1, t: 0, hold: HOLD[k.cls] || 3 };
    // danger goes to the front; the queue stays short (the oldest plain lines give way)
    if (k.cls === 'danger') this.queue.unshift(m); else this.queue.push(m);
    while (this.queue.length > 3) { const i = this.queue.findIndex((x) => x.k.cls !== 'danger'); this.queue.splice(i >= 0 ? i : this.queue.length - 1, 1); }
    // a line waiting: the one up now moves on sooner (but is read first)
    if (this.cur) this.cur.hold = Math.min(this.cur.hold, Math.max(1.3, this.cur.t + 0.2));
  }
  clear() { this.queue = []; if (this.cur) this.cur.hold = 0; }
  update(dt) {
    if (this.cur) {
      this.cur.t += dt;
      if (this.cur.t >= this.cur.hold) { this.leave(this.cur); this.cur = null; }
    }
    if (!this.cur && this.queue.length) { this.cur = this.queue.shift(); this.enter(this.cur); }
  }
  paint(m) {
    const n = m.n > 1 ? `<i class="msg-n">×${m.n}</i>` : '';
    m.el.querySelector('.msg-t').innerHTML = `${esc(m.text)}${n}`;
  }
  enter(m) {
    const el = document.createElement('div');
    el.className = `msg msg-${m.k.cls}`; if (m.k.col) el.style.setProperty('--mc', m.k.col);
    el.innerHTML = '<span class="msg-t"></span><i class="msg-rule"></i>';
    m.el = el; this.paint(m);
    this.el.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  }
  leave(m) {
    m.leaving = true; const el = m.el; if (!el) return;
    el.classList.remove('in'); el.classList.add('out');
    setTimeout(() => el.remove(), 600);
  }
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
