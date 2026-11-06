// DOM overlays: home screen, journal, boat workshop, pause, run log.
import { SPECIES_BY_ID, SPECIES } from './species.js';
const SPECIES_COUNT = SPECIES.length;
const SHOWCASE_TABS = new Set(['diver', 'tools', 'sub']);
import { speciesIcon } from './creatures_draw.js';
import { RESOURCES, BOAT } from './world.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS, TRAPS } from './economy.js';
import { toolIcon } from './tools_draw.js';
import { specimenValue, conditionName, rarityOf } from './specimens.js';
const badge = (sp) => { const r = rarityOf(sp); return r.hidden ? '' : `<span class="rbadge" style="--rc:${r.col}">${r.name}</span>`; }; // (animals that can't be captured show no rarity)
import { VARIANTS, VARIANT_KEYS, variantLabel, canBeRare } from './variants.js';
import { Gallery } from './gallery.js';
import { Cabin } from './cabin.js';
import { SETTINGS, setSetting } from './settings.js';
import { aquariumOf, displayRefusal, dailyIncome, visitors, completion, gallerySlots, GALLERY_STEPS, earnsOf, isHappy, DAY } from './aquarium.js';
import { SUITS } from './economy.js';
import { WARES, upgradeCoins } from './economy.js';
import { TankRoom } from './tankroom.js';
import { TRAP_ORDER } from './economy.js';
import { trapsFree } from './traps.js';
import { tankSlots, pressSlots, tankUsed, pressUsed, NETS_SUB } from './capture.js';
import { readSlot, lastSlot, deleteSlot, getSlot, SLOTS } from './economy.js';
import { statAt } from './economy.js';
import { pressureKind, pressureTolerance } from './specimens.js';
import { loadBest, UPGRADES, TRACKS, UPGRADE_DESC, UPGRADE_LINE, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat } from './economy.js';
import { refreshIn, ready as contractReady } from './contracts.js';
import { TANKS, FINS, SUBS, SUB_TIERS, SUB_ADDONS, SUPPLIES, supplyMax, GOODS, PATCH_PRICE, replacementPrice, priceOf, marketTick, money } from './economy.js';
import { formatTime } from './util.js';
import { VERSION } from './version.js';
import { markOf, SUB_MARKS } from './earl_draw.js';
import { previewOf, drawShowcase } from './showcase.js';


