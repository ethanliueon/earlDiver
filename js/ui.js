// DOM overlays: home screen, journal, boat workshop, pause, run log.
import { SPECIES_BY_ID, SPECIES } from './species.js';
const SPECIES_COUNT = SPECIES.length;
import { speciesIcon } from './creatures_draw.js';
import { RESOURCES } from './world.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS, TRAPS } from './economy.js';
import { toolIcon } from './tools_draw.js';
import { specimenValue, conditionName, rarityOf } from './specimens.js';
const badge = (sp) => { const r = rarityOf(sp); return `<span class="rbadge" style="--rc:${r.col}">${r.name}</span>`; };
import { VARIANTS, VARIANT_KEYS, variantLabel, canBeRare } from './variants.js';
import { WINGS, WING_BY_ID, aquariumOf, wingUsed, displayRefusal, reputation, dailyIncome, upkeep, visitors, completion, drawOf, DAY } from './aquarium.js';
import { loadBest, UPGRADES, UPGRADE_DESC, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat } from './economy.js';
import { RADIO, ready as contractReady } from './contracts.js';
import { TANKS, FINS, SUB_TIERS, SUB_ADDONS, SUPPLIES, GOODS, PATCH_PRICE, replacementPrice, priceOf, marketTick, money } from './economy.js';
import { formatTime } from './util.js';

import { VERSION } from './version.js';
const $ = (id) => document.getElementById(id);
const RUNLOG_KEY = 'earlDiver.runs.v1';

