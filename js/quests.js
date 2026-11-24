// Quests (3.0.0), behind the Quests button on the HUD (the radio in the cabin is only decoration now).
//  - The top slot: the tutorial, one step at a time, ending with the first sub trip. (6.8.0) Later it will hold
//    the main quest line (Margaret's Lost Friend, planned, not built), one step at a time.
//  - The board: three quests, mostly Common, sometimes Uncommon or Rare, very rarely Exotic; the rarer, the
//    harder and the better paid. Cash only. New ones free every three hours, or at once for a fee.
// Progress comes from game events (questEvent: a catch, a sale, a photo, a tag, a trap set) and from a
// look at the game once a second (questTick: depth, the aquarium, what he has bought and has on).
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { usualDepth } from './fauna.js';
import { money, SUBS } from './economy.js';
import { canTakeLive, liveValue, rarityOf, LEGENDARY } from './specimens.js';
import { kitOf, ITEMS, FREE } from './items.js';
const STARTER = new Set(Object.values(FREE)); // (4.0.6) what he starts with is not bought, nor new to put on
const bought = (id) => ITEMS[id] && !ITEMS[id].free && !STARTER.has(id);
// (4.3.0) a thing he paid for (marked when it is bought; a tutorial gift, like the flick net, is not)
const paidFor = (it) => !!(it && it.paid);

// (4.0.0) refreshing the board by hand: one free refresh, then a three-hour window in which more refreshes cost
// $100, $300, $1,000, $2,500 and then $5,000 each; when the window ends, the next is free again. A new game
// starts with its free refresh ready. (Quests also replace themselves when their own time runs out.)
export const BOARD_MS = 3 * 60 * 60 * 1000;
const LADDER = [100, 300, 1000, 2500, 5000];
const windowOver = (S, now) => now >= (S.freeAt || 0);
export const boardIn = (P, now = Date.now()) => Math.max(0, (Q(P).freeAt || 0) - now);
export const refreshPrice = (P) => { const S = Q(P); return LADDER[Math.min(LADDER.length - 1, windowOver(S, Date.now()) ? 0 : S.paidN || 0)]; };
export const QUEST_RARITY = { common: { name: 'Common', odds: 72 }, uncommon: { name: 'Uncommon', odds: 21 }, rare: { name: 'Rare', odds: 6.5 }, exotic: { name: 'Exotic', odds: 0.5 }, legendary: { name: 'Legendary', odds: 0 } };

