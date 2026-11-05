// DOM overlays: home screen, journal, boat workshop, pause, run log.
import { SPECIES_BY_ID, SPECIES } from './species.js';
const SPECIES_COUNT = SPECIES.length;
import { speciesIcon } from './creatures_draw.js';
import { RESOURCES, BOAT } from './world.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS, TRAPS } from './economy.js';
import { toolIcon } from './tools_draw.js';
import { specimenValue, conditionName, rarityOf } from './specimens.js';
const badge = (sp) => { const r = rarityOf(sp); return `<span class="rbadge" style="--rc:${r.col}">${r.name}</span>`; };
import { VARIANTS, VARIANT_KEYS, variantLabel, canBeRare } from './variants.js';
import { WINGS, WING_BY_ID, aquariumOf, wingUsed, displayRefusal, reputation, dailyIncome, upkeep, visitors, completion, drawOf, DAY } from './aquarium.js';
import { SUITS } from './economy.js';
import { WARES, upgradeCoins } from './economy.js';
import { TankRoom } from './tankroom.js';
import { TRAP_ORDER } from './economy.js';
import { trapsFree } from './traps.js';
import { tankSlots, pressSlots, tankUsed, pressUsed } from './capture.js';
import { loadBest, UPGRADES, UPGRADE_DESC, UPGRADE_LINE, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat } from './economy.js';
import { RADIO, ready as contractReady } from './contracts.js';
import { TANKS, FINS, SUB_TIERS, SUB_ADDONS, SUPPLIES, supplyMax, GOODS, PATCH_PRICE, replacementPrice, priceOf, marketTick, money } from './economy.js';
import { formatTime } from './util.js';
import { VERSION } from './version.js';
import { markOf, SUB_MARKS } from './earl_draw.js';


