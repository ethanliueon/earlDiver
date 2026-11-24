// (7.4.14, owner) The pet's aquarium: where a pet is fed, at the surface, once a day. The pet swims in its own tank; on
// the right a tray of the live animals brought up (the bag and the sub's tank; dead ones don't count). Drag one into
// the water (or tap it) and it sinks in; the pet swims to it, eats it, turns a happy loop, and pink hearts drift up off
// it for about five seconds while the meter along the bottom fills. At each level (10, 50, 100, 500 points) the screen
// darkens and the pet grows in the middle, then it is back in its tank, a fifth larger, a star more on its card.
// The size it shows can be set back to any level reached (the level stays). Pearls top up points: 1 pearl for 10.
import { SPECIES_BY_ID } from './species.js';
import { drawSpecies, fittedIcon, speciesBox } from './creatures_draw.js';
import { RARITY } from './item_data.js';
import { rarityOf } from './specimens.js';
import {
  PET_BY_ID, PET_LEVELS, MAX_LEVEL, PET_GROW, PEARL_POINTS, petData, levelOf, sizeLevel, nextLevel, topUpCost,
  feedPoints, feedable, fedToday, markFed, atSurface,
} from './petshop.js';

const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (k) => 1 - Math.pow(1 - k, 3);
const STEPS = [0, ...PET_LEVELS]; // the meter's nodes

// a heart, drawn by hand: two lobes and a point, a little uneven
function heart(x, cx, cy, s, a, rot) {
  x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(s, s); x.globalAlpha = a;
  x.beginPath(); x.moveTo(0, 0.32);
  x.bezierCurveTo(-0.08, 0.2, -0.52, 0.02, -0.5, -0.2); x.bezierCurveTo(-0.48, -0.46, -0.14, -0.52, 0.0, -0.24);
  x.bezierCurveTo(0.14, -0.53, 0.5, -0.45, 0.51, -0.18); x.bezierCurveTo(0.52, 0.04, 0.1, 0.2, 0, 0.32); x.closePath();
  x.fillStyle = '#e898ac'; x.fill(); x.lineWidth = 0.07; x.strokeStyle = '#9c4a5e'; x.stroke();
  x.beginPath(); x.ellipse(-0.24, -0.24, 0.1, 0.06, -0.6, 0, TAU); x.fillStyle = 'rgba(255,236,240,0.7)'; x.fill();
  x.restore();
}