// the main line: [id, what to do, a line of help, the check, the reward]
// (4.0.6) the Log is the tutorial: each step teaches one thing, and the things a step uses are given
// when it is done (kit: ['item', id] into the locker, ['supply', key, n], ['trawl', tier] into the hatch,
// ['trap', type]). Once the net and trawl steps are done their key hints leave the screen (learned()).
export const MAIN = [
  // (4.3.4) the first three steps are one dive now: down to the fish, observe it, catch it, back up (FIRST_FISH)
  { id: 'firstfish', text: 'Your first fish', touchHelp: 'Swim down to a fish, tap the eye button to observe it, catch it with your net, then swim back up to the surface.', help: 'Swim down to a fish, observe it, catch it with your net, then swim back up to the surface.', need: 1, on: 'firstFish', pay: 50, kit: [['item', 'flicknet']] },
  { id: 'sell', text: 'Sell your catch', touchHelp: 'Swim up beside the Margaret and tap its winch, then Sell all.', help: 'Swim up beside the Margaret and tap, then Sell all.', need: 1, on: 'sell', pay: 30 },
  { id: 'buy', text: 'Buy a piece of gear from Bayside Marine Supply', help: "The computer in the Margaret's cabin. Bought gear goes into your inventory (supplies don't count).", need: 1, on: 'bought', pay: 40 },
  { id: 'wear', text: 'Put on the gear you bought', touchHelp: 'Open your bag, tap the gear and Put it on.', help: 'Tap for your inventory, tap it and Put it on (or drag it onto Earl).', need: 1, on: 'wear', pay: 30 },
  // (6.6.0) the tutorial's last step, one trip in parts (main.js tutor, seen.st): into the sub, drive to a fish (and
  // sprint), out to net it, a second one deeper, call the sub to him, a look at the bag's catch, autopilot home
  { id: 'subtrip', text: 'Your first sub trip', touchHelp: 'Get in the sub and drive to the fish; leave the sub and net it, then the one below; call the sub, look at your catch, and take the autopilot home.', help: 'Get in the sub and drive to the fish; leave it and net the fish, then the one below; call the sub, look at your catch, and autopilot home.', need: 1, on: 'subTrip', pay: 60 },
  // (6.8.0) the basics after the sub trip (60 m, air, trawl, chamber, surfacing, aquarium, trap) left the Log: the first
  // board teaches the dive, the live catch and the trap, and the first-time lessons teach the trawl, chamber and air tank
  { id: 'done', text: 'Basics learned', help: 'The board pays cash. The rest of the sea is yours to find.', need: 0, on: null, pay: 0, gift: 'split' },
];
const MAIN_I = Object.fromEntries(MAIN.map((m, i) => [m.id, i]));
const ALIAS = { swim: 'firstfish', observe: 'firstfish', net: 'firstfish' }; // (4.3.4) learned('net'): the first-fish step
// (4.3.4) the first-fish step, part by part: 0 swim down to the fish, 1 observe it, 2 catch it, 3 back to the surface, 4 done
export const FIRST_FISH = ['Jump in and swim down to the fish', 'Observe it', 'Catch it', 'Swim back up to the surface'];
// (4.18.6) the same parts in plain words for a diver who skipped the tutorial (there is no orange fish then)
export const FIRST_FISH_PLAIN = ['Jump in and swim down', 'Observe a fish', 'Catch a fish', 'Back up to the surface'];
export function firstFishPart(P) { const S = Q(P), sn = S.seen; if (MAIN[S.main] && MAIN[S.main].id !== 'firstfish') return 4; if (S.mainProg >= 1) return 4; return sn.ff_catch ? 3 : sn.ff_obs ? 2 : sn.ff_reach ? 1 : 0; }
// the line on the HUD for the step the Log is on (for the first fish: which part, and how far along)
export function stepLabel(P) {
  const S = Q(P), m = MAIN[S.main]; if (!m || !m.on) return '';
  if (m.id === 'firstfish') { const k = firstFishPart(P); return k >= 4 ? m.text + ': done' : `${m.text} (${k + 1}/4): ${(P.tut === 'on' ? FIRST_FISH : FIRST_FISH_PLAIN)[k].replace(/^./, (c) => c.toLowerCase()).replace(/\(([a-z])\)/g, (x, c) => `(${c.toUpperCase()})`)}`; } // (the key letter stays a capital; no tick character)
  return m.text + (S.mainProg >= m.need ? ': done' : '') + (m.need > 1 && S.mainProg < m.need ? `  (${S.mainProg}/${m.need})` : '');
}
// (4.0.6) has the Log taught this yet? (the step done, or the Log past it)
export function learned(P, id) { id = ALIAS[id] || id; const S = Q(P), i = MAIN_I[id]; return i === undefined || S.main > i || (S.seen[id] || 0) >= MAIN[i].need; }

