// The back of the submersible, full screen: two steel compartments joined by a hatch.
// The chamber room: pressure chambers (after the SubCAS chambers fisheries scientists use) strapped
// to a riveted bulkhead, a pipe run feeding them, a caged lamp and a porthole onto the water outside.
// The tank room: the open tank set into the wall, and the catch bag hanging on its hook.
// (2.7.4) No tags: click an animal for a small card (its name, where it was found, how it is) and what
// can be done with it; drag it anywhere in the open tank to put it there. How it swims shows how it is doing. Animals are moved by hand: the
// catch bag hangs in both rooms, and a fish is dragged from the bag, the tank or a chamber and dropped
// on a chamber, the open tank or the bag.
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies, speciesIcon, speciesBox, fittedIcon } from './creatures_draw.js';
import { rarityOf, specimenValue, rarityStars, rarityCls } from './specimens.js';
import { money } from './economy.js';
import { xEyes } from './gallery.js';
import { tankSlots, pressSlots, chamberRating, chamberMax, homeOf, gapOf, SAFE_GAP, freeChamber, tankUsed, bagSlots , tankFits, BIG, bigFits, hasBigTank, tooBig, bigIn, slotsOf} from './capture.js';
import { UPGRADES } from './economy.js';
import { clamp, lerp, TAU } from './util.js';
// (3.0.25) the open tank's lights, as the aquarium's
const TANK_LIGHTS = { day: { name: 'Daylight', water: ['#1d5f70', '#0a2a33'], tint: null }, dim: { name: 'Dim', water: ['#0f3440', '#04151b'], tint: 'rgba(0,10,20,0.45)', glow: true } }; // (3.0.26: no Red in the sub)

const MAX_CHAMBERS = UPGRADES.pressTanks.base + UPGRADES.pressTanks.max;
const ROOMS = { chambers: 'The chamber room', tank: 'The tank room', big: 'The large tank' }, ROOM_ORDER = ['chambers', 'tank', 'big'];
// (3.2.0) a chamber, in its own units (3.2.1: 90 taller, so a tall rectangle), about 2.4 times as wide inside (EX more), so they
// line up almost side by side across the middle of the wall
const EX = 104, CW = 150 + EX, CH = 420, PIPE_X = CW / 2 + 22; // where the feed pipe comes in
// (3.0.43) drawn by its real length: the largest (2.4 m, a Legendary giant) fills `max`, and every size below is
// smaller in proportion (gently compressed, so a 10 cm fish is still seen): a giant outsizes a tuna, a tuna a frogfish
export const sizeK = (len) => Math.pow(Math.min(len || 0.1, 2.4) / 2.4, 0.62);
const tankLen = (len, max) => Math.max(14, max * sizeK(len));
// (3.2.0) a fish's real half-height and half-length (as shares of its length), and the box its centre may swim in
// so that every part of it stays between x0..x1 and y0..y1 (swim keeps the centre half a length from the sides)
const halfH = (sp) => { const B = speciesBox(sp); return Math.max(0.08, Math.abs(B.y0), Math.abs(B.y1)); };
const halfW = (sp) => { const B = speciesBox(sp); return Math.max(0.3, Math.abs(B.x0), Math.abs(B.x1)); };
function inside(sp, L, x0, x1, y0, y1) {
  const hy = Math.min(halfH(sp) * L, (y1 - y0) / 2), hx = Math.max(0, halfW(sp) - 0.5) * L;
  return { x0: x0 + hx, x1: Math.max(x0 + hx, x1 - hx), y0: y0 + hy, y1: Math.max(y0 + hy, y1 - hy) };
}
// (3.2.1) the colour of the water at a depth, as the porthole shows it
const SEA = [[0, [90, 190, 200]], [60, [40, 130, 170]], [200, [16, 64, 120]], [500, [6, 24, 58]], [1000, [1, 4, 10]]];
function seaAt(d) {
  for (let i = 1; i < SEA.length; i++) if (d <= SEA[i][0]) { const [d0, c0] = SEA[i - 1], [d1, c1] = SEA[i], q = (d - d0) / (d1 - d0); return c0.map((v, k) => lerp(v, c1[k], q)); }
  return SEA[SEA.length - 1][1].slice();
}
// how an animal is doing, in a word, and its colour
function stateOf(g, s, inBag) {
  if (s.cond <= 0.05) return ['dead', '#9a9a9a'];
  if (gapOf(g, s, inBag) > SAFE_GAP) return ['dying: barotrauma', '#ff6a50'];
  if (s.acc) return ['acclimated', '#8fd4ff'];
  if (s.cond < 0.5) return ['weak', '#e6503c'];
  if (s.cond < 0.8) return ['stressed', '#e8b040'];
  return ['healthy', '#78dc8c'];
}

