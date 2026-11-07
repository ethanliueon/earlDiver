// Chests (2.9.0): the main way to good gear. Every shop has one or more; each rolls one item, its rarity by
// the chest's odds, then any item of that rarity in the chest pool (set pieces included). Bought and opened
// at once, in a short reveal (about 3 s; a click skips it): the lid creaks up, a little light in the
// rarity's colour, and the thing rises out with its name and skills. A full locker can't open one.
import { RARITY, SKILLS, LEGEND } from './item_data.js';
import { ITEMS, CHEST_POOL } from './items.js';
import { TAU } from './util.js';

// odds in %, by rarity
export const CHESTS = {
  bayside: { shop: 'bayside', name: 'Surplus crate', price: 900, look: 'crate', line: 'A pine crate of returns and odd lots from the back room. Mostly ordinary; now and then something old turns up in the straw.',
    odds: { common: 60, uncommon: 30, rare: 9, exotic: 1 } },
  station: { shop: 'station', name: 'Equipment case', price: 3000, look: 'case', line: "A sealed aluminium case from the station's stores, stencilled and padded. Kit the scientists stopped using.",
    odds: { common: 10, uncommon: 45, rare: 43, exotic: 2 } },
  dave1: { shop: 'dave', name: 'Tea chest', price: 2000, look: 'tea', line: "Whatever came down on the rope this month. Dave hasn't looked. He says.",
    odds: { common: 20, uncommon: 50, rare: 25, exotic: 5 } },
  dave2: { shop: 'dave', name: 'Strongbox', price: 6000, look: 'strongbox', line: 'A riveted steel box off a salvage job, the lock long gone. Heavier than it looks.',
    odds: { uncommon: 30, rare: 60, exotic: 10 } },
  dave3: { shop: 'dave', name: "Bosun's footlocker", price: 15000, look: 'footlocker', line: "Out of a wreck on the plain. Someone's whole kit, still in it.",
    odds: { uncommon: 5, rare: 79, exotic: 15, legendary: 1 } },
  dave4: { shop: 'dave', name: 'Expedition trunk', price: 32000, look: 'trunk', line: "Brass corners, a society's crest, a name scratched off. Dave won't say where he got it.",
    odds: { rare: 78, exotic: 20, legendary: 2 } },
  offering: { shop: 'oldone', name: 'Offering', price: 25000, look: 'offering', line: 'Bound up in old net and kelp, and left in the silt for whoever pays. Things the deep has taken.',
    odds: { rare: 60, exotic: 40 } },
  reliquary: { shop: 'oldone', name: 'Reliquary', price: 90000, look: 'reliquary', line: 'A box of black bone, older than the boat. What is inside has been down here a long time.',
    odds: { exotic: 85, legendary: 15 } },
};
export const chestsOf = (shop) => Object.entries(CHESTS).filter(([, c]) => c.shop === shop).map(([key, c]) => ({ key, ...c }));

export function rollRarity(odds, rnd = Math.random) {
  let r = rnd() * 100;
  for (const [k, p] of Object.entries(odds)) { if ((r -= p) < 0) return k; }
  return Object.keys(odds)[0];
}
// the item a chest gives: its rarity by the odds, then any item of that rarity in the pool
export function rollChest(key, rnd = Math.random) {
  const C = CHESTS[key]; if (!C) return null;
  const rarity = rollRarity(C.odds, rnd), pool = CHEST_POOL.filter((it) => it.rarity === rarity);
  return pool[Math.floor(rnd() * pool.length)] || null;
}
// the odds as words for the shop: "Common 60 % · Uncommon 30 % · …"
export const oddsText = (odds) => Object.entries(odds).map(([k, p]) => `<span class="r-${k}">${RARITY[k].name} ${p} %</span>`).join(' · ');

