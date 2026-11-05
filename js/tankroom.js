// The back of the submersible, full screen: two steel compartments joined by a hatch.
// The chamber room: pressure chambers (after the SubCAS chambers fisheries scientists use) strapped
// to a riveted bulkhead, a pipe run feeding them, a caged lamp and a porthole onto the water outside.
// The tank room: the open tank set into the wall, and the catch bag hanging on its hook.
// Each animal has a small brass tag (its name, where it was found, how it is); tap a tag, a chamber
// or a fish to open its choices. How it swims shows how it is doing.
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies } from './creatures_draw.js';
import { tankSlots, pressSlots, chamberRating, chamberMax, homeOf, gapOf, SAFE_GAP, freeChamber, tankUsed } from './capture.js';
import { UPGRADES } from './economy.js';
import { clamp, lerp, TAU } from './util.js';

const MAX_CHAMBERS = UPGRADES.pressTanks.base + UPGRADES.pressTanks.max;
const CW = 150, CH = 330; // a chamber, in its own units
const tankLen = (len, max) => clamp(len * 1.6 * 110, 20, max);
// how an animal is doing, in a word, and its colour
function stateOf(g, s, inBag) {
  if (s.cond <= 0.05) return ['dead', '#9a9a9a'];
  if (gapOf(g, s, inBag) > SAFE_GAP) return ['dying', '#ff6a50'];
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
      <div class="tr-help" hidden></div>`;
    this.c = root.querySelector('.tr-canvas'); this.over = root.querySelector('.tr-over');
    root.querySelector('.tr-close').addEventListener('click', () => this.h.close());
    root.querySelector('.tr-help-btn').addEventListener('click', () => { const hp = root.querySelector('.tr-help'); hp.hidden = !hp.hidden; });
    root.querySelector('.tr-help').innerHTML = `<p>Every animal has the pressure it lives at. Up to ${SAFE_GAP} m short of it, it lives, stressed; further, it starts to die.</p>
      <p>A chamber pumps an animal back up to its own pressure and it recovers there. Its rating is how much more than the water outside it can hold: it keeps an animal safe until the sub climbs above the animal's depth less the rating. The gauge's green band is what it can hold where you are.</p>
      <p>Ease it up (the valve open a crack) and the chamber sinks slowly toward the surface; an animal held at its own pressure eases with it and arrives acclimated: worth a quarter more.</p>
      <p>Dead animals sell for half the plain market price.</p>`;
    this.over.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-tk]');
      if (b) { if (!b.disabled) { const [act, where, i] = b.dataset.tk.split(':'); this.h.act(act, where, +i); this.openKey = null; this.layout(true); } return; }
      const tag = ev.target.closest('[data-tag]');
      if (tag) { this.openKey = this.openKey === tag.dataset.tag ? null : tag.dataset.tag; this.layout(true); return; }
      const go = ev.target.closest('[data-go]');
      if (go) { this.room = go.dataset.go; this.openKey = null; this.layout(true); }
    });
    // tap a chamber or a fish to open its tag; tap nothing to close it
    this.c.addEventListener('click', (ev) => {
      const hit = this.hitTest(ev.clientX, ev.clientY);
      this.openKey = hit && hit !== this.openKey ? hit : null;
      this.layout(true);
    });
    this.onKey = (ev) => {
      if (this.root.hidden) return;
      if (ev.key === 'ArrowRight' && this.room === 'chambers') { this.room = 'tank'; this.openKey = null; this.layout(true); }
      else if (ev.key === 'ArrowLeft' && this.room === 'tank') { this.room = 'chambers'; this.openKey = null; this.layout(true); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  open() { this.openKey = null; this.sig = ''; this.layout(true); }

  // ---------------- where things go on screen ----------------
  geometry() {
    const W = window.innerWidth, H = window.innerHeight, narrow = W < 700;
    const g = this.h.getGame(), ps = g ? pressSlots(g) : 1;
    // on a narrow screen: only the fitted chambers and one empty bracket, the hatch at the bottom
    const n = narrow ? Math.min(MAX_CHAMBERS, ps + 1) : MAX_CHAMBERS, areaW = narrow ? W * 0.92 : W * 0.74, x0 = narrow ? W * 0.04 : W * 0.05;
    const k = Math.min((H * (narrow ? 0.45 : 0.6)) / CH, (areaW / n) / (CW + 24));
    const gap = (areaW - n * CW * k) / n;
    const top = H * 0.14;
    const chambers = Array.from({ length: n }, (_, i) => ({ x: x0 + gap / 2 + i * (CW * k + gap), y: top, k }));
    const hatchSide = (x) => (narrow ? { x: W * 0.5, y: H * 0.84, r: Math.min(W, H) * 0.09 } : { x, y: H * 0.66, r: Math.min(W, H) * 0.13 });
    return { W, H, k, narrow, chambers, tagY: top + CH * k + 10, floor: H * 0.9,
      port: narrow ? null : { x: W * 0.9, y: H * 0.3, r: Math.max(34, Math.min(W, H) * 0.075) },
      hatchR: hatchSide(W * 0.92), hatchL: hatchSide(W * 0.07),
      tank: narrow ? { x: W * 0.05, y: H * 0.13, w: W * 0.9, h: H * 0.3 } : { x: W * 0.17, y: H * 0.14, w: W * 0.6, h: Math.min(H * 0.42, W * 0.3) },
      hook: narrow ? { x: W * 0.84, y: H * 0.56 } : { x: W * 0.86, y: H * 0.16 },
      bagTag: narrow ? (i) => [W * 0.42, H * 0.56 + i * 70] : (i) => [W * 0.86, H * 0.16 + 150 + i * 70] };
  }
  signature(g) {
    return [this.room, this.openKey, pressSlots(g), tankSlots(g), g.subTank.map((s) => `${s.id}${s.pressed ? 'p' + s.chamber : 'o'}${s.bleed ? 'b' : ''}`).join(','), g.bag.map((s) => s.id).join(','), window.innerWidth, window.innerHeight].join('|');
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
    this.root.querySelector('.tr-room').textContent = this.room === 'chambers' ? 'The chamber room' : 'The tank room';
    const tag = (s, where, i, x, y, extra = '') => {
      const key = this.keyOf(s), open = this.openKey === key, sp = SPECIES_BY_ID[s.id];
      let acts = '';
      if (open) {
        const freeC = freeChamber(g) >= 0 && s.cond > 0.05, freeT = tankUsed(g) < tankSlots(g);
        if (s.pressed) {
          if (!s.acc && s.cond > 0.05) acts += `<button data-tk="bleed:tank:${i}">${s.bleed ? 'Close the valve' : 'Ease it up'}</button>`;
          acts += `<button data-tk="open:tank:${i}" ${freeT ? '' : 'disabled'}>To the open tank</button>`;
        } else {
          if (where === 'bag') acts += `<button data-tk="open:bag:${i}" ${freeT ? '' : 'disabled'}>Into the open tank</button>`;
          acts += `<button data-tk="press:${where}:${i}" ${freeC ? '' : 'disabled'}>Into a chamber</button>`;
        }
        acts += `<button class="ghost" data-tk="release:${where}:${i}">Let go</button>`;
      }
      return `<div class="btag${open ? ' open' : ''}" data-tag="${key}" data-where="${where}" data-i="${i}" style="left:${x}px;top:${y}px${extra}">
        <b>${s.variant ? `<span class="rare r-${s.variant}">${s.variant}</span> ` : ''}${sp.name}</b><small>found at ${s.from || 0} m</small><i class="st"></i>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
    };
    let html = '';
    if (this.room === 'chambers') {
      const by = new Map(g.subTank.map((s, i) => [s, i]).filter(([s]) => s.pressed).map(([s, i]) => [s.chamber, [s, i]]));
      const ps = pressSlots(g);
      G.chambers.forEach((c, n) => {
        const x = c.x + CW * c.k / 2;
        if (n >= ps) html += `<div class="btag blank" style="left:${x}px;top:${G.tagY}px"><small>not fitted</small></div>`;
        else if (by.has(n)) { const [s, i] = by.get(n); html += tag(s, 'tank', i, x, G.tagY); }
        else html += `<div class="btag blank" style="left:${x}px;top:${G.tagY}px"><small>chamber ${n + 1} · empty</small></div>`;
      });
      html += `<button class="hatch-btn" data-go="tank" style="left:${G.hatchR.x}px;top:${G.hatchR.y}px">The tank room →</button>`;
    } else {
      const open = g.subTank.map((s, i) => [s, i]).filter(([s]) => !s.pressed);
      const T = G.tank, n = Math.max(1, tankSlots(g)), step = T.w / n;
      open.forEach(([s, i], k) => { html += tag(s, 'tank', i, T.x + step * (k + 0.5), T.y + T.h + 18); });
      for (let k = open.length; k < tankSlots(g); k++) html += `<div class="btag blank" style="left:${T.x + step * (k + 0.5)}px;top:${T.y + T.h + 18}px"><small>room for one</small></div>`;
      g.bag.forEach((s, i) => { const [bx, byy] = G.bagTag(i); html += tag(s, 'bag', i, bx, byy); });
      html += `<button class="hatch-btn" data-go="chambers" style="left:${G.hatchL.x}px;top:${G.hatchL.y}px">← The chamber room</button>`;
    }
    this.over.innerHTML = html;
    this.states(g);
  }
  states(g) {
    this.root.querySelector('.tr-depth').textContent = `outside ${Math.max(0, Math.round(g.sub.y))} m`;
    this.over.querySelectorAll('.btag[data-tag]').forEach((el) => {
      const where = el.dataset.where, s = (where === 'bag' ? g.bag : g.subTank)[+el.dataset.i];
      if (!s) return;
      const [w, col] = stateOf(g, s, where === 'bag');
      const st = el.querySelector('.st');
      const txt = `<span style="background:${col}"></span>${w}${s.bleed ? ' · easing up' : ''}`;
      if (st.innerHTML !== txt) st.innerHTML = txt;
    });
  }
  hitTest(cx, cy) {
    const g = this.h.getGame(), G = this.geometry();
    if (!g) return null;
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
    for (const s of g.subTank) {
      if (s.pressed) continue;
      const a = this.anim.get(s);
      if (!a) continue;
      const d = Math.hypot(G.tank.x + a.x - cx, G.tank.y + a.y - cy);
      if (d < bd) { bd = d; best = s; }
    }
    return best ? this.keyOf(best) : null;
  }

  update(dt) {
    const g = this.h.getGame();
    if (!g) return;
    this.t += dt; this.infoT += dt;
    if (this.signature(g) !== this.sig) this.layout(true);
    else if (this.infoT > 0.3) { this.infoT = 0; this.states(g); }
    const G = this.geometry(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = this.c;
    if (c.width !== Math.round(G.W * dpr) || c.height !== Math.round(G.H * dpr)) { c.width = Math.round(G.W * dpr); c.height = Math.round(G.H * dpr); this.wall = null; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawWall(ctx, G, dpr);
    if (this.room === 'chambers') this.drawChamberRoom(ctx, G, g, dt);
    else this.drawTankRoom(ctx, G, g, dt);
    this.drawLamp(ctx, G);
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
    const py = G.chambers[0].y - 26;
    ctx.fillStyle = '#4b5355'; ctx.fillRect(0, py - 6, G.W * 0.82, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, py - 5, G.W * 0.82, 3);
    G.chambers.forEach((c, n) => {
      if (n >= ps) return;
      const tx = c.x + 95 * c.k;
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
    const dk = clamp(d / 600, 0, 1);
    const wg = ctx.createLinearGradient(0, -P.r, 0, P.r);
    wg.addColorStop(0, `rgb(${Math.round(lerp(60, 3, dk))},${Math.round(lerp(140, 12, dk))},${Math.round(lerp(170, 22, dk))})`);
    wg.addColorStop(1, `rgb(${Math.round(lerp(20, 1, dk))},${Math.round(lerp(70, 6, dk))},${Math.round(lerp(100, 12, dk))})`);
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
    for (const y of [110, 280]) { ctx.beginPath(); ctx.arc(75, y, 40, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (const [x, y] of [[30, 110], [120, 110], [30, 280], [120, 280]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
  }
  drawChamber(ctx, g, s, rating, cmax, outside, dt, idx) {
    const t = this.t, cx = CW / 2, X0 = 38, X1 = 112, TOP = 92, BOT = 312;
    // wall straps behind it
    ctx.fillStyle = '#2a2f30'; for (const y of [120, 270]) ctx.fillRect(28, y - 5, 94, 10);
    ctx.fillStyle = '#16181a';
    ctx.beginPath(); ctx.moveTo(40, 92); ctx.lineTo(6, 86); ctx.quadraticCurveTo(2, 90, 6, 95); ctx.lineTo(40, 99); ctx.fill();
    const body = new Path2D();
    body.moveTo(X0, TOP); body.lineTo(X1, TOP); body.lineTo(X1, BOT - 12); body.quadraticCurveTo(X1, BOT, X1 - 12, BOT); body.lineTo(X0 + 12, BOT); body.quadraticCurveTo(X0, BOT, X0, BOT - 12); body.closePath();
    const wg = ctx.createLinearGradient(X0, 0, X1, 0);
    wg.addColorStop(0, 'rgba(28,30,110,0.95)'); wg.addColorStop(0.35, 'rgba(70,80,190,0.78)'); wg.addColorStop(0.6, 'rgba(84,96,205,0.74)'); wg.addColorStop(1, 'rgba(24,26,96,0.95)');
    ctx.fillStyle = wg; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    ctx.fillStyle = 'rgba(40,40,48,0.8)'; ctx.beginPath(); ctx.arc(cx, 236, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(190,40,40,0.75)'; ctx.beginPath(); ctx.arc(cx - 3, 233, 6, Math.PI * 0.8, Math.PI * 1.8); ctx.fill();
    ctx.strokeStyle = 'rgba(150,150,170,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 0; k <= 12; k++) ctx.lineTo(cx - 12 + k * 2, 258 + (k % 2 ? -4 : 4)); ctx.stroke();
    const home = s ? homeOf(s) : 0, pumping = s && !s.bleed && (s.press || 0) < Math.min(home, cmax) - 1;
    if (s) {
      const L = tankLen(s.len, 62);
      const a = this.swim(g, s, false, { x0: X0 + 4, x1: X1 - 4, y0: TOP + 26, y1: BOT - 14 }, L, dt, 0.6);
      this.drawFish(ctx, g, s, a, L, false);
    }
    const n = pumping ? 14 : s && s.bleed ? 6 : 3;
    for (let k = 0; k < n; k++) {
      const q = (t * (pumping ? 0.6 : 0.15) + k / n + idx * 0.37) % 1, bx = cx + Math.sin(k * 7.1 + idx) * 22 + Math.sin(q * 9 + k) * 3;
      ctx.strokeStyle = `rgba(210,230,255,${(0.5 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx, BOT - 8 - q * (BOT - TOP - 10), 1.5 + (k % 3), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X0 + 7, TOP + 4, 6, BOT - TOP - 18);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(X0 + 16, TOP + 4, 3, BOT - TOP - 18);
    ctx.strokeStyle = 'rgba(10,10,40,0.35)'; ctx.lineWidth = 1;
    for (const x of [X0 + 24, X0 + 46, X1 - 8]) { ctx.beginPath(); ctx.moveTo(x, TOP + 2); ctx.lineTo(x, BOT - 6); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(160,170,255,0.4)'; ctx.stroke(body);
    for (const y of [TOP + 14, BOT - 34]) {
      const cg = ctx.createLinearGradient(0, y - 3, 0, y + 3);
      cg.addColorStop(0, '#f2f2f2'); cg.addColorStop(0.5, '#9a9a9a'); cg.addColorStop(1, '#d8d8d8');
      ctx.fillStyle = cg; ctx.fillRect(X0 - 2, y - 3, X1 - X0 + 4, 6);
      ctx.fillStyle = '#777'; ctx.fillRect(X1 - 14, y - 4, 8, 8);
    }
    const hg = ctx.createLinearGradient(28, 0, 122, 0);
    hg.addColorStop(0, '#0b0b0c'); hg.addColorStop(0.3, '#2c2d30'); hg.addColorStop(0.55, '#1a1b1d'); hg.addColorStop(1, '#070708');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(28, 42, 94, 50, 6); ctx.fill();
    ctx.fillStyle = '#26272a'; ctx.beginPath(); ctx.ellipse(cx, 43, 47, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#121214'; ctx.fillRect(32, 84, 86, 10);
    ctx.fillStyle = '#3d4c5c'; ctx.beginPath(); ctx.roundRect(2, 54, 30, 16, 4); ctx.fill();
    ctx.fillStyle = '#58b3d8'; ctx.fillRect(0, 57, 4, 10);
    ctx.fillStyle = s && s.bleed ? '#ff5a3a' : '#c8321f';
    ctx.save(); ctx.translate(16, 52); ctx.rotate(s && s.bleed ? -0.6 : 0); ctx.beginPath(); ctx.roundRect(-8, -9, 16, 10, 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#111'; ctx.fillRect(92, 24, 6, 16);
    ctx.fillStyle = '#3a9ee0'; ctx.save(); ctx.translate(95, 22); ctx.rotate(s && s.bleed ? 0.9 : 0); ctx.fillRect(-9, -3, 18, 6); ctx.restore();
    if (s && s.bleed) for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; ctx.fillStyle = `rgba(220,235,255,${(0.6 * (1 - q)).toFixed(3)})`; ctx.beginPath(); ctx.arc(100 + q * 10, 18 - q * 14, 1.5, 0, TAU); ctx.fill(); }
    // the gauge: 0-4,000 m; a green band for what the chamber can hold here (outside to outside +
    // rating); the needle turns amber when the animal needs more than that
    const gx = cx - 8, gy = 66, gr = 15, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (m) => a0 + (a1 - a0) * clamp(m / 4000, 0, 1);
    ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,170,80,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, gy, gr - 3, ang(outside), Math.max(ang(outside) + 0.05, ang(cmax))); ctx.stroke();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    for (let k = 0; k <= 8; k++) { const q = a0 + (a1 - a0) * k / 8; ctx.beginPath(); ctx.moveTo(gx + Math.cos(q) * (gr - 2), gy + Math.sin(q) * (gr - 2)); ctx.lineTo(gx + Math.cos(q) * (gr - 5), gy + Math.sin(q) * (gr - 5)); ctx.stroke(); }
    const short = s && home > cmax + 1;
    const na = ang(s ? s.press || 0 : outside) + (pumping ? Math.sin(t * 30) * 0.02 : 0);
    ctx.strokeStyle = short ? '#e89a20' : '#a0201a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (gr - 4), gy + Math.sin(na) * (gr - 4)); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(gx, gy, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a120c'; ctx.fillRect(cx + 12, 58, 34, 16);
    ctx.fillStyle = short ? '#f0b040' : s ? '#9fe08a' : '#3d5a36'; ctx.font = '9px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s ? `${Math.round(s.press || 0)}m` : '---', cx + 29, 66);
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
    const w = T.w, h = T.h, top = 6, bot = h - 4;
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, '#1d5f70'); wg.addColorStop(1, '#0a2a33');
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
    const maxL = clamp(h * 0.45, 40, 140);
    for (const s of g.subTank) {
      if (s.pressed) continue;
      const L = tankLen(s.len, maxL) * clamp(h / 220, 0.8, 1.6);
      const a = this.swim(g, s, false, { x0: 10, x1: w - 10, y0: top + 14, y1: bot - 18 }, L, dt);
      this.drawFish(ctx, g, s, a, L, false);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, w, 8);
    ctx.restore();
    // the catch bag, on its hook
    const hk = G.hook;
    ctx.strokeStyle = '#8a9294'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hk.x, hk.y - 20); ctx.lineTo(hk.x, hk.y); ctx.arc(hk.x - 8, hk.y, 8, 0, Math.PI); ctx.stroke();
    const n = g.bag.length, bw = 70, bh = 60 + Math.min(4, n) * 10;
    ctx.save(); ctx.translate(hk.x - 8, hk.y + 8);
    ctx.fillStyle = 'rgba(30,60,40,0.75)'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.quadraticCurveTo(bw * 0.6, bh * 0.4, bw * 0.3, bh); ctx.quadraticCurveTo(0, bh + 14, -bw * 0.3, bh); ctx.quadraticCurveTo(-bw * 0.6, bh * 0.4, -6, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,130,0.45)'; ctx.lineWidth = 1;
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 4, 2); ctx.lineTo(k * 9, bh + 4); ctx.stroke(); }
    for (let k = 1; k < 6; k++) { const y = k * bh / 6; ctx.beginPath(); ctx.moveTo(-bw * 0.4, y); ctx.quadraticCurveTo(0, y + 6, bw * 0.4, y); ctx.stroke(); }
    ctx.restore();
    this.drawHatch(ctx, G.hatchL);
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
    if (dead) { ctx.scale(1, -1); ctx.globalAlpha = 0.85; drawSpecies(ctx, sp, L, 0, 0, 0); ctx.restore(); return; }
    const f = Math.abs(a.face) < 0.08 ? 0.08 * Math.sign(a.face || 1) : a.face;
    ctx.rotate((clamp(a.vy * 0.02, -0.3, 0.3) + a.roll) * Math.sign(f));
    // a roll: over onto its back and up again
    const sy = a.flipT > 0 ? Math.cos((1 - a.flipT / 0.9) * TAU) : 1;
    ctx.scale(-f, Math.abs(sy) < 0.1 ? 0.1 * Math.sign(sy || 1) : sy);
    drawSpecies(ctx, sp, L, a.phase, lerp(0.15, 1, a.vit ?? 1), 0);
    ctx.restore();
  }
}
