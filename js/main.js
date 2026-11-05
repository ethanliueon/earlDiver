// Earl the Diver — game loop, state, interactions and UI glue.
import { clamp, lerp, dist, makeRng, formatTime } from './util.js';
import { generateWorld, RESOURCES, BOAT, BOAT_HOME, BOAT_MIN, BOAT_MAX, WORLD_W, CAVE, CANYON, WHALE_FALL, SEEP } from './world.js';
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { Fauna } from './fauna.js';
import { Earl, Sub, updateEarl, diverDrainMult, subDrainMult, subLeak, SUB_LEVELS } from './player.js';
import { Autopilot } from './autopilot.js';
import { activeTool, findCatch, useTool, updateCapture, updateSpecimens, transferToTank, bagSlots, tankSlots, loadKg, loadSpeed, loadAir, tankUsed, pressUsed, pressSlots, seal, chamberRating } from './capture.js';
import { specimenValue, conditionName, rarityOf, canTakeLive } from './specimens.js';
import { VARIANTS, variantLabel, rollVariant, canBeRare } from './variants.js';
import { findTagTarget, findPhotoSubject, fireTag, updateDarts, takePhoto } from './survey.js';
import { placeTrap, updateTraps, trapNear, emptyTrap, trapsFree } from './traps.js';
import { startArm, updateArm, findArmTarget } from './arm.js';
import { fillBoard, fulfil, RADIO } from './contracts.js';
import { updateFrenzy, frenzyOn, FRENZIES } from './frenzy.js';
import { WINGS, WING_BY_ID, aquariumOf, tickAquarium, displayRefusal, display, displayKey, zoneOf } from './aquarium.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS, TAGGERS, CAMERAS, TRAPS } from './economy.js';
import { SUITS, suitOf } from './economy.js';
import { loadBest, UPGRADES, GEAR, lv, statValue, upgradeCost, owns, gear, fmtStat, coinsFor, upgradeCoins, WARES } from './economy.js';
import { TANKS, FINS, SUB_TIERS, SUB_ADDONS, SUPPLIES, supplyMax, GOODS, PATCH_PRICE, HOSPITAL_SHARE, replacementPrice, newProfile, loadProfile, saveProfile, clearProfile, marketTick, priceOf, sell, spend, money } from './economy.js';
import { updateHunters, directEncounters } from './hunters.js';
import { Entity, dreadFromDistance, LANTERN_RADIUS } from './entity.js';
import { Renderer, dayCycle } from './render.js';
import { Hud } from './hud.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const renderer = new Renderer(canvas);
const hud = new Hud(hudCanvas);
const audio = new Audio();

const keys = new Set();
const PRY = new Set(['clam', 'mussel', 'rock', 'iron']);
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
function applySuit(e, P) {
  const S = suitOf(P);
  e.pressStart = S.press; e.suitAir = S.air; e.suitSpeed = S.speed; e.suitQuiet = !!S.quiet; e.suit = (P && P.suit) || 'wet';
}
// the sub's rating, air and engine come from its upgrades
function applySub(sub, P) {
  sub.ratedV = statValue(P, 'depth') + (P.relics || 0) * 100; sub.o2V = statValue(P, 'subAir'); sub.speedMul = statValue(P, 'subSpeed'); sub.ballast = statValue(P, 'ballast');
  sub.level = lv(P, 'depth');
}
function newGame(mode) {
  const P = profile || newProfile();
  BOAT.x = BOAT_HOME; // every dive starts with the Margaret back over the shelf edge
  const seed = (Math.random() * 1e9) | 0;
  const world = generateWorld(seed);
  const rng = makeRng(seed ^ 0x5bd1e995);
  const g = {
    mode, seed, world, rng, profile,
    time: 25 + Math.random() * 60, // a little after sunrise
    survival: 0,
    earl: new Earl(), sub: new Sub(),
    entity: new Entity(rng, world),
    fauna: new Fauna(world, rng),
    bubbles: [], events: [], debris: [],
    fx: { dread: 0, torchShift: 0, darken: 0, vignette: 0, disorient: 0, ghost: 0, shake: 0, flash: 0, black: 0, pressure: 0, lightPulse: 1, bioPulse: 1 },
    items: { lure: P.items ? P.items.lure || 0 : 0, necklace: P.items ? P.items.necklace || 0 : 0, airTank: P.items && P.items.airTank !== undefined ? P.items.airTank : 1 }, inv: {}, // a new diver starts with one backup air tank
    journal: new Map(P.journal || []), notes: P.notes || '', sapphires: 0, earned: 0,
    lure: null, necklaceT: 0, protection: null, prompt: null,
    waveBoost: 0, dayEff: 1, day: dayCycle(0), diverDrain: 1, subDrain: 1,
    deathT: 0, deathDelay: 0, deathCause: null, paused: false, audio,
    imploded: false, lowO2Warned: false, lastSafe: 0, breathT: 2, farShadow: null,
    injury: 0, healT: 0, blood: [], deathKind: null, lampFlashT: -99, threat: null,
    autopilot: new Autopilot(), addons: P.addons || {},
    bag: [], subTank: [], captureFx: [], capture: null, toolSel: 'net', capPrompt: null,
    darts: [], tags: [], photos: [], shots: owns(P, 'camera') ? gear(P, 'cam').shots : 0, camFlash: 0,
    traps: [], armGame: null, contracts: [],
  };
  if (mode === 'play') fillBoard(P, g.contracts); // the radio's jobs for this dive
  g.hurt = (dmg, sp, how) => hurt(dmg, sp, how);
  g.damageSub = (amt, sp) => damageSub(amt, sp);
  g.sub.docked = true;
  // rare variants: unlocked per species by catching a normal one first
  g.fauna.caught = new Set(P.caught || []);
  for (const st of world.statics) {
    if (g.fauna.caught.has(st.sp.id) && canBeRare(st.sp)) { const v = rollVariant(rng, st.y, false); if (v) { st.variant = v; if (v === 'giant') st.scale *= 1.7; } }
  }
  // upgrades bought on earlier dives
  g.earl.o2Max = g.earl.o2 = statValue(P, 'air');
  g.earl.finSpeed = statValue(P, 'swim'); g.earl.sprintMul = statValue(P, 'sprint');
  applySuit(g.earl, P);
  applySub(g.sub, P); g.sub.o2 = g.sub.o2Max; g.sub.hull = P.hull;
  if (P.subLost) { g.sub.imploded = true; g.sub.docked = false; }
  // pre-warm the ocean with life around the spawn
  const cam = { x: 500, y: 6, w: 46, h: 26 };
  for (let i = 0; i < 8; i++) g.fauna.trySpawn(cam, 0);
  for (const c of g.fauna.list) { c.x += (500 - c.x) * 0.6; }
  return g;
}

