// Hatchetfish (Earl is the default diver) — game loop, state, interactions and UI glue.
import { scrollSellPearls } from './shelf.js'; // (7.6.2) scrolls sell for pearls
import { rarKind } from './itemcard.js'; // (7.5.5) "Legendary net" on the sale's question
import { watchPage } from './units.js'; // (6.0.3) first, so every canvas draws its figures in the chosen units
import { watchPanels, platesReady } from './reveal.js'; // (6.5.0) no panel seen half-drawn
import { installFatFinger } from './fatfinger.js';
import { coinURL, tileURL } from './coins.js';
installFatFinger();
import { clamp, lerp, dist, makeRng, formatTime, TAU } from './util.js';
import { markOf, SUB_MARKS, BOAT_U, BOAT_LADDER, BOAT_DOOR, deckLine } from './earl_draw.js';
import { generateWorld, RESOURCES, BOAT, BOAT_HOME, BOAT_MIN, BOAT_MAX, WORLD_W, ISLE, CAVE, CANYON, WHALE_FALL, SEEP, TRENCH, boatDock, SAIL, SAIL_OFF, yardX } from './world.js';
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { Chart } from './chart.js';
import { Fauna } from './fauna.js';
import { Earl, Sub, updateEarl, diverDrainMult, subDrainMult, subLeak } from './player.js';
import { Autopilot } from './autopilot.js';
import { activeTool, findCatch, useTool, updateCapture, updateSpecimens, bagSlots, loadKg, loadSpeed, loadAir, pressUsed, pressSlots, seal, chamberRating, fireSubNet, canFireSubNet, netsOf, netKinds, netTotal, NETS_SUB, updateSubNet, tankFits, BIG, tooBig, bagUsed, spacesOf, overencumbered } from './capture.js';
import { specimenValue, conditionName, rarityOf, canTakeLive } from './specimens.js';
import { variantLabel, rollVariant, canBeRare, variantMult } from './variants.js';
import { SETTINGS } from './settings.js';
import { photoTarget, startPhoto, updatePhoto } from './survey.js';
import { prepareMonster } from './monster_draw.js';
import { setTrap, updateTraps, trapNear, emptyTrap, trapsFree, canSetHere, convertOldTraps, lostTraps, trapSetOf, trapLeft, timeLeftText, cashOutTrap } from './traps.js';
import { startArm, updateArm, findArmTarget } from './arm.js';
import { Q as questsOf, fillQuests, questEvent, questTick, claim as claimQuest, refreshBoard, refreshPrice, MAIN as QUEST_MAIN, readyCount as questsReady, learned, TUT_IDS, firstFishPart, tutorialOn } from './quests.js';
import { TutSpot } from './tutspot.js';
import { aquariumOf, tickAquarium, displayRefusal, display, displayKey, tickGallery, gallerySale, isHappy, gallerySlots, GALLERY_STEPS } from './aquarium.js';
import { CANISTERS, TRAPS } from './economy.js';
import { suitOf, kit, worn } from './economy.js';
import { DAVE_FINDS, DAVE_RATE } from './dave.js';
import { STATION_COLLAR } from './station_draw.js';
import { oldStock, overTable, leftOf, nearLure } from './oldone.js';
import { CHESTS } from './chests.js';
import { giveRolled, wornInst, putOn2 } from './items.js';
import { abilityOf, abilityState, whyNot, ALL_ABILITIES, cooldownLeft, skipCost, fmtLeft, MYTH, NEXT_TIER, maxLoad, chargePrice, growCharges } from './abilities.js';
import { startLegendFx } from './legendfx.js';
import { SKILLS, RARITY, skillCol } from './item_data.js';
import { pictureOf, hourglassURL } from './catalog.js';
import { kitOf } from './items.js';
import { ITEMS, ownsItem, giveItem, putOn, takeOff, instOf, isOn, removeItem, sellValue, lockerFree, skillLv, setOn, totals } from './items.js';
import { LEGENDARY } from './specimens.js';
import { readSlot, setSlot, getSlot, lastSlot, flushSave, SLOTS, SUB_AIR } from './economy.js';
import { rollChestAll } from './chests.js';
import { setDiverLook } from './earl_draw.js'; // (6.7.0)
import { isTestStore } from './purchases.js';
import { CODES, normCode } from './codes.js'; // (6.5.9)
import { calState, calClaimed, calWeek, giftPearls, syncServerTime } from './store.js';
syncServerTime(); setInterval(syncServerTime, 10 * 60e3); /* (7.4.26) the daily gift's clock */
import { hullCap } from './economy.js';
import { loadBest, TRACKS, tlv, GEAR, lv, statValue, upgradeCost, owns, gear, coinsFor, upgradeCoins, WARES } from './economy.js';
import { SUB_ADDONS, SUPPLIES, supplyMax, GOODS, PATCH_PRICE, HOSPITAL_SHARE, hospitalCap, replacementPrice, SUBS, rollCrush, crushMean, newProfile, loadProfile, saveProfile, marketTick, priceOf, sell, spend, money } from './economy.js';
import { updateHunters, directEncounters, AGGRO } from './hunters.js';
import { Entity, dreadFromDistance, LANTERN_RADIUS } from './entity.js';
import { Renderer, dayCycle } from './render.js';
import { Hud } from './hud.js';
import { Touch } from './touch.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Beacon } from './alarm.js';
import { Messages } from './messages.js';
import { updatePet, toggleStay } from './pets.js';
import { PET_BY_ID, petsOwned, petUnlocked } from './petshop.js'; // (7.4.14) pets come only from pearls
import { openPetFeed as petFeedOpen } from './petfeed.js'; // (7.4.14) the pet's aquarium, where it is fed
// (5.4) many HUD bits set .hidden every frame to what it already is; on a phone each such write still costs a style
// pass. Writing the value it already has now does nothing.
{ const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
  if (d && d.set && d.get) Object.defineProperty(HTMLElement.prototype, 'hidden', { ...d, set(v) { if (d.get.call(this) !== !!v || typeof v === 'string') d.set.call(this, v); } }); }

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const renderer = new Renderer(canvas);
const hud = new Hud(hudCanvas);
// (5.1.1) a touch screen (a phone, a tablet) gets the action buttons; a computer keeps the prompts and keys it had.
// ?touch in the address forces the touch layout (for trying it on a computer)
// (7.2.4) the game is touch-only: the HUD and the scene are always laid out for a phone
renderer.touch = hud.touch = true; document.documentElement.classList.add('touch');
// (3.4.0) everything the game says goes to one message line, top centre, over the sea and every room and panel
const messages = new Messages();
hud.onShow = (text, kind) => messages.show(text, kind);
// the steady line: how the air is, while a panel is open and it is getting short
function airOver(g) {
  let el = document.getElementById('overair');
  if (!el) { el = document.createElement('div'); el.id = 'overair'; document.body.appendChild(el); }
  const e = g.earl, sub = g.sub;
  let txt = '';
  if (g.mode === 'play' && ui.anyOpen() && !g.aboard) {
    const subAir = e.inSub && sub && sub.o2Max ? sub.o2 / sub.o2Max : 1, own = e.o2Max ? e.o2 / e.o2Max : 1;
    if (g.noAir) txt = 'Out of air: surface!';
    else if (e.inSub && subAir <= 0.001) txt = own < 0.5 ? `Cabin out of air · your tank: ${Math.ceil(e.o2)} s` : 'Cabin out of air: breathing from your tank';
    else if (e.inSub && subAir < 0.25) txt = `Sub air low: ${Math.round(subAir * 100)} %`;
  }
  // (5.15.6) not twice: while the message line still shows the same words, the note over the panel waits
  { const ml = document.getElementById('msgs'); if (txt && ml && ml.textContent.includes(txt)) txt = ''; }
  if (el.textContent !== txt) el.textContent = txt;
  el.classList.toggle('on', !!txt);
  // (5.14.1) low air, felt rather than read: under 10 s of his own air the edges of the screen (and of any open panel,
  // as it sits over them) shade red and pulse, slowly at first, faster as it runs out, near solid in the last seconds
  let v = document.getElementById('lowair'); if (!v) { v = document.createElement('div'); v.id = 'lowair'; document.body.appendChild(v); }
  const breathing = g.mode === 'play' && !g.aboard && (!e.inSub || (sub && sub.o2 <= 0.001));
  const left = breathing && !e.atSurface ? (g.noAir ? 0 : e.o2) : 99, k = left < 10 ? 1 - left / 10 : 0;
  if (k > 0) { const rate = 0.9 + k * 2.6; g.lowAirPh = ((g.lowAirPh || 0) + (g.realDt || 0.016) * rate) % 1; const beat = 0.5 - 0.5 * Math.cos(g.lowAirPh * Math.PI * 2);
    v.style.opacity = (0.25 + 0.55 * k + (0.2 + 0.25 * k) * beat * (1 - Math.max(0, k - 0.8) * 2.5)).toFixed(3); v.style.setProperty('--la', (0.35 + 0.4 * k).toFixed(3)); }
  else if (v.style.opacity !== '0') v.style.opacity = '0';
}
const audio = new Audio(); window.__earlAudio = audio; // (for testing)
audio.musicAllowed = true; // (5.5) the title too: the theme was only allowed from the first dive on, so the title stayed silent
const beacon = new Beacon(audio); beacon.say = (text, kind) => messages.show(text, kind); // (4.0.2) the alarms on the message line

const keys = new Set();
hud.held = keys; hud.touchRef = null; // (5.7.0) set once the Touch exists, below
 // (5.3) the keys held, so a touch button shows pushed in
// (5.3.2) a phone: lite mode for good, and the effects Safari draws in software switched off: blurred shadows (on
// every context the game draws on), soft-light and multiply-heavy extras, high-quality scaling. ?full keeps them
if (!/[?&]full\b/.test(location.search)) { // (7.4.13) phone-only: always
  renderer.lite = true; renderer.phone = true;
  const noShadow = (c) => { if (!c) return; Object.defineProperty(c, 'shadowBlur', { get: () => 0, set: () => {}, configurable: true }); };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, o) { const c = gc.call(this, type, o); if (c && type === '2d' && !c.__ns) { c.__ns = 1; noShadow(c); } return c; };
  noShadow(renderer.ctx); noShadow(renderer.lctx); noShadow(hudCanvas.getContext('2d'));
}
// (5.3.2) ?fps shows frames a second in the corner (P does too)
if (/[?&]fps\b/.test(location.search)) hud.showFps = true;
const PRY = new Set(['clam', 'mussel']);
const PRY_TIME = 1.5;
// how long each hold-F job takes, and how much calm a good deed gives
const HOLD_TIME = { clam: 1.5, mussel: 1.5, rock: 1.5, iron: 1.5, net: 12 };
const DEED_CALM = { net: 25, plant: 15 };
const PLANT_TIME = 8;
const pressed = new Set();
let fHeld = 0, fSwallow = false;
let fDown = 0;
let cHeld = 0, cDown = 0;

// what survives death: cash, upgrades, the journal, the market (see economy.js)
let profile = loadProfile();

// what his suit does: pressure, air, speed (see SUITS)
// what he has on (2.6.0): the tank's air, the fins (and a heavy tank's drag), the camera's card
function applyKit(e, P) {
  kit(P); applySuit(e, P);
  // (6.0.0) the air he has is kept as it is when he changes tanks: a bigger tank holds more, it does not add any; a
  // smaller one keeps only what fits (said once). At the start of a run (nothing yet) he starts full
  const was = e.o2Max || 0; e.o2Max = airMax(P);
  if (!was) e.o2 = e.o2Max; else if ((e.o2 || 0) > e.o2Max + 0.5) { e.o2 = e.o2Max; if (g && g.mode === 'play' && hud) say(`This tank holds ${Math.round(e.o2Max)} s: the rest of the air is gone`, 'earl'); } else e.o2 = Math.min(e.o2Max, e.o2 || 0);
  e.finSpeed = statValue(P, 'swim'); e.sprintMul = statValue(P, 'sprint');
  e.tankQuiet = !!(worn(P, 'tank') || {}).quiet;
  // (2.8.0) skills, Legendary skills and set traits, all stacked across what he has on
  const T = totals(P), L = (k) => skillLv(P, k);
  e.pressRes = Math.max(0.4, 1 - 0.15 * L('resilience'));
  e.sprintAir = setOn(P, 'harbour') ? 1 : 2;
  e.featherK = Math.max(0, 1 - 0.2 * (L('feather') + ((worn(P, 'bag') || {}).feather || 0)));
  e.warmK = Math.max(0, 1 - 0.25 * L('warmth'));
  e.ambushLv = L('ambush'); // (7.4.0) Ambush I-IV: 25 % a level that a fish holds still (capture.js ambushChance)
  e.hardened = L('hardened'); e.composure = L('composure'); e.prospector = L('prospector');
  e.biolum = L('biolum'); e.glows = T.glows; e.trail = T.trail; e.trailKind = T.trailKind; e.legends = T.legends;
  const wf = worn(P, 'fins'), wt = worn(P, 'tank'), ws = worn(P, 'suit'); e.finLook = (wf && wf.finLook) || null; e.tankLook = (wt && wt.tankLook) || null; e.suitGlow = (ws && ws.suitGlow) || null; // (2.8.1) how his special gear looks on him
  e.kelpSet = setOn(P, 'kelp'); e.nightSet = setOn(P, 'night'); e.triesteSet = setOn(P, 'trieste'); e.challengerSet = setOn(P, 'challenger');
  // (5.0) a camera comes with one roll of film, the first time he has one; after that film is bought at the boat
  if (g && owns(P, 'camera') && g.items.film == null) g.items.film = gear(P, 'cam').shots;
  if (g && g.items.film > 0 && owns(P, 'camera')) { const sh = gear(P, 'cam').shots; if (g.items.film > sh) { P.spare = P.spare || {}; P.spare.film = Math.min(36, (P.spare.film || 0) + g.items.film - sh); g.items.film = sh; } } // (6.5.1) a smaller camera: the rest goes to the spare stack
  if (g && g.toolSel && g.toolSel !== 'net' && g.toolSel !== 'trap' && g.toolSel !== 'none' && !(g.toolSel === 'cam' && owns(P, 'camera'))) g.toolSel = 'net';
}
function applySuit(e, P) {
  // (2.8.0) the suit is an item: its look is its kind of suit, or its own colours (Rare and up)
  const S = suitOf(P);
  e.pressStart = S.press; e.suitAir = S.air; e.suitSpeed = S.speed; e.suitQuiet = !!S.quiet; e.suit = S.pal || S.look || 'wet';
  if (P) P.suit = S.look || 'wet'; // (what the old drawings and pages read)
}
// the sub's rating, air and engine come from its upgrades
function applySub(sub, P) {
  sub.ratedV = statValue(P, 'depth'); // (4.16.8: no relics)
  sub.o2V = SUB_AIR[lv(P, 'depth')] * ((P.addons || {}).airBank ? 1.5 : 1); // (the spare air bank adds half again) the cabin air comes with the submersible ((claude-polish) this sat inside the comment above: every hull had the first one's two minutes)
  sub.speedMul = statValue(P, 'subSpeed'); sub.ballast = statValue(P, 'ballast'); // (each sub's own speed and ballast: the old 50-step engine refit is retired)
  sub.level = lv(P, 'depth');
}
// (5.10.10) the X developer key is gone (the owner's call): nothing in a phone game is reached by a key
// the 'reduce flashing' setting (pause menu): kept in this browser
function readReduceFlash() { try { return localStorage.getItem('earl.reduceFlash') === '1'; } catch (e) { return false; } }
function newGame(mode) {
  audio.ready && audio.restore(1.2); // after a death by the thing below, the sound comes back
  const P = profile || newProfile();
  convertOldTraps(P); // old seabed traps become the new box traps
  if (P.trapRefund) { const r = P.trapRefund; delete P.trapRefund; setTimeout(() => hud.toast(`Traps changed: one of each kind now, one set at a time. ${money(r, false)} back for the extras`, 'note'), 2500); } // (7.3.0)
  BOAT.x = clamp(P.boatX || BOAT_HOME, BOAT_MIN, BOAT_MAX); // she is where she was anchored (the shelf edge at first)
  const seed = (Math.random() * 1e9) | 0;
  const world = generateWorld(seed);
  const rng = makeRng(seed ^ 0x5bd1e995);
  const g = {
    mode, seed, world, rng, profile,
    time: 572, // (4.17.4) a dive sets out at sunrise: the moon just down, the sky warming, full day about 30 s later
    survival: 0,
    earl: new Earl(), sub: new Sub(),
    entity: new Entity(rng, world),
    fauna: new Fauna(world, rng),
    bubbles: [], events: [], debris: [],
    fx: { dread: 0, torchShift: 0, darken: 0, vignette: 0, disorient: 0, ghost: 0, shake: 0, flash: 0, black: 0, pressure: 0, lightPulse: 1, bioPulse: 1 },
    items: { necklace: P.items ? P.items.necklace || 0 : 0, glowAdv: P.items ? P.items.glowAdv || 0 : 0, airTank: P.items && P.items.airTank !== undefined ? P.items.airTank : 0, sealant: P.items ? P.items.sealant || 0 : 0, plate: P.items ? P.items.plate || 0 : 0, film: P.items && P.items.film != null ? P.items.film : null, net: P.items && P.items.net !== undefined ? P.items.net : null, nets: P.items && P.items.nets ? Object.assign({}, P.items.nets) : null }, inv: {}, // a new diver starts with one backup air tank
    journal: new Map(P.journal || []), notes: P.notes || '', sapphires: 0, earned: 0,
    necklaceT: 0, glows: [], protection: null, prompt: null,
    waveBoost: 0, dayEff: 1, day: dayCycle(0), diverDrain: 1, subDrain: 1,
    deathT: 0, deathDelay: 0, deathCause: null, paused: false, audio, reduceFlash: readReduceFlash(),
    imploded: false, lowO2Warned: false, lastSafe: 0, breathT: 2, farShadow: null,
    injury: 0, healT: 0, blood: [], deathKind: null, lampFlashT: -99, threat: null,
    autopilot: new Autopilot(), addons: P.addons || {}, anchored: true,
    bag: [], subTank: [], captureFx: [], capture: null, toolSel: 'net', capPrompt: null,
    darts: [], tags: [], photos: Array.isArray(P.roll) ? P.roll.slice() : [], photo: null, camFlash: 0,
    traps: [], armGame: null, contracts: [],
  };
  // the radio's jobs: the ones he took before carry over; the rest of the board is new each dive
  if (mode === 'play') fillQuests(P); // (3.0.0) quests in place of the radio's contracts
  g.hurt = (dmg, sp, how) => hurt(dmg, sp, how);
  g.damageSub = (amt, sp) => damageSub(amt, sp);
  g.sub.docked = true;
  // rare variants: unlocked per species by catching a normal one first
  g.fauna.caught = new Set(P.caught || []);
  for (const st of world.statics) {
    if (g.fauna.caught.has(st.sp.id) && canBeRare(st.sp)) { const v = rollVariant(rng, st.y, false); if (v) { st.variant = v; if (v === 'giant') st.scale *= 1.7; } }
  }
  // upgrades bought on earlier dives
  g.earl.o2Max = g.earl.o2 = airMax(P);
  g.earl.finSpeed = statValue(P, 'swim'); g.earl.sprintMul = statValue(P, 'sprint');
  if (mode === 'play') { applyKit(g.earl, P); g.earl.o2 = g.earl.o2Max; }
  applySuit(g.earl, P);
  applySub(g.sub, P); g.sub.o2 = g.sub.o2Max; g.sub.hull = P.hull;
  /* (6.0.0) a sub is never lost between dives (P.subLost is no longer kept) */
  // pre-warm the ocean with life around the spawn
  const cam = { x: BOAT_HOME, y: 6, w: 46, h: 26 };
  for (let i = 0; i < 8; i++) g.fauna.trySpawn(cam, 0);
  for (const c of g.fauna.list) { c.x += (BOAT_HOME - c.x) * 0.6; }
  return g;
}

let g = newGame('menu');
// the title screen's music starts with the first key or click (browsers keep pages silent until then)
// (6.5.6) iOS only lets sound start from a touch's end or a click, not from its start (pointerdown), so the first
// try could fail and the listener was gone: no sound all game. Now it listens on every kind of tap and lets go only
// once the sound is really running
const WAKE_EV = ['pointerdown', 'touchend', 'click'];
const wakeAudio = () => { audio.init(); audio.resume(); audio.playMusic(); if (audio.ac && audio.ac.state === 'running') for (const k of WAKE_EV) window.removeEventListener(k, wakeAudio, true); };
for (const k of WAKE_EV) window.addEventListener(k, wakeAudio, true);
// the slot a fresh "Dive" goes into when none was chosen: the first empty one, else the last played
function firstFreeSlot() { for (let n = 1; n <= SLOTS; n++) if (readSlot(n).state === 'empty') return n; return lastSlot() || 1; }
const ui = new UI({
  onPlay: () => withLoading(() => startRun()),
  getGame: () => g,
  onQuit: () => die('Ended the dive', 'quit'),
  onBuy: (k) => guardBuy(costOf(k), () => buy(k)),
  onClaim: () => claimGift(), // (6.4.0) the daily gift
  onBuyNow: (k) => { guardBuy.ok = true; try { return buy(k); } finally { guardBuy.ok = false; ui.refreshOpen(); } }, // (4.16.4) already confirmed by its own prompt
  costOf: (k) => costOf(k),
  onOldBuy: (k) => { const ok = oldBuy(k); if (ok && g.oldShopOpen) setTimeout(showOldShop, 0); return ok; },
  questsReady: () => (profile ? questsReady(profile) : 0),
  // (3.0.0) a shop's cart, checked out at once: all of it, or nothing (cash and room in the locker)
  onCheckout: (keys) => {
    const P = profile, its = keys.map((k) => ITEMS[k.slice(5)]).filter(Boolean);
    if (!its.length) return false;
    const total = its.reduce((a, it) => a + it.price, 0);
    if (!guardBuy.ok && needsConfirm(total)) return guardBuy(total, () => ui.h.onCheckout(keys));
    if (lockerFree(P) < its.length) { hud.toast('Locker full', 'warn'); return false; }
    if (!spend(P, total)) return false;
    for (const it of its) { const q = giveItem(P, it.id); if (q) q.paid = true; if (P.wish === it.id) P.wish = null; }
    questEvent(P, 'bought'); // (4.3.0) the Log's 'buy' step counts a real purchase, nothing else
    saveProfile(P); audio.ready && audio.sale();
    ui.showGains(its.map((it) => ({ kind: 'item', id: it.id, how: 'Bought' }))); tipEquip(); // (4.6.0) the cards say it
    return true;
  },
  onSellAll: () => withKept(() => sellAll()),
  onSellSome: (keys) => withKept(() => sellSome(keys)),
  onKeep: (key, on) => keepMark(key, on),
  journalSeen: (id) => { const v = g && g.journal.get(id); if (v && !v.seen) { v.seen = true; profile.journal = [...g.journal.entries()]; saveProfile(profile); } }, // (6.9.1) its New tag off
  onGallery: (act, key, v) => galleryAction(act, key, v),
  aquariumCatch: () => aquariumCandidates(),
  onHints: () => { hud.hints = !hud.hints; },
  getHints: () => hud.hints,
  onMute: () => { audio.setMuted(!audio.muted); },
  getMuted: () => !!audio.muted,
  payMul: () => statValue(profile, 'payFish'),
  onStation: (id) => useStation(id),
  // (6.9.0) the shop's Test tab (behind ?dev; ui.js shows it only when purchases.js isTestStore())
  // (7.3.9, 7.4.14, owner) a pet from the shop: bought once with pearls (asked first), then his to take out at any time;
  // a tap on one he owns takes it out (the one out goes home)
  onBuyPet: (id, done) => {
    const P = profile, S = PET_BY_ID.get(id); if (!P || !S || !petUnlocked(P, id)) return false;
    const name = SPECIES_BY_ID[id].name;
    if (petsOwned(P).has(id)) { petOut(id); done && done(); return true; }
    if ((P.pearls || 0) < S.pearls) { hud.toast('Not enough pearls', 'warn'); return false; }
    ui.confirm(`Buy the ${name.replace(/^the /i, '')}?`, `${S.pearls} pearls (you have ${Math.floor(P.pearls || 0).toLocaleString('en-US')}). It comes out with you now, and stays yours.`, `Buy, ${S.pearls} pearls`, 'Not now', () => {
      if ((P.pearls || 0) < S.pearls) { hud.toast('Not enough pearls', 'warn'); return; }
      P.pearls -= S.pearls; P.petsOwned = [...petsOwned(P), id]; petOut(id); audio.ready && audio.sale(); done && done();
      ui.showGains([{ kind: 'pet', id }]); });
    return true;
  },
  onRedeem: (raw) => { const P = profile; if (!P) return 'Start a dive first'; const k = normCode(raw); if (!k) return 'Type a code'; const C = CODES[k]; if (!C) return 'That code is not recognised';
    P.codes = P.codes || []; if (P.codes.includes(k)) return 'Already redeemed on this diver';
    if (C.pearls) P.pearls = (P.pearls || 0) + C.pearls; if (C.cash) P.cash = (P.cash || 0) + C.cash; if (C.item && ITEMS[C.item]) for (let i = 0; i < (C.n || 1); i++) giveItem(P, C.item);
    P.codes.push(k); saveProfile(P); audio.ready && audio.sale && audio.sale(); return { ok: true, msg: `Redeemed: ${C.say || 'done'}` }; },
  onTest: (act, arg) => {
    const P = profile; if (!P || !isTestStore()) return;
    if (act === 'pearls') { P.pearls = (P.pearls || 0) + (+arg); saveProfile(P); hud.toast(`+${arg} pearls (test)`); return; }
    if (act === 'cash') { const n = +arg; P.cash = Math.round((P.cash + n) * 100) / 100; P.lifetime = Math.round((P.lifetime + n) * 100) / 100; hud.toast(`+${money(n)} (test)`); }
    else if (act === 'chest') { const q = giveItem(P, 'chest_' + arg); if (q) ui.showGains([{ kind: 'item', id: 'chest_' + arg, how: 'Test' }]); else hud.toast('Locker full', 'warn'); }
    else if (act === 'abil') { if (arg === 'ready') { P.abilReadyAt = 0; hud.toast('Ability ready (test)'); } else { let n = 0; for (const id of ALL_ABILITIES) if (ITEMS[id] && !ownsItem(P, id) && giveItem(P, id)) n++; hud.toast(`${n} abilities into the locker (test)`); } }
    else if (act === 'item' && ITEMS[arg]) { const q = giveItem(P, arg); if (q) ui.showGains([{ kind: 'item', id: arg, how: 'Test' }]); else hud.toast('Locker full', 'warn'); }
    else if (act === 'reset') {
      if (arg === 'lessons') { P.lessonTrawl = P.lessonChamber = P.lessonAir = undefined; hud.toast('Lessons reset (test)'); }
      else if (arg === 'tutorial') { P.tut = undefined; const S = questsOf(P); S.main = 0; S.mainProg = 0; S.seen = {}; hud.toast('Tutorial reset: start a new dive (test)'); }
      else if (arg === 'board') { const S = questsOf(P); S.board = []; S.firstBoard = false; hud.toast('First board back (test)'); }
    }
    syncProfile && syncProfile(); saveProfile(P);
  },
  onFootstep: (v) => audio.ready && audio.footstep && audio.footstep(v),
  // (3.0.0) quests: claim one (cash, and on the main line sometimes a thing), or new quests on the board
  onQuestClaim: (which) => {
    const P = profile, tutWas = P.tut === 'on', r = claimQuest(P, which); if (!r) return false;
    const mNext = QUEST_MAIN[questsOf(P).main], lastTut = which === 'main' && tutWas && (!mNext || !TUT_IDS.has(mNext.id));
    if (lastTut) ui.closeQuestsAfterTutorial(); // (4.12.2) the last step: the board stays as it was, fades out, and the new quests come 3 s after
    else if (which === 'main' && tutWas && !(mNext && mNext.id === 'sell' && !P.tutJournal)) setTimeout(() => ui.toggleQuests(false), 250); // (4.3.5) the tutorial goes straight on to the next step; (7.1.0) but after the first catch the book stays open and points at its Journal tab
    if (r.pay) { P.cash = Math.round((P.cash + r.pay) * 100) / 100; P.lifetime = Math.round((P.lifetime + r.pay) * 100) / 100; }
    if (r.pearls) P.pearls = (P.pearls || 0) + r.pearls; // (7.6.2, owner)
    let gift = null; if (r.gift) gift = giveItem(P, r.gift);
    // (4.0.6) a tutorial step gives what it taught him to use: a net, a backup air tank, a trawl net, a trap
    const got = [];
    for (const [kind, id, n = 1] of r.kit || []) {
      if (kind === 'item' && ITEMS[id]) { const q = giveItem(P, id); if (q) { q.gift = true; got.push(ITEMS[id].name); } } // (4.3.0) a gift, not a purchase
      else if (kind === 'supply' && g) { g.items[id] = (g.items[id] || 0) + n; got.push(n > 1 ? `${n} × ${SUPPLIES[id].name}` : SUPPLIES[id].name); }
      else if (kind === 'trawl' && g) { const N = netsOf(g.items); if (N[id] < NETS_SUB[id].cap) { N[id]++; got.push(NETS_SUB[id].name); } else { P.cash = Math.round((P.cash + NETS_SUB[id].price) * 100) / 100; got.push(money(NETS_SUB[id].price)); } }
      else if (kind === 'trap') { convertOldTraps(P); if ((P.traps[id] || 0) < TRAPS[id].max) { P.traps[id] = (P.traps[id] || 0) + 1; got.push(TRAPS[id].name); } }
    }
    if (got.length) syncProfile();
    saveProfile(P); audio.ready && audio.sale(); audio.cue && audio.cue('sale');
    const cards = (r.gift && gift ? [{ kind: 'item', id: r.gift }] : []).concat((r.kit || []).map(([kind, id]) => ({ kind, id }))).map((c) => ({ ...c, how: 'For the quest' }));
    if (cards.length) ui.showGains(cards); // (4.6.0)
    { if (!(ui.questTag(`+${money(r.pay)}`))) hud.toast(`Quest done: +${money(r.pay)}`, 'big'); if (r.pearls) hud.pearlsWon(r.pearls); } /* (7.6.22, owner) the pearls on their own, flying to their counter */ // (5.7.0) on a phone always the stamped tag, panel open or not // (5.5.6) on a phone, a tag from the clipboard
    return true;
  },
  tutHide: () => !!(g && g.tutHidePrompts), // (4.4.0) the cabin's own prompts, off during the tutorial
  tutAllowCabin: (id) => !(g && g.tutHidePrompts) || !!(g.tutAction && { desk: 'shop', door: 'outdoor' }[id] === g.tutAction.id), // the station the step wants (key or click)
  onQuestRefresh: (paid) => {
    const P = profile;
    if (paid && !guardBuy.ok && needsConfirm(refreshPrice(P))) return guardBuy(refreshPrice(P), () => ui.h.onQuestRefresh(true));
    if (paid && !spend(P, refreshPrice(P))) return false;
    if (!refreshBoard(P, paid)) return false;
    saveProfile(P); audio.ready && audio.click(); return true;
  },
  onRename: (v) => { const P = g.profile; P.subName = v; P.subNamed = true; saveProfile(P); hud.toast(`${v} painted on the hull`); },
  onSellItem: (k) => sellItem(k),
  onDaveSell: (k) => daveSell(k),
  payFinds: () => statValue(profile, 'paySalvage'),
  onDisplay: (k) => displaySpecimen(k),
  onCaveOffer: () => caveOffer(),
  onWare: (k) => wareBuy(k),
  toast: (text, kind) => hud.toast(text, kind),
  inSub: () => !!(g && g.earl && g.earl.inSub),
  // (5.0) the pet slot: an animal from the catch into it (only at the surface), or the pet out of it (to the
  // aquarium, or back to the sea)
  petHere: () => !!(g && (g.aboard || (g.earl.inSub && g.sub.y < 4 && Math.hypot(g.sub.x - BOAT.x, g.sub.y) < 40))),
  // (7.4.14) the pets panel: a pet he owns taken out, or the one out sent home
  onPet: (id) => { const P = profile; if (!P) return false; if (P.pet && P.pet.id === id) { P.pet = null; P.petStay = false; g.petStayAt = null; saveProfile(P); hud.toast(`${SPECIES_BY_ID[id].name} went home`); return true; } if (!petsOwned(P).has(id)) return false; petOut(id); return true; },
  onPetFeed: () => openPetFeed(),
  onTank: (act, where, i, to) => { // (3.0.15) a refusal is said inside the tank room too (the toasts are under it)
    const n0 = hud.toasts.length, last0 = hud.toasts[n0 - 1];
    const r = tankAction(act, where, i, to);
    // a refusal that didn't say why: say what it was
    if (r === false && act !== 'swaps' && hud.toasts.length === n0 && hud.toasts[n0 - 1] === last0) hud.toast(act === 'press' ? 'The chambers are full' : act === 'tobag' ? 'The bag is full' : 'The tank is full', 'warn');
    return r;
  },
  // (5.9.6) Use on a trap in the bag: at the surface the trap-setting card opens; anywhere else, why not
  // (5.17.0) a glow stick snapped from the bag, as the button does (in the water or the sub; on deck it is for later)
  // (6.6.2) a backup air tank used from the bag: the same three seconds of connecting as the sub's air button
  onAirUse: () => { const e = g && g.earl, sub = g && g.sub; if (!e || !e.inSub || sub.imploded) { hud.toast('In the sub: it plumbs into the cabin', 'warn'); return false; }
    if (!g.items.airTank) return false; if (g.tankFit) return true; if (sub.o2 >= sub.o2Max - 1) { hud.toast('The cabin air is full'); return false; }
    g.tankFit = 0.001; g.tankClank = 0; audio.ready && audio.click(); return true; },
  onGlowUse: () => { if (!g || g.aboard) { hud.toast('For the water: snap it once you are in', 'warn'); return false; } return dropGlow(); },
  onTrapUse: (k) => { const e = g.earl; const why = g.aboard ? 'Traps are set from the water: jump in, at the surface' : canSetHere(g);
    if (why) { hud.toast(why === 'Traps are set from the surface: come up first' ? 'You can only set a trap at the surface' : why, 'warn'); return false; }
    void e; g.toolSel = 'trap'; setTimeout(() => ui.openTrapSet(), 0); return 'open'; },
  onSetTrap: (type, depth) => {
    const why = canSetHere(g); if (why) { hud.toast(why, 'warn'); return true; }
    if (trapsFree(g, type) <= 0) { hud.toast('None of those left to set', 'warn'); return false; }
    const d = setTrap(g, type, depth); questEvent(profile, 'trap');
    const left = timeLeftText(TRAPS[type].dur); hud.toast(`${TRAPS[type].name} set at ${d} m`); hud.hint(TRAPS[type].winch ? `It fishes for ${left}, even with the game closed: empty it with the Margaret's winch at its buoy, or down where it hangs` : `It fishes for ${left}, even with the game closed: empty it at its buoy, or where it hangs`); saveProfile(profile);
    audio.ready && audio.click(); return true;
  },
  onCaveTrade: (keys) => caveTrade(keys),
  onNewGame: () => { profile = null; g.paused = false; withLoading(() => startRun()); },
  // the title screen: play a slot (a new diver in an empty or damaged one), or go back to the title
  onSlot: (n) => {
    const r = readSlot(n), go = (made) => withLoading(() => { setSlot(n); profile = r.state === 'ok' ? r.profile : null; g.made = made; startRun(); });
    if (r.state === 'ok') go(null);
    else ui.showCreator((made) => go(made)); // (6.7.0) a new diver: the creator first (Skip keeps Earl)
  },
  onTitle: (save) => {
    if (save && profile && g.mode === 'play') { syncProfile(); saveProfile(profile); }
    flushSave();
    withLoading(() => { g = newGame('menu'); ui.showTitle(); });
  },
  getProfile: () => profile,
  onSaveProfile: () => saveProfile(profile),
  atSurface: () => atSurface(), // (7.6.3)
  giveItem: (id) => { if (lockerFree(profile) < 1) { hud.toast('Locker full', 'warn'); return null; } const q = giveItem(profile, id); if (q) saveProfile(profile); return q; }, // (7.6.2) a scroll from the shelf
  canChangeGear: () => !!(g && g.mode === 'play' && !g.kill), // (6.0.0) gear changes anywhere (it changes what he can do, never what he has); never in its jaws
  // (5.6.9) the belt: on (from the locker, as many as fit) or off (all of it into the locker)
  onBelt: (k, on) => { const P = profile; if (!P || !g) return; P.spare = P.spare || {};
    if (on && (k === 'necklace' || k === 'glowAdv') && glowKind() !== k) { const cur = glowKind(); P.spare[cur] = (P.spare[cur] || 0) + (g.items[cur] || 0); g.items[cur] = 0; P.glowKind = k; hud.toast(`${SUPPLIES[k].name}s on the belt`); } /* (6.0.1) one kind on the belt: the other goes back to the locker */ if (on) { const m = Math.min(supplyMax(P, k) - (g.items[k] || 0), P.spare[k] || 0); if (m > 0) { g.items[k] = (g.items[k] || 0) + m; P.spare[k] -= m; } } else { P.spare[k] = (P.spare[k] || 0) + (g.items[k] || 0); g.items[k] = 0; } syncProfile(); saveProfile(P); audio.ready && audio.click(); },
  onMessage: (m) => hud.toast(m),
  moneyAt: () => (hud.moneyAt), // (5.7.5) where the money is on the HUD, for the quest's sum
  onEquip: (k) => { const ok = buy(k); return ok; },
  canSellGear: () => !!(g && g.mode === 'play'), // (7.5.5, owner) sold from the bag anywhere (once only aboard, at the station or Dave's)
});
// (4.10.0) the chart (K, or the chart button under the journal): the whole sea, and the player's own markers
// (6.8.1) Sail here: from the chart, to a sail point already found. Only aboard the boat with the sub in its cradle; a
// short loading screen, then the boat is at the buoy with its anchor down (no voyage, nothing lost, the sea as it was)
// (7.4.27, owner) nothing marks the chart by itself but the shops (home, Dave's, the station, the Old One's cave): places are
// the player's own to mark
const SAIL_SHOPS = new Set(['home', 'dave', 'station', 'cave']);
function sailFound(P) { const F = P.sail || (P.sail = { home: true }); for (const k of Object.keys(F)) if (!SAIL_SHOPS.has(k)) delete F[k]; return F; }
function sailWhy() {
  if (!g || g.mode !== 'play') return 'Not now';
  if (!(g.aboard || g.helm) || !g.sub.docked) return 'From the boat, with the sub aboard';
  return null;
}
function sailTo(id) {
  const pt = SAIL.find((s) => s.id === id), P = profile; if (!pt || !P || !sailFound(P)[id] || sailWhy()) return false;
  if (Math.abs(BOAT.x - (pt.x + SAIL_OFF)) < 15) return false;
  ui.chart.toggle(false); ui.closeAll && ui.closeAll();
  ui.sailScreen(pt, () => {
    BOAT.x = clamp(pt.x + SAIL_OFF, BOAT_MIN, BOAT_MAX); g.boatV = 0; g.helm = false; g.anchorDir = 0;
    const fl = g.world.floorAt(BOAT.x); g.anchored = true; g.anchorLen = fl; P.boatX = Math.round(BOAT.x); saveProfile(P);
    boardDeck(false, false); // he stands on deck when it clears
    if (renderer.cam) renderer.cam.x = BOAT.x - 7; // the view opens on the boat, not panning across the sea
  });
  return true;
}
function sailFind() { // passing over a point finds it
  const P = profile; if (!P || !g || g.mode !== 'play') return; const F = sailFound(P), e = g.earl;
  for (const s of SAIL) if (SAIL_SHOPS.has(s.id) && !F[s.id] && (Math.abs(e.x - s.x) < 60 || Math.abs(BOAT.x - s.x) < 60)) { F[s.id] = true; saveProfile(P); if (s.id !== 'home') hud.toast(`${s.name} is on your chart now`, 'note'); }
}
ui.chart = new Chart({ getGame: () => g, getProfile: () => profile, save: () => saveProfile(profile), sail: (id) => sailTo(id), sailWhy: () => sailWhy(), sailFound: () => sailFound(profile),
  follow: (m) => { g.markGuide = m || null; if (m) hud.toast(`Following: ${m.name}`); }, following: () => g.markGuide || null });

// ---------------- injuries ----------------
// Hidden injury points. Each point heals 15 s after the last one; 5 at once is fatal.
const INJURY = {
  speed: [1, 1, 0.9, 0.8, 0.65],
  air: [1, 1, 1, 1.2, 1.35],
  names: ['', 'Grazed', 'Wounded', 'Badly hurt', 'Critical'],
};
function hurt(dmg, sp, how) {
  if (g.siphon && how !== 'heat') return; // (7.6.8) mid-change, nothing touches him
  if (g.ironT > 0 && how !== 'heat') { g.ironHit = { t: g.time }; for (let i = 0; i < 10; i++) g.bubbles.push({ x: g.earl.x + (Math.random() - 0.5) * 0.6, y: g.earl.y + (Math.random() - 0.5) * 0.6, r: 0.03, w: Math.random() * 6, t: 0 }); return; } // (7.6.6, owner) Ironskin
  if (g.mode !== 'play') return;
  const suit = suitOf(profile);
  if (g.earl.hardened && Math.random() < 0.15 * g.earl.hardened) dmg = Math.max(0, dmg - 1); // (2.8.0) Hardened: a bite now and then does one less
  if (dmg <= 0) return;
  if (suit.bite && how !== 'whale' && how !== 'heat') { dmg = Math.max(0, dmg - suit.bite); if (!dmg) { g.fx.shake = Math.max(g.fx.shake, 0.8); hud.toast(`The ${suitOf(profile).name.toLowerCase()} turns the bite`, 'note'); audio.ready && audio.thud(0.3); return; } }
  g.injury += dmg; g.healT = 0;
  const e = g.earl;
  g.fx.redFlash = 1; g.fx.shake = Math.max(g.fx.shake, 1 + dmg * 0.4);
  for (let i = 0; i < 14 + dmg * 6; i++) g.blood.push({ x: e.x + (Math.random() - 0.5) * 0.8, y: e.y + (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: 0.15 + Math.random() * 0.35, t: 0, life: 6 + Math.random() * 4 });
  for (let i = 0; i < 20; i++) g.bubbles.push({ x: e.x + (Math.random() - 0.5), y: e.y - 0.3, r: 0.04 + Math.random() * 0.12, w: Math.random() * 6, t: -Math.random() * 0.3 });
  audio.ready && audio.hit(dmg);
  if (g.injury >= 5) { dieInjury(sp); return; }
  const verb = how === 'charge' ? 'Speared by' : how === 'lurk' ? 'Bitten by' : how === 'whale' ? 'Struck by' : how === 'heat' ? 'Scalded by' : 'Bitten by';
  const nm = sp.name.toLowerCase();
  hud.toast(`${verb} ${/^[aeiou]/.test(nm) ? 'an' : 'a'} ${nm}`, 'warn');
}
function damageSub(amt, sp) {
  const sub = g.sub;
  if (g.subGuardT > 0) { g.fx.flash = 0.15; return; } // (5.9.0) Bulwark: nothing hurts her while it holds
  g.subHit = true;
  sub.hull = Math.max(0, sub.hull - amt);
  g.fx.shake = Math.max(g.fx.shake, 2.2); g.fx.flash = 0.25;
  for (let i = 0; i < 60; i++) g.bubbles.push({ x: sub.x + (Math.random() - 0.5) * 6, y: sub.y + (Math.random() - 0.5) * 2, r: 0.05 + Math.random() * 0.2, w: Math.random() * 6, t: -Math.random() * 0.4 });
  audio.ready && audio.ram();
  hud.toast(`Rammed by ${sp.id === 187 ? 'an orca' : 'a ' + sp.name.toLowerCase()} · hull ${Math.round(sub.hull * 100)} %`, 'warn');
}
// ---------------- the boat: selling and buying ----------------
// Everything Earl carries (except lures and necklaces, which he keeps for use) goes in the basket.
// the sub's tank can only be emptied when the sub is at the boat
const subAtBoat = () => !g.sub.imploded && Math.hypot(g.sub.x - boatDock(), g.sub.y - 2.6) < 20;
function sellSpecimens(list, lines) {
  const groups = new Map();
  // the dead go in their own lot: half the plain market price and no rare-form bonus
  for (const sp of list) { const k = sp.id + ':' + (sp.cond <= 0.05 ? 'dead' : sp.variant || ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(sp); }
  for (const [gk, specs] of groups) {
    const [id, v] = gk.split(':');
    const dead = v === 'dead';
    const deepK = (s) => (g.earl.challengerSet && (s.from || 0) > 500 ? 1.4 : 1); // the Challenger set: the deep sells for more
    const key = 'sp' + id + (v && !dead ? ':' + v : ''), base = specs.reduce((a, s) => a + specimenValue(s) * deepK(s), 0) / specs.length;
    const worst = specs.reduce((a, s) => Math.min(a, s.cond), 1);
    const acc = !dead && specs.every((s) => s.acc);
    const name = dead ? `${SPECIES_BY_ID[id].name} (dead, half price)` : variantLabel(SPECIES_BY_ID[id], v || null) + (acc ? ' (acclimated)' : worst < 0.8 ? ` (${conditionName(worst)})` : '');
    lines.push(sell(profile, key, specs.length, base * statValue(profile, 'payFish'), name));
  }
}
hud.questMain = QUEST_MAIN;
// (3.0.0) the old one's card: one of her things (its skills, her price) or a bundle (its odds)
// (6.1.8) her shop, opened at her lure: her three things side by side on the paper, each with how long she keeps it out
// and her price in gold coins; giving her coins for one leaves the shop open, the new thing already in its place
function showOldShop() {
  const P = profile, st = oldStock(P), have = P.gold || 0, ROMAN = ['', 'I', 'II', 'III', 'IV'], HGI = `<img class="hg" src="${hourglassURL()}" alt="">`, GC = `<img class="gc" src="${pictureOf('gold', 1, 40, 40, true)}" alt="">`;
  const left = (it) => { const l = leftOf(it), hh = Math.floor(l / 3600), mm = Math.floor((l % 3600) / 60); return `${hh ? hh + ' h ' : ''}${mm} min`; };
  const col = (it, i) => { const def = ITEMS[it.id]; if (!def) return '';
    const sk = (it.sk || []).map(([k, l]) => `<div><b style="color:${skillCol(k, l)}">${SKILLS[k].name}${SKILLS[k].flat ? '' : ' ' + ROMAN[l]}</b></div>`).join('');
    // (6.1.9) given for: it stays, dimmed, and in place of her price an hourglass with the time until she lays out another
    const foot = it.sold ? `<div class="os-wait">${HGI}${left(it)}</div>` : `<small class="os-left">${HGI}${left(it)}</small><button data-oc="item:${i}" ${have < it.cost ? 'disabled' : ''}>${GC}${it.cost}</button>`;
    return `<div class="os-item r-${def.rarity}${it.sold ? ' gone' : ''}"><div class="os-pic"><img src="${pictureOf(def.kind, def, 240, 144, true)}" alt=""></div><small class="rr">${RARITY[def.rarity].name}</small><b style="color:${RARITY[def.rarity].col}">${def.name}</b><div class="oc-sk">${sk}</div>${foot}</div>`; };
  g.oldShopOpen = true;
  ui.oldCard(`<div class="os-head"><b>The Old One</b><span>${GC}${have}</span></div><div class="os-row">${st.items.map(col).join('')}</div>`);
}
function showOldCard(H) {
  g.oldShopOpen = false;
  // (6.1.1) one of her three things: its card, how long it stays, and her price in gold coins (nothing else will do)
  const P = profile, st = oldStock(P), ROMAN = ['', 'I', 'II', 'III', 'IV'];
  const it = st.items[H.i]; if (!it) return;
  const def = ITEMS[it.id], sk = (it.sk || []).map(([k, l]) => `<div><b style="color:${skillCol(k, l)}">${SKILLS[k].name}${SKILLS[k].flat ? '' : ' ' + ROMAN[l]}</b> ${SKILLS[k].what}</div>`).join('');
  const have = P.gold || 0, left = leftOf(it), hh = Math.floor(left / 3600), mm = Math.floor((left % 3600) / 60);
  ui.oldCard(`<div class="oc-top r-${def.rarity}"><img src="${pictureOf(def.kind, def, 240, 144, true)}" alt=""><div class="oc-t"><small class="rr">${RARITY[def.rarity].name}</small><b style="color:${RARITY[def.rarity].col}">${def.name}</b><span>${def.line || ''}</span>${def.good ? `<i>${def.good}</i>` : ''}<div class="oc-sk">${sk}</div></div></div>
    <div class="oc-buy"><small><img class="hg" src="${hourglassURL()}" alt="">${hh ? hh + ' h ' : ''}${mm} min</small><em class="oc-coins"><img class="gc" src="${pictureOf('gold', 1, 40, 40, true)}" alt="">${have}</em>${it.sold ? '' : `<button data-oc="item:${H.i}" ${have < it.cost ? 'disabled' : ''}><img class="gc" src="${pictureOf('gold', 1, 40, 40, true)}" alt="">${it.cost}</button>`}</div>`);
}
// (4.0.0) anything that costs more than a fifth of the cash on hand is asked about first
const needsConfirm = (price) => !!profile && price > 0 && price <= profile.cash && price > 0.2 * profile.cash;
function guardBuy(price, fn, after) {
  if (guardBuy.ok || !needsConfirm(price)) return fn();
  const pct = Math.round((price / profile.cash) * 100);
  ui.confirm(`Spend ${money(price)}?`, `That's quite a bit.`, 'Buy it', 'Not now', () => {
    guardBuy.ok = true; let r; try { r = fn(); } finally { guardBuy.ok = false; }
    if (r && after) after();
    ui.refreshOpen();
  });
  return false;
}
// what a buy key costs, for the question above (0: nothing asked)
function costOf(kind) {
  const P = profile; if (!P) return 0;
  const tail = (n) => kind.slice(n);
  if (kind.startsWith('chest:')) return (CHESTS[tail(6)] || {}).price || 0;
  if (kind.startsWith('item:')) return (ITEMS[tail(5)] || {}).price || 0;
  if (kind.startsWith('suit:')) return (ITEMS[tail(5)] || {}).price || 0;
  if (kind.startsWith('old:')) { const it = oldStock(P).items[+tail(4)]; return it && !it.sold ? it.price : 0; }
  if (kind.startsWith('up:')) return TRACKS[tail(3)] ? upgradeCost(P, tail(3)) : 0;
  if (kind.startsWith('gear:')) return (GEAR[tail(5)] || {}).price || 0;
  if (kind.startsWith('trap:')) return (TRAPS[tail(5)] || {}).price || 0;
  if (kind.startsWith('subnet:')) return (NETS_SUB[tail(7)] || {}).price || 0;
  if (kind === 'patch') return PATCH_PRICE;
  if (kind === 'replace') return replacementPrice(P);
  if (kind === 'gallery') return GALLERY_STEPS[P.galleryLv || 0] || 0;
  if (kind === 'canisters') return CANISTERS.price;
  if (SUB_ADDONS[kind]) return SUB_ADDONS[kind].price;
  if (SUPPLIES[kind]) return SUPPLIES[kind].price;
  return 0;
}
// (6.4.0) the daily gift: today's day of the seven, into the locker (a chest), the wallet, the belt or the coin stacks;
// a chest needs room in the locker, or it waits
function claimGift() {
  const P = profile; if (!P) return false; const st = calState(P); if (!st.ready) return false;
  const r = calWeek(P)[st.day], gains = []; // (7.4.12) the gift and its pearls shown together
  if (r.k === 'chest') { if (lockerFree(P) <= 0) { hud.toast('Locker full', 'warn'); return false; } giveItem(P, 'chest_' + r.v); gains.push({ kind: 'item', id: 'chest_' + r.v }); }
  else if (r.k === 'cash') { P.cash = Math.round(((P.cash || 0) + r.v) * 100) / 100; gains.push({ kind: 'cash', n: r.v }); } // (6.5.0) a gift's cash floats like the rest
  else if (r.k === 'glow') { P.spare = P.spare || {}; const gk = r.adv ? 'glowAdv' : 'necklace'; P.spare[gk] = (P.spare[gk] || 0) + r.v; gains.push({ kind: 'supply', id: gk, n: r.v }); }
  else if (r.k === 'trap') { convertOldTraps(P); if ((P.traps[r.v] || 0) >= TRAPS[r.v].max) { P.cash += TRAPS[r.v].price; hud.toast(`You have a ${TRAPS[r.v].name.toLowerCase()} already: ${money(TRAPS[r.v].price, false)} instead`, 'note'); } else { P.traps[r.v] = (P.traps[r.v] || 0) + 1; gains.push({ kind: 'trap', id: r.v }); } } // (6.5.1) the first week's fish trap; (7.3.0) one of each: its price if he has it
  else if (r.k === 'coin') { if (lockerFree(P) <= 0 && (P.gold || 0) % 10 === 0) { hud.toast('Locker full', 'warn'); return false; } P.gold = (P.gold || 0) + r.v; gains.push({ kind: 'coin', n: r.v }); }
  { const n = giftPearls(st.day); P.pearls = (P.pearls || 0) + n; gains.push({ kind: 'pearl', n }); ui.showGains(gains, true); } // (7.4.12, owner) the day's pearls
  calClaimed(P); saveProfile(P); audio.ready && audio.sale(); return true;
}
// (7.4.12, owner) a legendary caught pays 10 pearls, said beside it with the catch
const LEGEND_PEARLS = 100; // (7.6.2, owner)
function legendPearls(sp, x, y) {
  if (!sp || !(LEGENDARY.has(sp.id) || (rarityOf(sp) || {}).id === 'legendary')) return;
  profile.pearls = (profile.pearls || 0) + LEGEND_PEARLS; saveProfile(profile);
  (g.obsLabels || (g.obsLabels = [])).push({ c: null, x: x ?? g.earl.x, y: (y ?? g.earl.y) - 0.6, text: `+${LEGEND_PEARLS} pearls`, rar: null, nameCol: '#e4dcc6', t: 0 });
}
// (7.6.2, owner) pearls for the first time at a depth: 100 m 5, 500 m 50, 1,000 m 100, then every 1,000 m 100 plus 10 for
// each 1,000 m past the first (2,000 m 110, 3,000 m 120, 4,000 m 130), except 5,000 m, which pays 500; on into the trench
const depthMarks = (d) => { const m = [[100, 5], [500, 50]]; for (let k = 1000; k <= d; k += 1000) m.push([k, k === 5000 ? 500 : 100 + (k / 1000 - 1) * 10]); return m; };
function depthPearls() {
  const P = profile, e = g.earl; if (!P || g.mode !== 'play' || P.tut === 'on') return;
  const d = Math.max(e.y, e.inSub ? g.sub.y : 0);
  for (const [m, n] of depthMarks(d)) if (d >= m && (P.depthRec || 0) < m) {
    P.depthRec = m; P.pearls = (P.pearls || 0) + n; saveProfile(P); hud.pearlsWon(n);
    (g.obsLabels || (g.obsLabels = [])).push({ c: null, x: e.inSub ? g.sub.x : e.x, y: (e.inSub ? g.sub.y : e.y) - 0.8, text: `${m.toLocaleString('en-US')} m`, rar: null, nameCol: '#e4dcc6', t: 0 });
  }
}
// (7.4.14) a pet he owns out with him: its size and its glow come from petshop.js (pets.js updatePet)
function petOut(id) { const P = profile; P.pet = { id, since: Date.now() }; P.petStay = false; g.petStayAt = null; if (g.petC) { const F = g.fauna; if (F && F.list.includes(g.petC)) F.list.splice(F.list.indexOf(g.petC), 1); g.petC = null; } saveProfile(P); hud.toast(`${SPECIES_BY_ID[id].name} will follow you`, 'note'); }
function openPetFeed() { const P = profile; if (!P || !P.pet) return false; return petFeedOpen({ g, P, ui, hud, audio, save: () => saveProfile(P), onGrow: () => { if (g.petC) { const F = g.fauna; if (F.list.includes(g.petC)) F.list.splice(F.list.indexOf(g.petC), 1); g.petC = null; } } }); }
function oldBuy(what) { // (6.1.1) paid in gold coins only; the thing is replaced at once by another
  const P = profile, st = oldStock(P), it = st.items[+what.slice(5)];
  if (!it || it.sold) return false;
  if ((P.gold || 0) < it.cost) { hud.toast(`${it.cost} old coins needed`, 'warn'); return false; }
  P.gold -= it.cost; // the coins' own stacks free their room first
  if (lockerFree(P) <= 0) { P.gold += it.cost; hud.toast('Locker full', 'warn'); return false; }
  giveRolled(P, it); it.sold = true; oldStock(P); saveProfile(P); audio.ready && audio.sale();
  if (!g.oldShopOpen) ui.showGains([{ kind: 'item', id: it.id, how: 'From the old one' }]); // (6.1.9) in her shop the dimmed thing and its hourglass say it
  return true;
}
// (7.3.0, owner) a trap's catch at its buoy: sold where it comes up (at the Margaret's prices, the climb from deep water
// counted), or into the bag as before
function trapChoice(tr) {
  const T = TRAPS[tr.type], nm = T.name.toLowerCase(), n = tr.catch.length;
  const worth = tr.catch.reduce((a, q) => { const sp = SPECIES_BY_ID[q.id]; return a + (sp ? specimenValue(q) : 0); }, 0);
  ui.confirm(`${T.name}: ${n} inside`, `Sell the whole catch here, or put what fits in the bag. Animals brought up from deep water may not survive the climb.`, 'Sell all', 'Into the bag', () => {
    const r = cashOutTrap(g, tr); if (!r) return; marketTick(profile); const lines = []; sellSpecimens(r.list, lines);
    const total = lines.reduce((a, l) => a + l.total, 0); g.earned += total; questEvent(profile, 'trapHaul'); if (total > 0) questEvent(profile, 'sell', { total });
    audio.ready && audio.sale(); saveProfile(profile); ui.showLedger && ui.showLedger({ lines, total });
    hud.toast(`${T.name}: sold for ${money(total, false)}${r.stowed ? ` · the ${nm} comes up` : ''}`, 'note'); void worth;
  }, () => {
    const r = emptyTrap(g, tr, 'haul'); if (r.n) questEvent(profile, 'trapHaul');
    hud.toast(r.n ? `${r.n} into the bag${r.left ? ` · ${r.left} still in the ${nm}: the bag is full` : ''}${r.stowed ? ` · the ${nm} comes up` : ''}` : `The bag is full: ${r.left} still in the ${nm}`, r.left ? 'warn' : '');
    saveProfile(profile);
  });
}
function sellAll() {
  marketTick(profile);
  // old gold coins for every live animal from the deep that leaves the boat today
  
  /* (6.1.0) no coins from catches or sapphires: gold coins come only from chests */
  const lines = [];
  if (g.bag.length) { sellSpecimens(g.bag, lines); g.bag = []; }
  if (g.subTank.length && subAtBoat()) { sellSpecimens(g.subTank, lines); g.subTank = []; }
  // the research program: one line per species tagged, each tag a little less than the last
  const tg = new Map();
  for (const t of g.tags) { if (!tg.has(t.key)) tg.set(t.key, []); tg.get(t.key).push(t); }
  for (const [k, list] of tg) lines.push(sell(profile, k, list.length, list[0].value * statValue(profile, 'payFish'), `Tag data: ${list[0].name}`));
  g.tags = [];
  // the institute: first photographs
  for (const ph of g.photos) {
    const pv = Math.round(ph.value * statValue(profile, 'payFish') * 100) / 100;
    profile.cash = Math.round((profile.cash + pv) * 100) / 100; profile.lifetime = Math.round((profile.lifetime + pv) * 100) / 100;
    lines.push({ label: `Photograph: ${ph.name}`, n: 1, total: pv });
    if (ph.sk && !(profile.photos || []).includes(ph.sk)) profile.photos = [...(profile.photos || []), ph.sk];
  }
  g.photos = []; profile.roll = [];
  for (const [k, n] of Object.entries(g.inv)) {
    if (!n || !GOODS[k] || k === 'coral') continue;
    lines.push(sell(profile, k, n, GOODS[k].price * statValue(profile, 'paySalvage'), GOODS[k].name));
    g.inv[k] = 0;
  }
  if (!lines.length) return null;
  const total = lines.reduce((a, l) => a + l.total, 0);
  g.earned += total;
  if (total > 0) questEvent(profile, 'sell', { total });
  if (total > 0) audio.cue && audio.cue('sale');
  saveProfile(profile);
  audio.ready && audio.sale();
  return { lines, total };
}
// sell only what is in the basket (2.5.2): the rest is set aside, everything left is sold as usual, and
// what was set aside goes back. Keys as the sell screen makes them: sp:id:variant, tag:key, photo:key, good:k
// (2.6.8) Keep on the Sell tab marks an animal (s.kept): it stays in the catch, every sale leaves it alone,
// and it goes into the aquarium only when the player puts it there, at the aquarium. Each press marks (or
// unmarks) one: the healthiest live one of that kind not yet kept (or the weakest kept one, to unmark).
function keepMark(key, on) {
  const pool = g.bag.concat(subAtBoat() ? g.subTank : []).filter((s) => displayKey(s) === key && !!s.kept !== on && (!on || s.cond > 0.05));
  if (!pool.length) return false;
  const s = pool.reduce((a, x) => ((on ? x.cond > a.cond : x.cond < a.cond) ? x : a), pool[0]);
  if (on) s.kept = true; else delete s.kept;
  audio.ready && audio.click();
  return true;
}
function withKept(fn) {
  const held = { bag: g.bag.filter((s) => s.kept), subTank: g.subTank.filter((s) => s.kept) };
  if (!held.bag.length && !held.subTank.length) return fn();
  g.bag = g.bag.filter((s) => !s.kept); g.subTank = g.subTank.filter((s) => !s.kept);
  try { return fn(); } finally { g.bag = g.bag.concat(held.bag); g.subTank = g.subTank.concat(held.subTank); }
}
// (2.6.8) what could go into the aquarium from here: the live animals aboard (the bag, and the sub's tank when
// the sub is alongside), the kept ones first
function aquariumCandidates() {
  const out = [];
  const add = (L, where) => L.forEach((s, i) => { if (s.cond > 0.05) out.push({ where, i, s, why: displayRefusal(profile, s) }); });
  add(g.bag, 'bag'); if (subAtBoat()) add(g.subTank, 'subTank');
  return out.sort((a, b) => (b.s.kept ? 1 : 0) - (a.s.kept ? 1 : 0) || b.s.cond - a.s.cond);
}
function sellSome(keys) {
  const sel = new Set(keys); if (!sel.size) return null;
  const ak = (s) => 'sp:' + s.id + ':' + (s.variant || '');
  const keep = { bag: g.bag.filter((s) => !sel.has(ak(s))), sub: g.subTank.filter((s) => !sel.has(ak(s))), tags: g.tags.filter((t) => !sel.has('tag:' + t.key)), photos: g.photos.filter((p) => !sel.has('photo:' + p.key)), inv: {} };
  g.bag = g.bag.filter((s) => sel.has(ak(s))); g.subTank = g.subTank.filter((s) => sel.has(ak(s)));
  g.tags = g.tags.filter((t) => sel.has('tag:' + t.key)); g.photos = g.photos.filter((p) => sel.has('photo:' + p.key));
  for (const k of Object.keys(g.inv)) if (GOODS[k] && !sel.has('good:' + k) && g.inv[k]) { keep.inv[k] = g.inv[k]; g.inv[k] = 0; }
  const r = sellAll();
  g.bag = g.bag.concat(keep.bag); g.subTank = g.subTank.concat(keep.sub); g.tags = g.tags.concat(keep.tags); g.photos = g.photos.concat(keep.photos);
  for (const [k, n] of Object.entries(keep.inv)) g.inv[k] = (g.inv[k] || 0) + n;
  saveProfile(profile);
  return r;
}
function sellItem(kind) {
  if (!g.items[kind]) return null;
  marketTick(profile);
  g.items[kind]--;
  const line = sell(profile, kind, 1, GOODS[kind].price, GOODS[kind].name);
  g.earned += line.total;
  syncProfile(); saveProfile(profile);
  return { lines: [line], total: line.total };
}
// keep a live animal for the aquarium instead of selling it (the healthiest one of its kind)
function displaySpecimen(key) {
  const pools = [g.bag].concat(subAtBoat() ? [g.subTank] : []);
  let best = null, pool = null;
  for (const L of pools) for (const s of L) if (displayKey(s) === key && (!best || s.cond > best.cond)) { best = s; pool = L; }
  if (!best) return false;
  const why = displayRefusal(profile, best);
  if (why) { hud.toast(why, 'warn'); return false; }
  pool.splice(pool.indexOf(best), 1);
  display(profile, best);
  saveProfile(profile);
  hud.toast('Into the aquarium', 'big');
  audio.ready && audio.note();
  return true;
}
// ---------------- the old one: a giant anglerfish in the west wall's cave ----------------
// Once a dive she takes fish for old gold coins: 30 % under the market, except the one she
// craves this dive, which she pays three times the market for.
const ANGLER_RATE = 0.7, CRAVE_RATE = 3;
// (2.7.0) Dave's Haul: at his airlock (docked in the sub, or swimming), F opens his shop
const nearStation = () => { const St = g.world.station; return !!St && dist(g.earl.x, g.earl.y, St.x + STATION_COLLAR.dx + 1.5, St.y + STATION_COLLAR.dy) < (g.earl.inSub ? 16 : 9); }; // (3.0.0) (7.0.13) from the sub, farther: its hull keeps it off
const nearDave = () => { const D = g.world.dave; return !!D && dist(g.earl.x, g.earl.y, D.x + 6.5, D.y - 3.1) < (g.earl.inSub ? 16 : 10); };
// he buys odd finds for a quarter more than the Margaret pays: one kind, or 'all' of them
function daveSell(k) {
  const keys = k === 'all' ? DAVE_FINDS.filter((q) => (g.inv[q] || 0) > 0) : [k];
  let total = 0;
  for (const q of keys) {
    const n = g.inv[q] || 0; if (!n || !DAVE_FINDS.includes(q)) continue;
    const line = sell(profile, q, n, GOODS[q].price * DAVE_RATE * statValue(profile, 'paySalvage'), GOODS[q].name);
    g.inv[q] = 0;
    total += line.total;
  }
  if (!total) return null;
  g.earned += total; saveProfile(profile);
  hud.toast(`Dave pays ${money(total)}`, 'big'); audio.ready && audio.sale();
  return total;
}
const nearAngler = () => dist(g.earl.x, g.earl.y, CAVE.x + 14, CAVE.y) < 16;
const inCave = (x, y) => x < CAVE.x + 32 && Math.abs(y - CAVE.y) < 14;
function cravingOf() {
  if (!g.craving) {
    const pool = SPECIES.filter((s) => canTakeLive(s) && s.dmin >= 150 && s.dmin <= 2500);
    g.craving = pool[Math.floor(Math.random() * pool.length)].id;
  }
  return g.craving;
}
function cavePools() { return [g.bag].concat(!g.sub.imploded && dist(g.sub.x, g.sub.y, g.earl.x, g.earl.y) < 30 ? [g.subTank] : []); }
function caveOffer() {
  const crave = cravingOf(), pay = statValue(profile, 'payFish');
  const groups = new Map();
  for (const L of cavePools()) for (const s of L) {
    const k = s.id + ':' + (s.variant || '');
    if (!groups.has(k)) groups.set(k, { key: k, id: s.id, variant: s.variant || null, n: 0, total: 0, craving: s.id === crave });
    const gr = groups.get(k);
    gr.n++; gr.total += specimenValue(s) * pay * (s.id === crave && s.cond > 0.05 ? CRAVE_RATE : ANGLER_RATE);
  }
  for (const gr of groups.values()) gr.total = Math.round(gr.total * 100) / 100;
  return { groups: [...groups.values()], craving: SPECIES_BY_ID[crave], traded: g.caveTraded || null };
}
function caveTrade(keys) {
  if (g.caveTraded || !keys.length) return null;
  const off = caveOffer(), want = new Set(keys);
  const lines = [];
  let coins = 0;
  for (const L of cavePools()) for (const s of L) if (want.has(s.id + ':' + (s.variant || ''))) coins += coinsFor(s) + (s.id === off.craving.id ? 1 : 0);
  for (const gr of off.groups) if (want.has(gr.key)) lines.push({ label: variantLabel(SPECIES_BY_ID[gr.id], gr.variant) + (gr.craving ? ' (craved)' : ''), n: gr.n, total: gr.total });
  if (!lines.length) return null;
  for (const L of cavePools()) for (let i = L.length - 1; i >= 0; i--) if (want.has(L[i].id + ':' + (L[i].variant || ''))) L.splice(i, 1);
  const total = Math.round(lines.reduce((a, l) => a + l.total, 0) * 100) / 100;
  profile.cash = Math.round((profile.cash + total) * 100) / 100;
  profile.lifetime = Math.round((profile.lifetime + total) * 100) / 100;
  g.earned += total;
  profile.coins = (profile.coins || 0) + coins;
  g.caveTraded = { lines, total, coins };
  saveProfile(profile);
  audio.ready && audio.sale();
  hud.toast(`The old one pays ${money(total)}${coins ? ` + ${coins} coin${coins > 1 ? 's' : ''}` : ''}`, 'big');
  return g.caveTraded;
}
function wareBuy(k) {
  const P = profile, W = WARES[k];
  if (!W || (P.coins || 0) < W.coins) return false;
  if (k === 'blessing') { if (g.blessed) return false; g.blessed = true; hud.toast('Blessed: the deep looks away', 'big'); }
  else if (k === 'eye') { if (P.eye) return false; P.eye = true; hud.toast('Sapphires now show on sonar', 'big'); }
  P.coins -= W.coins;
  saveProfile(P); audio.ready && audio.sale();
  return true;
}
// the aquarium gallery aboard: pet, feed, name, sell, or send one to the sub to be released at home
function galleryAction(act, key, v) {
  const P = profile, A = aquariumOf(P);
  if (act === 'light') { A.light = key; saveProfile(P); return true; }
  if (act === 'room') return buy('gallery'); // (3.0.15) more room, bought at the aquarium itself
  if (act === 'place') { // (2.6.8) from the catch into the tank, at the aquarium
    const [where, i] = key.split(':'), L = where === 'subTank' ? g.subTank : g.bag, s = L[+i];
    if (!s || (where === 'subTank' && !subAtBoat())) return false;
    const why = displayRefusal(P, s); if (why) { hud.toast(why[0].toUpperCase() + why.slice(1), 'warn'); return false; }
    L.splice(+i, 1); delete s.kept; display(P, s); saveProfile(P);
    hud.toast(`${SPECIES_BY_ID[s.id].name} added to the aquarium`, 'big'); audio.ready && audio.tankPlop ? audio.tankPlop() : audio.ready && audio.note();
    return true;
  }
  const d = A.display[key];
  if (!d) return false;
  const sp = SPECIES_BY_ID[d.id], who = d.name || `the ${sp.name.toLowerCase()}`;
  if (act === 'pet') { audio.ready && audio.uiSoft(); audio.calmBoost && audio.calmBoost(0.05); }
  else if (act === 'feed') {
    if (d.fedT > 0) { hud.toast(`${who[0].toUpperCase() + who.slice(1)} isn't hungry yet`); return false; }
    d.fedT = 90; hud.toast(`${who[0].toUpperCase() + who.slice(1)} takes the food`); audio.ready && audio.tankPlop();
  } else if (act === 'rename') { d.name = String(v || '').replace(/[<>]/g, '').trim().slice(0, 18); hud.toast(d.name ? `Named ${d.name}` : 'Name taken off its tank'); }
  else if (act === 'sell') {
    const pay = Math.round(gallerySale(d) * statValue(P, 'payFish') * 100) / 100;
    P.cash = Math.round((P.cash + pay) * 100) / 100; P.lifetime = Math.round(((P.lifetime || 0) + pay) * 100) / 100; g.earned += pay;
    delete A.display[key]; hud.toast(`Sold ${who} for ${money(pay)}`); audio.ready && audio.sale();
  } else if (act === 'tosub') {
    if (g.sub.imploded || Math.hypot(g.sub.x - boatDock(), g.sub.y - 2.6) > 20) { hud.toast('Bring the sub alongside first', 'warn'); return false; }
    const spec = { id: d.id, len: d.len || sp.len, cond: d.cond, from: d.from || Math.round((sp.dmin + sp.dmax) / 2), t: g.time, variant: d.variant || undefined, aq: { name: d.name, happy: isHappy(d), famous: !!d.famous } };
    if (d.variant) spec.mult = variantMult(d.variant);
    if (!seal(g, spec, spec.len >= 1.2 ? BIG : -1) && !seal(g, spec, BIG)) { hud.toast(spec.len >= 1.2 ? 'Needs room in the large tank' : 'No free chamber in the sub', 'warn'); return false; }
    g.subTank.push(spec); delete A.display[key];
    hud.toast(`${who[0].toUpperCase() + who.slice(1)} is in the sub · release it at ${spec.from} m`, 'big');
    audio.ready && audio.chamberPlop();
  }
  saveProfile(P);
  return true;
}
// the tank room: move animals between the bag, the open tank and the pressure tanks, or let one go
function tankAction(act, where, i, to = -1) {
  const e = g.earl;
  if (!e.inSub && !(act === 'release' && where === 'bag')) return false; // (5.15.3) a fish in the bag can be thrown back anywhere
  const L = where === 'bag' ? g.bag : g.subTank, s = L[i];
  if (!s) return false;
  if (act === 'press') {
    // into a chamber (the one it was dropped on): from the bag, the open tank, or another chamber
    if (s.pressed && s.chamber === to) return false;
    if (to !== BIG && tooBig(s)) { hud.toast('Too big: needs the large tank', 'warn'); return false; }
    const was = s.chamber;
    if (s.pressed) { s.pressed = false; }
    if (!seal(g, s, to)) { if (was !== undefined && where !== 'bag') { s.pressed = true; s.chamber = was; } hud.toast(to === BIG ? 'The large tank is full' : to >= 0 ? 'That chamber is in use' : 'All chambers in use', 'warn'); return false; }
    if (where === 'bag') { L.splice(i, 1); g.subTank.push(s); }
    audio.ready && audio.chamberPlop();
    const home = s.home ?? s.from ?? 0, rating = chamberRating(g);
    hud.toast(home > rating ? `${SPECIES_BY_ID[s.id].name}: chamber only reaches ${rating} m` : `${SPECIES_BY_ID[s.id].name}: pressurising to ${home} m`);
  } else if (act === 'swap') {
    // (2.7.4) all chambers full: this animal takes chamber `to`, and the one in it goes where this one was
    const o = g.subTank.find((q) => q.pressed && q.chamber === to);
    if (!o || o === s) return false;
    if (tooBig(s)) { hud.toast('Too big: needs the large tank', 'warn'); return false; }
    const wasPressed = s.pressed && where !== 'bag', wasChamber = s.chamber, wasPile = !!s.pile;
    o.pressed = false; delete o.chamber;
    if (s.pressed) { s.pressed = false; delete s.chamber; }
    if (!seal(g, s, to)) { o.pressed = true; o.chamber = to; if (wasPressed) { s.pressed = true; s.chamber = wasChamber; } return false; }
    if (where === 'bag') { L.splice(i, 1); g.subTank.push(s); g.subTank.splice(g.subTank.indexOf(o), 1); g.bag.push(o); }
    else if (wasPressed) seal(g, o, wasChamber);
    else if (wasPile) o.pile = true;
    audio.ready && audio.chamberPlop();
    hud.toast(`${SPECIES_BY_ID[s.id].name} and ${SPECIES_BY_ID[o.id].name.toLowerCase()} swapped`);
  } else if (act === 'open') {
    if (where === 'tank' && !s.pressed && !s.pile) return false;
    if (!tankFits(g, { ...s, pressed: false, pile: false })) { hud.toast('No room in the open tank', 'warn'); return false; }
    if (where === 'bag') { L.splice(i, 1); g.subTank.push(s); }
    s.pressed = false; delete s.chamber; delete s.pile;
    audio.ready && audio.tankPlop();
  } else if (act === 'tobag') {
    // back into the catch bag (to carry it to the other room, or out)
    if (where === 'bag') return false;
    if (bagUsed(g) + spacesOf(s) > bagSlots(g)) { hud.toast('Not enough room in the bag', 'warn'); return false; }
    L.splice(i, 1); s.pressed = false; delete s.chamber; delete s.pile; g.bag.push(s);
    audio.ready && audio.uiSoft();
  } else if (act === 'release') {
    // a Happy fish from the gallery, let go in its own water, stays there for good (and can't be caught)
    if (s.aq && s.aq.happy && s.cond > 0.05) {
      const home = s.home ?? s.from ?? 0;
      if (Math.abs(g.sub.y - home) > 60) { hud.toast(`Release it at about ${home} m`, 'warn'); return false; }
      L.splice(i, 1);
      const r = { id: s.id, variant: s.variant || null, name: s.aq.name || '', famous: !!s.aq.famous, x: Math.round(g.sub.x), y: Math.round(g.sub.y), when: Date.now() };
      profile.released = [...(profile.released || []), r]; saveProfile(profile);
      spawnReleased(r);
      hud.toast(`${r.name || 'The ' + SPECIES_BY_ID[s.id].name.toLowerCase()} swims home`, 'big');
      audio.ready && audio.note();
      return true;
    }
    L.splice(i, 1);
    if (s.cond > 0.05) {
      // (5.15.3) thrown back from the bag while swimming (or from the deck), it goes back in beside Earl, not the sub
      const e = g.earl, out = where === 'bag' && !e.inSub, fc = out ? (e.facing || 1) : g.sub.facing;
      const c = g.fauna.makeFish(SPECIES_BY_ID[s.id], out ? e.x + fc * 2 : g.sub.x + g.sub.facing * 3, out ? Math.max(1.5, e.y + 0.5) : g.sub.y + 1, fc, g.fauna.groupId++, true);
      if (s.variant) c.variant = s.variant;
      g.fauna.list.push(c);
      hud.toast(`The ${SPECIES_BY_ID[s.id].name.toLowerCase()} goes back into the dark`);
    } else hud.toast('It sinks away');
  } else return false;
  if (act === 'release') audio.ready && audio.click();
  return true;
}
// (3.4.0) the animals' news, a line a kind: by name if there is one, else counted
function sayFish(FM, whereOf) {
  const nm = (s) => SPECIES_BY_ID[s.id].name.toLowerCase();
  if (FM.deaths.length === 1) { const s = FM.deaths[0]; hud.toast(s.airDeath ? `The ${nm(s)} suffocated` : `The ${nm(s)} died${s.pressDeath ? ' of barotrauma' : ''}`, 'warn'); }
  else if (FM.deaths.length > 1) hud.toast(`${FM.deaths.length} animals died${FM.deaths.every((s) => s.pressDeath) ? ' of barotrauma' : ''}`, 'warn');
  const dead = new Set(FM.deaths), dying = new Set(FM.ev.filter((e) => /dying|Dying/.test(e.type)).map((e) => e.s));
  const by = {};
  for (const ev of FM.ev) {
    if (dead.has(ev.s) || ((ev.type === 'stressed' || ev.type === 'bagStress') && dying.has(ev.s))) continue;
    (by[ev.type] || (by[ev.type] = [])).push(ev);
  }
  const one = {
    air: (ev) => `The ${nm(ev.s)} is about to suffocate`, // (4.1.1)
    bagStress: (ev) => `The ${nm(ev.s)} is too ${ev.deeper ? 'deep' : 'shallow'}`, // (5.15.5) which way it suffers, so you know whether to go down or up
    bagDying: (ev) => `The ${nm(ev.s)} is dying of barotrauma`,
    stressed: (ev) => `The ${nm(ev.s)} is stressed`,
    dying: (ev) => ev.s.pile ? `The ${nm(ev.s)} is suffocating` : `The ${nm(ev.s)} is dying${ev.press ? ' of barotrauma' : ''}`,
  };
  const many = {
    air: (n) => `${n} animals are about to suffocate`,
    bagStress: (n, L) => L && L.every((e) => e.deeper) ? `${n} animals are too deep` : L && L.every((e) => !e.deeper) ? `${n} animals are too shallow` : `${n} animals are at the wrong depth`,
    bagDying: (n) => `${n} animals are dying of barotrauma`,
    stressed: (n) => `${n} animals are stressed`,
    dying: (n) => `${n} animals are dying`,
  };
  for (const type of ['air', 'bagDying', 'dying', 'bagStress']) { // (5.5) not 'stressed': the bag's coloured dot already says it, at once after every catch
    const L = by[type]; if (!L) continue;
    // (6.1.9) said once: the same news again stays quiet until the count changes, or for half a minute
    const S0 = (g.fishSaid = g.fishSaid || {}), was = S0[type]; if (was && was.n === L.length && g.time - was.t < 30) continue; S0[type] = { n: L.length, t: g.time };
    hud.toast(L.length === 1 ? one[type](L[0]) : many[type](L.length, L), 'warn');
  }
}
function spawnReleased(r) {
  const sp = SPECIES_BY_ID[r.id];
  if (!sp) return;
  const c = g.fauna.makeFish(sp, r.x + (Math.random() - 0.5) * 6, r.y + (Math.random() - 0.5) * 3, Math.random() < 0.5 ? -1 : 1, g.fauna.groupId++, true);
  if (r.variant) c.variant = r.variant;
  c.pet = r; c.flee = 0; c.placed = true;
  g.fauna.list.push(c);
}
function syncProfile() {
  const P = profile;
  P.hull = g.sub.hull; P.subLost = !!g.sub.imploded;
  P.items = { necklace: g.items.necklace, glowAdv: g.items.glowAdv || 0, airTank: g.items.airTank, nets: Object.assign({}, netsOf(g.items)), film: g.items.film };
  P.roll = g.photos.slice(); // (5.0) the pictures he carries, kept with the save
  P.journal = [...g.journal.entries()]; P.notes = g.notes;
  P.deepest = Math.max(P.deepest || 0, Math.round(g.earl.maxDepth));
  // (4.12.6) where the dive is, so a reload carries on from here: Earl, the sub, what he carries and what is in her tank
  if (g.mode === 'play' && !g.kill) {
    const e = g.earl, s = g.sub;
    P.resume = { v: 1, at: Date.now(), time: g.time, survival: g.survival, aboard: !!g.aboard || !!g.helm,
      e: { x: e.x, y: e.y, inSub: !!e.inSub, o2: e.o2, facing: e.facing || 1 },
      sub: { x: s.x, y: s.y, facing: s.facing || 1, o2: s.o2, docked: !!s.docked, lightsOn: !!s.lightsOn },
      bag: g.bag, subTank: g.subTank, inv: g.inv };
  }
}
// (4.12.6) carrying on from the last save of a dive (a reload, a crash): everything as it was, times shifted to the new clock
function resumeDive(P) {
  const r = P.resume; if (!r || r.v !== 1 || g.mode !== 'play') return false;
  if (typeof r.time === 'number') g.time = r.time; // (4.17.4) the time of day it was
  const dt0 = g.time - (r.time || 0), shift = (list) => (list || []).map((s) => (typeof s.t === 'number' ? Object.assign({}, s, { t: s.t + dt0 }) : Object.assign({}, s)));
  g.bag = shift(r.bag); g.subTank = shift(r.subTank); g.inv = Object.assign({}, r.inv || {}); g.survival = r.survival || 0;
  if (r.aboard) return true; // on the Margaret: back on her deck, the catch with him
  const e = g.earl, s = g.sub;
  g.aboard = null; g.helm = false;
  Object.assign(s, { x: r.sub.x, y: r.sub.y, facing: r.sub.facing, o2: Math.min(s.o2Max || r.sub.o2, r.sub.o2), docked: r.sub.docked, lightsOn: r.sub.lightsOn });
  e.inSub = r.e.inSub; e.x = r.e.inSub ? s.x : r.e.x; e.y = r.e.inSub ? s.y : r.e.y; e.o2 = Math.min(e.o2Max || r.e.o2, r.e.o2); e.facing = r.e.facing; e.vx = e.vy = 0;
  renderer.cam.x = e.x; renderer.cam.y = e.y;
  hud.toast('Carrying on where you left off');
  return true;
}
// buy(kind): 'tank' | 'fins' | 'sub' | 'patch' | 'replace' | 'necklace'
function buy(kind) {
  const P = profile, sub = g.sub, e = g.earl;
  let ok = false;
  if (kind.startsWith('chest:')) {
    // (6.4.0) a chest bought: into the locker as a thing of its own, to be opened from the bag
    const key = kind.slice(6), C = CHESTS[key];
    if (C && lockerFree(P) <= 0) hud.toast('Locker full', 'warn');
    else if (C && spend(P, C.price)) { const q = giveItem(P, 'chest_' + key); if (q) { q.paid = true; ok = true; questEvent(P, 'bought'); saveProfile(P); audio.ready && audio.sale(); ui.showGains([{ kind: 'item', id: 'chest_' + key, how: 'Bought' }]); } }
    return ok;
  }
  if (kind.startsWith('open:')) {
    // (6.4.0) a chest opened from the bag: only with room for all it can give (its own space comes free)
    const u = kind.slice(5), K = kitOf(P), q = K.items.find((x) => x.u === u), it = q && ITEMS[q.id], C = it && CHESTS[it.chestKey];
    if (!C) return false;
    if (lockerFree(P) < C.n) { hud.toast(`Locker full: needs ${C.n + 1} spaces`, 'warn'); return false; } // (6.5.8) room for every find and a coin (the chest's own space comes free)
    K.items = K.items.filter((x) => x.u !== u);
    const roll = rollChestAll(it.chestKey), finds = [];
    for (const def of roll.items) { const g2 = giveItem(P, def.id); if (g2) finds.push({ q: g2, def }); }
    let coin = false; if (roll.coin) { P.gold = (P.gold || 0) + 1; if (lockerFree(P) < 0) P.gold--; else coin = true; }
    saveProfile(P); ui.chestFromBag = true; ui.closeAll && ui.toggleInventory && ui.toggleInventory(false); ui.showChest(it.chestKey, finds, coin); audio.ready && audio.sale();
    return true;
  }
  if (kind.startsWith('item:')) {
    // (2.8.0) bought: into the locker, put on by hand in the inventory (B). Not if the locker is full.
    const it = ITEMS[kind.slice(5)];
    if (it && lockerFree(P) <= 0) hud.toast('Locker full', 'warn');
    else if (it && spend(P, it.price)) {
      const q = giveItem(P, it.id); if (q) q.paid = true; ok = true; questEvent(P, 'bought'); // (4.3.0)
      ui.showGains([{ kind: 'item', id: it.id, how: 'Bought' }]); tipEquip();
      if (P.wish === it.id) P.wish = null;
    }
  } else if (kind.startsWith('on2:')) { // (7.6.4, owner) the second scroll slot
    const r = putOn2(P, kind.slice(4));
    if (r === 'heart') { hud.toast('One Heart (mythical skill) at a time', 'warn'); return false; }
    if (r === 'family') { hud.toast('Not two scrolls of one family', 'warn'); return false; }
    if (r !== 'ok') return false; ok = true;
  } else if (kind.startsWith('off:')) {
    const r = takeOff(P, kind.slice(4)); // (3.0.31) back into the locker (a starter goes back on for the five that need one)
    if (r === 'full') hud.toast('Locker full', 'warn');
    else if (r) { applyKit(e, P); ok = true; }
  } else if (kind.startsWith('on:')) {
    // (2.8.0) on:<uid> puts on a thing from the locker
    const q = instOf(P, kind.slice(3));
    const bagWas = ITEMS[q && q.id] && ITEMS[q.id].kind === 'bag' ? kitOf(P).on.bag : null; // (6.0.0) a smaller bag cannot take what he is carrying
    const put = !!(q && putOn(P, q.u));
    if (put && bagWas && g.bag && bagUsed(g) > bagSlots(g)) { putOn(P, bagWas); hud.toast(`This bag holds ${bagSlots(g)}: you are carrying ${bagUsed(g)}`, 'warn'); }
    else if (put) { applyKit(e, P); ok = true; const key = { cam: 2 }[ITEMS[q.id].kind]; if (key && g.toolSel !== ITEMS[q.id].kind) hud.hint(`Tap the swap button by the net for the ${ITEMS[q.id].name.toLowerCase()}`); }
  } else if (kind.startsWith('sellscroll:')) { // (7.4.11, owner) a scroll is not sold on a tap: asked first. (7.6.2, owner) sold only for pearls, a quarter of its shelf price
    const q = instOf(P, kind.slice(11)); if (!q || isOn(P, q)) return false; const it = ITEMS[q.id], n = scrollSellPearls(q.id), R = RARITY[it.rarity];
    ui.confirm('Sell ' + it.name + '?', (R ? R.name + ' ' : '') + 'scroll · ' + n.toLocaleString('en-US') + ' pearls', 'Sell, ' + n.toLocaleString('en-US') + ' pearls', 'Keep', () => {
      if (removeItem(P, q.u)) { P.pearls = (P.pearls || 0) + n; saveProfile(P); hud.toast('Sold ' + it.name); hud.pearlsWon(n); } ui.renderInventory && ui.renderInventory(); });
    return false;
  } else if (kind.startsWith('loadlock:')) { hud.toast('At the surface', 'note'); return false; // (7.6.7) the padlocked Load
  } else if (kind.startsWith('loadfull-done:')) { return false;
  } else if (kind.startsWith('load:') || kind.startsWith('loadfull:')) { // (7.6.3, owner) charges loaded onto a scroll, at the surface only
    const full = kind.startsWith('loadfull:'), q = instOf(P, kind.slice(full ? 9 : 5)), A = q && abilityOf(q.id); if (!A) return false;
    if (!atSurface()) { hud.toast('Load at the surface', 'warn'); return false; }
    const mx = maxLoad(A), have = q.load || 0, k = full ? mx - have : Math.min(1, mx - have), cost = k * chargePrice(A); if (k <= 0) return false;
    if ((P.pearls || 0) < cost) { hud.toast('Not enough pearls', 'warn'); return false; }
    P.pearls -= cost; q.load = have + k; ok = true; audio.ready && audio.uiSoft && audio.uiSoft();
  } else if (kind.startsWith('combine:')) { // (7.4.11, owner) three of a scroll at one rarity, none worn, become one of the next rarity
    const id = kind.slice(8), it = ITEMS[id], NX = it && NEXT_TIER[it.rarity], nId = NX && `ab_${it.fam}_${NX}`; // (7.4.15) three legendaries make the mythical
    const all = kitOf(P).items.filter((x) => x.id === id).sort((a, b) => isOn(P, a) - isOn(P, b)); // (7.5.6, owner) the worn one too, used last
    if (!nId || !ITEMS[nId] || all.length < 3) return false;
    const used = all.slice(0, 3), wasOn = used.some((x) => isOn(P, x)); if (wasOn) { const w = used.find((x) => isOn(P, x)); buy('off:' + ITEMS[w.id].kind); }
    for (const x of used) removeItem(P, x.u);
    { const nq = giveItem(P, nId); if (wasOn && nq) { putOn(P, nq.u); applyKit(e, P); } } /* the new one goes on where the old one was */ ui.lkSel = null; ui.showGains([{ kind: 'item', id: nId, how: 'Combined' }]); ok = true;
  } else if (kind.startsWith('sellgear:')) { // (7.5.5, owner) rare and up, and every chest, asked first; a common or uncommon sells on a tap
    const q = instOf(P, kind.slice(9)); if (!q || isOn(P, q)) return false; const it = ITEMS[q.id], v = sellValue(q);
    if (it.kind === 'chest' || !['common', 'uncommon'].includes(it.rarity)) { const R = RARITY[it.rarity];
      ui.confirm(`Sell ${it.name}?`, it.kind === 'chest' ? `${R ? R.name + ' ' : ''}chest, unopened` : (R ? rarKind(R.name, it.kind) : ''), `Sell, ${money(v)}`, 'Keep', () => { buy('sellok:' + q.u); ui.renderInventory && ui.renderInventory(); }); return false; }
    return buy('sellok:' + q.u);
  } else if (kind.startsWith('sellok:')) {
    // (2.8.0) selling gear back, for about a third of what it is worth; never what he has on
    const q = instOf(P, kind.slice(7));
    if (q && !isOn(P, q)) { const v = sellValue(q); if (removeItem(P, q.u)) { P.cash = Math.round((P.cash + v) * 100) / 100; ok = true; hud.toast(`Sold ${ITEMS[q.id].name} · ${money(v)}`); } }
  } else if (kind.startsWith('up:')) {
    // one more step on a track: every stat it covers improves together
    const id = kind.slice(3), T = TRACKS[id];
    const cc = T ? upgradeCoins(P, id) : 0;
    if (T && (!T.needs || owns(P, T.needs)) && lv(P, id) < T.max && (id !== 'tHull' || lv(P, id) < hullCap(P)) && (P.coins || 0) >= cc && spend(P, upgradeCost(P, id))) {
      P.coins = (P.coins || 0) - cc;
      const mk0 = markOf(statValue(P, 'depth'));
      tlv(P, id); P.tlv = Object.assign({}, P.tlv, { [id]: lv(P, id) + 1 }); ok = true;
      const mk1 = markOf(statValue(P, 'depth'));
      if (mk1 > mk0) {
        hud.toast(`New sub: ${SUBS[lv(P, 'depth')].name} · ${SUBS[lv(P, 'depth')].rated.toLocaleString()} m`, 'big');
        if (SUB_MARKS[mk1].named && !P.subNamed) ui.askSubName(P.subName || 'EARL', (v) => { P.subName = v; P.subNamed = true; saveProfile(P); ui.renderWorkshop(); hud.toast(`${v} painted on the hull`); }, 'The first hull that is truly yours. The yard will paint its name on, and on every hull after it.');
      }
      const has = (sid) => T.stats.includes(sid);
      if (has('air')) { const was = e.o2Max; e.o2Max = airMax(P); e.o2 = Math.min(e.o2Max, e.o2 + (e.o2Max - was)); }
      if (has('swim')) e.finSpeed = statValue(P, 'swim');
      if (has('sprint')) e.sprintMul = statValue(P, 'sprint');
      if (has('depth') || has('subSpeed') || has('ballast')) applySub(sub, P);
      if (id === 'tPress') hud.toast(`Chamber ${lv(P, id) + 1} fitted`, 'big'); // (4.13.0)
      else if (!has('depth')) hud.toast(`${T.name}: level (${lv(P, id)}/${T.max})`);
    }
  } else if (kind.startsWith('suit:')) {
    // (2.8.0) suits are items now: suit:<id> buys one, as item:<id> does
    return buy('item:' + kind.slice(5));
  } else if (kind.startsWith('gear:')) {
    // a new piece of gear, bought once
    const k = kind.slice(5), G = GEAR[k];
    if (G && !owns(P, k) && (!G.needs || owns(P, G.needs)) && spend(P, G.price)) {
      P.gear = Object.assign({}, P.gear, { [k]: true }); ok = true;
      hud.toast(G.name, 'big');
      if (k === 'camera') { g.toolSel = 'cam'; hud.hint('Tap the swap button by the net for the camera; hold still while it takes the picture'); }
      if (k === 'arm') hud.hint('In the sub, the claw button reaches for an animal; tap it again in the green to close the claw');
    }
  } else if (kind === 'patch' && !sub.imploded && sub.hull < 0.999 && spend(P, PATCH_PRICE)) {
    sub.hull = Math.min(1, sub.hull + 0.4); ok = true;
    hud.toast(`Hull patched: ${Math.round(sub.hull * 100)} %`);
  } else if (kind === 'replace' && sub.imploded && spend(P, replacementPrice(P))) {
    g.sub = new Sub(); applySub(g.sub, P); g.sub.o2 = g.sub.o2Max; g.sub.docked = true; g.imploded = false; ok = true;
    hud.toast(`New sub · rated ${g.sub.rated} m`, 'big');
  } else if (kind.startsWith('trap:') && TRAPS[kind.slice(5)] && (convertOldTraps(P), (P.traps[kind.slice(5)] || 0) < TRAPS[kind.slice(5)].max) && spend(P, TRAPS[kind.slice(5)].price)) {
    const tk = kind.slice(5);
    P.traps[tk] = (P.traps[tk] || 0) + 1; ok = true;
    ui.showGains([{ kind: 'trap', id: tk, how: 'Bought' }]); hud.hint('At the surface, open your bag and tap the trap, then Use, to set it at the depth you choose');
  } else if (kind.startsWith('subnet:') && NETS_SUB[kind.slice(7)] && netsOf(g.items)[kind.slice(7)] < NETS_SUB[kind.slice(7)].cap && spend(P, NETS_SUB[kind.slice(7)].price)) {
    netsOf(g.items)[kind.slice(7)]++; ok = true; // (4.11.0) up to two beginner nets and one advanced
    ui.showGains([{ kind: 'trawl', id: kind.slice(7), how: 'Bought' }]);
  } else if (kind === 'gallery') {
    const lvG = P.galleryLv || 0;
    if (lvG < GALLERY_STEPS.length && spend(P, GALLERY_STEPS[lvG])) { P.galleryLv = lvG + 1; ok = true; hud.toast(`The aquarium: room for ${gallerySlots(P)}`, 'big'); audio.cue && audio.cue('wing'); }
  } else if (kind === 'canisters' && !(P.addons || {}).canisters && spend(P, CANISTERS.price)) {
    P.addons = Object.assign({}, P.addons, { canisters: true }); g.addons = P.addons; ok = true;
    hud.toast('Pressure canisters fitted', 'big');
  } else if (SUB_ADDONS[kind] && !(P.addons || {})[kind] && spend(P, SUB_ADDONS[kind].price)) {
    P.addons = Object.assign({}, P.addons, { [kind]: true }); g.addons = P.addons; ok = true;
    if (kind === 'airBank') { const was = g.sub.o2Max; applySub(g.sub, P); g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + Math.max(0, g.sub.o2Max - was)); } // the new bottles come full
    hud.toast(`Fitted: ${SUB_ADDONS[kind].name.toLowerCase()}`, 'big');
  } else if (SUPPLIES[kind] && (g.items[kind] || 0) + ((P.spare && P.spare[kind]) || 0) < supplyMax(P, kind) && spend(P, SUPPLIES[kind].price)) { // (5.10.10) one lure in all, an old one included // (5.6.9) what is on the belt and what waits in the locker
    if ((kind === 'necklace' || kind === 'glowAdv') && glowKind() !== kind) { P.spare = P.spare || {}; P.spare[kind] = (P.spare[kind] || 0) + 1; } // (6.0.1) the kind not on the belt waits in the locker
    else if (kind === 'film' && (g.items.film || 0) >= gear(P, 'cam').shots) { P.spare = P.spare || {}; P.spare.film = (P.spare.film || 0) + 1; } // (6.5.1) the camera is loaded: the spare stack
    else { g.items[kind] = g.items[kind] || 0; g.items[kind]++; }
    ok = true;
    ui.showGains([{ kind: 'supply', id: kind, how: 'Bought' }]);
  }
  if (ok) { syncProfile(); saveProfile(P); audio.ready && audio.sale(); }
  return ok;
}
function runLog(cause) {
  return { date: new Date().toISOString(), survived: g.survival, cause, maxDepth: Math.round(g.earl.maxDepth), species: g.journal.size, earned: Math.round(g.earned * 100) / 100, sapphires: g.sapphires, subRated: g.sub.rated };
}
function dieInjury(sp) {
  const name = sp ? sp.name.toLowerCase() : 'something';
  const art = /^[aeiou]/.test(name) ? 'an' : 'a';
  die(`Killed by ${art} ${name} at ${Math.round(g.earl.y)} m`, 'injury');
}

// The porthole card while a new sea is made, and kept up while the animals on screen are drawn into
// their sprites (at most 1.5 s), so the first moments never stutter or pop
function withLoading(fn) {
  ui.showLoading(true);
  setTimeout(() => { ui.setLoading(0.3, 'Charting the sea'); setTimeout(() => { fn(); ui.setLoading(0.6, 'Charting the sea'); g.warmFrom = performance.now(); g.warmUntil = g.warmFrom + (8000); g.warmFrames = 0; g.warmCalm = 0; }, 60); }, 60); // (4.15.0) a pause between steps lets the bar move
}
// (4.2.0) the tutorial: a welcome at the start of a new game, with a skip (asked twice); then tutor() guides the
// first steps of the Log with a line of text, a fading trail to where to go, and a ring on the fish to catch
// (4.3.4) the diver's air: half as much again during the tutorial's first dive (30 s of air for the starting tank's 20)
function firstDive(P) { return !!P && P.tut === 'on' && (QUEST_MAIN[questsOf(P).main] || {}).id === 'firstfish'; }
function airMax(P) { return statValue(P, 'air') * (firstDive(P) ? 1.5 : 1); }
function refreshAir() { if (!g || !g.earl || !profile) return; const e = g.earl, was = e.o2Max || 0, now = airMax(profile); if (Math.abs(now - was) < 0.01) return; e.o2Max = now; e.o2 = Math.min(now, (e.o2 || 0) + Math.max(0, now - was)); }
// (4.6.0) after the tutorial, a tip the first time it is needed, once each: how to sprint, if he has swum a whole
// minute underwater without it; how to put on something bought (the first purchase after the tutorial)
function afterTips(dt) {
  const P = profile, e = g.earl; if (!P || P.tut === 'on' || !P.tut || P.tut === 'skip') return;
  if (!P.tipSprint) {
    if (!e.inSub && !g.aboard && e.y > 1.5 && !((touch && touch.vec.sprint) || g.sprintLock)) g.noSprintT = (g.noSprintT || 0) + dt; else g.noSprintT = 0;
    if (g.noSprintT > 60) { P.tipSprint = true; saveProfile(P); hud.toast('Push the stick to its rim to sprint', 'note'); }
  }
}
function tipEquip() { const P = profile; if (!P || P.tut === 'on' || P.tut === 'skip' || P.tipEquip) return; P.tipEquip = true; saveProfile(P); setTimeout(() => messages.show('Open your bag to put it on', 'note', 3.5), 3000); } // (4.12.0) up for 3.5 s
// (4.7.0) the lessons after the tutorial, in the tutorial's own way: the sea is held still (the animals, the thing in
// the deep, the sub's air and hull, the catch's suffering all wait), only what the lesson teaches works, its line
// says what to do and its key-cap lights; a trail leads where to go.
//  - the trawl: the second time he is in the sub (with 10 m of water above her and 10 m below), a small school is
//    set out ahead; let the net out, drive through, close it, open the tank room, put the catch in water. A spare
//    net after.
//  - the air: the first time the cabin air is 10 s from running out, a backup tank is given; connect it (R). Another
//    is given after.

// (6.6.2) the first-time lessons, after the tutorial, each once: the first trawl, the first deep animal needing a chamber,
// the first backup air tank. They use the tutorial's own spotlight (the world holds still while one button glows and is
// waited on), its banner and its trail; inside the tank room and the bag the dive is held (air and animals keep) until
// the step is done. Elsewhere: only the quiet ring on the trawl or air button, as before.
function lessonSet(text, spot = null, to = null, fish = null) { g.lesson = { id: 'l' }; g.tut = { text, spot, to, fish, prompt: null, door: false }; }
function lessonHold(on) { // the dive held: air, the animals aboard, the sea's creatures, the thing
  const e = g.earl, sub = g.sub;
  if (on) { if (!g.lessonHold) g.lessonHold = { o2: sub.o2, eo2: e.o2 }; sub.o2 = g.lessonHold.o2; e.o2 = g.lessonHold.eo2; g.frozen = true; }
  else { g.lessonHold = null; }
}
function lessons() {
  const P = profile, e = g.earl, sub = g.sub; g.frozen = false; g.lesson = null; g.questHint = null; g.airCallout = false; g.trawlOnly = null; if (P && P.tut !== 'on') g.tutVig = 0;
  if (!P || g.mode !== 'play' || P.tut === 'on' || g.kill || sub.imploded) { lessonHold(false); return; }
  const tankO = !!(ui.tankOpen && ui.tankOpen()), invO = shown('inventory'), TR = ui.tankRoom;
  // (7.6.23, owner) a short tour of the tank room, once: the tank, the hatch to the pressure chambers, the floor where a
  // trawl's catch lands, the bag on its hook. Each a card beside the part it is about; OK moves on. True while it runs
  const TOUR = [['tank', 'The sub\'s tank. Live animals swim here, in water, until you are back at the Margaret to sell them or keep them.'],
    ['chambers', 'Through this hatch: the pressure chambers, for animals from deep water that would die at the surface.'],
    ['pile', 'What the trawl net brings in lands here on the floor. Drag each animal up into the tank.'],
    ['bag', 'Your catch bag hangs here. Drag what you caught by hand from it into the tank.']];
  const tankTour = () => { if (!tankO || (TR && TR.room !== 'tank')) return false; const k = P.tutTankTour || 0; if (k >= TOUR.length) return false;
    const [z, txt] = TOUR[k]; if (!document.querySelector(`#tankroom .tr-zone[data-z="${z}"]`)) { P.tutTankTour = k + 1; saveProfile(P); return tankTour(); }
    lessonHold(true); lessonSet('The tank room', { sel: [`#tankroom .tr-zone[data-z="${z}"]`], card: { id: 'tanktour', text: txt } }); return true; };
  // ---- (7.6.23, owner) the first time he comes into the sub with live animals in his bag: into the tank with them ----
  { const live = g.bag.filter((q) => SPECIES_BY_ID[q.id] && !(q.cond <= 0.05));
    if (P.lessonBagTank !== 'done' && e.inSub && (live.length || P.lessonBagTank === 'on') && !g.lessonJelly && !(g.entity && g.entity.marked)) {
      if (P.lessonBagTank !== 'on') { P.lessonBagTank = 'on'; saveProfile(P); }
      if (!live.length) { if (tankO) { lessonHold(true); lessonSet('Close the tank room', { sel: ['#tankroom .tr-close'] }); return; } P.lessonBagTank = 'done'; saveProfile(P); }
      else if (!tankO) { g.tutVig = 1; lessonSet('Move your catch into the sub\'s tank', { key: 't', say: 'Open the tank room' }); return; }
      else { if (tankTour()) return; lessonHold(true); lessonSet('Drag your fish from the bag into the tank', { sel: ['#tankroom .tr-zone[data-z="bag"]'], light: true }); return; } } }
  // ---- (7.6.0, owner) a better sub is for sale: once ever, the first time the cash covers the next sub up. Led aboard,
  // into the cabin, to the computer, its Submersibles page, and that sub's price lit; then never again ----
  if (P.lessonYard !== 'done' && P.tut !== 'on') { const nx = lv(P, 'depth') + 1, NS = SUBS[nx];
    if (NS && (P.lessonYard === 'on' || P.cash >= NS.price) && !(g.entity && g.entity.marked)) {
      const atTop = g.aboard || (e.inSub ? sub.docked : (e.y < 2 && Math.abs(e.x - BOAT.x) < 60));
      if (P.lessonYard !== 'on' && atTop) { P.lessonYard = 'on'; P.lessonYardAt = Date.now(); saveProfile(P); }
      if (P.lessonYard === 'on') {
        const yardO = shown('workshop') && ui.shopTab === 'sub';
        // (7.6.26, owner) a notice, never a duty: about 10 s on screen, then gone for good (unless he is at the yard's page)
        if (!yardO && Date.now() - (P.lessonYardAt || 0) > 10000) { P.lessonYard = 'done'; saveProfile(P); g.yardSeen = false; return; }
        if (yardO) { g.yardSeen = true; lessonSet(`The ${NS.name}: ${money(NS.price, false)}`, { sel: ['#shop-body .pay-tag[data-arg="up:tHull"]', `#shop-body .yd-card[data-yd="sub:${nx}"]`, '#shop-body .yd-plaque[data-yd="all"]'] }); return; } // its price tag; or its card among all the subs; or the way to all of them
        if (g.yardSeen) { P.lessonYard = 'done'; saveProfile(P); g.yardSeen = false; } // seen and closed: never again
        else if (atTop && !e.inSub && !g.aboard) { lessonSet('A better sub is for sale: the shipyard beside the Margaret', null, { x: yardX(), y: 0.6 }); return; } /* (7.6.23, owner) the yard is its own barge now */
        else if (atTop) { lessonSet(g.aboard ? 'A better sub is for sale: dive in and swim to the shipyard' : 'A better sub is for sale: leave the sub, the shipyard is beside the Margaret'); return; }
      } } }
  // ---- the first trawl ----
  if (P.lessonTrawl !== 'done' && e.inSub && !sub.docked && sub.y >= 20 && sub.y < (sub.rated || 300) * 0.9 && !g.entity?.marked) { // (6.9.3) never at crush depth, nor with the thing on him // (6.8.0) the first sub dive below 20 m after the tutorial (the Log's trawl step is gone)
    if (!netTotal(g.items) && !P.lessonTrawl) { netsOf(g.items).basic = 1; syncProfile(); }
    const st = P.lessonTrawl || 'drop', setSt = (v) => { P.lessonTrawl = v; saveProfile(P); };
    let J = g.lessonJelly; const jSp = SPECIES_BY_ID[171];
    if (st === 'drop' || st === 'tow') {
      if (!J || (J.dead && !J.netted) || (!J.dead && !g.fauna.list.includes(J))) { const d = sub.facing || 1; J = g.fauna.makeFish(jSp, sub.x + d * 12, sub.y + 4, /* (7.4.26, owner) in front of her, where she is facing (sub.dir was never set: it was always to the east) */ -d, /* (6.6.2) at the depth the net tows, 4 m under the sub */ g.fauna.groupId++, true); J.devKeep = true; J.vx = J.vy = 0; g.fauna.list.push(J); g.lessonJelly = J; }
      if (Math.hypot((J.homeX ?? J.x) - sub.x, (J.homeY ?? J.y) - sub.y) > 20) { const d = sub.facing || 1; J.homeX = sub.x + d * 12; J.homeY = sub.y + 4; } // (7.6.0, owner) left far behind (she turned away): it hangs again 12 m in front of her, never 40 m off
      J.x = J.homeX ?? (J.homeX = J.x); J.y = J.homeY ?? (J.homeY = J.y); // it hangs where it was placed, pulsing in place
      g.trawlOnly = J; // the net takes only it
      g.tutVig = 1; /* (7.4.26, owner) the screen's edges darkened until it is in the net */
    }
    const n = g.subNet;
    if (st === 'drop') { if (n) setSt('tow'); else lessonSet('Let out the trawl net', { key: 'n', say: 'Let out the trawl net' }, J && { x: J.x, y: J.y }, J); return; }
    if (st === 'tow') { if (J && J.netted) setSt('close'); else { lessonSet('Tow the net through the jellyfish', null, J && { x: J.x, y: J.y }, J); if (n && n.mx != null) g.tut.from = { x: n.mx, y: n.my }; /* the trail from the net's mouth */ } if (!(J && J.netted)) return; }
    if ((P.lessonTrawl || st) === 'close') { if (!n) setSt('tank'); else { lessonSet('Close the net', { key: 'n', say: 'Close the net' }); return; } }
    const pile = g.subTank.find((s) => s.pile), inTank = g.subTank.find((s) => s.id === 171 && !s.pile && !s.pressed);
    if (P.lessonTrawl === 'tank') {
      if (!tankO) { if (pile || !inTank) { lessonSet('The catch is on the floor of the sub', { key: 't', say: 'Open the tank room' }); return; } }
      if (tankTour()) return; /* (7.6.23, owner) the room shown first */
      lessonHold(true);
      if (pile) { lessonSet('Drag it from the floor up into the tank', { sel: ['#tankroom .tr-zone[data-z="pile"]'], light: true }); return; }
      if (inTank && !(TR && TR.openKey)) { lessonSet('Tap it for its card'); return; }
      if (inTank) { setSt('shut'); }
    }
    if (P.lessonTrawl === 'shut') { if (tankO) { lessonHold(true); lessonSet('Close the tank room', { sel: ['#tankroom .tr-close'] }); return; } setSt('done'); g.lessonJelly = null; }
  }
  // ---- the first deep animal that needs a chamber ----
  if (P.lessonChamber !== 'done' && e.inSub && pressSlots(g) > 0) {
    const deep = (s) => !s.pressed && SPECIES_BY_ID[s.id] && (SPECIES_BY_ID[s.id].dmin || 0) >= 120;
    const want = g.subTank.find(deep), held = g.subTank.find((s) => s.pressed && SPECIES_BY_ID[s.id] && (SPECIES_BY_ID[s.id].dmin || 0) >= 120);
    if (P.lessonChamber === 'on' || want) {
      if (P.lessonChamber !== 'on') { P.lessonChamber = 'on'; saveProfile(P); }
      if (held && !want) { if (tankO) { lessonHold(true); lessonSet('It is held at its own pressure: it will live', { sel: ['#tankroom .tr-close'] }); return; } P.lessonChamber = 'done'; saveProfile(P); lessonHold(false); }
      else if (!tankO) { lessonSet('A deep animal needs a pressure chamber', { key: 't', say: 'Open the tank room' }); return; }
      else { lessonHold(true); lessonSet(TR && TR.room === 'chambers' ? 'Drag it into a chamber' : 'Through the left hatch: the chamber room'); return; }
    }
  }
  // ---- the first backup air tank ----
  if (!P.lessonAir && e.inSub && !sub.docked && sub.y > 2.2 && sub.o2 <= 10) { P.lessonAir = 'bag'; g.items.airTank = Math.min(2, (g.items.airTank || 0) + 1); ui.showGains([{ kind: 'supply', id: 'airTank' }], true); syncProfile(); saveProfile(P); }
  if (P.lessonAir === 'bag' && e.inSub) {
    if (g.tankFit) { lessonHold(false); lessonSet('Connecting the tank'); return; }
    if (sub.o2 >= sub.o2Max - 1) { P.lessonAir = 'done'; saveProfile(P); }
    else if (!(g.items.airTank > 0)) { P.lessonAir = 'done'; saveProfile(P); }
    else if (shown('gainfx')) return; // the tank's card first
    else if (!invO) { lessonSet('A backup air tank', { key: 'b', say: 'Open your bag' }); return; }
    else { lessonHold(true); lessonSet('Use the air tank', { sel: ui.airSel ? ['#inventory [data-airuse]'] : ['#inventory [data-air]'] }); return; }
  }
  lessonHold(false);
  if (!e.inSub || sub.docked || ui.anyOpen()) return;
  const n = g.subNet;
  if (n && n.phase === 'tow' && n.got && n.got.length) g.questHint = 'n'; // something in the net: it can be closed
  if (sub.o2Max && sub.o2 / sub.o2Max < 0.3 && (g.items.airTank || 0) > 0 && !g.tankFit) { g.questHint = g.questHint || 'r'; g.airCallout = true; }
}
function tutorWelcome() {
  const P = profile; if (!P || P.tut) return;
  ui.confirmModal = true; // (5.5) answered with Start or Skip only (a tap beside it no longer dismisses it undecided), the game held still meanwhile
  ui.confirm('Welcome to the tutorial', 'This will be quick: just a look around the game.', 'Start', 'Skip tutorial',
    () => { P.tut = 'on'; saveProfile(P); g.tutSaid = null; refreshAir(); },
    () => ui.confirm('Skip the tutorial?', 'Are you sure?', 'Skip it', 'Back', () => { P.tut = 'skip'; P.lessonAir = P.lessonTrawl = P.lessonChamber = 'done'; /* (7.6.0) every taught-once lesson */ P.tipEquip = P.tipSprint = true; saveProfile(P); }, () => tutorWelcome())); // (4.12.0) skipped: no lessons or tips after it either
  { const cf = document.getElementById('confirm'); cf.classList.add('welcome'); setTimeout(() => { const y = cf.querySelector('.cf-yes'); y && y.focus(); }, 0); } // (6.0.19) Start is the one to press: it holds the focus, Skip sits quiet
}
// (4.3.0, 4.3.1) tutor(): one thing at a time. Each frame it works out the single next thing to do and sets g.tut:
//   text    a line of help (said once, as the banner at the top, when it changes)
//   to      a point in the sea for the trail of arrows;  fish  the fish to ring
//   prompt  drawn beside the fish (swinging the net, "it got away")
//   action  (4.4.1) the one thing the step lets him do here: { id, key, say }. It has its own hit area (zone()), a
//           button, and its key; either runs it directly (runTutAction), whatever the game itself is aiming at
//   spot    for the spotlight (js/tutspot.js): what to click (the rest shaded), or which action's key to press
// It names actions, not keys (keyFor() turns them into keys for the input in use), and never names keys for moving:
// the trail shows where to go.
const shown = (id) => { const el = document.getElementById(id); return !!el && !el.hidden; };
// the tutorial's own fish: a garibaldi (the kelp forest's bright orange fish; a real one guards one small patch and
// barely leaves it) hovering just under the Margaret, a few metres down by her ladder.
// (4.3.1) It is a real fish: caught, it is gone. When a later step needs another, a new one swims in from out of
// sight (never popping up where the last one was caught), and once the steps with a fish are over it is let go.
// (4.3.4) the quest garibaldi: a hidden species, never met outside the tutorial. To the game it is a garibaldi (the
// same id, name, value, journal entry and everything else, so nothing about it is unfair); only where it lives
// differs: higher up, about 5 m, so the first dive fits in one breath.
let QUEST_GARIBALDI = null;
const questGaribaldi = () => QUEST_GARIBALDI || (QUEST_GARIBALDI = Object.freeze({ ...SPECIES_BY_ID[72], dmin: 0, dmax: 8, questKey: 'questGaribaldi' }));
function tutorFish(dir) {
  const ax = BOAT.x + LADDER_M * dir - 3 * dir, ay = 5;
  let tf = g.tutFish;
  if (!tf || tf.dead || !g.fauna.list.includes(tf)) {
    // the first one starts in its place (it is out of sight below the deck); a later one comes from the far side
    const first = !g.tutFishN, side = Math.sign(ax - g.earl.x) || 1, sx = first ? ax : ax + side * 16;
    tf = g.fauna.makeFish(questGaribaldi(), sx, ay, -side, g.fauna.groupId++, true); tf.len = 0.22; tf.tutor = true;
    g.fauna.list.push(tf); g.tutFish = tf; g.tutFishN = (g.tutFishN || 0) + 1;
  }
  // it swims to its patch at a fish's pace, then hovers there
  const tt = g.time, hx = ax + Math.sin(tt * 0.4) * 0.9, hy = ay + Math.sin(tt * 0.7) * 0.3, dx = hx - tf.x, dy = hy - tf.y, dd = Math.hypot(dx, dy);
  if (tf.fleeT > 0) return tf; // (4.3.2) missed: it darts off for a moment, then comes back to its patch
  const k = dd > 1.5 ? Math.min(1, 0.035 / dd) : 0.05; // (4.3.4) unhurried: easy to follow and to catch
  tf.x += dx * k; tf.y += dy * k;
  tf.vx = dd > 1.5 ? Math.sign(dx) * 0.8 : Math.cos(tt * 0.4) * 0.15; tf.vy = 0; tf.facing = tf.vx >= 0 ? 1 : -1;
  return tf;
}
// (6.6.0) the sub trip's two garibaldi, hovering in place: one about 26 m out from the boat at 9 m, one 12 m under it.
// Caught, it stays caught (null when it is gone some other way, and a new one comes)
function tripFish(n) {
  const ax = BOAT.x - 26 - (n === 3 ? 3 : 0), ay = Math.min(n === 2 ? 9 : 21, g.world.floorAt(ax) - 2.5), key = 'tripFish' + n;
  let tf = g[key];
  if (tf && tf.dead) { if (g.bag.some((s) => s.id === tf.sp.id)) return tf; tf = null; }
  if (!tf || !g.fauna.list.includes(tf)) { tf = g.fauna.makeFish(questGaribaldi(), ax, ay, -1, g.fauna.groupId++, true); tf.len = 0.22; tf.tutor = true; tf.devKeep = true; g.fauna.list.push(tf); g[key] = tf; }
  if (tf.fleeT > 0) return tf;
  const tt = g.time + n, hx = ax + Math.sin(tt * 0.4) * 0.9, hy = ay + Math.sin(tt * 0.7) * 0.3, dx = hx - tf.x, dy = hy - tf.y, dd = Math.hypot(dx, dy), k = dd > 1.5 ? Math.min(1, 0.035 / dd) : 0.05;
  tf.x += dx * k; tf.y += dy * k; tf.vx = dd > 1.5 ? Math.sign(dx) * 0.8 : Math.cos(tt * 0.4) * 0.15; tf.vy = 0; tf.facing = tf.vx >= 0 ? 1 : -1;
  return tf;
}
const tripCaught = (tf) => !!(tf && tf.dead && g.bag.some((s) => s.id === tf.sp.id));
function tutor() {
  const P = profile, e = g.earl; g.tut = null; g.tutForce = null; g.tutQuiet = false; g.tutFence = null; g.tutVig = 0; /* (7.4.0) set again by the step that wants them */
  { const m0 = P && QUEST_MAIN[questsOf(P).main]; g.questMainId = m0 ? m0.id : null; } /* (6.5.0) the Log's step, for the way-aboard chevrons */ if (ui.cabin) ui.cabin.tutMark = null; // (6.5.6) this had slipped into the comment, so the cabin's chevrons to the computer stayed after the tutorial
  // (4.4.0) during the tutorial the game's own prompts and the things they do are off (hud.js, cabin.js, the key
  // gate below): only the action the step asks for works, on the tutorial's own, larger button
  g.tutHidePrompts = !!P && g.mode === 'play' && tutorialOn(P); g.tutAction = null; g.tutLadder = false; // (7.1.0) the ladder's chevrons only on a climb step
  if (!P || P.tut !== 'on' || g.mode !== 'play') return;
  { const m1 = QUEST_MAIN[questsOf(P).main]; if (m1 && m1.id === 'subtrip') g.tutHidePrompts = false; } // (6.6.0) the sub trip is played with the game's own buttons
  const S = questsOf(P), m = QUEST_MAIN[S.main]; if (!m || !TUT_IDS.has(m.id)) { if (P.tut === 'on' && S.main > 0) { P.tut = 'done'; saveProfile(P); setTimeout(() => ui.confirm('Tutorial complete', 'The quest board is in your journal.', 'OK', null, () => {}), 600); /* (6.5.0) a card to close the tutorial, not a toast that was easily missed */ } return; }
  const done = S.mainProg >= m.need, dir = Math.sign(Math.cos(BOAT.yaw || 0) || 1);
  const ladder = { x: BOAT.x + LADDER_M * dir, y: 1 }, nearBoat = Math.abs(e.x - BOAT.x) < 14 && e.y < 4;
  const inCabin = shown('cabin'), qOpen = shown('quests'), invOpen = shown('inventory'), catOpen = shown('catalog'), jOpen = shown('journal'), shopOpen = shown('workshop');
  // (4.3.2) words drawn beside the fish: { text, col }
  const netPrompt = () => ({ text: g.toolSel !== 'net' ? 'Take out your net' : 'Swing your net' });
  let text = null, to = null, fish = null, prompt = null, spot = null, door = false, action = null;
  // (4.4.1) a hit area: on the moment he is in it, off only once he has been out of it for a moment, so a button
  // never blinks at the edge. offer(): the step's one action here, shown as the tutorial's button
  const Z = g.tutZones || (g.tutZones = {}), now = performance.now();
  const zone = (name, inside) => { if (inside) Z[name] = now; return now - (Z[name] || -1e9) < 400; };
  // (5.5) on a phone, with a fish in reach: the net button ringed (or the net's slot, if it is not in hand)
  const netSpot = (near = false) => (g.catchTarget || near /* (7.6.22, owner) in the tutorial, shown as soon as he is by the fish, before any swing */ ? (g.toolSel !== 'net' ? { key: '1', say: 'Tap the net to take it out' } : { act: 'use', say: 'Tap the net to swing it' }) : null);
  const offer = (id, say, key = 'F') => { action = { id, say, key }; spot = { key, say, button: id }; };
  const cabinTo = (id, act, say) => { ui.cabin.tutMark = id; if (zone('cabin-' + id, ui.cabin.near && ui.cabin.near() === id)) offer(act, say); else action = { id: act, say, key: 'F', cabinOnly: true }; };
  const ladderZone = () => zone('ladder', !e.inSub && !g.aboard && e.y < 2.6 && e.y > -0.6 && Math.abs(e.x - BOAT.x - LADDER_M) < 1.6);
  // the steps that need a fish: the fish to go to, and what to do at it
  const fishStep = (doWhat) => {
    const tf = tutorFish(dir), bd = dist(e.x, e.y, tf.x, tf.y); to = { x: tf.x, y: tf.y }; fish = tf;
    if (inCabin) { text = 'Leave the cabin: walk to the door'; cabinTo('door', 'outdoor', 'Out on deck'); return; } // (4.3.3) arrows to the door
    if (g.aboard) { // (claude-polish) the trail leads to the nearer end of the deck, not down through the hull at the fish
      const ax = g.aboard.x || 0, endX = ax < (DECK_MIN + DECK_MAX) / 2 ? DECK_MIN - 1.2 : DECK_MAX + 1.2;
      to = { x: BOAT.x + endX * dir, y: 0.6 }; fish = null; text = 'Walk off the end of the deck to jump in'; return; }
    if (e.inSub) { text = 'Leave the sub'; offer('leavesub', 'Leave the sub'); spot = { key: 'leavesub', say: 'Leave the sub', button: 'leavesub' }; /* (7.1.0) ring the sub's own leave button (its key is not F) */ return; }
    if (!zone('fish', bd < 2.6)) {
      text = 'Swim to the orange fish';
      // (4.3.5) how to sprint, until he has: the right mouse button held, or Shift
      // (5.6.9) sprint is taught once, on the way back up (it was ringed through the whole swim down, while the air was the worry)
      return;
    }
    doWhat(tf);
  };
  if (done) {
    // a step is done: claim it before anything else (the next step only starts counting once this one is claimed)
    if (qOpen) { spot = { sel: ['#quests [data-q="claim|main"]'] }; } // (4.3.5) the quests are open: just the arrow, no words
    else if (ui.anyOpen()) {
      // (4.3.5) another screen is up: point at the way out of it (the shop's Log off, a close button), no keys named;
      // in the cabin (no button to leave by) the quests key still works
      text = 'Done. Claim it in your quests';
      spot = { sel: ['#catalog .cat-x', '#workshop-close', '#inventory .inv-close', '#journal-close', '#quests-btn'] }; // (the Quests button shows in the cabin)
    }
    else { text = 'Done. Open your journal and claim it'; spot = { sel: ['#quests-btn'], act: 'quests', say: 'Claim it here', light: true }; }
  } else if (m.id === 'firstfish') {
    // (4.3.4) one dive: down to the fish, observe it, catch it (the first swing misses, the next catches), back up.
    // The step is only done at the surface, so the claim is never made underwater.
    const part = firstFishPart(P);
    if (part === 3) { text = 'Got it. Swim up to the surface'; to = { x: e.x + (e.facing || 1) * 2, y: 0.3 };  }
    else {
      g.tutForce = P.tutMissed ? 'catch' : 'miss';
      fishStep(() => {
        if (part <= 1) { text = 'Observe the fish'; offer('observe', 'Observe', 'obs'); } // (5.5) on a phone, its own eye button
        else if (g.tutOops && g.time - g.tutOops < 3.5) { text = 'It got away. Try again'; prompt = { text: 'It got away. Try again', col: '#f2c7a0' }; }
        else { text = g.toolSel !== 'net' ? 'Take out your net' : 'Swing your net to catch it'; prompt = netPrompt(); spot = spot || netSpot(true); if (spot) prompt = null; /* (5.5.3) the ringed button and its words say it already */ }
      });
      if (text === 'Swim to the orange fish') text = 'Swim down to the orange fish under the boat';
    }
  } else if (m.id === 'sell') {
    if (!P.tutJournal) { const qOpen = shown('quests'); text = qOpen ? 'Turn to the Journal' : 'Open your journal'; spot = jOpen ? null : qOpen ? { sel: ['#booktabs [data-t="journal"]'], say: 'Journal' } : { act: 'journal', say: 'Open your journal' }; } // (7.1.0) from the Quests page, its tab
    else if (jOpen && (P.tutJTour || 0) < 4) { // (4.12.2) a short look round the journal before it is closed
      // (7.4.26, owner) the list, then the animal's page (the card on the left page, pointing across), then he opens All
      // himself, and only then is it said what All is
      const k = P.tutJTour || 0, allOn = !!document.querySelector('#journal .tabs [data-tab="all"].on');
      text = 'Your journal';
      if (k === 2 && allOn) { P.tutJTour = 3; saveProfile(P); }
      spot = k === 0 ? { sel: ['#journal-list .jcell'], card: { id: 'jtour', text: 'Every animal you observe is drawn here. Tap one to read about it.' } }
        : k === 1 ? { sel: ['#journal-detail'], card: { id: 'jtour', side: 'left', text: 'This page shows the animal you chose: where it lives, how big it grows, where you first saw it.' } }
        : k === 2 ? (text = 'Open All', { sel: ['#journal .tabs [data-tab="all"]'], say: 'All' })
        : { sel: ['#journal .tabs [data-tab="all"]'], card: { id: 'jtour', text: '“All” shows every animal in the sea, the ones still to find in shadow.' } };
    }
    else if (jOpen) { text = 'Close the journal'; spot = { sel: ['#journal-close'], act: 'journal', say: 'Close the journal' }; }
    else if (shopOpen) { text = 'Sell your catch'; spot = { sel: ['#workshop button[data-act="sellall"]:not([disabled])', '#workshop [data-act="sellone"]'], say: 'Sell all' }; }
    else if (!g.bag.length && !g.subTank.length) {
      // sold already, or lost it: another fish, then sell that one
      fishStep(() => { text = 'Your bag is empty: net another fish to sell'; prompt = netPrompt(); spot = spot || netSpot(); if (spot && g.catchTarget) prompt = null; /* (5.5.3) the ringed button and its words say it already */ });
    }
    else if (inCabin) { text = 'Leave the cabin, then jump in beside the boat'; cabinTo('door', 'outdoor', 'Out on deck'); }
    else if (g.aboard) { text = 'Jump in beside the Margaret: you sell from the water'; to = ladder; }
    else if (!zone('boat', nearBoat)) { text = 'Bring your catch up beside the Margaret'; to = ladder; }
    else { const wx = BOAT.x + 4.5 * dir; // (7.1.0) the winch is used where it is: led there first, then offered
      if (Math.abs(e.x - wx) >= 1.6) { text = 'Swim to the Sell door at the stern'; to = { x: wx, y: 0.4 }; } // (7.5.0, owner) at the door itself, not the ladder beside it
      else { text = 'Tap the Sell door on the Margaret'; offer('sell', 'Sell your catch', 'U'); } }
  } else if (m.id === 'buy') {
    // the cheapest piece of gear he can afford at Bayside, to point at
    const pick = Object.values(ITEMS).filter((it) => it.shop === 'catalog' && it.price > 0 && it.price <= (P.cash || 0) && !ownsItem(P, it.id)).sort((a, b) => a.price - b.price)[0];
    if (!pick && !catOpen && !g.bag.length) {
      fishStep(() => { text = 'Not enough cash for gear yet: net another fish and sell it'; prompt = netPrompt(); spot = spot || netSpot(); if (spot && g.catchTarget) prompt = null; /* (5.5.3) the ringed button and its words say it already */ });
    } else if (!pick && !catOpen) {
      if (g.aboard || !zone('boat', nearBoat)) { text = 'Not enough cash for gear yet: sell your catch first'; to = ladder; }
      else if (shopOpen) spot = { sel: ['#workshop button[data-act="sellall"]:not([disabled])'], say: 'Sell all' };
      else { text = 'Sell your catch first'; offer('sell', 'Sell your catch', 'U'); }
    } else if (catOpen) {
      const sel = ['#catalog button[data-buy^="item:"]:not([disabled])', '#catalog [data-cart="checkout"]:not([disabled])'];
      if (pick) sel.push(`#catalog .cat-main [data-go="item:${pick.id}"]`, `#catalog .cat-nav [data-go="${pick.kind}"]`);
      text = pick ? (`Buy the ${pick.name.toLowerCase()} for ${money(pick.price, false)}: it is lit below`) : 'Not enough cash yet: sell more catch first';
      spot = pick ? { sel, say: `Buy a piece of gear (the ${pick.name.toLowerCase()} is ${money(pick.price, false)})`, confirm: 'Confirm the purchase' } : null;
    }
    else if (inCabin) { text = 'Walk to the computer to shop'; cabinTo('desk', 'shop', 'Open the shop'); }
    else if (g.aboard) { text = 'Go into the cabin: the door by the wheelhouse'; to = { x: BOAT.x + DOOR_M * dir, y: -1.2 }; door = true; if (zone('door', deckAtDoor())) { offer('cabin', 'Enter the cabin'); spot = null; g.tutVig = 1; text = 'Tap the cabin door to go in'; } /* (7.6.22, owner) no glove at the door: the door glows and the screen's edges darken */
      { const bf = renderer.boatFrame, kx = innerWidth / renderer.c.width; if (bf) spot = { pt: [(bf.x + bf.sx * 19 * bf.k) * kx, (bf.y - 17.5 * bf.k) * kx, 5.4 * bf.k * kx, 14 * bf.k * kx] }; } } // (7.5.0, owner) up on deck: the glove points at the cabin door itself // (4.3.5) the door itself lit up
    else { text = 'Climb aboard the Margaret by the ladder'; to = ladder; g.tutLadder = true; if (ladderZone()) { offer('climb', 'Climb aboard'); text = 'Tap the ladder to climb aboard'; } }
  } else if (m.id === 'wear') {
    const Kit = P.kit || { items: [], on: {} }, worn = new Set(Object.values(Kit.on || {}));
    const it = Kit.items.find((q) => q.paid && !worn.has(q.u)), name = it ? 'the ' + ITEMS[it.id].name.toLowerCase() : 'what you bought';
    const canChange = !!(ui.h.canChangeGear && ui.h.canChangeGear()); // (4.3.6) gear is changed aboard (deck, cabin, sub); in the water it only shows
    if (!canChange) {
      // in the water: aboard first. If the inventory is up, its close button is the way out (nothing else works)
      text = 'Climb aboard the Margaret to change your gear'; to = ladder;
      spot = invOpen ? { sel: ['#inventory .inv-close'], act: 'inventory' } : null;
      g.tutLadder = !invOpen; if (!invOpen && ladderZone()) offer('climb', 'Climb aboard');
    }
    else if (invOpen) { text = `Put on ${name}`; spot = { sel: it ? [`#inventory [data-lk="on:${it.u}"]`, `#inventory .item-pop .ip-close`, `#inventory .lk-tile[data-u="${it.u}"]`, '#inventory [data-invtab="gear"]:not(.on)'] : [], say: `Tap ${name}, then Put it on` }; }
    else { text = 'Open your inventory and put on what you bought'; spot = { act: 'inventory', say: 'Open your inventory' }; }
  } else if (m.id === 'subtrip') {
    // (7.4.0, owner) the sub trip keeps him on task: the interact button shows only what the step needs, and the water
    // past the trip's fish gently turns him back
    g.tutQuiet = true; g.tutFence = { x0: BOAT.x - 48, x1: BOAT.x + 28, y1: 42 };
    const sn = S.seen, part = sn.st || 0, sub = g.sub, ap = g.autopilot, set = (n) => { if ((sn.st || 0) < n) { sn.st = n; saveProfile(P); } };
    const inReach = () => { const T = findTarget(); return !!(T && T.kind === 'board'); };
    const toSub = () => { to = { x: sub.x, y: sub.y }; text = 'Get in the sub'; g.tutVig = 1; /* (7.4.26, owner) the screen's edges darkened until he is in */ if (inReach()) spot = { key: 'f', say: 'Get in' }; };
    const offDeck = () => { const ax = g.aboard.x || 0, endX = ax < (DECK_MIN + DECK_MAX) / 2 ? DECK_MIN - 1.2 : DECK_MAX + 1.2; to = { x: BOAT.x + endX * dir, y: 0.6 }; text = 'Walk off the end of the deck to jump in'; };
    if (inCabin) { text = 'Out on deck'; cabinTo('door', 'outdoor', 'Out on deck'); }
    else if (part === 0) { if (e.inSub) set(1); else if (g.aboard) offDeck(); else toSub(); }
    else if (part === 1) { // drive to the fish, sprinting
      const F2 = tripFish(2); fish = F2; to = { x: F2.x, y: F2.y };
      if (!e.inSub) { if (g.aboard) offDeck(); else toSub(); }
      else { text = 'Drive to the fish'; /* (6.6.0) the stick needs no teaching: no ring round it */ if (dist(sub.x, sub.y, F2.x, F2.y) < 8) set(2); }
    }
    else if (part === 2) { const F2 = tripFish(2); fish = F2; if (e.inSub) { text = 'Leave the sub'; offer('leavesub', 'Leave the sub'); spot = { key: 'leavesub', say: 'Leave the sub', button: 'leavesub' }; /* (7.1.0) ring the sub's own leave button (its key is not F) */ } else set(3); }
    else if (part === 3 || part === 4) { // net the fish, then the one below
      const F = tripFish(part === 3 ? 2 : 3);
      if (tripCaught(F)) set(part + 1);
      else if (e.inSub) { text = 'Leave the sub'; offer('leavesub', 'Leave the sub'); spot = { key: 'leavesub', say: 'Leave the sub', button: 'leavesub' }; /* (7.1.0) ring the sub's own leave button (its key is not F) */ }
      else { fish = F; to = { x: F.x, y: F.y }; text = part === 3 ? 'Net the fish' : 'Net the one below';
        // (7.5.0, owner) once, on the way down to the first fish: the sprint, lit on its own button
        const AB = currentAbility(); if (abilityState(g).activeT > 0 && AB && AB.speed && !P.tutSprint) { P.tutSprint = true; saveProfile(P); }
        if (part === 3 && !P.tutSprint && AB && AB.speed && cooldownLeft(P) <= 0 && dist(e.x, e.y, F.x, F.y) > 5) { text = 'Sprint down to the fish'; spot = { key: 'ability', say: 'Sprint' }; }
        else if (dist(e.x, e.y, F.x, F.y) < 2.6) { prompt = netPrompt(); spot = netSpot(); if (spot && g.catchTarget) prompt = null; } }
    }
    else if (part === 5) { // the sub is far above: call it to him, and get in
      if (e.inSub) set(6);
      else if ((ap && ap.state === 'coming') || dist(e.x, e.y, sub.x, sub.y) < 9) toSub();
      else { text = 'Call the sub'; spot = { key: 'c', say: 'Call the sub' }; }
    }
    else if (part === 6) { // a look at what he carries
      // (7.4.0, owner) no card with an OK: he taps Catch himself, then the glove shows his catch for a moment
      if (invOpen && !P.tutBagTour) { const onCatch = !!document.querySelector('#inventory [data-invtab="catch"].on');
        if (!onCatch) { text = 'Open Catch'; spot = { sel: ['#inventory [data-invtab="catch"]'] }; g.tutCatchAt = null; }
        else { const card = document.querySelector('#inventory .fish-pop'); // (7.5.0, owner) tap a fish; its card open, the glove steps away, then after 2 s points at the card's cross
          if (card) { g.tutCardAt = g.tutCardAt ?? g.time; text = 'Your catch'; spot = g.time - g.tutCardAt > 2 ? { sel: ['#inventory .fish-pop .ip-close'] } : null; }
          else if (g.tutCardAt != null) { P.tutBagTour = true; saveProfile(P); g.tutCardAt = null; } // the card seen and closed
          else { text = 'Tap a fish'; spot = { sel: ['#inventory .bag-spaces .bs-fish', '#inventory .bag-spaces'] }; } } }
      else if (invOpen) spot = { sel: ['#inventory .inv-close'], act: 'inventory' };
      else if (P.tutBagTour) set(7);
      else { text = 'Open your bag'; spot = { key: 'b', say: 'Open your bag' }; }
    }
    else { // home on the autopilot
      if (sub.docked && e.inSub) { questEvent(P, 'subTrip'); saveProfile(P); }
      else if (!e.inSub) toSub();
      else if (g.homeRun) text = 'The autopilot takes you home';
      else { text = 'Autopilot home'; spot = { key: 'c', say: 'Autopilot home' }; }
    }
  }
  g.tut = { text, to, fish, prompt, spot, door };
  // (4.3.8) the instruction has its own line at the left (tutspot.js), so the game's own messages at the top are
  // never held back by it. None while the quests are open: the arrow at Claim is enough.
  if (ui.anyOpen('cabin') && !(catOpen && m && m.id === 'buy')) g.tut.text = null; // (4.4.1) nor over any open screen (the journal, the shop, ...): its arrow says it; (5.6.9) the shop on a phone keeps a short line over it, as nothing else says why
  g.tutAction = action;
}
const tutSpot = new TutSpot();
tutSpot.onAction = (id) => runTutAction(id); // (4.4.1) the button
tutSpot.onCard = (id) => { if (id === 'bagtour' && profile) { profile.tutBagTour = true; saveProfile(profile); audio.ready && audio.click(); return; } /* (6.6.0) */ if (id === 'tanktour' && profile) { profile.tutTankTour = (profile.tutTankTour || 0) + 1; saveProfile(profile); audio.ready && audio.click(); return; } if (id === 'jtour' && profile) { profile.tutJTour = (profile.tutJTour || 0) + 1; saveProfile(profile); audio.ready && audio.click(); } }; // (4.12.2)
function startRun() {
  // (5.5) an iPhone's browser cannot show a page full screen: once, on the first dive there, how to get it
  if (/iPhone|iPod/.test(navigator.userAgent) && !(window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) && !navigator.standalone) {
    let seen = false; try { seen = !!localStorage.getItem('earl.iosFsTip'); localStorage.setItem('earl.iosFsTip', '1'); } catch (e) { seen = true; }
    if (!seen) setTimeout(() => hud.toast('For full screen: Share, then Add to Home Screen, and open Earl from there', 'note'), 6000);
  }
  g.menuT0 = null; // (5.7.0) the title's dive starts again next time
  g.abilUsed = 0; g.abil = null; g.tideFx = null; if (profile && profile.markers) profile.markers = profile.markers.filter((m) => !m.auto); // (5.9.0) a new dive: per-dive abilities back; Fathom's marks cleared
  // (5.7.5) the journal's pictures drawn ahead, a few at a time while he plays, so the book opens with them already there
  setTimeout(() => { const ids = [...(g.journal ? g.journal.keys() : [])]; let i = 0; const step = () => { for (let k = 0; k < 6 && i < ids.length; k++, i++) { const sp = SPECIES_BY_ID[ids[i]]; if (sp) ui.allFishPic(sp, true); } if (i < ids.length) setTimeout(step, 40); }; step(); }, 2500);
  messages.clear(); // (5.5) a new dive starts with a clear line (no "Out of air" left over from the last)
  audio.init(); audio.resume(); audio.playMusic();
  if (!getSlot()) setSlot(firstFreeSlot());
  const fresh = !profile || !(profile.runs > 0); // (3.0.5) the first dive of a new game
  // (3.0.11) the music plays only in the first sitting of a brand-new game: from its first dive until the page is
  // closed (deaths included); a save loaded in a later sitting, or another save, gets none; nor does the title before it
  audio.musicAllowed = true; // (3.0.24) music in every sitting again, by its own rules (audio.js pickTrack); a new game's first dive opens with the melodic theme
  audio.cue && audio.cue(fresh ? 'firstDive' : 'start'); // (2.9.2) a new dive, or back after a death
  { const made = g.made; if (!profile) { profile = newProfile(); if (made) { profile.name = made.name; profile.look = made.look; } saveProfile(profile); } } // (6.7.0) the creator's name and look
  setDiverLook(profile.look); // (6.7.0) the diver as made
  profile.runs = (profile.runs || 0) + 1; saveProfile(profile);
  g = newGame('play');
  boardDeck(false, true); // a dive starts on deck, at the top of the stern ladder
  resumeDive(profile); // (4.12.6) unless a dive was under way when the page closed
  hud.toasts = [];
  ui.showGame();
  canvas.focus();
  if (fresh && !profile.tut) setTimeout(tutorWelcome, 900); // (4.2.0) a new game: the welcome, and the choice to skip
}

// ---------------- input ----------------
// (4.4.0) the tutorial's key gate: while it guides, the game's own actions (U, F at the ladder or door, C, T, N, P,
// V, G, Q, E, the tools ...) are off; moving, sprinting, the net, the journal, quests, inventory, pause and mute
// always work. The step's own action (g.tutAction, set by tutor()) runs from its key or its button: runTutAction()
const TUT_ALWAYS = new Set(['sprint', 'sprinton', 'leavesub', 'divein', 'outdeck', 'ability', 'swap', ' ', '1', 'b', 'menu', 'settings']);
function tutGated(k) { if (g && g.lesson && g.frozen) return !(g.lesson.allow || new Set()).has(k) && k !== 'settings'; return !!(g && g.mode === 'play' && g.tutHidePrompts && !TUT_ALWAYS.has(k)); } // (4.7.0) a lesson lets through only what it teaches
const deckAtDoor = () => !!g.aboard && g.aboard.x > (DECK_MIN + DECK_MAX) / 2 - (DECK_MAX - DECK_MIN) / 6 && g.aboard.x < DOOR_M + 0.7; // as deckInput's door zone
// (4.4.1) the tutorial's actions, done directly (not through whatever the game is aiming at, which can change frame
// to frame): observe the tutorial fish, sell, climb aboard, into the cabin, the shop, back out on deck, out of the sub
function runTutAction(id) {
  const a = g && g.tutAction; if (!a || a.id !== id || a.cabinOnly) return false;
  const tf = g.tutFish;
  if (id === 'observe' && tf && !tf.dead) interact({ kind: 'creature', sp: tf.sp, c: tf, x: tf.x, y: tf.y }, false);
  else if (id === 'sell') ui.openShop('sell', ['sell']);
  else if (id === 'climb') boardDeck();
  else if (id === 'cabin') useStation('door');
  else if (id === 'shop') ui.toggleCatalog(true);
  else if (id === 'outdoor') ui.toggleCabin(false);
  else if (id === 'leavesub') leaveSub();
  else return false;
  audio.ready && audio.click(); return true;
}
window.addEventListener('actdown', (ev) => {
  if (ui.typing()) return;
  if (ui.confirmOpen && ui.confirmOpen()) return; // an "are you sure?" is up: its own buttons only
  const k = ev.key.toLowerCase();
  if (g && window.__hudTutKey != null && k === String(window.__hudTutKey).toLowerCase()) { g.tutGrace = 1.6; g.tutPressedKey = window.__hudTutKey; } // (5.8.1) the spotlit button pressed: the game runs on
  if (g && g.tutHidePrompts && g.tutAction && k === g.tutAction.key.toLowerCase()) { ev.preventDefault(); runTutAction(g.tutAction.id); return; } // (4.4.1)
  if (tutGated(k)) return; // (4.4.0)
  if (!keys.has(k)) { pressed.add(k); if (k === 'f') fDown = performance.now(); if (k === 'c') { cDown = performance.now(); cHeld = 0; } }
  keys.add(k);
  audio.resume();
});
window.addEventListener('actup', (ev) => {
  const k = ev.key.toLowerCase();
  keys.delete(k);
  if (tutGated(k)) return; // (4.4.0) no F-tap from a key the tutorial has off
  if (k === 'f') { if (fSwallow) fSwallow = false; /* (7.5.0) the press already did its thing (out of the cabin): its release is not a tap too, which put him straight back in */ else if (performance.now() - fDown < 600) pressed.add('f-tap'); fHeld = 0; }
  if (k === 'c') { if (performance.now() - cDown < 600) pressed.add('c-tap'); cHeld = 0; }
});
window.addEventListener('blur', () => keys.clear());
const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
// (5.3) the touch controls: a joystick where the left thumb lands, and every HUD button by touch
// (5.6.7) the cabin on a phone: the same stick (on its own canvas), a tap uses what he is at
let cabinTouch = null;
// (5.6.8) the thing tapped (renderer.tapRects, CSS pixels): the smallest that holds the point, a finger's slack round each
function tapRectAt(x, y) { const sl = 10 * (window.__fingerK || 1); let best = null, ba = Infinity; for (const r of renderer.tapRects || []) { if (x >= r.x - sl && x <= r.x + r.w + sl && y >= r.y - sl && y <= r.y + r.h + sl && r.w * r.h < ba) { ba = r.w * r.h; best = r; } } return best; }
function wireCabinTouch() { if (cabinTouch || !ui.cabin || !ui.cabin.c) return; cabinTouch = new Touch(ui.cabin.c, { buttonAt: () => null, active: () => !!(!document.getElementById('cabin').hidden), onTap: (x) => { ui.cabin.tapAt(x); return true; } }); ui.cabin.stick = () => (touch.vec.on ? { ...touch.vec, sprint: touch.vec.sprint || !!(g && g.sprintLock) } : cabinTouch.vec); } // (5.6.8) the HUD (and its stick) is over the cabin now
setTimeout(wireCabinTouch, 0);
watchPage(); // (6.0.3) the page's text in the chosen units
const touch = new Touch(hudCanvas, { onTap: (x, y) => { const pm = g.patchMarks; if (pm && renderer.cam) { const cm = renderer.cam, kk = innerWidth / renderer.c.width; for (const [wi, w] of pm.entries()) { const px = ((w.x - cm.x) * cm.ppm + renderer.c.width / 2) * kk, py = ((w.y - cm.y) * cm.ppm + renderer.c.height / 2) * kk; if (Math.hypot(x - px, y - py) < Math.max(36 * (window.__fingerK || 1), cm.ppm * 0.9 * kk)) { g.repairTap = wi; g.repairTapCount = (g.sub.patches || []).length; return true; } } } const o = hud.obsScreen, k = innerWidth / hud.c.width; if (o && Math.hypot(x - o.x * k, y - o.y * k) < o.r * k * 1.6) { touch.key('obs', true); setTimeout(() => touch.key('obs', false), 60); return true; } if (ui.cabinOpen && ui.cabinOpen()) { ui.cabin.tapAt(x); return true; } const tr = tapRectAt(x, y); if (tr) { touch.key(tr.key, true); setTimeout(() => touch.key(tr.key, false), 60); return true; } return false; }, buttonAt: (x, y) => hudButtonAt(x, y), aim: (x, y) => { if (g && renderer.cam && (g.castAim || (g.snatch && g.snatch.left > 0))) { const cm = renderer.cam, kk = innerWidth / renderer.c.width, wx = cm.x + (x / kk - renderer.c.width / 2) / cm.ppm, wy = cm.y + (y / kk - renderer.c.height / 2) / cm.ppm; if (g.castAim) return castTo(wx, wy); if (snatchAt(wx, wy)) return true; } /* (7.6.6) */ if (g && g.siphonAim && renderer.cam) { const cm = renderer.cam, kk = innerWidth / renderer.c.width; return siphonTo(cm.x + (x / kk - renderer.c.width / 2) / cm.ppm, cm.y + (y / kk - renderer.c.height / 2) / cm.ppm); } /* (7.6.8) */ if (!g || !g.dashAim || !renderer.cam) return false; const cm = renderer.cam, kk = innerWidth / renderer.c.width; return dashTo(cm.x + (x / kk - renderer.c.width / 2) / cm.ppm, cm.y + (y / kk - renderer.c.height / 2) / cm.ppm); }, active: () => !!(g && g.mode === 'play' && !hud.panel), onMessage: (m) => { audio.ready && audio.uiSoft(); hud.toast(m); }, onPress: (k) => { if (PLAIN_CLICK.has(k) && audio.ready) audio.click(); } });
hud.touchRef = touch; // (5.7.0) the HUD draws the sprint button beside the stick
// (7.2.4) no full screen asked of the browser: entering it drops the page's pinned scale (the panels and words came out
// 1.8x too large). Full screen is the home-screen app's (manifest), as on an iPhone
// (5.1) the HUD button under the pointer, if any
// (5.17.0) the buttons that do nothing special make the one plain click when pressed (the light, the hand, leaving the
// sub, the menu's tiles, the swap); a greyed one a softer click with its reason. The net, the glow stick and the skill have their own
const PLAIN_CLICK = new Set(['l', 'f', 'g', 'v', 'u', 'leavesub', 'outdeck', 'c', 't', 'b', 'journal', 'settings', 'swap', 'menu', 'r', 'n']);
function hudButtonAt(x, y) { for (const h of hud.hots || []) if (inRect(h, x, y)) return h; return !(ui.cabinOpen && ui.cabinOpen()) ? tapRectAt(x, y) : null; } // (5.6.8) a thing to tap is pressed as a button: a tap does it, a hold holds it (prying, cutting a net free)
hudCanvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

// (4.12.3) a long piece of work in progress, held down
function holdingWork() { return !!(g && (g.pry || g.repair || (g.plant || 0) > 0 || (g.tankFit || 0) > 0)); }
function readMove() {
  if (g.kill) return { x: 0, y: 0, sprint: false }; // in its grip, nothing he does moves him
  if (ui.tankOpen && ui.tankOpen()) return { x: 0, y: 0, sprint: false }; // in the back of the sub, the helm is left alone
  if (ui.trapSetOpen && ui.trapSetOpen()) return { x: 0, y: 0, sprint: false }; // treading water while he chooses the depth
  if (holdingWork()) return { x: 0, y: 0, sprint: false }; // (4.12.3) a long hold (welding, cutting a net free, prying, planting, fitting a tank): he stays put
  if (g.homeRun) return { x: 0, y: 0, sprint: false }; // on autopilot the keys and the mouse leave the helm alone (C hands it back)
  // (5.6.3) a hole tapped: he swims to it by himself (the stick takes over if used)
  if (g.repairTap != null && !(touch && touch.vec.on) && g.sub.patches && g.sub.patches[g.repairTap] && !g.earl.inSub) {
    const w = patchWorld(g.sub, g.sub.patches[g.repairTap]), dx = w.x - g.earl.x, dy = w.y + 0.6 - g.earl.y, d = Math.hypot(dx, dy);
    if (d > 0.9) return { x: dx / d * Math.min(1, d / 2), y: dy / d * Math.min(1, d / 2), sprint: false, stick: true };
  }
  if (touch && touch.vec.on) return { x: touch.vec.x, y: touch.vec.y, sprint: !!(g.aboard && g.abil && g.abil.activeT > 0 && g.abil.def && g.abil.def.speed), stick: true }; // (5.9.0) on a phone speed is the Sprint ability's (no air); on deck it runs // (5.3) the joystick; (5.5.3) or the sprint button's lock
  return { x: 0, y: 0, sprint: false };
}

// ---------------- interactions ----------------
// ---------------- aboard the Margaret (2.4.0; the deck cleared and the ladder 2.5.0) ----------------
// F at the ladder on her side climbs aboard, rung by rung. On deck A / D walk her (he is drawn in her own
// frame, so he rocks with her); walking off either end is a jump into the sea. The only thing to use on
// deck is the wheelhouse door: F goes in, and the helm, the radio, the computer and the hatch down to the
// gallery are all in the cabin. Positions are metres from the boat's centre, + toward the stern.
export const DECK_STATIONS = [{ id: 'door', x: BOAT_DOOR * BOAT_U, name: 'Cabin', label: 'Enter' }];
const DECK_MIN = -6.4, DECK_MAX = 6.1, WALK = 2.0, RUN = 3.4, HOP = 0.55, CLIMB = 2.4, JUMP = 0.75; // (2.6.2: his own pace on deck, whatever fins he owns; Shift runs, Space or W jumps)
const LADDER_M = BOAT_LADDER * BOAT_U, DOOR_M = BOAT_DOOR * BOAT_U;
const deckSurf = () => (g.surfY ? g.surfY(BOAT.x) * 0.8 : 0);
const standY = (x) => deckLine(x / BOAT_U) * BOAT_U + 0.05 - 0.85; // his middle, standing on the deck at x (boat frame, metres)
const nearLadder = () => { const e = g.earl, rx = e.x - BOAT.x; return !e.inSub && !g.aboard && !g.kill && e.y < 2.2 && e.y > -0.5 && Math.abs(rx - LADDER_M) < 1.3; };
// aboard: climb from the water (climb), or standing on deck by the door (a new dive starts there)
function boardDeck(climb = true, quiet = false) {
  if (g.sub && g.sub.imploded) { const sb = g.sub; sb.imploded = false; g.imploded = false; sb.failing = null; sb.hull = 1; g.subTank = []; sb.docked = true; sb.o2 = sb.o2Max; profile.subLost = false; profile.hull = 1; setTimeout(() => say('The sub is back in its cradle', 'sub'), 1200); } // (6.0.0) a sub lost while he lived is waiting for him at the Margaret
  const e = g.earl;
  const at = climb ? LADDER_M : DOOR_M - 0.9;
  g.aboard = { x: at, from: [e.x - BOAT.x, e.y - deckSurf()], walkT: 0, step: 0, walk: 0, climb: climb ? CLIMB : 0, jump: 0 }; g.helm = false; g.deckStations = DECK_STATIONS;
  e.vx = e.vy = 0; e.facing = climb ? -1 : 1;
  if (!quiet) audio.ready && audio.click();
}
function leaveDeck(dir = 1) { if (g.aboard && !g.aboard.jump) { g.aboard.jump = JUMP; g.aboard.dir = dir; g.earl.facing = dir; } } // over the rail and into the water
// leaving the wheel: back into the cabin, standing at it
function leaveHelm() { g.helm = false; g.boatV = g.boatV || 0; if (g.aboard) { g.aboard.x = DOOR_M; ui.toggleCabin(true); ui.cabin.atWheel && ui.cabin.atWheel(); } }
export function useStation(id) {
  if (!g.aboard) return;
  if (id === 'helm') { ui.toggleCabin(false); g.helm = true; return; }
  if (id === 'gallery') { ui.toggleGallery(true); return; }
  if (id === 'door' || id === 'computer') { ui.toggleCabin(true); return; }
  if (id === 'yard') { ui.openShop('sub', ['sub']); return; }
}
// (4.0.0) seconds for the anchor to go down or come up through `d` metres of water
// (6.0.5) a message about a thing or about Earl is written beside it in the scene (render.js drawSay), not in the
// banner; 'earl' follows him. The banner keeps what belongs to the game: quests, warnings, the tutorial's line
function say(text, at) { if (!g) return; const same = (g.says || []).find((q) => q.text === text && !at); if (same) { same.t = 0; return; } /* (7.6.6) the same line again starts the shown one over, never stacks */ (g.says = g.says || []).push({ text, at, t: 0 }); if (g.says.length > 3) g.says.shift(); }
const GLOW_SECONDS = 120; // (5.17.1) a dropped glow stick burns 2 min
// (5.17.1) a glow stick is snapped and let go: it hangs where he was (below the sub, from the sub), lights a pool of water
// round itself, and sinks slowly with a little sway until it rests on the bottom. Several can burn at once; each is its own
// (6.0.1) two kinds, two stacks: the plain stick (16 m, 2 min, amber) and the advanced one (32 m, 3 min, bone-white); the
// one on the belt (profile.glowKind) is the one dropped
const glowKind = () => (profile && profile.glowKind === 'glowAdv' ? 'glowAdv' : 'necklace');
function dropGlow() {
  const e = g.earl, k = glowKind(), adv = k === 'glowAdv'; if (!(g.items[k] > 0)) { hud.toast(adv ? 'No advanced glow sticks on the belt' : 'No glow sticks on the belt', 'warn'); return false; }
  const x = e.inSub ? g.sub.x : e.x, y = Math.max(0.6, e.inSub ? g.sub.y + 1.6 : e.y + 0.3);
  g.items[k]--; (g.glows = g.glows || []).push({ x, y, t: adv ? 180 : GLOW_SECONDS, adv, ph: Math.random() * Math.PI * 2, rot: (Math.random() - 0.5) * 1.2, rest: false });
  audio.ready && audio.click(); return true; // (6.0.1) no toast: its name shows beside it in the water for a moment (render.js)
}
function anchorTime(d) { return d <= 200 ? 3 + 4 * (d / 200) : 7 + 5 * Math.min(1, (d - 200) / 2800); }
// (7.4.17, owner) the coconut island: swimming into its shallows he wades out and walks on it, helmet and tank off as
// on deck; he can walk its length to the palm (past it: a later update) and back into the sea
const ISLE_WALK = 1.6, ISLE_RUN = 3.0;
function ashoreInput(dt, mv) {
  const e = g.earl, W = g.world;
  if (!g.ashore) {
    if (e.inSub || g.aboard || g.kill || g.mode !== 'play') return;
    if (e.x > ISLE.x0 - 6 && e.y < 2.2 && (mv.x || 0) > 0.3 && W.floorAt(e.x + 1.2) < 0.75) { g.ashore = { walk: 0, step: 0, hop: 0, wade: 0.6, saidT: 0 }; e.facing = 1; audio.ready && audio.splash && audio.splash(0.4); }
    return;
  }
  const A = g.ashore, walk = ui.anyOpen() ? 0 : Math.sign(Math.abs(mv.x || 0) > 0.2 ? mv.x : 0), pace = walk && mv.sprint ? ISLE_RUN : ISLE_WALK;
  A.saidT = Math.max(0, A.saidT - dt);
  let nx = e.x + walk * pace * dt;
  if (nx > ISLE.stop) { nx = ISLE.stop; if (walk > 0 && !A.saidT) { say('Area available in a future update', 'earl'); A.saidT = 4; } }
  e.x = nx; if (walk) e.facing = walk;
  // back into the sea: where the water is deep enough to swim
  if (walk < 0 && W.floorAt(e.x) > 0.95) { g.ashore = null; e.y = 0.8; e.vx = -1.2; e.vy = 0.4; e.angle = 0; audio.ready && audio.splash && audio.splash(0.5); return; }
  A.walk = lerp(A.walk || 0, walk ? 1 : 0, 1 - Math.exp(-dt * (walk ? 8 : 6)));
  if (walk || A.walk > 0.05) { const s0 = A.step; A.step = s0 + dt * pace * 3.4; if (Math.floor(A.step / Math.PI) !== Math.floor(s0 / Math.PI) && A.walk > 0.35) audio.ready && audio.footstep && audio.footstep(0.05 * A.walk); }
  if (!ui.anyOpen() && !A.hop && pressed.has(' ')) { A.hop = 0.55; pressed.delete(' '); }
  if (A.hop) A.hop = Math.max(0, A.hop - dt);
  A.wade = Math.max(0, A.wade - dt);
}
function placeAshore() {
  const e = g.earl, A = g.ashore, ground = g.world.floorAt(e.x), hk = A.hop ? 1 - A.hop / 0.55 : 0;
  const stand = ground - 0.85 - Math.abs(Math.sin(A.step || 0)) * 0.03 * (A.walk || 0) - Math.sin(hk * Math.PI) * 0.45;
  e.y = A.wade > 0 ? lerp(stand, e.y, A.wade / 0.6) : stand; // up out of the water over half a second
  e.vx = e.vy = 0; e.angle = -Math.PI / 2; e.speedNow = 0; e.o2 = e.o2Max; e.atSurface = true;
}
function deckInput(dt, mv) {
  const e = g.earl;
  if (!g.aboard) {
    if (nearLadder()) {
      g.prompt = 'F  Climb aboard';
      if (pressed.has('f-tap')) { pressed.delete('f-tap'); boardDeck(); }
    }
    return;
  }
  if (g.helm) { g.prompt = null; return; } // (7.2.4) at the wheel its own buttons say it: the anchor and leaving
  const A = g.aboard;
  if (A.climb > 0 || A.jump > 0) { g.prompt = null; pressed.delete('f-tap'); return; }
  const walk = ui.anyOpen() ? 0 : Math.sign(mv.x || 0), run = walk && mv.sprint, pace = run ? RUN : WALK;
  // walking off either end of the deck: over the rail and into the sea
  if ((walk < 0 && A.x <= DECK_MIN + 0.01) || (walk > 0 && A.x >= DECK_MAX - 0.01)) { leaveDeck(walk > 0 ? 1 : -1); return; }
  A.x = clamp(A.x + walk * pace * dt, DECK_MIN, DECK_MAX);
  // a jump: up and down on the spot (or along, if he is moving), and a thump as he lands
  if (!ui.anyOpen() && !A.hop && pressed.has(' ')) { A.hop = HOP; pressed.delete(' '); }
  if (A.hop) { A.hop = Math.max(0, A.hop - dt); if (!A.hop) audio.ready && audio.footstep && audio.footstep(0.1); }
  if (walk) { e.facing = walk > 0 ? 1 : -1; A.walkT += dt; } else A.walkT = 0;
  // the stride: the legs keep going a moment as he stops, and settle
  A.walk = lerp(A.walk || 0, walk ? 1 : 0, 1 - Math.exp(-dt * (walk ? 8 : 6)));
  if (walk || A.walk > 0.05) {
    const s0 = A.step || 0; A.step = s0 + dt * pace * 3.4; // (the stride lengthens a little when he runs)
    if (Math.floor(A.step / Math.PI) !== Math.floor(s0 / Math.PI) && A.walk > 0.35) audio.ready && audio.footstep && audio.footstep(0.06 * A.walk); // each foot coming down
  }
  const atDoor = Math.abs(A.x - DOOR_M) < 0.7; // (7.1.0) only at the door itself (the old zone took in where the ladder lands, so the door lit with no step taken)
  A.near = atDoor ? 'door' : null;
  g.prompt = atDoor ? 'F  Enter the cabin' : null;
  if (pressed.has('f-tap')) { pressed.delete('f-tap'); if (atDoor && !ui.anyOpen()) useStation('door'); }
}
// where he is in the boat's frame (A.lx, A.ly, metres), and in the world (for the camera and the rest)
function placeOnDeck(dt) {
  const e = g.earl, A = g.aboard, sy = deckSurf();
  e.vx = e.vy = 0; e.angle = -Math.PI / 2; e.o2 = e.o2Max; e.speedNow = 0;
  if (A.jump > 0) { // a stride, over the rail, and down into the water feet first (in the world)
    if (A.jump === JUMP) { A.jx = BOAT.x + A.x; A.jy = sy + standY(A.x); }
    A.jump = Math.max(0, A.jump - dt); const k = 1 - A.jump / JUMP;
    A.inFrame = false;
    e.x = A.jx + A.dir * 1.8 * k; e.y = A.jy - Math.sin(k * Math.PI) * 0.6 + (1.0 - A.jy) * k * k; e.kick = 0;
    if (A.jump <= 0) { g.aboard = null; e.angle = 0; e.y = 1.0; e.vx = A.dir * 0.8; e.vy = 1.4; audio.ready && audio.splash && audio.splash(); for (let i = 0; i < 26; i++) g.bubbles.push({ x: e.x + (Math.random() - 0.5) * 0.8, y: 1.2 + Math.random() * 0.8, r: 0.04 + Math.random() * 0.1, w: Math.random() * 6, t: -Math.random() * 0.3 }); }
    return;
  }
  A.inFrame = true;
  if (A.climb > 0) {
    // up the ladder: a moment to reach it and take hold, the rungs hand over hand, then a step over the rail
    A.climb = Math.max(0, A.climb - dt); const k = 1 - A.climb / CLIMB;
    const y0 = 0.35, yTop = standY(LADDER_M) + 0.25, kg = 0.14, kc = 0.84;
    if (k < kg) { const q = k / kg, qq = q * q * (3 - 2 * q); A.lx = A.from[0] + (LADDER_M - A.from[0]) * qq; A.ly = A.from[1] + (y0 - A.from[1]) * qq; A.pose = 'grab'; }
    else if (k < kc) { const q = (k - kg) / (kc - kg), r0 = A.rung || 0; A.lx = LADDER_M; A.ly = y0 + (yTop - y0) * q; A.pose = 'climb'; A.rung = q * 7 * Math.PI; if (Math.floor(A.rung / Math.PI) !== Math.floor(r0 / Math.PI)) audio.ready && audio.rung && audio.rung(); }
    else { const q = (k - kc) / (1 - kc), qq = q * q * (3 - 2 * q); if (A.pose === 'climb' && q >= 0.5) audio.ready && audio.footstep && audio.footstep(0.08); A.lx = LADDER_M; A.ly = yTop + (standY(LADDER_M) - yTop) * qq - Math.sin(q * Math.PI) * 0.18; A.pose = q < 0.5 ? 'climb' : 'deck'; A.rung = 7 * Math.PI + q * Math.PI; }
    A.x = LADDER_M; e.facing = -1;
  } else {
    const hk = A.hop ? 1 - A.hop / HOP : 0;
    A.lx = A.x; A.ly = standY(A.x) - Math.abs(Math.sin(A.step || 0)) * 0.03 * (A.walk || 0) - Math.sin(hk * Math.PI) * 0.5; A.pose = 'deck';
  }
  e.x = BOAT.x + A.lx; e.y = sy + A.ly; e.kick = A.step || 0;
}

// (5.5) what the observe button looks at: the nearest animal in reach he has not observed yet (swimming, or still on
// the seabed), never one already in the journal, a pet, or anything from the sub or the deck
function observeTarget() {
  const e = g.earl; if (!g.fauna || g.aboard) return null;
  // (6.5.7) from the sub too: an animal close to its glass (within about 7 m of its middle) can be observed
  const unseen = (c) => !c.pet && !c.companion && !g.journal.has(c.sp.id); // (7.4.0, owner) only what is in front of him (or of the sub's nose), and not yet in the book
  if (e.inSub) { const cr2 = g.fauna.nearest(g.sub.x, g.sub.y, 7, g.sub.facing || 1, unseen); return cr2 && !cr2.pet && !cr2.companion && !g.journal.has(cr2.sp.id) ? { kind: 'creature', sp: cr2.sp, c: cr2 } : null; }
  const cr = g.fauna.nearest(e.x, e.y, 3.5, e.facing || 1, unseen);
  if (cr && !cr.pet && !cr.companion /* (7.3.9) never his own pet */ && !g.journal.has(cr.sp.id)) return { kind: 'creature', sp: cr.sp, c: cr };
  let sb = null, sd = 2.6;
  for (const st of g.world.statics) {
    if (Math.abs(st.x - e.x) > sd + 2 || g.journal.has(st.sp.id) || (st.x - e.x) * (e.facing || 1) < -0.3) continue; // (7.4.0) in front only
    const d = dist(e.x, e.y, st.x, st.y - Math.min(1, st.sp.len * 0.4));
    if (d < sd) { sd = d; sb = st; }
  }
  return sb ? { kind: 'creature', sp: sb.sp } : null;
}
function findTarget() {
  const e = g.earl, W = g.world;
  const tn = trapNear(g);
  if (tn) return { kind: 'trap', ...tn };
  const reach = e.inSub ? 7 : 2.4;
  // pickups
  let best = null, bd = reach;
  for (const p of W.pickups) {
    if (p.taken) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < bd) { bd = d; best = { kind: 'pickup', p }; }
  }
  if (best) return best;
  if (!e.inSub && !g.sub.imploded && dist(e.x, e.y, g.sub.x, g.sub.y) < 4.5) return { kind: 'board' };
  if (!e.inSub && !g.aboard && e.y < 3.2 && Math.abs(e.x - yardX()) < 7) return { kind: 'yard' }; // (7.6.23, owner) the shipyard barge
  // (6.5.7) a guardian jellyfish (the sea lantern) close by: the hand reads it
  if (!e.inSub) for (const l of W.lanterns) if (dist(e.x, e.y, l.x, l.y) < Math.min(4, LANTERN_RADIUS)) return { kind: 'guardian', l };
  if (!e.inSub && W.inKelp(e.x, e.y)) {
    // (v2: kelp blades are no longer cut and sold)
  }
  // creatures (moving, then on the floor)
  const cr = g.fauna.nearest(e.x, e.y, e.inSub ? 9 : 3.5);
  if (cr) return { kind: 'creature', sp: cr.sp, c: cr };
  let sb = null, sd = e.inSub ? 9 : 2.6;
  for (const s of W.statics) {
    if (Math.abs(s.x - e.x) > sd + 2) continue;
    const d = dist(e.x, e.y, s.x, s.y - Math.min(1, s.sp.len * 0.4));
    if (d < sd) { sd = d; sb = s; }
  }
  if (sb) return { kind: 'creature', sp: sb.sp };
  return null;
}

function promptFor(t) {
  g.promptName = null; g.promptBar = null; // (4.5.0) a hold in progress: a small bar under the words, not a counting percentage
  const e = g.earl;
  const nearBoat = Math.abs(e.x - BOAT.x) < 14 && e.y < 4;
  let p = null;
  if (t) {
    if (t.kind === 'pickup') {
      const name = t.p.type === 'necklace' ? 'glow stick' : t.p.type === 'sapphire' ? 'deep sapphire' : (RESOURCES[t.p.type] ? RESOURCES[t.p.type].name.toLowerCase() : t.p.type);
      if (t.p.type === 'net') p = g.pry && g.pry.p === t.p ? (g.promptBar = g.pry.t / HOLD_TIME.net, 'Cutting the net free') : `Hold F  Cut the ${t.p.animal} free`;
      else p = PRY.has(t.p.type) ? (g.pry && g.pry.p === t.p ? (g.promptBar = g.pry.t / PRY_TIME, 'Prying loose') : `Hold F  Pry loose the ${name}`) : `F  Collect ${name}`;
    } else if (t.kind === 'board') {
      p = 'F  Board the submersible';
    } else if (t.kind === 'yard') { p = 'F  The shipyard'; }
    else if (t.kind === 'trap') { const S0 = trapSetOf(profile, t.t.id), lf = S0 ? trapLeft(S0) : 0, when = lf > 0 ? `, ${timeLeftText(lf)} to go` : ', done'; // (7.3.0) its time, in real time
      p = t.how === 'haul' ? `F  ${TRAPS[t.t.type].winch ? 'Winch up' : 'Pull up'} the catch (${t.t.catch.length} inside${when})`
      : t.how === 'needboat' ? `The ${TRAPS[t.t.type].name.toLowerCase()} is emptied with the Margaret's winch: bring her here (${t.t.catch.length} inside${when})`
      : `F  Empty the ${TRAPS[t.t.type].name.toLowerCase()} (${t.t.catch.length} inside${when})`; }
    else if (t.kind === 'kelp') p = 'F  Cut a kelp blade';
    else if (t.kind === 'creature' && t.c && t.c.pet) p = `${t.c.pet.name || 'Your ' + t.sp.name.toLowerCase()}${t.c.pet.famous ? ' ★' : ''} · released here, from your aquarium`;
    else if (t.kind === 'guardian') p = 'F  Guardian jellyfish';
    else if (t.kind === 'creature') { p = g.journal.has(t.sp.id) ? `${t.sp.name}` : 'F  Observe'; if (g.journal.has(t.sp.id)) { const R = rarityOf(t.sp); g.promptName = { text: t.sp.name, col: R ? R.col : null, legend: !!(R && R.id === 'legendary') || LEGENDARY.has(t.sp.id) }; } } // (4.12.0) its name in its rarity's colour
  }
  { const pi = !e.inSub && !g.sub.imploded ? patchNear() : -1; g.repairNear = pi >= 0; // a damaged patch within reach: hold R (the hand becomes the spanner, hud.js)
    if (pi >= 0) p = g.repair && g.repair.i === pi ? (g.promptBar = g.repair.t / REPAIR_TIME, 'Repairing') : (p ? p + '   ·   ' : '') + 'Hold R  Repair';
    else if (!e.inSub && !g.sub.imploded && (g.sub.patches || []).length && dist(e.x, e.y, g.sub.x, g.sub.y) < 9) p = (p ? p + '   ·   ' : '') + 'The sub needs repairs: swim to a hole'; }
  if (canPlant(t)) p = g.plant ? (g.promptBar = g.plant / PLANT_TIME, 'Planting coral') : 'Hold F  Plant a coral fragment';
  if (e.inSub) p = (p ? `${p}   ·   hold F  Leave sub` : 'F  Leave the submersible') + '   ·   T  Tank room';
  if ((nearBoat || (e.inSub && g.sub.docked)) && !g.aboard && !g.helm) p = (p ? p + '   ·   ' : '') + 'U  Sell'; // (the helm, the shops and the radio are aboard)
  return p;
}

function canPlant(t) {
  const e = g.earl;
  if (t && t.kind === 'pickup' && Math.hypot(t.p.x - e.x, t.p.y - e.y) < 1.2) return false; // right on top of something else
  return !e.inSub && (g.inv.coral || 0) > 0 && e.y < 80 && g.world.floorAt(e.x) - e.y < 2.5;
}
function deed(calm, text) {
  const ent = g.entity;
  ent.appease(g, calm);
  hud.toast(text, 'note');
  audio.ready && audio.note();
}
function interact(t, exitSub) {
  const e = g.earl, sub = g.sub;
  if (exitSub && e.inSub) return leaveSub();
  if (!t) { if (e.inSub) leaveSub(); return; }
  if (t.kind === 'trap') {
    if (t.how === 'needboat') { hud.toast('Emptied with the Margaret\'s winch: bring her here', 'warn'); return; }
    // (7.3.0, owner) from the surface: cash out (sell the whole catch there and then) or into the bag
    if (t.how === 'haul' && t.t.catch.length) { trapChoice(t.t); return; }
    // (7.3.0) whatever fits goes into the bag (the rest waits in it); with its time up and nothing left, it comes up
    const nm = TRAPS[t.t.type].name.toLowerCase(), r = emptyTrap(g, t.t, t.how);
    if (r.n) questEvent(profile, 'trapHaul'); /* (6.8.0) */
    hud.toast(r.n ? `${r.n} into the bag${r.left ? ` · ${r.left} still in the ${nm}: the bag is full` : ''}${r.stowed ? ` · the ${nm} comes up` : ''}` : r.left ? `The bag is full: ${r.left} still in the ${nm}` : r.stowed ? `The ${nm} comes up` : `Nothing in the ${nm} yet`, r.left ? 'warn' : '');
    audio.ready && audio.click(); saveProfile(profile);
    return;
  }
  // (6.5.7) the guardian jellyfish's note, written beside it in the water; it stays while he is in its light and fades
  // when he swims off, and the hand brings it back any time
  if (t.kind === 'guardian') { const L0 = (g.obsLabels || (g.obsLabels = [])); if (!L0.some((L) => L.guard === t.l)) L0.push({ c: null, x: t.l.x, y: t.l.y, text: 'Guardian jellyfish', rar: 'Its light keeps the deep away', col: '#c9c2a6', t: 0, guard: t.l, stay: LANTERN_RADIUS }); audio.ready && audio.note(); return; }
  if (t.kind === 'pickup' && t.p.type === 'net') {
    // freed: the animal swims off, the net comes away
    t.p.taken = true;
    const sp = SPECIES_BY_ID[t.p.animal === 'turtle' ? 183 : 30];
    const c = g.fauna.makeFish(sp, t.p.x, t.p.y - 0.5, e.facing, g.fauna.groupId++, true);
    c.vy = -0.8; g.fauna.list.push(c);
    deed(DEED_CALM.net, t.p.animal === 'turtle' ? 'The turtle swims free.' : 'The fish swims free.');
    return;
  }
  if (t.kind === 'pickup') {
    const p = t.p;
    // taking things from the deep draws its attention
    if (p.y > 200) g.entity.disturb(g, p.type === 'necklace' ? 0.3 : p.type === 'sapphire' ? 0.25 : 0.04);
    if (p.type === 'necklace') {
      if (g.items[p.type] >= supplyMax(profile, p.type)) { hud.toast('Your belt is full of glow sticks', 'warn'); return; }
      g.items[p.type]++;
      ui.showGains([{ kind: 'supply', id: p.type }]);
    } else if (p.type === 'sapphire') {
      g.sapphires++; g.inv.sapphire = (g.inv.sapphire || 0) + 1;
      hud.toast(`Deep sapphire · about ${money(priceOf(profile, 'sapphire', GOODS.sapphire.price))}`, 'big');
      audio.ready && audio.sapphire();
    } else {
      g.inv[p.type] = (g.inv[p.type] || 0) + 1;
      if (p.type === 'clam' && p.pearl) { g.inv.pearl = (g.inv.pearl || 0) + 1; hud.toast('There was a pearl inside'); }
      else hud.toast(`+1 ${RESOURCES[p.type].name}`);
    }
    p.taken = true;
    audio.ready && audio.pickup();
  } else if (t.kind === 'yard') { ui.openShop('sub', ['sub']); audio.ready && audio.click(); return;
  } else if (t.kind === 'board') {
    e.inSub = true; sub.docked = false; if (profile) { profile.subTimes = (profile.subTimes || 0) + 1; saveProfile(profile); } // (4.7.0) for the lessons
    if (sub.o2 < 1 && sub.y > 2.2) hud.toast('Cabin out of air: breathing from your tank', 'warn');
    // nothing is moved for him: his catch stays in the bag until he drags it to a chamber or the tank
    if ((sub.patches || []).length) hud.toast('The sub needs repairs', 'warn'); // (4.5.0) said only on climbing in; nothing else is
    audio.ready && audio.click();
  } else if (t.kind === 'kelp') {
    t.k.harvested = true; g.inv.kelp = (g.inv.kelp || 0) + 1; hud.toast('+1 Kelp'); audio.ready && audio.pickup();
  } else if (t.kind === 'creature') {
    if (!g.journal.has(t.sp.id)) {
      g.journal.set(t.sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() });
      questEvent(profile, 'observe'); // (4.0.6)
      profile.journal = [...g.journal.entries()]; saveProfile(profile);
      // (5.5.3) its name written beside it in the water, faint, and gone again (no scientific name, no line at the top
      // of the screen); the rarity under it only when it is better than common
      { const R = rarityOf(t.sp); (g.obsLabels || (g.obsLabels = [])).push({ c: t.c || null, x: t.c ? t.c.x : (t.x ?? e.x), y: t.c ? t.c.y : (t.y ?? e.y), text: t.sp.name, rar: null, nameCol: R ? R.col : null, t: 0 } /* (7.2.8) the name alone, in its rarity's colour (no rarity word under it) */); if (g.obsLabels.length > 3) g.obsLabels.shift(); }
      audio.ready && audio.note();
      ui.journalDirty = true;
    } else if (!e.inSub && (QUEST_MAIN[questsOf(profile).main] || {}).id === 'firstfish' && firstFishPart(profile) <= 1) {
      // (4.3.0) the Log's 'observe' step, with a fish already in the journal (observed before the step came up)
      questEvent(profile, 'observe'); saveProfile(profile); hud.toast(`${t.sp.name}: observed`, 'note'); audio.ready && audio.note();
    } else if (e.inSub) leaveSub();
  }
}

function leaveSub() {
  const e = g.earl, sub = g.sub;
  if (g.lesson) { hud.toast('Finish the lesson first', 'warn'); return; } // (4.12.2) a lesson keeps him in the sub
  e.inSub = false;
  // (4.18.3) out through the hatch into open water: behind her as before, but if that is inside the seabed or a
  // rock (backed against a cliff, sitting on a slope) another side of the hull. Before, the collision pushed him
  // out onto the floor above, which against a cliff could throw him 150 m up in one frame.
  const W = g.world, open = (x, y) => y > 0.35 && W.floorAt(x) > y + 0.6 && !W.rockAt(x, y, 0.6);
  const tries = [[-1.5, 2.6], [1.5, 2.6], [-2.5, 0], [2.5, 0], [0, -2.2], [-1.5, -1.8], [1.5, -1.8], [0, 3.4]];
  let ex = sub.x - sub.facing * 1.5, ey = Math.max(0.4, sub.y + 2.6);
  for (const [dx, dy] of tries) { const x = sub.x + dx * sub.facing, y = Math.max(0.4, sub.y + dy); if (open(x, y)) { ex = x; ey = y; break; } }
  e.x = ex; e.y = ey; e.vx = 0; e.vy = 0;
  // (2.5.0: leaving the sub no longer puts it in her cradle: it docks when the Margaret gets under way)
  if (e.y > (e.pressStart || 300) * 2) { hud.toast('Outside, the pressure is immense.', 'warn'); g.pressWarned = true; } // (5.12.0) past twice the suit's depth // (3.0.0) back; (3.0.17) from the suit's own limit

  audio.ready && audio.click();
}

// ---------------- taken: the jaws ----------------
// The strike reaches him and everything goes silent. It comes in from the side of the screen with its
// mouth already opening, the lower jaw dropping and the sack ballooning; he is in the open mouth (the
// water shows through it, and him in it), and it shuts. In the sub there is nothing to be done: that is
// the third approach. Swimming, there is one last moment as the jaws open: flash the lamp (once: it
// learns), or wear the necklace.
const KILL_LUNGE = 0.95, KILL_CLOSE = 0.16;
// which way it can come at him from: along a line of open water (no rock, not through the bottom or
// out of the sea), sideways if it can, else rising at an angle from below, or down from above
function killDirection(T) {
  const W = g.world, ent = g.entity;
  if (ent.killDir) { const d = ent.killDir; ent.killDir = null; return d; }
  const side = Math.sign(ent.x - T.x) || 1;
  const cands = [[side, 0, 6], [-side, 0, 5], [side, 0.6, 3], [-side, 0.6, 2.5], [side, 1.1, 1], [-side, 1.1, 0.8], [side, -0.45, 1.5], [-side, -0.45, 1.2]];
  let best = null, bestS = -1;
  for (const [sx, a, pref] of cands) {
    const ux = sx * Math.cos(a), uy = Math.sin(a);
    let run = 0;
    for (let k = 3; k <= 75; k += 3) { const px = T.x + ux * k, py = T.y + uy * k; if (py < 3 || W.rockAt(px, py, 1.5) || W.floorAt(px) < py + 2) break; run = k; }
    const score = Math.min(run, 70) + pref;
    if (score > bestS) { bestS = score; best = [ux, uy]; }
  }
  return best;
}
function startKill() {
  const e = g.earl, ent = g.entity, inSub = e.inSub && !g.sub.imploded;
  const T = inSub ? g.sub : e;
  const [dx, dy] = killDirection(T);
  // its body lies along the way it comes in (belly down), so it is drawn turned to match
  const flip = dx >= 0 ? 1 : -1, rot = flip > 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx);
  // the point inside its open mouth he ends up at: 10 m behind the snout, 2.5 m down
  const ox = flip * 10, oy = 2.5, offX = ox * Math.cos(rot) - oy * Math.sin(rot), offY = ox * Math.sin(rot) + oy * Math.cos(rot);
  const V = g.viewBox, half = V ? Math.max(V[1] - V[0], V[3] - V[2]) / 2 : 20;
  const x1 = T.x - offX, y1 = T.y - offY, x0 = x1 + dx * (half + 22), y0 = y1 + dy * (half + 22); // from off the screen
  ent.x = x0; ent.y = y0; ent.vx = ent.vy = 0; ent.faceLock = -flip; ent.eyeOpen = 1;
  ent.dist = Math.hypot(ent.x - e.x, ent.y - e.y);
  const s = flip;
  g.kill = { t: 0, inSub, s, esc: false, escT: 0, open: 0, x0, y0, x1, y1, dx, dy, rot, flip, window: inSub ? null : [0, 0.9] }; // (5.10.1) a thumb needs a moment longer than a key
  ui.closeAll && ui.closeAll();
  audio.ready && audio.drop();
  g.fx.shake = Math.max(g.fx.shake, 1.2);
}
function killUpdate(dt) {
  const K = g.kill, e = g.earl, ent = g.entity;
  K.t += dt;
  e.vx = e.vy = 0; if (K.inSub) g.sub.vx = g.sub.vy = 0;
  ent.dist = Math.hypot(ent.x - e.x, ent.y - e.y);
  if (K.esc) {
    K.escT += dt;
    // it veers off the way it came
    ent.x += K.dx * dt * 20; ent.y += K.dy * dt * 20; K.open = Math.max(0, K.open - dt * 3);
    if (K.escT > 0.6) { g.kill = null; ent.faceLock = null; }
    for (const k of ['l', 'q', 'e', 'ability']) pressed.delete(k);
    return;
  }
  // the moment to get free (swimming only)
  if ((K.window && K.t > K.window[0] && K.t < K.window[1]) ) { // (5.6.4) the moment before the jaws shut
    let how = null;
    /* (6.0.0) no Tidewarden in the jaws: once it strikes, nothing stops it (Rebirth, after, is the only way back) */
    if (how) { escapeKill(how); for (const k of ['l', 'q', 'e', 'ability']) pressed.delete(k); return; }
  }
  for (const k of ['l', 'q', 'e', 'ability']) pressed.delete(k);
  // the lunge: it comes across the screen, the jaw dropping as it comes, until he is well inside the
  // gape (about 10 m behind its snout); then the jaws shut
  const k = clamp(K.t / KILL_LUNGE, 0, 1), ease = 1 - Math.pow(1 - k, 2.2);
  ent.x = K.x0 + (K.x1 - K.x0) * ease; ent.y = K.y0 + (K.y1 - K.y0) * ease;
  if (!K.opened && K.t > 0.05) { K.opened = true; audio.ready && audio.scare(); g.fx.shake = Math.max(g.fx.shake, 2.5); }
  if (K.t < KILL_LUNGE) K.open = clamp(K.t / 0.45, 0, 1);
  else {
    const c = (K.t - KILL_LUNGE) / KILL_CLOSE;
    K.open = Math.max(0, 1 - c);
    if (c >= 1 && !K.swallowed) { K.swallowed = true; g.fx.shake = Math.max(g.fx.shake, 3.2); }
    if (c >= 1.6 && !K.done) { K.done = true; die(causeText('entity'), 'devoured'); }
  }
}
function escapeKill(how) {
  const K = g.kill, ent = g.entity, e = g.earl;
  K.esc = true; K.escT = 0;
  audio.ready && audio.restore(0.25);
  if (how === 'flash') { g.fx.flash = 0.7; g.lampFlashT = g.time; }
  // it lets go, but not before it has done its damage (never enough, on its own, to kill)
  if (K.inSub) {
    g.sub.hull = Math.max(0, g.sub.hull - 0.35); audio.ready && audio.ram();
    hud.toast(`${how === 'tide' ? 'The water turns blue' : 'The necklace burns it'}: it lets go · hull ${Math.round(g.sub.hull * 100)} %`, 'warn');
  } else {
    g.injury = Math.min(4, g.injury + 2); g.healT = 0; g.fx.redFlash = 1; // its teeth caught him as it turned
    for (let i = 0; i < 30; i++) g.blood.push({ x: e.x + (Math.random() - 0.5) * 0.8, y: e.y + (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: 0.3 + Math.random() * 0.5, t: 0, life: 6 });
    hud.toast(`${how === 'flash' ? 'The light burns it' : 'The necklace burns it'}: it turns away, but bit you`, 'warn');
  }
  g.fx.shake = Math.max(g.fx.shake, 2);
  ent.hunt = null;
  ent.goAway(e.x, e.y, ent.band(g)[0]);
}

// ---------------- repairs during a dive ----------------
// Sealant (K, inside): six seconds of work along the seams, +20 % hull, but only up to 85 %: a seal
// stops water, it does not give back the steel's strength. A patch plate (hold F outside, by the
// hatch): ten seconds of wet welding, +40 % hull, all the way to sound. The arc is the brightest
// thing in the deep, and below 200 m something notices it. Either job stops if he is interrupted.
function repairs(dt, target, holding) {
  const e = g.earl, sub = g.sub;
  // a backup air tank being connected: two clanks of the fittings and a thin leak of gas, then the
  // valve opens with a hiss and a rush of bubbles from the vent, and the cabin fills
  if (g.tankFit) {
    if (!e.inSub || sub.imploded) { g.tankFit = 0; hud.toast('The tank was not connected', 'warn'); }
    else {
      g.tankFit += dt;
      const clank = g.tankFit > 0.7 && g.tankClank < 1 ? 1 : g.tankFit > 1.8 && g.tankClank < 2 ? 2 : 0;
      if (clank) { g.tankClank = clank; audio.ready && audio.thud && audio.thud(0.12); audio.ready && audio.click(); }
      if (g.tankFit > 1 && Math.random() < dt * 4) audio.ready && audio.burst('highpass', 4000 + Math.random() * 2000, 1, 0.15, 0.02);
      if (Math.random() < dt * 10) g.bubbles.push({ x: sub.x + (Math.random() - 0.5) * 2, y: sub.y - 0.5, r: 0.02 + Math.random() * 0.04, w: Math.random() * 6, t: 0 });
      if (g.tankFit >= 3) {
        g.tankFit = 0; g.items.airTank--; sub.o2 = sub.o2Max; questEvent(profile, 'airTank'); // (4.0.6)
        audio.ready && audio.burst('bandpass', 2600, 0.8, 0.9, 0.09); // the valve: a hiss
        audio.ready && audio.bubbles && audio.bubbles(10, 0.03);
        for (let i = 0; i < 70; i++) g.bubbles.push({ x: sub.x + (Math.random() - 0.5) * 3, y: sub.y - 0.6 + (Math.random() - 0.5) * 1.5, r: 0.04 + Math.random() * 0.16, w: Math.random() * 6, t: -Math.random() * 0.8 });
        hud.toast(`Cabin air full · ${g.items.airTank} tank${g.items.airTank === 1 ? '' : 's'} left`);
      }
    }
  }
  // the hull's damage as patches: each 15 % lost is a dented, cracked place on her side, leaking.
  // Outside, at a patch, hold F: five seconds of work mends it (no kit needed)
  syncPatches(sub);
  const near = !e.inSub && !sub.imploded ? patchNear() : -1;
  if (near >= 0 && holding && !e.inSub) {
    if (!g.repair || g.repair.i !== near) g.repair = { i: near, t: 0 };
    g.repair.t += dt;
    // wet welding (2.5.0): the arc at the hole, sparks, the crackle and hiss, and a stream of bubbles
    const q = patchWorld(sub, sub.patches[near]); g.welding = { x: q.x, y: q.y };
    if (Math.random() < dt * 14) audio.ready && audio.burst('highpass', 3000 + Math.random() * 4000, 0.8, 0.05 + Math.random() * 0.08, 0.05 + Math.random() * 0.05); // the arc's crackle
    if (Math.random() < dt * 2) audio.ready && audio.burst('bandpass', 1800, 0.6, 0.5, 0.03); // the hiss of boiling water
    if (Math.random() < dt * 3) audio.ready && audio.thud && audio.thud(0.04); // the rod against steel
    for (let i = 0; i < 2; i++) if (Math.random() < dt * 20) g.bubbles.push({ x: q.x + (Math.random() - 0.5) * 0.3, y: q.y + (Math.random() - 0.5) * 0.2, r: 0.02 + Math.random() * 0.06, w: Math.random() * 6, t: 0 });
    if (g.repair.t >= REPAIR_TIME) {
      sub.patches.splice(near, 1);
      sub.hull = sub.patches.length ? Math.min(1, sub.hull + PATCH_SHARE) : 1;
      g.repair = null; g.welding = null; g.patchCount = sub.patches.length;
      hud.toast(sub.patches.length ? `Hole mended: ${sub.patches.length} left` : 'The sub is repaired');
      audio.ready && audio.click(); audio.ready && audio.bubbles && audio.bubbles(6, 0.04);
    }
  } else { g.repair = null; g.welding = null; }
}
// each 30 % of lost hull shows as one hole, somewhere along her side, three at most (2.5.0: was 15 %, six)
// (sub-local units, 100 = her length)
const PATCH_SHARE = 0.3, REPAIR_TIME = 3; // (4.5.0) three seconds a hole
function syncPatches(sub) {
  if (!sub.patches) sub.patches = [];
  const n = sub.imploded ? 0 : Math.min(3, Math.max(0, Math.ceil((1 - sub.hull) / PATCH_SHARE - 0.02)));
  if (n > (g.patchCount || 0) && !sub.imploded) { if (!g.repairHinted) { g.repairHinted = true; hud.hint('Swim to a hole in the sub\'s hull and tap it to mend it'); } }
  g.patchCount = n;
  while (sub.patches.length > n) sub.patches.pop();
  for (let tries = 0; sub.patches.length < n && tries < 40; tries++) {
    const u = -44 + Math.random() * 88, v = -18 + Math.random() * 16;
    if (sub.patches.some((q) => Math.abs(q.u - u) < 12)) continue;
    sub.patches.push({ u, v, seed: Math.random() * 1000, r: 3 + Math.random() * 2 });
  }
}
function patchWorld(sub, q) { const k = 0.09, c = Math.cos(sub.yaw || 0), f = (c >= 0 ? 1 : -1) * Math.max(0.14, Math.abs(c)); return { x: sub.x + f * q.u * k, y: sub.y + q.v * k }; } // (as the renderer draws her: mirrored and squashed by her turn)
function patchNear() {
  const sub = g.sub, e = g.earl;
  if (!sub.patches || !sub.patches.length || dist(e.x, e.y, sub.x, sub.y) > 7) return -1;
  let best = -1, bd = 2;
  sub.patches.forEach((q, i) => { const w = patchWorld(sub, q), d = dist(e.x, e.y, w.x, w.y); if (d < bd) { bd = d; best = i; } });
  return best;
}

// crush depth. No hull fails at an exact number: each dive the sub has its own hidden crush depth,
// on average about 1.62x its rating (about 470 m for a 300 m sub), rarely above 1.33x (400 m) or
// past 1.8x (540 m). Within about a quarter of its rating of that depth the chance of failing rises
// exponentially, so creeping deeper is a gamble that worsens fast. When it goes, it goes: one loud
// crack, half a second, and it is over.
const FAIL_WINDOW = 0.5;
function crushDepth(dt) {
  const sub = g.sub, r = sub.y / sub.rated;
  // (4.5.0) a hull at 0 %: ten seconds, unsaid, then she goes (a mended hole in time stops it)
  if (!sub.imploded && !sub.docked && sub.hull <= 0.001) { sub.breachT = (sub.breachT || 0) + dt; if (sub.breachT >= 10) { g.implodeNow = true; sub.breachT = 0; } } else sub.breachT = 0;
  if (sub.failing != null) {
    sub.failing += dt;
    g.fx.shake = Math.max(g.fx.shake, 1 + sub.failing * 3);
    if (sub.failing > FAIL_WINDOW) g.implodeNow = true;
    return;
  }
  // a new hidden crush depth each dive (drawn whenever she is at the surface)
  if (sub.crushR == null || sub.y < 2.2 || sub.crushFor !== sub.rated) { sub.crushR = rollCrush(sub.rated); sub.crushFor = sub.rated; }
  const c = sub.crushR, win = (crushMean(sub.rated) - 1) * 0.4, k = 0.25 / win; // the risk window: narrower on deeper hulls
  // half a chance a second right at it, rising exponentially as she nears it; sure past it
  if (r > c - win && (r >= c + 0.03 * win / 0.25 || Math.random() < dt * 0.5 * Math.exp((r - c) * 30 * k))) {
    sub.failing = 0;
    g.fx.shake = Math.max(g.fx.shake, 1.4);
    audio.ready && audio.creak(1.3);
  }
}

// (5.16.0) the legendary powers that trigger, and when each can trigger again (real time, ms)
const POWER_CD = { secondwind: 2 * 3600, rebirth: 6 * 3600 };
// (6.0.0) one timer for every net power that triggers: when one fires, the timer starts at that power's own cooldown;
// switching nets never resets it (another triggering net picks up the time left, whatever its own cooldown), and on a
// net whose power is always on it keeps counting, hidden, for when he switches back
const powerReady = (k) => { void k; return !(profile && profile.netPowerAt > Date.now()); };
const spendPower = (k) => { profile.netPowerAt = Date.now() + POWER_CD[k] * 1000; profile.netPowerFor = POWER_CD[k]; saveProfile(profile); };
// (5.16.0) Rebirth (Jonah's Seine): any death, an even chance the sea gives him back: air full, lifted to his suit's safe
// depth, the thing gone (back later along its route), the mark lifted; out of a lost sub, floating where she was. Then
// three seconds in which nothing can kill him
// (6.0.0) Rebirth: the screen goes black, then his eyes open (hud.wakeFx). He is given back where the rules put him, air
// full, at his suit's safe depth, the thing gone and coming back along its route; and the sub is put right beside him,
// whole (an imploded one too, its chambers empty), so what killed him does not kill him again at once. After being
// eaten, and only then, he says one line to himself (render.js): the only time in the game he speaks
function rebirth(kind) {
  const e = g.earl, ent = g.entity, sub = g.sub;
  clearFx();
  spendPower('rebirth');
  if (kind === 'implode' || e.inSub) { e.inSub = false; e.x = sub.x; e.y = sub.y; }
  e.o2 = e.o2Max; g.noAir = 0; g.injury = 0; g.kill = null; e.vx = e.vy = 0;
  const safe = (e.pressStart || 300) - 5; if (e.y > safe) e.y = Math.max(2, safe);
  if (sub.imploded || kind === 'implode') { sub.imploded = false; g.imploded = false; sub.failing = null; sub.hull = 1; g.subTank = []; }
  sub.docked = false; sub.vx = sub.vy = 0; sub.o2 = sub.o2Max; sub.x = clamp(e.x + 9, 6, 4994); /* (6.0.1) a little off to his right, so the open water on his left is free for his words */ sub.y = Math.max(2, Math.min(e.y, g.world.floorAt(sub.x) - 3));
  if (ent) { ent.faceLock = null; ent.marked = false; ent.hunt = null; ent.ap = null; ent.slip = null; ent.sleepT = 90; ent.x = 20 + Math.random() * 4960; ent.y = ent.band(g)[0] + Math.random() * 400; }
  g.rebirthT = 7; g.wake = { t: 0, eaten: kind === 'devoured' }; ui.closeAll && ui.closeAll(); audio.ready && audio.drop && audio.drop();
}
// (6.5.9) the revive offer. Only when the haul he would lose is worth something to him: more than 15 % of his cash, at
// least $200, never more than $100,000 asked. (6.6.1) One revive a dive, no more: the first a diver ever takes is an ad,
// every one after it (in later dives) $0.99. Rebirth, when it does not
// save him, still leaves the offer. A revive gives him back where he was with what he carried and 30 % of his air; the
// thing draws off for about 20 s but he stays marked. Never in the tutorial, never on quitting
const haulValue = () => [...g.bag, ...g.subTank].reduce((a, s) => a + specimenValue(s), 0);
export const REVIVE_PEARLS = 100; // (7.3.9, owner) the least a revive costs
// (7.6.2, owner) a revive costs by what is at stake: 100 pearls when the haul is a fifth of his cash or less, rising
// evenly to 500 when it is worth all his cash or more
export const revivePrice = (haul, cash) => { const r = cash > 0 ? haul / cash : 9; return Math.round(clamp(100 + (r - 0.2) / 0.8 * 400, 100, 500)); };
const reviveNeed = (cash) => Math.min(100000, Math.max(200, cash * 0.15));
function reviveOfferFor(kind, cause) {
  if (kind === 'quit' || !profile || profile.tut === 'on' || g.reviveAsked) return null;
  const v = haulValue(); if (v < reviveNeed(profile.cash || 0)) return null;
  if (g.revived) return null; const how = 'pearls'; // (7.3.9, owner) a revive costs pearls (REVIVE_PEARLS), not an ad or $0.99
  // what he would lose, kind by kind: the picture, how many, what they are worth
  const by = new Map(); for (const s of [...g.bag, ...g.subTank]) { const k = s.id, r = by.get(k) || { sp: SPECIES_BY_ID[k], n: 0, value: 0 }; r.n++; r.value += specimenValue(s); by.set(k, r); }
  const e = g.earl, depth = Math.round(Math.max(e.y, e.inSub ? g.sub.y : 0));
  return { value: v, pearls: revivePrice(v, profile.cash || 0), n: g.bag.length + g.subTank.length, list: [...by.values()].filter((r) => r.sp).sort((a, b) => b.value - a.value), how, cause: /\d m\b/.test(cause) ? cause : `${cause} at ${depth} m` };
}
// (7.6.29, owner) coming back (Rebirth, a revive): nothing of the moment before hangs on in front of him
function clearFx() { g.blood = []; g.inkPuffs = null; g.bursts = []; g.dashFx = null; g.snatchFx = null; g.castNet = null; g.siphon = null; g.siphonAim = null; g.dashAim = null; g.castAim = null; renderer.wake && renderer.wake.reset(); }
function revive(kind) {
  const e = g.earl, ent = g.entity, sub = g.sub;
  clearFx();
  if (kind === 'implode' || e.inSub) { e.inSub = false; e.x = sub.x; e.y = sub.y; }
  e.o2 = e.o2Max * 0.3; g.noAir = 0; g.injury = 0; g.kill = null; e.vx = e.vy = 0;
  const safe = (e.pressStart || 300) - 5; if (e.y > safe) e.y = Math.max(2, safe); // not straight back under the pressure that killed him
  if (sub.imploded || kind === 'implode') { sub.imploded = false; g.imploded = false; sub.failing = null; sub.hull = 1; sub.docked = false; sub.x = clamp(e.x + 9, 6, 4994); sub.y = Math.max(2, Math.min(e.y, g.world.floorAt(sub.x) - 3)); }
  if (ent) { ent.faceLock = null; ent.hunt = null; ent.ap = null; ent.slip = null; if (ent.goAway) ent.goAway(e.x, e.y, ent.band(g)[0], 20); } // it draws off for a while; the mark stays
  g.rebirthT = 3; g.wake = { t: 0, eaten: false, plain: true }; ui.closeAll && ui.closeAll(); audio.ready && audio.drop && audio.drop();
}
function die(cause, kind = 'normal', declined = false) {
  if (g.mode !== 'play' || g.noDeath) return;
  if ((g.rebirthT || 0) > 0 && kind !== 'quit') return; // (5.16.0) the grace after a Rebirth
  if (kind !== 'quit' && g.earl.legends && g.earl.legends.has('rebirth') && powerReady('rebirth') && Math.random() < 0.5) { rebirth(kind); return; }
  if (!declined) { const o = reviveOfferFor(kind, cause);
    if (o) { g.reviveAsked = true; g.paused = true;
      ui.reviveOffer(o, async (how) => {
        let ok = false;
        if (how === 'pearls' && (profile.pearls || 0) >= o.pearls) { profile.pearls -= o.pearls; saveProfile(profile); ok = true; }
        if (ok) g.revived = true; // (6.6.1) this dive's one revive
        g.paused = false; g.reviveAsked = false;
        if (ok) revive(kind); else die(cause, kind, true);
      });
      return; } }
  if (profile) profile.resume = null; // (4.12.6) a death ends the dive: the next one starts at the boat
  g.mode = 'dying'; g.deathT = 0; g.deathCause = cause; g.deathKind = kind;
  ui.closeAll();
  // what death costs: everything unsold, a hospital bill, and (if it took him) what he carried for it
  const lost = Object.entries(g.inv).filter(([k, n]) => n > 0 && GOODS[k]).map(([k, n]) => `${n} ${GOODS[k].name.toLowerCase()}`);
  const nSpec = g.bag.length + g.subTank.length;
  if (nSpec) lost.unshift(`${nSpec} live specimen${nSpec > 1 ? 's' : ''}`);
  /* (6.0.0) the sub is never lost: it comes back to the Margaret, docked, whole, its chambers empty */
  if (g.tags.length) lost.push(`data from ${g.tags.length} tag${g.tags.length > 1 ? 's' : ''}`);
  if (g.photos.length) lost.push(`${g.photos.length} photograph${g.photos.length > 1 ? 's' : ''}`);
  g.tags = []; g.photos = [];
  const inTraps = lostTraps(g);
  if (inTraps) lost.push(`${inTraps} animal${inTraps > 1 ? 's' : ''} in the traps`);
  g.bag = []; g.subTank = [];
  const taken = cause.startsWith('Taken');
  if (taken) { const n = g.items.necklace; if (n) lost.push(`${n} glow stick${n > 1 ? 's' : ''}`); g.items.necklace = 0; }
  const bill = kind === 'quit' ? 0 : Math.min(hospitalCap(profile), Math.round(profile.cash * HOSPITAL_SHARE * 100) / 100); // capped: late in the game 10 % would be ruinous
  g.inv = {};
  syncProfile();
  profile.subLost = false; profile.hull = 1; // (6.0.0) the sub is back in her cradle, hull mended
  profile.cash = Math.round((profile.cash - bill) * 100) / 100;
  profile.deaths = (profile.deaths || 0) + (kind === 'quit' ? 0 : 1);
  saveProfile(profile);
  g.deathBill = bill; g.deathLost = lost; profile.best = Math.max(loadBest(), profile.deepest || 0);
  ui.saveRun(Object.assign(runLog(cause), { bill }));
}

// the floor's dangers: vent water hot enough to scald, the airless brine pool
function zoneHazards(dt) {
  const e = g.earl, sub = g.sub, W = g.world;
  let scald = false, cook = false;
  for (const v of W.vents) {
    const top = v.y - v.h;
    const inPlume = (x, y, w) => y < v.y + 0.5 && y > top - 16 && Math.abs(x - v.x) < w + Math.max(0, top - y) * 0.12;
    if (!e.inSub && inPlume(e.x, e.y, 1.6)) scald = true;
    if (!sub.imploded && inPlume(sub.x, sub.y, 4)) cook = true;
  }
  g.ventT = Math.max(0, (g.ventT || 0) - dt);
  if (scald && g.ventT <= 0) { g.ventT = 2; hurt(1, { name: 'hydrothermal vent' }, 'heat'); }
  if (cook) {
    sub.hull = Math.max(0, sub.hull - dt * 0.015);
    g.cookT = (g.cookT || 0) - dt;
  }
  const B = W.brine;
  const inBrine = (x, y) => B && x > B.x0 && x < B.x1 && y > B.y - 0.2;
  // brine is far denser than seawater: the sub floats on it like a boat on a lake
  if (!sub.imploded && sub.x > B.x0 - 3 && sub.x < B.x1 + 3 && sub.y > B.y - 1.4) {
    sub.y = B.y - 1.4; sub.vy = Math.min(0, sub.vy);
    if (e.inSub) e.y = sub.y;
  }
  if (!e.inSub && inBrine(e.x, e.y)) {
    if (!g.brineT) hud.toast('Brine pool: get out!', 'warn'); // (3.0.0) back
    g.brineT = (g.brineT || 0) + dt;
    g.fx.redFlash = Math.max(g.fx.redFlash || 0, 0.3);
    if (g.brineT > 3) die(`Drowned in the brine pool at ${Math.round(e.y)} m`);
  } else g.brineT = 0;
}

function causeText(kind) {
  const d = Math.round(g.earl.y);
  switch (kind) {
    case 'entity': return `Taken by something in the deep, ${d} m`; // (7.0.0) said what took him, not just "taken"
    case 'o2': return g.imploded ? `The submersible imploded at ${Math.round(g.implodeDepth)} m` : d > (g.earl.pressStart || 300) ? `Ran out of air under pressure at ${d} m` : `Ran out of air at ${d} m`;
    case 'sub-o2': return `Ran out of air in the submersible at ${d} m`;
    default: return kind;
  }
}

// ---------------- (5.9.0) abilities ----------------
// (7.6.3, owner) the surface: aboard, in the cabin, or anywhere at 0 m in the water (or the sub there)
function atSurface() { const e = g && g.earl; if (!e) return false; return !!(g.aboard || (ui.cabinOpen && ui.cabinOpen()) || (e.inSub ? (g.sub.docked || g.sub.y <= 3.6) : e.y <= 0.8)); } // (7.6.26, owner) the sub at the top counts too (it floats a little under)
// (7.6.4, owner) the swap chip: the second scroll comes onto the button, with its own cooldown and run; the other keeps
// running beside it
function abilSwap() { const P = profile, K = kitOf(P); if (!K.on.ability2) { hud.toast('No second scroll: put one in its slot in the bag'); return; }
  [K.on.ability, K.on.ability2] = [K.on.ability2, K.on.ability || null]; [P.abilReadyAt, P.abilReadyAt2] = [P.abilReadyAt2 || 0, P.abilReadyAt || 0];
  const S1 = abilityState(g); g.abil = g.abil2 || { activeT: 0, maxT: 0, def: null, charges: null, fx: 0 }; g.abil2 = S1; g.dashAim = null; renderer.aimZoom = 1;
  saveProfile(P); audio.ready && audio.click && audio.click(); }
function secondAbility() { const q = profile && wornInst(profile, 'ability2'); const A = q ? abilityOf(q.id) : null; if (A) A.loaded = q.load || 0; return A; }
function currentAbility() { const q = profile && wornInst(profile, 'ability'); const A = q ? abilityOf(q.id) : null; if (A) { A.loaded = q.load || 0; A.inst = q; } return A; } // (7.6.3) with its loaded charges
// (7.6.26, owner) a use's cooldown: with a charge loaded on the worn scroll, the charge is spent and there is no cooldown
// at all (none shown); only with none left does the cooldown run
function coolAfter(P, secs) { const q = wornInst(P, 'ability'); if (q && q.load > 0) { q.load--; P.abilReadyAt = 0; } else P.abilReadyAt = Date.now() + secs * 1000; }
function useAbility() {
  const A = currentAbility(), why = whyNot(g, profile, A);
  // (7.4.9, owner) cooling down: the wait can be skipped with pearls (abilities.js skipCost)
  if (A && profile && cooldownLeft(profile) > 0 && !(A.loaded > 0) && !(abilityState(g).activeT > 0) && !(A.charges && abilityState(g).charges > 0)) { const left = cooldownLeft(profile), n = skipCost(left), P = profile; // aboard too: the skip is offered wherever he taps it
    ui.confirm(`${A.name}: ready in ${fmtLeft(left)}`, `Skip the wait: ${n} pearl${n > 1 ? 's' : ''} (you have ${Math.floor(P.pearls || 0)})`, `Skip, ${n} pearl${n > 1 ? 's' : ''}`, 'Wait', () => {
      if ((P.pearls || 0) < n) { hud.toast('Not enough pearls', 'warn'); return; }
      P.pearls -= n; P.abilReadyAt = Date.now(); saveProfile(P); audio.ready && audio.uiSoft && audio.uiSoft(); hud.toast(`${A.name} ready`); });
    return; }
  if (why) { hud.toast(why, 'note'); return; }
  // (7.6.3, owner) a loaded charge: fires at once, no wait and no question (running, it starts over)
  // (7.6.26, owner) the charge itself is spent where the cooldown would start (coolAfter): with charges, no cooldown at all
  const S0 = abilityState(g); if (A.loaded > 0 && (cooldownLeft(profile) > 0 || S0.activeT > 0) && !(A.charges && S0.charges > 0) && !g.dashAim) { profile.abilReadyAt = 0; S0.activeT = 0; S0.charges = 0; }
  // (5.16.0) Dash on a phone: pressed, it waits for a tap where to go (time slowed, the screen greyed, the view opened by
  // its tier); pressed again, or 3 s with no tap, and it is put away unspent
  if (A.dash) { if (g.dashAim) { g.dashAim = null; renderer.aimZoom = 1; } else { g.dashAim = { t: 3, A }; renderer.aimZoom = A.zoom || 1; } return; }
  if (A.siphon) { if (g.siphonAim) { g.siphonAim = null; renderer.aimZoom = 1; } else if (!g.siphon) { g.siphonAim = { t: 3, A }; renderer.aimZoom = 1.2; hud.toast('Tap a way to go', 'note'); } return; } // (7.6.8, owner) Siphon: aimed by a tap, as the dash
  if (A.cast) { if (g.castAim) g.castAim = null; else { g.castAim = { t: 4, A }; hud.toast('Tap where to throw', 'note'); } return; } // (7.6.6, owner) Cast: aimed by a tap, as the dash
  const S = abilityState(g), e = g.earl, P = profile;
  S.def = A; S.activeT = A.dur; S.maxT = A.dur; S.at = g.time;
  coolAfter(P, A.dur + A.cd); // (5.16.0) real time
  fireBurst(A); // (7.6.7, owner)
  if (A.airNow) { if (e.inSub) g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + g.sub.o2Max * A.airNow); else e.o2 = Math.min(e.o2Max, e.o2 + e.o2Max * A.airNow); g.breathFx = { t: 0, tier: A.tier }; } // (7.6.5, owner) Breath: air back at once
  saveProfile(P);
  if (A.tier === 'mythical') mythFire(A);
  audio.ready && audio.click && audio.click();
  if (A.dash) { const v = [e.facing || 1, 0], m = 1, tgt = e.inSub ? g.sub : e; tgt.vx = (tgt.vx || 0) + v[0] * 11; tgt.vy = (tgt.vy || 0) + v[1] * 9; /* (a keyboard: a lunge the way he faces) */
    for (let i = 0; i < 14; i++) g.bubbles.push({ x: tgt.x - v[0] / m * Math.random() * 1.5, y: tgt.y - v[1] / m * Math.random() * 1.5, r: 0.03 + Math.random() * 0.07, w: Math.random() * 6, t: 0 });
  }
  if (A.repair) { const sub = g.sub; sub.hull = 1; if (sub.patches) sub.patches.length = 0; g.fx.flash = 0.35; hud.toast(`${A.name}: the hull is whole`, 'big'); if (A.guard) g.subGuardT = A.dur; }
  // (7.6.6, owner) the second batch, as each fires
  if (A.snatch) { g.snatch = { left: A.snatch, def: A, bonus: A.snBonus || 0 }; hud.toast(`${A.name}: tap ${A.snatch} fish`, 'note'); }
  if (A.iron) { g.injury = 0; g.ironT = A.dur; g.ironFx = { t: 0 }; }
  if (A.calm) { if (g.entity) { g.entity.marked = false; g.entity.attn = 0; } g.calmT = A.dur; g.markWashFx = { t: 0 }; }
  if (A.call) callFish(A); // (7.6.7, owner) Lure, Lure+, Tidecall and Bloodmoon
  if (A.nacre) g.nacreT = A.dur;
  if (A.blood) bloodmoon(A);
  if (A.shoal) { g.shoalFx = { t: 0, lv: A.shoal, dur: A.dur, fish: A.fish || 49, guard: A.guard || 1, used: 0 }; } // (7.6.15) its strikes to take
  if (A.revel) g.revelFx = { t: 0, lv: A.revel, dur: A.dur };
  if (A.echo) { g.echoT = A.dur; g.echoLv = A.echo; g.echoAt = g.time; g.echoSweep = 0; const m0 = g.earl.inSub ? g.sub : g.earl, sh = [0.4, 0.6, 0.8, 1][Math.min(4, A.echo) - 1]; g.echoC = g.fauna.echoContacts(m0.x, m0.y, 1000 * sh, Math.round(4 + 10 * sh), [0.01, 0.015, 0.025, 0.035][Math.min(4, A.echo) - 1]); } // (7.6.30, owner) far contacts by the sea's own rules // (5.16.0) the screen-wide sweep (render.js), then the marks on the radar (hud.js)
  if (A.tide) { // (7.4.15) The Last Tide: any time. In red water as Tidewarden; marked, the mark washed off; else only its light and air
    const red = (g.fx && (g.fx.redTint || 0) > 0.03) || (g.entity && g.entity.dist < 160 && (g.entity.marked || g.entity.state === 'hunt' || g.entity.state === 'stalk'));
    if (red || !A.any) g.tideFx = { t: 0 };
    else if (g.entity && g.entity.marked) { g.entity.marked = false; g.markWashFx = { t: 0 }; hud.toast('The mark is washed off you', 'note'); }
  }
}
// (7.4.15, owner) every mythical, as it fires: 10 s of at least Flare+ light, at least Sprint+ speed and air coming back
// (+5 % a second up to +50 %, none lost meanwhile); a burst of embers off him. Whalesong: its deep call, and light
// washing over the screen
function mythFire(A) {
  g.mythT = MYTH.t; g.mythAir = 0; g.mythFx = { t: 0 };
  if (A.song) { g.songFx = { t: 0 }; audio.ready && audio.whalesong && audio.whalesong(); }
  else audio.ready && audio.mythic && audio.mythic();
}
// (5.16.0) a tap while Dash waits: there in a fraction of a second (stopped short of rock), and only now is it spent
// (7.6.6, owner) Cast: the net flies to the tap (within its range) and takes what its mouth holds there (the trawl's
// rule: up to 2 m); Snatch: a tapped fish caught by the net's own chance; the specials' helpers
function castTo(wx, wy) {
  const C = g.castAim; if (!C) return false; g.castAim = null; const A = C.A, e = g.earl, P = profile;
  const dx = wx - e.x, dy = wy - e.y, L = Math.hypot(dx, dy) || 1, k = Math.min(1, A.cast.range / L), x1 = e.x + dx * k, y1 = Math.max(0.5, e.y + dy * k);
  const S = abilityState(g); S.def = A; S.activeT = A.dur; S.maxT = A.dur; S.at = g.time; coolAfter(P, A.dur + A.cd); saveProfile(P);
  g.castNet = { x0: e.x, y0: e.y, x1, y1, t: 0, dur: 0.35 + L * 0.02, r: A.cast.r, tier: A.tier }; fireBurst(A); audio.ready && audio.click && audio.click(); return true;
}
function castLand(N) {
  const got = []; for (const c of g.fauna.list) { if (c.dead || c.pet || c.companion || (c.len || 0) > 2 || Math.hypot(c.x - N.x1, c.y - N.y1) > N.r + (c.len || 0) * 0.4) continue; if (bagUsed(g) >= bagSlots(g)) { say('The bag is full'); break; } got.push(c); skillCatch(c, N.x1, N.y1); } // (7.6.6) filled one by one: only the catch that tips the bag over goes in past it
  if (!got.length) say('Missed');
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; g.bubbles.push({ x: N.x1 + Math.cos(a) * N.r, y: N.y1 + Math.sin(a) * N.r, r: 0.03 + Math.random() * 0.06, w: Math.random() * 6, t: 0 }); }
}
function skillCatch(c, x, y) {
  const e = g.earl, spec = { id: c.sp.id, len: c.len, cond: 1, from: Math.round(Math.max(e.y, c.y)), t: g.time };
  if (g.blessCatch) spec.blessed = true; if (g.curseCatch) spec.cursed = true;
  c.dead = true; g.bag.push(spec); g.captureFx.push({ sp: c.sp, len: c.len, x: c.x, y: c.y, dir: c.dir || 1, t: 0, dur: 0.3, kind: 'net' });
  (g.skillCaught || (g.skillCaught = [])).push({ type: 'caught', sp: c.sp, spec, name: c.sp.name, x: c.x, y: c.y });
}
function snatchAt(wx, wy) {
  const N = g.snatch; if (!N || N.left <= 0 || !(abilityState(g).activeT > 0 || (g.abil2 && g.abil2.activeT > 0))) return false;
  let best = null, bd = 2.2; for (const c of g.fauna.list) { if (c.dead || c.pet || c.companion) continue; const d = Math.hypot(c.x - wx, c.y - wy) - (c.len || 0) * 0.5; if (d < bd) { bd = d; best = c; } }
  if (!best) return false; N.left--; const net = gear(profile, 'net') || {}, maxLen = net.maxLen || 0.6;
  g.snatchFx = { x0: g.earl.x, y0: g.earl.y, x1: best.x, y1: best.y, t: 0, tier: N.def.tier }; for (let i = 0; i < 8; i++) g.bubbles.push({ x: best.x + (Math.random() - 0.5) * 0.4, y: best.y + (Math.random() - 0.5) * 0.4, r: 0.02 + Math.random() * 0.06, w: Math.random() * 6, t: -0.2 - Math.random() * 0.1 }); // (7.6.8) the bite: a puff of bubbles where the hook takes it
  if (best.len > maxLen * 1.1) say('Too big for the net');
  else if (bagUsed(g) >= bagSlots(g)) say('The bag is full');
  else if (Math.random() < Math.min(0.97, 0.62 + N.bonus)) skillCatch(best, best.x, best.y); else { say('Missed'); best.flee = 1; }
  if (N.left <= 0) g.snatch = null; return true;
}
// (7.6.7, owner) the fish come in from just past the screen's edges on every side, rush to him and mill round him while
// the call lasts and a little after; then they go their own way as any fish. Hunters notice the commotion
function callFish(A) {
  const e = g.earl, m = e.inSub ? g.sub : e, cm = renderer.cam; if (!cm) return;
  const fish = g.fauna.callSchool({ x: cm.x, y: cm.y, w: cm.w || 30, h: cm.h || 16 }, m.x, m.y, A.call.n, A.call.exo, A.call.leg || 0, Math.random, (sp) => !!AGGRO[sp.id]); // (no hunter answers a call)
  if (!fish.length) { say('Nothing lives here to call'); return; }
  g.callFx = { fish, homes: fish.homes || [fish[0].home], t: 0, dur: A.dur + 6 };
  if (g.entity && !A.blood) g.entity.attn = Math.min(1, (g.entity.attn || 0) + 0.2);
}
function bloodmoon(A) { // the water to blood; the thing just past the radar's reach, marking him, hunting him
  const e = g.earl, ent = g.entity; g.bloodT = A.dur; g.echoT = A.dur; g.echoLv = 2; // (7.6.7) the radar's marks only, no sweep drawn across the water
  if (ent) { const a = Math.random() * TAU; ent.x = e.x + Math.cos(a) * 220; ent.y = Math.max(40, e.y + Math.sin(a) * 60); ent.marked = true; if (ent.state !== 'hunt') ent.state = 'search'; ent.attn = 1; }
  hud.toast("It's here. Catch what you can.", 'warn'); audio.ready && audio.scare && audio.scare();
}
// (7.6.7, owner) every skill opens with a burst: a lens of light rolling out from him, bending the water as it passes, by
// tier (rare a few metres, exotic with a second wave, legendary across the screen, mythical pulled in first and then the
// brightest light in the game, rippling across the radar). A Heart also throws the thing 200 m further off when it is on
// the radar but not closer than 100 m (red water or not); the mark stays. Never Bloodmoon, which calls it
const BURST = { rare: { reach: 5, dur: 1.0, mag: 0.08 }, exotic: { reach: 11, dur: 1.4, mag: 0.11, second: true }, legendary: { reach: 0, dur: 2.0, mag: 0.14, second: true }, mythical: { reach: 0, dur: 2.6, mag: 0.19, second: true, pull: 0.3 } }; // (7.6.15, owner) longer and stronger
function fireBurst(A) {
  const e = g.earl, m = e.inSub ? g.sub : e, B = BURST[A.tier] || BURST.rare;
  (g.bursts || (g.bursts = [])).push({ t: 0, x: m.x, y: m.y, tier: A.tier, fam: A.fam || '', ...B });
  if (g.bursts.length > 3) g.bursts.shift();
  if (A.tier === 'mythical') { g.radarRipple = { t: 0 };
    const ent = g.entity; if (ent && !A.blood && !g.kill && !ent.frozen && !(ent.sleepT > 0) && ent.dist >= 100 && ent.dist <= 200) {
      const dx = ent.x - m.x, dy = ent.y - m.y, d = Math.hypot(dx, dy) || 1, k = (d + 200) / d;
      ent.x = m.x + dx * k; ent.y = clamp(m.y + dy * k * 0.5, 40, g.world.floorAt(ent.x) - 10); ent.vx = 0; ent.vy = 0; ent.dist = d + 200;
      if (ent.state === 'hunt' || ent.state === 'charge') ent.state = 'search'; g.pushFx = { t: 0, x: ent.x, y: ent.y }; } }
}
// (7.6.8, owner) Siphon: the way tapped, its full length (stopped short of rock or the seabed); he greys and fades,
// the squid of the tier fades in, jets mantle first with ink spilling behind and the water ahead lit, then fades back
// into him at the far end. Nothing bites him meanwhile, and a hunter on his trail breaks off, lost in the ink
const SIPH = { fo: 0.24, fi: 0.32 };
function siphonTo(wx, wy) {
  const D = g.siphonAim; if (!D) return false;
  const A = D.A, e = g.earl, M = e.inSub ? g.sub : e, P = profile, dist = A.siphon.dist, r = e.inSub ? 2.2 : 0.6;
  let dx = wx - M.x, dy = wy - M.y; const L0 = Math.hypot(dx, dy) || 1; dx /= L0; dy /= L0;
  let L = dist; for (let d = 0.5; d <= dist; d += 0.5) { const px = M.x + dx * d, py = M.y + dy * d; if (py < (e.inSub ? 3 : 0.6) || g.world.rockAt(px, py, r) || py > g.world.floorAt(px) - r) { L = Math.max(0, d - 1); break; } }
  g.siphonAim = null; renderer.aimZoom = 1.12;
  const S = abilityState(g); S.def = A; S.activeT = SIPH.fo + A.dur + SIPH.fi; S.maxT = S.activeT; S.at = g.time; coolAfter(P, S.activeT + A.cd); saveProfile(P);
  g.siphon = { x0: M.x, y0: M.y, x1: M.x + dx * L, y1: M.y + dy * L, dx, dy, t: 0, A, sub: !!e.inSub, puffT: 0 };
  e.facing = dx >= 0 ? 1 : -1; if (e.inSub) g.sub.facing = e.facing;
  for (const c of g.fauna.list) if (c.att && c.att.s !== 'idle' && c.att.s !== 'leave') { c.att.s = 'leave'; c.att.t = 0; c.att.cool = 30; }
  fireBurst(A); audio.ready && audio.click && audio.click(); return true;
}
function dashTo(wx, wy) {
  const D = g.dashAim; if (!D) return false;
  const A = D.A, e = g.earl, M = e.inSub ? g.sub : e, P = profile;
  let x1 = wx, y1 = Math.max(e.inSub ? 3 : 0.5, wy); const dx = x1 - M.x, dy = y1 - M.y, L = Math.hypot(dx, dy) || 1, r = e.inSub ? 2.2 : 0.5;
  for (let d = 0.4; d <= L; d += 0.4) { const px = M.x + dx / L * d, py = M.y + dy / L * d; if (g.world.rockAt(px, py, r) || py > g.world.floorAt(px) - r) { x1 = M.x + dx / L * Math.max(0, d - 0.8); y1 = M.y + dy / L * Math.max(0, d - 0.8); break; } }
  g.dashAim = null; renderer.aimZoom = 1;
  const S = abilityState(g); S.def = A; S.activeT = A.dur; S.maxT = A.dur; S.at = g.time;
  if (A.charges) { // (7.4.15) Rift: the first dash leaves more. (7.5.6, owner) every dash has charges: each dash leaves the rest for 20 s; the rest starts after the last
    S.chargeMax = A.charges;
    if (S.charges > 0) { S.charges--; S.chargeT = 20; if (S.charges <= 0) { S.charges = 0; S.chargeT = 0; coolAfter(P, A.dur + A.cd); } }
    else { S.charges = A.charges - 1; S.chargeT = 20; P.abilReadyAt = 0; if (A.tier === 'mythical') mythFire(A); fireBurst(A); }
  } else { coolAfter(P, A.dur + A.cd); fireBurst(A); }
  saveProfile(P);
  g.dashMove = { x0: M.x, y0: M.y, x1, y1, t: 0, dur: A.dur, tier: A.dash };
  g.dashFx = { x0: M.x, y0: M.y, x1, y1, t: 0, tier: A.dash };
  e.facing = Math.sign(x1 - M.x) || e.facing; if (e.inSub) g.sub.facing = e.facing;
  for (let i = 0; i < 18 + A.dash * 14; i++) { const k = Math.random(); g.bubbles.push({ x: M.x + (x1 - M.x) * k + (Math.random() - 0.5) * 1.2, y: M.y + (y1 - M.y) * k + (Math.random() - 0.5) * 1.2, r: 0.02 + Math.pow(Math.random(), 2) * 0.14, w: Math.random() * 6, t: -Math.random() * 0.3 }); } // (7.6.8) a cavitation trail: many bubbles, mostly small, a few large
  audio.ready && audio.click && audio.click(); return true;
}
function tickAbility(dt) {
  // (5.16.0) Dash waiting for its tap (counted in real time: the world is slowed meanwhile), and the dash under way
  if (g.dashAim) { g.dashAim.t -= dt / 0.2; if (g.dashAim.t <= 0) { g.dashAim = null; renderer.aimZoom = 1; hud.toast('Dash put away', 'note'); } }
  if (g.siphonAim) { g.siphonAim.t -= dt / 0.2; if (g.siphonAim.t <= 0) { g.siphonAim = null; renderer.aimZoom = 1; } } // (7.6.8)
  if (g.siphon) { const Q = g.siphon, M = Q.sub ? g.sub : g.earl, J = Q.A.dur; Q.t += dt; const tj = Q.t - SIPH.fo, k = clamp(tj / J, 0, 1), E0 = 0.12, q = k < E0 ? (k * k / E0) / (2 - 2 * E0) : k > 1 - E0 ? 1 - ((1 - k) * (1 - k) / E0) / (2 - 2 * E0) : (k - E0 / 2) / (1 - E0); // (7.6.13) a brief kick, a steady 80 m/s, a brief stop
    M.x = Q.x0 + (Q.x1 - Q.x0) * q; M.y = Q.y0 + (Q.y1 - Q.y0) * q; M.vx = 0; M.vy = 0; if (Q.sub) { g.earl.x = M.x; g.earl.y = M.y; }
    if (tj > 0 && tj < J) { const gone = Math.hypot(M.x - (Q.px ?? Q.x0), M.y - (Q.py ?? Q.y0)); if (gone >= Math.max(1.3, Q.A.siphon.dist / 40)) { Q.px = M.x; Q.py = M.y; /* (no more than about 40 puffs a jet) */ /* (7.6.11) let out by distance along the whole path, not by time (it bunched where the jet eased in and out) */ (g.inkPuffs || (g.inkPuffs = [])).push({ x: M.x - Q.dx * (Q.sub ? 2.5 : 1) + (Math.random() - 0.5) * 0.6, y: M.y - Q.dy * (Q.sub ? 2.5 : 1) + (Math.random() - 0.5) * 0.6, t: 0, r: (Q.sub ? 1.1 : 0.6) * (0.7 + Math.random() * 0.6) * (1 + (Q.A.tier === 'legendary' ? 0.5 : Q.A.tier === 'exotic' ? 0.25 : 0)), s: Math.random() * 100, d: Math.atan2(Q.dy, Q.dx) }); }
      for (let i = 0; i < 2; i++) g.bubbles.push({ x: M.x - Q.dx * 1.2 + (Math.random() - 0.5), y: M.y - Q.dy * 1.2 + (Math.random() - 0.5), r: 0.03 + Math.random() * 0.08, w: Math.random() * 6, t: 0 }); }
    if (Q.t > SIPH.fo + J + SIPH.fi) { g.siphon = null; renderer.aimZoom = 1; } }
  if (g.inkPuffs) { for (const p of g.inkPuffs) p.t += dt; g.inkPuffs = g.inkPuffs.filter((p) => p.t < 7); if (!g.inkPuffs.length) g.inkPuffs = null; }
  if (g.dashMove) { const D = g.dashMove, M = g.earl.inSub ? g.sub : g.earl; D.t += dt; const k = Math.min(1, D.t / D.dur), q = 1 - Math.pow(1 - k, 3);
    M.x = D.x0 + (D.x1 - D.x0) * q; M.y = D.y0 + (D.y1 - D.y0) * q; M.vx = (D.x1 - D.x0) / D.dur * 0.15; M.vy = (D.y1 - D.y0) / D.dur * 0.15;
    if (g.earl.inSub) { g.earl.x = M.x; g.earl.y = M.y; } if (k >= 1) g.dashMove = null; }
  if (g.dashFx) { g.dashFx.t += dt; if (g.dashFx.t > 1.2) g.dashFx = null; }
  const S = abilityState(g), e = g.earl, A = S.def;
  if (S.activeT > 0) S.activeT = Math.max(0, S.activeT - dt);
  const on = S.activeT > 0 && A;
  // (7.6.4, owner) the second scroll keeps running while the other is on the button: both tick, and each kind of effect
  // takes the stronger of the two (never the two together)
  const S2 = g.abil2 || null, A2 = S2 && S2.def; if (S2 && S2.activeT > 0) S2.activeT = Math.max(0, S2.activeT - dt);
  const on2 = !!(S2 && S2.activeT > 0 && A2);
  e.abilSpeed = Math.max(on && A.speed ? A.speed : 1, on2 && A2.speed ? A2.speed : 1); e.abilNoAir = !!((on && A.noAir) || (on2 && A2.noAir));
  // (7.4.15) Rift's second dash waits 20 s at most; then the rest begins
  if (S.charges > 0) { S.chargeT -= dt; if (S.chargeT <= 0) { S.charges = 0; const R0 = currentAbility(); if (R0 && R0.charges) { coolAfter(profile, R0.cd); saveProfile(profile); } } }
  // (7.4.15) a mythical's 10 s: light, speed and air (in the sub, the cabin's air)
  // (7.4.19) Dauntless: the suit and the hull rated deeper while it runs; the field's strength is how much of the extra
  // depth he is using (0 at the old rating, 1 at the new)
  { const PA = on && A.press ? A : on2 && A2.press ? A2 : null, PS = PA === A ? S : S2; const pm = PA ? PA.press : 1, pb = PA && PA.beyond ? PA.beyond : 0; e.pressMul = pm; e.pressBeyond = pb; g.sub.pressMul = 1; g.sub.pressBeyond = 0; // (7.4.22) the diver's suit only
    if (pm > 1) { const base = e.pressBase || 300, d = e.y; g.pressK = clamp((d - base) / (base * (pm - 1)), 0, 1); }
    if (pm > 1 && !g.pressFx && !PA.heat) { g.pressFx = { t: 0, end: 0, tier: PA.tier, def: PA }; if (audio.ready) { audio.thud && audio.thud(0.6); audio.creak && audio.creak(0.5); } } // it opens: a deep thud, the hull's creak
    if (g.pressFx) { const F = g.pressFx; F.t += dt; if (pm > 1 && !PA.heat) { F.tier = PA.tier; F.def = PA; F.left = PS.activeT; } else { if (!F.end && audio.ready && audio.groan) audio.groan(0.3); F.end += dt; if (F.end > 1.2) g.pressFx = null; } } } // it is crushed back: the pressure's groan
  // (7.6.0, owner) Dauntless gives air back early in its run (2/3/5/10 % a second for 10/15/20/30 s); beside a mythical's
  // +50 % the stronger rate wins, never the two together
  const rate1 = (D, SS, o) => { if (!o) return 0; const el = D.dur - SS.activeT; if (D.airSteps) { for (const [r, until] of D.airSteps) if (el < until) return r; return 0; } return D.airBack && !e.inSub && el < D.airBack[1] ? D.airBack[0] : 0; }, dRate = Math.max(rate1(A, S, on), on2 ? rate1(A2, S2, on2) : 0);
  if (dRate > 0 && !(g.mythT > 0 && MYTH.air >= dRate)) { if (e.inSub) g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + g.sub.o2Max * dRate * dt); else e.o2 = Math.min(e.o2Max, e.o2 + e.o2Max * dRate * dt); }
  g.breathGlow = (on && A.airSteps) || (on2 && A2.airSteps) ? 1 : Math.max(0, (g.breathGlow || 0) - dt); // (7.6.5) the air bar lit while Breath runs
  if (g.breathFx) { g.breathFx.t += dt; if (g.breathFx.t > 1.4) g.breathFx = null; }
  // (7.6.5, owner) Plunge: the anchor's pull (player.js), the strongest running; Lookout: the view drawn out
  e.abilSink = Math.max(on && A.sink ? A.sink : 0, on2 && A2.sink ? A2.sink : 0); g.sinkDef = on && A.sink ? A : on2 && A2.sink ? A2 : null; if (g.sinkDef) { g.sinkK = 1; g.sinkLast = g.sinkDef; } else g.sinkK = Math.max(0, (g.sinkK || 0) - dt / 0.8); /* (7.6.29) the anchor's look fades as it lets go */
  g.repelR = Math.max(on && A.repel ? A.repel : 0, on2 && A2.repel ? A2.repel : 0); // (7.6.7, owner) Revel: hunters that bite keep this far off
  { const TA = on && A.heat ? A : on2 && A2.heat ? A2 : null; g.temper = TA && !e.inSub ? { tier: TA.tier, k: Math.min(1, (g.temper ? g.temper.k : 0) + dt * 1.5) } : g.temper && g.temper.k > 0 ? { tier: g.temper.tier, k: Math.max(0, g.temper.k - dt * 0.7) } : null; } // (7.6.7, owner) Temper: heat on the suit
  { const z = Math.max(on && A.zoom ? A.zoom : 1, on2 && A2.zoom ? A2.zoom : 1); g.lookZoom = lerp(g.lookZoom || 1, z, Math.min(1, dt * 1.6)); g.eagle = (on && A.eagle) || (on2 && A2.eagle) ? Math.min(1, (g.eagle || 0) + dt * 1.2) : Math.max(0, (g.eagle || 0) - dt * 0.8); }
  if (g.mythT > 0) { g.mythT = Math.max(0, g.mythT - dt); e.abilSpeed = Math.max(e.abilSpeed, MYTH.speed); e.abilNoAir = true;
    const full = e.inSub ? (g.sub.o2Max || 0) : (e.o2Max || 0), add = dRate > MYTH.air ? 0 : Math.min(full * MYTH.air * dt, full * 0.5 - (g.mythAir || 0));
    if (add > 0) { g.mythAir = (g.mythAir || 0) + add; if (e.inSub) g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + add); else e.o2 = Math.min(e.o2Max, e.o2 + add); } }
  if (g.mythFx) { g.mythFx.t += dt; if (g.mythFx.t > 1.6) g.mythFx = null; }
  depthPearls(); // (7.6.2, owner)
  // (7.6.6, owner) the second batch's running parts
  if (g.castNet) { const N = g.castNet; N.t += dt; if (N.t >= N.dur && !N.landed) { N.landed = true; castLand(N); } if (N.t > N.dur + 0.8) g.castNet = null; }
  if (g.castAim) { g.castAim.t -= dt; if (g.castAim.t <= 0) g.castAim = null; }
  if (g.bursts) { for (const b of g.bursts) b.t += dt; g.bursts = g.bursts.filter((b) => b.t < (b.pull || 0) + b.dur + 0.2); } // (7.6.7)
  if (g.radarRipple) { g.radarRipple.t += dt; if (g.radarRipple.t > 3) g.radarRipple = null; } /* (7.6.26) longer */
  if (g.callFx) { const C = g.callFx, m = g.earl.inSub ? g.sub : g.earl; C.t += dt; for (const h of C.homes) { h.x = m.x + (h.ox || 0); h.y = m.y + (h.oy || 0); } // (7.6.7) the called fish home on him while the call lasts; (7.6.13) each school at its own place round him
    for (const c of C.fish) if (!c.dead && c.called && c.home && Math.hypot(c.x - c.home.x, c.y - c.home.y) < 4) { c.speed = c.cruise; c.called = false; }
    if (C.t > C.dur) { for (const c of C.fish) if (C.homes.includes(c.home)) { c.home = null; c.speed = c.cruise; c.called = false; } g.callFx = null; } }
  if (g.snatch && !(abilityState(g).activeT > 0 || (g.abil2 && g.abil2.activeT > 0))) g.snatch = null;
  if (g.snatchFx) { g.snatchFx.t += dt; if (g.snatchFx.t > 0.56) g.snatchFx = null; }
  if (g.ironT > 0) g.ironT = Math.max(0, g.ironT - dt);
  if (g.ironFx) { g.ironFx.t += dt; if (g.ironFx.t > 1.2) g.ironFx = null; }
  if (g.calmT > 0) { g.calmT = Math.max(0, g.calmT - dt); if (g.entity && g.entity.state !== 'hunt') { g.entity.marked = false; g.entity.attn = 0; } }
  if (g.nacreT > 0) g.nacreT = Math.max(0, g.nacreT - dt);
  if (g.pearlFx) { for (const p of g.pearlFx) p.t += dt; g.pearlFx = g.pearlFx.filter((p) => p.t < 1.8); if (!g.pearlFx.length) g.pearlFx = null; }
  if (g.bloodT > 0) { g.bloodT = Math.max(0, g.bloodT - dt); g.fx.redTint = Math.max(g.fx.redTint || 0, 0.85 * Math.min(1, g.bloodT / 2, (60 - g.bloodT) / 1.5 + 0.2)); } g.curseCatch = g.bloodT > 0;
  for (const k of ['shoalFx', 'revelFx']) { const F = g[k]; if (F) { F.t += dt; if (F.t > F.dur + 1.5) g[k] = null; } }
  if (g.songFx) { g.songFx.t += dt; if (g.songFx.t > 4) g.songFx = null; }
  if (g.markWashFx) { g.markWashFx.t += dt; if (g.markWashFx.t > 2) g.markWashFx = null; }
  { const RA = on && A.reach ? A : on2 && A2.reach ? A2 : null; g.multiCatch = RA && RA.multi ? RA.multi : 1; g.reachMul = RA ? RA.reach : 1; g.swingMul = RA && RA.swing ? RA.swing : 1; g.sureCatch = !!(RA && RA.sure); g.blessCatch = !!(RA && RA.bless); g.reachDef = RA; }
  { const L0 = Math.max(on && A.light ? A.light : 0, on2 && A2.light ? A2.light : 0, g.mythT > 0 ? MYTH.light : 0, g.siphon ? g.siphon.A.siphon.light : 0);
    // (7.6.29, owner) nothing snaps off: when a skill's light ends (or drops a level) it keeps its last strength and fades
    // to the new one over a second and a half (g.abilOutK, multiplied into every light the skills draw)
    if (L0 >= (g.abilLightHold || 0)) { g.abilLightHold = L0; g.abilOutK = 1; g.abilLight = L0; }
    else { g.abilOutK = Math.max(0, (g.abilOutK ?? 1) - dt / 1.5); g.abilLight = g.abilLightHold; if (g.abilOutK <= 0) { g.abilLightHold = L0; g.abilLight = L0; g.abilOutK = 1; } } }
  { const lh = !!(((on && A.light >= 2) || (on2 && A2.light >= 2)) && (g.lightFade ?? 1) > 0.5); if (document.documentElement.classList.contains('lighthouse') !== lh) document.documentElement.classList.toggle('lighthouse', lh); } /* (5.16.0) Lighthouse: the HUD comes to life */
  g.netRange = gear(profile, 'net').range || 1.2; g.wardOn = !!((on && A.ward && !A.tide) || (on2 && A2.ward && !A2.tide)); // (7.3.0) these two had slipped into the comment above: the Lighthouse never kept hunters off
  { g.chargeTick = (g.chargeTick || 0) - (g.realDt || dt); if (g.chargeTick <= 0 && profile) { g.chargeTick = 1; if (growCharges(kitOf(profile).items)) { saveProfile(profile); ui.inventoryOpen && ui.inventoryOpen() && ui.renderInventory(); } } } // (7.6.30, owner) charges grow by themselves
  if (g.echoT > 0) g.echoT = Math.max(0, g.echoT - dt);
  // (7.6.30) a far contact becomes the real animal once he comes near it (just past the view), swimming where it was found
  if (g.echoC && g.echoC.length) { const cm = renderer.cam; for (const C of g.echoC) { if (C.fish || !cm) continue; if (Math.abs(C.x - cm.x) < cm.w * 0.9 && Math.abs(C.y - cm.y) < cm.h * 1.2) { const f = g.fauna.makeFish(C.sp, C.x, C.y, Math.random() < 0.5 ? -1 : 1, g.fauna.groupId++, true); if (f) { f.devKeep = false; g.fauna.list.push(f); C.fish = f; } } }
    for (const C of g.echoC) if (C.fish && !C.fish.dead && !g.fauna.list.includes(C.fish)) { C.x = C.fish.x; C.y = C.fish.y; C.fish = null; } // left behind: a contact again
    g.echoC = g.echoC.filter((C) => !(C.fish && C.fish.dead)); if (!(g.echoT > 0)) g.echoC = null; }
  if (g.echoSweep != null) { g.echoSweep += dt; if (g.echoSweep > 3) g.echoSweep = null; } // (5.16.0) Echo's sweep over the whole screen, 3 s
  if (g.subGuardT > 0) g.subGuardT = Math.max(0, g.subGuardT - dt);
  // Tidewarden: the red washes to blue, the thing's light turns blue, it freezes, fades, and is gone for 5 minutes
  if (g.tideFx) { const T = g.tideFx, ent = g.entity; T.t += dt;
    if (ent) { ent.frozen = T.t < 3.2; ent.fade = Math.max(0, 1 - Math.max(0, T.t - 1.6) / 1.4); ent.tideBlue = Math.min(1, T.t / 1.2); }
    if (T.t >= 3.2 && !T.sent && ent) { T.sent = true; ent.sleepT = 300; ent.marked = false; ent.x = clamp(e.x + (e.x > 2500 ? -2600 : 2600), 80, 4920); ent.y = 2600; }
    if (T.t >= 4.2) { if (ent) { ent.frozen = false; ent.tideBlue = 0; } g.tideFx = null; } }
}

// ---------------- update ----------------
// (6.8.0) two quiet signs that the sea is bigger than the diver, never during the tutorial and only from a diver's third
// dive on: the radar ghost (once a dive at most, below 100 m: a large contact at the radar's edge for half a second as the
// sweep passes it, then nothing there) and the far-off sound (below 60 m, now and then: one long low note from no
// direction in particular). Neither does anything; the thing itself is not involved.
function omens(dt) {
  const P = profile, e = g.earl; if (!P || P.tut === 'on' || (P.runs || 0) < 3 || g.mode !== 'play' || g.kill) return;
  const d = e.inSub ? g.sub.y : e.y, ent = g.entity, near = ent && ent.dist < 260;
  if (!g.ghostDone && d > 100 && !near && !g.radarGhost) {
    g.ghostIn = (g.ghostIn ?? (60 + Math.random() * 240)) - dt; // somewhere between one and five minutes below 100 m
    if (g.ghostIn <= 0) { if (Math.random() < 0.5) g.radarGhost = { a: Math.random() * Math.PI * 2 }; g.ghostDone = true; } // and only every other dive
  }
  if (d > 60 && !near) {
    g.farIn = (g.farIn ?? (40 + Math.random() * 100)) - dt;
    if (g.farIn <= 0) { g.farIn = 150 + Math.random() * 250; audio.ready && audio.farCall && audio.farCall(Math.min(1, 0.55 + d / 2000)); }
  }
}
function update(dt) {
  g.time += dt;
  g.day = dayCycle(g.time);
  const e = g.earl, ent = g.entity, W = g.world;

  if (g.mode === 'menu') {
    g.dayEff = g.day.light; g.fx.dread = 0;
    // (5.7.0) the title is a slow dive: the clock for the camera's drift down, and for how long nothing has been touched
    if (g.menuT0 == null) { g.menuT0 = g.time; g.menuIdle0 = g.time; }
    e.x = BOAT.x - 12; e.y = 8;
    g.fauna.surfY = g.surfY;
  g.fauna.update(dt, renderer.cam, { x: -999, y: -999, speedNow: 0 }, null, 0, g.time);
    updateBubbles(dt);
    return;
  }
  if (g.paused) return;
  // (5.8.1) the tutorial's spotlight holds the game still until its button is pressed; the press lets it run on
  g.tutGrace = Math.max(0, (g.tutGrace || 0) - dt);
  if (g.tutFreeze && !(g.tutGrace > 0) && g.mode === 'play') { updateBubbles(dt); return; }

  if (g.mode === 'play') {
    g.survival += dt;
    if (g.kill) killUpdate(dt);
    // input
    const mv = readMove();
    if (keys.has('f')) {
      fHeld += dt;
      if (e.inSub && fHeld > 0.6 && fHeld - dt <= 0.6) interact(null, true);
    }
    const target = findTarget(); g.anyTarget = !!target || !!g.obsTarget || patchNear() >= 0; // (7.4.4) anything in reach: the pet's Stay never takes the button from it
    // (5.5) the observe button (touch): the nearest animal in reach not yet in the journal, and its press
    g.obsTarget = observeTarget();
    // (5.5.3) the sprint button: a tap locks sprinting on (it costs air faster, as ever), another tap or letting go of the
    // stick for a moment ends it; never in the sub or on deck
    // (5.7.1) the sub's leave button: always works (the tutorial's own leave step, if it is the one asked)
    // (5.9.0) the ability: fired from the arc's button (key 'ability'), run each frame
    if (pressed.has('ability')) { pressed.delete('ability'); useAbility(); }
    if (pressed.has('abswap')) { pressed.delete('abswap'); abilSwap(); } // (7.6.4)
    tickAbility(dt);
    if (pressed.has('petstay')) { pressed.delete('petstay'); if (g.anyTarget) { /* (7.4.4) something else claimed the button this frame: that, not the pet */ pressed.add(g.obsTarget && !target ? 'obs' : 'f-tap'); } else { const r = toggleStay(g); if (r) { audio.ready && audio.uiSoft && audio.uiSoft(); say(r === 'stay' ? 'Stay' : 'Follow', 'pet'); saveProfile(profile); } } } // (7.3.9) the pet's Stay / Follow, on the action arc
    if (pressed.has('leavesub')) { pressed.delete('leavesub'); if (e.inSub) { if (!(g.tutAction && g.tutAction.id === 'leavesub' && runTutAction('leavesub'))) leaveSub(); } }
    // (5.7.5) the arc's own jobs aboard: Dive in (over the nearer rail) and Out on deck (from the cabin)
    if (pressed.has('divein')) { pressed.delete('divein'); if (g.aboard && !ui.cabinOpen() && !g.helm) { const A = g.aboard, mid = (DECK_MIN + DECK_MAX) / 2; leaveDeck(A.x >= mid ? 1 : -1); } }
    if (pressed.has('outdeck')) { pressed.delete('outdeck'); if (ui.cabinOpen()) ui.toggleCabin(false); }
    if (pressed.has('sprinton')) { pressed.delete('sprinton'); if (!g.sprintLock) pressed.add('sprint'); } // (5.7.0) a thumb slid onto the sprint button
    if (pressed.has('sprint')) { pressed.delete('sprint'); g.sprintLock = !g.sprintLock; g.sprintIdle = 0; if (g.sprintLock && !profile.tipSprintBtn) { profile.tipSprintBtn = true; saveProfile(profile); hud.toast('Sprinting: your air goes faster', 'note'); } }
    if (g.sprintLock) { if (e.inSub) g.sprintLock = false; else { g.sprintIdle = touch && touch.vec.on ? 0 : (g.sprintIdle || 0) + dt; if (g.sprintIdle > 1.2) g.sprintLock = false; } }
    if (touch) touch.lock = !!g.sprintLock;
    // (5.6) the swap chip on the big button: the next tool owned into the hand (as its key would)
    if (pressed.has('swap')) { pressed.delete('swap'); const owned = ['net'].concat(owns(profile, 'camera') ? ['cam'] : []); /* (5.9.6) net and camera only: traps are used from the bag */ const cur = g.toolSel === 'none' || g.toolSel === 'trap' ? 'net' : g.toolSel; const nx = owned[(owned.indexOf(cur) + 1) % owned.length]; pressed.add({ net: '1', cam: '2', trap: '3' }[nx]); }
    if (pressed.has('obs')) { pressed.delete('obs'); const ot = g.obsTarget || observeTarget(); if (ot) interact(ot, false); }
    g.prompt = promptFor(target);
    // (5.6.4) where the thing F acts on is, so its button can sit beside it (not over Earl)
    g.fAnchor = target ? (target.kind === 'board' ? { x: g.sub.x, y: g.sub.y } : target.kind === 'pickup' ? { x: target.p.x, y: target.p.y } : target.kind === 'trap' ? { x: target.t.x, y: target.t.y - 0.5 } : null) : null;
    const atAngler = nearAngler(), atDave = !atAngler && nearDave(), atStation = !atAngler && !atDave && nearStation();
    g.atLure = !atDave && !atStation && nearLure(e.x, e.y, e.inSub ? 6 : undefined); // (6.1.8) her lure: the way into what she has
    g.subHandF = !!(e.inSub && (atDave || atStation || g.atLure || overTable(e.x, e.y))); // (5.7.1) the hand in the sub: the stores, Dave, the old one's table
    if (atStation) {
      g.prompt = 'F  Station stores' + (e.inSub ? '   ·   hold F  Leave sub' : '');
      if (!profile.stationFound) { profile.stationFound = true; saveProfile(profile); hud.toast('A research station, lit up on the summit', 'big'); hud.hint("The station's stores sell to visiting divers. The Margaret's yard now has more for the sub"); }
    }
    if (atDave) g.prompt = "F  Dave's Haul" + (e.inSub ? '   ·   hold F  Leave sub' : '');
    // (3.0.0) the old one trades no more: her things lie on the table below her
    g.oldHover = g.atLure ? null : overTable(e.x, e.y); // (6.1.8) at her lure, the lure
    if (g.oldHover) {
      const st = oldStock(profile), H = g.oldHover;
      if (H.kind === 'item') { const it = st.items[H.i]; g.prompt = it ? `F  Look at the ${ITEMS[it.id].name}` : ''; }
      else g.prompt = `F  Look at the ${CHESTS[H.key].name}`;
      if (e.inSub) g.prompt += '   ·   hold F  Leave sub';
    }
    if (g.atLure && !g.oldHover) g.prompt = 'F  The Old One' + (e.inSub ? '   ·   hold F  Leave sub' : '');
    if (atAngler && !g.caveMet) g.caveMet = true;
    // in the submersible the prompt stays out of the way: hidden while moving, and gone after
    // 5 s of the same text (it comes back when something new is in reach or the sub stops again)
    // (only the sub's own reminder, F to leave / T for the tank room, hides like that: something in
    // reach, to collect or observe, is always shown)
    if (e.inSub) {
      if (g.prompt !== g.promptText || (g.subMoving && e.speedNow < 0.5)) { g.promptText = g.prompt; g.promptT = 0; }
      g.subMoving = e.speedNow >= 0.5;
      g.promptT = (g.promptT || 0) + dt;
      if (!target && !atAngler && !atDave && (g.subMoving || g.promptT > 5)) g.prompt = null;
    } else { g.promptText = null; g.promptT = 0; }
    // aboard the Margaret (2.4.0): the stern ladder, walking the deck, the stations
    deckInput(dt, mv);
    ashoreInput(dt, mv); // (7.4.17)
    // seabed materials have to be worked loose: hold F (or the right mouse button), one at a time
    const holding = keys.has('f');
    const planting = canPlant(target);
    const holdJob = !planting && target && target.kind === 'pickup' && HOLD_TIME[target.p.type];
    if (holdJob && holding) {
      if (!g.pry || g.pry.p !== target.p) g.pry = { p: target.p, t: 0 };
      g.pry.t += dt;
      if (g.pry.t >= HOLD_TIME[target.p.type]) { g.pry = null; interact(target, false); }
    } else g.pry = null;
    // (5.6.3) on a touch screen a hole is tapped to mend it: he works at it while he stays by it, until it is done
    g.patchMarks = !e.inSub && !g.sub.imploded && (g.sub.patches || []).length && dist(e.x, e.y, g.sub.x, g.sub.y) < 14 ? g.sub.patches.map((q) => patchWorld(g.sub, q)) : null;
    if (g.repairTap != null) {
      const n = (g.sub.patches || []).length;
      if (e.inSub || !n || n < g.repairTapCount || !g.patchMarks || g.repairTap >= n) g.repairTap = null; // that hole is mended (or he left)
    } else g.repairSaid = false;
    repairs(dt, target, keys.has('r') || (g.repairTap != null && patchNear() >= 0)); // mending the hull: hold R at a damaged patch (outside)
    // planting a coral fragment on bare shallow seabed
    if (planting && holding) {
      g.plant = (g.plant || 0) + dt;
      if (g.plant >= PLANT_TIME) {
        g.plant = 0; g.inv.coral--;
        const sp = SPECIES_BY_ID[[126, 127, 128, 179][Math.floor(Math.random() * 4)]];
        g.world.statics.push({ sp, x: e.x, y: g.world.floorAt(e.x), scale: 0.5, phase: Math.random() * 6, flip: 1 }); g.world.staticsVer = (g.world.staticsVer || 0) + 1;
        deed(DEED_CALM.plant, 'The coral takes hold.');
      }
    } else g.plant = 0;
    if (pressed.has('f-tap') && g.oldHover) showOldCard(g.oldHover);
    else if (pressed.has('f-tap') && g.atLure) showOldShop();
    else if (pressed.has('f-tap') && atDave) { if (!ui.daveTalkOpen()) ui.daveTalk(); } // (6.5.4) he speaks at his door first
    else if (pressed.has('f-tap') && atStation) ui.toggleCatalog(undefined, 'station');
    else if (pressed.has('f-tap') && !holdJob && !planting) interact(target, false);
    else if (pressed.has('f-tap') && holdJob && (g.holdTipT || 0) < g.time - 2.5) { g.holdTipT = g.time; const nm = target.p.type === 'clam' ? 'the clam' : 'it'; hud.toast(`Hold the hand button to pry ${nm} loose`, 'note'); } /* (7.4.27, owner) a quick tap on something that needs holding said nothing */
    if (pressed.has('l') && (g.aboard || g.helm)) { g.sub.lightsOn = !g.sub.lightsOn;  } // (4.0.0) aboard the Margaret: the sub's lights, quietly
    else if (pressed.has('l')) {
      g.lampFlashT = g.time;
      if (e.inSub) { g.sub.lightsOn = !g.sub.lightsOn; e.lampWanted = g.sub.lightsOn; } // outside, only his own lamp: the sub keeps its lights as they were
      else { const was = e.lampOn || (e.y <= 1 && !e.lampAuto && e.lampWanted); e.lampAuto = false; e.lampWanted = !was; }
      hud.toast(e.inSub ? (g.sub.lightsOn ? 'Lights on' : 'Lights off') : (e.lampWanted ? 'Headlamp on' : 'Headlamp off'));
    }
    if (pressed.has('u') && !g.aboard && ((e.inSub && g.sub.docked) || (Math.abs(e.x - BOAT.x) < 14 && e.y < 4))) { if (ui.anyOpen()) ui.closeAll(); else ui.openShop('sell', e.inSub ? ['sell', 'sub'] : ['sell']); } // (4.11.1) the Margaret: Sell (U) and the yard (P); supplies and the aquarium are online
    if (pressed.has('t')) { if (e.inSub && !g.sub.imploded) ui.toggleTank(); else hud.toast('The tank room is in the sub', 'warn'); }
    // the helm: drive the Margaret along the surface (the docked sub rides in its cradle)
    const atBoat = (Math.abs(e.x - BOAT.x) < 14 && e.y < 4 && !e.inSub) || (e.inSub && g.sub.docked);
    if (pressed.has('b')) ui.toggleInventory();
    if (pressed.has('store')) ui.toggleStore(); // (6.4.0)
    if (pressed.has('events')) ui.toggleEvents();
    // (4.0.0) the shipyard: part of the Margaret, opened with P anywhere aboard her (deck, cabin, wheel) or
    // alongside her (in the water at her side, or in the sub in her cradle)
    if (pressed.has('p')) { if (!e.inSub && Math.abs(e.x - yardX()) < 8 && e.y < 3.2) { audio.ready && audio.click(); ui.openShop('sub', ['sub']); } else hud.showFps = !hud.showFps; } // (4.12.0) the yard at the Margaret; anywhere else, the frame counter
    if (pressed.has('v') && g.helm) { leaveHelm(); audio.ready && audio.click(); } // (the helm is taken aboard, at the wheel)
    if (pressed.has('r')) {
      // a backup air tank, plumbed into the cabin: the air bank fills to full
      if (!e.inSub || g.sub.imploded) { if (patchNear() < 0 && !g.sub.imploded && (g.sub.patches || []).length) hud.toast('Swim to a hole in the hull and tap it', 'warn'); }
      else if (!g.items.airTank) hud.toast('No backup air tanks', 'warn');
      else if (g.tankFit) { /* already being connected */ }
      else if (g.sub.o2 >= g.sub.o2Max - 1) hud.toast('The cabin air is full');
      else { g.tankFit = 0.001; g.tankClank = 0; audio.ready && audio.click(); } // three seconds to connect it (see repairs)
    }
    if (pressed.has('e')) {
      // the necklace is only a light now: on and off, never used up
      // (4.0.0) a glow stick: snapped, it burns warm amber for 90 s and is spent. In the sub it lights the
      // cabin and the water round the hull; he takes it out with him when he leaves.
      if (!g.aboard) dropGlow(); // (5.17.1) snapped and let go where he is
    }
    g.airMul = 1; g.luck = 0; g.stillMul = 1;
    // rare forms turn up more at the whale fall and the seep
    g.fauna.rareMult = Math.abs(e.x - WHALE_FALL.x) < 60 && e.y > 2900 ? 3 : Math.abs(e.x - SEEP.x) < 50 && e.y > 2300 ? 2 : 1;
    // the legendary moment: the first sight of a legend on this dive. The music falls away, a pale
    // light comes up on it for a few seconds, and its name: something to remember.
    if (g.markGuide && Math.hypot(g.markGuide.x - e.x, g.markGuide.y - e.y) < 8) { hud.toast(`Arrived: ${g.markGuide.name}`); g.markGuide = null; } // (4.10.0) a followed marker, reached
    if (g.devGuide) { const c = g.devGuide.c; if (c.dead || c.legendSeen || !g.fauna.list.includes(c) || Math.hypot(c.x - e.x, c.y - e.y) < 6) g.devGuide = null; } // (4.9.0) the developer's trail ends at the legend
    if (g.legend) { g.legend.t += dt; if (g.legend.t > 8 || g.legend.c.dead) g.legend = null; }
    else {
      for (const c of g.fauna.list) {
        if (c.legendSeen || c.dead || !LEGENDARY.has(c.sp.id)) continue;
        if (Math.hypot(c.x - e.x, c.y - e.y) > 16) continue;
        c.legendSeen = true; g.legend = { c, t: 0 };
        const P = g.profile, met = (P.legends = P.legends || {});  met[c.sp.id] = (met[c.sp.id] || 0) + 1; saveProfile(P);
        audio.ready && audio.legend && audio.legend();
        break;
      }
    }
    // a quiet milestone: the first time down on the floor of the hadal trench
    if (e.y > 4600 && e.x > TRENCH.x0 && e.x < TRENCH.x1 && !(g.profile.marks || {}).trench) {
      g.profile.marks = Object.assign(g.profile.marks || {}, { trench: true }); saveProfile(g.profile);
    }
    if (e.y > 5050 && !(g.profile.marks || {}).pit) {
      g.profile.marks = Object.assign(g.profile.marks || {}, { pit: true }); saveProfile(g.profile);
    }
    // back at the boat after being out on a dive: music
    if (e.y > 30) g.awayFromBoat = true;
    if (g.awayFromBoat && Math.abs(e.x - BOAT.x) < 20 && e.y < 3) { g.awayFromBoat = false; audio.cue && audio.cue('home'); }
    // the aquarium's day: tickets in, upkeep out
    tickGallery(profile, dt);
    for (const d of Object.values(aquariumOf(profile).display)) if (d.justFamous) { d.justFamous = false; saveProfile(profile); hud.toast(`${d.name || 'Your ' + SPECIES_BY_ID[d.id].name.toLowerCase()} is Famous now`, 'big'); }
    // released fish: each dive they are found again where they were let go
    if ((profile.released || []).length && (g.relCheckT = (g.relCheckT || 0) - dt) <= 0) {
      g.relCheckT = 1;
      for (const r of profile.released) {
        const c = g.fauna.list.find((q) => q.pet === r);
        if (!c && Math.abs(r.x - e.x) < 60 && Math.abs(r.y - e.y) < 40) spawnReleased(r);
        if (c && Math.hypot(c.x - r.x, c.y - r.y) > 14) { c.vx += Math.sign(r.x - c.x) * 0.4; c.dir = Math.sign(r.x - c.x) || 1; c.tDepth = r.y; }
      }
    }
    const day = tickAquarium(profile, dt);
    if (day) { saveProfile(profile); hud.toast(`Aquarium: ${day.visitors} visitors · +${money(day.income, false)}`, 'note'); }
    // the very bottom, the first time: it shows itself, and lets him go
    if (!profile.met && e.y > 3850 && W.floorAt(e.x) - e.y < 40 && !g.reveal) {
      g.reveal = { t: 0 }; profile.met = true; saveProfile(profile);
      ent.marked = false; ent.attn = 0; ent.state = 'roam';
      audio.ready && (audio.tone(30, 9, 0.6, 'sine', 0, 22), audio.groan(0.25));
    }
    // calling the submersible: tap C to call (or stop) it, hold C to send it back to the dock
    const ap = g.autopilot;
    if (keys.has('c')) {
      cHeld += dt;
      if (cHeld > 0.6 && cHeld - dt <= 0.6 && !e.inSub && !g.sub.imploded && !g.sub.docked) { ap.sendHome(g); hud.toast('The sub turns for home'); audio.ready && audio.click(); }
    }
    if (pressed.has('c-tap')) {
      if (e.inSub && g.homeRun) { g.homeRun = false; ap.cancel(); hud.toast('Autopilot off'); }
      else if (e.inSub && g.sub.docked) hud.toast('Already at the boat');
      else if (e.inSub) { g.homeRun = true; ap.sendHome(g); hud.toast('Autopilot: heading home'); hud.hint('It steers itself to the boat using less air. Tap the autopilot button to take the helm back'); audio.ready && audio.sonar(0.05); }
      else if (g.sub.imploded) hud.toast('The sub is gone: come back to the surface for her', 'warn'); // (7.4.22)
      else if (ap.state === 'coming') { ap.cancel(); g.sub.vx *= 0.5; hud.toast('Sub stopped'); }
      else { ap.call(g); hud.toast(`Calling the sub · ${Math.round(dist(e.x, e.y, g.sub.x, g.sub.y))} m`); audio.ready && audio.sonar(0.05); }
    }
    if (e.inSub && ap.state !== 'idle' && !g.homeRun) ap.cancel();
    if (!e.inSub) g.homeRun = false;
    // the way home: the autopilot steers; anything that needs a pilot hands her back
    if (g.homeRun) {
      const steer = false; // steering no longer takes over: only C does
      const why = g.subHit ? 'Something hit the hull: autopilot off' : g.threat ? 'Something is coming: autopilot off'
        : (g.fx.dread > 0.05 || (ent.marked && (ent.dist ?? 999) < 220)) ? 'Something is near: autopilot off' : null;
      if (why) { g.homeRun = false; ap.cancel(); hud.toast(why, steer ? '' : 'warn'); }
      else {
        const r2 = ap.update(g, dt, 1);
        if (r2 === 'docked') { g.homeRun = false; audio.cue && audio.cue('home'); g.homeFx = { t: 0 }; /* (7.6.22, owner) no "Home" over her */ } // (7.4.0, owner) home: the sub's rim glows, the view leans in and out
      }
    }
    g.subHit = false;
    // catching: 1 / 2 pick the net or the slurp gun, Space uses it
    // the net's button picks it up; again puts it away (hands free)
    const pick = (sel, msg) => { if (g.toolSel === sel) { g.toolSel = 'none'; g.capture = null; hud.toast('Hands free'); } else { g.toolSel = sel; hud.toast(msg); } };
    if (pressed.has('1')) pick('net', gear(profile, 'net').name);
    const tool = activeTool(g);
    if (keys.has(' ') && g.aboard && g.toolSel === 'trap' && !g.trapDeckSaid) { g.trapDeckSaid = true; hud.toast('Jump in first: traps are set from the water, at the surface', 'warn'); } // (claude-polish) on deck Space did nothing at all
    if (!keys.has(' ')) g.trapDeckSaid = false;
    if (pressed.has(' ') && !e.inSub && g.toolSel === 'trap') {
      // at the surface: open the depth meter (setting happens there; the Space that set it is ignored)
      if (!ui.trapSetOpen() && performance.now() - (ui.tsClosedAt || 0) > 400) { const msg = canSetHere(g); if (msg) hud.toast(msg, 'warn'); else ui.openTrapSet(); }
    } else if (pressed.has(' ') && !e.inSub) {
      if (tool.kind === 'cam') { if (!g.photo) { const why = startPhoto(g); if (why) hud.toast(why, 'warn'); else audio.ready && audio.click(); } } else if (tool.kind === 'none') { if (tool.noNet) { hud.toast('No net equipped: put one on from your bag', 'warn'); audio.ready && audio.uiSoft && audio.uiSoft(); } /* hands free: nothing to use */ } else { const msg = useTool(g); if (msg) hud.toast(msg, 'warn'); else if (g.capture && g.capture.t === 0) audio.ready && audio.whoosh && audio.whoosh(0.25); }
    } else if (pressed.has(' ') && e.inSub && !g.armGame && !g.homeRun) {
      if (!owns(profile, 'arm')) hud.toast('The claw needs hydraulics', 'warn');
      else { const msg = startArm(g); if (msg) hud.toast(msg, 'warn'); else audio.ready && audio.ram && audio.click(); }
    }
    // the arm: Space again closes the claw
    const armEv = updateArm(g, dt, pressed.has(' ') && g.armGame && g.armGame.phase === 'grip' && g.armGame.t > 0.05);
    if (armEv && armEv.type === 'armCatch') {
      hud.toast(armEv.crushed ? `The ${armEv.name.toLowerCase()} was gripped too hard` : `${armEv.name} caught`, armEv.crushed ? 'warn' : 'note');
      const sp = armEv.sp;
      if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; }
      if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); }
      profile.journal = [...g.journal.entries()]; saveProfile(profile);
    } else if (armEv && armEv.type === 'armMiss') hud.toast(`The ${armEv.name.toLowerCase()} slips out of the claw`);
    if (!e.inSub && g.armGame) g.armGame = null;
    omens(dt); // (6.8.0)
    sailFind(); // (6.8.1)
    for (const ev of updateTraps(g, dt, renderer.cam)) {
      if (ev.type === 'stowed') { hud.toast(`The ${TRAPS[ev.trap.type].name.toLowerCase()} is back aboard, ready to set again`); audio.ready && audio.thud && audio.thud(0.25); }
      else if (ev.type === 'settled') hud.toast(`${TRAPS[ev.trap.type].name} set at ${ev.trap.depth} m${ev.trap.onBottom ? ', on the bottom' : ''}`);
      else if (ev.type === 'done') { hud.toast(`Your ${TRAPS[ev.trap.type].name.toLowerCase()} is full: ${ev.trap.catch.length} waiting in it`, 'note'); saveProfile(profile); }
    }
    if (g.capture && (g.capture.kind === 'tag' || g.capture.kind === 'cam')) { g.capture.t += dt; if (g.capture.t >= g.capture.dur) g.capture = null; }
    g.camFlash = Math.max(0, g.camFlash - dt * 5);
    // (5.0) the camera: an exposure in progress, and the picture when the shutter closes
    const ph = updatePhoto(g, dt);
    if (ph) {
      audio.ready && audio.click();
      if (ph.empty) hud.toast('Nothing in frame');
      else {
        const pic = { key: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), sk: ph.sk, id: ph.sp.id, variant: ph.variant || null, name: ph.name, q: ph.q, grade: ph.grade, value: ph.value, first: ph.first, again: ph.again, dist: ph.frame ? Math.round(ph.frame.d * 10) / 10 : null, at: Math.round(e.y), img: renderer.snapshot(ph.frame, 1 - ph.sharp) };
        g.photos.push(pic); profile.roll = g.photos.slice(); if (!(profile.photoed || []).includes(ph.sp.id)) profile.photoed = [...(profile.photoed || []), ph.sp.id]; saveProfile(profile); // (7.4.16) every kind ever photographed: an Exclusive pet's unlock
        audio.calmBoost && audio.calmBoost(0.08);
        hud.toast(ph.again ? `${ph.name}: this one is photographed already` : `${ph.name} · ${ph.grade}`, 'note'); // (5.10.10)
        questEvent(profile, 'photo', { id: ph.sp.id });
        if (!g.journal.has(ph.sp.id)) { g.journal.set(ph.sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; profile.journal = [...g.journal.entries()]; saveProfile(profile); }
      }
      if (!(g.items.film > 0)) hud.hint('Out of film: the boat sells more');
    }
    const capEvs = updateCapture(g, dt).concat(g.skillCaught ? g.skillCaught.splice(0) : []); // (7.6.6) catches by Cast and Snatch too
    for (const ev of capEvs) {
      if (ev.type === 'caught') {
        if (g.nacreT > 0 && Math.random() < 0.25) { profile.pearls = (profile.pearls || 0) + 1; saveProfile(profile); (g.pearlFx || (g.pearlFx = [])).push({ x: ev.x ?? g.earl.x, y: ev.y ?? g.earl.y, t: 0 }); } // (7.6.6) Nacre; (7.6.8) a pearl rising from the catch, no words
        if (ev.spec && ev.spec.cursed) (g.obsLabels || (g.obsLabels = [])).push({ c: null, x: ev.x ?? g.earl.x, y: (ev.y ?? g.earl.y) - 0.6, text: 'Cursed', rar: null, nameCol: '#b8402c', t: 0 });
        if (ev.ambushed && !ev.extra) (g.obsLabels || (g.obsLabels = [])).push({ c: null, x: ev.x ?? g.earl.x, y: ev.y ?? g.earl.y, text: 'Ambushed', rar: null, nameCol: '#d8d0b4', t: 0 }); // (7.4.0, owner) Ambush held it still: said beside it
        if (g.toolTip && g.bubbles) for (let i = 0; i < 7; i++) g.bubbles.push({ x: g.toolTip.x + (Math.random() - 0.5) * 0.5, y: g.toolTip.y + (Math.random() - 0.5) * 0.4, r: 0.02 + Math.random() * 0.06, w: Math.random() * 6, t: -Math.random() * 0.2 }); // (5.8.0) a catch stirs up a few more bubbles
        const sp = ev.sp, v = ev.spec.variant;
        questEvent(profile, 'catch', { id: sp.id, depth: ev.spec.from || e.y, alive: ev.spec.cond > 0.05 });
        legendPearls(sp, ev.x, ev.y);
        // (4.3.1) the Log's 'observe' step, and he netted the fish before pressing F: a fish in the net has been
        // looked at closely enough. It goes in the journal and the step is done (the net step then has a new fish)
        if ((QUEST_MAIN[questsOf(profile).main] || {}).id === 'firstfish' && !g.journal.has(sp.id)) {
          g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; profile.journal = [...g.journal.entries()]; saveProfile(profile);
        }
        if (v) {
          hud.toast(`${ev.name}!`, 'big');
          audio.ready && audio.sapphire(); audio.cue && audio.cue('rare');
          const vk = sp.id + ':' + v;
          if (!(profile.variants || []).includes(vk)) profile.variants = [...(profile.variants || []), vk];
        }
        const rr = rarityOf(sp);
        audio.calmBoost && audio.calmBoost(0.12);
        // (2.5.0: just the name, in its rarity's colour; "hurt" only when it is. The price, the pressure
        // tolerance and the bag count were too much: the bag shows on the HUD, the price at the boat)
        const hurt = ''; // (5.0) just the name: its condition is on its card
        const extra = capEvs.filter((q) => q.type === 'caught' && q.extra).length; // (the bait-ball net: more from the same school)
        if (!v && !ev.extra) hud.toast(`${ev.name}${extra ? ` ×${extra + 1}` : ''}${hurt}`, 'rar:' + rr.col);
        audio.ready && audio.pickup();
        if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; }
        if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      } else if (ev.type === 'missed') {
        if (g.tutForce === 'miss') { profile.tutMissed = true; saveProfile(profile); g.tutOops = g.time; } // (5.6.7) said once, by the quest line and beside the fish // (4.3.2) the tutorial's first swing
        else (g.missLabels || (g.missLabels = [])).push({ c: ev.c || null, x: ev.x ?? e.x, y: ev.y ?? e.y, t: 0 }); // (5.7.5) said beside the fish, not at the top of the screen
      }
      else if (ev.type === 'miss' && ev.near) say('Get closer'); // (7.5.0, owner) written beside him
      else if (ev.type === 'miss' && ev.why) hud.toast(ev.why[0].toUpperCase() + ev.why.slice(1), 'warn');
    }
    // the sub's trawl: N drops it, N again (or time) closes it; the winch brings it in with what it caught
    // (4.11.0) with more than one kind of net in the hatch, N asks which: two cards, pick one and it goes out
    if (pressed.has('n') && e.inSub) {
      const letOut = (tier) => {
        const why = fireSubNet(g, tier);
        if (why === 'closing') { hud.toast('Closing the net…'); audio.ready && audio.click(); }
        else if (why && why !== 'busy') hud.toast(why, 'warn');
        else if (!why) { questEvent(profile, 'trawl'); hud.toast(learned(profile, 'trawl') || g.lesson ? `${NETS_SUB[g.subNet.tier].name} out` : `${NETS_SUB[g.subNet.tier].name} out (${'the trawl button closes it'})`); audio.ready && audio.whoosh(); }
      };
      const kinds = netKinds(g.items);
      if (g.subNet || canFireSubNet(g)) letOut(null);
      else { // (6.5.1) the net chosen in the bag (the Catch tab's trawl slot) goes out, no question asked under way
        const N0 = netsOf(g.items), pick = profile && profile.trawlPick;
        if (pick && N0[pick] > 0) letOut(pick);
        else if (pick && !(N0[pick] > 0)) hud.toast(`No ${NETS_SUB[pick].name.toLowerCase()} left: choose another in the bag`, 'warn');
        else letOut(kinds[0]); }
    }
    const netRes = updateSubNet(g, dt, (sp) => canTakeLive(sp) || LEGENDARY.has(sp.id));
    if (g.netEscape) { hud.toast(`The ${g.netEscape.name.toLowerCase()} broke out of the net`, 'warn'); g.netEscape = null; } // (4.11.1)
    if (netRes && netRes.torn) { hud.toast(`The ${netRes.torn.name.toLowerCase()} tore through the net`, 'warn'); audio.ready && audio.thud(0.5); }
    const haul = netRes && netRes.haul;
    if (haul && haul.length) questEvent(profile, 'trawlHaul', { n: haul.length }); // (4.8.0)
    if (haul) {
      if (!haul.length) hud.toast('The net comes in empty');
      else {
        hud.toast(`Net in · ${haul.length} animal${haul.length > 1 ? 's' : ''}${netRes.lost ? ` (${netRes.lost} slipped out)` : ''}`, 'big');
        for (const s of haul) legendPearls(SPECIES_BY_ID[s.id], g.sub && g.sub.x, g.sub && g.sub.y); // (7.4.12)
        hud.hint('T: the tank room. Drag them into the tank or the chambers before they suffer');
        for (const s of haul) { const sp = SPECIES_BY_ID[s.id]; if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(s.from), time: g.survival, at: Date.now() }); ui.journalDirty = true; } if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); } }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      }
      audio.ready && audio.thud(0.3);
    }
    // (3.0.0) quests: what can be read off the game, once a second
    g.questT = (g.questT || 0) + dt;
    profile.playT = (profile.playT || 0) + dt; // (3.0.0) play time: the old one's days
    if (g.questT > 1) { g.questT = 0; g.chambersFull = pressSlots(g) > 0 && pressUsed(g) >= pressSlots(g); if (questTick(g, profile)) saveProfile(profile); }
    if (profile.tut === 'on' && !profile.tutJournal && !document.getElementById('journal').hidden) { profile.tutJournal = true; saveProfile(profile); }
    tutor(); refreshAir(); // (4.2.0; 4.3.4: the first dive's extra air, and back to normal after it)
    // (5.6.8) on a phone, what F (or U) acts on is done by tapping the thing itself: the ladder, the cabin door, the sub,
    // something to pick up, a trap; the Margaret when there is a catch to sell. The renderer brackets each (thin cream
    // corners, as an animal to observe gets) and keeps where it drew them for the tap (renderer.tapRects)
    g.tapMarks = [];
    if (!g.kill && !g.helm) {
      const e2 = g.earl, cabinOn = ui.cabinOpen && ui.cabinOpen(), bagN = (g.bag || []).length;
      if (g.aboard && !cabinOn && !g.aboard.jump && !g.aboard.climb && g.aboard.near === 'door') g.tapMarks.push({ key: 'f', boat: [16.2, -24.8, 21.8, -10.4], what: 'door' });
      if (!g.aboard && !e2.inSub) {
        const T = findTarget();
        if (T && T.kind === 'board') g.tapMarks.push({ key: 'f', w: [g.sub.x - 4.6, g.sub.y - 2.05, g.sub.x + 4.6, g.sub.y + 0.35], what: 'sub', capsule: true }); // (6.5.0) the whole sub: a capsule round its hull (a tap anywhere on it boards)
        else if (T && T.kind === 'yard') { const yx = yardX(); g.tapMarks.push({ key: 'f', w: [yx - 6.2, -5, yx + 6.2, 1.1], what: 'yard' }); } // (7.6.23) the whole barge
        else if (T && T.kind === 'pickup') g.tapMarks.push({ key: 'f', w: [T.p.x - 0.7, T.p.y - 0.7, T.p.x + 0.7, T.p.y + 0.7], what: 'pickup' });
        else if (T && T.kind === 'trap') g.tapMarks.push({ key: 'f', w: [T.t.x - 0.9, T.t.y - 1.4, T.t.x + 0.9, T.t.y + 0.4], what: 'trap' });
        if (nearLadder()) g.tapMarks.push({ key: 'f', boat: [6.8, -13.2, 11.2, 3.4], what: 'ladder' });
      }
      // anything else F does out here (the station's stores, Dave's Haul, the old one's table, planting coral, a kelp
      // blade): the place itself where there is one, else a mark round Earl
      if (!g.aboard && !e2.inSub && !g.tapMarks.some((m) => m.key === 'f') && g.prompt && /(^|·\s*)(Hold )?F  (?!Leave)/.test(g.prompt) && !/Observe/i.test(g.prompt)) {
        const St = g.world.station, D = g.world.dave;
        const at = /Station stores/.test(g.prompt) && St ? { x: St.x + STATION_COLLAR.dx + 1.5, y: St.y + STATION_COLLAR.dy, r: 2 } : /Dave's Haul/.test(g.prompt) && D ? { x: D.x + 6.5, y: D.y - 3.1, r: 2.4 } : { x: e2.x, y: e2.y, r: 0.9 };
        g.tapMarks.push({ key: 'f', w: [at.x - at.r, at.y - at.r, at.x + at.r, at.y + at.r], what: 'other' });
      }
      const winchX = BOAT.x + 4.5 * Math.sign(Math.cos(BOAT.yaw || 0) || 1), nearB = !g.aboard && ((Math.abs(e2.x - winchX) < 1.6 && e2.y < 3 && !e2.inSub) /* (7.5.0, owner) at the Sell door, not at the ladder beside it */ || (e2.inSub && g.sub.docked)); // (7.1.0) only by the winch itself, not anywhere near the boat
      if (nearB && (bagN || e2.inSub || (g.tutAction && String(g.tutAction.key).toLowerCase() === 'u'))) g.tapMarks.push({ key: 'u', boat: [28.9, -10.2, 35.1, -2.2], what: 'winch' }); // (7.4.26, owner) the sell door in her side by the stern
      // (5.6.9) during the tutorial only the step's own thing is marked (the door on the first step, the hatch on the
      // swim down and the ladder while the winch is wanted all pulled the eye the wrong way)
      if (profile.tut === 'on' && g.questMainId === 'subtrip') g.tapMarks = g.tapMarks.filter((m) => m.what === 'sub' || m.what === 'pickup'); /* (7.4.26) the sub trip: the sub to tap, not the cabin door */
      else if (profile.tut === 'on') { const id = g.tutAction && g.tutAction.id, want = { climb: 'ladder', cabin: 'door', sell: 'winch' }[id]; g.tapMarks = want ? g.tapMarks.filter((m) => m.what === want) : []; }
    }
    // (5.6.7) the tutorial's first dive cannot drown him: a miss, a chase and a sprint still leave a quarter of the tank
    g.firstDive = firstDive(profile); // (5.6.9) the HUD keeps the red air figures out of it
    if (g.firstDive && g.earl && !g.earl.inSub && g.earl.o2Max) g.earl.o2 = Math.max(g.earl.o2, g.earl.o2Max * 0.25);
    afterTips(dt); // (4.6.0)
    g.autosaveT = (g.autosaveT || 0) + dt; if (g.autosaveT > 10 && profile && !g.kill) { g.autosaveT = 0; syncProfile(); saveProfile(profile); } // (4.12.6) the dive saved every 10 s
    lessons(); // (4.7.0)
    // (6.5.1) at the surface or aboard, the camera loads from the spare film
    if (profile && owns(profile, 'camera') && (g.aboard || g.earl.y < 1.2) && !g.earl.inSub) { const sh = gear(profile, 'cam').shots, sp = (profile.spare && profile.spare.film) || 0, need = sh - (g.items.film || 0); if (need > 0 && sp > 0) { const n = Math.min(need, sp); g.items.film = (g.items.film || 0) + n; profile.spare.film = sp - n; } }
    const dl = g.frozen ? Object.assign([], { events: [] }) : updateSpecimens(g, dt); // (4.7.0) frozen: nothing suffers
    // (3.0.40) where it is, plainly; a death from the wrong pressure is barotrauma
    const whereOf = (s) => (g.bag.includes(s) ? ' in your net' : g.subTank.includes(s) ? (s.pressed ? ' in its chamber' : s.pile ? ' on the floor of the sub' : ' in the tank') : '');
    // (3.4.0) gathered for a moment and said once: one animal by name, several as one line ("3 animals are
    // dying from barotrauma"); an animal already dying isn't also said to be stressed
    const FM = g.fishMsgs || (g.fishMsgs = { t: 0, deaths: [], ev: [] });
    for (const s of dl) if (!FM.deaths.includes(s)) FM.deaths.push(s);
    for (const ev of dl.events) if (!FM.ev.some((e) => e.s === ev.s && e.type === ev.type)) FM.ev.push(ev); // (an animal counted once)
    if (FM.deaths.length || FM.ev.length) FM.t += dt;
    if (FM.t > 0.8) { sayFish(FM, whereOf); g.fishMsgs = null; }
    g.catchTarget = null; g.capRarity = null; g.capIcon = null; g.trawlTaught = learned(profile, 'trawl'); // (4.0.6)
    // the reloads for the net / slurp go through updateCapture; tag and camera prompts here
    // (2.6.6) a target is named and nothing more: the colour of the name already says how rare it is
    if (e.inSub && owns(profile, 'arm') && !g.armGame) {
      const at = findArmTarget(g);
      g.capPrompt = at ? `Space  ${at.name}` : null;
      g.catchTarget = at ? { c: at.c, x: at.x, y: at.y, len: at.len, col: rarityOf(at.sp).col } : null;
      g.capRarity = at ? rarityOf(at.sp) : null;
    } else if (e.inSub) g.capPrompt = g.armGame && g.armGame.phase === 'grip' ? 'Space  Close the claw in the green' : null;
    else if (g.toolSel === 'trap') {
      const fl = g.world.floorAt(e.x);
      const why = canSetHere(g);
      g.capPrompt = why ? `Traps: ${why.charAt(0).toLowerCase() + why.slice(1)}` : 'Space  Set a trap here';
    } else if (!e.inSub && tool.kind === 'cam') {
      // (5.3) on a touch screen there is no pointer to aim with: the camera turns to the nearest animal ahead
      if (!g.photo) {
        const rng = gear(profile, 'cam').range + 1; let best = null, bd = 1e9;
        for (const c of g.fauna.list) { if (c.dead || c.companion) continue; const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy); if (d > rng || dx * (e.facing || 1) < -0.5) continue; if (d < bd) { bd = d; best = c; } }
        g.aim = best ? Math.atan2(best.y - e.y, best.x - e.x) : null;
      }
      // (5.0) while the shutter is open: hold still; otherwise what is in frame, and the film left
      const film = `${g.items.film || 0}/${gear(profile, 'cam').shots}`;
      if (g.photo) g.capPrompt = 'Hold still';
      else { const ps = photoTarget(g); g.capPrompt = ps ? `Space  ${ps.name}  ${film}` : `Film ${film}`; }
    } else {
    const ct = !e.inSub ? findCatch(g) : null;
    // (4.0.6) an animal he has never observed has no name yet: only F Observe is said (it can still be netted).
    // Once observed, its name; Space before it only until the Log has taught the net, then a small net mark when
    // it is in reach
    const known = ct && g.journal.has(ct.sp.id), taught = learned(profile, 'net');
    g.capPrompt = ct && known ? (ct.ok ? (taught ? ct.name : `Space  ${ct.name}`) : `${ct.sp.name}: ${ct.why}`) : null;
    g.capIcon = ct && known && ct.ok && taught ? 'net' : null;
    // what the net or slurp gun will go for: marked on screen (in plain white while it is unknown)
    g.catchTarget = ct && ct.ok ? { c: ct.c, x: ct.x, y: ct.y, len: ct.len, col: known ? rarityOf(ct.sp).col : '#d8e2de' } : null;
    g.capRarity = ct && ct.ok && known ? rarityOf(ct.sp) : null;
    // the name is said once: not again on the F line
    if (ct && known && g.prompt && g.prompt.startsWith(ct.sp.name)) g.prompt = g.prompt.slice(ct.sp.name.length).replace(/^\s*·\s*/, '') || null;
    }
    if (!e.inSub) {
      const r = ap.update(g, dt, g.addons.recall ? 1.5 : 1);
      if (r === 'arrived') { audio.ready && audio.sonar(0.06); }
      else if (r === 'holding') hud.toast(`Sub holding at ${Math.round(g.sub.y)} m (rated depth)`, 'warn');
      else if (r === 'docked') { /* (4.5.0) nothing said: he can see it */ }
    }

    // injuries: slower, hungrier for air, heal one point every 15 s
    if (g.injury > 0) { g.healT += dt; if (g.healT >= 15) { g.injury--; g.healT = 0; if (!g.injury) hud.toast('The bleeding has stopped'); } }
    const lvl = Math.min(4, g.injury);
    const kg = loadKg(g); g.loadKg = kg;
    e.speedMul = INJURY.speed[lvl] * (g.noAir ? 1 - clamp(g.noAir / 15, 0, 1) * 0.35 : 1) * loadSpeed(kg * (e.featherK ?? 1)) * (e.suitSpeed || 1);
    const cold = !e.inSub && !suitOf(profile).warm && e.y > 200 ? 1 + clamp((e.y - 200) / 800, 0, 1) * 0.35 * (e.warmK ?? 1) : 1;
    e.o2Mul = INJURY.air[lvl] * loadAir(kg * (e.featherK ?? 1)) * (e.suitAir || 1) * cold;
    // (5.14.0) overencumbered (more in the bag than it holds), out of the sub: half speed, air three times as fast, and no
    // more catching until the bag is lightened. The sub is never overencumbered
    { const over = !e.inSub && !g.aboard && overencumbered(g); if (over) { e.speedMul *= 0.5; e.o2Mul *= 3; }
      g.overenc = over; // (5.14.1) the bag counter turns red
      { const F = g.tutFence, m2 = e.inSub ? g.sub : e; if (F && m2) { // (7.4.0) the tutorial's water: a soft push back at its edges
        if (m2.x < F.x0) m2.vx = Math.max(m2.vx || 0, (F.x0 - m2.x) * 2); else if (m2.x > F.x1) m2.vx = Math.min(m2.vx || 0, (F.x1 - m2.x) * 2);
        if (m2.y > F.y1) m2.vy = Math.min(m2.vy || 0, (F.y1 - m2.y) * 2); } }
      // (7.4.0, owner) and a red warning says what it costs, again every few seconds while it lasts
      if (over && (g.overWarnT == null || g.time - g.overWarnT > 6)) { g.overWarnT = g.time; hud.toast('Overencumbered: speed −50 %', 'warn'); } else if (!over) g.overWarnT = null; }
    if (cold > 1.05 && !g.coldTold) { g.coldTold = true; hud.toast('Cold water: air goes faster', 'note'); } // (3.0.0) back
    // struggling (out of air, or critically hurt): heavier, clumsier movement - never a change of
    // facing; that only ever follows the player's own left/right input
    e.struggle = Math.max(g.noAir ? 0.35 + clamp(g.noAir / 15, 0, 1) * 0.65 : 0, lvl >= 4 ? 0.5 : 0);
    if (g.helm) {
      { // (7.2.4) the wheel is left by its own button (V)
        // a heavy working boat: she takes her time to get under way and longer still to stop
        // getting under way: a sub alongside is lifted into her cradle; one still out holds her here
        if (mv.x && !g.sub.docked && !g.sub.imploded) {
          const alongside = Math.hypot(g.sub.x - boatDock(), g.sub.y - 2.6) < 16 && !(g.autopilot && g.autopilot.active);
          if (alongside) { g.sub.docked = true; hud.toast('The sub is lifted into the Margaret\'s cradle'); audio.ready && audio.thud(0.2); }
          else { mv.x = 0; if (!g.subOutWarnT || g.time - g.subOutWarnT > 3) { g.subOutWarnT = g.time; hud.toast('The sub is still out: the sub button calls it', 'warn'); } }
        }
        if (mv.x && g.anchored) { if (!g.anchorWarnT || g.time - g.anchorWarnT > 3) { g.anchorWarnT = g.time; hud.toast(g.anchorDir < 0 ? 'Anchor still coming up' : 'Anchor down', 'warn'); } }
        // (3.1.1) slower, heavier: 3.5 m/s flat out, about twice as long to get under way and to stop
        const want = g.anchored ? 0 : mv.x * 3.5;
        g.boatV = lerp(g.boatV || 0, want, 1 - Math.exp(-dt * (want ? 0.15 : 0.1)));
        mv.x = 0; mv.y = 0;
        if (!e.inSub) { e.x = BOAT.x - 3; e.y = 0.5; e.vx = e.vy = 0; }
      }
    }
    // (4.0.0) the anchor: G at the helm lets it go or winds it in, on a real chain. It takes its time:
    // about 3 s in shallow water, 7 s at 200 m, 12 s from the deepest floor she can sit over. While any
    // of it is out she holds her place and the wheel does nothing.
    {
      const floor = Math.max(2, g.world.floorAt(BOAT.x) - 1);
      if (g.anchorLen == null) g.anchorLen = g.anchored ? floor : 0;
      if (pressed.has('g') && g.helm) {
        g.anchorDir = g.anchorDir ? -g.anchorDir : (g.anchorLen > 0 ? -1 : 1);
        const sec = anchorTime(floor);
        if (g.anchorDir > 0) { g.anchored = true; hud.toast(`Dropping anchor · ${Math.round(floor)} m`); audio.ready && audio.thud(0.18); }
        else hud.toast(`Raising anchor · ${Math.round(sec * (g.anchorLen / floor))} s`);
      }
      if (g.anchorDir) {
        const rate = floor / anchorTime(floor);
        g.anchorLen = clamp(g.anchorLen + g.anchorDir * rate * dt, 0, floor);
        g.chainT = (g.chainT || 0) + dt;
        if (audio.ready && audio.footstep && g.chainT > 0.11) { g.chainT = 0; audio.footstep(0.035); } // the links over the gypsy
        if (g.anchorDir > 0 && g.anchorLen >= floor) {
          g.anchorDir = 0; profile.boatX = Math.round(BOAT.x); saveProfile(profile);
          hud.toast(`Anchor down · ${Math.round(floor)} m`); audio.ready && audio.thud(0.25);
        } else if (g.anchorDir < 0 && g.anchorLen <= 0) { g.anchorDir = 0; g.anchored = false; hud.toast('Anchor up'); audio.ready && audio.thud(0.15); }
      } else if (g.anchored) g.anchorLen = floor; // (the floor under her if she swung a little)
    }
    if (!g.helm && !g.anchored) g.boatV = lerp(g.boatV || 0, 0.25 * Math.sin(g.time * 0.003 + 1), 1 - Math.exp(-dt * 0.1)); // adrift
    if (g.anchored) g.boatV *= Math.exp(-dt * 1.5);
    if (Math.abs(g.boatV || 0) > 0.001) {
      BOAT.x = clamp(BOAT.x + g.boatV * dt, BOAT_MIN, BOAT_MAX);
      if (BOAT.x === BOAT_MIN || BOAT.x === BOAT_MAX) g.boatV = 0;
    }
    // (3.0.0) she turns like the sub to face the way she is going while he steers (about 4 s to come round);
    // let go of the wheel and she swings back to her usual heading (the deck and the ladder are built for it)
    { const face = g.helm && Math.abs(g.boatV || 0) > 0.4 ? Math.sign(g.boatV) : g.helm ? (BOAT.face || -1) : -1;
      BOAT.face = face; const yawT = face < 0 ? 0 : Math.PI, rate = Math.PI / 8; // (3.1.1) she comes round slowly: about 8 s end to end
      BOAT.yaw = (BOAT.yaw || 0) + clamp(yawT - (BOAT.yaw || 0), -rate * dt, rate * dt); }
    // (claude-polish) at the controls of a docked sub, driving off takes her out of the cradle (after the autopilot
    // brought her home, nothing did: he had to climb out and back in to dive again)
    if (e.inSub && g.sub.docked && !g.sub.imploded && !g.helm && !g.homeRun && !ui.anyOpen() && (Math.abs(mv.x) > 0.3 || mv.y > 0.3) && !(g.autopilot && g.autopilot.active)) { g.sub.docked = false; hud.toast('Out of the cradle'); audio.ready && audio.thud && audio.thud(0.15); }
    g.homeSafe = Math.abs(e.x - BOAT.x) < 60 && e.y < 40;
    // a docked sub sits in the boat's cradle wherever she goes
    if (g.sub.docked && !g.sub.imploded && !(g.autopilot && g.autopilot.active)) { g.sub.x = boatDock(); g.sub.y = 2.6; g.sub.vx = g.sub.vy = 0; g.sub.yaw = Math.PI - BOAT.yaw; g.sub.facing = Math.cos(BOAT.yaw) >= 0 ? -1 : 1; }
    if (e.x > CANYON.x0 && e.x < CANYON.x1 && e.y > CANYON.top && !g.helm) {
      const k = 0.7 + 0.3 * Math.sin(g.time * 0.25), cvx = -1.1 * k, cvy = 0.35 * k;
      if (e.inSub) { g.sub.x += cvx * dt * 0.5; g.sub.y += cvy * dt * 0.5; } else { e.x += cvx * dt; e.y += cvy * dt; }
    }
    if (g.aboard && !g.helm) { mv.x = 0; mv.y = 0; mv.sprint = false; }
    const res = g.ashore ? null : updateEarl(g, dt, mv); // (7.4.17) on the island he walks (placeAshore)
    if (g.aboard) placeOnDeck(dt);
    if (g.ashore) placeAshore();
    // (7.4.22, owner) a sub lost while he lives: back at the surface, she is in the Margaret's cradle again
    if (g.sub.imploded && !e.inSub && !g.kill && !g.imploded && (g.implodeT || 0) > 6 && (e.y < 1 || g.aboard || g.ashore)) { const sb = g.sub; sb.imploded = false; sb.failing = null; sb.hull = 1; sb.docked = true; sb.o2 = sb.o2Max; sb.crushR = null; profile.subLost = false; profile.hull = 1; saveProfile(profile); say('The sub is back in its cradle', 'sub'); }
    zoneHazards(dt);
    g.aim = null;
    /* (7.4.26, owner) the right hand on the screen turns his lamp: toward the finger from where he is, mirrored to his front when the finger is behind him; let go and it eases back */
    { const LA = touch && touch.lampAt, es = g.earlScr; if (LA && es && !e.inSub && !g.aboard) { const dx = LA.x - es[0] * innerWidth, dy = LA.y - es[1] * innerHeight; g.lampA = Math.atan2(dy, Math.abs(dx) * (e.facing < 0 ? -1 : 1)); g.lampK = Math.min(1, (g.lampK || 0) + dt * 6); } else g.lampK = Math.max(0, (g.lampK || 0) - dt * 2.5); }
    if (!g.sub.imploded && !g.sub.docked && g.mode === 'play' && !g.frozen) crushDepth(dt); // (7.4.22, owner) her hull is at risk whether he is in her or not
    if (res === 'implode' || g.implodeNow) {
      g.implodeNow = false;
      const aboardSub = e.inSub, far = aboardSub ? 0 : Math.hypot(g.sub.x - e.x, g.sub.y - e.y), near = aboardSub ? 1 : Math.max(0, 1 - far / 120);
      g.sub.imploded = true; if (aboardSub) g.imploded = true; g.implodeDepth = g.sub.y; g.implodeT = 0; g.sub.failing = null; ap.cancel && ap.cancel(); g.homeRun = false;
      g.fx.flash = Math.max(g.fx.flash || 0, near); g.fx.shake = Math.max(g.fx.shake || 0, 3.2 * near);
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
        g.debris.push({ x: g.sub.x + (Math.random() - 0.5) * 6, y: g.sub.y + (Math.random() - 0.5) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, size: 0.2 + Math.random() * 1.1 });
      }
      for (let i = 0; i < 120; i++) g.bubbles.push({ x: g.sub.x + (Math.random() - 0.5) * 8, y: g.sub.y + (Math.random() - 0.5) * 4, r: 0.05 + Math.random() * 0.25, w: Math.random() * 6, t: -Math.random() * 0.5 });
      // he was inside: there is nothing to be done. (7.4.22) Not inside: she is lost, and he goes on without her; heard
      // (a dull boom through the water) wherever he is, felt only if he was near
      if (aboardSub) { audio.ready && audio.implosion(); die(`Crushed at ${Math.round(g.implodeDepth)} m when the submersible imploded`, 'implode'); }
      else { audio.ready && (near > 0.2 ? audio.implosion() : audio.thud && audio.thud(0.7)); g.subTank = []; hud.toast(`The submersible imploded at ${Math.round(g.implodeDepth)} m`, 'warn'); say('The sub is gone. Back at the surface, the Margaret has her again', 'earl'); }
    }
    // out of air: not instant death - about 15 s of air hunger, blacking out, before it is over.
    // Reaching the surface (or the sub's air) in time brings Earl back, gasping.
    // the cabin is out of air: he stays in, breathing from his own tank (no depth effect in the cabin)
    if (res === 'cabin-empty' && !g.cabinWarned) { g.cabinWarned = true; hud.toast('Cabin out of air: breathing from your tank', 'warn'); }
    if (g.sub.o2 > 1) g.cabinWarned = false;
    if (res === 'o2' && !g.noAir && !e.inSub && e.legends && e.legends.has('secondwind') && powerReady('secondwind')) {
      // (2.8.0) Second Wind: when the air runs out, it fills again; (5.16.0) then two hours (real time) before it can again
      spendPower('secondwind'); e.o2 = e.o2Max; g.fx.flash = 0.25; hud.toast('Second Wind: the air comes back', 'big'); audio.ready && audio.gasp && audio.gasp();
    } else if (res === 'o2') {
      if (!g.noAir) { g.noAir = 0.001; g.noAirCause = e.inSub ? 'sub-o2' : 'o2'; hud.toast(e.inSub ? 'Your tank is empty: surface, or R' : 'Out of air: surface!', 'warn'); }
      // under pressure air hunger comes on far faster: ~15 s above 300 m, ~9 s at 500 m, ~3 s at 1000 m
      g.noAirRate = e.inSub ? 1 : Math.pow(diverDrainMult(e.y, e.pressStart || 300), 0.75); // pressure eats the breath hold fast
      g.noAir += dt * g.noAirRate;
      if (g.noAir >= 15) die(causeText(g.noAirCause));
    } else if (g.noAir) {
      g.noAir = 0; g.fx.flash = 0.3;
      audio.ready && audio.gasp && audio.gasp();
    }
    // an empty sub at the surface (or docked) airs out its cabin
    if (!e.inSub && !g.sub.imploded && (g.sub.y < 2.2 || g.sub.docked) && g.sub.o2 < g.sub.o2Max) g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + g.sub.o2Max / 4 * dt);
    // diver tank refills from the sub's air
    if (e.inSub && g.sub.o2 > 0 && e.o2 < e.o2Max) { const r = Math.min(e.o2Max - e.o2, (e.o2Max / 3.5) * dt); e.o2 += r; } // (only while the cabin has air to give)
    // (3.0.17) swimming past what the suit can take: said once, and again only after he has come back above it
    { const pS = e.pressStart || 300;
      // (5.12.0) the warning waits for real danger: twice the depth the suit is rated for (the pressure itself costs air from its limit)
      if (!e.inSub && !g.aboard && e.y > pS * 2 + 2 && !g.pressWarned) { g.pressWarned = true; hud.toast('The pressure is too much for this suit', 'warn'); }
      else if (e.inSub || e.y < pS - 5) g.pressWarned = false; }
    g.diverDrain = e.inSub ? 1 : diverDrainMult(e.y, e.pressStart || 300) * (mv.sprint && e.speedNow > 1 ? 2 : 1);
    g.diverPress = e.inSub ? 1 : 1 + (diverDrainMult(e.y, e.pressStart || 300) - 1) * (e.pressRes ?? 1); // (6.3.0) shown under the air line
    g.diverDrain *= e.o2Mul;
    g.subDrain = subDrainMult(g.sub.y, g.sub.rated) * (mv.sprint && e.speedNow > 1 ? 3 : 1) * subLeak(g.sub);
    if ((!e.inSub || g.sub.o2 <= 0) && !e.atSurface && e.o2 / e.o2Max < 0.1 && !g.lowO2Warned) { g.lowO2Warned = true; hud.toast('Air critical: surface', 'critical'); /* (6.1.4) the more urgent line holds: fish news waits */ }
    if (e.atSurface) g.lowO2Warned = false;

    // protection: necklace or a nearby lantern
    if (g.glows && g.glows.length) { for (const L of g.glows) { L.t -= dt; if (L.rest) continue; const fl = W.floorAt(L.x) - 0.15; L.y += 0.15 * dt; L.x += Math.sin(g.time * 0.7 + L.ph) * 0.05 * dt; if (L.y >= fl) { L.y = fl; L.rest = true; } } g.glows = g.glows.filter((L) => L.t > 0); } // (5.17.1) sinking, then resting
    g.protection = null; g.hunterWard = (g.wardOn && (g.lightFade ?? 1) > 0.5) || g.repelR > 0 ? { x: e.x, y: e.y } : null; // (5.16.0) Lighthouse keeps hunters out of its light (while it burns), never the thing
    for (const l of W.lanterns) {
      const d = dist(e.x, e.y, l.x, l.y);
      const inside = d < (e.inSub ? LANTERN_RADIUS + 3 : LANTERN_RADIUS) && l.charge > 0.05;
      l.active = lerp(l.active, inside ? 1 : 0, dt * 3);
      if (inside) {
        l.charge = Math.max(0, l.charge - dt / 45);
        if (!g.protection) g.protection = { x: l.x, y: l.y, lantern: l };
      } else l.charge = Math.min(1, l.charge + dt / 150);
    }
    // the deep will not go into the old one's cave
    if (!g.protection && inCave(e.x, e.y)) g.protection = { x: CAVE.x + 10, y: CAVE.y, cave: true };

    // animals that attack
    g.fauna.bleeding = g.injury > 0;
    if (!g.frozen) { directEncounters(g, dt, SPECIES_BY_ID); updateHunters(g, dt); }
    // entity (during the reveal it hangs in front of him, then sinks away; it does not take him)
    let r = null;
    if (g.reveal) {
      const R = g.reveal; R.t += dt;
      const dir = e.facing || 1;
      const tx = e.x + dir * (R.t < 16 ? 11 : 11 + (R.t - 16) * 3), ty = e.y + (R.t < 16 ? -3 : -3 + (R.t - 16) * 6);
      ent.x = lerp(ent.x, tx, dt * (R.t < 2 ? 0.6 : 1.5)); ent.y = lerp(ent.y, ty, dt * 1.5);
      ent.dist = dist(ent.x, ent.y, e.x, e.y); ent.eyeOpen = 1; ent.fade = 1; ent.heading = Math.PI;
      if (R.t > 26) { g.reveal = null; ent.y = Math.max(ent.y, e.y + 200); }
    } else if (!g.kill && !g.frozen) r = ent.update(g, dt);
    if (r === 'grab' || r === 'swallow') startKill();
    for (const ev of g.events) {
      if (ev === 'marked') {
        // something has noticed him: a deep sound, a pulse through the screen, a line in the journal
        g.fx.shake = Math.max(g.fx.shake, 1.0); g.fx.markPulse = 1;
        audio.ready && (audio.tone(38, 4, 0.7, 'sine', 0, 24), audio.groan(0.18));
        hud.toast('Something noticed you.', 'note'); // (2.9.1) back
        g.notes = (g.notes ? g.notes + '\n' : '') + `[${formatTime(g.survival)}, ${Math.round(e.y)} m] Something noticed me.`;
      } else if (ev === 'appeased') { hud.toast('The water feels lighter.', 'note');
      } else if (ev === 'unmarked') { hud.toast('It has lost you. The feeling of being watched fades.', 'note');
      }
      else if (ev === 'pass') {
        // it sweeps by, close: the water shoves the sub, a long low rush
        g.fx.shake = Math.max(g.fx.shake, 1.4); audio.ready && (audio.whoosh(), audio.thud(0.45));
        if (e.inSub) { g.sub.vx += (Math.random() - 0.5) * 3; g.sub.vy += 1.2; }
      } else if (ev === 'windup') { g.fx.markPulse = 1; audio.ready && audio.swell(); }
      else if (ev === 'strike') { audio.ready && (audio.whoosh(), audio.heartbeat(0.6)); }
      else if (ev === 'tailbump') { // the first approach: its tail strikes the hull out of the dark
        if (e.inSub) { g.sub.hull = Math.max(0, g.sub.hull - 0.06); g.subHit = true; }
        g.fx.shake = Math.max(g.fx.shake, 2.6); audio.ready && audio.ram();
        for (let i = 0; i < 40; i++) g.bubbles.push({ x: g.sub.x + (Math.random() - 0.5) * 6, y: g.sub.y + 1 + Math.random() * 2, r: 0.05 + Math.random() * 0.2, w: Math.random() * 6, t: -Math.random() * 0.4 });
      }
      else if (ev === 'bump') { g.fx.shake = Math.max(g.fx.shake, 0.9); audio.ready && audio.thud(0.35); hud.toast('Something bumped you', 'warn'); }
      else if (ev === 'lost') hud.toast('It has lost you in the dark.', 'note');
      else if (ev === 'sleeperWarn') { audio.ready && audio.farCall && audio.farCall(1); } // (7.3.9) the sleeper shark's warning: its long low call
      else if (ev === 'glare') { const lit0 = e.inSub ? g.sub.lightsOn : e.lampOn; if (lit0) hud.toast(e.inSub ? 'It is looking at the sub. Lights off, and it may lose you.' : 'It is looking at you. Your lamp off, and it may lose you.', 'warn'); } // (5.16.0)
      else if (ev === 'fooled') hud.toast('Its eye slides off you. Keep every light off.', 'note'); // (5.16.0) the dark fooled it: 15 s to keep it so
      else if (ev === 'notFooled') hud.toast('It is still looking at you.', 'warn'); // (5.16.0) not fooled: run for a refuge
      else if (ev === 'turnsBack') hud.toast('Your light: it turns back.', 'warn');
      else if (ev === 'charge') { audio.ready && audio.whoosh(); }
      else if (ev === 'clicks') { audio.ready && audio.clicks(6); }
      else if (ev === 'orca') { audio.ready && audio.orcaCall(); }
      else if (ev === 'lunge') { audio.ready && audio.thud(0.25); }
    }
    g.events.length = 0;
  } else if (g.mode === 'dying') {
    g.deathT += dt;
    const injuryDeath = g.deathKind === 'injury', crushed = g.deathKind === 'implode';
    // bleeding out: the red closes in first, then the dark; no countdown
    // crushed: the flash, the wreck scattering in the bubble cloud, then the dark, then quiet
    // (6.1.5) the scene darkens but stays (the HUD's veil does the rest), so the line saying what killed him sits in it;
    // only in the thing's jaws is it black. A little longer than before, to read it
    g.deathEnd = crushed ? 5.8 : 4.2; // (6.1.9) black, the line, back aboard: no screen
    g.fx.black = g.deathKind === 'devoured' ? 1 : crushed ? clamp((g.deathT - 1.6) / 1.1, 0, 1) : clamp(g.deathT / 1.1, 0, 1);
    g.fx.redDeath = injuryDeath ? clamp(g.deathT / 2.2, 0, 1) : 0;
    if (g.deathT > g.deathEnd) {
      const cause = g.deathCause, bill = g.deathBill, lost = g.deathLost;
      flushSave();
      g.mode = 'over';
      // (3.0.14) no menu after a death: behind the loading screen, straight back aboard the Margaret for the next
      // dive, and what happened in one message
      withLoading(() => {
        startRun();
        const lostTxt = lost && lost.length ? ` Lost: ${lost.join(', ')}.` : '';
        hud.toast(`${cause}.${bill > 0 ? ` Hospital bill ${money(bill)}.` : ''}${lostTxt}`, 'critical'); // (4.5.0) never cut off
      });
      return;
    }
    // the entity keeps closing in during the fade
    if (g.deathCause && g.deathCause.startsWith('Taken')) { ent.x = lerp(ent.x, e.x, dt); ent.y = lerp(ent.y, e.y, dt); }
  }

  // ----- dread & atmosphere -----
  const d = ent.dist ?? 999;
  const targetDread = g.mode === 'dying' ? 1 : dreadFromDistance(d);
  const fx = g.fx;
  fx.dread = lerp(fx.dread, targetDread, 1 - Math.exp(-dt * 1.5));
  // it is close and hunting: the lights in the water go out and the sea goes quiet
  // its red, creeping into the water round him as its eyes come up (see entity.lights)
  fx.redTint = lerp(fx.redTint || 0, g.mode === 'menu' ? 0 : (ent.lit ? ent.lit.tint : 0) * clamp((150 - (ent.dist ?? 999)) / 100, 0, 1), 1 - Math.exp(-dt * 2));
  fx.hush = lerp(fx.hush || 0, g.kill || (ent.marked && ent.hunt) ? 1 : ent.marked && d < 120 ? 0.45 : 0, 1 - Math.exp(-dt * 0.8));
  fx.torchShift = clamp(fx.dread * 1.5, 0, 1) * (0.35 + 0.65 * clamp((g.earl.y - 100) / 60, 0, 1));
  // (5.16.0) its dark rolling in round him (as render.js draws it: within 260 m): flares, Lighthouse and glow sticks fade
  // out over 3 s (their time keeps running, and what is left comes back over 3 s if it goes), and the lamp and the
  // floodlight weaken, flicker and slide from amber toward red with the water
  g.entDark = g.mode === 'menu' || !(ent.dist < 260) ? 0 : clamp((260 - ent.dist) / 230, 0, 1) * (fx.safeK ?? 1);
  g.lightFade = clamp((g.lightFade ?? 1) + (g.entDark > 0.04 || (fx.redTint || 0) > 0.03 ? -dt / 1 : dt / 3), 0, 1); // (6.0.5) once the water round him reddens, the lights the thing ignores (Flare, Lighthouse, glow sticks) go out over a second
  fx.torchShift = Math.max(fx.torchShift, g.entDark);
  // in the safe zone you still hear and sense it (sonar, heartbeat), but the water stays the water
  const deepK = clamp((e.y - 100) / 60, 0, 1);
  fx.safeK = deepK;
  fx.darken = fx.dread * 0.6 * deepK;
  fx.vignette = fx.dread;
  // pressure: the deeper past 300 m, the worse. Only in the water: the sub's cabin is at surface
  // pressure, and nothing in it sways, blurs or doubles the view (its hull warns by sound instead)
  const pressT = !e.inSub && g.mode !== 'menu' ? clamp(Math.log(Math.max(1, g.diverDrain)) / Math.log(30), 0, 1) : 0;
  fx.pressure = lerp(fx.pressure || 0, pressT, 1 - Math.exp(-dt * 1.2));
  const entDis = d < 50 ? (50 - d) / 50 : 0;
  fx.disorient = lerp(fx.disorient, Math.max(entDis, fx.pressure * 0.85), dt * 1.2);
  fx.ghost = Math.max(entDis * 0.8, fx.pressure * 0.6);
  fx.vignette = Math.max(fx.vignette, fx.pressure * 0.75);
  // suffocation: the world swims, the edges close in, the view greys and blacks out
  const suff = g.noAir ? clamp(g.noAir / 15, 0, 1) : 0;
  fx.suffocate = suff;
  if (suff > 0) {
    fx.disorient = Math.max(fx.disorient, 0.35 + suff * 0.65);
    fx.ghost = Math.max(fx.ghost, 0.4 + suff * 0.6);
    fx.vignette = Math.max(fx.vignette, 0.6 + suff * 0.4);
    fx.black = Math.max(fx.black, Math.pow(suff, 2.2) * 0.85 * (0.85 + 0.15 * Math.sin(g.time * 2.3)));
  } else if (g.mode === 'play') fx.black = 0;
  if (e.inSub) { fx.pressure = 0; fx.disorient = 0; fx.ghost = 0; }
  // lights throb under pressure: the lamps, the sub, and the glowing animals
  g.pressPh = (g.pressPh || 0) + clamp(g.time - (g.pressT ?? g.time), 0, 0.1) * (2.2 + fx.pressure * 1.5); g.pressT = g.time; // (7.2.8) moved by its speed each frame, never the clock times a changing speed (that jumped)
  const pulse = 0.5 + 0.5 * Math.sin(g.pressPh);
  fx.lightPulse = 1 - fx.pressure * 0.45 * pulse - (fx.pressure > 0.6 && Math.random() < 0.03 ? 0.3 : 0);
  fx.bioPulse = 1 + fx.pressure * 0.9 * (0.5 + 0.5 * Math.sin(g.time * 3.1 + 1.3)) - fx.pressure * 0.3;
  fx.shake = Math.max(fx.disorient * 0.45, fx.shake - dt * 1.5);
  fx.flash = Math.max(0, fx.flash - dt * 1.2);
  // sky darkens and the sea rises when it is close and shallow
  const shallowness = clamp((450 - ent.y) / 450, 0, 1);
  const near = Math.pow(clamp((500 - d) / 500, 0, 1), 0.6); // the surface reacts early
  
  // only a faint, uneasy swell at the surface when it is near; the sky is left alone
  g.waveBoost = lerp(g.waveBoost, near * 0.18, dt * 0.5);
  g.storm = 0;
  g.dayEff = g.day.light;
  if (!e.inSub && e.y > 200 && (e.prevLampY ?? 0) <= 200 && !e.lampAuto) { e.lampAuto = true; }
  e.prevLampY = e.y;
  e.dark = Math.sqrt(g.dayEff * Math.exp(-Math.max(0, e.y) / 140)) * (1 - fx.darken) < 0.3;
  // heart rate
  const lowO2 = !e.inSub ? clamp(1 - (e.o2 / e.o2Max) / 0.25, 0, 1) : clamp(1 - (g.sub.o2 / g.sub.o2Max) / 0.2, 0, 1);
  const hrT = 68 + clamp(e.speedNow / 6, 0, 1) * (e.sprint ? 30 : 14) + fx.dread * 105 + lowO2 * 35 + fx.pressure * 45 + g.injury * 14 + (g.threat ? 20 : 0) + (g.noAir ? 60 : 0);
  e.hr = lerp(e.hr, hrT, dt * 0.6);

  // ----- a shape in the distance -----
  // Now and then (rarely) a vast dim shape hangs in the water some way off, drifting. It is a real
  // place in the water, not a backdrop: swim toward it and it is gone before you get close.
  if (g.mode === 'play') {
    const f = g.farShadow;
    if (f) {
      f.t += dt; f.x += f.vx * dt; f.y += Math.sin(f.t * 0.2) * 0.15 * dt;
      const near = Math.hypot(f.x - e.x, f.y - e.y) < 13; // about touching its edge (it is ~30 m long)
      if (near) f.gone = true;
      if (f.gone || f.t > f.dur) f.fade = Math.max(0, f.fade - dt * (f.gone ? 1.2 : 0.2));
      else f.fade = Math.min(1, f.fade + dt / 8);
      if (f.fade <= 0 && (f.gone || f.t > f.dur)) g.farShadow = null;
    } else if (e.y > 120 && e.y < 1600 && fx.dread < 0.02 && !ent.marked && Math.random() < dt / 420) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = clamp(e.x + side * (20 + Math.random() * 10), 10, WORLD_W - 10);
      const y = Math.min(e.y + (Math.random() - 0.4) * 16, W.floorAt(x) - 15);
      if (y > 60) {
        g.farShadow = { x, y, vx: -side * (0.3 + Math.random() * 0.4), dir: -side, t: 0, dur: 50 + Math.random() * 30, fade: 0, gone: false };
        audio.ready && audio.whale(0.04);
      }
    }
  }
  // ----- life -----
  g.fauna.entityNear = ent.marked || (ent.dist ?? 999) < 300;
  g.fauna.update(g.frozen ? 0 : dt, renderer.cam, e, ent, fx.dread, g.time, g.day.light < 0.3); // (4.7.0) a lesson holds the sea still
  if (!g.frozen) updatePet(g, dt, fx.dread);
  if (g.aboard && profile.petStay) { profile.petStay = false; g.petStayAt = null; } // back aboard, it comes home with him
  // (5.0) a spent fish pants: now and then a few small bubbles from its gills, so you can see it has run out
  if (!g.frozen) for (const c of g.fauna.list) if (c.tired > 0 && Math.random() < dt * 2.2 && Math.abs(c.x - e.x) < 25) { const n = 1 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) g.bubbles.push({ x: c.x - (c.dir || 1) * c.len * 0.2, y: c.y - c.len * 0.05, r: 0.012 + Math.random() * 0.02 + c.len * 0.02, w: Math.random() * 6, t: 0 }); }
  // breathing bubbles
  if (!e.inSub && e.y > 1 && g.mode === 'play' && !e.suitQuiet) {
    g.breathT -= dt;
    if (g.breathT <= 0) {
      g.breathT = 4.2 / clamp(e.hr / 70, 0.8, 2.6);
      for (let i = 0; i < 9; i++) g.bubbles.push({ x: e.x + e.facing * 0.6 + (Math.random() - 0.5) * 0.3, y: e.y - 0.3, r: 0.03 + Math.random() * 0.07, w: Math.random() * 6, t: -i * 0.06 });
    }
  }
  if (e.atSurface && !e.inSub && e.o2 < e.o2Max && Math.random() < dt * 25) g.bubbles.push({ x: e.x + (Math.random() - 0.5) * 1.6, y: e.y + 0.8, r: 0.04 + Math.random() * 0.06, w: Math.random() * 6, t: 0 });
  if (e.inSub && g.sub.hull < 0.99 && !e.atSurface && Math.random() < dt * (1 - g.sub.hull) * 30) g.bubbles.push({ x: g.sub.x + (Math.random() - 0.5) * 6, y: g.sub.y - 1, r: 0.03 + Math.random() * 0.06, w: Math.random() * 6, t: 0 });
  if (e.inSub && e.speedNow > 0.8 && Math.random() < dt * (e.sprint ? 70 : 20)) // sprinting churns far more
    g.bubbles.push({ x: g.sub.x - g.sub.facing * 5, y: g.sub.y - 0.5 + Math.random(), r: 0.05 + Math.random() * 0.1, w: Math.random() * 6, t: 0 });
  // blood: a trail while injured, clouds when hit
  if (g.mode === 'play' && g.injury > 0 && !e.inSub && Math.random() < dt * g.injury * 2.5)
    g.blood.push({ x: e.x + (Math.random() - 0.5) * 0.6, y: e.y + (Math.random() - 0.5) * 0.4, vx: -e.vx * 0.2, vy: -0.05, r: 0.08 + Math.random() * 0.15, t: 0, life: 4 + Math.random() * 3 });
  for (let i = g.blood.length - 1; i >= 0; i--) {
    const b = g.blood[i];
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.exp(-dt * 1.2); b.vy *= Math.exp(-dt * 1.2); b.r += dt * 0.12;
    if (b.t > b.life) g.blood.splice(i, 1);
  }
  g.fx.redFlash = Math.max(0, (g.fx.redFlash || 0) - dt * 1.4);
  g.fx.markPulse = Math.max(0, (g.fx.markPulse || 0) - dt * 0.5);
  updateBubbles(dt);
  updateDebris(dt);
  if (g.implodeT != null) g.implodeT += dt;
}
function updateDebris(dt) {
  for (const d of g.debris) {
    d.vx *= Math.exp(-dt * 1.8); d.vy = d.vy * Math.exp(-dt * 1.8) + 1.2 * dt;
    d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
    const fl = g.world.floorAt(d.x);
    if (d.y > fl - d.size * 0.3) { d.y = fl - d.size * 0.3; d.vx = 0; d.vy = 0; d.vr = 0; }
  }
}

function updateBubbles(dt) {
  // (5.7.0) sprinting: a stream of bubbles kicked off his fins, behind him
  { const e = g.earl; if (g.mode === 'play' && e && e.sprint && !e.inSub && !g.aboard && e.y > 0.6 && e.speedNow > 0.8) { g.wakeT = (g.wakeT || 0) - dt; if (g.wakeT <= 0) { g.wakeT = 0.045; const a = e.angle || 0, bx = e.x - Math.cos(a) * 0.95, by = e.y - Math.sin(a) * 0.95; for (let i = 0; i < 2; i++) g.bubbles.push({ x: bx + (Math.random() - 0.5) * 0.3, y: by + (Math.random() - 0.5) * 0.3, r: 0.02 + Math.random() * 0.045, w: Math.random() * 6, t: 0 }); } } }
  for (let i = g.bubbles.length - 1; i >= 0; i--) {
    const b = g.bubbles[i];
    b.t += dt;
    if (b.t < 0) continue;
    b.y -= (0.7 + b.r * 12) * dt; b.x += Math.sin(b.t * 8 + b.w) * 0.25 * dt;
    // bubbles burst at the actual wave surface
    const sy = g.surfY ? g.surfY(b.x) : 0;
    if (b.y < sy + 0.1 || b.t > 25) g.bubbles.splice(i, 1);
  }
  if (g.bubbles.length > 160) g.bubbles.splice(0, g.bubbles.length - 160); // (4.5.0) fewer at once
}

// ---------------- loop ----------------
let last = performance.now();
let filterKey = '';
let frameEma = 1 / 60, qualityT = 0, hudDt = 0;
function adaptQuality(realDt) {
  frameEma = lerp(frameEma, realDt, 0.05);
  hud.fps = 1 / Math.max(1e-3, frameEma); hud.quality = renderer.quality; hud.lite = renderer.lite;
  qualityT += realDt;
  // (5.3.2) a phone keeps one resolution for good: switching resizes every canvas and rebuilds what was drawn at the
  // old size, which costs more than it saves (and made the boat's stains flicker). Lite mode stays on
  if (renderer.phone) { if (renderer.quality !== 0.85) { renderer.quality = 0.85; renderer.resize(); } return; }
  if (qualityT < 1) return;
  const q = renderer.quality ?? 1;
  // the floor is set by the real screen: never below ~90 % of a screen pixel (75 % on plain screens), so
  // the picture never turns soft or pixelated; on sharp (high-DPI) screens that leaves room to drop further
  const floor = SETTINGS.fast || renderer.phone ? 0.55 : Math.min(0.75, 0.9 / Math.min(window.devicePixelRatio || 1, 1.25)); // (5.3.2) a phone may soften further
  if (SETTINGS.fast && !renderer.lite) renderer.lite = true; // Fast graphics: the extras stay off
  if (frameEma > 1 / 45 && q > floor) { renderer.quality = Math.max(floor, q - 0.05); qualityT = 0; }
  // still slow at the floor: lite mode drops the costliest extras (the rim light on animals, the water
  // textures, the specks in the beams) instead of sharpness; they come back as soon as there is room
  else if (frameEma > 1 / 45 && !renderer.lite) { renderer.lite = true; qualityT = 0; }
  // lite mode comes on first when frames are well under 40 a second, before any sharpness goes
  if (frameEma > 1 / 38 && !renderer.lite) { renderer.lite = true; qualityT = 0; }
  else if (frameEma < 1 / 57 && renderer.lite && qualityT > 4 && !SETTINGS.fast && !renderer.phone) { renderer.lite = false; qualityT = 0; }
  else if (frameEma < 1 / 57 && q < 1 && qualityT > 3) { renderer.quality = Math.min(1, q + 0.05); qualityT = 0; }
  else if (qualityT > 3) qualityT = 1;
}
const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
// (5.4) a phone's frame budget: never more than 60 frames a second (a 90 or 120 Hz screen otherwise doubles the work and
// the heat), 30 with "Smoother on slow devices" on and on the title; the sea behind a panel or the pause menu is redrawn
// ten times a second (the game itself keeps its pace)
// (5.4) and on its own: a phone whose frames take longer than ~14 ms of work goes to an even 30 (steadier than a
// juddering 40-50, and cooler); back to 60 once the work has stayed under 9 ms for 8 s
let workEma = 8, slow30 = false, quickT = 0, overT = 0;
// (5.6.7) on a phone the journal, the quests and the chart are one book: tabs along its top move between them
function bookTabs() {
  const open = { journal: !document.getElementById('journal').hidden, quests: !document.getElementById('quests').hidden, chart: !!(ui.chart && ui.chart.isOpen && ui.chart.isOpen()) };
  const show = (open.journal || open.quests || open.chart);
  let el = document.getElementById('booktabs');
  if (!el) {
    if (!show) return;
    el = document.createElement('div'); el.id = 'booktabs'; el.hidden = true;
    el.innerHTML = '<button data-t="journal">Journal</button><button data-t="quests">Quests</button><button data-t="chart">Chart</button>';
    el.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const t = b.dataset.t; ui.closeAll(); if (t === 'journal') ui.toggleJournal(true); else if (t === 'quests') ui.toggleQuests(true); else ui.chart.toggle(true); audio.ready && audio.journalPage && audio.journalPage(); });
    document.body.appendChild(el);
    /* (7.4.26, owner) the tabs tuck under the book's edge, so a full-screen page (the Quests, the Chart) lay over them and a
       tap on a tab fell on that page's backdrop, which closed the book. A tap inside a tab's own outline is the tab's. */
    document.addEventListener('click', (ev) => {
      if (el.hidden || el.contains(ev.target)) return;
      const b = [...el.children].find((q) => { const r = q.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; });
      if (!b) return; ev.stopPropagation(); ev.preventDefault(); b.click();
    }, true);
  }
  el.hidden = !show;
  // (5.9.2) Quests and the Chart open as pages in the same book: a shell (its cover and two blank pages) behind them
  { let sh = document.getElementById('bookshell'); const inBook = (open.quests || open.chart);
    if (!sh && inBook) { sh = document.createElement('div'); sh.id = 'bookshell'; sh.innerHTML = '<div class="bs-page l"></div><div class="bs-page r"></div>'; document.body.appendChild(sh); }
    if (sh) sh.hidden = !inBook; document.body.classList.toggle('bookmode', !!inBook); }
  if (show) for (const b of el.children) { const on = !!open[b.dataset.t]; if (b.classList.contains('on') !== on) b.classList.toggle('on', on); }
  // (5.9.6) the tabs hang off the book actually showing: their inner third tucked under its right edge, near its top
  if (show) { const bk = open.journal ? document.getElementById('journal') : document.getElementById('bookshell');
    const R = bk && bk.getBoundingClientRect(); if (R && R.width) { const z = parseFloat(getComputedStyle(el).zoom) || 1, L = (R.right - 40) / z + 'px', T = (R.top + 30) / z + 'px';
      if (el.style.left !== L) el.style.setProperty('left', L, 'important'); if (el.style.top !== T) el.style.setProperty('top', T, 'important'); } }
}
// (5.10.1) time keeps running under every panel down there; so the danger reaches through them: a strip over the
// panel when the air is low or gone, or the thing is hunting close
// (5.10.11) the boxed danger strip over panels is gone (it doubled the HUD's own air warning and looked like a web badge)
function phoneCap(now) {
  
  return (SETTINGS.fast || g.mode === 'menu' || slow30) ? 1000 / 30 : 1000 / 60;
}
let lastWork = 0;
function noteWork(ms, dt) {
  lastWork = ms;
  if (g.warmUntil || g.mode !== 'play') return; // the loading card's heavy frames do not count
  workEma += (Math.min(ms, 50) - workEma) * 0.03;
  if (!slow30) { overT = workEma > 14 ? overT + dt : 0; if (overT > 3) { slow30 = true; quickT = 0; } } // slow for 3 s on end
  else { quickT = workEma < 9 ? quickT + dt : 0; if (quickT > 8) { slow30 = false; overT = 0; } }
}
function frame(now) {
  { const cap = phoneCap(now); if (cap && now - last < cap - 2) { requestAnimationFrame(frame); return; } }
  const workFrom = performance.now();
  const realDt = (now - last) / 1000;
  const dt = Math.min(0.05, realDt);
  last = now;
  if (realDt < 0.25) adaptQuality(realDt);
  renderer.resize(); hud.resize();
  // (4.9.0) the legendary moment: time slows to a third for a few seconds, easing in and back out (counted in real
  // time); legendK is how far into it the moment is, for the camera and the greyed edges
  let ts = 1;
  if (g && g.legend && !g.paused) {
    const L = g.legend; L.rt = (L.rt || 0) + dt;
    const k = smooth01(L.rt / 0.9) * (1 - smooth01((L.rt - 3.6) / 1.6));
    g.legendK = k; ts = 1 - 0.67 * k;
  } else if (g && g.legendK) g.legendK = Math.max(0, g.legendK - dt / 1.2);
  if (g && g.homeFx) { g.homeFx.t += dt; if (g.homeFx.t > 1.6) g.homeFx = null; } // (7.4.0) the home arrival's moment
  if (g && (g.dashAim || g.siphonAim) && !g.paused) ts = Math.min(ts, 0.2); // (5.16.0) Dash waiting for a tap: the world slowed to a fifth
  if (!(ui.confirmOpen && ui.confirmOpen() && ui.confirmModal)) update(dt * ts); // (5.5) a question that must be answered (the tutorial's welcome) holds the world still
  renderer.updateCamera(g, dt);
  // (3.0.27) the sea isn't drawn while a full-screen room covers it: it only cost frames (and slowed him there)
  const covered = !document.getElementById('cabin').hidden || !document.getElementById('tankroom').hidden || !document.getElementById('gallery').hidden
    || (innerHeight > innerWidth); // (5.4) a phone held upright: the turn-your-phone card covers it all
  // (6.5.0) only the pause menu holds the world still, so only there is the sea drawn sparingly: behind any other panel
  // the world goes on, and drawing it ten times a second made the fish, the radar and the water stutter
  // (6.5.6) and not there either: the pause menu and the refit room showed the sea at ten frames a second. Paused, the
  // world is still: it is drawn at the full rate while the camera settles (half a second), then simply held, as a
  // still picture costs nothing to show (and keeps the phone cool while a menu is up)
  if (g.paused && g.mode === 'play') g.pausedFor = (g.pausedFor || 0) + realDt; else g.pausedFor = 0;
  { const sz = innerWidth + 'x' + innerHeight; if (sz !== g.heldSize) { g.heldSize = sz; g.pausedFor = 0; } } // a turn or resize clears the canvas: drawn again
  const behind = g.pausedFor > 0.5 && !g.legend && !g.kill;
  if (!covered && !behind) renderer.render(g);
  // spare time: prepare creature animation frames for what lies ahead (more while on the menu)
  if (g.warmUntil) { // behind the loading card: build the sprites on screen at full speed, then lift it
    const done = renderer.warmSprites(g, 60, true);
    ui.setLoading(0.6 + 0.4 * Math.min(1, (performance.now() - (g.warmFrom || 0)) / 1500), 'Charting the sea');
    // (5.5) on a phone the card stays until the game runs smoothly behind it: every animal about built, and a dozen
    // frames in a row drawn quickly (the first draws of the sea, the seabed and the boat are built and handed to the
    // phone's graphics chip here, not in the first minute of play); never more than 8 s
    g.warmFrames++; g.warmCalm = lastWork < 22 ? g.warmCalm + 1 : 0;
    const ready = (done && g.warmFrames > 12 && g.warmCalm >= 12);
    if (ready || performance.now() > g.warmUntil) { g.warmUntil = 0; ui.setLoading(1, 'Charting the sea'); setTimeout(() => ui.showLoading(false), 250); }
  } else if (renderer.phone) { if (!behind) renderer.warmSprites(g, realDt < 1 / 50 ? 3 : 1, true); } // (5.4) a phone: only the animals about now (the look-ahead over every species near this depth outgrew its memory and kept rebuilding), none behind a panel
  else renderer.warmSprites(g, g.mode === 'menu' ? 8 : realDt < 1 / 50 ? 3 : 1);
  // (5.3) in lite mode the HUD (its text, its shadows) is drawn every second frame: it changes slowly, and a
  // phone's fill is better spent on the sea
  hudDt += dt;
  { const on = !!(g.mode === 'play' && !g.paused && !g.kill && !ui.anyOpen('cabin')); if (on !== touch.restOn) { touch.restOn = on; touch.rest(on); } }
  if (renderer.cam && renderer.cam.ppm) { // (5.6.1) where Earl (and the animal to observe) are on the HUD, for its tag and taps
    const cm = renderer.cam, k = hud.c.width / renderer.c.width, sx = (wx) => ((wx - cm.x) * cm.ppm + renderer.c.width / 2) * k, sy = (wy) => ((wy - cm.y) * cm.ppm + renderer.c.height / 2) * k;
    hud.earlScreen = { x: sx(g.earl.x), y: sy(g.earl.y) };
    { const A = g.aboard ? null : g.fAnchor; hud.fAnchorScreen = A ? { x: sx(A.x), y: sy(A.y), r: (A === g.fAnchor && g.fAnchor.x === g.sub.x ? 3.2 : 0.6) * cm.ppm * k } : null; }
    const ot = g.obsTarget, oc = ot && (ot.c || null);
    hud.obsScreen = ot ? { x: sx(oc ? oc.x : ot.x ?? g.earl.x), y: sy(oc ? oc.y : ot.y ?? g.earl.y), r: Math.max(34 * hud.c.width / innerWidth * (window.__fingerK || 1), (ot.sp.len || 0.3) * cm.ppm * k) } : null;
  }
  { // (5.6.2) the quest group under the settings coin, its pictures the coins'
    // (5.6.8) the journal's coin (hud.journalAt, its centre; 5.6.9: in the column under the radar, above the bag); the goal's line under the money. Placed by
    // where they really are on the page, so the zoom the stylesheet gives them does not throw them off
    const qh = document.getElementById('quests-hud'), qb = document.getElementById('quests-btn'), J = hud.journalAt;
    if (qh) { const vis = J ? '' : 'hidden'; if (qh.style.visibility !== vis) qh.style.visibility = vis; } // (5.15.7) folded away with the menu
    if (qb && J && J.r && Math.abs((qb.__r || 0) - J.r) > 0.5) { qb.__r = J.r; const im = qb.querySelector('img'), z = parseFloat(getComputedStyle(qh).zoom) || 1, sz = (2 * J.r / 0.8 / z).toFixed(1) + 'px'; if (im) { im.style.setProperty('width', sz, 'important'); im.style.setProperty('height', sz, 'important'); } } // (5.6.9) the size of the column's coins
    // (5.15.6) the journal's red "!" sits on the coin's rim at its top right, touching it, as a phone game's badge does
    { const dot = qb && qb.querySelector('i'), im = qb && qb.querySelector('img'); if (dot && im && im.offsetWidth && dot.__w !== im.offsetWidth) { dot.__w = im.offsetWidth;
      const ri = im.getBoundingClientRect(), rb2 = qb.getBoundingClientRect(), z = (rb2.width / (qb.offsetWidth || rb2.width)) || 1;
      const c0x = (ri.left - rb2.left + ri.width / 2) / z, c0y = (ri.top - rb2.top + ri.height / 2) / z, h0 = (ri.width / z) * 0.4, rim = h0 * 0.7, rimY = h0 * 0.62, bw = Math.round(h0); /* (7.5.0, owner) the same badge as the canvas tiles' (coins.js drawBang): its diameter half the tile, at the same spot */
      for (const [k, v] of [['left', `${(c0x + rim - bw / 2).toFixed(1)}px`], ['top', `${(c0y - rimY - bw / 2).toFixed(1)}px`], ['right', 'auto'], ['min-width', `${bw}px`], ['height', `${bw}px`], ['line-height', `${bw}px`], ['font-size', `${(bw * 0.65).toFixed(1)}px`], ['border-radius', '50%']]) dot.style.setProperty(k, v, 'important'); } }
    if (qh && qb && J) { const r0 = qb.getBoundingClientRect(); if (r0.width) { const dx = J.x - (r0.left + r0.width / 2), dy = J.y - (r0.top + r0.height / 2); if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { const st = getComputedStyle(qh), z = parseFloat(st.zoom) || 1; qh.style.setProperty('left', (parseFloat(st.left) + dx / z) + 'px', 'important'); qh.style.setProperty('top', (parseFloat(st.top) + dy / z) + 'px', 'important'); } } }
    // (7.2.6) the tutorial's line has one place, the banner at the top centre (olive.css): no longer moved beside the menu here
    if (!window.__qCoins) { window.__qCoins = true; for (const [id, k] of [['quests-btn', 'journal'], ['hud-journal', 'journal'], ['hud-chart', 'chart']]) { const im = document.querySelector('#' + id + ' img'); if (im) im.src = id === 'quests-btn' ? tileURL(k) : coinURL(k); } /* (5.15.7) the journal a tile, as the menu's others */ }
  }
  bookTabs(); // (5.6.7)
  menuFold(now); // (6.5.7)
  { const off = !!((g.kill && (g.kill.inSub || g.kill.esc)) || g.mode === 'dying'), dim = !!(g.kill && !off); if (document.body.classList.contains('hud-off') !== off) document.body.classList.toggle('hud-off', off); if (document.body.classList.contains('hud-dim') !== dim) document.body.classList.toggle('hud-dim', dim); } // (5.10.10) in its jaws the journal stays, dimmed
  { const tk = window.__hudTutKey || null; if (tk !== g.lastTutKey) { g.lastTutKey = tk; g.tutPressedKey = null; } // (5.8.1) each step's spotlight once, until its button is pressed; not for sprint (pressed while swimming)
    hud.spotWanted = !!(profile && (profile.tut === 'on' || !!g.lesson) /* (6.6.2) and the lessons */ && tk && tk !== 'sprint' && tk !== g.tutPressedKey); g.tutFreeze = !!(hud.spotOn && hud.spotWanted && !hud.panel); }
  hud.panel = !!(ui.anyOpen && ui.anyOpen('cabin davetalk')); /* (7.0.13) Dave's words sit at the foot of the scene: the HUD stays round them */ // (5.6.8) the cabin keeps the controls: it is the same game
  { const cab = !!(ui.cabinOpen && ui.cabinOpen()); if (cab !== hud.inCabin) { hud.inCabin = cab; document.documentElement.classList.toggle('in-cabin', cab); } }
  if (hud.inCabin && pressed.has(' ') && ui.cabin.near && ui.cabin.near() === 'door') { pressed.delete(' '); ui.cabin.use(); }
  /* (7.4.26, owner) the hand button in the cabin (the door picture at the door): it uses what he stands at. Nothing took it before, so in the tutorial's "Out on deck" a tap at the door did nothing */
  if (hud.inCabin && pressed.has('f')) { pressed.delete('f'); pressed.delete('f-tap'); if (ui.cabin.near && ui.cabin.near() && !(ui.anyOpen && ui.anyOpen('cabin davetalk'))) { fSwallow = keys.has('f'); ui.cabin.use(); audio.ready && audio.click && audio.click(); } } // (7.4.0, owner) at the cabin door the big button takes him out too
  hud.abilDef = currentAbility(); // (5.9.0) the arc's ability button
  hud.abilDef2 = secondAbility(); hud.abil2Running = !!(g.abil2 && g.abil2.activeT > 0); // (7.6.4) its swap chip
  hud.killTide = false; // (6.0.0) nothing saves him once it strikes: the Tidewarden is for before, while the water reddens // (5.10.8) the Tidewarden, offered in the jaws
  hud.cabinNear = hud.inCabin && ui.cabin.near ? ui.cabin.near() : null; // (7.1.0) which station is in reach, for the button's picture
  hud.handOn = !!(g.aboard && !(profile && profile.tut === 'on' && !hud.inCabin && !(g.tutAction && g.tutAction.id === 'cabin')) && (hud.inCabin ? ui.cabin.near && ui.cabin.near() : g.aboard.near === 'door' && !g.aboard.jump && !g.aboard.climb)); // (5.4) on a phone the touch buttons step aside while a panel is open
  if (!(innerHeight > innerWidth) && !behind) { hud.draw(g, hudDt); hudDt = 0; } // (5.4) behind a panel: with the sea, ten times a second. (5.3.4) every frame again: drawn every second frame the buttons seemed to wobble against the sea
  ui.questsButton && ui.questsButton(g.mode === 'play' && !g.kill && !ui.anyOpen('cabin')); // (3.0.0) the Quests button (4.3.5: in the cabin too)
  audio.update(g, dt);
  g.realDt = dt; airOver(g); if (g.rebirthT > 0) g.rebirthT = Math.max(0, g.rebirthT - dt); // (5.16.0) Rebirth's grace
  // (6.0.0) the wake after a Rebirth: black, then the eyes open (hud.wakeFx) while the world comes back into focus;
  // after being eaten, his one line follows as the eyes clear
  if (g.wake) { const W0 = g.wake; W0.t += dt; const b = W0.t < 1.4 ? 10 : Math.max(0, 10 * (1 - (W0.t - 1.4) / 2.2));
    canvas.style.filter = b > 0.05 ? `blur(${b.toFixed(1)}px)` : '';
    if (W0.t > 3.3 && !W0.said) { W0.said = true; if (W0.eaten) g.earlSay = { text: "What happened? I'm still here.", t: 0 }; else say('The sea gives you back', 'earl'); }
    if (W0.t > 4.2) { g.wake = null; canvas.style.filter = ''; document.documentElement.classList.remove('waking'); } } else if (canvas.style.filter) { canvas.style.filter = ''; document.documentElement.classList.remove('waking'); }
  if (g.earlSay) { g.earlSay.t += dt; if (g.earlSay.t > 5.6) g.earlSay = null; }
  if (g.says && g.says.length) { for (const m of g.says) m.t += dt; g.says = g.says.filter((m) => m.t < 4); }
  beacon.update(g, dt, !!(ui.tankOpen && ui.tankOpen())); // (4.0.2) always: the alarm keeps going whatever panel is open // (3.3.0) the alarm beacon (not over the locker)
  ui.update(g, dt);
  { const on = g.mode === 'play' && !g.paused && !g.kill && !!profile && (profile.tut === 'on' || !!g.lesson) && !!g.tut; const sp = on ? g.tut.spot : null, coverd = sp && !sp.sel && !sp.card && ui.anyOpen && ui.anyOpen('cabin davetalk'); /* (7.2.4) the cabin keeps the HUD, so its buttons can still be lit there */ tutSpot.update(on, coverd ? null : sp, on ? g.tut.text : null); } // (4.3.0) (5.4: a key or button step waits while a panel is open over the game)
  // dread colour grading on the scene canvas only
  const fx = g.fx;
  // no steady blur: it comes in slow pulses, a swell of fog every few seconds that clears again
  const blurAmp = Math.max(fx.disorient * 1.2, fx.pressure * 2.4);
  const blurPx = Math.round(blurAmp * Math.pow(Math.max(0, Math.sin(g.time * 1.3)), 3) * 4) / 4;
  const f = `saturate(${(1 - fx.dread * 0.65 - fx.pressure * 0.25 - (g.injury >= 4 ? 0.45 : g.injury >= 3 ? 0.15 : 0)).toFixed(2)}) contrast(${(1 + fx.dread * 0.18).toFixed(2)})${blurPx > 0.25 ? ` blur(${blurPx.toFixed(1)}px)` : ''}`;
  const f2 = (fx.dread < 0.01 && fx.pressure < 0.01 && blurPx <= 0.25 && g.injury < 3) || (renderer.lite && fx.dread < 0.5 && blurPx <= 0.25) ? 'none' : f; // (5.3) lite: no full-screen filter for a faint grade
  if (f2 !== filterKey) { canvas.style.filter = f2; filterKey = f2; }
  pressed.clear();
  noteWork(performance.now() - workFrom, Math.min(0.1, realDt));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// (2.6.4) the loading screen: the sea is built by now; wait for the fonts, paint the monster's hide (the one
// slow drawing, done here so it never hitches later), let the first frames settle, then fade into the title
(async () => {
  const B = window.__boot || (() => {}), frames = (n) => new Promise((r) => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  B(0.6, 'Generating the ocean');
  await frames(2);
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* the fallback fonts will do */ }
  B(0.78, 'Preparing textures');
  await frames(1);
  try { prepareMonster(); } catch (e) { /* drawn on first sight instead */ }
  B(0.92, 'Rendering the first frames');
  await frames(14);
  B(1, 'Ready');
  await frames(4);
  await Promise.race([platesReady, new Promise((r) => setTimeout(r, 4000))]); // (6.5.0) the panels' plates decoded behind the loading screen
  watchPanels();
  if (window.__bootDone) window.__bootDone();
})();

// (5.7.0) any touch or key on the title: the eye in the dark closes again
for (const ev0 of ['pointerdown', 'actdown']) window.addEventListener(ev0, () => { if (g && g.mode === 'menu') g.menuIdle0 = g.time; }, true);
// (5.7.5) a new version pushed while the old one is open (or kept by the phone's home-screen copy): a note to tap to load it
{ const mine = () => import('./version.js').then((m) => m.VERSION).catch(() => null);
  const check = async () => { try { const cur = await mine(); const t = await (await fetch('js/version.js?t=' + Date.now(), { cache: 'no-store' })).text(); const m = t.match(/VERSION\s*=\s*'([^']+)'/); const nv = m && m[1];
    if (nv && cur && nv !== cur && !document.getElementById('updbar')) { const b = document.createElement('button'); b.id = 'updbar'; b.textContent = `Version ${nv} is out: tap to load it`; b.addEventListener('click', () => { location.replace(location.pathname + '?v=' + encodeURIComponent(nv)); }); document.body.appendChild(b); } } catch (e) { /* offline */ } };
  setTimeout(check, 4000); setInterval(check, 10 * 60 * 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  // (5.7.5) the fonts loaded up front, so no text appears in a stand-in face and then changes
  if (document.fonts && document.fonts.load) for (const f of ['400 16px "Barlow Semi Condensed"', '500 16px "Barlow Semi Condensed"', '600 16px "Barlow Semi Condensed"', '700 16px "Barlow Semi Condensed"']) document.fonts.load(f).catch(() => {}); }
// (5.6.8) the settings coin (top right, on a phone): the pause menu, wherever he is (the cabin too), never closing it
window.addEventListener('actdown', (ev) => {
  if (ev.key !== 'settings') return; ev.stopImmediatePropagation();
  if (g.mode !== 'play' || g.paused) return;
  g.paused = true; ui.setPaused(true);
}, true);
// (6.5.7) the menu folds itself away after 10 s untouched (7.4.0): it is back with a tap on
// its tab. A tap anywhere along it, or any of its keys, counts as using it
let menuUsedAt = performance.now();
const MENU_KEYS = new Set(['menu', 'journal', 'j', 'b', 'c', 't', 'r', 'store', 'events']);
window.addEventListener('actdown', (ev) => { if (MENU_KEYS.has(ev.key)) menuUsedAt = performance.now(); }, true);
window.addEventListener('pointerdown', (ev) => { if (ev.clientX < innerWidth * 0.14) menuUsedAt = performance.now(); }, true);
// (7.4.26, owner) one press for everything on the screen that can be tapped, as the HUD's coins have: the thing sinks and
// lights a little, a soft ring of light runs out from under the finger, and the phone gives its small tick. On the
// screens that had no sound of their own (the new diver, its keyboard, the slots, the title) a soft click as well
const PRESSABLE = 'button, [data-act], [data-test], [data-store], [data-pet], [data-evday], [data-tab], [data-t], .jcell, .lk-tile, .sl-main, .ev-day, .st-card, .cr-sw, [role="button"]';
const QUIET_SCREENS = '#creator, #slots, #title, .cr-kb';
let pressLayer = null;
window.addEventListener('pointerdown', (ev) => {
  const b = ev.target && ev.target.closest && ev.target.closest(PRESSABLE); if (!b || b.disabled || b.closest('[hidden]') || b.closest('#hud, #game')) return;
  b.classList.remove('pfx'); void b.offsetWidth; b.classList.add('pfx'); clearTimeout(b.__pfxT); b.__pfxT = setTimeout(() => b.classList.remove('pfx'), 260);
  if (!pressLayer) { pressLayer = document.createElement('div'); pressLayer.id = 'pressfx'; document.body.appendChild(pressLayer); }
  const r = b.getBoundingClientRect(), d = Math.max(36, Math.min(120, Math.max(r.width, r.height) * 0.9)), ring = document.createElement('i');
  ring.style.left = ev.clientX + 'px'; ring.style.top = ev.clientY + 'px'; ring.style.setProperty('--d', d + 'px'); pressLayer.appendChild(ring); setTimeout(() => ring.remove(), 420);
  if (navigator.vibrate) try { navigator.vibrate(6); } catch (e) { /* not allowed yet */ }
  if (b.closest(QUIET_SCREENS)) { audio.resume && audio.resume(); audio.ready && audio.uiSoft && audio.uiSoft(); }
}, true);
// (7.6.0, owner) iOS makes no click from a tap while another finger is on the glass: with a thumb on the stick, the
// skip card's Skip (and every panel's buttons) did nothing until he stopped. A finger lifted from a button while another
// is still down presses it by hand (the tap's own click is then held back, so nothing is pressed twice)
window.addEventListener('touchend', (ev) => {
  if (!ev.touches || ev.touches.length === 0) return; const t = ev.changedTouches && ev.changedTouches[0]; if (!t) return;
  const under = document.elementFromPoint(t.clientX, t.clientY), b = under && under.closest && under.closest(PRESSABLE);
  if (!b || b.disabled || b.closest('[hidden]') || b.closest('#hud, #game')) return;
  const st = ev.target && ev.target.closest && ev.target.closest(PRESSABLE); if (st !== b) return; // ended on the button it began on
  ev.preventDefault(); b.click();
}, { capture: true, passive: false });
function menuFold(now) {
  if (!hud.menuOpen || !profile || g.mode !== 'play') { if (!hud.menuOpen) menuUsedAt = now; return; } // (7.4.0) in the tutorial too: a step about the menu holds it open by itself
  if (ui.anyOpen && ui.anyOpen()) { menuUsedAt = now; return; } // while a panel from it is open, the clock waits
  if (now - menuUsedAt > 10000) hud.menuOpen = false; // (7.4.0, owner) folded after 10 s untouched (was 30 s)
}
// (5.15.7) the menu's tab (under the money): folds the journal, the bag and the rest away, or opens them; remembered
window.addEventListener('actdown', (ev) => {
  if (ev.key !== 'menu') return; ev.stopImmediatePropagation();
  hud.menuOpen = !hud.menuShown; menuUsedAt = performance.now(); audio.ready && audio.click();
}, true);

// debug hooks for automated testing
window.__earl = { die: (c, k) => die(c, k), get g() { return g; }, get touch() { return touch; }, get profile() { return profile; }, set profile(p) { profile = p; }, newProfile, startRun, renderer, SPECIES_BY_ID, ui, step: (dt) => update(dt), keys, pressed, hud, leaveSub: () => leaveSub(), boardDeck: () => boardDeck() };

// leaving the page: whatever has changed is written to the slot at once
function saveNow() { if (!profile) return; if (g.mode === 'play') syncProfile(); saveProfile(profile); flushSave(); }
window.addEventListener('beforeunload', saveNow);
// (5.4) out of sight (the phone locked, another app): the sound stops working too, and starts again on coming back
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveNow();
  const ac = audio.ac; if (!ac) return;
  try { if (document.hidden) { if (ac.state === 'running') ac.suspend(); } else if (ac.state !== 'running' && ac.state !== 'closed' && !audio.muted) ac.resume(); } catch (e) { /* ignore */ }
});
ui.showTitle();
startLegendFx(); // (5.9.1) gold sparks round legendary things wherever they are shown
// (5.9.5) no "turn your phone" card and no pause when it is held upright: on a phone the page outside turns the game's frame
// (5.16.3) the page itself never scrolls: a touch on a panel could nudge it (the inventory slid up under its own
// tabs in a test), so any scroll is put straight back
window.addEventListener('scroll', () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); }, { passive: true });
document.addEventListener('scroll', () => { const se = document.scrollingElement; if (se && (se.scrollTop || se.scrollLeft)) { se.scrollTop = 0; se.scrollLeft = 0; } }, { passive: true, capture: true });
