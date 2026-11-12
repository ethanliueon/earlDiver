// Earl the Diver — game loop, state, interactions and UI glue.
import { clamp, lerp, dist, makeRng, formatTime } from './util.js';
import { markOf, SUB_MARKS, BOAT_U, BOAT_LADDER, BOAT_DOOR, deckLine } from './earl_draw.js';
import { generateWorld, RESOURCES, BOAT, BOAT_HOME, BOAT_MIN, BOAT_MAX, WORLD_W, CAVE, CANYON, WHALE_FALL, SEEP, TRENCH, boatDock } from './world.js';
import { SPECIES, SPECIES_BY_ID, TITLES } from './species.js';
import { Chart } from './chart.js';
import { Fauna, usualDepth } from './fauna.js';
import { Earl, Sub, updateEarl, diverDrainMult, subDrainMult, subLeak, SUB_LEVELS, SUB_SPEED, SUB_RISE, DIVE_SPEED } from './player.js';
import { Autopilot } from './autopilot.js';
import { activeTool, findCatch, useTool, updateCapture, updateSpecimens, bagSlots, tankSlots, loadKg, loadSpeed, loadAir, tankUsed, pressUsed, pressSlots, seal, chamberRating, fireSubNet, canFireSubNet, netsOf, netKinds, netTotal, NETS_SUB, updateSubNet, tankFits, BIG, tooBig } from './capture.js';
import { specimenValue, conditionName, rarityOf, canTakeLive } from './specimens.js';
import { VARIANTS, variantLabel, rollVariant, canBeRare, variantMult } from './variants.js';
import { SETTINGS } from './settings.js';
import { findTagTarget, findPhotoSubject, fireTag, updateDarts, takePhoto } from './survey.js';
import { prepareMonster } from './monster_draw.js';
import { setTrap, updateTraps, trapNear, emptyTrap, trapsFree, canSetHere, convertOldTraps, lostTraps } from './traps.js';
import { startArm, updateArm, findArmTarget } from './arm.js';
import { Q as questsOf, fillQuests, questEvent, questTick, claim as claimQuest, refreshBoard, refreshPrice, MAIN as QUEST_MAIN, readyCount as questsReady, learned, TUT_IDS, firstFishPart, tutorialOn } from './quests.js';
import { TutSpot, keyFor, clicks, INPUT } from './tutspot.js';
import { WING_BY_ID, aquariumOf, tickAquarium, displayRefusal, display, displayKey, zoneOf, tickGallery, gallerySale, isHappy, gallerySlots, GALLERY_STEPS } from './aquarium.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS, TRAPS, TRAP_ORDER } from './economy.js';
import { SUITS, suitOf, kit, worn } from './economy.js';
import { DAVE_FINDS, DAVE_RATE } from './dave.js';
import { STATION_COLLAR } from './station_draw.js';
import { oldStock, overTable, daysLeft } from './oldone.js';
import { CHESTS, oddsText } from './chests.js';
import { giveRolled } from './items.js';
import { SKILLS, RARITY } from './item_data.js';
import { pictureOf } from './catalog.js';
import { ITEMS, ownsItem, giveItem, putOn, takeOff, instOf, isOn, removeItem, sellValue, lockerFree, LOCKER, skillLv, hasLegend, setOn, totals } from './items.js';
import { pressureTolerance, LEGENDARY } from './specimens.js';
import { readSlot, setSlot, getSlot, lastSlot, flushSave, SLOTS, SUB_AIR } from './economy.js';
import { rollChest } from './chests.js';
import { hullCap } from './economy.js';
import { loadBest, UPGRADES, TRACKS, tlv, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat, coinsFor, upgradeCoins, WARES } from './economy.js';
import { TANKS, FINS, SUB_TIERS, SUB_ADDONS, SUPPLIES, supplyMax, GOODS, PATCH_PRICE, HOSPITAL_SHARE, HOSPITAL_CAP, replacementPrice, SUBS, rollCrush, crushMean, newProfile, loadProfile, saveProfile, clearProfile, marketTick, priceOf, sell, spend, money } from './economy.js';
import { updateHunters, directEncounters } from './hunters.js';
import { Entity, dreadFromDistance, LANTERN_RADIUS } from './entity.js';
import { Renderer, dayCycle } from './render.js';
import { Hud, titled } from './hud.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Beacon } from './alarm.js';
import { Messages } from './messages.js';

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const renderer = new Renderer(canvas);
const hud = new Hud(hudCanvas);
// (3.4.0) everything the game says goes to one message line, top centre, over the sea and every room and panel
const messages = new Messages();
hud.onShow = (text, kind) => messages.show(text, kind);
// the steady line: how the air is, while a panel is open and it is getting short
function airOver(g) {
  let el = document.getElementById('overair');
  if (!el) { el = document.createElement('div'); el.id = 'overair'; document.body.appendChild(el); }
  const e = g.earl, sub = g.sub;
  let txt = '';
  if (g.mode === 'play' && ui.anyOpen() && !g.aboard && !g.held) { // (4.18.0: not while the menu holds the sea still: the air is not going, and the gauge beside it says the same)
    const subAir = e.inSub && sub && sub.o2Max ? sub.o2 / sub.o2Max : 1, own = e.o2Max ? e.o2 / e.o2Max : 1;
    if (g.noAir) txt = 'Out of air — surface!';
    else if (e.inSub && subAir <= 0.001) txt = own < 0.5 ? `Cabin out of air · your tank: ${Math.ceil(e.o2)} s` : 'Cabin out of air: breathing from your tank';
    else if (e.inSub && subAir < 0.25) txt = `Sub air low: ${Math.round(subAir * 100)} %`;
    else if (!e.inSub && own < 0.35) txt = `${Math.ceil(e.o2)} s of air left`;
  }
  if (el.textContent !== txt) el.textContent = txt;
  el.classList.toggle('on', !!txt);
}
const audio = new Audio(); window.__earlAudio = audio; // (for testing)
const beacon = new Beacon(audio); beacon.say = (text, kind) => messages.show(text, kind); // (4.0.2) the alarms on the message line

const keys = new Set();
const PRY = new Set(['clam', 'mussel']);
const PRY_TIME = 1.5;
// how long each hold-F job takes, and how much calm a good deed gives
const HOLD_TIME = { clam: 1.5, mussel: 1.5, rock: 1.5, iron: 1.5, net: 12 };
const DEED_CALM = { net: 25, plant: 15, offer: 30 };
const PLANT_TIME = 8;
const pressed = new Set();
let fHeld = 0;
let fDown = 0;
let cHeld = 0, cDown = 0;

// what survives death: cash, upgrades, the journal, the market (see economy.js)
let profile = loadProfile();

// what his suit does: pressure, air, speed (see SUITS)
// what he has on (2.6.0): the tank's air, the fins (and a heavy tank's drag), the camera's card
function applyKit(e, P) {
  kit(P); applySuit(e, P);
  const was = e.o2Max || 0; e.o2Max = airMax(P); e.o2 = Math.min(e.o2Max, (e.o2 || 0) + Math.max(0, e.o2Max - was));
  e.finSpeed = statValue(P, 'swim'); e.sprintMul = statValue(P, 'sprint');
  e.tankQuiet = !!(worn(P, 'tank') || {}).quiet;
  // (2.8.0) skills, Legendary skills and set traits, all stacked across what he has on
  const T = totals(P), L = (k) => skillLv(P, k);
  e.pressRes = Math.max(0.4, 1 - 0.15 * L('resilience'));
  e.sprintAir = setOn(P, 'harbour') ? 1 : 2;
  e.featherK = Math.max(0, 1 - 0.2 * (L('feather') + ((worn(P, 'bag') || {}).feather || 0)));
  e.warmK = Math.max(0, 1 - 0.25 * L('warmth'));
  e.ambush = Math.min(0.8, 0.12 * L('ambush'));
  e.hardened = L('hardened'); e.mending = L('mending'); e.prospector = L('prospector');
  e.biolum = L('biolum'); e.glows = T.glows; e.trail = T.trail; e.trailKind = T.trailKind; e.legends = T.legends;
  const wf = worn(P, 'fins'), wt = worn(P, 'tank'), ws = worn(P, 'suit'); e.finLook = (wf && wf.finLook) || null; e.tankLook = (wt && wt.tankLook) || null; e.suitGlow = (ws && ws.suitGlow) || null; // (2.8.1) how his special gear looks on him
  e.kelpSet = setOn(P, 'kelp'); e.nightSet = setOn(P, 'night'); e.triesteSet = setOn(P, 'trieste'); e.challengerSet = setOn(P, 'challenger');
  if (g && owns(P, 'camera')) g.shots = Math.max(g.shots || 0, gear(P, 'cam').shots);
  if (g && g.toolSel && g.toolSel !== 'net' && g.toolSel !== 'trap' && g.toolSel !== 'none' && !owns(P, { slurp: 'slurp', tag: 'tagger', cam: 'camera' }[g.toolSel])) g.toolSel = 'net';
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
  sub.o2V = SUB_AIR[Math.min(SUB_AIR.length - 1, lv(P, 'depth'))]; // the cabin air comes with the submersible (4.18.0: this line had slipped into the comment above, so every hull had the first one's two minutes)
  sub.speedMul = statValue(P, 'subSpeed'); sub.ballast = statValue(P, 'ballast'); // (4.13.0) the engine alone sets her speed: 50 steps to 3x
  sub.level = lv(P, 'depth');
}
// (4.9.0) X (a developer's key): the first press, the deepest submersible and half a million dollars; each press
// after, the next legend turned loose at its usual depth somewhere sensible, with the tutorial's trail to it
let devPresses = 0, devLegendI = 0;
const DEV_LEGENDS = [100, 108, 104, 107, 101, 105, 54, 2150, 2146, 2162, 2110, 2109, 2102, 2103, 2106];
function devMaxAll() {
  const P = profile; if (!P || !g || g.mode !== 'play') return;
  if (devPresses++ === 0) {
    P.tlv = P.tlv || {}; P.tlv.tHull = TRACKS.tHull.max;
    P.cash = Math.round(((P.cash || 0) + 500000) * 100) / 100;
    saveProfile(P); applySub(g.sub, P);
    hud.toast('Developer: the deepest sub, +$500,000', 'big'); audio.ready && audio.click();
    return;
  }
  const sp = SPECIES_BY_ID[DEV_LEGENDS[devLegendI++ % DEV_LEGENDS.length]]; if (!sp) return;
  const e = g.earl, W = g.world, hab = sp.v && sp.v.hab, onFloor = hab === 'floor' || hab === 'demersal';
  const [uLo, uHi] = usualDepth(sp); // (4.16.4) where it is really met, as the sea's own spawning places it
  const want = clamp(Math.round((uLo + uHi) / 2), sp.dmin + 5, Math.min(sp.dmax, (g.sub.ratedV || 4000) - 50));
  // the nearest column of sea where it would live: deep enough water for a swimmer, a floor in its range for a bottom animal
  let at = null;
  for (let r = 30; r < WORLD_W && !at; r += 6) for (const x of [e.x + r * (e.facing || 1), e.x - r * (e.facing || 1)]) {
    if (x < 30 || x > WORLD_W - 30) continue;
    const fl = W.floorAt(x);
    if (onFloor ? (fl >= uLo && fl <= Math.min(uHi, (g.sub.ratedV || 4000) - 20)) : fl > want + 25) { // (bottom animals on a seabed within their usual depths)
      const y = onFloor ? fl - 0.6 : want;
      if (!W.rockAt(x, y, 1)) { at = { x, y }; break; }
    }
  }
  if (!at) { hud.toast(`Developer: nowhere for ${TITLES[sp.id] || sp.name}`); return; }
  const f = g.fauna.makeFish(sp, at.x, at.y, Math.random() < 0.5 ? 1 : -1, g.fauna.groupId++, true);
  f.devKeep = true; g.fauna.list.push(f); g.devGuide = { c: f };
  hud.toast(`Developer: a legend at ${Math.round(at.y)} m`); audio.ready && audio.click();
}
// the 'reduce flashing' setting (pause menu): kept in this browser
function readReduceFlash() { try { return localStorage.getItem('earl.reduceFlash') === '1'; } catch (e) { return false; } }
function newGame(mode) {
  audio.ready && audio.restore(1.2); // after a death by the thing below, the sound comes back
  const P = profile || newProfile();
  convertOldTraps(P); // old seabed traps become the new box traps
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
    items: { lure: P.items ? P.items.lure || 0 : 0, necklace: P.items ? P.items.necklace || 0 : 0, airTank: P.items && P.items.airTank !== undefined ? P.items.airTank : 0, sealant: P.items ? P.items.sealant || 0 : 0, plate: P.items ? P.items.plate || 0 : 0, tag: P.items ? P.items.tag || 0 : 0, tagAdv: P.items ? P.items.tagAdv || 0 : 0, net: P.items && P.items.net !== undefined ? P.items.net : null, nets: P.items && P.items.nets ? Object.assign({}, P.items.nets) : null }, inv: {}, // a new diver starts with one backup air tank
    journal: new Map(P.journal || []), notes: P.notes || '', sapphires: 0, earned: 0,
    lure: null, necklaceT: 0, protection: null, prompt: null,
    waveBoost: 0, dayEff: 1, day: dayCycle(0), diverDrain: 1, subDrain: 1,
    deathT: 0, deathDelay: 0, deathCause: null, paused: false, audio, reduceFlash: readReduceFlash(),
    imploded: false, lowO2Warned: false, lastSafe: 0, breathT: 2, farShadow: null,
    injury: 0, healT: 0, blood: [], deathKind: null, lampFlashT: -99, threat: null,
    autopilot: new Autopilot(), addons: P.addons || {}, anchored: true,
    bag: [], subTank: [], captureFx: [], capture: null, toolSel: 'net', capPrompt: null,
    darts: [], tags: [], photos: [], shots: owns(P, 'camera') ? gear(P, 'cam').shots : 0, camFlash: 0,
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
  if (P.subLost) { g.sub.imploded = true; g.sub.docked = false; }
  // pre-warm the ocean with life around the spawn
  const cam = { x: BOAT_HOME, y: 6, w: 46, h: 26 };
  for (let i = 0; i < 8; i++) g.fauna.trySpawn(cam, 0);
  for (const c of g.fauna.list) { c.x += (BOAT_HOME - c.x) * 0.6; }
  return g;
}