export function openPetFeed(ctx) {
  const { g, P, ui, hud, audio, save, onGrow } = ctx;
  if (!P.pet || document.getElementById('petfeed')) return false;
  const id = P.pet.id, sp = SPECIES_BY_ID[id], Q = PET_BY_ID.get(id) || { tier: 'exotic' }, R = RARITY[Q.tier] || RARITY.exotic, D = petData(P, id);
  const el = document.createElement('div'); el.id = 'petfeed'; el.className = 'petfeed';
  el.innerHTML = `<div class="pf-plate"><button class="pf-x ip-close" aria-label="Close">×</button><h2>Feeding <span style="color:${R.col}">${sp.name}</span></h2>
    <div class="pf-body"><div class="pf-tank"><canvas class="pf-can"></canvas><canvas class="pf-fx"></canvas><p class="pf-hint"></p></div><div class="pf-tray"><h4>Brought up</h4><div class="pf-list"></div></div></div>
    <div class="pf-foot"><div class="pf-meter"><canvas class="pf-bar"></canvas><span class="pf-pts"></span></div><div class="pf-size"><span>Size</span><button data-sz="-1" aria-label="Smaller">‹</button><b class="pf-szv"></b><button data-sz="1" aria-label="Larger">›</button></div><button class="pf-top"></button></div></div>
    <canvas class="pf-grow" hidden></canvas>`;
  document.body.appendChild(el);
  const can = el.querySelector('.pf-can'), x = can.getContext('2d'), fxc = el.querySelector('.pf-fx'), fx = fxc.getContext('2d'), bar = el.querySelector('.pf-bar'), bx = bar.getContext('2d');
  const grow = el.querySelector('.pf-grow'), gx = grow.getContext('2d'), list = el.querySelector('.pf-list'), hint = el.querySelector('.pf-hint');
  const B = speciesBox(sp);
  // the pet in its tank
  const pet = { x: 0.5, y: 0.5, vx: 0.05, vy: 0, dir: 1, phase: 0, goal: null, loop: null, tx: 0.5, ty: 0.5, wander: 0 };
  let food = null, hearts = [], heartT = 0, shown = D.pts, growFx = null, last = performance.now(), raf = 0, W = 0, H = 0, dpr = 1, closed = false;
  const fit = new Map(), pic = (s) => { if (!fit.has(s.id)) fit.set(s.id, fittedIcon(s, 180, 110).toDataURL()); return fit.get(s.id); };

  const size = () => {
    const r = can.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
    can.width = fxc.width = Math.round(W * dpr); can.height = fxc.height = Math.round(H * dpr);
    const rb = bar.getBoundingClientRect(); bar.width = Math.round(rb.width * dpr); bar.height = Math.round(rb.height * dpr);
    grow.width = Math.round(innerWidth * dpr); grow.height = Math.round(innerHeight * dpr);
  };
  // the pet's drawn length in the tank: the same start for every kind, grown a fifth a level shown
  const petL = (lv = sizeLevel(P, id)) => Math.min(W * 0.2, H * 0.4 / Math.max(0.25, B.h / B.w)) * 0.75 * Math.pow(PET_GROW, lv);

  function tray() {
    const fed = fedToday(P, id), surf = atSurface(g), L = feedable(g);
    hint.textContent = !surf ? 'Pets are fed at the surface' : fed ? 'Fed today. It can eat again tomorrow.' : L.length ? 'Drag an animal into the water' : 'Nothing alive brought up to feed it';
    list.innerHTML = L.map((f, k) => { const s = SPECIES_BY_ID[f.s.id], r = rarityOf(s) || { col: '#c9cdc4' };
      return `<button class="pf-fish${fed || !surf ? ' off' : ''}" data-k="${k}"><img src="${pic(s)}" alt="" draggable="false"><b style="color:${r.col}">${s.name}</b><small>+${feedPoints(s)}</small></button>`; }).join('') || '<p class="pf-none">Nothing here</p>';
    list.__L = L;
  }
  function foot() {
    const lv = levelOf(D.pts), nx = nextLevel(D.pts), cost = topUpCost(D.pts), szl = sizeLevel(P, id);
    el.querySelector('.pf-pts').textContent = nx == null ? `${D.pts} points · full grown` : `${D.pts} / ${nx} points`;
    el.querySelector('.pf-szv').innerHTML = Array.from({ length: MAX_LEVEL }, (_, i) => `<i class="${i < szl ? 'on' : i < lv ? 'can' : ''}">★</i>`).join('');
    el.querySelector('[data-sz="-1"]').disabled = szl <= 0; el.querySelector('[data-sz="1"]').disabled = szl >= lv;
    const tb = el.querySelector('.pf-top'); tb.hidden = nx == null;
    tb.innerHTML = `Grow now <img src="assets/ui/icons/pearl.png" alt="">${cost}`; tb.disabled = (P.pearls || 0) < cost || !!growFx;
  }
  function drawBar(dt) {
    shown += (D.pts - shown) * Math.min(1, dt * 2.2); if (Math.abs(D.pts - shown) < 0.05) shown = D.pts;
    const w = bar.width, h = bar.height; bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, w, h); bx.scale(dpr, dpr);
    const ww = w / dpr, hh = h / dpr, pad = 10, y = hh / 2, segW = (ww - pad * 2) / (STEPS.length - 1);
    const at = (v) => { let i = 0; while (i < STEPS.length - 2 && v >= STEPS[i + 1]) i++; return pad + segW * (i + clamp((v - STEPS[i]) / (STEPS[i + 1] - STEPS[i]), 0, 1)); };
    // the groove, then the fill, then the nodes (a star at each, lit when reached)
    bx.lineCap = 'round'; bx.strokeStyle = 'rgba(0,0,0,0.55)'; bx.lineWidth = 9; bx.beginPath(); bx.moveTo(pad, y); bx.lineTo(ww - pad, y); bx.stroke();
    bx.strokeStyle = 'rgba(255,255,240,0.06)'; bx.lineWidth = 1; bx.beginPath(); bx.moveTo(pad, y + 5); bx.lineTo(ww - pad, y + 5); bx.stroke();
    const fx = at(shown); if (fx > pad) { bx.strokeStyle = '#c8a8b0'; bx.lineWidth = 5; bx.beginPath(); bx.moveTo(pad, y); bx.lineTo(fx, y); bx.stroke(); bx.strokeStyle = 'rgba(255,240,240,0.35)'; bx.lineWidth = 1.4; bx.beginPath(); bx.moveTo(pad, y - 1.2); bx.lineTo(fx, y - 1.2); bx.stroke(); }
    STEPS.forEach((v, i) => { if (!i) return; const nx2 = pad + segW * i, on = shown >= v;
      bx.fillStyle = on ? '#2a2418' : '#14160f'; bx.beginPath(); bx.arc(nx2, y, 9, 0, TAU); bx.fill(); bx.lineWidth = 1.4; bx.strokeStyle = on ? '#c8a860' : 'rgba(230,222,198,0.25)'; bx.stroke();
      bx.font = '600 11px "Barlow Semi Condensed", sans-serif'; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillStyle = on ? '#f0d488' : 'rgba(230,222,198,0.35)'; bx.fillText('★', nx2, y + 0.5);
      bx.font = '500 10px "Barlow Semi Condensed", sans-serif'; bx.fillStyle = 'rgba(230,222,198,0.55)'; bx.fillText(String(v), nx2, y + 17); });
  }
  // the water: deep at the bottom, a little light from above, sand, two stems of weed, a few motes (painted, not boxed)
  function drawTank(t) {
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wg = x.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#2e4a4a'); wg.addColorStop(0.55, '#1c3134'); wg.addColorStop(1, '#101c1e'); x.fillStyle = wg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const sx = W * (0.15 + i * 0.24) + Math.sin(t * 0.3 + i) * 12; x.fillStyle = `rgba(220,230,200,${0.03 + 0.015 * Math.sin(t * 0.5 + i * 2)})`; x.beginPath(); x.moveTo(sx - 18, 0); x.lineTo(sx + 26, 0); x.lineTo(sx + 70, H); x.lineTo(sx + 10, H); x.fill(); }
    const fy = H * 0.88; x.fillStyle = '#4a4532'; x.beginPath(); x.moveTo(0, fy); for (let i = 0; i <= 12; i++) x.lineTo(W * i / 12, fy + Math.sin(i * 1.7) * 4 + (i % 3) * 2); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.fillStyle = 'rgba(20,18,10,0.35)'; for (let i = 0; i < 26; i++) { x.beginPath(); x.arc((i * 97.3) % W, fy + 6 + (i * 13.7) % (H - fy - 6), 1 + (i % 3) * 0.6, 0, TAU); x.fill(); }
    for (const [px, n] of [[0.08, 5], [0.93, 4]]) { x.strokeStyle = '#4c5a2c'; x.lineWidth = 3; x.lineCap = 'round'; for (let k = 0; k < n; k++) { const bx0 = W * px + (k - n / 2) * 5; x.beginPath(); x.moveTo(bx0, fy + 4); x.quadraticCurveTo(bx0 + Math.sin(t * 0.8 + k) * 10, fy - H * 0.2, bx0 + Math.sin(t * 0.6 + k * 2) * 14, fy - H * (0.3 + (k % 3) * 0.06)); x.stroke(); } }
    x.fillStyle = 'rgba(220,230,210,0.25)'; for (let i = 0; i < 18; i++) { const mx = ((i * 53.1 + t * (4 + i % 4)) % (W + 20)) - 10, my = (i * 37.7 + Math.sin(t * 0.4 + i) * 8) % (H * 0.85); x.beginPath(); x.arc(mx, my, 0.8 + (i % 3) * 0.5, 0, TAU); x.fill(); }
  }
  function drawCreature(s, cx, cy, L, dir, phase, rot = 0, swim = 1) {
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.globalAlpha = x.globalAlpha; x.save(); x.translate(cx, cy); x.rotate(rot); if (dir > 0) x.scale(-1, 1);
    const bb = speciesBox(s); x.translate(-(bb.x0 + bb.w / 2) * L, -(bb.y0 + bb.h / 2) * L);
    try { drawSpecies(x, s, L, phase, swim, 0); } catch (e) { /* skip */ }
    x.restore();
  }
  function step(dt, t) {
    const L = petL(), m = (L / W) * 0.5; // the pet's half-length, a share of the tank's width
    if (pet.loop) { // the happy loop: a full turn round a small circle, then on its way
      const Lp = pet.loop; Lp.t += dt; const k = clamp(Lp.t / Lp.dur, 0, 1), a = Lp.a0 + ease(k) * TAU * Lp.s;
      pet.x = Lp.cx + Math.cos(a) * Lp.r / W; pet.y = Lp.cy + Math.sin(a) * Lp.r / H; pet.rot = a - Math.PI / 2; // the body along the circle, whichever way it faces pet.phase += dt * 8;
      if (k >= 1) { pet.loop = null; pet.rot = 0; }
      return;
    }
    let tx = pet.tx, ty = pet.ty, spd = 0.09;
    if (food && food.state === 'in') { tx = food.x; ty = food.y; spd = 0.28; }
    else { pet.wander -= dt; if (pet.wander <= 0 || Math.hypot(pet.tx - pet.x, (pet.ty - pet.y) * H / W) < 0.03) { pet.wander = 3 + Math.random() * 4; pet.tx = clamp(0.15 + Math.random() * 0.7, m + 0.04, 1 - m - 0.04); pet.ty = 0.22 + Math.random() * 0.5; } }
    const dx = tx - pet.x, dy = (ty - pet.y) * H / W, d = Math.hypot(dx, dy) || 1;
    pet.vx += (dx / d * spd - pet.vx) * Math.min(1, dt * 2.5); pet.vy += (dy / d * spd * W / H - pet.vy) * Math.min(1, dt * 2.5);
    pet.x = clamp(pet.x + pet.vx * dt, m * 0.6, 1 - m * 0.6); pet.y = clamp(pet.y + pet.vy * dt, 0.12, 0.8);
    if (Math.abs(pet.vx) > 0.01) pet.dir = pet.vx > 0 ? 1 : -1;
    pet.phase += dt * (1.2 + Math.hypot(pet.vx, pet.vy) * 14); pet.rot = clamp(Math.atan2(pet.vy * H / W, Math.abs(pet.vx) + 0.02), -0.4, 0.4) * pet.dir;
    if (food) {
      if (food.state === 'in') { food.y = Math.min(0.78, food.y + dt * 0.05); food.phase += dt * 3; food.x += Math.sin(t * 1.4) * dt * 0.01;
        // the mouth is at the front of the body
        const mx = pet.x + pet.dir * m * 0.85, my = pet.y;
        if (Math.hypot((mx - food.x) * W, (my - food.y) * H) < Math.max(14, L * 0.22)) { food.state = 'eaten'; food.t = 0; eaten(); } }
      else { food.t += dt; if (food.t > 0.5) food = null; }
    }
  }
  function eaten() {
    audio && audio.ready && audio.uiSoft && audio.uiSoft();
    const r = Math.max(26, petL() * 0.55);
    pet.loop = { t: 0, dur: 1.4, cx: clamp(pet.x, (r + petL() * 0.5) / W, 1 - (r + petL() * 0.5) / W), cy: clamp(pet.y - r / H, (r + petL() * 0.3) / H + 0.04, 0.78 - r / H), r, a0: Math.PI / 2, s: pet.dir > 0 ? -1 : 1 }; pet.x = pet.loop.cx; pet.y = pet.loop.cy + r / H;
    heartT = 5.01; hint.style.opacity = '0'; setTimeout(() => { if (!closed) hint.style.opacity = ''; }, 6000);
  }
  function drawHearts(dt) {
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); fx.setTransform(dpr, 0, 0, dpr, 0, 0); // the hearts on their own layer over the tank
    if (heartT > 0) { const first = heartT >= 5; heartT = first ? 4.99 : heartT - dt; const n = first ? 4 : Math.random() < dt * 3.2 ? 1 : 0; /* a few at once as it eats, then a slow stream for five seconds */ for (let k = 0; k < n; k++) hearts.push({ x: pet.x * W + (Math.random() - 0.5) * petL() * 0.7, y: pet.y * H - petL() * 0.15 + (Math.random() - 0.5) * 10, vy: -(12 + Math.random() * 12), sw: Math.random() * TAU, s: 12 + Math.random() * 8, t: 0, life: 2.4 + Math.random() * 1.2, rot: (Math.random() - 0.5) * 0.5 }); }
    for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; h.t += dt; h.y += h.vy * dt; h.x += Math.sin(h.t * 2 + h.sw) * 12 * dt; if (h.t > h.life) { hearts.splice(i, 1); continue; }
      const a = Math.min(1, h.t * 4) * (1 - Math.pow(h.t / h.life, 2)); heart(fx, h.x, h.y, h.s * (0.8 + Math.min(1, h.t * 3) * 0.2), a * 0.9, h.rot + Math.sin(h.t * 2 + h.sw) * 0.15); }
  }
  // the level reached: the screen darkens, the pet grows in the middle, its new stars, then back to its tank
  function levelUp(from, to) { growFx = { t: 0, from, to }; grow.hidden = false; audio && audio.ready && audio.cue && audio.cue('rare'); onGrow && onGrow(); foot(); }
  function drawGrow(dt, t) {
    const G = growFx; G.t += dt; const T = 3.2, k = G.t / T, w = grow.width / dpr, h = grow.height / dpr;
    gx.setTransform(dpr, 0, 0, dpr, 0, 0); gx.clearRect(0, 0, w, h);
    const dark = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1; gx.fillStyle = `rgba(4,6,6,${(0.82 * dark).toFixed(3)})`; gx.fillRect(0, 0, w, h);
    const base = Math.min(w * 0.26, h * 0.4 / Math.max(0.3, B.h / B.w)), gk = ease(clamp((k - 0.2) / 0.4, 0, 1)), sc = Math.pow(PET_GROW, G.from + (G.to - G.from) * gk) / Math.pow(PET_GROW, MAX_LEVEL) * 1.25;
    gx.save(); gx.globalAlpha = dark; gx.translate(w / 2, h * 0.46);
    const gl = gx.createRadialGradient(0, 0, 0, 0, 0, base * sc * 0.9); gl.addColorStop(0, 'rgba(232,220,180,0.22)'); gl.addColorStop(1, 'rgba(232,220,180,0)'); gx.fillStyle = gl; gx.fillRect(-w, -h, w * 2, h * 2);
    gx.scale(-1, 1); const L = base * sc; gx.translate(-(B.x0 + B.w / 2) * L, -(B.y0 + B.h / 2) * L); try { drawSpecies(gx, sp, L, t * 1.5, 0.6, 0); } catch (e) { /* skip */ } gx.restore();
    gx.save(); gx.globalAlpha = clamp((k - 0.45) / 0.1, 0, 1) * dark; gx.textAlign = 'center'; gx.fillStyle = '#efe8d2'; gx.font = '600 30px "Barlow Semi Condensed", sans-serif'; gx.fillText(`Level ${G.to}`, w / 2, h * 0.84);
    gx.font = '600 24px "Barlow Semi Condensed", sans-serif'; for (let i = 0; i < MAX_LEVEL; i++) { gx.fillStyle = i < G.to ? '#f0d488' : 'rgba(230,222,198,0.22)'; gx.fillText('★', w / 2 + (i - (MAX_LEVEL - 1) / 2) * 26, h * 0.84 + 30); } gx.restore();
    if (G.t >= T) { growFx = null; grow.hidden = true; foot(); }
  }
  function frame(now) {
    if (closed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    for (let i = 0; i < 12; i++) x.restore(); // (a species' drawing can leave a save, a clip, behind: cleared every frame)
    step(dt, t); drawTank(t);
    if (food) { const s = food.sp, a = food.state === 'eaten' ? 1 - food.t / 0.5 : 1; x.save(); x.globalAlpha = a; drawCreature(s, food.x * W, food.y * H, food.L, food.dir, food.phase, 0, 0.6); x.restore(); }
    drawCreature(sp, pet.x * W, pet.y * H, petL(), pet.dir, pet.phase, pet.rot || 0);
    drawHearts(dt); drawBar(dt);
    if (growFx) drawGrow(dt, t);
    raf = requestAnimationFrame(frame);
  }
  // feeding: the animal is used up at once (taken from the bag or the tank), the points are the pet's, then it is eaten
  function feed(k, px, py) {
    const L = list.__L || [], f = L[k]; if (!f || food || growFx) return;
    if (!atSurface(g)) { hud.toast('Pets are fed at the surface', 'warn'); return; }
    if (fedToday(P, id)) { hud.toast('Fed today: again tomorrow', 'note'); return; }
    const arr = f.where === 'bag' ? g.bag : g.subTank, i = arr.indexOf(f.s); if (i < 0) return;
    arr.splice(i, 1); const s = SPECIES_BY_ID[f.s.id], from = levelOf(D.pts); D.pts += feedPoints(s); markFed(P, id); save();
    const Lf = clamp(petL() * 0.38, W * 0.06, W * 0.15);
    food = { sp: s, x: clamp(px ?? 0.5, 0.1, 0.9), y: clamp(py ?? 0.08, 0.06, 0.6), L: Lf, dir: Math.random() < 0.5 ? 1 : -1, phase: 0, state: 'in' };
    tray(); foot();
    const to = levelOf(D.pts); if (to > from) setTimeout(() => { if (!closed) { if (D.size != null) D.size = null; levelUp(from, to); save(); } }, 3400);
  }
  // drag from the tray: a picture follows the finger; let go over the water and it goes in
  let drag = null;
  list.addEventListener('pointerdown', (ev) => { const b = ev.target.closest('.pf-fish'); if (!b || b.classList.contains('off')) return; ev.preventDefault();
    const im = b.querySelector('img'), gh = document.createElement('img'); gh.src = im.src; gh.className = 'pf-ghost'; document.body.appendChild(gh);
    drag = { k: +b.dataset.k, gh, x0: ev.clientX, y0: ev.clientY, moved: false }; gh.style.left = `${ev.clientX}px`; gh.style.top = `${ev.clientY}px`; });
  const move = (ev) => { if (!drag) return; drag.gh.style.left = `${ev.clientX}px`; drag.gh.style.top = `${ev.clientY}px`; if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 8) drag.moved = true; };
  const up = (ev) => { if (!drag) return; const d = drag; drag = null; d.gh.remove(); const r = can.getBoundingClientRect();
    if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) feed(d.k, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    else if (!d.moved) feed(d.k); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  el.addEventListener('click', (ev) => {
    if (ev.target.closest('.pf-x')) { close(); return; }
    const sz = ev.target.closest('[data-sz]'); if (sz && !sz.disabled) { const lv = levelOf(D.pts); D.size = clamp(sizeLevel(P, id) + +sz.dataset.sz, 0, lv); if (D.size === lv) D.size = null; onGrow && onGrow(); save(); foot(); return; }
    const tb = ev.target.closest('.pf-top'); if (tb && !tb.disabled) { const cost = topUpCost(D.pts), nx = nextLevel(D.pts); if (nx == null) return;
      ui.confirm(`Grow ${sp.name.replace(/^the /i, 'the ')} now?`, `${cost} pearl${cost > 1 ? 's' : ''} for the ${nx - D.pts} points to level ${levelOf(nx)} (1 pearl for ${PEARL_POINTS} points). You have ${Math.floor(P.pearls || 0)}.`, `Grow, ${cost} pearl${cost > 1 ? 's' : ''}`, 'Not now', () => {
        if ((P.pearls || 0) < cost) { hud.toast('Not enough pearls', 'warn'); return; }
        const from = levelOf(D.pts); P.pearls -= cost; D.pts = nx; D.size = null; save(); levelUp(from, levelOf(D.pts)); }); }
  });
  function close() { closed = true; cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('resize', size); el.remove(); onGrow && onGrow(); }
  window.addEventListener('resize', size);
  requestAnimationFrame(() => { size(); tray(); foot(); last = performance.now(); raf = requestAnimationFrame(frame); });
  return true;
}
