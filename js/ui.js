import './item_data.js'; // (6.5.1)
import { drawHourglass, blessedURL } from './coin_art.js';
import { drawTierEmblemMask } from './scrolls.js'; // (7.5.7) Apex's emblem on a Blessed animal's status
import { drawCash } from './coins.js';
import { setUnits, imperial } from './units.js';
import { fmtLeft, abilityOf, maxLoad, chargePrice, nextCharge } from './abilities.js';
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
// (4.15.7) where each refit sits in the showcase drawing of the sub: [x, y, w, h] as fractions of the picture
const PART_CROP = { arm: [0.66, 0.56, 0.34, 0.34], quiet: [0.7, 0.16, 0.3, 0.3], sonar: [0.6, 0.46, 0.18, 0.24] };
const SHOWCASE_TABS = new Set(['diver', 'tools']); // (4.14.0: the sub page draws its own)
import { speciesIcon, fittedIcon, petIcon, speciesBox, drawSpecies } from './creatures_draw.js';
import { ABOUT } from '../data/species_about.js';
import { xEyes } from './gallery.js';
import { usualDepth } from './fauna.js';
import { RESOURCES, BOAT , yardX } from './world.js';
import { TRAPS, hullCap } from './economy.js';
import { toolIcon } from './tools_draw.js';
import { livesOnBottom, isSessile, specimenValue, deepPremium, conditionName, rarityOf, rarityStars, rarityCls, rarityCol } from './specimens.js';
 // (animals that can't be captured show no rarity)
import { VARIANTS, VARIANT_KEYS, variantLabel, canBeRare } from './variants.js';
import { Gallery } from './gallery.js';
import { DaveShop } from './dave.js';
import { Cabin } from './cabin.js';
import { Catalog, pictureOf, drawGoldCoins, MEASURES, measureHtml, crossBoosts, boostOf } from './catalog.js';
import { BAG_SCENES, BAG_SCENE_IDS } from './bag_scenes.js';
import { ITEMS, kitOf, RARITY, LEGEND, SETS, LOCKER, totals, sellValue, FREE as FREE_IDS, slotKey, bagSlotOf } from './items.js';
const SLOT_NAME = { 1: 'Ability 1', 2: 'Ability 2', 3: 'Ability 3' }; // (7.6.71, owner) the three skill slots, as the bag names them
const SIDE_TOOLS = new Set(['cam']);
import { kit as ensureKit } from './economy.js';
import { drawEarl } from './earl_draw.js';
import { SETTINGS, setSetting, uiSizeName, setUiSize } from './settings.js';
import { aquariumOf, dailyIncome, visitors, completion, gallerySlots, GALLERY_STEPS, earnsOf, isHappy } from './aquarium.js';
import { SUITS } from './economy.js';
import { WARES, upgradeCoins } from './economy.js';
import { TankRoom, sizeK, seaAt } from './tankroom.js'; // (sizeK: an animal's drawn size against a 2.4 m giant)
import { lockerTexture } from './textures.js';
import { gaugeFace, gaugeNeedle, gaugeGlass } from './gauge_art.js';
import { daveTalkPlate } from './dave_art.js';
import { ChestReveal, chestsOf, oddsText, chestPicture, chestOddsHtml, CHESTS } from './chests.js';
import { petsHtml, petStars, storeHtml, eventsHtml, calWeek, untilTomorrow, testHtml, giftWait, hms, shopTabs } from './store.js';
import { scrollsHtml, coinsHtml, packsHtml, shelfOf, restock, shelfPrice, COIN_OFFERS, COIN_DEAL, takeDeal, dealTaken, RESTOCK_PEARLS, scrollSellPearls } from './shelf.js'; // (7.6.2)
import { isTestStore } from './purchases.js';
import { ACH, STARS, achStars, achReady, achValue, achReadyCount } from './achievements.js';
import { startTitleArt } from './title_art.js'; // (7.0.0) the name as artwork // (6.9.0) the Test tab, behind ?dev
import { tankPicture, tankZoom } from './journal_tank.js';
// (7.2.8) the name plate's pencil: a turned, lit object like every item (hexagonal barrel, one face lit, one in shade,
// a bronze ferrule, a rust eraser, the shaved wood and its lead), small, at the plate's end
const PENCIL = `<svg class="cr-pen" viewBox="0 0 40 40" aria-hidden="true"><g transform="rotate(-45 20 20)"><path d="M6 17h22v3H6z" fill="#d6ccb0"/><path d="M6 20h22v3H6z" fill="#a69a7a"/><path d="M6 16.6h22" stroke="#efe6cc" stroke-width="0.8"/><path d="M3.5 17h3v6h-3z" fill="#9a7848"/><path d="M3.5 18.2h3M3.5 21.6h3" stroke="#5e4a2c" stroke-width="0.6"/><path d="M1 17.4h2.6v5.2H1z" fill="#8a4e3a"/><path d="M28 17l6 3-6 3z" fill="#c4a476"/><path d="M28 20l6 0-6 3z" fill="#9c8058"/><path d="M32.4 19.2l2.6 0.8-2.6 0.8z" fill="#2a2824"/></g></svg>`;
const ARROW_UP = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3 3 11h4v6h6v-6h4z" fill="currentColor"/></svg>';
const BACK = '<svg viewBox="0 0 24 20" aria-hidden="true"><path d="M8 3h13v14H8l-6-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 7l6 6M17 7l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
import { drawFace, DEFAULT_LOOK, FACES, EYES, HAIRS, HAIR_NAMES, SKINS, BEARDS, HAIR_COLS, EYE_COLS } from './face_draw.js'; // (6.7.0) the creator
import './purchases.js'; // (6.5.9) (economy's priceOf is another thing)
import { powerHtml, skillsHtml, rarKind } from './itemcard.js'; // (6.5.3) // (6.5.0) the journal's animal in a small tank of its own water
import { TRAP_ORDER } from './economy.js';
import { trapsFree, trapSets, trapLeft, timeLeftText } from './traps.js';
import { tankSlots, pressSlots, NETS_SUB, netsOf, slotsOf, BIG as BIG_CH, gapOf, gapSigned, SAFE_GAP, hasBigTank, bigFits, tooBig, freeChamber, tankFits, bagSlots } from './capture.js';
import { readSlot, lastSlot, deleteSlot, getSlot, SLOTS } from './economy.js';
import { statAt } from './economy.js';
import { loadBest, UPGRADES, TRACKS, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat } from './economy.js';
import { refreshIn, ready as contractReady } from './contracts.js';
import { Q as questsOf, MAIN as QUEST_MAIN, boardIn, refreshPrice, questLeft, fillQuests, tutorialOn, stepLabel, GROUPS as QUEST_GROUPS, groupSpecies } from './quests.js';
import { SUBS, SUB_ADDONS, SUPPLIES, supplyMax, GOODS, marketTick, money, moneyExact } from './economy.js';
import { formatTime, clamp } from './util.js';
import { VERSION } from './version.js';
import { markOf, SUB_MARKS } from './earl_draw.js';
import { previewOf, drawShowcase } from './showcase.js';
import { subLook } from './render.js';
import { PETS, PET_BY_ID, petLevel, fedToday, atSurface } from './petshop.js'; // (7.4.14) pets come only from pearls


// the figures for the shop's cards, as dot points

const SUPPLY_SPECS = {
  necklace: [['use', 'the glow stick button, or Use in the bag, snaps one and lets it go'], ['effect', 'it hangs where you leave it, lighting the water 16 m round for 2 min, and slowly sinks; the thing in the deep does not mind it', 'good'], ['but', 'it stays behind, and fades when the thing comes near', 'bad']], // (5.17.1)
  film: [['use', 'the camera'], ['one each', 'every picture, sharp or not'], ['pays', 'Poor, Good or Excellent: an Excellent picture twice a Good one', 'good']],
  airTank: [['use', 'the air tank button, in the sub'], ['work', '3 s to connect'], ['effect', 'cabin air to full', 'good'], ['rack', 'one to start; can be enlarged']],
};
const GEAR_SPECS = {
  camera: [['use', 'the swap button by the net'], ['pays', 'a share of the animal\'s worth, by the camera\'s Quality and the picture\'s grade', 'good']],
  arm: [['use', 'the claw button, from inside the sub'], ['catches', 'time the grip']],
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
// (5.10.10) a photograph's grade: Poor, Good or Excellent (an older picture's Blurry or Off-centre reads as Poor), and
// its stars: one to three small bronze stamps pressed into the print's top right corner, the empty ones a faint dent
const gradeOf = (ph) => (ph.grade === 'Excellent' || ph.grade === 'Good' || ph.grade === 'Poor' ? ph.grade : ph.grade ? 'Poor' : 'Good');
const STAR = '<svg viewBox="0 0 20 20"><path d="M10 1.6l2.5 5.5 6 .6-4.5 4 1.3 5.9L10 14.6l-5.3 3 1.3-5.9-4.5-4 6-.6z"/></svg>';
const photoStars = (ph) => { const n = gradeOf(ph) === 'Excellent' ? 3 : gradeOf(ph) === 'Good' ? 2 : 1; return `<span class="ph-stars" aria-label="${gradeOf(ph)}">${[0, 1, 2].map((k) => `<span class="st${k < n ? ' on' : ''}">${STAR}</span>`).join('')}</span>`; };

// (5.16.0) a triggering power's state for its card: "ready", or a small painted hourglass and the real time left
let HG_URL = null;
try { document.documentElement.style.setProperty('--bless', `url(${blessedURL()})`); } catch (e) { /* no canvas */ }
// (7.5.7, owner) Apex's own emblem (the net torn open by hooked teeth) in legendary gold, with a dark edge: a Blessed animal's status
try { const m = drawTierEmblemMask('vigor', 'legendary', 96), c = document.createElement('canvas'); c.width = c.height = 96; const t = c.getContext('2d');
  const tint = (col) => { const k = document.createElement('canvas'); k.width = k.height = 96; const q = k.getContext('2d'); q.drawImage(m, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, 96, 96); return k; };
  const dark = tint('#1a1408'), gold = tint('#f2b84a'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [1, 2]]) t.drawImage(dark, dx, dy); t.drawImage(gold, 0, 0);
  t.globalCompositeOperation = 'source-atop'; const lg = t.createLinearGradient(0, 0, 0, 96); lg.addColorStop(0, 'rgba(255,240,200,0.35)'); lg.addColorStop(0.5, 'rgba(255,240,200,0)'); lg.addColorStop(1, 'rgba(60,40,10,0.35)'); t.fillStyle = lg; t.fillRect(0, 0, 96, 96);
  document.documentElement.style.setProperty('--apex', `url(${c.toDataURL()})`); } catch (e) { /* no canvas */ }
// (7.6.6, owner) Bloodmoon's emblem in oxblood, a dark edge: a Cursed animal's status
try { const m = drawTierEmblemMask('bloodmoon', 'mythical', 96), c = document.createElement('canvas'); c.width = c.height = 96; const t = c.getContext('2d');
  const tint = (col) => { const k = document.createElement('canvas'); k.width = k.height = 96; const q = k.getContext('2d'); q.drawImage(m, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, 96, 96); return k; };
  const dark = tint('#140806'), red = tint('#b8402c'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [1, 2]]) t.drawImage(dark, dx, dy); t.drawImage(red, 0, 0);
  document.documentElement.style.setProperty('--curse', `url(${c.toDataURL()})`); } catch (e) { /* no canvas */ }
function powerStatus(P, key) {
  void key; const at = P.netPowerAt, left = at ? (at - Date.now()) / 1000 : 0; // (6.0.0) the one shared timer
  if (left <= 0) return '<em class="pw-st pw-ready">ready</em>';
  if (!HG_URL) { const c = document.createElement('canvas'); c.width = c.height = 40; drawHourglass(c.getContext('2d'), 20, 20, 14); HG_URL = c.toDataURL(); }
  return `<em class="pw-st"><img src="${HG_URL}" alt="">${fmtLeft(left)}</em>`;
}

// (6.0.5) on a phone the big panels are scaled to the screen with transform: scale (the shop's bezel also given the
// size it needs), set from here and kept up to date; CSS zoom put Safari's taps in the wrong place on the shop's site
const FIT = [['#catalog .cat-bezel', 470, true], ['#workshop .shop-main', 430], ['#cave .shop-main', 430], ['#settings .set-panel', 430], ['#pause', 430], ['#trapset .shop-main', 430]];
function fitPanels() {
  const H = window.innerHeight, W = window.innerWidth, small = H <= 520;
  for (const [sel, base, full] of FIT) { const el = document.querySelector(sel); if (!el) continue;
    if (!small) { if (el.dataset.fit) { el.style.transform = el.style.width = el.style.height = el.style.maxHeight = el.style.maxWidth = ''; delete el.dataset.fit; } continue; }
    const k = H / base, key = k.toFixed(4) + '|' + W; if (el.dataset.fit === key) continue; el.dataset.fit = key;
    el.style.transformOrigin = 'center center'; el.style.transform = `scale(${k.toFixed(4)})`;
    if (full) { el.style.width = ((W - 16) / k).toFixed(1) + 'px'; el.style.height = ((H - 16) / k).toFixed(1) + 'px'; el.style.maxWidth = 'none'; el.style.maxHeight = 'none'; }
    else el.style.maxHeight = ((H - 16) / k).toFixed(1) + 'px'; }
}
setInterval(fitPanels, 300); window.addEventListener('resize', fitPanels);

// (6.5.0) a large painted padlock (a steel shackle, a worn brass body, its keyhole), for a whole part that cannot be
// used from here: the sub's half of the Catch tab while Earl is not in the sub


// (6.5.0) an animal's own water, behind its picture wherever it is shown in a tile (the bag, the sale): kelp, reef, sunlit,
// blue, twilight or the deep, by where it usually lives
const habCls = (sp) => { const [a2] = usualDepth(sp), hb = (sp.v && sp.v.hab) || ''; return /kelp/.test(hb) ? 'hb-kelp' : /reef|coral/.test(hb) ? 'hb-reef' : a2 < 60 ? 'hb-sun' : a2 < 300 ? 'hb-blue' : a2 < 1000 ? 'hb-twi' : 'hb-deep'; };
// (6.7.1) Dave's portrait, painted once: an old diver in profile turned toward the words, a grey beard, a knit cap, a
// rust oilskin over his shoulders, the light from the right
let davePic = null;
// (7.0.0) Dave's arm, resting along the top of his box: the oilskin sleeve from his shoulder, folded at the elbow, and his
// hand over the box's rim, fingers hooked over the edge (a separate picture laid over the box's top edge)