let g = newGame('menu');
// the title screen's music starts with the first key or click (browsers keep pages silent until then)
const wakeAudio = () => { audio.init(); audio.resume(); audio.playMusic(); window.removeEventListener('pointerdown', wakeAudio, true); window.removeEventListener('keydown', wakeAudio, true); };
window.addEventListener('pointerdown', wakeAudio, true); window.addEventListener('keydown', wakeAudio, true);
// the slot a fresh "Dive" goes into when none was chosen: the first empty one, else the last played
function firstFreeSlot() { for (let n = 1; n <= SLOTS; n++) if (readSlot(n).state === 'empty') return n; return lastSlot() || 1; }
const ui = new UI({
  onPlay: () => withLoading(() => startRun()),
  getGame: () => g,
  onQuit: () => die('Ended the dive', 'quit'),
  onBuy: (k) => guardBuy(costOf(k), () => buy(k)),
  onBuyNow: (k) => { guardBuy.ok = true; try { return buy(k); } finally { guardBuy.ok = false; ui.refreshOpen(); } }, // (4.16.4) already confirmed by its own prompt
  costOf: (k) => costOf(k),
  onOldBuy: (k) => guardBuy(k.startsWith('chest:') ? costOf(k) : costOf('old:' + k.slice(5)), () => oldBuy(k), () => ui.oldCard(null)),
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
    ui.showGains(its.map((it) => ({ kind: 'item', id: it.id }))); tipEquip(); // (4.6.0) the cards say it
    return true;
  },
  onSellAll: () => withKept(() => sellAll()),
  onSellSome: (keys) => withKept(() => sellSome(keys)),
  onKeep: (key, on) => keepMark(key, on),
  onGallery: (act, key, v) => galleryAction(act, key, v),
  aquariumCatch: () => aquariumCandidates(),
  onHints: () => { hud.hints = !hud.hints; },
  getHints: () => hud.hints,
  onMute: () => { audio.setMuted(!audio.muted); },
  getMuted: () => !!audio.muted,
  payMul: () => statValue(profile, 'payFish'),
  onStation: (id) => useStation(id),
  onFootstep: (v) => audio.ready && audio.footstep && audio.footstep(v),
  // (3.0.0) quests: claim one (cash, and on the main line sometimes a thing), or new quests on the board
  onQuestClaim: (which) => {
    const P = profile, tutWas = P.tut === 'on', r = claimQuest(P, which); if (!r) return false;
    const mNext = QUEST_MAIN[questsOf(P).main], lastTut = which === 'main' && tutWas && (!mNext || !TUT_IDS.has(mNext.id));
    if (lastTut) ui.closeQuestsAfterTutorial(); // (4.12.2) the last step: the board stays as it was, fades out, and the new quests come 3 s after
    else if (which === 'main' && tutWas) setTimeout(() => ui.toggleQuests(false), 250); // (4.3.5) the tutorial goes straight on to the next step
    if (r.pay) { P.cash = Math.round((P.cash + r.pay) * 100) / 100; P.lifetime = Math.round((P.lifetime + r.pay) * 100) / 100; }
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
    const cards = (r.gift && gift ? [{ kind: 'item', id: r.gift }] : []).concat((r.kit || []).map(([kind, id]) => ({ kind, id })));
    if (cards.length) ui.showGains(cards); // (4.6.0)
    hud.toast(`Quest done · ${money(r.pay)}`, 'big');
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
  onTank: (act, where, i, to) => { // (3.0.15) a refusal is said inside the tank room too (the toasts are under it)
    const n0 = hud.toasts.length, last0 = hud.toasts[n0 - 1];
    const r = tankAction(act, where, i, to);
    // a refusal that didn't say why: say what it was
    if (r === false && act !== 'swaps' && hud.toasts.length === n0 && hud.toasts[n0 - 1] === last0) hud.toast(act === 'press' ? 'The chambers are full' : act === 'tobag' ? 'The bag is full' : 'The tank is full', 'warn');
    return r;
  },
  onSetTrap: (type, depth) => {
    const why = canSetHere(g); if (why) { hud.toast(why, 'warn'); return true; }
    if (trapsFree(g, type) <= 0) { hud.toast('None of those left to set', 'warn'); return false; }
    const d = setTrap(g, type, depth); questEvent(profile, 'trap');
    hud.toast(`${TRAPS[type].name} set at ${d} m`); hud.hint(TRAPS[type].winch ? 'Come back in five minutes: winch it up from the Margaret at its buoy, or empty it down there' : 'Come back in five minutes: F at the buoy hauls it up, or empty it where it hangs');
    audio.ready && audio.click(); return true;
  },
  onCaveTrade: (keys) => caveTrade(keys),
  onNewGame: () => { profile = null; g.paused = false; withLoading(() => startRun()); },
  // the title screen: play a slot (a new diver in an empty or damaged one), or go back to the title
  onSlot: (n) => {
    withLoading(() => {
      const r = readSlot(n);
      setSlot(n);
      profile = r.state === 'ok' ? r.profile : null;
      startRun();
    });
  },
  onTitle: (save) => {
    if (save && profile && g.mode === 'play') { syncProfile(); saveProfile(profile); }
    flushSave();
    withLoading(() => { g = newGame('menu'); ui.showTitle(); });
  },
  getProfile: () => profile,
  onSaveProfile: () => saveProfile(profile),
  canChangeGear: () => !!(g && g.mode === 'play' && (g.aboard || g.earl.inSub || ui.cabinOpen())),
  onEquip: (k) => { const ok = buy(k); return ok; },
  canSellGear: () => !!(g && g.mode === 'play' && (g.aboard || ui.cabinOpen() || (g.sub.docked && g.earl.inSub) || nearDave() || nearStation())), // someone to sell to: the Margaret, the station, or Dave
});
// (4.10.0) the chart (K, or the chart button under the journal): the whole sea, and the player's own markers
ui.chart = new Chart({ getGame: () => g, getProfile: () => profile, save: () => saveProfile(profile),
  follow: (m) => { g.markGuide = m || null; if (m) hud.toast(`Following: ${m.name}`); }, following: () => g.markGuide || null });