let g = newGame('menu');
const ui = new UI({
  onPlay: () => startRun(),
  getGame: () => g,
  onQuit: () => die('Ended the dive', 'quit'),
  onBuy: (k) => buy(k),
  onSellAll: () => sellAll(),
  onSellItem: (k) => sellItem(k),
  onDisplay: (k) => displaySpecimen(k),
  onCaveOffer: () => caveOffer(),
  onWare: (k) => wareBuy(k),
  onTank: (act, where, i) => tankAction(act, where, i),
  onCaveTrade: (keys) => caveTrade(keys),
  onNewGame: () => { profile = null; g.paused = false; startRun(); },
  getProfile: () => profile,
});

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
  sub.hull = Math.max(0.05, sub.hull - amt);
  g.fx.shake = Math.max(g.fx.shake, 2.2); g.fx.flash = 0.25;
  for (let i = 0; i < 60; i++) g.bubbles.push({ x: sub.x + (Math.random() - 0.5) * 6, y: sub.y + (Math.random() - 0.5) * 2, r: 0.05 + Math.random() * 0.2, w: Math.random() * 6, t: -Math.random() * 0.4 });
  audio.ready && audio.ram();
  hud.toast(`Rammed by ${sp.id === 187 ? 'an orca' : 'a ' + sp.name.toLowerCase()} — hull ${Math.round(sub.hull * 100)} %, air leaking`, 'warn');
}
// ---------------- the boat: selling and buying ----------------
// Everything Earl carries (except lures and necklaces, which he keeps for use) goes in the basket.
// the sub's tank can only be emptied when the sub is at the boat
const subAtBoat = () => !g.sub.imploded && Math.hypot(g.sub.x - (BOAT.x + 8.5), g.sub.y - 2.6) < 20;
function sellSpecimens(list, lines) {
  const groups = new Map();
  // the dead go in their own lot: half the plain market price, no frenzy and no rare-form bonus
  for (const sp of list) { const k = sp.id + ':' + (sp.cond <= 0.05 ? 'dead' : sp.variant || ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(sp); }
  for (const [gk, specs] of groups) {
    const [id, v] = gk.split(':');
    const dead = v === 'dead';
    const key = 'sp' + id + (v && !dead ? ':' + v : ''), base = specs.reduce((a, s) => a + specimenValue(s), 0) / specs.length;
    const worst = specs.reduce((a, s) => Math.min(a, s.cond), 1);
    const acc = !dead && specs.every((s) => s.acc);
    const name = dead ? `${SPECIES_BY_ID[id].name} (dead, half price)` : variantLabel(SPECIES_BY_ID[id], v || null) + (acc ? ' (acclimated)' : worst < 0.8 ? ` (${conditionName(worst)})` : '');
    lines.push(sell(profile, key, specs.length, base * statValue(profile, 'payFish') * (!dead && frenzyOn(g, 'market') ? 2 : 1), name));
  }
}
function sellAll() {
  marketTick(profile);
  // old gold coins for every live animal from the deep that leaves the boat today
  let coins = 0;
  for (const L of [g.bag].concat(subAtBoat() ? [g.subTank] : [])) for (const s of L) coins += coinsFor(s);
  coins += g.inv.sapphire || 0;
  // contracts first: they pay more than the market
  const lines = fulfil(g, profile, [g.bag].concat(subAtBoat() ? [g.subTank] : []));
  if (g.bag.length) { sellSpecimens(g.bag, lines); g.bag = []; }
  if (g.subTank.length && subAtBoat()) { sellSpecimens(g.subTank, lines); g.subTank = []; }
  // the research program: one line per species tagged, each tag a little less than the last
  const tg = new Map();
  for (const t of g.tags) { if (!tg.has(t.key)) tg.set(t.key, []); tg.get(t.key).push(t); }
  for (const [k, list] of tg) lines.push(sell(profile, k, list.length, list[0].value * statValue(profile, 'payFish') * (frenzyOn(g, 'market') ? 2 : 1), `Tag data: ${list[0].name}`));
  g.tags = [];
  // the institute: first photographs
  for (const ph of g.photos) {
    const pv = Math.round(ph.value * statValue(profile, 'payFish') * (frenzyOn(g, 'market') ? 2 : 1) * 100) / 100;
    profile.cash = Math.round((profile.cash + pv) * 100) / 100; profile.lifetime = Math.round((profile.lifetime + pv) * 100) / 100;
    lines.push({ label: `Photograph: ${ph.name}`, n: 1, total: pv });
    profile.photos = [...(profile.photos || []), ph.key];
  }
  g.photos = [];
  for (const [k, n] of Object.entries(g.inv)) {
    if (!n || !GOODS[k] || k === 'coral') continue;
    lines.push(sell(profile, k, n, GOODS[k].price * statValue(profile, 'paySalvage') * (frenzyOn(g, 'market') ? 2 : 1), GOODS[k].name));
    g.inv[k] = 0;
  }
  if (coins) { profile.coins = (profile.coins || 0) + coins; lines.push({ label: 'Old gold, for what came up from the deep', n: 1, total: 0, coins }); }
  if (!lines.length) return null;
  const total = lines.reduce((a, l) => a + l.total, 0);
  g.earned += total;
  if (total > 0) audio.cue && audio.cue('sale');
  // a market frenzy pays out once: this sale was the double one
  if (total > 0 && frenzyOn(g, 'market')) { g.frenzy = null; hud.toast('Market frenzy: sold at double', 'note'); }
  saveProfile(profile);
  audio.ready && audio.pickup();
  return { lines, total };
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
  hud.toast(`On display in the ${WING_BY_ID[zoneOf(best)].name.toLowerCase()}`, 'big');
  audio.ready && audio.note();
  return true;
}
// ---------------- the old one: a giant anglerfish in the west wall's cave ----------------
// Once a dive she takes fish for old gold coins: 30 % under the market, except the one she
// craves this dive, which she pays three times the market for.
const ANGLER_RATE = 0.7, CRAVE_RATE = 3;
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
  audio.ready && audio.pickup();
  hud.toast(`She takes them. ${money(total)}${coins ? ` and ${coins} old gold coin${coins > 1 ? 's' : ''}` : ''}`, 'big');
  return g.caveTraded;
}
function wareBuy(k) {
  const P = profile, W = WARES[k];
  if (!W || (P.coins || 0) < W.coins) return false;
  if (k === 'oldlure') { if ((P.oldLures || 0) >= W.max) return false; P.oldLures = (P.oldLures || 0) + 1; hud.toast('An old lure, cold and faintly glowing  [Q]', 'big'); }
  else if (k === 'blessing') { if (g.blessed) return false; g.blessed = true; hud.toast('Her breath is warm. The deep looks away', 'big'); }
  else if (k === 'eye') { if (P.eye) return false; P.eye = true; hud.toast('The sapphire eye turns in your hand: sapphires show on the sonar', 'big'); }
  else if (k === 'relic') { if ((P.relics || 0) >= W.max) return false; P.relics = (P.relics || 0) + 1; applySub(g.sub, P); hud.toast(`A pressure relic: the sub is rated ${g.sub.rated} m`, 'big'); }
  P.coins -= W.coins;
  saveProfile(P); audio.ready && audio.pickup();
  return true;
}
// the tank room: move animals between the bag, the open tank and the pressure tanks, or let one go
function tankAction(act, where, i) {
  const e = g.earl;
  if (!e.inSub) return false;
  const L = where === 'bag' ? g.bag : g.subTank, s = L[i];
  if (!s) return false;
  if (act === 'press') {
    if (s.pressed) return false;
    if (!seal(g, s)) { hud.toast('Every chamber is in use: the boat fits more', 'warn'); return false; }
    if (where === 'bag') { L.splice(i, 1); g.subTank.push(s); }
    const home = s.home ?? s.from ?? 0, rating = chamberRating(g);
    hud.toast(home > rating ? `${SPECIES_BY_ID[s.id].name}: sealed in, but the chamber only holds ${rating} m of its ${home} m` : `${SPECIES_BY_ID[s.id].name}: sealed in, pumping to ${home} m`);
  } else if (act === 'open') {
    if (tankUsed(g) >= tankSlots(g)) { hud.toast('The open tank is full', 'warn'); return false; }
    if (where === 'bag') { L.splice(i, 1); g.subTank.push(s); }
    s.pressed = false; s.bleed = false; delete s.chamber;
  } else if (act === 'bleed') {
    if (!s.pressed || s.acc) return false;
    s.bleed = !s.bleed;
    hud.toast(s.bleed ? 'The valve open a crack: the chamber eases toward the surface' : 'Valve closed');
  } else if (act === 'release') {
    L.splice(i, 1);
    if (s.cond > 0.05) {
      const c = g.fauna.makeFish(SPECIES_BY_ID[s.id], g.sub.x + g.sub.facing * 3, g.sub.y + 1, g.sub.facing, g.fauna.groupId++, true);
      if (s.variant) c.variant = s.variant;
      g.fauna.list.push(c);
      hud.toast(`The ${SPECIES_BY_ID[s.id].name.toLowerCase()} goes back into the dark`);
    } else hud.toast('It sinks away');
  } else return false;
  audio.ready && audio.click();
  return true;
}
function syncProfile() {
  const P = profile;
  P.hull = g.sub.hull; P.subLost = !!g.sub.imploded;
  P.items = { lure: g.items.lure, necklace: g.items.necklace, airTank: g.items.airTank };
  P.journal = [...g.journal.entries()]; P.notes = g.notes;
  P.deepest = Math.max(P.deepest || 0, Math.round(g.earl.maxDepth));
}
// buy(kind): 'tank' | 'fins' | 'sub' | 'patch' | 'replace' | 'lure' | 'necklace'
function buy(kind) {
  const P = profile, sub = g.sub, e = g.earl;
  let ok = false;
  if (kind.startsWith('up:')) {
    // one more level of a stat
    const id = kind.slice(3), U = UPGRADES[id];
    const cc = U ? upgradeCoins(P, id) : 0;
    if (U && (!U.needs || owns(P, U.needs)) && lv(P, id) < U.max && (P.coins || 0) >= cc && spend(P, upgradeCost(P, id))) {
      P.coins = (P.coins || 0) - cc;
      P.lv = Object.assign({}, P.lv, { [id]: lv(P, id) + 1 }); ok = true;
      if (id === 'air') { e.o2Max = statValue(P, 'air'); e.o2 = Math.min(e.o2Max, e.o2 + U.step); }
      if (id === 'swim') e.finSpeed = statValue(P, 'swim');
      if (id === 'sprint') e.sprintMul = statValue(P, 'sprint');
      if (id === 'depth' || id === 'subAir' || id === 'subSpeed' || id === 'ballast') applySub(sub, P);
      if (id === 'camShots') g.shots = gear(P, 'cam').shots;
      hud.toast(`${U.name}: ${fmtStat(id, statValue(P, id))}`);
    }
  } else if (kind.startsWith('suit:')) {
    // buy it (if new) and put it on
    const k = kind.slice(5), S = SUITS[k];
    const have = (P.suits || ['wet']).includes(k);
    if (S && (have || spend(P, S.price))) {
      if (!have) P.suits = [...(P.suits || ['wet']), k];
      P.suit = k; applySuit(e, P); ok = true;
      hud.toast(have ? `Wearing the ${S.name.toLowerCase()}` : `${S.name}: bought and on`, 'big');
    }
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
    hud.toast(`A new submersible, rated to ${g.sub.rated} m`, 'big');
  } else if ((kind === 'pot' || kind === 'deeptrap') && spend(P, TRAPS[kind === 'pot' ? 'pot' : 'deep'].price)) {
    const tk = kind === 'pot' ? 'pot' : 'deep';
    P.traps = Object.assign({ pot: 0, deep: 0 }, P.traps); P.traps[tk]++; ok = true;
    hud.toast(`${TRAPS[tk].name} (${P.traps[tk]})`, 'big'); hud.hint('Press 5, then Space on the bottom to set a trap');
  } else if (kind === 'radio' && !P.radio && spend(P, RADIO.price)) {
    P.radio = true; fillBoard(P, g.contracts); ok = true;
    hud.toast('A better radio: five contracts at a time', 'big');
  } else if (kind.startsWith('wing:')) {
    const w = WING_BY_ID[kind.slice(5)], A = aquariumOf(P);
    const next = WINGS.find((x) => !A.wings.includes(x.id));
    if (w && next && next.id === w.id && (P.coins || 0) >= (w.coins || 0) && spend(P, w.price)) { P.coins = (P.coins || 0) - (w.coins || 0); A.wings.push(w.id); ok = true; hud.toast(`Built: the ${w.name.toLowerCase()}`, 'big'); audio.cue && audio.cue('wing'); }
  } else if (kind === 'canisters' && !(P.addons || {}).canisters && spend(P, CANISTERS.price)) {
    P.addons = Object.assign({}, P.addons, { canisters: true }); g.addons = P.addons; ok = true;
    hud.toast('Pressure canisters: deep animals survive the trip up', 'big');
  } else if (SUB_ADDONS[kind] && !(P.addons || {})[kind] && spend(P, SUB_ADDONS[kind].price)) {
    P.addons = Object.assign({}, P.addons, { [kind]: true }); g.addons = P.addons; ok = true;
    hud.toast(`Fitted: ${SUB_ADDONS[kind].name.toLowerCase()}`, 'big');
  } else if (SUPPLIES[kind] && (g.items[kind] || 0) < supplyMax(P, kind) && spend(P, SUPPLIES[kind].price)) {
    g.items[kind] = g.items[kind] || 0;
    g.items[kind]++; ok = true;
    hud.toast(`Bought: ${SUPPLIES[kind].name.toLowerCase()}`);
  }
  if (ok) { syncProfile(); saveProfile(P); audio.ready && audio.pickup(); }
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

function startRun() {
  audio.init(); audio.resume(); audio.playMusic();
  if (!profile) { profile = newProfile(); saveProfile(profile); }
  profile.runs = (profile.runs || 0) + 1; saveProfile(profile);
  g = newGame('play');
  hud.toasts = [];
  ui.showGame();
  canvas.focus();
}

// ---------------- input ----------------
window.addEventListener('keydown', (ev) => {
  if (ui.typing()) { if (ev.key === 'Escape') ui.blurTyping(); return; }
  const k = ev.key.toLowerCase();
  if (g.mode === 'menu' && (k === 'enter' || k === ' ')) { ev.preventDefault(); startRun(); return; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) ev.preventDefault();
  if (!keys.has(k)) { pressed.add(k); if (k === 'f') fDown = performance.now(); if (k === 'c') { cDown = performance.now(); cHeld = 0; } }
  keys.add(k);
  audio.resume();
});
window.addEventListener('keyup', (ev) => {
  const k = ev.key.toLowerCase();
  keys.delete(k);
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
  mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.seen = true; mouse.inside = true;
});
hudCanvas.addEventListener('mouseleave', () => { mouse.inside = false; });
hudCanvas.addEventListener('mouseenter', () => { mouse.inside = true; });
hudCanvas.addEventListener('mousedown', (ev) => {
  audio.resume();
  if (g.mode !== 'play') return;
  if (ev.button === 2) { mouse.rdown = true; return; } // held: sprint
  if (ev.button !== 0) return;
  if (inRect(hud.journalHot, ev.clientX, ev.clientY)) { ui.toggleJournal(); return; }
  if (inRect(hud.subHot, ev.clientX, ev.clientY)) { pressed.add('c-tap'); return; }
  if (inRect(hud.slotHot && hud.slotHot.q, ev.clientX, ev.clientY)) { pressed.add('q'); return; }
  if (inRect(hud.slotHot && hud.slotHot.e, ev.clientX, ev.clientY)) { pressed.add('e'); return; }
  if (inRect(hud.slotHot && hud.slotHot.r, ev.clientX, ev.clientY)) { pressed.add('r'); return; }
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

function readMove() {
  if (ui.tankOpen && ui.tankOpen()) return { x: 0, y: 0, sprint: false }; // in the back of the sub, the helm is left alone
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
    const ppm = renderer.cam.ppm, full = ppm * 3, dead = ppm * (e.inSub ? 2.5 : 0.6);
    if (d > dead) { const k = Math.min(1, (d - dead) / full) / d; x = dx * k; y = dy * k; }
  }
  return { x, y, sprint: keys.has('shift') || !!mouse.rdown };
}

// ---------------- interactions ----------------
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
    for (const k of W.kelp) if (!k.harvested && Math.abs(k.x - e.x) < 1.6 && e.y > k.base - k.h && e.y < k.base) return { kind: 'kelp', k };
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
  const e = g.earl;
  const nearBoat = Math.abs(e.x - BOAT.x) < 14 && e.y < 4;
  let p = null;
  if (t) {
    if (t.kind === 'pickup') {
      const name = t.p.type === 'lure' ? 'anglerfish lure' : t.p.type === 'necklace' ? 'fangtooth necklace' : t.p.type === 'sapphire' ? 'deep sapphire' : (RESOURCES[t.p.type] ? RESOURCES[t.p.type].name.toLowerCase() : t.p.type);
      if (t.p.type === 'net') p = g.pry && g.pry.p === t.p ? `Cutting the net… ${Math.round(g.pry.t / HOLD_TIME.net * 100)} %` : `Hold F  Cut the ${t.p.animal} free`;
      else p = PRY.has(t.p.type) ? (g.pry && g.pry.p === t.p ? `Prying loose… ${Math.round(g.pry.t / PRY_TIME * 100)} %` : `Hold F  Pry loose the ${name}`) : `F  Collect ${name}`;
    } else if (t.kind === 'board') p = 'F  Board the submersible';
    else if (t.kind === 'trap') p = t.how === 'haul' ? `F  Haul up the ${TRAPS[t.t.type].name.toLowerCase()} (${t.t.catch.length} inside, ${t.t.depth} m down)` : `F  Empty the trap (${t.t.catch.length} inside)`;
    else if (t.kind === 'kelp') p = 'F  Cut a kelp blade';
    else if (t.kind === 'creature') p = g.journal.has(t.sp.id) ? `${t.sp.name}` : 'F  Observe';
  }
  if (canPlant(t)) p = g.plant ? `Planting coral… ${Math.round(g.plant / PLANT_TIME * 100)} %` : 'Hold F  Plant a coral fragment';
  if (!e.inSub && e.y > 100 && (g.items.lure || g.items.necklace)) p = (p ? p + '   ·   ' : '') + 'G  Offer something back to the deep';
  if (e.inSub) p = (p ? `${p}   ·   hold F  Leave sub` : 'F  Leave the submersible') + '   ·   T  Tank room';
  if (nearBoat || (e.inSub && g.sub.docked)) p = (p ? p + '   ·   ' : '') + (g.helm ? 'A / D  Drive the Margaret   ·   B  Leave the helm' : 'U  The boat   ·   B  Take the helm');
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
  if (was && ent.marked) hud.toast(`The water feels a little calmer (${Math.round(ent.calm / 60 * 100)} %)`);
  audio.ready && audio.note();
}
function interact(t, exitSub) {
  const e = g.earl, sub = g.sub;
  if (exitSub && e.inSub) return leaveSub();
  if (!t) { if (e.inSub) leaveSub(); return; }
  if (t.kind === 'trap') {
    if (t.how === 'haul') { t.t.state = 'hauling'; hud.toast('Hauling the trap up the line'); audio.ready && audio.click(); }
    else { const n = emptyTrap(g, t.t); hud.toast(n ? `${n} from the trap into the bag${t.t.catch.length ? ' — the bag is full' : ''}` : t.t.catch.length ? 'The bag is full' : 'The trap is empty. Leave it a while'); }
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
      if (g.items[p.type] >= 3) { hud.toast('You cannot carry more', 'warn'); return; }
      g.items[p.type]++;
      hud.toast(p.type === 'lure' ? 'Anglerfish lure — still glowing  [Q]' : 'Fangtooth necklace  [E]');
    } else if (p.type === 'sapphire') {
      g.sapphires++; g.inv.sapphire = (g.inv.sapphire || 0) + 1;
      hud.toast(`A deep sapphire — worth around ${money(priceOf(profile, 'sapphire', GOODS.sapphire.price))} at the boat`, 'big');
      audio.ready && audio.sapphire();
    } else {
      g.inv[p.type] = (g.inv[p.type] || 0) + 1;
      if (p.type === 'clam' && p.pearl) { g.inv.pearl = (g.inv.pearl || 0) + 1; hud.toast('There was a pearl inside'); }
      else hud.toast(`+1 ${RESOURCES[p.type].name}`);
    }
    p.taken = true;
    audio.ready && audio.pickup();
  } else if (t.kind === 'board') {
    if (sub.o2 < 1 && sub.y > 2.2) { hud.toast('The cabin has no air left — send her up first (hold C)', 'warn'); return; }
    e.inSub = true; sub.docked = false;
    const moved = transferToTank(g);
    hud.toast(moved ? `Inside the submersible · ${moved} specimen${moved > 1 ? 's' : ''} into the tanks (T: the tank room)` : 'Inside the submersible');
    audio.ready && audio.click();
  } else if (t.kind === 'kelp') {
    t.k.harvested = true; g.inv.kelp = (g.inv.kelp || 0) + 1; hud.toast('+1 Kelp'); audio.ready && audio.pickup();
  } else if (t.kind === 'creature') {
    if (!g.journal.has(t.sp.id)) {
      g.journal.set(t.sp.id, { depth: Math.round(e.y), time: g.survival });
      profile.journal = [...g.journal.entries()]; saveProfile(profile);
      hud.toast(`${t.sp.name} — ${t.sp.sci}`, 'note');
      audio.ready && audio.note();
      ui.journalDirty = true;
    } else if (e.inSub) leaveSub();
  }
}

