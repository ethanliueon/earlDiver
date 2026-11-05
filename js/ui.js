// DOM overlays: home screen, journal, boat workshop, pause, run log.
import { SPECIES_BY_ID, SPECIES } from './species.js';
const SPECIES_COUNT = SPECIES.length;
import { speciesIcon } from './creatures_draw.js';
import { RESOURCES } from './world.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS } from './economy.js';
import { toolIcon } from './tools_draw.js';
import { specimenValue, conditionName } from './specimens.js';
import { VARIANTS, VARIANT_KEYS, variantLabel } from './variants.js';
import { TANKS, FINS, SUB_TIERS, SUB_ADDONS, SUPPLIES, GOODS, PATCH_PRICE, replacementPrice, priceOf, marketTick, money } from './economy.js';
import { formatTime } from './util.js';

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
      this.shopTab = b.dataset.shop; this.confirmSeason = false;
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
      else if (act === 'sellitem') { const sale = h.onSellItem(arg); if (sale) this.showLedger(sale); }
      else if (act === 'season') {
        if (!this.confirmSeason) { this.confirmSeason = true; }
        else { this.confirmSeason = false; const sale = h.onEndSeason(); this.toggleWorkshop(false); if (sale) { this.toggleWorkshop(true); this.showLedger(sale); } }
      }
      this.renderWorkshop();
    });
    $('newgame').addEventListener('click', () => {
      if (!this.confirmNew) { this.confirmNew = true; $('newgame').textContent = 'Erase the save and start over?'; return; }
      this.confirmNew = false; h.onNewGame();
    });
    $('resume').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); });
    $('quit').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onQuit(); });
    $('notes').addEventListener('input', (e) => { h.getGame().notes = e.target.value; });
    this.renderRuns();
    this.renderSave();
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
    $('play').textContent = p ? 'Continue' : 'Dive';
    $('newgame').hidden = !p; $('newgame').textContent = 'New game'; this.confirmNew = false;
    if (!p) { el.innerHTML = ''; return; }
    let html = `<div class="save-line"><b>${money(p.cash, false)}</b><span>season ${p.seasons || 1}</span><span>deepest ${p.deepest || 0} m</span><span>${(p.journal || []).length} species recorded</span></div>`;
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
      txt.innerHTML = `<h3>${sp.name}</h3><div class="sci">${sp.sci}</div>
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
    if (!P || !sp || sp.v.hab === 'plant') return '';
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
        row('Deep sapphires found', `${g.sapphires}`, 'this season') +
        row('Deepest so far', `${Math.round(e.maxDepth)} m`) +
        row('Condition', lvl) +
        row('The thing in the deep', ent.marked ? 'it has marked me' : 'unaware of me', ent.marked ? `calmed ${Math.round((ent.calm || 0) / 60 * 100)} % - free animals from nets, plant coral, give something back (G)` : '') +
        row('Submersible', sub.imploded ? 'lost' : `rated ${sub.rated} m`, sub.imploded ? 'a replacement can be bought at the boat' : `hull ${Math.round(sub.hull * 100)} %`) +
        row('Carrying', items) +
        row('Lures · necklaces', `${g.items.lure} · ${g.items.necklace}`);
    } else {
      $('journal-count').textContent = `${formatTime(g.survival)} into the dive`;
      const keys = [['W A S D / arrows', 'swim, steer the sub'], ['Shift', 'faster, more air (sub: ×1.5, air ×3)'], ['F', 'interact; hold to pry loose, cut nets, plant coral'], ['hold F', 'leave the submersible'], ['Mouse', 'hold left to swim to the cursor; the lamp follows it; right-click interacts; wheel zooms'], ['L', 'lights on / off (flash it at a charging animal)'], ['C · hold C', 'call the submersible to you · send it back to the boat'], ['1 · 2 · Space', 'net · slurp gun · use it (approach slowly, then sweep)'], ['3 · 4', 'tag gun · camera (aim with the mouse, Space to fire)'], ['Q / E', 'throw a lure / wear a necklace'], ['G', 'offer something back to the deep'], ['U', 'the boat: sell your haul, buy gear (at the boat)'], ['J', 'this journal'], ['Esc · M', 'pause · mute']];
      list.innerHTML = keys.map(([k, v]) => row(k, '', v)).join('');
    }
  }

  // ---------------- the boat ----------------
  renderWorkshop() {
    const g = this.h.getGame(), P = this.h.getProfile(), sub = g.sub;
    if (!P) return;
    marketTick(P);
    $('shop-cash').textContent = money(P.cash);
    $('shop-sub').textContent = sub.imploded ? 'No submersible' : `Submersible rated ${sub.rated} m · hull ${Math.round(sub.hull * 100)} %`;
    const can = (price) => P.cash + 1e-6 >= price;
    // a card: name, what it is, what it changes, and a price button
    const card = (name, desc, stat, price, act, arg, label, owned = '', img = '') => `
      <div class="card${img ? ' with-img' : ''}">
        ${img ? `<img src="${img}" alt="">` : ''}
        <div class="card-txt"><h3>${name}</h3><p>${desc}</p>${stat ? `<div class="card-stat">${stat}</div>` : ''}${owned}</div>
        <button data-act="${act}" data-arg="${arg}" ${price !== null && !can(price) ? 'disabled' : ''}>${label}${price !== null ? `<span>${money(price, false)}</span>` : ''}</button>
      </div>`;
    const ladder = (n, i) => `<div class="ladder">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
    let html = '';
    const tab = this.shopTab;
    const icon = (k, t) => { const key = k + t; if (!this.toolImgs) this.toolImgs = new Map(); if (!this.toolImgs.has(key)) this.toolImgs.set(key, toolIcon(k, t, 240, 120).toDataURL()); return this.toolImgs.get(key); };
    if (tab === 'sell') {
      const rows = Object.entries(g.inv).filter(([k, n]) => n > 0 && GOODS[k]);
      const atBoat = !sub.imploded && Math.hypot(sub.x - 520.5, sub.y - 2.6) < 20;
      const specs = g.bag.concat(atBoat ? g.subTank : []);
      if (!rows.length && !specs.length && !g.tags.length && !g.photos.length && !g.items.lure && !g.items.necklace) {
        html = `<p class="shop-empty">Nothing aboard to sell.<br>The aquarium buyer pays for live animals (1 · 2 · Space). Clams and mussels in the shallows, scrap on the wrecks, ink and glass sponge further down — and in the deep, sapphires.</p>`;
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
          specRows += `<tr><td>${v ? `<span class="rare r-${v}">${VARIANTS[v].name}</span> ` : ''}${SPECIES_BY_ID[id].name} ${cond}</td><td>${list.length}</td><td>${money(priceOf(P, mkey, each))}</td><td>${money(sum)}</td></tr>`;
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
      const t = TANKS[P.tank], tn = TANKS[P.tank + 1];
      html += `<div class="owned"><span>Tank</span><b>${t.name}</b><em>${t.air} s of air</em>${ladder(TANKS.length, P.tank)}</div>`;
      html += tn ? card(tn.name, tn.desc, `${t.air} s → <b>${tn.air} s</b> of air`, tn.price, 'buy', 'tank', 'Buy') : '<p class="shop-empty">The best tank there is.</p>';
      // catching gear
      const nt = NETS[P.net || 0], nn = NETS[(P.net || 0) + 1];
      const st = (d) => `reach ${d.range} m · ${d.time} s · up to ${Math.round(d.maxLen * 100)} cm · ${Math.round(d.success * 100)} % · harm −${Math.round(d.harm * 100)} %`;
      html += `<div class="owned"><span>Net</span><b>${nt.name}</b><em>${st(nt)}</em>${ladder(NETS.length, P.net || 0)}</div>`;
      if (nn) html += card(nn.name, nn.desc, st(nn), nn.price, 'buy', 'net', 'Buy', '', icon('net', P.net + 1));
      const sl = (P.slurp ?? -1), sn = SLURPS[sl + 1];
      if (sl >= 0) html += `<div class="owned"><span>Slurp</span><b>${SLURPS[sl].name}</b><em>${st(SLURPS[sl])}</em>${ladder(SLURPS.length, sl)}</div>`;
      if (sn) html += card(sn.name, sn.desc, st(sn), sn.price, 'buy', 'slurp', 'Buy', '', icon('slurp', sl + 1));
      const tgi = P.tagger ?? -1, tgn = TAGGERS[tgi + 1];
      const tst = (d) => `reach ${d.range} m · reload ${d.time} s · a miss provokes ${Math.round(d.provoke * 100)} %${d.pay > 1 ? ' · pays ×' + d.pay : ''}`;
      if (tgi >= 0) html += `<div class="owned"><span>Tags</span><b>${TAGGERS[tgi].name}</b><em>${tst(TAGGERS[tgi])}</em>${ladder(TAGGERS.length, tgi)}</div>`;
      if (tgn) html += card(tgn.name, tgn.desc + ' For sharks, billfish, whales and anything too big for a net.', tst(tgn), tgn.price, 'buy', 'tagger', 'Buy', '', icon('tag', tgi + 1));
      const cmi = P.camera ?? -1, cmn = CAMERAS[cmi + 1];
      const cst = (d) => `${d.range} m · ${d.shots} shots a dive · ${d.flash ? 'flash (seen in the deep)' : 'no flash'}`;
      if (cmi >= 0) html += `<div class="owned"><span>Camera</span><b>${CAMERAS[cmi].name}</b><em>${cst(CAMERAS[cmi])}</em>${ladder(CAMERAS.length, cmi)}</div>`;
      if (cmn) html += card(cmn.name, cmn.desc + ' The institute pays for the first photograph of every species and every rare form.', cst(cmn), cmn.price, 'buy', 'camera', 'Buy', '', icon('cam', cmi + 1));
      const bg = BAGS[P.bag || 0], bn = BAGS[(P.bag || 0) + 1];
      html += `<div class="owned"><span>Bag</span><b>${bg.name}</b><em>${bg.slots} animals</em>${ladder(BAGS.length, P.bag || 0)}</div>`;
      if (bn) html += card(bn.name, bn.desc, `${bg.slots} → <b>${bn.slots}</b> animals`, bn.price, 'buy', 'bag', 'Buy');
      if (!(P.addons || {}).canisters) html += card(CANISTERS.name, CANISTERS.desc, 'for the bag and the sub tank', CANISTERS.price, 'buy', 'canisters', 'Buy');
      const f = FINS[P.fins], fnx = FINS[P.fins + 1];
      html += `<div class="owned"><span>Fins</span><b>${f.name}</b><em>×${f.speed.toFixed(2)} speed</em>${ladder(FINS.length, P.fins)}</div>`;
      html += fnx ? card(fnx.name, fnx.desc, `×${f.speed.toFixed(2)} → <b>×${fnx.speed.toFixed(2)}</b> swimming speed`, fnx.price, 'buy', 'fins', 'Buy') : '<p class="shop-empty">No faster fins exist.</p>';
    } else if (tab === 'sub') {
      if (sub.imploded) {
        html += card('A replacement submersible', 'The old one is on the bottom somewhere, in pieces. The yard has another, rated the same.', `rated ${sub.rated} m`, replacementPrice(sub.level), 'buy', 'replace', 'Buy');
      } else {
        const next = SUB_TIERS[sub.level + 1];
        html += `<div class="owned"><span>Hull</span><b>Rated ${sub.rated} m</b><em>implodes past ${Math.round(sub.rated * 1.3)} m · ${sub.o2Max} s cabin air</em>${ladder(SUB_TIERS.length, sub.level)}</div>`;
        html += next ? card(`Refit: rated ${next.rated} m`, 'A thicker pressure sphere, new seals and a bigger air bank. Includes a new hull.', `${sub.rated} m → <b>${next.rated} m</b> · air ${sub.o2Max} s → <b>${next.o2} s</b>`, next.price, 'buy', 'sub', 'Refit') : '<p class="shop-empty">Rated to the bottom of this ocean. Nothing more can be done for her.</p>';
        const tk = SUB_TANKS[P.subTank || 0], tn2 = SUB_TANKS[(P.subTank || 0) + 1];
        html += `<div class="owned"><span>Tank</span><b>Specimen tank</b><em>${tk.slots} animals · no stress</em>${ladder(SUB_TANKS.length, P.subTank || 0)}</div>`;
        if (tn2) html += card('Bigger specimen tank', 'A larger aerated tank behind the pilot. Animals keep in it without losing condition.', `${tk.slots} → <b>${tn2.slots}</b> animals`, tn2.price, 'buy', 'subtank', 'Buy');
        for (const [k, a] of Object.entries(SUB_ADDONS)) if (!(P.addons || {})[k]) html += card(a.name, a.desc, '', a.price, 'buy', k, 'Fit');
        const fitted = Object.entries(SUB_ADDONS).filter(([k]) => (P.addons || {})[k]).map(([, a]) => a.name.toLowerCase());
        if (fitted.length) html += `<p class="shop-note">Fitted: ${fitted.join(', ')}.</p>`;
        if (sub.hull < 0.999) html += card('Patch the hull', 'Weld plates over the worst of it. A damaged hull leaks air.', `integrity ${Math.round(sub.hull * 100)} % → <b>${Math.round(Math.min(1, sub.hull + 0.4) * 100)} %</b>`, PATCH_PRICE, 'buy', 'patch', 'Patch');
      }
    } else if (tab === 'supplies') {
      for (const [k, it] of Object.entries(SUPPLIES)) {
        const full = g.items[k] >= it.max;
        html += card(it.name, it.desc, `carrying ${g.items[k]} / ${it.max}`, full ? null : it.price, 'buy', k, full ? 'Full' : 'Buy');
      }
    } else if (tab === 'season') {
      html += `<div class="season"><p>Every season the sea is new: fresh wrecks to strip, clams and pearls, sapphires in new places. What you take in a season does not come back until the next one.</p>
        <p>Ending the season sells what is aboard and starts a new one. Nothing is lost.</p>
        <button class="${this.confirmSeason ? 'warn' : 'primary'}" data-act="season">${this.confirmSeason ? 'Sure? Click again to end the season' : `End season ${P.seasons || 1}`}</button></div>`;
    }
    $('shop-body').innerHTML = html;
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
