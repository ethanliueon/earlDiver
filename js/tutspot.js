// (4.3.0) The tutorial's spotlight. It never takes a click: everything under it still works (pointer-events: none).
//  - a soft brass glow round the edges of the screen while the tutorial is guiding (so it is plain that it is on)
//  - when the next thing is on screen (a button, a tab, an item): the rest is shaded, and a brass ring, an arrow and
//    a line of text point at it
//  - when the next thing is a key: a brass key-cap and a word at the bottom of the screen, like the game's prompts
//   spot = { sel: [css selectors, tried in order; the first one visible wins], act: 'quests', say: 'Claim it',
//            light: true (a lighter shade, for a thing on the game screen while he plays),
//            confirm: 'what to say when a confirm plate comes up (its yes button is lit); none: the spotlight hides' }
//
// (7.2.4) The game is touch-only: the tutorial names actions (act: 'interact', 'quests', ...), and TAP gives the HUD
// button's own name for each, which is what that button sends (see input.js). Moving needs no button (the trail shows
// where); sprinting is the stick pushed to its rim.
const TAP = { interact: 'f', use: ' ', net: '1', sprint: 'sprint', quests: 'o', inventory: 'b', journal: 'j', trawl: 'n', tank: 't', airtank: 'r' };

const PAD = 5;