function leaveSub() {
  const e = g.earl, sub = g.sub;
  e.inSub = false;
  e.x = sub.x - sub.facing * 1.5; e.y = Math.max(0.4, sub.y + 2.6); e.vx = 0; e.vy = 0;
  if (Math.abs(sub.x - BOAT.x) < 14 && sub.y < 3) sub.docked = true;
  hud.toast(e.y > 300 ? 'Outside. The pressure is immense.' : 'Outside the submersible', e.y > 300 ? 'warn' : '');
  audio.ready && audio.click();
}

function die(cause, kind = 'normal') {
  if (g.mode !== 'play' || g.noDeath) return;
  g.mode = 'dying'; g.deathT = 0; g.deathCause = cause; g.deathKind = kind;
  ui.closeAll();
  // what death costs: everything unsold, a hospital bill, and (if it took him) what he carried for it
  const lost = Object.entries(g.inv).filter(([k, n]) => n > 0 && GOODS[k]).map(([k, n]) => `${n} ${GOODS[k].name.toLowerCase()}`);
  const nSpec = g.bag.length + g.subTank.length;
  if (nSpec) lost.unshift(`${nSpec} live specimen${nSpec > 1 ? 's' : ''}`);
  if (g.tags.length) lost.push(`data from ${g.tags.length} tag${g.tags.length > 1 ? 's' : ''}`);
  if (g.photos.length) lost.push(`${g.photos.length} photograph${g.photos.length > 1 ? 's' : ''}`);
  g.tags = []; g.photos = [];
  const inTraps = g.traps.reduce((a, tr) => a + tr.catch.length, 0);
  if (inTraps) lost.push(`${inTraps} animal${inTraps > 1 ? 's' : ''} in the traps`);
  g.traps = [];
  g.bag = []; g.subTank = [];
  const taken = cause.startsWith('Taken');
  if (taken) { const n = g.items.lure + g.items.necklace; if (n) lost.push(`${n} lure${n > 1 ? 's' : ''} and necklace${n > 1 ? 's' : ''}`); g.items.lure = g.items.necklace = 0; }
  const bill = kind === 'quit' ? 0 : Math.round(profile.cash * HOSPITAL_SHARE * 100) / 100;
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
    sub.hull = Math.max(0.05, sub.hull - dt * 0.015);
    g.cookT = (g.cookT || 0) - dt;
    if (g.cookT <= 0) { g.cookT = 5; hud.toast(`The vent water is 350 °C: the hull is cooking (${Math.round(sub.hull * 100)} %)`, 'warn'); }
  }
  const B = W.brine;
  const inBrine = (x, y) => B && x > B.x0 && x < B.x1 && y > B.y - 0.2;
  // brine is far denser than seawater: the sub floats on it like a boat on a lake
  if (!sub.imploded && sub.x > B.x0 - 3 && sub.x < B.x1 + 3 && sub.y > B.y - 1.4) {
    sub.y = B.y - 1.4; sub.vy = Math.min(0, sub.vy);
    if (e.inSub) e.y = sub.y;
    if (!g.brineTold) { g.brineTold = true; hud.toast('The sub settles on a lake of brine, a lake under the sea', 'note'); }
  }
  if (!e.inSub && inBrine(e.x, e.y)) {
    if (!g.brineT) hud.toast('Brine: no air in it at all. Get out!', 'warn');
    g.brineT = (g.brineT || 0) + dt;
    g.fx.redFlash = Math.max(g.fx.redFlash || 0, 0.3);
    if (g.brineT > 3) die(`Drowned in the brine pool at ${Math.round(e.y)} m`);
  } else g.brineT = 0;
}

