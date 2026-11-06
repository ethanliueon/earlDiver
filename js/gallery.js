// The aquarium gallery, walked aboard the Margaret: four long lit tanks set into the bulkhead (warm reef,
// cold water, open water, and the dark tank for the deep), the animals swimming in them. Tap one for its brass tag: its name, how it is doing (Happy after five
// minutes healthy, Famous fifteen minutes after that), and what can be done: pet it, feed it, sell
// it, or send it down to the sub's pressure tank to be released at home. The lighting can be set
// for the whole gallery: daylight, dim, or the red light deep animals can't see.
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies } from './creatures_draw.js';
import { WINGS, aquariumOf, isHappy, HAPPY_AFTER, FAMOUS_AFTER, gallerySale, gallerySlots, tankOf } from './aquarium.js';
import { VARIANTS, makeVariantSprite } from './variants.js';
import { clamp, lerp, TAU } from './util.js';

const LIGHTS = { day: { name: 'Daylight', water: ['#2a7a90', '#0c3644'], tint: null }, dim: { name: 'Dim', water: ['#123844', '#061a22'], tint: 'rgba(0,10,20,0.35)' }, red: { name: 'Red', water: ['#3a1416', '#12080a'], tint: 'rgba(120,10,10,0.28)' } };
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
      <div class="tr-plate"><b>The gallery</b><span class="gl-sub"></span></div>
      <div class="gl-lights"></div>
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
    this.over.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { const inp = ev.target.closest('input[data-name]'); if (inp) { this.h.act('rename', inp.dataset.name, inp.value); this.sig = ''; } } });
  }
  show() { this.open = null; this.sig = ''; }

  geometry(P) {
    const W = window.innerWidth, H = window.innerHeight, A = aquariumOf(P);
    const wings = WINGS, n = wings.length, top = H * 0.12, gap = 18, rowH = Math.min(190, (H * 0.85 - gap * (n - 1)) / n);
    const x0 = W * 0.06, w = W * 0.88;
    return { W, H, rows: wings.map((wing, i) => ({ wing, x: x0, y: top + i * (rowH + gap), w, h: rowH })) };
  }
  fishAt(cx, cy) {
    let best = null, bd = 50;
    for (const [k, a] of this.anim) { if (!a.alive) continue; const d = Math.hypot(a.sx - cx, a.sy - cy); if (d < Math.max(bd, a.L * 0.5) && d < bd + a.L * 0.3) { bd = d; best = k; } }
    return best;
  }
  layout(g, P, G) {
    const A = aquariumOf(P), light = A.light || 'day';
    const sig = [this.open, light, window.innerWidth, window.innerHeight, Object.entries(A.display).map(([k, d]) => `${k}${d.name}${isHappy(d) ? 'h' : ''}${d.famous ? 'f' : ''}${d.cond <= 0.05 ? 'x' : ''}`).join(','), g.sub.docked ? 'd' : ''].join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    this.root.querySelector('.gl-lights').innerHTML = Object.entries(LIGHTS).map(([k, L]) => `<button data-light="${k}" class="${k === light ? 'on' : ''}">${L.name}</button>`).join('');
    const nShown = Object.keys(A.display).length;
    this.root.querySelector('.gl-sub').textContent = `${nShown} of ${gallerySlots(P)} places · aboard the Margaret`;
    let html = '';
    if (!nShown) html += `<div class="gl-empty">The tanks are empty. Keep a live animal from the Sell tab and it swims in here.</div>`;
    for (const r of G.rows) { const n = Object.values(A.display).filter((d) => tankOf(d) === r.wing.id).length; html += `<div class="gl-wing" style="left:${r.x + 10}px;top:${r.y + 6}px">${r.wing.name}${n ? ` · ${n}` : ''}</div>`; }
    const d = this.open && A.display[this.open], a = this.open && this.anim.get(this.open);
    if (d && a) {
      const sp = SPECIES_BY_ID[d.id], dead = d.cond <= 0.05;
      const happy = isHappy(d), toHappy = Math.max(0, HAPPY_AFTER - (d.happyT || 0)), toFamous = Math.max(0, FAMOUS_AFTER - (d.famT || 0));
      const st = dead ? 'dead' : d.cond < 0.7 ? 'recovering' : happy ? 'happy' : 'settling in';
      const prog = dead ? '' : d.famous ? '<em class="gl-famous">Famous</em>' : happy ? `famous in ${Math.ceil(toFamous / 60)} min` : d.cond >= 0.7 ? `happy in ${Math.ceil(toHappy / 60)} min` : 'needs to get well first';
      const x = clamp(a.sx, 150, G.W - 150), y = a.sy + 30 > G.H - 220 ? a.sy - 230 : a.sy + 30;
      html += `<div class="btag open gl-tag" style="left:${x}px;top:${y}px">
        ${dead ? '' : `<input data-name="${esc(this.open)}" maxlength="18" placeholder="give it a name" value="${esc(d.name || '')}">`}
        <b>${d.name ? esc(d.name) + ', ' : ''}${sp.name}</b>${d.variant ? `<em class="rarel r-${d.variant}">${VARIANTS[d.variant].name}</em>` : ''}
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
  // each tank's furniture, drawn behind the animals: coral heads, kelp, open blue with bubbles, or the dark
  // with a few drifting motes
  decor(ctx, r) {
    const id = r.wing.id, base = r.y + r.h, t = this.t;
    ctx.save();
    if (id === 'reef') {
      const cols = ['#c86a5a', '#d8a050', '#a86ab0', '#e0c8a0', '#5aa890'];
      for (let k = 0; k < 9; k++) {
        const x = r.x + r.w * (0.05 + k * 0.11 + (k % 3) * 0.013), h = r.h * (0.12 + ((k * 37) % 10) / 60);
        ctx.fillStyle = cols[k % cols.length]; ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.ellipse(x, base - 8, h * 0.7, h, 0, Math.PI, 0); ctx.fill();
        if (k % 2) { ctx.strokeStyle = cols[(k + 2) % cols.length]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + h, base - 8); ctx.quadraticCurveTo(x + h * 1.2, base - h * 1.6, x + h * 0.8 + Math.sin(t + k) * 3, base - h * 2.1); ctx.stroke(); }
      }
    } else if (id === 'kelp') {
      ctx.strokeStyle = '#6a7a30'; ctx.globalAlpha = 0.7;
      for (let k = 0; k < 12; k++) {
        const x = r.x + r.w * (0.04 + k * 0.085), h = r.h * (0.55 + ((k * 13) % 7) / 20), sw = Math.sin(t * 0.7 + k) * 8;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, base - 6); ctx.quadraticCurveTo(x + sw, base - h * 0.5, x + sw * 1.6, base - h); ctx.stroke();
        ctx.fillStyle = '#7a8a38'; for (let j = 1; j < 5; j++) { const f = j / 5, lx = x + sw * 1.6 * f * f, ly = base - h * f; ctx.beginPath(); ctx.ellipse(lx + 6, ly, 7, 2.5, -0.5, 0, TAU); ctx.fill(); }
      }
    } else if (id === 'open') {
      ctx.fillStyle = 'rgba(220,240,255,0.25)';
      for (let k = 0; k < 14; k++) { const x = r.x + r.w * ((k * 0.137) % 1), y = base - ((t * 18 + k * 47) % r.h); ctx.beginPath(); ctx.arc(x + Math.sin(t + k) * 3, y, 1.5 + (k % 3), 0, TAU); ctx.fill(); }
    } else {
      for (let k = 0; k < 22; k++) { const x = r.x + r.w * ((k * 0.0731 + t * 0.004) % 1), y = r.y + r.h * ((k * 0.191 + Math.sin(t * 0.2 + k) * 0.02) % 1); ctx.fillStyle = k % 4 ? 'rgba(160,200,220,0.25)' : 'rgba(90,200,255,0.55)'; ctx.beginPath(); ctx.arc(x, y, k % 4 ? 1 : 1.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#1a1814'; ctx.globalAlpha = 0.9;
      for (let k = 0; k < 4; k++) { const x = r.x + r.w * (0.12 + k * 0.25); ctx.beginPath(); ctx.ellipse(x, base - 6, r.h * 0.18, r.h * 0.09, 0, Math.PI, 0); ctx.fill(); }
    }
    ctx.restore();
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
    // the room: dark panelling, a carpet runner, brass rails
    const bg = ctx.createLinearGradient(0, 0, 0, G.H); bg.addColorStop(0, '#1c1a17'); bg.addColorStop(1, '#0c0b0a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = 'rgba(255,255,255,0.025)'; for (let x = 0; x < G.W; x += 48) ctx.fillRect(x, 0, 2, G.H);
    ctx.fillStyle = '#3a1e1a'; ctx.fillRect(0, G.H * 0.965, G.W, G.H * 0.035);
    for (const a of this.anim.values()) a.alive = false;
    for (const r of G.rows) {
      // the tank: a brass frame, the water, a gravel floor, light from above
      ctx.fillStyle = '#6e5424'; ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
      ctx.fillStyle = '#b8954a'; ctx.fillRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      const water = (A.light || 'day') === 'day' ? r.wing.water : light.water;
      const wg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); wg.addColorStop(0, water[0]); wg.addColorStop(1, water[1]);
      ctx.fillStyle = wg; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (A.light !== 'red') { ctx.globalAlpha = A.light === 'dim' ? 0.03 : 0.07; ctx.fillStyle = '#e8f8ff'; for (let k = 0; k < 6; k++) { const x = r.x + r.w * (0.08 + k * 0.17) + Math.sin(this.t * 0.4 + k) * 10; ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x + 24, r.y); ctx.lineTo(x + 60, r.y + r.h); ctx.lineTo(x + 16, r.y + r.h); ctx.fill(); } ctx.globalAlpha = 1; }
      ctx.fillStyle = '#4a4236'; ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h); for (let x = 0; x <= r.w; x += 10) ctx.lineTo(r.x + x, r.y + r.h - 8 - Math.sin(x * 0.07) * 3); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.fill();
      this.decor(ctx, r);
      const shown = Object.entries(A.display).filter(([, d]) => tankOf(d) === r.wing.id);
      const maxL = clamp(r.h * 0.75, 40, 220);
      shown.forEach(([k, d], i) => {
        const sp = SPECIES_BY_ID[d.id], dead = d.cond <= 0.05;
        const L = clamp(36 + Math.sqrt(d.len || sp.len) * 120, 36, maxL); // small ones still readable; big ones shrunk to fit the tank
        let a = this.anim.get(k);
        if (!a) { a = { x: lerp(0.1, 0.9, Math.random()), y: lerp(0.25, 0.75, Math.random()), tx: Math.random(), ty: 0.5, face: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 6, rt: 0 }; this.anim.set(k, a); }
        a.alive = true; a.L = L;
        if (dead) { a.y = lerp(a.y, 0.12, dt * 0.3); }
        else {
          a.rt -= dt; if (a.rt <= 0 || Math.abs(a.tx - a.x) < 0.02) { a.tx = Math.random(); a.ty = lerp(0.2, 0.8, Math.random()); a.rt = 3 + Math.random() * 5; }
          const sp2 = 0.03 + 0.05 * (d.cond || 1);
          a.x += clamp(a.tx - a.x, -sp2 * dt, sp2 * dt); a.y += clamp(a.ty - a.y, -sp2 * dt * 0.5, sp2 * dt * 0.5);
          if (Math.abs(a.tx - a.x) > 0.01) a.face = lerp(a.face, a.tx > a.x ? 1 : -1, dt * 3);
          a.ph += dt * (0.6 + d.cond);
        }
        const mx = L / r.w * 0.5;
        a.sx = r.x + clamp(a.x, mx, 1 - mx) * r.w; a.sy = r.y + clamp(a.y, 0.15, 0.85) * r.h;
        ctx.save(); ctx.translate(a.sx, a.sy);
        if (k === this.open) { ctx.strokeStyle = 'rgba(240,212,138,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.62, L * 0.32, 0, 0, TAU); ctx.stroke(); }
        if (dead) { ctx.scale(1, -1); ctx.globalAlpha = 0.85; if (d.variant) drawVariantFish(ctx, sp, d.variant, L, 0); else drawSpecies(ctx, sp, L, 0, 0, 0); xEyes(ctx, L, sp); }
        else { const f = Math.abs(a.face) < 0.1 ? 0.1 * Math.sign(a.face || 1) : a.face; ctx.scale(-f, 1); if (d.variant) drawVariantFish(ctx, sp, d.variant, L, a.ph); else drawSpecies(ctx, sp, L, a.ph, 0.6, 0); }
        ctx.restore();
        if (d.famous && !dead) { ctx.fillStyle = '#f0d070'; ctx.font = '10px serif'; ctx.textAlign = 'center'; ctx.fillText('★', a.sx, a.sy - L * 0.32 - 4); }
        if (d.name) { ctx.fillStyle = 'rgba(240,230,200,0.7)'; ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.fillText(d.name, a.sx, a.sy + L * 0.32 + 12); }
      });
      if (light.tint) { ctx.fillStyle = light.tint; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(r.x, r.y, r.w, 6);
      ctx.restore();
    }
    // hearts, when petted
    this.hearts = this.hearts.filter((h) => (h.t += dt) < 1.4);
    for (const h of this.hearts) { if (h.t < 0) continue; ctx.globalAlpha = 1 - h.t / 1.4; ctx.fillStyle = '#f08aa0'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText('♥', h.x + Math.sin(h.t * 5) * 6, h.y - h.t * 40); }
    ctx.globalAlpha = 1;
  }
}
