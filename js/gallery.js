import { rarityStars, rarityCls, rarityCol } from './specimens.js';
// The aquarium gallery, walked aboard the Margaret: one big lit tank, every animal in it together (a deep
// one lives here well enough if it came up healthy). Tap one for its brass tag: its name, how it is doing (Happy after five
// minutes healthy, Famous fifteen minutes after that), and what can be done: pet it, feed it, sell
// it, or send it down to the sub's pressure tank to be released at home. The lighting can be set
// for the whole gallery: daylight, dim, or the red light deep animals can't see.
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies } from './creatures_draw.js';
import { aquariumOf, isHappy, HAPPY_AFTER, FAMOUS_AFTER, gallerySale, gallerySlots, GALLERY_STEPS } from './aquarium.js';
import { VARIANTS, makeVariantSprite } from './variants.js';
import { clamp, lerp, TAU } from './util.js';
import { usualDepth } from './fauna.js';
import { paintedText } from './fittings.js';

// (4.0.0) an animal whose usual depth is centred below 500 m lives in the pressurised display tank, and only
// there; every other one in the open display tank
export const deepKeeper = (sp) => { const [lo, hi] = usualDepth(sp); return (lo + hi) / 2 > 500; };

const LIGHTS = { day: { name: 'Daylight', water: ['#3a9ab4', '#17566a'], tint: null }, dim: { name: 'Dim', water: ['#123844', '#061a22'], tint: 'rgba(0,10,20,0.35)' }, red: { name: 'Red', water: ['#3a1416', '#12080a'], tint: 'rgba(120,10,10,0.28)' } };
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// two small crosses where its eye is: a dead fish in a tank (head toward -x, as every creature is drawn)
export function xEyes(ctx, L, sp) {
  const h = Math.min(0.6, (sp.v.h || 0.3));
  const x = -L * 0.36, y = -L * h * 0.12, r = Math.max(1.5, L * 0.035);
  ctx.save(); ctx.strokeStyle = 'rgba(20,20,20,0.9)'; ctx.lineWidth = Math.max(1, L * 0.012); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
  ctx.restore();
}

// a rare form (albino, melanistic...) drawn as the sea draws it: the species drawn plain into a square,
// then the variant applied (cached by species, form, size and one of 12 swim frames)
const VCACHE = new Map();
function drawVariantFish(ctx, sp, v, L, ph) {
  const PER = TAU / 3, f = Math.floor(((ph % PER) + PER) % PER / PER * 12) % 12, Lb = Math.round(L / 4) * 4 || 4;
  const key = sp.id + v + ':' + Lb + ':' + f;
  let c = VCACHE.get(key);
  if (!c) {
    const box = Math.ceil(Lb * 2.4), base = document.createElement('canvas'); base.width = base.height = box;
    const bx = base.getContext('2d'); bx.translate(box / 2, box / 2); drawSpecies(bx, sp, Lb, f / 12 * PER, 0.6, 0);
    c = makeVariantSprite(base, v, Lb, sp); VCACHE.set(key, c);
    if (VCACHE.size > 300) VCACHE.delete(VCACHE.keys().next().value);
  }
  const k = L / Lb; ctx.drawImage(c, -c.width * k / 2, -c.height * k / 2, c.width * k, c.height * k);
}

