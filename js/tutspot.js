// (4.3.0) The tutorial's spotlight. It never takes a click: everything under it still works (pointer-events: none).
//  - a soft brass glow round the edges of the screen while the tutorial is guiding (so it is plain that it is on)
//  - when the next thing is on screen (a button, a tab, an item): the rest is shaded, and a brass ring, an arrow and
//    a line of text point at it
//  - when the next thing is a key: a brass key-cap and a word at the bottom of the screen, like the game's prompts
//   spot = { sel: [css selectors, tried in order; the first one visible wins], act: 'quests', say: 'Claim it',
//            light: true (a lighter shade, for a thing on the game screen while he plays),
//            confirm: 'what to say when a confirm plate comes up (its yes button is lit); none: the spotlight hides' }
//
// (4.3.1) Inputs: the tutorial names actions, not keys (act: 'interact', 'quests', ...), and keyFor() turns an action
// into what to press for the input in use. Moving needs no key at all (the trail shows where). Touch, later, only
// needs its own column here (and labels for its on-screen buttons).
export const INPUT = { mode: 'mouse' }; // 'mouse' (mouse and keyboard; the default) · 'keys' (keyboard only) · 'touch' (later)
const ACTIONS = {
  //            mouse      keys      touch (to fill in with mobile support)
  interact:  ['F',       'F',      null],
  use:       [null,      'Space',  null], // with the mouse it is a click: said in words, no key-cap
  net:       ['1',       '1',      null],
  sprint:    ['RMB',     'Shift',  null], // held; RMB is drawn as a mouse with its right button lit
  quests:    ['O',       'O',      null],
  inventory: ['B',       'B',      null],
  journal:   ['J',       'J',      null],
  sell:      ['U',       'U',      null],
  back:      ['Esc',     'Esc',    null],
  leaveSub:  ['F',       'F',      null], // held
};
const COL = { mouse: 0, keys: 1, touch: 2 };
export const keyFor = (act) => (ACTIONS[act] ? ACTIONS[act][COL[INPUT.mode] ?? 0] : null);
export const clicks = () => INPUT.mode !== 'keys';

const PAD = 5;

// (4.3.6) while the spotlight points at something on a screen (a panel, a shop, a confirm), nothing else can be
// used: clicks outside the lit hole are caught by four blockers round it, and keys are swallowed but the one the
// step asks for. Registered when this module loads, before any panel's own key handlers, so it goes first.
let LOCK = null; // { allow: Set of keys } while locked
window.addEventListener('keydown', (ev) => {
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

export class TutSpot {
  constructor() {
    const el = document.createElement('div'); el.id = 'tut-spot'; el.hidden = true;
    el.innerHTML = '<div class="ts-frame"></div><div class="ts-block"></div><div class="ts-block"></div><div class="ts-block"></div><div class="ts-block"></div><div class="ts-hole"></div><div class="ts-arrow"></div><div class="ts-say"></div><div class="ts-key"><kbd></kbd><span></span></div><div class="ts-line"></div>';
    document.body.appendChild(el);
    this.el = el; this.frame = el.querySelector('.ts-frame'); this.hole = el.querySelector('.ts-hole'); this.arrow = el.querySelector('.ts-arrow');
    this.blocks = [...el.querySelectorAll('.ts-block')];
    this.say = el.querySelector('.ts-say'); this.keyBox = el.querySelector('.ts-key');
    this.kbd = this.keyBox.querySelector('kbd'); this.keyText = this.keyBox.querySelector('span');
    this.lastTarget = null;
    this.line = el.querySelector('.ts-line'); this.lineText = null;
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
  hideParts() { LOCK = null; for (const b of this.blocks) b.style.display = 'none'; this.hole.style.display = 'none'; this.arrow.style.display = 'none'; this.say.style.display = 'none'; this.keyBox.style.display = 'none'; }
  // on: the tutorial is guiding (the frame shows); spot: what to point at, if anything
  update(on, spot, text = null) {
    if (!on) { this.el.hidden = true; this.lastTarget = null; LOCK = null; this.setLine(null); return; }
    this.el.hidden = false; this.hideParts(); this.setLine(text);
    // a confirm plate is up: point at its yes button when the step expects one (a purchase), else stay out of the way
    const conf = document.getElementById('confirm');
    if (spot && conf && !conf.hidden) spot = spot.confirm ? { sel: ['#confirm .cf-yes'], say: spot.confirm, below: true } : null; // (4.3.5) the arrow under the button, off the words
    if (!spot) { this.lastTarget = null; return; }
    // (4.3.8) a point on screen (the game's own prompt): a bobbing arrow over it, nothing else
    if (spot.point) {
      this.arrow.style.display = 'block'; this.arrow.className = 'ts-arrow down';
      this.arrow.style.left = spot.point.x + 'px'; this.arrow.style.top = (spot.point.y - 40) + 'px';
      return;
    }
    const t = this.find(spot.sel);
    if (t) {
      // keep it on screen inside a scrolling panel (the shop, the inventory)
      if (t !== this.lastTarget) { this.lastTarget = t; try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* old browsers */ } }
      const r = t.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const x = r.left - PAD, y = r.top - PAD, w = r.width + PAD * 2, h = r.height + PAD * 2;
      Object.assign(this.hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      this.hole.classList.toggle('light', !!spot.light); // over the sea, a lighter shade: he may still be swimming
      // (4.3.6) on a screen (not over the sea while he plays): only the lit thing can be used
      if (!spot.light) {
        const R = [[0, 0, vw, Math.max(0, y)], [0, y + h, vw, Math.max(0, vh - y - h)], [0, y, Math.max(0, x), h], [x + w, y, Math.max(0, vw - x - w), h]];
        this.blocks.forEach((b, i) => { const [bx, by, bw, bh] = R[i]; Object.assign(b.style, { display: 'block', left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' }); });
        const k = spot.act ? keyFor(spot.act) : null;
        LOCK = { allow: new Set(['Shift', 'Control', 'Alt', 'Meta', 'F5', 'F11', 'F12', ...(k ? [k.length === 1 ? k.toLowerCase() : k] : []), ...(spot.keys || [])]) };
      }
      // the arrow and the line: above the thing when there is room, otherwise below it
      const above = !spot.below && y > 100, cx = Math.max(110, Math.min(vw - 110, x + w / 2));
      this.arrow.style.display = 'block';
      this.arrow.className = 'ts-arrow ' + (above ? 'down' : 'up');
      this.arrow.style.left = cx + 'px';
      this.arrow.style.top = (above ? y - 30 : y + h + 8) + 'px';
      // (4.3.1) no words by it: the ring and the arrow are enough (the banner at the top says what the step is)
    } else {
      this.lastTarget = null;
      const k = spot.act ? keyFor(spot.act) : null;
      if (k) {
        this.keyBox.style.display = 'flex'; this.keyText.textContent = spot.say || '';
        const mouseKey = k === 'LMB' || k === 'RMB';
        this.kbd.className = mouseKey ? 'mouse ' + k.toLowerCase() : '';
        this.kbd.innerHTML = mouseKey ? '<b></b><b></b>' : ''; if (!mouseKey) this.kbd.textContent = k;
      }
    }
  }
}