export class UI {
  constructor(h) {
    this.h = h;
    this.journalDirty = true;
    this.iconCache = new Map();
    $('play').addEventListener('click', () => h.onPlay());
    this.tab = 'species';
    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
      this.tab = b.dataset.tab;
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
      this.renderJournal();
    }));
    $('journal-close').addEventListener('click', () => this.toggleJournal(false));
    $('workshop-close').addEventListener('click', () => this.toggleWorkshop(false));
    this.shopTab = 'sell';
    document.querySelectorAll('.shop-tabs button').forEach((b) => b.addEventListener('click', () => {
      this.shopTab = b.dataset.shop;
      document.querySelectorAll('.shop-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      this.renderWorkshop();
    }));
    // one delegated handler for every button in the shop
    $('shop-body').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act, arg = b.dataset.arg;
      if (act === 'buy') h.onBuy(arg);
      else if (act === 'sellall') { const sale = h.onSellAll(); if (sale) this.showLedger(sale); }
      else if (act === 'display') h.onDisplay(arg);
      else if (act === 'sellitem') { const sale = h.onSellItem(arg); if (sale) this.showLedger(sale); }
      this.renderWorkshop();
    });
    $('show-controls').addEventListener('click', () => { const c = document.querySelector('#menu .controls'); c.hidden = !c.hidden; if (!c.hidden) $('runlog').hidden = true; });
    $('show-log').addEventListener('click', () => { const l = $('runlog'); l.hidden = !l.hidden; if (!l.hidden) document.querySelector('#menu .controls').hidden = true; });
    $('fullscreen').addEventListener('click', () => {
      const d = document;
      if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
      else (d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen() : Promise.reject()).catch(() => { $('fullscreen').textContent = 'Full screen: press F11'; });
    });
    document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
    $('restart').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onNewGame(); });
    // a tooltip for anything with a data-tip: what an upgrade or a piece of gear does
    const tip = $('tip');
    document.addEventListener('mouseover', (ev) => {
      const el = ev.target.closest && ev.target.closest('[data-tip]');
      if (!el) { tip.hidden = true; return; }
      tip.textContent = el.dataset.tip; tip.hidden = false;
    });
    document.addEventListener('mousemove', (ev) => {
      if (tip.hidden) return;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(window.innerWidth - w - 8, ev.clientX + 14) + 'px';
      tip.style.top = (ev.clientY + 18 + h > window.innerHeight ? ev.clientY - h - 10 : ev.clientY + 18) + 'px';
    });
    $('newgame').addEventListener('click', () => {
      if (!this.confirmNew) { this.confirmNew = true; $('newgame').textContent = 'Start over with nothing?'; return; }
      this.confirmNew = false; h.onNewGame();
    });
    $('resume').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); });
    $('quit').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onQuit(); });
    $('notes').addEventListener('input', (e) => { h.getGame().notes = e.target.value; });
    this.renderRuns();
    this.renderSave();
    document.querySelectorAll('.version').forEach((el) => { el.textContent = 'v' + VERSION; });
  }
  typing() { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT'); }
  blurTyping() { document.activeElement && document.activeElement.blur(); }
  anyOpen() { return !$('journal').hidden || !$('workshop').hidden; }
  closeAll() { this.toggleJournal(false); this.toggleWorkshop(false); }

  showGame() {
    $('menu').classList.add('gone');
    $('notes').value = '';
    this.journalDirty = true;
  }
  showMenu(last) {
    this.closeAll();
    $('menu').classList.remove('gone');
    this.setPaused(false);
    this.renderRuns(last);
    this.renderSave(last);
  }
  // the home screen: what is saved, and what the last death cost
  renderSave(last) {
    const p = this.h.getProfile && this.h.getProfile();
    const el = $('menu-save');
    $('play').textContent = p ? 'Dive again' : 'Dive';
    $('newgame').hidden = !p; $('newgame').textContent = 'New game'; this.confirmNew = false;
    const best = loadBest();
    if (!p) { el.innerHTML = best ? `<div class="save-line"><span>deepest ever ${best} m</span></div>` : ''; return; }
    let html = `<div class="save-line"><b>${money(p.cash, false)}</b><span>${p.runs || 1} dive${(p.runs || 1) > 1 ? 's' : ''}</span><span>deepest ${p.deepest || 0} m${best > (p.deepest || 0) ? ` (ever ${best} m)` : ''}</span><span>${(p.journal || []).length} species recorded</span>${p.aquarium && p.aquarium.wings.length ? `<span>aquarium ${completion(p).species}/${completion(p).of} species, ${completion(p).rare} rare</span>` : ''}</div>`;
    if (last && last.bill !== undefined) {
      const lost = last.lost && last.lost.length ? `Lost: ${last.lost.join(', ')}.` : '';
      html += `<div class="save-death">${last.cause}. ${last.bill > 0 ? `Hospital bill ${money(last.bill)}.` : ''} ${lost}</div>`;
    }
    el.innerHTML = html;
  }
  setPaused(p) { $('pause').hidden = !p; }

  toggleJournal(force) {
    const el = $('journal');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleWorkshop(false); this.renderJournal(); }
    else this.blurTyping();
  }
  toggleWorkshop(force) {
    const el = $('workshop');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.renderWorkshop(); }
  }

  renderJournal() {
    if ((this.tab || 'species') !== 'species') return this.renderJournalTab(this.tab);
    const g = this.h.getGame();
    $('journal-count').textContent = `${formatTime(g.survival)} into the dive · ${g.journal.size} of ${SPECIES_COUNT} recorded`;
    const list = $('journal-list');
    list.innerHTML = '';
    if (g.journal.size === 0) {
      list.innerHTML = '<p class="empty">Nothing recorded yet.<br>Swim close to a creature and press F to observe it.</p>';
      return;
    }
    const entries = [...g.journal.entries()].sort((a, b) => b[1].time - a[1].time);
    for (const [id, info] of entries) {
      const sp = SPECIES_BY_ID[id];
      const row = document.createElement('div');
      row.className = 'entry';
      let icon = this.iconCache.get(id);
      if (!icon) { icon = speciesIcon(sp, 160, 90); this.iconCache.set(id, icon); }
      const img = document.createElement('img');
      img.src = icon.toDataURL(); img.alt = sp.name;
      const txt = document.createElement('div');
      txt.innerHTML = `<h3>${sp.name} ${badge(sp)}</h3><div class="sci">${sp.sci}</div>
        <p>${sp.desc}</p>
        <div class="meta">Seen at ${info.depth} m · lives ${sp.dmin}–${sp.dmax} m · up to ${sp.size}</div>
        ${this.variantRow(sp)}`;
      row.append(img, txt);
      list.append(row);
    }
  }

  // six slots for the rare variants of a species: locked until a normal one is caught
  variantRow(sp) {
    const P = this.h.getProfile && this.h.getProfile();
    if (!P || !sp || !canBeRare(sp)) return '';
    const caught = (P.caught || []).includes(sp.id);
    const found = new Set(P.variants || []);
    if (!caught) return '<div class="variants locked">Rare forms: catch one first</div>';
    return `<div class="variants">${VARIANT_KEYS.map((k) => `<span class="${found.has(sp.id + ':' + k) ? 'got r-' + k : ''}" title="${VARIANTS[k].desc}">${VARIANTS[k].name}</span>`).join('')}</div>`;
  }

  // the details that used to crowd the screen live here
  renderJournalTab(tab) {
    const g = this.h.getGame(), list = $('journal-list');
    const row = (k, v, note = '') => `<div class="stat"><span>${k}${note ? `<br><small>${note}</small>` : ''}</span><b>${v}</b></div>`;
    if (tab === 'status') {
      const e = g.earl, ent = g.entity, sub = g.sub;
      const lvl = ['unhurt', 'grazed', 'wounded', 'badly hurt', 'critical'][Math.min(4, g.injury || 0)];
      const items = Object.entries(g.inv).filter(([, n]) => n > 0).map(([k, n]) => `${RESOURCES[k].name} ${n}`).join(', ') || 'nothing';
      $('journal-count').textContent = formatTime(g.survival) + ' into the dive';
      list.innerHTML =
        row('Cash', money(this.h.getProfile().cash), 'safe at the boat') +
        row('Deep sapphires found', `${g.sapphires}`, 'this dive') +
        row('Deepest so far', `${Math.round(e.maxDepth)} m`) +
        row('Condition', lvl) +
        row('The thing in the deep', ent.marked ? 'it has marked me' : 'unaware of me', ent.marked ? `calmed ${Math.round((ent.calm || 0) / 60 * 100)} % - free animals from nets, plant coral, give something back (G)` : '') +
        row('Submersible', sub.imploded ? 'lost' : `rated ${sub.rated} m`, sub.imploded ? 'a replacement can be bought at the boat' : `hull ${Math.round(sub.hull * 100)} %`) +
        row('Carrying', items) +
        row('Lures · necklaces', `${g.items.lure} · ${g.items.necklace}`);
    } else {
      $('journal-count').textContent = `${formatTime(g.survival)} into the dive`;
      const keys = [['W A S D / arrows', 'swim, steer the sub'], ['Shift', 'faster, more air (sub: ×1.5, air ×3)'], ['F', 'interact; hold to pry loose, cut nets, plant coral'], ['hold F', 'leave the submersible'], ['Mouse', 'hold left to swim to the cursor; the lamp follows it; right-click interacts; wheel zooms'], ['L', 'lights on / off (flash it at a charging animal)'], ['C · hold C', 'call the submersible to you · send it back to the boat'], ['1 · 2 · Space', 'net · slurp gun · use it (approach slowly, then sweep)'], ['3 · 4', 'tag gun · camera (aim with the mouse, Space to fire)'], ['5', 'traps: Space on the bottom sets one; F at its buoy hauls it up'], ['Space (in the sub)', 'the manipulator arm, once fitted: reach, then close the claw in the green'], ['Q / E', 'throw a lure / wear a necklace'], ['G', 'offer something back to the deep'], ['U', 'the boat: sell your haul, buy gear (at the boat)'], ['J', 'this journal'], ['Esc · M', 'pause · mute']];
      list.innerHTML = keys.map(([k, v]) => row(k, '', v)).join('');
    }
  }

  // ---------------- the boat ----------------
  renderWorkshop() {
    const g = this.h.getGame(), P = this.h.getProfile(), sub = g.sub;
    if (!P) return;
    marketTick(P);
    this.renderCounter($('shop-cash'), money(P.cash));
    $('shop-sub').textContent = sub.imploded ? 'No submersible' : `Submersible rated ${sub.rated} m · hull ${Math.round(sub.hull * 100)} %`;
    const can = (price) => P.cash + 1e-6 >= price;
    // a card: name, what it is, what it changes, and a price button
    const card = (name, desc, stat, price, act, arg, label, owned = '', img = '') => `
      <div class="card${img ? ' with-img' : ''}" data-tip="${String(desc).replace(/"/g, '&quot;')}">
        ${img ? `<img src="${img}" alt="">` : ''}
        <div class="card-txt"><h3>${name}</h3><p>${desc}</p>${stat ? `<div class="card-stat">${stat}</div>` : ''}${owned}</div>
        <button data-act="${act}" data-arg="${arg}" ${price !== null && !can(price) ? 'disabled' : ''}>${label}${price !== null ? `<span>${money(price, false)}</span>` : ''}</button>
      </div>`;
    const ladder = (n, i) => `<div class="ladder">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
    let html = '';
    const tab = this.shopTab;
    const icon = (k, t) => { const key = k + t; if (!this.toolImgs) this.toolImgs = new Map(); if (!this.toolImgs.has(key)) this.toolImgs.set(key, toolIcon(k, t, 240, 120).toDataURL()); return this.toolImgs.get(key); };
    if (tab === 'sell' && g.frenzy && g.frenzy.id === 'market') html += `<p class="frenzy-note">Market frenzy: everything sells for double for ${Math.ceil(g.frenzy.t)} more seconds</p>`;
    if (tab === 'sell') {
      const rows = Object.entries(g.inv).filter(([k, n]) => n > 0 && GOODS[k]);
      const atBoat = !sub.imploded && Math.hypot(sub.x - 520.5, sub.y - 2.6) < 20;
      const specs = g.bag.concat(atBoat ? g.subTank : []);
      if (!rows.length && !specs.length && !g.tags.length && !g.photos.length && !g.items.lure && !g.items.necklace) {
        html = `<p class="shop-empty">Nothing aboard to sell.</p>`;
      } else {
        let total = 0;
        let lines = rows.map(([k, n]) => {
          const base = GOODS[k].price, now = priceOf(P, k, base);
          // what n of them fetch, each a little less than the last
          let sum = 0, glut = P.market[k] || 0;
          for (let i = 0; i < n; i++) { sum += base * Math.pow(0.85, glut / 0.15); glut += 0.15; }
          total += sum;
          const flooded = now < base * 0.97 ? `<em>market flooded −${Math.round((1 - now / base) * 100)} %</em>` : '';
          return `<tr><td>${GOODS[k].name}</td><td>${n}</td><td>${money(now)} ${flooded}</td><td>${money(sum)}</td></tr>`;
        }).join('');
        // live animals, grouped by species
        const groups = new Map();
        for (const sp of specs) { const k = sp.id + ':' + (sp.variant || ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(sp); }
        let specRows = '';
        for (const [gk, list] of groups) {
          const [id, v] = gk.split(':');
          const mkey = 'sp' + id + (v ? ':' + v : '');
          const each = list.reduce((a, x) => a + specimenValue(x), 0) / list.length;
          let sum = 0, glut = P.market[mkey] || 0;
          for (let i = 0; i < list.length; i++) { sum += each * Math.pow(0.85, glut / 0.15); glut += 0.15; }
          total += sum;
          const worst = list.reduce((a, x) => Math.min(a, x.cond), 1);
          const cond = `<em class="cond c-${conditionName(worst)}">${conditionName(worst)}</em>`;
          const best = list.reduce((a, x) => (x.cond > a.cond ? x : a), list[0]);
          const why = displayRefusal(P, best);
          const disp = why ? `<em class="disp-no">${why}</em>` : `<button class="disp" data-act="display" data-arg="${gk.replace(/:$/, '')}">Keep for the aquarium</button>`;
          specRows += `<tr><td>${this.mini(SPECIES_BY_ID[id])}${v ? `<span class="rare r-${v}">${VARIANTS[v].name}</span> ` : ''}${SPECIES_BY_ID[id].name} ${badge(SPECIES_BY_ID[id])} ${cond}</td><td>${list.length}</td><td>${money(priceOf(P, mkey, each))}</td><td>${money(sum)}</td></tr><tr class="sub"><td colspan="4">${disp}</td></tr>`;
        }
        // survey work: tags (each species' tags pay less each time) and first photographs
        const tg = new Map();
        for (const t of g.tags) { if (!tg.has(t.key)) tg.set(t.key, []); tg.get(t.key).push(t); }
        for (const [k, list] of tg) {
          let sum = 0, glut = P.market[k] || 0;
          for (let i = 0; i < list.length; i++) { sum += list[0].value * Math.pow(0.85, glut / 0.15); glut += 0.15; }
          total += sum;
          specRows += `<tr><td>Tag data: ${list[0].name}</td><td>${list.length}</td><td>${money(priceOf(P, k, list[0].value))}</td><td>${money(sum)}</td></tr>`;
        }
        for (const ph of g.photos) { total += ph.value; specRows += `<tr><td>Photograph: ${ph.name}</td><td>1</td><td>${money(ph.value)}</td><td>${money(ph.value)}</td></tr>`; }
        lines = specRows + lines;
        if (!atBoat && g.subTank.length) html += `<p class="shop-note">${g.subTank.length} animal${g.subTank.length > 1 ? 's' : ''} in the sub's tank. Bring the sub to the boat to sell them.</p>`;
        if (rows.length || specs.length || g.tags.length || g.photos.length) html += `<table class="manifest"><thead><tr><th>Item</th><th>Qty</th><th>Each</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>
          <button class="primary" data-act="sellall">Load the basket and sell<span>${money(total)}</span></button>`;
        for (const k of ['lure', 'necklace']) if (g.items[k]) html += card(GOODS[k].name, `You are carrying ${g.items[k]}. Someone on the radio collects these.`, '', null, 'sellitem', k, `Sell one · ${money(priceOf(P, k, GOODS[k].price), false)}`);
      }
    } else if (tab === 'diver') {
      html += this.upgradeGroups(P, ['Diver', 'Net', 'Slurp gun', 'Tag gun', 'Camera'], icon, can);
      if (!(P.addons || {}).canisters) html += card(CANISTERS.name, CANISTERS.desc, 'for the bag and the sub tank', CANISTERS.price, 'buy', 'canisters', 'Buy');
    } else if (tab === 'sub') {
      if (sub.imploded) {
        html += card('A replacement submersible', 'The old one is on the bottom somewhere, in pieces. The yard has another, built to the same rating.', `rated ${sub.rated} m`, replacementPrice(P), 'buy', 'replace', 'Buy');
      } else {
        html += `<p class="shop-note">Rated ${sub.rated} m: deeper, the cabin air leaks away faster and faster · hull ${Math.round(sub.hull * 100)} %</p>`;
        if (sub.hull < 0.999) html += card('Patch the hull', 'Weld plates over the worst of it. A damaged hull leaks air.', `integrity ${Math.round(sub.hull * 100)} % → <b>${Math.round(Math.min(1, sub.hull + 0.4) * 100)} %</b>`, PATCH_PRICE, 'buy', 'patch', 'Patch');
        html += this.upgradeGroups(P, ['Submersible', 'Claw'], icon, can);
        for (const [k, a] of Object.entries(SUB_ADDONS)) if (!(P.addons || {})[k]) html += card(a.name, a.desc, '', a.price, 'buy', k, 'Fit');
        const fitted = Object.entries(SUB_ADDONS).filter(([k]) => (P.addons || {})[k]).map(([, a]) => a.name.toLowerCase());
        if (fitted.length) html += `<p class="shop-note">Fitted: ${fitted.join(', ')}.</p>`;
      }
    } else if (tab === 'supplies') {
      const tr = P.traps || {};
      for (const [k, T, act] of [['pot', TRAPS.pot, 'pot'], ['deep', TRAPS.deep, 'deeptrap']]) {
        const have = tr[k] || 0, full = have >= T.max;
        html += card(T.name, T.desc + ` Holds ${T.holds}; checks every minute or so.`, `you own ${have} / ${T.max}`, full ? null : T.price, 'buy', act, full ? 'Full' : 'Buy', '', icon('trap', k === 'pot' ? 0 : 1));
      }
      for (const [k, it] of Object.entries(SUPPLIES)) {
        const full = g.items[k] >= it.max;
        html += card(it.name, it.desc, `carrying ${g.items[k]} / ${it.max}`, full ? null : it.price, 'buy', k, full ? 'Full' : 'Buy');
      }
    } else if (tab === 'radio') {
      const lists = [g.bag].concat(!sub.imploded && Math.hypot(sub.x - 520.5, sub.y - 2.6) < 20 ? [g.subTank] : []);
      if (!g.contracts.length) html += '<p class="shop-empty">Static. Nobody is calling.</p>';
      for (const c of g.contracts) {
        const r = contractReady(g, c, lists);
        html += `<div class="contract${r ? ' ready' : ''}">${c.id ? this.mini(SPECIES_BY_ID[c.id]) : ''}<div><span>${c.who} wants</span><b>${c.text}</b></div><div class="pay">${money(c.pay)}${r ? '<em>aboard: paid when you sell</em>' : ''}</div></div>`;
      }
      if (!P.radio) html += card(RADIO.name, RADIO.desc, '5 contracts at a time', RADIO.price, 'buy', 'radio', 'Buy');
      html += '<p class="shop-note">Contracts are filled when you sell (Sell, then Load the basket). A new dive brings new calls.</p>';
    } else if (tab === 'aquarium') {
      const A = aquariumOf(P), C = completion(P);
      const net = dailyIncome(P) - upkeep(P);
      html += `<div class="aq-head"><div><b>${C.species}</b><span>of ${C.of} species</span></div><div><b>${C.rare}</b><span>rare forms</span></div><div><b>${A.wings.length ? visitors(P) : 0}</b><span>visitors a day</span></div><div><b class="${net < 0 ? 'neg' : ''}">${A.wings.length ? money(net, false) : '—'}</b><span>a day after upkeep</span></div></div>`;
      if (!A.wings.length) html += `<p class="shop-empty">An empty plot on the shore. Build the first wing, then keep live animals here instead of selling them: one of every species, and every rare form. Visitors pay every day (every ${DAY / 60} minutes of diving).</p>`;
      const next = WINGS.find((w) => !A.wings.includes(w.id));
      for (const w of WINGS) {
        if (!A.wings.includes(w.id)) continue;
        const shown = Object.entries(A.display).filter(([, d]) => d.wing === w.id);
        const cells = shown.map(([, d]) => {
          const sp = SPECIES_BY_ID[d.id];
          const key = 'aq' + d.id;
          if (!this.toolImgs) this.toolImgs = new Map();
          if (!this.toolImgs.has(key)) this.toolImgs.set(key, speciesIcon(sp, 120, 68).toDataURL());
          return `<div class="tank-cell" style="border-color:${rarityOf(sp).col}" title="${variantLabel(sp, d.variant)} · draws ${Math.round(drawOf(d))}"><img src="${this.toolImgs.get(key)}" alt="">${d.variant ? `<i class="r-${d.variant}">${VARIANTS[d.variant].name}</i>` : ''}<span>${sp.name}</span></div>`;
        }).join('') + Array.from({ length: w.slots - shown.length }, () => '<div class="tank-cell empty"></div>').join('');
        html += `<div class="wing"><div class="wing-h"><b>${w.name}</b><em>${shown.length}/${w.slots} · upkeep ${money(w.upkeep, false)}/day</em></div><div class="tanks">${cells}</div></div>`;
      }
      if (next) html += card(`Build: ${next.name}`, next.desc, `${next.slots} tanks · upkeep ${money(next.upkeep, false)} a day`, next.price, 'buy', 'wing:' + next.id, 'Build');
      else html += '<p class="shop-note">Every wing is built.</p>';
      if (A.lastDay) html += `<p class="shop-note">Yesterday: ${A.lastDay.visitors} visitors, ${money(A.lastDay.income, false)} in tickets, ${money(A.lastDay.cost, false)} upkeep. Earned so far: ${money(A.earned, false)}.</p>`;
    }
    $('shop-body').innerHTML = html;
  }

  // a small picture of an animal, cached
  mini(sp) {
    if (!sp) return '';
    if (!this.toolImgs) this.toolImgs = new Map();
    const key = 'mini' + sp.id;
    if (!this.toolImgs.has(key)) this.toolImgs.set(key, speciesIcon(sp, 140, 78).toDataURL());
    return `<img class="mini" src="${this.toolImgs.get(key)}" alt="">`;
  }

  // A mechanical counter: each digit on its own drum; drums whose digit changed roll into place.
  renderCounter(el, text) {
    const prev = el.dataset.v || '';
    if (prev === text && el.children.length) return;
    el.dataset.v = text;
    const pad = prev.padStart(text.length, ' ');
    el.innerHTML = [...text].map((ch, i) => /\d/.test(ch)
      ? `<span class="drum${pad[i] !== ch && prev ? ' roll' : ''}">${ch}</span>`
      : `<span class="sep">${ch}</span>`).join('');
  }

  // Upgrade rows, grouped: each stat on one line with what it is now, what the next level makes it,
  // its level and the price. Gear not yet owned shows as a card to buy it first.
  upgradeGroups(P, groups, icon, can) {
    const GEAR_OF = { 'Slurp gun': 'slurp', 'Tag gun': 'tagger', 'Camera': 'camera', 'Claw': 'arm' };
    const ICON_OF = { 'Net': ['net', gear(P, 'net').look], 'Slurp gun': ['slurp', 0], 'Tag gun': ['tag', 0], 'Camera': ['cam', 0] };
    let html = '';
    for (const grp of groups) {
      const gk = GEAR_OF[grp];
      html += `<div class="up-group"><h4>${grp}</h4>`;
      if (gk && !owns(P, gk)) {
        const G = GEAR[gk], ic = ICON_OF[grp];
        html += `<div class="card${ic ? ' with-img' : ''}" data-tip="${G.desc}">${ic ? `<img src="${icon(ic[0], ic[1])}" alt="">` : ''}<div class="card-txt"><h3>${G.name}</h3><p>${G.desc}</p></div>
          <button data-act="buy" data-arg="gear:${gk}" ${can(G.price) ? '' : 'disabled'}>Buy<span>${money(G.price)}</span></button></div></div>`;
        continue;
      }
      for (const [id, U] of Object.entries(UPGRADES)) {
        if (U.group !== grp) continue;
        const l = lv(P, id), maxed = l >= U.max, cost = upgradeCost(P, id);
        const now = fmtStat(id, statValue(P, id)), next = maxed ? '' : fmtStat(id, statValue(P, id) + U.step);
        html += `<div class="up-row" data-tip="${UPGRADE_DESC[id] || ''}"><span class="up-name">${U.name}</span><span class="up-val">${now}${maxed ? '' : ` <i>→</i> <b>${next}</b>`}</span>
          <span class="up-lv"><span class="lamps">${Array.from({ length: 10 }, (_, k) => `<i class="${k < Math.round(l / U.max * 10) ? 'lit' : ''}"></i>`).join('')}</span>${maxed ? 'max' : `lv ${l}`}</span>
          <button data-act="buy" data-arg="up:${id}" ${maxed || !can(cost) ? 'disabled' : ''}>${maxed ? '—' : money(cost)}</button></div>`;
      }
      if (gk === 'camera' && !owns(P, 'lowlight')) html += `<div class="up-row" data-tip="${GEAR.lowlight.desc}"><span class="up-name">${GEAR.lowlight.name}</span><span class="up-val">no flash</span><span class="up-lv"></span><button data-act="buy" data-arg="gear:lowlight" ${can(GEAR.lowlight.price) ? '' : 'disabled'}>${money(GEAR.lowlight.price)}</button></div>`;
      html += '</div>';
    }
    return html;
  }

  // The ledger slip: the sale typed out line by line, then the total.
  showLedger(sale) {
    const el = $('ledger');
    clearInterval(this.ledgerTimer);
    el.hidden = false; el.classList.remove('done');
    const d = new Date();
    const head = `<div class="slip-head">BAYSIDE MARINE BUYERS<br><small>receipt · ${d.toLocaleDateString()} ${d.toTimeString().slice(0, 5)}</small></div>`;
    const lines = sale.lines.map((l) => `<div class="slip-line"><span>${l.n > 1 ? l.n + ' × ' : ''}${l.label}</span><b>${money(l.total)}</b></div>`);
    lines.push(`<div class="slip-total"><span>Total</span><b>${money(sale.total)}</b></div><div class="slip-stamp">PAID</div>`);
    el.innerHTML = head;
    let i = 0;
    const g = this.h.getGame();
    this.ledgerTimer = setInterval(() => {
      if (i >= lines.length) { clearInterval(this.ledgerTimer); el.classList.add('done'); return; }
      el.insertAdjacentHTML('beforeend', lines[i++]);
      el.lastElementChild.classList.add('typed');
      g.audio && g.audio.ready && g.audio.click && g.audio.click();
    }, 140);
    clearTimeout(this.ledgerHide);
    this.ledgerHide = setTimeout(() => { el.hidden = true; }, 6000 + lines.length * 140);
  }

  saveRun(log) {
    let runs = [];
    try { runs = JSON.parse(localStorage.getItem(RUNLOG_KEY) || '[]'); } catch (e) { runs = []; }
    runs.unshift(log);
    runs = runs.slice(0, 12);
    try { localStorage.setItem(RUNLOG_KEY, JSON.stringify(runs)); } catch (e) { /* storage unavailable */ }
    this.runs = runs;
  }
  renderRuns(last) {
    let runs = this.runs;
    if (!runs) { try { runs = JSON.parse(localStorage.getItem(RUNLOG_KEY) || '[]'); } catch (e) { runs = []; } }
    this.runs = runs;
    const el = $('runlog');
    $('show-log').hidden = !runs.length; // the log is folded away behind its link
    if (!runs.length) { el.innerHTML = ''; return; }
    const rows = runs.slice(0, 6).map((r, i) => `
      <tr class="${i === 0 && last ? 'latest' : ''}">
        <td>${formatTime(r.survived)}</td><td>${r.cause}</td><td>${r.maxDepth} m</td><td>${r.earned !== undefined ? money(r.earned) : '—'}</td>
      </tr>`).join('');
    el.innerHTML = `<h2>Dive log</h2><table><thead><tr><th>Lasted</th><th>Ended</th><th>Deepest</th><th>Sold</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  update(g, dt) {
    if (!$('journal').hidden && this.journalDirty) { this.journalDirty = false; this.renderJournal(); }
    if (!$('workshop').hidden) {
      const e = g.earl;
      if (Math.abs(e.x - 512) > 16 || e.y > 5) this.toggleWorkshop(false);
    }
  }
}