function davePortrait() {
  if (davePic) return davePic;
  // (7.0.0) redrawn as one figure, after the owner's references: the neck runs down into a thick roll-neck sweater whose
  // collar wraps round it; the oilskin hangs open over the sweater with a lapel at the front; the shoulders slope away
  // and turn the way he faces (the far one higher and smaller, the near one rounding toward us); soft light from the
  // front and above, the back of the figure falling into shadow
  const c = document.createElement('canvas'); c.width = 300; c.height = 340; const x = c.getContext('2d');
  const lin = (x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  // the neck: from under the jaw and the skull's base, a column widening into the shoulders
  x.fillStyle = lin(108, 0, 200, 0, [[0, '#6e4a32'], [0.5, '#a3755a'], [1, '#93684e']]);
  x.beginPath(); x.moveTo(116, 150); x.bezierCurveTo(112, 190, 108, 214, 100, 232); x.lineTo(206, 232); x.bezierCurveTo(198, 210, 194, 188, 196, 160); x.closePath(); x.fill();
  // the oilskin: back shoulder sloping down to the left edge, the near shoulder rounding out to the right, open at the front
  x.fillStyle = lin(0, 220, 300, 340, [[0, '#4a2c1a'], [0.45, '#7a4a2c'], [0.75, '#8c5634'], [1, '#5a341e']]);
  x.beginPath(); x.moveTo(0, 340); x.lineTo(0, 300); x.bezierCurveTo(30, 258, 70, 236, 112, 226); x.lineTo(208, 224);
  x.bezierCurveTo(248, 232, 282, 262, 296, 310); x.lineTo(300, 340); x.closePath(); x.fill();
  // the sweater showing where the oilskin falls open, and its thick roll collar wrapping the neck (a curved top, not a cut)
  x.fillStyle = lin(150, 230, 230, 340, [[0, '#5e6050'], [1, '#3a3c32']]);
  x.beginPath(); x.moveTo(150, 236); x.bezierCurveTo(180, 236, 214, 250, 224, 340); x.lineTo(176, 340); x.bezierCurveTo(170, 290, 160, 260, 150, 236); x.closePath(); x.fill();
  x.fillStyle = lin(0, 196, 0, 244, [[0, '#7a7c68'], [0.5, '#5e6050'], [1, '#3e4034']]);
  x.beginPath(); x.moveTo(104, 222); x.bezierCurveTo(108, 200, 150, 196, 202, 204); x.bezierCurveTo(214, 216, 212, 236, 206, 246); x.bezierCurveTo(170, 252, 130, 250, 104, 242); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(30,32,24,0.45)'; x.lineWidth = 2; for (const yy of [212, 224, 236]) { x.beginPath(); x.moveTo(108, yy + 2); x.bezierCurveTo(140, yy - 6, 180, yy - 6, 206, yy); x.stroke(); } // the roll's ribs, following its curve
  // the lapel: the oilskin's open front edge, lit along its fold
  x.fillStyle = '#5c3620'; x.beginPath(); x.moveTo(206, 240); x.bezierCurveTo(222, 262, 228, 300, 230, 340); x.lineTo(246, 340); x.bezierCurveTo(244, 300, 236, 262, 214, 236); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(255,214,170,0.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(214, 238); x.bezierCurveTo(236, 262, 244, 300, 246, 340); x.stroke();
  // folds in the oilskin, and the near shoulder's seam
  x.strokeStyle = 'rgba(24,12,6,0.4)'; x.lineWidth = 4; x.lineCap = 'round';
  for (const [a, b, cx, cy, d, e2] of [[40, 290, 50, 310, 44, 338], [92, 262, 104, 296, 96, 338], [262, 270, 274, 300, 270, 336]]) { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(cx, cy, d, e2); x.stroke(); }
  x.strokeStyle = 'rgba(24,12,6,0.3)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(232, 232); x.bezierCurveTo(262, 248, 280, 270, 288, 300); x.stroke();
  { const sh = x.createRadialGradient(250, 262, 4, 250, 262, 70); sh.addColorStop(0, 'rgba(255,220,180,0.2)'); sh.addColorStop(1, 'rgba(255,220,180,0)'); x.fillStyle = sh; x.fillRect(170, 210, 130, 130); } // the near shoulder catching the light
  // the head
  x.save(); x.translate(158, 140); x.rotate(-Math.PI / 2);
  drawFace(x, 0, 0, 10.5, { sex: 'm', face: 1, eyes: 2, skin: 1, beard: true, age: true, cap: '#4e4a3a', hairCol: ['#c4bcae', '#8e877b', '#4a4640'] });
  x.restore();
  // light on him from the front and above: a warm key light on the face's front, the back of the head in shadow, a cool
  // rim from the water behind, a shadow under the cap's brim
  x.save(); x.globalCompositeOperation = 'source-atop';
  { const kl = x.createRadialGradient(205, 150, 10, 205, 150, 90); kl.addColorStop(0, 'rgba(255,226,190,0.16)'); kl.addColorStop(1, 'rgba(255,226,190,0)'); x.fillStyle = kl; x.fillRect(100, 60, 200, 200); }
  { const bk = x.createLinearGradient(100, 0, 180, 0); bk.addColorStop(0, 'rgba(20,10,4,0.35)'); bk.addColorStop(1, 'rgba(20,10,4,0)'); x.fillStyle = bk; x.fillRect(90, 80, 90, 150); }
  { const br = x.createLinearGradient(0, 92, 0, 120); br.addColorStop(0, 'rgba(20,12,6,0.35)'); br.addColorStop(1, 'rgba(20,12,6,0)'); x.fillStyle = br; x.fillRect(120, 92, 120, 28); }
  { const bd = x.createLinearGradient(0, 0, 300, 0); bd.addColorStop(0, 'rgba(10,6,2,0.35)'); bd.addColorStop(0.5, 'rgba(10,6,2,0)'); x.fillStyle = bd; x.fillRect(0, 220, 300, 120); }
  x.restore();
  x.strokeStyle = 'rgba(170,200,200,0.22)'; x.lineWidth = 3; x.beginPath(); x.arc(150, 140, 48, Math.PI * 0.75, Math.PI * 1.25); x.stroke();
  { x.save(); x.globalCompositeOperation = 'destination-out'; const fe = x.createLinearGradient(262, 0, 300, 0); fe.addColorStop(0, 'rgba(0,0,0,0)'); fe.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = fe; x.fillRect(262, 220, 38, 120); x.restore(); } // the near shoulder turns away into the box: no hard edge
  davePic = c.toDataURL(); return davePic;
}
// (6.9.0) a Log step's reward: each item as its picture and its name in its rarity's ink, then the money if any
const REWARD_INK = { common: '#66665e', uncommon: '#3c6e42', rare: '#2c5884', exotic: '#6a3c8a', legendary: '#8a6224' };
// (7.6.42, owner) a quest's money shown with the game's own banknote stack before it, as the pearls have their pearl
let CASH_IC = null;
function cashIc() { if (!CASH_IC) { const c = document.createElement('canvas'); c.width = 64; c.height = 48; drawCash(c.getContext('2d'), 32, 24, 40); CASH_IC = c.toDataURL(); } return `<img class="qs-cash-ic" src="${CASH_IC}" alt="">`; }
function rewardHtml(m) {
  const ids = [].concat(m.gift ? [['item', m.gift]] : [], m.kit || []).filter(([k, id]) => k === 'item' && ITEMS[id]).map(([, id]) => ITEMS[id]);
  const items = ids.map((it) => `<span class="qs-gift"><img src="${pictureOf(it.kind, it, 150, 90, true)}" alt=""><em style="color:${REWARD_INK[it.rarity] || REWARD_INK.common}">${it.name}</em></span>`).join('');
  return items + (m.pay ? `<span class="qs-cash">${cashIc()}${money(m.pay, false)}</span>` : '');
}
// (7.6.55, owner) the diver on the bag's stand: his middle, his length and where his feet meet the floor, as shares of the stand's height
const EQ_MID = 0.35, EQ_LEN = 0.614, EQ_FEET = 0.885; // (measured: his head sits 0.43 of his length above his middle, his fins 0.87 below)
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
    this.chest = new ChestReveal($('chest'), { picture: (def, w, hh) => pictureOf(def.kind, def, w, hh, true), putOn: (u) => h.onEquip('on:' + u), coinPic: () => pictureOf('gold', 1, 120, 120, true), coins: () => (h.getProfile().gold || 0),
      close: () => { if (this.chestFromBag) { this.chestFromBag = false; this.toggleInventory(true); } /* (7.5.2, owner) a chest opened from the bag goes back to the bag */ if (!$('dave').hidden) this.dave.render(); if (!$('catalog').hidden) this.catalog.render(); if (!$('cave').hidden) this.renderCave(); } });
    this.catalog = new Catalog($('catalog'), { toast: (t, k) => h.toast && h.toast(t, k), getProfile: () => h.getProfile(), getGame: () => h.getGame(), buy: (k) => h.onBuy(k), checkout: (keys) => h.onCheckout(keys), canSell: () => !!(h.canSellGear && h.canSellGear()), sellFind: (k) => h.onDaveSell && h.onDaveSell(k), findsHtml: () => (this.dave && this.dave.findsHtml ? this.dave.findsHtml() : ''), daveSays: () => (this.dave && this.dave.says ? this.dave.says() : ''), save: () => h.onSaveProfile && h.onSaveProfile(), close: () => this.toggleCatalog(false), yard: () => this.openShop('sub', ['sub']) });
    try { this.dressPanels(); } catch (err) { /* the plain look stays */ }
    // (4.16.4) every purchase in the sub asks first
    this.tankRoom = new TankRoom($('tankroom'), { buy: (k) => { const price = k === 'bigTank' ? SUB_ADDONS.bigTank.price : (UPGRADES.pressTanks.costs || [])[lv(h.getProfile(), 'tPress')], what = k === 'bigTank' ? 'the large pressure tank' : `chamber ${Math.round(statValue(h.getProfile(), 'pressTanks')) + 1}`; this.confirm(`Buy ${what}?`, `${money(price, false)}`, 'Buy', 'Cancel', () => { h.onBuyNow(k); this.tankRoom.sig = ''; }); }, act: (a2, w, i, to) => h.onTank(a2, w, i, to), getGame: () => h.getGame(), say: (t) => h.toast && h.toast(t, 'warn'), close: () => this.toggleTank(false) });
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
      else if (act === 'buy' && b.classList.contains('pay-tag')) { const nm = (b.closest('.yd-refit, .yd-card, .yd-info') || b).querySelector('b, h4, h3'); this.confirm(`Buy ${nm ? nm.textContent.replace(/^No\. \d+(of \d+)?\s*/, '').trim() : 'it'}?`, money(h.costOf(arg), false), 'Buy', 'Cancel', () => { h.onBuyNow(arg); this.renderWorkshop(); }); } // (4.16.4) the sub page's price tags ask first
      else if (act === 'buy') h.onBuy(arg);
      else if (act === 'take') { h.onTakeContract(arg); }
      else if (act === 'refresh') { h.onRefreshContracts(); }
      else if (act === 'sellall') { const sale = h.onSellAll(); if (sale) this.showLedger(sale); }
      else if (act === 'tobasket') { (this.sellPick || (this.sellPick = new Set())).add(arg); }
      else if (act === 'frombasket') { this.sellPick && this.sellPick.delete(arg); }
      else if (act === 'sellone') { const sale = h.onSellSome([arg]); if (sale) this.showLedger(sale); }
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
    $('show-log').addEventListener('click', () => { const l = $('runlog'); l.hidden = !l.hidden; });
    $('fullscreen').addEventListener('click', () => {
      const d = document;
      if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
      else (d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})) : Promise.reject()).catch(() => {
        // (5.3) an iPhone's browser has no full screen for a page: the way is Add to Home Screen
        const ios = /iPhone|iPod/.test(navigator.userAgent);
        if (ios) this.confirm('Full screen on iPhone', 'Tap the Share button, then Add to Home Screen. Opened from there, the game plays full screen and sideways, with no browser bars.', 'OK', 'Close', () => {});
        else $('fullscreen').textContent = 'Full screen: add the game to your home screen';
      });
    });
    document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
    $('restart').addEventListener('click', () => this.confirm('Start a new game?', 'A new diver, from nothing: no cash, no gear, an empty journal. This save is replaced.', 'Start over', 'Keep playing', () => { const g = h.getGame(); g.paused = false; this.setPaused(false); h.onNewGame(); }));
    // the title screen: Continue, the three slots, controls, full screen
    $('continue').addEventListener('click', () => { const n = lastSlot(); if (n) h.onSlot(n); });
    // (5.6.5) on a phone, a long press on a diver: (5.6.9) that diver alone wobbles, with its delete mark; a tap
    // anywhere else stops it
    { let lpT = null; const sl = $('slots');
      sl.addEventListener('touchstart', (ev) => { if (!ev.target.closest('.slot') || ev.target.closest('.del')) return; clearTimeout(lpT); const held = ev.target.closest('.slot'); lpT = setTimeout(() => { sl.querySelectorAll('.slot.held').forEach((q) => q.classList.remove('held')); held.classList.add('held'); sl.classList.add('jiggle'); sl.__lp = true; navigator.vibrate && navigator.vibrate(12); }, 520); }, { passive: true });
      for (const t of ['touchend', 'touchmove', 'touchcancel']) sl.addEventListener(t, () => clearTimeout(lpT), { passive: true });
      document.addEventListener('pointerdown', (ev) => { if (sl.classList.contains('jiggle') && !ev.target.closest('#slots .del') && !sl.__lp) sl.classList.remove('jiggle'); sl.__lp = false; }, true);
      sl.addEventListener('click', (ev) => { if (sl.classList.contains('jiggle') && !ev.target.closest('.del')) { ev.stopImmediatePropagation(); } }, true); }
    $('slots').addEventListener('click', (ev) => {
      const del = ev.target.closest('.del'), card = ev.target.closest('.slot');
      if (!card) return;
      const n = +card.dataset.n;
      if (del) {
        ev.stopPropagation();
        const info = card.querySelector('.info'), what = info ? `${info.querySelector('b').textContent}: ${info.querySelector('span').textContent}.` : '';
        this.confirm(`Delete diver ${n}?`, `${what}\nIt will be gone for good.`, 'Delete for good', 'Keep it', () => { deleteSlot(n); this.showTitle(); });
        return;
      }
      if (card.classList.contains('damaged') && !card.classList.contains('sure')) { card.classList.add('sure'); card.querySelector('.info span').textContent = 'tap again to start a new game here'; return; }
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
    $('set-catchtags').addEventListener('click', () => this.redeemBox()); /* (7.6.21, owner) the fish names option gone (always on); this row redeems a code */
    $('set-sound').addEventListener('click', () => { h.onMute && h.onMute(); this.renderSettings(); });
    document.querySelector('#inventory .inv-close').addEventListener('click', () => this.toggleInventory(false));
    $('inventory').addEventListener('click', (ev) => { const tw = ev.target.closest && ev.target.closest('[data-tw]'); if (tw) { const P = this.h.getProfile(); P.trawlPick = tw.dataset.tw; this.h.onSaveProfile && this.h.onSaveProfile(); this.renderInventory(); return; } }, true);
    $('inventory').addEventListener('click', (ev) => { if (ev.target === $('inventory') && performance.now() - (this.dragEndAt || 0) > 400) this.toggleInventory(false); }); // (5.15.3) not the click that ends a drag off the panel
    $('set-graphics').addEventListener('click', () => { setSetting('fast', !SETTINGS.fast); this.renderSettings(); });
    $('set-units').addEventListener('click', () => { setUnits(imperial() ? 'metric' : 'imperial'); this.renderSettings(); }); // (6.0.3)
    $('set-uisize').addEventListener('click', () => { const order = ['small', 'normal', 'large'], i = order.indexOf(uiSizeName()); setUiSize(order[(i + 1) % 3]); this.renderSettings(); }); // (5.15.7)
    $('set-fullscreen').addEventListener('click', () => { $('fullscreen').click(); setTimeout(() => this.renderSettings(), 250); });
    document.addEventListener('fullscreenchange', () => { if (this.settingsOpen()) this.renderSettings(); });
    // the gear (title screen, journal, pause menu) opens the settings and controls
    document.addEventListener('click', (ev) => { if (ev.target.closest('[data-settings]')) this.toggleSettings(true); });
    document.querySelector('#settings .set-close').addEventListener('click', () => this.toggleSettings(false));
    $('settings').addEventListener('click', (ev) => { if (ev.target === $('settings')) this.toggleSettings(false); });
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
  // (6.5.9) the revive offer: the death written at the top, a broken heart under a large REVIVE, every kind he carries
  // (its picture, how many, what they fetch) and the haul's total, then the one way back he has (the first revive of a
  // dive an ad, the next $0.99) and Give up, which says what is lost. Calm: no timer, nothing flashing.
  // done(how): 'ad', 'pay' or 'no'
  reviveOffer(o, done) {
    let el = document.getElementById('revive');
    if (!el) { el = document.createElement('div'); el.id = 'revive'; document.body.appendChild(el); }
    const heart = '<svg class="rv-heart" viewBox="0 0 64 56" aria-hidden="true"><path d="M32 54 C22 45 4 34 4 18 C4 9 11 3 19 3 C25 3 29 6 32 10 L28 20 L35 27 L29 36 L34 45 Z" fill="#7a2f22" stroke="#1c0c08" stroke-width="2.2" stroke-linejoin="round"/><path d="M36 50 C45 42 60 31 60 18 C60 9 53 3 45 3 C40 3 36 6 34 9 L31 19 L38 27 L32 36 L37 44 Z" fill="#6a271c" stroke="#1c0c08" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 12 C14 8 18 7 21 8" fill="none" stroke="#c98a72" stroke-width="2" stroke-linecap="round" opacity="0.7"/></svg>';
    const rows = o.list.slice(0, 6).map((r) => { const R = rarityOf(r.sp); return `<div class="rv-fish"><img src="${fittedIcon(r.sp, 150, 90).toDataURL()}" alt=""><b style="color:${R ? R.col : '#efe8d2'}">${r.sp.name}</b><span>${r.n > 1 ? '×' + r.n + ' · ' : ''}${money(r.value)}</span></div>`; }).join('')
      + (o.list.length > 6 ? `<div class="rv-more">+${o.list.length - 6} more</div>` : '');
    // (7.3.9, owner) a revive costs fifty pearls: the pearl and the figure on the button; greyed when he has fewer
    const pc = o.pearls || 100, have = Math.floor((this.h.getProfile && this.h.getProfile().pearls) || 0), enough = have >= pc;
    // (7.7.2, owner) never greyed: with too few pearls a press says so, and offers the pearl shop
    const way = `<button class="rv-go" data-rv="pearls">Revive <span class="rv-price"><img class="rv-pearl" src="assets/ui/icons/pearl.png" alt="">${pc}</span></button>`;
    el.innerHTML = `<div class="rv-box"><p class="rv-cause">${o.cause}</p>${heart}<h4>Revive</h4>
      <div class="rv-list">${rows}</div>
      <p class="rv-haul"><span>Haul</span><b>${money(o.value)}</b></p>
      <div class="rv-acts">${way}<button class="rv-no" data-rv="no">Give up<small>The haul is lost</small></button></div></div>`;
    el.hidden = false;
    let busy = false;
    el.onclick = (ev) => {
      if (busy) return;
      if (ev.target.closest('[data-rvs="no"]')) { const m = el.querySelector('.rv-short'); if (m) m.remove(); return; }
      if (ev.target.closest('[data-rvs="more"]')) { const m = el.querySelector('.rv-short'); if (m) m.remove(); this.toggleStore(true); this.storeTab = 'pearls'; const st = $('store'); if (st && this.pearlPage) st.innerHTML = this.pearlPage(); return; }
      const b2 = ev.target.closest('[data-rv]'); if (!b2) return;
      if (b2.dataset.rv === 'pearls' && Math.floor((this.h.getProfile && this.h.getProfile().pearls) || 0) < pc) { // (7.7.2, owner) too few pearls: said, with the way to more
        if (!el.querySelector('.rv-short')) el.querySelector('.rv-box').insertAdjacentHTML('beforeend', `<div class="rv-short"><div class="rv-sbox"><h5>Not enough pearls</h5><p>This revive needs <img class="rv-pearl" src="assets/ui/icons/pearl.png" alt="">${pc}; you have ${Math.floor((this.h.getProfile && this.h.getProfile().pearls) || 0)}.</p><div class="rv-sacts"><button data-rvs="no">No thanks</button><button data-rvs="more">Get more</button></div></div></div>`);
        this.h.click && this.h.click(); return; }
      busy = true; const how = b2.dataset.rv;
      if (how !== 'no') el.classList.add('wait');
      Promise.resolve(done(how)).finally(() => { el.hidden = true; el.classList.remove('wait'); });
    };
  }
  // (6.7.0) the creator, before a new diver's first dive: a name (12 letters, Earl if left empty) and a look, the head in
  // profile as it will be on deck. Man or woman, a face, the eyes, the hair, the skin. Skip keeps Earl as he is.
  // done({ name, look }) or done(null) for Skip
  showCreator(done) {
    let el = document.getElementById('creator');
    if (!el) { el = document.createElement('div'); el.id = 'creator'; document.body.appendChild(el); }
    const L = { ...DEFAULT_LOOK, beard: 1, hc: 1, eyeCol: 0 }, cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
    // (7.1.5) laid out in groups: the name as the card's title; Diver (man or woman, face); Head (hair, beard, eyes, each on
    // its own small tab so every control stays large); Skin. Skip at the top right; Dive the big button at the foot. The
    // diver is painted on the card itself (no circle), his shoulders running off its foot, the water behind him fading
    // into the steel
    const pick = (k) => `<div class="cr-pick"><button data-k="${k}" data-d="-1">‹</button><b data-v="${k}"></b><button data-k="${k}" data-d="1">›</button></div>`;
    el.innerHTML = `<div class="cr-box"><div class="cr-port"><canvas width="520" height="600"></canvas></div>
      <div class="cr-side"><button class="cr-skip">Skip</button>
        <div class="cr-name"><span>New diver</span><div class="cr-field" role="textbox" aria-label="Name"><i class="cr-ph">Enter name</i><b class="cr-txt"></b><i class="cr-caret"></i>${PENCIL}</div></div>
        <div class="cr-grp"><h5>Diver</h5><div class="cr-seg"><button data-sex="m">Man</button><button data-sex="f">Woman</button></div><div class="cr-line"><span>Face</span>${pick('face')}</div></div>
        <div class="cr-grp"><h5>Head</h5><div class="cr-tabs"><button data-tab="hair">Hair</button><button data-tab="beard">Beard</button><button data-tab="eyes">Eyes</button></div>
          <div class="cr-tab" data-p="hair"><div class="cr-line"><span>Style</span>${pick('hair')}</div><div class="cr-skins cr-sm">${HAIR_COLS.map(([n, c], i) => `<button data-hc="${i}" style="--c0:${c[0]};--c1:${c[2]}" aria-label="${n}"></button>`).join('')}</div></div>
          <div class="cr-tab" data-p="beard"><div class="cr-line"><span>Beard</span>${pick('beard')}</div></div>
          <div class="cr-tab" data-p="eyes"><div class="cr-line"><span>Set</span>${pick('eyes')}</div><div class="cr-skins cr-sm">${EYE_COLS.map(([n, c], i) => `<button data-ec="${i}" style="--c0:${c};--c1:#0c0a08" aria-label="${n}"></button>`).join('')}</div></div></div>
        <div class="cr-grp"><h5>Skin</h5><div class="cr-skins">${SKINS.map((c, i) => `<button data-skin="${i}" style="--c0:${c[0]};--c1:${c[2]}" aria-label="Skin ${i + 1}"></button>`).join('')}</div></div>
        <button class="cr-go">Dive</button></div></div><div class="cr-kb" hidden></div>`;
    let tab = 'hair';
    el.hidden = false;
    const cv = el.querySelector('canvas'), x = cv.getContext('2d');
    const draw = () => {
      x.clearRect(0, 0, 520, 600); x.save(); x.translate(0, 60); // (7.1.5) the figure sits lower: shoulders off the card's foot
      { // the water behind him, fading out into the card's steel on every side: a lamp-glow behind the head, motes, and a
        // diving helmet hanging on its hook in the dark beside him
        const bg = document.createElement('canvas'); bg.width = 520; bg.height = 600; const b2 = bg.getContext('2d');
        const w0 = b2.createRadialGradient(250, 190, 20, 250, 230, 300); w0.addColorStop(0, '#36525a'); w0.addColorStop(0.45, '#1a2c32'); w0.addColorStop(1, '#0a1416'); b2.fillStyle = w0; b2.fillRect(0, 0, 520, 600);
        let sd = 9; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 60; i++) { b2.fillStyle = `rgba(214,226,220,${(0.05 + r() * 0.12).toFixed(3)})`; b2.beginPath(); b2.arc(r() * 520, r() * 520, 0.8 + r() * 1.6, 0, Math.PI * 2); b2.fill(); }
        b2.globalCompositeOperation = 'destination-in'; const m0 = b2.createRadialGradient(250, 250, 90, 250, 270, 245); /* fades out before the canvas's edges: no hard border */ m0.addColorStop(0, '#000'); m0.addColorStop(1, 'rgba(0,0,0,0)'); b2.fillStyle = m0; b2.fillRect(0, 0, 520, 600);
        x.drawImage(bg, 0, -60); }
      // (7.0.8) built as Dave is: shoulders in the wetsuit turning away (the far one in shadow), a neck from under the
      // jaw into a wrapping roll collar, the head lit from the front and above with its back in shadow
      const sk = SKINS[L.skin] || SKINS[2], lg = (x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
      { const sh = new Path2D(); sh.moveTo(-10, 540); sh.lineTo(-10, 470); sh.bezierCurveTo(60, 420, 140, 396, 200, 392); sh.lineTo(320, 390); sh.bezierCurveTo(400, 400, 470, 440, 530, 500); sh.lineTo(530, 540); sh.closePath();
        x.fillStyle = lg(0, 0, 520, 0, [[0, '#0a0c0e'], [0.45, '#1e2328'], [0.8, '#2e353b'], [1, '#161a1e']]); x.fill(sh);
        /* (7.4.26, owner) the suit as a body under it, not a flat cut-out: light from the front and above rounds the near shoulder (a soft highlight
           on its top, falling off over the curve), the chest turns down into shade, the far shoulder sinks into the dark, and a rim of
           cold light from behind catches the far edge */
        x.save(); x.clip(sh);
        { const hl = x.createRadialGradient(410, 420, 8, 400, 440, 190); hl.addColorStop(0, 'rgba(160,174,180,0.5)'); hl.addColorStop(0.45, 'rgba(120,134,140,0.2)'); hl.addColorStop(1, 'rgba(110,124,130,0)'); x.fillStyle = hl; x.fillRect(0, 380, 540, 170);
          const hl2 = x.createRadialGradient(130, 430, 6, 130, 440, 140); hl2.addColorStop(0, 'rgba(120,134,140,0.12)'); hl2.addColorStop(1, 'rgba(120,134,140,0)'); x.fillStyle = hl2; x.fillRect(0, 380, 300, 170);
          x.fillStyle = lg(0, 410, 0, 545, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.6)']]); x.fillRect(-10, 380, 550, 170); // turning down and away into shade
          x.fillStyle = lg(0, 0, 220, 0, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(-10, 380, 240, 170); // the far shoulder in the dark
          const ao = x.createRadialGradient(262, 405, 20, 262, 410, 120); ao.addColorStop(0, 'rgba(0,0,0,0.45)'); ao.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = ao; x.fillRect(120, 380, 290, 120); }
        x.restore();
        x.strokeStyle = 'rgba(120,150,170,0.28)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-6, 468); x.bezierCurveTo(60, 422, 130, 400, 190, 394); x.stroke(); // rim light along the far shoulder
        x.strokeStyle = 'rgba(160,170,170,0.18)'; x.lineWidth = 3; x.beginPath(); x.moveTo(330, 394); x.bezierCurveTo(400, 404, 456, 436, 500, 480); x.stroke(); // the near shoulder's lit edge
        // (7.1.3) a real wetsuit: a raised shoulder panel of thicker neoprene, its seams glued and stitched, creases where
        // the suit bends at the shoulder, the texture of the rubber
        x.save(); x.clip(sh);
        { const pn = new Path2D(); pn.moveTo(300, 388); pn.bezierCurveTo(380, 396, 450, 430, 520, 480); pn.lineTo(520, 520); pn.bezierCurveTo(450, 470, 380, 440, 296, 432); pn.closePath();
          x.fillStyle = lg(0, 390, 0, 480, [[0, 'rgba(70,80,86,0.55)'], [1, 'rgba(40,46,50,0.2)']]); x.fill(pn);
          x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 3; x.stroke(pn); x.strokeStyle = 'rgba(150,160,160,0.35)'; x.lineWidth = 1.2; x.setLineDash([4, 4]); x.stroke(pn); x.setLineDash([]); }
        x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(150, 420); x.bezierCurveTo(170, 470, 168, 500, 160, 540); x.stroke();
        x.strokeStyle = 'rgba(150,160,160,0.25)'; x.lineWidth = 1.2; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(155, 420); x.bezierCurveTo(175, 470, 173, 500, 165, 540); x.stroke(); x.setLineDash([]);
        x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 4; x.lineCap = 'round'; for (const [a, b, c2, d] of [[230, 470, 250, 520], [300, 460, 330, 512], [90, 470, 110, 520]]) { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c2) / 2 + 10, (b + d) / 2, c2, d); x.stroke(); }
        x.strokeStyle = 'rgba(140,150,150,0.14)'; x.lineWidth = 3; for (const [a, b, c2, d] of [[236, 468, 256, 518], [306, 458, 336, 510]]) { x.beginPath(); x.moveTo(a - 5, b); x.quadraticCurveTo((a + c2) / 2 + 4, (b + d) / 2, c2 - 5, d); x.stroke(); }
        let sd2 = 5; const r2 = () => ((sd2 = (sd2 * 16807) % 2147483647) / 2147483647); x.fillStyle = 'rgba(255,255,255,0.035)'; for (let i = 0; i < 900; i++) x.fillRect(r2() * 540 - 10, 380 + r2() * 160, 2, 2); // the rubber's grain
        x.restore();
        // the zip at the throat: a short run of teeth and its pull
        x.fillStyle = '#3c3e3a'; for (let i = 0; i < 6; i++) x.fillRect(296 + (i % 2) * 3, 430 + i * 7, 4, 5); x.fillStyle = '#8a8676'; x.fillRect(293, 424, 10, 7); }
      // (7.1.6) the neck runs down into the suit: a column from under the skull and jaw that widens into the shoulders
      // (no floating stub); a snug neoprene roll collar wraps its foot, lit along its top, shaded in its fold, one with the
      // suit's shoulders (no dark hole); a soft shadow under the jaw and where the collar meets the skin
      { const nw = L.sex === 'f' ? 40 : 50, nk = new Path2D(); nk.moveTo(236 - nw, 250); nk.bezierCurveTo(222 - nw, 320, 226 - nw, 366, 214 - nw, 410); /* (7.4.26, owner) its back edge starts up under the skull, so no notch shows below the ear */ nk.lineTo(296 + nw, 410); nk.bezierCurveTo(272 + nw, 366, 262 + nw, 330, 264 + nw, 296); nk.lineTo(236 - nw, 250); nk.closePath();
        x.fillStyle = lg(200, 0, 330, 0, [[0, sk[2] || sk[1]], [0.6, sk[1]], [1, sk[0]]]); x.fill(nk);
        { const js = x.createRadialGradient(300, 300, 6, 296, 306, 62); js.addColorStop(0, 'rgba(20,10,4,0.42)'); js.addColorStop(1, 'rgba(20,10,4,0)'); x.save(); x.clip(nk); x.fillStyle = js; x.fillRect(200, 250, 200, 140); x.restore(); } // the jaw's shadow, only under the jaw (across the whole neck it read as a dark wedge under the ear)
        x.fillStyle = lg(190, 0, 250, 0, [[0, 'rgba(20,10,4,0.35)'], [1, 'rgba(20,10,4,0)']]); x.fill(nk); // the back of the neck turning away
        x.strokeStyle = 'rgba(40,20,10,0.22)'; x.lineWidth = 3; x.beginPath(); x.moveTo(236, 312); x.quadraticCurveTo(258, 350, 292, 386); x.stroke(); // the neck's muscle
        const cw = nw + 16, ct = 372, col = new Path2D(); // the roll collar, hugging the neck
        col.moveTo(258 - cw - 22, 418); col.bezierCurveTo(250 - cw, 392, 252 - cw, ct + 4, 260 - cw * 0.5, ct); col.bezierCurveTo(262, ct - 6, 282, ct - 6, 270 + cw * 0.6, ct + 2); col.bezierCurveTo(276 + cw, ct + 8, 286 + cw, 392, 300 + cw + 24, 420); col.lineTo(300 + cw + 30, 446); col.bezierCurveTo(280, 430, 230, 430, 258 - cw - 30, 446); col.closePath();
        x.fillStyle = 'rgba(20,10,4,0.4)'; x.beginPath(); x.ellipse(262, ct + 2, cw * 0.95, 10, 0, 0, Math.PI * 2); x.fill(); // the collar's shadow on the skin, just above it
        x.fillStyle = lg(0, ct - 6, 0, 446, [[0, '#4a535a'], [0.3, '#2c3238'], [0.7, '#1a1e22'], [1, '#121518']]); x.fill(col);
        x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(258 - cw, 396); x.bezierCurveTo(230, 410, 300, 410, 300 + cw, 398); x.stroke(); // the roll's fold
        x.strokeStyle = 'rgba(170,180,180,0.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(262 - cw * 0.5, ct + 1); x.bezierCurveTo(262, ct - 5, 282, ct - 5, 268 + cw * 0.6, ct + 3); x.stroke(); }
      { const fc = document.createElement('canvas'); fc.width = fc.height = 520; const f = fc.getContext('2d');
        f.save(); f.translate(255, 250); f.rotate(-Math.PI / 2); drawFace(f, 0, 0, 18, L); f.restore();
        f.globalCompositeOperation = 'source-atop';
        const kl = f.createRadialGradient(330, 220, 10, 330, 220, 170); kl.addColorStop(0, 'rgba(255,228,196,0.2)'); kl.addColorStop(1, 'rgba(255,228,196,0)'); f.fillStyle = kl; f.fillRect(0, 0, 520, 520); // key light on the face
        f.fillStyle = lg(140, 0, 280, 0, [[0, 'rgba(10,6,2,0.45)'], [1, 'rgba(10,6,2,0)']]); f.fillRect(0, 0, 520, 520); // the back of the head in shadow
        x.drawImage(fc, 0, 0); }
      x.restore();
      el.querySelectorAll('[data-sex]').forEach((b) => b.classList.toggle('on', b.dataset.sex === L.sex));
      el.querySelectorAll('[data-skin]').forEach((b) => b.classList.toggle('on', +b.dataset.skin === L.skin));
      el.querySelectorAll('[data-hc]').forEach((b) => b.classList.toggle('on', +b.dataset.hc === L.hc)); el.querySelectorAll('[data-ec]').forEach((b) => b.classList.toggle('on', +b.dataset.ec === L.eyeCol));
      el.querySelector('[data-tab="beard"]').hidden = L.sex === 'f'; if (L.sex === 'f' && tab === 'beard') tab = 'hair'; el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab)); el.querySelectorAll('.cr-tab').forEach((p) => { p.hidden = p.dataset.p !== tab; }); el.querySelector('[data-v="beard"]').textContent = BEARDS[L.beard || 0];
      el.querySelector('[data-v="face"]').textContent = FACES[L.face]; el.querySelector('[data-v="eyes"]').textContent = EYES[L.eyes]; el.querySelector('[data-v="hair"]').textContent = HAIR_NAMES[L.hair];
    };
    draw();
    // (7.2.8) the name is typed on the game's own keyboard, not the phone's (which covered half the card, offered words,
    // and sat badly in the turned frame): worn keys on an olive plate rising from the foot of the screen, letters with
    // Shift (twice for capitals held), a page of numbers and marks, space, delete (held, it repeats) and Done. The first
    // letter is a capital by itself. Each letter is stamped onto the plate as it is typed
    let name = '', shift = 1, caps = false, page = 0, lastShift = 0;
    const field = el.querySelector('.cr-field'), txt = el.querySelector('.cr-txt'), kb = el.querySelector('.cr-kb');
    const ROWS = [['qwertyuiop', 'asdfghjkl', '^zxcvbnm<', '#_>'], ['1234567890', "-'.,&!?", '@<', '#_>']];
    const showName = (stamp) => { txt.innerHTML = [...name].map((c, i) => `<span${stamp && i === name.length - 1 ? ' class="new"' : ''}>${c === ' ' ? '&nbsp;' : c.replace(/[<&]/g, (m) => (m === '<' ? '&lt;' : '&amp;'))}</span>`).join(''); field.classList.toggle('empty', !name); };
    const kbDraw = () => { kb.innerHTML = ROWS[page].map((r) => `<div class="kr">${[...r].map((c) => c === '^' ? `<button data-kk="shift" class="wide${shift || caps ? ' on' : ''}${caps ? ' caps' : ''}" aria-label="Shift">${ARROW_UP}</button>`
        : c === '<' ? `<button data-kk="del" class="wide" aria-label="Delete">${BACK}</button>` : c === '#' ? `<button data-kk="page" class="wide">${page ? 'ABC' : '123'}</button>`
        : c === '_' ? '<button data-kk="space" class="space">space</button>' : c === '>' ? '<button data-kk="done" class="wide done">Done</button>' : c === '@' ? '<span class="gap"></span>'
        : `<button data-kk="${c}">${page === 0 && (shift || caps) ? c.toUpperCase() : c}</button>`).join('')}</div>`).join(''); };
    const type = (c) => { if (name.length >= 12) { field.classList.remove('full'); void field.offsetWidth; field.classList.add('full'); return; } if (page === 0 && (shift || caps)) c = c.toUpperCase(); name += c; if (!caps) shift = 0; showName(true); kbDraw(); };
    const del = () => { name = name.slice(0, -1); if (!name) shift = 1; showName(false); kbDraw(); };
    const kbOpen = (on) => { kb.hidden = !on; field.classList.toggle('typing', on); el.classList.toggle('kb-on', on); if (on) { if (!name) shift = 1; kbDraw(); } };
    showName(false);
    field.addEventListener('click', (ev) => { ev.stopPropagation(); kbOpen(kb.hidden); });
    let rep = 0, repT = 0; const stopRep = () => { clearTimeout(repT); clearInterval(rep); rep = 0; };
    kb.addEventListener('pointerdown', (ev) => { const b = ev.target.closest('button'); if (!b) return; ev.preventDefault(); b.classList.add('down'); const k = b.dataset.kk;
      if (k === 'del') { del(); repT = setTimeout(() => { rep = setInterval(del, 80); }, 420); return; }
      if (k === 'shift') { const now = performance.now(); if (caps) { caps = false; shift = 0; } else if (now - lastShift < 350) { caps = true; shift = 1; } else shift = shift ? 0 : 1; lastShift = now; kbDraw(); return; }
      if (k === 'page') { page = 1 - page; kbDraw(); return; }
      if (k === 'space') { if (name && !name.endsWith(' ')) type(' '); return; }
      if (k === 'done') { kbOpen(false); return; }
      type(k); });
    const up = () => { stopRep(); kb.querySelectorAll('.down').forEach((b) => b.classList.remove('down')); };
    kb.addEventListener('pointerup', up); kb.addEventListener('pointercancel', up); kb.addEventListener('pointerleave', up);
    kb.addEventListener('click', (ev) => ev.stopPropagation());
    const inp = { blur: () => kbOpen(false) };
    el.onclick = (ev) => {
      const b = ev.target.closest('button'); if (!kb.hidden && !ev.target.closest('.cr-kb')) kbOpen(false); if (!b) return;
      if (b.dataset.tab) { tab = b.dataset.tab; }
      else if (b.dataset.sex) { L.sex = b.dataset.sex; L.beard = L.sex === 'f' ? 0 : (L.beard || 1); if (L.sex === 'f' && ['crop', 'buzz', 'swept'].includes(L.hair)) L.hair = 'bob'; if (L.sex === 'm' && ['bob', 'ponytail', 'bun'].includes(L.hair)) L.hair = 'swept'; }
      else if (b.dataset.k === 'face') L.face = (L.face + +b.dataset.d + FACES.length) % FACES.length;
      else if (b.dataset.k === 'eyes') L.eyes = (L.eyes + +b.dataset.d + EYES.length) % EYES.length;
      else if (b.dataset.k === 'hair') L.hair = cyc(HAIRS, L.hair, +b.dataset.d);
      else if (b.dataset.skin != null) L.skin = +b.dataset.skin;
      else if (b.dataset.hc != null) { L.hc = +b.dataset.hc; delete L.hairCol; }
      else if (b.dataset.ec != null) L.eyeCol = +b.dataset.ec;
      else if (b.dataset.k === 'beard') L.beard = ((L.beard || 0) + +b.dataset.d + BEARDS.length) % BEARDS.length;
      else if (b.classList.contains('cr-skip')) { el.hidden = true; inp.blur(); done(null); return; }
      else if (b.classList.contains('cr-go')) { el.hidden = true; inp.blur(); done({ name: name.trim().slice(0, 12) || 'Diver', look: { ...L } }); return; }
      draw();
    };
  }
  showChest(key, finds, coin = false) { this.chest.open(key, finds, coin); } // (6.4.0) finds: [{ q, def }], and whether an old coin came up
  // (6.4.0) the Shop and Events screens (left menu): chests for cash; the daily gift
  toggleStore(force) { const el = $('store'), on = force === undefined ? el.hidden : force; if (on) { this.closeAll(); el.innerHTML = storeHtml(this.h.getProfile(), isTestStore()); } el.hidden = !on; this.storeWire(el); }
  toggleEvents(force) { const el = $('events'), on = force === undefined ? el.hidden : force; if (on) { this.closeAll(); el.innerHTML = eventsHtml(this.h.getProfile(), pictureOf('gold', 3, 120, 90, true), pictureOf('supply', 'necklace', 120, 90, true), (k, id) => pictureOf(k, id, 120, 90, true), this.cashPicture()); } el.hidden = !on; this.storeWire(el); }
  // (7.3.0) the painted bundle of notes (coins.js drawCash), for cash anywhere a picture is wanted
  cashPicture() { if (!this.cashPic) { const c = document.createElement('canvas'); c.width = 300; c.height = 180; const x = c.getContext('2d'); drawCash(x, 150, 95, 120); this.cashPic = c.toDataURL(); } return this.cashPic; }
  petsPage() { if (!this.fitPics) this.fitPics = new Map(); const fit = (id) => { const sp3 = SPECIES_BY_ID[id], k = 'pet' + id; if (!this.fitPics.has(k)) this.fitPics.set(k, petIcon(sp3, 300, 180).toDataURL()); return this.fitPics.get(k); }; return petsHtml(this.h.getProfile(), isTestStore(), fit, (id) => SPECIES_BY_ID[id].name, this.petCat || 'pets'); }
  // (7.6.2, owner) the scroll shelf, coins for pearls and pearl packs (shelf.js), each asked first
  pearlPage() { const P = this.h.getProfile(), t = this.storeTab || 'scrolls', tabs = shopTabs(t, isTestStore(), P);
    return t === 'coins' ? coinsHtml(P, tabs, this.cashPicture()) : t === 'pearls' ? packsHtml(P, tabs) : scrollsHtml(P, tabs, (it) => pictureOf(it.kind, it, 220, 160, true)); }
  pearlBuy(b, el) {
    const P = this.h.getProfile(), save = () => this.h.onSaveProfile && this.h.onSaveProfile(), redraw = () => { if (!el.hidden) el.innerHTML = this.pearlPage(); };
    const pay = (n) => { if ((P.pearls || 0) < n) { this.h.toast && this.h.toast('Not enough pearls', 'warn'); return false; } P.pearls -= n; return true; };
    const num = (n) => n.toLocaleString('en-US');
    if (b.dataset.shelf != null) { const s = shelfOf(P).slots[+b.dataset.shelf], it = s && ITEMS[s.id]; if (!it || s.sold) return; const price = shelfPrice(s.id);
      this.confirm('Buy ' + it.name + '?', RARITY[it.rarity].name + ' scroll · ' + num(price) + ' pearls', 'Buy', 'Keep looking', () => {
        if ((P.pearls || 0) < price) { this.h.toast && this.h.toast('Not enough pearls', 'warn'); return; }
        if (!(this.h.giveItem && this.h.giveItem(s.id))) return; pay(price); s.sold = true; save(); redraw(); this.showGains([{ kind: 'item', id: s.id, how: 'Bought' }]); }); return; }
    if (b.dataset.restock) { this.confirm('Restock the shelf?', 'Three new scrolls · ' + RESTOCK_PEARLS + ' pearls', 'Restock', 'Keep these', () => { if (!pay(RESTOCK_PEARLS)) return; restock(P); save(); redraw(); }); return; }
    if (b.dataset.coins != null) { const deal = b.dataset.coins === 'deal', o = deal ? COIN_DEAL : COIN_OFFERS[+b.dataset.coins]; if (!o || (deal && dealTaken(P))) return;
      this.confirm('Cash, ' + money(o.cash, false) + '?', o.pearls + ' pearls', 'Buy', 'Not now', () => { if (!pay(o.pearls)) return; if (deal) takeDeal(P); P.cash = Math.round((P.cash + o.cash) * 100) / 100; save(); redraw(); this.showGains([{ kind: 'cash', n: o.cash, how: 'Bought' }]); }); return; }
    if (b.dataset.pack) { const key = b.dataset.pack; b.disabled = true; import('./purchases.js').then(async (M) => { const r = await M.buy(key); b.disabled = false; if (r && r.ok) { P.pearls = (P.pearls || 0) + M.PRODUCTS[key].pearls; save(); redraw(); this.showGains([{ kind: 'pearl', n: M.PRODUCTS[key].pearls }], true); } }); }
  }
  // (7.6.74, owner) the shop's tab pictures, painted once from the game's own art and handed to the CSS as variables
  tabIcons() { if (this.tabIconsSet) return; this.tabIconsSet = true; const root = document.documentElement.style, set = (k, url) => { if (url) root.setProperty('--ti-' + k, `url("${url}")`); };
    try { set('shop', chestPicture(CHESTS.crate.look, 96, 72)); } catch (e) { /* no chest art yet */ }
    try { const sc = ITEMS.ab_sprint_rare || Object.values(ITEMS).find((it) => it.kind === 'ability'); if (sc) set('scrolls', pictureOf(sc.kind, sc, 96, 72, true)); } catch (e) { /* none */ }
    set('pets', 'assets/ui/icons/act-pet.png'); set('coins', this.cashPicture()); set('pearls', 'assets/ui/icons/pearl.png'); }
  storeWire(el) { this.tabIcons(); if (el.__w) return; el.__w = true; el.addEventListener('click', (ev) => {
    if (ev.target.closest('.st-x') || ev.target === el) { el.hidden = true; return; }
    const b = ev.target.closest('[data-store]'); if (b) { if (this.h.onBuy('chest:' + b.dataset.store)) el.innerHTML = storeHtml(this.h.getProfile(), isTestStore()); return; }
    const pc = ev.target.closest('[data-petcat]'); if (pc) { this.petCat = pc.dataset.petcat; el.innerHTML = this.petsPage(); return; } // (7.4.16) Pets / Exclusive
    const pb = ev.target.closest('[data-pet]'); if (pb) { this.h.onBuyPet && this.h.onBuyPet(+pb.dataset.pet, () => { if (!el.hidden) el.innerHTML = this.petsPage(); }); return; } // (7.3.9, 7.4.14) a buy is asked first
    const tb0 = ev.target.closest('[data-tab]'); if (tb0 && tb0.dataset.tab === 'pets') { el.innerHTML = this.petsPage(); return; } // (7.3.9) the pets, for pearls
    if (tb0 && ['scrolls', 'coins', 'pearls'].includes(tb0.dataset.tab)) { this.storeTab = tb0.dataset.tab; el.innerHTML = this.pearlPage(); return; } // (7.6.2, owner) the pearl pages
    { const pb2 = ev.target.closest('[data-shelf],[data-restock],[data-coins],[data-pack]'); if (pb2) { this.pearlBuy(pb2, el); return; } }
    if (tb0 && tb0.dataset.tab === 'shop' && !isTestStore()) { el.innerHTML = storeHtml(this.h.getProfile(), false); return; }
    const tb = ev.target.closest('[data-tab]'); if (tb && isTestStore()) { el.innerHTML = tb.dataset.tab === 'test' ? testHtml(this.h.getProfile(), Object.values(ITEMS).filter((it) => !it.free).sort((a, c) => a.name.localeCompare(c.name))) : storeHtml(this.h.getProfile(), true); return; } // (6.9.0)
    const tt = ev.target.closest('[data-test]'); if (tt && isTestStore()) { const [act, arg] = tt.dataset.test.split('|'); if (act === 'item' || act === 'item3') { const sel = el.querySelector('.' + (arg || 'tt-item')), v = sel && sel.value; if (v) for (let k = 0; k < (act === 'item3' ? 3 : 1); k++) this.h.onTest && this.h.onTest('item', v); return; } this.h.onTest && this.h.onTest(act, arg); return; }
    if (ev.target.closest('[data-ev]')) { this.h.onClaim && this.h.onClaim(); this.toggleEvents(true); return; }
    // (6.5.0) a day tapped: a chest shows its odds (the shop's table, by its data-rates); anything else its card
    const d = ev.target.closest('[data-evday]'); if (d && !d.dataset.rates) { const r = calWeek(this.h.getProfile())[+d.dataset.evday]; this.previewCard(r.k === 'cash' ? { kind: 'cash', n: r.v } : r.k === 'glow' ? { kind: 'supply', id: r.adv ? 'glowAdv' : 'necklace', n: r.v } : r.k === 'trap' ? { kind: 'trap', id: r.v } : r.k === 'coin' ? { kind: 'coin', n: r.v } : { kind: 'item', id: 'chest_' + r.v }); } });
    // the countdown beside the greyed Claim, kept current while the screen is open
    if (el.id === 'events') setInterval(() => { if (el.hidden) return; const w = el.querySelector('.ev-wait'); if (w) { const P0 = window.__earl && window.__earl.profile, t = P0 ? giftWait(P0) : 0; if (t <= 0) this.toggleEvents(true); else { const txt = hms(t); if (w.textContent !== txt) w.textContent = txt; } } }, 1000); }
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
      window.addEventListener('actdown', (ev) => { if (!el.hidden && ev.key === 'f') { ev.preventDefault(); ev.stopImmediatePropagation(); el.hidden = true; } }, true);
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
      // (4.28) the group folds away: only the quest board's picture shows; a tap opens it out (the next step, the
      // journal, the chart) and it folds again after a few seconds. With a quest ready to claim, the tap opens the board.
      b.addEventListener('click', () => { const n0 = this.h.questsReady ? this.h.questsReady() : 0, ask = window.__tutAct; /* (7.4.0) a tutorial step that asks for the journal gets the journal, even with a quest waiting */ if (ask === 'journal') this.toggleJournal(true); else if (n0 || ask === 'quests') this.toggleQuests(); else this.toggleJournal(); /* (5.6.7) a phone: one book; its tabs lead to the quests and the chart */ });
      $('quests-hud').querySelector('.qh-step').addEventListener('click', () => this.toggleQuests());
      // (4.27) the journal and the chart: under the quest board, at the left, as pictures
      $('hud-journal').addEventListener('click', () => this.toggleJournal());
      $('hud-chart').addEventListener('click', () => { this.closeAll(); this.chart.toggle(true); });
      $('quests').querySelector('.qs-close').addEventListener('click', () => this.toggleQuests(false));
      $('quests').addEventListener('click', (ev) => {
        if (ev.target === $('quests')) { this.toggleQuests(false); return; }
        const a = ev.target.closest('[data-q]'); if (!a || a.disabled) return;
        const [act, arg] = a.dataset.q.split('|');
        if (act === 'info') { this.questInfo(arg); return; } // (4.8.1)
        if (act === 'tab') { this.qTab = arg; this.h.audio && this.h.audio.click && this.h.audio.click(); } // (7.6.38)
        else if (act === 'ach') this.h.onAchClaim && this.h.onAchClaim(arg);
        else if (act === 'claim') this.h.onQuestClaim(arg); else if (act === 'refresh') this.h.onQuestRefresh(arg === 'paid');
        this.renderQuests();
      });
    }
    const wrap = $('quests-hud'); wrap.hidden = !show;
    const P0 = this.h.getProfile && this.h.getProfile(), S0 = P0 && P0.quests, st = S0 && QUEST_MAIN[S0.main];
    { const txt = st && st.on ? stepLabel(P0) : '', el = wrap.querySelector('.qh-step'); // (4.3.4) the first fish shows which part it is on
      if (el.textContent !== txt) { el.textContent = txt; if (txt && show) this.hudPeek(); } } // (5.0) a new step: only its words show a moment; the journal and chart stay folded away
    const n = this.h.questsReady ? this.h.questsReady() : 0, dot = b.querySelector('i');
    // (5.9.6) on a phone the journal's coin wears a red "!" (as games do) for a quest to claim or an animal not yet looked at
    const gJ = this.h.getGame && this.h.getGame(), jNew = !!(P0 && gJ && gJ.journal && gJ.journal.size > (P0.jSeenN ?? gJ.journal.size));
    if (P0 && gJ && gJ.journal && P0.jSeenN == null) P0.jSeenN = gJ.journal.size;
    const want = n > 0 || (jNew), txt = '!';
    dot.hidden = !want; window.__journalBadge = !!want; // (5.15.7) the folded menu's tab shows it too
    if (want && dot.textContent !== txt) dot.textContent = txt; dot.classList.toggle('bang', true); // (6.5.0) these had slipped into the comment above: the badge was an empty white dot
    if (!$('quests').hidden && this.qLast !== Math.floor(performance.now() / 1000)) { this.qLast = Math.floor(performance.now() / 1000); this.renderQuests(); }
  }
  // (4.28) open or fold the left-hand group; open for `ms` then fold again on its own
  hudPeek(ms = 4000) { const w = $('quests-hud'); if (!w) return; clearTimeout(this.hpT); w.classList.add('peek'); this.hpT = setTimeout(() => w.classList.remove('peek'), ms); }
  hudGroup(open, ms = 6000) { const w = $('quests-hud'); if (!w) return; clearTimeout(this.hgT); w.classList.toggle('open', !!open); if (open) this.hgT = setTimeout(() => w.classList.remove('open'), ms); }
  questsOpen() { return !$('quests').hidden; }
  // (4.8.1) a quest's i: what it asks, and where to go for it. A species: its card. A group: some of its animals and
  // the depths they keep. A depth: the sea in section with where he is, the depth asked for, and the nearest place
  // that deep. A tool or a challenge: how. An undocumented species: only where to look (no picture: that is the find).
  questInfo(key) {
    const P = this.h.getProfile(), g = this.h.getGame(), q = P && questsOf(P).board.find((x) => x.key === key); if (!q) return;
    let pop = $('quests').querySelector('.qs-pop');
    if (!pop) { pop = document.createElement('div'); pop.className = 'qs-pop'; $('quests').querySelector('.qs-panel').appendChild(pop); pop.addEventListener('click', (ev) => { if (ev.target.closest('.qp-close') || ev.target === pop) pop.hidden = true; }); }
    const esc2 = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const card = (sp) => { const [a, b] = usualDepth(sp), R0 = rarityOf(sp); return `<div class="qp-sp"><img src="${fittedIcon(sp, 240, 140).toDataURL()}" alt=""><div><b style="color:${R0 ? R0.col : 'inherit'}">${esc2(sp.name)}</b><i>${esc2(sp.sci || '')}</i><small>${/^(floor|floor-swim|demersal|reef)$/.test((sp.v && sp.v.hab) || '') && a < 5 ? `on the seabed, down to ${b.toLocaleString()} m` : `usually ${a.toLocaleString()}–${b.toLocaleString()} m`}, ${esc2(sp.zone || '')}${sp.oceans ? ', ' + esc2(sp.oceans) : ''}</small></div></div>`; };
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
    else body = `<p>${{ catch: 'Any animal counts, caught any way: net, claw, trawl or trap.', sell: 'Everything sold counts: at the Margaret, at the station, or to Dave.', photo: 'Take out the camera (2) and photograph animals you have not photographed before. Hold still while it takes the picture.', trawl: 'Let the trawl net out from the sub, drive through fish, and bring it in. Every animal it hauls up counts.', divecatch: 'Every animal caught in one dive counts; the count starts again each dive.', chambers: 'Have every pressure chamber in the sub holding an animal at the same time.' }[q.kind] || ''}</p>`;
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
    x.font = '600 13px "Barlow Semi Condensed", "Arial Narrow", sans-serif';
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
      x.strokeStyle = 'rgba(239,232,210,0.7)'; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(0, Y(d)); x.lineTo(W, Y(d)); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#efe8d2'; x.textBaseline = Y(d) < 18 ? 'top' : 'alphabetic'; x.fillText(`${Math.round(d).toLocaleString()} m`, 6, Y(d) < 18 ? Y(d) + 4 : Y(d) - 4); x.textBaseline = 'alphabetic'; // (4.28) below the line when the line is at the top (it was cut off)
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
  // (6.9.0) what a Log step gives, shown, not named: an item as its picture with its name in its rarity's colour, money as
  // the sum, both when both (never "a gift")
  // (7.6.46, owner) an achievement's picture: a see-through wash of deep water in exactly the outline the owner drew
  // (traced from his drawing), the paper showing through it and its edge soft; sea snow, the lure's soft light, and the
  // game's own triplewart seadevil, solid, at its left. Drawn once, kept as an image; laid over the card by percentages
  achArt(a) {
    this.achPics = this.achPics || {}; if (this.achPics[a.id]) return this.achPics[a.id];
    const W = 680, H = 262, m = 8, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const U = (u) => m + u * (W - 2 * m), V = (v) => m + v * (H - 2 * m), blob = new Path2D();
    const pts = [[0,0.354],[0.007,0.331],[0.087,0.208],[0.14,0.112],[0.185,0.023],[0.251,0],[0.309,0],[0.353,0],[0.39,0],[0.422,0.008],[0.452,0.031],[0.479,0.05],[0.508,0.062],[0.526,0.073],[0.563,0.104],[0.583,0.115],[0.61,0.123],[0.644,0.123],[0.685,0.127],[0.727,0.158],[0.774,0.204],[0.814,0.277],[0.87,0.369],[0.959,0.496],[1,0.662],[1,0.823],[0.973,0.831],[0.799,0.823],[0.734,0.854],[0.705,0.912],[0.675,0.965],[0.645,0.996],[0.61,1],[0.579,1],[0.551,1],[0.524,0.996],[0.499,0.996],[0.458,0.985],[0.425,0.973],[0.399,0.962],[0.369,0.946],[0.334,0.935],[0.287,0.927],[0.235,0.9],[0.136,0.896],[0.071,0.8],[0.012,0.673],[0,0.585]].map(([u, v]) => [U(u), V(v)]);
    { const n = pts.length, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], s0 = mid(pts[n - 1], pts[0]); blob.moveTo(s0[0], s0[1]);
      for (let k = 0; k < n; k++) { const p = pts[k], q = mid(p, pts[(k + 1) % n]); blob.quadraticCurveTo(p[0], p[1], q[0], q[1]); } }
    // the water, see-through: the paper shows through it; a little darker below; its edge softened
    const w = document.createElement('canvas'); w.width = W; w.height = H; const y = w.getContext('2d');
    const gr = y.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a4a54'); gr.addColorStop(1, '#0f222b');
    y.filter = 'blur(5px)'; y.fillStyle = gr; y.fill(blob); y.filter = 'none';
    x.globalAlpha = 0.42; x.drawImage(w, 0, 0); x.globalAlpha = 1;
    const sp = SPECIES_BY_ID[323] || SPECIES_BY_ID[100], fw = 210, fh = 150, fx = U(0.26) - fw / 2, fy = V(0.53) - fh / 2;
    let f = null, lx = fx + 50, ly = fy + 20;
    if (sp) { f = fittedIcon(sp, fw, fh, 0.05); const d = f.getContext('2d').getImageData(0, 0, fw, fh).data; let best = -1;
      for (let k = 0; k < fw * fh; k++) { if (d[k * 4 + 3] < 200) continue; const v = d[k * 4] + d[k * 4 + 1] * 1.2 + d[k * 4 + 2]; if (v > best) { best = v; lx = fx + (k % fw); ly = fy + Math.floor(k / fw); } } }
    x.save(); x.clip(blob);
    for (let k = 0; k < 30; k++) { x.fillStyle = `rgba(240,236,220,${0.3 + rnd() * 0.4})`; x.beginPath(); x.arc(U(0.05 + rnd() * 0.85), V(0.12 + rnd() * 0.75), 0.9 + rnd() * 1.5, 0, Math.PI * 2); x.fill(); }
    const gl = x.createRadialGradient(lx, ly, 0, lx, ly, 48); gl.addColorStop(0, 'rgba(170,220,200,0.5)'); gl.addColorStop(0.3, 'rgba(110,170,150,0.16)'); gl.addColorStop(1, 'rgba(110,170,150,0)'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
    x.restore();
    if (f) x.drawImage(f, fx, fy);
    return (this.achPics[a.id] = c.toDataURL());
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
    // (7.6.38, owner) a progress bar that carries its own numbers, written across it
    const nbar = (a, b, label) => `<div class="qs-nbar"><i style="width:${Math.round(Math.min(1, b ? a / b : 1) * 100)}%"></i><em>${label}</em></div>`;
    let html = '<div class="qs-pg l">'; // (5.9.6) two pages: the log (and the refresh) on the left, the board on the right
    // (7.6.38, owner) the left page holds the Log or the Achievements, chosen by a pair of tabs at its top
    const qt = this.qTab === 'ach' ? 'ach' : 'log', nA = achReadyCount(P);
    html += `<div class="qs-sw"><button data-q="tab|log"${qt === 'log' ? ' class="on"' : ''}>Log</button><button data-q="tab|ach"${qt === 'ach' ? ' class="on"' : ''}>Achievements${nA ? '<i class="qs-dot"></i>' : ''}</button></div>`;
    if (qt === 'ach') {
      const pearl = '<img class="qs-pearl" src="assets/ui/icons/pearl.png" alt="">';
      for (const a of ACH) { const st = achStars(P, a), done = st >= a.tiers.length, ready = achReady(P, a), [mark, pay] = done ? a.tiers[a.tiers.length - 1] : a.tiers[st], v = achValue(P, a), f = (n) => n.toLocaleString('en-US');
        const stars = Array.from({ length: STARS }, (_, i) => `<i class="${i < st ? 'on' : i === st && ready ? 'ready' : ''}">★</i>`).join('');
        // (7.6.40, owner) the game's own anglerfish beside the stars, in the card's empty middle
        html += `<div class="qs-q ach${ready ? ' ready' : ''}${done ? ' claimed' : ''}"><img class="ach-art" src="${this.achArt(a)}" alt="">
          <b class="ach-name">${a.name}</b><span class="ach-pay">${done ? '' : `${pearl}${f(pay)}`}</span>
          <span class="ach-stars">${stars}</span>
          <span class="ach-goal">${done ? 'Every star earned' : a.goal(mark)}</span>
          ${nbar(Math.min(v, mark), mark, `${f(Math.min(v, mark))} / ${f(mark)} ${a.unit}`)}${ready ? `<button data-q="ach|${a.id}">Claim</button>` : ''}</div>`; }
    } else if (m) {
      const ok = S.mainProg >= m.need;
      html += `<h3>Log</h3><div class="qs-q main${ok ? ' ready' : ''}"><div class="qs-t"><b>${m.text}</b><span>${m.help}</span>${m.need > 1 ? bar(S.mainProg, m.need) : ''}</div>
        <div class="qs-pay">${rewardHtml(m)}${ok ? `<button data-q="claim|main">Claim</button>` : ''}</div></div>`;
    }
    const footAt = qt === 'ach' ? -1 : html.length; html += `</div><div class="qs-pg r"><h3>The board</h3>`;
    // (4.3.0) during the tutorial the board waits, so one step at a time is all there is to claim
    if (tutorialOn(P)) { $('quests').querySelector('.qs-body').innerHTML = html + `<p class="qs-locked">The board opens when the tutorial is done. Finish the Margaret's log steps first.</p></div>`; return; }
    const hm = (ms) => { const totM = Math.ceil(ms / 60000), h = Math.floor(totM / 60), mi = totM % 60; return h ? `${h} h ${mi} min` : `${mi} min`; };
    for (const q of S.board) {
      // (4.0.0) a claimed quest stays, dimmed, until its time runs out; a new one is marked NEW until the board is seen
      const ok = q.prog >= q.n, left = questLeft(q);
      const timer = q.claimed ? `done, a new quest in ${hm(left)}` : ok ? 'done: claim it' : `${hm(left)} left`;
      const pr = q.n > 1 && !q.claimed ? nbar(q.prog, q.n, q.kind === 'sell' ? money(q.prog, false) + ' / ' + money(q.n, false) : q.prog + ' / ' + q.n) : '';
      html += `<div class="qs-q bd r-${q.rarity}${ok && !q.claimed ? ' ready' : ''}${q.claimed ? ' claimed' : ''}"><div class="qs-t"><b>${q.text}${q.fresh ? '<i class="qs-new">New</i>' : ''}</b>${pr}</div>
        <div class="qs-row"><small class="qs-time">${timer}</small><div class="qs-pay">${q.claimed ? '<span class="qs-paid">paid</span>' : `<span class="qs-amt">${cashIc()}${money(q.pay, false)}</span>`}${ok && !q.claimed ? `<button data-q="claim|${q.key}">Claim</button>` : ''}</div></div><button class="qs-info" data-q="info|${q.key}" title="About this quest">i</button></div>`;
    }
    // (4.0.0) the free refresh, or the next price on the ladder for this three-hour window
    const wait = boardIn(P), price = refreshPrice(P);
    // (4.0.1) the countdown is plain words under the board with a ticking green clock; only the button is brass
    const clock = (ms) => { const t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sc = t % 60; return `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`; };
    html += `<div class="qs-foot">${wait > 0 ? `<span class="qs-wait">Free refresh in <b class="qs-clock">${clock(wait)}</b></span><button class="qs-buy" data-q="refresh|paid" ${P.cash < price ? 'disabled' : ''}>New quests now, ${money(price, false)}</button>` : '<span class="qs-wait">A free refresh is ready</span><button class="qs-buy" data-q="refresh|free">New quests (free)</button>'}</div>`;
    if (footAt >= 0) { const fi = html.lastIndexOf('<div class="qs-foot">'); const foot = html.slice(fi); html = html.slice(0, footAt) + foot + html.slice(footAt, fi) + '</div>'; } else html += '</div>'; // the refresh goes under the log, on the left page (under the board while the achievements show)
    $('quests').querySelector('.qs-body').innerHTML = html;
    if (!$('quests').hidden) { clearTimeout(this.qSeenT); this.qSeenT = setTimeout(() => { for (const q of S.board) q.fresh = false; }, 4000); } // (seen: no longer new)
  }
  anyOpen(except) { const ex = String(except || ''); if (ex.includes('cabin') && except !== 'cabin') except = 'cabin'; return (!ex.includes('davetalk') && this.daveTalkOpen()) /* (6.5.4) Dave's box; (7.0.13) not a panel for the HUD: it stays */ || !$('store').hidden || !$('events').hidden || (this.chart && this.chart.isOpen()) || this.stationsOpen() || this.oldCardOpen() || !$('chest').hidden || !$('quests').hidden || (except !== 'cabin' && !$('cabin').hidden) || !$('catalog').hidden || !$('journal').hidden || !$('workshop').hidden || !$('cave').hidden || !$('tankroom').hidden || !$('trapset').hidden || !$('gallery').hidden || !$('dave').hidden || !$('settings').hidden || !$('inventory').hidden; }
  closeAll() { for (const id of ['store', 'events']) { const el = $(id); if (el) el.hidden = true; } /* (6.4.0) */ if (this.catalogOpen && this.catalogOpen()) this.toggleCatalog(false); if (this.inventoryOpen && this.inventoryOpen()) this.toggleInventory(false); this.chart && this.chart.toggle(false); // (5.10.1) the shops and the bag too (a death, the thing's arrival)
    this.toggleQuests(false); this.toggleDave(false); this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.toggleTank(false); this.toggleGallery(false); this.closeTrapSet(); }
  // the tank room, inside the sub: every place an animal can be kept, and what is in it
  tankOpen() { return !$('tankroom').hidden; }
  // a brass "are you sure?" plate: yes runs onYes; no or a tap outside just closes it
  confirm(title, body, yes, no, onYes, onNo = null) { { const c0 = document.getElementById('confirm'); if (c0) c0.style.zIndex = !$('settings').hidden ? '70' : ''; } // (5.10.1) asked from Settings: above it
    const modal = !!this.confirmModal; this.confirmModal = false; // (5.5) set just before by a question that must be answered
    const el = $('confirm'), close = () => { el.hidden = true; el.classList.remove('modal'); this.confirmModal = false; };
    if (modal) { this.confirmModal = true; el.classList.add('modal'); }
    el.classList.remove('welcome'); // (6.0.19) the welcome's styling is set again by its own call
    el.querySelector('.cf-title').textContent = title;
    el.querySelector('.cf-body').innerHTML = esc(body).replace(/\n/g, '<br>');
    el.querySelector('.cf-yes').textContent = yes; el.querySelector('.cf-no').textContent = no || ''; el.querySelector('.cf-no').hidden = !no; // (6.5.0) no second button: a notice with OK alone
    el.querySelector('.cf-yes').onclick = () => { close(); onYes(); };
    el.querySelector('.cf-no').onclick = () => { close(); if (onNo) onNo(); }; // (4.2.0)
    el.onclick = (e) => { if (e.target === el && !modal) close(); };
    el.hidden = false; el.querySelector('.cf-no').focus();
  }
  confirmOpen() { return !$('confirm').hidden; }
  // (4.6.0) things gained: a row of cards in the middle of the screen, each the locker's own slot (its picture in
  // the rarity-edged box, a NEW tag in the corner) with the name under it and +1 at the bottom. The game runs on
  // behind them; a click anywhere sends them off early. entries: [{ kind: 'item'|'supply'|'trawl'|'trap', id }]
  // (4.16.9) while a shop, the catalog, the quest board or a crate is open, the cards wait; they come when it closes
  gainsBlocked() { /* (6.5.1) the gain shows at once, over a shop too (it waited until the shop closed and came up later, unexplained); only a chest opening holds it */ return ['chest'].some((id) => { const el = $(id); return el && !el.hidden; }); }
  gainInfo(e) { // (6.5.0) what a gained thing is: its name, rarity, picture, line and skills
    const P = this.h.getProfile && this.h.getProfile();
    {
      if (e.kind === 'item' && ITEMS[e.id]) { const it = ITEMS[e.id], K = P && kitOf(P), q = K && [...K.items].reverse().find((x) => x.id === e.id); return { name: it.name, r: it.rarity, pic: pictureOf(it.kind, it, 300, 180, true), line: it.line || '', sk: q && q.sk ? q.sk : [], def: it }; }
      if (e.kind === 'supply' && SUPPLIES[e.id]) return { name: SUPPLIES[e.id].name, r: e.id === 'glowAdv' ? 'rare' : 'common', pic: pictureOf('supply', e.id, 300, 180, true), line: SUPPLIES[e.id].line || SUPPLIES[e.id].desc || '' };
      if (e.kind === 'trawl' && NETS_SUB[e.id]) return { name: NETS_SUB[e.id].name, r: NETS_SUB[e.id].rarity || 'common', pic: pictureOf('trawl', e.id, 300, 180, true), line: NETS_SUB[e.id].line || '' };
      if (e.kind === 'trap' && TRAPS[e.id]) return { name: TRAPS[e.id].name, r: TRAPS[e.id].rarity || 'common', pic: pictureOf('trap', e.id, 300, 180, true), line: TRAPS[e.id].line || TRAPS[e.id].desc || '' };
      if (e.kind === 'coin' && !this.coinGainPic) { const c = document.createElement('canvas'); c.width = 300; c.height = 180; const x = c.getContext('2d'); x.translate(95, 35); drawGoldCoins(x, 110, 110, 1); this.coinGainPic = c.toDataURL(); } // (6.5.0) the coin drawn small in the same 5:3 frame as gear
      if (e.kind === 'coin') return { name: 'Old coin', r: 'legendary', pic: this.coinGainPic, line: 'Hand-struck and worn nearly smooth. The Old One trades for them.' };
      if (e.kind === 'cash') { if (!this.cashPic) { const c = document.createElement('canvas'); c.width = 300; c.height = 180; const x = c.getContext('2d'); drawCash(x, 150, 95, 120); this.cashPic = c.toDataURL(); } return { name: money(e.n || 0, false), r: 'cash', pic: this.cashPic, line: '', noN: true }; }
      if (e.kind === 'pet' && SPECIES_BY_ID[e.id]) { const sp = SPECIES_BY_ID[e.id], q = PET_BY_ID.get(e.id); return { name: sp.name, r: q ? q.tier : 'exotic', pic: petIcon(sp, 300, 180).toDataURL(), line: 'Your pet: it follows you, hunts small fish in schools and warns you. Feed it at the surface to grow it.', noN: true }; } // (7.4.14)
      if (e.kind === 'pearl') return { name: `${e.n || 0} pearl${e.n === 1 ? '' : 's'}`, r: 'cash', pic: 'assets/ui/icons/pearl.png', line: 'The premium currency: pets, cooldowns skipped, a second chance.', noN: true }; // (7.4.12)
      return null;
    }
  }
  // (6.5.0) one way to show anything gained, the whole game over (bought, a quest's reward, a gift, a find, the old
  // one's trade): as a find comes out of a chest. The screen darkens a little, and each thing rises into the middle
  // on a soft light of its rarity's colour (legendaries throw sparks), larger than in a chest, its name under it in
  // that colour and a count for a stack. A tap on one opens its card; a tap anywhere else, or a few seconds, and they
  // go. Cash is never shown this way (it counts up by the money) except inside a gift. entries: [{ kind: 'item' |
  // 'supply' | 'trawl' | 'trap' | 'coin' | 'cash', id, n }]
  showGains(entries, now = false) {
    if (!entries || !entries.length) return;
    if (!now && this.gainsBlocked()) { this.gainsQueue = (this.gainsQueue || []).concat(entries); return; }
    let el = document.getElementById('gainfx');
    if (!el) {
      el = document.createElement('div'); el.id = 'gainfx'; el.hidden = true; el.innerHTML = '<div class="gx-row"></div><div class="gx-card" hidden></div>'; document.body.appendChild(el);
      el.addEventListener('pointerdown', (ev) => {
        const c = el.querySelector('.gx-card');
        if (!c.hidden) { if (ev.target.closest('.gx-x') || !ev.target.closest('.gx-card')) { c.hidden = true; this.hideGains(); } return; }
        const it = ev.target.closest('.gx-it'); if (it) { clearTimeout(this.gainT); this.gainCard(+it.dataset.i); return; }
        this.hideGains();
      });
    }
    const info = (e) => this.gainInfo(e);
    const list = entries.map(info).map((f, k) => f && { ...f, n: entries[k].n || 1 }).filter(Boolean).slice(0, 5); if (!list.length) return;
    this.gainList = list;
    const col = (r) => (RARITY[r] ? RARITY[r].col : '#efe8d2');
    el.querySelector('.gx-row').innerHTML = list.map((f, i) => `<button class="gx-it r-${f.r}" data-i="${i}" style="--rc:${col(f.r)};--d:${(i * 0.14).toFixed(2)}s"><i class="gx-light"></i>${f.r === 'legendary' ? '<i class="gx-sparks"><b></b><b></b><b></b><b></b><b></b><b></b></i>' : f.r === 'mythical' ? '<i class="gx-sparks gx-embers"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></i>' : ''}<img src="${f.pic}" alt=""><b style="color:${col(f.r)}">${f.name}</b>${f.n > 1 && !f.noN ? `<small>×${f.n}</small>` : ''}</button>`).join('');
    el.style.setProperty('--gn', list.length);
    el.querySelector('.gx-card').hidden = true;
    el.hidden = false; el.classList.remove('in', 'out'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(this.gainT); this.gainT = setTimeout(() => this.hideGains(), 3400 + list.length * 300);
  }
  // (6.5.0) a thing's card alone, over everything (the daily gift's days): the same card as a gain's
  previewCard(e) { this.showGains([e], true); const el = document.getElementById('gainfx'); if (!el) return; clearTimeout(this.gainT); el.querySelector('.gx-row').innerHTML = ''; this.gainCard(0); }
  // a thing gained, its card: the picture, its name in its rarity's colour, the rarity, what it is, its skills (centred)
  gainCard(i) {
    const el = document.getElementById('gainfx'), f = this.gainList && this.gainList[i]; if (!el || !f) return;
    const c = el.querySelector('.gx-card'), R = RARITY[f.r];
    c.innerHTML = `<button class="gx-x" aria-label="Close">×</button><div class="icard"><img src="${f.pic}" alt=""><h4 style="color:${R ? R.col : '#efe8d2'}">${f.name}</h4>${R ? `<p class="ic-r" style="color:${R.col}">${rarKind(R.name, f.def ? f.def.kind : f.kind)}</p>` : ''}${f.line ? `<p class="ic-line">${f.line}</p>` : ''}${f.def && f.def.legend ? powerHtml(f.def.legend) : ''}${skillsHtml(f.sk)}</div>`; // (6.5.3) the card every item shares
    c.hidden = false;
  }
  hideGains() { const el = document.getElementById('gainfx'); if (!el || el.hidden || el.classList.contains('out')) return; if (!el.querySelector('.gx-card').hidden) return; clearTimeout(this.gainT); el.classList.remove('in'); el.classList.add('out'); setTimeout(() => { if (el.classList.contains('out')) { el.hidden = true; el.classList.remove('out'); } }, 420); }
  // (5.5.6) a quest done: a small olive tag slides out from the clipboard with what it paid, and goes again
  questTag(text) {
    const hudEl = document.getElementById('quests-hud'); if (!hudEl) return false;
    let t = document.getElementById('qtag');
    if (!t) { t = document.createElement('div'); t.id = 'qtag'; t.innerHTML = '<small>Quest done</small><b></b><i class="stamp">Paid</i>'; document.body.appendChild(t); }
    // (5.7.0) a paper tag stamped with the sum, out to the left of the journal's coin (it sits at the right edge), and
    // after a moment drawn back into it
    // (5.7.5) under the money, top left (by the journal's coin at the top right it was hard to see)
    const M = this.h.moneyAt && this.h.moneyAt(); if (M) { t.style.right = 'auto'; t.style.left = (M.x - 4) + 'px'; t.style.top = (M.y + 2) + 'px'; }
    else { const r = document.getElementById('quests-btn').getBoundingClientRect(); t.style.left = 'auto'; t.style.right = (innerWidth - r.left + 10) + 'px'; t.style.top = (r.top - 4) + 'px'; }
    t.querySelector('b').textContent = text;
    t.classList.remove('in', 'go'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(this.qtagT); this.qtagT = setTimeout(() => { t.classList.add('go'); setTimeout(() => t.classList.remove('in', 'go'), 500); }, 2600);
    return true;
  }
  // (4.11.0) N with more than one kind of net in the hatch: their cards in the middle of the screen, in the item
  // cards' look (picture, name, a number in a circle when there are two). Tap one; the trawl button again
  // puts the choice away. The sea runs on behind it.
  pickNet(kinds, counts, onPick) {
    let el = document.getElementById('netpick');
    if (!el) { el = document.createElement('div'); el.id = 'netpick'; el.hidden = true; document.body.appendChild(el); }
    const close = () => { el.hidden = true; window.removeEventListener('actdown', key, true); this.netPickClose = null; };
    if (this.netPickClose) { this.netPickClose(); return; }
    const pick = (k) => { close(); onPick(k); };
    const key = (e) => {
      const k = e.key.toLowerCase(), i = '123'.indexOf(k);
      if (i >= 0 && all[i] && counts[all[i]]) { e.stopImmediatePropagation(); e.preventDefault(); pick(all[i]); } // (claude-polish) immediate: the game's own key handler on the same window also took the 1 (and put the hand net away)
      else if (k === 'n') { e.stopImmediatePropagation(); e.preventDefault(); close(); }
    };
    const all = Object.keys(NETS_SUB); // (4.11.1) every net, the ones not in the hatch greyed with a lock
    el.innerHTML = `<p class="np-title">Which net?</p><div class="g-row">${all.map((k) => { const N = NETS_SUB[k], adv = k !== 'basic', have = counts[k] || 0;
      return `<button class="gain np-card ${adv ? 'r-legendary' : 'r-common'}${have ? '' : ' np-none'}" data-net="${k}" ${have ? '' : 'disabled'}><div class="g-tile"><img src="${pictureOf('trawl', k, 120, 72, true)}" alt="">${have ? `<i class="np-n">×${have}</i>` : '<span class="np-lock" aria-label="Not in the hatch"><svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg></span>'}</div><span class="np-line">${adv ? `Up to ${N.max} animals, ${N.maxLen} m long, wide mouth, no legend escapes` : `Up to ${N.max} animals, ${N.maxLen} m long`}</span><b>${N.name}</b>${have ? '' : '<small class="np-out">Not in the hatch</small>'}</button>`; }).join('')}</div>`;
    el.onclick = (e) => { const b = e.target.closest('[data-net]'); if (b && !b.disabled) pick(b.dataset.net); else if (e.target === el) close(); };
    window.addEventListener('actdown', key, true);
    this.netPickClose = close; el.hidden = false;
  }
  netPickOpen() { const el = document.getElementById('netpick'); return !!el && !el.hidden; }
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
      el.innerHTML = '<div class="st-plate"><h3>The Margaret</h3><div class="st-list"></div><p class="st-hint"></p></div>';
      document.body.appendChild(el);
    }
    const close = () => { el.hidden = true; };
    el.querySelector('.st-list').innerHTML = list.map((st) => `<button data-st="${st.id}"><b>${st.name}</b><span>${st.label}</span></button>`).join('');
    el.querySelector('.st-list').onclick = (e) => { const b = e.target.closest('button[data-st]'); if (b) { close(); onPick(b.dataset.st); } };
    el.onclick = (e) => { if (e.target === el) close(); };
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
  toggleInventory(force) { const el = $('inventory'); el.hidden = !(force === undefined ? el.hidden : force); if (!el.hidden) { this.renderInventory(); const P1 = this.h.getProfile && this.h.getProfile(); if (P1) P1.bagSeenAt = (P1.bagGot || 0); } } // (5.9.6) opened: the bag's "!" goes
  // B: what Earl has on him, what is in the sub, his gear
  renderInventory() {
    const g = this.h.getGame(), P = this.h.getProfile();
    if (!g || !P) { $('inventory').querySelector('.inv-body').innerHTML = '<p class="inv-empty">Nothing yet: start a dive.</p>'; return; }
    // (3.0.32) two pages: his gear, and his catch
    const tab = this.invTab || 'gear';
    const hasPh = owns(P, 'camera') || (g.photos || []).length;
    const tabs = `<nav class="inv-tabs"><button data-invtab="gear" class="${tab === 'gear' ? 'on' : ''}">Gear</button><button data-invtab="catch" class="${tab === 'catch' ? 'on' : ''}">Catch <i>(${g.bag.length + g.subTank.length})</i></button></nav>`;
    const body = $('inventory').querySelector('.inv-body');
    { const lg = body.querySelector('.lk-grid'); if (lg) this.lkScroll = lg.scrollTop; } // (7.5.2) the locker keeps its place when drawn again
    body.innerHTML = (tab === 'catch' ? this.catchHtml(P, g) : this.equipHtml(P, g)) + tabs; // (3.0.33) the page switch: big, at the bottom middle
    { const lg = body.querySelector('.lk-grid'); if (lg) { lg.scrollTop = this.lkScroll || 0; const more = () => lg.classList.toggle('more', lg.scrollTop + lg.clientHeight < lg.scrollHeight - 4); more(); lg.addEventListener('scroll', more, { passive: true }); requestAnimationFrame(more); } } // (7.5.2, owner) the lower edge fades while more lies below
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
      // (olive) the door painted once as a picture (tools/olive_kit.py) for the layout it is always laid out at; any other
      // layout falls back to the one drawn here
      const painted = W2 === 1240 && H2 === 820 && Math.abs(split - 605) < 3;
      panel.style.backgroundImage = painted ? (window.__fingerK ? 'url(assets/ui/olive/locker-door-m.jpg)' : 'url(assets/ui/olive/locker-door.jpg)') : `url(${lockerTexture(W2, H2, { split })})`; panel.style.backgroundSize = '100% 100%';
    });
    body.querySelectorAll('[data-invtab]').forEach((b2) => b2.addEventListener('click', () => { this.invTab = b2.dataset.invtab; this.lkSel = null; this.fishSel = null; this.petSel = false; this.phSel = null; this.renderInventory(); }));
    if (tab === 'catch') this.catchWire(g); else this.equipWire(P, g);
  }
  // the Catch page: his net bag as pockets, the sub's tank, what he has found, the sub itself
  // (3.0.35) the Catch page in two fixed halves. Left: the net bag, every pocket a bag can have (the ones his bag
  // hasn't, padlocked), and what it is all worth, one number. Right: the sub's own hardware: its open tank as a
  // water window split into compartments (a big animal takes two or three), its pressure chambers as portholes.
  catchHtml(P, g) {
    
    const pay = statValue(P, 'payFish'), worth = (s2) => specimenValue(s2) * pay;
    const dot = (s2) => (s2.cond <= 0.05 ? '#8a6a5a' : s2.cond < 0.3 ? '#d08a5a' : s2.cond < 0.6 ? '#c8b060' : '#8ac88a');
    const state = (s2) => (s2.cond <= 0.05 ? 'dead' : conditionName(s2.cond));
    
    
    const cap = Math.round(statValue(P, 'bag'));
    const inTrouble = (s2, inBag) => s2.cond > 0.05 && (s2.cond < 0.3 || gapOf(g, s2, inBag) > SAFE_GAP);
    const usedSp = g.bag.reduce((t2, s2) => t2 + slotsOf(s2), 0);
    const all = g.bag.concat(g.subTank || []), total = all.reduce((t, s2) => t + worth(s2), 0);
    // the sub: the open tank itself, its animals swimming as they do in the sub, and the chambers as they hang there
    const M = SUB_MARKS[markOf(statValue(P, 'depth'))], tank = g.subTank || [];
    const open = tank.filter((s2) => !s2.pressed && !s2.pile), floor = tank.filter((s2) => s2.pile), big = tank.filter((s2) => s2.pressed && s2.chamber === BIG_CH);
    const chambers = tank.filter((s2) => s2.pressed && s2.chamber !== BIG_CH), oCap = tankSlots(g), pCap = pressSlots(g), oUsed = open.reduce((t, s2) => t + slotsOf(s2), 0);
    const elsewhere = floor.length ? `On the floor: ${floor.map((s2) => SPECIES_BY_ID[s2.id].name).join(', ')}, ` : '';
    const bigCap = big.some(tooBig) ? 1 : 3;
    const subName = g.sub.imploded ? 'lost' : `${M.named ? (P.subName || 'EARL') + ', ' : ''}${M.name}`;
    this.catchShown = Math.max(5, pCap);
    const hasPh = owns(P, 'camera') || (g.photos || []).length;
    // (5.14.1) the bag as a fixed grid of spaces, ten across: the spaces his bag has are open wells, the rest padlocked, so
    // nothing moves as he changes bags or fills it. An animal lies across as many spaces as it takes, left to right
    // (1, 2, 4, then 8 and 16 over two rows), drawn bigger the more it takes, on a wash of the water it lives in; one that
    // runs past the bag's room is edged red. Then the photo boxes (padlocked until he has a camera), and what it is all
    // worth, always bottom left
    const COLS = 10, frame = cap <= 50 ? 50 : Math.ceil(cap / COLS) * COLS, shape = (n) => (n <= 4 ? [n, 1] : n === 8 ? [4, 2] : [8, 2]);
    const occ = [], at = (r, c) => occ[r * COLS + c];
    const placed = g.bag.map((s2, i) => ({ s2, i, n: slotsOf(s2) })).sort((a2, b2) => b2.n - a2.n).map((q) => {
      const [w, h] = shape(q.n);
      for (let r = 0; ; r++) for (let c = 0; c + w <= COLS; c++) {
        let free = true; for (let y = 0; y < h && free; y++) for (let x2 = 0; x2 < w; x2++) if (at(r + y, c + x2)) { free = false; break; }
        if (free) { let over = false; for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) { occ[(r + y) * COLS + c + x2] = true; if ((r + y) * COLS + c + x2 >= cap) over = true; } return { ...q, r, c, w, h, over }; }
      } });
    const rows = Math.max(frame / COLS, ...placed.map((q) => q.r + q.h));
    const hab = habCls;
    let cells = '';
    for (let k = 0; k < rows * COLS; k++) if (!occ[k]) cells += `<div class="bs-cell${k < cap ? '' : ' locked'}" style="grid-row:${Math.floor(k / COLS) + 1};grid-column:${(k % COLS) + 1}"></div>`; // (6.5.0) a space he has not got yet: a plain dim recess, no padlock on each
    // (6.5.1) only the animal that tipped the bag over is marked (the last taken in): the layout packs the biggest first,
    // so smaller ones it pushed past the line were marked instead of the catch that did it
    { const lastOver = placed.some((q) => q.over) ? Math.max(...placed.map((q) => q.i)) : -1; for (const q of placed) q.over = q.i === lastOver; }
    const fishCells = placed.map((q) => { const sp = SPECIES_BY_ID[q.s2.id]; if (!this.fitPics) this.fitPics = new Map(); if (!this.fitPics.has(sp.id)) this.fitPics.set(sp.id, fittedIcon(sp, 300, 180).toDataURL());
      return `<div class="fc bs-fish ${hab(sp)}${inTrouble(q.s2, true) ? ' trouble' : ''}${q.over ? ' over' : ''}${rarityCls(sp)}" data-b="${q.i}" style="grid-row:${q.r + 1} / span ${q.h};grid-column:${q.c + 1} / span ${q.w}" title="${sp.name}, ${state(q.s2)}">${q.s2.blessed ? '<i class="fc-bless" title="Blessed"></i>' : ''}${rarityStars(sp)}<i class="fc-warn" title="In danger">!</i><img src="${this.fitPics.get(sp.id)}" alt="${sp.name}"><i class="fc-dot" style="background:${dot(q.s2)}"></i></div>`; }).join('');
    const over = usedSp > cap;
    return `<div class="inv-split inv-catch2"><div class="inv-left"><h4>The net bag <i class="bag-n">${usedSp} / ${cap}</i>${over ? ' <i class="over">overencumbered</i>' : ''}</h4><div class="bag-spaces" style="--cols:${COLS};--rows:${rows}">${cells}${fishCells}</div>`
      + this.photoBoxes(P, g)
      + `<div class="worth-paint" style="--wp:${Math.min(104, Math.floor(400 / (money(total).length * 0.52)))}px" title="What the bag and the sub hold would sell for, about">${money(total)}</div></div>`
      + `<div class="inv-right${g.earl && g.earl.inSub ? '' : ' sub-away'}">${g.earl && g.earl.inSub ? '' : '<i class="sub-lock"></i>'}<div class="sub-bay"><div class="sb-name"><b>${subName}</b><span>rated to ${g.sub.rated} m</span></div>`
      + `<h4>The open tank <i>(${oUsed}/${oCap})</i></h4><div class="tank-win${open.some((s2) => inTrouble(s2, false)) ? ' trouble' : ''}"><canvas class="ct-tank"></canvas><i class="fc-warn" title="An animal in danger">!</i></div>`
      + `<h4>Pressure chambers <i>(${chambers.length}/${pCap})</i></h4><canvas class="ct-ch"></canvas>`
      // (3.2.0) the large pressure tank, laid on its side as it is in the sub (padlocked until it is fitted)
      // (5.14.2) the large pressure tank always has its place: a strip under the chambers, its outline padlocked until fitted
      + (hasBigTank(g) ? `<h4>Large pressure tank <i>(${big.length}/${bigCap})</i></h4><canvas class="ct-big"></canvas>` : `<h4 class="off">Large pressure tank</h4><canvas class="ct-big off"></canvas>`)
      + `<p class="ct-cap">${elsewhere}Tap an animal for its card; ${g.earl && g.earl.inSub ? 'drag it to move it' : 'drag it off the panel to throw it back'}</p></div></div></div>`
      + (this.fishSel ? this.fishPop(P, g) : '') + (this.phSel != null ? this.photoPop(P, g) : '');
  }
  // (6.5.1) the trawl net the sub lets out: each kind in the hatch a small tile with its count, the chosen one lit; a
  // tap chooses it (the trawl button then always lets out that one). Out of the sub it can still be chosen

  // (7.4.14, owner) the pets he owns: a card each (picture, name in its rarity's colour, tier and price, stars a level, a
  // tick on the one out); a tap takes it out, or sends the one out home. Feed: at the surface, for the one out, once a day
  // (7.6.54, owner) the scenes behind the diver: each a small picture of itself, its name, Free / its price in pearls / In use
  scenesPanel(P) {
    this.sceneThumbs = this.sceneThumbs || {}; const pearl = '<img class="st-pearl" src="assets/ui/icons/pearl.png" alt="">', cur = P.bagScene || 'reef';
    const cards = BAG_SCENE_IDS.map((id) => { const S = BAG_SCENES[id], own = !S.price || (P.bagScenes || []).includes(id);
      if (!this.sceneThumbs[id]) this.sceneThumbs[id] = this.eqBackdrop(300, 340, id).toDataURL();
      return `<button class="sc-card${id === cur ? ' on' : ''}${own ? '' : ' locked'}" data-pickscene="${id}"><img src="${this.sceneThumbs[id]}" alt=""><b${S.red ? ' class="red"' : ''}>${S.name}</b><small>${id === cur ? 'In use' : own ? (S.price ? 'Owned' : 'Free') : `${pearl}${S.price}`}</small></button>`; }).join('');
    return `<div class="item-pop scene-pick"><div class="ip-box"><button class="ip-close" aria-label="Close">×</button><h4>Scene</h4><p class="pp-note">What lies behind your diver here. You have ${pearl}${Math.floor(P.pearls || 0)}.</p><div class="sc-grid">${cards}</div></div></div>`;
  }
  petsPanel(P, g, fit) {
    const owned = PETS.filter((q) => (P.petsOwned || []).includes(q.id)), cur = P.pet && P.pet.id;
    const pearl = '<img class="st-pearl" src="assets/ui/icons/pearl.png" alt="">';
    const cards = owned.map((q) => { const sp3 = SPECIES_BY_ID[q.id], R = RARITY[q.tier], out = cur === q.id;
      return `<button class="pp-pet r-${q.tier}${out ? ' out' : ''}" data-petout="${q.id}"><img src="${fit(sp3)}" alt=""><b style="color:${R.col}">${sp3.name}</b><small>${R.name} · ${pearl}${q.pearls}</small>${petStars(petLevel(P, q.id))}${out ? '<i class="pp-tick">✓</i>' : ''}</button>`; }).join('');
    const surf = atSurface(g), fed = cur && fedToday(P, cur), canFeed = cur && surf && !fed;
    const feedWhy = !cur ? 'Take a pet out to feed it' : !surf ? 'Pets are fed at the surface' : fed ? 'Fed today: again tomorrow' : 'Once a day, with an animal you brought up';
    return `<div class="item-pop pet-pick"><div class="ip-box"><button class="ip-close" aria-label="Close">×</button><h4>Your pets</h4>`
      + (owned.length ? `<p class="pp-note">Tap a pet to take it out; tap the one with you to send it home.</p><div class="pp-grid">${cards}</div><div class="pp-foot"><span>${feedWhy}</span><button data-petfeed ${canFeed ? '' : 'disabled'}>Feed</button></div>`
        : `<p class="pp-none">No pets yet. Pets come from the shop, for pearls.</p><div class="pp-foot"><button data-petshop>Pet shop</button></div>`)
      + '</div></div>';
  }
  // (5.0) the Photos page: the camera's own screen. Every picture he carries in a plain grid, the frame counter
  // and film left at the top; click one and it fills the screen, with its name, how it came out and what it pays
  // (5.0) below the bag (scroll down): ten boxes for the pictures he carries, numbered like the frames of a roll;
  // click one and it fills the view with its name, how it came out and what it pays
  photoBoxes(P, g) {
    const roll = g.photos || [], cam = owns(P, 'camera') ? gear(P, 'cam') : null;
    if (!cam && !roll.length) return `<h4 class="ph-h off">Photos <span>no camera yet</span></h4><div class="ph-grid">${'<div class="ph-cell empty locked"><i></i></div>'.repeat(10)}</div>`; // (5.14.1) always there, padlocked
    const cells = roll.map((ph, i) => `<button class="ph-cell" data-ph="${i}" title="${ph.name}">${ph.img ? `<img src="${ph.img}" alt="">` : '<span></span>'}<b>${String(i + 1).padStart(2, '0')}</b>${photoStars(ph)}</button>`).join('');
    return `<h4 class="ph-h">Photos <i>(${roll.length})</i>${cam ? `<span>Film ${g.items.film || 0}/${cam.shots}${P.spare && P.spare.film ? ` · ${P.spare.film} spare` : ''}</span>` : ''}</h4><div class="ph-grid">${cells}${'<div class="ph-cell empty"></div>'.repeat(Math.max(0, 10 - roll.length))}</div>`;
  }
  // (5.0) a photograph, large
  photoPop(P, g) {
    const ph = (g.photos || [])[this.phSel]; if (!ph) { this.phSel = null; return ''; }
    // (5.10.11) not the picture blown up: a small card, the print as a frame of film at the top, then what is in it
    const i = this.phSel, row = (k, v) => `<div class="pd-row"><span>${k}</span><b>${v}</b></div>`;
    return `<div class="item-pop photo-pop"><div class="ip-box pd-box"><button class="ip-close" aria-label="Close">×</button>
      <div class="pd-film"><div class="pd-frame">${ph.img ? `<img src="${ph.img}" alt="">` : ''}</div><i class="pd-no">${String(i + 1).padStart(2, '0')}</i></div>
      <div class="pd-txt"><h4>${ph.name}</h4>${photoStars(ph)}<p class="pd-grade">${gradeOf(ph)}${ph.again ? ': this one was paid for already' : ph.first ? ': the first of its kind' : ''}</p>
      ${row('Depth', ph.at != null ? `${ph.at} m` : '—')}${row('Distance', ph.dist != null ? `${ph.dist} m` : '—')}${row('Pays', money(ph.value * statValue(P, 'payFish')))}</div></div></div>`;
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
    
    // (3.6.1) the specimen station: a small lit aquarium on the left, the animal swimming in water the colour of
    // its own depth (drawCatch keeps it moving); its record on the right
    const len = (s2.len || sp.len), kg = weightOf(sp, len);
    const low = gapSigned(g, s2, at.place === 'bag') > 0; // (home deeper than here: the pressure is too low for it)
    const status0 = s2.cond <= 0.05 ? ['Dead', 'dead'] : dying ? [`Dying <span class="sp-why">(pressure too ${low ? 'low' : 'high'})</span>`, 'dying'] : s2.cond < 0.6 ? [s2.cond < 0.3 ? 'Weak' : 'Stressed', 'weak'] : ['Healthy', 'live'];
    // (7.5.7, owner) caught under Apex and still well: Blessed, in legendary gold, Apex's emblem in place of the dot
    const blessedNow = s2.blessed && status0[1] === 'live'; if (blessedNow) { status0[0] = 'Blessed'; status0[1] = 'blessed'; }
    const cursedNow = !!s2.cursed; if (cursedNow) { status0[0] = 'Cursed'; status0[1] = 'cursed'; } // (7.6.6, owner) Bloodmoon's catch
    const status = s2.safe && s2.cond > 0.05 ? [`${status0[0]} <span class="sp-safe">✓ safe at the surface</span>`, status0[1]] : status0; // (4.0.0)
    const where = { bag: 'Net bag', open: 'Open tank', chamber: `Pressure chamber ${(at.n || 0) + 1}`, big: 'Large pressure tank', floor: 'Sub, on the floor' }[at.place];
    const row = (k, v, cls = '') => `<div class="sp-r${cls}"><dt>${k}</dt><dd>${v}</dd></div>`;
    // (3.6.2) metric, with feet and pounds beside it
    const hab = usualDepth(sp); // (3.7.3) where it is usually met here, not the record extremes
    const LB = 2.20462, u = (t) => ` <span class="sp-u">(${t})</span>`, u2 = () => ''; // (6.0.3) one system only, as chosen in Settings (the page turns the metric figures)
    const kgTxt = kg < 0.1 ? kg.toFixed(3) : kg < 10 ? kg.toFixed(kg < 1 ? 2 : 1) : Math.round(kg).toLocaleString(), lb = kg * LB, lbTxt = lb < 10 ? lb.toFixed(lb < 1 ? 2 : 1) : Math.round(lb).toLocaleString();
    const rows = row('Found at', `${Math.round(s2.from || 0).toLocaleString()} m${u2()}`) + row('Habitat', `${hab[0].toLocaleString()}–${hab[1].toLocaleString()} m${u2()}`)
      + row('Length', `${len.toFixed(2)} m${u2()}${tooBig(s2) ? ' <small>over chamber limit</small>' : ''}`) + row('Weight', `${kgTxt} kg${u2()}`)
      + row('Location', where) + row('Status', `<i class="${cursedNow ? 'sp-apex sp-curse' : blessedNow ? 'sp-apex' : 'sp-dot'}"></i>${status[0]}`, ` st-${status[1]}`) + row('Value', money(specimenValue(s2) * statValue(P, 'payFish')) + (deepPremium(s2.from) > 1.001 ? u(`deep catch, ×${deepPremium(s2.from).toFixed(1)}`) : ''), ' val');
    const inSub = this.h.inSub ? this.h.inSub() : false, w = at.where, i = at.i, mv = (label, act, to = -1, on = true) => `<button data-fm="${act}:${w}:${i}:${to}"${on ? '' : ' disabled'}>${label}</button>`;
    let acts = '';
    if (inSub) {
      if (tooBig(s2)) { if (at.place !== 'big') acts += hasBigTank(g) ? mv('Large tank', 'press', BIG_CH, bigFits(g, s2)) : ''; }
      else if (at.place !== 'chamber') { const f = freeChamber(g, s2); if (pressSlots(g) > 0) acts += mv('Chamber', 'press', f, f >= 0); }
      if (!tooBig(s2) && hasBigTank(g) && at.place !== 'big') acts += mv('Large tank', 'press', BIG_CH, bigFits(g, s2));
      if (at.place !== 'open') acts += mv('Open tank', 'open', -1, tankFits(g, { ...s2, pressed: false, pile: false }));
      if (at.place !== 'bag') acts += mv('Net bag', 'tobag', -1, g.bag.length < bagSlots(g));
      acts += mv('Let go', 'release'); // (7.4.0, owner) said plainly
    } else if (at.place === 'bag') acts += mv('Let go', 'release'); // (7.4.0, owner) out of the sub too: a fish in the bag can always be let go
    const remark = inSub ? '' : at.place === 'bag' ? '' : 'In the sub: moved from its tank room.'; // (7.4.0) no keys named on a phone
    const R2 = R && !R.hidden ? R : null;
    this.aqSel = { s: s2, sp, home: s2.home ?? s2.from ?? (sp.dmin + sp.dmax) / 2 }; this.aqDying = dying;
    return `<div class="item-pop fish-pop"><div class="sp-panel${R2 && R2.id === 'legendary' ? ' leg' : ''}" style="--rc:${col}"><button class="ip-close" aria-label="Close">×</button>
      <div class="sp-tank"><canvas class="sp-aq"></canvas><p class="sp-about">${aboutOf(sp)}</p></div>
      <div class="sp-info"><span class="sp-kind">${(sp.cat || '').replace(/&/g, 'and')}</span>${R2 ? `<span class="sp-rar">${R2.name}${rarityStars(sp)}</span>` : ''}<b class="sp-name">${sp.name}</b>
        ${sp.species || sp.sci ? `<span class="sp-sci">${sp.species ? `${sp.species}, ` : ''}<i>${sp.sci || ''}</i></span>` : ''}${s2.variant ? `<span class="sp-var">Rare form: ${s2.variant}</span>` : ''}
        <dl class="sp-rows">${rows}</dl>
        ${acts ? `<div class="sp-acts">${inSub ? '<span>Move to</span>' : ''}${acts}</div>` : remark ? `<p class="sp-remark">${remark}</p>` : ''}</div></div></div>`;
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
    const c = A.s.cond, stressed = !dead && c < 0.6, dyingNow = !dead && (c < 0.3 || (this.aqDying));
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
    const onBot = !dead && livesOnBottom(A.sp); // (5.10.8) bottom animals rest and walk on the sand
    const fy = onBot ? y1 + ey * 0.6 : y0 + (Math.max(0, y1 - y0)) * Math.max(0, Math.min(1, want));
    const fx2 = onBot ? (isSessile(A.sp) ? midX : midX + Math.sin(ph * 0.35) * spanX) : fx;
    x.save(); x.beginPath(); x.rect(glass.x, glass.y, glass.w, glass.h); x.clip();
    x.translate(fx2, fy); x.rotate(onBot ? 0 : list * face);
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
    const root0 = $('inventory');
    // (5.0) the photographs
    root0.querySelectorAll('.inv-catch2 .ph-cell[data-ph]').forEach((b) => b.addEventListener('click', () => { this.phSel = +b.dataset.ph; this.fishSel = null; this.renderInventory(); }));
    const phpop = root0.querySelector('.photo-pop');
    if (phpop) phpop.addEventListener('click', (ev) => { if (ev.target === phpop || ev.target.closest('.ip-close')) { this.phSel = null; this.renderInventory(); } });
    const root = root0, pop = root.querySelector('.fish-pop:not(.pet-pop)');
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
        const out = !!(tgt && tgt.kind === 'out'); d.ghost.classList.toggle('letgo', out); // (5.15.3) off the panel: it will be let go
        if (out && !d.tag) { d.tag = document.createElement('div'); d.tag.className = 'ghost-tag'; d.tag.textContent = 'Throw back'; document.body.appendChild(d.tag); }
        if (d.tag) { d.tag.hidden = !out; d.tag.style.left = ev.clientX + 'px'; d.tag.style.top = (ev.clientY + 40) + 'px'; }
      }
    });
    const end = (ev) => {
      const d = this.cDrag; if (!d) return; this.cDrag = null; if (d.moved) this.dragEndAt = performance.now();
      if (d.ghost) d.ghost.remove(); if (d.tag) d.tag.remove();
      root.querySelectorAll('.drop-on').forEach((el) => el.classList.remove('drop-on'));
      const g2 = game(); if (!g2 || ev.type === 'pointercancel') return;
      if (!d.moved) { this.fishSel = d.s; this.renderInventory(); return; } // a click: its card
      const tgt = this.catchDropAt(ev.clientX, ev.clientY, d.s); if (!tgt) return;
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
  catchDropAt(cx, cy, held = this.cDrag && this.cDrag.s) {
    const root = $('inventory'), el = document.elementFromPoint(cx, cy);
    // (5.15.3) off the panel altogether: thrown back into the sea (only from the bag)
    const pr = root.querySelector('.inv-panel'), r0 = pr && pr.getBoundingClientRect();
    if (r0 && (cx < r0.left || cx > r0.right || cy < r0.top || cy > r0.bottom)) return held && this.fishWhere(this.h.getGame(), held)?.place === 'bag' ? { kind: 'out' } : null;
    if (!el || !root.contains(el)) return null;
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
    if (tgt.kind === 'out') { // (5.15.3) thrown back: at once, but a rare-and-up animal is asked about first
      if (at.place !== 'bag') return;
      const go = () => { this.tankDo('release', 'bag', at.i, -1); if (this.fishSel === s2) this.fishSel = null; this.renderInventory(); };
      const R = rarityOf(sp); if (R && ['rare', 'exotic', 'legendary'].includes(R.id)) this.confirm(`Throw back ${this.theName(sp).replace(/^The/, 'the')}?`, 'It swims off and is gone.', 'Throw back', 'Keep it', go); else go();
      return;
    }
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
    if (bv && hasBigTank(g)) { const [c, cw, ch] = fit(bv); this.bigHits = this.tankRoom.drawMiniBig(c, g, cw, ch, 0); }
    else if (bv) { const [c, cw, ch] = fit(bv); this.bigHits = []; // (5.14.2) not fitted: the cylinder's outline in the strip, a padlock and its words
      c.clearRect(0, 0, cw, ch); const x0 = cw * 0.08, x1 = cw * 0.92, cy = ch / 2, r = Math.min(ch * 0.36, 26);
      c.setLineDash([6, 5]); c.strokeStyle = 'rgba(200,196,176,0.28)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + r, cy - r); c.lineTo(x1 - r, cy - r); c.arc(x1 - r, cy, r, -Math.PI / 2, Math.PI / 2); c.lineTo(x0 + r, cy + r); c.arc(x0 + r, cy, r, Math.PI / 2, Math.PI * 1.5); c.stroke(); c.setLineDash([]);
      const lx = cw / 2 - 52, ly = cy; c.fillStyle = 'rgba(200,196,176,0.35)'; c.strokeStyle = 'rgba(200,196,176,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(lx, ly - 4, 6, Math.PI, 0); c.stroke(); c.fillRect(lx - 9, ly - 4, 18, 14);
      c.font = '600 14px "Barlow Semi Condensed", sans-serif'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(220,214,190,0.55)'; c.fillText('Not fitted', lx + 18, ly + 2); }
    this.tankRoom.drag = null;
  }
  // ---------- the locker (2.8.0): Earl and his eight slots; everything he owns in rarity frames ----------
  // Drag a thing onto him (or its slot) to put it on, or click it for its card: what it is, its skills, its
  // set, Put on / Unequip, and Sell when someone is there to buy it (the Margaret, Dave). Changing gear works
  // on deck, in the cabin and in the sub; in the water it only shows.
  // (3.0.31) the inventory: Earl large in the middle of the left pane with his eight slots either side; the locker
  // on the right, thirty boxes, always sorted by rarity (Common to Legendary, then by kind), what he has on not in
  // it, new things marked NEW. Click anything for a pop-up: what it is, and side by side with what he has on.
  equipHtml(P, g, extra = '') {
    ensureKit(P); const K = kitOf(P), free = !!this.h.canChangeGear(), onSet = new Set(Object.values(K.on));
    const SLOTS = [['suit', 'Suit'], ['fins', 'Fins'], ['tank', 'Tank'], ['bag', 'Bag'], ['ability', 'Ability 1'], ['net', '1  Net'], ['cam', '2  Camera'], ['ability2', 'Ability 2'], ['ability3', 'Ability 3']]; // (7.6.71, owner) three skill slots: the mythic slot (left) and two on the right // (5.9.0) the Ability slot: the scroll he carries. (7.6.4, owner) and the second, its swap on the skill button
    // (7.6.26, owner) a scroll's tile shows its charges: its emblem from half its colour (none) to twice it (full)
    const satOf = (q, it) => { const A = abilityOf(q.id), mx = A ? maxLoad(A) : 0; return Math.round((0.5 + 1.5 * (mx ? Math.min(1, (q.load || 0) / mx) : 0)) * 10) / 10; };
    const pic = (q) => { const it = ITEMS[q.id]; return pictureOf(it.kind, it.kind === 'ability' ? { ...it, sat: satOf(q, it) } : it, 120, 72, true); };
    const slot = ([kind0, label]) => { const bs = kind0 === 'ability' ? 1 : kind0 === 'ability2' ? 2 : kind0 === 'ability3' ? 3 : 0, kind = bs ? slotKey(K, bs) : kind0; // (7.6.48) the bag's two scroll slots stay put; slot 1 takes a Heart
      const q = K.on[kind] && K.items.find((x) => x.u === K.on[kind]); const it = q && ITEMS[q.id], nm = label.replace(/^\d\s+/, '');
      // (5.11.7) the name inside the box, under the picture (it no longer hangs below and gets cut off); no key numbers (touch
      // only); an empty slot is just its name; a slot for something he does not own yet (the camera) carries a padlock
      const lockedSlot = false; // (7.6.71, owner) no padlock on the camera's slot: nothing is locked, it is only empty until one is bought
      return `<div class="eq-slot sq${q ? ' r-' + it.rarity : ' empty'}${lockedSlot ? ' locked' : ''}${bs === 1 ? ' myth-slot' : ''}" data-slot="${bs ? 'ability' : kind}"${bs ? ` data-bs="${bs}"` : ''} title="${q ? it.name : nm + (lockedSlot ? ': not bought yet' : bs === 1 ? ': any skill, a mythical one too' : bs >= 2 ? ': any skill but a mythical one' : ': nothing on')}">${q ? `<img src="${pic(q)}" alt="" draggable="${free}" data-kind="${kind}" data-u="${q.u}">` : lockedSlot ? '<i class="lock"></i>' : ''}<small class="slot-nm">${nm}</small></div>`; };
    const order = ['net', 'cam', 'suit', 'fins', 'tank', 'bag'], rk = (q) => RARITY[ITEMS[q.id].rarity].k;
    const list = K.items.filter((q) => !onSet.has(q.u)).sort((a2, b2) => rk(a2) - rk(b2) || order.indexOf(ITEMS[a2.id].kind) - order.indexOf(ITEMS[b2.id].kind) || ITEMS[a2.id].name.localeCompare(ITEMS[b2.id].name));
    const tiles = list.map((q) => { const it = ITEMS[q.id];
      return `<div class="lk-tile r-${it.rarity}" data-u="${q.u}" data-kind="${it.kind}" draggable="${free}" title="${it.name}"><img src="${pic(q)}" alt="">${q.isNew ? '<i class="new">New</i>' : ''}${it.rarity === 'legendary' ? `<span class="glint" style="--d:${(q.u.length * 7 % 23) / 10}s;--x:${20 + q.u.charCodeAt(1) % 60}%;--y:${18 + q.u.charCodeAt(2) % 50}%"></span><span class="glint b" style="--d:${(q.u.length * 13 % 31) / 10 + 1.4}s;--x:${30 + q.u.charCodeAt(3) % 50}%;--y:${40 + q.u.charCodeAt(4) % 40}%"></span>` : ''}</div>`; }).join('');
    // (5.6.9) the belt: glow sticks (up to 5), what he takes into the water; the rest wait in the locker
    // (6.0.1) two kinds of glow stick, two stacks: the one in the belt's slot is the one the glow button drops; the other
    // waits in the locker as its own tile (its rarity's edge), and a tap puts it on the belt in place of the first
    const SP = P.spare || {}, SUPN = { necklace: 'Glow stick', glowAdv: 'Advanced glow stick' }, GR = { necklace: 'rare', glowAdv: 'exotic' } /* (6.6.2) as their rarities since 6.5.8 */, GMAX = { necklace: 5, glowAdv: 3 };
    const gk = P.glowKind === 'glowAdv' ? 'glowAdv' : 'necklace';
    const beltSlot = () => { const k = gk, n = (g.items && g.items[k]) || 0;
      return `<div class="eq-slot sq belt${n ? ' r-' + GR[k] : ' empty'}" data-belt="${k}" title="${SUPN[k]}">${n ? `<img src="${pictureOf('supply', k, 120, 72, true)}" alt=""><b class="belt-n">${n}/${GMAX[k]}</b>` : ''}<small class="slot-nm">Glow</small></div>`; };
    const spare = ['necklace', 'glowAdv'].filter((k) => (SP[k] || 0) > 0).map((k) => `<div class="lk-tile r-${GR[k]} sup" data-sup="${k}" title="${SUPN[k]}: tap to put on the belt"><img src="${pictureOf('supply', k, 120, 72, true)}" alt=""><b class="belt-n">×${SP[k]}</b></div>`).join('');
    // (5.9.6) traps live in the bag, not on the swap chip: a tile each kind with its number; a tap opens a card with Use
    const TR = P.traps || {}, trapKinds = Object.keys(TRAPS).filter((k) => (TR[k] || 0) > 0);
    const trapTiles = trapKinds.map((k) => `<div class="lk-tile r-common sup trp" data-trap="${k}" title="${TRAPS[k].name}: tap to use"><img src="${pictureOf('trap', k, 120, 72, true)}" alt=""><b class="belt-n">×${TR[k]}</b></div>`).join('');
    // (6.6.2) the backup air tanks live in the bag too: a tile with their number; its card's Use plumbs one into the sub's
    // cabin (three seconds, bubbles at the valve) and fills its air. Only in the sub
    const nAir = (g.items && g.items.airTank) || 0, airTiles = nAir ? `<div class="lk-tile r-uncommon sup air" data-air title="Backup air tank: tap to use"><img src="${pictureOf('supply', 'airTank', 120, 72, true)}" alt=""><b class="belt-n">×${nAir}</b></div>` : '';
    const airPop = this.airSel && nAir ? `<div class="item-pop trap-pop air-pop"><div class="ip-box r-uncommon tp-box"><button class="ip-close" aria-label="Close">×</button>
        <div class="tp-pic"><img src="${pictureOf('supply', 'airTank', 360, 216, true)}" alt=""></div>
        <div class="tp-txt"><h4 style="color:${RARITY.uncommon.col}">Backup air tank</h4><p class="tp-kind">Uncommon item, ${nAir} aboard</p><p class="tp-desc">A steel bottle plumbed into the sub's cabin by hand. The valve hisses for a while, then the air is full.</p>
          <div class="tp-row"><span>Connects in</span><b>3 s</b></div><div class="tp-row"><span>Fills</span><b>the cabin air</b></div>
          <div class="lk-acts"><button data-airuse>Use</button><small class="tp-note">in the sub</small></div></div></div></div>` : '';
    // (5.10.11) a trap's card, laid out like the gear cards: its picture large in a recess, its name, what it is, a few
    // plain facts, and Use (which only works at the surface)
    const trapPop = (() => { const k = this.trapSel, T = k && TRAPS[k]; if (!T || !((TR[k] || 0) > 0)) return ''; const setL = trapSets(P).filter((S) => S.type === k), setK = setL.length >= (TR[k] || 0) ? setL[0] : null, full = trapSets(P).length >= 3; /* (7.3.0) up to three set at a time, in real time */
      const fact = (a, b) => `<div class="tp-row"><span>${a}</span><b>${b}</b></div>`, desc = String(T.desc || '').replace(/\.\./g, '.');
      return `<div class="item-pop trap-pop"><div class="ip-box r-common tp-box"><button class="ip-close" aria-label="Close">×</button>
        <div class="tp-pic"><img src="${pictureOf('trap', k, 360, 216, true)}" alt=""></div>
        <div class="tp-txt"><h4 style="color:${RARITY[T.rarity || 'common'] ? RARITY[T.rarity || 'common'].col : 'inherit'}">${T.name}</h4><p class="tp-kind">${setL.length ? setL.map((S) => `Set at ${S.depth} m, ${trapLeft(S) > 0 ? `${timeLeftText(trapLeft(S))} to go` : 'done'}, ${S.catch.length} inside`).join(' · ') : `Trap, ${TR[k]} in the locker`}</p><p class="tp-desc">${desc}</p>
          ${fact('Fishes for', timeLeftText(T.dur))}${fact('Catches', `${T.count} animals`)}${fact('Sets down to', `${T.maxDepth} m`)}${fact('Takes', `up to ${Math.round(T.maxLen * 100)} cm`)}${T.winch ? fact('Emptied', "with the Margaret's winch") : ''}
          <div class="lk-acts"><button data-trapuse="${k}" ${setK || full ? 'disabled' : ''}>Use</button><small class="tp-note">${setK ? 'all set: empty one at its buoy' : full ? 'three traps set at a time' : 'at the surface'}</small></div></div></div></div>`; })();
    // (5.17.0) the glow stick's card, opened from its belt slot, laid out as the trap's: Use snaps one (90 s of warm light,
    // in the water or the sub); while one burns, the seconds left and Use greyed; and taking them off the belt, where gear can change
    // (6.1.0) gold coins: stacks of up to 10 in the locker, each stack a space; tap one for its card
    const nGold = P.gold || 0, goldTiles = Array.from({ length: Math.ceil(nGold / 10) }, (_, i) => { const n = Math.min(10, nGold - i * 10); return `<div class="lk-tile r-legendary gold" data-gold title="Gold coins"><img src="${pictureOf('gold', n, 120, 120, true)}" alt=""><b class="belt-n">×${n}</b></div>`; }).join('');
    const goldPop = this.goldSel && nGold ? `<div class="item-pop trap-pop gold-pop"><div class="ip-box r-legendary tp-box"><button class="ip-close" aria-label="Close">×</button>
        <div class="tp-pic"><img src="${pictureOf('gold', Math.min(nGold, 10), 300, 300, true)}" alt=""></div>
        <div class="tp-txt"><h4 style="color:${RARITY.legendary.col}">Old coin</h4><p class="tp-kind">Legendary, ${nGold} in the locker</p><p class="tp-desc">Hand-struck and worn nearly smooth, the old one's spiral on the face. Now and then one lies at the bottom of a chest. The old one in the cave takes nothing else.</p>
          <div class="tp-row"><span>Stacks</span><b>10 to a space</b></div><div class="tp-row"><span>Spaces</span><b>${Math.ceil(nGold / 10)}</b></div></div></div></div>` : '';
    const glowPop = (() => { if (!this.glowSel) return ''; const k = gk, adv = k === 'glowAdv', n = (g.items && g.items[k]) || 0; if (!n) return '';
      return `<div class="item-pop trap-pop glow-pop"><div class="ip-box r-${GR[k]} tp-box"><button class="ip-close" aria-label="Close">×</button>
        <div class="tp-pic"><img src="${pictureOf('supply', k, 360, 216, true)}" alt=""></div>
        <div class="tp-txt"><h4>${SUPN[k]}</h4><p class="tp-kind">${adv ? 'Exotic' : 'Rare'} light, ${n} on the belt</p><p class="tp-desc">Snap it and let it go. It hangs where you leave it, a pool of ${adv ? 'pale, bone-white' : 'warm amber'} light, and slowly sinks. The thing in the deep does not mind it.</p>
          <div class="tp-row"><span>Burns</span><b>${adv ? '3 min' : '2 min'}</b></div><div class="tp-row"><span>Lights</span><b>${adv ? '32' : '16'} m around</b></div>
          <div class="lk-acts"><button data-glowuse>Use</button>${this.h.canChangeGear() ? '<button data-glowoff>Off the belt</button>' : ''}</div></div></div></div>`; })();
    // (7.4.14, owner) the pet: a slot with his gear. Empty at first; with a pet owned and none out it carries a "!" until one
    // is out. Tapped: the pets he owns (each its picture, tier, price, stars a level, a tick on the one out)
    const pet = P.pet, psp = pet && SPECIES_BY_ID[pet.id], nOwned = (P.petsOwned || []).length;
    if (!this.fitPics) this.fitPics = new Map();
    const fit = (sp3) => { const k = 'pet' + sp3.id; if (!this.fitPics.has(k)) this.fitPics.set(k, petIcon(sp3, 300, 180).toDataURL()); return this.fitPics.get(k); };
    const pTier = psp && PET_BY_ID.get(psp.id) ? PET_BY_ID.get(psp.id).tier : 'common';
    const petGear = `<div class="eq-slot sq petg${pet ? ` r-${pTier}` : ' empty'}" data-petslot title="${pet ? psp.name : 'Pet: empty'}">${pet ? `<img src="${fit(psp)}" alt="">` : ''}${!pet && nOwned ? '<i class="badge-x">!</i>' : ''}<small class="slot-nm">Pet</small></div>`;
    const petPick = (this.petPick ? this.petsPanel(P, g, fit) : '') + (this.scenePick ? this.scenesPanel(P) : '');
    const helmetSlot = `<div class="eq-slot sq empty helmet" data-helmet title="Helmet: none yet"><small class="slot-nm">Helmet</small></div>`;
    const nSpare = ['necklace', 'glowAdv'].filter((k) => (SP[k] || 0) > 0).length + trapKinds.length + Math.ceil(nGold / 10);
    const pop = this.lkSel ? this.itemPop(P, g, free) : '';
    return `<div class="inv-sec wide eq inv-split${free ? '' : ' locked'}"><div class="inv-left"><div class="cash-plate"><span>CASH</span><b>${moneyExact(P.cash)}</b></div>`
      + `<div class="eq-stage"><div class="eq-deep"></div>${(() => { const S = BAG_SCENES[P.bagScene] || BAG_SCENES.reef; return `<button class="eq-scene${S.red ? ' red' : ''}" data-scene title="Change the scene behind your diver"><span>Scene:</span> <b>${S.name}</b></button>`; })()}<div class="eq-col">${SLOTS.slice(0, 5).map(slot).join('')}</div><canvas class="eq-earl" width="360" height="520"></canvas><div class="eq-pouch">${beltSlot()}${petGear}</div><div class="eq-col">${helmetSlot}${SLOTS.slice(5, 7).map(slot).join('')}${SLOTS.slice(7).map(slot).join('')}</div>`
      /* (7.6.49, owner) a helmet slot at the top right, ready for helmets to come; the glow sticks (used up, not worn) moved to a pouch at his feet */
      /* (7.6.26, owner) Ability 2 at the foot of its column, level with Ability: the two scrolls on one row; the pet moved up */ + `</div>`
      /* (6.0.0) no lock note: gear changes anywhere */
      /* (5.11.7) no tank panel under him: the tank's slot already shows it */
      + `</div><div class="inv-right"><div class="lk-head"><h4>Locker</h4><small>by rarity</small><span class="${list.length + Math.ceil(nGold / 10) >= LOCKER ? 'full' : ''}">(${list.length + Math.ceil(nGold / 10)}/${LOCKER})</span></div><div class="lk-grid">${spare}${airTiles}${trapTiles}${goldTiles}${tiles}${'<div class="lk-tile empty"></div>'.repeat(Math.max(0, LOCKER - list.length - nSpare))}</div>${this.statsHtml()}</div></div>${pop}${trapPop}${airPop}${glowPop}${goldPop}${petPick}${this.petSel ? this.petPop(P) : ''}`;
  }
  // (7.6.48, owner) the diver's figures under the locker, everything he wears counted in. A figure that changes (gear put
  // on or taken off) counts to its new value, swelling a little and tinted moss for better or rust for worse, then
  // settles back; the change itself rises beside it and fades
  statsHtml() {
    const rows = (this.h.playerStats && this.h.playerStats()) || []; if (!rows.length) return '';
    const now = performance.now(), prev = this.statPrev || {}; this.statFx = this.statFx || {};
    for (const [k, , v, , hi] of rows) { if (prev[k] != null && Math.abs(prev[k] - v) > 1e-6) { const shown = this.statFx[k] && now - this.statFx[k].t0 < 700 ? this.statFx[k].cur : prev[k]; this.statFx[k] = { from: shown, to: v, t0: now, up: (v - prev[k]) * hi > 0, d: v - prev[k], done: false }; } prev[k] = v; }
    this.statPrev = prev;
    const cells = rows.map(([k, label, v, fmt]) => { const fx = this.statFx[k], el = fx ? now - fx.t0 : 1e9, live = el < 1800;
      const dTxt = live ? (() => { const t = fmt(Math.abs(fx.d)).replace(/^×/, ''); return (fx.d > 0 ? '+' : '−') + t; })() : '';
      return `<div class="st-cell${live ? (fx.up ? ' fx-up' : ' fx-down') : ''}" data-st="${k}" style="--el:-${Math.round(Math.min(el, 1800))}ms"><span>${label}</span><b>${fmt(live && el < 700 ? fx.from + (fx.to - fx.from) * (1 - Math.pow(1 - el / 700, 3)) : v)}</b>${live ? `<i class="st-d">${dTxt}</i>` : ''}</div>`; }).join('');
    this.statFmt = Object.fromEntries(rows.map((r) => [r[0], r[3]]));
    if (Object.values(this.statFx).some((f) => now - f.t0 < 700)) this.statTick();
    const nm0 = (this.h.playerName && this.h.playerName()) || '';
    return `<div class="inv-stats">${nm0 ? `<h5>${esc(nm0)}</h5>` : ''}<div class="st-grid">${cells}</div></div>`;
  }
  statTick() { if (this.statRaf) return; const step = () => { this.statRaf = null; const now = performance.now(); let more = false;
      for (const [k, f] of Object.entries(this.statFx || {})) { const el = now - f.t0; if (f.done) continue; const fin = el >= 700; if (!fin) more = true; else f.done = true;
        const v = fin ? f.to : f.from + (f.to - f.from) * (1 - Math.pow(1 - el / 700, 3)); f.cur = v; const b = document.querySelector(`#inventory .st-cell[data-st="${k}"] b`); if (b && this.statFmt[k]) b.textContent = this.statFmt[k](v); }
      if (more) this.statRaf = requestAnimationFrame(step); };
    this.statRaf = requestAnimationFrame(step); }
  // (7.6.51-53, owner) behind the diver in the bag: a scene of the deep over the whole stage, see-through so the plate shows
  // through it and fading out at its edges; the player picks which (BAG_SCENES, the button at the top of the stage). Each is
  // drawn once at the stage's size; the plants and things in it are drawn in the turntable's own frame (360 x 520) under him
  // the shadow under his feet, painted once: a few soft overlapping smudges, wider behind him than in front
  feetShadow(W, H) { if (this.fsh && this.fsh.width === W) return this.fsh; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const fy = H * EQ_FEET;
    x.filter = 'blur(7px)'; for (const [dx, rx, ry, a] of [[-6, 0.17, 0.016, 0.42], [10, 0.11, 0.012, 0.5], [-22, 0.1, 0.01, 0.28], [2, 0.06, 0.008, 0.6]]) { x.fillStyle = `rgba(0, 0, 0, ${a})`; x.beginPath(); x.ellipse(W / 2 + dx, fy, W * rx, H * ry, 0, 0, Math.PI * 2); x.fill(); }
    return (this.fsh = c); }
  eqBackdropURL(w, h, scene) { const fl = this.eqFloor || 0.92, k = `${w}x${h}:${scene}:${fl.toFixed(3)}`; if (this.eqBdKey !== k) { this.eqBdKey = k; this.eqBdURL = this.eqBackdrop(w * 2, h * 2, scene, fl).toDataURL(); } return this.eqBdURL; }
  eqBackdrop(W, H, scene = 'reef', floor = 0.92) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let sd = 5; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const w = document.createElement('canvas'); w.width = W; w.height = H; const y = w.getContext('2d');
    const S = BAG_SCENES[scene] || BAG_SCENES.reef, gr = y.createLinearGradient(0, 0, 0, H);
    S.water.forEach((col, i) => gr.addColorStop(i / (S.water.length - 1), col)); y.fillStyle = gr; y.fillRect(0, 0, W, H);
    // light from above, uneven: a few broad soft patches
    for (let i = 0; i < 5; i++) { const px = W * (0.15 + rnd() * 0.7), py = H * rnd() * 0.3, r = W * (0.25 + rnd() * 0.25), g2 = y.createRadialGradient(px, py, 0, px, py, r); g2.addColorStop(0, S.light); g2.addColorStop(1, 'rgba(0,0,0,0)'); y.fillStyle = g2; y.fillRect(0, 0, W, H); }
    const PS = H / 520, FW = W / PS; y.save(); y.scale(PS, PS); y.translate(0, (floor - 0.92) * 520); S.draw(y, rnd, FW, 520); y.restore(); // the scene's floor (0.92) on his feet // the scene, in the turntable's units across the whole stage
    // sea snow: tiny sharp specks
    const d0 = Math.max(1, Math.round(W / 600));
    for (let i = 0; i < (S.snow || 140); i++) { y.fillStyle = `rgba(${S.snowCol || '200, 212, 204'}, ${0.15 + rnd() * 0.35})`; const px = rnd() * W, py = rnd() * H * 0.88; y.fillRect(px, py, rnd() < 0.3 ? d0 * 2 : d0, rnd() < 0.2 ? d0 * 2 : d0); }
    // fade out at the edges of the stage, unevenly
    y.globalCompositeOperation = 'destination-in'; const m = document.createElement('canvas'); m.width = W; m.height = H; const mx = m.getContext('2d');
    mx.fillStyle = '#000'; mx.filter = `blur(${Math.round(W / 30)}px)`; const e = W * 0.035; mx.fillRect(e, e, W - 2 * e, H - 2 * e); mx.filter = 'none';
    y.drawImage(m, 0, 0); y.globalCompositeOperation = 'source-over';
    x.globalAlpha = 0.78; x.drawImage(w, 0, 0); x.globalAlpha = 1;
    return c;
  }
  // (3.0.35) the locker is laid out at one size, 1240 x 820, and scaled to fit whatever screen it is on: a
  // phone sees the same locker as a computer, only smaller
  fitInventory() {
    const panel = $('inventory').querySelector('.inv-panel'); if (!panel) return;
    const vw = window.innerWidth, vh = window.innerHeight, small = vw < 900 || vh < 560, H = small ? 730 : 820;
    const k = Math.min(1.6, (vw - (small ? 4 : 40)) / 1240, (vh - (small ? 4 : 40)) / H); // (4.26) and up, on a large screen (its painted door is drawn at twice this size)
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
      <text x="50" y="70" text-anchor="middle" font-size="8" font-family=""Barlow Semi Condensed", "Arial Narrow", sans-serif" fill="#4a3c24">AIR</text>
      <g transform="rotate(${ang} 50 50)"><path d="M50 50 L50 17" stroke="#1c1a16" stroke-width="2.2" stroke-linecap="round"/></g><circle cx="50" cy="50" r="4" fill="#8a7448"/></svg>`;
    return `<div class="air-rig${warn ? ' warn' : ''}"><img src="${pictureOf(it.kind, it, 320, 120, true)}" alt="">${dial}<div class="air-txt"><span class="tape">${it.name.toUpperCase()}</span><b>${Math.round(now)} s</b><i>${Math.round(now) >= max ? 'of air, full' : `of ${max} s`}</i></div></div>`;
  }
  // one thing, as a column of the pop-up: its picture, name, rarity, what it is, its skills and its set
  itemCol(P, q, head) {
    const it = ITEMS[q.id], R = RARITY[it.rarity], T = totals(P), roman = ['', 'I', 'II', 'III', 'IV'];
    const skills = skillsHtml(q.sk); void roman; // (6.5.3) the short list every card shares
    const power = q.leg ? powerHtml(q.leg, LEGEND[q.leg].cd ? powerStatus(P, q.leg) : '') : ''; // (5.16.0) a power that triggers: ready, or its hourglass and time left
    const S = it.set && SETS[it.set], have = S ? T.sets[it.set] || 0 : 0;
    return `<div class="ip-col r-${it.rarity}${power || (q.sk && q.sk.length) || S ? ' more' : ''}"><h5>${head}</h5><img src="${pictureOf(it.kind, it.kind === 'ability' ? { ...it, sat: Math.round((0.5 + 1.5 * Math.min(1, (q.load || 0) / Math.max(1, maxLoad(abilityOf(q.id) || {})))) * 10) / 10 } : it, 260, 156, true)}" alt=""><b class="nm" style="color:${R.col}">${it.name}</b><span class="rr" style="color:${R.col}">${rarKind(R.name, it.kind)}${it.kind === 'ability' && (abilityOf(it.id) || {}).pure ? ' · Pure' : ''}</span><p class="ic-line">${it.line || ''}</p>
      ${(() => { const M2 = MEASURES[it.kind]; if (!M2) return ''; const rows2 = M2.map((r) => `<div class="ip-st"><span>${r[0]}</span><b>${measureHtml(it.kind, r, it, q.sk)}</b></div>`).concat(crossBoosts(it.kind, q.sk).map(([a, b]) => `<div class="ip-st"><span>${a}</span><b><span class="boost">${b}</span></b></div>`)).join(''); return `<div class="ip-stats">${rows2}</div>`; })() /* (5.12.0) its numbers on its own card */}
      ${power /* (7.3.0) after the figures, so they keep their place on every card */}<div class="ip-sks">${skills}</div>${S ? `<div class="lk-set${have >= 3 ? ' live' : ''}"><b>${S.name} set</b>, ${have >= 3 ? 'on' : `worn (${have}/3)`}<span>${S.trait}</span></div>` : ''}</div>`;
  }
  // (7.6.3, owner) a scroll's charges, inside its card under its description: a notch for each slot (one slot runs the full
  // width), then Load (one) and Fill (to the top), priced in pearls; only at the surface, the sub's too (7.6.26); away from it
  // the same buttons greyed under a padlock. (7.6.26, owner) a charge just loaded fills in with a glow, and the loaded notches
  // glow more the fuller the scroll is, shining at full
  chargeBox(q) {
    const A = abilityOf(q.id); if (!A) return ''; const mx = maxLoad(A), n = q.load || 0, pr = chargePrice(A), top = this.h.atSurface && this.h.atSurface(), pl = '<img class="st-pearl" src="assets/ui/icons/pearl.png" alt="">';
    const fresh = this.freshLoad && this.freshLoad.u === q.u && Date.now() - this.freshLoad.at < 1500 ? this.freshLoad.from : n, full = n / mx;
    const btn = (k, label) => top && n < mx ? `<button data-lk="${k}:${q.u}">${label}</button>` : `<button class="ld-off" data-lk="${n < mx ? 'loadlock' : 'loadfull-done'}:${q.u}">${n < mx ? '<i class="ld-pad"></i>' : ''}${label}</button>`;
    return `<div class="ld-box${n >= mx ? ' ld-full' : ''}" style="--full:${full.toFixed(2)}"><div class="ld-head"><span>Charges</span>${n < mx ? (this.h.getProfile && bagSlotOf(kitOf(this.h.getProfile()), q.u) ? `<small class="ld-next">Next ${fmtLeft(Math.ceil(nextCharge(q) / 1000))}</small>` : '<small class="ld-next">Recharges only when equipped</small>') : ''}<b>${n} / ${mx}</b></div><div class="ld-notches" style="grid-template-columns:repeat(${mx}, 1fr)">${Array.from({ length: mx }, (_, i) => `<i class="${i < n ? 'on' : ''}${i < n && i >= fresh ? ' fresh' : ''}" style="--i:${i - fresh}"></i>`).join('')}</div><div class="ld-btns lk-acts">${btn('load', `Load ${pl}${pr}`)}${btn('loadfull', `Fill ${pl}${pr * Math.max(1, mx - n)}`)}</div></div>`;
  }
  // (7.7.2, owner) a slot button is white when that slot already holds a scroll; pressing it then asks first (main.js)
  slotBtn(K, n, q, label) { const k = slotKey(K, n), taken = K.on[k] && K.on[k] !== q.u; return `<button class="slotb${taken ? ' taken' : ''}" data-lk="slot:${n}:${q.u}">${label}</button>`; }
  chargeCol(P, q, head) { let c = this.itemCol(P, q, head); const it = ITEMS[q.id]; if (it && it.kind === 'ability') { const cut = c.lastIndexOf('</div>'); c = c.slice(0, cut) + this.chargeBox(q) + c.slice(cut); } return c; }
  // the pop-up: the thing on its own (if he has it on), or side by side with what he has on of that kind
  itemPop(P, g, free) {
    const K = kitOf(P), q = K.items.find((x) => x.u === this.lkSel); if (!q) { this.lkSel = null; return ''; }
    const K0 = K; // (7.4.11) for the scrolls' Combine
    if (q.isNew) { delete q.isNew; this.h.onSaveProfile && this.h.onSaveProfile(); }
    const it = ITEMS[q.id], scr = it.kind === 'ability', bsl = scr ? bagSlotOf(K, q.u) : 0, on2 = bsl === 2, on = scr ? bsl > 0 : K.on[it.kind] === q.u, seller = this.h.canSellGear && this.h.canSellGear();
    const curKey = scr ? slotKey(K, 1) : it.kind, myth = it.rarity === 'mythical';
    const curQ = !on && K.on[curKey] ? K.items.find((x) => x.u === K.on[curKey]) : null, cur = curQ ? ITEMS[curQ.id] : null, M = MEASURES[it.kind];
    let body, acts = '';
    if (it.kind === 'chest') { // (6.4.0) a chest in the locker: its card, and Open (with room in the locker for all it can give)
      { const col = this.itemCol(P, q, 'Chest'), odds = chestOddsHtml(String(it.id).replace(/^chest_/, '')), cut = col.lastIndexOf('</div>'); body = `<div class="ip-cols one">${cut > 0 ? col.slice(0, cut) + odds + col.slice(cut) : col + odds}</div>`; } acts += `<button data-lk="open:${q.u}">Open</button>`; // (7.4.1, owner) its odds in the card's empty space
      if (seller) acts += `<button class="sell" data-lk="sellgear:${q.u}">Sell ${money(sellValue(q), false)}</button>`;
      return `<div class="item-pop"><div class="ip-box r-${it.rarity}"><button class="ip-close" aria-label="Close">×</button>${body}<div class="lk-acts">${acts}</div></div></div>`;
    }
    if (on) {
      body = `<div class="ip-cols one">${this.chargeCol(P, q, 'You have it on')}</div>`;
      const starter = it.kind === 'net' ? null : FREE_IDS[it.kind]; // (6.9.1) a net unequipped leaves the hands empty, the hand net too
      if (free && scr && !myth) for (const n of [1, 2, 3]) if (n !== bsl) acts += this.slotBtn(K, n, q, SLOT_NAME[n]); // (7.6.71, owner) a worn scroll moves to another of the three slots (a Heart stays in the mythic slot)
      if (free && !(starter && q.id === starter)) acts += `<button data-lk="off:${scr ? slotKey(K, bsl || 1) : it.kind}">Unequip${starter ? ` <small>(${ITEMS[starter].name} back on)</small>` : ''}</button>`;
    } else {
      // the numbers, a row each: his now, this one, which is better
      let rows = '';
      if (M) rows = M.map(([label, txt, num, hi]) => {
        const b2 = measureHtml(it.kind, [label, txt], it, q.sk); if (!cur) return `<tr><th>${label}</th><td>—</td><td>${b2}</td></tr>`; // (5.12.0) a skill's boost in green
        const a2 = measureHtml(cur.kind, [label, txt], cur, curQ.sk); if (a2 === b2) return `<tr class="same"><th>${label}</th><td>${a2}</td><td>${b2}</td></tr>`;
        const bv = (i2, sk2) => { const B = boostOf(i2.kind, label, i2, sk2); return B && B.val != null ? B.val : num(i2); }, d = bv(it, q.sk) - bv(cur, curQ.sk), up = hi ? d > 0 : d < 0; // (6.0.8) compared with the skills counted in
        return `<tr><th>${label}</th><td>${a2}</td><td class="${up ? 'up' : 'down'}">${b2} ${up ? '▲' : '▼'}</td></tr>`;
      }).join('');
      // (7.6.49, owner) a tank, suit or fins: what his air would be with it on, everything else as it is
      if (['tank', 'suit', 'fins'].includes(it.kind) && this.h.airWith) { const a0 = this.h.airWith(null), a1 = this.h.airWith(q), f = (v) => (v >= 60 ? `${Math.floor(v / 60)} min ${String(Math.round(v % 60)).padStart(2, '0')} s` : `${Math.round(v)} s`);
        rows += Math.round(a0) === Math.round(a1) ? `<tr class="same"><th>Your air</th><td>${f(a0)}</td><td>${f(a1)}</td></tr>` : `<tr><th>Your air</th><td>${f(a0)}</td><td class="${a1 > a0 ? 'up' : 'down'}">${f(a1)} ${a1 > a0 ? '▲' : '▼'}</td></tr>`; }
      body = `<div class="ip-cols">${cur ? this.chargeCol(P, curQ, 'Equipped') : `<div class="ip-col empty"><h5>Equipped</h5><p>Nothing in that slot.</p></div>`}<div class="ip-arrow">→</div>${this.chargeCol(P, q, 'Selected')}</div>`
        + (rows ? `<table class="ip-vs"><thead><tr><th></th><td>${cur ? cur.name : '—'}</td><td>${it.name}</td></tr></thead><tbody>${rows}</tbody></table>` : '');
      if (free && !scr) acts += `<button data-lk="on:${q.u}">Put it on</button>`;
      if (free && scr) for (const n of myth ? [1] : [1, 2, 3]) acts += this.slotBtn(K, n, q, myth ? 'Equip' : SLOT_NAME[n]); // (7.6.71, owner) a scroll into one of the three slots; a Heart only into the mythic slot
      // (7.4.11, owner) three of the same scroll at the same rarity, none of them on: they combine into one of the next rarity
      if (seller) acts += it.kind === 'ability' ? `<button class="sell" data-lk="sellscroll:${q.u}">Sell <img class="st-pearl" src="assets/ui/icons/pearl.png" alt="">${scrollSellPearls(q.id).toLocaleString('en-US')}</button>` /* (7.6.2, owner) scrolls sell for pearls */ : `<button class="sell" data-lk="sellgear:${q.u}">Sell ${money(sellValue(q), false)}</button>`;
      else acts += '<small>Sell it on the Margaret, at the station, or to Dave.</small>';
    }
    // (7.6.3, owner) charges: a notch for each one loaded, then Load (one) and Load full, priced in pearls; only at the surface
    // (7.6.7, owner) inside the card, under its description, where they belong to the scroll; away from the surface the same
    // two buttons, greyed under a small padlock (tapped: "At the surface"), so the card keeps one shape everywhere
    /* (7.6.26, owner) the charges are put into each scroll's own card (both, when two are compared): see chargeBox */
    // (7.5.6, owner) a scroll always shows its Combine 3, worn or not: greyed with how many he has until there are three
    if (it.kind === 'ability') { const NX = { rare: 'exotic', exotic: 'legendary', legendary: 'mythical' }[it.rarity], /* (7.4.15) three legendaries make the mythical */ nId = NX && `ab_${it.fam}_${NX}`, have = K0.items.filter((x) => x.id === q.id).length;
      if (nId && ITEMS[nId]) acts += `<button data-lk="combine:${q.id}"${have >= 3 ? '' : ' disabled'}>Combine 3${have >= 3 ? '' : ` (${have}/3)`} → <span style="color:${RARITY[NX].col}">${ITEMS[nId].name}</span></button>`; }
    return `<div class="item-pop"><div class="ip-box r-${it.rarity}"><button class="ip-close" aria-label="Close">×</button>${body}<div class="lk-acts">${acts}</div></div></div>`;
  }
  equipWire(P, g) {
    const root = $('inventory').querySelector('.eq'); if (!root) return;
    // Earl, in what he has on
    // (2.8.1) Earl, in what he has on, on a turntable: drag across him to turn him round; he keeps turning a
    // little after you let go, slows, and settles facing you
    { const st = root.querySelector('.eq-stage'), dp = st && st.querySelector('.eq-deep'); if (dp) { const w0 = st.clientWidth, h0 = st.clientHeight; if (w0 > 20 && h0 > 20) { const cvE = st.querySelector('.eq-earl'); this.eqFloor = cvE ? (cvE.offsetTop + cvE.offsetHeight * EQ_FEET) / h0 : 0.92; dp.style.backgroundImage = `url(${this.eqBackdropURL(w0, h0, P.bagScene || 'reef')})`; } } } // (7.6.52, owner)
    const cv = root.querySelector('.eq-earl');
    if (cv) {
      const sp = this.spin || (this.spin = { a: 0.35, v: 0 });
      const e = g && g.earl, look = () => ({ kind: 'none', tier: 0, t: performance.now() / 1000, suit: (e && e.suit) || 'wet', bag: [], finLook: e && e.finLook, tankLook: e && e.tankLook, suitGlow: e && e.suitGlow });
      this.spinCv = cv; // the panel is redrawn often; the loop always draws on the canvas that's there now
      const draw = () => {
        const cv = this.spinCv, c = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, t = performance.now() / 1000, k = Math.cos(sp.a);
        c.clearRect(0, 0, W2, H2);
        // (7.6.55, owner) his shadow where his feet are: soft, uneven, darkest right under the fins (not a flat oval floating behind him)
        c.drawImage(this.feetShadow(W2, H2), 0, 0);
        c.save(); c.translate(W2 / 2, H2 * EQ_MID + Math.sin(t * 1.2) * 2); c.scale(Math.sign(k || 1) * Math.max(0.12, Math.abs(k)), 1); c.rotate(-Math.PI / 2);
        drawEarl(c, H2 * EQ_LEN, t * 1.5, 0.08, null, null, look());
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
    box.querySelectorAll('[data-lk]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.lk, keep = /^(load|loadfull|loadlock|loadfull-done):/.test(k); /* (7.6.26, owner) loading keeps the card open */ if (/^(load|loadfull):/.test(k)) { const u = k.split(':')[1], q0 = kitOf(P).items.find((x) => x.u === u); this.freshLoad = { u, from: q0 ? (q0.load || 0) : 0, at: Date.now() }; } this.h.onEquip(k); if (!keep) this.lkSel = null; this.renderInventory(); }));
    // (7.4.14) the pet's slot on the Gear page: the pets he owns
    const pslotG = root.querySelector('.eq-slot[data-petslot]'); if (pslotG) pslotG.addEventListener('click', () => { this.petPick = true; this.lkSel = null; this.renderInventory(); });
    if (!this.ppWired && $('inventory')) { this.ppWired = true; $('inventory').addEventListener('click', (ev) => { const pk = ev.target.closest('.pet-pick'); if (!pk) return; ev.stopPropagation();
      const b = ev.target.closest('[data-petout]'); if (b) { this.h.onPet(+b.dataset.petout); this.renderInventory(); return; }
      if (ev.target.closest('[data-petfeed]')) { this.petPick = false; this.toggleInventory(false); this.h.onPetFeed && this.h.onPetFeed(); return; } // (7.4.14) the aquarium alone on the screen
      if (ev.target.closest('[data-petshop]')) { this.petPick = false; this.toggleInventory && this.toggleInventory(false); this.toggleStore(true); const st = $('store'); if (st) st.innerHTML = this.petsPage(); return; }
      if (ev.target === pk || ev.target.closest('.ip-close')) { this.petPick = false; this.renderInventory(); } }, true); }
    root.querySelectorAll('.lk-tile:not(.empty):not(.sup), .eq-slot [data-u]').forEach((el) => el.addEventListener('click', () => { if (this.dragEnded && performance.now() - this.dragEnded < 500) return; this.lkSel = el.dataset.u; this.renderInventory(); }));
    // (5.6.9) the belt: a tap on a slot takes it off (into the locker), a tap on a locker stack puts it on
    const beltMsg = () => this.h.onMessage && this.h.onMessage('Not now'); // (6.0.0) gear changes anywhere but in its jaws
    root.querySelectorAll('[data-gold]').forEach((el) => el.addEventListener('click', () => { this.goldSel = true; this.renderInventory(); }));
    { const gp = box.querySelector('.gold-pop'); if (gp) gp.addEventListener('click', (ev) => { if (ev.target === gp || ev.target.closest('.ip-close')) { this.goldSel = false; this.renderInventory(); } }); }
    root.querySelectorAll('[data-belt]').forEach((el) => el.addEventListener('click', () => { if ((g.items && g.items[el.dataset.belt]) > 0) { this.glowSel = true; this.renderInventory(); } })); // (5.17.0) its card
    { const gp = box.querySelector('.glow-pop'); if (gp) gp.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-glowuse]')) { this.glowSel = false; if (this.h.onGlowUse && this.h.onGlowUse()) { this.toggleInventory(false); return; } this.renderInventory(); return; }
      if (ev.target.closest('[data-glowoff]')) { this.glowSel = false; if (this.h.canChangeGear() && this.h.onBelt) this.h.onBelt(P.glowKind === 'glowAdv' ? 'glowAdv' : 'necklace', false); else beltMsg(); this.renderInventory(); return; }
      if (ev.target === gp || ev.target.closest('.ip-close')) { this.glowSel = false; this.renderInventory(); } }); }
    root.querySelectorAll('[data-sup]').forEach((el) => el.addEventListener('click', () => { if (!this.h.canChangeGear()) return beltMsg(); if (this.h.onBelt) { this.h.onBelt(el.dataset.sup, true); this.renderInventory(); } }));
    root.querySelectorAll('[data-trap]').forEach((el) => el.addEventListener('click', () => { this.trapSel = el.dataset.trap; this.renderInventory(); }));
    root.querySelectorAll('[data-air]').forEach((el) => el.addEventListener('click', () => { this.airSel = true; this.renderInventory(); })); // (6.6.2)
    { const ap = box.querySelector('.air-pop'); if (ap) ap.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-airuse]')) { this.airSel = false; if (this.h.onAirUse && this.h.onAirUse()) { this.toggleInventory(false); return; } this.renderInventory(); return; }
      if (ev.target === ap || ev.target.closest('.ip-close')) { this.airSel = false; this.renderInventory(); } }); }
    { const tp = box.querySelector('.trap-pop'); if (tp) tp.addEventListener('click', (ev) => { const u2 = ev.target.closest('[data-trapuse]');
      if (u2) { const k = u2.dataset.trapuse; this.trapSel = null; if (this.h.onTrapUse && this.h.onTrapUse(k) === 'open') { this.toggleInventory(false); return; } this.renderInventory(); return; }
      if (ev.target === tp || ev.target.closest('.ip-close')) { this.trapSel = null; this.renderInventory(); } }); }
    // (7.4.5) a card that runs past its height says so with the chevron at its foot (CSS .more), gone at its end
    box.querySelectorAll('.ip-col').forEach((c) => { const chk = () => { const over = c.scrollHeight > c.clientHeight + 4; c.classList.toggle('more', over); c.classList.toggle('at-end', over && c.scrollTop + c.clientHeight >= c.scrollHeight - 6); };
      requestAnimationFrame(chk); c.addEventListener('scroll', chk, { passive: true }); });
    const pop = box.querySelector('.item-pop:not(.trap-pop)');
    if (pop) { pop.addEventListener('click', (ev) => { if (ev.target === pop || ev.target.closest('.ip-close')) { this.lkSel = null; this.renderInventory(); } }); }
    { const sb = root.querySelector('[data-scene]'); if (sb) sb.addEventListener('click', () => { this.scenePick = true; this.lkSel = null; this.renderInventory(); }); } // (7.6.53-54, owner) the scenes, to choose or buy
    { const sp = box.querySelector('.scene-pick'); if (sp) sp.addEventListener('click', (ev) => { const b = ev.target.closest('[data-pickscene]');
      if (b) { const id = b.dataset.pickscene, S = BAG_SCENES[id], own = !S.price || (P.bagScenes || []).includes(id);
        if (own) { P.bagScene = id; this.h.onSaveProfile && this.h.onSaveProfile(); this.scenePick = false; this.renderInventory(); return; }
        const pl = Math.floor(P.pearls || 0); if (pl < S.price) { this.h.onMessage && this.h.onMessage(`${S.name}: ${S.price} pearls (you have ${pl})`); return; }
        this.confirm(`${S.name}`, `${S.line}\nBuy it for ${S.price} pearls? You have ${pl}.`, `Buy, ${S.price} pearls`, 'Not now', () => { P.pearls -= S.price; P.bagScenes = [...(P.bagScenes || []), id]; P.bagScene = id; this.h.onSaveProfile && this.h.onSaveProfile(); this.scenePick = false; this.renderInventory(); });
        return; }
      if (ev.target === sp || ev.target.closest('.ip-close')) { this.scenePick = false; this.renderInventory(); } }); }
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
      s2.addEventListener('drop', (ev) => { ev.preventDefault(); const [k, u] = ev.dataTransfer.getData('text/plain').split(':'); if (k === s2.dataset.slot) { if (s2.dataset.bs) { this.h.onEquip('slot:' + s2.dataset.bs + ':' + u); this.renderInventory(); } else put(u); } });
    });
    // (7.6.48, owner) on a phone: press and hold a locker tile to lift it, drag it onto a slot (or onto him) and let go
    root.querySelectorAll('.lk-tile[data-u]').forEach((el) => {
      let tm = null, ghost = null, x0 = 0, y0 = 0;
      const clear = () => { clearTimeout(tm); tm = null; if (ghost) { ghost.remove(); ghost = null; root.querySelectorAll('.hot').forEach((s3) => s3.classList.remove('hot')); } };
      el.addEventListener('touchstart', (ev) => { const t = ev.touches[0]; x0 = t.clientX; y0 = t.clientY;
        tm = setTimeout(() => { tm = null; const im = el.querySelector('img'); if (!im) return; ghost = im.cloneNode(); ghost.className = 'lk-ghost'; ghost.style.left = x0 + 'px'; ghost.style.top = y0 + 'px'; document.body.appendChild(ghost);
          root.querySelectorAll(`[data-slot="${el.dataset.kind}"]`).forEach((s3) => s3.classList.add('hot')); navigator.vibrate && navigator.vibrate(12); }, 260); }, { passive: true });
      el.addEventListener('touchmove', (ev) => { const t = ev.touches[0]; if (!ghost) { if (Math.hypot(t.clientX - x0, t.clientY - y0) > 8) clearTimeout(tm); return; } ev.preventDefault(); ghost.style.left = t.clientX + 'px'; ghost.style.top = t.clientY + 'px'; }, { passive: false });
      el.addEventListener('touchend', (ev) => { if (!ghost) { clearTimeout(tm); return; } const t = ev.changedTouches[0], moved = Math.hypot(t.clientX - x0, t.clientY - y0) > 10; clear(); if (!moved) return; ev.preventDefault(); this.dragEnded = performance.now();
        const hit = document.elementFromPoint(t.clientX, t.clientY), sl = hit && hit.closest('.eq-slot[data-slot]');
        if (sl && sl.dataset.slot === el.dataset.kind) { if (sl.dataset.bs) { this.h.onEquip('slot:' + sl.dataset.bs + ':' + el.dataset.u); this.renderInventory(); } else put(el.dataset.u); }
        else if (hit && hit.closest('.eq-earl')) put(el.dataset.u);
        else if (sl && sl.dataset.slot) this.h.onMessage && this.h.onMessage("Can't put that there"); });
      el.addEventListener('touchcancel', clear);
    });
    const earl = root.querySelector('.eq-earl');
    earl.addEventListener('dragover', (ev) => { if (this.dragKind && !this.dragKind.startsWith('off:')) ev.preventDefault(); });
    earl.addEventListener('drop', (ev) => { ev.preventDefault(); const [k, u] = ev.dataTransfer.getData('text/plain').split(':'); if (k !== 'off') put(u); });
    const grid = root.querySelector('.lk-grid') || root;
    grid.addEventListener('dragover', (ev) => { if (this.dragKind && this.dragKind.startsWith('off:')) ev.preventDefault(); });
    grid.addEventListener('drop', (ev) => { const d = ev.dataTransfer.getData('text/plain'); if (d.startsWith('off:')) { ev.preventDefault(); off(d.slice(4)); } });
  }
  settingsOpen() { return !$('settings').hidden; }
  toggleSettings(force) {
    { const pnl = document.querySelector('#settings .set-panel'), bd = pnl && pnl.querySelector('.set-body'); // (6.0.15) the 'more below' cue
      if (bd && !pnl.querySelector('.set-more')) { const m = document.createElement('i'); m.className = 'set-more'; pnl.appendChild(m);
        const upd = () => { const more = bd.scrollHeight - bd.scrollTop - bd.clientHeight > 6; bd.classList.toggle('more', more); pnl.classList.toggle('more', more); };
        bd.addEventListener('scroll', upd, { passive: true }); this.setMoreUpd = upd; } setTimeout(() => this.setMoreUpd && this.setMoreUpd(), 60); } const el = $('settings'); el.hidden = !(force === undefined ? el.hidden : force); if (!el.hidden) this.renderSettings(); }
  renderSettings() {
    // (5.1) plain words and a big switch each: what it does, not what it is called inside the game
    const g = this.h.getGame(), sw = (on) => `<b class="sw${on ? ' on' : ''}" aria-hidden="true"><i></i></b>`, row = (id, label, on, note) => { $(id).innerHTML = `<span>${label}${note ? `<em>${note}</em>` : ''}</span>${sw(on)}`; };
    row('set-sound', 'Sound', this.h.getMuted ? !this.h.getMuted() : true, '');
    row('set-fullscreen', 'Full screen', !!document.fullscreenElement, '');
    // (6.3.0) the brackets setting is gone with the brackets
    $('set-catchtags').innerHTML = `<span>Redeem code<em>a code for pearls, cash or gear</em></span><b class="set-pick">Enter</b>`;
    row('flashing', 'Softer flashes', !!(g && g.reduceFlash), 'gentler lights from the thing in the deep');
    $('set-units').innerHTML = `<span>Units<em>metres and kilograms, or feet and pounds</em></span><b class="set-pick">${imperial() ? 'Imperial' : 'Metric'}</b>`; // (6.0.3)
    { const nm = uiSizeName(); $('set-uisize').innerHTML = `<span>Button size<em>the controls on screen, larger or smaller</em></span><b class="set-pick">${nm[0].toUpperCase() + nm.slice(1)}</b>`; } // (5.15.7) Small / Normal / Large, a tap steps through them
    $('set-graphics').innerHTML = `<span>Battery saver<em>30 frames a second</em></span>${sw(!!SETTINGS.fast)}` /* (7.5.0, owner) named for what it does */;
  }
  // (7.6.21, owner) a small plate to type a code into; the game says what it gave, or why not
  redeemBox() {
    let el = $('redeem'); if (!el) { el = document.createElement('div'); el.id = 'redeem'; el.innerHTML = '<div class="rd-plate"><h3>Redeem code</h3><input class="rd-in" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Code"><p class="rd-msg"></p><div class="rd-btns"><button class="rd-go">Redeem</button><button class="rd-no">Close</button></div></div>'; document.body.appendChild(el);
      const inp = el.querySelector('.rd-in'), msg = el.querySelector('.rd-msg');
      const go = () => { const r = this.h.onRedeem ? this.h.onRedeem(inp.value) : 'Not available'; msg.textContent = r.msg || r; msg.classList.toggle('ok', !!r.ok); if (r.ok) inp.value = ''; };
      el.querySelector('.rd-go').addEventListener('click', go); inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') go(); });
      el.querySelector('.rd-no').addEventListener('click', () => { el.hidden = true; inp.blur(); }); }
    el.hidden = false; el.querySelector('.rd-msg').textContent = ''; setTimeout(() => el.querySelector('.rd-in').focus(), 50);
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
    }
    // the first trap type with one free, unless the last one chosen is still free
    if (!this.ts.type || trapsFree(g, this.ts.type) <= 0) this.ts.type = TRAP_ORDER.find((k) => trapsFree(g, k) > 0) || 'pot';
    $('trapset').hidden = false;
    this.tsRender();
  }
  // (7.3.0, owner) the depth as a winch's line counter: four number drums behind a small window in a dark bronze bezel,
  // bone numerals, the drums shaded round and grained, no glow (it was a phosphor-green screen)
  tsDrums(v) {
    const c = $('ts-drums'); if (!c) return; const x = c.getContext('2d'), W = c.width, H = c.height; x.clearRect(0, 0, W, H);
    const rr = (a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#4c5740'); g.addColorStop(0.5, '#363f2e'); g.addColorStop(1, '#22281c'); /* (owner) the plate's own olive steel */
    rr(2, 2, W - 4, H - 4, 10); x.fillStyle = g; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,0.7)'; x.stroke();
    x.strokeStyle = 'rgba(200,210,180,0.16)'; x.lineWidth = 1.5; rr(5, 5, W - 10, H - 10, 8); x.stroke();
    for (const sx of [13, W - 13]) { const sg = x.createRadialGradient(sx - 2, H / 2 - 2, 1, sx, H / 2, 7); sg.addColorStop(0, '#a8916a'); sg.addColorStop(1, '#3a2e1e'); x.fillStyle = sg; x.beginPath(); x.arc(sx, H / 2, 6, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(20,14,8,0.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(sx - 4, H / 2 - 2); x.lineTo(sx + 4, H / 2 + 2); x.stroke(); }
    const n = 4, wx = 26, ww = W - 52, wy = 16, wh = H - 32, dw = ww / n, s = String(Math.max(0, Math.round(v))).padStart(n, '0').slice(-n);
    x.fillStyle = '#0b0d09'; rr(wx - 3, wy - 3, ww + 6, wh + 6, 4); x.fill();
    for (let i = 0; i < n; i++) { const dx = wx + i * dw;
      const dg = x.createLinearGradient(0, wy, 0, wy + wh); dg.addColorStop(0, '#0d0f0b'); dg.addColorStop(0.22, '#24281f'); dg.addColorStop(0.5, '#2f3428'); dg.addColorStop(0.78, '#24281f'); dg.addColorStop(1, '#0d0f0b');
      x.fillStyle = dg; x.fillRect(dx + 1.5, wy, dw - 3, wh);
      let seed = (i + 1) * 9301 + v * 49297; for (let k = 0; k < 70; k++) { seed = (seed * 9301 + 49297) % 233280; const px = dx + 2 + (seed / 233280) * (dw - 4); seed = (seed * 9301 + 49297) % 233280; const py = wy + (seed / 233280) * wh; x.fillStyle = `rgba(${k % 2 ? '255,245,220' : '0,0,0'},0.06)`; x.fillRect(px, py, 1.2, 1.2); }
      x.font = `600 ${Math.round(wh * 0.66)}px "Barlow Semi Condensed", "Arial Narrow", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillText(s[i], dx + dw / 2 + 1, wy + wh / 2 + 3);
      x.fillStyle = i < n - String(Math.round(v)).length ? 'rgba(214,204,178,0.45)' : '#ddd3b8'; x.fillText(s[i], dx + dw / 2, wy + wh / 2 + 2); }
    const gl = x.createLinearGradient(0, wy, 0, wy + wh); gl.addColorStop(0, 'rgba(255,250,235,0.10)'); gl.addColorStop(0.18, 'rgba(255,250,235,0)'); x.fillStyle = gl; x.fillRect(wx, wy, ww, wh); // the glass
  }
  // (7.3.0, owner) the depth scale: an engraved steel strip with ticks and numbers from 0 to the trap's rating, and a bone
  // pointer at the depth chosen (the slider, unseen, lies over it and is what is dragged)
  tsScale(v, lo, hi) {
    const c = $('ts-scalec'); if (!c) return; const x = c.getContext('2d'), W = c.width, H = c.height; x.clearRect(0, 0, W, H);
    const L = 30, Rr = W - 30, y0 = 26, y1 = 60, pos = (d) => L + (Rr - L) * (d - 0) / Math.max(1, hi);
    // the strip: dull steel, a little lighter than the plate, machined with fine lengthwise lines, its edges bevelled
    let g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#8a8c80'); g.addColorStop(0.15, '#6c6f62'); g.addColorStop(0.85, '#55584c'); g.addColorStop(1, '#2c2e26');
    x.fillStyle = g; x.fillRect(L - 10, y0, Rr - L + 20, y1 - y0);
    for (let i = 0; i < 28; i++) { const yy = y0 + 2 + i; x.fillStyle = `rgba(${i % 3 ? '0,0,0' : '255,250,235'},${(0.04 + (i * 37 % 7) / 140).toFixed(3)})`; x.fillRect(L - 10, yy, Rr - L + 20, 1); }
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(L - 10, y1, Rr - L + 20, 2); x.fillStyle = 'rgba(230,226,205,0.25)'; x.fillRect(L - 10, y0, Rr - L + 20, 1);
    // ticks: a long one at each number, short ones between; numbers stamped below in the game's lettering
    const step = [5, 10, 25, 50, 100, 250, 500].find((q) => hi / q <= 8) || 500, minor = step / 5;
    x.font = '600 22px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top';
    for (let d = 0; d <= hi + 1e-6; d += minor) { const px = Math.round(pos(d)) + 0.5, big = Math.abs(d / step - Math.round(d / step)) < 1e-6;
      x.strokeStyle = 'rgba(16,14,10,0.85)'; x.lineWidth = big ? 2.5 : 1.4; x.beginPath(); x.moveTo(px, y0 + 3); x.lineTo(px, y0 + (big ? 20 : 11)); x.stroke();
      x.strokeStyle = 'rgba(235,230,210,0.22)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px + 1.5, y0 + 3); x.lineTo(px + 1.5, y0 + (big ? 20 : 11)); x.stroke();
      if (big) { x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText(String(d), px + 1, y1 + 8); x.fillStyle = '#d8ceb2'; x.fillText(String(d), px, y1 + 7); } }
    // the pointer: a bone wedge riding the strip, shaded, with a dark notch at its tip
    const px = pos(Math.max(lo, Math.min(hi, v)));
    x.save(); x.translate(px, 0); x.scale(1.45, 1.45); x.translate(0, -3);
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.moveTo(-11, 6); x.lineTo(13, 6); x.lineTo(13, 22); x.lineTo(2, 36); x.lineTo(-9, 22); x.closePath(); x.fill();
    const pg = x.createLinearGradient(-12, 0, 12, 0); pg.addColorStop(0, '#efe7cf'); pg.addColorStop(0.55, '#d4c9a8'); pg.addColorStop(1, '#9e9478');
    x.fillStyle = pg; x.beginPath(); x.moveTo(-12, 3); x.lineTo(12, 3); x.lineTo(12, 19); x.lineTo(0, 33); x.lineTo(-12, 19); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(40,34,22,0.8)'; x.lineWidth = 1.5; x.stroke();
    x.strokeStyle = 'rgba(60,50,32,0.55)'; x.lineWidth = 1; for (const k of [-5, 0, 5]) { x.beginPath(); x.moveTo(k, 7); x.lineTo(k, 15); x.stroke(); } // grip lines
    x.restore();
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
      b.textContent = TRAPS[k].name; /* (7.3.0) one of each */ b.disabled = free <= 0; b.classList.toggle('on', k === this.ts.type);
      b.addEventListener('click', () => { this.ts.type = k; this.tsRender(); });
      types.append(b);
    }
    // the meter can go to the trap's rating; past the bottom it simply means: on the bottom
    const top = Math.min(T.maxDepth, Math.max(fl, 2));
    this.ts.depth = Math.max(2, Math.min(Math.round(this.ts.depth), T.maxDepth));
    $('ts-slider').max = T.maxDepth; $('ts-slider').value = this.ts.depth;
    $('ts-depth').textContent = this.ts.depth; this.tsDrums(this.ts.depth); this.tsScale(this.ts.depth, 2, T.maxDepth);
    // the depth of the bottom is not told: only that the line has reached it, once it has
    $('ts-bottom').textContent = `All the way (${T.maxDepth} m)`;
    $('ts-info').textContent = `This trap works for ${({ 300: '5 minutes', 1800: '30 minutes', 14400: '4 hours' })[T.dur] || timeLeftText(T.dur)}. Up to ${T.count} animals.`; // (owner) said plainly
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
  // (6.5.4) at Dave's door: a box with his words typed out and two choices, Shop and Leave. The first time it is his
  // hello; after that a short word. Earl never speaks: his side is only the choice. Shop opens Dave's site
  daveTalk() {
    let el = document.getElementById('davetalk');
    if (!el) { el = document.createElement('section'); el.id = 'davetalk'; el.hidden = true; el.innerHTML = '<div class="dt-box"><b class="dt-name">Dave</b><p class="dt-line"></p><div class="dt-acts"><button class="dt-cont">Continue ›</button><button class="dt-shop">Shop</button><button class="dt-leave">Not now</button></div></div>'; document.body.appendChild(el);
      { const bx = el.querySelector('.dt-box'), im = new Image(); im.onload = () => { const P = daveTalkPlate(1640, 700, im); bx.classList.add('painted'); bx.style.setProperty('--dt-plate', `url(${P.url})`); bx.style.setProperty('--dt-left', (P.textLeft * 100).toFixed(1) + '%'); bx.style.setProperty('--dt-top', (P.top * 100).toFixed(1) + '%'); }; im.src = davePortrait(); } // (7.0.10) the old Dave, baked into the card with the box
      el.querySelector('.dt-shop').addEventListener('click', () => { el.hidden = true; clearInterval(this.dtT); clearTimeout(this.dtN); this.toggleDave(true); });
      el.querySelector('.dt-leave').addEventListener('click', () => { el.hidden = true; clearInterval(this.dtT); clearTimeout(this.dtN); });
      el.addEventListener('click', (ev) => { if (ev.target === el) { el.hidden = true; clearInterval(this.dtT); } }); }
    // (7.1.9) the first meeting in two parts: the first with Continue (or on by itself after a few seconds), the last
    // with Shop; every later visit one short line with Shop and Not now. Shop works at once, even mid-typing
    let g0 = this.dave.greeting(); const first = g0.endsWith('#first'); if (first) g0 = g0.slice(0, -6);
    const parts = g0.split('|'), p = el.querySelector('.dt-line'); el.hidden = false; p.classList.remove('long');
    const cont = el.querySelector('.dt-cont'), shop = el.querySelector('.dt-shop'), leave = el.querySelector('.dt-leave');
    let k = 0, i = 0, line = parts[0]; clearInterval(this.dtT); clearTimeout(this.dtN);
    const buttons = () => { const last = k >= parts.length - 1; cont.hidden = last; shop.hidden = !last; leave.hidden = first || !last; };
    // (7.2.0) each letter fades in after the one before (a span per letter), never popping in
    const lay = () => { p.innerHTML = line.split('').map((c) => `<span class="ch">${c === ' ' ? ' ' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(''); return p.querySelectorAll('.ch'); };
    const shown = () => i >= line.length;
    const type = () => { clearInterval(this.dtT); i = 0; p.style.opacity = 1; buttons(); const L = lay(); this.dtT = setInterval(() => { for (let n = 0; n < 2 && i < L.length; n++) L[i++].classList.add('on'); if (i >= L.length) { clearInterval(this.dtT); if (k < parts.length - 1) this.dtN = setTimeout(next, 4000); } }, 30); };
    const next = () => { clearTimeout(this.dtN); if (k >= parts.length - 1) return; k++; line = parts[k]; p.style.transition = 'opacity 0.25s'; p.style.opacity = 0; setTimeout(type, 260); };
    this.dtNext = () => { if (!shown()) { clearInterval(this.dtT); p.querySelectorAll('.ch').forEach((c) => c.classList.add('on')); i = line.length; if (k < parts.length - 1) this.dtN = setTimeout(next, 4000); } else next(); };
    type();
    el.querySelector('.dt-box').onclick = (ev) => { if (ev.target.closest('button')) return; this.dtNext(); };
  }
  daveTalkOpen() { const el = document.getElementById('davetalk'); return !!el && !el.hidden; }
  toggleDave(force) {
    const el = $('dave'), open = force === undefined ? el.hidden : force;
    if (!open && this.catalogOpen && this.catalogOpen()) this.toggleCatalog(false); // (5.10.1) his shop is the catalogue in his colours: closing Dave closes it
    if (open === !el.hidden) return;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.toggleCave(false); this.dave.open(); el.hidden = true; this.toggleCatalog(true, 'dave'); } // (3.0.0) his own computer, not the chalkboard
  }
  toggleCave(force) {
    const el = $('cave');
    const open = force === undefined ? el.hidden : force;
    el.hidden = !open;
    if (open) { this.toggleJournal(false); this.toggleWorkshop(false); this.caveSel.clear(); this.caveDress(); this.renderCave(); }
    { const ch = document.getElementById('cave-chrome'); if (ch) ch.hidden = !open; }
  }
  // (6.0.13) the cave's dressing, once: the shop screens' wallet and close, and the slab of black bone it is cut into
  caveDress() {
    const el = $('cave'); if (el.dataset.dressed) return; el.dataset.dressed = '1';
    const ch = document.createElement('div'); ch.id = 'cave-chrome'; ch.hidden = true; document.body.appendChild(ch); // (6.0.13) its own layer at the screen's corners
    const w = document.createElement('div'); w.className = 'cat-wallet'; w.innerHTML = '<canvas width="96" height="76"></canvas><b></b>'; ch.appendChild(w);
    const c0 = w.querySelector('canvas').getContext('2d'); c0.setTransform(2, 0, 0, 2, 0, 0); drawCash(c0, 24, 19, 30);
    const x2 = document.createElement('button'); x2.className = 'cat-x'; x2.setAttribute('aria-label', 'Close'); x2.addEventListener('click', () => this.toggleCave(false)); ch.appendChild(x2);
    const c = document.createElement('canvas'); c.width = 900; c.height = 560; const x = c.getContext('2d'); let sd = 4711; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const g = x.createLinearGradient(0, 0, 900, 560); g.addColorStop(0, '#3a3228'); g.addColorStop(0.5, '#28221b'); g.addColorStop(1, '#1a1612'); x.fillStyle = g; x.fillRect(0, 0, 900, 560);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '210,196,160'},${(r() * 0.07).toFixed(3)})`; x.fillRect(r() * 900, r() * 560, 1 + r() * 2, 1 + r() * 2); } // grain
    x.lineCap = 'round'; for (let i = 0; i < 260; i++) { const y0 = r() * 560, x0 = r() * 900, l = 30 + r() * 160; x.strokeStyle = `rgba(${r() < 0.5 ? '0,0,0' : '210,194,154'},${(0.06 + r() * 0.1).toFixed(3)})`; x.lineWidth = 0.6 + r() * 1.8; x.beginPath(); x.moveTo(x0, y0); x.bezierCurveTo(x0 + l * 0.3, y0 + (r() - 0.5) * 8, x0 + l * 0.7, y0 + (r() - 0.5) * 8, x0 + l, y0 + (r() - 0.5) * 10); x.stroke(); } // the bone's long grain
    for (let i = 0; i < 70; i++) { const px = r() * 900, py = r() * 560, rr = 1 + r() * 4; x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(px, py, rr * 1.4, rr, r() * 3, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(210,196,160,0.1)'; x.beginPath(); x.ellipse(px - 0.6, py - 0.8, rr * 1.2, rr * 0.7, 0, Math.PI, Math.PI * 2); x.fill(); } // pores
    for (let i = 0; i < 5; i++) { let px = r() * 900, py = r() < 0.5 ? 0 : 560; x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 9; k++) { px += (r() - 0.5) * 40; py += (py < 280 ? 1 : -1) * (10 + r() * 18); x.lineTo(px, py); } x.stroke(); } // cracks from the edges
    const v = x.createRadialGradient(450, 280, 120, 450, 280, 560); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = v; x.fillRect(0, 0, 900, 560); // darker at the worn edges
    el.querySelector('.shop-main').style.setProperty('--slab', `url(${c.toDataURL('image/jpeg', 0.85)})`);
  }
  renderCave() {
    const P = this.h.getProfile(), off = this.h.onCaveOffer();
    if (!P || !off) return;
    this.renderCounter($('cave-cash'), moneyExact(P.cash));
    { const wb = document.querySelector('#cave-chrome .cat-wallet b'); if (wb) wb.textContent = moneyExact(P.cash); } // (6.0.13) the screen's wallet
    $('cave-coins').innerHTML = `${COIN}${P.coins || 0}`;
    $('cave-sub').textContent = `A giant anglerfish, older than the boat, this dive it craves: ${off.craving.name.toLowerCase()}`;
    let html = `<nav class="cave-tabs"><button data-cave="tab:trade" class="${this.caveTab === 'trade' ? 'on' : ''}">Trade</button><button data-cave="tab:wares" class="${this.caveTab === 'wares' ? 'on' : ''}">The old one's wares</button><button data-cave="tab:chests" class="${this.caveTab === 'chests' ? 'on' : ''}">What the deep took</button></nav>`;
    if (this.caveTab === 'chests') {
      html += '<p class="shop-note">Bundles left in the silt of the cave. The Reliquary is the only place the oldest things come from.</p>';
      html += chestsOf('oldone').map((c) => `<div class="ch-row"><img src="${chestPicture(c.look, 192, 150)}" alt=""><div class="ch-txt"><b style="color:${RARITY[c.tier] ? RARITY[c.tier].col : 'inherit'}">${c.name}</b><span>${c.line}</span><small class="ch-odds">${oddsText(c.odds)}</small></div><button data-cave="chest:${c.key}" ${P.cash + 1e-6 < c.price ? 'disabled' : ''}>Open, ${money(c.price, false)}</button></div>`).join('');
      $('cave-body').innerHTML = html;
      return;
    }
    if (this.caveTab === 'wares') {
      for (const [k, W] of Object.entries(WARES)) {
        const g = this.h.getGame();
        const have = k === 'relic' ? (P.relics || 0) : k === 'eye' ? (P.eye ? 1 : 0) : (g.blessed ? 1 : 0);
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
      html += '<p class="shop-note">Once a dive the old one takes fish for old coins: 30 % under the market, but three times the market for what it craves. Choose what to give it.</p>';
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
    startTitleArt(document.querySelector('#title .t-plate h1')); // (7.0.0)
    this.closeAll(); this.setPaused(false); setTimeout(() => this.fitTitle(), 0); requestAnimationFrame(() => this.fitTitle());
    if (!this.fitBound) { this.fitBound = true; window.addEventListener('resize', () => this.fitTitle()); document.fonts && document.fonts.ready.then(() => this.fitTitle()); }
    $('menu').classList.add('gone');
    const ago = (ms) => { const m = (Date.now() - ms) / 60000; return m < 2 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
    // (5.2) the save select: three large diver panels across the screen, each with what that diver has done (cash,
    // how deep, how much of the sea is in the book), the one played last ringed; an empty one is a big + New diver
    let html = '';
    const last0 = lastSlot();
    for (let n = 1; n <= SLOTS; n++) {
      // (6.6.0) one clear structure: the slot's number small at the top, the diver's name large in the middle and when
      // it was played, then three equal figures (cash, deepest, species), then Continue with Delete beside it. An empty
      // one: a stamped + and New diver, centred
      const r = readSlot(n), num = `<span class="sv-no">No. ${n}</span>`;
      if (r.state === 'ok') {
        const p = r.profile, deep = p.deepest || 0, found = (p.journal || []).length;
        html += `<div class="slot tag sv${n === last0 ? ' last' : ''}" data-n="${n}">${num}
          <div class="sv-head"><b class="sv-name">${(p.name || 'Diver').replace(/</g, '&lt;')}</b><span class="sv-when">${r.saved ? 'Played ' + ago(r.saved) : 'New'}</span></div>
          <dl class="sv-stats"><div><dt>Cash</dt><dd>${moneyExact(p.cash, false)}</dd></div><div><dt>Deepest</dt><dd>${deep.toLocaleString()} m</dd></div><div><dt>Species</dt><dd>${found}</dd></div></dl>
          <div class="sv-foot"><em class="sv-go">${n === last0 ? 'Continue' : 'Dive'}</em><button class="del sv-del" aria-label="Delete">Delete</button></div></div>`;
      } else if (r.state === 'damaged') {
        html += `<div class="slot tag sv damaged" data-n="${n}">${num}<div class="sv-head"><b class="sv-name">Damaged</b><span class="sv-when">Could not be read</span></div><div class="sv-foot"><button class="del sv-del" aria-label="Delete">Delete</button></div></div>`;
      } else html += `<div class="slot tag sv empty" data-n="${n}">${num}<div class="sv-new"><i class="sv-plus">+</i><b>New diver</b></div></div>`;
    }
    $('slots').innerHTML = html;
    if (!document.documentElement.style.getPropertyValue('--tagimg')) { // (6.0.14) the dive tags, painted once: stamped aluminium, worn and scratched, a hole with its steel ring
      const mk = (empty) => { const c = document.createElement('canvas'); c.width = 280; c.height = 380; const x = c.getContext('2d'); let sd = empty ? 99 : 41; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
        x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.roundRect(12, 16, 260, 360, 34); x.fill();
        const g = x.createLinearGradient(0, 0, 280, 380); g.addColorStop(0, empty ? '#8a8c84' : '#c8ccc4'); g.addColorStop(0.45, empty ? '#6e706a' : '#a2a69e'); g.addColorStop(1, empty ? '#545650' : '#7a7e78');
        x.fillStyle = g; x.beginPath(); x.roundRect(6, 6, 260, 360, 34); x.fill(); x.save(); x.clip();
        for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '20,22,20'},${(r() * 0.12).toFixed(3)})`; x.lineWidth = 0.6; const y0 = r() * 380, x0 = r() * 280, l = 6 + r() * 40, a = (r() - 0.5) * 0.4; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke(); } // brushed and scratched
        for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(30,30,26,0.12)'; x.beginPath(); x.ellipse(r() * 280, r() * 380, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, Math.PI * 2); x.fill(); } // dull patches
        x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2; x.beginPath(); x.roundRect(14, 14, 244, 344, 28); x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.beginPath(); x.roundRect(17, 17, 244, 344, 28); x.stroke(); // its pressed rim
        x.restore();
        x.fillStyle = '#2a2c28'; x.beginPath(); x.arc(226, 46, 14, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#d8dad4'; x.lineWidth = 4; x.beginPath(); x.arc(226, 46, 17, 0, Math.PI * 2); x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1.5; x.beginPath(); x.arc(226, 46, 19, 0.2, 2); x.stroke(); // the hole and its ring
        return c.toDataURL('image/png'); }; // with its transparent corners
      document.documentElement.style.setProperty('--tagimg', `url(${mk(false)})`); document.documentElement.style.setProperty('--tagimg-e', `url(${mk(true)})`); }
    const last = lastSlot();
    $('continue').hidden = !(last && readSlot(last).state === 'ok');
    $('title').classList.remove('gone');
    // (5.2) first the name and "press any key"; any key or a tap brings up the divers
    const T = $('title'); T.classList.add('attract'); T.classList.remove('select');
    T.querySelector('.t-press span').textContent = 'Tap to start'; // (7.3.5, 7.4.13) touch only: no keys to press
    if (!this.titleWired) {
      this.titleWired = true;
      // (6.4.2) the tap that brings up the divers must not also choose one: its click lands on the slot that has just
      // appeared under the finger, and the game went straight into a dive. For a moment after, slot taps are ignored
      const go = () => { if (T.classList.contains('gone') || !T.classList.contains('attract')) return; T.classList.remove('attract'); T.classList.add('select'); T.__shownAt = performance.now(); };
      T.addEventListener('click', (ev) => { if (ev.target.closest('.t-select') && performance.now() - (T.__shownAt || 0) < 500) { ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
      T.addEventListener('pointerdown', (ev) => { if (ev.target.closest('.t-gear, .t-select, #settings')) return; go(); });
      T.querySelector('.t-back').addEventListener('click', () => { T.classList.add('attract'); T.classList.remove('select'); });
    }
  }
  titleOpen() { return !$('title').classList.contains('gone'); }
  // (4.16.3) loading during play (a dive starting, after a death, back to the title): the simple porthole card;
  // the painted loading screen is only for opening the game
  showLoading(on) { const el = $('loading'); el.hidden = !on; if (on) { this.buildGauge(); this.setLoading(0, 'Charting the sea'); } }
  // (7.0.2) the gauge painted once (gauge_art.js): face, needle, glass; the needle turned by the real progress
  buildGauge() {
    const ph = $('loading').querySelector('.porthole'); if (!ph || ph.dataset.painted) return; ph.dataset.painted = '1';
    const px = 300; ph.innerHTML = '';
    for (const [cls, fn] of [['g-face', gaugeFace], ['g-needle', gaugeNeedle], ['g-glass', gaugeGlass]]) { const c = fn(px); c.className = cls; ph.appendChild(c); }
  }
  setLoading(k, label) { const el = $('loading'), sp = el.querySelector(':scope > span'); if (sp && label && sp.textContent !== label) sp.textContent = label;
    const n = el.querySelector('.g-needle'); if (n && typeof k === 'number') n.style.setProperty('--deg', (225 + 270 * Math.max(0, Math.min(1, k))).toFixed(1) + 'deg'); }
  // (4.17.1) on a short screen, the title menu is scaled down to fit its height (measured, so nothing is cut off)
  fitTitle() {
    return; // (5.2) the title is laid out for the whole screen now; nothing to scale
    const t = $('title'), pnl = t && t.querySelector('.title-panel'); if (!pnl) return;
    pnl.style.zoom = 1; const h = pnl.scrollHeight, room = window.innerHeight - 20;
    pnl.style.zoom = h > room ? Math.max(0.5, room / h).toFixed(3) : '';
  }
  // (6.8.1) Sail here: a short loading screen over everything (the buoy's number, the place, a line that fills), the
  // move made under it, then it clears
  sailScreen(pt, done) {
    let el = document.getElementById('sailing'); if (!el) { el = document.createElement('div'); el.id = 'sailing'; document.body.appendChild(el); }
    el.innerHTML = `<div class="sl-in"><small>${pt.no}</small><b>${pt.name}</b><i><s></s></i></div>`; el.hidden = false; el.classList.remove('on', 'off');
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { try { done(); } catch (e) { console.error(e); } }, 700);
    setTimeout(() => { el.classList.add('off'); setTimeout(() => { el.hidden = true; el.classList.remove('on', 'off'); }, 450); }, 1900);
  }
  showGame() {
    $('title').classList.add('gone'); $('title').classList.remove('select', 'attract'); // (5.3.6) the divers' tags must not stay live (invisible) over the game
    $('menu').classList.add('gone');
    $('notes').value = '';
    this.journalDirty = true;
  }
  showMenu(last) {
    setTimeout(() => this.fitTitle(), 0);
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
    let html = `<div class="save-line"><b>${moneyExact(p.cash, false)}</b><span>${p.runs || 1} dive${(p.runs || 1) > 1 ? 's' : ''}</span><span>deepest ${p.deepest || 0} m${best > (p.deepest || 0) ? ` (ever ${best} m)` : ''}</span><span>${(p.journal || []).length} species recorded</span>${p.aquarium && Object.keys(p.aquarium.display || {}).length ? `<span>aquarium: ${completion(p).species} species, ${completion(p).rare} rare</span>` : ''}</div>`;
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
    if (open) { const P1 = this.h.getProfile && this.h.getProfile(), g1 = this.h.getGame && this.h.getGame(); if (P1 && g1 && g1.journal) P1.jSeenN = g1.journal.size; } // (5.9.6) looked at: the "!" goes
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
    // (5.16.3) while the sell list is open the prices are kept live (an animal's worth falls as it weakens), so what
    // Sell all shows is what it pays; redrawn once a second, never while a finger is down on it
    clearInterval(this.sellTick); if (open) this.sellTick = setInterval(() => { if ($('workshop').hidden) { clearInterval(this.sellTick); return; } if (this.shopTab === 'sell' && !this.shopPointerDown) this.renderWorkshop(); }, 1000);
    if (!this.sellPtrWired) { this.sellPtrWired = true; el.addEventListener('pointerdown', () => { this.shopPointerDown = true; }); window.addEventListener('pointerup', () => { this.shopPointerDown = false; }); }
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

  // (5.1) the journal is a field notebook: the left page a grid of the animals found, each drawn with its name under
  // it (newest first); tap one and the right page turns to its entry (a large drawing, what it is, where it lives,
  // its rare forms). With nothing chosen the right page is the notes
  renderJournal() {
    if ((this.tab || 'species') !== 'species') return this.renderJournalTab(this.tab);
    const g = this.h.getGame();
    this.journalCount(g);
    const list = $('journal-list');
    if (g.journal.size === 0) {
      list.innerHTML = `<p class="empty">Nothing in the book yet.<br>${'Swim close to an animal and tap it to observe it.'}</p><div class="jgrid">${'<div class="jcell blank"><span>?</span></div>'.repeat(6)}</div>`;
      this.journalDetail(null); return;
    }
    // (6.9.1) by depth: the shallowest first, down the page as down the sea (the depth he met it at, then its usual depth);
    // one met in the last hour and not yet opened carries a small New tag
    const dOf = (id, info) => (info && info.depth != null ? info.depth : usualDepth(SPECIES_BY_ID[id])) || 0;
    const entries = [...g.journal.entries()].sort((a, b) => (dOf(a[0], a[1]) - dOf(b[0], b[1])) || (usualDepth(SPECIES_BY_ID[a[0]]) - usualDepth(SPECIES_BY_ID[b[0]])) || SPECIES_BY_ID[a[0]].name.localeCompare(SPECIES_BY_ID[b[0]].name));
    const isNew = (info) => info && !info.seen && info.at && Date.now() - info.at < 3600e3;
    // (5.7.4) a field notebook: each animal sketched in, its name and the depth he met it in pencil, its rarity as a
    // small ink stamp, a tick if one has been caught; then a few empty outlines still to fill
    const P0 = this.h.getProfile && this.h.getProfile(), caught = new Set((P0 && P0.caught) || []);
    const blanks = Math.max(3, (3 - (entries.length % 3)) % 3 + 3);
    list.innerHTML = `<div class="jgrid">${entries.map(([id, info]) => { const sp = SPECIES_BY_ID[id], R = rarityOf(sp), c = rarityCol(sp);
      return `<button class="jcell${this.jSel === id ? ' on' : ''}" data-js="${id}" title="${sp.name.replace(/"/g, '')}" style="--rot:${((id * 37) % 7 - 3) * 0.5}deg"><img src="${this.allFishPic(sp, true)}" alt=""><b>${sp.name}</b><small class="jdep">${info && info.depth != null ? `${info.depth} m` : ''}</small>${R && !R.hidden && R.id !== 'common' ? `<em class="jstamp" style="--sc:${c}">${R.name}</em>` : ''}${caught.has(id) ? '<u class="jtick" title="Caught">✓</u>' : ''}${isNew(info) ? '<span class="jnew">New</span>' : ''}</button>`; }).join('')}${'<div class="jcell blank"><span>?</span></div>'.repeat(blanks)}</div>`;
    list.querySelectorAll('[data-js]').forEach((b) => b.addEventListener('click', () => { const id = +b.dataset.js; this.jSel = this.jSel === id ? null : id; this.h.journalSeen && this.h.journalSeen(id); this.renderJournal(); }));
    // (5.9.2) no notes page: the right page shows the animal chosen, or else the one met most recently
    this.journalDetail(this.jSel && g.journal.has(this.jSel) ? this.jSel : entries[0][0]);
  }
  // the right page: one animal's entry, or the notes
  journalDetail(id) {
    const det = $('journal-detail'), notes = $('journal-notes'), title = $('jr-title'); if (!det) return;
    if (id == null) { // (5.10.1) nothing met yet: the right page says how a page gets filled, not a blank "Notes"
      notes.hidden = true; det.hidden = false; title.textContent = 'The first page';
      det.innerHTML = `<p class="jd-empty">Every animal you observe is drawn into this book: where it lives, how big it grows, the depth you first saw it at.<br><br>${'Swim close to one and tap it to observe it.'}</p>`; return; }
    const g = this.h.getGame(), sp = SPECIES_BY_ID[id], info = g.journal.get(id) || {}, R = rarityOf(sp), hab = usualDepth(sp);
    if (!this.fitPics) this.fitPics = new Map(); if (!this.fitPics.has(sp.id)) this.fitPics.set(sp.id, fittedIcon(sp, 300, 180).toDataURL());
    const ph = (g.photos || []).filter((p) => p.id === id && p.img).sort((a, b) => b.q - a.q)[0];
    title.textContent = sp.name; notes.hidden = true; det.hidden = false;
    det.innerHTML = `<div class="jd-pic${ph ? '' : ' jd-tank'}"${ph ? '' : ` style="background-image:url(${tankPicture(habCls(sp), 480, 260, tankZoom(sp.len || 0.5), isSessile(sp))}) !important"`}>${ph ? `<img class="jd-photo" src="${ph.img}" alt="">` : `<img src="${this.fitPics.get(sp.id)}" alt="">`}</div>
      <p class="jd-sci">${sp.species ? sp.species + ', ' : ''}<i>${sp.sci || ''}</i>${R && !R.hidden ? `, <span style="color:${R.col}">${R.name.toLowerCase()}</span>` : ''}</p>
      <p class="jd-desc">${sp.desc}</p>
      <dl class="jd-rows"><div><dt>Lives at</dt><dd>${hab[0].toLocaleString()} to ${hab[1].toLocaleString()} m</dd></div><div><dt>Grows to</dt><dd>${sp.size}</dd></div><div><dt>First seen</dt><dd>at ${info.depth ?? '?'} m</dd></div></dl>
      ${this.variantRow(sp)}<button class="jd-back">Back to the notes</button>`;
    det.querySelector('.jd-back').addEventListener('click', () => { this.jSel = null; this.renderJournal(); });
  }
  // (4.12.4) every animal in the sea, from the surface down: the ones found in their colours and names, the rest
  // a black shape and ???. Pictures are drawn as they scroll into view (there are hundreds).
  renderAllFish(g, list) {
    this.journalCount(g);
    const all = SPECIES.filter((sp) => !sp.giant).slice().sort((a, b) => usualDepth(a)[0] - usualDepth(b)[0] || usualDepth(a)[1] - usualDepth(b)[1]);
    list.innerHTML = `<div class="allfish">${all.map((sp) => { const seen = g.journal.has(sp.id), c = seen ? rarityCol(sp) : null;
      return `<div class="af${seen ? ' seen' : ''}" title="${seen ? sp.name.replace(/"/g, '') : 'Not yet found'}"><img data-af="${sp.id}" alt=""><b${c && seen ? ` style="color:${c}"` : ''}>${seen ? sp.name : ''}</b><small>${usualDepth(sp)[0].toLocaleString()}–${usualDepth(sp)[1].toLocaleString()} m</small></div>`; }).join('')}</div>`;
    if (this.afObs) this.afObs.disconnect();
    this.afObs = new IntersectionObserver((ents) => {
      for (const en of ents) { if (!en.isIntersecting) continue; const img = en.target; this.afObs.unobserve(img); const sp = SPECIES_BY_ID[+img.dataset.af]; if (sp) img.src = this.allFishPic(sp, g.journal.has(sp.id)); }
    }, { root: list, rootMargin: '200px' });
    list.querySelectorAll('img[data-af]').forEach((im) => this.afObs.observe(im));
    list.querySelectorAll('.af.seen').forEach((el) => el.addEventListener('click', () => { const id = +el.querySelector('img').dataset.af; this.jSel = id; this.journalDetail(id); }));
    this.journalDetail(this.jSel && g.journal.has(this.jSel) ? this.jSel : null);
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
    return ''; // (6.5.0) rare forms are gone: no row of their names under a journal page
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
        row('Cash', moneyExact(this.h.getProfile().cash), 'safe at the boat') +
        row('Deep sapphires found', `${g.sapphires}`, 'this dive') +
        row('Deepest so far', `${Math.round(e.maxDepth)} m`) +
        row('Condition', lvl) +
        row('The thing in the deep', ent.marked ? 'it has marked me' : 'unaware of me', ent.marked ? 'turn every light off: it may lose you' : '' /* (5.16.0) going dark is the way out now */) +
        row('Submersible', sub.imploded ? 'lost' : `rated ${sub.rated} m`, sub.imploded ? 'a replacement can be bought at the boat' : `hull ${Math.round(sub.hull * 100)} %`) +
        row('Carrying', items) +
        row('Glow sticks', String(g.items.necklace));
    } else {
      this.journalCount(g);
      // (5.10.10) the desktop keys page is gone: a phone game has no keys. Any other tab shows the status page
      return this.renderJournalTab('status');
    }
  }

  // ---------------- the boat ----------------
  renderWorkshop() {
    const g = this.h.getGame(), P = this.h.getProfile(), sub = g.sub;
    if (!P) return;
    marketTick(P);
    this.renderCounter($('shop-cash'), moneyExact(P.cash));
    $('shop-coins').innerHTML = P.coins ? `${COIN}${P.coins}` : '';
    {
      const M = SUB_MARKS[markOf(statValue(P, 'depth'))];
      $('shop-sub').innerHTML = sub.imploded ? 'No submersible' : `${M.named ? `<b>${esc(P.subName || 'EARL')}</b>, ` : ''}${M.name}, rated to ${sub.rated} m, hull at ${Math.round(sub.hull * 100)}%${M.named ? '<button class="rename" data-rename="1">rename</button>' : ''}`;
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
        <div class="card-txt"><h3>${name}<button class="info" data-info="card:${arg}" title="More about it" aria-label="More information">i</button></h3>${stat ? `<div class="card-stat">${stat}</div>` : ''}${bullets(specs)}<p class="story">${desc}</p>${owned}</div>
        <button data-act="${act}" data-arg="${arg}" ${price !== null && !can(price) ? 'disabled' : ''}>${label}${price !== null ? `<span>${money(price, false)}</span>` : ''}</button>
      </div>`;
    
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
        if (!this.fitPics) this.fitPics = new Map(); if (!this.fitPics.has(spc.id)) this.fitPics.set(spc.id, fittedIcon(spc, 300, 180).toDataURL());
        const worst = (L) => L.reduce((a, x) => Math.min(a, x.cond), 1);
        const tile = (L) => ({ pic: this.fitPics.get(spc.id), hab: habCls(spc) /* (6.5.0) its own water behind it, as in the bag */, name: spc.name, n: L.length, cond: worst(L) < 0.7 ? conditionName(worst(L)) : '', rc: rarityCol(spc) });
        if (rest.length) items.push({ key: 'sp:' + gk, value: rest.reduce((a, x) => a + specimenValue(x), 0) * pay, keep: keepBtn, html: name(rest), dk, canKeep, ...tile(rest) });
        if (keptL.length) items.push({ key: 'kept:' + dk, value: keptL.reduce((a, x) => a + specimenValue(x), 0) * pay, kept: true, html: name(keptL), dk, ...tile(keptL),
          keep: `<button class="sell-keep on" data-sell="unkeep" data-arg="${dk}" title="Sell it after all">Keep</button>` });
      }
      const tg = new Map();
      for (const t of g.tags) { if (!tg.has(t.key)) tg.set(t.key, []); tg.get(t.key).push(t); }
      for (const [k, list] of tg) items.push({ key: 'tag:' + k, value: list[0].value * list.length * statValue(P, 'payFish'), html: `<span class="sell-name">Tag data: ${list[0].name}</span>` + (list.length > 1 ? `<span class="sell-n">×${list.length}</span>` : '') });
      for (const ph of g.photos) items.push({ key: 'photo:' + ph.key, photo: ph.img, name: ph.name, n: 1, cond: gradeOf(ph).toLowerCase(), value: ph.value * statValue(P, 'payFish'), html: `${ph.img ? `<img class="sell-photo" src="${ph.img}" alt="">` : ''}<span class="sell-name">Photo: ${ph.name}${ph.grade && ph.grade !== 'Good' ? ` <em class="cond">${ph.grade.toLowerCase()}</em>` : ''}</span>` });
      for (const [k, n] of Object.entries(g.inv)) if (n > 0 && GOODS[k] && k !== 'coral') items.push({ key: 'good:' + k, name: GOODS[k].name, n, value: GOODS[k].price * n * statValue(P, 'paySalvage'), html: `<span class="sell-name">${GOODS[k].name}</span>` + (n > 1 ? `<span class="sell-n">×${n}</span>` : '') });
      for (const k of [...pick]) if (!items.some((it) => it.key === k && !it.kept)) pick.delete(k);
      // (7.4.0, owner) each price board line carries the animal's picture in its own water, its name in its rarity's ink
      const boardPic = (r) => { const m = /^sp(\d+)/.exec(r.k || ''), spc = m && SPECIES_BY_ID[m[1]]; if (!spc) return null; if (!this.fitPics) this.fitPics = new Map(); if (!this.fitPics.has(spc.id)) this.fitPics.set(spc.id, fittedIcon(spc, 300, 180).toDataURL()); return { pic: this.fitPics.get(spc.id), hab: habCls(spc), rc: rarityCol(spc) }; };
      const board0 = P.board || [], lastSale = board0.length && Date.now() - board0[0].t < 15 * 60 * 1000 ? board0.filter((r) => board0[0].t - r.t < 4000) : [];
      if (!items.length && lastSale.length) { // (7.4.0, owner) just sold: what went, stamped Sold, and its total (it read "Nothing to sell")
        const tot = lastSale.reduce((a, r) => a + r.each * (r.n || 1), 0);
        html = `<div class="sold-last"><div class="sl-grid">${lastSale.map((r) => { const P2 = boardPic(r);
          return `<div class="sl-tile sold${P2 ? ' ' + P2.hab : ''}"><div class="sl-main"><span class="sl-pic">${P2 ? `<img src="${P2.pic}" alt="">` : '<i class="sl-good"></i>'}</span><b${P2 ? ` style="color:${P2.rc}"` : ''}>${r.label}</b>${(r.n || 1) > 1 ? `<em class="sl-n">×${r.n}</em>` : ''}<span class="sl-price">${money(r.each * (r.n || 1))}</span></div></div>`; }).join('')}</div><div class="sold-foot"><span class="sold-for">Sold for</span><b>${money(tot)}</b></div></div>`;
      } else if (!items.length) html = `<div class="sell-none"><img src="${pictureOf('bag', ITEMS.mesh || 'mesh', 220, 132, true)}" alt=""><b>Bag empty</b></div>`; // (7.0.0) centred in the panel, an empty catch bag above the line
      else {
        // (5.1) one grid of what he brought up, each thing a tile with its picture and price: tap a tile to sell it,
        // Sell all for the lot. A live animal has Keep in its corner (kept, it is held back for the aquarium)
        const total = items.reduce((a, it) => a + (it.kept ? 0 : it.value), 0);
        const tileH = (it) => `<div class="sl-tile${it.kept ? ' kept' : ''}${it.photo ? ' photo' : ''}${it.hab ? ' ' + it.hab : ''}">
          <button class="sl-main" ${it.kept ? 'disabled' : `data-act="sellone" data-arg="${it.key}"`} title="${it.kept ? 'Kept for the aquarium' : 'Sell it'}">
            <span class="sl-pic">${it.photo ? `<img src="${it.photo}" alt="">` : it.pic ? `<img src="${it.pic}" alt="">` : '<i class="sl-good"></i>'}</span>
            <b${it.rc ? ` style="color:${it.rc}"` : ''}>${it.name || ''}</b>${it.n > 1 ? `<em class="sl-n">×${it.n}</em>` : ''}${it.cond ? `<em class="sl-cond">${it.cond}</em>` : ''}
            <span class="sl-price">${it.kept ? 'Kept' : money(it.value)}</span></button>
          ${it.kept ? `<button class="sl-keep on" data-sell="unkeep" data-arg="${it.dk}">Keep</button>` : it.canKeep ? `<button class="sl-keep" data-sell="keep" data-arg="${it.dk}" title="Hold one back for the aquarium">Keep</button>` : ''}</div>`;
        html += `<button class="primary go" data-act="sellall" ${total > 0 ? '' : 'disabled'}>Sell all<span>${money(total)}</span></button>`;
        html += `<div class="sl-grid">${items.map(tileH).join('')}</div>`;
        if (!atBoat && g.subTank.length) html += `<p class="shop-note">${g.subTank.length} animal${g.subTank.length > 1 ? 's' : ''} in the sub's tank: bring the sub alongside to sell them.</p>`;
      }
      // the price board on the Margaret: chalked up after every sale, the newest first
      const board = P.board || [];
      void board; /* (7.4.27, owner) no price board: the receipt says what each sold for */
    } else if (tab === 'diver') {
      html += this.upgradeGroups(P, ['Diver'], icon, can);
      html += this.suitRows(P, can);
    } else if (tab === 'tools') {
      html += this.upgradeGroups(P, ['Net', 'Camera'], icon, can);
      html += '<div class="up-group"><h4>Traps</h4>';
      const tr = P.traps || {};
      TRAP_ORDER.forEach((k, i) => { if (TRAPS[k].shop === 'dave') return; // (7.3.0) the deep trap is Dave's
        const T = TRAPS[k], have = tr[k] || 0, full = have >= T.max;
        html += card(T.name, T.desc, `you own (${have}/${T.max})`, full ? null : T.price, 'buy', 'trap:' + k, full ? 'Full' : 'Buy', '', icon('trap', i), [
          ['depth', `down to ${T.maxDepth.toLocaleString()} m`, 'press'], ['catch', `${T.count} animals in ${timeLeftText(T.dur)}`], ['fish up to', `${T.maxLen} m long`],
          ['holds', `${T.holds}`], ['hauled', T.winch ? "by the boat's winch" : 'by hand', T.winch ? 'bad' : 'good']].concat(T.lure ? [['lure', 'lit: draws deep animals and it', 'bad']] : []));
      });
      html += '</div>';
    } else if (tab === 'sub') {
      // (4.14.2) one page: her (large) and her sheet; the refits with price tags; All submersibles shows the ones he
      // has had, his own and the next he can buy (or one dark card, to be discovered); click a sub for its own page
      const hl = Math.min(SUBS.length - 1, lv(P, 'depth')), S0 = SUBS[hl], cap = hullCap(P);
      const air = (s2) => `${Math.floor(s2 / 60)} min${s2 % 60 ? ` ${s2 % 60} s` : ''}`;
      const bank = (P.addons || {}).airBank ? 1.5 : 1; // (4.18.8) the spare air bank, on every sub
      const facts = (S, k) => [['Depth rating', `${S.rated.toLocaleString()} m`, S.rated], ['Cabin air', air(Math.round(S.o2 * bank)), S.o2 * bank], ['Top speed', `${(3.36 * S.speed).toFixed(1)} m/s`, S.speed], /* (7.4.0) no Dive speed row: a sub sinks at its own speed (7.3.9) */
        ['Open tank', `${S.tank} spaces`, S.tank]];
      const sheet = (S, k, cmp = null, stamp = '', big = false) => { const base = cmp ? facts(cmp, 1) : null;
        return `<div class="yd-sheet${big ? ' big' : ''}"><div class="ys-head"><span>Specification</span><span>No. ${k + 1}</span></div>${facts(S, k).map(([a, v, n], i) => { const d = base ? n - base[i][2] : 0;
          return `<div class="ys-row"><span>${a}</span><i></i><b>${v}${d > 0 ? '<em class="up">▲</em>' : d < 0 ? '<em class="down">▼</em>' : ''}</b></div>`; }).join('')}<p class="ys-note">The pressure chambers hold animals from as deep as the sub can dive.</p>${stamp ? `<div class="ys-stamp">${stamp}</div>` : ''}</div>`; };
      // (4.15.6) at a glance: each figure as a dial (how this sub sits between the first and the best), its icon
      // in the middle and the figure under it; a ▲/▼ against your sub
      
      
      
      
      
      
      // a depth ruler beside her picture: the zones, how deep she goes, and the animals that lie within reach (lit) or beyond it (dark)
      const RULER = [[49, 30], [171, 120], [98, 380], [104, 700], [107, 1000], [105, 1500], [100, 2200], [2146, 3000], [2110, 3800]];
      const ruler = (S) => { const Y = (dd) => (Math.sqrt(dd / 4500) * 100).toFixed(2) + '%';
        if (!this.rulerPics) this.rulerPics = new Map();
        const pic = (id) => { if (!this.rulerPics.has(id)) { const sp = SPECIES_BY_ID[id]; this.rulerPics.set(id, sp ? fittedIcon(sp, 120, 60).toDataURL() : ''); } return this.rulerPics.get(id); };
        return `<div class="yd-ruler" title="How deep it can go"><div class="ru-zones"><i style="top:0;height:${Y(200)}" class="z1"></i><i style="top:${Y(200)};height:calc(${Y(1000)} - ${Y(200)})" class="z2"></i><i style="top:${Y(1000)};height:calc(${Y(4500)} - ${Y(1000)})" class="z3"></i></div>
          ${[0, 200, 1000, 2000, 3000, 4500].map((dd) => `<span class="ru-tick" style="top:${Y(dd)}">${dd.toLocaleString()}</span>`).join('')}
          <div class="ru-reach" style="height:${Y(S.rated)}"></div><div class="ru-mark" style="top:${Y(S.rated)}"><b>${S.rated.toLocaleString()} m</b></div>
          ${RULER.map(([id, dd]) => `<img class="ru-fish${dd <= S.rated ? ' in' : ''}" src="${pic(id)}" style="top:${Y(dd)}" alt="">`).join('')}</div>`; };
      // the refits drawn as parts, in ink, like a page of a parts catalogue
      
      const statusOf = (k) => {
        if (k === hl && !sub.imploded) return '';
        if (k < hl) return '<span class="yd-tag past">Had it</span>';
        if (k === hl + 1 && k <= cap) return `<button class="pay-tag" data-act="buy" data-arg="up:tHull" ${can(SUBS[k].price) ? '' : 'disabled'} title="Buy it">${money(SUBS[k].price, false)}</button>`;
        return '';
      };
      const open = this.ydSub != null && this.ydSub <= Math.min(hl + 1, cap) ? this.ydSub : null;
      if (open != null) { // one sub, large: its picture, its sheet, a word about it
        const S = SUBS[open];
        html += `<div class="yd-top"><h3><small>No. ${open + 1} of ${SUBS.length}</small>${S.name}</h3><button class="yd-tab" data-yd="all">← All submersibles</button></div>
          <div class="yd-hero"><div class="yd-portcol"><div class="yd-port"><canvas class="yd-pic big" data-hull="${open}"></canvas></div>${ruler(S)}</div><div class="yd-info"><p class="yd-about">${SUB_ABOUT[open]}</p>${sheet(S, open, open === hl ? null : S0, open === hl && !sub.imploded ? 'IN SERVICE' : '', true)}<div class="yd-foot">${statusOf(open)}</div></div></div>`;
      } else if (this.ydAll) {
        html += `<div class="yd-allwrap"><div class="yd-top"><h3 class="yd-stencil">All submersibles</h3><button class="yd-tab" data-yd="back">← Back to your sub</button></div><div class="yd-grid">`;
        // (4.15.12) all eight: the ones whose plans are still to be found as black shapes, ??? for a name, where to
        // find them, and their figures locked away
        const lockSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><circle cx="12" cy="16" r="1.6" fill="#2a2418"/></svg>';
        for (let k = 0; k < SUBS.length; k++) {
          const S = SUBS[k];
          if (k > cap) {
            const where = k <= 3 ? 'the research station' : "Dave's Haul";
            html += `<div class="yd-card unknown"><div class="yd-photo"><canvas class="yd-pic" data-hull="${k}" data-shadow="1"></canvas></div><h4><small>No. ${k + 1}</small>???</h4><p class="yd-disc">To be discovered at ${where}</p><div class="yd-locked">${sheet(S, k, S0)}<div class="yd-lock">${lockSvg}</div></div></div>`;
            continue;
          }
          const foot = k > hl + 1 ? `<span class="yd-tag lock">${money(S.price, false)}, buy No. ${hl + 2} first</span>` : statusOf(k);
          html += `<div class="yd-card${k === hl ? ' cur' : ''}" data-yd="sub:${k}" title="See the ${esc(S.name)}"><div class="yd-photo"><canvas class="yd-pic" data-hull="${k}"></canvas></div><h4><small>No. ${k + 1}</small>${S.name}</h4>${sheet(S, k, k === hl ? null : S0, k === hl && !sub.imploded ? 'IN SERVICE' : '')}<div class="yd-foot">${foot}</div></div>`;
        }
        html += '</div></div>';
      } else {
        /* (6.0.0) no replacement to buy: a lost sub is back in her cradle when he is aboard again */
        html += `<div class="yd-hero"><div class="yd-portcol"><div class="yd-port"><canvas class="yd-pic big" data-hull="${hl}"></canvas></div>${ruler(S0)}</div><div class="yd-info"><h3><small>No. ${hl + 1} of ${SUBS.length}</small>${S0.name}</h3><p class="yd-hull">Hull ${Math.round(sub.hull * 100)} %${sub.hull < 0.999 && !sub.imploded ? ', damaged: swim out and hold the button at each hole to repair it' : ''}</p>${sheet(S0, hl, null, sub.imploded ? 'LOST' : 'IN SERVICE')}
          <button class="yd-plaque" data-yd="all"><i></i><i></i><i></i><i></i><svg class="yd-lens" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15 15 L21 21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>All submersibles${hl < SUBS.length - 1 && hl + 1 <= cap ? ` (next ${money(SUBS[hl + 1].price, false)})` : ''}</button></div></div>`;
        const refits = [['gear:arm', GEAR.arm.name, 'Works the claw under the sphere: from inside, Space grabs an animal.', GEAR.arm.price, owns(P, 'arm')]]
          .concat(Object.entries(SUB_ADDONS).filter(([, a]) => !a.inRoom).map(([k, a]) => [k, a.name, { quiet: 'Half the noise down there: the deep notices the sub less.', sonar: 'A strip under the radar draws the seafloor around her.', airBank: 'Bottles strapped behind the sphere: half as much cabin air again, on every sub.' }[k] || a.desc, a.price, !!(P.addons || {})[k]]));
        html += `<h4 class="yd-stencil">Refits <small>fitted once, kept on every sub</small></h4><div class="yd-refits">${refits.map(([arg, name, desc, price, have]) => `<div class="yd-refit${have ? ' have' : ''}"><span class="yd-clip"></span><div class="yd-part"><img data-part="${arg}" alt=""></div><div><b>${name}</b><p>${desc}</p></div>${have ? '<span class="yd-fitted">FITTED</span>' : `<button class="pay-tag" data-act="buy" data-arg="${arg}" ${can(price) ? '' : 'disabled'} title="Buy and fit it">${money(price, false)}</button>`}</div>`).join('')}</div>`;
        html += '<p class="shop-note">Pressure chambers are bought in the sub\'s chamber room, the large pressure tank in its own room.</p>';
      }
    } else if (tab === 'supplies') {
      // the sub's trawl nets: one in the hatch at a time, each used up in one haul
      for (const [k, N] of Object.entries(NETS_SUB)) {
        const have = netsOf(g.items)[k], full = have >= N.cap, adv = k !== 'basic';
        html += card(N.name, N.desc, `in the hatch (${have}/${N.cap})`, full ? null : N.price, 'buy', 'subnet:' + k, full ? 'Full' : 'Buy', '', '',
          [['holds', `${N.max} animals`, adv ? 'good' : ''], ['fish up to', `${N.maxLen} m long`, adv ? 'good' : ''], ['mouth', adv ? `${(N.mouth * 2).toFixed(1)} m wide: catches far more of a school` : `${(N.mouth * 2).toFixed(1)} m wide`, adv ? 'good' : ''], ['legends', adv ? 'none escape' : '9 in 10 escape', adv ? 'good' : 'bad'], ['big animals', adv ? 'seldom break out' : 'often break out, may tear it', adv ? 'good' : 'bad'], ['use', 'N in the sub, once', 'sheet']]);
      }
      for (const [k, it] of Object.entries(SUPPLIES)) {
        if (it.needs && !owns(P, it.needs)) continue; // film only once he has a camera
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
          return `<div class="tank-cell st-${st.replace(' ', '-')}" style="border-color:${rarityOf(sp).col}" title="${variantLabel(sp, d.variant)}, ${st}, about ${money(earnsOf(d))} a day"><img src="${this.toolImgs.get(key)}" alt="">${d.variant ? `<i class="r-${d.variant}">${VARIANTS[d.variant].name}</i>` : ''}<span>${d.name ? d.name : sp.name}</span><em>${st}</em></div>`;
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
    { const cur = $('shop-body').querySelector('.yd-allwrap .yd-card.cur'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' }); } // (4.15.13) the row opens on the sub in service
    if (wk.classList.contains('refit-full') !== full) { wk.classList.toggle('refit-full', full); if (this.dressPanels) this.dressPanels(); }
    if (full) { this.drawSubPics(P); this.blueprintMark(P); this.refitPics(P); }
  }

  // (4.15.7) each refit's picture: the part itself, cut from the game's own drawing of the sub with it fitted
  refitPics(P) {
    const imgs = [...$('shop-body').querySelectorAll('img[data-part]')]; if (!imgs.length) return;
    if (!this.partPics) {
      const Pk = { ...P, gear: { ...(P.gear || {}), arm: true }, addons: { ...(P.addons || {}), quiet: true, sonar: true } };
      const render = (arm) => { const c = document.createElement('canvas'); c.style.width = '1200px'; c.style.height = '700px'; document.body.appendChild(c); // (measured for drawShowcase)
        drawShowcase(c, { kind: 'sub', now: subLook(Pk, Pk.addons), next: null, arm }, 0.4); c.remove(); return c; };
      const withArm = render(true), plain = render(false);
      const crop = (c, [fx, fy, fw, fh]) => { const o = document.createElement('canvas'); o.width = 300; o.height = 176; const x = o.getContext('2d');
        x.drawImage(c, c.width * fx, c.height * fy, c.width * fw, c.height * fh, 0, 0, 300, 176); return o.toDataURL(); };
      const sonarPic = (() => { // (4.15.8) the sonar pod, and its green pings fanning out below it
        const o = document.createElement('canvas'); o.width = 300; o.height = 176; const x = o.getContext('2d'), [fx, fy, fw, fh] = PART_CROP.sonar;
        x.drawImage(plain, plain.width * fx, plain.height * fy, plain.width * fw, plain.height * fh, 0, 0, 300, 176);
        const cx = 150, cy = 62; x.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const r = 34 + i * 26; x.strokeStyle = `rgba(120,240,140,${(0.85 - i * 0.18).toFixed(2)})`; x.lineWidth = 3 - i * 0.4; x.shadowColor = 'rgba(120,240,140,0.8)'; x.shadowBlur = 8;
          x.beginPath(); x.arc(cx, cy, r, Math.PI * 0.22, Math.PI * 0.78); x.stroke(); }
        return o.toDataURL(); })();
      // (4.18.8) the spare air bank: not on the sub's drawing, so painted here: four bottles in brass straps on a manifold
      const airPic = (() => {
        const o = document.createElement('canvas'); o.width = 300; o.height = 176; const x = o.getContext('2d');
        const bg = x.createLinearGradient(0, 0, 0, 176); bg.addColorStop(0, '#163650'); bg.addColorStop(1, '#0a1a28'); x.fillStyle = bg; x.fillRect(0, 0, 300, 176);
        for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(200,225,240,${(0.08 + 0.1 * ((i * 7) % 5) / 5).toFixed(2)})`; x.beginPath(); x.arc((i * 53) % 300, (i * 37) % 176, 1 + (i % 3) * 0.6, 0, Math.PI * 2); x.fill(); } // marine snow
        x.fillStyle = '#3a4248'; x.fillRect(48, 34, 204, 10); // the manifold
        for (let i = 0; i < 4; i++) {
          const cx = 72 + i * 52, w = 36, top = 50, bot = 150;
          const cg = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); cg.addColorStop(0, '#6d6a40'); cg.addColorStop(0.35, '#d8c870'); cg.addColorStop(0.6, '#b8a64c'); cg.addColorStop(1, '#4e4a28');
          x.fillStyle = cg; x.beginPath(); x.roundRect(cx - w / 2, top, w, bot - top, [14, 14, 6, 6]); x.fill();
          x.strokeStyle = 'rgba(20,16,4,0.6)'; x.lineWidth = 1.5; x.stroke();
          x.fillStyle = '#2c3236'; x.fillRect(cx - 5, 40, 10, 12); x.fillStyle = '#596268'; x.fillRect(cx - 7, 37, 14, 5); // valve
          for (const sy of [78, 124]) { x.fillStyle = '#9a7a3a'; x.fillRect(cx - w / 2 - 2, sy, w + 4, 6); x.fillStyle = 'rgba(255,230,160,0.5)'; x.fillRect(cx - w / 2 - 2, sy, w + 4, 1.5); } // brass straps
          x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(cx - w / 2 + 6, top + 10, 4, bot - top - 22); // the light on it
        }
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 150, 300, 26);
        return o.toDataURL(); })();
      this.partPics = { 'gear:arm': crop(withArm, PART_CROP.arm), quiet: crop(plain, PART_CROP.quiet), sonar: sonarPic, airBank: airPic };
    }
    for (const im of imgs) im.src = this.partPics[im.dataset.part] || '';
  }
  // (4.15.2) the planning board's watermark: the outline of the sub in service, drawn faintly on the blueprint
  blueprintMark(P) {
    const hl = Math.min(SUBS.length - 1, lv(P, 'depth')), key = 'bp' + hl;
    this.bpCache = this.bpCache || new Map();
    if (!this.bpCache.has(key)) {
      const c = document.createElement('canvas'); c.width = 900; c.height = 420;
      const Pk = { ...P, tlvV: 2, tlvCh: 1, tlv: { ...(P.tlv || {}), tHull: hl } };
      drawShowcase(c, { kind: 'sub', now: subLook(Pk), next: null }, 0);
      const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), px = d.data, w = c.width, h = c.height, out = x.createImageData(w, h), o = out.data;
      const lum = (i) => px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      for (let y = 1; y < h - 1; y++) for (let x2 = 1; x2 < w - 1; x2++) { const i = (y * w + x2) * 4, e = Math.abs(lum(i) - lum(i + 4)) + Math.abs(lum(i) - lum(i + w * 4)); if (e > 34) { o[i] = 220; o[i + 1] = 236; o[i + 2] = 255; o[i + 3] = Math.min(255, e * 2.2); } }
      x.clearRect(0, 0, w, h); x.putImageData(out, 0, 0); this.bpCache.set(key, c.toDataURL());
    }
    $('shop-body').style.setProperty('--bp-mark', `url(${this.bpCache.get(key)})`);
  }
  // (4.14.0) each sub's picture on the sub page, as it looks in the water
  drawSubPics(P) {
    const cvs = [...$('shop-body').querySelectorAll('canvas.yd-pic')]; if (!cvs.length) return;
    const looks = cvs.map((cv) => { const k = +cv.dataset.hull; const Pk = { ...P, tlvV: 2, tlvCh: 1, tlv: { ...(P.tlv || {}), tHull: k } }; return { kind: 'sub', now: subLook(Pk), next: null }; });
    const t0 = performance.now(), tick = () => {
      if (!cvs[0].isConnected || $('workshop').hidden) return;
      const t = (performance.now() - t0) / 1000;
      cvs.forEach((cv, i) => { if (cv.dataset.shadow) { if (!cv.dataset.done) this.drawShadowSub(cv, looks[i]); } else drawShowcase(cv, looks[i], t + i * 0.7); });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // (4.15.12) a sub not yet discovered: the water as usual, the sub in it a black shape (drawn once)
  drawShadowSub(cv, look) {
    if (!cv.clientWidth) return;
    drawShowcase(cv, null, 0); const x = cv.getContext('2d'), w = cv.width, h = cv.height, water = x.getImageData(0, 0, w, h);
    drawShowcase(cv, look, 0); const full = x.getImageData(0, 0, w, h), a = water.data, b = full.data;
    for (let i = 0; i < b.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); if (d > 18) { b[i] = 4; b[i + 1] = 8; b[i + 2] = 11; } }
    x.putImageData(full, 0, 0); cv.dataset.done = '1';
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
    return `<div class="up-row${open ? ' open' : ''}" data-row="${key}"><div class="up-head"><span class="up-name">${name}<button class="info" data-info="${key}" title="More about it" aria-label="More information">i</button></span><span class="up-line">${line}</span>${plates ? `<span class="plates">${plates}</span>` : ''}</div>
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
    const GEAR_OF = { 'Camera': 'camera', 'Claw': 'arm' };
    const ICON_OF = { 'Net': ['net', gear(P, 'net').look], 'Camera': ['cam', 0] };
    let html = '';
    for (const grp of groups) {
      const gk = GEAR_OF[grp];
      html += `<div class="up-group"><h4>${grp}</h4>`;
      if (gk && !owns(P, gk)) {
        const G = GEAR[gk], ic = ICON_OF[grp];
        html += `<div class="card${ic ? ' with-img' : ''}${this.openRows.has('card:gear:' + gk) ? ' open' : ''}" data-row="card:gear:${gk}">${ic ? `<img src="${icon(ic[0], ic[1])}" alt="">` : ''}<div class="card-txt"><h3>${G.name}<button class="info" data-info="card:gear:${gk}" title="More about it" aria-label="More information">i</button></h3>${GEAR_SPECS[gk] ? `<ul class="bullets">${GEAR_SPECS[gk].map(([l, v, k]) => `<li${k ? ` class="p-${k}"` : ''}><em>${l}</em><b>${v}</b></li>`).join('')}</ul>` : ''}<p class="story">${G.desc}</p></div>
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
          else if (!maxed) specs.push(['next', `${SUBS[d + 1].name}, ${SUBS[d + 1].rated} m, cabin air ${SUBS[d + 1].o2} s`, 'good']);
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
    const head = `<div class="slip-head">BAYSIDE MARINE BUYERS<br><small>receipt, ${d.toLocaleDateString()} ${d.toTimeString().slice(0, 5)}</small></div>`;
    const lines = sale.lines.map((l) => `<div class="slip-line${l.coins ? ' coins' : ''}"><span>${l.n > 1 ? l.n + ' × ' : ''}${l.label}</span><b>${l.coins ? `${COIN}${l.coins}` : money(l.total)}</b></div>`);
    lines.push(`<div class="slip-total"><span>Total</span><b>${money(sale.total)}</b></div><div class="slip-foot">PAID IN CASH<br>thank you, come again</div>`);
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
    const t = `${g.journal.size} of ${SPECIES_COUNT} met`; // (5.1) one line: how much of the sea is in the book; (5.7.4) pencilled
    const el = $('journal-count'); if (el.textContent !== t) el.textContent = t;
  }
  update(g, dt) {
    if (this.gainsQueue && this.gainsQueue.length && !this.gainsBlocked()) { const q = this.gainsQueue; this.gainsQueue = []; setTimeout(() => this.showGains(q, true), 250); }
    if (!$('journal').hidden && this.journalDirty) { this.journalDirty = false; this.renderJournal(); }
    if (!$('journal').hidden) this.journalCount(g);
    if (!$('workshop').hidden) {
      const e = g.earl;
      if (!this.refitOnly && (Math.abs(e.x - BOAT.x) > 16 && !(this.shopTab === 'sub' && Math.abs(e.x - yardX()) < 10) || e.y > 5)) this.toggleWorkshop(false); /* (7.6.23) the shipyard barge counts as beside her */ // (refits from the tank room work anywhere)
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