export class TankRoom {
  constructor(root, hooks) {
    this.root = root; this.h = hooks;
    this.anim = new WeakMap();
    this.t = 0; this.room = 'chambers'; this.openKey = null; this.sig = ''; this.infoT = 0;
    root.innerHTML = `<canvas class="tr-canvas"></canvas><div class="tr-over"></div>
      <div class="tr-plate"><b class="tr-room"></b><span class="tr-depth"></span></div>
      <button class="tr-help-btn" aria-label="How it works">?</button><button class="tr-close" aria-label="Close">×</button>
      <div class="tr-help" hidden></div><div class="gl-lights tr-lights"></div>`;
    this.c = root.querySelector('.tr-canvas'); this.over = root.querySelector('.tr-over');
    root.querySelector('.tr-close').addEventListener('click', () => this.h.close());
    root.querySelector('.tr-lights').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-light]'); const g = this.h.getGame(); if (b && g && g.profile) { g.profile.subTankLight = b.dataset.light; this.lightsHtml(g); } });
    root.querySelector('.tr-help-btn').addEventListener('click', () => { const hp = root.querySelector('.tr-help'); hp.hidden = !hp.hidden; });
    root.querySelector('.tr-help').innerHTML = `<p>Every animal has the pressure it lives at. Up to ${SAFE_GAP} m away from it, shallower or deeper, it lives, stressed; further, it starts to die. Taking a shallow animal deep hurts it as much as bringing a deep one up.</p>
      <p>A chamber pumps an animal back up to its own pressure and it recovers there. Its rating is how much more than the water outside it can hold: it keeps an animal safe until the sub climbs above the animal's depth less the rating. The gauge's green band is what it can hold where you are.</p>
      <p>Nothing moves on its own: drag a fish from the catch bag (it hangs in both rooms) onto a chamber or into the open tank, or back into the bag to carry it through the hatch.</p>
      <p>A Legendary, or anything 1.2 m and longer, is too big for a chamber: only the large pressure tank holds one (its own room, through the tank room's far hatch). It takes three animals, or one big one.</p>
      <p>Dead animals sell for half the plain market price.</p>`;
    this.over.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-tk]');
      if (b) { if (!b.disabled) { const [act, where, i, to] = b.dataset.tk.split(':'); if (act === 'swaps') { this.card.swaps = !this.card.swaps; this.layout(true); return; } this.h.act(act, where, +i, to === undefined ? -1 : +to); this.openKey = null; this.card = null; this.layout(true); } return; }
      if (ev.target.closest('.tr-card')) return;
      const tag = ev.target.closest('[data-tag]');
      if (tag) { this.openKey = this.openKey === tag.dataset.tag ? null : tag.dataset.tag; this.layout(true); return; }
      const go = ev.target.closest('[data-go]');
      if (go) { this.room = go.dataset.go; this.openKey = null; this.layout(true); }
    });
    // press on a fish and drag it somewhere; a tap (no drag) opens its tag, or closes an open one
    this.c.addEventListener('pointerdown', (ev) => {
      const item = this.grabAt(ev.clientX, ev.clientY);
      this.press = { x: ev.clientX, y: ev.clientY, item };
      if (item) this.c.setPointerCapture(ev.pointerId);
    });
    this.c.addEventListener('pointermove', (ev) => {
      this.pointer = { x: ev.clientX, y: ev.clientY };
      if (this.press && this.press.item && !this.drag && Math.hypot(ev.clientX - this.press.x, ev.clientY - this.press.y) > 6) {
        this.drag = { ...this.press.item }; this.openKey = null;
      }
      this.c.style.cursor = this.drag ? 'grabbing' : this.grabAt(ev.clientX, ev.clientY) ? 'grab' : 'default';
    });
    this.c.addEventListener('pointerup', (ev) => {
      const press = this.press; this.press = null;
      if (this.drag) {
        const d = this.drag;
        // (2.7.4) a fish already swimming in the open tank, dropped in it: it stays where it was put, then carries on
        if (this.room === 'tank' && d.where === 'tank' && !d.s.pressed && !d.s.pile) {
          const T = this.geometry().tank, a = this.anim.get(d.s);
          if (a && ev.clientX > T.x && ev.clientX < T.x + T.w && ev.clientY > T.y && ev.clientY < T.y + T.h) {
            a.x = a.tx = ev.clientX - T.x; a.y = a.ty = ev.clientY - T.y; a.vx = a.vy = 0; a.retT = 2 + Math.random() * 2; a.placed = true;
            this.drag = null; this.layout(true); return;
          }
        }
        const tgt = this.dropAt(ev.clientX, ev.clientY), why = tgt ? null : this.whyNot(ev.clientX, ev.clientY); this.drag = null;
        if (why) { const g = this.h.getGame(); if (g) g.roomMsg = { text: why, t: performance.now() }; }
        if (tgt) {
          if (tgt.kind === 'chamber') this.h.act('press', d.where, d.i, tgt.n);
          else if (tgt.kind === 'tank') this.h.act('open', d.where, d.i);
          else if (tgt.kind === 'bag') this.h.act('tobag', d.where, d.i);
        }
        this.layout(true);
        return;
      }
      if (!press) return;
      const hit = this.hitTest(ev.clientX, ev.clientY) || (press.item ? this.keyOf(press.item.s) : null);
      this.openKey = hit && hit !== this.openKey ? hit : null;
      this.card = this.openKey ? { key: this.openKey, x: ev.clientX, y: ev.clientY } : null;
      this.layout(true);
    });
    this.c.addEventListener('pointercancel', () => { this.press = null; this.drag = null; });
    this.onKey = (ev) => {
      if (this.root.hidden) return;
      // (3.2.0) three rooms in a row: the chambers, the open tank, the large tank
      const i = ROOM_ORDER.indexOf(this.room), to = ev.key === 'ArrowRight' ? ROOM_ORDER[i + 1] : ev.key === 'ArrowLeft' ? ROOM_ORDER[i - 1] : null;
      if (to) { this.room = to; this.openKey = null; this.card = null; this.layout(true); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  open() { this.openKey = null; this.sig = ''; this.layout(true); }

  // ---------------- where things go on screen ----------------
  geometry() {
    const W = window.innerWidth, H = window.innerHeight, narrow = W < 700;
    const g = this.h.getGame(), ps = g ? pressSlots(g) : 1;
    // on a narrow screen: only the fitted chambers and one empty bracket, the hatch at the bottom
    // (3.2.0) the wide chambers in a row across the middle of the wall, almost touching
    const n = narrow ? Math.min(MAX_CHAMBERS, ps + 1) : MAX_CHAMBERS, areaW = narrow ? W * 0.96 : W * 0.66, x0 = narrow ? W * 0.02 : W * 0.155;
    // each one's fittings on the left tuck into the space beside the one before: STEP apart, in its own units
    const STEP = 226, span = (n - 1) * STEP + CW;
    const k = Math.min((H * (narrow ? 0.4 : 0.52)) / CH, areaW / span);
    const left = x0 + (areaW - span * k) / 2, top = narrow ? H * 0.3 : H * 0.5 - CH * k / 2;
    const chambers = Array.from({ length: n }, (_, i) => ({ x: left + i * STEP * k, y: top, k }));
    // on a narrow screen both hatches sit along the bottom
    const hatchSide = (x) => (narrow ? { x: x < W / 2 ? W * 0.22 : W * 0.78, y: H * 0.86, r: Math.min(W, H) * 0.08 } : { x, y: H * 0.66, r: Math.min(W, H) * 0.13 });
    return { W, H, k, narrow, chambers, tagY: top + CH * k + 10, floor: H * 0.9,
      port: narrow ? null : { x: W * 0.9, y: H * 0.3, r: Math.max(34, Math.min(W, H) * 0.075) },
      hatchR: hatchSide(W * 0.92), hatchL: hatchSide(W * 0.07),
      tank: narrow ? { x: W * 0.05, y: H * 0.13, w: W * 0.9, h: H * 0.3 } : { x: W * 0.17, y: H * 0.14, w: W * 0.6, h: Math.min(H * 0.42, W * 0.3) },
      // the net's haul heaped on the floor, and the large pressure tank on its saddles beside it
      pile: narrow ? { x: W * 0.06, y: H * 0.66, w: W * 0.42 } : { x: W * 0.2, y: H * 0.88, w: W * 0.25 },
      // (3.2.0) the large pressure tank has a room of its own: one chamber laid on its side, long and wide
      big: narrow ? { x: W * 0.05, y: H * 0.36, w: W * 0.9, h: H * 0.2 } : { x: W * 0.16, y: H * 0.42, w: W * 0.68, h: Math.min(H * 0.3, W * 0.17) }, // (3.2.1) wider, centred
      // the catch bag hangs on a hook in each room (on the left of the chamber room, the right of the
      // tank room); it grows with what is in it, and its tags hang below it on cords
      hook: this.room === 'chambers' ? (narrow ? { x: W * 0.87, y: H * 0.1 } : { x: W * 0.085, y: H * 0.16 }) : (narrow ? { x: W * 0.84, y: this.room === 'big' ? H * 0.1 : H * 0.5 } : { x: W * 0.87, y: H * 0.16 }),
      bagTags: !(narrow && this.room === 'chambers'),
      bagH: (n) => 84 + Math.min(4, n) * 22,
      bagTag(i, n) { return narrow ? [W * 0.4, H * 0.5 + i * 104] : [this.hook.x - 8, this.hook.y + 8 + 84 + Math.min(4, n) * 22 + 34 + i * 100]; } };
  }
  signature(g) {
    return [this.room, this.openKey, pressSlots(g), tankSlots(g), g.subTank.map((s) => `${s.id}${s.pressed ? 'p' + s.chamber : s.pile ? 'h' : 'o'}`).join(','), hasBigTank(g) ? 'B' : '', g.bag.map((s) => s.id).join(','), window.innerWidth, window.innerHeight].join('|');
  }
  keyOf(s) { if (!s._k) s._k = 'k' + Math.random().toString(36).slice(2, 9); return s._k; }

  // the tags (HTML over the canvas), rebuilt when something moves; their state words refreshed often
  layout(force) {
    const g = this.h.getGame();
    if (!g) return;
    const sig = this.signature(g);
    if (!force && sig === this.sig) { this.states(g); return; }
    this.sig = sig;
    const G = this.geometry();
    this.root.querySelector('.tr-room').textContent = ROOMS[this.room];
    let html = '';
    const go = (to, side, label) => `<button class="hatch-btn" data-go="${to}" style="left:${G[side].x}px;top:${G[side].y}px">${label}</button>`;
    if (this.room === 'chambers') html += go('tank', 'hatchR', 'The tank room →');
    else if (this.room === 'tank') html += go('chambers', 'hatchL', '← The chamber room') + go('big', 'hatchR', 'The large tank →');
    else html += go('tank', 'hatchL', '← The tank room');
    if (this.room === 'big' && !hasBigTank(g)) html += `<div class="tr-note" style="left:${G.big.x + G.big.w / 2}px;top:${G.big.y + G.big.h / 2}px"><b>Not fitted yet</b><span>The large pressure tank goes on this cradle: three animals, or one big one. The sub's yard sells it (the computer in the cabin).</span></div>`;
    html += this.cardHtml(g, G);
    const into = { chambers: 'a chamber, or into the tank next door (→)', tank: 'the tank', big: hasBigTank(g) ? 'the large tank' : 'the tank next door (←)' }[this.room];
    if (g.bag.length && !this.drag) html += `<div class="tr-dragnote">${g.bag.length} in the bag · drag ${g.bag.length > 1 ? 'them' : 'it'} into ${into}</div>`;
    this.over.innerHTML = html;
    this.states(g);
  }
  // the card for the animal clicked: its name, where it was found, how it is, and what can be done
  cardHtml(g, G) {
    const C = this.card; if (!C) return '';
    let where = 'tank', i = g.subTank.findIndex((q) => q._k === C.key);
    if (i < 0) { where = 'bag'; i = g.bag.findIndex((q) => q._k === C.key); }
    if (i < 0) { this.card = null; this.openKey = null; return ''; }
    const s = where === 'bag' ? g.bag[i] : g.subTank[i], sp = SPECIES_BY_ID[s.id];
    const inChamber = where === 'tank' && s.pressed && s.chamber !== BIG, inOpen = where === 'tank' && !s.pressed && !s.pile;
    const free = freeChamber(g), btn = (label, tk, on = true) => `<button data-tk="${tk}" ${on ? '' : 'disabled'}>${label}</button>`;
    let acts = '';
    const big = tooBig(s), inBig = where === 'tank' && s.pressed && s.chamber === BIG;
    if (big) { // (3.1.0) too big for a chamber: the large pressure tank, or nothing
      if (!inBig) acts += hasBigTank(g) ? btn('Into the large tank', `press:${where}:${i}:${BIG}`, bigFits(g, s)) : '<small class="tc-big">Too big for a chamber: it needs the large pressure tank</small>';
    } else if (!inChamber) {
      if (free >= 0) acts += btn('Into a chamber', `press:${where}:${i}:${free}`);
      else if (pressSlots(g) > 0) acts += btn('Swap with a chamber…', `swaps:${where}:${i}`);
    }
    if (!inOpen) acts += btn('Into the open tank', `open:${where}:${i}`, tankFits(g, { ...s, pressed: false, pile: false }));
    if (where !== 'bag') acts += btn('Into the bag', `tobag:${where}:${i}`, g.bag.length < bagSlots(g));
    acts += btn('Let go', `release:${where}:${i}`);
    let swaps = '';
    if (C.swaps) {
      const occ = g.subTank.filter((q) => q.pressed && q.chamber !== BIG && q !== s).sort((a, b) => a.chamber - b.chamber);
      swaps = `<div class="tr-swaps">${occ.map((o) => btn(`↔ ${SPECIES_BY_ID[o.id].name} <small>chamber ${o.chamber + 1}</small>`, `swap:${where}:${i}:${o.chamber}`)).join('')}</div>`;
    }
    // (3.0.8) a small tag: its picture, the name in its rarity's colour, the scientific name, where it lives,
    // where it was found, what it sells for, how it is; small buttons in a row
    if (!this.pics) this.pics = new Map();
    if (!this.pics.has(sp.id)) this.pics.set(sp.id, fittedIcon(sp, 192, 120).toDataURL()); // (3.2.0) every animal the same size here
    const R = rarityOf(sp), price = specimenValue(s);
    const x = clamp(C.x + 16, 12, G.W - 250), y = clamp(C.y - 20, 12, G.H - 230);
    return `<div class="tr-card${rarityCls(sp)}" data-tag="${C.key}" data-where="${where}" data-i="${i}" style="left:${x}px;top:${y}px">${rarityStars(sp)}
      <div class="tc-top"><img src="${this.pics.get(sp.id)}" alt=""><div><b style="color:${R.col}">${sp.name}</b><i class="sci">${sp.species ? sp.species + ' · ' : ''}${sp.sci || ''}</i></div></div>
      ${s.variant ? `<em class="rarel r-${s.variant}">rare form: ${s.variant}</em>` : ''}
      <div class="tc-facts"><span>Found at: ${s.from || 0} m${inChamber ? ` · chamber ${s.chamber + 1}` : inBig ? ' · the large tank' : ''}</span><span>Habitat: ${sp.dmin.toLocaleString()}–${sp.dmax.toLocaleString()} m</span><span>Value: <b>${money(price)}</b></span></div>
      <i class="st"></i><div class="acts">${acts}</div>${swaps}</div>`;
  }
  states(g) {
    // (3.0.15) a refusal (the tank is full, the chambers are full...), shown in the room for 2.5 s
    let msg = this.root.querySelector('.tr-msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'tr-msg'; this.root.appendChild(msg); }
    const M = g.roomMsg, on = !!M && performance.now() - M.t < 2500;
    if (on && msg.textContent !== M.text) msg.textContent = M.text;
    msg.classList.toggle('on', on);
    this.root.querySelector('.tr-depth').textContent = `outside ${Math.max(0, Math.round(g.sub.y))} m`;
    this.over.querySelectorAll('[data-tag]').forEach((el) => {
      const where = el.dataset.where, s = (where === 'bag' ? g.bag : g.subTank)[+el.dataset.i];
      if (!s) return;
      const [w, col] = stateOf(g, s, where === 'bag');
      const st = el.querySelector('.st');
      const txt = `<span style="background:${col}"></span>${w}`;
      if (st.innerHTML !== txt) st.innerHTML = txt;
    });
  }
  // a fish that can be picked up here: { s, where, i }
  grabAt(cx, cy) {
    const g = this.h.getGame();
    if (!g) return null;
    const b = this.bagFishAt(cx, cy);
    if (b >= 0) return { s: g.bag[b], where: 'bag', i: b };
    if (this.room !== 'chambers') for (const f of this.room === 'tank' ? this.pileFish || [] : this.bigFish || []) {
      if (Math.hypot(f.x - cx, f.y - cy) < Math.max(20, f.L * 0.45)) { const i = g.subTank.indexOf(f.s); if (i >= 0) return { s: f.s, where: 'tank', i }; }
    }
    const key = this.hitTest(cx, cy, true);
    if (!key) return null;
    const i = g.subTank.findIndex((q) => q._k === key);
    return i >= 0 ? { s: g.subTank[i], where: 'tank', i } : null;
  }
  bagFishAt(cx, cy) {
    for (const f of this.bagFish || []) if (Math.hypot(f.x - cx, f.y - cy) < Math.max(22, f.L * 0.5)) return f.i;
    const r = this.bagBox;
    if (r && cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1 && (this.bagFish || []).length) return this.bagFish[0].i;
    return -1;
  }
  // where a dragged fish would go if dropped here
  dropAt(cx, cy) {
    const g = this.h.getGame(), G = this.geometry();
    if (!g || !this.drag) return null;
    const r = this.bagBox;
    if (r && cx > r.x0 - 20 && cx < r.x1 + 20 && cy > r.y0 - 20 && cy < r.y1 + 20 && this.drag.where !== 'bag' && g.bag.length < bagSlots(g)) return { kind: 'bag' };
    if (this.room === 'chambers') {
      const ps = pressSlots(g);
      for (const [n, c] of G.chambers.entries()) {
        if (n >= ps) continue;
        if (cx >= c.x - 10 && cx <= c.x + CW * c.k + 10 && cy >= c.y - 10 && cy <= c.y + CH * c.k + 10) {
          const occ = g.subTank.find((q) => q.pressed && q.chamber === n);
          return (!occ || occ === this.drag.s) && !tooBig(this.drag.s) ? { kind: 'chamber', n, c } : null;
        }
      }
      return null;
    }
    const T = G.tank, d = this.drag.s;
    if (this.room === 'big') {
      const B = G.big;
      if (hasBigTank(g) && cx > B.x - 10 && cx < B.x + B.w + 10 && cy > B.y - 20 && cy < B.y + B.h + 20 && !(d.pressed && d.chamber === BIG) && bigFits(g, d)) return { kind: 'chamber', n: BIG, big: true };
      return null;
    }
    if (cx > T.x && cx < T.x + T.w && cy > T.y && cy < T.y + T.h && (this.drag.where === 'bag' || d.pressed || d.pile) && tankFits(g, { len: d.len })) return { kind: 'tank' };
    return null;
  }
  // (3.2.0) dropped somewhere it can't go: why, in a sentence (null if it wasn't dropped on anything)
  whyNot(cx, cy) {
    const g = this.h.getGame(), G = this.geometry(), d = this.drag; if (!g || !d) return null;
    const s = d.s, nm = SPECIES_BY_ID[s.id].name, the = /^the /i.test(nm) ? 'The' + nm.slice(3) : 'The ' + nm.toLowerCase();
    if (this.room === 'chambers') {
      for (const [n, c] of G.chambers.entries()) {
        if (!(cx >= c.x - 10 && cx <= c.x + CW * c.k + 10 && cy >= c.y - 10 && cy <= c.y + CH * c.k + 10)) continue;
        if (n >= pressSlots(g)) return 'That chamber isn\'t fitted yet: the sub\'s yard fits more';
        if (tooBig(s)) return `${the} is too big for a chamber: only the large pressure tank holds it`;
        if (s.pressed && s.chamber === n) return null;
        return 'That chamber is in use: drag its animal out first';
      }
      return null;
    }
    if (this.room === 'big') {
      const B = G.big;
      if (!(cx > B.x - 10 && cx < B.x + B.w + 10 && cy > B.y - 20 && cy < B.y + B.h + 20)) return null;
      if (!hasBigTank(g)) return 'The large pressure tank isn\'t fitted yet: the sub\'s yard sells it';
      if (s.pressed && s.chamber === BIG) return null;
      return tooBig(s) ? 'The large tank holds one big animal at a time, and it has animals in it' : 'The large tank holds three, or one big animal: it is full';
    }
    const T = G.tank;
    if (cx > T.x && cx < T.x + T.w && cy > T.y && cy < T.y + T.h && (d.where === 'bag' || s.pressed || s.pile))
      return s.len >= 0.6 ? `The open tank has no room for a fish that size (${s.len >= 1.2 ? 3 : 2} places)` : 'The open tank is full';
    return null;
  }
  hitTest(cx, cy, fishOnly = false) {
    const g = this.h.getGame(), G = this.geometry();
    if (!g) return null;
    if (!fishOnly) { const b = this.bagFishAt(cx, cy); if (b >= 0) return this.keyOf(g.bag[b]); }
    if (this.room === 'chambers') {
      for (const [n, c] of G.chambers.entries()) {
        if (cx >= c.x && cx <= c.x + CW * c.k && cy >= c.y && cy <= c.y + CH * c.k) {
          const s = g.subTank.find((q) => q.pressed && q.chamber === n);
          return s ? this.keyOf(s) : null;
        }
      }
      return null;
    }
    let best = null, bd = 60;
    if (this.room === 'big') {
      for (const f of this.bigFish || []) { const d = Math.hypot(f.x - cx, f.y - cy); if (d < Math.max(bd, f.L * 0.5)) { bd = d; best = f.s; } }
      return best ? this.keyOf(best) : null;
    }
    for (const s of g.subTank) {
      if (s.pressed || s.pile) continue;
      const a = this.anim.get(s);
      if (!a) continue;
      const d = Math.hypot(G.tank.x + a.x - cx, G.tank.y + a.y - cy);
      if (d < bd) { bd = d; best = s; }
    }
    return best ? this.keyOf(best) : null;
  }

  // (3.0.25) the open tank's light: Daylight, Dim, or the Red deep animals can't see (shown in the tank room)
  lightsHtml(g) {
    const el = this.root.querySelector('.tr-lights'); if (!el) return;
    const cur = (g.profile && g.profile.subTankLight) || 'day', show = this.room === 'tank';
    const html = show ? Object.entries(TANK_LIGHTS).map(([k, L]) => `<button data-light="${k}" class="${k === cur ? 'on' : ''}">${L.name}</button>`).join('') : '';
    if (el.innerHTML !== html) el.innerHTML = html;
    el.hidden = !show;
  }
  update(dt) {
    const g = this.h.getGame();
    if (!g) return;
    this.t += dt; this.infoT += dt;
    this.lightsHtml(g);
    if (this.signature(g) !== this.sig) this.layout(true);
    else if (this.infoT > 0.3) { this.infoT = 0; this.states(g); }
    const G = this.geometry(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = this.c;
    if (c.width !== Math.round(G.W * dpr) || c.height !== Math.round(G.H * dpr)) { c.width = Math.round(G.W * dpr); c.height = Math.round(G.H * dpr); this.wall = null; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawWall(ctx, G, dpr);
    if (this.room === 'chambers') this.drawChamberRoom(ctx, G, g, dt);
    else if (this.room === 'big') this.drawBigRoom(ctx, G, g, dt);
    else this.drawTankRoom(ctx, G, g, dt);
    this.drawBag(ctx, G, g);
    this.drawLamp(ctx, G);
    this.drawDragged(ctx, G, g);
  }
  // the fish in hand follows the pointer, wriggling; where it would land glows
  drawDragged(ctx, G, g) {
    const d = this.drag, p = this.pointer;
    if (!d || !p) return;
    const tgt = this.dropAt(p.x, p.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(240,212,138,0.85)'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(240,212,138,0.8)'; ctx.shadowBlur = 16;
    if (tgt && tgt.big) { const B = G.big; ctx.beginPath(); ctx.roundRect(B.x - 8, B.y - B.h * 0.12, B.w + 16, B.h * 1.24, 10); ctx.stroke(); }
    else if (tgt && tgt.kind === 'chamber') { const c = tgt.c; ctx.strokeRect(c.x - 6, c.y - 6, CW * c.k + 12, CH * c.k + 12); }
    else if (tgt && tgt.kind === 'tank') ctx.strokeRect(G.tank.x - 4, G.tank.y - 4, G.tank.w + 8, G.tank.h + 8);
    else if (tgt && tgt.kind === 'bag' && this.bagBox) { const r = this.bagBox; ctx.strokeRect(r.x0 - 8, r.y0 - 8, r.x1 - r.x0 + 16, r.y1 - r.y0 + 16); }
    ctx.restore();
    const sp = SPECIES_BY_ID[d.s.id], L = clamp(tankLen(d.s.len, 110), 40, 110);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(this.t * 9) * 0.12);
    if (d.s.cond <= 0.05) ctx.scale(1, -1);
    ctx.globalAlpha = tgt ? 1 : 0.85;
    drawSpecies(ctx, sp, L, this.t * 2, d.s.cond > 0.05 ? 1 : 0, 0);
    ctx.restore();
  }

  // ---------------- the steel ----------------
  // riveted plates, weld seams, rust weeping from the rivets, a deck grating: made once per size
  drawWall(ctx, G, dpr) {
    if (!this.wall) {
      const wc = document.createElement('canvas'); wc.width = Math.round(G.W * dpr); wc.height = Math.round(G.H * dpr);
      const x = wc.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      let sd = 7;
      const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const bg = x.createLinearGradient(0, 0, 0, G.H);
      bg.addColorStop(0, '#3a4142'); bg.addColorStop(0.6, '#2b3132'); bg.addColorStop(1, '#1b1f20');
      x.fillStyle = bg; x.fillRect(0, 0, G.W, G.H);
      // plates: each a slightly different tone, with a soft sheen
      const pw = Math.max(160, G.W / 6), ph = Math.max(120, G.H / 4.5);
      for (let py = 0; py < G.floor; py += ph) for (let px = -((py / ph) % 2) * pw / 2; px < G.W; px += pw) {
        const tone = rnd() * 0.08 - 0.04;
        x.fillStyle = tone > 0 ? `rgba(255,255,255,${tone})` : `rgba(0,0,0,${-tone * 1.5})`;
        x.fillRect(px, py, pw, ph);
        const sh = x.createLinearGradient(px, py, px + pw, py + ph);
        sh.addColorStop(0, 'rgba(255,255,255,0.04)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.08)');
        x.fillStyle = sh; x.fillRect(px, py, pw, ph);
        // seams
        x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        x.strokeStyle = 'rgba(255,255,255,0.07)'; x.lineWidth = 1; x.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
        // rivets along the edges, some weeping rust
        for (let k = 0; k < 2; k++) for (let r = 10; r < pw - 4; r += 18) {
          const rx = px + r, ry = py + (k ? ph - 8 : 8);
          if (rnd() < 0.08) { const rg = x.createLinearGradient(0, ry, 0, ry + 30 + rnd() * 40); rg.addColorStop(0, 'rgba(120,60,20,0.35)'); rg.addColorStop(1, 'rgba(120,60,20,0)'); x.fillStyle = rg; x.fillRect(rx - 2, ry, 4 + rnd() * 3, 70); }
          x.fillStyle = '#1a1d1e'; x.beginPath(); x.arc(rx + 0.6, ry + 0.8, 2.6, 0, TAU); x.fill();
          x.fillStyle = '#6b7476'; x.beginPath(); x.arc(rx, ry, 2.3, 0, TAU); x.fill();
          x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(rx - 0.7, ry - 0.7, 0.9, 0, TAU); x.fill();
        }
      }
      // grime toward the floor
      const gr = x.createLinearGradient(0, G.floor - 160, 0, G.floor);
      gr.addColorStop(0, 'rgba(10,8,5,0)'); gr.addColorStop(1, 'rgba(10,8,5,0.45)');
      x.fillStyle = gr; x.fillRect(0, G.floor - 160, G.W, 160);
      // deck grating
      x.fillStyle = '#141718'; x.fillRect(0, G.floor, G.W, G.H - G.floor);
      x.strokeStyle = '#3a4143'; x.lineWidth = 2;
      for (let gx = -G.H; gx < G.W + G.H; gx += 14) { x.beginPath(); x.moveTo(gx, G.floor); x.lineTo(gx + (G.H - G.floor), G.H); x.stroke(); }
      x.fillStyle = '#4a5254'; x.fillRect(0, G.floor - 3, G.W, 5);
      this.wall = wc;
    }
    ctx.drawImage(this.wall, 0, 0, G.W, G.H);
  }
  // the caged bulkhead lamp, and its warm pool of light
  drawLamp(ctx, G) {
    const lx = G.W * 0.45, ly = 10, flick = 0.92 + 0.08 * Math.sin(this.t * 13) * Math.sin(this.t * 3.1);
    const lg = ctx.createRadialGradient(lx, ly + 20, 10, lx, ly + G.H * 0.3, G.H * 0.85);
    lg.addColorStop(0, `rgba(255,214,150,${(0.16 * flick).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, G.W, G.H);
    const vg = ctx.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.4, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = '#1b1d1e'; ctx.fillRect(lx - 26, ly - 10, 52, 12);
    ctx.fillStyle = `rgba(255,226,170,${flick.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(lx, ly + 12, 16, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2d2e'; ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(lx + k * 7, ly); ctx.quadraticCurveTo(lx + k * 9, ly + 24, lx + k * 3, ly + 24); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(lx, ly + 12, 19, 13, 0, 0, TAU); ctx.stroke();
  }
  drawHatch(ctx, h, label) {
    // a round watertight door in the bulkhead, dogged shut, with its handwheel
    ctx.save(); ctx.translate(h.x, h.y);
    ctx.fillStyle = '#1d2122'; ctx.beginPath(); ctx.arc(0, 0, h.r + 10, 0, TAU); ctx.fill();
    const dg = ctx.createRadialGradient(-h.r * 0.3, -h.r * 0.3, 4, 0, 0, h.r);
    dg.addColorStop(0, '#5d6668'); dg.addColorStop(1, '#2c3233');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7c8587';
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * (h.r + 4), Math.sin(a) * (h.r + 4), 2.5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#8a9294'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, h.r * 0.42, 0, TAU); ctx.stroke();
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + this.t * 0.0; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * h.r * 0.42, Math.sin(a) * h.r * 0.42); ctx.stroke(); }
    ctx.fillStyle = '#8a9294'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------- the chamber room ----------------
  drawChamberRoom(ctx, G, g, dt) {
    const rating = chamberRating(g), cmax = chamberMax(g), ps = pressSlots(g), outside = Math.max(0, g.sub.y);
    const by = new Map(g.subTank.filter((s) => s.pressed).map((s) => [s.chamber, s]));
    // the pipe run along the bulkhead, dropping to each chamber's head
    const py = G.chambers[0].y - 70; // (3.2.1) the pipe run higher up the wall: they hang from longer drops
    ctx.fillStyle = '#4b5355'; ctx.fillRect(0, py - 6, G.W * 0.82, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, py - 5, G.W * 0.82, 3);
    G.chambers.forEach((c, n) => {
      if (n >= ps) return;
      const tx = c.x + PIPE_X * c.k;
      ctx.fillStyle = '#4b5355'; ctx.fillRect(tx - 3, py, 6, c.y + 14 * c.k - py);
      ctx.fillStyle = '#606a6c'; ctx.fillRect(tx - 7, py - 8, 14, 16);
    });
    // the porthole: the sea outside, darker the deeper
    const P = G.port, d = outside;
    if (P) {
    ctx.save(); ctx.translate(P.x, P.y);
    ctx.fillStyle = '#a07a34'; ctx.beginPath(); ctx.arc(0, 0, P.r + 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a4e1c'; ctx.beginPath(); ctx.arc(0, 0, P.r + 4, 0, TAU); ctx.fill();
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; ctx.fillStyle = '#c9a65a'; ctx.beginPath(); ctx.arc(Math.cos(a) * (P.r + 8), Math.sin(a) * (P.r + 8), 2.2, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, P.r, 0, TAU); ctx.clip();
    // (3.2.1) the sea outside by depth: sunlit blue-green, the twilight's deep blue, black by 1,000 m
    const dk = clamp(d / 1000, 0, 1), top = seaAt(d), bot = seaAt(d + 120).map((v) => v * 0.55);
    const wg = ctx.createLinearGradient(0, -P.r, 0, P.r);
    wg.addColorStop(0, `rgb(${top.map(Math.round).join(',')})`);
    wg.addColorStop(1, `rgb(${bot.map(Math.round).join(',')})`);
    ctx.fillStyle = wg; ctx.fillRect(-P.r, -P.r, P.r * 2, P.r * 2);
    for (let k = 0; k < 26; k++) {
      const q = (this.t * 0.04 + k * 0.618) % 1, sx = Math.sin(k * 12.9) * P.r, sy = -P.r + q * P.r * 2;
      ctx.fillStyle = `rgba(220,230,235,${(0.5 - dk * 0.2).toFixed(3)})`; ctx.fillRect(sx + Math.sin(this.t + k) * 3, sy, 1.5, 1.5);
    }
    if (d > 250) for (let k = 0; k < 4; k++) { const tw = Math.pow(Math.max(0, Math.sin(this.t * 0.6 + k * 2.3)), 10); if (tw > 0.05) { ctx.fillStyle = `rgba(110,230,215,${(0.8 * tw).toFixed(3)})`; ctx.beginPath(); ctx.arc(Math.sin(k * 5.1) * P.r * 0.6, Math.cos(k * 3.7) * P.r * 0.6, 2, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-P.r * 0.35, -P.r * 0.4, P.r * 0.35, P.r * 0.15, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    }
    // the chambers, and empty brackets where more will go
    G.chambers.forEach((c, n) => {
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.k, c.k);
      if (n >= ps) this.drawBracket(ctx);
      else this.drawChamber(ctx, g, by.get(n), rating, cmax, outside, dt, n);
      ctx.restore();
    });
    this.drawHatch(ctx, G.hatchR);
  }
  drawBracket(ctx) {
    // straps and bolt holes on the bulkhead, waiting for a chamber
    ctx.strokeStyle = 'rgba(150,160,162,0.35)'; ctx.lineWidth = 6;
    for (const y of [110, CH - 50]) { ctx.beginPath(); ctx.ellipse(CW / 2, y, 40 + EX / 2, 40, 0, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (const [x, y] of [[30, 110], [CW - 30, 110], [30, CH - 50], [CW - 30, CH - 50]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
  }
  drawChamber(ctx, g, s, rating, cmax, outside, dt, idx) {
    const t = this.t, cx = CW / 2, X0 = 38, X1 = 112 + EX, TOP = 92, BOT = CH - 18;
    // wall straps behind it
    ctx.fillStyle = '#2a2f30'; for (const y of [120, CH - 60]) ctx.fillRect(28, y - 5, 94 + EX, 10);
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.moveTo(40, 92); ctx.lineTo(6, 86); ctx.quadraticCurveTo(2, 90, 6, 95); ctx.lineTo(40, 99); ctx.fill();
    const body = new Path2D();
    body.moveTo(X0, TOP); body.lineTo(X1, TOP); body.lineTo(X1, BOT - 12); body.quadraticCurveTo(X1, BOT, X1 - 12, BOT); body.lineTo(X0 + 12, BOT); body.quadraticCurveTo(X0, BOT, X0, BOT - 12); body.closePath();
    const wg = ctx.createLinearGradient(X0, 0, X1, 0);
    wg.addColorStop(0, 'rgba(28,30,110,0.95)'); wg.addColorStop(0.35, 'rgba(70,80,190,0.78)'); wg.addColorStop(0.6, 'rgba(84,96,205,0.74)'); wg.addColorStop(1, 'rgba(24,26,96,0.95)');
    ctx.fillStyle = wg; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    ctx.fillStyle = 'rgba(40,40,48,0.8)'; ctx.beginPath(); ctx.arc(cx, BOT - 76, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,40,40,0.75)'; ctx.beginPath(); ctx.arc(cx - 3, BOT - 79, 6, Math.PI * 0.8, Math.PI * 1.8); ctx.fill();
    ctx.strokeStyle = 'rgba(150,150,170,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 0; k <= 12; k++) ctx.lineTo(cx - 12 + k * 2, BOT - 54 + (k % 2 ? -4 : 4)); ctx.stroke();
    const home = s ? homeOf(s) : 0, pumping = s && (s.press || 0) < Math.min(home, cmax) - 1;
    if (s && !(this.drag && this.drag.s === s)) {
      const L = Math.max(26, 128 * Math.pow(Math.min(s.len || 0.1, 1.2) / 1.2, 0.6)) * Math.min(1, this.chamberFish || 1); // (a chamber holds up to 1.2 m)
      const a = this.swim(g, s, false, inside(SPECIES_BY_ID[s.id], L, X0 + 4, X1 - 4, TOP + 26, BOT - 10), L, dt, 0.6);
      this.drawFish(ctx, g, s, a, L, false);
    }
    const n = pumping ? 14 : 3;
    for (let k = 0; k < n; k++) {
      const q = (t * (pumping ? 0.6 : 0.15) + k / n + idx * 0.37) % 1, bx = cx + Math.sin(k * 7.1 + idx) * (22 + EX * 0.35) + Math.sin(q * 9 + k) * 3;
      ctx.strokeStyle = `rgba(210,230,255,${(0.5 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx, BOT - 8 - q * (BOT - TOP - 10), 1.5 + (k % 3), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X0 + 7, TOP + 4, 6, BOT - TOP - 18);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(X0 + 16, TOP + 4, 3, BOT - TOP - 18);
    ctx.strokeStyle = 'rgba(10,10,40,0.35)'; ctx.lineWidth = 1;
    for (const x of [X0 + 24, X0 + 46, cx + 30, X1 - 8]) { ctx.beginPath(); ctx.moveTo(x, TOP + 2); ctx.lineTo(x, BOT - 6); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(160,170,255,0.4)'; ctx.stroke(body);
    for (const y of [TOP + 14, BOT - 34]) {
      const cg = ctx.createLinearGradient(0, y - 3, 0, y + 3);
      cg.addColorStop(0, '#f2f2f2'); cg.addColorStop(0.5, '#9a9a9a'); cg.addColorStop(1, '#d8d8d8');
      ctx.fillStyle = cg; ctx.fillRect(X0 - 2, y - 3, X1 - X0 + 4, 6);
      ctx.fillStyle = '#777'; ctx.fillRect(X1 - 14, y - 4, 8, 8);
    }
    const hg = ctx.createLinearGradient(28, 0, 122 + EX, 0);
    hg.addColorStop(0, '#0b0b0c'); hg.addColorStop(0.3, '#2c2d30'); hg.addColorStop(0.55, '#1a1b1d'); hg.addColorStop(1, '#070708');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(28, 42, 94 + EX, 50, 6); ctx.fill();
    ctx.fillStyle = '#26272a'; ctx.beginPath(); ctx.ellipse(cx, 43, 47 + EX / 2, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#121214'; ctx.fillRect(32, 84, 86 + EX, 10);
    // its number, stencilled on the head
    ctx.fillStyle = 'rgba(214,210,186,0.5)'; ctx.font = '600 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(`CH-${idx + 1}`, X1 + 2, 68);
    ctx.fillStyle = '#3d4c5c'; ctx.beginPath(); ctx.roundRect(2, 54, 30, 16, 4); ctx.fill();
    ctx.fillStyle = '#58b3d8'; ctx.fillRect(0, 57, 4, 10);
    ctx.fillStyle = '#c8321f';
    ctx.save(); ctx.translate(16, 52); ctx.beginPath(); ctx.roundRect(-8, -9, 16, 10, 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#111'; ctx.fillRect(PIPE_X - 3, 24, 6, 16);
    ctx.fillStyle = '#3a9ee0'; ctx.save(); ctx.translate(PIPE_X, 22); ctx.fillRect(-9, -3, 18, 6); ctx.restore();
    // the gauge: 0-4,000 m; a green band for what the chamber can hold here (outside to outside +
    // rating); the needle turns amber when the animal needs more than that
    const gx = cx - 22, gy = 66, gr = 15, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (m) => a0 + (a1 - a0) * clamp(m / 4000, 0, 1);
    ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,170,80,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, gr - 3, ang(outside), Math.max(ang(outside) + 0.05, ang(cmax))); ctx.stroke();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    for (let k = 0; k <= 8; k++) { const q = a0 + (a1 - a0) * k / 8; ctx.beginPath(); ctx.moveTo(gx + Math.cos(q) * (gr - 2), gy + Math.sin(q) * (gr - 2)); ctx.lineTo(gx + Math.cos(q) * (gr - 5), gy + Math.sin(q) * (gr - 5)); ctx.stroke(); }
    const short = s && home > cmax + 1;
    const na = ang(s ? s.press || 0 : outside) + (pumping ? Math.sin(t * 30) * 0.02 : 0);
    ctx.strokeStyle = short ? '#e89a20' : '#a0201a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (gr - 4), gy + Math.sin(na) * (gr - 4)); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(gx, gy, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a120c'; ctx.fillRect(cx - 2, 58, 34, 16);
    ctx.fillStyle = short ? '#f0b040' : s ? '#9fe08a' : '#3d5a36'; ctx.font = '9px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s ? `${Math.round(s.press || 0)}m` : '---', cx + 15, 66);
  }

  // ---------------- the tank room ----------------
  drawTankRoom(ctx, G, g, dt) {
    const T = G.tank, t = this.t;
    // the tank set into the bulkhead: a deep steel surround
    ctx.fillStyle = '#16191a'; ctx.fillRect(T.x - 18, T.y - 18, T.w + 36, T.h + 36);
    ctx.fillStyle = '#4b5355'; ctx.fillRect(T.x - 12, T.y - 12, T.w + 24, T.h + 24);
    ctx.fillStyle = '#9aa29e';
    for (let x = T.x - 4; x < T.x + T.w + 8; x += 24) { ctx.beginPath(); ctx.arc(x, T.y - 6, 2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x, T.y + T.h + 6, 2, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.beginPath(); ctx.rect(T.x, T.y, T.w, T.h); ctx.clip(); ctx.translate(T.x, T.y);
    this.drawOpenWater(ctx, g, T.w, T.h, dt);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, T.w, 8);
    ctx.restore();
    this.drawHatch(ctx, G.hatchL);
    this.drawHatch(ctx, G.hatchR);
    this.drawPile(ctx, G, g);
  }
  // (3.0.36) the open tank's water and what swims in it, at 0,0, w by h: here and on the inventory's Catch page
  drawOpenWater(ctx, g, w, h, dt, hits) {
    const t = this.t, top = 6, bot = h - 4;
    const L0 = TANK_LIGHTS[(g.profile && g.profile.subTankLight) || 'day'] || TANK_LIGHTS.day; // (3.0.25) the tank's light, set like the aquarium's
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, L0.water[0]); wg.addColorStop(1, L0.water[1]);
    ctx.fillStyle = wg; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.08; ctx.fillStyle = '#cfefff';
    for (let k = 0; k < 4; k++) { const x = w * (0.15 + k * 0.23) + Math.sin(t * 0.4 + k) * 12; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 70, bot); ctx.lineTo(x + 20, bot); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a5244'; ctx.beginPath(); ctx.moveTo(0, bot);
    for (let x = 0; x <= w; x += 12) ctx.lineTo(x, bot - 12 - Math.sin(x * 0.05) * 4 - Math.sin(x * 0.17) * 2);
    ctx.lineTo(w, bot); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const fx of [0.05, 0.09, 0.91, 0.95]) { const x = w * fx; ctx.beginPath(); ctx.moveTo(x, bot - 8); ctx.quadraticCurveTo(x + Math.sin(t * 0.8 + fx * 9) * 10, bot - h * 0.35, x + Math.sin(t * 0.6 + fx * 7) * 14, bot - h * 0.6); ctx.stroke(); }
    ctx.lineCap = 'butt';
    for (let k = 0; k < 16; k++) { const q = (t * 0.35 + k / 16) % 1; ctx.strokeStyle = `rgba(220,240,255,${(0.6 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w - 40 + Math.sin(q * 12 + k) * 4, bot - 12 - q * (bot - top - 16), 1.5 + (k % 3), 0, TAU); ctx.stroke(); }
    const maxL = clamp(Math.min(h * 0.9, w * 0.42), 40, 260); // (3.0.43) a 2.4 m giant nearly fills the tank's height; the rest by their real size
    for (const s of g.subTank) {
      if (s.pressed || s.pile || (this.drag && this.drag.s === s)) continue;
      const L = tankLen(s.len, maxL);
      const a = this.swim(g, s, false, { x0: 10, x1: w - 10, y0: top + 14, y1: bot - 18 }, L, dt);
      this.drawFish(ctx, g, s, a, L, false);
      if (hits) hits.push({ s, x: a.x, y: a.y, r: Math.max(16, L * 0.6) });
    }
    if (L0.tint) { ctx.fillStyle = L0.tint; ctx.fillRect(0, 0, w, h); }
    // (3.0.26) in the dim, a deep animal's own light shows: a soft glow on each one that has it
    if (L0.glow) for (const s of g.subTank) {
      const sp = SPECIES_BY_ID[s.id], a = this.anim && this.anim.get(s);
      if (!sp || !sp.v.glow || s.pressed || s.pile || s.cond <= 0.05 || !a || a.x === undefined) continue;
      const r = 18 + Math.min(34, (s.len || 0.1) * 90), k = 0.75 + 0.25 * Math.sin(t * 1.6 + (s.len || 0) * 40);
      const gl = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r); gl.addColorStop(0, sp.v.glow + 'cc'); gl.addColorStop(0.35, sp.v.glow + '55'); gl.addColorStop(1, sp.v.glow + '00');
      ctx.globalAlpha = k; ctx.fillStyle = gl; ctx.fillRect(a.x - r, a.y - r, r * 2, r * 2); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7 * k; ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  // (3.0.36) for the inventory's Catch page: the same open tank, and the same chambers in a row (a padlocked
  // bracket where one is not fitted yet). Returns where each animal is, for a tap.
  drawMiniTank(ctx, g, w, h, dt) {
    this.t += dt; const hits = [];
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    this.drawOpenWater(ctx, g, w, h, dt, hits);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, w, 8);
    ctx.restore(); return hits;
  }
  drawMiniChambers(ctx, g, w, h, dt, shown) {
    const rating = chamberRating(g), cmax = chamberMax(g), ps = pressSlots(g), outside = Math.max(0, g.sub.y), hits = [];
    const by = new Map(g.subTank.filter((s) => s.pressed).map((s) => [s.chamber, s]));
    const slot = w / shown, k = Math.min(slot / (CW - 12), h / (CH - 34));
    for (let n = 0; n < shown; n++) {
      const x = slot * n + (slot - CW * k) / 2;
      ctx.save(); ctx.translate(x, -20 * k); ctx.scale(k, k);
      if (n >= ps) {
        this.drawBracket(ctx);
        // a stamped padlock: not fitted yet
        ctx.fillStyle = 'rgba(200,196,176,0.32)'; ctx.strokeStyle = 'rgba(200,196,176,0.32)'; ctx.lineWidth = 7;
        const ly = CH * 0.56; ctx.beginPath(); ctx.arc(CW / 2, ly, 17, Math.PI, 0); ctx.stroke(); ctx.fillRect(CW / 2 - 27, ly, 54, 42);
        ctx.fillStyle = 'rgba(20,22,20,0.6)'; ctx.beginPath(); ctx.arc(CW / 2, ly + 16, 6, 0, TAU); ctx.fill(); ctx.fillRect(CW / 2 - 3, ly + 18, 6, 14);
      } else {
        const s = by.get(n);
        if (s && s.cond > 0.05 && (s.cond < 0.3 || gapOf(g, s, false) > SAFE_GAP)) { // in trouble: a faint red glow behind it
          const pulse = 0.55 + 0.45 * Math.sin(this.t * 3), rg = ctx.createRadialGradient(CW / 2, CH * 0.6, 10, CW / 2, CH * 0.6, 110 + EX / 2);
          rg.addColorStop(0, `rgba(230,70,50,${(0.38 * pulse).toFixed(3)})`); rg.addColorStop(1, 'rgba(230,70,50,0)'); ctx.fillStyle = rg; ctx.fillRect(-35, 80, CW + 70, CH - 80);
        }
        this.chamberFish = 1.25; this.drawChamber(ctx, g, s, rating, cmax, outside, dt, n); this.chamberFish = 1;
        if (s) hits.push({ s, x: x + CW / 2 * k, y: (CH * 0.6 - 20) * k, r: Math.max(60 * k, 22), n });
      }
      ctx.restore();
    }
    return hits;
  }
  // the net's haul: a wet heap of netting on the deck plates, the animals in it twitching
  drawPile(ctx, G, g) {
    const P = G.pile, pile = g.subTank.filter((s) => s.pile);
    this.pileFish = [];
    if (!pile.length) return;
    const t = this.t, n = pile.length;
    ctx.save();
    // a puddle, then the slack net
    ctx.fillStyle = 'rgba(40,70,80,0.35)'; ctx.beginPath(); ctx.ellipse(P.x + P.w / 2, P.y + 4, P.w * 0.62, 14, 0, 0, TAU); ctx.fill();
    const hp = new Path2D(); hp.moveTo(P.x, P.y);
    for (let k = 0; k <= 8; k++) { const x = P.x + P.w * k / 8; hp.lineTo(x, P.y - 22 - Math.sin(k * 1.7) * 10 - Math.min(n, 6) * 6 * Math.sin(Math.PI * k / 8)); }
    hp.lineTo(P.x + P.w, P.y); hp.closePath();
    ctx.fillStyle = 'rgba(30,40,34,0.55)'; ctx.fill(hp);
    pile.forEach((s, i) => {
      if (this.drag && this.drag.s === s) return;
      const sp = SPECIES_BY_ID[s.id], L = clamp(tankLen(s.len, 120), 30, P.w * 0.55), dead = s.cond <= 0.05;
      const x = P.x + P.w * (0.15 + ((i * 0.37) % 0.7)), y = P.y - 10 - (i % 3) * 14 - Math.floor(i / 3) * 6;
      this.pileFish.push({ s, x, y, L });
      ctx.save(); ctx.translate(x, y); ctx.rotate((i % 2 ? -0.18 : 0.22) + (dead ? 0 : Math.sin(t * 6 + i * 3) * 0.06 * (Math.sin(t * 0.7 + i) > 0.6 ? 1 : 0)));
      ctx.scale(i % 2 ? -1 : 1, dead ? -1 : 1); drawSpecies(ctx, sp, L, 0, 0, 0); if (dead) xEyes(ctx, L, sp); ctx.restore();
    });
    // the mesh over the top of it all
    ctx.save(); ctx.clip(hp); ctx.strokeStyle = 'rgba(150,170,150,0.45)'; ctx.lineWidth = 1;
    for (let x = P.x - 60; x < P.x + P.w + 60; x += 9) { ctx.beginPath(); ctx.moveTo(x, P.y - 90); ctx.lineTo(x + 60, P.y); ctx.moveTo(x + 60, P.y - 90); ctx.lineTo(x, P.y); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  // (3.2.0) the large tank's own room: the tank on its cradle across the middle of the wall, fed from the
  // pipe run, the hatch back to the tank room; an empty cradle, padlocked, until one is fitted
  drawBigRoom(ctx, G, g, dt) {
    const B = G.big, fitted = hasBigTank(g), cap = B.h * 0.5;
    // the pipe run, dropping to the tank's head
    const py = B.y - B.h * 0.55, px = B.x + cap * 0.55;
    ctx.fillStyle = '#4b5355'; ctx.fillRect(0, py - 6, G.W * 0.82, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, py - 5, G.W * 0.82, 3);
    if (fitted) { ctx.fillStyle = '#4b5355'; ctx.fillRect(px - 3, py, 6, B.y - B.h * 0.12 - py); ctx.fillStyle = '#606a6c'; ctx.fillRect(px - 7, py - 8, 14, 16); }
    this.drawCradle(ctx, G, B);
    if (fitted) this.bigFish = this.drawBigChamber(ctx, g, B, dt);
    else {
      this.bigFish = [];
      // a stamped padlock on the bulkhead where it will go
      const cx = B.x + B.w / 2, cy = B.y + B.h * 0.1;
      ctx.strokeStyle = 'rgba(200,196,176,0.28)'; ctx.fillStyle = 'rgba(200,196,176,0.28)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy - 34, 15, Math.PI, 0); ctx.stroke(); ctx.fillRect(cx - 24, cy - 34, 48, 36);
    }
    this.drawHatch(ctx, G.hatchL);
  }
  // two steel saddles bolted to the deck, and the straps over the top that hold the tank down
  drawCradle(ctx, G, B) {
    for (const fx of [0.26, 0.8]) {
      const x = B.x + B.w * fx, top = B.y + B.h * 0.55, w = B.h * 0.5;
      const sg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sg.addColorStop(0, '#2a2f30'); sg.addColorStop(0.5, '#454c4e'); sg.addColorStop(1, '#1f2324');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - w * 0.62, G.floor); ctx.lineTo(x - w / 2, top); ctx.quadraticCurveTo(x, top + B.h * 0.32, x + w / 2, top); ctx.lineTo(x + w * 0.62, G.floor); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#7c8587'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x + k * w * 0.45, G.floor - 8, 3, 0, TAU); ctx.fill(); }
    }
  }
  // the large pressure tank: the same clear blue cylinder as a chamber, laid on its side and drawn out long,
  // its black head at the left with the gauge and the readout. Returns where each animal is.
  drawBigChamber(ctx, g, B, dt, mini = false) {
    const t = this.t, cap = Math.min(B.h * 0.5, B.w * 0.14), X0 = B.x + cap - 4, X1 = B.x + B.w, TOP = B.y, BOT = B.y + B.h, r = Math.min(16, B.h * 0.12);
    const inn = bigIn(g), fish = [], cmax = chamberMax(g), outside = Math.max(0, g.sub.y);
    // the acrylic body
    const body = new Path2D();
    body.moveTo(X0, TOP); body.lineTo(X1 - r, TOP); body.quadraticCurveTo(X1, TOP, X1, TOP + r); body.lineTo(X1, BOT - r); body.quadraticCurveTo(X1, BOT, X1 - r, BOT); body.lineTo(X0, BOT); body.closePath();
    const wg = ctx.createLinearGradient(0, TOP, 0, BOT);
    wg.addColorStop(0, 'rgba(28,30,110,0.95)'); wg.addColorStop(0.35, 'rgba(70,80,190,0.78)'); wg.addColorStop(0.6, 'rgba(84,96,205,0.74)'); wg.addColorStop(1, 'rgba(24,26,96,0.95)');
    ctx.fillStyle = wg; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    const pumping = inn.some((s) => (s.press || 0) < Math.min(homeOf(s), cmax) - 1);
    for (const s of inn) {
      if (this.drag && this.drag.s === s) continue;
      // (3.2.0) the whole animal stays inside the window: no taller than it, by its real drawn height
      const sp = SPECIES_BY_ID[s.id], hh = halfH(sp);
      const L = Math.min(clamp(tankLen(s.len, B.h * 1.9), 24, (X1 - X0) * (inn.length > 1 ? 0.42 : 0.62)), (BOT - TOP - 10) / (2 * hh));
      const a = this.swim(g, s, false, inside(sp, L, X0 + 6, X1 - 6, TOP + 5, BOT - 5), L, dt, 0.6);
      this.drawFish(ctx, g, s, a, L, false);
      fish.push({ s, x: a.x, y: a.y, L });
    }
    const n = pumping ? 18 : 5;
    for (let k = 0; k < n; k++) {
      const q = (t * (pumping ? 0.5 : 0.12) + k / n) % 1, bx = X0 + 20 + ((Math.sin(k * 7.1) + 1) / 2) * (X1 - X0 - 40) + Math.sin(q * 9 + k) * 3;
      ctx.strokeStyle = `rgba(210,230,255,${(0.5 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx, BOT - 6 - q * (BOT - TOP - 10), 1.5 + (k % 3), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // sheen along the top, faint seams, the outline
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X0 + 4, TOP + B.h * 0.07, X1 - X0 - 18, Math.max(2, B.h * 0.035));
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(X0 + 4, TOP + B.h * 0.15, X1 - X0 - 18, Math.max(1, B.h * 0.016));
    ctx.strokeStyle = 'rgba(160,170,255,0.4)'; ctx.lineWidth = 1; ctx.stroke(body);
    // steel bands with their latches
    for (const fx of [0.18, 0.78]) {
      const x = X0 + (X1 - X0) * fx, bw = Math.max(4, B.h * 0.045);
      const cg = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0); cg.addColorStop(0, '#f2f2f2'); cg.addColorStop(0.5, '#9a9a9a'); cg.addColorStop(1, '#d8d8d8');
      ctx.fillStyle = cg; ctx.fillRect(x - bw / 2, TOP - 2, bw, B.h + 4);
      ctx.fillStyle = '#777'; ctx.fillRect(x - bw * 0.7, BOT - B.h * 0.2, bw * 1.4, bw * 1.6);
    }
    // the head: black, its end face toward us as an ellipse
    const HT = TOP - B.h * 0.1, HB = BOT + B.h * 0.1;
    const hg = ctx.createLinearGradient(0, HT, 0, HB);
    hg.addColorStop(0, '#0b0b0c'); hg.addColorStop(0.3, '#2c2d30'); hg.addColorStop(0.55, '#1a1b1d'); hg.addColorStop(1, '#070708');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(B.x, HT, cap, HB - HT, 6); ctx.fill();
    ctx.fillStyle = '#26272a'; ctx.beginPath(); ctx.ellipse(B.x + 1, (HT + HB) / 2, Math.max(4, cap * 0.09), (HB - HT) / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#121214'; ctx.fillRect(B.x + cap - 8, HT + 4, 10, HB - HT - 8);
    if (!mini) { ctx.fillStyle = '#111'; ctx.fillRect(B.x + cap * 0.55 - 3, HT - 14, 6, 16); ctx.fillStyle = '#3a9ee0'; ctx.fillRect(B.x + cap * 0.55 - 9, HT - 17, 18, 6); }
    // the gauge and the readout on the head (the first animal's pressure)
    const s0 = inn[0], gx = B.x + cap * 0.5, gy = HT + (HB - HT) * 0.34, gr = Math.min(cap * 0.3, (HB - HT) * 0.16);
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (m) => a0 + (a1 - a0) * clamp(m / 4000, 0, 1);
    ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,170,80,0.85)'; ctx.lineWidth = Math.max(2, gr * 0.2); ctx.beginPath(); ctx.arc(gx, gy, gr * 0.8, ang(outside), Math.max(ang(outside) + 0.05, ang(cmax))); ctx.stroke();
    const short = s0 && homeOf(s0) > cmax + 1, na = ang(s0 ? s0.press || 0 : outside) + (pumping ? Math.sin(t * 30) * 0.02 : 0);
    ctx.strokeStyle = short ? '#e89a20' : '#a0201a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * gr * 0.75, gy + Math.sin(na) * gr * 0.75); ctx.stroke();
    if (!mini) {
      const dw = cap * 0.62, dh = Math.max(12, (HB - HT) * 0.11), dy = HT + (HB - HT) * 0.6;
      ctx.fillStyle = '#0a120c'; ctx.fillRect(gx - dw / 2, dy, dw, dh);
      ctx.fillStyle = short ? '#f0b040' : s0 ? '#9fe08a' : '#3d5a36'; ctx.font = `${Math.round(dh * 0.7)}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s0 ? `${Math.round(s0.press || 0)}m` : '---', gx, dy + dh / 2 + 1);
      ctx.fillStyle = 'rgba(214,210,186,0.5)'; ctx.font = `600 ${Math.round(Math.max(9, dh * 0.62))}px "IBM Plex Mono", monospace`;
      ctx.fillText(`${inn.length}/${inn.some(tooBig) ? 1 : 3}`, gx, HB - (HB - HT) * 0.1);
    }
    return fish;
  }
  // (3.2.0) the large tank as a strip, for the inventory's Catch page. Returns where each animal is, for a tap.
  drawMiniBig(ctx, g, w, h, dt) {
    if (!hasBigTank(g)) return [];
    this.t += dt;
    return this.drawBigChamber(ctx, g, { x: 4, y: h * 0.14, w: w - 8, h: h * 0.72 }, dt, true);
  }

  // the catch bag, on its hook: its fish seen through the mesh, its tags on cords below
  drawBag(ctx, G, g) {
    const hk = G.hook;
    ctx.strokeStyle = '#8a9294'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hk.x, hk.y - 20); ctx.lineTo(hk.x, hk.y); ctx.arc(hk.x - 8, hk.y, 8, 0, Math.PI); ctx.stroke();
    const n = g.bag.length, bw = 136, bh = G.bagH(n);
    // cords from the bag down to each tag
    ctx.strokeStyle = 'rgba(160,130,80,0.85)'; ctx.lineWidth = 1.5;
    // (2.7.4: no tags, so no cords)
    ctx.save(); ctx.translate(hk.x - 8, hk.y + 8);
    const bag = new Path2D();
    bag.moveTo(-8, 0); bag.lineTo(8, 0); bag.quadraticCurveTo(bw * 0.62, bh * 0.35, bw * 0.34, bh); bag.quadraticCurveTo(0, bh + 16, -bw * 0.34, bh); bag.quadraticCurveTo(-bw * 0.62, bh * 0.35, -8, 0);
    ctx.fillStyle = 'rgba(14,30,20,0.85)'; ctx.fill(bag);
    // what is in it, seen through the mesh: crammed in, twitching (the weak barely, the dead not at all)
    ctx.save(); ctx.clip(bag);
    this.bagFish = [];
    this.bagBox = { x0: hk.x - 8 - bw * 0.62, x1: hk.x - 8 + bw * 0.62, y0: hk.y + 8, y1: hk.y + 8 + bh + 16 };
    g.bag.forEach((s, i) => {
      const sp = SPECIES_BY_ID[s.id], L = clamp(tankLen(s.len, 100), 34, bw * 0.8), dead = s.cond <= 0.05;
      const y = bh * (0.35 + (i % 4) * 0.17) + 6, x = (i % 2 ? 1 : -1) * 6;
      this.bagFish.push({ i, x: hk.x - 8 + x, y: hk.y + 8 + y, L });
      if (this.drag && this.drag.s === s) return; // in hand
      ctx.save(); ctx.translate(x, y);
      if (dead) { ctx.rotate(0.25); ctx.scale(i % 2 ? 1 : -1, -1); drawSpecies(ctx, sp, L, 0, 0, 0); xEyes(ctx, L, sp); }
      else { const vit = clamp(s.cond, 0, 1), tw = Math.sin(this.t * lerp(2, 9, vit) + i * 2) * lerp(0.02, 0.18, vit); ctx.rotate((i % 2 ? -0.3 : 0.3) + tw); ctx.scale(i % 2 ? -1 : 1, 1); drawSpecies(ctx, sp, L, this.t * lerp(0.2, 1.2, vit) + i, lerp(0.1, 0.6, vit), 0); }
      ctx.restore();
    });
    ctx.restore();
    // the mesh over them
    ctx.strokeStyle = 'rgba(120,190,140,0.55)'; ctx.lineWidth = 1;
    ctx.save(); ctx.clip(bag);
    for (let k = -8; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(k * 6, 0); ctx.lineTo(k * 12, bh + 16); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-k * 6, 0); ctx.lineTo(k * 12 + 30, bh + 16); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(160,210,170,0.6)'; ctx.lineWidth = 2; ctx.stroke(bag);
    ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-12, -3, 24, 6); // the drawstring
    ctx.restore();
  }

  // ---------------- a fish, swimming as well as it can ----------------
  swim(g, s, inBag, box, L, dt, slow = 1) {
    let a = this.anim.get(s);
    if (!a) { a = { x: lerp(box.x0, box.x1, Math.random()), y: lerp(box.y0, box.y1, Math.random()), tx: 0, ty: 0, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1, want: 1, phase: Math.random() * 6, retT: 0, flipT: 0, roll: 0 }; this.anim.set(s, a); }
    const x0 = box.x0 + L * 0.5, x1 = Math.max(x0, box.x1 - L * 0.5);
    if (s.cond <= 0.05) {
      // dead: belly up, drifting to the top, no movement of its own
      a.y = lerp(a.y, box.y0, dt * 0.35); a.x = clamp(a.x + Math.sin(this.t * 0.3 + a.phase) * dt * 1.5, x0, x1); a.vx = a.vy = 0;
      return a;
    }
    const vit = clamp((s.cond - 0.05) / 0.95, 0, 1), dying = gapOf(g, s, inBag) > SAFE_GAP;
    a.dying = dying; a.vit = vit;
    a.retT -= dt;
    if (a.retT <= 0 || Math.hypot(a.tx - a.x, a.ty - a.y) < 4) {
      a.tx = lerp(x0, x1, Math.random());
      // the weak sink toward the bottom and stay there
      a.ty = s.cond < 0.5 ? lerp(box.y0, box.y1, 0.65 + Math.random() * 0.35) : lerp(box.y0, box.y1, Math.random());
      a.retT = lerp(7, 1.4, vit) * (0.6 + Math.random() * 0.8);
    }
    const sp = lerp(3, 30, Math.pow(vit, 1.2)) * slow, dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1;
    const k = dt * lerp(0.6, 2.4, vit);
    a.vx = lerp(a.vx, (dx / d) * sp, k); a.vy = lerp(a.vy, (dy / d) * sp * 0.5, k);
    a.x = clamp(a.x + a.vx * dt, x0, x1); a.y = clamp(a.y + a.vy * dt, box.y0, box.y1);
    if (Math.abs(a.vx) > 1.5) a.want = a.vx > 0 ? 1 : -1;
    a.face = clamp(a.face + Math.sign(a.want - a.face) * dt * lerp(0.8, 4, vit), -1, 1);
    a.phase += dt * lerp(0.25, 1.7, vit);
    // dying: it lists, and now and then rolls over before it rights itself
    a.flipT = Math.max(0, a.flipT - dt);
    if (dying && a.flipT <= 0 && Math.random() < dt * 0.15) a.flipT = 0.9;
    a.roll = dying ? 0.35 + Math.sin(this.t * 0.9 + a.phase) * 0.15 : s.cond < 0.5 ? 0.18 : 0;
    return a;
  }
  drawFish(ctx, g, s, a, L) {
    const sp = SPECIES_BY_ID[s.id], dead = s.cond <= 0.05;
    ctx.save(); ctx.translate(a.x, a.y);
    if (dead) { ctx.scale(1, -1); ctx.globalAlpha = 0.85; drawSpecies(ctx, sp, L, 0, 0, 0); xEyes(ctx, L, sp); ctx.restore(); return; }
    const f = Math.abs(a.face) < 0.08 ? 0.08 * Math.sign(a.face || 1) : a.face;
    ctx.rotate((clamp(a.vy * 0.02, -0.3, 0.3) + a.roll) * Math.sign(f));
    // a roll: over onto its back and up again
    const sy = a.flipT > 0 ? Math.cos((1 - a.flipT / 0.9) * TAU) : 1;
    ctx.scale(-f, Math.abs(sy) < 0.1 ? 0.1 * Math.sign(sy || 1) : sy);
    drawSpecies(ctx, sp, L, a.phase, lerp(0.15, 1, a.vit ?? 1), 0);
    ctx.restore();
  }
}