// ---------------- injuries ----------------
// Hidden injury points. Each point heals 15 s after the last one; 5 at once is fatal.
const INJURY = {
  speed: [1, 1, 0.9, 0.8, 0.65],
  air: [1, 1, 1, 1.2, 1.35],
  names: ['', 'Grazed', 'Wounded', 'Badly hurt', 'Critical'],
};
function hurt(dmg, sp, how) {
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
function showOldCard(H) {
  const P = profile, st = oldStock(P), ROMAN = ['', 'I', 'II', 'III', 'IV'];
  if (H.kind === 'chest') {
    const C = CHESTS[H.key];
    ui.oldCard(`<div class="oc-t"><b>${C.name}</b><span>${C.line}</span><small class="ch-odds">${oddsText(C.odds)}</small></div><div class="oc-buy"><em>${money(C.price, false)}</em><button data-oc="chest:${H.key}" ${P.cash < C.price ? 'disabled' : ''}>Open it</button></div>`);
    return;
  }
  const it = st.items[H.i]; if (!it || it.sold) return;
  const def = ITEMS[it.id], sk = (it.sk || []).map(([k, l]) => `<div><b>${SKILLS[k].name}${SKILLS[k].flat ? '' : ' ' + ROMAN[l]}</b> ${SKILLS[k].what}</div>`).join('');
  ui.oldCard(`<div class="oc-top r-${def.rarity}"><img src="${pictureOf(def.kind, def, 240, 144, true)}" alt=""><div class="oc-t"><small class="rr">${RARITY[def.rarity].name}</small><b>${def.name}</b><span>${def.line || ''}</span>${def.good ? `<i>${def.good}</i>` : ''}<div class="oc-sk">${sk}</div></div></div>
    <div class="oc-buy"><small>${daysLeft(P) <= 1 ? 'She takes it all away soon.' : `She keeps these out another ${daysLeft(P)} days.`}</small><em>${money(it.price, false)}</em><button data-oc="item:${H.i}" ${P.cash < it.price ? 'disabled' : ''}>Take it</button></div>`);
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
function oldBuy(what) {
  const P = profile;
  if (what.startsWith('chest:')) return buy(what);
  const st = oldStock(P), it = st.items[+what.slice(5)];
  if (!it || it.sold) return false;
  if (lockerFree(P) <= 0) { hud.toast('Locker full', 'warn'); return false; }
  if (!spend(P, it.price)) return false;
  giveRolled(P, it); it.sold = true; saveProfile(P); audio.ready && audio.sale();
  ui.showGains([{ kind: 'item', id: it.id }]);
  return true;
}
function sellAll() {
  marketTick(profile);
  // old gold coins for every live animal from the deep that leaves the boat today
  let coins = 0;
  for (const L of [g.bag].concat(subAtBoat() ? [g.subTank] : [])) for (const s of L) coins += coinsFor(s);
  coins += g.inv.sapphire || 0;
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
    profile.photos = [...(profile.photos || []), ph.key];
  }
  g.photos = [];
  for (const [k, n] of Object.entries(g.inv)) {
    if (!n || !GOODS[k] || k === 'coral') continue;
    lines.push(sell(profile, k, n, GOODS[k].price * statValue(profile, 'paySalvage'), GOODS[k].name));
    g.inv[k] = 0;
  }
  if (coins) { profile.coins = (profile.coins || 0) + coins; lines.push({ label: 'Old gold, for what came up from the deep', n: 1, total: 0, coins }); }
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
const nearStation = () => { const St = g.world.station; return !!St && dist(g.earl.x, g.earl.y, St.x + STATION_COLLAR.dx + 1.5, St.y + STATION_COLLAR.dy) < 9; }; // (3.0.0)
const nearDave = () => { const D = g.world.dave; return !!D && dist(g.earl.x, g.earl.y, D.x + 6.5, D.y - 3.1) < 10; };
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
  if (k === 'oldlure') { if ((P.oldLures || 0) >= W.max) return false; P.oldLures = (P.oldLures || 0) + 1; hud.toast('Old lure (Q)', 'big'); }
  else if (k === 'blessing') { if (g.blessed) return false; g.blessed = true; hud.toast('Blessed: the deep looks away', 'big'); }
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
  if (!e.inSub) return false;
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
    if (g.bag.length >= bagSlots(g)) { hud.toast('The catch bag is full', 'warn'); return false; }
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
      const c = g.fauna.makeFish(SPECIES_BY_ID[s.id], g.sub.x + g.sub.facing * 3, g.sub.y + 1, g.sub.facing, g.fauna.groupId++, true);
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
    bagStress: (ev) => `The ${nm(ev.s)} feels the pressure`,
    bagDying: (ev) => `The ${nm(ev.s)} is dying of barotrauma`,
    stressed: (ev) => `The ${nm(ev.s)} is stressed`,
    dying: (ev) => ev.s.pile ? `The ${nm(ev.s)} is suffocating` : `The ${nm(ev.s)} is dying${ev.press ? ' of barotrauma' : ''}`,
  };
  const many = {
    air: (n) => `${n} animals are about to suffocate`,
    bagStress: (n) => `${n} animals feel the pressure`,
    bagDying: (n) => `${n} animals are dying of barotrauma`,
    stressed: (n) => `${n} animals are stressed`,
    dying: (n) => `${n} animals are dying`,
  };
  for (const type of ['air', 'bagDying', 'dying', 'bagStress', 'stressed']) {
    const L = by[type]; if (!L) continue;
    hud.toast(L.length === 1 ? one[type](L[0]) : many[type](L.length), 'warn');
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
  P.items = { lure: g.items.lure, necklace: g.items.necklace, airTank: g.items.airTank, nets: Object.assign({}, netsOf(g.items)), tag: g.items.tag, tagAdv: g.items.tagAdv };
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
// buy(kind): 'tank' | 'fins' | 'sub' | 'patch' | 'replace' | 'lure' | 'necklace'
function buy(kind) {
  const P = profile, sub = g.sub, e = g.earl;
  let ok = false;
  if (kind.startsWith('chest:')) {
    // (2.9.0) a chest: bought and opened at once, one item into the locker. Not with a full locker.
    const key = kind.slice(6), C = CHESTS[key];
    if (C && lockerFree(P) <= 0) hud.toast('Locker full', 'warn');
    else if (C && spend(P, C.price)) {
      const def = rollChest(key), q = def && giveItem(P, def.id);
      if (q) { q.paid = true; questEvent(P, 'bought'); ok = true; saveProfile(P); ui.showChest(key, q); audio.ready && audio.sale(); ui.showGains([{ kind: 'item', id: q.id }]); tipEquip(); } // (4.16.9) its card waits until the crate's reveal is closed
    }
    return ok;
  }
  if (kind.startsWith('item:')) {
    // (2.8.0) bought: into the locker, put on by hand in the inventory (B). Not if the locker is full.
    const it = ITEMS[kind.slice(5)];
    if (it && lockerFree(P) <= 0) hud.toast('Locker full', 'warn');
    else if (it && spend(P, it.price)) {
      const q = giveItem(P, it.id); if (q) q.paid = true; ok = true; questEvent(P, 'bought'); // (4.3.0)
      ui.showGains([{ kind: 'item', id: it.id }]); tipEquip();
      if (P.wish === it.id) P.wish = null;
    }
  } else if (kind.startsWith('off:')) {
    const r = takeOff(P, kind.slice(4)); // (3.0.31) back into the locker (a starter goes back on for the five that need one)
    if (r === 'full') hud.toast('Locker full', 'warn');
    else if (r) { applyKit(e, P); ok = true; }
  } else if (kind.startsWith('on:')) {
    // (2.8.0) on:<uid> puts on a thing from the locker
    const q = instOf(P, kind.slice(3));
    if (q && putOn(P, q.u)) { applyKit(e, P); ok = true; const key = { slurp: 2, tag: 3, cam: 4 }[ITEMS[q.id].kind]; if (key && g.toolSel !== ITEMS[q.id].kind) hud.hint(`Press ${key} for the ${ITEMS[q.id].name.toLowerCase()}`); }
  } else if (kind.startsWith('sellgear:')) {
    // (2.8.0) selling gear back, for about a third of what it is worth; never what he has on
    const q = instOf(P, kind.slice(9));
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
      if (has('camShots')) g.shots = gear(P, 'cam').shots;
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
      if (k === 'slurp') { g.toolSel = 'slurp'; hud.hint('Press 2 for the slurp gun'); }
      if (k === 'tagger') { g.toolSel = 'tag'; hud.hint('Press 3 for the tag gun; aim with the mouse, Space to fire'); }
      if (k === 'camera') { g.toolSel = 'cam'; g.shots = gear(P, 'cam').shots; hud.hint('Press 4 for the camera, Space to take a picture'); }
      if (k === 'arm') hud.hint('In the sub, Space reaches for an animal; Space again in the green closes the claw');
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
    ui.showGains([{ kind: 'trap', id: tk }]); hud.hint('Press 5, then Space at the surface to set a trap at the depth you choose');
  } else if (kind.startsWith('subnet:') && NETS_SUB[kind.slice(7)] && netsOf(g.items)[kind.slice(7)] < NETS_SUB[kind.slice(7)].cap && spend(P, NETS_SUB[kind.slice(7)].price)) {
    netsOf(g.items)[kind.slice(7)]++; ok = true; // (4.11.0) up to two beginner nets and one advanced
    ui.showGains([{ kind: 'trawl', id: kind.slice(7) }]);
  } else if (kind === 'gallery') {
    const lvG = P.galleryLv || 0;
    if (lvG < GALLERY_STEPS.length && spend(P, GALLERY_STEPS[lvG])) { P.galleryLv = lvG + 1; ok = true; hud.toast(`The aquarium: room for ${gallerySlots(P)}`, 'big'); audio.cue && audio.cue('wing'); }
  } else if (kind === 'canisters' && !(P.addons || {}).canisters && spend(P, CANISTERS.price)) {
    P.addons = Object.assign({}, P.addons, { canisters: true }); g.addons = P.addons; ok = true;
    hud.toast('Pressure canisters fitted', 'big');
  } else if (SUB_ADDONS[kind] && !(P.addons || {})[kind] && spend(P, SUB_ADDONS[kind].price)) {
    P.addons = Object.assign({}, P.addons, { [kind]: true }); g.addons = P.addons; ok = true;
    hud.toast(`Fitted: ${SUB_ADDONS[kind].name.toLowerCase()}`, 'big');
  } else if (SUPPLIES[kind] && (g.items[kind] || 0) < supplyMax(P, kind) && spend(P, SUPPLIES[kind].price)) {
    g.items[kind] = g.items[kind] || 0;
    g.items[kind]++; ok = true;
    ui.showGains([{ kind: 'supply', id: kind }]);
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
  setTimeout(() => { ui.setLoading(0.3, 'Charting the sea'); setTimeout(() => { fn(); ui.setLoading(0.6, 'Charting the sea'); g.warmFrom = performance.now(); g.warmUntil = g.warmFrom + 1500; }, 60); }, 60); // (4.15.0) a pause between steps lets the bar move
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
    if (!e.inSub && !g.aboard && e.y > 1.5 && !(keys.has('shift') || mouse.rdown)) g.noSprintT = (g.noSprintT || 0) + dt; else if (keys.has('shift') || mouse.rdown) g.noSprintT = 0;
    if (g.noSprintT > 60) { P.tipSprint = true; saveProfile(P); hud.toast(keyFor('sprint') === 'RMB' ? 'Hold the right mouse button to sprint' : 'Hold Shift to sprint', 'note'); }
  }
}
function tipEquip() { const P = profile; if (!P || P.tut === 'on' || P.tut === 'skip' || P.tipEquip) return; P.tipEquip = true; saveProfile(P); setTimeout(() => messages.show(`Press ${keyFor('inventory')} to put it on`, 'note', 3.5), 3000); } // (4.12.0) up for 3.5 s
// (4.7.0) the lessons after the tutorial, in the tutorial's own way: the sea is held still (the animals, the thing in
// the deep, the sub's air and hull, the catch's suffering all wait), only what the lesson teaches works, its line
// says what to do and its key-cap lights; a trail leads where to go.
//  - the trawl: the second time he is in the sub (with 10 m of water above her and 10 m below), a small school is
//    set out ahead; let the net out, drive through, close it, open the tank room, put the catch in water. A spare
//    net after.
//  - the air: the first time the cabin air is 10 s from running out, a backup tank is given; connect it (R). Another
//    is given after.
const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
function lessons() {
  const P = profile, e = g.earl, sub = g.sub; g.frozen = false;
  if (!P || g.mode !== 'play' || P.tut === 'on' || !P.tut || P.tut === 'skip' || g.kill || sub.imploded) { g.lesson = null; return; }
  const set = (text, spot, allow, to) => { g.tut = { text, to: to || null, spot, fish: null }; g.tutHidePrompts = true; g.lesson.allow = new Set(allow); g.frozen = true; };
  // starting a lesson
  if (!g.lesson && e.inSub && !sub.docked && !ui.anyOpen() && !g.alarm) {
    const floor = g.world.floorAt(sub.x);
    if (!P.lessonAir && sub.y > 2.2 && sub.o2 <= 10) {
      g.lesson = { kind: 'air' }; g.items.airTank = Math.min(2, (g.items.airTank || 0) + 1); ui.showGains([{ kind: 'supply', id: 'airTank' }]);
    } else if (!P.lessonTrawl && (P.subTimes || 0) >= 2 && sub.y >= 10 && floor - sub.y >= 10) {
      const dir = sub.facing || 1, cx = sub.x + dir * 6, cy = sub.y + 4; // (just ahead: the net trails some 10 m behind her)
      // (4.12.2) one moon jelly, drifting just ahead: one animal to catch, one to put in the tank
      const school = [lessonJelly(cx, cy, dir)];
      { const N = netsOf(g.items); if (!N.basic) N.basic = 1; } // (the lesson's net is a beginner's)
      g.lesson = { kind: 'trawl', part: 'drop', school };
    }
  }
  const L = g.lesson; if (!L) return;
  if (!e.inSub) { g.tut = null; return; } // out of the sub: the lesson waits for him (the sea runs on)
  if (L.kind === 'air') {
    if (sub.o2 >= sub.o2Max - 1) { g.lesson = null; P.lessonAir = 'done'; if ((g.items.airTank || 0) < 2) { g.items.airTank = (g.items.airTank || 0) + 1; ui.showGains([{ kind: 'supply', id: 'airTank' }]); } syncProfile(); saveProfile(P); hud.toast('Cabin air full. Here is a spare tank for next time', 'note'); return; }
    set(g.tankFit ? 'Connecting the tank…' : 'The cabin air is almost gone: connect a backup tank', g.tankFit ? null : { act: 'airtank', say: 'Connect a backup tank' }, ['r']);
    return;
  }
  // the trawl
  const n = g.subNet, alive = L.school.filter((f) => !f.dead), mid = alive.length ? { x: alive.reduce((a, f) => a + f.x, 0) / alive.length, y: alive.reduce((a, f) => a + f.y, 0) / alive.length } : null;
  if (L.part === 'drop' && n) L.part = 'tow';
  if (L.part === 'tow' && n && n.phase !== 'drop' && (n.phase !== 'tow' || n.got.length >= 1 || !alive.length)) L.part = n.phase === 'tow' ? 'close' : 'haul';
  if (L.part === 'close' && n && n.phase !== 'tow') L.part = 'haul';
  if (L.part === 'haul' && !g.subNet) {
    if (g.subTank.some((s) => s.pile)) L.part = 'tank';
    else { // nothing in it: the net back, a new school ahead, and again
      { const N = netsOf(g.items); N.basic = Math.max(1, N.basic); } const dir = sub.facing || 1; L.school = [lessonJelly(sub.x + dir * 6, sub.y + 4, dir)];
      L.part = 'drop'; hud.toast('Nothing in it. Try again: drive straight through the jellyfish', 'note');
    }
  }
  if (L.part === 'tank' && ui.tankOpen && ui.tankOpen()) L.part = 'drag';
  if (L.part === 'drag' && !g.subTank.some((s) => s.pile)) L.part = 'end';
  else if (L.part === 'drag' && !(ui.tankOpen && ui.tankOpen())) L.part = 'tank'; // (4.12.2) the tank room closed before the catch was in: back to opening it
  if (L.part === 'end') {
    g.lesson = null; P.lessonTrawl = 'done';
    if (!netTotal(g.items)) { netsOf(g.items).basic = 1; ui.showGains([{ kind: 'trawl', id: 'basic' }]); }
    syncProfile(); saveProfile(P); hud.toast('Lesson done. A spare trawl net is in the hatch', 'note'); return;
  }
  if (L.part === 'drop') set('Let out the trawl net', { act: 'trawl', say: 'Let out the net' }, ['n']);
  else if (L.part === 'tow') { set('Steer so the net passes over the jellyfish', null, MOVE_KEYS, mid); if (n && g.tut) g.tut.from = { x: n.mx, y: n.my }; } // (4.8.1) the trail from the net's mouth: it is the net that has to get there
  else if (L.part === 'close') set('Close the net', { act: 'trawl', say: 'Close the net' }, ['n'].concat(MOVE_KEYS));
  else if (L.part === 'haul') set('The net is coming in', null, MOVE_KEYS);
  else if (L.part === 'tank') set('Open the tank room to see your catch', { act: 'tank', say: 'Tank room' }, ['t']);
  else if (L.part === 'drag') set('Drag the jellyfish off the floor into the tank: out of the water, it dies', null, []);
}
// (4.12.2) the trawl lesson's one animal: a moon jelly drifting just ahead of the sub, held where it is
function lessonJelly(x, y, dir) {
  const sp = SPECIES_BY_ID[171] || SPECIES.find((q) => /Moon Jelly/.test(q.name));
  const f = g.fauna.makeFish(sp, x, y, -dir, g.fauna.groupId++, true); f.placed = true; f.lesson = true; f.devKeep = true; g.fauna.list.push(f); return f;
}
function tutorWelcome() {
  const P = profile; if (!P || P.tut) return;
  ui.confirm('Welcome to the tutorial', 'This will be quick: just a look around the game.', 'Start', 'Skip tutorial',
    () => { P.tut = 'on'; saveProfile(P); g.tutSaid = null; refreshAir(); },
    () => ui.confirm('Skip the tutorial?', 'Are you sure?', 'Skip it', 'Back', () => { P.tut = 'skip'; P.lessonAir = P.lessonTrawl = 'done'; P.tipEquip = P.tipSprint = true; saveProfile(P); }, () => tutorWelcome())); // (4.12.0) skipped: no lessons or tips after it either
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
function tutor() {
  const P = profile, e = g.earl; g.tut = null; g.tutForce = null; if (ui.cabin) ui.cabin.tutMark = null;
  // (4.4.0) during the tutorial the game's own prompts and the things they do are off (hud.js, cabin.js, the key
  // gate below): only the action the step asks for works, on the tutorial's own, larger button
  g.tutHidePrompts = !!P && g.mode === 'play' && tutorialOn(P); g.tutAction = null;
  if (!P || P.tut !== 'on' || g.mode !== 'play') return;
  const S = questsOf(P), m = QUEST_MAIN[S.main]; if (!m || !TUT_IDS.has(m.id)) { if (P.tut === 'on' && S.main > 0) { P.tut = 'done'; saveProfile(P); hud.toast('Tutorial done · the quest board is open (O)', 'big'); setTimeout(() => hud.toast(`If you need help: controls are in your journal (${keyFor('journal')}), settings in the pause menu (Esc)`, 'note'), 4500); } return; }
  const done = S.mainProg >= m.need, dir = Math.sign(Math.cos(BOAT.yaw || 0) || 1), click = clicks();
  const ladder = { x: BOAT.x + LADDER_M * dir, y: 1 }, nearBoat = Math.abs(e.x - BOAT.x) < 14 && e.y < 4;
  const inCabin = shown('cabin'), qOpen = shown('quests'), invOpen = shown('inventory'), catOpen = shown('catalog'), jOpen = shown('journal'), shopOpen = shown('workshop');
  const K = (act) => keyFor(act) || '';
  // (4.3.2) a prompt drawn beside the fish: { key, mouse, text, col }. The key (or a mouse) follows the input in use
  const netPrompt = () => (g.toolSel !== 'net' ? { key: K('net'), text: 'Take out your net' } : click ? { mouse: true, text: 'Swing your net' } : { key: K('use'), text: 'Swing your net' });
  let text = null, to = null, fish = null, prompt = null, spot = null, door = false, action = null;
  // (4.4.1) a hit area: on the moment he is in it, off only once he has been out of it for a moment, so a button
  // never blinks at the edge. offer(): the step's one action here, shown as the tutorial's button
  const Z = g.tutZones || (g.tutZones = {}), now = performance.now();
  const zone = (name, inside) => { if (inside) Z[name] = now; return now - (Z[name] || -1e9) < 400; };
  const offer = (id, say, key = 'F') => { action = { id, say, key }; spot = { key, say, button: id }; };
  const cabinTo = (id, act, say) => { ui.cabin.tutMark = id; if (zone('cabin-' + id, ui.cabin.near && ui.cabin.near() === id)) offer(act, say); else action = { id: act, say, key: 'F', cabinOnly: true }; };
  const ladderZone = () => zone('ladder', !e.inSub && !g.aboard && e.y < 2.6 && e.y > -0.6 && Math.abs(e.x - BOAT.x - LADDER_M) < 1.6);
  // the steps that need a fish: the fish to go to, and what to do at it
  const fishStep = (doWhat) => {
    const tf = tutorFish(dir), bd = dist(e.x, e.y, tf.x, tf.y); to = { x: tf.x, y: tf.y }; fish = tf;
    if (inCabin) { text = 'Leave the cabin: walk to the door'; cabinTo('door', 'outdoor', 'Out on deck'); return; } // (4.3.3) arrows to the door
    if (g.aboard) { text = `Walk off the ${tf.x < e.x ? 'left' : 'right'} end of the deck to jump in`; return; } // (4.18.0) the end on the fish's side: off the other one it is a long swim back under the hull
    if (e.inSub) { text = 'Leave the sub'; offer('leavesub', 'Leave the sub'); return; }
    if (!zone('fish', bd < 2.6)) {
      text = 'Swim to the orange fish';
      // (4.3.5) how to sprint, until he has: the right mouse button held, or Shift
      if (!P.tutSprinted) spot = { act: 'sprint', say: 'Hold to sprint (uses air faster)' }; // (4.3.9) the whole swim there
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
      text = 'Quest complete! Claim it in your quests';
      spot = { sel: ['#catalog .cat-off', '#workshop-close', '#inventory .inv-close', '#journal-close', '#quests-btn'] }; // (the Quests button shows in the cabin)
    }
    else { text = 'Quest complete! Open your quests and claim it'; spot = { sel: ['#quests-btn'], act: 'quests', say: 'Quest complete! Claim it here', light: true }; }
  } else if (m.id === 'firstfish') {
    // (4.3.4) one dive: down to the fish, observe it, catch it (the first swing misses, the next catches), back up.
    // The step is only done at the surface, so the claim is never made underwater.
    const part = firstFishPart(P);
    if (part === 3) { text = 'Nice catch! Now swim up to the surface'; to = { x: e.x + (e.facing || 1) * 2, y: 0.3 }; if (!P.tutSprinted && !e.inSub) spot = { act: 'sprint', say: 'Hold to sprint (uses air faster)' }; }
    else {
      g.tutForce = P.tutMissed ? 'catch' : 'miss';
      fishStep(() => {
        if (part <= 1) { text = 'Observe the fish'; offer('observe', 'Observe'); }
        else if (g.tutOops && g.time - g.tutOops < 3) { text = 'Oops, it got away! Try again'; prompt = { text: 'Oops, it got away! Try again', col: '#f2c7a0' }; }
        else { text = g.toolSel !== 'net' ? 'Take out your net' : 'Swing your net to catch it'; prompt = netPrompt(); }
      });
      if (text === 'Swim to the orange fish') text = 'Swim down to the orange fish under the boat';
    }
  } else if (m.id === 'sell') {
    if (!P.tutJournal) { text = 'Open your journal: every animal you observe goes in it'; spot = jOpen ? null : { act: 'journal', say: 'Open your journal' }; }
    else if (jOpen && (P.tutJTour || 0) < 3) { // (4.12.2) a short look round the journal before it is closed
      const k = P.tutJTour || 0;
      text = 'Your journal';
      spot = k === 0 ? { sel: ['#journal-list .entry img'], card: { id: 'jtour', text: 'Every animal you observe gets an entry. This is where you look at it: its picture, drawn from life.' } }
        : k === 1 ? { sel: ['#journal-list .entry .meta', '#journal-list .entry p'], card: { id: 'jtour', text: 'Under it: what it is, how big it grows, and the depths it lives at. Use it to work out where to find more.' } }
        : { sel: ['#notes'], card: { id: 'jtour', text: 'And this page is yours: write notes, plans or anything worth remembering. They are kept.' } };
    }
    else if (jOpen) { text = 'Close the journal'; spot = { sel: ['#journal-close'], act: 'journal', say: 'Close the journal' }; }
    else if (shopOpen) { text = 'Sell your catch'; spot = { sel: ['#workshop button[data-act="sellall"]:not([disabled])', '#workshop [data-sell="tobasket"]'], say: 'Sell all' }; }
    else if (!g.bag.length && !g.subTank.length) {
      // sold already, or lost it: another fish, then sell that one
      fishStep(() => { text = 'Your bag is empty: net another fish to sell'; prompt = netPrompt(); });
    }
    else if (inCabin) { text = 'Leave the cabin, then jump in beside the boat'; cabinTo('door', 'outdoor', 'Out on deck'); }
    else if (g.aboard) { text = 'Jump in beside the Margaret: you sell from the water'; to = ladder; }
    else if (!zone('boat', nearBoat)) { text = 'Bring your catch up beside the Margaret'; to = ladder; }
    else { text = 'Sell your catch'; offer('sell', 'Sell your catch', 'U'); }
  } else if (m.id === 'buy') {
    // the cheapest piece of gear he can afford at Bayside, to point at
    const pick = Object.values(ITEMS).filter((it) => it.shop === 'catalog' && it.price > 0 && it.price <= (P.cash || 0) && !ownsItem(P, it.id)).sort((a, b) => a.price - b.price)[0];
    if (!pick && !catOpen && !g.bag.length) {
      fishStep(() => { text = 'Not enough cash for gear yet: net another fish and sell it'; prompt = netPrompt(); });
    } else if (!pick && !catOpen) {
      if (g.aboard || !zone('boat', nearBoat)) { text = 'Not enough cash for gear yet: sell your catch first'; to = ladder; }
      else if (shopOpen) spot = { sel: ['#workshop button[data-act="sellall"]:not([disabled])'], say: 'Sell all' };
      else { text = 'Sell your catch first'; offer('sell', 'Sell your catch', 'U'); }
    } else if (catOpen) {
      const sel = ['#catalog button[data-buy^="item:"]:not([disabled])', '#catalog [data-cart="checkout"]:not([disabled])'];
      if (pick) sel.push(`#catalog .cat-main [data-go="item:${pick.id}"]`, `#catalog .cat-nav [data-go="${pick.kind}"]`);
      text = pick ? `Buy some gear: the ${pick.name.toLowerCase()} is ${money(pick.price, false)}` : 'Not enough cash yet: sell more catch first';
      spot = pick ? { sel, say: `Buy a piece of gear (the ${pick.name.toLowerCase()} is ${money(pick.price, false)})`, confirm: 'Confirm the purchase' } : null;
    }
    else if (inCabin) { text = 'Walk to the computer to shop'; cabinTo('desk', 'shop', 'Open the shop'); }
    else if (g.aboard) { text = 'Go into the cabin: the door by the wheelhouse'; to = { x: BOAT.x + DOOR_M * dir, y: -1.2 }; door = true; if (zone('door', deckAtDoor())) offer('cabin', 'Enter the cabin'); } // (4.3.5) the door itself lit up
    else { text = 'Climb aboard the Margaret at her ladder'; to = ladder; if (ladderZone()) offer('climb', 'Climb aboard'); }
  } else if (m.id === 'wear') {
    const Kit = P.kit || { items: [], on: {} }, worn = new Set(Object.values(Kit.on || {}));
    const it = Kit.items.find((q) => q.paid && !worn.has(q.u)), name = it ? 'the ' + ITEMS[it.id].name.toLowerCase() : 'what you bought';
    const canChange = !!(ui.h.canChangeGear && ui.h.canChangeGear()); // (4.3.6) gear is changed aboard (deck, cabin, sub); in the water it only shows
    if (!canChange) {
      // in the water: aboard first. If the inventory is up, its close button is the way out (nothing else works)
      text = 'Climb aboard the Margaret to change your gear'; to = ladder;
      spot = invOpen ? { sel: ['#inventory .inv-close'], act: 'inventory' } : null;
      if (!invOpen && ladderZone()) offer('climb', 'Climb aboard');
    }
    else if (invOpen) { text = `Put on ${name}`; spot = { sel: it ? [`#inventory [data-lk="on:${it.u}"]`, `#inventory .item-pop .ip-close`, `#inventory .lk-tile[data-u="${it.u}"]`, '#inventory [data-invtab="gear"]:not(.on)'] : [], say: `Click ${name}, then Put it on` }; }
    else { text = 'Open your inventory and put on what you bought'; spot = { act: 'inventory', say: 'Open your inventory' }; }
  }
  g.tut = { text, to, fish, prompt, spot, door };
  // (4.3.8) the instruction has its own line at the left (tutspot.js), so the game's own messages at the top are
  // never held back by it. None while the quests are open: the arrow at Claim is enough.
  if (ui.anyOpen('cabin')) g.tut.text = null; // (4.4.1) nor over any open screen (the journal, the shop, ...): its arrow says it
  g.tutAction = action;
}
const tutSpot = new TutSpot();
tutSpot.onAction = (id) => runTutAction(id); // (4.4.1) the button
tutSpot.onCard = (id) => { if (id === 'jtour' && profile) { profile.tutJTour = (profile.tutJTour || 0) + 1; saveProfile(profile); audio.ready && audio.click(); } }; // (4.12.2)
function startRun() {
  mouse.movedAt = -1e9; keyMoveAt = performance.now(); // (3.0.0) he stands still at the start until the mouse moves or a key is pressed
  audio.init(); audio.resume(); audio.playMusic();
  if (!getSlot()) setSlot(firstFreeSlot());
  const fresh = !profile || !(profile.runs > 0); // (3.0.5) the first dive of a new game
  // (3.0.11) the music plays only in the first sitting of a brand-new game: from its first dive until the page is
  // closed (deaths included); a save loaded in a later sitting, or another save, gets none; nor does the title before it
  audio.musicAllowed = true; // (3.0.24) music in every sitting again, by its own rules (audio.js pickTrack); a new game's first dive opens with the melodic theme
  audio.cue && audio.cue(fresh ? 'firstDive' : 'start'); // (2.9.2) a new dive, or back after a death
  if (!profile) { profile = newProfile(); saveProfile(profile); }
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
const TUT_ALWAYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', '1', 'j', 'o', 'b', 'escape', 'm', 'tab', 'control', 'alt', 'meta']);
function tutGated(k) { if (g && g.lesson && g.frozen) return !(g.lesson.allow || new Set()).has(k) && !['escape', 'm'].includes(k); return !!(g && g.mode === 'play' && g.tutHidePrompts && !TUT_ALWAYS.has(k)); } // (4.7.0) a lesson lets through only what it teaches
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
window.addEventListener('keydown', (ev) => {
  if (ui.typing()) { if (ev.key === 'Escape') ui.blurTyping(); return; }
  // (4.3.2) moving with the keys: the hints are for the keyboard until the mouse is used again
  if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright)$/i.test(ev.key)) INPUT.mode = 'keys';
  if (ui.confirmOpen && ui.confirmOpen()) return; // an "are you sure?" is up: its own buttons only
  const k = ev.key.toLowerCase();
  if (g && g.tutHidePrompts && g.tutAction && k === g.tutAction.key.toLowerCase() && !ev.repeat) { ev.preventDefault(); runTutAction(g.tutAction.id); return; } // (4.4.1)
  if (tutGated(k)) return; // (4.4.0)
  if (g.mode === 'menu' && (k === 'enter' || k === ' ')) {
    ev.preventDefault();
    if (ui.titleOpen()) { const n = lastSlot(); ui.h.onSlot(n && readSlot(n).state === 'ok' ? n : firstFreeSlot()); }
    else startRun();
    return;
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) ev.preventDefault();
  if (!keys.has(k)) { pressed.add(k); if (k === 'f') fDown = performance.now(); if (k === 'c') { cDown = performance.now(); cHeld = 0; } }
  keys.add(k);
  audio.resume();
});
window.addEventListener('keyup', (ev) => {
  const k = ev.key.toLowerCase();
  keys.delete(k);
  if (tutGated(k)) return; // (4.4.0) no F-tap from a key the tutorial has off
  if (k === 'f') { if (performance.now() - fDown < 600) pressed.add('f-tap'); fHeld = 0; }
  if (k === 'c') { if (performance.now() - cDown < 600) pressed.add('c-tap'); cHeld = 0; }
});
window.addEventListener('blur', () => { keys.clear(); mouse.rdown = false; mouse.down = false; });
// ---------------- mouse ----------------
// Earl swims toward the cursor by himself (once the mouse has moved, and until the keys take over)
// left click: swing the net (or use the tool in hand; in the sub, the arm) · right button held: sprint
// the lamp follows the cursor · wheel: zoom · click the Q/E slots to use an item
const mouse = { x: 0, y: 0, down: false, movedAt: -1e9, seen: false, inside: false };
let keyMoveAt = -1e9; // when the movement keys were last used
const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
hudCanvas.addEventListener('mousemove', (ev) => {
  // a real move, not the browser repeating the last position
  if (Math.abs(ev.clientX - mouse.x) + Math.abs(ev.clientY - mouse.y) > 1) mouse.movedAt = performance.now();
  if (mouse.seen && Math.abs(ev.clientX - mouse.x) + Math.abs(ev.clientY - mouse.y) > 3) INPUT.mode = 'mouse'; // (4.3.2) the hints follow the input in use
  mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.seen = true; mouse.inside = true;
});
hudCanvas.addEventListener('mouseleave', () => { mouse.inside = false; });
hudCanvas.addEventListener('mouseenter', () => { mouse.inside = true; });
hudCanvas.addEventListener('mousedown', (ev) => {
  audio.resume(); INPUT.mode = 'mouse'; // (4.3.2)
  if (g.mode !== 'play') return;
  if (ev.button === 2) { mouse.rdown = true; return; } // held: sprint
  if (ev.button !== 0) return;
  if (inRect(hud.journalHot, ev.clientX, ev.clientY)) { ui.toggleJournal(); return; }
  if (inRect(hud.chartHot, ev.clientX, ev.clientY)) { ui.closeAll(); ui.chart.toggle(true); return; }
  if (inRect(hud.subHot, ev.clientX, ev.clientY)) { pressed.add('c-tap'); return; }
  if (inRect(hud.slotHot && hud.slotHot.q, ev.clientX, ev.clientY)) { pressed.add('q'); return; }
  if (inRect(hud.slotHot && hud.slotHot.e, ev.clientX, ev.clientY)) { pressed.add('e'); return; }
  if (inRect(hud.slotHot && hud.slotHot.r, ev.clientX, ev.clientY)) { pressed.add('r'); return; }
  if (inRect(hud.slotHot && hud.slotHot.k, ev.clientX, ev.clientY)) { pressed.add('k'); return; }
  if (g.homeRun) return; // on autopilot a click does nothing (only the buttons above)
  mouse.down = true;
  pressed.add(' '); // a click swings the net (or uses whatever is in hand)
});
window.addEventListener('mouseup', (ev) => { if (ev.button === 0) mouse.down = false; if (ev.button === 2) mouse.rdown = false; });
hudCanvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
hudCanvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  renderer.zoomMul = clamp((renderer.zoomMul || 1) * (ev.deltaY > 0 ? 1.08 : 1 / 1.08), 0.7, 1.45);
}, { passive: false });
// the cursor in screen pixels of the scene canvas
function mouseScreen() { const k = canvas.width / window.innerWidth; return [mouse.x * k, mouse.y * k]; }

