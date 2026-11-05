// The tank room: the back of the submersible, full screen. A row of pressure chambers (clear blue
// acrylic cylinders under black heads, each with a gauge, a ball valve and a bleed tap, after the
// SubCAS chambers fisheries scientists use), the open specimen tank below them, and whatever is
// still in Earl's catch bag. Every animal aboard is drawn alive, swimming in what holds it.
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies } from './creatures_draw.js';
import { tankSlots, pressSlots, tankUsed, chamberRating, homeOf, gapOf, SAFE_GAP, BLEED, freeChamber } from './capture.js';
import { conditionName } from './specimens.js';
import { VARIANTS } from './variants.js';
import { UPGRADES } from './economy.js';
import { clamp, lerp, TAU } from './util.js';

const MAX_CHAMBERS = UPGRADES.pressTanks.base + UPGRADES.pressTanks.max;
const CW = 150, CH = 330; // a chamber's canvas, in CSS pixels
const condCol = (c) => (c <= 0.05 ? '#8a8a8a' : c >= 0.8 ? '#78dc8c' : c >= 0.5 ? '#e8b040' : '#e6503c');
const atm = (m) => (1 + m / 10).toFixed(0);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
// how long an animal is drawn here: small fish small, big ones capped to what the glass holds
const tankLen = (len, max) => clamp(len * 1.6 * 110, 20, max);