// the board's quests, by kind: what to do at each rarity, and the pay
// (4.2.0) a hidden player level, 1-10, from what he has done: lifetime earnings, deepest dive, the sub's hull.
// Board quests ask more and pay more as it rises; an early 'catch 25' pays about $50.
export function playerLevel(P) {
  const earn = Math.log10(1 + (P.lifetime || 0)), deep = Math.log10(1 + (P.deepest || 0)), hull = (P.tlv && P.tlv.depth) || (P.lv && P.lv.depth) || 0;
  return Math.max(1, Math.min(10, Math.round(1 + earn * 1.1 + deep * 0.6 + hull * 0.6 - 1.2)));
}
const payK = (P) => 0.35 + (playerLevel(P) - 1) * 0.13;
const KINDS = {
  // (7.3.0, economy v2) each tier pays a quarter to a full hour of the income at the depth it asks for (docs/PLAN_7.4.md)
  catch: (r) => ({ n: [25, 50, 100, 200][r], pay: [200, 1100, 4000, 12900][r], text: (q) => `Catch ${q.n} animals` }),
  deep: (r) => ({ d: [100, 200, 600, 1500][r], n: [1, 2, 3, 3][r], pay: [350, 2300, 8900, 26600][r], // (4.0.0) the deep pays most
    text: (q) => `Catch ${q.n > 1 ? q.n + ' animals' : 'an animal'} below ${q.d} m` }),
  sell: (r) => ({ n: [450, 2000, 9000, 45000][r], pay: [130, 920, 3700, 12300][r], text: (q) => `Sell ${money(q.n, false)} of catch` }),
  photo: (r) => ({ n: [1, 3, 6, 12][r], pay: [180, 1200, 3700, 11600][r], text: (q) => `Photograph ${q.n} new species` }),
  tag: (r) => ({ n: [1, 2, 4, 8][r], pay: [220, 1300, 4600, 13900][r], text: (q) => `Tag ${q.n} animal${q.n > 1 ? 's' : ''}` }),
  species: (r, rnd, P) => {
    const deep = [60, 250, 700, 1600][r];
    // (4.0.0) never a legendary (they are met, not ordered) nor an undocumented one
    const pool = SPECIES.filter((s) => canTakeLive(s) && !s.undoc && !s.giant && !LEGENDARY.has(s.id) && rarityOf(s).id !== 'legendary' && s.dmin <= deep && s.dmin >= deep * 0.25 && liveValue(s) > 0.5);
    const sp = pool[Math.floor(rnd() * pool.length)]; if (!sp) return null;
    // (4.0.0) finding one particular animal is hard (you have to know it when you see it): ten times what it
    // fetches for a common, uncommon or rare one, five times for an exotic
    const v = liveValue(sp), mult = rarityOf(sp).id === 'exotic' ? 5 : 10;
    return { id: sp.id, n: 1, pay: Math.round(v * mult + [40, 150, 500, 2000][r]), text: () => `Bring up a live ${sp.name.toLowerCase()}` };
  },
};
const R_INDEX = { common: 0, uncommon: 1, rare: 2, exotic: 3, legendary: 4 };
// (3.0.1) how long a quest stays on the board, in real time: the rarer, the longer
export const QUEST_HOURS = { common: 12, uncommon: 21, rare: 36, exotic: 60, legendary: 72 };
export const questLeft = (q, now = Date.now()) => Math.max(0, (q.until || now) - now);

export function Q(P) {
  const S = P.quests || (P.quests = { main: 0, mainProg: 0, board: [], freeAt: 0, paidN: 0, done: 0 });
  if (S.freeAt === undefined) { S.freeAt = 0; S.paidN = 0; } // (4.0.0) older saves: the free refresh is ready
  if (!S.seen) S.seen = {}; // (3.0.40) what he has already done for steps still ahead of the Log
  return S;
}
// (3.0.40) note progress on any step of the main line not yet claimed; the active step's counter follows it
function mark(S, st, v) { const nv = Math.min(st.need, v); if (nv > (S.seen[st.id] || 0)) { S.seen[st.id] = nv; return true; } return false; }
function follow(S) { const m = MAIN[S.main]; if (m && m.on && (S.seen[m.id] || 0) > S.mainProg) { S.mainProg = Math.min(m.need, S.seen[m.id]); return true; } return false; }

