// (4.10.0) the chart: the whole sea in section, as the quest maps draw it, with the player's own markers. Click the
// water or the seabed to set a marker there, name it and pick its colour; click a marker to rename it, follow it (the
// tutorial's trail leads there) or take it off. Markers are kept with the save, and show in the sea as small pins.
import { WORLD_W, BOAT, STATION, DAVE } from './world.js';

const DEPTH = 5200, MAX_MARKS = 24;
export const MARK_COLS = ['#f2c868', '#e8705a', '#6ac0e8', '#9fdc8c', '#c891f0'];
const ZONES = [[0, 'Sunlight'], [200, 'Twilight'], [1000, 'Midnight'], [4000, 'Abyss']];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const markersOf = (P) => (P.markers = Array.isArray(P.markers) ? P.markers : []);

export class Chart {
  constructor(h) {
    this.h = h; // { getGame, getProfile, save, follow(marker|null), following() }
    const el = this.el = document.createElement('section'); el.id = 'chart'; el.hidden = true;
    el.innerHTML = `<div class="ch-panel"><header><div class="ch-plate"><h2>Chart</h2></div><span class="ch-hint">Click the sea to set a marker · K</span><button class="ch-close" aria-label="Close">×</button></header>
      <div class="ch-wrap"><canvas class="ch-map" width="1040" height="560"></canvas><div class="ch-edit" hidden></div></div>
      <footer><span class="ch-at"></span><div class="ch-list"></div></footer></div>`;
    document.body.appendChild(el);
    this.cv = el.querySelector('.ch-map'); this.edit = el.querySelector('.ch-edit');
    this.hover = null; this.sel = null; this.floor = null;
    el.addEventListener('click', (ev) => {
      if (ev.target === el || ev.target.closest('.ch-close')) { this.toggle(false); return; }
      const a = ev.target.closest('[data-ch]'); if (!a) return;
      const [act, i] = a.dataset.ch.split('|'), M = markersOf(this.h.getProfile()), m = M[+i];
      if (act === 'pick' && m) this.openEdit(m, false);
      else if (act === 'follow' && m) { this.h.follow(this.h.following() === m ? null : m); this.list(); this.draw(); }
    });
    this.cv.addEventListener('mousemove', (ev) => { this.hover = this.toWorld(ev); this.draw(); });
    this.cv.addEventListener('mouseleave', () => { this.hover = null; this.draw(); });
    this.cv.addEventListener('click', (ev) => {
      const P = this.h.getProfile(), M = markersOf(P), hit = this.markerAt(ev);
      if (hit) { this.openEdit(hit, false); return; }
      if (!this.edit.hidden) { this.closeEdit(); return; }
      const w = this.toWorld(ev); if (!w) return;
      if (M.length >= MAX_MARKS) { this.flash(`The chart holds ${MAX_MARKS} markers: take one off first`); return; }
      this.openEdit({ x: w.x, y: w.y, name: `Marker ${M.length + 1}`, col: MARK_COLS[M.length % MARK_COLS.length] }, true);
    });
  }
  isOpen() { return !this.el.hidden; }
  toggle(force) {
    const open = force === undefined ? this.el.hidden : force; this.el.hidden = !open;
    cancelAnimationFrame(this.raf); this.closeEdit();
    if (!open) return;
    const g = this.h.getGame(); this.floor = [];
    for (let m = 0; m <= WORLD_W; m += 5) this.floor.push(Math.max(0, g.world.floorAt(m)));
    this.list();
    const loop = () => { if (this.el.hidden) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
  }
  // metres to the canvas and back: the whole width of the sea, the depth to 5,200 m
  get geo() { const W = this.cv.width, H = this.cv.height, top = 26, bot = 8; return { W, H, X: (m) => (m / WORLD_W) * W, Y: (y) => top + (y / DEPTH) * (H - top - bot), top, bot }; }
  toWorld(ev) {
    const r = this.cv.getBoundingClientRect(), { W, H, top, bot } = this.geo;
    const px = (ev.clientX - r.left) * (W / r.width), py = (ev.clientY - r.top) * (H / r.height);
    const x = Math.max(0, Math.min(WORLD_W, (px / W) * WORLD_W)), y = ((py - top) / (H - top - bot)) * DEPTH;
    if (y < -60) return null;
    const fl = this.floorAt(x);
    return { x, y: Math.max(0, Math.min(y, fl - 1)), rock: y > fl + 40 };
  }
  floorAt(x) { const i = x / 5, a = this.floor[Math.floor(i)] ?? 0, b = this.floor[Math.ceil(i)] ?? a; return a + (b - a) * (i - Math.floor(i)); }
  markerAt(ev) {
    const r = this.cv.getBoundingClientRect(), { W, H, X, Y } = this.geo;
    const px = (ev.clientX - r.left) * (W / r.width), py = (ev.clientY - r.top) * (H / r.height);
    let best = null, bd = 13;
    for (const m of markersOf(this.h.getProfile())) { const d = Math.hypot(X(m.x) - px, Y(m.y) - 9 - py); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  flash(t) { const a = this.el.querySelector('.ch-at'); a.textContent = t; a.classList.add('warn'); clearTimeout(this.fT); this.fT = setTimeout(() => a.classList.remove('warn'), 1600); }
  // the plate where a marker is named: its name, its colour, and what to do with it
  openEdit(m, isNew) {
    this.sel = m; const { W, H, X, Y } = this.geo, r = this.cv.getBoundingClientRect(), k = r.width / W;
    const ed = this.edit, following = this.h.following() === m;
    ed.innerHTML = `<div class="ce-head">${isNew ? 'New marker' : 'Marker'} <small>${Math.round(m.x).toLocaleString()} m along · ${Math.round(m.y).toLocaleString()} m deep</small></div>
      <input class="ce-name" maxlength="28" value="${esc(m.name)}" spellcheck="false">
      <div class="ce-cols">${MARK_COLS.map((c) => `<button class="ce-col${c === m.col ? ' on' : ''}" data-col="${c}" style="--c:${c}" aria-label="Colour"></button>`).join('')}</div>
      <div class="ce-btns"><button class="ce-save">${isNew ? 'Set marker' : 'Save'}</button>${isNew ? '<button class="ce-cancel">Cancel</button>' : `<button class="ce-follow">${following ? 'Stop following' : 'Follow'}</button><button class="ce-del">Remove</button>`}</div>`;
    ed.hidden = false;
    const left = X(m.x) * k, topY = Y(m.y) * k, ew = 250;
    ed.style.left = Math.max(6, Math.min(r.width - ew - 6, left + (left > r.width / 2 ? -ew - 16 : 16))) + 'px';
    ed.style.top = Math.max(6, Math.min(r.height - 170, topY - 40)) + 'px';
    let col = m.col; const name = ed.querySelector('.ce-name');
    const save = () => {
      const M = markersOf(this.h.getProfile());
      m.name = name.value.trim().slice(0, 28) || 'Marker'; m.col = col;
      if (isNew) M.push(m);
      this.h.save(); this.closeEdit(); this.list();
    };
    ed.onclick = (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.col) { col = b.dataset.col; ed.querySelectorAll('.ce-col').forEach((x) => x.classList.toggle('on', x === b)); if (!isNew) { m.col = col; this.h.save(); } }
      else if (b.classList.contains('ce-save')) save();
      else if (b.classList.contains('ce-cancel')) this.closeEdit();
      else if (b.classList.contains('ce-follow')) { m.name = name.value.trim().slice(0, 28) || m.name; this.h.follow(following ? null : m); this.h.save(); this.closeEdit(); this.list(); }
      else if (b.classList.contains('ce-del')) { const M = markersOf(this.h.getProfile()), i = M.indexOf(m); if (i >= 0) M.splice(i, 1); if (this.h.following() === m) this.h.follow(null); this.h.save(); this.closeEdit(); this.list(); }
    };
    name.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') save(); else if (ev.key === 'Escape') this.closeEdit(); };
    setTimeout(() => { name.focus(); name.select(); }, 0);
  }
  closeEdit() { this.edit.hidden = true; this.sel = null; if (document.activeElement && this.edit.contains(document.activeElement)) document.activeElement.blur(); }
  list() {
    const M = markersOf(this.h.getProfile()), f = this.h.following();
    this.el.querySelector('.ch-list').innerHTML = M.length ? M.map((m, i) => `<span class="ch-chip${f === m ? ' on' : ''}"><button data-ch="pick|${i}"><i style="background:${m.col}"></i>${esc(m.name)} <small>${Math.round(m.y).toLocaleString()} m</small></button><button class="ch-go" data-ch="follow|${i}" title="${f === m ? 'Stop following' : 'Follow: a trail leads there'}">${f === m ? '■' : '➜'}</button></span>`).join('') : '<span class="ch-none">No markers yet</span>';
  }
  draw() {
    const g = this.h.getGame(), P = this.h.getProfile(); if (!g || !P || !this.floor) return;
    const x = this.cv.getContext('2d'), { W, H, X, Y, top } = this.geo, t = performance.now() / 1000;
    // the water, lighter at the top; a strip of sky above the surface
    const wg = x.createLinearGradient(0, top, 0, H); wg.addColorStop(0, '#1d5670'); wg.addColorStop(0.06, '#123a50'); wg.addColorStop(0.3, '#0b2434'); wg.addColorStop(1, '#050f17');
    x.fillStyle = '#1a2a30'; x.fillRect(0, 0, W, top); x.fillStyle = wg; x.fillRect(0, top, W, H - top);
    // the zones: a faint line at each, named at the left
    x.font = '11px "IBM Plex Mono", monospace'; x.textBaseline = 'alphabetic';
    for (const [d, name] of ZONES) {
      if (d) { x.strokeStyle = 'rgba(160,200,210,0.13)'; x.setLineDash([3, 5]); x.beginPath(); x.moveTo(0, Y(d)); x.lineTo(W, Y(d)); x.stroke(); x.setLineDash([]); }
      x.fillStyle = 'rgba(190,220,226,0.42)'; x.fillText(`${name.toUpperCase()}${d ? '  ' + d.toLocaleString() + ' m' : ''}`, 14, Y(d) + 14);
    }
    // the deepest he has been: a dashed brass line
    const deep = Math.max(P.deepest || 0, g.earl.maxDepth || 0);
    if (deep > 30) { x.strokeStyle = 'rgba(242,184,74,0.5)'; x.setLineDash([6, 5]); x.beginPath(); x.moveTo(0, Y(deep)); x.lineTo(W, Y(deep)); x.stroke(); x.setLineDash([]); }
    // the seabed: rock, darker below, with a light edge along its top
    x.beginPath(); x.moveTo(0, H); for (let i = 0; i < this.floor.length; i++) x.lineTo(X(i * 5), Y(this.floor[i])); x.lineTo(W, H); x.closePath();
    const rg = x.createLinearGradient(0, top, 0, H); rg.addColorStop(0, '#6a5a40'); rg.addColorStop(0.5, '#4a4234'); rg.addColorStop(1, '#2c2820');
    x.fillStyle = rg; x.fill();
    x.beginPath(); for (let i = 0; i < this.floor.length; i++) x[i ? 'lineTo' : 'moveTo'](X(i * 5), Y(this.floor[i])); x.strokeStyle = 'rgba(214,196,150,0.55)'; x.lineWidth = 1.5; x.stroke(); x.lineWidth = 1;
    if (deep > 30) { x.fillStyle = 'rgba(242,200,104,0.85)'; x.shadowColor = '#000'; x.shadowBlur = 3; x.fillText(`deepest so far · ${Math.round(deep).toLocaleString()} m`, 200, Y(deep) - 5); x.shadowBlur = 0; }
    // the surface
    x.strokeStyle = 'rgba(190,226,236,0.55)'; x.beginPath(); x.moveTo(0, Y(0)); x.lineTo(W, Y(0)); x.stroke();
    // places he knows: the Margaret, the station and Dave once found
    const label = (px, py, txt, col = 'rgba(236,230,210,0.85)') => { const w2 = x.measureText(txt).width / 2; x.fillStyle = col; x.textAlign = 'center'; x.fillText(txt, Math.max(w2 + 4, Math.min(W - w2 - 4, px)), py); x.textAlign = 'left'; };
    { const bx = X(BOAT.x), by = Y(0); x.fillStyle = '#d8d0b8'; x.beginPath(); x.moveTo(bx - 9, by - 3); x.lineTo(bx + 9, by - 3); x.lineTo(bx + 6, by + 2); x.lineTo(bx - 6, by + 2); x.closePath(); x.fill(); x.fillRect(bx - 1, by - 11, 2, 8); label(bx, by - 14, 'the Margaret'); }
    const site = (sx, txt) => { const py = Y(this.floorAt(sx)); x.fillStyle = '#e8d49a'; x.fillRect(X(sx) - 4, py - 7, 8, 7); label(X(sx), py - 11, txt); };
    if (P.stationFound) site(STATION.x, 'the station');
    if (P.daveVisits) site(DAVE.x, "Dave's");
    // the sub, when he is out of it; and him
    const e = g.earl;
    if (!e.inSub && g.sub && !g.sub.docked) { x.fillStyle = '#9ab0b4'; x.beginPath(); x.ellipse(X(g.sub.x), Y(Math.max(0, g.sub.y)), 6, 3, 0, 0, Math.PI * 2); x.fill(); }
    const ex = X(e.x), ey = Y(Math.max(0, e.y)), pr = 4 + 5 * ((t * 0.8) % 1);
    x.strokeStyle = `rgba(255,255,255,${(0.6 * (1 - ((t * 0.8) % 1))).toFixed(3)})`; x.beginPath(); x.arc(ex, ey, pr, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, 4, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillText('you', Math.min(W - 30, ex + 8), ey + (ey < top + 14 ? 14 : -6));
    // the markers: a pin each, its name beside it; the one being followed with a ring
    const f = this.h.following();
    for (const m of markersOf(P)) this.pin(x, X(m.x), Y(m.y), m.col, m.name, m === f, m === this.sel, t);
    if (this.sel && !markersOf(P).includes(this.sel)) this.pin(x, X(this.sel.x), Y(this.sel.y), this.sel.col, '', false, true, t);
    // the reading under the pointer
    const at = this.el.querySelector('.ch-at');
    if (!at.classList.contains('warn')) at.textContent = this.hover ? (this.hover.rock ? `${Math.round(this.hover.x).toLocaleString()} m along · rock` : `${Math.round(this.hover.x).toLocaleString()} m along · ${Math.round(this.hover.y).toLocaleString()} m deep`) : `You: ${Math.round(Math.max(0, e.y)).toLocaleString()} m deep`;
    if (this.hover && !this.hover.rock) { x.strokeStyle = 'rgba(236,230,210,0.25)'; x.beginPath(); x.moveTo(X(this.hover.x), top); x.lineTo(X(this.hover.x), H); x.moveTo(0, Y(this.hover.y)); x.lineTo(W, Y(this.hover.y)); x.stroke(); }
  }
  pin(x, px, py, col, name, followed, sel, t) {
    x.save();
    if (followed || sel) { x.strokeStyle = col; x.globalAlpha = 0.55 + 0.35 * Math.sin(t * 4); x.lineWidth = 1.5; x.beginPath(); x.arc(px, py - 9, 11, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1; }
    x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 4;
    x.fillStyle = col; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px - 3, py - 5, px - 7, py - 8, px - 7, py - 12); x.arc(px, py - 12, 7, Math.PI, 0); x.bezierCurveTo(px + 7, py - 8, px + 3, py - 5, px, py); x.fill();
    x.shadowBlur = 0; x.fillStyle = 'rgba(20,16,8,0.75)'; x.beginPath(); x.arc(px, py - 12, 2.6, 0, Math.PI * 2); x.fill();
    if (name) { x.font = '500 13px "EB Garamond", Georgia, serif'; x.fillStyle = '#ece6d2'; x.shadowColor = '#000'; x.shadowBlur = 4; x.fillText(name, px + 10, py - 8); }
    x.restore();
  }
}