// (4.3.6) while the spotlight points at something on a screen (a panel, a shop, a confirm), nothing else can be
// used: clicks outside the lit hole are caught by four blockers round it, and keys are swallowed but the one the
// step asks for. Registered when this module loads, before any panel's own key handlers, so it goes first.
let LOCK = null; // { allow: Set of keys } while locked
window.addEventListener('actdown', (ev) => {
  if (!LOCK) return;
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  if (LOCK.allow.has(k)) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
}, true);
function visible(el) {
  if (!el || el.disabled) return false;
  if (el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
}

// writes are held until the frame's update is over, then only what ends up different reaches the page (the parts are
// hidden and shown again inside one update)
const PENDING = new Set();
function quietStyle(n) {
  const real = n.style, seen = Object.create(null), want = Object.create(null);
  const p = new Proxy(real, {
    set(t, k, v) { want[k] = v == null ? '' : String(v); PENDING.add(flush); return true; },
    get(t, k) { if (k in want) return want[k]; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
  });
  const flush = () => { for (const k in want) { if (seen[k] !== want[k]) { seen[k] = want[k]; real[k] = want[k]; } delete want[k]; } };
  Object.defineProperty(n, 'style', { get: () => p, configurable: true });
}
function flushStyles() { for (const f of PENDING) f(); PENDING.clear(); }
const setClass = (n, c) => { if (n.className !== c) n.className = c; };

export class TutSpot {
  constructor() {
    const el = document.createElement('div'); el.id = 'tut-spot'; el.hidden = true;
    el.innerHTML = '<div class="ts-dim"></div><div class="ts-frame"></div><div class="ts-block"></div><div class="ts-block"></div><div class="ts-block"></div><div class="ts-block"></div><div class="ts-hole"></div><div class="ts-arrow"></div><div class="ts-say"></div><div class="ts-key"><span></span></div><div class="ts-line"></div><div class="ts-card"><p></p><button>OK</button></div>';
    document.body.appendChild(el);
    this.el = el; this.frame = el.querySelector('.ts-frame'); this.hole = el.querySelector('.ts-hole'); this.arrow = el.querySelector('.ts-arrow');
    this.blocks = [...el.querySelectorAll('.ts-block')];
    // (5.4) update() lays the parts out again every frame; their style only takes the values that changed, so an
    // unchanged spotlight costs the page nothing (it was ~400 style writes a second, each a fresh style pass)
    for (const n of el.querySelectorAll('*')) quietStyle(n);
    quietStyle(el);
    this.say = el.querySelector('.ts-say'); this.keyBox = el.querySelector('.ts-key');
    this.keyText = this.keyBox.querySelector('span');
    this.lastTarget = null;
    this.line = el.querySelector('.ts-line'); this.lineText = null;
    // (4.4.1) the tutorial's own button: a click does the step's action (main.js runTutAction), as its key does
    this.onAction = null;
    this.keyBox.addEventListener('click', () => { if (this.btn && this.onAction) this.onAction(this.btn); });
    // (4.12.2) a card by the lit thing: a few words about it and OK (spot.card = { id, text }); OK calls onCard(id)
    this.card = el.querySelector('.ts-card'); this.onCard = null;
    this.card.querySelector('button').addEventListener('click', () => { if (this.cardId && this.onCard) this.onCard(this.cardId); });
  }
  // (4.3.8) the tutorial's instruction, on its own line at the left under the quest tracker (not in the game's
  // message line at the top, where it held other messages back). It stays while it is the instruction.
  setLine(text) {
    if (text === this.lineText) return;
    this.lineText = text;
    if (!text) { this.line.classList.remove('in'); return; }
    this.line.classList.remove('in'); void this.line.offsetWidth; // restart the fade-in
    this.line.textContent = text; this.line.classList.add('in');
  }
  find(sels) {
    for (const s of sels || []) {
      let list; try { list = document.querySelectorAll(s); } catch (e) { continue; }
      for (const el of list) if (visible(el)) return el;
    }
    return null;
  }
  // (6.5.0) a new thing to light: the outline and the arrow fade out where they were and fade in at the new place
  // (they used to slide across the screen). The shade stays the whole time: a plain dark layer covers the moment the
  // outline is away, so the screen never flashes bright
  moveTo(t, x, y, w, h) {
    const far = !this.litAt || Math.abs(this.litAt.x - x) + Math.abs(this.litAt.y - y) + Math.abs(this.litAt.w - w) > 24;
    this.litAt = { x, y, w, h };
    if (t === this.litEl || !far) { this.litEl = t; return; }
    const first = !this.litEl; this.litEl = t; if (first) return;
    this.el.classList.toggle('ts-lightswap', this.hole.classList.contains('light')); this.el.classList.add('ts-swap'); clearTimeout(this.swapT);
    this.swapT = setTimeout(() => this.el.classList.remove('ts-swap'), 260);
  }
  // (6.5.6) the arrow comes in along the line from where the eye is (the middle of the panel the thing is in, else Earl)
  // to the thing, just outside it, and bobs along that line: it used to drop straight down onto it from above
  aimArrow(t, x, y, w, h) {
    const panel = t && t.closest && t.closest('#journal, #inventory, #workshop, #catalog, #quests, #chart, #settings, #confirm, #tankroom, #gallery, #davetalk, #events, #store, .cx');
    const P = panel && panel.getBoundingClientRect(), es = window.__earl && window.__earl.g && window.__earl.g.earlScr;
    let ox = innerWidth / 2, oy = innerHeight / 2;
    if (P && P.width && P.width < innerWidth * 0.98) { ox = P.left + P.width / 2; oy = P.top + P.height / 2; }
    else if (P && P.width) { ox = innerWidth / 2; oy = innerHeight / 2; }
    else if (es) { ox = es[0] * innerWidth; oy = es[1] * innerHeight; }
    const cx = x + w / 2, cy = y + h / 2; let dx = cx - ox, dy = cy - oy; const L = Math.hypot(dx, dy);
    if (L < 8) { dx = 0; dy = 1; } else { dx /= L; dy /= L; }
    const rr = Math.min(w, h) / 2 + 18, ax = cx - dx * rr, ay = cy - dy * rr, deg = Math.atan2(dy, dx) * 180 / Math.PI - 90;
    this.arrow.style.display = 'block'; setClass(this.arrow, 'ts-arrow down aim');
    Object.assign(this.arrow.style, { left: ax + 'px', top: ay + 'px', transform: `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)` });
    this.arrow.style.setProperty('--bx', (dx * 6).toFixed(1) + 'px'); this.arrow.style.setProperty('--by', (dy * 6).toFixed(1) + 'px');
  }
  hideParts() { LOCK = null; for (const b of this.blocks) b.style.display = 'none'; this.hole.style.display = 'none'; this.arrow.style.display = 'none'; this.say.style.display = 'none'; this.keyBox.style.display = 'none'; if (this.card) this.card.style.display = 'none'; }
  // on: the tutorial is guiding (the frame shows); spot: what to point at, if anything
  update(on, spot, text = null) { this.update0(on, spot, text); this.keyBox.style.display = 'none'; flushStyles(); } // (5.6.7) a phone: the line at the top says it, once
  update0(on, spot, text = null) {
    window.__hudTutKey = null;
    if (!on) { // (4.12.2) the spotlight fades out rather than vanishing (no bright flash when a step ends)
      LOCK = null; this.lastTarget = null; this.setLine(null); for (const b of this.blocks) b.style.display = 'none';
      if (!this.el.hidden && !this.fadingOut) { this.fadingOut = true; this.el.classList.add('out'); this.fadeT = setTimeout(() => { this.el.hidden = true; this.el.classList.remove('out'); this.fadingOut = false; }, 420); }
      return;
    }
    if (this.fadingOut) { clearTimeout(this.fadeT); this.fadingOut = false; this.el.classList.remove('out'); }
    this.el.hidden = false; this.hideParts(); this.setLine(text);
    // a confirm plate is up: point at its yes button when the step expects one (a purchase), else stay out of the way
    const conf = document.getElementById('confirm');
    if (spot && conf && !conf.hidden) spot = spot.confirm ? { sel: ['#confirm .cf-yes'], say: spot.confirm, below: true } : null; // (4.3.5) the arrow under the button, off the words
    if (!spot) { this.lastTarget = null; return; }
    let t = this.find(spot.sel);
    // (4.12.2) the thing it points at gone for a moment (a panel redrawn): keep the shade where it was a little
    // longer, so the screen does not flash bright
    if (!t && this.lastRect && performance.now() - this.lastSeen < 500 && spot.sel) { const r0 = this.lastRect; Object.assign(this.hole.style, { display: 'block', left: r0.x + 'px', top: r0.y + 'px', width: r0.w + 'px', height: r0.h + 'px' }); return; }
    if (t) {
      // keep it on screen inside a scrolling panel (the shop, the inventory)
      if (t !== this.lastTarget) { this.lastTarget = t; try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* old browsers */ } }
      const r = t.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const x = r.left - PAD, y = r.top - PAD, w = r.width + PAD * 2, h = r.height + PAD * 2; this.lastRect = { x, y, w, h }; this.lastSeen = performance.now();
      // (6.5.0) the outline follows the thing's own shape: its corners rounded as the thing's are (a square tile a rounded
      // square, a round coin a circle), never a circle drawn over a square
      const br0 = getComputedStyle(t).borderRadius, round = /50%/.test(br0) || (parseFloat(br0) >= Math.min(r.width, r.height) / 2 - 1), rad = round ? '50%' : Math.max(8, (parseFloat(br0) || 0) + PAD) + 'px';
      this.moveTo(t, x, y, w, h);
      Object.assign(this.hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: t.closest('.hud-ic') ? '12px' : rad });
      if (this.hole.classList.contains('light') !== !!spot.light) this.hole.classList.toggle('light', !!spot.light); // over the sea, a lighter shade: he may still be swimming
      // (4.3.6) on a screen (not over the sea while he plays): only the lit thing can be used
      if (!spot.light) {
        window.__tutDarkAt = performance.now(); // (6.5.0) for the HUD's spotlight: the screen was dark just now
        const R = [[0, 0, vw, Math.max(0, y)], [0, y + h, vw, Math.max(0, vh - y - h)], [0, y, Math.max(0, x), h], [x + w, y, Math.max(0, vw - x - w), h]];
        this.blocks.forEach((b, i) => { const [bx, by, bw, bh] = R[i]; Object.assign(b.style, { display: 'block', left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' }); });
        const k = spot.act ? TAP[spot.act] : null;
        LOCK = { allow: new Set([...(k ? [k] : []), ...(spot.keys || [])]) };
      }
      // the arrow and the line: above the thing when there is room, otherwise below it
      const above = !spot.below && y > 100, cx = Math.max(16, Math.min(vw - 16, x + w / 2));
      // (5.7.5) the arrow back on a phone too, now placed over the thing itself (it was pushed 110 px in, onto the words)
      void above; void cx; this.aimArrow(t, x, y, w, h);
      if (spot.card) { // the card beside the lit thing (below it when there is room, else above), the arrow hidden
        this.arrow.style.display = 'none'; this.cardId = spot.card.id;
        const p = this.card.querySelector('p'); if (p.textContent !== spot.card.text) p.textContent = spot.card.text;
        this.card.style.display = 'block'; flushStyles(); const cw = Math.min(320, vw - 24), ch = this.card.offsetHeight || 110;
        const left = Math.max(12, Math.min(vw - cw - 12, x + w / 2 - cw / 2)), top = y + h + 14 + ch < vh ? y + h + 14 : Math.max(12, y - ch - 14);
        Object.assign(this.card.style, { left: left + 'px', top: top + 'px', width: cw + 'px' });
      }
      // (4.3.1) no words by it: the ring and the arrow are enough (the banner at the top says what the step is)
    } else {
      this.lastTarget = null;
      // a key to press (or the tutorial's button: spot.button is its action, spot.key its key)
      const k = spot.key || (spot.act ? TAP[spot.act] : null);
      this.btn = spot.button || null; this.keyBox.classList.toggle('btn', !!spot.button);
      // (5.4) ring the on-screen button that does it (the HUD lists where each is and what it sends); a step with no
      // such button just keeps its line of words
      const want = k ? ({ space: ' ', shift: 'sprint' }[String(k).toLowerCase()] || String(k).toLowerCase()) : null;
      const onHud = want && (window.__hudHots || []).find((q) => q.key === want);
      // (5.5) a step the tutorial would do with its own button in the middle of the screen: when the HUD has the
      // button for it, that button is ringed instead (pressing it does the step, as the tutorial's own would)
      if (k && (!spot.button || onHud)) {
        if (spot.button) this.keyBox.classList.remove('btn');
        let h = onHud;
        if (h) window.__hudTutKey = want; // the HUD draws the pulsing ring itself, on its own button
        // sprinting has no button: the stick pushed out to its rim does it, so the stick is ringed and the words say so
        if (!h && spot.act === 'sprint') {
          const st = document.querySelector('#stick .st-base'), r = st && st.getBoundingClientRect();
          if (r && r.width) h = { x: r.left, y: r.top, w: r.width, h: r.height };
          this.keyBox.style.display = 'flex';
          const say = 'Push the stick out to its rim to sprint';
          if (this.keyText.textContent !== say) this.keyText.textContent = say;
        }
        // the journal, the quests and the chart are not HUD buttons but the clipboard group at the top left: the
        // picture itself when it shows, else the clipboard that opens the group
        const DOMK = { j: ['#quests-btn img'], o: ['#quests-btn img'], k: ['#hud-chart', '#quests-btn img'] }; // (7.2.4) the picture itself: the button's box is twice its size and runs off the screen's edge
        if (!h && DOMK[want]) { const el2 = this.find(DOMK[want]), r = el2 && el2.getBoundingClientRect(); if (r) h = { x: r.left, y: r.top, w: r.width, h: r.height }; }
        // words with it, never a key cap (a step with nothing to ring keeps just its words)
        if ((spot.act !== 'sprint' || onHud) && spot.say) { this.keyBox.style.display = 'flex'; const say = ({ obs: 'Tap the fish to observe it', sprint: 'Tap to sprint (uses air faster)' })[want] || spot.say.replace(/^(Press|Hold)\b/, (m) => (m === 'Press' ? 'Tap' : 'Hold')); if (this.keyText.textContent !== say) this.keyText.textContent = say; }
        if (h && !onHud) {
          const x = h.x - PAD, y = h.y - PAD, w = h.w + PAD * 2, hh = h.h + PAD * 2;
          Object.assign(this.hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
          if (!this.hole.classList.contains('light')) this.hole.classList.add('light');
          this.aimArrow(null, x, y, w, hh);
        }
        return;
      }
    }
  }
}
