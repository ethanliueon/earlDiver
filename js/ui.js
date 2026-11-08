// DOM overlays: home screen, journal, boat workshop, pause, run log.
import { SPECIES_BY_ID, SPECIES } from './species.js';
const SPECIES_COUNT = SPECIES.length;
// (4.14.2) a few words about each sub, for its own page
const SUB_ABOUT = [
  'A Soviet-era bathyscaphe the Margaret came with: a steel float, a two-man sphere slung underneath and a claw that has seen better days. Slow, honest and only good for the shelf.',
  'The same old boat, rebuilt at the yard: thicker sphere, new seals, a bigger motor. Still a bathyscaphe at heart, but the twilight is in reach.',
  'A yellow work boat built for the oil rigs: tough, quick on the throttle and roomy inside. Made to work all day in the twilight and the top of the midnight zone.',
  'The heavy version of the work boat: a reinforced sphere, extra ballast and a cargo frame. It takes real pressure and brings real hauls home.',
  'A scientist\'s submersible: syntactic foam, a clean hull and a cabin that keeps you breathing longer. The first true deep-sea machine.',
  'A deep research boat from an institute fleet: a thicker sphere, faster trim tanks and room for a proper catch. Comfortable well into the abyss.',
  'A titanium hull and a titanium sphere: light, very strong and fast. Built for expeditions that stay down for hours.',
  'The only kind of boat that can go anywhere in the sea: a full-ocean-depth hull, rated for the trench floor. There is nothing deeper.',
];
const SHOWCASE_TABS = new Set(['diver', 'tools']); // (4.14.0: the sub page draws its own)
import { speciesIcon, fittedIcon, speciesBox, drawSpecies } from './creatures_draw.js';
import { ABOUT } from '../data/species_about.js';
import { xEyes } from './gallery.js';
import { usualDepth } from './fauna.js';
import { RESOURCES, BOAT } from './world.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS, TRAPS, hullCap } from './economy.js';
import { toolIcon } from './tools_draw.js';
import { specimenValue, conditionName, rarityOf, rarityStars, rarityCls, rarityCol } from './specimens.js';
const badge = (sp) => { const r = rarityOf(sp); return r.hidden ? '' : `<span class="rbadge" style="--rc:${r.col}">${r.name}</span>`; }; // (animals that can't be captured show no rarity)
import { VARIANTS, VARIANT_KEYS, variantLabel, canBeRare } from './variants.js';
import { Gallery } from './gallery.js';
import { DaveShop } from './dave.js';
import { Cabin } from './cabin.js';
import { Catalog, pictureOf, MEASURES } from './catalog.js';
import { ITEMS, kitOf, KINDS, RARITY, SKILLS, LEGEND, SETS, LOCKER, totals, sellValue, FREE as FREE_IDS } from './items.js';
const SIDE_TOOLS = new Set(['slurp', 'tag', 'cam']);
import { kit as ensureKit } from './economy.js';
import { drawEarl } from './earl_draw.js';
import { SETTINGS, setSetting } from './settings.js';
import { aquariumOf, displayRefusal, dailyIncome, visitors, completion, gallerySlots, GALLERY_STEPS, earnsOf, isHappy, DAY } from './aquarium.js';
import { SUITS } from './economy.js';
import { WARES, upgradeCoins } from './economy.js';
import { TankRoom, sizeK, seaAt } from './tankroom.js'; // (sizeK: an animal's drawn size against a 2.4 m giant)
import { lockerTexture } from './textures.js';
import { ChestReveal, chestsOf, oddsText, chestPicture } from './chests.js';
import { TRAP_ORDER } from './economy.js';
import { trapsFree } from './traps.js';
import { tankSlots, pressSlots, tankUsed, pressUsed, NETS_SUB, netsOf, slotsOf, BIG as BIG_CH, gapOf, gapSigned, SAFE_GAP, hasBigTank, bigIn, bigFits, tooBig, freeChamber, tankFits, bagSlots } from './capture.js';
import { readSlot, lastSlot, deleteSlot, getSlot, SLOTS } from './economy.js';
import { statAt } from './economy.js';
import { pressureKind, pressureTolerance } from './specimens.js';
import { loadBest, UPGRADES, TRACKS, UPGRADE_DESC, UPGRADE_LINE, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat } from './economy.js';
import { refreshIn, ready as contractReady } from './contracts.js';
import { Q as questsOf, MAIN as QUEST_MAIN, QUEST_RARITY, boardIn, refreshPrice, questLeft, fillQuests, tutorialOn, stepLabel, GROUPS as QUEST_GROUPS, groupSpecies } from './quests.js';
import { TANKS, FINS, SUBS, SUB_TIERS, SUB_ADDONS, SUPPLIES, supplyMax, GOODS, PATCH_PRICE, replacementPrice, priceOf, marketTick, money } from './economy.js';
import { formatTime, clamp } from './util.js';
import { VERSION } from './version.js';
import { markOf, SUB_MARKS } from './earl_draw.js';
import { previewOf, drawShowcase } from './showcase.js';
import { subLook } from './render.js';


