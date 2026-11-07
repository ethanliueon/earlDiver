// (4.3.0) The tutorial's spotlight: it shades the screen and leaves a lit hole round the one thing to click next
// (a button, a tab, an item), with a bouncing arrow and a line saying what to do. When the next thing is a key
// rather than something on screen, it shows the key itself, big, at the bottom of the screen.
// It never takes a click: everything under it still works (pointer-events: none).
//   spot = { sel: [css selectors, tried in order; the first one visible wins], key: 'O', say: 'Open your quests',
//            confirm: 'what to say when a confirm plate comes up (its yes button is lit); none: the spotlight hides' }
const PAD = 6;

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
    el.innerHTML = '<div class="ts-hole"></div><div class="ts-arrow">➜</div><div class="ts-say"></div><div class="ts-key"><kbd></kbd><span></span></div>';
    document.body.appendChild(el);
    this.el = el; this.hole = el.querySelector('.ts-hole'); this.arrow = el.querySelector('.ts-arrow');
    this.say = el.querySelector('.ts-say'); this.keyBox = el.querySelector('.ts-key');
    this.kbd = this.keyBox.querySelector('kbd'); this.keyText = this.keyBox.querySelector('span');
    this.lastTarget = null;
  }
  find(sels) {
    for (const s of sels || []) {
      let list; try { list = document.querySelectorAll(s); } catch (e) { continue; }
      for (const el of list) if (visible(el)) return el;
    }
    return null;
  }
  update(spot) {
    // nothing to show, or a confirm plate is up: point at its yes button when the step expects one (a purchase), else stay out of the way
    const conf = document.getElementById('confirm');
    if (spot && conf && !conf.hidden) spot = spot.confirm ? { sel: ['#confirm .cf-yes'], say: spot.confirm } : null;
    if (!spot) { this.el.hidden = true; this.lastTarget = null; return; }
    this.el.hidden = false;
    const t = this.find(spot.sel);
    if (t) {
      // keep it on screen inside a scrolling panel (the shop, the inventory)
      if (t !== this.lastTarget) { this.lastTarget = t; try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* old browsers */ } }
      const r = t.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const x = r.left - PAD, y = r.top - PAD, w = r.width + PAD * 2, h = r.height + PAD * 2;
      Object.assign(this.hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      // the arrow and the line: above the thing when there is room, otherwise below it
      const above = y > 110, cx = Math.max(90, Math.min(vw - 90, x + w / 2));
      this.arrow.style.display = 'block';
      this.arrow.className = 'ts-arrow ' + (above ? 'down' : 'up');
      this.arrow.style.left = cx + 'px';
      this.arrow.style.top = (above ? y - 44 : y + h + 6) + 'px';
      this.say.style.display = spot.say ? 'block' : 'none';
      this.say.textContent = spot.say || '';
      this.say.style.left = cx + 'px';
      this.say.style.top = (above ? Math.max(6, y - 92) : Math.min(vh - 50, y + h + 50)) + 'px';
      this.keyBox.style.display = 'none';
    } else {
      this.lastTarget = null;
      this.hole.style.display = 'none'; this.arrow.style.display = 'none'; this.say.style.display = 'none';
      if (spot.key) {
        this.keyBox.style.display = 'flex';
        this.kbd.textContent = spot.key;
        this.keyText.textContent = spot.say || '';
      } else this.keyBox.style.display = 'none';
    }
  }
}