// ---------- the chests, drawn ----------
// lid: 0 shut .. 1 open; at open, a glow colour for the light inside (soft)
export function drawChest(ctx, look, w, h, lid = 0, light = null) {
  const cx = w / 2, bw = w * 0.62, bh = h * 0.36, by = h * 0.86, top = by - bh, lh = h * 0.16;
  const wood = { crate: ['#b89462', '#8a6a40', '#5a4426'], tea: ['#8a6440', '#6a4a2c', '#3e2a16'], footlocker: ['#4a5a3a', '#36442a', '#1e2616'],
    trunk: ['#5a3a24', '#432a18', '#24160c'], strongbox: ['#5a6064', '#41474a', '#24282a'], case: ['#b8bec0', '#8a9294', '#555c5e'],
    offering: ['#4a4a32', '#34361f', '#1c1e10'], reliquary: ['#2a2622', '#1a1714', '#0a0908'] }[look] || ['#8a6a40', '#6a4a2c', '#3e2a16'];
  const band = { crate: null, tea: '#3a3a36', footlocker: '#2a2a26', trunk: '#b8913e', strongbox: '#2e3234', case: '#6a7274', offering: null, reliquary: '#c8bca0' }[look];
  // its shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, by + h * 0.02, bw * 0.58, h * 0.035, 0, 0, TAU); ctx.fill();
  // the light from inside, when open: a soft wedge, not a beam
  if (light && lid > 0.05) {
    const g = ctx.createRadialGradient(cx, top, 0, cx, top - h * 0.1, h * 0.55 * lid);
    g.addColorStop(0, light.replace('A', (0.32 * lid).toFixed(3))); g.addColorStop(1, light.replace('A', '0'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - bw * 0.46, top); ctx.lineTo(cx - bw * 0.8, top - h * 0.6 * lid); ctx.lineTo(cx + bw * 0.8, top - h * 0.6 * lid); ctx.lineTo(cx + bw * 0.46, top); ctx.closePath(); ctx.fill();
  }
  // the body
  const body = () => {
    if (look === 'offering') { // a bundle in old net and kelp
      ctx.fillStyle = wood[1]; ctx.beginPath(); ctx.ellipse(cx, by - bh * 0.45, bw * 0.52, bh * 0.62, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(190,175,130,0.4)'; ctx.lineWidth = Math.max(1, w * 0.004);
      for (let i = -7; i <= 7; i++) for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + i * bw * 0.09 - d * bw * 0.3, by); ctx.lineTo(cx + i * bw * 0.09 + d * bw * 0.3, by - bh * 1.2); ctx.stroke(); }
      ctx.restore(); // old net, knotted round it
      ctx.strokeStyle = '#5a6a30'; ctx.lineWidth = w * 0.012; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * bw * 0.4, by - bh * 0.3); ctx.bezierCurveTo(cx + s * bw * 0.7, by - bh * 0.9, cx + s * bw * 0.3, by - bh * 1.4, cx + s * bw * 0.55, by - bh * 1.8); ctx.stroke(); }
      return;
    }
    const g = ctx.createLinearGradient(0, top, 0, by); g.addColorStop(0, wood[0]); g.addColorStop(1, wood[2]);
    ctx.fillStyle = g; ctx.fillRect(cx - bw / 2, top, bw, bh);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, w * 0.003);
    if (look === 'crate' || look === 'tea' || look === 'trunk' || look === 'footlocker') for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - bw / 2, top + bh * i / 4); ctx.lineTo(cx + bw / 2, top + bh * i / 4); ctx.stroke(); } // planks
    if (look === 'crate') { ctx.strokeStyle = wood[1]; ctx.lineWidth = w * 0.02; ctx.beginPath(); ctx.moveTo(cx - bw / 2 + w * 0.02, top + w * 0.01); ctx.lineTo(cx + bw / 2 - w * 0.02, by - w * 0.01); ctx.stroke(); }
    if (look === 'case') { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; for (let i = 1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx - bw / 2 + bw * i / 9, top); ctx.lineTo(cx - bw / 2 + bw * i / 9, by); ctx.stroke(); } ctx.fillStyle = 'rgba(30,30,30,0.6)'; ctx.font = `${Math.round(h * 0.055)}px monospace`; ctx.textAlign = 'center'; ctx.fillText('STN 280', cx, top + bh * 0.62); }
    if (look === 'reliquary') { ctx.strokeStyle = 'rgba(200,188,160,0.35)'; ctx.lineWidth = Math.max(1, w * 0.004); for (let i = 0; i < 7; i++) { const x0 = cx - bw * 0.42 + i * bw * 0.14; ctx.beginPath(); ctx.moveTo(x0, by - bh * 0.1); ctx.quadraticCurveTo(x0 + bw * 0.05, top + bh * 0.5, x0, top + bh * 0.15); ctx.stroke(); } } // ribs
    if (band) { ctx.fillStyle = band; for (const s of [-1, 1]) ctx.fillRect(cx + s * bw * 0.3 - w * 0.012, top, w * 0.024, bh); if (look === 'trunk' || look === 'reliquary') for (const s of [-1, 1]) { ctx.fillRect(cx + s * bw / 2 - (s > 0 ? w * 0.05 : 0), by - w * 0.05, w * 0.05, w * 0.05); } }
    if (look === 'strongbox' || look === 'footlocker') { ctx.fillStyle = 'rgba(200,200,190,0.35)'; for (let i = 0; i < 6; i++) for (const yy of [top + bh * 0.12, by - bh * 0.12]) { ctx.beginPath(); ctx.arc(cx - bw * 0.45 + i * bw * 0.18, yy, w * 0.005, 0, TAU); ctx.fill(); } }
    // its hasp
    ctx.fillStyle = look === 'trunk' ? '#c8a050' : look === 'reliquary' ? '#c8bca0' : '#3a3a36'; ctx.fillRect(cx - w * 0.02, top, w * 0.04, bh * 0.28);
  };
  body();
  if (look === 'offering') { // no lid: the bundle loosens
    if (lid > 0) { ctx.globalAlpha = 1 - lid; } return void (ctx.globalAlpha = 1);
  }
  // the lid, hinged at its back edge: it swings up and back, showing the dark inside and then its own underside
  const hingeY = top - lh, a = lid * 1.9, edgeY = hingeY + lh * Math.cos(a) - lh * 1.5 * Math.sin(a), curved = look === 'trunk' || look === 'reliquary' || look === 'tea';
  if (lid > 0.02) { // the inside of the box, seen from above
    ctx.fillStyle = '#0c0a08'; ctx.beginPath(); ctx.moveTo(cx - bw / 2 + w * 0.012, top); ctx.lineTo(cx - bw / 2 + w * 0.03, hingeY + lh * 0.2); ctx.lineTo(cx + bw / 2 - w * 0.03, hingeY + lh * 0.2); ctx.lineTo(cx + bw / 2 - w * 0.012, top); ctx.closePath(); ctx.fill();
    if (light) { const g = ctx.createLinearGradient(0, hingeY, 0, top); g.addColorStop(0, light.replace('A', (0.1 * lid).toFixed(3))); g.addColorStop(1, light.replace('A', (0.45 * lid).toFixed(3))); ctx.fillStyle = g; ctx.fill(); }
  }
  const outer = edgeY > hingeY; // which face of the lid shows
  const lg = ctx.createLinearGradient(0, Math.min(edgeY, hingeY), 0, Math.max(edgeY, hingeY) + 1);
  if (outer) { lg.addColorStop(0, wood[0]); lg.addColorStop(1, wood[1]); } else { lg.addColorStop(0, wood[2]); lg.addColorStop(1, wood[1]); }
  ctx.fillStyle = lg;
  const lw = bw * 1.02, bulge = curved ? (edgeY - hingeY) * 0.0 + lh * 0.55 * (outer ? Math.cos(a) : -0.6 * Math.sin(a)) : 0;
  ctx.beginPath(); ctx.moveTo(cx - lw / 2, hingeY);
  if (curved) ctx.quadraticCurveTo(cx, hingeY - bulge * 1.4, cx + lw / 2, hingeY); else ctx.lineTo(cx + lw / 2, hingeY);
  ctx.lineTo(cx + lw / 2, edgeY); ctx.lineTo(cx - lw / 2, edgeY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, w * 0.003); ctx.stroke();
  if (band) { ctx.fillStyle = band; for (const sd of [-1, 1]) ctx.fillRect(cx + sd * bw * 0.3 - w * 0.012, Math.min(hingeY, edgeY) - (curved && outer ? bulge * 0.9 : 0), w * 0.024, Math.abs(edgeY - hingeY) + (curved && outer ? bulge * 0.9 : 0)); }
  if (outer && lid < 0.5) { ctx.fillStyle = look === 'trunk' ? '#c8a050' : look === 'reliquary' ? '#c8bca0' : '#3a3a36'; ctx.fillRect(cx - w * 0.02, edgeY - lh * 0.35, w * 0.04, lh * 0.35); } // the lid's half of the hasp
}