// (4.12.3) a long piece of work in progress, held down
function holdingWork() { return !!(g && (g.pry || g.repair || (g.plant || 0) > 0 || (g.tankFit || 0) > 0)); }
// while it lasts the pointer is weighted: the system cursor hides and a brass ring follows it a little behind
function weightedCursor(dt) {
  const on = holdingWork() && mouse.seen && INPUT.mode === 'mouse';
  if (on) { if (!g.holdCursor) g.holdCursor = { x: mouse.x, y: mouse.y }; const k = 1 - Math.exp(-dt * 7); g.holdCursor.x += (mouse.x - g.holdCursor.x) * k; g.holdCursor.y += (mouse.y - g.holdCursor.y) * k; }
  else g.holdCursor = null;
  const want = on ? 'none' : ''; if (hudCanvas.style.cursor !== want) hudCanvas.style.cursor = want;
}
function readMove() {
  if (g && g.held) return { x: 0, y: 0, sprint: false }; // (4.18.0) a menu is up under water: he waits
  if (g.kill) return { x: 0, y: 0, sprint: false }; // in its grip, nothing he does moves him
  if (ui.tankOpen && ui.tankOpen()) return { x: 0, y: 0, sprint: false }; // in the back of the sub, the helm is left alone
  if (ui.trapSetOpen && ui.trapSetOpen()) return { x: 0, y: 0, sprint: false }; // treading water while he chooses the depth
  if (holdingWork()) return { x: 0, y: 0, sprint: false }; // (4.12.3) a long hold (welding, cutting a net free, prying, planting, fitting a tank): he stays put
  if (g.homeRun) return { x: 0, y: 0, sprint: false }; // on autopilot the keys and the mouse leave the helm alone (C hands it back)
  let x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  let y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const now = performance.now();
  if (x || y) keyMoveAt = now;
  // the mouse steers when it has been moved since the keys were last used, and is over the game
  if (!x && !y && mouse.seen && mouse.inside && mouse.movedAt > keyMoveAt && renderer.S && !ui.anyOpen()) {
    // swim toward the cursor; full speed beyond a few metres, easing in, and still when he is there
    const e = g.earl, [mx, my] = mouseScreen();
    const dx = mx - renderer.S(e.x), dy = my - renderer.Sy(e.y), d = Math.hypot(dx, dy);
    // (4.0.0) a wider dead zone, longer in front and behind than above and below: the cursor resting just
    // ahead of him or just behind him leaves him still
    const ppm = renderer.cam.ppm, full = ppm * 3, dx0 = ppm * (e.inSub ? 3.6 : 1.4), dy0 = ppm * (e.inSub ? 2.4 : 0.8);
    const dn = Math.hypot(dx / dx0, dy / dy0);
    if (g.aboard) { const ax = Math.abs(dx), dead = ppm * 1.1; if (ax > dead) x = Math.sign(dx) * Math.min(1, (ax - dead) / full); } // (2.6.7) on the boat: left and right only
    else if (dn > 1) { const out = d * (1 - 1 / dn), k = Math.min(1, out / full) / d; x = Math.abs(dx) < ppm * 0.4 ? 0 : dx * k; y = dy * k; } // (2.6.8) nearly straight above or below him: straight up or down, no flicker of sideways
  }
  // (2.6.7) standing on the boat (the deck, the cabin, the wheel, the ladder): up and down mean nothing,
  // from the keys, the arrows or the mouse, so nothing upward or downward ever reaches the walking
  if (g.aboard) y = 0;
  const sprint = keys.has('shift') || !!mouse.rdown;
  // (4.3.9) the sprint hint goes once he has sprinted for about a second while it was showing (a tap doesn't count)
  if (sprint && (x || y) && profile && profile.tut === 'on' && !profile.tutSprinted && g.tut && g.tut.spot && g.tut.spot.act === 'sprint') {
    const tNow = performance.now(); g.tutSprintT = (g.tutSprintT || 0) + Math.min(0.1, (tNow - (g.tutSprintAt || tNow)) / 1000); g.tutSprintAt = tNow;
    if (g.tutSprintT > 1) { profile.tutSprinted = true; saveProfile(profile); }
  } else g.tutSprintAt = 0;
  return { x, y, sprint };
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
const GLOW_SECONDS = 90;
function anchorTime(d) { return d <= 200 ? 3 + 4 * (d / 200) : 7 + 5 * Math.min(1, (d - 200) / 2800); }
function deckInput(dt, mv) {
  const e = g.earl;
  if (!g.aboard) {
    if (nearLadder()) {
      g.prompt = 'F  Climb aboard';
      if (pressed.has('f-tap')) { pressed.delete('f-tap'); boardDeck(); }
    }
    return;
  }
  if (g.helm) { g.prompt = 'A / D  steer   ·   G  anchor   ·   W  leave the wheel'; return; }
  const A = g.aboard;
  if (A.climb > 0 || A.jump > 0) { g.prompt = null; pressed.delete('f-tap'); return; }
  const walk = ui.anyOpen() ? 0 : Math.sign(mv.x || 0), run = walk && (keys.has('shift') || mv.sprint), pace = run ? RUN : WALK;
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
  const atDoor = A.x > (DECK_MIN + DECK_MAX) / 2 - (DECK_MAX - DECK_MIN) / 6 && A.x < DOOR_M + 0.7; // (4.2.1) one zone: from the middle third of the deck to just past the door
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

// an offering to the deep only means something when it is hunting him, and near (within 1,000 m)
function canOffer() {
  const e = g.earl, ent = g.entity;
  return !e.inSub && e.y > 100 && (g.items.lure > 0 || g.items.necklace > 0) && ent && ent.marked && (ent.dist ?? Infinity) < 1000;
}
function promptFor(t) {
  g.promptName = null; g.promptBar = null; // (4.5.0) a hold in progress: a small bar under the words, not a counting percentage
  const e = g.earl;
  const nearBoat = Math.abs(e.x - BOAT.x) < 14 && e.y < 4;
  let p = null;
  if (t) {
    if (t.kind === 'pickup') {
      const name = t.p.type === 'lure' ? 'anglerfish lure' : t.p.type === 'necklace' ? 'glow stick' : t.p.type === 'sapphire' ? 'deep sapphire' : (RESOURCES[t.p.type] ? RESOURCES[t.p.type].name.toLowerCase() : t.p.type);
      if (t.p.type === 'net') p = g.pry && g.pry.p === t.p ? (g.promptBar = g.pry.t / HOLD_TIME.net, 'Cutting the net free') : `Hold F  Cut the ${t.p.animal} free`;
      else p = PRY.has(t.p.type) ? (g.pry && g.pry.p === t.p ? (g.promptBar = g.pry.t / PRY_TIME, 'Prying loose') : `Hold F  Pry loose the ${name}`) : `F  Collect ${name}`;
    } else if (t.kind === 'board') {
      p = 'F  Board the submersible';
    }
    else if (t.kind === 'trap') p = t.how === 'haul' ? `F  ${TRAPS[t.t.type].winch ? 'Winch' : 'Haul'} up the ${TRAPS[t.t.type].name.toLowerCase()} (${t.t.catch.length} inside, ${t.t.depth} m down)`
      : t.how === 'needboat' ? `The ${TRAPS[t.t.type].name.toLowerCase()} is too heavy to haul by hand: bring the Margaret here (V) and use her winch`
      : `F  Empty the ${TRAPS[t.t.type].name.toLowerCase()} (${t.t.catch.length} inside)`;
    else if (t.kind === 'kelp') p = 'F  Cut a kelp blade';
    else if (t.kind === 'creature' && t.c && t.c.pet) p = `${t.c.pet.name || 'Your ' + t.sp.name.toLowerCase()}${t.c.pet.famous ? ' ★' : ''} · released here, from your aquarium`;
    else if (t.kind === 'creature') { p = g.journal.has(t.sp.id) ? `${t.sp.name}` : 'F  Observe'; if (g.journal.has(t.sp.id)) { const R = rarityOf(t.sp); g.promptName = { text: t.sp.name, col: R ? R.col : null, legend: !!(R && R.id === 'legendary') || LEGENDARY.has(t.sp.id) }; } } // (4.12.0) its name in its rarity's colour
  }
  { const pi = !e.inSub && !g.sub.imploded ? patchNear() : -1; // a damaged patch within reach: hold R
    if (pi >= 0) p = g.repair && g.repair.i === pi ? (g.promptBar = g.repair.t / REPAIR_TIME, 'Repairing') : (p ? p + '   ·   ' : '') + 'Hold R  Repair';
    else if (!e.inSub && !g.sub.imploded && (g.sub.patches || []).length && dist(e.x, e.y, g.sub.x, g.sub.y) < 9) p = (p ? p + '   ·   ' : '') + 'The sub needs repairs: swim to a hole'; }
  if (canPlant(t)) p = g.plant ? (g.promptBar = g.plant / PLANT_TIME, 'Planting coral') : 'Hold F  Plant a coral fragment';
  if (canOffer() && (g.offerT || 0) < 10) p = (p ? p + '   ·   ' : '') + 'G  Offer something back to the deep'; // offered for 10 s, then left unsaid
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
  const ent = g.entity, was = ent.marked;
  ent.appease(g, calm);
  hud.toast(text, 'note');
  audio.ready && audio.note();
}
function interact(t, exitSub) {
  const e = g.earl, sub = g.sub;
  if (exitSub && e.inSub) return leaveSub();
  if (!t) { if (e.inSub) leaveSub(); return; }
  if (t.kind === 'trap') {
    if (t.how === 'haul') { t.t.state = 'hauling'; hud.toast(TRAPS[t.t.type].winch ? 'Winching up the trap' : 'Hauling up the trap'); audio.ready && audio.click(); }
    else if (t.how === 'needboat') hud.toast('Too heavy: winch it from the Margaret', 'warn');
    else { const n = emptyTrap(g, t.t); hud.toast(n ? `${n} into the bag${t.t.catch.length ? ' · bag full' : ''}` : t.t.catch.length ? 'Bag full' : 'The trap is empty'); }
    return;
  }
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
    if (p.y > 200) g.entity.disturb(g, p.type === 'necklace' ? 0.3 : p.type === 'lure' ? 0.2 : p.type === 'sapphire' ? 0.25 : 0.04);
    if (p.type === 'lure' || p.type === 'necklace') {
      if (g.items[p.type] >= 1) { hud.toast(p.type === 'lure' ? 'You already carry a lure' : 'You already carry a glow stick', 'warn'); return; }
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
      hud.toast(`${t.sp.name} — ${t.sp.sci}`, 'note');
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
  e.x = sub.x - sub.facing * 1.5; e.y = Math.max(0.4, sub.y + 2.6); e.vx = 0; e.vy = 0;
  // (2.5.0: leaving the sub no longer puts it in her cradle: it docks when the Margaret gets under way)
  if (e.y > (e.pressStart || 300)) { hud.toast('Outside, the pressure is immense.', 'warn'); g.pressWarned = true; } // (3.0.0) back; (3.0.17) from the suit's own limit

  audio.ready && audio.click();
}

// ---------------- taken: the jaws ----------------
// The strike reaches him and everything goes silent. It comes in from the side of the screen with its
// mouth already opening, the lower jaw dropping and the sack ballooning; he is in the open mouth (the
// water shows through it, and him in it), and it shuts. In the sub there is nothing to be done: that is
// the third approach. Swimming, there is one last moment as the jaws open: flash the lamp (once: it
// learns), throw a lure or wear the necklace.
const KILL_LUNGE = 0.95, KILL_CLOSE = 0.16, KILL_WINDOW = 0.7;
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
  g.kill = { t: 0, inSub, s, esc: false, escT: 0, open: 0, x0, y0, x1, y1, dx, dy, rot, flip, window: inSub ? null : [0, KILL_WINDOW] };
  ui.closeAll && ui.closeAll();
  audio.ready && audio.drop();
  g.fx.shake = Math.max(g.fx.shake, 1.2);
}
function killUpdate(dt) {
  const K = g.kill, e = g.earl, ent = g.entity, T = K.inSub ? g.sub : e;
  K.t += dt;
  e.vx = e.vy = 0; if (K.inSub) g.sub.vx = g.sub.vy = 0;
  ent.dist = Math.hypot(ent.x - e.x, ent.y - e.y);
  if (K.esc) {
    K.escT += dt;
    // it veers off the way it came
    ent.x += K.dx * dt * 20; ent.y += K.dy * dt * 20; K.open = Math.max(0, K.open - dt * 3);
    if (K.escT > 0.6) { g.kill = null; ent.faceLock = null; }
    for (const k of ['l', 'q', 'e']) pressed.delete(k);
    return;
  }
  // the moment to get free (swimming only)
  if (K.window && K.t > K.window[0] && K.t < K.window[1]) {
    let how = null;
    if (pressed.has('l')) { if (!ent.flashed) { how = 'flash'; ent.flashed = true; } else hud.toast('It no longer flinches from the light', 'warn'); }
    if (!how && pressed.has('q') && ((profile.oldLures || 0) > 0 || g.items.lure > 0)) { if ((profile.oldLures || 0) > 0) profile.oldLures--; else g.items.lure--; how = 'lure'; }
    if (how) { escapeKill(how); for (const k of ['l', 'q', 'e']) pressed.delete(k); return; }
  }
  for (const k of ['l', 'q', 'e']) pressed.delete(k);
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
  if (how === 'lure') { const dir = -K.s; g.lure = { x: e.x + dir * 2, y: e.y, vx: dir * 15, vy: -1, old: false }; ent.throwLure(g.lure.x, g.lure.y, 10); }
  // it lets go, but not before it has done its damage (never enough, on its own, to kill)
  if (K.inSub) {
    g.sub.hull = Math.max(0, g.sub.hull - 0.35); audio.ready && audio.ram();
    hud.toast(`${how === 'flash' ? 'The light burns it' : how === 'lure' ? 'It goes for the lure' : 'The necklace burns it'}: it lets go · hull ${Math.round(g.sub.hull * 100)} %`, 'warn');
  } else {
    g.injury = Math.min(4, g.injury + 2); g.healT = 0; g.fx.redFlash = 1; // its teeth caught him as it turned
    for (let i = 0; i < 30; i++) g.blood.push({ x: e.x + (Math.random() - 0.5) * 0.8, y: e.y + (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: 0.3 + Math.random() * 0.5, t: 0, life: 6 });
    hud.toast(`${how === 'flash' ? 'The light burns it' : how === 'lure' ? 'It goes for the lure' : 'The necklace burns it'}: it turns away, but bit you`, 'warn');
  }
  g.fx.shake = Math.max(g.fx.shake, 2);
  ent.hunt = null;
  if (how !== 'lure') ent.goAway(e.x, e.y, ent.band(g)[0]);
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
  if (n > (g.patchCount || 0) && !sub.imploded) { if (!g.repairHinted) { g.repairHinted = true; hud.hint('Swim to a hole in the sub\'s hull and hold R to repair it'); } }
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

function die(cause, kind = 'normal') {
  if (g.mode !== 'play' || g.noDeath) return;
  if (profile) profile.resume = null; // (4.12.6) a death ends the dive: the next one starts at the boat
  g.mode = 'dying'; g.deathT = 0; g.deathCause = cause; g.deathKind = kind;
  ui.closeAll();
  // what death costs: everything unsold, a hospital bill, and (if it took him) what he carried for it
  const lost = Object.entries(g.inv).filter(([k, n]) => n > 0 && GOODS[k]).map(([k, n]) => `${n} ${GOODS[k].name.toLowerCase()}`);
  const nSpec = g.bag.length + g.subTank.length;
  if (nSpec) lost.unshift(`${nSpec} live specimen${nSpec > 1 ? 's' : ''}`);
  if (kind === 'implode') lost.unshift('the submersible');
  if (g.tags.length) lost.push(`data from ${g.tags.length} tag${g.tags.length > 1 ? 's' : ''}`);
  if (g.photos.length) lost.push(`${g.photos.length} photograph${g.photos.length > 1 ? 's' : ''}`);
  g.tags = []; g.photos = [];
  const inTraps = lostTraps(g);
  if (inTraps) lost.push(`${inTraps} animal${inTraps > 1 ? 's' : ''} in the traps`);
  g.bag = []; g.subTank = [];
  const taken = cause.startsWith('Taken');
  if (taken) { const n = g.items.lure + g.items.necklace; if (n) lost.push(`${n} lure${n > 1 ? 's' : ''} and necklace${n > 1 ? 's' : ''}`); g.items.lure = g.items.necklace = 0; }
  const bill = kind === 'quit' ? 0 : Math.min(HOSPITAL_CAP, Math.round(profile.cash * HOSPITAL_SHARE * 100) / 100); // capped: late in the game 10 % would be ruinous
  g.inv = {};
  syncProfile();
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
    case 'entity': return `Taken at ${d} m`;
    case 'o2': return g.imploded ? `The submersible imploded at ${Math.round(g.implodeDepth)} m` : d > (g.earl.pressStart || 300) ? `Ran out of air under pressure at ${d} m` : `Ran out of air at ${d} m`;
    case 'sub-o2': return `Ran out of air in the submersible at ${d} m`;
    default: return kind;
  }
}

// ---------------- update ----------------
function update(dt) {
  g.time += dt;
  g.day = dayCycle(g.time);
  const e = g.earl, ent = g.entity, W = g.world;

  if (g.mode === 'menu') {
    g.dayEff = g.day.light; g.fx.dread = 0;
    e.x = BOAT.x - 12; e.y = 8;
    g.fauna.surfY = g.surfY;
  g.fauna.update(dt, renderer.cam, { x: -999, y: -999, speedNow: 0 }, null, 0, g.time);
    updateBubbles(dt);
    return;
  }
  if (g.paused) return;

  if (g.mode === 'play') {
    g.survival += dt;
    if (g.kill) killUpdate(dt);
    // input
    const mv = readMove();
    if (keys.has('f')) {
      fHeld += dt;
      if (e.inSub && fHeld > 0.6 && fHeld - dt <= 0.6) interact(null, true);
    }
    const target = findTarget();
    g.offerT = canOffer() ? (g.offerT || 0) + dt : 0; // how long the offering has been on offer
    g.prompt = promptFor(target);
    const atAngler = nearAngler(), atDave = !atAngler && nearDave(), atStation = !atAngler && !atDave && nearStation();
    if (atStation) {
      g.prompt = 'F  Station stores' + (e.inSub ? '   ·   hold F  Leave sub' : '');
      if (!profile.stationFound) { profile.stationFound = true; saveProfile(profile); hud.toast('A research station, lit up on the summit', 'big'); hud.hint("The station's stores sell to visiting divers. The Margaret's yard now has more for the sub"); }
    }
    if (atDave) g.prompt = "F  Dave's Haul" + (e.inSub ? '   ·   hold F  Leave sub' : '');
    // (3.0.0) the old one trades no more: her things lie on the table below her
    g.oldHover = overTable(e.x, e.y);
    if (g.oldHover) {
      const st = oldStock(profile), H = g.oldHover;
      if (H.kind === 'item') { const it = st.items[H.i]; g.prompt = it && !it.sold ? `F  Look at the ${ITEMS[it.id].name}` : 'Nothing here now'; }
      else g.prompt = `F  Look at the ${CHESTS[H.key].name}`;
      if (e.inSub) g.prompt += '   ·   hold F  Leave sub';
    }
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
    // seabed materials have to be worked loose: hold F (or the right mouse button), one at a time
    const holding = keys.has('f');
    const planting = canPlant(target);
    const holdJob = !planting && target && target.kind === 'pickup' && HOLD_TIME[target.p.type];
    if (holdJob && holding) {
      if (!g.pry || g.pry.p !== target.p) g.pry = { p: target.p, t: 0 };
      g.pry.t += dt;
      if (g.pry.t >= HOLD_TIME[target.p.type]) { g.pry = null; interact(target, false); }
    } else g.pry = null;
    repairs(dt, target, keys.has('r')); // mending the hull: hold R at a damaged patch (outside)
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
    // giving something back: release a lure or a necklace into the deep
    if (pressed.has('g') && canOffer() && !g.helm) {
      const k = g.items.lure ? 'lure' : g.items.necklace ? 'necklace' : null;
      if (k) { g.items[k]--; for (let i = 0; i < 12; i++) g.bubbles.push({ x: e.x, y: e.y + 0.5, r: 0.04 + Math.random() * 0.05, w: Math.random() * 6, t: -i * 0.05 }); deed(DEED_CALM.offer, k === 'lure' ? 'You let the lure sink into the dark.' : 'You let the necklace sink into the dark.'); g.entity.soothe(g); hud.toast('The deep accepts it, for now', 'note'); }
    }
    if (pressed.has('f-tap') && g.oldHover) showOldCard(g.oldHover);
    else if (pressed.has('f-tap') && atDave) ui.toggleDave();
    else if (pressed.has('f-tap') && atStation) ui.toggleCatalog(undefined, 'station');
    else if (pressed.has('f-tap') && !holdJob && !planting) interact(target, false);
    if (pressed.has('j')) ui.toggleJournal();
    if (pressed.has('o')) ui.toggleQuests(); // (4.0.0) the quest board
    if (pressed.has('k')) { const was = ui.chart.isOpen(); ui.closeAll(); if (!was) ui.chart.toggle(true); } // (4.10.0) the chart
    if (pressed.has('l') && (g.aboard || g.helm)) { g.sub.lightsOn = !g.sub.lightsOn; audio.ready && audio.click(); } // (4.0.0) aboard the Margaret: the sub's lights, quietly
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
    // (4.0.0) the shipyard: part of the Margaret, opened with P anywhere aboard her (deck, cabin, wheel) or
    // alongside her (in the water at her side, or in the sub in her cradle)
    if (pressed.has('p')) { if (g.aboard || g.helm || atBoat) { audio.ready && audio.click(); ui.openShop('sub', ['sub']); } else hud.showFps = !hud.showFps; } // (4.12.0) the yard at the Margaret; anywhere else, the frame counter
    if (pressed.has('v') && g.helm) { leaveHelm(); audio.ready && audio.click(); } // (the helm is taken aboard, at the wheel)
    if (pressed.has('q')) {
      const old = (profile.oldLures || 0) > 0;
      if ((old || g.items.lure > 0) && !g.lure) {
        if (old) profile.oldLures--; else g.items.lure--;
        const dir = e.inSub ? g.sub.facing : e.facing;
        g.lure = { x: e.x + dir * 2, y: e.y, vx: dir * 15, vy: -1.0, old };
        ent.throwLure(g.lure.x, g.lure.y, old ? 25 : 10);
        hud.toast(old ? 'The old lure drifts away' : 'The lure drifts away');
        if (g.entity && (g.entity.dist ?? Infinity) < 300) questEvent(profile, 'lureMonster'); // (4.8.0)
      } else if (!g.lure) hud.toast('No lures', 'warn');
    }
    if (pressed.has('r')) {
      // a backup air tank, plumbed into the cabin: the air bank fills to full
      if (!e.inSub || g.sub.imploded) { if (patchNear() < 0 && !g.sub.imploded && (g.sub.patches || []).length) hud.toast('Hold R at a hole in the hull', 'warn'); }
      else if (!g.items.airTank) hud.toast('No backup air tanks', 'warn');
      else if (g.tankFit) { /* already being connected */ }
      else if (g.sub.o2 >= g.sub.o2Max - 1) hud.toast('The cabin air is full');
      else { g.tankFit = 0.001; g.tankClank = 0; audio.ready && audio.click(); } // three seconds to connect it (see repairs)
    }
    if (pressed.has('e')) {
      // the necklace is only a light now: on and off, never used up
      // (4.0.0) a glow stick: snapped, it burns warm amber for 90 s and is spent. In the sub it lights the
      // cabin and the water round the hull; he takes it out with him when he leaves.
      if (g.necklaceOn) hud.toast(`Glow stick: ${Math.ceil(g.glowT || 0)} s left`);
      else if (g.items.necklace > 0) { g.items.necklace--; g.glowT = GLOW_SECONDS; g.necklaceOn = true; hud.toast('Glow stick lit · 90 s'); audio.ready && audio.click(); }
      else hud.toast('No glow sticks', 'warn');
    }
    if (pressed.has('m')) audio.setMuted(!audio.muted);
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
        const P = g.profile, met = (P.legends = P.legends || {}); const first = !met[c.sp.id]; met[c.sp.id] = (met[c.sp.id] || 0) + 1; saveProfile(P);
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
    if (pressed.has('`')) { hud.showFps = !hud.showFps; } // (4.0.0: P is the shipyard now)
    if (pressed.has('x')) devMaxAll();
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
      else if (e.inSub) { g.homeRun = true; ap.sendHome(g); hud.toast('Autopilot: heading home'); hud.hint('It steers itself to the boat using less air. Press C to take the helm back; if something hits or comes near, it lets go'); audio.ready && audio.sonar(0.05); }
      else if (g.sub.imploded) hud.toast('The submersible is gone', 'warn');
      else if (ap.state === 'coming') { ap.cancel(); g.sub.vx *= 0.5; hud.toast('Sub stopped'); }
      else { ap.call(g); hud.toast(`Calling the sub · ${Math.round(dist(e.x, e.y, g.sub.x, g.sub.y))} m`); audio.ready && audio.sonar(0.05); }
    }
    if (e.inSub && ap.state !== 'idle' && !g.homeRun) ap.cancel();
    if (!e.inSub) g.homeRun = false;
    // the way home: the autopilot steers; anything that needs a pilot hands her back
    if (g.homeRun) {
      const steer = false; // steering no longer takes over: only C does
      const why = g.subHit ? 'Something hit the hull — autopilot off' : g.threat ? 'Something is coming — autopilot off'
        : (g.fx.dread > 0.05 || (ent.marked && (ent.dist ?? 999) < 220)) ? 'Something is near — autopilot off' : null;
      if (why) { g.homeRun = false; ap.cancel(); hud.toast(why, steer ? '' : 'warn'); }
      else {
        const r2 = ap.update(g, dt, 1);
        if (r2 === 'docked') { g.homeRun = false; audio.cue && audio.cue('home'); }
      }
    }
    g.subHit = false;
    // catching: 1 / 2 pick the net or the slurp gun, Space uses it
    // a number picks up that tool; the same number again puts it away (hands free)
    const pick = (sel, msg) => { if (g.toolSel === sel) { g.toolSel = 'none'; g.capture = null; hud.toast('Hands free'); } else { g.toolSel = sel; hud.toast(msg); } };
    if (pressed.has('1')) pick('net', gear(profile, 'net').name);
    if (pressed.has('2')) { if (owns(profile, 'slurp')) pick('slurp', gear(profile, 'slurp').name); else hud.toast('No slurp gun', 'warn'); }
    if (pressed.has('3')) { if (owns(profile, 'tagger')) pick('tag', gear(profile, 'tag').name); else hud.toast('No tag gun', 'warn'); }
    if (pressed.has('5')) { const tr = profile.traps || {}; if (TRAP_ORDER.some((k) => tr[k] > 0)) pick('trap', `Traps to set: ${TRAP_ORDER.filter((k) => tr[k] > 0).map((k) => `${trapsFree(g, k)} ${TRAPS[k].name.toLowerCase()}`).join(', ')}`); else hud.toast('No traps', 'warn'); }
    if (pressed.has('4')) { if (owns(profile, 'camera')) pick('cam', `${gear(profile, 'cam').name} · ${g.shots} shots left`); else hud.toast('No camera', 'warn'); }
    const tool = activeTool(g);
    if (pressed.has(' ') && !e.inSub && g.toolSel === 'trap') {
      // at the surface: open the depth meter (setting happens there; the Space that set it is ignored)
      if (!ui.trapSetOpen() && performance.now() - (ui.tsClosedAt || 0) > 400) { const msg = canSetHere(g); if (msg) hud.toast(msg, 'warn'); else ui.openTrapSet(); }
    } else if (pressed.has(' ') && !e.inSub) {
      if (tool.kind === 'tag') { if (!g.capture) { const why = fireTag(g); if (why) hud.toast(why.charAt(0).toUpperCase() + why.slice(1), 'warn'); else audio.ready && audio.thud && audio.thud(0.15); } }
      else if (tool.kind === 'cam') {
        if (!g.capture) {
          const r = takePhoto(g);
          audio.ready && audio.click();
          if (r.type === 'noShots') hud.toast('No shots left', 'warn');
          else if (r.empty) hud.toast(`Nothing in frame · ${g.shots} left`);
          else if (r.old) hud.toast(`${r.name}: already photographed`);
          else { audio.calmBoost && audio.calmBoost(0.08); hud.toast(`Photographed ${r.name} · ${money(r.value)}`, 'note'); hud.photoCard = { sp: r.sp, variant: r.variant, t: 0 }; questEvent(profile, 'photo', { id: r.sp.id }); if (!g.journal.has(r.sp.id)) { g.journal.set(r.sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; profile.journal = [...g.journal.entries()]; saveProfile(profile); } }
        }
      } else if (tool.kind === 'none') { /* hands free: nothing to use */ } else { const msg = useTool(g); if (msg) hud.toast(msg, 'warn'); else if (g.capture && g.capture.t === 0) audio.ready && audio.whoosh && audio.whoosh(0.25); }
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
    for (const ev of updateTraps(g, dt, renderer.cam)) {
      if (ev.type === 'hauled') {
        const tr = ev.trap, n = tr.catch.length;
        tr.y = 0; const moved = emptyTrap(g, tr);
        hud.toast(n ? `${TRAPS[tr.type].name} up · ${n} inside${moved < n ? ` · ${n - moved} didn't fit` : ''}` : `The ${TRAPS[tr.type].name.toLowerCase()} comes up empty`, n ? 'note' : '');
        audio.ready && audio.thud && audio.thud(0.25);
      } else if (ev.type === 'settled') hud.toast(`${TRAPS[ev.trap.type].name} set at ${ev.trap.depth} m${ev.trap.onBottom ? ', on the bottom' : ''}`);
      else if (ev.type === 'spoiling') hud.toast(`A ${TRAPS[ev.trap.type].name.toLowerCase()} has been left too long`, 'warn');
      else if (ev.type === 'ghost') hud.toast(`An abandoned ${TRAPS[ev.trap.type].name.toLowerCase()} broke loose`, 'warn');
    }
    if (g.capture && (g.capture.kind === 'tag' || g.capture.kind === 'cam')) { g.capture.t += dt; if (g.capture.t >= g.capture.dur) g.capture = null; }
    g.camFlash = Math.max(0, g.camFlash - dt * 5);
    for (const ev of updateDarts(g, dt)) {
      if (ev.type === 'tagged') {
        g.tags.push({ key: ev.key, value: ev.value, name: ev.name }); questEvent(profile, 'tag');
        hud.toast(`Tagged ${ev.name} · ${money(ev.value)}`, 'note');
        audio.ready && audio.note();
        if (!g.journal.has(ev.sp.id)) { g.journal.set(ev.sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; }
        if (!(profile.caught || []).includes(ev.sp.id)) { profile.caught = [...(profile.caught || []), ev.sp.id]; g.fauna.caught.add(ev.sp.id); }
        if (ev.variant) { const vk = ev.sp.id + ':' + ev.variant; if (!(profile.variants || []).includes(vk)) profile.variants = [...(profile.variants || []), vk]; }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      } else if (ev.type === 'provoked') hud.toast(`The ${ev.sp.name.toLowerCase()} turns toward you`, 'warn');
      else if (ev.type === 'dartMiss') hud.toast('Missed');
      else if (ev.type === 'tooSmall') hud.toast(`The ${ev.sp.name.toLowerCase()} is too small to tag`);
    }
    const capEvs = updateCapture(g, dt);
    for (const ev of capEvs) {
      if (ev.type === 'caught') {
        const sp = ev.sp, v = ev.spec.variant;
        questEvent(profile, 'catch', { id: sp.id, depth: ev.spec.from || e.y, alive: ev.spec.cond > 0.05 });
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
        const hurt = ev.spec.cond < 0.7 ? ` · ${conditionName(ev.spec.cond)}` : '';
        const extra = capEvs.filter((q) => q.type === 'caught' && q.extra).length; // (the bait-ball net: more from the same school)
        if (!v && !ev.extra) hud.toast(`${ev.name}${extra ? ` ×${extra + 1}` : ''}${hurt}`, 'rar:' + rr.col);
        audio.ready && audio.pickup();
        if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival, at: Date.now() }); ui.journalDirty = true; }
        if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      } else if (ev.type === 'missed') {
        if (g.tutForce === 'miss') { profile.tutMissed = true; saveProfile(profile); g.tutOops = g.time; } // (4.3.2) the tutorial's first swing
        else hud.toast(`The ${ev.name.toLowerCase()} got away`);
      }
      else if (ev.type === 'miss' && ev.why) hud.toast(`${ev.sp.name}: ${ev.why}`, 'warn');
    }
    // the sub's trawl: N drops it, N again (or time) closes it; the winch brings it in with what it caught
    // (4.11.0) with more than one kind of net in the hatch, N asks which: two cards, pick one and it goes out
    if (pressed.has('n') && e.inSub) {
      const letOut = (tier) => {
        const why = fireSubNet(g, tier);
        if (why === 'closing') { hud.toast('Closing the net…'); audio.ready && audio.click(); }
        else if (why && why !== 'busy') hud.toast(why, 'warn');
        else if (!why) { questEvent(profile, 'trawl'); hud.toast(learned(profile, 'trawl') || g.lesson ? `${NETS_SUB[g.subNet.tier].name} out` : `${NETS_SUB[g.subNet.tier].name} out (N to close)`); audio.ready && audio.whoosh(); }
      };
      const kinds = netKinds(g.items);
      if (g.subNet || canFireSubNet(g)) letOut(null);
      else if (g.lesson) letOut('basic');
      else { ui.pickNet(kinds, netsOf(g.items), (k) => { if (g.earl.inSub && !g.subNet) letOut(k); }); audio.ready && audio.click(); }
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
        hud.hint('T: the tank room. Drag them into the tank or the chambers before they suffer');
        for (const s of haul) { const sp = SPECIES_BY_ID[s.id]; if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(s.from), time: g.survival, at: Date.now() }); ui.journalDirty = true; } if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); } }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      }
      audio.ready && audio.thud(0.3);
    }
    // (3.0.0) quests: what can be read off the game, once a second
    g.questT = (g.questT || 0) + dt;
    profile.playT = (profile.playT || 0) + dt; // (3.0.0) play time: the old one's days
    if (g.questT > 1) { g.questT = 0; g.chambersFull = pressSlots(g) > 0 && pressUsed(g) >= pressSlots(g); if (questTick(g, profile)) saveProfile(profile);
      // (4.18.0) the Log's dive to 60 m, from the Margaret's anchorage where the bottom is half that: once, on the bottom, which way the deep is
      { const st = QUEST_MAIN[questsOf(profile).main]; if (st && st.on === 'subDepth' && e.inSub && !g.shallowSaid && g.sub.y < st.need && g.world.floorAt(g.sub.x) - g.sub.y < 7) { g.shallowSaid = true; hud.toast(`Too shallow here for ${st.need} m: the sea deepens to the ${g.world.floorAt(g.sub.x - 60) > g.world.floorAt(g.sub.x + 60) ? 'west (left)' : 'east (right)'}`, 'note'); } } }
    if (profile.tut === 'on' && !profile.tutJournal && !document.getElementById('journal').hidden) { profile.tutJournal = true; saveProfile(profile); }
    tutor(); refreshAir(); // (4.2.0; 4.3.4: the first dive's extra air, and back to normal after it)
    afterTips(dt); // (4.6.0)
    g.autosaveT = (g.autosaveT || 0) + dt; if (g.autosaveT > 10 && profile && !g.kill) { g.autosaveT = 0; syncProfile(); saveProfile(profile); } // (4.12.6) the dive saved every 10 s
    lessons(); // (4.7.0)
    // (4.18.0) a menu open under water (the journal, quests, chart, inventory, a shop) holds the sea still, as a lesson
    // does: no air used, nothing hunting, nothing suffering. With a twenty-second tank, reading the journal at 10 m
    // used to drown him. The tank room is part of the work and runs on.
    g.held = !!(g.mode === 'play' && !g.kill && !g.aboard && !e.atSurface && ui.anyOpen('cabin') && !(ui.tankOpen && ui.tankOpen()));
    if (g.held) g.frozen = true;
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
    } else if (e.inSub) g.capPrompt = g.armGame && g.armGame.phase === 'grip' ? 'Space  Close the claw — in the green' : null;
    else if (g.toolSel === 'trap') {
      const fl = g.world.floorAt(e.x);
      const why = canSetHere(g);
      g.capPrompt = why ? `Traps: ${why.charAt(0).toLowerCase() + why.slice(1)}` : 'Space  Set a trap here';
    } else if (!e.inSub && tool.kind === 'tag') {
      const tt = findTagTarget(g);
      const ammo = `tags ${g.items.tag || 0} basic · ${g.items.tagAdv || 0} advanced`;
      g.capPrompt = tt ? (tt.ok ? `Space  ${tt.name}` : `${tt.sp.name}: ${tt.why}`) : ammo;
    } else if (!e.inSub && tool.kind === 'cam') {
      const ps = findPhotoSubject(g);
      g.capPrompt = ps ? (ps.ok ? `Space  ${ps.name}` : `${ps.name}: ${ps.why}`) : null;
    } else {
    const ct = !e.inSub ? findCatch(g) : null;
    // (4.0.6) an animal he has never observed has no name yet: only F Observe is said (it can still be netted).
    // Once observed, its name; Space before it only until the Log has taught the net, then a small net mark when
    // it is in reach
    const known = ct && g.journal.has(ct.sp.id), taught = learned(profile, 'net');
    g.capPrompt = ct && known ? (ct.ok ? (taught ? ct.name : `Space  ${ct.name}`) : `${ct.sp.name}: ${ct.why}`) : null;
    g.capIcon = ct && known && ct.ok && taught ? (tool.kind === 'slurp' ? 'slurp' : 'net') : null;
    // what the net or slurp gun will go for: marked on screen (in plain white while it is unknown)
    g.catchTarget = ct && ct.ok ? { c: ct.c, x: ct.x, y: ct.y, len: ct.len, col: known ? rarityOf(ct.sp).col : '#d8e2de' } : null;
    g.capRarity = ct && ct.ok && known ? rarityOf(ct.sp) : null;
    // the name is said once: not again on the F line
    if (ct && known && g.prompt && g.prompt.startsWith(ct.sp.name)) g.prompt = g.prompt.slice(ct.sp.name.length).replace(/^\s*·\s*/, '') || null;
    }
    // a fresh memory card and charged strobes at the boat
    if (owns(profile, 'camera') && Math.abs(e.x - BOAT.x) < 14 && e.y < 4) g.shots = gear(profile, 'cam').shots;
    if (!e.inSub) {
      const r = ap.update(g, dt, g.addons.recall ? 1.5 : 1);
      if (r === 'arrived') { audio.ready && audio.sonar(0.06); }
      else if (r === 'holding') hud.toast(`Sub holding at ${Math.round(g.sub.y)} m (rated depth)`, 'warn');
      else if (r === 'docked') { /* (4.5.0) nothing said: he can see it */ }
    }

    // injuries: slower, hungrier for air, heal one point every 15 s
    if (g.injury > 0) { g.healT += dt; if (g.healT >= 15 / (1 + 0.25 * (e.mending || 0))) { g.injury--; g.healT = 0; if (!g.injury) hud.toast('The bleeding has stopped'); } }
    const lvl = Math.min(4, g.injury);
    const kg = loadKg(g); g.loadKg = kg;
    e.speedMul = INJURY.speed[lvl] * (g.noAir ? 1 - clamp(g.noAir / 15, 0, 1) * 0.35 : 1) * loadSpeed(kg * (e.featherK ?? 1)) * (e.suitSpeed || 1);
    const cold = !e.inSub && !suitOf(profile).warm && e.y > 200 ? 1 + clamp((e.y - 200) / 800, 0, 1) * 0.35 * (e.warmK ?? 1) : 1;
    e.o2Mul = INJURY.air[lvl] * loadAir(kg * (e.featherK ?? 1)) * (e.suitAir || 1) * cold;
    if (cold > 1.05 && !g.coldTold) { g.coldTold = true; hud.toast('Cold water: air goes faster', 'note'); } // (3.0.0) back
    // struggling (out of air, or critically hurt): heavier, clumsier movement - never a change of
    // facing; that only ever follows the player's own left/right input
    e.struggle = Math.max(g.noAir ? 0.35 + clamp(g.noAir / 15, 0, 1) * 0.65 : 0, lvl >= 4 ? 0.5 : 0);
    if (g.helm) {
      if (pressed.has('w')) { leaveHelm(); } // (2.6.7) only W, as the prompt says: up/down arrows (or S) at the wheel no longer throw him off it into the cabin
      else {
        // a heavy working boat: she takes her time to get under way and longer still to stop
        // getting under way: a sub alongside is lifted into her cradle; one still out holds her here
        if (mv.x && !g.sub.docked && !g.sub.imploded) {
          const alongside = Math.hypot(g.sub.x - boatDock(), g.sub.y - 2.6) < 16 && !(g.autopilot && g.autopilot.active);
          if (alongside) { g.sub.docked = true; hud.toast('The sub is lifted into the Margaret\'s cradle'); audio.ready && audio.thud(0.2); }
          else { mv.x = 0; if (!g.subOutWarnT || g.time - g.subOutWarnT > 3) { g.subOutWarnT = g.time; hud.toast('The sub is still out (hold C)', 'warn'); } }
        }
        if (mv.x && g.anchored) { if (!g.anchorWarnT || g.time - g.anchorWarnT > 3) { g.anchorWarnT = g.time; hud.toast(g.anchorDir < 0 ? 'Anchor still coming up' : 'Anchor down (G)', 'warn'); } }
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
    // a docked sub sits in the boat's cradle wherever she goes
    if (g.sub.docked && !g.sub.imploded && !(g.autopilot && g.autopilot.active)) { g.sub.x = boatDock(); g.sub.y = 2.6; g.sub.vx = g.sub.vy = 0; g.sub.yaw = Math.PI - BOAT.yaw; g.sub.facing = Math.cos(BOAT.yaw) >= 0 ? -1 : 1; }
    if (e.x > CANYON.x0 && e.x < CANYON.x1 && e.y > CANYON.top && !g.helm) {
      const k = 0.7 + 0.3 * Math.sin(g.time * 0.25), cvx = -1.1 * k, cvy = 0.35 * k;
      if (e.inSub) { g.sub.x += cvx * dt * 0.5; g.sub.y += cvy * dt * 0.5; } else { e.x += cvx * dt; e.y += cvy * dt; }
    }
    if (g.aboard && !g.helm) { mv.x = 0; mv.y = 0; mv.sprint = false; }
    const res = updateEarl(g, dt, mv);
    if (g.aboard) placeOnDeck(dt);
    zoneHazards(dt);
    // the lamp follows the cursor (if the mouse has been used); idle, Earl turns to face it
    g.aim = null;
    if (mouse.seen && renderer.S) {
      const [mx, my] = mouseScreen();
      const ax = mx - renderer.S(e.x), ay = my - renderer.Sy(e.y);
      if (Math.hypot(ax, ay) > renderer.cam.ppm * 0.6) {
        g.aim = Math.atan2(ay, ax);
        if (!mv.x && !mouse.down && performance.now() - mouse.movedAt < 3000 && Math.abs(ax) > renderer.cam.ppm * 1.2) e.facing = ax > 0 ? 1 : -1;
      }
    }
    if (e.inSub && !g.sub.imploded && g.mode === 'play' && !g.frozen) crushDepth(dt);
    if (res === 'implode' || g.implodeNow) {
      g.implodeNow = false;
      g.sub.imploded = true; g.imploded = true; g.implodeDepth = g.sub.y; g.implodeT = 0; g.sub.failing = null;
      g.fx.flash = 1; g.fx.shake = 3.2;
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
        g.debris.push({ x: g.sub.x + (Math.random() - 0.5) * 6, y: g.sub.y + (Math.random() - 0.5) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, size: 0.2 + Math.random() * 1.1 });
      }
      for (let i = 0; i < 120; i++) g.bubbles.push({ x: g.sub.x + (Math.random() - 0.5) * 8, y: g.sub.y + (Math.random() - 0.5) * 4, r: 0.05 + Math.random() * 0.25, w: Math.random() * 6, t: -Math.random() * 0.5 });
      audio.ready && audio.implosion();
      // he was inside: there is nothing to be done
      die(`Crushed at ${Math.round(g.implodeDepth)} m when the submersible imploded`, 'implode');
    }
    // out of air: not instant death - about 15 s of air hunger, blacking out, before it is over.
    // Reaching the surface (or the sub's air) in time brings Earl back, gasping.
    // the cabin is out of air: he stays in, breathing from his own tank (no depth effect in the cabin)
    if (res === 'cabin-empty' && !g.cabinWarned) { g.cabinWarned = true; hud.toast('Cabin out of air: breathing from your tank', 'warn'); }
    if (g.sub.o2 > 1) g.cabinWarned = false;
    if (res === 'o2' && !g.noAir && !e.inSub && e.legends && e.legends.has('secondwind') && !g.secondWindUsed) {
      // (2.8.0) Second Wind: once a dive, when the air runs out, it fills again
      g.secondWindUsed = true; e.o2 = e.o2Max; g.fx.flash = 0.25; hud.toast('Second Wind: the air comes back', 'big'); audio.ready && audio.gasp && audio.gasp();
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
    if (!e.inSub && !g.sub.imploded && g.sub.y < 2.2 && g.sub.o2 < g.sub.o2Max) g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + g.sub.o2Max / 4 * dt);
    // diver tank refills from the sub's air
    if (e.inSub && g.sub.o2 > 0 && e.o2 < e.o2Max) { const r = Math.min(e.o2Max - e.o2, (e.o2Max / 3.5) * dt); e.o2 += r; } // (only while the cabin has air to give)
    // (3.0.17) swimming past what the suit can take: said once, and again only after he has come back above it
    { const pS = e.pressStart || 300;
      if (!e.inSub && !g.aboard && e.y > pS + 2 && !g.pressWarned) { g.pressWarned = true; hud.toast(`Diving past ${pS} m: pressure warning`, 'warn'); }
      else if (e.inSub || e.y < pS - 5) g.pressWarned = false; }
    g.diverDrain = e.inSub ? 1 : diverDrainMult(e.y, e.pressStart || 300) * (mv.sprint && e.speedNow > 1 ? 2 : 1);
    g.diverDrain *= e.o2Mul;
    g.subDrain = subDrainMult(g.sub.y, g.sub.rated) * (mv.sprint && e.speedNow > 1 ? 3 : 1) * subLeak(g.sub);
    // (4.18.0) the air it takes to go straight up from here, at the pace she or he climbs: a mark on the air gauge,
    // and one warning when what is left comes near it (deep in the first sub the cabin air ran out on the way home)
    { const sub = g.sub, inS = e.inSub && sub.o2 > 0;
      const up = inS ? sub.y / (SUB_SPEED * (sub.speedMul || 1) * SUB_RISE * (1 + (sub.ballast || 0))) : e.y / (DIVE_SPEED * (e.speedMul || 1) * (e.finSpeed || 1));
      const need = (up + 4) * (inS ? subDrainMult(sub.y, sub.rated) * subLeak(sub) : diverDrainMult(e.y, e.pressStart || 300) * e.o2Mul) * (g.airMul || 1);
      const have = inS ? sub.o2 : e.o2, max = inS ? sub.o2Max : e.o2Max;
      g.airUp = e.atSurface || g.aboard || e.y < 6 ? 0 : Math.min(1, need / max);
      if (g.airUp > 0 && (inS || e.y > 25) && have < need * 1.35 && !g.upWarned && !g.homeRun) { g.upWarned = true; hud.toast(inS ? 'Just enough cabin air to get up: surface now' : 'Just enough air to get up: surface now', 'warn'); audio.ready && audio.sonar && audio.sonar(0.06); }
      else if (e.atSurface || have > need * 2) g.upWarned = false; }
    if ((!e.inSub || g.sub.o2 <= 0) && !e.atSurface && e.o2 / e.o2Max < 0.1 && !g.lowO2Warned) { g.lowO2Warned = true; hud.toast('Air critical — surface', 'warn'); }
    if (e.atSurface) g.lowO2Warned = false;

    // lure physics
    if (g.lure) {
      const L = g.lure;
      L.vx *= Math.exp(-dt * 0.85); L.vy = lerp(L.vy, 0.35, dt);
      if (ent.lure) { ent.lure.x = L.x; ent.lure.y = L.y; }
      L.x += L.vx * dt; L.y += L.vy * dt;
      if (L.y > W.floorAt(L.x) - 0.3) { L.y = W.floorAt(L.x) - 0.3; L.vy = 0; }
      if (ent.lureT <= 0) g.lure = null;
    }
    // protection: necklace or a nearby lantern
    if (g.necklaceOn) { g.glowT = (g.glowT || 0) - dt; if (g.glowT <= 0) { g.necklaceOn = false; g.glowT = 0; hud.toast('The glow stick has faded'); } }
    g.protection = null;
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
    // (4.18.0) nothing comes hunting during the tutorial, nor in the shallows right by the Margaret (her ladder is where
    // a new diver spends his first minutes, and a great white there was the end of most first games)
    const harbour = (profile && tutorialOn(profile)) || (!e.inSub && e.y < 14 && Math.abs(e.x - BOAT.x) < 30);
    if (!g.frozen) { if (!harbour) directEncounters(g, dt, SPECIES_BY_ID); updateHunters(g, dt); }
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
      } else if (ev === 'unmarked') { hud.toast('The feeling of being watched fades.', 'note');
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
    g.fx.black = g.deathKind === 'devoured' ? 1 : injuryDeath ? clamp((g.deathT - 2) / 2.5, 0, 1) : crushed ? clamp((g.deathT - 1.6) / 1.6, 0, 1) : clamp(g.deathT / 3, 0, 1);
    g.fx.redDeath = injuryDeath ? clamp(g.deathT / 2.2, 0, 1) : 0;
    if (g.deathT > (injuryDeath ? 5 : crushed ? 6 : 3.6)) {
      const cause = g.deathCause, survived = g.survival, bill = g.deathBill, lost = g.deathLost;
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
  // in the safe zone you still hear and sense it (sonar, heartbeat), but the water stays the water
  const deepK = clamp((e.y - 100) / 60, 0, 1);
  fx.safeK = deepK;
  fx.darken = fx.dread * 0.6 * deepK;
  fx.vignette = fx.dread;
  // pressure: the deeper past 300 m, the worse. Only in the water: the sub's cabin is at surface
  // pressure, and nothing in it sways, blurs or doubles the view (its hull warns by sound instead)
  const pressT = !e.inSub && g.mode !== 'menu' ? clamp(Math.log(Math.max(1, g.diverDrain / (keys.has('shift') ? 2 : 1))) / Math.log(30), 0, 1) : 0;
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
  const pulse = 0.5 + 0.5 * Math.sin(g.time * (2.2 + fx.pressure * 1.5));
  fx.lightPulse = 1 - fx.pressure * 0.45 * pulse - (fx.pressure > 0.6 && Math.random() < 0.03 ? 0.3 : 0);
  fx.bioPulse = 1 + fx.pressure * 0.9 * (0.5 + 0.5 * Math.sin(g.time * 3.1 + 1.3)) - fx.pressure * 0.3;
  fx.shake = Math.max(fx.disorient * 0.45, fx.shake - dt * 1.5);
  fx.flash = Math.max(0, fx.flash - dt * 1.2);
  // sky darkens and the sea rises when it is close and shallow
  const shallowness = clamp((450 - ent.y) / 450, 0, 1);
  const near = Math.pow(clamp((500 - d) / 500, 0, 1), 0.6); // the surface reacts early
  const skyDark = near * shallowness;
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
function smoothSky(v) { return v * v * (3 - 2 * v); }
function updateBubbles(dt) {
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
let frameEma = 1 / 60, qualityT = 0;
function adaptQuality(realDt) {
  frameEma = lerp(frameEma, realDt, 0.05);
  hud.fps = 1 / Math.max(1e-3, frameEma); hud.quality = renderer.quality; hud.lite = renderer.lite;
  qualityT += realDt;
  if (qualityT < 1) return;
  const q = renderer.quality ?? 1;
  // the floor is set by the real screen: never below ~90 % of a screen pixel (75 % on plain screens), so
  // the picture never turns soft or pixelated; on sharp (high-DPI) screens that leaves room to drop further
  const floor = SETTINGS.fast ? 0.55 : Math.min(0.75, 0.9 / Math.min(window.devicePixelRatio || 1, 1.25));
  if (SETTINGS.fast && !renderer.lite) renderer.lite = true; // Fast graphics: the extras stay off
  if (frameEma > 1 / 45 && q > floor) { renderer.quality = Math.max(floor, q - 0.05); qualityT = 0; }
  // still slow at the floor: lite mode drops the costliest extras (the rim light on animals, the water
  // textures, the specks in the beams) instead of sharpness; they come back as soon as there is room
  else if (frameEma > 1 / 45 && !renderer.lite) { renderer.lite = true; qualityT = 0; }
  // lite mode comes on first when frames are well under 40 a second, before any sharpness goes
  if (frameEma > 1 / 38 && !renderer.lite) { renderer.lite = true; qualityT = 0; }
  else if (frameEma < 1 / 57 && renderer.lite && qualityT > 4 && !SETTINGS.fast) { renderer.lite = false; qualityT = 0; }
  else if (frameEma < 1 / 57 && q < 1 && qualityT > 3) { renderer.quality = Math.min(1, q + 0.05); qualityT = 0; }
  else if (qualityT > 3) qualityT = 1;
}
const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function frame(now) {
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
  update(dt * ts);
  renderer.updateCamera(g, dt);
  // (3.0.27) the sea isn't drawn while a full-screen room covers it: it only cost frames (and slowed him there)
  const covered = !document.getElementById('cabin').hidden || !document.getElementById('tankroom').hidden || !document.getElementById('gallery').hidden;
  if (!covered) renderer.render(g);
  // spare time: prepare creature animation frames for what lies ahead (more while on the menu)
  if (g.warmUntil) { // behind the loading card: build the sprites on screen at full speed, then lift it
    const done = renderer.warmSprites(g, 60, true);
    ui.setLoading(0.6 + 0.4 * Math.min(1, (performance.now() - (g.warmFrom || 0)) / 1500), 'Charting the sea');
    if (done || performance.now() > g.warmUntil) { g.warmUntil = 0; ui.setLoading(1, 'Charting the sea'); setTimeout(() => ui.showLoading(false), 250); }
  } else renderer.warmSprites(g, g.mode === 'menu' ? 8 : realDt < 1 / 50 ? 3 : 1);
  weightedCursor(Math.min(0.05, dt)); hud.draw(g, dt);
  ui.questsButton && ui.questsButton(g.mode === 'play' && !g.kill && !ui.anyOpen('cabin')); // (3.0.0) the Quests button (4.3.5: in the cabin too)
  audio.update(g, dt);
  airOver(g);
  beacon.update(g, dt, !!(ui.tankOpen && ui.tankOpen())); // (4.0.2) always: the alarm keeps going whatever panel is open // (3.3.0) the alarm beacon (not over the locker)
  ui.update(g, dt);
  { const on = g.mode === 'play' && !g.paused && !g.kill && !!profile && (profile.tut === 'on' || !!g.lesson) && !!g.tut; tutSpot.update(on, on ? g.tut.spot : null, on ? g.tut.text : null); } // (4.3.0)
  // dread colour grading on the scene canvas only
  const fx = g.fx;
  // no steady blur: it comes in slow pulses, a swell of fog every few seconds that clears again
  const blurAmp = Math.max(fx.disorient * 1.2, fx.pressure * 2.4);
  const blurPx = Math.round(blurAmp * Math.pow(Math.max(0, Math.sin(g.time * 1.3)), 3) * 4) / 4;
  const f = `saturate(${(1 - fx.dread * 0.65 - fx.pressure * 0.25 - (g.injury >= 4 ? 0.45 : g.injury >= 3 ? 0.15 : 0)).toFixed(2)}) contrast(${(1 + fx.dread * 0.18).toFixed(2)})${blurPx > 0.25 ? ` blur(${blurPx.toFixed(1)}px)` : ''}`;
  const f2 = fx.dread < 0.01 && fx.pressure < 0.01 && blurPx <= 0.25 && g.injury < 3 ? 'none' : f;
  if (f2 !== filterKey) { canvas.style.filter = f2; filterKey = f2; }
  pressed.clear();
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
  if (window.__bootDone) window.__bootDone();
})();

// Escape toggles pause; closing overlays first.
window.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape' || ui.typing()) return;
  if (ui.settingsOpen && ui.settingsOpen()) { ui.toggleSettings(false); return; }
  if (ui.inventoryOpen && ui.inventoryOpen()) { if (ui.lkSel || ui.fishSel) { ui.lkSel = null; ui.fishSel = null; ui.renderInventory(); return; } ui.toggleInventory(false); return; } // (3.0.31) the item pop-up first
  if (g.mode !== 'play') return;
  if (ui.anyOpen()) { ui.closeAll(); return; }
  g.paused = !g.paused;
  ui.setPaused(g.paused);
});

// debug hooks for automated testing
window.__earl = { get g() { return g; }, get profile() { return profile; }, set profile(p) { profile = p; }, newProfile, startRun, renderer, SPECIES_BY_ID, ui, step: (dt) => update(dt), keys };

// leaving the page: whatever has changed is written to the slot at once
function saveNow() { if (!profile) return; if (g.mode === 'play') syncProfile(); saveProfile(profile); flushSave(); }
window.addEventListener('beforeunload', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
ui.showTitle();
