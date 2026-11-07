// The catalog (2.6.0): Bayside Marine Supply, a plain old shop website on the cabin computer's screen.
// Home (what you are saving for, and a few new things), a page per category (cards: a picture, the name,
// the price, one small tag) and a page per thing (the picture, one sentence, Good for / Not for, and the
// two or three numbers that change against what he has on). No basket: Buy is instant, and the thing is
// on at once (he can change back in the inventory, B). The yard (the sub's parts) is a link to the old
// shop screen. Plain words, real units, nothing else. See docs/SHOP_PLAN.md.
import { ITEMS, ITEMS_OF, kitOf, ownsItem, worn as wornItem, RARITY } from './items.js';
import { SUITS, TRAPS, SUPPLIES, supplyMax, money, owns, kit } from './economy.js';
import { NETS_SUB } from './capture.js';
import { toolIcon } from './tools_draw.js';
import { drawEarl } from './earl_draw.js';
import { TAU } from './util.js';

const CATS = [
  ['home', 'Home'], null,
  ['net', 'Hand nets'], ['slurp', 'Slurp guns'], ['tag', 'Tag guns'], ['cam', 'Cameras'], ['trawl', 'Trawl nets'], ['trap', 'Traps'], null,
  ['suit', 'Suits'], ['fins', 'Fins'], ['tank', 'Air'], ['bag', 'Bags'], null,
  ['supply', 'Supplies'], ['yard', 'The yard'],
];
const LEDE = {
  net: 'Key 1 under water. You carry one; change it in your inventory (B) on deck or in the sub.',
  slurp: 'Key 2. For small, quick animals the net would miss.', tag: 'Key 3. A research tag on anything too big to bring up.',
  cam: 'Key 4. The institute pays for the first photograph of each species.', trawl: "One in the sub's belly hatch (N); used up in one haul.",
  trap: 'Set from the surface, on a line from a buoy (key 5).', suit: 'One worn at a time.', fins: 'How fast he swims, and sprints.',
  tank: 'How long he can stay down.', bag: 'How many animals he can carry.', supply: 'Bought by the number.',
};
const cm = (m) => `${Math.round(m * 100)} cm`;
const sizeOf = (it) => (it.minLen ? `${cm(it.minLen)}–${cm(it.maxLen)}` : `up to ${cm(it.maxLen)}`);
const secs = (s) => (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`);
const x = (v) => `×${(Math.round(v * 100) / 100).toString()}`;
// the numbers compared, per kind: [label, value as text, a number to compare, higher is better?]
const MEASURES = {
  net: [['Fish size', sizeOf, (it) => it.maxLen, true], ['Reach', (it) => `${it.range} m`, (it) => it.range, true], ['Swing', (it) => (it.time <= 0.85 ? 'quick' : it.time <= 1.2 ? 'steady' : 'slow'), (it) => -it.time, true]],
  slurp: [['Fish size', sizeOf, (it) => it.maxLen, true], ['Reach', (it) => `${it.range} m`, (it) => it.range, true], ['Reload', (it) => `${it.time} s`, (it) => -it.time, true]],
  tag: [['Range', (it) => `${it.range} m`, (it) => it.range, true], ['Reload', (it) => `${it.time} s`, (it) => -it.time, true]],
  cam: [['Shots a dive', (it) => `${it.shots}`, (it) => it.shots, true], ['Range', (it) => `${it.range} m`, (it) => it.range, true]],
  fins: [['Cruising', (it) => x(it.swim), (it) => it.swim, true], ['Sprint', (it) => x(it.sprint), (it) => it.sprint, true]],
  tank: [['Air', (it) => `about ${secs(it.air)}`, (it) => it.air, true], ['Speed', (it) => (it.speed >= 1 ? 'no slower' : it.speed >= 0.96 ? 'a little slower' : 'slower'), (it) => it.speed, true]],
  bag: [['Animals', (it) => `${it.slots}`, (it) => it.slots, true]],
  suit: [['Speed', (it) => x(it.speed), (it) => it.speed, true], ['Air use', (it) => x(it.air), (it) => -it.air, true], ['Pressure starts', (it) => `at ${it.press} m`, (it) => it.press, true]],
};

export class Catalog {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.page = 'home'; this.pics = new Map();
    root.innerHTML = `<div class="cat-bezel"><div class="cat-glass"><header><h1>Bayside Marine Supply</h1><span class="sub">Harbour Road · since 1974</span><div class="right"><span class="cat-cash"></span><a class="cat-off" href="#">Log off</a></div></header><div class="cat-wrap"><nav class="cat-nav"></nav><main class="cat-main"></main></div></div></div>`;
    this.nav = root.querySelector('.cat-nav'); this.main = root.querySelector('.cat-main');
    root.querySelector('.cat-off').addEventListener('click', (ev) => { ev.preventDefault(); this.h.close(); });
    root.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-go], [data-buy], [data-wish]');
      if (!a) { if (ev.target === root) this.h.close(); return; }
      ev.preventDefault();
      if (a.dataset.go) { if (a.dataset.go === 'yard') { this.h.yard(); return; } this.go(a.dataset.go); }
      else if (a.dataset.buy) { if (a.disabled) return; this.h.buy(a.dataset.buy); this.render(); }
      else if (a.dataset.wish) { const P = this.h.getProfile(); P.wish = P.wish === a.dataset.wish ? null : a.dataset.wish; this.h.save(); this.render(); }
    });
    window.addEventListener('keydown', (ev) => { if (!this.root.hidden && ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); if (this.page.startsWith('item:')) this.go(this.back || 'home'); else this.h.close(); } }, true);
  }
  show() { this.go('home'); }
  go(page) { if (page.startsWith('item:') && !this.page.startsWith('item:')) this.back = this.page; this.page = page; this.render(); this.main.scrollTop = 0; }
  // every thing the catalog sells in a category, in one shape
  entries(cat) {
    const P = this.h.getProfile(), g = this.h.getGame(); kit(P);
    if (['net', 'slurp', 'tag', 'cam', 'fins', 'tank', 'bag', 'suit'].includes(cat)) {
      // (2.8.0) items, suits included; a bought one goes into the locker, and is put on in the inventory (B)
      const on = wornItem(P, cat);
      return ITEMS_OF(cat, 'catalog').map((it) => ({ key: 'item:' + it.id, id: it.id, it, kind: cat, name: it.name, price: it.price, line: it.line, good: it.good, bad: it.bad, tag: RARITY[it.rarity].name, rarity: it.rarity,
        owned: ownsItem(P, it.id), on: !!on && on.id === it.id, pic: [cat, it] }));
    }
    if (cat === 'trawl') { const T = NETS_SUB.basic, inHatch = g && g.items && g.items.net === 'basic'; return [{ key: 'subnet:basic', id: 'basic', kind: 'trawl', name: T.name, price: T.price, line: "A light net for the sub's belly hatch.", good: 'A haul of shallow fish while you drive', bad: 'Deep animals tear it', owned: inHatch, on: inHatch, onText: 'In the hatch', pic: ['trawl', 0] }]; }
    if (cat === 'trap') {
      const tr = P.traps || {};
      return ['pot', 'fish'].map((k, i) => { const T = TRAPS[k], have = tr[k] || 0; return { key: 'trap:' + k, id: k, kind: 'trap', name: T.name, price: T.price, line: k === 'pot' ? 'A galvanised box with one funnel.' : 'A mesh box with a funnel at each end.', good: `To ${T.maxDepth} m; up to ${T.holds} animals`, count: `you have ${have} of ${T.max}`, full: have >= T.max, pic: ['trap', i] }; });
    }
    if (cat === 'supply') {
      return Object.entries(SUPPLIES).filter(([k, S]) => !S.needs || owns(P, S.needs)).map(([k, S]) => { const have = (g && g.items[k]) || 0, mx = supplyMax(P, k); return { key: k, id: k, kind: 'supply', name: S.name, price: S.price, line: S.desc.split(/[.:]/)[0] + '.', count: `you have ${have} of ${mx}`, full: have >= mx, pic: ['supply', k] }; });
    }
    return [];
  }
  find(key) { for (const c of CATS) if (c && c[0] !== 'home' && c[0] !== 'yard') { const e = this.entries(c[0]).find((q) => q.key === key); if (e) return { e, cat: c[0] }; } return null; }
  render() {
    const P = this.h.getProfile(); if (!P) return;
    this.root.querySelector('.cat-cash').textContent = `Cash ${money(P.cash)}`;
    const cur = this.page.startsWith('item:') || this.page.startsWith('suit:') || this.page.startsWith('trap:') || this.page.startsWith('subnet:') ? (this.find(this.page) || {}).cat : this.page;
    this.nav.innerHTML = CATS.map((c) => (c ? `<a href="#" data-go="${c[0]}" class="${c[0] === cur ? 'on' : ''}">${c[1]}</a>` : '<div class="gap"></div>')).join('');
    let html = '';
    if (this.page === 'home') {
      const wish = P.wish ? this.find('item:' + P.wish) || this.find(P.wish) : null;
      if (wish) {
        const k = Math.min(1, (P.cash || 0) / Math.max(1, wish.e.price));
        html += `<a href="#" class="cat-saving" data-go="${wish.e.key}"><img src="${this.pic(wish.e, 240, 128)}" alt=""><div><small>SAVING FOR</small><div class="nm">${wish.e.name}</div><div class="bar"><i style="width:${Math.round(k * 100)}%"></i></div></div><div class="amt">${money(Math.min(P.cash, wish.e.price), false)} of ${money(wish.e.price, false)}</div></a>`;
      } else html += `<p class="cat-lede">Diving gear and supplies, sent out to the boat the same day.</p>`;
      const pick = ['item:sipper', 'item:macro', 'item:long', 'item:split', 'item:s130'].map((k) => this.find(k)).filter((q) => q && !q.e.owned).slice(0, 3);
      if (pick.length) html += `<h4>New in</h4><div class="cat-grid">${pick.map((q) => this.card(q.e)).join('')}</div>`;
    } else if (this.find(this.page)) {
      html += this.itemPage(this.find(this.page));
    } else {
      const name = (CATS.find((c) => c && c[0] === this.page) || [, ''])[1];
      const list = this.entries(this.page);
      html += `<h2>${name}</h2><p class="cat-lede">${LEDE[this.page] || ''}</p><div class="cat-grid">${list.map((e) => this.card(e)).join('')}</div>`;
    }
    this.main.innerHTML = html;
  }
  card(e) {
    const tag = e.on ? `<div class="tag own">${e.onText || 'On'}</div>` : e.owned ? '<div class="tag own">Owned</div>' : e.count ? `<div class="tag">${e.count}</div>` : `<div class="tag">${e.tag || ''}</div>`;
    const go = e.kind === 'supply' ? '' : `data-go="${e.key}"`;
    const buy = e.kind === 'supply' ? `<button class="cat-mini" data-buy="${e.key}" ${e.full || this.h.getProfile().cash < e.price ? 'disabled' : ''}>${e.full ? 'Full' : 'Buy'}</button>` : '';
    return `<a href="#" class="cat-card" ${go}><img src="${this.pic(e, 300, 118)}" alt=""><div class="t"><b>${e.name}</b><span>${e.price ? money(e.price, false) : 'Free'}</span></div>${tag}${buy}</a>`;
  }
  itemPage({ e, cat }) {
    const P = this.h.getProfile(), cash = P.cash || 0;
    let vs = '';
    const M = MEASURES[cat];
    if (M && !e.on) {
      const cur = wornItem(P, cat);
      const rows = M.map(([label, txt, num, hi]) => {
        const b = txt(e.it); if (!cur) return `<div class="row"><span>${label}</span><span>${b}</span></div>`;
        const a = txt(cur); if (a === b) return '';
        const d = num(e.it) - num(cur), up = hi ? d > 0 : d < 0;
        return `<div class="row"><span>${label}</span><span>${a} → ${b} <b class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'}</b></span></div>`;
      }).join('');
      if (rows) vs = `<div class="vs"><h3>${cur ? `Against your ${cur.name.toLowerCase()}` : 'What it does'}</h3>${rows}</div>`;
    }
    let btn;
    if (e.on) btn = `<span class="cat-have">${e.onText || 'You have it on'}</span>`;
    else if (e.owned && e.kind !== 'trawl') btn = `<span class="cat-have">In your locker (B)</span>`;
    else if (e.full) btn = `<span class="cat-have">${e.count}</span>`;
    else btn = `<button class="cat-btn" data-buy="${e.key}" ${cash < e.price ? 'disabled' : ''}>${cash < e.price ? `${money(e.price, false)} · not enough cash` : `Buy · ${money(e.price, false)}`}</button>` + (e.price > cash && e.kind !== 'trap' ? `<a href="#" class="cat-save" data-wish="${e.key.startsWith('item:') ? e.id : e.key}">${P.wish === e.id || P.wish === e.key ? 'Saving for this ✓' : 'Save for this'}</a>` : '');
    const name = (CATS.find((c) => c && c[0] === cat) || [, ''])[1];
    return `<div class="crumbs"><a href="#" data-go="${cat}">${name}</a> ›</div><div class="cat-item"><img src="${this.pic(e, 640, 420)}" alt=""><div>
      <h2>${e.name}</h2><div class="price">${e.price ? money(e.price, false) : 'Free'}</div><p class="say">${e.line || ''}</p>
      <div class="gf">${e.good ? `<div class="g">${e.good}</div>` : ''}${e.bad ? `<div class="b">${e.bad}</div>` : ''}</div>${vs}<div class="buy">${btn}</div></div></div>`;
  }
  // the pictures: the game's own drawings where it has them; simple drawn ones for fins, tanks, bags
  pic(e, w, h) { return pictureOf(e.pic[0], e.pic[1], w, h); }
}
// a picture of a thing, as a data URL (cached): kind, and the item (or suit key, trap index, supply key)
const PICS = new Map();
export function pictureOf(kind, v, w, h, plain = false) {
    const key = kind + ':' + (v && v.id ? v.id : v) + ':' + w + 'x' + h + (plain ? 'p' : '');
    if (PICS.has(key)) return PICS.get(key);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
    if (!plain) { const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#cfdadf'); bg.addColorStop(1, '#b4c3ca'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    const tool = { net: 'net', slurp: 'slurp', tag: 'tag', cam: 'cam', trap: 'trap' }[kind];
    if (tool) { const ic = toolIcon(tool, kind === 'trap' ? v : v.look || 0, Math.round(w * 0.8), Math.round(h * 0.8)); ctx.drawImage(ic, w * 0.1, h * 0.1); }
    else if (kind === 'suit') { ctx.save(); ctx.translate(w / 2, h * 0.52); ctx.rotate(-Math.PI / 2); drawEarl(ctx, h * 0.86, 0, 0, null, null, { kind: 'none', tier: 0, t: 0, suit: v && typeof v === 'object' ? v.pal || v.look : v, bag: [], noTank: true }); ctx.restore(); }
    else if (kind === 'fins') drawFins(ctx, w, h, v);
    else if (kind === 'tank') drawTank(ctx, w, h, v);
    else if (kind === 'bag') drawBag(ctx, w, h, v);
    else if (kind === 'trawl') drawTrawl(ctx, w, h);
    else drawSupply(ctx, w, h, v);
    const url = c.toDataURL(); PICS.set(key, url); return url;
}

// a pair of fins, side on, one behind the other
function drawFins(ctx, w, h, it) {
  const col = { rubber: ['#1d3346', '#3a6a88'], split: ['#2a3a2a', '#5a8a5a'], longfin: ['#1a1c20', '#3a4048'], jet: ['#2a2a2a', '#555'] }[it.id] || ['#222', '#555'];
  for (const [dx, dy, a] of [[0.06, -0.08, 0.5], [0, 0.06, 1]]) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(w * (0.22 + dx), h * (0.5 + dy)); const L = w * (it.id === 'longfin' ? 0.6 : 0.5), T = h * 0.2;
    ctx.fillStyle = '#16181b'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.18, T * 0.55, 0, 0, TAU); ctx.fill(); // the foot pocket
    const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(L * 0.12, -T * 0.4); ctx.quadraticCurveTo(L * 0.6, -T * 0.6, L, -T * 0.55); ctx.lineTo(L, T * 0.55); ctx.quadraticCurveTo(L * 0.6, T * 0.6, L * 0.12, T * 0.4); ctx.closePath(); ctx.fill();
    if (it.id === 'split') { ctx.strokeStyle = '#b4c3ca'; ctx.lineWidth = Math.max(2, h * 0.02); ctx.beginPath(); ctx.moveTo(L * 0.5, 0); ctx.lineTo(L, 0); ctx.stroke(); }
    if (it.id === 'jet') { ctx.fillStyle = '#b4c3ca'; for (let i = 0; i < 3; i++) ctx.fillRect(L * (0.3 + i * 0.07), -T * 0.25, L * 0.04, T * 0.5); }
    ctx.restore();
  }
}
function drawTank(ctx, w, h, it) {
  const n = it.id === 'twin' || it.id === 'sidemount' ? 2 : 1, len = w * (it.air > 90 ? 0.62 : it.air > 60 ? 0.54 : 0.46), r = h * (it.id === 'al80' ? 0.12 : 0.14);
  const col = it.id === 'al80' ? ['#8a9298', '#c4cacd', '#4a5055'] : ['#4a5257', '#a0a8ae', '#262b2e'];
  for (let i = 0; i < n; i++) {
    const cy = h * (n === 2 ? 0.38 + i * 0.26 : 0.5), x0 = w * 0.18;
    const g = ctx.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, col[0]); g.addColorStop(0.35, col[1]); g.addColorStop(1, col[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x0, cy - r, len, r * 2, r); ctx.fill();
    ctx.fillStyle = 'rgba(225,215,170,0.6)'; ctx.fillRect(x0 + len * 0.7, cy - r, len * 0.05, r * 2);
    ctx.fillStyle = '#17191b'; ctx.fillRect(x0 + len - 2, cy - r * 0.35, w * 0.05, r * 0.7); // the valve
  }
}
function drawBag(ctx, w, h, it) {
  const s = 0.75 + (it.slots - 5) * 0.06, cx = w / 2, cy = h * 0.52, bw = h * 0.5 * s, bh = h * 0.62 * s;
  ctx.strokeStyle = '#2a2e2c'; ctx.lineWidth = Math.max(2, h * 0.025); ctx.beginPath(); ctx.moveTo(cx - bw * 0.45, cy - bh * 0.5); ctx.lineTo(cx + bw * 0.45, cy - bh * 0.5); ctx.stroke(); // the mouth
  ctx.fillStyle = it.id === 'mesh' ? 'rgba(70,110,80,0.35)' : 'rgba(60,70,90,0.35)'; ctx.beginPath(); ctx.moveTo(cx - bw * 0.45, cy - bh * 0.5); ctx.quadraticCurveTo(cx - bw * 0.7, cy + bh * 0.3, cx, cy + bh * 0.5); ctx.quadraticCurveTo(cx + bw * 0.7, cy + bh * 0.3, cx + bw * 0.45, cy - bh * 0.5); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(30,50,40,0.5)'; ctx.lineWidth = 1; for (let i = -10; i < 10; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 7, cy - bh); ctx.lineTo(cx + i * 7 + bh, cy + bh); ctx.moveTo(cx + i * 7, cy - bh); ctx.lineTo(cx + i * 7 - bh, cy + bh); ctx.stroke(); } ctx.restore();
  if (it.id === 'divided') { ctx.strokeStyle = 'rgba(30,40,50,0.6)'; ctx.lineWidth = 2; for (const f of [-0.15, 0.15]) { ctx.beginPath(); ctx.moveTo(cx + bw * f, cy - bh * 0.5); ctx.lineTo(cx + bw * f * 0.5, cy + bh * 0.4); ctx.stroke(); } }
}
function drawTrawl(ctx, w, h) {
  ctx.strokeStyle = 'rgba(60,70,60,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.3); ctx.quadraticCurveTo(w * 0.5, h * 0.22, w * 0.85, h * 0.45); ctx.moveTo(w * 0.15, h * 0.7); ctx.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.85, h * 0.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(80,90,80,0.5)'; ctx.lineWidth = 1; for (let i = 0; i < 10; i++) { const f = i / 10; ctx.beginPath(); ctx.moveTo(w * (0.15 + f * 0.7), h * (0.3 - Math.sin(f * 3) * 0.03 + f * 0.15)); ctx.lineTo(w * (0.15 + f * 0.7), h * (0.7 + Math.sin(f * 3) * 0.03 - f * 0.15)); ctx.stroke(); }
  ctx.fillStyle = '#e8783a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(w * (0.15 + i * 0.012), h * (0.3 + i * 0.13), h * 0.03, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(w * 0.86, h * 0.5, h * 0.035, 0, TAU); ctx.fill();
}
function drawSupply(ctx, w, h, k) {
  const cx = w / 2, cy = h / 2;
  if (k === 'airTank') { drawTank(ctx, w, h, { id: 's100', air: 70 }); return; }
  if (k === 'tag' || k === 'tagAdv') { ctx.strokeStyle = '#3a3e40'; ctx.lineWidth = h * 0.04; ctx.beginPath(); ctx.moveTo(cx - w * 0.25, cy); ctx.lineTo(cx + w * 0.2, cy); ctx.stroke(); ctx.fillStyle = k === 'tagAdv' ? '#9fe8ff' : '#e8c040'; ctx.beginPath(); ctx.moveTo(cx + w * 0.2, cy - h * 0.06); ctx.lineTo(cx + w * 0.3, cy); ctx.lineTo(cx + w * 0.2, cy + h * 0.06); ctx.fill(); ctx.fillRect(cx - w * 0.28, cy - h * 0.08, w * 0.06, h * 0.16); return; }
  const glow = k === 'necklace' ? '170,255,190' : '170,230,255';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.35); g.addColorStop(0, `rgba(${glow},0.95)`); g.addColorStop(1, `rgba(${glow},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f4fff8'; ctx.beginPath(); ctx.arc(cx, cy, h * 0.07, 0, TAU); ctx.fill();
  if (k === 'necklace') { ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy - h * 0.12, h * 0.24, 0.3, Math.PI - 0.3); ctx.stroke(); }
  else { ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.07); ctx.quadraticCurveTo(cx - w * 0.08, cy - h * 0.35, cx - w * 0.2, cy - h * 0.3); ctx.stroke(); }
}