// the figures for the shop's cards, as dot points
const ADDON_SPECS = {
  recall: [['use', 'C calls the sub'], ['sub comes', '1.5× faster', 'good']],
  quiet: [['sub noise', '−50 %', 'good'], ['the deep', 'hears it less', 'good']],
};
const SUPPLY_SPECS = {
  lure: [['use', 'Q throws it'], ['effect', 'the deep thing follows its light', 'good'], ['lasts', 'a while']],
  necklace: [['use', 'E snaps it: 90 s, then it is spent'], ['effect', 'warm amber light round Earl, or round the sub while he is in her', 'good'], ['but', 'a light can be seen', 'bad']],
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
// (3.6.1) about what an animal weighs: the usual length-weight rule for fish (W = a L^3, a about 0.012 g/cm^3),
// heavier for a deep body and lighter for a slender one (by its drawn outline)
function aboutOf(sp) { return (ABOUT[sp.id] || sp.desc || '').replace(/[<>]/g, ''); }
function weightOf(sp, len) {
  const B = speciesBox(sp), shape = clamp((B.h / B.w) / 0.36, 0.35, 2.4), cm = len * 100;
  return (0.012 * shape * cm * cm * cm) / 1000;
}
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
    this.cabin = new Cabin($('cabin'), { close: () => this.toggleCabin(false), catalog: () => this.toggleCatalog(true), station: (id) => h.onStation && h.onStation(id), footstep: (v) => h.onFootstep && h.onFootstep(v), tankFish: () => { const P0 = h.getProfile && h.getProfile(); return P0 ? Object.values(aquariumOf(P0).display) : []; }, light: () => { const P0 = h.getProfile && h.getProfile(); return P0 ? aquariumOf(P0).light || 'day' : 'day'; }, blocked: () => !$('workshop').hidden || !$('catalog').hidden || this.confirmOpen(), tutHide: () => !!(h.tutHide && h.tutHide()), tutAllow: (id) => !h.tutAllowCabin || h.tutAllowCabin(id), suit: () => { const g0 = h.getGame(); return g0 && g0.earl ? g0.earl.suit : 'wet'; }, daylight: () => { const g0 = h.getGame(); return g0 && g0.day ? g0.day.light : 1; } });
    this.dave = new DaveShop($('dave'), { getProfile: () => h.getProfile(), getGame: () => h.getGame(), buy: (k) => { h.onBuy(k); }, sellFind: (k) => h.onDaveSell(k), payFinds: () => (h.payFinds ? h.payFinds() : 1), save: () => h.onSaveProfile && h.onSaveProfile(), close: () => this.toggleDave(false) });
    this.gallery = new Gallery($('gallery'), { catch: () => (h.aquariumCatch ? h.aquariumCatch() : []), act: (a2, k, v) => h.onGallery(a2, k, v), setLight: (l) => h.onGallery('light', l), getGame: () => h.getGame(), pay: () => h.payMul ? h.payMul() : 1, close: () => this.toggleGallery(false) });
    // (2.9.0) a chest opening, over whichever shop it was bought in
    this.chest = new ChestReveal($('chest'), { picture: (def, w, hh) => pictureOf(def.kind, def, w, hh, true), putOn: (u) => h.onEquip('on:' + u),
      close: () => { if (!$('dave').hidden) this.dave.render(); if (!$('catalog').hidden) this.catalog.render(); if (!$('cave').hidden) this.renderCave(); } });
    this.catalog = new Catalog($('catalog'), { toast: (t, k) => h.toast && h.toast(t, k), getProfile: () => h.getProfile(), getGame: () => h.getGame(), buy: (k) => h.onBuy(k), checkout: (keys) => h.onCheckout(keys), canSell: () => !!(h.canSellGear && h.canSellGear()), sellFind: (k) => h.onDaveSell && h.onDaveSell(k), findsHtml: () => (this.dave && this.dave.findsHtml ? this.dave.findsHtml() : ''), daveSays: () => (this.dave && this.dave.says ? this.dave.says() : ''), save: () => h.onSaveProfile && h.onSaveProfile(), close: () => this.toggleCatalog(false), yard: () => this.openShop('sub', ['sub']) });
    try { this.dressPanels(); } catch (err) { /* the plain look stays */ }
    this.tankRoom = new TankRoom($('tankroom'), { buy: (k) => { h.onBuy(k); this.tankRoom.sig = ''; }, act: (a2, w, i, to) => h.onTank(a2, w, i, to), getGame: () => h.getGame(), say: (t) => h.toast && h.toast(t, 'warn'), close: () => this.toggleTank(false) });
    this.caveSel = new Set();
    $('cave-body').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cave]');
      if (!b) { const i = ev.target.closest('button.info'); if (i) this.toggleInfo(i.closest('[data-row]')); return; }
      if (b.disabled) return;
      const k = b.dataset.cave;
      if (k.startsWith('tab:')) this.caveTab = k.slice(4);
      else if (k.startsWith('ware:')) h.onWare(k.slice(5));
      else if (k.startsWith('chest:')) h.onBuy(k);
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
      const yd = !ev.target.closest('button[data-act]') && ev.target.closest('[data-yd]'); if (yd) { const v = yd.dataset.yd; this.ydSub = v.startsWith('sub:') ? +v.slice(4) : null; this.ydAll = v === 'all' || v.startsWith('sub:'); this.renderWorkshop(); $('shop-body').scrollTop = 0; return; } // (4.14.2) all the subs, one sub, and back
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
        h.onBuy(arg); // (4.11.0) the hatch holds two beginner nets and an advanced one: nothing is replaced
      }
      else if (act === 'buy') h.onBuy(arg);
      else if (act === 'take') { h.onTakeContract(arg); }
      else if (act === 'refresh') { h.onRefreshContracts(); }
      else if (act === 'sellall') { const sale = h.onSellAll(); if (sale) this.showLedger(sale); }
      else if (act === 'tobasket') { (this.sellPick || (this.sellPick = new Set())).add(arg); }
      else if (act === 'frombasket') { this.sellPick && this.sellPick.delete(arg); }
      else if (act === 'sellpick') { const sale = h.onSellSome([...(this.sellPick || [])]); this.sellPick = new Set(); if (sale) this.showLedger(sale); }
      // (2.6.8) Keep only marks it (on the animal itself): it stays in the catch and in this list, darkened and
      // crossed out, and every sale leaves it alone; pressed again, it is back. Into the aquarium it goes only
      // when the player walks to the aquarium and puts it in.
      else if (act === 'keep') h.onKeep(arg, true);
      else if (act === 'unkeep') h.onKeep(arg, false);
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
    $('set-sound').addEventListener('click', () => { h.onMute && h.onMute(); this.renderSettings(); });
    document.querySelector('#inventory .inv-close').addEventListener('click', () => this.toggleInventory(false));
    $('inventory').addEventListener('click', (ev) => { if (ev.target === $('inventory')) this.toggleInventory(false); });
    $('set-graphics').addEventListener('click', () => { setSetting('fast', !SETTINGS.fast); this.renderSettings(); });
    $('set-fullscreen').addEventListener('click', () => { $('fullscreen').click(); setTimeout(() => this.renderSettings(), 250); });
    document.addEventListener('fullscreenchange', () => { if (this.settingsOpen()) this.renderSettings(); });
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
    $('namebox-line').textContent = line || 'The yard will paint it on the sub\'s hull, and on every hull after it.';
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
  showChest(key, q) { this.chest.open(key, q); }
  // (3.0.0) one of the old one's things, or a bundle, seen from where Earl is: what it is, and her price
  oldCard(html) {
    let el = document.getElementById('oldcard');
    if (!el) {
      el = document.createElement('section'); el.id = 'oldcard'; el.hidden = true; document.body.appendChild(el);
      el.addEventListener('click', (ev) => {
        if (ev.target === el || ev.target.closest('.oc-close')) { el.hidden = true; return; }
        const b = ev.target.closest('[data-oc]'); if (!b || b.disabled) return;
        if (this.h.onOldBuy(b.dataset.oc)) el.hidden = true;
      });
      window.addEventListener('keydown', (ev) => { if (!el.hidden && (ev.key === 'Escape' || ev.key.toLowerCase() === 'f')) { ev.preventDefault(); ev.stopImmediatePropagation(); el.hidden = true; } }, true);
    }
    if (html === null) { el.hidden = true; return; }
    el.innerHTML = `<div class="oc-box"><button class="oc-close" aria-label="Close">×</button>${html}</div>`; el.hidden = false;
  }
  oldCardOpen() { const el = document.getElementById('oldcard'); return !!el && !el.hidden; }
  // (3.0.0) the Quests button on the HUD (with a dot when one can be claimed) and its panel
  questsButton(show) {
    const b = $('quests-btn'); if (!b) return;
    if (!this.qWired) {
      this.qWired = true;
      b.addEventListener('click', () => this.toggleQuests());
      $('quests').querySelector('.qs-close').addEventListener('click', () => this.toggleQuests(false));
      $('quests').addEventListener('click', (ev) => {
        if (ev.target === $('quests')) { this.toggleQuests(false); return; }
        const a = ev.target.closest('[data-q]'); if (!a || a.disabled) return;
        const [act, arg] = a.dataset.q.split('|');
        if (act === 'info') { this.questInfo(arg); return; } // (4.8.1)
        if (act === 'claim') this.h.onQuestClaim(arg); else if (act === 'refresh') this.h.onQuestRefresh(arg === 'paid');
        this.renderQuests();
      });
    }
    const wrap = $('quests-hud'); wrap.hidden = !show;
    const P0 = this.h.getProfile && this.h.getProfile(), S0 = P0 && P0.quests, st = S0 && QUEST_MAIN[S0.main];
    wrap.querySelector('.qh-step').textContent = st && st.on ? stepLabel(P0) : ''; // (4.3.4) the first fish shows which part it is on
    const n = this.h.questsReady ? this.h.questsReady() : 0, dot = b.querySelector('i');
    dot.hidden = !n; if (n) dot.textContent = n;
    if (!$('quests').hidden && this.qLast !== Math.floor(performance.now() / 1000)) { this.qLast = Math.floor(performance.now() / 1000); this.renderQuests(); }
  }
  questsOpen() { return !$('quests').hidden; }
  // (4.8.1) a quest's i: what it asks, and where to go for it. A species: its card. A group: some of its animals and
  // the depths they keep. A depth: the sea in section with where he is, the depth asked for, and the nearest place
  // that deep. A tool or a challenge: how. An undocumented species: only where to look (no picture: that is the find).
  questInfo(key) {
    const P = this.h.getProfile(), g = this.h.getGame(), q = P && questsOf(P).board.find((x) => x.key === key); if (!q) return;
    let pop = $('quests').querySelector('.qs-pop');
    if (!pop) { pop = document.createElement('div'); pop.className = 'qs-pop'; $('quests').querySelector('.qs-panel').appendChild(pop); pop.addEventListener('click', (ev) => { if (ev.target.closest('.qp-close') || ev.target === pop) pop.hidden = true; }); }
    const esc2 = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const card = (sp) => { const [a, b] = usualDepth(sp), R0 = rarityOf(sp); return `<div class="qp-sp"><img src="${fittedIcon(sp, 240, 140).toDataURL()}" alt=""><div><b style="color:${R0 ? R0.col : 'inherit'}">${esc2(sp.name)}</b><i>${esc2(sp.sci || '')}</i><small>${/^(floor|floor-swim|demersal|reef)$/.test((sp.v && sp.v.hab) || '') && a < 5 ? `on the seabed, down to ${b.toLocaleString()} m` : `usually ${a.toLocaleString()}–${b.toLocaleString()} m`} · ${esc2(sp.zone || '')}${sp.oceans ? ' · ' + esc2(sp.oceans) : ''}</small></div></div>`; };
    let body = '', map = null, bed = null; // bed: [[lo, hi], ...] for animals that live on the bottom (the map lights where the seabed is that deep)
    const bottom = (sp) => /^(floor|floor-swim|demersal|reef)$/.test((sp.v && sp.v.hab) || '');
    if (q.kind === 'species' && SPECIES_BY_ID[q.id]) { const sp = SPECIES_BY_ID[q.id]; body = card(sp) + `<p>${esc2(sp.desc || '')}</p>` + (bottom(sp) ? '<p>It lives on the seabed: the lit stretches of the bottom on the map are where it is found.</p>' : '') + `<p>It has to come up alive: keep it in water, at its own pressure.</p>`; if (bottom(sp)) bed = [usualDepth(sp)]; else map = usualDepth(sp)[0]; }
    else if (q.kind === 'group' && QUEST_GROUPS[q.g]) {
      const G = QUEST_GROUPS[q.g], L = groupSpecies(q.g);
      if (G.undoc) { const d = Math.min(...L.map((s2) => s2.dmin)); body = `<p>Something no one has written down yet. They have been found from about ${d.toLocaleString()} m down, near the bottom. You will know one when you see it.</p>`; map = d; }
      else { const ex = L.slice().sort((a2, b2) => usualDepth(a2)[0] - usualDepth(b2)[0]).filter((_, i, A2) => i % Math.max(1, Math.floor(A2.length / 3)) === 0).slice(0, 3); const lo = Math.min(...L.map((s2) => usualDepth(s2)[0]));
        const onBed = L.filter(bottom).length >= L.length / 2;
        body = (onBed ? `<p>Any of ${L.length} kinds counts. They live on the seabed: the lit stretches of the bottom on the map are where they are found. Some of them:</p>` : `<p>Any of ${L.length} kinds counts. The shallowest of them are usually met from about ${lo.toLocaleString()} m. Some of them:</p>`) + ex.map(card).join('');
        if (onBed) bed = L.map((s2) => usualDepth(s2)); else map = lo; }
    } else if (q.kind === 'deep' || q.kind === 'depth') { body = `<p>${q.kind === 'depth' ? 'Take the sub down past' : 'Catch your animals below'} ${q.d.toLocaleString()} m. The map shows where you are, that depth, and the nearest place the seafloor is deep enough.</p>`; map = q.d; }
    else body = `<p>${{ catch: 'Any animal counts, caught any way: net, slurp gun, claw, trawl or trap.', sell: 'Everything sold counts: at the Margaret, at the station, or to Dave.', photo: 'Take out the camera (4) and photograph animals you have not photographed before.', tag: 'Take out the tag gun (3) and tag animals as they swim.', trawl: 'Let the trawl net out from the sub (N), drive through fish, and bring it in. Every animal it hauls up counts.', divecatch: 'Every animal caught in one dive counts; the count starts again each dive.', lureMonster: 'Throw a lure (Q) while the thing in the deep is close. It is far below, and it is dangerous.', chambers: 'Have every pressure chamber in the sub holding an animal at the same time.' }[q.kind] || ''}</p>`;
    if (map != null && map < 50) map = null; // (shallow open water: no map needed)
    pop.innerHTML = `<div class="qp-box"><button class="qp-close" aria-label="Close">×</button><h4>${esc2(q.text)}</h4>${body}${map != null || bed ? '<canvas class="qp-map" width="520" height="190"></canvas>' : ''}</div>`;
    pop.hidden = false;
    if ((map != null || bed) && g && g.world) this.drawQuestMap(pop.querySelector('.qp-map'), g, map, bed);
  }
  // the sea in section: the seafloor across the whole map, the depth asked for as a line, where he is, and the nearest
  // place the floor goes deeper than that
  drawQuestMap(cv, g, d, bed = null) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, Wd = 5000, D = 5200, X = (m) => (m / Wd) * W, Y = (y) => (y / D) * (H - 14) + 4;
    x.fillStyle = '#0d2230'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#4a4234'; x.beginPath(); x.moveTo(0, H); for (let m = 0; m <= Wd; m += 10) x.lineTo(X(m), Y(Math.max(0, g.world.floorAt(m)))); x.lineTo(W, H); x.closePath(); x.fill();
    x.font = '11px "IBM Plex Mono", monospace';
    const e = g.earl.inSub ? g.sub : g.earl; let best = null, bd = Infinity, bestY = 0;
    if (bed) {
      // (4.8.2) bottom animals: the seabed itself lit where it lies within their depths
      const lit = (m) => { const f = g.world.floorAt(m); return f > 1 && bed.some(([a, b]) => f >= a && f <= b); };
      x.strokeStyle = 'rgba(170,214,150,0.75)'; x.lineWidth = 2.5; x.lineCap = 'round'; // (4.8.3) a quiet line along the bottom, no glow
      x.beginPath(); let on = false;
      for (let m = 0; m <= Wd; m += 5) { const f = g.world.floorAt(m); if (lit(m)) { if (!on) { x.moveTo(X(m), Y(f)); on = true; } else x.lineTo(X(m), Y(f)); if (Math.abs(m - e.x) < bd) { bd = Math.abs(m - e.x); best = m; bestY = f; } } else on = false; }
      x.stroke();
      // (no 'nearest place' for the bottom: the lit seabed says where)
    } else {
      x.strokeStyle = 'rgba(242,184,74,0.85)'; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(0, Y(d)); x.lineTo(W, Y(d)); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#f2c868'; x.fillText(`${Math.round(d).toLocaleString()} m`, 6, Y(d) - 4);
      for (let m = 0; m <= Wd; m += 5) if (g.world.floorAt(m) > d + 15 && Math.abs(m - e.x) < bd) { bd = Math.abs(m - e.x); best = m; }
    }
    if (best != null && !bed) { x.fillStyle = '#9fdc8c'; x.beginPath(); x.arc(X(best), Y(d), 5, 0, Math.PI * 2); x.fill(); x.fillText('nearest place this deep', Math.min(W - 160, X(best) + 8), Y(d) + (Math.abs(X(best) - X(e.x)) < 130 && Math.abs(Y(d) - Y(Math.max(0, e.y))) < 30 ? 30 : 14)); }
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(X(e.x), Y(Math.max(0, e.y)), 4.5, 0, Math.PI * 2); x.fill(); x.fillText('you are here', Math.min(W - 92, X(e.x) + 7), Y(Math.max(0, e.y)) + (Y(e.y) < 20 ? 14 : -6));
  }
  toggleQuests(force) {
    const el = $('quests'), open = force === undefined ? el.hidden : force; el.hidden = !open;
    clearInterval(this.qTick);
    if (open) { this.renderQuests(); this.qTick = setInterval(() => { if ($('quests').hidden) { clearInterval(this.qTick); return; } const c = $('quests').querySelector('.qs-clock'), P = this.h.getProfile(); if (c && P) { const w = boardIn(P); if (w <= 0) this.renderQuests(); else { const t = Math.ceil(w / 1000); c.textContent = `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; } } }, 1000); } // (4.0.1) the clock ticks
  }
  // (4.12.2) after the tutorial's last claim: nothing on the board changes while it fades out and closes, and the new
  // board is only filled 3 s after that
  closeQuestsAfterTutorial() {
    this.qFreeze = true; this.boardWait = Date.now() + 450 + 3000;
    $('quests').classList.add('fading');
    setTimeout(() => { this.toggleQuests(false); $('quests').classList.remove('fading'); this.qFreeze = false; }, 450);
  }
  renderQuests() {
    const P = this.h.getProfile(); if (!P || this.qFreeze) return;
    if (this.boardWait && Date.now() < this.boardWait) { // the new board is being posted
      const m0 = QUEST_MAIN[questsOf(P).main];
      $('quests').querySelector('.qs-body').innerHTML = `<h3>The board</h3><p class="qs-locked">New quests are being posted…</p>`;
      clearTimeout(this.boardT); this.boardT = setTimeout(() => { if (!$('quests').hidden) this.renderQuests(); }, this.boardWait - Date.now() + 30); return;
    }
    fillQuests(P); const S = questsOf(P), m = QUEST_MAIN[S.main];
    const bar = (a, b) => `<div class="qs-bar"><i style="width:${Math.round(Math.min(1, b ? a / b : 1) * 100)}%"></i></div>`;
    let html = '';
    if (m) {
      const ok = S.mainProg >= m.need;
      html += `<h3>The Margaret's log</h3><div class="qs-q main${ok ? ' ready' : ''}"><div class="qs-t"><b>${m.text}</b><span>${m.help}</span>${m.need > 1 ? bar(S.mainProg, m.need) : ''}</div>
        <div class="qs-pay">${m.gift ? 'a gift' : money(m.pay, false)}${ok ? `<button data-q="claim|main">Claim</button>` : ''}</div></div>`;
    }
    html += `<h3>The board</h3>`;
    // (4.3.0) during the tutorial the board waits, so one step at a time is all there is to claim
    if (tutorialOn(P)) { $('quests').querySelector('.qs-body').innerHTML = html + `<p class="qs-locked">The board opens when the tutorial is done. Finish the Margaret's log steps first.</p>`; return; }
    const hm = (ms) => { const totM = Math.ceil(ms / 60000), h = Math.floor(totM / 60), mi = totM % 60; return h ? `${h} h ${mi} min` : `${mi} min`; };
    for (const q of S.board) {
      // (4.0.0) a claimed quest stays, dimmed, until its time runs out; a new one is marked NEW until the board is seen
      const ok = q.prog >= q.n, left = questLeft(q);
      const timer = q.claimed ? `done · a new quest in ${hm(left)}` : ok ? 'done: claim it' : `${hm(left)} left`;
      html += `<div class="qs-q r-${q.rarity}${ok && !q.claimed ? ' ready' : ''}${q.claimed ? ' claimed' : ''}"><div class="qs-t"><b>${q.text}${q.fresh ? '<i class="qs-new">New</i>' : ''}</b><small class="qs-time">${timer}</small>${q.n > 1 && !q.claimed ? bar(q.prog, q.n) + `<span>(${q.kind === 'sell' ? money(q.prog, false) + '/' + money(q.n, false) : q.prog + '/' + q.n})</span>` : ''}</div>
        <div class="qs-pay">${q.claimed ? '<span class="qs-paid">paid</span>' : money(q.pay, false)}${ok && !q.claimed ? `<button data-q="claim|${q.key}">Claim</button>` : ''}</div><button class="qs-info" data-q="info|${q.key}" title="About this quest">i</button></div>`;
    }
    // (4.0.0) the free refresh, or the next price on the ladder for this three-hour window
    const wait = boardIn(P), price = refreshPrice(P);
    // (4.0.1) the countdown is plain words under the board with a ticking green clock; only the button is brass
    const clock = (ms) => { const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sc = t % 60; return `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`; };
    html += `<div class="qs-foot">${wait > 0 ? `<span class="qs-wait">Free refresh in <b class="qs-clock">${clock(wait)}</b></span><button class="qs-buy" data-q="refresh|paid" ${P.cash < price ? 'disabled' : ''}>New quests now · ${money(price, false)}</button>` : '<span class="qs-wait">A free refresh is ready</span><button class="qs-buy" data-q="refresh|free">New quests · free</button>'}</div>`;
    $('quests').querySelector('.qs-body').innerHTML = html;
    if (!$('quests').hidden) { clearTimeout(this.qSeenT); this.qSeenT = setTimeout(() => { for (const q of S.board) q.fresh = false; }, 4000); } // (seen: no longer new)
  }
  anyOpen(except) { return (this.chart && this.chart.isOpen()) || this.stationsOpen() || this.oldCardOpen() || !$('chest').hidden || !$('quests').hidden || (except !== 'cabin' && !$('cabin').hidden) || !$('catalog').hidden || !$('journal').hidden || !$('workshop').hidden || !$('cave').hidden || !$('tankroom').hidden || !$('trapset').hidden || !$('gallery').hidden || !$('dave').hidden || !$('settings').hidden || !$('inventory').hidden; }
  closeAll() { this.chart && this.chart.toggle(false); this.toggleQuests(false); this.toggleDave(false); this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.toggleTank(false); this.toggleGallery(false); this.closeTrapSet(); }
  // the tank room, inside the sub: every place an animal can be kept, and what is in it
  tankOpen() { return !$('tankroom').hidden; }
  // a brass "are you sure?" plate: yes runs onYes; no, Esc or a click outside just closes it
  confirm(title, body, yes, no, onYes, onNo = null) {
    const el = $('confirm'), close = () => { el.hidden = true; window.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
    el.querySelector('.cf-title').textContent = title;
    el.querySelector('.cf-body').innerHTML = esc(body).replace(/\n/g, '<br>');
    el.querySelector('.cf-yes').textContent = yes; el.querySelector('.cf-no').textContent = no;
    el.querySelector('.cf-yes').onclick = () => { close(); onYes(); };
    el.querySelector('.cf-no').onclick = () => { close(); if (onNo) onNo(); }; // (4.2.0)
    el.onclick = (e) => { if (e.target === el) close(); };
    window.addEventListener('keydown', key, true);
    el.hidden = false; el.querySelector('.cf-no').focus();
  }
  confirmOpen() { return !$('confirm').hidden; }
  // (4.6.0) things gained: a row of cards in the middle of the screen, each the locker's own slot (its picture in
  // the rarity-edged box, a NEW tag in the corner) with the name under it and +1 at the bottom. The game runs on
  // behind them; a click anywhere sends them off early. entries: [{ kind: 'item'|'supply'|'trawl'|'trap', id }]
  showGains(entries) {
    if (!entries || !entries.length) return;
    let el = document.getElementById('gains');
    if (!el) {
      el = document.createElement('div'); el.id = 'gains'; document.body.appendChild(el);
      window.addEventListener('pointerdown', () => { if (el.classList.contains('in')) this.hideGains(); }, true);
    }
    const card = (e) => {
      let name = '', pic = '', r = 'supply';
      if (e.kind === 'item' && ITEMS[e.id]) { const it = ITEMS[e.id]; name = it.name; r = it.rarity; pic = pictureOf(it.kind, it, 120, 72, true); }
      else if (e.kind === 'supply' && SUPPLIES[e.id]) { name = SUPPLIES[e.id].name; pic = pictureOf('supply', e.id, 120, 72, true); }
      else if (e.kind === 'trawl' && NETS_SUB[e.id]) { name = NETS_SUB[e.id].name; pic = pictureOf('trawl', e.id, 120, 72, true); }
      else if (e.kind === 'trap' && TRAPS[e.id]) { name = TRAPS[e.id].name; pic = pictureOf('trap', e.id, 120, 72, true); }
      else return '';
      return `<div class="gain r-${r}"><div class="g-tile"><img src="${pic}" alt=""><i class="new">new</i>${r === 'legendary' ? '<span class="glint"></span>' : ''}</div><b>${name}</b><span class="g-plus">+1</span></div>`;
    };
    el.innerHTML = `<div class="g-row">${entries.slice(0, 5).map(card).join('')}</div>`;
    el.classList.remove('in', 'out'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(this.gainT); this.gainT = setTimeout(() => this.hideGains(), 2900);
  }
  // (4.11.0) N with more than one kind of net in the hatch: their cards in the middle of the screen, in the item
  // cards' look (picture, name, a number in a circle when there are two). Click one, or press its number; N or Esc
  // puts the choice away. The sea runs on behind it.
  pickNet(kinds, counts, onPick) {
    let el = document.getElementById('netpick');
    if (!el) { el = document.createElement('div'); el.id = 'netpick'; el.hidden = true; document.body.appendChild(el); }
    const close = () => { el.hidden = true; window.removeEventListener('keydown', key, true); this.netPickClose = null; };
    if (this.netPickClose) { this.netPickClose(); return; }
    const pick = (k) => { close(); onPick(k); };
    const key = (e) => {
      const k = e.key.toLowerCase(), i = '123'.indexOf(k);
      if (i >= 0 && all[i] && counts[all[i]]) { e.stopPropagation(); e.preventDefault(); pick(all[i]); }
      else if (k === 'escape' || k === 'n') { e.stopPropagation(); e.preventDefault(); close(); }
    };
    const all = Object.keys(NETS_SUB); // (4.11.1) every net, the ones not in the hatch greyed with a lock
    el.innerHTML = `<p class="np-title">Which net?</p><p class="np-hint">Click a net · N or Esc to cancel</p><div class="g-row">${all.map((k) => { const N = NETS_SUB[k], adv = k === 'adv', have = counts[k] || 0;
      return `<button class="gain np-card ${adv ? 'r-legendary' : 'r-common'}${have ? '' : ' np-none'}" data-net="${k}" ${have ? '' : 'disabled'}><div class="g-tile"><img src="${pictureOf('trawl', k, 120, 72, true)}" alt="">${have ? `<i class="np-n">×${have}</i>` : '<span class="np-lock" aria-label="Not in the hatch"><svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg></span>'}</div><span class="np-line">${adv ? `Up to ${N.max} animals, ${N.maxLen} m long · wide mouth · no legend escapes` : `Up to ${N.max} animals, ${N.maxLen} m long`}</span><b>${N.name}</b>${have ? '' : '<small class="np-out">Not in the hatch</small>'}</button>`; }).join('')}</div>`;
    el.onclick = (e) => { const b = e.target.closest('[data-net]'); if (b && !b.disabled) pick(b.dataset.net); else if (e.target === el) close(); };
    window.addEventListener('keydown', key, true);
    this.netPickClose = close; el.hidden = false;
  }
  netPickOpen() { const el = document.getElementById('netpick'); return !!el && !el.hidden; }
  hideGains() { const el = document.getElementById('gains'); if (!el) return; clearTimeout(this.gainT); el.classList.remove('in'); el.classList.add('out'); }
  // (4.0.0) after a purchase confirmed in the dialog: whatever shop is open shows the new state
  refreshOpen() {
    const open = (id) => { const el = $(id); return el && !el.hidden; };
    if (open('shop')) this.renderWorkshop();
    if (open('catalog') && this.catalog.render) this.catalog.render();
    if (open('dave') && this.dave.render) this.dave.render();
    if (open('cave')) this.renderCave();
    if (open('quests')) this.renderQuests();
    if (open('inventory')) this.renderInventory();
  }
  // the shop, opened on one tab (a station aboard the Margaret)
  openShop(tab, allowed = null, refit = false) {
    this.ydAll = false; this.ydSub = null;
    this.refitOnly = refit; // (4.12.6) from the tank room: the sub's upgrades and refits, but no new hull (that is the Margaret's yard)
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
  // (3.1.3) the other screens in the dive locker's style: each one's panel gets the same worn painted steel,
  // drawn for its size each time it opens (and when the window changes)
  dressPanels() {
    const PANELS = [['quests', '.qs-panel'], ['settings', '.set-panel'], ['workshop', '.shop-main'], ['trapset', '.shop-main'], ['pause', null], ['confirm', '.cf-plate']];
    const dress = (sec, sel) => { const el = sel ? sec.querySelector(sel) : sec; if (!el || sec.hidden) return;
      requestAnimationFrame(() => { const w = el.offsetWidth, h = el.offsetHeight; if (w < 40 || h < 40) return; const key = w + 'x' + h; if (el.dataset.tex === key) return;
        el.dataset.tex = key; el.classList.add('plated'); el.style.backgroundImage = `url(${lockerTexture(w, h, { plain: true })})`; el.style.backgroundSize = '100% 100%'; }); };
    for (const [id, sel] of PANELS) { const sec = $(id); if (!sec) continue;
      new MutationObserver(() => dress(sec, sel)).observe(sec, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
      dress(sec, sel); }
    window.addEventListener('resize', () => { for (const [id, sel] of PANELS) { const sec = $(id); if (sec) dress(sec, sel); } });
  }
  toggleInventory(force) { const el = $('inventory'); el.hidden = !(force === undefined ? el.hidden : force); if (!el.hidden) this.renderInventory(); }
  // B: what Earl has on him, what is in the sub, his gear
  renderInventory() {
    const g = this.h.getGame(), P = this.h.getProfile();
    if (!g || !P) { $('inventory').querySelector('.inv-body').innerHTML = '<p class="inv-empty">Nothing yet: start a dive.</p>'; return; }
    // (3.0.32) two pages: his gear, and his catch
    const tab = this.invTab || 'gear';
    const tabs = `<nav class="inv-tabs"><button data-invtab="gear" class="${tab === 'gear' ? 'on' : ''}">Gear</button><button data-invtab="catch" class="${tab === 'catch' ? 'on' : ''}">Catch <i>(${g.bag.length + g.subTank.length})</i></button></nav>`;
    const body = $('inventory').querySelector('.inv-body');
    body.innerHTML = (tab === 'catch' ? this.catchHtml(P, g) : this.equipHtml(P, g)) + tabs; // (3.0.33) the page switch: big, at the bottom middle
    // (3.0.33) the dive locker: a painted steel door, worn (textures.js), once
    const panel = $('inventory').querySelector('.inv-panel');
    this.fitInventory();
    // (3.0.34) drawn for this window's size and layout: the seam between the halves
    requestAnimationFrame(() => {
      const pr = panel.getBoundingClientRect(), right = panel.querySelector('.inv-right');
      if (!right || pr.width < 50) return;
      const rr = right.getBoundingClientRect(), k = this.invScale || 1;
      const W2 = panel.offsetWidth, H2 = panel.offsetHeight, split = Math.round((rr.left - pr.left) / k - 12);
      const key = [W2, H2, split].join(':'); if (panel.dataset.tex === key) return;
      panel.dataset.tex = key;
      panel.style.backgroundImage = `url(${lockerTexture(W2, H2, { split })})`; panel.style.backgroundSize = '100% 100%';
    });
    body.querySelectorAll('[data-invtab]').forEach((b2) => b2.addEventListener('click', () => { this.invTab = b2.dataset.invtab; this.lkSel = null; this.fishSel = null; this.renderInventory(); }));
    if (tab === 'gear') this.equipWire(P, g); else this.catchWire(g);
  }
  // the Catch page: his net bag as pockets, the sub's tank, what he has found, the sub itself
  // (3.0.35) the Catch page in two fixed halves. Left: the net bag, every pocket a bag can have (the ones his bag
  // hasn't, padlocked), and what it is all worth, one number. Right: the sub's own hardware: its open tank as a
  // water window split into compartments (a big animal takes two or three), its pressure chambers as portholes.
  catchHtml(P, g) {
    const ic = (sp) => { if (!this.toolImgs) this.toolImgs = new Map(); const k = 'inv' + sp.id; if (!this.toolImgs.has(k)) this.toolImgs.set(k, speciesIcon(sp, 160, 90).toDataURL()); return this.toolImgs.get(k); };
    const pay = statValue(P, 'payFish'), worth = (s2) => specimenValue(s2) * pay;
    const dot = (s2) => (s2.cond <= 0.05 ? '#8a6a5a' : s2.cond < 0.3 ? '#d08a5a' : s2.cond < 0.6 ? '#c8b060' : '#8ac88a');
    const state = (s2) => (s2.cond <= 0.05 ? 'dead' : conditionName(s2.cond));
    const card = (cls, s2, span = 1) => { const sp = SPECIES_BY_ID[s2.id];
      const pct = Math.round(Math.max(36, 100 * sizeK(s2.len || sp.len))); // (3.0.43) the picture at its real size, against a 2.4 m giant
      return `<div class="${cls}${rarityCls(sp)}"${span > 1 ? ` style="grid-column: span ${span}"` : ''} title="${sp.name}: ${state(s2)}, from ${Math.round(s2.from || 0)} m · ${(s2.len || sp.len).toFixed(2)} m">${rarityStars(sp)}<i class="fc-warn" title="In danger">!</i><img src="${ic(sp)}" alt="" style="transform:scale(${Math.min(1.25, pct / 100 * 1.3).toFixed(2)})"><b${rarityCol(sp) ? ` style="color:${rarityCol(sp)}"` : ''}>${sp.name}</b>${s2.variant ? `<em>${s2.variant}</em>` : ''}<span><i style="background:${dot(s2)}"></i>${state(s2)}</span><small>${money(worth(s2))}</small></div>`; };
    const rep2 = (h, n) => h.repeat(Math.max(0, n));
    // the bag: eleven cubbies, the ones beyond his bag padlocked
    const BAG_MAX = 12, cap = Math.round(statValue(P, 'bag')), shown = Math.max(BAG_MAX, cap);
    const inTrouble = (s2, inBag) => s2.cond > 0.05 && (s2.cond < 0.3 || gapOf(g, s2, inBag) > SAFE_GAP);
    const bag = g.bag.map((s2, i) => card(inTrouble(s2, true) ? 'fc trouble' : 'fc', s2).replace(/^<div class="fc[^"]*"/, (m) => `${m} data-b="${i}"`)).join('') + rep2('<div class="fc empty"></div>', cap - g.bag.length) + rep2('<div class="fc locked"><i></i></div>', shown - Math.max(cap, g.bag.length));
    const all = g.bag.concat(g.subTank || []), total = all.reduce((t, s2) => t + worth(s2), 0);
    // the sub: the open tank itself, its animals swimming as they do in the sub, and the chambers as they hang there
    const M = SUB_MARKS[markOf(statValue(P, 'depth'))], tank = g.subTank || [];
    const open = tank.filter((s2) => !s2.pressed && !s2.pile), floor = tank.filter((s2) => s2.pile), big = tank.filter((s2) => s2.pressed && s2.chamber === BIG_CH);
    const chambers = tank.filter((s2) => s2.pressed && s2.chamber !== BIG_CH), oCap = tankSlots(g), pCap = pressSlots(g), oUsed = open.reduce((t, s2) => t + slotsOf(s2), 0);
    const elsewhere = floor.length ? `On the floor: ${floor.map((s2) => SPECIES_BY_ID[s2.id].name).join(', ')} · ` : '';
    const bigCap = big.some(tooBig) ? 1 : 3;
    const subName = g.sub.imploded ? 'lost' : `${M.named ? (P.subName || 'EARL') + ' · ' : ''}${M.name}`;
    this.catchShown = Math.max(5, pCap);
    return `<div class="inv-split inv-catch2"><div class="inv-left"><h4>The net bag <i>(${g.bag.length}/${cap})</i></h4><div class="fc-grid g4">${bag}</div>`
      + `<div class="worth-paint" style="font-size:${Math.min(160, Math.floor(540 / (money(total).length * 0.6)))}px" title="What the bag and the sub hold would sell for, about">${money(total)}</div></div>`
      + `<div class="inv-right"><div class="sub-bay"><div class="sb-name"><b>${subName}</b><span>rated ${g.sub.rated} m</span></div>`
      + `<h4>The open tank <i>(${oUsed}/${oCap})</i></h4><div class="tank-win${open.some((s2) => inTrouble(s2, false)) ? ' trouble' : ''}"><canvas class="ct-tank"></canvas><i class="fc-warn" title="An animal in danger">!</i></div>`
      + `<h4>Pressure chambers <i>(${chambers.length}/${pCap})</i></h4><canvas class="ct-ch"></canvas>`
      // (3.2.0) the large pressure tank, laid on its side as it is in the sub (padlocked until it is fitted)
      + (hasBigTank(g) ? `<h4>Large pressure tank <i>(${big.length}/${bigCap})</i></h4><canvas class="ct-big"></canvas>` : `<h4 class="off">Large pressure tank <i>not fitted</i></h4>`)
      + `<p class="ct-cap">${elsewhere}Click an animal for its card · drag it to move it${g.earl && g.earl.inSub ? '' : ' (in the sub)'}</p></div></div></div>`
      + (this.fishSel ? this.fishPop(P, g) : '');
  }
  // (3.2.0) where an animal is: { list: 'bag' | 'tank' (the index space tankAction uses), i, place, n }
  fishWhere(g, s2) {
    let i = g.bag.indexOf(s2); if (i >= 0) return { where: 'bag', i, place: 'bag' };
    i = (g.subTank || []).indexOf(s2); if (i < 0) return null;
    const place = s2.pile ? 'floor' : !s2.pressed ? 'open' : s2.chamber === BIG_CH ? 'big' : 'chamber';
    return { where: 'tank', i, place, n: s2.chamber };
  }
  // (3.2.0) an animal's card, like a piece of gear's: its picture at a fixed size top left (a frogfish as big as a
  // shark), its name in its rarity's colour with its stars, what it is, where it was found and lives, what it is
  // worth, how it is; along the bottom, small arrow-style moves, which work only in the sub
  fishPop(P, g) {
    const s2 = this.fishSel, at = s2 && this.fishWhere(g, s2); if (!at) { this.fishSel = null; return ''; }
    const sp = SPECIES_BY_ID[s2.id], R = rarityOf(sp), col = rarityCol(sp) || 'var(--paint)';
    if (!this.fitPics) this.fitPics = new Map();
    if (!this.fitPics.has(sp.id)) this.fitPics.set(sp.id, fittedIcon(sp, 300, 180).toDataURL());
    const dying = s2.cond > 0.05 && gapOf(g, s2, at.place === 'bag') > SAFE_GAP;
    const st = s2.cond <= 0.05 ? ['dead', '#8a6a5a'] : dying ? ['dying: barotrauma', '#e8806a'] : [conditionName(s2.cond), s2.cond < 0.3 ? '#d08a5a' : s2.cond < 0.6 ? '#c8b060' : '#8ac88a'];
    const place = { bag: 'In the net bag', open: 'The open tank', chamber: `Pressure chamber ${(at.n || 0) + 1}`, big: 'The large pressure tank', floor: 'On the floor of the sub' }[at.place];
    // (3.6.1) the specimen station: a small lit aquarium on the left, the animal swimming in water the colour of
    // its own depth (drawCatch keeps it moving); its record on the right
    const len = (s2.len || sp.len), kg = weightOf(sp, len);
    const low = gapSigned(g, s2, at.place === 'bag') > 0; // (home deeper than here: the pressure is too low for it)
    const status0 = s2.cond <= 0.05 ? ['Dead', 'dead'] : dying ? [`Dying <span class="sp-why">(pressure too ${low ? 'low' : 'high'})</span>`, 'dying'] : s2.cond < 0.6 ? [s2.cond < 0.3 ? 'Weak' : 'Stressed', 'weak'] : ['Healthy', 'live'];
    const status = s2.safe && s2.cond > 0.05 ? [`${status0[0]} <span class="sp-safe">✓ safe at the surface</span>`, status0[1]] : status0; // (4.0.0)
    const where = { bag: 'Net bag', open: 'Open tank', chamber: `Pressure chamber ${(at.n || 0) + 1}`, big: 'Large pressure tank', floor: 'Sub, on the floor' }[at.place];
    const row = (k, v, cls = '') => `<div class="sp-r${cls}"><dt>${k}</dt><dd>${v}</dd></div>`;
    // (3.6.2) metric, with feet and pounds beside it
    const hab = usualDepth(sp); // (3.7.3) where it is usually met here, not the record extremes
    const FT = 3.28084, LB = 2.20462, ft = (m) => Math.round(m * FT).toLocaleString(), u = (t) => ` <span class="sp-u">(${t})</span>`;
    const kgTxt = kg < 0.1 ? kg.toFixed(3) : kg < 10 ? kg.toFixed(kg < 1 ? 2 : 1) : Math.round(kg).toLocaleString(), lb = kg * LB, lbTxt = lb < 10 ? lb.toFixed(lb < 1 ? 2 : 1) : Math.round(lb).toLocaleString();
    const rows = row('Found at', `${Math.round(s2.from || 0).toLocaleString()} m${u(ft(s2.from || 0) + ' ft')}`) + row('Habitat', `${hab[0].toLocaleString()}–${hab[1].toLocaleString()} m${u(ft(hab[0]) + '–' + ft(hab[1]) + ' ft')}`)
      + row('Length', `${len.toFixed(2)} m${u((len * FT).toFixed(1) + ' ft')}${tooBig(s2) ? ' <small>over chamber limit</small>' : ''}`) + row('Weight', `${kgTxt} kg${u(lbTxt + ' lb')}`)
      + row('Location', where) + row('Status', `<i class="sp-dot"></i>${status[0]}`, ` st-${status[1]}`) + row('Value', money(specimenValue(s2) * statValue(P, 'payFish')), ' val');
    const inSub = this.h.inSub ? this.h.inSub() : false, w = at.where, i = at.i, mv = (label, act, to = -1, on = true) => `<button data-fm="${act}:${w}:${i}:${to}"${on ? '' : ' disabled'}>${label}</button>`;
    let acts = '';
    if (inSub) {
      if (tooBig(s2)) { if (at.place !== 'big') acts += hasBigTank(g) ? mv('Large tank', 'press', BIG_CH, bigFits(g, s2)) : ''; }
      else if (at.place !== 'chamber') { const f = freeChamber(g, s2); if (pressSlots(g) > 0) acts += mv('Chamber', 'press', f, f >= 0); }
      if (!tooBig(s2) && hasBigTank(g) && at.place !== 'big') acts += mv('Large tank', 'press', BIG_CH, bigFits(g, s2));
      if (at.place !== 'open') acts += mv('Open tank', 'open', -1, tankFits(g, { ...s2, pressed: false, pile: false }));
      if (at.place !== 'bag') acts += mv('Net bag', 'tobag', -1, g.bag.length < bagSlots(g));
      acts += mv('Release', 'release');
    }
    const remark = inSub ? '' : at.place === 'bag' ? 'Moved in the sub: board it (or call it with C), then drag it to a tank.' : 'Held in the sub: move it from there (T in the sub).';
    const R2 = R && !R.hidden ? R : null;
    this.aqSel = { s: s2, sp, home: s2.home ?? s2.from ?? (sp.dmin + sp.dmax) / 2 }; this.aqDying = dying;
    return `<div class="item-pop fish-pop"><div class="sp-panel${R2 && R2.id === 'legendary' ? ' leg' : ''}" style="--rc:${col}"><button class="ip-close" aria-label="Close">×</button>
      <div class="sp-tank"><canvas class="sp-aq"></canvas><p class="sp-about">${aboutOf(sp)}</p></div>
      <div class="sp-info"><span class="sp-kind">${(sp.cat || '').replace(/&/g, 'and')}</span>${R2 ? `<span class="sp-rar">${R2.name}${rarityStars(sp)}</span>` : ''}<b class="sp-name">${sp.name}</b>
        ${sp.species || sp.sci ? `<span class="sp-sci">${sp.species ? `${sp.species} · ` : ''}<i>${sp.sci || ''}</i></span>` : ''}${s2.variant ? `<span class="sp-var">Rare form: ${s2.variant}</span>` : ''}
        <dl class="sp-rows">${rows}</dl>
        ${acts ? `<div class="sp-acts"><span>Move to</span>${acts}</div>` : `<p class="sp-remark">${remark}</p>`}</div></div></div>`;
  }
  // a move made from the Catch page; a refusal is said here too (in the sub's rooms the room says it)
  tankDo(act, w, i, to) {
    const r = this.h.onTank(act, w, i, to), g = this.h.getGame();
    return r;
  }
  // (3.6.1) the specimen station's aquarium: a glass box on a steel base, its water the colour of the animal's
  // own depth, sand, a stone, rising bubbles; the animal swims slowly back and forth (a dead one floats belly-up)
  drawSpecimenTank(dt) {
    const cv = $('inventory').querySelector('canvas.sp-aq'), A = this.aqSel; if (!cv || !A) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (this.invScale || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    const t = (this.aqT = (this.aqT || 0) + dt), sea = seaAt(A.home), dead = A.s.cond <= 0.05;
    // (3.7.1) a real tank: a steel rim on top, glass walls with green-edged corners and silicone seams, a thick glass
    // floor pane on a steel stand
    const rimH = 9, baseH = 16, paneH = 6, top = rimH + 2, bot = h - baseH - paneH, glass = { x: 10, y: top, w: w - 20, h: bot - top };
    const wg = x.createLinearGradient(0, glass.y, 0, glass.y + glass.h), lift = (c, k) => c.map((v) => Math.round(v + (255 - v) * k));
    wg.addColorStop(0, `rgb(${lift(sea, 0.16).join(',')})`); wg.addColorStop(1, `rgb(${sea.map((v) => Math.round(v * 0.55)).join(',')})`);
    x.fillStyle = wg; x.fillRect(glass.x, glass.y, glass.w, glass.h);
    x.save(); x.globalAlpha = 0.07; x.fillStyle = '#e8f4f0';
    for (let k = 0; k < 3; k++) { const bx = glass.x + glass.w * (0.2 + k * 0.28) + Math.sin(t * 0.4 + k) * 6; x.beginPath(); x.moveTo(bx, glass.y); x.lineTo(bx + 22, glass.y); x.lineTo(bx + 48, bot); x.lineTo(bx + 12, bot); x.fill(); }
    x.restore();
    const sandTop = bot - 12;
    x.fillStyle = '#6a5e48'; x.beginPath(); x.moveTo(glass.x, bot);
    for (let sx = 0; sx <= glass.w; sx += 10) x.lineTo(glass.x + sx, sandTop + 2 - Math.sin(sx * 0.06) * 3); x.lineTo(glass.x + glass.w, bot); x.fill();
    x.fillStyle = '#3e4040'; x.beginPath(); x.ellipse(glass.x + glass.w * 0.8, sandTop, 16, 8, -0.2, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 9; k++) { const q = (t * 0.3 + k / 9) % 1; x.strokeStyle = `rgba(220,240,255,${(0.5 * (1 - q)).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.arc(glass.x + glass.w * 0.8 + Math.sin(q * 10 + k) * 3, sandTop - 6 - q * (glass.h - 24), 1.3 + (k % 3) * 0.6, 0, Math.PI * 2); x.stroke(); }
    // (3.6.2) the animal as well as it is; (3.7.1) at its real size against the others (a clownfish small, a
    // two-metre legendary filling the tank), and never out of the glass
    const c = A.s.cond, stressed = !dead && c < 0.6, dyingNow = !dead && (c < 0.3 || (this.aqDying || false));
    const B = speciesBox(A.sp), len = A.s.len || A.sp.len;
    const fitL = Math.min((glass.w * 0.86) / B.w, ((sandTop - glass.y) * 0.8) / B.h);
    let L = Math.max(fitL * 0.16, fitL * sizeK(len));
    const pace = dead ? 0 : dyingNow ? 0.12 : stressed ? 0.2 : 0.35;
    this.aqPh = (this.aqPh || 0) + dt * pace;
    const ph = this.aqPh, face = Math.cos(ph) >= 0 ? 1 : -1;
    const rollQ = dyingNow ? Math.max(0, Math.sin(t * 0.55)) : 0, flipY = dead ? -1 : dyingNow && rollQ > 0.92 ? Math.cos((rollQ - 0.92) / 0.08 * Math.PI) : 1;
    const list = dead ? 0 : dyingNow ? 0.5 + Math.sin(t * 0.8) * 0.12 : stressed ? 0.18 : 0;
    // how far the turned body reaches from its centre; shrink it if it could not fit at all
    let ex, ey;
    const reach = () => { const hw = (B.w * L) / 2, hh = (B.h * L) / 2, cs = Math.abs(Math.cos(list)), sn = Math.abs(Math.sin(list)); ex = hw * cs + hh * sn; ey = hw * sn + hh * cs; };
    reach(); const room = Math.min((glass.w / 2 - 6) / ex, ((sandTop - glass.y) / 2 - 4) / ey); if (room < 1) { L *= room; reach(); }
    const x0 = glass.x + ex + 6, x1 = glass.x + glass.w - ex - 6, y0 = glass.y + ey + 4, y1 = sandTop - ey - 2;
    const midX = (x0 + x1) / 2, spanX = Math.max(0, (x1 - x0) / 2);
    const fx = dead ? midX + Math.sin(t * 0.25) * Math.min(8, spanX) : midX + Math.sin(ph) * spanX;
    const want = dead ? 0 : dyingNow ? 1 : stressed ? 0.75 : 0.45 + Math.sin(t * 0.9) * 0.12;
    const fy = y0 + (Math.max(0, y1 - y0)) * Math.max(0, Math.min(1, want));
    x.save(); x.beginPath(); x.rect(glass.x, glass.y, glass.w, glass.h); x.clip();
    x.translate(fx, fy); x.rotate(list * face);
    x.scale(-face, Math.abs(flipY) < 0.08 ? 0.08 * Math.sign(flipY || 1) : flipY);
    x.translate(-(B.x0 + B.w / 2) * L, -(B.y0 + B.h / 2) * L);
    if (dead) x.filter = 'saturate(0.35) brightness(0.8)'; else if (dyingNow) x.filter = 'saturate(0.55)'; else if (stressed) x.filter = 'saturate(0.8)';
    try { drawSpecies(x, A.sp, L, dead ? 0 : t * (dyingNow ? 0.4 : stressed ? 0.8 : 1.4), dead ? 0 : dyingNow ? 0.15 : stressed ? 0.35 : 0.6, 0); if (dead) xEyes(x, L, A.sp); } catch (e) { /* the empty tank, then */ }
    x.filter = 'none';
    x.restore();
    // the glass walls: a sheen, then thick green-edged glass at each side with a silicone bead in the corner
    const gl = x.createLinearGradient(glass.x, 0, glass.x + glass.w, 0); gl.addColorStop(0, 'rgba(255,255,255,0.12)'); gl.addColorStop(0.07, 'rgba(255,255,255,0)'); gl.addColorStop(0.93, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.08)');
    x.fillStyle = gl; x.fillRect(glass.x, glass.y, glass.w, glass.h);
    for (const [sx, dir] of [[glass.x - 4, 1], [glass.x + glass.w, -1]]) {
      const eg = x.createLinearGradient(sx, 0, sx + 4, 0); eg.addColorStop(0, 'rgba(120,190,170,0.55)'); eg.addColorStop(1, 'rgba(60,120,110,0.35)');
      x.fillStyle = eg; x.fillRect(sx, glass.y - 2, 4, glass.h + paneH + 2); // the glass edge, seen end-on: green
      x.fillStyle = 'rgba(20,24,22,0.55)'; x.fillRect(dir > 0 ? glass.x : glass.x + glass.w - 2, glass.y, 2, glass.h); // the silicone seam
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(sx + (dir > 0 ? 1 : 2), glass.y, 1, glass.h); // light along the edge
    }
    // the floor pane: thick glass under the sand, its edge green
    const pg = x.createLinearGradient(0, bot, 0, bot + paneH); pg.addColorStop(0, 'rgba(150,210,190,0.75)'); pg.addColorStop(0.5, 'rgba(70,130,115,0.8)'); pg.addColorStop(1, 'rgba(40,80,70,0.85)');
    x.fillStyle = pg; x.fillRect(glass.x - 4, bot, glass.w + 8, paneH);
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(glass.x - 4, bot, glass.w + 8, 1);
    // the steel rim on top and the stand below, its corner brackets bolted on
    const steel = (y0, hh, a, b2, c2) => { const rg = x.createLinearGradient(0, y0, 0, y0 + hh); rg.addColorStop(0, a); rg.addColorStop(0.5, b2); rg.addColorStop(1, c2); x.fillStyle = rg; x.fillRect(2, y0, w - 4, hh); };
    steel(0, rimH, '#7a8280', '#454b49', '#222625');
    steel(bot + paneH, baseH, '#5a6260', '#353b39', '#181b1a');
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(2, bot + paneH, w - 4, 1);
    for (const bx of [3, w - 15]) { x.fillStyle = '#2a2e2d'; x.fillRect(bx, 0, 12, rimH + 10); x.fillRect(bx, bot - 8, 12, paneH + baseH + 8);
      x.fillStyle = '#9aa29e'; for (const by of [5, rimH + 5, bot - 3, bot + paneH + baseH - 5]) { x.beginPath(); x.arc(bx + 6, by, 1.5, 0, Math.PI * 2); x.fill(); } }
  }
  theName(sp) { return /^the /i.test(sp.name) ? sp.name.replace(/^the/, 'The') : 'The ' + sp.name.toLowerCase(); }
  // the Catch page's clicks and drags: a click on an animal (a bag pocket, or one in a tank) opens its card; a
  // press and drag carries it to the bag, the open tank, a chamber or the large tank. Wired once, on the
  // inventory itself, so it outlives every redraw of the page.
  catchWire(g) {
    const root = $('inventory'), pop = root.querySelector('.fish-pop');
    // (3.6.2) the station's steel: the locker's worn paint, drawn for its size, darkened (see .sp-panel)
    const panel = pop && pop.querySelector('.sp-panel');
    if (panel) requestAnimationFrame(() => { const w = panel.offsetWidth, h = panel.offsetHeight; if (w > 40 && h > 40) panel.style.setProperty('--tex', `url(${lockerTexture(w, h, { plain: true })})`); });
    if (pop) pop.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-fm]');
      if (b) { if (b.disabled) return; const [act, w, i, to] = b.dataset.fm.split(':'); const r = this.tankDo(act, w, +i, +to); if (r !== false && act === 'release') this.fishSel = null; this.renderInventory(); return; }
      if (ev.target === pop || ev.target.closest('.ip-close')) { this.fishSel = null; this.renderInventory(); }
    });
    if (this.catchDragWired) return;
    this.catchDragWired = true;
    const game = () => this.h.getGame(); // (the game now, not the one there was when this was wired)
    root.addEventListener('pointerdown', (ev) => {
      if (this.invTab !== 'catch' || ev.button > 0 || ev.target.closest('.item-pop')) return;
      const s2 = this.catchFishAt(ev.clientX, ev.clientY); if (!s2) return;
      this.cDrag = { s: s2, x: ev.clientX, y: ev.clientY, moved: false };
      ev.preventDefault();
    });
    window.addEventListener('pointermove', (ev) => {
      const d = this.cDrag; if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) {
        d.moved = true; const sp = SPECIES_BY_ID[d.s.id];
        if (!this.fitPics) this.fitPics = new Map();
        if (!this.fitPics.has(sp.id)) this.fitPics.set(sp.id, fittedIcon(sp, 300, 180).toDataURL());
        d.ghost = document.createElement('img'); d.ghost.className = 'fish-ghost'; d.ghost.src = this.fitPics.get(sp.id); document.body.appendChild(d.ghost);
      }
      if (d.ghost) {
        d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = ev.clientY + 'px';
        const tgt = this.catchDropAt(ev.clientX, ev.clientY);
        root.querySelectorAll('.drop-on').forEach((el) => el.classList.remove('drop-on'));
        if (tgt && tgt.el) tgt.el.classList.add('drop-on');
      }
    });
    const end = (ev) => {
      const d = this.cDrag; if (!d) return; this.cDrag = null;
      if (d.ghost) d.ghost.remove();
      root.querySelectorAll('.drop-on').forEach((el) => el.classList.remove('drop-on'));
      const g2 = game(); if (!g2 || ev.type === 'pointercancel') return;
      if (!d.moved) { this.fishSel = d.s; this.renderInventory(); return; } // a click: its card
      const tgt = this.catchDropAt(ev.clientX, ev.clientY); if (!tgt) return;
      this.catchMove(g2, d.s, tgt);
    };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  }
  // the animal under the pointer on the Catch page, or null
  catchFishAt(cx, cy) {
    const g = this.h.getGame(), root = $('inventory'); if (!g) return null;
    const el = document.elementFromPoint(cx, cy); if (!el || !root.contains(el)) return null;
    const card = el.closest('.inv-catch2 .fc[data-b]'); if (card) return g.bag[+card.dataset.b] || null;
    const k = this.invScale || 1;
    for (const [sel, hits] of [['.ct-tank', this.tankHits], ['.ct-ch', this.chHits], ['.ct-big', this.bigHits]]) {
      const c = root.querySelector(sel); if (!c || el !== c) continue;
      const r = c.getBoundingClientRect(), x = (cx - r.left) / k, y = (cy - r.top) / k;
      let best = null, bd = 1e9; for (const h2 of hits || []) { const d = Math.hypot(h2.x - x, h2.y - y), rr = h2.r || Math.max(18, (h2.L || 30) * 0.5); if (d < rr * 1.3 && d < bd) { bd = d; best = h2.s; } }
      return best;
    }
    return null;
  }
  // where a dragged animal would land: { kind: 'bag' | 'open' | 'chamber' | 'big', n, el }
  catchDropAt(cx, cy) {
    const root = $('inventory'), el = document.elementFromPoint(cx, cy); if (!el || !root.contains(el)) return null;
    const left = el.closest('.inv-catch2 .inv-left'); if (left) return { kind: 'bag', el: left.querySelector('.fc-grid') };
    const tank = el.closest('.tank-win'); if (tank) return { kind: 'open', el: tank };
    if (el.matches('canvas.ct-big')) return { kind: 'big', n: BIG_CH, el };
    if (el.matches('canvas.ct-ch')) { const r = el.getBoundingClientRect(), n = Math.floor((cx - r.left) / (r.width / (this.catchShown || 5))); return { kind: 'chamber', n, el }; }
    return null;
  }
  // (3.2.0) a drop on the Catch page: the same move as in the sub's rooms, or why it can't be made
  catchMove(g, s2, tgt) {
    const at = this.fishWhere(g, s2); if (!at) return;
    const same = (tgt.kind === 'bag' && at.place === 'bag') || (tgt.kind === 'open' && at.place === 'open') || (tgt.kind === 'big' && at.place === 'big') || (tgt.kind === 'chamber' && at.place === 'chamber' && at.n === tgt.n);
    if (same) return;
    const sp = SPECIES_BY_ID[s2.id], say = (t) => this.h.toast && this.h.toast(t, 'warn');
    if (!(this.h.inSub && this.h.inSub())) {
      say(at.place === 'bag' ? `You aren't in the sub: get in to put ${this.theName(sp).replace(/^The/, 'the')} in a tank` : `${this.theName(sp)} is in the sub: get in to move it`);
      return;
    }
    let r;
    if (tgt.kind === 'bag') r = this.tankDo('tobag', at.where, at.i, -1);
    else if (tgt.kind === 'open') r = this.tankDo('open', at.where, at.i, -1);
    else if (tgt.kind === 'big') r = this.tankDo('press', at.where, at.i, BIG_CH);
    else {
      if (tgt.n >= pressSlots(g)) { say('That chamber isn\'t fitted yet: the sub\'s yard fits more'); return; }
      if (tooBig(s2)) { say(`${this.theName(sp)} is too big for a chamber: only the large pressure tank holds it`); return; }
      const occ = g.subTank.find((q) => q.pressed && q.chamber === tgt.n);
      r = this.tankDo(occ ? 'swap' : 'press', at.where, at.i, tgt.n);
    }
    this.renderInventory();
    return r;
  }
  // (3.0.36) every frame while the Catch page is open: the tank and the chambers, drawn by the tank room's own hand
  drawCatch(g, dt) {
    this.drawSpecimenTank(dt);
    const root = $('inventory'), tv = root.querySelector('.ct-tank'), cv = root.querySelector('.ct-ch'), bv = root.querySelector('.ct-big'); if (!tv || !cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (this.invScale || 1);
    const fit = (c) => { const w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); } const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h); return [x, w, h]; };
    this.troubleT = (this.troubleT || 0) - dt;
    if (this.troubleT <= 0) {
      this.troubleT = 0.4;
      const bad = (s2, inBag) => s2.cond > 0.05 && (s2.cond < 0.3 || gapOf(g, s2, inBag) > SAFE_GAP);
      root.querySelectorAll('.inv-catch2 .fc[data-b]').forEach((el) => { const s2 = g.bag[+el.dataset.b]; el.classList.toggle('trouble', !!(s2 && bad(s2, true))); });
      tv.parentElement.classList.toggle('trouble', (g.subTank || []).some((s2) => !s2.pressed && !s2.pile && bad(s2, false)));
    }
    // (an animal in hand is left out of where it was)
    const held = this.cDrag && this.cDrag.moved ? this.cDrag.s : null; this.tankRoom.drag = held ? { s: held } : null;
    const [a, aw, ah] = fit(tv); this.tankHits = this.tankRoom.drawMiniTank(a, g, aw, ah, dt);
    const [b, bw, bh] = fit(cv); this.chHits = this.tankRoom.drawMiniChambers(b, g, bw, bh, 0, this.catchShown || 5);
    if (bv) { const [c, cw, ch] = fit(bv); this.bigHits = this.tankRoom.drawMiniBig(c, g, cw, ch, 0); }
    this.tankRoom.drag = null;
  }
  // ---------- the locker (2.8.0): Earl and his eight slots; everything he owns in rarity frames ----------
  // Drag a thing onto him (or its slot) to put it on, or click it for its card: what it is, its skills, its
  // set, Put on / Take off, and Sell when someone is there to buy it (the Margaret, Dave). Changing gear works
  // on deck, in the cabin and in the sub; in the water it only shows.
  // (3.0.31) the inventory: Earl large in the middle of the left pane with his eight slots either side; the locker
  // on the right, thirty boxes, always sorted by rarity (Common to Legendary, then by kind), what he has on not in
  // it, new things marked NEW. Click anything for a pop-up: what it is, and side by side with what he has on.
  equipHtml(P, g, extra = '') {
    ensureKit(P); const K = kitOf(P), free = !!this.h.canChangeGear(), onSet = new Set(Object.values(K.on));
    const SLOTS = [['suit', 'Suit'], ['fins', 'Fins'], ['tank', 'Tank'], ['bag', 'Bag'], ['net', '1  Net'], ['slurp', '2  Slurp gun'], ['tag', '3  Tag gun'], ['cam', '4  Camera']];
    const pic = (q) => { const it = ITEMS[q.id]; return pictureOf(it.kind, it, 120, 72, true); };
    const slot = ([kind, label]) => { const q = K.on[kind] && K.items.find((x) => x.u === K.on[kind]); const it = q && ITEMS[q.id], nm = label.replace(/^\d\s+/, '');
      return `<div class="eq-slot sq${q ? ' r-' + it.rarity : ' empty'}" data-slot="${kind}" title="${q ? it.name : nm + ': nothing on'}">${q ? `<img src="${pic(q)}" alt="" draggable="${free}" data-kind="${kind}" data-u="${q.u}">` : `<span>${nm}</span>`}${/^\d/.test(label) ? `<i class="key">${label[0]}</i>` : ''}<small class="slot-nm">${nm}</small><i class="glyph g-${kind}"></i></div>`; };
    const order = ['net', 'slurp', 'tag', 'cam', 'suit', 'fins', 'tank', 'bag'], rk = (q) => RARITY[ITEMS[q.id].rarity].k;
    const list = K.items.filter((q) => !onSet.has(q.u)).sort((a2, b2) => rk(a2) - rk(b2) || order.indexOf(ITEMS[a2.id].kind) - order.indexOf(ITEMS[b2.id].kind) || ITEMS[a2.id].name.localeCompare(ITEMS[b2.id].name));
    const tiles = list.map((q) => { const it = ITEMS[q.id];
      return `<div class="lk-tile r-${it.rarity}" data-u="${q.u}" data-kind="${it.kind}" draggable="${free}" title="${it.name}"><img src="${pic(q)}" alt="">${q.isNew ? '<i class="new">new</i>' : ''}${it.rarity === 'legendary' ? `<span class="glint" style="--d:${(q.u.length * 7 % 23) / 10}s;--x:${20 + q.u.charCodeAt(1) % 60}%;--y:${18 + q.u.charCodeAt(2) % 50}%"></span><span class="glint b" style="--d:${(q.u.length * 13 % 31) / 10 + 1.4}s;--x:${30 + q.u.charCodeAt(3) % 50}%;--y:${40 + q.u.charCodeAt(4) % 40}%"></span>` : ''}</div>`; }).join('');
    const pop = this.lkSel ? this.itemPop(P, g, free) : '';
    return `<div class="inv-sec wide eq inv-split${free ? '' : ' locked'}"><div class="inv-left"><div class="cash-plate"><span>CASH</span><b>${money(P.cash)}</b></div>`
      + `<div class="eq-stage"><div class="eq-col">${SLOTS.slice(0, 4).map(slot).join('')}</div><canvas class="eq-earl" width="360" height="520"></canvas><div class="eq-col">${SLOTS.slice(4).map(slot).join('')}</div></div>`
      + (free ? '<p class="eq-note">Click a slot to take a thing off · drag one in to put it on</p>' : '<p class="eq-note eq-lock">Change gear on deck, in the cabin or in the sub.</p>')
      + this.airHtml(P, g)
      + `</div><div class="inv-right"><div class="lk-head"><h4>Locker</h4><small>by rarity</small><span class="${list.length >= LOCKER ? 'full' : ''}">(${list.length}/${LOCKER})</span></div><div class="lk-grid">${tiles}${'<div class="lk-tile empty"></div>'.repeat(Math.max(0, LOCKER - list.length))}</div></div></div>${pop}`;
  }
  // (3.0.35) the locker is laid out at one size, 1240 x 820, and scaled down to fit whatever screen it is on: a
  // phone sees the same locker as a computer, only smaller
  fitInventory() {
    const panel = $('inventory').querySelector('.inv-panel'); if (!panel) return;
    const vw = window.innerWidth, vh = window.innerHeight, small = vw < 900 || vh < 560, H = small ? 730 : 820;
    const k = Math.min(1, (vw - (small ? 4 : 12)) / 1240, (vh - (small ? 4 : 12)) / H);
    this.invScale = k; panel.style.setProperty('--inv-k', k.toFixed(4)); panel.style.height = H + 'px';
    $('inventory').classList.toggle('small', small);
    // (3.0.40) warnings while it is open: just above Gear / Catch (on a phone, along the bottom edge), not over the locker
    document.documentElement.style.setProperty('--inv-msg-y', Math.round((vh - H * k) / 2 + 30 * k) + 'px');
    document.documentElement.style.setProperty('--inv-msg-x', Math.round(vw / 2 + (small ? 120 : 180) * k) + 'px');
    document.documentElement.style.setProperty('--inv-msg-w', Math.round(small ? Math.min(vw / 2 - 120 * k - 8, 340) : 420 * k) + 'px');
    if (!this.invFitWired) { this.invFitWired = true; window.addEventListener('resize', () => { if (!$('inventory').hidden) this.fitInventory(); }); }
  }
  // (3.0.35) his oxygen tank, large, and its pressure gauge: how much air he has (full aboard), and how long it lasts
  airHtml(P, g) {
    const K = kitOf(P), q = K.on.tank && K.items.find((x2) => x2.u === K.on.tank), it = q && ITEMS[q.id]; if (!it) return '';
    const e = g.earl, max = Math.max(1, Math.round(e.o2Max || it.air || 20)), now = Math.max(0, Math.min(max, e.o2 ?? max)), k = now / max;
    const ang = -135 + 270 * k, warn = k < 0.25;
    const dial = `<svg viewBox="0 0 100 100" class="air-dial"><defs><radialGradient id="ad-face" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#ece4cc"/><stop offset="1" stop-color="#c8bc9a"/></radialGradient></defs>
      <circle cx="50" cy="50" r="48" fill="#6e5a38"/><circle cx="50" cy="50" r="44" fill="#2a2418"/><circle cx="50" cy="50" r="41" fill="url(#ad-face)"/>
      <path d="M 25 75 A 35 35 0 0 1 21 66" stroke="#a83a2a" stroke-width="5" fill="none"/>
      ${Array.from({ length: 11 }, (_, i) => { const a2 = (-225 + i * 27) * Math.PI / 180; return `<line x1="${50 + 30 * Math.cos(a2)}" y1="${50 + 30 * Math.sin(a2)}" x2="${50 + 36 * Math.cos(a2)}" y2="${50 + 36 * Math.sin(a2)}" stroke="#2a2418" stroke-width="${i % 5 ? 1.2 : 2}"/>`; }).join('')}
      <text x="50" y="70" text-anchor="middle" font-size="8" font-family="IBM Plex Mono, monospace" fill="#4a3c24">AIR</text>
      <g transform="rotate(${ang} 50 50)"><path d="M50 50 L50 17" stroke="#1c1a16" stroke-width="2.2" stroke-linecap="round"/></g><circle cx="50" cy="50" r="4" fill="#8a7448"/></svg>`;
    return `<div class="air-rig${warn ? ' warn' : ''}"><img src="${pictureOf(it.kind, it, 320, 120, true)}" alt="">${dial}<div class="air-txt"><span class="tape">${it.name.toUpperCase()}</span><b>${Math.round(now)} s</b><i>of ${max} s of air</i></div></div>`;
  }
  // one thing, as a column of the pop-up: its picture, name, rarity, what it is, its skills and its set
  itemCol(P, q, head) {
    const it = ITEMS[q.id], R = RARITY[it.rarity], T = totals(P), roman = ['', 'I', 'II', 'III', 'IV'];
    const skills = (q.sk || []).map(([k, l]) => `<div class="lk-sk"><b>${SKILLS[k].name}${SKILLS[k].flat ? '' : ' ' + roman[l]}</b><span>${SKILLS[k].what}</span></div>`).join('')
      + (q.leg ? `<div class="lk-sk leg"><b>✦ ${LEGEND[q.leg].name}</b><span>${LEGEND[q.leg].what}</span></div>` : '');
    const S = it.set && SETS[it.set], have = S ? T.sets[it.set] || 0 : 0;
    return `<div class="ip-col r-${it.rarity}"><h5>${head}</h5><img src="${pictureOf(it.kind, it, 260, 156, true)}" alt=""><b class="nm" style="color:${R.col}">${it.name}</b><span class="rr" style="color:${R.col}">${R.name}${it.legend ? ' · net of legend' : ''}</span><p>${it.line || ''}</p>
      <div class="ip-sks">${skills || '<span class="none">No skills</span>'}</div>${S ? `<div class="lk-set${have >= 3 ? ' live' : ''}"><b>${S.name} set</b> · ${have >= 3 ? 'on' : `worn (${have}/3)`}<span>${S.trait}</span></div>` : ''}</div>`;
  }
  // the pop-up: the thing on its own (if he has it on), or side by side with what he has on of that kind
  itemPop(P, g, free) {
    const K = kitOf(P), q = K.items.find((x) => x.u === this.lkSel); if (!q) { this.lkSel = null; return ''; }
    if (q.isNew) { delete q.isNew; this.h.onSaveProfile && this.h.onSaveProfile(); }
    const it = ITEMS[q.id], on = K.on[it.kind] === q.u, seller = this.h.canSellGear && this.h.canSellGear();
    const curQ = !on && K.on[it.kind] ? K.items.find((x) => x.u === K.on[it.kind]) : null, cur = curQ ? ITEMS[curQ.id] : null, M = MEASURES[it.kind];
    let body, acts = '';
    if (on) {
      body = `<div class="ip-cols one">${this.itemCol(P, q, 'He has it on')}</div>`;
      const starter = FREE_IDS[it.kind];
      if (free && !(starter && q.id === starter)) acts += `<button data-lk="off:${it.kind}">Take off${starter ? ` <small>(the ${ITEMS[starter].name.toLowerCase()} goes back on)</small>` : ''}</button>`;
    } else {
      // the numbers, a row each: his now, this one, which is better
      let rows = '';
      if (M) rows = M.map(([label, txt, num, hi]) => {
        const b2 = txt(it); if (!cur) return `<tr><th>${label}</th><td>—</td><td>${b2}</td></tr>`;
        const a2 = txt(cur); if (a2 === b2) return `<tr class="same"><th>${label}</th><td>${a2}</td><td>${b2}</td></tr>`;
        const d = num(it) - num(cur), up = hi ? d > 0 : d < 0;
        return `<tr><th>${label}</th><td>${a2}</td><td class="${up ? 'up' : 'down'}">${b2} ${up ? '▲' : '▼'}</td></tr>`;
      }).join('');
      body = `<div class="ip-cols">${cur ? this.itemCol(P, curQ, 'Equipped') : `<div class="ip-col empty"><h5>Equipped</h5><p>Nothing in that slot.</p></div>`}<div class="ip-arrow">→</div>${this.itemCol(P, q, 'Selected')}</div>`
        + (rows ? `<table class="ip-vs"><thead><tr><th></th><td>${cur ? cur.name : '—'}</td><td>${it.name}</td></tr></thead><tbody>${rows}</tbody></table>` : '');
      if (free) acts += `<button data-lk="on:${q.u}">Put it on</button>`;
      if (seller) acts += `<button class="sell" data-lk="sellgear:${q.u}">Sell · ${money(sellValue(q), false)}</button>`;
      else acts += '<small>Sell it on the Margaret, at the station, or to Dave.</small>';
    }
    return `<div class="item-pop"><div class="ip-box r-${it.rarity}"><button class="ip-close" aria-label="Close">×</button>${body}<div class="lk-acts">${acts}</div></div></div>`;
  }
  equipWire(P, g) {
    const root = $('inventory').querySelector('.eq'); if (!root) return;
    // Earl, in what he has on
    // (2.8.1) Earl, in what he has on, on a turntable: drag across him to turn him round; he keeps turning a
    // little after you let go, slows, and settles facing you
    const cv = root.querySelector('.eq-earl');
    if (cv) {
      const sp = this.spin || (this.spin = { a: 0.35, v: 0 });
      const e = g && g.earl, look = () => ({ kind: 'none', tier: 0, t: performance.now() / 1000, suit: (e && e.suit) || 'wet', bag: [], finLook: e && e.finLook, tankLook: e && e.tankLook, suitGlow: e && e.suitGlow });
      this.spinCv = cv; // the panel is redrawn often; the loop always draws on the canvas that's there now
      const draw = () => {
        const cv = this.spinCv, c = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, t = performance.now() / 1000, k = Math.cos(sp.a);
        c.clearRect(0, 0, W2, H2);
        // his shadow on the floor of the stand
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(W2 / 2, H2 * 0.93, W2 * 0.22, H2 * 0.03, 0, 0, Math.PI * 2); c.fill();
        c.save(); c.translate(W2 / 2, H2 * 0.5 + Math.sin(t * 1.2) * 2); c.scale(Math.sign(k || 1) * Math.max(0.12, Math.abs(k)), 1); c.rotate(-Math.PI / 2);
        drawEarl(c, H2 * 0.84, t * 1.5, 0.08, null, null, look());
        c.restore();
        if (Math.abs(k) < 0.5) { c.fillStyle = `rgba(10,14,12,${(0.5 - Math.abs(k)) * 0.5})`; c.fillRect(0, 0, W2, H2); } // edge on: he darkens as he turns away from the light
      };
      const loop = () => {
        if ($('inventory').hidden || !this.spinCv.isConnected) { this.spinLoop = false; return; }
        if (!this.spinDrag) { sp.a += sp.v * 0.016; sp.v *= 0.94; if (Math.abs(sp.v) < 0.05) { const rest = Math.round((sp.a - 0.35) / Math.PI) * Math.PI + 0.35; sp.a += (rest - sp.a) * 0.06; } }
        draw(); requestAnimationFrame(loop);
      };
      if (!this.spinLoop) { this.spinLoop = true; requestAnimationFrame(loop); }
      cv.style.cursor = 'grab';
      cv.addEventListener('pointerdown', (ev) => { this.spinDrag = { x: ev.clientX, t: performance.now() }; cv.setPointerCapture(ev.pointerId); cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', (ev) => { if (!this.spinDrag) return; const dx = ev.clientX - this.spinDrag.x, dt = Math.max(1, performance.now() - this.spinDrag.t); sp.a += dx * 0.02; sp.v = dx * 0.02 / (dt / 1000); this.spinDrag = { x: ev.clientX, t: performance.now() }; });
      const up = () => { this.spinDrag = null; cv.style.cursor = 'grab'; sp.v = Math.max(-12, Math.min(12, sp.v)); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    }
    // a card's buttons, and clicking a tile (or a slot's item) to open its card
    const box = $('inventory').querySelector('.inv-body');
    box.querySelectorAll('[data-lk]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.lk; this.h.onEquip(k); this.lkSel = null; this.renderInventory(); }));
    root.querySelectorAll('.lk-tile:not(.empty), .eq-slot [data-u]').forEach((el) => el.addEventListener('click', () => { this.lkSel = el.dataset.u; this.renderInventory(); }));
    const pop = box.querySelector('.item-pop');
    if (pop) { pop.addEventListener('click', (ev) => { if (ev.target === pop || ev.target.closest('.ip-close')) { this.lkSel = null; this.renderInventory(); } }); }
    if (!this.h.canChangeGear()) return;
    const put = (u) => { this.h.onEquip('on:' + u); this.renderInventory(); };
    const off = (kind) => { this.h.onEquip('off:' + kind); this.renderInventory(); };
    root.querySelectorAll('.lk-tile').forEach((el) => {
      el.addEventListener('dragstart', (ev) => { this.dragKind = el.dataset.kind; ev.dataTransfer.setData('text/plain', el.dataset.kind + ':' + el.dataset.u); root.querySelectorAll(`[data-slot="${el.dataset.kind}"]`).forEach((s2) => s2.classList.add('hot')); });
      el.addEventListener('dragend', () => root.querySelectorAll('.hot').forEach((s2) => s2.classList.remove('hot')));
    });
    root.querySelectorAll('.eq-slot img').forEach((el) => el.addEventListener('dragstart', (ev) => { this.dragKind = 'off:' + el.dataset.kind; ev.dataTransfer.setData('text/plain', 'off:' + el.dataset.kind); }));
    root.querySelectorAll('.eq-slot').forEach((s2) => {
      s2.addEventListener('dragover', (ev) => { if (this.dragKind === s2.dataset.slot) ev.preventDefault(); });
      s2.addEventListener('drop', (ev) => { ev.preventDefault(); const [k, u] = ev.dataTransfer.getData('text/plain').split(':'); if (k === s2.dataset.slot) put(u); });
    });
    const earl = root.querySelector('.eq-earl');
    earl.addEventListener('dragover', (ev) => { if (this.dragKind && !this.dragKind.startsWith('off:')) ev.preventDefault(); });
    earl.addEventListener('drop', (ev) => { ev.preventDefault(); const [k, u] = ev.dataTransfer.getData('text/plain').split(':'); if (k !== 'off') put(u); });
    const grid = root.querySelector('.lk-grid') || root;
    grid.addEventListener('dragover', (ev) => { if (this.dragKind && this.dragKind.startsWith('off:')) ev.preventDefault(); });
    grid.addEventListener('drop', (ev) => { const d = ev.dataTransfer.getData('text/plain'); if (d.startsWith('off:')) { ev.preventDefault(); off(d.slice(4)); } });
  }
  settingsOpen() { return !$('settings').hidden; }
  toggleSettings(force) { const el = $('settings'); el.hidden = !(force === undefined ? el.hidden : force); if (!el.hidden) this.renderSettings(); }
  renderSettings() {
    const g = this.h.getGame(), row = (id, label, on, note) => { $(id).innerHTML = `<span>${label}${note ? `<em>${note}</em>` : ''}</span><b class="${on ? 'on' : ''}">${on ? 'on' : 'off'}</b>`; };
    row('flashing', 'Reduce flashing', !!(g && g.reduceFlash), 'the thing in the deep: slower, softer lights');
    row('set-brackets', 'Target brackets', SETTINGS.brackets, 'corners round what the net will go for');
    row('set-catchtags', 'Catch tags', SETTINGS.catchTags, 'the name of what you can catch, under it');
    row('set-sound', 'Sound', this.h.getMuted ? !this.h.getMuted() : true, 'M');
    $('set-fullscreen').innerHTML = `<span>Full screen<em>the game fills the whole screen (Esc leaves it)</em></span><b class="${document.fullscreenElement ? 'on' : ''}">${document.fullscreenElement ? 'on' : 'off'}</b>`;
    $('set-graphics').innerHTML = `<span>Graphics<em>Fast: softer picture and fewer extras, for smoother play on slower computers</em></span><b class="on">${SETTINGS.fast ? 'fast' : 'auto'}</b>`;
  }
  galleryOpen() { return !$('gallery').hidden; }
  cabinOpen() { return !$('cabin').hidden; }
  catalogOpen() { return !$('catalog').hidden; }
  toggleCatalog(force, shop = 'bayside') { const el = $('catalog'), open = force === undefined ? el.hidden : force; el.hidden = !open; if (open) this.catalog.show(shop); }
  toggleCabin(force) {
    const el = $('cabin'), open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.cabin.show(); }
  }
  toggleGallery(force) {
    const el = $('gallery'), open = force === undefined ? el.hidden : force;
    const was = !el.hidden;
    el.hidden = !open;
    // (2.6.8) from the cabin's aquarium: the cabin steps aside while it is open, and he is back at the tank after
    if (open && !$('cabin').hidden) { this.galleryFromCabin = true; $('cabin').hidden = true; }
    if (!open && was && this.galleryFromCabin) { this.galleryFromCabin = false; const g0 = this.h.getGame(); if (g0 && g0.aboard) { $('cabin').hidden = false; this.cabin.atTank && this.cabin.atTank(); } }
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
  // (2.7.0) Dave's Haul
  daveOpen() { return !$('dave').hidden; }
  toggleDave(force) {
    const el = $('dave'), open = force === undefined ? el.hidden : force;
    if (open === !el.hidden) return;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.dave.open(); el.hidden = true; this.toggleCatalog(true, 'dave'); } // (3.0.0) his own computer, not the chalkboard
  }
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
    $('cave-sub').textContent = `A giant anglerfish, older than the boat · this dive it craves: ${off.craving.name.toLowerCase()}`;
    let html = `<nav class="cave-tabs"><button data-cave="tab:trade" class="${this.caveTab === 'trade' ? 'on' : ''}">Trade</button><button data-cave="tab:wares" class="${this.caveTab === 'wares' ? 'on' : ''}">The old one's wares</button><button data-cave="tab:chests" class="${this.caveTab === 'chests' ? 'on' : ''}">What the deep took</button></nav>`;
    if (this.caveTab === 'chests') {
      html += '<p class="shop-note">Bundles left in the silt of the cave. The Reliquary is the only place the oldest things come from.</p>';
      html += chestsOf('oldone').map((c) => `<div class="ch-row"><img src="${chestPicture(c.look, 192, 150)}" alt=""><div class="ch-txt"><b>${c.name}</b><span>${c.line}</span><small class="ch-odds">${oddsText(c.odds)}</small></div><button data-cave="chest:${c.key}" ${P.cash + 1e-6 < c.price ? 'disabled' : ''}>Open · ${money(c.price, false)}</button></div>`).join('');
      $('cave-body').innerHTML = html;
      return;
    }
    if (this.caveTab === 'wares') {
      for (const [k, W] of Object.entries(WARES)) {
        const g = this.h.getGame();
        const have = k === 'oldlure' ? (P.oldLures || 0) : k === 'relic' ? (P.relics || 0) : k === 'eye' ? (P.eye ? 1 : 0) : (g.blessed ? 1 : 0);
        const done = (W.max && have >= W.max) || (W.once && have) || (k === 'blessing' && have);
        const owned = W.max ? `(${have}/${W.max})` : done ? (k === 'blessing' ? 'on you this dive' : 'yours') : '';
        html += this.row('ware:' + k, W.name, W.line, owned, `<button data-cave="ware:${k}" class="coinbtn" ${done || (P.coins || 0) < W.coins ? 'disabled' : ''}>${COIN}${W.coins}</button>`, '', W.desc, [['price', `${W.coins} old gold coin${W.coins > 1 ? 's' : ''}`, 'sheet']]);
      }
      html += '<p class="shop-note">Old gold comes from the deep: every live animal caught below 500 m pays coins when it is sold (more the deeper it lived), the old one pays some in every trade, and so does every sapphire.</p>';
      $('cave-body').innerHTML = html;
      return;
    }
    if (off.traded) {
      html += `<p class="shop-empty">The old one has eaten. The lure dims a little, and a scatter of old gold lies in the silt: ${money(off.traded.total)}${off.traded.coins ? ` and ${off.traded.coins} coin${off.traded.coins > 1 ? 's' : ''}` : ''}. Come back next dive.</p>`;
      html += `<table class="manifest"><tbody>${off.traded.lines.map((l) => `<tr><td>${l.label}</td><td>${l.n}</td><td>${money(l.total)}</td></tr>`).join('')}</tbody></table>`;
    } else if (!off.groups.length) {
      html += '<p class="shop-empty">The great jaw opens a little and closes again. You have nothing it wants. It takes live fish: bring them in the bag or the sub\'s tank.</p>';
    } else {
      html += '<p class="shop-note">Once a dive the old one takes fish for old gold coins: 30 % under the market, but three times the market for what it craves. Choose what to give it.</p>';
      let total = 0;
      const rows = off.groups.map((gr) => {
        const on = this.caveSel.has(gr.key);
        if (on) total += gr.total;
        const sp = SPECIES_BY_ID[gr.id];
        return `<tr class="pick${on ? ' on' : ''}" data-cave="${gr.key}"><td><i class="tick">${on ? '✓' : ''}</i>${this.mini(sp)}${gr.variant ? `<span class="rare r-${gr.variant}">${VARIANTS[gr.variant].name}</span> ` : ''}${sp.name}${gr.craving ? ' <em class="crave">craved</em>' : ''}</td><td>${gr.n}</td><td>${money(gr.total)}</td></tr>`;
      }).join('');
      html += `<table class="manifest"><thead><tr><th>Fish</th><th>Qty</th><th>It pays</th></tr></thead><tbody>${rows}</tbody></table>`;
      html += `<button class="primary" data-cave="!trade" ${this.caveSel.size ? '' : 'disabled'}>Feed the old one<span>${money(total)}</span></button>`;
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
  // (4.15.0) the loading screen (the same pictures as the first one): its bar, its line, a tip
  showLoading(on) {
    const el = $('loading');
    if (on) { el.classList.remove('done'); el.hidden = false; if (window.__ldSet) window.__ldSet(el, 0.08, 'Charting the sea'); if (window.__ldTip) window.__ldTip(el); return; }
    if (el.hidden) return;
    el.classList.add('done'); clearInterval(el.__tipT);
    setTimeout(() => { if (el.classList.contains('done')) { el.hidden = true; el.classList.remove('done'); } }, 650);
  }
  setLoading(k, label) { if (window.__ldSet) window.__ldSet($('loading'), k, label); }
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
    let html = `<div class="save-line"><b>${money(p.cash, false)}</b><span>${p.runs || 1} dive${(p.runs || 1) > 1 ? 's' : ''}</span><span>deepest ${p.deepest || 0} m${best > (p.deepest || 0) ? ` (ever ${best} m)` : ''}</span><span>${(p.journal || []).length} species recorded</span>${p.aquarium && Object.keys(p.aquarium.display || {}).length ? `<span>aquarium: ${completion(p).species} species, ${completion(p).rare} rare</span>` : ''}</div>`;
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
  // (4.12.7) the refit room: the sub's upgrades and add-ons, full screen, the game paused behind it; a red X closes it
  openRefit() {
    const el = $('workshop'), g = this.h.getGame();
    if (!el.querySelector('.refit-x')) { const x = document.createElement('button'); x.className = 'refit-x'; x.setAttribute('aria-label', 'Close the refit room'); x.textContent = '×'; x.addEventListener('click', () => this.toggleWorkshop(false)); el.appendChild(x); }
    this.refitPaused = !!g && !g.paused; if (g) g.paused = true;
    el.classList.add('refit-full');
    this.openShop('sub', ['sub'], true);
    el.querySelector('.nameplate h2').innerHTML = 'Refit';
    if (this.dressPanels) this.dressPanels();
  }
  toggleWorkshop(force, allowed = null) {
    const el = $('workshop');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (!open && el.classList.contains('refit-full')) { // leaving the refit room: the game carries on
      el.classList.remove('refit-full'); el.querySelector('.nameplate h2').innerHTML = 'The <i>Margaret</i>';
      const g = this.h.getGame(); if (g && this.refitPaused) g.paused = false; this.refitPaused = false; this.refitOnly = false;
      if (this.dressPanels) this.dressPanels();
    }
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
    this.journalCount(g);
    const list = $('journal-list');
    list.innerHTML = '';
    if (g.journal.size === 0) {
      list.innerHTML = '<p class="empty">Nothing recorded yet.<br>Swim close to a creature and press F to observe it.</p>';
      return;
    }
    const entries = [...g.journal.entries()].sort((a, b) => ((b[1].at || 0) - (a[1].at || 0)) || (b[1].time - a[1].time)); // (4.12.4) newest found first, across dives
    for (const [id, info] of entries) {
      const sp = SPECIES_BY_ID[id];
      const row = document.createElement('div');
      row.className = 'entry' + rarityCls(sp);
      let icon = this.iconCache.get(id);
      if (!icon) { icon = speciesIcon(sp, 160, 90); this.iconCache.set(id, icon); }
      const img = document.createElement('img');
      img.src = icon.toDataURL(); img.alt = sp.name;
      const txt = document.createElement('div');
      txt.innerHTML = `<h3${rarityCol(sp) ? ` style="color:${rarityCol(sp)}"` : ''}>${sp.name} ${badge(sp)}</h3><div class="sci">${sp.species ? sp.species + ' · ' : ''}${sp.sci}</div>
        <p>${sp.desc}</p>
        <div class="meta">Seen at ${info.depth} m · lives ${usualDepth(sp)[0].toLocaleString()}–${usualDepth(sp)[1].toLocaleString()} m · up to ${sp.size}${sp.giant ? ' (this one far larger)' : ''}</div>
        ${this.variantRow(sp)}`;
      row.append(img, txt); row.insertAdjacentHTML('afterbegin', rarityStars(sp));
      list.append(row);
    }
  }

  // (4.12.4) every animal in the sea, from the surface down: the ones found in their colours and names, the rest
  // a black shape and ???. Pictures are drawn as they scroll into view (there are hundreds).
  renderAllFish(g, list) {
    this.journalCount(g);
    const all = SPECIES.filter((sp) => !sp.giant).slice().sort((a, b) => usualDepth(a)[0] - usualDepth(b)[0] || usualDepth(a)[1] - usualDepth(b)[1]);
    list.innerHTML = `<div class="allfish">${all.map((sp) => { const seen = g.journal.has(sp.id), c = seen ? rarityCol(sp) : null;
      return `<div class="af${seen ? ' seen' : ''}" title="${seen ? sp.name.replace(/"/g, '') : 'Not yet found'}"><img data-af="${sp.id}" alt=""><b${c ? ` style="color:${c}"` : ''}>${seen ? sp.name : '???'}</b><small>${usualDepth(sp)[0].toLocaleString()}–${usualDepth(sp)[1].toLocaleString()} m</small></div>`; }).join('')}</div>`;
    if (this.afObs) this.afObs.disconnect();
    this.afObs = new IntersectionObserver((ents) => {
      for (const en of ents) { if (!en.isIntersecting) continue; const img = en.target; this.afObs.unobserve(img); const sp = SPECIES_BY_ID[+img.dataset.af]; if (sp) img.src = this.allFishPic(sp, g.journal.has(sp.id)); }
    }, { root: list, rootMargin: '200px' });
    list.querySelectorAll('img[data-af]').forEach((im) => this.afObs.observe(im));
  }
  allFishPic(sp, seen) {
    const key = sp.id + (seen ? ':c' : ':s'); this.afCache = this.afCache || new Map();
    if (this.afCache.has(key)) return this.afCache.get(key);
    let icon = this.iconCache.get(sp.id); if (!icon) { icon = speciesIcon(sp, 160, 90); this.iconCache.set(sp.id, icon); }
    let url;
    if (seen) url = icon.toDataURL();
    else { const c = document.createElement('canvas'); c.width = icon.width; c.height = icon.height; const x = c.getContext('2d'); x.drawImage(icon, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#14120e'; x.fillRect(0, 0, c.width, c.height); url = c.toDataURL(); }
    this.afCache.set(key, url); return url;
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
    if (tab === 'all') return this.renderAllFish(g, list);
    const row = (k, v, note = '') => `<div class="stat"><span>${k}${note ? `<br><small>${note}</small>` : ''}</span><b>${v}</b></div>`;
    if (tab === 'status') {
      const e = g.earl, ent = g.entity, sub = g.sub;
      const lvl = ['unhurt', 'grazed', 'wounded', 'badly hurt', 'critical'][Math.min(4, g.injury || 0)];
      const items = Object.entries(g.inv).filter(([, n]) => n > 0).map(([k, n]) => `${RESOURCES[k].name} ${n}`).join(', ') || 'nothing';
      this.journalCount(g);
      list.innerHTML =
        row('Cash', money(this.h.getProfile().cash), 'safe at the boat') +
        row('Deep sapphires found', `${g.sapphires}`, 'this dive') +
        row('Deepest so far', `${Math.round(e.maxDepth)} m`) +
        row('Condition', lvl) +
        row('The thing in the deep', ent.marked ? 'it has marked me' : 'unaware of me', ent.marked ? `calmed ${Math.round((ent.calm || 0) / 60 * 100)} % - free animals from nets, plant coral, give something back (G)` : '') +
        row('Submersible', sub.imploded ? 'lost' : `rated ${sub.rated} m`, sub.imploded ? 'a replacement can be bought at the boat' : `hull ${Math.round(sub.hull * 100)} %`) +
        row('Carrying', items) +
        row('Lures · glow sticks', `${g.items.lure} · ${g.items.necklace}`);
    } else {
      this.journalCount(g);
      const keys = [['W A S D / arrows', 'swim, steer the sub'], ['Shift', 'faster, more air (sub: ×1.5, air ×3)'], ['F', 'interact; hold to pry loose, cut nets, plant coral'], ['hold F', 'leave the submersible'], ['Mouse', 'Earl swims to the cursor; click swings the net (or uses the tool); hold right to sprint; wheel zooms'], ['L', 'lights on / off (flash it at a charging animal)'], ['C · hold C', 'call the submersible to you · send it back to the boat'], ['1 · 2 · Space', 'net · slurp gun · use it (approach slowly, then sweep); press a tool\'s number again to put it away'], ['3 · 4', 'tag gun · camera (aim with the mouse, Space to fire)'], ['5', 'traps: Space at the surface, choose the depth (↑ ↓); F at the buoy hauls it up (the big ones need the boat\'s winch); F beside it empties it'], ['Space (in the sub)', 'the manipulator arm, once fitted: reach, then close the claw in the green'], ['Q / E', 'throw a lure / snap a glow stick (warm amber, 90 s; in the sub it lights her up)'], ['R (in the sub)', 'connect a backup air tank (3 s): the cabin air fills to full'], ['hold R (outside, at a damaged patch)', 'mend the sub\'s hull: 5 s a patch, +15 %'], ['N (in the sub)', 'let out a trawl net (choose which: up to two beginner nets and one advanced)'], ['G', 'offer something back to the deep (only while it hunts you, within 1,000 m)'], ['U', 'the boat: sell your haul, buy gear (at the boat)'], ['B', 'inventory'], ['V', 'take the helm and drive the Margaret (A / D); G lets the anchor go or winds it in'], ['J', 'this journal'], ['P', 'the yard (at the Margaret); anywhere else, frames per second'], ['O', 'quests'], ['L (on the Margaret)', 'the sub\'s lights on / off'], ['X', 'developer: the deepest sub and $500,000, then a legend to find'], ['Esc · M', 'pause · mute']];
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
        const [id, v] = gk.split(':'), spc = SPECIES_BY_ID[id], dk = gk.replace(/:$/, '');
        const keptL = list.filter((x) => x.kept), rest = list.filter((x) => !x.kept); // what is left to sell
        const pay = statValue(P, 'payFish');
        const name = (L) => { const worst = L.reduce((a, x) => Math.min(a, x.cond), 1), cn = conditionName(worst); return `${this.mini(spc)}<span class="sell-name">${v ? `<span class="rare r-${v}">${VARIANTS[v].name}</span> ` : ''}${spc.name}${worst < 0.7 ? ` <em class="cond c-${cn}">${cn}</em>` : ''}</span>` + (L.length > 1 ? `<span class="sell-n">×${L.length}</span>` : ''); };
        const canKeep = rest.some((x) => x.cond > 0.05); // a live one (the dead can only be sold)
        const keepBtn = canKeep ? `<button class="sell-keep" data-sell="keep" data-arg="${dk}" title="Hold it back from the sale (put it in the aquarium at the aquarium)">Keep</button>` : '';
        if (rest.length) items.push({ key: 'sp:' + gk, value: rest.reduce((a, x) => a + specimenValue(x), 0) * pay, keep: keepBtn, html: name(rest) });
        if (keptL.length) items.push({ key: 'kept:' + dk, value: keptL.reduce((a, x) => a + specimenValue(x), 0) * pay, kept: true, html: name(keptL),
          keep: `<button class="sell-keep on" data-sell="unkeep" data-arg="${dk}" title="Sell it after all">Keep</button>` });
      }
      const tg = new Map();
      for (const t of g.tags) { if (!tg.has(t.key)) tg.set(t.key, []); tg.get(t.key).push(t); }
      for (const [k, list] of tg) items.push({ key: 'tag:' + k, value: list[0].value * list.length * statValue(P, 'payFish'), html: `<span class="sell-name">Tag data: ${list[0].name}</span>` + (list.length > 1 ? `<span class="sell-n">×${list.length}</span>` : '') });
      for (const ph of g.photos) items.push({ key: 'photo:' + ph.key, value: ph.value * statValue(P, 'payFish'), html: `<span class="sell-name">Photograph: ${ph.name}</span>` });
      for (const [k, n] of Object.entries(g.inv)) if (n > 0 && GOODS[k] && k !== 'coral') items.push({ key: 'good:' + k, value: GOODS[k].price * n * statValue(P, 'paySalvage'), html: `<span class="sell-name">${GOODS[k].name}</span>` + (n > 1 ? `<span class="sell-n">×${n}</span>` : '') });
      for (const k of [...pick]) if (!items.some((it) => it.key === k && !it.kept)) pick.delete(k);
      if (!items.length) html = `<p class="shop-empty">Nothing aboard to sell.</p>`;
      else {
        const total = items.reduce((a, it) => a + (it.kept ? 0 : it.value), 0), inB = items.filter((it) => pick.has(it.key)), bTotal = inB.reduce((a, it) => a + it.value, 0);
        const row = (it, act) => it.kept ? `<div class="sell-row kept"><div class="sell-item" title="Kept: not for sale">${it.html}<b>${money(it.value)}</b></div>${it.keep}</div>`
          : `<div class="sell-row"><button class="sell-item" data-sell="${act}" data-arg="${it.key}">${it.html}<b>${money(it.value)}</b></button>${act === 'tobasket' ? it.keep || '' : ''}</div>`;
        html += `<button class="primary go" data-act="sellall" ${total > 0 ? '' : 'disabled'}>Sell all<span>${money(total)}</span></button>`;
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
        html += card(T.name, T.desc, `you own (${have}/${T.max})`, full ? null : T.price, 'buy', 'trap:' + k, full ? 'Full' : 'Buy', '', icon('trap', i), [
          ['depth', `down to ${T.maxDepth.toLocaleString()} m`, 'press'], ['catch', `${T.count[0]}–${T.count[1]} fish in 5 min`], ['fish up to', `${T.maxLen} m long`],
          ['holds', `${T.holds}`], ['hauled', T.winch ? "by the boat's winch" : 'by hand', T.winch ? 'bad' : 'good']].concat(T.lure ? [['lure', 'lit: draws deep animals and it', 'bad']] : []));
      });
      html += '</div>';
    } else if (tab === 'sub') {
      // (4.14.2) one page: her (large) and her sheet; the refits with price tags; All submersibles shows the ones he
      // has had, his own and the next he can buy (or one dark card, to be discovered); click a sub for its own page
      const hl = Math.min(SUBS.length - 1, lv(P, 'depth')), S0 = SUBS[hl], cap = hullCap(P);
      const air = (s2) => `${Math.floor(s2 / 60)} min${s2 % 60 ? ` ${s2 % 60} s` : ''}`;
      const facts = (S, k) => [['Safe depth', `${S.rated.toLocaleString()} m`, S.rated], ['Cabin air', air(S.o2), S.o2], ['Top speed', `${(3.36 * S.speed).toFixed(1)} m/s`, S.speed],
        ['Dive speed', k ? '+10%' : 'standard', S.ballast], ['Open tank', `holds ${S.tank} animals`, S.tank]];
      const sheet = (S, k, cmp = null, stamp = '', big = false) => { const base = cmp ? facts(cmp, 1) : null;
        return `<div class="yd-sheet${big ? ' big' : ''}"><div class="ys-head"><span>BAYSIDE YARD · SPECIFICATION</span><span>No. ${k + 1}</span></div>${facts(S, k).map(([a, v, n], i) => { const d = base ? n - base[i][2] : 0;
          return `<div class="ys-row"><span>${a}</span><i></i><b>${v}${d > 0 ? '<em class="up">▲</em>' : d < 0 ? '<em class="down">▼</em>' : ''}</b></div>`; }).join('')}<p class="ys-note">Her pressure chambers hold animals from as deep as she can dive.</p>${stamp ? `<div class="ys-stamp">${stamp}</div>` : ''}</div>`; };
      const statusOf = (k) => {
        if (k === hl && !sub.imploded) return '';
        if (k < hl) return '<span class="yd-tag past">Had it</span>';
        if (k === hl + 1 && k <= cap) return `<button class="yd-price" data-act="buy" data-arg="up:tHull" ${can(SUBS[k].price) ? '' : 'disabled'}>${money(SUBS[k].price, false)}</button>`;
        return '';
      };
      const open = this.ydSub != null && this.ydSub <= Math.min(hl + 1, cap) ? this.ydSub : null;
      if (open != null) { // one sub, large: its picture, its sheet, a word about it
        const S = SUBS[open];
        html += `<div class="yd-top"><h3><small>No. ${open + 1} of ${SUBS.length}</small>${S.name}</h3><button class="yd-btn" data-yd="all">← All submersibles</button></div>
          <div class="yd-hero"><canvas class="yd-pic big" data-hull="${open}"></canvas><div class="yd-info"><p class="yd-about">${SUB_ABOUT[open]}</p>${sheet(S, open, open === hl ? null : S0, open === hl && !sub.imploded ? 'IN SERVICE' : '', true)}<div class="yd-foot">${statusOf(open)}</div></div></div>`;
      } else if (this.ydAll) {
        html += `<div class="yd-top"><h3>All submersibles</h3><button class="yd-btn" data-yd="back">← Back to your sub</button></div><div class="yd-grid">`;
        for (let k = 0; k <= Math.min(hl + 1, SUBS.length - 1); k++) {
          if (k > cap) { html += `<div class="yd-card unknown"><div class="yd-pic dark"><span>?</span></div><h4><small>No. ${k + 1}</small>To be discovered <em class="yd-where">(${cap < 3 ? 'the research station' : "Dave's cabin"})</em></h4>${sheet(SUBS[k], k, S0)}</div>`; break; } // (4.15.1) its figures shown; where its plans are, in brackets
          const S = SUBS[k];
          html += `<div class="yd-card${k === hl ? ' cur' : ''}" data-yd="sub:${k}" title="See the ${esc(S.name)}"><canvas class="yd-pic" data-hull="${k}"></canvas><h4><small>No. ${k + 1}</small>${S.name}</h4>${sheet(S, k, k === hl ? null : S0, k === hl && !sub.imploded ? 'IN SERVICE' : '')}<div class="yd-foot">${statusOf(k)}</div></div>`;
        }
        html += '</div>';
      } else {
        if (sub.imploded) html += card('A replacement submersible', 'The old one is on the bottom somewhere, in pieces. The yard has another, built to the same rating.', '', replacementPrice(P), 'buy', 'replace', 'Buy', '', '', [['rated', `${sub.rated} m`, 'press'], ['refits', 'all kept', 'good']]);
        html += `<div class="yd-hero"><canvas class="yd-pic big" data-hull="${hl}"></canvas><div class="yd-info"><h3><small>No. ${hl + 1} of ${SUBS.length}</small>${S0.name}</h3><p class="yd-hull">Hull ${Math.round(sub.hull * 100)} %${sub.hull < 0.999 && !sub.imploded ? ` <button class="yd-btn" data-act="buy" data-arg="patch" ${can(PATCH_PRICE) ? '' : 'disabled'}>Patch it · ${money(PATCH_PRICE, false)}</button>` : ''}</p>${sheet(S0, hl, null, sub.imploded ? 'LOST' : 'IN SERVICE')}
          <button class="yd-btn yd-all" data-yd="all">All submersibles${hl < SUBS.length - 1 && hl + 1 <= cap ? ` · next: ${money(SUBS[hl + 1].price, false)}` : ''}</button></div></div>`;
        const refits = [['gear:arm', GEAR.arm.name, GEAR.arm.desc + ' The claw comes at its best: full reach, the big jaws, quick hydraulics.', GEAR.arm.price, owns(P, 'arm')]]
          .concat(Object.entries(SUB_ADDONS).filter(([, a]) => !a.inRoom).map(([k, a]) => [k, a.name, a.desc, a.price, !!(P.addons || {})[k]]));
        html += `<h4 class="yd-h">Refits <small>fitted once, kept on every sub</small></h4><div class="yd-refits">${refits.map(([arg, name, desc, price, have]) => `<div class="yd-refit${have ? ' have' : ''}"><div><b>${name}</b><p>${desc}</p></div>${have ? '<span class="yd-tag yours">Fitted</span>' : `<button class="yd-price" data-act="buy" data-arg="${arg}" ${can(price) ? '' : 'disabled'}>${money(price, false)}</button>`}</div>`).join('')}</div>`;
        html += '<p class="shop-note">Pressure chambers are bought in the sub\'s chamber room, the large pressure tank in its own room.</p>';
      }
    } else if (tab === 'supplies') {
      // the sub's trawl nets: one in the hatch at a time, each used up in one haul
      for (const [k, N] of Object.entries(NETS_SUB)) {
        const have = netsOf(g.items)[k], full = have >= N.cap, adv = k === 'adv';
        html += card(N.name, N.desc, `in the hatch (${have}/${N.cap})`, full ? null : N.price, 'buy', 'subnet:' + k, full ? 'Full' : 'Buy', '', '',
          [['holds', `${N.max} animals`, adv ? 'good' : ''], ['fish up to', `${N.maxLen} m long`, adv ? 'good' : ''], ['mouth', adv ? `${(N.mouth * 2).toFixed(1)} m wide: catches far more of a school` : `${(N.mouth * 2).toFixed(1)} m wide`, adv ? 'good' : ''], ['legends', adv ? 'none escape' : '9 in 10 escape', adv ? 'good' : 'bad'], ['big animals', adv ? 'seldom break out' : 'often break out, may tear it', adv ? 'good' : 'bad'], ['use', 'N in the sub, once', 'sheet']]);
      }
      for (const [k, it] of Object.entries(SUPPLIES)) {
        if (it.needs && !owns(P, it.needs)) continue; // tags only once he has the tag gun
        const mx = supplyMax(P, k), have = g.items[k] || 0, full = have >= mx;
        html += card(it.name, it.desc, `carrying (${have}/${mx})`, full ? null : it.price, 'buy', k, full ? 'Full' : 'Buy', '', '', SUPPLY_SPECS[k]);
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
      html += this.upgradeGroups(P, ['Buyers'], icon, can); // (2.6.0) better buyers, found on the radio
    } else if (tab === 'aquarium') {
      const A = aquariumOf(P), C = completion(P), list = Object.entries(A.display), slots = gallerySlots(P);
      html += `<div class="aq-head"><div><b>${list.length}<small>/${slots}</small></b><span>in the aquarium</span></div><div><b>${C.species}</b><span>of ${C.of} species kept</span></div><div><b>${visitors(P)}</b><span>visitors a day</span></div><div><b>${list.length ? money(dailyIncome(P), false) : '—'}</b><span>a day in tickets</span></div></div>`;
      html += `<button class="primary" data-act="gallery" data-arg="">Visit the aquarium<span>put animals in, pet, feed, name, sell or release them</span></button>`;
      if (!list.length) html += `<p class="shop-empty">The aquarium in the Margaret's cabin is empty. Put a live animal in from your catch at the aquarium itself (Keep on the Sell tab holds one back from a sale): healthy, it becomes Happy after 5 minutes (sells for ×1.2), and 15 minutes later it earns the Famous tag (×2 more). Visitors leave a little money each day.</p>`;
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
      if (lvG < GALLERY_STEPS.length) html += card('More room in the aquarium', 'More places in the tanks: pumps, chillers and glass.', `room for ${slots} now`, GALLERY_STEPS[lvG], 'buy', 'gallery', 'Fit', '', '', [['places', `${slots} → ${gallerySlots({ galleryLv: lvG + 1 })}`, 'good']]);
      else html += '<p class="shop-note">The aquarium is as big as the Margaret can hold.</p>';
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
    // (4.14.0) the sub page fills the screen, with a red X; its pictures of the subs move gently
    const wk = $('workshop'), full = tab === 'sub';
    if (full && !wk.querySelector('.refit-x')) { const x = document.createElement('button'); x.className = 'refit-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×'; x.addEventListener('click', () => this.toggleWorkshop(false)); wk.appendChild(x); }
    if (wk.classList.contains('refit-full') !== full) { wk.classList.toggle('refit-full', full); if (this.dressPanels) this.dressPanels(); }
    if (full) this.drawSubPics(P);
  }

  // (4.14.0) each sub's picture on the sub page, as it looks in the water
  drawSubPics(P) {
    const cvs = [...$('shop-body').querySelectorAll('canvas.yd-pic')]; if (!cvs.length) return;
    const looks = cvs.map((cv) => { const k = +cv.dataset.hull; const Pk = { ...P, tlvV: 2, tlvCh: 1, tlv: { ...(P.tlv || {}), tHull: k } }; return { kind: 'sub', now: subLook(Pk), next: null }; });
    const t0 = performance.now(), tick = () => {
      if (!cvs[0].isConnected || $('workshop').hidden) return;
      const t = (performance.now() - t0) / 1000; cvs.forEach((cv, i) => drawShowcase(cv, looks[i], t + i * 0.7));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
        if (T.group !== grp || T.retired || T.inRoom || (this.refitOnly && id === 'tHull')) continue; // (4.13.0) chambers are bought in the chamber room // (4.12.0: the rack is gone: two backup tanks for everyone)
        const l = lv(P, id), capped = id === 'tHull' && l >= hullCap(P) && l < T.max, maxed = l >= T.max || capped, cost = upgradeCost(P, id), coins = upgradeCoins(P, id);
        const specs = [];
        if (id === 'tHull') {
          const d = lv(P, 'depth');
          specs.push(['now', `${SUBS[d].name}, ${SUBS[d].rated} m`]);
          if (capped) specs.push(['next', 'not yet: the yard has no plans for a deeper hull', 'bad']);
          else if (!maxed) specs.push(['next', `${SUBS[d + 1].name}, ${SUBS[d + 1].rated} m · cabin air ${SUBS[d + 1].o2} s`, 'good']);
        } else for (const sid of T.stats) {
          const sl = lv(P, sid), U = UPGRADES[sid], nl = Math.min(U.max, Math.round((l + 1) / T.max * U.max));
          const now = fmtStat(sid, statAt(sid, sl)), next = fmtStat(sid, statAt(sid, nl));
          specs.push([U.name.toLowerCase(), maxed || nl === sl ? now : `${now} → ${next}`, maxed || nl === sl ? '' : 'good']);
        }
        specs.push(['level', capped ? 'the deepest the yard can build for now' : maxed ? 'the most it can be' : `(${l}/${T.max})`, 'sheet']);
        html += this.row('up:' + id, T.name + (id === this.rec ? ' <em class="rec-badge">Recommended</em>' : ''), T.line || '',
          (T.max > 12 ? `<span class="lamps-bar" title="${l}/${T.max}"><i style="width:${Math.round(l / T.max * 100)}%"></i></span><small class="lv-n">${l}/${T.max}</small>` : `<span class="lamps">${Array.from({ length: T.max }, (_, k) => `<i class="${k < l ? 'lit' : ''}"></i>`).join('')}</span>`) + (maxed ? 'max' : ''), // (4.13.0) a long track (the engine's fifty steps) as a bar
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

  // (4.4.1) the time into the dive, at the top of the journal: kept ticking while it is open (it froze when opened)
  journalCount(g) {
    const t = `${formatTime(g.survival)} into the dive` + (['species', 'all'].includes(this.tab || 'species') ? ` · (${g.journal.size}/${SPECIES_COUNT}) recorded` : '');
    const el = $('journal-count'); if (el.textContent !== t) el.textContent = t;
  }
  update(g, dt) {
    if (!$('journal').hidden && this.journalDirty) { this.journalDirty = false; this.renderJournal(); }
    if (!$('journal').hidden) this.journalCount(g);
    if (!$('workshop').hidden) {
      const e = g.earl;
      if (!this.refitOnly && (Math.abs(e.x - BOAT.x) > 16 || e.y > 5)) this.toggleWorkshop(false); // (refits from the tank room work anywhere)
    }
    if (!$('tankroom').hidden) {
      if (!g.earl.inSub) this.toggleTank(false);
      else this.tankRoom.update(dt);
    } else if (!$('inventory').hidden && this.invTab === 'catch') this.drawCatch(g, dt);
    if (!$('cave').hidden && Math.hypot(g.earl.x - 66, g.earl.y - 1800) > 20) this.toggleCave(false);
    if (!$('dave').hidden && g.world.dave && Math.hypot(g.earl.x - (g.world.dave.x + 6.5), g.earl.y - (g.world.dave.y - 3.1)) > 18) this.toggleDave(false);
    if (!$('cabin').hidden) { if (!g.aboard) this.toggleCabin(false); else this.cabin.update(dt); }
    if (!$('gallery').hidden) {
      const e = g.earl, aboard = (Math.abs(e.x - BOAT.x) < 16 && e.y < 5) || (e.inSub && g.sub.docked);
      if (!aboard) this.toggleGallery(false); else this.gallery.update(dt);
    }
  }
}