function causeText(kind) {
  const d = Math.round(g.earl.y);
  switch (kind) {
    case 'entity': return `Taken at ${d} m`;
    case 'o2': return g.imploded ? `The submersible imploded at ${Math.round(g.implodeDepth)} m` : d > 300 ? `Ran out of air under pressure at ${d} m` : `Ran out of air at ${d} m`;
    case 'sub-o2': return `The submersible ran out of air at ${d} m`;
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
    // input
    const mv = readMove();
    if (keys.has('f')) {
      fHeld += dt;
      if (e.inSub && fHeld > 0.6 && fHeld - dt <= 0.6) interact(null, true);
    }
    const target = findTarget();
    g.prompt = promptFor(target);
    const atAngler = nearAngler();
    if (atAngler) g.prompt = (g.caveTraded ? 'The old one has eaten this dive' : 'F  Trade with the old one') + (e.inSub ? '   ·   hold F  Leave sub' : '');
    if (atAngler && !g.caveMet) { g.caveMet = true; hud.toast('Something vast breathes in the dark of the cave', 'note'); }
    // in the submersible the prompt stays out of the way: hidden while moving, and gone after
    // 5 s of the same text (it comes back when something new is in reach or the sub stops again)
    if (e.inSub) {
      if (g.prompt !== g.promptText || (g.subMoving && e.speedNow < 0.5)) { g.promptText = g.prompt; g.promptT = 0; }
      g.subMoving = e.speedNow >= 0.5;
      g.promptT = (g.promptT || 0) + dt;
      if (g.subMoving || g.promptT > 5) g.prompt = null;
    } else { g.promptText = null; g.promptT = 0; }
    // seabed materials have to be worked loose: hold F (or the right mouse button), one at a time
    const holding = keys.has('f');
    const planting = canPlant(target);
    const holdJob = !planting && target && target.kind === 'pickup' && HOLD_TIME[target.p.type];
    if (holdJob && holding) {
      if (!g.pry || g.pry.p !== target.p) g.pry = { p: target.p, t: 0 };
      g.pry.t += dt;
      if (g.pry.t >= HOLD_TIME[target.p.type]) { g.pry = null; interact(target, false); }
    } else g.pry = null;
    // planting a coral fragment on bare shallow seabed
    if (planting && holding) {
      g.plant = (g.plant || 0) + dt;
      if (g.plant >= PLANT_TIME) {
        g.plant = 0; g.inv.coral--;
        const sp = SPECIES_BY_ID[[126, 127, 128, 179][Math.floor(Math.random() * 4)]];
        g.world.statics.push({ sp, x: e.x, y: g.world.floorAt(e.x), scale: 0.5, phase: Math.random() * 6, flip: 1 });
        deed(DEED_CALM.plant, 'The coral takes hold.');
      }
    } else g.plant = 0;
    // giving something back: release a lure or a necklace into the deep
    if (pressed.has('g') && !e.inSub && e.y > 100) {
      const k = g.items.lure ? 'lure' : g.items.necklace ? 'necklace' : null;
      if (k) { g.items[k]--; for (let i = 0; i < 12; i++) g.bubbles.push({ x: e.x, y: e.y + 0.5, r: 0.04 + Math.random() * 0.05, w: Math.random() * 6, t: -i * 0.05 }); deed(DEED_CALM.offer, k === 'lure' ? 'You let the lure sink into the dark.' : 'You let the necklace sink into the dark.'); }
    }
    if (pressed.has('f-tap') && atAngler) ui.toggleCave();
    else if (pressed.has('f-tap') && !holdJob && !planting) interact(target, false);
    if (pressed.has('j')) ui.toggleJournal();
    if (pressed.has('l')) {
      g.lampFlashT = g.time; e.lampWanted = !e.lampWanted;
      if (e.inSub) g.sub.lightsOn = e.lampWanted; // outside, only his own lamp: the sub keeps its lights as they were
      hud.toast(e.inSub ? (e.lampWanted ? 'Lights on' : 'Lights off') : (e.lampWanted ? 'Headlamp on' : 'Headlamp off'));
    }
    if (pressed.has('u') && Math.abs(e.x - BOAT.x) < 14 && e.y < 4) ui.toggleWorkshop();
    if (pressed.has('t')) { if (e.inSub && !g.sub.imploded) ui.toggleTank(); else hud.toast('The tank room is in the sub', 'warn'); }
    // the helm: drive the Margaret along the surface (the docked sub rides in its cradle)
    const atBoat = (Math.abs(e.x - BOAT.x) < 14 && e.y < 4 && !e.inSub) || (e.inSub && g.sub.docked);
    if (pressed.has('b') && (g.helm || atBoat)) { g.helm = !g.helm; g.boatV = 0; hud.toast(g.helm ? 'At the helm' : 'Left the helm'); audio.ready && audio.click(); }
    if (pressed.has('q')) {
      const old = (profile.oldLures || 0) > 0;
      if ((old || g.items.lure > 0) && !g.lure) {
        if (old) profile.oldLures--; else g.items.lure--;
        const dir = e.inSub ? g.sub.facing : e.facing;
        g.lure = { x: e.x + dir * 2, y: e.y, vx: dir * 15, vy: -1.0, old };
        ent.throwLure(g.lure.x, g.lure.y, old ? 25 : 10);
        hud.toast(old ? 'The old lure drifts away, burning cold and blue' : 'The lure drifts away, glowing');
      } else if (!g.lure) hud.toast('No lures', 'warn');
    }
    if (pressed.has('r')) {
      // a backup air tank, plumbed into the cabin: the air bank fills to full
      if (!e.inSub || g.sub.imploded) hud.toast('The backup tanks are in the sub', 'warn');
      else if (!g.items.airTank) hud.toast('No backup air tanks', 'warn');
      else if (g.sub.o2 >= g.sub.o2Max - 1) hud.toast('The cabin air is full');
      else { g.items.airTank--; g.sub.o2 = g.sub.o2Max; hud.toast(`A backup tank hisses into the cabin: air full (${g.items.airTank} left)`); audio.ready && audio.click(); }
    }
    if (pressed.has('e')) {
      if (g.items.necklace > 0 && g.necklaceT <= 0) { g.items.necklace--; g.necklaceT = 15; hud.toast('The necklace warms against your chest'); audio.ready && audio.lanternHum(0.05); }
      else if (g.items.necklace === 0) hud.toast('No necklaces', 'warn');
    }
    if (pressed.has('m')) audio.setMuted(!audio.muted);
    // frenzies: rolled on surfacing after a deep enough, long enough trip
    const fzNew = updateFrenzy(g, dt);
    if (fzNew) {
      const F = FRENZIES[fzNew.id];
      hud.toast(F.name, 'frenzy'); hud.toast(`${F.what} · 5 minutes`, 'note');
      audio.ready && audio.sapphire(); audio.cue && audio.cue('frenzy');
    }
    g.airMul = frenzyOn(g, 'breath') ? 0.5 : 1;
    g.luck = frenzyOn(g, 'net') ? 0.25 : 0;
    g.fauna.rareMult = (frenzyOn(g, 'rare') ? 3 : 1) * (Math.abs(e.x - WHALE_FALL.x) < 60 && e.y > 2900 ? 3 : Math.abs(e.x - SEEP.x) < 50 && e.y > 2300 ? 2 : 1);
    g.stillMul = frenzyOn(g, 'still') ? 0.35 : 1;
    // back at the boat after being out on a dive: music
    if (e.y > 30) g.awayFromBoat = true;
    if (g.awayFromBoat && Math.abs(e.x - BOAT.x) < 20 && e.y < 3) { g.awayFromBoat = false; audio.cue && audio.cue('home'); }
    if (pressed.has('p')) { hud.showFps = !hud.showFps; }
    if (pressed.has('h')) { hud.hints = !hud.hints; hud.toast(hud.hints ? 'Hints on (H)' : 'Hints off (H)'); }
    // the aquarium's day: tickets in, upkeep out
    const day = tickAquarium(profile, dt);
    if (day) { saveProfile(profile); hud.toast(`The aquarium: ${day.visitors} visitors today · ${day.net >= 0 ? '+' : ''}${money(day.net, false)} after upkeep`, 'note'); }
    // the very bottom, the first time: it shows itself, and lets him go
    if (!profile.met && e.y > 3850 && W.floorAt(e.x) - e.y < 40 && !g.reveal) {
      g.reveal = { t: 0 }; profile.met = true; saveProfile(profile);
      ent.marked = false; ent.attn = 0; ent.state = 'roam';
      audio.ready && (audio.tone(30, 9, 0.6, 'sine', 0, 22), audio.groan(0.25));
      g.notes = (g.notes ? g.notes + '\n' : '') + `[${formatTime(g.survival)}, ${Math.round(e.y)} m] I saw it. All of it. It let me go.`;
      const ta = document.getElementById('notes'); if (ta) ta.value = g.notes;
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
      else if (e.inSub) { g.homeRun = true; ap.sendHome(g); hud.toast('Autopilot: taking her home'); hud.hint('It steers itself to the boat using less air. Press C to take the helm back; if something hits or comes near, it lets go'); audio.ready && audio.sonar(0.05); }
      else if (g.sub.imploded) hud.toast('The submersible is gone', 'warn');
      else if (ap.state === 'coming') { ap.cancel(); g.sub.vx *= 0.5; hud.toast('Sub stopped'); }
      else { ap.call(g); hud.toast(`Calling the sub — ${Math.round(dist(e.x, e.y, g.sub.x, g.sub.y))} m away`); audio.ready && audio.sonar(0.05); }
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
        if (r2 === 'docked') { g.homeRun = false; hud.toast('Home. The sub is at the boat'); audio.cue && audio.cue('home'); }
      }
    }
    g.subHit = false;
    // catching: 1 / 2 pick the net or the slurp gun, Space uses it
    if (pressed.has('1')) { g.toolSel = 'net'; hud.toast(gear(profile, 'net').name); }
    if (pressed.has('2')) { if (owns(profile, 'slurp')) { g.toolSel = 'slurp'; hud.toast(gear(profile, 'slurp').name); } else hud.toast('No slurp gun — the boat sells them', 'warn'); }
    if (pressed.has('3')) { if (owns(profile, 'tagger')) { g.toolSel = 'tag'; hud.toast(gear(profile, 'tag').name); } else hud.toast('No tag gun — the boat sells them', 'warn'); }
    if (pressed.has('5')) { const tr = profile.traps || {}; if ((tr.pot || 0) + (tr.deep || 0) > 0) { g.toolSel = 'trap'; hud.toast(`Traps: ${trapsFree(g, 'pot')} pot${tr.deep ? `, ${trapsFree(g, 'deep')} deep` : ''} to set`); } else hud.toast('No traps — the boat sells them', 'warn'); }
    if (pressed.has('4')) { if (owns(profile, 'camera')) { g.toolSel = 'cam'; hud.toast(`${gear(profile, 'cam').name} · ${g.shots} shots left`); } else hud.toast('No camera — the boat sells them', 'warn'); }
    const tool = activeTool(g);
    if (pressed.has(' ') && !e.inSub && g.toolSel === 'trap') {
      const msg = placeTrap(g);
      if (msg) hud.toast(msg, 'warn'); else { hud.toast('Trap set'); hud.hint('A line runs up to a buoy: F at the buoy hauls it up'); audio.ready && audio.thud && audio.thud(0.2); }
    } else if (pressed.has(' ') && !e.inSub) {
      if (tool.kind === 'tag') { if (!g.capture) { fireTag(g); audio.ready && audio.thud && audio.thud(0.15); } }
      else if (tool.kind === 'cam') {
        if (!g.capture) {
          const r = takePhoto(g);
          audio.ready && audio.click();
          if (r.type === 'noShots') hud.toast('No shots left — the boat has a fresh card', 'warn');
          else if (r.empty) hud.toast(`Nothing in the frame · ${g.shots} shots left`);
          else if (r.old) hud.toast(`${r.name}: you already have this one · ${g.shots} left`);
          else { audio.calmBoost && audio.calmBoost(0.08); hud.toast(`Photographed: ${r.name} · about ${money(r.value)} from the institute · ${g.shots} left`, 'note'); hud.photoCard = { sp: r.sp, variant: r.variant, t: 0 }; if (!g.journal.has(r.sp.id)) { g.journal.set(r.sp.id, { depth: Math.round(e.y), time: g.survival }); ui.journalDirty = true; profile.journal = [...g.journal.entries()]; saveProfile(profile); } }
        }
      } else { const msg = useTool(g); if (msg) hud.toast(msg, 'warn'); else if (g.capture && g.capture.t === 0) audio.ready && audio.whoosh && audio.whoosh(0.25); }
    } else if (pressed.has(' ') && e.inSub && !g.armGame && !g.homeRun) {
      if (!owns(profile, 'arm')) hud.toast('The claw has no hydraulics — fit them at the boat', 'warn');
      else { const msg = startArm(g); if (msg) hud.toast(msg, 'warn'); else audio.ready && audio.ram && audio.click(); }
    }
    // the arm: Space again closes the claw
    const armEv = updateArm(g, dt, pressed.has(' ') && g.armGame && g.armGame.phase === 'grip' && g.armGame.t > 0.05);
    if (armEv && armEv.type === 'armCatch') {
      hud.toast(armEv.crushed ? `The ${armEv.name.toLowerCase()} is in the tank — gripped too hard` : `${armEv.name} — into ${armEv.spec.pressed ? 'a pressure tank' : `the tank (${tankUsed(g)}/${tankSlots(g)})`}`, armEv.crushed ? 'warn' : 'note');
      const sp = armEv.sp;
      if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival }); ui.journalDirty = true; }
      if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); }
      profile.journal = [...g.journal.entries()]; saveProfile(profile);
    } else if (armEv && armEv.type === 'armMiss') hud.toast(`The ${armEv.name.toLowerCase()} slips out of the claw`);
    if (!e.inSub && g.armGame) g.armGame = null;
    for (const ev of updateTraps(g, dt)) {
      if (ev.type === 'hauled') {
        const tr = ev.trap, n = tr.catch.length;
        tr.y = 0; const moved = emptyTrap(g, tr);
        hud.toast(n ? `The trap is up: ${n} inside${moved < n ? ` — ${n - moved} would not fit in the bag and went back` : ''}` : 'The trap comes up empty', n ? 'note' : '');
      }
    }
    if (g.capture && (g.capture.kind === 'tag' || g.capture.kind === 'cam')) { g.capture.t += dt; if (g.capture.t >= g.capture.dur) g.capture = null; }
    g.camFlash = Math.max(0, g.camFlash - dt * 5);
    for (const ev of updateDarts(g, dt)) {
      if (ev.type === 'tagged') {
        g.tags.push({ key: ev.key, value: ev.value, name: ev.name });
        hud.toast(`Tagged: ${ev.name} · about ${money(ev.value)} from the program`, 'note');
        audio.ready && audio.note();
        if (!g.journal.has(ev.sp.id)) { g.journal.set(ev.sp.id, { depth: Math.round(e.y), time: g.survival }); ui.journalDirty = true; }
        if (!(profile.caught || []).includes(ev.sp.id)) { profile.caught = [...(profile.caught || []), ev.sp.id]; g.fauna.caught.add(ev.sp.id); }
        if (ev.variant) { const vk = ev.sp.id + ':' + ev.variant; if (!(profile.variants || []).includes(vk)) profile.variants = [...(profile.variants || []), vk]; }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      } else if (ev.type === 'provoked') hud.toast(`The ${ev.sp.name.toLowerCase()} turns toward you`, 'warn');
      else if (ev.type === 'dartMiss') hud.toast('Missed');
    }
    for (const ev of updateCapture(g, dt)) {
      if (ev.type === 'caught') {
        const sp = ev.sp, v = ev.spec.variant;
        if (v) {
          hud.toast(`${ev.name}!`, 'big');
          audio.ready && audio.sapphire(); audio.cue && audio.cue('rare');
          const vk = sp.id + ':' + v;
          if (!(profile.variants || []).includes(vk)) profile.variants = [...(profile.variants || []), vk];
        }
        const rr = rarityOf(sp);
        audio.calmBoost && audio.calmBoost(0.12);
        hud.toast(`${rr.name}: ${ev.name} — ${conditionName(ev.spec.cond)}, about ${money(specimenValue(ev.spec) * statValue(profile, 'payFish'))}  (${g.bag.length}/${bagSlots(g)})`, 'rar:' + rr.col);
        audio.ready && audio.pickup();
        if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival }); ui.journalDirty = true; }
        if (!(profile.caught || []).includes(sp.id)) { profile.caught = [...(profile.caught || []), sp.id]; g.fauna.caught.add(sp.id); }
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      } else if (ev.type === 'missed') hud.toast(`The ${ev.name.toLowerCase()} got away`);
      else if (ev.type === 'miss' && ev.why) hud.toast(`${ev.sp.name}: ${ev.why}`, 'warn');
    }
    const dl = updateSpecimens(g, dt);
    for (const s of dl) hud.toast(`The ${SPECIES_BY_ID[s.id].name.toLowerCase()} has died: too far from the pressure it lives at`, 'warn');
    for (const ev of dl.events) {
      const nm = SPECIES_BY_ID[ev.s.id].name.toLowerCase();
      if (ev.type === 'acclimated') hud.toast(`The ${nm} is acclimated to the surface: worth a quarter more`, 'note');
      else if (ev.type === 'bagStress') hud.toast(`The ${nm} in your net feels the climb: get it into one of the sub's chambers`, 'warn');
      else if (ev.type === 'bagDying') hud.toast(`The ${nm} in your net is dying: get it to a chamber, or go back down`, 'warn');
    }
    g.catchTarget = null; g.capRarity = null;
    // the reloads for the net / slurp go through updateCapture; tag and camera prompts here
    if (e.inSub && owns(profile, 'arm') && !g.armGame) {
      const at = findArmTarget(g);
      g.capPrompt = at ? `Space  Reach for the ${at.name.toLowerCase()} · ~${money(at.value)}` : null;
      g.catchTarget = at ? { c: at.c, x: at.x, y: at.y, len: at.len, col: rarityOf(at.sp).col } : null;
      g.capRarity = at ? rarityOf(at.sp) : null;
    } else if (e.inSub) g.capPrompt = g.armGame && g.armGame.phase === 'grip' ? 'Space  Close the claw — in the green' : null;
    else if (g.toolSel === 'trap') {
      const fl = g.world.floorAt(e.x);
      g.capPrompt = fl - e.y > 3 ? 'Traps: get down to the bottom' : (trapsFree(g, 'pot') > 0 && fl <= 200) || trapsFree(g, 'deep') > 0 ? `Space  Set a trap here (${Math.round(fl)} m)` : 'No traps free for this depth';
    } else if (!e.inSub && tool.kind === 'tag') {
      const tt = findTagTarget(g);
      g.capPrompt = tt ? (tt.ok ? `Space  Tag the ${tt.name.toLowerCase()} · ~${money(tt.value)}` : `${tt.sp.name}: ${tt.why}`) : null;
    } else if (!e.inSub && tool.kind === 'cam') {
      const ps = findPhotoSubject(g);
      g.capPrompt = ps ? (ps.ok ? `Space  Photograph the ${ps.name.toLowerCase()} · new · ~${money(ps.value)}` : `${ps.name}: ${ps.why}`) : null;
    } else {
    const ct = !e.inSub ? findCatch(g) : null;
    g.capPrompt = ct ? (ct.ok ? `Space  ${activeTool(g).kind === 'net' ? 'Net' : 'Catch'} the ${ct.name.toLowerCase()} · ${rarityOf(ct.sp).name.toLowerCase()} · ${Math.round(ct.chance * 100)} % · ~${money(ct.value * statValue(profile, 'payFish'))}` : `${ct.sp.name}: ${ct.why}`) : null;
    // what the net or slurp gun will go for: marked on screen
    g.catchTarget = ct && ct.ok ? { c: ct.c, x: ct.x, y: ct.y, len: ct.len, col: rarityOf(ct.sp).col } : null;
    g.capRarity = ct && ct.ok ? rarityOf(ct.sp) : null;
    }
    // a fresh memory card and charged strobes at the boat
    if (owns(profile, 'camera') && Math.abs(e.x - BOAT.x) < 14 && e.y < 4) g.shots = gear(profile, 'cam').shots;
    if (!e.inSub) {
      const r = ap.update(g, dt, g.addons.recall ? 1.5 : 1);
      if (r === 'arrived') { hud.toast('The sub is here'); audio.ready && audio.sonar(0.06); }
      else if (r === 'holding') hud.toast(`Sub holding at ${Math.round(g.sub.y)} m: its rated depth`, 'warn');
      else if (r === 'docked') hud.toast('The sub is back at the boat');
    }

    // injuries: slower, hungrier for air, heal one point every 15 s
    if (g.injury > 0) { g.healT += dt; if (g.healT >= 15) { g.injury--; g.healT = 0; if (!g.injury) hud.toast('The bleeding has stopped'); } }
    const lvl = Math.min(4, g.injury);
    const kg = loadKg(g); g.loadKg = kg;
    e.speedMul = INJURY.speed[lvl] * (g.noAir ? 1 - clamp(g.noAir / 15, 0, 1) * 0.35 : 1) * loadSpeed(kg) * (e.suitSpeed || 1);
    const cold = !e.inSub && !suitOf(profile).warm && e.y > 200 ? 1 + clamp((e.y - 200) / 800, 0, 1) * 0.35 : 1;
    if (cold > 1.05 && !g.coldTold) { g.coldTold = true; hud.toast('The cold bites: without a drysuit he burns air faster', 'note'); }
    e.o2Mul = INJURY.air[lvl] * loadAir(kg) * (e.suitAir || 1) * cold;
    // struggling (out of air, or critically hurt): heavier, clumsier movement - never a change of
    // facing; that only ever follows the player's own left/right input
    e.struggle = Math.max(g.noAir ? 0.35 + clamp(g.noAir / 15, 0, 1) * 0.65 : 0, lvl >= 4 ? 0.5 : 0);
    if (g.helm) {
      if (mv.y) { g.helm = false; hud.toast('Left the helm'); }
      else {
        g.boatV = lerp(g.boatV || 0, mv.x * 9, 1 - Math.exp(-dt * 1.0)); // a heavy boat: slow to speed up and to stop
        BOAT.x = clamp(BOAT.x + g.boatV * dt, BOAT_MIN, BOAT_MAX);
        if (BOAT.x === BOAT_MIN || BOAT.x === BOAT_MAX) g.boatV = 0;
        mv.x = 0; mv.y = 0;
        if (!e.inSub) { e.x = BOAT.x - 3; e.y = 0.5; e.vx = e.vy = 0; }
      }
    }
    // a docked sub sits in the boat's cradle wherever she goes
    if (g.sub.docked && !g.sub.imploded && !(g.autopilot && g.autopilot.active)) { g.sub.x = BOAT.x + 8.5; g.sub.y = 2.6; g.sub.vx = g.sub.vy = 0; }
    if (e.x > CANYON.x0 && e.x < CANYON.x1 && e.y > CANYON.top && !g.helm) {
      const k = 0.7 + 0.3 * Math.sin(g.time * 0.25), cvx = -1.1 * k, cvy = 0.35 * k;
      if (e.inSub) { g.sub.x += cvx * dt * 0.5; g.sub.y += cvy * dt * 0.5; } else { e.x += cvx * dt; e.y += cvy * dt; }
      if (!g.currentTold) { g.currentTold = true; hud.toast('A current pours down the canyon', 'note'); }
    }
    const res = updateEarl(g, dt, mv);
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
    if (res === 'implode') {
      g.sub.imploded = true; g.imploded = true; g.implodeDepth = g.sub.y;
      e.inSub = false; e.o2 = Math.min(e.o2, e.o2Max);
      g.fx.flash = 0.9; g.fx.shake = 2.5;
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
        g.debris.push({ x: g.sub.x + (Math.random() - 0.5) * 6, y: g.sub.y + (Math.random() - 0.5) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, size: 0.2 + Math.random() * 1.1 });
      }
      for (let i = 0; i < 120; i++) g.bubbles.push({ x: g.sub.x + (Math.random() - 0.5) * 8, y: g.sub.y + (Math.random() - 0.5) * 4, r: 0.05 + Math.random() * 0.25, w: Math.random() * 6, t: -Math.random() * 0.5 });
      audio.ready && audio.implosion();
      hud.toast('The hull gives way', 'warn');
    }
    // out of air: not instant death - about 15 s of air hunger, blacking out, before it is over.
    // Reaching the surface (or the sub's air) in time brings Earl back, gasping.
    // the cabin is out of air: the first thing that happens is he gets out, onto his own tank
    if (res === 'sub-o2' && e.inSub) {
      g.homeRun = false; g.autopilot.cancel();
      leaveSub();
      hud.toast('The cabin is out of air — you bail out', 'warn');
    } else if (res === 'o2') {
      if (!g.noAir) { g.noAir = 0.001; g.noAirCause = res; hud.toast(res === 'o2' ? 'Out of air — get to the surface' : 'The cabin is out of air — surface!', 'warn'); }
      // under pressure air hunger comes on far faster: ~15 s above 300 m, ~9 s at 500 m, ~3 s at 1000 m
      g.noAirRate = e.inSub ? 1 : Math.pow(diverDrainMult(e.y, e.pressStart || 300), 0.75); // pressure eats the breath hold fast
      g.noAir += dt * g.noAirRate;
      if (g.noAir >= 15) die(causeText(g.noAirCause));
    } else if (g.noAir) {
      hud.toast('Air.', 'big'); g.noAir = 0; g.fx.flash = 0.3;
      audio.ready && audio.gasp && audio.gasp();
    }
    // an empty sub at the surface (or docked) airs out its cabin
    if (!e.inSub && !g.sub.imploded && g.sub.y < 2.2 && g.sub.o2 < g.sub.o2Max) g.sub.o2 = Math.min(g.sub.o2Max, g.sub.o2 + g.sub.o2Max / 4 * dt);
    // diver tank refills from the sub's air
    if (e.inSub && e.o2 < e.o2Max) { const r = Math.min(e.o2Max - e.o2, (e.o2Max / 3.5) * dt); e.o2 += r; }
    g.diverDrain = diverDrainMult(e.y, e.pressStart || 300) * (mv.sprint && e.speedNow > 1 ? 2 : 1);
    g.diverDrain *= e.o2Mul;
    g.subDrain = subDrainMult(g.sub.y, g.sub.rated) * (mv.sprint && e.speedNow > 1 ? 3 : 1) * subLeak(g.sub);
    if (!e.inSub && !e.atSurface && e.o2 / e.o2Max < 0.1 && !g.lowO2Warned) { g.lowO2Warned = true; hud.toast('Air critical — surface', 'warn'); }
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
    g.necklaceT = Math.max(0, g.necklaceT - dt);
    g.protection = null;
    if (g.necklaceT > 0) g.protection = { x: e.x, y: e.y, necklace: true };
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
    directEncounters(g, dt, SPECIES_BY_ID);
    updateHunters(g, dt);
    // entity (during the reveal it hangs in front of him, then sinks away; it does not take him)
    let r = null;
    if (g.reveal) {
      const R = g.reveal; R.t += dt;
      const dir = e.facing || 1;
      const tx = e.x + dir * (R.t < 16 ? 11 : 11 + (R.t - 16) * 3), ty = e.y + (R.t < 16 ? -3 : -3 + (R.t - 16) * 6);
      ent.x = lerp(ent.x, tx, dt * (R.t < 2 ? 0.6 : 1.5)); ent.y = lerp(ent.y, ty, dt * 1.5);
      ent.dist = dist(ent.x, ent.y, e.x, e.y); ent.eyeOpen = 1; ent.fade = 1; ent.heading = Math.PI;
      if (R.t > 26) { g.reveal = null; ent.y = Math.max(ent.y, e.y + 200); }
    } else r = ent.update(g, dt);
    if (r === 'caught') die(causeText('entity'));
    for (const ev of g.events) {
      if (ev === 'marked') {
        // something has noticed him: a deep sound, a pulse through the screen, a line in the journal
        g.fx.shake = Math.max(g.fx.shake, 1.0); g.fx.markPulse = 1;
        audio.ready && (audio.tone(38, 4, 0.7, 'sine', 0, 24), audio.groan(0.18));
        hud.toast('Something noticed you.', 'note');
        g.notes = (g.notes ? g.notes + '\n' : '') + `[${formatTime(g.survival)}, ${Math.round(e.y)} m] Something noticed me.`;
        const ta = document.getElementById('notes'); if (ta) ta.value = g.notes;
      } else if (ev === 'appeased') {
        hud.toast('The water feels lighter.', 'big');
        g.notes = (g.notes ? g.notes + '\n' : '') + `[${formatTime(g.survival)}] The water feels lighter.`;
        const ta = document.getElementById('notes'); if (ta) ta.value = g.notes;
      } else if (ev === 'unmarked') {
        hud.toast('The feeling of being watched fades.', 'note');
        g.notes = (g.notes ? g.notes + '\n' : '') + `[${formatTime(g.survival)}] It has lost interest. For now.`;
        const ta = document.getElementById('notes'); if (ta) ta.value = g.notes;
      }
      else if (ev === 'bump') { g.fx.shake = Math.max(g.fx.shake, 0.9); audio.ready && audio.thud(0.35); hud.toast('Something bumped you', 'warn'); }
      else if (ev === 'charge') { audio.ready && audio.whoosh(); }
      else if (ev === 'swerve') { hud.toast('It turns away from the light'); }
      else if (ev === 'clicks') { audio.ready && audio.clicks(6); }
      else if (ev === 'orca') { audio.ready && audio.orcaCall(); }
      else if (ev === 'lunge') { audio.ready && audio.thud(0.25); }
    }
    g.events.length = 0;
  } else if (g.mode === 'dying') {
    g.deathT += dt;
    const injuryDeath = g.deathKind === 'injury';
    // bleeding out: the red closes in first, then the dark; no countdown
    g.fx.black = injuryDeath ? clamp((g.deathT - 2) / 2.5, 0, 1) : clamp(g.deathT / 3, 0, 1);
    g.fx.redDeath = injuryDeath ? clamp(g.deathT / 2.2, 0, 1) : 0;
    if (g.deathT > (injuryDeath ? 5 : 3.6)) {
      const cause = g.deathCause, survived = g.survival, bill = g.deathBill, lost = g.deathLost;
      g = newGame('menu');
      ui.showMenu({ cause, survived, bill, lost });
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
  fx.torchShift = clamp(fx.dread * 1.5, 0, 1) * (0.35 + 0.65 * clamp((g.earl.y - 100) / 60, 0, 1));
  // in the safe zone you still hear and sense it (sonar, heartbeat), but the water stays the water
  const deepK = clamp((e.y - 100) / 60, 0, 1);
  fx.safeK = deepK;
  fx.darken = fx.dread * 0.6 * deepK;
  fx.vignette = fx.dread;
  // pressure: the deeper past 300 m (outside the sub), the worse - also a failing hull
  const pressT = !e.inSub && g.mode !== 'menu' ? clamp(Math.log(Math.max(1, g.diverDrain / (keys.has('shift') ? 2 : 1))) / Math.log(30), 0, 1)
    : e.inSub ? g.sub.stress * 0.7 : 0;
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
  g.fauna.update(dt, renderer.cam, e, ent, fx.dread, g.time, g.day.light < 0.3);
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
  if (g.bubbles.length > 300) g.bubbles.splice(0, g.bubbles.length - 300);
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
  const floor = Math.min(0.75, 0.9 / Math.min(window.devicePixelRatio || 1, 1.5));
  if (frameEma > 1 / 45 && q > floor) { renderer.quality = Math.max(floor, q - 0.05); qualityT = 0; }
  // still slow at the floor: lite mode drops the costliest extras (the rim light on animals, the water
  // textures, the specks in the beams) instead of sharpness; they come back as soon as there is room
  else if (frameEma > 1 / 45 && !renderer.lite) { renderer.lite = true; qualityT = 0; }
  else if (frameEma < 1 / 57 && renderer.lite && qualityT > 4) { renderer.lite = false; qualityT = 0; }
  else if (frameEma < 1 / 57 && q < 1 && qualityT > 3) { renderer.quality = Math.min(1, q + 0.05); qualityT = 0; }
  else if (qualityT > 3) qualityT = 1;
}
function frame(now) {
  const realDt = (now - last) / 1000;
  const dt = Math.min(0.05, realDt);
  last = now;
  if (realDt < 0.25) adaptQuality(realDt);
  renderer.resize(); hud.resize();
  update(dt);
  renderer.updateCamera(g, dt);
  renderer.render(g);
  // spare time: prepare creature animation frames for what lies ahead (more while on the menu)
  renderer.warmSprites(g, g.mode === 'menu' ? 8 : realDt < 1 / 50 ? 3 : 1);
  hud.draw(g, dt);
  audio.update(g, dt);
  ui.update(g, dt);
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

// Escape toggles pause; closing overlays first.
window.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape' || ui.typing()) return;
  if (g.mode !== 'play') return;
  if (ui.anyOpen()) { ui.closeAll(); return; }
  g.paused = !g.paused;
  ui.setPaused(g.paused);
});

// debug hooks for automated testing
window.__earl = { get g() { return g; }, get profile() { return profile; }, set profile(p) { profile = p; }, newProfile, startRun, renderer, SPECIES_BY_ID, ui, step: (dt) => update(dt), keys };
