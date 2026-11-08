// (3.4.0) Every message the game says, in one place: top centre, over the sea and over every room and panel.
// One line at a time; when another comes while one is up, the first fades into the next where it stands. No box:
// the line itself, upright and clear, a soft shadow behind it and a thin rule under it in its colour, drawn out
// from the middle. About three seconds each (danger a little longer); the same line again only counts up (x2).
// kinds: '' (plain), 'note' (a hint, pale gold), 'good', 'warn' (amber), 'danger' (red), 'big' (a moment worth
// marking, larger), or 'rar:#col' (a find, in its rarity's colour)
const DANGER = /died|dying|no air|crush|implod|torn|taken|out of air|lost/i;
const HOLD = { '': 3, note: 3, good: 3, warn: 3, danger: 4.2, big: 4 };

// (4.5.0) Nothing waits its turn: a message is said the moment it happens, or not at all. The most important one
// holds the main line; anything said at the same time shows at once as a small line beneath it (up to three, about
// two seconds). A new message as important as the one up (or more) takes the main line, and the old one steps down
// to a small line. A critical one (a death, the sub lost, out of air) is never pushed off its line. The same words
// again simply keep the line up a little longer, with a pulse: never a count.
const CRITICAL = /killed|died|drowned|imploded|out of air|hospital|you wake|lost at sea|surface!/i;
export class Messages {
  constructor() {
    const el = document.createElement('div'); el.id = 'msgs'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="msg-subs"></div>';
    document.body.appendChild(el);
    this.el = el; this.subs = el.querySelector('.msg-subs'); this.cur = null; this.small = [];
    let last = performance.now();
    const tick = (now) => { this.update(Math.min(0.1, (now - last) / 1000)); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  kindOf(text, kind = '') {
    if (kind === 'critical') return { cls: 'danger', p: 3 };
    if (kind.startsWith('rar:')) return { cls: 'rar', col: kind.slice(4), p: 2 };
    const cls = kind === 'warn' ? (DANGER.test(text) ? 'danger' : 'warn') : kind || 'plain';
    return { cls, p: CRITICAL.test(text) && cls === 'danger' ? 3 : cls === 'plain' ? 1 : 2 };
  }
  show(text, kind = '', minHold = 0) {
    if (!text) return;
    const k = this.kindOf(text, kind);
    if (this.cur && !this.cur.leaving && this.cur.text === text) { this.cur.t = 0; this.pulse(this.cur.el); return; }
    const sm = this.small.find((m) => m.text === text); if (sm) { sm.t = 0; this.pulse(sm.el); return; }
    const m = { text, k, t: 0, hold: Math.max(minHold, k.p === 3 ? 6 : HOLD[k.cls] || 3), minHold };
    if (!this.cur || this.cur.leaving) { this.cur = m; this.enter(m); return; }
    if (k.p >= this.cur.k.p && !(this.cur.k.p === 3 && k.p < 3)) { const old = this.cur; this.leave(old); this.addSmall(old.text, old.k, Math.max(1.6, (old.minHold || 0) - old.t)); this.cur = m; this.enter(m); }
    else this.addSmall(text, k, Math.max(2.2, minHold));
  }
  addSmall(text, k, hold) {
    const el = document.createElement('div'); el.className = `msg-small msg-${k.cls}`; if (k.col) el.style.setProperty('--mc', k.col);
    el.textContent = text; this.subs.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    this.small.push({ text, k, el, t: 0, hold });
    while (this.small.length > 3) this.dropSmall(this.small[0]);
  }
  dropSmall(m) { this.small = this.small.filter((x) => x !== m); m.el.classList.remove('in'); setTimeout(() => m.el.remove(), 400); }
  pulse(el) { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  clear() { if (this.cur) this.cur.hold = 0; for (const m of [...this.small]) this.dropSmall(m); }
  update(dt) {
    if (this.cur) { this.cur.t += dt; if (this.cur.t >= this.cur.hold) { this.leave(this.cur); this.cur = null; } }
    for (const m of [...this.small]) { m.t += dt; if (m.t >= m.hold) this.dropSmall(m); }
  }
  paint(m) { m.el.querySelector('.msg-t').textContent = m.text; }
  enter(m) {
    const el = document.createElement('div');
    el.className = `msg msg-${m.k.cls}`; if (m.k.col) el.style.setProperty('--mc', m.k.col);
    el.innerHTML = '<span class="msg-t"></span><i class="msg-rule"></i>';
    m.el = el; this.paint(m);
    this.el.insertBefore(el, this.subs);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  }
  leave(m) {
    m.leaving = true; const el = m.el; if (!el) return;
    el.classList.remove('in'); el.classList.add('out');
    setTimeout(() => el.remove(), 600);
  }
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