// (4.8.0) the board, by the hidden player level: what rarity comes up (Common and Uncommon early; Exotic from level 3,
// Legendary from level 6), and every quest within his reach: an animal must live no deeper than his sub can go
// (or he has been). Groups of animals ('any jellyfish', 'any crab', 'any deep-sea crab', 'any Twilight Zone fish',
// 'an anglerfish'...), three of a kind, the tools he owns, and the Legendary challenges. Undocumented species only
// once he has been as deep as they live. Never a legendary animal.
const reachOf = (P) => { const lv0 = (P.tlv && P.tlv.depth) || (P.lv && P.lv.depth) || 0; return Math.max((SUBS[Math.min(SUBS.length - 1, lv0)] || SUBS[0]).rated, P.deepest || 0); };
const live = (s) => canTakeLive(s) && !s.giant && !LEGENDARY.has(s.id) && rarityOf(s).id !== 'legendary';
const mid = (s) => { const [a, b] = usualDepth(s); return (a + b) / 2; };
// group: a test on a species, its pay (about, at the start), and a name
export const GROUPS = {
  jelly:   { name: 'any jellyfish', many: 'jellyfish', pay: 50, test: (s) => s.cat === 'Jellyfish & Drifters' && /jelly|nettle|medusa/i.test(s.name) },
  reef:    { name: 'any reef fish', many: 'reef fish', pay: 60, test: (s) => s.cat === 'Reef Fish' },
  kelpfish:{ name: 'any cold-water fish', many: 'cold-water fish', pay: 70, test: (s) => s.cat === 'Cold Water Fish' },
  crab:    { name: 'any crab', many: 'crabs', pay: 120, test: (s) => /crab/i.test(s.name) },
  urchin:  { name: 'any sea urchin or starfish', many: 'urchins or starfish', pay: 150, test: (s) => s.cat === 'Starfish & Urchins' },
  octo:    { name: 'any octopus or squid', many: 'octopuses or squid', pay: 260, test: (s) => s.cat === 'Octopus & Squid' },
  shark:   { name: 'any shark or ray', many: 'sharks or rays', pay: 420, test: (s) => s.cat === 'Sharks & Rays' },
  deep200: { name: 'any fish below 200 m', many: 'fish from below 200 m', pay: 380, test: (s) => /Fish/.test(s.cat) && mid(s) >= 200 },
  twilight:{ name: 'any Twilight Zone fish', many: 'Twilight Zone fish', pay: 600, test: (s) => /Fish/.test(s.cat) && mid(s) >= 200 && mid(s) < 1000 },
  deepcrab:{ name: 'any deep-sea crab', many: 'deep-sea crabs', pay: 900, test: (s) => /crab/i.test(s.name) && mid(s) >= 200 },
  eel:     { name: 'any eel', many: 'eels', pay: 1400, test: (s) => /\beel\b|moray/i.test(s.name) },
  midnight:{ name: 'any Midnight Zone fish', many: 'Midnight Zone fish', pay: 2600, test: (s) => /Fish/.test(s.cat) && mid(s) >= 1000 && mid(s) < 4000 },
  viper:   { name: 'a viperfish', many: 'viperfish', pay: 3200, test: (s) => /viperfish/i.test(s.name) },
  dragon:  { name: 'a dragonfish', many: 'dragonfish', pay: 3200, test: (s) => /dragonfish/i.test(s.name) },
  angler:  { name: 'an anglerfish', many: 'anglerfish', pay: 4200, test: (s) => /angler|seadevil|sea devil|football/i.test(s.name) },
  abyss:   { name: 'any abyssal animal', many: 'abyssal animals', pay: 8000, test: (s) => mid(s) >= 4000 },
  undoc:   { name: 'an undocumented species', many: 'undocumented species', pay: 20000, undoc: true, test: (s) => !!s.undoc },
};
const GROUP_SPECIES = {};
export const groupSpecies = (k) => groupList(k);
const groupList = (k) => GROUP_SPECIES[k] || (GROUP_SPECIES[k] = SPECIES.filter((s) => (GROUPS[k].undoc ? !!s.undoc : live(s) && !s.undoc) && GROUPS[k].test(s)));
// can he do it: some animal of the group lives within his reach (undocumented: he has been that deep)
const groupOk = (k, P) => { const L = groupList(k), r = reachOf(P); return L.length > 0 && L.some((s) => (GROUPS[k].undoc ? (P.deepest || 0) >= s.dmin : usualDepth(s)[0] <= r)); };
const tierOfPay = (pay) => (pay < 100 ? 0 : pay < 400 ? 1 : pay < 2500 ? 2 : 3);
function rollRarity(rnd, P) {
  const L = playerLevel(P), w = { common: Math.max(20, 70 - 6 * (L - 1)), uncommon: 22, rare: 5 + 2 * L, exotic: L >= 3 ? 1 + 1.5 * (L - 3) : 0, legendary: L >= 6 ? 1 + (L - 6) : 0 };
  let x = rnd() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) { if ((x -= v) < 0) return k; } return 'common';
}
const LEGEND_QUESTS = [
  { key: 'L-angler10', text: 'Catch 10 anglerfish', kind: 'group', g: 'angler', n: 10, pay: 60000, ok: (P) => groupOk('angler', P) },
  { key: 'L-viper10', text: 'Catch 10 viperfish', kind: 'group', g: 'viper', n: 10, pay: 50000, ok: (P) => groupOk('viper', P) },
  { key: 'L-dive100', text: 'Catch 100 animals in one dive', kind: 'divecatch', n: 100, pay: 50000, ok: () => true },
  { key: 'L-depth4000', text: 'Dive below 4,000 m', kind: 'depth', d: 4000, n: 1, pay: 75000, ok: (P) => reachOf(P) >= 3300 },
  { key: 'L-chambers', text: 'Fill every pressure chamber at once', kind: 'chambers', n: 1, pay: 50000, ok: () => true },
];
export function newQuest(P, rnd = Math.random, taken = new Set()) {
  const L = playerLevel(P), scale = 0.8 + 0.06 * (L - 1), round5 = (v) => Math.max(10, Math.round(v / 5) * 5);
  for (let tries = 0; tries < 40; tries++) {
    const rarity = rollRarity(rnd, P), r = R_INDEX[rarity], now = Date.now(), base = { rarity, prog: 0, until: now + QUEST_HOURS[rarity] * 3600000, fresh: true };
    if (rarity === 'legendary') {
      const opts = LEGEND_QUESTS.filter((q) => q.ok(P) && !taken.has(q.key)); if (!opts.length) continue;
      const q = opts[Math.floor(rnd() * opts.length)];
      return { ...base, key: q.key, kind: q.kind, g: q.g, d: q.d, n: q.n, pay: q.pay, text: q.text };
    }
    const kinds = ['group', 'group', 'group', 'deep', 'catch', 'sell', 'species'].concat(ownsKind(P, 'cam') ? ['photo'] : []).concat(P.lessonTrawl ? ['trawl'] : []);
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    let q;
    if (kind === 'group') {
      // a group whose pay suits the rarity, within his reach; now and then three of a kind (a step rarer, more pay)
      const three = r >= 1 && rnd() < 0.3, want = three ? r - 1 : r;
      const opts = Object.keys(GROUPS).filter((k) => tierOfPay(GROUPS[k].pay) === want && groupOk(k, P)); if (!opts.length) continue;
      const k = opts[Math.floor(rnd() * opts.length)], G = GROUPS[k], n = three ? 3 : 1;
      q = { key: 'group-' + k + n, kind: 'group', g: k, n, pay: round5(G.pay * scale * (three ? 2.6 : 1)), text: `Catch ${three ? '3 ' + G.many : G.name}` };
    } else if (kind === 'deep') {
      const d = [100, 200, 600, 1500][Math.min(r, 3)]; if (d > reachOf(P)) continue;
      q = { key: 'deep', kind: 'deep', d, n: [1, 2, 3, 3][Math.min(r, 3)], pay: round5([240, 900, 3200, 13000][Math.min(r, 3)] * 0.5 * scale) }; q.text = `Catch ${q.n > 1 ? q.n + ' animals' : 'an animal'} below ${d} m`;
    } else if (kind === 'trawl') {
      q = { key: 'trawl', kind: 'trawl', n: [5, 12, 25, 50][Math.min(r, 3)], pay: round5([100, 400, 1500, 6000][Math.min(r, 3)] * scale) }; q.text = `Haul up ${q.n} animals in the trawl net`;
    } else {
      const o = KINDS[kind](Math.min(r, 3), rnd, P); if (!o) continue;
      if (kind === 'species' && usualDepth(SPECIES_BY_ID[o.id])[0] > reachOf(P)) continue;
      if (kind !== 'species') o.pay = round5(o.pay * payK(P));
      q = { ...o, key: kind + (o.id || ''), kind, text: o.text(o) };
    }
    if ([...taken].some((t) => t === q.key || (q.kind === 'catch' && t.startsWith('catch')))) continue;
    return { ...base, ...q };
  }
  return null;
}
// (6.8.0) a new diver's first board, always: the first real dive, the first live catch from the deep, the first trap
// (they took over from the Log's old basics). A wire pot comes with it, so the trap quest can be done at once.
function firstBoard(P) {
  const until = Date.now() + QUEST_HOURS.common * 3600000, b = { rarity: 'common', prog: 0, until, fresh: false };
  P.traps = P.traps || {}; P.traps.pot = Math.max(1, P.traps.pot || 0);
  return [
    { ...b, key: 'depth200', kind: 'depth', d: 200, n: 1, pay: 150, text: 'Take the sub below 200 m' },
    { ...b, key: 'liveup100', kind: 'liveup', d: 100, n: 1, pay: 150, text: 'Bring up a live animal from below 100 m' },
    { ...b, key: 'traphaul', kind: 'traphaul', n: 1, pay: 80, text: 'Set a trap and empty it' },
  ];
}
const ownsKind = (P, kind) => kitOf(P).items.some((it) => ITEMS[it.id] && ITEMS[it.id].kind === kind);
// (4.0.0) keep the board at three: a quest whose time has run out is replaced by a new one (marked NEW), and so is
// a claimed one, but only when its time runs out; until then it stays on the board, dimmed. A finished quest not
// yet claimed never runs out.
export function fillQuests(P, byHand = false) {
  const now = Date.now(), S = Q(P), starting = !S.board.length; // (4.0.1) NEW only on a quest that replaced one by itself
  if (starting && !S.firstBoard) { S.firstBoard = true; S.board = firstBoard(P); return; }
  S.board.forEach((q) => { if (!q.until) q.until = now + QUEST_HOURS[q.rarity || 'common'] * 3600000; });
  S.board = S.board.filter((q) => (q.prog >= q.n && !q.claimed) || q.until > now);
  const taken = new Set(S.board.map((q) => q.key.replace(/(common|uncommon|rare|exotic|legendary)$/, '')));
  while (S.board.length < 3) { const q = newQuest(P, Math.random, taken); if (!q) break; q.fresh = !starting && !byHand; S.board.push(q); taken.add(q.key); }
}
// new quests by hand: the free one if it is ready, otherwise the next price on the ladder (the caller charges it).
// Finished quests not yet claimed are kept; everything else is replaced.
export function refreshBoard(P, paid) {
  const S = Q(P), now = Date.now();
  if (windowOver(S, now)) S.paidN = 0;
  if (!paid) { if (!windowOver(S, now)) return false; S.freeAt = now + BOARD_MS; }
  else S.paidN = (S.paidN || 0) + 1;
  S.board = S.board.filter((q) => q.prog >= q.n && !q.claimed);
  fillQuests(P, true);
  return true;
}

