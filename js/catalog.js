// The shops' websites (2.6.0; one engine for every shop with a computer since 3.0.0). Bayside Marine Supply on
// the Margaret's cabin computer, the research station's stores terminal, and Dave's own homemade site: the
// same plain old shop website (categories down the side, product cards, a product page with Good for / Not
// for and what changes against what he has on, a wishlist, a cart and one checkout), each with its own name,
// colours and stock (its specialties). Bought things go into the locker, to be put on in the inventory (B).
// Gear can be sold back wherever there is a shop. The old one has no website (see main.js / render.js).
import { ITEMS, ITEMS_OF, kitOf, ownsItem, worn as wornItem, RARITY, isOn, sellValue, LOCKER, lockerFree } from './items.js';
import { drawScroll3 } from './scrolls.js';
import { SUITS, TRAPS, SUPPLIES, supplyMax, money, owns, kit } from './economy.js';
import { NETS_SUB, netsOf } from './capture.js';
import { toolIcon } from './tools_draw.js';
import { drawSpecialPicture, drawSuitFlat } from './item_art.js';
import { drawFins3, drawCam3, drawTank3, drawBag3, drawNet3 } from './gear_art.js';
import { drawEarl } from './earl_draw.js';
import { TAU } from './util.js';
import { chestsOf, oddsText, chestPicture } from './chests.js';
import { drawCash } from './coins.js';