// the figures for the shop's cards, as dot points
const ADDON_SPECS = {
  recall: [['use', 'C calls the sub'], ['sub comes', '1.5× faster', 'good']],
  quiet: [['sub noise', '−50 %', 'good'], ['the deep', 'hears it less', 'good']],
};
const SUPPLY_SPECS = {
  lure: [['use', 'Q throws it'], ['effect', 'the deep thing follows its light', 'good'], ['lasts', 'a while']],
  necklace: [['use', 'E wears it'], ['effect', 'keeps it away', 'good'], ['lasts', '15 s']],
  sealant: [['use', 'K, inside the sub'], ['work', '6 s'], ['hull', '+20 %', 'good'], ['only up to', '85 %', 'bad']],
  plate: [['use', 'hold F outside, at the hatch'], ['work', '10 s of welding'], ['hull', '+40 %, to full', 'good'], ['the arc', 'draws attention below 200 m', 'bad']],
  airTank: [['use', 'R, in the sub'], ['effect', 'cabin air to full', 'good'], ['rack', 'one to start; can be enlarged']],
};
const GEAR_SPECS = {
  slurp: [['key', '2'], ['catches', 'small fish, even fast ones', 'good']],
  tagger: [['key', '3'], ['tags', 'sharks, billfish, whales'], ['pays', 'per tag, less each time']],
  camera: [['key', '4'], ['pays', 'first photo of each species and rare form', 'good']],
  arm: [['use', 'Space, from inside the sub'], ['catches', 'time the grip']],
};
const $ = (id) => document.getElementById(id);
const COIN = '<i class="coin"></i>';
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
    $('cave-close').addEventListener('click', () => this.toggleCave(false));
    this.caveTab = 'trade';
    this.tankRoom = new TankRoom($('tankroom'), { act: (a2, w, i, to) => h.onTank(a2, w, i, to), getGame: () => h.getGame(), close: () => this.toggleTank(false) });
    this.caveSel = new Set();
    $('cave-body').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cave]');
      if (!b) { const i = ev.target.closest('button.info'); if (i) this.toggleInfo(i.closest('[data-row]')); return; }
      if (b.disabled) return;
      const k = b.dataset.cave;
      if (k.startsWith('tab:')) this.caveTab = k.slice(4);
      else if (k.startsWith('ware:')) h.onWare(k.slice(5));
      else if (k === '!trade') { h.onCaveTrade([...this.caveSel]); this.caveSel.clear(); }
      else if (this.caveSel.has(k)) this.caveSel.delete(k); else this.caveSel.add(k);
      this.renderCave();
    });
    this.shopTab = 'sell';
    this.openRows = new Set(); // shop rows whose details are open
    // I: the spec sheet of the row under the pointer (or, with none, every row on the page)
    this.hoverRow = null;
    document.addEventListener('mouseover', (ev) => { this.hoverRow = ev.target.closest ? ev.target.closest('.shop [data-row]') : null; });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'i' && e.key !== 'I') return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const box = [$('shop-body'), $('cave-body')].find((el) => el && !el.closest('section').hidden);
      if (!box) return;
      if (this.hoverRow && box.contains(this.hoverRow)) { this.toggleInfo(this.hoverRow); return; }
      const rows = [...box.querySelectorAll('[data-row]')], anyClosed = rows.some((r) => !r.classList.contains('open'));
      for (const r of rows) if (r.classList.contains('open') !== anyClosed) this.toggleInfo(r);
    });
    document.querySelectorAll('.shop-tabs button').forEach((b) => b.addEventListener('click', () => {
      this.shopTab = b.dataset.shop;
      document.querySelectorAll('.shop-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      this.renderWorkshop();
    }));
    // one delegated handler for every button in the shop
    $('shop-body').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-act]');
      if (!b) { const i = ev.target.closest('button.info'); if (i) this.toggleInfo(i.closest('[data-row]')); return; }
      if (b.disabled) return;
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
    // a soft rollover when the pointer comes onto a button in a panel; a click for tabs, hatches and
    // close buttons (buying and selling play their own coins)
    let hovered = null;
    document.addEventListener('mouseover', (ev) => {
      const b = ev.target.closest && ev.target.closest('.shop button, .book button, .tankroom button, .btag, #pause button, #menu button');
      if (b && b !== hovered) { const g0 = this.h.getGame(); g0 && g0.audio && g0.audio.ready && g0.audio.uiHover(); }
      hovered = b;
    });
    document.addEventListener('click', (ev) => {
      const g0 = this.h.getGame(), au = g0 && g0.audio;
      if (!au || !au.ready || !ev.target.closest) return;
      if (ev.target.closest('.btag')) au.uiSoft();
      else if (ev.target.closest('[data-shop], .tabs button, .cave-tabs button, .hatch-btn, .tr-help-btn, #workshop-close, #journal-close, #cave-close, .tr-close, #resume, #quit')) au.click();
    });
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
  anyOpen() { return !$('journal').hidden || !$('workshop').hidden || !$('cave').hidden || !$('tankroom').hidden || !$('trapset').hidden; }
  closeAll() { this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.toggleTank(false); this.closeTrapSet(); }
  // the tank room, inside the sub: every place an animal can be kept, and what is in it
  tankOpen() { return !$('tankroom').hidden; }
  // ---------- setting a trap: which one, and how deep (a depth meter in whole metres) ----------
  trapSetOpen() { return !$('trapset').hidden; }
  closeTrapSet() { if (!$('trapset').hidden) this.tsClosedAt = performance.now(); $('trapset').hidden = true; }
  openTrapSet() {
    const g = this.h.getGame();
    this.ts = this.ts || { type: null, depth: 10 };
    if (!this.ts.wired) {
      this.ts.wired = true;
      $('trapset-close').addEventListener('click', () => this.closeTrapSet());
      document.querySelectorAll('#trapset .ts-meter button').forEach((b) => b.addEventListener('click', () => this.tsNudge(+b.dataset.d)));
      $('ts-slider').addEventListener('input', (e) => { this.ts.depth = +e.target.value; this.tsRender(); });
      $('ts-bottom').addEventListener('click', () => { this.ts.depth = this.tsMax(); this.tsRender(); });
      $('ts-set').addEventListener('click', () => this.tsSet());
      $('trapset').addEventListener('wheel', (e) => { e.preventDefault(); this.tsNudge((e.deltaY > 0 ? 1 : -1) * (e.shiftKey ? 10 : 1)); }, { passive: false });
      window.addEventListener('keydown', (e) => {
        if (!this.trapSetOpen()) return;
        const k = e.key;
        if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); this.tsNudge(e.shiftKey ? 10 : 1); }
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); this.tsNudge(e.shiftKey ? -10 : -1); }
        else if (k === ' ' || k === 'Enter') { e.preventDefault(); this.tsSet(); }
      }, true);
    }
    // the first trap type with one free, unless the last one chosen is still free
    if (!this.ts.type || trapsFree(g, this.ts.type) <= 0) this.ts.type = TRAP_ORDER.find((k) => trapsFree(g, k) > 0) || 'pot';
    $('trapset').hidden = false;
    this.tsRender();
  }
  tsFloor() { const g = this.h.getGame(); return Math.floor(g.world.floorAt(g.earl.x)); }
  tsMax() { return Math.max(2, Math.min(TRAPS[this.ts.type].maxDepth, this.tsFloor())); }
  tsNudge(d) { this.ts.depth += d; this.tsRender(); }
  tsRender() {
    const g = this.h.getGame(), T = TRAPS[this.ts.type], fl = this.tsFloor();
    const types = $('ts-types'); types.innerHTML = '';
    for (const k of TRAP_ORDER) {
      const own = (g.profile.traps || {})[k] || 0; if (!own) continue;
      const b = document.createElement('button'); const free = trapsFree(g, k);
      b.textContent = `${TRAPS[k].name} · ${free} free`; b.disabled = free <= 0; b.classList.toggle('on', k === this.ts.type);
      b.addEventListener('click', () => { this.ts.type = k; this.tsRender(); });
      types.append(b);
    }
    // the meter can go to the trap's rating; past the bottom it simply means: on the bottom
    const top = Math.min(T.maxDepth, Math.max(fl, 2));
    this.ts.depth = Math.max(2, Math.min(Math.round(this.ts.depth), T.maxDepth));
    $('ts-slider').max = T.maxDepth; $('ts-slider').value = this.ts.depth;
    $('ts-depth').textContent = this.ts.depth;
    $('ts-bottom').textContent = fl > T.maxDepth ? `Down to its limit (${T.maxDepth} m)` : `Let it down to the bottom (${fl} m)`;
    $('ts-info').textContent = `The bottom here: ${fl} m · the ${T.name.toLowerCase()} is rated to ${T.maxDepth} m${T.winch ? ' · hauled with the boat\'s winch' : ''}`;
    const w = $('ts-warn');
    if (this.ts.depth >= fl) { w.hidden = false; w.textContent = `The bottom here is only ${fl} m: the trap will rest on the bottom at ${fl} m (good for crabs, lobsters and bottom fish).`; }
    else if (fl > T.maxDepth && this.ts.depth === T.maxDepth) { w.hidden = false; w.textContent = `The ${T.name.toLowerCase()} goes no deeper than ${T.maxDepth} m.`; }
    else w.hidden = true;
    void top;
  }
  tsSet() {
    const d = Math.min(this.ts.depth, this.tsFloor());
    if (this.h.onSetTrap(this.ts.type, d)) this.closeTrapSet();
  }

  toggleTank(force) {
    const el = $('tankroom');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.tankRoom.open(); }
  }
  // the old one's cave: choose which fish she takes (once a dive)
  toggleCave(force) {
    const el = $('cave');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.caveSel.clear(); this.renderCave(); }
  }
  renderCave() {
    const P = this.h.getProfile(), off = this.h.onCaveOffer();
    if (!P || !off) return;
    this.renderCounter($('cave-cash'), money(P.cash));
    $('cave-coins').innerHTML = `${COIN}${P.coins || 0}`;
    $('cave-sub').textContent = `A giant anglerfish, older than the boat · this dive she craves: ${off.craving.name.toLowerCase()}`;
    let html = `<nav class="cave-tabs"><button data-cave="tab:trade" class="${this.caveTab === 'trade' ? 'on' : ''}">Trade</button><button data-cave="tab:wares" class="${this.caveTab === 'wares' ? 'on' : ''}">Her wares</button></nav>`;
    if (this.caveTab === 'wares') {
      for (const [k, W] of Object.entries(WARES)) {
        const g = this.h.getGame();
        const have = k === 'oldlure' ? (P.oldLures || 0) : k === 'relic' ? (P.relics || 0) : k === 'eye' ? (P.eye ? 1 : 0) : (g.blessed ? 1 : 0);
        const done = (W.max && have >= W.max) || (W.once && have) || (k === 'blessing' && have);
        const owned = W.max ? `${have} / ${W.max}` : done ? (k === 'blessing' ? 'on you this dive' : 'yours') : '';
        html += this.row('ware:' + k, W.name, W.line, owned, `<button data-cave="ware:${k}" class="coinbtn" ${done || (P.coins || 0) < W.coins ? 'disabled' : ''}>${COIN}${W.coins}</button>`, '', W.desc, [['price', `${W.coins} old gold coin${W.coins > 1 ? 's' : ''}`, 'sheet']]);
      }
      html += '<p class="shop-note">Old gold comes from the deep: every live animal caught below 500 m pays coins when it is sold (more the deeper it lived), she pays some in every trade, and so does every sapphire.</p>';
      $('cave-body').innerHTML = html;
      return;
    }
    if (off.traded) {
      html += `<p class="shop-empty">She has eaten. The lure dims a little, and a scatter of old gold lies in the silt: ${money(off.traded.total)}${off.traded.coins ? ` and ${off.traded.coins} coin${off.traded.coins > 1 ? 's' : ''}` : ''}. Come back next dive.</p>`;
      html += `<table class="manifest"><tbody>${off.traded.lines.map((l) => `<tr><td>${l.label}</td><td>${l.n}</td><td>${money(l.total)}</td></tr>`).join('')}</tbody></table>`;
    } else if (!off.groups.length) {
      html += '<p class="shop-empty">The great jaw opens a little and closes again. You have nothing she wants. She takes live fish: bring them in the bag or the sub\'s tank.</p>';
    } else {
      html += '<p class="shop-note">Once a dive she takes fish for old gold coins: 30 % under the market, but three times the market for what she craves. Choose what to give her.</p>';
      let total = 0;
      const rows = off.groups.map((gr) => {
        const on = this.caveSel.has(gr.key);
        if (on) total += gr.total;
        const sp = SPECIES_BY_ID[gr.id];
        return `<tr class="pick${on ? ' on' : ''}" data-cave="${gr.key}"><td><i class="tick">${on ? '✓' : ''}</i>${this.mini(sp)}${gr.variant ? `<span class="rare r-${gr.variant}">${VARIANTS[gr.variant].name}</span> ` : ''}${sp.name}${gr.craving ? ' <em class="crave">craved</em>' : ''}</td><td>${gr.n}</td><td>${money(gr.total)}</td></tr>`;
      }).join('');
      html += `<table class="manifest"><thead><tr><th>Fish</th><th>Qty</th><th>She pays</th></tr></thead><tbody>${rows}</tbody></table>`;
      html += `<button class="primary" data-cave="!trade" ${this.caveSel.size ? '' : 'disabled'}>Feed her<span>${money(total)}</span></button>`;
    }
    $('cave-body').innerHTML = html;
  }

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
    if (open && el.hidden === false && !this['_was_' + 'toggleJournal']) { const g0 = this.h.getGame(); g0 && g0.audio && g0.audio.ready && g0.audio.journalPage(); }
    this['_was_' + 'toggleJournal'] = open;
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
      const keys = [['W A S D / arrows', 'swim, steer the sub'], ['Shift', 'faster, more air (sub: ×1.5, air ×3)'], ['F', 'interact; hold to pry loose, cut nets, plant coral'], ['hold F', 'leave the submersible'], ['Mouse', 'Earl swims to the cursor; click swings the net (or uses the tool); hold right to sprint; wheel zooms'], ['L', 'lights on / off (flash it at a charging animal)'], ['C · hold C', 'call the submersible to you · send it back to the boat'], ['1 · 2 · Space', 'net · slurp gun · use it (approach slowly, then sweep); press a tool\'s number again to put it away'], ['3 · 4', 'tag gun · camera (aim with the mouse, Space to fire)'], ['5', 'traps: Space at the surface, choose the depth (↑ ↓); F at the buoy hauls it up (the big ones need the boat\'s winch); F beside it empties it'], ['Space (in the sub)', 'the manipulator arm, once fitted: reach, then close the claw in the green'], ['Q / E', 'throw a lure / wear a necklace'], ['R (in the sub)', 'open a backup air tank: the cabin air fills to full'], ['K (in the sub)', 'seal the leaks with a sealant kit: hull +20 %, up to 85 %'], ['hold F (at the hatch)', 'weld a patch plate over hull damage: +40 %'], ['G', 'offer something back to the deep'], ['U', 'the boat: sell your haul, buy gear (at the boat)'], ['B', 'take the helm and drive the Margaret (A / D)'], ['J', 'this journal'], ['P', 'show frames per second'], ['X', 'developer: max out everything'], ['Esc · M', 'pause · mute']];
      list.innerHTML = keys.map(([k, v]) => row(k, '', v)).join('');
    }
  }

  // ---------------- the boat ----------------
  renderWorkshop() {
    const g = this.h.getGame(), P = this.h.getProfile(), sub = g.sub;
    if (!P) return;
    marketTick(P);
    this.renderCounter($('shop-cash'), money(P.cash));
    $('shop-coins').innerHTML = P.coins ? `${COIN}${P.coins}` : '';
    $('shop-sub').textContent = sub.imploded ? 'No submersible' : `${SUB_MARKS[markOf(statValue(P, 'depth'))].label} ${SUB_MARKS[markOf(statValue(P, 'depth'))].name} · rated ${sub.rated} m · hull ${Math.round(sub.hull * 100)} %`;
    const can = (price) => P.cash + 1e-6 >= price;
    // a card: name, what it is, what it changes, and a price button
    // a card: name, a dot-point list of its figures (always in view), and the story behind the i
    const bullets = (specs) => specs && specs.length ? `<ul class="bullets">${specs.map(([l, v, k]) => `<li${k ? ` class="p-${k}"` : ''}>${l ? `<em>${l}</em>` : ''}<b>${v}</b></li>`).join('')}</ul>` : '';
    const card = (name, desc, stat, price, act, arg, label, owned = '', img = '', specs = null) => `
      <div class="card${img ? ' with-img' : ''}${this.openRows.has('card:' + arg) ? ' open' : ''}" data-row="card:${arg}">
        ${img ? `<img src="${img}" alt="">` : ''}
        <div class="card-txt"><h3>${name}<button class="info" data-info="card:${arg}" title="More about it (I)" aria-label="More information">i</button></h3>${stat ? `<div class="card-stat">${stat}</div>` : ''}${bullets(specs)}<p class="story">${desc}</p>${owned}</div>
        <button data-act="${act}" data-arg="${arg}" ${price !== null && !can(price) ? 'disabled' : ''}>${label}${price !== null ? `<span>${money(price, false)}</span>` : ''}</button>
      </div>`;
    const ladder = (n, i) => `<div class="ladder">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
    let html = '';
    const tab = this.shopTab;
    const icon = (k, t) => { const key = k + t; if (!this.toolImgs) this.toolImgs = new Map(); if (!this.toolImgs.has(key)) this.toolImgs.set(key, toolIcon(k, t, 240, 120).toDataURL()); return this.toolImgs.get(key); };
    if (tab === 'sell') {
      const rows = Object.entries(g.inv).filter(([k, n]) => n > 0 && GOODS[k]);
      const atBoat = !sub.imploded && Math.hypot(sub.x - (BOAT.x + 8.5), sub.y - 2.6) < 20;
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
      html += this.suitRows(P, can);
      html += this.upgradeGroups(P, ['Diver', 'Net', 'Slurp gun', 'Tag gun', 'Camera'], icon, can);
    } else if (tab === 'sub') {
      if (sub.imploded) {
        html += card('A replacement submersible', 'The old one is on the bottom somewhere, in pieces. The yard has another, built to the same rating.', '', replacementPrice(P), 'buy', 'replace', 'Buy', '', '', [['rated', `${sub.rated} m`, 'press'], ['upgrades', 'all kept', 'good']]);
      } else {
        html += `<p class="shop-note">Rated ${sub.rated} m: deeper, the cabin air leaks away faster and faster · hull ${Math.round(sub.hull * 100)} %</p>`;
        if (sub.hull < 0.999) html += card('Patch the hull', 'Weld plates over the worst of it.', '', PATCH_PRICE, 'buy', 'patch', 'Patch', '', '', [['hull', `${Math.round(sub.hull * 100)} % → ${Math.round(Math.min(1, sub.hull + 0.4) * 100)} %`, 'good'], ['damaged hull', 'leaks cabin air', 'bad']]);
        html += this.upgradeGroups(P, ['Submersible', 'Claw'], icon, can);
        for (const [k, a] of Object.entries(SUB_ADDONS)) if (!(P.addons || {})[k]) html += card(a.name, a.desc, '', a.price, 'buy', k, 'Fit', '', '', ADDON_SPECS[k]);
        const fitted = Object.entries(SUB_ADDONS).filter(([k]) => (P.addons || {})[k]).map(([, a]) => a.name.toLowerCase());
        if (fitted.length) html += `<p class="shop-note">Fitted: ${fitted.join(', ')}.</p>`;
      }
    } else if (tab === 'supplies') {
      const tr = P.traps || {};
      TRAP_ORDER.forEach((k, i) => {
        const T = TRAPS[k], have = tr[k] || 0, full = have >= T.max;
        html += card(T.name, T.desc, `you own ${have} / ${T.max}`, full ? null : T.price, 'buy', 'trap:' + k, full ? 'Full' : 'Buy', '', icon('trap', i), [
          ['depth', `down to ${T.maxDepth.toLocaleString()} m`, 'press'], ['catch', `${T.count[0]}–${T.count[1]} fish in 5 min`], ['fish up to', `${T.maxLen} m long`],
          ['holds', `${T.holds}`], ['line', { string: 'thin string', line: 'stout line', rope: 'thick rope' }[T.line]], ['funnels', `${T.funnels}`],
          ['hauled', T.winch ? "by the boat's winch" : 'by hand', T.winch ? 'bad' : 'good']].concat(T.lure ? [['lure', 'lit: draws deep animals and it', 'bad']] : []));
      });
      for (const [k, it] of Object.entries(SUPPLIES)) {
        const mx = supplyMax(P, k), have = g.items[k] || 0, full = have >= mx;
        html += card(it.name, it.desc, `carrying ${have} / ${mx}`, full ? null : it.price, 'buy', k, full ? 'Full' : 'Buy', '', '', SUPPLY_SPECS[k]);
      }
    } else if (tab === 'radio') {
      const lists = [g.bag].concat(!sub.imploded && Math.hypot(sub.x - (BOAT.x + 8.5), sub.y - 2.6) < 20 ? [g.subTank] : []);
      if (!g.contracts.length) html += '<p class="shop-empty">Static. Nobody is calling.</p>';
      for (const c of g.contracts) {
        const r = contractReady(g, c, lists);
        html += `<div class="contract${r ? ' ready' : ''}">${c.id ? this.mini(SPECIES_BY_ID[c.id]) : ''}<div><span>${c.who} wants</span><b>${c.text}</b></div><div class="pay">${money(c.pay)}${r ? '<em>aboard: paid when you sell</em>' : ''}</div></div>`;
      }
      if (!P.radio) html += card(RADIO.name, RADIO.desc, '', RADIO.price, 'buy', 'radio', 'Buy', '', '', [['contracts', '5 at a time'], ['paid', 'when you sell', 'good']]);
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
      if (next) {
        let c = card(`Build: ${next.name}`, next.desc, '', next.price, 'buy', 'wing:' + next.id, 'Build', '', '', [['tanks', `${next.slots}`, 'good'], ['upkeep', `${money(next.upkeep, false)} a day`, 'bad']].concat(next.coins ? [['also costs', `${next.coins} old gold coins`]] : []));
        if (next.coins && (P.coins || 0) < next.coins) c = c.replace('<button ', '<button disabled ');
        html += c;
      }
      else html += '<p class="shop-note">Every wing is built.</p>';
      if (A.lastDay) html += `<p class="shop-note">Yesterday: ${A.lastDay.visitors} visitors, ${money(A.lastDay.income, false)} in tickets, ${money(A.lastDay.cost, false)} upkeep. Earned so far: ${money(A.earned, false)}.</p>`;
    }
    $('shop-body').innerHTML = html;
  }

  // Suits: one line each, what it does, and buy / wear / worn
  suitRows(P, can) {
    const have = new Set(P.suits || ['wet']), worn = P.suit || 'wet';
    const pct = (v) => `${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)} %`;
    let html = '<div class="up-group"><h4>Suit</h4>';
    for (const [k, S] of Object.entries(SUITS)) {
      // what it does, plate by plate: the pressure rating first, always
      const specs = [['rated', `${S.press} m`, 'press']];
      if (S.air !== 1) specs.push(['air use', pct(S.air), S.air < 1 ? 'good' : 'bad']);
      if (S.speed !== 1) specs.push(['speed', pct(S.speed), S.speed > 1 ? 'good' : 'bad']);
      if (S.bite) specs.push(['bites', `−${S.bite} injury`, 'good']);
      if (S.quiet) specs.push(['', 'no bubbles', 'good']);
      if (S.warm) specs.push(['', 'keeps out the cold', 'good']);
      if (specs.length === 1) specs.push(['', 'nothing else special', 'sheet']);
      const label = k === worn ? 'Worn' : have.has(k) ? 'Wear' : money(S.price);
      const dis = k === worn || (!have.has(k) && !can(S.price));
      specs.push(['below rating', 'air and held breath drain faster', 'sheet']);
      const story = S.desc;
      html += this.row('suit:' + k, S.name, S.line, have.has(k) ? 'owned' : '', `<button data-act="buy" data-arg="suit:${k}" ${dis ? 'disabled' : ''}>${label}</button>`,
        '', story, specs);
    }
    return html + '</div>';
  }

  // one shop row: the name, a single line and its key numbers on small plates; the brass "i" (or the
  // I key over it) opens a spec sheet below: every figure, with gauges, and the full story.
  // specs: [label, value, kind] where kind 'press' draws a pressure gauge and 'good'/'bad' tint it
  row(key, name, line, lv, button, stats, desc, specs = null) {
    const open = this.openRows.has(key);
    const sp = specs || (stats ? [['', stats]] : []);
    const plates = sp.filter((x) => x[2] !== 'sheet').map(([l, v, k]) => `<span class="plate${k ? ' p-' + k : ''}">${l ? `<em>${l}</em>` : ''}${v}</span>`).join('');
    const sheet = sp.map(([l, v, k]) => {
      if (k === 'press') {
        const m = parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0, f = Math.min(1, m / 1000);
        return `<div class="sheet-row press"><span>Pressure rating</span><b>${v}</b><i class="gauge"><i style="width:${(f * 100).toFixed(1)}%"></i>${[200, 400, 600, 800].map((t) => `<u style="left:${t / 10}%"></u>`).join('')}</i></div>`;
      }
      return `<div class="sheet-row${k ? ' p-' + k : ''}"><span>${l || 'Also'}</span><b>${v}</b></div>`;
    }).join('');
    return `<div class="up-row${open ? ' open' : ''}" data-row="${key}"><div class="up-head"><span class="up-name">${name}<button class="info" data-info="${key}" title="More about it (I)" aria-label="More information">i</button></span><span class="up-line">${line}</span>${plates ? `<span class="plates">${plates}</span>` : ''}</div>
      <span class="up-lv">${lv}</span>${button}
      <div class="up-detail"><div class="sheet">${sheet}</div>${desc ? `<p class="story">${desc}</p>` : ''}</div></div>`;
  }

  toggleInfo(row) {
    if (!row) return;
    row.classList.toggle('open');
    this.openRows[row.classList.contains('open') ? 'add' : 'delete'](row.dataset.row);
    const g = this.h.getGame && this.h.getGame(); if (g && g.audio && g.audio.ready && g.audio.click) g.audio.click();
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
        html += `<div class="card${ic ? ' with-img' : ''}${this.openRows.has('card:gear:' + gk) ? ' open' : ''}" data-row="card:gear:${gk}">${ic ? `<img src="${icon(ic[0], ic[1])}" alt="">` : ''}<div class="card-txt"><h3>${G.name}<button class="info" data-info="card:gear:${gk}" title="More about it (I)" aria-label="More information">i</button></h3>${GEAR_SPECS[gk] ? `<ul class="bullets">${GEAR_SPECS[gk].map(([l, v, k]) => `<li${k ? ` class="p-${k}"` : ''}><em>${l}</em><b>${v}</b></li>`).join('')}</ul>` : ''}<p class="story">${G.desc}</p></div>
          <button data-act="buy" data-arg="gear:${gk}" ${can(G.price) ? '' : 'disabled'}>Buy<span>${money(G.price)}</span></button></div></div>`;
        continue;
      }
      for (const [id, U] of Object.entries(UPGRADES)) {
        if (U.group !== grp) continue;
        const l = lv(P, id), maxed = l >= U.max, cost = upgradeCost(P, id);
        const now = fmtStat(id, statValue(P, id)), next = maxed ? '' : fmtStat(id, statValue(P, id) + U.step);
        html += this.row('up:' + id, U.name, UPGRADE_LINE[id] || '',
          `<span class="lamps">${Array.from({ length: 10 }, (_, k) => `<i class="${k < Math.round(l / U.max * 10) ? 'lit' : ''}"></i>`).join('')}</span>${maxed ? 'max' : `lv ${l}`}`,
          `<button data-act="buy" data-arg="up:${id}" ${maxed || !can(cost) || (P.coins || 0) < upgradeCoins(P, id) ? 'disabled' : ''}>${maxed ? '—' : money(cost)}${!maxed && upgradeCoins(P, id) ? ` <em class="pluscoin">+${COIN}${upgradeCoins(P, id)}</em>` : ''}</button>`,
          '', UPGRADE_DESC[id] || '', maxed ? [['now', now], ['', 'the most it can be', 'sheet']] : [['now', now], ['next', next, 'good'], ['level', `${l} of ${U.max}`, 'sheet']]);
      }
      if (gk === 'camera' && !owns(P, 'lowlight')) html += this.row('gear:lowlight', GEAR.lowlight.name, GEAR.lowlight.line, '', `<button data-act="buy" data-arg="gear:lowlight" ${can(GEAR.lowlight.price) ? '' : 'disabled'}>${money(GEAR.lowlight.price)}</button>`, '', GEAR.lowlight.desc, [['', 'no flash', 'good']]);
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
    const lines = sale.lines.map((l) => `<div class="slip-line${l.coins ? ' coins' : ''}"><span>${l.n > 1 ? l.n + ' × ' : ''}${l.label}</span><b>${l.coins ? `${COIN}${l.coins}` : money(l.total)}</b></div>`);
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
      if (Math.abs(e.x - BOAT.x) > 16 || e.y > 5) this.toggleWorkshop(false);
    }
    if (!$('tankroom').hidden) {
      if (!g.earl.inSub) this.toggleTank(false);
      else this.tankRoom.update(dt);
    }
    if (!$('cave').hidden && Math.hypot(g.earl.x - 66, g.earl.y - 1800) > 20) this.toggleCave(false);
  }
}