// an event from the game: type and what it was about
export function questEvent(P, type, data = {}) {
  const S = Q(P);
  let changed = false;
  // (4.3.0) the main line: only the step it is on. One thing done finishes one step, never the ones after it
  const st = MAIN[S.main];
  if (st && st.on === type && st.on !== 'subDepth') changed = mark(S, st, (S.seen[st.id] || 0) + (data.n || 1)) || changed;
  // (4.3.4) the first fish: observing it, and catching it (which counts as having looked at it too); the surface
  // is read in questTick
  if (st && st.on === 'firstFish' && S.mainProg < 1) {
    if (type === 'observe' && !S.seen.ff_obs) { S.seen.ff_reach = 1; S.seen.ff_obs = 1; changed = true; }
    if (type === 'catch' && !S.seen.ff_catch) { S.seen.ff_reach = 1; S.seen.ff_obs = 1; S.seen.ff_catch = 1; changed = true; }
  }
  changed = follow(S) || changed;
  // the board (it opens once the tutorial is over)
  if (tutorialOn(P)) return changed;
  for (const q of S.board) {
    if (q.prog >= q.n || q.claimed) continue;
    let add = 0;
    if (type === 'catch' && q.kind === 'catch') add = 1;
    if (type === 'catch' && q.kind === 'group' && SPECIES_BY_ID[data.id] && GROUPS[q.g] && GROUPS[q.g].test(SPECIES_BY_ID[data.id])) add = 1; // (4.8.0)
    if (type === 'catch' && q.kind === 'divecatch') { if (q.runAt !== P.runs) { q.runAt = P.runs; q.prog = 0; } add = 1; }
    if (type === 'trawlHaul' && q.kind === 'trawl') add = data.n || 1;
    if (type === 'catch' && q.kind === 'deep' && (data.depth || 0) >= q.d) add = 1;
    if (type === 'catch' && q.kind === 'species' && data.id === q.id && data.alive) add = 1;
    if (type === 'sell' && q.kind === 'sell') add = Math.round(data.total || 0);
    if (type === 'photo' && q.kind === 'photo') add = 1;
    if (type === 'tag' && q.kind === 'tag') add = 1;
    if (type === 'trapHaul' && q.kind === 'traphaul') add = 1; // (6.8.0) a trap hauled in with something in it
    if (add) { q.prog = Math.min(q.n, q.prog + add); changed = true; }
  }
  return changed;
}
// once a second: what can be read straight off the game
export function questTick(g, P) {
  const S = Q(P), e = g.earl, K = kitOf(P);
  let ch = false;
  // (4.3.0) only the step the Log is on ('bought' comes as an event, from the purchase itself)
  for (let i = S.main; i <= S.main && i < MAIN.length; i++) {
    const st = MAIN[i]; if (!st.on || (S.seen[st.id] || 0) >= st.need) continue;
    if (st.on === 'wear' && Object.values(K.on).some((u) => paidFor(u && K.items.find((q) => q.u === u)))) ch = mark(S, st, 1) || ch;
    if (st.on === 'subDepth' && e.inSub) ch = mark(S, st, Math.floor(g.sub.y)) || ch;
    if (st.on === 'subAlive' && (g.subTank.some((s) => s.cond > 0.3) || g.subTank.length && g.sub.y < 3)) ch = mark(S, st, 1) || ch;
    if (st.on === 'swimDepth' && !e.inSub) ch = mark(S, st, Math.floor(e.y)) || ch;
    if (st.on === 'firstFish' && !e.inSub) {
      if (!S.seen.ff_reach && e.y >= 3.5) { S.seen.ff_reach = 1; ch = true; } // down at the fish
      if (S.seen.ff_catch && e.y < 1.2) ch = mark(S, st, 1) || ch; // (4.3.2) caught, and up at the surface
    }
    if (st.on === 'surfaceSafe' && g.subTank.some((s) => s.safe && s.cond > 0.05)) ch = mark(S, st, 1) || ch;
    if (st.on === 'aquarium' && P.aquarium && Object.keys(P.aquarium.display || {}).length) ch = mark(S, st, 1) || ch;
  }
  // (4.8.0) the board's challenges read off the game: a depth reached, every chamber full
  if (!tutorialOn(P)) for (const q of S.board) {
    if (q.prog >= q.n || q.claimed) continue;
    if (q.kind === 'depth' && Math.max(e.y, e.inSub ? g.sub.y : 0) >= q.d) { q.prog = 1; ch = true; }
    if (q.kind === 'chambers' && g.chambersFull) { q.prog = 1; ch = true; }
    if (q.kind === 'liveup' && g.subTank.some((s) => s.safe && s.cond > 0.05 && (s.from || 0) >= q.d)) { q.prog = 1; ch = true; } // (6.8.0) alive at the surface
  }
  return follow(S) || ch;
}
// claim: the main step (moves the line on) or a board quest (replaced at once by a new one)
export function claim(P, which) {
  const S = Q(P);
  if (which === 'main') {
    const m = MAIN[S.main]; if (!m || S.mainProg < m.need) return null;
    S.main++; S.mainProg = 0; S.done++; follow(S); // the next step: already done, if he has done it
    return { pay: m.pay, gift: m.gift || null, kit: m.kit || null, text: m.text };
  }
  if (tutorialOn(P)) return null; // (4.3.0) the board opens after the tutorial
  const i = S.board.findIndex((q) => q.key === which); if (i < 0) return null;
  const q = S.board[i]; if (q.prog < q.n || q.claimed) return null;
  q.claimed = true; S.done++; // (4.0.0) it stays, dimmed, until its time runs out or the board is refreshed
  return { pay: q.pay, text: q.text };
}
export const readyCount = (P) => { const S = Q(P), m = MAIN[S.main]; return (m && m.on && S.mainProg >= m.need ? 1 : 0) + (m && !m.on ? 1 : 0) + (tutorialOn(P) ? 0 : S.board.filter((q) => q.prog >= q.n && !q.claimed).length); };
// (4.3.0) the guided tutorial is running (the first six steps of the Log, until it hands over)
export const TUT_IDS = new Set(['firstfish', 'sell', 'buy', 'wear', 'subtrip']); // (6.6.0) the sub trip ends the tutorial
export function tutorialOn(P) { if (!P || P.tut !== 'on') return false; const m = MAIN[Q(P).main]; return !!m && TUT_IDS.has(m.id); }
