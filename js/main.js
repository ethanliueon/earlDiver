// Earl Diver — game loop, state, interactions and UI glue.
import { clamp, lerp, dist, makeRng, formatTime } from './util.js';
import { generateWorld, RESOURCES, BOAT_X, WORLD_W } from './world.js';
import { SPECIES_BY_ID } from './species.js';
import { Fauna } from './fauna.js';
import { Earl, Sub, updateEarl, diverDrainMult, subDrainMult, subLeak, SUB_LEVELS } from './player.js';
import { Autopilot } from './autopilot.js';
import { activeTool, findCatch, useTool, updateCapture, updateSpecimens, transferToTank, bagSlots, tankSlots, loadKg, loadSpeed, loadAir } from './capture.js';
import { specimenValue, conditionName } from './specimens.js';
import { NETS, SLURPS, BAGS, SUB_TANKS, CANISTERS } from './economy.js';
import { TANKS, FINS, SUB_TIERS, SUB_ADDONS, SUPPLIES, GOODS, PATCH_PRICE, HOSPITAL_SHARE, replacementPrice, newProfile, loadProfile, saveProfile, clearProfile, marketTick, priceOf, sell, spend, money } from './economy.js';
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

function newGame(mode) {
  const P = profile || newProfile();
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
    items: { lure: P.items ? P.items.lure || 0 : 0, necklace: P.items ? P.items.necklace || 0 : 0 }, inv: {},
    journal: new Map(P.journal || []), notes: P.notes || '', sapphires: 0, earned: 0,
    lure: null, necklaceT: 0, protection: null, prompt: null,
    waveBoost: 0, dayEff: 1, day: dayCycle(0), diverDrain: 1, subDrain: 1,
    deathT: 0, deathDelay: 0, deathCause: null, paused: false, audio,
    imploded: false, lowO2Warned: false, lastSafe: 0, breathT: 2, farShadow: null,
    injury: 0, healT: 0, blood: [], deathKind: null, lampFlashT: -99, threat: null,
    autopilot: new Autopilot(), addons: P.addons || {},
    bag: [], subTank: [], captureFx: [], capture: null, toolSel: 'net', capPrompt: null,
  };
  g.hurt = (dmg, sp, how) => hurt(dmg, sp, how);
  g.damageSub = (amt, sp) => damageSub(amt, sp);
  g.sub.docked = true;
  // upgrades bought in earlier seasons
  g.earl.o2Max = g.earl.o2 = TANKS[P.tank].air;
  g.earl.finSpeed = FINS[P.fins].speed;
  g.sub.level = P.subTier; g.sub.o2 = g.sub.o2Max; g.sub.hull = P.hull;
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
  onEndSeason: () => endSeason(),
  onNewGame: () => { clearProfile(); profile = null; startRun(); },
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
  g.injury += dmg; g.healT = 0;
  const e = g.earl;
  g.fx.redFlash = 1; g.fx.shake = Math.max(g.fx.shake, 1 + dmg * 0.4);
  for (let i = 0; i < 14 + dmg * 6; i++) g.blood.push({ x: e.x + (Math.random() - 0.5) * 0.8, y: e.y + (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: 0.15 + Math.random() * 0.35, t: 0, life: 6 + Math.random() * 4 });
  for (let i = 0; i < 20; i++) g.bubbles.push({ x: e.x + (Math.random() - 0.5), y: e.y - 0.3, r: 0.04 + Math.random() * 0.12, w: Math.random() * 6, t: -Math.random() * 0.3 });
  audio.ready && audio.hit(dmg);
  if (g.injury >= 5) { dieInjury(sp); return; }
  const verb = how === 'charge' ? 'Speared by' : how === 'lurk' ? 'Bitten by' : how === 'whale' ? 'Struck by' : 'Bitten by';
  hud.toast(`${verb} a ${sp.name.toLowerCase()}`, 'warn');
}
function damageSub(amt, sp) {
  const sub = g.sub;
  sub.hull = Math.max(0.05, sub.hull - amt);
  g.fx.shake = Math.max(g.fx.shake, 2.2); g.fx.flash = 0.25;
  for (let i = 0; i < 60; i++) g.bubbles.push({ x: sub.x + (Math.random() - 0.5) * 6, y: sub.y + (Math.random() - 0.5) * 2, r: 0.05 + Math.random() * 0.2, w: Math.random() * 6, t: -Math.random() * 0.4 });
  audio.ready && audio.ram();
  hud.toast(`Rammed by ${sp.id === 187 ? 'an orca' : 'a ' + sp.name.toLowerCase()} — hull ${Math.round(sub.hull * 100)} %, air leaking`, 'warn');
}
// ---------------- the boat: selling and buying ----------------
// Everything Earl carries (except lures and necklaces, which he keeps for use) goes in the basket.
// the sub's tank can only be emptied when the sub is at the boat
const subAtBoat = () => !g.sub.imploded && Math.hypot(g.sub.x - (BOAT_X + 8.5), g.sub.y - 2.6) < 20;
function sellSpecimens(list, lines) {
  const groups = new Map();
  for (const sp of list) { const k = sp.id; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(sp); }
  for (const [id, specs] of groups) {
    const key = 'sp' + id, base = specs.reduce((a, s) => a + specimenValue(s), 0) / specs.length;
    const worst = specs.reduce((a, s) => Math.min(a, s.cond), 1);
    const name = SPECIES_BY_ID[id].name + (worst <= 0.05 ? ' (dead)' : worst < 0.8 ? ` (${conditionName(worst)})` : '');
    lines.push(sell(profile, key, specs.length, base, name));
  }
}
function sellAll() {
  marketTick(profile);
  const lines = [];
  if (g.bag.length) { sellSpecimens(g.bag, lines); g.bag = []; }
  if (g.subTank.length && subAtBoat()) { sellSpecimens(g.subTank, lines); g.subTank = []; }
  for (const [k, n] of Object.entries(g.inv)) {
    if (!n || !GOODS[k] || k === 'coral') continue;
    lines.push(sell(profile, k, n, GOODS[k].price, GOODS[k].name));
    g.inv[k] = 0;
  }
  if (!lines.length) return null;
  const total = lines.reduce((a, l) => a + l.total, 0);
  g.earned += total;
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
function syncProfile() {
  const P = profile;
  P.hull = g.sub.hull; P.subTier = g.sub.level; P.subLost = !!g.sub.imploded;
  P.items = { lure: g.items.lure, necklace: g.items.necklace };
  P.journal = [...g.journal.entries()]; P.notes = g.notes;
  P.deepest = Math.max(P.deepest || 0, Math.round(g.earl.maxDepth));
}
// buy(kind): 'tank' | 'fins' | 'sub' | 'patch' | 'replace' | 'lure' | 'necklace'
function buy(kind) {
  const P = profile, sub = g.sub, e = g.earl;
  let ok = false;
  if (kind === 'tank' && TANKS[P.tank + 1] && spend(P, TANKS[P.tank + 1].price)) {
    P.tank++; e.o2Max = e.o2 = TANKS[P.tank].air; ok = true;
    hud.toast(`New tank: ${TANKS[P.tank].name}, ${TANKS[P.tank].air} s of air`, 'big');
  } else if (kind === 'fins' && FINS[P.fins + 1] && spend(P, FINS[P.fins + 1].price)) {
    P.fins++; e.finSpeed = FINS[P.fins].speed; ok = true;
    hud.toast(`New fins: ${FINS[P.fins].name}`, 'big');
  } else if (kind === 'sub' && !sub.imploded && SUB_TIERS[sub.level + 1] && spend(P, SUB_TIERS[sub.level + 1].price)) {
    sub.level++; sub.o2 = sub.o2Max; sub.hull = 1; ok = true;
    hud.toast(`Submersible refitted: rated to ${sub.rated} m`, 'big');
  } else if (kind === 'patch' && !sub.imploded && sub.hull < 0.999 && spend(P, PATCH_PRICE)) {
    sub.hull = Math.min(1, sub.hull + 0.4); ok = true;
    hud.toast(`Hull patched: ${Math.round(sub.hull * 100)} %`);
  } else if (kind === 'replace' && sub.imploded && spend(P, replacementPrice(sub.level))) {
    const lvl = sub.level;
    g.sub = new Sub(); g.sub.level = lvl; g.sub.o2 = g.sub.o2Max; g.sub.docked = true; g.imploded = false; ok = true;
    hud.toast(`A new submersible, rated to ${g.sub.rated} m`, 'big');
  } else if (kind === 'net' && NETS[(P.net || 0) + 1] && spend(P, NETS[(P.net || 0) + 1].price)) {
    P.net = (P.net || 0) + 1; g.toolSel = 'net'; ok = true;
    hud.toast(`New net: ${NETS[P.net].name.toLowerCase()}`, 'big');
  } else if (kind === 'slurp' && SLURPS[(P.slurp ?? -1) + 1] && spend(P, SLURPS[(P.slurp ?? -1) + 1].price)) {
    P.slurp = (P.slurp ?? -1) + 1; g.toolSel = 'slurp'; ok = true;
    hud.toast(`${SLURPS[P.slurp].name}. Press 2 to use it`, 'big');
  } else if (kind === 'bag' && BAGS[(P.bag || 0) + 1] && spend(P, BAGS[(P.bag || 0) + 1].price)) {
    P.bag = (P.bag || 0) + 1; ok = true;
    hud.toast(`${BAGS[P.bag].name}: ${BAGS[P.bag].slots} specimens`, 'big');
  } else if (kind === 'subtank' && SUB_TANKS[(P.subTank || 0) + 1] && spend(P, SUB_TANKS[(P.subTank || 0) + 1].price)) {
    P.subTank = (P.subTank || 0) + 1; ok = true;
    hud.toast(`The sub's specimen tank now holds ${SUB_TANKS[P.subTank].slots}`, 'big');
  } else if (kind === 'canisters' && !(P.addons || {}).canisters && spend(P, CANISTERS.price)) {
    P.addons = Object.assign({}, P.addons, { canisters: true }); g.addons = P.addons; ok = true;
    hud.toast('Pressure canisters: deep animals survive the trip up', 'big');
  } else if (SUB_ADDONS[kind] && !(P.addons || {})[kind] && spend(P, SUB_ADDONS[kind].price)) {
    P.addons = Object.assign({}, P.addons, { [kind]: true }); g.addons = P.addons; ok = true;
    hud.toast(`Fitted: ${SUB_ADDONS[kind].name.toLowerCase()}`, 'big');
  } else if (SUPPLIES[kind] && g.items[kind] < SUPPLIES[kind].max && spend(P, SUPPLIES[kind].price)) {
    g.items[kind]++; ok = true;
    hud.toast(`Bought: ${SUPPLIES[kind].name.toLowerCase()}`);
  }
  if (ok) { syncProfile(); saveProfile(P); audio.ready && audio.pickup(); }
  return ok;
}
// End the season: sell what is aboard, then a fresh ocean. Nothing is lost.
function endSeason() {
  const sale = sellAll();
  syncProfile();
  profile.seasons = (profile.seasons || 1) + 1;
  ui.saveRun(runLog('A new season'));
  saveProfile(profile);
  const t = g.time;
  g = newGame('play');
  g.time = t; // the same day goes on
  hud.toasts = [];
  hud.toast(`Season ${profile.seasons}. The sea has changed.`, 'big');
  return sale;
}
function runLog(cause) {
  return { date: new Date().toISOString(), survived: g.survival, cause, maxDepth: Math.round(g.earl.maxDepth), species: g.journal.size, earned: Math.round(g.earned * 100) / 100, sapphires: g.sapphires, subLevel: g.sub.level };
}
function dieInjury(sp) {
  const name = sp ? sp.name.toLowerCase() : 'something';
  const art = /^[aeiou]/.test(name) ? 'an' : 'a';
  die(`Killed by ${art} ${name} at ${Math.round(g.earl.y)} m`, 'injury');
}

function startRun() {
  audio.init(); audio.resume(); audio.playMusic();
  if (!profile) { profile = newProfile(); saveProfile(profile); }
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
window.addEventListener('blur', () => keys.clear());
// ---------------- mouse ----------------
// left button held: swim toward the cursor · right click: interact (like F)
// the lamp follows the cursor · wheel: zoom · click the Q/E slots to use an item
const mouse = { x: 0, y: 0, down: false, movedAt: -1e9, seen: false };
const inRect = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
hudCanvas.addEventListener('mousemove', (ev) => { mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.movedAt = performance.now(); mouse.seen = true; });
hudCanvas.addEventListener('mousedown', (ev) => {
  audio.resume();
  if (g.mode !== 'play') return;
  if (ev.button === 2) { pressed.add('f-tap'); mouse.rdown = true; return; }
  if (ev.button !== 0) return;
  if (inRect(hud.journalHot, ev.clientX, ev.clientY)) { ui.toggleJournal(); return; }
  if (inRect(hud.slotHot && hud.slotHot.q, ev.clientX, ev.clientY)) { pressed.add('q'); return; }
  if (inRect(hud.slotHot && hud.slotHot.e, ev.clientX, ev.clientY)) { pressed.add('e'); return; }
  mouse.down = true;
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
  let x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  let y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  if (mouse.down && !x && !y && renderer.S) {
    // swim toward the cursor; full speed beyond a short distance, gentle when close
    const e = g.earl, [mx, my] = mouseScreen();
    const dx = mx - renderer.S(e.x), dy = my - renderer.Sy(e.y), d = Math.hypot(dx, dy);
    const full = renderer.cam.ppm * 3;
    if (d > renderer.cam.ppm * 0.4) { const k = Math.min(1, d / full) / d; x = dx * k; y = dy * k; }
  }
  return { x, y, sprint: keys.has('shift') };
}

// ---------------- interactions ----------------
function findTarget() {
  const e = g.earl, W = g.world;
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
  const nearBoat = Math.abs(e.x - BOAT_X) < 14 && e.y < 4;
  let p = null;
  if (t) {
    if (t.kind === 'pickup') {
      const name = t.p.type === 'lure' ? 'anglerfish lure' : t.p.type === 'necklace' ? 'fangtooth necklace' : t.p.type === 'sapphire' ? 'deep sapphire' : (RESOURCES[t.p.type] ? RESOURCES[t.p.type].name.toLowerCase() : t.p.type);
      if (t.p.type === 'net') p = g.pry && g.pry.p === t.p ? `Cutting the net… ${Math.round(g.pry.t / HOLD_TIME.net * 100)} %` : `Hold F  Cut the ${t.p.animal} free`;
      else p = PRY.has(t.p.type) ? (g.pry && g.pry.p === t.p ? `Prying loose… ${Math.round(g.pry.t / PRY_TIME * 100)} %` : `Hold F  Pry loose the ${name}`) : `F  Collect ${name}`;
    } else if (t.kind === 'board') p = 'F  Board the submersible';
    else if (t.kind === 'kelp') p = 'F  Cut a kelp blade';
    else if (t.kind === 'creature') p = g.journal.has(t.sp.id) ? `${t.sp.name}` : 'F  Observe';
  }
  if (canPlant(t)) p = g.plant ? `Planting coral… ${Math.round(g.plant / PLANT_TIME * 100)} %` : 'Hold F  Plant a coral fragment';
  if (!e.inSub && e.y > 100 && (g.items.lure || g.items.necklace)) p = (p ? p + '   ·   ' : '') + 'G  Offer something back to the deep';
  if (e.inSub) p = p ? `${p}   ·   hold F  Leave sub` : 'F  Leave the submersible';
  if (nearBoat) p = (p ? p + '   ·   ' : '') + 'U  The boat: sell, buy';
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
    e.inSub = true; sub.docked = false;
    const moved = transferToTank(g);
    hud.toast(moved ? `Inside the submersible · ${moved} specimen${moved > 1 ? 's' : ''} into the tank (${g.subTank.length}/${tankSlots(g)})` : 'Inside the submersible');
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
  if (Math.abs(sub.x - BOAT_X) < 14 && sub.y < 3) sub.docked = true;
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
  g.bag = []; g.subTank = [];
  const taken = cause.startsWith('Taken');
  if (taken) { const n = g.items.lure + g.items.necklace; if (n) lost.push(`${n} lure${n > 1 ? 's' : ''} and necklace${n > 1 ? 's' : ''}`); g.items.lure = g.items.necklace = 0; }
  const bill = kind === 'quit' ? 0 : Math.round(profile.cash * HOSPITAL_SHARE * 100) / 100;
  g.inv = {};
  syncProfile();
  profile.cash = Math.round((profile.cash - bill) * 100) / 100;
  profile.deaths = (profile.deaths || 0) + (kind === 'quit' ? 0 : 1);
  saveProfile(profile);
  g.deathBill = bill; g.deathLost = lost;
  ui.saveRun(Object.assign(runLog(cause), { bill }));
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
    e.x = 500; e.y = 8;
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
    // in the submersible the prompt stays out of the way: hidden while moving, and gone after
    // 5 s of the same text (it comes back when something new is in reach or the sub stops again)
    if (e.inSub) {
      if (g.prompt !== g.promptText || (g.subMoving && e.speedNow < 0.5)) { g.promptText = g.prompt; g.promptT = 0; }
      g.subMoving = e.speedNow >= 0.5;
      g.promptT = (g.promptT || 0) + dt;
      if (g.subMoving || g.promptT > 5) g.prompt = null;
    } else { g.promptText = null; g.promptT = 0; }
    // seabed materials have to be worked loose: hold F (or the right mouse button), one at a time
    const holding = keys.has('f') || mouse.rdown;
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
    if (pressed.has('f-tap') && !holdJob && !planting) interact(target, false);
    if (pressed.has('j')) ui.toggleJournal();
    if (pressed.has('l')) { g.lampFlashT = g.time; e.lampWanted = !e.lampWanted; g.sub.lightsOn = e.lampWanted; hud.toast(e.lampWanted ? 'Lights on' : 'Lights off'); }
    if (pressed.has('u') && Math.abs(e.x - BOAT_X) < 14 && e.y < 4) ui.toggleWorkshop();
    if (pressed.has('q')) {
      if (g.items.lure > 0 && !g.lure) {
        g.items.lure--;
        const dir = e.inSub ? g.sub.facing : e.facing;
        g.lure = { x: e.x + dir * 2, y: e.y, vx: dir * 15, vy: -1.0 };
        ent.throwLure(g.lure.x, g.lure.y);
        hud.toast('The lure drifts away, glowing');
      } else if (g.items.lure === 0) hud.toast('No lures', 'warn');
    }
    if (pressed.has('e')) {
      if (g.items.necklace > 0 && g.necklaceT <= 0) { g.items.necklace--; g.necklaceT = 15; hud.toast('The necklace warms against your chest'); audio.ready && audio.lanternHum(0.05); }
      else if (g.items.necklace === 0) hud.toast('No necklaces', 'warn');
    }
    if (pressed.has('m')) audio.setMuted(!audio.muted);
    // calling the submersible: tap C to call (or stop) it, hold C to send it back to the dock
    const ap = g.autopilot;
    if (keys.has('c')) {
      cHeld += dt;
      if (cHeld > 0.6 && cHeld - dt <= 0.6 && !e.inSub && !g.sub.imploded && !g.sub.docked) { ap.sendHome(g); hud.toast('The sub turns for home'); audio.ready && audio.click(); }
    }
    if (pressed.has('c-tap')) {
      if (e.inSub) hud.toast('You are in it');
      else if (g.sub.imploded) hud.toast('The submersible is gone', 'warn');
      else if (ap.state === 'coming') { ap.cancel(); g.sub.vx *= 0.5; hud.toast('Sub stopped'); }
      else { ap.call(g); hud.toast(`Calling the sub — ${Math.round(dist(e.x, e.y, g.sub.x, g.sub.y))} m away`); audio.ready && audio.sonar(0.05); }
    }
    if (e.inSub && ap.state !== 'idle') ap.cancel();
    // catching: 1 / 2 pick the net or the slurp gun, Space uses it
    if (pressed.has('1')) { g.toolSel = 'net'; hud.toast(NETS[profile.net || 0].name); }
    if (pressed.has('2')) { if ((profile.slurp ?? -1) >= 0) { g.toolSel = 'slurp'; hud.toast(SLURPS[profile.slurp].name); } else hud.toast('No slurp gun — the boat sells them', 'warn'); }
    if (pressed.has(' ')) { const msg = useTool(g); if (msg) hud.toast(msg, 'warn'); else if (g.capture && g.capture.t === 0) audio.ready && audio.whoosh && audio.whoosh(0.25); }
    for (const ev of updateCapture(g, dt)) {
      if (ev.type === 'caught') {
        const sp = ev.sp;
        hud.toast(`${sp.name} — ${conditionName(ev.spec.cond)}, about ${money(specimenValue(ev.spec))}  (${g.bag.length}/${bagSlots(g)})`, 'note');
        audio.ready && audio.pickup();
        if (!g.journal.has(sp.id)) { g.journal.set(sp.id, { depth: Math.round(e.y), time: g.survival }); ui.journalDirty = true; }
        if (!(profile.caught || []).includes(sp.id)) profile.caught = [...(profile.caught || []), sp.id];
        profile.journal = [...g.journal.entries()]; saveProfile(profile);
      } else if (ev.type === 'missed') hud.toast(`The ${ev.sp.name.toLowerCase()} got away`);
      else if (ev.type === 'miss' && ev.why) hud.toast(`${ev.sp.name}: ${ev.why}`, 'warn');
    }
    for (const s of updateSpecimens(g, dt)) hud.toast(`The ${SPECIES_BY_ID[s.id].name.toLowerCase()} has died — it came up too fast`, 'warn');
    const ct = !e.inSub ? findCatch(g) : null;
    g.capPrompt = ct ? (ct.ok ? `Space  ${activeTool(g).kind === 'net' ? 'Net' : 'Catch'} the ${ct.sp.name.toLowerCase()} · ~${money(ct.value)}` : `${ct.sp.name}: ${ct.why}`) : null;
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
    e.speedMul = INJURY.speed[lvl] * (g.noAir ? 1 - clamp(g.noAir / 15, 0, 1) * 0.35 : 1) * loadSpeed(kg); e.o2Mul = INJURY.air[lvl] * loadAir(kg);
    // struggling (out of air, or critically hurt): heavier, clumsier movement - never a change of
    // facing; that only ever follows the player's own left/right input
    e.struggle = Math.max(g.noAir ? 0.35 + clamp(g.noAir / 15, 0, 1) * 0.65 : 0, lvl >= 4 ? 0.5 : 0);
    const res = updateEarl(g, dt, mv);
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
    if (res === 'o2' || res === 'sub-o2') {
      if (!g.noAir) { g.noAir = 0.001; g.noAirCause = res; hud.toast(res === 'o2' ? 'Out of air — get to the surface' : 'The cabin is out of air — surface!', 'warn'); }
      // under pressure air hunger comes on far faster: ~15 s above 300 m, ~9 s at 500 m, ~3 s at 1000 m
      g.noAirRate = e.inSub ? 1 : Math.sqrt(diverDrainMult(e.y));
      g.noAir += dt * g.noAirRate;
      if (g.noAir >= 15) die(causeText(g.noAirCause));
    } else if (g.noAir) {
      hud.toast('Air.', 'big'); g.noAir = 0; g.fx.flash = 0.3;
      audio.ready && audio.gasp && audio.gasp();
    }
    // diver tank refills from the sub's air
    if (e.inSub && e.o2 < e.o2Max) { const r = Math.min(e.o2Max - e.o2, (e.o2Max / 3.5) * dt); e.o2 += r; }
    g.diverDrain = diverDrainMult(e.y) * (mv.sprint && e.speedNow > 1 ? 2 : 1);
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

    // animals that attack
    g.fauna.bleeding = g.injury > 0;
    directEncounters(g, dt, SPECIES_BY_ID);
    updateHunters(g, dt);
    // entity
    const r = ent.update(g, dt);
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
  fx.shake = Math.max(fx.disorient * 0.25, fx.shake - dt * 1.5);
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

  // ----- something far away (not it) -----
  if (g.mode === 'play') {
    if (g.farShadow) { g.farShadow.t += dt; if (g.farShadow.t > g.farShadow.dur) g.farShadow = null; }
    else if (e.y > 120 && e.y < 1600 && fx.dread < 0.05 && Math.random() < dt / 150) {
      g.farShadow = { t: 0, dur: 40 + Math.random() * 25, y: 0.25 + Math.random() * 0.4, dir: Math.random() < 0.5 ? 1 : -1 };
      audio.ready && audio.whale(0.05);
    }
  }
  // ----- life -----
  g.fauna.update(dt, renderer.cam, e, ent, fx.dread, g.time, g.day.light < 0.3);
  // breathing bubbles
  if (!e.inSub && e.y > 1 && g.mode === 'play') {
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
  qualityT += realDt;
  if (qualityT < 1) return;
  const q = renderer.quality ?? 1;
  if (frameEma > 1 / 45 && q > 0.45) { renderer.quality = Math.max(0.45, q - 0.1); qualityT = 0; }
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
  const blurPx = Math.max(fx.disorient * 1.2, fx.pressure * 2.4);
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
window.__earl = { get g() { return g; }, startRun, renderer, step: (dt) => update(dt), keys };