const PICS = new Map();
export function chestPicture(look, w, h) {
  const k = `${look}:${w}x${h}`; if (PICS.has(k)) return PICS.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; drawChest(c.getContext('2d'), look, w, h, 0); const url = c.toDataURL(); PICS.set(k, url); return url;
}

// ---------- the reveal ----------
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const LIGHT = { common: 'rgba(200,196,180,A)', uncommon: 'rgba(150,200,150,A)', rare: 'rgba(130,170,220,A)', exotic: 'rgba(190,150,220,A)', legendary: 'rgba(230,200,120,A)' };
export class ChestReveal {
  // hooks: picture(def, w, h) → data URL; putOn(u); close()
  constructor(root, hooks) {
    this.root = root; this.h = hooks;
    root.innerHTML = `<div class="cr-box"><canvas width="520" height="300"></canvas><div class="cr-item"><img alt=""><div class="cr-txt"><b class="nm"></b><span class="rr"></span><p></p><div class="cr-sks"></div></div></div>
      <div class="cr-acts"><button class="cr-on">Put it on</button><button class="cr-done">Keep it</button></div><small class="cr-skip">click to skip</small></div>`;
    this.cv = root.querySelector('canvas');
    root.addEventListener('click', (ev) => {
      if (ev.target.closest('.cr-on')) { this.h.putOn(this.q.u); this.close(); return; }
      if (ev.target.closest('.cr-done')) { this.close(); return; }
      if (this.t < 3) this.t0 = performance.now() - 3000; // skip to the end
    });
    window.addEventListener('keydown', (ev) => { if (this.root.hidden) return; if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopImmediatePropagation(); if (this.t < 3) this.t0 = performance.now() - 3000; else this.close(); } }, true);
  }
  open(key, q) {
    const C = CHESTS[key], def = ITEMS[q.id]; this.C = C; this.q = q; this.def = def; this.t = 0; this.t0 = performance.now();
    const R = this.root; R.hidden = false; R.classList.remove('done');
    R.querySelector('.cr-item').className = `cr-item r-${def.rarity}`;
    R.querySelector('img').src = this.h.picture(def, 300, 180);
    R.querySelector('.nm').textContent = def.name;
    R.querySelector('.rr').textContent = RARITY[def.rarity].name + (def.set ? ' · set piece' : '');
    R.querySelector('p').textContent = def.line || '';
    R.querySelector('.cr-sks').innerHTML = (q.sk || []).map(([k, l]) => `<div><b>${SKILLS[k].name}${SKILLS[k].flat ? '' : ' ' + ROMAN[l]}</b> ${SKILLS[k].what}</div>`).join('') + (q.leg ? `<div class="leg"><b>✦ ${LEGEND[q.leg].name}</b> ${LEGEND[q.leg].what}</div>` : '');
    const loop = () => { if (R.hidden) return; this.t = (performance.now() - this.t0) / 1000; this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  close() { this.root.hidden = true; this.h.close && this.h.close(); }
  draw() {
    const t = this.t, c = this.cv.getContext('2d'), W = this.cv.width, H = this.cv.height, R = this.root;
    c.clearRect(0, 0, W, H);
    // 0-0.7 s it rattles; 0.7-1.4 the lid comes up; then the light, and the thing rises (in the DOM)
    const shake = t < 0.7 ? Math.sin(t * 60) * (0.7 - t) * 3 : 0, lid = Math.min(1, Math.max(0, (t - 0.7) / 0.7));
    c.save(); c.translate(shake, 0); drawChest(c, this.C.look, W, H, 1 - Math.pow(1 - lid, 3), LIGHT[this.def.rarity]); c.restore();
    const rise = Math.min(1, Math.max(0, (t - 1.3) / 0.9));
    const item = R.querySelector('.cr-item');
    item.style.opacity = rise.toFixed(3); item.style.transform = `translateY(${Math.round((1 - rise) * 40)}px)`;
    if (t >= 2.6 && !R.classList.contains('done')) R.classList.add('done');
  }
}
