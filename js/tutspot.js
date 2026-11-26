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

// (7.6.80, owner) the tapping hand, its own picture (the pointing glove stays for buttons): the back of a bare hand seen
// from above, the index finger straight down and the others curled under, painted bone with a soft shade across it and a
// worn olive cuff; with it, three short strokes that flick out from the fingertip as it presses
let TAP_HAND = null;
export function tapHandURL() {
  if (TAP_HAND || typeof document === 'undefined') return TAP_HAND; const W = 120, H = 156, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const body = new Path2D(); // back of the hand with the thumb at its left, the index finger running down to the tip at (60, 150)
  body.moveTo(34, 30); body.bezierCurveTo(30, 52, 28, 70, 32, 86); body.bezierCurveTo(24, 82, 14, 76, 12, 86); body.bezierCurveTo(10, 96, 24, 104, 38, 112);
  body.bezierCurveTo(44, 116, 48, 118, 50, 120); body.lineTo(50, 142); body.bezierCurveTo(50, 152, 70, 152, 70, 142); body.lineTo(70, 112);
  body.bezierCurveTo(78, 112, 84, 108, 86, 104); body.bezierCurveTo(94, 104, 98, 96, 96, 88); body.bezierCurveTo(100, 82, 98, 70, 92, 64); body.bezierCurveTo(92, 52, 90, 40, 88, 30); body.closePath();
  x.save(); x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 6; x.shadowOffsetY = 3; x.fillStyle = '#d9cfb4'; x.fill(body); x.restore();
  x.save(); x.clip(body); const g = x.createLinearGradient(14, 0, 100, 0); g.addColorStop(0, 'rgba(255,250,232,0.55)'); g.addColorStop(0.45, 'rgba(255,250,232,0)'); g.addColorStop(1, 'rgba(70,58,36,0.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const g2 = x.createLinearGradient(0, 60, 0, 150); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(70,58,36,0.22)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(96,80,52,0.5)'; x.lineWidth = 1.6; x.lineCap = 'round'; // the curled fingers' knuckles and the finger's crease
  for (const [x0, y0, x1, y1] of [[70, 108, 84, 102], [72, 96, 92, 90], [74, 84, 94, 76]]) { x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, y1 + 6, x1, y1); x.stroke(); }
  x.beginPath(); x.moveTo(53, 128); x.quadraticCurveTo(60, 131, 67, 128); x.stroke(); x.beginPath(); x.moveTo(32, 88); x.quadraticCurveTo(40, 98, 48, 104); x.stroke();
  x.restore(); x.strokeStyle = 'rgba(70,58,38,0.7)'; x.lineWidth = 1.2; x.stroke(body);
  const cuff = new Path2D(); cuff.moveTo(31, 8); cuff.lineTo(91, 8); cuff.lineTo(89, 32); cuff.lineTo(33, 32); cuff.closePath(); // the cuff: worn olive cloth
  const cg = x.createLinearGradient(31, 0, 91, 0); cg.addColorStop(0, '#5e6845'); cg.addColorStop(1, '#353d28'); x.fillStyle = cg; x.fill(cuff); x.strokeStyle = 'rgba(20,24,14,0.8)'; x.lineWidth = 1.2; x.stroke(cuff);
  x.strokeStyle = 'rgba(214,206,170,0.25)'; x.beginPath(); x.moveTo(33, 13); x.lineTo(89, 13); x.stroke();
  TAP_HAND = { url: c.toDataURL(), w: W, h: H, tipX: 60 / W, tipY: 150 / H };
  // the press: three short bone strokes round the fingertip
  const f = document.createElement('canvas'); f.width = 60; f.height = 30; const fx = f.getContext('2d'); fx.strokeStyle = 'rgba(236,228,204,0.9)'; fx.lineWidth = 3; fx.lineCap = 'round';
  for (const [a, b, c2, d2] of [[8, 22, 16, 18], [30, 6, 30, 14], [52, 22, 44, 18]]) { fx.beginPath(); fx.moveTo(a, b); fx.lineTo(c2, d2); fx.stroke(); }
  TAP_HAND.fx = f.toDataURL(); return TAP_HAND;
}

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
    // (7.2.8) Earl's pointing glove: its fingertip stops just short of the thing's edge (where the line from Earl, or the
    // panel's middle, meets the thing's box), never over it; the picture points down, its fingertip at 0.451, 0.883
    // of the angles near that line, the one where the glove lies over the fewest other words and buttons (a list of links,
    // a card's label) and stays on the screen; worked out once per thing and place, then kept
    const G = 71 /* (7.3.0) the glove 15 % bigger, as in olive.css */, a0 = Math.atan2(dy, dx), key = Math.round(cx / 24) + ',' + Math.round(cy / 24); /* (7.6.67, owner) keyed on where the thing is only, coarsely: a pulsing button changed its size every moment and the glove was worked out again, flipping between two angles */ /* (7.4.26, owner) the glove kept where it was while the thing stays put: keyed on the angle too, it was worked out again each time Earl's small sway crossed a tenth of a radian, and it hopped left and right */
    const place = (an) => { const ux = Math.cos(an), uy = Math.sin(an), e2 = Math.min(Math.abs(ux) > 1e-3 ? (w / 2) / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-3 ? (h / 2) / Math.abs(uy) : 1e9) + 4;
      const tx = cx - ux * e2, ty = cy - uy * e2, rad = an - Math.PI / 2, ox2 = (0.451 - 0.5) * G, oy2 = (0.883 - 0.5) * G;
      return { rad, ax: tx - (ox2 * Math.cos(rad) - oy2 * Math.sin(rad)), ay: ty - (ox2 * Math.sin(rad) + oy2 * Math.cos(rad)) }; };
    if (this.gloveKey !== key || Math.abs(Math.atan2(Math.sin(a0 - (this.gloveA0 || 0)), Math.cos(a0 - (this.gloveA0 || 0)))) > 0.6) { this.gloveA0 = a0;
      const hit = (px, py) => { if (px < 4 || py < 4 || px > innerWidth - 4 || py > innerHeight - 4) return 3;
        for (const el of document.elementsFromPoint(px, py)) { if (el.closest('#tut-spot')) continue; if (t && (el === t || t.contains(el) || el.contains(t))) return 0;
          if (el.matches('button, a, input, img, canvas, h1, h2, h3, h4, h5, p, li, label, b, i, em, strong, small, [data-act], [data-q], .tag, .card') || (el.childElementCount === 0 && (el.textContent || '').trim())) return el.tagName === 'CANVAS' ? 0 : 1;
          if (el === document.body) return 0; }
        return 0; };
      let best = Infinity, bestA = a0;
      for (let i = 0; i < 19; i++) { const k = (i % 2 ? 1 : -1) * Math.ceil(i / 2), an = a0 + k * 0.17, P0 = place(an); let c = Math.abs(k) * 0.15;
        for (const [fx, fy] of [[0, 0], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.2], [0.3, 0.2], [0, -0.42]]) { const rx = fx * G, ry = fy * G; c += hit(P0.ax + rx * Math.cos(P0.rad) - ry * Math.sin(P0.rad), P0.ay + rx * Math.sin(P0.rad) + ry * Math.cos(P0.rad)); }
        if (c < best - 0.01) { best = c; bestA = an; } }
      // (7.6.67) worked out again: the angle it had is kept unless the new one is clearly better (no flipping between near-equals)
      if (this.gloveA != null && this.gloveKey != null) { const keep = this.gloveA; let ck = Math.abs(Math.atan2(Math.sin(keep - a0), Math.cos(keep - a0))) / 0.17 * 0.15; const P1 = place(keep);
        for (const [fx, fy] of [[0, 0], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.2], [0.3, 0.2], [0, -0.42]]) { const rx = fx * G, ry = fy * G; ck += hit(P1.ax + rx * Math.cos(P1.rad) - ry * Math.sin(P1.rad), P1.ay + rx * Math.sin(P1.rad) + ry * Math.cos(P1.rad)); }
        if (ck <= best + 1 && Math.abs(Math.atan2(Math.sin(keep - a0), Math.cos(keep - a0))) < 1.7) bestA = keep; }
      this.gloveKey = key; this.gloveA = bestA; }
    const PL = place(this.gloveA), rad = PL.rad; let ax = PL.ax, ay = PL.ay; dx = Math.cos(this.gloveA); dy = Math.sin(this.gloveA);
    const deg = rad * 180 / Math.PI;
    this.arrow.style.display = 'block'; setClass(this.arrow, 'ts-arrow down aim');
    Object.assign(this.arrow.style, { left: ax + 'px', top: ay + 'px', transform: `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)` });
    this.arrow.style.setProperty('--bx', (dx * 6).toFixed(1) + 'px'); this.arrow.style.setProperty('--by', (dy * 6).toFixed(1) + 'px');
  }
  hideParts() { LOCK = null; if (this.el.classList.contains('vig')) this.el.classList.remove('vig'); for (const b of this.blocks) b.style.display = 'none'; this.hole.style.display = 'none'; this.arrow.style.display = 'none'; this.say.style.display = 'none'; this.keyBox.style.display = 'none'; if (this.card) this.card.style.display = 'none'; }
  // on: the tutorial is guiding (the frame shows); spot: what to point at, if anything
  update(on, spot, text = null) { this.update0(on, spot, text); this.keyBox.style.display = 'none'; flushStyles(); } // (5.6.7) a phone: the line at the top says it, once
  update0(on, spot, text = null) {
    window.__hudTutKey = null; window.__tutMenu = false; window.__tutAct = null;
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
    if (!spot) { this.lastTarget = null; if (this.litEl) { this.litEl.classList.remove('ts-lit'); this.litEl = null; } return; }
    // (7.2.8) a step about anything kept in the left menu (the journal and quests, the chart, the bag, the sub's tile, the
    // tank room, the spare air, the shop, the events) opens the menu for as long as it lasts: folded, the thing it points
    // at was hidden ("Open your journal and claim it" with the menu folded pointed at nothing)
    window.__tutAct = spot.act || null; // (7.4.0) what the step asks to open: the journal's tile opens that, not the quest board
    { const w0 = String(spot.key || (spot.act ? TAP[spot.act] : '') || '').toLowerCase();
      window.__tutMenu = (spot.sel || []).some((q) => /#quests-btn|#hud-journal|#hud-chart|#hud-bag/.test(q)) || ['j', 'o', 'k', 'b', 'c', 't', 'r', 'store', 'events', 'journal'].includes(w0); }
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
      // (7.4.0, owner) the thing glows in its own shape: a breathing glow that follows its picture's outline (CSS ts-lit),
      // never a lit box round it; the dark's edge round it is feathered so no rectangle shows
      if (this.litEl !== t) { if (this.litEl) this.litEl.classList.remove('ts-lit'); this.litEl = t; t.classList.add('ts-lit'); }
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
        const side = spot.card.side === 'left' && x > 200; if (this.card.classList.contains('point-r') !== side) this.card.classList.toggle('point-r', side);
        this.card.style.display = 'block'; flushStyles(); const cw = side ? Math.min(320, x - 52) : Math.min(320, vw - 24), ch = this.card.offsetHeight || 110;
        /* (7.4.26, owner) a card can stand to the left of what it is about, its arrow pointing across at it */
        const left = side ? Math.max(12, x - cw - 30) : Math.max(12, Math.min(vw - cw - 12, x + w / 2 - cw / 2)), top = side ? Math.max(12, Math.min(vh - ch - 12, y + h / 2 - ch / 2)) : y + h + 14 + ch < vh ? y + h + 14 : Math.max(12, y - ch - 14);
        Object.assign(this.card.style, { left: left + 'px', top: top + 'px', width: cw + 'px' });
      }
      // (4.3.1) no words by it: the ring and the arrow are enough (the banner at the top says what the step is)
    } else if (spot.pt) { // (7.5.0) a place in the scene (the cabin door from the deck): the glove at it, nothing dimmed
      this.lastTarget = null; if (this.litEl) { this.litEl.classList.remove('ts-lit'); this.litEl = null; }
      const [px, py, pw, ph] = spot.pt; this.hole.style.display = 'none';
      // (7.6.79, owner) a thing to tap in the water (the tutorial's fish): the glove comes down onto it from above, presses,
      // and fades, again and again, never a line from the diver (it swung round as he moved)
      if (spot.tap) { const T = tapHandURL(), hw = 46, hh = hw * T.h / T.w, tipY = py - ph / 2 - 10; /* (7.6.80, owner) its fingertip a little above the fish, pressing down onto it */
        const ax = px - (T.tipX - 0.5) * hw, ay = tipY - (T.tipY - 0.5) * hh; this.arrow.style.display = 'block'; setClass(this.arrow, 'ts-arrow aim tap');
        if (!this.arrow.dataset.tap) { this.arrow.dataset.tap = 1; this.arrow.style.setProperty('--tap-hand', `url("${T.url}")`); this.arrow.style.setProperty('--tap-fx', `url("${T.fx}")`); }
        this.arrow.style.setProperty('--tap-w', hw + 'px'); this.arrow.style.setProperty('--tap-h', hh.toFixed(1) + 'px'); Object.assign(this.arrow.style, { left: ax.toFixed(1) + 'px', top: ay.toFixed(1) + 'px', transform: 'translate(-50%, -50%)' }); return; }
      this.aimArrow(null, px - pw / 2, py - ph / 2, pw, ph); return;
    } else {
      this.lastTarget = null; if (this.litEl) { this.litEl.classList.remove('ts-lit'); this.litEl = null; }
      // a key to press (or the tutorial's button: spot.button is its action, spot.key its key)
      const k = spot.key || (spot.act ? TAP[spot.act] : null);
      this.btn = spot.button || null; this.keyBox.classList.toggle('btn', !!spot.button);
      // (5.4) ring the on-screen button that does it (the HUD lists where each is and what it sends); a step with no
      // such button just keeps its line of words
      const want = k ? ({ space: ' ', shift: 'sprint' }[String(k).toLowerCase()] || String(k).toLowerCase()) : null;
      // (7.4.0) more than one place can send the same key (the arc's button and a thing's own tap spot in the scene): keep to
      // the one used last, or the largest (the button), so the glove does not hop between them from frame to frame
      const hits = want ? (window.__hudHots || []).filter((q) => q.key === want) : [];
      const onHud = hits.length < 2 ? hits[0] : (this.lastHot && hits.find((q) => Math.abs(q.x - this.lastHot.x) < 4 && Math.abs(q.y - this.lastHot.y) < 4)) || hits.slice().sort((a2, b2) => b2.w * b2.h - a2.w * a2.h)[0];
      this.lastHot = onHud || null;
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
        let menuEl = null;
        if (!h && DOMK[want]) { const el2 = this.find(DOMK[want]), r = el2 && el2.getBoundingClientRect(); if (r) { h = { x: r.left, y: r.top, w: r.width, h: r.height }; menuEl = el2; } }
        /* (7.4.26, owner) a step asking for the journal (or the chart): its picture in full colour and glowing, the screen's edges darkened a little */
        if (menuEl !== this.litEl) { if (this.litEl) this.litEl.classList.remove('ts-lit'); this.litEl = menuEl; if (menuEl) menuEl.classList.add('ts-lit'); }
        if (this.el.classList.contains('vig') !== !!menuEl) this.el.classList.toggle('vig', !!menuEl);
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