// the shops with a website: their names, look and stock. cats: the categories in the side bar (null: a gap)
export const WEBSHOPS = {
  bayside: { title: 'Bayside Marine Supply', sub: 'Harbour Road, since 1974', stock: 'catalog', theme: 'bayside',
    lede: 'Diving gear and supplies, sent out to the boat the same day.', newIn: ['item:sipper', 'item:macro', 'item:long', 'item:split', 'item:s130'],
    cats: [['home', 'Home'], null, ['net', 'Hand nets'], ['cam', 'Cameras'], ['trawl', 'Trawl nets'], ['trap', 'Traps'], null,
      ['suit', 'Suits'], ['fins', 'Fins'], ['tank', 'Air'], ['bag', 'Bags'], null, ['supply', 'Supplies'], ['chest', 'Surplus crates'], ['sell', 'Sell your gear']], // (4.0.0: the yard is on the Margaret now, P)
    chestTitle: 'Surplus crates', chestLede: 'Returns and odd lots from the back room, sold sealed. You get one thing, whatever is in it.' },
  station: { title: 'Station Stores', sub: 'Abyssal Research Station, 280 m, requisitions', stock: 'station', theme: 'station',
    lede: 'Surplus and spare equipment from the station stores, released to visiting divers. Delivered to your locker.', newIn: [],
    cats: [['home', 'Index'], null, ['cam', 'Cameras'], ['suit', 'Cold-water suits'], null,
      ['net', 'Hand nets'], ['fins', 'Fins'], ['tank', 'Air'], ['bag', 'Bags'], null, ['chest', 'Equipment cases'], ['sell', 'Return equipment']],
    chestTitle: 'Equipment cases', chestLede: 'Sealed cases of kit the scientists stopped using. One item in each, unlisted.' },
  dave: { title: "Dave's Haul", sub: '1,200 m down, cash only, no refunds', stock: 'dave', theme: 'dave',
    lede: "Deep gear, second hand and first rate. If it's on here, I've got it. If it isn't, I haven't. — Dave", newIn: [],
    cats: [['home', 'Front page'], null, ['tank', 'Air'], ['suit', 'Deep suits'], ['net', 'Big-game nets'], null,
      ['fins', 'Fins'], ['bag', 'Bags'], ['cam', 'Cameras'], null, ['chest', 'Boxes, unopened'], ['finds', 'Dave buys'], ['sell', 'Sell me your gear']],
    chestTitle: 'Boxes, unopened', chestLede: "Whatever came down on the rope. I haven't looked. I say." },
};
const ITEM_CATS = ['net', 'cam', 'fins', 'tank', 'bag', 'suit'];
const LEDE = {
  net: 'You carry one; change it in your bag on deck or in the sub.',
  cam: 'Hold still while the shutter is open; sell the pictures at the boat. The higher its Quality, the more each picture earns. Film is bought by the exposure.', trawl: "One in the sub's belly hatch; used up in one haul.",
  trap: 'Set from the surface, on a line from a buoy.', suit: 'One worn at a time.', fins: 'How fast you swim, and sprint.',
  tank: 'How long you can stay down.', bag: 'How many animals you can carry.', supply: 'Bought by the number.',
};
const cm = (m) => `${Math.round(m * 100)} cm`;
const sizeOf = (it) => (it.minLen ? `${cm(it.minLen)}–${cm(it.maxLen)}` : `up to ${cm(it.maxLen)}`);
const secs = (s) => (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`);
const x = (v) => `×${(Math.round(v * 100) / 100).toString()}`;
const n2 = (v) => String(+(+v).toFixed(2));
// (5.12.0) a skill that raises one of an item's numbers directly shows on that number, in green: the boosted figure, and
// in brackets what the skill adds. Haste on fins: speed (6 % a level); Rebreathing on a tank: air (10 % a level); Deep
// Pockets on a bag: animals (one a level). sk: the skills on that very item ([[skill, level], ...])
export function boostOf(kind, label, it, sk) {
  const lv = (k) => (sk || []).reduce((a, q) => a + (q && q[0] === k ? q[1] : 0), 0);
  if (kind === 'fins' && label === 'Speed' && lv('haste')) { const b = it.swim / 2, add = b * 0.06 * lv('haste'); return { txt: n2(b + add), add: '+' + n2(add) }; }
  if (kind === 'tank' && label === 'Air' && lv('rebreathing')) { const add = Math.round(it.air * 0.1 * lv('rebreathing')); return { txt: `about ${secs(it.air + add)}`, add: `+${add} s` }; }
  if (kind === 'bag' && label === 'Spaces' && lv('pockets')) { const add = [0, 2, 5, 10, 20][Math.min(4, lv('pockets'))]; return { txt: String(it.slots + add), add: `+${add}` }; }
  return null;
}
export function measureHtml(kind, row, it, sk) { const B = boostOf(kind, row[0], it, sk); return B ? `<span class="boost">${B.txt} <small>(${B.add})</small></span>` : row[1](it); }
// the same skills on another kind of item raise the stat of what they lift (Haste on a suit: his speed), shown as its own green line
export function crossBoosts(kind, sk) {
  const lv = (k) => (sk || []).reduce((a, q) => a + (q && q[0] === k ? q[1] : 0), 0), out = [];
  if (kind !== 'fins' && lv('haste')) out.push(['Speed', `+${6 * lv('haste')} %`]);
  if (kind !== 'tank' && lv('rebreathing')) out.push(['Air', `+${10 * lv('rebreathing')} %`]);
  if (kind !== 'bag' && lv('pockets')) out.push(['Spaces', `+${[0, 2, 5, 10, 20][Math.min(4, lv('pockets'))]}`]);
  return out;
}
// the numbers compared, per kind: [label, value as text, a number to compare, higher is better?]
export const MEASURES = {
  net: [['Fish size', sizeOf, (it) => it.maxLen, true], ['Reach', (it) => `${it.range} m`, (it) => it.range, true], ['Swing', (it) => `${it.time.toFixed(2)} s, ${it.time <= 0.85 ? 'quick' : it.time <= 1.2 ? 'steady' : 'slow'}`, (it) => -it.time, true]],
  slurp: [['Fish size', sizeOf, (it) => it.maxLen, true], ['Reach', (it) => `${it.range} m`, (it) => it.range, true], ['Reload', (it) => `${it.time} s`, (it) => -it.time, true]],
  tag: [['Range', (it) => `${it.range} m`, (it) => it.range, true], ['Reload', (it) => `${it.time} s`, (it) => -it.time, true]],
  cam: [['Quality', (it) => (it.idx || 10).toFixed(2), (it) => it.idx || 10, true], /* (5.10.10) */ ['Holds', (it) => `${it.shots} exposures`, (it) => it.shots, true], ['Shutter', (it) => `${it.exp} s`, (it) => -it.exp, true], ['Range', (it) => `${it.range} m`, (it) => it.range, true]],
  fins: [['Speed', (it) => n2(it.swim / 2), (it) => it.swim, true], ['Sprint', (it) => n2(it.sprint / 2), (it) => it.sprint, true]], // (5.12.0) half the in-game figure: the rubber fins 0.5
  tank: [['Air', (it) => `about ${secs(it.air)}`, (it) => it.air, true], ['Speed', (it) => (it.speed >= 1 ? 'no slower' : it.speed >= 0.96 ? 'a little slower' : 'slower'), (it) => it.speed, true]],
  bag: [['Spaces', (it) => `${it.slots}`, (it) => it.slots, true]], // (5.14.0)
  suit: [['Pressure starts', (it) => `at ${it.press} m`, (it) => it.press, true], ['Air use', (it) => (it.air < 1 ? x(it.air) : 'normal'), (it) => -it.air, true]], // (5.12.0) no speed: fins alone give it
};

export class Catalog {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.page = 'home'; this.pics = new Map(); this.carts = {}; this.id = 'bayside'; this.cfg = WEBSHOPS.bayside;
    root.innerHTML = `<div class="cat-wallet"><canvas width="96" height="76"></canvas><b></b></div><button class="cat-x" aria-label="Close"></button><div class="cat-bezel"><div class="cat-glass"><header><h1></h1><span class="sub"></span><div class="right"><a class="cat-cart" href="#" data-go="cart"></a><a class="cat-off" href="#">Log off</a></div></header><div class="cat-wrap"><nav class="cat-nav"></nav><main class="cat-main"></main></div></div></div>`;
    this.nav = root.querySelector('.cat-nav'); this.main = root.querySelector('.cat-main');
    root.querySelector('.cat-off').addEventListener('click', (ev) => { ev.preventDefault(); this.h.close(); });
    root.querySelector('.cat-x').addEventListener('click', (ev) => { ev.preventDefault(); this.h.close(); }); // (5.15.5) the game's own close, top right, level with the money; Log off still works
    root.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-go], [data-buy], [data-wish], [data-cart], [data-sellfind]');
      if (!a) { if (ev.target === root) this.h.close(); return; }
      ev.preventDefault();
      if (a.disabled) return;
      if (a.dataset.go) { if (a.dataset.go === 'yard') { this.h.yard(); return; } this.go(a.dataset.go); }
      else if (a.dataset.buy) { this.h.buy(a.dataset.buy); this.render(); }
      else if (a.dataset.wish) { const P = this.h.getProfile(); P.wish = P.wish === a.dataset.wish ? null : a.dataset.wish; this.h.save(); this.render(); }
      else if (a.dataset.sellfind) { this.h.sellFind && this.h.sellFind(a.dataset.sellfind); this.render(); }
      else if (a.dataset.cart) {
        const cart = this.cart(), [act, arg] = a.dataset.cart.split('|');
        if (act === 'add' && !cart.includes(arg)) { if (cart.length >= 5) { this.h.toast && this.h.toast('The cart holds 5 things', 'warn'); } else cart.push(arg); } // (4.5.0) five at most
        else if (act === 'rm') cart.splice(cart.indexOf(arg), 1);
        else if (act === 'checkout') { const done = this.h.checkout && this.h.checkout(cart.slice()); if (done) cart.length = 0; }
        this.render();
      }
    });
    window.addEventListener('keydown', (ev) => { if (!this.root.hidden && ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); if (this.page.startsWith('item:')) this.go(this.back || 'home'); else this.h.close(); } }, true);
  }
  // open a shop's website (the cart is kept per shop until checkout)
  show(id = 'bayside') {
    this.id = WEBSHOPS[id] ? id : 'bayside'; this.cfg = WEBSHOPS[this.id];
    this.root.className = 'webshop th-' + this.cfg.theme;
    // (5.15.1) each shop its own business: Bayside's anchor-and-net mark; Dave's plain heavy name; the Station's spaced masthead
    const h1 = this.root.querySelector('h1'); h1.textContent = this.cfg.title; this.root.querySelector('.sub').textContent = this.cfg.sub;
    if (this.id === 'bayside') h1.insertAdjacentHTML('afterbegin', '<svg class="smark" viewBox="0 0 30 30" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="15" cy="5" r="2.5"/><path d="M15 7.5v18M9 11h12M5 18c1 5 5 7.5 10 7.5S24 23 25 18"/><path d="M4 18l1.5-2.5L7 18M23 18l1.5-2.5L26 18"/></g><g stroke="currentColor" stroke-width="0.8" opacity="0.7"><path d="M9 21h12M10 23h10M12 25h6M11 19l2 6M15 19v6M19 19l-2 6"/></g></svg>');
    this.go('home');
  }
  cart() { return this.carts[this.id] || (this.carts[this.id] = []); }
  get cats() { return this.cfg.cats; }
  go(page) { if (page.startsWith('item:') && !this.page.startsWith('item:')) this.back = this.page; this.page = page; this.render(); this.main.scrollTop = 0; }
  // every thing this shop sells in a category, in one shape
  entries(cat) {
    const P = this.h.getProfile(), g = this.h.getGame(); kit(P);
    if (ITEM_CATS.includes(cat)) {
      // (2.8.0) items, suits included; a bought one goes into the locker, and is put on in the inventory (B)
      const on = wornItem(P, cat);
      return ITEMS_OF(cat, this.cfg.stock).map((it) => ({ key: 'item:' + it.id, id: it.id, it, kind: cat, name: it.name, price: it.price, line: it.line, good: it.kind === 'cam' && it.idx && !/^Quality/.test(it.good || '') ? `Quality ${it.idx.toFixed(2)} · ${it.good || ''}` : it.good, bad: it.bad, /* (5.10.10) a camera shows its Quality */ tag: RARITY[it.rarity].name, rarity: it.rarity,
        owned: ownsItem(P, it.id), on: !!on && on.id === it.id, pic: [cat, it] }));
    }
    if (this.id !== 'bayside') return [];
    if (cat === 'trawl') return ['basic', 'adv'].map((k) => { const T = NETS_SUB[k], have = g && g.items ? netsOf(g.items)[k] : 0, full = have >= T.cap; // (4.11.1) both nets, as before
      return { key: 'subnet:' + k, id: k, kind: 'trawl', name: T.name, price: T.price, line: k === 'adv' ? `The net for big game: a wide mouth, ten animals, and no legend escapes it. Carry ${T.cap} (${have}/${T.cap}).` : `A light net for the sub's belly hatch. Carry up to ${T.cap} (${have}/${T.cap}).`,
        good: k === 'adv' ? 'Sharks, oarfish and legends stay in' : 'A haul of fish while you drive', bad: k === 'adv' ? 'Dear' : 'Big animals often break out, and may tear it', owned: full, on: full, onText: `In the hatch (${have}/${T.cap})`, pic: ['trawl', k] }; });
    if (cat === 'trap') {
      const tr = P.traps || {};
      return ['pot', 'fish'].map((k, i) => { const T = TRAPS[k], have = tr[k] || 0; return { key: 'trap:' + k, id: k, kind: 'trap', name: T.name, price: T.price, line: k === 'pot' ? 'A galvanised box with one funnel.' : 'A mesh box with a funnel at each end.', good: `To ${T.maxDepth} m; up to ${T.holds} animals`, count: `you have (${have}/${T.max})`, full: have >= T.max, pic: ['trap', i] }; });
    }
    // (4.0.0) the anglerfish lure: not at Bayside, only at the station and Dave's, and dear
    if (cat === 'lure') { const S = SUPPLIES.lure, have = ((g && g.items.lure) || 0) + ((P.spare && P.spare.lure) || 0) + (P.oldLures || 0), mx = supplyMax(P, 'lure');
      return [{ key: 'lure', id: 'lure', kind: 'supply', name: S.name, price: S.price, line: S.desc.split(/[.:]/)[0] + '.', count: `you carry ${have} of ${mx}`, full: have >= mx, pic: ['supply', 'lure'] }]; }
    if (cat === 'supply') {
      return Object.entries(SUPPLIES).filter(([k, S]) => k !== 'lure' && (!S.needs || owns(P, S.needs))).map(([k, S]) => { const have = ((g && g.items[k]) || 0) + ((P.spare && P.spare[k]) || 0), mx = supplyMax(P, k); return { key: k, id: k, kind: 'supply', name: S.name, price: S.price, line: S.desc, count: `you have (${have}/${mx})`, full: have >= mx, pic: ['supply', k] }; });
    }
    return [];
  }
  wallet(cash) {
    const w = this.root.querySelector('.cat-wallet'); if (!w) return;
    const b = w.querySelector('b'), txt = money(cash); if (b.textContent !== txt) b.textContent = txt;
    if (!w.drawn) { const c = w.querySelector('canvas'), ctx = c.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0); drawCash(ctx, 24, 19, 30); w.drawn = true; } // the HUD's own banknotes, at its size
  }
  find(key) { for (const c of this.cats) if (c && !['home', 'yard', 'chest', 'sell', 'finds'].includes(c[0])) { const e = this.entries(c[0]).find((q) => q.key === key); if (e) return { e, cat: c[0] }; } return null; }
  catName(cat) { return (this.cats.find((c) => c && c[0] === cat) || [, ''])[1]; }
  render() {
    const P = this.h.getProfile(); if (!P) return;
    const cart = this.cart();
    // (5.11.2) the money is the game's, not the website's: the supplier does not know the player. It sits outside the
    // monitor, top left, drawn as the HUD draws it in play (the painted banknotes and the sum)
    this.wallet(P.cash || 0);
    this.root.querySelector('.cat-cart').textContent = `Cart (${cart.length})`;
    const cur = this.page.includes(':') ? (this.find(this.page) || {}).cat : this.page;
    this.nav.innerHTML = this.cats.map((c) => (c ? `<a href="#" data-go="${c[0]}" class="${c[0] === cur ? 'on' : ''}">${c[1]}</a>` : '<div class="gap"></div>')).join('');
    let html = '';
    if (this.page === 'home') {
      const wish = null; // (4.5.0) saving for something is gone
      if (wish) {
        const k = Math.min(1, (P.cash || 0) / Math.max(1, wish.e.price));
        html += `<a href="#" class="cat-saving" data-go="${wish.e.key}"><img src="${this.pic(wish.e, 240, 128)}" alt=""><div><small>SAVING FOR</small><div class="nm">${wish.e.name}</div><div class="bar"><i style="width:${Math.round(k * 100)}%"></i></div></div><div class="amt">(${money(Math.min(P.cash, wish.e.price), false)}/${money(wish.e.price, false)})</div></a>`;
      } else html += `<p class="cat-lede">${this.cfg.lede}</p>`;
      if (this.id === 'dave' && this.h.daveSays && this.h.daveSays()) html = `<div class="cat-says"><b>Dave:</b> “${this.h.daveSays()}”</div>` + html;
      let pick = this.cfg.newIn.map((k) => this.find(k)).filter((q) => q && !q.e.owned).slice(0, 3);
      if (!pick.length) pick = ITEM_CATS.flatMap((c) => this.entries(c)).filter((e) => !e.owned).sort((a2, b2) => b2.price - a2.price).slice(0, 3).map((e) => ({ e }));
      if (pick.length) html += `<h4>${this.id === 'dave' ? 'Just in' : this.id === 'station' ? 'Recently released' : 'New in'}</h4><div class="cat-grid">${pick.map((q) => this.card(q.e)).join('')}</div>`;
      // (4.18.1) for each thing he has on, the cheapest step up this shop sells (by what matters most for it: a
      // net's fish size, the air in a tank, a bag's room, fins' speed, the depth a suit holds out to)
      const KEY = { net: 0, tank: 0, bag: 0, fins: 0, suit: 0 /* (5.12.0) pressure is first now */ }, shown = new Set(pick.map((q) => q.e.key));
      const ups = Object.entries(KEY).map(([cat, i]) => {
        const M = MEASURES[cat], cur = wornItem(P, cat); if (!M || !cur) return null;
        const better = this.entries(cat).filter((e) => !e.owned && !shown.has(e.key) && e.it && M[i][2](e.it) > M[i][2](cur));
        return better.sort((a2, b2) => a2.price - b2.price)[0] || null;
      }).filter(Boolean).sort((a2, b2) => a2.price - b2.price).slice(0, 3);
      if (ups.length) html += `<h4>A step up from what you have on</h4><div class="cat-grid">${ups.map((e) => this.card(e)).join('')}</div>`;
    } else if (this.page === 'chest') {
      html += `<h2>${this.cfg.chestTitle}</h2><p class="cat-lede">${this.cfg.chestLede}</p>`;
      html += chestsOf(this.id).map((c) => `<div class="cat-chest"><img src="${chestPicture(c.look, 320, 250)}" alt=""><div><h3>${c.name}</h3><div class="price">${money(c.price, false)}</div><p class="say">${c.line}</p><p class="odds">${oddsText(c.odds)}</p><button class="cat-btn" data-buy="chest:${c.key}" ${(P.cash || 0) < c.price ? 'disabled' : ''}>${(P.cash || 0) < c.price ? `${money(c.price, false)}, not enough cash` : `Buy and open, ${money(c.price, false)}`}</button></div></div>`).join('');
    } else if (this.page === 'cart') {
      html += this.cartPage(P, cart);
    } else if (this.page === 'sell') {
      html += this.sellPage(P);
    } else if (this.page === 'finds') {
      html += this.h.findsHtml ? this.h.findsHtml() : '';
    } else if (this.find(this.page)) {
      html += this.itemPage(this.find(this.page));
    } else {
      const list = this.entries(this.page);
      html += `<h2>${this.catName(this.page)}</h2><p class="cat-lede">${this.id === 'bayside' ? LEDE[this.page] || '' : ''}</p><div class="cat-grid">${list.map((e) => this.card(e)).join('')}</div>`;
    }
    this.main.innerHTML = html;
  }
  // the cart: what is in it, the total, room in the locker, one checkout
  cartPage(P, cart) {
    const rows = cart.map((k) => this.find(k)).filter(Boolean);
    if (!rows.length) return `<h2>Your cart</h2><p class="cat-lede">Nothing in it yet.</p>`;
    const total = rows.reduce((a, q) => a + q.e.price, 0), room = lockerFree(P), short = (P.cash || 0) < total, full = rows.length > room;
    return `<h2>Your cart</h2><table class="cat-cartlist">${rows.map((q) => `<tr><td><img src="${this.pic(q.e, 120, 60)}" alt=""></td><td><a href="#" data-go="${q.e.key}">${q.e.name}</a><small>${q.e.tag || ''}</small></td><td class="pr">${money(q.e.price, false)}</td><td><a href="#" class="rm" data-cart="rm|${q.e.key}">Remove</a></td></tr>`).join('')}
      <tr class="tot"><td></td><td>Total</td><td class="pr">${money(total, false)}</td><td></td></tr></table>
      <p class="cat-lede">${full ? `Your locker has room for ${room} more (${LOCKER} in all). Sell something first.` : `Delivered to your locker: put things on from your bag.`}</p>
      <button class="cat-btn" data-cart="checkout" ${short || full ? 'disabled' : ''}>${short ? `${money(total, false)}, not enough cash` : `Check out, ${money(total, false)}`}</button>`;
  }
  // selling gear back: anything in the locker that isn't on him
  sellPage(P) {
    const can = this.h.canSell ? this.h.canSell() : true;
    const list = kitOf(P).items.filter((q) => !isOn(P, q) && ITEMS[q.id] && !ITEMS[q.id].free);
    let html = `<h2>${this.catName('sell')}</h2><p class="cat-lede">${this.id === 'dave' ? "I'll take it off your hands. Not for much." : 'About a third of what it is worth. What you have on is not for sale.'}</p>`;
    if (!list.length) return html + '<p class="cat-lede">Nothing to sell: everything in the locker is on you.</p>';
    return html + `<table class="cat-cartlist">${list.map((q) => { const it = ITEMS[q.id]; return `<tr><td><img src="${pictureOf(it.kind, it, 120, 60)}" alt=""></td><td>${it.name}<small class="r-${it.rarity}">${RARITY[it.rarity].name}</small></td><td class="pr">${money(sellValue(q), false)}</td><td><button class="cat-mini" data-buy="sellgear:${q.u}" ${can ? '' : 'disabled'}>Sell</button></td></tr>`; }).join('')}</table>`;
  }
  card(e) {
    const tag = e.on ? `<div class="tag own">${e.onText || 'On'}</div>` : e.owned ? '<div class="tag own">Owned</div>' : e.count ? `<div class="tag">${e.count}</div>` : `<div class="tag${e.rarity ? ' r-' + e.rarity : ''}">${e.good ? `<span class="good">${e.good}</span>` : ''}${e.rarity && e.rarity !== 'common' ? `<em>${e.tag}</em>` : !e.good ? e.tag || '' : ''}</div>`; // (4.28) what it does on the card; the rarity only when it is not common
    const go = `data-go="${e.key}"`; // (4.16.9) supplies open their own page too
    const buy = e.kind === 'supply' ? `<button class="cat-mini" data-buy="${e.key}" ${e.full || this.h.getProfile().cash < e.price ? 'disabled' : ''}>${e.full ? 'Full' : 'Buy'}</button>` : '';
    let hk = 7; for (const ch of String(e.key)) hk = (hk * 31 + ch.charCodeAt(0)) >>> 0; // (5.15.1) Dave numbers his lots; the Station its stock
    const lot = this.id === 'dave' ? `<span class="lot">Lot ${10 + (hk % 89)}</span>` : '', code = this.id === 'station' ? `<span class="scode">ST-${String(100 + (hk % 900)).padStart(4, '0')}</span>` : '';
    return `<a href="#" class="cat-card" ${go}><img src="${this.pic(e, 300, 118)}" alt=""><div class="t">${lot}<b>${e.name}</b>${code}<span>${e.price ? money(e.price, false) : 'Free'}</span></div>${tag}${buy}</a>`;
  }
  itemPage({ e, cat }) {
    const P = this.h.getProfile(), cash = P.cash || 0;
    let vs = '';
    const M = MEASURES[cat];
    if (M && !e.on) {
      const cur = wornItem(P, cat);
      const rows = M.map(([label, txt, num, hi]) => {
        const b = measureHtml(cat, [label, txt], e.it, e.it.sk ? [e.it.sk] : null); if (!cur) return `<div class="row"><span>${label}</span><span>${b}</span></div>`;
        const a = txt(cur); if (a === b) return '';
        const d = num(e.it) - num(cur), up = hi ? d > 0 : d < 0;
        return `<div class="row"><span>${label}</span><span>${a} → ${b} <b class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'}</b></span></div>`;
      }).join('');
      if (rows) vs = `<div class="vs"><h3>${cur ? `Against your ${cur.name.toLowerCase()}` : 'What it does'}</h3>${rows}</div>`;
    }
    let btn;
    const inCart = this.cart().includes(e.key), item = e.key.startsWith('item:');
    if (e.on) btn = `<span class="cat-have">${e.onText || 'You have it on'}</span>`;
    else if (e.owned && e.kind !== 'trawl') btn = `<span class="cat-have">In your locker</span>`;
    else if (e.full) btn = `<span class="cat-have">${e.count}</span>`;
    else btn = `<button class="cat-btn" data-buy="${e.key}" ${cash < e.price ? 'disabled' : ''}>${cash < e.price ? `${money(e.price, false)}, not enough cash` : `Buy now, ${money(e.price, false)}`}</button>`
      + (item ? (inCart ? `<a href="#" class="cat-save" data-go="cart">In your cart ✓</a>` : `<a href="#" class="cat-btn2" data-cart="add|${e.key}">Add to cart</a>`) : '')
      ; // (4.5.0) no 'Save for this'
    return `<div class="crumbs"><a href="#" data-go="${cat}">${this.catName(cat)}</a> ›</div><div class="cat-item"><div class="cat-photo"><img src="${this.pic(e, 640, 420)}" alt=""></div><div>
      <h2>${e.name}</h2>${e.rarity ? `<div class="rr r-${e.rarity}">${RARITY[e.rarity].name}</div>` : ''}<div class="price">${e.price ? money(e.price, false) : 'Free'}</div><p class="say">${e.line || ''}</p>
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
    if (!plain) { // (5.15.1) a photographer's sweep, not a flat gradient: light pooled from the upper left, the floor darker, a fine grain
      ctx.fillStyle = '#c4d0d5'; ctx.fillRect(0, 0, w, h);
      const pool = ctx.createRadialGradient(w * 0.32, h * 0.12, 2, w * 0.42, h * 0.38, w * 0.78); pool.addColorStop(0, 'rgba(248,250,246,0.75)'); pool.addColorStop(0.55, 'rgba(220,228,228,0.2)'); pool.addColorStop(1, 'rgba(120,136,144,0.35)'); ctx.fillStyle = pool; ctx.fillRect(0, 0, w, h);
      const fl = ctx.createLinearGradient(0, h * 0.62, 0, h); fl.addColorStop(0, 'rgba(90,104,112,0)'); fl.addColorStop(1, 'rgba(90,104,112,0.32)'); ctx.fillStyle = fl; ctx.fillRect(0, h * 0.62, w, h * 0.38);
      let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); for (let i = 0; i < w * h / 70; i++) { ctx.fillStyle = `rgba(${rnd() < 0.5 ? '40,48,52' : '255,255,250'},${(rnd() * 0.05).toFixed(3)})`; ctx.fillRect(rnd() * w, rnd() * h, 1, 1); } }
    if (v && typeof v === 'object' && v.kind === 'ability') { drawScroll3(ctx, w / 2, h / 2, Math.min(w, h) * 0.98, v.fam, v.tier); const url = c.toDataURL(); PICS.set(key, url); return url; } // (5.9.0) an ability's scroll
    if (v && typeof v === 'object' && v.id && kind === 'net') { drawNet3(ctx, w, h, v); const url = c.toDataURL(); PICS.set(key, url); return url; } // (5.12.9)
    if (v && typeof v === 'object' && v.id && (kind === 'tank' || kind === 'bag')) { (kind === 'tank' ? drawTank3 : drawBag3)(ctx, w, h, v); const url = c.toDataURL(); PICS.set(key, url); return url; } // (5.12.8)
    if (v && typeof v === 'object' && v.id && kind === 'cam') { drawCam3(ctx, w, h, v); const url = c.toDataURL(); PICS.set(key, url); return url; } // (5.12.7)
    if (v && typeof v === 'object' && v.id && kind === 'fins') { drawFins3(ctx, w, h, v); const url = c.toDataURL(); PICS.set(key, url); return url; } // (5.12.6) fins photographed as a solid pair
    if (v && typeof v === 'object' && (v.rarity === 'legendary' || v.rarity === 'exotic' || v.finLook || v.tankLook || v.bagLook) && v.id) { drawSpecialPicture(ctx, v, w, h); const url = c.toDataURL(); PICS.set(key, url); return url; } // (2.8.1) their own drawings, on the usual background
    const tool = { net: 'net', slurp: 'slurp', tag: 'tag', cam: 'cam', trap: 'trap' }[kind];
    if (tool) {
      const ic = toolIcon(tool, kind === 'trap' ? v : v.look || 0, Math.round(w * 0.8), Math.round(h * 0.8));
      // (4.28) items that share a drawing are told apart: each gets its own finish (a tint from a small palette of
      // real gear colours) and its own length, both fixed by its id
      const id = v && v.id ? String(v.id) : '';
      if (id && kind !== 'trap') {
        let hsh = 0; for (const ch of id) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
        const FIN = [null, '#c85a2a', '#2f6f8f', '#e0b23a', '#3d7a4a', '#8a3a3a', '#6a6a72', '#d8d0b8'], fin = FIN[hsh % FIN.length], k = 0.84 + ((hsh >> 4) % 5) * 0.04;
        const tc = document.createElement('canvas'); tc.width = ic.width; tc.height = ic.height; const tx = tc.getContext('2d'); tx.drawImage(ic, 0, 0);
        if (fin) { tx.globalCompositeOperation = 'source-atop'; tx.globalAlpha = 0.3; tx.fillStyle = fin; tx.fillRect(0, 0, tc.width, tc.height); }
        const dw = w * 0.8 * k, dh = h * 0.8 * k; ctx.drawImage(tc, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else ctx.drawImage(ic, w * 0.1, h * 0.1);
    }
    else if (kind === 'suit') drawSuitFlat(ctx, w, h, v && typeof v === 'object' ? v : { look: v }); // (5.10.10) the suit laid out on its own, no Earl in it
    else if (kind === 'fins') drawFins(ctx, w, h, v);
    else if (kind === 'tank') drawTank(ctx, w, h, v);
    else if (kind === 'bag') drawBag(ctx, w, h, v);
    else if (kind === 'trawl') drawTrawl(ctx, w, h, v);
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
  // (4.0.5) by its archetype, so every twin set and sidemount pair shows two cylinders: a twin set stacked on a
  // manifold, a sidemount pair slung one behind the other, staggered
  const arch = it.arch || it.id, side = arch === 'side' || it.id === 'sidemount', n = arch === 'twin' || side ? 2 : 1;
  const len = w * (it.air > 90 ? 0.62 : it.air > 60 ? 0.54 : 0.46), r = h * (arch === 'al80' ? 0.12 : side ? 0.12 : 0.14);
  const col = arch === 'al80' ? ['#8a9298', '#c4cacd', '#4a5055'] : ['#4a5257', '#a0a8ae', '#262b2e'];
  for (let i = 0; i < n; i++) {
    const cy = h * (side ? 0.42 + i * 0.16 : n === 2 ? 0.38 + i * 0.26 : 0.5), x0 = w * (side ? 0.13 + (1 - i) * 0.07 : 0.18);
    ctx.globalAlpha = side && i === 0 ? 0.75 : 1; // the far one, a little dimmer
    const g = ctx.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, col[0]); g.addColorStop(0.35, col[1]); g.addColorStop(1, col[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x0, cy - r, len, r * 2, r); ctx.fill();
    ctx.fillStyle = 'rgba(225,215,170,0.6)'; ctx.fillRect(x0 + len * 0.7, cy - r, len * 0.05, r * 2);
    ctx.fillStyle = '#17191b'; ctx.fillRect(x0 + len - 2, cy - r * 0.35, w * 0.05, r * 0.7); // the valve
    if (side) { ctx.fillStyle = '#2a2a26'; ctx.fillRect(x0 + len * 0.18, cy - r * 1.05, len * 0.04, r * 2.1); ctx.fillRect(x0 + len * 0.52, cy - r * 1.05, len * 0.04, r * 2.1); } // the bungee straps
    ctx.globalAlpha = 1;
  }
}
function drawBag(ctx, w, h, it) {
  const s = 0.75 + (it.slots - 5) * 0.06, cx = w / 2, cy = h * 0.52, bw = h * 0.5 * s, bh = h * 0.62 * s;
  ctx.strokeStyle = '#2a2e2c'; ctx.lineWidth = Math.max(2, h * 0.025); ctx.beginPath(); ctx.moveTo(cx - bw * 0.45, cy - bh * 0.5); ctx.lineTo(cx + bw * 0.45, cy - bh * 0.5); ctx.stroke(); // the mouth
  ctx.fillStyle = it.id === 'mesh' ? 'rgba(70,110,80,0.35)' : 'rgba(60,70,90,0.35)'; ctx.beginPath(); ctx.moveTo(cx - bw * 0.45, cy - bh * 0.5); ctx.quadraticCurveTo(cx - bw * 0.7, cy + bh * 0.3, cx, cy + bh * 0.5); ctx.quadraticCurveTo(cx + bw * 0.7, cy + bh * 0.3, cx + bw * 0.45, cy - bh * 0.5); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(30,50,40,0.5)'; ctx.lineWidth = 1; for (let i = -10; i < 10; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 7, cy - bh); ctx.lineTo(cx + i * 7 + bh, cy + bh); ctx.moveTo(cx + i * 7, cy - bh); ctx.lineTo(cx + i * 7 - bh, cy + bh); ctx.stroke(); } ctx.restore();
  if (it.id === 'divided') { ctx.strokeStyle = 'rgba(30,40,50,0.6)'; ctx.lineWidth = 2; for (const f of [-0.15, 0.15]) { ctx.beginPath(); ctx.moveTo(cx + bw * f, cy - bh * 0.5); ctx.lineTo(cx + bw * f * 0.5, cy + bh * 0.4); ctx.stroke(); } }
}
function drawTrawl(ctx, w, h, v) {
  if (v === 'adv') { // (4.11.0) the advanced net: a far wider mouth on a brass hoop, heavy dark twine, a long full bag
    const top = 0.14, bot = 0.86, x0 = 0.14, x1 = 0.88;
    ctx.fillStyle = 'rgba(40,70,70,0.25)'; ctx.beginPath(); ctx.moveTo(w * x0, h * top); ctx.quadraticCurveTo(w * 0.55, h * 0.12, w * x1, h * 0.42); ctx.lineTo(w * x1, h * 0.58); ctx.quadraticCurveTo(w * 0.55, h * 0.88, w * x0, h * bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(70,96,92,0.8)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(w * x0, h * top); ctx.quadraticCurveTo(w * 0.55, h * 0.12, w * x1, h * 0.42); ctx.moveTo(w * x0, h * bot); ctx.quadraticCurveTo(w * 0.55, h * 0.88, w * x1, h * 0.58); ctx.stroke();
    ctx.strokeStyle = 'rgba(96,124,118,0.6)'; ctx.lineWidth = 1.3;
    for (let i = 1; i < 12; i++) { const f = i / 12, x = w * (x0 + f * (x1 - x0)), sp = (1 - f * 0.78) * 0.36; ctx.beginPath(); ctx.moveTo(x, h * (0.5 - sp)); ctx.lineTo(x, h * (0.5 + sp)); ctx.stroke(); }
    for (const q of [0.33, 0.5, 0.67]) { ctx.beginPath(); ctx.moveTo(w * x0, h * (top + (bot - top) * q)); ctx.quadraticCurveTo(w * 0.55, h * (0.5 + (q - 0.5) * 0.5), w * x1, h * (0.5 + (q - 0.5) * 0.2)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(130,108,64,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(w * x0, h * 0.5, w * 0.02, h * (bot - top) / 2, 0, 0, TAU); ctx.stroke(); // the hoop, dull brass
    ctx.fillStyle = 'rgba(200,120,58,0.85)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(w * (x0 + 0.01), h * (top + 0.03 + i * 0.145), h * 0.032, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(w * (x1 + 0.015), h * 0.5, h * 0.05, 0, TAU); ctx.fill();
    return;
  }
  ctx.strokeStyle = 'rgba(60,70,60,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.3); ctx.quadraticCurveTo(w * 0.5, h * 0.22, w * 0.85, h * 0.45); ctx.moveTo(w * 0.15, h * 0.7); ctx.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.85, h * 0.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(80,90,80,0.5)'; ctx.lineWidth = 1; for (let i = 0; i < 10; i++) { const f = i / 10; ctx.beginPath(); ctx.moveTo(w * (0.15 + f * 0.7), h * (0.3 - Math.sin(f * 3) * 0.03 + f * 0.15)); ctx.lineTo(w * (0.15 + f * 0.7), h * (0.7 + Math.sin(f * 3) * 0.03 - f * 0.15)); ctx.stroke(); }
  ctx.fillStyle = '#e8783a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(w * (0.15 + i * 0.012), h * (0.3 + i * 0.13), h * 0.03, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(w * 0.86, h * 0.5, h * 0.035, 0, TAU); ctx.fill();
}
function drawSupply(ctx, w, h, k) {
  const cx = w / 2, cy = h / 2;
  if (k === 'airTank') { drawTank(ctx, w, h, { id: 's100', air: 70 }); return; }
  if (k === 'tag' || k === 'tagAdv') { ctx.strokeStyle = '#3a3e40'; ctx.lineWidth = h * 0.04; ctx.beginPath(); ctx.moveTo(cx - w * 0.25, cy); ctx.lineTo(cx + w * 0.2, cy); ctx.stroke(); ctx.fillStyle = k === 'tagAdv' ? '#9fe8ff' : '#e8c040'; ctx.beginPath(); ctx.moveTo(cx + w * 0.2, cy - h * 0.06); ctx.lineTo(cx + w * 0.3, cy); ctx.lineTo(cx + w * 0.2, cy + h * 0.06); ctx.fill(); ctx.fillRect(cx - w * 0.28, cy - h * 0.08, w * 0.06, h * 0.16); return; }
  const glow = k === 'necklace' ? '255,184,96' : '170,230,255'; // (4.0.0) the glow stick burns warm amber
  if (k !== 'necklace' && k !== 'glowAdv') { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.35); g.addColorStop(0, `rgba(${glow},0.95)`); g.addColorStop(1, `rgba(${glow},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  if (k !== 'necklace' && k !== 'glowAdv') { ctx.fillStyle = '#f4fff8'; ctx.beginPath(); ctx.arc(cx, cy, h * 0.07, 0, TAU); ctx.fill(); }
  if (k === 'necklace' || k === 'glowAdv') { // (5.17.1) a glow stick lying nearly level: a tube lit from inside, its glow following its length. (6.0.1) the advanced one heavier, bone-white, in a steel-capped tube with a knurled band
    const adv = k === 'glowAdv'; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.1); const L = w * (adv ? 0.31 : 0.3), r = h * (adv ? 0.066 : 0.055);
    ctx.save(); ctx.filter = `blur(${Math.round(h * 0.07)}px)`; ctx.fillStyle = adv ? 'rgba(236,230,212,0.5)' : 'rgba(255,176,90,0.55)'; ctx.beginPath(); ctx.roundRect(-L * 1.05, -r * 2.6, L * 2.1, r * 5.2, r * 2.6); ctx.fill(); ctx.restore(); // the glow, along the tube
    const tg = ctx.createLinearGradient(0, -r, 0, r); if (adv) { tg.addColorStop(0, '#fbf8ee'); tg.addColorStop(0.45, '#e2dccb'); tg.addColorStop(1, '#a8a290'); } else { tg.addColorStop(0, '#ffe2b4'); tg.addColorStop(0.45, '#ffc070'); tg.addColorStop(1, '#c87a2a'); }
    ctx.fillStyle = tg; ctx.beginPath(); ctx.roundRect(-L, -r, L * 2, r * 2, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,252,244,0.85)'; ctx.beginPath(); ctx.roundRect(-L * 0.9, -r * 0.55, L * 1.65, r * 0.45, r * 0.2); ctx.fill(); // the lit core
    ctx.strokeStyle = adv ? 'rgba(120,114,96,0.3)' : 'rgba(150,90,30,0.28)'; ctx.lineWidth = 1; for (const f of [-0.08, 0, 0.07]) { ctx.beginPath(); ctx.moveTo(f * L, -r * 0.9); ctx.quadraticCurveTo(f * L + r * 0.3, 0, f * L, r * 0.9); ctx.stroke(); } // a few creases in the middle, where it was bent to snap
    if (adv) { // steel caps at both ends, the near one knurled, and a steel ring
      for (const [x0, wd] of [[-L - r * 0.3, r * 1.2], [L - r * 0.9, r * 2.2]]) { const sg = ctx.createLinearGradient(0, -r * 1.2, 0, r * 1.2); sg.addColorStop(0, '#c8ccc8'); sg.addColorStop(0.5, '#8a8e8c'); sg.addColorStop(1, '#4a4e4c'); ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(x0, -r * 1.2, wd, r * 2.4, r * 0.35); ctx.fill(); }
      ctx.strokeStyle = 'rgba(30,32,30,0.45)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(L - r * 0.9 + i * r * 0.36, -r * 1.1); ctx.lineTo(L - r * 0.9 + i * r * 0.36, r * 1.1); ctx.stroke(); }
      ctx.strokeStyle = '#7a7e7c'; ctx.lineWidth = Math.max(2, r * 0.32); ctx.beginPath(); ctx.arc(L + r * 2.2, 0, r * 0.75, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = '#3a3026'; ctx.beginPath(); ctx.roundRect(L - r * 0.4, -r * 1.15, r * 1.8, r * 2.3, r * 0.4); ctx.fill(); ctx.strokeStyle = '#2a2420'; ctx.lineWidth = Math.max(2, r * 0.35); ctx.beginPath(); ctx.arc(L + r * 2.2, 0, r * 0.75, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore(); }
  else { ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.07); ctx.quadraticCurveTo(cx - w * 0.08, cy - h * 0.35, cx - w * 0.2, cy - h * 0.3); ctx.stroke(); }
}