export class Gallery {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.t = 0; this.anim = new Map(); this.open = null; this.sig = ''; this.hearts = [];
    root.innerHTML = `<canvas class="tr-canvas"></canvas><div class="tr-over"></div>
      <div class="tr-plate"><b>The aquarium</b><span class="gl-sub"></span></div>
      <div class="gl-lights"></div>
      <div class="gl-catch"></div>
      <button class="tr-close" aria-label="Close">×</button>`;
    this.c = root.querySelector('.tr-canvas'); this.over = root.querySelector('.tr-over');
    root.querySelector('.tr-close').addEventListener('click', () => this.h.close());
    root.querySelector('.gl-lights').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-light]'); if (b) { this.h.setLight(b.dataset.light); this.sig = ''; } });
    this.c.addEventListener('pointerdown', (ev) => { const k = this.fishAt(ev.clientX, ev.clientY); this.open = k && k !== this.open ? k : null; this.sig = ''; });
    this.over.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-gl]');
      if (!b || b.disabled) return;
      const [act, key] = b.dataset.gl.split('|');
      if (act === 'pet') { const a = this.anim.get(key); if (a) for (let k = 0; k < 4; k++) this.hearts.push({ x: a.sx, y: a.sy - 10, t: -k * 0.15 }); }
      if (act === 'rename') { const inp = this.over.querySelector(`input[data-name="${CSS.escape(key)}"]`); this.h.act('rename', key, inp ? inp.value : ''); }
      else this.h.act(act, key);
      if (act === 'sell' || act === 'tosub') this.open = null;
      this.sig = '';
    });
    // (2.6.8) the catch: put an animal into the tank from here (the only way in)
    root.querySelector('.gl-catch').addEventListener('click', (ev) => { const b = ev.target.closest('button[data-place]'); if (b && !b.disabled) { this.h.act('place', b.dataset.place); this.sig = ''; }
      const r = ev.target.closest('button[data-room]'); if (r && !r.disabled) { this.h.act('room'); this.sig = ''; } });
    this.over.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { const inp = ev.target.closest('input[data-name]'); if (inp) { this.h.act('rename', inp.dataset.name, inp.value); this.sig = ''; } } });
  }
  show() { this.open = null; this.sig = ''; }

  geometry(P) {
    const W = window.innerWidth, H = window.innerHeight;
    // (4.0.0) two tanks side by side: the open display tank, and the pressurised one for the deep (the right-hand
    // column holds the catch, to put in)
    const y = H * 0.14, h = H * 0.68;
    return { W, H, rows: [
      { wing: { id: 'open', name: 'Open display' }, x: W * 0.04, y, w: W * 0.43, h },
      { wing: { id: 'press', name: 'Pressure display' }, x: W * 0.52, y: y + h * 0.12, w: W * 0.235, h: h * 0.88 },
    ] };
  }
  fishAt(cx, cy) {
    let best = null, bd = 50;
    for (const [k, a] of this.anim) { if (!a.alive) continue; const d = Math.hypot(a.sx - cx, a.sy - cy); if (d < Math.max(bd, a.L * 0.5) && d < bd + a.L * 0.3) { bd = d; best = k; } }
    return best;
  }
  layout(g, P, G) {
    const A = aquariumOf(P), light = A.light || 'day';
    const cand = this.h.catch ? this.h.catch() : [];
    const sig = [cand.map((c) => c.where + c.i + c.s.id + (c.s.kept ? 'k' : '') + (c.why || '')).join(','), this.open, light, window.innerWidth, window.innerHeight, Object.entries(A.display).map(([k, d]) => `${k}${d.name}${isHappy(d) ? 'h' : ''}${d.famous ? 'f' : ''}${d.cond <= 0.05 ? 'x' : ''}`).join(','), g.sub.docked ? 'd' : ''].join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    this.root.querySelector('.gl-lights').innerHTML = Object.entries(LIGHTS).map(([k, L]) => `<button data-light="${k}" class="${k === light ? 'on' : ''}">${L.name}</button>`).join('');
    const nShown = Object.keys(A.display).length;
    this.root.querySelector('.gl-sub').textContent = `(${nShown}/${gallerySlots(P)}) places · aboard the Margaret`;
    // the catch aboard, the kept ones first: one button each to put it into the tank
    const full = nShown >= gallerySlots(P);
    // (3.0.15) more room, bought right here: two more places a time
    const lvG = P.galleryLv || 0, step = GALLERY_STEPS[lvG];
    const roomBtn = step !== undefined ? `<button class="gl-room" data-room="1" ${P.cash + 1e-6 < step ? 'disabled' : ''}>More room · ${gallerySlots(P)} → ${gallerySlots({ galleryLv: lvG + 1 })} places · $${step.toLocaleString()}</button>` : '<p>The aquarium is as big as the Margaret can hold.</p>';
    this.root.querySelector('.gl-catch').innerHTML = !cand.length ? '<h4>Your catch</h4><p>Nothing alive aboard to put in. Bring something up, and Keep it on the Sell tab so it is not sold.</p>' : `<h4>Your catch</h4>` + cand.slice(0, 12).map((c) => {
      const sp = SPECIES_BY_ID[c.s.id], why = c.why;
      return `<button data-place="${c.where}:${c.i}" ${why ? `disabled title="${esc(why)}"` : 'title="Put it into the tank"'} class="${c.s.kept ? 'kept' : ''}">${c.s.variant ? `<em class="rarel r-${c.s.variant}">${VARIANTS[c.s.variant].name}</em> ` : ''}${esc(sp.name)}${c.s.kept ? '<small>kept</small>' : ''}${why ? `<small>${esc(why)}</small>` : ''}</button>`;
    }).join('') + (full ? '<p>The tank is full: sell one, or buy more room below.</p>' : '');
    this.root.querySelector('.gl-catch').insertAdjacentHTML('beforeend', roomBtn);
    let html = '';
    if (!nShown) html += `<div class="gl-empty">The tank is empty. Put in a live animal from your catch (on the right).</div>`;
    const d = this.open && A.display[this.open], a = this.open && this.anim.get(this.open);
    if (d && a) {
      const sp = SPECIES_BY_ID[d.id], dead = d.cond <= 0.05;
      const happy = isHappy(d), toHappy = Math.max(0, HAPPY_AFTER - (d.happyT || 0)), toFamous = Math.max(0, FAMOUS_AFTER - (d.famT || 0));
      const st = dead ? 'dead' : d.cond < 0.7 ? 'recovering' : happy ? 'happy' : 'settling in';
      const prog = dead ? '' : d.famous ? '<em class="gl-famous">Famous</em>' : happy ? `famous in ${Math.ceil(toFamous / 60)} min` : d.cond >= 0.7 ? `happy in ${Math.ceil(toHappy / 60)} min` : 'needs to get well first';
      const x = clamp(a.sx, 150, G.W - 150), y = a.sy + 30 > G.H - 220 ? a.sy - 230 : a.sy + 30;
      html += `<div class="btag open gl-tag${rarityCls(sp)}" style="left:${x}px;top:${y}px">${rarityStars(sp)}
        ${dead ? '' : `<input data-name="${esc(this.open)}" maxlength="18" placeholder="give it a name" value="${esc(d.name || '')}">`}
        <b${rarityCol(sp) ? ` style="color:${rarityCol(sp)}"` : ''}>${d.name ? esc(d.name) + ', ' : ''}${sp.name}</b>${d.variant ? `<em class="rarel r-${d.variant}">${VARIANTS[d.variant].name}</em>` : ''}
        <small>${st}${prog ? ' · ' + prog : ''}</small>
        <small>sells for about $${Math.round(gallerySale(d) * (this.h.pay ? this.h.pay() : 1)).toLocaleString()}${!dead && (happy || d.famous) ? ` (x${((happy ? 1.2 : 1) * (d.famous ? 2 : 1)).toFixed(1)})` : ''}</small>
        <div class="acts">
          ${dead ? '' : `<button data-gl="pet|${esc(this.open)}">Pet</button><button data-gl="feed|${esc(this.open)}">Feed</button>${d.name !== undefined ? `<button data-gl="rename|${esc(this.open)}">Name</button>` : ''}`}
          <button data-gl="sell|${esc(this.open)}">${dead ? 'Take it out and sell' : 'Sell'}</button>
          ${dead ? '' : `<button data-gl="tosub|${esc(this.open)}" ${g.sub.docked && !g.sub.imploded ? '' : 'disabled'} title="Into one of the sub's pressure tanks, to take home and release">To the sub</button>`}
        </div></div>`;
    }
    this.over.innerHTML = html;
  }
  // the tank's few things: a sand floor, a rock, a tuft of seagrass in one corner, rising bubbles
  decor(ctx, r) {
    const base = r.y + r.h, t = this.t;
    ctx.save();
    ctx.fillStyle = '#5a5040'; ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.62, base - 6);
    ctx.quadraticCurveTo(r.x + r.w * 0.66, base - r.h * 0.13, r.x + r.w * 0.72, base - r.h * 0.1); ctx.quadraticCurveTo(r.x + r.w * 0.77, base - r.h * 0.08, r.x + r.w * 0.79, base - 6); ctx.fill();
    ctx.strokeStyle = '#5f8a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const x = r.x + r.w * 0.04 + k * 7, h = r.h * (0.16 + ((k * 7) % 5) * 0.025), sw = Math.sin(t * 0.8 + k * 0.7) * 6;
      ctx.beginPath(); ctx.moveTo(x, base - 6); ctx.quadraticCurveTo(x + sw * 0.5, base - h * 0.5, x + sw, base - h); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(220,240,255,0.3)';
    for (let k = 0; k < 10; k++) { const x = r.x + r.w * 0.9 + Math.sin(t * 2 + k) * 3, y = base - ((t * 40 + k * 37) % r.h); ctx.beginPath(); ctx.arc(x, y, 1.5 + (k % 3), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // (4.0.0) the open tank as the specimen tanks are drawn: glass walls with green edges and silicone seams, a
  // steel rim on top, a thick glass floor pane
  glassFrame(ctx, r) {
    const base = r.y + r.h;
    const gl = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0); gl.addColorStop(0, 'rgba(255,255,255,0.1)'); gl.addColorStop(0.05, 'rgba(255,255,255,0)'); gl.addColorStop(0.95, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.07)');
    ctx.fillStyle = gl; ctx.fillRect(r.x, r.y, r.w, r.h);
    for (const [sx, dir] of [[r.x - 5, 1], [r.x + r.w, -1]]) {
      const eg = ctx.createLinearGradient(sx, 0, sx + 5, 0); eg.addColorStop(0, 'rgba(120,190,170,0.55)'); eg.addColorStop(1, 'rgba(60,120,110,0.35)');
      ctx.fillStyle = eg; ctx.fillRect(sx, r.y - 2, 5, r.h + 10);
      ctx.fillStyle = 'rgba(20,24,22,0.55)'; ctx.fillRect(dir > 0 ? r.x : r.x + r.w - 2, r.y, 2, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(sx + (dir > 0 ? 1 : 3), r.y, 1, r.h);
    }
    const pg = ctx.createLinearGradient(0, base, 0, base + 10); pg.addColorStop(0, 'rgba(150,210,190,0.75)'); pg.addColorStop(1, 'rgba(40,80,70,0.85)');
    ctx.fillStyle = pg; ctx.fillRect(r.x - 5, base, r.w + 10, 10);
    const rg = ctx.createLinearGradient(0, r.y - 12, 0, r.y); rg.addColorStop(0, '#6a7276'); rg.addColorStop(0.5, '#3e4548'); rg.addColorStop(1, '#22272a');
    ctx.fillStyle = rg; ctx.fillRect(r.x - 9, r.y - 12, r.w + 18, 12); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(r.x - 9, r.y - 12, r.w + 18, 1);
  }
  // (4.0.0) the pressure tank: thick acrylic in a bolted steel frame, a gauge reading what it holds
  pressFrame(ctx, r, n) {
    const base = r.y + r.h, T = 16;
    const steel = (x, y, w, h, v) => { const g2 = v ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h); g2.addColorStop(0, '#5c6468'); g2.addColorStop(0.5, '#353c3f'); g2.addColorStop(1, '#1d2123'); ctx.fillStyle = g2; ctx.fillRect(x, y, w, h); };
    // the acrylic, seen through: a pale band inside the frame
    ctx.strokeStyle = 'rgba(170,210,220,0.18)'; ctx.lineWidth = 6; ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    steel(r.x - T, r.y - T, r.w + T * 2, T, false); steel(r.x - T, base, r.w + T * 2, T, false);
    steel(r.x - T, r.y, T, r.h, true); steel(r.x + r.w, r.y, T, r.h, true);
    ctx.fillStyle = '#9aa3a6';
    const bolt = (x, y) => { ctx.fillStyle = '#14181a'; ctx.beginPath(); ctx.arc(x + 0.6, y + 0.8, 3.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#8c9598'; ctx.beginPath(); ctx.arc(x, y, 2.8, 0, TAU); ctx.fill(); };
    for (let x = r.x - T / 2; x <= r.x + r.w + T / 2 + 1; x += (r.w + T) / 10) { bolt(x, r.y - T / 2); bolt(x, base + T / 2); }
    for (let y = r.y + 24; y < base - 10; y += (r.h - 20) / 7) { bolt(r.x - T / 2, y); bolt(r.x + r.w + T / 2, y); }
    // the gauge on the frame, top right
    const gx = r.x + r.w - 26, gy = r.y - T - 30, gr = 22;
    ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(gx, gy, gr + 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d9d6c8'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2a26'; ctx.lineWidth = 1; for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.75 + k / 10 * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.78); ctx.lineTo(gx + Math.cos(a) * gr * 0.92, gy + Math.sin(a) * gr * 0.92); ctx.stroke(); }
    const need = n ? 0.62 : 0.05, na = Math.PI * 0.75 + need * Math.PI * 1.5 + Math.sin(this.t * 1.7) * 0.01;
    ctx.strokeStyle = '#a3291c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * gr * 0.8, gy + Math.sin(na) * gr * 0.8); ctx.stroke();
    ctx.fillStyle = '#2a2a26'; ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, TAU); ctx.fill();
    ctx.font = '8px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#3a3a34'; ctx.fillText('BAR', gx, gy + gr * 0.5);
    ctx.fillStyle = '#3e4548'; ctx.fillRect(gx - 3, gy + gr + 2, 6, T + 6);
  }
  update(dt) {
    const g = this.h.getGame(), P = g && g.profile;
    if (!P) return;
    this.t += dt;
    const G = this.geometry(P), A = aquariumOf(P), light = LIGHTS[A.light || 'day'];
    this.layout(g, P, G);
    const dpr = Math.min(2, window.devicePixelRatio || 1), c = this.c;
    if (c.width !== Math.round(G.W * dpr) || c.height !== Math.round(G.H * dpr)) { c.width = Math.round(G.W * dpr); c.height = Math.round(G.H * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // (4.0.0) the room: a ship's lab, not a parlour. Painted steel panelling with welded seams, a deck of
    // non-slip plate, the two tanks on steel stands
    const bg = ctx.createLinearGradient(0, 0, 0, G.H); bg.addColorStop(0, '#1b2023'); bg.addColorStop(1, '#0b0e10');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < G.W; x += 140) ctx.fillRect(x, 0, 2, G.H * 0.94);
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (let x = 2; x < G.W; x += 140) ctx.fillRect(x, 0, 1, G.H * 0.94);
    const dg = ctx.createLinearGradient(0, G.H * 0.94, 0, G.H); dg.addColorStop(0, '#2a2e30'); dg.addColorStop(1, '#151819');
    ctx.fillStyle = dg; ctx.fillRect(0, G.H * 0.94, G.W, G.H * 0.06);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 6; x < G.W; x += 18) ctx.fillRect(x, G.H * 0.955 + ((x / 18) % 2) * 6, 8, 2);
    for (const a of this.anim.values()) a.alive = false;
    const shownAll = Object.entries(A.display);
    for (const r of G.rows) {
      const press = r.wing.id === 'press', base = r.y + r.h;
      // the stand: a welded steel frame to the deck
      const st = ctx.createLinearGradient(0, base, 0, G.H * 0.94); st.addColorStop(0, '#3c4245'); st.addColorStop(1, '#202426');
      ctx.fillStyle = st; ctx.fillRect(r.x + 6, base + 18, 10, G.H * 0.94 - base - 18); ctx.fillRect(r.x + r.w - 16, base + 18, 10, G.H * 0.94 - base - 18);
      ctx.fillRect(r.x, base + 10, r.w, 12); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(r.x, base + 10, r.w, 1);
      // the water: neutral in the open tank; in the pressure tank the colour of the deep
      const water = press ? ['#0d2a3a', '#03090e'] : light.water;
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      const wg = ctx.createLinearGradient(0, r.y, 0, base); wg.addColorStop(0, water[0]); wg.addColorStop(1, water[1]);
      ctx.fillStyle = wg; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (!press && A.light !== 'red') { ctx.globalAlpha = A.light === 'dim' ? 0.03 : 0.07; ctx.fillStyle = '#e8f8ff'; for (let k = 0; k < 5; k++) { const x = r.x + r.w * (0.08 + k * 0.2) + Math.sin(this.t * 0.4 + k) * 10; ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x + 24, r.y); ctx.lineTo(x + 60, base); ctx.lineTo(x + 30, base); ctx.fill(); } ctx.globalAlpha = 1; }
      // the floor: sand in the open tank; grey ooze and a scatter of pale nodules in the deep one
      ctx.fillStyle = press ? '#2a2c2c' : '#5e5444'; ctx.beginPath(); ctx.moveTo(r.x, base); for (let x = 0; x <= r.w; x += 10) ctx.lineTo(r.x + x, base - 8 - Math.sin(x * 0.07) * 3); ctx.lineTo(r.x + r.w, base); ctx.fill();
      if (press) { ctx.fillStyle = 'rgba(160,160,150,0.35)'; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.ellipse(r.x + ((k * 53) % r.w), base - 6 - (k % 3) * 2, 2.5 + (k % 2), 1.6, 0, 0, TAU); ctx.fill(); } }
      else this.decor(ctx, r);
      const shown = shownAll.filter(([, d]) => { const sp = SPECIES_BY_ID[d.id]; return sp && deepKeeper(sp) === press; });
      const maxL = clamp(Math.min(r.h * 0.4, r.w * 0.38), 40, 240);
      shown.forEach(([k, d]) => {
        const sp = SPECIES_BY_ID[d.id], dead = d.cond <= 0.05;
        const L = clamp(36 + Math.sqrt(d.len || sp.len) * 120, 36, maxL); // small ones still readable; big ones shrunk to fit the tank
        let a = this.anim.get(k);
        const onSand = /floor/.test(sp.v.hab) && !/swim/.test(sp.v.hab);
        if (!a) { a = { x: lerp(0.1, 0.9, Math.random()), y: onSand ? 0.91 : lerp(0.25, 0.75, Math.random()), tx: Math.random(), ty: 0.5, face: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 6, rt: 0 }; this.anim.set(k, a); }
        a.alive = true; a.L = L;
        if (dead) { a.y = lerp(a.y, 0.12, dt * 0.3); }
        else {
          const low = /floor/.test(sp.v.hab);
          a.rt -= dt; if (a.rt <= 0 || Math.abs(a.tx - a.x) < 0.02) { a.tx = Math.random(); a.ty = onSand ? 0.91 : low ? lerp(0.8, 0.9, Math.random()) : lerp(0.15, 0.82, Math.random()); a.rt = 3 + Math.random() * 5; }
          const sp2 = (0.03 + 0.05 * (d.cond || 1)) * (onSand ? 0.3 : 1) * (press ? 0.6 : 1); // the deep ones move slowly
          a.x += clamp(a.tx - a.x, -sp2 * dt, sp2 * dt); a.y += clamp(a.ty - a.y, -sp2 * dt * 0.5, sp2 * dt * 0.5);
          if (Math.abs(a.tx - a.x) > 0.01) a.face = lerp(a.face, a.tx > a.x ? 1 : -1, dt * 3);
          a.ph += dt * (0.6 + d.cond);
        }
        const mx = Math.min(0.45, L / r.w * 0.5);
        a.sx = r.x + clamp(a.x, mx, 1 - mx) * r.w; a.sy = r.y + clamp(a.y, 0.1, 0.93) * r.h;
        ctx.save(); ctx.translate(a.sx, a.sy);
        if (k === this.open) { ctx.strokeStyle = 'rgba(200,230,220,0.45)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.62, L * 0.32, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (dead) { ctx.scale(1, -1); ctx.globalAlpha = 0.85; if (d.variant) drawVariantFish(ctx, sp, d.variant, L, 0); else drawSpecies(ctx, sp, L, 0, 0, 0); xEyes(ctx, L, sp); }
        else { const f = Math.abs(a.face) < 0.1 ? 0.1 * Math.sign(a.face || 1) : a.face; ctx.scale(-f, 1); if (d.variant) drawVariantFish(ctx, sp, d.variant, L, a.ph); else drawSpecies(ctx, sp, L, a.ph, press ? 0.9 : 0.6, 0); }
        ctx.restore();
        if (d.famous && !dead) { ctx.fillStyle = '#f0d070'; ctx.font = '10px serif'; ctx.textAlign = 'center'; ctx.fillText('★', a.sx, a.sy - L * 0.32 - 4); }
        if (d.name) { ctx.fillStyle = 'rgba(230,236,230,0.75)'; ctx.font = '12px "EB Garamond", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(d.name, a.sx, a.sy + L * 0.32 + 12); }
      });
      if (!press && light.tint) { ctx.fillStyle = light.tint; ctx.fillRect(r.x, r.y, r.w, r.h); }
      if (press) { const vg = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.45, r.w * 0.2, r.x + r.w / 2, r.y + r.h * 0.45, r.w * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(r.x, r.y, r.w, 5);
      ctx.restore();
      if (press) this.pressFrame(ctx, r, shown.length); else this.glassFrame(ctx, r);
      if (!shown.length) { ctx.fillStyle = 'rgba(220,226,222,0.35)'; ctx.font = '15px "EB Garamond", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(press ? 'Empty: for animals that live below 500 m' : 'Empty', r.x + r.w / 2, r.y + r.h * 0.45); }
      // the plate under each tank
      paintedText(ctx, press ? 'PRESSURE DISPLAY · DEEP' : 'OPEN DISPLAY', r.x + r.w / 2, base + 40, 15, { col: 'rgba(214,220,212,1)', alpha: 0.75, align: 'center' });
    }
    // hearts, when petted
    this.hearts = this.hearts.filter((h) => (h.t += dt) < 1.4);
    for (const h of this.hearts) { if (h.t < 0) continue; ctx.globalAlpha = 1 - h.t / 1.4; ctx.fillStyle = '#f08aa0'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', h.x + Math.sin(h.t * 5) * 6, h.y - h.t * 40); }
    ctx.globalAlpha = 1;
  }
}