// the figures for the shop's cards, as dot points
const ADDON_SPECS = {
  recall: [['use', 'C calls the sub'], ['sub comes', '1.5× faster', 'good']],
  quiet: [['sub noise', '−50 %', 'good'], ['the deep', 'hears it less', 'good']],
};
const SUPPLY_SPECS = {
  lure: [['use', 'Q throws it'], ['effect', 'the deep thing follows its light', 'good'], ['lasts', 'a while']],
  necklace: [['use', 'E puts it on / takes it off'], ['effect', 'a soft green light round Earl', 'good'], ['but', 'a light can be seen', 'bad']],
  tag: [['use', 'the tag gun (3)'], ['for', 'common to rare, tag-only under 2 m'], ['pays', '$0.50-2 a fish, more for big animals', 'good']],
  tagAdv: [['use', 'the tag gun (3)'], ['for', 'exotic, legendary, undocumented, big animals', 'good'], ['dart', 'wider spread, faint glow']],
  airTank: [['use', 'R, in the sub'], ['work', '3 s to connect'], ['effect', 'cabin air to full', 'good'], ['rack', 'one to start; can be enlarged']],
};
const GEAR_SPECS = {
  slurp: [['key', '2'], ['catches', 'small fish, even fast ones', 'good']],
  tagger: [['key', '3'], ['tags', 'sharks, billfish, whales'], ['pays', 'per tag, less each time']],
  camera: [['key', '4'], ['pays', 'first photo of each species and rare form', 'good']],
  arm: [['use', 'Space, from inside the sub'], ['catches', 'time the grip']],
};
const $ = (id) => document.getElementById(id);
const COIN = '<i class="coin"></i>';
const RUNLOG = () => `earlDiver.runs.v1${getSlot() ? '.slot' + getSlot() : ''}`; // each save slot keeps its own dive log

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
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
    this.cabin = new Cabin($('cabin'), { close: () => this.toggleCabin(false), catalog: () => this.openShop('tools', ['tools', 'diver', 'supplies', 'sub']), station: (id) => h.onStation && h.onStation(id), blocked: () => !$('workshop').hidden || this.confirmOpen(), suit: () => { const g0 = h.getGame(); return g0 && g0.earl ? g0.earl.suit : 'wet'; }, daylight: () => { const g0 = h.getGame(); return g0 && g0.day ? g0.day.light : 1; } });
    this.gallery = new Gallery($('gallery'), { act: (a2, k, v) => h.onGallery(a2, k, v), setLight: (l) => h.onGallery('light', l), getGame: () => h.getGame(), pay: () => h.payMul ? h.payMul() : 1, close: () => this.toggleGallery(false) });
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
    this.shopSel = {}; // the item each tab's showcase shows
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
      const b = ev.target.closest('button[data-act], button[data-sell]');
      if (!b) {
        const i = ev.target.closest('button.info'); if (i) { this.toggleInfo(i.closest('[data-row]')); return; }
        // anywhere else on a row: show it in the showcase window
        const r = ev.target.closest('[data-row]');
        if (r && SHOWCASE_TABS.has(this.shopTab) && previewOf(r.dataset.row, h.getProfile())) { this.shopSel[this.shopTab] = r.dataset.row; this.renderWorkshop(); }
        return;
      }
      if (b.disabled) return;
      const act = b.dataset.act || b.dataset.sell, arg = b.dataset.arg;
      if (act === 'buy' && arg.startsWith('subnet:')) {
        const g0 = h.getGame(), k = arg.slice(7), cur = g0 && g0.items.net;
        if (cur && cur !== k) { this.confirm('Replace the net?', `The hatch holds one net. Buying the ${NETS_SUB[k].name.toLowerCase()} replaces your ${NETS_SUB[cur].name.toLowerCase()}, which is lost.`, 'Replace it', 'Keep mine', () => { h.onBuy(arg); this.renderWorkshop(); }); return; }
        h.onBuy(arg);
      }
      else if (act === 'buy') h.onBuy(arg);
      else if (act === 'take') { h.onTakeContract(arg); }
      else if (act === 'refresh') { h.onRefreshContracts(); }
      else if (act === 'sellall') { const sale = h.onSellAll(); if (sale) this.showLedger(sale); }
      else if (act === 'tobasket') { (this.sellPick || (this.sellPick = new Set())).add(arg); }
      else if (act === 'frombasket') { this.sellPick && this.sellPick.delete(arg); }
      else if (act === 'sellpick') { const sale = h.onSellSome([...(this.sellPick || [])]); this.sellPick = new Set(); if (sale) this.showLedger(sale); }
      else if (act === 'display') h.onDisplay(arg);
      else if (act === 'gallery') { this.toggleGallery(true); return; }
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
    $('restart').addEventListener('click', () => this.confirm('Start a new game?', 'A new diver, from nothing: no cash, no gear, an empty journal. This save is replaced.', 'Start over', 'Keep playing', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onNewGame(); }));
    // the title screen: Continue, the three slots, controls, full screen
    $('continue').addEventListener('click', () => { const n = lastSlot(); if (n) h.onSlot(n); });
    $('slots').addEventListener('click', (ev) => {
      const del = ev.target.closest('.del'), card = ev.target.closest('.slot');
      if (!card) return;
      const n = +card.dataset.n;
      if (del) {
        ev.stopPropagation();
        const info = card.querySelector('.info'), what = info ? `${info.querySelector('b').textContent} · ${info.querySelector('span').textContent}` : '';
        this.confirm(`Delete diver ${n}?`, `${what}\n\nEverything in this save is lost for good: cash, gear, the journal, the aquarium.`, 'Delete for good', 'Keep it', () => { deleteSlot(n); this.showTitle(); });
        return;
      }
      if (card.classList.contains('damaged') && !card.classList.contains('sure')) { card.classList.add('sure'); card.querySelector('.info span').textContent = 'click again to start a new game here'; return; }
      h.onSlot(n);
    });
    $('title-fullscreen').addEventListener('click', () => $('fullscreen').click());
    $('to-title').addEventListener('click', () => h.onTitle());
    $('savequit').addEventListener('click', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onTitle(true); });
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
    // reduce flashing: the monster's lights stutter slowly and its blue flash is softened
    $('flashing').addEventListener('click', () => { const g = h.getGame(); g.reduceFlash = !g.reduceFlash; try { localStorage.setItem('earl.reduceFlash', g.reduceFlash ? '1' : '0'); } catch (e) { /* not saved */ } this.renderSettings(); });
    // display settings: the brackets round a target, and the "[Space] Net the …" catch tags
    $('set-brackets').addEventListener('click', () => { setSetting('brackets', !SETTINGS.brackets); this.renderSettings(); });
    $('set-catchtags').addEventListener('click', () => { setSetting('catchTags', !SETTINGS.catchTags); this.renderSettings(); });
    $('set-hints').addEventListener('click', () => { h.onHints && h.onHints(); this.renderSettings(); });
    $('set-sound').addEventListener('click', () => { h.onMute && h.onMute(); this.renderSettings(); });
    document.querySelector('#inventory .inv-close').addEventListener('click', () => this.toggleInventory(false));
    $('inventory').addEventListener('click', (ev) => { if (ev.target === $('inventory')) this.toggleInventory(false); });
    $('set-graphics').addEventListener('click', () => { setSetting('fast', !SETTINGS.fast); this.renderSettings(); });
    // the gear (title screen, journal, pause menu) opens the settings and controls
    document.addEventListener('click', (ev) => { if (ev.target.closest('[data-settings]')) this.toggleSettings(true); });
    document.querySelector('#settings .set-close').addEventListener('click', () => this.toggleSettings(false));
    $('settings').addEventListener('click', (ev) => { if (ev.target === $('settings')) this.toggleSettings(false); });
    document.querySelector('#settings .set-controls').innerHTML = document.querySelector('#menu .controls').innerHTML;
    this.renderSettings();
    $('quit').addEventListener('click', () => this.confirm('End this dive?', 'Whatever you have not sold is lost, and the next dive is a new sea. Your cash, gear and journal are kept.', 'End the dive', 'Keep diving', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onQuit(); }));
    $('notes').addEventListener('input', (e) => { h.getGame().notes = e.target.value; });
    this.renderRuns();
    this.renderSave();
    document.querySelectorAll('.version').forEach((el) => { el.textContent = 'v' + VERSION; });
  }
  // "Name her": the brass plate. done(name) is called with what was stamped (EARL if left empty).
  askSubName(current, done, line) {
    const box = $('namebox'), inp = $('subname');
    $('namebox-line').textContent = line || 'The yard will paint it on her hull, and on every hull after her.';
    inp.value = (current || 'EARL').toUpperCase(); box.hidden = false;
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const finish = () => {
      const v = inp.value.replace(/[^\p{L}\p{N} .'-]/gu, '').trim().toUpperCase().slice(0, 12) || 'EARL';
      box.hidden = true; inp.blur(); $('name-ok').onclick = null; inp.onkeydown = null; done(v);
    };
    $('name-ok').onclick = finish;
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(); };
  }
  nameOpen() { return !$('namebox').hidden; }
  typing() { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT'); }
  blurTyping() { document.activeElement && document.activeElement.blur(); }
  anyOpen() { return this.stationsOpen() || !$('cabin').hidden || !$('journal').hidden || !$('workshop').hidden || !$('cave').hidden || !$('tankroom').hidden || !$('trapset').hidden || !$('gallery').hidden || !$('settings').hidden || !$('inventory').hidden; }
  closeAll() { this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.toggleTank(false); this.toggleGallery(false); this.closeTrapSet(); }
  // the tank room, inside the sub: every place an animal can be kept, and what is in it
  tankOpen() { return !$('tankroom').hidden; }
  // a brass "are you sure?" plate: yes runs onYes; no, Esc or a click outside just closes it
  confirm(title, body, yes, no, onYes) {
    const el = $('confirm'), close = () => { el.hidden = true; window.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
    el.querySelector('.cf-title').textContent = title;
    el.querySelector('.cf-body').innerHTML = esc(body).replace(/\n/g, '<br>');
    el.querySelector('.cf-yes').textContent = yes; el.querySelector('.cf-no').textContent = no;
    el.querySelector('.cf-yes').onclick = () => { close(); onYes(); };
    el.querySelector('.cf-no').onclick = close;
    el.onclick = (e) => { if (e.target === el) close(); };
    window.addEventListener('keydown', key, true);
    el.hidden = false; el.querySelector('.cf-no').focus();
  }
  confirmOpen() { return !$('confirm').hidden; }
  // the shop, opened on one tab (a station aboard the Margaret)
  openShop(tab, allowed = null) {
    this.shopTab = tab;
    document.querySelectorAll('.shop-tabs button').forEach((x) => x.classList.toggle('on', x.dataset.shop === tab));
    this.toggleWorkshop(true, allowed);
  }
  // Tab aboard: the stations, as a list (for anyone who'd rather not walk the deck)
  stationMenu(list, onPick) {
    let el = document.getElementById('stations');
    if (!el) {
      el = document.createElement('div'); el.id = 'stations'; el.hidden = true;
      el.innerHTML = '<div class="st-plate"><h3>The Margaret</h3><div class="st-list"></div><p class="st-hint">Tab or Esc to close</p></div>';
      document.body.appendChild(el);
    }
    const close = () => { el.hidden = true; window.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape' || e.key === 'Tab') { e.stopPropagation(); e.preventDefault(); close(); } };
    el.querySelector('.st-list').innerHTML = list.map((st) => `<button data-st="${st.id}"><b>${st.name}</b><span>${st.label}</span></button>`).join('');
    el.querySelector('.st-list').onclick = (e) => { const b = e.target.closest('button[data-st]'); if (b) { close(); onPick(b.dataset.st); } };
    el.onclick = (e) => { if (e.target === el) close(); };
    window.addEventListener('keydown', key, true);
    el.hidden = false;
  }
  stationsOpen() { const el = document.getElementById('stations'); return !!el && !el.hidden; }
  inventoryOpen() { return !$('inventory').hidden; }
  toggleInventory(force) { const el = $('inventory'); el.hidden = !(force === undefined ? el.hidden : force); if (!el.hidden) this.renderInventory(); }
  // B: what Earl has on him, what is in the sub, his gear
  renderInventory() {
    const g = this.h.getGame(), P = this.h.getProfile();
    if (!g || !P) { $('inventory').querySelector('.inv-body').innerHTML = '<p class="inv-empty">Nothing yet: start a dive.</p>'; return; }
    const ic = (sp) => { if (!this.toolImgs) this.toolImgs = new Map(); const k = 'inv' + sp.id; if (!this.toolImgs.has(k)) this.toolImgs.set(k, speciesIcon(sp, 120, 68).toDataURL()); return this.toolImgs.get(k); };
    const row = (label, n, note = '') => `<div class="inv-row"><span>${label}${note ? ` <em>${note}</em>` : ''}</span>${n === '' ? '' : `<b class="n${n ? '' : ' zero'}">${n}</b>`}</div>`;
    const fish = (s) => { const sp = SPECIES_BY_ID[s.id]; return `<div class="inv-row"><img src="${ic(sp)}" alt=""><span>${sp.name}${s.variant ? ` <em>${s.variant}</em>` : ''}<br><em>${s.cond <= 0.05 ? 'dead' : conditionName(s.cond)} · from ${s.from || 0} m · about ${money(specimenValue(s) * statValue(P, 'payFish'))}</em></span></div>`; };
    const sec = (title, inner, wide = false) => `<div class="inv-sec${wide ? ' wide' : ''}"><h4>${title}</h4><div class="inv-list">${inner}</div></div>`;
    let html = `<div class="inv-sec wide"><div class="inv-cash"><div><span>CASH</span>${money(P.cash)}</div>${P.coins ? `<div><span>OLD GOLD COINS</span>${P.coins}</div>` : ''}</div></div>`;
    // the animals first (the bag, then the sub's tanks); supplies, finds and gear below
    html += sec(`The catch bag · ${g.bag.length} of ${Math.round(statValue(P, 'bag'))}`, g.bag.length ? g.bag.map(fish).join('') : '<p class="inv-empty">Empty.</p>', true);
    if (!g.sub.imploded) {
      const where = (s) => (s.pile ? 'the heap from the net' : s.pressed ? (s.chamber === 100 ? 'the large pressure tank' : `chamber ${s.chamber + 1}`) : 'the open tank');
      const groups = {};
      for (const s of g.subTank) (groups[where(s)] = groups[where(s)] || []).push(s);
      const inner = Object.keys(groups).length ? Object.entries(groups).map(([w, L]) => `<div class="inv-empty" style="font-style:normal">${w}</div>` + L.map(fish).join('')).join('') : '<p class="inv-empty">Nothing in her tanks.</p>';
      html += sec('In the submersible', inner, true);
    }
    // supplies and finds: only what he actually has (the lure and the necklace are on the screen already; clams and pearls too)
    const it = g.items || {}, SHOWN_ELSEWHERE = new Set(['lure', 'necklace', 'clam', 'pearl']);
    const carried = Object.entries(SUPPLIES).filter(([k]) => !SHOWN_ELSEWHERE.has(k) && (it[k] || 0) > 0);
    if (carried.length) html += sec('Carried', carried.map(([k, S]) => row(S.name, it[k], `of ${supplyMax(P, k)}`)).join(''));
    const finds = Object.entries(g.inv || {}).filter(([k, n]) => n > 0 && !SHOWN_ELSEWHERE.has(k));
    if (finds.length) html += sec('Finds, to sell at the boat', finds.map(([k, n]) => row(RESOURCES[k] ? RESOURCES[k].name : k, n)).join(''));
    const tools = ['net'].concat(Object.keys(GEAR).filter((k) => owns(P, k))).map((k) => k === 'net' ? 'Hand net' : GEAR[k].name);
    const M = SUB_MARKS[markOf(statValue(P, 'depth'))];
    html += sec('Equipment', row('Tools', '', tools.join(' · ')) + row('Suit', '', (SUITS[P.suit] || {}).name || 'Wetsuit') + row('Submersible', '', g.sub.imploded ? 'lost' : `${M.named ? (P.subName || 'EARL') + ', ' : ''}${M.name}, rated ${g.sub.rated} m`), true);
    $('inventory').querySelector('.inv-body').innerHTML = html;
  }
  settingsOpen() { return !$('settings').hidden; }
  toggleSettings(force) { const el = $('settings'); el.hidden = !(force === undefined ? el.hidden : force); if (!el.hidden) this.renderSettings(); }
  renderSettings() {
    const g = this.h.getGame(), row = (id, label, on, note) => { $(id).innerHTML = `<span>${label}${note ? `<em>${note}</em>` : ''}</span><b class="${on ? 'on' : ''}">${on ? 'on' : 'off'}</b>`; };
    row('flashing', 'Reduce flashing', !!(g && g.reduceFlash), 'the thing in the deep: slower, softer lights');
    row('set-brackets', 'Target brackets', SETTINGS.brackets, 'corners round what the net will go for');
    row('set-catchtags', 'Catch tags', SETTINGS.catchTags, '"[Space] net the …" under a target');
    row('set-hints', 'Hints', this.h.getHints ? this.h.getHints() : true, 'H');
    row('set-sound', 'Sound', this.h.getMuted ? !this.h.getMuted() : true, 'M');
    $('set-graphics').innerHTML = `<span>Graphics<em>Fast: softer picture and fewer extras, for smoother play on slower computers</em></span><b class="on">${SETTINGS.fast ? 'fast' : 'auto'}</b>`;
  }
  galleryOpen() { return !$('gallery').hidden; }
  cabinOpen() { return !$('cabin').hidden; }
  toggleCabin(force) {
    const el = $('cabin'), open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.cabin.show(); }
  }
  toggleGallery(force) {
    const el = $('gallery'), open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.toggleTank(false); this.gallery.show(); }
  }
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
      $('ts-bottom').addEventListener('click', () => { this.ts.depth = TRAPS[this.ts.type].maxDepth; this.tsRender(); });
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
      b.textContent = `${TRAPS[k].name} · ${free} ready`; b.disabled = free <= 0; b.classList.toggle('on', k === this.ts.type);
      b.addEventListener('click', () => { this.ts.type = k; this.tsRender(); });
      types.append(b);
    }
    // the meter can go to the trap's rating; past the bottom it simply means: on the bottom
    const top = Math.min(T.maxDepth, Math.max(fl, 2));
    this.ts.depth = Math.max(2, Math.min(Math.round(this.ts.depth), T.maxDepth));
    $('ts-slider').max = T.maxDepth; $('ts-slider').value = this.ts.depth;
    $('ts-depth').textContent = this.ts.depth;
    // the depth of the bottom is not told: only that the line has reached it, once it has
    $('ts-bottom').textContent = `All the way (${T.maxDepth} m)`;
    $('ts-info').textContent = `The ${T.name.toLowerCase()} is rated to ${T.maxDepth} m${T.winch ? ' · hauled with the boat\'s winch' : ''}`;
    const w = $('ts-warn');
    if (this.ts.depth >= fl) { w.hidden = false; w.textContent = `The bottom here is only ${fl} m: the trap will rest on the bottom at ${fl} m (good for crabs, lobsters and bottom fish).`; }
    else if (this.ts.depth === T.maxDepth) { w.hidden = false; w.textContent = `The ${T.name.toLowerCase()} goes no deeper than ${T.maxDepth} m.`; }
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

  // the title screen: Continue (the last slot played), and each slot with what it holds
  showTitle() {
    this.closeAll(); this.setPaused(false);
    $('menu').classList.add('gone');
    const ago = (ms) => { const m = (Date.now() - ms) / 60000; return m < 2 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
    let html = '';
    for (let n = 1; n <= SLOTS; n++) {
      const r = readSlot(n);
      if (r.state === 'ok') {
        const p = r.profile;
        html += `<div class="slot" data-n="${n}"><div class="num">${n}</div><div class="info"><b>${money(p.cash, false)}${p.subName ? ` · ${p.subName}` : ''}</b><span>${p.runs || 0} dive${p.runs === 1 ? '' : 's'} · deepest ${p.deepest || 0} m · ${(p.journal || []).length} species · ${r.saved ? ago(r.saved) : ''}</span></div><button class="del" title="Delete this save">Delete</button></div>`;
      } else if (r.state === 'damaged') {
        html += `<div class="slot damaged" data-n="${n}"><div class="num">${n}</div><div class="info"><b>A damaged save</b><span>it could not be read</span></div><button class="del">Delete</button></div>`;
      } else html += `<div class="slot empty" data-n="${n}"><div class="num">${n}</div><div class="info"><b>Empty: new game</b><span>start a new diver here</span></div><span></span></div>`;
    }
    $('slots').innerHTML = html;
    const last = lastSlot();
    $('continue').hidden = !(last && readSlot(last).state === 'ok');
    $('title').classList.remove('gone');
  }
  titleOpen() { return !$('title').classList.contains('gone'); }
  showLoading(on) { $('loading').hidden = !on; }
  showGame() {
    $('title').classList.add('gone');
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
    let html = `<div class="save-line"><b>${money(p.cash, false)}</b><span>${p.runs || 1} dive${(p.runs || 1) > 1 ? 's' : ''}</span><span>deepest ${p.deepest || 0} m${best > (p.deepest || 0) ? ` (ever ${best} m)` : ''}</span><span>${(p.journal || []).length} species recorded</span>${p.aquarium && Object.keys(p.aquarium.display || {}).length ? `<span>gallery: ${completion(p).species} species, ${completion(p).rare} rare</span>` : ''}</div>`;
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
  // allowed: the tabs this place offers (selling from the water: Sell only; a station aboard: its own); null for all
  toggleWorkshop(force, allowed = null) {
    const el = $('workshop');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) {
      this.shopAllowed = allowed;
      document.querySelectorAll('.shop-tabs button[data-shop]').forEach((b) => { b.hidden = !!allowed && !allowed.includes(b.dataset.shop); });
      const nav = document.querySelector('#workshop .shop-tabs'); if (nav) nav.hidden = !!allowed && allowed.length < 2;
      if (allowed && !allowed.includes(this.shopTab)) { this.shopTab = allowed[0]; document.querySelectorAll('.shop-tabs button').forEach((x) => x.classList.toggle('on', x.dataset.shop === this.shopTab)); }
      this.toggleJournal(false); this.renderWorkshop();
    }
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
        <div class="meta">Seen at ${info.depth} m · lives ${sp.dmin}–${sp.dmax} m · up to ${sp.size}${sp.giant ? ' (this one far larger)' : ''} · pressure tolerance x${pressureKind(sp).k} (${pressureKind(sp).why})</div>
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
      const keys = [['W A S D / arrows', 'swim, steer the sub'], ['Shift', 'faster, more air (sub: ×1.5, air ×3)'], ['F', 'interact; hold to pry loose, cut nets, plant coral'], ['hold F', 'leave the submersible'], ['Mouse', 'Earl swims to the cursor; click swings the net (or uses the tool); hold right to sprint; wheel zooms'], ['L', 'lights on / off (flash it at a charging animal)'], ['C · hold C', 'call the submersible to you · send it back to the boat'], ['1 · 2 · Space', 'net · slurp gun · use it (approach slowly, then sweep); press a tool\'s number again to put it away'], ['3 · 4', 'tag gun · camera (aim with the mouse, Space to fire)'], ['5', 'traps: Space at the surface, choose the depth (↑ ↓); F at the buoy hauls it up (the big ones need the boat\'s winch); F beside it empties it'], ['Space (in the sub)', 'the manipulator arm, once fitted: reach, then close the claw in the green'], ['Q / E', 'throw a lure / wear a necklace'], ['R (in the sub)', 'connect a backup air tank (3 s): the cabin air fills to full'], ['hold R (outside, at a damaged patch)', 'mend the sub\'s hull: 5 s a patch, +15 %'], ['N (in the sub)', 'let out the trawl net (one carried; $300 a new one at the boat)'], ['G', 'offer something back to the deep (only while it hunts you, within 1,000 m)'], ['U', 'the boat: sell your haul, buy gear (at the boat)'], ['B', 'inventory'], ['V', 'take the helm and drive the Margaret (A / D); G drops the anchor'], ['J', 'this journal'], ['P', 'show frames per second'], ['X', 'developer: +$500,000'], ['Esc · M', 'pause · mute']];
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
    {
      const M = SUB_MARKS[markOf(statValue(P, 'depth'))];
      $('shop-sub').innerHTML = sub.imploded ? 'No submersible' : `${M.named ? `<b>${esc(P.subName || 'EARL')}</b> · ` : ''}${M.name} · rated ${sub.rated} m · hull ${Math.round(sub.hull * 100)} %${M.named ? '<button class="rename" data-rename="1">rename</button>' : ''}`;
      const rn = $('shop-sub').querySelector('.rename');
      if (rn) rn.onclick = () => this.askSubName(P.subName, (v) => { this.h.onRename(v); this.renderWorkshop(); }, 'A fresh coat of paint, free of charge.');
    }
    const can = (price) => P.cash + 1e-6 >= price;
    this.rec = this.recommend(P, g);
    const TAB_OF = { Diver: 'diver', Net: 'tools', 'Slurp gun': 'tools', 'Tag gun': 'tools', Camera: 'tools', Submersible: 'sub', Claw: 'sub' };
    document.querySelectorAll('.shop-tabs button[data-shop]').forEach((b) => b.classList.toggle('rec', !!this.rec && TAB_OF[TRACKS[this.rec].group] === b.dataset.shop));
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
      // (2.5.2) two compartments: what he brought up, and a basket of what to sell. Click a thing to move
      // it across; "Sell these" sells the basket, "Sell all" everything. Each kind is one row (×n).
      const atBoat = !sub.imploded && Math.hypot(sub.x - (BOAT.x + 8.5), sub.y - 2.6) < 20;
      const pick = this.sellPick || (this.sellPick = new Set());
      const items = []; // { key, html, value, keep }
      const groups = new Map();
      for (const sp of g.bag.concat(atBoat ? g.subTank : [])) { const k = sp.id + ':' + (sp.variant || ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(sp); }
      for (const [gk, list] of groups) {
        const [id, v] = gk.split(':'), spc = SPECIES_BY_ID[id];
        const value = list.reduce((a, x) => a + specimenValue(x), 0) * statValue(P, 'payFish');
        const worst = list.reduce((a, x) => Math.min(a, x.cond), 1), cn = conditionName(worst);
        const best = list.reduce((a, x) => (x.cond > a.cond ? x : a), list[0]);
        const keep = displayRefusal(P, best) ? '' : `<button class="sell-keep" data-sell="display" data-arg="${gk.replace(/:$/, '')}" title="Keep it in the gallery instead of selling it">Keep</button>`;
        items.push({ key: 'sp:' + gk, value, keep, html: `${this.mini(spc)}<span class="sell-name">${v ? `<span class="rare r-${v}">${VARIANTS[v].name}</span> ` : ''}${spc.name}${worst < 0.7 ? ` <em class="cond c-${cn}">${cn}</em>` : ''}</span>` + (list.length > 1 ? `<span class="sell-n">×${list.length}</span>` : '') });
      }
      const tg = new Map();
      for (const t of g.tags) { if (!tg.has(t.key)) tg.set(t.key, []); tg.get(t.key).push(t); }
      for (const [k, list] of tg) items.push({ key: 'tag:' + k, value: list[0].value * list.length * statValue(P, 'payFish'), html: `<span class="sell-name">Tag data: ${list[0].name}</span>` + (list.length > 1 ? `<span class="sell-n">×${list.length}</span>` : '') });
      for (const ph of g.photos) items.push({ key: 'photo:' + ph.key, value: ph.value * statValue(P, 'payFish'), html: `<span class="sell-name">Photograph: ${ph.name}</span>` });
      for (const [k, n] of Object.entries(g.inv)) if (n > 0 && GOODS[k] && k !== 'coral') items.push({ key: 'good:' + k, value: GOODS[k].price * n * statValue(P, 'paySalvage'), html: `<span class="sell-name">${GOODS[k].name}</span>` + (n > 1 ? `<span class="sell-n">×${n}</span>` : '') });
      for (const k of [...pick]) if (!items.some((it) => it.key === k)) pick.delete(k);
      if (!items.length) html = `<p class="shop-empty">Nothing aboard to sell.</p>`;
      else {
        const total = items.reduce((a, it) => a + it.value, 0), inB = items.filter((it) => pick.has(it.key)), bTotal = inB.reduce((a, it) => a + it.value, 0);
        const row = (it, act) => `<div class="sell-row"><button class="sell-item" data-sell="${act}" data-arg="${it.key}">${it.html}<b>${money(it.value)}</b></button>${act === 'tobasket' ? it.keep || '' : ''}</div>`;
        html += `<button class="primary" data-act="sellall">Sell all<span>${money(total)}</span></button>`;
        html += `<div class="sell-cols"><div class="sell-col"><h4>Your catch</h4>${items.filter((it) => !pick.has(it.key)).map((it) => row(it, 'tobasket')).join('') || '<p class="shop-empty">All in the basket.</p>'}</div>`;
        html += `<div class="sell-col basket"><h4>To sell</h4>${inB.map((it) => row(it, 'frombasket')).join('') || '<p class="shop-empty">Click something to put it here.</p>'}`;
        html += `<button class="sell-these" data-act="sellpick" ${inB.length ? '' : 'disabled'}>Sell these<span>${money(bTotal)}</span></button></div></div>`;
        if (!atBoat && g.subTank.length) html += `<p class="shop-note">${g.subTank.length} animal${g.subTank.length > 1 ? 's' : ''} in the sub's tank: bring the sub alongside to sell them.</p>`;
      }
      // the price board on the Margaret: chalked up after every sale, the newest first
      const board = P.board || [];
      if (board.length) html += `<div class="priceboard"><h4>Price board</h4>${board.map((r) => `<div><span>${r.label}</span><b>${money(r.each)}</b></div>`).join('')}</div>`;
    } else if (tab === 'diver') {
      html += this.upgradeGroups(P, ['Diver'], icon, can);
      html += this.suitRows(P, can);
    } else if (tab === 'tools') {
      html += this.upgradeGroups(P, ['Net', 'Slurp gun', 'Tag gun', 'Camera'], icon, can);
      html += '<div class="up-group"><h4>Traps</h4>';
      const tr = P.traps || {};
      TRAP_ORDER.forEach((k, i) => {
        const T = TRAPS[k], have = tr[k] || 0, full = have >= T.max;
        html += card(T.name, T.desc, `you own ${have} / ${T.max}`, full ? null : T.price, 'buy', 'trap:' + k, full ? 'Full' : 'Buy', '', icon('trap', i), [
          ['depth', `down to ${T.maxDepth.toLocaleString()} m`, 'press'], ['catch', `${T.count[0]}–${T.count[1]} fish in 5 min`], ['fish up to', `${T.maxLen} m long`],
          ['holds', `${T.holds}`], ['hauled', T.winch ? "by the boat's winch" : 'by hand', T.winch ? 'bad' : 'good']].concat(T.lure ? [['lure', 'lit: draws deep animals and it', 'bad']] : []));
      });
      html += '</div>';
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
      // the sub's trawl nets: one in the hatch at a time, each used up in one haul
      for (const [k, N] of Object.entries(NETS_SUB)) {
        const inHatch = g.items.net === k;
        html += card(N.name, N.desc, inHatch ? 'in the hatch' : g.items.net ? `replaces your ${NETS_SUB[g.items.net].name.toLowerCase()}` : 'the hatch is empty', inHatch ? null : N.price, 'buy', 'subnet:' + k, inHatch ? 'In the hatch' : 'Buy', '', '',
          [['holds', `${N.max} animals`], ['fish up to', `${N.maxLen} m`], ['mouth', `${(N.mouth * 2).toFixed(1)} m tall`], ['tears', N.tear > 0.5 ? 'often, on big animals' : 'seldom', N.tear > 0.5 ? 'bad' : 'good'], ['use', 'N in the sub, once', 'sheet']]);
      }
      for (const [k, it] of Object.entries(SUPPLIES)) {
        if (it.needs && !owns(P, it.needs)) continue; // tags only once he has the tag gun
        const mx = supplyMax(P, k), have = g.items[k] || 0, full = have >= mx;
        html += card(it.name, it.desc, `carrying ${have} / ${mx}`, full ? null : it.price, 'buy', k, full ? 'Full' : 'Buy', '', '', SUPPLY_SPECS[k]);
      }
    } else if (tab === 'radio') {
      const lists = [g.bag].concat(!sub.imploded && Math.hypot(sub.x - (BOAT.x + 8.5), sub.y - 2.6) < 20 ? [g.subTank] : []);
      if (!g.contracts.length) html += '<p class="shop-empty">Static. Nobody is calling.</p>';
      for (const c of g.contracts) {
        const r = contractReady(g, c, lists);
        html += `<div class="contract${r && c.taken ? ' ready' : ''}${c.taken ? ' taken' : ''}">${c.id ? this.mini(SPECIES_BY_ID[c.id]) : ''}<div><span>${c.who} wants</span><b>${c.text}</b></div><div class="pay">${money(c.pay)}${c.taken ? (r ? '<em>aboard: paid when you sell</em>' : '<em>accepted</em>') : `<button data-act="take" data-arg="${c.key}">Accept contract</button>`}</div></div>`;
      }
      const wait = refreshIn(P), left = Math.ceil(wait / 60000), hrs = Math.floor(left / 60), mins = left % 60;
      html += `<div class="radio-refresh">${wait ? `<span>New contracts in ${hrs ? hrs + ' h' : ''}${hrs && mins ? ' ' : ''}${mins || !hrs ? mins + ' min' : ''}</span>` : '<button data-act="refresh" data-arg="">New contracts</button><span>free every 3 hours; the ones you accepted stay</span>'}</div>`;
      html += '<p class="shop-note">Accept a contract and it shows on the right while you dive. It is paid when you sell with the goods aboard.</p>';
    } else if (tab === 'aquarium') {
      const A = aquariumOf(P), C = completion(P), list = Object.entries(A.display), slots = gallerySlots(P);
      html += `<div class="aq-head"><div><b>${list.length}<small>/${slots}</small></b><span>in the gallery</span></div><div><b>${C.species}</b><span>of ${C.of} species kept</span></div><div><b>${visitors(P)}</b><span>visitors a day</span></div><div><b>${list.length ? money(dailyIncome(P), false) : '—'}</b><span>a day in tickets</span></div></div>`;
      html += `<button class="primary" data-act="gallery" data-arg="">Walk the gallery<span>pet, feed, name, sell or release them</span></button>`;
      if (!list.length) html += `<p class="shop-empty">Four tanks set into the Margaret's bulkhead, waiting. Keep a live animal here instead of selling it (the button under it on the Sell tab): healthy, it becomes Happy after 5 minutes (sells for ×1.2), and 15 minutes later it earns the Famous tag (×2 more). Visitors leave a little money each day.</p>`;
      else {
        const cells = list.map(([, d]) => {
          const sp = SPECIES_BY_ID[d.id], key = 'aq' + d.id;
          if (!this.toolImgs) this.toolImgs = new Map();
          if (!this.toolImgs.has(key)) this.toolImgs.set(key, speciesIcon(sp, 120, 68).toDataURL());
          const st = d.cond <= 0.05 ? 'dead' : d.cond < 0.3 ? 'dying' : d.cond < 0.7 ? 'stressed' : d.famous ? 'famous' : isHappy(d) ? 'happy' : 'settling in';
          return `<div class="tank-cell st-${st.replace(' ', '-')}" style="border-color:${rarityOf(sp).col}" title="${variantLabel(sp, d.variant)} · ${st} · about ${money(earnsOf(d))} a day"><img src="${this.toolImgs.get(key)}" alt="">${d.variant ? `<i class="r-${d.variant}">${VARIANTS[d.variant].name}</i>` : ''}<span>${d.name ? d.name : sp.name}</span><em>${st}</em></div>`;
        }).join('') + Array.from({ length: slots - list.length }, () => '<div class="tank-cell empty"></div>').join('');
        html += `<div class="wing"><div class="wing-h"><b>Aboard</b><em>${list.length}/${slots}</em></div><div class="tanks">${cells}</div></div>`;
      }
      const lvG = P.galleryLv || 0;
      if (lvG < GALLERY_STEPS.length) html += card('More room in the gallery', 'Another pair of places in the tanks: pumps, chillers and glass.', `room for ${slots} now`, GALLERY_STEPS[lvG], 'buy', 'gallery', 'Fit', '', '', [['places', `${slots} → ${slots + 2}`, 'good']]);
      else html += '<p class="shop-note">The gallery is as big as the Margaret can hold.</p>';
      if (A.lastDay) html += `<p class="shop-note">Yesterday: ${A.lastDay.visitors} visitors, ${money(A.lastDay.income, false)} in tickets. Earned so far: ${money(A.earned, false)}.</p>`;
    }
    // the showcase window above the list: the selected item (or the recommended one, or the first),
    // drawn as it looks, now and next, with its figures and its buy button beside it
    let sel = null;
    if (SHOWCASE_TABS.has(tab)) {
      const keys = [...html.matchAll(/data-row="([^"]+)"/g)].map((m) => m[1]).filter((k) => previewOf(k, P));
      sel = keys.includes(this.shopSel[tab]) ? this.shopSel[tab] : keys.includes('up:' + this.rec) ? 'up:' + this.rec : keys[0] || null;
      if (sel) html = `<div class="showcase"><canvas class="sc-win"></canvas><div class="sc-info"></div></div>` + html;
    }
    $('shop-body').innerHTML = html;
    if (sel) this.fillShowcase(sel, P);
  }

  // copy the selected row's name, figures and button into the showcase, and start its drawing
  fillShowcase(sel, P) {
    const body = $('shop-body'), row = body.querySelector(`[data-row="${CSS.escape(sel)}"]`), info = body.querySelector('.sc-info');
    if (!row || !info) return;
    row.classList.add('sel');
    const nameEl = row.querySelector('.up-name, h3'), name = nameEl ? [...nameEl.childNodes].filter((n) => !(n.classList && n.classList.contains('info'))).map((n) => (n.outerHTML !== undefined ? n.outerHTML : n.textContent)).join('').trim() : ''; // (keeps the Recommended tape)
    const line = (row.querySelector('.up-line') || {}).textContent || '';
    const story = (row.querySelector('.story') || {}).textContent || '';
    const facts = [...row.querySelectorAll('.sheet-row, .bullets li')].slice(0, 6).map((r) => { const a = r.querySelector('span, em'), b = r.querySelector('b'); return `<div class="sc-fact${r.className.match(/p-good/) ? ' good' : r.className.match(/p-bad/) ? ' bad' : ''}"><span>${a ? a.textContent : ''}</span><b>${b ? b.textContent : ''}</b></div>`; }).join('');
    const btn = row.querySelector('button[data-act]');
    info.innerHTML = `<h3>${name}</h3>${line ? `<p class="sc-line">${line}</p>` : ''}<div class="sc-facts">${facts}</div>${story && !line ? `<p class="sc-story">${story}</p>` : ''}${btn ? btn.outerHTML : ''}`;
    const pv = previewOf(sel, P), cv = body.querySelector('.sc-win');
    const t0 = performance.now(), tick = () => {
      if (!cv.isConnected || $('workshop').hidden) return;
      drawShowcase(cv, pv, (performance.now() - t0) / 1000);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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

  // The one track the shop recommends right now: a deeper sub when his dives reach the sub's rating,
  // else air or the bag while they are still basic, else the cheapest step he can afford
  recommend(P, g) {
    const open = (t) => TRACKS[t] && lv(P, t) < TRACKS[t].max && (!TRACKS[t].needs || owns(P, TRACKS[t].needs));
    if (open('tHull') && !g.sub.imploded && (P.deepest || 0) >= g.sub.rated * 0.85) return 'tHull';
    if (open('tTank') && lv(P, 'tTank') < 2) return 'tTank';
    if (open('tBag') && lv(P, 'tBag') < 1 && (P.runs || 0) >= 2) return 'tBag';
    let best = null, bc = Infinity;
    for (const t of Object.keys(TRACKS)) { if (!open(t)) continue; const c = upgradeCost(P, t); if (c <= P.cash && c < bc) { bc = c; best = t; } }
    return best;
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
      // one row per track: its level, the price of the next step, and in its sheet every stat it moves
      for (const [id, T] of Object.entries(TRACKS)) {
        if (T.group !== grp) continue;
        const l = lv(P, id), maxed = l >= T.max, cost = upgradeCost(P, id), coins = upgradeCoins(P, id);
        const specs = [];
        if (id === 'tHull') {
          const d = lv(P, 'depth');
          specs.push(['now', `${SUBS[d].name}, ${SUBS[d].rated} m`]);
          if (!maxed) specs.push(['next', `${SUBS[d + 1].name}, ${SUBS[d + 1].rated} m · cabin air ${SUBS[d + 1].o2} s`, 'good']);
        } else for (const sid of T.stats) {
          const sl = lv(P, sid), U = UPGRADES[sid], nl = Math.min(U.max, Math.round((l + 1) / T.max * U.max));
          const now = fmtStat(sid, statAt(sid, sl)), next = fmtStat(sid, statAt(sid, nl));
          specs.push([U.name.toLowerCase(), maxed || nl === sl ? now : `${now} → ${next}`, maxed || nl === sl ? '' : 'good']);
        }
        specs.push(['level', maxed ? 'the most it can be' : `${l} of ${T.max}`, 'sheet']);
        html += this.row('up:' + id, T.name + (id === this.rec ? ' <em class="rec-badge">Recommended</em>' : ''), T.line || '',
          `<span class="lamps">${Array.from({ length: T.max }, (_, k) => `<i class="${k < l ? 'lit' : ''}"></i>`).join('')}</span>${maxed ? 'max' : ''}`,
          `<button data-act="buy" data-arg="up:${id}" ${maxed || !can(cost) || (P.coins || 0) < coins ? 'disabled' : ''}>${maxed ? '—' : money(cost)}${!maxed && coins ? ` <em class="pluscoin">+${COIN}${coins}</em>` : ''}</button>`,
          '', '', specs);
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
    try { runs = JSON.parse(localStorage.getItem(RUNLOG()) || '[]'); } catch (e) { runs = []; }
    runs.unshift(log);
    runs = runs.slice(0, 12);
    try { localStorage.setItem(RUNLOG(), JSON.stringify(runs)); } catch (e) { /* storage unavailable */ }
    this.runs = runs;
  }
  renderRuns(last) {
    let runs = this.runs;
    if (!runs) { try { runs = JSON.parse(localStorage.getItem(RUNLOG()) || '[]'); } catch (e) { runs = []; } }
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
    if (!$('cabin').hidden) { if (!g.aboard) this.toggleCabin(false); else this.cabin.update(dt); }
    if (!$('gallery').hidden) {
      const e = g.earl, aboard = (Math.abs(e.x - BOAT.x) < 16 && e.y < 5) || (e.inSub && g.sub.docked);
      if (!aboard) this.toggleGallery(false); else this.gallery.update(dt);
    }
  }
}