function sizeCanvas(c, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px'; }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export class TankRoom {
  constructor(root, hooks) {
    this.root = root; this.h = hooks;
    this.anim = new WeakMap(); // specimen -> how it is swimming
    this.t = 0; this.infoT = 0; this.sig = '';
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-tk]');
      if (!b || b.disabled) return;
      const [act, where, i] = b.dataset.tk.split(':');
      this.h.act(act, where, +i);
      this.refresh(true);
    });
  }
  // what is where: when this changes, the room is laid out again
  signature(g) {
    return [pressSlots(g), tankSlots(g), g.subTank.map((s) => `${s.id}${s.pressed ? 'p' + s.chamber : 'o'}`).join(','), g.bag.map((s) => s.id).join(',')].join('|');
  }
  open() { this.sig = ''; this.refresh(true); }
  refresh(force) {
    const g = this.h.getGame();
    if (!g) return;
    const sig = this.signature(g);
    if (force || sig !== this.sig) { this.sig = sig; this.build(g); }
    this.info(g);
  }

  // ---------------- layout ----------------
  build(g) {
    const ps = pressSlots(g), body = this.root.querySelector('#tank-body');
    let html = '<div class="tr-chambers">';
    for (let i = 0; i < MAX_CHAMBERS; i++) html += `<div class="tr-bay${i >= ps ? ' locked' : ''}" data-bay="${i}"><canvas class="tr-cyl"></canvas><div class="tr-info"></div></div>`;
    html += '</div>';
    html += '<div class="tr-lower"><div class="tr-open"><h4>The open tank</h4><canvas class="tr-tank"></canvas><div class="tr-list" data-list="tank"></div></div>';
    html += '<div class="tr-bag"><h4>The catch bag</h4><div class="tr-list" data-list="bag"></div></div></div>';
    html += `<p class="tr-note">Every animal has the pressure it lives at. Up to ${SAFE_GAP} m short of it, it lives, stressed; further, it dies. A chamber pumps an animal back up to its own pressure (as far as the chamber is rated) and it recovers there. Open the valve a crack and the chamber eases toward the surface; an animal held at its own pressure eases with it, and arrives acclimated: worth a quarter more.</p>`;
    body.innerHTML = html;
    this.cyl = [...body.querySelectorAll('.tr-cyl')];
    this.tankC = body.querySelector('.tr-tank');
  }

  // the words and buttons under everything (refreshed a few times a second)
  info(g) {
    const e = g.earl, rating = chamberRating(g), ps = pressSlots(g), outside = Math.max(0, Math.round(g.sub.y));
    this.root.querySelector('#tank-sub').textContent = `outside ${outside} m (${atm(outside)} atm) · chambers rated ${rating} m · open tank ${tankUsed(g)}/${tankSlots(g)}`;
    const free = freeChamber(g) >= 0, openFree = tankUsed(g) < tankSlots(g);
    const name = (s) => `${s.variant ? `<span class="rare r-${s.variant}">${VARIANTS[s.variant].name}</span> ` : ''}${SPECIES_BY_ID[s.id].name}`;
    const bar = (s) => `<span class="tk-cond"><i style="width:${Math.round(s.cond * 100)}%;background:${condCol(s.cond)}"></i></span>`;
    const gapLine = (s, inBag) => {
      if (s.cond <= 0.05) return 'dead · sells for half the market price';
      const gap = Math.round(gapOf(g, s, inBag)), home = Math.round(homeOf(s));
      if (s.acc) return 'acclimated to the surface · worth a quarter more';
      if (gap <= 5) return `${conditionName(s.cond)} · at its own pressure (${home} m)`;
      if (s.pressed && !s.bleed && (s.press || 0) < Math.min(home, chamberRating(g)) - 1) return `${conditionName(s.cond)} · lives at ${home} m, pumping up to it`;
      return `${conditionName(s.cond)} · lives at ${home} m, <em class="${gap > SAFE_GAP ? 'die' : 'stress'}">${gap} m short${gap > SAFE_GAP ? ': dying' : ''}</em>`;
    };
    // chambers
    const byChamber = new Map(g.subTank.map((s, i) => [s, i]).filter(([s]) => s.pressed).map(([s, i]) => [s.chamber, [s, i]]));
    this.root.querySelectorAll('.tr-bay').forEach((bay, c) => {
      const el = bay.querySelector('.tr-info');
      if (c >= ps) { el.innerHTML = '<small>Not fitted. The boat fits more chambers (Submersible).</small>'; return; }
      const hit = byChamber.get(c);
      if (!hit) { el.innerHTML = `<b class="tr-num">Chamber ${c + 1}</b><small>Empty. Seal an animal in from the open tank or the bag.</small>`; return; }
      const [s, i] = hit, home = Math.round(homeOf(s)), press = Math.round(s.press || 0);
      let state;
      if (s.cond <= 0.05) state = 'dead';
      else if (s.acc) state = 'acclimated: worth a quarter more';
      else if (s.bleed) state = `easing up: ${press} m · ${mmss(press / BLEED)} to the surface`;
      else if (press < Math.min(home, rating) - 1) state = `pumping: ${press} → ${Math.min(home, rating)} m`;
      else if (home > rating) state = `held at ${rating} m, ${home - rating} m short of its own`;
      else state = 'held at its own pressure, recovering';
      el.innerHTML = `<b class="tr-num">Chamber ${c + 1}</b><b>${name(s)}</b>${bar(s)}<small>${gapLine(s, false)}</small><small class="tr-state">${state}</small>
        <div class="tk-act">${s.acc || s.cond <= 0.05 ? '' : `<button data-tk="bleed:tank:${i}" class="${s.bleed ? 'on' : ''}">${s.bleed ? 'Close the valve' : 'Ease it up'}</button>`}<button data-tk="open:tank:${i}" ${openFree ? '' : 'disabled'}>To the open tank</button><button class="ghost" data-tk="release:tank:${i}">Let go</button></div>`;
    });
    // open tank and bag
    const card = (s, i, where) => {
      const btns = (where === 'bag' ? `<button data-tk="open:bag:${i}" ${openFree ? '' : 'disabled'}>Open tank</button>` : '') +
        `<button data-tk="press:${where}:${i}" ${free && s.cond > 0.05 ? '' : 'disabled'}>Into a chamber</button><button class="ghost" data-tk="release:${where}:${i}">Let go</button>`;
      return `<div class="tr-card${s.cond <= 0.05 ? ' dead' : ''}">${this.h.mini(SPECIES_BY_ID[s.id])}<div class="tr-card-txt"><b>${name(s)}</b>${bar(s)}<small>${gapLine(s, where === 'bag')}</small></div><div class="tk-act">${btns}</div></div>`;
    };
    const openList = g.subTank.map((s, i) => [s, i]).filter(([s]) => !s.pressed);
    this.root.querySelector('[data-list="tank"]').innerHTML = openList.map(([s, i]) => card(s, i, 'tank')).join('') || '<small>Empty.</small>';
    this.root.querySelector('[data-list="bag"]').innerHTML = g.bag.map((s, i) => card(s, i, 'bag')).join('') || '<small>Empty. Animals caught outside come aboard in the bag.</small>';
  }

  update(dt) {
    const g = this.h.getGame();
    if (!g) return;
    this.t += dt;
    this.infoT += dt;
    const sig = this.signature(g);
    if (sig !== this.sig) this.refresh(true);
    else if (this.infoT > 0.3) { this.infoT = 0; this.info(g); }
    const rating = chamberRating(g), ps = pressSlots(g);
    const byChamber = new Map(g.subTank.filter((s) => s.pressed).map((s) => [s.chamber, s]));
    this.cyl.forEach((c, i) => this.drawChamber(c, byChamber.get(i), i >= ps, rating, dt, i));
    this.drawOpenTank(g, dt);
  }

  // ---------------- a fish swimming in a box ----------------
  swim(s, box, L, dt, slow = 1) {
    let a = this.anim.get(s);
    if (!a) { a = { x: lerp(box.x0, box.x1, Math.random()), y: lerp(box.y0, box.y1, Math.random()), tx: 0, ty: 0, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1, want: 1, phase: Math.random() * 6, retT: 0 }; this.anim.set(s, a); }
    const dead = s.cond <= 0.05, weak = s.cond < 0.5;
    const x0 = box.x0 + L * 0.5, x1 = Math.max(x0, box.x1 - L * 0.5);
    if (dead) {
      // belly up, drifting to the top
      a.y = lerp(a.y, box.y0 + 4, dt * 0.4); a.x = clamp(a.x, x0, x1);
      return a;
    }
    a.retT -= dt;
    if (a.retT <= 0 || Math.hypot(a.tx - a.x, a.ty - a.y) < 4) { a.tx = lerp(x0, x1, Math.random()); a.ty = lerp(box.y0, box.y1, Math.random()); a.retT = 2 + Math.random() * 4; }
    const sp = (weak ? 10 : 22) * slow, dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1;
    a.vx = lerp(a.vx, (dx / d) * sp, dt * 1.5); a.vy = lerp(a.vy, (dy / d) * sp * 0.5, dt * 1.5);
    a.x = clamp(a.x + a.vx * dt, x0, x1); a.y = clamp(a.y + a.vy * dt, box.y0, box.y1);
    if (Math.abs(a.vx) > 3) a.want = a.vx > 0 ? 1 : -1;
    a.face = clamp(a.face + Math.sign(a.want - a.face) * dt * 3, -1, 1); // turning: it narrows, then faces the other way
    a.phase += dt * (weak ? 0.6 : 1);
    return a;
  }
  drawFish(ctx, s, a, L) {
    const sp = SPECIES_BY_ID[s.id], dead = s.cond <= 0.05;
    ctx.save(); ctx.translate(a.x, a.y);
    if (dead) { ctx.scale(1, -1); ctx.globalAlpha = 0.85; }
    else { ctx.rotate(clamp(a.vy * 0.02, -0.3, 0.3) * Math.sign(a.face || 1)); ctx.scale(-(Math.abs(a.face) < 0.08 ? 0.08 * Math.sign(a.face || 1) : a.face), 1); }
    drawSpecies(ctx, sp, L, dead ? 0 : a.phase, dead ? 0 : (s.cond < 0.5 ? 0.5 : 1), 0);
    ctx.restore();
  }

  // ---------------- a pressure chamber ----------------
  drawChamber(c, s, locked, rating, dt, idx) {
    const ctx = sizeCanvas(c, CW, CH), t = this.t, cx = CW / 2;
    ctx.clearRect(0, 0, CW, CH);
    const X0 = 38, X1 = 112, TOP = 92, BOT = 312;
    ctx.globalAlpha = locked ? 0.28 : 1;
    // the wrench handle (E), under the head
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.moveTo(40, 92); ctx.lineTo(6, 86); ctx.quadraticCurveTo(2, 90, 6, 95); ctx.lineTo(40, 99); ctx.fill();
    // the cylinder (A): water, the animal, then the glass over them
    const body = new Path2D();
    body.moveTo(X0, TOP); body.lineTo(X1, TOP); body.lineTo(X1, BOT - 12); body.quadraticCurveTo(X1, BOT, X1 - 12, BOT); body.lineTo(X0 + 12, BOT); body.quadraticCurveTo(X0, BOT, X0, BOT - 12); body.closePath();
    const wg = ctx.createLinearGradient(X0, 0, X1, 0);
    wg.addColorStop(0, 'rgba(28,30,110,0.95)'); wg.addColorStop(0.35, 'rgba(70,80,190,0.75)'); wg.addColorStop(0.6, 'rgba(84,96,205,0.7)'); wg.addColorStop(1, 'rgba(24,26,96,0.95)');
    ctx.fillStyle = wg; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    // the logger (C) and its spring, inside
    ctx.fillStyle = 'rgba(40,40,48,0.8)'; ctx.beginPath(); ctx.arc(cx, 236, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,40,40,0.75)'; ctx.beginPath(); ctx.arc(cx - 3, 233, 6, Math.PI * 0.8, Math.PI * 1.8); ctx.fill();
    ctx.strokeStyle = 'rgba(150,150,170,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 0; k <= 12; k++) ctx.lineTo(cx - 12 + k * 2, 258 + (k % 2 ? -4 : 4)); ctx.stroke();
    // the animal
    const pumping = s && !s.bleed && (s.press || 0) < Math.min(homeOf(s), rating) - 1;
    if (s && !locked) {
      const L = tankLen(s.len, 62);
      const a = this.swim(s, { x0: X0 + 4, x1: X1 - 4, y0: TOP + 30, y1: BOT - 70 }, L, dt, 0.6);
      this.drawFish(ctx, s, a, L);
    }
    // bubbles: a stream while the pump runs, a few at the tap while it bleeds, now and then otherwise
    const n = pumping ? 14 : s && s.bleed ? 6 : 3;
    for (let k = 0; k < n; k++) {
      const q = (t * (pumping ? 0.6 : 0.15) + k / n + idx * 0.37) % 1, bx = cx + Math.sin(k * 7.1 + idx) * 22 + Math.sin(q * 9 + k) * 3;
      ctx.strokeStyle = `rgba(210,230,255,${(0.5 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx, BOT - 8 - q * (BOT - TOP - 10), 1.5 + (k % 3), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // the glass: highlights and ribs
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X0 + 7, TOP + 4, 6, BOT - TOP - 18);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(X0 + 16, TOP + 4, 3, BOT - TOP - 18);
    ctx.strokeStyle = 'rgba(10,10,40,0.35)'; ctx.lineWidth = 1;
    for (const x of [X0 + 24, X0 + 46, X1 - 8]) { ctx.beginPath(); ctx.moveTo(x, TOP + 2); ctx.lineTo(x, BOT - 6); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(160,170,255,0.4)'; ctx.stroke(body);
    // two hose clamps
    for (const y of [TOP + 14, BOT - 34]) {
      const cg = ctx.createLinearGradient(0, y - 3, 0, y + 3);
      cg.addColorStop(0, '#f2f2f2'); cg.addColorStop(0.5, '#9a9a9a'); cg.addColorStop(1, '#d8d8d8');
      ctx.fillStyle = cg; ctx.fillRect(X0 - 2, y - 3, X1 - X0 + 4, 6);
      ctx.fillStyle = '#777'; ctx.fillRect(X1 - 14, y - 4, 8, 8);
    }
    // the head (D): a black cylinder with a rim
    const hg = ctx.createLinearGradient(28, 0, 122, 0);
    hg.addColorStop(0, '#0b0b0c'); hg.addColorStop(0.3, '#2c2d30'); hg.addColorStop(0.55, '#1a1b1d'); hg.addColorStop(1, '#070708');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(28, 42, 94, 50, 6); ctx.fill();
    ctx.fillStyle = '#26272a'; ctx.beginPath(); ctx.ellipse(cx, 43, 47, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#121214'; ctx.fillRect(32, 84, 86, 10);
    // the ball valve (G): a grey pipe out to the left, a red handle
    ctx.fillStyle = '#3d4c5c'; ctx.beginPath(); ctx.roundRect(2, 54, 30, 16, 4); ctx.fill();
    ctx.fillStyle = '#58b3d8'; ctx.fillRect(0, 57, 4, 10);
    ctx.fillStyle = s && s.bleed ? '#ff5a3a' : '#c8321f';
    ctx.save(); ctx.translate(16, 52); ctx.rotate(s && s.bleed ? -0.6 : 0); ctx.beginPath(); ctx.roundRect(-8, -9, 16, 10, 3); ctx.fill(); ctx.restore();
    // the bleed tap (F): a blue lever on top
    ctx.fillStyle = '#111'; ctx.fillRect(92, 24, 6, 16);
    ctx.fillStyle = '#3a9ee0'; ctx.save(); ctx.translate(95, 22); ctx.rotate(s && s.bleed ? 0.9 : 0); ctx.fillRect(-9, -3, 18, 6); ctx.restore();
    if (s && s.bleed) for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; ctx.fillStyle = `rgba(220,235,255,${(0.6 * (1 - q)).toFixed(3)})`; ctx.beginPath(); ctx.arc(100 + q * 10, 18 - q * 14, 1.5, 0, TAU); ctx.fill(); }
    // the gauge on the head: 0 to 4,000 m; red past the chamber's rating
    const gx = cx - 8, gy = 66, gr = 15, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (m) => a0 + (a1 - a0) * clamp(m / 4000, 0, 1);
    ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,40,30,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, gr - 3, ang(rating), a1); ctx.stroke();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    for (let k = 0; k <= 8; k++) { const q = a0 + (a1 - a0) * k / 8; ctx.beginPath(); ctx.moveTo(gx + Math.cos(q) * (gr - 2), gy + Math.sin(q) * (gr - 2)); ctx.lineTo(gx + Math.cos(q) * (gr - 5), gy + Math.sin(q) * (gr - 5)); ctx.stroke(); }
    const na = ang(s ? s.press || 0 : 0) + (pumping ? Math.sin(t * 30) * 0.02 : 0);
    ctx.strokeStyle = '#a0201a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (gr - 4), gy + Math.sin(na) * (gr - 4)); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(gx, gy, 2, 0, TAU); ctx.fill();
    // the digital read-out beside it
    ctx.fillStyle = '#0a120c'; ctx.fillRect(cx + 12, 58, 34, 16);
    ctx.fillStyle = s ? '#9fe08a' : '#3d5a36'; ctx.font = '9px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s ? `${Math.round(s.press || 0)}m` : '---', cx + 29, 66);
    ctx.globalAlpha = 1;
  }

  // ---------------- the open tank ----------------
  drawOpenTank(g, dt) {
    const c = this.tankC;
    if (!c) return;
    const w = Math.max(280, Math.min(760, c.parentElement.clientWidth)), h = 200;
    const ctx = sizeCanvas(c, w, h), t = this.t;
    ctx.clearRect(0, 0, w, h);
    const top = 16, bot = h - 14;
    // water
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, '#1d5f70'); wg.addColorStop(1, '#0a2a33');
    ctx.fillStyle = wg; ctx.fillRect(4, top, w - 8, bot - top);
    // light from the lamp above, swaying
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#cfefff';
    for (let k = 0; k < 4; k++) { const x = w * (0.15 + k * 0.23) + Math.sin(t * 0.4 + k) * 12; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 30, top); ctx.lineTo(x + 70, bot); ctx.lineTo(x + 20, bot); ctx.fill(); }
    ctx.restore();
    // gravel and a few weeds
    ctx.fillStyle = '#5a5244'; ctx.beginPath(); ctx.moveTo(4, bot);
    for (let x = 4; x <= w - 4; x += 12) ctx.lineTo(x, bot - 10 - Math.sin(x * 0.05) * 4 - Math.sin(x * 0.17) * 2);
    ctx.lineTo(w - 4, bot); ctx.fill();
    ctx.fillStyle = 'rgba(30,24,18,0.5)'; for (let k = 0; k < 60; k++) { ctx.beginPath(); ctx.arc(8 + (k * 53.7) % (w - 16), bot - 3 - (k * 7) % 7, 1.5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const fx of [0.08, 0.12, 0.88, 0.93]) { const x = w * fx; ctx.beginPath(); ctx.moveTo(x, bot - 8); ctx.quadraticCurveTo(x + Math.sin(t * 0.8 + fx * 9) * 10, bot - 60, x + Math.sin(t * 0.6 + fx * 7) * 14, bot - 100 - fx * 20); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // the airstone's bubbles
    for (let k = 0; k < 16; k++) { const q = (t * 0.35 + k / 16) % 1; ctx.strokeStyle = `rgba(220,240,255,${(0.6 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w - 40 + Math.sin(q * 12 + k) * 4, bot - 12 - q * (bot - top - 16), 1.5 + (k % 3), 0, TAU); ctx.stroke(); }
    // the animals
    const list = g.subTank.filter((s) => !s.pressed);
    for (const s of list) {
      const L = tankLen(s.len, 110);
      const a = this.swim(s, { x0: 10, x1: w - 10, y0: top + 16, y1: bot - 26 }, L, dt);
      this.drawFish(ctx, s, a, L);
    }
    // glass and the steel frame
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(4, top, w - 8, 6);
    const fg = ctx.createLinearGradient(0, 0, 0, top);
    fg.addColorStop(0, '#59605e'); fg.addColorStop(1, '#2a302e');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, w, top); ctx.fillRect(0, bot, w, h - bot);
    ctx.fillStyle = '#2a302e'; ctx.fillRect(0, 0, 4, h); ctx.fillRect(w - 4, 0, 4, h);
    ctx.fillStyle = '#9aa29e';
    for (let x = 10; x < w; x += 22) { ctx.beginPath(); ctx.arc(x, top / 2, 1.6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x, bot + (h - bot) / 2, 1.6, 0, TAU); ctx.fill(); }
  }
}
