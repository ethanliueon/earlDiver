// Dave's Haul (2.7.0): the mid-game shop, a diver's habitat on the seamount ~1,200 m down (world.js DAVE).
// Earl docks the sub at the airlock (or swims up to it) and presses F. Dave's own scruffy chalkboard, not a
// website: what he sells chalked up on the left (the items in items.js with shop: 'dave', and the rebreather
// suit), what he buys on the right (pearls, sapphires, whalebone, glass sponge and nodules, for a quarter more
// than the Margaret pays). He says a line when you come in (text only), and remembers how often you've been.
import { ITEMS, ownsItem, worn as wornItem } from './items.js';
import { SUITS, GOODS, money } from './economy.js';
import { pictureOf } from './catalog.js';
import { chestsOf, oddsText, chestPicture } from './chests.js';

export const DAVE_FINDS = ['pearl', 'sapphire', 'bone', 'glass', 'nodule'];
export const DAVE_RATE = 1.25; // what he pays, against the Margaret's price

const FIRST = "Well, would you look at that. Nobody comes down this far. I'm Dave. This is my place, and that's my shop. Have a look, mind the drips.";
const LINES = [
  'Mind the hatch, it sticks when the cold gets into it.',
  "Coffee's terrible. Pressure's fine, though.",
  'Bring me pearls. I pay better than that boat of yours.',
  "Saw a light out west, down along the wall. Wasn't me. Wasn't anyone I know.",
  "Fixed the heater again. Third time this week.",
  "Every bit of this came down on a rope. Every bit.",
  "You want the pro net. Trust me, you want the pro net.",
  "Sapphires, now. The deep doesn't like it when you take those. Bring 'em here anyway.",
  "Quiet down here. That's the point.",
  "Don't go past the plain without a good hull. I've heard things down there.",
];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class DaveShop {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.line = '';
    root.innerHTML = `<div class="dv-board">
      <header><div class="dv-title"><h2>Dave's Haul</h2><span>1,200 m down · cash only · no refunds</span></div>
        <div class="dv-cash"><small>you've got</small><b></b></div><button class="dv-close" aria-label="Close">×</button></header>
      <p class="dv-says"></p>
      <div class="dv-cols"><div class="dv-col dv-sell"><h3>For sale</h3><div class="dv-list"></div></div>
        <div class="dv-col dv-buy"><h3>Dave buys</h3><div class="dv-finds"></div></div></div>
    </div>`;
    root.querySelector('.dv-close').addEventListener('click', () => this.h.close());
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-dv]');
      if (!b || b.disabled) return;
      const [act, arg] = b.dataset.dv.split('|');
      if (act === 'buy') this.h.buy(arg);
      else if (act === 'sell') this.h.sellFind(arg);
      this.render();
    });
  }
  // he says a line as you come in: the first time, his hello; after that, one of his usual
  open() {
    const P = this.h.getProfile();
    if (!P) return;
    const n = P.daveVisits || 0;
    this.line = n === 0 ? FIRST : LINES[(n * 7 + Math.floor(Math.random() * LINES.length)) % LINES.length];
    P.daveVisits = n + 1; this.h.save && this.h.save();
    this.render();
  }
  // (3.0.0) for his website: what he says as you log on, and the page of what he buys
  says() { return this.line; }
  findsHtml() {
    const g = this.h.getGame(); if (!g) return '';
    const pay = this.h.payFinds ? this.h.payFinds() : 1;
    const finds = DAVE_FINDS.filter((k) => (g.inv[k] || 0) > 0);
    let html = `<h2>Dave buys</h2><p class="cat-lede">Pearls, sapphires, whalebone, glass sponge, nodules. Whatever odd thing you find down here, I pay a quarter more than that boat of yours.</p>`;
    if (!finds.length) return html + '<p class="cat-lede">Nothing on you he wants, right now.</p>';
    html += `<table class="cat-cartlist">${finds.map((k) => { const n = g.inv[k], each = GOODS[k].price * DAVE_RATE * pay; return `<tr><td>${esc(GOODS[k].name)}${n > 1 ? ` ×${n}` : ''}<small>${money(each)} each</small></td><td class="pr">${money(each * n, false)}</td><td><button class="cat-mini" data-sellfind="${k}">Sell</button></td></tr>`; }).join('')}</table>`;
    if (finds.length > 1) { const tot = finds.reduce((a, k) => a + GOODS[k].price * DAVE_RATE * pay * g.inv[k], 0); html += `<button class="cat-btn" data-sellfind="all">Sell him the lot · ${money(tot, false)}</button>`; }
    return html;
  }
  wares(P) {
    // (2.8.0) his items, suits included, from items.js (shop: 'dave'); bought ones go into the locker
    return Object.values(ITEMS).filter((it) => it.shop === 'dave').map((it) => { const w = wornItem(P, it.kind); return { key: 'item:' + it.id, name: it.name, price: it.price, line: it.line, good: it.good, bad: it.bad,
      owned: ownsItem(P, it.id), on: !!w && w.id === it.id, pic: pictureOf(it.kind, it, 150, 90, true) }; });
  }
  render() {
    const P = this.h.getProfile(), g = this.h.getGame();
    if (!P || !g) return;
    this.root.querySelector('.dv-cash b').textContent = money(P.cash, false);
    this.root.querySelector('.dv-says').innerHTML = `<b>Dave:</b> “${esc(this.line)}”`;
    const chests = chestsOf('dave').map((c) => `<div class="dv-row ch"><img src="${chestPicture(c.look, 192, 150)}" alt=""><div class="dv-txt"><b>${esc(c.name)}</b><span>${esc(c.line)}</span><small class="ch-odds">${oddsText(c.odds)}</small></div><button data-dv="buy|chest:${c.key}" ${P.cash + 1e-6 < c.price ? 'disabled' : ''}>Open ${money(c.price, false)}</button></div>`).join('');
    this.root.querySelector('.dv-list').innerHTML = `<h4 class="dv-sub">Boxes, unopened</h4>${chests}<h4 class="dv-sub">Gear</h4>` + this.wares(P).map((w) => {
      const btn = w.owned ? `<span class="dv-own">${w.on ? 'on you' : 'yours'}</span>` : `<button data-dv="buy|${w.key}" ${P.cash + 1e-6 < w.price ? 'disabled' : ''}>Buy ${money(w.price, false)}</button>`;
      return `<div class="dv-row${w.owned ? ' owned' : ''}"><img src="${w.pic}" alt=""><div class="dv-txt"><b>${esc(w.name)}</b><span>${esc(w.line)}</span>${w.good ? `<em class="g">+ ${esc(w.good)}</em>` : ''}${w.bad ? `<em class="b">− ${esc(w.bad)}</em>` : ''}</div>${btn}</div>`;
    }).join('');
    const pay = this.h.payFinds ? this.h.payFinds() : 1;
    const finds = DAVE_FINDS.filter((k) => (g.inv[k] || 0) > 0);
    let html = finds.map((k) => { const n = g.inv[k], each = GOODS[k].price * DAVE_RATE * pay; return `<div class="dv-find"><span>${esc(GOODS[k].name)}${n > 1 ? ` ×${n}` : ''}</span><i>${money(each)} each</i><button data-dv="sell|${k}">Sell ${money(each * n, false)}</button></div>`; }).join('');
    if (finds.length > 1) { const tot = finds.reduce((a, k) => a + GOODS[k].price * DAVE_RATE * pay * g.inv[k], 0); html += `<button class="dv-all" data-dv="sell|all">Sell him the lot · ${money(tot, false)}</button>`; }
    if (!finds.length) html = `<p class="dv-none">Pearls, sapphires, whalebone, glass sponge, nodules. Whatever odd thing you find down here, he pays a quarter more than the boat.</p>`;
    this.root.querySelector('.dv-finds').innerHTML = html;
  }
}
